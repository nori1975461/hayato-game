// 第45稿のパッチ k（一度だけ当てる）。node patch-gaika45k.cjs
//   既定の胴を route 'tuck' へ（'long' は輪郭が最大 16px 広がる＝FB「胴が大きい」に逆行するので候補へ下げる）＋設計の説明文の胴の段を現状へ
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("const ZAKU2_DEF = { route: 'long' };   // 第45稿：既定の胴＝ザク版のひねり（ユーザーの選択で差し替える）",
  "const ZAKU2_DEF = { route: 'tuck' };   // 第45稿：既定の胴＝ザク版のひねり（胸の下の角を落とし、その陰から管が出る。輪郭は第44稿のザク版とほぼ同じ）。ユーザーの選択で差し替える");
rep("胴は腰を持たない一枚の黒鉄＝肩の下から裾へ一直線に開き、浅い V の裾の下から扇の刃が放射状に出る。",
  "胴は黒鉄の胸の下で腰を影に沈める。胸の下の角は斜めに落ち、その陰から蛇腹の動力管が出て腰の両脇を回り襟へ入る。浅い V の裾の下から扇の刃が放射状に出る。");
rep("    // 第45稿：ザク版にもうひとひねり（'zaku' は第44稿のまま残す）。opt.route＝管の通し方・opt.ember＝節の奥の残り火・opt.r＝管の半径",
  "    // 第45稿：ザク版にもうひとひねり（'zaku' は第44稿のまま残す）。opt.route＝管の通し方（既定の呼び出しは ZAKU2_DEF＝'tuck'）・opt.ember＝節の奥の残り火（true／'low'／'left'／'right'）・opt.r＝管の半径");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45K_OK');
