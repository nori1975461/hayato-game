// 第45稿のパッチ m（一度だけ当てる）。node patch-gaika45m.cjs
//   弱い残り火（ember 'low'）：tuck では管の上端が胸の陰に隠れるので、灼ける範囲を管の長さの 0.5→0.78 へ延ばす（見えている部分の上半分に残り火が出る）。既定（鋼）は変わらない
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("LOW ? Math.max(0, 1 - len / (LEN * 0.5)) : 0;", "LOW ? Math.max(0, 1 - len / (LEN * 0.78)) : 0;");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45M_OK');
