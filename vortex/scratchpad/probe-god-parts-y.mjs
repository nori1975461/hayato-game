// 2026-09-23 使い捨て：四柱の各パーツが「塗りの外接」の縦のどこを占めるかを割合で出す。
//   「顔は黒のまま・下半身を見せる」窓を当て推量でなく数字で選ぶため。
import { THRONE } from './throne-candidates.mjs';
import { GAIKA } from './gaika-candidates.mjs';
import { CATHEDRAL, MAOU } from '../src/data/enemies.js';
import { PART_DEPTH, PART_ORIGIN } from './render-boss-rig.mjs';

function placed(def, rig) {
  const parts = rig.map((r) => ({ ...r, origin: r.origin || PART_ORIGIN[r.role] || [0.5, 0.5] }));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const out = [];
  for (const p of parts) {
    const sp = def.sprites[p.tex];
    const w = sp.rows[0].length, h = sp.rows.length;
    const left = Math.round(p.ox - (p.mirror ? (1 - p.origin[0]) : p.origin[0]) * w);
    const top = Math.round(p.oy - p.origin[1] * h);
    // そのパーツの「実際に塗ってある」範囲
    let ty = 1e9, by = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sp.rows[y][x] !== '.') { if (y < ty) ty = y; if (y > by) by = y; }
    out.push({ tex: p.tex, top: top + ty, bot: top + by });
    x0 = Math.min(x0, left); y0 = Math.min(y0, top + ty);
    x1 = Math.max(x1, left + w); y1 = Math.max(y1, top + by);
  }
  return { out, y0, H: y1 - y0 + 1 };
}
for (const [name, def, rig] of [
  ['堕天の大聖堂', CATHEDRAL, CATHEDRAL.rig],
  ['腐蝕の玉座', THRONE, THRONE.rig],
  ['軌道神核', { ...MAOU, sprites: MAOU.trueSprites }, MAOU.trueRig],
  ['蒼神骸華 第一案', GAIKA, GAIKA.rig],
]) {
  const { out, y0, H } = placed(def, rig);
  const seen = new Set();
  console.log(`${name}（縦 ${H}）`);
  for (const p of out.sort((a, b) => a.top - b.top)) {
    if (seen.has(p.tex)) continue;
    seen.add(p.tex);
    console.log(`  ${p.tex.padEnd(10)} 上 ${((p.top - y0) / H).toFixed(2)} 〜 下 ${((p.bot - y0 + 1) / H).toFixed(2)}`);
  }
}
