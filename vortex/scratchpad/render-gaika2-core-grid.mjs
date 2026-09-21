// 割れ目の奥の案を横に並べた一覧（4 倍）。node render-gaika2-core-grid.mjs <出力> "札=openCore の名前" ...
//   例: node render-gaika2-core-grid.mjs out.png "NOW=rack" "WORKS=works"
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';

const file = process.argv[2] || 'core-grid.png';
const items = process.argv.slice(3).map((a) => { const k = a.indexOf('='); return [a.slice(0, k), a.slice(k + 1)]; });
const S = 4, PW = 196, PH = 300, LH = 22, GAP = 2, CXW = 45, CYW = -90;
const W = items.length * PW + (items.length - 1) * GAP, H = PH + LH;
const out = makeCanvas(W, H); rect(out, 0, 0, W, H, [40, 42, 64]);
items.forEach(([label, core], i) => {
  const cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, [26, 28, 48]);
  const d = M.gaika2With({ ...M.GAIKA2_FINAL_OPT, openCore: core });
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2 - CXW * S, PH / 2 - CYW * S, { glow: false });
  const ox = i * (PW + GAP);
  text(out, label, ox + 3, 5, WHITE, 2);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const sp = (y * PW + x) * 3, dp = ((y + LH) * W + ox + x) * 3;
    out.px[dp] = cv.px[sp]; out.px[dp + 1] = cv.px[sp + 1]; out.px[dp + 2] = cv.px[sp + 2];
  }
});
writePng(out, file);
console.log('GRID_OK', file, W + 'x' + H);
