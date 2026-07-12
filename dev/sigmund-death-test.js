// ジギムント撃破シネマティックの実経路検証
// 使い方: node sigmund-death-test.js <game.jsのパス>
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');

function makeSandbox() {
  const ctxStub = new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return typeof t[p] !== 'undefined' ? t[p] : () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  const canvas = {
    width: 480, height: 360,
    getContext: () => ctxStub,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 360 }),
    style: {},
  };
  const audioParam = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const audioNode = () => ({
    connect() {}, start() {}, stop() {},
    frequency: audioParam, gain: audioParam, Q: audioParam, type: '',
    buffer: null, playbackRate: audioParam,
  });
  const audioCtx = {
    currentTime: 0, destination: {}, state: 'running', resume() {},
    createOscillator: audioNode, createGain: audioNode, createBiquadFilter: audioNode,
    createBufferSource: audioNode,
    createBuffer: () => ({ getChannelData: () => new Float32Array(48000) }),
  };
  let rafCb = null;
  const sandbox = {
    document: {
      getElementById: () => canvas,
      addEventListener() {},
      createElement: () => canvas,
    },
    window: { addEventListener() {}, prompt: () => null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
    performance: { now: () => 0 },
    AudioContext: function () { return audioCtx; },
    webkitAudioContext: function () { return audioCtx; },
    Math, JSON, console, Number, String, Array, Object, Uint8ClampedArray, Float32Array,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return {
    run: (code) => vm.runInContext(code, sandbox),
    frames: (n) => { for (let i = 0; i < n; i++) vm.runInContext('typeof gameLoop === "function" ? gameLoop() : tick()', sandbox); },
  };
}

// gameLoop関数名の検出
function detectLoop(run) {
  for (const name of ['gameLoop', 'loop', 'tick', 'frame']) {
    if (run(`typeof ${name}`) === 'function') return name;
  }
  throw new Error('メインループ関数が見つからない');
}

let failed = 0;
function scenario(title, fn) {
  try {
    fn();
    console.log('OK  ' + title);
  } catch (err) {
    failed++;
    console.log('NG  ' + title + ' → ' + err.message);
  }
}

// --- シナリオ1: 武器ヒット（damageBoss経由・コア命中）でトドメ ---
scenario('武器の実経路（damageBoss→hp0→killEnemy）で演出が発動する', () => {
  const { run } = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run('startGame(); stage = 20; lives = 99; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  // 実経路: updateWeaponHitsを実際に通す。
  // 弱点コア（ボス中心から半径0.42*sizeの円周上）が武器の回転軌道内に来るよう、
  // ボス中心をプレイヤーから「コア半径+武器長の0.7倍」だけ右に置き、コアを常に左向き(π)に固定する
  run(`(function(){
    const b = enemies.find(e => e.boss);
    b.hp = 1; b.airborne = false; b.act = null; b.hitTimer = 0;
    const pc = playerCenter();
    const wl = weaponLen(WEAPONS[weaponIdx]);
    const coreR = b.size * 0.42;
    b.x = pc.x + coreR + wl * 0.7 - b.size / 2;
    b.y = pc.y - b.size / 2;
  })();`);
  // 弱点コアに当てるため通常武器の回転で回す（コア判定36px・刃は0.35〜1.0の5点サンプル）
  let started = false;
  for (let i = 0; i < 600 && !started; i++) {
    run('(function(){ const b = enemies.find(e => e.boss); if (b) b.coreAngle = Math.PI; })();'); // コアをプレイヤー側に固定
    frames(1);
    started = run('enemies.some(e => e.boss && e.dying)');
    if (run('!enemies.some(e => e.boss)')) throw new Error('演出なしでボスが消えた（' + i + 'フレーム目）');
  }
  if (!started) throw new Error('600フレーム当て続けても演出が始まらない（HP: ' + run('(enemies.find(e=>e.boss)||{}).hp') + '）');
  // 地鳴り中はshakeTimerが立ち続ける
  frames(30);
  if (!(run('shakeTimer') > 0)) throw new Error('地鳴りフェーズでshakeTimerが0');
  if (!run('enemies.some(e => e.boss)')) throw new Error('地鳴り中にボスが消えた');
  frames(560);
  if (run('enemies.some(e => e.boss)')) throw new Error('粉砕後もボスが残っている');
  if (!run('finalClear')) throw new Error('クリア進行に入らない');
});

// --- シナリオ2: 必殺技でトドメ（地上） ---
scenario('必殺技（地上のボス）でトドメ→演出が発動する', () => {
  const { run } = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run('startGame(); stage = 20; lives = 99; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  run('(function(){ const b = enemies.find(e => e.boss); b.hp = 3; b.airborne = false; })();');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (!run('enemies.some(e => e.boss && e.dying)')) throw new Error('必殺トドメで演出が始まらない');
  frames(620);
  if (run('enemies.some(e => e.boss)')) throw new Error('粉砕後もボスが残っている');
  if (!run('finalClear')) throw new Error('クリア進行に入らない');
});

// --- シナリオ3: 必殺技でトドメ（空中＝dive/stomp中） ---
scenario('必殺技（空中のボス）でトドメ→演出中もボスが描画される（airborne解除）', () => {
  const { run } = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run('startGame(); stage = 20; lives = 99; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  run('(function(){ const b = enemies.find(e => e.boss); b.hp = 3; b.airborne = true; b.act = { kind: "dive", t: 10 }; })();');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (!run('enemies.some(e => e.boss && e.dying)')) throw new Error('必殺トドメで演出が始まらない');
  if (run('enemies.some(e => e.boss && e.airborne)')) throw new Error('演出中もairborneのまま＝ボスが画面に描かれない（透明のまま崩壊）');
  frames(620);
  if (run('enemies.some(e => e.boss)')) throw new Error('粉砕後もボスが残っている');
  if (!run('finalClear')) throw new Error('クリア進行に入らない');
});

// --- シナリオ4: 遠距離弾（pshot）でトドメ ---
scenario('遠距離弾の実経路でトドメ→演出が発動する', () => {
  const { run } = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run('startGame(); stage = 20; lives = 99; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  // スポーン直後のボスは画面外にいるため、必ず画面内に移動してから弾を置く
  run('(function(){ const b = enemies.find(e => e.boss); b.hp = 1; b.airborne = false; b.act = null; b.hitTimer = 0; b.x = 100; b.y = 40; })();');
  let hit = false;
  for (let i = 0; i < 30 && !hit; i++) {
    // 毎フレーム、現在のコア位置に弾を置く（コアは回転しているため）
    run(`(function(){
      const b = enemies.find(e => e.boss);
      if (!b || b.dying) return;
      const core = bossCorePos(b);
      pshots.push({ x: core.x, y: core.y, vx: 0, vy: 0, dmg: 5, life: 10, half: false });
    })();`);
    frames(1);
    hit = run('enemies.some(e => e.boss && e.dying)');
  }
  if (!hit) throw new Error('弾トドメで演出が始まらない（HP: ' + run('(enemies.find(e=>e.boss)||{}).hp') + '）');
  frames(620);
  if (run('enemies.some(e => e.boss)')) throw new Error('粉砕後もボスが残っている');
});

console.log(failed === 0 ? '\n>>> ALL SIGMUND DEATH TESTS PASSED' : `\n>>> ${failed}件失敗`);
process.exit(failed === 0 ? 0 : 1);
