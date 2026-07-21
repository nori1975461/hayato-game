// scenes/Title.js — ロゴと開始待ち。最初の入力で Sound.init して Run へ（PROTOTYPE_SPEC §5.2）。
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    // シーンインスタンスは scene.start() で再利用されるため、再入のたびに開始フラグを戻す
    this._started = false;
    const W = 640, H = 360;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // 背景の星（軽い装飾）
    const bg = this.add.tileSprite(W / 2, H / 2, W, H, 'stars1');
    bg.setAlpha(0.7);
    this.bg = bg;

    // ロゴ
    const logo = this.add.text(W / 2, 118, 'ボルモン！', {
      fontFamily: 'monospace', fontSize: '46px', color: '#ffe066',
      fontStyle: 'bold', stroke: '#ff6ec7', strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: logo, scale: 1.06, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(W / 2, 166, '〜 VORTEX MONSTERS 〜', {
      fontFamily: 'monospace', fontSize: '16px', color: '#7fffcf',
    }).setOrigin(0.5);

    // デモ的に自機とグローを回す。シーン再入のたびに配列を作り直す
    // （破棄済み GameObject 参照の蓄積を防ぐ）。
    const demo = this.add.image(W / 2, 236, 'player_1').setScale(2.4);
    this.orbit = [];
    for (let i = 0; i < 5; i++) {
      const g = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.4).setTint(0x7fd8ff);
      const orb = this.add.image(0, 0, 'mon_starpuppy').setScale(1.6);
      this.orbit.push({ g, orb, base: (i / 5) * Math.PI * 2, cx: W / 2, cy: 236 });
    }

    const prompt = this.add.text(W / 2, 312, 'SPACE か クリックで スタート', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 650,
      yoyo: true, repeat: -1 });

    // autotest はタイトルをスキップして即 Run（Sound.init は呼ばない）
    const V = window.VORTEX || {};
    if (V.autotest) {
      this.time.delayedCall(0, () => this.startRun(false));
      return;
    }

    const begin = () => {
      if (this._started) return;
      this._started = true;
      Sound.init();
      this.startRun(true);
    };
    this.input.keyboard.once('keydown-SPACE', begin);
    this.input.once('pointerdown', begin);
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
    const dt = delta / 1000;
    this._a = (this._a || 0) + dt;
    if (this.orbit) {
      for (const o of this.orbit) {
        const ang = o.base + this._a * 1.6;
        const x = o.cx + Math.cos(ang) * 46;
        const y = o.cy + Math.sin(ang) * 26;
        o.orb.setPosition(x, y);
        o.g.setPosition(x, y);
      }
    }
  }

  startRun(withAudio) {
    this.scene.start('Run', { withAudio: !!withAudio });
  }
}
