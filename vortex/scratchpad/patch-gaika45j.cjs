// 第45稿のパッチ j（一度だけ当てる）。node patch-gaika45j.cjs
//   実測：'long' の管は胸の脇の外を通るので、胴の輪郭が第44稿のザク版より最大 16px 広がる（y −4 で 50→66）。FB「胴が大きい」を二度受けた直後にこれは逆行。
//   → 新しい route 'tuck'＝胸の下の角を斜めに落とし（notch）、その陰から管が出て腰を回り襟へ入る。管は輪郭の内側に収まる（第44稿のザク版の輪郭をほぼ保つ）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("    const ell = (ex, ey, rx, ry, a0, a1) => (t) => {",
  "    const cb = (p) => (t) => { const a = 1 - t, w = [a * a * a, 3 * a * a * t, 3 * a * t * t, t * t * t]; return [0, 1].map((i) => w[0] * p[0][i] + w[1] * p[1][i] + w[2] * p[2][i] + w[3] * p[3][i]); };\n    const ell = (ex, ey, rx, ry, a0, a1) => (t) => {");
rep("    if (ROUTE === 'sash') tube(bz([[-19, -2.5], [4, 13], [27, 18.5]]), 1, R0);\n    chestRows(-2);\n",
  String.raw`    if (ROUTE === 'sash') tube(bz([[-19, -2.5], [4, 13], [27, 18.5]]), 1, R0);
    // tuck＝胸の下の角を斜めに落とし、その陰から管が出る。管は胸の脇の外へ張り出さない（輪郭は第44稿のザク版とほぼ同じ）
    const NY0 = opt.notchY ?? -11, NK = opt.notchK ?? 0.5, TX = opt.tuckX ?? 21;
    if (ROUTE === 'tuck') {
      for (let y = NY0 - 1; y <= -3; y += 0.25) row(y, CH4 + 0.5, () => 'k');
      for (const s of [-1, 1]) tube(cb([[TX, NY0 - 1.5], [TX, -2], [TX + 9.5, 8], [24.3, 18.5]]), s, R0);
      for (let y = -40; y <= -2; y += 0.25) { const w = chestW(y) - (y > NY0 ? (y - NY0) * NK : 0); row(y, w, (x) => (y < -33 ? ((x + w) / (2 * w) < 0.3 ? 'm' : 'j') : groove(x, y) ? 'k' : face(x, w, SX4))); }
    } else chestRows(-2);
`);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45J_OK');
