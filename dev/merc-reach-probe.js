// 傭兵ナイトの槍が実プレイで敵に届いているかを実測する。
// 使い方: node dev/merc-reach-probe.js game.js [reach1 reach2 ...]
//
// 実プレイFB「今の槍では敵に届いてなくて全く戦力になっていない」を数で確かめる器。
// ⚠️ 判定はゲーム本体と同じ式で見る（[[feedback_instrument_must_match_impl]]）。
//    本体は「傭兵の中心 ⇔ 敵の中心」の距離を type.reach と比べているので、ここでも
//    中心間距離で測る。敵の半径ぶんは本体が見ていない＝それも込みで「届かない」。
// 主人公を動かさないと敵が主人公へ集まって傭兵の周りが不自然に混むので、
// 実プレイに寄せて矢印キーで動かし続ける。
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');
const REACHES = process.argv.slice(3).map(Number).filter((n) => n > 0);
const TRY = REACHES.length ? REACHES : [68];

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

let handlers, rafCb, sandbox;
function boot() {
  handlers = { keydown: [], keyup: [] };
  rafCb = null;
  sandbox = {
    console: { log() {}, warn() {}, error() {} },
    document: { getElementById: () => canvas },
    window: { addEventListener: (type, fn) => { (handlers[type] = handlers[type] || []).push(fn); }, prompt: () => null },
    localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); } },
    requestAnimationFrame: (cb) => { rafCb = cb; },
    Math, Set, Number, String, Array, Object, JSON,
  };
  sandbox.window.AudioContext = undefined;
  sandbox.window.webkitAudioContext = undefined;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
}
const run = (code) => vm.runInContext(code, sandbox);
const down = (k) => { for (const fn of handlers.keydown) fn({ key: k, preventDefault: () => {} }); };
const up = (k) => { for (const fn of handlers.keyup) fn({ key: k, preventDefault: () => {} }); };
const tap = (k) => { down(k); up(k); };

const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN);

function trial(reach, stage, seconds) {
  boot();
  rafCb();
  tap('Enter');                       // タイトル → プレイ
  run(`stage = ${stage}; lives = 99;`);
  run(`MERC_TYPES.mercKnight.reach = ${reach};`);
  run("hireMercenary('mercKnight');");

  const dists = [];                   // 毎フレームの「一番近い敵まで（中心間）」
  let atk = 0, inRange = 0, frames = 0, enemyFrames = 0;
  const DIRS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  let held = null;
  const N = Math.round(seconds * 60);
  for (let f = 0; f < N; f++) {
    if (f % 40 === 0) {               // 実プレイに寄せて向きを変えながら動き回る
      if (held) up(held);
      held = DIRS[(f / 40) % DIRS.length];
      down(held);
    }
    const before = run(`(function(){ var m = mercenaries[0];
      return m ? { c: m.atkCool, a: m.atkAnim } : null; })()`);
    rafCb();
    const st = run(`(function(){
      var m = mercenaries[0]; if (!m) return null;
      var best = Infinity;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.hp <= 0 || e.airborne || e.dying || e.flee) continue;
        var ex = e.x + e.size / 2, ey = e.y + e.size / 2;
        var d = Math.sqrt((ex - m.x) * (ex - m.x) + (ey - m.y) * (ey - m.y));
        if (d < best) best = d;
      }
      return { d: best, anim: m.atkAnim, alive: !m.dead, n: enemies.length };
    })()`);
    if (!st || !st.alive) break;
    frames++;
    if (st.n > 0 && isFinite(st.d)) {
      enemyFrames++;
      dists.push(st.d);
      if (st.d <= reach) inRange++;
    }
    // 攻撃の発火は atkAnim が 12 に立ち上がった瞬間で数える（本体の観測できる結果）
    if (before && st.anim === 12 && before.a < 12) atk++;
  }
  dists.sort((a, b) => a - b);
  return {
    reach, sec: +(frames / 60).toFixed(1), atk,
    perMin: +(atk / (frames / 60) * 60).toFixed(1),
    inRangePct: enemyFrames ? +(inRange / enemyFrames * 100).toFixed(1) : 0,
    dMin: +pct(dists, 0).toFixed(0), d25: +pct(dists, 0.25).toFixed(0),
    dMed: +pct(dists, 0.5).toFixed(0),
  };
}

for (const stage of [3, 12, 24]) {
  console.log(`\n=== ステージ${stage}・60秒 ===`);
  const rows = TRY.map((r) => trial(r, stage, 60));
  console.log('  reach | 攻撃回数 | 毎分 | 射程内の時間% | 最短 | 25% | 中央');
  for (const r of rows) {
    console.log(`  ${String(r.reach).padStart(5)} | ${String(r.atk).padStart(8)} | ${String(r.perMin).padStart(4)}`
      + ` | ${String(r.inRangePct).padStart(13)} | ${String(r.dMin).padStart(4)} | ${String(r.d25).padStart(3)} | ${String(r.dMed).padStart(4)}`);
  }
}
