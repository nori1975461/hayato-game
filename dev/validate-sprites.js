// game.js内のSPRITES定義を抽出し、各スプライトの行長が揃っているか検証する
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
console.log(ok ? 'ALL OK' : 'ERRORS FOUND');
