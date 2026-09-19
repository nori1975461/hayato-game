// 第49稿：FB「左手は D にして」「電子パルス砲をなくして、その場所にマゼンタ色のビームサーベルを移動させる。ビームサーベルがあった場所はバルカン砲の台座にする。砲台のビジュアルや長さは、あなたにまかせる」
//   電子パルス砲＝三本目の腕のメガランチャー（いまの絵で砲はこれだけ）。kit 'vulcan'＝新しい装備／'launcher'＝第48稿までの装備（1 ドットも変えずに再現できる）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("foreTurn = FORE4_DEF, handL = HANDL4_DEF) {", "foreTurn = FORE4_DEF, handL = HANDL4_DEF, kit = KIT4_DEF) {");
rep("  const sub = (s) => {   // 副腕（外側）\n",
    "  // 第49稿：光刃を任意の手首から任意の角度で生やす（形と色は第33稿の光刃＝副腕の光刃と同じ作り：手首の節 → 刀身五層 → 爪二本 → 柄）\n" +
    "  const saberAt = (W0, s, deg, L) => {\n" +
    "    const a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a);\n" +
    "    const un = mkSlab(G, W0[0] - dx * 2, W0[1] - dy * 2, W0[0] + dx * 6, W0[1] + dy * 6); un.slab(0, 1, 4.8, (v) => (v < -0.6 ? 'f' : v < 0.4 ? 'm' : 'j'));\n" +
    "    const S0 = [W0[0] + dx * 7, W0[1] + dy * 7], T = [S0[0] + dx * L, S0[1] + dy * L], bl = mkSlab(G, S0[0], S0[1], T[0], T[1]);\n" +
    "    const BW = (u) => (u < 0.055 ? 0.9 + u * 36 : u > 0.84 ? 2.9 * Math.pow((1 - u) / 0.16, 0.5) : 2.9);\n" +
    "    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, (u) => BW(u), () => sb.c); bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b); bl.slab(0, 1, (u) => BW(u) * 0.3, () => sb.a); bl.slab(0, 1, (u) => BW(u) * 0.08, () => sb.core);\n" +
    "    for (const da of [-0.62, 0.62]) { const ca = Math.atan2(dy, dx) + da, cl = mkSlab(G, W0[0] + dx * 4, W0[1] + dy * 4, W0[0] + dx * 4 + Math.cos(ca) * 11, W0[1] + dy * 4 + Math.sin(ca) * 11); cl.slab(0, 1, (u) => 2.5 * (1 - u) + 0.35, (v, u) => (u > 0.8 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }\n" +
    "    const em = mkSlab(G, S0[0] - dx * 4.2, S0[1] - dy * 4.2, S0[0] + dx * 3.4, S0[1] + dy * 3.4);\n" +
    "    em.slab(0, 1, 4.4, (v) => (v < -0.6 ? 'j' : 'k')); em.slab(0, 0.22, 4.9, goldCol); em.slab(0.78, 1, 4.9, goldCol);\n" +
    "  };\n" +
    "  // 第49稿：バルカン砲の台座（副腕と光刃があった場所）。殻の外の縁の陰から黒鉄の砲架が出て、旋回軸の円盤に機関部と砲身の束（見えるのは三本）が載る。\n" +
    "  //   語彙は骸華の機械のまま＝黒鉄・鋼・金の輪・放熱の溝の深紅。丸い金の輪に芯は打たない（目の罠）。砲口は外下（vulcanDeg）＝逆さ扇と光刃と同じ「下へ開く扇」の一本\n" +
    "  const vulcan = (s) => {\n" +
    "    const P0 = [X(s * 82), Y(-4)], P1 = [X(s * 103), Y(12)];\n" +
    "    const yoke = mkSlab(G, P0[0], P0[1], P1[0], P1[1]);\n" +
    "    yoke.slab(0, 1, (u) => 6.6 - 1.4 * u, (v) => (Math.abs(v) > 0.86 ? 'k' : v < -0.4 ? 'm' : v < 0.3 ? 'j' : 'k'));\n" +
    "    yoke.slab(0.15, 0.85, 1.0, () => 'k');\n" +
    "    const a = (vulcanDeg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), ax = (d) => [P1[0] + dx * d, P1[1] + dy * d];\n" +
    "    const rc = mkSlab(G, ...ax(-7), ...ax(17));\n" +
    "    rc.slab(0, 1, 7.4, (v) => (Math.abs(v) > 0.9 ? 'k' : v < -0.55 ? 'f' : v < 0 ? 'm' : v < 0.55 ? 'j' : 'k'));\n" +
    "    rc.slab(0.42, 0.86, 1.1, (v) => (Math.abs(v) < 0.5 ? 'R' : 'r'), 3.2);\n" +
    "    rc.slab(0.9, 1, 8.0, goldCol);\n" +
    "    const br = mkSlab(G, ...ax(17), ...ax(17 + vulcanLen));\n" +
    "    br.slab(0, 1, 5.6, () => 'k');\n" +
    "    for (const kc of [-3.6, 0, 3.6]) br.slab(0, 1, 1.4, (v) => (v < -0.3 ? 's' : v < 0.4 ? 'f' : 'm'), kc);\n" +
    "    for (const u of [0.3, 0.68]) { br.slab(u, u + 0.08, 6.4, () => 'k'); br.slab(u + 0.015, u + 0.065, 5.8, (v) => (v < -0.4 ? 'f' : v < 0.3 ? 'm' : 'j')); }\n" +
    "    br.slab(0.92, 1, 6.6, () => 'k'); br.slab(0.935, 0.985, 6.0, goldCol);\n" +
    "    DISC(G, P1[0], P1[1], 8.8, 'k'); DISC(G, P1[0], P1[1], 7.6, 'm'); DISC(G, P1[0], P1[1], 5.8, 'k'); DISC(G, P1[0], P1[1], 4.6, 'j');\n" +
    "    for (let i = 0; i < 6; i++) { const t = (i * Math.PI) / 3 + 0.5; P(G, P1[0] + Math.cos(t) * 6.7, P1[1] + Math.sin(t) * 6.7, 'k'); }\n" +
    "  };\n" +
    "  const sub = (s) => {   // 副腕（外側）\n" +
    "    if (kit === 'vulcan') return vulcan(s);\n");
rep("    fa.slab(0.1, 1, 7.4, (v) => (v < -0.8 ? 'f' : v < -0.15 ? 'm' : 'k'));\n",
    "    fa.slab(0.1, 1, 7.4, (v) => (v < -0.8 ? 'f' : v < -0.15 ? 'm' : 'k'));\n" +
    "    if (kit === 'vulcan') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }   // 第49稿：砲を外し、この手にマゼンタの光刃（前腕に光刃と同じ色の帯）\n");
rep("const FORE4_DEF = [20, 35], HANDL4_DEF = 'hang';", "const FORE4_DEF = [20, 35], HANDL4_DEF = 'hang', KIT4_DEF = 'launcher';\nlet saberDeg = 45, saberLen = 96, vulcanDeg = 66, vulcanLen = 36;   // 第49稿：見比べ用に build4 から差し替える（下の build4 を参照）");
rep("o.foreTurn ?? FORE4_DEF, o.handL || HANDL4_DEF)),", "o.foreTurn ?? FORE4_DEF, o.handL || HANDL4_DEF, o.kit || KIT4_DEF)),");
rep("subarms: P7(arms4(saber, 'sub')),", "subarms: P7(arms4(saber, 'sub', false, ELBOW4_DEF, null, FORE4_DEF, HANDL4_DEF, o.kit || KIT4_DEF)),");
// build4 の頭で角度と長さを差し替える
rep("function build4(o = {}) {\n", "function build4(o = {}) {\n  saberDeg = o.saberDeg ?? SABER4_DEG; saberLen = o.saberLen ?? SABER4_LEN; vulcanDeg = o.vulcanDeg ?? VULCAN4_DEG; vulcanLen = o.vulcanLen ?? VULCAN4_LEN;\n");
rep("let saberDeg = 45, saberLen = 96, vulcanDeg = 66, vulcanLen = 36;", "const SABER4_DEG = 45, SABER4_LEN = 96, VULCAN4_DEG = 66, VULCAN4_LEN = 36;\nlet saberDeg = SABER4_DEG, saberLen = SABER4_LEN, vulcanDeg = VULCAN4_DEG, vulcanLen = VULCAN4_LEN;");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
