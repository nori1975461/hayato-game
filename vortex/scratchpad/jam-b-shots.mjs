// 2026-09-13 ジャム版・堕天の大聖堂の攻撃7種を「実プレイの等倍」で撮る（演出は発動するかでなく見える位置で描画されるかまで）。
//   ?autotest=1&jam=1 で起動 → 進行度を書いてウズバルカンを出す → 即撃破 → 大聖堂 → 状態ごとに1枚ずつ。
//   段階2（HP 60%）・段階3（HP 30%）は HP を書いて入る。主人公は無敵＆HP全快（撮影用）。
// 使い方: node scratchpad/jam-b-shots.mjs [seed] [portOffset]
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 2);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-b-shots');
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
async function waitState(pred, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await ev('window.__run.boss.state');
    if (pred(st)) return st;
    await sleep(35);
  }
  return null;
}
const seen = {};
async function captureStates(wantList, maxMs) {
  // 状態が来たら1枚（＋一部は少し遅らせてもう1枚）。全部そろうか時間切れで終わる。
  const t0 = Date.now();
  const want = new Set(wantList);
  while (Date.now() - t0 < maxMs && want.size) {
    const st = await ev('window.__run.boss.state');
    if (want.has(st)) {
      want.delete(st);
      const delay = { roseTele: 800, roseFire: 120, bellFire: 260, featherTele: 700, featherFire: 300, choirTele: 500,
        wireShot: 200, spireFire: 300, crackCine: 500, haloRoll: 900, haloNova: 250 }[st] || 0;
      if (delay) await sleep(delay);
      await shot(String(Object.keys(seen).length + 1).padStart(2, '0') + '-' + st);
      console.log('    弾', await ev('window.__run.boss.bulletCount'), JSON.stringify((await ev('JSON.stringify(window.__run.boss.debugBullets().slice(0,3))')) || ''), '主人公', await ev('JSON.stringify([Math.round(window.__run.player.x),Math.round(window.__run.player.y)])'), 'ボス', await ev('JSON.stringify([Math.round(window.__run.boss.entity.x),Math.round(window.__run.boss.entity.y)])'));
      seen[st] = true;
    }
    await sleep(30);
  }
  return [...want];
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', `--remote-debugging-port=${DBG}`, '--window-size=640,360', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-jamshot-' + OFF)}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch { /* */ } });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMSHOT_NG'); process.exit(1); }
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
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    ready = await ev(`(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||r.sys.settings.status<4)return false;window.__run=r;return !!(r.boss&&r.player&&r.moveKeys);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) { console.log('Run 起動待ちタイムアウト'); console.log('JAMSHOT_NG'); process.exit(1); }
  console.log('  jamMode =', await ev('window.__run.jamMode'));
  // 撮影用：主人公は無敵＆全快（hitPlayer は無敵だけ立てる＝攻撃の判定経路は通す）
  await ev(`(function(){ var r=window.__run; r.hitPlayer=function(){ this.player.invuln=1; };
    if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
  // ウズバルカンを出して即撃破
  await ev('(function(){ window.__run.progress = 181; return 1; })()');
  for (let i = 0; i < 80; i++) { if (await ev('!!(window.__run.boss.entity)')) break; await sleep(100); }
  console.log('  boss1 =', await ev('(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id'));
  await ev('(function(){var b=window.__run.boss; if(b.entity) b.onBossKilled(b.entity); return 1;})()');
  for (let i = 0; i < 80; i++) { if (!(await ev('!!(window.__run.boss.entity)'))) break; await sleep(100); }
  await ev('(function(){ window.__run.progress = 281; return 1; })()');
  for (let i = 0; i < 80; i++) { if (await ev(`(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id==='cathedral'`)) break; await sleep(100); }
  console.log('  boss2 =', await ev('(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id'));
  // 登場演出（セリフ）を1枚
  await waitState((s) => s === 'maouIntro', 4000);
  await sleep(2400); await shot('00-intro');
  await waitState((s) => s && s !== 'maouIntro', 8000);
  // 主人公を大聖堂の近く（投げの間合い170px）へ寄せ続ける＝等倍でボスが画面に入る
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ var b=r.boss.entity; if(!b) return; r.player.x=b.x-170; r.player.y=b.y+40; },50); return 1; })()`);
  // 段階1：薔薇窓・鐘・聖歌隊・鉄羽
  let miss = await captureStates(['roseTele', 'roseFire', 'bellTele', 'bellFire', 'choirTele', 'featherTele', 'featherFire'], 40000);
  console.log('  段階1 撮れなかった:', miss.join(',') || 'なし');
  // 段階2：HP 60% → 深紅の硝子＋配線の鞭
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.60); return 1;})()');
  await sleep(600); await shot('10-stage2-red');
  miss = await captureStates(['wireTele', 'wireShot'], 40000);
  console.log('  段階2 撮れなかった:', miss.join(',') || 'なし');
  // 段階3：HP 30% → 破鐘（光輪が外れて転がる→砕ける）→ 尖塔の連打
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.30); return 1;})()');
  miss = await captureStates(['crackCine', 'haloRoll', 'haloNova', 'spireTele', 'spireFire'], 45000);
  console.log('  段階3 撮れなかった:', miss.join(',') || 'なし');
  await sleep(300); await shot('20-stage3-idle');
  const st = await ev(`JSON.stringify({ state: window.__run.boss.state, hp: window.__run.boss.entity && window.__run.boss.entity.hp, parts: window.__run.boss.entity ? 1 : 0 })`);
  console.log('  終了時:', st, 'EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMSHOT_EXC' : 'JAMSHOT_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMSHOT_NG'); process.exit(1); });
