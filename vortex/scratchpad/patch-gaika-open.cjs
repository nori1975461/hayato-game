// 「開」の姿（第一稿）：build4({ open: 度 })。殻を稜線で割り、外の板を牙の先を軸に外へひらく／割れ目の奥＝炉の光と月牙の座／月牙六枚は有線で射出／隠し腕（肩の腕）は割れ目の中から出る。既定（閉）は不変
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
// 1) shell() に「標本点をどこへ置くか」の差し替え口を足す（xf が無ければ今までどおり）
rep("function shell(s, trim = ['R', 'R']) {\n  const G = g(SH_W, SH_H), X =", "function shell(s, trim = ['R', 'R'], xf = null) {\n  const G = xf ? g(xf.W, xf.H) : g(SH_W, SH_H), X =");
rep("      P(G, X(s * x), Y(y), c);\n    }\n  }\n  if (s < 0) {\n    // 第36稿：空の座", "      if (xf) { const tp = xf(x, y, xr); if (tp) P(G, tp[0], tp[1], c); } else P(G, X(s * x), Y(y), c);\n    }\n  }\n  if (s < 0 && !xf) {\n    // 第36稿：空の座");
// 2) 開いた殻と、射出した月牙
rep("function shell(s, trim = ['R', 'R'], xf = null) {", `const SHO_W = 140, SHO_H = 216, SHO_PIV = [54, 58], SHO_SEATS = [-108, -82, -56];
const shoRot = (x, y, a) => { const dx = x - SHO_PIV[0], dy = y - SHO_PIV[1], c = Math.cos(a), n = Math.sin(a); return [SHO_PIV[0] + dx * c - dy * n, SHO_PIV[1] + dx * n + dy * c]; };
function shellOpen4(s, trim, deg) {
  const th = (deg * Math.PI) / 180, GX = (xn) => (s > 0 ? xn - 10 : 150 - xn), GY = (y) => y + 138;
  const leaf = (outer) => shell(s, trim, Object.assign((x, y, xr) => { if (outer ? x < xr : x >= xr) return null; const p = outer ? shoRot(x, y, th) : [x, y]; return [GX(p[0]), GY(p[1])]; }, { W: SHO_W, H: SHO_H })).map((r) => r.split(''));
  const C = g(SHO_W, SHO_H);   // 割れ目の奥：黒い空洞・肋の残り火・中央に炉の光の一筋（丸い灯は打たない＝目の罠）・月牙の座は蒼い軌条と金の留め具
  for (let i = 0; i <= 260; i++) for (let y = SH_TOP + 6; y <= 52; y += 0.25) {
    const u = i / 260, p = shoRot(polyX(SH_RIDGE, y), y, th * u), tt = (y - SH_TOP) / SH_LEN, mid = Math.abs(u - 0.5), rib = (y - SH_TOP) % 9 < 1.3;
    let c = 'k';
    if (u < 0.06 || u > 0.94) c = 'j';
    else if (mid < 0.035 && tt > 0.1 && tt < 0.7) c = 'W';
    else if (mid < 0.085 && tt > 0.07 && tt < 0.76) c = 'A';
    else if (mid < 0.16 && tt > 0.05 && tt < 0.82) c = 'R';
    else if (rib && tt < 0.9) c = mid < 0.3 ? 'R' : 'r';
    else if (mid < 0.27 && tt < 0.86) c = 'r';
    for (const ys of SHO_SEATS) { const d = Math.abs(y - ys); if (d < 2.6 && u > 0.14 && u < 0.86) c = u < 0.24 || u > 0.76 ? (d < 1.8 ? 'Y' : 'k') : d < 0.8 ? 'N' : d < 1.7 ? 'Q' : 'k'; }
    P(C, GX(p[0]), GY(p[1]), c);
  }
  for (const L of [leaf(false), leaf(true)]) for (let y = 0; y < SHO_H; y++) for (let x = 0; x < SHO_W; x++) if (L[y][x] !== '.') C[y][x] = L[y][x];
  return R(C);
}
function openMoons4(deg) {   // 六枚とも有線で射出（根＝割れ目の中央の座）。画面左の向きで作り、右は rig の mirror
  const GW = 300, GH = 220, GC = [60, 110], T = [[-144, -124], [-176, -44], [-166, 34]], sprites = {}, rig = [];
  SHO_SEATS.forEach((ys, i) => {
    const sp = shoRot(polyX(SH_RIDGE, ys), ys, ((deg * Math.PI) / 180) * 0.5), root = [-sp[0], sp[1]], off = [root[0] - T[i][0], root[1] - T[i][1]], tex = 'moonF' + i, origin = [(GC[0] + off[0]) / GW, (GC[1] + off[1]) / GH];
    sprites[tex] = { rows: moonArm4(off, 'wire', GW, GH, GC), palette: PAL };
    rig.push({ role: 'baseL', tex, ox: root[0], oy: root[1], origin }, { role: 'baseR', tex, ox: -root[0], oy: root[1], origin, mirror: true });
  });
  return { sprites, rig };
}
function shell(s, trim = ['R', 'R'], xf = null) {`);
rep("const moonArm4 = (rootOff, mode) => {\n  const G = g(MOON4_W, MOON4_H), [cx, cy] = MOON4_C,", "const moonArm4 = (rootOff, mode, GW = MOON4_W, GH = MOON4_H, GC = MOON4_C) => {\n  const G = g(GW, GH), [cx, cy] = GC,");
// 3) 肩の腕の根と向きを引数に
rep("let thirdArm4 = true;", "const THIRD4_PTS = [[40, -34], [64, -31], [82, -28]];\nlet third4Pts = THIRD4_PTS, third4Deg = 17, open4 = 0;   // 「開」の姿：肩の腕は割れ目の中に根を置く（gaika2With({ open: 16, thirdPts: [...] })）\nlet thirdArm4 = true;");
rep("    const pts = [[40, -34], [64, -31], [82, -28]].map(([x, y]) => [X(s * x), Y(y)]);", "    const pts = third4Pts.map(([x, y]) => [X(s * x), Y(y)]);");
rep("    const a = (17 * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), W0 = pts[2];", "    const a = (third4Deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a), W0 = pts[2];");
// 4) build4
rep("  subStraight = !!o.subStraight; thirdArm4 = o.thirdArm !== false;\n", "  subStraight = !!o.subStraight; thirdArm4 = o.thirdArm !== false; third4Pts = o.thirdPts || THIRD4_PTS; third4Deg = o.thirdDeg ?? 17; open4 = o.open === true ? 16 : Number(o.open) || 0;\n");
rep("SH_HATCH = SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); }", "SH_HATCH = open4 ? [] : SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); }");
rep("shellL: P7(shell(-1, trim)), shellR: P7(shell(1, trim)),", "shellL: P7(open4 ? shellOpen4(-1, trim, open4) : shell(-1, trim)), shellR: P7(open4 ? shellOpen4(1, trim, open4) : shell(1, trim)),");
rep("  const moon = (role, i, mirror) => ({ role, tex: ['moonT', 'moonM', 'moonX', 'moonB'][i],", "  const OM4 = open4 ? openMoons4(open4) : null; if (OM4) Object.assign(sprites, OM4.sprites);\n  const moon = (role, i, mirror) => ({ role, tex: ['moonT', 'moonM', 'moonX', 'moonB'][i],");
rep("{ role: 'trackL', tex: 'shellL', ox: -112, oy: -138, origin: [0, 0] }, { role: 'trackR', tex: 'shellR', ox: 10, oy: -138, origin: [0, 0] },\n    { role: 'legL', tex: 'pedestal', ox: 0, oy: 22,", "{ role: 'trackL', tex: 'shellL', ox: open4 ? -150 : -112, oy: -138, origin: [0, 0] }, { role: 'trackR', tex: 'shellR', ox: 10, oy: -138, origin: [0, 0] },\n    { role: 'legL', tex: 'pedestal', ox: 0, oy: 22,");
rep("    ...[moon('wingR', 0, true),", "    ...(OM4 ? OM4.rig : []), ...(OM4 ? [] : [moon('wingR', 0, true),");
rep("moon('qlegFL', 3, false)].filter((m) => !(o.dropMoons || []).includes(m.tex)),", "moon('qlegFL', 3, false)]).filter((m) => !(o.dropMoons || []).includes(m.tex)),");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('OPEN_PATCH_OK');
