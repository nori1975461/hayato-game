// node render-gaika2-colors.mjs  ->  gaika2-colors.png (640x360, GAIKA2_COLORS side by side)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { bbox, validate } from './god-raster.mjs';
import { rect, text, BGC, DIM } from './gods-sheet.mjs';
import { GAIKA2_COLORS } from './gaika-candidates.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(HERE, 'gaika2-colors.png');
const cells = GAIKA2_COLORS, cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
const CW = 640 / cells.length;
const S = Math.min(2, ...cells.map(([d]) => { const b = bbox(d); return Math.min(336 / b.h, (CW - 4) / b.w); }));
cells.forEach(([d, l], i) => { validate(d); const b = bbox(d); renderBoss(cv, d, { ...d.tier, spriteScale: S }, CW / 2 + i * CW - ((b.l + b.r) / 2) * S, 188 - ((b.t + b.b) / 2) * S); text(cv, l, 6 + i * CW, 6, DIM, 1); });
writePng(cv, out); console.log('WROTE', out, 'S', S.toFixed(2));
