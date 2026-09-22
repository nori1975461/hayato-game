// 三本目の腕の刃の色を選ぶための実測。「その色が機体のほかの場所にどれだけあるか」＝埋もれ度。
//   ①肩の腕を出していない最終形態（thirdArm:false）の全スプライトの色を数える＝機体のほかの場所の色
//   ②色の組ごとに、その4色が①に占める割合を出す（多いほど刃が埋もれる）
//   ③刃そのものの画素数と、刃の色の平均の明るさも出す
//   node measure-gaika2-blade-tone.mjs mag gold silver blue red
import * as M from './gaika-candidates.mjs';
const SCH = { red: ['W', 'A', 'R', 'r'], blue: ['C', 'N', 'P', 'Q'], gold: ['W', 'G', 'Y', 'y'], mag: ['Z', 'z', 'X', 'x'], silver: ['n', 's', 'f', 'm'] };
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const hist = (d) => { const h = {}; let n = 0; for (const v of Object.values(d.sprites)) for (const row of v.rows) for (const ch of row) if (ch !== '.') { h[ch] = (h[ch] || 0) + 1; n++; } return { h, n }; };

const bare = hist(M.gaika2With({ ...M.GAIKA2_FINAL_OPT, thirdArm: false }));
console.log('機体のほかの場所（肩の腕なし）の塗り画素', bare.n);
for (const tone of process.argv.slice(2)) {
  const cs = SCH[tone]; if (!cs) { console.log(tone, '?'); continue; }
  const mine = cs.reduce((s, c) => s + (bare.h[c] || 0), 0);
  const withB = hist(M.gaika2With({ ...M.GAIKA2_FINAL_OPT, openGun: { kind: 'saber', tone } }));
  const blade = cs.reduce((s, c) => s + ((withB.h[c] || 0) - (bare.h[c] || 0)), 0);
  const L = (lum(rgb(M.PAL[cs[0]])) + lum(rgb(M.PAL[cs[1]]))) / 2;
  console.log(tone.padEnd(7), '同系色が機体のほかにある画素', String(mine).padStart(5), '＝', ((mine / bare.n) * 100).toFixed(2).padStart(5) + '%',
    ' 刃が足す画素', String(blade).padStart(4), ' 刃の明るい2色の平均の明るさ', L.toFixed(0).padStart(3));
}
