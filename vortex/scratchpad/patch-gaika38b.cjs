// 第38稿の直し（輪郭だけ・一度だけ当てる）。node patch-gaika38b.cjs
//   1回目＝帯・縦リブ・羽根を入れたが輪郭が直線のまま＝まだ筒に見えた。武骨さは面の模様でなく輪郭の段差で決まる
//   直し＝機関部を箱に張り出す（+2.6）→ 喉でくびれる（−1.2）→ 釣鐘で開く → 太い作動環（+3.4・高さ 7）→ 羽根は先へ 22% すぼまる。帯の張り出し 1.4→2.4
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const once = (from, to) => {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('NOT FOUND: ' + from.slice(0, 60));
  if (src.indexOf(from, i + 1) >= 0) throw new Error('NOT UNIQUE: ' + from.slice(0, 60));
  src = src.slice(0, i) + to + src.slice(i + from.length);
};
once('BANDS = [[0.06, 4, 1.4, false], [0.2, 4, 1.4, false], [0.5, 3.5, 1.2, false], [0.71, 5.5, 2.1, true]];', 'BANDS = [[0.05, 4.5, 1.6, false], [0.22, 4.5, 1.6, false], [0.5, 4, 2.4, false], [0.7, 7, 3.4, true]];');
once('const base = t < 0.3 ? w0 + 0.8 : t < 0.74 ? w0 + 0.8 + (w1 - w0 - 0.8) * Math.pow((t - 0.3) / 0.44, 0.8) : w1 * (1 - 0.1 * Math.pow(tt, 1.5));', 'const base = t < 0.3 ? w0 + 2.6 : t < 0.74 ? w0 - 1.2 + (w1 - w0 + 1.2) * Math.pow((t - 0.3) / 0.44, 0.7) : w1 * (1 - 0.22 * Math.pow(tt, 1.3));');
once('for (let x = -w1 * 0.9 + 1.5; x <= w1 * 0.9 - 1.5; x += 0.5) for (let y = 0; y <= 2; y += 0.5) P(G, cx + bx + x, y1 + 0.5 + y,', 'for (let x = -w1 * 0.78 + 1.5; x <= w1 * 0.78 - 1.5; x += 0.5) for (let y = 0; y <= 2; y += 0.5) P(G, cx + bx + x, y1 + 0.5 + y,');
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH38B_OK');
