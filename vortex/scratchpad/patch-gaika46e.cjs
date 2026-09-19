// 第46稿：手首の位置も引数化（見比べ用）。既定は据え置き [59, 11]
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF) {", "function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF, wrist = WRIST4_DEF) {");
rep("    const pts = [[36, -26], elbow, [59, 11]].map(", "    const pts = [[36, -26], elbow, wrist].map(");
rep("const ELBOW4_OUT = [46, -3], ELBOW4_DEF = ELBOW4_OUT;", "const ELBOW4_OUT = [46, -3], ELBOW4_DEF = ELBOW4_OUT, WRIST4_DEF = [59, 11];");
rep("o.handFlip !== false, o.elbow || ELBOW4_DEF)),", "o.handFlip !== false, o.elbow || ELBOW4_DEF, o.wrist || WRIST4_DEF)),");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
