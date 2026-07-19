// game.jsをNode上で疑似DOM付きで実行し、実行時エラーを検出するスモークテスト
// 使い方: node smoke-test.js <game.jsのパス>
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');

// ---- canvas 2Dコンテキストのスタブ（すべてのメソッドを吸収、measureTextだけ実値を返す） ----
const ctx2d = new Proxy({}, {
  get(target, prop) {
    if (prop === 'measureText') return () => ({ width: 42 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
      return () => ({ addColorStop: () => {} });
    }
    if (prop === 'canvas') return canvas;
    if (typeof prop === 'string') return (...args) => undefined;
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
  window: {
    addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); },
    prompt: () => null,
  },
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
  try {
    fn();
    console.log('OK  ' + label);
  } catch (err) {
    failed = true;
    console.log('NG  ' + label + ' -> ' + err.stack.split('\n').slice(0, 3).join(' | '));
  }
}

step('スクリプト読み込み＋初回フレーム', () => { run(src); if (!rafCb) throw new Error('rAF未登録'); rafCb(); });
step('タイトル画面 300フレーム', () => frames(300));
step('ENTERでゲーム開始→600フレーム（雑魚戦）', () => { key('Enter'); frames(600); });
step('移動キー入力しながら300フレーム', () => {
  for (const k of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'w', 'a', 's', 'd']) key(k);
  frames(300);
});

// 全武器を順に装備して回す（飛び道具・鎖・セーバー・ホーミング等の描画/発射コードを全部通す）
step('全83武器で各120フレーム', () => {
  const n = run('WEAPONS.length');
  if (n !== 83) throw new Error('武器数が83でない: ' + n);
  run('score = 0;');
  for (let i = 0; i < n; i++) {
    run(`score = WEAPONS[${i}].score; weaponIdx = ${i}; shootTimer = 0; flameTimer = 0;`);
    frames(120);
  }
});

// 全ボスを出現→戦闘→強制ギミック→撃破まで通す（LAST_STAGE基準で自動追随）
step('全ボスの出現・巨大弾・近接・ギミック・撃破', () => {
  run('lives = 99;'); // テスト中に死なないように
  const lastStage = run('LAST_STAGE');
  for (let s = 1; s <= lastStage; s++) {
    run(`stage = ${s}; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();`);
    frames(400); // 入場＋弾幕＋巨大弾チャージ
    // 近接攻撃＋加速＋テレポートを強制発動（ブレスはドラゴンのmelee抽選で実行される）
    run(`(function(){ const b = enemies.find(e => e.boss); if (b) { b.meleeTimer = 0; b.speedBurstT = 1; b.teleT = 1; b.y = 50; } })();`);
    frames(250);
    // 激怒条件を強制
    run(`(function(){ const b = enemies.find(e => e.boss); if (b) b.hp = Math.max(1, Math.floor(b.maxHp * 0.2)); })();`);
    frames(200);
    // 撃破（分裂ボスは子も倒す）
    for (let k = 0; k < 5; k++) {
      run(`(function(){ const b = enemies.find(e => e.boss && e.hp > 0); if (b) killEnemy(b); })();`);
      frames(30);
    }
    run('pendingTally = 0; state = "playing";'); // けっさん遷移は別ステップで検証
    frames(60);
  }
});

step('けっさん→カウント→おみせ→全アイテム購入→退店', () => {
  run('stage = 6; finalClear = false; startTally();');
  frames(200); // カウント完走
  key('Enter'); // おみせへ
  run('gold = 99999;');
  for (let i = 0; i < 12; i++) { key('Enter'); key('ArrowDown'); }
  frames(30);
  run('if (state === "shop") closeShop();');
  frames(60);
});

step('ライフ回復・被弾・ガード・ふっかつのたま', () => {
  run('lives = 2; gear = { armor: true, shield: true, cloak: true, hagoromo: true, orb: true, boots: true, gauntlet: true, ring: true, charm: true, helm: true };');
  for (let i = 0; i < 30; i++) { run('invincibleTimer = 0; hurtPlayer();'); frames(10); }
});

step('ゲームオーバー画面→タイトル復帰', () => {
  run('gear = {}; lives = 1; invincibleTimer = 0; hurtPlayer();');
  frames(120);
  key('Enter');
  frames(120);
});

step('全ステージの背景・環境エフェクト描画', () => {
  key('Enter'); // 再スタート
  const lastStage = run('LAST_STAGE');
  for (let s = 1; s <= lastStage; s++) { run(`stage = ${s};`); frames(90); }
});

step('必殺技（ボスあり）', () => {
  run('stage = LAST_STAGE; spawnBoss(); specialGauge = 100;');
  frames(30);
  key(' ');
  frames(120);
});

step('全クリア画面（エンディング3フェーズ）', () => {
  run('finalClear = true; state = "clear"; clearPhase = 0; clearT = 0; clearTransT = 0;');
  frames(60);
  key('Enter'); frames(40); // フェーズ0（星空ナレーション）→1へ暗転
  if (run('clearPhase') !== 1) throw new Error('フェーズ0からEnterで進まない: ' + run('clearPhase'));
  key('Enter'); frames(40); // フェーズ1（勇者と夜明け）→2へ暗転
  if (run('clearPhase') !== 2) throw new Error('フェーズ1からEnterで進まない: ' + run('clearPhase'));
  frames(200); // フェーズ2（せいせき・ハイスコア・ボスパレード）
  key('Enter'); frames(60); // 最終フェーズでEnter→タイトル
  if (run('state') !== 'title') throw new Error('エンディング後タイトルに戻らない: ' + run('state'));
  run('finalClear = false;');
});

function click(x, y) { for (const fn of handlers.click || []) fn({ clientX: x, clientY: y }); }

step('一時停止（Pキー・ボタンクリック・Esc・画面クリック再開）', () => {
  key('Enter'); // タイトル→ゲーム開始
  frames(30);
  key('p'); frames(60);                 // Pで停止
  if (!run('paused')) throw new Error('Pキーで一時停止しない');
  click(100, 100); frames(30);          // 画面クリックで再開
  if (run('paused')) throw new Error('クリックで再開しない');
  click(480 - 18, 38); frames(30);      // 右上ボタンで停止
  if (!run('paused')) throw new Error('ボタンで一時停止しない');
  key('Escape'); frames(30);            // Escで再開
  if (run('paused')) throw new Error('Escで再開しない');
});

step('ボス戦の必殺技3回制限＋自動チャージ＋巨大弾', () => {
  run('stage = 9; lives = 99; bossActive = false; warningTimer = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  frames(10);
  const limit = run('BOSS_SPECIAL_LIMIT');
  for (let i = 0; i < limit; i++) { run('specialGauge = 100;'); key(' '); frames(30); }
  if (run('bossSpecialsUsed') !== limit) throw new Error(`使用回数カウントが${limit}でない: ` + run('bossSpecialsUsed'));
  run('specialGauge = 100;'); key(' '); frames(30); // 上限超えはブロック
  if (run('specialGauge') < 100) throw new Error('上限超えがブロックされていない');
  const g0 = run('specialGauge = 50; specialGauge');
  frames(100); // ボス戦中の自動チャージ
  if (run('specialGauge') <= g0) throw new Error('ボス戦中にゲージが自動でたまらない');
  run('(function(){ const b = enemies.find(e => e.boss); if (b) { b.giantCharge = 5; b.y = 40; } })();');
  frames(500); // 巨大弾チャージ→発射→飛行→画面外で爆発
});

step('分裂ボスの初期HPは通常の半分', () => {
  run('stage = 3; bossActive = false; warningTimer = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  const hp = run('enemies.find(e => e.boss).maxHp');
  const full = run('Math.round(26 + stage * 16 + bossCount * 4)'); // ヒュドラはhpMul=1
  if (Math.abs(hp - Math.round(full * 0.5)) > 1) throw new Error(`分裂ボスHPが半分でない: ${hp} (通常${full})`);
  // 倒すと分裂→子のHPは親(半減後)の35%になっていること
  run('(function(){ killEnemy(enemies.find(e => e.boss)); })();');
  frames(10);
  const childHp = run('(enemies.find(e => e.boss) || { maxHp: -1 }).maxHp');
  if (childHp !== Math.max(6, Math.round(hp * 0.35))) throw new Error(`分裂後の子HPが想定外: ${childHp}`);
  run('enemies = enemies.filter(e => !e.boss); bossActive = false; state = "playing"; pendingTally = 0;');
  frames(30);
});

step('ボスへの攻撃ヒットでポイント加算＆武器進化', () => {
  run('stage = 9; bossActive = false; warningTimer = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();'); // ハデス（盾・弱点なし）
  run('score = 540; weaponIdx = weaponForScore(540);'); // 剣(550)の直前
  const before = run('score');
  run('(function(){ const b = enemies.find(e => e.boss); damageBoss(b, 1, b.x + b.size / 2, b.y + b.size / 2); })();');
  if (run('score') !== before + 10) throw new Error('ボスヒットで+10されない: ' + run('score'));
  if (run('WEAPONS[weaponIdx].name') !== '剣') throw new Error('ヒット加点で武器進化しない: ' + run('WEAPONS[weaponIdx].name'));
  run('enemies = enemies.filter(e => !e.boss); bossActive = false; state = "playing"; pendingTally = 0;');
  frames(30);
});

step('コンティニュー3回→使い切り→タイトル', () => {
  key('Enter'); // タイトルなら開始、プレイ中なら無視される
  run('state = "playing"; paused = false;');
  for (let i = 3; i >= 1; i--) {
    run('gear = {}; lives = 1; invincibleTimer = 0; hurtPlayer();');
    if (run('state') !== 'gameover') throw new Error('ゲームオーバーにならない');
    key(' '); // スペースでコンティニュー
    if (run('state') !== 'playing') throw new Error('コンティニューで復帰しない');
    if (run('continuesLeft') !== i - 1) throw new Error('残り回数が減らない: ' + run('continuesLeft'));
    frames(60);
  }
  run('gear = {}; lives = 1; invincibleTimer = 0; hurtPlayer();');
  key(' '); // 使い切ったのでコンティニュー不可
  if (run('state') !== 'gameover') throw new Error('使い切り後もコンティニューできてしまう');
  key('Enter');
  if (run('state') !== 'title') throw new Error('タイトルに戻れない');
  frames(60);
});

step('最終ボス崩壊シネマティック（地鳴り→崩壊→粉砕→撃破処理）', () => {
  run('if (state !== "playing") startGame();'); // タイトルにいる場合はゲームを開始してから
  run('stage = LAST_STAGE; lives = 99; bossActive = false; warningTimer = 0; finalClear = false; pendingTally = 0; enemies = enemies.filter(e => !e.boss); spawnBoss();');
  run('(function(){ const b = enemies.find(e => e.boss); b.y = 40; killEnemy(b); })();'); // 撃破→演出開始
  frames(200); // 地鳴り→崩壊フェーズ
  if (!run('enemies.some(e => e.boss && e.dying)')) throw new Error('崩壊演出が始まっていない');
  frames(420); // 粉砕→本来の撃破処理（地鳴り220f＋崩壊320fの計541f超まで回す）
  if (run('enemies.some(e => e.boss)')) throw new Error('粉砕後もボスが残っている');
  if (!run('finalClear')) throw new Error('撃破後にクリア進行へ入っていない');
  run('finalClear = false; pendingTally = 0; state = "playing";');
  frames(30);
});

step('エンディングBGM（clear状態でtickMusicがエラーなく回る）', () => {
  run('state = "clear"; musicFrame = 0; musicStep = 0;');
  frames(300);
  run('state = "title";');
  key('Enter');
  frames(30);
});

console.log(failed ? '\n>>> ERRORS FOUND' : '\n>>> ALL SMOKE TESTS PASSED');
process.exit(failed ? 1 : 0);
