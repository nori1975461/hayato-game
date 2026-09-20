// FB（2026-09-20 19:05）
//   ①「蒼神骸華のテーマが蝕、というのは素晴らしいアイデア。ならば蝕刃の設定もビジュアルに宿したい。ただのビームサーベルを『静かに間違っているサーベル』にしよう。アイデアやビジュアルはあなたに任せる」
//   ②「副腕の付け根が、蒼の装甲から出てきたすぐの箇所にある。これでは物理的にサーベルを振ることはできない。蒼の装甲から生えている支柱を伸ばそう。その長い支柱に副腕がついていて、蝕刃を振るう。支柱の長さやビジュアル等はあなたにまかせる」
// 読み：変えるのは副腕のテクスチャ（subarms）だけ。
//   ②関節から先（関節・前腕・柄・光刃）をひとかたまりのまま装甲から離し（向き 62°・長さ 96・前腕と光刃の一直線は据え置き）、装甲の陰から関節まで支柱を渡す
//   ①光刃の断面だけを蝕にする（形・向き・長さ・色は据え置き）
// 作り：{ subBoom: true | { root, shift, sleeve, hwS, hwR } }＝支柱。root は装甲の陰・shift は関節から先（関節・前腕・柄・光刃）の平行移動（整数＝従来の絵と画素一致）。伸縮する筒＝装甲の側は暗い外筒・先は磨いた内筒（腕の油圧＝筒と光る棒 と同じ語彙）
//       { subBlade: 'eclipse' | { ew, cw, u0, du, ring } }＝蝕刃。普通の光刃は芯がいちばん明るい／蝕刃は芯が黒く、光は縁（コロナ）にしか無い。黒い芯は柄の口から少し離れて生まれる（根元は普通の光刃に見える）
//   どちらも kit 'launcher' の副腕だけに効く。支柱の版は光刃の先が下がるので、副腕のテクスチャだけ縦を足す（全身の外接は変わらない）。既定は不変。
// 試して落としたもの：支柱を横へ張り出す（主腕の手から生えて見える）・支柱をさらに下へ（支柱と前腕と光刃が一本の棒になる）・一本の梁の支柱（ただの棒）・外筒の口に金の環（前腕の金の帯と重なってうるさい）
//   蝕刃：芯を細い黒線に（点線に崩れる）・黒を縁まで（中が空の輪郭線に見える）・先へ行くほど黒が太る（二股の刃に見える）・光の刃の脇に黒い刃（影付きの光刃に見える）
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("let subStraight = false;",
  "let subBoom4 = null, subBlade4 = null;   // 第53稿の検討：支柱（副腕の関節を装甲から離す）と蝕刃（芯が黒い光刃）。build4 が o.subBoom／o.subBlade から差し替える\n" +
  "const SUB4_BOOM_DEF = { root: [78, 14], shift: [2, 25], sleeve: 0.56 }, SUB4_ECLIPSE_DEF = { ew: 4.5, cw: 1.5, u0: 0.05, du: 0.14 };\n" +
  "const SUB4_EXTRA_H = 28;   // 支柱の版は光刃の先が下がる＝副腕のテクスチャだけ縦を足す（全身の外接は噴射の先 y 181 が決めているので変わらない）\n" +
  "let subStraight = false;");
rep("  const G = g(ARM4_W, ARM4_H), X = (x) => x + ARM4_O[0], Y = (y) => y + ARM4_O[1];\n  // 第35稿：FB「両手をスカートに触れないように」",
  "  const G = g(ARM4_W, only === 'sub' && subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H), X = (x) => x + ARM4_O[0], Y = (y) => y + ARM4_O[1];\n  // 第35稿：FB「両手をスカートに触れないように」");
rep("    const pts = [[82, -4], subElbow, [109, 27]].map(([x, y]) => [X(s * x), Y(y)]);\n    mechArm(G, pts, 4.4);",
  "    const bm = subBoom4, hubW = bm ? [109 - Math.cos(SUB_A) * SUB_FL + bm.shift[0], 27 - Math.sin(SUB_A) * SUB_FL + bm.shift[1]] : subElbow;   // 支柱の版：関節から先は従来の絵を整数だけ平行移動（shift）＝画素は変わらない\n" +
  "    const pts = [bm ? bm.root : [82, -4], hubW, bm ? [hubW[0] + Math.cos(SUB_A) * SUB_FL, hubW[1] + Math.sin(SUB_A) * SUB_FL] : [109, 27]].map(([x, y]) => [X(s * x), Y(y)]);\n" +
  "    if (bm) {\n" +
  "      // 支柱：装甲の陰（root）から副腕の関節（hub）まで。伸縮する筒＝暗い外筒（sleeve まで）＋磨いた内筒。関節から先は従来の前腕・柄・光刃をそのまま平行移動\n" +
  "      const st = mkSlab(G, pts[0][0], pts[0][1], pts[1][0], pts[1][1]), uS = bm.sleeve ?? 0.56, hs = bm.hwS ?? 3.2, hr = bm.hwR ?? 1.9;\n" +
  "      st.slab(uS - 0.02, 1, hr, (v) => (v < -0.35 ? 's' : v < 0.4 ? 'f' : 'm'));\n" +
  "      st.slab(0, uS, hs, (v) => (v < -0.6 ? 'f' : v < -0.05 ? 'm' : v < 0.6 ? 'j' : 'k'));\n" +
  "      st.slab(uS - 2.4 / st.L, uS, hs + 0.7, (v) => (v < -0.4 ? 's' : v < 0.35 ? 'f' : 'm'));   // 外筒の口\n" +
  "      mechArm(G, [pts[1], pts[2]], 4.4);\n" +
  "      { const [jx, jy] = pts[1], hr2 = 4.4; DISC(G, jx, jy, hr2 + 1.2, 'k'); DISC(G, jx, jy, hr2 + 0.4, 'm'); DISC(G, jx, jy, hr2 - 1.4, 'k'); DISC(G, jx, jy, hr2 - 2.2, 'f'); for (const [ax, ay] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) P(G, jx + ax, jy + ay, 'k'); }   // 関節（mechArm の肘と同じ絵）\n" +
  "    } else mechArm(G, pts, 4.4);");
rep("    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k');\n    bl.slab(0, 1, (u) => BW(u), () => sb.c);\n    bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b);\n    bl.slab(0, 1, (u) => BW(u) * 0.3, () => sb.a);\n    bl.slab(0, 1, (u) => BW(u) * 0.08, () => sb.core);",
  "    if (subBlade4) {\n" +
  "      // 蝕刃：断面を軸からの画素の距離 a で決める。a < 黒い芯の半幅 → 黒／その外は 1 画素ずつ 芯の光→…→裾（＝皆既の輪）。先端は光が包む（tipRim）\n" +
  "      const e = subBlade4, ew = e.ew ?? 4.5, EW = (u) => BW(u) * (ew / 2.9), ring = e.ring || [sb.core, sb.a, sb.b, sb.c];\n" +
  "      bl.slab(0, 1, (u) => EW(u) + 0.8, () => 'k');\n" +
  "      bl.slab(0, 1, EW, (v, u) => {\n" +
  "        const w = EW(u), a = Math.abs(v) * w, grow = e.u0 == null ? 1 : Math.pow(Math.max(0, Math.min(1, (u - e.u0) / (e.du ?? 0.14))), 0.6);   // 黒い芯は柄の口から少し離れて生まれる\n" +
  "        const c = Math.min((e.cw ?? 1.5) * grow, Math.max(0, w - (e.tipRim ?? 1.0)));\n" +
  "        return a < c ? 'k' : ring[Math.min(ring.length - 1, Math.floor(a - c))];\n" +
  "      });\n" +
  "    } else {\n" +
  "    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k');\n    bl.slab(0, 1, (u) => BW(u), () => sb.c);\n    bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b);\n    bl.slab(0, 1, (u) => BW(u) * 0.3, () => sb.a);\n    bl.slab(0, 1, (u) => BW(u) * 0.08, () => sb.core);\n" +
  "    }");
rep("  subStraight = !!o.subStraight; thirdArm4",
  "  subBoom4 = o.subBoom ? { ...SUB4_BOOM_DEF, ...(typeof o.subBoom === 'object' ? o.subBoom : {}) } : null; subBlade4 = o.subBlade ? { ...SUB4_ECLIPSE_DEF, ...(typeof o.subBlade === 'object' ? o.subBlade : {}) } : null;\n  subStraight = !!o.subStraight; thirdArm4");
rep("tex: 'subarms', ox: 0, oy: 0, origin: [ARM4_O[0] / ARM4_W, ARM4_O[1] / ARM4_H] },",
  "tex: 'subarms', ox: 0, oy: 0, origin: [ARM4_O[0] / ARM4_W, ARM4_O[1] / (subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H)] },");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('BOOM_ECLIPSE_PATCH_OK');
