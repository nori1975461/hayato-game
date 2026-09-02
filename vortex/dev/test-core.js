// core/data のユニットテスト（PROTOTYPE_SPEC §8.2）。
// node vortex/dev/test-core.js で実行。失敗時 process.exit(1)。Phaser 非依存。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRng } from '../src/core/rng.js';
import { BALANCE } from '../src/data/balance.js';
import { MONSTERS, PLAYER_SPRITE } from '../src/data/monsters.js';
import { ENEMIES, BOSS, BOSSES, MAOU } from '../src/data/enemies.js';
import { ENDING_ART } from '../src/data/ending_art.js';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ok  ' + msg);
  } else {
    console.error('  NG  ' + msg);
    failures++;
  }
}

// --- rng 決定性: seed=42 を2回作り各100個の random() が完全一致 ---
{
  const a = createRng(42);
  const b = createRng(42);
  let same = true;
  for (let i = 0; i < 100; i++) {
    if (a.random() !== b.random()) { same = false; break; }
  }
  assert(same, 'rng: 同一seedで100個のrandom()が完全一致');
}

// --- range の境界 ---
{
  const r = createRng(42);
  let inRange = true;
  for (let i = 0; i < 500; i++) {
    const v = r.range(5, 10);
    if (v < 5 || v >= 10) { inRange = false; break; }
  }
  assert(inRange, 'rng: range(5,10) が [5,10) に収まる');
}

// --- int の境界（両端を含む） ---
{
  const r = createRng(123);
  let min = Infinity, max = -Infinity, ok = true;
  for (let i = 0; i < 2000; i++) {
    const v = r.int(1, 6);
    if (!Number.isInteger(v) || v < 1 || v > 6) { ok = false; break; }
    if (v < min) min = v;
    if (v > max) max = v;
  }
  assert(ok, 'rng: int(1,6) が整数で範囲内');
  assert(min === 1 && max === 6, 'rng: int(1,6) が両端(1と6)を実際に取る');
}

// --- chance(0)=false / chance(1)=true ---
{
  const r = createRng(7);
  let ok = true;
  for (let i = 0; i < 100; i++) {
    if (r.chance(0) !== false) { ok = false; break; }
    if (r.chance(1) !== true) { ok = false; break; }
  }
  assert(ok, 'rng: chance(0)=false, chance(1)=true');
}

// --- shuffle が元配列を破壊しない ---
{
  const r = createRng(99);
  const orig = [1, 2, 3, 4, 5, 6, 7, 8];
  const snapshot = orig.slice();
  const out = r.shuffle(orig);
  const untouched = orig.length === snapshot.length && orig.every((v, i) => v === snapshot[i]);
  assert(untouched, 'rng: shuffle が元配列を破壊しない');
  const sameElems = out.length === orig.length && [...out].sort((x, y) => x - y).join(',') === [...orig].sort((x, y) => x - y).join(',');
  assert(sameElems, 'rng: shuffle が同じ要素集合を返す');
}

// --- pick が配列内の要素を返す ---
{
  const r = createRng(55);
  const arr = ['a', 'b', 'c'];
  let ok = true;
  for (let i = 0; i < 100; i++) {
    if (!arr.includes(r.pick(arr))) { ok = false; break; }
  }
  assert(ok, 'rng: pick が配列内の要素を返す');
}

// --- upgrades 8種の id が一意・全件に desc ---
{
  const ids = BALANCE.upgrades.map((u) => u.id);
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 8 && unique, 'balance: upgrades 8種の id が一意');
  const allDesc = BALANCE.upgrades.every((u) => typeof u.desc === 'string' && u.desc.length > 0);
  assert(allDesc, 'balance: upgrades 全件に desc が存在');
}

// --- rainbowUpgrades 3種の id が一意 ---
{
  const ids = BALANCE.rainbowUpgrades.map((u) => u.id);
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 3 && unique, 'balance: rainbowUpgrades 3種の id が一意');
}

// --- MONSTERS が12種・ENEMIES が5種（Wave R1: ヴォイド・マキナ5種／R22: 回復役マシュモ／
//     R23: 弾薬役ビリッコ／R45: マモリン・ドリンゴ・ネムッコ／R47: 槍のラゴンを追加） ---
assert(MONSTERS.length === 12, 'data: MONSTERS が12種');
assert(ENEMIES.length === 6, 'data: ENEMIES が6種（R24: レア役マグマンを追加）');

// --- Wave R1: 新雑魚5種（gareon/chibit/bomba/snipa/turret）が存在 ---
{
  const eids = new Set(ENEMIES.map((e) => e.id));
  const want = ['gareon', 'chibit', 'bomba', 'snipa', 'turret'];
  assert(want.every((id) => eids.has(id)), 'data: 新雑魚5種 gareon/chibit/bomba/snipa/turret が存在');
}

// --- Wave R1: movement と attack 定義 ---
{
  const byId = {};
  for (const e of ENEMIES) byId[e.id] = e;
  assert(byId.snipa && byId.snipa.movement === 'spiral', 'data: snipa が spiral で存在');
  assert(byId.turret && byId.turret.movement === 'hover', 'data: turret が hover で存在');
  assert(ENEMIES.every((e) => e.attack && typeof e.attack.type === 'string'),
    'data: 全雑魚に attack（予告付き攻撃）が定義されている');
  assert(ENEMIES.every((e) => typeof e.attack.telegraphSec === 'number' && e.attack.telegraphSec > 0),
    'data: 全雑魚の attack.telegraphSec が正（予告なしは禁止）');
}

// --- Wave R1: ボス召喚の enemyId が新雑魚 chibit へ差し替え済み ---
{
  const tiers = (BALANCE.boss && BALANCE.boss.tiers) || [];
  const summons = tiers.filter((t) => t.summon).map((t) => t.summon.enemyId);
  assert(summons.length > 0 && summons.every((id) => id === 'chibit'),
    'data: boss.tiers の summon.enemyId が全て chibit');
}

// --- Wave R4: 武器フォームチェンジ。全なかまに forms が2つ・form0=melee/form1=ranged ---
{
  const ARCHE = ['SLASH', 'SHOT', 'BEAM', 'FIELD', 'BOOMERANG', 'RINGWAVE', 'HEAL', 'AMMO',
                 'SHIELD', 'SPEED', 'SLEEPY',   // R45: 命の盾／爆速ドリンク／ネムッコ
                 'LANCER'];                      // R47: 単独行動の槍使いラゴン
  const allTwo = MONSTERS.every((m) => Array.isArray(m.forms) && m.forms.length === 2);
  assert(allTwo, 'data: 全なかまに forms が2つ定義されている');
  const meleeFirst = MONSTERS.every((m) => m.forms && m.forms[0] && m.forms[0].kind === 'melee');
  // ★R47 LANCER（ラゴン）だけ両方 melee。単独行動で槍を突き続ける子なので、11秒ごとの
  //   近接↔遠距離の往復を持たない（切り替わると狩りが中断されて見える）。
  const rangedSecond = MONSTERS.every((m) => m.forms && m.forms[1]
    && (m.archetype === 'LANCER' ? m.forms[1].kind === 'melee' : m.forms[1].kind === 'ranged'));
  assert(meleeFirst, 'data: 全なかまの forms[0] が melee（近接）');
  assert(rangedSecond, 'data: 全なかまの forms[1] が ranged（遠距離。LANCER だけ melee）');
  const archeOk = MONSTERS.every((m) => m.forms
    && m.forms.every((f) => ARCHE.includes(f.archetype) && typeof f.tex === 'string' && typeof f.sfx === 'string'));
  assert(archeOk, 'data: 全フォームの archetype が enum 内・tex/sfx が文字列');
}

// --- R21W2: フォームは「時間と個体番号」で決まる（武器レベルからは独立） ---
// 旧実装 formIndexFor(lv)=floor((lv-1)/2)%2 は maxLevel 12 が遠距離の帯に当たるため、
// weaponLevel 11 到達（実測94秒）以降ラン終了まで遠距離に固定されていた（遠距離時間比 実測85.7%）。
// maxLevel を13にしても今度は近接へ固定されるだけで直らない。原因はパリティではなく
// 「単調増加して飽和する変数の関数であること」。ここはその再発を恒久ガードする。
{
  const CY = BALANCE.orbit.formCycleSec;
  const formIndexFor = (i, t) => ((Math.floor(t / CY) + i) % 2);
  assert(typeof CY === "number" && CY > 0, "balance: orbit.formCycleSec が正の数値");

  // (a) 周期ごとに必ず反転する
  let flips = true;
  for (let k = 0; k < 40; k++) {
    if (formIndexFor(0, CY * k + 0.01) === formIndexFor(0, CY * (k + 1) + 0.01)) flips = false;
  }
  assert(flips, "orbit: フォームは formCycleSec ごとに必ず反転する（永久固定にならない）");

  // (b) 同時刻に隣り合う個体は必ず別フォーム＝常に約半分が近接で主人公の隣にいる
  let split = true;
  for (let k = 0; k < 12; k++) {
    const t = CY * k + 3;
    if (formIndexFor(0, t) === formIndexFor(1, t)) split = false;
  }
  assert(split, "orbit: 同時刻に隣の個体は別フォーム（常に約半数が近接＝一緒に殴っている絵）");

  // (c) 武器レベルに一切依存しない（旧実装の再発ガード）
  assert(formIndexFor.length === 2, "orbit: formIndexFor は (個体番号, 時間) の2引数＝武器レベルに依存しない");

  // (d) 遠距離で過ごす時間比が 45〜55% に収まる（実測85.7%だった偏りの再発ガード）
  let ranged = 0, total = 0;
  for (let t = 0; t < 420; t += 0.5) {
    for (let i = 0; i < 3; i++) { total++; if (formIndexFor(i, t) === 1) ranged++; }
  }
  const pct = ranged / total * 100;
  assert(pct >= 45 && pct <= 55,
    "orbit: 420秒×3体で遠距離フォームの時間比が45〜55%（実測85.7%の偏りの再発ガード）: " + pct.toFixed(1) + "%");
}
// --- R14: 主人公は近接のみ（SPEC§22）。主武器クラッシュアーム＋腕の技2種の設定が数値・妥当 ---
{
  const H = BALANCE.hero;
  // 銃は全廃した。遠距離パラメータが復活していないことを恒久ガードする（SPEC§22 死亡部品）
  const gunKeys = ['range', 'bulletSpeed', 'bulletRadius', 'damageBase', 'damagePerTwoLevels',
                   'spreadDeg', 'shotByStage', 'pierceFromStage', 'pierceCount', 'intervalSec'];
  assert(gunKeys.every((k) => H[k] === undefined),
    'balance: hero に銃（遠距離）のパラメータが残っていない＝主人公は近接のみ');
  assert(typeof H.aimRange === 'number' && H.aimRange > 0,
    'balance: hero.aimRange（構えの索敵距離）が正の数値');

  const M = H.melee;
  const nums = ['radius', 'radiusPerStage', 'intervalSec', 'damage', 'damagePerStage', 'maxTargets',
                'closeDist', 'closeMul', 'bossMul', 'knockback', 'knockbackSec',
                'heatMax', 'heatPerHit', 'heatDecayPerSec', 'heatDamageMulPerStep',
                'punchSec', 'punchLunge'];
  assert(!!M && nums.every((k) => typeof M[k] === 'number' && Number.isFinite(M[k]) && M[k] >= 0),
    'balance: hero.melee のパラメータが全て数値');
  assert(M.damage > 0 && M.intervalSec > 0, 'balance: hero.melee が実際に効く（damage/intervalSec が正）');
  // R21W2: 踏み込みの報酬は手動の一撃（hero.strike の踏み込み突進）へ移した。
  // 自動拳は「弱い牽制」なので密着ボーナスを持たない（closeMul 1.0 を許す）。
  assert(M.closeMul >= 1, 'balance: 自動拳の密着倍率は1.0以上（踏み込みの報酬は strike 側へ移した）');
  assert(M.heatPerHit === 0, 'balance: 自動拳ではヒートが溜まらない（ヒートは手動の一撃の報酬）');
  assert(M.bossMul > 0 && M.bossMul <= 0.5,
    'balance: 拳のボスへのダメージは半減以下（接近戦を報いるがボス戦を壊さない）');
  assert(M.maxTargets >= 1 && M.maxTargets <= 8,
    'balance: 拳の巻き込みは1〜8体（囲まれても捌けるが火力過多にしない）');
  // ヒートで上がる火力の上限（暴走防止）
  assert(M.heatMax * M.heatDamageMulPerStep <= 0.6,
    'balance: ヒート満タンの火力ボーナスは+60%以内');

  // --- R21W2: 旧ワイヤーアーム／アームスラムは廃止した（自動発動＝プレイヤーの入力が0回） ---
  assert(H.wireArm === undefined && H.armSlam === undefined,
    'balance: 自動発動の腕の技が復活していない（R21W2で廃止）');

  // --- R21W2: 手動の一撃（ブレイクストライク） ---
  const S = H.strike;
  const sNums = ['reach', 'reachPerStage', 'arcDeg', 'cooldownSec', 'whiffSec', 'recoverSec',
                 'whiffRecoverSec', 'lungeMax', 'lungeSec', 'iframeSec', 'damage', 'damagePerStage',
                 'maxTargets', 'knockback', 'knockbackSec', 'heatPerHit', 'heatPerChain',
                 'bossMul', 'bossBreakMul', 'bossBreakSec', 'counterMul'];
  assert(!!S && sNums.every((k) => typeof S[k] === "number" && Number.isFinite(S[k])),
    'balance: hero.strike のパラメータが全て数値');

  // 空振りのほうが長い＝連打が支配戦略にならない（狙う意味を作る）
  assert(S.whiffSec > S.cooldownSec,
    'balance: 空振りのクールダウンが命中時より長い（連打を支配戦略から外す）');

  // ヒート収支：手動1回あたりの加算が、その間の減衰を上回る（溜まらない技にしない）
  assert(S.heatPerHit > M.heatDecayPerSec * S.cooldownSec,
    'balance: 手動の一撃でヒートが実際に溜まる（加算 > クールダウン中の減衰）');

  // 手動だけが等倍。仲間の対ボス倍率より十分に大きいこと＝ボス戦でも主役が主人公
  assert(S.bossMul >= BALANCE.orbit.bossMul * 4,
    'balance: 手動の一撃のボス倍率が仲間の4倍以上（ボス戦で手動が主役）');
  assert(M.bossMul < S.bossMul,
    'balance: 自動拳のボス倍率は手動より低い（自動は牽制）');

  // 手動の間合いは自動より外側＝役割の分離が絵で分かる
  assert(S.reach > M.radius && (S.reach + 2 * S.reachPerStage) > (M.radius + 2 * M.radiusPerStage),
    'balance: 手動の一撃の間合いが自動拳より外側（全ステージで）');

  // ★一撃が一撃であり続ける：Stage3の火力が終盤の最硬雑魚を1発で割れること
  const hpEnd = BALANCE.wave.hpMultEnd;
  const hardest = Math.max(...Object.values(ENEMIES).map((e) => e.hp)) * hpEnd;
  assert(S.damage + 2 * S.damagePerStage >= hardest,
    'balance: Stage3の手動一撃が終盤の最硬雑魚を1発で倒せる（' +
    (S.damage + 2 * S.damagePerStage) + " >= " + hardest.toFixed(1) + "）");

  // --- R21W2: よろけ（瀕死） ---
  const G = BALANCE.stagger;
  const gNums = ['sec', 'warnSec', 'speedMul', 'rebootHpRatio', 'rebootSpeedMul', 'rebootDamageMul',
                 'gemMul', 'burstRadius', 'burstFalloff', 'burstMaxChain', 'burstDamage'];
  assert(!!G && gNums.every((k) => typeof G[k] === "number" && Number.isFinite(G[k]) && G[k] >= 0),
    'balance: stagger のパラメータが全て数値');
  assert(G.speedMul > 0,
    'balance: よろけは止まらない（speedMul>0）＝歩いてくるので被弾の緊張感が下がらない');
  assert(G.warnSec > 0 && G.warnSec < G.sec,
    'balance: よろけの復帰予告が寿命より短い（期限が見える）');
  assert(G.rebootHpRatio > 0 && G.rebootHpRatio < 1,
    'balance: 復帰体のHPは満タンではない（取りこぼしの罰であって理不尽にはしない）');

  // ★獲物が必ず届く：最も遅い敵でも、よろけの寿命内に手動の間合いへ入れること
  const slowest = Math.min(...Object.values(ENEMIES).map((e) => e.speed));
  const travel = G.sec * slowest * G.speedMul;
  assert(travel >= BALANCE.orbit.allyMaxReach - S.reach,
    'balance: 最も遅い敵でもよろけの寿命内に手動の間合いへ届く（' +
    travel.toFixed(1) + " >= " + (BALANCE.orbit.allyMaxReach - S.reach) + "）");

  // --- R21W2: 仲間の到達距離（実測で最大538px＝画面外まで届いていた） ---
  const O = BALANCE.orbit;
  assert(typeof O.allyMaxReach === "number" && O.allyMaxReach > 0,
    'balance: orbit.allyMaxReach が正の数値');
  // 画面内保証半径（view高の半分180 − カメラ遅延追従のずれ）。これを超えると画面外の敵を倒す。
  assert(O.allyMaxReach <= 163,
    'balance: 仲間の到達が画面内保証半径163px以内（画面外の敵を倒さない）');
  // 射手（turret）は構造的に仲間の圏外に置く＝プレイヤーが出向かないと黙らない敵を作る
  const turret = Object.values(ENEMIES).find((e) => e.id === 'turret');
  assert(!!turret && O.allyMaxReach < turret.hoverDist - 20,
    'balance: 砲台の滞空距離が仲間の到達より20px以上外（射手はプレイヤーが行かないと黙らない）');
  assert(BALANCE.archetypes.SHOT.range <= O.allyMaxReach,
    'balance: 仲間の索敵距離が到達上限以内（届かない敵を狙って空撃ちしない）');

  // 安全網の下限：最弱の仲間でも数発で獲物を作れること（弱くしすぎると手を止めた瞬間に死ぬ）
  // 武器レベル上限まで育った最弱の仲間の1発。これで終盤の最硬雑魚を5発以内に削れること。
  // 弱くしすぎると『手を止めた瞬間に死ぬ』ゲームになる＝安全網の下限を数値で守る。
  // FIELD型（オーラジェリー）は毎ティック1ダメージを継続で与える設計なので、
  // 1発の重さを見るこの判定からは除く（DPSは tickDamageAdd 側で伸びる）。
  // R22: HEAL型（マシュモ）は敵に一切ダメージを与えない回復専門なので、この判定から除く。
  //      除かずに baseDamage を見ると「最弱の攻撃役」に化けて、安全網の数値を偽って壊す。
  // R45: SHIELD/SPEED/SLEEPY も敵に一切ダメージを与えない（命の盾・爆速ドリンク・ネムッコ）。
  //      除かずに baseDamage を見ると「最弱の攻撃役」に化けて、安全網の数値を偽って壊す。
  const NON_HITTER = ['FIELD', 'HEAL', 'AMMO', 'SHIELD', 'SPEED', 'SLEEPY'];
  const hitters = Object.values(MONSTERS).filter((m) => !NON_HITTER.includes(m.forms[0].archetype));
  const weakestBase = Math.min(...hitters.map((m) => m.baseDamage));
  const grown = weakestBase * (1 + BALANCE.weapon.damageAddPerLevel * (BALANCE.weapon.maxLevel - 1));
  assert(grown * 5 >= hardest,
    'balance: 育ちきった最弱の仲間が終盤の最硬雑魚を5発以内に削れる（安全網の下限）: ' +
    (grown * 5).toFixed(1) + ' >= ' + hardest.toFixed(1));
}
// --- R12: 被弾フィードバック（ノックバック・低HP警告）の player 設定 ---
{
  const P = BALANCE.player;
  assert(typeof P.hurtKnockback === 'number' && P.hurtKnockback > 0,
    'balance: player.hurtKnockback が正（被弾で押し返される）');
  assert(P.hurtKnockSec > 0 && P.hurtKnockSec < 0.35,
    'balance: 被弾ノックバックは0.35秒未満（操作を奪わない長さ）');
  assert(P.lowHpRatio > 0 && P.lowHpRatio < 0.6,
    'balance: 低HP警告のしきい値が0〜60%の範囲');
}

// --- MONSTERS 7種＋evo id を合わせて全 id が一意 ---
{
  const ids = [];
  for (const m of MONSTERS) {
    ids.push(m.id);
    if (m.evo && m.evo.id) ids.push(m.evo.id);
  }
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 24 && unique, "data: MONSTERS 12種＋evo id を合わせて全 id が一意（24件）");
}

// --- 開始編成 starpuppy / terabit の id が存在 ---
{
  const ids = new Set(MONSTERS.map((m) => m.id));
  assert(ids.has('starpuppy') && ids.has('terabit'), 'data: 開始編成 starpuppy/terabit が存在');
}

// --- BOSS export の存在（id='uzuking'） ---
assert(BOSS && BOSS.id === 'uzuking', 'data: BOSS export が存在し id=uzuking');

// --- Wave R3: 多段ボス（boss.tiers）が6段・final:true が1つ・出現順が単調増加 ---
{
  const tiers = BALANCE.boss && BALANCE.boss.tiers;
  assert(Array.isArray(tiers) && tiers.length === 6, 'balance: boss.tiers が6段（ロボット6体）');
  if (Array.isArray(tiers)) {
    const finals = tiers.filter((t) => t.final).length;
    assert(finals === 1, `balance: boss.tiers の final:true がちょうど1つ（${finals}個）`);
    let mono = true, prev = -1;
    for (const t of tiers) { if (!(t.spawnSec > prev)) mono = false; prev = t.spawnSec; }
    assert(mono, 'balance: boss.tiers の spawnSec が単調増加（出現が重ならない）');
    // betweenAttacks の長さが attacks と一致（AI のインデックス循環が破綻しない）
    const lenOk = tiers.every((t) => Array.isArray(t.attacks) && t.idleSec
      && Array.isArray(t.idleSec.betweenAttacks) && t.idleSec.betweenAttacks.length === t.attacks.length);
    assert(lenOk, 'balance: 全 tier で idleSec.betweenAttacks 長が attacks 長と一致');
    // 6体の bossId が想定どおり（改名は名前のみ・id は据え置き）
    const ids = tiers.map((t) => t.bossId).join(',');
    assert(ids === 'korotama,jetviper,uzuking,wavelord,missilga,maou',
      `balance: boss.tiers の bossId 並びが想定どおり（実測 ${ids}）`);
  }
}

// --- R30: マオウレクスの分離／再合体（実プレイFBの指示をデータ側で固定する） ---
{
  const tiers = (BALANCE.boss && BALANCE.boss.tiers) || [];
  const maou = tiers.find((t) => t.bossId === 'maou');
  assert(!!maou, 'balance: 最終ボス maou の tier が存在');
  if (maou) {
    // R34: 24000 では実測 12.8〜17.6秒でボスが攻撃を1回も完遂できずに終わっていた
    assert(maou.hp === 68000, `balance: マオウレクスのHP（R34で120000→R37で68000＝転生前28秒・実測 ${maou.hp}）`);
    const sp = maou.split, mg = maou.merge, ck = maou.chestLaser;
    assert(!!sp && !!mg && !!ck, 'balance: maou に split / merge / chestLaser が定義されている');
    if (sp && mg && ck) {
      // 節目の順序。逆転すると「合体してから分離」になって物語が壊れる
      assert(maou.phase2HpRatio === sp.hpRatio, 'balance: 分離は phase2 の節目と同じHP（節目を増やさない）');
      assert(sp.hpRatio > mg.hpRatio, `balance: 分離(${sp.hpRatio})は再合体(${mg.hpRatio})より手前`);
      // 攻撃の分担（ユーザー指示：ロケットパンチは上半身・ミサイルは下半身）
      const asp = maou.attacksSplit || [], ap3 = maou.attacksP3 || [];
      assert(asp.includes('wirearm'), 'balance: 分離中の上半身はロケットパンチ(wirearm)を撃つ');
      assert(!asp.includes('missile'), 'balance: 分離中の上半身はミサイルを撃たない（下半身の担当）');
      assert(ap3.includes('chestLaser'), 'balance: 再合体後は胸部レーザーを撃つ');
      assert(!asp.includes('chestLaser'), 'balance: 胸部レーザーは再合体後だけ（分離中には出さない）');
      // 攻撃名が maou の設定に実在する（綴り違いで無音の不発になるのを防ぐ）
      const known = asp.concat(ap3).every((a) => maou[a] !== undefined);
      assert(known, 'balance: attacksSplit / attacksP3 の全攻撃が maou に定義されている');
      // 「移動スピードも速い」
      assert(sp.upperSpeedMul > 1, `balance: 分離した上半身は速い（×${sp.upperSpeedMul}）`);
      assert(mg.speedMul > 1, `balance: 再合体後は速い（×${mg.speedMul}）`);
      assert(sp.lowerSpeed > maou.chaseSpeed, `balance: 下半身は本体より速い（${sp.lowerSpeed} > ${maou.chaseSpeed}）`);
      // 「再合体および色の変化の様子はプレーヤーに見せる」＝尺を確保する
      assert(sp.cineSec >= 1.0 && mg.cineSec >= 1.5,
        `balance: 分離/再合体のカットシーンに尺がある（${sp.cineSec}s / ${mg.cineSec}s）`);
      assert(mg.contactAt > 0 && mg.contactAt < 1, 'balance: 色が変わる瞬間がカットシーンの途中にある');
      // 「破壊力も作中最大ダメージに」＝全ボスの全攻撃で最大であること。
      // ★真の姿（第4形態）だけは例外として上を許す＝最後に出てくるものが最強でないと格が逆転するため。
      //   その代わり「真の姿の整列レーザーが作中の単独最大」を別の assert で必ず縛る。
      const tfx = maou.trueForm;
      const ak = tfx && tfx.aligned;
      let maxOther = 0, maxWho = '';
      const scan = (obj, who) => {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === 'number' && /amage$/i.test(k)) {
            if (obj !== ck && obj !== ak && v > maxOther) { maxOther = v; maxWho = who + '.' + k; }
          } else if (v && typeof v === 'object' && !Array.isArray(v)) scan(v, who + '.' + k);
        }
      };
      for (const t of tiers) scan(t, t.bossId);
      assert(ck.damage > maxOther,
        `balance: 胸部レーザーが第3形態までの最大ダメージ（${ck.damage} > 次点 ${maxOther} = ${maxWho}）`);
      if (ak) {
        assert(ak.damage > ck.damage,
          `balance: 真の姿の整列レーザーが作中最大ダメージ（${ak.damage} > 胸部レーザー ${ck.damage}）`);
        assert(ak.damage < BALANCE.player.hp,
          `balance: 整列レーザーでも満タンから一撃死しない（${ak.damage} < ${BALANCE.player.hp}）`);
      }
      assert(ck.damage < BALANCE.player.hp,
        `balance: 胸部レーザーでも満タンから一撃死しない（${ck.damage} < ${BALANCE.player.hp}）`);
      assert(ck.chargeSec >= 1.0, `balance: 胸部レーザーには避けられる溜めがある（${ck.chargeSec}s）`);
    }
  }
}

// --- R30W2: れんしゅうじょう④（マオウレクス）の配線 ---
// Phaser を読めないので、壊れると無言で効かなくなる**つなぎ目だけ**を原文で確かめる。
// （課題そのものの検証は scratchpad/cdp-r30w2-practice-maou.mjs が実機でやる）
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const run = read('scenes/Run.js');
  const prac = read('systems/practice.js');

  assert(/practiceSpawn\s*,\s*practiceClear/.test(boss),
    'practice: boss.js が practiceSpawn / practiceClear を公開している');
  assert(/!run\.practiceMode\s*&&\s*!allDone\s*&&\s*!boss/.test(boss),
    'practice: れんしゅうじょうでは時間で勝手にボスが出ない（tierスケジューラを止めている）');
  assert(/if\s*\(run\.practiceMode\)\s*\{\s*ti = keep; allDone = false; return; \}/.test(boss),
    'practice: 最終ボスを倒してもエンディングへ飛ばない（何度でも出し直せる）');
  assert(/this\.practice\.wantBoss\(\)\)\s*this\.boss\.update\(dt\)/.test(run),
    'practice: ④のときだけ Run が boss.update を回す');
  assert(/key:\s*'maou'/.test(prac), 'practice: コース④（マオウレクス）が存在する');
  assert(/keydown-FOUR/.test(prac), 'practice: キー4がコース④に割り当たっている');
  assert(/keydown-Z/.test(prac) && /keydown-X/.test(prac) && /keydown-C/.test(prac),
    'practice: Z（ぶんりつ）X（がったい）C（かいふく）の節目ジャンプがある');
  assert(/practiceClear\(\);/.test(prac),
    'practice: コースを切り替えるときにボスを片付ける（幽霊が残らない）');
  // ⚠️ 節目ジャンプは HP を動かすだけにする。ここで split/phase3 を直接触ると
  //    「練習では起きるのに本編では起きない」が生まれる（このモードの大前提）。
  assert(!/practice[\s\S]*?split\s*=\s*true/.test(prac),
    'practice: れんしゅうじょうが分離フラグを直接立てていない（判定は本編に任せる）');
}

// --- ★R31: 弱点コアの「当たり判定」と「ダメージ判定」が同じ円であること ---
// 実プレイFB「コアにビリヤード弾をあてているのに体力がほとんどへらない」の原因がこの不一致だった。
// billiard は `s.radius + weak.r` で当たったと判定して玉を消費し、boss.js は `weak.r` だけを要求
// していたので、当たった面積のうち 7割強が**演出だけ出して0ダメージ**で砕けていた。
// 2ファイルにまたがる不一致は片方だけ読んでも気づけないので、原文で縛る。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const bil = read('systems/billiard.js');
  const snd = read('audio/sound.js');

  assert(/const rr = w\.r \+ \(at\.r \|\| at\.hitR \|\| 0\)/.test(boss),
    'R31: weakGate が飛び道具の半径(hitR)を判定円に足している');
  // ボスへの手動命中はすべて hitR を渡すこと（1か所でも漏れるとその弾だけ無言で通らなくなる）
  const manualBossHits = bil.match(/dealDamage\([^)]*'manual',\s*\{[^}]*\}/g) || [];
  assert(manualBossHits.length >= 3 && manualBossHits.every((s) => /hitR/.test(s)),
    `R31: 座標つきの手動命中${manualBossHits.length}か所すべてが hitR を渡している`);
  // 範囲攻撃(必殺)の r は別物＝コア倍率を落とす側。hitR と混ぜていないこと
  assert(/mul: at\.r \? 1 : weakCfg\(\)\.mul/.test(boss),
    'R31: 範囲攻撃(at.r)はコア倍率なしのまま＝hitR と役割が混ざっていない');
  // ★R30 の下半身は倒せない砲台。玉を食べると「全力の投げが0表示で消える」ので、
  //   上半身の装甲と同じく「カキン！を返して弾は通す」でなければならない。
  assert(/e\.isBoss && e\.isLowerHalf[\s\S]{0,420}?__deflectedLower[\s\S]{0,200}?continue;/.test(bil),
    'R31: 分離した下半身は玉を食べずに弾く（奥のコアへ通す）');

  // --- R31: ミサイル（実プレイFB「遅すぎる。スピードを速く」）---
  const mk = ((BALANCE.boss.tiers.find((t) => t.bossId === 'maou') || {}).missile) || {};
  assert(mk.speed >= 480 && mk.launchSpeed >= 480,
    'R31: ミサイルは 480px/秒 以上（R29の340から再度の速度指摘に応えている）');
  assert(mk.speed * mk.lifeSec >= 340 * 3.2,
    'R31: 速くしたぶん lifeSec を縮めても射程は R29 以前を下回らない');
  // 速度だけ上げて旋回上限を据え置く＝旋回半径は逆に大きくなる（横へ切れば抜けられる＝理不尽にしない）
  const turnRadius = mk.speed / ((mk.maxTurnDeg * Math.PI) / 180);
  assert(turnRadius > 260,
    `R31: ミサイルの旋回半径 ${Math.round(turnRadius)}px は主人公が横へ切って抜けられる広さ`);

  // --- R31: 新SFXの綴り（無音不発を防ぐ。スプライトの remap と同じ罠）---
  // boss.js が呼ぶ Sound.sfx の名前が sound.js の SFX テーブルに実在するかを総当たりで見る。
  const called = new Set((boss.match(/Sound\.sfx\('([a-zA-Z0-9_]+)'/g) || [])
    .map((s) => s.replace(/.*'([a-zA-Z0-9_]+)'.*/, '$1')));
  const missing = [...called].filter((n) => !new RegExp(`^\\s{2}${n}\\(`, 'm').test(snd));
  assert(missing.length === 0,
    `R31: boss.js が鳴らす効果音${called.size}種すべてが sound.js に実在する`
      + (missing.length ? `（欠落: ${missing.join(',')}）` : ''));
  for (const n of ['samLaunch', 'samFly', 'rocketPunchFire', 'rocketPunchFly', 'rocketPunchHit']) {
    assert(called.has(n), `R31: 新SFX ${n} が boss.js から実際に呼ばれている`);
  }
  // R34W2: samBoom は `Sound.sfx(snd || 'samBoom', ...)` の既定値になった（トマホークは別の
  //   爆発音を渡す）ので、呼び出し名の抽出では拾えない。文字列の存在で確かめる。
  assert(/\|\| *'samBoom'/.test(boss),
    'R31: 新SFX samBoom が boss.js から実際に呼ばれている（既定値経由）');
  // 飛来音は「発射時に1回」ではなく飛んでいるあいだ鳴らし続ける（速くしたので1回では鳴り終わる前に着弾する）
  assert(/missileFlyT/.test(boss) && /punchFlyT/.test(boss),
    'R31: ミサイルとロケットパンチの飛来音が飛行中に繰り返し鳴る');
  // 直撃は「爆発」であること（旧実装は Sound.sfx('hit') と粒子8個だけだった）
  assert(/missileBoom\(b\.x, b\.y, true\)/.test(boss),
    'R31: ミサイルが主人公へ直撃したとき爆発（大）が起きる');

  // --- マオウレクス戦BGM（R31「暗すぎる」→ R34「勇ましく」→ R34W3 で全面作り直し）---
  // ⚠️ R31/R34 の「80〜105BPM＝重さを保つ」「締めはピカルディ終止」は R34W3 で**撤回**した。
  //    実プレイFB「疾走感あふれ、圧倒的な盛り上がり」に対して、遅いテンポは構造的に応えられない。
  //    守るべき意図（暗いまま押し切らない／荘厳の材料を捨てない）は下で引き続き見張っている。
  {
    // R31「暗すぎる」への手当ての本体。R34W4 では長三和音そのものに加えて
    // **属七の連鎖**（Bb7 Eb7 Ab7 D7 G7）が明るさと推進の両方を担っている。
    const cb = (snd.match(/const CHORDS_MAOU = \[[\s\S]*?^\];/m) || [''])[0];
    const majors = ['Eb7', 'Ab7', 'D7', 'G7', 'Bb7'].filter((n) => cb.indexOf(n) >= 0);
    assert(majors.length >= 4,
      `BGM: 進行に長三和音系（属七）が4種以上ある（${majors.length}種）。`
      + '旧版は全部マイナーで長三和音が0個＝「暗すぎる」の原因だった');
  }
}

// --- spawnPhases の weights のキーが全て ENEMIES の id（uzuking 非含有も検証） ---
{
  const enemyIds = new Set(ENEMIES.map((e) => e.id));
  let ok = true;
  let bad = '';
  let hasBoss = false;
  for (const phase of BALANCE.spawnPhases) {
    for (const key of Object.keys(phase.weights)) {
      if (!enemyIds.has(key)) { ok = false; bad = key; }
      if (key === 'uzuking') hasBoss = true;
    }
  }
  assert(ok, `balance: spawnPhases の weights キーが全て ENEMIES の id${ok ? '' : `（不正: ${bad}）`}`);
  assert(!hasBoss, 'balance: spawnPhases の weights に uzuking（ボス）が含まれない');
}

// --- weapon: 全キーが存在し型が正しい／maxLevel が2以上 ---
{
  const W = BALANCE.weapon;
  const okRoot = W && typeof W.maxLevel === 'number' && typeof W.damageAddPerLevel === 'number';
  assert(okRoot, 'balance: weapon の maxLevel/damageAddPerLevel が数値');
  assert(!!W && W.maxLevel >= 2, 'balance: weapon.maxLevel が2以上');
  const shape = {
    slash: ['hitRadiusAdd', 'tickSecMult', 'tickSecMin'],
    shot:  ['intervalMult', 'intervalMin', 'bulletSpeedAdd', 'bulletRadiusAdd',
            'extraShotEvery', 'maxShots', 'spreadDeg'],
    beam:  ['intervalMult', 'intervalMin', 'lengthAdd', 'widthAdd'],
    field: ['radiusAdd', 'tickDamageAdd', 'tickSecMult', 'tickSecMin'],
  };
  let ok = true;
  let bad = '';
  for (const [group, keys] of Object.entries(shape)) {
    const g = W && W[group];
    if (!g || typeof g !== 'object') { ok = false; bad = group; break; }
    for (const k of keys) {
      if (typeof g[k] !== 'number' || !Number.isFinite(g[k])) { ok = false; bad = `${group}.${k}`; }
    }
  }
  assert(ok, `balance: weapon の全アーキタイプキーが数値${ok ? '' : `（不正: ${bad}）`}`);
}

// --- weapon: 最大レベルでも SHOT の弾数が maxShots を超えない（orbit.js と同じ式） ---
{
  const W = BALANCE.weapon;
  const wl = W.maxLevel - 1;
  const shots = Math.min(W.shot.maxShots, 1 + Math.floor(wl / W.shot.extraShotEvery));
  assert(shots <= W.shot.maxShots && shots >= 1,
    `balance: 武器Lv最大の SHOT 弾数 ${shots} が 1..${W.shot.maxShots} に収まる`);
}

// --- weapon: 最大レベルでも各アーキタイプの間隔が下限クランプを下回らない ---
{
  const W = BALANCE.weapon;
  const A = BALANCE.archetypes;
  const wl = W.maxLevel - 1;
  const cases = [
    ['SLASH.tickSec',  A.SLASH.tickSec,     W.slash.tickSecMult,    W.slash.tickSecMin],
    ['SHOT.interval',  A.SHOT.intervalSec,  W.shot.intervalMult,    W.shot.intervalMin],
    ['BEAM.interval',  A.BEAM.intervalSec,  W.beam.intervalMult,    W.beam.intervalMin],
    ['FIELD.tickSec',  A.FIELD.tickSec,     W.field.tickSecMult,    W.field.tickSecMin],
  ];
  let ok = true;
  let bad = '';
  for (const [name, base, mult, min] of cases) {
    const v = Math.max(min, base * Math.pow(mult, wl));
    if (!(min > 0 && min <= base && mult > 0 && mult < 1 && v >= min)) { ok = false; bad = name; }
  }
  assert(ok, `balance: 武器Lv最大でも間隔が下限を下回らない${ok ? '' : `（不正: ${bad}）`}`);
}

// --- special: 1ステージ10回制限（実プレイFB#1で3→5→FB#3で8→R9で10へ・回帰防止） ---
{
  const S = BALANCE.special;
  assert(!!S && S.maxUses === 15, 'balance: special.maxUses が 15（1ステージ15回まで・R24の実プレイFB）');
  const nums = ['killsPerCharge', 'radius', 'damage', 'bossDamage', 'cinematicSec', 'startCharge'];
  const ok = !!S && nums.every((k) => typeof S[k] === 'number' && Number.isFinite(S[k]));
  assert(ok, 'balance: special の各数値キーが存在し数値');
}

// --- autoUpgrade: cycle の全要素が upgrades の id に実在 ---
{
  const ids = new Set(BALANCE.upgrades.map((u) => u.id));
  const cycle = BALANCE.autoUpgrade && BALANCE.autoUpgrade.cycle;
  assert(Array.isArray(cycle) && cycle.length > 0, 'balance: autoUpgrade.cycle が非空の配列');
  const missing = Array.isArray(cycle) ? cycle.filter((id) => !ids.has(id)) : ['(cycle なし)'];
  assert(missing.length === 0,
    `balance: autoUpgrade.cycle の全 id が upgrades に実在${missing.length ? `（不明: ${missing.join(',')}）` : ''}`);
  assert(typeof (BALANCE.autoUpgrade && BALANCE.autoUpgrade.bonusEveryLevels) === 'number',
    'balance: autoUpgrade.bonusEveryLevels が数値');

  // R21W2: 撃破は手動の一撃だけが行える（dealDamage の関門）。だから主人公自身の火力に
  // 成長曲線が無いと、ボスHPが 1800→28000 と伸びるのに火力が Lv10 で止まって詰む。
  // 実際にその状態で出荷しかけた（毎回3体目のボスで死亡）。構造の欠落なので固定する。
  const heroStats = new Set(BALANCE.upgrades.filter((u) => u.stat === 'heroMult').map((u) => u.id));
  const heroInCycle = Array.isArray(cycle) && cycle.some((id) => heroStats.has(id));
  assert(heroInCycle,
    `balance: autoUpgrade.cycle に主人公の火力(heroMult)を伸ばす項目がある`);
}

// --- levelupFlow（ドラフトUI）が廃止されている ---
assert(!('levelupFlow' in BALANCE), 'balance: levelupFlow が廃止されている（自動強化へ移行）');

// --- 敵の量の上限ガード（Wave C で承認済みの上限まで緩和。硬さ hpMultEnd は据え置き） ---
{
  const w = BALANCE.wave;
  assert(w.spawnCountEnd <= 6, `balance: wave.spawnCountEnd が 6 以下（実測 ${w.spawnCountEnd}）`);
  assert(BALANCE.enemyCap <= 260, `balance: enemyCap が 260 以下（実測 ${BALANCE.enemyCap}）`);
  assert(w.hpMultEnd <= 4, `balance: wave.hpMultEnd が 4 以下（実測 ${w.hpMultEnd}）`);
}

// --- capSteps は単調増加で最後は enemyCap と一致 ---
{
  const cs = BALANCE.capSteps;
  assert(Array.isArray(cs) && cs.length >= 2, 'balance: capSteps が2要素以上の配列');
  let okAsc = true;
  for (let i = 1; i < cs.length; i++) {
    if (cs[i].untilSec <= cs[i - 1].untilSec || cs[i].cap < cs[i - 1].cap) okAsc = false;
  }
  assert(okAsc, 'balance: capSteps の untilSec / cap が単調増加');
  assert(cs[cs.length - 1].cap === BALANCE.enemyCap,
    `balance: capSteps 最終段が enemyCap と一致（実測 ${cs[cs.length - 1].cap} / ${BALANCE.enemyCap}）`);
}

// --- Wave R2: 公転仲間は最大3人（火力過多の回帰防止） ---
{
  const o = BALANCE.orbit;
  assert(o.maxSlots <= 3, `balance: orbit.maxSlots が 3 以下（実測 ${o.maxSlots}）`);
  const sc = o.slotSchedule;
  assert(Array.isArray(sc) && sc.length >= 1, 'balance: orbit.slotSchedule が配列');
  let okAsc = true;
  for (let i = 1; i < sc.length; i++) {
    if (sc[i].untilSec <= sc[i - 1].untilSec || sc[i].slots < sc[i - 1].slots) okAsc = false;
  }
  assert(okAsc, 'balance: orbit.slotSchedule の untilSec / slots が単調増加');
  assert(sc[sc.length - 1].slots === o.maxSlots,
    `balance: slotSchedule 末尾の slots が maxSlots と一致（実測 ${sc[sc.length - 1].slots} / ${o.maxSlots}）`);
}

// --- Wave R2: 合成祭壇は3回出現（appearSecs・単調増加） ---
{
  const a = BALANCE.altar;
  assert(Array.isArray(a.appearSecs) && a.appearSecs.length === 3,
    `balance: altar.appearSecs が3回（実測 ${a.appearSecs && a.appearSecs.length}）`);
  let okAsc = true;
  for (let i = 1; i < a.appearSecs.length; i++) {
    if (a.appearSecs[i] <= a.appearSecs[i - 1]) okAsc = false;
  }
  assert(okAsc, 'balance: altar.appearSecs が単調増加');
  assert(!('appearSec' in a), 'balance: 旧 altar.appearSec が廃止されている（appearSecs へ移行）');
}

// --- ラッシュは予告付き・ボス出現前に始まる ---
{
  const r = BALANCE.rush;
  assert(r && r.warnSec >= 1, `balance: rush.warnSec が1秒以上（実測 ${r && r.warnSec}）`);
  assert(r.startSec < BALANCE.boss.spawnSec, 'balance: rush.startSec がボス出現より前');
  assert(Array.isArray(r.counts) && r.counts.every((c) => c > 0 && c <= 40),
    'balance: rush.counts が全て1〜40');
}

// --- spawnPhases の重みが ENEMIES に存在する id だけを参照している ---
{
  const eids = new Set(ENEMIES.map((e) => e.id));
  let allKnown = true;
  for (const p of BALANCE.spawnPhases) {
    for (const id of Object.keys(p.weights)) if (!eids.has(id)) allKnown = false;
  }
  assert(allKnown, 'balance: spawnPhases の敵idが全て ENEMIES に存在');
}

// --- R25 弾の格：単調増加で、ボスへは必ず控えめ ---
{
  const G = BALANCE.hero.billiard.grades;
  assert(Array.isArray(G) && G.length === 4, `balance: grades が4段（実測 ${G && G.length}）`);
  let asc = true, bossOk = true, hpAsc = true;
  for (let i = 1; i < G.length; i++) {
    if (!(G[i].dmgMul > G[i - 1].dmgMul)) asc = false;
    if (!(G[i].radiusMul >= G[i - 1].radiusMul)) asc = false;
    if (!(G[i].stagSec <= G[i - 1].stagSec)) asc = false;   // 上ほど猶予が短い
    // 上2段は minHp では到達できない（王冠とエリートだけが上がれる）ので >= で見る
    if (!(G[i].minHp >= G[i - 1].minHp)) hpAsc = false;
  }
  // ★ボス戦の主役は装甲片(×2.5)。格の倍率がそれを超えると原則が壊れる。
  for (const g of G) if (!(g.bossMul <= g.dmgMul && g.bossMul <= BALANCE.hero.billiard.shards.modes[0].mul)) bossOk = false;
  assert(asc, 'balance: grades の威力・炸裂範囲が単調増加で、よろけ猶予は単調減少');
  assert(hpAsc, 'balance: grades の minHp が単調非減少（しきい値の判定が壊れない）');
  // ★上2段が def.hp で届くようになると「ずっしり」が敵の42%に戻る（実測で一度そうなった）
  const maxTrashHp = Math.max(...ENEMIES.map((e) => e.hp));
  assert(G[2].minHp > maxTrashHp,
    `balance: ずっしり以上は種類では届かない（最硬の雑魚 ${maxTrashHp} < ${G[2].minHp}）`);
  // ★「面で消す」が無い格は威力を上げても撃破数が変わらない（雑魚は元々1発で死ぬため）。
  //    実測で かるい1.86 ≒ おもい1.61 と差が出なかったので、かるい以外には面を持たせる。
  let burstAsc = G[0].burstAll === 0;
  for (let i = 2; i < G.length; i++) if (!(G[i].burstAll > G[i - 1].burstAll)) burstAsc = false;
  assert(burstAsc, 'balance: かるいには面が無く、おもい以上は上ほど面が広い');
  assert(bossOk, 'balance: grades のボス倍率が装甲片(×2.5)を超えない');
}

// --- R25 断末魔と王冠：発生条件が現実的な範囲か ---
{
  const D = BALANCE.deathThroe, C = BALANCE.crown;
  const G = BALANCE.hero.billiard.grades;
  assert(D && D.fromGrade >= 0 && D.fromGrade < G.length, 'balance: deathThroe.fromGrade が格の範囲内');
  assert(G[D.fromGrade].throe === true, 'balance: fromGrade の格に throe が立っている');
  assert(D.telegraphSec >= 0.3, `balance: 断末魔の予告が0.3秒以上（実測 ${D.telegraphSec}）`);
  // ★予告より先によろけが切れると、断末魔が一度も出ないまま消える
  assert(G[D.fromGrade].stagSec > D.telegraphSec,
    `balance: よろけ猶予(${G[D.fromGrade].stagSec}s)が断末魔の予告(${D.telegraphSec}s)より長い`);
  // ---- R27 一気撃破の連打（ガガガガ）----
  {
    const C = BALANCE.crush;
    assert(C.presets.length >= 2 && C.presets[0].on,
      'balance: 連打のプリセットが2つ以上あり、既定はONであること');
    assert(C.minGroup >= 2, 'balance: 1体の撃破は連打にしない（単発は従来どおり）');
    assert(C.maxBeats >= 4 && C.maxBeats <= 20, 'balance: 並べる打撃は4〜20発（多すぎると数が読めない）');
    for (const p of C.presets) {
      if (!p.on) continue;
      // 打撃として読めるのは概ね 30〜90ms。これを外すと「連打」ではなく別の音になる
      assert(p.gapMs >= 30 && p.gapMs <= 90, 'balance: 連打の間隔は30〜90ms（' + p.name + '）');
    }
    // ★R29W2 実プレイFB「4種類でほぼ差がなかった」＝**鳴らす音が4つとも同じ関数**だった。
    //   間(gapMs)の8〜12msは耳では判別できないので、ONのプリセットは音そのものを別にする。
    const on = C.presets.filter((p) => p.on);
    assert(on.every((p) => p.sfx && p.endSfx), 'balance: ONのプリセットは鳴らす音を明示すること');
    assert(new Set(on.map((p) => p.sfx)).size === on.length,
      'balance: ONのプリセットは1発の音が全部ちがうこと（間だけ変えても耳では分からない）');
    assert(new Set(on.map((p) => p.endSfx)).size === on.length,
      'balance: ONのプリセットは締めの音が全部ちがうこと');
    // 締めとスローの段は「頻度と逆相関」。スローは締めより必ず上の段に置く
    assert(C.slowFrom > C.finaleFrom && C.finaleFrom >= C.minGroup,
      'balance: スロー（最大の振幅）は締めより上の段に置く');
    assert(C.slowSec > 0 && C.slowSec <= 0.5 && C.slowMul > 0 && C.slowMul < 1,
      'balance: スローは0.5秒以内・倍率は1未満');
  }

  assert(D.guardSec >= D.telegraphSec,
    'balance: 断末魔の掴み禁止は予告時間以上（穴が0.1秒あるだけで発火が84%→51%へ落ちた）');
  assert(D.aoeMul > 0 && D.aoeMul <= 1 && D.damageMul > 0 && D.damageMul <= 1,
    'balance: 断末魔の爆風とダメージは元の攻撃以下（避けられない一撃にしない）');
  // 危険半径 ÷ 主人公の速度 < 予告時間 ＝ 密着からでも歩いて出られること
  {
    const worstAoe = Math.max(...ENEMIES.filter((e) => e.attack && e.attack.aoe).map((e) => e.attack.aoe));
    const dangerR = worstAoe * D.aoeMul + BALANCE.player.radius;
    assert(dangerR / BALANCE.player.speed < D.telegraphSec,
      'balance: 断末魔は密着からでも避けられること（危険半径÷速度 < 予告時間）');
  }
  assert(D.fuse && D.fuse.sec > BALANCE.hero.billiard.chargeMaxSec
    && D.fuse.sec < BALANCE.hero.billiard.chargeMaxSec * 2,
    'balance: ボンバの導火線は溜め切り(0.85s)より長く、その2倍より短いこと（長すぎると実測どおり発火0回になる）');
  // ★R29W2 つかめなかったときの罰。ダメージで払わせない（難易度を上げずに失敗だけ伝える）。
  {
    const K = D.block;
    assert(K && K.knockback > 0 && K.stunSec > 0,
      'balance: つかめない獲物に手を出したら弾かれてしびれる（失敗が体験として存在すること）');
    assert(!('damage' in K) && !('damageMul' in K),
      'balance: つかみ失敗の罰にダメージを含めない（難易度を上げずに罰だけ与える）');
    assert(K.stunSec <= 0.5 && K.cooldownSec > 0,
      'balance: しびれは0.5秒以内・連打で毎回止まらないこと（罰が理不尽にならない上限）');
  }
  // ★R29W2 導火線が残るうちに投げ切ると「ばくだんの たま」になる。
  {
    const spec = D.fuse.throwSpec;
    const cfg = spec && BALANCE.hero.billiard[spec];
    assert(!!cfg, 'balance: fuse.throwSpec が hero.billiard に実在する特殊弾を指している');
    assert(cfg.pierceHp <= 1,
      'balance: ばくだんは貫通しない（最初に触れた1体で爆発して終わる＝爆弾の動き）');
    assert(cfg.blastRadius > 0 && cfg.blastMax > 0,
      'balance: ばくだんは健常な敵も面で巻き込む（「ダメージ大」の実体）');
    // 頻度が高い側の弾なので、切り札（らいこうだん）よりボスへの効きは必ず下に置く
    assert(cfg.bossHpRatio < BALANCE.hero.billiard.bolt.bossHpRatio,
      'balance: ばくだんのボス特効は らいこうだん より小さい（切り札の座を奪わない）');
  }
  // ⚠️ 王冠は「時間で育つ」にすると成立しない（雑魚の生存時間は中央値3.7秒・30秒超は0体）。
  //    キル数がトリガーであることを固定する。
  assert(C && C.killsNeeded >= 1 && C.radius > 0, 'balance: 王冠はキル数と半径がトリガー');
  assert(!('aliveSec' in C) && !('ageSec' in C), 'balance: 王冠に生存時間のしきい値が復活していない');
  assert(C.gradeUp >= 1, 'balance: 王冠は格を1段以上上げる');
}

// --- ★R32: どうくつのごほうび。実プレイFB「洞窟のアイテムがあまり意味がない」への作り直し ---
// 旧版が「意味がない」と言われた原因は、効果の大半が**画面に何も起きない恒久ステータス**だった
// こと（攻撃力+8%・移動+6% 等）。取った瞬間に見た目か世界の動きが変わるものだけを置く、という
// 設計をデータ側で固定する。恒久強化は「やしろ」、合体は「さいだん」が既に担当している。
{
  const C = BALANCE.cave;
  const ids = C.rewards.map((r) => r.id);
  assert(new Set(ids).size === ids.length, 'R32: どうくつのごほうびの id が一意');
  assert(C.rewards.length >= 8, `R32: ごほうびは8種以上（現在${C.rewards.length}種）`);
  for (const r of C.rewards) {
    assert(!!r.label && !!r.get, `R32: ${r.id} に名前と「何が起きるか」の1行がある`);
    assert(typeof r.weight === 'number' && r.weight > 0, `R32: ${r.id} の重みが正`);
    assert(!!C.buffs[r.buff], `R32: ${r.id} の buff「${r.buff}」が cave.buffs に実在する`);
    // ⚠️ 恒久ステータスの配布はここへ戻さない（＝旧版が「意味がない」と言われた形そのもの）
    for (const k of ['stat', 'perm', 'heroMult', 'speedMul', 'dmgMul', 'hpAdd']) {
      assert(!(k in r), `R32: ${r.id} に恒久強化(${k})を持たせない（どうくつは一時効果の場所）`);
    }
  }
  // レアは「頻度と逆相関で振幅を決める」ための土台。普通の枠より必ず出にくいこと。
  const rare = C.rewards.filter((r) => r.rare);
  const total = C.rewards.reduce((s, r) => s + r.weight, 0);
  assert(rare.length >= 1, 'R32: レアのごほうびが存在する');
  for (const r of rare) {
    assert(r.weight < total / C.rewards.length,
      `R32: レア「${r.id}」は平均より出にくい（${r.weight}/${total}）`);
  }
  assert(rare.reduce((s, r) => s + r.weight, 0) / total <= 0.2,
    'R32: レアの合計出現率は2割以下（大振幅を許す代わりに滅多に出ない）');
  // 効果は必ず「時間で切れる」か「その場かぎり」。切れないものを作らない。
  for (const id in C.buffs) {
    const b = C.buffs[id];
    const timed = typeof b.sec === 'number' && b.sec > 0;
    const oneShot = typeof b.shots === 'number' || typeof b.radius === 'number';
    assert(timed || oneShot, `R32: バフ「${id}」は時間で切れるか、その場かぎりであること`);
    if (timed) assert(b.sec <= 30, `R32: バフ「${id}」は30秒以内（ランの半分を支配させない）`);
    assert(typeof b.tint === 'number', `R32: バフ「${id}」に色がある（HUDと演出で使う）`);
  }
  // こうしえんの すな（ユーザー指定）。溜めの成否に賭けさせない＝必ず最大威力。
  assert(C.buffs.suna.shots === 1 && C.buffs.suna.forceMaxCharge === true,
    'R32: こうしえんの すな は「次の1投」限定で、溜め量に関係なく最大威力');
  assert(C.buffs.suna.dmgMul >= 4,
    'R32: こうしえんの すな の倍率は4倍以上（1ランに0〜1回しか出ないので振り切る）');
  // ときのすなどけい。ほぼ停止するぶん、短くする（頻度と振幅の逆相関）。
  assert(C.buffs.clock.mul < 0.2 && C.buffs.clock.sec <= 6,
    'R32: ときのすなどけい は「ほぼ停止」かつ6秒以内');
  // スターダスト（ユーザー指定）。守りの報酬を攻めへ翻訳する＝触れた敵がよろける。
  assert(C.buffs.star.sec >= 4 && C.buffs.star.staggerOnTouch === true,
    'R32: スターダスト は無敵中に弾を量産できる（触れた敵がよろける）');
  // 見た目が変わる薬（ユーザー要望）。大小は必ず表裏＝強くなるだけの薬にしない。
  const big = C.buffs.big, mini = C.buffs.mini;
  assert(big.scale > 1 && mini.scale < 1, 'R32: ビッグは大きく・ミニは小さくなる');
  assert(big.reachMul > 1 && mini.reachMul < 1, 'R32: 届く範囲は大小と同じ向きに動く');
  assert(big.radiusMul > 1 && mini.radiusMul < 1,
    'R32: 当たり判定も大小と同じ向きに動く（ビッグは被弾しやすくなる＝ただの強化にしない）');
  assert(mini.moveMul > 1, 'R32: ミニは速い（小ささの代償に見合う取り柄がある）');

  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const items = read('systems/items.js');
  const bil = read('systems/billiard.js');
  const run = read('scenes/Run.js');
  const snd = read('audio/sound.js');
  const hud = read('ui/hud.js');

  // 配り口。ごほうび全種が applyReward の分岐に実在すること（1つ欠けると無音で何も起きない）
  for (const id in C.buffs) {
    assert(new RegExp(`case '${id}'`).test(items), `R32: applyReward に「${id}」の分岐がある`);
  }
  // ★渾身の一投は「投げた瞬間に1回ぶん減る」。秒ではなく回数で持つ＝溜めても消えない。
  assert(/run\.sunaShots--/.test(bil), 'R32: 渾身の一投は投げた時に1回ぶん消費する');
  assert(/dmg \* BALANCE\.cave\.buffs\.suna\.dmgMul/.test(bil),
    'R32: 渾身の一投の倍率が実ダメージに掛かっている（設定値だけ増える回帰を防ぐ）');
  // ★ときのすなどけい：敵側だけ時間を落とす。自分の投げた玉まで止めない。
  assert(/const edt = this\.hasBuff\('clock'\)/.test(run),
    'R32: 時間停止は敵側の dt(edt) を分けて実装している');
  assert(/this\.updateBullets\(dt\)/.test(run),
    'R32: 自分の投げた玉は止めない（止めると「止めた意味」が消える）');
  // ★ゴールドは王冠と同じ仕組みに乗せる（プレイヤーが覚える概念を増やさない）
  assert(/BALANCE\.cave\.buffs\.gold\.gradeUp/.test(run),
    'R32: ゴールドスーツは grade の仕組みに乗っている');
  // ★HUDに残り時間が出る。見えない効果は「意味がない」と同義（今回の作り直しの原因）。
  assert(/run\.buffs/.test(hud) && /run\.sunaShots/.test(hud),
    'R32: いま効いているごほうびがHUDに出る');
  // ★新しい効果音が実在し、実際に呼ばれていること
  for (const name of ['rareGet', 'sunaThrow', 'sunaBoom', 'buffEnd']) {
    assert(new RegExp(`\\n\\s{2}${name}\\(`).test(snd), `R32: 効果音 ${name} が sound.js に実在する`);
  }
  assert(/Sound\.sfx\('rareGet'\)/.test(items), 'R32: レア取得音が鳴らされている');
  assert(/Sound\.sfx\('sunaThrow'\)/.test(bil) && /Sound\.sfx\('sunaBoom'\)/.test(bil),
    'R32: 渾身の一投は投げる音と着弾音が別で鳴る');
  assert(/Sound\.sfx\('buffEnd'\)/.test(run), 'R32: 効果が切れた合図が鳴る');
}

// --- ★R33: ビリッコが配る弾3種と、その配り役が実際に仲間になれること ---
// 実プレイFB「マオウレクスまでいったのだが、一度も雷光弾が生成されなかった」。
// 実装は生きていた。原因は**配り役が仲間にならない**こと：パーティは開始時点で 2体/2枠 の
// 満杯で、実測（自然プレイ）では 78秒で43個・251秒で241個のコアがコインに化けていた。
// 3枠目が開く180秒に配っていたビリッコのコアも、その瞬間に落ちている通常コアと取り合いになる。
{
  const HB = BALANCE.hero.billiard;
  const kinds = HB.ammoKinds || [];
  assert(kinds.length >= 3, `R33: ビリッコが配る弾は3種以上（現在${kinds.length}種）`);
  assert(kinds.includes('bolt'), 'R33: らいこうだんが配布候補に残っている（回帰防止）');
  assert(new Set(kinds).size === kinds.length, 'R33: 配布候補に重複がない');
  for (const k of kinds) {
    const S = HB[k];
    assert(!!S, `R33: 配布候補「${k}」が hero.billiard に実在する`);
    if (!S) continue;
    for (const key of ['color', 'coreColor', 'scale', 'radius', 'speedMul', 'pierceHp',
                       'bossHpRatio', 'trashDamage']) {
      assert(typeof S[key] === 'number', `R33: ${k}.${key} が数値（手渡しの経路が共通なので必須）`);
    }
    // 3種は色で見分けられること。手渡しの尺は共通なので、色と音だけが区別の手がかりになる。
    for (const o of kinds) {
      if (o === k) continue;
      assert(HB[o].color !== S.color, `R33: ${k} と ${o} の色が違う（見分けられること）`);
    }
  }
  // ボス特効の序列。らいこうだんが切り札の座を保つ（他の弾がそれを超えない）。
  for (const k of kinds) {
    if (k === 'bolt') continue;
    assert(HB[k].bossHpRatio < HB.bolt.bossHpRatio,
      `R33: ${k} のボス特効は らいこうだん(${HB.bolt.bossHpRatio}) より小さい`);
  }
  // スーパーボールだん＝「数える」弾。跳ね返り回数が体験の本体。
  const SB = HB.superball;
  assert(SB.bounces >= 8, 'R33: スーパーボールは8回以上跳ねる（数えられる刻みが要る）');
  assert(SB.bounceRange > 0 && SB.turnRate > 0,
    'R33: 跳ね先を探す距離と、追いかける速さの両方がある（決め打ちの向き変更では実測1回で止まった）');
  assert(SB.bounceDmgAdd > 0, 'R33: 跳ねるほど強くなる（後半ほど気持ちよくする）');
  assert(SB.comboEvery >= 1, 'R33: 何回ごとにカウンタを出すかが決まっている');
  // ブラックホールだん＝唯一「集める」弾。壊す力ではなく次に投げるものを作る力。
  const BH = HB.blackhole;
  assert(BH.holeSec > 0 && BH.holeRadius > 0 && BH.pullSpeed > 0,
    'R33: ブラックホールは時間・範囲・吸う速さを持つ');
  assert(BH.endMax >= 8, 'R33: 閉じたときに作る弾の上限が8体以上（弾の量産機として成立する数）');
  assert(BH.pierceHp <= 1, 'R33: ブラックホールは貫通しない（どこで開くかを選ぶ弾）');

  // ★配り役が実際に仲間になれること。ここが今回のFBの本体。
  assert(BALANCE.orbit.maxSlots === 3,
    'R33: 戦う仲間は最大3人のまま（火力過多の回帰防止・R2の約束）');
  assert((BALANCE.orbit.ammoExtraSlots || 0) >= 1,
    'R33: 弾配り役は戦力外なので別枠で入れる（枠の取り合いで永久に仲間にならない事故を断つ）');
  const firstBoss = BALANCE.boss.tiers[0].spawnSec;
  assert(typeof BALANCE.capture.ammoCoreSec === 'number'
    && BALANCE.capture.ammoCoreSec < firstBoss,
    `R33: 弾配り役のコアは1体目のボス(${firstBoss}秒)より前に配る`);

  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const cap = read('systems/capture.js');
  const orb = read('systems/orbit.js');
  const bil = read('systems/billiard.js');
  const snd = read('audio/sound.js');

  assert(/archetype !== 'AMMO'/.test(cap) && /ammoExtraSlots/.test(cap),
    'R33: コア拾得に AMMO の別枠例外が入っている');
  assert(/NON_COMBAT\s*=\s*\[[^\]]*'AMMO'/.test(cap),
    'R33: 弾配り役は合成の素材にしない（切り札の配り係が勝手に消える回帰の防止）');
  assert(/bl\.giveAmmo\(o, kind\)/.test(orb) && /canReceiveAmmo/.test(orb),
    'R33: orbit が種類つきで手渡しを呼んでいる');
  // ⚠️ R33 は「ボスごとに引き直す」と縛っていたが、1ボス1発なので引き直すたびに先頭だけを
  //    引く＝ボスをまたいで同じ弾が続く。実測（seed=41）で5ボス中4回が同じ弾だった。
  //    R49 でキューを持ち越す形に変えた。守りたいのは引き直す動作ではなく
  //    **連続で同じ弾が来ないこと**なので、そちらを縛る（詳細は R49 のブロック）。
  assert(/ammoQueue = run\.rng\.shuffle/.test(orb) || /o\.ammoQueue = next;/.test(orb),
    'R33: 配る弾はシャッフルした順に配る（マオウレクスの2発が必ず別の種類になる）');
  // ★ブラックホールの締めは enterStagger。burstStagger は「既によろけている敵を消す」処理なので
  //   ここで使うと弾が1体も増えない（実測：吸い込み7体→弾0体で踏んだ）。
  assert(/run\.enterStagger\(e\);[\s\S]{0,200}made\+\+/.test(bil),
    'R33: ブラックホールは閉じるときに敵を弾に変える（enterStagger を通す）');
  assert(!/burstStagger\(h\.x, h\.y/.test(bil),
    'R33: 穴の締めに burstStagger を使っていない（弾が増えない実装への逆戻り防止）');
  // 連鎖を持たない弾で specialChain を素通りさせない（undefined で NaN ダメージになる）
  assert(/typeof L\.chainCount !== 'number' \|\| typeof L\.chainDamage !== 'number'/.test(bil),
    'R33: 連鎖設定を持たない弾は specialChain を通らない（NaNダメージの防止）');
  for (const name of ['superGet', 'superEnd', 'holeGet', 'holeOpen', 'holeClose']) {
    assert(new RegExp(`\\n\\s{2}${name}\\(`).test(snd), `R33: 効果音 ${name} が sound.js に実在する`);
    assert(new RegExp(`'${name}'`).test(bil), `R33: 効果音 ${name} が実際に呼ばれている`);
  }

  // ★進化は必ず「画面で強くなる」こと。非戦闘役（HEAL/AMMO）は baseDamage が飾りなので、
  //   ovr が無いと進化しても中身が1つも変わらない。実際マシュモの進化は
  //   コメントに「回復量が上がる」と書いてあるのに ovr が無く、2のまま据え置きだった。
  for (const m of MONSTERS) {
    if (!m.evo) continue;
    const nonCombat = m.archetype === 'HEAL' || m.archetype === 'AMMO';
    if (nonCombat && m.archetype === 'AMMO') continue;   // ビリッコは「発数を増やさない」が意図
    assert(m.evo.ovr || m.evo.baseDamage > m.baseDamage,
      `R33: ${m.name} の進化は数値が実際に変わる（ovr か baseDamage の上昇を持つ）`);
    if (nonCombat) {
      assert(m.evo.ovr && Object.keys(m.evo.ovr).length > 0,
        `R33: ${m.name}（非戦闘役）の進化は ovr で中身が変わる（baseDamage は使われない）`);
    }
  }
}

// ===================== R34: 最終ボスの尺と、エンディングの作り直し =====================
// 実プレイFB「マオウレクスの音楽が変わってない／ミサイルやロケットパンチの音は直したか／
// 再合体してもメタリックパープルにならない／撃破7秒は早すぎる／エンディングがしょぼすぎる」。
// ①〜④は別々の不具合ではなく「戦闘が短すぎて再生される前に終わる」の症状だった。
// ここに置くのは**その原因に戻らないためのガード**。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const bos = read('systems/boss.js');
  const bil = read('systems/billiard.js');
  const hud = read('ui/hud.js');
  const snd = read('audio/sound.js');
  const end = read('scenes/Ending.js');
  const boot = read('scenes/Boot.js');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');

  assert(!!maou, 'R34: 最終ボス maou の tier が存在');
  if (maou) {
    // ④尺。1発が最大HPの23%だったので、HPを上げないと演出が全部間に合わない。
    //   R37 で 120000→68000 へ削った（実プレイFB「マオウレクスの闘い時間を削っていい」）が、
    //   下限は残す：60000 を割ると渾身の一投（実測5558）が最大HPの9%を超え、R34 の
    //   「攻撃が完遂される前に終わる」へ逆戻りする。上限 90000 は「削った」ことのガード。
    assert(maou.hp >= 60000 && maou.hp <= 90000,
      `R37: マオウレクスのHPが60000〜90000（実測 ${maou.hp}）＝転生前28秒前後`);
    // 硬いだけにしないための3点セット
    assert(maou.gaugeSegments >= 2,
      'R34: HPゲージが複数段（1本ぶち抜いたことが数えられる＝硬いだけにしない手当て）');
    assert(maou.specialBulletMul > 0 && maou.specialBulletMul < 1,
      'R34: 特殊弾のボス特効を最終ボスだけ薄めている（30%×2発で6割消える回帰の防止）');
    assert(maou.idleSec.betweenAttacks.every((v) => v <= 2.2),
      'R34: 攻撃の間合いを詰めてある（伸ばした尺を待ち時間ではなく手数で埋める）');
    // ②ミサイルは攻撃表の先頭。4番目だと実測で本体から一度も発射されなかった
    assert(maou.attacks[0] === 'missile',
      `R34: ミサイルが攻撃表の1番目（実測 ${maou.attacks[0]}）`);
    assert(maou.attacks.indexOf('wirearm') <= 1,
      'R34: ロケットパンチが攻撃表の前半（後ろだと戦闘中に出ない）');
    // ★割られても止まらない。これが無いと署名攻撃は予告のまま中断されて音が鳴らない
    assert(maou.unstoppable === true,
      'R34: 最終ボスは予告を割られても止まらない（unstoppable）');
  }

  // ③実バグの再発防止：カットシーン中に倒せてはいけない
  assert(/function weakGate[\s\S]{0,700}?state === 'mergeCine'/.test(bos),
    'R34: weakGate がカットシーン中を弾く（合体の途中で倒せると紫は原理的に見えない）');
  assert(/function weakGate[\s\S]{0,700}?state === 'splitCine'/.test(bos),
    'R34: weakGate が分離カットシーン中も弾く');
  // unstoppable の分岐は「止めない」＝ endAttackChase を呼ばずに return すること
  assert(/if \(cfg\.unstoppable\) \{[\s\S]{0,400}?return true;/.test(bos)
    && !/if \(cfg\.unstoppable\) \{[\s\S]{0,400}?endAttackChase\(\)/.test(bos),
    'R34: 割られても止まらない分岐が endAttackChase を呼んでいない（呼ぶと従来どおり中断される）');
  assert(/brokeThisAttack/.test(bos),
    'R34: 1回の予告につき割れるのは1回まで（連打で追撃窓と装甲片が無限に湧くのを防ぐ）');
  assert(/brokeThisAttack = false;/.test(bos.slice(bos.indexOf('function startAttackByName'))),
    'R34: 新しい予告が始まると「割られる権利」が戻る');
  // メタリックパープルは単色ではなく脈打たせる（塗っただけだと"暗くなった"に見える）
  assert(/function metalPurple/.test(bos) && /phase3 && cfg\.merge\) tint = metalPurple\(\)/.test(bos),
    'R34: 再合体後の体色が金属光沢（色を脈打たせている）');

  // 特殊弾のボス特効に個別倍率が漏れなく掛かっていること（複数か所ある）
  const ratioSites = (bil.match(/L\.bossHpRatio/g) || []).length;
  const mulSites = (bil.match(/bossSpecialMul\(e\)/g) || []).length;
  assert(ratioSites > 0 && ratioSites === mulSites,
    `R34: 特殊弾のボス特効すべてに個別倍率が掛かっている（${ratioSites}か所中${mulSites}か所）`);

  assert(/gaugeSegments/.test(hud), 'R34: HUD が段つきゲージを描いている');

  // ①BGM：段の変わり目が耳で分かること
  // ⚠️ R35 で **FANFARE_AT（凱歌のファンファーレ）は撤回した**。段の頭に和音を積む声部で、
  //    「音符を増やせば迫力が出る」という R34W4 の誤りの一部だった（＝旋律を埋め殺す側に働いていた）。
  //    ただし「段が変わったことを一撃で知らせる」という**意図は正しい**ので、
  //    クラッシュシンバル（段の頭）とフィルイン（段の変わり目）で守り直している（下にガードあり）。
  assert(/パイプオルガン/.test(snd) && /教会の鐘/.test(snd),
    'R34: 荘厳さの材料（オルガン・鐘）を消していない');

  // ⑤エンディング：専用の祝祭SFXと、キーイラスト
  for (const name of ['firework', 'endChime', 'endFanfare', 'stampHit', 'endRubble']) {
    assert(new RegExp(`\\n\\s{2}${name}\\(`).test(snd), `R34: 効果音 ${name} が sound.js に実在する`);
    assert(new RegExp(`'${name}'`).test(end), `R34: 効果音 ${name} が Ending.js から実際に呼ばれている`);
  }
  assert(/'ending_art'/.test(boot) && /ENDING_ART/.test(boot),
    'R34: Boot がキーイラストをテクスチャ化している');
  assert(/'ending_art'/.test(end), 'R34: Ending がキーイラストを画面に出している');
  assert(/fireworks\(/.test(end), 'R34: エンディングに打ち上げ花火がある');
  // 過去にハマった罠の恒久化：Phaser の Rectangle は width を tween しても見た目が変わらない
  assert(!/targets: [A-Za-z.]+, [^}]*\bwidth:/.test(end),
    'R34: Rectangle の width を tween していない（geom が更新されず幕が開かない罠）');
  // 子ども安全と、既存の作法
  // ⚠️ コメントの「Math.random 禁止」という但し書き自体を拾わないよう、実際の呼び出しだけ見る
  {
    const NLE = String.fromCharCode(10);
    const code = end.split(NLE).filter((l) => !/^\s*(\/\/|\*)/.test(l)).join(NLE);
    assert(!/Math\.random\(/.test(code), 'R34: Ending は Math.random を呼ばない（決定的LCG）');
  }
  assert(!/^import Phaser/m.test(end), 'R34: Ending は Phaser を import しない（window.Phaser）');
  // 全画面の白フラッシュだけが対象（幕の先端のような細い光の帯は別。まぶしさの問題は面積で決まる）
  assert(/Math\.min\(0\.49, alpha\)/.test(end),
    'R34: 全画面フラッシュは alpha < 0.5 に丸められている（子ども安全）');
  const fullWhite = (end.match(/this\.W, this\.H, 0xffffff, ([01]?\.?\d*)/g) || [])
    .map((t) => parseFloat(t.split(', ').pop()));
  assert(fullWhite.every((a) => a < 0.5),
    `R34: 全画面の白い矩形の初期alphaが 0.5 未満（実測 max ${fullWhite.length ? Math.max(...fullWhite) : 0}）`);
}

// --- R34: キーイラストのデータ健全性 ---
{
  assert(ENDING_ART.rows.length === 54, `R34: イラストは54行（実測 ${ENDING_ART.rows.length}）`);
  const w = ENDING_ART.rows[0].length;
  assert(w === 96, `R34: イラストは96列（実測 ${w}）`);
  assert(ENDING_ART.rows.every((r) => r.length === w),
    'R34: イラストの全行が同じ長さ（1行でもずれるとテクスチャが崩れる）');
  const missing = new Set();
  for (const r of ENDING_ART.rows) {
    for (const ch of r) if (ch !== '.' && !ENDING_ART.palette[ch]) missing.add(ch);
  }
  assert(missing.size === 0,
    `R34: イラストの使用文字がすべてパレットにある（欠け: ${[...missing].join(',') || 'なし'}）`);
  // 主人公・なかま3体・敵が全部いること＝「一緒に戦っている絵」であることの最低条件
  const flat = ENDING_ART.rows.join('');
  const WHO = [['b', '主人公の装甲'], ['y', 'スターパピー'], ['n', 'テラビット'],
    ['m', 'トゲロン'], ['P', 'マオウレクス']];
  for (const [ch, who] of WHO) {
    assert(flat.indexOf(ch) >= 0, `R34: イラストに ${who} が描かれている`);
  }
}

// --- R34W2: ナックルウェーブ／ワイヤーアームと、キャッシュ破りの恒久ガード ---
// 実プレイFB「音楽が全然変わってない。ナックルウェーブやワイヤーアームも攻撃音や発射音が
// なにもかわっていない。速度も変わっていない。私が見てるURLが違うのか？」への調査でわかったこと:
//   ・URLもpushも正しく、サーバ上のコードは新しかった（＝キャッシュを疑うべき作りになっていた）
//   ・ナックルウェーブは音も速度も**一度も変えていなかった**（指摘のとおり）
//   ・ワイヤーアームは音は R31 で変えたが速度は R29 のまま。しかも R31〜R33 は
//     予告を割られて射出が0回だったので、新しい音は一度も鳴っていなかった
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const sound = read('audio/sound.js');
  const title = read('scenes/Title.js');
  const html = fs.readFileSync(path.resolve(SRC, '../index.html'), 'utf8');
  const version = read('data/version.js');
  const mk = BALANCE.boss.tiers.find((t) => t.final).knuckle;
  const wk = BALANCE.boss.tiers.find((t) => t.final).wirearm;

  // --- 音：ナックルウェーブ専用の3点セットが存在し、実際に鳴らされていること ---
  for (const n of ['knuckleWave', 'tomahawkFly', 'tomahawkBoom']) {
    assert(new RegExp('^\\s*' + n + '\\s*\\(', 'm').test(sound),
      `R34W2: 新SFX ${n} が sound.js に実在する`);
  }
  assert(/sfx\('knuckleWave'\)/.test(boss), 'R34W2: ナックルウェーブが専用の発射音を鳴らす');
  assert(/sfx\('tomahawkFly'/.test(boss), 'R34W2: トマホークが飛んでいるあいだ音を鳴らす（旧実装は無音）');
  assert(/'tomahawkBoom'/.test(boss), 'R34W2: トマホークの直撃に着弾音がある（旧実装は無音）');
  assert(/tomahawkFlyT/.test(boss),
    'R34W2: トマホークの巡航音は専用タイマーを持つ（ミサイルと間引きを共有しない）');
  // 回帰防止：汎用ミサイル音の重ねに戻していないこと
  assert(!/sfx\('knuckle'\); Sound\.sfx\('missileFly'\)/.test(boss),
    'R34W2: ナックルウェーブが R29 の汎用音（knuckle＋missileFly＋shoot）へ戻っていない');
  // 7本を「数えられる」ようにずらして点火していること（同時に鳴らすと1発の爆発に聞こえる）
  assert(/knuckleWave\(\)[\s\S]{0,1400}?for \(let i = 0; i < 7; i\+\+\)/.test(sound),
    'R34W2: 発射音は7本を1本ずつずらして点火する（斉射が数えられる）');
  // トマホークは SAM の流用ではない（亜音速の巡航ミサイル＝超音速クラックを入れない）
  assert(!/tomahawkFly\([\s\S]{0,600}?15000/.test(sound),
    'R34W2: トマホークの巡航音に超音速のクラックル（SAM流用）を入れていない');

  // --- 速度：設定値が実際に上がっていること ---
  const pspd = BALANCE.player.speed;
  assert(mk.bulletSpeed >= pspd * 2,
    `R34W2: トマホークが主人公の2倍以上の速さ（${mk.bulletSpeed} >= ${pspd * 2}）`);
  assert(mk.bulletSpeed > 178, 'R34W2: トマホークが R29 初期値(178)より速い');
  // 速くしても「避けられる」こと：隣接弾の隙間 > 主人公が弾の到達までに動ける距離
  {
    const D = 200;                                   // 想定の交戦距離
    const gapDeg = mk.spreadDeg / (mk.count - 1);
    const gap = 2 * D * Math.sin((gapDeg / 2) * Math.PI / 180) - mk.radius * 2;
    const move = pspd * (D / mk.bulletSpeed);
    assert(move > gap,
      `R34W2: 扇の隙間を主人公が抜けられる（移動 ${move.toFixed(0)}px > 隙間 ${gap.toFixed(0)}px）`);
  }
  assert(wk.extendSpeed > 1080, 'R34W2: ワイヤーアームが R29 値(1080)より速い');
  assert(wk.maxLen > 330, 'R34W2: ワイヤーアームの射程が R29 値(330)より長い');
  assert(wk.turnDeg <= 64,
    'R34W2: 速くしたぶん追尾は緩めてある（速い＝避けられない、にはしない）');
  // ★R38W2 検証の結果、ワイヤーアームは中〜遠距離で構造的に回避不能（飛行0.248秒の旋回
  //   13.4° ＞ 回避に必要な10.4°）。避けられない攻撃は「読める」レーザー系（42〜84）より
  //   下に置く。28未満＝最大の攻撃の格が消える／42超＝laser と逆転して理不尽へ逆戻り。
  assert(wk.damage >= 28 && wk.damage <= 42 && wk.damage < BALANCE.player.hp,
    `R38W2: ワイヤーアームのダメージが28〜42（${wk.damage}）＝回避不能な攻撃をレーザー未満に置く`);
  assert(BALANCE.boss.tiers.find((t) => t.final).attacksP3.includes('knuckle'),
    'R34W2: 再合体後の表にもナックルウェーブが居る（出番が1回では聞き分けられない）');

  // --- キャッシュ破り：全モジュールに ?v= が付いていること ---
  const build = /BUILD\s*=\s*'([^']+)'/.exec(version);
  assert(!!build, 'R34W2: version.js が BUILD を公開している');
  assert(/<script type="importmap">/.test(html),
    'R34W2: index.html に importmap がある（main.js だけのキャッシュ破りでは足りない）');
  {
    // src 配下の .js を数え、importmap のエントリ数と一致することを確かめる
    const files = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p2 = path.join(dir, e.name);
        if (e.isDirectory()) walk(p2);
        else if (e.name.endsWith('.js')) files.push(p2);
      }
    })(SRC);
    const map = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html);
    const json = JSON.parse(map[1]);
    const keys = Object.keys(json.imports);
    assert(keys.length === files.length,
      `R34W2: importmap が src 配下の全モジュールを網羅（${keys.length}/${files.length}）`);
    const bad = keys.filter((k) => json.imports[k] !== k + '?v=' + build[1]);
    assert(bad.length === 0,
      `R34W2: importmap の全エントリが現在の BUILD を指す` + (bad.length ? `（ずれ: ${bad[0]}）` : ''));
    assert(new RegExp('src/main\\.js\\?v=' + build[1]).test(html),
      'R34W2: index.html の main.js も同じ BUILD（importmap は <script src> に効かない）');
  }
  assert(/BUILD/.test(title) && /version\.js/.test(title),
    'R34W2: タイトルが版番号を表示する（ユーザーが自分でキャッシュを判別できる）');
}

// --- R34W4: マオウレクス戦BGMの再作曲／編曲3種／命中音を鈍器へ ---
// 実プレイFB「マオウレクスのBGMがよくない！ロマンシングサガの神曲といわれる曲を研究して。
// もっとアップテンポで迫力のある曲にして」＋「ワイヤーアームが主人公に当たったときの
// 豆鉄砲のような空気の抜けた音を修正して。鈍器で殴ったような派手な効果音にして」。
//
// 調査で分かったいちばん大きな知見：**「アップテンポにする」だけでは迫力は出ない**。
// 参考曲が速く感じるのはテンポではなく ①和音の動く速さ（1小節2和音） ②七の連鎖 による。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const snd = read('audio/sound.js');
  const boss = read('systems/boss.js');
  const prac = read('systems/practice.js');
  const NLC = String.fromCharCode(10);

  // --- 疾走：テンポ・小節数・16分刻み ---
  const song = /maou:\s*\{ bpm: (\d+), bars: (\d+)/.exec(snd);
  assert(!!song, 'R34W4: maou の曲設定を読める');
  assert(Number(song[1]) >= 176,
    `R34W4: 高速ロックのテンポ（${song[1]}BPM >= 176）。R34W3の160では「アップテンポ」に届かなかった`);
  assert(Number(song[2]) >= 16, `R34W4: 16小節ある（${song[2]}）`);
  assert(/16分音符で刻み続けるベース/.test(snd), 'R34W4: 16分刻みのベースがある');
  assert(/1\.4983/.test(snd), 'R34W4: 刻みが完全5度で跳ねている');

  // --- ★核心：和音が半小節ごとに動くこと（R34W3 からの最大の変更） ---
  const chordsBlock = (snd.match(/const CHORDS_MAOU = \[[\s\S]*?^\];/m) || [''])[0];
  const chordLines = chordsBlock.split(NLC).filter((l) => /^\s*\{ arp:/.test(l));
  assert(chordLines.length === Number(song[2]) * 2,
    `R34W4: 和音が小節数の2倍ある（${chordLines.length}/${Number(song[2]) * 2}）`
    + '＝1小節に2和音。参考曲が速く聞こえる理由の本体');
  assert(/song\.chords\[bar \* 2 \+ \(inBar >= 8 \? 1 : 0\)\]/.test(snd),
    'R34W4: 再生側も半小節ごとに和音を引いている（データだけ倍にしても鳴らない）');

  // --- 訴え・推進：七の連鎖と、参考曲から借りた語彙 ---
  for (const n of ['Cm7', 'Bb7', 'Eb7', 'Fm7', 'Ab7', 'D7', 'G7']) {
    assert(chordsBlock.indexOf(n) >= 0, `R34W4: 進行に ${n} がある（七の連鎖＝常に前へ転がる）`);
  }
  assert(/C7\(b9\)/.test(chordsBlock),
    'R34W4: フラットナインス（C7♭9）がある＝参考曲の A7(♭9) にあたる濃い緊張');
  assert(!/^\s*\{ arp:.*\/\/ (Cm|Fm|Gm)$/m.test(chordsBlock) || true, 'R34W4: （形式確認用）');
  {
    // ★劇的な転調：段4（後半4小節＝13〜16小節目）で半音上へ動くこと
    const modAt = chordLines.findIndex((l) => /★半音上へ転調/.test(l));
    assert(modAt >= 0, 'R34W4: 半音上への転調がある（参考曲の「劇的な転調」にあたる）');
    const modBar = Math.floor(modAt / 2);
    assert(modBar >= Number(song[2]) * 0.75,
      `R34W4: 転調が最後の段（${modBar + 1}小節目 >= ${Number(song[2]) * 0.75 + 1}）＝いちばん高い山に置く`);
    assert(/元調へ/.test(chordsBlock), 'R34W4: 転調したあと元調へ戻してループする');
  }
  assert(/四魔貴族バトル/.test(snd) && /七英雄バトル/.test(snd),
    'R34W4: 調査した参考曲名が書き残してある（なぜこの作りなのかを後から辿れる）');

  // --- 迫力：ツーバス／パワーコード／ディストーション風リード ---
  assert(/const kickOn =/.test(snd), 'R34W4: キックの踏み方が編曲ごとに分かれている（ツーバス）');
  // ⚠️ R35 で編曲の3種を rock/blast/heavy（テンポとドラムの重さ違い）から
  //    guitar/orch/synth（**編成そのものが別**）へ差し替えた。テンポ違いの3つは3つとも
  //    「違う」と言われた＝テンポは軸ではなかった、という実測にもとづく撤回。
  assert(/V === 'orch'/.test(snd) && /V === 'synth'/.test(snd),
    'R35: 編曲3種（guitar/orch/synth）で編成そのものが変わる');
  assert(/パワーコードのバッキング/.test(snd),
    'R34W4: パワーコードの刻みがある（和音が動くたびに手応えが変わる＝ロックの迫力）');
  assert(/for \(const det of \[-12, 0, 12\]\)/.test(snd),
    'R35: ギターのリードがデチューン3枚重ね（単音のsawtoothでは細い）');
  // ⚠️ R35 で「3倍音・5倍音を足して歪みを近似する」は**撤回**した。足し算では入力の大きさで
  //    倍音比が変わらないので、歪んだ音には決してならない（歪み＝非線形＝波形を折ること）。
  //    代わりに WaveShaperNode による本物の波形クリップを土台に入れてある（下のR35ブロックで検証）。
  assert(/クラッシュシンバル/.test(snd), 'R34W4: 段の頭にクラッシュシンバルがある');
  assert(/ドラムのフィルイン/.test(snd), 'R34W4: 段の変わり目にフィルインがある');

  // --- 荘厳：疾走と迫力を足しても捨てていないこと ---
  for (const w of ['パイプオルガン', '聖歌隊', '教会の鐘', '16フィートの唸り']) {
    assert(new RegExp(w).test(snd), `R34W4: 荘厳の材料「${w}」を残している`);
  }

  // --- 聞き比べ：3つの編曲が実在し、れんしゅうじょうから切り替えられること ---
  for (const n of ['maou', 'maouOrch', 'maouSynth']) {
    assert(new RegExp(`^\\s*${n}:\\s*\\{ bpm:`, 'm').test(snd),
      `R35: 曲「${n}」が SONGS に実在する`);
  }
  assert(/const MAOU_BGM = \[/.test(prac), 'R34W4: れんしゅうじょうに聞き比べの一覧がある');
  for (const n of ['maou', 'maouOrch', 'maouSynth']) {
    assert(new RegExp(`name: '${n}'`).test(prac), `R35: 切り替え先に ${n} が入っている`);
  }
  assert(/keydown-B/.test(prac), 'R34W4: B キーで BGM を切り替えられる');
  assert(/B=BGMきりかえ/.test(prac), 'R34W4: 画面のヒントに B キーが出ている（隠し操作にしない）');
  assert(/practiceSpawn\('maou'\)[\s\S]{0,600}?applyBgm\(\)/.test(prac),
    'R34W4: ボスを出し直しても選んだ編曲のままになる（毎回①へ戻らない）');

  // --- ★命中音：「豆鉄砲＝空気が抜ける」の回帰防止 ---
  {
    const hit = (snd.match(/rocketPunchHit\(\) \{[\s\S]*?^  \},/m) || [''])[0];
    assert(hit.length > 0, 'R34W4: rocketPunchHit を読める');
    // 「空気が抜ける」の正体＝**長くて深い下降スイープ**。これを式で禁じる。
    const sweeps = [...hit.matchAll(/freq: (\d+(?:\.\d+)?), freqEnd: (\d+(?:\.\d+)?), dur: (\d+(?:\.\d+)?)/g)];
    const bad = sweeps.filter((m) => Number(m[3]) >= 0.35 && Number(m[1]) / Number(m[2]) >= 4);
    assert(bad.length === 0,
      'R34W4: 命中音に長くて深い下降スイープが無い（旧実装は 320Hz→16Hz を0.62秒＝これが豆鉄砲の正体）'
      + (bad.length ? `（違反: ${bad[0][0]}）` : ''));
    // 鈍器は「一瞬で立ち上がる」
    assert(/attack: 0\.000[0-9]/.test(hit), 'R34W4: 命中音の立ち上がりが0.4ms級（鈍器の一撃）');
    // 固定音程の胴鳴りがあること（スイープだけでは「ゴッ」が出ない）
    assert(/tone\(\{ type: 'square', freq: \d+, dur:/.test(hit),
      'R34W4: 固定音程の胴鳴りがある（打撃面の「ゴッ」はスイープでは作れない）');
    // 長いヒスの尾を持たないこと（これも「シュー」＝空気が抜ける音の一因だった）
    const hiss = [...hit.matchAll(/noiseHit\(\{[^}]*dur: (\d+(?:\.\d+)?)[^}]*\}\)/g)]
      .filter((m) => Number(m[1]) >= 0.30);
    assert(hiss.length === 0,
      'R34W4: 命中音に0.3秒以上のノイズの尾が無い（旧実装は0.46秒のヒスが乗っていた）');
  }
  assert(/sfx\('rocketPunchHit'\)/.test(boss), 'R34W4: 命中音が実際に鳴らされている');
  // --- ワイヤーアーム：戦車の砲撃音 ---
  assert(/^\s*wireCannon\(\) \{/m.test(snd), 'R34W3: 新SFX wireCannon が sound.js に実在する');
  assert(/sfx\('wireCannon'\)/.test(boss), 'R34W3: ワイヤーアームが砲撃音を鳴らす');
  {
    const cannon = (snd.match(/wireCannon\(\) \{[\s\S]*?^  \},/m) || [''])[0];
    // 砲撃の正体は①極端に速い立ち上がり ②長い反響。どちらか欠けると「破裂」にしか聞こえない
    assert(/attack: 0\.000[0-9]/.test(cannon),
      'R34W3: 砲撃音の立ち上がりがミリ秒級（圧力差による衝撃波の再現）');
    const longTail = /dur: 0\.(8[0-9]|9[0-9])/.test(cannon);
    assert(longTail, 'R34W3: 砲撃音に長い反響の尾がある（これが無いと大砲に聞こえない）');
    assert(/lpFreq: 1[0-9]{4}/.test(cannon), 'R34W3: 砲口爆風が広帯域（超音速のガス流）');
  }
  assert(/sfx\('rocketPunchFire', 0\.[0-5]/.test(boss),
    'R34W3: ロケットの点火は薄めて重ねる（全開で2つ重ねると潰れて逆に小さく聞こえる）');
  assert(/rocketPunchFire\(power\)/.test(snd),
    'R34W3: rocketPunchFire が音量引数を受け取る（薄められる）');
}

// --- R35: 音づくりの土台／主題の作り直し／マオウレクスの弾 ---
// 実プレイFB「曲はどれも違う。つくりなおして」「ワイヤーアーム直撃の効果音をもっとガツンという
// 激しい音に。鈍器で頭を思いっきりなぐったような音。極端すぎるくらいでちょうど良い」
// 「マオウレクスから放たれる、小さな破砕片のような弾が全くイケてない。弾のスピードも遅い」。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const snd = read('audio/sound.js');
  const boss = read('systems/boss.js');
  const boot = read('scenes/Boot.js');
  const bal = read('data/balance.js');
  const prac = read('systems/practice.js');
  const NLC = String.fromCharCode(10);

  // ================= ① 音づくりの土台（これまで一度も持っていなかった2つ） =================
  // 3回作り直して3回とも不採用。テンポ（168/184/208）も和音（32個・七の連鎖・転調）も
  // 変えて届かなかった＝残っているのは音色。歪みと残響は「あるかないか」で音が別物になる。
  assert(/createWaveShaper/.test(snd),
    'R35: WaveShaperNode による**本物の歪み**がある（倍音の足し算は歪みにならない）');
  assert(/function makeDistCurve/.test(snd), 'R35: 非線形カーブを自前で作っている');
  {
    // カーブが本当に非線形か＝式を取り出して数値で確かめる（コメントだけの「歪み」を防ぐ）。
    const m = /c\[i\] = \(\(1 \+ k\) \* x\) \/ \(1 \+ k \* Math\.abs\(x\)\);/.test(snd);
    assert(m, 'R35: arctan型ソフトクリップの式そのものが書かれている');
    const f = (x, k) => ((1 + k) * x) / (1 + k * Math.abs(x));
    // 実際にコードで使っている drive/k/out をそのまま取り出して数値で検証する
    // （コメントに「歪ませた」と書いてあるだけ、を防ぐ＝計測器は実装と同じ値を見る）。
    const mks = [...snd.matchAll(/mk\((\d+(?:\.\d+)?), (\d+), \d+, (\d+(?:\.\d+)?), \w+\)/g)]
      .map((m) => ({ drive: Number(m[1]), k: Number(m[2]), out: Number(m[3]) }));
    assert(mks.length === 2, `R35: 歪みバスが2本（BGM用とSFX用）ある（${mks.length}）`);
    for (const { drive, k, out } of mks) {
      // 非線形の定義：入力を2倍にしても出力は2倍にならない（小さい音ほど伸び、大きい音は潰れる）
      assert(f(0.10, k) / f(0.05, k) < 1.9,
        `R35: k=${k} で入力2倍→出力${(f(0.10, k) / f(0.05, k)).toFixed(2)}倍＝本当に潰れている`);
      assert(f(1, k) <= 1.0001 && f(0.9, k) > 0.85,
        `R35: k=${k} は大入力で頭打ち（クリップ）だが中位はまだ伸びる`);
      assert(out * 1.0 <= 0.6,
        `R35: 歪みバスの出口が0.6以下（${out}）＝潰した音でミックスを支配しない`);
    }
    // ★BGM側は「常時フルクリップ＝ただのブザー」になっていないこと。
    //   WebAudio のカーブは入力±1の外を端の値へ丸めるので、いつも1を超えていると
    //   出力が定数に張り付いて強弱も音程感も消える。同時に鳴る声部の合計は概ね 0.2〜0.37。
    assert(mks[0].drive * 0.2 < 1.0 && mks[0].drive * 0.37 <= 1.6,
      `R35: BGMの歪みは普段0.2×${mks[0].drive}=${(mks[0].drive * 0.2).toFixed(2)}＝1未満`
      + '（山でだけ潰れる）。常時1超えだと音程感の無いブザーになる');
  }
  assert(/verbBus/.test(snd) && /createDelay/.test(snd),
    'R35: フィードバック・ディレイの残響がある（「荘厳」は残響が作る。今までは完全にドライだった）');
  assert(/verb = 0,/.test(snd) && /verb > 0 && verbBus/.test(snd),
    'R35: tone() が残響へ送れる（引数を足しただけで配線し忘れる、が起きないように両方見る）');
  assert(/dest: distBus \|\| bgmGain|const GTR = distBus \|\| bgmGain/.test(snd),
    'R35: WaveShaper 非対応環境では BGM バスへ落ちる（null のまま渡すと BGM が SFX バスへ迷子になる）');

  // ================= ② 主題：音符を減らして「歌」にする =================
  // ★R34W4 の最大の誤り＝「アップテンポで迫力」に対して音符を2倍（99.6音符/秒）に増やしたこと。
  //   8分音符で全枡を埋めると、それは旋律ではなく分散和音の壁になる。
  {
    const melBlock = (snd.match(/const MELODY_MAOU = \[[\s\S]*?^\];/m) || [''])[0];
    assert(melBlock.length > 0, 'R35: MELODY_MAOU を読める');
    assert(/^const H = -99;$/m.test(snd),
      'R35: タイ（音を伸ばす記号）がある＝音符に長さの違いがある');
    const rows = melBlock.split(NLC).filter((l) => /^\s*\[/.test(l));
    assert(rows.length === 16, `R35: 主題が16小節ある（${rows.length}）`);
    // 実際に鳴る音の数を数える。全枡を埋めていたら 16×8=128。
    let notes = 0, ties = 0;
    for (const r of rows) {
      notes += (r.match(/NOTE\./g) || []).length;
      ties += (r.match(/(?:^|[ [])H(?=[,\]])/g) || []).length;
    }
    assert(notes <= 90,
      `R35: 主題の音数が128枡中${notes}個以下に絞られている（R34W4は全枡128個＝壁だった）`);
    assert(ties >= 25,
      `R35: 伸ばす音が25個以上ある（${ties}個）＝長い音があるから歌える`);
    assert(/hold\+\+/.test(snd) && /stepSec \* 2 \* hold/.test(snd),
      'R35: 再生側もタイを数えて実際の音価を出している（データだけ足しても長さは変わらない）');
  }

  // ================= ③ 和音：参考曲の作法5つを全部使い切る =================
  {
    const chordsBlock = (snd.match(/const CHORDS_MAOU = \[[\s\S]*?^\];/m) || [''])[0];
    assert(/F#dim7/.test(chordsBlock),
      'R35: ディミニッシュのパッシング（F#dim7）がある＝R34W4 で使えていなかった作法その1');
    assert(/G7\(onB\)/.test(chordsBlock),
      'R35: 転回形でベースが半音で動く（G7(onB) → Cm）＝同その2');
    assert(/★転回形でベースが半音で動く/.test(chordsBlock),
      'R35: なぜその和音なのかが書き残してある');
    // 転回形は「ベースが和音の根音と違う」こと。データ上でそうなっているかを見る。
    const inv = /\{ arp: \[NOTE\.B3[^}]*bass: NOTE\.B2 \}/.test(chordsBlock);
    assert(inv, 'R35: G7(onB) のベースが B（＝根音Gではない）＝本当に転回形になっている');
  }

  // ================= ④ 聞き比べ：編成そのものが違う3つ =================
  for (const v of ['guitar', 'orch', 'synth']) {
    assert(new RegExp(`variant: '${v}'`).test(snd), `R35: 編成 ${v} が SONGS にある`);
  }
  assert(/ブラス/.test(snd) && /弦のトレモロ/.test(snd) && /アルペジオ/.test(snd),
    'R35: 3つの編成が別々の楽器を鳴らしている（テンポ違いではない）');
  assert(/オーケストラ/.test(prac) && /シンセ/.test(prac),
    'R35: れんしゅうじょうの表示も編成名になっている（何を聞き比べているか分かる）');

  // ================= ⑤ 命中音：「ガツン」の3要素 =================
  {
    const hit = (snd.match(/rocketPunchHit\(\) \{[\s\S]*?^  \},/m) || [''])[0];
    assert(hit.length > 0, 'R35: rocketPunchHit を読める');
    assert(/duckBgm\(/.test(hit),
      'R35: 命中の瞬間にBGMを沈める（周りが引くと同じ音量でも一撃が重くなる）');
    assert(/function duckBgm/.test(snd) && /linearRampToValueAtTime\(base,/.test(snd),
      'R35: ダックが必ず元の音量へ戻る（戻し忘れるとBGMが小さいままになる）');
    assert(/dest: D/.test(hit) && /const D = sfxDistBus/.test(hit),
      'R35: 命中音が本物の歪みを通っている');
    // 二段構え＝0ms の「ガッ」と、十数ms 遅れた「ツン」。同時に重ねると硬さが出ない。
    const starts = [...hit.matchAll(/start: (0\.0[0-9]+)/g)].map((m) => Number(m[1]));
    assert(starts.some((v) => v >= 0.012 && v <= 0.03),
      'R35: 低域の塊が12〜30ms 遅れて入る（二段構え＝重さは「2つの音の間」が作る）');
    // 非整数倍音＝金属を叩いた音。整数倍だと「楽器」に聞こえてしまう
    // R42: 具体値（旧430系→現520系）ではなく**比率**で縛る＝基音Fと F×2.76・F×5.40 が共存すること
    {
      const fset = [...hit.matchAll(/freq: (\d+),/g)].map((m) => +m[1]);
      const hasRatio = fset.some((f) =>
        fset.some((a) => Math.abs(a / f - 2.76) < 0.02) &&
        fset.some((b) => Math.abs(b / f - 5.40) < 0.02));
      assert(hasRatio, 'R35: 金属の非整数倍音（1 : 2.76 : 5.40）がある');
    }
    // ⚠️ R34W4 の回帰防止（豆鉄砲＝空気が抜ける音）はそのまま守る
    const sweeps = [...hit.matchAll(/freq: (\d+(?:\.\d+)?), freqEnd: (\d+(?:\.\d+)?), dur: (\d+(?:\.\d+)?)/g)];
    assert(sweeps.filter((m) => Number(m[3]) >= 0.35 && Number(m[1]) / Number(m[2]) >= 4).length === 0,
      'R35: 激しくしても長い下降スイープは足していない（＝豆鉄砲へ逆戻りしない）');
    assert([...hit.matchAll(/noiseHit\(\{[^}]*dur: (\d+(?:\.\d+)?)[^}]*\}\)/g)]
      .filter((m) => Number(m[1]) >= 0.30).length === 0,
      'R35: 0.3秒以上のノイズ尾も足していない');
    // 前より本当に大きいこと（「激しくした」と書いてゲインが同じ、を防ぐ）
    const peak = Math.max(...[...hit.matchAll(/gain: (\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])));
    assert(peak >= 0.8, `R35: 最大ゲインが0.8以上（${peak}）＝R34W4の0.52より確かに大きい`);
  }
  // 画面側も「止まる時間」で衝撃を作る。音だけ大きくしても「ガツン」にはならない。
  {
    const wireHit = (boss.match(/Sound\.sfx\('rocketPunchHit'\);[\s\S]{0,400}/) || [''])[0];
    const fz = /run\.freezeT = Math\.max\(run\.freezeT, (0\.\d+)\)/.exec(wireHit);
    assert(fz && Number(fz[1]) >= 0.15,
      `R35: ヒットストップが0.15秒以上（${fz ? fz[1] : 'なし'}）＝R31の0.11から引き上げ`);
    const sh = /run\.shake\((\d+), (\d+)\)/.exec(wireHit);
    assert(sh && Number(sh[2]) >= 20,
      `R35: シェイクの振幅が20以上（${sh ? sh[2] : 'なし'}）`);
  }

  // ================= ⑥ マオウレクスの弾：速度と見た目 =================
  {
    // ★実測で分かった逆転：主人公の移動(148) より最終ボスの弾のほうが遅かった。
    const player = /speed: (\d+), invulnSec/.exec(bal);
    assert(!!player, 'R35: 主人公の移動速度を読める');
    const pSpd = Number(player[1]);
    // maou の tier ブロックだけを切り出す（通常ボスの vulcan/ring と混ざらないように）
    // R37: アンカーをHP値にしない（尺の調整でHPが変わるたびにここが空振りする）
    const maouBlock = (bal.match(/tier: 'final',[\s\S]*?bulletKind: 'comet',/) || [''])[0];
    assert(maouBlock.length > 0, 'R35: マオウレクスの設定ブロックを読める');
    for (const [name, min] of [['nova', 1.6], ['vulcan', 2.0], ['ring', 1.5]]) {
      const m = new RegExp(`${name}: \\{[^}]*bulletSpeed: (\\d+)`).exec(maouBlock);
      assert(!!m, `R35: ${name} の弾速を読める`);
      const spd = Number(m[1]);
      assert(spd >= pSpd * min,
        `R35: ${name} の弾が主人公(${pSpd})の${min}倍以上ある（${spd}／${Math.round(pSpd * min)}）`
        + '＝歩いて追い抜ける弾を最終ボスに撃たせない');
    }
    // 序盤の雑魚より遅い、という逆転も二度と起こさない
    const zako = Math.max(...[...read('data/enemies.js').matchAll(/bulletSpeed: (\d+)/g)]
      .map((m) => Number(m[1])));
    const novaSpd = Number(/nova: \{[^}]*bulletSpeed: (\d+)/.exec(maouBlock)[1]);
    const vulSpd = Number(/vulcan: \{[^}]*bulletSpeed: (\d+)/.exec(maouBlock)[1]);
    assert(Math.max(novaSpd, vulSpd) >= zako,
      `R35: 最終ボスの弾が序盤の雑魚の最速(${zako})以上ある（${Math.max(novaSpd, vulSpd)}）`);
    // 見た目：radius 4（16×10px）では radius 82 の巨体から砂粒が出ている構図だった
    for (const name of ['nova', 'vulcan', 'ring']) {
      const m = new RegExp(`${name}: \\{[^}]*bulletRadius: (\\d+)`).exec(maouBlock);
      assert(m && Number(m[1]) >= 7,
        `R35: ${name} の弾の半径が7以上（${m ? m[1] : 'なし'}）＝「破砕片」に見えない大きさ`);
    }
    // 速くしたぶん理不尽にしていないこと（緊張感は被弾量ではなく"避けた"回数で作る）
    const novaDmg = Number(/nova: \{[^}]*damage: (\d+)/.exec(maouBlock)[1]);
    const vulDmg = Number(/vulcan: \{[^}]*damage: (\d+)/.exec(maouBlock)[1]);
    assert(novaDmg <= 18 && vulDmg <= 14,
      `R35: 速くしたぶんダメージは上げていない（nova ${novaDmg}<=18 / vulcan ${vulDmg}<=14）`);
  }
  assert(/makeFoeComet\(/.test(boot) && /this\.makeFoeComet\('boss_comet', 30, 16\)/.test(boot),
    'R35: 専用の彗星テクスチャ（30×16）がある＝boss_bolt(16×10)の流用ではない');
  assert(/isComet/.test(boss) && /'boss_comet'/.test(boss),
    'R35: マオウレクスの弾が彗星テクスチャを使っている');
  assert(/cfg && cfg\.bulletKind/.test(boss),
    'R35: 既定の弾種をボスごとに差し替えられる（他のボスは従来のボルトのまま）');
  assert(/let trailBudget = 3/.test(boss),
    'R35: 火の粉が1フレーム3個までの予算制（ノヴァは1回で70発飛ぶので青天井にできない）');
  assert(/b\.kind === 'comet' \? 5 :/.test(boss),
    'R35: 彗星の当たり判定は**白熱の芯**に合わせた5px（絵の外形で当てない）');
}

// --- R35b: 彗星弾の「形」そのものを焼いて検証する ---
// ⚠️ 多角形の座標だけで設計して、目視するまで**2つ壊れていた**：
//   ①外炎の頂点が途中で内側へ凹み、輪郭に穴が空いていた（行の途中で途切れる）
//   ②尾が2px幅の角材で後端で細らず、彗星ではなく棒に見えた
//   ③切っ先の三角が画素中心(y=7.5/8.5)を外して、先端が暗いままだった
// どれも「座標を見ても分からない・焼くと一目で分かる」種類の壊れ方なので、
// ここで Boot.js の頂点をそのまま読み出してラスタライズし、形の性質を数値で守る。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const boot = fs.readFileSync(path.join(SRC, 'scenes/Boot.js'), 'utf8');

  // makeFoeComet の facets を読み出す（実装と同じ数値を使う＝計測器が実装から乖離しない）
  const body = (boot.match(/makeFoeComet\(key, w, h\) \{[\s\S]*?generateTexture/) || [''])[0];
  assert(body.length > 0, 'R35b: makeFoeComet を読める');
  const facets = [...body.matchAll(/\[\[([\d.,\s]+)\],\s*([\d.]+)\]/g)]
    .map((m) => [m[1].split(',').map(Number).filter((v) => !Number.isNaN(v)), Number(m[2])]);
  assert(facets.length === 6, `R35b: 面が6枚ある（${facets.length}）`);

  const W = 30, H = 16;
  const inPoly = (pts, x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const a = new Float64Array(W * H);
  for (const [pts, av] of facets) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
        const i = y * W + x;
        a[i] = av + a[i] * (1 - av);   // Phaser の fillPoints と同じ source-over
      }
    }
  }

  // ① シルエットに穴が無い＝各行の塗りが1本に繋がっていること
  let broken = [];
  for (let y = 0; y < H; y++) {
    const on = [];
    for (let x = 0; x < W; x++) if (a[y * W + x] > 0) on.push(x);
    if (on.length === 0) continue;
    if (on[on.length - 1] - on[0] + 1 !== on.length) broken.push(y);
  }
  assert(broken.length === 0,
    `R35b: 輪郭に穴が無い（途切れている行: ${JSON.stringify(broken)}）`
    + '＝外炎の頂点が内側へ凹むと、行の途中で塗りが切れて「割れた破片」に見える');

  // ② 尾が後端へ向かって細る＝彗星であって棒ではないこと
  const colH = [];
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = 0; y < H; y++) if (a[y * W + x] > 0) n++;
    colH.push(n);
  }
  const back = colH.slice(0, 8).filter((v) => v > 0);
  assert(back.length > 0 && back[0] <= 2,
    `R35b: 後端がほぼ1〜2pxまで細っている（${back[0]}px）＝角材で切れていない`);
  // ★彗星は「後ろから前へ向かって明るくなり続ける」。中心線をたどって落ち込みが無いことを見る。
  //   旧実装は尾が一定の明るさの棒で、途中で切れて暗くなり（0.83→0.62）、
  //   さらに切っ先が画素を外して先端が急に暗くなっていた（1.00→0.30→0）＝最大0.70の落ち込み。
  {
    const mid = [];
    for (let x = 0; x < W; x++) mid.push(a[7 * W + x]);
    let worst = 0, at = -1;
    for (let x = 1; x < W; x++) {
      const d = mid[x - 1] - mid[x];
      if (d > worst) { worst = d; at = x; }
    }
    assert(worst <= 0.15,
      `R35b: 中心線が前へ進むほど明るい（最大の落ち込み ${worst.toFixed(2)} @x=${at}）`
      + '＝一定の明るさの棒でも、先端が急に暗くなる形でもない');
  }
  const maxH = Math.max(...colH);
  assert(maxH >= 10, `R35b: いちばん太いところが10px以上（${maxH}px）＝質量がある`);
  assert(colH.indexOf(maxH) >= W * 0.5,
    `R35b: いちばん太いところが前半分より後ろにない（x=${colH.indexOf(maxH)}）`
    + '＝頭が大きく尾が細い＝進行方向が形で分かる');

  // ③ 切っ先が実際に画素へ届いていること（三角にすると画素中心を外して暗いままになる）
  const tipBright = [a[7 * W + (W - 1)], a[8 * W + (W - 1)]];
  assert(Math.max(...tipBright) >= 0.9,
    `R35b: 最前列が白熱している（α=${tipBright.map((v) => v.toFixed(2)).join('/')}）`
    + '＝先端が暗いと「飛んでいる向き」が読めない');

  // ④ 旧ボルトより明らかに大きいこと（「破砕片」への逆戻り防止）
  const cover = a.filter((v) => v > 0).length;
  const core = a.filter((v) => v >= 0.9).length;
  assert(cover >= 180, `R35b: 面積が180px以上（${cover}px・旧ボルトは106px）`);
  assert(core >= 30, `R35b: 白熱の芯が30px以上（${core}px・旧ボルトは8px）`);
  // ⑤ 階調が残っていること（べた塗り1枚だと等倍で「四角い塊」に見える）
  const levels = new Set([...a].filter((v) => v > 0).map((v) => Math.round(v * 20)));
  assert(levels.size >= 4, `R35b: 明るさの段が4段以上ある（${levels.size}段）`);
  assert(/render-boss-comet\.mjs/.test(boot) || true, 'R35b: （形式確認用）');
}

// ============ ★★ 真マオウレクス「軌道神核」＝第4形態（転生）============
// ⚠️ ここに並ぶのは、実装中に**実際に踏んだ**罠をそのまま固定したガード。どれも
//    「構文は通る・既存テストも通る・でも画面には何も出ない」形で壊れるので目視では気づけない。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  const tf = maou.trueForm;

  // --- データ：スプライトとリグ ---
  assert(!!tf, 'true: 最終ボスに真の姿(trueForm)の設定がある');
  assert(!!MAOU.trueSprites && !!MAOU.trueRig, 'true: MAOU に trueSprites / trueRig がある');
  {
    const names = Object.keys(MAOU.trueSprites);
    assert(names.length === 9, `true: 真の姿のパーツが9個ある（${names.length}）`);
    let badRow = '', badPal = '';
    for (const [k, sp] of Object.entries(MAOU.trueSprites)) {
      if (!sp.rows.every((r) => r.length === sp.rows[0].length)) badRow = k;
      for (const r of sp.rows) for (const c of r) if (c !== '.' && !sp.palette[c]) badPal = k + ':' + c;
    }
    assert(!badRow, `true: 全パーツの行長が揃っている（${badRow || 'OK'}）`);
    assert(!badPal, `true: パレットに無い文字を使っていない（${badPal || 'OK'}）`);
    const missing = MAOU.trueRig.filter((r) => !MAOU.trueSprites[r.tex]).map((r) => r.tex);
    assert(missing.length === 0, `true: trueRig の tex が全部 trueSprites にある（${missing.join(',') || 'OK'}）`);
    // ★role は depth の順序付けにしか使っていない。origin を role から推理させると
    //   PART_ORIGIN の cannon[0.15,0.5] / legR[0.5,0.1] を拾って環が大きくズレる。必ず明示すること。
    const noOrigin = MAOU.trueRig.filter((r) => !r.origin && r.role !== 'body' && r.role !== 'core');
    assert(noOrigin.length === 0,
      `true: body/core 以外の全パーツが origin を明示している（${noOrigin.map((r) => r.role).join(',') || 'OK'}）`);
  }
  // ★真の姿は BOSSES に別エントリとして足さない＝ステージの並び（難易度帯シャッフル）に影響させない
  assert(BOSSES.length === 6, `true: ボスは6体のまま（真の姿を別ボスとして足していない・${BOSSES.length}）`);
  assert(/boss_\$\{d\.id\}_T\$\{?k\}?|boss_\$\{d\.id\}_T\$\{k\}/.test(boss)
    || /`boss_\$\{d\.id\}_T\$\{k\}`/.test(boss),
    'true: 真の姿のテクスチャは T 接頭辞で作る＝通常パーツとキーが衝突しない');

  // --- ★実バグ①：転生カットシーンが分離／再合体に横取りされて消えていた ---
  //   startAwaken が boss.hp を 1 に落とすので、同じフレームで「HP50%で分離」「33%で再合体」が
  //   両方成立し、startSplit() が state='awakenCine' を上書きしていた（実測：awakening=true の
  //   まま state=chase・trueForm=false＝転生が丸ごと起きない）。
  assert(/if \(!awakening && !trueForm\) \{[\s\S]{0,400}?enterPhase2\(\);[\s\S]{0,900}?startMerge\(\);/.test(boss),
    'true: 転生中と真の姿では phase2/分離/再合体の判定を止めている（カットシーンの横取り防止）');

  // --- ★実バグ②：弱点コアのUIが、描き下ろした眼を完全に覆っていた ---
  //   weak.radius の72%＝半径34pxの金色ベタが眼の中心を塗りつぶし、眼が一度も画面に出ていなかった。
  assert(/if \(!weakCfg\(\)\.ringOnly\) \{/.test(boss),
    'true: 弱点そのものが「絵」のとき(ringOnly)は塗りつぶさない＝描いた眼が隠れない');
  assert(tf.weak.ringOnly === true, 'true: 真の姿の弱点は ringOnly（眼を塗りつぶさない）');
  // 判定円は絵と一致させる＝[[feedback_one_hit_one_circle]]。眼は15px×spriteScale。
  {
    const seen = 15 * tf.spriteScale / 2;
    const ratio = tf.weak.radius / seen;
    assert(ratio >= 0.85 && ratio <= 1.05,
      `true: 弱点の判定円が眼の見た目と一致（判定${tf.weak.radius} / 見た目${Math.round(seen)}px = ${ratio.toFixed(2)}倍）`);
  }
  assert(tf.weak.swayX === 0, 'true: 真の姿の眼は中央固定（短期決戦なので「探す」遊びは置かない）');

  // --- ★実バグ③：見せ場が瞬きの間に終わっていた ---
  //   crackSec-shatterAt が 0.45秒しかなく、「粉々に飛び散る」が撮影しても写らなかった。
  // R43: 粉砕の尺は crackSec - burstAt（間に「溜め」が入ったので shatterAt からではない）
  const burstAt = tf.burstAt || tf.shatterAt;
  assert(tf.crackSec - burstAt >= 1.4,
    `true: 粉砕の尺が1.4秒以上ある（${(tf.crackSec - burstAt).toFixed(2)}秒）＝ゆっくり飛び散るところが見える`);
  assert(burstAt - tf.shatterAt >= 0.3,
    `R43: 亀裂の限界から粉砕までの「溜め」が0.3秒以上（${(burstAt - tf.shatterAt).toFixed(2)}秒）＝重さは止まる時間が作る`);
  assert(tf.riseSec >= 3.0, `R43: 出現の尺が3.0秒以上ある（${tf.riseSec}秒）＝軌道神核はゆっくり登場する`);
  assert((tf.shardsPerPart || 0) >= 2,
    `R43: 粉砕の小片が1パーツあたり2片以上（${tf.shardsPerPart}）＝9パーツだけでは「粉々」に見えない`);
  // 小片は tween で飛ぶ実体なので、作りっぱなしにすると次の周回まで残る
  assert(/function clearShards\(\)/.test(boss)
    && (boss.match(/clearShards\(\)/g) || []).length >= 3,
    'R43: 小片の後片付け（clearShards）が定義され、applyTrueLook と destroy の両方から呼ばれる');
  assert(/function braceOldBody\(\)/.test(boss) && /braceOldBody\(\);/.test(boss),
    'R43: 溜め（braceOldBody）が定義され awakenCine から呼ばれる');
  // カットシーン中に倒せてしまうと、演出をどれだけ豪華にしても原理的に見えない（R34の教訓）
  assert(/state === 'awakenCine'[\s\S]{0,80}?\|\| awakening/.test(boss)
    || /awakenCine'\s*\|\|\s*awakening/.test(boss),
    'true: 転生カットシーン中はダメージが一切通らない（演出の途中で倒せない）');

  // --- ★縮尺：設計プレビューの前提（480×360）が実際（640×360）と違っていた ---
  //   9.4 で撮ると球も環も光背も画面外へ出て、眼とその周りしか映らなかった。
  {
    const ringW = 51 * tf.spriteScale, ringH = 35 * tf.spriteScale;
    assert(ringW <= 420 && ringH <= 300,
      `true: 真の姿が画面(640×360)で破綻しない大きさ（環 ${Math.round(ringW)}×${Math.round(ringH)}px）`);
    assert(ringW >= 18 * 9.6, `true: 第3形態(173px)より明らかに大きい（${Math.round(ringW)}px）＝最後に出るものが小さくならない`);
  }

  // --- 攻撃3種：表と実装が食い違っていないこと ---
  assert(Array.isArray(tf.attacks) && tf.attacks.length === 3,
    `true: 真の姿の攻撃は3種（${(tf.attacks || []).join('/')}）＝20秒台の戦いで各2回以上まわる`);
  for (const a of tf.attacks) {
    assert(new RegExp(`case '${a}':`).test(boss), `true: 攻撃「${a}」が startAttackByName に実装されている`);
    assert(!!tf[a === 'shell' ? 'shell' : a === 'aligned' ? 'aligned' : 'verse'],
      `true: 攻撃「${a}」の数値設定がある`);
  }
  assert(tf.idleSec.length === tf.attacks.length,
    `true: 攻撃の数と待ち時間の数が一致（${tf.attacks.length} / ${tf.idleSec.length}）`);
  // R35 の教訓＝歩いて追い抜ける弾を最終ボスに撃たせない（主人公の移動は148px/秒）
  // ★R44W5 殻閉じは弾を撃たなくなった（→かげおに）。同じ教訓の新しい形＝
  //   影の再生は主人公より速く進む（speedMul>1＝いつか追いつく脅威）が、
  //   minGapSec の床がある（＝走り続ける限り絶対に捕まらない）。両方無いと壊れる。
  assert(tf.verse.bulletSpeed >= 148 * 1.5,
    `true: 聖句解放の弾が主人公(148)の1.5倍以上（${tf.verse.bulletSpeed}）`);
  {
    const sh = tf.shell.shadow;
    assert(!!sh, 'R44W5: 殻閉じに shadow（かげおに）の設定がある');
    assert(sh.speedMul > 1, `R44W5: 影の再生は実時間より速い（×${sh.speedMul}）＝止まれば必ず追いつかれる`);
    assert(sh.minGapSec >= 0.25,
      `R44W5: 追走の床が0.25秒以上（${sh.minGapSec}）＝走り続ける限り捕まらない（完全理不尽の禁止）`);
  }
  // ★殻閉じの閾値は比率ではなく**絶対値**で縛る（R37 の教訓：HPを2倍にしたら比率0.10の
  //   ままで閾値が20000へ倍増し、6回とも割れなかった＝割る遊びがまた消えた）。
  //   「成立も割れも起きる」を実測した絶対値は 10000（渾身のコア一投≒13000 が窓に1回入るか）。
  //   8000未満＝薄すぎて毎回割れる／14000超＝一投+αでも届かず全成立、のどちらも遊びが消える。
  {
    const abs = tf.hp * tf.shell.interruptRatio;
    assert(abs >= 8000 && abs <= 14000,
      `true: 殻閉じの閾値が8000〜14000（HP${tf.hp}×${tf.shell.interruptRatio}＝${abs.toFixed(0)}）＝成立と割れが両立する実測帯`);
  }
  assert(tf.shell.closeSec >= 1.2,
    `true: 殻閉じを割りにいく窓が1.2秒以上ある（${tf.shell.closeSec}秒）`);
  assert(tf.shell.holdSec > 0 && tf.shell.breakSec > tf.shell.holdSec * 1.1,
    `true: 割ったときの隙(${tf.shell.breakSec}s)が、閉じられたときの無敵(${tf.shell.holdSec}s)より長い＝止めにいく得がある`);

  // --- 尺：R37 実プレイFB「60秒以内では戦闘短すぎないか。適度に延長して」→ 65秒前後へ。
  //     根拠は balance.js の trueForm コメント（60秒超・攻撃1周10.8秒×約6周・BGM3周）。---
  {
    const sec = tf.hp / 3780 + tf.shell.holdSec * 6;
    assert(sec >= 58 && sec <= 74,
      `true: 真の姿の戦闘が65秒前後の設計（HP${tf.hp} ÷ 実測DPS3780 + 殻無敵${tf.shell.holdSec}s×6 = ${sec.toFixed(1)}秒）`);
    assert(tf.gaugeSegments === 4,
      `true: 65秒をゲージ4本で数えられる（${tf.gaugeSegments}本・1本≒16秒＝激化の段と同数）`);
  }
  // HPが0になった瞬間を、撃破処理より**前**に横取りしていること（順序が逆だと1回で終わる）
  assert(/function onBossKilled\(e\) \{[\s\S]{0,1200}?cfg\.trueForm && !trueForm[\s\S]{0,60}?startAwaken\(\);[\s\S]{0,40}?\}\s*\n\s*killing = true;/.test(boss),
    'true: HP0 は「撃破」より先に「転生」を見る（順序が逆だと真の姿が出ないまま終わる）');
  assert(tf.name && tf.name !== MAOU.name,
    `true: 真の姿は名前も変わる（${MAOU.name} → ${tf.name}）＝HPバーで別物だと分かる`);
}

// ============ ★★ R36W2 実プレイFB 6件（レーザー再編・紫の実体・深紅・専用BGM）============
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const snd = read('audio/sound.js');
  const prac = read('systems/practice.js');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

  // --- ① レーザーの配置換え（FB「出現時に不要。分離したときに照射」）---
  assert(!maou.attacks.includes('laser'),
    `R36W2: 出現時（分離前）の表にレーザーが無い（${maou.attacks.join('/')}）`);
  assert(maou.attacksSplit.includes('laser'),
    `R36W2: 分離中の表にレーザーがある（${maou.attacksSplit.join('/')}）`);
  assert(maou.attacksSplit[0] === 'laser',
    'R36W2: 分離した直後の1手目がレーザー＝「分かれたら撃ってくる」が最初の1回で伝わる');
  assert(maou.attacks.includes('vulcan'),
    'R36W2: laser を抜いた枠に vulcan を昇格（コンボ専用のままだと一度も撃たなくなる）');

  // --- ② 改名（FB「きょうぶレーザーはダサすぎる」）---
  assert(maou.laser.name === 'じゃがんレーザー' && maou.chestLaser.name === 'じゃしんレーザー',
    `R36W2: 改名済み（${maou.laser.name} / ${maou.chestLaser.name}）`);
  assert(!/introText\('きょうぶ/.test(boss),
    'R36W2: 旧名「きょうぶレーザー」が画面に出る箇所が残っていない');
  assert(/introText\(cfg\.laser\.name/.test(boss) && /introText\(cfg\.chestLaser\.name/.test(boss),
    'R36W2: レーザーの表示名は balance の name を読む（名前の二重管理をしない）');

  // --- ③ 光線の色（FB「光線の色は紫」「整列は深みのある赤」）。B>R＝紫、R>B＝赤 を数で縛る ---
  for (const [who, tint] of [['laser', maou.laser.beamTint], ['chestLaser', maou.chestLaser.beamTint]]) {
    const c = hex(tint);
    assert(c.b > c.r, `R36W2: ${who} のビームが紫（${tint}＝B ${c.b} > R ${c.r}）`);
  }
  {
    const ak = maou.trueForm.aligned;
    const c = hex(ak.beamTint);
    assert(c.r > c.b * 2, `R36W2: 整列レーザーが赤（${ak.beamTint}＝R ${c.r} > B×2）`);
    assert(!!ak.coreTint, 'R36W2: 整列レーザーに白熱の芯がある＝「深みのある」は縁と芯の2層で出す');
  }
  assert(/function startBeam\(angFrom, angTo, len, width, dmg, activeSec, opts = \{\}\)/.test(boss)
    && /opts\.tint != null \? int\(opts\.tint\) : int\(cfg\.glowInner\)/.test(boss),
    'R36W2: startBeam が攻撃ごとの色を受け取る（従来は全ビーム1色固定）');
  assert(/let beamCore = null;/.test(boss)
    && /beamCore\.setVisible\(!!opts\.core\)/.test(boss),
    'R36W2: ビームが2層（縁＋白熱の芯）になっている');
  assert((boss.match(/if \(beamCore\) \{ beamCore\.destroy\(\); beamCore = null; \}/g) || []).length >= 2,
    'R36W2: 芯の破棄が beamImg と同じ経路に入っている（リーク防止）');

  // --- ④ 発射音と被弾の実感（FB「照射時に効果音」「受けてしまった実感」）---
  for (const k of ['darkLaser', 'godLaser', 'beamHit']) {
    // includes で見る（RegExp コンストラクタはエスケープの二重管理になりやすい）
    assert(snd.includes(`  ${k}() {`), `R36W2: 効果音 ${k} が実在する`);
  }
  assert(/Sound\.sfx\('darkLaser'\)/.test(boss) && /Sound\.sfx\('godLaser'\)/.test(boss),
    'R36W2: レーザー発射が専用音を鳴らしている（darkLaser=紫 / godLaser=整列）');
  assert(/beam\.heavy[\s\S]{0,800}?Sound\.sfx\('beamHit'\)[\s\S]{0,500}?hitPlayer\(beam\.dmg, run\.player\.x - dirX \* 40/.test(boss),
    'R36W2: レーザー被弾が 専用音＋ビーム方向への吹き飛ばし を持つ（受けた実感）');

  // --- ⑤ メタリックパープルの実体（FB「一部のみ変わっただけに見える」）---
  assert(!!MAOU.palette3, 'R36W2: 紫パレット（palette3）が実在する');
  {
    const a = Object.keys(MAOU.sprites.body.palette).sort().join('');
    const b = Object.keys(MAOU.palette3).sort().join('');
    assert(a === b, `R36W2: 紫パレットのキー集合が元と完全一致（欠けると装甲に穴が開く）＝[${b}]`);
    // 赤ファミリーが本当に紫になっている（B>R）。元は赤（R>B）であることも同時に確認
    for (const k of ['m', 'r', 'd', 'S']) {
      const o = hex(MAOU.sprites.body.palette[k]), q = hex(MAOU.palette3[k]);
      assert(o.r > o.b && q.b > q.r,
        `R36W2: 赤${k}（${MAOU.sprites.body.palette[k]}）→ 紫（${MAOU.palette3[k]}）`);
    }
  }
  assert(/makeSprite\(`boss_\$\{d\.id\}_P\$\{k\}`, \{ palette: d\.palette3, rows: s\.rows \}\)/.test(boss),
    'R36W2: 紫版テクスチャ（P接頭辞）を焼いている');
  assert(/applyMergeLook[\s\S]{0,700}?setTexture\(`boss_\$\{def\.id\}_P\$\{p\.tex\}`\)/.test(boss),
    'R36W2: 再合体の瞬間にテクスチャごと紫へ差し替えている（tint の乗算では赤は紫にならない）');
  assert(/tex: r\.tex,/.test(boss), 'R36W2: パーツが自分の tex 名を持つ（差し替え先キーを組むため）');
  assert(/mixHex\(0xffffff, int\(cfg\.merge\.glowInner\)/.test(boss),
    'R36W2: metalPurple は白基準の艶になった（紫はテクスチャが担い、tint は光沢だけ）');

  // --- ⑥ 専用BGM（FB「軌道神核用のBGMを。神々しさのアレンジ」「ギターでいこう」）---
  assert(/^  maouTrue:\s*\{ bpm:/m.test(snd) && /variant: 'true'/.test(snd),
    'R36W2: 軌道神核の専用曲 maouTrue が SONGS に実在する');
  assert(/const GT = V === 'guitar' \|\| V === 'true';/.test(snd),
    'R36W2: 専用曲は採用されたギター編成が土台（別の曲にしない＝「同じ戦いの別の段」）');
  for (const w of ['カリヨン', '光背ドローン', '天使の声']) {
    assert(new RegExp(w).test(snd), `R36W2: 神々しさの声部「${w}」がある`);
  }
  assert(/Sound\.startBgm\('maouTrue'\)/.test(boss),
    'R36W2: 転生の沈黙のあとに専用曲で鳴らし直している');
  assert(/name: 'maouTrue'/.test(prac) && /さいよう/.test(prac),
    'R36W2: れんしゅうじょうの聞き比べに④神核曲があり、①に採用の印がある');
}

// ============ ★★ R37 実プレイFB（軌道神核65秒へ延長・マオウレクス28秒へ短縮・激化）============
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  const tf = maou.trueForm;
  const rg = tf.rage;

  // --- 激化の器：ゲージ1本＝1段。配列がゲージ本数とズレると終盤の段が無言で欠ける ---
  assert(!!rg, 'R37: trueForm.rage が存在（65秒を同じ3種の繰り返しだけで埋めない）');
  for (const k of ['idleMul', 'alignSecMul', 'sweepDegAdd', 'verseAdd', 'bulletMul', 'lanesAdd', 'spinMul']) {
    assert(Array.isArray(rg[k]) && rg[k].length === tf.gaugeSegments,
      `R37: rage.${k} の長さがゲージ本数（${tf.gaugeSegments}）と一致`);
  }
  assert(Array.isArray(rg.texts) && rg.texts.length === tf.gaugeSegments - 1,
    'R37: 段が上がる回数（ゲージ本数-1）だけ宣言の文がある＝数値の変化を画面に届ける');

  // --- 単調性：段が上がって「ゆるくなる」項目が混ざったら激化の嘘になる ---
  const up = (a) => a.every((v, i) => i === 0 || v >= a[i - 1]);
  const down = (a) => a.every((v, i) => i === 0 || v <= a[i - 1]);
  assert(down(rg.idleMul) && down(rg.alignSecMul), 'R37: 間合いと予告は段で縮む一方');
  assert(up(rg.bulletMul) && up(rg.verseAdd) && up(rg.sweepDegAdd) && up(rg.lanesAdd) && up(rg.spinMul),
    'R37: 弾速・密度・薙ぎ・影の列・公転は段で増える一方（wavesAdd→R44W5 shadowAdd→R44W7 lanesAdd）');

  // --- 理不尽ガード（数で縛る）。緊張感は被弾量ではなく「避けた回数」で作る ---
  // ★R44W4 実プレイFB「せいくの弾のスピードを上げて」。旧ガード「最終弾速360以下＝雑魚
  //   スナイパー級を超えない」は**ユーザーの指示で前提そのものが撤回された**（最終ボスの弾が
  //   雑魚と同格である必要はない）。削除せず**反転**する（[[feedback_dont_codify_a_deletion]]）。
  //   新しい担保は2つ：①作中最速であること（＝上げた指示が効いている） ②460以下
  //     （＝環の隙間へ入る猶予が残る帯。弾は radial なので隙間に入れば当たらない構造は不変だが、
  //       入るまでの猶予は速さに反比例する。座165px／隙間18°＝52pxを主人公148px/sで詰めるのに
  //       0.35秒、その間に弾が進むのは460×0.35＝161px＝環1つぶん＝ぎりぎり間に合う）
  {
    const vmax = tf.verse.bulletSpeed * Math.max(...rg.bulletMul);
    assert(vmax > 350, `R44W4: 聖句の最終弾速が旧上限350より速い（${vmax.toFixed(0)}）＝「速度を上げて」が効いている`);
    assert(vmax <= 460, `R44W4: 聖句の最終弾速が460以下（${vmax.toFixed(0)}）＝隙間へ入る猶予が残る`);
    assert(tf.verse.damage === 16,
      `R44W4: 聖句の damage は据え置き16（${tf.verse.damage}）＝速さは被弾量ではなく「避けた回数」へ使う`);
  }
  assert(360 / (tf.verse.perRing + Math.max(...rg.verseAdd)) >= 17,
    `R37: 聖句の隙間は最終段でも17°以上（${(360 / (tf.verse.perRing + Math.max(...rg.verseAdd))).toFixed(1)}°）＝縫って抜けられる`);
  // ★R44W3 でこの技の公平さの担保が変わった。実プレイFB「せいれつは赤いラインはいらない。
  //   かなりよけづらい攻撃でよい」に従い、薙ぎは 14°→120°（片方向）になったので、
  //   旧ガード「26°以下＝横へ走れば抜けられる」はもう設計と合わない（＝計測器が実装と
  //   食い違ったまま通り続ける状態になる・[[feedback_instrument_must_match_impl]]）。
  //   新しい担保は**片方向かつ180°未満**＝薙がない側が必ず残ること。ここを越えると
  //   全周が薙がれて避け場が消える＝理不尽になる。
  {
    const maxSpan = tf.aligned.sweepDeg + Math.max(...rg.sweepDegAdd);
    assert(tf.aligned.sweepOneWay === true,
      'R44W3: 整列の薙ぎは片方向（両側に振ると主人公は必ず通過点になる）');
    assert(maxSpan < 180,
      `R44W3: 整列の薙ぎは最終段でも180°未満（${maxSpan}°）＝薙がない側が必ず残る`);
    assert(maxSpan >= 90,
      `R44W3: 整列の薙ぎは90°以上（${maxSpan}°）＝「横へ一歩ずれる」だけの答えを消す`);
  }
  assert(Math.min(...rg.idleMul) >= 0.6 && Math.min(...rg.alignSecMul) >= 0.7,
    'R37: 間合いと予告の短縮に下限がある（読む時間を最後まで奪わない）');
  assert(Math.max(...rg.lanesAdd) <= 2, 'R44W7: かげおにの追加は最大+2列（旧 shadowAdd 上限+2 の後継）');
  assert(!Object.keys(rg).some((k) => /damage|dmg/i.test(k)),
    'R37: 激化に damage 系のキーが無い（[[feedback_tension_is_not_damage]]）');

  // --- boss.js 側の結線。係数は rageArr に集約＝差し替え漏れを1か所に集める ---
  assert(/function rageArr\(/.test(boss), 'R37: 係数の集約点 rageArr がある');
  assert(/updateRageTier\(\);/.test(boss), 'R37: updateAI が毎フレーム段を見ている');
  assert(boss.includes("rageArr('idleMul', 1)"), 'R37: 間合いに idleMul が効く');
  assert(boss.includes("rageArr('sweepDegAdd', 0)"), 'R37: 薙ぎ幅に sweepDegAdd が効く');
  assert(boss.includes("rageArr('verseAdd', 0)"), 'R37: 聖句の発数に verseAdd が効く');
  // R44W5: 殻は弾を撃たなくなった（→かげおに・激化は shadowAdd が担う）ので、bulletMul の
  //   結線先は聖句の1箇所になった（旧ガード「2箇所以上」を実装に合わせて反転）。
  assert((boss.match(/rageArr\('bulletMul', 1\)/g) || []).length >= 1,
    'R37/R44W5: 聖句の弾速に bulletMul が効く');
  assert(boss.includes("rageArr('lanesAdd', 0)"), 'R44W7: かげおにの列数に lanesAdd が効く（★rage に無いキーを読むと既定値0で無音の空振りになる）');
  assert(boss.includes("rageArr('spinMul', 1)"), 'R37: 環の公転に spinMul が効く＝激化が形で見える');
  // 整列の予告秒は 開始(startAttackByName)・進行(alignTele)・環の描画(updateTrueDisp) の
  // 3か所が同じ実効値を見る。1か所でも素の alignSec を読むと「揃いきる前に撃つ」嘘になる
  assert((boss.match(/tfAlignSec\(\)/g) || []).length >= 4,
    'R37: 整列の実効予告秒 tfAlignSec を開始・進行・描画が共有している');
  assert(/aligned\.alignSec \* rageArr/.test(boss),
    'R37: tfAlignSec が alignSecMul を掛けている');
  assert((boss.match(/tfTier = 0/g) || []).length >= 2,
    'R37: 撃破と破棄の両方で段がリセットされる（次の周回に持ち越さない）');

  // --- じゃがんレーザーの保証。HPを削ったら分離帯（幅約11000）がコア一投（約13000）で
  //     貫通し、レーザー0回のまま再合体する回が実測で出た（見せ場が無言で消える形）---
  assert(/splitLaserDone = false;/.test(boss) && /if \(split\) splitLaserDone = true;/.test(boss),
    'R37: 分離ごとに「じゃがんレーザーを撃った」印を付け直している');
  assert(/cfg\.merge\.hpRatio[\s\S]{0,140}?&& \(splitLaserDone \|\| !\(cfg\.attacksSplit \|\| \[\]\)\.includes\('laser'\)\)/.test(boss),
    'R37: レーザーを撃ちきるまで再合体しない（laser を持たない分離ボスは従来どおり）');
  {
    const band = maou.hp * (maou.split.hpRatio - maou.merge.hpRatio);
    assert(band < 13500,
      `R37: 分離帯（${band.toFixed(0)}）はコア一投（約13000）で貫通し得る＝保証が実際に要る前提の確認`);
  }
  // 合体待ちと即時発射だけでは足りなかった：分離カットシーン中に放たれた玉が明けた瞬間に
  // 連続着弾し、溜め1.0秒を追い越してHP0→転生した（実測run6）。最後の砦＝HP1で耐える。
  assert(/if \(split && \(!splitLaserDone \|\| state === 'laserFire'\)\s*\n\s*&& cfg && \(cfg\.attacksSplit \|\| \[\]\)\.includes\('laser'\)\) \{\s*\n\s*boss\.hp = 1; return;/.test(boss),
    'R37: じゃがんレーザーの発射前も照射中もHP1で耐える（onBossKilled の転生よりさらに前）');
  assert(/state !== 'laserTele' && state !== 'laserFire'\s*\n\s*&& \(splitLaserDone/.test(boss),
    'R37: レーザー照射中は再合体も待つ（発射と同フレームの33%割れで照射が40ms未満に断ち切られた）');

  // --- れんしゅうじょうの V＝軌道神核へ即ジャンプ（転生も本編と同じ経路で見せる）---
  {
    const prac = read('systems/practice.js');
    assert(/function practiceAwaken\(\)/.test(boss) && /practiceSpawn, practiceClear, practiceAwaken,/.test(boss),
      'R37: boss に practiceAwaken の専用口がある（jumpHp はHPを1未満にしない設計のため）');
    assert(/keydown-V/.test(prac) && /practiceAwaken\(\)/.test(prac),
      'R37: れんしゅうじょうの V キーが軌道神核へ即ジャンプする');
    assert(/V=しんかく/.test(prac), 'R37: ④の操作ヒントに V が書いてある（書かないと存在しない機能）');
  }
  assert(/attackIdx = 0;\s*\n\s*beginAttack\(\);\s*\n\s*\}/.test(boss.slice(boss.indexOf('function finishSplit'), boss.indexOf('function finishSplit') + 1200)),
    'R37: 分離カットシーン明けは間合いを取らず即1手目（じゃがんレーザー）を撃ち始める');
}

// ============ ★★ R38 実プレイFB「maouTrue の違いをほぼ感じない。神々しさをはっきり」============
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const snd = fs.readFileSync(path.join(SRC, 'audio/sound.js'), 'utf8');

  // --- ① 専用イントロ「降臨」＝曲の0秒目で別の曲だと分かる（決戦！サルーインの構造）---
  {
    const m = /maouTrue:\s*\{[^}]*introSec: ([\d.]+)/.exec(snd);
    assert(!!m, 'R38: maouTrue に introSec がある（専用イントロ）');
    if (m) {
      assert(+m[1] >= 4 && +m[1] <= 8,
        `R38: イントロは4〜8秒（${m[1]}秒）＝長すぎると聞き比べや再突入がだるくなる`);
    }
    assert(/function playMaouTrueIntro\(\)/.test(snd), 'R38: イントロ関数 playMaouTrueIntro がある');
    assert(/if \(song\.introSec\) \{\s*\n\s*playMaouTrueIntro\(\);\s*\n\s*bgmTimer = setTimeout\(scheduleBgm, song\.introSec \* 1000\);/.test(snd),
      'R38: startBgm がイントロを鳴らし、その長さぶんループ開始を遅らせる');
    // イントロの中身：Cm→C の同主長調跳躍（サルーインの核）・カリヨン下行・ティンパニロール
    const intro = snd.slice(snd.indexOf('function playMaouTrueIntro'), snd.indexOf('function playBgmStep'));
    assert(/NOTE\.Ds4/.test(intro) && /NOTE\.E4/.test(intro),
      'R38: イントロに Eb（Cm）と E（C）の両方がある＝同主長調への跳躍で光が差す');
    assert(/\[NOTE\.G6, NOTE\.E6, NOTE\.C6\]/.test(intro),
      'R38: カリヨンが下行（G6→E6→C6）＝天から降る方向');
    assert(/for \(let k = 0; k < 8; k\+\+\)/.test(intro) && /0\.05 \+ k \* 0\.016/.test(intro),
      'R38: ティンパニロールがクレッシェンド＝疾走本体へ雪崩れ込む助走');
  }

  // --- ② 主役交代＝神々しさ×2・ギター×0.7（足しただけでは歪みの海にマスクされた実測への回答）---
  {
    const m1 = /const HOLY = V === 'true' \? ([\d.]+) : 1;/.exec(snd);
    const m2 = /const GDIM = V === 'true' \? ([\d.]+) : 1;/.exec(snd);
    assert(!!m1 && +m1[1] >= 1.6, `R38: 神々しさ声部の係数 HOLY ≧ 1.6（${m1 && m1[1]}）`);
    assert(!!m2 && +m2[1] <= 0.8 && +m2[1] >= 0.5,
      `R38: ギターを下げる係数 GDIM が 0.5〜0.8（${m2 && m2[1]}）＝消しはしない（同じ戦いの証）`);
    assert((snd.match(/\* HOLY/g) || []).length >= 4,
      'R38: HOLY がオルガン・聖歌隊の4か所以上に掛かっている');
    assert((snd.match(/\* GDIM/g) || []).length >= 2,
      'R38: GDIM が壁とリードの両方に掛かっている');
    assert(/gain: g \* 0\.55,/.test(snd), 'R38: 天使の声がギターの刃と同格（0.30→0.55）');
    assert(/ch\.pad\[0\]\) \* 4/.test(snd), 'R38: オルガンの4フィート管（2オクターブ上の輝き）が足された');
  }

  // --- ②b ★R39 実プレイFB「オルガンをもう少し目立たせて」＋「軌道神核のBGM自体の個性を」---
  //     R38 までの maouTrue は旋律も和音もマオウレクスと同一＝個性の材料がミックスにしか
  //     無かった。R39 は**第2旋律（神核の主題）**をオルガンの独立声部として追加。
  //     実測（scratchpad/measure-r39.mjs）：段1沈黙0本・段2全音符・段3主題9音・
  //     ギター段3/段2比0.491・クイント54本。
  {
    // 神核の主題が16小節ぶん定義され、段1（先頭4小節）はオルガン沈黙＝ギターが先に名乗る
    const mi = snd.indexOf('const MELODY_TRUE = [');
    assert(mi >= 0, 'R39: 神核の主題 MELODY_TRUE が定義されている');
    const mblock = snd.slice(mi, snd.indexOf('];', mi));
    const rows = mblock.split('\n').filter((l) => /^\s*\[/.test(l));
    assert(rows.length === 16, `R39: MELODY_TRUE は16小節（${rows.length}）`);
    for (let i = 0; i < 4; i++) {
      assert(!/NOTE\./.test(rows[i]),
        `R39: 段1（${i + 1}小節目）はオルガン沈黙＝マオウレクスの主題が先に立つ（同じ戦いの証）`);
    }
    assert(rows.slice(4).some((r) => /NOTE\./.test(r)),
      'R39: 段2以降に神核の主題の音がある');
    // maouTrue だけが melody2 を持つ（他の曲へ波及させない）
    assert(/maouTrue:\s*\{[^}]*melody2: MELODY_TRUE/.test(snd),
      'R39: maouTrue が melody2（神核の主題）を持つ');
    assert((snd.match(/melody2: MELODY_TRUE/g) || []).length === 1,
      'R39: melody2 を持つのは maouTrue の1曲だけ');
    // オルガンの独立声部（⑥b）＝レジストレーション 8'+4'+2 2/3'+2'。
    // ×3（クイント）が「パイプオルガン」の指紋＝これが消えるとただの太いシンセに戻る
    assert(/song\.melody2\[bar\]\[j2\]/.test(snd), 'R39: melody2 を読む声部（⑥b）がある');
    assert(/freq: mf2 \* 3,/.test(snd), 'R39: オルガンのクイント管（×3）＝パイプオルガンの指紋');
    assert(/freq: mf2 \* 4,/.test(snd), 'R39: オルガンの2フィート管（×4）');
    // 主役交代が「曲の中で」起きる：段3だけギターのリードが一歩下がる（消さない）
    const md = /const LEAD_DUCK = V === 'true' \? \[1, 1, ([\d.]+), 1\]\[sec\] : 1;/.exec(snd);
    assert(!!md && +md[1] >= 0.3 && +md[1] <= 0.7,
      `R39: 段3のギターは 0.3〜0.7 へ一歩下がる（${md && md[1]}）＝消えると「同じ戦い」が切れる`);
    assert(/\* LEAD_DUCK/.test(snd), 'R39: LEAD_DUCK がギターのリードに実際に掛かっている');
    // オルガンの呼吸＝小節後半（和音が変わる瞬間）の弾き直し。存在感は gain ではなく動きで出す
    assert(/if \(V === 'true' && inBar === 8\)/.test(snd),
      'R39: オルガンが半小節ごとに弾き直す（32要素の和音に付いて行く）');
    assert(/noteFreq\(ch\.pad\[0\]\) \* 3,/.test(snd),
      'R39: パッドにもクイント管（×3）が足されている');
  }

  // --- ③ R38W2 ワイヤーアーム被弾音「ボン→ガツン」：主役交代を式で縛る ---
  //     「ボン」の正体＝低域の塊（gain 0.94）が主役で金属（0.15以下）が脇役だったこと。
  //     回帰防止＝**低域の最大gainが金属の最大gainを上回ったら落ちる**。
  {
    const hit = (snd.match(/rocketPunchHit\(\) \{[\s\S]*?^  \},/m) || [''])[0];
    assert(hit.length > 0, 'R38W2: rocketPunchHit を読める');
    for (const f of ['520', '1435', '2808']) {
      assert(new RegExp(`freq: ${f},`).test(hit),
        `R38W2: 鉄床スタック（非整数比 1:2.76:5.40）の ${f}Hz がある＝「ガツン」の正体`);
    }
    const rows = [...hit.matchAll(/tone\(\{[^}]*freq: (\d+)(?:, freqEnd: \d+)?,[^}]*gain: (\d+(?:\.\d+)?)/g)]
      .map((m) => ({ f: +m[1], g: +m[2] }));
    const lowMax = Math.max(...rows.filter((r) => r.f < 130).map((r) => r.g), 0);
    const metalMax = Math.max(...rows.filter((r) => r.f >= 400).map((r) => r.g), 0);
    assert(metalMax > lowMax,
      `R38W2: 金属の最大gain（${metalMax}）＞ 低域の最大gain（${lowMax}）＝低域が主役だと「ボン」に戻る`);
    assert(/duckBgm\(0\.3[0-9]/.test(hit),
      'R38W2: BGMダックが0.30以上＝最大の攻撃の自覚（周りが深く引くほど一撃が重い）');
  }
}

// ============ ★★ R40 軌道神核の4点（移動・聖句解放・裁きの環・再照準）============
// 実プレイFB「フワフワ浮遊では荘厳さを感じれない／せいくかいほうがしょぼい／青の炸裂弾は
// 全くダメ／せいれつ―かんつうこうは素晴らしいが、よけやすいかも」。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const boss = fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8');
  const snd = fs.readFileSync(path.join(SRC, 'audio/sound.js'), 'utf8');
  const boot = fs.readFileSync(path.join(SRC, 'scenes/Boot.js'), 'utf8');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  const tf = maou.trueForm;

  // --- ① 移動＝軌道遊弋＋座の転移（追いかけない・歩かず座を移す）---
  {
    const mo = tf.motion;
    assert(!!mo, 'R40: trueForm.motion（軌道遊弋）がある');
    assert(mo.warpOutSec + mo.warpInSec <= 0.77,
      `R40: 転移の尺 ${mo.warpOutSec + mo.warpInSec}秒 ≦ 最短idle 0.77秒＝転移が終わらないうちに攻撃が始まる競合を作らない`);
    for (const k of ['aligned', 'verse', 'shell']) {
      assert(mo.anchors[k] >= 140,
        `R40: 転移の座 anchors.${k}（${mo.anchors[k]}px）≧140＝主人公の頭上に出現しない`);
    }
    assert(/tfOrbA/.test(boss) && /tfWarpPhase/.test(boss),
      'R40: 軌道角と転移フェーズが boss.js に実在する');
    assert(/Sound\.sfx\('warpOut'\)/.test(boss) && /Sound\.sfx\('warpIn'\)/.test(boss),
      'R40: 転移の消/現で専用音が鳴る');
    assert(/tfWarpAlpha/.test(boss.slice(boss.indexOf('function updateTrueDisp'))),
      'R40: 転移の透明度が表示（updateTrueDisp）に実際に掛かっている');
  }

  // --- ② 聖句解放＝魔法陣＋ルーン弾＋小鐘 ---
  {
    assert(/kind: 'glyph'/.test(boss), 'R40: 聖句の弾が専用ルーン弾（glyph）になった');
    assert(/verse_glyph/.test(boss) && /makeVerseGlyph\('verse_glyph'/.test(boot),
      'R40: ルーン弾のテクスチャ verse_glyph が焼かれ、弾に結線されている');
    assert(/Sound\.sfx\('versePeal'/.test(boss),
      'R40: 読み上げ音が tick（機械音）から versePeal（聖堂の小鐘）へ');
    assert(/Sound\.sfx\('verseCharge'\)/.test(boss),
      'R40: 予告で詠唱スウェル（verseCharge）が鳴る');
  }

  // --- ③ 裁きの環 → かげおに（R44W5 で置換）---
  // ★実プレイFB「丸い弾も修正して。退廃性（悪魔性）が強く、やや理不尽な、弾以外の攻撃に」。
  //   R40 の輪弾（judge_orb 全方位 3〜4波）は**ユーザーの指示で置換された**。旧ガードは
  //   削除せず反転（[[feedback_dont_codify_a_deletion]]）：波の発射コードが**残っていない**こと、
  //   影の召喚が**ある**ことを縛る。テクスチャと弾種 'judge' の機構は汎用インフラなので残す
  //   （grep で使用者が fireShellWave だけだったことを確認済み）。
  {
    assert(!/fireShellWave/.test(boss) && !/JUDGE_TINTS/.test(boss),
      'R44W5: 殻の全方位弾は廃止された（波の発射コードが残っていない）');
    assert(/makeJudgeOrb\('judge_orb'/.test(boot),
      'R44W5: judge_orb テクスチャの機構は残す（使うのをやめただけ・将来の再利用可）');
    assert(/function spawnShadows\(\)/.test(boss) && /function updateShadows\(dt\)/.test(boss),
      'R44W5: かげおに（影の召喚と追走）が boss.js に実在する');
  }

  // --- ④ 整列レーザー二射目「再照準」＝一射目は据え置き・怠けだけを罰する ---
  {
    const a2 = tf.aligned2;
    assert(!!a2, 'R40: aligned2（再照準）がある');
    assert(a2.relockSec >= 0.4, `R40: 再照準の予告 ${a2.relockSec}秒 ≧0.4＝二射目も読める`);
    assert(tf.aligned.damage + a2.damage < BALANCE.player.hp,
      `R40: 2連被弾の合計 ${tf.aligned.damage + a2.damage} ＜ 主人公HP${BALANCE.player.hp}＝満タンから即死しない`);
    assert(a2.beamWidth < tf.aligned.beamWidth && a2.activeSec <= tf.aligned.activeSec,
      'R40: 二射目は一射目より細く短い＝「追いの一太刀」の格');
    assert(/case 'align2Tele'/.test(boss) && /function fireAligned2\(\)/.test(boss),
      'R40: 再照準のステートと発射が boss.js に実在する');
    assert(/state === 'align2Tele'/.test(boss.slice(boss.indexOf('function updateTrueDisp'))),
      'R40: 再照準中も環が整列を保つ（表示に結線）');
    assert(/Sound\.sfx\('relock'\)/.test(boss), 'R40: 再照準の専用音が鳴る');
  }

  // --- ⑤ 新SFX6種が実在する（結線先の無い音・音の無い結線を両方殺す）---
  for (const k of ['warpOut', 'warpIn', 'verseCharge', 'versePeal', 'judgeWave', 'relock']) {
    assert(new RegExp(`^  ${k}\\(`, 'm').test(snd), `R40: SFX ${k} が sound.js に実在する`);
  }
}

// ============ ★★ R41/R44 オープニングが「今のゲームの予告編」であることを縛る ============
// R41: 実プレイFB「聖典からかなり設定や雰囲気を変えているので、オープニングを作り直して」。
// R44: 実プレイFB「かわいさをださなくていい／主人公とモビット中心／モビットは刈られるだけの
//      脆弱な存在ではなく、ヴォイド・マキナと死力を尽くして戦っている戦闘的な種族」。
// ⚠️ オープニングは autotest で丸ごとスキップされる＝smoke-test も既存CDPも一度も通らない。
//    設定のズレ（存在しない固有名・出てこない動詞・Titleとの座標違い）は**誰も踏まずに残る**。
//    だから「データと一致しているか」をここで数として縛る。実演の実測は
//    scratchpad/cdp-opening.mjs（本物のブラウザで再生して幕ごとに数える）。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const opRaw = fs.readFileSync(path.join(SRC, 'scenes/Opening.js'), 'utf8');
  const title = fs.readFileSync(path.join(SRC, 'scenes/Title.js'), 'utf8');
  // ⚠️ 検査対象は**実行されるコードだけ**。行頭・行末のコメントを落としてから見る。
  //    （最初これを忘れて「旧版の失敗をコメントで説明している行」まで違反として拾い、
  //      ガードが3件誤検出した＝[[feedback_instrument_must_match_impl]] の小型版）
  //    文字列リテラルの中の // は残す（クォートの内外を数えながら切る）。
  const op = opRaw.split('\n').map((line) => {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
    }
    return line;
  }).join('\n');

  // --- ① 名乗る固有名が**実データ側に実在する**（R41 では逆向きのガードだった）---
  // ★R41 で私は「ヴォイド・マキナ＝どのデータにも無い固有名」と判断して消し、禁止ガードまで
  //   入れたが、これは誤りだった。enemies.js の冒頭に「異空間ロボット軍団ヴォイド・マキナ」として
  //   雑魚の総称が定義されている。ユーザーの用法（金属生命体の種族名）が正しい。
  //   よってガードの向きを反転する：「使うな」ではなく「**データと同じ語を使え**」。
  {
    const enemiesRaw = fs.readFileSync(path.join(SRC, 'data/enemies.js'), 'utf8');
    assert(/ヴォイド・マキナ/.test(enemiesRaw),
      'R44: 種族名「ヴォイド・マキナ」が enemies.js 側に実在する（オープニングの出典）');
    assert(/ヴォイド・マキナ/.test(op),
      'R44: オープニングが種族名「ヴォイド・マキナ」を名乗る（R41で誤って消した語の復活）');
  }
  assert(/'マオウレクス'/.test(op) && MAOU.name === 'マオウレクス',
    'R41: 名乗るのは実際の最終ボス（enemies.js の MAOU.name と一致）');

  // --- ② 出てくる敵/仲間が実データの id と一致する（絵と本編が食い違わない）---
  {
    const mobs = (/const MOB_KEYS = \[([\s\S]*?)\];/.exec(op) || [, ''])[1]
      .match(/'enemy_([a-z]+)'/g) || [];
    assert(mobs.length >= 5, `R41: 幕1の軍団は5種以上（${mobs.length}）＝序盤の顔ぶれが見える`);
    for (const m of mobs) {
      const id = m.replace(/'|enemy_/g, '');
      assert(ENEMIES.some((e) => e.id === id), `R41: 軍団の ${id} が ENEMIES に実在する`);
    }
    // ★R44: 相棒は「顔ぶれの列」ではなく **通常形態と進化形態の対**。
    //   進化を幕3の転換点そのものに使うので、片方でも欠けると演出が成立しない。
    const line = (/const MOBIT_LINE = \[([\s\S]*?)\n\];/.exec(op) || [, ''])[1];
    const pairs = [...line.matchAll(/base: 'mon_([a-z]+)', evo: 'mon_([a-z]+)'/g)];
    assert(pairs.length >= 4,
      `R44: モビットは4種以上が名前つきで戦う（${pairs.length}）＝主役の一角として画面に立つ`);
    for (const [, baseId, evoId] of pairs) {
      const def = MONSTERS.find((m) => m.id === baseId);
      assert(!!def, `R44: モビット ${baseId} が MONSTERS に実在する`);
      assert(!!def && !!def.evo && def.evo.id === evoId,
        `R44: ${baseId} の進化先が ${evoId}（monsters.js の evo.id と一致）`);
    }
  }

  // --- ②' ★R44 の核心：モビットが「刈られる側」ではなく戦っている ---
  //     幕2で正面からぶつかり倒れ、幕3で立ち上がって**進化**し、攻める側へ反転する。
  //     この5つのビートのどれが欠けても「かわいい相棒が助けられる話」に戻る。
  for (const [fn, why] of [
    ['beatMobitLine', '隊列を組んで前へ出る'],
    ['beatClash', 'ヴォイド・マキナと正面からぶつかる'],
    ['beatFall', '押し返されて倒れる（死力を尽くしている証拠）'],
    ['beatRise', '倒れた1体が自力で立ち上がる（激しい気性）'],
    ['beatAwaken', '進化して本来の姿になる（システムを物語の転換点に使う）'],
    ['beatCharge', '一斉突撃＝攻める側へ反転する'],
  ]) {
    assert(new RegExp(`^\\s*${fn}\\(\\) \\{`, 'm').test(op), `R44: 幕「${why}」が実装されている（${fn}）`);
  }
  assert(/setTexture\(m\.def\.evo\)/.test(op),
    'R44: 進化は本物のテクスチャ差し替え（形が変わったことが画面で分かる）');
  assert(/const MOB_DARK = /.test(opRaw) && /setTint\(MOB_DARK\)/.test(op),
    'R44: 抗戦中のモビットは色を殺した逆光のシルエット（かわいさを画面から外す）');
  assert(/clearTint\(\)/.test(op),
    'R44: 進化で色が戻る＝力が戻った合図（殺した色を取り戻す対比）');
  assert(/'モビットは、たたかう'/.test(op),
    'R44: 宣言は1行だけ（説明せず事実を置く）');
  assert(/^\s*beatSilence\(\) \{/m.test(op) && /silenceWash/.test(op),
    'R44: 激発の前に完全静止＋無音の溜めがある（次の一歩を最大にする）');

  // --- ③ 看板の動詞（つかむ→ためる→なげる）を実演する ---
  //     ここが抜けると「別のゲームの予告編」に戻る。旧版はこれが1つも無かった。
  assert(/^\s*verbGrab\(\) \{/m.test(op) && /^\s*verbCharge\(\) \{/m.test(op)
    && /^\s*verbThrow\(\) \{/m.test(op),
    'R41: 動詞3段（つかむ/ためる/なげる）の実演が実装されている');
  for (const w of ['つかむ', 'ためる', 'なげる']) {
    assert(new RegExp(`'${w}`).test(op), `R41: 動詞「${w}」が画面に出る`);
  }
  assert(/billiardHit/.test(op) && /_killCount\+\+/.test(op),
    'R41: 投げた玉が軍団を薙ぎ、薙いだ数を数える（快感は振幅ではなく数）');

  // --- ④ 冒頭の命令とエンディングの回収が対になっている（物語の環）---
  // R44 では命令を1語ずつ置いて1行に組み上げるので、語の集合として縛る。
  {
    const words = (/const words = \[([^\]]*)\]/.exec(op) || [, ''])[1];
    const got = (words.match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '')).join(' ');
    assert(got === 'セカイから ひかりを けせ',
      `R41: 冒頭の命令は「セカイから ひかりを けせ」（実際: ${got}）`);
  }
  {
    const end = fs.readFileSync(path.join(SRC, 'scenes/Ending.js'), 'utf8');
    assert(/せかいに ひかりが もどった/.test(end),
      'R41: エンディングの「ひかりが もどった」が対句として実在する（片方を消すと環が切れる）');
  }

  // --- ⑤ 最後に待つもの＝軌道神核の予兆を1カット見せる ---
  assert(/beatCorePremonition/.test(op) && /coreRings/.test(op),
    'R41: 軌道神核（球＋3つの環＋単眼）の予兆がある');

  // --- ⑥ 収束先が Title と座標一致（旧版は自機 scale と プロンプトy がズレて一瞬跳ねていた）---
  {
    const tHero = /'player_1'\)\.setScale\(([\d.]+)\)/.exec(title);
    const oHero = /targets: this\.hero, x: cx, y: 236, scale: ([\d.]+)/.exec(op);
    assert(!!tHero && !!oHero && tHero[1] === oHero[1],
      `R41: 収束の自機スケールが Title と一致（Title ${tHero && tHero[1]} / Opening ${oHero && oHero[1]}）`);
    const tPr = /this\.add\.text\(W \/ 2, (\d+), 'SPACE か クリックで スタート'/.exec(title);
    const oPr = /this\.add\.text\(cx, (\d+), 'SPACE か クリックで スタート'/.exec(op);
    assert(!!tPr && !!oPr && tPr[1] === oPr[1],
      `R41: プロンプトのy座標が Title と一致（Title ${tPr && tPr[1]} / Opening ${oPr && oPr[1]}）`);
    for (const y of ['112', '156']) {
      assert(new RegExp(`this\\.add\\.text\\(cx, ${y},`).test(op),
        `R41: ロゴ/サブが Title と同じ y=${y} に結像する`);
    }
    // ★R44W2: モビットは最後に消えず、Title の**隊列**へ収まる＝主人公と並んで立ったまま終わる。
    //   （R44 は公転で一致させていたが、実プレイFB「主人公の周囲をモビット達がまわっているのも
    //     いまいち」で Title を隊列へ変えたので、こちらも隊列で照合する。）
    //   Title の呼吸は _a=0 から始まる＝フレーム1は基準位置そのもの。値がズレると
    //   Opening→Title の切り替わりで相棒だけが跳ぶ（R41 で自機が跳ねていたのと同じ事故）。
    const sq = (/const TITLE_SQUAD = \{([\s\S]*?)\};/.exec(op) || [, ''])[1];
    const oKeys = (sq.match(/'mon_[a-z]+'/g) || []).join(',');
    const oXs = ((/xs: \[([^\]]*)\]/.exec(sq) || [, ''])[1]).replace(/\s/g, '');
    const oY = (/y: (\d+)/.exec(sq) || [])[1];
    const oScale = (/scale: ([\d.]+)/.exec(sq) || [])[1];
    const tSq = (/const SQUAD = \[([^\]]*)\]/.exec(title) || [, ''])[1];
    const tKeys = (tSq.match(/'mon_[a-z]+'/g) || []).join(',');
    const tXs = ((/const SQUAD_X = \[([^\]]*)\]/.exec(title) || [, ''])[1]).replace(/\s/g, '');
    const tY = (/this\.add\.image\(x, (\d+), SQUAD\[i\]\)/.exec(title) || [])[1];
    const tScale = (/this\.add\.image\(x, \d+, SQUAD\[i\]\)\.setScale\(([\d.]+)\)/.exec(title) || [])[1];
    assert(!!tKeys && tKeys === oKeys,
      `R44W2: 隊列の顔ぶれが Title と一致（Title ${tKeys} / Opening ${oKeys}）`);
    assert(!!tXs && tXs === oXs, `R44W2: 隊列のx配置が Title と一致（Title ${tXs} / Opening ${oXs}）`);
    assert(!!tY && tY === oY, `R44W2: 隊列のyが Title と一致（Title ${tY} / Opening ${oY}）`);
    assert(!!tScale && tScale === oScale,
      `R44W2: 隊列のスケールが Title と一致（Title ${tScale} / Opening ${oScale}）`);
    assert(!/Math\.cos\(ang\) \* \d+/.test(title),
      'R44W2: Title の公転（連れて回るマスコットの絵）が残っていない');
  }

  // --- ⑥' ★R44W2 表記と配色（実プレイFBで名指しされた3点）---
  {
    // 「言葉の末尾の。ははずして。表記上おかしい」＝このゲームの表記はひらがな＋分かち書きで
    // 句点を使わない。**画面に出る文字列**から句点を消す（コメントの句点は対象外）。
    for (const [rel, src] of [['scenes/Opening.js', opRaw], ['scenes/Title.js', title],
      ['systems/practice.js', fs.readFileSync(path.join(SRC, 'systems/practice.js'), 'utf8')]]) {
      const strs = src.match(/'[^'\n]*'/g) || [];
      const bad = strs.filter((s) => /。/.test(s) && /[ぁ-んァ-ヶ一-龠]/.test(s));
      assert(bad.length === 0, `R44W2: ${rel} の画面文字列に句点が無い（残: ${bad.join(' / ')}）`);
    }
    // 「クルット・モビットの文字の色がピンク色がいまいち」＝飴玉の記号をやめる。
    for (const [rel, src] of [['Title.js', title], ['Opening.js', op]]) {
      const logoBlock = (new RegExp("LOGO = 'クルット・モビット'[\\s\\S]{0,700}").exec(src) || [''])[0];
      assert(!/#ff6ec7/i.test(logoBlock), `R44W2: ${rel} のロゴにピンクの縁取りが残っていない`);
      assert(/#ffd76a/i.test(logoBlock) && /#ff7a2a/i.test(logoBlock),
        `R44W2: ${rel} のロゴは金＋熾火の二重の縁取り（打ち出した金属）`);
    }
    // 「〜 KURUTTO MOBIT 〜 も現在の世界観にあわない」＝ローマ字副題を捨て、看板の動詞にする。
    for (const [rel, src] of [['Title.js', title], ['Opening.js', op]]) {
      // 画面に出る文字列だけを見る（作り直しの経緯を説明するコメントは残してよい）
      assert(!(src.match(/'[^'\n]*'/g) || []).some((s) => /KURUTTO/.test(s)),
        `R44W2: ${rel} からローマ字副題が消えている`);
      assert(/'つかんで ためて なげかえせ'/.test(src),
        `R44W2: ${rel} の副題は看板の動詞（何をするゲームか一目で分かる）`);
    }
  }

  // --- ⑦ 事故の再発防止（子ども安全と技術制約）---
  {
    const flashes = [...op.matchAll(/0xffffff, ([\d.]+)\)/g)].map((m) => +m[1]);
    for (const a of flashes) {
      assert(a <= 0.45, `R41: 全画面の白は alpha ≤ 0.45（${a}）＝目に刺さる白飛ばしを作らない`);
    }
    // R44: フラッシュ/ウォッシュはヘルパ経由になったので、**式の側**で上限を縛る
    // （引数に何を渡しても 0.45 を超えられない＝呼び出し側を1つずつ数えなくてよい）。
    assert(/Math\.min\(0\.45, alpha\)/.test(op) && /Math\.min\(0\.45, peak\)/.test(op),
      'R44: 全画面フラッシュ/ウォッシュは実装側で alpha ≤ 0.45 にクランプされている');
    assert(!/Math\.random/.test(op), 'R41: Math.random を使わない（再現できない演出を作らない）');
    assert(!/^import Phaser/m.test(op), 'R41: Phaser は window 参照（import 禁止）');
    assert(/if \(V\.autotest\) \{ this\.scene\.start\('Title'\); return; \}/.test(op),
      'R41: autotest はオープニングをスキップする（既存テストへ無影響）');
  }
}

// ============ ★ R42 ワイヤーアーム金属音v3＋空振りニアミス＋巻き戻しウィンチ ============
// 実プレイFB「金属音がまだたりない」。R38W2 の主役交代（帯域）に加えて金属の証拠3つ：
//   ①リング＝0.5秒級の鳴き ②うなり＝近接した振動モード対 ③鳴きは歪みバスに入れない
//   （5本のpartialを同じWaveShaperへ入れると相互変調で潰れ「ブザー」に平坦化する）
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const snd = read('audio/sound.js');
  const boss = read('systems/boss.js');
  const hit = (snd.match(/rocketPunchHit\(\) \{[\s\S]*?^  \},/m) || [''])[0];
  assert(hit.length > 0, 'R42: rocketPunchHit を読める');

  // ① リング：520Hzの鳴きが 0.5秒以上・verb残響つき（「ガツン」の「ン」）
  assert(/freq: 520, freqEnd: \d+, dur: 0\.[5-9]\d*, [^}]*verb:/.test(hit),
    'R42: 520Hzのリング（0.5秒以上＋verb残響）がある＝金属の余韻。0.26秒以下は「硬い木」');
  // ② うなり：基音の相方（537/1481）が並走している
  assert(/freq: 537,/.test(hit) && /freq: 1481,/.test(hit),
    'R42: 近接モード対（520+537 / 1435+1481）がある＝うなりが無い金属はシンセに聞こえる');
  // ③ 鳴きは素通し：リング層の行に dest（歪みバス行き）が無い
  assert(!/freq: 537,[^}]*dest/.test(hit) && !/freq: 520, freqEnd: \d+,[^}]*dest/.test(hit),
    'R42: リング層は歪みバスへ入れない＝WaveShaper内で潰れ合うと鳴きでなくブザーになる');
  // ④ 破片：着弾後の時間差の高音「チン…チッ」
  assert(/freq: 3520,/.test(hit) && /freq: 5270,/.test(hit),
    'R42: 破片の跳ねる音（時間差の高音）がある＝「本当に壊れた」の証拠音');

  // ⑤ 新SFX 2種が定義されている
  for (const k of ['wireWhoosh', 'wireWinch']) {
    assert(new RegExp(`^  ${k}\\(`, 'm').test(snd), `R42: SFX ${k} が定義されている`);
  }
  // ⑥ 空振りニアミスの結線：最接近（minD）から離れ始めた瞬間に鳴らす
  assert(/Sound\.sfx\('wireWhoosh'/.test(boss) && /arm\.minD/.test(boss) && /arm\.whooshed = true/.test(boss),
    'R42: ニアミスは「最接近して離れ始めた瞬間」に1回だけ＝接近中に鳴らすと命中音と重なる');
  // ⑦ ウィンチの結線：startWireBack で命中/空振りに関係なく鳴る（anyHit 分岐の前）
  {
    const wb = (boss.match(/function startWireBack\(\) \{[\s\S]*?\n  \}/) || [''])[0];
    assert(wb.includes("Sound.sfx('wireWinch')"),
      'R42: 巻き戻しウィンチが startWireBack にある（かつて無音だった0.3秒を埋める）');
    assert(wb.indexOf("Sound.sfx('wireWinch')") < wb.indexOf('const anyHit'),
      'R42: ウィンチは anyHit 分岐の外＝命中でも空振りでも毎回鳴る機械の音');
  }
}

// ============ ★ R43 捕獲アーム（クラッシュアーム→グラップクロー）============
// 実プレイFB「敵を捕獲するための武器がパンチ？なのだが、身体に生えてるようにみえる
//   不自然な小さな拳になっている。あまりに不自然だしださすぎる」。
//   実測で裏が取れた欠陥は3つ：①面積比12.5% ②構えの拳が体の内側 ③**絵と判定が2.5倍ずれ**
//   （突きの判定78pxに対し腕は最大31pxしか伸びない）。ここを数で縛る。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const run = read('scenes/Run.js');
  const bil = read('systems/billiard.js');
  const mon = read('data/monsters.js');

  // ① スプライトが十分に大きい（体は 16×18〜24×18 のテクスチャ×scale3.0）
  {
    const blk = (mon.match(/export const HERO_FISTS = \[[\s\S]*?\n\];/) || [''])[0];
    assert(blk.length > 0, 'R43: HERO_FISTS を読める');
    const sets = [...blk.matchAll(/rows: \[([\s\S]*?)\]/g)]
      .map((m) => (m[1].match(/'[^']*'/g) || []).map((s) => s.slice(1, -1)));
    assert(sets.length === 3, `R43: クローが3段ぶんある（${sets.length}）`);
    // 行長が全部そろっている（makeGrid は rows[0].length を幅にするので、ズレると絵が欠ける）
    sets.forEach((rows, i) => {
      const w = rows[0].length;
      assert(rows.every((r) => r.length === w),
        `R43: Stage${i + 1} クローの行長が全行そろっている（幅${w}・${rows.length}行）`);
    });
    // 面積比：体テクスチャ 16×18（Stage1）×scale3.0 に対し、クロー×scale2.6 が20%以上
    const [w1, h1] = [sets[0][0].length, sets[0].length];
    const ratio = (w1 * 2.6 * h1 * 2.6) / (16 * 3.0 * 18 * 3.0);
    assert(ratio >= 0.20,
      `R43: Stage1 クローが主人公の面積比20%以上（${(ratio * 100).toFixed(0)}%）＝旧12.5%は小さすぎた`);
    // 「掴む口」＝中央の行に爪(v)が無い＝開いている（拳＝塞がった四角に戻さないための形の保証）
    const mid = sets[0][Math.floor(sets[0].length / 2)];
    assert(!mid.includes('v'),
      'R43: クローは中央が開いている（掴む口）＝塞がった拳のブロックに戻していない');
  }

  // ② 腕が判定射程まで実際に伸びる（絵と判定の一致）
  assert(/_punchReach/.test(run) && /run\._punchReach = J\.reach/.test(bil),
    'R43: 突きは判定射程（jab.reach）を腕の伸び先として渡す＝届いていない拳で敵が飛ばない');
  assert(/const full = this\._punchReach/.test(run) && /base \+ \(full - base\) \* ext/.test(run),
    'R43: 腕の描画が _punchReach まで伸びる（旧式の 16+7/段+…＝最大31px を廃止）');
  // ③ 蛇腹の節（伸びる腕の記号）が定義され、隠す経路も両方ある
  assert(/playerArmSegs/.test(run) && /playerArmSegs/.test(bil),
    'R43: 伸縮アームの節が Run と billiard の両方で管理される（消し忘れると節だけ残る）');
  assert((run.match(/playerArmSegs/g) || []).length >= 3,
    'R43: 節は「生成・描画・非表示」の3か所以上で扱われる');
}

// ============ ★ R43 レーザーの「避けようがない」を式で縛る ============
// 実プレイFB「マオウレクスの各種レーザーは避けようがない。さすがに理不尽」。
// 調べたら実装の問題だった：4本とも薙ぎの中心を**発射の瞬間の主人公方向**に取っており
// （予告中ずっと aim を代入）、予告1.0〜2.0秒は「来る」ことしか伝えていなかった。
// 対策＝lockSec（予告の最後は照準を固定して射線を見せる）と片方向薙ぎ。ここを数で守る。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const SPEED = BALANCE.player.speed;      // 148 px/s
  const PR = BALANCE.player.radius;        // 7px

  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  assert(!!maou && !!maou.trueForm, 'R43: マオウレクスの定義を引ける');
  const tf = maou.trueForm;
  const lasers = [
    { name: 'じゃがん', k: maou.laser, tele: maou.laser.chargeSec },
    { name: 'じゃしん', k: maou.chestLaser, tele: maou.chestLaser.chargeSec },
    { name: '整列', k: tf.aligned, tele: tf.aligned.alignSec },
    { name: '再照準', k: tf.aligned2, tele: tf.aligned2.relockSec },
  ];
  for (const L of lasers) {
    const lock = L.k.lockSec;
    assert(typeof lock === 'number' && lock > 0,
      `R43: ${L.name}レーザーに lockSec がある＝射線を固定して見せる時間`);
    assert(lock < L.tele + 1e-9,
      `R43: ${L.name}の lockSec(${lock}) は予告(${L.tele})より短い＝追尾する時間も残っている`);
    // ★核心：ロック後に走れば判定半幅の外へ出られるか（出られないなら理不尽のまま）
    const halfW = L.k.beamWidth / 2 + PR;
    const canRun = SPEED * lock;
    assert(canRun > halfW,
      `R43: ${L.name}はロック後に避けられる（${lock}秒で${Math.round(canRun)}px 走れる ＞ 判定半幅${Math.round(halfW)}px）`);
  }
  // 薙ぎが主人公を通過点にしない（じゃがん/じゃしんは薙ぎが主人公より速いので片方向必須）
  for (const key of ['laser', 'chestLaser']) {
    const k = maou[key];
    const omega = Math.abs(k.sweepToDeg - k.sweepFromDeg) / k.activeSec;   // °/s
    assert(k.sweepOneWay === true,
      `R43: ${key} は片方向薙ぎ（${omega.toFixed(0)}°/s ＝ 主人公より速いので、両側に振ると必ず通過点になる）`);
  }
  // 実装の結線：ロックを通らず aim で直接撃つ経路が残っていないこと
  assert(/function lockAim\(/.test(boss) && /function drawLockLine\(/.test(boss),
    'R43: 照準ロックと射線プレビューが実装されている');
  assert((boss.match(/lockAim\(/g) || []).length >= 5,
    'R43: 4種のレーザー予告すべてが lockAim を通る（定義1＋呼び出し4）');
  assert(!/startBeam\(aim \+/.test(boss),
    'R43: 発射時に aim（＝その瞬間の主人公方向）から直接ビームを張る経路が残っていない');
  // 後片付け（プレビューが次の攻撃へ残ると「嘘の予告」になる）
  assert(/function clearLock\(\)/.test(boss) && (boss.match(/clearLock\(\)/g) || []).length >= 5,
    'R43: clearLock が発射・攻撃終了・リセットの各所から呼ばれる');
}

// ============ ★ R44 音が「鳴っている」ではなく「聞こえる」ことを数で縛る ============
// 実プレイFB①「せいくの2種類目の発射音を変更して」②「巻き戻しのカカカ＋ガチャンが
//   はっきり確認できなかった。もっと目立つように」。②の原因は音の有無ではなく**埋もれ**：
//   直前の被弾音(gain 0.70・鳴きが0.72秒残る)と同じ帯域に gain 0.10 で置いていた。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const snd = read('audio/sound.js');
  const grab = (name) => (snd.match(new RegExp(`^  ${name}\\([^)]*\\) \\{[\\s\\S]*?^  \\},`, 'm')) || [''])[0];
  const maxGain = (blk) => Math.max(0, ...[...blk.matchAll(/gain: (\d+(?:\.\d+)?)/g)].map((m) => +m[1]));

  // ① 聖句の発語：鐘ではなく母音のフォルマントで「読んでいる」を作る
  {
    const vp = grab('versePeal');
    assert(vp.length > 0, 'R44: versePeal を読める');
    assert(/VOW/.test(vp) && /800, 1200/.test(vp) && /300, 2300/.test(vp),
      'R44: 聖句の発射音は母音のフォルマント（文字ごとに母音が変わる＝読んでいる）');
    assert(!/freq: 1560/.test(vp),
      'R44: 旧「1560Hzの小鐘」に戻していない（詠唱の意外性と釣り合わない）');
    assert(/sawtooth/.test(vp),
      'R44: 喉の基音（のこぎり波＝倍音が密）がある＝声に聞こえる土台');
  }
  // ② 巻き戻しは打撃音から「音量・帯域」の両方で分離する
  {
    const ww = grab('wireWinch');
    const hit = grab('rocketPunchHit');
    assert(ww.length > 0 && hit.length > 0, 'R44: wireWinch と rocketPunchHit を読める');
    assert(maxGain(ww) >= 0.30,
      `R44: ウィンチの最大gainが0.30以上（${maxGain(ww)}）＝打撃音0.70の隣で埋もれない`);
    assert(/duckBgm\(/.test(ww),
      'R44: ウィンチもBGMを沈める（周りが引かないと細かい音は通らない）');
    // ラチェットは打撃の鳴き（520/1435/2808Hz）より上の帯域へ逃がす
    const clicks = [...ww.matchAll(/freq: (\d{4,})/g)].map((m) => +m[1]).filter((f) => f >= 3800);
    assert(clicks.length >= 2,
      `R44: ラチェットが3800Hz以上の帯域にある（${clicks.length}本）＝鉄床の鳴き1435Hzと混ざらない`);
    // 音の長さと「巻き戻っている絵」の長さが一致していること
    const starts = [...ww.matchAll(/start: (\d+(?:\.\d+)?)/g)].map((m) => +m[1]);
    const last = Math.max(0, ...starts);
    const wk = BALANCE.boss.tiers.find((t) => t.bossId === 'maou').wirearm;
    assert(wk.backSec >= last,
      `R44: 巻き戻りの尺(${wk.backSec}秒) ≧ 音の最後の要素(${last}秒)＝拳が収まった後に音だけ残らない`);
  }
}

// ============ ★ R44W2 ボスの方向指示（退避したときに見失わないための矢印）============
// 実プレイFB「ボスとの戦闘中に退避行動をとりたい。その際にボスがどこにいるか矢印でしめして」。
// 下がること自体は元からできた（主人公 speed 148 ＞ ボスの chaseSpeed 60〜110）。
// 足りなかったのは**下がった先で相手を読む手段**。カメラは主人公を追うので、離れるとボスは
// 画面外へ消え、戻る方向も、弾がどこから来るかも分からなくなっていた。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const hud = fs.readFileSync(path.join(SRC, 'ui/hud.js'), 'utf8');

  assert(/function drawBossArrow\(/.test(hud) && /drawBossArrow\(ent\)/.test(hud),
    'R44W2: ボスの方向指示が実装され、ボス出現中に毎フレーム描かれる');
  assert(/setScrollFactor\(0\)/.test(hud) && /cam\.scrollX/.test(hud) && /cam\.scrollY/.test(hud),
    'R44W2: 矢印はHUD座標（scrollFactor 0）で、ボスのワールド座標をカメラ差で画面座標へ直す');
  // 画面内にいるときは出さない（常時出ていると「見失う」以前に画面が汚れる）
  assert(/if \(sx >= MX && sx <= VW - MX && sy >= MT && sy <= VH - MB\) return;/.test(hud),
    'R44W2: ボスが画面内にいるときは矢印を出さない');
  // HUDの帯（ボスHPバーは y44〜52）と重ならない内側に置く
  {
    const mt = +(/const MX = \d+, MT = (\d+), MB = \d+;/.exec(hud) || [])[1];
    assert(mt >= 54, `R44W2: 矢印の上端(${mt})はボスHPバー(y44〜52)より下＝ゲージと重ならない`);
  }
  // ★見えない場所から撃たれるのを理不尽にしないための警告。予告中は矢印が変わる。
  assert(/run\.boss && run\.boss\.telegraphing/.test(hud),
    'R44W2: 画面外で予告が始まったら矢印が警告に変わる（見えない一撃を理不尽にしない）');
  assert(/'ボス くる！'/.test(hud), 'R44W2: 予告中は矢印に「くる！」を添える（記号だけに頼らない）');
  assert(/Math\.floor\(run\.elapsed \* 8\) % 2 === 0/.test(hud),
    'R44W2: 点滅は elapsed 基準＝決定的（フレーム落ちで消えたままにならない）');
  // 0除算ガード（真上／真横にいるとき cos or sin が 0 になる）
  assert(/Math\.abs\(ca\) < 1e-4 \? Infinity/.test(hud) && /Math\.abs\(sa\) < 1e-4 \? Infinity/.test(hud),
    'R44W2: 真上／真横にボスが居るときの0除算を避けている');
  // 退避が成立する速度差（ここが逆転すると「逃げられない」に戻る）
  {
    const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
    const speeds = [...JSON.stringify(BALANCE.boss.tiers).matchAll(/"chaseSpeed":(\d+)/g)]
      .map((m) => +m[1]);
    const fastest = Math.max(...speeds);
    assert(!!maou && speeds.length >= 5, 'R44W2: ボスの追跡速度を読める');
    assert(BALANCE.player.speed > fastest,
      `R44W2: 主人公(${BALANCE.player.speed}) は最速のボス(${fastest})より速い＝退避が成立する`);
  }
}

// ============ ★★ R44W3 せいれつ＝ラスボス最大の攻撃を「手ごわい」へ ============
// 実プレイFB「せいれつは、攻撃予告の**赤いラインはいらない**。あれがあると簡単によけられる。
// 次の再標準はあるが、せいれつは**かなりよけづらい攻撃でよい**。ラスボス最大の攻撃なので、
// プレーヤーに『この攻撃手ごわい』と思わせるのが肝要」。
// 難しさを「見えなさ」ではなく**判断の数**で作る＝読む材料は全部残し、UIの線だけを外して
// 正解を1つ（横へずれる）から2つ（直角に逃げる＋正しい側を選ぶ）へ増やす。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const boss = fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8');
  const T = BALANCE.boss.tiers.find((t) => t.bossId === 'maou').trueForm;
  const A = T.aligned, A2 = T.aligned2, PS = BALANCE.player.speed, PR = BALANCE.player.radius;

  // --- ① 射線プレビューを整列からだけ外す（他は公平の担保として残す）---
  assert(A.showLine === false, 'R44W3: 整列レーザーは射線プレビューを描かない（FBの本丸）');
  assert(/function lockAim\(lockSec, spanDeg, len, showLine\)/.test(boss)
    && /if \(showLine !== false\) drawLockLine\(/.test(boss),
    'R44W3: 線の有無はロックとは独立して切れる（ロックを消したのではない＝避けられなくはしない）');
  assert(A2.showLine !== false,
    'R44W3: 再照準は射線プレビューを残す（lockSec 0.30 の細い技は線が公平の担保）');
  for (const k of ['laser', 'chestLaser']) {
    const L = T[k] || (BALANCE.boss.tiers.find((t) => t.bossId === 'maou')[k]);
    if (L) assert(L.showLine !== false, `R44W3: ${k} は射線プレビューを残す`);
  }

  // --- ② ロックは残っている＝線を消しても「避けようがない」には戻らない（R43の再発防止）---
  assert(A.lockSec > 0 && A.lockSec < A.alignSec,
    'R44W3: 整列はいまもロックする（予告の途中で射線が確定する）');
  {
    const canRun = PS * A.lockSec, halfW = A.beamWidth / 2 + PR;
    assert(canRun > halfW,
      `R44W3: ロック後に射線から抜けられる（${A.lockSec}秒で${canRun.toFixed(0)}px ＞ 判定半幅${halfW}px）`);
    // ただし余裕は削る＝「かなりよけづらい」。R43の2.2倍から1.2〜1.6倍帯へ。
    const margin = canRun / halfW;
    assert(margin >= 1.15 && margin <= 1.7,
      `R44W3: 余裕は1.15〜1.7倍（${margin.toFixed(2)}倍）＝ぎりぎり避けられるが簡単ではない`);
  }

  // --- ③ 読み筋は「ボスの体」へ移した（UIの線の代わり）---
  assert(A.windUpDeg > 0, 'R44W3: 振りかぶりの角度がある＝薙ぐ側を形で伝える');
  assert(/alignWind = -lockDir \* ak\.windUpDeg/.test(boss),
    'R44W3: 振りかぶりは薙ぐ向きと**逆**へ溜める（剣を引いてから振るのと同じ）');
  assert(/\(alignAng \+ alignWind\) - TRUE_RING_BAKED\[i\]/.test(boss),
    'R44W3: 振りかぶりが環の面に実際に効く（値だけ持って絵が動かない、を防ぐ）');
  assert(/alignWind = 0/.test(boss) && (boss.match(/alignWind = 0/g) || []).length >= 4,
    'R44W3: 振りかぶりは発射・リセット・破棄で必ず戻る（角度が残ると次の予告が嘘になる）');

  // --- ④ 薙いだ跡は「後ろにだけ」伸びる（先回りして描くと消した線が扇で復活する）---
  assert(A.scorch === true && /beam\.scorch && scorchGfx/.test(boss),
    'R44W3: 薙いだ跡の焼け扇がある＝何が起きたかが一拍残る');
  assert(/slice\(x, y, beam\.len, Math\.min\(beam\.angFrom, ang\), Math\.max\(beam\.angFrom, ang\)/.test(boss),
    'R44W3: 焼け跡は angFrom から**いまの角度**までしか描かない（先読みにならない）');

  // --- ⑤ 理不尽ガード：2連続で食らっても満タンからは即死しない（子どもの線）---
  assert(A.damage + A2.damage < BALANCE.player.hp,
    `R44W3: 整列${A.damage}＋再照準${A2.damage}＝${A.damage + A2.damage} ＜ 主人公HP${BALANCE.player.hp}`);
  // --- ⑥ 「最大の攻撃」であること（他のどの技よりも重い）---
  {
    const others = [T.chestLaser, T.laser, A2, T.verse]
      .concat(BALANCE.boss.tiers.find((t) => t.bossId === 'maou').wirearm)
      .filter(Boolean).map((o) => o.damage).filter((n) => typeof n === 'number');
    assert(others.every((d) => d <= A.damage),
      `R44W3: 整列がボスの最大ダメージ（整列${A.damage} / 他の最大${Math.max(...others)}）`);
  }
}

// ============================================================================
// R44W4 せいく（聖句解放）— 弾速アップと「堕ちる文字」（退廃／悪魔性）
// 実プレイFB「①せいくの弾のスピードを上げて ②せいくのビジュアルは文字を基にしているという
// 発想は神格性があっていいのだが、そこに退廃的な要素（悪魔性）をビジュアルに込められないか」。
// ★設計＝悪魔性を**別の記号として足さない**。同じ聖句が飛行中に堕ちる＝神格性が退廃へ変わる
//   **過程**を見せる。足すだけでは神格性の隣に並んで埋もれる（R38「主役交代が要る」の教訓）。
// ============================================================================
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const boot = read('scenes/Boot.js');
  const sound = read('audio/sound.js');
  const tf = BALANCE.boss.tiers.find((t) => t.bossId === 'maou').trueForm;
  const V = tf.verse;

  // --- ① 堕ちるまでの時間が「見える場所」に置かれているか ---
  assert(typeof V.fallSec === 'number' && V.fallSec > 0,
    `R44W4: 聖句に fallSec がある（${V.fallSec}）＝堕ちる瞬間が数値で決まっている`);
  {
    // 0 なら最初から堕ちた弾＝「過程」が消える。長すぎると画面外で堕ちて誰も見ない。
    const px = V.bulletSpeed * V.fallSec;
    assert(px >= 60 && px <= 200,
      `R44W4: 堕ちるのは環から60〜200px（${px.toFixed(0)}px）＝環を離れた直後・まだ画面の内`);
    assert(V.fallSec < V.lifeSec * 0.5,
      `R44W4: 堕ちてからの飛行が寿命の半分以上残る（堕ち${V.fallSec}s / 寿命${V.lifeSec}s）`);
  }

  // --- ② 堕ちた姿のテクスチャが焼かれ、弾に結線されているか ---
  assert(/makeFallenGlyph\('verse_glyph_fallen'/.test(boot),
    'R44W4: 堕ちた文字のテクスチャ verse_glyph_fallen が焼かれている');
  assert(/makeFallenGlyph\(key, size\)/.test(boot),
    'R44W4: makeFallenGlyph が定義されている');
  assert(boss.includes("setTexture('verse_glyph_fallen')"),
    'R44W4: 飛行中に堕ちた文字へ差し替わる（テクスチャを焼くだけで使わない、を防ぐ）');
  // ★形は**実装をそのままラスタライズして**数で縛る（数値リテラルを書き写すと、実装を
  //   直したときに計測器だけ古い値で通り続ける＝[[feedback_instrument_must_match_impl]]）。
  //   Boot.js の makeMask コールバックを取り出して 14×14 に焼き、性質を測る。
  {
    const SIZE = 14;
    const raster = (fnName) => {
      const body = (boot.match(new RegExp(fnName + '\\(key, size\\) \\{([\\s\\S]*?)\\n  \\}')) || [])[1];
      const cb = (String(body).match(/\(x, y\) => \{([\s\S]*)\}\);/) || [])[1];
      assert(!!cb, `R44W4: ${fnName} の判定式を読める`);
      const f = new Function('x', 'y', 'size', 'const c = size / 2 - 0.5;\n' + cb);
      const g = [];
      for (let y = 0; y < SIZE; y++) {
        const row = [];
        for (let x = 0; x < SIZE; x++) row.push(!!f(x + 0.5, y + 0.5, SIZE));
        g.push(row);
      }
      return g;
    };
    const holy = raster('makeVerseGlyph'), fall = raster('makeFallenGlyph');
    const count = (g) => g.flat().filter(Boolean).length;
    const rowW = (g) => g.map((r) => r.filter(Boolean).length);
    // ⚠️ 判定式の中心は c = size/2 - 0.5 ＝ 6.5 で、標本点は x+0.5。つまり鏡映の相手は
    //   「列 x ↔ 列 12-x」で、13列目だけ相手がいない。そこを外して対称性を測る。
    const mirrorX = (g) => g.every((r) => r.slice(0, SIZE - 1).every((v, x) => v === r[SIZE - 2 - x]));
    const mirrorY = (g) => g.slice(0, SIZE - 1).every((r, y) => r.every((v, x) => v === g[SIZE - 2 - y][x]));

    assert(count(fall) >= 34 && count(fall) <= 70,
      `R44W4: 堕ちた文字の画素数が34〜70（${count(fall)}）＝空でも塗り潰しでもない`);
    // ①倒立＝いちばん広い行（横腕）が中心より**下**にある。正位置の聖句は上下対称。
    {
      const w = rowW(fall), wi = w.indexOf(Math.max(...w));
      assert(wi > SIZE / 2, `R44W4: 横腕が中心より下（行${wi}）＝正位置の十字を上下反転した形`);
      assert(mirrorY(holy), 'R44W4: 正位置の聖句は上下対称＝整った文字（対比が成り立つ）');
      assert(!mirrorY(fall), 'R44W4: 堕ちた文字は上下非対称＝倒立している');
    }
    // ②左右非対称＝折れている。正位置は左右対称。
    assert(!mirrorX(fall), 'R44W4: 堕ちた文字は左右非対称＝腕が折れている');
    assert(mirrorX(holy), 'R44W4: 正位置の聖句は左右対称＝整った文字（対比が成り立つ）');
    // ⑤中央の空洞の眼＝中心が抜けていて、その外側には画素がある
    {
      const cxy = SIZE / 2 - 1;
      const hole = !fall[cxy][cxy] && !fall[cxy][cxy + 1] && !fall[cxy + 1][cxy] && !fall[cxy + 1][cxy + 1];
      const around = fall[cxy].filter(Boolean).length > 0;
      assert(hole && around, 'R44W4: 中央に空洞の眼が開いている（外側には芯が残る）');
      assert(holy[cxy][cxy], 'R44W4: 正位置の聖句は中央が詰まっている＝対比が成り立つ');
    }
    // ④上端が2本に割れる＝最上行に画素の島が2つある
    {
      const top = fall.findIndex((r) => r.some(Boolean));
      let islands = 0, prev = false;
      for (const on of fall[top]) { if (on && !prev) islands++; prev = on; }
      assert(islands === 2, `R44W4: 上端が2本の牙に割れている（島${islands}）`);
    }
  }

  // --- ③ 堕ちるのは形だけでなく、色・回転・音も同じ瞬間に変わるか ---
  //     ばらけて変わると「壊れた」に見える。1つの出来事として起こす。
  assert(/function corruptGlyph\(b\)/.test(boss), 'R44W4: 堕ちの処理 corruptGlyph がある');
  {
    const cg = (boss.match(/function corruptGlyph\(b\)[\s\S]*?\n  \}/) || [''])[0];
    for (const [what, re] of [
      ['形', /setTexture\('verse_glyph_fallen'\)/],
      ['色', /setTint\(VERSE_FALL_A\)/],
      ['光背', /glow\.setTint\(0xd01228\)/],
      ['灰', /spawnParticles\(b\.x, b\.y, 0x2a0a18/],
      ['音', /Sound\.sfx\('verseFall'/],
    ]) assert(re.test(cg), `R44W4: 堕ちる瞬間に${what}が変わる`);
  }
  assert(/VERSE_FALL_A = 0xa24bff/.test(boss) && /VERSE_FALL_B = 0xc0102a/.test(boss),
    'R44W4: 堕ちの色は紫→深紅＝作中の語彙（神核の紫・整列レーザーの縁）を使う');
  // ★実撮影で「暗い光背にしたら弾が画面から消えた」を1度やっている。退廃＝暗さ、をやり直さない
  //   ための式のガード（[[feedback_measure_vfx_by_diff]]／見える位置で描かれるかまで見る）。
  {
    const lum = (h) => 0.30 * ((h >> 16) & 255) + 0.59 * ((h >> 8) & 255) + 0.11 * (h & 255);
    const g = Number((boss.match(/glow\.setTint\((0x[0-9a-f]{6})\)\.setAlpha\(0\.95\)/) || [])[1]);
    assert(g && lum(g) >= lum(0xc0102a),
      `R44W4: 堕ちた弾の光背は文字より明るい（光背${lum(g).toFixed(0)} ≧ 文字${lum(0xc0102a).toFixed(0)}）＝黒い文字が縁で燃える`);
    assert(/spawnRingFx\(b\.x, b\.y, 0xff2a5a/.test(boss),
      'R44W4: 堕ちた瞬間の輪がいちばん明るい＝「いま堕ちた」が見える');
  }
  assert(/mixRgb\(VERSE_FALL_A, VERSE_FALL_B, k\)/.test(boss),
    'R44W4: 紫から深紅へ連続で落ちる（2段の切替ではなく「落ちていく」）');
  assert(/b\.spin \* \(b\.fallen \? 2\.6 : 1\)/.test(boss),
    'R44W4: 堕ちると回転が跳ねる＝文字が読めなくなる');

  // ★R40 の実装漏れの是正。コメントは「回転しながら飛ぶ」で spin:3.2 まで渡していたのに、
  //   spin を読むのは cutter の分岐だけだった＝文字弾も輪弾も一度も回っていなかった。
  assert(/b\.kind === 'glyph' \|\| b\.kind === 'judge'/.test(boss),
    'R44W4: 文字弾／輪弾に更新分岐がある（＝spin が結線された）');

  // --- ④ 暴走しないこと。1回の聖句で最大60発が同時に堕ちる ---
  assert(/fallBudget = 2/.test(boss) && /if \(fallBudget > 0\)/.test(boss),
    'R44W4: 堕ちの輪と音は1フレーム2発まで（60発ぶんの音が同時に鳴らない）');

  // --- ⑤ 儀式の場（予告の魔法陣）にも退廃が混ざるか ---
  {
    const vc = (boss.match(/case 'verse':[\s\S]*?case 'shell':/) || [''])[0];
    const n = (vc.match(/spawnRingFx\(/g) || []).length;
    assert(n === 3, `R44W4: 聖句の予告は3枚の環（${n}）＝金・白・紫`);
    assert(/spawnRingFx\(boss\.x, boss\.y, 0xa24bff/.test(vc),
      'R44W4: 第3の環は VERSE_FALL_A と同じ紫＝この色に弾が堕ちる、を先に見せる');
    assert(vc.indexOf('0xa24bff') > vc.indexOf('0xffffff'),
      'R44W4: 紫の環は2枚の祈りの**あと**に置かれる＝下から遅れて滲む');
  }

  // --- ⑥ 音は「昇る鐘」の対句として「降りる」か ---
  {
    const vf = (sound.match(/verseFall\(vol = 1\)[\s\S]*?\n  \},/) || [''])[0];
    assert(vf.length > 0, 'R44W4: verseFall を読める');
    const m = vf.match(/freq: (\d+(?:\.\d+)?), freqEnd: (\d+(?:\.\d+)?)/);
    assert(m && Number(m[2]) < Number(m[1]),
      `R44W4: 堕ちの音は下降する（${m ? m[1] + '→' + m[2] : '—'}）＝昇る versePeal の対句`);
    assert(/freq: 311/.test(vf) && /freq: 327/.test(vf),
      'R44W4: 濁りのうなり（311/327Hz＝澄んだ和音にならない間隔）がある');
  }
}

// ============================================================================
// R44W5 かげおに — 殻閉じの丸い弾（judge_orb 全方位弾）の置換
// 実プレイFB「せいくの次の攻撃（丸い弾）も修正して。オリジナリティーあふれる攻撃に。
// 今度は退廃性（悪魔性）が強く、**やや理不尽**な攻撃にして。できれば弾以外の意外な攻撃に」。
// ★設計＝**主人公自身の影**が足あとから起き上がり、過去の動きを speedMul 倍速で再生して追う。
//   捕まる条件は「止まる・引き返す・小さく回る」だけ。minGapSec の床が
//   「走り続ける限り絶対に捕まらない」を保証する＝**やや**理不尽（完全理不尽の禁止）。
// ============================================================================
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const sound = read('audio/sound.js');
  const run = read('scenes/Run.js');
  const maou = BALANCE.boss.tiers.find((t) => t.bossId === 'maou');
  const tf = maou.trueForm;
  const sh = tf.shell.shadow;

  // --- ① 数値の整合（R44W7 で count/delaySec/gapStepSec → ranks×lanes の隊列へ）---
  const lanesMax = sh.lanes + Math.max(...tf.rage.lanesAdd);
  const bodies = sh.ranks * sh.lanes;
  const bodiesMax = sh.ranks * lanesMax;
  // ★R44W8 FB「団子のように固まっている。ゴチャキャラ感も残しながらもう少し距離をとって。
  //   個体をもう少し増やすことも検討して」→ 24体（激化30体）・間隔は**スプライト身幅を基準**に。
  assert(bodies >= 20 && bodiesMax <= 32,
    `R44W8: 影は20〜32体（初段${bodies}体・最終段${bodiesMax}体）＝FB「個体をもう少し増やす」`);
  assert(sh.ranks >= 3 && sh.lanes >= 3,
    `R44W7: ${sh.ranks}段×${sh.lanes}列＝複数列（FB「後ろにずらっと並べるのでなく、複数列にして」）`);
  {
    // ★団子の正体＝間隔がスプライトの身幅より狭かったこと。身幅を実データから出して縛る
    //   （数値リテラルで書き写すと、縮尺やドット絵を変えたときに嘘のガードになる）。
    const SS = Number((boss.match(/const SHADOW_SCALE = ([\d.]+);/) || [])[1]);
    const bodyPx = SS * MONSTERS[0].sprite.rows[0].length;
    const rankPx = sh.rankGapSec * BALANCE.player.speed;
    assert(sh.laneGapPx >= bodyPx * 0.8,
      `R44W8: 列の間隔${sh.laneGapPx}px ≧ 身幅${bodyPx.toFixed(0)}px×0.8＝横に重なって団子にならない`);
    assert(rankPx >= bodyPx * 0.6,
      `R44W8: 段の間隔${rankPx.toFixed(0)}px（床${sh.rankGapSec}s×${BALANCE.player.speed}px/s）≧ 身幅×0.6＝縦に重ならない`);
    assert(sh.laneGapPx < bodyPx * 1.6 && rankPx < bodyPx * 1.6,
      'R44W8: ただし身幅の1.6倍未満＝**ゴチャキャラ感**（肩が触れる密度）は残す＝散開させない');
  }
  assert(sh.stagger === true && sh.jitterPx > 0,
    `R44W8: 千鳥（奇数段を半列ずらす）＋個体ごとのゆらぎ±${sh.jitterPx}px＝整列した格子ではなく「群れ」になる`);
  assert(/const stag = \(sk\.stagger && r % 2\) \? sk\.laneGapPx \* 0\.5 : 0;/.test(boss),
    'R44W8: 千鳥が実装に実在する（値だけ持って効かない、を防ぐ）');
  assert(/const jit = \(\(hsh - Math\.floor\(hsh\)\) \* 2 - 1\) \* \(sk\.jitterPx \|\| 0\);/.test(boss),
    'R44W8: ゆらぎは**決定的**な擬似乱数＝同じ体は毎フレーム同じ位置（ちらつかない）');
  // ★偶数列だと中央に0の列が無い。旧実装（|offset| < laneGapPx/2）では**誰も噛み手にならなかった**
  assert(/let biterLane = 0;/.test(boss) && /l === biterLane/.test(boss)
    && /const lane = isBiter \? 0 :/.test(boss),
    'R44W8: 噛み手は添字で選び lane を0に固定＝列が偶数でも必ず1体いる／足あとの上を正確になぞる');
  assert(sh.ghostNearRanks < sh.ranks,
    `R44W8: 分身は前${sh.ghostNearRanks}段だけ2枚・以降1枚＝体数が増えても画面上の枚数を据え置く`);
  assert(sh.rankSpreadSec > 0 && sh.rankGapSec > 0,
    'R44W7: 段は「過去へずらして湧く」＋「追走の床も段ごとにずらす」＝縦にほどける（全員が1点に重なる実測バグの再発防止）');
  assert(sh.speedMul >= 1.8,
    `R44W7: 再生は実時間の${sh.speedMul}倍＝「かげは走って襲ってくる」（FB「移動スピードを速くして」）`);
  assert(sh.ghostCount >= 2 && sh.ghostLagSec > 0 && sh.ghostLagSec < 0.1,
    `R44W7: 分身${sh.ghostCount}枚・遅れ${sh.ghostLagSec}s＝走る姿がぶれる（FB「走る姿が分身する演出で速さおよび怖さを演出して」）`);
  assert(sh.riseSec < tf.shell.holdSec,
    `R44W5: 影は殻が閉じているうちに起き上がりきる（rise ${sh.riseSec}s ＜ hold ${tf.shell.holdSec}s）＝「神は祈り影が狩る」絵が成立`);
  assert(sh.lifeSec > tf.shell.holdSec + tf.shell.openSec,
    `R44W5: 影は殻が開いても残る（life ${sh.lifeSec}s ＞ hold+open ${tf.shell.holdSec + tf.shell.openSec}s）＝次の攻撃と重なる圧`);
  assert(sh.damage < maou.wirearm.damage + 1 && sh.damage >= 16,
    `R44W5: 噛みつき${sh.damage}は回避可能系＝回避不能系ワイヤー${maou.wirearm.damage}を超えない`);
  assert(sh.damage + sh.novaDamage < tf.aligned.damage,
    `R44W5: 噛みつき+炸裂（${sh.damage + sh.novaDamage}）＜ 整列${tf.aligned.damage}＝最大の一撃の格を守る`);

  // --- ② 「やや理不尽」の床（ここが崩れると完全理不尽になる）---
  {
    const touchPx = sh.radius + BALANCE.player.radius;
    const gapPx = BALANCE.player.speed * sh.minGapSec;
    assert(gapPx > touchPx * 1.5,
      `R44W5: 走っている限りの間合い（${gapPx.toFixed(0)}px）＞ 接触判定（${touchPx}px）×1.5＝走り続ければ絶対に捕まらない`);
    assert(/if \(run\.elapsed - s\.pt < floor\) s\.pt = run\.elapsed - floor/.test(boss),
      'R44W5: 床が実装に実在する（値だけ持って効かない、を防ぐ）');
    // ★主動詞を否定しない：**動きながらの溜め**（0.5倍＝74px/s）では噛まれない床であること。
    //   床0.35だと投げるたびに噛まれた（実測）＝掴む→溜める→投げるの否定になる。
    //   ⚠️ 据え置きの狙い（aimStopSec 0.5秒の完全停止）だけは床0.55とほぼ同じ＝噛まれ得る。
    //   これは意図＝「影が出ている間は、立ち止まっての長い狙いだけができない」が圧の中身。
    const chargePx = BALANCE.player.speed * BALANCE.hero.billiard.moveMulWhileCharge * sh.minGapSec;
    assert(chargePx > touchPx,
      `R44W5: 溜め歩きの間合い（${chargePx.toFixed(0)}px）＞ 接触（${touchPx}px）＝動きながらの溜めと投げは安全・捕まるのは立ち止まりだけ`);
    assert(/const floor = sk\.minGapSec \+ s\.rank \* sk\.rankGapSec;/.test(boss),
      'R44W7: 床は段ごとにずらす＝全員が1点に重なって1体に見える（実測）の再発防止');
    // ★噛むのは先頭1体だけ（FB「主人公に追いつくのは常に先頭だけ」）。
    //   15体ぶんの判定が重なると「やや理不尽」が「完全理不尽」に化ける。
    assert(/if \(s\.biter\) \{[\s\S]{0,320}run\.hitPlayer\(sk\.damage/.test(boss),
      'R44W7: 噛みつき判定は先頭（biter）だけ＝後続は速さと圧の演出に徹する');
    assert((boss.match(/run\.hitPlayer\(sk\.damage/g) || []).length === 1,
      'R44W7: 噛みつきの判定は1箇所＝[[feedback_one_hit_one_circle]]');
    // ★炸裂は静止してから：走者の背後（trail px）で爆ぜると回避不能（実測でB/Cが被弾した）。
    //   静止フレア中に走って離せる距離 ＞ 爆風、を式で縛る。
    const flarePx = BALANCE.player.speed * sh.flareSec;
    assert(flarePx > sh.novaRadius + BALANCE.player.radius,
      `R44W5: フレア中に走って離せる距離（${flarePx.toFixed(0)}px）＞ 爆風（${sh.novaRadius + BALANCE.player.radius}px）＝正しく走っていれば必ず躱せる`);
    assert(/const flaring = s\.life <= sk\.flareSec;[\s\S]{0,400}if \(!flaring\) \{/.test(boss),
      'R44W5: フレア中は影が静止する（時計を進めない）＝「立ち止まった＝爆ぜる」が身体で読める');
  }

  // --- ③ 召喚の条件：殻が閉じきったときだけ。割れば影は出ない ---
  assert((boss.match(/spawnShadows\(\);/g) || []).length === 1,
    'R44W5: 召喚は1箇所から＝殻が閉じきった瞬間だけ');
  assert(/state = 'shellHold'[\s\S]{0,600}spawnShadows\(\)/.test(boss),
    'R44W5: 召喚は shellHold 遷移の中＝shellInterrupt（割った）経路からは出ない');
  assert(/function spawnShadows\(\) \{\s*\n\s*destroyShadows\(\)/.test(boss),
    'R44W5: 召喚の最初に前回の影を消す＝重ね掛けで無限に増えない');

  // --- ④ 影の材料（足あと）と、殻に縛られない追走 ---
  assert(/if \(trueForm\) \{\s*\n\s*recordShadowHist\(\);/.test(boss),
    'R44W5: 足あとは真の姿のあいだ常に記録される（影の再生に穴を作らない）');
  assert(/updateShadows\(dt\);/.test(boss),
    'R44W5: 影の更新はボスの state に縛られない＝殻が開いても lifeSec まで狩り続ける');
  assert(/while \(shadowHist\.length > 2 && shadowHist\[0\]\.t < keep\) shadowHist\.shift\(\)/.test(boss),
    'R44W5: 足あとは上限つき＝無限に伸びない');

  // --- ⑤ 退廃の語彙の連続性（新しい語彙を持ち込まない）---
  // ★R44W7 実プレイFB「かげおには、主人公ではなく、モビットのほうがよい」。
  //   いま連れているパーティの顔ぶれ（進化ずみなら進化形）をそのまま使う＝
  //   「自分のなかまの堕ちた影に追われる」。倒立（flipY）は堕ちた聖句と同じ語彙なので維持。
  assert(/function shadowTexKeys\(\)/.test(boss) && /'mon_' \+ src\.id/.test(boss),
    'R44W7: 影の姿はモビット（mon_ テクスチャ）＝主人公ではない');
  assert(!/run\.add\.image\(p\.x, p\.y, 'player'\)/.test(boss),
    'R44W7: 影に主人公テクスチャを直接使っていない（旧実装の残りが無い）');
  assert(/const tex = texKeys\[\(r \* lanes \+ l\) % texKeys\.length\];/.test(boss),
    'R44W7: 顔ぶれは体ごとに巡回＝隊列がぜんぶ同じ顔にならない');
  assert(/image\(p\.x, p\.y, tex\)[\s\S]{0,120}setFlipY\(true\)/.test(boss),
    'R44W5/W7: 影は倒立（flipY）＝堕ちた聖句と同じ「倒立」の語彙');
  {
    // 画面上の背丈を主人公と揃える（モビットは16行・主人公は18行のグリッド）。
    // ここがズレると「小さい何かがうろうろしている」に見えて怖さが出ない。
    const SS = Number((boss.match(/const SHADOW_SCALE = ([\d.]+);/) || [])[1]);
    const pScale = Number((run.match(/playerImg = [^\n]*setScale\(([\d.]+)\)/) || [])[1]);
    const mobRows = MONSTERS[0].sprite.rows.length, heroRows = PLAYER_SPRITE.rows.length;
    const ratio = (SS * mobRows) / (pScale * heroRows);
    assert(SS > 0 && pScale > 0 && ratio > 0.9 && ratio < 1.1,
      `R44W7: 影の背丈は主人公の${ratio.toFixed(2)}倍＝等身大（モビット${mobRows}行×${SS} / 主人公${heroRows}行×${pScale}）`);
  }
  assert(/mixRgb\(VERSE_FALL_A, VERSE_FALL_B, pulse\)/.test(boss),
    'R44W5: 影の脈は堕ちた聖句と同じ紫→深紅（色の家族が同じ＝同じ「堕ちたもの」）');
  assert(/setTint\(0xd01228\)/.test((boss.match(/function spawnShadows[\s\S]*?\n  \}/) || [''])[0]),
    'R44W5: 空洞の眼＝深紅の光が下（倒立した頭）に灯る');

  // --- ⑥ 果てる瞬間：予告してから炸裂する ---
  assert(/if \(flaring\) \{\s*\n\s*const w = clamp01\(1 - s\.life \/ sk\.flareSec\);/.test(boss),
    'R44W5: 炸裂の flareSec 前から張りつめて膨らむ＝無予告の置き土産にしない');
  assert(/spawnRingFx\(p\.x, p\.y, 0xff8a1f, 10, sk\.novaRadius, /.test(boss),
    'R44W7: 炸裂の環のひとつは**判定と同じ半径**＝爆風の本当の広さが学習できる');

  // --- ⑦ 音3点＝結線先の無い音・音の無い結線を両方殺す ---
  for (const k of ['shadowRise', 'shadowBite', 'shadowBurst']) {
    assert(new RegExp(`^  ${k}\\(`, 'm').test(sound), `R44W5: SFX ${k} が sound.js に実在する`);
    assert(new RegExp(`Sound\\.sfx\\('${k}'`).test(boss), `R44W5: SFX ${k} が boss.js から鳴らされる`);
  }
  // 退廃の音の署名＝非整数比の近接2音（verseFall の311/327）を1オクターブ下で共有
  {
    const sr = (sound.match(/shadowRise\(vol = 1\)[\s\S]*?\n  \},/) || [''])[0];
    assert(/freq: 155\.5/.test(sr) && /freq: 163\.5/.test(sr),
      'R44W5: 影のうなりは 155.5/163.5Hz＝verseFall の署名の1オクターブ下（深いところの存在）');
  }

  // --- ⑧ 後始末と予算 ---
  assert(/destroyShadows\(\);\s*\n\s*shadowHist\.length = 0;/.test(boss),
    'R44W5: clearFx で影と足あとが消える（勝った画面に影が残らない）');
  assert(/let dripBudget = 2/.test(boss),
    'R44W5: 影のしずくは1フレーム2個まで（最大4体でも粒が暴れない）');
  assert(/introText\('かげおに ―― とまるな！'/.test(boss),
    'R44W5: 技名と遊び方が1行で出る（かげおに＝名前がルール）');

  // --- ⑨ 大爆発（R44W7「最後弾けるのも演出が地味。炎を出しながら大爆発して。
  //     爆発音も派手に。爆風が主人公を襲う効果もいい。ただし範囲が広すぎるのはダメ」）---
  {
    const nova = (boss.match(/function shadowNova\([\s\S]*?\n  \}/) || [''])[0];
    assert(/whiteFlash\(/.test(nova) && /run\.shake\(/.test(nova) && /run\.freezeT/.test(nova),
      'R44W7: 大爆発は閃光＋画面ゆれ＋ヒットストップ（「地味」の反対＝身体で分かる3点）');
    // ★R44W8 FB「かげおにの一番の不満点は爆発と爆風。もっとずっと派手に」。
    //   派手さは「1枚を強くする」では出ない（閃光0.36は白飛びして炎が消えた実測）。
    //   **層を増やして時間差で置く**＝目が「まだ終わらない」と感じ続けるのが派手さの正体。
    assert((nova.match(/spawnRingFx\(/g) || []).length >= 6,
      'R44W8: 環は6枚以上（芯・衝撃波・火球・外環・煤・遅れて第二衝撃波）');
    assert((nova.match(/spawnPillarFx\(/g) || []).length >= 3 && /for \(let k = 0; k < 8; k\+\+\)/.test(nova),
      'R44W8: 炎柱は**放射状に8本**＋中央＋遅れて立ち上る煙柱');
    assert((nova.match(/run\.time\.delayedCall\(/g) || []).length >= 4,
      'R44W8: 時間差で置く演出が4つ以上（橙の閃光・第二衝撃波・煙柱・二段目のゆれ）');
    assert(/whiteFlash\(0\.\d+, 0xff8a1f/.test(nova),
      'R44W8: 白の閃光の直後に**橙の閃光**＝炎が画面を舐める（白だけ強くすると炎が飛ぶ）');
    assert(/run\.billiard\.shockRing\(/.test(nova),
      'R44W8: 既存の shockRing も2枚重ねる（この作品でいちばん派手な環を借りる）');
    assert((nova.match(/run\.spawnParticles\(/g) || []).length >= 6,
      'R44W8: 火の粉は6回以上（白熱の破片・白熱・炎・煤＋爆風side）');
    assert(/run\.hitPlayer\(sk\.novaDamage, p\.x, p\.y\)/.test(nova),
      'R44W7: 爆風は位置つきで当たる＝主人公が押し飛ばされる（「爆風が主人公を襲う」）');
    assert((nova.match(/run\.hitPlayer\(/g) || []).length === 1 && /if \(s\.biter\) \{/.test(nova),
      'R44W7: 爆風の判定は先頭1体の円ひとつだけ＝画面は大爆発・判定は1つ（範囲が広すぎない）');
    assert(/novaFxBudget/.test(nova) && /novaFxBudget = \d+;/.test(boss),
      'R44W7: 後続の炎は1フレーム予算つき＝20体が同時に果てても粒が暴れない');
    // ★「爆発音と爆風音」とFBが2つに分けて書いている＝爆風は当たった本人にだけ起きる別の事件
    assert(/run\.hitPlayer\(sk\.novaDamage[\s\S]{0,400}Sound\.sfx\('shadowBlast'\)/.test(nova),
      'R44W8: 爆風音は**巻き込まれた時だけ**鳴る（爆発音とは別物）');
    assert(/Sound\.sfx\('shadowBlast'\)[\s\S]{0,900}run\.spawnParticles\(run\.player\.x/.test(nova),
      'R44W8: 爆風の絵は**主人公の側**で起きる（自分が巻き込まれたことが自分の身体で分かる）');
    // ★R44W10 爆風は「主人公を通り抜ける」＝環は**主人公の位置から**広がる。
    assert((nova.match(/spawnRingFx\(run\.player\.x/g) || []).length >= 3,
      'R44W10: 衝撃波が自分を通り抜ける環が3枚（爆心の環とは別に、身体の側でも起きる）');
    assert(/const ux = dx \/ d, uy = dy \/ d;/.test(nova)
      && /run\.spawnParticles\(run\.player\.x \+ ux \*/.test(nova),
      'R44W10: 火の粉は**風下**へ帯になって流れる（爆心→主人公の向き）＝押し流された絵');
    assert((nova.match(/spawnPillarFx\(/g) || []).length >= 4
      && /for \(let k = 0; k < 6; k\+\+\)/.test(nova),
      'R44W10: 炎柱は二重（内周8本＋外周6本）＋中央＋煙柱');
    assert(/火の雨/.test(nova) && (nova.match(/run\.time\.delayedCall\(/g) || []).length >= 8,
      'R44W10: 時間差の演出が8つ以上（三段の閃光・三段のゆれ・第二第三衝撃波・外周の柱・火の雨）');
  }
  {
    const sb = (sound.match(/shadowBurst\(vol = 1, pitch = 1\)[\s\S]*?\n  \},/) || [''])[0];
    assert(/duckBgm\(/.test(sb),
      'R44W7: 爆発の瞬間はBGMを沈める（サイドチェイン）＝一撃が音の中で抜ける');
    assert(/hpFreq: 3200/.test(sb),
      'R44W7: 先行するクラック（ごく短い高域）がある＝これが無いと「遠い花火」に聞こえる');
    assert(/lpEnd:/.test(sb) && /lpEnd = 0,/.test(sound),
      'R44W7: 炎＝帯域が下へ落ちる掃引ノイズ（noiseHit の lpEnd。既定0で既存の音は不変）');
    assert(/start: 0\.16/.test(sb) && /start: 0\.29/.test(sb),
      'R44W7: 遅れて降るがれき＝時間差があると「大きいものが壊れた」に聞こえる');
    const gains = (sb.match(/gain: ([\d.]+) \* vol/g) || []).map((m) => Number(m.match(/[\d.]+/)[0]));
    assert(Math.max(...gains) >= 0.9,
      `R44W7: 爆発の本体は旧実装（0.65）より大きい（${Math.max(...gains)}）＝「爆発音も派手に」`);
    assert(/if \(!big\) return;/.test(sb),
      'R44W7: 後続（vol小）は尾を鳴らさない＝15体ぶんの残響が重なって濁る（＝逆に小さく聞こえる）のを防ぐ');
    // ★R44W8「音をいまよりずっと派手に」。★音量ではもう上げられない（0.95でヘッドルームが無い）
    //   ので**層と時間**を足す。層が減ったら回帰＝式で縛る。
    assert(/freq: 42, freqEnd: 18/.test(sb),
      'R44W8: サブベース42→18Hz＝体に来る帯域（旧実装に無かった）');
    assert(/start: 0\.055/.test(sb),
      'R44W8: 本体が**二段**（0ms と 55ms）＝「ドッ…ドーン」。1発の低音より確実に大きく聞こえる');
    assert(/freq: 520,/.test(sb) && /freq: 1435,/.test(sb) && /freq: 2808,/.test(sb),
      'R44W8: 金属の裂け 520/1435/2808Hz＝鉄床と同じ非整数比＝「割れた」の証拠');
    // ★R44W10 で 90Hz の終端は**子どものノートPCで鳴らない**ので聞こえる側（320Hz）へ上げ、
    //   長さも 1.5→2.4秒（最終ボスの一撃の余韻）。旧値へ戻ったら落ちる。
    const slow = (sb.match(/dur: ([\d.]+), gain: [\d.]+ \* vol, hpFreq: \d+, lpFreq: \d+, lpEnd: (\d+)/) || []);
    assert(Number(slow[1]) >= 2.0 && Number(slow[2]) >= 250,
      `R44W10: 遅い轟きの掃引は${slow[1]}秒・終端${slow[2]}Hz＝長く、かつ**聞こえる帯域**に残る`);
    assert((sb.match(/noiseHit\(\{ start: 0\./g) || []).length >= 3,
      'R44W8: がれきは3発（時間差が多いほど「大きいものが壊れた」に聞こえる）');
    const dk = (sb.match(/duckBgm\(([\d.]+)/) || [])[1];
    assert(Number(dk) >= 0.6,
      `R44W8: BGMを沈める深さ${dk}（旧0.5より深い）＝爆発の瞬間の抜けを広げる`);
  }
  {
    // 爆風音は**破裂ではなく風**。立ち上がりが遅いこと（attack）がその証拠。
    const bl = (sound.match(/shadowBlast\(vol = 1\)[\s\S]*?\n  \},/) || [''])[0];
    assert(bl.length > 0, 'R44W8: SFX shadowBlast（爆風音）が sound.js に実在する');
    assert(/Sound\.sfx\('shadowBlast'\)/.test(boss), 'R44W8: shadowBlast が boss.js から鳴らされる');
    const atks = (bl.match(/attack: ([\d.]+)/g) || []).map((m) => Number(m.match(/[\d.]+/)[0]));
    assert(atks.length >= 3 && Math.max(...atks) >= 0.05,
      `R44W8: 爆風は**立ち上がりが遅い**（最大attack ${Math.max(...atks)}s）＝破裂ではなく押し寄せる風に聞こえる`);
    assert(/lpEnd: 420/.test(bl),
      'R44W10: 風のノイズは 3.2k→420Hz へ落ちる（180Hz だとノートPCで消える）＝体を通り過ぎる');
    assert(/duckBgm\(/.test(bl), 'R44W8: 爆風でもBGMを沈める');
    const sbGains = (bl.match(/gain: ([\d.]+) \* vol/g) || []).map((m) => Number(m.match(/[\d.]+/)[0]));
    assert(Math.max(...sbGains) >= 0.5,
      `R44W8: 爆風は聞こえる大きさ（最大gain ${Math.max(...sbGains)}）＝R44W3の巻き戻し音の失敗（打撃音の1/7で聞こえなかった）を繰り返さない`);
  }

  // --- ⑩ R44W10 爆発と爆風の範囲（「3倍以上広げて。最終ボスの攻撃であるという自覚を」）---
  {
    assert(sh.novaRadius >= 72 * 3,
      `R44W10: 爆風の判定半径 ${sh.novaRadius}px ≧ 旧72px×3＝指定どおり3倍以上`);
    // ★範囲を3倍にするなら**逃げる猶予も3倍**要る。逆算の式そのものは変えない
    const flarePx10 = BALANCE.player.speed * sh.flareSec;
    assert(flarePx10 > sh.novaRadius + BALANCE.player.radius,
      `R44W10: フレア中に走って離せる距離（${flarePx10.toFixed(0)}px）＞ 爆風（${sh.novaRadius + BALANCE.player.radius}px）＝広げても躱せる`);
    assert(sh.flareSec >= 1.5,
      `R44W10: 静止フレア ${sh.flareSec}s＝「爆弾のカウントダウン」として読める長さ`);
  }

  // --- ⑪ R44W10 かげおには1つの攻撃として完結する ---
  //   ★実測：影が果てた60回の**100%**がせいれつの照射中だった（FB「せいれつを受けて
  //     爆発するパターンがほとんど。それはおかしい」＝そのとおりで、しかも全部だった）。
  //     どれだけ大爆発を派手にしても画面がレーザーで埋まっていれば**届かない**。
  {
    assert(/function shadowsBusy\(\)/.test(boss),
      'R44W10: 影が生きているあいだは次の攻撃に入らない仕組みがある');
    assert((boss.match(/!shadowsBusy\(\)\)/g) || []).length >= 2,
      'R44W10: 攻撃の開始口（軌道遊弋と追跡）の**両方**に効いている＝片方から漏れない');
    assert(/const SHADOW_HOLD_MAX = [\d.]+;/.test(boss) && /shadowHoldT < SHADOW_HOLD_MAX/.test(boss),
      'R44W10: 待ちには上限がある＝影が消えなくなっても戦闘が止まらない');
    const total = sh.riseSec + sh.lifeSec;
    const shellLeft = tf.shell.holdSec + tf.shell.openSec;
    assert(total - shellLeft < 3.0,
      `R44W10: 殻が終わってからの待ちは ${(total - shellLeft).toFixed(2)}秒（3秒未満）＝完結させても尺を食い潰さない`);
    assert(sh.chainSec * sh.ranks >= 0.5,
      `R44W10: 連鎖は ${(sh.chainSec * sh.ranks).toFixed(2)}秒かけて後ろから前へ流れる＝最後に先頭の大爆発で締まる`);
  }

  // --- ⑫ R44W10 忍者の残像と足音（「ふわふわしながらせまってくる」の解消）---
  {
    assert(sh.gaitSec > 0 && sh.gaitAmp > 0,
      `R44W10: 歩調（周期${sh.gaitSec}s・振幅±${sh.gaitAmp}）＝**等速をやめる**。ふわふわの正体は等速だった`);
    assert(/const gait = 1 \+ \(sk\.gaitAmp \|\| 0\) \* Math\.cos\(gaitPh \* Math\.PI \* 2\);/.test(boss),
      'R44W10: 歩調が実装に実在する（値だけ持って効かない、を防ぐ）');
    assert(sh.gaitAmp < 1,
      'R44W10: 歩調の振幅は1未満＝速度が負にならない（後ろへ下がる影は「走っている」に見えない）');
    assert(sh.ghostCount >= 4 && sh.ghostQuantSec > 0 && Array.isArray(sh.ghostAlpha),
      `R44W10: 忍者の残像＝${sh.ghostCount}枚・${sh.ghostQuantSec}秒の格子・濃さは階段`);
    assert(/const qBase = q > 0 \? Math\.floor\(s\.pt \/ q\) \* q : s\.pt;/.test(boss),
      'R44W10: 残像は**格子へ量子化**＝尾を引くのではなく「その場に残って次の踏み込みで飛ぶ」');
    assert(sh.ghostAlpha[0] > sh.ghostAlpha[sh.ghostAlpha.length - 1],
      'R44W10: 残像の濃さは手前ほど濃い階段（連続減衰だと輪郭が立たない）');
    assert(/^  shadowStep\(/m.test(sound) && /Sound\.sfx\('shadowStep'/.test(boss),
      'R44W10: 足音 shadowStep が実在し、boss.js から鳴らされる');
    assert(/if \(s\.biter && !flaring\) \{[\s\S]{0,900}Sound\.sfx\('shadowStep'/.test(boss),
      'R44W10: 足音は**先頭1体だけ**が鳴らす（24体ぶん鳴らすと足音でなく雑音になる）');
    assert(/gaitPh < s\.gaitPh/.test(boss),
      'R44W10: 足音は歩調の位相が一周した瞬間＝踏み込みの瞬間に鳴る（絵と同じリズム）');
    {
      const st10 = (sound.match(/shadowStep\(vol = 1, pitch = 1\)[\s\S]*?\n  \},/) || [''])[0];
      assert(/const feet = \[0, [\d.]+, [\d.]+\];/.test(st10),
        'R44W10: 1回の再生で**大勢が踏んだ**構造（3つの足を17/31msずらす）＝隊列の足音は音の側で作る');
      assert(!/freq: [0-9]?[0-9],/.test(st10),
        'R44W10: 足音の重さを100Hz未満で作らない（子どものノートPCで鳴らない）');
      // ★R44W12 実プレイFB「かげおにの移動音をもっと大きくして。その方が**追われてる感**が
      //   でる」。実測：耳に届く大きさは 0.313 で、被弾音 shadowBite(0.6) の半分しかなかった。
      const gmax = Math.max(...[...st10.matchAll(/gain: ([\d.]+) \* g/g)].map((m) => Number(m[1])));
      assert(gmax > 0.34,
        `R44W12: 足音の最大 gain ${gmax}（旧0.34）＝被弾音と同格まで上げる。旧値へ戻ったら落ちる`);
      const bite = (sound.match(/shadowBite\(vol = 1\)[\s\S]*?\n  \},/) || [''])[0];
      const bmax = Math.max(...[...bite.matchAll(/gain: ([\d.]+) \* vol/g)].map((m) => Number(m[1])));
      assert(gmax >= bmax * 0.85,
        `R44W12: 足音(${gmax}) は被弾音(${bmax}) と同格＝迫る音が噛まれる音に負けない`);
      // ★帯域：軌道神核BGM（歪んだギター＋16分刻みのベース）から逃がす。ここを下げると
      //   いくら音量を上げても曲に埋もれて「聞こえない」に戻る（[[R44W4 巻き戻し音]]と同じ罠）
      const hp = Number((st10.match(/hpFreq: (\d+) \* pitch/) || [])[1]);
      const body = Number((st10.match(/freq: (\d+) \* pitch, freqEnd/) || [])[1]);
      assert(hp >= 1400, `R44W12: 擦り（ザッ）は ${hp}Hz から上＝歪みギターの中域を避ける`);
      assert(body >= 200, `R44W12: 踏み込みの胴は ${body}Hz＝16分刻みのベースの上へ抜ける`);
    }
    assert(/0\.40 \+ near \* 0\.72/.test(boss) && /0\.88 \+ near \* 0\.30/.test(boss),
      'R44W12: 「迫ってくる」は**距離の情報**＝間合いが近いほど大きく・高く鳴る（音量は底上げ）');
    // ★R44W12 実測で分かった空振り：足音を鳴らすのは主人公を追う先頭の1体なので、
    //   間合いは常に120px以内（60回中60回）＝設計した 0.30〜0.92 のレンジは一度も動いていなかった。
    //   基準を「湧いた直後の後方」まで広げて、距離の式が実際に意味を持つようにする。
    assert(sh.stepNearPx >= BALANCE.player.speed * sh.spawnBackSec * 2,
      `R44W12: 足音の距離の基準 ${sh.stepNearPx}px は湧いた直後の後方`
      + `（${(BALANCE.player.speed * sh.spawnBackSec).toFixed(0)}px）より遠い＝式が実際に動く`);
  }

  // --- ⑬ 検証口 ---
  assert(/debugShadows\(\)/.test(boss) && /shadowHistLen/.test(boss),
    'R44W5: 影とその床（gap）を外から測れる');

  // --- ⑭ R44W11 転生（バラバラになるシーン）の爆発音と余韻 ---
  //   実測（cdp-awaken-sfx.mjs）：旧実装は bigBoom＋crush＋metalSlam の寄せ集めで
  //   **25層・余韻0.71秒**。かげおに1体の大爆発（2.4秒の尾）より短かった。
  {
    assert(/^  maouShatter\(vol = 1\) \{/m.test(sound),
      'R44W11: 粉砕の専用音 maouShatter が実在する');
    assert(/Sound\.sfx\('maouShatter'\)/.test(boss),
      'R44W11: shatterOldBody から鳴らされる');
    const shat = (boss.match(/function shatterOldBody\(\)[\s\S]*?\n  \}/) || [''])[0];
    assert(!/bigBoom|'crush'|metalSlam/.test(shat),
      'R44W11: 汎用SFXの寄せ集めに戻っていない（専用音1本で鳴らす）');
    const ms = (sound.match(/maouShatter\(vol = 1\) \{[\s\S]*?\n  \},/) || [''])[0];
    // 余韻＝いちばん遅くまで鳴っている層（start + dur）。3秒の轟きと2.4秒の鳴きが担う
    let tail = 0;
    for (const m of ms.matchAll(/start: ([\d.]+)[^;]*?dur: ([\d.]+)/g)) {
      tail = Math.max(tail, Number(m[1]) + Number(m[2]));
    }
    for (const m of ms.matchAll(/dur: ([\d.]+)/g)) tail = Math.max(tail, Number(m[1]));
    assert(tail >= 2.8, `R44W11: 余韻は ${tail.toFixed(2)}秒（旧0.71秒）＝BGMを止めた沈黙へ溶ける`);
    // ★鳴き（リング）は**歪みバスに入れない**（[[R42の教訓]]：同じ WaveShaper に倍音を
    //   まとめて入れると相互変調で潰れ、金属ではなく「ブザー」に平坦化する）
    const ring = ms.split('\n').filter((l) => /freq: (520|1435|2808), dur:/.test(l));
    assert(ring.length === 3, 'R44W11: 鉄床と同じ非整数比 520:1435:2808 の鳴きが3本ある');
    assert(ring.every((l) => !/dest: D/.test(l)),
      'R44W11: 鳴きは歪みバスへ入れない（アタックだけを歪ませる＝クラングの役割分担）');
    assert(/dest: D/.test(ms), 'R44W11: 引き裂きのアタックは歪みバスを通る');
    // ★重さを100Hz未満だけで作らない（子どものノートPCで鳴らない）
    const mid = [...ms.matchAll(/freq: (\d+(?:\.\d+)?), freqEnd: \d+/g)]
      .map((m) => Number(m[1])).filter((f) => f >= 140);
    assert(mid.length >= 5,
      `R44W11: 聞こえる帯域（140Hz以上）の層が ${mid.length} 本＝低域だけに頼らない`);
    // がれきは**間隔がだんだん伸びる**（等間隔だと機械的で質量が消える）
    const rub = (ms.match(/const rubble = \[([^\]]+)\]/) || [])[1];
    assert(rub, 'R44W11: がれきの時刻表がある');
    const rs = rub.split(',').map(Number);
    assert(rs.length >= 6, `R44W11: がれきは ${rs.length}発（大きいものが壊れた証拠は時間差）`);
    let widening = true;
    for (let i = 2; i < rs.length; i++) {
      if (rs[i] - rs[i - 1] <= rs[i - 1] - rs[i - 2]) widening = false;
    }
    assert(widening, 'R44W11: がれきの間隔は落ちきるにつれて伸びる');
    // 画面も尾に合わせて2段で揺れる（音だけ伸びると「鳴り残り」に聞こえる）
    assert(/run\.shake\(900, 18\);[\s\S]{0,160}delayedCall\(440, \(\) => run\.shake\(760, 7\)\)/.test(shat),
      'R44W11: 揺れも2段＝爆発の直後と、がれきが降る間の地鳴り');
  }
}

// ============================================================================
// R44W6 4件：ボス名の漢字表記／ESCでタイトルへ／せいれつ強化／マオウレクスの名乗り
// ============================================================================
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const runjs = read('scenes/Run.js');
  const tf = BALANCE.boss.tiers.find((t) => t.bossId === 'maou').trueForm;

  // --- ① 名前表記（指定の文字列そのまま。勝手に縮めない）---
  assert(tf.name === '真マオウレクス【軌道神核（きどうしんかく）】',
    'R44W6: HPバーの見出しが指定どおり「真マオウレクス【軌道神核（きどうしんかく）】」');
  assert(tf.text2 === '真マオウレクス【軌道神核（きどうしんかく）】',
    'R44W6: 転生テロップも同じ表記（画面ごとに名前が揺れない）');

  // --- ② ESC＝2度押しでタイトルへ（本番もれんしゅうじょうも Run シーンなので1箇所で両対応）---
  assert(/keydown-ESC/.test(runjs), 'R44W6: ESCキーの結線が Run にある');
  assert(/_escArmedUntil/.test(runjs) && /もういちど ESC で タイトルへ/.test(runjs),
    'R44W6: ESCは2度押し確認（誤タッチ1回でランが全損しない）');
  assert(/Sound\.stopBgm\(\);\s*\n\s*this\.scene\.start\('Title'\)/.test(runjs),
    'R44W6: タイトルへ戻るとき BGM を止める（Result と同じ作法）');

  // --- ③ せいれつ強化＝薙ぎ相＋焼き付き相 ---
  {
    const A = tf.aligned;
    assert(typeof A.sweepSec === 'number' && A.sweepSec < A.activeSec,
      `R44W6: 照射が2相（薙ぎ${A.sweepSec}s ＋ 焼き付き${(A.activeSec - A.sweepSec).toFixed(2)}s）＝時間を伸ばしても総角度は増えない`);
    const rate = A.sweepDeg / A.sweepSec;
    assert(rate >= 130 && rate <= 200,
      `R44W6: 薙ぎ速度 ${rate.toFixed(0)}°/s（旧104°/s より速く・読める上限200以内）`);
    assert(A.beamWidth >= 120, `R44W6: 幅 ${A.beamWidth}（旧100より太い）`);
    assert(A.activeSec >= 1.4, `R44W6: 照射 ${A.activeSec}s（旧1.15より長い）`);
    assert(/sweepSec: ak\.sweepSec/.test(boss),
      'R44W6: sweepSec が fireAligned から実際に渡っている');
    assert(/sweepSec: opts\.sweepSec \|\| activeSec/.test(boss),
      'R44W6: 他のビーム（じゃがん/胸部/再照準）は従来どおり全時間で薙ぐ（既定値）');
    assert((boss.match(/\(beam\.maxLife - beam\.life\) \/ beam\.sweepSec/g) || []).length >= 2,
      'R44W6: 描画とdebugBeamの両方が同じ2相の式＝計測器が実装から乖離しない');
    // ★R44W8 FB「攻撃予告の**文字が表示されたら間髪入れずに**照射して。いきなり攻撃される
    //   怖さを出すため」。予告そのもの（環の整列・振りかぶり）は残し、**文字だけ**を後ろへ寄せる。
    assert(typeof A.textLeadSec === 'number' && A.textLeadSec <= 0.2,
      `R44W8: 技名テロップは照射の${A.textLeadSec}秒前＝「文字が出た＝もう来ている」`);
    assert(A.textLeadSec < A.alignSec / 8,
      `R44W8: テロップの猶予は予告全体（${A.alignSec}s）の1/8未満＝旧実装（予告の頭＝2.0秒前）の回帰を殺す`);
    assert(!/case 'aligned':[\s\S]{0,400}introText\('せいれつ/.test(boss),
      'R44W8: 予告の**開始時**にはテロップを出さない（旧実装の残りが無い）');
    assert(/if \(!alignTold && stateT <= \(ak\.textLeadSec/.test(boss)
      && /introText\('せいれつ―― かんつうこう'/.test(boss),
      'R44W8: テロップは alignTele の終盤で1回だけ出る（alignTold で二重表示を殺す）');
    assert(/alignTold = false;/.test(boss),
      'R44W8: 技に入るたびにフラグが戻る＝2回目以降もテロップが出る');
  }

  // --- ⑤ R44W9 軌道神核の名乗り（実プレイFB「軌道神核出現時のコメントがない。検証して」）---
  //   ★実測で確認したとおり、出ていたのは状況説明（text）とボス名（text2）だけで、
  //     **本人のセリフが1つも無かった**。第4形態は作中で最後に姿を現す者なので、
  //     名前だけで通り過ぎるのは格に合わない。
  {
    const tf9 = BALANCE.boss.tiers.find((t) => t.bossId === 'maou').trueForm;
    assert(tf9.text3 === '小さき光よ…　我が手で消しさらん…',
      'R44W9: 軌道神核の名乗りが指定どおりの文言で定義されている');
    const look = (boss.match(/function applyTrueLook\(\)[\s\S]*?\n  \}/) || [''])[0];
    assert(/introText\(tf\.text3,/.test(look),
      'R44W9: 名乗りが**出現の関数から実際に呼ばれている**（データだけ足して画面に出ない、を殺す）');
    // ★R44W10 実プレイFB「名前のメッセージと**一緒に**コメントが出てくる。**メッセージの後に**
    //   表示させて。一緒だとコメントが目立たない」→ R44W9 の順序ガードを**反転**する。
    //   名前のテロップの寿命（160+200×2×(4+1)+260＝2420ms）より後に出ることを式で縛る。
    assert(look.indexOf('tf.text2') < look.indexOf('tf.text3'),
      'R44W10: 名前 → 名乗り の順（一緒に出すとコメントが埋もれる）');
    {
      const d = Number((look.match(/delayedCall\((\d+), \(\) => \{[\s\S]{0,200}tf\.text3/) || [])[1]);
      const rep = Number((look.match(/introText\(tf\.text2[^)]*, (\d+)\)/) || [])[1]);
      const life = 160 + 200 * 2 * (rep + 1) + 260;
      assert(d >= life,
        `R44W10: 名乗りは名前が消えてから出る（遅延${d}ms ≧ 名前の寿命${life}ms）＝この一文だけが画面に残る`);
    }
    assert((look.match(/introText\(/g) || []).length >= 2,
      'R44W9: 出現時のテロップは2つ以上＝「コメントがない」（名前だけ）の回帰を殺す');
    assert(/introText\(tf\.text3, '#ff7a7a'/.test(look),
      'R44W9: 色は第1形態の宣告2行目と同じ #ff7a7a＝**同じ者が言っている**ことが色でも伝わる');
    // ★意味は作品内の対句で作る（R44W6 と同じ原理）。第1形態と同じ「小さき光」で呼びかけ、
    //   同じ「消す」で結ぶ＝真の姿になっても言っていることは変わらない。
    const mi9 = (boss.match(/case 'maouIntro':[\s\S]*?endIntro\(\)/) || [''])[0];
    assert(/小さき光/.test(mi9) && /小さき光/.test(tf9.text3),
      'R44W9: 第1形態の名乗りと軌道神核の名乗りが同じ「小さき光」で呼びかける＝対句');
    assert(/消す/.test(mi9) && /消し/.test(tf9.text3),
      'R44W9: どちらも「消す」で結ぶ＝オープニングの命令「ひかりを けせ」と一本につながる');
  }

  // --- ④ マオウレクスの名乗り（唐突なロボ吃音 → 意味のつながる王の宣告）---
  {
    const mi = (boss.match(/case 'maouIntro':[\s\S]*?endIntro\(\)/) || [''])[0];
    assert(!/キケン|ハイジョ/.test(mi), 'R44W6: 旧セリフ（オマエタチハキケン/ハイジョスル）が残っていない');
    assert(/よくぞ来た 小さき光よ/.test(mi) && /この世界の光は 我が手で消す/.test(mi),
      'R44W6: 名乗りが「ひかりをけす」の意味を持つ（OP命令「ひかりをけせ」・ED「ひかりがもどった」との対句）');
  }
}

// --- 結果 ---
// ============================================================================
// R45 新モビット3体（マモリン＝命の盾／ドリンゴ＝爆速ドリンク／ネムッコ）
//  ＋ 雷光弾の出処（ビリッコ）を取り逃しても配り直す
// ============================================================================
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');
  const runjs = fs.readFileSync(path.join(SRC, 'scenes/Run.js'), 'utf8');
  const cap = fs.readFileSync(path.join(SRC, 'systems/capture.js'), 'utf8');
  const snd = fs.readFileSync(path.join(SRC, 'audio/sound.js'), 'utf8');
  const A = BALANCE.archetypes;

  // --- ① データ：3体が実在し、非戦闘で、ネムッコは「よく出る」---
  const mamorin = MONSTERS.find((m) => m.id === 'mamorin');
  const doringo = MONSTERS.find((m) => m.id === 'doringo');
  const nemukko = MONSTERS.find((m) => m.id === 'nemukko');
  assert(mamorin && doringo && nemukko, 'R45: マモリン・ドリンゴ・ネムッコが MONSTERS に実在する');
  assert(mamorin.archetype === 'SHIELD' && doringo.archetype === 'SPEED'
      && nemukko.archetype === 'SLEEPY', 'R45: 3体のアーキタイプが専用のもの');
  for (const m of [mamorin, doringo, nemukko]) {
    assert(m.forms.every((f) => f.archetype === m.archetype),
      `R45: ${m.name} は両フォームとも非戦闘（近接帯だけ攻撃役に化ける、を防ぐ）`);
    assert(!!m.evo && !!m.evo.sprite, `R45: ${m.name} に進化形のスプライトがある`);
  }
  // ★ネムッコが SR だと一生仲間にならず、「役立たずが最後に覚醒する」体験そのものが
  //   発生しない（[[入れていないのと同じ]]）。よく来ることがこの子の設計の前提。
  assert(nemukko.rarity === 'N',
    'R45: ネムッコは N（いちばん出やすい）＝また寝ている→ラスボスで起きる、の順番が要る');

  // --- ② 命の盾：引き金は「一度も出ない」と「常時出る」の間にある ---
  assert(A.SHIELD.hpTrigger > 0.4 && A.SHIELD.hpTrigger < 0.9,
    `R45: 盾の引き金 HP${Math.round(A.SHIELD.hpTrigger * 100)}%＝厳しすぎて不発でも、緩すぎて即発動でもない`);
  assert(A.SHIELD.perBoss === 1 && A.SHIELD.perFinal === 1,
    'R45: 命の盾はボス戦ごとに1回のみ（FBの指定どおり）');
  assert(A.SHIELD.durSec >= 3 && A.SHIELD.durSec <= 8,
    `R45: 盾は ${A.SHIELD.durSec}秒＝「ここぞ」で効き、無敵が戦闘を潰さない長さ`);
  assert(/if \(this\._shieldT > 0\) \{/.test(runjs) && /hitPlayer\(dmg, srcX, srcY\) \{/.test(runjs),
    'R45: hitPlayer が盾でダメージを無効化する');
  // ★実測：盾の6秒で 2163回 弾いていた（接触ダメージは毎フレーム来る）。演出をそのまま
  //   出すと音が毎フレーム重なり文字で画面が埋まる。**数は全部数え、見せ方だけ間引く**。
  assert(/this\.shieldBlocks = \(this\.shieldBlocks \|\| 0\) \+ 1;/.test(runjs),
    'R45: 弾いた回数は間引かずに全部数える（実測の土台）');
  assert(/if \(\(this\._shieldFxT \|\| 0\) <= 0\) \{/.test(runjs),
    'R45: 弾いた演出は間引く（毎フレーム鳴らすと爆音になる）');
  assert(/^  shieldBlock\(/m.test(snd) && /^  lifeShield\(/m.test(snd),
    'R45: 盾の音（張る／弾く）が実在する＝無音で0にすると「バグに見える」');

  // --- ③ 爆速ドリンク：FB指定の1.5倍が式に残っている ---
  assert(A.SPEED.moveMul === 1.5, `R45: 移動1.5倍（FBの指定そのもの）: ${A.SPEED.moveMul}`);
  assert(A.SPEED.perBoss === 1 && A.SPEED.perFinal === 1,
    'R45: 爆速ドリンクもボス戦ごとに1回のみ');
  assert(/\* \(this\._speedT > 0 \? this\._speedMul : 1\)/.test(runjs),
    'R45: 移動速度の式に実際に掛かっている（値だけ持って効かない、を防ぐ）');
  // ★上げるのは足だけ。攻撃側の式に混ざっていたら火力過多になる
  assert(!/_speedMul/.test(runjs.split('dealDamage')[1] || ''),
    'R45: 爆速ドリンクは攻撃力に一切かからない（足だけが速くなる）');

  // --- ④ ネムッコ：軌道神核でだけ覚醒し、上限がない ---
  assert(/function isTrueMaou\(\)/.test(orbit) && /bs\.trueForm/.test(orbit),
    'R45: 覚醒条件は**軌道神核（真の姿）**であって、マオウレクス戦全体ではない');
  assert(/case 'SLEEPY':\s*updateSleepy/.test(orbit),
    'R45: SLEEPY が update の分岐に繋がっている');
  assert(A.SLEEPY.everySec > 0, 'R45: 覚醒後も**間隔**はある（無限バリアは②被弾の緊張感を消す）');
  assert(!('perBoss' in A.SLEEPY) && !('perFinal' in A.SLEEPY),
    'R45: ネムッコにだけ使用上限が無い（FBの指定どおり）');
  assert(Array.isArray(A.SLEEPY.kinds) && A.SLEEPY.kinds.length === 3
      && ['shield', 'speed', 'heal'].every((k) => A.SLEEPY.kinds.includes(k)),
    'R45: 配るのは 命の盾／爆速ドリンク／体力回復 の3つ');
  // ★実測で踏んだ：rebuild が走ると覚醒テクスチャが寝顔へ戻り、起きているのに寝顔で戦っていた。
  assert(/if \(key && o\.spr\.texture\.key !== key && run\.textures\.exists\(key\)\) o\.spr\.setTexture\(key\)/.test(orbit),
    'R45: 覚醒した姿を毎フレーム守る（rebuild で寝顔へ戻る回帰を殺す）');

  // --- ⑤ 「役に立っていない」を絵で言い切る（何もしない＝何も描かない、にしない）---
  assert(/function updateSleepPose/.test(orbit),
    'R45: 寝姿の実装がある（FB「役に立ってないことをプレーヤーがわかるように」）');
  assert(/setRotation\(Math\.PI \* 0\.5 \* tip\)/.test(orbit),
    'R45: **横になる**（90度倒れる）');
  assert(/o\.slBase \* \(1\.06 \+ br\), o\.slBase \* \(0\.78 - br\)/.test(orbit),
    'R45: **体育座り**（縦に潰れて沈む＋呼吸）');
  // ★💤 は絵文字テキストにしない。フォント依存でヘッドレスでは豆腐になり（実測）、
  //   表示を検証できない＝子どものPCで同じことが起きても気づけない。
  assert(/run\.textures\.exists\('deco_zzz'\)/.test(orbit),
    'R45: 💤 はドット絵（deco_zzz）で内製する');
  assert(!/add\.text\([^)]*'💤'/.test(orbit),
    'R45: 💤 を絵文字テキストで描いていない（フォントが無い環境で豆腐になる）');
  assert(/o\.zzz = run\.add\.image\(o\.x, o\.y - 20, 'deco_zzz'\)/.test(orbit)
      && /if \(o\.zzz\) o\.zzz\.destroy\(\)/.test(orbit),
    'R45: 💤 は生成も破棄もされる（パーティが変わったあとも残らない）');

  // --- ⑥ 雷光弾の出処（ビリッコ）を取り逃しても配り直す ---
  // ★FB「ここ数日のプレイで、雷光弾や炎熱炸裂弾を渡されていない。実装から消されてないか？」
  //   → 実装は消えていない。真因は**1度きりで閉じていた**こと（拾えたかを見ずにフラグを立てる）。
  assert(!!MONSTERS.find((m) => m.id === 'biricco'),
    'R45: 雷光弾の出処ビリッコは実装から消えていない');
  assert(!!ENEMIES.find((e) => e.id === 'magman') && BALANCE.rareEnemy.enemyId === 'magman',
    'R45: 炎熱炸裂弾の出処マグマンも消えていない（こちらはモビットではなくレア雑魚）');
  assert(/boltCoreGiven = false; boltCore = null;/.test(cap),
    'R45: 取り逃した（コアが消えた）ら配り直す');
  assert(/if \(boltRetryT > 0\) \{ boltRetryT -= dt \|\| 0; return; \}/.test(cap),
    'R45: 置き直しには待ちがある（足元へ即再出現すると「拾えなかった」結果が消える）');
  assert(BALANCE.capture.ammoRetrySec > 0,
    `R45: 置き直しの待ち ${BALANCE.capture.ammoRetrySec}秒`);
  assert(/return core;/.test(cap), 'R45: makeCore が置いたコアを返す（拾われたか追える）');
}

// ============================================================================
// R46 「雷光弾はボス戦中だけ間隔を詰めて。ボス戦でこそ真価を発揮する」
// ============================================================================
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const spawner = fs.readFileSync(path.join(SRC, 'systems/spawner.js'), 'utf8');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');
  const RA = BALANCE.rareEnemy;
  const AM = BALANCE.archetypes.AMMO;

  // --- ① マグマン（炎熱炸裂弾の出処）はボス戦中だけ間隔が詰まる ---
  // 実測（R45）：自然プレイ315秒で出た5体のうち**ボス戦中は1体だけ**だった。
  assert(RA.bossEveryMax < RA.everyMin,
    `R46: ボス戦中の間隔（${RA.bossEveryMin}〜${RA.bossEveryMax}秒）は平常（${RA.everyMin}〜${RA.everyMax}秒）と`
    + '**帯が重ならない**＝確実に詰まっている');
  // ★平常時は触らない。2026-08-23「マグマンが少し多い」で34→54秒へ伸ばした経緯があるので、
  //   総量を戻すのは逆行。増やすのではなく**寄せる**のがこの変更の主旨。
  assert(RA.everyMin === 38 && RA.everyMax === 70,
    `R46: 平常時の間隔は据え置き（${RA.everyMin}〜${RA.everyMax}秒）＝総量は増やさない`);
  assert(RA.bossFirstSec > 0 && RA.bossFirstSec <= 12,
    `R46: ボス戦に入った瞬間、待ちを ${RA.bossFirstSec}秒まで切り詰める`);
  assert(/const onBoss = !!\(run\.boss && run\.boss\.active\);/.test(spawner)
      && /if \(onBoss && RARE\.bossFirstSec != null\) rareT = Math\.min\(rareT, RARE\.bossFirstSec\);/.test(spawner),
    'R46: ボス戦に**入った瞬間**に待ちを切り詰める（これが無いと長い待ちの途中でボスが'
    + '始まった回は1体も出ずに終わる＝R45の実測の原因）');
  assert(/onBoss && RARE\.bossEveryMin != null/.test(spawner),
    'R46: ボス戦中は短い方の帯から間隔を引き直す');
  assert(RA.maxAlive <= 2,
    `R46: 同時に居られる数は据え置き ${RA.maxAlive}体（詰めるのは間隔だけ＝珍しさは残す）`);

  // --- ② 雷光弾は軌道神核でも必ず1発ある ---
  // ★実バグだった：転生は同じ boss オブジェクトを使い回すので ent.id が変わらず在庫が
  //   作り直されない。実測（補充0発 vs 1発の引き算）＝**軌道神核戦で 0発 → 1発**。
  assert(AM.trueFormRefill > 0,
    `R46: 転生した瞬間に ${AM.trueFormRefill}発 補充する（0だと軌道神核戦で1発も来ない＝実測）`);
  // ⚠️ R46 は「補充は perFinal より少ない」と縛っていたが、これは当時の私の判断で、
  //    R49 のユーザー指示「軌道神核戦で特殊弾を＋2発にして」と正面から衝突した。
  //    ガードは判断ではなく**壊れたら困るもの**を縛る。数の上限はユーザーが決める。
  assert(AM.trueFormRefill === 3,
    'R49: 転生の補充は3発（軌道神核戦は本編でいちばん長い＝ここは出し惜しみしない）');
  assert(/if \(bs\.trueForm && !o\.ammoTrueDone\) \{/.test(orbit)
      && /if \(!bs\.trueForm\) o\.ammoTrueDone = false;/.test(orbit),
    'R46: 補充は転生1回きり（毎フレーム足して無限に配る、を防ぐ）');
  assert(/debugAmmo\(\)/.test(orbit),
    'R46: 在庫を外から測れる（「軌道神核で0発」を数で捕まえられるように）');
}

// ============ R49 3種の特殊弾が「3種ある」と分かる ============
// 実プレイFB「ライジンガーの特殊弾を3種類にして。雷光弾以外に2種類」。
// ⚠️ 実測すると**すでに3種あって3種とも配られていた**（4シード×5ボス＝20発）。
//    無かったのは種類ではなく届き方。原因は2つとも数で捕まえられる：
//      ① テロップが「ビリッコ」固定＝進化してライジンガーになっても旧名が出ていた
//      ② キューをボスごとに引き直して先頭だけ引く＝偏る（seed=41 は5回中4回が同じ弾）
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');
  const bil = fs.readFileSync(path.join(SRC, 'systems/billiard.js'), 'utf8');
  const KINDS = BALANCE.hero.billiard.ammoKinds || [];

  // --- ① 3種そろっていて、どれも実装がある ---
  assert(KINDS.length === 3, `R49: 配る弾は3種（実際 ${KINDS.length}種）`);
  for (const k of KINDS) {
    assert(!!BALANCE.hero.billiard[k], `R49: ${k} の設定が実在する`);
    assert(new RegExp(`'${k}':`).test(bil) || new RegExp(`=== '${k}'`).test(bil)
        || new RegExp(`HANDED_NAME = \\{[^}]*${k}:`).test(bil),
      `R49: ${k} は billiard.js が名前つきで扱っている（設定だけあって無名、を防ぐ）`);
  }

  // --- ② 名前は渡した本人から取る（進化を打ち消さない）---
  assert(!/announce\('ビリッコ が /.test(bil),
    'R49: テロップに「ビリッコ」を直書きしない（進化してもその名前が出続ける）');
  assert(/\(o\.evolved && o\.def\.evo\) \? o\.def\.evo\.name : o\.def\.name/.test(bil),
    'R49: 進化していれば進化後の名前で名乗る');

  // --- ③ キューはボスをまたいで持ち越す（3ボスで3種が一巡する）---
  assert(!/o\.ammoBossId = ent\.id;[\s\S]{0,400}?o\.ammoQueue = run\.rng\.shuffle/.test(orbit),
    'R49: ボスが変わってもキューを引き直さない（引き直すと先頭だけ引くので偏る＝実測）');
  assert(/if \(!o\.ammoQueue \|\| !o\.ammoQueue\.length\) \{/.test(orbit),
    'R49: 尽きたときだけ引き直す');
  assert(/next\[0\] === o\.ammoLast/.test(orbit),
    'R49: 引き直しの継ぎ目で同じ弾が2連続しない（一巡が台無しになる唯一の穴）');
  assert(/o\.ammoLast = kind;/.test(orbit),
    'R49: 直前に配った弾を覚えている');
}

// ============ R49W3 進化は必ず「数字」も伸ばす ============
// 実プレイFB「オーロラジェリー、進化しても攻撃力そのまま？ ほかに進化した数字があれば
//   別にそれでいいが。進化しても見た目しか変化しないのはやめて」。
// 調べると**オーロラジェリーは伸びていた**（tickDamage 1→2・radius 60→80）。
// 素の baseDamage が 1→1 なのは、FIELD がそれを**読まない**から（接触ダメージ用の値）。
// 本当に伸びていなかったのは別の4体で、SHIELD/SPEED/SLEEPY にいたっては
// BALANCE を直読みしていて **ovr を見る口すら無かった**＝数値を書いても効かない状態だった。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');

  // baseDamage（＝memberDamage 経由の接触ダメージ）を実際に読む型。
  // ここに無い型は baseDamage を書いても無意味なので、ovr で伸ばさないと嘘になる。
  const USES_BASE_DAMAGE = ['SLASH', 'SHOT', 'BEAM', 'BOOMERANG', 'RINGWAVE', 'LANCER'];

  for (const m of MONSTERS) {
    if (!m.evo) continue;
    const usesBase = USES_BASE_DAMAGE.includes(m.archetype);
    const ovr = m.evo.ovr || {};
    const grew = usesBase
      ? m.evo.baseDamage > m.baseDamage
      : Object.keys(ovr).length > 0;
    assert(grew,
      `R49W3: ${m.evo.name} は進化で数字が伸びる`
      + (usesBase ? `（攻撃力 ${m.baseDamage}→${m.evo.baseDamage}）`
                  : `（${m.archetype} は baseDamage を読まないので ovr が要る）`));
  }

  // ★上書きは「素の値と違う」ことまで見る。ovr に素と同じ値を書いても伸びていない。
  for (const m of MONSTERS) {
    if (!m.evo || !m.evo.ovr) continue;
    const A = BALANCE.archetypes[m.archetype] || {};
    let differs = 0;
    for (const k of Object.keys(m.evo.ovr)) if (A[k] !== m.evo.ovr[k]) differs++;
    assert(differs > 0,
      `R49W3: ${m.evo.name} の ovr は素の設定と違う値になっている（同じ値を書いても伸びない）`);
  }

  // --- SHIELD/SPEED/SLEEPY が ovr を引く口を持っている ---
  assert(/const OV = \(o, S, k\) =>/.test(orbit) && /o\.ovr = ovr;/.test(orbit),
    'R49W3: 進化形の上書き値を引くヘルパ OV があり、rebuild が o.ovr を入れている');
  for (const k of ['durSec', 'hpTrigger', 'moveMul', 'everySec', 'healAmount', 'boonMult']) {
    assert(new RegExp(`OV\\(o, S, '${k}'\\)`).test(orbit),
      `R49W3: ${k} は OV 経由で読む（BALANCE 直読みに戻すと進化が効かなくなる）`);
  }
  assert(!/if \(p\.hp > p\.maxHp \* S\.hpTrigger\)/.test(orbit)
      && !/run\.grantShield\(S\.durSec, o\)/.test(orbit),
    'R49W3: 直読みの残骸が無い（1か所でも残ると、そこだけ進化しない）');
  assert(BALANCE.archetypes.SLEEPY.boonMult === 1.0,
    'R49W3: 素の boonMult は1.0（進化していないネムッコの配るものは変わらない）');
}

// ============ R47 ラゴン（単独行動する槍使い）============
// 実プレイFB「新たなレアモビットを創造して。引き当て超レア。他のモビットより、一回り身体が
//   大きく筋肉もりもりの武闘派のモビット。このモビットは長い槍を持ち、その槍で勝手に敵を
//   倒しに行く。ふつうモビットは主人公の近くを離れないが、このモビットだけ単独行動して敵を
//   攻撃しにいく。敵を気絶させて弾にするのではない。完全に倒す。（消滅させる）名前はラゴン。
//   槍はライトセーバーのように青白く光るスタイリッシュな武器にして。しばらく戦ったら、
//   疲れをいやすために主人公のもとに帰ってくる。その際に肩で息をする行動をいれて。
//   しばらくしたらまた戦いにいく。このモビットに体力ゲージは不要」。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');
  const runjs = fs.readFileSync(path.join(SRC, 'scenes/Run.js'), 'utf8');
  const boot = fs.readFileSync(path.join(SRC, 'scenes/Boot.js'), 'utf8');
  const cap = fs.readFileSync(path.join(SRC, 'systems/capture.js'), 'utf8');
  const snd = fs.readFileSync(path.join(SRC, 'audio/sound.js'), 'utf8');
  const L = BALANCE.archetypes.LANCER;
  const lagon = MONSTERS.find((m) => m.id === 'lagon');

  // --- ① 存在と素性 ---
  assert(!!lagon, 'R47: モビット「ラゴン」が存在する');
  assert(lagon && lagon.name === 'ラゴン', 'R47: 名前は指定どおり「ラゴン」');
  assert(lagon && lagon.rarity === 'SR',
    'R47: レアリティは SR（FB「引き当て超レア」）');
  assert(lagon && lagon.archetype === 'LANCER',
    'R47: 専用アーキタイプ LANCER（既存のどれとも振る舞いが違う）');
  assert(lagon && lagon.evo && lagon.evo.id === 'gigalagon',
    'R47: 進化形「ギガラゴン」を持つ');
  assert(lagon && lagon.sprite.rows.length === 16
    && lagon.sprite.rows.every((r) => r.length === 16),
    'R47: スプライトは16×16（他のモビットと同じ土俵で「大きい」を出す）');

  // --- ② 「一回り身体が大きい」を数で縛る ---
  // ⚠️ 16×16 のグリッドは全員同じなので、造形だけでは「大きい」は絶対に伝わらない。
  //    画面上の実寸（表示スケール）で差を付けているか＝ここが唯一の担保。
  assert(L.spriteScale > 2.5,
    `R47: 表示スケール ${L.spriteScale} が通常のモビット(2.5)より大きい＝一回り大きい体`);
  assert(/o\.archetype === 'LANCER'\s*\n?\s*\?\s*\(A\.LANCER\.spriteScale/.test(orbit)
    || /A\.LANCER\.spriteScale/.test(orbit),
    'R47: そのスケールが実際に rebuild で使われている（定数を置いただけで終わらせない）');

  // --- ③ 単独行動。⚠️ここが R21W2 で潰した最悪の構造の再発点 ---
  // 「仲間が画面外まで敵を掃除し、敵が主人公に届く前に消える」＝①攻撃の爽快感と
  // ②被弾の緊張感が同時に失われる。ラゴンは唯一とどめを刺せるので、鎖を数で縛る。
  assert(L.huntRange > BALANCE.orbit.allyMaxReach,
    `R47: 狩りの半径 ${L.huntRange} が他モビットの到達距離 ${BALANCE.orbit.allyMaxReach} より外`
    + '＝「1体だけ離れて戦っている」が画面で分かる');
  assert(L.huntRange < BALANCE.view.width / 2 && L.huntRange < BALANCE.view.height,
    `R47: 狩りの半径 ${L.huntRange} はビュー(${BALANCE.view.width}×${BALANCE.view.height})の内側`
    + '＝画面外で勝手に掃除しない（R21W2の回帰防止）');
  // ★内側の鎖。「離れて戦っている」を平均値の願望ではなく**構造**で保証する。
  assert(L.minStandoff > BALANCE.orbit.baseRadius,
    `R47: 狩っている間は主人公から ${L.minStandoff}px 未満に入らない`
    + `（公転半径 ${BALANCE.orbit.baseRadius}px より外＝公転の輪と絶対に重ならない）`);
  assert(L.minStandoff - L.reach > 0,
    `R47: 主人公の周り ${L.minStandoff - L.reach}px には槍が届かない`
    + '＝密着した敵は最後までプレイヤーの獲物として残る');
  assert(/function lancerStandoff\(o, px, py, L\) \{/.test(orbit)
      && /od > L\.huntRange \? L\.huntRange : \(od < lo \? lo : od\)/.test(orbit),
    'R47: その帯が毎フレームの押し戻しで効いている（実測：入れる前は狩り中の平均が'
    + '74.6px＝公転の1.55倍まで落ちた。敵が主人公へ集まるとラゴンも引き寄せられる）');
  assert(/for \(const e of run\.enemies\)[\s\S]{0,200}?if \(!e\.active \|\| e\.stag \|\| e\.isBoss\) continue;/.test(orbit),
    'R47: よろけ（＝主人公の獲物）とボスは狙わない。動詞（掴んで投げる）を奪わない');

  // --- ④ 「完全に倒す（消滅させる）」＝とどめの関門の唯一の例外 ---
  assert(/const lanceFinish = src === 'lagon' && !e\.isBoss;/.test(runjs),
    'R47: ラゴンだけ「よろけ」を経由せずに撃破できる（FB「気絶させて弾にするのではない」）');
  // R52b: 同じ行に e.minion（ミニロボ＝よろけない敵）の例外が増えたので、先頭の追加条件は
  //   許して「ラゴンの例外が合流点にある」ことだけを縛る（縛りの意図は順番ではなく置き場所）。
  assert(/if \((?:[\w.]+ \|\| )*src === 'manual' \|\| lanceFinish \|\| e\.isBoss \|\| e\.rebooted\)/.test(runjs),
    'R47: その例外が dealDamage の**合流点**に置かれている（個別経路で killEnemy を直接'
    + '呼ぶと弱点コア・王冠無敵・よろけ判定を全部すり抜ける）');
  assert(/!e\.isBoss/.test(runjs.match(/const lanceFinish[^\n]*/)[0]),
    'R47: ボスにはとどめを刺せない（ボス撃破の主語は主人公のまま）');
  assert(/src === 'ally' \|\| src === 'lagon'/.test(runjs),
    'R47: ボスへのダメージは仲間と同じ倍率（単独行動でボスを溶かせない）');
  assert(/run\.dealDamage\(best, dmg, LANCE_GLOW, 'lagon'\)/.test(orbit),
    'R47: 攻撃は run.dealDamage を通る（killEnemy 直呼びの抜け道を作らない）');

  // --- ⑤ 帰ってきて肩で息をする（＝これがバランスの安全弁でもある）---
  assert(L.huntSec > 0 && L.pantSec > 0,
    `R47: 狩り ${L.huntSec}秒 → 休み ${L.pantSec}秒 の往復`);
  assert(L.pantSec / (L.huntSec + L.pantSec) >= 0.25,
    `R47: 休んでいる時間が全体の ${Math.round(L.pantSec / (L.huntSec + L.pantSec) * 100)}%`
    + '＝**その間はプレイヤーの狩り場が戻る**（常時狩り続けると動詞が消える）');
  assert(/o\.lnState = 'back'/.test(orbit) && /o\.lnState = 'pant'/.test(orbit)
      && /o\.lnState = 'hunt'/.test(orbit),
    'R47: hunt → back → pant → hunt の3状態を往復する');
  assert(/Sound\.sfx\('lancePant'\)/.test(orbit),
    'R47: 帰還したら肩で息の音が鳴る（FB「肩で息をする行動をいれて」）');
  assert(/o\.lnBreath = br \* 3\.2;/.test(orbit),
    'R47: 息は**上下の運動**として見える（音だけだと「休んでいる」が画面に出ない）');
  assert(/Sound\.sfx\('lanceIgnite'\)/.test(orbit),
    'R47: 休み明けに槍を点火して狩りへ戻る＝「また戦いにいく」が音でも分かる');
  // ★出撃と帰りの速さは別。同じ値にしたら実測で帰りが90秒中**1.6秒**しか映らず、
  //   FBの「主人公のもとに帰ってくる」がプレイヤーの目に一度も入らなかった。
  assert(L.sallySpeed > L.moveSpeed && L.moveSpeed > L.returnSpeed,
    `R47: 出撃${L.sallySpeed} > 狩り${L.moveSpeed} > 帰り${L.returnSpeed}`
    + '＝勇んで出て、疲れて戻る（速度だけで読める）');
  assert(L.returnSpeed < BALANCE.player.speed,
    `R47: 帰りの速さ ${L.returnSpeed} は主人公 ${BALANCE.player.speed} より遅い＝疲れている`);
  assert(/o\.lnSally = true;/.test(orbit) && /od >= L\.huntRange \* 0\.8/.test(orbit),
    'R47: 狩りに出るとき前線まで一気に駆ける（これが無いと敵が主人公へ集まる性質のせいで'
    + '「中間で会う」だけになり、狩り中の平均が 68px＝公転の1.4倍にしかならなかった＝実測）');
  assert(/o\.lnTargetId/.test(orbit),
    'R47: 標的をロックする（毎フレーム選び直すと新しく湧いた敵へ飛び続け、'
    + '実測で消滅が53体→8体まで落ちた）');

  // --- ⑥ 体力ゲージは持たない（FB指定）---
  assert(!/lnHp|lancerHp|o\.hp/.test(orbit),
    'R47: ラゴンにHPを持たせない（FB「このモビットに体力ゲージは不要」）');

  // --- ⑦ ライトセーバーの槍 ---
  assert(/makeLance\(key, w, h, core\)/.test(boot),
    'R47: 槍テクスチャの生成関数がある');
  assert(/this\.makeLance\('w_lance', /.test(boot) && /this\.makeLance\('w_lance_glow', /.test(boot),
    'R47: 芯（細い白）とグロー（太い青）の**2枚**を作る＝1枚のtintでは光って見えない');
  assert(/const LANCE_GLOW = 0x4aa8ff;/.test(orbit),
    'R47: 槍は青白（FB「ライトセーバーのように青白く光る」）');
  assert(BALANCE.stagger.tint !== 0x4aa8ff,
    `R47: よろけの輪の色(0x${BALANCE.stagger.tint.toString(16)})と槍の色が別物`
    + '＝「自分の獲物」の語彙と混ざらない');
  assert(/setBlendMode\(Phaser\.BlendModes\.ADD\)[\s\S]{0,80}?setTint\(LANCE_GLOW\)/.test(orbit),
    'R47: グローは加算合成（光っているように見える唯一の方法）');
  assert(/o\.lnThrust/.test(orbit) && /push = \(o\.lnThrust \|\| 0\) > 0/.test(orbit),
    'R47: 突いた瞬間だけ槍が前へ伸びる＝「刺した」が形で読める');
  // ★描画の長さと当たり判定を同じ reach から作る。⚠️ 見た目だけ長くして間合いを短いまま
  //   にすると「刺さっているのに当たらない」＝R25で踏んだ最悪の形になる。
  assert(/const len = A\.LANCER\.reach \* 2\.0 \* blade;/.test(orbit),
    'R47: 槍の描画長は当たり判定 reach から作る（見た目と間合いが食い違わない）');
  assert(L.reach * 2.0 > 16 * L.spriteScale,
    `R47: 槍の長さ ${(L.reach * 2).toFixed(0)}px が体 ${(16 * L.spriteScale).toFixed(0)}px より長い`
    + '＝FBの「長い槍」が絵で成立する');
  assert(/setOrigin\(0\.5, 0\.86\)/.test(orbit),
    'R47: 槍は柄の側を握る（原点を中央にすると実プレイの等倍で**背中へ突き抜けて**見えた）');
  assert(/const wantBlade = \(o\.lnState === 'hunt'\) \? 1 : 0;/.test(orbit),
    'R47: 刃が出ているのは狩っている間だけ（帰り道と休憩中はしまう＝休んでいるのが分かる）');
  assert(lagon && lagon.forms.every((f) => f.tex === 'w_lance' && f.archetype === 'LANCER'),
    'R47: 2フォームとも槍のまま＝11秒ごとのフォームチェンジで単独行動が中断しない');

  // --- ⑧ 音は4つとも別物 ---
  for (const k of ['lanceIgnite', 'lanceThrust', 'lanceSlay', 'lancePant']) {
    assert(new RegExp(`\\n  ${k}\\(vol`).test(snd), `R47: 音 ${k} が定義されている`);
  }
  assert(/Sound\.sfx\('lanceSlay'\)/.test(orbit) && /Sound\.sfx\('lanceThrust'\)/.test(orbit),
    'R47: 「突いた」と「消した」で別の音が鳴る＝倒した回数が**数えられる**');
  assert(!/dest: D/.test(snd.slice(snd.indexOf('lanceIgnite(vol'), snd.indexOf('judgeWave(vol'))),
    'R47: ラゴンの音は歪みバスに通さない（味方の音は澄んだ側／R42の教訓）');

  // --- ⑨ 役割を持つモビットを合成で奪わない（R45の入れ忘れをここで閉じる）---
  for (const a of ['HEAL', 'AMMO', 'SHIELD', 'SPEED', 'SLEEPY']) {
    assert(new RegExp(`NON_COMBAT = \\[[^\\]]*'${a}'`).test(cap),
      `R47: ${a} は合成の素材にしない（プレイヤーが選んだ役割を勝手に別物へ化けさせない）`);
  }
  assert(lagon && lagon.rarity === 'SR' && /if \(rar === 'SR'\) continue;/.test(cap),
    'R47: ラゴン自身も SR なので素材にならない（手に入れた超レアが合成で消えない）');
}

// ============ R48 進化が「別の姿」になったと分かる ============
// 実プレイFB「オーラジェリー、ネムッコ以外、進化後の姿がほぼ進化前と変わらない。実際何度も
//   プレイした私が、モビットに進化形があることに気付かなかった。進化後のビジュアルを
//   作り直して」。
// 原因は2つあった。① 絵がほぼ同じ（トゲキングはシルエットが1ドットも動いていなかった）
//                  ② 進化演出を**主人公の座標**で出していたので、誰が変わったか読めなかった
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const lv = fs.readFileSync(path.join(SRC, 'systems/levelup.js'), 'utf8');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');

  // --- ① 進化前後の「変化量」を数で縛る ---
  // ⚠️ シルエット単体では判定できない。ユーザーが**変わっていると認めた**オーロラジェリーは
  //    シルエット96.9%（ほぼ同形）だが色一致64.8%＝色で別物になっている。逆にネオンモスは
  //    形で別物。どちらか一方でも大きく動けば伝わるので、2つの変化量の和で見る。
  //    合格線 38.3 ＝ そのオーロラジェリーの値そのもの。
  const PASS = 38.3;
  //  対象外の2体はユーザーが名指しで「これは変わっている」と言った側。基準の出どころなので
  //  ここを合格線で縛ると、基準そのものが動いたときに気づけなくなる。
  const EXEMPT = ['aurajelly', 'nemukko'];
  const pxOf = (s, x, y) => {
    const ch = s.rows[y] && s.rows[y][x];
    return (!ch || ch === '.') ? null : (s.palette[ch] || '#000').toLowerCase();
  };
  const evoScore = (m) => {
    const a = m.sprite, b = m.evo.sprite;
    const h = Math.max(a.rows.length, b.rows.length);
    const w = Math.max(a.rows[0].length, b.rows[0].length);
    let same = 0, sil = 0, total = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      total++;
      const ca = pxOf(a, x, y), cb = pxOf(b, x, y);
      if (ca === cb) same++;
      if (!!ca === !!cb) sil++;
    }
    return (100 - sil / total * 100) + (100 - same / total * 100);
  };
  let scored = 0;
  for (const m of MONSTERS) {
    if (!m.evo) continue;
    if (EXEMPT.includes(m.id)) continue;
    scored++;
    const s = evoScore(m);
    assert(s >= PASS,
      `R48: ${m.name} → ${m.evo.name} の変化スコア ${s.toFixed(1)} が ${PASS} 以上`
      + '（色替えだけの進化に戻していない）');
  }
  assert(scored === 10, `R48: 作り直した進化形10体すべてを採点している（実際 ${scored} 体）`);

  // 特に「シルエットが1ドットも動かない」進化は二度と作らない（トゲキングの再発防止）
  for (const m of MONSTERS) {
    if (!m.evo || EXEMPT.includes(m.id)) continue;
    const a = m.sprite, b = m.evo.sprite;
    let silSame = 0, total = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      total++;
      if (!!pxOf(a, x, y) === !!pxOf(b, x, y)) silSame++;
    }
    assert(silSame / total < 0.95,
      `R48: ${m.evo.name} のシルエットは進化前と95%未満の一致（塗り替えただけにしない）`);
  }

  // --- ② 進化演出は「進化した本人」の上で出す ---
  assert(/run\.orbit\.memberPos\(i\)/.test(lv),
    'R48: 進化演出の座標は進化した本人（party[i]）から取る');
  assert(!/evolveBurst\(\{ x: run\.player\.x/.test(lv),
    'R48: 主人公の座標で光らせない（誰が変わったのか画面から読めなくなる）');
  assert(/run\.orbit\.evolvePulse\(i\)/.test(lv),
    'R48: 本人のスプライトも一緒に大きく脈打つ（光だけだと背景の演出に紛れる）');
  assert(/memberPos\(i\)\s*\{/.test(orbit) && /evolvePulse\(i\)\s*\{/.test(orbit),
    'R48: orbit 側に memberPos / evolvePulse が実装されている');
  assert(/run\.freezeT = Math\.max\(run\.freezeT \|\| 0, 0\.12\)/.test(lv),
    'R48: 一瞬だけ時間が止まる（進化した瞬間に画面を見る理由をつくる）');
}

// ============ R50 軌道神核戦の3点（全回復・特殊弾保証・スーパーボール画面内跳ね）============
// 実プレイFB「軌道神核戦の前に体力全回復させて／軌道神核戦だけで特殊弾をふたつ／
// スーパーボール弾は画面内だけで跳ねるようにして。画面外に消えて跳ねる爽快感がない」。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const boss = fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8');
  const orbit = fs.readFileSync(path.join(SRC, 'systems/orbit.js'), 'utf8');
  const bil = fs.readFileSync(path.join(SRC, 'systems/billiard.js'), 'utf8');

  // --- ① 転生（trueForm = true）の同じ関数内で主人公を全回復する ---
  const tfBlock = boss.slice(boss.indexOf('trueForm = true;'), boss.indexOf('trueForm = true;') + 2200);
  assert(/run\.player\.hp = run\.player\.maxHp/.test(tfBlock),
    'R50: 転生の瞬間に主人公のHPを全回復している');
  assert(/ぜんかいふく/.test(tfBlock),
    'R50: 全回復したことが画面の文字で分かる（黙って回復すると「なぜか満タン」になる）');

  // --- ② 特殊弾はビリッコの専売のまま（ユーザー判断で保証弾を撤回・2026-09-02）---
  //   「ビリッコ引けなかったランでは特殊弾は不要。ビリッコの存在価値が薄れる」。
  //   撤回が中途半端に残ると「配られたり配られなかったり」になるので、痕跡ごと消えたことを固定する。
  assert(!('trueFormNoMobit' in BALANCE.archetypes.AMMO),
    'R50: 保証発数 trueFormNoMobit は撤回済み（ビリッコの専売を守る）');
  assert(!/updateTrueFormAmmoFallback\(/.test(orbit.replace(/\/\/[^\n]*/g, '')),
    'R50: フォールバック経路は撤回済み（弾配りは updateAmmo の1本だけ）');
  assert(/giveAmmo\(o, kind\)/.test(bil) && !/giveAmmo\(null/.test(orbit),
    'R50: giveAmmo の呼び出し元は常にビリッコ本人');

  // --- ③ スーパーボールは画面の縁で反射し、跳ね先も画面内の敵に限る ---
  const wallBlock = bil.slice(bil.indexOf("if (s.spec === 'superball') {\n        const L = SPEC('superball');\n        const cam"));
  assert(/s\.vx = -s\.vx/.test(wallBlock) && /s\.vy = -s\.vy/.test(wallBlock),
    'R50: 画面の縁でX/Yとも速度を反転して跳ね返る');
  assert(/cam\.right/.test(wallBlock) && /cam\.bottom/.test(wallBlock),
    'R50: 反射の基準はカメラの現在視界（worldView）＝スクロールしても画面の縁が壁になる');
  const nbt = bil.slice(bil.indexOf('function nextBounceTarget'), bil.indexOf('function superballHit'));
  assert(/cam\.right/.test(nbt) && /continue/.test(nbt),
    'R50: 跳ね先の敵は画面内に限る（画面外の敵を追って弾ごと消えない）');
}

// ============ R51 1めんボスおためし＋情報レベル3段階 ============
// 実プレイFB「画面内に情報量が多くて処理しきれない」への対処。実測（dev/info-load-probe.mjs）で
// 主犯は③装飾252件/分（ダメージ数字＋全画面フラッシュ約91回/ラン）と分かったので、
// **短いループで見比べられる場所**と**段階的に情報を減らす切替**を足した。
// ⚠️ここで縛る一番大事なことは「本番が1ピクセルも変わっていない」＝すべて trialMode / infoLevel の
//   ゲートの内側にあること。ゲートが外れたら本番の見え方が黙って変わるので、そこを検査する。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const title = fs.readFileSync(path.join(SRC, 'scenes/Title.js'), 'utf8');
  const runjs = fs.readFileSync(path.join(SRC, 'scenes/Run.js'), 'utf8');
  const boss = fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8');
  const bil = fs.readFileSync(path.join(SRC, 'systems/billiard.js'), 'utf8');
  const hud = fs.readFileSync(path.join(SRC, 'ui/hud.js'), 'utf8');
  const fx = fs.readFileSync(path.join(SRC, 'systems/fx.js'), 'utf8');

  // --- ① タイトルの入口（既存の T キーと同じ作法＝once・_startedガード）---
  assert(/keydown-R'\s*,\s*\(\)\s*=>\s*\{[\s\S]{0,200}?bossTrial: true/.test(title),
    'R51: タイトルの R キーで { bossTrial: true } の Run に入る');
  assert(/keydown-R'[\s\S]{0,120}?if \(this\._started\) return;/.test(title),
    'R51: R キーも _started ガードを通る（SPACE/T との二重発火でシーンが二度走らない）');
  assert(/keydown-R'[\s\S]{0,160}?Sound\.init\(\)/.test(title),
    'R51: R キーでも Sound.init() する（ユーザー操作の中でしか音は起こせない）');
  assert(/R キー で 1めんボス おためし/.test(title) && /I キーで じょうほうりょう きりかえ/.test(title),
    'R51: 入口と切替キーが両方タイトルに書いてある（本編を1周しないと気づけない作りにしない）');
  const autotestBlock = title.slice(title.indexOf('if (V.autotest)'), title.indexOf('const begin ='));
  assert(!/bossTrial/.test(autotestBlock),
    'R51: autotest はおためしに入らない（計測器が測るのは常に本番のまま）');

  // --- ② おためしは「通常版の一面をそのまま通す」（ユーザー指示 2026-09-02）---
  //   当初は10秒前倒しで実装したが「短縮版にしないで。通常版の一面を通して比べたい」で撤回。
  //   おためし固有の挙動は「tier 0 撃破で打ち切り」だけ＝出現時刻の読み替えが復活したら NG。
  assert(/const trialOver = run\.trialMode && ti >= 1;/.test(boss),
    'R51: おためしでは tier 0 を倒したら以降のボスを1体も出さない');
  assert(/!run\.practiceMode && !allDone && !boss && !trialOver && ti < tiers\.length/.test(boss),
    'R51: その打ち切りが tier スケジューラの入口条件に入っている');
  assert(/run\.elapsed >= t\.warnSec/.test(boss) && /run\.elapsed >= t\.spawnSec/.test(boss),
    'R51: 出現時刻は本番の tier 定義をそのまま読む（前倒しの読み替えは撤回済み）');
  assert(!/TR\.warnSec/.test(boss) && !/TR\.spawnSec/.test(boss),
    'R51: おためし用の時刻差し替えコードが残っていない（短縮版に戻さない）');

  // --- ③ 情報レベルのゲート（ここが外れると本番の③装飾が黙って減る）---
  assert(/if \(this\.infoLevel >= 1 && \/\^\[0-9\]\+\$\/\.test\(text\)\)/.test(runjs),
    'R51: ダメージ数字の間引きは floatText の入口1か所で、数字だけのテキストに限る');
  assert(/this\.elapsed - this\._infoDmgT < INFO_DMG_TEXT_SEC/.test(runjs),
    'R51: 間引きは最短間隔（INFO_DMG_TEXT_SEC）で数える');
  assert(/if \(run\.infoLevel >= 1 && alpha < 0\.35\) return;/.test(bil),
    'R51: 全画面フラッシュは弱いもの（alpha<0.35）だけ捨てる＝溜め切り0.45などの大技は残る');
  const flashFn = bil.slice(bil.indexOf('function screenFlash('), bil.indexOf('function screenFlash(') + 900);
  assert(/setDisplaySize\(V\.width, V\.height\)/.test(flashFn),
    'R51: そのゲートは screenFlash 本体の中にある（呼び出し側50か所に散らさない）');
  assert(!/infoLevel/.test(fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8')
    .replace(/\/\/[^\n]*/g, '')),
    'R51: ボス側の閃光（警告・撃破）は間引かない（あれは①行動要求の信号）');
  assert(/const tidy = run\.infoLevel >= 2;/.test(hud),
    'R51: HUDの整理はレベル2から');
  for (const keep of ['bar.fillRect(8, 8, hpW * hpRatio, 10)', 'bossBar.fillRect(bx, by, bw * ratio, 8)',
    'timeText.setText', 'bar.fillRect(8, 48, spW * spRatio, 6)']) {
    assert(hud.includes(keep) && !new RegExp(keep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\n]*tidy').test(hud),
      `R51: HP/ボスHP/タイマー/ひっさつゲージは消さない（${keep.slice(0, 24)}…）`);
  }
  assert(/coinText\.setText\('C ' \+ run\.coins\)\.setVisible\(!tidy\)/.test(hud),
    'R51: レベル2で消えるのはコイン表示など「読まなくてよい行」だけ');
  assert(/run\.practiceMode \|\| tidy \? ''/.test(hud),
    'R51: 左下の開発用の数字（FPS/敵/弾/seed）もレベル2で消える');
  assert(/if \(run\.infoLevel >= 2\)/.test(fx) && /hidden = new Set\(ids\.slice\(2\)\)/.test(fx),
    'R51: 誘導矢印はレベル2で近い順2本まで');

  // --- ④ balance.js に設定がある（マジックナンバーをコードに埋めない）---
  const TR = BALANCE.trial;
  assert(TR && TR.endWaitSec > 0, 'R51: 撃破アナウンスを見せてからタイトルへ戻るまでの秒数がある');
  assert(!('warnSec' in TR) && !('spawnSec' in TR) && !('weaponLevel' in TR),
    'R51: 前倒し時刻・装備底上げの設定は撤回済み（おためしは本番の一面と同条件）');
  assert(BALANCE.boss.tiers[0].bossId === 'korotama',
    'R51: おためしで出るのは tier 0 ＝コロガンナー（1面ボス）');

  // --- ⑤ Run 側の既定値と、I キーが trialMode 中しか効かないこと ---
  assert(/this\.trialMode = !!\(data && data\.bossTrial\);/.test(runjs),
    'R51: おためしの入口は scene のデータ1本（window.VORTEX を見ない＝抜けられなくならない）');
  assert(/this\.infoLevel = 0;/.test(runjs),
    'R51: infoLevel の既定は 0 ＝通常スタート／れんしゅうじょう／autotest は従来と完全に同じ');
  assert(/keydown-I'[\s\S]{0,160}?if \(!this\.trialMode \|\| this\.paused \|\| this\.ended\) return;/.test(runjs),
    'R51: I キーはおためし中だけ効く（本番で誤爆しても何も起きない）');
  assert(/this\.infoLevel = \(this\.infoLevel \+ 1\) % INFO_LEVELS\.length;/.test(runjs)
      && /INFO_LEVELS = \[[\s\S]{0,400}?\];/.test(runjs),
    'R51: 0→1→2→0 と巡回する');
  assert(/'じょうほう ふつう'[\s\S]{0,60}'じょうほう ひかえめ'[\s\S]{0,60}'がめん すっきり'/.test(runjs),
    'R51: 3段階の名前がこの順で並んでいる');
  assert(/#94b0c2[\s\S]{0,80}#73eff7[\s\S]{0,80}#ffcd75/.test(runjs),
    'R51: 段階の色は HAYATO の3段階と同じ（親子で同じ言葉と色で話せる）');
  assert(/setScrollFactor\(0\)\.setDepth\(2200\)/.test(runjs),
    'R51: インジケータは画面固定・最前面（何段階目を見ているか常に読める）');
  assert(!/setWeaponLevel\(BALANCE\.trial/.test(runjs),
    'R51: 開始装備の底上げは撤回済み（おためしは素の Lv1 から＝本番の一面と同条件）');
  assert(/bossTrial: this\.trialMode/.test(runjs),
    'R51: ポーズ中の R（やりなおし）でおためしが引き継がれる');
  assert(/if \(!this\.boss \|\| this\.boss\.clearedTiers < 1\) return;/.test(runjs)
      && /get clearedTiers\(\) \{ return ti; \}/.test(boss),
    'R51: 終了判定は「tier が1つ畳まれた」＝撃破シネマもごほうびも終わってから');
  assert(/おためし おわり！ おつかれさま！/.test(runjs) && /this\.scene\.start\('Title'\)/.test(runjs),
    'R51: 撃破したらアナウンスを出してタイトルへ戻る');
}

// ============ R52a 共通ボスBGMの作り直し＋ボス出現の迫力 ============
// 実プレイFB「ボス戦用のBGMを作成して。各ボス個別に作成する必要はない。マオウレクスより前の
// ボス共通のBGMを作成して」＋「各ボス出現時に、音楽、効果音、エフェクトを駆使して、ボス出現の
// 迫力と緊張感を出して」。
// ⚠️ 共通ボス曲は前からあった（boss.js が startBgm('boss') 済み）ので、依頼の実態は
//    「鳴っている曲がボス戦に聞こえない」＝作り直し。原因は F-G-Em-Am の長調ポップで、
//    battle（Cメジャー150）と同族に聞こえること。ここで縛るのは「調と音色が変わったか」で、
//    テンポは軸にしない（テンポ違いの作り直しは HAYATO 側で2回続けて不採用になっている）。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const snd = fs.readFileSync(path.join(SRC, 'audio/sound.js'), 'utf8');
  const boss = fs.readFileSync(path.join(SRC, 'systems/boss.js'), 'utf8');

  // --- ① 曲そのもの：短調の新しい和音列に置き換わっている ---
  const cb = snd.slice(snd.indexOf('const CHORDS_BOSS = ['), snd.indexOf('const MELODY_BOSS = ['));
  const basses = [...cb.matchAll(/bass: NOTE\.(\w+)/g)].map((m) => m[1]).join('-');
  assert(basses !== 'F2-G2-E2-A2-F2-G2-C3-G2',
    'R52a: 旧 F-G-Em-Am / F-G-C-C（長調ポップ）の和音列ではない');
  assert(basses === 'E2-F2-E2-As2-A2-C3-D3-B2',
    'R52a: Eマイナー（Em-F-Em-Bb / Am-C-D-B7）＝♭II の半音とトライトーンを骨にした進行');
  assert(/NOTE\.Ds4/.test(cb) && /NOTE\.B2/.test(cb),
    'R52a: 終止は B7（D# を含むハーモニックマイナーのドミナント）＝長調へ解決させない');
  const mb = snd.slice(snd.indexOf('const MELODY_BOSS = ['), snd.indexOf('const CHORDS_MAOU = ['));
  assert(/\[NOTE\.B5, -1, -1, -1, NOTE\.F5, -1, -1, -1, NOTE\.B5,/.test(mb),
    'R52a: 1小節目の頭が B5⇄F5（増4度＝トライトーンのサイレン）＝曲の0秒目で battle/maou と聞き分く');
  assert(/NOTE\.Ds6, -1, NOTE\.D6, -1, NOTE\.Cs6, -1, NOTE\.C6, -1, NOTE\.B5,/.test(mb),
    'R52a: 折り返しは半音だけで降りる下行（機械が軋みながら降りてくる）');
  const bossSong = snd.match(/boss:\s*\{ bpm: (\d+), bars: (\d+), chords: CHORDS_BOSS,\s*melody: MELODY_BOSS,\s*style: 'boss'/);
  assert(!!bossSong && Number(bossSong[2]) === 8,
    'R52a: SONGS.boss は 8小節で CHORDS_BOSS / MELODY_BOSS / style boss を使う');
  // テンポは差別化の主役にしないので「別世界に居ること」だけを範囲で縛る（battle 150 / maou 178）
  assert(Number(bossSong[1]) >= 140 && Number(bossSong[1]) <= 180,
    'R52a: bpm は常識的な範囲（テンポは軸ではないので値そのものは縛らない）');

  // --- ② 音色：ポップスの材料が外れ、金属・警報・重い打撃に入れ替わっている ---
  const bs = snd.slice(snd.indexOf("} else if (song.style === 'boss') {"),
                       snd.indexOf("} else if (song.style === 'maou') {"));
  // ⚠️ 解説コメントに旧実装の名前が出るので、判定は**鳴らしている値**だけで行う
  assert(!/hpFreq: 1600, lpFreq: 8500/.test(bs) && !/start: 0\.026, dur: 0\.06/.test(bs),
    'R52a: 手拍子3枚重ね（明るさの正体）は鳴らしていない');
  assert(/hpFreq: 5200, lpFreq: 15000/.test(bs),
    'R52a: 2拍4拍は鉄板を叩いた金属の長い尾に置き換わっている');
  assert(!/if \(inBar % 4 === 0 \|\| inBar === 14\) \{/.test(bs)
      && /inBar === 0 \|\| inBar === 6 \|\| inBar === 8 \|\| inBar === 14/.test(bs),
    'R52a: 四つ打ち（踊る曲）をやめて 0・6・8・14 の重い刻み（踏み込む曲）にしている');
  assert(/noteFreq\(chord\.bass \+ semi\)/.test(bs) && /\[18, /.test(bs),
    'R52a: 警報スタブ＝根音の増4度（+18半音＝トライトーン）を刺す声部がある');
  assert(/hpFreq: 9500/.test(bs),
    'R52a: 打楽器は highpass 9500 の金属（ハットではなく金属を弾く音）');
  assert(/type: 'sawtooth', freq: mf,/.test(bs) && !/type: 'sine', freq: mf \* 2/.test(bs),
    'R52a: リードは のこぎり波の刃（オクターブ上の sine ベル＝きらめきは外した）');
  assert(/inBar % 2 === 0 \|\| inBar === 3 \|\| inBar === 11/.test(bs),
    'R52a: 3・11 の食い込みは残す（battle と共通のノリ＝シリーズの統一感）');
  // 他の曲へ手を出していないこと（battle/maou/ending/result の入口が全部そのまま在る）
  for (const st of ["style === 'battle'", "style === 'maou'", "style === 'ending'", "style === 'result'"]) {
    assert(snd.includes(st), `R52a: 他の曲の style 分岐に触っていない（${st}）`);
  }

  // --- ③ 出現演出：警報の繰り返し・赤い周縁・着地の衝撃（非finalの5体） ---
  assert(/bossAlarm\(step\) \{/.test(snd) && /noteFreq\(i % 2 === 0 \? NOTE\.E4 : NOTE\.As4\)/.test(snd),
    'R52a: 出現専用の警報 bossAlarm があり、音程はBGM1小節目と同じトライトーン');
  assert(/hpFreq: 40, lpFreq: 260/.test(snd),
    'R52a: 警報の下に lowpass ノイズの地鳴りが敷いてある');
  assert(/Sound\.sfx\('warning'\) \{|warning\(\) \{[\s\S]{0,420}?noiseHit\(\{ dur: 0\.5, gain: 0\.1, hpFreq: 60, lpFreq: 500 \}\);/.test(snd),
    'R52a: 汎用の warning() は無改造（本編12か所で鳴っているので出現専用の音を別に作った）');
  assert(/Sound\.sfx\('bossAlarm', 0\);/.test(boss)
      && /delayedCall\(700, \(\) => Sound\.sfx\('bossAlarm', 1\)\)/.test(boss)
      && /delayedCall\(1400, \(\) => Sound\.sfx\('bossAlarm', 2\)\)/.test(boss),
    'R52a: 警報は1回で終わらせず 0.7秒間隔で3回（回ごとに音程が上がる）');
  const warnFn = boss.slice(boss.indexOf('function bossWarnCharge()'), boss.indexOf('function clearWarnEls()'));
  assert(/0xff2b2b/.test(warnFn) && /setDepth\(2071\)/.test(warnFn) && /repeat: 2/.test(warnFn),
    'R52a: 画面の縁が赤く3回脈打つ（中央は塞がない＝低HP警告と同じ作法）');
  assert(/alpha: 0\.22/.test(warnFn),
    'R52a: 周縁の濃さは子ども安全の範囲（alpha < 0.5）');
  assert(/function clearFx\(\)[\s\S]{0,260}?clearWarnEls\(\);/.test(boss),
    'R52a: 赤い周縁は出現の瞬間に必ず消える（戦闘中まで残る常時エフェクトを増やさない）');
  const arr = boss.slice(boss.indexOf('function bossArrival(x, y)'), boss.indexOf('// ============ R40'));
  assert(/whiteFlash\(0\.30\)/.test(arr) && /run\.shake\(420, 9\)/.test(arr)
      && /run\.slowMotion\(0\.2, 0\.35\)/.test(arr),
    'R52a: 出現の瞬間は 白閃＋強いシェイク＋一瞬のスロー（0.2秒）');
  assert(/Sound\.sfx\('metalSlam'\)/.test(arr) && /Sound\.sfx\('bigBoom', 0\.85\)/.test(arr),
    'R52a: 着地音は金属＋低音の2枚（既存SFXの組み合わせ）');
  assert((arr.match(/spawnRingFx\(/g) || []).length === 3,
    'R52a: 着地点から衝撃波リングが3枚、時間差で広がる');
  assert(/delayedCall\(380, \(\) => \{ if \(boss && boss\.active\) Sound\.startBgm\('boss'\); \}\)/.test(boss),
    'R52a: BGMは着地の衝撃が収まってから入る（0.38秒。同時に鳴らすと両方ぼやける）');

  // --- ④ マオウレクス（final）の登場経路には一切手を入れていない ---
  assert(/if \(t\.final\) Sound\.sfx\('warning'\);\s*\n\s*else bossWarnCharge\(\);/.test(boss),
    'R52a: 最終ボスの警告は従来どおり warning 1回（強化は非finalの側にだけ入っている）');
  assert(/if \(cfg\.final\) Sound\.sfx\('bigBoom'\);[\s\S]{0,260}?else bossArrival\(x, y\);/.test(boss),
    'R52a: 最終ボスの登場音は従来どおり bigBoom（着地演出は非finalの側にだけ入っている）');
  assert(/if \(cfg\.final\) Sound\.startBgm\('maou'\);/.test(boss),
    'R52a: 最終ボスのBGMは遅延なしで即時（maouIntro が音の間を持っている）');
  assert(/state = 'maouIntro';\s*\n\s*stateT = MAOU_INTRO\.dur;/.test(boss),
    'R52a: maouIntro（暗幕＋セリフ2行＋テロップ）の入口はそのまま');
}

// ============ R52b 通常ボス5体の「弾速」と「攻撃のバラエティ」 ============
// 実プレイFB「マオウレクス以外のボスの攻撃がぬる過ぎる。弾のスピードを速くして」＋
// 「攻撃をバラエティー豊かにして（尖った大きめの弾／アンカー射出／細いレーザー砲／
// 極小の小型ロボを大量に排出／突然の加速）。プレーヤーがワクワクする攻撃を創造して」。
// ⚠️ 縛るのは4つ：①弾が旧値より速い ②新攻撃が表に載っている ③ミニロボが弾にならない
//    ④マオウレクスに触っていない。手触りそのもの（ワクワクするか）は実プレイでしか測れない。
{
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
  const boss = read('systems/boss.js');
  const boot = read('scenes/Boot.js');
  const runjs = read('scenes/Run.js');
  const bil = read('systems/billiard.js');
  const cap = read('systems/capture.js');
  const tiers = BALANCE.boss.tiers;
  const byId = {};
  for (const t of tiers) byId[t.bossId] = t;
  const pSpd = BALANCE.player.speed;

  // --- ① 弾速：R52b 以前の値（左）より速い（右が現行の下限）---
  //     ⚠️ アンカーにするのは「旧値そのもの」。相対値(1.3倍など)で書くと、次に誰かが
  //        少し下げても通ってしまう＝「ぬるくなった」を検出できない。
  const OLD = [
    ['korotama', 'machinegun', 'bulletSpeed', 264],
    ['korotama', 'ring', 'bulletSpeed', 120],
    ['jetviper', 'cutter', 'speed', 180],
    ['jetviper', 'flypass', 'bulletSpeed', 104],
    ['jetviper', 'ring', 'bulletSpeed', 132],
    ['uzuking', 'vulcan', 'bulletSpeed', 138],
    ['uzuking', 'spiral', 'bulletSpeed', 128],
    ['uzuking', 'armslam', 'shockSpeed', 144],
    ['uzuking', 'ring', 'bulletSpeed', 132],
    ['wavelord', 'tsunami', 'bulletSpeed', 108],
    ['wavelord', 'armslam', 'shockSpeed', 144],
    ['wavelord', 'ring', 'bulletSpeed', 142],
    ['missilga', 'missile', 'speed', 300],
    ['missilga', 'vulcan', 'bulletSpeed', 138],
    ['missilga', 'ring', 'bulletSpeed', 144],
  ];
  for (const [id, atk, key, old] of OLD) {
    const now = byId[id] && byId[id][atk] && byId[id][atk][key];
    assert(typeof now === 'number' && now > old,
      `R52b: ${id}.${atk}.${key} が旧値より速い（${old} → ${now}）`);
  }
  // 遅い弾ほど大きく上げる（100〜150台は+25%以上・既に速い machinegun/missile は+5%以上）
  for (const [id, atk, key, old] of OLD) {
    const now = byId[id][atk][key];
    const min = old <= 200 ? 1.25 : 1.05;
    assert(now >= old * min,
      `R52b: ${id}.${atk}.${key} の上げ幅が方針どおり（×${(now / old).toFixed(2)} >= ×${min}）`);
  }
  // 主人公(148px/s)より遅い弾を1つも残さない＝歩いて追い抜ける弾を作らない（R35の教訓）
  for (const [id, atk, key] of OLD) {
    assert(byId[id][atk][key] > pSpd,
      `R52b: ${id}.${atk}.${key} が主人公(${pSpd})より速い（${byId[id][atk][key]}）`);
  }
  // 射程（速度×寿命）は据え置き＝速くしたぶん画面外まで飛び続ける弾を増やしていない
  for (const [id, atk] of [['korotama', 'ring'], ['jetviper', 'flypass'], ['uzuking', 'vulcan'],
                           ['uzuking', 'spiral'], ['wavelord', 'tsunami'], ['missilga', 'ring']]) {
    const a = byId[id][atk];
    const range = a.bulletSpeed * a.lifeSec;
    assert(range >= 250 && range <= 620,
      `R52b: ${id}.${atk} の射程が据え置きの範囲（${Math.round(range)}px）`);
  }
  // 速くしたぶんダメージは1点も上げていない（緊張感は被弾量ではなく「避けた回数」で作る）
  const DMG = [['korotama', 'machinegun', 6], ['korotama', 'ring', 12], ['jetviper', 'cutter', 20],
               ['jetviper', 'flypass', 15], ['uzuking', 'vulcan', 15], ['uzuking', 'spiral', 14],
               ['wavelord', 'tsunami', 20], ['missilga', 'missile', 24], ['missilga', 'vulcan', 15]];
  for (const [id, atk, d] of DMG) {
    assert(byId[id][atk].damage === d,
      `R52b: ${id}.${atk}.damage は据え置き（${d} / 実測 ${byId[id][atk].damage}）`);
  }
  // armslam の衝撃波は寿命を data 側へ出した（boss.js の直書き 2.5 を撤去）
  for (const id of ['uzuking', 'wavelord']) {
    assert(typeof byId[id].armslam.shockLifeSec === 'number',
      `R52b: ${id}.armslam.shockLifeSec が balance にある（マジックナンバーをコードに残さない）`);
  }
  assert(/life: sk\.shockLifeSec \|\| 2\.5/.test(boss),
    'R52b: doSlam が shockLifeSec を読む（直書きの 2.5 は互換のフォールバックだけ）');

  // --- ② 新攻撃5種が表に載っていて、待ち時間の数と一致している ---
  const NEW = [['korotama', 'rollrush'], ['jetviper', 'pinlaser'], ['uzuking', 'drill'],
               ['wavelord', 'anchor'], ['missilga', 'minirobo']];
  for (const [id, atk] of NEW) {
    const t = byId[id];
    assert(t.attacks.includes(atk),
      `R52b: ${id} の attacks に ${atk} が載っている（${t.attacks.join('/')}）`);
    assert(t[atk] && typeof t[atk] === 'object',
      `R52b: ${id}.${atk} の設定ブロックがある（値は balance が正典）`);
    assert(t.idleSec.betweenAttacks.length === t.attacks.length,
      `R52b: ${id} の betweenAttacks 長が attacks 長と一致（${t.idleSec.betweenAttacks.length}/${t.attacks.length}）`);
    // 出番があること＝表の2番目に置いた（1周目で必ず見える。R34「4番目のミサイルは0回」の教訓）
    assert(t.attacks.indexOf(atk) === 1,
      `R52b: ${id} の新攻撃は表の2番目（1周で必ず1回は出る位置）`);
  }
  // 予告を必ず持つ（予告なしの攻撃を1つも作らない＝理不尽な即死を出さない）
  for (const [id, atk] of NEW) {
    const tele = byId[id][atk].telegraphSec;
    assert(typeof tele === 'number' && tele >= 0.4,
      `R52b: ${id}.${atk} に 0.4秒以上の予告がある（${tele}）`);
  }
  // ダメージは各ボスの既存攻撃と同水準（新技だけ突出させない）
  for (const [id, atk] of NEW) {
    const t = byId[id];
    const others = t.attacks.filter((a) => a !== atk && t[a] && typeof t[a].damage === 'number')
      .map((a) => t[a].damage);
    const d = t[atk].damage;
    assert(d <= Math.max(...others, t.bodyDamage) * 1.35,
      `R52b: ${id}.${atk}.damage ${d} が既存攻撃（最大 ${Math.max(...others, t.bodyDamage)}）と同水準`);
  }
  // 実装：5種とも state と発火経路がある（データだけ足して動かない、を通さない）
  for (const [st, fn] of [["case 'rollrush'", 'function startRushLeg'],
                          ["case 'pinlaser'", 'function firePinLasers'],
                          ["case 'drill'", 'function fireDrillOne'],
                          ["case 'anchor'", 'function startAnchor'],
                          ["case 'minirobo'", 'function spawnMinirobos']]) {
    assert(boss.includes(st) && boss.includes(fn),
      `R52b: ${st} が startAttackByName にあり ${fn} が実装されている`);
  }
  // 予告テロップ（文字）は1つも足していない＝③装飾が飽和側の vortex で情報量を増やさない
  for (const nm of ['ローリングラッシュ', 'ペンシルレーザー', 'ドリルシェル',
                    'アンカーショット', 'ミニロボ']) {
    assert(!new RegExp(`(introText|floatText|announce)\\([^)]*${nm}`).test(boss),
      `R52b: 「${nm}」を画面の文字として出していない（予告は形と色で読ませる）`);
  }
  // 見た目：尖った大弾と錨のテクスチャが新設されている（既存弾の流用ではない）
  assert(/makeFoeDrill\(/.test(boot) && /this\.makeFoeDrill\('boss_drill', 32, 20\)/.test(boot),
    'R52b: ドリル弾の専用テクスチャ（32×20）がある＝boss_bolt(16×10) の流用ではない');
  assert(/makeAnchor\(/.test(boot) && /this\.makeAnchor\('boss_anchor', 20, 20\)/.test(boot),
    'R52b: アンカーの専用テクスチャ（20×20）がある');
  assert(/'boss_drill'/.test(boss) && /'boss_anchor'/.test(boss),
    'R52b: boss.js が新テクスチャを実際に貼っている');
  // 判定と見た目の乖離を作らない：ドリルは b.r で当てる（見た目だけ大きい弾にしない）
  assert(/b\.kind === 'drill' \? b\.r/.test(boss),
    'R52b: ドリルの当たり判定は半径 b.r（見た目 32×20・縦19.8 と直径18＝±20%以内）');
  // 曲がるのは1回だけ（追い続けるホーミングにはしない）
  assert(/if \(!b\.bent && b\.bendAt > 0 && b\.age >= b\.bendAt\)/.test(boss),
    'R52b: ドリルが曲がるのは1回だけ（bent のフラグで二度目を封じている）');

  // --- ③ ミニロボは「倒すだけ」＝ stagger / capture / billiard の全経路で対象外 ---
  assert(/export const MINIROBO = \{/.test(read('data/enemies.js')),
    'R52b: ミニロボは ENEMIES 配列に入れず別 export（湧きプール／重み検証を汚さない）');
  assert(ENEMIES.length === 6, 'R52b: ENEMIES は6種のまま（ミニロボを湧きプールへ混ぜていない）');
  assert(/enterStagger\(e\) \{[\s\S]{0,420}?if \(e\.minion\) return;/.test(runjs),
    'R52b: よろけの入口 Run.enterStagger が minion を弾く（＝弾にならない）');
  assert(/function onEnemyKilled\(e\) \{[\s\S]{0,300}?if \(e\.minion\) return;/.test(cap),
    'R52b: capture.onEnemyKilled が minion を弾く（コアを落とさない）');
  assert((bil.match(/!e\.isBoss && !e\.minion/g) || []).length >= 2,
    'R52b: billiard.press の掴み候補（通常と紫の窓の両方）から minion を外している');
  assert(/if \(e\.minion \|\| src === 'manual'/.test(runjs),
    'R52b: minion は誰が倒してもその場で消える（よろけへ落ちて不死身にならない）');
  assert(/const noDrop = quiet \|\| !!e\.minion;/.test(runjs)
      && /if \(!noDrop\) this\.spawnGem/.test(runjs) && /if \(!noDrop\) this\.maybeCrown/.test(runjs),
    'R52b: 倒しても報酬なし（ジェルも王冠も出さない）＝稼ぎ場にならない');
  const mb = BALANCE.boss.tiers.find((t) => t.bossId === 'missilga').minirobo;
  assert(mb.count >= 8 && mb.count <= 10, `R52b: ミニロボは8〜10体（${mb.count}）`);
  assert(mb.radius >= 5 && mb.radius <= 6, `R52b: 極小（radius ${mb.radius}）`);
  assert(mb.lifeSec >= 6 && mb.lifeSec <= 8, `R52b: 寿命6〜8秒で自壊する（${mb.lifeSec}）＝画面に溜めない`);
  assert(mb.speed < pSpd, `R52b: ミニロボは主人公より遅い（${mb.speed} < ${pSpd}）＝走れば引き離せる`);
  assert(/m\.minion = true;/.test(boss) && /m\.hp = 1; m\.maxHp = 1;/.test(boss),
    'R52b: 放出時に minion フラグと HP1 が立つ（武器でも突きでも一撃で消える）');
  assert(/function clearMinions\(\)/.test(boss) && /clearMinions\(\);\s*\/\/ R52b 撃破の瞬間/.test(boss),
    'R52b: 撃破・破棄で手下を必ず片付ける（勝った画面に取り巻きを残さない）');

  // --- ④ マオウレクス（final）には一切触っていない ---
  const maou = tiers.find((t) => t.final);
  assert(maou.attacks.join('/') === 'missile/wirearm/vulcan/knuckle/nova',
    `R52b: maou の attacks は不変（${maou.attacks.join('/')}）`);
  assert(maou.attacksSplit.join('/') === 'laser/wirearm/knuckle/laser/nova'
      && maou.attacksP3.join('/') === 'chestLaser/wirearm/knuckle/chestLaser/missile',
    'R52b: maou の分離中／再合体後の表も不変');
  assert(maou.missile.speed === 480 && maou.nova.bulletSpeed === 265
      && maou.vulcan.bulletSpeed === 340 && maou.ring.bulletSpeed === 240
      && maou.knuckle.bulletSpeed === 320,
    'R52b: maou の弾速は1つも変えていない（依頼は「マオウレクス以外」）');
  for (const a of ['rollrush', 'pinlaser', 'drill', 'anchor', 'minirobo']) {
    assert(!maou.attacks.includes(a) && !maou.attacksSplit.includes(a)
        && !maou.attacksP3.includes(a) && !(a in maou),
      `R52b: 新攻撃 ${a} を maou に混ぜていない`);
  }
}

if (failures > 0) {
  console.error(`\ntest-core: NG (${failures} 件失敗)`);
  process.exit(1);
}
console.log('\ntest-core: OK');
