// game.js内のSPRITES定義を抽出し、各スプライトの行長が揃っているか検証する。
// あわせてボスのパレット差し替え（remap/rageRemap/form2Remap）が、実際にそのスプライトで
// 使われている文字を指しているかも検証する。
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');

const lines = src.split('\n');
let current = null;
let rows = [];
const sprites = {};
let inSprites = false;

for (const line of lines) {
  if (/^const SPRITES = \{/.test(line)) { inSprites = true; continue; }
  if (inSprites && /^\};/.test(line)) break;
  if (!inSprites) continue;
  const key = line.match(/^\s{2}(\w+): \[/);
  if (key) { current = key[1]; rows = []; sprites[current] = rows; continue; }
  const row = line.match(/^\s*'([^']*)',\s*$/);
  if (row && current) rows.push(row[1]);
}

let ok = true;
for (const [name, rs] of Object.entries(sprites)) {
  const expected = rs[0].length;
  rs.forEach((r, i) => {
    if (r.length !== expected) {
      console.log(`NG ${name} row ${i}: length ${r.length} (expected ${expected}): '${r}'`);
      ok = false;
    }
    const bad = r.replace(/[.A-Za-z]/g, '');
    if (bad) { console.log(`NG ${name} row ${i}: invalid chars '${bad}'`); ok = false; }
  });
  console.log(`${name}: ${rs.length} rows x ${expected} cols`);
}

// ---- ボスのパレット差し替え（remap / rageRemap / form2Remap）の生存確認 ----
// スプライトを描き直すと、旧配色の文字を指したままの差し替え定義が取り残される。
// キーが1つも当たらないと激怒などの色替えが「エラーも出ないまま完全に無効」になり、
// 見た目でしか気づけない（2026-08-02のスフィンクス再設計で実際に発生）。
// 全キー死亡＝バグ確定なのでNG（pushを止める）。一部だけ死亡＝無害な残骸なのでWARNに留める。
const btMatch = src.match(/const BOSS_TYPES = (\[[\s\S]*?\n\]);/);
if (btMatch) {
  const BOSS_TYPES = eval('(' + btMatch[1] + ')');
  for (const b of BOSS_TYPES) {
    if (!b || !b.sprite || !sprites[b.sprite]) continue;
    const used = new Set();
    for (const r of sprites[b.sprite]) for (const c of r) if (c !== '.') used.add(c);
    for (const field of ['remap', 'rageRemap', 'form2Remap']) {
      const keys = Object.keys(b[field] || {});
      if (!keys.length) continue;
      const dead = keys.filter((c) => !used.has(c));
      if (!dead.length) continue;
      if (dead.length === keys.length) {
        console.log(`NG ${b.name} ${field}: 全キー'${dead.join('')}'が スプライト'${b.sprite}'に無い＝色替えが完全に無効`);
        ok = false;
      } else {
        console.log(`WARN ${b.name} ${field}: キー'${dead.join('')}'が スプライト'${b.sprite}'に無い（残りは有効）`);
      }
    }
  }
}

console.log(ok ? 'ALL OK' : 'ERRORS FOUND');
if (!ok) process.exitCode = 1;
