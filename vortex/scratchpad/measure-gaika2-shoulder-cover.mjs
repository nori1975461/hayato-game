// 肩当てが肩の関節の円盤（胴の (CH4+7.4, −28) 半径 6.6）をどれだけ隠しているかを数える。
//   node measure-gaika2-shoulder-cover.mjs '<候補の JSON>' [dx の最大]   → dx（中心へ寄せる画素）ごとに、円盤の中で肩当てに覆われずに見えている画素数（左右の合計）
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import * as M from './gaika-candidates.mjs';
const base = JSON.parse(process.argv[2] || '{}'), maxDx = Number(process.argv[3]) || 8, W = 344, H = 352, CX = W / 2, CY = H / 2 - 13.5;
const shot = (o) => { const d = M.gaika2With(o), cv = makeCanvas(W, H); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false }); return cv.px; };
const bare = shot({ ...base, shoulder: { ...(base.shoulder || {}), hide: true } });
const JX = 24 + 7.4, JY = -28, JR = 6.6;
for (let dx = 0; dx <= maxDx; dx++) {
  const px = shot({ ...base, shoulder: { ...(base.shoulder || {}), dx } }); const n = { L: 0, R: 0 }, lit = { L: 0, R: 0 };
  for (const [side, s] of [['L', -1], ['R', 1]]) for (let y = Math.floor(JY - JR); y <= Math.ceil(JY + JR); y++) for (let x = Math.floor(s * JX - JR); x <= Math.ceil(s * JX + JR); x++) {
    const dist = Math.hypot(x - s * JX, y - JY); if (dist > JR + 0.5) continue; const p = ((Math.round(CY) + y) * W + Math.round(CX) + x) * 3;
    if (px[p] === bare[p] && px[p + 1] === bare[p + 1] && px[p + 2] === bare[p + 2]) { n[side]++; if (dist <= JR && bare[p] + bare[p + 1] + bare[p + 2] > 150) lit[side]++; }   // lit＝円盤の中で、黒でも肩当てと同じ暗い鋼でもない色（＝輪の明るい鋼）が見えている画素
  }
  console.log('COVER dx=' + dx, 'visibleDiscPx L=' + n.L, 'R=' + n.R, ' litRingPx L=' + lit.L, 'R=' + lit.R);
}
