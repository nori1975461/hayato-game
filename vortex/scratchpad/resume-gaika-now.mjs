// 蒼神骸華 第二案：2026-09-20 夕方からの作業を再開するときに最初に打つ一本（resume-gaika.mjs は「コードの既定＝第52稿」を調べる道具。こちらは「いま検討中の姿」を出す）。
//   使い方: node vortex/scratchpad/resume-gaika-now.mjs            → 状態の表示＋ 1 無地 と 3 朔＋残り火 の全身を横並びで gaika2-now.png（640×352）へ
//           node vortex/scratchpad/resume-gaika-now.mjs 3 4        → 番号で選んだ候補（1〜5・最大2つ）を gaika2-now.png へ
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '../..');
const git = (...a) => { try { return execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim(); } catch (e) { return '(git 失敗) ' + e.message.split('\n')[0]; } };
const node = (...a) => { try { return execFileSync('node', a, { cwd: here, encoding: 'utf8' }).trim().split('\n').pop(); } catch (e) { return '(失敗) ' + e.message.split('\n')[0]; } };

// ⭐2026-09-20 に確定した土台（コードの既定にはまだ入れていない＝月牙の結論が出たらまとめて既定へ反映する）
export const BASE = { kit: 'launcher', foreTurn: [20, 35], subStraight: true, stowed: true, thirdArm: false, subBehind: true };
// 結論待ち＝一番下の座をどうするか（フォルダ 0920/１８ と同じ番号）
export const CANDS = {
  1: { label: '1 EMPTY (4 MOONS)', jp: '無地（月牙4枚）', o: { ...BASE, dropMoons: ['moonX'] } },
  2: { label: '2 DORMANT MOON', jp: '朔の座＝眠る月（黒い月に鈍い鋼の縁）', o: { ...BASE, dormantX: 'dark' } },
  3: { label: '3 DORMANT + EMBER', jp: '朔の座＋残り火（私の推し）', o: { ...BASE, dormantX: 'ember' } },
  4: { label: '4 LIT (6 MOONS)', jp: '6枚とも灯る', o: { ...BASE } },
  5: { label: '5 REF: RED BAND', jp: '参考＝以前の赤い帯', o: { ...BASE, dropMoons: ['moonX'], keepBand2: true } },
};

console.log('=== 1. リポジトリの状態 ===');
console.log(git('status', '-sb', '-uno').split('\n')[0]);
console.log(git('log', '--oneline', '-3'));
console.log('\n=== 2. 不変の確認（コードの既定は第52稿のまま） ===');
console.log(' ', node('check-gaika1-hash.mjs'));
console.log(' ', node('check-gaika2-hash.mjs', 'ac412d79c55d'));
console.log('\n=== 3. 2026-09-20 に確定したこと ===');
console.log('  ・バルカン砲（電子パルス砲）と肩の腕は閉じた姿から外す（thirdArm:false）。蒼の装甲が開くときに出現する');
console.log('  ・光刃の付け根は副腕（kit:launcher・foreTurn:[20,35]・subStraight:true）。光刃は振る');
console.log('  ・付け根は蒼の装甲の奥から生える（subBehind:true＝role を podL にして殻の奥へ）');
console.log('  ・月牙は収めた姿で穴なし（stowed:true）');
console.log('  土台の引数:', JSON.stringify(BASE));
console.log('\n=== 4. 結論待ち＝一番下の座（月牙 4枚／6枚） ===');
for (const [k, c] of Object.entries(CANDS)) console.log('  ' + k + '＝' + c.jp + '  ' + JSON.stringify(c.o));

const pick = process.argv.slice(2).map(Number).filter((n) => CANDS[n]).slice(0, 2), ids = pick.length ? pick : [1, 3];
const PW = ids.length === 1 ? 344 : 319, PH = 352, W = ids.length * PW + (ids.length - 1) * 2, out = makeCanvas(W, PH); rect(out, 0, 0, W, PH, [40, 42, 64]);
ids.forEach((id, i) => {
  const d = M.gaika2With(CANDS[id].o), cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, PW / 2, PH / 2 - 13.5, { glow: false }); text(cv, CANDS[id].label, 4, 4, WHITE, 1);
  const ox = i * (PW + 2);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s0 = (y * PW + x) * 3, p = (y * W + ox + x) * 3; out.px[p] = cv.px[s0]; out.px[p + 1] = cv.px[s0 + 1]; out.px[p + 2] = cv.px[s0 + 2]; }
});
writePng(out, resolve(here, 'gaika2-now.png'));
console.log('\n=== 5. 全身（等倍）を書き出した ===');
console.log('  vortex/scratchpad/gaika2-now.png  ' + W + 'x' + PH + '  左から ' + ids.map((id) => id + '＝' + CANDS[id].jp).join(' ／ '));
console.log('\n次にやること・各稿の FB と数字は メモリの MEMORY.md 1行目 と project_vortex_god_visuals_20260915.md（全文 Read 禁止・grep -n "朔の座" → sed -n）');
