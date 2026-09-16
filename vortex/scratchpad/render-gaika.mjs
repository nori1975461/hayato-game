// 「蒼神骸華」と「首無しの近侍」の確認シート。node scratchpad/render-gaika.mjs
//   出力: gaika-sheet.png（骸華・等倍／拡大／黒塗り）・gaika-retainer-sheet.png（近侍 右）・gaika-battle.png（陣形＝骸華と侍二体・枠 640×440 に本当の画面 360 の帯）
//         gaika-four.png（四神柱の並び・縦 440 のセル）・gaika-parts.png（骸華の全パーツ）
//         gaika-compare.png（第14案改の比較＝曲刀の腕 無し A／有り B）・gaika-battle-sword.png（曲刀ありの陣形）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sheet, grid4, grid2, partsSheet, report, formationSheet } from './gods-sheet.mjs';
import { GAIKA, GAIKA_SWORD, RETAINER_R, RETAINER_L } from './gaika-candidates.mjs';
import { THRONE } from './throne-candidates.mjs';
import { GODCORE } from './godcore-candidates.mjs';
import { MAOU1 } from './maou1-candidates.mjs';
import { CATHEDRAL as CATH_DRAFT } from './cathedral-candidates.mjs';
import { CATHEDRAL } from '../src/data/enemies.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATH = { id: 'cathedral', sprites: CATHEDRAL.sprites, rig: CATHEDRAL.rig, tier: CATH_DRAFT.tier };
const S = 4.2;   // 骸華の spriteScale。近侍は座の両脇 (±66,+52) units（第13案：大きい鐘が斜め下へ出るぶん外へ。幅は採用時の scale で収める）

sheet(GAIKA, "SOUSHIN GAIKA / 16TH PLAN REV", path.join(HERE, "gaika-sheet.png"));
sheet(RETAINER_R, "NANASHI (R) / RETAINER", path.join(HERE, "gaika-retainer-sheet.png"));
formationSheet([[GAIKA, 0, 0], [RETAINER_R, 66 * S, 52 * S], [RETAINER_L, -66 * S, 52 * S]], "SOUSHIN GAIKA + 2 NANASHI / BATTLE FORMATION", path.join(HERE, "gaika-battle.png"), { fh: 440 });
grid4([[CATH, 'DATEN NO DAISEIDOU'], [THRONE, 'FUSHOKU NO GYOKUZA'], [GODCORE, 'KIDOU SHINKAKU'], [GAIKA, 'SOUSHIN GAIKA']], path.join(HERE, 'gaika-four.png'), { cellH: 440 });
partsSheet(GAIKA, path.join(HERE, 'gaika-parts.png'));
grid2([[GAIKA, 'A: NO SWORD ARM (14TH PLAN REV)'], [GAIKA_SWORD, 'B: WITH SWORD ARM']], path.join(HERE, 'gaika-compare.png'), { cellH: 440 });
formationSheet([[GAIKA_SWORD, 0, 0], [RETAINER_R, 66 * S, 52 * S], [RETAINER_L, -66 * S, 52 * S]], "SOUSHIN GAIKA (B: WITH SWORD ARM) + 2 NANASHI", path.join(HERE, "gaika-battle-sword.png"), { fh: 440 });
report([['大聖堂', CATH], ['腐蝕の玉座', THRONE], ['軌道神核', GODCORE], ['マオウレクス', MAOU1], ['蒼神骸華', GAIKA], ['名無し 右', RETAINER_R], ['名無し 左', RETAINER_L]]);
