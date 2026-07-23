// データ層のスキーマ検証（PROTOTYPE_SPEC §8.1）。
// node vortex/dev/validate-data.js で実行。失敗時は理由を出力して process.exit(1)。
// Phaser 非依存。data/ を import して純粋にチェックする。

import { MONSTERS, PLAYER_SPRITE, PLAYER_SPRITES } from '../src/data/monsters.js';
import { ENEMIES, BOSS } from '../src/data/enemies.js';
import { BALANCE } from '../src/data/balance.js';

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const RARITY = ['N', 'R', 'SR'];
const ARCHETYPE = ['SLASH', 'SHOT', 'BEAM', 'FIELD', 'BOOMERANG', 'RINGWAVE'];
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

  // evo（進化形）: { id, name, baseDamage, sprite, ovr }
  const evo = m.evo;
  const evoLabel = `${label}.evo`;
  check(evo && typeof evo === 'object', `${evoLabel}: evo が無い`);
  if (evo && typeof evo === 'object') {
    check(typeof evo.id === 'string' && /^[a-z]+$/.test(evo.id), `${evoLabel}: id が英小文字でない`);
    check(typeof evo.name === 'string' && evo.name.length > 0, `${evoLabel}: name が無い`);
    check(typeof evo.baseDamage === 'number', `${evoLabel}: baseDamage が数値でない`);
    validateSprite(evo.sprite, evoLabel);
  }
}

// --- PLAYER_SPRITE / PLAYER_SPRITES ---
validateSprite(PLAYER_SPRITE, 'PLAYER_SPRITE');
check(Array.isArray(PLAYER_SPRITES) && PLAYER_SPRITES.length === 3,
  `PLAYER_SPRITES が3枚の配列でない（len=${Array.isArray(PLAYER_SPRITES) ? PLAYER_SPRITES.length : 'not array'}）`);
if (Array.isArray(PLAYER_SPRITES)) {
  PLAYER_SPRITES.forEach((s, i) => validateSprite(s, `PLAYER_SPRITES[${i}]`));
}

// --- BOSS ---
check(BOSS && typeof BOSS === 'object', 'BOSS export が無い');
if (BOSS && typeof BOSS === 'object') {
  check(typeof BOSS.id === 'string' && /^[a-z]+$/.test(BOSS.id), 'BOSS: id が英小文字でない');
  check(typeof BOSS.name === 'string' && BOSS.name.length > 0, 'BOSS: name が無い');
  check(COLOR_RE.test(BOSS.color), `BOSS: color "${BOSS.color}" が#+16進6桁でない`);
  check(BOSS.sprites && typeof BOSS.sprites === 'object', 'BOSS: sprites が無い');
  if (BOSS.sprites) {
    for (const key of ['swirl', 'face']) {
      check(key in BOSS.sprites, `BOSS.sprites.${key} が無い`);
      validateSprite(BOSS.sprites[key], `BOSS.sprites.${key}`);
    }
  }
}

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
  // v2 追加キー（§10.4）
  'hero', 'fused', 'evolve', 'cave', 'boss', 'rainbowUpgrades',
  // v3 追加キー（武器レベルアップ・必殺技・自動強化）
  'weapon', 'special', 'autoUpgrade',
];
for (const k of requiredBalanceKeys) {
  check(k in BALANCE, `BALANCE.${k} が存在しない`);
}
for (const a of ARCHETYPE) {
  check(BALANCE.archetypes && a in BALANCE.archetypes, `BALANCE.archetypes.${a} が存在しない`);
}

// --- upgrades 全件に desc（項目1）---
for (const u of BALANCE.upgrades) {
  check(typeof u.desc === 'string' && u.desc.length > 0, `BALANCE.upgrades[${u.id}]: desc が無い`);
}

// --- 結果 ---
if (errors.length > 0) {
  console.error('validate-data: NG');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`validate-data: OK (monsters=${MONSTERS.length}, enemies=${ENEMIES.length})`);
