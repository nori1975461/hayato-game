// 2026-09-13 堕天の大聖堂の降臨「神の降臨には、マキナが平伏す」を実プレイの等倍（640×360）で撮り、数で確かめる。
//   雑魚40体を出してから予告→ 平伏（止まっているか・接触ダメージ0か）→ 着地で昇天（残るのはエリートだけか）
//   → 登場終了直後は大聖堂だけか → 猶予のあと湧きが戻るか。
// 使い方: node scratchpad/jam-descend-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-descend-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 11);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-descend-shots');
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
  console.log('  shot', name, 'state=', await ev('window.__run && window.__run.boss ? window.__run.boss.state : null'), 'mobs=', await mobs());
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); } return false; }
async function waitState(pred, maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(30); } return null; }
const mobs = () => ev('JSON.stringify((function(){var r=window.__run;var a=r.enemies.filter(function(e){return e.active&&!e.isBoss;});return {n:a.length,kneel:a.filter(function(e){return e.kneel;}).length,elite:a.filter(function(e){return e.isElite;}).length};})())');
const snap = () => ev('JSON.stringify(window.__run.enemies.filter(function(e){return e.active&&!e.isBoss;}).map(function(e){return [e.id,Math.round(e.x),Math.round(e.y)];}))');

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamdesc-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });
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
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMDESC_NG'); process.exit(1); }
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
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMDESC_NG'); process.exit(1); }
  // 主人公は動かさない（雑魚に囲ませる）。体力は減らさない＝被弾は jamSt.hits で数える
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; },16); return 1; })()`);
  await ev('window.__run.spawner.spawnBurst(40)');
  await sleep(2500);
  await shot('00-before');
  const hits0 = await ev('window.__run.jamSt.hits');
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  await sleep(700);
  const s1 = JSON.parse(await snap());
  await shot('10-kneel');
  await sleep(1200);
  const s2 = JSON.parse(await snap());
  const m2 = new Map(s2.map((r) => [r[0], r]));
  let moved = 0, maxMove = 0;
  for (const r of s1) { const q = m2.get(r[0]); if (!q) continue; const d = Math.hypot(q[1] - r[1], q[2] - r[2]); if (d > 2) moved++; maxMove = Math.max(maxMove, d); }
  console.log('  平伏中に動いた雑魚 =', moved, '/', s1.length, ' 最大移動px =', maxMove.toFixed(1));
  await shot('11-kneel-later');
  await waitState((s) => s === 'maouIntro', 8000);
  await sleep(1400); await shot('20-descend');
  await sleep(1500); await shot('30-land');        // 着地 2.6s 付近
  await sleep(500); await shot('31-ascend');
  await sleep(1200); await shot('32-silence-end');
  const hits1 = await ev('window.__run.jamSt.hits');
  console.log('  予告〜着地の被弾 =', hits1 - hits0);
  await waitState((s) => s === 'chase', 12000);
  await sleep(400); await shot('40-alone');
  const hits2 = await ev('window.__run.jamSt.hits');
  console.log('  登場全体の被弾 =', hits2 - hits0);
  await sleep(3000); await shot('41-grace');
  await sleep(4500); await shot('50-spawn-back');
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMDESC_EXC' : 'JAMDESC_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMDESC_NG'); process.exit(1); });
