// ボスの並び（stageOrder）の検証。
// 使い方: node stage-order-test.js <game.jsのパス>
//
// ★2026-08-29 実プレイFB「ボスの出現をランダムにしたら評判がすこぶる悪い」でシャッフルを撤去。
// ここで縛るのは「1面から最終面まで、毎回おなじ決まった順で出る」こと。壊れても実行時
// エラーにはならず、遊んで初めて「順番が違う」と分かる種類の事故なので数で押さえる。
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
const NAMES = run('BOSS_TYPES.map(b => b.name)');
const TRIALS = 200; // 「何回やってもおなじ」を確かめる側になったので回数はそのまま使う

check('BOSS_TYPESとSTAGESの数が一致している', () => {
  const nb = run('BOSS_TYPES.length');
  const ns = run('STAGES.length');
  if (nb !== ns) throw new Error(`BOSS_TYPES=${nb} と STAGES=${ns} が不一致（世界とボスの対応が崩れる）`);
});

check(`${TRIALS}回まわしてもボスの並びは毎回おなじ（ランダムに戻っていない）`, () => {
  const seen = new Set();
  for (let r = 0; r < TRIALS; r++) { run('buildStageOrder();'); seen.add(run('JSON.stringify(stageOrder)')); }
  if (seen.size !== 1) throw new Error(`${TRIALS}回で${seen.size}通りの並びが出た（並びが固定されていない）`);
});

check('ステージ番号とボスが定義順どおりに対応する（1面＝BOSS_TYPES[0]）', () => {
  run('buildStageOrder();');
  const order = JSON.parse(run('JSON.stringify(stageOrder)'));
  for (let i = 0; i < LAST; i++) {
    if (order[i] !== i) throw new Error(`ステージ${i + 1}に ${NAMES[order[i]]}（定義順なら ${NAMES[i]}）`);
  }
});

check(`${TRIALS}回まわしても並びが順列（全ボスがちょうど1回ずつ出る）`, () => {
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    const order = JSON.parse(run('JSON.stringify(stageOrder)'));
    if (order.length !== LAST) throw new Error(`並びの長さが${order.length}（期待${LAST}）`);
    if (new Set(order).size !== LAST) throw new Error('同じボスが複数のステージに出る、または出ないボスがいる');
  }
});

check('物語の区切りのボスが定位置にいる（邪竜=20面 / 最終ボス=最終面）', () => {
  const sigmundIdx = run('BOSS_TYPES.findIndex(t => t.deathEvent)');
  for (let r = 0; r < TRIALS; r++) {
    run('buildStageOrder();');
    const order = JSON.parse(run('JSON.stringify(stageOrder)'));
    if (order[sigmundIdx] !== sigmundIdx) throw new Error(`邪竜(${NAMES[sigmundIdx]})が${order.indexOf(sigmundIdx) + 1}面へ動いた`);
    if (order[LAST - 1] !== LAST - 1) throw new Error(`最終ボス(${NAMES[LAST - 1]})が動いた`);
  }
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
  // 記録処理と同じ式で、ステージ→ボスの対応が保たれるか確かめる（stageOrder経由の参照は残してある）
  for (let s = 1; s <= LAST; s++) {
    run(`stage = ${s};`);
    const actual = run('currentBossType().name');
    if (actual !== NAMES[order[s - 1]]) throw new Error(`ステージ${s}: currentBossType=${actual} だが並びは ${NAMES[order[s - 1]]}`);
  }
});

console.log(failed ? '\n>>> STAGE ORDER TESTS FAILED' : '\n>>> ALL STAGE ORDER TESTS PASSED');
if (failed) process.exitCode = 1;
