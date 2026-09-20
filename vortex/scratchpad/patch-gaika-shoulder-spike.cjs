// FB（2026-09-21 01:17）「#4 昇る蝕にしよう。次の修正。#肩のプロテクターについて。蒼神骸華の左肩を、跳ね上げではなく棘にして。
//   さらに左肩のプロテクターの色を変えて。色の候補は真紅、金、銀、白、緑、黄色など。プレイヤーがひと目見て印象に残るように。
//   ただ、蒼神骸華の格は落とさないように。あなたのアイデアに期待する。」
// 読み：変えるのは骸華の左肩（＝画面の右・s>0）の肩当てだけ。形を「跳ね上げ」から「棘」へ、色を機体と別の一色へ。
//       右肩（画面左・面取り）と、それ以外は 1 画素も触らない。
// 作り（どれも省略すれば従来どおり・既定は不変）：
//   ①shoulder.tint＝色の口。'bone' などの名前か 3 文字（地・光の当たる縁・陰）。配列なら [画面左, 画面右]＝[null,'bone'] で左肩だけ。
//     面は一枚・色は一色・線は足さない（過去の学び＝格を上げるのは線の少なさ）。陰は外寄り（v > shadeV）と裾の上だけ。
//   ②shoulder.accent:'spikes'＋shoulder.spikes＝棘を自由に置く口＝[[根の外向き x, 根の y, 角度（外向き水平＝0°・真上＝90°）, 長さ, 根の半幅, 反り], …]。
//     肩当ての面より先に描く＝根は面の陰に入る（面の上の縁の線が継ぎ目になる）。棘は面と同じ色（一つの鍛造品）。
//   ③shoulder.pad＝テクスチャを上下左右へ同じだけ広げる（origin は中心なので位置は動かない）。'spikes' のときは既定 10。
//   ④前に見せた短い棘（accent:'spike'）と跳ね上げ（'fin'）にも tint が効く。
//   ⑤パレットに a（真紅の漆の地）・h（その陰）・o（緑の地）を足した（既定の絵では使わない）。
//   ⑥shoulder.seam＝棘の根の継ぎ目（面の輪郭に沿う 1 画素を黒く）。棘は面のあとに「面の無い所だけ」へ描く＝どの角度でも継ぎ目が輪郭に沿う
//     （最初は「面の上の縁のすぐ上の 1 行」で引いた → 斜めの棘が宙に浮いて見えたので作り直した）。
//   ⑦shoulder.tintPlate:false＝面は黒鉄のまま・棘だけ色（参考の控えめ版）。
// 私の推し＝色は白骨（'bone'＝s・n・f）／形は大きな一本棘・ほぼ直立 spikes:[[5,-11,80,18,5]]＋seam（resume-gaika-now.mjs の候補 44）。
//   根拠＝①名前の「骸」の一字が初めて面になる（蒼・骸・華）②兵器は目立たない色に塗るのに左肩だけ死装束の白＝「ここを狙え」＝闘いの神の傲り（静かに間違って見える）
//         ③真紅はこの機体の「危険の合図」の色（蝕刃の縁・掌蝕・眼・灼ける縁）＝飾りに使うと合図が読みにくくなる ④最終形態（黒と赤）で真紅は炉の赤に紛れ、白だけが残る。
// 実測（measure-gaika2-shoulder-pop.mjs・等倍・閉じた姿）＝周りとの色の差／明るさの差／機体のほかの場所の同系色 %
//   bone 255.6／147.9／0.91　yellow 270.5／156.7／6.65　gold 197.7／103.0／4.50　crimson 161.0／40.1／10.45　silver 153.2／85.7／5.19　blood 123.4／20.3／4.91　green 92.7／53.0／14.69
//   最終形態でもほぼ同じ順位（bone 270.0／crimson 159.6）。変わる画素は世界 x 23〜51・y −56.5〜−23.5 だけ（check-gaika2-shoulder-diff.mjs・閉と開の両方）。
// 試して外した＝反った棘（グフ型・bend −6＝角に見えて魔物に寄る）／真横の棘（くちばし・最終形態で肩の腕に突き当たる）／二本棘（耳）／細い三本棘（世紀末の雑魚の肩当て＝格が落ちる）
//   斜めの棘（62°・45°）は等倍で後ろの月牙の白銀の刃と紛れる＝ほぼ直立がいちばん輪郭が出る（後ろが蒼の装甲の暗い面）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ⑤パレット
rep("  e: '#1b3a30', E: '#5fbf95',",
  "  a: '#b3202e', h: '#4d0a16', o: '#2e7d5b',                               // 左肩の肩当ての検討：真紅の漆の地 a と その陰 h／緑の地 o（既定の絵では使わない）\n  e: '#1b3a30', E: '#5fbf95',");

// ---- ①色の表
rep("const shoulder = (s, so = null) => {",
  "const SHLD_TINT = { crimson: 'aRr', blood: 'rRh', bone: 'snf', silver: 'fsm', gold: 'YGy', green: 'oEe', yellow: 'GWY' };   // 左肩だけ色を変える口＝[地, 光の当たる縁, 陰]\nconst shoulder = (s, so = null) => {");

// ---- ③テクスチャの余白と ①色の解決
rep("  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;",
  "  const tn0 = so && so.tint ? (Array.isArray(so.tint) ? so.tint[s < 0 ? 0 : 1] : so.tint) : null, tn = tn0 ? SHLD_TINT[tn0] || tn0 : null;   // 色の口＝名前か 3 文字（地・光・陰）。配列なら [画面左, 画面右]\n" +
  "  const pad = so?.pad ?? (so && so.accent === 'spikes' ? 10 : 0);   // 棘のぶんテクスチャを四方へ同じだけ広げる（origin は中心＝位置は動かない）\n" +
  "  const G = g(SHLD_W + 2 * pad, SHLD_H + 2 * pad), X = (x) => x + 24 + pad, Y = (y) => y + 19 + pad;");

// ---- ②棘を自由に置く口は ④ の置換の中（面と 前の短い棘のあと・輪郭づけの前）へ入れる

// ---- ①面の色
rep("      P(G, X((x + sk) * sc), Y(y * sc), c);\n    }\n  }\n  if (so && (so.accent === 'fin' || so.accent === 'spike')) {",
  "      if (tn && so.tintPlate !== false && c !== 'k') c = c !== 'j' ? tn[1] : v > (so.shadeV ?? 0.45) || y > 6 ? tn[2] : tn[0];   // 色の口：面は一枚・色は一色（陰は外寄りと裾の上だけ）\n" +
  "      P(G, X((x + sk) * sc), Y(y * sc), c);\n    }\n  }\n  if (so && (so.accent === 'fin' || so.accent === 'spike')) {");

// ---- ④前の短い棘と跳ね上げにも色 ＋ ②棘を自由に置く口（面のあと・輪郭づけの前）
rep("P(G, X(s * v * w0 * sc), Y(yy * sc), s < 0 && v > v1 - 0.12 ? 'm' : 'j'); }\n  }\n  OUTLINE(G);",
  "P(G, X(s * v * w0 * sc), Y(yy * sc), tn ? ((s > 0 ? v < v0 + 0.14 : v > v1 - 0.14) ? tn[1] : (s > 0 ? v > v1 - 0.3 : v < v0 + 0.3) ? tn[2] : tn[0]) : s < 0 && v > v1 - 0.12 ? 'm' : 'j'); }\n  }\n" +
  "  if (so && so.accent === 'spikes') {   // 棘を自由に置く口＝so.spikes＝[[根の外向き x, 根の y, 角度（外向き水平＝0°・真上＝90°）, 長さ, 根の半幅, 反り], …]。面のあとに 面の無い所だけへ描く＝根は面の陰に入る\n" +
  "    const sc = so.scale ?? 1, LX = -0.5 * s, LY = -0.62, plate = G.map((r) => r.map((ch) => ch !== '.')), isP = (x, y) => !!(plate[y] && plate[y][x]);   // so.seam＝棘の根の継ぎ目（面の輪郭に沿う 1 画素を黒く＝棘が「面に据えた別の部品」と読める）\n" +
  "    for (const [bx, by, deg, len, hw, bend = 0] of so.spikes || []) {\n" +
  "      const a = deg * Math.PI / 180, ux = Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux;\n" +
  "      for (let tt = 0; tt <= 1; tt += 0.008) { const w = hw * (1 - tt) + 0.35, cx = bx + ux * len * tt + nx * bend * tt * tt, cy = by + uy * len * tt + ny * bend * tt * tt;\n" +
  "        for (let e = -w; e <= w; e += 0.2) { const lit = (nx * LX + ny * LY) * e > 0, c = lit ? (Math.abs(e) > w * 0.5 ? (tn ? tn[1] : 'm') : (tn ? tn[0] : 'j')) : (tn ? tn[2] : 'j');\n" +
  "          const rx = Math.round(X(s * (cx + nx * e) * sc)), ry = Math.round(Y((cy + ny * e) * sc)); if (!G[ry] || rx < 0 || rx >= G[0].length || isP(rx, ry)) continue;\n" +
  "          G[ry][rx] = so.seam && (isP(rx + 1, ry) || isP(rx - 1, ry) || isP(rx, ry + 1) || isP(rx, ry - 1)) ? (so.seam === true ? 'k' : so.seam) : c; } }\n" +
  "    }\n" +
  "  }\n" +
  "  OUTLINE(G);");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_SHOULDER_SPIKE_OK');
