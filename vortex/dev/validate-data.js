// データ層のスキーマ検証（PROTOTYPE_SPEC §8.1）。
// node vortex/dev/validate-data.js で実行。失敗時は理由を出力して process.exit(1)。
// Phaser 非依存。data/ を import して純粋にチェックする。

import { MONSTERS, PLAYER_SPRITE } from '../src/data/monsters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { BALANCE } from '../src/data/balance.js';

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const RARITY = ['N', 'R', 'SR'];
const ARCHETYPE = ['SLASH', 'SHOT', 'BEAM', 'FIELD'];
const MOVEMENT = ['chase', 'sine', 'charge'];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateSprite(sprite, label) {
  check(sprite && typeof sprite === 'object', `${label}: sprite が無い`);
  if (!sprite) return;
  check(sprite.palette && typeof sprite.palette === 'object', `${label}: palette が無い`);
  check(Array.isArray(sprite.rows), `${label}: rows が配列でない`);
  if (!Array.isArray(sprite.rows) || !sprite.palette) return;

  // palette の色が全て #RRGGBB か
  for (const [ch, col] of Object.entries(sprite.palette)) {
    check(ch.length === 1, `${label}: palette キー "${ch}" が1文字でない`);
    check(COLOR_RE.test(col), `${label}: palette[${ch}] の色 "${col}" が#+16進6桁でない`);
  }

  const height = sprite.rows.length;
  check(height >= 8 && height <= 16, `${label}: 高さ ${height} が8〜16の範囲外`);
  const width = sprite.rows[0] ? sprite.rows[0].length : 0;
  check(width >= 8 && width <= 16, `${label}: 幅 ${width} が8〜16の範囲外`);

  const allowed = new Set(Object.keys(sprite.palette));
  allowed.add('.');
  sprite.rows.forEach((row, i) => {
    check(row.length === width, `${label}: row[${i}] の長さ ${row.length} が幅 ${width} と不一致（矩形でない）`);
    for (const ch of row) {
      check(allowed.has(ch), `${label}: row[${i}] に palette 外の文字 "${ch}"`);
    }
  });
}

// --- MONSTERS ---
check(Array.isArray(MONSTERS), 'MONSTERS が配列でない');
const monsterIds = new Set();
for (const m of MONSTERS) {
  const label = `MONSTER ${m && m.id}`;
  check(typeof m.id === 'string' && /^[a-z]+$/.test(m.id), `${label}: id が英小文字でない`);
  check(!monsterIds.has(m.id), `${label}: id が重複`);
  monsterIds.add(m.id);
  check(typeof m.name === 'string' && m.name.length > 0, `${label}: name が無い`);
  check(RARITY.includes(m.rarity), `${label}: rarity "${m.rarity}" が enum 外`);
  check(ARCHETYPE.includes(m.archetype), `${label}: archetype "${m.archetype}" が enum 外`);
  check(COLOR_RE.test(m.color), `${label}: color "${m.color}" が#+16進6桁でない`);
  check(typeof m.baseDamage === 'number', `${label}: baseDamage が数値でない`);
  validateSprite(m.sprite, label);
}

// --- PLAYER_SPRITE ---
validateSprite(PLAYER_SPRITE, 'PLAYER_SPRITE');

// --- ENEMIES ---
check(Array.isArray(ENEMIES), 'ENEMIES が配列でない');
const enemyIds = new Set();
for (const e of ENEMIES) {
  const label = `ENEMY ${e && e.id}`;
  check(typeof e.id === 'string' && /^[a-z]+$/.test(e.id), `${label}: id が英小文字でない`);
  check(!enemyIds.has(e.id), `${label}: id が重複`);
  enemyIds.add(e.id);
  check(typeof e.name === 'string' && e.name.length > 0, `${label}: name が無い`);
  check(MOVEMENT.includes(e.movement), `${label}: movement "${e.movement}" が enum 外`);
  check(COLOR_RE.test(e.color), `${label}: color "${e.color}" が#+16進6桁でない`);
  for (const k of ['hp', 'speed', 'damage', 'radius']) {
    check(typeof e[k] === 'number' && e[k] > 0, `${label}: ${k} が正の数値でない`);
  }
  validateSprite(e.sprite, label);
}

// --- BALANCE 必須キー ---
const requiredBalanceKeys = [
  'view', 'runDurationSec', 'player', 'orbit', 'archetypes', 'wave',
  'enemyCap', 'elite', 'altar', 'xp', 'capture', 'upgrades', 'spawnPhases',
];
for (const k of requiredBalanceKeys) {
  check(k in BALANCE, `BALANCE.${k} が存在しない`);
}
for (const a of ARCHETYPE) {
  check(BALANCE.archetypes && a in BALANCE.archetypes, `BALANCE.archetypes.${a} が存在しない`);
}

// --- 結果 ---
if (errors.length > 0) {
  console.error('validate-data: NG');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`validate-data: OK (monsters=${MONSTERS.length}, enemies=${ENEMIES.length})`);
