// 第36稿の直し（手だけ・一度だけ当てる）。node patch-gaika36b.cjs
//   1回目の失敗＝①指の付け根と関節の円盤（r3.5）が指の幅（3.3）より大きく、指が数珠に見えた ②開いた手の内の指がスカートに、外の指と親指が副腕に 2px 以内で触れた（実測 30px／25px）
//   直し＝付け根の円盤を外し関節は小さく・鉤爪を長く細く・掌を一回り締め（幅 17→15・蝕 8.2→7.5）・扇の開きを 0.42→0.3 に絞る（スカートと副腕の間の回廊は幅 43）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const span = (startMark, endMark, body) => {
  const a = src.indexOf(startMark); if (a < 0) throw new Error('NO START: ' + startMark);
  if (src.indexOf(startMark, a + 1) >= 0) throw new Error('NOT UNIQUE: ' + startMark);
  const b = src.indexOf(endMark, a); if (b < 0) throw new Error('NO END: ' + endMark);
  src = src.slice(0, a) + body + src.slice(b);
};
{
  const from = 'const pts = [[36, -26], [46, -3], [60, 13]].map(([x, y]) => [X(s * x), Y(y)]);', i = src.indexOf(from);
  if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('main pts');
  src = src.slice(0, i) + 'const pts = [[36, -26], [46, -3], [59, 11]].map(([x, y]) => [X(s * x), Y(y)]);' + src.slice(i + from.length);
}
span('    const pm = mkSlab(G, ...at(2, 0), ...at(23, 0));', '  const sub = (s) => {   // 副腕（外側）', `    const pm = mkSlab(G, ...at(2, 0), ...at(21, 0));
    pm.slab(0, 1, (u) => 10 + 5 * Math.pow(u, 0.7), (v) => (Math.abs(v) > 0.92 ? 'k' : v < -0.62 ? 'm' : v < 0.3 ? 'j' : 'k'));
    pm.slab(0, 0.12, 11.2, goldCol);
    const C0 = at(12, 0), r0 = 7.5, a0 = Math.atan2(dy - ny * 0.6, dx - nx * 0.6);
    for (let y = -16; y <= 16; y += 0.25) for (let x = -16; x <= 16; x += 0.25) {
      const rr = Math.hypot(x, y), a = Math.atan2(y, x), bias = 0.5 + 0.5 * Math.cos(a - a0);
      const lim = r0 + 1.0 + (clench ? 1.35 : 1) * bias * (2.2 + 4.4 * Math.pow(Math.abs(Math.sin(a * 3 + 0.6)), 2.2));
      if (rr > lim) continue;
      const e = (rr - r0) / Math.max(0.6, lim - r0);
      P(G, C0[0] + x, C0[1] + y, e < 0.34 ? 'A' : e < 0.7 ? 'R' : 'r');
    }
    DISC(G, C0[0] - dx * 1.4 + nx * 0.9, C0[1] - dy * 1.4 + ny * 0.9, r0, 'k');
    const bone = (v) => (Math.abs(v) > 0.86 ? 'k' : v < -0.3 ? 'f' : v < 0.35 ? 'm' : 'j');
    const claw = (v, u) => (u > 0.75 ? 'A' : u > 0.5 ? 'R' : u > 0.3 ? 'r' : Math.abs(v) > 0.82 ? 'k' : v < -0.2 ? 'f' : 'm');
    const finger = (b0, th1, L1, th2, L2) => {
      const f1 = dir(th1), j1 = [b0[0] + f1[0] * L1, b0[1] + f1[1] * L1], f2 = dir(th2), t = [j1[0] + f2[0] * L2, j1[1] + f2[1] * L2];
      mkSlab(G, b0[0], b0[1], j1[0], j1[1]).slab(0, 1, 3.4, bone);
      mkSlab(G, j1[0], j1[1], t[0], t[1]).slab(0, 1, (u) => 3.1 * (1 - u) + 0.4, claw);
      DISC(G, j1[0], j1[1], 2.7, 'k'); DISC(G, j1[0], j1[1], 1.5, 'm');
    };
    for (const [o, th, L1, L2] of [[-10.5, -0.3, 11, 11], [-3.5, -0.1, 13, 13], [3.5, 0.1, 13, 13], [10.5, 0.3, 10.5, 10]]) {
      if (clench) finger(at(21, o), th, L1 * 0.5, th + Math.PI - Math.sign(th) * 0.25, L2 * 0.85);
      else finger(at(21, o), th, L1, th - Math.sign(th) * 0.6, L2);
    }
    if (clench) finger(at(6, -11.5), -0.35, 7, 0.55, 8);
    else finger(at(6, -11.5), -1.05, 7, -0.45, 7);
  };
`);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH36B_OK');
