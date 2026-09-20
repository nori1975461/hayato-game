// 候補を二つ、同じ場所・同じ倍率で左右に並べる（前後比較用・小さく撮る）。node render-gaika2-cand-pair.mjs <出力名> <倍率> <中心の世界x> <中心の世界y> <左の候補> <右の候補> [枠の幅=240] [枠の高さ=200] [左の札] [右の札]
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [file, S, wx, wy] = [process.argv[2], Number(process.argv[3]) || 4, Number(process.argv[4]) || 0, Number(process.argv[5]) || 0];
const cands = [process.argv[6] || 'GAIKA2', process.argv[7] || 'GAIKA2'], PW = Number(process.argv[8]) || 240, PH = Number(process.argv[9]) || 200, labels = [process.argv[10] || 'BEFORE', process.argv[11] || 'AFTER'];
const out = makeCanvas(PW * 2 + 2, PH); rect(out, 0, 0, PW * 2 + 2, PH, [40, 42, 64]);
cands.forEach((a, i) => {
  const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2 - wx * S, PH / 2 - wy * S, { glow: false });
  text(cv, labels[i], 4, 4, WHITE, 1);
  const ox = i * (PW + 2);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s0 = (y * PW + x) * 3, p = (y * (PW * 2 + 2) + ox + x) * 3; out.px[p] = cv.px[s0]; out.px[p + 1] = cv.px[s0 + 1]; out.px[p + 2] = cv.px[s0 + 2]; }
});
writePng(out, file); console.log('CAND_PAIR_OK');
