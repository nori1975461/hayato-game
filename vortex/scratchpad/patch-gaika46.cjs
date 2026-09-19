// 第46稿：胴を C（弱い残り火）へ・主腕の肘を引数化（既定は後で決める）。CRLF は LF へ正規化して当て、元の改行で書き戻す
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("function arms4(sb, only = 'all', handFlip = false) {", "function arms4(sb, only = 'all', handFlip = false, elbow = ELBOW4_DEF) {");
rep("    const pts = [[36, -26], [46, -3], [59, 11]].map(([x, y]) => [X(s * x), Y(y)]);\n    { const hx = X(s * 38)", "    const pts = [[36, -26], elbow, [59, 11]].map(([x, y]) => [X(s * x), Y(y)]);\n    { const hx = X(s * 38)");
rep("const ARM4_W = 328, ARM4_H = 182, ARM4_O = [164, 48];", "const ELBOW4_OUT = [46, -3], ELBOW4_DEF = ELBOW4_OUT;\nconst ARM4_W = 328, ARM4_H = 182, ARM4_O = [164, 48];");
rep("arms: P7(arms4(saber, 'main', o.handFlip !== false)),", "arms: P7(arms4(saber, 'main', o.handFlip !== false, o.elbow || ELBOW4_DEF)),");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
