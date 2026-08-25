// ui/hud.js — HUD（カメラ固定）とDOMエラーバナー（PROTOTYPE_SPEC §7.1）。
// Phaser は window.Phaser をグローバル参照する。
import { BALANCE } from '../data/balance.js';

const Phaser = window.Phaser;

// ================= エラーバナー（DOM） =================
// Phaser のキャンバスが死んでいても見えるよう、素の DOM 要素で表示する。
let bannerEl = null;
let bannerInstalled = false;

function ensureBanner() {
  if (bannerEl) return bannerEl;
  bannerEl = document.getElementById('vortex-error-banner');
  if (!bannerEl) {
    bannerEl = document.createElement('div');
    bannerEl.id = 'vortex-error-banner';
    document.body.appendChild(bannerEl);
  }
  return bannerEl;
}

function showBanner(msg) {
  const el = ensureBanner();
  const line = document.createElement('div');
  line.textContent = 'エラー: ' + msg;
  el.appendChild(line);
  el.style.display = 'block';
  // 溜まりすぎたら古い行を間引く
  while (el.childNodes.length > 6) el.removeChild(el.firstChild);
}

export function installErrorBanner() {
  if (bannerInstalled) return;
  bannerInstalled = true;
  window.addEventListener('error', (e) => {
    const m = e && e.message ? e.message : String(e);
    const where = e && e.filename ? ` (${e.filename}:${e.lineno})` : '';
    showBanner(m + where);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    const m = r && r.message ? r.message : String(r);
    showBanner('Promise: ' + m);
  });
}

// テスト用に外から呼べるフック（動作確認 §9-10 用）
export function reportError(msg) {
  showBanner(String(msg));
}

// ================= ゲーム内HUD =================
const int = (c) => parseInt(c.slice(1), 16);

// run: RunScene インスタンス。scrollFactor 0 で画面固定描画する。
export function createHud(run) {
  const D = 1000; // HUD深度

  // --- 背景の半透明パネルは使わず、直接ウィジェットを置く ---
  const bar = run.add.graphics().setScrollFactor(0).setDepth(D);

  const lvText = run.add.text(8, 24, 'Lv 1', {
    fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
  }).setScrollFactor(0).setDepth(D + 1);

  const spText = run.add.text(8, 56, '', {
    fontFamily: 'monospace', fontSize: '10px', color: '#ffd23f',
  }).setScrollFactor(0).setDepth(D + 1);

  const timeText = run.add.text(320, 6, '5:00', {
    fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 1);

  const coinText = run.add.text(632, 44, '00', {
    fontFamily: 'monospace', fontSize: '12px', color: '#ffd23f',
  }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1);

  const overlayText = run.add.text(6, 344, '', {
    fontFamily: 'monospace', fontSize: '10px', color: '#7fffcf',
  }).setScrollFactor(0).setDepth(D + 1);

  // ★R32 どうくつのバフ表示。右上に縦積みで「なまえ ＋ のこり秒」を出す。
  //   効いていることが画面から読めないと、旧洞窟と同じ「取っても意味が分からない」に戻る。
  const BUFF_ROWS = 4;
  const buffTexts = [];
  for (let i = 0; i < BUFF_ROWS; i++) {
    buffTexts.push(run.add.text(632, 60 + i * 14, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#241040', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1).setVisible(false));
  }

  const pauseText = run.add.text(320, 180, 'ポーズちゅう\n（P でさいかい / R でやりなおし）', {
    fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', align: 'center',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5).setVisible(false);

  const muteText = run.add.text(320, 210, 'MUTE', {
    fontFamily: 'monospace', fontSize: '12px', color: '#ff9e66',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5).setVisible(false);

  // パーティ5枠（右上）
  const slotBoxes = [];
  const slotSprites = [];
  const slotBaseX = 520;
  for (let i = 0; i < 5; i++) {
    const x = slotBaseX + i * 24;
    const box = run.add.graphics().setScrollFactor(0).setDepth(D);
    box.lineStyle(1, 0x4de1c0, 0.6);
    box.strokeRect(x - 10, 6, 20, 20);
    slotBoxes.push(box);
    const spr = run.add.image(x, 16, 'white')
      .setScrollFactor(0).setDepth(D + 1).setVisible(false);
    slotSprites.push(spr);
  }

  // ボスHPバー（画面上部・ボス出現中のみ表示）
  const bossBar = run.add.graphics().setScrollFactor(0).setDepth(D + 2);
  const bossName = run.add.text(320, 28, 'BOSS', {
    fontFamily: 'monospace', fontSize: '12px', color: '#ff8fb3', fontStyle: 'bold',
  }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3).setVisible(false);

  let fps = 60;
  let fpsAcc = 0, fpsFrames = 0;
  let lastWLv = 0;      // FB#5: 直前の武器レベル（上昇検知用）
  let wLvPulse = 0;     // FB#5: ぶきLv 表示の強調パルス残り秒

  function draw() {
    // HPバー
    bar.clear();
    const hpW = 120;
    const hpRatio = Math.max(0, run.player.hp / run.player.maxHp);
    // 背景
    bar.fillStyle(0x102030, 0.9);
    bar.fillRect(8, 8, hpW, 10);
    // HP色（緑→赤）
    const g = Math.floor(200 * hpRatio) + 40;
    const r = Math.floor(220 * (1 - hpRatio)) + 30;
    const hpColor = (r << 16) | (g << 8) | 0x30;
    bar.fillStyle(hpColor, 1);
    bar.fillRect(8, 8, hpW * hpRatio, 10);
    bar.lineStyle(1, 0xffffff, 0.4);
    bar.strokeRect(8, 8, hpW, 10);
    // ジェル回復ゲージ（HPバーの真下）。溜まりきると回復する。
    // ★見せるのが目的。内部カウンタのままだと「あと少しで回復する」という拾う動機が生まれない。
    const GH = BALANCE.gemHeal;
    if (GH && GH.every > 0) {
      const ghRatio = Math.max(0, Math.min(1, (run.gemHealCount || 0) / GH.every));
      bar.fillStyle(0x0d2416, 0.9);
      bar.fillRect(8, 20, hpW, 3);
      // 8割を超えたら点滅させて「もうすぐ回復する＝いま拾いに行け」と主張する（elapsed基準で決定的）
      const near = ghRatio >= 0.8 && Math.floor(run.elapsed * 8) % 2 === 0;
      bar.fillStyle(near ? 0xffffff : 0x7dff8f, 1);
      bar.fillRect(8, 20, hpW * ghRatio, 3);
    }

    // XPバー
    const xpW = 120;
    const xpRatio = Math.max(0, Math.min(1, run.xp / run.xpNeed));
    bar.fillStyle(0x101a30, 0.9);
    bar.fillRect(8, 38, xpW, 4);
    bar.fillStyle(0x66ccff, 1);
    bar.fillRect(8, 38, xpW * xpRatio, 4);

    // ひっさつゲージ（XPバーの下）
    const sp = run.special;
    const spW = 120;
    bar.fillStyle(0x101a30, 0.9);
    bar.fillRect(8, 48, spW, 6);
    if (sp) {
      const spRatio = Math.max(0, Math.min(1, sp.charge));
      // 満タン時は elapsed ベースで決定的に点滅させて「押せる」ことを主張する
      const spColor = (sp.ready && Math.floor(run.elapsed * 6) % 2 === 0) ? 0xff6ec7 : 0xffd23f;
      bar.fillStyle(spColor, 1);
      bar.fillRect(8, 48, spW * spRatio, 6);
      spText.setText(sp.ready
        ? 'ひっさつ x' + sp.usesLeft + '  SPACE!'
        : 'ひっさつ x' + sp.usesLeft);
    } else {
      spText.setText('');
    }

    const wLv = (run.orbit && run.orbit.weaponLevel) || 0;
    // FB#5: 武器レベルが上がった瞬間だけ表示をパルスさせる（初期化時 lastWLv=0 は光らせない）。
    if (wLv > lastWLv && lastWLv > 0) wLvPulse = 0.6;
    lastWLv = wLv;
    // R4: 武器フォーム種別（きんせつ/えんきょり）を併記。全なかま共通なので1つの表示でよい。
    const form = run.orbit && run.orbit.currentForm;
    const formTag = form ? (form.kind === 'melee' ? ' ‹きんせつ›' : ' ‹えんきょり›') : '';
    lvText.setText(wLv ? 'Lv ' + run.level + '  ぶき Lv' + wLv + formTag : 'Lv ' + run.level);
    // FB#5: パルス中は色（ミント）とスケールを一瞬強調して「上がった」を主張する。
    if (wLvPulse > 0) {
      const p = wLvPulse / 0.6;
      lvText.setColor('#7fffcf').setScale(1 + p * 0.45);
    } else {
      lvText.setColor('#ffffff').setScale(1);
    }

    // タイマー（カウントダウン M:SS）。ボス出現時刻を過ぎたら赤の「BOSS」表示へ。
    if (run.elapsed >= BALANCE.boss.hudBossSec) {
      timeText.setText('BOSS').setColor('#ff4d6d');
    } else {
      const left = Math.max(0, run.runDurationSec - run.elapsed);
      const mm = Math.floor(left / 60);
      const ss = Math.floor(left % 60);
      timeText.setText(mm + ':' + (ss < 10 ? '0' + ss : ss)).setColor('#ffffff');
    }

    coinText.setText('C ' + run.coins);

    // ★R32 効いているどうくつのバフ。のこり2秒を切ったら点滅させて「そろそろ終わる」を知らせる。
    {
      const CB = BALANCE.cave.buffs;
      const rows = [];
      if (run.sunaShots > 0) {
        rows.push({ s: 'こんしんの いっとう ×' + run.sunaShots, c: '#ffe6a8', blink: false });
      }
      for (const id in run.buffs || {}) {
        const t = run.buffs[id];
        if (t <= 0) continue;
        const cfg = CB[id] || {};
        const col = '#' + ((cfg.tint || 0xffffff) & 0xffffff).toString(16).padStart(6, '0');
        rows.push({ s: (cfg.label || id) + ' ' + Math.ceil(t), c: col, blink: t < 2 });
      }
      for (let i = 0; i < BUFF_ROWS; i++) {
        const r = rows[i];
        if (!r) { buffTexts[i].setVisible(false); continue; }
        const on = !r.blink || Math.floor(run.elapsed * 8) % 2 === 0;
        buffTexts[i].setText(r.s).setColor(r.c).setVisible(on);
      }
    }

    // ボスHPバー
    bossBar.clear();
    const boss = run.boss;
    if (boss && boss.active) {
      // run.boss はシステムオブジェクト。HP は公転エンティティ側（boss.entity）が持つ。
      const ent = boss.entity;
      const bw = 360, bx = 140, by = 44;
      const ratio = ent ? Math.max(0, Math.min(1, (ent.hp || 0) / (ent.maxHp || 1))) : 0;
      // ★R34 段つきゲージ。最終ボスだけ3本に区切る。
      //   HP を 3.75 倍にして戦闘を伸ばしたので、1本の長いバーのままだと「減らない＝硬いだけ」に
      //   見える。区切り線を入れると **1本ぶち抜くたびに達成が数えられる**（＝分離/再合体の節目とも一致）。
      const seg = ent && ent.gaugeSegments > 1 ? ent.gaugeSegments : 1;
      bossBar.fillStyle(0x30060f, 0.9);
      bossBar.fillRect(bx, by, bw, 8);
      bossBar.fillStyle(0xff4d6d, 1);
      bossBar.fillRect(bx, by, bw * ratio, 8);
      if (seg > 1) {
        // 残っている段のぶんだけ、区切りの左側を明るく光らせる＝「いま何本目か」が一目で分かる
        const lit = Math.max(0, Math.ceil(ratio * seg) - 1);
        bossBar.fillStyle(0xffd23f, 0.55);
        bossBar.fillRect(bx, by, (bw / seg) * lit, 8);
        bossBar.lineStyle(2, 0x1a0510, 1);
        for (let s = 1; s < seg; s++) {
          bossBar.lineBetween(bx + (bw / seg) * s, by - 1, bx + (bw / seg) * s, by + 9);
        }
      }
      bossBar.lineStyle(1, 0xffffff, 0.5);
      bossBar.strokeRect(bx, by, bw, 8);
      if (ent && ent.def && ent.def.name) bossName.setText(ent.def.name);
      bossName.setVisible(true);
    } else {
      bossName.setVisible(false);
    }

    // パーティ枠
    for (let i = 0; i < 5; i++) {
      const m = run.party[i];
      if (m) {
        slotSprites[i].setVisible(true)
          .setTexture('mon_' + m.def.id)
          .setDisplaySize(18, 18)
          .clearTint();
      } else {
        slotSprites[i].setVisible(false);
      }
    }

    // ★れんしゅうじょうでは開発用の数字を消す。下段の帯（コース名・ヒント・成績）と
    //   左下で重なって、肝心の成績が読めなくなる（④の画面で実測）。
    overlayText.setText(run.practiceMode ? ''
      : `FPS ${fps} | 敵 ${run.enemies.length} | 弾 ${run.bullets.length} | seed ${run.seed}`);
  }

  return {
    update(delta) {
      // FPS平滑化
      if (delta != null) {
        fpsAcc += delta; fpsFrames++;
        if (fpsAcc >= 250) {
          fps = Math.round(1000 / (fpsAcc / fpsFrames));
          fpsAcc = 0; fpsFrames = 0;
        }
        if (wLvPulse > 0) wLvPulse = Math.max(0, wLvPulse - delta / 1000);   // FB#5: パルス減衰
      }
      draw();
    },
    setPause(on) { pauseText.setVisible(on); },
    setMute(on) { muteText.setVisible(on); },
  };
}
