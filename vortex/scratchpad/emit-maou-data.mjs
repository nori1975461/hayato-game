// 2026-09-15 ビジュアル昇華（ユーザー確定）を src/data/enemies.js へ差し込む生成スクリプト。
//   マオウレクス第一形態＝maou1-candidates.mjs（第3案）／軌道神核＝godcore-candidates.mjs（第5案）。
//   ドットの行は設計スクリプトが唯一の正典。手で写すと1文字ずれても気づけないので機械で差し込む。
//   差し込むのは パレット3行・MAOU_TRUE_SPRITES・MAOU の sprites/rig だけ。コメントや他のボスには触れない。
// node scratchpad/emit-maou-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAOU1, PAL, PAL_P } from './maou1-candidates.mjs';
import { GODCORE, PAL as T_PAL } from './godcore-candidates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(HERE, '../src/data/enemies.js');
let src = fs.readFileSync(FILE, 'utf8');
if (src.charCodeAt(0) === 0xfeff) throw new Error('enemies.js に BOM がある');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';
const J = (lines) => lines.join(EOL);

// 現行の真の姿のリグと、昇華案のリグが同じ契約か（tex・role・origin）を書き込む前に確かめる
const before = await import(pathToFileURL(FILE).href + '?before');
const sig = (rig) => JSON.stringify(rig.map((r) => [r.role, r.tex, r.ox, r.oy, r.origin || null, !!r.mirror]));
if (sig(before.MAOU.trueRig) !== sig(GODCORE.rig)) throw new Error('真の姿のリグの契約が現行と違う');

const pal = (p) => '{ ' + Object.entries(p).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }';
const rowsBlock = (name, sp, palName, ind) =>
  [`${ind}${name}: { palette: ${palName}, rows: [`, ...sp.rows.map((r) => `${ind}  '${r}',`), `${ind}] },`];
const rigLine = (r) => {
  const a = [`role: '${r.role}'`, `tex: '${r.tex}'`, `ox: ${r.ox}`, `oy: ${r.oy}`];
  if (r.mirror) a.push('mirror: true');
  if (r.origin) a.push(`origin: [${r.origin.join(', ')}]`);
  return `    { ${a.join(', ')} },`;
};
function replaceOnce(re, text, label) {
  const m = src.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  if (!m || m.length !== 1) throw new Error(`${label}: 一致が ${m ? m.length : 0} 件（1件のはず）`);
  src = src.replace(re, text);
}
function replaceBetween(startMarker, endMarker, text, label, keepEnd) {
  const s = src.indexOf(startMarker);
  if (s < 0 || src.indexOf(startMarker, s + 1) >= 0) throw new Error(`${label}: 開始の目印が1件でない`);
  const e = src.indexOf(endMarker, s);
  if (e < 0) throw new Error(`${label}: 終わりの目印が無い`);
  src = src.slice(0, s) + text + src.slice(keepEnd ? e : e + endMarker.length);
}

// ① パレット
replaceOnce(/^const MAOU_PAL = \{[^\r\n]*\};/m, `const MAOU_PAL = ${pal(PAL)};`, 'MAOU_PAL');
replaceOnce(/^const MAOU_PAL_P = \{[^\r\n]*\};/m, `const MAOU_PAL_P = ${pal(PAL_P)};`, 'MAOU_PAL_P');
replaceOnce(/^const MAOU_T_PAL = \{[^\r\n]*\};/m, `const MAOU_T_PAL = ${pal(T_PAL)};`, 'MAOU_T_PAL');

// ② 真の姿のスプライト（tex 名の並びは現行と同じ）
const TRUE_KEYS = ['ringAb', 'ringAf', 'ringBb', 'ringBf', 'ringCb', 'ringCf', 'corona', 'orb', 'eye'];
replaceBetween('const MAOU_TRUE_SPRITES = {', `${EOL}};${EOL}${EOL}// 真の姿のリグ`,
  J(['const MAOU_TRUE_SPRITES = {', ...TRUE_KEYS.flatMap((k) => rowsBlock(k, GODCORE.sprites[k], 'MAOU_T_PAL', '  ')), '};'])
    + `${EOL}${EOL}// 真の姿のリグ`, 'MAOU_TRUE_SPRITES', false);

// ③ 第1形態のスプライトとリグ。rig の先頭は body（boss.spr・下半身の spr・bossTint が parts[0] を読むため）
const KEYS = ['body', 'core', 'pauldron', 'cellpod', 'arm', 'cannon', 'leg', 'mantle'];
const rig = [...MAOU1.rig].sort((a, b) => (a.role === 'body' ? -1 : b.role === 'body' ? 1 : 0));
replaceBetween(`  sprites: {${EOL}    body: { palette: MAOU_PAL, rows: [`, '  trueSprites: MAOU_TRUE_SPRITES,',
  J(['  sprites: {', ...KEYS.flatMap((k) => rowsBlock(k, MAOU1.sprites[k], 'MAOU_PAL', '    ')), '  },',
    '  rig: [', ...rig.map(rigLine), '  ],', '']), 'MAOU sprites/rig', true);

fs.writeFileSync(FILE, src, 'utf8');

// 書き込んだものを読み直して、設計スクリプトと1ドットも違わないことを確かめる
const after = await import(pathToFileURL(FILE).href + '?after');
const same = (a, b) => JSON.stringify(a.rows) === JSON.stringify(b.rows) && JSON.stringify(a.palette) === JSON.stringify(b.palette);
for (const k of KEYS) if (!same(after.MAOU.sprites[k], MAOU1.sprites[k])) throw new Error(`MAOU.sprites.${k} が一致しない`);
for (const k of TRUE_KEYS) if (!same(after.MAOU.trueSprites[k], GODCORE.sprites[k])) throw new Error(`MAOU.trueSprites.${k} が一致しない`);
if (JSON.stringify(after.MAOU.palette3) !== JSON.stringify(PAL_P)) throw new Error('palette3 が一致しない');
if (sig(after.MAOU.rig) !== sig(rig) || after.MAOU.rig[0].role !== 'body') throw new Error('MAOU.rig が一致しない');
console.log(`EMIT_OK sprites=${KEYS.length} trueSprites=${TRUE_KEYS.length} rig=${after.MAOU.rig.length} eol=${EOL === '\r\n' ? 'CRLF' : 'LF'}`);
