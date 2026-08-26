// R35: 新しいマオウレクス弾 boss_comet（30×16）の目視確認。
// 実プレイFB「小さな破砕片のような弾が全くイケてない」に対して、多角形の座標だけで設計して
// 一度も見ずに完了報告しかけたので焼いて確かめる（[[feedback_pixel_art_judge_at_play_zoom]]）。
//
// ・Boot.js の makeFoeComet / makeFoeBolt と**同じ頂点・同じα・同じ合成順**で塗る
//   （合成は Phaser の fillPoints と同じ source-over: a = av + a_old*(1-av)）
// ・判定は必ず**実プレイの等倍**でも行う。拡大PNGだけで良し悪しを決めない
//
// node vortex/scratchpad/render-boss-comet.mjs
// 出力: comet-compare.png（新旧を等倍と8倍で／主人公・ボスとの相対サイズ付き）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, writePng } from './render-boss-rig.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---- Boot.js からそのまま写した形（変えたら必ずこちらも合わせる） ----
const COMET = {
  w: 30, h: 16, label: 'boss_comet (R35)',
  facets: [
    [[0, 8, 6, 6.4, 12, 4.6, 18, 2.8, 24, 1.6, 28, 3.6, 30, 8,
      28, 12.4, 24, 14.4, 18, 13.2, 12, 11.4, 6, 9.6], 0.22],
    [[3, 8, 9, 6.6, 15, 5.2, 21, 4.2, 26, 5.6, 28.6, 8,
      26, 10.4, 21, 11.8, 15, 10.8, 9, 9.4], 0.40],
    [[0, 8, 15, 6.9, 15, 9.1], 0.55],
    [[9, 8, 14, 6.4, 19, 5.4, 24, 6.0, 26.6, 8, 24, 10.0, 19, 10.6, 14, 9.6], 0.62],
    [[15, 8, 20, 5.8, 25, 6.2, 27.4, 8, 25, 9.8, 20, 10.2], 1.0],
    [[26, 6.9, 30, 7.4, 30, 8.6, 26, 9.1], 1.0],
  ],
};
const BOLT = {
  w: 16, h: 10, label: 'boss_bolt (旧)',
  facets: [
    [[1.1, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 1.1, 10, 0, 8.9, 3.6, 5, 0, 1.1], 0.42],
    [[1.1, 0, 4, 0, 4, 1, 3, 1, 3, 2, 6.6, 5, 3, 8, 3, 9, 4, 9, 4, 10, 1.1, 10,
      0, 8.9, 3.6, 5, 0, 1.1], 0.3103],
    [[4, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 4, 10, 4, 8, 7.6, 5, 4, 2], 0.3103],
    [[5.5, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 5.5, 10, 10, 5], 0.45],
    [[11.6, 4, 16, 4, 16, 6, 11.6, 6], 1.0],
  ],
};

// 多角形の内外判定（標本点は画素中心 x+0.5, y+0.5）
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function bake(def) {
  const a = new Float64Array(def.w * def.h);
  for (const [pts, av] of def.facets) {
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
        const i = y * def.w + x;
        a[i] = av + a[i] * (1 - av);      // Phaser の fillPoints と同じ source-over
      }
    }
  }
  return a;
}

// tint（乗算）＋加算グロウを載せて RGB へ。実装と同じ色を使う。
const TINT = [0xff, 0x5a, 0x2a];          // マオウレクスの bulletTint 相当（暖色）
const GLOW = [0xff, 0x6a, 0x1f];
function blit(cv, def, alpha, ox, oy, scale, glowScale) {
  // グロウ（弾の外側に広がる加算光）を先に薄く敷く
  if (glowScale > 0) {
    const gw = def.w * glowScale, gh = def.h * glowScale * 0.42;
    for (let y = 0; y < Math.ceil(gh); y++) {
      for (let x = 0; x < Math.ceil(gw); x++) {
        const nx = (x / gw) * 2 - 1, ny = (y / gh) * 2 - 1;
        const d = Math.sqrt(nx * nx + ny * ny);
        if (d >= 1) continue;
        const v = Math.pow(1 - d, 2.2) * 0.55;
        const px = ox + Math.round((def.w * scale - gw) / 2) + x;
        const py = oy + Math.round((def.h * scale - gh) / 2) + y;
        addPx(cv, px, py, GLOW[0] * v, GLOW[1] * v, GLOW[2] * v);
      }
    }
  }
  for (let y = 0; y < def.h * scale; y++) {
    for (let x = 0; x < def.w * scale; x++) {
      const a = alpha[Math.floor(y / scale) * def.w + Math.floor(x / scale)];
      if (a <= 0) continue;
      setPxA(cv, ox + x, oy + y, TINT[0], TINT[1], TINT[2], a);
    }
  }
}
function idx(cv, x, y) { return (y * cv.w + x) * 3; }
function setPxA(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = idx(cv, x, y);
  cv.px[i] = Math.round(cv.px[i] * (1 - a) + r * a);
  cv.px[i + 1] = Math.round(cv.px[i + 1] * (1 - a) + g * a);
  cv.px[i + 2] = Math.round(cv.px[i + 2] * (1 - a) + b * a);
}
function addPx(cv, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = idx(cv, x, y);
  cv.px[i] = Math.min(255, cv.px[i] + r);
  cv.px[i + 1] = Math.min(255, cv.px[i + 1] + g);
  cv.px[i + 2] = Math.min(255, cv.px[i + 2] + b);
}
function rect(cv, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}
function disc(cv, cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}

const aC = bake(COMET), aB = bake(BOLT);

// ---- ASCII 検算（形が意図どおりか、数字で先に見る） ----
const RAMP = ' .:-=+*#%@';
console.log('=== boss_comet 30×16（+X が進行方向）===');
for (let y = 0; y < COMET.h; y++) {
  let s = '';
  for (let x = 0; x < COMET.w; x++) s += RAMP[Math.min(9, Math.round(aC[y * COMET.w + x] * 9))];
  console.log('  ' + s);
}
const covC = aC.filter((v) => v > 0).length, covB = aB.filter((v) => v > 0).length;
console.log(`\n面積: 彗星 ${covC}px / ボルト ${covB}px（${(covC / covB).toFixed(2)}倍）`);
console.log(`芯(α>=0.9): 彗星 ${aC.filter((v) => v >= 0.9).length}px / ボルト ${aB.filter((v) => v >= 0.9).length}px`);

// ---- PNG：等倍と8倍、主人公・ボスとの相対サイズ ----
const cv = makeCanvas(480, 260);
// 上段：8倍で形を見る
blit(cv, COMET, aC, 20, 16, 8, 0);
blit(cv, BOLT, aB, 20, 160, 8, 0);

// 右上：実プレイの等倍（グロウ込み・弾が飛んでいる状態）
rect(cv, 300, 16, 170, 108, [10, 10, 30]);
for (let k = 0; k < 4; k++) blit(cv, COMET, aC, 312, 30 + k * 22, 1, 8.4 / 3.8);
for (let k = 0; k < 4; k++) blit(cv, BOLT, aB, 400, 30 + k * 22, 1, 4.6 / 4.0);

// 下段：実プレイの等倍で、主人公（半径7）とボス（半径82の一部）と並べる
rect(cv, 300, 134, 170, 112, [10, 10, 30]);
disc(cv, 470, 190, 82, [70, 40, 90]);          // ボス（画面外へはみ出す巨体）
disc(cv, 330, 190, 7, [120, 220, 255]);        // 主人公
for (let k = 0; k < 3; k++) blit(cv, COMET, aC, 352 + k * 34, 183, 1, 8.4 / 3.8);

writePng(cv, path.join(HERE, 'comet-compare.png'));
console.log('\n→ vortex/scratchpad/comet-compare.png');
