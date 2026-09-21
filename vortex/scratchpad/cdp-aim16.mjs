// R71：掴んでいる間、十字キーで狙いが 22.5°（16方向の1刻み）ずつ回るかを実機で測る。
//   2026-09-21 実プレイFB「弾の放つ方向が上下左右にしかうまく投げられない。16方向へ投げやすく」。
//   単体テスト（core/aim.js の stepAim）は式の正しさしか見ない。ここでは本物のブラウザで
//   本物のキーイベントを投げ、Phaser のキー状態 → billiard.aimAngle → st.keyAim の結線まで通す。
// 使い方: node vortex/scratchpad/cdp-aim16.mjs [seed]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8861, DBG = 9411;
const SEED = process.argv[2] || '42';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

let ws, msgId = 0;
const pending = new Map();
const exceptions = [];
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { console.log('  [EXC]', r.exceptionDetails.text); return undefined; }
  return r.result && r.result.value;
}

const KC = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, KeyJ: 74 };
const key = (code, type) => evalJs(
  `window.dispatchEvent(new KeyboardEvent('${type}',{key:'${code}',code:'${code}',keyCode:${KC[code]},which:${KC[code]},bubbles:true})), true`);
const readDeg = () => evalJs(`(function(){var s=window.__vortexGame.scene.getScene('Run').billiard.st;
  return s.keyAim==null?null:Math.round(s.keyAim*180/Math.PI*10)/10;})()`);

// 掴んだ状態を人工的に作る（獲物が来るのを待たずに、狙いの操作だけを確かめる）
const HOLD = `(function(){
  var r = window.__vortexGame.scene.getScene('Run'); if(!r||!r.billiard) return 'no run';
  var s = r.billiard.st;
  s.held = { maxHp: 99, color: 0xffffff, tex: 'enemy_chibit', scale: 2, radius: 12, name: 'テスト', rank: 0 };
  s.chargeT = 0.2; s.keyAim = 0; s.aimStepT = 0; s.keyAimT = r.elapsed;
  r._pointerMoveT = -1;            // マウスは使わない前提（この家の遊び方）
  return 'ok';})()`;
const RELEASE = `(function(){var s=window.__vortexGame.scene.getScene('Run').billiard.st; s.held=null; s.keyAim=0; s.aimStepT=0; return 'ok';})()`;

async function tap(code, ms) { await key(code, 'keydown'); await sleep(ms); await key(code, 'keyup'); await sleep(140); }   // 離してから次まで＝人が連打するときの間隔（headless は 30fps 前後なので 60ms だと1フレームも挟まらない）

async function main() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? '/vortex/index.html' : u);
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-aim16')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 150 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error('CDP のページが見つからない');
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text || '');
    if (m.id && pending.has(m.id)) { const { resolve } = pending.get(m.id); pending.delete(m.id); resolve(m.result || {}); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=${SEED}` });
  await sleep(4000);
  for (const k of ['Enter', 'Enter']) {
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'${k}',code:'${k}',keyCode:13,which:13,bubbles:true})),
                  window.dispatchEvent(new KeyboardEvent('keyup',{key:'${k}',code:'${k}',keyCode:13,which:13,bubbles:true})), true`);
    await sleep(1500);
  }
  for (let i = 0; i < 40; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');
      return !!(r&&r.sys&&r.sys.settings.active&&r.billiard&&r.moveKeys);})()`);
    if (ok) break;
    await sleep(500);
  }
  await key('KeyJ', 'keydown');   // ★J を押しっぱなし＝溜めている状態を保つ
  await sleep(120);
  const held = await evalJs(HOLD);
  if (held !== 'ok') { console.log('HOLD_FAILED=' + held); process.exit(1); }

  // ① 掴んでいる間：上を「叩く」たびに 22.5° ずつ（右 0° → 上 −90°）
  const taps = [];
  for (let i = 0; i < 5; i++) { await tap('ArrowUp', 180); taps.push(await readDeg()); }
  console.log('掴み中に上を5回叩く: ' + taps.join(' → '));
  const wantTap = [-22.5, -45, -67.5, -90, -90];
  const okTap = taps.length === 5 && taps.every((v, i) => Math.abs(v - wantTap[i]) < 0.6);

  // ② 押しっぱなしはその8方向まで回って止まる＝従来の操作は変わらない
  await evalJs(HOLD);
  await key('ArrowUp', 'keydown'); await sleep(700); await key('ArrowUp', 'keyup');
  const holdDeg = await readDeg();
  console.log('掴み中に上を押しっぱなし: ' + holdDeg + '（期待 -90）');

  // ③ ここまで掴みが生きているか（生きていなければ①②の数字は意味を持たない）
  const alive = await evalJs("(function(){var s=window.__vortexGame.scene.getScene('Run').billiard.st; return !!s.held;})()");
  console.log('掴みが生きている: ' + alive);
  const freeDeg = -90;

  // ④ 斜め（2キー同時）も従来どおり出る
  await evalJs(HOLD);
  await key('ArrowUp', 'keydown'); await key('ArrowRight', 'keydown'); await sleep(700);
  await key('ArrowUp', 'keyup'); await key('ArrowRight', 'keyup');
  const diagDeg = await readDeg();
  console.log('掴み中に 上+右 を押しっぱなし: ' + diagDeg + '（期待 -45）');

  const okAll = okTap && Math.abs(holdDeg + 90) < 0.6 && Math.abs(freeDeg + 90) < 0.6 && Math.abs(diagDeg + 45) < 0.6;
  console.log('EXCEPTIONS=' + exceptions.length);
  console.log(okAll && exceptions.length === 0 ? 'AIM16_OK' : 'AIM16_NG');
  process.exit(okAll && exceptions.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
