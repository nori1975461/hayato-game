// render-gaika2-beforeafter.mjs：左（直前のコミット）の export 名を別に指定できるようにする（第45稿＝左は第44稿のザク版 GAIKA2_ZAKU・右は新しい既定 GAIKA2）。node patch-beforeafter45.cjs
const fs = require('fs');
const F = __dirname + '/render-gaika2-beforeafter.mjs'; let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("[倍率=2.2] [中心の世界y=8] → gaika2-beforeafter.png", "[倍率=2.2] [中心の世界y=8] [中心の世界x=0] [出力] [左の export 名=同じ] → gaika2-beforeafter.png");
rep("file = process.argv[6] || './gaika2-beforeafter.png';", "file = process.argv[6] || './gaika2-beforeafter.png', oldName = process.argv[7] || name;");
rep("[[OLD[name], 'BEFORE'], [NEW[name], 'AFTER']]", "[[OLD[oldName], 'BEFORE'], [NEW[name], 'AFTER']]");
fs.writeFileSync(F, src); console.log('PATCH_BEFOREAFTER45_OK');
