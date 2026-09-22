// 三本目のレーザーが「等倍（実際のゲームの大きさ）で読めるか」を画素で測る。
//   node measure-gaika2-beam.mjs "札=<JSON>" ...   → 札ごとに
//     PIX   ＝マゼンタ 4 色の画素数（光の量）
//     W[]   ＝砲口から先端まで 1px ごとの「光の太さ（垂直方向の画素数）」
//     BUMPS ＝太さの山の数（節がいくつ読めるか）／GAPS＝太さが 1 以下になる所の数（切れて見える所）
//     DIFF  ＝先頭の札との画素差（等倍で何画素変わるか＝「届いているか」）
// 光の色だけを数えるので、機体のほかの部分は勘定に入らない。
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const MAG = [[0x6b, 0x0b, 0x3e], [0xc4, 0x1a, 0x72], [0xff, 0x5c, 0xb4], [0xff, 0xe0, 0xf4]];
const PW = 560, PH = 360, HAND = [-108, -30], DEG = 17;
const draw = (a) => { const d = M.gaika2With(JSON.parse(a)), cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, PW / 2, PH / 2 + 20, { glow: false }); return cv; };
const isMag = (cv, x, y) => { if (x < 0 || y < 0 || x >= PW || y >= PH) return false; const i = (y * PW + x) * 3; return MAG.some((c) => cv.px[i] === c[0] && cv.px[i + 1] === c[1] && cv.px[i + 2] === c[2]); };
let base = null;
for (const arg of process.argv.slice(2)) {
  const k = arg.indexOf('='), label = arg.slice(0, k), o = JSON.parse(arg.slice(k + 1)), cv = draw(arg.slice(k + 1));
  const L = o.saberLen ?? 70, B0 = (o.openGun && o.openGun.barrel) || 0;
  const a = (DEG * Math.PI) / 180, dx = -Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const W = [];
  for (let d = B0 + 8; d <= L + 5; d++) {   // 砲口の少し先から先端まで
    const cx = HAND[0] + dx * (7 + d) + PW / 2, cy = HAND[1] + dy * (7 + d) + PH / 2 + 20;
    let n = 0; for (let t = -7; t <= 7; t += 0.5) if (isMag(cv, Math.round(cx + px * t), Math.round(cy + py * t))) n++;
    W.push(Math.round(n / 2));
  }
  let pix = 0; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (isMag(cv, x, y)) pix++;
  let bumps = 0, gaps = 0; for (let i = 1; i < W.length - 1; i++) { if (W[i] > W[i - 1] && W[i] >= W[i + 1]) bumps++; if (W[i] <= 1) gaps++; }
  let diff = 0; if (base) { for (let i = 0; i < cv.px.length; i += 3) if (cv.px[i] !== base.px[i] || cv.px[i + 1] !== base.px[i + 1] || cv.px[i + 2] !== base.px[i + 2]) diff++; } else base = cv;
  console.log(label.padEnd(14), 'PIX', String(pix).padStart(5), 'BUMPS', String(bumps).padStart(2), 'GAPS', String(gaps).padStart(3), 'DIFF', String(diff).padStart(5), 'W', W.join(''));
}
