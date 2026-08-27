// R44W2 タイトル画面の目視確認用スクリーンショット。
// 実プレイFBで名指しされたのは**見た目**（ロゴの色／副題／モビットの並び）なので、
// 数だけでは足りない＝[[feedback_pixel_art_judge_at_play_zoom]]（等倍で判定する）。
// 等倍(640x360)と2倍拡大の2枚を書き出す。
// node vortex/scratchpad/shot-title.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8949, DBG = 9499;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?seed=3`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const evalJs = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
  return r.result && r.result.value;
};

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${DBG}`, '--window-size=660,400', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-shot')}`, 'about:blank'], { stdio: 'ignore' });

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
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(2500);

  // オープニングを開始→即スキップして Title を出す
  const key = (code) => evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',
    { key: ' ', code: '${code}', keyCode: 32, which: 32, bubbles: true })); true;`);
  await key('Space');
  await sleep(400);
  await key('Space');
  await sleep(1200);

  const on = await evalJs(`(function(){var s=window.__vortexGame.scene.getScene('Title');
    return !!(s && s.sys.settings.active);})()`);
  console.log('Title表示: ' + (on ? 'YES' : 'NO'));

  // ⚠️ WebGL のバックバッファは提示後に読めない（canvas.toDataURL は真っ黒になる）。
  //    Phaser の renderer.snapshot はフレーム末に読み出すので、これが正しい経路。
  await evalJs(`(function(){ window.__snap = null;
    window.__vortexGame.renderer.snapshot(function(img){ window.__snap = img.src; }); return true; })()`);
  let dataUrl = null;
  for (let i = 0; i < 40 && !dataUrl; i++) { await sleep(150); dataUrl = await evalJs('window.__snap'); }
  if (!dataUrl) { console.log('snapshot が取れなかった'); process.exit(1); }
  fs.writeFileSync(path.join(HERE, 'title-1x.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('書き出し: title-1x.png');

  // 2倍拡大（NEAREST）。ドット絵は等倍で判定するが、色の判断には拡大も要る。
  const zoomUrl = await evalJs(`(async function(){
    var im = new Image(); im.src = window.__snap;
    await im.decode();
    var o = document.createElement('canvas');
    o.width = im.width * 2; o.height = im.height * 2;
    var g = o.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  })()`);
  if (zoomUrl) {
    fs.writeFileSync(path.join(HERE, 'title-2x.png'), Buffer.from(zoomUrl.split(',')[1], 'base64'));
    console.log('書き出し: title-2x.png');
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
