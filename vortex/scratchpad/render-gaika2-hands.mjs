// 第二案の両手だけを並べて拡大する（腕のテクスチャだけ＝副腕の光刃やスカートに隠れない）。node render-gaika2-hands.mjs [出力名]
//   上段 A＝第44稿までの手（親指が外・gaika2With({ handFlip: false })）／下段 B＝第45稿からの既定（親指が内＝ユーザーが A/B を見比べて選んだ・開いた手の親指の爪だけ 1 短い）
//   左の列＝画面左の手（骸華の右手・開く）／右の列＝画面右の手（骸華の左手・握り潰す）
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const S = 4, file = process.argv[2] || './gaika2-hands.png', PW = 318, PH = 178;
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, [40, 42, 64]);
const panel = (d, wx, wy, x0, y0, label) => {
  const only = { ...d, rig: d.rig.filter((r) => r.tex === 'arms') }, cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, only, { ...d.tier, spriteScale: S }, PW / 2 - wx * S, PH / 2 - wy * S, { glow: false });
  text(cv, label, 6, PH - 12, [200, 210, 230], 1);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const i = (y * PW + x) * 3, o = ((y0 + y) * 640 + x0 + x) * 3; out.px[o] = cv.px[i]; out.px[o + 1] = cv.px[i + 1]; out.px[o + 2] = cv.px[i + 2]; }
};
const A = M.gaika2With({ handFlip: false }), B = M.GAIKA2;
panel(A, -70, 25, 0, 0, 'A  UNTIL DRAFT 44 / THUMB OUTSIDE / HER RIGHT HAND'); panel(A, 70, 25, 322, 0, 'A  UNTIL DRAFT 44 / THUMB OUTSIDE / HER LEFT HAND');
panel(B, -70, 25, 0, 182, 'B  DEFAULT SINCE DRAFT 45 / THUMB INSIDE'); panel(B, 70, 25, 322, 182, 'B  DEFAULT SINCE DRAFT 45 / THUMB INSIDE');
writePng(out, file); console.log('HANDS_OK');
