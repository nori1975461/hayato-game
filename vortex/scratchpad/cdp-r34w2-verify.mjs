// R34 Wave2 の実測。実プレイFB:
//   「音楽が全然変わってない。本当に変えたのか？ ナックルウェーブやワイヤーアームも
//    攻撃音や発射音がなにもかわっていない。速度も変わっていない。私が見てるURLが違うのか？」
//
// ここで確かめるのは4つ:
//   ① importmap が効いて、全モジュールが ?v= 付きで取得されること（＝キャッシュを確実に破れる）
//   ② タイトルに版番号が出ること（ユーザーが自分で「古いのを見ている」と判別できる）
//   ③ ナックルウェーブが新しい音（knuckleWave / tomahawkFly / tomahawkBoom）を実際に鳴らすこと
//   ④ トマホークとワイヤーアームの**実速度**が上がっていること（設定値ではなく走っている値）
//
// node vortex/scratchpad/cdp-r34w2-verify.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8931, DBG = 9481;
const BASE = `http://127.0.0.1:${PORT}/vortex/index.html`;
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
const fetched = [];
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

const REP = [];
const say = (s) => { console.log(s); REP.push(s); };

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r34w2')}`, 'about:blank'], { stdio: 'ignore' });

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
    else if (m.method === 'Network.requestWillBeSent') { fetched.push(m.params.request.url); }
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
  await send('Network.enable');

  // ---------- ①② importmap と版表示（素のまま起動＝タイトルが出る） ----------
  await send('Page.navigate', { url: BASE });

  await sleep(2500);
  // オープニングを飛ばしてタイトルへ（版表示はタイトルにある）
  for (let i = 0; i < 40; i++) {
    const st = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return '';
      return g.scene.isActive('Title') ? 'title' : (g.scene.isActive('Opening') ? 'opening' : '?');})()`);
    if (st === 'title') break;
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',
      { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }))`);
    await sleep(300);
  }
  const mods = fetched.filter((u) => /\/vortex\/src\/.*\.js/.test(u));
  const versioned = mods.filter((u) => /\?v=/.test(u));
  say(`① モジュール取得 ${mods.length}本 / うち ?v= 付き ${versioned.length}本`);
  say('   ?v= が付いていないもの: ' + JSON.stringify(
    mods.filter((u) => !/\?v=/.test(u)).map((u) => u.split('/vortex/')[1])));

  const shown = await evalJs(`(function(){
    var g = window.__vortexGame; if (!g) return 'no-game';
    var t = g.scene.getScene('Title');
    if (!t || !t.children) return 'no-title';
    var out = [];
    t.children.list.forEach(function(o){ if (o.text) out.push(o.text); });
    return out.filter(function(s){ return /^v\\d/.test(s); }).join(',') || out.join('|').slice(0, 120);
  })()`);
  say('② タイトルの版表示: ' + JSON.stringify(shown));

  // ---------- ③④ 戦闘の実測 ----------
  await send('Page.navigate', { url: BASE + '?autotest=1&seed=42' });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__L = { sfx: {} };
    var os = S.sfx.bind(S);
    S.sfx = function(n, g, p) { window.__L.sfx[n] = (window.__L.sfx[n] || 0) + 1; return os(n, g, p); };
    return true;
  })()`);

  await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 900 && r.level < 27; i++) r.levelup.addXp(60);
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    window.__L.sfx = {};
    r.boss.practiceSpawn('maou');
    // 実速度の観測（設定値ではなく走っている値を測る）
    window.__M = { tomaMax: 0, tomaN: 0, wireMax: 0, t0: null, end: null,
                   split: null, merge: null, states: {} };
    window.__watch = setInterval(function(){
      var bs = r.boss.debugBullets ? r.boss.debugBullets() : [];
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].kind !== 'tomahawk') continue;
        var sp = Math.hypot(bs[i].vx, bs[i].vy);
        window.__M.tomaN++;
        if (sp > window.__M.tomaMax) window.__M.tomaMax = Math.round(sp);
      }
      var w = r.boss.debugWire ? r.boss.debugWire() : null;
      if (w && w.maxLen > window.__M.wireMax) window.__M.wireMax = Math.round(w.maxLen);
      var b0 = r.boss.entity;
      if (b0 && b0.active) {
        if (window.__M.t0 == null) window.__M.t0 = r.elapsed;
        var el = +(r.elapsed - window.__M.t0).toFixed(1);
        window.__M.end = el;
        window.__M.states[r.boss.state] = (window.__M.states[r.boss.state] || 0) + 1;
        if (r.boss.split && window.__M.split == null) window.__M.split = el;
        if (r.boss.phase3 && window.__M.merge == null) window.__M.merge = el;
      }
    }, 60);
    return true;
  })()`);

  // 自然プレイのボット（コアを狙って投げる）
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
        r.input.activePointer.y = w.y - cam.scrollY + (Math.cos(r.elapsed * 7) * 20);
      }
    }, 33);
    var key = function(type){
      window.dispatchEvent(new KeyboardEvent(type, { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
    };
    window.__mash = setInterval(function(){ key('keydown'); setTimeout(function(){ key('keyup'); }, 120); }, 330);
    return true;
  })()`);

  await sleep(55000);
  const m = await evalJs(`(function(){
    clearInterval(window.__bot); clearInterval(window.__mash); clearInterval(window.__watch);
    clearInterval(window.__god);
    return { 計測: window.__M, 音: window.__L.sfx };
  })()`);
  const S = (m && m.音) || {};
  say('');
  say('③ ナックルウェーブの音（回数）');
  say('   knuckleWave（新・発射）: ' + (S.knuckleWave || 0));
  say('   tomahawkFly（新・巡航）: ' + (S.tomahawkFly || 0));
  say('   tomahawkBoom（新・着弾）: ' + (S.tomahawkBoom || 0));
  say('   旧 knuckle / missileFly / shoot: '
    + (S.knuckle || 0) + ' / ' + (S.missileFly || 0) + ' / ' + (S.shoot || 0));
  say('   ワイヤーアーム rocketPunchFire/Fly/Hit: '
    + (S.rocketPunchFire || 0) + ' / ' + (S.rocketPunchFly || 0) + ' / ' + (S.rocketPunchHit || 0));
  say('   戦闘の長さ: ' + m.計測.end + '秒 / 分離 ' + m.計測.split + '秒 / 再合体 ' + m.計測.merge + '秒');
  say('   到達した状態: ' + Object.keys(m.計測.states).join(','));
  say('④ 実速度');
  say('   トマホークの実速度（最大）: ' + (m.計測.tomaMax) + ' px/秒（旧178・主人公148）');
  say('   トマホークのサンプル数: ' + m.計測.tomaN);
  say('   ワイヤーアームの実到達長（最大）: ' + m.計測.wireMax + ' px（旧330）');
  say('');
  say('EXCEPTIONS=' + exceptions);

  fs.writeFileSync(path.join(HERE, 'r34w2-verify.txt'), REP.join(NL), 'utf8');
  ws.close(); server.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
