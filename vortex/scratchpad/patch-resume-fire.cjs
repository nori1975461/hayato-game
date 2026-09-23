// resume＝124 を旧い太さ 2.4 に固定（既定が 3.6 になったため）・125 は既定を指す＝撃つ瞬間の正典。def53 に GAIKA2_FIRING=125 を足す。
const fs = require('fs');
const P = __dirname + '/resume-gaika-now.mjs';
let t = fs.readFileSync(P, 'utf8');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 50)); t = t.replace(a, () => b); };
rep("124: { label: '124 FIRING: RAY FROM THE BURST (THIN 2.4)', jp: '撃つ瞬間＝波動から一直線のレーザー（細い・半幅 2.4）',",
  "124: { label: '124 REJECTED: THIN RAY (2.4)', jp: '落とした案＝細いレーザー（半幅 2.4・09-23 11:12 に太い方を採用）',");
rep("125: { label: '125 FIRING: RAY FROM THE BURST (THICK 3.6)', jp: '撃つ瞬間＝波動から一直線のレーザー（太い・半幅 3.6＝育つ前の光と同じ太さ）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...M.GAIKA2_FINAL_OPT.openGun, ray: { len: 230, w: 3.6 } } } },",
  "125: { label: '125 FIRING (FIXED): THICK RAY 3.6', jp: '⭐撃つ瞬間の確定（09-23 11:12）＝波動から一直線の太いレーザー（半幅 3.6＝GAIKA2_FIRING）', o: { ...M.GAIKA2_FIRING_OPT } },");
fs.writeFileSync(P, t);
const D = __dirname + '/check-gaika2-def53.mjs';
let d = fs.readFileSync(D, 'utf8');
if (!d.includes("['GAIKA2_FINAL', GAIKA2_FINAL, 120]")) throw new Error('DEF53_120_NOT_FOUND');
d = d.replace("import { GAIKA2, GAIKA2_KEYDOWN, GAIKA2_FINAL, gaika2With }", "import { GAIKA2, GAIKA2_KEYDOWN, GAIKA2_FINAL, GAIKA2_FIRING, gaika2With }")
  .replace("['GAIKA2_FINAL', GAIKA2_FINAL, 120]", "['GAIKA2_FINAL', GAIKA2_FINAL, 120], ['GAIKA2_FIRING', GAIKA2_FIRING, 125]")
  .replace('GAIKA2_FINAL＝候補 120', 'GAIKA2_FINAL＝候補 120／GAIKA2_FIRING＝候補 125（撃つ瞬間＝太いレーザー）');
fs.writeFileSync(D, d);
console.log('PATCH_RESUME_FIRE_OK');
