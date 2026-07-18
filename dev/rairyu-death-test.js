// 雷龍（ライリュウ）の特殊攻撃3種＋撃破断末魔イベントの実経路検証
// 使い方: node rairyu-death-test.js <game.jsのパス>
// ジギムントのdeathEventとは別系統（bossEvent.kind==='rairyuDeath'）であることも回帰確認する。
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
  const sandbox = {
    document: {
      getElementById: () => canvas,
      addEventListener() {},
      createElement: () => canvas,
    },
    window: { addEventListener() {}, prompt: () => null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame: () => 1,
    performance: { now: () => 0 },
    AudioContext: function () { return audioCtx; },
    webkitAudioContext: function () { return audioCtx; },
    Math, JSON, console, Number, String, Array, Object, Uint8ClampedArray, Float32Array,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const run = (code) => vm.runInContext(code, sandbox);
  return run;
}

function detectLoop(run) {
  for (const name of ['gameLoop', 'loop', 'tick', 'frame']) {
    if (run(`typeof ${name}`) === 'function') return name;
  }
  throw new Error('メインループ関数が見つからない');
}

// LAST_STAGE（雷龍）のボスをform2・低HPで即座に戦える状態にスポーンする
const SETUP_RAIRYU =
  'startGame(); stage = LAST_STAGE; lives = 99; bossActive = false; warningTimer = 0; ' +
  'finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();';

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

// --- シナリオ1: 断末魔セリフが一字一句そのままか（改変禁止） ---
scenario('断末魔セリフが指定どおり一字一句一致し、話者が雷龍である', () => {
  const run = makeSandbox();
  const EXPECT = 'この私までもが・・・。我ら【八大神魔】をすべて倒すとは・・・お前はいったい・・・';
  if (run('RAIRYU_DEATH_LINE.text') !== EXPECT) {
    throw new Error('セリフ本文が指定と違う → ' + run('RAIRYU_DEATH_LINE.text'));
  }
  if (run('RAIRYU_DEATH_LINE.name') !== '雷龍') {
    throw new Error('話者名が雷龍ではない → ' + run('RAIRYU_DEATH_LINE.name'));
  }
  // ジギムントの会話（BOSS_EVENT_LINES）とは別文言＝別系統であること
  if (run('typeof BOSS_EVENT_LINES !== "undefined" && BOSS_EVENT_LINES.some(l => l && l.text === RAIRYU_DEATH_LINE.text)')) {
    throw new Error('雷龍の断末魔がジギムントの会話文と混ざっている');
  }
});

// --- シナリオ2: 必殺トドメ→断末魔カットシーンを通り抜けクリア進行(pendingTally)へ到達 ---
scenario('必殺トドメで断末魔カットシーンが最後まで進み、finalClear＆pendingTallyに到達する', () => {
  const run = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run(SETUP_RAIRYU);
  run('(function(){ const b = enemies.find(e => e.boss); b.form2 = true; b.hp = 3; b.airborne = false; b.act = null; })();');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (run("!bossEvent || bossEvent.kind !== 'rairyuDeath'")) throw new Error('必殺トドメで rairyuDeath カットシーンが始まらない');
  if (!run('enemies.some(e => e.boss && e.dying)')) throw new Error('崩壊アニメ(e.dying)が始まっていない');
  // カットシーンが終わり bossEvent が閉じる瞬間を捕まえ、その時点の pendingTally を確認する
  let ended = false, tallyAtEnd = 0;
  for (let i = 0; i < 600 && !ended; i++) {
    frames(1);
    if (run('!bossEvent')) { ended = true; tallyAtEnd = run('pendingTally'); }
  }
  if (!ended) throw new Error('600フレーム回してもカットシーンが終わらない');
  if (run('enemies.some(e => e.boss)')) throw new Error('カットシーン後もボスが残っている');
  if (!run('finalClear')) throw new Error('クリア進行(finalClear)に入らない');
  if (!(tallyAtEnd > 0)) throw new Error('カットシーン終了時に pendingTally が立っていない → ' + tallyAtEnd);
});

// --- シナリオ3: 特殊攻撃(fences/novas/strikes)を展開中のトドメでも、それらが一掃されカットシーンに入る ---
scenario('特殊攻撃を展開中にトドメ→fences/novas/strikesが一掃され rairyuDeath に入る', () => {
  const run = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run(SETUP_RAIRYU);
  run('(function(){ const b = enemies.find(e => e.boss); b.form2 = true; b.hp = 3; b.airborne = false; b.act = null; })();');
  // 進行中の設置攻撃を積んでおく（本物のダメージ判定が残っている状態）
  run('fences.push({ x1: 40, y1: 40, x2: 40, y2: 300, t: -1, tel: 50, live: 999, f2: false, seed: 0 });');
  run('novas.push({ cx: 240, cy: 180, gapAng: 0, gapHalf: 0.61, delay: 0, tel: 0, r: 50, rMax: 300, thick: 13, expandDur: 70 });');
  run('strikes.push({ x: 120, y: 120, t: 20, storm: true });');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (run("!bossEvent || bossEvent.kind !== 'rairyuDeath'")) throw new Error('展開中トドメで rairyuDeath カットシーンが始まらない');
  if (run('fences.length') !== 0) throw new Error('トドメ時に電気フェンス(fences)が一掃されていない');
  if (run('novas.length') !== 0) throw new Error('トドメ時にノヴァ(novas)が一掃されていない');
  if (run('strikes.length') !== 0) throw new Error('トドメ時に落雷予告(strikes)が一掃されていない');
});

// --- シナリオ4: 空中トドメでもairborne解除＆ボス中心が画面内でカットシーンが見える ---
scenario('空中(dive)トドメでもairborne解除＆ボス中心が画面内でカットシーンが再生される', () => {
  const run = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run(SETUP_RAIRYU);
  run('(function(){ const b = enemies.find(e => e.boss); b.form2 = true; b.hp = 3; b.airborne = true; b.act = { kind: "dive", t: 10 }; b.x = -300; b.y = -300; })();');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (run("!bossEvent || bossEvent.kind !== 'rairyuDeath'")) throw new Error('空中トドメで rairyuDeath カットシーンが始まらない');
  if (run('enemies.some(e => e.boss && e.airborne)')) throw new Error('カットシーン中もairborneのまま＝画面に描かれない');
  if (!run('(function(){ const b = enemies.find(e => e.boss); const cx = b.x + b.size/2, cy = b.y + b.size/2; return cx >= 0 && cx <= W && cy >= 0 && cy <= H; })()')) {
    throw new Error('カットシーン中のボス中心が画面外にある（見えない位置で再生）');
  }
  // 数フレーム進めても描画が破綻しない（render経路を通す）
  frames(30);
  if (run('!bossEvent')) throw new Error('30フレームでカットシーンが早期終了した');
});

// --- シナリオ5: カットシーン中は特殊攻撃のダメージが発生しない（update短絡でupdateFencesが回らない） ---
scenario('カットシーン中は電気フェンスを重ねてもライフが減らない（理不尽ヒット防止）', () => {
  const run = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  run(SETUP_RAIRYU);
  run('(function(){ const b = enemies.find(e => e.boss); b.form2 = true; b.hp = 3; b.airborne = false; b.act = null; })();');
  run('lives = 99; invincibleTimer = 0;');
  run('specialGauge = 100; specialAttack();');
  frames(5);
  if (run("!bossEvent || bossEvent.kind !== 'rairyuDeath'")) throw new Error('カットシーンが始まらない');
  const livesBefore = run('lives');
  // カットシーンが続く限り、毎フレーム「プレイヤー真上の通電フェンス」を積む。
  // update()は bossEvent で短絡し updateFences を呼ばないため、これらは処理されずダメージも出ないはず。
  let ended = false;
  for (let i = 0; i < 500 && !ended; i++) {
    run('(function(){ const pc = playerCenter(); fences.push({ x1: pc.x - 40, y1: pc.y, x2: pc.x + 40, y2: pc.y, t: -1, tel: 50, live: 999, f2: false, seed: 0 }); })();');
    frames(1);
    ended = run('!bossEvent');
  }
  if (!ended) throw new Error('500フレームでカットシーンが終わらない');
  if (run('lives') < livesBefore) throw new Error('カットシーン中にライフが減った（' + livesBefore + '→' + run('lives') + '）');
});

// --- シナリオ6: ジギムント(deathEvent)は別系統のまま。撃破で kind無しの会話イベントが出る ---
scenario('ジギムント撃破はrairyuDeathと別系統（kind無しの会話イベント）で発火し破綻しない', () => {
  const run = makeSandbox();
  const loopName = detectLoop(run);
  const frames = (n) => { for (let i = 0; i < n; i++) run(loopName + '()'); };
  // deathEventを持つボス（ジギムント）のステージを特定してスポーン
  run('startGame(); stage = BOSS_TYPES.findIndex(t => t.deathEvent) + 1; lives = 99; bossActive = false; warningTimer = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  if (run('!enemies.some(e => e.boss && e.type && e.type.deathEvent)')) throw new Error('deathEventボス（ジギムント）がスポーンしていない');
  if (run('enemies.some(e => e.boss && e.type && e.type.deathTalk)')) throw new Error('deathEventボスがdeathTalkも持っている（系統が混ざっている）');
  run('(function(){ const b = enemies.find(e => e.boss); b.form2 = true; b.hp = 3; b.airborne = false; b.act = null; })();');
  run('specialGauge = 100; specialAttack();');
  // 崩壊シネマティックを進めて会話イベントの発火を待つ
  let sawSigmund = false, sawRairyu = false;
  for (let i = 0; i < 800 && !sawSigmund; i++) {
    frames(1);
    if (run("bossEvent && bossEvent.kind === 'rairyuDeath'")) sawRairyu = true;
    if (run("bossEvent && !bossEvent.kind")) sawSigmund = true;
  }
  if (sawRairyu) throw new Error('ジギムント撃破で誤って rairyuDeath カットシーンが発火した');
  if (!sawSigmund) throw new Error('ジギムントの会話イベント（kind無し bossEvent）が発火しない');
  // イベント表示を数フレーム回してもクラッシュしない（drawBossEventWindowのジギムント分岐）
  frames(20);
});

console.log(failed === 0 ? '\n>>> ALL RAIRYU DEATH TESTS PASSED' : `\n>>> ${failed}件失敗`);
process.exit(failed === 0 ? 0 : 1);
