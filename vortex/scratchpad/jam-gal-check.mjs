// 2026-09-13 ジャム版「裁き」の結果画面・傷跡・光輪の欠片を「実プレイの等倍」で撮る。
//   1回目：大聖堂を 60% まで削って死ぬ → 裁き（死因・残り%）→ V で一覧 → SPACE で再挑戦（Run に直接戻るか）
//   2回目：HUD の傷跡（60% の刻み）→ 越えた瞬間 → 30% で破鐘 → 光輪の欠片（金の輪）→ 掴んで投げ当てる → 撃破の裁き
// 使い方: node scratchpad/jam-result-shots.mjs [seed] [portOffset]
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 4);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-result-shots');
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
async function key(code, keyName) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 32 });
  await sleep(40);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 32 });
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); }
  return false;
}
async function waitScene(name, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await ev(`(function(){var g=window.__vortexGame;var s=g&&g.scene.getScene('${name}');return !!(s&&s.sys&&s.sys.settings.active);})()`);
    if (ok) return true;
    await sleep(120);
  }
  return false;
}
async function waitState(pred, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(35); }
  return null;
}
async function godMode() {
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
}
async function spawnCathedral() {
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  for (let i = 0; i < 80; i++) { if (await ev(`(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id==='cathedral'`)) break; await sleep(100); }
  await waitState((s) => s === 'maouIntro', 4000);
  await waitState((s) => s && s !== 'maouIntro', 9000);
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__h);return;} var b=r.boss.entity; if(!b) return; r.player.x=b.x-170; r.player.y=b.y+40; },50); return 1; })()`);
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamresult-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });   // localStorage を空から（傷跡の初回/2回目を確かめる）
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', `--remote-debugging-port=${DBG}`, '--window-size=640,360', '--hide-scrollbars',
    `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch { /* */ } });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMRESULT_NG'); process.exit(1); }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { exceptions++; const d = m.params.exceptionDetails; console.log('  [EXC]', d.text, (d.exception && d.exception.description) || ''); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=${SEED}` });
  await sleep(2500);
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); process.exit(1); }
  await ev('(function(){ var r=window.__run; r.player.invuln=0; r.player.hp=1; r._shieldT=0; return 1; })()');
  const ok1 = await waitScene('Result', 30000);
  console.log('Result =', ok1);
  await sleep(2600); await shot('90-check-result');
  await key('KeyV', 'v'); await sleep(400);
  console.log('gal =', await ev("(function(){var s=window.__vortexGame.scene.getScene('Result');return s&&s._gal?JSON.stringify({vis:s._gal.visible,n:s._gal.list.length,depth:s._gal.depth}):'nogal';})()"));
  await shot('91-check-gallery');
  // 2026-09-13 実プレイのスクショと同じ「中段4行＋仲間3体」の最悪ケース＝仲間の行が表と重ならないか
  await ev(`(function(){ var g=window.__vortexGame; var rs=g.scene.getScene('Result'); var d=rs.scene.settings.data;
    d.clear=false; d.party=['billiko','samet','neonworm']; d.bossTimes=[-144];
    d.jam.stat.deathCause='whip'; d.jam.stat.remainPct=13; d.jam.stat.stage=2; d.jam.stat.haloGrabbed=false; d.jam.stat.choirWaves=3; d.jam.stat.choirBest=1;
    d.jam.stat.throws=47; d.jam.prevBest=0; d.jam.improved=false; d.jam.tries=17; d.jam.seen={};
    var vs=d.jam.verdict; rs.scene.restart(d); return 1; })()`);
  await sleep(2600); await shot('92-check-result-full');
  await key('KeyV', 'v'); await sleep(400); await shot('93-check-gallery-cur');
  console.log('EXCEPTIONS=', exceptions); process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); process.exit(1); });
