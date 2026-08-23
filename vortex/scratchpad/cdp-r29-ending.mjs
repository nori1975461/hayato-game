// CDP 実機検証（R29）：エンディングを直接起動して、各ビートのPNGと例外を確認する。
// PORT 8874 / DBG 9394。 node vortex/scratchpad/cdp-r29-ending.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8874, DBG = 9394;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let exceptions = 0;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});
let ws, msgId = 0; const pending = new Map();
function send(m, p = {}) { const id = ++msgId; ws.send(JSON.stringify({ id, method: m, params: p })); return new Promise((r) => pending.set(id, { resolve: r })); }
async function evalJs(e) {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true });
  if (r.exceptionDetails) { exceptions++; console.log('[eval EXC]', r.exceptionDetails.text, (r.exceptionDetails.exception || {}).description); return undefined; }
  return r.result && r.result.value;
}
async function shot(n) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(HERE, `r29-end-${n}.png`), Buffer.from(r.data, 'base64'));
  console.log('  shot', n);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${DBG}`,
    '--window-size=700,420', '--hide-scrollbars', `--user-data-dir=${path.join(HERE, '.chrome-prof-r29e')}`, 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const pg = l.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (pg) wsUrl = pg.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { exceptions++; console.log('[EXC]', m.params.exceptionDetails.text, (m.params.exceptionDetails.exception || {}).description); }
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      if (/404 \(Not Found\)/.test(m.params.entry.text || '')) return;
      exceptions++; console.log('[LOG error]', m.params.entry.text);
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Page.navigate', { url: URL });
  await sleep(1800);
  for (let i = 0; i < 60; i++) { if (await evalJs(`!!(window.__vortexGame&&window.__vortexGame.scene.getScene('Run'))`)) break; await sleep(200); }

  // autotest フラグを外してからエンディングを起動（autotest だと即 Result へ飛ばす仕様のため）
  const ok = await evalJs(`(function(){
    window.VORTEX.autotest = false;
    var g = window.__vortexGame;
    g.scene.stop('Run');
    g.scene.start('Ending', { withAudio:false, elapsed: 372.4, kills: 863, captures: 14, coins: 1250,
      party: ['comethound','togeking','pikabit','aurorajelly','biricco'] });
    return true;
  })()`);
  console.log('ending started:', ok);

  // 各ビートで撮る（ビート表：0.2 光戻り前 / 2.0 宣言 / 6.5〜 なかま / 全員 / 記録 / THE END）
  const marks = [[600, 'b1-afterglow'], [2100, 'b2-light'], [3600, 'b3-declare'],
    [6600, 'b4-buddy1'], [7900, 'b4-buddy2'], [9200, 'b4-buddy3'], [10500, 'b4-buddy4'],
    [11800, 'b4-buddy5'], [12900, 'b5-cheer'], [14800, 'b6-record'], [18800, 'b7-theend']];
  let prev = 0;
  for (const [t, n] of marks) { await sleep(t - prev); prev = t; await shot(n); }

  const scene = await evalJs(`(function(){ var g=window.__vortexGame;
    return g.scene.getScenes(true).map(function(s){return s.scene.key;}).join(','); })()`);
  console.log('active scenes:', scene);

  // スキップ→Result へ遷移するか
  await evalJs(`(function(){ var e=window.__vortexGame.scene.getScene('Ending'); e.toResult(); return 1; })()`);
  await sleep(700);
  const after = await evalJs(`(function(){ var g=window.__vortexGame;
    return g.scene.getScenes(true).map(function(s){return s.scene.key;}).join(','); })()`);
  console.log('after skip:', after);
  await shot('result');

  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); console.log('EXCEPTIONS=' + (exceptions + 1)); process.exit(1); });
