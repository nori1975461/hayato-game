// scenes/Result.js — リザルト画面（PROTOTYPE_SPEC §5.4）。
// Run.js から { clear, elapsed, kills, captures, coins, party:[id...] } を受け取り表示。
// clear/gameover SFX は Run.js 側で発火済み。BGM はリザルト曲へ本シーンで切り替える（withAudio 時のみ）。
import { MONSTERS } from '../data/monsters.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

function mmss(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ':' + (r < 10 ? '0' + r : r);
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data) {
    // シーンインスタンスは scene.start() で再利用されるため、再入のたびに完了フラグを戻す
    this._done = false;
    const W = 640, H = 360;
    const d = data || {};
    const clear = !!d.clear;
    const bossDefeated = !!d.bossDefeated;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // リザルトBGM（Run.js が withAudio を渡したときだけ。二重初期化にはならない）
    if (d.withAudio) Sound.startBgm('result');

    // 背景の星（Title と同じ装飾）
    const bg = this.add.tileSprite(W / 2, H / 2, W, H, 'stars1').setAlpha(0.7);
    this.bg = bg;

    // 見出し
    const headText = clear ? 'クリア！' : 'ゲームオーバー';
    const headColor = clear ? '#ffe066' : '#ff6e6e';
    const headStroke = clear ? '#ff6ec7' : '#7a1030';
    const head = this.add.text(W / 2, 52, headText, {
      fontFamily: 'monospace', fontSize: '38px', color: headColor,
      fontStyle: 'bold', stroke: headStroke, strokeThickness: 6,
    }).setOrigin(0.5);
    this.tweens.add({ targets: head, scale: 1.06, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(W / 2, 92, clear ? '5ふん いきのびた！' : 'またチャレンジしよう', {
      fontFamily: 'monospace', fontSize: '14px', color: '#7fffcf',
    }).setOrigin(0.5);

    // ボス撃破の特別表示
    if (bossDefeated) {
      const bd = this.add.text(W / 2, 110, 'ボスを たおした！', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffd23f',
        fontStyle: 'bold', stroke: '#ff6ec7', strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: bd, scale: 1.12, duration: 700,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // 成績（左寄せの4行）
    const rows = [
      ['せいぞんタイム', mmss(d.elapsed || 0)],
      ['たおした かず', String(d.kills || 0)],
      ['つかまえた かず', String(d.captures || 0)],
      ['コイン', String(d.coins || 0)],
    ];
    const baseY = 128;
    for (let i = 0; i < rows.length; i++) {
      const y = baseY + i * 26;
      this.add.text(180, y, rows[i][0], {
        fontFamily: 'monospace', fontSize: '15px', color: '#cfe6ff',
      }).setOrigin(0, 0.5);
      this.add.text(460, y, rows[i][1], {
        fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(1, 0.5);
    }

    // 最終パーティ5枠
    this.add.text(W / 2, 250, 'さいごの なかま', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd6f0',
    }).setOrigin(0.5);
    const ids = Array.isArray(d.party) ? d.party : [];
    const slots = 5;
    const slotW = 56, gap = 8;
    const totalW = slots * slotW + (slots - 1) * gap;
    const startX = W / 2 - totalW / 2 + slotW / 2;
    const slotY = 288;
    for (let i = 0; i < slots; i++) {
      const x = startX + i * (slotW + gap);
      this.add.rectangle(x, slotY, slotW, slotW, 0x14224a, 1)
        .setStrokeStyle(2, 0x4de1c0);
      const id = ids[i];
      if (id != null) {
        const def = MONSTERS.flatMap((m) => [m, m.evo]).find((m) => m && m.id === id);
        if (def) {
          this.add.image(x, slotY, 'glow').setBlendMode(Phaser.BlendModes.ADD)
            .setTint(int(def.color)).setScale(1.6);
          this.add.image(x, slotY, 'mon_' + def.id).setScale(2.4);
        }
      }
    }

    // 操作案内
    const prompt = this.add.text(W / 2, 338, 'R か クリックで タイトルへ', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 650,
      yoyo: true, repeat: -1 });

    const toTitle = () => {
      if (this._done) return;
      this._done = true;
      Sound.stopBgm();
      this.scene.start('Title');
    };
    this.input.keyboard.on('keydown-R', toTitle);
    this.input.keyboard.on('keydown-SPACE', toTitle);
    this.input.on('pointerdown', toTitle);
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
  }
}
