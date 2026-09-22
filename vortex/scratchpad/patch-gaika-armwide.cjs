// 蒼神骸華 第二案「開」の姿：arms の格子を「開」のときだけ横に広げる。
// 2026-09-22 光弾を足したとき判明＝三本目の腕の光刃は手（±108）から 7＋70＝77 先まで描くはずが、格子が ±164 なので
//   ±164 で切れていた（先の細りが無く平らに終わる・実長は約 52）。確定した候補 95 の写真もこの切れた刃だった。
//   閉じた姿（open4 = 0）は格子の幅も原点も変えないので 1 画素も変わらない（check-gaika2-hash.mjs で確認）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("const ARM4_W = 328, ARM4_H = 182, ARM4_O = [164, 48];",
  "const ARM4_W = 328, ARM4_H = 182, ARM4_O = [164, 48], ARM4_EXT = 24;   // ARM4_EXT＝「開」のときだけ左右に足す幅（三本目の腕の光刃 108＋77 が ±164 で切れていた・09-22）\nconst arm4W = () => ARM4_W + (open4 && thirdArm4 ? 2 * ARM4_EXT : 0);");

rep("  const G = g(ARM4_W, only === 'sub' && subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H), X = (x) => x + ARM4_O[0], Y = (y) => y + ARM4_O[1];",
  "  const AW = arm4W(), G = g(AW, only === 'sub' && subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H), X = (x) => x + AW / 2, Y = (y) => y + ARM4_O[1];");

// rig の原点＝x はもともと 164/328 = 0.5 なので、広げても 0.5 のまま（式を幅に追随させておく）
rep("origin: [ARM4_O[0] / ARM4_W, ARM4_O[1] / (subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H)] },",
  "origin: [0.5, ARM4_O[1] / (subBoom4 ? ARM4_H + SUB4_EXTRA_H : ARM4_H)] },");
rep("{ role: 'wingR', tex: 'arms', ox: 0, oy: 0, origin: [ARM4_O[0] / ARM4_W, ARM4_O[1] / ARM4_H] },",
  "{ role: 'wingR', tex: 'arms', ox: 0, oy: 0, origin: [0.5, ARM4_O[1] / ARM4_H] },");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_ARMWIDE_OK');
