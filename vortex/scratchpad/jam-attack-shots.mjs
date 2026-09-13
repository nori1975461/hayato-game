// 2026-09-13 堕天の大聖堂「決めの1瞬」9案＋ネムッコの覚醒を実プレイの等倍（640×360）で撮る。
//   薔薇窓の薙ぎ／鎮魂の鐘の3波目（穴なし）／天啓の3本目（巨大）／聖歌隊の刃／鉄羽の両翼／配線の鞭（両腕）／
//   破鐘のスロー／聖釘の置き弾／堕天以降の重ね（天啓）。ネムッコは仲間に足して覚醒フラグを読む。
// 使い方: node scratchpad/jam-attack-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-attack-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 9);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-attack-shots');
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
  const st = await ev('window.__run && window.__run.boss ? window.__run.boss.state : null');
  console.log('  shot', name, 'state=', st);
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); }
  return false;
}
async function waitState(pred, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(30); }
  return null;
}
async function godMode() {
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
}
async function stand(dx, dy) {
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__h);return;} var b=r.boss.entity; if(!b) return; r.player.x=b.x+(${dx}); r.player.y=b.y+(${dy}); r.player.vx=120; r.player.vy=0; },50); return 1; })()`);
}
async function attackShots(name, tag, plan) {
  const st = await ev(`window.__run.boss.debugAttack('${name}')`);
  console.log('  攻撃', name, '→', st);
  let t = 0;
  for (const [at, label] of plan) { await sleep(Math.max(0, at - t)); t = at; await shot(tag + '-' + label); }
  await waitState((s) => s === 'chase', 14000);
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamatk-' + OFF);
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
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMATK_NG'); process.exit(1); }
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
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMATK_NG'); process.exit(1); }
  await godMode();
  // ネムッコを仲間に足す（寝ている姿で大聖堂を待つ）
  const bust = await ev("(function(){var s=document.querySelector('script[type=module]');return s?s.src:'';})()");
  const v = (bust.match(/[?&]v=([^&]+)/) || [])[1] || '';
  console.log('  nemukko join =', await ev(`import('/vortex/src/data/monsters.js${v ? '?v=' + v : ''}').then(function(m){ var r=window.__run; var d=m.MONSTERS.find(function(x){return x.id==='nemukko';}); r.party.push({def:d}); r.orbit.rebuild(); return r.party.length; })`));
  await sleep(1200);
  console.log('  sleepy before boss =', JSON.stringify(await ev('window.__run.orbit.debugSleepy()')));
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  await waitState((s) => s === 'maouIntro', 12000);
  await waitState((s) => s && s !== 'maouIntro', 12000);
  await sleep(1500);
  console.log('  sleepy on boss =', JSON.stringify(await ev('window.__run.orbit.debugSleepy()')));
  await shot('00-nemukko-awake');
  await stand(-190, 60);
  await sleep(600);

  await attackShots('rose', '10-rose', [[500, 'tele'], [1300, 'red'], [1800, 'blue'], [2300, 'sweep-a'], [2650, 'sweep-b']]);
  await attackShots('bell', '20-bell', [[900, 'wave1'], [1400, 'wave2'], [1950, 'wave3-closed'], [2400, 'after']]);
  await attackShots('pillar', '30-pillar', [[350, 'tele'], [760, 'fall1'], [1350, 'fall2'], [1950, 'big-tele'], [2280, 'big-fall']]);
  await attackShots('choir', '40-choir', [[900, 'sing'], [3900, 'warn'], [4300, 'blade'], [4800, 'blade2']]);
  await attackShots('feathers', '50-feather', [[800, 'raiseR'], [1300, 'fireR'], [1950, 'raiseL'], [2500, 'fireL'], [2900, 'fly']]);
  // 堕天（段階2）へ：HP 60% → 配線の鞭（両腕）と、鎮魂の鐘に天啓が重なる
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.60); return 1;})()');
  await sleep(2500);
  await waitState((s) => s === 'chase', 12000);
  await attackShots('whip', '60-whip', [[1050, 'tele'], [1250, 'shot-a'], [1500, 'shot-b'], [1800, 'shot-c']]);
  await attackShots('bell', '65-bell2', [[700, 'overlay-tele'], [1400, 'wave2+pillar']]);
  // 破鐘（段階3）→ 聖釘の置き弾
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.30); return 1;})()');
  await waitState((s) => s === 'crackCine', 4000);
  await waitState((s) => s === 'haloNova', 12000);
  await sleep(150); await shot('70-crack-nova');
  await waitState((s) => s === 'chase', 12000);
  await attackShots('spires', '80-nail', [[700, 'fire'], [1300, 'stuck'], [2050, 'burst-warn'], [2450, 'burst']]);
  console.log('  sleepy fired =', JSON.stringify(await ev('window.__run.orbit.debugSleepy()')));
  console.log('  被弾記録 =', await ev('JSON.stringify(window.__run.jamSt.hitsByCause)'));
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMATK_EXC' : 'JAMATK_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMATK_NG'); process.exit(1); });
