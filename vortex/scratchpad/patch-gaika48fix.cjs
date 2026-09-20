// 第48稿修正：subStraight（副腕の前腕を光刃と一直線に）をモジュール変数と build4 の引数に足す
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE ' + a.slice(0, 40)); t = t.replace(a, b); };
rep('let armGunDeg = ARMGUN4_DEG, armGunLen = ARMGUN4_LEN, mountSaberDeg = MSABER4_DEG, mountSaberLen = MSABER4_LEN;',
    'let subStraight = false;   // 第48稿修正：kit launcher の副腕の前腕を光刃と一直線に（gaika2With({ kit: "launcher", foreTurn: [20, 35], subStraight: true })）\nlet armGunDeg = ARMGUN4_DEG, armGunLen = ARMGUN4_LEN, mountSaberDeg = MSABER4_DEG, mountSaberLen = MSABER4_LEN;');
rep('  armGunDeg = o.armGunDeg ?? ARMGUN4_DEG;', '  subStraight = !!o.subStraight;\n  armGunDeg = o.armGunDeg ?? ARMGUN4_DEG;');
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH48FIX_OK');
