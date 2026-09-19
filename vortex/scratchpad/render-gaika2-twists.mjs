// ザク型の「ひねり」の候補を 2×2 で撮る（第45稿）。node render-gaika2-twists.mjs
//   軸は一つ＝「管がどこまで主張するか」。A＝第44稿のザク版（胸の下から襟への短い管・参考）／B＝胸の下の角を落とし、その陰から管が出る（route 'tuck'・鋼＝第45稿の既定 GAIKA2・輪郭は A とほぼ同じ）
//   C＝B＋弱い残り火（胸に近い半分の節の奥だけ暗い深紅）／D＝胸の脇の外を通る長い管（route 'long'・輪郭が A より最大 16px 広がる）
//   gaika2-twists-grid.png（2×2・胴の拡大）と、候補ごとの全身 gaika2-twist-<a|b|c|d>-sheet.png・胴の拡大 -zoom.png（すべて 640×360）
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { bbox } from './god-raster.mjs';
import { rect, text, BGC, DIM, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const T = (torsoOpt) => M.gaika2With({ torso: 'zaku2', torsoOpt });
const VERS = [['a', 'A  DRAFT 44 ZAKU / SHORT PIPES', M.GAIKA2_ZAKU], ['b', 'B  TUCKED PIPES / STEEL  (DEFAULT)', M.GAIKA2], ['c', 'C  TUCKED PIPES / EMBER LOW', T({ route: 'tuck', ember: 'low' })], ['d', 'D  LONG PIPES OUTSIDE THE CHEST', T({ route: 'long' })]];
const blit = (dst, src, ox, oy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const s = (y * src.w + x) * 3, t = ((y + oy) * dst.w + x + ox) * 3; dst.px[t] = src.px[s]; dst.px[t + 1] = src.px[s + 1]; dst.px[t + 2] = src.px[s + 2]; } };
const view = (d, w, h, S, wy, glow, label) => { const cv = makeCanvas(w, h); rect(cv, 0, 0, w, h, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: S }, w / 2, h / 2 - wy * S, { glow }); if (label) text(cv, label, 6, 6, WHITE, 1); return cv; };
const grid = makeCanvas(640, 360); rect(grid, 0, 0, 640, 360, [40, 42, 64]);
VERS.forEach(([tag, label, d], i) => {
  blit(grid, view(d, 319, 179, 2.4, 3, false, label), (i % 2) * 321, Math.floor(i / 2) * 181);
  writePng(view(d, 640, 360, 2.6, 2, false, label + ' / TORSO x2.6'), `./gaika2-twist-${tag}-zoom.png`);
  const b = bbox(d), S = Math.min(2, 340 / b.h, 632 / b.w), sheet = makeCanvas(640, 360); rect(sheet, 0, 0, 640, 360, BGC);
  renderBoss(sheet, d, { ...d.tier, spriteScale: S }, 320 - ((b.l + b.r) / 2) * S, 186 - ((b.t + b.b) / 2) * S); text(sheet, label, 8, 6, DIM, 1);
  writePng(sheet, `./gaika2-twist-${tag}-sheet.png`);
});
writePng(grid, './gaika2-twists-grid.png'); console.log('TWISTS_OK');
