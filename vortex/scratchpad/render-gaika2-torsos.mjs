// 胴のテクスチャだけを候補ごとに横へ並べる（顔・壺・脚といった誤読は単体で見るとわかる）。node render-gaika2-torsos.mjs [出力名] [倍率=3] <候補の JSON | export 名>...
//   候補は gaika2With へ渡す JSON（例 '{"torso":"zaku2","torsoOpt":{"route":"tuck"}}'）か export 名（例 GAIKA2_ZAKU）。640 幅に入る数だけ並ぶ
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const file = process.argv[2] || './gaika2-torsos.png', S = Number(process.argv[3]) || 3, args = process.argv.slice(4);
const PW = Math.floor(640 / Math.max(1, args.length)) - 2, out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, [40, 42, 64]);
args.forEach((a, i) => {
  const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], only = { ...d, rig: d.rig.filter((r) => r.tex === 'torso') }, cv = makeCanvas(PW, 360); rect(cv, 0, 0, PW, 360, BGC);
  renderBoss(cv, only, { ...d.tier, spriteScale: S }, PW / 2, 180 + 6 * S, { glow: false });
  text(cv, String.fromCharCode(65 + i) + '  ' + (a.startsWith('{') ? Object.values(JSON.parse(a).torsoOpt || { t: JSON.parse(a).torso }).join(' ') : a), 5, 5, WHITE, 1);
  for (let y = 0; y < 360; y++) for (let x = 0; x < PW; x++) { const s = (y * PW + x) * 3, t = (y * 640 + i * (PW + 2) + x) * 3; out.px[t] = cv.px[s]; out.px[t + 1] = cv.px[s + 1]; out.px[t + 2] = cv.px[s + 2]; }
});
writePng(out, file); console.log('TORSOS_OK');
