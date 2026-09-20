// FB（2026-09-20 19:51）
//   ①蝕刃「ビジュアルいい！きちんとしたサーベルなのに、不気味さが感じられる」＝方向は⭐採用
//   ②「肩のプロテクターがうるささがある。もっとすっきりさせて」（第31稿・第35稿に続き三度目）
//   ③「顔と頭部は概ねよい。ヒーロー風ではなくモビルスーツ風なのがよい。ただもっとモビルスーツよりに。一番気になるのが頭部のうえの金色の部分。機械としての役割もわからないし、どうももやもやする。
//      顔や頭部はキャラの印象を決定する最重要ビジュアル。アイデアは複数出して、写真で比較できるようにして」
// 読み：③頭の上の金＝冠の牙五本＋鉢の中心の金一筋（篠垂）＝どちらも兜の飾りで機械の役割が無い → 機械の部品（役割が一目で分かるもの）に読み替える。顔（庇・モノアイの溝・吻・吹返し・動力パイプ）は据え置き。
//       ②肩当てに残っている線＝金の上縁・縦三色の帯・釣鐘の裾 → 段階的に減らした版を並べる。位置（肩の関節の真上）は据え置き。
// 作り：{ head: { top: 'none'|'blade'|'side'|'cross'|'array'（外した案＝'crest'|'third'）, eye:'eclipse', … } }／{ shoulder: { edge:'gold'|'steel'|'none', bands:false, flare, topW, scale, hide } }。どちらも省略すれば従来どおり（HEAD4 は head4() の結果＝画素一致）。既定は不変。
// 私の推し＝肩当て { edge:'none', bands:false, flare:5, topW:9 }・頭 { top:'blade' }。渡したもの＝0920/２２（写真＋ブラウザのページ二つ）。実測＝頭の案で変わる画素はモノアイの溝より上だけ（eye は眼も）・他の部位と rig は画素一致・既存候補 15 種と既定のハッシュ不変。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };

// ---- 頭：IIFE を関数にして、頭頂の部品を差し替えられるようにする
rep("const HEAD4 = (() => {\n  const G = g(HEAD4_W, HEAD4_H), X = (x) => x + 26, Y = (y) => y + HEAD4_OY;",
  "// 頭頂の部品（第53稿の検討）：top＝'crown' 従来（金の冠の牙＋鉢の金一筋）／'none' 外すだけ／'blade' 指揮官のブレードアンテナ／'cross' 十字のモノアイ軌条／'side' 片側の通信アンテナ／'array' 三本の刃の列。外した案＝'crest' 鶏冠（正面からは煙突か棘）・'third' 第三の眼（帽章に見える）・cross の frame:true（扉に見える）\n" +
  "const headTop4 = (G, X, Y, top, ho) => {\n" +
  "  const box = (x0, y0, x1, y1, col) => { for (let y = y0; y <= y1; y += 0.25) for (let x = x0; x <= x1; x += 0.25) { const c = typeof col === 'function' ? col(x, y) : col; if (c) P(G, X(x), Y(y), c); } };\n" +
  "  const blade = (bx, by, tx, ty, w0, w1, cl = 's', cr = 'f') => { for (let u = 0; u <= 1; u += 0.004) { const cx = bx + (tx - bx) * u, cy = by + (ty - by) * u, hw = w0 + (w1 - w0) * u; for (let x = -hw; x <= hw; x += 0.25) P(G, X(cx + x), Y(cy), x < 0 ? cl : cr); } };\n" +
  "  if (top === 'blade') {   // 額の台座から立つ一本の刃＝指揮官機の通信アンテナ。金一筋のあった中心線を、そのまま頭の上へ伸ばす\n" +
  "    const h = ho.h ?? 14; blade(0, -57, 0, -57 - h, ho.w0 ?? 1.6, 0.45);\n" +
  "    box(-3, -58.2, 3, -53.8, 'k'); box(-2.1, -57.4, 2.1, -54.6, (x) => (x < -0.4 ? 'f' : x < 1.0 ? 'm' : 'j'));\n" +
  "  } else if (top === 'crest') {   // 鉢の中心を前後に走る鶏冠＝センサーの収まる黒鉄の背びれ（ゲルググ／サザビーの文法）。正面からは根が広く上へ細る一枚板、根元に暗いセンサーの窓\n" +
  "    const h = ho.h ?? 12, w0 = ho.w0 ?? 3.4, w1 = ho.w1 ?? 1.3; for (let y = -57 - h; y <= -53.8; y += 0.25) { const u = Math.max(0, Math.min(1, (-57 - y) / h)), hw = w0 + (w1 - w0) * u; for (let x = -hw; x <= hw; x += 0.25) P(G, X(x), Y(y), x < -hw + 1.0 ? 'f' : x > hw - 0.9 ? 'k' : x < 0.2 ? 'm' : 'j'); }\n" +
  "    box(-1.3, -57.6, 1.3, -55.6, 'k'); box(-0.6, -57.0, 0.2, -56.4, 'Q');\n" +
  "  } else if (top === 'cross') {   // モノアイの軌条が額を越えて頭頂まで上がる＝十字の軌条（上を見るための縦の溝）。頭頂は無地\n" +
  "    if (ho.frame) { box(-2.7, -60.6, 2.7, -50.6, (x) => (x < -1.6 ? 'f' : x > 1.6 ? 'm' : 'k')); box(-2.7, -61.5, 2.7, -60.7, (x) => (x < 0 ? 'f' : 'm')); }\n" +
  "    else box(-2.4, -62.4, 2.4, -50.6, (x) => (x > 1.5 ? 'm' : 'k'));   // 溝＝光の当たる奥の壁（右）だけが明るい。枠で囲むと扉に見える\n" +
  "  } else if (top === 'array') {   // 三本の刃＝アンテナの列。冠の「高さのそろわない牙」の律動を、鋼の通信アンテナに読み替える\n" +
  "    for (const [bx, h] of ho.blades || [[-4, 10], [0, 13.5], [4, 8]]) blade(bx, -57, bx, -57 - h, 1.1, 0.4);\n" +
  "    box(-6.4, -58.2, 6.4, -53.8, 'k'); box(-5.5, -57.4, 5.5, -54.6, (x) => (x < -1.5 ? 'f' : x < 2.5 ? 'm' : 'j'));\n" +
  "  } else if (top === 'third') {   // 額の上の横の溝＝上方を見張るサブセンサー（第三の眼）。灯は主のモノアイと反対側＝二方向を同時に見ている\n" +
  "    const dx = ho.dotX ?? 1.2; box(-4.4, -60.0, 4.4, -59.4, (x) => (x < 0 ? 'f' : 'm')); box(-4.4, -59.2, 4.4, -57.0, 'k'); box(dx, -58.2, dx + 1.2, -57.8, 'r'); box(dx, -58.2, dx + 0.2, -57.8, 'A');\n" +
  "  } else if (top === 'side') {   // 鉢の片側に台座と一本の刃＝通信アンテナ。左右非対称。既定は画面左（骸華の右）＝画面右は背景の柱のすぐ脇で刃が柱に溶ける\n" +
  "    const h = ho.h ?? 15, sx = ho.sx ?? -1; blade(sx * 10.9, -56.5, sx * (10.9 + (ho.lean ?? 1.8)), -56.5 - h, ho.w0 ?? 1.3, 0.4, sx > 0 ? 's' : 's', 'f');\n" +
  "    box(Math.min(sx * 8.4, sx * 13.2), -57.2, Math.max(sx * 8.4, sx * 13.2), -52.2, 'k'); box(Math.min(sx * 9.2, sx * 12.4), -56.4, Math.max(sx * 9.2, sx * 12.4), -53.0, (x) => (x * sx < 10.2 ? 'f' : 'm'));\n" +
  "  }\n" +
  "};\n" +
  "const head4 = (ho = {}) => {\n  const top = ho.top || 'crown';\n  const G = g(HEAD4_W, HEAD4_H), X = (x) => x + 26, Y = (y) => y + HEAD4_OY;");
rep("  for (const [bx, h] of [[-8.8, 4.6],", "  if (top === 'crown') for (const [bx, h] of [[-8.8, 4.6],");
rep("  for (let y = -61.5; y <= -52; y += 0.25) for (let x = -1.15; x <= 1.15; x += 0.25)", "  if (top !== 'crown') headTop4(G, X, Y, top, ho);\n  if (top === 'crown') for (let y = -61.5; y <= -52; y += 0.25) for (let x = -1.15; x <= 1.15; x += 0.25)");
{ const i = t.indexOf('const head4 = (ho = {}) => {'), j = t.indexOf('\n})();', i); if (i < 0 || j < 0) throw new Error('HEAD4_END_NOT_FOUND'); t = t.slice(0, j) + '\n};\nconst HEAD4 = head4();' + t.slice(j + '\n})();'.length); }

// ---- 肩当て：線を減らす口
rep("const shoulder = (s) => {", "const shoulder = (s, so = null) => {   // so＝{ edge:'gold'|'steel'|'none', bands:false, flare, topW, scale }（第53稿の検討：すっきりさせる口。null なら従来どおり）");
rep("  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;", "  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;\n  if (so && so.hide) return R(G);   // 参考＝肩当てを外した姿（下の関節が見える）");
rep("    const u = (y + 13) / 23, w = 8 + 8.5 * Math.pow(u, 0.72), sk = s * 2.6 * u;",
  "    const u = (y + 13) / 23, w = (so?.topW ?? 8) + (so?.flare ?? 8.5) * Math.pow(u, 0.72), sk = s * (so?.skew ?? 2.6) * u, sc = so?.scale ?? 1;");
rep("      if (y < -11.9) c = Math.abs(v) > 0.62 ? 'k' : v < 0 ? 'Y' : 'y';\n      else if (y > 8.6) c = 'k';\n      else c = Math.abs(v) > 0.93 ? 'k' : v < -0.58 ? 'm' : v < 0.18 ? 'j' : 'k';\n      P(G, X(x + sk), Y(y), c);",
  "      if (y < -11.9) c = Math.abs(v) > 0.62 ? 'k' : so && so.edge === 'steel' ? (v < 0 ? 'f' : 'm') : so && so.edge === 'none' ? (v < 0 ? 'm' : 'j') : v < 0 ? 'Y' : 'y';\n      else if (y > 8.6) c = 'k';\n      else if (so && so.bands === false) c = Math.abs(v) > 0.93 ? 'k' : v < -0.78 ? 'm' : 'j';\n      else c = Math.abs(v) > 0.93 ? 'k' : v < -0.58 ? 'm' : v < 0.18 ? 'j' : 'k';\n      P(G, X((x + sk) * sc), Y(y * sc), c);");
rep("  DISC(G, X(-3.6), Y(-47.7), 3.5, 'r'); DISC(G, X(-3.6), Y(-47.7), 2.7, 'A'); DISC(G, X(-3.9), Y(-48), 1.2, 'W');",
  "  if (ho.eye === 'eclipse') { DISC(G, X(-3.6), Y(-47.7), 3.5, 'r'); DISC(G, X(-3.6), Y(-47.7), 2.8, 'A'); DISC(G, X(-3.6 + (ho.eyeDx ?? 0.5)), Y(-47.7 + (ho.eyeDy ?? -0.5)), ho.eyeR ?? 1.7, 'k'); }   // 蝕のモノアイ：芯が黒く、縁だけが灼ける（蝕刃・掌蝕と同じ形）\n" +
  "  else DISC(G, X(-3.6), Y(-47.7), 3.5, 'r'), DISC(G, X(-3.6), Y(-47.7), 2.7, 'A'), DISC(G, X(-3.9), Y(-48), 1.2, 'W');");
rep("head: P7(HEAD4), shldL: P7(shoulder(-1)), shldR: P7(shoulder(1))", "head: P7(o.head ? head4(o.head) : HEAD4), shldL: P7(shoulder(-1, o.shoulder || null)), shldR: P7(shoulder(1, o.shoulder || null))");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('HEAD_SHOULDER_PATCH_OK');
