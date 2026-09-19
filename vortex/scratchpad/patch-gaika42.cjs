// 第42稿のパッチ（一度だけ当てる）。node patch-gaika42.cjs
//   依頼（09-19 17:59）「現在の実装案はノイエ・ジール版。他に、質問で記載されていたドム版・ザク版・ジオング版を作成してデスクトップにおとして」
//   ＝腰の文法だけが違う三版を足す（胸・襟・ルーバー・炉の縦筋・関節は四版とも同じ＝腰だけを比べられる）。現行の bell（ノイエ・ジール版）は 1 ドットも変えない
//   裏取り（Wikipedia 日本語版 ドム／ザクII／ジオング・2026-09-19 閲覧）
//     ドム＝決定稿の書き込み「ズングリ・ドッシリスタイル」「頭は小さめ」・胸部／腹部のジェネレーター・ブロック／腰部が別ブロック・スカート・アーマー・「袴のようなもの…『武士』というイメージ」・装甲の内側が赤
//     ザクII＝動力パイプを「わざとむき出し」・腰にパイプの基部
//     ジオング＝腰部スカートが大型化され大推力エンジンが集中・脚は無い
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const uniq = (s) => { const i = src.indexOf(s); if (i < 0 || src.indexOf(s, i + 1) >= 0) throw new Error('not unique: ' + s.slice(0, 70)); return i; };
const rep = (from, to) => { const i = uniq(from); src = src.slice(0, i) + to + src.slice(i + from.length); };

const WAIST4 = [
  "// 第42稿：腰の文法が違う三版（ドム／ザク／ジオング）。胸から上は四版とも同じ。座標は世界（胴の中心が x=0）",
  "function waist4(G, X, Y, style) {",
  "  const chestW = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : 27.6);",
  "  const face = (x, w, sx) => (Math.abs(Math.abs(x) - sx) < 0.5 ? 'k' : x + w < 2.8 ? 'm' : w - x < 1.4 ? 'j' : x < sx ? 'j' : 'k');",
  "  const row = (y, w, col) => { for (let x = -w; x <= w; x += 0.25) { const c = col(x, w); if (c) P(G, X(x), Y(y), c); } };",
  "  const groove = (x, y) => Math.abs(x) > 17.5 && Math.abs(x) < 24.5 && [-25, -22, -19].some((vy) => Math.abs(y - vy) < 0.55);",
  "  const chestRows = (y1) => { for (let y = -40; y <= y1; y += 0.25) { const w = chestW(y); row(y, w, (x) => (y < -33 ? ((x + w) / (2 * w) < 0.3 ? 'm' : 'j') : groove(x, y) ? 'k' : face(x, w, 16))); } };",
  "  const seam = (y0, y1) => { for (let y = y0; y <= y1; y += 0.25) for (let x = -1.5; x <= 1.5; x += 0.25) P(G, X(x), Y(y), x < -0.6 ? 'm' : x <= 0.6 ? (y < 12 ? 'r' : 'k') : 'j'); };",
  "  const rivet = (cy) => { for (let dy = -3.2; dy <= 3.2; dy += 0.25) for (let dx = -3.2; dx <= 3.2; dx += 0.25) { const d = Math.abs(dx) + Math.abs(dy); if (d <= 3.2) P(G, X(dx), Y(cy + dy), d > 2.2 ? 'k' : dx + dy < 0 ? 'Y' : 'y'); } };",
  "  if (style === 'dom') {",
  "    // ドム版＝ズングリ・ドッシリ。胸と腹のジェネレーター・ブロックを同じ太さで通し（絞らない）、袴のように開くスカート・アーマーを重ねる。前は Λ に割れ、装甲の内側は暗い深紅",
  "    chestRows(-2);",
  "    for (let y = -2; y <= 10; y += 0.25) row(y, 26, (x, w) => (y < -0.8 ? 'k' : face(x, w, 15)));",
  "    const RIM_Y = 9, HEM_Y = 33, APEX_Y = 19, sk = (y) => 31.5 + (y - RIM_Y) * 0.381, nh = (y) => (y - APEX_Y) * (8 / 14);",
  "    for (let y = RIM_Y; y <= HEM_Y; y += 0.25) {",
  "      const w = sk(y), px = w * 0.5;",
  "      row(y, w, (x) => {",
  "        if (y > APEX_Y && Math.abs(x) < nh(y)) return null;",
  "        if (y > APEX_Y - 1.5 && Math.abs(x) - Math.max(0, nh(y)) < 1.6) return 'r';",
  "        if (y < RIM_Y + 2.5) return x < 0 ? 'm' : 'j';",
  "        if (y < RIM_Y + 3.5) return 'k';",
  "        if (HEM_Y - y < 1.2) return x < 0 ? 'm' : 'j';",
  "        if (HEM_Y - y >= 3 && HEM_Y - y < 4 && x < px) return 'k';",
  "        return face(x, w, px);",
  "      });",
  "    }",
  "    seam(-6, APEX_Y - 1.5);",
  "  } else if (style === 'zaku') {",
  "    // ザク版＝動力パイプをわざとむき出しにする。腰は影に沈む太い幹、両脇を太い蛇腹の管が胸の下から襟へ回り込んで輪郭を埋める。下は襟と浅い V の裾（bell と同じ要）",
  "    const COL_Y = 19, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, R0 = 3.5;",
  "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 24, () => 'k');",
  "    for (let y = -3; y <= COL_Y; y += 0.25) row(y, 17.5, (x, w) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k'));",
  "    for (const s of [-1, 1]) {",
  "      let len = 0, prev = null;",
  "      for (let t = 0; t <= 1; t += 0.002) {",
  "        const a = 1 - t, cx = s * (a * a * 21 + 2 * a * t * 33 + t * t * 25.5), cy = a * a * -3 + 2 * a * t * 8 + t * t * 20;",
  "        if (prev) len += Math.hypot(cx - prev[0], cy - prev[1]);",
  "        prev = [cx, cy];",
  "        const tx = s * (2 * a * 12 + 2 * t * -7.5), ty = 2 * a * 11 + 2 * t * 12, tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;",
  "        const end = t < 0.07 || t > 0.93, rr = end ? R0 + 0.9 : R0, ring = !end && len % 3.4 < 0.9;",
  "        for (let k = -rr; k <= rr; k += 0.25) {",
  "          const v = (nx * k * LIGHT[0] + ny * k * LIGHT[1]) / rr;",
  "          P(G, X(cx + nx * k), Y(cy + ny * k), Math.abs(k) > rr - 0.6 || ring ? 'k' : v > 0.45 ? 'f' : v > -0.05 ? 'm' : 'j');",
  "        }",
  "      }",
  "    }",
  "    chestRows(-2);",
  "    const colW = (y) => (y <= BASE_Y ? 31 + (y - COL_Y) * (BASE_W - 31) / (BASE_Y - COL_Y) : BASE_W * (TIP_Y - y) / (TIP_Y - BASE_Y));",
  "    const hemD = (x, y) => TIP_Y - Math.abs(x) * (TIP_Y - BASE_Y) / BASE_W - y;",
  "    for (let y = COL_Y; y <= TIP_Y; y += 0.25) { const w = colW(y); row(y, w, (x) => (y < COL_Y + 1.3 ? (x < 0 ? 'm' : 'j') : x < 21 && hemD(x, y) >= 3 && hemD(x, y) < 4 ? 'k' : face(x, w, 21))); }",
  "    seam(-2, TIP_Y - 10);",
  "    rivet(TIP_Y - 6.5);",
  "  } else if (style === 'zeong') {",
  "    // ジオング版＝胸を下へ伸ばして腰を短くし、短い旋回円筒と、大型化したスカートの上縁の鍔（つば）で繋ぐ。細さは少し残るが人体でなく旋回軸",
  "    chestRows(0);",
  "    for (let y = 0; y <= 5; y += 0.25) { const w = 27.6 - y; row(y, w, (x) => (y > 3.8 ? 'k' : face(x, w, 16))); }",
  "    for (let y = 5; y <= 15; y += 0.25) row(y, 19, (x, w) => { const v = x / w; return y < 6.4 ? 'k' : v < -0.8 ? 'j' : v < -0.45 ? 'm' : v < 0.25 ? 'j' : 'k'; });",
  "    const fl = (y) => (y < 18 ? 34 + (y - 15) * (5 / 3) : y <= 23 ? 39 : 39 - (y - 23));",
  "    for (let y = 15; y <= 26; y += 0.25) { const w = fl(y); row(y, w, (x) => (y < 16.4 ? (x < 0 ? 'm' : 'j') : y > 24.8 ? 'k' : face(x, w, 21))); }",
  "    seam(-6, 3);",
  "  }",
  "}",
  ""].join('\n');
rep("const torso4 = (style = 'bell') => {\n", WAIST4 + "const torso4 = (style = 'bell') => {\n");
rep("  const G = g(TOR4_W, TOR4_H), X = (x) => x + TOR4_W / 2, Y = (y) => y + TOR4_OY,",
  "  const NEW = style === 'dom' || style === 'zaku' || style === 'zeong', W = NEW ? 88 : TOR4_W;\n  const G = g(W, TOR4_H), X = (x) => x + W / 2, Y = (y) => y + TOR4_OY,");
rep("  for (let y = -40; y <= (style === 'slab' ? 38 : TIP_Y); y += 0.25) {", "  if (!NEW) for (let y = -40; y <= (style === 'slab' ? 38 : TIP_Y); y += 0.25) {");
rep("  for (const s of [-1, 1]) for (const [dx, dy] of [[35, -28], [36.5, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');",
  "  if (NEW) waist4(G, X, Y, style);\n  for (const s of [-1, 1]) for (const [dx, dy] of [[35, -28], [36.5, -6]]) { DISC(G, X(s * dx), Y(dy), 6.6, 'k');");
rep("  // 第21稿：FB「胸の太陽マークは不要。ダサい」",
  "  // 第42稿：幅の広い版でも関節の円盤の見え方を bell と同じに切る（bell はテクスチャの端で x −39〜+38 に切れている）\n  if (NEW) for (let y = -36; y <= 2; y++) for (let x = 39; x <= 44; x++) { P(G, X(x), Y(y), '.'); P(G, X(-x - 1), Y(y), '.'); }\n  // 第21稿：FB「胸の太陽マークは不要。ダサい」");
rep("  for (let y = -6; y <= (style === 'slab' ? 36 : TIP_Y - 10); y += 0.25) for (let x = -1.5;", "  if (!NEW) for (let y = -6; y <= (style === 'slab' ? 36 : TIP_Y - 10); y += 0.25) for (let x = -1.5;");
rep("  if (style !== 'slab') for (let dy = -3.2; dy <= 3.2; dy += 0.25)", "  if (style === 'bell') for (let dy = -3.2; dy <= 3.2; dy += 0.25)");
rep("export const GAIKA2_SLAB = build4({ tag: '-slab', torso: 'slab' });",
  "export const GAIKA2_DOM = build4({ tag: '-dom', torso: 'dom' });       // 第42稿：腰の文法の比較＝ドム版\nexport const GAIKA2_ZAKU = build4({ tag: '-zaku', torso: 'zaku' });    // 同＝ザク版\nexport const GAIKA2_ZEONG = build4({ tag: '-zeong', torso: 'zeong' }); // 同＝ジオング版（現行の GAIKA2＝ノイエ・ジール版）\nexport const GAIKA2_SLAB = build4({ tag: '-slab', torso: 'slab' });");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH42_OK');
