// scenes/Result.js — リザルト画面（PROTOTYPE_SPEC §5.4）。
// Run.js から { clear, elapsed, kills, captures, coins, party:[id...] } を受け取り表示。
// clear/gameover SFX は Run.js 側で発火済み。BGM はリザルト曲へ本シーンで切り替える（withAudio 時のみ）。
// ★2026-09-13 ジャム版（payload.jam）は別画面＝「裁き」が主役（data/verdict.js）。到達タイムは主役にしない。
//   再挑戦は SPACE で**直接 Run へ**（タイトルを挟まない＝2分ループの距離を最短にする）。
import { MONSTERS } from '../data/monsters.js';
import { BALANCE } from '../data/balance.js';
import { CAUSES, STAGE_NAMES, VERDICTS, TIERS, tierOf, byRank, keyHint } from '../data/verdict.js';
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
    this.add.text(W / 2, 14, '― 堕天の大聖堂の裁き ―', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8a90a8',
    }).setOrigin(0.5);
    // ★2026-09-13 実プレイFB「称号の地位がプレーヤーには見えない」→ 称号の上に**第n位／32**と階位の印。
    //   印は文字でなく絵（王冠1〜3位／金の宝石4〜12／銀13〜19／鉄20〜32）＝一覧でも同じ印が並ぶので、
    //   自分の裁きが全体のどこにいるかが数字と色の両方で分かる。
    const tier = tierOf(v.rank || VERDICTS.length);
    const rankTxt = this.add.text(W / 2 + 10, 32, `第${v.rank}位 ／ ${VERDICTS.length}　${tier.name}の裁き`, {
      fontFamily: 'monospace', fontSize: '13px', color: tier.color, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.drawRankIcon(rankTxt.x - rankTxt.width / 2 - 14, 32, tier.id, 1.15);
    const above = (v.rank || VERDICTS.length) - 1;
    if (above > 0) this.add.text(W - 24, 32, `上に あと${above}つ`, { fontFamily: 'monospace', fontSize: '10px', color: '#8a90a8' }).setOrigin(1, 0.5);
    const title = this.add.text(W / 2, 58, '', {
      fontFamily: 'monospace', fontSize: '30px', color: clear ? '#ffe066' : '#ff8fb3',
      fontStyle: 'bold', stroke: clear ? '#6a3a00' : '#4a1030', strokeThickness: 6,
    }).setOrigin(0.5);
    const voice = this.add.text(W / 2, 92, '', {
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
      // ★2026-09-13 その回に触れなかった鍵を1つだけ指す（聖歌隊→欠片→装甲片の順）。文字は結果画面にだけ足す。
      const kh = keyHint(s);
      if (kh) line(`▶ ${kh.text}`, '#ffe9a8');
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
    y = Math.max(y + 4, 184);
    const G = (BALANCE.hero.billiard && BALANCE.hero.billiard.grades) || [];
    const b = J.best || { dmg: 0 };
    const gl = (G[b.grade] && G[b.grade].label) || '';
    const tags = [gl, b.piece ? '光輪' : b.shard ? '装甲片' : '', b.core ? '聖核' : ''].filter(Boolean).join('・');
    const bestTxt = b.dmg > 0 ? `${b.dmg}${tags ? '（' + tags + '）' : ''}` : '－';
    const seenN = Object.keys(J.seen || {}).length;
    // 2026-09-13 聖核（弱点）は削除＝「聖核ヒット」の行は「光輪の欠片」へ（欠片を掴んだ／当てた＝探す遊びの記録）
    const rowsL = [['投げ', String(s.throws || 0)], ['光輪の欠片', s.haloHit ? '当てた' : s.haloGrabbed ? '掴んだ' : '－'], ['装甲片を返した', String(J.shardHits || 0)]];
    const rowsR = [['聖歌隊 投げ返し', `${s.choirBest || 0}/8`], ['最高の一投', bestTxt],
      ['裁き', `${seenN}/${VERDICTS.length}（${J.tries || 1}回目）`]];
    const put = (rows, x0, x1) => rows.forEach((r, i) => {
      this.add.text(x0, y + i * 18, r[0], { fontFamily: 'monospace', fontSize: '12px', color: '#cfe6ff' }).setOrigin(0, 0.5);
      this.add.text(x1, y + i * 18, r[1], { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
    });
    put(rowsL, 70, 260); put(rowsR, 330, 590);

    // ★2026-09-13 実プレイFB「一緒に戦った仲間の説明とイラストを」→ ジャム版は本編のエンディングを挟まない
    //   （2分ループ）ので、裁きの画面に「共に戦った者」を1行。絵は本編と同じドット絵（エンディングの一枚絵は使わない）。
    const ids = Array.isArray(d.party) ? d.party : [];
    if (ids.length) {
      this.add.text(70, 252, '共に戦った者', { fontFamily: 'monospace', fontSize: '11px', color: '#ffd6f0' }).setOrigin(0, 0.5);
      ids.slice(0, 5).forEach((id, i) => {
        const base = MONSTERS.find((m) => m.id === id || (m.evo && m.evo.id === id));
        const def = base && (base.id === id ? base : base.evo);
        if (!def) return;
        const x = 190 + i * 88;
        this.add.image(x, 252, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(int(base.color)).setScale(1.1);
        this.add.image(x, 252, 'mon_' + def.id).setScale(1.7);
        this.add.text(x, 270, def.name, { fontFamily: 'monospace', fontSize: '9px', color: '#cfe6ff' }).setOrigin(0.5);
      });
    }

    // 一行の呼びかけ（コメント欄はゲームの外にある＝書く一文を手渡した直後に頼む。押しつけないよう一行・小さく）
    this.add.text(W / 2, 290, 'あなたの裁きを、コメントで教えてください', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd6a0',
    }).setOrigin(0.5);

    this.drawFooter(d);

    const prompt = this.add.text(W / 2, 314, 'SPACE で もう一度 裁きを　／　V で 裁きの一覧　／　R で タイトル', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });

    // 裁きの一覧（V で切替）。見たものだけ点灯、まだのものは「？？？」＝空欄が見える（集めきる）。
    const gal = this.add.container(0, 0).setVisible(false).setDepth(50);
    gal.add(this.add.rectangle(W / 2, H / 2, W, H, 0x05051a, 0.99));   // 2026-09-13 順位の一覧は下の称号が透けると読みにくい
    gal.add(this.add.text(W / 2, 18, `裁きの一覧　${seenN}/${VERDICTS.length}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd23f', fontStyle: 'bold',
    }).setOrigin(0.5));
    // 階位の凡例（印＝絵。位の帯は数字で示す＝分かりにくさを残さない）
    TIERS.forEach((t, i) => {
      const lx = 92 + i * 140;
      gal.add(this.drawRankIcon(lx, 38, t.id, 1));
      gal.add(this.add.text(lx + 10, 38, `${t.name}　${t.from}〜${t.to}位`, { fontFamily: 'monospace', fontSize: '10px', color: t.color }).setOrigin(0, 0.5));
    });
    // ★2026-09-13 一覧は**順位順**（1位が左上）。見ていない称号も順位と印は見える＝「上に何があるか」が分かる。
    const ranked = byRank();
    const cols = 3, per = Math.ceil(ranked.length / cols);
    ranked.forEach((vv, i) => {
      const col = Math.floor(i / per), row = i % per;
      const n = (J.seen || {})[vv.id];
      const t = tierOf(vv.rank);
      const x = 22 + col * 205, yy = 60 + row * 26;
      gal.add(this.drawRankIcon(x + 6, yy + 7, t.id, 0.85));
      gal.add(this.add.text(x + 16, yy, String(vv.rank).padStart(2, ' '), {
        fontFamily: 'monospace', fontSize: '11px', color: n ? t.color : '#4a4f66', fontStyle: 'bold' }));
      gal.add(this.add.text(x + 38, yy, n ? vv.title : '？？？', {
        fontFamily: 'monospace', fontSize: '12px', color: n ? (vv.id === v.id ? '#ffe066' : '#ffffff') : '#4a4f66',
        fontStyle: n && vv.id === v.id ? 'bold' : 'normal',
      }));
      if (n) gal.add(this.add.text(x + 38 + 12 * vv.title.length + 4, yy + 3, `×${n}`, { fontFamily: 'monospace', fontSize: '9px', color: '#8a90a8' }));
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

  // 階位の印（絵）。crown＝金の王冠（3つの尖り）／gold・silver・iron＝宝石（菱形＋白い照り）。
  //   文字（👑💎）は端末のフォント依存で崩れるので Graphics で描く。sc は大きさ。戻り値はコンテナへ入れられる。
  drawRankIcon(x, y, kind, sc) {
    const g = this.add.graphics();
    const k = sc || 1;
    const pts = (arr) => arr.map((p) => ({ x: x + p[0] * k, y: y + p[1] * k }));
    if (kind === 'crown') {
      g.fillStyle(0xffe066, 1);
      g.fillPoints(pts([[-6, 4], [-6, -3], [-3, 0], [0, -5], [3, 0], [6, -3], [6, 4]]), true);
      g.fillStyle(0xff5a6a, 1); g.fillCircle(x, y + 1.5 * k, 1.4 * k);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x - 6 * k, y - 3 * k, 1 * k); g.fillCircle(x + 6 * k, y - 3 * k, 1 * k); g.fillCircle(x, y - 5 * k, 1 * k);
    } else {
      const col = kind === 'gold' ? 0xffd23f : kind === 'silver' ? 0xd8dfe8 : 0x8a90a8;
      const dark = kind === 'gold' ? 0x9a6a10 : kind === 'silver' ? 0x6f7a8a : 0x4a4f5e;
      g.fillStyle(dark, 1); g.fillPoints(pts([[0, -6], [5, 0], [0, 6], [-5, 0]]), true);
      g.fillStyle(col, 1); g.fillPoints(pts([[0, -4.5], [3.5, 0], [0, 4.5], [-3.5, 0]]), true);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x - 1.2 * k, y - 1.8 * k, 1 * k);
    }
    return g;
  }

  update(_t, delta) {
    if (this.bg) this.bg.tilePositionX += delta * 0.004;
  }
}
