// resume-gaika-now.mjs＝既定に追従していた候補 102/117 を旧既定（117 の中身）へ固定し、118〜123（波動）を登録。check-gaika2-def53 の FINAL を 118 へ。
const fs = require('fs');
const P = __dirname + '/resume-gaika-now.mjs';
let t = fs.readFileSync(P, 'utf8');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 50)); t = t.replace(a, () => b); };
const G117 = "openGun: { kind: 'saber', style: 'pulse', barrel: 20, gapPulse: 0.65, chamber: true }";
rep("o: { ...M.GAIKA2_FINAL_OPT, moonsSeated: true, openHole: 'none' } },",
  "o: { ...M.GAIKA2_FINAL_OPT, moonsSeated: true, openHole: 'none', saberLen: 120, " + G117 + " } },   // 09-22 23:50 既定が 118 になったので 117 の武器へ固定");
rep("jp: '⭐最終形態の確定版（09-22 23:22）＝砲身（薬室＋放熱フィン）から粒立った脈の光 長さ120', o: { ...M.GAIKA2_FINAL_OPT } },\n});\n",
  `jp: '最終形態 09-22 23:22 版＝砲身（薬室＋放熱フィン）から粒立った脈の光 長さ120（波動なし）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, ${G117} } },
});
// ⭐⭐09-22 23:50 ユーザー「２．育つの要素はいれようか。先に行くたびに大きくなり 一番先では大きな波動（貼付資料）となり ライフルのように撃ちだされる」
//   ＝117 に grow 0.7 を戻し、光の先に波動（tipBurst＝結晶状の閃光）。**118 がコードの既定（GAIKA2_FINAL）**。
//   語が曖昧な「波動となり撃ち出される」は二つの読み＝A 波動が残って弾が出る（121）／B 波動そのものが弾として飛ぶ（122）
{ const B = { ...M.GAIKA2_FINAL_OPT.openGun };
  Object.assign(CANDS, {
    118: { label: '118 FINAL: GROW + TIP BURST 16', jp: '⭐最終形態の既定（09-22 23:50）＝育つ 0.7＋いちばん先で波動（半径 16）', o: { ...M.GAIKA2_FINAL_OPT } },
    119: { label: '119 TIP BURST 12 (SMALLER)', jp: '波動を小さく（半径 12）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, tipBurst: 12 } } },
    120: { label: '120 TIP BURST 20 (BIGGER)', jp: '波動を大きく（半径 20）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, tipBurst: 20 } } },
    121: { label: '121 FIRING A: BURST STAYS + SHOTS', jp: '撃つ瞬間 A＝波動が残り その縁から光弾（ご承認の紡錘）が出る', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, shots: 3 } } },
    122: { label: '122 FIRING B: THE BURST FLIES', jp: '撃つ瞬間 B＝波動そのものが弾として飛ぶ', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, shots: 3, shotShape: 'wave', gap: 26 } } },
    123: { label: '123 FIRING C: BURST + TRACER ACCEL', jp: '撃つ瞬間 C＝波動＋曳光弾（加速）', o: { ...M.GAIKA2_FINAL_OPT, openGun: { ...B, shots: 3, shotShape: 'tracer', accel: 3 } } },
  }); }
`);
fs.writeFileSync(P, t);
const D = __dirname + '/check-gaika2-def53.mjs';
let d = fs.readFileSync(D, 'utf8');
if (!d.includes("['GAIKA2_FINAL', GAIKA2_FINAL, 117]")) throw new Error('DEF53_117_NOT_FOUND');
d = d.replace("['GAIKA2_FINAL', GAIKA2_FINAL, 117]", "['GAIKA2_FINAL', GAIKA2_FINAL, 118]").replace('GAIKA2_FINAL＝候補 117', 'GAIKA2_FINAL＝候補 118');
fs.writeFileSync(D, d);
console.log('PATCH_RESUME_BURST_OK');
