// R34 実測：マオウレクス戦で「実際に何が起きて、何が起きないまま終わるか」。
//
// 実プレイFB4件（音楽が変わっていない／ミサイルとロケットパンチの音／再合体の
// メタリックパープルが出ない／撃破7秒は早すぎる）を、同じ1回の戦闘の中で全部数える。
// ⚠️ 仮説：戦闘が短すぎて、用意したものが**再生される前に終わっている**。
//    BGMは84BPM×8小節＝1周22.9秒。明るくした材料（ピカルディ終止）は後半4小節にある。
//
// node vortex/scratchpad/cdp-r34-maou.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8926, DBG = 9476;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
let exceptions = 0;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
    'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    exceptions++;
    console.log('  [eval EXC]', r.exceptionDetails.text
      || (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return undefined;
  }
  return r.result && r.result.value;
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r34b')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') {
      exceptions++;
      const d = m.params.exceptionDetails;
      console.log('  [EXC]', d.text, (d.exception && d.exception.description) || '');
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      if (/404 \(Not Found\)/.test(m.params.entry.text || '')) return;
      exceptions++; console.log('  [LOG error]', m.params.entry.text);
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // 音の観測。⚠️ headless では AudioContext を作らないと startBgm が即 return する。
  // ここでは「鳴った/鳴らない」ではなく **呼ばれたか** を数えるので init は不要だが、
  // BGMの小節進行だけは実際の再生器に依存するため Sound.init() を通しておく。
  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__S = S;
    try { S.init(); } catch (e) { /* headless */ }
    window.__L = { sfx: {}, bgm: [], bgmSteps: 0 };
    var os = S.sfx.bind(S);
    S.sfx = function(name, g, p) { window.__L.sfx[name] = (window.__L.sfx[name] || 0) + 1; return os(name, g, p); };
    var ob = S.startBgm.bind(S);
    S.startBgm = function(n) { window.__L.bgm.push({ name: n, t: Math.round(window.__run.elapsed) }); return ob(n); };
    return true;
  })()`);

  // レベルを実プレイ相当（R31実測：360秒でLv27）まで上げてから最終ボスを出す
  const lv = await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 900 && r.level < 27; i++) r.levelup.addXp(60);
    return { レベル: r.level, heroMult: +(r.stats.heroMult || 1).toFixed(2) };
  })()`);
  say('主人公の強さ（実プレイ相当）: ' + JSON.stringify(lv));

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    window.__L.sfx = {}; window.__L.bgm = [];
    r.boss.practiceSpawn('maou');
    // 節目の観測（分離・再合体・紫）
    window.__M = { split: null, merge: null, purpleSeen: 0, purpleFirst: null,
                   states: {}, hp: [], t0: null };
    window.__watch = setInterval(function(){
      var b = r.boss.entity;
      if (!b) return;
      if (window.__M.t0 == null) window.__M.t0 = r.elapsed;
      var el = +(r.elapsed - window.__M.t0).toFixed(1);
      window.__M.states[r.boss.state] = (window.__M.states[r.boss.state] || 0) + 1;
      if (r.boss.split && window.__M.split == null) window.__M.split = el;
      if (r.boss.phase3 && window.__M.merge == null) window.__M.merge = el;
      // ⚠️ 実装はメタリック光沢のため tint を毎フレーム混ぜているので、定数一致では拾えない。
      // 「紫かどうか」（青 > 赤 > 緑かつ青が濃い）で判定する。
      var tint = r.boss.bossTint;
      if (tint != null) {
        var rr = (tint >> 16) & 255, gg = (tint >> 8) & 255, bb = tint & 255;
        if (bb >= 200 && bb > rr && rr > gg) {
          window.__M.purpleSeen++;
          if (window.__M.purpleFirst == null) window.__M.purpleFirst = el;
          window.__M.purpleTint = '#' + tint.toString(16).padStart(6, '0');
        }
      }
      window.__M.hp.push({ t: el, hp: b.hp, max: b.maxHp });
    }, 100);
    return true;
  })()`);

  // イントロが終わるのを待つ
  for (let i = 0; i < 200; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'maouIntro') break;
    await sleep(100);
  }
  say('イントロ終了。ここから自然プレイ（ボットはコアを狙い、Jを連打してコアへ投げる）');

  // 自然プレイのボット（R31 と同じ手順：コアを狙って投げる）
  await evalJs(`(function(){
    var r = window.__run;
    window.__bot = setInterval(function(){
      var b = r.boss.entity;
      if (!b || !r.player) return;
      var dx = b.x - r.player.x, dy = b.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 110) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      var w = r.boss.weakPoint(b);
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x - cam.scrollX + (Math.sin(r.elapsed * 7) * 20);
        r.input.activePointer.y = w.y - cam.scrollY + (Math.cos(r.elapsed * 5) * 20);
        r._pointerMoveT = r.elapsed;
      }
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      setTimeout(function(){
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      }, 70);
    }, 120);
    return true;
  })()`);

  let dead = false;
  for (let i = 0; i < 240 && !dead; i++) {
    dead = await evalJs(`(function(){ return !window.__run.boss.entity || !window.__run.boss.active; })()`);
    if (!dead) await sleep(500);
  }

  const fin = await evalJs(`(function(){
    var r = window.__run, M = window.__M, L = window.__L;
    clearInterval(window.__bot); clearInterval(window.__watch);
    var last = M.hp.length ? M.hp[M.hp.length - 1] : null;
    var killT = null;
    for (var i = 0; i < M.hp.length; i++) { if (M.hp[i].hp <= 0) { killT = M.hp[i].t; break; } }
    // BGMの1周は 60/84/4*16*8 秒。何周ぶん鳴ったか＝明るくした後半4小節に届いたか
    var loopSec = 60 / 96 / 4 * 16 * 8;
    var fought = last ? last.t : 0;
    return {
      たたかった秒: fought,
      HPが0になった秒: killT,
      分離した秒: M.split, 再合体した秒: M.merge,
      メタリックパープルが出ていた秒: +(M.purpleSeen * 0.1).toFixed(1),
      紫が最初に出た秒: M.purpleFirst,
      BGMの切替: L.bgm,
      'BGM1周の長さ(秒)': +loopSec.toFixed(1),
      '戦闘中に鳴った周回数': +(fought / loopSec).toFixed(2),
      '明るい後半(5-8小節)に届いたか': fought >= loopSec / 2 ? 'とどいた' : 'とどいていない',
      メタリックパープルの実色: M.purpleTint || null,
      ボスが使った攻撃: M.states,
      'ミサイル（本体の斉射）': (L.sfx.samLaunch || 0) / 3,
      'ミサイルの飛来音/着弾音': (L.sfx.samFly || 0) + ' / ' + (L.sfx.samBoom || 0),
      'ロケットパンチ 射出/飛来/命中': (L.sfx.rocketPunchFire || 0) + ' / '
        + (L.sfx.rocketPunchFly || 0) + ' / ' + (L.sfx.rocketPunchHit || 0),
      鳴った効果音: L.sfx,
    };
  })()`);
  say('【マオウレクス戦の実測】' + JSON.stringify(fin, null, 1));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r34-maou.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}
main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
