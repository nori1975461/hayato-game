// 第45稿の詰め 3（残り火を左右別に掛けられるように・灼ける管の地を一段明るく）。node patch-gaika45d.cjs
//   ember＝true（両側）／'right'（画面右＝握り潰す手の側だけ灼ける＝左は光で見え、右は熱で見える。悪神＝非対称を腰にも一つ）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("    const ROUTE = opt.route || 'long', EMBER = !!opt.ember, R0 = opt.r ?? 4.0;", "    const ROUTE = opt.route || 'long', R0 = opt.r ?? 4.0;");
rep("      let len = 0, prev = null; const per = o.period || 3.6;", "      let len = 0, prev = null; const per = o.period || 3.6, EMBER = opt.ember === true || (opt.ember === 'right' && s > 0) || (opt.ember === 'left' && s < 0);");
rep("          else if (EMBER) c = v > 0.5 ? 'm' : v > -0.2 ? 'j' : 'k';", "          else if (EMBER) c = v > 0.3 ? 'm' : v > -0.45 ? 'j' : 'k';");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45D_OK');
