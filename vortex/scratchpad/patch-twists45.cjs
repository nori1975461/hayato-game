// render-gaika2-twists.mjs を第45稿の最終の候補へ合わせる（既定＝tuck・鋼）。node patch-twists45.cjs
const fs = require('fs');
const F = __dirname + '/render-gaika2-twists.mjs'; let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("//   軸は一つ＝「管がどこまで主張するか」。A＝第44稿のザク版（胸の下から襟への短い管・参考）／B＝長い管・鋼（肩当ての下から出て腰を回る＝第45稿の既定 GAIKA2）\n//   C＝B＋弱い残り火（胸に近い半分の節の奥だけ暗い深紅）／D＝B＋強い残り火（管の地も暗くして節が赤く灼ける）",
  "//   軸は一つ＝「管がどこまで主張するか」。A＝第44稿のザク版（胸の下から襟への短い管・参考）／B＝胸の下の角を落とし、その陰から管が出る（route 'tuck'・鋼＝第45稿の既定 GAIKA2・輪郭は A とほぼ同じ）\n//   C＝B＋弱い残り火（胸に近い半分の節の奥だけ暗い深紅）／D＝胸の脇の外を通る長い管（route 'long'・輪郭が A より最大 16px 広がる）");
rep("const T = (ember) => M.gaika2With({ torso: 'zaku2', torsoOpt: { route: 'long', ember } });", "const T = (torsoOpt) => M.gaika2With({ torso: 'zaku2', torsoOpt });");
rep("['b', 'B  LONG PIPES / STEEL  (DEFAULT)', M.GAIKA2], ['c', 'C  LONG PIPES / EMBER LOW', T('low')], ['d', 'D  LONG PIPES / EMBER', T(true)]]",
  "['b', 'B  TUCKED PIPES / STEEL  (DEFAULT)', M.GAIKA2], ['c', 'C  TUCKED PIPES / EMBER LOW', T({ route: 'tuck', ember: 'low' })], ['d', 'D  LONG PIPES OUTSIDE THE CHEST', T({ route: 'long' })]]");
fs.writeFileSync(F, src); console.log('PATCH_TWISTS45_OK');
