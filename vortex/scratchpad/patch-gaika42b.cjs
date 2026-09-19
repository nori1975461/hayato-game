// 第42稿の描き直し（1回だけ）。node patch-gaika42b.cjs
//   1回目の点検＝①ドム版：Λ の深紅の縁取りが太く赤い矢印に見える → 1.6→1.1 ②ザク版：管が溝と縁の黒に負けて暗い塊に見える → 半径 3.5→4.0・明るい鋼の蛇腹（節 2.6＋溝 1.0）
//   ③ジオング版：平らな鍔が盆のように浮く → 扇の勾配へ続く浅い円錐台（スカートの肩）にして、鍔と扇を一つの大きなスカートに見せる
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("        if (y > APEX_Y - 1.5 && Math.abs(x) - Math.max(0, nh(y)) < 1.6) return 'r';", "        if (y > APEX_Y - 1.0 && Math.abs(x) - Math.max(0, nh(y)) < 1.1) return 'r';");
rep("    seam(-6, APEX_Y - 1.5);", "    seam(-6, APEX_Y - 1.0);");
rep("const COL_Y = 19, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, R0 = 3.5;", "const COL_Y = 19, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, R0 = 4.0;");
rep("cx = s * (a * a * 21 + 2 * a * t * 33 + t * t * 25.5),", "cx = s * (a * a * 21.5 + 2 * a * t * 33.5 + t * t * 26),");
rep("        const end = t < 0.07 || t > 0.93, rr = end ? R0 + 0.9 : R0, ring = !end && len % 3.4 < 0.9;", "        const end = t < 0.07 || t > 0.93, rr = end ? R0 + 0.9 : R0, ring = !end && len % 3.6 > 2.6;");
rep("          P(G, X(cx + nx * k), Y(cy + ny * k), Math.abs(k) > rr - 0.6 || ring ? 'k' : v > 0.45 ? 'f' : v > -0.05 ? 'm' : 'j');",
  "          P(G, X(cx + nx * k), Y(cy + ny * k), Math.abs(k) > rr - 0.55 ? 'k' : ring ? (v > 0.1 ? 'j' : 'k') : v > 0.4 ? 'f' : v > -0.15 ? 'm' : 'j');");
rep("    const fl = (y) => (y < 18 ? 34 + (y - 15) * (5 / 3) : y <= 23 ? 39 : 39 - (y - 23));\n    for (let y = 15; y <= 26; y += 0.25) { const w = fl(y); row(y, w, (x) => (y < 16.4 ? (x < 0 ? 'm' : 'j') : y > 24.8 ? 'k' : face(x, w, 21))); }",
  "    const fl = (y) => (y <= 26 ? 31 + (y - 15) * (9 / 11) : 40);\n    for (let y = 15; y <= 27.5; y += 0.25) { const w = fl(y); row(y, w, (x) => (y < 16.4 ? (x < 0 ? 'm' : 'j') : y > 26.2 ? 'k' : y >= 22.6 && y < 23.6 && x < 21 ? 'k' : face(x, w, 21))); }");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH42B_OK');
