// R44W10 実プレイFB「かげおには、軌道神核の攻撃であるせいれつを受けて爆発するパターンが
// **ほとんど**。それはおかしい」の実測。
//
// ★測るのは「影が果てた瞬間、ボスは何をしていたか」。16msごとに
//   shadowStats.novas / boss.state / debugBeam() をサンプリングし、
//   nova が増えたフレームの state とビームの有無を数える。
//   「ほとんど」が本当なら、重なりは設計上ほぼ必然のはず（殻の尺と影の寿命の足し算）。
// node vortex/scratchpad/cdp-shadow-overlap.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8968, DBG = 9518;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=41`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let exceptions = 0;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream',
    'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    exceptions++;
    console.log('  [eval EXC]', r.exceptionDetails.text
      || (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return undefined;
  }
  return r.result && r.result.value;
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-overlap')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') {
      exceptions++;
      const d = m.params.exceptionDetails;
      console.log('  [EXC]', d.text, (d.exception && d.exception.description) || '');
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      if (/404 \(Not Found\)/.test(m.params.entry.text || '')) return;
      exceptions++; console.log('  [LOG error]', m.params.entry.text);
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.sys.settings.status>=4&&r.boss.practiceSpawn);})()`);
    if (ok) break;
    await sleep(200);
  }
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e) e.hp = e.maxHp * 0.9; r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 80; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(300);
  }
  console.log('軌道神核へ転生: YES');

  // 16msごとに「nova が増えたフレームの state / ビームの有無」を数える
  await evalJs(`(function(){
    var r = window.__run, B = r.boss;
    window.__O = { total: 0, byState: {}, withBeam: 0, spawns: 0, holdT: 0, lastNovas: null,
      shellEnd: -1, novaTimes: [], beamTimes: [] };
    window.__o = setInterval(function(){
      if (!B.active) return;
      var O = window.__O, s = B.shadowStats, st = B.state;
      var beam = B.debugBeam ? B.debugBeam() : null;
      if (beam) { O.withBeamNow = true; O.beamTimes.push(+r.elapsed.toFixed(2)); }
      if (O.lastNovas == null) { O.lastNovas = s.novas; return; }
      var d = s.novas - O.lastNovas;
      if (d > 0) {
        O.total += d;
        O.byState[st] = (O.byState[st] || 0) + d;
        if (beam) O.withBeam += d;
        O.novaTimes.push(+r.elapsed.toFixed(2));
      }
      O.lastNovas = s.novas;
    }, 16);
    return true;
  })()`);

  // かげおにを3回ぶん観測する（殻閉じは攻撃ローテーションの1つなので時間がかかる）
  for (let i = 0; i < 1200; i++) {
    const n = await evalJs('window.__O.total');
    if (n >= 60) break;                    // 24体×3回 ≒ 72
    await sleep(250);
  }
  const O = await evalJs('window.__O');
  const st = O.byState || {};
  const keys = Object.keys(st).sort((a, b) => st[b] - st[a]);
  console.log('');
  console.log(`影が果てた回数（合計）: ${O.total}`);
  console.log('そのときボスは何をしていたか:');
  for (const k of keys) {
    console.log(`     ${k.padEnd(12)} ${st[k]}回  (${(st[k] / O.total * 100).toFixed(0)}%)`);
  }
  const beamPct = O.total ? (O.withBeam / O.total * 100) : 0;
  console.log('');
  console.log(`★ビームが**出ている最中**に爆発した割合: ${O.withBeam}/${O.total} = ${beamPct.toFixed(0)}%`);
  console.log('   ← FB「せいれつを受けて爆発するパターンがほとんど」の裏取り');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
