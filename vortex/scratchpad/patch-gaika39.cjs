// 第39稿のパッチ（一度だけ当てる）。node patch-gaika39.cjs
//   FB「裾の赤い一本線も不要。消して」＝胴の腰の下縁の深紅（y>36.4）を黒鉄の縁へ
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const from = "      else c = y > 36.4 ? 'R' : lx < 0.05 ? 'm' : lx < 0.42 ? 'j' : 'k';   // 腰";
const i = src.indexOf(from);
if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('hem line');
src = src.slice(0, i) + "      else c = y > 36.4 ? 'k' : lx < 0.05 ? 'm' : lx < 0.42 ? 'j' : 'k';   // 腰（第39稿：下縁の深紅の一本線を撤去＝スカートの前面を空ける）" + src.slice(i + from.length);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH39_OK');
