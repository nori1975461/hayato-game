// 蒼神骸華 第二案：三本目の腕の光刃を「レーザー兵器」に見せる形（2026-09-22 19:34 ユーザー「後の2本の光刃のレーザー部分をもっと長くして。
//   レーザー兵器と一目見てわかるように形を変えて。必要であれば柄も修正してかまわない」）
// 読み（最小の変形）＝変えるのは三本目の腕の刃だけ。副腕の蝕刃（62°・長さ110）と、ほかの姿には触らない。
// 形の要点（等倍で 3〜4 画素しかないので、効くのは「長さ・等幅・白い芯・先を尖らせない・根元が砲口」の 5 つだけ）：
//   ・刃は先へ細る＝剣の形。レーザーは等幅で先が切れている（cap）＝この差がいちばん強い信号
//   ・明るい側を太く（従来は暗い縁が太く芯が 0.23px）＝白い芯を 1px 確保して「光っている」と読ませる
//   ・柄の鍔（±0.62rad の爪）は刀の記号なので、レーザーのときは前へ伸びる二又の放射口に差し替える
// style＝'beam'（等幅・先は切ったまま）／'pulse'（節が流れる）／'twin'（二条が先で寄る）／既定の 'blade'（従来の刃・1 画素も変えない）
//   openGun: { kind:'saber', style:'beam' } で選び、長さは top-level の saberLen（既定 70）で変える。
// ⚠️長さを伸ばすと腕の格子（±164＋ARM4_EXT）と光弾の格子からはみ出すので、両方とも「足りなければ広げる」式にした
//   （既定の長さ 70 では従来と同じ値になる＝既存の候補は 1 画素も変わらない）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①刃の描画＝style でレーザーに分岐（st を渡さない呼び出し＝副腕の蝕刃は従来のまま）
rep(`  const saberAt = (W0, s, deg, L, pal) => {   // pal＝色の組（SCH の値）。省略＝機体の光刃の色（o.saber・既定 mag）
    const sc = pal || sb;
    const a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a);
    const un = mkSlab(G, W0[0] - dx * 2, W0[1] - dy * 2, W0[0] + dx * 6, W0[1] + dy * 6); un.slab(0, 1, 4.8, (v) => (v < -0.6 ? 'f' : v < 0.4 ? 'm' : 'j'));
    const S0 = [W0[0] + dx * 7, W0[1] + dy * 7], T = [S0[0] + dx * L, S0[1] + dy * L], bl = mkSlab(G, S0[0], S0[1], T[0], T[1]);
    const BW = (u) => (u < 0.055 ? 0.9 + u * 36 : u > 0.84 ? 2.9 * Math.pow((1 - u) / 0.16, 0.5) : 2.9);
    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, (u) => BW(u), () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.55, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.3, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.08, () => sc.core);
    for (const da of [-0.62, 0.62]) { const ca = Math.atan2(dy, dx) + da, cl = mkSlab(G, W0[0] + dx * 4, W0[1] + dy * 4, W0[0] + dx * 4 + Math.cos(ca) * 11, W0[1] + dy * 4 + Math.sin(ca) * 11); cl.slab(0, 1, (u) => 2.5 * (1 - u) + 0.35, (v, u) => (u > 0.8 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }`,
`  const saberAt = (W0, s, deg, L, pal, st) => {   // pal＝色の組（SCH の値）。省略＝機体の光刃の色（o.saber・既定 mag）。st＝レーザーの形（省略＝従来の刃）
    const sc = pal || sb, sty = (st && st.style) || 'blade';
    const a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a);
    const un = mkSlab(G, W0[0] - dx * 2, W0[1] - dy * 2, W0[0] + dx * 6, W0[1] + dy * 6); un.slab(0, 1, 4.8, (v) => (v < -0.6 ? 'f' : v < 0.4 ? 'm' : 'j'));
    const S0 = [W0[0] + dx * 7, W0[1] + dy * 7], T = [S0[0] + dx * L, S0[1] + dy * L], bl = mkSlab(G, S0[0], S0[1], T[0], T[1]);
    if (sty !== 'blade') {   // レーザー＝等幅・明るい側を太く・先は尖らせず切ったまま（剣との差はここ）
      const W = (st && st.w) || 3.6, per = (st && st.period) || 15, cap = (u) => (u > 0.975 ? 0.5 : 1);
      const beam = (b, f) => { b.slab(0, 0.98, (u) => f(u) + 0.7, () => 'k'); b.slab(0, 1, f, () => sc.c); b.slab(0, 1, (u) => f(u) * 0.86, () => sc.b); b.slab(0, 1, (u) => f(u) * 0.6, () => sc.a); b.slab(0, 1, (u) => Math.min(f(u) * 0.38, 1.05), () => sc.core); };
      if (sty === 'twin') for (const sg of [-1, 1]) { const g0 = 3.3 * sg, g1 = 1.0 * sg; beam(mkSlab(G, S0[0] - dy * g0, S0[1] + dx * g0, T[0] - dy * g1, T[1] + dx * g1), (u) => 2.0 * cap(u)); }   // 二条＝先でわずかに寄る
      else if (sty === 'pulse') beam(bl, (u) => W * (0.55 + 0.45 * Math.pow(Math.max(0, Math.sin((Math.PI * u * L) / per)), 0.55)) * cap(u));   // 脈＝節が流れる
      else beam(bl, (u) => W * cap(u));   // 'beam'＝等幅
      const tp = mkSlab(G, T[0] - dx * 1.5, T[1] - dy * 1.5, T[0] + dx * 1.5, T[1] + dy * 1.5); tp.slab(0, 1, 1.5, () => sc.a); tp.slab(0.25, 0.75, 0.8, () => sc.core);   // 先端の芯だけ残す＝「切れている」ことを見せる
      for (const sg of [-1, 1]) { const o = [W0[0] + dx * 3 - dy * 3.4 * sg, W0[1] + dy * 3 + dx * 3.4 * sg], pr = mkSlab(G, o[0], o[1], o[0] + dx * 12, o[1] + dy * 12); pr.slab(0, 1, (u) => 2.3 - 0.9 * u, (v, u) => (u > 0.82 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }   // 柄＝前へ伸びる二又の放射口（刀の鍔をやめる）
    } else {
    const BW = (u) => (u < 0.055 ? 0.9 + u * 36 : u > 0.84 ? 2.9 * Math.pow((1 - u) / 0.16, 0.5) : 2.9);
    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, (u) => BW(u), () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.55, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.3, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.08, () => sc.core);
    for (const da of [-0.62, 0.62]) { const ca = Math.atan2(dy, dx) + da, cl = mkSlab(G, W0[0] + dx * 4, W0[1] + dy * 4, W0[0] + dx * 4 + Math.cos(ca) * 11, W0[1] + dy * 4 + Math.sin(ca) * 11); cl.slab(0, 1, (u) => 2.5 * (1 - u) + 0.35, (v, u) => (u > 0.8 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }
    }`);

// ---- ②三本目の腕：openGun のオブジェクトをそのまま形として渡す
rep("saberAt(pts[2], s, tko.deg ?? saberDeg, tko.len ?? saberLen, sc); return; }",
  "saberAt(pts[2], s, tko.deg ?? saberDeg, tko.len ?? saberLen, sc, tko); return; }");

// ---- ③腕の格子＝刃が伸びたぶんだけ広げる（既定の長さ 70 では 24 のまま＝既存の候補は不変）
rep("const arm4W = () => ARM4_W + (open4 && thirdArm4 ? 2 * ARM4_EXT : 0);",
  "const arm4W = () => ARM4_W + (open4 && thirdArm4 ? 2 * Math.max(ARM4_EXT, Math.ceil(third4Pts[2][0] + 7 + saberLen + 3 - ARM4_O[0])) : 0);   // 刃が長いときは足りるまで広げる（70 では 24＝従来値）");

// ---- ④光弾の格子も同じく（既定では 150×80 のまま）
rep("  const GW = 150, GH = 80, GC = [138, 18], a = (saberDeg * Math.PI) / 180, dx = -Math.cos(a), dy = Math.sin(a), G = g(GW, GH);",
  `  const a = (saberDeg * Math.PI) / 180, dMax = 7 + saberLen + 5 + (n - 1) * gap + shotLen / 2 + 5;
  const GW = Math.max(150, Math.ceil(dMax * Math.cos(a)) + 18), GH = Math.max(80, Math.ceil(dMax * Math.sin(a)) + 34), GC = [GW - 12, 18], dx = -Math.cos(a), dy = Math.sin(a), G = g(GW, GH);   // 刃が長いときは足りるまで広げる`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_LASER_OK');
