// 光刃の角度A〜Dを、旋回軸(saberMountの支点)から実際に線を引いて重ねる（数字だけでなく見た目で角度差がわかるように）。
//   0°基準線(白・破線・水平)と実際の角度線(緑・実線)、その間の弧(橙)を描く。緑線の長さは目盛り用の固定長で、刀身の実際の長さとは無関係。
//   node render-gaika2-saber-angle.mjs [出力名]
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';

const file = process.argv[2] || './gaika2-saber-angle.png';
const CANDS = [
  { label: 'A', deg: 66, len: 96, note: 'DEFAULT' },
  { label: 'B', deg: 62, len: 96, note: '' },
  { label: 'C', deg: 66, len: 110, note: 'NEAR REF' },
  { label: 'D', deg: 72, len: 104, note: 'STEEPER' },
];
const PW = 320, PH = 180, S = 1.0, WY = 55;          // 旋回軸(世界y12)〜光刃の先(最大約125)が収まる枠
const PIVOT = { x: 103, y: 12 };                     // saberMountの旋回軸(P1)。骸華の左手側=画面右（s=+1）の世界座標
const REFLEN = 46;                                   // 参照線・角度線の見た目の長さ(px、実際の刀身長とは無関係の目盛り)
const GREEN = [90, 240, 140], AMBER = [255, 196, 60];

function setPx(cv, x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return; const i = (y * cv.w + x) * 3; cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2]; }
function line(cv, x0, y0, x1, y1, c, dash = 0) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) { if (dash && Math.floor(i / dash) % 2 === 1) continue; setPx(cv, x0 + dx * i / n, y0 + dy * i / n, c); }
}
function dot(cv, x, y, r, c) { for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) if (ox * ox + oy * oy <= r * r) setPx(cv, x + ox, y + oy, c); }
function arc(cv, x, y, r, a0, a1, c) { const n = Math.ceil(Math.abs(a1 - a0) * r / 4) + 4; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; setPx(cv, x + Math.cos(a) * r, y + Math.sin(a) * r, c); } }

const out = makeCanvas(PW * 2, PH * 2); rect(out, 0, 0, PW * 2, PH * 2, [40, 42, 64]);
CANDS.forEach((cnd, i) => {
  const d = M.gaika2With({ mountSaberDeg: cnd.deg, mountSaberLen: cnd.len });
  const cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, [16, 16, 36]);
  const cx = PW / 2, cy = PH / 2 - WY * S;
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, cx, cy, { glow: false });

  const px = cx + PIVOT.x * S, py = cy + PIVOT.y * S;
  line(cv, px, py, px + REFLEN, py, WHITE, 3);                                   // 0°基準線(水平)
  const a = (cnd.deg * Math.PI) / 180;
  line(cv, px, py, px + Math.cos(a) * REFLEN, py + Math.sin(a) * REFLEN, GREEN); // 実際の角度線
  arc(cv, px, py, 16, 0, a, AMBER);                                              // 角度の弧
  dot(cv, px, py, 2, WHITE);                                                     // 支点(旋回軸)

  text(cv, cnd.label + (cnd.note ? ' ' + cnd.note : ''), 4, 4, WHITE, 1);
  text(cv, String(cnd.deg) + 'DEG L' + cnd.len, 4, 14, GREEN, 1);

  const ox = (i % 2) * PW, oy = Math.floor(i / 2) * PH;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s0 = (y * PW + x) * 3, p = ((oy + y) * (PW * 2) + ox + x) * 3; out.px[p] = cv.px[s0]; out.px[p + 1] = cv.px[s0 + 1]; out.px[p + 2] = cv.px[s0 + 2]; }
});
writePng(out, file);
console.log('SABER_ANGLE_OK');
