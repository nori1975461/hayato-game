// ボスの並び（stageOrder）の検証。
// 使い方: node stage-order-test.js <game.jsのパス>
//
// ボスの並びはプレイごとにシャッフルされるが、入れ替えてよいのは同じ難易度帯の中だけ。
// ここが壊れると「3面にライリュウ(hpMul 3.77)が出て詰む」「20面の邪竜ジギムントが別のボスに
// なって物語が破綻する」といった事故になるが、乱数任せなので実行時エラーにはならず気づけない。
// ボスやステージを増やしたときに STAGE_TIERS の更新を忘れる事故も検出する。
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');

const ctx2d = new Proxy({}, {
  get(target, prop) {
    if (prop === 'measureText') return () => ({ width: 42 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
      return () => ({ addColorStop: () => {} });
    }
    if (prop === 'canvas') return canvas;
    if (typeof prop === 'string') return () => undefined;
    return undefined;
  },
  set() { return true; },
});
const canvas = {
  width: 480, height: 360,
  getContext: () => ctx2d,
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 360 }),
};
const sandbox = {
  console,
  document: { getElementById: () => canvas },
  window: { addEventListener: () => {}, prompt: () => null },
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
  requestAnimationFrame: () => {},
  Math, Set, Number, String, Array, Object, JSON,
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const run = (code) => vm.runInContext(code, sandbox);

let failed = false;
function check(label, fn) {
  try { fn(); console.log('OK  ' + label); } catch (err) { failed = true; console.log('NG  ' + label + ' -> ' + err.message); }
}

const LAST = run('LAST_STAGE');
const TIERS = run('STAGE_TIERS');
const NAMES = run('BOSS_TYPES.map(b => b.name)');
const TRIALS = 200; // 乱数任せなので十分な回数まわす

check('STAGE_TIERS が全ステージを重複なく連続で覆っている', () => {
  let expect = 0;
  for (const [from, to] of TIERS) {
    if (from !== expect) throw new Error(`難易度帯が連続していない: ${expect} の次が ${from}`);
    if (to <= from) throw new Error(`難易度帯の範囲が不正: [${from}, ${to}]`);
    expect = to;
  }
  if (expect !== LAST) throw new Error(`難易度帯が全${LAST}ステージを覆っていない（${expect}まで）。ボス追加時のSTAGE_TIERS更新もれ`);
});

check('BOSS_TYPESとSTAGESの数が一致している', () => {
  const nb = run('BOSS_TYPES.length');
  const ns = run('STAGES.length');
  if (nb !== ns) throw new Error(`BOSS_TYPES=${nb} と STAGES=${ns} が不一致（世界とボスの対応が崩れる）`);
});

check(`${TRIALS}回シャッフルしても難易度帯をまたがない`, () => {
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    const order = JSON.parse(run('JSON.stringify(stageOrder)'));
    order.forEach((slot, pos) => {
      const a = TIERS.findIndex(([f, t]) => pos >= f && pos < t);
      const b = TIERS.findIndex(([f, t]) => slot >= f && slot < t);
      if (a !== b) throw new Error(`ステージ${pos + 1}に別の難易度帯の ${NAMES[slot]} が出た`);
    });
  }
});

check(`${TRIALS}回シャッフルしても並びが順列（全ボスがちょうど1回ずつ出る）`, () => {
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    const order = JSON.parse(run('JSON.stringify(stageOrder)'));
    if (order.length !== LAST) throw new Error(`並びの長さが${order.length}（期待${LAST}）`);
    if (new Set(order).size !== LAST) throw new Error('同じボスが複数のステージに出る、または出ないボスがいる');
  }
});

check('物語の区切りのボスは動かない（邪竜=20面 / 最終ボス=最終面）', () => {
  const sigmundIdx = run('BOSS_TYPES.findIndex(t => t.deathEvent)');
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    const order = JSON.parse(run('JSON.stringify(stageOrder)'));
    if (order[sigmundIdx] !== sigmundIdx) throw new Error(`邪竜(${NAMES[sigmundIdx]})が${order.indexOf(sigmundIdx) + 1}面へ動いた`);
    if (order[LAST - 1] !== LAST - 1) throw new Error(`最終ボス(${NAMES[LAST - 1]})が動いた`);
  }
});

check('シャッフルされている（毎回おなじ並びではない）', () => {
  const seen = new Set();
  for (let r = 0; r < TRIALS; r++) { run('buildStageOrder();'); seen.add(run('JSON.stringify(stageOrder)')); }
  if (seen.size < TRIALS * 0.5) throw new Error(`${TRIALS}回で${seen.size}通りしか出ない（シャッフルが効いていない）`);
});

check('全ボスが最後まで到達可能（どのボスも必ずどこかのステージに出る）', () => {
  const reachable = new Set();
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    JSON.parse(run('JSON.stringify(stageOrder)')).forEach((slot) => reachable.add(slot));
  }
  if (reachable.size !== LAST) {
    const missing = NAMES.filter((_, i) => !reachable.has(i));
    throw new Error('一度も出現しないボスがいる: ' + missing.join(', '));
  }
});

check('図鑑の記録がステージ番号ではなく実際のボスを指す', () => {
  run('buildStageOrder();');
  const order = JSON.parse(run('JSON.stringify(stageOrder)'));
  // 記録処理と同じ式で、シャッフル後もステージ→ボスの対応が保たれるか確かめる
  for (let s = 1; s <= LAST; s++) {
    run(`stage = ${s};`);
    const actual = run('currentBossType().name');
    if (actual !== NAMES[order[s - 1]]) throw new Error(`ステージ${s}: currentBossType=${actual} だが並びは ${NAMES[order[s - 1]]}`);
  }
});

console.log(failed ? '\n>>> STAGE ORDER TESTS FAILED' : '\n>>> ALL STAGE ORDER TESTS PASSED');
if (failed) process.exitCode = 1;
