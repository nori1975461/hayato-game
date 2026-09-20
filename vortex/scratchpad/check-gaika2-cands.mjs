// 蒼神骸華 第二案：これまでに渡した候補（resume-gaika-now.mjs の CANDS 全部＋旧い検討の版）の等倍の描画ハッシュを、控え（gaika2-cands-expected.json）と突き合わせる。
// パッチを当てたあと「据え置く側が画素一致か」を一発で確かめる道具（コードの既定の確認は check-gaika1-hash.mjs／check-gaika2-hash.mjs）。
//   node check-gaika2-cands.mjs           → 変わった候補だけ表示。全部同じなら GAIKA2_CANDS_ALL_SAME <数>
//   node check-gaika2-cands.mjs --update  → いまの描画で控えを書き直す（候補を足したあと・意図して変えたあと）
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect, BGC } from './gods-sheet.mjs';
import * as M from './gaika-candidates.mjs';
import { BASE as B, CANDS } from './resume-gaika-now.mjs';

const here = dirname(fileURLToPath(import.meta.url)), FILE = resolve(here, 'gaika2-cands-expected.json');
const SH4 = { edge: 'none', bands: false, flare: 5, topW: 9 }, NOW8 = CANDS[8].o;
const LEGACY = {   // CANDS に無い旧い検討の版と、試して外した口（外した口も壊さない＝写真を撮り直せるように）
  NOSTRAIGHT: { kit: 'launcher' }, SWAP52: { kit: 'swap' }, DEFAULT: {}, EMBER: { ...B, dormantX: 'ember' }, BOOM_ONLY: { ...B, subBoom: true }, BAND: { ...B, dropMoons: ['moonX'], keepBand2: true },
  OPEN: { ...B, open: 16, thirdPts: [[67, -32], [90, -34], [108, -30]] }, OPEN_DARK: { ...B, open: 16, dormantX: 'dark' }, NOSTOW_DARK: { kit: 'launcher', dormantX: 'dark' },
  SH_STEEL: { ...NOW8, shoulder: { edge: 'steel', bands: false } }, SH_NOEDGE: { ...NOW8, shoulder: { edge: 'none', bands: false } }, SH_SMALL: { ...NOW8, shoulder: { ...SH4, scale: 0.88 } }, SH_HIDE: { ...NOW8, shoulder: { hide: true } },
  SH_FIN: { ...NOW8, shoulder: { ...SH4, scale: 0.88, dx: 7, accent: 'fin' } }, SH_SPIKE: { ...NOW8, shoulder: { ...SH4, scale: 0.88, dx: 7, accent: 'spike' } },
  HEAD_CREST: { ...NOW8, head: { top: 'crest' } }, HEAD_THIRD: { ...NOW8, head: { top: 'third' } }, HEAD_FRAMED_CROSS: { ...NOW8, head: { top: 'cross', frame: true } }, HEAD_GAZE: { ...NOW8, head: { top: 'gaze' } },
  COLLAR_NOSEAM: { ...NOW8, collar: { seam: false }, head: { cheek: 'steel', top: 'blade' } }, COLLAR_NONE: { ...NOW8, collar: 'none', head: { cheek: 'steel', top: 'blade' } },
  EYE_UP_SUNK: { ...NOW8, head: { cheek: 'steel', top: 'sunk', eyeAt: [0, -55.5] } }, EYE_UP_MAST: { ...NOW8, head: { cheek: 'steel', top: 'mast', eyeAt: [0, -66] } },
};
const all = { ...Object.fromEntries(Object.entries(CANDS).map(([k, c]) => ['C' + k, c.o])), ...LEGACY }, W = 344, H = 352, now = {};
for (const [k, o] of Object.entries(all)) { const d = M.gaika2With(o), cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, BGC); renderBoss(cv, d, { ...d.tier, spriteScale: 1 }, W / 2, H / 2 - 13.5, { glow: false }); now[k] = crypto.createHash('sha1').update(Buffer.from(cv.px)).digest('hex').slice(0, 12); }
if (process.argv.includes('--update')) { fs.writeFileSync(FILE, JSON.stringify(now, null, 1) + '\n'); console.log('GAIKA2_CANDS_EXPECTED_UPDATED', Object.keys(now).length); }
else {
  const exp = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {}; let bad = 0;
  for (const k of Object.keys(now)) if (exp[k] !== now[k]) { bad++; console.log(exp[k] ? 'CHANGED' : 'NEW    ', k, exp[k] || '-', '→', now[k]); }
  for (const k of Object.keys(exp)) if (!(k in now)) { bad++; console.log('MISSING', k); }
  console.log(bad ? 'GAIKA2_CANDS_DIFF ' + bad : 'GAIKA2_CANDS_ALL_SAME ' + Object.keys(now).length);
}
