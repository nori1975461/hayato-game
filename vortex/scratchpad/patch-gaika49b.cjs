// 第49稿：既定を切り替える（左手＝D＝垂らした手＋前腕 20°／装備＝光刃は三本目の腕・副腕の場所はバルカン砲の台座）＋機関部を少し長く（旋回軸の円盤に隠れて砲の胴が見えなかった）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("    const rc = mkSlab(G, ...ax(-7), ...ax(17));", "    const rc = mkSlab(G, ...ax(-7), ...ax(VUL_RC));");
rep("    const br = mkSlab(G, ...ax(17), ...ax(17 + vulcanLen));", "    const br = mkSlab(G, ...ax(VUL_RC), ...ax(VUL_RC + vulcanLen));");
rep("    const a = (vulcanDeg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), ax = (d) => [P1[0] + dx * d, P1[1] + dy * d];",
    "    const VUL_RC = 23, a = (vulcanDeg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), ax = (d) => [P1[0] + dx * d, P1[1] + dy * d];");
rep("    rc.slab(0.42, 0.86, 1.1, (v) => (Math.abs(v) < 0.5 ? 'R' : 'r'), 3.2);", "    rc.slab(0.55, 0.86, 1.1, (v) => (Math.abs(v) < 0.5 ? 'R' : 'r'), 3.2);");
rep("const FORE4_DEF = [20, 35], HANDL4_DEF = 'hang', KIT4_DEF = 'launcher';",
    "// 第49稿：FB「左手は D にして」（D＝垂らした手のまま前腕の角度は第47稿と同じ 20°）「電子パルス砲をなくして、その場所にマゼンタ色のビームサーベルを移動させる。ビームサーベルがあった場所はバルカン砲の台座にする。砲台のビジュアルや長さは、あなたにまかせる」\n" +
    "//   電子パルス砲＝三本目の腕のメガランチャー。KIT4_DEF 'vulcan'＝三本目の腕が光刃を持つ（45°・長さ 96＝元の 62° のままだと下の台座を横切る／17° は長さ 70 しか入らず輪からほとんど出ない）＋副腕の場所にバルカン砲の台座（66°・砲身 36）。\n" +
    "//   第48稿までの装備は gaika2With({ kit: 'launcher' })、第48稿の左手は { foreTurn: [20, 35] }\n" +
    "const FORE4_DEF = [20, 20], HANDL4_DEF = 'hang', KIT4_DEF = 'vulcan';");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
