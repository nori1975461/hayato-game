// 蒼の装甲が割れた「開」の姿で、割れ目の奥だけを左右まとめて 3 倍で見る枠（540×360）。
//   node shot-gaika2-core.mjs <出力名> '<候補の JSON>'      例: node shot-gaika2-core.mjs core-rack.png '{"openCore":"rack"}'
// JSON は GAIKA2_FINAL_OPT（最終形態）への差分として重ねる＝射出した月牙と有線も一緒に写る。
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';

const file = process.argv[2] || 'gaika2-core.png';
const over = JSON.parse(process.argv[3] || '{}');
const label = process.argv[4] || '';
const S = Number(process.env.CORE_S) || 2, CY = Number(process.env.CORE_Y ?? -90);
const W = Number(process.env.CORE_W) || 480, H = Number(process.env.CORE_H) || 360;   // 既定＝2倍・world x ±120／y −180..0＝左右の割れ目が両方写る
const d = M.gaika2With({ ...M.GAIKA2_FINAL_OPT, ...over });
const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, [26, 28, 48]);
const CXW = Number(process.env.CORE_X) || 0;
renderBoss(cv, d, { ...d.tier, spriteScale: S }, W / 2 - CXW * S, H / 2 - CY * S, { glow: false });
if (label) text(cv, label, 4, 4, WHITE, 2);
writePng(cv, file);
console.log('SHOT_OK', file);
