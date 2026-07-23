// scenes/Run.js — 本編。移動・敵・弾・ビーム・XP・演出と各systemの配線（PROTOTYPE_SPEC §5.3 / §6 / §7）。
import { BALANCE } from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { createRng } from '../core/rng.js';
import { Sound } from '../audio/sound.js';
import { createOrbit } from '../systems/orbit.js';
import { createSpawner } from '../systems/spawner.js';
import { createCapture } from '../systems/capture.js';
import { createLevelup } from '../systems/levelup.js';
import { createFx } from '../systems/fx.js';
import { createBoss } from '../systems/boss.js';
import { createItems } from '../systems/items.js';
import { createSpecial } from '../systems/special.js';
import { createHud } from '../ui/hud.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);

const START_PARTY = ['starpuppy', 'pikabit'];

export class RunScene extends Phaser.Scene {
  constructor() {
    super('Run');
  }

  create(data) {
    this.withAudio = !!(data && data.withAudio);
    const V = window.VORTEX || {};
    this.seed = V.seed || 20260720;
    this.rng = createRng(this.seed);

    // --- 進行状態 ---
    this.elapsed = 0;
    this.runDurationSec = BALANCE.runDurationSec;
    this.coins = 0;
    this.captures = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = BALANCE.xp.firstLevelNeed + BALANCE.xp.needStep * (2 - 2); // Lv2まで=5
    this.paused = false;
    this.drafting = false;    // v3: ドラフト廃止。検証スクリプト互換のため常に false で保持
    this.ended = false;
    this.cinematic = false;   // 合成/ボス撃破など進行停止する演出中
    this.freezeT = 0;         // ヒットストップ残り秒
    this.heroShotT = BALANCE.hero.intervalSec;

    // 強化ステータス
    this.stats = {
      damageMult: 1, angularMult: 1, radiusMult: 1,
      moveMult: 1, captureAdd: 0, magnetAdd: 0, heroMult: 1,
    };

    // --- プレイヤー ---
    const P = BALANCE.player;
    this.player = { x: 0, y: 0, hp: P.hp, maxHp: P.hp, radius: P.radius, invuln: 0, flashT: 0 };
    this.playerGlow = this.add.image(0, 0, 'glow').setBlendMode(ADD)
      .setDepth(8).setTint(0x4de1c0).setScale(1.6);
    this.playerImg = this.add.image(0, 0, 'player').setScale(2).setDepth(10);

    // --- パーティ（開始編成） ---
    this.party = START_PARTY.map((id) => ({ def: MONSTERS.find((m) => m.id === id) }));

    // --- 背景の星空（2層視差） ---
    const W = BALANCE.view.width, H = BALANCE.view.height;
    this.bgFar = this.add.tileSprite(W / 2, H / 2, W, H, 'stars1')
      .setScrollFactor(0).setDepth(-20).setAlpha(0.6);
    this.bgNear = this.add.tileSprite(W / 2, H / 2, W, H, 'stars2')
      .setScrollFactor(0).setDepth(-19).setAlpha(0.85);

    // --- プール ---
    this.enemies = [];
    this.bullets = [];
    this.gems = [];
    this.particles = [];
    this._enemyPool = [];
    this._bulletPool = [];
    this._gemPool = [];
    this._sparkPool = [];
    this._pawPool = [];
    this._pawT = -1;             // 肉球ヒットマークの表示スロットル（elapsed基準・-1で初回を必ず出す）
    this._eid = 0;

    // --- カメラ ---
    this.cameras.main.startFollow(this.playerImg, true, 0.18, 0.18);
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // --- systems ---
    this.orbit = createOrbit(this);
    this.spawner = createSpawner(this);
    this.capture = createCapture(this);
    this.levelup = createLevelup(this);
    this.fx = createFx(this);
    this.boss = createBoss(this);
    this.items = createItems(this);
    this.special = createSpecial(this);   // hud が run.special を参照するため createHud より前
    this.orbit.rebuild();

    // --- HUD ---
    this.hud = createHud(this);
    this.muted = false;

    if (this.withAudio) Sound.startBgm();

    this.events.once('shutdown', () => {
      if (this.boss) this.boss.destroy();
      if (this.items) this.items.destroy();
      if (this.fx && this.fx.destroy) this.fx.destroy();
      if (this.special) this.special.destroy();
    });

    this.installInput();
  }

  // ============ 入力 ============
  installInput() {
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.moveKeys = this.input.keyboard.addKeys({
      up: KC.UP, down: KC.DOWN, left: KC.LEFT, right: KC.RIGHT,
      w: KC.W, a: KC.A, s: KC.S, d: KC.D,
    });

    const kb = this.input.keyboard;
    kb.on('keydown-P', () => { if (!this.ended) this.togglePause(); });
    kb.on('keydown-M', () => this.toggleMute());
    kb.on('keydown-R', () => { if (this.paused) this.restartRun(); });
    kb.on('keydown-T', () => { if (!this.paused) this.spawner.spawnBurst(300); });
    kb.on('keydown-G', () => { if (!this.paused) this.capture.forceDropCore(); });
    kb.on('keydown-SPACE', () => { if (!this.paused && !this.ended) this.special.fire(); });
  }

  togglePause() {
    this.paused = !this.paused;
    this.hud.setPause(this.paused);
  }

  toggleMute() {
    this.muted = Sound.toggleMute();
    this.hud.setMute(this.muted);
  }

  restartRun() {
    if (this.withAudio) Sound.stopBgm();
    this.scene.restart({ withAudio: this.withAudio });
  }

  // v3でドラフトUIは廃止（★は自動強化）。外部参照の保険として no-op で残す。
  setDrafting() {
    this.drafting = false;
  }

  // ============ メインループ ============
  update(time, delta) {
    if (this.ended) return;
    // ポーズ中のみ時間停止（v3: ドラフトは廃止）
    if (this.paused) {
      this.hud.update(delta);
      return;
    }
    let dt = delta / 1000;
    if (dt > 0.05) dt = 0.05; // タブ復帰などの巨大dtを抑制

    // シネマティック中（合成/ボス撃破）は進行停止。演出tweenはScene側で継続する。
    if (this.cinematic) {
      if (this.fx) this.fx.update(dt);
      this.hud.update(delta);
      return;
    }
    // ヒットストップ（一瞬の停止）。
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      if (this.fx) this.fx.update(dt);
      this.hud.update(delta);
      return;
    }

    this.elapsed += dt;

    this.updatePlayer(dt);
    this.updateHeroShot(dt);
    this.orbit.update(dt);
    this.spawner.update(dt);
    this.boss.update(dt);
    this.capture.update(dt);
    this.items.update(dt);
    this.special.update(dt);
    if (this.levelup.update) this.levelup.update(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateGems(dt);
    this.updateParticles(dt);
    if (this.fx) this.fx.update(dt);
    this.updateBackground();

    // 死亡したものをプールへ戻して配列を詰める
    this.enemies = this.compact(this.enemies, (e) => this.releaseEnemy(e));
    this.bullets = this.compact(this.bullets, (b) => this.releaseBullet(b));
    this.gems = this.compact(this.gems, (g) => this.releaseGem(g));
    this.particles = this.compact(this.particles, (p) => this.releaseSpark(p));

    this.hud.update(delta);

    // クリアはボス撃破のみ（時間切れ敗北なし）。シネマ中は敗北判定を保留（撃破クリアを先取りさせる）。
    if (!this.cinematic && this.player.hp <= 0) this.endRun(false);
  }

  compact(arr, onDead) {
    let alive = null;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].active) { if (alive) alive.push(arr[i]); }
      else { if (!alive) alive = arr.slice(0, i); onDead(arr[i]); }
    }
    return alive || arr;
  }

  // ============ プレイヤー ============
  updatePlayer(dt) {
    const k = this.moveKeys;
    let dx = 0, dy = 0;
    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      const sp = BALANCE.player.speed * this.stats.moveMult;
      this.player.x += dx * inv * sp * dt;
      this.player.y += dy * inv * sp * dt;
    }
    this.playerImg.setPosition(this.player.x, this.player.y);
    this.playerGlow.setPosition(this.player.x, this.player.y);

    // 無敵・被弾フラッシュ
    if (this.player.invuln > 0) {
      this.player.invuln -= dt;
      const on = Math.floor(this.elapsed * 12) % 2 === 0;
      this.playerImg.setVisible(on);
    } else {
      this.playerImg.setVisible(true);
    }
    if (this.player.flashT > 0) {
      this.player.flashT -= dt;
      this.playerImg.setTint(0xffffff);
    } else {
      this.playerImg.clearTint();
    }
  }

  hitPlayer(dmg) {
    if (this.player.invuln > 0) return;
    this.player.hp -= dmg;
    this.player.invuln = BALANCE.player.invulnSec;
    this.player.flashT = 0.08;
    Sound.sfx('hit');
    this.shake(90, 3);
  }

  // 主人公の自動攻撃「スターショット」。射程内の最寄り敵へ発射（Lv8で2連・Lv16で3連）。
  updateHeroShot(dt) {
    const H = BALANCE.hero;
    this.heroShotT -= dt;
    if (this.heroShotT > 0) return;

    const px = this.player.x, py = this.player.y;
    let best = null, bestD2 = H.range * H.range;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - px, dy = e.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = e; }
    }
    if (!best) return; // 射程内に敵がいなければ待機（タイマー維持）

    this.heroShotT = H.intervalSec;
    const dmg = (H.damageBase + Math.floor(this.level / 2) * H.damagePerTwoLevels) * this.stats.heroMult;
    const ang = Math.atan2(best.y - py, best.x - px);
    const spread = H.spreadDeg * Math.PI / 180;
    let angles;
    if (this.level >= H.tripleLevel) angles = [ang, ang - spread, ang + spread];
    else if (this.level >= H.twinLevel) angles = [ang - spread, ang + spread];
    else angles = [ang];
    for (const a of angles) {
      this.spawnBullet(px, py, Math.cos(a) * H.bulletSpeed, Math.sin(a) * H.bulletSpeed,
        0x4de1c0, dmg, H.bulletRadius, 'w_star2');   // Wave B: きらきらスター弾
    }
    Sound.sfx('shoot');
  }

  // ============ 敵 ============
  spawnEnemy(def, x, y, isElite, hpMult) {
    if (this.enemies.length >= BALANCE.enemyCap) return null;
    const E = BALANCE.elite;
    const disp = this._enemyPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'white'),
    };
    const scale = isElite ? 4 : 2;
    disp.spr.setTexture('enemy_' + def.id).setScale(scale).clearTint()
      .setVisible(true).setDepth(9).setPosition(x, y);
    disp.glow.setTint(int(def.color)).setScale(isElite ? 3 : 1.6)
      .setVisible(true).setDepth(4).setPosition(x, y);

    const e = {
      active: true, id: ++this._eid, def, movement: def.movement,
      x, y, color: int(def.color),
      hp: Math.round(def.hp * hpMult * (isElite ? E.hpMult : 1)),
      speed: def.speed * (isElite ? E.speedMult : 1),
      damage: def.damage,
      radius: def.radius * (isElite ? E.sizeMult : 1),
      isElite, slowMark: -1, flashT: 0,
      sinePhase: this.rng.range(0, Math.PI * 2),
      chargeState: 'approach', chargeT: 0, dashX: 0, dashY: 0,
      glow: disp.glow, spr: disp.spr,
    };
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  releaseEnemy(e) {
    if (e.isBoss) return; // ボスの表示は boss.js が破棄する（プール混入禁止）
    e.spr.setVisible(false).clearTint();
    e.glow.setVisible(false);
    this._enemyPool.push({ spr: e.spr, glow: e.glow });
  }

  updateEnemies(dt) {
    const px = this.player.x, py = this.player.y;
    const F = BALANCE.archetypes.FIELD;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.isBoss) continue; // ボスの移動・接触ダメージは boss.js が管理
      let dx = px - e.x, dy = py - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      const slow = e.slowMark === this.elapsed && !e.isBoss ? F.slowFactor : 1;
      let vx = 0, vy = 0;

      if (e.movement === 'chase') {
        vx = nx * e.speed; vy = ny * e.speed;
      } else if (e.movement === 'sine') {
        e.sinePhase += dt * (Math.PI * 2 / 1.2);
        const lat = Math.cos(e.sinePhase) * 40 * (Math.PI * 2 / 1.2);
        vx = nx * e.speed - ny * lat;
        vy = ny * e.speed + nx * lat;
      } else { // charge
        const r = this.updateCharge(e, dt, nx, ny, dist);
        vx = r.vx; vy = r.vy;
      }

      e.x += vx * slow * dt;
      e.y += vy * slow * dt;
      e.spr.setPosition(e.x, e.y);
      e.glow.setPosition(e.x, e.y);

      // フラッシュ・点滅
      if (e.flashT > 0) {
        e.flashT -= dt;
        e.spr.setTint(0xffffff);
      } else if (e.chargeState !== 'wind') {
        e.spr.clearTint();
      }

      // プレイヤー接触
      const rr = this.player.radius + e.radius;
      if (dist <= rr) this.hitPlayer(e.damage);
    }
  }

  updateCharge(e, dt, nx, ny, dist) {
    e.chargeT -= dt;
    switch (e.chargeState) {
      case 'approach':
        if (dist <= 140) { e.chargeState = 'wind'; e.chargeT = 0.6; }
        return { vx: nx * e.speed, vy: ny * e.speed };
      case 'wind': {
        const on = Math.floor(this.elapsed * 16) % 2 === 0;
        e.spr.setTint(on ? 0xffffff : e.color);
        if (e.chargeT <= 0) {
          e.chargeState = 'dash'; e.chargeT = 1.0;
          e.dashX = nx; e.dashY = ny; // 突進方向ロック
        }
        return { vx: 0, vy: 0 };
      }
      case 'dash':
        if (e.chargeT <= 0) { e.chargeState = 'cooldown'; e.chargeT = 1.5; }
        return { vx: e.dashX * 260, vy: e.dashY * 260 };
      default: // cooldown
        if (e.chargeT <= 0) e.chargeState = 'approach';
        return { vx: 0, vy: 0 };
    }
  }

  dealDamage(e, dmg, color) {
    if (!e.active) return;
    e.hp -= dmg;
    e.flashT = 0.08;
    this.spawnHitMark(e.x, e.y, color);
    if (e.hp <= 0) this.killEnemy(e, color);
  }

  // Wave B: 肉球のヒットマーク。連続ヒットで埋め尽くさないよう時間で間引く。
  // rng は使わない（autotest の乱数消費順が変わると決定性が壊れるため）。
  spawnHitMark(x, y, color) {
    if (this.elapsed - this._pawT < 0.06) return;
    this._pawT = this.elapsed;
    const spr = this._pawPool.pop() || this.add.image(0, 0, 'w_paw').setBlendMode(ADD);
    spr.setTexture('w_paw').setVisible(true).setActive(true).setDepth(13)
      .setTint(color ?? 0xffffff).setPosition(x, y)
      .setScale(0.7).setAlpha(0.9).setRotation(0);
    this.tweens.add({
      targets: spr, scale: 1.5, alpha: 0, duration: 220,
      onComplete: () => { spr.setVisible(false); this._pawPool.push(spr); },
    });
  }

  killEnemy(e, color) {
    if (!e.active) return;
    if (e.isBoss) { e.active = false; this.boss.onBossKilled(e); return; } // ボス撃破は専用演出へ
    e.active = false;
    this.kills++;
    this.special.addKill();
    // シネマ中はcompactが回らないので、その場で見た目を消す（撃破の手応えを遅らせない）
    e.spr.setVisible(false);
    e.glow.setVisible(false);
    const burst = e.isElite ? 20 : (8 + Math.floor(this.rng.random() * 5));
    this.spawnParticles(e.x, e.y, e.color, burst);
    if (e.isElite) this.shake(100, 4);
    // XPジェム
    this.spawnGem(e.x, e.y, e.isElite ? BALANCE.xp.eliteGemValue : BALANCE.xp.gemValue, e.isElite);
    // スターコア抽選
    this.capture.onEnemyKilled(e);
  }

  // ============ 弾 ============
  spawnBullet(x, y, vx, vy, color, damage, radius, tex = 'bullet') {
    const disp = this._bulletPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'bullet'),
    };
    // プールから使い回すので、テクスチャは毎回入れ直す（前の弾の見た目が残るのを防ぐ）
    disp.spr.setTexture(tex);
    disp.spr.setVisible(true).setDepth(12).setTint(color)
      .setDisplaySize(radius * 2.4, radius * 2.4).setPosition(x, y);
    disp.glow.setVisible(true).setDepth(6).setTint(color)
      .setScale(0.7).setPosition(x, y);
    this.bullets.push({
      active: true, x, y, vx, vy, color, damage, radius,
      life: 1.1, spr: disp.spr, glow: disp.glow,
    });
  }

  releaseBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    this._bulletPool.push({ spr: b.spr, glow: b.glow });
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; continue; }
      for (const e of this.enemies) {
        if (!e.active) continue;
        const rr = b.radius + e.radius;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy <= rr * rr) {
          this.dealDamage(e, b.damage, b.color);
          b.active = false;
          break;
        }
      }
    }
  }

  // ============ ビーム ============
  activateBeam(x, y, angle, length, width, color, damage) {
    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    const half = width / 2;
    for (const e of this.enemies) {
      if (!e.active) continue;
      // 点(e)と線分[A, A+dir*length]の距離
      const rx = e.x - x, ry = e.y - y;
      let t = rx * dirX + ry * dirY;
      t = Math.max(0, Math.min(length, t));
      const cx = x + dirX * t, cy = y + dirY * t;
      const dx = e.x - cx, dy = e.y - cy;
      const rr = half + e.radius;
      if (dx * dx + dy * dy <= rr * rr) this.dealDamage(e, damage, color);
    }
    // 見た目（durationSec でフェード消滅）
    // Wave B: にじビーム。w_rainbow は彩色済みなので tint は白（＝色を潰さない）
    const beam = this.add.image(x, y, 'w_rainbow')
      .setOrigin(0, 0.5).setDepth(12).setBlendMode(ADD)
      .setTint(0xffffff).setAlpha(0.9).setPosition(x, y).setRotation(angle)
      .setDisplaySize(length, width);
    this.tweens.add({
      targets: beam, alpha: 0, duration: BALANCE.archetypes.BEAM.durationSec * 1000,
      onComplete: () => beam.destroy(),
    });
  }

  // ============ XPジェム ============
  spawnGem(x, y, value, big) {
    if (this.gems.length >= 200) {
      // 最古を自動回収（XPは付与してから消す＝ロスなし）
      const old = this.gems.shift();
      this.levelup.addXp(old.value);
      this.releaseGem(old);
    }
    const disp = this._gemPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'gem'),
    };
    const tint = big ? 0xffd23f : 0x66ffcc;
    disp.spr.setVisible(true).setDepth(12).setTint(tint)
      .setScale(big ? 2 : 1.2).setPosition(x, y);
    disp.glow.setVisible(true).setDepth(6).setTint(tint)
      .setScale(big ? 0.9 : 0.5).setPosition(x, y);
    this.gems.push({ active: true, x, y, value, spr: disp.spr, glow: disp.glow });
  }

  releaseGem(g) {
    g.spr.setVisible(false);
    g.glow.setVisible(false);
    this._gemPool.push({ spr: g.spr, glow: g.glow });
  }

  updateGems(dt) {
    const px = this.player.x, py = this.player.y;
    const magnetR = BALANCE.xp.magnetRadius + this.stats.magnetAdd;
    const magnetR2 = magnetR * magnetR;
    const grabR = this.player.radius + 6;
    for (const g of this.gems) {
      if (!g.active) continue;
      const dx = px - g.x, dy = py - g.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= grabR * grabR) {
        this.levelup.addXp(g.value);
        Sound.sfx('pickup');
        g.active = false;
        continue;
      }
      if (d2 <= magnetR2) {
        const d = Math.sqrt(d2) || 1;
        const pull = 220;
        g.x += (dx / d) * pull * dt;
        g.y += (dy / d) * pull * dt;
        g.spr.setPosition(g.x, g.y);
        g.glow.setPosition(g.x, g.y);
      }
    }
  }

  // ============ パーティクル ============
  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const spr = this._sparkPool.pop() || this.add.image(0, 0, 'spark').setBlendMode(ADD);
      const ang = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(40, 150);
      const life = this.rng.range(0.35, 0.7);
      spr.setVisible(true).setDepth(13).setTint(color)
        .setScale(this.rng.range(0.7, 1.4)).setAlpha(1).setPosition(x, y);
      this.particles.push({
        active: true, x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life, maxLife: life, spr,
      });
    }
  }

  releaseSpark(p) {
    p.spr.setVisible(false);
    this._sparkPool.push(p.spr);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = p.life / p.maxLife;
      p.spr.setPosition(p.x, p.y).setAlpha(a).setScale(a * 1.4 + 0.2);
    }
  }

  // ============ フロートテキスト・シェイク ============
  floatText(x, y, text, colorString) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: '12px', color: colorString || '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1400);
    this.tweens.add({
      targets: t, y: y - 26, alpha: 0, duration: 850, ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  shake(duration, px) {
    // Phaser の shake intensity はカメラ寸法に対する比率（offset = intensity × width/height）。
    // §6「シェイク 100ms/4px」を満たすため、横 4px = 4 / view.width を渡す。
    this.cameras.main.shake(duration, (px || 4) / BALANCE.view.width);
  }

  // ============ 背景視差 ============
  updateBackground() {
    const cam = this.cameras.main;
    this.bgFar.tilePositionX = cam.scrollX * 0.2;
    this.bgFar.tilePositionY = cam.scrollY * 0.2;
    this.bgNear.tilePositionX = cam.scrollX * 0.5;
    this.bgNear.tilePositionY = cam.scrollY * 0.5;
  }

  // ============ 終了 ============
  endRun(clear) {
    if (this.ended) return;
    this.ended = true;
    if (this.withAudio) Sound.stopBgm();
    Sound.sfx(clear ? 'clear' : 'gameover');
    this.scene.start('Result', {
      clear,
      bossDefeated: clear, // クリアはボス撃破のみ（202行）＝クリア時は必ずボス撃破
      withAudio: this.withAudio,
      elapsed: this.elapsed,
      kills: this.kills,
      captures: this.captures,
      coins: this.coins,
      party: this.party.map((m) => m.def.id),
    });
  }
}
