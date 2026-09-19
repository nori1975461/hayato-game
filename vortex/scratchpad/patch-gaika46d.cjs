// 第46稿：手首の球は前腕の装甲より先に描く（前腕の端の金の輪が球の上に乗る）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("    const wristBent = Math.abs(Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) - Math.atan2(s * 18, 20)) > 0.2;   // 第46稿：肘を内へ折ると前腕と掌の向きがずれる＝手首に球の関節\n    if (wristBent) { DISC(G, W0[0], W0[1], 7.0, 'k'); DISC(G, W0[0], W0[1], 5.8, 'm'); DISC(G, W0[0], W0[1], 4.0, 'k'); DISC(G, W0[0], W0[1], 2.8, 'f'); }\n", "");
rep("    mechArm(G, pts, 7.2);\n    const fa = ",
    "    mechArm(G, pts, 7.2);\n    const wristBent = Math.abs(Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) - Math.atan2(s * 18, 20)) > 0.2;   // 第46稿：肘を内へ折ると前腕と掌の向きがずれる＝手首に球の関節（前腕の装甲より先に描く＝端の金の輪が球の上に乗る）。旧い肘はずれ 0.9°＝描かない\n    if (wristBent) { const [wx, wy] = pts[2]; DISC(G, wx, wy, 7.0, 'k'); DISC(G, wx, wy, 5.8, 'm'); DISC(G, wx, wy, 4.0, 'k'); DISC(G, wx, wy, 2.8, 'f'); }\n    const fa = ");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
