// 蒼神骸華 第二案：左肩の肩当ての色が「どれだけ目に入るか」を数字で比べる（2026-09-21 の検討）。
//   node measure-gaika2-shoulder-pop.mjs
//   測るもの（等倍・閉じた姿＝昇る蝕の平常／最終形態＝皆既＋装甲が開いた姿）
//     region  ＝色を付けた画素（黒鉄のままの絵との差分＝面と棘・黒い輪郭は含まない）
//     around  ＝region のまわり 2〜7 画素の帯（色を付けた絵から取る）
//     dRGB    ＝region の平均色と around の各画素の色の距離の平均（大きいほど周りから浮く）
//     dLum    ＝region と around の明るさの差（0〜255）
//     same%   ＝機体ぜんたい（背景を除く・region を除く）のうち region の平均色に近い（距離 < 70）画素の割合（小さいほど「この色は ここにしか無い」）
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const W = 400, H = 380, CX = 200, CY = 190 - 13.5;
const BASE = { kit: 'launcher', foreTurn: [20, 35], subStraight: true, stowed: true, thirdArm: false, subBehind: true, subBoom: true, subBlade: 'eclipse', collar: 'none', head: { cheek: 'steel', top: 'mast' } };
//   引数：形＝spike（既定・大きな一本棘）／short（短い棘＝09-21 18:18 にユーザーが言う「棘」）／chamfer（面取り）／fin（跳ね上げ）。二つ目に core を付けると最終形態の炉心を 09-21 の推し（発射架＋胸の炉の扉・白金）にする
const SHAPE = { chamfer: { accent: 'chamfer' }, fin: { accent: ['chamfer', 'fin'] }, short: { accent: ['chamfer', 'spike'] } }[process.argv[2]] || { accent: ['chamfer', 'spikes'], spikes: [[5, -11, 80, 18, 5]], seam: true };
const SH = { edge: 'none', bands: false, flare: 5, topW: 9, scale: 0.88, dx: 7, ...SHAPE };
const CORE = process.argv[3] === 'core' ? { openCore: 'rack', chest: { tone: 'gold' } } : {};
const FORMS = { closed: { dormantX: { kind: 'umbra' } }, final: { open: 16, thirdPts: [[67, -32], [90, -34], [108, -30]], thirdArm: true, dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' }, ...CORE } };
const TINTS = ['bone', 'crimson', 'blood', 'gold', 'silver', 'green', 'yellow'];
const shot = (o) => { const d = M.gaika2With(o), cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false }); return cv.px; };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
for (const [fname, form] of Object.entries(FORMS)) {
  const iron = shot({ ...BASE, ...form, shoulder: SH });
  console.log('== ' + fname);
  for (const tint of TINTS) {
    const px = shot({ ...BASE, ...form, shoulder: { ...SH, tint: [null, tint] } });
    const reg = new Uint8Array(W * H); let n = 0, mr = 0, mg = 0, mb = 0;
    for (let i = 0; i < W * H; i++) if (px[i * 3] !== iron[i * 3] || px[i * 3 + 1] !== iron[i * 3 + 1] || px[i * 3 + 2] !== iron[i * 3 + 2]) { reg[i] = 1; n++; mr += px[i * 3]; mg += px[i * 3 + 1]; mb += px[i * 3 + 2]; }
    mr /= n; mg /= n; mb /= n;
    let an = 0, ad = 0, al = 0, bodyN = 0, sameN = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (reg[i]) continue;
      const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2], isBg = r === BGC[0] && g === BGC[1] && b === BGC[2];
      if (!isBg) { bodyN++; if (Math.hypot(r - mr, g - mg, b - mb) < 70) sameN++; }
      let near = false, tooNear = false;
      for (let dy = -7; dy <= 7 && !tooNear; dy++) for (let dx = -7; dx <= 7; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || !reg[yy * W + xx]) continue; if (Math.max(Math.abs(dx), Math.abs(dy)) < 2) { tooNear = true; break; } near = true; }
      if (near && !tooNear) { an++; ad += Math.hypot(r - mr, g - mg, b - mb); al += lum(r, g, b); } }
    console.log(tint.padEnd(8), 'region', String(n).padStart(4), 'dRGB', (ad / an).toFixed(1).padStart(6), 'dLum', Math.abs(lum(mr, mg, mb) - al / an).toFixed(1).padStart(6), 'same%', (100 * sameN / bodyN).toFixed(2).padStart(6));
  }
}
