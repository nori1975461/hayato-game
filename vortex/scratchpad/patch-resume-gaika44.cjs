// 再開スクリプトを第40〜44稿に追従させる（一度だけ当てる）。node patch-resume-gaika44.cjs
//   足すもの＝胴の確定値（胸の半幅・脇の線の折れ・下の関節）と四版の塗り面積／手の左右の既定／不変と制約の検査 4 本／腰の四版の再生成／確認コマンドの追記
const fs = require('fs');
const F = __dirname + '/resume-gaika.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 60)); src = src.slice(0, i) + to + src.slice(i + from.length); };
const MOON = String.raw`console.log('  月牙の枚数:', b.rig.filter((p) => /^moon/.test(p.tex)).length, '（六枚が正＝三枚ずつ・画面左の一番上は発射済みで座が空）');`;
rep(MOON, MOON + String.raw`
// 第40〜44稿：胴（腰の文法の四版）と手
grab(/const CH4_DEF = [^;]+;/, '胸の半幅（四版共通）');
grab(/const KN = opt\.knee === undefined \? \[[^\]]+\]/, '脇の線の折れ [高さ, 張り出し]');
grab(/DISC2 = opt\.disc2 \?\? '\w+'/, '腕のつかない下の関節の円盤');
{ const area = (d) => d.sprites.torso.rows.reduce((n, r) => n + r.replace(/\./g, '').length, 0); console.log('  胴の塗り面積: NZ', area(M.GAIKA2), '/ ドム', area(M.GAIKA2_DOM), '/ ザク', area(M.GAIKA2_ZAKU), '/ ジオング', area(M.GAIKA2_ZEONG), '（第44稿＝4665 / 4539 / 4578 / 4023）'); }
console.log('  腰の四版: GAIKA2＝ノイエ・ジール版（既定）/ GAIKA2_DOM / GAIKA2_ZAKU / GAIKA2_ZEONG（胸から上は四版とも同じ）');
console.log('  手の左右: 既定＝親指が外（掌を正面へ向け指を下へ垂らした手として正しい向き）。入れ替えた変種は gaika2With({ handFlip: true })');

console.log('\n=== 3. 不変と制約の検査 ===');
for (const f of ['check-gaika1-hash.mjs', 'check-gaika2-hash.mjs', 'check-gaika2-fanroot.mjs', 'check-gaika2-holes.mjs']) { try { console.log('  ' + execFileSync('node', [f], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop()); } catch (e) { console.log('  (失敗) ' + f + ' ' + e.message.split('\n')[0]); } }
console.log('  ↑ 第一案は 5b00b4e44917 SAME が正。第二案のハッシュは MEMORY.md の1行目の値と目で照合する（稿ごとに変わる）');`);
rep("=== 3. 全身を描き直す ===", "=== 4. 全身と腰の四版を描き直す ===");
const FULL = String.raw`console.log(execFileSync('node', ['render-gaika2.mjs', '', 'S'], { cwd: here, encoding: 'utf8' }).trim());`;
rep(FULL, FULL + String.raw`
console.log(execFileSync('node', ['render-gaika2-waists.mjs'], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop(), '→ gaika2-waists-grid.png（左上 NZ／右上 ドム／左下 ザク／右下 ジオング）');`);
const PART = String.raw`console.log('  パーツ   node render-gaika-part.mjs <tex> "" 7 2            例) head / torso / shellL / arms');`;
rep(PART, PART + String.raw`
console.log('  腰の四版 node render-gaika2-waists.mjs（比較 1 枚＋版ごとの全身と胴の拡大）');
console.log('  前後比較 git show HEAD:vortex/scratchpad/gaika-candidates.mjs > .gaika-prev.mjs → node render-gaika2-beforeafter.mjs [export 名] [倍率] [中心y]（撮ったら .gaika-prev.mjs を消す）');
console.log('  両手     node render-gaika2-hands.mjs（上＝現状 A・親指が外／下＝左右を入れ替えた B）');
console.log('  任意の場所 node render-gaika2-at.mjs <倍率> <x> <y> / 胴の候補 node render-gaika2-chcand.mjs <倍率> <中心y> <出力名> <候補の JSON...>');`);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH_RESUME44_OK');
