// 堕天の大聖堂（ジャム版ボス②）のプレビュー。
//   node scratchpad/render-cathedral.mjs
//   出力: cathedral-play.png（実プレイ等倍 640×360＋拡大）／cathedral-sil.png（黒塗り）／cathedral-parts.png（全パーツ拡大）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { CATHEDRAL } from './cathedral-candidates.mjs';
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
const D = CATHEDRAL;
{
  const cv = makeCanvas(1300, 620);
  const px0 = 12, py0 = 20;
  rect(cv, px0, py0, 640, 360, [10, 10, 30]); frame(cv, px0, py0, 640, 360, [60, 62, 90]);
  renderBoss(cv, D, D.tier, px0 + 320, py0 + 180);
  blitSimple(cv, PLAYER_SPRITES[2], px0 + 300, py0 + 310, 3);
  const dx0 = 670, dy0 = 20;
  rect(cv, dx0, dy0, 610, 580, [10, 10, 30]); frame(cv, dx0, dy0, 610, 580, [60, 62, 90]);
  renderBoss(cv, D, D.tier, dx0 + 305, dy0 + 300, { scaleOverride: 8.5, glow: false });
  writePng(cv, path.join(HERE, 'cathedral-play.png'));
}
{
  const cv = makeCanvas(400, 400);
  renderBoss(cv, D, D.tier, 200, 200, { scaleOverride: 4, silhouette: '#e8e8f0' });
  writePng(cv, path.join(HERE, 'cathedral-sil.png'));
}
{
  const names = Object.keys(D.sprites);
  const cv = makeCanvas(1400, 420);
  let x = 10;
  for (const n of names) {
    const sp = D.sprites[n]; const w = sp.rows[0].length, h = sp.rows.length;
    blitSimple(cv, sp, x, 20, 8);
    x += w * 8 + 16;
  }
  writePng(cv, path.join(HERE, 'cathedral-parts.png'));
}
{
  let l = 1e9, r = -1e9, t = 1e9, b2 = -1e9;
  for (const p2 of D.rig) {
    const sp = D.sprites[p2.tex]; const w = sp.rows[0].length, h = sp.rows.length;
    const org = p2.origin || [0.5, 0.5];
    const x0 = p2.ox - org[0] * w, y0 = p2.oy - org[1] * h;
    l = Math.min(l, x0); r = Math.max(r, x0 + w); t = Math.min(t, y0); b2 = Math.max(b2, y0 + h);
  }
  const s = D.tier.spriteScale;
  console.log(`占有: ${Math.round((r - l) * s)}×${Math.round((b2 - t) * s)} px（画面 640×360 / 主人公 72×54）`);
  for (const [n, sp] of Object.entries(D.sprites)) console.log(n, sp.rows[0].length + 'x' + sp.rows.length);
}
