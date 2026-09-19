// 第47稿：肘から下を中央へ回す角度の既定を 20° に
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("ELBOW4_DEF = ELBOW4_OUT, FORE4_DEF = 0;",
    "ELBOW4_DEF = ELBOW4_OUT;\n" +
    "// 第47稿：FB（添付つき）「主腕の両手とも、肘から下が外へ向いている。主腕の肘から下を、中央に少し向けてほしいだけ。手がスカートに少しかかってしまってもいい」\n" +
    "//   ＝肩と肘は第45稿のまま。前腕＋掌をひとかたまりで、肘を軸に中央へ FORE4_DEF 度まわす（前腕は鉛直から外へ 43° → 23°）。手首は折らない・掌の造形はそのまま。\n" +
    "//   スカートにかかる量＝開いた手 20%・握る手 6%（12°＝7%/0%・30°＝37%/18%＋胴の陰に 5px）。第45稿の腕は gaika2With({ foreTurn: 0 })\n" +
    "const FORE4_DEF = 20;");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
