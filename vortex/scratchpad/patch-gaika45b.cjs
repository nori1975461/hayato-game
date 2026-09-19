// 第45稿の詰め 1（zaku2 の枝を差し替える）。node patch-gaika45b.cjs
//   1回目の点検＝管を太く（半径 4.6）＋金の留め金は失敗：腰の高さが 19px しかなく、太い管は「ずんぐりした脚」、金の留め金は「靴」に見える（鋼でも灼熱でも、( ) でも放射でも同じ）。
//   → 太さで押さない。管の「通し方」を引数 route で切り替えて見比べる（金の留め金は撤去）。
//     canon＝第44稿と同じ ( )／long＝胸の脇から出て腰を回る長い ( )／vee＝胸の下の角から扇の要（金の鋲）へ集まる V／sash＝左上から右下へ一本だけ斜めに掛ける（非対称）／bundle＝細い索を三本ずつ束ねる（肋）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const A = src.indexOf("  } else if (style === 'zaku2') {"), B = src.indexOf("  } else if (style === 'zeong') {");
if (A < 0 || B < 0 || B < A) throw new Error('zaku2 block not found');
const ZAKU2 = String.raw`  } else if (style === 'zaku2') {
    // 第45稿：ザク版にもうひとひねり（'zaku' は第44稿のまま残す）。opt.route＝管の通し方・opt.ember＝節の奥の残り火・opt.r＝管の半径
    const ROUTE = opt.route || 'canon', EMBER = !!opt.ember, R0 = opt.r ?? 4.0;
    const COL_Y = 17.5, COL_W = 30.5, BASE_Y = 22, TIP_Y = 36.5, BASE_W = 36.6;
    const bz = (p) => (t) => { const a = 1 - t; return [a * a * p[0][0] + 2 * a * t * p[1][0] + t * t * p[2][0], a * a * p[0][1] + 2 * a * t * p[1][1] + t * t * p[2][1]]; };
    const ell = (ex, ey, rx, ry, a0, a1) => (t) => { const th = ((a0 + (a1 - a0) * t) * Math.PI) / 180; return [ex + rx * Math.cos(th), ey + ry * Math.sin(th)]; };
    const tube = (path, s, R, o = {}) => {
      let LEN = 0; { let p = path(0); for (let t = 0.002; t <= 1; t += 0.002) { const n = path(t); LEN += Math.hypot(n[0] - p[0], n[1] - p[1]); p = n; } }
      let len = 0, prev = null; const per = o.period || 3.6;
      for (let t = 0; t <= 1; t += 0.002) {
        const b = path(t), b2 = path(Math.min(1, t + 0.004)), b1 = path(Math.max(0, t - 0.004));
        const cx = s * b[0], cy = b[1], tx = s * (b2[0] - b1[0]), ty = b2[1] - b1[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        if (prev) len += Math.hypot(cx - prev[0], cy - prev[1]);
        prev = [cx, cy];
        const ring = !o.smooth && len % per > per - 1.0, band = !!o.bands && o.bands.some((L) => Math.abs(len - L * LEN) < 0.7), hot = EMBER ? Math.max(0, 1 - len / (LEN * 0.72)) : 0;
        for (let k = -R; k <= R; k += 0.25) {
          const v = (nx * k * LIGHT[0] + ny * k * LIGHT[1]) / R;
          let c;
          if (Math.abs(k) > R - 0.55 || band) c = 'k';
          else if (ring) c = hot > 0.5 && Math.abs(k) < R * 0.6 ? 'R' : hot > 0.12 ? 'r' : v > 0.1 ? 'j' : 'k';
          else if (EMBER) c = v > 0.5 ? 'm' : v > -0.2 ? 'j' : 'k';
          else c = v > 0.4 ? 'f' : v > -0.15 ? 'm' : 'j';
          P(G, X(cx + nx * k), Y(cy + ny * k), c);
        }
      }
    };
    const colW = (y) => (y <= BASE_Y ? COL_W + (y - COL_Y) * (BASE_W - COL_W) / (BASE_Y - COL_Y) : BASE_W * (TIP_Y - y) / (TIP_Y - BASE_Y));
    const hemD = (x, y) => TIP_Y - Math.abs(x) * (TIP_Y - BASE_Y) / BASE_W - y;
    const collar = () => { for (let y = COL_Y; y <= TIP_Y; y += 0.25) { const w = colW(y); row(y, w, (x) => (y < COL_Y + 1.3 ? (x < 0 ? 'm' : 'j') : x < 21 && hemD(x, y) >= 3 && hemD(x, y) < 4 ? 'k' : face(x, w, 21))); } };
    for (let y = -3; y <= COL_Y; y += 0.25) row(y, CH4 - 0.5, () => 'k');
    for (let y = COL_Y - 2.5; y <= COL_Y; y += 0.25) row(y, COL_W + 0.6, () => 'k');
    // 幹＝段のある差し込み（上は太く下は細い）。段は輪郭だけで見せ、内側に横線は引かない（中央の合わせ目と交差すると十字の箱になる）
    for (let y = -3; y <= COL_Y; y += 0.25) { const w = y < 7 ? CH4 - 9 : CH4 - 13; row(y, w, (x) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k')); }
    seam(-2, COL_Y);
    if (ROUTE === 'canon') for (const s of [-1, 1]) tube(bz([[18.4, -3], [28.9, 7.5], [24.3, 18.5]]), s, R0);
    if (ROUTE === 'long') for (const s of [-1, 1]) tube(ell(22, 4.5, 7.5, 15, -82, 72), s, R0);
    if (ROUTE === 'bundle') for (const s of [-1, 1]) for (const p of [[[14.5, -2.5], [25.5, 7.5], [21, 18.8]], [[18, -2.5], [29.5, 7.5], [24.5, 18.8]], [[21.5, -2.5], [33.5, 7.5], [28, 18.8]]]) tube(bz(p), s, 1.7, { smooth: true, bands: [0.28, 0.72] });
    if (ROUTE === 'sash') tube(bz([[-19, -2.5], [4, 13], [27, 18.5]]), 1, R0);
    chestRows(-2);
    collar();
    seam(COL_Y, TIP_Y - 10);
    if (ROUTE === 'vee') { for (const s of [-1, 1]) tube(bz([[17, -2.5], [15.5, 14], [3.8, 27.5]]), s, opt.r ?? 3.6); chestRows(-2); }
    rivet(TIP_Y - 6.5);
`;
src = src.slice(0, A) + ZAKU2 + src.slice(B);
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.torsoOpt || ZAKU2_DEF)),", "torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.torsoOpt || (o.torso ? {} : ZAKU2_DEF))),");
rep("const ZAKU2_DEF = { route: 'canon', ember: true };", "const ZAKU2_DEF = { route: 'canon' };");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45B_OK');
