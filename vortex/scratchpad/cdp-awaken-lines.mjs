// R44W9 実プレイFB「**軌道神核出現時のコメントがない**。検証して」の実測。
//
// ★測るのは「どの場面で、どの文字が、実際に画面へ出ているか」。
//   ソースを読んで「出ているはず」と言うのは禁止（[[feedback_change_must_reach_the_player]]）。
//   run.add.text を包んで**生成された文字列そのもの**を場面ごとに分けて拾う：
//     ①マオウレクス出現（state='maouIntro'）… R44W6 で名乗りを入れた場面
//     ②軌道神核へ転生（startAwaken → transformToTrue）… 今回「コメントがない」と言われた場面
// node vortex/scratchpad/cdp-awaken-lines.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8966, DBG = 9516;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=33`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-awakenlines')}`, 'about:blank'], { stdio: 'ignore' });

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

  // run.add.text を包む。以後 window.__texts に {s: 文字列, st: そのときの state, y} が溜まる
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__texts = [];
    var oa = r.add.text.bind(r.add);
    r.add.text = function(x, y, str, style){
      window.__texts.push({ s: String(str), st: r.boss ? r.boss.state : '?', y: y });
      return oa(x, y, str, style);
    };
    return true;
  })()`);

  // ============ ① マオウレクス出現（maouIntro） ============
  await evalJs(`(function(){ window.__texts = []; window.__run.boss.practiceSpawn('maou'); return true; })()`);
  await sleep(6000);
  const introTexts = await evalJs('window.__texts');
  console.log('① マオウレクス出現（maouIntro）で画面に出た文字:');
  for (const t of (introTexts || [])) console.log(`     [${t.st}] y=${t.y}  「${t.s}」`);

  // ============ ② 軌道神核へ転生（startAwaken → transformToTrue） ============
  await evalJs(`(function(){
    var r = window.__run;
    window.__texts = [];
    r.player.maxHp = 99999; r.player.hp = 99999;
    r.boss.practiceAwaken();
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
  await sleep(1500);
  const awakenTexts = await evalJs('window.__texts');
  console.log('② 軌道神核へ転生（awakenCine → 出現）で画面に出た文字:');
  for (const t of (awakenTexts || [])) console.log(`     [${t.st}] y=${t.y}  「${t.s}」`);

  const all = (awakenTexts || []).map((t) => t.s).join(' / ');
  const hasName = /軌道神核/.test(all);
  const hasLine = /小さき光|消しさらん/.test(all);
  console.log('');
  console.log('判定: 軌道神核の**名前**が出たか   … ' + (hasName ? 'YES' : 'NO'));
  console.log('判定: 軌道神核の**セリフ**が出たか … '
    + (hasLine ? 'YES' : 'NO ← FBのとおり「コメントがない」'));
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
