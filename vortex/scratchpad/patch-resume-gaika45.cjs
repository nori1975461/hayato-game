// resume-gaika.mjs を第45稿へ追従させる（既定の胴＝ザク型のひねり tuck・掌＝B・検査 6 本・ひねりの一覧の再生成）。node patch-resume-gaika45.cjs
//   ⚠️この環境の Bash は heredoc でも「バックスラッシュ 2 個」を 1 個へ畳む＝バックスラッシュを含む文字列は String.raw のテンプレートに 1 個で書く
const fs = require('fs');
const F = __dirname + '/resume-gaika.mjs'; let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("// 第40〜44稿：胴（腰の文法の四版）と手", "// 第40〜45稿：胴（第45稿からの既定＝ザク型のひねり／比較用の四版）と手");
rep(String.raw`grab(/DISC2 = opt\.disc2 \?\? '\w+'/, '腕のつかない下の関節の円盤');`,
  String.raw`grab(/DISC2 = opt\.disc2 \?\? '\w+'/, '腕のつかない下の関節の円盤');
grab(/const ZAKU2_DEF = [^;]+;/, '既定の胴（ザク型のひねり）の opt');
grab(/const NY0 = opt\.notchY \?\? [^;]+;/, '胸の下の角の落とし（高さ NY0・傾き NK・管の出どころ TX）');`);
rep("console.log('  胴の塗り面積: NZ', area(M.GAIKA2), '/ ドム', area(M.GAIKA2_DOM), '/ ザク', area(M.GAIKA2_ZAKU), '/ ジオング', area(M.GAIKA2_ZEONG), '（第44稿＝4665 / 4539 / 4578 / 4023）'); }",
  "console.log('  胴の塗り面積: 既定', area(M.GAIKA2), '/ NZ', area(M.GAIKA2_NZ), '/ ドム', area(M.GAIKA2_DOM), '/ 第44稿のザク', area(M.GAIKA2_ZAKU), '/ ジオング', area(M.GAIKA2_ZEONG), '（第45稿＝4586 / 4665 / 4539 / 4578 / 4023）'); }");
rep("console.log('  腰の四版: GAIKA2＝ノイエ・ジール版（既定）/ GAIKA2_DOM / GAIKA2_ZAKU / GAIKA2_ZEONG（胸から上は四版とも同じ）');",
  String.raw`console.log('  胴の版: GAIKA2＝ザク型のひねり（第45稿からの既定＝style zaku2・route tuck・鋼。胸の下の角を落とし、その陰から管が出る）/ 比較用＝GAIKA2_NZ（ノイエ・ジール版・第44稿までの既定）/ GAIKA2_DOM / GAIKA2_ZAKU（第44稿のザク版＝短い管）/ GAIKA2_ZEONG');
console.log('  ひねりの変種: gaika2With({ torso: "zaku2", torsoOpt: { route: "tuck" | "long" | "canon", ember: "low" | true } })');`);
rep("console.log('  手の左右: 既定＝親指が外（掌を正面へ向け指を下へ垂らした手として正しい向き）。入れ替えた変種は gaika2With({ handFlip: true })');",
  "console.log('  手の左右: 既定＝親指が内（第45稿＝ユーザーが A/B を見比べて B を選んだ。開いた手の親指の爪だけ 1 短い＝スカートとの隙間 3px）。第44稿までの手は gaika2With({ handFlip: false })');");
rep("for (const f of ['check-gaika1-hash.mjs', 'check-gaika2-hash.mjs', 'check-gaika2-fanroot.mjs', 'check-gaika2-holes.mjs'])",
  "for (const f of ['check-gaika1-hash.mjs', 'check-gaika2-hash.mjs', 'check-gaika2-fanroot.mjs', 'check-gaika2-holes.mjs', 'check-gaika2-handskirt.mjs', 'check-gaika2-torso-width.mjs'])");
rep("→ gaika2-waists-grid.png（左上 NZ／右上 ドム／左下 ザク／右下 ジオング）');",
  String.raw`→ gaika2-waists-grid.png（左上 NZ／右上 ドム／左下 第44稿のザク／右下 ジオング）');
console.log(execFileSync('node', ['render-gaika2-twists.mjs'], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop(), '→ gaika2-twists-grid.png（左上 A＝第44稿のザク版／右上 B＝既定・胸の陰から出る管／左下 C＝B＋弱い残り火／右下 D＝胸の脇の外を通る長い管）');`);
rep("console.log('  両手     node render-gaika2-hands.mjs（上＝現状 A・親指が外／下＝左右を入れ替えた B）');",
  String.raw`console.log('  ひねりの一覧 node render-gaika2-twists.mjs / 胴だけを並べる node render-gaika2-torsos.mjs <出力> <倍率> <候補の JSON か export 名>... / 候補を任意の場所で node render-gaika2-cand-at.mjs <出力> <倍率> <x> <y> <候補>');
console.log('  両手     node render-gaika2-hands.mjs（上＝第44稿までの A・親指が外／下＝既定の B・親指が内）');
console.log('  検査     手とスカート node check-gaika2-handskirt.mjs [export 名 | JSON] / 輪郭の幅 node check-gaika2-torso-width.mjs [候補] [基準] / 直前のコミットとの突き合わせ node check-gaika2-vs-prev.mjs');`);
rep("node render-gaika2-beforeafter.mjs [export 名] [倍率] [中心y]（撮ったら .gaika-prev.mjs を消す）", "node render-gaika2-beforeafter.mjs [export 名] [倍率] [中心y] [中心x] [出力] [左の export 名]（撮ったら .gaika-prev.mjs を消す）");
fs.writeFileSync(F, src); console.log('PATCH_RESUME45_OK');
