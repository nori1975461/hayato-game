// FB（2026-09-20 22:07）
//   ①「肩のプロテクターについて。蒼神骸華の右肩は面取り。左肩は跳ね上げ」
//   ②「頭について。4 蝕の軌条で」
//   ③「顔の両脇・首の装甲について。４（4＋すきまの灯）か５（襟なし）で迷っている」
//   ④「月牙の一番下は、繊月・鋼か繊月・深紅か、もっとよいアイデアがないか迷っている」
// 読み：①骸華の視点＝右肩は画面左（s<0）・左肩は画面右（s>0）。形は前回渡した 3（chamfer）と 4（fin）をそのまま左右へ振り分けるだけ（形そのものは変えない）。
//       ②頭は引数だけ（head.top:'mast'）＝コードの変更なし。
//       ③首は前回の 4（collar:{}）と 5（collar:'none'）のあいだを、装甲の高さ（既存の口 collar.top）だけで一段ずつ下げて見比べる＝コードの変更なし。
//       ④鋼と深紅は別々の案ではなく同じ一本の軸の両端（満ち具合 0＝鋼・1＝深紅）＝鋼の繊月を深紅が下の先端から満たしていく「満ちかけの繊月」。
//         行動の種「月が満ちたら皆既が来る」（蝕刃の「蝕が満ちたら斬撃が来る」・頭の「眼が昇ったら来る」と同じ型）。
// 作り：{ shoulder: { accent: ['chamfer','fin'] } }＝[画面左（骸華の右肩）, 画面右（骸華の左肩）]。文字列なら従来どおり左右同じ。既定は不変。
//       { dormantX: { c, fill, fillC, flip, core, coreIn } }＝繊月の象嵌に足した口（下を参照）。省略すれば従来の一色。
// 私の推し＝首 { collar:{ top:-41 } }（低い首の装甲＋灯）・座 { dormantX:{ c:'m', fill:0.3 } }。渡したもの＝0920/２４（build-gaika2-folder24.sh）。
// 実測（measure-gaika2-neck-seat.mjs）＝胴で襟なしから増える画素 4:491（深紅 37）／−41:339（24）／−38:233（16）・繊月は全 106 画素で 0.3 は鋼 82＋深紅 24。
// 試して外した＝flip（位置がずれたように見え副腕の付け根に寄って窮屈）・fillC:'R'（等倍で赤い点が目立つ）。core:'k'（蝕の繊月）は線が二重＝参考として渡した。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- 肩当て：形のアクセントを左右で違える口
rep("  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;",
  "  if (so && Array.isArray(so.accent)) so = { ...so, accent: so.accent[s < 0 ? 0 : 1] };   // 形のアクセントを左右で違える口＝[画面左（骸華の右肩）, 画面右（骸華の左肩）]\n  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;");

// ---- 朔の座：繊月の象嵌に口を足す（省略すれば従来どおり＝c 一色）
//   fill／fillC＝下の先端から灯が満ちた割合と色（鋼の繊月を深紅が満たしていく）／flip＝欠けの向きを逆に（朔をまたいだ月）／core＝芯の色（縁だけが c で残る＝蝕の繊月）
rep("const sakuSeal4 = ({ c = 'm', dd = 3.0, rc = 12.7, thr = 0.4 }) => {",
  "const sakuSeal4 = ({ c = 'm', dd = 3.0, rc = 12.7, thr = 0.4, fill = 0, fillC = 'r', flip = false, core = null, coreIn = 0.9 }) => {\n  const hit = [];");
rep("r = 11.5 * MOON4_K, a = Math.atan2(-2.5, 5.5), ox = Math.cos(a) * dd,",
  "r = 11.5 * MOON4_K, a = Math.atan2(-2.5, 5.5) + (flip ? Math.PI : 0), ox = Math.cos(a) * dd,");
rep("    if (n / 16 >= thr) G[y][x] = c;\n  }\n  return R(G);   // 輪郭の黒は付けない＝面に埋まった象嵌",
  `    if (n / 16 >= thr) hit.push([x, y]);
  }
  // 弧に沿った位置 u（0＝画面で下の先端・1＝上の先端）
  const am = a + Math.PI, ts = hit.map(([x, y]) => { let d = Math.atan2(y - cy, x - cx) - am; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; });
  const t0 = Math.min(...ts), t1 = Math.max(...ts), lowIs0 = hit.length > 0 && hit[ts.indexOf(t0)][1] > hit[ts.indexOf(t1)][1];
  hit.forEach(([x, y], i) => {
    const u0 = (ts[i] - t0) / (t1 - t0 || 1), u = lowIs0 ? u0 : 1 - u0;
    const inCore = core && r - Math.hypot(x - cx, y - cy) >= coreIn && Math.hypot(x - cx - ox, y - cy - oy) - rc >= coreIn;
    G[y][x] = inCore ? core : u < fill ? fillC : c;
  });
  return R(G);   // 輪郭の黒は付けない＝面に埋まった象嵌`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('ASYM_PATCH_OK');
