// 候補をいくつでも、同じ場所・同じ倍率で格子に並べる（版×枚数の一覧用）。node render-gaika2-cand-grid.mjs <出力名> <倍率> <中心の世界x> <中心の世界y> <列の数> <枠の幅> <枠の高さ> "札=候補" ...
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [file, S, wx, wy, COLS, PW, PH] = [process.argv[2], Number(process.argv[3]) || 1, Number(process.argv[4]) || 0, Number(process.argv[5]) || 0, Number(process.argv[6]) || 4, Number(process.argv[7]) || 344, Number(process.argv[8]) || 352];
const items = process.argv.slice(9).map((arg) => { const k = arg.indexOf('='); return { label: arg.slice(0, k), a: arg.slice(k + 1) }; });
const ROWS = Math.ceil(items.length / COLS), W = COLS * PW + (COLS - 1) * 2, H = ROWS * PH + (ROWS - 1) * 2, out = makeCanvas(W, H); rect(out, 0, 0, W, H, [40, 42, 64]);
items.forEach(({ label, a }, i) => {
  const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2 - wx * S, PH / 2 - wy * S, { glow: false });
  text(cv, label, 4, 4, WHITE, 1);
  const ox = (i % COLS) * (PW + 2), oy = Math.floor(i / COLS) * (PH + 2);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s0 = (y * PW + x) * 3, p = ((oy + y) * W + ox + x) * 3; out.px[p] = cv.px[s0]; out.px[p + 1] = cv.px[s0 + 1]; out.px[p + 2] = cv.px[s0 + 2]; }
});
writePng(out, file); console.log('CAND_GRID_OK', W + 'x' + H);
