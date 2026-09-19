// 第45稿のパッチ l（一度だけ当てる）。node patch-gaika45l.cjs
//   tuck の既定値を確定：管の出どころ TX 21→19.5（輪郭の Δ幅を最大 2px＝片側 1px に収める・check-gaika2-torso-width.mjs）／角の落とし NK 0.5→0.62（内へ寄せたぶん管が見える幅を保つ）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("const NY0 = opt.notchY ?? -11, NK = opt.notchK ?? 0.5, TX = opt.tuckX ?? 21;", "const NY0 = opt.notchY ?? -11, NK = opt.notchK ?? 0.62, TX = opt.tuckX ?? 19.5;   // TX 19.5＝輪郭の Δ幅が最大 2px（21 だと 6px 広がる）");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45L_OK');
