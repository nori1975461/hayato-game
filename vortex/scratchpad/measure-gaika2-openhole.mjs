// 「開」の姿：月牙が出ていった跡（openHole）の案ごとに、跡なしの姿から変わる画素を数える。
//   等倍で読めるかを色で測る＝変わった画素ごとに「元の色（＝無地の装甲板）との差」を RGB 距離と明るさの差で出す。
//   node measure-gaika2-openhole.mjs seat socket moon burn grid round
import * as M from './gaika-candidates.mjs';
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const base = M.gaika2With(M.GAIKA2_FINAL_OPT);
const shells = (d) => ['shellL', 'shellR'].map((k) => d.sprites[k].rows);
const B = shells(base);
for (const kind of process.argv.slice(2)) {
  const d = M.gaika2With({ ...M.GAIKA2_FINAL_OPT, openHole: kind }), A = shells(d);
  let n = 0, sumRGB = 0, sumLum = 0, strong = 0; const col = {};
  for (let s = 0; s < 2; s++) for (let y = 0; y < A[s].length; y++) for (let x = 0; x < A[s][y].length; x++) {
    const a = A[s][y][x], b = B[s][y][x]; if (a === b) continue;
    n++; col[a] = (col[a] || 0) + 1;
    if (a === '.' || b === '.') continue;
    const ca = rgb(M.PAL[a]), cb = rgb(M.PAL[b]);
    const dR = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]), dL = Math.abs(lum(ca) - lum(cb));
    sumRGB += dR; sumLum += dL; if (dL >= 40) strong++;
  }
  const top = Object.entries(col).sort((p, q) => q[1] - p[1]).map(([k, v]) => k + ':' + v).join(' ');
  console.log(kind.padEnd(7), '変わる画素', String(n).padStart(4), ' 平均dRGB', (sumRGB / Math.max(1, n)).toFixed(1).padStart(5),
    ' 平均dLum', (sumLum / Math.max(1, n)).toFixed(1).padStart(5), ' 明るさの差40以上', String(strong).padStart(4), ' 色', top);
}
