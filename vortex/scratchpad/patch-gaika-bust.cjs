// FB（2026-09-20 20:56）
//   ①「肩のプロテクターは５で。ただワンアクセントつけて。色ではなくて形状で」
//   ②「プロテクターの位置を身体の中心線に少し寄せて。それで完全に肩の駆動部品が隠れる」
//   ③「頭部は3か6だが、もっとよいアイデア出せるはず。創造して。蒼神骸華のテーマである『静かに間違って見える』を盛り込んで」＋途中の追記「試して外した鶏冠と枠つきの十字もなかなかよい。アイデア創造の参考に」
//   ④「顔の両脇の深紅の板の金の縁どり…胸のプロテクターの部品であることがわかったが、兜というよりはヒーロー風に見える。ガンダムは機能美を追求しているからこそ武骨さのなかにかっこよさがある。『静かに間違って見える』を盛り込んで。修正して」
// 読み：④「深紅の板＋金の縁どり」は二つの部品の重なり＝胴の「深紅の高い襟」（torso4）と、頭の頬当て（第33稿の吹返し）の外縁の金。深紅の面と金の線と上へ尖る輪郭がヒーローの記号 → 黒鉄の低い首の装甲＋金を外す。
//       深紅は「面」でなく、頭と装甲のすき間から漏れる細い光として残す（蝕刃・掌蝕と同じ＝光は縁にしか無い）。
//       ②関節の円盤は (CH4+7.4, −28) 半径 6.6＝x 24.8〜38。肩当て 5 の内の縁は x≈29.8 → 円盤の内側が 5 画素のぞいていた。
// 作り：{ shoulder: { dx, accent:'chamfer'|'fin'|'spike'|'notch', cut } }／{ collar: 'none' | { seam, top, lean } }／{ head: { cheek:'steel', top:'mast'|'saku'|'gaze' … } }。どれも省略すれば従来どおり。既定は不変。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- 肩当て：中心へ寄せる（rig）＋形のアクセント
rep("{ role: 'rack', tex: 'shldL', ox: -39, oy: -31, origin: [0.5, 0.5] }, { role: 'rack', tex: 'shldR', ox: 39, oy: -31, origin: [0.5, 0.5] },",
  "{ role: 'rack', tex: 'shldL', ox: -(39 - (o.shoulder?.dx ?? 0)), oy: -31, origin: [0.5, 0.5] }, { role: 'rack', tex: 'shldR', ox: 39 - (o.shoulder?.dx ?? 0), oy: -31, origin: [0.5, 0.5] },");
rep("      P(G, X((x + sk) * sc), Y(y * sc), c);",
  String.raw`      const ac = so && so.accent, od = w - v * w;   // od＝外の縁からの距離。形のアクセントは一つだけ（色は足さない）
      if (ac === 'chamfer' && od + (y + 13) < (so.cut ?? 7)) continue;                          // 上の外の角を斜めに落とす（面取り＝避弾の傾斜）
      if (ac === 'chamfer' && od + (y + 13) < (so.cut ?? 7) + 1.3 && s < 0) c = 'm';            // 光の当たる側（画面左）の斜面だけ明るい
      if (ac === 'notch' && 10 - y < (so.cut ?? 5) - Math.abs(x) * 0.9) continue;               // 裾の中央を逆 V に切り欠く（腕を振り上げる逃げ）
      P(G, X((x + sk) * sc), Y(y * sc), c);`);
rep("  OUTLINE(G);\n  return R(G);\n};\n\n// 有線の手（armR・深度11）",
  String.raw`  if (so && (so.accent === 'fin' || so.accent === 'spike')) {   // fin＝上の縁が外の角へ向かって跳ね上がる／spike＝上の縁の外寄りに短い棘が一本
    const sc = so.scale ?? 1, w0 = so.topW ?? 8, r = so.cut ?? (so.accent === 'fin' ? 6 : 7);
    for (let yy = -13 - r; yy < -12.5; yy += 0.25) { const tt = (-13 - yy) / r;
      const [v0, v1] = so.accent === 'fin' ? [Math.max(0, tt), 1] : [0.42 + 0.5 * tt, 0.98 - 0.02 * tt];
      if (v1 < v0) continue;
      for (let v = v0; v <= v1; v += 0.02) P(G, X(s * v * w0 * sc), Y(yy * sc), s < 0 && v > v1 - 0.12 ? 'm' : 'j'); }
  }
  OUTLINE(G);
  return R(G);
};

// 有線の手（armR・深度11）`);

// ---- 胴：深紅の高い襟 → 黒鉄の低い首の装甲（＋すき間の灯）
rep("const torso4 = (style = 'bell', CH4 = CH4_DEF, opt = {}) => {",
  String.raw`// 頬当て（頭の吹返し）の外縁の x。首の装甲の「すき間の灯」をこの線のすぐ外へ置くために、胴と頭で同じ式を使う
const CHEEK4_X1 = (y) => 15.8 - ((y + 49.5) / 13.5) * 7.8;
// 首の装甲（第53稿の検討）：黒鉄の低い板。上端は頭の鉢の下の縁まで＝顔より高く尖らない。外の面は上へ行くほど内へ傾く（襟は外へ開くもの＝その逆）。
//   seam＝頬当てのすぐ外に沿う細い深紅（頭と装甲のすき間から漏れる灯＝光は縁にしか無い）。false で灯なし
const collarGuard4 = (G, X, Y, kc, co) => {
  const c = typeof co === 'object' ? co : {}, lean = c.lean ?? 3.2, seam = c.seam ?? 'R', seamW = c.seamW ?? 1.5, xo = 7 + 18 * kc + (c.out ?? 1.2);
  for (const s of [-1, 1]) for (let top = s > 0 ? c.topR ?? c.top ?? -45.5 : c.top ?? -45.5, y = top; y <= -30.5; y += 0.25) {   // topR＝骸華の左（画面右）だけ高さを変える口
    const u = (y - top) / (-30.5 - top), x1 = xo - lean * (1 - u), yt = y - top;
    for (let x = 6; x <= x1; x += 0.25) {
      const dIn = x - (y <= -36 ? CHEEK4_X1(y) : CHEEK4_X1(-36)) - 1.0, dOut = x1 - x;   // dIn＝頭の輪郭（頬当ての外縁＋輪郭 1）からの距離
      let ch = yt < 1.0 ? (s < 0 ? 'f' : 'm') : dOut < 1.2 ? (s < 0 ? 'm' : 'k') : 'j';
      if (seam && dIn >= 0 && dIn < seamW && y <= -33) ch = seam;
      P(G, X(s * x), Y(y), ch);
    }
  }
};
const torso4 = (style = 'bell', CH4 = CH4_DEF, opt = {}) => {`);
rep("  for (const s of [-1, 1]) polyFill(G, Q([[s * 7, -32], [s * (7 + 5 * kc), -53],",
  "  if (opt.collar && opt.collar !== 'none') collarGuard4(G, X, Y, kc, opt.collar);\n  if (!opt.collar) for (const s of [-1, 1]) polyFill(G, Q([[s * 7, -32], [s * (7 + 5 * kc), -53],");
rep("torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.torsoOpt || (o.torso ? {} : ZAKU2_DEF)))",
  "torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.collar ? { ...(o.torsoOpt || (o.torso ? {} : ZAKU2_DEF)), collar: o.collar } : o.torsoOpt || (o.torso ? {} : ZAKU2_DEF)))");

// ---- 頭：頬当ての金の縁 → 鋼
rep("v > 0.93 ? (s < 0 ? 'Y' : 'y') : v < 0.18 ? 'k' : s < 0 ? 'm' : 'j'); }",
  "v > 0.93 ? (ho.cheek === 'steel' ? (s < 0 ? 'f' : 'j') : s < 0 ? 'Y' : 'y') : v < 0.18 ? 'k' : s < 0 ? 'm' : 'j'); }");

// ---- 参考：眼が縦の軌条を昇った瞬間（行動の種を写真で見せるための口。既定の経路は式を変えない＝画素一致）
rep("  else DISC(G, X(-3.6), Y(-47.7), 3.5, 'r'), DISC(G, X(-3.6), Y(-47.7), 2.7, 'A'), DISC(G, X(-3.9), Y(-48), 1.2, 'W');",
  "  else if (ho.eyeAt) { const [ex, ey] = ho.eyeAt; DISC(G, X(ex), Y(ey), 3.5, 'r'); DISC(G, X(ex), Y(ey), 2.7, 'A'); DISC(G, X(ex - 0.3), Y(ey - 0.3), 1.2, 'W'); }\n  else DISC(G, X(-3.6), Y(-47.7), 3.5, 'r'), DISC(G, X(-3.6), Y(-47.7), 2.7, 'A'), DISC(G, X(-3.9), Y(-48), 1.2, 'W');");

// ---- 頭頂の新案（「静かに間違って見える」）
rep("  } else if (top === 'side') {",
  String.raw`  } else if (top === 'mast') {   // 蝕の軌条：モノアイの溝が額を越え、頭の上まで枠ごと立ち上がる（枠つきの十字＋鶏冠＋刃）。一目では刃のアンテナ・二度見で芯が黒い溝＝眼が頭の外まで昇れる軌条
    const h = ho.h ?? 9, yT = -62 - h, o0 = ho.w0 ?? 2.7, o1 = ho.w1 ?? 1.6, yK = ho.yK ?? -60, ex = ho.ex ?? 0;   // yK＝ここから上が細る（鶏冠の形にするなら w0 3.4・w1 1.3・yK −57）
    for (let y = yT; y <= -50.6; y += 0.25) { const uu = y < yK ? (yK - y) / (yK - yT) : 0, ow = o0 + (o1 - o0) * uu, iw = Math.max(0.55, ow - 1.1);
      for (let x = -ow; x <= ow; x += 0.25) P(G, X(ex + x), Y(y), y < yT + 0.9 ? (x < 0 ? 'f' : 'm') : x < -iw ? 'f' : x > iw ? 'm' : 'k'); }
  } else if (top === 'sunk') {   // 溝から生える刃（3＋5）：十字の軌条の上端から、台座なしで刃が立つ＝眼と刃が同じ一本の溝を使っている。一目では刃のアンテナ・二度見で「眼の通り道から生えている」
    const ex = ho.ex ?? 0; box(ex - 2.4, -62.4, ex + 2.4, -50.6, (x) => (x > ex + 1.5 ? 'm' : 'k'));
    blade(ex, ho.y0 ?? -59.5, ex, -57 - (ho.h ?? 14), ho.w0 ?? 1.3, 0.45);
  } else if (top === 'gaze') {   // 視線に従う刃：額に横の軌条、刃はその上をモノアイの真上まで寄っている（眼が動けば刃も動く）。中心線から外れた一本
    const ex = ho.ex ?? -3.6, h = ho.h ?? 13;
    box(-9.5, -57.0, 9.5, -56.0, 'k'); box(-9.5, -57.8, 9.5, -57.2, (x) => (x < 0 ? 'f' : 'm'));
    blade(ex, -57, ex, -57 - h, ho.w0 ?? 1.5, 0.45);
    box(ex - 2.6, -58.6, ex + 2.6, -54.8, 'k'); box(ex - 1.8, -57.8, ex + 1.8, -55.6, (x) => (x < ex - 0.4 ? 'f' : x < ex + 0.9 ? 'm' : 'j'));
  } else if (top === 'side') {`);
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('BUST_PATCH_OK');
