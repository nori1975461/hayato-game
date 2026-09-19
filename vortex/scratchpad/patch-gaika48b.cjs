// 第48稿：垂らした手を大きく・はっきり描き直す（1 回目は手の塊 12px で潰れて読めなかった）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const i0 = s.indexOf("    if (hang) {\n      // 親指側から見た"), i1 = s.indexOf("      return;\n    }\n", i0);
if (i0 < 0 || i1 < 0) { console.error('PATCH_MISS'); process.exit(1); }
const body =
"    if (hang) {\n" +
"      // 親指側から見た「力を抜いて垂らした手」（添付の素描＝右手の絵を左右反転）。+o＝中央の側。\n" +
"      //   手の甲の塊（鋼・手首に金の輪）→ 握り込んだ蝕の残り火 → 巻いた指（薬指→中指→人差し指＝奥から手前。奥の指ほど深く巻く）→ 大きな拳頭 → 手前に垂れる親指\n" +
"      const fingerW = (b0, th1, L1, th2, L2, w) => {\n" +
"        const f1 = dir(th1), j1 = [b0[0] + f1[0] * L1, b0[1] + f1[1] * L1], f2 = dir(th2), t = [j1[0] + f2[0] * L2, j1[1] + f2[1] * L2];\n" +
"        mkSlab(G, b0[0], b0[1], j1[0], j1[1]).slab(0, 1, w, bone);\n" +
"        mkSlab(G, j1[0], j1[1], t[0], t[1]).slab(0, 1, (u) => (w - 0.3) * (1 - u) + 0.5, claw);\n" +
"        DISC(G, j1[0], j1[1], w - 0.4, 'k'); DISC(G, j1[0], j1[1], w - 1.6, 'm');\n" +
"      };\n" +
"      const hb = mkSlab(G, ...at(1.5, 0), ...at(15.5, 0));\n" +
"      hb.slab(0, 1, (u) => 8.4 + 1.3 * u, (v) => (Math.abs(v) > 0.9 ? 'k' : v < -0.5 ? 'f' : v < 0.15 ? 'm' : v < 0.6 ? 'j' : 'k'));\n" +
"      hb.slab(0.5, 0.56, 9.4, () => 'k');                                                     // 甲の板の継ぎ目\n" +
"      hb.slab(0, 0.15, 9.3, goldCol);                                                         // 手首の金の輪\n" +
"      { const [ex, ey] = at(21, 4); DISC(G, ex, ey, 3.6, 'r'); DISC(G, ex, ey, 2.3, 'R'); DISC(G, ex, ey, 1.0, 'A'); }   // 握り込んだ蝕の残り火（指の間から漏れる）\n" +
"      const kb = at(15.5, -3);\n" +
"      fingerW(kb, 0.85, 9.5, 2.5, 8, 3.2);\n" +
"      fingerW(kb, 0.6, 10.5, 2.0, 9, 3.4);\n" +
"      fingerW(kb, 0.35, 11, 1.5, 9.5, 3.6);\n" +
"      DISC(G, kb[0], kb[1], 4.4, 'k'); DISC(G, kb[0], kb[1], 3.2, 'm'); DISC(G, kb[0], kb[1], 1.6, 'k');   // 拳頭\n" +
"      fingerW(at(5.5, 6.5), 0.2, 8.5, -0.15, 8, 3.2);                                         // 親指（手前）\n";
s = s.slice(0, i0) + body + s.slice(i1);
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
