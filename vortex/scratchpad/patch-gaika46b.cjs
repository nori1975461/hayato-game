// 第46稿：胴の既定を C（B＋弱い残り火）へ
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 60)); process.exit(1); } s = s.replace(a, () => b); };
rep("const ZAKU2_DEF = { route: 'tuck' };   // 第45稿：既定の胴＝ザク版のひねり（胸の下の角を落とし、その陰から管が出る。輪郭は第44稿のザク版とほぼ同じ）。ユーザーの選択で差し替える",
    "const ZAKU2_DEF = { route: 'tuck', ember: 'low' };   // 第45稿：既定の胴＝ザク版のひねり（胸の下の角を落とし、その陰から管が出る。輪郭は第44稿のザク版とほぼ同じ）→ 第46稿：ユーザーが A〜D から C を選んだ＝B＋弱い残り火（管は鋼のまま・節の奥だけ暗い深紅）。第45稿の B は gaika2With({ torso: 'zaku2', torsoOpt: { route: 'tuck' } })");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
