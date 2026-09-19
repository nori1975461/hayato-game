// 第51稿：既定の装備を 'swap' へ
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("const FORE4_DEF = [20, 20], HANDL4_DEF = 'hang', KIT4_DEF = 'vulcan';", "const FORE4_DEF = [20, 20], HANDL4_DEF = 'hang', KIT4_DEF = 'swap';   // 第51稿：'swap'＝砲と光刃を交代（第49〜50稿は 'vulcan'・第48稿までは 'launcher'）");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
