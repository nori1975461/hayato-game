// 第46稿：主腕の既定を「肘が外・前腕が内へ傾く」へ。旧版は GAIKA2_V45 と gaika2With({ elbow: [46,-3], wrist: [59,11] }) で再現できる
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("const ELBOW4_OUT = [46, -3], ELBOW4_DEF = ELBOW4_OUT, WRIST4_DEF = [59, 11];",
    "// 第46稿：FB「両肘が曲がるのを、外側ではなく内側に曲がるようにして」＝第35稿で私が手をスカートから離すために肘を外へ折った形（肘が肩と手首を結ぶ線の内側・前腕が外へ 43°）をやめる。\n" +
    "//   肘を外上へ（肩当ての外下の角の陰）・手首を内上へ寄せ、前腕を内へ 16° 傾ける＝副腕と同じ「〈 〉」の形。掌の形と向きは 1 ドットも変えない（手首で外へ開く＝球の関節を置く）。\n" +
    "//   縛り＝肘は x 60 まで（それより外は肘の円盤が三枚目の月牙の座 (±72,−8) を隠す＝check-gaika2-armmoon.mjs）・手首は (55,5) まで（それより内は開いた手の親指がスカートの付け根へ 2px＝check-gaika2-handskirt.mjs）\n" +
    "const ELBOW4_OUT = [46, -3], WRIST4_OUT = [59, 11], ELBOW4_DEF = [60, -12], WRIST4_DEF = [55, 5];");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
