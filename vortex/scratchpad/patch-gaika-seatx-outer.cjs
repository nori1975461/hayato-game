// 直し（2026-09-20 23:45・自分で見つけた誤り）：昇る蝕（dormantX:{kind:'umbra'}）が画面右の殻の外の面に出ていなかった。
//   原因＝「稜線より外の面だけに掛ける」つもりで条件に lit を使った。lit は「光が当たる面」で、この殻は左右とも同じ側（画面左）から光が当たる作り
//   ＝画面左の殻では外の面が lit・画面右の殻では内の面が lit。＝画面右では腕に隠れる内の面に掛かり、見えている外の面には何も出ていなかった。
//   検品を画面左の殻の拡大だけで済ませたのが見逃しの原因（0920/２５ の 4・5 をこの状態で渡してしまった）。
// 直し方＝条件を「外の面」＝ x > xr（殻のローカル座標は左右とも外が正）へ。縁の色は左右とも rim。闇の色も左右とも dark（画面右は地が陰の q なので差は小さくなる＝光の向きの帰結）。
// 影響＝候補 36・37 の絵だけが変わる（意図した変更）。ほかの候補と既定は画素一致のまま。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("else if (um && lit && dU >= 0 && dU < um.w) c = um.rim;", "else if (um && x > xr && dU >= 0 && dU < um.w) c = um.rim;");
rep("（稜線より外の面だけ＝内の面は腕と胴のすき間から欠片が覗くので掛けない）", "（稜線より外の面だけ＝内の面は腕と胴のすき間から欠片が覗くので掛けない。⚠️lit でなく x > xr で判定する＝lit は左右の殻で内外が逆）");
rep("else if (um && lit && dU >= um.w && dU < um.w + um.w2) c = 'r';", "else if (um && x > xr && dU >= um.w && dU < um.w + um.w2) c = 'r';");
rep("else if (um && lit && dU >= um.w) c = um.dark;", "else if (um && x > xr && dU >= um.w) c = um.dark;");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_SEATX_OUTER_OK');
