// 胴（torso）の塗り面積と、手（arms のうち手首より先の領域）の塗り面積を四版で数える。node measure-gaika2-torso-hand.mjs
import * as M from './gaika-candidates.mjs';
const count = (rows, f = () => true) => { let n = 0; rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.' && f(x, y)) n++; }); return n; };
for (const [name, d] of [['NZ', M.GAIKA2], ['DOM', M.GAIKA2_DOM], ['ZAKU', M.GAIKA2_ZAKU], ['ZEONG', M.GAIKA2_ZEONG]]) {
  const t = d.sprites.torso.rows, w = t[0].length;
  let wmax = 0; t.forEach((r) => { const a = r.search(/[^.]/); if (a >= 0) { const b = r.length - 1 - [...r].reverse().join('').search(/[^.]/); wmax = Math.max(wmax, b - a + 1); } });
  const rows = t.map((r, i) => (/[^.]/.test(r) ? i : -1)).filter((i) => i >= 0);
  console.log(name.padEnd(6), 'torso area', String(count(t)).padStart(5), ' max width', wmax, ' height', rows[rows.length - 1] - rows[0] + 1, ' tex', w + 'x' + t.length);
}
const a = M.GAIKA2.sprites.arms.rows, ox = 164, oy = 48;
const hand = count(a, (x, y) => { const wx = Math.abs(x - ox), wy = y - oy; return wx >= 50 && wx <= 100 && wy >= 12 && wy <= 80; });
console.log('HANDS  area (both, world |x| 50-100, y 12-80)', hand);
