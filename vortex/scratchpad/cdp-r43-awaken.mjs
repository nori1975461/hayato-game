// R43 転生カットシーンの実測。
// 測るのは推測ではなく結果：①4段（亀裂→溜め→粉砕→出現）が全部起きるか ②破片の実数
// ③各段の実測秒 ④出現後に小片が残っていないか ⑤例外0件。
// node vortex/scratchpad/cdp-r43-awaken.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8941, DBG = 9491;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=5`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r43')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true; r.withAudio = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    r.boss.practiceSpawn('maou');
    return true;
  })()`);
  await sleep(1200);

  // 転生へ直行（本編と同じ startAwaken を通る口）
  await evalJs(`(function(){
    var r = window.__run;
    window.__A = { t0: r.elapsed, rows: [], peakShard: 0, doneAt: null };
    // ボスのテクスチャを持つ画像を数える＝本体パーツ＋粉砕の小片（同じ絵の複製）
    window.__count = function(){
      var n = 0, list = r.children.list;
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (o.texture && o.texture.key && /^boss_maou/.test(o.texture.key) && o.visible && o.alpha > 0.02) n++;
      }
      return n;
    };
    window.__w = setInterval(function(){
      var A = window.__A, st = r.boss.state, c = window.__count();
      if (c > A.peakShard) A.peakShard = c;
      A.rows.push({ t: +(r.elapsed - A.t0).toFixed(2), st: st, n: c,
        tf: !!r.boss.trueForm, aw: !!r.boss.awakening });
      if (A.doneAt == null && r.boss.trueForm && !r.boss.awakening) A.doneAt = +(r.elapsed - A.t0).toFixed(2);
    }, 50);
    r.boss.practiceAwaken();
    return true;
  })()`);

  await sleep(12000);
  const fin = await evalJs(`(function(){
    var A = window.__A, r = window.__run;
    clearInterval(window.__w); clearInterval(window.__god);
    // 段の切り替わりだけを抜き出す
    var seq = [], last = null;
    for (var i = 0; i < A.rows.length; i++) {
      var x = A.rows[i];
      if (x.st !== last) { seq.push(x.t + 's ' + x.st + ' (画像' + x.n + ')'); last = x.st; }
    }
    // 粉砕直後のピークと、出現完了後の残り
    var tail = A.rows[A.rows.length - 1];
    return { 段の列: seq, 破片ピーク枚数: A.peakShard, 転生完了秒: A.doneAt,
      最終状態: tail.st, 最終画像数: tail.n, trueForm: tail.tf, awakening: tail.aw };
  })()`);
  console.log('\n=== R43 転生カットシーン実測 ===');
  console.log(JSON.stringify(fin, null, 1));
  if (fin) {
    console.log('判定: 破片が9枚（旧体パーツのみ）を超えた:', fin.破片ピーク枚数 > 9 ? 'YES ' + fin.破片ピーク枚数 + '枚' : 'NO');
    console.log('判定: 転生が完了した:', fin.trueForm && !fin.awakening ? 'YES' : 'NO');
    console.log('判定: 出現後に小片が残っていない（9枚前後）:', fin.最終画像数 <= 10 ? 'YES ' + fin.最終画像数 : 'NO ' + fin.最終画像数);
  }
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
