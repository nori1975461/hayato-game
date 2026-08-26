// 真マオウレクス3案（A 堕天の大聖堂 / B 腐蝕の玉座 / C 軌道神核）の見比べ用プレビュー。
//
// 判定は必ず実プレイの等倍で行う（[[feedback_pixel_art_judge_at_play_zoom]]）ので、
// 左に「ゲーム画面 480×360 そのもの（主人公 scale3.0 と現行マオウレクスの輪郭つき）」を、
// 右に「形を見るための拡大」を並べる。シルエットも別に出して、黒塗りで何か言い当てられるか見る。
//
// node vortex/scratchpad/render-maou-true.mjs
//   出力: maou-true-A/B/C.png ・ maou-true-compare.png ・ maou-true-silhouette.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng, hex } from './render-boss-rig.mjs';
import { CANDIDATES } from './maou-true-candidates.mjs';
import { BOSSES } from '../src/data/enemies.js';
import { BALANCE } from '../src/data/balance.js';
import { PLAYER_SPRITES } from '../src/data/monsters.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const maouDef = BOSSES.find((b) => b.id === 'maou');
const maouTier = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
// 第3形態（メタリックパープル）の見た目＝合体後に差し替わるグロウ色
const maouP3 = { ...maouTier, glowOuter: maouTier.merge.glowOuter, glowInner: maouTier.merge.glowInner };

function idx(cv, x, y) { return (y * cv.w + x) * 3; }
function rect(cv, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}
function frame(cv, x0, y0, w, h, c) {
  rect(cv, x0, y0, w, 1, c); rect(cv, x0, y0 + h - 1, w, 1, c);
  rect(cv, x0, y0, 1, h, c); rect(cv, x0 + w - 1, y0, 1, h, c);
}

// 高さ5の極小フォント（ラベル用。ASCII大文字と数字と一部記号だけ）
const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], K: ['101', '110', '100', '110', '101'],
  L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '110', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '011'], V: ['101', '101', '101', '010', '010'],
  W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['110', '001', '010', '100', '111'], 3: ['110', '001', '010', '001', '110'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'],
  6: ['011', '100', '110', '101', '010'], 7: ['111', '001', '010', '010', '010'],
  8: ['010', '101', '010', '101', '010'], 9: ['010', '101', '011', '001', '110'],
  '.': ['000', '000', '000', '000', '010'], '-': ['000', '000', '111', '000', '000'],
  '/': ['001', '001', '010', '100', '100'], ':': ['000', '010', '000', '010', '000'],
  ' ': ['000', '000', '000', '000', '000'], '(': ['001', '010', '010', '010', '001'],
  ')': ['100', '010', '010', '010', '100'], '=': ['000', '111', '000', '111', '000'],
  '×': ['101', '010', '101', '000', '000'], '+': ['000', '010', '111', '010', '000'],
};
function text(cv, str, x, y, c, sc = 2) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) {
      if (gl[r][k] === '1') rect(cv, cx + k * sc, y + r * sc, sc, sc, c);
    }
    cx += 4 * sc;
  }
}

const WHITE = [230, 232, 245], DIM = [120, 124, 150];

// ---- 1案ぶんの詳細シート ----
function sheet(cand) {
  const cv = makeCanvas(1020, 560);
  text(cv, cand.id.replace('maouTrue', 'PLAN '), 12, 12, WHITE, 3);

  // 左：実プレイの画面そのもの（480×360）
  const px0 = 12, py0 = 46;
  rect(cv, px0, py0, 480, 360, [10, 10, 30]);
  frame(cv, px0, py0, 480, 360, [60, 62, 90]);
  text(cv, 'IN GAME 480×360 (SCALE ' + cand.tier.spriteScale + ')', px0 + 6, py0 - 16, DIM, 2);
  renderBoss(cv, cand, cand.tier, px0 + 240, py0 + 180);
  blitSimple(cv, PLAYER_SPRITES[2], px0 + 228, py0 + 288, 3);   // 主人公 24×18 を scale3

  // 右：形を見るための拡大
  const dx0 = 512, dy0 = 46;
  rect(cv, dx0, dy0, 496, 502, [10, 10, 30]);
  frame(cv, dx0, dy0, 496, 502, [60, 62, 90]);
  text(cv, 'DETAIL', dx0 + 6, dy0 - 16, DIM, 2);
  // 拡大は「枠に収まる最大」まで。固定倍率にすると案Cが枠からはみ出して環が切れる
  const m = measure(cand, cand.tier);
  const [uw, uh] = m.units.split('×').map(Number);
  const ds = Math.min(cand.tier.spriteScale * 1.35, 470 / uw, 480 / uh);
  renderBoss(cv, cand, cand.tier, dx0 + 248, dy0 + 262, { scaleOverride: ds, glow: false });

  writePng(cv, path.join(HERE, `maou-true-${cand.id.slice(-1)}.png`));
}

// ---- 3案＋現行を実プレイ等倍で横並び ----
function compare() {
  const cv = makeCanvas(1960, 420);
  const cols = [
    { label: 'NOW: PHASE3 (PURPLE)', def: maouDef, tier: maouP3 },
    ...CANDIDATES.map((c) => ({ label: 'PLAN ' + c.id.slice(-1), def: c, tier: c.tier })),
  ];
  cols.forEach((col, i) => {
    const x = 10 + i * 488;
    rect(cv, x, 34, 478, 376, [10, 10, 30]);
    frame(cv, x, 34, 478, 376, [60, 62, 90]);
    text(cv, col.label, x + 6, 14, WHITE, 2);
    renderBoss(cv, col.def, col.tier, x + 239, 34 + 188);
    blitSimple(cv, PLAYER_SPRITES[2], x + 227, 34 + 312, 3);
  });
  writePng(cv, path.join(HERE, 'maou-true-compare.png'));
}

// ---- シルエット（黒塗りで何か言い当てられるか） ----
function silhouette() {
  const cv = makeCanvas(1960, 300);
  const cols = [
    { label: 'NOW', def: maouDef, tier: maouP3 },
    ...CANDIDATES.map((c) => ({ label: c.id.slice(-1), def: c, tier: c.tier })),
  ];
  cols.forEach((col, i) => {
    const x = 10 + i * 488;
    rect(cv, x, 24, 478, 268, [232, 232, 240]);
    text(cv, col.label, x + 6, 8, WHITE, 2);
    renderBoss(cv, col.def, col.tier, x + 239, 24 + 130,
      { scaleOverride: col.tier.spriteScale * 0.72, silhouette: '#101018' });
  });
  writePng(cv, path.join(HERE, 'maou-true-silhouette.png'));
}

// ---- ASCII 検算：占有サイズが画面(480×360)に収まっているか ----
function measure(def, tier) {
  const s = tier.spriteScale;
  let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
  for (const p of def.rig) {
    const sp = def.sprites[p.tex];
    const w = sp.rows[0].length, h = sp.rows.length;
    const org = p.origin || (p.role === 'armR' || p.role === 'armL' ? [0.5, 0.12]
      : p.role === 'legR' || p.role === 'legL' ? [0.5, 0.1] : [0.5, 0.5]);
    const x0 = p.ox - (p.mirror ? (1 - org[0]) : org[0]) * w;
    const y0 = p.oy - org[1] * h;
    l = Math.min(l, x0); r = Math.max(r, x0 + w);
    t = Math.min(t, y0); b = Math.max(b, y0 + h);
  }
  return { w: Math.round((r - l) * s), h: Math.round((b - t) * s), units: `${(r - l).toFixed(1)}×${(b - t).toFixed(1)}` };
}

for (const c of CANDIDATES) sheet(c);
compare();
silhouette();

console.log('\n=== 画面占有（実プレイ等倍 / 画面は 480×360）===');
const mNow = measure(maouDef, maouP3);
console.log(`  現行 第3形態 : ${String(mNow.w).padStart(3)}×${String(mNow.h).padStart(3)} px  (${mNow.units} units × ${maouP3.spriteScale})`);
for (const c of CANDIDATES) {
  const m = measure(c, c.tier);
  const over = m.w > 480 || m.h > 360 ? '  ← 画面からはみ出す' : '';
  console.log(`  ${c.id.slice(-1)} ${c.name.split('／')[1].padEnd(6)} : ${String(m.w).padStart(3)}×${String(m.h).padStart(3)} px  (${m.units} units × ${c.tier.spriteScale})${over}`);
}
console.log('\n  参考: 主人公 24×18 × scale3.0 = 72×54 px');
