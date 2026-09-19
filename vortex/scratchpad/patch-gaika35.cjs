// 第35稿のパッチ（一度だけ当てる）。node patch-gaika35.cjs
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const once = (from, to, lo = 0, hi = src.length) => {
  const i = src.indexOf(from, lo);
  if (i < 0 || i >= hi) throw new Error('NOT FOUND: ' + from.slice(0, 60));
  if (src.indexOf(from, i + 1) >= 0 && src.indexOf(from, i + 1) < hi) throw new Error('NOT UNIQUE: ' + from.slice(0, 60));
  src = src.slice(0, i) + to + src.slice(i + from.length);
};
const span = (startMark, endMark, body) => {
  const a = src.indexOf(startMark); if (a < 0) throw new Error('NO START: ' + startMark);
  const b = src.indexOf(endMark, a); if (b < 0) throw new Error('NO END: ' + endMark);
  src = src.slice(0, a) + body + src.slice(b);
};

// 1) パレット：蒼の装甲の漆
once("  e: '#1b3a30', E: '#5fbf95',", "  // 第35稿：蒼の装甲の漆（q より一段明るく Q より暗い＝黒い胴と明度で分かれるが浮かない）\n  b: '#0c2a4e',\n  e: '#1b3a30', E: '#5fbf95',");

// 2) skirtTex：噴射の色を引数に（既定は従来の橙＝第一案と旧稿は不変）
{
  const lo = src.indexOf('function skirtTex('), hi = () => src.indexOf('\nconst SKIRT = skirtTex(');
  once('waist = false) {', "waist = false, jet = ['G', 'A', 'R', 'r', 'G', 'A']) {", lo, hi());
  once("Math.abs(x) < w1 * 0.45 ? 'G' : 'A');", 'Math.abs(x) < w1 * 0.45 ? jet[4] : jet[5]);', lo, hi());
  once("a < 0.35 ? 'G' : a < 0.7 ? 'A' : a < 1.0 ? 'R' : 'r');", 'a < 0.35 ? jet[0] : a < 0.7 ? jet[1] : a < 1.0 ? jet[2] : jet[3]);', lo, hi());
}

// 3) ノズル四本を下へ（太さは一段上げて痩せて見えないように）・噴射は蒼・テクスチャの高さ 150 は据え置き＝bbox 不変
span('const SKIRT_BIG = skirtTex(', '\n',
  "// 第35稿：FB「ロケット・ノズル4本をもう少し下に伸ばして。細くせずに」「ノズルからの炎を青色に」\n" +
  "//   ＝口を 90→106／74→92 へ。長くなるぶん痩せて見えるので太さを一段上げる。噴射は短くして高さ 150 に収める（bbox を増やさない）\n" +
  "const SKIRT_BIG = skirtTex([[-32, 10, 106, 10.5, 14.5], [32, 10, 106, 10.5, 14.5], [-54, 24, 92, 8, 11.5], [54, 24, 92, 8, 11.5]], [[-32, 108, 41, 10.5], [32, 108, 41, 10.5], [-54, 94, 46, 8.5], [54, 94, 46, 8.5]], SKB_H, 'taper', SKB_W, SKB_KX, SKB_KY, true, ['C', 'N', 'P', 'Q', 'C', 'N']);");

// 4) 光刃＝マゼンタへ戻す（形は第33稿のビームサーベルのまま・四段）
once("saber = SCH[o.saber || 'deep']", "saber = SCH[o.saber || 'mag']");
once("    bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b);\n", "    bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b);\n    bl.slab(0, 1, (u) => BW(u) * 0.3, () => sb.a);\n");

// 5) 肩当て：小さく・深紅の帯と裾の牙を外す（金は上縁の一筋だけ）
span('const shoulder = (s) => {', '\n\n// 有線の手',
  "const shoulder = (s) => {\n" +
  "  // 第35稿：FB「肩のプロテクターがうるさい。自己主張を抑えて」＝幅 38→30・高さ 33→21。深紅の帯と裾の牙四本を外し、黒鉄の一枚板に金の上縁だけ\n" +
  "  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;\n" +
  "  for (let y = -12; y <= 9; y += 0.25) {\n" +
  "    const u = (y + 12) / 21, w = 7 + 8 * Math.pow(u, 0.72), sk = s * 2.6 * u;\n" +
  "    for (let x = -w; x <= w; x += 0.25) {\n" +
  "      const v = s > 0 ? x / w : -x / w;\n" +
  "      let c;\n" +
  "      if (y < -10.9) c = Math.abs(v) > 0.62 ? 'k' : v < 0 ? 'Y' : 'y';\n" +
  "      else if (y > 7.6) c = 'k';\n" +
  "      else c = Math.abs(v) > 0.93 ? 'k' : v < -0.58 ? 'm' : v < 0.18 ? 'j' : 'k';\n" +
  "      P(G, X(x + sk), Y(y), c);\n" +
  "    }\n" +
  "  }\n" +
  "  OUTLINE(G);\n" +
  "  return R(G);\n" +
  "};");

// 6) 主腕：肘を外へ折り、手を逆さ扇と光刃の間の空間へ。掌に「掌蝕」（欠けた黒い太陽）・指は開いた爪
span('  const main = (s) => {   // 主腕（内側）', '  const sub = (s) => {   // 副腕（外側）',
  "  // 第35稿：FB「両手をスカートに触れないように」「手の攻撃手段を決め、そのうえでビジュアルを」\n" +
  "  //   攻撃手段＝掌蝕（しょうしょく）。掌に欠けた黒い太陽を抱え、引き寄せ・握り潰し・投げ返す（プレイヤーの動詞＝掴む・投げるを闘いの神が返す）。\n" +
  "  //   絵＝掌を正面へ開く。黒い円の下外側だけが深紅に灼ける（月牙と日蝕の輪と同じ「蝕」の形）。芯の点は打たない（金の輪に芯＝目の罠）\n" +
  "  const main = (s) => {\n" +
  "    const pts = [[33, -26], [47, -4], [66, 13]].map(([x, y]) => [X(s * x), Y(y)]);\n" +
  "    mechArm(G, pts, 7.2);\n" +
  "    const fa = mkSlab(G, pts[1][0], pts[1][1], pts[2][0], pts[2][1]);\n" +
  "    fa.slab(0.16, 0.96, 9.4, (v) => (v < -0.86 ? 'm' : v < -0.2 ? 'j' : 'k'));\n" +
  "    fa.slab(0.16, 0.26, 10.1, goldCol); fa.slab(0.87, 0.96, 10.1, goldCol);\n" +
  "    fa.slab(0.3, 0.84, 4.6, () => 'k');\n" +
  "    fa.slab(0.34, 0.8, 3.4, (v) => (Math.abs(v) < 0.32 ? 'A' : Math.abs(v) < 0.68 ? 'R' : 'r'));\n" +
  "    const W0 = pts[2], fl = Math.hypot(19, 17), dx = (s * 19) / fl, dy = 17 / fl, nx = -s * dy, ny = s * dx;\n" +
  "    const at = (d, o) => [W0[0] + dx * d + nx * o, W0[1] + dy * d + ny * o];\n" +
  "    const pm = mkSlab(G, ...at(3, 0), ...at(17, 0));\n" +
  "    pm.slab(0, 1, 13.2, (v) => (Math.abs(v) > 0.9 ? 'k' : v < -0.55 ? 'f' : v < 0.2 ? 'm' : 'j'));\n" +
  "    pm.slab(0, 0.16, 13.8, goldCol);\n" +
  "    const C0 = at(10.5, 0);\n" +
  "    DISC(G, C0[0], C0[1], 5.3, 'k'); DISC(G, C0[0], C0[1], 4.6, 'R'); DISC(G, C0[0], C0[1], 3.8, 'A');\n" +
  "    DISC(G, C0[0] - s * 1.5, C0[1] - 1.5, 4.0, 'k');\n" +
  "    for (const [o, fan, L] of [[-5.0, -0.36, 11], [-1.7, -0.12, 13.5], [1.7, 0.12, 13.5], [5.0, 0.36, 11]]) {\n" +
  "      const b0 = at(17, o), fx = dx * Math.cos(fan) + nx * Math.sin(fan), fy = dy * Math.cos(fan) + ny * Math.sin(fan);\n" +
  "      const fg = mkSlab(G, b0[0], b0[1], b0[0] + fx * L, b0[1] + fy * L);\n" +
  "      fg.slab(0, 1, (u) => 2.7 * (1 - u * 0.62), (v, u) => (u > 0.84 ? 'Y' : Math.abs(v) > 0.88 ? 'k' : v < -0.4 ? 'f' : v < 0.4 ? 'm' : 'j'));\n" +
  "    }\n" +
  "    {\n" +
  "      const b0 = at(6, -6.4), fx = dx * Math.cos(0.95) - nx * Math.sin(0.95), fy = dy * Math.cos(0.95) - ny * Math.sin(0.95);\n" +
  "      const th = mkSlab(G, b0[0], b0[1], b0[0] + fx * 9, b0[1] + fy * 9);\n" +
  "      th.slab(0, 1, (u) => 2.9 * (1 - u * 0.6), (v, u) => (u > 0.84 ? 'Y' : Math.abs(v) > 0.88 ? 'k' : v < -0.4 ? 'f' : v < 0.4 ? 'm' : 'j'));\n" +
  "    }\n" +
  "  };\n");

// 7) 蒼の装甲：黒鉄 → 蒼の漆（明度で胴と分ける）・上半分を一段張り出す
once("const SH_IN = [[22, -134], [15, -70], [17, -6], [46, 34], [54, 58]], SH_OUT = [[22, -134], [52, -100], [84, -46], [88, 6], [66, 36], [54, 58]], SH_RIDGE = [[22, -134], [48, -64], [57, 0], [54, 58]];",
  "// 第35稿：FB「蒼の装甲を蒼神骸華の最重要ビジュアルに進化させたい。クシャトリヤの四枚装甲のように」＝第一歩は『板として見えること』。\n" +
  "//   黒鉄の面が背景と胴に溶けて輪郭が消えていた → 面を蒼の漆（b／段の下唇 Q／陰 q）へ。彩度は上げず明度だけで分ける。上半分の張り出しを 84→92 へ\n" +
  "const SH_IN = [[22, -134], [15, -70], [17, -6], [46, 34], [54, 58]], SH_OUT = [[22, -134], [56, -102], [92, -50], [95, 4], [68, 36], [54, 58]], SH_RIDGE = [[22, -134], [51, -66], [60, 0], [54, 58]];");
once("      else c = lit ? (fr > 0.9 ? 'm' : 'j') : 'k';", "      else c = lit ? (fr > 0.86 ? 'Q' : 'b') : 'q';");

fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH_OK');
