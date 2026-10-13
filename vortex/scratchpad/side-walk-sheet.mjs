// 横顔の歩きの比較シート（旧 2 コマ／新 3 コマ×前傾 3 段・右向きと左向き）を実プレイの等倍（3 倍）で PNG にする
//   使い方: node side-walk-sheet.mjs <out.png> [<旧 hero.js のパス>]
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
const S = Number(process.argv[4] || 3), CW = 20 * S + 9, CH = 18 * S + 9;
const rows = [];
if (OLD) rows.push([OLD.side_r_walk1, OLD.side_r_walk2, OLD.side_r_walk1, OLD.side_r_walk2, null, OLD.side_l_walk1, OLD.side_l_walk2, OLD.side_l_walk1, OLD.side_l_walk2]);   // 旧＝開く・閉じる
for (const ln of ['lean0_', '', 'lean2_']) {   // 新＝前傾 なし／弱（既定）／強。1→2→3→2 の順に並べる
  const f = (side, n) => HERO_FRAMES[`side_${side}_${ln}walk${n}`];
  rows.push([f('r', 1), f('r', 2), f('r', 3), f('r', 2), null, f('l', 1), f('l', 2), f('l', 3), f('l', 2)]);
}
rows.push([HERO_FRAMES.side_r_idle, null, null, null, null, HERO_FRAMES.side_l_idle, null, null, null]);   // 立ち姿（比べる用）
const cv = canvas(CW * 9 + 9, CH * rows.length + 9);
rows.forEach((r, j) => { r.forEach((sp, i) => { if (sp) blit(cv, sp, 9 + i * CW, 9 + j * CH, S); }); line(cv, 9, 9 + j * CH + 18 * S, 9 + CW * 9 - 9, 9 + j * CH + 18 * S, [0x40, 0x40, 0x60]); });   // 床の線
writePng(cv, process.argv[2]);
console.log('wrote', process.argv[2], cv.w + 'x' + cv.h, 'rows', rows.length);
