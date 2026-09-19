// 第36稿のパッチ（一度だけ当てる）。node patch-gaika36.cjs
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const once = (from, to, lo = 0, hi = src.length) => {
  const i = src.indexOf(from, lo);
  if (i < 0 || i >= hi) throw new Error('NOT FOUND: ' + from.slice(0, 60));
  const j = src.indexOf(from, i + 1);
  if (j >= 0 && j < hi) throw new Error('NOT UNIQUE: ' + from.slice(0, 60));
  src = src.slice(0, i) + to + src.slice(i + from.length);
};
const span = (startMark, endMark, body) => {
  const a = src.indexOf(startMark); if (a < 0) throw new Error('NO START: ' + startMark);
  const b = src.indexOf(endMark, a); if (b < 0) throw new Error('NO END: ' + endMark);
  src = src.slice(0, a) + body + src.slice(b);
};

// 1) 月牙＝有線の蝕刃。六枚（三枚ずつ）・一回り大きく・背に杭（止まる＝杭と線の結界の形を静止画でも持たせる）
span('// 月牙（第二案の最初の指示', '\nconst TOR4_W', `// 第36稿：FB「月牙の攻撃案は採用。ビジュアルや数はこれでいいか検討して」
//   数＝七枚→六枚（三枚ずつ）。皆既は六枚で輪を欠けさせる技なので七枚目は数が合わない。画面左の一番上を発射済みにして座を空ける＝「飛ばすと架が空く」を絵で言う
//   形＝刃を 1.15 倍・背（凸の側）に鋼の杭と金の留め金。飛ぶ＝鎌／止まる＝杭を打って線を張る／線は留め金につながる。格納時は杭の先だけが殻の外の縁から覗く
const MOON4_W = 112, MOON4_H = 44, MOON4_C = [25, 22], MOON4_K = 1.15;
const moonArm4 = (rootOff, mode) => {
  const G = g(MOON4_W, MOON4_H), [cx, cy] = MOON4_C, K = MOON4_K, ux = -0.912, uy = 0.41, R1 = 11.5 * K;
  const bx = cx + ux * (R1 - 2), by = cy + uy * (R1 - 2);
  if (mode === 'wire') {
    const rx = cx + rootOff[0], ry = cy + rootOff[1], mx = (rx + bx) / 2, my = (ry + by) / 2 + 8;
    for (let i = 0; i <= 500; i++) {
      const t = i / 500, x = (1 - t) * (1 - t) * rx + 2 * t * (1 - t) * mx + t * t * bx, y = (1 - t) * (1 - t) * ry + 2 * t * (1 - t) * my + t * t * by;
      P(G, x, y, Math.floor(t * 34) % 5 === 0 ? 'C' : 'c');
    }
  }
  const sp = mkSlab(G, bx, by, cx + ux * (R1 + 10), cy + uy * (R1 + 10));
  sp.slab(0, 1, (u) => 2.7 * (1 - u) + 0.5, (v) => (v < -0.2 ? 's' : 'f'));
  sp.slab(0.16, 0.36, 3.3, goldCol);
  crescent(G, cx - 3.5 * K, cy - 4.5 * K, 12.4 * K, 9.0 * K, 2.0 * K, 9.8 * K, { rim: 'r', rimW: 1.5, mid: 'q', dark: 'k' });
  crescent(G, cx, cy, R1, 5.5 * K, -2.5 * K, 9.8 * K, { rim: 'R', rimW: 1.4, mid: 'Q', dark: 'q' });
  P(G, cx + 1.4 * K, cy - 11.4 * K, 'A'); P(G, cx + 9.5 * K, cy + 6.4 * K, 'A');
  DISC(G, cx - 7 * K, cy + 3.5 * K, 2.8, 'k'); DISC(G, cx - 7 * K, cy + 3.5 * K, 2.1, 'R'); P(G, cx - 7 * K - 0.5, cy + 3.5 * K - 0.5, 'A');
  if (mode === 'dock') for (const [dx, dy] of [[-10.9, -8.6], [-5.8, 12.6]]) { RECT(G, Math.round(cx + dx) - 2, Math.round(cy + dy) - 1, Math.round(cx + dx) + 1, Math.round(cy + dy) + 1, 'k'); RECT(G, Math.round(cx + dx) - 1, Math.round(cy + dy), Math.round(cx + dx), Math.round(cy + dy), 'Y'); }
  OUTLINE(G);
  return R(G);
};
const MOONS4 = [{ c: [-48, -84], root: [-48, -84], mode: 'dock' }, { c: [-64, -46], root: [-64, -46], mode: 'dock' }, { c: [-72, -8], root: [-72, -8], mode: 'dock' }, { c: [-132, -68], root: [-48, -84], mode: 'wire' }]
  .map((m) => { const off = [m.root[0] - m.c[0], m.root[1] - m.c[1]]; return { ...m, rows: moonArm4(off, m.mode), origin: [(MOON4_C[0] + off[0]) / MOON4_W, (MOON4_C[1] + off[1]) / MOON4_H] }; });
`);

// 2) 殻：座を月牙に合わせて一回り広げる・一番上の座を内へ 2・空の架は画面左の一番上の座そのもの
once('const SH_HATCH = [[50, -86], [64, -46], [72, -8]];', 'const SH_HATCH = [[48, -84], [64, -46], [72, -8]];');
once('const dx = Math.abs(x - hx) / 18, dy = Math.abs(y - hy) / 14,', 'const dx = Math.abs(x - hx) / 20, dy = Math.abs(y - hy) / 15.5,');
{
  const a = src.indexOf('  if (s < 0) { DISC(G, X(-78), Y(-30), 5.2'), b = src.indexOf('\n', a);
  if (a < 0) throw new Error('NO EMPTY RACK LINE');
  src = src.slice(0, a) + `  if (s < 0) {
    // 第36稿：空の座（画面左の一番上）＝金の留め具二つと蒼い軌条だけが残る。円の灯は打たない（暗い開口に丸い灯＝目の罠）
    for (let y = -90; y <= -78; y += 0.25) { P(G, X(-48), Y(y), 'N'); P(G, X(-49), Y(y), 'Q'); P(G, X(-47), Y(y), 'Q'); }
    for (const [hx, hy] of [[-59, -93], [-54, -71]]) { RECT(G, Math.round(X(hx)) - 2, Math.round(Y(hy)) - 1, Math.round(X(hx)) + 1, Math.round(Y(hy)) + 1, 'k'); RECT(G, Math.round(X(hx)) - 1, Math.round(Y(hy)), Math.round(X(hx)), Math.round(Y(hy)), 'Y'); }
  }` + src.slice(b);
}

// 3) 肩当て：関節の真上に嵌める（形は第35稿の一枚板のまま・位置と裾の幅だけ）
span('  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;\n  for (let y = -12;', '  OUTLINE(G);\n  return R(G);\n};\n\n// 有線の手', `  // 第36稿：FB「肩当てがずれている。しっかり肩に嵌めて」＝原因は腕の根元が三つばらばら（33／40／52）で、肩当て（中心 45）がどの関節も覆っていなかったこと。
  //   直し＝主腕と三本目の腕を一つの肩の関節 (38,−25) へ集め、肩当てをその真上 (39,−31) に置く。内の縁は胴の肩の張り出し（x 28〜38）に 5 かぶる
  const G = g(SHLD_W, SHLD_H), X = (x) => x + 24, Y = (y) => y + 19;
  for (let y = -13; y <= 10; y += 0.25) {
    const u = (y + 13) / 23, w = 8 + 8.5 * Math.pow(u, 0.72), sk = s * 2.6 * u;
    for (let x = -w; x <= w; x += 0.25) {
      const v = s > 0 ? x / w : -x / w;
      let c;
      if (y < -11.9) c = Math.abs(v) > 0.62 ? 'k' : v < 0 ? 'Y' : 'y';
      else if (y > 8.6) c = 'k';
      else c = Math.abs(v) > 0.93 ? 'k' : v < -0.58 ? 'm' : v < 0.18 ? 'j' : 'k';
      P(G, X(x + sk), Y(y), c);
    }
  }
`);
once("{ role: 'rack', tex: 'shldL', ox: -45, oy: -27, origin: [0.5, 0.5] }, { role: 'rack', tex: 'shldR', ox: 45, oy: -27, origin: [0.5, 0.5] },", "{ role: 'rack', tex: 'shldL', ox: -39, oy: -31, origin: [0.5, 0.5] }, { role: 'rack', tex: 'shldR', ox: 39, oy: -31, origin: [0.5, 0.5] },");

// 4) 腕：主腕の手を禍々しく・副腕は別テクスチャへ（殻の奥から生える）・三本目の根元を肩の関節へ
once('function arms4(sb) {', "function arms4(sb, only = 'all') {   // 第36稿：only＝'main'（主腕と三本目）／'sub'（副腕だけ＝殻より奥に置く別テクスチャ）");
span('  const main = (s) => {\n', '  const sub = (s) => {   // 副腕（外側）', `  // 第36稿：FB「手のビジュアルをもっと禍々しく。全体のなかでも目立つように」
  //   手を 1.45 倍（前腕に対して大きすぎる手＝ジオングの文法）。掌は黒・指は鋼の二節・先の節は灼けた鉤爪（暗い深紅→深紅→白熱）。掌の蝕は半径 8.2 に広げ、深紅の舌を六本噴かせる（日蝕の輪と同じ形を掌にもう一つ）
  //   左右で動詞を分ける（悪神＝非対称）：画面左＝開いた手（引き寄せる）／画面右＝握り潰す手（指が蝕の上へ折れ、舌が指の間から漏れる）
  const main = (s) => {
    const pts = [[36, -26], [46, -3], [60, 13]].map(([x, y]) => [X(s * x), Y(y)]);
    { const hx = X(s * 38), hy = Y(-25); DISC(G, hx, hy, 9.4, 'k'); DISC(G, hx, hy, 8.2, 'm'); DISC(G, hx, hy, 6.2, 'k'); DISC(G, hx, hy, 5.0, 'j'); }
    mechArm(G, pts, 7.2);
    const fa = mkSlab(G, pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    fa.slab(0.16, 0.96, 9.4, (v) => (v < -0.86 ? 'm' : v < -0.2 ? 'j' : 'k'));
    fa.slab(0.16, 0.26, 10.1, goldCol); fa.slab(0.87, 0.96, 10.1, goldCol);
    fa.slab(0.3, 0.84, 4.6, () => 'k');
    fa.slab(0.34, 0.8, 3.4, (v) => (Math.abs(v) < 0.32 ? 'A' : Math.abs(v) < 0.68 ? 'R' : 'r'));
    const clench = s > 0;
    const W0 = pts[2], fl = Math.hypot(18, 20), dx = (s * 18) / fl, dy = 20 / fl, nx = -s * dy, ny = s * dx;
    const at = (d, o) => [W0[0] + dx * d + nx * o, W0[1] + dy * d + ny * o];
    const dir = (th) => [dx * Math.cos(th) + nx * Math.sin(th), dy * Math.cos(th) + ny * Math.sin(th)];
    const pm = mkSlab(G, ...at(2, 0), ...at(23, 0));
    pm.slab(0, 1, (u) => 11.5 + 5.5 * Math.pow(u, 0.7), (v) => (Math.abs(v) > 0.92 ? 'k' : v < -0.62 ? 'm' : v < 0.3 ? 'j' : 'k'));
    pm.slab(0, 0.12, 12.6, goldCol);
    const C0 = at(13, 0), r0 = 8.2, a0 = Math.atan2(dy - ny * 0.6, dx - nx * 0.6);
    for (let y = -17; y <= 17; y += 0.25) for (let x = -17; x <= 17; x += 0.25) {
      const rr = Math.hypot(x, y), a = Math.atan2(y, x), bias = 0.5 + 0.5 * Math.cos(a - a0);
      const lim = r0 + 1.0 + (clench ? 1.35 : 1) * bias * (2.2 + 4.6 * Math.pow(Math.abs(Math.sin(a * 3 + 0.6)), 2.2));
      if (rr > lim) continue;
      const e = (rr - r0) / Math.max(0.6, lim - r0);
      P(G, C0[0] + x, C0[1] + y, e < 0.34 ? 'A' : e < 0.7 ? 'R' : 'r');
    }
    DISC(G, C0[0] - dx * 1.4 + nx * 0.9, C0[1] - dy * 1.4 + ny * 0.9, r0, 'k');
    const bone = (v) => (Math.abs(v) > 0.84 ? 'k' : v < -0.3 ? 'f' : v < 0.35 ? 'm' : 'j');
    const claw = (v, u) => (u > 0.8 ? 'A' : u > 0.55 ? 'R' : u > 0.36 ? 'r' : Math.abs(v) > 0.8 ? 'k' : v < -0.2 ? 'm' : 'j');
    const finger = (b0, th1, L1, th2, L2) => {
      const f1 = dir(th1), j1 = [b0[0] + f1[0] * L1, b0[1] + f1[1] * L1], f2 = dir(th2), t = [j1[0] + f2[0] * L2, j1[1] + f2[1] * L2];
      mkSlab(G, b0[0], b0[1], j1[0], j1[1]).slab(0, 1, 3.3, bone);
      mkSlab(G, j1[0], j1[1], t[0], t[1]).slab(0, 1, (u) => 3.0 * (1 - u) + 0.45, claw);
      DISC(G, j1[0], j1[1], 3.5, 'k'); DISC(G, j1[0], j1[1], 2.3, 'm');
      DISC(G, b0[0], b0[1], 3.6, 'k'); DISC(G, b0[0], b0[1], 2.4, 'f');
    };
    for (const [o, th, L1, L2] of [[-12, -0.42, 12, 10], [-4, -0.14, 14.5, 12], [4, 0.14, 14.5, 12], [12, 0.42, 11.5, 9]]) {
      if (clench) finger(at(23, o), th, L1 * 0.5, th + Math.PI - Math.sign(th) * 0.25, L2);
      else finger(at(23, o), th, L1, th - Math.sign(th) * 0.6, L2);
    }
    if (clench) finger(at(7, -13), -0.35, 8, 0.55, 9);
    else finger(at(7, -13), -1.05, 8, -0.45, 8);
  };
`);
{
  const lo = src.indexOf('  const sub = (s) => {   // 副腕（外側）'), hi = src.indexOf('  const third = (s) => {', lo);
  once('const pts = [[52, -28], [79, -8], [93, 13]].map(([x, y]) => [X(s * x), Y(y)]);   // 第30稿：短縮', `// 第36稿：FB「副腕と砲が一か所に集まってガチャガチャ」＝副腕を肩から外し、殻（蒼の装甲）の奥から生やす（クシャトリヤの隠し腕＝装甲の開閉と同じ語彙）。
    //   肩の関節には主腕と砲の二本だけが残る。高さで三段に分ける＝上段（y−35〜−15）砲は水平／中段（y 10〜55）手／外下（x 98〜）光刃
    const pts = [[82, -4], [104, 10], [109, 27]].map(([x, y]) => [X(s * x), Y(y)]);`, lo, hi);
}
once('const pts = [[40, -38], [64, -32], [82, -28]].map(([x, y]) => [X(s * x), Y(y)]);', 'const pts = [[40, -34], [64, -31], [82, -28]].map(([x, y]) => [X(s * x), Y(y)]);   // 第36稿：根元を肩の関節へ（−38→−34）');
once('  for (const s of [-1, 1]) { sub(s); third(s); main(s); }   // 主腕を後に描く＝内側が手前', "  for (const s of [-1, 1]) { if (only !== 'main') sub(s); if (only !== 'sub') { third(s); main(s); } }   // 主腕を後に描く＝内側が手前");

// 5) build4：副腕のテクスチャを殻より奥へ・月牙は六枚
once('arms: P7(arms4(saber)),', "arms: P7(arms4(saber, 'main')), subarms: P7(arms4(saber, 'sub')),");
once("    { role: 'trackL', tex: 'shellL', ox: -112, oy: -138, origin: [0, 0] }, { role: 'trackR', tex: 'shellR', ox: 10, oy: -138, origin: [0, 0] },\n    moon('wingL', 0, false), moon('wingR', 0, true),", "    { role: 'cannon', tex: 'subarms', ox: 0, oy: 0, origin: [ARM4_O[0] / ARM4_W, ARM4_O[1] / ARM4_H] },   // 第36稿：副腕は殻より奥＝装甲の外の縁の陰から生える\n    { role: 'trackL', tex: 'shellL', ox: -112, oy: -138, origin: [0, 0] }, { role: 'trackR', tex: 'shellR', ox: 10, oy: -138, origin: [0, 0] },\n    moon('wingR', 0, true),");

fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH36_OK', CRLF ? 'CRLF' : 'LF');
