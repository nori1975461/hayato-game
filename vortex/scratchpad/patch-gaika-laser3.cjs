// 蒼神骸華 第二案：レーザーに「砲身」を足す口 barrel（2026-09-22 夜）
// 3 倍・6 倍で見比べて分かったこと＝光の断面をどう変えても「手から光が生えている」かぎり刀に見える。
//   一目で兵器に見せる分かれ目は断面ではなく **光がどこから出るか**＝手の先に灰色の筒（砲身）があり、その口から光が出る形。
//   openGun: { kind:'saber', style:'beam', barrel: 20 } で筒の長さを指定（0＝従来どおり手のすぐ先から光）。
//   筒があるときは二又の放射口を描かない（筒そのものが信号なので足すと飾りになる）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("      const W = (st && st.w) || 3.6, per = (st && st.period) || 15, cap = (u) => (u > 0.975 ? 0.5 : 1);",
  `      const W = (st && st.w) || 3.6, per = (st && st.period) || 15, cap = (u) => (u > 0.975 ? 0.5 : 1);
      const B0 = (st && st.barrel) || 0, A0 = [S0[0] + dx * B0, S0[1] + dy * B0], bl2 = B0 ? mkSlab(G, A0[0], A0[1], T[0], T[1]) : bl;   // 砲身があれば光はその口から出る`);

rep("      if (sty === 'twin') for (const sg of [-1, 1]) { const g0 = 3.3 * sg, g1 = 1.0 * sg; beam(mkSlab(G, S0[0] - dy * g0, S0[1] + dx * g0, T[0] - dy * g1, T[1] + dx * g1), (u) => 2.0 * cap(u)); }   // 二条＝先でわずかに寄る",
  "      if (sty === 'twin') for (const sg of [-1, 1]) { const g0 = 3.3 * sg, g1 = 1.0 * sg; beam(mkSlab(G, A0[0] - dy * g0, A0[1] + dx * g0, T[0] - dy * g1, T[1] + dx * g1), (u) => 2.0 * cap(u)); }   // 二条＝先でわずかに寄る");
rep("      else if (sty === 'pulse') beam(bl, (u)", "      else if (sty === 'pulse') beam(bl2, (u)");
rep("      else if (sty === 'cone') beam(bl, (u)", "      else if (sty === 'cone') beam(bl2, (u)");
rep("      else if (sty === 'halo') beam(bl, (u)", "      else if (sty === 'halo') beam(bl2, (u)");
rep("      else beam(bl, (u) => W * cap(u));   // 'beam'＝等幅", "      else beam(bl2, (u) => W * cap(u));   // 'beam'＝等幅");

rep("      for (const sg of [-1, 1]) { const o = [W0[0] + dx * 3 - dy * 3.4 * sg, W0[1] + dy * 3 + dx * 3.4 * sg], pr = mkSlab(G, o[0], o[1], o[0] + dx * 12, o[1] + dy * 12); pr.slab(0, 1, (u) => 2.3 - 0.9 * u, (v, u) => (u > 0.82 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }   // 柄＝前へ伸びる二又の放射口（刀の鍔をやめる）",
  `      if (B0) {   // 砲身＝手の先の灰色の筒。口に金の輪・胴に金の帯・芯に陰（筒に見せる）
        const bs = mkSlab(G, W0[0] + dx * 2, W0[1] + dy * 2, A0[0], A0[1]);
        bs.slab(0, 1, (u) => 3.9 - 0.7 * u, (v) => (v < -0.55 ? 'f' : v < 0.3 ? 'm' : 'j')); bs.slab(0, 1, 0.8, () => 'k');
        bs.slab(0.26, 0.4, 4.5, goldCol); bs.slab(0.9, 1, 4.6, goldCol);
        const mu = mkSlab(G, A0[0] - dx * 1.2, A0[1] - dy * 1.2, A0[0] + dx * 2.2, A0[1] + dy * 2.2); mu.slab(0, 1, 2.6, () => sc.b); mu.slab(0.2, 0.8, 1.4, () => sc.a);   // 口の中の光
      } else for (const sg of [-1, 1]) { const o = [W0[0] + dx * 3 - dy * 3.4 * sg, W0[1] + dy * 3 + dx * 3.4 * sg], pr = mkSlab(G, o[0], o[1], o[0] + dx * 12, o[1] + dy * 12); pr.slab(0, 1, (u) => 2.3 - 0.9 * u, (v, u) => (u > 0.82 ? 'Y' : v < -0.3 ? 'f' : v < 0.4 ? 'm' : 'j')); }   // 柄＝前へ伸びる二又の放射口（刀の鍔をやめる）`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_LASER3_OK');
