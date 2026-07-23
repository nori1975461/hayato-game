// systems/spawner.js — ウェーブ進行・出現位置・種別抽選・エリート・cap制御（PROTOTYPE_SPEC §3.4 / §4）。
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

export function createSpawner(run) {
  const W = BALANCE.wave;
  const R = BALANCE.rush;
  const totalSec = W.stepSec * W.steps;      // 補間の終端（300s）
  let spawnTimer = 0;
  let countAcc = 0;                          // 湧き数の小数を持ち越す（切り捨てで湧きが痩せるのを防ぐ）
  const eliteFired = BALANCE.elite.times.map(() => false);
  const rushWarned = R.counts.map(() => false);
  const rushFired = R.counts.map(() => false);
  const byId = {};
  for (const e of ENEMIES) byId[e.id] = e;

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
    const def = run.rng.pick(ENEMIES);
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

  function update(dt) {
    run.enemyCap = currentCap();
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
    const count = bossActive ? BALANCE.boss.trashCount : currentCount();

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
          spawnBurst(R.counts[i]);
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
