// resume-gaika.mjs：主腕の抽出を CRLF でも通る形へ（`\{\n` → `\{\s*`）
const fs = require('fs');
const F = __dirname + '/resume-gaika.mjs';
let s = fs.readFileSync(F, 'utf8');
const a = String.raw`const main = \(s\) => \{\n\s*const pts`, b = String.raw`const main = \(s\) => \{\s*const pts`;
if (!s.includes(a)) throw new Error('not found');
s = s.replace(a, b);
fs.writeFileSync(F, s);
console.log('RESUME_PATCH_B_OK');
