// 「蒼神骸華」の確認シート。node scratchpad/render-gaika.mjs
//   出力: gaika-sheet.png（等倍／拡大／黒塗り）・gaika-four.png（四神柱の並び：大聖堂・玉座・軌道神核・骸華）・gaika-parts.png
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sheet, grid4, partsSheet, report } from './gods-sheet.mjs';
import { GAIKA } from './gaika-candidates.mjs';
import { THRONE } from './throne-candidates.mjs';
import { GODCORE } from './godcore-candidates.mjs';
import { MAOU1 } from './maou1-candidates.mjs';
import { CATHEDRAL as CATH_DRAFT } from './cathedral-candidates.mjs';
import { CATHEDRAL } from '../src/data/enemies.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATH = { id: 'cathedral', sprites: CATHEDRAL.sprites, rig: CATHEDRAL.rig, tier: CATH_DRAFT.tier };

sheet(GAIKA, "SOUSHIN GAIKA / 6TH PLAN", path.join(HERE, "gaika-sheet.png"));
grid4([[CATH, 'DATEN NO DAISEIDOU'], [THRONE, 'FUSHOKU NO GYOKUZA'], [GODCORE, 'KIDOU SHINKAKU'], [GAIKA, 'SOUSHIN GAIKA']], path.join(HERE, 'gaika-four.png'));
partsSheet(GAIKA, path.join(HERE, 'gaika-parts.png'));
report([['大聖堂', CATH], ['腐蝕の玉座', THRONE], ['軌道神核', GODCORE], ['マオウレクス', MAOU1], ['蒼神骸華', GAIKA]]);
