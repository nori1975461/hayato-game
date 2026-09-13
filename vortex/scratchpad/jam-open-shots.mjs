// 2026-09-13 ジャム版オープニング（JamOpening）を実プレイの等倍（640×360）で撮り、カード→Run(jamMode) まで届くかを数で確かめる。
//   ?autotest=1&jam=1 で Run に入ってから scene を JamOpening へ切り替える（Title は autotest だと Run へ直行するため）。
// 使い方: node scratchpad/jam-open-shots.mjs [portOffset]   出力: scratchpad/jam-open-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const OFF = +(process.argv[2] || 13);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-open-shots');
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
const OPEN = "(function(){var g=window.__vortexGame;var s=g.scene.getScene('JamOpening');return s&&s.sys.settings.active?{card:!!s._onCard,fin:!!s._finished,objs:s._objs.length,texts:(s._texts||[]).length}:null;})()";
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  shot', name, JSON.stringify(await ev(OPEN)));
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;return true;})()`;
async function waitRun(maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); } return false; }
async function key(k, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: k === ' ' ? 32 : k.toUpperCase().charCodeAt(0) });
  await sleep(40);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: k === ' ' ? 32 : k.toUpperCase().charCodeAt(0) });
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamopen-' + OFF);
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
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=42` });
  if (!await waitRun(20000)) { console.log('RUN_NOT_READY'); process.exit(3); }

  // --- 本編：通しで見る（時刻表どおりに撮る） ---
  await ev("(function(){var g=window.__vortexGame;g.scene.stop('Run');g.scene.start('JamOpening');return true;})()");
  const t0 = Date.now();
  const plan = [[1600, '01-gods'], [3100, '02-one'], [4300, '03-descend'], [5000, '04-name'], [6200, '05-line'], [7000, '06-hero'], [7700, '07-grab'], [8600, '08-charge'], [9350, '09-throw'], [9800, '10-hit'], [10900, '11-concept'], [13400, '12-judge'], [15200, '13-card']];
  for (const [ms, name] of plan) { const w = t0 + ms - Date.now(); if (w > 0) await sleep(w); await shot(name); }
  const cardInfo = await ev(OPEN);
  await key(' ', 'Space');
  const toRun = await waitRun(6000);
  const jam = await ev("(function(){var r=window.__vortexGame.scene.getScene('Run');return r&&r.sys.settings.active?{jam:!!r.jamMode,audio:!!r.withAudio}:null;})()");
  console.log('CARD_THEN_SPACE→RUN', toRun, JSON.stringify(cardInfo), JSON.stringify(jam));

  // --- スキップ経路：1秒で SPACE → カードへ（Run へは飛ばない）→ もう一度で Run ---
  await ev("(function(){var g=window.__vortexGame;g.scene.stop('Run');g.scene.start('JamOpening');return true;})()");
  await sleep(1000);
  await key(' ', 'Space');
  await sleep(500);
  const afterSkip = await ev(OPEN);
  const runAfterSkip = await ev(RUN_READY);
  await shot('20-skip-card');
  await key('j', 'KeyJ');
  const toRun2 = await waitRun(6000);
  console.log('SKIP→CARD', JSON.stringify(afterSkip), 'runEarly=', runAfterSkip, 'J→RUN', toRun2);

  // --- 放置経路：カードで何も押さないと 8 秒で自動開始 ---
  await ev("(function(){var g=window.__vortexGame;g.scene.stop('Run');g.scene.start('JamOpening');var s=g.scene.getScene('JamOpening');setTimeout(function(){s.showCard(true);},300);return true;})()");
  await sleep(9200);
  const toRun3 = await ev(RUN_READY);
  console.log('CARD_IDLE_8S→RUN', toRun3);
  console.log('EXCEPTIONS=', exceptions);
  process.exit(0);
}
main().catch((e) => { console.log('FATAL', e); process.exit(9); });
