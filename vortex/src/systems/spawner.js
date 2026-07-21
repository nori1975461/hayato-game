// systems/spawner.js — ウェーブ進行・出現位置・種別抽選・エリート・cap制御（PROTOTYPE_SPEC §3.4 / §4）。
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

export function createSpawner(run) {
  const W = BALANCE.wave;
  const totalSec = W.stepSec * W.steps;      // 補間の終端（300s）
  let spawnTimer = 0;
  const eliteFired = BALANCE.elite.times.map(() => false);
  const byId = {};
  for (const e of ENEMIES) byId[e.id] = e;

  const lerp = (a, b, t) => a + (b - a) * t;

  function waveT() {
    return Math.max(0, Math.min(1, run.elapsed / totalSec));
  }

  function currentInterval() { return lerp(W.spawnIntervalStart, W.spawnIntervalEnd, waveT()); }
  function currentHpMult() { return lerp(W.hpMultStart, W.hpMultEnd, waveT()); }
  function currentCount() { return Math.round(lerp(W.spawnCountStart, W.spawnCountEnd, waveT())); }

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

  // T キー: 一気に count 体（cap を超えない）
  function spawnBurst(count) {
    for (let i = 0; i < count; i++) {
      if (run.enemies.length >= BALANCE.enemyCap) break;
      spawnOne(false);
    }
  }

  function update(dt) {
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
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer += interval;
      for (let i = 0; i < count; i++) {
        if (run.enemies.length >= BALANCE.enemyCap) break;
        spawnOne(false);
      }
    }
  }

  return { update, spawnBurst, spawnElite };
}
