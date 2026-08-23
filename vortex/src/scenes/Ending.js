// scenes/Ending.js — エンディング（マオウレクス撃破 → ここ → Result）。
// 実プレイFB「簡易版でいいのでエンディングをつくって。モビットたちと一緒に宇宙の脅威を倒した！
// という感じで。ただ簡易版といえどプレイヤーの満足度が高いものを」。
//
// 満足度は「長さ」ではなく **自分のプレイが名指しで讃えられること** で作る。だから:
//   ①最後まで連れて行ったモビットを1体ずつ名前つきで登場させ、②自分の記録を読み上げ、
//   ③最後に主人公となかまが並んだ絵で締める。汎用の「クリアおめでとう」で終わらせない。
//
// 技術制約は Opening.js と同じ：import Phaser 禁止（window.Phaser）・Math.random 禁止（決定的LCG）・
// monospace のみ・白全画面フラッシュは alpha < 0.5 厳守。SPACE/クリックでいつでもスキップできる。
import { MONSTERS } from '../data/monsters.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);

const YELLOW_S = '#ffe066';
const PINK_S = '#ff6ec7';
const MINT_S = '#7fffcf';
const CYAN_S = '#8fd0ff';
const WHITE_S = '#ffffff';

// 深度レイヤ
const D_STARS = 1, D_PLANET = 4, D_FX = 20, D_ACTOR = 40, D_TEXT = 60, D_FLASH = 110, D_SKIP = 120;

// なかま1体ぶんのねぎらい。id で引く（進化後の id も拾えるよう evo 側も並べる）。
// 「よくやった」ではなく **そのモビットが実際にやったこと** を書く＝連れて行った意味が残る。
const PRAISE = {
  starpuppy:   'いっしょに はしってくれた！',
  comethound:  'ほしを けって かけぬけた！',
  togeron:     'ハンマーで みちを ひらいた！',
  togeking:    'でっかい ハンマーで ぜんぶ ふきとばした！',
  pikabit:     'ビリビリで めを くらませた！',
  thunderbit:  'かみなりで そらを わった！',
  samet:       'みずでっぽうで えんごしてくれた！',
  megasamet:   'おおなみで まとめて おしながした！',
  neonworm:    'にじいろの わで つつんでくれた！',
  neonmoth:    'ひかりの りんぷんで まもってくれた！',
  aurajelly:   'もこもこで こうげきを うけとめた！',
  aurorajelly: 'オーロラで みんなを つつんだ！',
  mashumo:     'いつも きずを なおしてくれた！',
  heartangel:  'なんども たちあがらせてくれた！',
  biricco:     'らいこうだんを わたしてくれた！',
  raijinger:   'かみなりの たまを うちこんでくれた！',
};

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create(data) {
    this.data0 = data || {};
    this.W = 640;
    this.H = 360;
    this._objs = [];
    this._timers = [];
    this._finished = false;
    this._lcg = 0x51ed7a10;   // 決定的擬似乱数（Math.random 禁止）
    this._confetti = [];
    this.cameras.main.setBackgroundColor('#02030a');

    // autotest はエンディングを飛ばして即 Result（既存の自動テスト/CDPを止めない）
    const V = window.VORTEX || {};
    if (V.autotest) { this.toResult(); return; }

    // スキップ（いつでも・二重発火ガードつき）
    this.input.keyboard.on('keydown-SPACE', () => this.toResult());
    this.input.keyboard.on('keydown-ENTER', () => this.toResult());
    this.time.delayedCall(600, () => { this.input.on('pointerdown', () => this.toResult()); });
    this.skipHint = this.reg(this.add.text(this.W - 12, this.H - 12, 'SPACE で とばす ▶', {
      fontFamily: 'monospace', fontSize: '12px', color: '#6f8aa8',
    }).setOrigin(1, 1).setDepth(D_SKIP).setAlpha(0));
    this.tweens.add({ targets: this.skipHint, alpha: 0.75, duration: 400, delay: 1200 });

    this.playSequence();
  }

  rnd() {
    this._lcg = (this._lcg * 1103515245 + 12345) & 0x7fffffff;
    return this._lcg / 0x7fffffff;
  }
  reg(o) { this._objs.push(o); return o; }
  seq(ms, fn) {
    const t = this.time.delayedCall(ms, () => { if (!this._finished) fn(); });
    this._timers.push(t);
    return t;
  }
  sfx(name, a, p) { if (!this._finished) Sound.sfx(name, a, p); }

  // ================= 全体の進行 =================
  playSequence() {
    const cx = this.W / 2;

    // --- ビート1（0.0s）：撃破の余韻。暗い画面に残り火だけが漂う ---
    this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1')
      .setAlpha(0.25).setDepth(D_STARS).setName('bg'));
    this.bg = this._objs[this._objs.length - 1];
    for (let i = 0; i < 14; i++) {
      const e = this.reg(this.add.image(this.rnd() * this.W, this.rnd() * this.H, 'glow')
        .setBlendMode(ADD).setDepth(D_FX).setTint(0xff5a2a)
        .setScale(0.25 + this.rnd() * 0.5).setAlpha(0.5));
      this.tweens.add({ targets: e, y: e.y - 40 - this.rnd() * 60, alpha: 0,
        duration: 2200 + this.rnd() * 1400, ease: 'Sine.out' });
    }
    this.seq(200, () => this.sfx('voidHum'));

    // --- ビート2（1.4s）：ひかりが戻る。星空が明るくなり、凱歌が始まる ---
    this.seq(1400, () => {
      const wash = this.reg(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0xffffff, 0)
        .setBlendMode(ADD).setDepth(D_FLASH));
      this.tweens.add({ targets: wash, alpha: 0.42, duration: 260, yoyo: true,
        onComplete: () => wash.destroy() });
      if (this.bg) this.tweens.add({ targets: this.bg, alpha: 0.85, duration: 1400 });
      if (this.data0.withAudio) Sound.startBgm('ending');
      this.sfx('clear');
      this.line(cx, 150, 'せかいに ひかりが もどった', MINT_S, 20, 0);
    });

    // --- ビート3（3.0s）：宇宙の脅威＝マオウレクスを倒した、という宣言 ---
    this.seq(3000, () => {
      this.fadeOutTexts();
      this.bigTelop('うちゅうの きょういを たおした！', YELLOW_S, 118, 28);
      this.burstStars(cx, 150, 22);
      this.sfx('levelup');
      this.cameras.main.shake(240, 0.004);
    });
    this.seq(3900, () => {
      this.line(cx, 168, 'マオウレクスは ひかりの つぶになって きえた', CYAN_S, 14, 0);
    });

    // --- ビート4（5.4s〜）：なかま紹介。1体ずつ名前とねぎらい ---
    this.seq(5400, () => { this.fadeOutTexts(); this.buildStage(); });
    const ids = Array.isArray(this.data0.party) ? this.data0.party.filter((x) => x != null) : [];
    const list = ids.length ? ids : ['starpuppy'];
    const step = 1250;
    list.forEach((id, i) => {
      this.seq(6000 + i * step, () => this.introBuddy(id, i, list.length));
    });
    const afterBuddies = 6000 + list.length * step + 700;

    // --- ビート5：全員そろって「ありがとう」＋主人公のジャンプ ---
    this.seq(afterBuddies, () => {
      this.fadeOutTexts();
      this.bigTelop('みんなで かちとった しょうり！', PINK_S, 150, 22);
      this.cheer();
    });

    // --- ビート6：この回の記録（自分のプレイが名指しで残る） ---
    const recAt = afterBuddies + 1700;
    this.seq(recAt, () => { this.fadeOutTexts(); this.showRecord(); });

    // --- ビート7：締め ---
    const endAt = recAt + 3800;
    this.seq(endAt, () => {
      this.fadeOutTexts();
      this.bigTelop('クルット・モビット', WHITE_S, 128, 30);
      this.seq(700, () => this.line(cx, 172, '〜 THE END 〜', YELLOW_S, 18, 0));
      this.seq(1500, () => {
        if (this.skipHint) this.tweens.add({ targets: this.skipHint, alpha: 0, duration: 200 });
        const p = this.line(cx, 202, 'SPACE で けっかを みる', MINT_S, 15, 0);
        this.tweens.add({ targets: p, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });
      });
      this.burstStars(cx, 150, 30);
      this.sfx('clear');
    });
  }

  // ================= 舞台（惑星と主人公） =================
  buildStage() {
    const cx = this.W / 2;
    // 足元の惑星（青い弧）。ドット絵の世界観を壊さないよう、単色＋淡いグロウだけで描く。
    const g = this.reg(this.add.graphics().setDepth(D_PLANET));
    g.fillStyle(0x1b3f7a, 1);
    g.fillCircle(cx, 560, 300);
    g.fillStyle(0x2f6fbf, 1);
    g.fillCircle(cx, 566, 300);
    g.lineStyle(3, 0x7fd8ff, 0.9);
    g.strokeCircle(cx, 560, 300);
    this.reg(this.add.image(cx, 280, 'glow').setBlendMode(ADD).setDepth(D_PLANET)
      .setTint(0x4f8cff).setScale(14, 5).setAlpha(0.22));

    // 主人公（星の上に立つ）
    this.hero = this.reg(this.add.image(cx, 200, 'player').setScale(3).setDepth(D_ACTOR + 2));
    this.tweens.add({ targets: this.hero, y: 258, duration: 620, ease: 'Bounce.easeOut' });
    this.reg(this.add.image(cx, 258, 'glow').setBlendMode(ADD).setDepth(D_ACTOR)
      .setTint(0x4f8cff).setScale(2.6).setAlpha(0.45));
    this.buddies = [];
  }

  // id → { def, color, name }。⚠️ 進化形態(evo)は color を持たない（基本形から継承する仕様）ので、
  //   evo.color をそのまま使うと undefined になる。色は必ず基本形から引く。
  findMon(id) {
    for (const m of MONSTERS) {
      if (m.id === id) return { def: m, color: m.color, name: m.name };
      if (m.evo && m.evo.id === id) return { def: m.evo, color: m.color, name: m.evo.name };
    }
    return null;
  }

  // なかま1体を舞台へ。名前とねぎらいを出す。
  introBuddy(id, i, total) {
    const mon = this.findMon(id);
    if (!mon) return;
    const def = mon.def;
    const cx = this.W / 2;
    // 主人公を中心に、左右交互へ並べる（1体でも5体でも絵が崩れない）
    const side = i % 2 === 0 ? -1 : 1;
    const rank = Math.floor(i / 2) + 1;
    const x = cx + side * (52 + rank * 34);
    const y = 252 + (i % 2 === 0 ? 6 : -6);

    const glow = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_ACTOR)
      .setTint(int(mon.color)).setScale(0).setAlpha(0.7));
    const spr = this.reg(this.add.image(x, y - 70, 'mon_' + def.id).setScale(3).setDepth(D_ACTOR + 1).setAlpha(0));
    this.tweens.add({ targets: glow, scale: 2.2, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: spr, y, alpha: 1, duration: 380, ease: 'Bounce.easeOut' });
    // 着地したらぴょんぴょん跳ね続ける（生きている感じ＝集合写真にしない）
    this.seq(400, () => {
      this.tweens.add({ targets: spr, y: y - 9, duration: 420 + i * 40,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    this.buddies.push({ spr, glow });
    this.burstStars(x, y - 10, 8);
    this.sfx('pop');

    // 名前とねぎらい（1体ずつ入れ替える＝読める速度に落とす）
    this.fadeOutTexts();
    this.line(cx, 76, mon.name, mon.color, 22, 0);
    this.line(cx, 106, PRAISE[def.id] || 'さいごまで たたかいぬいた！', WHITE_S, 15, 0);
    if (total > 1) this.line(cx, 48, `なかま ${i + 1} / ${total}`, '#8aa0b8', 12, 0);
  }

  // 全員で歓声：主人公が跳ね、なかまが一斉に跳び、紙吹雪が降る
  cheer() {
    if (this.hero) {
      this.tweens.add({ targets: this.hero, y: this.hero.y - 26, duration: 260,
        yoyo: true, repeat: 2, ease: 'Sine.out' });
    }
    (this.buddies || []).forEach((b, i) => {
      this.seq(i * 70, () => {
        this.tweens.add({ targets: b.spr, y: b.spr.y - 30, duration: 240, yoyo: true, ease: 'Sine.out' });
        this.burstStars(b.spr.x, b.spr.y - 12, 10);
      });
    });
    this.sfx('gaugeFull');
    this.dropConfetti(60);
  }

  // 紙吹雪。update で落とす（tween を60個積むより軽い）。
  dropConfetti(n) {
    const cols = [0xffe066, 0xff6ec7, 0x7fffcf, 0x8fd0ff, 0xffffff];
    for (let i = 0; i < n; i++) {
      const c = cols[Math.floor(this.rnd() * cols.length) % cols.length];
      const spr = this.reg(this.add.rectangle(this.rnd() * this.W, -20 - this.rnd() * 260,
        3 + this.rnd() * 3, 6 + this.rnd() * 4, c, 1).setDepth(D_FX));
      this._confetti.push({ spr, vy: 42 + this.rnd() * 70, vx: (this.rnd() - 0.5) * 34,
        rot: (this.rnd() - 0.5) * 5 });
    }
  }

  // この回の記録。1行ずつスタンプのように出す＝「自分がやったこと」を数字で見せる。
  showRecord() {
    const cx = this.W / 2;
    const d = this.data0;
    const mm = Math.max(0, Math.floor(d.elapsed || 0));
    const time = Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0');
    this.line(cx, 76, '― この ぼうけんの きろく ―', MINT_S, 15, 0);
    const rows = [
      ['たたかった じかん', time],
      ['たおした かず', String(d.kills || 0) + ' たい'],
      ['つかまえた なかま', String(d.captures || 0) + ' たい'],
      ['あつめた コイン', String(d.coins || 0)],
    ];
    rows.forEach((r, i) => {
      this.seq(i * 420, () => {
        const y = 124 + i * 30;
        const l = this.reg(this.add.text(cx - 140, y, r[0], {
          fontFamily: 'monospace', fontSize: '15px', color: '#cfe6ff',
        }).setOrigin(0, 0.5).setDepth(D_TEXT).setAlpha(0));
        const v = this.reg(this.add.text(cx + 150, y, r[1], {
          fontFamily: 'monospace', fontSize: '18px', color: YELLOW_S, fontStyle: 'bold',
          stroke: '#00131f', strokeThickness: 4,
        }).setOrigin(1, 0.5).setDepth(D_TEXT).setAlpha(0).setScale(1.6));
        this._texts.push(l, v);
        this.tweens.add({ targets: l, alpha: 1, duration: 180 });
        this.tweens.add({ targets: v, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
        this.sfx('select');
      });
    });
  }

  // ================= 小道具 =================
  get _texts() {
    if (!this.__texts) this.__texts = [];
    return this.__texts;
  }
  line(x, y, text, color, size, delay) {
    const t = this.reg(this.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: size + 'px', color,
      stroke: '#00131f', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(D_TEXT).setAlpha(0));
    this._texts.push(t);
    this.tweens.add({ targets: t, alpha: 1, duration: 220, delay: delay || 0, ease: 'Sine.out' });
    return t;
  }
  bigTelop(text, color, y, size) {
    const t = this.reg(this.add.text(this.W / 2, y, text, {
      fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: 'bold',
      stroke: '#00131f', strokeThickness: 7, align: 'center',
    }).setOrigin(0.5).setDepth(D_TEXT).setAlpha(0).setScale(1.7));
    this._texts.push(t);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, scale: 1.05, duration: 900, delay: 320,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return t;
  }
  fadeOutTexts() {
    const list = this._texts.slice();
    this.__texts = [];
    for (const t of list) {
      if (!t || !t.scene) continue;
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, alpha: 0, duration: 200, onComplete: () => t.destroy() });
    }
  }
  burstStars(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + this.rnd();
      const d = 26 + this.rnd() * 46;
      const s = this.reg(this.add.image(x, y, 'w_star2').setBlendMode(ADD).setDepth(D_FX)
        .setTint([0xffe066, 0xff6ec7, 0x7fffcf, 0xffffff][i % 4]).setScale(0.8));
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        scale: 0, alpha: 0, duration: 520 + this.rnd() * 320, ease: 'Cubic.out',
        onComplete: () => s.destroy() });
    }
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
    if (!this._confetti.length) return;
    const dt = delta / 1000;
    for (const c of this._confetti) {
      if (!c.spr || !c.spr.scene) continue;
      c.spr.y += c.vy * dt;
      c.spr.x += c.vx * dt;
      c.spr.rotation += c.rot * dt;
      if (c.spr.y > this.H + 20) c.spr.y = -20;   // 落ち切ったら上へ戻す（降り続ける絵にする）
    }
  }

  // ================= 終了 =================
  toResult() {
    if (this._finished) return;
    this._finished = true;
    for (const t of this._timers) { if (t) t.remove(false); }
    this._timers.length = 0;
    this.tweens.killAll();
    // 表示物は scene.start の shutdown が破棄する（ここで手動 destroy すると
    // 破棄済みオブジェクトへ二重に触れて遷移そのものを落としうる）。参照だけ捨てる。
    this._objs.length = 0;
    this._confetti.length = 0;
    const d = this.data0 || {};
    this.scene.start('Result', {
      clear: true, bossDefeated: true, withAudio: !!d.withAudio,
      elapsed: d.elapsed, kills: d.kills, captures: d.captures, coins: d.coins, party: d.party,
    });
  }
}
