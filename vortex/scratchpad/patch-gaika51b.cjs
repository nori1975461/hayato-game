// 第51稿（第二段）：kit 'swap' を足して既定にする
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("  const sub = (s) => {   // 副腕（外側）\n    if (kit === 'vulcan') return vulcan(s);\n",
    "  const saberMount = (s) => {   // 第51稿：台座（砲架＋旋回軸）から光刃を垂らす。砲架は vulcan と同じ・光刃の根は旋回軸の円盤の縁の外（軸から 7）\n" +
    "    const P0 = [X(s * 82), Y(-4)], P1 = [X(s * 103), Y(12)];\n" +
    "    const yoke = mkSlab(G, P0[0], P0[1], P1[0], P1[1]);\n" +
    "    yoke.slab(0, 1, (u) => 6.6 - 1.4 * u, (v) => (Math.abs(v) > 0.86 ? 'k' : v < -0.4 ? 'm' : v < 0.3 ? 'j' : 'k'));\n" +
    "    yoke.slab(0.15, 0.85, 1.0, () => 'k');\n" +
    "    const a = (mountSaberDeg * Math.PI) / 180;\n" +
    "    saberAt([P1[0] + s * Math.cos(a) * 7, P1[1] + Math.sin(a) * 7], s, mountSaberDeg, mountSaberLen); trunnion(P1);\n" +
    "  };\n" +
    "  const sub = (s) => {   // 副腕（外側）\n    if (kit === 'vulcan') return vulcan(s);\n    if (kit === 'swap') return saberMount(s);\n");
rep("    if (kit === 'vulcan') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }",
    "    if (kit === 'swap') { gunAt(pts[2], s, armGunDeg, armGunLen, 3); return; }   // 第51稿：この手にバルカン砲（向きは第50稿の光刃と同じ）\n" +
    "    if (kit === 'vulcan') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }");
rep("let saberDeg = SABER4_DEG, saberLen = SABER4_LEN, vulcanDeg = VULCAN4_DEG, vulcanLen = VULCAN4_LEN;",
    "let saberDeg = SABER4_DEG, saberLen = SABER4_LEN, vulcanDeg = VULCAN4_DEG, vulcanLen = VULCAN4_LEN;\n" +
    "// 第51稿：FB「バルカン砲とビームサーベルを交代させて。いまのバルカン砲の柄にビームサーベルをつけて。いまのビームサーベルの柄にバルカン砲をつけて。ビームサーベルの位置は添付資料参考」\n" +
    "//   kit 'swap'＝三本目の腕の手にバルカン砲（ARMGUN4＝向きは第50稿の光刃と同じ 17°・砲身 30）／台座から光刃（MSABER4＝向きは第50稿の砲と同じ 66°≒添付の実測 65°・長さ 96＝第33〜48稿の光刃の長さ）\n" +
    "const ARMGUN4_DEG = 17, ARMGUN4_LEN = 30, MSABER4_DEG = 66, MSABER4_LEN = 96;\n" +
    "let armGunDeg = ARMGUN4_DEG, armGunLen = ARMGUN4_LEN, mountSaberDeg = MSABER4_DEG, mountSaberLen = MSABER4_LEN;");
rep("  saberDeg = o.saberDeg ?? SABER4_DEG; saberLen = o.saberLen ?? SABER4_LEN; vulcanDeg = o.vulcanDeg ?? VULCAN4_DEG; vulcanLen = o.vulcanLen ?? VULCAN4_LEN;\n",
    "  saberDeg = o.saberDeg ?? SABER4_DEG; saberLen = o.saberLen ?? SABER4_LEN; vulcanDeg = o.vulcanDeg ?? VULCAN4_DEG; vulcanLen = o.vulcanLen ?? VULCAN4_LEN;\n" +
    "  armGunDeg = o.armGunDeg ?? ARMGUN4_DEG; armGunLen = o.armGunLen ?? ARMGUN4_LEN; mountSaberDeg = o.mountSaberDeg ?? MSABER4_DEG; mountSaberLen = o.mountSaberLen ?? MSABER4_LEN;\n");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
