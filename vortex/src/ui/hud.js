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
  const bossName = run.add.text(320, 28, 'ウズキング', {
    fontFamily: 'monospace', fontSize: '12px', color: '#ff8fb3', fontStyle: 'bold',
  }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3).setVisible(false);

  let fps = 60;
  let fpsAcc = 0, fpsFrames = 0;

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
    lvText.setText(wLv ? 'Lv ' + run.level + '  ぶき Lv' + wLv : 'Lv ' + run.level);

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

    // ボスHPバー
    bossBar.clear();
    const boss = run.boss;
    if (boss && boss.active) {
      // run.boss はシステムオブジェクト。HP は公転エンティティ側（boss.entity）が持つ。
      const ent = boss.entity;
      const bw = 360, bx = 140, by = 44;
      const ratio = ent ? Math.max(0, Math.min(1, (ent.hp || 0) / (ent.maxHp || 1))) : 0;
      bossBar.fillStyle(0x30060f, 0.9);
      bossBar.fillRect(bx, by, bw, 8);
      bossBar.fillStyle(0xff4d6d, 1);
      bossBar.fillRect(bx, by, bw * ratio, 8);
      bossBar.lineStyle(1, 0xffffff, 0.5);
      bossBar.strokeRect(bx, by, bw, 8);
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

    overlayText.setText(
      `FPS ${fps} | 敵 ${run.enemies.length} | 弾 ${run.bullets.length} | seed ${run.seed}`
    );
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
      }
      draw();
    },
    setPause(on) { pauseText.setVisible(on); },
    setMute(on) { muteText.setVisible(on); },
  };
}
