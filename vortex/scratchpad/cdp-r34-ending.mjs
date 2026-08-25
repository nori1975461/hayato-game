// R34 エンディングの実測。autotest はエンディングを飛ばす仕様なので**素のまま**起動し、
// Ending シーンを直接開いて、時刻ごとにスクリーンショットを撮る。
// 「発動したか」ではなく「見える位置で描画されているか」まで見る（過去の教訓）。
// node vortex/scratchpad/cdp-r34-ending.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8931, DBG = 9481;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
let exceptions = 0;

// 撮る時刻（秒）と、その瞬間に何を見たいのか
const SHOTS = [
  [0.9, 'houkai'],       // 第1幕 崩壊
  [2.4, 'hikari'],       // 第2幕 光が戻る
  [5.1, 'wipe'],         // 第3幕 イラストが左から出てくる途中
  [6.2, 'art'],          // イラスト全景＋テロップ
  [9.2, 'artline'],      // イラスト＋締めの1行
  [12.0, 'buddy1'],      // 第4幕 なかま1体目
  [14.8, 'buddy3'],      // なかま3体目
  [18.0, 'cheer'],       // 第5幕 歓声＋花火
  [21.5, 'record'],      // 第6幕 記録
  [26.5, 'theend'],      // 第7幕 締め
];

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
    `--remote-debugging-port=${DBG}`, '--window-size=680,400', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r34e')}`, 'about:blank'], { stdio: 'ignore' });

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
  await sleep(3000);

  // Boot が走ってテクスチャができるまで待つ
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){
      var g = window.__vortexGame;
      return !!(g && g.textures && g.textures.exists('ending_art') && g.textures.exists('mon_starpuppy'));
    })()`);
    if (!ready) await sleep(200);
  }
  console.log('テクスチャ ending_art: ' + (ready ? 'ある' : '**無い**'));
  if (!ready) exceptions++;

  const size = await evalJs(`(function(){
    var t = window.__vortexGame.textures.get('ending_art').getSourceImage();
    return { w: t.width, h: t.height };
  })()`);
  console.log('イラストの素の大きさ: ' + JSON.stringify(size) + '（6倍で '
    + (size ? size.w * 6 : 0) + '×' + (size ? size.h * 6 : 0) + '）');

  // 走っているシーンを全部止めて Ending を開く（なかま3体・記録つき）
  await evalJs(`(function(){
    var g = window.__vortexGame;
    ['Run','Title','Opening','Result','Ending'].forEach(function(k){
      var s = g.scene.getScene(k); if (s && g.scene.isActive(k)) g.scene.stop(k);
    });
    g.scene.start('Ending', {
      withAudio: false, elapsed: 372, kills: 812, captures: 6, coins: 4210,
      party: ['starpuppy', 'pikabit', 'togeron'],
    });
    return true;
  })()`);

  const t0 = Date.now();
  for (const [sec, name] of SHOTS) {
    const wait = t0 + sec * 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    if (r && r.data) {
      fs.writeFileSync(path.join(HERE, 'end-' + name + '.png'), Buffer.from(r.data, 'base64'));
      console.log('  撮影 ' + sec + 's -> end-' + name + '.png');
    }
  }

  const st = await evalJs(`(function(){
    var g = window.__vortexGame;
    var e = g.scene.getScene('Ending');
    return {
      'Endingがまだ動いている': g.scene.isActive('Ending'),
      'Resultへ遷移した': g.scene.isActive('Result'),
      'イラストが生きている': !!(e && e.art && e.art.scene),
      'イラストの表示サイズ': e && e.art ? [Math.round(e.art.displayWidth), Math.round(e.art.displayHeight)] : null,
      'イラストのalpha': e && e.art ? +e.art.alpha.toFixed(2) : null,
    };
  })()`);
  console.log('【最後の状態】' + JSON.stringify(st));

  // スキップが効くか（二重発火ガードも兼ねて2回押す）
  await evalJs(`(function(){
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
    return true;
  })()`);
  await sleep(900);
  const after = await evalJs(`(function(){
    var g = window.__vortexGame;
    return { 'SPACEでResultへ行った': g.scene.isActive('Result') };
  })()`);
  console.log('【スキップ】' + JSON.stringify(after));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}
main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
