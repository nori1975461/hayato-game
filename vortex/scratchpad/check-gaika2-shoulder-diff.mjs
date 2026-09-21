// 蒼神骸華 第二案：左肩（画面右）の肩当てを変えた候補が「左肩のまわり以外は 1 画素も変わっていない」ことを確かめる（2026-09-21）。
//   node check-gaika2-shoulder-diff.mjs            … 下の VARIANTS を土台（跳ね上げ・黒鉄）と比べ、差分の外接枠（世界座標）を出す
//   期待＝差分はすべて世界 x > 0（画面右）・肩当てと棘のまわり（x 15〜60・y −65〜−18）に収まる → SHOULDER_DIFF_OK
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const W = 400, H = 380, CX = 200, CY = 190 - 13.5;
const BASE = { kit: 'launcher', foreTurn: [20, 35], subStraight: true, stowed: true, thirdArm: false, subBehind: true, subBoom: true, subBlade: 'eclipse', collar: 'none', head: { cheek: 'steel', top: 'mast' } };
const SH0 = { edge: 'none', bands: false, flare: 5, topW: 9, scale: 0.88, dx: 7 };
const FORMS = { closed: { dormantX: { kind: 'umbra' } }, final: { open: 16, thirdPts: [[67, -32], [90, -34], [108, -30]], thirdArm: true, dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' } } };
const VARIANTS = {
  'short+bone': { accent: ['chamfer', 'spike'], tint: [null, 'bone'] },
  'up+bone': { accent: ['chamfer', 'spikes'], spikes: [[5, -11, 80, 18, 5]], seam: true, tint: [null, 'bone'] },
  'up+crimson': { accent: ['chamfer', 'spikes'], spikes: [[5, -11, 80, 18, 5]], seam: true, tint: [null, 'crimson'] },
  '62+bone': { accent: ['chamfer', 'spikes'], spikes: [[7, -10, 62, 18, 5]], seam: true, tint: [null, 'bone'] },
  '45+bone': { accent: ['chamfer', 'spikes'], spikes: [[8, -8, 45, 17, 4.5]], seam: true, tint: [null, 'bone'] },
  'tri+bone': { accent: ['chamfer', 'spikes'], spikes: [[2, -11, 85, 9, 3.8], [8.5, -8, 48, 10, 3.8], [12, 0, 12, 9, 3.8]], seam: true, tint: [null, 'bone'] },
  'up+spikeOnly': { accent: ['chamfer', 'spikes'], spikes: [[5, -11, 80, 18, 5]], seam: true, tint: [null, 'bone'], tintPlate: false },
  // 0921/４＝4 色 × 跳ね上げ・短い棘（18:18 にユーザーが訂正＝「棘」は短い棘）
  ...Object.fromEntries(['crimson', 'gold', 'silver', 'yellow'].flatMap((c) => [['fin+' + c, { accent: ['chamfer', 'fin'], tint: [null, c] }], ['short+' + c, { accent: ['chamfer', 'spike'], tint: [null, c] }]])),
};
const shot = (o) => { const d = M.gaika2With(o), cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false }); return cv.px; };
let ok = true;
for (const [fname, form] of Object.entries(FORMS)) {
  const base = shot({ ...BASE, ...form, shoulder: { ...SH0, accent: ['chamfer', 'fin'] } });
  for (const [vname, v] of Object.entries(VARIANTS)) {
    const px = shot({ ...BASE, ...form, shoulder: { ...SH0, ...v } }); let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (px[i] !== base[i] || px[i + 1] !== base[i + 1] || px[i + 2] !== base[i + 2]) { n++; x0 = Math.min(x0, x - CX); x1 = Math.max(x1, x - CX); y0 = Math.min(y0, y - CY); y1 = Math.max(y1, y - CY); } }
    const good = n > 0 && x0 >= 15 && x1 <= 60 && y0 >= -65 && y1 <= -18; if (!good) ok = false;
    console.log(fname.padEnd(7), vname.padEnd(13), 'diff', String(n).padStart(4), 'x', x0, '..', x1, 'y', y0, '..', y1, good ? 'OK' : 'NG');
  }
}
console.log(ok ? 'SHOULDER_DIFF_OK' : 'SHOULDER_DIFF_NG');
