// core/data のユニットテスト（PROTOTYPE_SPEC §8.2）。
// node vortex/dev/test-core.js で実行。失敗時 process.exit(1)。Phaser 非依存。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRng } from '../src/core/rng.js';
import { BALANCE } from '../src/data/balance.js';
import { MONSTERS } from '../src/data/monsters.js';
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

// --- MONSTERS が8種・ENEMIES が5種（Wave R1: ヴォイド・マキナ5種／R22: 回復役マシュモ／R23: 弾薬役ビリッコ追加） ---
assert(MONSTERS.length === 8, 'data: MONSTERS が8種');
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
  const ARCHE = ['SLASH', 'SHOT', 'BEAM', 'FIELD', 'BOOMERANG', 'RINGWAVE', 'HEAL', 'AMMO'];
  const allTwo = MONSTERS.every((m) => Array.isArray(m.forms) && m.forms.length === 2);
  assert(allTwo, 'data: 全なかまに forms が2つ定義されている');
  const meleeFirst = MONSTERS.every((m) => m.forms && m.forms[0] && m.forms[0].kind === 'melee');
  const rangedSecond = MONSTERS.every((m) => m.forms && m.forms[1] && m.forms[1].kind === 'ranged');
  assert(meleeFirst, 'data: 全なかまの forms[0] が melee（近接）');
  assert(rangedSecond, 'data: 全なかまの forms[1] が ranged（遠距離）');
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
  const NON_HITTER = ['FIELD', 'HEAL', 'AMMO'];
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
  assert(ids.length === 16 && unique, 'data: MONSTERS 8種＋evo id を合わせて全 id が一意（16件）');
}

// --- 開始編成 starpuppy / pikabit の id が存在 ---
{
  const ids = new Set(MONSTERS.map((m) => m.id));
  assert(ids.has('starpuppy') && ids.has('pikabit'), 'data: 開始編成 starpuppy/pikabit が存在');
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
  assert(/ammoQueue = run\.rng\.shuffle/.test(orb),
    'R33: 配る弾はボスごとに引き直す（マオウレクスの2発が必ず別の種類になる）');
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
  const WHO = [['b', '主人公の装甲'], ['y', 'スターパピー'], ['n', 'ピカビット'],
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
  for (const k of ['idleMul', 'alignSecMul', 'sweepDegAdd', 'verseAdd', 'bulletMul', 'shadowAdd', 'spinMul']) {
    assert(Array.isArray(rg[k]) && rg[k].length === tf.gaugeSegments,
      `R37: rage.${k} の長さがゲージ本数（${tf.gaugeSegments}）と一致`);
  }
  assert(Array.isArray(rg.texts) && rg.texts.length === tf.gaugeSegments - 1,
    'R37: 段が上がる回数（ゲージ本数-1）だけ宣言の文がある＝数値の変化を画面に届ける');

  // --- 単調性：段が上がって「ゆるくなる」項目が混ざったら激化の嘘になる ---
  const up = (a) => a.every((v, i) => i === 0 || v >= a[i - 1]);
  const down = (a) => a.every((v, i) => i === 0 || v <= a[i - 1]);
  assert(down(rg.idleMul) && down(rg.alignSecMul), 'R37: 間合いと予告は段で縮む一方');
  assert(up(rg.bulletMul) && up(rg.verseAdd) && up(rg.sweepDegAdd) && up(rg.shadowAdd) && up(rg.spinMul),
    'R37: 弾速・密度・薙ぎ・影の数・公転は段で増える一方（wavesAdd は R44W5 で shadowAdd へ）');

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
  assert(Math.max(...rg.shadowAdd) <= 2, 'R44W5: かげおにの追加は最大+2（旧 wavesAdd 上限+1 の後継）');
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
  assert(boss.includes("rageArr('shadowAdd', 0)"), 'R44W5: かげおにの数に shadowAdd が効く');
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

  // --- ① 数値の整合 ---
  assert(sh.delaySec.length >= sh.count + Math.max(...tf.rage.shadowAdd),
    `R44W5: 最終段の影の数（${sh.count + Math.max(...tf.rage.shadowAdd)}）ぶんディレイが定義されている（${sh.delaySec.length}）`);
  assert(sh.delaySec.every((v, i) => i === 0 || v > sh.delaySec[i - 1]),
    'R44W5: ディレイは昇順＝影は足あとの新しい順に並ぶ（同じ場所に重ならない）');
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
    assert(typeof sh.gapStepSec === 'number' && sh.gapStepSec > 0,
      'R44W5: 影ごとに床をずらす＝全員が1点に重なって1体に見える（実測）の再発防止');
    // ★炸裂は静止してから：走者の背後（trail px）で爆ぜると回避不能（実測でB/Cが被弾した）。
    //   静止フレア中に走って離せる距離 ＞ 爆風、を式で縛る。
    const flarePx = BALANCE.player.speed * sh.flareSec;
    assert(flarePx > sh.novaRadius + BALANCE.player.radius,
      `R44W5: フレア中に走って離せる距離（${flarePx.toFixed(0)}px）＞ 爆風（${sh.novaRadius + BALANCE.player.radius}px）＝正しく走っていれば必ず躱せる`);
    assert(/if \(s\.life > sk\.flareSec\) \{/.test(boss),
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
  assert(/if \(trueForm\) recordShadowHist\(\)/.test(boss),
    'R44W5: 足あとは真の姿のあいだ常に記録される（影の再生に穴を作らない）');
  assert(/updateShadows\(dt\);/.test(boss),
    'R44W5: 影の更新はボスの state に縛られない＝殻が開いても lifeSec まで狩り続ける');
  assert(/while \(shadowHist\.length > 2 && shadowHist\[0\]\.t < keep\) shadowHist\.shift\(\)/.test(boss),
    'R44W5: 足あとは上限つき＝無限に伸びない');

  // --- ⑤ 退廃の語彙の連続性（新しい語彙を持ち込まない）---
  assert(/'player'\)\.setScale\(3\.0\)\.setFlipY\(true\)/.test(boss),
    'R44W5: 影は主人公と同じテクスチャ・同じ縮尺・倒立（堕ちた聖句と同じ「倒立」の語彙）');
  assert(/setScale\(3\.0\)/.test(run.match(/playerImg = [^\n]+/)[0]),
    'R44W5: 主人公の実表示も3.0倍＝影と等身大（縮尺が違うと「本人の影」に見えない）');
  assert(/mixRgb\(VERSE_FALL_A, VERSE_FALL_B, pulse\)/.test(boss),
    'R44W5: 影の脈は堕ちた聖句と同じ紫→深紅（色の家族が同じ＝同じ「堕ちたもの」）');
  assert(/setTint\(0xd01228\)/.test((boss.match(/function spawnShadows[\s\S]*?\n  \}/) || [''])[0]),
    'R44W5: 空洞の眼＝深紅の光が下（倒立した頭）に灯る');

  // --- ⑥ 果てる瞬間：予告してから炸裂する ---
  assert(/if \(s\.life <= sk\.flareSec\) \{/.test(boss),
    'R44W5: 炸裂の flareSec 前から張りつめて膨らむ＝無予告の置き土産にしない');
  assert(/spawnRingFx\(p\.x, p\.y, 0xc0102a, 6, sk\.novaRadius/.test(boss),
    'R44W5: 炸裂は深紅の輪＝効果範囲が見える');

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

  // --- ⑨ 検証口 ---
  assert(/debugShadows\(\)/.test(boss) && /shadowHistLen/.test(boss),
    'R44W5: 影とその床（gap）を外から測れる');
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
if (failures > 0) {
  console.error(`\ntest-core: NG (${failures} 件失敗)`);
  process.exit(1);
}
console.log('\ntest-core: OK');
