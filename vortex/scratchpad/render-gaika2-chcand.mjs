// 胴の候補を横に並べる（第44稿の見比べ用）。node render-gaika2-chcand.mjs <倍率> <中心y> <出力名> <候補の JSON...>
//   候補＝build4 へ渡すオプション。例 '{"torsoCH":24,"torsoOpt":{"fp":2,"disc2":"none"}}'
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const S = Number(process.argv[2]) || 1, wy = Number(process.argv[3]) || 0, file = process.argv[4] || './gaika2-chcand.png';
const cands = process.argv.slice(5).map((s) => JSON.parse(s)), n = cands.length, PW = Math.floor(640 / n);
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, BGC);
cands.forEach((o, i) => {
  const d = M.gaika2With(o), cv = makeCanvas(PW - 2, 360); rect(cv, 0, 0, PW - 2, 360, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, (PW - 2) / 2, 180 - wy * S, { glow: false });
  for (let y = 0; y < 360; y++) for (let x = 0; x < PW - 2; x++) { const a = (y * (PW - 2) + x) * 3, p = (y * 640 + i * PW + x) * 3; out.px[p] = cv.px[a]; out.px[p + 1] = cv.px[a + 1]; out.px[p + 2] = cv.px[a + 2]; }
  text(out, String.fromCharCode(65 + i), i * PW + 6, 6, [200, 210, 230], 2);
});
writePng(out, file); console.log('CHCAND_OK');
