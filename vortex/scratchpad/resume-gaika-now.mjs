// 蒼神骸華 第二案：2026-09-20 夕方からの作業を再開するときに最初に打つ一本（閉じた姿は 09-21 18:50 に全部確定＝コードの既定は第53稿。resume-gaika.mjs はその既定を調べる道具・こちらは候補を並べて見る道具）。
//   使い方: node vortex/scratchpad/resume-gaika-now.mjs            → 状態の表示＋ 63 左肩の私の推し（跳ね上げ・金）と 80 その最終形態（⭐発射架＋胸の炉の扉が開く・白金） の全身を横並びで gaika2-now.png（640×352）へ
//           node vortex/scratchpad/resume-gaika-now.mjs 3 4        → 番号で選んだ候補（1〜87・最大2つ）を gaika2-now.png へ
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
// 22:07 FB「右肩は面取り・左肩は跳ね上げ／頭は 4 蝕の軌条で／首は 4（＋すき間の灯）か 5（襟なし）で迷っている／一番下は繊月・鋼か深紅か もっとよいアイデアがないか迷っている」（フォルダ 0920/２４）
//   決定＝肩の accent は [画面左（骸華の右肩）, 画面右（骸華の左肩）]・頭は mast。首と座は見比べ中＝土台（23）は首 4・座 深紅のまま
const DEC = { ...BUST, shoulder: { ...SH7, accent: ['chamfer', 'fin'] }, head: { cheek: 'steel', top: 'mast' } }, WAX = (fill) => ({ c: 'm', fill });
Object.assign(CANDS, {
  23: { label: '23 DECIDED: R CHAMFER / L FIN + MAST', jp: '決定を反映＝右肩は面取り・左肩は跳ね上げ・頭は蝕の軌条（首は 4・座は深紅のまま＝いまの土台）', o: { ...DEC } },
  24: { label: '24 LOWER NECK GUARD', jp: '同・首＝低い首の装甲＋灯（上端 −41・私の推し）', o: { ...DEC, collar: { top: -41 } } },
  25: { label: '25 LOWEST NECK GUARD', jp: '同・首＝もっと低い（上端 −38）', o: { ...DEC, collar: { top: -38 } } },
  26: { label: '26 NO COLLAR', jp: '同・首＝襟なし（前回の 5）', o: { ...DEC, collar: 'none' } },
  27: { label: '27 SEAT: STEEL SLIVER', jp: '同・座＝繊月・鋼（満ち具合 0）', o: { ...DEC, dormantX: 'sliver' } },
  28: { label: '28 SEAT: WAXING 0.2', jp: '同・座＝満ちかけの繊月 0.2', o: { ...DEC, dormantX: WAX(0.2) } },
  29: { label: '29 SEAT: WAXING 0.3', jp: '同・座＝満ちかけの繊月 0.3（私の推し）', o: { ...DEC, dormantX: WAX(0.3) } },
  30: { label: '30 SEAT: WAXING 0.45', jp: '同・座＝満ちかけの繊月 0.45', o: { ...DEC, dormantX: WAX(0.45) } },
  31: { label: '31 REF: ECLIPSE SLIVER', jp: '参考＝蝕の繊月（芯が黒く縁だけ深紅）', o: { ...DEC, dormantX: { c: 'r', core: 'k' } } },
  32: { label: '32 MY PICK: LOWER NECK + WAXING 0.3', jp: '私の推しの組み合わせ＝低い首の装甲＋満ちかけ 0.3', o: { ...DEC, collar: { top: -41 }, dormantX: WAX(0.3) } },
  33: { label: '33 NO COLLAR + WAXING 0.3', jp: '襟なし＋満ちかけ 0.3', o: { ...DEC, collar: 'none', dormantX: WAX(0.3) } },
});
// 22:47 FB「首＝4 襟なし／一番下の座は 3 かなと思ったがまだもやもやが解消されない。再度アイデアを練り直して」（フォルダ 0920/２５）
//   絞った質問への回答＝もやもやは「絵に凄みがない」「無くてもいい気もする」・守りたいのは「月にこだわらない」（閉は 4 枚でよい・開いたら 6 枚は変えない）・左右で違える案は不要
//   決定＝首は襟なし。座は月の形をやめ、空間の意味の与え方を 足す／塗る／引く に振って見比べ中＝土台（34）は襟なし・座は無地
const DEC2 = { ...DEC, collar: 'none' };
Object.assign(CANDS, {
  34: { label: '34 DECIDED: NO COLLAR / SEAT PLAIN', jp: '決定を反映＝首は襟なし（座は無地＝いまの土台・0920/２５ の 1）', o: { ...DEC2, dormantX: { kind: 'none' } } },
  35: { label: '35 SEAT: ECLIPSED VENT', jp: '同・座＝蝕の炉口（足す＝段のすき間の炉の光が芯から黒く蝕まれる・0920/２５ の 3）', o: { ...DEC2, dormantX: { kind: 'band', eclipse: true } } },
  36: { label: '36 SEAT: RISING UMBRA', jp: '同・座＝昇る蝕（塗る＝蒼の装甲が下から闇に呑まれる・私の推し・0920/２５ の 4）', o: { ...DEC2, dormantX: { kind: 'umbra' } } },
  37: { label: '37 SEAT: RISING UMBRA, HIGHER', jp: '同・座＝昇る蝕・高い（闇の高さだけ違う・0920/２５ の 5）', o: { ...DEC2, dormantX: { kind: 'umbra', c: [0, 58] } } },
  38: { label: '38 SEAT: BITE', jp: '同・座＝食（引く＝殻の外の縁を円弧で切り欠く・0920/２５ の 6）', o: { ...DEC2, dormantX: { kind: 'bite' } } },
});
// 09-21 00:11 FB「4 昇る蝕と 6 食の最終形態をみせてくれないと判断の仕様がない」（フォルダ 0921/１）＝閉じた姿から装甲が開くまでを同じ枠で
//   昇る蝕＝平常（36）→ 前ぶれ（37）→ 皆既＝闇が昇りきり縁が灼ける（39）→ 最終形態＝装甲が開く（40）＝「蒼神 → 骸 → 華」／食＝閉（38）→ 最終形態（41）／くらべる基準＝元の殻の最終形態（42）
const OPEN4 = { open: 16, thirdPts: [[67, -32], [90, -34], [108, -30]], thirdArm: true }, TOTAL = { kind: 'umbra', r: 215, inner: true, burn: 'R' };
Object.assign(CANDS, {
  39: { label: '39 UMBRA: TOTALITY (RIM BURNS)', jp: '昇る蝕・皆既＝闇が昇りきり 沈んでいた縁取りが深紅に灼ける（閉じた姿・0921/１ の 4-3）', o: { ...DEC2, dormantX: TOTAL } },
  40: { label: '40 UMBRA: FINAL FORM (OPEN)', jp: '昇る蝕の最終形態＝黒い板が割れて炉の赤が咲く（0921/１ の 4-4）', o: { ...DEC2, ...OPEN4, dormantX: TOTAL } },
  41: { label: '41 BITE: FINAL FORM (OPEN)', jp: '食の最終形態＝切り欠いた縁のまま外の板が開く（0921/１ の 6-2）', o: { ...DEC2, ...OPEN4, dormantX: { kind: 'bite' } } },
  42: { label: '42 REF PLAIN SHELL: FINAL FORM', jp: '参考＝元の殻の最終形態（「開」の第一稿に今日までの決定を載せた姿）', o: { ...DEC2, ...OPEN4 } },
});
// 09-21 01:17 FB「#4 昇る蝕にしよう／左肩を 跳ね上げではなく棘にして・左肩のプロテクターの色を変えて（真紅・金・銀・白・緑・黄色など）・ひと目で印象に残るように・格は落とさない」（フォルダ 0921/２）
//   決定＝座は昇る蝕（DEC3）。読み＝変えるのは骸華の左肩（画面右）の肩当てだけ。形の見比べは色を白骨で固定（43〜47）・色の見比べは形を大きな一本棘で固定（48〜56）
const DEC3 = { ...DEC2, dormantX: { kind: 'umbra' } }, SHL = (form, tint, extra = {}) => ({ ...SH7, ...form, ...(tint ? { tint: [null, tint] } : {}), ...extra });
const SP_SHORT = { accent: ['chamfer', 'spike'] }, SP_UP = { accent: ['chamfer', 'spikes'], spikes: [[5, -11, 80, 18, 5]], seam: true }, SP_62 = { accent: ['chamfer', 'spikes'], spikes: [[7, -10, 62, 18, 5]], seam: true };
const SP_45 = { accent: ['chamfer', 'spikes'], spikes: [[8, -8, 45, 17, 4.5]], seam: true }, SP_TRI = { accent: ['chamfer', 'spikes'], spikes: [[2, -11, 85, 9, 3.8], [8.5, -8, 48, 10, 3.8], [12, 0, 12, 9, 3.8]], seam: true };
Object.assign(CANDS, {
  43: { label: '43 L-SHOULDER: SHORT SPIKE, BONE', jp: '左肩＝前に見せた短い棘・白骨（0921/２ 形の 1）', o: { ...DEC3, shoulder: SHL(SP_SHORT, 'bone') } },
  44: { label: '44 L-SHOULDER: ONE BIG SPIKE, BONE (MY PICK)', jp: '左肩＝大きな一本棘・ほぼ直立・白骨＝私の推し（形の 2＝色の 1）', o: { ...DEC3, shoulder: SHL(SP_UP, 'bone') } },
  45: { label: '45 L-SHOULDER: LEANING 62, BONE', jp: '左肩＝外へ倒した一本棘 62°・白骨（形の 3）', o: { ...DEC3, shoulder: SHL(SP_62, 'bone') } },
  46: { label: '46 L-SHOULDER: LEANING 45, BONE', jp: '左肩＝もっと外へ 45°・白骨（形の 4）', o: { ...DEC3, shoulder: SHL(SP_45, 'bone') } },
  47: { label: '47 REF L-SHOULDER: THREE SPIKES, BONE', jp: '参考＝三本棘（ザクの左肩の型）・白骨（形の 5）', o: { ...DEC3, shoulder: SHL(SP_TRI, 'bone') } },
  48: { label: '48 L-SHOULDER: BIG SPIKE, IRON', jp: '左肩＝大きな一本棘・黒鉄のまま（色の 0＝くらべる基準）', o: { ...DEC3, shoulder: SHL(SP_UP, null) } },
  49: { label: '49 L-SHOULDER: BIG SPIKE, CRIMSON', jp: '同・真紅（色の 2）', o: { ...DEC3, shoulder: SHL(SP_UP, 'crimson') } },
  50: { label: '50 L-SHOULDER: BIG SPIKE, DEEP CRIMSON', jp: '同・深い真紅（色の 3）', o: { ...DEC3, shoulder: SHL(SP_UP, 'blood') } },
  51: { label: '51 L-SHOULDER: BIG SPIKE, GOLD', jp: '同・金（色の 4）', o: { ...DEC3, shoulder: SHL(SP_UP, 'gold') } },
  52: { label: '52 L-SHOULDER: BIG SPIKE, SILVER', jp: '同・銀（色の 5）', o: { ...DEC3, shoulder: SHL(SP_UP, 'silver') } },
  53: { label: '53 L-SHOULDER: BIG SPIKE, GREEN', jp: '同・緑（色の 6）', o: { ...DEC3, shoulder: SHL(SP_UP, 'green') } },
  54: { label: '54 L-SHOULDER: BIG SPIKE, YELLOW', jp: '同・黄色（色の 7）', o: { ...DEC3, shoulder: SHL(SP_UP, 'yellow') } },
  55: { label: '55 REF: ONLY THE SPIKE IS BONE', jp: '参考＝棘だけ白骨・面は黒鉄のまま（色の 8）', o: { ...DEC3, shoulder: SHL(SP_UP, 'bone', { tintPlate: false }) } },
  56: { label: '56 MY PICK: TOTALITY', jp: '私の推し（44）の皆既＝蒼が消えても白骨の肩は残る（0921/２ ページ６の 2）', o: { ...DEC2, dormantX: TOTAL, shoulder: SHL(SP_UP, 'bone') } },
  57: { label: '57 MY PICK: FINAL FORM (OPEN)', jp: '私の推し（44）の最終形態（ページ６の 3）', o: { ...DEC2, ...OPEN4, dormantX: TOTAL, shoulder: SHL(SP_UP, 'bone') } },
  58: { label: '58 CRIMSON: FINAL FORM (OPEN)', jp: '真紅（49）の最終形態＝炉の赤に紛れる（写真３）', o: { ...DEC2, ...OPEN4, dormantX: TOTAL, shoulder: SHL(SP_UP, 'crimson') } },
});
// 09-21 13:08 FB「蒼の装甲が割れてむき出しになる炉心が不気味。破滅的要素と不気味さは違う。炉心のビジュアルを創造して／最終的に胸の装甲が開いて弱点が露出される設計だったか？その説明とビジュアルも／
//   左肩の形状は棘ではなく面上げで。色の候補は真紅、金、黄色に絞る。その三つの全体像をクリックで比較／弱点は割れた装甲の炉心ではなく左肩にするか？その善し悪しも検証して」（フォルダ 0921/３）
//   読み＝「面上げ」は面取り（右肩と同じ形）・念のため跳ね上げでも同じ三色／不気味の正体＝割れ目の奥の背骨＋椎骨（骨格の図像）。白骨と棘は不採用（色は真紅・金・黄色へ絞られた）
const SP_CH = { accent: 'chamfer' }, SP_FIN = { accent: ['chamfer', 'fin'] }, FINAL4 = { ...DEC2, ...OPEN4, dormantX: TOTAL }, CORE_PICK = { openCore: 'rack', chest: { tone: 'gold' } };
Object.assign(CANDS, {
  59: { label: '59 L-SHOULDER: CHAMFER, CRIMSON', jp: '左肩＝面取り・真紅（0921/３ ページ２の 1）', o: { ...DEC3, shoulder: SHL(SP_CH, 'crimson') } },
  60: { label: '60 L-SHOULDER: CHAMFER, GOLD (MY PICK)', jp: '左肩＝面取り・金＝私の推し（ページ２の 2）', o: { ...DEC3, shoulder: SHL(SP_CH, 'gold') } },
  61: { label: '61 L-SHOULDER: CHAMFER, YELLOW', jp: '左肩＝面取り・黄色（ページ２の 3）', o: { ...DEC3, shoulder: SHL(SP_CH, 'yellow') } },
  62: { label: '62 L-SHOULDER: FIN, CRIMSON', jp: '左肩＝跳ね上げ・真紅（「面上げ」が跳ね上げだった場合・ページ３の 1）', o: { ...DEC3, shoulder: SHL(SP_FIN, 'crimson') } },
  63: { label: '63 L-SHOULDER: FIN, GOLD', jp: '同・金（ページ３の 2）', o: { ...DEC3, shoulder: SHL(SP_FIN, 'gold') } },
  64: { label: '64 L-SHOULDER: FIN, YELLOW', jp: '同・黄色（ページ３の 3）', o: { ...DEC3, shoulder: SHL(SP_FIN, 'yellow') } },
  65: { label: '65 CORE: NOW (SPINE + VERTEBRAE)', jp: '炉心＝いまの絵（背骨＋椎骨＝不気味の正体・両肩は黒鉄の面取り・ページ４の 1）', o: { ...FINAL4, shoulder: SHL(SP_CH, null) } },
  66: { label: '66 CORE: SPINE ONLY', jp: '炉心＝椎骨を外す（ページ４の 2）', o: { ...FINAL4, openCore: 'spine', shoulder: SHL(SP_CH, null) } },
  67: { label: '67 CORE: LAUNCH RACK (NO GLOW)', jp: '炉心＝割れ目の奥は月牙の発射架・光なし（ページ４の 3）', o: { ...FINAL4, openCore: 'rack', shoulder: SHL(SP_CH, null) } },
  68: { label: '68 CORE: RACK + CHEST DOOR OPENS, WHITE GOLD (MY PICK)', jp: '炉心＝発射架＋胸の炉の扉が開く・白金の光＝私の推し（ページ４の 4）', o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_CH, null) } },
  69: { label: '69 CORE: RACK + CHEST DOOR, CRIMSON', jp: '同・炉心が深紅（ページ４の 5）', o: { ...FINAL4, openCore: 'rack', chest: { tone: 'crimson' }, shoulder: SHL(SP_CH, null) } },
  70: { label: '70 CORE: CHEST DOOR + RIM LIGHT ON OPENED PLATES', jp: '68＋炉心の光が開いた板の内側を金に灼く（ページ４の 6）', o: { ...FINAL4, openCore: { kind: 'rim', tone: 'gold' }, chest: { tone: 'gold' }, shoulder: SHL(SP_CH, null) } },
  71: { label: '71 FINAL: PICK CORE + CRIMSON SHOULDER', jp: '最終形態・推しの炉心＋左肩 真紅（写真６）', o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_CH, 'crimson') } },
  72: { label: '72 FINAL: PICK CORE + GOLD SHOULDER', jp: '最終形態・推しの炉心＋左肩 金（写真６・写真７の土台）', o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_CH, 'gold') } },
  73: { label: '73 FINAL: PICK CORE + YELLOW SHOULDER', jp: '最終形態・推しの炉心＋左肩 黄色（写真６）', o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_CH, 'yellow') } },
});
// 09-21 18:08 FB「#弱点は胸の炉心でよい。#扉が開く（白金の光）を採用。#左肩は胸の扉を開ける鍵にする案を採用（左肩に当てるとスイッチが入る＝ガツンという重低音 → 胸の弱点が開く → 胸に当てるとダメージ → 一定時間で閉まる → 左肩で再び開く・その繰り返し）。
//   #左肩は真紅、金、銀、黄色でまだ迷っている。跳ね上げか棘かでも。全体像が見れる写真を各種一枚ずつ撮影して。一枚画の全体像を比較して決めたい。」＋18:18「ここで私が言った棘は、『短い棘』のこと。」
//   ⚠️前回の「面上げ」は跳ね上げの意味だった（面取りと読んだ私の読みは外れ）＝面取りは左肩の候補から外れた。⚠️「棘」は大きな一本棘ではなく短い棘（SP_SHORT）。
//   渡したもの＝0921/４（build-gaika2-folder29.sh）。跳ね上げ × 真紅・金・黄色は 62〜64 が同じ絵。
const COLS4 = [['crimson', 'CRIMSON', '真紅'], ['gold', 'GOLD', '金'], ['silver', 'SILVER', '銀'], ['yellow', 'YELLOW', '黄色']];
Object.assign(CANDS, {
  74: { label: '74 L-SHOULDER: FIN, SILVER', jp: '左肩＝跳ね上げ・銀（0921/４ の 3）', o: { ...DEC3, shoulder: SHL(SP_FIN, 'silver') } },
  ...Object.fromEntries(COLS4.map(([c, en, jp], i) => [75 + i, { label: (75 + i) + ' L-SHOULDER: SHORT SPIKE, ' + en, jp: '左肩＝短い棘・' + jp + '（0921/４）', o: { ...DEC3, shoulder: SHL(SP_SHORT, c) } }])),
  ...Object.fromEntries(COLS4.map(([c, en, jp], i) => [79 + i, { label: (79 + i) + ' FINAL: FIN, ' + en, jp: '最終形態（⭐発射架＋胸の炉の扉・白金）・左肩＝跳ね上げ・' + jp, o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_FIN, c) } }])),
  ...Object.fromEntries(COLS4.map(([c, en, jp], i) => [83 + i, { label: (83 + i) + ' FINAL: SHORT SPIKE, ' + en, jp: '最終形態（同）・左肩＝短い棘・' + jp, o: { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_SHORT, c) } }])),
  87: { label: '87 KEY IDEA: PLATE STRUCK DOWN, CHEST OPEN', jp: '案＝跳ね上げた板が「鍵」そのもの＝叩かれて板が落ち（面取り）胸の炉の扉が開いた平常の姿（色は説明用に金・ふだんの姿は 63）', o: { ...DEC3, chest: { tone: 'gold' }, shoulder: SHL(SP_CH, 'gold') } },
});
// 09-22 朝：「開」の姿の詰め①月牙が出ていった跡（閉じた姿は「面にきっちり嵌め込み・穴なし」で確定しているのに、開いた板に跡が無かった）
//   ②蒼の装甲が開いて出る砲（09-20 16:59「バルカン砲（電子パルス砲）は外そう。蒼の装甲が開く際に出現するものとする」＝出る砲の絵は未定のままだった）
//   渡したもの＝0922/１（build-gaika2-folder31.sh）。土台は候補 80（最終形態・左肩 跳ね上げ・金）。私の推し＝跡 91・砲 92。
const FIN80 = { ...FINAL4, ...CORE_PICK, shoulder: SHL(SP_FIN, 'gold') }, HOLE_PICK = { kind: 'moon', seat: true, burn: true };
Object.assign(CANDS, {
  88: { label: '88 OPEN HOLE: SOCKET', jp: '跡＝月牙の形の窪み（底は暗い鋼・0922/１ の 2）', o: { ...FIN80, openHole: 'socket' } },
  89: { label: '89 OPEN HOLE: SOCKET + SEAT', jp: '跡＝窪み＋第36稿の空の座（蒼い軌条と金の留め具二つ・0922/１ の 3）', o: { ...FIN80, openHole: { kind: 'socket', seat: true } } },
  90: { label: '90 OPEN HOLE: HOLE + SEAT', jp: '跡＝抜けた穴＋軌条と留め具（0922/１ の 4）', o: { ...FIN80, openHole: { kind: 'moon', seat: true } } },
  91: { label: '91 OPEN HOLE: HOLE + SEAT + BURN', jp: '跡＝穴＋軌条と留め具＋灼けた縁（⭐私の推し・等倍で読めるのはこれだけ・0922/１ の 5）', o: { ...FIN80, openHole: HOLE_PICK } },
  92: { label: '92 OPEN GUN: VULCAN', jp: '出る砲＝バルカン砲（砲身の束三本・⭐私の推し・0922/１ の 3）', o: { ...FIN80, openHole: HOLE_PICK, openGun: 'gun' } },
  93: { label: '93 OPEN GUN: MIXED', jp: '出る砲＝左右で違える（骸華の左肩＝画面右だけバルカン砲・0922/１ の 2）', o: { ...FIN80, openHole: HOLE_PICK, openGun: ['launcher', 'gun'] } },
  94: { label: '94 OPEN GUN: SABER', jp: '出る砲＝光刃（参考＝砲を出さない・0922/１ の 4）', o: { ...FIN80, openHole: HOLE_PICK, openGun: 'saber' } },
});
// ⭐09-22 のご決定＝跡は「3 窪み＋金具」／出るものは「4 光刃」（「ビジュアルが最もしっくりきた」）＝95 が最終形態の確定版＝コードの既定（GAIKA2_FINAL）。
//   ⚠️96／97 は作って捨てた案（色を変えて差をつける手）＝マゼンタは機体の中で埋もれない唯一の色（同系色が機体のほかにある割合 mag 1.90%／gold 8.46%／silver 15.10%）。
const HOLE_DEF = { kind: 'socket', seat: true };
Object.assign(CANDS, {
  95: { label: '95 FINAL FIXED: SOCKET+SEAT, MAG SABER', jp: '⭐最終形態の確定版（09-22）＝跡は月牙の形の窪み＋軌条と金の留め具・三本目の腕はマゼンタの光刃', o: { ...FIN80, openHole: HOLE_DEF, openGun: 'saber' } },
  96: { label: '96 REJECTED: PLATINUM SABER', jp: '却下＝三本目の刃を白金（胸の炉と同じ色域）に。拡大では金の棒に見え 等倍では輪の炎と胸の金に埋もれた', o: { ...FIN80, openHole: HOLE_DEF, openGun: { kind: 'saber', tone: 'gold' } } },
  97: { label: '97 REJECTED: SILVER SABER', jp: '却下＝三本目の刃を白銀に。機体の鋼と同系色（15.10%）で塗っていない金属に見える', o: { ...FIN80, openHole: HOLE_DEF, openGun: { kind: 'saber', tone: 'silver' } } },
});
// ⭐09-22 12:37 ユーザー「弱点は胸の中心 → 近づくしかない」は必ずしも成り立たない（ビリヤード弾＝遠距離が基本・近づいたのはボスの近くに弾があったから・
//   骸華の月牙は飛来する弾なのでボスの近くにない）→「追加の 2 本の光刃を遠距離武器に。刃に見えて光弾が飛ぶのもいい」＝実装（vortex/src）を実測して採用。
//   三本目の腕の光刃＝「刃に見えて光弾を撃つ」遠距離の武器（openGun: { kind:'saber', shots:n }）。構えの絵（95）は変えず、撃つ瞬間が 98。
//   ⚠️同時に判明＝光刃は arms の格子（±164）で先が切れていた（実長 52・先が平ら）。「開」のときだけ格子を左右 24 広げて直した（patch-gaika-armwide.cjs）
//   ＝94〜97 の画素が刃先の帯（x=±164〜183・293 画素）だけ変わった。閉じた姿は不変（hash d21ac02000c9）。
Object.assign(CANDS, {
  98: { label: '98 SABER FIRING: 3 SHOTS + FLASH', jp: '⭐三本目の光刃が撃つ瞬間（09-22 12:37 採用）＝刃先に閃き・紡錘の光弾 3 発が刃の延長線上へ（間 14）', o: { ...FIN80, openHole: HOLE_DEF, openGun: { kind: 'saber', shots: 3 } } },
});
// ⭐09-22 18:05 ユーザー「Version ごとに全身を撮影して」＝7 段階（基本 63 → 満ち始める 99 → ほぼ満つる 100 → 完全に満つる 101 → 最終形態 放射前 102 → 放射後 95 → 炉心光る 87）＝0922/４
//   「満ちる」＝昇る蝕（dormantX umbra）の半径 r（115 → 215）。145／180 は私が仮に置いた中間値＝ゲームでは連続的に動かす（採用時の宿題）
//   「放射前」＝今日足した口 moonsSeated（開いた板の座に月牙が載ったまま・座は板と一緒に SHO_PIV を軸に回る・描画器 render-boss-rig.mjs に rot を足した）
Object.assign(CANDS, {
  99: { label: '99 STATE: FILLING (r145)', jp: '蒼の装甲が満ち始める＝昇る蝕 r145（仮）', o: { ...M.GAIKA2_DEF53, dormantX: { kind: 'umbra', r: 145 } } },
  100: { label: '100 STATE: NEARLY FULL (r180)', jp: '蒼の装甲がほぼ満つる＝昇る蝕 r180（仮）', o: { ...M.GAIKA2_DEF53, dormantX: { kind: 'umbra', r: 180 } } },
  101: { label: '101 STATE: TOTAL ECLIPSE (CLOSED)', jp: '完全に満つる＝皆既（r215・inner・縁が灼ける）を閉じたまま', o: { ...M.GAIKA2_DEF53, dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' } } },
  102: { label: '102 FINAL: BEFORE LAUNCH (MOONS SEATED)', jp: '最終形態・月牙放射前＝開いた板の座に月牙が載ったまま（moonsSeated・跡なし）', o: { ...M.GAIKA2_FINAL_OPT, moonsSeated: true, openHole: 'none' } },
});
// ⭐09-22 19:34 ユーザー「後の2本の光刃のレーザー部分をもっと長くして。レーザー兵器と一目見てわかるように形を変えて。必要であれば柄も修正してかまわない」＝0922/５ で 6 案
//   分かったこと＝光の断面をどう変えても「手から光が生えている」かぎり刀に見える。効いたのは手の先の灰色の筒（砲身）＝光がその口から出る形（barrel）。
//   ⚠️等倍では B／C／D の差はほぼ見えない（光の幅は 3〜4 画素）。等倍で読めるのは「長さ」と「砲身の暗い区切り」の 2 つだけ＝実測。
Object.assign(CANDS, {
  103: { label: '103 LASER: LONGER BLADE ONLY (L120)', jp: 'A 長いだけ（形は刃のまま・長い剣に見える＝比較の土台）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120 } },
  104: { label: '104 LASER: BARREL + STRAIGHT BEAM', jp: '⭐B 砲身＋等幅の光（私の推し・先は切ったまま）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, openGun: { kind: 'saber', style: 'beam', barrel: 20 } } },
  105: { label: '105 LASER: BARREL + WIDENING BEAM', jp: 'C 砲身＋先へ広がる光（剣ではありえない形＝いちばん刃でない）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, openGun: { kind: 'saber', style: 'cone', barrel: 20 } } },
  106: { label: '106 LASER: BARREL + PULSING BEAM', jp: 'D 砲身＋脈打つ光（節が流れる）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, openGun: { kind: 'saber', style: 'pulse', barrel: 20 } } },
  107: { label: '107 LASER: NO BARREL (CONTROL)', jp: 'E 砲身なし・等幅の光＝対照（砲身が効いているかを見る一枚）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, openGun: { kind: 'saber', style: 'beam' } } },
  108: { label: '108 LASER: BARREL + BEAM, FIRING', jp: 'B が撃つ瞬間（光弾は光の先から出る）', o: { ...M.GAIKA2_FINAL_OPT, saberLen: 120, openGun: { kind: 'saber', style: 'beam', barrel: 20, shots: 3 } } },
});

// ほかの道具（check-gaika2-cands.mjs）が BASE／CANDS だけを読み込めるよう、表示と書き出しは直接実行されたときだけ行う
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
console.log('=== 1. リポジトリの状態 ===');
console.log(git('status', '-sb', '-uno').split('\n')[0]);
console.log(git('log', '--oneline', '-3'));
console.log('\n=== 2. 不変の確認（コードの既定は第53稿＝閉じた姿の確定・09-21 18:50） ===');
console.log(' ', node('check-gaika1-hash.mjs'));
console.log(' ', node('check-gaika2-hash.mjs', 'd21ac02000c9'));
console.log('\n=== 3. 2026-09-20 に確定したこと ===');
console.log('  ・バルカン砲（電子パルス砲）と肩の腕は閉じた姿から外す（thirdArm:false）。蒼の装甲が開くときに出現する');
console.log('  ・光刃の付け根は副腕（kit:launcher・foreTurn:[20,35]・subStraight:true）。光刃は振る');
console.log('  ・付け根は蒼の装甲の奥から生える（subBehind:true＝role を podL にして殻の奥へ）');
console.log('  ・月牙は収めた姿で穴なし（stowed:true）');
console.log('  ・副腕の光刃は蝕刃（subBlade:eclipse）・支柱は短いほう（subBoom:true）／肩当ては 5・中心へ 7');
console.log('  ・⭐22:07 肩当ての形＝骸華の右肩（画面左）は面取り・左肩（画面右）は跳ね上げ（shoulder.accent:[chamfer,fin]）／頭は蝕の軌条（head.top:mast）');
console.log('  ・⭐22:47 首は襟なし（collar:none）／一番下の座は月の形をやめる（「月にこだわらない」・閉は 4 枚でよい・開いたら 6 枚は変えない）・月牙を左右で違える案は不要');
console.log('  ・⭐09-21 01:17 一番下の座は 4 昇る蝕（dormantX:{kind:umbra}）＝最終形態まで見て決定（皆既の「縁が灼ける」burn の要否は未回答＝いまは灼ける版のまま・催促しない）');
console.log('  土台の引数:', JSON.stringify(BASE));
console.log('  ・09-21 13:08 左肩＝大きな一本棘と白骨は不採用。形は「面上げ」＝跳ね上げの意味だった（面取りと読んだのは外れ＝面取りは候補から外れた）');
console.log('  ・⭐09-21 18:08 弱点は胸の炉心／胸の炉の扉が開く・白金の光を採用（chest:{tone:gold}・割れ目の奥は発射架 openCore:rack と読んだ＝68）');
console.log('  ・⭐⭐09-21 18:50 左肩の形＝跳ね上げ・色＝金で決定（候補 63）。鍵の入り方と炉心の開き方は「跳ね上げた板が鍵そのもの」の案を採用（候補 87）');
console.log('  ・⭐⭐09-21 18:50 これで閉じた姿は全部確定＝コードの既定を第53稿へ（GAIKA2＝63／GAIKA2_KEYDOWN＝87／GAIKA2_FINAL＝80・画素一致は check-gaika2-def53.mjs）');
console.log('  ・⭐09-21 18:08 行動＝左肩は胸の扉を開ける鍵：左肩に当てるとスイッチが入る（ガツンという重低音）→ 胸の弱点が開く → 胸に当てるとダメージ → 一定時間で閉まる → 左肩で再び開く・その繰り返し');
console.log('  ・09-22 朝「開」の姿の詰めに着手＝①月牙が出ていった跡（openHole。閉じた姿が「面に嵌め込み・穴なし」なのに開いた板に跡が無かった）');
console.log('  　　　　　　　　　　　　　　　②蒼の装甲が開いて出る砲（openGun。外すことは決まっていたが出る砲の絵は未定だった）＝0922/１ で 5 案と 4 案を渡した（⏳回答待ち）');
console.log('  ・09-22 跡は「月牙の形」で揃えた＝角丸の開口（第36稿）は月牙が穴に収まっていた頃の名残なので外し、中の軌条と留め具だけ引き継いだ');
console.log('  ・09-22 実測＝等倍で跡があると読めるのは「灼けた縁」を足した案だけ（明るくなる画素 650 対 暗い赤 331・暗い赤は等倍で灯にならない）');
console.log('  ・⭐09-22 昼 最終形態の確定＝跡は窪み＋金具（socket+seat）・三本目の腕はマゼンタの光刃（候補 95＝GAIKA2_FINAL）。白金・白銀の刃は却下（96・97）');
console.log('  ・⭐09-22 12:37 三本目の光刃は「刃に見えて光弾を撃つ」遠距離の武器に（ユーザー案を採用・撃つ瞬間＝候補 98）。同時に刃先の切れ（格子 ±164）を直した＝0922/３');
console.log('  ・⭐09-22 18:05 7 段階の全身を 0922/４ で渡した（満ちる＝umbra r・放射前＝moonsSeated）');
console.log('  ・⭐09-22 19:34 三本目の光刃をレーザー兵器の形へ＝0922/５ で 6 案（砲身 barrel が効く・長さ 120）。⏳形と長さの回答待ち');
console.log('\n=== 4. 候補の引数（1〜108）。左肩は 63（跳ね上げ・金）で決着・鍵の案は 87 を採用・最終形態は 95（構え）／98（撃つ瞬間） ===');
for (const [k, c] of Object.entries(CANDS)) console.log('  ' + k + '＝' + c.jp + '  ' + JSON.stringify(c.o));

const pick = process.argv.slice(2).map(Number).filter((n) => CANDS[n]).slice(0, 2), ids = pick.length ? pick : [63, 80];
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
console.log('\n次にやること・各稿の FB と数字は メモリの MEMORY.md 1行目 と project_vortex_god_visuals_20260915.md（全文 Read 禁止・grep -n "炉心の作り直し\|左肩の肩当て（棘の形と色）\\|一番下の座の練り直し\\|引継ぎ（2026-09-20 21" → sed -n）');
console.log('道具＝候補の画素一致 node check-gaika2-cands.mjs／左肩以外が不変か node check-gaika2-shoulder-diff.mjs／色の目立ち方の実測 node measure-gaika2-shoulder-pop.mjs／写真 bash shot-gaika2.sh／ページの巡回 node check-click-viewer.mjs <フォルダ>／炉心の案で変わる場所の検査 node check-gaika2-core-diff.mjs／弱点の検証図 node render-gaika2-weak-diagram.mjs／前回の一式の作り方 build-gaika2-folder28.sh（0921/３＝炉心・胸の炉の扉・左肩の三色・弱点・その前は -folder27.sh＝0921/２）');
}
