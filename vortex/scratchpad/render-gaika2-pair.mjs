// 第二案の変種を左右に並べて同じ場所を拡大する（640×360）。node render-gaika2-pair.mjs [倍率=2.4] [中心の世界y=5] [glow=1] [右の変種の export 名=GAIKA2_SLAB]
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, DIM } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const S = Number(process.argv[2]) || 2.4, wy = Number(process.argv[3] ?? 5), glow = process.argv[4] !== '0', alt = process.argv[5] || 'GAIKA2_SLAB';
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, BGC);
[[M.GAIKA2, 'GAIKA2'], [M[alt], alt]].forEach(([d, label], i) => {
  const cv = makeCanvas(318, 360); rect(cv, 0, 0, 318, 360, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, 159, 180 - wy * S, { glow });
  text(cv, label, 6, 6, DIM, 1);
  for (let y = 0; y < 360; y++) for (let x = 0; x < 318; x++) { const s = (y * 318 + x) * 3, t = (y * 640 + x + i * 322) * 3; out.px[t] = cv.px[s]; out.px[t + 1] = cv.px[s + 1]; out.px[t + 2] = cv.px[s + 2]; }
});
writePng(out, './gaika2-pair.png'); console.log('PAIR_OK');
