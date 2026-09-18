// 骸華のパーツを1つだけ単体で見る（640×360 以下）。node scratchpad/render-gaika-part.mjs <tex名> [out.png] [scale]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, DIM } from './gods-sheet.mjs';
import { GAIKA, GAIKA2 } from './gaika-candidates.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const tex = process.argv[2] || 'mandorla', out = process.argv[3] || path.join(HERE, `gaika-part-${tex}.png`);
const sp = GAIKA.sprites[tex] || GAIKA2.sprites[tex]; if (!sp) throw new Error('tex なし: ' + tex);
const w = sp.rows[0].length, h = sp.rows.length, S = Number(process.argv[4]) || Math.max(1, Math.floor(Math.min(620 / w, 330 / h)));
const cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
renderBoss(cv, { id: 'part', sprites: { [tex]: sp }, rig: [{ role: 'body', tex, ox: 0, oy: 0, origin: [0.5, 0.5] }] }, { spriteScale: S }, 320, 188, { glow: false });
text(cv, `${tex.toUpperCase()} ${w}x${h} / x${S}`, 8, 6, DIM, 1);
writePng(cv, out); console.log('WROTE', w + 'x' + h, 'scale', S);
