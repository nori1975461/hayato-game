// 蒼神骸華 第二案：三本目の光を「育って、いちばん先で大きな波動になり、ライフルのように撃ち出される」へ（2026-09-22 23:50）
// ユーザー「２．育つの要素はいれようか。先に行くたびに大きくなり、一番先では大きな波動（貼付資料）となり、ライフルのように撃ちだされる」
//   貼付＝レーザーライフルの銃口から結晶状の大きな閃光が噴き出している画像。
// 読み（最小の変形）＝砲身・粒立ち 0.65・薬室と放熱フィン・弾（ご承認の紡錘）は全部そのまま。足すのは
//   ①grow（0922/６ の「２．育つ」と同じ式・値 0.7）を既定に戻す
//   ②tipBurst＝光のいちばん先に「波動」＝結晶状の閃光（前へ長い棘・横にも棘・後ろは短い・芯は白い円）を描く。半径は既定 16（光の半幅 3.6 の約 4.4 倍）
//   ③弾は波動の縁から出る（先頭の弾を波動の半径ぶん先へずらす）。閃光の四芒は波動に置き換わるので消す
//   ④語が曖昧＝「波動となり撃ち出される」は【A 波動が残って弾が出る】【B 波動そのものが弾として飛ぶ】の二つの読みがある → shotShape:'wave' で B も作る
// openGun: { …, grow: 0.7, tipBurst: 16 | number, shotShape: 'spindle' | 'tracer' | 'wave' }
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①波動の描画（光の先・弾の形 B で共用）
rep(`function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true, shape = 'spindle', accel = 0) {`,
  `function burstAt(G, cx, cy, dx, dy, sc, R) {   // 波動＝光の先で膨れた結晶状の閃光。前へいちばん長い棘・横にも長さの違う棘・後ろは短い（正多角の星にすると花や太陽に見える罠＝わざと不揃い）。芯は白い円
  const fw = Math.atan2(dy, dx), rad = (ad) => fw + (ad * Math.PI) / 180;
  const SP = [[0, 1.0, 0.34], [20, 0.66, 0.26], [-20, 0.66, 0.26], [44, 0.5, 0.22], [-44, 0.5, 0.22], [70, 0.62, 0.25], [-70, 0.62, 0.25], [97, 0.42, 0.2], [-97, 0.42, 0.2], [125, 0.52, 0.22], [-125, 0.52, 0.22], [152, 0.34, 0.18], [-152, 0.34, 0.18], [180, 0.28, 0.16]];   // [向き°, 長さ/R, 根の半幅/R]
  const spikes = SP.map(([ad, lf, wf]) => ({ s: mkSlab(G, cx, cy, cx + Math.cos(rad(ad)) * R * lf, cy + Math.sin(rad(ad)) * R * lf), hw: (u) => R * wf * Math.pow(1 - u, 0.85) + 0.25 }));
  for (const { s, hw } of spikes) s.slab(0, 0.97, (u) => hw(u) + 0.7, () => 'k');   // 縁を先に全部置いてから中を塗る（棘どうしが重なる所に黒い線を残さない）
  for (const { s, hw } of spikes) { s.slab(0, 1, hw, () => sc.c); s.slab(0, 1, (u) => hw(u) * 0.7, () => sc.b); s.slab(0, 1, (u) => hw(u) * 0.45, () => sc.a); }
  for (const [ad, lf, wf] of [[32, 0.36, 0.16], [-32, 0.36, 0.16], [84, 0.3, 0.14], [-84, 0.3, 0.14], [138, 0.3, 0.14], [-138, 0.3, 0.14]]) { const s = mkSlab(G, cx, cy, cx + Math.cos(rad(ad)) * R * lf, cy + Math.sin(rad(ad)) * R * lf), hw = (u) => R * wf * (1 - u) + 0.2; s.slab(0, 1, hw, () => sc.b); s.slab(0, 1, (u) => hw(u) * 0.5, () => sc.a); }   // 内側の短い棘＝結晶の重なり
  const rc = R * 0.3, cd = mkSlab(G, cx - dx * rc, cy - dy * rc, cx + dx * rc, cy + dy * rc), cw = (u) => rc * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
  cd.slab(0, 1, cw, () => sc.b); cd.slab(0, 1, (u) => cw(u) * 0.78, () => sc.a); cd.slab(0, 1, (u) => cw(u) * 0.5, () => sc.core);   // 芯＝白い円
}
function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true, shape = 'spindle', accel = 0, burstR = 0) {`);

// ---- ②弾＝波動の縁から出る／B＝波動そのものが飛ぶ（shotShape:'wave'）
rep(`  const a = (saberDeg * Math.PI) / 180, dAt = (i) => 7 + saberLen + 5 + i * gap + accel * i * i, dMax = dAt(n - 1) + shotLen + 6;   // 進むほど間が開く＝加速して遠ざかる`,
  `  const a = (saberDeg * Math.PI) / 180, LEN = shape === 'tracer' ? shotLen * 1.7 : shape === 'wave' ? shotLen * 2 : shotLen, dAt = (i) => 7 + saberLen + 5 + burstR * 0.8 + i * gap + accel * i * i, dMax = dAt(n - 1) + LEN + 6;   // 進むほど間が開く＝加速して遠ざかる。波動があれば弾はその縁から出る`);
rep(`  const GW = Math.max(150, Math.ceil(dMax * Math.cos(a)) + 18), GH = Math.max(80, Math.ceil(dMax * Math.sin(a)) + 34), GC = [GW - 12, 18], dx = -Math.cos(a), dy = Math.sin(a), G = g(GW, GH);   // 刃が長いときは足りるまで広げる`,
  `  const GW = Math.max(150, Math.ceil(dMax * Math.cos(a)) + 18 + shotLen), GH = Math.max(80, Math.ceil(dMax * Math.sin(a)) + 34 + shotLen), GC = [GW - 12, 18 + (shape === 'wave' ? shotLen : 0)], dx = -Math.cos(a), dy = Math.sin(a), G = g(GW, GH);   // 刃が長いときは足りるまで広げる`);
rep(`    const d = dAt(i), LEN = shape === 'tracer' ? shotLen * 1.7 : shotLen, cx = GC[0] + dx * (d + LEN / 2), cy = GC[1] + dy * (d + LEN / 2), h = LEN / 2;
    const bl = mkSlab(G, cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h);   // u=0 が後ろ（銃側）・u=1 が頭（進む側）`,
  `    const d = dAt(i), cx = GC[0] + dx * (d + LEN / 2), cy = GC[1] + dy * (d + LEN / 2), h = LEN / 2;
    if (shape === 'wave') { burstAt(G, cx, cy, dx, dy, sc, shotLen); continue; }   // B＝波動そのものが弾として飛ぶ（半径＝shotLen）
    const bl = mkSlab(G, cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h);   // u=0 が後ろ（銃側）・u=1 が頭（進む側）`);

// ---- ③格子＝波動のぶん腕の格子を右へ広げる（閉じた姿・波動なしは 1 画素も変わらない）
rep(`let thirdGun4 = null;   // 「開」の姿で三本目の腕が持つもの`,
  `let saberTipR = 0;   // 三本目の光の先の波動の半径（openGun.tipBurst）＝腕の格子をそのぶん広げる・光弾の出る位置をずらす
let thirdGun4 = null;   // 「開」の姿で三本目の腕が持つもの`);
rep(`third4Pts[2][0] + 7 + saberLen + 3 - ARM4_O[0]`, `third4Pts[2][0] + 7 + saberLen + 3 + saberTipR - ARM4_O[0]`);
rep(`  thirdGun4 = o.openGun || null; armGunDeg =`,
  `  thirdGun4 = o.openGun || null; saberTipR = thirdGun4 && typeof thirdGun4 === 'object' && thirdGun4.tipBurst ? (typeof thirdGun4.tipBurst === 'number' ? thirdGun4.tipBurst : 16) : 0; armGunDeg =`);

// ---- ④光の先に波動を描く（レーザーの枝だけ・副腕の蝕刃は触らない）
rep(`tp.slab(0.25, 0.75, 0.8, () => sc.core);   // 先端の芯だけ残す＝「切れている」ことを見せる`,
  `tp.slab(0.25, 0.75, 0.8, () => sc.core);   // 先端の芯だけ残す＝「切れている」ことを見せる
      if (st && st.tipBurst) burstAt(G, T[0], T[1], dx, dy, sc, typeof st.tipBurst === 'number' ? st.tipBurst : 16);   // 波動＝育った光がいちばん先で膨れて結晶状の閃光になる（撃つ前の姿）`);

// ---- ⑤build4＝弾へ波動の半径を渡す・波動があれば四芒の閃光は消す
rep(`tg4.flash ?? true, tg4.shotShape ?? 'spindle', tg4.accel ?? 0) : null;`,
  `tg4.flash ?? !saberTipR, tg4.shotShape ?? 'spindle', tg4.accel ?? 0, saberTipR) : null;`);

// ---- ⑥既定＝候補 118（育つ 0.7＋波動 16）・CONCEPT4
rep(`saberLen: 120, openGun: { kind: 'saber', style: 'pulse', barrel: 20, gapPulse: 0.65, chamber: true } };`,
  `saberLen: 120, openGun: { kind: 'saber', style: 'pulse', barrel: 20, gapPulse: 0.65, chamber: true, grow: 0.7, tipBurst: 16 } };   // ⭐⭐23:50「育つを入れる・いちばん先で大きな波動になり ライフルのように撃ち出される」＝grow 0.7 を戻し tipBurst 16（結晶状の閃光）＝候補 118`);
rep(`筒の口から粒立った光が長く伸び、その先へ光弾が飛ぶ。`,
  `筒の口から粒立った光が先へ行くほど育ちながら長く伸び、いちばん先で大きな波動に膨れて、そこから光弾がライフルのように撃ち出される。`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_BURST_OK');
