// 真マオウレクス（案C 軌道神核）の「環の見せ方」比較。
//
// 球（神核）の質感と眼はここまでで作り込めたが、環をどう見せるかは目だけで詰め切れなかった。
// 環を球の手前に置くと帯が面を横切って質感が消え、奥に回すと今度は左右対称の「翼」に見える。
// これは好みの問題なので、ゲーム内切り替えと同じ発想で候補を並べて選んでもらう。
//
// node vortex/scratchpad/render-maou-trueC.mjs
//   出力: maou-trueC-variants.png（4案を実プレイ等倍で／主人公つき）
//        maou-trueC-orb.png（球と眼だけを拡大＝質感の確認用）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, blitSimple, writePng } from './render-boss-rig.mjs';
import { CAND_C } from './maou-true-candidates.mjs';
import { PLAYER_SPRITES } from '../src/data/monsters.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const B = (role, tex, extra = {}) => ({ role, tex, ox: 0, oy: 0, origin: [0.5, 0.5], ...extra });
const ORB = B('body', 'orb');
const EYE = B('core', 'eye');

// role の depth: wingR/wingL/legR = 7（球より奥） / body = 8 / dome・rack = 9 / cannon = 10（手前）
const VARIANTS = [
  {
    key: '1', label: 'C-1  RINGS BEHIND', scale: 9.4,
    note: '環はすべて球の奥。球の面が一切隠れないので質感は最大。ただし左右へ張り出して翼に見えやすい',
    rig: [B('wingR', 'ringAb'), B('wingL', 'ringBb'), B('legR', 'ringCb'), ORB, EYE],
  },
  {
    key: '2', label: 'C-2  ORB ONLY', scale: 10.6,
    note: '環なし。球と眼だけ。いちばん大きく、いちばん質感が出る。「軌道」は攻撃の時だけ現れる案',
    rig: [ORB, EYE],
  },
  {
    key: '3', label: 'C-3  PIERCED', scale: 9.4,
    note: '水平のベルトだけ球の手前を通す。前後関係がはっきりして立体に見えるが、球の下側が隠れる',
    rig: [B('wingR', 'ringAb'), B('wingL', 'ringBb'), B('legR', 'ringCb'), ORB,
      B('cannon', 'ringCf'), EYE],
  },
  {
    key: '4', label: 'C-4  ALL PIERCED', scale: 9.4,
    note: '3枚とも球を貫く。取り巻いている感じは最も強いが、帯が球の面を3本横切る',
    rig: [B('wingR', 'ringAb'), B('wingL', 'ringBb'), B('legR', 'ringCb'), ORB,
      B('dome', 'ringAf'), B('rack', 'ringBf'), B('cannon', 'ringCf'), EYE],
  },
];

const FONT = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], L: ['100', '100', '100', '100', '111'],
  N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], R: ['110', '101', '110', '110', '101'],
  S: ['011', '100', '010', '001', '110'], Y: ['101', '101', '010', '010', '010'],
  '-': ['000', '000', '111', '000', '000'], ' ': ['000', '000', '000', '000', '000'],
  1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'],
};
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
function text(cv, str, x, y, c, sc = 2) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const gl = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) {
      if (gl[r][k] === '1') rect(cv, cx + k * sc, y + r * sc, sc, sc, c);
    }
    cx += 4 * sc;
  }
}
const WHITE = [230, 232, 245];

{
  const cv = makeCanvas(1972, 420);
  VARIANTS.forEach((v, i) => {
    const x = 10 + i * 490;
    rect(cv, x, 34, 480, 376, [10, 10, 30]);
    frame(cv, x, 34, 480, 376, [60, 62, 90]);
    text(cv, v.label, x + 6, 14, WHITE, 2);
    const def = { ...CAND_C, rig: v.rig };
    renderBoss(cv, def, { ...CAND_C.tier, spriteScale: v.scale }, x + 240, 34 + 176);
    blitSimple(cv, PLAYER_SPRITES[2], x + 228, 34 + 314, 3);
  });
  writePng(cv, path.join(HERE, 'maou-trueC-variants.png'));
}

// 球と眼だけを拡大（質感そのものを見る）
{
  const cv = makeCanvas(700, 520);
  text(cv, 'ORB - EYE', 12, 12, WHITE, 3);
  renderBoss(cv, { ...CAND_C, rig: [ORB, EYE] }, CAND_C.tier, 350, 270,
    { scaleOverride: 15, glow: false });
  writePng(cv, path.join(HERE, 'maou-trueC-orb.png'));
}

for (const v of VARIANTS) {
  let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
  for (const p2 of v.rig) {
    const sp = CAND_C.sprites[p2.tex];
    const w = sp.rows[0].length, h = sp.rows.length;
    l = Math.min(l, -w / 2); r = Math.max(r, w / 2);
    t = Math.min(t, -h / 2); b = Math.max(b, h / 2);
  }
  console.log(`  ${v.label}: ${Math.round((r - l) * v.scale)}×${Math.round((b - t) * v.scale)} px`);
}
