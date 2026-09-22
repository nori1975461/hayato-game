// 蒼神骸華 第二案：レーザーの形に 'cone'（根元が細く先へ広がる）と 'halo'（細い芯＋広い淡い光）を追加（2026-09-22 夜）
// 追加の理由＝6 倍で見たら柄（放射口）の差は弱かった。等倍で効くのは「光そのものの形」なので、
//   ・剣は必ず先へ細る → 先へ広がる形は剣ではありえない＝いちばん強い「刃でない」信号（cone）
//   ・金属の棒は縁が締まり、光は外へにじむ → 芯を細く・外の淡い層を広く（halo）
// どちらも既定の 'blade' には触らない。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("      const beam = (b, f) => { b.slab(0, 0.98, (u) => f(u) + 0.7, () => 'k'); b.slab(0, 1, f, () => sc.c); b.slab(0, 1, (u) => f(u) * 0.86, () => sc.b); b.slab(0, 1, (u) => f(u) * 0.6, () => sc.a); b.slab(0, 1, (u) => Math.min(f(u) * 0.38, 1.05), () => sc.core); };",
  "      const RT = sty === 'halo' ? [0.42, 0.27, 0.17] : [0.86, 0.6, 0.38];   // 外→芯の太さの比。halo は芯を細く・外の淡い光を広く\n      const beam = (b, f) => { b.slab(0, 0.98, (u) => f(u) + 0.7, () => 'k'); b.slab(0, 1, f, () => sc.c); b.slab(0, 1, (u) => f(u) * RT[0], () => sc.b); b.slab(0, 1, (u) => f(u) * RT[1], () => sc.a); b.slab(0, 1, (u) => Math.min(f(u) * RT[2], 1.05), () => sc.core); };");

rep("      else beam(bl, (u) => W * cap(u));   // 'beam'＝等幅",
  "      else if (sty === 'cone') beam(bl, (u) => (1.7 + 3.6 * u) * cap(u));   // 広がる光条＝根元が細く先へ広がる（剣ではありえない形）\n      else if (sty === 'halo') beam(bl, (u) => 5.4 * cap(u));   // 細い芯＋広い淡い光\n      else beam(bl, (u) => W * cap(u));   // 'beam'＝等幅");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_LASER2_OK');
