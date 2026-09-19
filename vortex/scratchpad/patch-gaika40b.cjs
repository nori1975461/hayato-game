// 第40稿の描き直し（1回だけ）。node patch-gaika40b.cjs
//   1回目＝くびれは消えたが受け座が「十字の入った箱」に見えた（中央の稜×折れの横線＝縦横の線の交差＝煉瓦の罠）
//   直し＝①折れの横線を撤去し面の明度だけで折る ②壁の倒れを強める（棚の半幅 29.5→27） ③胴が入る所だけ棚を 2.5 下げる＝載るのでなく沈む ④下の面の右を真っ黒にしない（輪郭に溶けて欠けて見えた）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 50)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("  const seatW = (y) => (y < 22 ? 29.5 + (y - 5) * 0.34 : y < 26 ? 35.5 : 35.5 - (y - 26) * 0.85);",
  "  const seatW = (y) => (y < 22 ? 27 + (y - 5) * 0.5 : y < 26 ? 35.5 : 35.5 - (y - 26) * 0.85);\n  const seatTop = (x) => (Math.abs(x) < 22 ? 7.5 : 5);   // 胴が入る所だけ棚が一段低い＝載るのでなく沈む");
rep("      else if (y < 5) c = y < -1.2 ? 'k' :", "      else if (y < seatTop(x)) c = y < -1.2 || Math.abs(x) > 20.4 ? 'k' :");
rep("      else if (y < 6.3) c = lx < 0.5 ? 'f' : 'm';", "      else if (y < seatTop(x) + 1.3) c = Math.abs(x) < 22 ? (x < 0 ? 'm' : 'j') : x < 0 ? 'f' : 'm';");
rep("      else if (y >= 22 && y < 23) c = x < 0 ? 'm' : 'j';   // 壁が内へ折れる稜\n", "");
rep("      else c = y < 22 ? (x < 0 ? 'b' : 'q') : (x < 0 ? 'q' : 'k');", "      else c = y < 22 ? (x < 0 ? 'b' : 'q') : lx > 0.82 ? 'k' : 'q';");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH40B_OK');
