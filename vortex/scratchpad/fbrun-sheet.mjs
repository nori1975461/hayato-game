// 正面・背中の小走り 4 コマ＋背中の投げたあと（follow）の絵の一覧。node vortex/scratchpad/fbrun-sheet.mjs out.png [scale]
import fs from 'node:fs';
import zlib from 'node:zlib';
import { HERO_FRAMES } from '../src/data/hero.js';
const BG = [0x0a, 0x0a, 0x1e];
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function canvas(w, h) { const px = new Uint8Array(w * h * 3); for (let i = 0; i < w * h; i++) px.set(BG, i * 3); return { w, h, px }; }
function blit(cv, { rows, palette }, ox, oy, s) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    const col = hex(palette[ch]);
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const X = ox + x * s + dx, Y = oy + y * s + dy; if (X >= 0 && X < cv.w && Y >= 0 && Y < cv.h) cv.px.set(col, (Y * cv.w + X) * 3); }
  }));
}
function line(cv, x0, y0, x1, y1, col) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) cv.px.set(col, (y * cv.w + x) * 3); }
const T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = (b) => { let c = -1; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function writePng(cv, file) {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) { raw[y * (cv.w * 3 + 1)] = 0; raw.set(cv.px.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), y * (cv.w * 3 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const S = Number(process.argv[3] || 3), CW = 20 * S + 9, CH = 18 * S + 9, N = 6;
const rows = [
  ['idle', 'walk1', 'walk2', 'walk1', 'walk2', 'idle'],                       // 旧 正面（2 コマの足踏み）
  ['idle', 'run1', 'run2', 'run3', 'run4', 'idle'],                           // 正面の小走り
  ['back_idle', 'back_walk1', 'back_walk2', 'back_walk1', 'back_walk2', 'back_idle'],
  ['back_idle', 'back_run1', 'back_run2', 'back_run3', 'back_run4', 'back_idle'],   // 背中の小走り
  ['back_r_knee3', 'back_r_step', 'back_r_follow', 'back_l_knee3', 'back_l_step', 'back_l_follow'],   // 背中の投げ（右腕・左腕）
].map((r) => r.map((k) => { if (!HERO_FRAMES[k]) throw new Error('no frame ' + k); return HERO_FRAMES[k]; }));
const cv = canvas(CW * N + 9, CH * rows.length + 9);
rows.forEach((r, j) => { r.forEach((sp, i) => blit(cv, sp, 9 + i * CW, 9 + j * CH, S)); line(cv, 9, 9 + j * CH + 18 * S, 9 + CW * N - 9, 9 + j * CH + 18 * S, [0x40, 0x40, 0x60]); });
writePng(cv, process.argv[2]);
console.log('wrote', process.argv[2], cv.w + 'x' + cv.h);
