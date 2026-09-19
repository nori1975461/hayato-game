// ザク型の管の「通し方」の候補を 3×2 で撮る（第45稿の見比べ用）。node render-gaika2-routes.mjs [出力名] [倍率] [候補の JSON...]
//   候補を省くと canon／long／vee／sash／bundle／第44稿のザク版 の六つ
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
const file = process.argv[2] || './gaika2-routes.png', S = Number(process.argv[3]) || 3;
const cands = process.argv.length > 4 ? process.argv.slice(4).map((s) => JSON.parse(s)) : [...['canon', 'long', 'vee', 'sash', 'bundle'].map((route) => ({ torso: 'zaku2', torsoOpt: { route } })), { torso: 'zaku' }];
const out = makeCanvas(640, 360); rect(out, 0, 0, 640, 360, [40, 42, 64]);
cands.slice(0, 6).forEach((o, i) => {
  const d = M.gaika2With(o), PW = 212, PH = 179, cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2, PH / 2 - 6 * S, { glow: false });
  text(cv, String.fromCharCode(65 + i) + '  ' + (o.torsoOpt ? Object.values(o.torsoOpt).join(' ') : o.torso || ''), 5, 5, WHITE, 1);
  const ox = (i % 3) * 214, oy = Math.floor(i / 3) * 181;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const a = (y * PW + x) * 3, p = ((oy + y) * 640 + ox + x) * 3; out.px[p] = cv.px[a]; out.px[p + 1] = cv.px[a + 1]; out.px[p + 2] = cv.px[a + 2]; }
});
writePng(out, file); console.log('ROUTES_OK');
