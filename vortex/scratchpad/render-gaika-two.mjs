// 蒼神骸華の全体像を 2 体並べる（先端の案を見比べる用）。node scratchpad/render-gaika-two.mjs [A] [D]
//   出力: gaika-two.png（実プレイ等倍 4.2・左右にラベル）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, frame, text, WHITE, DIM, BGC, FR } from './gods-sheet.mjs';
import { GAIKA_RODS, GAIKA_ROD_LABELS } from './gaika-candidates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const keys = (process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'D']).filter((k) => GAIKA_RODS[k]);
const CW = 648, CH = 700, GAP = 12, CY = 404;
const W = GAP + keys.length * (CW + GAP), H = 56 + CH + GAP;
const cv = makeCanvas(W, H);
rect(cv, 0, 0, W, H, BGC);
text(cv, 'SOUSHIN GAIKA / FULL FIGURE / IN GAME SCALE 4.2', GAP, 10, WHITE, 2);
keys.forEach((k, i) => {
  const x = GAP + i * (CW + GAP);
  text(cv, GAIKA_ROD_LABELS[k] || k, x, 34, DIM, 2);
  rect(cv, x, 52, CW, CH, BGC);
  renderBoss(cv, GAIKA_RODS[k], GAIKA_RODS[k].tier, x + CW / 2, 52 + CY);
  frame(cv, x, 52, CW, CH, FR);
});
writePng(cv, path.join(HERE, 'gaika-two.png'));
console.log('TWO_OK ' + keys.join('+') + ' ' + W + 'x' + H);
