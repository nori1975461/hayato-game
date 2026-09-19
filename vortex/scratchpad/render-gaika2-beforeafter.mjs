// 直前のコミットの第二案（左）と現在の第二案（右）を同じ倍率で並べる。先に git show HEAD:vortex/scratchpad/gaika-candidates.mjs > .gaika-prev.mjs
//   node render-gaika2-beforeafter.mjs [export 名=GAIKA2] [倍率=2.2] [中心の世界y=8] [中心の世界x=0] [出力] [左の export 名=同じ] → gaika2-beforeafter.png
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as NEW from './gaika-candidates.mjs';
import * as OLD from './.gaika-prev.mjs';
const name = process.argv[2] || 'GAIKA2', S = Number(process.argv[3]) || 2.2, wy = Number(process.argv[4] ?? 8), wx = Number(process.argv[5] ?? 0), file = process.argv[6] || './gaika2-beforeafter.png', oldName = process.argv[7] || name;
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, [40, 42, 64]);
[[OLD[oldName], 'BEFORE'], [NEW[name], 'AFTER']].forEach(([d, label], i) => {
  const cv = makeCanvas(319, 360); rect(cv, 0, 0, 319, 360, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, 159.5 - wx * S, 180 - wy * S, { glow: false }); text(cv, label, 6, 6, WHITE, 1);
  for (let y = 0; y < 360; y++) for (let x = 0; x < 319; x++) { const s = (y * 319 + x) * 3, t = (y * 640 + x + i * 321) * 3; out.px[t] = cv.px[s]; out.px[t + 1] = cv.px[s + 1]; out.px[t + 2] = cv.px[s + 2]; }
});
writePng(out, file); console.log('BA_OK');
