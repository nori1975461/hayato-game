// 第23稿：機体の塗りだけを色相で数える（後光は除く）。node measure-gaika2-colors.mjs
//   「赤が多すぎてくどい」を面積で確かめるための物差し。黒鉄は青みがかっているので彩度 0.47 未満は無彩色に寄せる
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { bbox } from './god-raster.mjs';
import { GAIKA2_COLORS } from './gaika-candidates.mjs';
const BG = [0x0a, 0x0a, 0x1e];
function tally(d) {
  const cv = makeCanvas(640, 360), b = bbox(d), S = Math.min(2, 340 / b.h, 620 / b.w);
  renderBoss(cv, d, { ...d.tier, glowScale: 0, spriteScale: S }, 320 - ((b.l + b.r) / 2) * S, 186 - ((b.t + b.b) / 2) * S);
  const c = { red: 0, mag: 0, amber: 0, blue: 0, violet: 0, neutral: 0, bg: 0 };
  for (let i = 0; i < 640 * 360; i++) {
    const r = cv.px[i * 3], g = cv.px[i * 3 + 1], bl = cv.px[i * 3 + 2];
    if (Math.abs(r - BG[0]) < 3 && Math.abs(g - BG[1]) < 3 && Math.abs(bl - BG[2]) < 3) { c.bg++; continue; }
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (v < 0.10 || s < 0.47) { c.neutral++; continue; }
    let h; const dd = mx - mn;
    if (mx === r) h = 60 * (((g - bl) / dd) % 6); else if (mx === g) h = 60 * ((bl - r) / dd + 2); else h = 60 * ((r - g) / dd + 4);
    if (h < 0) h += 360;
    if (h >= 300 && h < 348) c.mag++; else if (h < 22 || h >= 348) c.red++; else if (h < 70) c.amber++; else if (h >= 160 && h < 265) c.blue++; else if (h >= 265) c.violet++; else c.neutral++;
  }
  const tot = 640 * 360 - c.bg;
  return `${(c.red / tot * 100).toFixed(1).padStart(5)}  ${(c.amber / tot * 100).toFixed(1).padStart(5)}  ${(c.mag / tot * 100).toFixed(1).padStart(5)}  ${(c.blue / tot * 100).toFixed(1).padStart(5)}  ${(c.neutral / tot * 100).toFixed(1).padStart(5)}   ${(tot / 2304).toFixed(1)}%`;
}
console.log('                          RED  AMBER    MAG   BLUE  NEUTR   INK');
for (const [d, l] of GAIKA2_COLORS) console.log('23rd ' + l.slice(0, 18).padEnd(18) + tally(d));
