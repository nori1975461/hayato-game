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
//     ③ 「つかんで なげろ！ かみに いどめ！」（影の薔薇窓に当たる絵で「効く」と分かる）
//     ④ 倒しても倒れても 32 種の「裁き」が返る＝もう一回の理由
//     ⑤ **モビット**＝このゲームの差別化要素。ひとりではない。暗がりの目が 1 つずつ点いて歩み出し、投げの瞬間に一緒に神へ突っ込む
//   最後に操作の一枚（カード）を置き、スキップしてもカードは必ず通る＝基礎情報が届かない経路を作らない。
//
// ★実プレイFB（2 回目）「大聖堂を全体像で出すのはやめて。出現時のドキドキ感がなくなる。影絵にするか、他のマキナにするか」
//   → **逆光の影絵**：本番と同じ rig を黒く塗り、後ろの金の光条で縁だけ読ませる。見えるのは輪郭・金の光輪・薔薇窓の単眼の 3 つ。
//     全体像は本番の降臨（暗幕→光条→着地）まで取っておく。名前は Title に書いてあるので出す。
//
// 尺は約 21 秒＋カード（ボタンを押すまで表示・自動開始なし）。SPACE／J／クリックでスキップ（カードへ）。
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
// ★2026-09-14 ユーザーFB「ひらがなばかりで読みづらい。通常漢字にする言葉は漢字に」→ ジャム版は漢字まじり（評価者は大人・Result と同じ方針）。
const CARD_LINES = [
  { k: '動く', v: '矢印キー ／ WASD' },
  { k: '掴む→溜める→投げる', v: 'J キーを押す → 押し続ける → 離す　（左クリックでも）' },
  { k: '切り札', v: 'SPACE' },
  // capture.js onEnemyKilled＝撃破したマキナがコアを落とし、拾うとモビットが仲間になる（ミニロボは除く）
  { k: 'モビット', v: '倒したマキナが落とすコアを拾うと、仲間になる' },
];
// 語り（字幕）。時刻表は文字数から組む＝文言を直しても読む時間が崩れない。
const TX = {
  gods: '金属生命体マキナには、四柱の神がいる。',
  one: 'その一柱が、いま、降りてくる。',
  name: '堕天の大聖堂',
  line: '「祈り届かぬ者へ、裁きを」',
  mobits: 'ひとりじゃない。モビットが、共に戦う。',
  concept: '掴んで投げろ！\n神に挑め！',
  judge: '倒しても、倒れても、神が君を裁く。',
};
const judgeLastText = () => `裁きは${VERDICTS.length}種類。君は、何番目？`;
// ★2026-09-14 ユーザーFB「表示が速く、消えるのも早い＝急いで読まないといけない」。旧版は打ち終わってから 0.5 秒で
//   消える行があった（四柱の神：打ち終わり 3.3 秒・消去 3.8 秒）。1文字 70→90ms、行は打ち始めから
//   「1秒4文字」（映画字幕の目安）以上かつ打ち終わってから 1.6 秒以上残す。
const CHAR_MS = 90;
const readMs = (s) => Math.max(s.length * 250, s.length * CHAR_MS + 1600);
const GODS_TEXT_DELAY = 1100, LAND_MS = 1400, NAME_HOLD = 1500, MOBIT_TEXT_DELAY = 300;
const KEY_HOLD = 1000, VERB_GAP = 1300, CONCEPT_HOLD = 2000, JUDGE_ROWS_AT = 2300, JUDGE_LAST_AT = 3900;
// 暗がりから歩み出すモビット（Title の隊列と同じ 4 体・monsters.js の id）。主人公の左後ろ→前へ並ぶ。
const MOBITS = [
  { key: 'mon_togeron', dx: -104 },
  { key: 'mon_starpuppy', dx: -70 },
  { key: 'mon_terabit', dx: -38 },
  { key: 'mon_samet', dx: 34 },
];
const SHADOW = 0x000000;   // 影絵＝tint を黒にする（形だけ残る）
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
    this.makeFogTexture();

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

  // 影絵用の黒い霧（Boot の 'glow' は中心でも 6 割しか暗くならず、輪郭が消えなかった）。128px・16 段・中心 alpha≈0.98。
  makeFogTexture() {
    if (this.textures.exists('jam_fog')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const r = 64, steps = 16;
    for (let i = steps; i >= 1; i--) { g.fillStyle(0x000000, 0.22); g.fillCircle(r, r, (r * i) / steps); }
    g.generateTexture('jam_fog', 128, 128);
    g.destroy();
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
    // ★2026-09-13 FB「説明が読み取れない。文字が速い・重なっている」→ 1文字 42→70ms・各行を読み切る間を取る・
    //   前の行は必ず消してから次を打つ（beatOne が消し忘れて 2 行が同じ y に重なっていた）。尺 16→21 秒。
    // ★2026-09-14 時刻は文字数から積み上げる（readMs）。this.plan は撮影スクリプトが読む。
    const P = this.plan = {};
    const at = (name, ms, fn) => { P[name] = ms; this.seq(ms, fn); };
    let t = 200;
    at('gods', t, () => this.beatGods());                      // 四柱の神
    t += GODS_TEXT_DELAY + readMs(TX.gods);
    at('one', t, () => this.beatOne());                        // その一柱が
    t += readMs(TX.one);
    at('descend', t, () => this.beatDescend());                // 影絵の降臨・名乗り（着地の光で翼が浮かぶ）
    P.land = t + LAND_MS;
    t += LAND_MS + 180 + NAME_HOLD + 300 + 100;                // 名乗りが消えてから次の行（同じ高さで重ねない）
    at('line', t, () => this.beatLine());                      // 大聖堂の声（腕と配線が浮かぶ）
    P.glimpseArms = t + readMs(TX.line) - 1400;
    t += readMs(TX.line) + 300;
    at('hero', t, () => this.beatHero());                      // 主人公ひとり
    at('eyes', t + 700, () => this.beatMobitEyes());           // 暗がりに目が点く
    at('mobits', t + 1600, () => this.beatMobitsIn());         // モビットが歩み出る
    t += 1600 + MOBIT_TEXT_DELAY + readMs(TX.mobits);
    at('grab', t, () => this.verbGrab());                      // J を押す → 掴む
    at('charge', t + VERB_GAP, () => this.verbCharge());       // 押し続ける → 溜める
    at('throw', t + VERB_GAP * 2, () => this.verbThrow());     // 離す → 投げる！（命中で身廊と薔薇窓が浮かぶ）
    P.hit = t + VERB_GAP * 2 + 420;
    t += VERB_GAP * 2 + 1900;
    at('concept', t, () => this.beatConcept());                // 掴んで投げろ！／神に挑め！
    t += 180 + CONCEPT_HOLD + 300 + 100;
    at('judge', t, () => this.beatJudge());                    // 裁き
    P.judgeLast = t + JUDGE_LAST_AT;
    t += JUDGE_LAST_AT + readMs(judgeLastText());
    at('card', t, () => this.showCard(false));                 // 操作カード
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
    this.typeText(this.W / 2, 208, TX.gods, PALE_S, 14, GODS_TEXT_DELAY);
  }

  // =============== 幕2 そのひとつが ===============
  beatOne() {
    if (!this.halos) return;
    this.halos.forEach((h, i) => {
      if (i === 2) return;
      this.tweens.add({ targets: [h.g, h.r], alpha: 0.12, duration: 500 });
    });
    const one = this.halos[2];
    this.clearTexts();   // 前の行と同じ y に打つので必ず消す（重なりの原因だった）
    this.sfx('bellToll', 1.0, 0.7);
    this.tweens.add({ targets: one.r, x: this.W / 2, y: 60, scale: 2.4, duration: 700, ease: 'Cubic.inOut' });
    this.tweens.add({ targets: one.g, x: this.W / 2, y: 60, scale: 4.5, alpha: 0.7, duration: 700, ease: 'Cubic.inOut' });
    this.typeText(this.W / 2, 208, TX.one, PALE_S, 14, 0);
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
      this.tweens.add({ targets: ray, alpha: 0.14, duration: 500, delay: i * 60 });
      this.tweens.add({ targets: ray, scaleX: 1.4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: i * 130 });
    }
    this.wash(GOLD, 0.25, 900);
    // 逆光の影絵。本番と同じ rig を黒く塗り、後ろの金の光条と glow で輪郭だけ読ませる。
    //   見えるのは形・金の光輪・薔薇窓の単眼だけ＝全体像は本番の降臨まで取っておく（ユーザーFB「ドキドキ感」）。
    //   着地は 1.4 秒かけて降りる（登場演出の「降りてくる」と同じ向き）。
    this.cath = this.buildShadow(cx, cy - 260, CATH_SCALE);
    this.cathHome = { x: cx, y: cy };
    this.tweens.add({ targets: this.cathAll(), y: '+=260', duration: LAND_MS, ease: 'Cubic.out' });
    this.seq(LAND_MS, () => {
      this.sfx('cathLand', 1.0);
      this.cameras.main.shake(260, 0.006);
      this.flash(0.30, GOLD);
      // 一瞬目：翼だけ（鉄羽の雨）。尖塔まで点けると体の6割が浮かび「少しだけ」を超えた（撮影で確認）
      this.glimpse(['wingL', 'wingR'], 0.75);
      // 着地で単眼が点く（生きている一点）
      this.tweens.add({ targets: this.cath.eye, alpha: 0.9, scale: 0.9, duration: 220, ease: 'Cubic.out' });
      this.tweens.add({ targets: this.cath.eyeCore, alpha: 1, duration: 160 });
      this.tweens.add({ targets: this.cath.eye, scale: 1.1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 220 });
      this.stamp(TX.name, cx, 292, GOLD_S, 30, NAME_HOLD);
    });
  }

  // 影絵。parts は黒（tint 0x000000＝形だけ）・光輪（dome）だけ金のまま・薔薇窓（rack oy −13）の位置に単眼。
  //   後ろ（D_BOSS より下）に金の逆光を置くので、黒い体は縁で読める。
  buildShadow(x, y, s) {
    const parts = [];
    // ★2026-09-13 FB「影絵の姿をもっとわかりにくく」→ 逆光を小さく弱く（10/0.7→6/0.38）＝縁が闇に溶けて形が読めない。
    //   光輪の周りだけ明るい。さらに影の上に黒い霧（fog）を掛けて体の凹凸を潰す（光輪と単眼は霧より前）。
    const glowP = this.reg(this.add.image(x, y - 16 * s, 'glow').setBlendMode(ADD).setDepth(D_BOSS - 2).setTint(GOLD).setScale(6));
    const glowM = this.reg(this.add.image(x, y - 22 * s, 'glow').setBlendMode(ADD).setDepth(D_BOSS - 1).setTint(0xffe9a0).setScale(3.2));
    glowP.setAlpha(0.38); glowM.setAlpha(0.5);
    for (const r of CATHEDRAL.rig) {
      const key = `boss_${CATHEDRAL.id}_${r.tex}`;
      if (!this.textures.exists(key)) continue;
      const o = r.origin || PART_ORIGIN[r.role] || [0.5, 0.5];
      const img = this.reg(this.add.image(x + r.ox * s, y + r.oy * s, key).setOrigin(o[0], o[1])
        .setScale(r.mirror ? -s : s, s).setDepth(D_BOSS + (PART_DEPTH[r.role] || 2)));
      img._role = r.role;
      if (r.role === 'dome') img.setAlpha(0.95).setDepth(D_BOSS + 7);   // 光輪だけ本来の金・帳より前
      else img.setTint(SHADOW).setAlpha(0.97);          // それ以外は影
      parts.push(img);
    }
    // 黒い霧（jam_fog＝中心 98%・半径の半分で 86%・縁 0 の暗がり）を体の上に掛ける。黒い体は「後ろの光条」で
    //   切り抜かれて形が読めていたので、体の周りの光条ごと霧で沈める＝残るのは光輪・単眼・翼の先の気配だけ。
    //   矩形の帳だと帳そのものの縁が四角く読めるので使わない。影と一緒に動かすので parts に入れる。
    for (const [oy, sc, al] of [[8, 2.7, 1.0], [12, 1.6, 0.9]]) {
      const fog = this.reg(this.add.image(x, y + oy * s, 'jam_fog').setScale(sc).setAlpha(al).setDepth(D_BOSS + 6.5));
      fog._role = 'fog';
      parts.push(fog);
    }
    // ★2026-09-14 ユーザーFB「影絵で、プレーヤーに少しだけ情報開示する見せ方を」→ **光の一瞬だけ、部位ごとに本当の姿が浮かぶ**。
    //   霧より前に本物の色の複製を alpha 0 で重ね、鐘・声・命中の一拍で 0.2 秒だけ点けて闇へ戻す（glimpse）。
    //   全身は一度も揃わない＝全体像は本番の降臨まで取っておく（FB「出現時のドキドキ感」）。見せる部位は本番の攻撃の予告：
    //   着地＝翼と尖塔（鉄羽の雨・尖塔の連打）／声＝腕と配線（配線の鞭＝振り香炉）／命中＝身廊と薔薇窓（薔薇窓の裁き・当てる場所）。
    const reveal = [];
    for (const r of CATHEDRAL.rig) {
      const key = `boss_${CATHEDRAL.id}_${r.tex}`;
      if (!this.textures.exists(key) || r.role === 'dome') continue;
      const o = r.origin || PART_ORIGIN[r.role] || [0.5, 0.5];
      const img = this.reg(this.add.image(x + r.ox * s, y + r.oy * s, key).setOrigin(o[0], o[1])
        .setScale(r.mirror ? -s : s, s).setDepth(D_BOSS + 7.5 + (PART_DEPTH[r.role] || 2) * 0.01).setAlpha(0));
      img._role = r.role; img._reveal = true;
      reveal.push(img);
    }
    const ey = y - 13 * s;
    const eye = this.reg(this.add.image(x, ey, 'glow').setBlendMode(ADD).setTint(0xffffff).setScale(0.3).setAlpha(0).setDepth(D_BOSS + 8));
    const eyeCore = this.reg(this.add.image(x, ey, 'spark').setTint(0xffffff).setScale(1.2).setAlpha(0).setDepth(D_BOSS + 9));
    return { parts, reveal, glowP, glowM, eye, eyeCore };
  }

  cathAll() {
    const c = this.cath;
    return c ? c.parts.concat(c.reveal, [c.glowP, c.glowM, c.eye, c.eyeCore]) : [];
  }

  // 光の一瞬：指定の部位だけ本物の色で浮かび、闇へ戻る（45ms で点き・170ms 保ち・520ms で沈む）。
  glimpse(roles, peak) {
    const c = this.cath;
    if (!c) return;
    for (const o of c.reveal) {
      if (!o.active || !roles.includes(o._role)) continue;
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: peak || 0.9, duration: 45, ease: 'Quad.out' });
      this.tweens.add({ targets: o, alpha: 0, duration: 520, delay: 215, ease: 'Cubic.in' });
    }
  }

  // =============== 幕4 大聖堂の声 ===============
  beatLine() {
    this.sfx('choirChord', 0.7, 0.9);
    this.typeText(this.W / 2, 300, TX.line, CRIMSON_S, 15, 0);
    // 声を読み終えた頃に二瞬目：腕と配線（配線の鞭＝振り香炉）。深紅の光で照らす
    this.seq(readMs(TX.line) - 1400, () => {
      this.sfx('haloCrack', 0.5, 1.1);
      this.flash(0.18, CRIMSON);
      this.glimpse(['armL', 'armR', 'legL']);
    });
  }

  // =============== 幕5 主人公ひとり ===============
  beatHero() {
    this.sfx('powerup', 0.8, 1.15);
    this.clearTexts();
    // 影は上へ寄せて、下半分を「遊びの場」にする。
    this.cathHome = { x: this.W / 2, y: 136 };
    this.tweens.add({ targets: this.cathAll(), y: '-=14', duration: 500, ease: 'Cubic.inOut' });
    this.heroX = 170; this.heroY = 266;
    this.hero = this.reg(this.add.image(-40, this.heroY, 'player_1').setScale(3.0).setDepth(D_HERO));
    this.tweens.add({ targets: this.hero, x: this.heroX, duration: 360, ease: 'Quart.out' });
    this.heroGlow = this.reg(this.add.image(this.heroX, this.heroY, 'glow').setBlendMode(ADD)
      .setTint(CYAN).setScale(1.6).setAlpha(0).setDepth(D_HERO - 1));
    this.tweens.add({ targets: this.heroGlow, alpha: 0.5, duration: 300, delay: 240 });
  }

  // =============== 幕6 モビット：暗がりに目が点く → 歩み出る ===============
  // 「ひとりじゃない」を絵の順序で語る：まず主人公だけが神の前に立ち、後ろの暗がりで目が 1 つずつ点き
  //   （音程が上がる＝数えられる）、光の中へ歩み出て隊列になる。可愛さではなく**並んで戦う種族**として出す。
  beatMobitEyes() {
    this.mobits = [];
    MOBITS.forEach((m, i) => {
      const x = this.heroX + m.dx, y = this.heroY + 6;
      const eyeL = this.reg(this.add.image(x - 4, y - 8, 'glow').setBlendMode(ADD).setTint(EMBER).setScale(0.22).setAlpha(0).setDepth(D_MOB + 1));
      const eyeR = this.reg(this.add.image(x + 4, y - 8, 'glow').setBlendMode(ADD).setTint(EMBER).setScale(0.22).setAlpha(0).setDepth(D_MOB + 1));
      const spr = this.reg(this.add.image(x, y + 10, m.key).setScale(2.0).setAlpha(0).setDepth(D_MOB));
      const glow = this.reg(this.add.image(x, y + 2, 'glow').setBlendMode(ADD).setTint(0xffb27a).setScale(1.1).setAlpha(0).setDepth(D_MOB - 1));
      this.mobits.push({ spr, glow, eyeL, eyeR, x, y });
      this.seq(i * 170, () => {
        this.sfx('tick', 0.9, 0.8 + i * 0.15);
        this.tweens.add({ targets: [eyeL, eyeR], alpha: 1, duration: 90 });
      });
    });
  }

  beatMobitsIn() {
    if (!this.mobits) return;
    this.sfx('evolve', 0.7, 1.1);
    this.mobits.forEach((m, i) => {
      this.seq(i * 110, () => {
        this.sfx('stepPlant', 0.6, 1 + i * 0.06);
        this.tweens.add({ targets: m.spr, alpha: 1, y: m.y, duration: 240, ease: 'Back.easeOut' });
        this.tweens.add({ targets: m.glow, alpha: 0.45, duration: 300 });
        this.tweens.add({ targets: [m.eyeL, m.eyeR], alpha: 0, duration: 200 });
      });
    });
    this.typeText(this.W / 2, 306, TX.mobits, PALE_S, 14, MOBIT_TEXT_DELAY);
    // 手前のマキナ1体（本番の雑魚と同じ絵）。右から歩いてくる＝掴む相手。
    this.seq(500, () => {
      this.prey = this.reg(this.add.image(560, this.heroY, 'enemy_gareon').setScale(2.4).setDepth(D_MOB));
      this.preyEye = this.reg(this.add.image(560, this.heroY - 6, 'glow').setBlendMode(ADD).setTint(0xff4d4d).setScale(0.35).setDepth(D_MOB + 1));
      this.tweens.add({ targets: [this.prey, this.preyEye], x: '-=260', duration: 650, ease: 'Sine.inOut' });
    });
  }

  // 動詞①「J を おす → つかむ」
  verbGrab() {
    this.sfx('capture', 0.9);
    this.clearTexts();   // 語りを読み終えてから手順へ（読む行と動く絵を同時に追わせない）
    if (!this.prey) return;
    this.preyEye.setVisible(false);
    this.tweens.add({ targets: this.prey, x: this.heroX + 28, y: this.heroY - 46, scale: 2.2, duration: 300, ease: 'Quart.in' });
    this.keyStamp('J', 'を押す', '掴む', CYAN_S, CYAN);
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
    this.keyStamp('J', '押し続ける', '溜める', YELLOW_S, YELLOW);
  }

  // 動詞③「はなす → なげる！」＝影の薔薇窓（単眼）へ。同じ瞬間にモビットも突っ込む＝共闘の1カット。
  verbThrow() {
    this.sfx('throwHeavy', 1.0);
    this.keyStamp('J', '離す', '投げる！', EMBER_S, EMBER);
    if (!this.prey || !this.cath) return;
    const ball = this.prey;
    const tx = this.cathHome.x, ty = this.cathHome.y - 13 * CATH_SCALE;   // 薔薇窓（rig rack: oy −13）＝単眼の位置
    // モビットは玉の少しあとに続いて影へ突っ込む。1体ごとに数字（1,2,3,4）と音程が上がる＝数えられる快感。
    //   出だしは 700ms＝「はなす → なげる！」のスタンプ（840ms で消える）と数字が重ならない。
    (this.mobits || []).forEach((m, i) => {
      this.seq(700 + i * 130, () => {
        if (!m.spr.active) return;
        const gx = tx + (i - 1.5) * 44, gy = ty + 60 + this.rnd() * 30;
        this.tweens.add({ targets: m.spr, x: gx, y: gy, duration: 220, ease: 'Quart.in' });
        this.tweens.add({ targets: m.glow, x: gx, y: gy + 2, duration: 220, ease: 'Quart.in' });
        this.seq(220, () => {
          this.sfx('crush', 1, 1 + i * 0.09);
          this.burst(gx, gy - 6, EMBER, 7, D_TEXT - 1);
          this.cameras.main.shake(90, 0.003);
          const cnt = this.reg(this.add.text(gx, gy - 22, String(i + 1), {
            fontFamily: 'monospace', fontSize: (16 + i * 4) + 'px', color: YELLOW_S, fontStyle: 'bold', stroke: '#3a2000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(D_TEXT + 1));
          this.tweens.add({ targets: cnt, y: gy - 46 - i * 3, alpha: 0, duration: 620, ease: 'Cubic.out', onComplete: () => cnt.active && cnt.destroy() });
          if (this.cath.eye.active) this.tweens.add({ targets: this.cath.eye, alpha: 0.4, duration: 60, yoyo: true });
        });
      });
    });
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
      this.glimpse(['body', 'rack', 'core']);   // 三瞬目：身廊と薔薇窓（薔薇窓の裁き・当てる場所）
      this.burst(tx, ty, CRIMSON, 12, D_TEXT - 1);
      this.burst(tx, ty, GOLD, 8, D_TEXT - 1);
      this.ripple(tx, ty, CRIMSON, D_TEXT - 2);
      // 影がのけぞり、単眼が白く灼ける（当たった、が絵で分かる。体は見せない）
      this.tweens.add({ targets: this.cathAll(), y: '-=8', duration: 90, yoyo: true, ease: 'Quad.out' });
      this.tweens.add({ targets: this.cath.eye, scale: 2.4, alpha: 1, duration: 80, yoyo: true, ease: 'Quad.out' });
      this.seq(160, () => { if (this.cath.eye.active) this.cath.eye.setTint(CRIMSON); });
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
    // ★2026-09-13 ユーザー指定の文言（「かみを、なげかえせ。」から差し替え）
    // モビットは薔薇窓の下（y≈170〜200）に集まったままなので、その帯を避けて主人公の高さに置く（前の行は消す）
    this.clearTexts();
    this.stamp(TX.concept, this.W / 2 + 12, 262, GOLD_S, 30, CONCEPT_HOLD);
  }

  // =============== 幕7 32 の裁き ===============
  beatJudge() {
    this.clearTexts();
    const fadeOut = this.cathAll().filter((o) => !o._reveal).concat([this.hero, this.heroGlow]).concat(this.rays || [])
      .concat((this.mobits || []).flatMap((m) => [m.spr, m.glow]));
    for (const o of fadeOut) if (o && o.active) this.tweens.add({ targets: o, alpha: 0.10, duration: 500 });
    this.typeText(this.W / 2, 92, TX.judge, PALE_S, 14, 0);
    SAMPLE_VERDICTS.forEach((id, i) => {
      const v = VERDICTS.find((x) => x.id === id);
      if (!v) return;
      const t = tierOf(v.rank);
      this.seq(JUDGE_ROWS_AT + i * 420, () => {
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
    this.seq(JUDGE_LAST_AT, () => this.typeText(this.W / 2, 276, judgeLastText(), GOLD_S, 16, 0));
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
    this.add.text(cx, 70, '1回2分 ・ ボスは1体 ・ 堕天の大聖堂', {
      fontFamily: 'monospace', fontSize: '13px', color: GOLD_S,
    }).setOrigin(0.5).setDepth(D_TEXT);

    // 操作。J が主役なので枠を付けて大きく。
    const panel = this.add.graphics().setDepth(D_TEXT - 1);
    panel.fillStyle(0x0d1226, 0.85); panel.fillRoundedRect(40, 92, this.W - 80, 178, 8);
    panel.lineStyle(1, 0x45588a, 0.9); panel.strokeRoundedRect(40, 92, this.W - 80, 178, 8);
    this.add.text(60, 106, '操作', { fontFamily: 'monospace', fontSize: '13px', color: '#8ea3d4' }).setOrigin(0, 0.5).setDepth(D_TEXT);
    const ys = [132, 162, 210, 244];
    CARD_LINES.forEach((l, i) => {
      const big = i === 1, mob = i === 3;
      this.add.text(60, ys[i], l.k, {
        fontFamily: 'monospace', fontSize: big ? '15px' : '14px', color: big ? CYAN_S : mob ? '#ffb27a' : '#ffffff', fontStyle: (big || mob) ? 'bold' : 'normal',
      }).setOrigin(0, 0.5).setDepth(D_TEXT);
      this.add.text(big ? 60 : 250, big ? ys[i] + 20 : ys[i], l.v, {
        fontFamily: 'monospace', fontSize: mob ? '13px' : '14px', color: big ? YELLOW_S : '#ffffff',
      }).setOrigin(0, 0.5).setDepth(D_TEXT);
    });
    // モビットの顔（カードでも「仲間」が絵で目に入る）
    MOBITS.forEach((m, i) => {
      this.add.image(172 + i * 18, ys[3], m.key).setScale(1.0).setDepth(D_TEXT);
    });
    // J のキーキャップ（絵で目に入る）
    const kx = 560, ky = 156;
    const cap = this.add.graphics().setDepth(D_TEXT);
    cap.fillStyle(0x36e0ff, 0.18); cap.fillRoundedRect(kx - 22, ky - 22, 44, 44, 6);
    cap.lineStyle(2, 0x36e0ff, 1); cap.strokeRoundedRect(kx - 22, ky - 22, 44, 44, 6);
    const capT = this.add.text(kx, ky, 'J', { fontFamily: 'monospace', fontSize: '28px', color: CYAN_S, fontStyle: 'bold' }).setOrigin(0.5).setDepth(D_TEXT + 1);
    this.tweens.add({ targets: capT, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(kx, ky + 34, '投げ返せ', { fontFamily: 'monospace', fontSize: '11px', color: CYAN_S }).setOrigin(0.5).setDepth(D_TEXT);

    this.add.text(cx, 288, `倒しても倒れても、${VERDICTS.length}種類の「裁き」が君を待つ。`, {
      fontFamily: 'monospace', fontSize: '12px', color: PALE_S,
    }).setOrigin(0.5).setDepth(D_TEXT);
    const prompt = this.add.text(cx, 316, '▶ SPACE ／ J ／ クリック で始める', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(D_TEXT);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 620, yoyo: true, repeat: -1 });
    this.add.text(cx, 342, '死んだら、そのままもう一度。ボスのHPには前回の傷跡が残る。', {
      fontFamily: 'monospace', fontSize: '11px', color: '#8a90a8',
    }).setOrigin(0.5).setDepth(D_TEXT);

    // 入力待ち（スキップと同じ押下で始めないよう 350ms 遅らせる）。
    // ★2026-09-13 実プレイFB「基本の操作の説明は読み切れない。長く映すか、ボタンを押すまで表示に」→ **押すまで表示**
    //   （自動開始なし。読む速さは人によって違うので秒数で決めない）。
    const go = () => this.startRun();
    this.time.delayedCall(350, () => {
      if (this._finished) return;
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-J', go);
      this.input.keyboard.once('keydown-ENTER', go);
      this.input.once('pointerdown', go);
    });
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
  // 1文字ずつ（CHAR_MS＝90ms。漢字まじりで1文字の情報が増えたぶん遅く・3文字ごとに打鍵音）。delay 後に打ち始める。
  typeText(x, y, str, color, size, delay) {
    this._texts = this._texts || [];
    const t = this.reg(this.add.text(x, y, '', {
      fontFamily: 'monospace', fontSize: size + 'px', color, stroke: '#0a0d12', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D_TEXT));
    this._texts.push(t);
    for (let i = 1; i <= str.length; i++) {
      this.seq(delay + i * CHAR_MS, () => {
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
      fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: 'bold', stroke: '#0a0d12', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setScale(1.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 12, duration: 300, delay: 180 + hold, onComplete: () => t.active && t.destroy() });
    return t;
  }
  // 動詞スタンプ＝キー（枠つき）＋動作＋動詞。3つとも同じ位置に順に出して「1本の手順」に見せる。
  keyStamp(key, act, verb, colorS, colorI) {
    // ★2026-09-14 y 132 だと命中の一瞬（薔薇窓が浮かぶ）に「投げる！」が重なって隠した → 語りの行だった画面下（y 304）へ。
    //   語りは verbGrab で消してあるので空いている。モビットの着地（y≈160〜190）とも離れる。
    const x = this.heroX + 150, y = this.H - 56;
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
    this.tweens.add({ targets: all, alpha: 0, duration: 220, delay: KEY_HOLD, onComplete: () => all.forEach((o) => o.active && o.destroy()) });
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
