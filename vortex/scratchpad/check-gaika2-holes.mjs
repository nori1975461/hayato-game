// 背景が透ける抜けの検査：胴のまわり（|x|<=60・世界 y −40〜40）で、どのテクスチャにも覆われない点を、既定（Z2＝ザク型のひねり・第45稿〜）と比較用の四版それぞれ数える。node check-gaika2-holes.mjs
//   胴を細くすると、殻や腕がたまたま覆っていない 1〜3 ドットの隙間が背景まで抜ける（第44稿でドム版 6・ザク版 4 が出た）。
//   ジオング版は細い旋回円筒の両脇が空間として抜けるのが仕様（第44稿で 148）。それ以外は 0 が正。
//   ⚠️第53稿（2026-09-21・襟なし collar:'none' が既定）から Z2 に 30 が出る＝首の両脇の切り欠きで仕様。
//     全身で実際に描くと透けるのは頭の脇で、襟ありの 680 に対し 1234 px（node check-gaika2-fullbody-holes.mjs で実測・胸の弱点は 0）。
//   .gaika-prev.mjs（git show HEAD:vortex/scratchpad/gaika-candidates.mjs > .gaika-prev.mjs）があれば、直前のコミットの値も並べる
import { existsSync } from 'node:fs';
import * as NEW from './gaika-candidates.mjs';
const OLD = existsSync(new URL('./.gaika-prev.mjs', import.meta.url)) ? await import('./.gaika-prev.mjs') : null;
const holes = (d) => {
  const out = [];
  for (let wy = -40; wy <= 40; wy++) for (let wx = -60; wx <= 60; wx++) {
    let hit = false;
    for (const p of d.rig) {
      const rows = d.sprites[p.tex].rows, W = rows[0].length, H = rows.length, cy = Math.round(wy - (p.oy - p.origin[1] * H));
      const cx = p.mirror ? Math.round((p.ox + p.origin[0] * W) - wx) - 1 : Math.round(wx - (p.ox - p.origin[0] * W));
      const ch = rows[cy]?.[cx];
      if (ch && ch !== '.') { hit = true; break; }
    }
    if (!hit) out.push([wx, wy]);
  }
  return out;
};
const box = (h) => (h.length ? 'x ' + Math.min(...h.map((p) => p[0])) + '..' + Math.max(...h.map((p) => p[0])) + ' y ' + Math.min(...h.map((p) => p[1])) + '..' + Math.max(...h.map((p) => p[1])) : '-');
let ok = true; const sum = [];
for (const [label, n, allow] of [['Z2', 'GAIKA2', 0], ['NZ', 'GAIKA2_NZ', 0], ['DOM', 'GAIKA2_DOM', 0], ['ZAKU', 'GAIKA2_ZAKU', 0], ['ZEONG', 'GAIKA2_ZEONG', Infinity]]) {
  const h = holes(NEW[n]), prev = OLD && OLD[n] ? holes(OLD[n]).length : null;
  if (h.length > allow) ok = false;
  sum.push(label + ' ' + h.length);
  console.log(label.padEnd(6), 'holes', String(h.length).padStart(4), box(h).padEnd(22), prev === null ? '' : '(直前のコミット ' + prev + ')', h.length && h.length <= 12 ? JSON.stringify(h) : '');
}
console.log((ok ? 'HOLES_OK ' : 'HOLES_NG ') + sum.join(' / ') + '（ジオング版の円筒の両脇は仕様）');
