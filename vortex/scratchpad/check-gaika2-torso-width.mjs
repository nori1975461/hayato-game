// 胴の輪郭の幅を高さごとに、基準（既定＝第44稿のザク版 GAIKA2_ZAKU）と比べる。node check-gaika2-torso-width.mjs [候補の JSON | export 名=GAIKA2] [基準の export 名=GAIKA2_ZAKU]
//   FB「胴が大きい」を二度受けている＝ひねりで輪郭を広げない。Δ幅（px・両側の合計）の最大が 2 以下なら WIDTH_OK
import * as M from './gaika-candidates.mjs';
const a = process.argv[2] || 'GAIKA2', d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], base = M[process.argv[3] || 'GAIKA2_ZAKU'];
const span = (t, wy) => { const r = t.sprites.torso.rows[wy + 58], W = r.length, i = r.search(/[^.]/); if (i < 0) return 0; let b = W - 1; while (r[b] === '.') b--; return b - i + 1; };
let s = '', max = -99; for (let wy = -40; wy <= 36; wy += 2) { const dv = span(d, wy) - span(base, wy); if (dv) s += wy + ':' + (dv > 0 ? '+' : '') + dv + ' '; max = Math.max(max, dv); }
const area = (t) => t.sprites.torso.rows.reduce((n, r) => n + r.replace(/\./g, '').length, 0);
console.log(max <= 2 ? 'WIDTH_OK' : 'WIDTH_NG', '最大 Δ幅', max, '/ 塗り', area(d), '（基準', area(base) + '）', '/ 差のある高さ y:Δ →', s || 'なし');
