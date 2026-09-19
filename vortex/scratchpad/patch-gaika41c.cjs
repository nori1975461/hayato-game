// 第41稿：説明文に樽胴を足す（絵は変えない）。node patch-gaika41c.cjs
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const from = "背に日蝕の輪、逆さの扇の下半身で浮く。';\nfunction build4(";
const i = src.indexOf(from);
if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('concept4');
src = src.slice(0, i) + "背に日蝕の輪、逆さの扇の下半身で浮く。胴は腰を持たない一枚の黒鉄＝肩の下から裾へ一直線に開き、浅い V の裾の下から扇の刃が放射状に出る。中央の合わせ目は閉じた炉の扉で、V の先端の金の鋲が扇の要。';\nfunction build4(" + src.slice(i + from.length);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH41C_OK');
