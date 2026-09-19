// 直前のコミットの設計（.gaika-prev.mjs）と現行を、版ごと・テクスチャごとに突き合わせる。node check-gaika2-vs-prev.mjs
//   先に git show HEAD:vortex/scratchpad/gaika-candidates.mjs > .gaika-prev.mjs。「変えたつもりのない版が 1 ドットも変わっていない」ことの確認に使う
import * as NEW from './gaika-candidates.mjs';
const OLD = await import('./.gaika-prev.mjs');
const PAIRS = (process.argv[2] ? JSON.parse(process.argv[2]) : [['GAIKA2_NZ', 'GAIKA2'], ['GAIKA2_DOM', 'GAIKA2_DOM'], ['GAIKA2_ZAKU', 'GAIKA2_ZAKU'], ['GAIKA2_ZEONG', 'GAIKA2_ZEONG'], ['GAIKA2', 'GAIKA2']]);
for (const [n, o] of PAIRS) {
  const a = NEW[n], b = OLD[o]; if (!a || !b) { console.log(n.padEnd(13), 'vs prev', o, '→ 無い'); continue; }
  const diff = [];
  for (const k of new Set([...Object.keys(a.sprites), ...Object.keys(b.sprites)])) {
    const ra = a.sprites[k]?.rows, rb = b.sprites[k]?.rows; if (!ra || !rb) { diff.push(k + '(有無)'); continue; }
    let n = 0; const H = Math.max(ra.length, rb.length); for (let y = 0; y < H; y++) { const W = Math.max(ra[y]?.length || 0, rb[y]?.length || 0); for (let x = 0; x < W; x++) if ((ra[y]?.[x] || '.') !== (rb[y]?.[x] || '.')) n++; }
    if (n || ra.length !== rb.length || ra[0].length !== rb[0].length) diff.push(k + ' ' + n + 'px' + (ra[0].length !== rb[0].length ? '(幅 ' + rb[0].length + '→' + ra[0].length + ')' : ''));
  }
  const rig = JSON.stringify(a.rig.map((r) => ({ ...r, tex: r.tex }))) === JSON.stringify(b.rig.map((r) => ({ ...r, tex: r.tex })));
  console.log(n.padEnd(13), 'vs prev', o.padEnd(13), diff.length ? diff.join(' / ') : 'SAME', rig ? '' : '/ rig 差あり');
}
