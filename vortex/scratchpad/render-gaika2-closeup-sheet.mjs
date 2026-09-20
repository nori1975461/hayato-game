// 一つの候補を「上半身の拡大 3 倍｜等倍の全身／部位の拡大 6 倍」の一枚にまとめる（頭や肩のように小さい部位を、ブラウザでクリックして見比べるための枠）。
//   node render-gaika2-closeup-sheet.mjs <出力名> <6倍で見る部位の世界x> <同y> "札=候補の JSON"
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [file, zx, zy, arg] = [process.argv[2], Number(process.argv[3]) || 0, Number(process.argv[4]) || 0, process.argv[5] || '='];
const k = arg.indexOf('='), label = arg.slice(0, k), d = M.gaika2With(JSON.parse(arg.slice(k + 1) || '{}'));
const LW = 688, RW = 344, H = 704, GAP = 2, W = LW + GAP + RW, out = makeCanvas(W, H); rect(out, 0, 0, W, H, [40, 42, 64]);
const panel = (ox, oy, pw, ph, S, wx, wy, tag, ts) => {
  const cv = makeCanvas(pw, ph); rect(cv, 0, 0, pw, ph, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, pw / 2 - wx * S, ph / 2 - wy * S, { glow: false }); text(cv, tag, 4, 4, WHITE, ts);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const s0 = (y * pw + x) * 3, p = ((oy + y) * W + ox + x) * 3; out.px[p] = cv.px[s0]; out.px[p + 1] = cv.px[s0 + 1]; out.px[p + 2] = cv.px[s0 + 2]; }
};
panel(0, 0, LW, H, 3, 0, -12, label, 2);
panel(LW + GAP, 0, RW, 351, 1, 0, 13.5, 'x1 (IN GAME)', 1);
panel(LW + GAP, 353, RW, 351, 6, zx, zy, 'x6', 1);
writePng(out, file); console.log('CLOSEUP_SHEET_OK', W + 'x' + H);
