// systems/spawner.js — ウェーブ進行・出現位置・種別抽選・エリート・cap制御（PROTOTYPE_SPEC §3.4 / §4）。
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

export function createSpawner(run) {
  const W = BALANCE.wave;
  const R = BALANCE.rush;
  const totalSec = W.stepSec * W.steps;      // 補間の終端（Wave R2: 30×14=420s）
  let spawnTimer = 0;
  let countAcc = 0;                          // 湧き数の小数を持ち越す（切り捨てで湧きが痩せるのを防ぐ）
  const eliteFired = BALANCE.elite.times.map(() => false);
  const rushWarned = R.counts.map(() => false);
  const rushFired = R.counts.map(() => false);
  const byId = {};
  for (const e of ENEMIES) byId[e.id] = e;
  // R24: レア役（rare:true）は重み抽選にもエリート抽選にも入れない＝湧かせるのは専用タイマーだけ
  const COMMON = ENEMIES.filter((e) => !e.rare);
  const RARE = BALANCE.rareEnemy;
  let rareT = RARE ? RARE.firstSec : 1e9;
  let rareOnBoss = false;   // R46: ボス戦に入った/出た瞬間を捕まえるための直前の状態

  const lerp = (a, b, t) => a + (b - a) * t;

  function waveT() {
    return Math.max(0, Math.min(1, run.elapsed / totalSec));
  }

  function currentInterval() { return lerp(W.spawnIntervalStart, W.spawnIntervalEnd, waveT()); }
  function currentHpMult() { return lerp(W.hpMultStart, W.hpMultEnd, waveT()); }
  function currentCount() { return lerp(W.spawnCountStart, W.spawnCountEnd, waveT()); }

  // 同時出現上限は時間で段階的に上がる（序盤から220体だと画面が潰れるため）
  function currentCap() {
    for (const s of BALANCE.capSteps) {
      if (run.elapsed < s.untilSec) return s.cap;
    }
    return BALANCE.enemyCap;
  }

  // 現在フェーズの重みで敵種別を1つ抽選
  function pickEnemyDef() {
    let phase = BALANCE.spawnPhases[BALANCE.spawnPhases.length - 1];
    for (const p of BALANCE.spawnPhases) {
      if (run.elapsed < p.untilSec) { phase = p; break; }
    }
    const entries = Object.entries(phase.weights);
    let total = 0;
    for (const [, w] of entries) total += w;
    let r = run.rng.random() * total;
    for (const [id, w] of entries) {
      r -= w;
      if (r <= 0) return byId[id];
    }
    return byId[entries[0][0]];
  }

  // カメラ視界の外周（+20〜60px）に出現座標を決める。
  // 楕円上の点は斜め方向で可視矩形の内側に入りポップインするため、
  // 「可視矩形を margin だけ外へ拡げた矩形の周上」から辺を長さ比で抽選して点を選ぶ（§3.4）。
  function spawnPos() {
    const px = run.player.x, py = run.player.y;
    const margin = run.rng.range(20, 60);
    const halfW = BALANCE.view.width / 2 + margin;
    const halfH = BALANCE.view.height / 2 + margin;
    const perimW = 2 * halfW, perimH = 2 * halfH;
    let r = run.rng.range(0, 2 * (perimW + perimH));
    let x, y;
    if (r < perimW) {                       // 上辺
      x = px - halfW + r; y = py - halfH;
    } else if (r < perimW + perimH) {       // 右辺
      r -= perimW; x = px + halfW; y = py - halfH + r;
    } else if (r < 2 * perimW + perimH) {   // 下辺
      r -= perimW + perimH; x = px + halfW - r; y = py + halfH;
    } else {                                // 左辺
      r -= 2 * perimW + perimH; x = px - halfW; y = py + halfH - r;
    }
    return { x, y };
  }

  function spawnOne(isElite) {
    const def = pickEnemyDef();
    const p = spawnPos();
    return run.spawnEnemy(def, p.x, p.y, isElite, currentHpMult());
  }

  function spawnElite() {
    const def = run.rng.pick(COMMON);
    const p = spawnPos();
    const e = run.spawnEnemy(def, p.x, p.y, true, currentHpMult());
    if (e) Sound.sfx('elite');
    return e;
  }

  // T キー / ラッシュ: 一気に count 体（cap を超えない）
  function spawnBurst(count) {
    const cap = run.enemyCap || BALANCE.enemyCap;
    for (let i = 0; i < count; i++) {
      if (run.enemies.length >= cap) break;
      spawnOne(false);
    }
  }

  // ---- R24 レア雑魚（マグマン）----
  // 実プレイFB「これはボス戦およびボス戦以外にもでてくる。出現は不定期」。
  // 間隔を毎回引き直すので、次にいつ来るかは予測できない＝「不定期」を数字で作る。
  // ⚠️ ボス戦中も止めない。ボス戦は装甲片しか弾が無いので、ここに強い弾が1個混ざる価値が大きい。
  function aliveRare() {
    let n = 0;
    for (const e of run.enemies) if (e.active && e.def && e.def.id === RARE.enemyId) n++;
    return n;
  }

  function spawnRare() {
    const def = byId[RARE.enemyId];
    if (!def) return null;
    const cap = run.enemyCap || BALANCE.enemyCap;
    if (run.enemies.length >= cap) return null;
    // 画面の内側の縁に置く＝湧いた瞬間に見える（見つけられない珍品は無いのと同じ）
    const a = run.rng.range(0, Math.PI * 2);
    const x = run.player.x + Math.cos(a) * RARE.dist;
    const y = run.player.y + Math.sin(a) * RARE.dist;
    const e = run.spawnEnemy(def, x, y, false, Math.min(RARE.hpMultCap, currentHpMult()));
    if (!e) return null;
    Sound.sfx('elite');
    Sound.sfx('heatMax', 0.5);
    if (run.fx && run.fx.announce) run.fx.announce('マグマン しゅつげん！ つかんで なげろ！', '#ff8a3d');
    if (run.fx && run.fx.setTarget) {
      run.fx.setTarget('rare', x, y, { color: RARE.tint, label: RARE.label });
    }
    run.spawnParticles(x, y, RARE.tint, 16);
    return e;
  }

  // 生きているレアへ矢印を追従させる。1体も居なくなったら矢印を消す。
  function updateRareMarker() {
    if (!run.fx || !run.fx.moveTarget) return;
    let t = null;
    for (const e of run.enemies) {
      if (e.active && e.def && e.def.id === RARE.enemyId) { t = e; break; }
    }
    if (t) run.fx.moveTarget('rare', t.x, t.y);
    else if (run.fx.clearTarget) run.fx.clearTarget('rare');
  }

  // R22: ビリヤードモード中の難易度補正。掴みは1入力1体・突きは倒せないので、一撃モード
  // （1入力で最大4体直撃＋連鎖6）に比べ場を掃除する速さが桁で落ちる。実プレイFB「敵が多すぎる」。
  function modeMul(key) {
    const b = BALANCE.hero.billiard;
    return (run.billiard && run.billiard.st.mode === 1) ? (b[key] == null ? 1 : b[key]) : 1;
  }

  function update(dt) {
    run.enemyCap = Math.max(8, Math.round(currentCap() * modeMul('capMul')));
    // レア雑魚（不定期・ボス戦中も止めない）
    if (RARE && byId[RARE.enemyId]) {
      // ★R46「ボス戦中だけ間隔を詰めて。ボス戦でこそ真価を発揮する」。
      //   ボス戦に**入った瞬間**に待ちを切り詰めるのが要：ここが無いと、平常の長い待ち
      //   （最大70秒）の途中でボスが始まった場合、そのボス戦のあいだ1体も出ずに終わる。
      //   実測（R45）で「5体中ボス戦中は1体だけ」だった原因がこれ。
      const onBoss = !!(run.boss && run.boss.active);
      if (onBoss !== rareOnBoss) {
        rareOnBoss = onBoss;
        if (onBoss && RARE.bossFirstSec != null) rareT = Math.min(rareT, RARE.bossFirstSec);
      }
      rareT -= dt;
      if (rareT <= 0) {
        // 次の間隔を毎回引き直す＝「不定期」。ボス戦中だけ短い方の帯から引く
        rareT = onBoss && RARE.bossEveryMin != null
          ? run.rng.range(RARE.bossEveryMin, RARE.bossEveryMax)
          : run.rng.range(RARE.everyMin, RARE.everyMax);
        if (aliveRare() < RARE.maxAlive) spawnRare();
      }
      updateRareMarker();
    }
    // エリート（2:00 / 4:00）
    for (let i = 0; i < BALANCE.elite.times.length; i++) {
      if (!eliteFired[i] && run.elapsed >= BALANCE.elite.times[i]) {
        eliteFired[i] = true;
        spawnElite();
      }
    }
    // 通常スポーン。ボス戦中は固定間隔・少数に絞ってボスへ集中させる（§10.4）。
    const bossActive = !!(run.boss && run.boss.active);
    const interval = bossActive ? BALANCE.boss.trashInterval : currentInterval();
    const count = (bossActive ? BALANCE.boss.trashCount : currentCount()) * modeMul('spawnMul');

    // ラッシュ（山場）。ボス戦中は起こさない＝ボスへの集中を壊さないため（§10.4）
    if (!bossActive) {
      for (let i = 0; i < R.counts.length; i++) {
        const at = R.startSec + i * R.intervalSec;
        if (!rushWarned[i] && run.elapsed >= at - R.warnSec) {
          rushWarned[i] = true;
          Sound.sfx('rush');
          if (run.fx && run.fx.rushWarning) run.fx.rushWarning();
        }
        if (!rushFired[i] && run.elapsed >= at) {
          rushFired[i] = true;
          spawnBurst(Math.max(4, Math.round(R.counts[i] * modeMul('spawnMul'))));
        }
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer += interval;
      countAcc += count;
      const n = Math.floor(countAcc);
      countAcc -= n;
      const cap = run.enemyCap || BALANCE.enemyCap;
      for (let i = 0; i < n; i++) {
        if (run.enemies.length >= cap) break;
        spawnOne(false);
      }
    }
  }

  return { update, spawnBurst, spawnElite };
}
