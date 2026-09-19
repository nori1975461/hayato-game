// 第43稿のパッチ（一度だけ当てる）。node patch-gaika43.cjs
//   FB（09-19 18:32・四版すべて確認のうえ）①「どれも胴が少し大きい気がする。4版ともほんの少しだけ面積を小さくして」②「掌も大きすぎ。少し小さく」
//   ①一律の拡縮は 1 ドット幅の線（ルーバーの縞・炉の縦筋）が滲むので、輪郭の寸法だけを詰める。胸の半幅 27.6→CH4=26.2（関節の円盤も 1.4 内へ）・各版の下半分を縦横とも少し詰める。
//     ⚠️扇の付け根（±36・世界 y 22）を覆う幅は死守＝どの版も y 22 で半幅 36 以上。ザク版の襟は第42稿で y 22 の半幅が 34 しかなく付け根が 2px 覗いていた → 襟を上げて直す
//   ②掌と蝕を HP=0.87 倍・指は太さと間隔を掌に合わせ（HP）長さは HF=0.93 倍＝掌が小さくなるぶん指が相対的に長い鉤爪になる
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };

// ---- 共通：胸の半幅
rep("function waist4(G, X, Y, style) {\n", "const CH4 = 26.2;   // 第43稿：胸の半幅（27.6→26.2＝四版共通で胴をほんの少し小さく）\nfunction waist4(G, X, Y, style) {\n");
rep("  const chestW = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : 27.6);", "  const chestW = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * (CH4 - 14) / 4 : CH4);");
rep("  const groove = (x, y) => Math.abs(x) > 17.5 && Math.abs(x) < 24.5 &&", "  const groove = (x, y) => Math.abs(x) > 17.5 && Math.abs(x) < CH4 - 3.2 &&");

// ---- ドム版
rep("    for (let y = -2; y <= 10; y += 0.25) row(y, 26, (x, w) => (y < -0.8 ? 'k' : face(x, w, 15)));", "    for (let y = -2; y <= 11; y += 0.25) row(y, 24.8, (x, w) => (y < -0.8 ? 'k' : face(x, w, 14.4)));");
rep("    const RIM_Y = 9, HEM_Y = 33, APEX_Y = 19, sk = (y) => 31.5 + (y - RIM_Y) * 0.381, nh = (y) => (y - APEX_Y) * (8 / 14);",
  "    const RIM_Y = 10, HEM_Y = 31.5, APEX_Y = 18, sk = (y) => 31.5 + (y - RIM_Y) * 0.381, nh = (y) => (y - APEX_Y) * (8 / 13.5);");

// ---- ザク版
rep("    const COL_Y = 19, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, R0 = 4.0;", "    const COL_Y = 17.5, COL_W = 30.5, BASE_Y = 22, TIP_Y = 39, BASE_W = 36.6, R0 = 4.0;");
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 24, () => 'k');", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 23, () => 'k');");
rep("    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 17.5, (x, w) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k'));", "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 16.8, (x, w) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k'));");
rep("cx = s * (a * a * 21.5 + 2 * a * t * 33.5 + t * t * 26), cy = a * a * -3 + 2 * a * t * 8 + t * t * 20;", "cx = s * (a * a * 20.6 + 2 * a * t * 32.2 + t * t * 25.4), cy = a * a * -3 + 2 * a * t * 7.5 + t * t * 18.5;");
rep("        const tx = s * (2 * a * 12 + 2 * t * -7.5), ty = 2 * a * 11 + 2 * t * 12,", "        const tx = s * (2 * a * 11.6 + 2 * t * -6.8), ty = 2 * a * 10.5 + 2 * t * 11,");
rep("    const colW = (y) => (y <= BASE_Y ? 31 + (y - COL_Y) * (BASE_W - 31) / (BASE_Y - COL_Y) :", "    const colW = (y) => (y <= BASE_Y ? COL_W + (y - COL_Y) * (BASE_W - COL_W) / (BASE_Y - COL_Y) :");

// ---- ジオング版
rep("    chestRows(0);\n    for (let y = 0; y <= 5; y += 0.25) { const w = 27.6 - y; row(y, w, (x) => (y > 3.8 ? 'k' : face(x, w, 16))); }",
  "    chestRows(-1);\n    for (let y = -1; y <= 4; y += 0.25) { const w = CH4 - (y + 1) * 0.9; row(y, w, (x) => (y > 2.8 ? 'k' : face(x, w, 16))); }");
rep("    for (let y = 5; y <= 15; y += 0.25) row(y, 19, (x, w) => { const v = x / w; return y < 6.4 ? 'k' :", "    for (let y = 4; y <= 14.5; y += 0.25) row(y, 18.2, (x, w) => { const v = x / w; return y < 5.4 ? 'k' :");
rep("    const fl = (y) => (y <= 26 ? 31 + (y - 15) * (9 / 11) : 40);\n    for (let y = 15; y <= 27.5; y += 0.25) { const w = fl(y); row(y, w, (x) => (y < 16.4 ? (x < 0 ? 'm' : 'j') : y > 26.2 ? 'k' : y >= 22.6 && y < 23.6 && x < 21 ? 'k' : face(x, w, 21))); }",
  "    const fl = (y) => 30.2 + (Math.min(y, 25) - 14.5) * 0.8;\n    for (let y = 14.5; y <= 26.2; y += 0.25) { const w = fl(y); row(y, w, (x) => (y < 15.9 ? (x < 0 ? 'm' : 'j') : y > 25 ? 'k' : y >= 21.6 && y < 22.6 && x < 21 ? 'k' : face(x, w, 21))); }");
rep("    seam(-6, 3);", "    seam(-6, 2);");

// ---- ノイエ・ジール版（bell）と比較用 slab
rep("  const FL0 = -12, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, K = (BASE_W - 27.6) / (BASE_Y - FL0);", "  const FL0 = -12, BASE_Y = 24, TIP_Y = 39, BASE_W = 36.6, K = (BASE_W - CH4) / (BASE_Y - FL0);");
rep("  const flank = (y) => (style === 'slab' ? 27.6 : 27.6 + Math.max(0, y - FL0) * K);", "  const flank = (y) => (style === 'slab' ? CH4 : CH4 + Math.max(0, y - FL0) * K);");
rep("  const hwAt = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : style === 'slab' ? (y < 22 ? 27.6 :", "  const hwAt = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * (CH4 - 14) / 4 : style === 'slab' ? (y < 22 ? CH4 :");
rep("    const w = hwAt(y), fw = flank(y), sx = 16 * fw / 27.6;", "    const w = hwAt(y), fw = flank(y), sx = 16 * fw / CH4;");
rep("      else if (y < FL0 && Math.abs(x) > 17.5 && Math.abs(x) < 24.5 &&", "      else if (y < FL0 && Math.abs(x) > 17.5 && Math.abs(x) < CH4 - 3.2 &&");
rep("  for (const s of [-1, 1]) for (const [dx, dy] of [[35, -28], [36.5, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');", "  for (const s of [-1, 1]) for (const [dx, dy] of [[33.6, -28], [35.1, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');");

// ---- 掌
rep("    const pm = mkSlab(G, ...at(2, 0), ...at(21, 0));\n    pm.slab(0, 1, (u) => 10 + 5 * Math.pow(u, 0.7),", "    // 第43稿：FB「掌も大きすぎ。少し小さく」＝掌と蝕を HP 倍・指は太さと間隔を掌に合わせ長さは HF 倍\n    const HP = 0.87, HF = 0.93;\n    const pm = mkSlab(G, ...at(2 * HP, 0), ...at(21 * HP, 0));\n    pm.slab(0, 1, (u) => (10 + 5 * Math.pow(u, 0.7)) * HP,");
rep("    pm.slab(0, 0.12, 11.2, goldCol);\n    const C0 = at(12, 0), r0 = 7.5,", "    pm.slab(0, 0.12, 11.2 * HP, goldCol);\n    const C0 = at(12 * HP, 0), r0 = 7.5 * HP,");
rep("      const lim = r0 + 1.0 + (clench ? 1.35 : 1) * bias * (2.2 + 4.4 * Math.pow(Math.abs(Math.sin(a * 3 + 0.6)), 2.2));", "      const lim = r0 + 1.0 * HP + (clench ? 1.35 : 1) * bias * HP * (2.2 + 4.4 * Math.pow(Math.abs(Math.sin(a * 3 + 0.6)), 2.2));");
rep("    DISC(G, C0[0] - dx * 1.4 + nx * 0.9, C0[1] - dy * 1.4 + ny * 0.9, r0, 'k');", "    DISC(G, C0[0] - dx * 1.4 * HP + nx * 0.9 * HP, C0[1] - dy * 1.4 * HP + ny * 0.9 * HP, r0, 'k');");
rep("      mkSlab(G, b0[0], b0[1], j1[0], j1[1]).slab(0, 1, 3.4, bone);\n      mkSlab(G, j1[0], j1[1], t[0], t[1]).slab(0, 1, (u) => 3.1 * (1 - u) + 0.4, claw);\n      DISC(G, j1[0], j1[1], 2.7, 'k'); DISC(G, j1[0], j1[1], 1.5, 'm');",
  "      mkSlab(G, b0[0], b0[1], j1[0], j1[1]).slab(0, 1, 3.4 * HP, bone);\n      mkSlab(G, j1[0], j1[1], t[0], t[1]).slab(0, 1, (u) => 3.1 * HP * (1 - u) + 0.4, claw);\n      DISC(G, j1[0], j1[1], 2.7 * HP, 'k'); DISC(G, j1[0], j1[1], 1.5 * HP, 'm');");
rep("      if (clench) finger(at(21, o), th, L1 * 0.5, th + Math.PI - Math.sign(th) * 0.25, L2 * 0.85);\n      else finger(at(21, o), th, L1, th - Math.sign(th) * 0.6, L2);",
  "      if (clench) finger(at(21 * HP, o * HP), th, L1 * 0.5 * HF, th + Math.PI - Math.sign(th) * 0.25, L2 * 0.85 * HF);\n      else finger(at(21 * HP, o * HP), th, L1 * HF, th - Math.sign(th) * 0.6, L2 * HF);");
rep("    if (clench) finger(at(6, -11.5), -0.35, 7, 0.55, 8);\n    else finger(at(6, -11.5), -1.05, 7, -0.45, 7);", "    if (clench) finger(at(6 * HP, -11.5 * HP), -0.35, 7 * HF, 0.55, 8 * HF);\n    else finger(at(6 * HP, -11.5 * HP), -1.05, 7 * HF, -0.45, 7 * HF);");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH43_OK');
