// 蒼神骸華 第二案：炉心の案（openCore・chest）で変わる画素が「殻の割れ目の奥」と「胸の中央」だけかを確かめる（2026-09-21）。
//   node check-gaika2-core-diff.mjs   → 最終形態の土台と比べ、差分を 胸（|x|<=6・y −31〜−6）／それ以外 に分けて数える。
//   期待＝閉じた姿では openCore は何も変えない（0 画素）・「それ以外」の差分はすべて殻の領域（|x| 15〜130・y −134〜58）→ CORE_DIFF_OK
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const W = 440, H = 400, CX = 220, CY = 200 - 13.5;
const BASE = { kit: 'launcher', foreTurn: [20, 35], subStraight: true, stowed: true, thirdArm: false, subBehind: true, subBoom: true, subBlade: 'eclipse', collar: 'none', head: { cheek: 'steel', top: 'mast' }, shoulder: { edge: 'none', bands: false, flare: 5, topW: 9, scale: 0.88, dx: 7, accent: 'chamfer' } };
const FINAL = { open: 16, thirdPts: [[67, -32], [90, -34], [108, -30]], thirdArm: true, dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' } }, CLOSED = { dormantX: { kind: 'umbra' } };
const VARS = { spine: { openCore: 'spine' }, rack: { openCore: 'rack' }, 'rack+chestGold': { openCore: 'rack', chest: { tone: 'gold' } }, 'rack+chestCrimson': { openCore: 'rack', chest: { tone: 'crimson' } }, 'rim+chestGold': { openCore: { kind: 'rim', tone: 'gold' }, chest: { tone: 'gold' } } };
const shot = (o) => { const d = M.gaika2With(o), cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false }); return cv.px; };
let ok = true;
const cmp = (tag, a, b, expectZero) => { let chest = 0, other = 0, bad = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2]) continue; const wx = x - CX, wy = y - CY;
    if (Math.abs(wx) <= 6 && wy >= -31 && wy <= -6) chest++; else { other++; if (!(Math.abs(wx) >= 15 && Math.abs(wx) <= 130 && wy >= -134 && wy <= 58)) bad++; } }
  const good = expectZero ? chest + other === 0 : bad === 0; if (!good) ok = false;
  console.log(tag.padEnd(28), 'chest', String(chest).padStart(4), 'shell', String(other).padStart(5), 'outside', bad, good ? 'OK' : 'NG'); };
const f0 = shot({ ...BASE, ...FINAL }), c0 = shot({ ...BASE, ...CLOSED });
for (const [k, v] of Object.entries(VARS)) cmp('final  ' + k, f0, shot({ ...BASE, ...FINAL, ...v }), false);
cmp('closed openCore:rack', c0, shot({ ...BASE, ...CLOSED, openCore: 'rack' }), true);
console.log(ok ? 'CORE_DIFF_OK' : 'CORE_DIFF_NG');
