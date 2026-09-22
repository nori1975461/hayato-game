// 蒼神骸華 第二案：採用した D（砲身＋脈打つ光）への「もうひとひねり」6 軸（2026-09-22 夜・ユーザー「一番レーザー砲の雰囲気ある。ただ、もうひとひねりできないか？」）
// ひねりは openGun のフラグで足し引きできる（どれも既定 off＝いままでの D と 1 画素も変わらない）：
//   skew    ＝走る脈（前縁が立ち後縁が尾を引く＝光が外へ走って見える。0〜1 で効き）
//   gapPulse＝粒の連なり（節と節の間で光が細る／切れる。1 で完全に切れる）
//   darkCore＝蝕の芯（光の中を黒い糸が走る。この機体の副腕の蝕刃と同じ図像＝骸華の顔になる）
//   rings   ＝磁環（光の周りに等間隔の細い輪＝閉じ込めている装置に見せる）
//   chamber ＝砲身の薬室（筒に脈と同じ間隔の光る隙間＋放熱フィン）
//   asym    ＝左右で脈の位相をずらす（骸華の左右を双子にしない）
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①脈の式に skew（走る脈）・gapPulse（粒の連なり）・asym（左右で位相をずらす）
rep("      else if (sty === 'pulse') beam(bl2, (u) => W * (0.55 + 0.45 * Math.pow(Math.max(0, Math.sin((Math.PI * u * L) / per)), 0.55)) * cap(u));   // 脈＝節が流れる",
  `      else if (sty === 'pulse') {   // 脈＝節が流れる。skew で前縁が立ち（走って見える）・gapPulse で節の間が細る（粒の連なり）
        const sk = (st && st.skew) || 0, gp = (st && st.gapPulse) || 0, ph = st && st.asym && s > 0 ? 0.5 : 0;   // asym＝骸華の左肩（画面右）だけ半周ずらす
        const amp = (u) => { const q = (u * L) / per + ph, f0 = q - Math.floor(q); return sk ? Math.pow(f0, 1 + 1.6 * sk) * (1 - sk) + Math.pow(Math.max(0, Math.sin(Math.PI * f0)), 0.55) * sk * 1.0 : Math.pow(Math.max(0, Math.sin(Math.PI * f0)), 0.55); };
        beam(bl2, (u) => W * ((0.55 - 0.5 * gp) + (0.45 + 0.5 * gp) * amp(u)) * cap(u));
      }`);

// ---- ②光の中の細工（蝕の芯・磁環）＝層を塗ったあとに重ねる
rep("      const tp = mkSlab(G, T[0] - dx * 1.5, T[1] - dy * 1.5, T[0] + dx * 1.5, T[1] + dy * 1.5); tp.slab(0, 1, 1.5, () => sc.a); tp.slab(0.25, 0.75, 0.8, () => sc.core);   // 先端の芯だけ残す＝「切れている」ことを見せる",
  `      if (st && st.darkCore) bl2.slab(0.02, 0.99, (u) => (st.darkCore === 2 ? 1.5 : 1.0), () => 'k');   // 蝕の芯＝光の中を黒い糸が走る（副腕の蝕刃と同じ図像）
      if (st && st.rings) { const rp = st.rings === true ? per : st.rings, nr = Math.floor((L - B0) / rp); for (let i = 1; i <= nr; i++) { const d = B0 + i * rp, c0 = [S0[0] + dx * d, S0[1] + dy * d], rg = mkSlab(G, c0[0] + dy * 3.4, c0[1] - dx * 3.4, c0[0] - dy * 3.4, c0[1] + dx * 3.4); rg.slab(0, 1, (v) => 1.1, (v, u) => (u < 0.22 || u > 0.78 ? 'Y' : 'G')); } }   // 磁環＝光を閉じ込める輪（端は鈍い金・中は明るい金）
      const tp = mkSlab(G, T[0] - dx * 1.5, T[1] - dy * 1.5, T[0] + dx * 1.5, T[1] + dy * 1.5); tp.slab(0, 1, 1.5, () => sc.a); tp.slab(0.25, 0.75, 0.8, () => sc.core);   // 先端の芯だけ残す＝「切れている」ことを見せる`);

// ---- ③砲身の薬室（脈と同じ間隔の光る隙間＋放熱フィン）
rep("        const mu = mkSlab(G, A0[0] - dx * 1.2, A0[1] - dy * 1.2, A0[0] + dx * 2.2, A0[1] + dy * 2.2); mu.slab(0, 1, 2.6, () => sc.b); mu.slab(0.2, 0.8, 1.4, () => sc.a);   // 口の中の光",
  `        if (st && st.chamber) { for (const uu of [0.5, 0.68, 0.84]) { const c0 = [W0[0] + dx * (2 + (B0 + 5) * uu), W0[1] + dy * (2 + (B0 + 5) * uu)], sl = mkSlab(G, c0[0] + dy * 3.2, c0[1] - dx * 3.2, c0[0] - dy * 3.2, c0[1] + dx * 3.2); sl.slab(0.18, 0.82, 0.9, () => sc.a); sl.slab(0.3, 0.7, 0.5, () => sc.core); }   // 薬室＝筒の隙間から中の光が漏れる
          for (const sg of [-1, 1]) for (const uu of [0.34, 0.52]) { const c0 = [W0[0] + dx * (2 + (B0 + 5) * uu), W0[1] + dy * (2 + (B0 + 5) * uu)], fn = mkSlab(G, c0[0] - dy * 3.4 * sg, c0[1] + dx * 3.4 * sg, c0[0] - dy * 6.2 * sg, c0[1] + dx * 6.2 * sg); fn.slab(0, 1, (u) => 1.6 - 0.5 * u, (v) => (v < -0.2 ? 'f' : v < 0.45 ? 'm' : 'j')); } }   // 放熱フィン＝筒から出る短い羽根
        const mu = mkSlab(G, A0[0] - dx * 1.2, A0[1] - dy * 1.2, A0[0] + dx * 2.2, A0[1] + dy * 2.2); mu.slab(0, 1, 2.6, () => sc.b); mu.slab(0.2, 0.8, 1.4, () => sc.a);   // 口の中の光`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_LASER4_OK');
