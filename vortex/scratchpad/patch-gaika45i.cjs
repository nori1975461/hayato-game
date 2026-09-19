// 第45稿のパッチ i（一度だけ当てる）。node patch-gaika45i.cjs
//   残り火の弱い版 opt.ember 'low'＝管は鋼のまま・胸に近い半分の節の奥だけ暗い深紅（'r'）。明るい 'R' と管の暗い地は使わない（赤黒の縞＝うるさい、を避ける）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("hot = EMBER ? Math.max(0, 1 - len / (LEN * 0.72)) : 0;", "LOW = opt.ember === 'low', hot = EMBER ? Math.max(0, 1 - len / (LEN * 0.72)) : LOW ? Math.max(0, 1 - len / (LEN * 0.5)) : 0;");
rep("          else if (rg) c = hot > 0.5", "          else if (rg && LOW) c = hot > 0.1 && Math.abs(k) < R * 0.62 ? 'r' : v > 0.1 ? 'j' : 'k';\n          else if (rg) c = hot > 0.5");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45I_OK');
