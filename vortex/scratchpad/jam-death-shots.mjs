// 2026-09-13 堕天の大聖堂の撃破「祈りの終わり」を実プレイの等倍（640×360）で撮り、Result まで届くかを数で確かめる。
//   雑魚30体＋大聖堂を出し、chase になったら onBossKilled を直接呼ぶ（Run.killEnemy と同じ経路）。
// 使い方: node scratchpad/jam-death-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-death-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 12);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-death-shots');
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
  console.log('  shot', name, 'state=', await ev("(function(){var g=window.__vortexGame;var r=g.scene.getScene('Run');return r&&r.sys.settings.active&&r.boss?r.boss.state:'(Run inactive)';})()"), 'mobs=', await mobs());
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); } return false; }
async function waitState(pred, maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(30); } return null; }
async function waitScene(key, maxMs) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { const ok = await ev(`(function(){var s=window.__vortexGame.scene.getScene('${key}');return !!(s&&s.sys&&s.sys.settings.active);})()`); if (ok) return true; await sleep(100); } return false; }
const mobs = () => ev("(function(){var r=window.__run;if(!r||!r.sys.settings.active)return '-';var a=r.enemies.filter(function(e){return e.active&&!e.isBoss;});return a.length+'('+a.filter(function(e){return e.kneel;}).length+'k)';})()");

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamdeath-' + OFF);
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
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMDEATH_NG'); process.exit(1); }
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
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMDEATH_NG'); process.exit(1); }
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  await waitState((s) => s === 'maouIntro', 12000);
  await waitState((s) => s === 'chase', 14000);
  await sleep(6500);   // 猶予が明けて雑魚が戻るのを待つ
  await ev('window.__run.spawner.spawnBurst(30)');
  await sleep(800);
  // 聖歌隊も出しておく（撃破で一緒に還るか）
  await ev("window.__run.boss.debugAttack('choir')");
  await sleep(1200);
  await shot('00-before');
  const hp0 = await ev('window.__run.player.hp');
  const hits0 = await ev('window.__run.jamSt.hits');
  console.log('  kill →', await ev('(function(){ var r=window.__run; r.boss.onBossKilled(r.boss.entity); return r.boss.state; })()'));
  await sleep(250); await shot('10-blow');
  await sleep(700); await shot('11-glass');
  await sleep(1300); await shot('20-wings');
  await sleep(900); await shot('30-halo');
  await sleep(1300); await shot('40-rise');
  await sleep(900); await shot('50-burst');
  await sleep(700); await shot('60-line');
  await sleep(500); await shot('61-line2');
  console.log('  演出中の被弾 =', (await ev('window.__run.jamSt.hits')) - hits0, ' 体力 =', hp0, '→', await ev('window.__run.player.hp'));
  const ok = await waitScene('Result', 8000);
  console.log('  Result =', ok);
  await sleep(2800); await shot('90-result');
  console.log('  payload =', await ev("(function(){var s=window.__vortexGame.scene.getScene('Result');var d=s.scene.settings.data;return JSON.stringify({clear:d.clear,bossTimes:d.bossTimes,bossSec:d.jam&&d.jam.stat.bossSec,verdict:d.jam&&d.jam.verdict.id});})()"));
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMDEATH_EXC' : 'JAMDEATH_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMDEATH_NG'); process.exit(1); });
