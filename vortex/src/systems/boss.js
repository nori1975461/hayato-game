// systems/boss.js — ボス（Wave D：小/中/大の3段）の出現・状態機械・弾・撃破シネマティック（PROTOTYPE_SPEC §10.6-B / §13）。
// BALANCE.boss.tiers を時間順に処理する。同時に戦うボスは常に1体（前のボスを倒すまで次は出ない）。
// ボスは run.enemies に isBoss エンティティとして載せる（弾/ビーム/dealDamage/killEnemy 経路を流用）。
// 移動・2枚重ね表示・接触ダメージ・ボス弾はこのモジュールが所有する。
import { BALANCE } from '../data/balance.js';
import { BOSSES, ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);

// #3: ボス別の公転パーツ定義（見た目のみ＝数値バランスではないので balance.js でなくここで保持）。
// tex=ボス個性（ハート/宝石/棘）, count=個数, spin=公転角速度, selfSpin=自転, bob=軌道半径の揺れ, ringN=オーラリング枚数。
const ORBITS = {
  korotama: { tex: 'boss_orb_heart',   count: 4, spin: 2.4, selfSpin: 0, bob: 5, ringN: 1 },
  uzuking:  { tex: 'boss_orb_diamond', count: 6, spin: 1.8, selfSpin: 3, bob: 4, ringN: 1 },
  maou:     { tex: 'boss_orb_spike',   count: 8, spin: 1.4, selfSpin: 0, bob: 3, ringN: 2 },
};

export function createBoss(run) {
  const B = BALANCE.boss;
  const W = BALANCE.wave;
  const tiers = B.tiers;
  const killsPerCharge = BALANCE.special.killsPerCharge;
  const bossMap = {};
  for (const d of BOSSES) bossMap[d.id] = d;

  // --- スケジューラ状態（BALANCE は書き換えない・ローカルで進行管理） ---
  const warnedArr = tiers.map(() => false);
  const spawnedArr = tiers.map(() => false);
  let ti = 0;                   // 次に出現させる tier のインデックス
  let allDone = false;          // 全ボス撃破済み（最終ボス撃破で true）

  // --- 現在戦っているボスの状態（spawnFight でセット、endFight でクリア） ---
  let cfg = null;               // 現 tier の設定
  let def = null;               // 現ボスの見た目定義（enemies.js）
  let boss = null;              // run.enemies に載せるエンティティ
  let disp = null;              // { swirl, face, glowP, glowM }
  let state = 'idle';
  let stateT = 0;
  let attackIdx = 0;
  let phase2 = false;
  let killing = false;          // 撃破シネマティック中は多重発火を防ぐ
  let lockX = 0, lockY = 0;     // ダッシュ方向ロック
  const bullets = [];           // ボス弾（プレイヤーへ当たる）
  const pool = [];

  ensureTextures();

  // --- Boot.js（builder-support）がボステクスチャ未生成でも動くよう自前生成（全ボス分） ---
  function ensureTextures() {
    for (const d of BOSSES) {
      makeSprite(`boss_${d.id}_swirl`, d.sprites.swirl);
      makeSprite(`boss_${d.id}_face`, d.sprites.face);
    }
    // #3: 公転オーブ＆オーラリング（白テクスチャ→実行時 tint で各ボス色に染める）
    makeHeart('boss_orb_heart', 12);
    makeDiamond('boss_orb_diamond', 12);
    makeSpike('boss_orb_spike', 14);
    makeAuraRing('boss_aura_ring', 64, 7);
  }
  function makeSprite(key, sprite) {
    if (run.textures.exists(key)) return;
    const g = run.make.graphics({ x: 0, y: 0, add: false });
    const rows = sprite.rows, h = rows.length, w = rows[0].length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        const col = sprite.palette[ch];
        if (!col) continue;
        g.fillStyle(int(col), 1);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }
  // newG/P は関数宣言にする（巻き上げされ、上の ensureTextures() 呼び出し時点で初期化済みになる＝TDZ回避）
  function newG() { return run.make.graphics({ x: 0, y: 0, add: false }); }
  function P(x, y) { return new Phaser.Geom.Point(x, y); }
  function makeHeart(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    g.fillStyle(0xffffff, 1);
    const r = s * 0.26;
    g.fillCircle(s * 0.32, s * 0.34, r);
    g.fillCircle(s * 0.68, s * 0.34, r);
    g.fillPoints([P(s * 0.06, s * 0.40), P(s * 0.94, s * 0.40), P(s * 0.5, s * 0.96)], true);
    g.generateTexture(key, s, s);
    g.destroy();
  }
  function makeDiamond(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2;
    g.fillStyle(0xffffff, 1);
    g.fillPoints([P(c, 0), P(s * 0.82, s * 0.32), P(c, s), P(s * 0.18, s * 0.32)], true);
    // カット面の白ハイライト（宝石らしさ）
    g.fillStyle(0xffffff, 0.55);
    g.fillPoints([P(c, s * 0.06), P(s * 0.7, s * 0.32), P(c, s * 0.5), P(s * 0.3, s * 0.32)], true);
    g.generateTexture(key, s, s);
    g.destroy();
  }
  function makeSpike(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2, o = c, inr = c * 0.34, pts = [];
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? o : inr;
      const a = (Math.PI * i) / 4 - Math.PI / 2;
      pts.push(P(c + Math.cos(a) * rad, c + Math.sin(a) * rad));
    }
    g.fillStyle(0xffffff, 1);
    g.fillPoints(pts, true);
    g.generateTexture(key, s, s);
    g.destroy();
  }
  function makeAuraRing(key, s, thick) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2, outer = c - 0.5, inner = outer - thick;
    g.fillStyle(0xffffff, 1);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c, d2 = dx * dx + dy * dy;
        if (d2 <= outer * outer && d2 >= inner * inner) g.fillRect(x, y, 1, 1);
      }
    }
    // 4つのコブ＝回転が視認できるようにする
    for (let k = 0; k < 4; k++) {
      const a = (Math.PI * k) / 2;
      g.fillCircle(c + Math.cos(a) * (outer - thick / 2), c + Math.sin(a) * (outer - thick / 2), thick * 0.9);
    }
    g.generateTexture(key, s, s);
    g.destroy();
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  function summonHpMult() {
    const t = Math.max(0, Math.min(1, run.elapsed / (W.stepSec * W.steps)));
    return lerp(W.hpMultStart, W.hpMultEnd, t);
  }
  function idleDur(sec) { return sec * (phase2 ? cfg.phase2IdleMult : 1); }

  // ============ 出現 ============
  function spawnFight(tierCfg) {
    cfg = tierCfg;
    def = bossMap[cfg.bossId];
    phase2 = false;
    killing = false;

    const ang = run.rng.range(0, Math.PI * 2);
    const x = run.player.x + Math.cos(ang) * cfg.spawnDist;
    const y = run.player.y + Math.sin(ang) * cfg.spawnDist;

    const glowP = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(7)
      .setTint(int(cfg.glowOuter)).setScale(cfg.glowScale * 1.6);
    const glowM = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(7)
      .setTint(int(cfg.glowInner)).setScale(cfg.glowScale * 0.9);
    // 本体(swirl)を顔より一回り大きく＝顔の周りに本体のふちを覗かせて「顔だけ」感を消す
    const swirl = run.add.image(x, y, `boss_${def.id}_swirl`).setDepth(9).setScale(cfg.spriteScale * 1.22);
    const face = run.add.image(x, y, `boss_${def.id}_face`).setDepth(10).setScale(cfg.spriteScale);

    // #3: 本体の周りを公転する個性パーツ＋回転オーラリングを重ねる
    const ob = ORBITS[def.id] || ORBITS.uzuking;
    const bodyR = 8 * cfg.spriteScale * 1.22;      // swirl の表示半径
    const orbSize = cfg.spriteScale * 2.2;
    const orbitR = bodyR + orbSize * 0.6;          // 本体スプライトの外側を回す
    const orbCols = [int(cfg.glowInner), int(cfg.glowOuter)];
    const orbs = [];
    for (let i = 0; i < ob.count; i++) {
      const baseA = (Math.PI * 2 * i) / ob.count;
      const img = run.add.image(x, y, ob.tex).setBlendMode(ADD).setDepth(11)
        .setTint(orbCols[i % orbCols.length]).setDisplaySize(orbSize, orbSize);
      orbs.push({ img, baseA, phase: baseA });
    }
    const rings = [];
    for (let i = 0; i < ob.ringN; i++) {
      const d = bodyR * 2 * (1.15 + i * 0.28);
      rings.push(run.add.image(x, y, 'boss_aura_ring').setBlendMode(ADD).setDepth(6)
        .setTint(i === 0 ? int(cfg.glowOuter) : int(cfg.glowInner))
        .setDisplaySize(d, d).setAlpha(0.85));
    }
    disp = { swirl, face, glowP, glowM, orbs, rings, ob, orbitR };

    boss = {
      active: true, isBoss: true, id: ++run._eid, def,
      x, y, color: int(def.color),
      hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius,
      damage: cfg.bodyDamage, isElite: false, slowMark: -1, flashT: 0,
      spr: swirl, glow: glowP,   // releaseEnemy 互換のダミー（isBoss なので実際はプールされない）
    };
    run.enemies.push(boss);

    state = 'chase';
    stateT = idleDur(cfg.idleSec.afterSpawn);
    attackIdx = 0;

    run.spawnParticles(x, y, int(def.color), 30);
    run.shake(300, 5);
    if (run.withAudio) Sound.startBgm('boss');
  }

  // ============ AI ============
  function moveBoss(vx, vy, dt) {
    boss.x += vx * dt;
    boss.y += vy * dt;
  }

  function beginAttack() {
    const a = cfg.attacks[attackIdx];
    if (a === 'dash') {
      state = 'dashTele';
      stateT = cfg.dash.telegraphSec;
    } else if (a === 'ring') {
      state = 'ringTele';
      stateT = cfg.ring.telegraphSec;
    } else {
      doSummon();
      endAttackChase();
    }
  }

  function endAttackChase() {
    state = 'chase';
    stateT = idleDur(cfg.idleSec.betweenAttacks[attackIdx]);
    attackIdx = (attackIdx + 1) % cfg.attacks.length;
  }

  function updateAI(dt) {
    const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    stateT -= dt;

    switch (state) {
      case 'chase':
        moveBoss(nx * cfg.chaseSpeed, ny * cfg.chaseSpeed, dt);
        if (stateT <= 0) beginAttack();
        break;
      case 'dashTele':
        lockX = nx; lockY = ny;                 // 予告中は狙いを更新
        if (stateT <= 0) { state = 'dash'; stateT = cfg.dash.durationSec; }
        break;
      case 'dash': {
        const sp = cfg.dash.speed * (phase2 ? cfg.phase2DashSpeedMult : 1);
        moveBoss(lockX * sp, lockY * sp, dt);
        if (stateT <= 0) endAttackChase();
        break;
      }
      case 'ringTele':
        if (stateT <= 0) { fireRing(); endAttackChase(); }
        break;
      default:
        break;
    }
  }

  function enterPhase2() {
    phase2 = true;
    run.shake(300, 5);
    run.spawnParticles(boss.x, boss.y, 0xff3355, 24);
    if (cfg.rageText) run.floatText(boss.x, boss.y - 40, cfg.rageText, '#ff5e5e');
  }

  // ============ 攻撃 ============
  function fireRing() {
    const count = phase2 ? cfg.ring.count2 : cfg.ring.count;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      spawnBossBullet(boss.x, boss.y,
        Math.cos(a) * cfg.ring.bulletSpeed, Math.sin(a) * cfg.ring.bulletSpeed);
    }
    Sound.sfx('shoot');
  }

  function doSummon() {
    const zunDef = ENEMIES.find((e) => e.id === cfg.summon.enemyId);
    const n = cfg.summon.count;
    const hpMult = summonHpMult();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const x = boss.x + Math.cos(a) * cfg.summon.ringRadius;
      const y = boss.y + Math.sin(a) * cfg.summon.ringRadius;
      run.spawnEnemy(zunDef, x, y, false, hpMult);
    }
    run.spawnParticles(boss.x, boss.y, int(def.color), 16);
    Sound.sfx('elite');
  }

  // ============ ボス弾（プレイヤーへ当たる） ============
  function spawnBossBullet(x, y, vx, vy) {
    const tint = int(cfg.bulletTint);
    const d = pool.pop() || {
      glow: run.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: run.add.image(0, 0, 'core'),
    };
    const r = cfg.ring.bulletRadius;
    d.spr.setVisible(true).setDepth(11).setTint(tint)
      .setDisplaySize(r * 2.6, r * 2.6).setPosition(x, y);
    d.glow.setVisible(true).setDepth(6).setTint(tint).setScale(0.8).setPosition(x, y);
    bullets.push({ active: true, x, y, vx, vy, life: cfg.ring.lifeSec, dmg: cfg.ring.damage, spr: d.spr, glow: d.glow });
  }

  function recycleBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    pool.push({ spr: b.spr, glow: b.glow });
  }

  function updateBullets(dt) {
    const px = run.player.x, py = run.player.y;
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.spr.rotation += dt * 6;
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; }
      else {
        const rr = run.player.radius + 4;
        const dx = b.x - px, dy = b.y - py;
        if (dx * dx + dy * dy <= rr * rr) { run.hitPlayer(b.dmg); b.active = false; }
      }
      if (!b.active) recycleBullet(b);
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].active) bullets.splice(i, 1);
    }
  }

  function clearBullets() {
    for (const b of bullets) { if (b.active) { b.active = false; recycleBullet(b); } }
    bullets.length = 0;
  }

  // ============ 表示 ============
  function updateDisp(dt) {
    disp.swirl.rotation += dt * 1.2;
    for (const o of [disp.swirl, disp.face, disp.glowP, disp.glowM]) o.setPosition(boss.x, boss.y);
    const pulse = 1 + Math.sin(run.elapsed * 4) * 0.12;
    disp.glowP.setScale(cfg.glowScale * 1.6 * pulse);
    disp.glowM.setScale(cfg.glowScale * 0.9 * pulse);

    // #3: 公転オーブ＝本体の外周を回りながら半径を上下にバウンド（＋任意で自転）
    const ob = disp.ob;
    const spin = run.elapsed * ob.spin;
    for (const o of disp.orbs) {
      const a = o.baseA + spin;
      const r = disp.orbitR + Math.sin(run.elapsed * 3 + o.baseA) * ob.bob;
      o.img.setPosition(boss.x + Math.cos(a) * r, boss.y + Math.sin(a) * r);
      if (ob.selfSpin) o.img.rotation += dt * ob.selfSpin;
    }
    // オーラリング＝本体中心で内外が逆向きにゆっくり回転
    for (let i = 0; i < disp.rings.length; i++) {
      const ring = disp.rings[i];
      ring.setPosition(boss.x, boss.y);
      ring.rotation += dt * (i % 2 === 0 ? 0.8 : -1.1);
    }

    boss.flashT -= dt;
    let tint = null;
    if (boss.flashT > 0) tint = 0xffffff;
    else if (state === 'dashTele') tint = (Math.floor(run.elapsed * 16) % 2 === 0) ? 0xffffff : null;
    else if (phase2) tint = 0xff6a6a;
    if (tint == null) { disp.swirl.clearTint(); disp.face.clearTint(); }
    else { disp.swirl.setTint(tint); disp.face.setTint(tint); }
  }

  // ============ 撃破時の共通ごほうび（⑦爽快感：必殺満タン＋コイン＋派手バースト） ============
  function awardKillRewards(x, y) {
    // ボス撃破で必殺ゲージを満タン化（残り使用回数がある場合）
    if (run.special) { for (let i = 0; i < killsPerCharge; i++) run.special.addKill(); }
    run.coins += cfg.rewardCoins;
    run.floatText(run.player.x, run.player.y - 30, '+' + cfg.rewardCoins + ' コイン', '#ffd23f');
    for (let i = 0; i < 4; i++) {
      run.spawnParticles(
        x + run.rng.range(-30, 30), y + run.rng.range(-30, 30),
        run.rng.pick([0xff6ec7, 0xffd23f, 0x7ef7c8, 0x8fd0ff]), 14);
    }
  }

  // ============ 撃破シネマティック ============
  function onBossKilled(e) {
    if (killing || !boss || e !== boss) return;  // 現ボス以外／多重発火はガード
    killing = true;
    boss.active = false;
    const x = boss.x, y = boss.y;
    clearBullets();
    Sound.sfx('bossdown');
    awardKillRewards(x, y);
    startDeathSpin();

    if (cfg.final) {
      finishFinal(x, y);
    } else {
      finishMini(x, y);
    }
  }

  // 最終ボス「マオウ」撃破＝フルbossVictory＋かわいさギャップ演出＋クリア
  function finishFinal(x, y) {
    allDone = true;
    // 威圧顔 → 撃破 → かわいいピンクのハートで祝福（かわいさとのギャップ）
    run.floatText(x, y - 46, 'マオウ を たおした！', '#ff6ec7');

    const finish = () => {
      run.cinematic = false;
      destroyDisp();
      endFight();
      run.endRun(true);
    };

    if (run.fx && run.fx.bossVictory) {
      run.fx.bossVictory(x, y, finish);       // fx が run.cinematic とバースト演出を所有
    } else {
      // フォールバック: 自前で 1.8s のバースト＋シェイク後にクリアへ
      run.shake(400, 8);
      run.time.addEvent({
        delay: 150, repeat: 9,
        callback: () => run.spawnParticles(
          x + run.rng.range(-40, 40), y + run.rng.range(-40, 40),
          run.rng.pick([0xff6ec7, 0x7a3bf0, 0xffd23f]), 16),
      });
      run.time.delayedCall(cfg.deathCinematicSec * 1000, finish);
    }
  }

  // 小/中ボス撃破＝ミニ勝利演出（クリアにはならない・通常BGMへ戻してプレイ続行）
  function finishMini(x, y) {
    run.shake(300, 5);
    run.floatText(x, y - 40, def.name + ' げきは！', '#ffd23f');
    run.time.addEvent({
      delay: 120, repeat: 5,
      callback: () => run.spawnParticles(
        x + run.rng.range(-30, 30), y + run.rng.range(-30, 30),
        run.rng.pick([0xff6ec7, 0xffd23f, 0x7ef7c8]), 14),
    });
    run.time.delayedCall(cfg.deathCinematicSec * 1000, () => {
      destroyDisp();
      endFight();
      if (run.withAudio) Sound.startBgm('battle');   // 通常BGMへ復帰
    });
  }

  function startDeathSpin() {
    if (!disp) return;
    const ms = cfg.deathCinematicSec * 1000;
    const orbImgs = disp.orbs.map((o) => o.img);
    run.tweens.add({ targets: [disp.swirl, disp.face], angle: '+=540', duration: ms, ease: 'Cubic.in' });
    run.tweens.add({
      targets: [disp.swirl, disp.face, disp.glowP, disp.glowM, ...orbImgs, ...disp.rings],
      alpha: 0, duration: ms, ease: 'Cubic.in',
    });
  }

  function destroyDisp() {
    if (!disp) return;
    for (const o of [disp.swirl, disp.face, disp.glowP, disp.glowM]) { if (o) o.destroy(); }
    for (const o of disp.orbs) { if (o.img) o.img.destroy(); }
    for (const r of disp.rings) { if (r) r.destroy(); }
    disp = null;
  }

  // 現在の戦闘を終了し、次の tier へ進める
  function endFight() {
    boss = null;
    cfg = null;
    def = null;
    state = 'idle';
    phase2 = false;
    killing = false;
    ti++;
  }

  // ============ 毎フレーム ============
  function update(dt) {
    // スケジューラ：現在戦闘中でなく、まだ残り tier があれば予告→出現を進める
    if (!allDone && !boss && ti < tiers.length) {
      const t = tiers[ti];
      if (!warnedArr[ti] && run.elapsed >= t.warnSec) {
        warnedArr[ti] = true;
        if (run.withAudio) Sound.stopBgm();
        Sound.sfx('warning');
        if (run.fx && run.fx.bossWarning) run.fx.bossWarning();
        else run.shake(400, 3);
      }
      if (!spawnedArr[ti] && warnedArr[ti] && run.elapsed >= t.spawnSec) {
        spawnedArr[ti] = true;
        spawnFight(t);
      }
    }

    if (boss && boss.active) {
      updateAI(dt);
      updateDisp(dt);
      if (cfg.phase2 && !phase2 && boss.hp <= cfg.hp * cfg.phase2HpRatio) enterPhase2();
      const dmg = (state === 'dash') ? cfg.dash.damage : cfg.bodyDamage;
      const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
      const rr = run.player.radius + boss.radius;
      if (dx * dx + dy * dy <= rr * rr) run.hitPlayer(dmg);
    }

    updateBullets(dt);
  }

  function destroy() {
    clearBullets();
    for (const d of pool) { if (d.spr) d.spr.destroy(); if (d.glow) d.glow.destroy(); }
    pool.length = 0;
    destroyDisp();
    boss = null;
  }

  return {
    update, onBossKilled, destroy,
    get active() { return !!(boss && boss.active); },
    get warned() { return warnedArr.some(Boolean); },
    get entity() { return boss; },
  };
}
