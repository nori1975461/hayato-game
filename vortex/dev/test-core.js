// core/data のユニットテスト（PROTOTYPE_SPEC §8.2）。
// node vortex/dev/test-core.js で実行。失敗時 process.exit(1)。Phaser 非依存。

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

// --- upgrades 7種の id が一意・全件に desc ---
{
  const ids = BALANCE.upgrades.map((u) => u.id);
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 7 && unique, 'balance: upgrades 7種の id が一意');
  const allDesc = BALANCE.upgrades.every((u) => typeof u.desc === 'string' && u.desc.length > 0);
  assert(allDesc, 'balance: upgrades 全件に desc が存在');
}

// --- rainbowUpgrades 3種の id が一意 ---
{
  const ids = BALANCE.rainbowUpgrades.map((u) => u.id);
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 3 && unique, 'balance: rainbowUpgrades 3種の id が一意');
}

// --- MONSTERS が6種・ENEMIES が5種（Wave R1: ヴォイド・マキナ5種へ総入れ替え） ---
assert(MONSTERS.length === 6, 'data: MONSTERS が6種');
assert(ENEMIES.length === 5, 'data: ENEMIES が5種');

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
  const ARCHE = ['SLASH', 'SHOT', 'BEAM', 'FIELD', 'BOOMERANG', 'RINGWAVE'];
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

// --- Wave R4: 帯計算 formIndex=floor((lv-1)/2)%2 が近接↔遠距離を交互に切り替える ---
{
  const formIndexFor = (lv) => (Math.floor((lv - 1) / 2) % 2);
  // Lv1,2=0(近接) / Lv3,4=1(遠距離) / Lv5,6=0(近接) / Lv7,8=1 / Lv9,10=0 / Lv11,12=1
  const expect = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 0, 6: 0, 7: 1, 8: 1, 9: 0, 10: 0, 11: 1, 12: 1 };
  let ok = true;
  for (const [lv, idx] of Object.entries(expect)) {
    if (formIndexFor(Number(lv)) !== idx) ok = false;
  }
  assert(ok, 'balance/orbit: 帯計算が2Lv帯ごとに近接↔遠距離を交互に切り替える');
  // 帯境界（Lv2→3, Lv4→5, ...）で必ずフォームが反転すること
  let flips = true;
  for (let lv = 2; lv <= 11; lv++) {
    const boundary = (lv % 2 === 0);   // 偶数→次の奇数で帯が変わる
    const changed = formIndexFor(lv) !== formIndexFor(lv + 1);
    if (boundary && !changed) flips = false;
    if (!boundary && changed) flips = false;
  }
  assert(flips, 'orbit: 2Lv帯の境界でのみフォームが反転する（帯内は不変）');
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
  assert(M.closeMul > 1, 'balance: 踏み込みボーナス closeMul > 1（近づくほど強いという特性の根幹）');
  assert(M.bossMul > 0 && M.bossMul <= 0.5,
    'balance: 拳のボスへのダメージは半減以下（接近戦を報いるがボス戦を壊さない）');
  assert(M.maxTargets >= 1 && M.maxTargets <= 8,
    'balance: 拳の巻き込みは1〜8体（囲まれても捌けるが火力過多にしない）');
  // ヒートで上がる火力の上限（暴走防止）
  assert(M.heatMax * M.heatDamageMulPerStep <= 0.6,
    'balance: ヒート満タンの火力ボーナスは+60%以内');

  // --- 腕の技①ワイヤーアーム（Stage2解放） ---
  const W = H.wireArm;
  const wNums = ['unlockStage', 'intervalSec', 'maxLen', 'extendSpeed', 'backSec', 'turnDegPerSec',
                 'fistRadius', 'damage', 'damagePerStage', 'maxHits', 'knockback', 'knockbackSec', 'bossMul'];
  assert(!!W && wNums.every((k) => typeof W[k] === 'number' && Number.isFinite(W[k]) && W[k] >= 0),
    'balance: hero.wireArm のパラメータが全て数値');
  assert(W.unlockStage === 2, 'balance: ワイヤーアームは Stage2 で解放（腕の復元＝技の解放）');
  assert(W.bossMul > 0 && W.bossMul <= 0.5, 'balance: ワイヤーアームのボスへのダメージは半減以下');
  // 拳が主役であることを数値で守る（拳のDPS ≫ 腕の技のDPS）
  const meleeDps = M.damage / M.intervalSec;
  const wireDps = (W.damage * W.maxHits) / W.intervalSec;
  assert(meleeDps > wireDps,
    'balance: 拳のDPSがワイヤーアームを上回る（主武器は拳・腕の技は補助）');

  // --- 腕の技②アームスラム（Stage3解放） ---
  const S = H.armSlam;
  const sNums = ['unlockStage', 'cooldownSec', 'minEnemies', 'triggerRadius', 'radius', 'damage',
                 'telegraphSec', 'knockback', 'knockbackSec', 'bossMul',
                 'shockCount', 'shockSpeed', 'shockRadius', 'shockDamage'];
  assert(!!S && sNums.every((k) => typeof S[k] === 'number' && Number.isFinite(S[k]) && S[k] >= 0),
    'balance: hero.armSlam のパラメータが全て数値');
  assert(S.unlockStage === 3, 'balance: アームスラムは Stage3 で解放（最終形＝ボスと同じ技）');
  assert(S.telegraphSec > 0, 'balance: アームスラムに予告がある（ボスの育児安全設計と同じ文法）');
  assert(S.minEnemies >= 2, 'balance: アームスラムは複数体が密集したときだけ出る（空振りの絵を作らない）');
  assert(S.bossMul > 0 && S.bossMul <= 0.5, 'balance: アームスラムのボスへのダメージは半減以下');
  // ⚠️ 恒久ガード（SPEC§23.5 の実測）：発動判定は「自分のキル圏の外側」を見なければならない。
  // 着弾半径で数えると Stage3 では 8.6% の時間しか条件が成立せず、技が死ぬ。
  assert(S.triggerRadius > S.radius * 2,
    'balance: アームスラムの発動判定はキル圏の外側を見る（triggerRadius が着弾半径の2倍超）');
  assert(S.shockCount >= 8 && S.shockSpeed > 0,
    'balance: アームスラムの本体は放射状に走る衝撃波（8本以上・速度が正）');
  // 少年の体格で破綻しない着弾サイズ（画面は640×360）。巨大な円にしない＝ボスの meleeRadius46 相当。
  assert(S.radius <= 80, 'balance: アームスラムの着弾半径は80px以下（少年の叩きつけとして絵が破綻しない）');
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

// --- MONSTERS 6種＋evo id を合わせて全 id が一意 ---
{
  const ids = [];
  for (const m of MONSTERS) {
    ids.push(m.id);
    if (m.evo && m.evo.id) ids.push(m.evo.id);
  }
  const unique = new Set(ids).size === ids.length;
  assert(ids.length === 12 && unique, 'data: MONSTERS 6種＋evo id を合わせて全 id が一意（12件）');
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
  assert(!!S && S.maxUses === 10, 'balance: special.maxUses が 10（1ステージ10回まで）');
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

// --- 結果 ---
if (failures > 0) {
  console.error(`\ntest-core: NG (${failures} 件失敗)`);
  process.exit(1);
}
console.log('\ntest-core: OK');
