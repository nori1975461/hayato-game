// 二つの引数（JSON か候補名）を等倍で描いて画素差を数える＝「変えた場所以外は 1 画素も動いていない」の実測用。
//   node diff-gaika2-render.mjs '<A>' '<B>' [中心x] [中心y] [幅] [高さ]   → DIFF <画素数> bbox=x0,y0..x1,y1（世界座標）
//   A/B は JSON（gaika2With の引数）か、gaika-candidates.mjs の名前（GAIKA2_FINAL_OPT など）。--save <png> で差分だけ白の絵を保存
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const args = process.argv.slice(2), si = args.indexOf('--save'), save = si >= 0 ? args.splice(si, 2)[1] : null;
const [A, B] = args, wx = Number(args[2]) || 0, wy = Number(args[3]) || 0, PW = Number(args[4]) || 520, PH = Number(args[5]) || 360;
const draw = (a) => { const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, PW / 2 - wx, PH / 2 - wy, { glow: false }); return cv; };
import fs from 'node:fs';
// B が '@ファイル' なら、以前 '--dump' で保存した生の画素と比べる（パッチの前後を比べる用）
const di = args.indexOf('--dump'), dump = di >= 0 ? args.splice(di, 2)[1] : null;
const ca = draw(A); if (dump) { fs.writeFileSync(dump, ca.px); console.log('DUMPED', dump); process.exit(0); }
const cb = B.startsWith('@') ? { px: fs.readFileSync(B.slice(1)) } : draw(B), out = makeCanvas(PW, PH);
let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
  const i = (y * PW + x) * 3;
  if (ca.px[i] !== cb.px[i] || ca.px[i + 1] !== cb.px[i + 1] || ca.px[i + 2] !== cb.px[i + 2]) { n++; out.px[i] = out.px[i + 1] = out.px[i + 2] = 255; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
}
if (save) writePng(out, save);
console.log('DIFF', n, n ? `bbox=${x0 - PW / 2 + wx},${y0 - PH / 2 + wy}..${x1 - PW / 2 + wx},${y1 - PH / 2 + wy}` : 'IDENTICAL');
