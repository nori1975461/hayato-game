// つなみウェーブだけを狙って観測する最小プローブ。PORT 8872 / DBG 9392。
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8872, DBG = 9392;
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

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${DBG}`,
    '--window-size=700,420', `--user-data-dir=${path.join(HERE, '.chrome-prof-r29t')}`, 'about:blank'], { stdio: 'ignore' });
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
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(1600);
  for (let i = 0; i < 60; i++) { if (await evalJs(`!!(window.__vortexGame&&window.__vortexGame.scene.getScene('Run').boss)`)) break; await sleep(200); }
  await evalJs(`(function(){ var r=window.__vortexGame.scene.getScene('Run'); window.__run=r;
    r.hitPlayer=function(){this.player.invuln=1;};
    if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
  // 前段3体を飛ばして wavelord を出す
  for (const [ti, sec] of [[0, 60], [1, 120], [2, 180]]) {
    void ti;
    await evalJs(`(function(){ window.__run.elapsed=${sec + 0.4}; return 1; })()`);
    for (let i = 0; i < 40; i++) { if (await evalJs(`!!(window.__run.boss.entity)`)) break; await sleep(100); }
    await evalJs(`(function(){var b=window.__run.boss; if(b.entity) b.onBossKilled(b.entity); return 1;})()`);
    for (let i = 0; i < 60; i++) { if (!(await evalJs(`!!(window.__run.boss.entity)`))) break; await sleep(100); }
  }
  await evalJs(`(function(){ window.__run.elapsed=240.4; return 1; })()`);
  for (let i = 0; i < 40; i++) { if (await evalJs(`(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id==='wavelord'`)) break; await sleep(100); }
  console.log('wavelord out');
  const log = [];
  const dl = Date.now() + 40000;
  let lastState = '';
  while (Date.now() < dl) {
    const v = await evalJs(`(function(){var r=window.__run,b=r.boss;
      if(b.entity && (b.state==='tsuTele'||b.state==='tsuFire'||b.state==='slamTele'||b.state==='slamHit')){ b.entity.x=r.player.x+200; b.entity.y=r.player.y; }
      return {s:b.state, n:b.bulletCount, d: b.entity? Math.round(Math.hypot(b.entity.x-r.player.x,b.entity.y-r.player.y)) : -1};})()`);
    if (v && (v.s !== lastState || v.n > 0)) { lastState = v.s; log.push(`${v.s}:${v.n}(d${v.d})`); }
    if (log.filter((x) => x.startsWith('tsuFire')).length > 6) break;
    await sleep(70);
  }
  console.log(log.join(' | '));
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
