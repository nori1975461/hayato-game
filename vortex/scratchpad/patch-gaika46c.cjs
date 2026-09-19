// 第46稿：手首が折れるとき（前腕と掌の向きが 0.2rad 以上ずれる）は手首に球の関節を置き、掌の根元の金の輪を外す（前腕の輪と X に交差するため）。旧い肘（ずれ 0.9°）は 1 ドットも変わらない
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("    const HP = 0.87, HF = 0.93;\n    const pm = mkSlab(G, ...at(2 * HP, 0), ...at(21 * HP, 0));",
    "    const HP = 0.87, HF = 0.93;\n    const wristBent = Math.abs(Math.atan2(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]) - Math.atan2(s * 18, 20)) > 0.2;   // 第46稿：肘を内へ折ると前腕と掌の向きがずれる＝手首に球の関節\n    if (wristBent) { DISC(G, W0[0], W0[1], 7.0, 'k'); DISC(G, W0[0], W0[1], 5.8, 'm'); DISC(G, W0[0], W0[1], 4.0, 'k'); DISC(G, W0[0], W0[1], 2.8, 'f'); }\n    const pm = mkSlab(G, ...at(2 * HP, 0), ...at(21 * HP, 0));");
rep("    pm.slab(0, 0.12, 11.2 * HP, goldCol);", "    if (!wristBent) pm.slab(0, 0.12, 11.2 * HP, goldCol);");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
