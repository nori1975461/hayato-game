// 第46稿の腕を取り消す：FB「ちがう。全然おかしくなってる。まずもとに戻して」＝主腕の既定を第45稿の形（肘 (46,−3)・手首 (59,11)）へ戻す。胴 C はユーザーの選択なので残す
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("const ELBOW4_OUT = [46, -3], WRIST4_OUT = [59, 11], ELBOW4_DEF = [60, -12], WRIST4_DEF = [55, 5];",
    "//   → ⚠️否決（09-20 00:43 FB「ちがう。全然おかしくなってる。まずもとに戻して」）＝既定を第45稿の腕へ戻した。否決された形は gaika2With({ elbow: ELBOW4_V46, wrist: WRIST4_V46 }) 相当＝[60,−12]／[55,5]（見比べ用にだけ残す）。「内側に曲がる」の意味を私が取り違えた＝次の指示を待つ（当て推量で描き直さない）\n" +
    "const ELBOW4_OUT = [46, -3], WRIST4_OUT = [59, 11], ELBOW4_V46 = [60, -12], WRIST4_V46 = [55, 5], ELBOW4_DEF = ELBOW4_OUT, WRIST4_DEF = WRIST4_OUT;");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
