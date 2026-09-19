// 第44稿の仕上げ（胴を細くしたことで生まれた 1〜3 ドットの「背景が透ける抜け」を塞ぐ）。node patch-gaika44e.cjs
//   機械で数えた結果（胴のまわり |x|<=60・y −40〜40 で、どのテクスチャにも覆われない点）＝ドム版 6（腹とスカート・アーマーの上縁の隅・Λ の頂点の上）／ザク版 4（管の下端と襟の上縁の隅）
//   ジオング版の円筒の脇の抜け（第43稿 128 → 148）は細い旋回軸の両脇の空間＝以前からの仕様なので触らない
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
// ドム版：上縁の内側の隅を影で埋める（腹より先に描く＝腹の外にはみ出た分だけが残る）／Λ の切れ込みは扇が始まる y 22 より上では影にする
rep("    for (let y = -2; y <= 11; y += 0.25) row(y, CH4 - 1.4, (x, w) => (y < -0.8 ? 'k' : face(x, w, SX4 * 0.9)));",
  "    for (let y = 6; y < 10; y += 0.25) row(y, CH4 + 1 + (y - 6) * 1.1, () => 'k');\n    for (let y = -2; y <= 11; y += 0.25) row(y, CH4 - 1.4, (x, w) => (y < -0.8 ? 'k' : face(x, w, SX4 * 0.9)));");
rep("        if (y > APEX_Y && Math.abs(x) < nh(y)) return null;", "        if (y > APEX_Y && Math.abs(x) < nh(y)) return y < 21.5 ? 'k' : null;");
// ザク版：管の下端が襟へ入る隅を影で埋める（管より先に描く）
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 3.2, () => 'k');", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 3.2, () => 'k');\n    for (let y = COL_Y - 2.5; y <= COL_Y; y += 0.25) row(y, COL_W + 0.6, () => 'k');");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH44E_OK');
