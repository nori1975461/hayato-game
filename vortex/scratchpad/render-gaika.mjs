// 「蒼神骸華」の確認シート。node scratchpad/render-gaika.mjs
//   出力: gaika-sheet.png（A案・等倍／拡大／黒塗り）・gaika-sheet-B.png（B案）・gaika-four.png／gaika-four-B.png（四神柱の並び・縦 440 のセル＝全身を比べる）・gaika-parts.png（B案の全パーツ）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sheet, grid4, partsSheet, report } from './gods-sheet.mjs';
import { GAIKA_A, GAIKA_B } from './gaika-candidates.mjs';
import { THRONE } from './throne-candidates.mjs';
import { GODCORE } from './godcore-candidates.mjs';
import { MAOU1 } from './maou1-candidates.mjs';
import { CATHEDRAL as CATH_DRAFT } from './cathedral-candidates.mjs';
import { CATHEDRAL } from '../src/data/enemies.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATH = { id: 'cathedral', sprites: CATHEDRAL.sprites, rig: CATHEDRAL.rig, tier: CATH_DRAFT.tier };

sheet(GAIKA_A, "SOUSHIN GAIKA / 7TH PLAN A", path.join(HERE, "gaika-sheet.png"));
sheet(GAIKA_B, "SOUSHIN GAIKA / 7TH PLAN B", path.join(HERE, "gaika-sheet-B.png"));
grid4([[CATH, 'DATEN NO DAISEIDOU'], [THRONE, 'FUSHOKU NO GYOKUZA'], [GODCORE, 'KIDOU SHINKAKU'], [GAIKA_A, 'SOUSHIN GAIKA (A)']], path.join(HERE, 'gaika-four.png'), { cellH: 440 });
grid4([[CATH, 'DATEN NO DAISEIDOU'], [THRONE, 'FUSHOKU NO GYOKUZA'], [GODCORE, 'KIDOU SHINKAKU'], [GAIKA_B, 'SOUSHIN GAIKA (B)']], path.join(HERE, 'gaika-four-B.png'), { cellH: 440 });
partsSheet(GAIKA_B, path.join(HERE, 'gaika-parts.png'));
report([['大聖堂', CATH], ['腐蝕の玉座', THRONE], ['軌道神核', GODCORE], ['マオウレクス', MAOU1], ['蒼神骸華 A', GAIKA_A], ['蒼神骸華 B', GAIKA_B]]);
