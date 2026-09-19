// 第47稿：FB（添付つき）「主腕の両手とも、肘から下が外へ向いている。主腕の肘から下を、中央に少し向けてほしいだけ。手がスカートに少しかかってしまってもいい」
//   ＝肩と肘は動かさず、前腕＋掌をひとかたまりで肘を軸に中央へ回す（foreTurn 度）。手首の形はいじらない。foreTurn 0 は第45稿と 1 ドットも違わない
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF, wrist = WRIST4_DEF) {", "function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF, wrist = null, foreTurn = FORE4_DEF) {");
rep("    const pts = [[36, -26], elbow, wrist].map(([x, y]) => [X(s * x), Y(y)]);",
    "    // 第47稿：肘から下（前腕＋掌）を、肘を軸に中央へ foreTurn 度まわす。wrist を明示したときは回さない（第46稿の否決された形の再現用）\n" +
    "    const fth = wrist ? 0 : (foreTurn * Math.PI) / 180, frot = ([x, y]) => [x * Math.cos(fth) - y * Math.sin(fth), x * Math.sin(fth) + y * Math.cos(fth)];\n" +
    "    const fvec = frot([WRIST4_OUT[0] - ELBOW4_OUT[0], WRIST4_OUT[1] - ELBOW4_OUT[1]]), wr = wrist || [elbow[0] + fvec[0], elbow[1] + fvec[1]], hdir = frot([18, 20]);\n" +
    "    const pts = [[36, -26], elbow, wr].map(([x, y]) => [X(s * x), Y(y)]);");
rep("    const W0 = pts[2], fl = Math.hypot(18, 20), dx = (s * 18) / fl, dy = 20 / fl, nx = -s * dy, ny = s * dx;",
    "    const W0 = pts[2], fl = Math.hypot(18, 20), dx = (s * hdir[0]) / fl, dy = hdir[1] / fl, nx = -s * dy, ny = s * dx;");
rep("    const wristBent = Math.abs(Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) - Math.atan2(s * 18, 20)) > 0.2;",
    "    const wristBent = Math.abs(Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) - Math.atan2(s * hdir[0], hdir[1])) > 0.2;");
rep("ELBOW4_DEF = ELBOW4_OUT, WRIST4_DEF = WRIST4_OUT;", "ELBOW4_DEF = ELBOW4_OUT, FORE4_DEF = 0;");
rep("o.handFlip !== false, o.elbow || ELBOW4_DEF, o.wrist || WRIST4_DEF)),", "o.handFlip !== false, o.elbow || ELBOW4_DEF, o.wrist || null, o.foreTurn ?? FORE4_DEF)),");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
