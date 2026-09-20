// 腕まわりの「ごちゃつき」を数える。node measure-gaika2-clutter.mjs <札=候補>...
//   ①腕の密集地帯（世界 |x| 28〜165・y −45〜60）で、隣り合う画素の色が変わる回数（100 画素あたり）＝線と色面の細かさ ②同じ地帯の色数 ③腕のテクスチャが月牙を隠す割合
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const W = 344, H = 352, CX = W / 2, CY = H / 2 - 13.5, Z = { x0: 28, x1: 165, y0: -45, y1: 60 };
for (const arg of process.argv.slice(2)) {
  const k = arg.indexOf('='), label = arg.slice(0, k), a = arg.slice(k + 1), d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a];
  const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false });
  const px = (x, y) => { const i = (y * W + x) * 3; return (cv.px[i] << 16) | (cv.px[i + 1] << 8) | cv.px[i + 2]; };
  let tr = 0, area = 0; const cols = new Set();
  for (let wy = Z.y0; wy < Z.y1; wy++) for (const sgn of [-1, 1]) for (let ax = Z.x0; ax < Z.x1; ax++) {
    const x = Math.round(CX + sgn * ax), y = Math.round(CY + wy); if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
    const c = px(x, y); area++; cols.add(c); if (c !== px(x + 1, y)) tr++; if (c !== px(x, y + 1)) tr++;
  }
  const place = (p) => { const rows = d.sprites[p.tex].rows, w = rows[0].length, h = rows.length, mir = !!p.mirror; return { rows, w, h, mir, x0: Math.round(p.ox - (mir ? 1 - p.origin[0] : p.origin[0]) * w), y0: Math.round(p.oy - p.origin[1] * h) }; };
  const A = place(d.rig.find((r) => r.tex === 'arms')), arm = (wx, wy) => { const ch = A.rows[wy - A.y0]?.[wx - A.x0]; return !!ch && ch !== '.'; };
  const hid = [];
  for (const p of d.rig.filter((r) => r.tex.startsWith('moon') && r.tex !== 'moonB')) { const m = place(p); let n = 0, tot = 0; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { if (m.rows[y][m.mir ? m.w - 1 - x : x] === '.') continue; tot++; if (arm(m.x0 + x, m.y0 + y)) n++; } hid.push(p.tex.slice(4) + (m.mir ? '右' : '左') + ' ' + Math.round((100 * n) / tot) + '%'); }
  console.log(label.padEnd(26), '色の変わり目', (100 * tr / area).toFixed(1), '/100px  色数', String(cols.size).padStart(2), ' 月牙の隠れ', hid.join(' '));
}
