// 第51稿：FB（添付＝光刃が外下へ長く垂れていた頃の稿）「バルカン砲とビームサーベルを交代させて。いまのバルカン砲の柄にビームサーベルをつけて。いまのビームサーベルの柄にバルカン砲をつけて。ビームサーベルの位置は添付資料参考」
//   kit 'swap'＝三本目の腕の手にバルカン砲（向きはいまの光刃と同じ 17°）／台座（砲架＋旋回軸）から光刃（向きはいまの砲と同じ 66°≒添付の 65°・長さ 96）。'vulcan'（第49〜50稿）と 'launcher'（第48稿まで）は 1 ドットも変えない
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
// 砲の本体（機関部＋砲身の束）と旋回軸の円盤を部品に分ける（描く順は今までと同じ＝'vulcan' は不変）
rep("    const VUL_RC = 23, a = (vulcanDeg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), ax = (d) => [P1[0] + dx * d, P1[1] + dy * d];\n    const rc = mkSlab(G, ...ax(-7), ...ax(VUL_RC));",
    "    gunAt(P1, s, vulcanDeg, vulcanLen, 7); trunnion(P1);\n  };\n" +
    "  const gunAt = (P1, s, deg, len, back) => {   // 第51稿：砲の本体（機関部＋砲身の束三本）。back＝軸の後ろへ伸ばす長さ\n" +
    "    const VUL_RC = 23, a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), ax = (d) => [P1[0] + dx * d, P1[1] + dy * d];\n" +
    "    const rc = mkSlab(G, ...ax(-back), ...ax(VUL_RC));");
rep("    const br = mkSlab(G, ...ax(VUL_RC), ...ax(VUL_RC + vulcanLen));", "    const br = mkSlab(G, ...ax(VUL_RC), ...ax(VUL_RC + len));");
rep("    br.slab(0.92, 1, 6.6, () => 'k'); br.slab(0.935, 0.985, 6.0, goldCol);\n    DISC(G, P1[0], P1[1], 8.8, 'k');",
    "    br.slab(0.92, 1, 6.6, () => 'k'); br.slab(0.935, 0.985, 6.0, goldCol);\n  };\n  const trunnion = (P1) => {   // 旋回軸の円盤（ボルト六本）\n    DISC(G, P1[0], P1[1], 8.8, 'k');");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
