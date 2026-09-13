// scenes/JamOpening.js — ジャム版（unity1week）専用のオープニング。Title の J キー → ここ → Run(jamRun)。
//
// ★2026-09-13 実プレイFB「オープニングを作り直して。unity1week のプレイヤーがプレイしたくなるオープニングを。
//   『J ボタン（？）でつかんで投げる』という基礎情報も忘れずに。そのほか必要と思う情報は入れてよい」。
//
// 本編の Opening.js（コールドオープン・約16秒・軌道神核の予兆）はジャム版の話ではない：
//   ジャム版はボス1体＝堕天の大聖堂だけで、1回2分、結果は「裁き」の称号で返る。初見の他人が
//   遊ぶかどうかを 10 秒で決める場なので、伝えることを 4 つに絞る。
//     ① 相手は神（金属生命体マキナの四柱の神のひとつ＝荘厳）
//     ② 遊びは 1 本＝**J を押して つかむ → 押し続けて ためる → 離して なげる**（実装：Run._jKey＝KC.J／左クリックも同じ）
//     ③ それを**神に投げ返す**（薔薇窓に当たる絵で「効く」と分かる）
//     ④ 倒しても倒れても 32 種の「裁き」が返る＝もう一回の理由
//   最後に操作の一枚（カード）を置き、スキップしてもカードは必ず通る＝基礎情報が届かない経路を作らない。
//
// 尺は約 13 秒＋カード（入力待ち・8秒で自動開始）。SPACE／J／クリックでスキップ（カードへ）。
// 技術制約は Opening.js と同じ：import Phaser 禁止（window.Phaser）・Math.random 禁止（LCG）・monospace のみ・
//   白の全画面フラッシュは alpha ≤ 0.45（子ども安全）。
// 本編は不変：この scene は Title の J からしか始まらず、autotest（?autotest=1）は Title が Run へ直行する。
import { Sound } from '../audio/sound.js';
import { CATHEDRAL } from '../data/enemies.js';
import { VERDICTS, tierOf } from '../data/verdict.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

const GOLD = 0xffd23f, GOLD_S = '#ffd23f';
const PALE_S = '#cfe0ff';
const CRIMSON = 0xff5a6a, CRIMSON_S = '#ff5a6a';
const CYAN = 0x36e0ff, CYAN_S = '#36e0ff';
const YELLOW = 0xffe066, YELLOW_S = '#ffe066';
const EMBER = 0xff5a2a, EMBER_S = '#ffb27a';
const INDIGO = 0x1f47b8;

const D_STARS = 1, D_WASH = 5, D_RAY = 20, D_BOSS = 30, D_MOB = 40, D_HERO = 44;
const D_TEXT = 60, D_BANDS = 100, D_FLASH = 110, D_SKIP = 120;

// 大聖堂の見た目は本番と同じ rig（enemies.js）から組む。depth は boss.js の PART_DEPTH と同じ順。
const PART_DEPTH = { thruster: 0, wingR: 1, wingL: 1, legL: 1, body: 2, dome: 3, rack: 3, armL: 5, armR: 5, core: 6 };
const PART_ORIGIN = { armR: [0.5, 0.12], armL: [0.5, 0.12], legL: [0.5, 0.1] };
const CATH_SCALE = 3.0;   // 本番 6.2 だと画面の高さを超える（尖塔〜配線で約 60 行）。黒帯（上下 40px）の内側に収まる大きさ＝スクショで確認。

// 操作カード。J は Run.js の `this._jKey = kb.addKey(KC.J)`（左クリックの代替）と同じ。SPACE は切り札。
const CARD_LINES = [
  { k: 'うごく', v: 'やじるしキー ／ WASD' },
  { k: 'つかむ→ためる→なげる', v: 'J キー を おす → おしつづける → はなす　（ひだりクリックでも）' },
  { k: 'きりふだ', v: 'SPACE' },
];
// 裁きの見本＝本物の一覧（verdict.js）から3つ。ここに無い id を書くと test-core が落とす。
const SAMPLE_VERDICTS = ['clear_fast', 'clear_halo', 'lost'];

export class JamOpeningScene extends Phaser.Scene {
  constructor() { super('JamOpening'); }

  create() {
    this.W = 640; this.H = 360;
    this._objs = []; this._timers = [];
    this._finished = false;   // Run へ遷移済み
    this._onCard = false;     // 操作カード表示中
    this._lcg = 0x5a17c0de;
    this.cameras.main.setBackgroundColor('#050508');

    const cx = this.W / 2;
    this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars2').setAlpha(0.35).setDepth(D_STARS));
    this.topBand = this.reg(this.add.rectangle(cx, 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));
    this.botBand = this.reg(this.add.rectangle(cx, this.H - 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));
    this.skipHint = this.reg(this.add.text(this.W - 14, this.H - 16, 'SKIP ▶ SPACE', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8a93a0',
    }).setOrigin(1, 0.5).setAlpha(0).setDepth(D_SKIP));
    this.tweens.add({ targets: this.skipHint, alpha: 0.6, duration: 400, delay: 900 });

    this.playSequence();
    // スキップ（Title の J と同じ押下で誤スキップしないよう 400ms 遅らせる）。
    this.seq(400, () => {
      const skip = () => this.showCard(true);
      this.input.keyboard.on('keydown-SPACE', skip);
      this.input.keyboard.on('keydown-J', skip);
      this.input.on('pointerdown', skip);
    });
  }

  rnd() { this._lcg = (this._lcg * 1103515245 + 12345) & 0x7fffffff; return this._lcg / 0x7fffffff; }
  reg(o) { this._objs.push(o); return o; }
  seq(ms, fn) {
    const t = this.time.delayedCall(ms, () => { if (!this._finished && !this._onCard) fn(); });
    this._timers.push(t);
    return t;
  }
  sfx(name, vol, pitch) { if (!this._finished) Sound.sfx(name, vol, pitch); }

  // =============== 時刻表（ms） ===============
  playSequence() {
    this.seq(200, () => this.beatGods());        // 四柱の神
    this.seq(2600, () => this.beatOne());        // そのひとつが
    this.seq(3400, () => this.beatDescend());    // 降臨・名乗り
    this.seq(5200, () => this.beatLine());       // 「いのりとどかぬものへ、さばきを」
    this.seq(6600, () => this.beatHero());       // 主人公とマキナ
    this.seq(7300, () => this.verbGrab());       // J を おす → つかむ
    this.seq(8200, () => this.verbCharge());     // おしつづける → ためる
    this.seq(9100, () => this.verbThrow());      // はなす → なげる！
    this.seq(10300, () => this.beatConcept());   // 「かみを、なげかえせ。」
    this.seq(11500, () => this.beatJudge());     // 32 の裁き
    this.seq(14600, () => this.showCard(false)); // 操作カード
  }

  // =============== 幕1 四柱の神 ===============
  beatGods() {
    this.sfx('bellToll', 0.8, 0.5);
    this.halos = [];
    const xs = [170, 270, 370, 470];
    xs.forEach((x, i) => {
      const g = this.reg(this.add.image(x, 118, 'glow').setBlendMode(ADD).setTint(GOLD).setScale(0).setAlpha(0.5).setDepth(D_RAY));
      const r = this.reg(this.add.image(x, 118, 'w_ring').setBlendMode(ADD).setTint(GOLD).setScale(0).setDepth(D_RAY + 1));
      this.halos.push({ g, r, x });
      this.seq(i * 260, () => {
        this.sfx('choirChord', 0.35, 1 + i * 0.12);
        this.tweens.add({ targets: r, scale: 1.3, duration: 320, ease: 'Back.easeOut' });
        this.tweens.add({ targets: g, scale: 2.2, duration: 380, ease: 'Cubic.out' });
      });
    });
    this.typeText(this.W / 2, 208, 'きんぞくせいめいたい マキナには、よはしらの かみが いる。', PALE_S, 14, 1100);
  }

  // =============== 幕2 そのひとつが ===============
  beatOne() {
    if (!this.halos) return;
    this.halos.forEach((h, i) => {
      if (i === 2) return;
      this.tweens.add({ targets: [h.g, h.r], alpha: 0.12, duration: 500 });
    });
    const one = this.halos[2];
    this.sfx('bellToll', 1.0, 0.7);
    this.tweens.add({ targets: one.r, x: this.W / 2, y: 60, scale: 2.4, duration: 700, ease: 'Cubic.inOut' });
    this.tweens.add({ targets: one.g, x: this.W / 2, y: 60, scale: 4.5, alpha: 0.7, duration: 700, ease: 'Cubic.inOut' });
    this.typeText(this.W / 2, 208, 'その ひとはしらが、いま、おりてくる。', PALE_S, 14, 0);
  }

  // =============== 幕3 降臨・名乗り ===============
  beatDescend() {
    const cx = this.W / 2, cy = 150;
    this.sfx('organRise', 1.4);
    this.clearTexts();
    if (this.halos) for (const h of this.halos) { this.tweens.add({ targets: [h.g, h.r], alpha: 0, duration: 300, onComplete: () => { h.g.destroy(); h.r.destroy(); } }); }
    // 光条（金）。本番の spawnIntroRays と同じ語彙＝到達したとき「あの光だ」と分かる。
    this.rays = [];
    for (let i = 0; i < 7; i++) {
      const rx = cx + (i - 3) * 62;
      const ray = this.reg(this.add.rectangle(rx, -40, 10 + this.rnd() * 14, 420, GOLD, 0.16 + this.rnd() * 0.12)
        .setBlendMode(ADD).setDepth(D_RAY).setOrigin(0.5, 0).setAngle((i - 3) * 4));
      ray.setAlpha(0);
      this.rays.push(ray);
      this.tweens.add({ targets: ray, alpha: 0.25, duration: 500, delay: i * 60 });
      this.tweens.add({ targets: ray, scaleX: 1.4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 130 });
    }
    this.wash(GOLD, 0.25, 900);
    // 本番と同じ rig から組む。着地は 1.4 秒かけて降りる（登場演出の「降りてくる」と同じ向き）。
    this.cath = this.buildCathedral(cx, cy - 260, CATH_SCALE);
    this.cathHome = { x: cx, y: cy };
    this.tweens.add({ targets: this.cath.parts, y: '+=260', duration: 1400, ease: 'Cubic.out' });
    this.tweens.add({ targets: [this.cath.glowP, this.cath.glowM], y: '+=260', duration: 1400, ease: 'Cubic.out' });
    this.seq(1400, () => {
      this.sfx('cathLand', 1.0);
      this.cameras.main.shake(260, 0.006);
      this.flash(0.30, GOLD);
      this.stamp('だてんの だいせいどう', cx, 292, GOLD_S, 30, 900);
    });
  }

  buildCathedral(x, y, s) {
    const parts = [];
    const glowP = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_BOSS - 2).setTint(GOLD).setScale(9));
    const glowM = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_BOSS - 1).setTint(INDIGO).setScale(5));
    glowP.setAlpha(0.55); glowM.setAlpha(0.6);
    for (const r of CATHEDRAL.rig) {
      const key = `boss_${CATHEDRAL.id}_${r.tex}`;
      if (!this.textures.exists(key)) continue;
      const o = r.origin || PART_ORIGIN[r.role] || [0.5, 0.5];
      const img = this.reg(this.add.image(x + r.ox * s, y + r.oy * s, key).setOrigin(o[0], o[1])
        .setScale(r.mirror ? -s : s, s).setDepth(D_BOSS + (PART_DEPTH[r.role] || 2)));
      img._role = r.role;
      parts.push(img);
    }
    return { parts, glowP, glowM };
  }

  // =============== 幕4 大聖堂の声 ===============
  beatLine() {
    this.sfx('choirChord', 0.7, 0.9);
    this.typeText(this.W / 2, 300, '「いのり とどかぬ ものへ、さばきを」', CRIMSON_S, 15, 0);
    this.seq(900, () => this.sfx('haloCrack', 0.5, 1.1));
  }

  // =============== 幕5 主人公とマキナ ===============
  beatHero() {
    this.sfx('powerup', 0.8, 1.15);
    this.clearTexts();
    // 大聖堂は上へ寄せて、下半分を「遊びの場」にする。
    this.cathHome = { x: this.W / 2, y: 136 };
    this.tweens.add({ targets: this.cath.parts.concat([this.cath.glowP, this.cath.glowM]), y: '-=14', duration: 500, ease: 'Cubic.inOut' });
    this.heroX = 150; this.heroY = 262;
    this.hero = this.reg(this.add.image(-40, this.heroY, 'player_1').setScale(3.0).setDepth(D_HERO));
    this.tweens.add({ targets: this.hero, x: this.heroX, duration: 360, ease: 'Quart.out' });
    this.heroGlow = this.reg(this.add.image(this.heroX, this.heroY, 'glow').setBlendMode(ADD)
      .setTint(CYAN).setScale(1.6).setAlpha(0).setDepth(D_HERO - 1));
    this.tweens.add({ targets: this.heroGlow, alpha: 0.5, duration: 300, delay: 240 });
    // 手前のマキナ1体（本番の雑魚と同じ絵）。右から歩いてくる＝掴む相手。
    this.prey = this.reg(this.add.image(520, this.heroY, 'enemy_gareon').setScale(2.4).setDepth(D_MOB));
    this.preyEye = this.reg(this.add.image(520, this.heroY - 6, 'glow').setBlendMode(ADD).setTint(0xff4d4d).setScale(0.35).setDepth(D_MOB + 1));
    this.tweens.add({ targets: [this.prey, this.preyEye], x: '-=250', duration: 650, ease: 'Sine.inOut' });
  }

  // 動詞①「J を おす → つかむ」
  verbGrab() {
    this.sfx('capture', 0.9);
    if (!this.prey) return;
    this.preyEye.setVisible(false);
    this.tweens.add({ targets: this.prey, x: this.heroX + 28, y: this.heroY - 46, scale: 2.2, duration: 300, ease: 'Quart.in' });
    this.keyStamp('J', 'を おす', 'つかむ', CYAN_S, CYAN);
    this.ripple(this.heroX + 28, this.heroY - 40, CYAN, D_HERO - 2);
  }

  // 動詞②「おしつづける → ためる」
  verbCharge() {
    this.sfx('fusionCharge', 0.9);
    if (!this.prey) return;
    this.tweens.add({ targets: this.prey, y: this.heroY - 66, scale: 2.6, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: this.prey, angle: 360, duration: 480, ease: 'Cubic.in' });
    for (let k = 0; k < 3; k++) {
      const r = this.reg(this.add.image(this.heroX + 28, this.heroY - 62, 'w_ring').setTint(YELLOW)
        .setBlendMode(ADD).setScale(2.6).setAlpha(0).setDepth(D_HERO - 2));
      this.tweens.add({ targets: r, scale: 0.5, alpha: 0.9, duration: 360, delay: k * 110,
        ease: 'Cubic.in', onComplete: () => r.active && r.destroy() });
    }
    if (this.heroGlow) this.tweens.add({ targets: this.heroGlow, scale: 2.4, alpha: 0.8, duration: 300 });
    this.keyStamp('J', 'おしつづける', 'ためる', YELLOW_S, YELLOW);
  }

  // 動詞③「はなす → なげる！」＝神の薔薇窓へ。
  verbThrow() {
    this.sfx('throwHeavy', 1.0);
    this.keyStamp('J', 'はなす', 'なげる！', EMBER_S, EMBER);
    if (!this.prey || !this.cath) return;
    const ball = this.prey;
    const tx = this.cathHome.x, ty = this.cathHome.y - 13 * CATH_SCALE + 6;   // 薔薇窓（rig rack: oy −13）
    const travel = 420;
    ball.setDepth(D_HERO + 1);
    this.tweens.add({ targets: ball, x: tx, y: ty, duration: travel, ease: 'Quad.in' });
    this.tweens.add({ targets: ball, angle: 1080, duration: travel, ease: 'Linear' });
    for (let k = 0; k < 6; k++) {
      this.seq(k * 65, () => {
        if (!ball.active) return;
        const gh = this.reg(this.add.image(ball.x, ball.y, 'glow').setTint(YELLOW).setBlendMode(ADD).setScale(1.1).setDepth(D_HERO));
        this.tweens.add({ targets: gh, alpha: 0, scale: 0.25, duration: 300, onComplete: () => gh.active && gh.destroy() });
      });
    }
    this.seq(travel, () => {
      if (ball.active) ball.destroy();
      this.sfx('glassShot', 1.0, 0.7);
      this.sfx('crushBoom', 1.0, 1.1);
      this.cameras.main.shake(220, 0.010);
      this.flash(0.28, CRIMSON);
      this.burst(tx, ty, CRIMSON, 12, D_TEXT - 1);
      this.burst(tx, ty, GOLD, 8, D_TEXT - 1);
      this.ripple(tx, ty, CRIMSON, D_TEXT - 2);
      // 巨体がのけぞる（当たった、が絵で分かる）
      const all = this.cath.parts.concat([this.cath.glowP, this.cath.glowM]);
      this.tweens.add({ targets: all, y: '-=8', duration: 90, yoyo: true, ease: 'Quad.out' });
      const rack = this.cath.parts.find((p) => p._role === 'rack');
      if (rack) this.tweens.add({ targets: rack, alpha: 0.35, duration: 60, yoyo: true, repeat: 3 });
      // 硝子片（本番の cath_glass）が薔薇窓から散る＝「効いた」が絵で残る。深紅の残光は 1.4 秒。
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * (0.15 + this.rnd() * 0.7), sp = 120 + this.rnd() * 160;
        const g = this.reg(this.add.image(tx, ty, 'cath_glass').setTint(i % 2 ? CRIMSON : INDIGO).setScale(1.6).setDepth(D_TEXT - 1).setAngle(this.rnd() * 360));
        this.tweens.add({ targets: g, x: tx + Math.cos(a) * sp * 0.7, y: ty + Math.sin(a) * sp * 0.7 + 90, angle: '+=540', alpha: 0, duration: 760, ease: 'Quad.in',
          onComplete: () => g.active && g.destroy() });
      }
      const scar = this.reg(this.add.image(tx, ty, 'glow').setBlendMode(ADD).setTint(CRIMSON).setScale(2.2).setAlpha(0.8).setDepth(D_TEXT - 2));
      this.tweens.add({ targets: scar, alpha: 0, scale: 3.2, duration: 1400, ease: 'Cubic.out', onComplete: () => scar.active && scar.destroy() });
    });
  }

  // =============== 幕6 コンセプト ===============
  beatConcept() {
    this.sfx('bellToll', 1.0, 1.0);
    this.stamp('かみを、なげかえせ。', this.W / 2, 208, GOLD_S, 30, 1000);
  }

  // =============== 幕7 32 の裁き ===============
  beatJudge() {
    this.clearTexts();
    const fadeOut = this.cath.parts.concat([this.cath.glowP, this.cath.glowM, this.hero, this.heroGlow]).concat(this.rays || []);
    for (const o of fadeOut) if (o && o.active) this.tweens.add({ targets: o, alpha: 0.10, duration: 500 });
    this.typeText(this.W / 2, 92, 'たおしても、たおれても、かみが きみを さばく。', PALE_S, 14, 0);
    SAMPLE_VERDICTS.forEach((id, i) => {
      const v = VERDICTS.find((x) => x.id === id);
      if (!v) return;
      const t = tierOf(v.rank);
      this.seq(900 + i * 420, () => {
        this.sfx('bellToll', 0.45, 1.2 + i * 0.15);
        const y = 150 + i * 34;
        const rank = this.reg(this.add.text(this.W / 2 - 150, y, `第${v.rank}位 ${t.name}`, {
          fontFamily: 'monospace', fontSize: '13px', color: t.color,
        }).setOrigin(0, 0.5).setAlpha(0).setDepth(D_TEXT));
        const title = this.reg(this.add.text(this.W / 2 - 40, y, `「${v.title}」`, {
          fontFamily: 'monospace', fontSize: '16px', color: t.color, fontStyle: 'bold',
        }).setOrigin(0, 0.5).setAlpha(0).setDepth(D_TEXT));
        this.tweens.add({ targets: [rank, title], alpha: 1, x: '+=8', duration: 260, ease: 'Cubic.out' });
        this._texts.push(rank, title);
      });
    });
    this.seq(2300, () => this.typeText(this.W / 2, 276, `さばきは ${VERDICTS.length} しゅるい。きみは、なんばんめ？`, GOLD_S, 16, 0));
  }

  // =============== 操作カード（スキップしてもここは必ず通る） ===============
  showCard(skipped) {
    if (this._finished || this._onCard) return;
    this._onCard = true;
    for (const t of this._timers) if (t) t.remove(false);
    this._timers.length = 0;
    this.tweens.killAll();
    this.cameras.main.setZoom(1);
    for (const o of this._objs) { if (o && o.destroy) o.destroy(); }
    this._objs.length = 0;
    this._texts = [];
    this.cameras.main.setBackgroundColor('#0a0a1e');
    const cx = this.W / 2;
    this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1').setAlpha(0.6).setDepth(D_STARS);
    if (!skipped) this.sfx('clear');
    else this.sfx('select');

    // 見出し：ジャム版の約束（1回2分・ボス1体）
    this.add.text(cx, 40, 'クルット・モビット', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffd76a', fontStyle: 'bold', stroke: '#2a1408', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(D_TEXT);
    this.add.text(cx, 70, '1かい 2ふん ・ ボスは 1たい ・ だてんの だいせいどう', {
      fontFamily: 'monospace', fontSize: '13px', color: GOLD_S,
    }).setOrigin(0.5).setDepth(D_TEXT);

    // 操作。J が主役なので枠を付けて大きく。
    const panel = this.add.graphics().setDepth(D_TEXT - 1);
    panel.fillStyle(0x0d1226, 0.85); panel.fillRoundedRect(40, 96, this.W - 80, 150, 8);
    panel.lineStyle(1, 0x45588a, 0.9); panel.strokeRoundedRect(40, 96, this.W - 80, 150, 8);
    this.add.text(60, 112, 'そうさ', { fontFamily: 'monospace', fontSize: '13px', color: '#8ea3d4' }).setOrigin(0, 0.5).setDepth(D_TEXT);
    const ys = [142, 178, 218];
    CARD_LINES.forEach((l, i) => {
      const big = i === 1;
      this.add.text(60, ys[i], l.k, {
        fontFamily: 'monospace', fontSize: big ? '15px' : '14px', color: big ? CYAN_S : '#ffffff', fontStyle: big ? 'bold' : 'normal',
      }).setOrigin(0, 0.5).setDepth(D_TEXT);
      this.add.text(big ? 60 : 250, big ? ys[i] + 20 : ys[i], l.v, {
        fontFamily: 'monospace', fontSize: big ? '14px' : '14px', color: big ? YELLOW_S : '#ffffff',
      }).setOrigin(0, 0.5).setDepth(D_TEXT);
    });
    // J のキーキャップ（絵で目に入る）
    const kx = 560, ky = 160;
    const cap = this.add.graphics().setDepth(D_TEXT);
    cap.fillStyle(0x36e0ff, 0.18); cap.fillRoundedRect(kx - 22, ky - 22, 44, 44, 6);
    cap.lineStyle(2, 0x36e0ff, 1); cap.strokeRoundedRect(kx - 22, ky - 22, 44, 44, 6);
    const capT = this.add.text(kx, ky, 'J', { fontFamily: 'monospace', fontSize: '28px', color: CYAN_S, fontStyle: 'bold' }).setOrigin(0.5).setDepth(D_TEXT + 1);
    this.tweens.add({ targets: capT, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(kx, ky + 34, 'なげかえせ', { fontFamily: 'monospace', fontSize: '11px', color: CYAN_S }).setOrigin(0.5).setDepth(D_TEXT);

    this.add.text(cx, 268, 'たおしても たおれても、32しゅるいの「さばき」が きみを まつ。', {
      fontFamily: 'monospace', fontSize: '12px', color: PALE_S,
    }).setOrigin(0.5).setDepth(D_TEXT);
    const prompt = this.add.text(cx, 306, '▶ SPACE ／ J ／ クリック で はじめる', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(D_TEXT);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 620, yoyo: true, repeat: -1 });
    this.add.text(cx, 334, 'しんだら、そのまま もういちど。ボスの HP には まえの きずあとが のこる。', {
      fontFamily: 'monospace', fontSize: '11px', color: '#8a90a8',
    }).setOrigin(0.5).setDepth(D_TEXT);

    // 入力待ち（スキップと同じ押下で始めないよう 350ms 遅らせる）。8 秒で自動開始＝放置しても止まらない。
    const go = () => this.startRun();
    this.time.delayedCall(350, () => {
      if (this._finished) return;
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-J', go);
      this.input.keyboard.once('keydown-ENTER', go);
      this.input.once('pointerdown', go);
    });
    this.time.delayedCall(8000, go);
  }

  startRun() {
    if (this._finished) return;
    this._finished = true;
    this.input.keyboard.removeAllListeners();
    this.input.removeAllListeners();
    this.tweens.killAll();
    this.scene.start('Run', { withAudio: true, jamRun: true });
  }

  // =============== 局所ヘルパ ===============
  // 1文字ずつ（会話と同じ 42ms・3文字ごとに打鍵音）。delay 後に打ち始める。
  typeText(x, y, str, color, size, delay) {
    this._texts = this._texts || [];
    const t = this.reg(this.add.text(x, y, '', {
      fontFamily: 'monospace', fontSize: size + 'px', color, stroke: '#0a0d12', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D_TEXT));
    this._texts.push(t);
    for (let i = 1; i <= str.length; i++) {
      this.seq(delay + i * 42, () => {
        if (!t.active) return;
        t.setText(str.slice(0, i));
        if (i % 3 === 0) this.sfx('talkTick');
      });
    }
    return t;
  }
  clearTexts() {
    for (const t of (this._texts || [])) {
      if (t && t.active) this.tweens.add({ targets: t, alpha: 0, duration: 220, onComplete: () => t.active && t.destroy() });
    }
    this._texts = [];
  }
  // 大きな一言（登場の名乗り・コンセプト）。hold ms 残してから消える。
  stamp(txt, x, y, color, size, hold) {
    const t = this.reg(this.add.text(x, y, txt, {
      fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#0a0d12', strokeThickness: 6,
    }).setOrigin(0.5).setScale(1.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 12, duration: 300, delay: 180 + hold, onComplete: () => t.active && t.destroy() });
    return t;
  }
  // 動詞スタンプ＝キー（枠つき）＋動作＋動詞。3つとも同じ位置に順に出して「1本の手順」に見せる。
  keyStamp(key, act, verb, colorS, colorI) {
    const x = this.heroX + 150, y = this.heroY - 92;
    const cap = this.reg(this.add.graphics().setDepth(D_TEXT));
    cap.fillStyle(colorI, 0.18); cap.fillRoundedRect(x - 90, y - 15, 30, 30, 5);
    cap.lineStyle(2, colorI, 1); cap.strokeRoundedRect(x - 90, y - 15, 30, 30, 5);
    const k = this.reg(this.add.text(x - 75, y, key, { fontFamily: 'monospace', fontSize: '20px', color: colorS, fontStyle: 'bold' }).setOrigin(0.5).setDepth(D_TEXT + 1));
    const a = this.reg(this.add.text(x - 54, y, act + ' →', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', stroke: '#0a0d12', strokeThickness: 4 }).setOrigin(0, 0.5).setDepth(D_TEXT));
    const v = this.reg(this.add.text(a.x + a.width + 8, y, verb, {
      fontFamily: 'monospace', fontSize: '26px', color: colorS, fontStyle: 'bold', stroke: '#0a0d12', strokeThickness: 5,
    }).setOrigin(0, 0.5).setScale(1.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: v, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    const all = [cap, k, a, v];
    this.tweens.add({ targets: all, alpha: 0, duration: 220, delay: 620, onComplete: () => all.forEach((o) => o.active && o.destroy()) });
  }
  flash(alpha, colorInt) {
    const a = Math.min(0.45, alpha);
    const f = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, colorInt != null ? colorInt : 0xffffff, a)
      .setBlendMode(ADD).setDepth(D_FLASH));
    this.tweens.add({ targets: f, alpha: 0, duration: 320, onComplete: () => f.active && f.destroy() });
  }
  wash(colorInt, peak, ms) {
    const w = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, colorInt, 0).setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: w, alpha: Math.min(0.45, peak), duration: ms * 0.35, yoyo: true, onComplete: () => w.active && w.destroy() });
  }
  burst(x, y, colorInt, n, depth) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rnd() * 0.6;
      const d = 24 + this.rnd() * 26;
      const sp = this.reg(this.add.image(x, y, 'spark').setTint(colorInt).setBlendMode(ADD).setDepth(depth));
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.3, duration: 460, ease: 'Cubic.out',
        onComplete: () => sp.active && sp.destroy() });
    }
  }
  ripple(x, y, colorInt, depth) {
    const r = this.reg(this.add.image(x, y, 'w_ring').setTint(colorInt).setBlendMode(ADD).setScale(0.4).setAlpha(0.7).setDepth(depth));
    this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 640, ease: 'Cubic.out', onComplete: () => r.active && r.destroy() });
  }
}
