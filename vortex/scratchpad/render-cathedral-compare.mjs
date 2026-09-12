// 旧・案A下絵／軌道神核（案C）／新・堕天の大聖堂 を同じ 640×360 枠（主人公 scale3 つき）で並べる
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { CANDIDATES } from './maou-true-candidates.mjs';
import { CATHEDRAL } from './cathedral-candidates.mjs';
import { PLAYER_SPRITES } from '../src/data/monsters.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
function rect(cv, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) continue; const i = (y * cv.w + x) * 3; cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2]; } }
function frame(cv, x0, y0, w, h, c) { rect(cv, x0, y0, w, 1, c); rect(cv, x0, y0 + h - 1, w, 1, c); rect(cv, x0, y0, 1, h, c); rect(cv, x0 + w - 1, y0, 1, h, c); }
const A = CANDIDATES.find((c) => c.id === 'A') || CANDIDATES[0];
const C = CANDIDATES.find((c) => c.id === 'C') || CANDIDATES[2];
const occ = (D) => { let l = 1e9, r = -1e9, t = 1e9, b = -1e9; for (const p of D.rig) { const sp = D.sprites[p.tex]; const w = sp.rows[0].length, h = sp.rows.length; const o = p.origin || [0.5, 0.5]; const x0 = p.ox - o[0] * w, y0 = p.oy - o[1] * h; l = Math.min(l, x0); r = Math.max(r, x0 + w); t = Math.min(t, y0); b = Math.max(b, y0 + h); } const s = D.tier.spriteScale; return [Math.round((r - l) * s), Math.round((b - t) * s)]; };
const cv = makeCanvas(660 * 3, 400);
[[A, '旧A'], [C, 'C'], [CATHEDRAL, 'A2']].forEach(([D, tag], i) => {
  const x0 = 10 + i * 660, y0 = 20;
  rect(cv, x0, y0, 640, 360, [10, 10, 30]); frame(cv, x0, y0, 640, 360, [60, 62, 90]);
  renderBoss(cv, D, D.tier, x0 + 320, y0 + 180);
  blitSimple(cv, PLAYER_SPRITES[2], x0 + 300, y0 + 310, 3);
  console.log(tag, D.name || D.id, 'scale', D.tier.spriteScale, '占有', occ(D).join('x'), '色数', Object.keys(D.sprites[Object.keys(D.sprites)[0]].palette).length);
});
writePng(cv, path.join(HERE, 'cathedral-compare.png'));
fs.copyFileSync(path.join(HERE, 'cathedral-compare.png'), 'C:/Users/siniz/OneDrive/Desktop/堕天の大聖堂_比較_2026-09-13.png');
fs.copyFileSync(path.join(HERE, 'cathedral-play.png'), 'C:/Users/siniz/OneDrive/Desktop/堕天の大聖堂_等倍と拡大_2026-09-13.png');
console.log('COPIED');
