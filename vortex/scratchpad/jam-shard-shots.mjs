// 2026-09-13 大聖堂の装甲片が「体の外・画面内・主人公との間」に出るかを等倍（640×360）で数える。
//   大聖堂を出して chase になったら dealDamage で最大HPの 34% を削り（dropShards の節目）、装甲片の位置を測る。
//   ①主人公が遠い（撃破位置のまま）②主人公が近い（体の当たりのすぐ外）の2回。
// 使い方: node scratchpad/jam-shard-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-shard-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 16);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-shard-shots');
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});

let ws, msgId = 0, exceptions = 0;
const pending = new Map();
function send(method, params = {}) { const id = ++msgId; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve) => pending.set(id, { resolve })); }
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { exceptions++; console.log('  [eval EXC]', (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return undefined; }
  return r.result && r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  shot', name);
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); } return false; }
async function waitState(pred, maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(30); } return null; }
// 装甲片の一覧：ボス中心からの距離・主人公からの距離・画面内か・掴める残り秒
const SHARDS = `(function(){var r=window.__run;var b=r.boss.entity;var v=r.cameras.main.worldView;var out=[];
  for(var i=0;i<r.enemies.length;i++){var e=r.enemies[i];if(!e.active||!e.shard)continue;
    out.push({db:Math.round(Math.hypot(e.x-b.x,e.y-b.y)),dp:Math.round(Math.hypot(e.x-r.player.x,e.y-r.player.y)),on:v.contains(e.x,e.y),stag:!!e.stag,t:+(e.stagT||0).toFixed(1),hp:e.hp});}
  return JSON.stringify({bossR:b.radius,dPl:Math.round(Math.hypot(r.player.x-b.x,r.player.y-b.y)),shards:out});})()`;

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamshard-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', `--remote-debugging-port=${DBG}`, '--window-size=640,360', '--hide-scrollbars',
    `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch { /* */ } });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(150);
  }
  if (!wsUrl) { console.log('NO_CHROME'); process.exit(2); }
  ws = new WebSocket(wsUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id).resolve(d.result || d); pending.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') { exceptions++; console.log('  [page EXC]', d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description); } };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=${SEED}` });
  if (!await waitRun(20000)) { console.log('RUN_NOT_READY'); process.exit(3); }
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; },16); return 1; })()`);
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  await waitState((s) => s === 'chase', 30000);
  await sleep(1500);

  // ① 主人公が遠いまま（登場位置＝上 130px）：34% を削って剥がす
  const hit = "(function(){var r=window.__run;var b=r.boss.entity;r.dealDamage(b,Math.round(b.maxHp*0.35),'#ffffff','manual',{x:b.x,y:b.y,hitR:10});return b.hp/b.maxHp;})()";
  const hp1 = await ev(hit);
  await sleep(150); await shot('10-far-fly');
  await sleep(600); await shot('11-far-landed');
  const far = JSON.parse(await ev(SHARDS));
  console.log('  ①遠い: hp=', (hp1 * 100).toFixed(0) + '%', JSON.stringify(far));

  // ② 主人公が近い（当たりのすぐ外 100px）：残りの装甲片を消してから、もう 34%
  await ev("(function(){var r=window.__run;for(var i=0;i<r.enemies.length;i++){var e=r.enemies[i];if(e.active&&e.shard){e.noReward=true;r.killEnemy(e,0xffffff,'expire');}}var b=r.boss.entity;r.player.x=b.x+100;r.player.y=b.y+40;return 1;})()");
  await sleep(300);
  const hp2 = await ev(hit);
  await sleep(750); await shot('20-near-landed');
  const near = JSON.parse(await ev(SHARDS));
  console.log('  ②近い: hp=', (hp2 * 100).toFixed(0) + '%', JSON.stringify(near));

  const okFar = far.shards.length >= 2 && far.shards.every((s) => s.db > far.bossR + 60 && s.on && s.stag && s.t >= 7.5);
  const okNear = near.shards.length >= 2 && near.shards.every((s) => s.db > near.bossR + 60 && s.on && s.stag);
  console.log('SHARD_FAR', okFar ? 'OK' : 'NG', 'SHARD_NEAR', okNear ? 'OK' : 'NG');
  console.log('EXCEPTIONS=', exceptions);
  process.exit(0);
}
main().catch((e) => { console.log('FATAL', e); process.exit(9); });
