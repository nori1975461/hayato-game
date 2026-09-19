// 手（主腕の手首から先）がスカートに触れていないかの検査（第35稿 FB「両手をスカートに触れないように」）。node check-gaika2-handskirt.mjs [export 名 | JSON] [設計ファイル]
//   腕のテクスチャのうち世界 y>=12・|x| 40〜100 の画素について、スカート（pedestal）の塗りが 2px 以内にあれば「接触」と数える。0 が正
const M = await import(process.argv[3] || './gaika-candidates.mjs');
const arg = process.argv[2] || 'GAIKA2', d = arg.startsWith('{') ? M.gaika2With(JSON.parse(arg)) : M[arg];   // export 名か、gaika2With へ渡す JSON
const part = (tex) => { const p = d.rig.find((r) => r.tex === tex), rows = d.sprites[tex].rows, W = rows[0].length, H = rows.length; return { rows, x0: Math.round(p.ox - p.origin[0] * W), y0: Math.round(p.oy - p.origin[1] * H), W, H }; };
const A = part('arms'), S = part('pedestal');
const skirt = (wx, wy) => { const ch = S.rows[wy - S.y0]?.[wx - S.x0]; return !!ch && ch !== '.'; };
let touch = 0, minGap = 99; const hits = [];
for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
  if (A.rows[y][x] === '.') continue;
  const wx = A.x0 + x, wy = A.y0 + y; if (wy < 12 || Math.abs(wx) < 40 || Math.abs(wx) > 100) continue;
  for (let g = 0; g <= 12; g++) { let found = false; for (let dy = -g; dy <= g && !found; dy++) for (let dx = -g; dx <= g && !found; dx++) if (skirt(wx + dx, wy + dy)) found = true; if (found) { if (g < minGap) minGap = g; if (g <= 2) { touch++; if (hits.length < 6) hits.push([wx, wy]); } break; } }
}
console.log((touch ? 'HANDSKIRT_NG' : 'HANDSKIRT_OK'), 'touch(<=2px)', touch, '/ 最小の隙間', minGap, 'px', hits.length ? JSON.stringify(hits) : '');
