// 第45稿の詰め 2。node patch-gaika45c.cjs
//   2回目の点検（通し方の六案を並べた）＝long（胸の脇から出て腰を回る長い管）だけが「ザクの動力パイプ」として読める。長いので脚にも取っ手にも見えない。
//     vee は数珠の首飾り・sash は落ちた管・bundle は細かすぎ・canon は第44稿と同じ「取っ手」。→ 既定の通し方を long に。
//   幹の段（plug）は光の当たる左だけ欠けて見え、ただの切り欠きに読める → まっすぐな幹（半幅 12.5）を既定にして、段は opt.trunk === 'plug' のときだけ
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("    for (let y = -3; y <= COL_Y; y += 0.25) { const w = y < 7 ? CH4 - 9 : CH4 - 13; row(y, w, (x) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k')); }",
  "    for (let y = -3; y <= COL_Y; y += 0.25) { const w = opt.trunk === 'plug' ? (y < 7 ? CH4 - 9 : CH4 - 13) : CH4 - 11.5; row(y, w, (x) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k')); }");
rep("    const ROUTE = opt.route || 'canon', EMBER", "    const ROUTE = opt.route || 'long', EMBER");
rep("const ZAKU2_DEF = { route: 'canon' };", "const ZAKU2_DEF = { route: 'long' };");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45C_OK');
