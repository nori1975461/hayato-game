// 第44稿の詰め 2（脇の線を曲線でなく二本の直線＝折れのある装甲板に）。node patch-gaika44c.cjs
//   2回目の点検＝指数 2 の曲線は細く見えるが線が有機的で法衣に寄る。機械の文法は直線＝「ほぼ真下に降りる上段」と「扇の開きへ繋がる下段」の二段に折る（武骨さは輪郭の段差で決まる）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("  const flank = (y) => (style === 'slab' ? CH4 : CH4 + (BASE_W - CH4) * Math.pow(Math.min(1, Math.max(0, (y - FL0) / (BASE_Y - FL0))), FP));",
  "  const KN = opt.knee;   // [折れの高さ, 折れでの張り出し]＝上段は胸からほぼ真下・下段で扇の付け根の幅まで開く\n  const flank = (y) => (style === 'slab' ? CH4 : KN ? (y <= FL0 ? CH4 : y <= KN[0] ? CH4 + (y - FL0) * KN[1] / (KN[0] - FL0) : CH4 + KN[1] + (Math.min(y, BASE_Y) - KN[0]) * (BASE_W - CH4 - KN[1]) / (BASE_Y - KN[0])) : CH4 + (BASE_W - CH4) * Math.pow(Math.min(1, Math.max(0, (y - FL0) / (BASE_Y - FL0))), FP));");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH44C_OK');
