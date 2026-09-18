// 蒼神骸華 第二案の確認（費用規則＝640×360 以下・1案1枚）。node scratchpad/render-gaika2.mjs [out.png] [A|B]
//   左＝比較相手・右＝第二案。scale 2 ≒ 採用時に画面 360 へ収めた倍率
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { bbox, validate } from './god-raster.mjs';
import { rect, text, BGC, DIM } from './gods-sheet.mjs';
import { GAIKA, GAIKA2, GAIKA2_NOMANDORLA } from './gaika-candidates.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(HERE, 'gaika2-sheet.png'), mode = process.argv[3] || 'A';
const cells = mode === 'B' ? [[GAIKA2, '2ND PLAN'], [GAIKA2_NOMANDORLA, '2ND PLAN / NO MANDORLA']] : [[GAIKA, '1ST PLAN (28 REV4)'], [GAIKA2, '2ND PLAN']];
const cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
cells.forEach(([d, l], i) => { validate(d); const b = bbox(d), S = 2; renderBoss(cv, d, { ...d.tier, spriteScale: S }, 160 + i * 320 - ((b.l + b.r) / 2) * S, 186 - ((b.t + b.b) / 2) * S); text(cv, l, 8 + i * 320, 6, DIM, 1); const bb = `${b.w.toFixed(0)}x${b.h.toFixed(0)}`; console.log(d.id, 'bbox', bb, 'l', b.l.toFixed(0), 'r', b.r.toFixed(0), 't', b.t.toFixed(0), 'b', b.b.toFixed(0)); });
writePng(cv, out); console.log('WROTE', out);
