// 主腕の肘の候補を 2×2 で撮る（第46稿の見比べ用）。node render-gaika2-elbows.mjs [出力名] [倍率=1.6] [中心の世界y=8] [候補の JSON...]
//   候補は gaika2With へ渡す opt（例 '{"elbow":[62,-9]}'）。省くと 旧（肘が内＝前腕が外へ開く）＋三つ
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const file = process.argv[2] || './gaika2-elbows.png', S = Number(process.argv[3]) || 1.6, wy = process.argv[4] === undefined ? 8 : Number(process.argv[4]);
const cands = process.argv.length > 5 ? process.argv.slice(5).map((s) => JSON.parse(s)) : [{ elbow: [46, -3] }, { elbow: [56, -8] }, { elbow: [62, -9] }, { elbow: [68, -10] }];
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, [40, 42, 64]);
cands.slice(0, 4).forEach((o, i) => {
  const d = M.gaika2With(o), PW = 319, PH = 179, cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2, PH / 2 - wy * S, { glow: false });
  text(cv, (o.label ? '' : String.fromCharCode(65 + i) + '  ') + (o.label || JSON.stringify(o).replace(/"/g, '')), 5, 5, WHITE, 1);
  const ox = (i % 2) * 321, oy = Math.floor(i / 2) * 181;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const a = (y * PW + x) * 3, p = ((oy + y) * 640 + ox + x) * 3; out.px[p] = cv.px[a]; out.px[p + 1] = cv.px[a + 1]; out.px[p + 2] = cv.px[a + 2]; }
});
writePng(out, file); console.log('ELBOWS_OK');
