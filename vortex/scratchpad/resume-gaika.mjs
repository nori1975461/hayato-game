// 蒼神骸華 第二案（build4）の作業を再開するときに最初に打つ一本。
//   状態（未 push か・最新コミット・現在の稿）→ 確定しているパラメータの実測 → 全身 PNG の再生成 までを一度に出す。
//   使い方: node vortex/scratchpad/resume-gaika.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const git = (...a) => { try { return execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim(); } catch (e) { return '(git 失敗) ' + e.message.split('\n')[0]; } };

console.log('=== 1. リポジトリの状態 ===');
const sb = git('status', '-sb', '-uno').split('\n')[0];
console.log(sb);
if (/behind/.test(sb)) console.log('  ⚠️ behind が出ている＝第7稿を消す履歴の書き換えが未反映。ユーザーに `git push --force-with-lease origin main` を自分の端末で1回実行してもらう（それまで通常の push は通らない）');
else if (/ahead/.test(sb)) console.log('  ⚠️ ahead のみ＝force push は済んでいる。通常の `git push origin main` でよい');
else console.log('  反映済み');
console.log(git('log', '--oneline', '-3'));

console.log('\n=== 2. いま描かれている第二案の確定パラメータ（実測） ===');
const M = await import('./gaika-candidates.mjs');
const b = M.GAIKA2;
const xs = [], ys = [];
for (const r of b.rig) { const t = b.sprites[r.tex]; const rows = t.rows || t; const w = rows[0].length, h = rows.length; const ox = r.ox - (r.origin?.[0] ?? 0.5) * w, oy = r.oy - (r.origin?.[1] ?? 0) * h; xs.push(ox, ox + w); ys.push(oy, oy + h); }
console.log('  id:', b.id, '/ パーツ数', b.rig.length, '/ spriteScale', b.tier.spriteScale);
console.log('  テクスチャの外接（rig から計算）: x', Math.min(...xs), '〜', Math.max(...xs), ' y', Math.min(...ys), '〜', Math.max(...ys));
const src = execFileSync('node', ['-e', "const fs=require('fs');process.stdout.write(fs.readFileSync('" + here.replace(/\\/g, '/') + "/gaika-candidates.mjs','utf8'))"], { encoding: 'utf8' });
const grab = (re, label) => { const m = src.match(re); console.log('  ' + label + ':', m ? m[0].slice(0, 120) : '(見つからない＝コードが変わった)'); };
grab(/SCH\[o\.saber \|\| '\w+'\]/, '光刃の配色');
grab(/const SKIRT_BIG = skirtTex\(\[\[[^\n]{0,110}/, 'スカートとノズル');
grab(/const third = \(s\) => \{[^\n]*\n\s*const pts = [^\n]{0,70}/, '三本目の腕（メガランチャー）の骨');
{ const m = src.match(/const third = \(s\) => \{[\s\S]{0,600}?const a = \((\d+) \* Math\.PI\)[\s\S]{0,200}?L = (\d+)/); console.log('  三本目の砲:', m ? '角度 ' + m[1] + '° / 長さ ' + m[2] : '(見つからない＝コードが変わった)'); }
{ const m = src.match(/const sub = \(s\) => \{[\s\S]{0,700}?const pts = (\[\[[^\n]{0,40}\]\])/); console.log('  副腕（殻の奥から生える）の骨:', m ? m[1] : '(見つからない＝コードが変わった)'); }
{ const m = src.match(/ELBOW4_DEF = (\[[^\]]+\]), WRIST4_DEF = (\[[^\]]+\])/); console.log('  主腕の骨（肩の関節 (38,-25)）:', m ? '[[36, -26], 肘 ' + m[1] + ', 手首 ' + m[2] + ']（第46稿＝肘が外・前腕が内へ 16°。第45稿までの腕は gaika2With({ elbow: [46, -3], wrist: [59, 11] })）' : '(見つからない＝コードが変わった)'); }
console.log('  描画順（リグの順＝奥→手前）:', b.rig.map((p) => p.tex).join(' > '));
console.log('  月牙の枚数:', b.rig.filter((p) => /^moon/.test(p.tex)).length, '（六枚が正＝三枚ずつ・画面左の一番上は発射済みで座が空）');
// 第40〜45稿：胴（第45稿からの既定＝ザク型のひねり／比較用の四版）と手
grab(/const CH4_DEF = [^;]+;/, '胸の半幅（四版共通）');
grab(/const KN = opt\.knee === undefined \? \[[^\]]+\]/, '脇の線の折れ [高さ, 張り出し]');
grab(/DISC2 = opt\.disc2 \?\? '\w+'/, '腕のつかない下の関節の円盤');
grab(/const ZAKU2_DEF = [^;]+;/, '既定の胴（ザク型のひねり）の opt');
grab(/const NY0 = opt\.notchY \?\? [^;]+;/, '胸の下の角の落とし（高さ NY0・傾き NK・管の出どころ TX）');
{ const area = (d) => d.sprites.torso.rows.reduce((n, r) => n + r.replace(/\./g, '').length, 0); console.log('  胴の塗り面積: 既定', area(M.GAIKA2), '/ NZ', area(M.GAIKA2_NZ), '/ ドム', area(M.GAIKA2_DOM), '/ 第44稿のザク', area(M.GAIKA2_ZAKU), '/ ジオング', area(M.GAIKA2_ZEONG), '（第45稿＝4586 / 4665 / 4539 / 4578 / 4023）'); }
console.log('  胴の版: GAIKA2＝ザク型のひねり C（第46稿でユーザーが A〜D から選んだ＝style zaku2・route tuck・ember low。胸の下の角を落とし、その陰から管が出る・節の奥だけ暗い深紅。第45稿の B＝鋼は torsoOpt: { route: "tuck" }）/ 比較用＝GAIKA2_NZ（ノイエ・ジール版・第44稿までの既定）/ GAIKA2_DOM / GAIKA2_ZAKU（第44稿のザク版＝短い管）/ GAIKA2_ZEONG');
console.log('  ひねりの変種: gaika2With({ torso: "zaku2", torsoOpt: { route: "tuck" | "long" | "canon", ember: "low" | true } })');
console.log('  手の左右: 既定＝親指が内（第45稿＝ユーザーが A/B を見比べて B を選んだ。開いた手の親指の爪だけ 1 短い＝スカートとの隙間 3px）。第44稿までの手は gaika2With({ handFlip: false })');

console.log('\n=== 3. 不変と制約の検査 ===');
for (const f of ['check-gaika1-hash.mjs', 'check-gaika2-hash.mjs', 'check-gaika2-fanroot.mjs', 'check-gaika2-holes.mjs', 'check-gaika2-handskirt.mjs', 'check-gaika2-torso-width.mjs', 'check-gaika2-armmoon.mjs']) { try { console.log('  ' + execFileSync('node', [f], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop()); } catch (e) { console.log('  (失敗) ' + f + ' ' + e.message.split('\n')[0]); } }
console.log('  ↑ 第一案は 5b00b4e44917 SAME が正。第二案のハッシュは MEMORY.md の1行目の値と目で照合する（稿ごとに変わる）');

console.log('\n=== 4. 全身と腰の四版を描き直す ===');
console.log(execFileSync('node', ['render-gaika2.mjs', '', 'S'], { cwd: here, encoding: 'utf8' }).trim());
console.log(execFileSync('node', ['render-gaika2-waists.mjs'], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop(), '→ gaika2-waists-grid.png（左上 NZ／右上 ドム／左下 第44稿のザク／右下 ジオング）');
console.log(execFileSync('node', ['render-gaika2-twists.mjs'], { cwd: here, encoding: 'utf8' }).trim().split('\n').pop(), '→ gaika2-twists-grid.png（左上 A＝第44稿のザク版／右上 B＝第45稿の既定・鋼／左下 C＝既定＝B＋弱い残り火／右下 D＝胸の脇の外を通る長い管）');
console.log('\n次の一手＝ユーザーの FB を受けて直す。確認は');
console.log('  全身     node render-gaika2.mjs "" S');
console.log('  部分拡大 node render-gaika2-zoom.mjs <倍率> <中心の世界y>   例) 3.4 -26（肩と三本目の腕）/ 2.6 110（スカートとノズル）/ 5.5 -48（頭）');
console.log('  パーツ   node render-gaika-part.mjs <tex> "" 7 2            例) head / torso / shellL / arms');
console.log('  腰の四版 node render-gaika2-waists.mjs（比較 1 枚＋版ごとの全身と胴の拡大）');
console.log('  前後比較 git show HEAD:vortex/scratchpad/gaika-candidates.mjs > .gaika-prev.mjs → node render-gaika2-beforeafter.mjs [export 名] [倍率] [中心y] [中心x] [出力] [左の export 名]（撮ったら .gaika-prev.mjs を消す）');
console.log('  ひねりの一覧 node render-gaika2-twists.mjs / 胴だけを並べる node render-gaika2-torsos.mjs <出力> <倍率> <候補の JSON か export 名>... / 候補を任意の場所で node render-gaika2-cand-at.mjs <出力> <倍率> <x> <y> <候補>');
console.log('  両手     node render-gaika2-hands.mjs（上＝第44稿までの A・親指が外／下＝既定の B・親指が内）');
console.log('  検査     手とスカート node check-gaika2-handskirt.mjs [export 名 | JSON] / 輪郭の幅 node check-gaika2-torso-width.mjs [候補] [基準] / 直前のコミットとの突き合わせ node check-gaika2-vs-prev.mjs / 主腕が月牙を隠す量 node check-gaika2-armmoon.mjs [候補...] / 肘の候補を並べる node render-gaika2-elbows.mjs [出力] [倍率] [中心y] [候補の JSON...]');
console.log('  任意の場所 node render-gaika2-at.mjs <倍率> <x> <y> / 胴の候補 node render-gaika2-chcand.mjs <倍率> <中心y> <出力名> <候補の JSON...>');
