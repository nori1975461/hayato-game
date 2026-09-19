// 第44稿のパッチ（一度だけ当てる）。node patch-gaika44.cjs
//   FB（09-19 19:40）①「胴をあなたが最適と思うくらいまで小さくして」②「掌は左右の腕に逆についてない？」
//   ①第43稿（胸の半幅 27.6→26.2＝面積 −4%）では足りなかった＝今回は目で見てわかる量まで詰める。胸の半幅を引数 CH4 にして（既定 CH4_DEF）、
//     胸の中の割り付け（ルーバー・分割線・溝）と襟と関節の円盤は胸の幅に比例して内へ寄せる。線の太さは変えない（一律の拡縮は 1 ドット線が滲む）。
//     ⚠️扇の付け根（±36・世界 y 22）を覆う幅は死守＝どの版も y 22 で半幅 36 以上。裾は上げる（bell：BASE_Y 24→22.6・TIP_Y 39→37.5／ザク：TIP_Y 39→37.5）
//   ②検証の結果＝逆ではない（掌を正面へ向けて指を下へ垂らした右手は、見る側から親指が左＝外に来る）。見比べ用に左右を入れ替えた変種 handFlip を足す（既定は現状のまま）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };

// ---- 共通：胸の半幅を引数に
rep("const CH4 = 26.2;   // 第43稿：胸の半幅（27.6→26.2＝四版共通で胴をほんの少し小さく）\nfunction waist4(G, X, Y, style) {\n",
  "// 第44稿：FB「胴をあなたが最適と思うくらいまで小さくして」＝胸の半幅 26.2→CH4_DEF。胸の中の割り付けと襟と関節は胸の幅に比例して内へ寄せる（線の太さは変えない）\nconst CH4_DEF = 24.6, CH4_V43 = 26.2;\nfunction waist4(G, X, Y, style, CH4 = CH4_DEF) {\n  const k4 = CH4 / CH4_V43, SX4 = 16 * k4, GR4 = 17.5 * k4;\n");
rep("  const groove = (x, y) => Math.abs(x) > 17.5 && Math.abs(x) < CH4 - 3.2 &&", "  const groove = (x, y) => Math.abs(x) > GR4 && Math.abs(x) < CH4 - 3.2 &&");
rep("groove(x, y) ? 'k' : face(x, w, 16))); } };", "groove(x, y) ? 'k' : face(x, w, SX4))); } };");

// ---- ドム版
rep("    for (let y = -2; y <= 11; y += 0.25) row(y, 24.8, (x, w) => (y < -0.8 ? 'k' : face(x, w, 14.4)));", "    for (let y = -2; y <= 11; y += 0.25) row(y, CH4 - 1.4, (x, w) => (y < -0.8 ? 'k' : face(x, w, SX4 * 0.9)));");
rep("    const RIM_Y = 10, HEM_Y = 31.5, APEX_Y = 18, sk = (y) => 31.5 + (y - RIM_Y) * 0.381, nh = (y) => (y - APEX_Y) * (8 / 13.5);",
  "    const RIM_Y = 10, RIM_W = CH4 + 5.8, HEM_Y = 30.5, APEX_Y = 17.5, sk = (y) => (y <= 22 ? RIM_W + (y - RIM_Y) * (36.2 - RIM_W) / (22 - RIM_Y) : 36.2 + (y - 22) * 0.3), nh = (y) => (y - APEX_Y) * (8 / 13);");

// ---- ザク版
rep("    const COL_Y = 17.5, COL_W = 30.5, BASE_Y = 22, TIP_Y = 39, BASE_W = 36.6, R0 = 4.0;", "    const COL_Y = 17.5, COL_W = 30.5, BASE_Y = 22, TIP_Y = 37.5, BASE_W = 36.6, R0 = 4.0, dX = CH4 - CH4_V43;");
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 23, () => 'k');", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 3.2, () => 'k');");
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 16.8, (x, w) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k'));", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 9.4, (x, w) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k'));");
rep("cx = s * (a * a * 20.6 + 2 * a * t * 32.2 + t * t * 25.4),", "cx = s * (a * a * (20.6 + dX) + 2 * a * t * (32.2 + dX) + t * t * (25.4 + dX * 0.5)),");
rep("        const tx = s * (2 * a * 11.6 + 2 * t * -6.8),", "        const tx = s * (2 * a * 11.6 + 2 * t * (-6.8 - dX * 0.5)),");

// ---- ジオング版
rep("row(y, w, (x) => (y > 2.8 ? 'k' : face(x, w, 16))); }", "row(y, w, (x) => (y > 2.8 ? 'k' : face(x, w, SX4))); }");
rep("    for (let y = 4; y <= 14.5; y += 0.25) row(y, 18.2, (x, w) => {", "    for (let y = 4; y <= 14.5; y += 0.25) row(y, CH4 * 0.695, (x, w) => {");

// ---- 胴の本体（bell と共通部）
rep("const torso4 = (style = 'bell') => {\n", "const torso4 = (style = 'bell', CH4 = CH4_DEF) => {\n  const k4 = CH4 / CH4_V43, SX4 = 16 * k4, GR4 = 17.5 * k4, kc = (CH4 - 8.2) / 18, LVa = Math.round(5.5 * k4), LVb = Math.round(13.5 * k4);\n");
rep("polyFill(G, Q([[s * 7, -32], [s * 12, -53], [s * 22, -46], [s * 25, -31]]),", "polyFill(G, Q([[s * 7, -32], [s * (7 + 5 * kc), -53], [s * (7 + 15 * kc), -46], [s * (7 + 18 * kc), -31]]),");
rep("  const FL0 = -12, BASE_Y = 24, TIP_Y = 39, BASE_W = 36.6, K = (BASE_W - CH4) / (BASE_Y - FL0);", "  const FL0 = -12, BASE_Y = 22.6, TIP_Y = 37.5, BASE_W = 36.6, K = (BASE_W - CH4) / (BASE_Y - FL0);");
rep("    const w = hwAt(y), fw = flank(y), sx = 16 * fw / CH4;", "    const w = hwAt(y), fw = flank(y), sx = SX4 * fw / CH4;");
rep("      else if (y < FL0 && Math.abs(x) > 17.5 && Math.abs(x) < CH4 - 3.2 &&", "      else if (y < FL0 && Math.abs(x) > GR4 && Math.abs(x) < CH4 - 3.2 &&");
rep("for (const [dx, dy] of [[33.6, -28], [35.1, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');", "for (const [dx, dy] of [[CH4 + 7.4, -28], [CH4 + 8.9, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');");
rep("for (let x = 5.5; x <= 13.5; x += 0.25) P(G, X(s * x), Y(y), y < -26.2 || y > -13.8 || x < 6.2 || x > 12.8 ? 'm' :", "for (let x = LVa; x <= LVb; x++) P(G, X(s * x), Y(y), y < -26.2 || y > -13.8 || x === LVa || x === LVb ? 'm' :");

// ---- build4：胸の半幅と手の左右を変種として渡せるように（既定の絵は変えない）
rep("torso: P7(o.torso ? torso4(o.torso) : TORSO4),", "torso: P7(o.torso || o.torsoCH ? torso4(o.torso || 'bell', o.torsoCH || CH4_DEF) : TORSO4),");
rep("arms: P7(arms4(saber, 'main')),", "arms: P7(arms4(saber, 'main', !!o.handFlip)),");
rep("function arms4(sb, only = 'all') {", "function arms4(sb, only = 'all', handFlip = false) {");
rep("    for (const [o, th, L1, L2] of [[-10.5, -0.3, 11, 11], [-3.5, -0.1, 13, 13], [3.5, 0.1, 13, 13], [10.5, 0.3, 10.5, 10]]) {",
  "    // 第44稿：handFlip＝左右を入れ替えた手（親指が内）。FB「掌は左右の腕に逆についてない？」の見比べ用。既定（false）が解剖学的に正しい向き＝掌を正面へ向け指を下へ垂らすと親指は外\n    const hs = handFlip ? -1 : 1;\n    for (const [o, th, L1, L2] of [[-10.5, -0.3, 11, 11], [-3.5, -0.1, 13, 13], [3.5, 0.1, 13, 13], [10.5, 0.3, 10.5, 10]].map(([a, b, c, e]) => [hs * a, hs * b, c, e])) {");
rep("    if (clench) finger(at(6 * HP, -11.5 * HP), -0.35, 7 * HF, 0.55, 8 * HF);\n    else finger(at(6 * HP, -11.5 * HP), -1.05, 7 * HF, -0.45, 7 * HF);",
  "    if (clench) finger(at(6 * HP, -11.5 * HP * hs), -0.35 * hs, 7 * HF, 0.55 * hs, 8 * HF);\n    else finger(at(6 * HP, -11.5 * HP * hs), -1.05 * hs, 7 * HF, -0.45 * hs, 7 * HF);");
rep("export const GAIKA2_DOM = build4(", "export const gaika2With = (o = {}) => build4({ tag: '-x', ...o });   // 第44稿：候補の見比べ用（torso／torsoCH／handFlip）\nexport const GAIKA2_DOM = build4(");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH44_OK');
