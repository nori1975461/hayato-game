// R47 ラゴンの見た目を実プレイの等倍で確かめる（[[feedback_pixel_art_judge_at_play_zoom]]）。
//   ①狩り中（槍が点火して突いている）②肩で息（槍をしまっている）の2枚を撮る。
// node vortex/scratchpad/cdp-r47-shot.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8978, DBG = 9528;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=41`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    console.log('  [EXC]', (r.exceptionDetails.exception
      && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return undefined;
  }
  return r.result && r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(HERE, name), Buffer.from(r.data, 'base64'));
  console.log('  saved', name);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=660,380', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r47s')}`, 'about:blank'], { stdio: 'ignore' });

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
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(3000);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.orbit&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }
  await evalJs(`(async function(){
    const m = await import('/vortex/src/data/monsters.js');
    const r = window.__run;
    r.party.length = 0;
    r.party.push({ def: m.MONSTERS.find((x) => x.id === 'starpuppy') });
    r.party.push({ def: m.MONSTERS.find((x) => x.id === 'lagon') });
    r.orbit.rebuild();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){ r.player.hp = 99999; }, 100);
    return true;
  })()`);

  // 状態を見ながら、狙った瞬間に撮る
  for (const [want, name] of [['hunt', 'r47-lagon-hunt.png'], ['pant', 'r47-lagon-pant.png']]) {
    for (let i = 0; i < 400; i++) {
      const d = await evalJs('window.__run.orbit.debugLancer()');
      if (d && d.state === want && (want !== 'hunt' || d.blade > 0.9)) {
        console.log(` ${want}:`, JSON.stringify(d));
        await shot(name);
        break;
      }
      await sleep(120);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
