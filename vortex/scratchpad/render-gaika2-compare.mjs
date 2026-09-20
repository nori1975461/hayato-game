// 二つの候補を見比べる一式を出す（全身の横並び／切り替え用の同じ枠の二枚／違う場所の拡大の一覧と個別）。
//   node render-gaika2-compare.mjs <出力フォルダ> <左の候補> <右の候補> <左の札> <右の札>
//   拡大の場所は下の SPOTS（世界座標）。個別の写真は同じ描画を整数倍に引き伸ばすだけ＝一覧で確かめた枠がそのまま出る
import fs from 'node:fs';
import path from 'node:path';
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const [dir, ca, cb, la, lb] = [process.argv[2], process.argv[3], process.argv[4], process.argv[5] || 'LEFT', process.argv[6] || 'RIGHT'];
const SPOTS = [['1 SHOULDER ARM WEAPON', 92, -24], ['2 SABER ROOT', 104, 22], ['3 LEFT HAND', 60, 18]], ZS = 3.4, ZW = 300, ZH = 200, GAP = 2, SEP = [40, 42, 64];
const defs = [ca, cb].map((a) => (a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a])), labels = [la, lb];
fs.mkdirSync(dir, { recursive: true });
const shot = (d, S, wx, wy, W, H, label) => { const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: S }, W / 2 - wx * S, H / 2 - wy * S, { glow: false }); if (label) text(cv, label, 4, 4, WHITE, 1); return cv; };
const blit = (dst, src, ox, oy) => { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const a = (y * src.w + x) * 3, p = ((oy + y) * dst.w + ox + x) * 3; dst.px[p] = src.px[a]; dst.px[p + 1] = src.px[a + 1]; dst.px[p + 2] = src.px[a + 2]; } };
const up = (src, k) => { const o = makeCanvas(src.w * k, src.h * k); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const a = (Math.floor(y / k) * src.w + Math.floor(x / k)) * 3, p = (y * o.w + x) * 3; o.px[p] = src.px[a]; o.px[p + 1] = src.px[a + 1]; o.px[p + 2] = src.px[a + 2]; } return o; };
const pair = (l, r) => { const o = makeCanvas(l.w + r.w + GAP, l.h); rect(o, 0, 0, o.w, o.h, SEP); blit(o, l, 0, 0); blit(o, r, l.w + GAP, 0); return o; };
// 全身（倍率 1・同じ枠）
const FW = 344, FH = 352, full = defs.map((d, i) => shot(d, 1, 0, 13.5, FW, FH, labels[i]));
writePng(pair(full[0], full[1]), path.join(dir, 'full-pair-x1.png'));
writePng(up(pair(full[0], full[1]), 2), path.join(dir, 'full-pair-x2.png'));
full.forEach((cv, i) => writePng(up(cv, 2), path.join(dir, `flip-${'ab'[i]}.png`)));
// 違う場所の拡大（一覧＝確かめる用に小さく／個別＝同じ描画を 2 倍）
const sheet = makeCanvas(ZW * 2 + GAP, (ZH + GAP) * SPOTS.length - GAP); rect(sheet, 0, 0, sheet.w, sheet.h, SEP);
SPOTS.forEach(([name, wx, wy], k) => {
  const z = defs.map((d, i) => shot(d, ZS, wx, wy, ZW, ZH, (i === 0 ? name + ' / ' : '') + labels[i])), p = pair(z[0], z[1]);
  blit(sheet, p, 0, k * (ZH + GAP)); writePng(up(p, 2), path.join(dir, `zoom-${k + 1}.png`));
});
writePng(sheet, path.join(dir, 'zoom-sheet.png'));
console.log('COMPARE_OK');
