// 主人公の向き（正面・背中・横顔）の絵を実プレイの等倍（3 倍）で並べて PNG にする。使い方: node hero-facing-sheet.mjs <out.png>
import fs from 'node:fs';
import zlib from 'node:zlib';
import { HERO_FRAMES } from '../src/data/hero.js';

const BG = [0x0a, 0x0a, 0x1e];
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 3);
  return { w, h, px };
}
function blit(cv, { rows, palette }, ox, oy, s) {
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.') return;
    const col = hex(palette[ch]);
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const X = ox + x * s + dx, Y = oy + y * s + dy;
      if (X >= 0 && X < cv.w && Y >= 0 && Y < cv.h) cv.px.set(col, (Y * cv.w + X) * 3);
    }
  }));
}
const T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = (b) => { let c = -1; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function writePng(cv, file) {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) { raw[y * (cv.w * 3 + 1)] = 0; raw.set(cv.px.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), y * (cv.w * 3 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const S = 3, CW = 20 * S + 9, CH = 18 * S + 9;
const rows = [
  ['idle', 'walk1', 'walk2', 'r_stand', 'r_knee3', 'r_step', 'r_lift', 'l_knee3'],
  ['back_idle', 'back_walk1', 'back_walk2', 'back_r_stand', 'back_r_knee3', 'back_r_step', 'back_r_lift', 'back_l_knee3'],
  ['side_r_idle', 'side_r_walk1', 'side_r_walk2', 'side_r_stand', 'side_r_knee3', 'side_r_step', 'side_r_lift', 'side_r_knee1'],
  ['side_l_idle', 'side_l_walk1', 'side_l_walk2', 'side_l_stand', 'side_l_knee3', 'side_l_step', 'side_l_lift', 'side_l_knee1'],
  ['side_r_stride', 'side_r_kick', 'side_l_stride', 'side_l_kick', 'side_r_knee3', 'side_r_idle', 'idle', 'back_idle'],
];
const cv = canvas(CW * 8 + 9, CH * rows.length + 9);
rows.forEach((r, j) => r.forEach((k, i) => { if (!HERO_FRAMES[k]) throw new Error('no frame ' + k); blit(cv, HERO_FRAMES[k], 9 + i * CW, 9 + j * CH, S); }));
writePng(cv, process.argv[2]);
console.log('wrote', process.argv[2], cv.w + 'x' + cv.h);
