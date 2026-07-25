// scenes/Opening.js — コールドオープンのキネティック・タイポ演出（Boot→Opening→Title）。
// コンセプト「鉄のコマンド、ポンッで上書き。」約12.5秒。前半は漆黒＋鋼色/シアンの無機質な脅威、
// 頂点で完全無音を1発置き、次の1拍で全チャンネル同時反転（黒帯開放・モノクロ→キャンディ・書体ポップ・BGM）。
// 冷たいロボが相棒の力で「ポンッ」と星に弾け、光が中央へ収束して既存タイトルのロゴ(y=112)へ座標一致で着地する。
//
// 技術制約: import Phaser 禁止（window.Phaser 参照）。Math.random 禁止（決定的LCGを内蔵）。monospace のみ。
// 白全画面フラッシュは alpha ≤ 0.45 厳守（明るさは有色ADDウォッシュで作る／名前スラムの冷白一閃のみ例外的に短く使用）。
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

// 色（数値=tint用 / 文字=text用）
const CYAN = 0x36e0ff, CYAN_S = '#36e0ff';
const STEEL_S = '#e8ecf2';
const COLD_S = '#dfe6ee';
const YELLOW = 0xffe066, YELLOW_S = '#ffe066';
const PINK = 0xff6ec7, PINK_S = '#ff6ec7';
const MINT_S = '#7fffcf';
const STEEL_TINT = 0x39424d;   // ロボの鋼色シルエット用の暗tint
const EYE_CYAN = 0x36e0ff, EYE_RED = 0xff4d4d;

// 深度レイヤ
const D_STARS = 1, D_WASH = 5, D_ROBOT = 40, D_TEXT = 60, D_BANDS = 100, D_FLASH = 110, D_SKIP = 120;

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
    this._robotsCold = false; // update でロボの明滅/ジッターを回すか
    this._buddiesActive = false; // update で相棒を公転させるか

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

  sfx(name) { if (!this._finished) Sound.sfx(name); }

  // =============== ビート 0.0: コールドオープン（音声解錠ゲート） ===============
  buildColdOpen() {
    const cx = this.W / 2;
    // 上下シネスコ黒帯（各40px）。反転で上下に開く。
    this.topBand = this.reg(this.add.rectangle(cx, 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));
    this.botBand = this.reg(this.add.rectangle(cx, this.H - 20, this.W, 40, 0x000000, 1).setDepth(D_BANDS));

    // 中央の縦のシアン光の亀裂1本（glow を縦長ADDに・髪より細く）＋芯の白ライン。
    this.crackGlow = this.reg(this.add.image(cx, 180, 'glow').setBlendMode(ADD)
      .setTint(CYAN).setScale(0.16, 8).setDepth(D_ROBOT));
    this.crack = this.reg(this.add.rectangle(cx, 180, 2, 190, CYAN, 0.9).setBlendMode(ADD).setDepth(D_ROBOT));
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
    this.seq(1200, () => this.beatName());
    this.seq(2800, () => this.beatNameClear());
    this.seq(3000, () => this.beatCommand('セカイを', 0));
    this.seq(3500, () => this.beatCommand('すべて', 1));
    this.seq(4000, () => this.beatCommand('機械に。', 2));
    this.seq(4300, () => this.beatCommandAlign());
    this.seq(4900, () => this.beatMarch());
    this.seq(6400, () => this.beatPeak());
    this.seq(7200, () => this.beatDemo());
    this.seq(7700, () => this.beatReversal());
    this.seq(8400, () => this.beatHeroes());
    this.seq(9300, () => this.beatPonChain());
    this.seq(10900, () => this.beatConverge());
    this.seq(12200, () => this._goTitle());

    // 行進中(4.9-6.4)の tick連打＋低ランブル
    this.seq(4900, () => this.sfx('voidHum'));
    this.seq(5700, () => this.sfx('voidHum'));
    for (let i = 0; i < 9; i++) this.seq(4900 + i * 160, () => this.sfx('tick'));
  }

  // =============== ビート 1.2: 固有名スラム『ヴォイド・マキナ』 ===============
  beatName() {
    const cx = this.W / 2;
    this.sfx('metalSlam');
    this.sfx('voidHum');

    // 亀裂が裂ける：冷白一閃（alpha≤0.4・一瞬）。名前スラムのみ許される白フラッシュ。
    const flash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0xffffff, 0.4)
      .setDepth(D_FLASH));
    this.tweens.add({ targets: flash, alpha: 0, duration: 130, onComplete: () => flash.destroy() });
    // 亀裂は横に裂けて消える
    this.tweens.add({ targets: [this.crack, this.crackGlow], scaleX: 4, alpha: 0, duration: 180,
      onComplete: () => { this.crack.destroy(); this.crackGlow.destroy(); } });

    // RGBずらし（薄く=可読優先）。シアン/ピンクの薄い分身を背後に。
    const rgb = [];
    for (const [dx, col] of [[-2, CYAN_S], [2, PINK_S]]) {
      rgb.push(this.reg(this.add.text(cx + dx, 150, 'ヴォイド・マキナ', {
        fontFamily: 'monospace', fontSize: '38px', color: col, fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.28).setDepth(D_TEXT)));
    }
    const name = this.reg(this.add.text(cx, 150, 'ヴォイド・マキナ', {
      fontFamily: 'monospace', fontSize: '38px', color: STEEL_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT));
    // scale1.15→1.0 のスナップ着弾
    [name, ...rgb].forEach((o) => o.setScale(1.15));
    this.tweens.add({ targets: [name, ...rgb], scale: 1.0, duration: 160, ease: 'Back.easeOut' });

    const sub = this.reg(this.add.text(cx, 190, '― せかいの すきま より ―', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa6b2',
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 120 });

    this.nameGroup = [name, sub, ...rgb];
  }

  // ビート 2.8: 固有名を消して一瞬の黒（命令の前置き）
  beatNameClear() {
    if (!this.nameGroup) return;
    const g = this.nameGroup;
    this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.forEach((o) => o.destroy()) });
    this.nameGroup = null;
  }

  // =============== ビート 3.0: 命令3連（可読死守・機械のコマンド行） ===============
  beatCommand(txt, idx) {
    this.sfx('tick');
    if (!this.cmdObjs) this.cmdObjs = [];
    const x = this.W / 2 - 96;
    const y = 138 + idx * 30;
    const t = this.reg(this.add.text(x, y, '▸ ' + txt, {
      fontFamily: 'monospace', fontSize: '22px', color: STEEL_S, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setAlpha(0).setDepth(D_TEXT));
    // シアンのキャレット▮点滅
    const caret = this.reg(this.add.text(t.x + t.width + 4, y, '▮', {
      fontFamily: 'monospace', fontSize: '20px', color: CYAN_S,
    }).setOrigin(0, 0.5).setDepth(D_TEXT));
    this.tweens.add({ targets: caret, alpha: 0.1, duration: 260, yoyo: true, repeat: -1 });
    // スタンプ着弾（一瞬拡大→定位）
    t.setScale(1.2, 1.2);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 130, ease: 'Back.easeOut' });
    this.cmdObjs.push(t, caret);
  }

  // ビート 4.3: 一瞬1文に整列し冷たく静止
  beatCommandAlign() {
    if (this.cmdObjs) {
      const g = this.cmdObjs;
      this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.forEach((o) => o.destroy()) });
      this.cmdObjs = null;
    }
    const cx = this.W / 2;
    // 角括弧の縁取り付きで1文に整列（核命令＝可読死守）
    const line = this.reg(this.add.text(cx, 150, '［ セカイを すべて 機械に。 ］', {
      fontFamily: 'monospace', fontSize: '20px', color: STEEL_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(D_TEXT));
    this.tweens.add({ targets: line, alpha: 1, duration: 160 });
    this.cmdLine = line;
  }

  // =============== ビート 4.9: 金属のむれ・単眼行進 ===============
  beatMarch() {
    const count = 7;
    const keys = ['enemy_gareon', 'enemy_chibit', 'enemy_bomba'];
    this.robots = [];
    for (let i = 0; i < count; i++) {
      const baseX = 70 + i * 83;
      const key = keys[i % keys.length];
      const spr = this.reg(this.add.image(baseX, 380, key).setScale(2.4)
        .setTint(STEEL_TINT).setDepth(D_ROBOT));
      // 単眼を cyan/red で点灯（glow極小ADD・約4Hz明滅）
      const eyeCol = (i % 2 === 0) ? EYE_CYAN : EYE_RED;
      const eye = this.reg(this.add.image(baseX, 380 - 8, 'glow').setBlendMode(ADD)
        .setTint(eyeCol).setScale(0.5).setDepth(D_ROBOT + 1));
      // 下辺へスライドイン（staggered）
      this.tweens.add({ targets: spr, y: 300, duration: 420, delay: i * 70, ease: 'Cubic.out' });
      this.tweens.add({ targets: eye, y: 300 - 10, duration: 420, delay: i * 70, ease: 'Cubic.out' });
      this.robots.push({ spr, eye, baseX });
    }
    this._robotsCold = true;

    // 走査線オーバーレイ（CRT風・静的）
    const sl = this.reg(this.add.graphics().setDepth(82));
    sl.fillStyle(0x000000, 0.18);
    for (let y = 0; y < this.H; y += 3) sl.fillRect(0, y, this.W, 1);
    this.scanline = sl;

    // 上に極小テキスト
    this.marchText = [
      this.reg(this.add.text(this.W / 2, 96, '金属のむれ', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8a93a0',
      }).setOrigin(0.5).setDepth(D_TEXT)),
      this.reg(this.add.text(520, 120, 'カタ カタ', {
        fontFamily: 'monospace', fontSize: '11px', color: '#8a93a0',
      }).setOrigin(0.5).setDepth(D_TEXT)),
    ];
  }

  // =============== ビート 6.4: 脅威の頂点＋タメ ===============
  beatPeak() {
    this.sfx('warning'); // 唯一の緊張音（約1.1s・小音量・直後に解決）
    // 単眼を強く明滅（tweenでスケール脈動）
    if (this.robots) {
      for (const r of this.robots) {
        this.tweens.add({ targets: r.eye, scale: 0.85, duration: 130, yoyo: true, repeat: 4 });
      }
    }
    // 赤アラート1回パルス（alpha≤0.45厳守）
    const alert = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xff2222, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: alert, alpha: 0.25, duration: 140, yoyo: true,
      onComplete: () => alert.destroy() });
    // 黒帯が小刻みに震える
    for (const b of [this.topBand, this.botBand]) {
      if (b) this.tweens.add({ targets: b, x: this.W / 2 + 3, duration: 45, yoyo: true, repeat: 6 });
    }
  }

  // =============== ビート 7.2: 反転の刃『でも』＋完全無音へ ===============
  beatDemo() {
    // ここから効果音を突然カット（何も予約しない）→ サイレン残響が引いて完全無音になる。
    const cx = this.W / 2;
    // 背後にキャンディ色の亀裂を予兆として仕込む
    const preCrack = this.reg(this.add.rectangle(cx, 180, 3, 150, PINK, 0).setBlendMode(ADD).setDepth(D_ROBOT));
    this.tweens.add({ targets: preCrack, alpha: 0.5, duration: 300 });
    this.preCrack = preCrack;
    // 『でも』が横切って着弾（まだ冷白）
    const demo = this.reg(this.add.text(-80, 178, 'でも', {
      fontFamily: 'monospace', fontSize: '34px', color: COLD_S, fontStyle: 'bold',
      stroke: '#0a0d12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(D_TEXT));
    this.tweens.add({ targets: demo, x: cx, duration: 260, ease: 'Cubic.out' });
    this.demoText = demo;
  }

  // =============== ビート 7.7: 反転爆発『だいじょうぶ！』＝全チャンネル同時反転 ===============
  beatReversal() {
    const cx = this.W / 2;
    // 音: 無音を破って capture＋powerup、同時に BGM(battle) 開始
    this.sfx('capture');
    this.sfx('powerup');
    if (!this._finished) Sound.startBgm('battle');

    // ① 黒帯が上下に開く
    if (this.topBand) this.tweens.add({ targets: this.topBand, y: -60, duration: 520, ease: 'Cubic.out',
      onComplete: () => this.topBand && this.topBand.destroy() });
    if (this.botBand) this.tweens.add({ targets: this.botBand, y: this.H + 60, duration: 520, ease: 'Cubic.out',
      onComplete: () => this.botBand && this.botBand.destroy() });

    // ② パレット反転：モノクロ→キャンディ（白フラッシュは使わない・有色ADDウォッシュで明るさを作る）
    const wash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, YELLOW, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: wash, alpha: 0.28, duration: 160, yoyo: true });
    const pinkWash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, PINK, 0)
      .setBlendMode(ADD).setDepth(D_WASH));
    this.tweens.add({ targets: pinkWash, alpha: 0.14, duration: 220 });
    this.wash = pinkWash; // 収束で 0 へ戻す
    // 走査線/カタカタ演出は消灯（世界が反転）
    this._robotsCold = false;
    if (this.scanline) this.tweens.add({ targets: this.scanline, alpha: 0, duration: 300,
      onComplete: () => this.scanline && this.scanline.destroy() });
    if (this.marchText) this.marchText.forEach((t) => this.tweens.add({ targets: t, alpha: 0, duration: 250 }));
    if (this.cmdLine) this.tweens.add({ targets: this.cmdLine, alpha: 0, duration: 250 });
    if (this.demoText) this.tweens.add({ targets: this.demoText, alpha: 0, scale: 1.4, duration: 300,
      onComplete: () => this.demoText && this.demoText.destroy() });
    if (this.preCrack) this.tweens.add({ targets: this.preCrack, alpha: 0, duration: 250 });

    // ③『だいじょうぶ！』が Back.easeOut で弾んで発色（黄/ピンク）・書体ポップ化
    const yes = this.reg(this.add.text(cx, 175, 'だいじょうぶ！', {
      fontFamily: 'monospace', fontSize: '44px', color: YELLOW_S, fontStyle: 'bold',
      stroke: PINK_S, strokeThickness: 6,
    }).setOrigin(0.5).setScale(0).setDepth(D_TEXT));
    this.tweens.add({ targets: yes, scale: 1.15, duration: 380, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: yes, scale: 1.0, duration: 140 }) });
    this.reversalText = yes;
    // キャンディの小さなきらめきを一斉に
    this.burst(cx, 175, YELLOW, 14, D_TEXT - 1);
    this.burst(cx, 175, PINK, 10, D_TEXT - 1);
  }

  // =============== ビート 8.4: 主人公＆相棒登場 ===============
  beatHeroes() {
    const cx = this.W / 2;
    // player_1 がバウンド着地（scale3）。収束で 2.4 へ寄せて Title に一致させる。
    this.hero = this.reg(this.add.image(cx, 120, 'player_1').setScale(3).setDepth(D_ROBOT + 2));
    this.tweens.add({ targets: this.hero, y: 236, duration: 620, ease: 'Bounce.easeOut' });

    // mon_starpuppy が周囲を公転（Title と同じ glow+orb 構成・収束で base に静止させ座標一致）
    this.buddies = [];
    for (let i = 0; i < 5; i++) {
      const base = (i / 5) * Math.PI * 2;
      const g = this.reg(this.add.image(0, 0, 'glow').setBlendMode(ADD).setScale(1.4)
        .setTint(0x7fd8ff).setDepth(D_ROBOT + 1));
      const orb = this.reg(this.add.image(0, 0, 'mon_starpuppy').setScale(1.6).setDepth(D_ROBOT + 2));
      this.buddies.push({ g, spr: orb, base, cx, cy: 236, rx: 46, ry: 26 });
    }
    this._ba = 0;
    this._buddiesActive = true;

    // w_star2 のきらめき
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = this.reg(this.add.image(cx + Math.cos(a) * 30, 236 + Math.sin(a) * 20, 'w_star2')
        .setBlendMode(ADD).setTint(YELLOW).setScale(0).setDepth(D_TEXT - 1));
      this.tweens.add({ targets: st, scale: 1.6, alpha: 0, duration: 600, delay: i * 40,
        ease: 'Cubic.out', onComplete: () => st.destroy() });
    }
  }

  // =============== ビート 9.3: ポンッ！連鎖 ===============
  beatPonChain() {
    this._robotsCold = false;
    if (!this.robots) return;
    this.robots.forEach((r, i) => {
      this.seq(i * 140, () => {
        this.sfx('pop');
        this.burst(r.spr.x, r.spr.y, YELLOW, 8, D_TEXT - 1);
        // w_star2＋小さな星に変わって弾ける
        const star = this.reg(this.add.image(r.spr.x, r.spr.y, 'w_star2').setBlendMode(ADD)
          .setTint(PINK).setScale(1).setDepth(D_TEXT));
        this.tweens.add({ targets: star, y: r.spr.y - 30, scale: 2, alpha: 0, duration: 520,
          ease: 'Cubic.out', onComplete: () => star.destroy() });
        const pon = this.reg(this.add.text(r.spr.x, r.spr.y - 14, 'ポンッ', {
          fontFamily: 'monospace', fontSize: '13px', color: YELLOW_S, fontStyle: 'bold',
          stroke: PINK_S, strokeThickness: 3,
        }).setOrigin(0.5).setDepth(D_TEXT));
        this.tweens.add({ targets: pon, y: pon.y - 16, alpha: 0, duration: 520,
          onComplete: () => pon.destroy() });
        r.spr.destroy();
        r.eye.destroy();
      });
    });
  }

  // =============== ビート 10.9: 収束→ロゴ結像（Title 最終フレームを座標一致で組む） ===============
  beatConverge() {
    const cx = this.W / 2;
    this.sfx('clear'); // 締めの明るいチャイム（BGMは継続）

    // 反転テキストは中央のロゴへ道を譲る
    if (this.reversalText) this.tweens.add({ targets: this.reversalText, alpha: 0, y: 130, duration: 400,
      onComplete: () => this.reversalText && this.reversalText.destroy() });
    // キャンディウォッシュを 0 へ戻し、背景を Title と同じ濃紺へ寄せる
    if (this.wash) this.tweens.add({ targets: this.wash, alpha: 0, duration: 500,
      onComplete: () => this.wash && this.wash.destroy() });
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // Title と同一の星背景（tileSprite・alpha0.7）
    this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1').setAlpha(0.7).setDepth(D_STARS));

    // 収束のキャンディ・リップル（ロゴ位置と中央に）
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

    // player を Title 一致へ（320,236 / scale2.4）
    if (this.hero) this.tweens.add({ targets: this.hero, x: cx, y: 236, scale: 2.4, duration: 400, ease: 'Cubic.out' });

    // 相棒を base 角へ静止させ Title のフレーム1（_a=0）と一致させる（公転停止）。
    this._buddiesActive = false;
    if (this.buddies) {
      for (const b of this.buddies) {
        const x = b.cx + Math.cos(b.base) * b.rx;
        const y = b.cy + Math.sin(b.base) * b.ry;
        this.tweens.add({ targets: [b.g, b.spr], x, y, duration: 400, ease: 'Cubic.out' });
      }
    }

    // プロンプト（Title 一致: 320,312）
    const prompt = this.reg(this.add.text(cx, 312, 'SPACE か クリックで スタート', {
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

    // ロボ: 単眼の約4Hz明滅＋横1pxジッター（カタカタ）
    if (this._robotsCold && this.robots) {
      const on = Math.floor(this._et * 8) % 2 === 0;
      const jit = (Math.floor(this._et * 30) % 2 === 0) ? 0 : 1;
      for (const r of this.robots) {
        if (!r.spr.active) continue;
        r.spr.x = r.baseX + jit;
        r.eye.x = r.spr.x;
        r.eye.setAlpha(on ? 1 : 0.35);
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
