// 第45稿のパッチ h（一度だけ当てる）。node patch-gaika45h.cjs
//   spine の板の向きが逆（Λ）だった → 裾の V と同じ下向きの V にする
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("(opt.trunk === 'spine' ? -Math.abs(x) * 0.5 + 5.5 : 0)", "(opt.trunk === 'spine' ? Math.abs(x) * 0.5 : 0)");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45H_OK');
