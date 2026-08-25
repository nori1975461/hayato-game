// core/data のユニットテスト（PROTOTYPE_SPEC §8.2）。
// node vortex/dev/test-core.js で実行。失敗時 process.exit(1)。Phaser 非依存。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRng } from '../src/core/rng.js';
import { BALANCE } from '../src/data/balance.js';
import { MONSTERS } from '../src/data/monsters.js';
import { ENEMIES, BOSS } from '../src/data/enemies.js';

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
    assert(maou.hp === 24000, `balance: マオウレクスのHPが1.2倍（旧20000→24000・実測 ${maou.hp}）`);
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
      // 「破壊力も作中最大ダメージに」＝全ボスの全攻撃で最大であること
      let maxOther = 0, maxWho = '';
      const scan = (obj, who) => {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          if (typeof v === 'number' && /amage$/i.test(k)) {
            if (obj !== ck && v > maxOther) { maxOther = v; maxWho = who + '.' + k; }
          } else if (v && typeof v === 'object' && !Array.isArray(v)) scan(v, who + '.' + k);
        }
      };
      for (const t of tiers) scan(t, t.bossId);
      assert(ck.damage > maxOther,
        `balance: 胸部レーザーが作中最大ダメージ（${ck.damage} > 次点 ${maxOther} = ${maxWho}）`);
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
  assert(/mul: at\.r \? 1 : cfg\.weak\.mul/.test(boss),
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
  for (const n of ['samLaunch', 'samFly', 'samBoom', 'rocketPunchFire', 'rocketPunchFly', 'rocketPunchHit']) {
    assert(called.has(n), `R31: 新SFX ${n} が boss.js から実際に呼ばれている`);
  }
  // 飛来音は「発射時に1回」ではなく飛んでいるあいだ鳴らし続ける（速くしたので1回では鳴り終わる前に着弾する）
  assert(/missileFlyT/.test(boss) && /punchFlyT/.test(boss),
    'R31: ミサイルとロケットパンチの飛来音が飛行中に繰り返し鳴る');
  // 直撃は「爆発」であること（旧実装は Sound.sfx('hit') と粒子8個だけだった）
  assert(/missileBoom\(b\.x, b\.y, true\)/.test(boss),
    'R31: ミサイルが主人公へ直撃したとき爆発（大）が起きる');

  // --- R31: マオウレクス戦BGM（実プレイFB「荘厳さはあったが暗すぎる」）---
  assert(/maou:\s*\{ bpm: (8[0-9]|9[0-5]),/.test(snd),
    'R31: マオウレクス曲は 80〜95BPM（明るくしたが battle/boss より遅い＝重さは保つ）');
  assert(/NOTE\.Cs4/.test(snd) && /ピカルディ終止/.test(snd),
    'R31: 締めが A メジャー（ピカルディ終止）＝荘厳さを崩さずに光を入れている');
  assert(/CHORDS_MAOU[\s\S]*?\/\/ C（光①）/.test(snd),
    'R31: 進行に長三和音(C)が入っている（旧版は全部マイナーで長三和音が0個だった）');
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

// --- 結果 ---
if (failures > 0) {
  console.error(`\ntest-core: NG (${failures} 件失敗)`);
  process.exit(1);
}
console.log('\ntest-core: OK');
