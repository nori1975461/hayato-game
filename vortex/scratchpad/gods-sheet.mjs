// マキナ四神の確認シート用の共通部品（render-gods.mjs から切り出し。render-gaika.mjs も使う）。
//   実プレイ等倍（640×360・主人公 scale3）の枠／拡大／黒塗り／ドット文字。オーサリング専用＝ゲームには入らない
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { bbox } from './god-raster.mjs';
import { PLAYER_SPRITES } from '../src/data/monsters.js';

function idx(cv, x, y) { return (y * cv.w + x) * 3; }
export function rect(cv, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}
export function frame(cv, x0, y0, w, h, c) { rect(cv, x0, y0, w, 1, c); rect(cv, x0, y0 + h - 1, w, 1, c); rect(cv, x0, y0, 1, h, c); rect(cv, x0 + w - 1, y0, 1, h, c); }
const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '010'], K: ['101', '110', '100', '110', '101'], L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '011', '001'], R: ['110', '101', '110', '110', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '011'], V: ['101', '101', '101', '010', '010'],
  W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'], Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'], 3: ['110', '001', '010', '001', '110'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'], 6: ['011', '100', '110', '101', '010'], 7: ['111', '001', '010', '010', '010'],
  8: ['010', '101', '010', '101', '010'], 9: ['010', '101', '011', '001', '110'], '.': ['000', '000', '000', '000', '010'], '-': ['000', '000', '111', '000', '000'],
  '/': ['001', '001', '010', '100', '100'], ':': ['000', '010', '000', '010', '000'], ' ': ['000', '000', '000', '000', '000'], '(': ['001', '010', '010', '010', '001'],
  ')': ['100', '010', '010', '010', '100'], '×': ['101', '010', '101', '000', '000'], '+': ['000', '010', '111', '010', '000'],
};
export function text(cv, str, x, y, c, sc = 2) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (gl[r][k] === '1') rect(cv, cx + k * sc, y + r * sc, sc, sc, c);
    cx += 4 * sc;
  }
}
export const WHITE = [230, 232, 245], DIM = [130, 134, 160], BGC = [10, 10, 30], FR = [60, 62, 90];

// 実プレイ画面（既定 640×360）にボスと主人公を置く。枠より大きいボスは枠で切る（画面に入らない事実をそのまま見せる）
export function playFrame(cv, x0, y0, def, label, fw = 640, fh = 360) {
  rect(cv, x0, y0, fw, fh, BGC); frame(cv, x0, y0, fw, fh, FR);
  if (label) text(cv, label, x0 + 6, y0 - 16, DIM, 2);
  const tmp = makeCanvas(fw, fh); rect(tmp, 0, 0, fw, fh, BGC);
  renderBoss(tmp, def, def.tier, fw / 2, fh / 2);
  blitSimple(tmp, PLAYER_SPRITES[2], fw / 2 - 20, fh - 50, 3);
  for (let y = 1; y < fh - 1; y++) for (let x = 1; x < fw - 1; x++) { const a = idx(cv, x0 + x, y0 + y), b = idx(tmp, x, y); cv.px[a] = tmp.px[b]; cv.px[a + 1] = tmp.px[b + 1]; cv.px[a + 2] = tmp.px[b + 2]; }
}
export function occupancy(def) { const b = bbox(def); const s = def.tier.spriteScale; return { w: Math.round(b.w * s), h: Math.round(b.h * s), units: `${b.w.toFixed(1)}×${b.h.toFixed(1)}` }; }
// 実際に塗られた範囲（スプライトの余白を除く＝画面で目に見える大きさ）
const DEF_ORG = { armR: [0.5, 0.12], armL: [0.5, 0.12], legR: [0.5, 0.1], legL: [0.5, 0.1], cannon: [0.15, 0.5] };
export function drawnBox(def) {
  let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
  for (const p of def.rig) {
    const sp = def.sprites[p.tex], w = sp.rows[0].length, h = sp.rows.length;
    const org = p.origin || DEF_ORG[p.role] || [0.5, 0.5];
    const x0 = p.ox - (p.mirror ? (1 - org[0]) : org[0]) * w, y0 = p.oy - org[1] * h;
    sp.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const xx = p.mirror ? x0 + (w - 1 - x) : x0 + x;
      l = Math.min(l, xx); r = Math.max(r, xx + 1); t = Math.min(t, y0 + y); b = Math.max(b, y0 + y + 1);
    }));
  }
  return { l, r, t, b, w: r - l, h: b - t };
}

// 1体ぶんのシート：左＝実プレイ等倍／右＝拡大／左下＝黒塗り
export function sheet(def, title, file) {
  const cv = makeCanvas(1310, 720);
  text(cv, title, 12, 10, WHITE, 3);
  playFrame(cv, 12, 46, def, `IN GAME 640×360 (SCALE ${def.tier.spriteScale})`);
  const dx0 = 668, dy0 = 46;
  rect(cv, dx0, dy0, 630, 660, BGC); frame(cv, dx0, dy0, 630, 660, FR);
  text(cv, 'DETAIL', dx0 + 6, dy0 - 16, DIM, 2);
  const b = bbox(def);
  const ds = Math.min(12, 600 / b.w, 630 / b.h);
  renderBoss(cv, def, def.tier, dx0 + 315 - (b.l + b.w / 2) * ds, dy0 + 330 - (b.t + b.h / 2) * ds, { scaleOverride: ds, glow: false });
  const sx0 = 12, sy0 = 426;
  rect(cv, sx0, sy0, 640, 280, [232, 232, 240]); frame(cv, sx0, sy0, 640, 280, FR);
  text(cv, 'SILHOUETTE', sx0 + 6, sy0 - 16, DIM, 2);
  const ss = Math.min(3.6, 600 / b.w, 260 / b.h);
  renderBoss(cv, def, def.tier, sx0 + 320 - (b.l + b.w / 2) * ss, sy0 + 140 - (b.t + b.h / 2) * ss, { scaleOverride: ss, silhouette: '#101018' });
  writePng(cv, file);
}
// 陣形（複数の個体を一つの枠に）：左＝実プレイ等倍（枠は opt.fh・中に本当の画面 360 の帯を薄い枠で示す）／右＝黒塗り。items＝[[def, dx, dy], ...]（dx/dy は画面中心からの px）
export function formationSheet(items, title, file, opt = {}) {
  const fh = opt.fh ?? 440, cv = makeCanvas(1310, fh + 76);
  text(cv, title, 12, 10, WHITE, 3);
  const draw = (x0, y0, label, sil) => {
    const bg = sil ? [232, 232, 240] : BGC;
    rect(cv, x0, y0, 640, fh, bg); frame(cv, x0, y0, 640, fh, FR); text(cv, label, x0 + 6, y0 - 16, DIM, 2);
    const tmp = makeCanvas(640, fh); rect(tmp, 0, 0, 640, fh, bg);
    for (const [d, dx, dy] of items) renderBoss(tmp, d, d.tier, 320 + dx, fh / 2 + dy, sil ? { silhouette: '#101018' } : {});
    if (!sil) blitSimple(tmp, PLAYER_SPRITES[2], 300, fh - 50, 3);
    for (let y = 1; y < fh - 1; y++) for (let x = 1; x < 639; x++) { const a = idx(cv, x0 + x, y0 + y), b = idx(tmp, x, y); cv.px[a] = tmp.px[b]; cv.px[a + 1] = tmp.px[b + 1]; cv.px[a + 2] = tmp.px[b + 2]; }
    if (fh > 360) frame(cv, x0, y0 + Math.floor((fh - 360) / 2), 640, 360, sil ? [150, 150, 180] : [90, 92, 140]);
  };
  draw(12, 46, `IN GAME 640×${fh} (SCREEN IS 640×360 = INNER FRAME)`, false);
  draw(668, 46, 'SILHOUETTE', true);
  writePng(cv, file);
}
// 2×2 の並び（各セルは実プレイ等倍。opt.cellH で縦を広げられる＝画面より背の高いボスも全身を比べる）
export function grid4(cells, file, opt = {}) {
  const ch = opt.cellH ?? 360;
  const cv = makeCanvas(1310, ch * 2 + 70);
  const pos = [[12, 30], [668, 30], [12, ch + 60], [668, ch + 60]];
  cells.forEach(([d, l], i) => playFrame(cv, pos[i][0], pos[i][1], d, l, 640, ch));
  writePng(cv, file);
}
// 1×2 の並び（変種の比較用。各セルは実プレイ等倍）
export function grid2(cells, file, opt = {}) {
  const ch = opt.cellH ?? 360;
  const cv = makeCanvas(1310, ch + 40);
  const pos = [[12, 30], [668, 30]];
  cells.forEach(([d, l], i) => playFrame(cv, pos[i][0], pos[i][1], d, l, 640, ch));
  writePng(cv, file);
}
// 全パーツ（拡大）：設計の点検用
export function partsSheet(d, file) {
  const names = Object.keys(d.sprites);
  let tw = 10, th = 0;
  for (const n of names) { const sp = d.sprites[n]; tw += sp.rows[0].length * 6 + 14; th = Math.max(th, sp.rows.length * 6); }
  const cv = makeCanvas(Math.min(tw, 2400), th + 30);
  let x = 10;
  for (const n of names) { const sp = d.sprites[n]; if (x + sp.rows[0].length * 6 > cv.w) break; blitSimple(cv, sp, x, 20, 6); x += sp.rows[0].length * 6 + 14; }
  writePng(cv, file);
}
export function report(defs) {
  console.log('\n=== 画面占有（実プレイ等倍 / 画面 640×360 / 主人公 72×54）===');
  for (const [n, d] of defs) {
    const s = d.tier.spriteScale, db = drawnBox(d), o = occupancy(d);
    const w = Math.round(db.w * s), h = Math.round(db.h * s);
    const over = w > 640 || h > 360 ? '  ← 画面からはみ出す' : '';
    console.log(`  ${n.padEnd(12)}: 塗り ${String(w).padStart(3)}×${String(h).padStart(3)} px（上 ${Math.round(db.t * s)} 下 ${Math.round(db.b * s)}）  枠 ${o.w}×${o.h} px  (${db.w}×${db.h} units × ${s})${over}`);
  }
  for (const [, d] of defs) {
    if (!d.concept) continue;
    const cols = new Set(); for (const sp of Object.values(d.sprites)) for (const row of sp.rows) for (const ch of row) if (ch !== '.') cols.add(ch);
    console.log(`  ${d.id}: パーツ ${Object.keys(d.sprites).length}・使用色 ${cols.size}・` + Object.entries(d.sprites).map(([n, sp]) => `${n} ${sp.rows[0].length}x${sp.rows.length}`).join(' / '));
  }
}
