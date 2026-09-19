// 手（主腕の肘から先）とスカートの重なりの検査。node check-gaika2-handskirt.mjs [export 名 | JSON] [設計ファイル]
//   第35稿 FB「両手をスカートに触れないように」→ ⚠️第47稿 FB「手がスカートに少しかかってしまってもいい」で縛りが緩んだ＝触れてよいが「少し」まで。
//   腕のテクスチャのうち世界 y>=8・|x| 25〜100 の画素について、スカート（pedestal）の上に乗る割合を左右の手ごとに数える。
//   目安＝どちらの手も 25% 以下・胴の陰に隠れる画素が 0 で HANDSKIRT_OK（胴は腕より手前に描かれるので、隠れると指が欠けて見える）
const M = await import(process.argv[3] || './gaika-candidates.mjs');
const arg = process.argv[2] || 'GAIKA2', d = arg.startsWith('{') ? M.gaika2With(JSON.parse(arg)) : M[arg];   // export 名か、gaika2With へ渡す JSON
const part = (tex) => { const p = d.rig.find((r) => r.tex === tex), rows = d.sprites[tex].rows, W = rows[0].length, H = rows.length; return { rows, x0: Math.round(p.ox - p.origin[0] * W), y0: Math.round(p.oy - p.origin[1] * H), W, H }; };
const A = part('arms'), S = part('pedestal'), T = part('torso');
const on = (P, wx, wy) => { const ch = P.rows[wy - P.y0]?.[wx - P.x0]; return !!ch && ch !== '.'; };
let ok = true; const out = [];
for (const side of [-1, 1]) {
  let over = 0, hid = 0, tot = 0;
  for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) { if (A.rows[y][x] === '.') continue; const wx = A.x0 + x, wy = A.y0 + y; if (wy < 8 || wx * side < 25 || wx * side > 100) continue; tot++; if (on(T, wx, wy)) hid++; else if (on(S, wx, wy)) over++; }
  const pct = Math.round((over / Math.max(1, tot)) * 100); if (pct > 25 || hid > 0) ok = false;
  out.push((side < 0 ? '画面左（開いた手）' : '画面右（握る手）') + ' かかる ' + over + 'px＝' + pct + '%' + (hid ? ' / 胴の陰 ' + hid + 'px' : ''));
}
console.log(ok ? 'HANDSKIRT_OK' : 'HANDSKIRT_NG', out.join(' ／ '), '（目安＝25% 以下・胴の陰 0）');
