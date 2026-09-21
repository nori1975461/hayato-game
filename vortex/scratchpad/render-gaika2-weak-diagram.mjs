// 蒼神骸華 第二案：弱点の置き場所の検証図（2026-09-21）。最終形態の上に「胸の炉心」と「左肩」の弱点の円（本編のマオウと同じ半径 38）と、玉の大きさ（半径 25）を重ねる。
//   node render-gaika2-weak-diagram.mjs <出力名> "候補の JSON"
//   本編の判定（src/systems/billiard.js）＝玉は本体を貫通し、玉の中心が「弱点の半径＋玉の半径」以内を通れば当たる＝点線の円が実際に当たる範囲。
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [file, arg] = [process.argv[2], process.argv[3] || '{}'];
const S = 2, PW = 880, PH = 800, CX = PW / 2, CY = PH / 2 - 13.5 * S, d = M.gaika2With(JSON.parse(arg)), cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
renderBoss(cv, d, { ...d.tier, spriteScale: S }, CX, CY, { glow: false });
const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= PW || y >= PH) return; const i = (y * PW + x) * 3; cv.px[i] = c[0]; cv.px[i + 1] = c[1]; cv.px[i + 2] = c[2]; };
const ring = (wx, wy, r, c, dash = 0) => { const n = Math.ceil(2 * Math.PI * r * S * 1.5); for (let k = 0; k < n; k++) { if (dash && Math.floor(k / dash) % 2) continue; const a = (k / n) * Math.PI * 2; for (const t of [0, 1]) put(CX + (wx + Math.cos(a) * r) * S + Math.cos(a) * t, CY + (wy + Math.sin(a) * r) * S + Math.sin(a) * t, c); } };
const GOLD = [255, 210, 63], CYAN = [98, 216, 255], BALL = [244, 247, 255], R = 38, RB = 25;
const CHEST = [0, -18], SHLD = [32, -31];
ring(CHEST[0], CHEST[1], R, GOLD); ring(CHEST[0], CHEST[1], R + RB, GOLD, 10);
ring(SHLD[0], SHLD[1], R, CYAN); ring(SHLD[0], SHLD[1], R + RB, CYAN, 10);
ring(-150, -120, RB, BALL);
text(cv, 'BALL r25', CX - 150 * S - 40, CY - 120 * S + RB * S + 8, BALL, 2);
text(cv, 'GOLD = CHEST CORE (0,-18) r38   DASHED = r38 + BALL r25 (REAL HIT RANGE)', 8, 8, GOLD, 2);
text(cv, 'CYAN = LEFT SHOULDER (32,-31) r38   CENTERS ARE 34.5 APART', 8, 30, CYAN, 2);
writePng(cv, file); console.log('WEAK_DIAGRAM_OK', PW + 'x' + PH);
