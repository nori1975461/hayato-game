// 第50稿：FB「光刃は D にして」＝見比べの D＝17°・長さ 70（砲があったときと同じ向き）
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("const SABER4_DEG = 45, SABER4_LEN = 96, VULCAN4_DEG = 66, VULCAN4_LEN = 36;",
    "// 第50稿：FB「光刃は D にして」＝17°・長さ 70（砲があったときと同じ向き。テクスチャの幅 ±164 に入る長さの上限＝先端 x 156）。第49稿の既定は { saberDeg: 45, saberLen: 96 }\n" +
    "const SABER4_DEG = 17, SABER4_LEN = 70, VULCAN4_DEG = 66, VULCAN4_LEN = 36;");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
