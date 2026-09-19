// 死守する制約の検査：四版とも世界 y 22（扇の付け根の平らな上端・|x|<=36）を胴の外周が覆っているか。node check-gaika2-fanroot.mjs
//   ドム版は中央に Λ の切れ込み（意図した開口）があるので、穴は数えず外周だけを見る
import * as M from './gaika-candidates.mjs';
let ok = true;
for (const [label, d] of [['NZ', M.GAIKA2], ['DOM', M.GAIKA2_DOM], ['ZAKU', M.GAIKA2_ZAKU], ['ZEONG', M.GAIKA2_ZEONG]]) {
  const rows = d.sprites.torso.rows, W = rows[0].length, r = rows[22 + 58], a = r.search(/[^.]/); let b = W - 1; while (r[b] === '.') b--;
  const x0 = a - W / 2, x1 = b - W / 2, pass = x0 <= -36 && x1 >= 36, hole = r.slice(a, b + 1).includes('.'); ok = ok && pass;
  console.log(label.padEnd(6), 'y22 x', x0, '..', x1, pass ? 'COVER_OK' : 'COVER_NG', hole ? '(center notch)' : '');
}
console.log(ok ? 'FANROOT_OK' : 'FANROOT_NG');
