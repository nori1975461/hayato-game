// scenes/Result.js — リザルト画面（PROTOTYPE_SPEC §5.4）。
// Run.js から { clear, elapsed, kills, captures, coins, party:[id...] } を受け取り表示。
// clear/gameover SFX は Run.js 側で発火済み。BGM はリザルト曲へ本シーンで切り替える（withAudio 時のみ）。
// ★2026-09-13 ジャム版（payload.jam）は別画面＝「裁き」が主役（data/verdict.js）。到達タイムは主役にしない。
//   再挑戦は SPACE で**直接 Run へ**（タイトルを挟まない＝2分ループの距離を最短にする）。
import { MONSTERS } from '../data/monsters.js';
import { BALANCE } from '../data/balance.js';
import { CAUSES, STAGE_NAMES, VERDICTS } from '../data/verdict.js';
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

    if (d.jam) { this.createJam(d); return; }

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

    this.add.text(W / 2, 92, clear ? 'ぜんぶの ボスを たおした！' : 'またチャレンジしよう', {
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
      ['プレイタイム', mmss(d.elapsed || 0)],
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
        // ⚠️ 進化形態(evo)は color を持たない（基本形から継承する仕様）。evo の id が渡ったときに
        //   def.color が undefined でクラッシュするので、色は必ず基本形から引く。
        const base = MONSTERS.find((m) => m.id === id || (m.evo && m.evo.id === id));
        const def = base && (base.id === id ? base : base.evo);
        if (def) {
          this.add.image(x, slotY, 'glow').setBlendMode(Phaser.BlendModes.ADD)
            .setTint(int(base.color)).setScale(1.6);
          this.add.image(x, slotY, 'mon_' + def.id).setScale(2.4);
        }
      }
    }

    this.drawFooter(d);

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
    this.time.delayedCall(450, () => { this.input.on('pointerdown', toTitle); });   // R21W2: 残クリック対策
  }

  // R59: 処理の記録（親向け・小さく）。「ゆっくり／コマ送り」の訴えが**そのPCの処理落ち**なのか
  //   演出（ヒットストップ）なのかを、開発機でなく**遊んだ機械の数字**で切り分けるため。
  //   Run.update の delta を数えたもの：平均fps／30fpsを割ったフレームの割合／50msを超えて
  //   ゲーム時間が遅れた（dtクランプ）フレームの割合。
  // R63: ボスごとの戦闘秒数（親向け・小さく）。「ボスが弱すぎる／強すぎる」を、遊んだ本人の実測で読むため。
  //   負の値＝その戦闘の途中で終わった（死んだ）。例「ボス 19・35・34・-22びょう」＝4体目の途中で死んだ。
  drawFooter(d) {
    const H = 360;
    if (d.bossTimes && d.bossTimes.length > 0) {
      const txt = d.bossTimes.map((t) => (t < 0 ? `${-t}…` : String(t))).join('・');
      this.add.text(6, H - 15, `ボス ${txt} びょう`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#8a90a8',
      }).setOrigin(0, 1).setAlpha(0.85);
    }
    if (d.perf && d.perf.frames > 0) {
      const p = d.perf;
      const fps = p.frames / Math.max(0.001, p.ms / 1000);
      const pct = (n) => (n / p.frames * 100).toFixed(1);
      this.add.text(6, H - 4, `しょり ${fps.toFixed(0)}fps・30fpsわれ ${pct(p.slow)}%・おくれ ${pct(p.clamp)}%`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#8a90a8',
      }).setOrigin(0, 1).setAlpha(0.85);
    }
  }

  // R53 と同じ作法の1文字ずつ表示（42ms/文字・3文字ごとに打鍵音）。裁きは「会話」なので一気に出さない。
  typeText(obj, full, msPerChar, onDone) {
    let i = 0;
    obj.setText('');
    if (!full) { if (onDone) onDone(); return; }
    this.time.addEvent({ delay: msPerChar, repeat: full.length - 1, callback: () => {
      i++;
      obj.setText(full.slice(0, i));
      if (i % 3 === 0) Sound.sfx('talkTick');
      if (i >= full.length && onDone) onDone();
    } });
  }

  // ★2026-09-13 ジャム版の結果＝「裁き」。
  //   上段：称号（大聖堂の声で1文字ずつ）／中段：何にやられたか＋避け方・大聖堂の残り%・前回との差／
  //   下段：投げの中身と最高の一投・裁きの一覧の進み／一行の呼びかけ。文字はここに集中させ、戦闘中には足さない。
  //   ⚠️ ジャム版だけ漢字まじり（評価者は unity1week の大人）。本編（ひらがな）は変えない。
  createJam(d) {
    const W = 640, H = 360;
    const J = d.jam, v = J.verdict || VERDICTS[VERDICTS.length - 1], s = J.stat || {};
    const clear = !!d.clear;
    this.add.text(W / 2, 20, '― 堕天の大聖堂の裁き ―', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8a90a8',
    }).setOrigin(0.5);
    const title = this.add.text(W / 2, 54, '', {
      fontFamily: 'monospace', fontSize: '30px', color: clear ? '#ffe066' : '#ff8fb3',
      fontStyle: 'bold', stroke: clear ? '#6a3a00' : '#4a1030', strokeThickness: 6,
    }).setOrigin(0.5);
    const voice = this.add.text(W / 2, 90, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#cfe0ff',
    }).setOrigin(0.5);
    this.typeText(title, v.title, 42, () => {
      this.time.delayedCall(250, () => this.typeText(voice, v.line, 42));
    });

    // 中段：死因・残り・前回との差
    let y = 120;
    const line = (txt, color, size) => {
      this.add.text(W / 2, y, txt, { fontFamily: 'monospace', fontSize: (size || 13) + 'px', color }).setOrigin(0.5);
      y += 20;
    };
    if (clear) {
      line(`大聖堂を覆した ― ${mmss(d.elapsed || 0)}`, '#ffd23f', 14);
      if (J.tries > 1) line(`${J.tries}回目の挑戦で`, '#9fe8ff', 12);
    } else {
      const c = s.deathCause && CAUSES[s.deathCause];
      if (c) line(`${c.name}に打たれた ― ${c.tip}`, '#ffb3b3');
      if (s.remainPct != null) {
        const st = s.stage != null ? `・第${s.stage + 1}段階（${STAGE_NAMES[s.stage]}）` : '';
        line(`大聖堂 残り ${s.remainPct}%${st}`, '#ffffff', 15);
        if (J.improved) line(J.prevBest == null ? '初めて大聖堂に届いた' : `前回より ${J.prevBest - s.remainPct}% 前進`, '#9fe8ff');
        else if (J.prevBest != null) line(`前回の傷跡（残り ${J.prevBest}%）には届かず`, '#8a90a8', 12);
      } else {
        line('大聖堂に届かず', '#8a90a8');
      }
    }

    // 下段：投げの中身（2列）
    y = Math.max(y + 4, 192);
    const G = (BALANCE.hero.billiard && BALANCE.hero.billiard.grades) || [];
    const b = J.best || { dmg: 0 };
    const gl = (G[b.grade] && G[b.grade].label) || '';
    const tags = [gl, b.piece ? '光輪' : b.shard ? '装甲片' : '', b.core ? '聖核' : ''].filter(Boolean).join('・');
    const bestTxt = b.dmg > 0 ? `${b.dmg}${tags ? '（' + tags + '）' : ''}` : '－';
    const seenN = Object.keys(J.seen || {}).length;
    const rowsL = [['投げ', String(s.throws || 0)], ['聖核ヒット', String(s.coreHits || 0)], ['装甲片を返した', String(J.shardHits || 0)]];
    const rowsR = [['聖歌隊 投げ返し', `${s.choirBest || 0}/8`], ['最高の一投', bestTxt],
      ['裁き', `${seenN}/${VERDICTS.length}（${J.tries || 1}回目）`]];
    const put = (rows, x0, x1) => rows.forEach((r, i) => {
      this.add.text(x0, y + i * 18, r[0], { fontFamily: 'monospace', fontSize: '12px', color: '#cfe6ff' }).setOrigin(0, 0.5);
      this.add.text(x1, y + i * 18, r[1], { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
    });
    put(rowsL, 70, 260); put(rowsR, 330, 590);

    // 一行の呼びかけ（コメント欄はゲームの外にある＝書く一文を手渡した直後に頼む。押しつけないよう一行・小さく）
    this.add.text(W / 2, 266, 'あなたの裁きを、コメントで教えてください', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd6a0',
    }).setOrigin(0.5);

    this.drawFooter(d);

    const prompt = this.add.text(W / 2, 300, 'SPACE で もう一度 裁きを　／　V で 裁きの一覧　／　R で タイトル', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });

    // 裁きの一覧（V で切替）。見たものだけ点灯、まだのものは「？？？」＝空欄が見える（集めきる）。
    const gal = this.add.container(0, 0).setVisible(false).setDepth(50);
    gal.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05051a, 0.96));
    gal.add(this.add.text(W / 2, 18, `裁きの一覧　${seenN}/${VERDICTS.length}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5));
    const cols = 3, per = Math.ceil(VERDICTS.length / cols);
    VERDICTS.forEach((vv, i) => {
      const col = Math.floor(i / per), row = i % per;
      const n = (J.seen || {})[vv.id];
      const x = 28 + col * 205, yy = 40 + row * 30;
      gal.add(this.add.text(x, yy, n ? vv.title : '？？？', {
        fontFamily: 'monospace', fontSize: '12px', color: n ? (vv.id === v.id ? '#ffe066' : '#ffffff') : '#4a4f66',
        fontStyle: n && vv.id === v.id ? 'bold' : 'normal',
      }));
      if (n) gal.add(this.add.text(x, yy + 14, `×${n}`, { fontFamily: 'monospace', fontSize: '9px', color: '#8a90a8' }));
    });
    gal.add(this.add.text(W / 2, H - 12, 'V で もどる', { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5));
    this._gal = gal;

    const retry = () => {
      if (this._done) return;
      this._done = true;
      Sound.stopBgm();
      this.scene.start('Run', { withAudio: !!d.withAudio, jamRun: true });
    };
    const toTitle = () => {
      if (this._done) return;
      this._done = true;
      Sound.stopBgm();
      this.scene.start('Title');
    };
    this.input.keyboard.on('keydown-V', () => { if (!this._done) gal.setVisible(!gal.visible); });
    this.input.keyboard.on('keydown-SPACE', retry);
    this.input.keyboard.on('keydown-R', toTitle);
    this.time.delayedCall(450, () => { this.input.on('pointerdown', retry); });
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
  }
}
