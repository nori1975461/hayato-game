// scenes/Ending.js — エンディング（マオウレクス撃破 → ここ → Result）。
//
// R29 の初版は「簡易版でいいので」の依頼に対する最小構成だった。R34 の実プレイFBは
// **「エンディングがしょぼすぎる。もっと派手な演出や音にして。主人公とモビットが一緒に
// 戦っているイラストを入れるとかできないか」**。作り直しの方針は3つ:
//   ①山を作る … 平坦に並べず「崩壊 → 光 → ★イラスト → なかま → 歓声 → 記録 → 締め」の7幕にし、
//                いちばん高い山（イラストの登場）に演出と音を全部寄せる。
//   ②専用の音 … ここまでの音は全部「戦いの音」。祝祭の語彙（打ち上げ花火・凱歌のファンファーレ・
//                到達の鐘・スタンプ）を sound.js に新設して使う。使い回しでは派手にならない。
//   ③イラスト … data/ending_art.js（96×54の描き下ろし）を6倍で全画面に敷き、
//                左から光が走って現れる「幕開け」で見せる。ゆっくり寄りながら見せ続ける。
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
const D_STARS = 1, D_ART = 3, D_PLANET = 4, D_FX = 20, D_ACTOR = 40, D_TEXT = 60,
  D_FLASH = 110, D_SKIP = 120;

// キーイラストの表示サイズ（96×54 の6倍＝576×324。640×360 の中に額縁ぶんの余白が残る）
const ART_SCALE = 6;

// なかま1体ぶんのねぎらい。id で引く（進化後の id も拾えるよう evo 側も並べる）。
// 「よくやった」ではなく **そのモビットが実際にやったこと** を書く＝連れて行った意味が残る。
const PRAISE = {
  starpuppy:   'いっしょに はしってくれた！',
  comethound:  'ほしを けって かけぬけた！',
  togeron:     'ハンマーで みちを ひらいた！',
  togeking:    'でっかい ハンマーで ぜんぶ ふきとばした！',
  terabit:     'ビリビリで めを くらませた！',
  thunderbit:  'かみなりで そらを わった！',
  samet:       'みずでっぽうで えんごしてくれた！',
  megasamet:   'おおなみで まとめて おしながした！',
  neonworm:    'にじいろの わで つつんでくれた！',
  neonmoth:    'ひかりの りんぷんで まもってくれた！',
  aurajelly:   'もこもこで こうげきを うけとめた！',
  aurorajelly: 'オーロラで みんなを つつんだ！',
  mashumo:     'いつも きずを なおしてくれた！',
  heartangel:  'なんども たちあがらせてくれた！',
  biricco:     'とくべつな たまを わたしてくれた！',
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
    this._embers = [];
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

    // --- 第1幕（0.0s）：崩壊。暗い画面で残骸が連鎖して落ちる ---
    this.bg = this.reg(this.add.tileSprite(cx, this.H / 2, this.W, this.H, 'stars1')
      .setAlpha(0.22).setDepth(D_STARS));
    this.seq(120, () => this.sfx('voidHum'));
    for (let i = 0; i < 6; i++) {
      this.seq(180 + i * 230, () => {
        const x = 90 + this.rnd() * (this.W - 180), y = 70 + this.rnd() * 170;
        this.blast(x, y, 26 + this.rnd() * 26, i % 2 ? 0xff5a2a : 0xffb03a);
        this.sfx('endRubble', this.rnd());
        this.cameras.main.shake(220, 0.006 + this.rnd() * 0.004);
      });
    }
    for (let i = 0; i < 22; i++) {
      const e = this.reg(this.add.image(this.rnd() * this.W, this.H * 0.35 + this.rnd() * this.H * 0.6,
        'glow').setBlendMode(ADD).setDepth(D_FX).setTint(0xff5a2a)
        .setScale(0.2 + this.rnd() * 0.45).setAlpha(0.55));
      this.tweens.add({ targets: e, y: e.y - 60 - this.rnd() * 90, alpha: 0,
        duration: 2600 + this.rnd() * 1800, ease: 'Sine.out' });
    }

    // --- 第2幕（1.8s）：ひかりが戻る。星空が明るくなり、凱歌が始まる ---
    this.seq(1800, () => {
      this.wash(0.44, 300);
      if (this.bg) this.tweens.add({ targets: this.bg, alpha: 0.9, duration: 1400 });
      if (this.data0.withAudio) Sound.startBgm('ending');
      this.sfx('clear');
      this.line(cx, 150, 'せかいに ひかりが もどった', MINT_S, 20, 0);
      this.burstStars(cx, 150, 20);
    });
    this.seq(2900, () => {
      this.line(cx, 182, 'マオウレクスは ひかりの つぶになって きえた', CYAN_S, 14, 0);
    });

    // --- 第3幕（4.4s）：★キーイラスト。左から光が走って現れる ---
    const artAt = 4400;
    this.seq(artAt, () => { this.fadeOutTexts(); this.revealArt(); });
    this.seq(artAt + 1500, () => {
      this.bigTelop('みんなで たたかった', YELLOW_S, 54, 30);
      this.sfx('endFanfare');
      this.cameras.main.shake(300, 0.005);
      this.fireworks(4);
    });
    this.seq(artAt + 3400, () => {
      this.fadeOutTexts();
      this.line(cx, 320, 'これは きみと なかまたちの ものがたり', WHITE_S, 17, 0);
    });
    this.seq(artAt + 4600, () => this.fireworks(3));

    // --- 第4幕：なかま紹介。1体ずつ名前とねぎらい ---
    const buddyAt = artAt + 6000;
    // ⚠️ ここでイラストを**完全に引く**。薄く残すと、絵の中のモビットと舞台のモビットが
    //    同じ画面に二重に並んで、どちらが「いま讃えられている子」か読めなくなった（実測で確認）。
    this.seq(buddyAt, () => { this.fadeOutTexts(); this.dimArt(0); this.buildStage(list.length); });
    const ids = Array.isArray(this.data0.party) ? this.data0.party.filter((x) => x != null) : [];
    const list = ids.length ? ids : ['starpuppy'];
    const step = 1350;
    list.forEach((id, i) => {
      this.seq(buddyAt + 700 + i * step, () => this.introBuddy(id, i, list.length));
    });
    const afterBuddies = buddyAt + 700 + list.length * step + 800;

    // --- 第5幕：全員そろって歓声＋花火 ---
    this.seq(afterBuddies, () => {
      this.fadeOutTexts();
      this.bigTelop('みんなで かちとった しょうり！', PINK_S, 150, 24);
      this.cheer();
    });
    this.seq(afterBuddies + 500, () => this.fireworks(5));
    this.seq(afterBuddies + 1400, () => this.fireworks(4));

    // --- 第6幕：この回の記録（自分のプレイが名指しで残る） ---
    const recAt = afterBuddies + 2400;
    this.seq(recAt, () => { this.fadeOutTexts(); this.showRecord(); });

    // --- 第7幕：締め。イラストへ戻ってタイトルを重ねる ---
    const endAt = recAt + 4200;
    this.seq(endAt, () => {
      this.fadeOutTexts();
      this.clearStage();
      this.dimArt(0.6);
      this.wash(0.34, 260);
      // タイトルの下敷き（絵の上に字を置くので、帯が無いと主人公の顔に文字が乗って読めない）
      const band = this.reg(this.add.rectangle(this.W / 2, 156, this.W, 96, 0x02030a, 0.66)
        .setDepth(D_TEXT - 1));
      this._texts.push(band);
      this.bigTelop('クルット・モビット', WHITE_S, 136, 32);
      this.sfx('endFanfare');
      this.fireworks(6);
      this.seq(800, () => this.line(cx, 184, '〜 THE END 〜', YELLOW_S, 19, 0));
      this.seq(1700, () => {
        if (this.skipHint) this.tweens.add({ targets: this.skipHint, alpha: 0, duration: 200 });
        const p = this.line(cx, 304, 'SPACE で けっかを みる', MINT_S, 15, 0);
        this.tweens.add({ targets: p, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });
      });
      this.seq(2200, () => this.fireworks(4));
      this.seq(4000, () => this.fireworks(4));
    });
  }

  // ================= ★キーイラスト =================
  // 「置いて終わり」にしない。左から光の帯が走って現れ、そのままゆっくり寄り続ける。
  // 静止画を静止したまま出すと、どれだけ描き込んでも1秒で見飽きる。
  revealArt() {
    const cx = this.W / 2, cy = this.H / 2;
    this.art = this.reg(this.add.image(cx, cy, 'ending_art')
      .setScale(ART_SCALE).setDepth(D_ART).setAlpha(1));
    const aw = this.art.displayWidth, ah = this.art.displayHeight;
    // 幕：イラストと同じ大きさの黒板を右へ引き抜く
    const curtain = this.reg(this.add.rectangle(cx - aw / 2, cy, aw, ah, 0x02030a, 1)
      .setOrigin(0, 0.5).setDepth(D_ART + 1));
    // 幕の先端で光の帯が走る
    const edge = this.reg(this.add.rectangle(cx - aw / 2, cy, 10, ah, 0xffffff, 0.9)
      .setOrigin(0.5, 0.5).setBlendMode(ADD).setDepth(D_ART + 2));
    // ⚠️ Rectangle は width を tween しても geom が更新されないので**幅は変えない**。
    //    同じ幅の黒板を右へ滑らせるだけで、左から順に絵が出る＝ワイプになる。
    this.tweens.add({ targets: curtain, x: cx + aw / 2, duration: 1100, ease: 'Cubic.inOut' });
    this.tweens.add({ targets: edge, x: cx + aw / 2, duration: 1100, ease: 'Cubic.inOut',
      onComplete: () => { edge.destroy(); curtain.destroy(); } });
    // 額縁（イラストの外に細い光の枠）
    this.frame = this.reg(this.add.rectangle(cx, cy, aw + 6, ah + 6).setDepth(D_ART - 1)
      .setStrokeStyle(2, 0x8fd0ff, 0.55));
    // ゆっくり寄る（1.00 → 1.05 を 14秒かけて。止め絵に時間の流れを持たせる）
    this.tweens.add({ targets: this.art, scaleX: ART_SCALE * 1.05, scaleY: ART_SCALE * 1.05,
      duration: 14000, ease: 'Sine.inOut' });
    this.sfx('endChime');
    // 玉の航跡（イラスト内の対角線）を、きらめきが追いかける
    const x0 = cx - aw / 2 + (50 / 96) * aw, y0 = cy - ah / 2 + (13 / 54) * ah;
    const x1 = cx - aw / 2 + (74 / 96) * aw, y1 = cy - ah / 2 + (27 / 54) * ah;
    for (let i = 0; i < 10; i++) {
      this.seq(1100 + i * 90, () => {
        const s = this.reg(this.add.image(x0, y0, 'w_star2').setBlendMode(ADD).setDepth(D_FX)
          .setTint(0xffe9a8).setScale(0.9));
        this.tweens.add({ targets: s, x: x1, y: y1, scale: 0.2, alpha: 0,
          duration: 520, ease: 'Cubic.in', onComplete: () => s.destroy() });
      });
    }
  }
  dimArt(a) {
    if (!this.art) return;
    this.tweens.add({ targets: this.art, alpha: a, duration: 500 });
    if (this.frame) this.tweens.add({ targets: this.frame, alpha: a, duration: 500 });
  }

  // ================= 舞台（惑星と主人公） =================
  // ★並びは「主人公も含めた1列」として等間隔に置く（total で毎回組み直す）。
  //   主人公を中央に固定して左右交互に足していくと、3体のとき左2・右1で必ず傾いた。
  buildStage(total) {
    const cx = this.W / 2;
    const n = (total || 0) + 1;                       // 主人公を含めた人数
    this.rowN = n;
    this.rowGap = Math.min(118, 520 / n);             // 画面幅に収まる範囲で最大に開く
    this.heroSlot = Math.floor(n / 2);                // 主人公が立つ位置
    const hx = cx + (this.heroSlot - (n - 1) / 2) * this.rowGap;
    // 惑星の弧。端に立つ子ほど下がる＝丸い星の上に並んでいるように見える
    //（固定のyに並べると、外側の子だけ弧から浮いて宙に立っていた）
    this.planet = { cx, cy: 578, r: 312 };
    const P = this.planet;
    this.groundY = (x) => P.cy - Math.sqrt(Math.max(0, P.r * P.r - (x - P.cx) * (x - P.cx)));
    // 足元の惑星（青い弧）。ドット絵の世界観を壊さないよう、単色＋淡いグロウだけで描く。
    const g = this.reg(this.add.graphics().setDepth(D_PLANET));
    g.fillStyle(0x1b3f7a, 1);
    g.fillCircle(cx, 578, 312);
    g.fillStyle(0x2f6fbf, 1);
    g.fillCircle(cx, 584, 312);
    g.lineStyle(3, 0x7fd8ff, 0.9);
    g.strokeCircle(cx, 578, 312);
    this.stageG = g;
    this.stageGlow = this.reg(this.add.image(cx, 276, 'glow').setBlendMode(ADD).setDepth(D_PLANET)
      .setTint(0x4f8cff).setScale(14, 5).setAlpha(0.22));

    // 主人公（星の上に立つ）
    const hy = this.groundY(hx) - 28;
    this.hero = this.reg(this.add.image(hx, hy - 80, 'player').setScale(3.6).setDepth(D_ACTOR + 2));
    this.tweens.add({ targets: this.hero, y: hy, duration: 620, ease: 'Bounce.easeOut' });
    this.heroGlow = this.reg(this.add.image(hx, hy + 6, 'glow').setBlendMode(ADD).setDepth(D_ACTOR)
      .setTint(0x4f8cff).setScale(3.2).setAlpha(0.45));
    this.buddies = [];
  }
  clearStage() {
    const kill = (o) => { if (o && o.scene) { this.tweens.killTweensOf(o); o.destroy(); } };
    kill(this.stageG); kill(this.stageGlow); kill(this.hero); kill(this.heroGlow);
    for (const b of this.buddies || []) { kill(b.spr); kill(b.glow); }
    this.stageG = this.stageGlow = this.hero = this.heroGlow = null;
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
    // 主人公の枠だけ空けて、残りの枠へ左から順に入る＝何体でも等間隔になる
    const slot = i < this.heroSlot ? i : i + 1;
    const x = cx + (slot - (this.rowN - 1) / 2) * this.rowGap;
    const y = (this.groundY ? this.groundY(x) : 266) - 24;

    const glow = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_ACTOR)
      .setTint(int(mon.color)).setScale(0).setAlpha(0.7));
    const spr = this.reg(this.add.image(x, y - 74, 'mon_' + def.id).setScale(3.4).setDepth(D_ACTOR + 1).setAlpha(0));
    this.tweens.add({ targets: glow, scale: 2.6, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: spr, y, alpha: 1, duration: 380, ease: 'Bounce.easeOut' });
    // 着地したらぴょんぴょん跳ね続ける（生きている感じ＝集合写真にしない）
    this.seq(400, () => {
      this.tweens.add({ targets: spr, y: y - 9, duration: 420 + i * 40,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    this.buddies.push({ spr, glow });
    this.burstStars(x, y - 10, 10);
    this.ring(x, y, int(mon.color));
    this.sfx('pop');
    this.sfx('pickup', 0.7);

    // 名前とねぎらい（1体ずつ入れ替える＝読める速度に落とす）
    this.fadeOutTexts();
    if (total > 1) this.line(cx, 44, `なかま ${i + 1} / ${total}`, '#8aa0b8', 12, 0);
    const nm = this.line(cx, 76, mon.name, mon.color, 24, 0);
    this.tweens.add({ targets: nm, scaleX: 1.06, scaleY: 1.06, duration: 700,
      yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 名前の下に、そのモビットの色の帯（名札に見せる）
    // ⚠️ 幅は scaleX で伸ばす（Rectangle の width を tween しても見た目は変わらない）
    const bar = this.reg(this.add.rectangle(cx, 94, 210, 3, int(mon.color), 0.9)
      .setDepth(D_TEXT).setScale(0.02, 1));
    this._texts.push(bar);
    this.tweens.add({ targets: bar, scaleX: 1, duration: 260, ease: 'Cubic.out' });
    this.line(cx, 116, PRAISE[def.id] || 'さいごまで たたかいぬいた！', WHITE_S, 15, 0);
  }

  // 全員で歓声：主人公が跳ね、なかまが一斉に跳び、紙吹雪が降る
  cheer() {
    if (this.hero) {
      this.tweens.add({ targets: this.hero, y: this.hero.y - 30, duration: 260,
        yoyo: true, repeat: 2, ease: 'Sine.out' });
    }
    (this.buddies || []).forEach((b, i) => {
      this.seq(i * 70, () => {
        if (!b.spr || !b.spr.scene) return;
        this.tweens.add({ targets: b.spr, y: b.spr.y - 32, duration: 240, yoyo: true, ease: 'Sine.out' });
        this.burstStars(b.spr.x, b.spr.y - 12, 12);
      });
    });
    this.sfx('gaugeFull');
    this.dropConfetti(90);
  }

  // 紙吹雪。update で落とす（tween を90個積むより軽い）。
  dropConfetti(n) {
    const cols = [0xffe066, 0xff6ec7, 0x7fffcf, 0x8fd0ff, 0xffffff];
    for (let i = 0; i < n; i++) {
      const c = cols[Math.floor(this.rnd() * cols.length) % cols.length];
      const spr = this.reg(this.add.rectangle(this.rnd() * this.W, -20 - this.rnd() * 320,
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
    this.line(cx, 70, '― この ぼうけんの きろく ―', MINT_S, 16, 0);
    const rows = [
      ['たたかった じかん', time],
      ['たおした かず', String(d.kills || 0) + ' たい'],
      ['つかまえた なかま', String(d.captures || 0) + ' たい'],
      ['あつめた コイン', String(d.coins || 0)],
    ];
    rows.forEach((r, i) => {
      this.seq(i * 460, () => {
        const y = 122 + i * 32;
        const l = this.reg(this.add.text(cx - 150, y, r[0], {
          fontFamily: 'monospace', fontSize: '15px', color: '#cfe6ff',
        }).setOrigin(0, 0.5).setDepth(D_TEXT).setAlpha(0));
        const v = this.reg(this.add.text(cx + 160, y, r[1], {
          fontFamily: 'monospace', fontSize: '19px', color: YELLOW_S, fontStyle: 'bold',
          stroke: '#00131f', strokeThickness: 4,
        }).setOrigin(1, 0.5).setDepth(D_TEXT).setAlpha(0).setScale(1.9));
        this._texts.push(l, v);
        this.tweens.add({ targets: l, alpha: 1, duration: 180 });
        this.tweens.add({ targets: v, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
        this.burstStars(cx + 150, y, 6);
        this.sfx('stampHit', i);
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
      stroke: '#00131f', strokeThickness: 8, align: 'center',
    }).setOrigin(0.5).setDepth(D_TEXT).setAlpha(0).setScale(1.8));
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
  // 白の全画面フラッシュ（子ども安全：alpha < 0.5 厳守）
  wash(alpha, dur) {
    const r = this.reg(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xffffff, 0)
      .setBlendMode(ADD).setDepth(D_FLASH));
    this.tweens.add({ targets: r, alpha: Math.min(0.49, alpha), duration: dur * 0.4,
      yoyo: true, onComplete: () => r.destroy() });
  }
  // 広がって消える光の輪
  ring(x, y, tint) {
    const c = this.reg(this.add.circle(x, y, 8).setDepth(D_FX)
      .setStrokeStyle(3, tint, 0.9).setBlendMode(ADD));
    this.tweens.add({ targets: c, radius: 62, alpha: 0, duration: 520, ease: 'Cubic.out',
      onComplete: () => c.destroy() });
  }
  // 爆散（第1幕の崩壊で使う）
  blast(x, y, r, tint) {
    const g = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_FX)
      .setTint(tint).setScale(r / 16).setAlpha(0.9));
    this.tweens.add({ targets: g, scale: (r / 16) * 2.2, alpha: 0, duration: 620,
      ease: 'Cubic.out', onComplete: () => g.destroy() });
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + this.rnd();
      const d = r * (1.2 + this.rnd() * 1.6);
      const s = this.reg(this.add.rectangle(x, y, 3, 3, tint, 1).setDepth(D_FX));
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 40,
        alpha: 0, duration: 700 + this.rnd() * 400, ease: 'Cubic.out',
        onComplete: () => s.destroy() });
    }
  }
  // ★打ち上げ花火。上がって → 割れて → 火の粉が降る。音も専用（firework）。
  fireworks(n) {
    const cols = [0xffe066, 0xff6ec7, 0x7fffcf, 0x8fd0ff, 0xffffff, 0xffa14a];
    for (let i = 0; i < n; i++) {
      this.seq(i * 170, () => {
        const x = 60 + this.rnd() * (this.W - 120);
        const y = 40 + this.rnd() * 130;
        const tint = cols[Math.floor(this.rnd() * cols.length) % cols.length];
        // ①上がる玉
        const shell = this.reg(this.add.image(x, this.H + 10, 'w_star2').setBlendMode(ADD)
          .setDepth(D_FX).setTint(tint).setScale(0.7));
        this.sfx('firework', this.rnd());
        this.tweens.add({ targets: shell, y, duration: 430, ease: 'Cubic.out',
          onComplete: () => {
            shell.destroy();
            // ②割れる
            const g = this.reg(this.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(D_FX)
              .setTint(tint).setScale(0.8).setAlpha(0.85));
            this.tweens.add({ targets: g, scale: 3.4, alpha: 0, duration: 620,
              onComplete: () => g.destroy() });
            // ③火の粉（放射状に飛んで、少し落ちながら消える）
            for (let k = 0; k < 22; k++) {
              const a = (Math.PI * 2 * k) / 22 + this.rnd() * 0.2;
              const d = 40 + this.rnd() * 52;
              const p = this.reg(this.add.image(x, y, 'w_star2').setBlendMode(ADD)
                .setDepth(D_FX).setTint(tint).setScale(0.55));
              this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + 26,
                scale: 0, alpha: 0, duration: 780 + this.rnd() * 420, ease: 'Cubic.out',
                onComplete: () => p.destroy() });
            }
          } });
      });
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
      perf: d.perf,   // R59: 処理の記録（クリア時も Result に届ける）
    });
  }
}
