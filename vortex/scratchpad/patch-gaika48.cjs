// 第48稿：FB（添付＝前腕がまっすぐ垂れ、指が内へゆるく巻いた手の素描）「添付資料のように主腕、肘、掌を書きなおして。ただし、直すのは蒼神骸華の左手だけ。右手は直さなくてよい」
//   骸華の左手＝画面右（s>0・いまの握り潰す手）。添付は右手の絵なので左右を反転して使う。画面左（開いた手）のコードは通らない＝1 ドットも変えない
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF, wrist = null, foreTurn = FORE4_DEF) {",
    "function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF, wrist = null, foreTurn = FORE4_DEF, handL = HANDL4_DEF) {");
rep("    const fth = wrist ? 0 : (foreTurn * Math.PI) / 180,",
    "    const turn = Array.isArray(foreTurn) ? foreTurn[s < 0 ? 0 : 1] : foreTurn;   // 第48稿：[画面左, 画面右] で左右別に回せる\n    const fth = wrist ? 0 : (turn * Math.PI) / 180,");
rep("    const clench = s > 0;\n", "    const clench = s > 0, hang = clench && handL === 'hang';   // 第48稿：骸華の左手（画面右）だけ、垂らして指を内へ巻いた手に描き直す\n");
rep("    const pm = mkSlab(G, ...at(2 * HP, 0), ...at(21 * HP, 0));", "    if (!hang) {\n    const pm = mkSlab(G, ...at(2 * HP, 0), ...at(21 * HP, 0));");
rep("    DISC(G, C0[0] - dx * 1.4 * HP + nx * 0.9 * HP, C0[1] - dy * 1.4 * HP + ny * 0.9 * HP, r0, 'k');\n",
    "    DISC(G, C0[0] - dx * 1.4 * HP + nx * 0.9 * HP, C0[1] - dy * 1.4 * HP + ny * 0.9 * HP, r0, 'k');\n    }\n");
rep("    const hs = handFlip ? -1 : 1;\n",
    "    if (hang) {\n" +
    "      // 親指側から見た「力を抜いて垂らした手」。+o＝中央の側。手の塊（手首の金の輪つき）→ 握り込んだ蝕の残り火 → 巻いた指（薬指→中指→人差し指の順＝奥から手前）→ 手前に垂れる親指\n" +
    "      const hb = mkSlab(G, ...at(1.5, 0), ...at(14, 0));\n" +
    "      hb.slab(0, 1, (u) => 7.2 + 1.2 * u, (v) => (Math.abs(v) > 0.9 ? 'k' : v < -0.55 ? 'm' : v < 0.25 ? 'j' : 'k'));\n" +
    "      hb.slab(0, 0.14, 8.3, goldCol);\n" +
    "      mkSlab(G, ...at(4, -4.6), ...at(12.5, -5.4)).slab(0, 1, 2.4, (v) => (Math.abs(v) > 0.8 ? 'k' : v < 0 ? 'f' : 'm'));   // 手の甲の装甲（外の側）\n" +
    "      { const [ex, ey] = at(15.5, 3.5); DISC(G, ex, ey, 3.0, 'r'); DISC(G, ex, ey, 1.8, 'R'); }\n" +
    "      const kb = at(14, -2.5);\n" +
    "      finger(kb, 0.78, 7, 2.3, 6);\n" +
    "      finger(kb, 0.5, 8, 1.8, 6.5);\n" +
    "      finger(kb, 0.22, 8.5, 1.2, 7);\n" +
    "      DISC(G, kb[0], kb[1], 3.1, 'k'); DISC(G, kb[0], kb[1], 1.9, 'm');\n" +
    "      finger(at(5, 4.8), 0.16, 7, -0.08, 6.5);\n" +
    "      return;\n" +
    "    }\n" +
    "    const hs = handFlip ? -1 : 1;\n");
rep("const FORE4_DEF = 20;", "const FORE4_DEF = 20, HANDL4_DEF = 'clench';");
rep("o.wrist || null, o.foreTurn ?? FORE4_DEF)),", "o.wrist || null, o.foreTurn ?? FORE4_DEF, o.handL || HANDL4_DEF)),");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
