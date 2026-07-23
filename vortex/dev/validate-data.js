// データ層のスキーマ検証（PROTOTYPE_SPEC §8.1）。
// node vortex/dev/validate-data.js で実行。失敗時は理由を出力して process.exit(1)。
// Phaser 非依存。data/ を import して純粋にチェックする。

import { MONSTERS, PLAYER_SPRITE, PLAYER_SPRITES } from '../src/data/monsters.js';
import { ENEMIES, BOSSES } from '../src/data/enemies.js';
import { BALANCE } from '../src/data/balance.js';

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const RARITY = ['N', 'R', 'SR'];
const ARCHETYPE = ['SLASH', 'SHOT', 'BEAM', 'FIELD', 'BOOMERANG', 'RINGWAVE'];
const MOVEMENT = ['chase', 'sine', 'charge', 'hop', 'spiral'];
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

// --- BOSSES（Wave D：小/中/大の3段）---
check(Array.isArray(BOSSES) && BOSSES.length >= 1, 'BOSSES が配列でない/空');
const bossIds = new Set();
for (const b of BOSSES) {
  const label = `BOSS ${b && b.id}`;
  check(b && typeof b === 'object', `${label}: オブジェクトでない`);
  if (!b || typeof b !== 'object') continue;
  check(typeof b.id === 'string' && /^[a-z]+$/.test(b.id), `${label}: id が英小文字でない`);
  check(!bossIds.has(b.id), `${label}: id が重複`);
  bossIds.add(b.id);
  check(typeof b.name === 'string' && b.name.length > 0, `${label}: name が無い`);
  check(COLOR_RE.test(b.color), `${label}: color "${b.color}" が#+16進6桁でない`);
  check(b.sprites && typeof b.sprites === 'object', `${label}: sprites が無い`);
  if (b.sprites) {
    for (const key of ['swirl', 'face']) {
      check(key in b.sprites, `${label}: sprites.${key} が無い`);
      validateSprite(b.sprites[key], `${label}.sprites.${key}`);
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
  // split（分裂）は任意。あるなら無限分裂しない形になっているか（hpMult<1）を確認する
  if (e.split !== undefined) {
    check(e.split && typeof e.split === 'object', `${label}: split がオブジェクトでない`);
    if (e.split && typeof e.split === 'object') {
      check(Number.isInteger(e.split.count) && e.split.count >= 1 && e.split.count <= 4,
        `${label}: split.count が1〜4の整数でない`);
      for (const k of ['hpMult', 'scaleMult', 'speedMult']) {
        check(typeof e.split[k] === 'number' && e.split[k] > 0, `${label}: split.${k} が正の数値でない`);
      }
      check(e.split.hpMult < 1, `${label}: split.hpMult が1未満でない（分裂で強くなってしまう）`);
    }
  }
}

// --- BALANCE 必須キー ---
const requiredBalanceKeys = [
  'view', 'runDurationSec', 'player', 'orbit', 'archetypes', 'wave',
  'enemyCap', 'elite', 'altar', 'xp', 'capture', 'upgrades', 'spawnPhases',
  // v2 追加キー（§10.4）
  'hero', 'fused', 'evolve', 'cave', 'boss', 'rainbowUpgrades',
  // v3 追加キー（武器レベルアップ・必殺技・自動強化）
  'weapon', 'special', 'autoUpgrade',
  // v5 追加キー（Wave C: 敵数増・ラッシュ・雑魚の演出）
  'capSteps', 'rush', 'enemyFx',
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

// --- BALANCE.boss.tiers（Wave D：多段ボスのスケジュール整合）---
const B = BALANCE.boss;
check(B && Array.isArray(B.tiers) && B.tiers.length >= 1, 'BALANCE.boss.tiers が配列でない/空');
if (B && Array.isArray(B.tiers)) {
  let prevSpawn = -1;
  let finalCount = 0;
  B.tiers.forEach((t, i) => {
    const label = `boss.tiers[${i}]`;
    // bossId は BOSSES に実在すること（テクスチャキー boss_<id>_swirl/_face と一致）
    check(bossIds.has(t.bossId), `${label}: bossId "${t.bossId}" が BOSSES に無い`);
    // 出現時刻は warn < spawn、かつ tier 昇順で単調増加（出現の重なり防止）
    check(typeof t.warnSec === 'number' && typeof t.spawnSec === 'number' && t.warnSec < t.spawnSec,
      `${label}: warnSec < spawnSec でない`);
    check(t.spawnSec > prevSpawn, `${label}: spawnSec が前 tier 以下（出現順が単調でない）`);
    prevSpawn = t.spawnSec;
    // attacks と idleSec.betweenAttacks の長さ一致（AI のインデックス循環が破綻しない）
    check(Array.isArray(t.attacks) && t.attacks.length >= 1, `${label}: attacks が空`);
    check(t.idleSec && Array.isArray(t.idleSec.betweenAttacks)
      && t.idleSec.betweenAttacks.length === t.attacks.length,
      `${label}: idleSec.betweenAttacks の長さが attacks と不一致`);
    // summon を使うなら enemyId が ENEMIES に実在すること
    if (t.attacks && t.attacks.includes('summon')) {
      check(t.summon && enemyIds.has(t.summon.enemyId),
        `${label}: summon.enemyId "${t.summon && t.summon.enemyId}" が ENEMIES に無い`);
    }
    // hp/radius は正の数値
    for (const k of ['hp', 'radius', 'chaseSpeed', 'bodyDamage']) {
      check(typeof t[k] === 'number' && t[k] > 0, `${label}: ${k} が正の数値でない`);
    }
    if (t.final) finalCount++;
  });
  // 最終ボス（final:true）はちょうど1体（クリア判定の分岐が一意になる）
  check(finalCount === 1, `boss.tiers: final:true がちょうど1つでない（${finalCount}個）`);
}

// --- 結果 ---
if (errors.length > 0) {
  console.error('validate-data: NG');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`validate-data: OK (monsters=${MONSTERS.length}, enemies=${ENEMIES.length})`);
