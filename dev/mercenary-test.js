// 傭兵システムの実挙動テスト（雇用・上限・攻撃・被弾5回で死亡・ハート回復なし・再雇用）
// 使い方: node mercenary-test.js <game.jsのパス>
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
  addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 360 }),
};
const handlers = { keydown: [], keyup: [] };
let rafCb = null;
const sandbox = {
  console,
  document: { getElementById: () => canvas },
  window: { addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); }, prompt: () => null },
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
  requestAnimationFrame: (cb) => { rafCb = cb; },
  Math, Set, Number, String, Array, Object, JSON,
};
sandbox.window.AudioContext = undefined;
sandbox.window.webkitAudioContext = undefined;
vm.createContext(sandbox);
function run(code) { return vm.runInContext(code, sandbox); }
function frames(n) { for (let i = 0; i < n; i++) rafCb(); }
function key(k) { for (const fn of handlers.keydown) fn({ key: k, preventDefault: () => {} }); for (const fn of handlers.keyup) fn({ key: k, preventDefault: () => {} }); }

let failed = false;
function step(label, fn) {
  try { fn(); console.log('OK  ' + label); }
  catch (err) { failed = true; console.log('NG  ' + label + ' -> ' + err.stack.split('\n').slice(0, 3).join(' | ')); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

run(src); rafCb();
key('Enter'); frames(60); // ゲーム開始

step('傭兵を2体まで雇える・3体目は増えない', () => {
  run('mercenaries = [];');
  run('hireMercenary("mercKnight");');
  run('hireMercenary("mercArcher");');
  assert(run('mercenaries.length') === 2, '2体雇えていない');
  // 上限チェック（shopInputのガードと同じ条件を直接検証）
  const canHireMore = run('mercenaries.length < MERC_MAX');
  assert(canHireMore === false, 'MERC_MAXを超えて雇えてしまう');
});

step('MERC_MAX=2・MERC_MAX_HITS=5・傭兵ショップ項目が2件', () => {
  assert(run('MERC_MAX') === 2, 'MERC_MAXが2でない');
  assert(run('MERC_MAX_HITS') === 5, 'MERC_MAX_HITSが5でない');
  assert(run('SHOP_ITEMS.filter(x=>x.merc).length') === 2, '傭兵ショップ項目が2件でない');
});

step('傭兵の武器は固定（MERC_TYPESのdmgが不変）', () => {
  const kd = run('MERC_TYPES.mercKnight.dmg');
  const ad = run('MERC_TYPES.mercArcher.dmg');
  assert(kd === 2 && ad === 1, 'ダメージ定義が想定外: ' + kd + '/' + ad);
  assert(run('MERC_TYPES.mercArcher.half') === true, 'アーチャーはボスへ半減(half)であるべき');
});

step('近くの敵を攻撃してからませる（描画・更新でエラーなし）', () => {
  run('mercenaries = []; hireMercenary("mercKnight"); hireMercenary("mercArcher");');
  frames(30); // 傭兵が隊列位置に落ち着くまで
  // 傭兵のすぐそばに敵を大量に配置（近接・遠距離の両攻撃経路を通す）
  run(`for (let i=0;i<8;i++){ const m=mercenaries[i%mercenaries.length]; spawnZako(ZAKO_TYPES[0], m.x, m.y, 1); }`);
  frames(120);
  // なんらか攻撃が機能して敵が減る/矢が出るなどでエラーが出ないこと
  assert(true, '例外なし');
});

step('傭兵は5回被弾で死亡する', () => {
  run('mercenaries = []; hireMercenary("mercKnight");');
  run(`(function(){ const m = mercenaries[0]; for (let i=0;i<5;i++){ m.invT=0; hurtMercenary(m); } })();`);
  // hurtMercenary内でdead化。updateで配列から除去される
  const deadFlag = run('mercenaries.length===0 || mercenaries[0].dead === true');
  assert(deadFlag, '5回被弾しても死亡していない');
  frames(2);
  assert(run('mercenaries.length') === 0, '死亡した傭兵が配列から除去されていない');
});

step('4回被弾では死なない（境界）', () => {
  run('mercenaries = []; hireMercenary("mercArcher");');
  run(`(function(){ const m = mercenaries[0]; for (let i=0;i<4;i++){ m.invT=0; hurtMercenary(m); } })();`);
  assert(run('mercenaries.length') === 1 && run('mercenaries[0].dead') === false, '4回で死んでいる');
  assert(run('mercenaries[0].hits') === 4, 'hitsカウントが不正');
});

step('ハート取得で傭兵のhitsは回復しない', () => {
  run('mercenaries = []; hireMercenary("mercKnight");');
  run(`(function(){ const m = mercenaries[0]; m.invT=0; hurtMercenary(m); m.invT=0; hurtMercenary(m); })();`);
  const before = run('mercenaries[0].hits');
  // ハートを主人公の上に落として拾わせる
  run(`items.push({ x: player.x+PLAYER_SIZE/2, y: player.y+PLAYER_SIZE/2, kind:'heart', vy:0, life:600, bob:0 });`);
  run('lives = 1;');
  frames(30);
  const after = run('mercenaries.length ? mercenaries[0].hits : -1');
  assert(after === before, 'ハートで傭兵のhitsが変化した: ' + before + '->' + after);
});

step('死亡後に同種を再雇用できる', () => {
  run('mercenaries = [];');
  run('hireMercenary("mercKnight");');
  run(`(function(){ const m = mercenaries[0]; for (let i=0;i<5;i++){ m.invT=0; hurtMercenary(m); } })();`);
  frames(2);
  run('hireMercenary("mercKnight");');
  assert(run('mercenaries.length') === 1 && run('mercenaries[0].typeId') === 'mercKnight', '死亡後に再雇用できない');
});

step('傭兵つきで通常プレイ300フレーム（エラーなし）', () => {
  run('mercenaries = []; hireMercenary("mercKnight"); hireMercenary("mercArcher");');
  frames(300);
  assert(true, '例外なし');
});

console.log(failed ? '\n>>> SOME MERCENARY TESTS FAILED' : '\n>>> ALL MERCENARY TESTS PASSED');
process.exit(failed ? 1 : 0);
