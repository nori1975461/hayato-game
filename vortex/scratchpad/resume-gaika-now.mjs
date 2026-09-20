// 蒼神骸華 第二案：2026-09-20 夕方からの作業を再開するときに最初に打つ一本（resume-gaika.mjs は「コードの既定＝第52稿」を調べる道具。こちらは「いま検討中の姿」を出す）。
//   使い方: node vortex/scratchpad/resume-gaika-now.mjs            → 状態の表示＋ 12 前回の推し（肩当て 4＋ブレード）と 19 今回の推し（肩当て 5＋面取り・首の装甲・溝から生える刃） の全身を横並びで gaika2-now.png（640×352）へ
//           node vortex/scratchpad/resume-gaika-now.mjs 3 4        → 番号で選んだ候補（1〜22・最大2つ）を gaika2-now.png へ
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
// 結論待ち＝朔の座の絵（フォルダ 0920/２０ と同じ番号）。18:41 FB「朔の座の考えはいい・黒い月牙はまだすっきりさが足りない・月牙より静かな絵に」→ 繊月の象嵌（形は一つ・色も一つ）
export const CANDS = {
  1: { label: '1 EMPTY (4 MOONS)', jp: '無地（月牙4枚）', o: { ...BASE, dropMoons: ['moonX'] } },
  2: { label: '2 SLIVER STEEL', jp: '繊月・鋼', o: { ...BASE, dormantX: 'sliver' } },
  3: { label: '3 SLIVER EMBER', jp: '繊月・深紅（私の推し）', o: { ...BASE, dormantX: 'sliverEmber' } },
  4: { label: '4 EMBER BOLD', jp: '繊月・深紅の太め', o: { ...BASE, dormantX: 'sliverEmberBold' } },
  5: { label: '5 REF: OLD SAKU', jp: '参考＝いままでの朔の座（黒い月牙・否決）', o: { ...BASE, dormantX: 'dark' } },
  6: { label: '6 REF: LIT (6 MOONS)', jp: '参考＝6枚とも灯る', o: { ...BASE } },
  // 19:05 FB「支柱を伸ばして副腕を装甲から離す」「ただの光刃を静かに間違っている光刃＝蝕刃に」（フォルダ 0920/２１・座は仮に 3）
  7: { label: '7 BOOM', jp: '支柱を伸ばす（光刃はいままで）', o: { ...BASE, dormantX: 'sliverEmber', subBoom: true } },
  8: { label: '8 BOOM + ECLIPSE BLADE', jp: '支柱＋蝕刃（私の案）', o: { ...BASE, dormantX: 'sliverEmber', subBoom: true, subBlade: 'eclipse' } },
  9: { label: '9 REF: LONGER BOOM', jp: '参考＝支柱をさらに長く＋蝕刃', o: { ...BASE, dormantX: 'sliverEmber', subBoom: { root: [76, 12], shift: [3, 33] }, subBlade: 'eclipse' } },
};
// 19:51 FB「蝕刃は⭐・肩のプロテクターをもっとすっきり・頭はもっとモビルスーツ寄りに（頭の上の金は機械としての役割がわからない）」（フォルダ 0920/２２・8 を土台に）
const NOW8 = CANDS[8].o, SH4 = { edge: 'none', bands: false, flare: 5, topW: 9 };
Object.assign(CANDS, {
  10: { label: '10 SHOULDER QUIET', jp: '肩当てをすっきり（段階 4＝私の推し・頭はいままで）', o: { ...NOW8, shoulder: SH4 } },
  11: { label: '11 HEAD PLAIN', jp: '頭＝金を外すだけ', o: { ...NOW8, shoulder: SH4, head: { top: 'none' } } },
  12: { label: '12 HEAD BLADE', jp: '頭＝ブレードアンテナ（私の推し）', o: { ...NOW8, shoulder: SH4, head: { top: 'blade' } } },
  13: { label: '13 HEAD SIDE', jp: '頭＝片側のアンテナ', o: { ...NOW8, shoulder: SH4, head: { top: 'side' } } },
  14: { label: '14 HEAD CROSS', jp: '頭＝十字の軌条', o: { ...NOW8, shoulder: SH4, head: { top: 'cross' } } },
  15: { label: '15 HEAD ARRAY', jp: '頭＝アンテナの列', o: { ...NOW8, shoulder: SH4, head: { top: 'array' } } },
  16: { label: '16 BLADE + ECLIPSE EYE', jp: 'おまけ＝ブレード＋蝕のモノアイ', o: { ...NOW8, shoulder: SH4, head: { top: 'blade', eye: 'eclipse' } } },
});
// 20:56 FB「肩当ては 5＋形でワンアクセント・中心線へ寄せて駆動部品を隠す／頭は 3 か 5（鶏冠と枠つきの十字も好み・6 はくどい）＝『静かに間違って見える』を盛り込んで創造して／顔の両脇の深紅の板と金の縁どりはヒーロー風＝機能美・武骨に」（フォルダ 0920/２３）
const SH7 = { edge: 'none', bands: false, flare: 5, topW: 9, scale: 0.88, dx: 7, accent: 'chamfer' }, BUST = { ...NOW8, shoulder: SH7, collar: {} };
Object.assign(CANDS, {
  17: { label: '17 BUST + BLADE', jp: '肩当て 5＋中心へ 7＋面取り・黒鉄の首の装甲＋すき間の灯・頭＝ブレード（前回の 3）', o: { ...BUST, head: { cheek: 'steel', top: 'blade' } } },
  18: { label: '18 BUST + CROSS', jp: '同・頭＝十字の軌条（前回の 5）', o: { ...BUST, head: { cheek: 'steel', top: 'cross' } } },
  19: { label: '19 BLADE FROM THE RAIL', jp: '同・頭＝溝から生える刃（3＋5・私の推し）', o: { ...BUST, head: { cheek: 'steel', top: 'sunk' } } },
  20: { label: '20 ECLIPSE MAST', jp: '同・頭＝蝕の軌条（枠つきの十字＋鶏冠＋刃・芯が黒い）', o: { ...BUST, head: { cheek: 'steel', top: 'mast' } } },
  21: { label: '21 MAST, CREST SHAPE', jp: '同・頭＝蝕の軌条・鶏冠の形', o: { ...BUST, head: { cheek: 'steel', top: 'mast', w0: 3.4, w1: 1.3, yK: -57, h: 10 } } },
  22: { label: '22 AXIS ON THE EYE', jp: '同・頭＝眼の真上に立つ刃', o: { ...BUST, head: { cheek: 'steel', top: 'sunk', ex: -3.6 } } },
});

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
console.log('\n=== 4. 結論待ち＝①朔の座の絵（2〜4・ユーザー検討中）②蝕刃は⭐採用・支柱は指摘なし＝8 で進行 ③肩当ては 5 に決定＝形のアクセントと中心寄せ・顔の両脇・頭の新案（17〜22）＝FB 待ち ===');
for (const [k, c] of Object.entries(CANDS)) console.log('  ' + k + '＝' + c.jp + '  ' + JSON.stringify(c.o));

const pick = process.argv.slice(2).map(Number).filter((n) => CANDS[n]).slice(0, 2), ids = pick.length ? pick : [12, 19];
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
