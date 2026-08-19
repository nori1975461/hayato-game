// systems/hitfx.js — イース風の打撃感を作る「ヒット演出制御モジュール」。
//
// 契約1: エンジン非依存。Phaser / DOM / Web Audio / window を一切参照しない。
//   外界へ触る操作はすべて host アダプタ経由。host を渡さなくても状態ポーリングだけで動く。
// 契約2: ゲームロジックへは書き込まない。このモジュールは「時間」と「見た目の指示」だけを持つ。
// 契約3: 乱数はこのモジュール専用の独立ストリーム。共有 rng（run.rng）を絶対に消費しない。
//   ← 打撃のたびに共有 rng を引くと消費順が変わり、seed 固定の自動テストが壊れるため。
//     揺れもピッチも seed 固定なら完全再現するので、決定性は保ったまま「ランダムに見える」。
//
// 使い方（メインループ）:
//   const hitfx = createHitFx({ seed: 42, host });
//   // 毎フレーム
//   hitfx.update(dt);                 // 演出タイマーは停止中も進める
//   if (hitfx.frozen) { draw(); return; }   // ヒットストップ中はゲーム進行だけ止める
//   updateGame(dt);
//   draw();                           // 描画時に hitfx.offset を基準座標へ加算

// ---- 既定値（すべて config で上書き可） ----
const DEFAULTS = {
  // ①ヒットストップ: power 0→min / 1→max の秒数。cap は多段ヒットの累積上限。
  hitStop: { min: 0.03, max: 0.06, cap: 0.12 },
  // ②画面振動: 振幅px（power で補間）・持続秒・1フレームの最大変位。
  shake: { minAmp: 2, maxAmp: 9, dur: 0.18, maxOffset: 14 },
  // ③白フラッシュ: 秒。frames 指定時は 60fps 換算でこの値へ変換する。
  flash: { sec: 0.05, frameRef: 60 },
  // ③火花: 発生数（power で補間）。
  spark: { min: 4, max: 12 },
  // ④SEピッチ: ±5%（0.05）。
  pitch: { spread: 0.05 },
};

// mulberry32。プロジェクトの core/rng.js と同じ式だが、
// このモジュールを単体で他プロジェクトへ持ち出せるよう意図的に内蔵している。
function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {object}   [opts]
 * @param {number}   [opts.seed=1]     乱数シード。固定すれば揺れもピッチも完全再現する。
 * @param {object}   [opts.host]       エンジン側アダプタ（下記メソッドはすべて任意）
 *   host.applyShake(ox, oy)           カメラ基準座標へ振動を適用
 *   host.setFlash(target, on)         対象を白く塗る／戻す
 *   host.spawnSpark(x, y, info)       火花を出す（info = {count,color,power,angle}）
 *   host.playSound(name, pitchMul, info)  SEをピッチ倍率つきで鳴らす
 * @param {object}   [opts.config]     DEFAULTS の部分上書き
 * @param {function} [opts.random]     乱数関数の差し替え（既定は内蔵 mulberry32）
 */
export function createHitFx(opts) {
  const o = opts || {};
  const host = o.host || null;
  const cfg = {
    hitStop: { ...DEFAULTS.hitStop, ...(o.config && o.config.hitStop) },
    shake: { ...DEFAULTS.shake, ...(o.config && o.config.shake) },
    flash: { ...DEFAULTS.flash, ...(o.config && o.config.flash) },
    spark: { ...DEFAULTS.spark, ...(o.config && o.config.spark) },
    pitch: { ...DEFAULTS.pitch, ...(o.config && o.config.pitch) },
  };
  const random = typeof o.random === 'function' ? o.random : makeRandom(o.seed == null ? 1 : o.seed);
  const signed = () => random() * 2 - 1;

  // ---- 状態 ----
  let stopT = 0;                      // 全体ヒットストップの残り秒
  const stopTargets = new Map();      // target → 残り秒（対象限定の停止）
  const flashes = new Map();          // target → 残り秒
  // 揺れは「最も強い1件が勝つ」方式。多段ヒットで振幅が加算暴走せず、
  // かつ既存コードの freezeT = Math.max(...) と同じ思想で揃う。
  let shakeAmp = 0, shakeT = 0, shakeDur = 0;
  const offset = { x: 0, y: 0 };

  // ---- ①ヒットストップ ----
  // 同時多発ヒットで足し算になると固まるので、常に「長い方を採用」＋cap で頭打ちにする。
  function hitStop(sec, target) {
    const s = Math.min(cfg.hitStop.cap, Math.max(0, sec || 0));
    if (target == null) {
      if (s > stopT) stopT = s;
      return;
    }
    const cur = stopTargets.get(target) || 0;
    if (s > cur) stopTargets.set(target, s);
  }

  function isFrozen(target) {
    if (target == null) return stopT > 0;
    return (stopTargets.get(target) || 0) > 0;
  }

  // ---- ②画面振動 ----
  // ease-out: 残り時間の2乗で減衰させ、開始直後に最も鋭く、終わり際は静かに0へ戻す。
  function shake(amp, dur) {
    const a = Math.max(0, amp || 0);
    const d = Math.max(0.001, dur || cfg.shake.dur);
    // 現在進行中の揺れの「いまの実効振幅」より強いときだけ差し替える。
    // これで弱い長時間の揺れが強い一撃を食い潰さない。
    const curEff = shakeT > 0 ? shakeAmp * falloff(shakeT / shakeDur) : 0;
    if (a <= curEff) return;
    shakeAmp = a; shakeDur = d; shakeT = d;
  }

  function falloff(k) {
    const t = clamp01(k);
    return t * t;
  }

  // ---- ③白フラッシュ ----
  // sec と frames のどちらでも指定できる。frames は frameRef(既定60fps)換算＝
  // 高リフレッシュレート環境で一瞬すぎて見えなくなるのを防ぐ（実時間で持たせる）。
  function flash(target, secOrOpts) {
    if (target == null) return;
    let sec = cfg.flash.sec;
    if (typeof secOrOpts === 'number') sec = secOrOpts;
    else if (secOrOpts && typeof secOrOpts === 'object') {
      if (secOrOpts.frames != null) sec = secOrOpts.frames / cfg.flash.frameRef;
      else if (secOrOpts.sec != null) sec = secOrOpts.sec;
    }
    const cur = flashes.get(target) || 0;
    if (sec <= cur) return;
    if (cur <= 0 && host && host.setFlash) host.setFlash(target, true);
    flashes.set(target, sec);
  }

  function isFlashing(target) {
    return (flashes.get(target) || 0) > 0;
  }

  // 撃破/退場した対象を明示的に忘れる。短命なので放置しても数フレームで消えるが、
  // 大量に湧く敵を扱う場合は killEnemy 等でこれを呼ぶと Map に死んだ参照が残らない。
  function forget(target) {
    if (flashes.delete(target) && host && host.setFlash) host.setFlash(target, false);
    stopTargets.delete(target);
  }

  // ---- ③火花 ----
  function spark(x, y, info) {
    const i = info || {};
    const p = clamp01(i.power == null ? 0.5 : i.power);
    const count = i.count != null
      ? i.count
      : Math.round(lerp(cfg.spark.min, cfg.spark.max, p));
    if (host && host.spawnSpark) {
      host.spawnSpark(x, y, { count, color: i.color, power: p, angle: i.angle || 0 });
    }
    return count;
  }

  // ---- ④SEピッチ揺らぎ ----
  // 同じ音が連続しても機械的に聞こえないよう ±spread の範囲で毎回ずらす。
  function pitch() {
    return 1 + signed() * cfg.pitch.spread;
  }
  // Web Audio の detune（セント）用。周波数倍率 → セント。
  function detuneCents() {
    return Math.round(1200 * Math.log2(pitch()));
  }

  function playSound(name, info) {
    const mul = pitch();
    if (name && host && host.playSound) host.playSound(name, mul, info || {});
    return mul;
  }

  // ---- 統合エントリ：命中1回でまとめて発火 ----
  /**
   * @param {object} p
   *   p.x, p.y      命中座標（火花の発生位置）
   *   p.power       0..1 の強さ。全パラメータをこれ1つで比例させる（軽い攻撃と重い一撃の差）
   *   p.target      白フラッシュさせる対象（省略可）
   *   p.scope       'global'（既定）＝全体停止 / 'target' ＝ p.target のみ停止
   *   p.color       火花の色
   *   p.angle       攻撃方向（ラジアン・火花の飛散に使う）
   *   p.sound       SE名
   * @returns {object} 実際に発火した内容（テスト・ログ用）
   */
  function hit(p) {
    const a = p || {};
    const power = clamp01(a.power == null ? 0.5 : a.power);

    const stopSec = lerp(cfg.hitStop.min, cfg.hitStop.max, power);
    hitStop(stopSec, a.scope === 'target' ? a.target : null);

    const amp = lerp(cfg.shake.minAmp, cfg.shake.maxAmp, power);
    shake(amp, cfg.shake.dur);

    if (a.target != null) flash(a.target, a.flashSec != null ? a.flashSec : cfg.flash.sec);

    const count = spark(a.x, a.y, { power, color: a.color, angle: a.angle });
    const pitchMul = a.sound ? playSound(a.sound, { power }) : 1;

    return { power, stopSec, shakeAmp: amp, sparkCount: count, pitchMul };
  }

  // ---- 毎フレーム更新 ----
  // 重要: ヒットストップ中も必ず呼ぶこと。ここで止めると停止が永久に解けない。
  function update(dt) {
    const d = dt > 0 ? dt : 0;

    if (stopT > 0) stopT = Math.max(0, stopT - d);
    if (stopTargets.size) {
      for (const [t, v] of stopTargets) {
        const nv = v - d;
        if (nv <= 0) stopTargets.delete(t); else stopTargets.set(t, nv);
      }
    }

    if (flashes.size) {
      for (const [t, v] of flashes) {
        const nv = v - d;
        if (nv <= 0) {
          flashes.delete(t);
          if (host && host.setFlash) host.setFlash(t, false);
        } else flashes.set(t, nv);
      }
    }

    if (shakeT > 0) {
      shakeT = Math.max(0, shakeT - d);
      const eff = shakeAmp * falloff(shakeT / shakeDur);
      const lim = cfg.shake.maxOffset;
      offset.x = Math.max(-lim, Math.min(lim, signed() * eff));
      offset.y = Math.max(-lim, Math.min(lim, signed() * eff));
      if (shakeT <= 0) { shakeAmp = 0; offset.x = 0; offset.y = 0; }
    } else if (offset.x !== 0 || offset.y !== 0) {
      offset.x = 0; offset.y = 0;
    }

    if (host && host.applyShake) host.applyShake(offset.x, offset.y);
  }

  // シーン再開始時に全状態を捨てる（タイマーと対象参照のリークを防ぐ）。
  function reset() {
    stopT = 0;
    stopTargets.clear();
    if (host && host.setFlash) for (const t of flashes.keys()) host.setFlash(t, false);
    flashes.clear();
    shakeAmp = 0; shakeT = 0; shakeDur = 0;
    offset.x = 0; offset.y = 0;
  }

  return {
    update, hit, reset, forget,
    hitStop, isFrozen,
    shake, get offset() { return offset; },
    flash, isFlashing,
    spark,
    pitch, detuneCents, playSound,
    get frozen() { return stopT > 0; },
    config: cfg,
  };
}
