// 真マオウレクス 最終形態（C-3 改）のプレビュー。
//   node vortex/scratchpad/render-maou-trueC.mjs
//   出力: maou-trueC-final.png（実プレイ等倍＋拡大）
//        maou-trueC-orb.png（球・ベルト・眼の拡大＝質感の確認用）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { CAND_C } from './maou-true-candidates.mjs';
import { PLAYER_SPRITES } from '../src/data/monsters.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function idx(cv, x, y) { return (y * cv.w + x) * 3; }
function rect(cv, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue;
    const i = idx(cv, x, y); cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2];
  }
}
function frame(cv, x0, y0, w, h, c) {
  rect(cv, x0, y0, w, 1, c); rect(cv, x0, y0 + h - 1, w, 1, c);
  rect(cv, x0, y0, 1, h, c); rect(cv, x0 + w - 1, y0, 1, h, c);
}

// ---- 1. 実プレイの画面そのもの＋拡大 ----
{
  const cv = makeCanvas(1120, 600);
  const px0 = 12, py0 = 20;
  rect(cv, px0, py0, 480, 360, [10, 10, 30]);
  frame(cv, px0, py0, 480, 360, [60, 62, 90]);
  renderBoss(cv, CAND_C, CAND_C.tier, px0 + 240, py0 + 190);
  blitSimple(cv, PLAYER_SPRITES[2], px0 + 228, py0 + 316, 3);

  const dx0 = 512, dy0 = 20;
  rect(cv, dx0, dy0, 596, 560, [10, 10, 30]);
  frame(cv, dx0, dy0, 596, 560, [60, 62, 90]);
  renderBoss(cv, CAND_C, CAND_C.tier, dx0 + 298, dy0 + 300, { scaleOverride: 11.4, glow: false });
  writePng(cv, path.join(HERE, 'maou-trueC-final.png'));
}

// ---- 2. 球＋手前ベルト＋眼の拡大（質感を見る） ----
{
  const cv = makeCanvas(820, 560);
  const B = (role, tex, extra = {}) => ({ role, tex, ox: 0, oy: 0, origin: [0.5, 0.5], ...extra });
  const centerDef = { ...CAND_C, rig: [B('body', 'orb'), B('dome', 'ringAf'), B('rack', 'ringBf'), B('cannon', 'ringCf'), B('core', 'eye')] };
  renderBoss(cv, centerDef, CAND_C.tier, 410, 280, { scaleOverride: 16, glow: false });
  writePng(cv, path.join(HERE, 'maou-trueC-orb.png'));
}

// ---- 3. 占有サイズ ----
{
  let l = 1e9, r = -1e9, t = 1e9, b2 = -1e9;
  for (const p2 of CAND_C.rig) {
    const sp = CAND_C.sprites[p2.tex];
    const w = sp.rows[0].length, h = sp.rows.length;
    const org = p2.origin || [0.5, 0.5];
    const x0 = p2.ox - org[0] * w, y0 = p2.oy - org[1] * h;
    l = Math.min(l, x0); r = Math.max(r, x0 + w);
    t = Math.min(t, y0); b2 = Math.max(b2, y0 + h);
  }
  const s = CAND_C.tier.spriteScale;
  console.log(`占有: ${Math.round((r - l) * s)}×${Math.round((b2 - t) * s)} px（画面 480×360 / 主人公 72×54）`);
}
