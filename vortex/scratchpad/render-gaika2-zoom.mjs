// 第二案の一部を拡大して見る（640×360・glow なし）。node render-gaika2-zoom.mjs [倍率=3] [中心の世界y=-45] → gaika2-zoom.png
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import { GAIKA2 } from './gaika-candidates.mjs';
const S = Number(process.argv[2]) || 3, wy = Number(process.argv[3]) || -45;
const cv = makeCanvas(640, 360); rect(cv, 0, 0, 640, 360, BGC);
renderBoss(cv, GAIKA2, { ...GAIKA2.tier, spriteScale: S }, 320, 180 - wy * S, { glow: false });
writePng(cv, './gaika2-zoom.png'); console.log('ZOOM_OK');
