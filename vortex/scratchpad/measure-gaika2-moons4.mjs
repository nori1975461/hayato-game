// 月牙を6枚→4枚にしたときの実測。node measure-gaika2-moons4.mjs <札=候補>...
//   ①月牙ごとに、ほかの部品のテクスチャと重なる割合（どの部品と場所を取り合っているか） ②月牙の刃の外接（皆既の輪の試算に使う）
//   ③二つ目の候補があれば、一つ目との画面の差（変わった画素の数・そのうち輪郭＝背景との入れ替わり・変わった先の色の内訳）
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const W = 344, H = 352, CX = W / 2, CY = H / 2 - 13.5;
const place = (d, p) => { const rows = d.sprites[p.tex].rows, w = rows[0].length, h = rows.length, mir = !!p.mirror; return { rows, w, h, mir, x0: Math.round(p.ox - (mir ? 1 - p.origin[0] : p.origin[0]) * w), y0: Math.round(p.oy - p.origin[1] * h) }; };
const at = (m, wx, wy) => { const x = wx - m.x0, y = wy - m.y0; if (y < 0 || y >= m.h || x < 0 || x >= m.w) return '.'; return m.rows[y][m.mir ? m.w - 1 - x : x]; };
const shots = [];
for (const arg of process.argv.slice(2)) {
  const k = arg.indexOf('='), label = arg.slice(0, k), a = arg.slice(k + 1), d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a];
  console.log('■', label);
  const others = d.rig.filter((r) => !r.tex.startsWith('moon') && !['eclipse', 'shellL', 'shellR'].includes(r.tex)).map((r) => ({ tex: r.tex, m: place(d, r) }));
  for (const p of d.rig.filter((r) => r.tex.startsWith('moon'))) {
    const m = place(d, p); let tot = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const hit = {};
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const wx = m.x0 + x, wy = m.y0 + y; if (at(m, wx, wy) === '.') continue;
      tot++; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy);
      for (const o of others) if (at(o.m, wx, wy) !== '.') hit[o.tex] = (hit[o.tex] || 0) + 1;
    }
    const hs = Object.entries(hit).map(([t, n]) => t + ' ' + (100 * n / tot).toFixed(0) + '%').join('  ') || 'なし';
    console.log('  ', (p.tex + (m.mir ? '(画面右)' : '(画面左)')).padEnd(16), '画素', String(tot).padStart(4), ' 外接 x', x0, '〜', x1, ' y', y0, '〜', y1, '（', x1 - x0 + 1, '×', y1 - y0 + 1, '） 重なり:', hs);
  }
  // ④殻の見えている面のうち月牙が占める割合（＝発射架らしさの目安）。上半分（世界 y<−30）と下半分（y≥−30）に分けて出す
  const moons = d.rig.filter((r) => r.tex.startsWith('moon')).map((r) => place(d, r));
  for (const sh of d.rig.filter((r) => r.tex === 'shellL' || r.tex === 'shellR')) {
    const m = place(d, sh), n = { up: 0, lo: 0 }, mo = { up: 0, lo: 0 };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const wx = m.x0 + x, wy = m.y0 + y; if (at(m, wx, wy) === '.' || others.some((o) => at(o.m, wx, wy) !== '.')) continue;
      const k2 = wy < -30 ? 'up' : 'lo'; n[k2]++; if (moons.some((q) => at(q, wx, wy) !== '.')) mo[k2]++;
    }
    console.log('  ', sh.tex, '見えている殻の面  上半分', n.up, 'px（月牙', (100 * mo.up / n.up).toFixed(0) + '%）  下半分', n.lo, 'px（月牙', (100 * mo.lo / Math.max(1, n.lo)).toFixed(0) + '%）  全体の月牙の割合', (100 * (mo.up + mo.lo) / (n.up + n.lo)).toFixed(0) + '%');
  }
  const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, CX, CY, { glow: false }); shots.push({ label, cv });
}
if (shots.length >= 2) {
  const [A, B] = shots, px = (cv, i) => (cv.px[i * 3] << 16) | (cv.px[i * 3 + 1] << 8) | cv.px[i * 3 + 2], bg = px(A.cv, 0);
  let diff = 0, sil = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const to = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = px(A.cv, i), b = px(B.cv, i); if (a === b) continue;
    diff++; if ((a === bg) !== (b === bg)) sil++; const key = '#' + b.toString(16).padStart(6, '0'); to[key] = (to[key] || 0) + 1;
    x0 = Math.min(x0, x - CX); x1 = Math.max(x1, x - CX); y0 = Math.min(y0, y - CY); y1 = Math.max(y1, y - CY);
  }
  console.log('■ 画面の差（' + A.label + ' → ' + B.label + '）＝変わった画素', diff, ' うち輪郭（背景との入れ替わり）', sil, ' 範囲 世界 x', x0, '〜', x1, ' y', y0, '〜', y1);
  console.log('   変わった先の色:', Object.entries(to).sort((p, q) => q[1] - p[1]).slice(0, 8).map(([c, n]) => c + '×' + n).join('  '));
}
