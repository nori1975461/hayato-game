// 第44稿の詰め（候補を並べて選ぶための引数を足す）。node patch-gaika44b.cjs
//   1回目の点検＝胸の半幅だけを詰めても（26.2→24.6→23.2）胴の塊はほとんど小さく見えない。裾の幅 73 と高さが扇で固定されているので、胸を細くするほど A 字の法衣に寄るだけ。
//   効くのは ①脇の線を凹ませる（鐘の口＝細いまま降りて裾だけ開く。単調増加なのでくびれにはならない）②腕のつかない下の関節の円盤（第25稿の名残）を小さくするか外す ③裾の V を少し浅く
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("const torso4 = (style = 'bell', CH4 = CH4_DEF) => {\n", "const torso4 = (style = 'bell', CH4 = CH4_DEF, opt = {}) => {\n  const FP = opt.fp ?? 1, DISC2 = opt.disc2 ?? 'full';   // 脇の線の指数（1＝直線・大きいほど細いまま降りて裾だけ開く）／下の関節の円盤（full／small／none）\n");
rep("  const FL0 = -12, BASE_Y = 22.6, TIP_Y = 37.5, BASE_W = 36.6, K = (BASE_W - CH4) / (BASE_Y - FL0);", "  const FL0 = opt.fl0 ?? -12, BASE_Y = 22.6, TIP_Y = opt.tip ?? 37.5, BASE_W = 36.6;");
rep("  const flank = (y) => (style === 'slab' ? CH4 : CH4 + Math.max(0, y - FL0) * K);", "  const flank = (y) => (style === 'slab' ? CH4 : CH4 + (BASE_W - CH4) * Math.pow(Math.min(1, Math.max(0, (y - FL0) / (BASE_Y - FL0))), FP));");
rep("for (const [dx, dy] of [[CH4 + 7.4, -28], [CH4 + 8.9, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k'); DISC(G, X(s * dx), Y(dy), 5.7, 'm'); DISC(G, X(s * dx), Y(dy), 3.8, 'k'); DISC(G, X(s * dx), Y(dy), 2.8, s < 0 ? 'f' : 'm'); }",
  "for (const [dx, dy, r] of [[CH4 + 7.4, -28, 1], ...(DISC2 === 'none' ? [] : [[CH4 + (DISC2 === 'small' ? 7.0 : 8.9), -6, DISC2 === 'small' ? 0.82 : 1]])]) { DISC(G, X(s * dx), Y(dy), 6.6 * r, 'k'); DISC(G, X(s * dx), Y(dy), 5.7 * r, 'm'); DISC(G, X(s * dx), Y(dy), 3.8 * r, 'k'); DISC(G, X(s * dx), Y(dy), 2.8 * r, s < 0 ? 'f' : 'm'); }");
rep("torso: P7(o.torso || o.torsoCH ? torso4(o.torso || 'bell', o.torsoCH || CH4_DEF) : TORSO4),", "torso: P7(o.torso || o.torsoCH || o.torsoOpt ? torso4(o.torso || 'bell', o.torsoCH || CH4_DEF, o.torsoOpt || {}) : TORSO4),");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH44B_OK');
