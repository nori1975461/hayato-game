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
// FB#2/#3: 弾/ハートの色判別用。数値カラーを白へ寄せて明色化 / 黒へ寄せて濃色化する。
const lightenC = (c, t) => {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  const m = (v) => Math.round(v + (255 - v) * t);
  return (m(r) << 16) | (m(g) << 8) | m(b);
};
const darkenC = (c, t) => {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  const m = (v) => Math.round(v * (1 - t));
  return (m(r) << 16) | (m(g) << 8) | m(b);
};

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
    this.playerStage = 1;   // Lv5→2 / Lv10→3 でテクスチャごと変身（FB#5）
    // R4(#4/#8): 主人公の常時スターオーラ。周囲の敵へ自動近接ダメージ＋きらきら表示。
    this.playerAura = this.add.image(0, 0, 'w_star2').setBlendMode(ADD)
      .setDepth(7).setTint(0xfff0a0).setAlpha(0.3);
    this._auraTick = new Map();   // 敵id→最終ダメージ時刻（auraTickSec でゲート）
    this._auraSfxT = -1;

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
    this.enemyCap = BALANCE.capSteps[0].cap;   // 同時出現上限（spawner が経過時間で引き上げる）
    this.bullets = [];
    this.foeBullets = [];    // Wave R1: 敵（snipa/turret）の弾。プレイヤーへ当たる
    this.gems = [];
    this.hearts = [];        // FB#1: 体力回復アイテム（ハート）。gem と同じ spawn/magnet/pickup 機構に乗せる
    this.particles = [];
    this._enemyPool = [];
    this._bulletPool = [];
    this._foeBulletPool = [];
    this._gemPool = [];
    this._heartPool = [];
    this._sparkPool = [];
    this._pawPool = [];
    this._popPool = [];
    this._pawT = -1;             // 肉球ヒットマークの表示スロットル（elapsed基準・-1で初回を必ず出す）
    this._hitSparkT = -1;        // FB#5: 弾の着弾スパークの表示スロットル（多発時の負荷を抑える）
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
    this.updateHeroAura(dt);
    this.orbit.update(dt);
    this.spawner.update(dt);
    this.boss.update(dt);
    this.capture.update(dt);
    this.items.update(dt);
    this.special.update(dt);
    if (this.levelup.update) this.levelup.update(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateFoeBullets(dt);
    this.updateGems(dt);
    this.updateHearts(dt);
    this.updateParticles(dt);
    if (this.fx) this.fx.update(dt);
    this.updateBackground();

    // 死亡したものをプールへ戻して配列を詰める
    this.enemies = this.compact(this.enemies, (e) => this.releaseEnemy(e));
    this.bullets = this.compact(this.bullets, (b) => this.releaseBullet(b));
    this.foeBullets = this.compact(this.foeBullets, (b) => this.releaseFoeBullet(b));
    this.gems = this.compact(this.gems, (g) => this.releaseGem(g));
    this.hearts = this.compact(this.hearts, (h) => this.releaseHeart(h));
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
    // FB#5: レベル到達で主人公が変身（スターテイマー→ボルテックスマスター）
    const stage = this.level >= 10 ? 3 : this.level >= 5 ? 2 : 1;
    if (stage !== this.playerStage) this.transformPlayer(stage);

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

  // 変身演出（FB#5）。テクスチャ差し替え＋金リング＋星バースト＋ファンファーレ。
  // ステージごとにグロー色も変わる（1=ミント/2=マゼンタ/3=金）→強くなったのが一目で分かる。
  transformPlayer(stage) {
    this.playerStage = stage;
    this.playerImg.setTexture('player_' + stage);
    const glowColor = stage >= 3 ? 0xffd23f : stage === 2 ? 0xff6ec7 : 0x4de1c0;
    this.playerGlow.setTint(glowColor).setScale(1.6 + (stage - 1) * 0.5);
    const x = this.player.x, y = this.player.y;
    // 広がる金リング×2（時間差）
    for (let i = 0; i < 2; i++) {
      const ring = this.add.image(x, y, 'w_ring').setBlendMode(ADD).setDepth(14)
        .setTint(0xffd23f).setScale(0.4).setAlpha(0.9);
      this.tweens.add({
        targets: ring, scale: 4.5 + i * 2, alpha: 0, duration: 550, delay: i * 130,
        onComplete: () => ring.destroy(),
      });
    }
    // 本体がポンッと膨らんで戻る＋星の爆発
    this.tweens.add({ targets: this.playerImg, scale: 3.2, duration: 160, yoyo: true, ease: 'Quad.Out' });
    this.spawnParticles(x, y, glowColor, 24);
    this.popFx(x, y, 0xffd23f);
    Sound.sfx('evolve');
    this.shake(160, 4);
  }

  hitPlayer(dmg) {
    if (this.player.invuln > 0) return;
    this.player.hp -= dmg;
    this.player.invuln = BALANCE.player.invulnSec;
    this.player.flashT = 0.12;
    // FB#7: 被弾の手応え。専用の被弾音＋強めシェイク＋赤フラッシュ＋ごく短いヒットストップを重ねる。
    Sound.sfx('hurt');
    this.shake(180, 5);
    if (this.fx && this.fx.playerHurt) this.fx.playerHurt();
    if (!this.cinematic) this.freezeT = Math.max(this.freezeT, 0.05);
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
    // R4(#8): 弾数は変身ステージ連動（1→2→3・扇状）。stage3 で貫通付与（2体まで貫く）。
    const stage = this.playerStage;
    const nShots = H.shotByStage[Math.min(H.shotByStage.length - 1, stage - 1)] || 1;
    const pierce = stage >= H.pierceFromStage ? H.pierceCount : 0;
    const angles = [];
    for (let i = 0; i < nShots; i++) angles.push(ang + (i - (nShots - 1) / 2) * spread);
    // 弾色は変身ステージ連動（1=ミント/2=マゼンタ/3=金）＝変身の実感をショットでも見せる
    const shotColor = this.playerStage >= 3 ? 0xffd23f : this.playerStage === 2 ? 0xff6ec7 : 0x4de1c0;
    for (const a of angles) {
      this.spawnBullet(px, py, Math.cos(a) * H.bulletSpeed, Math.sin(a) * H.bulletSpeed,
        shotColor, dmg, H.bulletRadius, 'w_star2', pierce);   // Wave B: きらきらスター弾
    }
    // FB#5: 銃口位置に一瞬の閃光（発射の手応え。1斉射につき1回＝負荷を抑える）
    if (this.fx && this.fx.muzzleFlash) this.fx.muzzleFlash(px, py, ang, shotColor);
    Sound.sfx('starShot');   // FB#6: 主人公専用の派手な発射音（攻撃してる感触）
  }

  // R4(#4/#8): 主人公の常時スターオーラ。周囲radius内の敵へ auraTickSec ごとに自動近接ダメージ。
  // 「主人公自身が常に攻撃判定を持つ」＝撃ってる感覚（HAYATO参考）。主力は仲間なので威力は控えめ。
  updateHeroAura(dt) {
    const H = BALANCE.hero;
    const px = this.player.x, py = this.player.y;
    const R = H.auraRadius + (this.playerStage - 1) * H.auraRadiusPerStage;
    // きらきら表示：オーラの星をゆっくり回転＋脈動（run.elapsed 基準で決定的・alpha<0.5）
    const beat = 1 + Math.sin(this.elapsed * 5) * 0.12;
    const auraColor = this.playerStage >= 3 ? 0xffd23f : this.playerStage === 2 ? 0xff6ec7 : 0xfff0a0;
    this.playerAura.setPosition(px, py)
      .setDisplaySize(R * 2 * beat, R * 2 * beat)
      .setRotation(this.elapsed * 1.5)
      .setTint(auraColor)
      .setAlpha(0.22 + 0.12 * (0.5 + 0.5 * Math.sin(this.elapsed * 4)));
    // 自動近接ダメージ（敵ごと tick ゲート・ボスは対象外＝バランス保護）
    const dmg = Math.max(1, Math.round(H.auraDamage * this.stats.heroMult));
    let hitAny = false;
    for (const e of this.enemies) {
      if (!e.active || e.isBoss) continue;
      const rr = R + e.radius;
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy <= rr * rr) {
        const last = this._auraTick.get(e.id);
        if (last == null || this.elapsed - last >= H.auraTickSec) {
          this._auraTick.set(e.id, this.elapsed);
          this.dealDamage(e, dmg, auraColor);
          hitAny = true;
        }
      }
    }
    if (this._auraTick.size > 128) this._auraTick.clear();
    // 当たった時だけ控えめに鳴らす（多発しても耳に痛くないよう間引く）
    if (hitAny && this.elapsed - this._auraSfxT >= 0.18) {
      this._auraSfxT = this.elapsed;
      Sound.sfx('pop');
    }
  }

  // ============ 敵 ============
  spawnEnemy(def, x, y, isElite, hpMult) {
    if (this.enemies.length >= (this.enemyCap || BALANCE.enemyCap)) return null;
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
      isElite, slowMark: -1, flashT: 0, baseScale: scale,
      sinePhase: this.rng.range(0, Math.PI * 2),
      chargeState: 'approach', chargeT: 0, dashX: 0, dashY: 0,
      glow: disp.glow, spr: disp.spr,
    };
    e.maxHp = e.hp;
    // Wave R1: 攻撃状態。初回発火は sinePhase で個体ごとにばらす（乱数を追加消費しない）
    e.atkState = 'ready';
    e.atkT = def.attack ? def.attack.intervalSec * (0.4 + 0.6 * (e.sinePhase / (Math.PI * 2))) : 0;
    e.dashT = 0;
    e.lockX = 0; e.lockY = 0; e.aimLine = null;
    this.enemies.push(e);
    return e;
  }

  releaseEnemy(e) {
    if (e.isBoss) return; // ボスの表示は boss.js が破棄する（プール混入禁止）
    if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }  // 予告中に倒された照準ラインの後始末
    e.spr.setVisible(false).clearTint();
    e.glow.setVisible(false);
    this._enemyPool.push({ spr: e.spr, glow: e.glow });
  }

  updateEnemies(dt) {
    const px = this.player.x, py = this.player.y;
    const F = BALANCE.archetypes.FIELD;
    const X = BALANCE.enemyFx;
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
      } else if (e.movement === 'hop') {
        // ぴょんぴょん：着地の一瞬だけ止まり、跳ねている間だけ前へ進む
        e.sinePhase += dt * (Math.PI * 2 / 0.75);
        const jump = Math.max(0, Math.sin(e.sinePhase));
        vx = nx * e.speed * jump * 1.6;
        vy = ny * e.speed * jump * 1.6;
        e.hopLift = jump;
      } else if (e.movement === 'spiral') {
        // くるくる：近いほど強く回り込みながら寄る（正面から来ないので避けにくい）
        const swirl = Math.min(1.1, 140 / dist);
        vx = (nx * 0.75 - ny * swirl) * e.speed;
        vy = (ny * 0.75 + nx * swirl) * e.speed;
      } else if (e.movement === 'hover') {
        // 砲台ドローン：目標距離を保って浮遊（近すぎ→後退・遠すぎ→接近）＋横ドリフト（決定的）
        const want = e.def.hoverDist || 150;
        const radial = dist > want + 10 ? 1 : dist < want - 10 ? -1 : 0;
        const drift = Math.sin(this.elapsed * 1.5 + e.sinePhase);
        vx = nx * e.speed * radial - ny * e.speed * 0.5 * drift;
        vy = ny * e.speed * radial + nx * e.speed * 0.5 * drift;
      } else { // charge
        const r = this.updateCharge(e, dt, nx, ny, dist);
        vx = r.vx; vy = r.vy;
      }

      // Wave R1: 急降下突進（chibit）。突進中はロック方向へ speed×dashMult で直進
      if (e.dashT > 0) {
        e.dashT -= dt;
        const dm = (e.def.attack && e.def.attack.dashMult) || 2.6;
        vx = e.lockX * e.speed * dm;
        vy = e.lockY * e.speed * dm;
      }

      e.x += vx * slow * dt;
      e.y += vy * slow * dt;
      // ぷるぷる：生成時に消費済みの sinePhase を位相ずらしに流用する（乱数を追加消費しない）
      const bob = Math.sin(this.elapsed * X.bobHz + e.sinePhase);
      const bs = e.baseScale || 2;
      e.spr.setScale(bs * (1 + bob * X.bobAmp), bs * (1 - bob * X.bobAmp));
      e.spr.setRotation(bob * X.tiltAmp);
      e.spr.setPosition(e.x, e.y - (e.hopLift || 0) * 6);
      e.glow.setPosition(e.x, e.y);

      // フラッシュ・点滅
      if (e.flashT > 0) {
        e.flashT -= dt;
        e.spr.setTint(0xffffff);
      } else if (e.chargeState !== 'wind') {
        e.spr.clearTint();
      }

      // Wave R1: 予告付き攻撃（quake/divebomb/selfdestruct/lockbeam/spread）
      if (e.def.attack) {
        this.updateEnemyAttack(e, dt);
        if (!e.active) continue;   // selfdestruct で自壊した個体は接触判定に進めない
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

  // ============ 敵の攻撃（Wave R1） ============
  // ready→（射程内で）telegraph→発動→ready のループ。予告は本体点滅で必ず見せる。
  updateEnemyAttack(e, dt) {
    const A = e.def.attack;
    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.atkState === 'ready') {
      e.atkT -= dt;
      if (e.atkT <= 0) {
        if (dist <= A.range) {
          // 予告へ。方向ロック（このタイミングのプレイヤー方向を狙う）
          e.atkState = 'telegraph';
          e.atkT = A.telegraphSec;
          e.lockX = dx / dist; e.lockY = dy / dist;
          if (A.type === 'lockbeam') this.showAimLine(e, A.range);
        } else {
          e.atkT = 0.2;   // 射程外。少し待って再判定（毎フレーム判定を避ける）
        }
      }
    } else if (e.atkState === 'telegraph') {
      // 予告表現：本体を点滅（既存の被弾フラッシュと同系）
      if (Math.floor(this.elapsed * 10) % 2 === 0) e.spr.setTint(0xffffff);
      else e.spr.clearTint();
      if (e.aimLine) e.aimLine.setPosition(e.x, e.y);   // 照準ラインは自分に追従（向きはロック固定）
      e.atkT -= dt;
      if (e.atkT <= 0) {
        this.fireEnemyAttack(e);
        if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }
        if (e.active) {
          e.atkState = 'ready';
          e.atkT = A.intervalSec > 0 ? A.intervalSec : 0.2;
        }
      }
    }
  }

  // snipa の照準ライン（'white' を細長く・赤・半透明）。telegraph 終了で破棄する。
  showAimLine(e, len) {
    const line = this.add.image(e.x, e.y, 'white').setOrigin(0, 0.5).setBlendMode(ADD)
      .setDepth(8).setTint(0xff3b3b).setAlpha(0.35)
      .setDisplaySize(len, 2).setRotation(Math.atan2(e.lockY, e.lockX)).setPosition(e.x, e.y);
    e.aimLine = line;
  }

  fireEnemyAttack(e) {
    const A = e.def.attack;
    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (A.type === 'quake') {
      // 地面叩き：自分中心の衝撃波。範囲内ならダメージ＋拡大リング演出
      if (dist <= A.aoe + this.player.radius) this.hitPlayer(A.damage);
      const ring = this.add.image(e.x, e.y, 'w_ring').setBlendMode(ADD).setDepth(11)
        .setTint(e.color).setScale(0.4).setAlpha(0.45);
      this.tweens.add({
        targets: ring, scale: (A.aoe / 24) * 1.2, alpha: 0, duration: 300,
        onComplete: () => ring.destroy(),
      });
      Sound.sfx('elite');
    } else if (A.type === 'divebomb') {
      // 急降下突進：ロック方向へ dashSec 間だけ加速（速度は updateEnemies が処理）
      e.dashT = A.dashSec;
    } else if (A.type === 'selfdestruct') {
      // 自爆：範囲内ならダメージ→自壊（XP/コアは通常付与）。派手なバースト＋ポン
      if (dist <= A.aoe + this.player.radius) this.hitPlayer(A.damage);
      this.spawnParticles(e.x, e.y, e.color, 22);
      this.popFx(e.x, e.y, e.color);
      this.killEnemy(e, e.color);
    } else if (A.type === 'lockbeam') {
      // 狙撃：ロック方向へ速い弾を1発
      this.spawnFoeBullet(e.x, e.y, e.lockX, e.lockY, A.bulletSpeed, A.bulletRadius, A.damage, e.color);
      Sound.sfx('shoot');
    } else if (A.type === 'spread') {
      // 扇状：プレイヤー方向を中心に count 発
      const base = Math.atan2(dy, dx);
      const step = A.spreadDeg * Math.PI / 180;
      const mid = (A.count - 1) / 2;
      for (let i = 0; i < A.count; i++) {
        const a = base + (i - mid) * step;
        this.spawnFoeBullet(e.x, e.y, Math.cos(a), Math.sin(a), A.bulletSpeed, A.bulletRadius, A.damage, e.color);
      }
      Sound.sfx('shoot');
    }
  }

  // ============ 敵弾（Wave R1・プレイヤーへ当たる） ============
  spawnFoeBullet(x, y, dirX, dirY, speed, radius, dmg, color) {
    const disp = this._foeBulletPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'bullet'),
    };
    // FB#2: 敵弾は丸い危険弾（foe_orb）＋赤い危険フチで味方の星弾と区別。個性色(color)は弾本体に残す。
    // FB#5: 一回り大きく（2.4→3.0）＋進行方向へ短い赤トレイルで迫力を足す。
    // FB#3: 本体を少し濃く（darkenC）・フチを深紅（0xff2f2f→0xcc1420）へ落とし「重く危険」に。
    //       味方の明るい星／桃のハートと色でも一目で分離させる。
    const ang = Math.atan2(dirY, dirX);
    disp.spr.setTexture('foe_orb').setVisible(true).setDepth(11).setTint(darkenC(color, 0.18))
      .setDisplaySize(radius * 3.0, radius * 3.0).setPosition(x, y);
    disp.glow.setVisible(true).setDepth(6).setTint(0xcc1420)
      .setRotation(ang).setDisplaySize(radius * 4.4, radius * 2.4).setPosition(x, y);
    this.foeBullets.push({
      active: true, x, y, vx: dirX * speed, vy: dirY * speed,
      radius, dmg, life: 3, spr: disp.spr, glow: disp.glow,
    });
  }

  releaseFoeBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    this._foeBulletPool.push({ spr: b.spr, glow: b.glow });
  }

  updateFoeBullets(dt) {
    const px = this.player.x, py = this.player.y;
    for (const b of this.foeBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; continue; }
      const rr = this.player.radius + b.radius;
      const dx = b.x - px, dy = b.y - py;
      if (dx * dx + dy * dy <= rr * rr) { this.hitPlayer(b.dmg); b.active = false; }
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
    // FB#1: 回復ハート抽選（雑魚は低確率・エリートは高確率）。ドロップ判定も run.rng を使う。
    this.rollHealDrop(e);
    this.popFx(e.x, e.y, e.color);
    // 分裂（モチモ）。分裂で生まれた子はもう分裂しない＝無限増殖を防ぐ（§3.2）
    const sp = e.def && e.def.split;
    if (sp && !e.noSplit && !e.isElite) {
      for (let i = 0; i < sp.count; i++) {
        const a = (Math.PI * 2 / sp.count) * i + this.rng.range(0, 1);
        const c = this.spawnEnemy(e.def, e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, false, 1);
        if (!c) break;   // cap 到達
        c.noSplit = true;
        c.hp = Math.max(1, Math.round(e.maxHp * sp.hpMult));
        c.maxHp = c.hp;
        c.speed = e.def.speed * sp.speedMult;
        c.radius = e.def.radius * sp.scaleMult;
        c.baseScale = c.baseScale * sp.scaleMult;
        c.spr.setScale(c.baseScale);
      }
    }
  }

  // 雑魚撃破の「ポンっ」（Wave C）。多発するのでプール＋短命tweenで軽く済ませる
  popFx(x, y, color) {
    const spr = this._popPool.pop() || this.add.image(0, 0, 'w_star2').setBlendMode(ADD);
    spr.setTexture('w_star2').setVisible(true).setActive(true).setDepth(13)
      .setTint(color ?? 0xffffff).setPosition(x, y)
      .setScale(1.2).setAlpha(0.95).setRotation(0);
    this.tweens.add({
      targets: spr, scale: 3.2, alpha: 0, duration: 180,
      onComplete: () => { spr.setVisible(false); this._popPool.push(spr); },
    });
    // 同時多発でも耳に痛くならないよう、音は 0.05 秒に1回だけ
    if (this.elapsed - (this._lastPopSfx ?? -1) >= 0.05) {
      this._lastPopSfx = this.elapsed;
      Sound.sfx('pop');
    }
  }

  // ============ 弾 ============
  spawnBullet(x, y, vx, vy, color, damage, radius, tex = 'bullet', pierce = 0) {
    const disp = this._bulletPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'bullet'),
    };
    // プールから使い回すので、テクスチャは毎回入れ直す（前の弾の見た目が残るのを防ぐ）
    // FB#5: 弾を一回り大きく（2.4→2.9）して存在感を強める。tex は味方の星型/かわいい武器形（個性）を保持。
    // FB#3: 味方弾は「明るい星」として常時明色化。上ほど白い4隅tint（白コア）で、赤系tint武器でも
    //       敵の濃い赤丸と混ざらず「明るい星＝自分の弾」と分かる。個性色は下側と弾全体の色相に残す。
    disp.spr.setTexture(tex);
    const bright = lightenC(color, 0.5);   // 白へ半分寄せた明色（星の明るいコア）
    const body = lightenC(color, 0.22);    // 下側は個性色を残しつつ底上げ
    disp.spr.setVisible(true).setDepth(12).setTint(bright, bright, body, body)
      .setDisplaySize(radius * 2.9, radius * 2.9).setPosition(x, y);
    // FB#2: 味方弾は「金白の明るいフチ＋長い尾」で敵の赤フチと即区別。個性色(color)は弾本体に残す。
    // FB#4/#5: 進行方向へ伸ばした加算グローの尾で「速くて気持ちいい」スピード線を出す（尾を一段長く）。
    // FB#3: 金白グローを強めて（0xfff2b0→0xfff8d0）味方弾の明るさをさらに主張。
    // プレイヤー/仲間の弾は直進なので、生成時に一度だけ向き・長さを決めれば毎フレームのコストは増えない。
    const ang = Math.atan2(vy, vx);
    disp.glow.setVisible(true).setDepth(6).setTint(0xfff8d0)
      .setRotation(ang).setDisplaySize(radius * 8.4, radius * 3.2).setPosition(x, y);
    this.bullets.push({
      active: true, x, y, vx, vy, color, damage, radius,
      // R4(#8): pierce>0 の弾は貫通。既に当てた敵は hit で記録して二重ヒットを防ぐ。
      life: 1.1, pierce, hit: pierce > 0 ? new Set() : null,
      spr: disp.spr, glow: disp.glow,
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
        if (b.hit && b.hit.has(e.id)) continue;   // 貫通弾は同じ敵に二度当てない
        const rr = b.radius + e.radius;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy <= rr * rr) {
          this.dealDamage(e, b.damage, b.color);
          // FB#5: 着弾スパーク（弾が当たった手応え）。多発時はスロットルで負荷を抑える。
          if (this.fx && this.fx.hitSpark && this.elapsed - this._hitSparkT >= 0.03) {
            this._hitSparkT = this.elapsed;
            this.fx.hitSpark(e.x, e.y, b.color);
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
            b.hit.add(e.id);          // まだ飛ぶ（次の敵を貫く）
          } else {
            b.active = false;
            break;
          }
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
    // FB: 宝石が敵弾（赤glowの丸い foe_orb・本体は敵色 tint）と紛らわしい対策。
    // 敵色域（赤/橙/黄/シアン/青/灰）にもハートの桃にも被らない寒色系の固定色に統一する。
    //   旧: 小=0x66ffcc（緑シアン→シアン敵と被る）/ 大=0xffd23f（金→黄敵 0xffcf3d とほぼ一致）＝これが紛らわしさの原因。
    //   新: 小=エメラルド緑 / 大=アメジスト紫（どちらも敵に存在しない色）。多面カット形状と合わせ、赤い敵弾と色でも形でも即分離。
    const tint = big ? 0xb060ff : 0x33e070;
    disp.spr.setVisible(true).setDepth(12).setTint(tint)
      .setScale(big ? 1.7 : 1.05).setPosition(x, y);
    disp.glow.setVisible(true).setDepth(6).setTint(tint)
      .setScale(big ? 1.0 : 0.55).setPosition(x, y);
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

  // ============ 回復ハート（FB#1） ============
  // 撃破抽選。雑魚は healItem.dropRate・エリートは eliteDropRate。ボス撃破の確定1個は boss.js が spawnHeal を直接呼ぶ。
  rollHealDrop(e) {
    const HI = BALANCE.healItem;
    const rate = e.isElite ? HI.eliteDropRate : HI.dropRate;
    if (this.rng.chance(rate)) this.spawnHeal(e.x, e.y);
  }

  // gem/core と同じ表示（spr＋glow）機構。桃/マゼンタのハートで、寒色（緑/紫）の多面カットジェムとも明確に別物に見せる。
  // FB#3: 危険赤の敵弾（foe_orb）と紛れないよう、ハートは明るい桃〜マゼンタへ寄せ＋上側を白ハイライト。
  //       上ほど白い4隅tint（0xffd0ec）で「つやのある可愛い桃ハート＝回復」を強調し、濃い赤丸弾と即分離。
  spawnHeal(x, y) {
    const disp = this._heartPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'heart'),
    };
    disp.spr.setTexture('heart').setVisible(true).setDepth(12)
      .setTint(0xffd0ec, 0xffd0ec, 0xff4da6, 0xff4da6)   // 上=白桃ハイライト / 下=鮮やかマゼンタ桃
      .setScale(1.6).setPosition(x, y).setRotation(0);
    disp.glow.setVisible(true).setDepth(6).setTint(0xff9edf).setScale(1.1).setPosition(x, y);
    // ふわふわ位相は生成順で散らす（乱数を追加消費しない）
    this.hearts.push({ active: true, x, y, life: BALANCE.healItem.lifeSec,
      phase: this.hearts.length * 0.7, spr: disp.spr, glow: disp.glow });
  }

  releaseHeart(h) {
    h.spr.setVisible(false);
    h.glow.setVisible(false);
    this._heartPool.push({ spr: h.spr, glow: h.glow });
  }

  updateHearts(dt) {
    const HI = BALANCE.healItem;
    const px = this.player.x, py = this.player.y;
    // 回復は貴重なので magnet はジェムより弱い（範囲も吸引も控えめ）
    const magnetR = HI.magnetRadius + this.stats.magnetAdd * 0.5;
    const magnetR2 = magnetR * magnetR;
    const grabR = this.player.radius + HI.pickupRadius;
    for (const h of this.hearts) {
      if (!h.active) continue;
      h.life -= dt;
      // ふわふわ浮遊＋脈動（run.elapsed 基準で決定的・rng不使用）
      const bob = Math.sin(this.elapsed * 3 + h.phase) * 3;
      const beat = 1 + Math.sin(this.elapsed * 6 + h.phase) * 0.12;
      h.spr.setPosition(h.x, h.y + bob).setScale(1.6 * beat);
      h.glow.setPosition(h.x, h.y + bob).setScale(1.1 * beat);   // FB#3: 桃ハローを一回り広げ「回復＝安心」を強調
      if (h.life <= 3) {   // 残り3秒で点滅（消滅予告）
        const on = Math.floor(h.life * 6) % 2 === 0;
        h.spr.setVisible(on); h.glow.setVisible(on);
      }
      if (h.life <= 0) { h.active = false; continue; }
      const dx = px - h.x, dy = py - h.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= grabR * grabR) { this.collectHeal(h); h.active = false; continue; }
      if (d2 <= magnetR2) {
        const d = Math.sqrt(d2) || 1;
        h.x += (dx / d) * HI.pull * dt;
        h.y += (dy / d) * HI.pull * dt;
      }
    }
  }

  collectHeal(h) {
    const HI = BALANCE.healItem;
    const p = this.player;
    if (p.hp < p.maxHp) {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + HI.healAmount);
      this.floatText(p.x, p.y - 28, '+' + Math.round(p.hp - before) + ' HP', '#7dff8f');
    } else {
      this.coins += HI.fullBonusCoins;   // 満タン時は無駄にしない（設計判断・過剰実装は避ける）
      this.floatText(p.x, p.y - 28, '+' + HI.fullBonusCoins + ' コイン', '#ffd23f');
    }
    // 回復パーティクル（緑＋桃）＋やさしい上昇音（pickup と混同しない音色）
    this.spawnParticles(h.x, h.y, 0x7dff8f, 12);
    this.spawnParticles(h.x, h.y, 0xff9ec4, 8);
    Sound.sfx('heal');
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
