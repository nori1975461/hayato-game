// 蒼神骸華 第二案「開」の姿：三本目の腕の光刃の先へ光弾＝「刃に見えて、サーベル部分がビームライフルのように光弾が飛ぶ」
// ユーザー（2026-09-22 12:37）＝私の根拠「弱点は胸の中心 → 近づくしかない」は必ずしも成り立たない。プレイヤーはビリヤード弾の
//   遠距離攻撃が基本で、近づいたのはボスの近くに有効な弾（聖歌隊・装甲片）があったから。骸華の月牙は飛来する弾なのでボスの近くにない。
//   → 追加の 2 本の光刃を遠距離武器にしてもよい。刃に見えて光弾が飛ぶのもいい。
// 実測で確かめたこと（vortex/src）＝装甲片はボス共通（billiard.js:1765・HP 20% ごとにボスから距離 62 へ撒く＝近づく動線は骸華にもある）／
//   投げ弾の射程 560〜1200px（画面幅超）・掴める距離 78〜102px＝「近づいて拾い、離れても当てられる」。骸華だけは月牙（飛来する弾）も
//   持つので、遠距離で戦える時間が他のボスより長い＝ご指摘のとおり。近接 4 本は遠距離にいる時間には脅威にならない。
// 作り：openGun: { kind:'saber', shots: n, gap, tone, flash } で、刃の先（手から 7＋saberLen）より先に紡錘の光弾を n 個＋刃先に閃き（発射の合図）。
//   刃と同じ 4 層（外→芯）・別テクスチャ（arms の格子 ±164 の外へ飛ぶため）・役割 cannon（深さ 10＝腕より手前）。
//   画面左の向きで作り、右は rig の mirror（openMoons4 と同じ作法）。閉じた姿は open4 = 0 なので 1 画素も変わらない。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①光弾のテクスチャと rig
rep("function shell(s, trim = ['R', 'R'], xf = null) {",
  `function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true) {   // 三本目の腕の刃の先へ光弾（紡錘）を n 個＝刃に見えて撃つ。画面左の向きで作り、右は rig の mirror
  const GW = 150, GH = 80, GC = [138, 18], a = (saberDeg * Math.PI) / 180, dx = -Math.cos(a), dy = Math.sin(a), G = g(GW, GH);
  for (let i = 0; i < n; i++) {
    const d = 7 + saberLen + 5 + i * gap, cx = GC[0] + dx * d, cy = GC[1] + dy * d, h = shotLen / 2;
    const bl = mkSlab(G, cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h), BW = (u) => shotW * Math.pow(Math.sin(Math.PI * u), 0.6);
    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, BW, () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.6, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.35, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.12, () => sc.core);
  }
  if (n > 0 && flash) {   // 刃先の閃き＝四芒の小さな星。「刃から出た」と読ませる合図（光なので黒縁は付けない）
    const tx = GC[0] + dx * (7 + saberLen), ty = GC[1] + dy * (7 + saberLen), px = -dy, py = dx, ST = (u) => Math.pow(Math.sin(Math.PI * u), 0.5);
    const fa = mkSlab(G, tx - dx * 3, ty - dy * 3, tx + dx * 6, ty + dy * 6); fa.slab(0, 1, (u) => 1.7 * ST(u) + 0.3, () => sc.b); fa.slab(0.15, 0.85, (u) => 1.0 * ST(u) + 0.2, () => sc.a); fa.slab(0.3, 0.7, 0.6, () => sc.core);
    const fc = mkSlab(G, tx - px * 4, ty - py * 4, tx + px * 4, ty + py * 4); fc.slab(0, 1, (u) => 1.3 * ST(u) + 0.3, () => sc.b); fc.slab(0.2, 0.8, (u) => 0.8 * ST(u) + 0.2, () => sc.a); fc.slab(0.35, 0.65, 0.5, () => sc.core);
  }
  const hand = third4Pts[2], origin = [GC[0] / GW, GC[1] / GH];
  return { sprites: { shots: { rows: R(G), palette: PAL } }, rig: [{ role: 'cannon', tex: 'shots', ox: -hand[0], oy: hand[1], origin }, { role: 'cannon', tex: 'shots', ox: hand[0], oy: hand[1], origin, mirror: true }] };
}
function shell(s, trim = ['R', 'R'], xf = null) {`);

// ---- ②build4：openGun が { kind:'saber', shots } のときだけ作る
rep("  const OM4 = open4 ? openMoons4(open4) : null; if (OM4) Object.assign(sprites, OM4.sprites);",
  `  const OM4 = open4 ? openMoons4(open4) : null; if (OM4) Object.assign(sprites, OM4.sprites);
  const tg4 = thirdGun4 && !Array.isArray(thirdGun4) && typeof thirdGun4 === 'object' && thirdGun4.kind === 'saber' && thirdGun4.shots ? thirdGun4 : null;
  const OS4 = open4 && thirdArm4 && tg4 ? openShots4(tg4.shots, tg4.gap ?? 14, tg4.tone ? SCH[tg4.tone] : saber, tg4.shotLen ?? 10, tg4.shotW ?? 3.4, tg4.flash ?? true) : null; if (OS4) Object.assign(sprites, OS4.sprites);   // 光弾（刃に見えて撃つ）`);

// ---- ③rig の末尾（頭より手前）
rep("    { role: 'dome', tex: 'head', ox: 0, oy: -HEAD4_OY, origin: [0.5, 0] },\n  ];",
  "    { role: 'dome', tex: 'head', ox: 0, oy: -HEAD4_OY, origin: [0.5, 0] },\n    ...(OS4 ? OS4.rig : []),   // 三本目の腕の光弾（機体の外へ飛ぶので何にも重ならない）\n  ];");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_SHOTS_OK');
