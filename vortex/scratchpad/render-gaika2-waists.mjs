// 腰の文法の四版（ノイエ・ジール／ドム／ザク／ジオング）をまとめて撮る。node render-gaika2-waists.mjs
//   gaika2-waists-grid.png（2×2・胴の拡大）と、版ごとの全身 gaika2-waist-<版>-sheet.png・胴の拡大 gaika2-waist-<版>-zoom.png（すべて 640×360）
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { bbox } from './god-raster.mjs';
import { rect, text, BGC, DIM, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const VERS = [['nz', 'NEUE ZIEL', M.GAIKA2], ['dom', 'DOM', M.GAIKA2_DOM], ['zaku', 'ZAKU', M.GAIKA2_ZAKU], ['zeong', 'ZEONG', M.GAIKA2_ZEONG]];
const blit = (dst, src, ox, oy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const s = (y * src.w + x) * 3, t = ((y + oy) * dst.w + x + ox) * 3; dst.px[t] = src.px[s]; dst.px[t + 1] = src.px[s + 1]; dst.px[t + 2] = src.px[s + 2]; } };
const view = (d, w, h, S, wy, glow, label) => { const cv = makeCanvas(w, h); rect(cv, 0, 0, w, h, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: S }, w / 2, h / 2 - wy * S, { glow }); if (label) text(cv, label, 6, 6, WHITE, 1); return cv; };
const grid = makeCanvas(640, 360); rect(grid, 0, 0, 640, 360, [40, 42, 64]);
VERS.forEach(([tag, label, d], i) => {
  blit(grid, view(d, 319, 179, 2.1, 6, true, label), (i % 2) * 321, Math.floor(i / 2) * 181);
  writePng(view(d, 640, 360, 2.6, 2, false, label + ' / TORSO x2.6'), `./gaika2-waist-${tag}-zoom.png`);
  const b = bbox(d), S = Math.min(2, 340 / b.h, 632 / b.w), sheet = makeCanvas(640, 360); rect(sheet, 0, 0, 640, 360, BGC);
  renderBoss(sheet, d, { ...d.tier, spriteScale: S }, 320 - ((b.l + b.r) / 2) * S, 186 - ((b.t + b.b) / 2) * S); text(sheet, label, 8, 6, DIM, 1);
  writePng(sheet, `./gaika2-waist-${tag}-sheet.png`);
});
writePng(grid, './gaika2-waists-grid.png'); console.log('WAISTS_OK');
