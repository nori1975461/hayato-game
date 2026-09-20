// 第48稿修正の確認：副腕テクスチャの差が前腕と肘のまわりだけで、柄と刀身は画素で不変か。node check-gaika2-subfix.mjs
import * as M from './gaika-candidates.mjs';
const A = M.gaika2With({ kit: 'launcher', foreTurn: [20, 35] }).sprites.subarms.rows, B = M.gaika2With({ kit: 'launcher', foreTurn: [20, 35], subStraight: true }).sprites.subarms.rows;
const OX = 164, OY = 48; let n = 0, bb = [1e9, 1e9, -1e9, -1e9], far = 0;
const a = (62 * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
for (let y = 0; y < A.length; y++) for (let x = 0; x < A[y].length; x++) if (A[y][x] !== B[y][x]) {
  const wx = Math.abs(x + 0.5 - OX), wy = y + 0.5 - OY; n++;
  bb = [Math.min(bb[0], wx), Math.min(bb[1], wy), Math.max(bb[2], wx), Math.max(bb[3], wy)];
  const along = (wx - 109) * dx + (wy - 27) * dy, perp = Math.abs(-(wx - 109) * dy + (wy - 27) * dx); if (along > 3 || (along > 1 && perp <= 5.5)) far++;   // 手首より先の柄・爪・刀身に出た差（前腕の金の帯の角は軸から 6 以上離れるので数えない）
}
console.log('SUBFIX diff', n, 'px / 世界の範囲 |x|', bb[0].toFixed(0), '〜', bb[2].toFixed(0), ' y', bb[1].toFixed(0), '〜', bb[3].toFixed(0), '/ 手首より先の差', far, far === 0 ? 'BLADE_SAME' : 'BLADE_TOUCHED');
