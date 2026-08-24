// R31 実測：新SFXが**本当に音を合成しているか**。
//
// ⚠️ Sound.sfx は中で try/catch し、例外を握り潰して無音で返す（ゲームを止めないための設計）。
//    つまり新SFXの中身が壊れていても、呼び出し回数を数えるだけでは気づけない。
//    ここでは AudioContext のノード生成そのものを数えて「何個の音源が実際に作られたか」を見る。
//
// node vortex/scratchpad/cdp-r31-sfx.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8905, DBG = 9455;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31s')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error('CDP target not found');
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
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: URL });
  await sleep(2000);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  const out = await evalJs(`(async function(){
    window.__C = { osc: 0, buf: 0, peak: 0 };
    var AC = window.AudioContext || window.webkitAudioContext;
    var oc = AC.prototype.createOscillator, bs = AC.prototype.createBufferSource;
    AC.prototype.createOscillator = function() { window.__C.osc++; return oc.call(this); };
    AC.prototype.createBufferSource = function() { window.__C.buf++; return bs.call(this); };
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    try { window.__run.scene.pause(); } catch (e) {}
    S.init();
    S.stopBgm();
    await new Promise(function(x){ setTimeout(x, 400); });

    var names = ['samLaunch','samFly','samBoom','rocketPunchFire','rocketPunchFly','rocketPunchHit',
                 // 比較用の既存音（同じ物差しで見る）
                 'rocketHit','missileLaunch','missileFly','wireShot'];
    var res = {};
    for (var i = 0; i < names.length; i++) {
      window.__C.osc = 0; window.__C.buf = 0;
      S.sfx(names[i]);
      await new Promise(function(x){ setTimeout(x, 60); });
      res[names[i]] = { 音源: window.__C.osc, ノイズ: window.__C.buf };
    }
    return res;
  })()`);
  say('新旧SFXが作った音源の数（0なら例外を握り潰して無音になっている）:');
  for (const k of Object.keys(out || {})) say('  ' + k.padEnd(16) + ' ' + JSON.stringify(out[k]));

  const bad = Object.entries(out || {}).filter(([, v]) => (v.音源 + v.ノイズ) === 0).map(([k]) => k);
  say(bad.length ? '⚠️ 無音のSFX: ' + bad.join(',') : '無音のSFXなし（全部ちゃんと合成している）');

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-sfx.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
