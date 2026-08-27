// scenes/Opening.js — コールドオープン（Boot→Opening→Title）。
//
// ★R44 全面作り直し（2回目）。実プレイFB：
//   「オープニング見たがいまいち。**かわいさをださなくていい**。全体的に構成をがらっとかえて。
//    **主人公とモビット中心**でいこう。聖典のモビットは無視して。いま私がイメージするモビットは、
//    マオウレクスたち金属生命体（ヴォイド・マキナ）に**刈られるだけの可愛くて脆弱な存在ではない**。
//    ヴォイド・マキナと**死力を尽くして戦っている戦闘的な種族**。根はおだやかだが、いざとなれば
//    敵に立ち向かう**激しい気性**ももつ種族。」
//
// ★設定の訂正：R41 で「ヴォイド・マキナ＝どのデータにも存在しない固有名」と判断して消したが、
//   これは**私の誤り**だった。enemies.js の冒頭に「異空間ロボット軍団ヴォイド・マキナ」として
//   雑魚5種の総称が定義されている。ここでは**金属生命体の種族名**として復活させる（マオウレクスは
//   その頂点）。R41 で test-core に入れた「この語を使うな」の禁止ガードも同時に反転する。
//
// 新コンセプト「**刈られる側では、ない。**」約15.9秒・6幕。
//   幕1 侵略  … ヴォイド・マキナの軍団が奥から迫り、頂点マオウレクスが命令する
//               「セカイから ひかりを けせ。」※エンディング「せかいに ひかりが もどった」と対句
//   幕2 抗戦  … **モビットが隊列を組んで正面からぶつかる**。押され、弾かれ、倒れる。
//               ここは色を殺した逆光のシルエット＋目だけ＝「かわいい」を画面から外し、
//               戦っている事実だけを写す
//   幕3 激発  … 完全静止＋無音 → 倒れた1体が**立ち上がる** → 目が熾火に灼ける → **進化**
//               → 全員が続いて一斉突撃。「根はおだやかだが、いざとなれば激しい」を絵の順序で語る
//   幕4 共闘  … 主人公が飛び込み、動詞（つかむ→ためる→なげる）でビリヤードに薙ぐ。
//               **同じ瞬間にモビットも討つ**＝主人公とモビットが並ぶ唯一のカット
//   幕5 頂点  … 空に3つの環＝軌道神核の予兆（まだ終わっていないことだけを告げる）
//   幕6 収束  … Title の最終フレームへ座標一致で着地
//
// 「枠を越える」ための道具立て：シネスコ黒帯を最後まで残して収束で開く／カメラのズームと震え／
//   0.6秒の完全無音／**進化というゲームのシステムを物語の転換点として使う**。
//
// 技術制約: import Phaser 禁止（window.Phaser 参照）。Math.random 禁止（決定的LCGを内蔵）。
// monospace のみ。白全画面フラッシュは alpha ≤ 0.45 厳守（明るさは有色ADDウォッシュで作る）。
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

// 色（数値=tint用 / 文字=text用）
const CRIMSON = 0xe03028, CRIMSON_S = '#e03028';   // マオウレクスの色（enemies.js の color と一致）
const STEEL_S = '#e8ecf2';
const CYAN = 0x36e0ff, CYAN_S = '#36e0ff';
const YELLOW = 0xffe066, YELLOW_S = '#ffe066';
const GOLD = 0xffd23f;                              // 軌道神核の光（trueForm.glowInner 系）
const STEEL_TINT = 0x39424d;                        // ヴォイド・マキナ＝鋼のシルエット
const MOB_DARK = 0x2b3138;                          // 抗戦中のモビット＝逆光の影（可愛さを外す）
const EMBER = 0xff5a2a, EMBER_S = '#ffb27a';        // 激発した目＝怒りは赤ではなく熾火の橙
const EYE_RED = 0xff4d4d;

// 深度レイヤ
const D_STARS = 1, D_WASH = 5, D_ROBOT = 40, D_MOB = 44, D_HERO = 48;
const D_TEXT = 60, D_BANDS = 100, D_FLASH = 110, D_SKIP = 120;

// 幕1の軍団＝実物の雑魚6種（enemies.js の id と一致。ここがズレると「出てこない敵」になる）
const MOB_KEYS = ['enemy_gareon', 'enemy_chibit', 'enemy_bomba',
  'enemy_snipa', 'enemy_turret', 'enemy_magman'];
// 幕2〜4のモビット＝通常形態と**進化形態**の対（monsters.js の id / evo.id と一致）。
// 進化を幕3の転換点そのものに使うので、必ず対で持つ必要がある。
const MOBIT_LINE = [
  { base: 'mon_starpuppy', evo: 'mon_comethound' },
  { base: 'mon_togeron', evo: 'mon_togeking' },
  { base: 'mon_pikabit', evo: 'mon_thunderbit' },
  { base: 'mon_samet', evo: 'mon_megasamet' },
  { base: 'mon_neonworm', evo: 'mon_neonmoth' },
];
// Title の最終フレームと一致させるための隊列パラメータ。
// ★R44W2 で Title の公転（連れて回るマスコットの絵）を隊列へ変えたので、こちらも合わせる。
//   ここがズレると Opening→Title の切り替わりで相棒だけが跳ぶ（R41 で自機が跳ねていた事故と同じ）。
const TITLE_SQUAD = { keys: ['mon_togeron', 'mon_starpuppy', 'mon_pikabit', 'mon_samet'],
  xs: [-122, -64, 64, 122], y: 248, scale: 2.0 };

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super('Opening');
  }

  create() {
    // autotest はオープニングをスキップして即 Title（既存テスト/CDPへ無影響）。
    const V = window.VORTEX || {};
    if (V.autotest) { this.scene.start('Title'); return; }

    this.W = 640;
    this.H = 360;
    this._objs = [];          // 破棄対象の GameObject を貯める
    this._timers = [];        // delayedCall ハンドル
    this._begun = false;      // playSequence 起動済みフラグ（多重防止）
    this._finished = false;   // Title 遷移済みフラグ（二重発火ガード）
    this._lcg = 0x1234abcd;   // 決定的擬似乱数の状態（Math.random 禁止）
    this._robotsCold = false; // update で軍団の明滅/ジッターを回すか
    this._mobitsIdle = false; // update でモビットを呼吸させるか
    this._coreActive = false; // update で軌道神核の環を回すか
    this._killCount = 0;      // ビリヤードで薙いだ数（数えられることが快感）
    this.robots = [];
    this.mobits = [];

    this.cameras.main.setBackgroundColor('#050508');
    this.buildColdOpen();
  }

  // --- 決定的擬似乱数 0..1（Math.random 禁止・LCG） ---
  rnd() {
    this._lcg = (this._lcg * 1103515245 + 12345) & 0x7fffffff;
    return this._lcg / 0x7fffffff;
  }

  reg(o) { this._objs.push(o); return o; }

  // finished なら走らせないガード付き delayedCall。全ビート・全効果音の予約に使う。
  seq(ms, fn) {
    const t = this.time.delayedCall(ms, () => { if (!this._finished) fn(); });
    this._timers.push(t);
    return t;
  }

  sfx(name, vol, pitch) { if (!this._finished) Sound.sfx(name, vol, pitch); }

  // =============== ビート 0.0: コールドオープン（音声解錠ゲート） ===============
  buildColdOpen() {
    const cx = this.W / 2;
    // 上下シネスコ黒帯（各40px）。R44 は**最後まで開かない**＝ずっと映画の画角で見せ、
    // 収束のときだけ開いて「ゲームに戻る」合図にする。
    this.topBand = this.reg(this.add.rectangle(cx, 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));
    this.botBand = this.reg(this.add.rectangle(cx, this.H - 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));

    // 中央の縦の亀裂1本＝深紅（これから現れるのはヴォイド・マキナ）。
    this.crackGlow = this.reg(this.add.image(cx, 180, 'glow').setBlendMode(ADD)
      .setTint(CRIMSON).setScale(0.16, 8).setDepth(D_ROBOT));
    this.crack = this.reg(this.add.rectangle(cx, 180, 2, 190, CRIMSON, 0.9)
      .setBlendMode(ADD).setDepth(D_ROBOT));
    this._crackPulse = this.tweens.add({
      targets: [this.crack, this.crackGlow],
      alpha: { from: 0.7, to: 1 }, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // 右下の音声解錠プロンプト（点滅）。押下前は尺に含めず待機。
    this.gate = this.reg(this.add.text(this.W - 14, this.H - 16, '▶ SPACE ／ クリック', {
      fontFamily: 'monospace', fontSize: '13px', color: CYAN_S,
    }).setOrigin(1, 0.5).setDepth(D_SKIP));
    this.tweens.add({ targets: this.gate, alpha: 0.25, duration: 620, yoyo: true, repeat: -1 });

    // 初回押下＝コールドオープン解錠（尺 t0 の起点）。
    const begin = () => this.begin();
    this.input.keyboard.once('keydown-SPACE', begin);
    this.input.once('pointerdown', begin);
  }

  begin() {
    if (this._begun || this._finished) return;
    this._begun = true;
    Sound.init(); // ctx 生成＋resume（ユーザー操作後）
    if (this.gate) {
      this.tweens.killTweensOf(this.gate);
      this.tweens.add({ targets: this.gate, alpha: 0, duration: 200 });
    }
    if (this._crackPulse) this._crackPulse.stop();
    this.playSequence();
    // スキップリスナは起動後に登録（開始トリガと同一イベントで誤スキップしないよう50ms遅らせる）。
    this.seq(50, () => {
      this.input.keyboard.once('keydown-SPACE', () => this.skip());
      this.input.once('pointerdown', () => this.skip());
    });
    this.seq(1500, () => {
      this.skipHint = this.reg(this.add.text(this.W - 14, this.H - 16, 'SKIP ▶', {
        fontFamily: 'monospace', fontSize: '12px', color: '#8a93a0',
      }).setOrigin(1, 0.5).setAlpha(0).setDepth(D_SKIP));
      this.tweens.add({ targets: this.skipHint, alpha: 0.5, duration: 300 });
    });
  }

  skip() { this._goTitle(); }

  // =============== 全ビートのタイムライン予約（押下 t0 からの相対ms） ===============
  playSequence() {
    // 幕1 侵略：まず「刈る側」を見せる
    this.seq(600, () => this.beatSwarm());
    this.seq(1500, () => this.beatSpecies());
    this.seq(2400, () => this.beatOverlord());
    this.seq(3200, () => this.beatCommand());

    // 幕2 抗戦：モビットが正面からぶつかる（色を殺したシルエット）
    this.seq(4400, () => this.beatMobitLine());
    this.seq(5300, () => this.beatClash());
    this.seq(6200, () => this.beatFall());

    // 幕3 激発：静止と無音 → 立ち上がる → 進化 → 一斉突撃
    this.seq(7000, () => this.beatSilence());
    this.seq(7600, () => this.beatRise());
    this.seq(8400, () => this.beatAwaken());
    this.seq(9300, () => this.beatDeclare());
    this.seq(9800, () => this.beatCharge());

    // 幕4 共闘：主人公と動詞。モビットは同じ画面で戦い続ける
    this.seq(10500, () => this.beatHero());
    this.seq(11000, () => this.verbGrab());
    this.seq(11500, () => this.verbCharge());
    this.seq(12000, () => this.verbThrow());

    // 幕5 頂点：軌道神核の予兆（実測で1.2秒しか映っていなかったので1.5秒へ）
    this.seq(12900, () => this.beatCorePremonition());

    // 幕6 収束
    this.seq(14400, () => this.beatConverge());
    this.seq(16000, () => this._goTitle());

    // 侵略中の低ランブル＋機械の刻み（幕1のあいだだけ）
    this.seq(600, () => this.sfx('voidHum'));
    this.seq(2400, () => this.sfx('voidHum'));
    for (let i = 0; i < 8; i++) this.seq(700 + i * 210, () => this.sfx('tick', 0.5));
  }

  // =============== 幕1 侵略 ===============
  // 軍団は「行進」ではなく**こちらへ迫る**（奥の小さい列から手前の大きい列へ）。
  // 刈る側であることを、説明ではなく遠近と大きさで示す。
  beatSwarm() {
    this.sfx('warning', 0.5, 0.7);
    if (this.crack) {
      const c = [this.crack, this.crackGlow];
      this.tweens.add({ targets: c, alpha: 0, duration: 300,
        onComplete: () => c.forEach((o) => o.active && o.destroy()) });
      this.crack = null;
    }
    // 手前の列は6体。ここが幕4で玉の通る一列になるので、**掴んだ1体を除いて5体薙げる**
    // 数を確保する（実測で前列4体だと数字が3で止まり「数えられる」手応えが立たなかった）。
    const rows = [
      { y: 118, n: 6, sc: 1.4, a: 0.45 },
      { y: 156, n: 5, sc: 2.0, a: 0.75 },
      { y: 200, n: 6, sc: 2.6, a: 1.0 },
    ];
    for (const row of rows) {
      for (let i = 0; i < row.n; i++) {
        const key = MOB_KEYS[(i + row.n) % MOB_KEYS.length];
        const x = (this.W / (row.n + 1)) * (i + 1) + (this.rnd() - 0.5) * 16;
        const spr = this.reg(this.add.image(x, row.y + 26, key)
          .setScale(row.sc).setTint(STEEL_TINT).setAlpha(0).setDepth(D_ROBOT));
        const eye = this.reg(this.add.image(x, row.y + 26 - row.sc * 3, 'glow')
          .setTint(EYE_RED).setBlendMode(ADD).setScale(row.sc * 0.26).setAlpha(0).setDepth(D_ROBOT + 1));
        this.tweens.add({ targets: [spr, eye], y: '-=26', alpha: row.a,
          duration: 620, delay: i * 55, ease: 'Cubic.out' });
        this.robots.push({ spr, eye, baseX: x, baseY: row.y, alive: true });
      }
    }
    this._robotsCold = true;
    this.cameras.main.zoomTo(1.05, 2600);
  }

  // 種族名。説明ではなく**宣告**なので、字は小さく、赤く、1行だけ。
  beatSpecies() {
    this.sfx('metalSlam', 0.5, 1.2);
    const t = this.reg(this.add.text(this.W / 2, 92, 'きんぞくせいめいたい　ヴォイド・マキナ', {
      fontFamily: 'monospace', fontSize: '15px', color: CRIMSON_S, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, alpha: 1, duration: 260 });
    this.tweens.add({ targets: t, alpha: 0, duration: 300, delay: 1300,
      onComplete: () => t.active && t.destroy() });
  }

  // その頂点＝マオウレクス。実物のスプライトは出さず、**上から降りる影と双眸**だけで示す。
  beatOverlord() {
    this.sfx('elite', 0.8);
    this.sfx('metalSlam', 0.7, 0.6);
    const cx = this.W / 2;
    this.overlordGlow = this.reg(this.add.image(cx, 40, 'glow').setBlendMode(ADD)
      .setTint(CRIMSON).setScale(7, 3.4).setAlpha(0).setDepth(D_ROBOT - 2));
    this.tweens.add({ targets: this.overlordGlow, alpha: 0.6, y: 110, duration: 620, ease: 'Cubic.out' });
    this.overlordEyes = [-38, 38].map((dx) => this.reg(this.add.image(cx + dx, 104, 'glow')
      .setTint(CRIMSON).setBlendMode(ADD).setScale(0).setDepth(D_ROBOT + 2)));
    this.tweens.add({ targets: this.overlordEyes, scaleX: 0.62, scaleY: 0.22,
      duration: 380, delay: 220, ease: 'Cubic.out' });

    const nm = this.reg(this.add.text(cx, 148, 'マオウレクス', {
      fontFamily: 'monospace', fontSize: '32px', color: STEEL_S, fontStyle: 'bold',
      stroke: '#3a0509', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setScale(1.4).setDepth(D_TEXT));
    this.tweens.add({ targets: nm, alpha: 1, scale: 1, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: nm, alpha: 0, duration: 260, delay: 1000,
      onComplete: () => nm.active && nm.destroy() });
    this.cameras.main.shake(260, 0.005);
  }

  // 命令。エンディング「せかいに ひかりが もどった」と対になる一文（物語の環）。
  beatCommand() {
    const cx = this.W / 2;
    // ★R44W2「言葉の末尾の。ははずして。表記上おかしい」＝このゲームの表記は
    //   ひらがな＋分かち書きで句点を使わない。命令も宣言も句点なしで置く。
    const words = ['セカイから', 'ひかりを', 'けせ'];
    // 語の幅から並びを組む（句点を外して最後の語が2文字になったので、固定座標だと右へ寄る）。
    const CH = 14.4, GAP = 26;             // monospace 24px の1文字送りの近似
    const ws = words.map((s) => s.length * CH);
    const total = ws.reduce((a, b) => a + b, 0) + GAP * (words.length - 1);
    let acc = cx - total / 2;
    const xs = ws.map((w) => { const c = acc + w / 2; acc += w + GAP; return c; });
    this.cmdTexts = [];
    words.forEach((w, i) => {
      this.seq(i * 300, () => {
        this.sfx('metalSlam', 0.42, 1.05 - i * 0.14);
        const t = this.reg(this.add.text(cx, 196, w, {
          fontFamily: 'monospace', fontSize: '24px', color: STEEL_S, fontStyle: 'bold',
          stroke: '#0a0d12', strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setScale(1.7).setDepth(D_TEXT));
        this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 180, ease: 'Cubic.out' });
        this.cmdTexts.push(t);
        // 語が出るたび、既出の語を最終位置へ寄せる＝3語そろうと1行の命令になる
        this.cmdTexts.forEach((tt, k) => {
          if (!tt.active) return;
          this.tweens.add({ targets: tt, x: xs[k], duration: 220, delay: 120, ease: 'Cubic.out' });
        });
      });
    });
    this.seq(1500, () => {
      for (const tt of this.cmdTexts || []) {
        if (!tt.active) continue;
        this.tweens.add({ targets: tt, alpha: 0, duration: 300,
          onComplete: () => tt.active && tt.destroy() });
      }
    });
  }

  // =============== 幕2 抗戦 ===============
  // ★ここが R44 の核心。モビットは刈られるだけの存在ではなく、**正面からぶつかっている**。
  //   かわいさを画面から外す手段は3つ：色を落とした逆光のシルエット／光るのは目だけ／
  //   イージングを鋭く（Bounce や Back の弾みを使わない）。
  beatMobitLine() {
    this.sfx('rush', 0.7, 0.85);
    const y = 244;
    MOBIT_LINE.forEach((m, i) => {
      const x = 88 + i * 116;
      const spr = this.reg(this.add.image(x, this.H + 40, m.base)
        .setScale(2.6).setTint(MOB_DARK).setDepth(D_MOB));
      const eye = this.reg(this.add.image(x, y - 8, 'glow').setTint(CYAN)
        .setBlendMode(ADD).setScale(0.22).setAlpha(0).setDepth(D_MOB + 1));
      this.tweens.add({ targets: spr, y, duration: 340, delay: i * 60, ease: 'Quart.out' });
      this.tweens.add({ targets: eye, alpha: 0.9, duration: 220, delay: i * 60 + 180 });
      this.mobits.push({ spr, eye, def: m, x, y, down: false, evolved: false });
    });
    this._mobitsIdle = true;
    const t = this.reg(this.add.text(this.W / 2, 92, 'モビット', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9aa6b2', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, alpha: 1, duration: 240 });
    this.tweens.add({ targets: t, alpha: 0, duration: 260, delay: 900,
      onComplete: () => t.active && t.destroy() });
  }

  // 激突。モビットは前へ、軍団も前へ。中央で光が弾ける。
  beatClash() {
    this.sfx('crushBoom', 0.8, 0.85);
    this._mobitsIdle = false;
    for (const m of this.mobits) {
      this.tweens.add({ targets: [m.spr, m.eye], y: '-=56', duration: 240, ease: 'Quart.in' });
    }
    for (const r of this.robots) {
      if (!r.alive) continue;
      this.tweens.add({ targets: [r.spr, r.eye], y: '+=24', duration: 300, ease: 'Quart.in' });
    }
    this.seq(250, () => {
      this.cameras.main.shake(280, 0.009);
      for (let i = 0; i < 5; i++) {
        const bx = 88 + i * 116;
        this.burst(bx, 196, CYAN, 8, D_MOB + 2);
        this.burst(bx, 196, EYE_RED, 6, D_MOB + 2);
      }
      this.wash(CRIMSON, 0.24, 260);
      this.sfx('knuckle', 0.7);
    });
  }

  // 押し返される。3体が弾き飛ばされて倒れる＝「死力を尽くして戦っている」の実物。
  beatFall() {
    this.sfx('hurt', 0.9, 0.7);
    for (const i of [0, 2, 4]) {
      const m = this.mobits[i];
      if (!m) continue;
      m.down = true;
      const dir = i < 2 ? -1 : 1;
      this.tweens.add({ targets: [m.spr, m.eye], x: `+=${dir * 44}`, y: '+=70',
        angle: dir * 76, duration: 400, ease: 'Cubic.out' });
      this.tweens.add({ targets: m.eye, alpha: 0.1, duration: 400 });
    }
    for (const i of [1, 3]) {
      const m = this.mobits[i];
      if (!m) continue;
      this.tweens.add({ targets: [m.spr, m.eye], y: '+=34', duration: 380, ease: 'Cubic.out' });
    }
    this.cameras.main.shake(300, 0.007);
  }

  // =============== 幕3 激発 ===============
  // 完全静止＋完全無音（0.6秒・ここには効果音を1つも予約しない）。
  // 次の一歩を最大にするための「溜め」＝R35で打撃音に使った二段構えの、映像版。
  beatSilence() {
    this._robotsCold = false;
    for (const r of this.robots) this.tweens.killTweensOf([r.spr, r.eye]);
    for (const m of this.mobits) this.tweens.killTweensOf([m.spr, m.eye]);
    // 色を抜く（黒ウォッシュ）。音を鳴らさないこと自体が演出。
    this.silenceWash = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0)
      .setDepth(D_WASH));
    this.tweens.add({ targets: this.silenceWash, alpha: 0.6, duration: 380 });
    this.cameras.main.zoomTo(1.18, 560);
  }

  // 倒れた1体が立ち上がる。目が熾火の色に灼ける＝「根はおだやかだが、いざとなれば激しい」。
  beatRise() {
    const m = this.mobits[2];
    if (!m) return;
    this.sfx('bossStress', 0.9);
    this.tweens.add({ targets: this.silenceWash, alpha: 0.24, duration: 480 });
    this.tweens.add({ targets: m.spr, angle: 0, x: m.x, y: m.y - 54, duration: 500, ease: 'Quart.out' });
    this.tweens.add({ targets: m.eye, angle: 0, x: m.x, y: m.y - 62, alpha: 1,
      scale: 0.34, duration: 420, ease: 'Quart.out' });
    m.eye.setTint(EMBER);
    m.down = false;
    this.cameras.main.zoomTo(1.26, 520);
  }

  // ★進化＝**ゲームのシステムを物語の転換点に使う**。形が変わることが「本気を出した」の証拠。
  //   同時に、殺していた色が戻る＝力が戻った合図。ここで初めてモビットが本来の姿になる。
  beatAwaken() {
    this.sfx('evolve', 1.0);
    this.sfx('gaugeFull', 0.8);
    this.flash(0.42, YELLOW);
    this.cameras.main.shake(340, 0.011);
    this.cameras.main.zoomTo(1.0, 700);
    if (this.silenceWash) {
      const w = this.silenceWash;
      this.tweens.add({ targets: w, alpha: 0, duration: 380,
        onComplete: () => w.active && w.destroy() });
      this.silenceWash = null;
    }
    this.mobits.forEach((m, i) => {
      this.seq(i * 85, () => {
        if (!m.spr.active) return;
        m.evolved = true;
        m.down = false;
        m.spr.setTexture(m.def.evo);
        m.spr.clearTint();
        this.tweens.add({ targets: m.spr, angle: 0, x: m.x, y: m.y - 54, scale: 3.0,
          duration: 240, ease: 'Quart.out' });
        m.eye.setTint(EMBER).setAlpha(1);
        this.tweens.add({ targets: m.eye, angle: 0, x: m.x, y: m.y - 62, scale: 0.3, duration: 240 });
        this.burst(m.x, m.y - 54, YELLOW, 10, D_MOB + 2);
        this.ripple(m.x, m.y - 54, EMBER, D_MOB - 1);
        this.sfx('powerup', 0.5, 1.0 + i * 0.08);
      });
    });
  }

  // 宣言は1行だけ。説明せず、事実だけを置く。
  beatDeclare() {
    this.sfx('special', 0.7);
    const t = this.reg(this.add.text(this.W / 2, 118, 'モビットは、たたかう', {
      fontFamily: 'monospace', fontSize: '26px', color: EMBER_S, fontStyle: 'bold',
      stroke: '#2a1200', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setScale(1.25).setDepth(D_TEXT));
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 240, ease: 'Cubic.out' });
    this.tweens.add({ targets: t, alpha: 0, duration: 280, delay: 1250,
      onComplete: () => t.active && t.destroy() });
  }

  // 一斉突撃。ここで初めてモビットが**攻める側**になる。押し返した証拠として軍団が崩れる。
  beatCharge() {
    this.sfx('rush', 1.0, 1.2);
    this.wash(EMBER, 0.30, 320);
    if (!this._finished) Sound.startBgm('battle');
    for (const m of this.mobits) {
      if (!m.spr.active) continue;
      const tx = 210 + this.rnd() * 250;
      const ty = 150 + this.rnd() * 70;
      this.tweens.add({ targets: [m.spr, m.eye], x: tx, y: ty, duration: 400, ease: 'Quart.out' });
      // 尾を引く（速さの証拠）
      for (let k = 0; k < 3; k++) {
        this.seq(k * 60, () => {
          if (!m.spr.active) return;
          const gh = this.reg(this.add.image(m.spr.x, m.spr.y, m.spr.texture.key)
            .setScale(3.0).setAlpha(0.32).setTint(EMBER).setBlendMode(ADD).setDepth(D_MOB - 1));
          this.tweens.add({ targets: gh, alpha: 0, duration: 260,
            onComplete: () => gh.active && gh.destroy() });
        });
      }
    }
    // 軍団の前列が崩れる＝押し返した
    let n = 0;
    for (const r of this.robots) {
      if (!r.alive || n >= 4) continue;
      if (this.rnd() < 0.4) continue;
      n++;
      r.alive = false;
      const pair = [r.spr, r.eye];
      this.burst(r.spr.x, r.spr.y, EYE_RED, 8, D_ROBOT + 2);
      this.tweens.add({ targets: pair, alpha: 0, angle: 130, y: '+=26', duration: 320,
        onComplete: () => pair.forEach((o) => o.active && o.destroy()) });
    }
    this.cameras.main.shake(300, 0.008);
  }

  // =============== 幕4 共闘（主人公＋モビット） ===============
  beatHero() {
    this.sfx('powerup', 0.9, 1.15);
    this.heroX = 150;
    this.hero = this.reg(this.add.image(-40, 250, 'player_1').setScale(3.0).setDepth(D_HERO));
    this.tweens.add({ targets: this.hero, x: this.heroX, duration: 360, ease: 'Quart.out' });
    this.heroGlow = this.reg(this.add.image(this.heroX, 250, 'glow').setBlendMode(ADD)
      .setTint(CYAN).setScale(1.6).setAlpha(0).setDepth(D_HERO - 1));
    this.tweens.add({ targets: this.heroGlow, alpha: 0.5, duration: 300, delay: 240 });
  }

  // 動詞①「つかむ」：手前の1体を掴んで手元へ引き寄せる（味方の弾になった＝色が戻る）
  verbGrab() {
    this.sfx('capture', 0.9);
    // 掴むのは**手前の列**から（この後の投げが通る一列と同じ高さ＝玉の線が1本につながる）
    const alive = this.robots.filter((r) => r.alive && r.spr.active);
    const front = alive.filter((r) => Math.abs(r.spr.y - 224) <= 40);
    const prey = (front.length ? front : alive).sort((a, b) => a.spr.x - b.spr.x)[0];
    if (!prey) return;
    this.prey = prey;
    prey.alive = false;
    prey.spr.clearTint();
    if (prey.eye.active) {
      const e = prey.eye;
      this.tweens.add({ targets: e, alpha: 0, duration: 180, onComplete: () => e.active && e.destroy() });
    }
    this.tweens.add({ targets: prey.spr, x: this.heroX + 28, y: 214, scale: 2.2,
      duration: 300, ease: 'Quart.in' });
    this.verbStamp('つかむ', this.heroX + 44, 174, CYAN_S);
    this.ripple(this.heroX + 28, 220, CYAN, D_HERO - 2);
  }

  // 動詞②「ためる」：頭上へ構え、環が内へ閉じて力が一点に集まる
  verbCharge() {
    this.sfx('fusionCharge', 0.9);
    if (!this.prey || !this.prey.spr.active) return;
    const b = this.prey.spr;
    this.tweens.add({ targets: b, y: 194, scale: 2.6, duration: 300, ease: 'Cubic.out' });
    this.tweens.add({ targets: b, angle: 360, duration: 480, ease: 'Cubic.in' });
    for (let k = 0; k < 3; k++) {
      const r = this.reg(this.add.image(this.heroX + 28, 198, 'w_ring').setTint(YELLOW)
        .setBlendMode(ADD).setScale(2.6).setAlpha(0).setDepth(D_HERO - 2));
      this.tweens.add({ targets: r, scale: 0.5, alpha: 0.9, duration: 360, delay: k * 110,
        ease: 'Cubic.in', onComplete: () => r.active && r.destroy() });
    }
    if (this.heroGlow) this.tweens.add({ targets: this.heroGlow, scale: 2.4, alpha: 0.8, duration: 300 });
    this.verbStamp('ためる', this.heroX + 44, 174, YELLOW_S);
  }

  // 動詞③「なげる」＝ビリヤードで薙ぐ。**1体ごとに数字が増える**（快感は振幅ではなく数）。
  // 同じ瞬間にモビットも討つ＝主人公だけの手柄にしない、共闘の1カット。
  verbThrow() {
    this.sfx('throwHeavy', 1.0);
    this.verbStamp('なげる！', this.heroX + 62, 174, EMBER_S);
    if (!this.prey || !this.prey.spr.active) return;
    const ball = this.prey.spr;
    const startX = ball.x, endX = 640, travel = 720;
    const LINE_Y = 224, BAND = 40;   // 玉が通る高さと、当たりとみなす縦の帯
    ball.setDepth(D_HERO + 1);
    this.tweens.add({ targets: ball, x: endX, y: LINE_Y, duration: travel, ease: 'Linear' });
    this.tweens.add({ targets: ball, angle: 1080, duration: travel, ease: 'Linear' });

    // 航跡（重い物が速く飛んでいることを尾で見せる）
    for (let k = 0; k < 9; k++) {
      this.seq(k * 70, () => {
        if (!ball.active) return;
        const gh = this.reg(this.add.image(ball.x, ball.y, 'glow').setTint(YELLOW)
          .setBlendMode(ADD).setScale(1.1).setDepth(D_HERO));
        this.tweens.add({ targets: gh, alpha: 0, scale: 0.25, duration: 300,
          onComplete: () => gh.active && gh.destroy() });
      });
    }

    // 玉の x 位置から着弾時刻を逆算＝絵と当たりが一致する。
    // ★実測で9体が一度に吹き飛んだ（＝玉より2列上の敵まで巻き込んでいた）。x だけで判定すると
    //   「玉のいない場所で数字が上がる」＝[[feedback_one_hit_one_circle]] と同じ絵と判定のズレ。
    //   縦の帯（±40px）で絞り、**玉が実際に通った一列**だけを薙ぐ。
    for (const r of this.robots) {
      if (!r.alive || Math.abs(r.spr.y - LINE_Y) > BAND) continue;
      const t = ((r.spr.x - startX) / (endX - startX)) * travel;
      if (t < 0) continue;
      this.seq(Math.round(t), () => this.billiardHit(r));
    }
    this.seq(travel + 60, () => { if (ball.active) ball.destroy(); });

    // ★共闘：同じ瞬間にモビットも討つ
    this.mobits.forEach((m, i) => {
      this.seq(180 + i * 110, () => {
        if (!m.spr.active) return;
        const tx = 300 + this.rnd() * 250, ty = 120 + this.rnd() * 100;
        this.tweens.add({ targets: [m.spr, m.eye], x: tx, y: ty, duration: 200, ease: 'Quart.in' });
        this.burst(tx, ty, EMBER, 7, D_MOB + 2);
        this.sfx('hit', 0.45, 1.1 + i * 0.09);
      });
    });
  }

  // 1体ぶんの薙ぎ倒し。数字（1,2,3…）と音程を一緒に上げるのが「数えられる」の実装。
  billiardHit(r) {
    if (!r.alive || !r.spr.active) return;
    r.alive = false;
    this._killCount++;
    const n = this._killCount;
    this.sfx(n >= 4 ? 'crushBoom' : 'crush', 1, 1 + n * 0.08);
    const x = r.spr.x, y = r.spr.y;
    this.burst(x, y, YELLOW, 9, D_TEXT - 1);
    this.burst(x, y, EMBER, 6, D_TEXT - 1);
    const cnt = this.reg(this.add.text(x, y - 16, String(n), {
      fontFamily: 'monospace', fontSize: (16 + n * 4) + 'px', color: YELLOW_S,
      fontStyle: 'bold', stroke: '#3a2000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT + 1));
    this.tweens.add({ targets: cnt, y: y - 42 - n * 3, alpha: 0, duration: 620,
      ease: 'Cubic.out', onComplete: () => cnt.active && cnt.destroy() });
    const pair = [r.spr, r.eye];
    this.tweens.add({ targets: pair, x: x + 60, y: y - 40, angle: 220, alpha: 0,
      duration: 500, ease: 'Cubic.out',
      onComplete: () => pair.forEach((o) => o.active && o.destroy()) });
    this.cameras.main.shake(140, 0.004 + n * 0.001);
  }

  // 動詞のスタンプ（つかむ/ためる/なげる）。同じ位置に順に出して「1本の手順」に見せる。
  verbStamp(txt, x, y, color) {
    const t = this.reg(this.add.text(x, y, txt, {
      fontFamily: 'monospace', fontSize: '26px', color, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 5,
    }).setOrigin(0.5).setScale(1.6).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 14, duration: 260, delay: 340,
      onComplete: () => t.active && t.destroy() });
  }

  // =============== 幕5 頂点：軌道神核の予兆 ===============
  // 本物のスプライトは boss.js 起動後にしか焼かれないので、ここは**構図だけ**を組む。
  // ネタバレにならず、到達したときに「あの影だ」と分かる。
  beatCorePremonition() {
    const cx = this.W / 2, cy = 150;
    this.sfx('warpIn', 0.8);
    this.sfx('godLaser', 0.5);

    this.coreOrb = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xfff2c0).setScale(0).setDepth(D_ROBOT + 2));
    this.tweens.add({ targets: this.coreOrb, scale: 2.4, duration: 620, ease: 'Cubic.out' });

    // 3つの環：傾きも速さも別々＝「軌道」に見える（本編の TRUE_RING_GEO と同じ考え方）
    const geo = [[24, -0.42, 0.9], [24, 0.42, -0.72], [21, 0, 1.25]];
    this.coreRings = geo.map((g, i) => {
      const img = this.reg(this.add.image(cx, cy, 'w_ring').setBlendMode(ADD)
        .setTint(GOLD).setRotation(g[1]).setAlpha(0).setDepth(D_ROBOT + 1));
      img.setDisplaySize(g[0] * 7, g[0] * 2.6);
      this.tweens.add({ targets: img, alpha: 0.85, duration: 420, delay: i * 90 });
      return { img, rot: g[1], spd: g[2], w: g[0] * 7, h: g[0] * 2.6 };
    });
    this._coreActive = true;

    // 単眼が開く（横に裂ける深紅のスリット＋白熱の芯）
    this.coreEye = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xff2f4a).setScale(0.1, 0.02).setDepth(D_ROBOT + 3));
    this.tweens.add({ targets: this.coreEye, scaleX: 1.15, scaleY: 0.42, duration: 340,
      delay: 160, ease: 'Cubic.out' });
    this.corePupil = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xffffff).setScale(0).setDepth(D_ROBOT + 4));
    this.tweens.add({ targets: this.corePupil, scale: 0.34, duration: 260, delay: 300 });

    this.wash(0xff2222, 0.25, 300);
    for (const b of [this.topBand, this.botBand]) {
      if (b) this.tweens.add({ targets: b, x: this.W / 2 + 3, duration: 45, yoyo: true, repeat: 6 });
    }
    this.cameras.main.shake(320, 0.006);
  }

  // =============== 幕6 収束（Title の最終フレームへ座標一致） ===============
  beatConverge() {
    const cx = this.W / 2;
    this.sfx('clear');

    // シネスコ黒帯を開く＝「映画」から「ゲーム」へ戻る合図
    if (this.topBand) this.tweens.add({ targets: this.topBand, y: -26, duration: 480, ease: 'Cubic.inOut' });
    if (this.botBand) this.tweens.add({ targets: this.botBand, y: this.H + 26, duration: 480, ease: 'Cubic.inOut' });
    this.cameras.main.zoomTo(1.0, 400);

    // 予兆と残骸を畳む（軌道神核は倒されたのではなく**いまは退く**）
    this._coreActive = false;
    this._robotsCold = false;
    const fade = [this.coreOrb, this.coreEye, this.corePupil, this.overlordGlow]
      .concat((this.coreRings || []).map((r) => r.img), this.overlordEyes || []);
    for (const r of this.robots) fade.push(r.spr, r.eye);
    for (const o of fade) {
      if (o && o.active) {
        this.tweens.add({ targets: o, alpha: 0, duration: 380, ease: 'Cubic.in',
          onComplete: () => o.active && o.destroy() });
      }
    }
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // Title と同一の星背景（tileSprite・alpha0.7）
    this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1').setAlpha(0.7).setDepth(D_STARS));

    this.ripple(cx, 112, YELLOW, D_TEXT - 2);
    this.ripple(cx, 180, EMBER, D_TEXT - 2);

    // ロゴ結像（Title と完全一致: 320,112 / 34px / 金 #ffd76a ＋ 熾火の halo ＋ 焦げの芯）
    // ★R44W2 でピンクの縁取りをやめた。飴玉の記号ではなく**打ち出した金属**にする。
    const LOGO = 'クルット・モビット';
    const logoHalo = this.reg(this.add.text(cx, 112, LOGO, {
      fontFamily: 'monospace', fontSize: '34px', color: '#ff7a2a',
      fontStyle: 'bold', stroke: '#ff7a2a', strokeThickness: 11,
    }).setOrigin(0.5).setScale(0).setAlpha(0.55).setDepth(D_TEXT - 1));
    const logo = this.reg(this.add.text(cx, 112, LOGO, {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffd76a',
      fontStyle: 'bold', stroke: '#2a1408', strokeThickness: 5,
    }).setOrigin(0.5).setScale(0).setDepth(D_TEXT));
    this.tweens.add({ targets: [logo, logoHalo], scale: 1, duration: 420, ease: 'Back.easeOut' });
    this.burst(cx, 112, YELLOW, 12, D_TEXT + 1);

    // サブタイトル（Title 一致: 320,156 / 16px / #ffcf9a）。ローマ字ではなく看板の動詞。
    const sub = this.reg(this.add.text(cx, 156, 'つかんで ためて なげかえせ', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcf9a',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 200 });

    // ★Title 一致（自機は 320,236 / scale 3.2）
    if (this.hero) {
      this.tweens.add({ targets: this.hero, x: cx, y: 236, scale: 3.2, duration: 400, ease: 'Cubic.out' });
    }
    if (this.heroGlow) {
      const hg = this.heroGlow;
      this.tweens.add({ targets: hg, alpha: 0, duration: 300, onComplete: () => hg.active && hg.destroy() });
    }

    // ★モビットは Title の隊列（左右2体ずつ・y248・scale2.0）へ収まる。
    //   Title の呼吸は _a=0 から始まる＝フレーム1は基準位置そのものなので、ここと一致する。
    //   「主人公とモビットが最後まで**並んで立っている**」を最終フレームで見せる。
    this._mobitsIdle = false;
    this.mobits.forEach((m, i) => {
      if (!m.spr.active) return;
      if (m.eye.active) {
        const e = m.eye;
        this.tweens.add({ targets: e, alpha: 0, duration: 260, onComplete: () => e.active && e.destroy() });
      }
      if (i >= TITLE_SQUAD.keys.length) {    // 隊列は4体。5体目は光に還す
        const s = m.spr;
        this.tweens.add({ targets: s, alpha: 0, duration: 320,
          onComplete: () => s.active && s.destroy() });
        return;
      }
      // ロゴの閃光の下で通常形態へ戻す。進化は幕3で役目を終えており、Title は
      // 「これから連れていく仲間」の顔ぶれを見せる場所なので、始まりの姿で並ばせる。
      m.spr.setTexture(TITLE_SQUAD.keys[i]).setDepth(D_HERO + 1);
      this.tweens.add({ targets: m.spr, x: cx + TITLE_SQUAD.xs[i], y: TITLE_SQUAD.y,
        scale: TITLE_SQUAD.scale, angle: 0, duration: 420, ease: 'Cubic.out' });
    });

    // ★Title 一致: プロンプトは y=306
    const prompt = this.reg(this.add.text(cx, 306, 'SPACE か クリックで スタート', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: prompt, alpha: 1, duration: 300, delay: 300 });
  }

  // --- 局所ヘルパ: 全画面フラッシュ（白は alpha ≤ 0.45 厳守） ---
  flash(alpha, colorInt) {
    const a = Math.min(0.45, alpha);
    const f = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H,
      colorInt != null ? colorInt : 0xffffff, a).setBlendMode(ADD).setDepth(D_FLASH));
    this.tweens.add({ targets: f, alpha: 0, duration: 320, onComplete: () => f.active && f.destroy() });
  }

  // --- 局所ヘルパ: 有色ADDウォッシュ（明るさは白ではなく色で作る） ---
  wash(colorInt, peak, ms) {
    const w = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, colorInt, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: w, alpha: Math.min(0.45, peak), duration: ms * 0.35, yoyo: true,
      onComplete: () => w.active && w.destroy() });
  }

  // --- 局所ヘルパ: 小さな爆散 ---
  burst(x, y, colorInt, n, depth) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rnd() * 0.6;
      const d = 20 + this.rnd() * 22;
      const sp = this.reg(this.add.image(x, y, 'spark').setTint(colorInt).setBlendMode(ADD).setDepth(depth));
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.3, duration: 440, ease: 'Cubic.out',
        onComplete: () => sp.active && sp.destroy() });
    }
  }

  // --- 局所ヘルパ: リング波（w_ring 拡大） ---
  ripple(x, y, colorInt, depth) {
    const r = this.reg(this.add.image(x, y, 'w_ring').setTint(colorInt).setBlendMode(ADD)
      .setScale(0.4).setAlpha(0.7).setDepth(depth));
    this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 640, ease: 'Cubic.out',
      onComplete: () => r.active && r.destroy() });
  }

  update(_t, delta) {
    if (this._finished) return;
    const dt = delta / 1000;
    this._et = (this._et || 0) + dt;

    // 軍団: 単眼の約4Hz明滅＋横1pxジッター（カタカタ）＝機械の冷たさ
    if (this._robotsCold && this.robots) {
      const on = Math.floor(this._et * 8) % 2 === 0;
      const jit = (Math.floor(this._et * 30) % 2 === 0) ? 0 : 1;
      for (const r of this.robots) {
        if (!r.alive || !r.spr.active) continue;
        r.spr.x = r.baseX + jit;
        if (r.eye.active) { r.eye.x = r.spr.x; r.eye.setAlpha(on ? 1 : 0.35); }
      }
    }

    // モビット: 隊列で待つ間だけ呼吸する。振幅は1px＝生きてはいるが**可愛くはしない**。
    if (this._mobitsIdle && this.mobits) {
      const b = Math.sin(this._et * 5) * 1;
      for (const m of this.mobits) {
        if (!m.spr.active || m.down) continue;
        m.spr.y = m.y + b;
        if (m.eye.active) m.eye.y = m.y - 8 + b;
      }
    }

    // 軌道神核の環：見込み角（縦の潰れ）を周期で変える＝静止画のまま「回っている」が読める
    if (this._coreActive && this.coreRings) {
      for (const r of this.coreRings) {
        if (!r.img.active) continue;
        r.rot += r.spd * dt * 0.35;
        const seen = 0.30 + 0.70 * Math.abs(Math.cos(r.rot));
        r.img.setDisplaySize(r.w, r.h * seen).setRotation(Math.sin(r.rot * 0.5) * 0.5);
      }
    }
  }

  // --- 終端/スキップ共通: 生成物・タイマー・tween を確実に回収してから Title へ ---
  _goTitle() {
    if (this._finished) return;
    this._finished = true;
    for (const t of this._timers) if (t) t.remove(false);
    this._timers.length = 0;
    this.tweens.killAll();
    this.cameras.main.setZoom(1);
    for (const o of this._objs) { if (o && o.destroy) o.destroy(); }
    this._objs.length = 0;
    this.scene.start('Title');
  }
}
