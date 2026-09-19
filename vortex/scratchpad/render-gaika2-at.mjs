// 第二案の任意の場所を拡大する。node render-gaika2-at.mjs <倍率> <中心の世界x> <中心の世界y> [出力名] [export 名]
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const S = Number(process.argv[2]) || 4, wx = Number(process.argv[3]) || 0, wy = Number(process.argv[4]) || 0, file = process.argv[5] || './gaika2-at.png', d = M[process.argv[6] || 'GAIKA2'];
const cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
renderBoss(cv, d, { ...d.tier, spriteScale: S }, 320 - wx * S, 180 - wy * S, { glow: false });
writePng(cv, file); console.log('AT_OK');
