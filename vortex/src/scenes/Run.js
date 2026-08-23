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
import { createHitFx } from '../systems/hitfx.js';
import { createBilliard } from '../systems/billiard.js';
import { createHud } from '../ui/hud.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);
// R21: 被弾のつぶれが戻りきるまでの秒数（短いほど鋭い。0.12秒＝約7フレーム）
const R21_SQUASH_SEC = 0.12;
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
// R18b: 敵弾の形。表示サイズは baseRadius を基準にした比率で決めるので、当たり半径が変わっても形が崩れない。
const FOE_BULLET_SHAPE = {
  dart:  { tex: 'foe_dart',  baseRadius: 3, w: 24, h: 8,  glowW: 46, glowH: 9 },
  shell: { tex: 'foe_shell', baseRadius: 4, w: 18, h: 10, glowW: 30, glowH: 14 },
  orb:   { tex: 'foe_orb',   baseRadius: 4, w: 12, h: 12, glowW: 18, glowH: 10 },
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
    this.gemHealCount = 0;    // ジェル回復ゲージの溜まり（BALANCE.gemHeal.every で1回復）
    this.paused = false;
    this.drafting = false;    // v3: ドラフト廃止。検証スクリプト互換のため常に false で保持
    this.ended = false;
    this.cinematic = false;   // 合成/ボス撃破など進行停止する演出中
    this.freezeT = 0;         // ヒットストップ残り秒
    // R23: スローモーション。freezeT（完全停止）と違い、遅いだけで全部が動き続ける。
    // 実プレイFB「特殊弾を手渡しされる際はスローモーションでゆっくりと」の受け皿。
    this.slowT = 0;           // 残り秒（実時間で数える）
    this.slowMul = 1;         // この倍率でゲーム内のdtを縮める
    // R21 Wave 2: 手動の一撃（ブレイクストライク）。旧ワイヤーアーム／アームスラムは廃止した
    // （どちらも自動発動＝1回の攻撃に対するプレイヤーの入力が0回で、演出を何倍しても手応えが出ない）。
    this._strikeT = 0;          // クールダウンの残り秒
    this._strikeRecover = 0;    // 硬直の残り秒（この間は移動が鈍る）
    this._strikeIfr = 0;        // 踏み込み中の無敵の残り秒
    this._lungeT = 0;           // 踏み込み突進の残り秒
    this._lungeVX = 0; this._lungeVY = 0;
    this._pointerSeen = false;  // マウスを一度でも使ったか（使うまではキーボードだけで完走できる）
    this._jKey = null;
    this._stagPool = [];        // よろけリングの使い回しプール
    this._chainCount = 0;       // 直近の炸裂連鎖の段数（HUD/演出用）

    // 強化ステータス
    this.stats = {
      damageMult: 1, angularMult: 1, radiusMult: 1,
      moveMult: 1, captureAdd: 0, magnetAdd: 0, heroMult: 1,
      defenseCut: 0,   // R23 やしろ：被ダメージの軽減率（0〜shrine.defenseCap）
    };

    // --- プレイヤー ---
    const P = BALANCE.player;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, hp: P.hp, maxHp: P.hp, radius: P.radius, invuln: 0, flashT: 0 };
    this.playerGlow = this.add.image(0, 0, 'glow').setBlendMode(ADD)
      .setDepth(8).setTint(0x4f8cff).setScale(2.2).setAlpha(0.55);   // R16: コバルトのオーラ（ブレイブギア配色）
    // R12b: 表示倍率2だと 12×14ドット＝24×28px で、なかま(16×16×2.5＝40×40px)より小さかった。
    // 「画面で一番小さいのが主人公」だと再設計しても見えないので、なかまと同格以上まで拡大する
    // （当たり判定 radius はゲームバランスなので不変。見た目だけ大きくする）。
    // R15: 拡大率は全段 3.0 で固定。少年は成長しない（大きくなるのは腕だけ＝テクスチャ側で表現）。
    this.playerImg = this.add.image(0, 0, 'player').setScale(3.0).setDepth(10);
    this._weaponAim = 0;    // 直近の狙い角（索敵範囲に敵がいない間は維持して構えを保つ）
    this.playerStage = 1;   // Lv5→2 / Lv10→3 でテクスチャごと変身（FB#5）
    // R12: 主武器＝クラッシュアーム。殴る瞬間だけ拳を前方へ突き出す（常時表示だと画面が拳で埋まる）。
    // 加算合成にすると熱色が飽和して「黄色い四角」に潰れ、腕と拳の形が読めなくなったので通常描画。
    // 光り物（衝撃リング・光の筋）は fx.heroImpact 側が担当し、役割を分けている。
    this.playerFistImg = this.add.image(0, 0, 'hero_fist1')
      .setScale(2.6).setDepth(12).setVisible(false);
    // R22: 体と拳をつなぐ腕。これが無いと拳が宙に浮いて「ロケットパンチ」に見える（実プレイFB）。
    // 拳スプライト自体にも腕は描かれているが、突き出すと体との間に隙間ができて切り離される。
    this.playerArmImg = this.add.image(0, 0, 'white')
      .setOrigin(0, 0.5).setDepth(11).setVisible(false);
    // 拳の間合いを示す熱のリング。ヒートで色と明るさが上がる。
    // 星形（旧 w_star2）だと「どこまで届くか」が読めず、間合いを詰める判断ができなかったので輪にした。
    this.playerAura = this.add.image(0, 0, 'w_ring').setBlendMode(ADD)
      .setDepth(7).setTint(0xff8a1f).setAlpha(0.3);
    this._meleeT = 0;       // 次に殴るまでの残り秒
    this._heat = 0;         // 連撃ヒート（0..melee.heatMax）。殴ると増え、離れると冷める
    this._punchT = 0;       // 踏み込みモーションの残り秒
    this._punchAng = 0;     // 踏み込み方向（直近に殴った敵の方向）
    this._knockX = 0; this._knockY = 0; this._knockT = 0;   // 被弾ノックバック（押し返される）
    this._lowHp = false;    // 体力が危険域か（周縁の赤い警告の on/off）

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

    // --- R21: 打撃感（イース風）---
    // hitfx はヒットストップの強さ連動とSEピッチ揺らぎだけを担当する（画面振動は既存の
    // this.shake＝Phaserのカメラシェイクをそのまま使う。実績のある実装を置き換える利得がない）。
    // ⚠️ 専用の独立乱数を持つので run.rng を一切消費しない＝autotest の決定性は無傷。
    this.hitfx = createHitFx({ seed: (this.seed >>> 0) || 1 });
    this._hitFeelIdx = BALANCE.hitFeel.defaultPreset;
    this._allySfxT = -1;         // 仲間の命中音のスロットル
    this._allyShakeT = -1;       // 仲間の命中による揺れのスロットル
    this._dmgTextT = -1;         // ダメージ数字のスロットル

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
    this.billiard = createBilliard(this); // R22スパイク：掴む→溜める→投げる（キー5で一撃モードと切替）
    this.orbit.rebuild();

    // --- HUD ---
    this.hud = createHud(this);
    this.muted = false;

    if (this.withAudio) Sound.startBgm();

    this.events.once('shutdown', () => {
      for (const r of this._stagPool) r.destroy();   // R21W2: よろけリングのプール
      this._stagPool.length = 0;
      if (this._crownPool) { for (const c of this._crownPool) c.destroy(); this._crownPool.length = 0; }
      for (const e of this.enemies) if (e.stagRing) { e.stagRing.destroy(); e.stagRing = null; }
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
    // R21W2: 手動の一撃。発火は update 内の isDown ポーリング（pointerdown イベントだと
    // 合成シネマのスキップ処理と二重発火するため）。ここでは「使ったか」だけを拾う。
    if (this.input.mouse) this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', () => { this._pointerSeen = true; });
    // R22: 「最後に使った入力が勝つ」ための時刻。⚠️ pointerdown では更新しない。
    //   攻撃自体が左クリックなので、押しただけで狙いがカーソルへ乗っ取られてしまう
    //   （実プレイFB「全然狙ったところに標準できない」の主犯）。動かしたときだけ意思とみなす。
    this.input.on('pointermove', () => { this._pointerSeen = true; this._pointerMoveT = this.elapsed; });
    this._jKey = kb.addKey(KC.J);   // 左クリックの代替（キーボードだけでも完走できる）

    kb.on('keydown-P', () => { if (!this.ended) this.togglePause(); });
    kb.on('keydown-M', () => this.toggleMute());
    kb.on('keydown-R', () => { if (this.paused) this.restartRun(); });
    kb.on('keydown-T', () => { if (!this.paused) this.spawner.spawnBurst(300); });
    kb.on('keydown-G', () => { if (!this.paused) this.capture.forceDropCore(); });
    kb.on('keydown-SPACE', () => { if (!this.paused && !this.ended) this.special.fire(); });

    // R21: 打撃感プリセットの即時切替（テスト用）。好みは文章で決められないので、
    // 実プレイ中に 1〜4 で切り替えて体感で選ぶ。選ばれた番号を既定値にして確定させる。
    const feelKeys = ['ONE', 'TWO', 'THREE', 'FOUR'];
    feelKeys.forEach((k, i) => {
      kb.on('keydown-' + k, () => {
        if (this.paused || this.ended) return;
        if (i >= BALANCE.hitFeel.presets.length) return;
        this._hitFeelIdx = i;
        const p = this.hitFeel();
        if (this.fx) this.fx.announce('打撃感 ' + (i + 1) + '：' + p.name, '#ffe9a8');
      });
    });

    // R22スパイク：ビリヤード攻撃の比較用。好みは文章で決められないので実プレイ中に切り替えて選ぶ。
    //   5 … 攻撃モード（ビリヤード ⇄ 一撃）
    //   6 … よろけの挙動（歩く ⇄ ゆっくり漂う ⇄ その場で漂う）。①奥行き と ②接触圧 が競合する分岐
    //   7 … 投げの実測値（何回/分・平均何体・空振り何回）。機能テストでは噛み合わせの失敗を見逃すため
    kb.on('keydown-FIVE', () => {
      if (this.paused || this.ended) return;
      const name = this.billiard.toggleMode();
      if (this.fx) this.fx.announce('攻撃：' + name, '#9fe8ff');
    });
    kb.on('keydown-SIX', () => {
      if (this.paused || this.ended) return;
      const name = this.billiard.cycleDrift();
      if (this.fx) this.fx.announce('よろけ：' + name, '#9fe8ff');
    });
    kb.on('keydown-SEVEN', () => {
      if (this.paused || this.ended) return;
      if (this.fx) this.fx.announce(this.billiard.statsLine(), '#ffe9a8');
    });
    //   8 … よろけの時間切れ（消滅 ⇄ 強化復活）。「そもそも投げが必要か」を左右する分岐
    kb.on('keydown-EIGHT', () => {
      if (this.paused || this.ended) return;
      const name = this.billiard.toggleExpire();
      if (this.fx) this.fx.announce('時間切れ：' + name, '#9fe8ff');
    });
    //   9 … ボス戦の装甲片（切＝R23前の状態 ⇄ 弱 ⇄ 標準 ⇄ 強）。ボス戦の長さと手応えが変わる。
    //        ボットは「予告のほぼ全部を割る」上限値しか出せないので、強さの正解は実プレイでしか決まらない
    kb.on('keydown-NINE', () => {
      if (this.paused || this.ended) return;
      const name = this.billiard.cycleShards();
      if (this.fx) this.fx.announce('装甲片：' + name, '#9fe8ff');
    });
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
    this.realDt = dt;         // スローモーションで縮める前の実時間（演出の尺はこちらで数える）

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

    // スローモーション。残り時間は**実時間**で減らし、ゲーム側へ渡すdtだけを縮める
    // （縮めたdtで数えると、遅くしたぶんスローが延びて永久に終わらない）。
    if (this.slowT > 0) {
      this.slowT -= dt;
      dt *= this.slowMul;
      if (this.slowT <= 0) this.slowMul = 1;
    }

    this.elapsed += dt;

    this.updatePlayer(dt);
    this.updateHeroAim(dt);     // R14: 構えの狙い角だけを決める（銃は全廃）
    this.updateHeroMelee(dt);   // R12: 主武器（クラッシュアーム）。_punchT/_punchAng を決める
    // R22スパイク：一撃モード（billiard.mode 0）のときだけ現行の一撃を回す。
    // ビリヤードモードでは掴み／突き／投げが billiard.update 側で完結する。
    if (this.billiard.st.mode === 0) this.updateHeroStrike(dt);
    this.updateHeroFist(dt);    // R12: 殴りモーション中だけ拳を描画（melee の直後に読む）
    this.billiard.update(dt);   // R22スパイク（_punchT を読む updateHeroFist より後）
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
    const P = BALANCE.player;
    if (dx || dy) {
      const inv = 1 / Math.hypot(dx, dy);
      // R21W2: 硬直中は鈍る／R22: 溜め中も鈍る（_moveMul。②被弾の緊張感のアンカー）
      const sp = P.speed * this.stats.moveMult
        * (this._strikeRecover > 0 ? 0.6 : 1) * (this._moveMul || 1);
      this.player.x += dx * inv * sp * dt;
      this.player.y += dy * inv * sp * dt;
      // R21W3: 偏差射撃の予測に使う。ノックバックと踏み込みは自分の意思でない動きなので含めない。
      this.player.vx = dx * inv * sp; this.player.vy = dy * inv * sp;
    } else {
      this.player.vx = 0; this.player.vy = 0;
    }
    // R12: 被弾ノックバック。減衰しながら加害者と反対方向へ押し出される＝「効いた」重み。
    // 操作を奪う長さにはしない（hurtKnockSec は0.2秒未満）。
    if (this._knockT > 0) {
      this._knockT -= dt;
      const kf = Math.max(0, this._knockT / P.hurtKnockSec);
      this.player.x += this._knockX * kf * dt;
      this.player.y += this._knockY * kf * dt;
    }

    // R12: 殴りの踏み込み。素早く前へ出てゆっくり戻る。見た目だけで当たり判定は動かさない
    // （判定まで動かすと、避けたつもりの敵弾に当たる理不尽になる）。
    let ox = 0, oy = 0;
    if (this._punchT > 0) {
      this._punchT -= dt;
      const M = BALANCE.hero.melee;
      const p = 1 - Math.max(0, this._punchT / M.punchSec);   // 0→1 の進行度
      const lunge = M.punchLunge * (p < 0.3 ? p / 0.3 : (1 - p) / 0.7);
      ox = Math.cos(this._punchAng) * lunge;
      oy = Math.sin(this._punchAng) * lunge;
    }
    this.playerImg.setPosition(this.player.x + ox, this.player.y + oy);
    this.playerGlow.setPosition(this.player.x + ox, this.player.y + oy);

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

    // R12: 体力が危険域に入ったら画面周縁を赤く脈打たせ、入った瞬間だけ警告音を鳴らす。
    const low = this.player.hp <= this.player.maxHp * P.lowHpRatio;
    if (low !== this._lowHp) {
      this._lowHp = low;
      if (this.fx && this.fx.setLowHp) this.fx.setLowHp(low);
      if (low) Sound.sfx('lowHp');
    }
  }

  // 変身演出（FB#5）。テクスチャ差し替え＋金リング＋星バースト＋ファンファーレ。
  // ステージごとにグロー色も変わる（R16ブレイブギア＝1=コバルト/2=スカイ/3=金）→ギアの成長が一目で分かる。
  transformPlayer(stage) {
    this.playerStage = stage;
    this.playerImg.setTexture('player_' + stage);
    // R15: **拡大率は変えない**（全段 scale 3.0 ＝ 48×54px）。3枚のテクスチャは同じ16×18で
    // 少年の画素が完全に同一なので、変化するのは腕の列だけになる。大きくなるのは腕であって
    // 少年ではない、という正典§22の一点をここで守っている（当たり判定 radius 7 も不変）。
    // R12: 主武器の拳も同じ段で大型化（小型ガントレット→パワーアーム→巨大破砕アーム）。
    this.playerFistImg.setTexture('hero_fist' + stage).setScale(2.6 + (stage - 1) * 0.4);
    // R19: Stage2 は 0x9fe0ff（仲間スターパピー #7fd8ff と ΔE 7.6＝ほぼ同色）だったのでペリウィンクルへ。
    //   コバルト→ペリウィンクル→金の三段が、そのまま「昇っていく」順に見える。
    const glowColor = stage >= 3 ? 0xffd23f : stage === 2 ? 0xb9c4ff : 0x4f8cff;
    this.playerGlow.setTint(glowColor).setScale(2.2 + (stage - 1) * 0.55).setAlpha(0.55);
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
    // 膨らみは「今のスケールの1.4倍」。固定値にすると拡大後のスケールと並んで膨らまなくなる。
    this.tweens.add({
      targets: this.playerImg, scale: this.playerImg.scaleX * 1.4,
      duration: 160, yoyo: true, ease: 'Quad.Out',
    });
    this.spawnParticles(x, y, glowColor, 24);
    this.popFx(x, y, 0xffd23f);
    Sound.sfx('evolve');
    this.shake(160, 4);
  }

  // 被弾。R12で srcX/srcY（加害者の位置）を任意で受け取れるようにした。渡されたときは
  // その反対方向へ押し返され、画面端の光り方でも「どっちからやられたか」が分かる。
  // 引数なしの旧呼び出しもそのまま動く（方向演出とノックバックが省かれるだけ）。
  hitPlayer(dmg, srcX, srcY) {
    if (this.player.invuln > 0 || this._strikeIfr > 0) return;   // R21W2: 踏み込み中は無敵
    // R23 やしろ：防御力。被ダメージを割合で減らす（上限は shrine.defenseCap なので0にはならない）
    const cut = Math.min(BALANCE.shrine.defenseCap, this.stats.defenseCut || 0);
    if (cut > 0) dmg = Math.max(1, Math.round(dmg * (1 - cut)));
    this.player.hp -= dmg;
    this.player.invuln = BALANCE.player.invulnSec;
    this.player.flashT = 0.12;
    // R12: 被弾で連撃ヒートが半分に落ちる。踏み込んで殴り続けるほど積み上がるものを、
    // 被弾で失う＝突撃兵のリスクとリターンをヒート1つで表現する（全損にはしない）。
    this._heat = Math.floor(this._heat / 2);

    const P = BALANCE.player;
    // ダメージの重み（最大HP比）。音・シェイク・フラッシュ・ヒットストップの強さをこれで揃える
    // ＝かすり傷と大ダメージが同じ手応えにならない。
    const ratio = Math.max(0, Math.min(1, dmg / Math.max(1, this.player.maxHp)));
    let dirX = null, dirY = null;
    if (srcX != null && srcY != null) {
      const dx = this.player.x - srcX, dy = this.player.y - srcY;
      const d = Math.hypot(dx, dy) || 1;
      this._knockX = (dx / d) * P.hurtKnockback;
      this._knockY = (dy / d) * P.hurtKnockback;
      this._knockT = P.hurtKnockSec;
      dirX = -dx / d; dirY = -dy / d;   // 画面端は「敵がいる側」を光らせる
    }
    // FB#7: 被弾の手応え。専用の被弾音＋強めシェイク＋赤フラッシュ＋ごく短いヒットストップを重ねる。
    Sound.sfx('hurt', ratio);
    this.shake(180 + Math.round(140 * ratio), 5 + Math.round(4 * ratio));
    if (this.fx && this.fx.playerHurt) this.fx.playerHurt(dirX, dirY, ratio);
    if (!this.cinematic) this.freezeT = Math.max(this.freezeT, 0.05 + 0.07 * ratio);
  }

  // R12: 拳の間合い（melee）を返す。銃・拳・オーラ表示で同じ値を使う。
  meleeRange() {
    const M = BALANCE.hero.melee;
    return M.radius + (this.playerStage - 1) * M.radiusPerStage;
  }

  // R14: 構えの狙い角を決める（銃は全廃したので「撃つ相手」ではなく「体を向ける相手」）。
  // 拳もワイヤーアームもこの角を使う＝主人公は常に一番近い脅威へ体を向けている。
  updateHeroAim(dt) {
    const px = this.player.x, py = this.player.y;
    const best = this.nearestEnemy(BALANCE.hero.aimRange);
    if (best) this._weaponAim = Math.atan2(best.y - py, best.x - px);
  }

  // 索敵：range 以内で最も近い敵（active のみ）。腕の技と構えが共用する。
  // R21W2: stagOnly=true でよろけている敵だけを探す（手動の狙いはまず獲物へ向く）
  // R21W3: pred で追加の絞り込み（予告中の敵だけ、など）。stagOnly と両立する。
  nearestEnemy(range, minDist = 0, stagOnly = false, pred = null) {
    const px = this.player.x, py = this.player.y;
    let best = null, bestD2 = range * range;
    const min2 = minDist * minDist;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (stagOnly && !e.stag) continue;
      if (pred && !pred(e)) continue;
      const dx = e.x - px, dy = e.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < min2 || d2 >= bestD2) continue;
      bestD2 = d2; best = e;
    }
    return best;
  }

  // ============ R21 Wave 2：手動の一撃（ブレイクストライク） ============
  // このゲームの合格基準は「①攻撃の爽快感 ②被弾の緊張感」の2つだけ。
  // 旧構造では仲間が画面外(最大538px)まで敵を掃除しており、敵が主人公に届く前に消えていた＝
  // 殴る機会と殴られる脅威が同時に失われていた（実測：撃破シェア主人公37.9%／HP30%未満の時間0秒）。
  // そこで「仲間と自動拳は削れるがとどめを刺せない」関門を dealDamage に置き、
  // HPが尽きた敵は「よろけ」になって漂う。この一撃だけがそれを割る＝撃破は原則100%主人公。
  // 距離では分けない（実測により空間分割は不可能と確定している）。分けるのは「とどめの権利」。

  strikeRange() {
    const S = BALANCE.hero.strike;
    return S.reach + (this.playerStage - 1) * S.reachPerStage;
  }

  // 狙う向き。マウスを使っていればカーソル方向、まだなら最寄りのよろけ→最寄り敵。
  strikeAim() {
    const px = this.player.x, py = this.player.y;
    if (this._pointerSeen && this.input.activePointer) {
      // ★毎フレーム変換する。カメラは遅延追従(0.18)なので worldX をキャッシュすると狙いがずれる。
      const w = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
      return Math.atan2(w.y - py, w.x - px);
    }
    // R21W3: 予告中の敵を最優先。爆発（quake/selfdestruct）の正解は「予告中に殴って割る」だが、
    //   キーボードだけで遊ぶとこの自動照準が唯一の向きの決め方になる。よろけ優先のままだと
    //   獲物が別方向に居るときに照準がそちらへ向き、96°の扇から外れて正解を実行できない
    //   ＝避けようのない被弾になる。マウスを使っている人はこの経路を通らない（上で return 済み）。
    //   ⚠️ 届く相手に限る。aimRange 260 はスナイパの予告距離230・タレット210より広いので、
    //   無条件に優先すると目の前の爆発を放置して届かない狙撃手へ照準が吸われる（逆に危険）。
    const reach = this.strikeRange() + BALANCE.hero.strike.lungeMax;
    const t = this.nearestEnemy(reach, 0, false, (e) => e.atkState === 'telegraph')
      || this.nearestEnemy(BALANCE.hero.aimRange, 0, true)
      || this.nearestEnemy(BALANCE.hero.aimRange);
    return t ? Math.atan2(t.y - py, t.x - px) : this._weaponAim;
  }

  // 踏み込みの距離を決めるための標的（扇の中で最も近い敵）
  strikeTarget(ang) {
    const S = BALANCE.hero.strike;
    const px = this.player.x, py = this.player.y;
    const half = Phaser.Math.DegToRad(S.arcDeg) * 0.5;
    const maxD = this.strikeRange() + S.lungeMax;
    let best = null, bestD2 = maxD * maxD;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - px, dy = e.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 >= bestD2) continue;
      if (Math.abs(this.angDiff(Math.atan2(dy, dx), ang)) > half) continue;
      bestD2 = d2; best = e;
    }
    return best;
  }

  angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  updateHeroStrike(dt) {
    const S = BALANCE.hero.strike;
    if (this._strikeT > 0) this._strikeT -= dt;
    if (this._strikeRecover > 0) this._strikeRecover -= dt;
    if (this._strikeIfr > 0) this._strikeIfr -= dt;

    // 踏み込み突進（＝加速して殴る）。速度は残り時間に比例して落ちる ease-out。
    // ピーク速度を 2L/T にすると積分が L になり、狙った距離ちょうど進む。
    if (this._lungeT > 0) {
      const k = Math.max(0, this._lungeT / S.lungeSec);
      this._lungeT -= dt;
      this.player.x += this._lungeVX * k * dt;
      this.player.y += this._lungeVY * k * dt;
    }

    if (this._strikeT > 0 || this.cinematic || this.paused || this.ended) return;
    const p = this.input.activePointer;
    const want = (p && p.isDown) || (this._jKey && this._jKey.isDown);
    if (want) this.doStrike();
  }

  doStrike() {
    const S = BALANCE.hero.strike;
    const G = BALANCE.stagger;
    const P = this.hitFeel();
    const M = BALANCE.hero.melee;
    const px = this.player.x, py = this.player.y;
    const ang = this.strikeAim();
    this._weaponAim = ang;

    // 踏み込み：標的までの距離ぶんだけ詰める（近い敵には出ず、遠い敵には出る＝1入力で射程可変）
    const tgt = this.strikeTarget(ang);
    let lunge = 0;
    if (tgt) {
      const d = Math.hypot(tgt.x - px, tgt.y - py);
      lunge = Math.max(0, Math.min(S.lungeMax, d - this.strikeRange() * 0.6));
    }
    if (lunge > 0) {
      this._lungeT = S.lungeSec;
      this._lungeVX = Math.cos(ang) * lunge * 2 / S.lungeSec;
      this._lungeVY = Math.sin(ang) * lunge * 2 / S.lungeSec;
      this._strikeIfr = S.iframeSec;
    }
    // 判定は踏み込み後の位置で、押した瞬間に確定させる（入力の遅延をゼロにするため）。
    const hx = px + Math.cos(ang) * lunge, hy = py + Math.sin(ang) * lunge;
    const R = this.strikeRange();
    const half = Phaser.Math.DegToRad(S.arcDeg) * 0.5;

    const list = [];
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - hx, dy = e.y - hy;
      const rr = R + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (Math.abs(this.angDiff(Math.atan2(dy, dx), ang)) > half) continue;
      list.push(e);
      if (list.length >= S.maxTargets) break;
    }

    this._punchAng = ang;
    this._punchT = M.punchSec;

    // ── 空振り：音も揺れも出さない。当たった時との差を作ることが目的。
    if (list.length === 0) {
      this._strikeT = S.whiffSec;
      this._strikeRecover = S.whiffRecoverSec;
      this._heat = Math.max(0, this._heat + S.heatOnWhiff);
      Sound.sfx('tick', 0, 0.7);
      return;
    }

    const heatMul = 1 + this._heat * M.heatDamageMulPerStep;
    const dmgBase = (S.damage + (this.playerStage - 1) * S.damagePerStage)
      * this.stats.heroMult * heatMul;
    let broke = 0, chain = 0, hitBoss = false, counters = 0;
    for (const e of list) {
      if (!e.active) continue;
      if (e.stag) {
        // よろけを割る＝本命。炸裂が周囲のよろけへ連鎖する（群れの中心を叩くほど得）。
        const r = this.burstStagger(e.x, e.y);
        broke += r.total; chain = Math.max(chain, r.chain);
        continue;
      }
      if (e.isBoss) {
        hitBoss = true;
        if (this.boss && this.boss.breakTelegraph && this.boss.breakTelegraph()) {
          chain = Math.max(chain, 1);
          // ブレイクはボス戦で数秒に1回しか起きない＝稀。だから大きく出してよい。
          this._breakTotal = (this._breakTotal || 0) + 1;
          this.floatText(e.x, e.y - e.radius - 10, 'ブレイク！', '#9fe8ff');
        }
      }
      // 予告中の敵に当てるとカウンター（＝敵の攻撃を止めた証明）
      let mul = 1;
      // R26: 断末魔だけはカウンターで止められない（止まると避ける体験が生まれない）。
      if (e.atkState === 'telegraph' && !e.throe) {
        mul = S.counterMul;
        counters++;
        // 実測20.4回/分。頻繁なので音とスパークだけ＝テキストも画面揺れも出さない。
        Sound.sfx('counter');
        if (this.fx && this.fx.hitSpark) this.fx.hitSpark(e.x, e.y, 0xff6ec7);
        e.atkState = 'ready';
        // R21W3: intervalSec 0（ボンバ＝1回限りの自爆）だと翌フレームに再予告してしまう。
        //   通常ボンバはカウンターの一撃(34×1.8=61)で死ぬので露見しないが、エリートボンバ(hp72)は
        //   死なずに即再予告する＝「殴れば止まる」という学習が壊れる。最低1秒は黙らせる。
        e.atkT = Math.max(1, (e.def.attack ? e.def.attack.intervalSec : 1));
        if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }
      }
      if (e.isBoss) mul *= S.bossMul;
      this.dealDamage(e, Math.max(1, Math.round(dmgBase * mul)), 0xffd23f, 'manual');
      if (e.active) {
        const d = Math.hypot(e.x - hx, e.y - hy) || 1;
        e.knockX = ((e.x - hx) / d) * S.knockback;
        e.knockY = ((e.y - hy) / d) * S.knockback;
        e.knockT = S.knockbackSec;
      }
    }

    this._chainCount = chain;
    if (counters > 0) this._counterTotal = (this._counterTotal || 0) + counters;
    this._strikeT = S.cooldownSec;
    this._strikeRecover = S.recoverSec;
    const before = this._heat;
    this._heat = Math.min(M.heatMax, this._heat + S.heatPerHit + S.heatPerChain * chain);
    if (before < M.heatMax && this._heat >= M.heatMax) Sound.sfx('heatMax');
    const heatNow = this._heat / M.heatMax;

    if (this.fx && this.fx.heroImpact) {
      this.fx.heroImpact(hx + Math.cos(ang) * R * 0.5, hy + Math.sin(ang) * R * 0.5, ang, heatNow);
    }
    // 振幅は頻度と逆相関で割り当てる（自動0／通常5／ブレイク6／連鎖3段以上7）。
    const sh = chain >= 3 ? P.chainShake : broke > 0 ? P.breakShake : P.strikeShake;
    if (sh && sh[0] > 0) this.shake(sh[1], sh[0]);
    if (!this.cinematic) {
      const stop = broke > 0 ? 0.075 : 0.05;
      this.freezeT = Math.min(BALANCE.hitFeel.freezeCapSec, Math.max(this.freezeT, stop));
    }
    if (broke > 0) {
      Sound.sfx('metalSlam');
      const pit = Math.min(BALANCE.hitFeel.chainPitchMax, 1 + BALANCE.hitFeel.chainPitchStep * chain);
      Sound.sfx('heroPunch', heatNow, pit);
    } else {
      Sound.sfx('heroPunch', heatNow, P.pitch ? this.hitfx.pitch() : 1);
    }
    if (hitBoss && this.fx && this.fx.hitSpark) this.fx.hitSpark(hx, hy, 0xffd23f);
  }

  // ============ よろけ（瀕死） ============

  // 仲間・自動拳がHPを削りきった敵はここへ来る。倒れずに漂い、主人公の一撃を待つ。
  // ⚠️ 攻撃はやめるが接触ダメージは維持し、主人公へ歩き続ける（②被弾の緊張感を下げないため）。
  // ★R25 弾の「格」。掴んだ相手で弾が別物になる（報酬の軸を貫通HPから威力・範囲へ移した）。
  //   エリートは最上位、王冠は1段上げ。それ以外は def.hp のしきい値で決まる。
  //   ⚠️ 個体の maxHp（波の倍率が乗った値）ではなく def.hp を見る。倍率は全種に等しく掛かるので、
  //      def.hp で決めれば「タレットは重い弾」という語彙が終盤でも変わらない。
  gradeIdx(e) {
    const G = BALANCE.hero.billiard.grades;
    if (!e) return 0;
    let idx = 0;
    if (e.isElite) idx = G.length - 1;
    else {
      const hp = (e.def && e.def.hp) || 0;
      for (let i = 0; i < G.length; i++) if (hp >= G[i].minHp) idx = i;
    }
    if (e.crown) idx += BALANCE.crown.gradeUp;
    return Math.max(0, Math.min(G.length - 1, idx));
  }
  grade(e) { return BALANCE.hero.billiard.grades[this.gradeIdx(e)]; }

  enterStagger(e) {
    const G = BALANCE.stagger;
    const gr = this.grade(e);
    e.stag = true;
    // ★格が上がるほど掴む猶予が短い（4.5→2.4秒）＝上を獲るなら覚悟して寄れ。
    e.stagMax = gr.stagSec || G.sec;
    e.stagT = e.stagMax;
    e.hp = 1;
    e.atkState = 'ready';
    e.atkT = 1e9;               // 予告付き攻撃は撃たない
    e.dashT = 0;
    e.throe = false;
    if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }
    this.startDeathThroe(e, gr);
    if (!e.stagRing) {
      e.stagRing = this._stagPool.pop() || this.add.image(e.x, e.y, 'w_ring').setBlendMode(ADD).setDepth(12);
      e.stagRing.setVisible(true);
    }
  }

  // ★R25 断末魔。よろけた瞬間に、その敵の攻撃を予告つきで1回だけ放つ。
  //   これが無いと「よろけさせた＝安全」で、上位の敵を安易に倒しに行っても痛くない。
  //   ⚠️ 既存の telegraph→fire 経路に乗せるだけ（新しい攻撃も新しい絵も作らない）。
  //      避ければ無傷。緊張感は被弾量ではなく「避けた回数」で作る。
  startDeathThroe(e, gr) {
    const D = BALANCE.deathThroe;
    if (!e.def || !e.def.attack) return;
    const isFuse = D.fuse && e.def.id === D.fuse.enemyId;
    if (!isFuse && !(gr && gr.throe)) return;
    if (!isFuse) {
      if (this.elapsed - (this._throeT || -99) < D.cooldownSec) return;   // 予告だらけにしない
      // ⚠️ 同時に複数出ると「1回1回を避ける」体験にならない。赤い輪は常に画面に1つだけ。
      let active = 0;
      for (const o of this.enemies) if (o.active && o.throe) active++;
      if (active >= (D.maxActive || 1)) return;
      this._throeT = this.elapsed;
    }
    e.throe = true;
    e.atkState = 'telegraph';
    e.atkT = isFuse ? D.fuse.sec : D.telegraphSec;
    // ★R26 予告のあいだは掴めない・割れない。実測で「よろけてから掴むまで 中央値0.23秒」
    //   だったため、0.5秒の予告は23回中19回が掴みで消えて**発火は9%**しかなかった。
    //   中断できなくして初めて「まず一発避けてから捕獲する」というリズムになる。
    e.guardT = isFuse ? (D.fuse.guardSec || 0) : (D.guardSec || 0);
    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.lockX = dx / d; e.lockY = dy / d;
    e.aimLocked = false;
    const A = e.def.attack;
    const tint = isFuse ? 0 : D.tint;
    // 見せる輪と当たり判定は必ず同じ式で作る（縮めるならこちらも縮める）
    const aoe = A.aoe ? Math.round(A.aoe * (D.aoeMul || 1)) : 0;
    // 爆風があるなら輪、無いなら（タレットの散弾など）撃ってくる向きの線を出す。
    // 通常の予告は散弾に何も出さないが、断末魔は「必ず1回見せる」のが目的なので必ず何かを出す。
    if (aoe) this.showBlastRing(e, aoe, tint);
    else this.showAimLine(e, A.range || 200, tint);
    Sound.sfx(isFuse ? 'tick' : 'warning', isFuse ? 0.45 : 0.85, isFuse ? 1.4 : 1.15);
    if (!isFuse) {
      Sound.sfx('metalSlam', 0.5, 0.6);
      this.floatText(e.x, e.y - e.radius - 16, D.label || 'まだ しんでない！', '#e0a0ff');
      if (this.fx && this.fx.hitSpark) this.fx.hitSpark(e.x, e.y, D.tint);
    }
  }

  // 4.5秒放置すると復帰する。強くなって戻るので「殴らないと損」になる。
  // 復帰体は二度とよろけない＝仲間が普通に倒せる（詰み防止の安全弁）。報酬はXPのみ。
  rebootEnemy(e) {
    const G = BALANCE.stagger;
    this.clearStagger(e);
    e.rebooted = true;
    e.noReward = true;
    e.hp = Math.max(1, Math.round(e.maxHp * G.rebootHpRatio));
    e.speed *= G.rebootSpeedMul;
    e.damage = Math.round(e.damage * G.rebootDamageMul);
    e.atkT = e.def.attack ? e.def.attack.intervalSec * 0.5 : 0;
  }

  // リングの破棄。撃破／復帰／プール返却／シーン終了の全経路から呼ぶ。
  clearStagger(e) {
    e.guardT = 0;
    e.throe = false;
    if (e.stagRing) {
      e.stagRing.setVisible(false);
      this._stagPool.push(e.stagRing);
      e.stagRing = null;
    }
    e.stag = false;
    e.stagT = 0;
  }

  // ★R25 王冠。近くで仲間が3体倒れた敵が怒って格上げされる。
  //   ⚠️ 当初は「一定時間生き延びたら」で設計したが、実測で雑魚の生存時間は中央値3.7秒・
  //      30秒以上は420秒で0体。自分のキル圏の内側に時間条件を置くと永久に満たされない。
  //      トリガーをキルそのものに移すと、密集へ投げ込むほど強い獲物が生まれる循環になる。
  maybeCrown(x, y) {
    const C = BALANCE.crown;
    if (!this._killLog) this._killLog = [];
    this._killLog.push({ x, y, t: this.elapsed });
    while (this._killLog.length && this.elapsed - this._killLog[0].t > 2.5) this._killLog.shift();
    if (this.elapsed < (C.fromSec || 0)) return;
    if (this.elapsed - (this._crownT || -99) < C.cooldownSec) return;
    const r2 = C.radius * C.radius;
    let near = 0;
    for (const k of this._killLog) {
      const dx = k.x - x, dy = k.y - y;
      if (dx * dx + dy * dy <= r2) near++;
    }
    if (near < C.killsNeeded) return;
    let alive = 0;
    for (const e of this.enemies) if (e.active && e.crown) alive++;
    if (alive >= C.maxAlive) return;
    // 王冠を被せる相手：巻き添えの半径内で、まだ健常な普通の雑魚。
    // ⚠️ 「一番近い個体」にすると大半がチビットに王冠が乗り、上の格に届かない
    //    （実測：ずっしりの弾が1.0回/分しか出なかった）。**一番強い個体**を選ぶ。
    //    王冠は格を1段上げるので、元が「おもい」の相手に乗って初めて「ずっしり」になる。
    let best = null, bh = -1, bd = 1e9;
    for (const e of this.enemies) {
      if (!e.active || e.isBoss || e.isElite || e.crown || e.stag || e.rebooted) continue;
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d > r2) continue;
      const hp = (e.def && e.def.hp) || 0;
      if (hp > bh || (hp === bh && d < bd)) { bh = hp; bd = d; best = e; }
    }
    if (!best) return;
    this._crownT = this.elapsed;
    this._killLog.length = 0;      // 同じ山で連続発生させない
    this.crownEnemy(best);
  }

  crownEnemy(e) {
    const C = BALANCE.crown;
    e.crown = true;
    // 削られた状態から倍率を掛けると「HP2.5倍の強敵」に見えない。全快させてから掛ける。
    e.maxHp = Math.round(e.maxHp * C.hpMul);
    e.hp = e.maxHp;
    e.damage = Math.round(e.damage * C.damageMul);
    e.speed *= C.speedMul;
    e.radius *= C.radiusMul;
    e.baseScale = (e.baseScale || 2) * C.radiusMul;
    e.atkIntervalMul = C.atkIntervalMul;
    e.spr.setScale(e.baseScale);
    e.glow.setTint(C.tint).setScale(2.6);
    if (!this._crownPool) this._crownPool = [];
    e.crownSpr = this._crownPool.pop()
      || this.add.image(0, 0, 'w_star2').setBlendMode(ADD).setDepth(12);
    e.crownSpr.setVisible(true).setTint(C.tint).setAlpha(0.95)
      .setScale(C.starScale || 1.5).setPosition(e.x, e.y);
    // ★R26 「生まれた瞬間」を作る。止める→揺らす→周りをどける→無敵で1秒立たせる。
    e.crownInv = C.birthInvulnSec || 0;
    if (!this.cinematic) this.freezeT = Math.max(this.freezeT || 0, C.birthFreeze || 0);
    this.shake(200, C.birthShake || 6);
    const pr2 = (C.pushRadius || 0) * (C.pushRadius || 0);
    for (const o of this.enemies) {
      if (!o.active || o === e || o.isBoss) continue;
      const dx = o.x - e.x, dy = o.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > pr2 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      o.knockX = (dx / d) * (C.pushPower || 300);
      o.knockY = (dy / d) * (C.pushPower || 300);
      o.knockT = 0.22;
    }
    this.spawnParticles(e.x, e.y, C.tint, 22);
    Sound.sfx('elite', 0.75, 1.3);
    Sound.sfx('heatMax', 0.6);
    this.floatText(e.x, e.y - e.radius - 18, 'おうかん！', '#ffd23f');
    if (this.fx && this.fx.announce) this.fx.announce(C.label || 'おうかん！', '#ffd23f');
    if (this.fx && this.fx.setTarget) {
      this.fx.setTarget('crown' + e.id, e.x, e.y, { color: C.tint, label: 'おうかん' });
    }
    if (this.fx && this.fx.hitSpark) this.fx.hitSpark(e.x, e.y, C.tint);
  }

  clearCrown(e) {
    e.crownInv = 0;
    if (this.fx && this.fx.clearTarget) this.fx.clearTarget('crown' + e.id);
    if (!e.crownSpr) return;
    e.crownSpr.setVisible(false);
    if (this._crownPool) this._crownPool.push(e.crownSpr);
    e.crownSpr = null;
  }

  // 炸裂連鎖。よろけを割ると周囲のよろけへ広がる＝単体より群れの中心を叩く方が得。
  // 幅優先で広げ、visited で二度処理しない。健常敵には burstDamage を通す（削りにはなる）。
  // R22: 投げの着弾だけは radius/maxChain を大きくできる（＝一発が大きいのは投げの特権）。
  burstStagger(x0, y0, radiusOver, chainOver) {
    const G = BALANCE.stagger;
    const baseR = radiusOver || G.burstRadius;
    const maxChain = chainOver || G.burstMaxChain;
    const seen = new Set();
    let frontier = [{ x: x0, y: y0 }];
    let chain = 0, total = 0;
    while (frontier.length > 0 && chain < maxChain) {
      const r = baseR * Math.pow(G.burstFalloff, chain);
      const r2 = r * r;
      const next = [];
      // 走査中に killEnemy が分裂で enemies へ push しうるので、長さを先に固定する
      const len = this.enemies.length;
      for (const pt of frontier) {
        for (let i = 0; i < len; i++) {
          const o = this.enemies[i];
          if (!o || !o.active || o.isBoss || seen.has(o.id)) continue;
          const dx = o.x - pt.x, dy = o.y - pt.y;
          if (dx * dx + dy * dy > r2) continue;
          seen.add(o.id);
          if (o.stag) {
            next.push({ x: o.x, y: o.y });
            this.spawnHitMark(o.x, o.y, G.tint);
            this.killEnemy(o, G.tint, 'manual');
            total++;
          } else {
            this.dealDamage(o, G.burstDamage, G.tint, 'manual');
          }
        }
      }
      frontier = next;
      chain++;
    }
    return { total, chain };
  }
  // R12: 主人公の主武器＝クラッシュアーム（自動近接連撃）。旧スターオーラ（0.5秒ごと4ダメージの
  // 実質的な飾り）を置き換える、突撃兵の主役。
  //
  // 設計の核は「操作を増やさずに駆け引きを作る」こと。プレイヤーにできるのは移動だけなので、
  // "どれだけ踏み込むか" がそのまま火力になるよう2軸で威力を変える：
  //   ① 至近（melee.closeDist 以内）まで踏み込むと closeMul 倍＝一番危険な距離が一番強い
  //   ② 殴り続けるとヒートが溜まって火力・音・エフェクトが上がり、離れる/被弾すると失う
  // ボスへは bossMul で半減（接近リスクには報いるが、ボス戦の設計は壊さない）。
  updateHeroMelee(dt) {
    const M = BALANCE.hero.melee;
    // ヒートは常に冷め続ける（殴るたび加算されるので、殴り続けている間だけ維持される）
    if (this._heat > 0) this._heat = Math.max(0, this._heat - M.heatDecayPerSec * dt);
    const heatN = this._heat / M.heatMax;

    const px = this.player.x, py = this.player.y;
    const R = this.meleeRange();

    // 間合いを示す熱のオーラ。ヒートが上がるほど色が金へ寄り、速く回り、明るくなる
    // （run.elapsed 基準で決定的・rng不使用・alpha は子ども安全上限を大きく下回る）。
    const beat = 1 + Math.sin(this.elapsed * 5) * (0.08 + 0.08 * heatN);
    const auraColor = heatN > 0.6 ? 0xffd23f : heatN > 0.25 ? 0xffa62b : 0xff8a1f;
    this.playerAura.setPosition(px, py)
      .setDisplaySize(R * 2 * beat, R * 2 * beat)
      .setRotation(this.elapsed * (1.5 + 3 * heatN))
      .setTint(auraColor)
      .setAlpha(0.16 + 0.18 * heatN + 0.06 * (0.5 + 0.5 * Math.sin(this.elapsed * 6)));

    this._meleeT -= dt;
    if (this._meleeT > 0) return;

    // 間合い内の敵を薙ぎ払う（巻き込みは maxTargets 体まで＝囲まれても捌けるが火力過多にはしない）
    const dmgBase = (M.damage + (this.playerStage - 1) * M.damagePerStage)
      * this.stats.heroMult * (1 + this._heat * M.heatDamageMulPerStep);
    let hits = 0;
    let killedThisSwing = false;   // R21: トドメを刺した振りだけ揺れを増す
    let bestAng = this._weaponAim, bestD2 = Infinity;
    for (const e of this.enemies) {
      if (!e.active || e.stag) continue;   // R21W2: よろけは自動の対象外（手動の獲物）
      const dx = e.x - px, dy = e.y - py;
      const d2 = dx * dx + dy * dy;
      const rr = R + e.radius;
      if (d2 > rr * rr) continue;
      // 踏み込みモーションの向きは常に最寄りの敵へ（巻き込み上限に達した後も探索は続ける）
      if (d2 < bestD2) { bestD2 = d2; bestAng = Math.atan2(dy, dx); }
      if (hits >= M.maxTargets) continue;
      hits++;
      const d = Math.sqrt(d2) || 1;
      const closeMul = d <= M.closeDist ? M.closeMul : 1;   // 密着ボーナス（中心間距離で判定）
      const dmg = Math.max(1, Math.round(dmgBase * closeMul * (e.isBoss ? M.bossMul : 1)));
      const wasAlive = e.hp;
      this.dealDamage(e, dmg, auraColor, 'hero');
      if (wasAlive - dmg <= 0) killedThisSwing = true;
      // 殴った敵を弾く（押し返せる手応え。updateEnemies が減衰させながら適用する）
      if (e.active) {
        e.knockX = (dx / d) * M.knockback;
        e.knockY = (dy / d) * M.knockback;
        e.knockT = M.knockbackSec;
      }
    }

    // 空振り（間合いに敵なし）。短い間隔で再判定して、敵が入った瞬間に殴れるようにする
    if (hits === 0) { this._meleeT = 0.06; return; }

    this._meleeT = M.intervalSec;
    const before = this._heat;
    this._heat = Math.min(M.heatMax, this._heat + M.heatPerHit);
    if (before < M.heatMax && this._heat >= M.heatMax) Sound.sfx('heatMax');   // 満タンは1回だけ

    // 踏み込みモーション＋打点のインパクト＋打撃音（ヒートで派手さと音程が上がる）
    this._punchAng = bestAng;
    this._punchT = M.punchSec;
    const heatNow = this._heat / M.heatMax;
    if (this.fx && this.fx.heroImpact) {
      this.fx.heroImpact(px + Math.cos(bestAng) * R * 0.55, py + Math.sin(bestAng) * R * 0.55,
        bestAng, heatNow);
    }
    // R21: イース風の打撃感。着手前はここに画面振動が一切なく、ヒットストップも0.03秒固定だった。
    // 強さ power は「巻き込んだ体数」と「ヒート」で決める＝踏み込んで大勢を熱く殴るほど画面が動く。
    const P = this.hitFeel();
    const power = Math.max(0, Math.min(1, 0.35 + 0.15 * (hits - 1) + 0.4 * heatNow));
    if (!this.cinematic) {
      const stop = P.stop[0] + (P.stop[1] - P.stop[0]) * power;
      this.freezeT = Math.max(this.freezeT, stop);
    }
    // R21W2: 自動は「弱い牽制」なので揺らさない（振幅は頻度と逆相関＝頻繁な事象は小さく）。
    // 手動の一撃だけが画面を動かすことで、どちらが主役かが体で分かる。
    const ash = P.autoShake || [0, 0];
    if (ash[0] > 0) {
      const mul = killedThisSwing ? BALANCE.hitFeel.killShakeMul : 1;
      this.shake(ash[1], ash[0] * (0.7 + 0.3 * power) * mul);
    }
    Sound.sfx('heroPunch', heatNow * 0.3, P.pitch ? this.hitfx.pitch() : 1);
  }

  // R12: 殴りモーション中だけ拳を前方へ突き出して描く。素早く出て、ゆっくり戻る。
  updateHeroFist(dt) {
    const M = BALANCE.hero.melee;
    // R12c: 殴っていない間も拳を前方に構えたままにする。旧実装は殴る 0.14 秒だけ表示していたので、
    // 常時表示の銃だけが目に入り「主武器が拳」だと伝わらなかった（実プレイFB「武器が銃だけ」）。
    const punching = this._punchT > 0;
    const p = punching ? 1 - Math.max(0, this._punchT / M.punchSec) : 0;   // 0→1 の進行度
    // 突き出し量。構え(0.45)を底にして、殴る瞬間だけ 1 まで伸びて戻る＝待機と打撃が別物に見える。
    const ext = punching ? Math.max(0.45, p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7) : 0.45;
    // 構え中は狙い角へ（＝敵の方へ拳を向けて構える）。殴る瞬間は殴った相手の方向で固定。
    const ang = punching ? this._punchAng : this._weaponAim;
    // R21W2: 踏み込み突進の最中は拳を伸ばし切ったまま前へ出す（＝加速して殴っている絵）。
    if (this._lungeT > 0) {
      const S = BALANCE.hero.strike;
      const k = Math.max(0, this._lungeT / S.lungeSec);
      const r = 22 + (this.playerStage - 1) * 7 + 16 * k;
      this.playerFistImg
        .setPosition(this.player.x + Math.cos(this._punchAng) * r,
                     this.player.y + Math.sin(this._punchAng) * r)
        .setRotation(this._punchAng)
        .setFlipY(false)
        .setTint(0xffd23f)
        .setAlpha(1)
        .setVisible(this.playerImg.visible);
      this.drawArm(this._punchAng, r, 0xffd23f);
      return;
    }
    // R22: ビリヤードモードでは常時構えをやめる。主武器は「掴んで投げる」であって拳ではないので、
    // 拳を出しっぱなしにする理由（R12cの「主武器が拳だと伝わらない」）がもう無い。
    // 何も持たずに立ち、殴る瞬間だけ腕ごと突き出す＝きちんと殴っている絵にする。
    if (this.billiard && this.billiard.st.mode === 1 && !punching) {
      this.playerFistImg.setVisible(false);
      this.playerArmImg.setVisible(false);
      return;
    }
    // R12b/c: 構え(ext0.45)でも拳が体の輪郭より外に出る下限を守る（埋もれると見えない）。
    // R15b: スプライト幅が段で 48→60→72px に広がる（腕のせり出し）ので、ベースも
    // 16 + 7/段 で外へ押し出す（Stage1=16 / 2=23 / 3=30 ＝ 各段の体半幅 24/30/36px の内側すれすれ
    // から突き出す）。これを忘れると構えの拳が描いた腕の中に沈む。
    const reach = 16 + (this.playerStage - 1) * 7 + (15 + (this.playerStage - 1) * 6) * ext;
    const heatN = this._heat / M.heatMax;
    // 素は白（スプライト本来のガンメタルの腕＋オレンジの拳を見せる）。熱いときだけ金へ寄せる。
    const tint = heatN > 0.6 ? 0xffd23f : heatN > 0.25 ? 0xffdcb0 : 0xffffff;
    // 構え中はわずかに上下に揺れる（静止画に見えないように・elapsed基準でrng不使用）
    const bob = punching ? 0 : Math.sin(this.elapsed * 6) * 1.2;
    this.playerFistImg
      .setPosition(this.player.x + Math.cos(ang) * reach,
                   this.player.y + Math.sin(ang) * reach + 1 + bob)
      .setRotation(ang)
      .setFlipY(Math.cos(ang) < 0)   // 左を向いたとき拳が逆さにならないよう反転
      .setTint(tint)
      .setAlpha(punching ? 0.9 + 0.1 * ext : 0.9)
      .setVisible(this.playerImg.visible);
    this.drawArm(ang, reach, tint);
  }

  // 肩から拳までを1本の帯で埋める。拳スプライトの手前(depth11)に置くので、
  // 拳の絵はそのまま見えたまま「体から生えている」ことだけが保証される。
  drawArm(ang, reach, tint) {
    const sh = 5 + (this.playerStage - 1) * 1.5;           // 肩の位置（体の中心から前へ）
    const w = Math.max(0, reach - sh);
    const th = 7 + (this.playerStage - 1) * 2;             // 腕の太さ
    this.playerArmImg
      .setPosition(this.player.x + Math.cos(ang) * sh, this.player.y + Math.sin(ang) * sh + 1)
      .setRotation(ang)
      .setDisplaySize(w, th)
      .setTint(tint === 0xffffff ? 0xc9d4e0 : tint)        // 素はガンメタル。熱いときは拳と同じ色へ
      .setAlpha(0.95)
      .setVisible(this.playerImg.visible && w > 1);
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
    disp.glow.setTint(int(def.color)).setScale(isElite ? 3 : 1.6).setAlpha(1)
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
      knockX: 0, knockY: 0, knockT: 0,   // R12: 殴られたときのノックバック（プール再利用時に必ず0へ戻す）
      squashT: 0, squashAmp: 0,          // R21: 被弾のつぶれ（プール再利用時に必ず0へ戻す）
      // R21W2: よろけ（瀕死）。spawnEnemy は毎回リテラルを作り直すのでここに書けば状態は漏れない。
      stag: false, stagT: 0, stagMax: 0, stagRing: null, rebooted: false, noReward: false,
      // R25: 王冠と断末魔。ここに書けばプール再利用でも前の個体の状態が漏れない。
      crown: false, crownSpr: null, crownInv: 0, throe: false, guardT: 0, atkIntervalMul: 1,
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
    this.clearStagger(e);   // R21W2: よろけリングの破棄（プール返却の経路）
    this.clearCrown(e);     // R25: 王冠マークの破棄（同上）
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
      let slow = e.slowMark === this.elapsed && !e.isBoss ? F.slowFactor : 1;
      // R21W2: よろけは遅くなるが止まらない。歩いて主人公の間合いへ入ってくる＝獲物が届く。
      // R22スパイク: 歩く／漂う をキー6で切り替えて体感で選ぶ（①奥行き と ②接触圧 が競合するため）。
      if (e.stag) slow *= this.billiard.driftMul();
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
        const want = e.stag ? 0 : (e.def.hoverDist || 150);   // R21W2: よろけた砲台は逃げない
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

      // R21W3: 自分中心の爆発（aoe を持つ攻撃）を予告している間は足を止める。移動処理は atkState を
      //   見ないので、ボンバは突進(speed×dashMult＝260px/s)に乗ったまま爆心ごと動いていた。同じ予告
      //   なのに「静止が正解の回」と「逃げても捕まる回」が突進の位相で決まる＝小5には学習できない。
      //   ノックバックは下で別に効かせる（押し返せるのは主人公の行動の結果なので運ではない）。
      // ただし自爆（特攻役）だけは止めない。止めると詰めの37pxを失って命中率が14%→2.9%へ落ち、
      //   ただの地雷になる。ロック方向へ「素の速度で」進ませる＝突進倍率を無視するので、
      //   どの位相で予告が始まっても詰める距離は speed×telegraphSec で必ず同じになる。
      if (e.atkState === 'telegraph' && e.def.attack && e.def.attack.aoe) {
        if (e.def.attack.type === 'selfdestruct') { vx = e.lockX * e.speed; vy = e.lockY * e.speed; }
        else { vx = 0; vy = 0; }
      }
      e.x += vx * slow * dt;
      e.y += vy * slow * dt;
      // R12: 殴られたノックバック。減衰しながら押し出される＝拳で押し返せる手応え。
      // 移動そのものは止めない（棒立ちにすると「固まった」ように見えるため）。
      if (e.knockT > 0) {
        e.knockT -= dt;
        const kf = Math.max(0, e.knockT / BALANCE.hero.melee.knockbackSec);
        e.x += e.knockX * kf * dt;
        e.y += e.knockY * kf * dt;
      }
      // ぷるぷる：生成時に消費済みの sinePhase を位相ずらしに流用する（乱数を追加消費しない）
      const bob = Math.sin(this.elapsed * X.bobHz + e.sinePhase);
      const bs = e.baseScale || 2;
      // R21: 被弾のつぶれ。殴られた瞬間だけ横に潰れて縦に縮む＝「効いている」ことが
      // 一目で分かる。白フラッシュは色が変わるだけなので、形が変わるこちらの方が強く効く。
      let sqx = 1, sqy = 1;
      if (e.squashT > 0) {
        e.squashT -= dt;
        const k = Math.max(0, e.squashT / R21_SQUASH_SEC);   // 1→0
        sqx = 1 + (e.squashAmp || 0) * k;
        sqy = 1 - (e.squashAmp || 0) * k * 0.75;
      }
      e.spr.setScale(bs * (1 + bob * X.bobAmp) * sqx, bs * (1 - bob * X.bobAmp) * sqy);
      e.spr.setRotation(bob * X.tiltAmp);
      e.spr.setPosition(e.x, e.y - (e.hopLift || 0) * 6);
      e.glow.setPosition(e.x, e.y);
      if (e.crownSpr) {
        const cs = BALANCE.crown.starScale || 1.5;
        e.crownSpr.setPosition(e.x, e.y - e.radius - 11)
          .setRotation(this.elapsed * 2.2)
          .setScale(cs * (0.92 + 0.20 * Math.sin(this.elapsed * 6)));
        if (this.fx && this.fx.moveTarget) this.fx.moveTarget('crown' + e.id, e.x, e.y);
      }
      // R26: 生まれてすぐは無敵。金の輪郭で「今は触れない／もうすぐ動く」を見せる。
      if (e.crownInv > 0) {
        e.crownInv -= dt;
        e.glow.setAlpha(0.55 + 0.45 * Math.sin(this.elapsed * 22));
        if (e.crownInv <= 0) { e.glow.setAlpha(1); this.spawnParticles(e.x, e.y, BALANCE.crown.tint, 12); }
      }

      // フラッシュ・点滅
      if (e.flashT > 0) {
        e.flashT -= dt;
        e.spr.setTint(0xffffff);
      } else if (e.stag) {
        // R21W2: よろけ＝青白。これ1色だけが「自分の獲物」の記号（覚える語彙を増やさない）。
        // 残り warnSec で橙・4Hz脈動＝期限が見える（既存の予告10Hz・チャージ16Hzより遅い）。
        const G = BALANCE.stagger;
        const warn = e.stagT <= G.warnSec && Math.sin(this.elapsed * Math.PI * 8) > 0;
        e.spr.setTint(warn ? 0xffa62b : G.tint);
      } else if (e.chargeState !== 'wind') {
        e.spr.clearTint();
      }

      // R21W2: よろけの寿命とリング。放置すると復帰する（強くなって戻る＝殴らないと損）。
      if (e.stag) {
        const G = BALANCE.stagger;
        e.stagT -= dt;
        if (e.stagRing) {
          const k = Math.max(0, e.stagT / (e.stagMax || G.sec));
          const rr = (e.radius * 2 + 14) * (0.55 + 0.75 * k);   // 時間とともに痩せる＝期限が見える
          e.stagRing.setPosition(e.x, e.y).setDisplaySize(rr, rr)
            .setTint(e.stagT <= G.warnSec ? 0xffa62b : G.tint)
            .setAlpha(G.ringAlpha * (0.45 + 0.55 * k));
        }
        // R22スパイク：時間切れの扱いをキー8で切り替える。ここは「投げが必要か」を左右する分岐。
        //   復活（現行）… 強くなって戻る＝放置の罰がある。敵は場から減らない
        //   消滅（新案）… 静かに消える＝弾を失う機会損失だけ。自動層が無償で敵を除去することになるので、
        //                 掴みだけで湧きと釣り合ってしまうと投げが「使わなくても死なない技」になる
        if (e.stagT <= 0) {
          if (this.billiard.st.expireVanish) { e.noReward = true; this.killEnemy(e, BALANCE.stagger.tint, 'expire'); }
          else this.rebootEnemy(e);
        }
      }

      // Wave R1: 予告付き攻撃（quake/divebomb/selfdestruct/lockbeam/spread）
      // R25: よろけ中は攻撃しない。ただし断末魔(e.throe)だけは進める＝「よろけ＝安全」を崩す。
      if (e.def.attack && (!e.stag || e.throe)) {
        this.updateEnemyAttack(e, dt);
        if (!e.active) continue;   // selfdestruct で自壊した個体は接触判定に進めない
      }

      // プレイヤー接触（R12: ぶつかってきた敵の位置を渡して、その反対へ押し返される）
      const rr = this.player.radius + e.radius;
      if (dist <= rr) this.hitPlayer(e.damage, e.x, e.y);
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
          e.aimLocked = false;
          if (A.type === 'lockbeam') this.showAimLine(e, A.range);
          else if (A.aoe) this.showBlastRing(e, A.aoe);   // R21W3: 爆風は大きいので範囲を先に見せる
        } else {
          e.atkT = 0.2;   // 射程外。少し待って再判定（毎フレーム判定を避ける）
        }
      }
    } else if (e.atkState === 'telegraph') {
      // 予告表現：本体を点滅（既存の被弾フラッシュと同系）
      // R26: 断末魔は紫で点滅させる＝「これは触れない。避けるやつだ」を色だけで伝える。
      if (Math.floor(this.elapsed * 10) % 2 === 0) e.spr.setTint(e.throe ? BALANCE.deathThroe.tint : 0xffffff);
      else e.spr.clearTint();
      // 断末魔の輪は脈打たせる。静止した輪は背景に溶けて「今の予告」として読まれない。
      // ⚠️ 脈動は Container（爆風の輪）だけ。照準ラインは setDisplaySize で伸ばしているので
      //    setScale を掛けると長さが1pxに潰れて消える。
      if (e.throe && e.aimLine && e.aimLine.type === 'Container') {
        e.aimLine.setScale(1 + 0.13 * Math.sin(this.elapsed * 26));
      }
      if (e.guardT > 0) e.guardT = Math.max(0, e.guardT - dt);
      // R21W3: 照準ラインは自分に追従。lateLockSec を切るまでは向きも主人公へ追い続け、
      //   本ロックの瞬間に濃くして「今きまった」を見せる（残り時間が避ける猶予になる）。
      if (e.aimLine) {
        e.aimLine.setPosition(e.x, e.y);
        if (A.type === 'lockbeam') {
          if (e.atkT > (A.lateLockSec || 0)) {
            const d2 = Math.hypot(dx, dy) || 1;
            e.lockX = dx / d2; e.lockY = dy / d2;
            e.aimLine.setRotation(Math.atan2(e.lockY, e.lockX));
          } else if (!e.aimLocked) {
            e.aimLocked = true;
            this.lockAimWithLead(e, A);
            e.aimLine.setAlpha(0.7).setRotation(Math.atan2(e.lockY, e.lockX));
          }
        }
      }
      e.atkT -= dt;
      if (e.atkT <= 0) {
        this.fireEnemyAttack(e);
        if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }
        if (e.active) {
          e.atkState = 'ready';
          // R25: 断末魔は1回だけ。撃ち終わったら二度と撃たない（よろけ中の永久砲台にしない）。
          if (e.throe) { e.throe = false; e.guardT = 0; e.atkT = 1e9; }
          else e.atkT = (A.intervalSec > 0 ? A.intervalSec : 0.2) * (e.atkIntervalMul || 1);
        }
      }
    }
  }

  // snipa の照準ライン（'white' を細長く・赤・半透明）。telegraph 終了で破棄する。
  showAimLine(e, len, tint) {
    const line = this.add.image(e.x, e.y, 'white').setOrigin(0, 0.5).setBlendMode(ADD)
      .setDepth(8).setTint(tint || 0xff3b3b).setAlpha(tint ? 0.55 : 0.35)
      .setDisplaySize(len, 2).setRotation(Math.atan2(e.lockY, e.lockX)).setPosition(e.x, e.y);
    e.aimLine = line;
  }

  // R21W3: 本ロック。弾が届くまでの時間ぶん主人公の進行方向へ先を読む。
  //   予測を全部当てると理不尽なので、ロック後に動ける距離（速度×lateLockSec）は必ず残る
  //   ＝「まっすぐ走り続けた者だけが当たる」。曲がれば外れる。
  lockAimWithLead(e, A) {
    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y) || 1;
    const t = (dist / A.bulletSpeed) * (A.leadMul == null ? 1 : A.leadMul);
    const tx = this.player.x + (this.player.vx || 0) * t;
    const ty = this.player.y + (this.player.vy || 0) * t;
    const ax = tx - e.x, ay = ty - e.y;
    const an = Math.hypot(ax, ay) || 1;
    e.lockX = ax / an; e.lockY = ay / an;
  }

  // R21W3: quake / selfdestruct の予告リング。爆心は敵の足元なので aimLine と同じ追従・後始末に乗せる
  //   （e.aimLine は lockbeam 専用フィールドで、破棄経路が4箇所すでにある。新しい漏れ道を作らない）。
  showBlastRing(e, aoe, tint) {
    // 危険な半径はダメージ条件そのもの（dist <= aoe + player.radius）。見せる物は実装と同じ式で作る。
    //   w_ring は makeRing('w_ring', 48, 5) ＝ scale 1 で外周半径 24px、glow は makeGlow('glow', 32) ＝ 16px。
    // 輪だけだと「帯が危ないのか円の中が危ないのか」が伝わらないので、内側も薄く塗る。
    //   ⚠️ 加算合成なので「輪の帯どうし」が交差すると足し算になる。輪 0.24 なら2枚重なっても 0.48、
    //   塗り(glow は中心の実効αが約0.62)は 0.08 で実効 0.05。ガレオンは周期の18.6%を予告に使うので
    //   射程内に5体いれば2枚同時は時間の約24%起きる＝交差は例外ではなく常態として見積もる。
    // 2枚を Container 1個にまとめる。e.aimLine の破棄経路が既に4箇所あるので、新しい漏れ道を作らない。
    const R = aoe + this.player.radius;
    // R26: 断末魔だけは専用色（紫）＋濃さ2倍。通常の赤い予告と混ざると「今のは何だったのか」が残らない。
    const col = tint || 0xff3b3b;
    const fill = this.add.image(0, 0, 'glow').setBlendMode(ADD).setTint(col)
      .setAlpha(tint ? 0.16 : 0.08).setScale(R / 16);
    const ring = this.add.image(0, 0, 'w_ring').setBlendMode(ADD).setTint(col)
      .setAlpha(tint ? 0.52 : 0.24).setScale(R / 24);
    e.aimLine = this.add.container(e.x, e.y, [fill, ring]).setDepth(8);
  }

  fireEnemyAttack(e) {
    const A0 = e.def.attack;
    // ★R26 断末魔は「避けられる一撃」でなければ理不尽になる。実測で回避率0%だった原因は
    //   ガレオンの爆風120が広すぎたこと（主人公は0.7秒で104pxしか動けない）。
    //   断末魔のときだけ爆風を縮める＝密着からでも歩いて出られる大きさにする。
    const D = BALANCE.deathThroe;
    const A = e.throe
      ? Object.assign({}, A0, {
          aoe: A0.aoe ? Math.round(A0.aoe * (D.aoeMul || 1)) : A0.aoe,
          damage: A0.damage ? Math.max(1, Math.round(A0.damage * (D.damageMul || 1))) : A0.damage,
        })
      : A0;
    const dx = this.player.x - e.x, dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (A.type === 'quake') {
      // 地面叩き：自分中心の衝撃波。範囲内ならダメージ＋拡大リング演出
      if (dist <= A.aoe + this.player.radius) this.hitPlayer(A.damage, e.x, e.y);
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
      if (dist <= A.aoe + this.player.radius) this.hitPlayer(A.damage, e.x, e.y);
      this.spawnParticles(e.x, e.y, e.color, 22);
      this.popFx(e.x, e.y, e.color);
      // R21W3: 自爆は「主人公が倒した」ではない。必殺ゲージ・スターコア・回復ハートは渡さない
      //   （渡すと、近づかず放置するだけで報酬が入る＝殴った者が報われる原則の裏口になる）。XPだけ出る。
      e.noReward = true;
      this.killEnemy(e, e.color, 'self');
    } else if (A.type === 'lockbeam') {
      // 狙撃：ロック方向へ速い弾を1発
      this.spawnFoeBullet(e.x, e.y, e.lockX, e.lockY, A.bulletSpeed, A.bulletRadius, A.damage, e.color, 'dart');
      Sound.sfx('shoot');
    } else if (A.type === 'spread') {
      // 扇状：プレイヤー方向を中心に count 発
      // R21W3: 弾が届くまでの時間ぶん主人公の進行方向へ先を読む（leadMul で読みの甘さを調整）。
      const lt = (dist / A.bulletSpeed) * (A.leadMul || 0);
      const base = Math.atan2(dy + (this.player.vy || 0) * lt, dx + (this.player.vx || 0) * lt);
      const step = A.spreadDeg * Math.PI / 180;
      const mid = (A.count - 1) / 2;
      for (let i = 0; i < A.count; i++) {
        const a = base + (i - mid) * step;
        this.spawnFoeBullet(e.x, e.y, Math.cos(a), Math.sin(a), A.bulletSpeed, A.bulletRadius, A.damage, e.color, 'shell');
      }
      Sound.sfx('shoot');
    }
  }

  // ============ 敵弾（Wave R1・プレイヤーへ当たる） ============
  // R18b: 「誰が撃った弾か」を形で分かるようにする。丸い foe_orb だと狙撃も砲台も同じ点にしか見えなかった。
  //   kind='dart'（狙撃＝細長い徹甲弾）/ 'shell'（砲台＝鈍く重い榴弾）。省略時は従来の丸弾。
  //   ⚠️ 見た目だけの変更で当たり判定(radius)は不変。
  // R19: 弾は役割色そのままで描く。以前は saturateC で彩度を上げ、赤いグロー(0xcc1420)を後ろに敷いていたが、
  //   役割色を画面上の全色との距離で厳密に選んだ以上、実行時に色を動かすと選定が無意味になる（ミントは
  //   ΔE11.1 ずれていた）。グローも役割色にして「どの敵の弾か」を色で一貫させる。
  spawnFoeBullet(x, y, dirX, dirY, speed, radius, dmg, color, kind) {
    const disp = this._foeBulletPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'bullet'),
    };
    const ang = Math.atan2(dirY, dirX);
    const S = FOE_BULLET_SHAPE[kind] || FOE_BULLET_SHAPE.orb;
    const k = radius / S.baseRadius;    // エリート等で radius が変わっても比率を保つ
    // 呼び出し元は e.color（spawnEnemy が int 済みの数値）を渡す。文字列 '#rrggbb' でも受けられるようにする
    const tint = typeof color === 'string' ? int(color) : color;
    disp.spr.setTexture(S.tex).setVisible(true).setDepth(11).setTint(tint)
      .setRotation(ang).setDisplaySize(S.w * k, S.h * k).setPosition(x, y);
    disp.glow.setVisible(true).setDepth(6).setTint(tint)
      .setRotation(ang).setDisplaySize(S.glowW * k, S.glowH * k).setPosition(x, y);
    this.foeBullets.push({
      active: true, x, y, vx: dirX * speed, vy: dirY * speed,
      radius, dmg, life: 3, grazed: false, spr: disp.spr, glow: disp.glow,
    });
  }

  releaseFoeBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    this._foeBulletPool.push({ spr: b.spr, glow: b.glow });
  }

  updateFoeBullets(dt) {
    const px = this.player.x, py = this.player.y;
    this._grazeCd = Math.max(0, (this._grazeCd || 0) - dt);   // R21W3: 音の渋滞よけ
    for (const b of this.foeBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; continue; }
      const rr = this.player.radius + b.radius;
      const dx = b.x - px, dy = b.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 <= rr * rr) { this.hitPlayer(b.dmg, b.x, b.y); b.active = false; continue; }
      // R21W3: グレイズ。判定+9px をすれ違った弾に1発1回だけ「ヒュッ」。避けた自覚が無いと
      //   緊張が快感に変わらない。多発するので音だけ（揺れ・数字・スパークは出さない）。
      //   ⚠️ 当たる弾も命中の直前に判定帯を通るので、「遠ざかり始めた」＝最接近を過ぎた弾に限る。
      //   そうしないと被弾のたびに「ヒュッ→ドン」と鳴って、当たった重みが薄まる。
      if (!b.grazed && this._grazeCd <= 0) {
        const g = rr + 9;
        if (d2 <= g * g && (b.vx * dx + b.vy * dy) > 0) {
          b.grazed = true; this._grazeCd = 0.12; Sound.sfx('graze');
        }
      }
    }
  }

  // R21: 第4引数 src（'hero' / 'ally' / null）を追加。当たった側の反応（つぶれ・数字・
  // 仲間の命中音と揺れ）をここに集約する。src 省略時は従来どおりの最小反応で後方互換。
  // ⚠️ 主人公の揺れ・ヒットストップ・打撃音は updateHeroMelee 側が持つ。1回の振りで最大5体に
  //    当たるので、ここで鳴らすと1発の殴りで5回揺れて5回鳴る（＝渋滞して逆に何も感じない）。
  // R21W2: src は attacker の種別。
  //   'manual' = 主人公の手動の一撃（＋必殺）／'hero' = 主人公の自動拳／'ally' = 仲間
  // ★とどめを刺せるのは manual だけ。それ以外はHPが尽きても「よろけ」にしかできない。
  dealDamage(e, dmg, color, src) {
    if (!e.active) return;
    // ボス倍率：全経路がここを通るので orbit.js を触らずに漏れなく効く。
    // 従来は仲間に倍率が無く主人公だけ半減という、方針と真逆の構造だった。
    if (e.isBoss) {
      if (src === 'ally') dmg = Math.max(1, Math.round(dmg * BALANCE.orbit.bossMul));
      else if (src === 'manual' && this.boss && this.boss.staggered) {
        dmg = Math.round(dmg * BALANCE.hero.strike.bossBreakMul);
      }
    }
    // よろけ中は仲間・自動拳が一切通らない（削りも無効＝再よろけのループを作らない）。
    // 音も数字も出さずに素通りさせる＝「仲間が引いた」ことが静けさで分かる。
    if (e.stag && src !== 'manual') return;
    // ★R26 断末魔の予告中は割れない。紫の輪が消えるまでは手が出せない＝一発避けるしかない。
    if (e.crownInv > 0) {
      if (this.fx && this.fx.hitSpark) this.fx.hitSpark(e.x, e.y, BALANCE.crown.tint);
      Sound.sfx('counter', 0.35, 1.4);
      return;
    }
    if (e.guardT > 0 && e.throe) {
      if (this.fx && this.fx.hitSpark) this.fx.hitSpark(e.x, e.y, BALANCE.deathThroe.tint);
      Sound.sfx('counter', 0.35, 0.7);
      return;
    }
    e.hp -= dmg;
    e.flashT = 0.08;
    this.spawnHitMark(e.x, e.y, color);

    const P = this.hitFeel();
    const willKill = e.hp <= 0;
    // 強さ 0..1。1発のダメージが敵の最大HPに占める割合で決める（相手にとっての重さ）。
    const power = Math.max(0, Math.min(1, dmg / Math.max(1, e.maxHp || 1)));

    if (P.squash > 0 && !e.isBoss) {
      e.squashT = R21_SQUASH_SEC;
      e.squashAmp = P.squash * (0.55 + 0.45 * power);
    }

    if (P.dmgText && this.elapsed - this._dmgTextT >= BALANCE.hitFeel.dmgTextMinSec) {
      this._dmgTextT = this.elapsed;
      this.floatText(e.x, e.y - 14, String(dmg), willKill ? '#fff2b0' : '#ffffff');
    }

    // 仲間の攻撃だけはここで音と揺れを出す（発生源が6体に散っていて集約点がないため）。
    // 素通しにすると音が渋滞するので、最も手前の1発だけに間引く。
    if (src === 'ally') {
      if (P.allySfx && this.elapsed - this._allySfxT >= BALANCE.hitFeel.allySfxMinSec) {
        this._allySfxT = this.elapsed;
        Sound.sfx('allyHit', power, P.pitch ? this.hitfx.pitch() : 1);
      }
      if (P.allyShake[0] > 0 && this.elapsed - this._allyShakeT >= BALANCE.hitFeel.allyShakeMinSec) {
        this._allyShakeT = this.elapsed;
        const mul = willKill ? BALANCE.hitFeel.killShakeMul : 1;
        this.shake(P.allyShake[1], P.allyShake[0] * mul);
      }
      if (this.fx && this.fx.hitSpark && this.elapsed - this._hitSparkT >= 0.03) {
        this._hitSparkT = this.elapsed;
        this.fx.hitSpark(e.x, e.y, color);
      }
    }

    // ★とどめの関門。ボスと復帰体だけは例外（復帰体は詰み防止の安全弁）。
    if (willKill) {
      if (src === 'manual' || e.isBoss || e.rebooted) this.killEnemy(e, color, src);
      else { e.hp = 1; this.enterStagger(e); }
    }
  }

  // R21: 現在の打撃感プリセット。ゲーム内でキー1〜4から切り替えて体感で選ぶ。
  hitFeel() {
    const list = BALANCE.hitFeel.presets;
    return list[Math.max(0, Math.min(list.length - 1, this._hitFeelIdx))];
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

  // R21W2: by は撃破の帰属。手動でよろけを割った撃破だけがXP倍になる。
  killEnemy(e, color, by) {
    if (!e.active) return;
    if (e.isBoss) { e.active = false; this.boss.onBossKilled(e); return; } // ボス撃破は専用演出へ
    const wasStag = !!e.stag;
    e.active = false;
    this.clearStagger(e);
    // 復帰体（放置して強くなって戻った敵）は報酬なし＝取りこぼしの罰。XPだけは出す。
    const rewarded = !e.noReward;
    this.kills++;
    if (rewarded) this.special.addKill();
    // シネマ中はcompactが回らないので、その場で見た目を消す（撃破の手応えを遅らせない）
    e.spr.setVisible(false);
    e.glow.setVisible(false);
    // R22スパイク：'expire'＝よろけの時間切れ消滅。無音・無報酬で静かに消す（＝取りこぼしの罰）。
    // 派手に弾けさせると「自分が倒した」と誤読され、投げのとどめが霞むため。
    const quiet = by === 'expire';
    const burst = quiet ? 3 : (e.isElite ? 20 : (8 + Math.floor(this.rng.random() * 5)));
    this.spawnParticles(e.x, e.y, e.color, burst);
    if (e.isElite && !quiet) this.shake(100, 4);
    // XPジェム（R21W2: 手動でよろけを割ると倍。殴れば報酬・放置すれば損）
    // 報酬の勾配：消滅=無報酬 ／ 掴み=基本 ／ 手動で割る・投げ撃破=倍。投げた方が得を数字で作る。
    const gemBase = e.isElite ? BALANCE.xp.eliteGemValue : BALANCE.xp.gemValue;
    // R25: 王冠持ちは見返りも大きい（リスクに見合う報酬）。格のジェル倍率を掛ける。
    const gemMul = ((by === 'manual' && wasStag) ? BALANCE.stagger.gemMul : 1)
      * ((by === 'manual' || by === 'grab') ? (this.grade(e).gemMul || 1) : 1);
    if (!quiet) this.spawnGem(e.x, e.y, gemBase * gemMul, e.isElite);
    if (rewarded) {
      this.capture.onEnemyKilled(e);   // スターコア抽選
      this.rollHealDrop(e);            // FB#1: 回復ハート抽選（run.rng を使う）
    }
    if (!quiet) this.popFx(e.x, e.y, e.color);
    // R25: 王冠。近くで仲間が倒れた敵が怒って格上げされる（密集を掃除するほど強い獲物が生まれる）。
    if (!quiet) this.maybeCrown(e.x, e.y);
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
    disp.spr.setRotation(0);
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
    // R21W2: 味方弾のリーシュ。主人公から allyMaxReach を超えたら消える。
    // 実測で仲間は最大538px（画面外）の敵まで倒しており、敵が主人公に届く前に消えていた。
    // 飛距離を決めているのは life(1.1秒)×弾速であって archetypes.SHOT.range ではない（range は索敵専用）。
    const lpx = this.player.x, lpy = this.player.y;
    const leash2 = BALANCE.orbit.allyMaxReach * BALANCE.orbit.allyMaxReach;
    for (const b of this.bullets) {
      if (!b.active) continue;
      if ((b.x - lpx) * (b.x - lpx) + (b.y - lpy) * (b.y - lpy) > leash2) { b.active = false; continue; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) { b.active = false; continue; }
      for (const e of this.enemies) {
        if (!e.active) continue;
        if (e.stag) continue;   // R21W2: よろけは素通り。当たり扱いにすると弾が消えて仲間の火力が無音で落ちる
        if (b.hit && b.hit.has(e.id)) continue;   // 貫通弾は同じ敵に二度当てない
        const rr = b.radius + e.radius;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy <= rr * rr) {
          // R21: 着弾スパークは dealDamage('ally') 側へ集約した（FB#5でここに直書きしていた
          // ぶんを移した。仲間の全攻撃で同じ反応にするため・スロットルも共通）。
          this.dealDamage(e, b.damage, b.color, 'ally');
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
      if (e.stag) continue;   // R21W2: よろけは素通り（弾と同じ扱いに揃える）
      // 点(e)と線分[A, A+dir*length]の距離
      const rx = e.x - x, ry = e.y - y;
      let t = rx * dirX + ry * dirY;
      t = Math.max(0, Math.min(length, t));
      const cx = x + dirX * t, cy = y + dirY * t;
      const dx = e.x - cx, dy = e.y - cy;
      const rr = half + e.radius;
      if (dx * dx + dy * dy <= rr * rr) this.dealDamage(e, damage, color, 'ally');
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
    // R19: 拾い物は「敵が絶対に使わない色」に置く。敵は必ずガンメタルの体＋有彩の役割色なので、
    //   小＝プラチナ（無彩色）は構造上どの敵とも被らない。大＝青紫は、狙撃のダート弾（紫紅）から
    //   離すために従来の 0xb060ff より青へ寄せた（ΔE 21.5→27.3）。拾おうとして被弾するのが最悪なので、
    //   拾い物と敵弾の距離だけは最優先で確保する。
    //   旧: 小=0x33e070（緑→砲台のミントや仲間トゲロンと同系）/ 大=0xb060ff。
    const tint = big ? 0x9558ff : 0xefeef2;
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
        this.gainGemHeal(g.value >= BALANCE.xp.eliteGemValue ? BALANCE.gemHeal.eliteCount : 1);
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

  // gem/core と同じ表示（spr＋glow）機構。ハートの形＋赤桃で「回復」を一目で伝える。
  // R19: 旧 0xff4da6 は仲間オーラゼリーの桃（#ff6ec7）と ΔE 14.7 で紛らわしかったため、赤寄りの桃へ。
  //   回復の記号としてはむしろ自然になる。グローも一緒に動かさないと分離が中途半端になる（本体だけ変えると
  //   後光が桃のまま残る）。
  spawnHeal(x, y) {
    const disp = this._heartPool.pop() || {
      glow: this.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: this.add.image(0, 0, 'heart'),
    };
    disp.spr.setTexture('heart').setVisible(true).setDepth(12)
      .setTint(0xffc2cc, 0xffc2cc, 0xff4d6d, 0xff4d6d)   // 上=白桃ハイライト / 下=赤寄りの桃
      .setScale(1.6).setPosition(x, y).setRotation(0);
    disp.glow.setVisible(true).setDepth(6).setTint(0xff8fa8).setScale(1.1).setPosition(x, y);
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

  // ジェルを拾うたびに呼ぶ。GH.every 個ぶん溜まったら回復する（余りは持ち越す＝拾い続ける動機が切れない）。
  gainGemHeal(n) {
    const GH = BALANCE.gemHeal;
    if (!GH || !(GH.every > 0)) return;
    this.gemHealCount += n;
    while (this.gemHealCount >= GH.every) {
      this.gemHealCount -= GH.every;
      const p = this.player;
      if (p.hp < p.maxHp) {
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + GH.healAmount);
        this.floatText(p.x, p.y - 28, '+' + Math.round(p.hp - before) + ' HP', '#7dff8f');
      } else {
        this.coins += GH.fullBonusCoins;   // 満タンでも無駄にしない（回復ハートと同じ扱いに揃える）
        this.floatText(p.x, p.y - 28, '+' + GH.fullBonusCoins + ' コイン', '#ffd23f');
      }
      this.spawnParticles(p.x, p.y, 0x7dff8f, 14);
      Sound.sfx('heal');
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

  // R23: スローモーション（sec 秒のあいだ、ゲーム内の時間を mul 倍で進める）。
  // ヒットストップ（freezeT）と使い分ける：止めるのは「打った瞬間」、遅くするのは「見せたい間」。
  slowMotion(sec, mul) {
    if (this.cinematic) return;           // 演出中は時間を触らない（二重に遅くすると復帰しない）
    this.slowT = Math.max(this.slowT, sec);
    this.slowMul = Math.max(0.05, Math.min(1, mul == null ? 0.2 : mul));
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
