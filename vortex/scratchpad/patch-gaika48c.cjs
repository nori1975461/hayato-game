// 第48稿：垂らした手を「斜め前から見た巻いた指の列」に描き直す（真横から見た版は指が重なって潰れ、暗くて読めなかった）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const i0 = s.indexOf("      const hb = mkSlab(G, ...at(1.5, 0), ...at(15.5, 0));\n"), i1 = s.indexOf("      return;\n    }\n", i0);
if (i0 < 0 || i1 < 0) { console.error('PATCH_MISS'); process.exit(1); }
const body =
"      const hb = mkSlab(G, ...at(1.5, 0), ...at(15, 0));\n" +
"      hb.slab(0, 1, (u) => 9 + 1.6 * u, (v) => (Math.abs(v) > 0.9 ? 'k' : v < -0.5 ? 's' : v < -0.1 ? 'f' : v < 0.45 ? 'm' : 'j'));   // 手の甲＝鋼の板（暗いスカートの上で読める明るさ）\n" +
"      hb.slab(0.52, 0.58, 10, () => 'k');                                                     // 甲の板の継ぎ目\n" +
"      hb.slab(0, 0.16, 9.8, goldCol);                                                         // 手首の金の輪\n" +
"      { const [ex, ey] = at(20, 9); DISC(G, ex, ey, 3.4, 'r'); DISC(G, ex, ey, 2.1, 'R'); DISC(G, ex, ey, 0.9, 'A'); }   // 握り込んだ蝕の残り火（親指と人差し指の間から漏れる）\n" +
"      for (const [bu, bo, t1, l1, t2, l2, w] of [[12.5, -7.5, 0.25, 7.5, 1.7, 6, 2.9], [14, -3.5, 0.22, 9.5, 1.6, 7, 3.2], [15.5, 0.5, 0.2, 10.5, 1.5, 7.5, 3.4], [16.5, 4.5, 0.18, 9.5, 1.35, 8, 3.4]]) {   // 小指→人差し指（外の高い拳頭から内の低い拳頭へ）\n" +
"        const b = at(bu, bo); fingerW(b, t1, l1, t2, l2, w); DISC(G, b[0], b[1], w + 0.3, 'k'); DISC(G, b[0], b[1], w - 0.9, 'f');\n" +
"      }\n" +
"      fingerW(at(6, 8.5), 0.35, 8, -0.05, 7.5, 3.2);                                          // 親指（内の手前に垂れる）\n";
s = s.slice(0, i0) + body + s.slice(i1);
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
