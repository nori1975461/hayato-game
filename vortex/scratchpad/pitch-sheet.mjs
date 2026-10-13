// 投手のフォームの絵（第 2 版）の比較シート。使い方: node pitch-sheet.mjs <out.png> <旧 hero.js> [倍率]
//   行＝旧 横顔（膝 1〜3・踏み込み・蹴り上げ）／新 横顔 右・左（lift1〜3・stride1・2・release・kick・settle）／旧 背中／新 背中 右腕・左腕／旧 正面／新 正面 右腕・左腕
import fs from 'node:fs';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { HERO_FRAMES } from '../src/data/hero.js';
const OLD = process.argv[3] ? (await import(pathToFileURL(process.argv[3]).href)).HERO_FRAMES : null;
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
const S = Number(process.argv[4] || 3), CW = 20 * S + 9, CH = 18 * S + 9, N = 8;
const P = ['lift1', 'lift2', 'lift3', 'stride1', 'stride2', 'release', 'kick', 'settle'];
const rows = [];
if (OLD) rows.push(['side_r_knee1', 'side_r_knee2', 'side_r_knee3', 'side_r_stride', 'side_r_stride', 'side_r_stride', 'side_r_kick', 'side_r_stand'].map((k) => OLD[k]));
rows.push(P.map((p) => HERO_FRAMES[`side_r_${p}`]));
rows.push(P.map((p) => HERO_FRAMES[`side_l_${p}`]));
if (OLD) rows.push(['back_r_knee1', 'back_r_knee2', 'back_r_knee3', 'back_r_knee3', 'back_r_step', 'back_r_step', 'back_r_lift', 'back_r_stand'].map((k) => OLD[k]));
rows.push(P.map((p) => HERO_FRAMES[`back_r_${p}`]));
rows.push(P.map((p) => HERO_FRAMES[`back_l_${p}`]));
if (OLD) rows.push(['r_knee1', 'r_knee2', 'r_knee3', 'r_knee3', 'r_step', 'r_step', 'r_lift', 'r_stand'].map((k) => OLD[k]));
rows.push(P.map((p) => HERO_FRAMES[`r_${p}`]));
rows.push(P.map((p) => HERO_FRAMES[`l_${p}`]));
const cv = canvas(CW * N + 9, CH * rows.length + 9);
rows.forEach((r, j) => { r.forEach((sp, i) => { if (sp) blit(cv, sp, 9 + i * CW, 9 + j * CH, S); }); line(cv, 9, 9 + j * CH + 18 * S, 9 + CW * N - 9, 9 + j * CH + 18 * S, [0x40, 0x40, 0x60]); });
writePng(cv, process.argv[2]);
console.log('wrote', process.argv[2], cv.w + 'x' + cv.h);
