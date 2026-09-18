// 第25稿：二つの版を並べる。node render-gaika2-versions.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { bbox, validate } from './god-raster.mjs';
import { rect, text, BGC, DIM } from './gods-sheet.mjs';
import { GAIKA2, GAIKA2_LEGS } from './gaika-candidates.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(HERE, 'gaika2-versions.png');
const cells = [[GAIKA2, 'A  ROCKET BOOSTER'], [GAIKA2_LEGS, 'B  LEGS']];
const cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
const CW = 320;
const S = Math.min(2, ...cells.map(([d]) => { const b = bbox(d); return Math.min(332 / b.h, (CW - 6) / b.w); }));
cells.forEach(([d, l], i) => { validate(d); const b = bbox(d); renderBoss(cv, d, { ...d.tier, spriteScale: S }, CW / 2 + i * CW - ((b.l + b.r) / 2) * S, 188 - ((b.t + b.b) / 2) * S); text(cv, l, 8 + i * CW, 6, DIM, 1); const bb = `${b.w.toFixed(0)}x${b.h.toFixed(0)}`; text(cv, bb, 8 + i * CW, 348, DIM, 1); });
writePng(cv, out); console.log('VER_OK S', S.toFixed(2));
