// れんしゅうじょうの V キー（軌道神核へ即ジャンプ）の実測。
// 測るのは：①Vで転生カットシーンに入るか ②真の姿(trueForm)が成立するか
// ③BGMが maouTrue に切り替わるか ④分離中(Z直後)のVでも壊れないか ⑤例外0件。
// node vortex/scratchpad/cdp-practice-v.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8933, DBG = 9483;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=7`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-pracv')}`, 'about:blank'], { stdio: 'ignore' });

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
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  // BGMスパイ＋れんしゅうじょう相当のセットアップ（practiceMode + practiceSpawn('maou')）
  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound; window.__B = [];
    var ob = S.startBgm.bind(S);
    S.startBgm = function(nm){ window.__B.push(nm || 'battle'); return ob(nm); };
    var r = window.__run;
    r.practiceMode = true; r.withAudio = true;
    r.boss.practiceSpawn('maou');
    return true;
  })()`);
  for (let i = 0; i < 200; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'maouIntro') break;
    await sleep(100);
  }

  // --- ケース1：出現直後（分離前）に V 相当＝practiceAwaken ---
  const r1 = await evalJs(`window.__run.boss.practiceAwaken()`);
  await sleep(300);
  const st1 = await evalJs(`window.__run.boss.state`);
  console.log('①V→転生カットシーン: ' + (r1 === true && st1 === 'awakenCine' ? 'YES' : 'NO')
    + `（戻り値 ${r1} / state ${st1}）`);
  for (let i = 0; i < 80; i++) {
    if (await evalJs(`window.__run.boss.trueForm`)) break;
    await sleep(120);
  }
  await sleep(2600);   // trueForm は crackSec(2秒)時点で立つが、BGM切替は finishAwaken(4秒)なので待つ
  const tf1 = await evalJs(`window.__run.boss.trueForm`);
  const hp1 = await evalJs(`window.__run.boss.entity && window.__run.boss.entity.maxHp`);
  console.log('②真の姿が成立:      ' + (tf1 ? 'YES' : 'NO') + `（maxHp ${hp1}＝240000で正）`);
  // 転生済みの二重呼び出しは無視されること
  const r1b = await evalJs(`window.__run.boss.practiceAwaken()`);
  console.log('③二重Vは無視:       ' + (r1b === false ? 'YES' : 'NO'));

  // --- ケース2：出し直して分離中（Z相当＝HP49%）から V ---
  await evalJs(`(function(){ var r = window.__run; r.boss.practiceClear(); r.boss.practiceSpawn('maou'); return true; })()`);
  for (let i = 0; i < 200; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'maouIntro') break;
    await sleep(100);
  }
  await evalJs(`(function(){ var e = window.__run.boss.entity; e.hp = Math.floor(e.maxHp * 0.49); return true; })()`);
  for (let i = 0; i < 60; i++) {
    if (await evalJs(`window.__run.boss.split`)) break;
    await sleep(120);
  }
  const wasSplit = await evalJs(`window.__run.boss.split`);
  const r2 = await evalJs(`window.__run.boss.practiceAwaken()`);
  for (let i = 0; i < 80; i++) {
    if (await evalJs(`window.__run.boss.trueForm`)) break;
    await sleep(120);
  }
  await sleep(2600);
  const tf2 = await evalJs(`window.__run.boss.trueForm`);
  const parts = await evalJs(`window.__run.boss.partCount`);
  console.log('④分離中からのV:     ' + (wasSplit && r2 === true && tf2 ? 'YES' : 'NO')
    + `（分離中だった ${wasSplit} / 真の姿 ${tf2} / パーツ ${parts}＝9で正）`);
  const BGM = await evalJs(`window.__B || []`);
  console.log('⑤BGM切替の列:       ' + JSON.stringify(BGM) + '（maouTrue が2回入って正）');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
