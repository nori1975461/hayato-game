// 蒼神骸華 第二案：光弾を「離れる粒」から「ライフルのように撃ち出される弾」へ（2026-09-22 23:27）
// ユーザー「４＋のビジュアルで、２．の『育った粒がそのまま弾として離れます』というアイデアはぜひ活かして。
//   ただ、『弾として離れる』のではなく『弾として撃ちだされる（ライフルのように）』に変えて」
// 読み＝光（砲身＋粒立った脈）はそのまま。変えるのは**弾の形と並び方**だけ。
//   ・形＝紡錘（左右対称＝漂って見える）→ 曳光弾（丸い頭＋後ろへ細る尾＝速さと向きが出る）
//   ・並び＝等間隔（漂う）→ 進むほど間が開く（加速して遠ざかる＝撃ち出された）
//   ・粒との続き＝弾の太さは光の粒と同じ寸法のままにして「光の粒がそのまま弾になる」筋は保つ
// openGun: { …, shots: n, shotShape: 'spindle'（既定＝23:28 にご承認いただいた形）／'tracer'（別案）, gap, accel, shotLen, shotW }
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①弾の形と並び（加速）
rep(`function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true) {`,
  `function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true, shape = 'spindle', accel = 0) {`);

rep(`  const a = (saberDeg * Math.PI) / 180, dMax = 7 + saberLen + 5 + (n - 1) * gap + shotLen / 2 + 5;`,
  `  const a = (saberDeg * Math.PI) / 180, dAt = (i) => 7 + saberLen + 5 + i * gap + accel * i * i, dMax = dAt(n - 1) + shotLen + 6;   // 進むほど間が開く＝加速して遠ざかる`);

rep(`  for (let i = 0; i < n; i++) {
    const d = 7 + saberLen + 5 + i * gap, cx = GC[0] + dx * d, cy = GC[1] + dy * d, h = shotLen / 2;
    const bl = mkSlab(G, cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h), BW = (u) => shotW * Math.pow(Math.sin(Math.PI * u), 0.6);
    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, BW, () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.6, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.35, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.12, () => sc.core);
  }`,
  `  for (let i = 0; i < n; i++) {
    const d = dAt(i), LEN = shape === 'tracer' ? shotLen * 1.7 : shotLen, cx = GC[0] + dx * (d + LEN / 2), cy = GC[1] + dy * (d + LEN / 2), h = LEN / 2;
    const bl = mkSlab(G, cx - dx * h, cy - dy * h, cx + dx * h, cy + dy * h);   // u=0 が後ろ（銃側）・u=1 が頭（進む側）
    const BW = shape === 'tracer'
      ? (u) => Math.max(shotW * 0.40 * Math.pow(Math.min(1, u / 0.74), 0.8), shotW * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.845) / 0.16, 2))))   // 曳光弾＝丸い頭＋後ろへ細る尾
      : (u) => shotW * Math.pow(Math.sin(Math.PI * u), 0.6);
    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, BW, () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.6, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.35, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.12, () => sc.core);
  }`);

// ---- ②発射の閃光＝光の先に四芒と横の一閃（撃ち出した口）
rep(`    const fc = mkSlab(G, tx - px * 4, ty - py * 4, tx + px * 4, ty + py * 4); fc.slab(0, 1, (u) => 1.3 * ST(u) + 0.3, () => sc.b); fc.slab(0.2, 0.8, (u) => 0.8 * ST(u) + 0.2, () => sc.a); fc.slab(0.35`,
  `    const fc = mkSlab(G, tx - px * 5.4, ty - py * 5.4, tx + px * 5.4, ty + py * 5.4); fc.slab(0, 1, (u) => 1.6 * ST(u) + 0.3, () => sc.b); fc.slab(0.2, 0.8, (u) => 1.0 * ST(u) + 0.2, () => sc.a); fc.slab(0.35`);

// ---- ③build4 から形と加速を渡す
rep(`const OS4 = open4 && thirdArm4 && tg4 ? openShots4(tg4.shots, tg4.gap ?? 14, tg4.tone ? SCH[tg4.tone] : saber, tg4.shotLen ?? 10, tg4.shotW ?? 3.4, tg4.flash ?? true) : null;`,
  `const OS4 = open4 && thirdArm4 && tg4 ? openShots4(tg4.shots, tg4.gap ?? 14, tg4.tone ? SCH[tg4.tone] : saber, tg4.shotLen ?? 10, tg4.shotW ?? 3.4, tg4.flash ?? true, tg4.shotShape ?? 'spindle', tg4.accel ?? 0) : null;`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_TRACER_OK');
