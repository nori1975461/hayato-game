// 第45稿のパッチ（一度だけ当てる）。node patch-gaika45.cjs
//   FB（09-19 22:52）①「掌はこれで」（添付＝B＝左右を入れ替えた手・親指が内）②「胴は基本はザク型でいいが、もうひとひねりして。もう一歩でイメージ通りになる気がする」
//   ①build4 の既定を handFlip: true に（false を渡すと親指が外の旧版）
//   ②診断（ザク型の腰を 4 倍で撮った）＝管が細く短く等倍で読めない／幹がただの板で胸の箱がそのまま下へ続く（箱＋取っ手＋台＝優勝カップ寄り）
//     新しい style 'zaku2' を足す（'zaku'＝第44稿のザク版は 1 ドットも変えない）。ひねりは二つの軸で見比べる：
//       route＝'canon'（規範どおり外へ膨らむ ( ) を太く）／'radial'（管を胸から扇へ向けて放射させ、取っ手の輪を閉じない＝管が扇の最初の骨になる）
//       ember＝false（鋼）／true（黒鉄の管の節の奥に炉の残り火。炉に近いほど灼け、襟に入る前に消える＝爪と炉の縦筋と同じ「灼ける」の語彙）
//     共通＝管の半径 4.0→4.6・節を大きく（周期 3.6→4.2）・胸の下に受け口のフランジ・襟に入る所に金の留め金（金は腰の鋲と合わせて逆三角の三点だけ）・幹は段のある差し込み（段は輪郭だけ）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };

rep("function waist4(G, X, Y, style, CH4 = CH4_DEF) {", "function waist4(G, X, Y, style, CH4 = CH4_DEF, opt = {}) {");
const ZAKU2 = String.raw`  } else if (style === 'zaku2') {
    // 第45稿：ザク版にもうひとひねり（'zaku' は第44稿のまま残す）。opt.route＝'canon'／'radial'・opt.ember＝残り火
    const RADIAL = opt.route === 'radial', EMBER = !!opt.ember;
    const COL_Y = 17.5, COL_W = RADIAL ? 32.5 : 30.5, BASE_Y = 22, TIP_Y = 36.5, BASE_W = 36.6, R0 = 4.6;
    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 0.5, () => 'k');
    for (let y = COL_Y - 2.5; y <= COL_Y; y += 0.25) row(y, COL_W + 0.6, () => 'k');
    // 幹＝段のある差し込み（上は太く下は細い）。段は輪郭だけで見せ、内側に横線は引かない（中央の合わせ目と交差すると十字の箱になる）
    for (let y = -3; y <= COL_Y; y += 0.25) { const w = y < 7 ? CH4 - 9 : CH4 - 13; row(y, w, (x) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k')); }
    const PT = RADIAL ? [[19.5, -2.5], [24.5, 8], [27.5, 18.8]] : [[18.5, -2.5], [32.5, 7], [25, 18.8]];
    const bez = (t) => { const a = 1 - t; return [a * a * PT[0][0] + 2 * a * t * PT[1][0] + t * t * PT[2][0], a * a * PT[0][1] + 2 * a * t * PT[1][1] + t * t * PT[2][1]]; };
    let LEN = 0; { let p = bez(0); for (let t = 0.002; t <= 1; t += 0.002) { const q = bez(t); LEN += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } }
    for (const s of [-1, 1]) {
      let len = 0, prev = null;
      for (let t = 0; t <= 1; t += 0.002) {
        const a = 1 - t, b = bez(t), cx = s * b[0], cy = b[1];
        if (prev) len += Math.hypot(cx - prev[0], cy - prev[1]);
        prev = [cx, cy];
        const tx = s * (2 * a * (PT[1][0] - PT[0][0]) + 2 * t * (PT[2][0] - PT[1][0])), ty = 2 * a * (PT[1][1] - PT[0][1]) + 2 * t * (PT[2][1] - PT[1][1]), tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
        const flange = len < 3.4, clamp = len > LEN - 4.8, sep = (len >= 3.4 && len < 4.4) || (len > LEN - 5.8 && len <= LEN - 4.8);
        const rr = flange ? R0 + 1.3 : clamp ? R0 + 1.0 : R0, ring = !flange && !clamp && !sep && (len - 4.4) % 4.2 > 3.1, hot = EMBER ? Math.max(0, 1 - len / (LEN * 0.72)) : 0;
        for (let k = -rr; k <= rr; k += 0.25) {
          const v = (nx * k * LIGHT[0] + ny * k * LIGHT[1]) / rr;
          let c;
          if (Math.abs(k) > rr - 0.6 || sep) c = 'k';
          else if (clamp) c = v > 0.15 ? 'Y' : 'y';
          else if (flange) c = v > 0.2 ? 'm' : 'j';
          else if (ring) c = hot > 0.5 && Math.abs(k) < rr * 0.6 ? 'R' : hot > 0.12 ? 'r' : v > 0.1 ? 'j' : 'k';
          else if (EMBER) c = v > 0.5 ? 'm' : v > -0.2 ? 'j' : 'k';
          else c = v > 0.4 ? 'f' : v > -0.15 ? 'm' : 'j';
          P(G, X(cx + nx * k), Y(cy + ny * k), c);
        }
      }
    }
    chestRows(-2);
    const colW = (y) => (y <= BASE_Y ? COL_W + (y - COL_Y) * (BASE_W - COL_W) / (BASE_Y - COL_Y) : BASE_W * (TIP_Y - y) / (TIP_Y - BASE_Y));
    const hemD = (x, y) => TIP_Y - Math.abs(x) * (TIP_Y - BASE_Y) / BASE_W - y;
    for (let y = COL_Y; y <= TIP_Y; y += 0.25) { const w = colW(y); row(y, w, (x) => (y < COL_Y + 1.3 ? (x < 0 ? 'm' : 'j') : x < 21 && hemD(x, y) >= 3 && hemD(x, y) < 4 ? 'k' : face(x, w, 21))); }
    seam(-2, TIP_Y - 10);
    rivet(TIP_Y - 6.5);
`;
rep("  } else if (style === 'zeong') {", ZAKU2 + "  } else if (style === 'zeong') {");
rep("  const NEW = style === 'dom' || style === 'zaku' || style === 'zeong', W = NEW ? 88 : TOR4_W;", "  const NEW = style === 'dom' || style === 'zaku' || style === 'zaku2' || style === 'zeong', W = NEW ? 88 : TOR4_W;");
rep("  if (NEW) waist4(G, X, Y, style);", "  if (NEW) waist4(G, X, Y, style, CH4, opt);");
rep("の見比べ用。既定（false）が解剖学的に正しい向き＝掌を正面へ向け指を下へ垂らすと親指は外", "の見比べ用 → 第45稿：ユーザーが A/B を見比べて B（親指が内）を選んだ＝build4 の既定は handFlip: true（false を渡すと親指が外の旧版）");
rep("arms: P7(arms4(saber, 'main', !!o.handFlip)),", "arms: P7(arms4(saber, 'main', o.handFlip !== false)),");
rep("torso: P7(o.torso || o.torsoCH || o.torsoOpt ? torso4(o.torso || 'bell', o.torsoCH || CH4_DEF, o.torsoOpt || {}) : TORSO4),", "torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.torsoOpt || ZAKU2_DEF)),");
rep("function build4(o = {}) {", "const ZAKU2_DEF = { route: 'canon', ember: true };   // 第45稿：既定の胴＝ザク版のひねり（ユーザーの選択で差し替える）\nfunction build4(o = {}) {");
rep("export const GAIKA2_DOM = build4(", "export const GAIKA2_NZ = build4({ tag: '-nz', torso: 'bell', torsoOpt: {} });   // 第45稿：既定がザク型になったので、ノイエ・ジール版（樽胴）は別名で残す\nexport const GAIKA2_DOM = build4(");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45_OK');
