// FB（2026-09-20 17:23）「月牙を4枚にするとはっきりわかるが、副腕も台座も宙に浮いている。訂正して。方法はまかせる」
// 原因：subarms（光刃の副腕／台座）は第36稿から「殻より奥＝装甲の外の縁の陰から生える」意図でリグの先頭に置いてあるが、
//       role が 'cannon'（描画の深さ 10）なので、プレビューでも本編でも殻（深さ 7）より手前に描かれていた。
//       縁の陰に隠れるはずの根 (82,−4) が装甲の面の上にむき出し＝基部の無い棒が面の上に浮いて見える。
// 直し：{ subBehind: true } のとき role を 'podL'（深さ 7・未使用）にする。リグの並びは殻より前なので、殻の奥に描かれる。
//       形と位置は 1 ドットも変えない。既定は不変（結論が出たら既定へ反映する）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("    { role: 'cannon', tex: 'subarms', ox: 0, oy: 0,", "    { role: o.subBehind ? 'podL' : 'cannon', tex: 'subarms', ox: 0, oy: 0,");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('SUBBEHIND_PATCH_OK');
