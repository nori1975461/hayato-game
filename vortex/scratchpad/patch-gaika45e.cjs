// 第45稿のパッチ e（一度だけ当てる）。node patch-gaika45e.cjs
//   掌を B（親指が内）にした副作用＝画面左の開いた手の親指の爪先がスカートまで 2px（A は 3px）。第35稿 FB「両手をスカートに触れないように」の余白を戻す
//   一時コピーで候補（角度・長さ・付け根）を測った結果、いちばん見た目を変えない手＝B の開いた手の親指の爪だけ 7→6（約 1px 短い）。A（handFlip:false）は 1 ドットも変えない
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("    else finger(at(6 * HP, -11.5 * HP * hs), -1.05 * hs, 7 * HF, -0.45 * hs, 7 * HF);",
  "    else finger(at(6 * HP, -11.5 * HP * hs), -1.05 * hs, 7 * HF, -0.45 * hs, (handFlip ? 6 : 7) * HF);   // 第45稿：B は親指が内＝爪先がスカートへ 2px まで迫るので爪だけ 1 短く（隙間 3px＝A と同じ・check-gaika2-handskirt.mjs）");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45E_OK');
