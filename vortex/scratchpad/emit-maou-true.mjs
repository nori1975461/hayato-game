// 真マオウレクス（軌道神核）のスプライトを enemies.js へ貼れる形に書き出す。
// candidates 側はラスタライザで組み立てているので、確定した rows を実データとして固める。
//
// node vortex/scratchpad/emit-maou-true.mjs > vortex/scratchpad/maou-true-emit.txt
import { CAND_C } from './maou-true-candidates.mjs';

const pal = CAND_C.sprites.orb.palette;
const used = new Set();
for (const sp of Object.values(CAND_C.sprites)) for (const r of sp.rows) for (const ch of r) if (ch !== '.') used.add(ch);

const palLine = Object.entries(pal)
  .filter(([k]) => used.has(k))
  .map(([k, v]) => `${k}: '${v}'`).join(', ');

const lines = [];
lines.push(`// 真マオウレクス「軌道神核」＝メタリックパープルの体を砕いて現れる第4形態。`);
lines.push(`// 装甲に覆われた球（神核）の窓から血走った単眼が覗き、傾きの違う3つの環が球を貫いて公転する。`);
lines.push(`// 設計と作り直しの経緯は vortex/scratchpad/maou-true-candidates.mjs（ラスタライザ付き）。`);
lines.push(`//   ・球の明暗は法線×光源のシェーディング＋市松ディザ（手置きは必ず同心円の縞になる）`);
lines.push(`//   ・質感の主役は階調ではなく「大きな面＋黒い溝＋面の中の明度差」＝マオウレクス本体と同じ作法`);
lines.push(`//   ・環は前半分(f)と後半分(b)に割ってあり、球の手前と奥に振り分ける＝土星の環と同じ描き方`);
lines.push(`//   ・奥半分(b)は装飾を持たず一段暗い。全部を同じ密度で描くと交差した瞬間に画面が団子になる`);
lines.push(`const MAOU_T_PAL = { ${palLine} };`);
lines.push(`const MAOU_TRUE_SPRITES = {`);
for (const [name, sp] of Object.entries(CAND_C.sprites)) {
  lines.push(`  ${name}: { palette: MAOU_T_PAL, rows: [`);
  for (const r of sp.rows) lines.push(`    '${r}',`);
  lines.push(`  ] },`);
}
lines.push(`};`);
lines.push(``);
lines.push(`// 真の姿のリグ。眼(core)が最前面＝環は眼の後ろへ潜る＝眼がいちばん近くにいる。`);
lines.push(`const MAOU_TRUE_RIG = [`);
for (const r of CAND_C.rig) {
  const parts = [`role: '${r.role}'`, `tex: '${r.tex}'`, `ox: ${r.ox}`, `oy: ${r.oy}`];
  if (r.mirror) parts.push('mirror: true');
  if (r.origin) parts.push(`origin: [${r.origin[0]}, ${r.origin[1]}]`);
  lines.push(`  { ${parts.join(', ')} },`);
}
lines.push(`];`);

console.log(lines.join('\n'));
console.error(`パーツ ${Object.keys(CAND_C.sprites).length} 個 / 使用色 ${used.size} 色 / spriteScale ${CAND_C.tier.spriteScale}`);
for (const [k, sp] of Object.entries(CAND_C.sprites)) {
  console.error(`  ${k}: ${sp.rows[0].length}×${sp.rows.length}`);
}
