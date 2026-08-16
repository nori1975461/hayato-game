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
// R4: forms の tex は Boot.js が生成する武器テクスチャ名のいずれかであること
const WEAPON_TEX = ['w_paw', 'w_toy', 'w_hammer', 'w_cookie', 'w_star2',
                    'w_rainbow', 'w_note', 'w_drop', 'w_ring', 'w_bubble'];
const MOVEMENT = ['chase', 'sine', 'charge', 'hop', 'spiral', 'hover'];
const ATTACK_TYPE = ['quake', 'divebomb', 'selfdestruct', 'lockbeam', 'spread'];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// minDim/maxDim は寸法の許容範囲（雑魚/主人公は8〜16。ボスのパーツは小さめも許すため呼び出しで緩める）。
function validateSprite(sprite, label, minDim = 8, maxDim = 16) {
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
  check(height >= minDim && height <= maxDim, `${label}: 高さ ${height} が${minDim}〜${maxDim}の範囲外`);
  const width = sprite.rows[0] ? sprite.rows[0].length : 0;
  check(width >= minDim && width <= maxDim, `${label}: 幅 ${width} が${minDim}〜${maxDim}の範囲外`);

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

  // forms（R4：武器フォームチェンジ）: 2要素・form0=melee/form1=ranged・archetype enum内・tex 既知
  check(Array.isArray(m.forms) && m.forms.length === 2, `${label}: forms が2要素の配列でない`);
  if (Array.isArray(m.forms) && m.forms.length === 2) {
    check(m.forms[0] && m.forms[0].kind === 'melee', `${label}: forms[0].kind が 'melee' でない`);
    check(m.forms[1] && m.forms[1].kind === 'ranged', `${label}: forms[1].kind が 'ranged' でない`);
    m.forms.forEach((f, fi) => {
      check(f && typeof f.name === 'string' && f.name.length > 0, `${label}.forms[${fi}]: name が無い`);
      check(f && ARCHETYPE.includes(f.archetype), `${label}.forms[${fi}]: archetype "${f && f.archetype}" が enum 外`);
      check(f && WEAPON_TEX.includes(f.tex), `${label}.forms[${fi}]: tex "${f && f.tex}" がテクスチャ生成対象外`);
      check(f && typeof f.sfx === 'string' && f.sfx.length > 0, `${label}.forms[${fi}]: sfx が無い`);
    });
  }

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
// R15/R15b: 主人公は幅 16→20→24・高さ18固定（少年の画素は不変で、広がるのは腕がせり出すぶんだけ）。
// 雑魚の上限16より大きいので、主人公だけ上限を24まで許す（互換用の単数 PLAYER_SPRITE も同じ）。
validateSprite(PLAYER_SPRITE, 'PLAYER_SPRITE', 8, 24);
check(Array.isArray(PLAYER_SPRITES) && PLAYER_SPRITES.length === 3,
  `PLAYER_SPRITES が3枚の配列でない（len=${Array.isArray(PLAYER_SPRITES) ? PLAYER_SPRITES.length : 'not array'}）`);
if (Array.isArray(PLAYER_SPRITES)) {
  PLAYER_SPRITES.forEach((s, i) => validateSprite(s, `PLAYER_SPRITES[${i}]`, 8, 24));
  // R15の核（維持）: 少年そのものは1ドットも変わらない＝「成長するのは腕だけ」を仕様で固定する。
  // R16: ブレイブギア再設計に合わせて不変範囲を精密化。少年＝髪(0-1行)・顔(3行の芯5〜10列)・
  // 顎(4行)・胴の芯とスーツ(5-12行の芯5〜10列＝襟/金コア/ベルト含む)・脚とスタンス(13-17行)。
  // ギアの装飾は段階昇格を許可: 2行目のヘッドバンド（S3で金クレストが付く）と、
  // 3行目の芯の外側（耳ポッド: S2=白 → S3=金）。腕とパウルドロンの列は段ごとに変わってよい。
  const WIDTHS = [16, 20, 24];
  const coreOf = (s) => {
    const off = (s.rows[0].length - 16) / 2;
    return s.rows
      .map((r, y) => {
        if (y === 2) return '';                 // バンド行＝ギア（クレスト昇格を許可）
        const c = r.slice(off, off + 16);
        if (y === 3) return c.slice(5, 11);     // 顔の芯のみ（耳ポッドは芯の外）
        return y <= 4 || y >= 13 ? c : c.slice(5, 11);
      })
      .join('|');
  };
  const base = coreOf(PLAYER_SPRITES[0]);
  PLAYER_SPRITES.forEach((s, i) => {
    check(s.rows.length === 18 && s.rows[0].length === WIDTHS[i],
      `PLAYER_SPRITES[${i}]: ${WIDTHS[i]}×18 でない（幅16/20/24＝腕だけが広がる）`);
    check(coreOf(s) === base,
      `PLAYER_SPRITES[${i}]: 少年本体の画素が Stage1 と違う（成長するのは腕だけ＝SPEC§24）`);
  });
}

// --- BOSSES（Wave R3：ロボット6体・7パーツリグ）---
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
  if (b.sprites && typeof b.sprites === 'object') {
    // body/core は必須。全パーツを矩形チェック（パーツは小さめ可＝3〜20px）。
    check('body' in b.sprites, `${label}: sprites.body が無い`);
    check('core' in b.sprites, `${label}: sprites.core が無い`);
    for (const [k, s] of Object.entries(b.sprites)) validateSprite(s, `${label}.sprites.${k}`, 3, 20);
  }
  // rig（7パーツリグ）: 4要素以上・tex が sprites に実在・ox/oy が数値
  check(Array.isArray(b.rig) && b.rig.length >= 4, `${label}: rig が4要素以上の配列でない`);
  if (Array.isArray(b.rig)) {
    for (let i = 0; i < b.rig.length; i++) {
      const r = b.rig[i];
      check(r && typeof r === 'object', `${label}: rig[${i}] がオブジェクトでない`);
      if (!r) continue;
      check(b.sprites && r.tex in b.sprites, `${label}: rig[${i}].tex "${r.tex}" が sprites に無い`);
      check(typeof r.ox === 'number' && typeof r.oy === 'number', `${label}: rig[${i}] の ox/oy が数値でない`);
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
  // R19: 雑魚は「ガンメタルの機体＋役割を示す1色」で統一した。Run.spawnEnemy は def.color で
  //   背後のグローを塗るので、パレットの役割色 r とずれると本体と後光が別色に光って役割が読めなくなる。
  //   スプライトだけ直して color を直し忘れる事故を恒久的に止める。
  const pr = e.sprite && e.sprite.palette && e.sprite.palette.r;
  check(pr === e.color,
    `${label}: color "${e.color}" と sprite.palette.r "${pr}" が不一致（役割色は本体と背後グローで必ず一致させる）`);
  // attack（Wave R1：予告付き攻撃）。type が既知・telegraphSec>0 を軽く検証する
  if (e.attack !== undefined) {
    check(e.attack && typeof e.attack === 'object', `${label}: attack がオブジェクトでない`);
    if (e.attack && typeof e.attack === 'object') {
      check(ATTACK_TYPE.includes(e.attack.type), `${label}: attack.type "${e.attack.type}" が enum 外`);
      check(typeof e.attack.telegraphSec === 'number' && e.attack.telegraphSec > 0,
        `${label}: attack.telegraphSec が正の数値でない（予告なしは禁止）`);
    }
  }
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
    // bossId は BOSSES に実在すること（テクスチャキー boss_<id>_<part> と一致）
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
console.log(`validate-data: OK (monsters=${MONSTERS.length}, enemies=${ENEMIES.length}, bosses=${BOSSES.length})`);
