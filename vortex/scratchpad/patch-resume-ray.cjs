// resume-gaika-now.mjs＝118〜123 を 09-23 00:10 の既定（波動 16）へ固定・124/125（レーザー）を登録。check-gaika2-def53 の FINAL を 120 へ。
const fs = require('fs');
const P = __dirname + '/resume-gaika-now.mjs';
let t = fs.readFileSync(P, 'utf8');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 50)); t = t.replace(a, () => b); };
rep("{ const B = { ...M.GAIKA2_FINAL_OPT.openGun };",
  "{ const B = { kind: 'saber', style: 'pulse', barrel: 20, gapPulse: 0.65, chamber: true, grow: 0.7, tipBurst: 16 };   // 09-23 00:10 の既定（波動 16）に固定＝10:50 に既定が 20 へ動いても 118〜123 の絵は変わらない");
rep("118: { label: '118 FINAL: GROW + TIP BURST 16', jp: '⭐最終形態の既定（09-22 23:50）＝育つ 0.7＋いちばん先で波動（半径 16）', o: { ...M.GAIKA2_FINAL_OPT } },",
  "118: { label: '118 GROW + TIP BURST 16', jp: '09-23 00:10 の既定＝育つ 0.7＋いちばん先で波動（半径 16）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B } } },");
rep("120: { label: '120 TIP BURST 20 (BIGGER)', jp: '波動を大きく（半径 20）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, tipBurst: 20 } } },",
  "120: { label: '120 FINAL: TIP BURST 20', jp: '⭐最終形態の既定（09-23 10:50「波動の形は５の大きい波動」）＝育つ 0.7＋波動 20', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, tipBurst: 20 } } },");
rep("  }); }\n",
  `  }); }
// ⭐09-23 10:50 ユーザー「飛ぶ弾は 弾が一個ずつ飛ぶのではなく 波動から敵めがけて一直線にレーザーが飛ぶビジュアルにして。波動はあくまで光の集合体にすぎないのだから 弾として発射されるのはおかしい」
//   ＝撃つ瞬間は openGun.ray（連続したレーザー・波動は発射口として残る）。121〜123（弾）は不採用の記録
Object.assign(CANDS, {
  124: { label: '124 FIRING: RAY FROM THE BURST (THIN 2.4)', jp: '撃つ瞬間＝波動から一直線のレーザー（細い・半幅 2.4）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...M.GAIKA2_FINAL_OPT.openGun, ray: { len: 230, w: 2.4 } } } },
  125: { label: '125 FIRING: RAY FROM THE BURST (THICK 3.6)', jp: '撃つ瞬間＝波動から一直線のレーザー（太い・半幅 3.6＝育つ前の光と同じ太さ）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...M.GAIKA2_FINAL_OPT.openGun, ray: { len: 230, w: 3.6 } } } },
});
`);
fs.writeFileSync(P, t);
const D = __dirname + '/check-gaika2-def53.mjs';
let d = fs.readFileSync(D, 'utf8');
if (!d.includes("['GAIKA2_FINAL', GAIKA2_FINAL, 118]")) throw new Error('DEF53_118_NOT_FOUND');
d = d.replace("['GAIKA2_FINAL', GAIKA2_FINAL, 118]", "['GAIKA2_FINAL', GAIKA2_FINAL, 120]").replace('GAIKA2_FINAL＝候補 118', 'GAIKA2_FINAL＝候補 120');
fs.writeFileSync(D, d);
console.log('PATCH_RESUME_RAY_OK');
