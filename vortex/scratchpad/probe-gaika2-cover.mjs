// 世界座標の一点を、どのテクスチャが覆っているかを奥→手前の順に出す。node probe-gaika2-cover.mjs <export 名> <x> <y> [設計ファイル]
//   背景が透ける抜け（胴の脇など）の原因を調べるための道具。mirror の付いたパーツは左右を反転して調べる
const file = process.argv[5] || './gaika-candidates.mjs', M = await import(file);
const d = M[process.argv[2] || 'GAIKA2'], wx = Number(process.argv[3]), wy = Number(process.argv[4]);
for (const p of d.rig) {
  const rows = d.sprites[p.tex].rows, W = rows[0].length, H = rows.length;
  let cx = Math.round(wx - (p.ox - p.origin[0] * W)); const cy = Math.round(wy - (p.oy - p.origin[1] * H));
  if (p.mirror) cx = Math.round((p.ox + p.origin[0] * W) - wx) - 1;
  const ch = rows[cy]?.[cx];
  if (ch && ch !== '.') console.log(p.tex.padEnd(9), ch);
}
console.log('PROBE_END');
