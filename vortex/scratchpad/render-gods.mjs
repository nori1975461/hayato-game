// 三体（腐蝕の玉座／軌道神核／マオウレクス第一形態）の昇華案を、実プレイ等倍（640×360・主人公 scale3）＋拡大＋黒塗りで描く。
//   node scratchpad/render-gods.mjs
//   出力: gods-throne.png / gods-godcore.png / gods-maou1.png（各1枚のシート）
//         gods-before-after.png（軌道神核・マオウレクスの現行と新の並び）／gods-four.png（大聖堂を含む四体の並び）
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { THRONE } from './throne-candidates.mjs';
import { GODCORE } from './godcore-candidates.mjs';
import { MAOU1 } from './maou1-candidates.mjs';
import { CATHEDRAL as CATH_DRAFT } from './cathedral-candidates.mjs';
import { bbox } from './god-raster.mjs';
import { BOSSES, CATHEDRAL } from '../src/data/enemies.js';
import { BALANCE } from '../src/data/balance.js';
import { PLAYER_SPRITES } from '../src/data/monsters.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const maou = BOSSES.find((b) => b.id === 'maou');
const maouTier = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
const tf = maouTier.trueForm;
const NOW_GODCORE = { id: 'godcoreNow', sprites: maou.trueSprites, rig: maou.trueRig, tier: { spriteScale: tf.spriteScale, glowScale: tf.glowScale, glowOuter: tf.glowOuter, glowInner: tf.glowInner } };
const NOW_MAOU1 = { id: 'maou1Now', sprites: maou.sprites, rig: maou.rig, tier: { spriteScale: maouTier.spriteScale, glowScale: maouTier.glowScale, glowOuter: maouTier.glowOuter, glowInner: maouTier.glowInner } };
const CATH = { id: 'cathedral', sprites: CATHEDRAL.sprites, rig: CATHEDRAL.rig, tier: CATH_DRAFT.tier };

function idx(cv, x, y) { return (y * cv.w + x) * 3; }
function rect(cv, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}
function frame(cv, x0, y0, w, h, c) { rect(cv, x0, y0, w, 1, c); rect(cv, x0, y0 + h - 1, w, 1, c); rect(cv, x0, y0, 1, h, c); rect(cv, x0 + w - 1, y0, 1, h, c); }
const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '110', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '011'], V: ['101', '101', '101', '010', '010'],
  W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'], Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'], 3: ['110', '001', '010', '001', '110'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'], 6: ['011', '100', '110', '101', '010'], 7: ['111', '001', '010', '010', '010'],
  8: ['010', '101', '010', '101', '010'], 9: ['010', '101', '011', '001', '110'], '.': ['000', '000', '000', '000', '010'], '-': ['000', '000', '111', '000', '000'],
  '/': ['001', '001', '010', '100', '100'], ':': ['000', '010', '000', '010', '000'], ' ': ['000', '000', '000', '000', '000'], '(': ['001', '010', '010', '010', '001'],
  ')': ['100', '010', '010', '010', '100'], '×': ['101', '010', '101', '000', '000'], '+': ['000', '010', '111', '010', '000'],
};
function text(cv, str, x, y, c, sc = 2) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (gl[r][k] === '1') rect(cv, cx + k * sc, y + r * sc, sc, sc, c);
    cx += 4 * sc;
  }
}
const WHITE = [230, 232, 245], DIM = [130, 134, 160], BGC = [10, 10, 30], FR = [60, 62, 90];

// 実プレイ画面（640×360）にボスと主人公を置く
function playFrame(cv, x0, y0, def, label) {
  rect(cv, x0, y0, 640, 360, BGC); frame(cv, x0, y0, 640, 360, FR);
  if (label) text(cv, label, x0 + 6, y0 - 16, DIM, 2);
  renderBoss(cv, def, def.tier, x0 + 320, y0 + 180);
  blitSimple(cv, PLAYER_SPRITES[2], x0 + 300, y0 + 310, 3);
}
function occupancy(def) { const b = bbox(def); const s = def.tier.spriteScale; return { w: Math.round(b.w * s), h: Math.round(b.h * s), units: `${b.w.toFixed(1)}×${b.h.toFixed(1)}` }; }

// ---- 1体ぶんのシート：左＝実プレイ等倍／右＝拡大／左下＝黒塗り ----
function sheet(def, title, file) {
  const cv = makeCanvas(1310, 720);
  text(cv, title, 12, 10, WHITE, 3);
  playFrame(cv, 12, 46, def, `IN GAME 640×360 (SCALE ${def.tier.spriteScale})`);
  const dx0 = 668, dy0 = 46;
  rect(cv, dx0, dy0, 630, 660, BGC); frame(cv, dx0, dy0, 630, 660, FR);
  text(cv, 'DETAIL', dx0 + 6, dy0 - 16, DIM, 2);
  const b = bbox(def);
  const ds = Math.min(12, 600 / b.w, 630 / b.h);
  renderBoss(cv, def, def.tier, dx0 + 315 - (b.l + b.w / 2) * ds, dy0 + 330 - (b.t + b.h / 2) * ds, { scaleOverride: ds, glow: false });
  // 黒塗り（言い当てられるか）
  const sx0 = 12, sy0 = 426;
  rect(cv, sx0, sy0, 640, 280, [232, 232, 240]); frame(cv, sx0, sy0, 640, 280, FR);
  text(cv, 'SILHOUETTE', sx0 + 6, sy0 - 16, DIM, 2);
  const ss = Math.min(3.6, 600 / b.w, 260 / b.h);
  renderBoss(cv, def, def.tier, sx0 + 320 - (b.l + b.w / 2) * ss, sy0 + 140 - (b.t + b.h / 2) * ss, { scaleOverride: ss, silhouette: '#101018' });
  writePng(cv, path.join(HERE, file));
}

sheet(THRONE, 'FUSHOKU NO GYOKUZA / NEW', 'gods-throne.png');
sheet(GODCORE, 'KIDOU SHINKAKU / NEW', 'gods-godcore.png');
sheet(MAOU1, 'MAOUREX FORM 1 / NEW', 'gods-maou1.png');

// ---- 現行と新（軌道神核・マオウレクス）：2×2 ----
{
  const cv = makeCanvas(1310, 790);
  const cells = [
    [12, 30, NOW_GODCORE, 'KIDOU SHINKAKU / NOW (SCALE 7.4)'], [668, 30, GODCORE, `KIDOU SHINKAKU / NEW (SCALE ${GODCORE.tier.spriteScale})`],
    [12, 420, NOW_MAOU1, 'MAOUREX FORM 1 / NOW (SCALE 9.6)'], [668, 420, MAOU1, `MAOUREX FORM 1 / NEW (SCALE ${MAOU1.tier.spriteScale})`],
  ];
  for (const [x, y, d, l] of cells) playFrame(cv, x, y, d, l);
  writePng(cv, path.join(HERE, 'gods-before-after.png'));
}
// ---- 四体（大聖堂＝現行・軌道神核 新・腐蝕の玉座 新・マオウレクス 新）：2×2 ----
{
  const cv = makeCanvas(1310, 790);
  const cells = [
    [12, 30, CATH, 'DATEN NO DAISEIDOU (NOW)'], [668, 30, GODCORE, 'KIDOU SHINKAKU (NEW)'],
    [12, 420, THRONE, 'FUSHOKU NO GYOKUZA (NEW)'], [668, 420, MAOU1, 'MAOUREX FORM 1 (NEW)'],
  ];
  for (const [x, y, d, l] of cells) playFrame(cv, x, y, d, l);
  writePng(cv, path.join(HERE, 'gods-four.png'));
}
// ---- 前回案（.prev-*.mjs があれば）と今回案：2×2 ----
if (fs.existsSync(path.join(HERE, '.prev-godcore.mjs')) && fs.existsSync(path.join(HERE, '.prev-maou1.mjs'))) {
  const { GODCORE: PG } = await import('./.prev-godcore.mjs');
  const { MAOU1: PM } = await import('./.prev-maou1.mjs');
  const cv = makeCanvas(1310, 790);
  const cells = [
    [12, 30, PG, 'KIDOU SHINKAKU / PREV'], [668, 30, GODCORE, 'KIDOU SHINKAKU / NEW'],
    [12, 420, PM, 'MAOUREX FORM 1 / PREV'], [668, 420, MAOU1, 'MAOUREX FORM 1 / NEW'],
  ];
  for (const [x, y, d, l] of cells) playFrame(cv, x, y, d, l);
  writePng(cv, path.join(HERE, 'gods-prev-new.png'));
}
// ---- 全パーツ（拡大）：設計の点検用 ----
for (const d of [THRONE, GODCORE, MAOU1]) {
  const names = Object.keys(d.sprites);
  let tw = 10, th = 0;
  for (const n of names) { const sp = d.sprites[n]; tw += sp.rows[0].length * 6 + 14; th = Math.max(th, sp.rows.length * 6); }
  const cv = makeCanvas(Math.min(tw, 2400), th + 30);
  let x = 10;
  for (const n of names) { const sp = d.sprites[n]; if (x + sp.rows[0].length * 6 > cv.w) break; blitSimple(cv, sp, x, 20, 6); x += sp.rows[0].length * 6 + 14; }
  writePng(cv, path.join(HERE, `gods-parts-${d.id}.png`));
}

console.log('\n=== 画面占有（実プレイ等倍 / 画面 640×360 / 主人公 72×54）===');
for (const [n, d] of [['大聖堂（現行）', CATH], ['軌道神核（現行）', NOW_GODCORE], ['軌道神核（新）', GODCORE], ['腐蝕の玉座（新）', THRONE], ['マオウレクス（現行）', NOW_MAOU1], ['マオウレクス（新）', MAOU1]]) {
  const o = occupancy(d);
  const over = o.w > 640 || o.h > 360 ? '  ← 画面からはみ出す' : '';
  console.log(`  ${n.padEnd(12)}: ${String(o.w).padStart(3)}×${String(o.h).padStart(3)} px  (${o.units} units × ${d.tier.spriteScale})${over}`);
}
for (const d of [THRONE, GODCORE, MAOU1]) {
  const cols = new Set(); for (const sp of Object.values(d.sprites)) for (const row of sp.rows) for (const ch of row) if (ch !== '.') cols.add(ch);
  console.log(`  ${d.id}: パーツ ${Object.keys(d.sprites).length}・使用色 ${cols.size}・` + Object.entries(d.sprites).map(([n, sp]) => `${n} ${sp.rows[0].length}x${sp.rows.length}`).join(' / '));
}
