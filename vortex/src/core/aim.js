// core/aim.js — 狙いの刻み（Phaser 非依存の純関数。本体もテストもここを使う）。
//
// 2026-09-21 実プレイFB「弾の放つ方向が上下左右にしかうまく投げられない。16方向へ投げやすくしてほしい」。
// 十字キーは4つしかないので、同時押しを使っても作れる向きは8方向まで＝これは物理的な上限で、
// キーの割り当てを変えても増えない（この家ではマウスを使わない）。
// そこで「掴んでいる間は、押した方向へ 22.5°（＝16方向の1刻み）ずつ狙いが寄る」ことにした。
//   ・押しっぱなし … その8方向まで回って止まる＝従来とまったく同じ結果
//   ・軽く叩く　　 … 1刻みだけ回る＝45°の間（22.5°）で止められる＝16方向
// 覚える操作は1つも増えない。

export const AIM_STEP = Math.PI / 8;   // 22.5°＝16方向の1刻み

// -π..π に畳んだ角度差（Run.angDiff と同じ式）
export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// cur から want へ1刻みだけ寄せる。残りが1刻み以下なら want にそろえる（行き過ぎない）。
export function stepAim(cur, want, step = AIM_STEP) {
  const d = angDiff(want, cur);
  if (Math.abs(d) <= step + 1e-9) return want;
  const r = cur + Math.sign(d) * step;
  return Math.atan2(Math.sin(r), Math.cos(r));   // -π..π に畳む（±180°をまたいでも値が伸び続けない）
}

// 角度を 16 方向の格子に載せる（記録・検証用。本体の投げはスナップしない）
export function snap16(a) {
  return Math.round(a / AIM_STEP) * AIM_STEP;
}
