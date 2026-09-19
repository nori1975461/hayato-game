// 第45稿のパッチ f（一度だけ当てる）。node patch-gaika45f.cjs
//   check-gaika2-holes.mjs が既定（zaku2・長い管）の左脇に背景の抜け 4 点（x −24・y 7〜10）を検出＝胴の影（半幅 CH4−0.5）と管の内縁の間の 1 ドット。
//   原因は丸めの左右差（+23.5 は 24 へ・−23.5 は −23 へ丸まる）。影を 1 広げて塞ぐ（半幅 CH4+0.5）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 0.5, () => 'k');", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 + 0.5, () => 'k');   // 半幅 CH4+0.5＝管の内縁まで影を届かせる（−0.5 だと丸めの左右差で左脇だけ背景が 4 点抜けた）");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45F_OK');
