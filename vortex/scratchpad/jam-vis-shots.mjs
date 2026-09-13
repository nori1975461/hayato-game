// 2026-09-13 堕天の大聖堂の「登場演出／天啓／専用弾／太い光柱／歩み」を実プレイの等倍（640×360）で撮る。
//   予告（暗転＋鐘）→ 降下 → 着地 → 無音 → セリフ → テロップ の各時刻、天啓の輪と柱、硝子片/聖釘/鉄羽、8本の光柱。
// 使い方: node scratchpad/jam-vis-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-vis-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 5);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-vis-shots');
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
// ボスの左下 170px に立つ（攻撃が画面内に収まる位置）
async function stand(dx, dy) {
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__h);return;} var b=r.boss.entity; if(!b) return; r.player.x=b.x+(${dx}); r.player.y=b.y+(${dy}); r.player.vx=120; r.player.vy=0; },50); return 1; })()`);
}
async function attackShots(name, tag, plan) {
  const st = await ev(`window.__run.boss.debugAttack('${name}')`);
  console.log('  攻撃', name, '→', st);
  let t = 0;
  for (const [at, label] of plan) { await sleep(Math.max(0, at - t)); t = at; await shot(tag + '-' + label); }
  await waitState((s) => s === 'chase', 12000);
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamvis-' + OFF);
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
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMVIS_NG'); process.exit(1); }
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
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMVIS_NG'); process.exit(1); }
  await godMode();
  await sleep(1500);

  // ---- 登場：予告 3.6秒（暗転＋鐘）→ 降下 2.6秒 → 着地 → 無音 0.9 → セリフ → テロップ
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  const t0 = Date.now();
  const warned = async () => ev('window.__run.boss.warned');
  for (let i = 0; i < 40; i++) { if (await warned()) break; await sleep(50); }
  console.log('  予告開始まで', Date.now() - t0, 'ms');
  await sleep(600); await shot('00-warn-bell1');
  await sleep(1300); await shot('01-warn-bell2');
  const st0 = await waitState((s) => s === 'maouIntro', 5000);
  const tI = Date.now();
  console.log('  出現 state =', st0, 'spawn→intro', Date.now() - t0, 'ms', 'bossPos', await ev('JSON.stringify({bx:Math.round(window.__run.boss.entity.x-window.__run.player.x),by:Math.round(window.__run.boss.entity.y-window.__run.player.y)})'));
  const at = async (ms, name) => { const d = ms - (Date.now() - tI); if (d > 0) await sleep(d); await shot(name); };
  await at(700, '02-descend-a');
  await at(1900, '03-descend-b');
  await at(2750, '04-land');
  await at(3400, '05-silence');
  await at(4600, '06-line1');
  await at(5700, '07-line2');
  await at(6600, '08-telop');
  const stA = await waitState((s) => s && s !== 'maouIntro', 6000);
  console.log('  intro 終了 state =', stA, 'intro 実時間', Date.now() - tI, 'ms');
  await sleep(300); await shot('09-after-intro');

  // ---- 歩み（chase）：一歩の前後
  await stand(-190, 60);
  await sleep(900); await shot('10-step-a');
  await sleep(450); await shot('11-step-b');

  // ---- 攻撃：天啓 ／ 鎮魂の鐘（硝子片） ／ 薔薇窓（8本の光柱） ／ 鉄羽 ／ 尖塔（聖釘・段階3）
  await attackShots('pillar', '20-pillar', [[350, 'tele'], [720, 'fall1'], [1300, 'fall2'], [1900, 'fall3']]);
  console.log('  天啓 被弾記録 =', await ev('JSON.stringify(window.__run.jamSt.hitsByCause)'));
  await attackShots('bell', '30-glass', [[900, 'wave1'], [1400, 'wave2'], [1900, 'wave3']]);
  console.log('  弾の種類 =', await ev('JSON.stringify(window.__run.boss.debugBullets().reduce(function(m,b){m[b.kind]=(m[b.kind]||0)+1;return m;},{}))'));
  await attackShots('rose', '40-rose', [[500, 'tele'], [1050, 'lock'], [1250, 'red'], [1800, 'blue']]);
  await attackShots('feathers', '50-feather', [[800, 'raise'], [1250, 'fire'], [1600, 'fly']]);
  // 段階3（破鐘）へ：HP を 30% に落として光輪が転がるのを待ち、尖塔の連打と滑り（推進炎）を撮る
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.30); return 1;})()');
  await waitState((s) => s === 'crackCine', 4000);
  await sleep(400); await shot('60-crack');
  await waitState((s) => s === 'haloNova', 12000);
  await sleep(250); await shot('61-nova-glass');
  await waitState((s) => s === 'chase', 12000);
  await sleep(700); await shot('62-glide');
  await attackShots('spires', '70-nail', [[700, 'fire1'], [1100, 'fire2']]);
  console.log('  弾の種類（段階3） =', await ev('JSON.stringify(window.__run.boss.debugBullets().reduce(function(m,b){m[b.kind]=(m[b.kind]||0)+1;return m;},{}))'));
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMVIS_EXC' : 'JAMVIS_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMVIS_NG'); process.exit(1); });
