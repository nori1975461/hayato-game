// systems/boss.js — ボス「ウズキング」の出現・状態機械・弾・撃破シネマティック（PROTOTYPE_SPEC §10.6-B）。
// ボスは run.enemies に isBoss エンティティとして載せる（弾/ビーム/dealDamage/killEnemy 経路を流用）。
// 移動・2枚重ね表示・接触ダメージ・ボス弾はこのモジュールが所有する。
import { BALANCE } from '../data/balance.js';
import { BOSS, ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);

export function createBoss(run) {
  const B = BALANCE.boss;
  const W = BALANCE.wave;
  const zunDef = ENEMIES.find((e) => e.id === B.summon.enemyId);

  let warned = false;
  let spawned = false;
  let dead = false;
  let boss = null;              // run.enemies に載せるエンティティ
  let disp = null;              // { swirl, face, glowP, glowM }
  const bullets = [];           // ボス弾（プレイヤーへ当たる）
  const pool = [];

  // 状態機械: chase → dashTele → dash → chase → ringTele → chase → summon → chase → loop
  const ATTACKS = ['dash', 'ring', 'summon'];
  let state = 'idle';
  let stateT = 0;
  let attackIdx = 0;
  let phase2 = false;
  let lockX = 0, lockY = 0;     // ダッシュ方向ロック

  ensureTextures();

  // --- Boot.js（builder-support）がボステクスチャ未生成でも動くよう自前生成 ---
  function ensureTextures() {
    makeSprite('boss_uzu_swirl', BOSS.sprites.swirl);
    makeSprite('boss_uzu_face', BOSS.sprites.face);
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

  const lerp = (a, b, t) => a + (b - a) * t;
  function summonHpMult() {
    const t = Math.max(0, Math.min(1, run.elapsed / (W.stepSec * W.steps)));
    return lerp(W.hpMultStart, W.hpMultEnd, t);
  }
  function idleDur(sec) { return sec * (phase2 ? B.phase2IdleMult : 1); }

  // ============ 出現 ============
  function spawnBoss() {
    const ang = run.rng.range(0, Math.PI * 2);
    const x = run.player.x + Math.cos(ang) * B.spawnDist;
    const y = run.player.y + Math.sin(ang) * B.spawnDist;

    const glowP = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(7)
      .setTint(0x7a3bf0).setScale(B.glowScale * 1.6);
    const glowM = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(7)
      .setTint(0xff6ec7).setScale(B.glowScale * 0.9);
    const swirl = run.add.image(x, y, 'boss_uzu_swirl').setDepth(9).setScale(B.spriteScale);
    const face = run.add.image(x, y, 'boss_uzu_face').setDepth(10).setScale(B.spriteScale);
    disp = { swirl, face, glowP, glowM };

    boss = {
      active: true, isBoss: true, id: ++run._eid, def: BOSS,
      x, y, color: int(BOSS.color),
      hp: B.hp, maxHp: B.hp, radius: B.radius,
      damage: B.bodyDamage, isElite: false, slowMark: -1, flashT: 0,
      spr: swirl, glow: glowP,   // releaseEnemy 互換のダミー（isBoss なので実際はプールされない）
    };
    run.enemies.push(boss);

    state = 'chase';
    stateT = idleDur(B.idleSec.afterSpawn);
    attackIdx = 0;

    run.spawnParticles(x, y, int(BOSS.color), 30);
    run.shake(300, 5);
    if (run.withAudio) Sound.startBgm('boss');
  }

  // ============ AI ============
  function moveBoss(vx, vy, dt) {
    boss.x += vx * dt;
    boss.y += vy * dt;
  }

  function beginAttack() {
    const a = ATTACKS[attackIdx];
    if (a === 'dash') {
      state = 'dashTele';
      stateT = B.dash.telegraphSec;
    } else if (a === 'ring') {
      state = 'ringTele';
      stateT = B.ring.telegraphSec;
    } else {
      doSummon();
      endAttackChase();
    }
  }

  function endAttackChase() {
    state = 'chase';
    stateT = idleDur(B.idleSec.betweenAttacks[attackIdx]);
    attackIdx = (attackIdx + 1) % ATTACKS.length;
  }

  function updateAI(dt) {
    const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    stateT -= dt;

    switch (state) {
      case 'chase':
        moveBoss(nx * B.chaseSpeed, ny * B.chaseSpeed, dt);
        if (stateT <= 0) beginAttack();
        break;
      case 'dashTele':
        lockX = nx; lockY = ny;                 // 予告中は狙いを更新
        if (stateT <= 0) { state = 'dash'; stateT = B.dash.durationSec; }
        break;
      case 'dash': {
        const sp = B.dash.speed * (phase2 ? B.phase2DashSpeedMult : 1);
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
    run.floatText(boss.x, boss.y - 40, 'ウズキング ぶちギレ！', '#ff5e5e');
  }

  // ============ 攻撃 ============
  function fireRing() {
    const count = phase2 ? B.ring.count2 : B.ring.count;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      spawnBossBullet(boss.x, boss.y,
        Math.cos(a) * B.ring.bulletSpeed, Math.sin(a) * B.ring.bulletSpeed);
    }
    Sound.sfx('shoot');
  }

  function doSummon() {
    const n = B.summon.count;
    const hpMult = summonHpMult();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const x = boss.x + Math.cos(a) * B.summon.ringRadius;
      const y = boss.y + Math.sin(a) * B.summon.ringRadius;
      run.spawnEnemy(zunDef, x, y, false, hpMult);
    }
    run.spawnParticles(boss.x, boss.y, int(BOSS.color), 16);
    Sound.sfx('elite');
  }

  // ============ ボス弾（プレイヤーへ当たる） ============
  function spawnBossBullet(x, y, vx, vy) {
    const d = pool.pop() || {
      glow: run.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: run.add.image(0, 0, 'core'),
    };
    const r = B.ring.bulletRadius;
    d.spr.setVisible(true).setDepth(11).setTint(0xff6ec7)
      .setDisplaySize(r * 2.6, r * 2.6).setPosition(x, y);
    d.glow.setVisible(true).setDepth(6).setTint(0xff6ec7).setScale(0.8).setPosition(x, y);
    bullets.push({ active: true, x, y, vx, vy, life: B.ring.lifeSec, spr: d.spr, glow: d.glow });
  }

  function recycleBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    pool.push({ spr: b.spr, glow: b.glow });
  }

  function updateBullets(dt) {
    const px = run.player.x, py = run.player.y;
    const rr = run.player.radius + B.ring.bulletRadius;
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.spr.rotation += dt * 6;
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; }
      else {
        const dx = b.x - px, dy = b.y - py;
        if (dx * dx + dy * dy <= rr * rr) { run.hitPlayer(B.ring.damage); b.active = false; }
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
    disp.glowP.setScale(B.glowScale * 1.6 * pulse);
    disp.glowM.setScale(B.glowScale * 0.9 * pulse);

    boss.flashT -= dt;
    let tint = null;
    if (boss.flashT > 0) tint = 0xffffff;
    else if (state === 'dashTele') tint = (Math.floor(run.elapsed * 16) % 2 === 0) ? 0xffffff : null;
    else if (phase2) tint = 0xff6a6a;
    if (tint == null) { disp.swirl.clearTint(); disp.face.clearTint(); }
    else { disp.swirl.setTint(tint); disp.face.setTint(tint); }
  }

  // ============ 撃破シネマティック ============
  function onBossKilled() {
    if (dead) return;
    dead = true;
    if (boss) boss.active = false;
    const x = boss ? boss.x : run.player.x;
    const y = boss ? boss.y : run.player.y;
    clearBullets();
    Sound.sfx('bossdown');
    startDeathSpin();

    const finish = () => {
      run.cinematic = false;
      run.coins += B.rewardCoins;
      run.floatText(run.player.x, run.player.y - 30, '+' + B.rewardCoins + ' コイン', '#ffd23f');
      destroyDisp();
      run.endRun(true);
    };

    if (run.fx && run.fx.bossVictory) {
      run.fx.bossVictory(x, y, finish);       // fx が run.cinematic とバースト演出を所有
    } else {
      // フォールバック: 自前で暗転せず 1.8s のバースト＋シェイク後にクリアへ
      run.shake(400, 8);
      run.time.addEvent({
        delay: 150, repeat: 9,
        callback: () => run.spawnParticles(
          x + run.rng.range(-40, 40), y + run.rng.range(-40, 40),
          run.rng.pick([0xff6ec7, 0x7a3bf0, 0xffd23f]), 16),
      });
      run.time.delayedCall(B.deathCinematicSec * 1000, finish);
    }
  }

  function startDeathSpin() {
    if (!disp) return;
    const ms = B.deathCinematicSec * 1000;
    run.tweens.add({ targets: [disp.swirl, disp.face], angle: '+=540', duration: ms, ease: 'Cubic.in' });
    run.tweens.add({
      targets: [disp.swirl, disp.face, disp.glowP, disp.glowM],
      alpha: 0, duration: ms, ease: 'Cubic.in',
    });
  }

  function destroyDisp() {
    if (!disp) return;
    for (const o of [disp.swirl, disp.face, disp.glowP, disp.glowM]) { if (o) o.destroy(); }
    disp = null;
  }

  // ============ 毎フレーム ============
  function update(dt) {
    // 前置きタイムライン
    if (!warned && run.elapsed >= B.warnSec) {
      warned = true;
      if (run.withAudio) Sound.stopBgm();
      Sound.sfx('warning');
      if (run.fx && run.fx.bossWarning) run.fx.bossWarning();
      else run.shake(400, 3);
    }
    if (!spawned && run.elapsed >= B.spawnSec) {
      spawned = true;
      spawnBoss();
    }

    if (boss && boss.active) {
      updateAI(dt);
      updateDisp(dt);
      if (!phase2 && boss.hp <= B.hp * B.phase2HpRatio) enterPhase2();
      const dmg = (state === 'dash') ? B.dash.damage : B.bodyDamage;
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
    get warned() { return warned; },
    get entity() { return boss; },
  };
}
