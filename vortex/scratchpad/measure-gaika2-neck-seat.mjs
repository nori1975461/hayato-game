// 蒼神骸華 第二案：首の装甲の案ごとに「胴のスプライトで変わった画素・深紅の画素」を、座の案ごとに「一番下の座のスプライトの色ごとの画素」を数える（2026-09-20 22:07 の FB への見比べの裏づけ）。
//   node measure-gaika2-neck-seat.mjs
import * as M from './gaika-candidates.mjs';
const BASE = { kit: 'launcher', foreTurn: [20, 35], subStraight: true, stowed: true, thirdArm: false, subBehind: true, dormantX: 'sliverEmber', subBoom: true, subBlade: 'eclipse', shoulder: { edge: 'none', bands: false, flare: 5, topW: 9, scale: 0.88, dx: 7, accent: ['chamfer', 'fin'] }, collar: {}, head: { cheek: 'steel', top: 'mast' } };
const count = (rows, set) => rows.reduce((n, r) => n + [...r].filter((ch) => set.includes(ch)).length, 0);
const diff = (a, b) => a.reduce((n, r, y) => n + [...r].filter((ch, x) => ch !== b[y][x]).length, 0);
const none = M.gaika2With({ ...BASE, collar: 'none' }).sprites.torso.rows;
console.log('--- 首の装甲（胴のスプライト。襟なしを 0 として、増えた画素と深紅の画素）');
for (const [name, collar] of [['4 首の装甲＋灯 (-45.5)', {}], ['低い (-41)', { top: -41 }], ['もっと低い (-38)', { top: -38 }], ['5 襟なし', 'none']]) {
  const rows = M.gaika2With({ ...BASE, collar }).sprites.torso.rows;
  console.log(name.padEnd(24), '変わった画素', String(diff(rows, none)).padStart(4), ' 深紅(R/r/A)', String(count(rows, 'RrA') - count(none, 'RrA')).padStart(3));
}
console.log('--- 一番下の座（moonX のスプライト。色ごとの画素）');
for (const [name, dormantX] of [['鋼 (fill 0)', 'sliver'], ['満ちかけ 0.2', { c: 'm', fill: 0.2 }], ['満ちかけ 0.3', { c: 'm', fill: 0.3 }], ['満ちかけ 0.45', { c: 'm', fill: 0.45 }], ['深紅 (fill 1)', 'sliverEmber'], ['蝕の繊月', { c: 'r', core: 'k' }]]) {
  const rows = M.gaika2With({ ...BASE, dormantX }).sprites.moonX.rows;
  console.log(name.padEnd(16), '鋼 m', String(count(rows, 'm')).padStart(3), ' 深紅 r', String(count(rows, 'r')).padStart(3), ' 黒 k', String(count(rows, 'k')).padStart(3));
}
