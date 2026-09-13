// 堕天の大聖堂（ジャム版 最終ボス）のパーツを enemies.js 用の定数へ書き出す。
//   node scratchpad/emit-cathedral.mjs > 出力を enemies.js の「// 出現順（小→final）」の直前へ
// 段階2（堕天）で硝子が全部深紅になるパレット CATH_PAL_R も同時に出す（藍 b/B/D → 深紅 r/R/A）。
import { CATHEDRAL } from './cathedral-candidates.mjs';

const pal = CATHEDRAL.sprites.nave.palette;
const used = new Set();
for (const sp of Object.values(CATHEDRAL.sprites)) for (const r of sp.rows) for (const ch of r) if (ch !== '.') used.add(ch);
const ent = Object.entries(pal).filter(([k]) => used.has(k));
const palLine = ent.map(([k, v]) => `${k}: '${v}'`).join(', ');
const RED = { b: pal.r, B: pal.R, D: pal.A };
const palRLine = ent.map(([k, v]) => `${k}: '${RED[k] || v}'`).join(', ');

const L = [];
L.push(`// ★2026-09-13 ジャム版（unity1week）の最終ボス「堕天の大聖堂」。下半身を失って宙に浮く聖堂。`);
L.push(`//   背後に双つの尖塔（左は折れている）と飛梁、欠けた金の歯車の光輪、羽根の無い鉄骨の翼（右は大きく、左は折れて短い）、`);
L.push(`//   顔は無く頭部そのものが薔薇窓（12枚の硝子の中心で単眼が白熱）、胸は観音開きに割れて藍の内陣の奥で聖核が脈打ち、`);
L.push(`//   腰からは切れた配線束が垂れて銅線を晒す。設計と作り直しの経緯は vortex/scratchpad/cathedral-candidates.mjs。`);
L.push(`//   作法は軌道神核と同じ（大きな面＋黒い溝＋素材ごとの4段階調＋黒締め＋生きている一点）を建築の語彙で言い直したもの。`);
L.push(`//   ⚠️ CATH_PAL_R は段階2「堕天」で硝子が全部深紅になる焼き直し用（藍 b/B/D → 深紅 r/R/A）。キー集合は CATH_PAL と一致させる。`);
L.push(`const CATH_PAL = { ${palLine} };`);
L.push(`const CATH_PAL_R = { ${palRLine} };`);
L.push(`const CATHEDRAL_SPRITES = {`);
for (const [name, sp] of Object.entries(CATHEDRAL.sprites)) {
  L.push(`  ${name}: { palette: CATH_PAL, rows: [`);
  for (const r of sp.rows) L.push(`    '${r}',`);
  L.push(`  ] },`);
}
L.push(`};`);
L.push(`// 座標は本体中心からのドット単位。mirror の翼は origin 中央＋ox で置く（端 origin は mirror で反転して胴の裏へ潜る）。`);
L.push(`const CATHEDRAL_RIG = [`);
for (const r of CATHEDRAL.rig) {
  const parts = [`role: '${r.role}'`, `tex: '${r.tex}'`, `ox: ${r.ox}`, `oy: ${r.oy}`];
  if (r.mirror) parts.push('mirror: true');
  if (r.origin) parts.push(`origin: [${r.origin[0]}, ${r.origin[1]}]`);
  L.push(`  { ${parts.join(', ')} },`);
}
L.push(`];`);
L.push(`export const CATHEDRAL = {`);
L.push(`  id: 'cathedral',`);
L.push(`  name: '堕天の大聖堂',`);
L.push(`  color: '#c9971f',`);
L.push(`  sprites: CATHEDRAL_SPRITES,`);
L.push(`  rig: CATHEDRAL_RIG,`);
L.push(`  palette2: CATH_PAL_R,   // 段階2「堕天」の深紅の硝子（boss.js が boss_cathedral_R<tex> として焼く）`);
L.push(`};`);
L.push(``);
console.log(L.join('\n'));
console.error(`パーツ ${Object.keys(CATHEDRAL.sprites).length} 個 / 使用色 ${used.size} 色 / spriteScale ${CATHEDRAL.tier.spriteScale}`);
