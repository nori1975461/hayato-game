// 蒼神骸華の右手の棒＝柄の仕上げ 4 種（形は同じ）を、実プレイ等倍で横に並べる。node scratchpad/render-gaika-rods.mjs
//   出力: gaika-rods.png（上段＝等倍の全長 A〜D・下段＝上端の箍の 3 倍）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, frame, text, WHITE, DIM, BGC, FR } from './gods-sheet.mjs';
import { GAIKA_RODS, GAIKA_ROD_LABELS } from './gaika-candidates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = 4.2, W = 760, H = 860, CX = 380, CY = 450;   // 第27案：身体が 24 units 伸びたので描画面と原点を下げる
const LABEL = GAIKA_ROD_LABELS;
const crop = (def, wx0, wy0, ww, wh, z) => {
  const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, def, def.tier, CX, CY);
  const x0 = Math.round(CX + wx0 * S), y0 = Math.round(CY + wy0 * S), w = Math.round(ww * S), h = Math.round(wh * S);
  const out = makeCanvas(w * z, h * z);
  for (let y = 0; y < h * z; y++) for (let x = 0; x < w * z; x++) { const sx = x0 + Math.floor(x / z), sy = y0 + Math.floor(y / z); if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue; const p = (y * out.w + x) * 3, q = (sy * cv.w + sx) * 3; out.px[p] = cv.px[q]; out.px[p + 1] = cv.px[q + 1]; out.px[p + 2] = cv.px[q + 2]; }
  return out;
};
const paste = (dst, src, x0, y0) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const p = ((y0 + y) * dst.w + x0 + x) * 3, q = (y * src.w + x) * 3; dst.px[p] = src.px[q]; dst.px[p + 1] = src.px[q + 1]; dst.px[p + 2] = src.px[q + 2]; } };

const keys = Object.keys(GAIKA_RODS);
const full = keys.map((k) => crop(GAIKA_RODS[k], -84, -102, 78, 190, 1));          // 等倍・棒の全長と体の左半分
const capz = keys.map((k) => crop(GAIKA_RODS[k], -66, -101, 26, 40, 3));           // 上端の箍を 3 倍
const gap = 14, cw = full[0].w, chh = full[0].h, zw = capz[0].w, zh = capz[0].h;
const sheetW = gap + keys.length * (cw + gap), sheetH = 56 + chh + 40 + zh + 20;
const cv = makeCanvas(sheetW, sheetH); rect(cv, 0, 0, sheetW, sheetH, BGC);
text(cv, 'SOUSHIN GAIKA / 28TH PLAN REV3 - ARMS REBALANCED (BODY 1.007 W/H) + 4 IDEAS FOR THE HEAD / IN GAME SCALE 4.2', gap, 10, WHITE, 2);
keys.forEach((k, i) => { const x = gap + i * (cw + gap); text(cv, LABEL[k], x, 34, DIM, 2); paste(cv, full[i], x, 52); frame(cv, x, 52, cw, chh, FR);
  const zx = x + Math.floor((cw - zw) / 2); text(cv, k + ': HEAD X3', zx, 52 + chh + 18, DIM, 2); paste(cv, capz[i], zx, 52 + chh + 36); frame(cv, zx, 52 + chh + 36, zw, zh, FR); });
writePng(cv, path.join(HERE, 'gaika-rods.png'));
console.log('RODS_OK ' + sheetW + 'x' + sheetH);
