// scenes/Opening.js — コールドオープンのキネティック・タイポ演出（Boot→Opening→Title）。
//
// ★R41 全面作り直し。実プレイFB「聖典からかなり設定や雰囲気を変えているので、オープニングを
//   作り直して」。旧版（R21期）は今のゲームと**別のゲームの予告編**になっていた：
//     ・敵の親玉が「ヴォイド・マキナ」＝現在のどのデータにも存在しない固有名（実物は
//       **マオウレクス**、その第4形態が **真マオウレクス「軌道神核」**）
//     ・看板の動詞が出てこない。旧コンセプトは「ポンッで上書き」＝敵が軽く弾ける絵だったが、
//       現在の動詞は **つかむ→ためる→なげる（ビリヤード攻撃）**＝重い玉で薙ぎ倒す手応え。
//       恒久基準は「攻撃の爽快感」と「攻撃を受けた緊張感」の最大化（＝軽さではない）。
//     ・相棒がスターパピー1種の絵だが、実際は **モビット8種**（進化で16形態）が仲間になる。
//     ・収束先の座標が現在のTitleとズレていた（自機 scale 2.4→実際は3.2／プロンプト312→306）。
//
// 新コンセプト「けされた ひかりを、つかんで なげかえす。」約13.2秒・5幕。
//   幕1 侵略  … マオウレクスの名乗りと命令「セカイから ひかりを けせ。」
//               ※エンディングの「せかいに ひかりが もどった」と対になる＝物語の環を閉じる
//   幕2 軍団  … 実物の雑魚6種が単眼を光らせて行進（走査線・カタカタ）
//   幕3 頂点  … 空に3つの環と単眼＝**軌道神核**の予兆（最後に待つものを1カットだけ見せる）
//   幕4 反転  … 完全無音→「つかめ！」で全チャンネル同時反転。そのまま**動詞の実演**：
//               つかむ→ためる→なげる→ビリヤードで軍団を薙ぎ、撃破数を1つずつ数える
//               （[[feedback_reward_is_countability_not_amplitude]]＝快感は振幅ではなく数）
//   幕5 収束  … 光が中央へ集まり、Titleの最終フレームへ座標一致で着地
//
// 技術制約: import Phaser 禁止（window.Phaser 参照）。Math.random 禁止（決定的LCGを内蔵）。
// monospace のみ。白全画面フラッシュは alpha ≤ 0.45 厳守（明るさは有色ADDウォッシュで作る）。
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

// 色（数値=tint用 / 文字=text用）
const CRIMSON = 0xe03028, CRIMSON_S = '#e03028';   // マオウレクスの色（enemies.js の color と一致）
const STEEL_S = '#e8ecf2';
const COLD_S = '#dfe6ee';
const CYAN = 0x36e0ff, CYAN_S = '#36e0ff';
const YELLOW = 0xffe066, YELLOW_S = '#ffe066';
const PINK = 0xff6ec7, PINK_S = '#ff6ec7';
const MINT_S = '#7fffcf';
const GOLD = 0xffd23f;                              // 軌道神核の光（trueForm.glowInner 系）
const STEEL_TINT = 0x39424d;                        // 雑魚の鋼色シルエット用の暗tint
const EYE_CYAN = 0x36e0ff, EYE_RED = 0xff4d4d;

// 深度レイヤ
const D_STARS = 1, D_WASH = 5, D_ROBOT = 40, D_TEXT = 60, D_BANDS = 100, D_FLASH = 110, D_SKIP = 120;

// 幕2の軍団＝実物の雑魚6種（enemies.js の id と一致。ここがズレると「出てこない敵」になる）
const MOB_KEYS = ['enemy_gareon', 'enemy_chibit', 'enemy_bomba',
  'enemy_snipa', 'enemy_turret', 'enemy_magman'];
// 幕4で集まる相棒＝モビット（8種の先頭4種。全部出すと等倍では団子になるので顔ぶれだけ見せる）
const BUDDY_KEYS = ['mon_starpuppy', 'mon_togeron', 'mon_pikabit', 'mon_samet'];

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
    this._robotsCold = false; // update で雑魚の明滅/ジッターを回すか
    this._buddiesActive = false; // update で相棒を公転させるか
    this._coreActive = false; // update で軌道神核の環を回すか
    this._killCount = 0;      // ビリヤードで薙いだ数（数えられることが快感）

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
    // 上下シネスコ黒帯（各40px）。反転で上下に開く。
    this.topBand = this.reg(this.add.rectangle(cx, 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));
    this.botBand = this.reg(this.add.rectangle(cx, this.H - 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));

    // 中央の縦の亀裂1本。旧版はシアンだったが、これから名乗るのはマオウレクス＝**深紅**にする
    // （色が先に名を告げる。シアンは軍団の単眼と主人公側の光に譲る）。
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
    if (this.gate) { this.tweens.killTweensOf(this.gate); this.tweens.add({ targets: this.gate, alpha: 0, duration: 200 }); }
    if (this._crackPulse) this._crackPulse.stop();
    this.playSequence();
    // スキップリスナは起動後に登録（開始トリガと同一イベントで誤スキップしないよう50ms遅らせる）。
    this.seq(50, () => {
      this.input.keyboard.once('keydown-SPACE', () => this.skip());
      this.input.once('pointerdown', () => this.skip());
    });
    // 1.5秒後に薄いSKIPヒントを右下常設。
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
    // 幕1 侵略
    this.seq(900, () => this.beatName());
    this.seq(2400, () => this.beatNameClear());
    this.seq(2600, () => this.beatCommand('セカイから', 0));
    this.seq(3050, () => this.beatCommand('ひかりを', 1));
    this.seq(3500, () => this.beatCommand('けせ。', 2));
    this.seq(3900, () => this.beatCommandAlign());
    // 幕2 軍団
    this.seq(4500, () => this.beatMarch());
    // 幕3 頂点＝軌道神核の予兆
    this.seq(6200, () => this.beatCorePremonition());
    // 幕4 反転＝動詞の実演
    this.seq(7400, () => this.beatDemo());
    this.seq(8000, () => this.beatReversal());
    this.seq(8700, () => this.beatHeroes());
    this.seq(9400, () => this.verbGrab());
    this.seq(10000, () => this.verbCharge());
    this.seq(10600, () => this.verbThrow());
    // 幕5 収束
    this.seq(11700, () => this.beatConverge());
    this.seq(13200, () => this._goTitle());

    // 行進中(4.5-6.2)の tick連打＋低ランブル
    this.seq(4500, () => this.sfx('voidHum'));
    this.seq(5400, () => this.sfx('voidHum'));
    for (let i = 0; i < 9; i++) this.seq(4500 + i * 170, () => this.sfx('tick'));
  }

  // =============== ビート 0.9: 固有名スラム『マオウレクス』 ===============
  // 旧版の「ヴォイド・マキナ」はゲーム内に一度も出てこない名前だった。ここで名乗るのは
  // 実際に最終ステージで戦う相手＝マオウレクス（第4形態が軌道神核）。
  beatName() {
    const cx = this.W / 2;
    this.sfx('metalSlam');
    this.sfx('voidHum');

    // 亀裂が裂ける：冷白一閃（alpha≤0.4・一瞬）。名前スラムのみ許される白フラッシュ。
    const flash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0xffffff, 0.4)
      .setDepth(D_FLASH));
    this.tweens.add({ targets: flash, alpha: 0, duration: 130, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: [this.crack, this.crackGlow], scaleX: 4, alpha: 0, duration: 180,
      onComplete: () => { this.crack.destroy(); this.crackGlow.destroy(); } });

    // RGBずらし（薄く=可読優先）。深紅とシアンの薄い分身を背後に。
    const rgb = [];
    for (const [dx, col] of [[-2, CRIMSON_S], [2, CYAN_S]]) {
      rgb.push(this.reg(this.add.text(cx + dx, 150, 'マオウレクス', {
        fontFamily: 'monospace', fontSize: '40px', color: col, fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.28).setDepth(D_TEXT)));
    }
    const name = this.reg(this.add.text(cx, 150, 'マオウレクス', {
      fontFamily: 'monospace', fontSize: '40px', color: STEEL_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT));
    [name, ...rgb].forEach((o) => o.setScale(1.15));
    this.tweens.add({ targets: [name, ...rgb], scale: 1.0, duration: 160, ease: 'Back.easeOut' });

    const sub = this.reg(this.add.text(cx, 192, '― きかいの おうさま ―', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9aa6b2',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 120 });

    this.nameGroup = [name, sub, ...rgb];
  }

  // ビート 2.4: 固有名を消して一瞬の黒（命令の前置き）
  beatNameClear() {
    if (!this.nameGroup) return;
    const g = this.nameGroup;
    this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.forEach((o) => o.destroy()) });
    this.nameGroup = null;
  }

  // =============== ビート 2.6: 命令3連（可読死守・機械のコマンド行） ===============
  // 「セカイから ひかりを けせ。」＝エンディングの「せかいに ひかりが もどった」の対句。
  // 冒頭で奪われたものが最後に返る、という一本の線をオープニングとエンディングで張る。
  beatCommand(txt, idx) {
    this.sfx('tick');
    if (!this.cmdObjs) this.cmdObjs = [];
    const x = this.W / 2 - 96;
    const y = 138 + idx * 30;
    const t = this.reg(this.add.text(x, y, '▸ ' + txt, {
      fontFamily: 'monospace', fontSize: '22px', color: STEEL_S, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setAlpha(0).setDepth(D_TEXT));
    // 深紅のキャレット▮点滅（命令を書いているのはマオウレクス＝色で誰の声かが分かる）
    const caret = this.reg(this.add.text(t.x + t.width + 4, y, '▮', {
      fontFamily: 'monospace', fontSize: '20px', color: CRIMSON_S,
    }).setOrigin(0, 0.5).setDepth(D_TEXT));
    this.tweens.add({ targets: caret, alpha: 0.1, duration: 260, yoyo: true, repeat: -1 });
    t.setScale(1.2, 1.2);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 130, ease: 'Back.easeOut' });
    this.cmdObjs.push(t, caret);
  }

  // ビート 3.9: 一瞬1文に整列し冷たく静止
  beatCommandAlign() {
    if (this.cmdObjs) {
      const g = this.cmdObjs;
      this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.forEach((o) => o.destroy()) });
      this.cmdObjs = null;
    }
    const cx = this.W / 2;
    const line = this.reg(this.add.text(cx, 150, '［ セカイから ひかりを けせ。 ］', {
      fontFamily: 'monospace', fontSize: '20px', color: STEEL_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: line, alpha: 1, duration: 160 });
    this.cmdLine = line;
  }

  // =============== ビート 4.5: 金属のむれ・単眼行進 ===============
  // 旧版は3種の使い回しだった。実際に序盤から出てくる6種を並べる＝予告編と本編が一致する。
  beatMarch() {
    this.robots = [];
    for (let i = 0; i < MOB_KEYS.length; i++) {
      const baseX = 96 + i * 90;
      const spr = this.reg(this.add.image(baseX, 380, MOB_KEYS[i]).setScale(2.4)
        .setTint(STEEL_TINT).setDepth(D_ROBOT));
      // 単眼を cyan/red で点灯（glow極小ADD・約4Hz明滅）
      const eyeCol = (i % 2 === 0) ? EYE_CYAN : EYE_RED;
      const eye = this.reg(this.add.image(baseX, 380 - 8, 'glow').setBlendMode(ADD)
        .setTint(eyeCol).setScale(0.5).setDepth(D_ROBOT + 1));
      this.tweens.add({ targets: spr, y: 300, duration: 420, delay: i * 70, ease: 'Cubic.out' });
      this.tweens.add({ targets: eye, y: 290, duration: 420, delay: i * 70, ease: 'Cubic.out' });
      this.robots.push({ spr, eye, baseX, alive: true });
    }
    this._robotsCold = true;

    // 走査線オーバーレイ（CRT風・静的）
    const sl = this.reg(this.add.graphics().setDepth(82));
    sl.fillStyle(0x000000, 0.18);
    for (let y = 0; y < this.H; y += 3) sl.fillRect(0, y, this.W, 1);
    this.scanline = sl;

    this.marchText = [
      this.reg(this.add.text(this.W / 2, 96, 'きかいの ぐんだん', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8a93a0',
      }).setOrigin(0.5).setDepth(D_TEXT)),
      this.reg(this.add.text(548, 122, 'カタ カタ', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8a93a0',
      }).setOrigin(0.5).setDepth(D_TEXT)),
    ];
  }

  // =============== ビート 6.2: 頂点＝真マオウレクス「軌道神核」の予兆 ===============
  // 最後に待つものを**1カットだけ**見せる。本物のスプライトは boss.js が起動してから焼かれる
  // ので、ここでは形（球＋傾きの違う3つの環＋血走った単眼）を w_ring と glow で組む。
  // 絵を借りずに構図だけ借りる＝ネタバレにならず、到達したとき「あの影だ」と分かる。
  beatCorePremonition() {
    const cx = this.W / 2, cy = 168;
    this.sfx('warning');       // 唯一の緊張音（直後に反転で解決する）

    // 球（神核）：白金のグロウ2枚重ね
    const orb = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xfff2c0).setScale(0).setDepth(D_ROBOT + 2));
    this.tweens.add({ targets: orb, scale: 2.4, duration: 620, ease: 'Cubic.out' });

    // 3つの環：傾きも速さも別々＝「軌道」に見える（本編の TRUE_RING_GEO と同じ考え方）
    this.coreRings = [];
    const geo = [[24, -0.42, 0.9], [24, 0.42, -0.72], [21, 0, 1.25]];
    for (let i = 0; i < 3; i++) {
      const r = this.reg(this.add.image(cx, cy, 'w_ring').setBlendMode(ADD)
        .setTint(GOLD).setRotation(geo[i][1]).setAlpha(0).setDepth(D_ROBOT + 1));
      r.setDisplaySize(geo[i][0] * 7, geo[i][0] * 2.6);
      this.tweens.add({ targets: r, alpha: 0.85, duration: 420, delay: i * 90 });
      this.coreRings.push({ img: r, rot: geo[i][1], spd: geo[i][2], w: geo[i][0] * 7, h: geo[i][0] * 2.6 });
    }
    this._coreActive = true;

    // 単眼が開く（横に裂ける深紅のスリット＋白熱の芯）
    const eye = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xff2f4a).setScale(0.1, 0.02).setDepth(D_ROBOT + 3));
    this.tweens.add({ targets: eye, scaleX: 1.15, scaleY: 0.42, duration: 340, delay: 180,
      ease: 'Cubic.out' });
    const pupil = this.reg(this.add.image(cx, cy, 'glow').setBlendMode(ADD)
      .setTint(0xffffff).setScale(0).setDepth(D_ROBOT + 4));
    this.tweens.add({ targets: pupil, scale: 0.34, duration: 260, delay: 320 });
    this.coreParts = [orb, eye, pupil];

    // 赤アラート1回パルス（alpha≤0.45厳守）
    const alert = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0xff2222, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: alert, alpha: 0.25, duration: 140, yoyo: true,
      onComplete: () => alert.destroy() });
    // 黒帯が小刻みに震える
    for (const b of [this.topBand, this.botBand]) {
      if (b) this.tweens.add({ targets: b, x: this.W / 2 + 3, duration: 45, yoyo: true, repeat: 6 });
    }
    // 雑魚の単眼も一斉に強く脈打つ（王が見ている＝軍団が呼応する）
    if (this.robots) {
      for (const r of this.robots) {
        this.tweens.add({ targets: r.eye, scale: 0.85, duration: 130, yoyo: true, repeat: 4 });
      }
    }
  }

  // =============== ビート 7.4: 反転の刃『でも』＋完全無音へ ===============
  beatDemo() {
    // ここから効果音を突然カット（何も予約しない）→ 残響が引いて完全無音になる。
    const cx = this.W / 2;
    const preCrack = this.reg(this.add.rectangle(cx, 250, 3, 120, PINK, 0)
      .setBlendMode(ADD).setDepth(D_ROBOT));
    this.tweens.add({ targets: preCrack, alpha: 0.5, duration: 300 });
    this.preCrack = preCrack;
    const demo = this.reg(this.add.text(-80, 250, 'でも', {
      fontFamily: 'monospace', fontSize: '34px', color: COLD_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT));
    this.tweens.add({ targets: demo, x: cx, duration: 260, ease: 'Cubic.out' });
    this.demoText = demo;
  }

  // =============== ビート 8.0: 反転爆発『つかめ！』＝全チャンネル同時反転 ===============
  // 旧版の反転語は「だいじょうぶ！」＝気分の宣言だった。今回は**動詞そのもの**を叫ぶ。
  // このゲームの答えは「怖くない」ではなく「つかんで、なげかえせ」だから。
  beatReversal() {
    const cx = this.W / 2;
    this.sfx('capture');
    this.sfx('powerup');
    if (!this._finished) Sound.startBgm('battle');

    // ① 黒帯が上下に開く
    if (this.topBand) this.tweens.add({ targets: this.topBand, y: -60, duration: 520, ease: 'Cubic.out',
      onComplete: () => this.topBand && this.topBand.destroy() });
    if (this.botBand) this.tweens.add({ targets: this.botBand, y: this.H + 60, duration: 520, ease: 'Cubic.out',
      onComplete: () => this.botBand && this.botBand.destroy() });

    // ② パレット反転：モノクロ→キャンディ（白フラッシュは使わない・有色ADDウォッシュ）
    const wash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, YELLOW, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: wash, alpha: 0.28, duration: 160, yoyo: true });
    const pinkWash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, PINK, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: pinkWash, alpha: 0.14, duration: 220 });
    this.wash = pinkWash;

    // ③ 冷たい世界の記号を全部落とす（走査線・王の予兆・命令文）
    this._robotsCold = false;
    this._coreActive = false;
    if (this.scanline) this.tweens.add({ targets: this.scanline, alpha: 0, duration: 300,
      onComplete: () => this.scanline && this.scanline.destroy() });
    if (this.marchText) this.marchText.forEach((t) => this.tweens.add({ targets: t, alpha: 0, duration: 250 }));
    if (this.cmdLine) this.tweens.add({ targets: this.cmdLine, alpha: 0, duration: 250 });
    if (this.demoText) this.tweens.add({ targets: this.demoText, alpha: 0, scale: 1.4, duration: 300,
      onComplete: () => this.demoText && this.demoText.destroy() });
    if (this.preCrack) this.tweens.add({ targets: this.preCrack, alpha: 0, duration: 250 });
    // 軌道神核の予兆は「いまは退く」＝すぼまって消える（倒されたのではない）
    const coreAll = [...(this.coreParts || []), ...((this.coreRings || []).map((r) => r.img))];
    if (coreAll.length) {
      this.tweens.add({ targets: coreAll, alpha: 0, duration: 380, ease: 'Cubic.in' });
    }

    // ④『つかめ！』が Back.easeOut で弾んで発色
    const yes = this.reg(this.add.text(cx, 168, 'つかめ！', {
      fontFamily: 'monospace', fontSize: '48px', color: YELLOW_S, fontStyle: 'bold',
      stroke: PINK_S, strokeThickness: 6,
    }).setOrigin(0.5).setScale(0).setDepth(D_TEXT));
    this.tweens.add({ targets: yes, scale: 1.15, duration: 340, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: yes, scale: 1.0, duration: 140 }) });
    this.reversalText = yes;
    this.burst(cx, 168, YELLOW, 14, D_TEXT - 1);
    this.burst(cx, 168, PINK, 10, D_TEXT - 1);
  }

  // =============== ビート 8.7: 主人公＆モビット登場 ===============
  // 相棒は1種ではなく**モビット4種の顔ぶれ**（実際は8種＋進化）。「なかまたち」の話だと絵で示す。
  beatHeroes() {
    // 主人公は左に降りる（右へ投げ抜くため。中央だとビリヤードの線が半分になる）
    this.heroX = 120;
    this.hero = this.reg(this.add.image(this.heroX, 110, 'player_1').setScale(3).setDepth(D_ROBOT + 2));
    this.tweens.add({ targets: this.hero, y: 236, duration: 520, ease: 'Bounce.easeOut' });

    this.buddies = [];
    for (let i = 0; i < BUDDY_KEYS.length; i++) {
      const base = (i / BUDDY_KEYS.length) * Math.PI * 2;
      const g = this.reg(this.add.image(0, 0, 'glow').setBlendMode(ADD).setScale(1.4)
        .setTint(0x7fd8ff).setDepth(D_ROBOT + 1));
      const orb = this.reg(this.add.image(0, 0, BUDDY_KEYS[i]).setScale(1.6).setDepth(D_ROBOT + 2));
      this.buddies.push({ g, spr: orb, base, cx: this.heroX, cy: 236, rx: 46, ry: 26 });
    }
    this._ba = 0;
    this._buddiesActive = true;

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = this.reg(this.add.image(this.heroX + Math.cos(a) * 30, 236 + Math.sin(a) * 20, 'w_star2')
        .setBlendMode(ADD).setTint(YELLOW).setScale(0).setDepth(D_TEXT - 1));
      this.tweens.add({ targets: st, scale: 1.6, alpha: 0, duration: 600, delay: i * 40,
        ease: 'Cubic.out', onComplete: () => st.destroy() });
    }
  }

  // =============== ビート 9.4: 動詞①「つかむ」 ===============
  // ここからがこのゲームの看板。旧版はここが「ポンッで敵が消える」だったが、実際の遊びは
  // **敵をつかんで玉にし、溜めて、投げて、他の敵を薙ぐ**。予告編で嘘をつかない。
  verbGrab() {
    if (!this.robots || !this.robots.length) return;
    this.sfx('capture');
    const r = this.robots[0];
    r.alive = false;
    this.ball = r;
    // つかまれた敵は色が戻り（鋼→素の色）、主人公の手元へ吸い寄せられる＝「味方の弾になった」
    r.spr.clearTint();
    r.eye.destroy();
    this.tweens.add({ targets: r.spr, x: this.heroX + 26, y: 206, scale: 2.0,
      duration: 380, ease: 'Back.easeOut' });
    this.verbStamp('つかむ', this.heroX + 40, 172, CYAN_S);
    this.ripple(this.heroX + 26, 206, CYAN, D_TEXT - 2);
  }

  // =============== ビート 10.0: 動詞②「ためる」 ===============
  verbCharge() {
    if (!this.ball) return;
    this.sfx('fusionCharge');
    const b = this.ball.spr;
    // 溜めは「回る＋膨らむ＋光が集まる」。3枚の環が内へ閉じる＝力が一点に集まる形
    this.tweens.add({ targets: b, scale: 2.7, duration: 520, ease: 'Cubic.out' });
    this.tweens.add({ targets: b, angle: 360, duration: 520, ease: 'Cubic.in' });
    for (let i = 0; i < 3; i++) {
      const ring = this.reg(this.add.image(b.x, b.y, 'w_ring').setBlendMode(ADD)
        .setTint(YELLOW).setScale(2.6).setAlpha(0).setDepth(D_TEXT - 2));
      this.tweens.add({ targets: ring, scale: 0.5, alpha: 0.9, duration: 380, delay: i * 120,
        ease: 'Cubic.in', onComplete: () => ring.destroy() });
    }
    this.verbStamp('ためる', this.heroX + 40, 172, YELLOW_S);
  }

  // =============== ビート 10.6: 動詞③「なげる」＝ビリヤードで軍団を薙ぐ ===============
  // 快感は振幅ではなく**数えられること**（テトリスの4段消し）。1体薙ぐごとに数字が1つ増え、
  // 音程も上がる。1発を大きくするのではなく、N個並べて数える。
  verbThrow() {
    if (!this.ball) return;
    this.sfx('throwHeavy');
    const b = this.ball.spr;
    const startX = b.x;
    const endX = 620;
    const travel = 760;
    b.setDepth(D_ROBOT + 3);
    this.tweens.add({ targets: b, x: endX, y: 296, duration: travel, ease: 'Linear' });
    this.tweens.add({ targets: b, angle: 1080, duration: travel, ease: 'Linear' });
    this.verbStamp('なげる！', this.heroX + 56, 172, PINK_S);

    // 玉の航跡（黄の残像）＝重い物が速く飛んでいることを尾の長さで見せる
    for (let i = 0; i < 9; i++) {
      this.seq(i * 70, () => {
        if (!b.active) return;
        const tr = this.reg(this.add.image(b.x, b.y, 'glow').setBlendMode(ADD)
          .setTint(YELLOW).setScale(1.1).setDepth(D_ROBOT + 2));
        this.tweens.add({ targets: tr, scale: 0.2, alpha: 0, duration: 320,
          onComplete: () => tr.destroy() });
      });
    }

    // 通過した順に薙ぎ倒す（x位置から着弾時刻を逆算＝絵と当たりが一致する）
    const targets = this.robots.filter((r) => r.alive);
    for (const r of targets) {
      const t = ((r.baseX - startX) / (endX - startX)) * travel;
      if (t < 0) continue;
      this.seq(Math.round(t), () => this.billiardHit(r));
    }
    // 撃ち抜けた玉は画面外で消す
    this.seq(travel + 60, () => { if (b.active) b.destroy(); });
  }

  // 1体ぶんの薙ぎ倒し。数字（1,2,3…）と音程を一緒に上げるのが「数えられる」の実装。
  billiardHit(r) {
    if (!r.alive) return;
    r.alive = false;
    this._killCount++;
    const n = this._killCount;
    this.sfx(n >= 4 ? 'crushBoom' : 'crush', 1, 1 + n * 0.08);
    this.burst(r.spr.x, r.spr.y, YELLOW, 9, D_TEXT - 1);
    this.burst(r.spr.x, r.spr.y, PINK, 6, D_TEXT - 1);
    // 撃破数のカウンタ（増えるほど大きく・高く跳ねる）
    const cnt = this.reg(this.add.text(r.spr.x, r.spr.y - 16, String(n), {
      fontFamily: 'monospace', fontSize: (16 + n * 4) + 'px', color: YELLOW_S,
      fontStyle: 'bold', stroke: PINK_S, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT + 1));
    this.tweens.add({ targets: cnt, y: cnt.y - 26 - n * 3, alpha: 0, duration: 620,
      ease: 'Cubic.out', onComplete: () => cnt.destroy() });
    // 弾かれて吹き飛ぶ（横へ流れながら上へ跳ねる＝当たった向きが読める）
    this.tweens.add({ targets: r.spr, x: r.spr.x + 60, y: r.spr.y - 40, angle: 220,
      alpha: 0, scale: 1.2, duration: 520, ease: 'Cubic.out',
      onComplete: () => r.spr.destroy() });
    if (r.eye && r.eye.active) {
      this.tweens.add({ targets: r.eye, alpha: 0, duration: 200,
        onComplete: () => r.eye.destroy() });
    }
  }

  // 動詞のスタンプ（つかむ/ためる/なげる）。同じ位置に順に出して「1本の手順」に見せる。
  verbStamp(txt, x, y, color) {
    const t = this.reg(this.add.text(x, y, txt, {
      fontFamily: 'monospace', fontSize: '26px', color, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 5,
    }).setOrigin(0.5).setScale(1.6).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: y - 14, duration: 260, delay: 380,
      onComplete: () => t.destroy() });
  }

  // =============== ビート 11.7: 収束→ロゴ結像（Title 最終フレームを座標一致で組む） ===============
  beatConverge() {
    const cx = this.W / 2;
    this.sfx('clear');

    if (this.reversalText) this.tweens.add({ targets: this.reversalText, alpha: 0, y: 130, duration: 400,
      onComplete: () => this.reversalText && this.reversalText.destroy() });
    if (this.wash) this.tweens.add({ targets: this.wash, alpha: 0, duration: 500,
      onComplete: () => this.wash && this.wash.destroy() });
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // Title と同一の星背景（tileSprite・alpha0.7）
    this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1').setAlpha(0.7).setDepth(D_STARS));

    this.ripple(cx, 112, YELLOW, D_TEXT - 2);
    this.ripple(cx, 180, PINK, D_TEXT - 2);

    // ロゴ結像（Title と完全一致: 320,112 / 34px / #ffe066 / stroke #ff6ec7 太さ6）
    const logo = this.reg(this.add.text(cx, 112, 'クルット・モビット', {
      fontFamily: 'monospace', fontSize: '34px', color: YELLOW_S,
      fontStyle: 'bold', stroke: PINK_S, strokeThickness: 6,
    }).setOrigin(0.5).setScale(0).setDepth(D_TEXT));
    this.tweens.add({ targets: logo, scale: 1, duration: 420, ease: 'Back.easeOut' });
    this.burst(cx, 112, YELLOW, 12, D_TEXT + 1);

    // サブタイトル（Title 一致: 320,156 / 16px / #7fffcf）
    const sub = this.reg(this.add.text(cx, 156, '〜 KURUTTO MOBIT 〜', {
      fontFamily: 'monospace', fontSize: '16px', color: MINT_S,
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 200 });

    // ★Title 一致（旧版はここが scale 2.4 で、Title の 3.2 と食い違って一瞬跳ねていた）
    if (this.hero) this.tweens.add({ targets: this.hero, x: cx, y: 236, scale: 3.2,
      duration: 400, ease: 'Cubic.out' });

    // 相棒を base 角へ静止させ Title のフレーム1（_a=0）と一致させる（公転停止）。
    this._buddiesActive = false;
    if (this.buddies) {
      for (const b of this.buddies) {
        b.cx = cx;
        const x = cx + Math.cos(b.base) * b.rx;
        const y = b.cy + Math.sin(b.base) * b.ry;
        this.tweens.add({ targets: [b.g, b.spr], x, y, duration: 400, ease: 'Cubic.out' });
      }
    }

    // ★Title 一致: プロンプトは y=306（旧版は312でズレていた）
    const prompt = this.reg(this.add.text(cx, 306, 'SPACE か クリックで スタート', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: prompt, alpha: 1, duration: 300, delay: 300 });
  }

  // --- 局所ヘルパ: 小さな爆散（fx.burstUI 相当を Opening 内にローカル実装） ---
  burst(x, y, colorInt, n, depth) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rnd() * 0.6;
      const d = 20 + this.rnd() * 22;
      const sp = this.reg(this.add.image(x, y, 'spark').setTint(colorInt).setBlendMode(ADD).setDepth(depth));
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        alpha: 0, scale: 0.3, duration: 440, ease: 'Cubic.out', onComplete: () => sp.destroy() });
    }
  }

  // --- 局所ヘルパ: キャンディ・リップル（w_ring 拡大） ---
  ripple(x, y, colorInt, depth) {
    const r = this.reg(this.add.image(x, y, 'w_ring').setTint(colorInt).setBlendMode(ADD)
      .setScale(0.4).setAlpha(0.7).setDepth(depth));
    this.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 640, ease: 'Cubic.out',
      onComplete: () => r.destroy() });
  }

  update(_t, delta) {
    if (this._finished) return;
    const dt = delta / 1000;
    this._et = (this._et || 0) + dt;

    // 雑魚: 単眼の約4Hz明滅＋横1pxジッター（カタカタ）
    if (this._robotsCold && this.robots) {
      const on = Math.floor(this._et * 8) % 2 === 0;
      const jit = (Math.floor(this._et * 30) % 2 === 0) ? 0 : 1;
      for (const r of this.robots) {
        if (!r.alive || !r.spr.active) continue;
        r.spr.x = r.baseX + jit;
        if (r.eye.active) { r.eye.x = r.spr.x; r.eye.setAlpha(on ? 1 : 0.35); }
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

    // 相棒の公転（登場〜収束直前まで）
    if (this._buddiesActive && this.buddies) {
      this._ba += dt;
      for (const b of this.buddies) {
        const ang = b.base + this._ba * 1.8;
        const x = b.cx + Math.cos(ang) * b.rx;
        const y = b.cy + Math.sin(ang) * b.ry;
        b.spr.setPosition(x, y);
        b.g.setPosition(x, y);
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
    for (const o of this._objs) { if (o && o.destroy) o.destroy(); }
    this._objs.length = 0;
    this.scene.start('Title');
  }
}
