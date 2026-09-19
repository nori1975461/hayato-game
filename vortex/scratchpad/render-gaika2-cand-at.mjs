// 候補（gaika2With へ渡す JSON か export 名）を任意の場所・倍率で撮る。node render-gaika2-cand-at.mjs <出力名> <倍率> <中心の世界x> <中心の世界y> <候補>
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [file, S, wx, wy, a] = [process.argv[2], Number(process.argv[3]) || 3, Number(process.argv[4]) || 0, Number(process.argv[5]) || 0, process.argv[6] || 'GAIKA2'];
const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a], cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
renderBoss(cv, d, { ...d.tier, spriteScale: S }, 320 - wx * S, 180 - wy * S, { glow: false });
writePng(cv, file); console.log('CAND_AT_OK');
