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
grab(/const pts = \[\[40, -38\][^\n]{0,60}/, '三本目の腕（メガランチャー）の骨');
{ const m = src.match(/const pts = \[\[40, -38\][\s\S]{0,400}?const a = \((\d+) \* Math\.PI\)[\s\S]{0,200}?L = (\d+)/); console.log('  三本目の砲:', m ? '角度 ' + m[1] + '° / 長さ ' + m[2] : '(見つからない＝コードが変わった)'); }

console.log('\n=== 3. 全身を描き直す ===');
console.log(execFileSync('node', ['render-gaika2.mjs', '', 'S'], { cwd: here, encoding: 'utf8' }).trim());
console.log('\n次の一手＝ユーザーの FB を受けて直す。確認は');
console.log('  全身     node render-gaika2.mjs "" S');
console.log('  部分拡大 node render-gaika2-zoom.mjs <倍率> <中心の世界y>   例) 3.4 -26（肩と三本目の腕）/ 2.6 110（スカートとノズル）/ 5.5 -48（頭）');
console.log('  パーツ   node render-gaika-part.mjs <tex> "" 7 2            例) head / torso / shellL / arms');
