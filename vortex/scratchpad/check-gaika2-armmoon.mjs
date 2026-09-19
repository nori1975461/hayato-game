// 主腕が月牙（確定要素）をどれだけ隠すかを数える（第46稿：肘を外へ出すと三枚目の月牙の座 (±72,−8) に肘の円盤がかぶる）。
//   node check-gaika2-armmoon.mjs [候補の JSON か export 名...]   省くと GAIKA2。基準＝第45稿までの腕 {"elbow":[46,-3],"wrist":[59,11]}。月牙一枚あたりの隠れの増分が 35px（5%）以下で ARMMOON_OK
const M = await import('./gaika-candidates.mjs');
const args = process.argv.slice(2); if (!args.length) args.push('GAIKA2');
const get = (a) => (a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a]);
const covered = (d) => {
  const place = (p) => { const rows = d.sprites[p.tex].rows, W = rows[0].length, H = rows.length, mir = !!p.mirror; return { rows, W, H, mir, x0: Math.round(p.ox - (mir ? 1 - p.origin[0] : p.origin[0]) * W), y0: Math.round(p.oy - p.origin[1] * H) }; };
  const A = place(d.rig.find((r) => r.tex === 'arms'));
  const arm = (wx, wy) => { const ch = A.rows[wy - A.y0]?.[wx - A.x0]; return !!ch && ch !== '.'; };
  const out = {};
  for (const p of d.rig.filter((r) => r.tex.startsWith('moon'))) {
    const m = place(p); let n = 0, tot = 0;
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { const ch = m.rows[y][m.mir ? m.W - 1 - x : x]; if (ch === '.') continue; tot++; if (arm(m.x0 + x, m.y0 + y)) n++; }
    const key = p.tex + (m.mir ? 'R' : 'L'); out[key] = (out[key] ? out[key] + ' ' : '') + n + '/' + tot;
  }
  return out;
};
const base = covered(M.gaika2With({ elbow: [46, -3], wrist: [59, 11] }));
console.log('BASE(旧い肘)', JSON.stringify(base));
for (const a of args) { const c = covered(get(a)); let worst = 0; for (const k of Object.keys(c)) { const A = c[k].split(' ').map((t) => Number(t.split('/')[0])), B = base[k].split(' ').map((t) => Number(t.split('/')[0])); A.forEach((v, i) => { worst = Math.max(worst, v - B[i]); }); } console.log(worst <= 35 ? 'ARMMOON_OK' : 'ARMMOON_NG', a, '最大の増分', worst, 'px', JSON.stringify(c)); }
