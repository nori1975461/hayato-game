// render-gaika2-hands.mjs：第45稿で掌は B（親指が内）が既定になった＝上段 A は旧（handFlip:false）・下段 B は既定。node patch-hands45.cjs
const fs = require('fs');
const F = __dirname + '/render-gaika2-hands.mjs'; let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("//   上段 A＝現状（親指が外＝掌を正面へ向けて指を下へ垂らした手として正しい向き）／下段 B＝左右を入れ替えた場合（handFlip＝親指が内）",
  "//   上段 A＝第44稿までの手（親指が外・gaika2With({ handFlip: false })）／下段 B＝第45稿からの既定（親指が内＝ユーザーが A/B を見比べて選んだ・開いた手の親指の爪だけ 1 短い）");
rep("const A = M.GAIKA2, B = M.gaika2With({ handFlip: true });", "const A = M.gaika2With({ handFlip: false }), B = M.GAIKA2;");
rep("'A  NOW / THUMB OUTSIDE / HER RIGHT HAND'", "'A  UNTIL DRAFT 44 / THUMB OUTSIDE / HER RIGHT HAND'");
rep("'A  NOW / THUMB OUTSIDE / HER LEFT HAND'", "'A  UNTIL DRAFT 44 / THUMB OUTSIDE / HER LEFT HAND'");
rep("panel(B, -70, 25, 0, 182, 'B  SWAPPED / THUMB INSIDE');", "panel(B, -70, 25, 0, 182, 'B  DEFAULT SINCE DRAFT 45 / THUMB INSIDE');");
rep("panel(B, 70, 25, 322, 182, 'B  SWAPPED / THUMB INSIDE');", "panel(B, 70, 25, 322, 182, 'B  DEFAULT SINCE DRAFT 45 / THUMB INSIDE');");
fs.writeFileSync(F, src); console.log('PATCH_HANDS45_OK');
