// R44W4 せいく（聖句解放）の見た目を実描画で撮る。
//
// ★数だけでは「退廃的に見えるか」は確かめられない（R44W2 の教訓）。実際の画面を撮って目視する。
// ⚠️ WebGL のバックバッファは提示後に読めない（canvas.toDataURL は真っ黒）。
//    Phaser の renderer.snapshot がフレーム末に読み出す正しい経路。
// node vortex/scratchpad/shot-verse.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8967, DBG = 9517;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=29`;
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
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    console.log('  [eval EXC]', r.exceptionDetails.text
      || (r.exceptionDetails.exception && r.exceptionDetails.exception.description));
    return undefined;
  }
  return r.result && r.result.value;
}
async function snap(name, zoom) {
  await evalJs(`(function(){ window.__snap = null;
    window.__vortexGame.renderer.snapshot(function(img){ window.__snap = img.src; }); return true; })()`);
  let url = null;
  for (let i = 0; i < 40 && !url; i++) { await sleep(120); url = await evalJs('window.__snap'); }
  if (!url) { console.log(`  ${name}: snapshot が取れなかった`); return; }
  fs.writeFileSync(path.join(HERE, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('  書き出し: ' + name + '.png');
  if (!zoom) return;
  const z = await evalJs(`(async function(){
    var im = new Image(); im.src = window.__snap; await im.decode();
    var o = document.createElement('canvas');
    o.width = im.width * ${zoom}; o.height = im.height * ${zoom};
    var g = o.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  })()`);
  if (z) {
    fs.writeFileSync(path.join(HERE, name + `-${zoom}x.png`), Buffer.from(z.split(',')[1], 'base64'));
    console.log(`  書き出し: ${name}-${zoom}x.png`);
  }
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-awakenshot')}`, 'about:blank'], { stdio: 'ignore' });

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
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.hud&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  // かげおにを出す：真の姿→殻閉じ成立を待つ→影が歩いている絵と、炸裂直前の絵を撮る
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e) e.hp = e.maxHp * 0.9;
      r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  await sleep(5200);   // マオウレクスの登場カットシーンが終わるまで待つ
  // ★軌道神核が「出現した瞬間」を撮る＝セリフと名前が同時に読めるか目視で確かめる。
  //   transformToTrue は awakenCine の途中で起きるので、テロップの生成を監視して
  //   「名前が出た次のフレーム」で撮る（早すぎると粉砕の閃光、遅すぎるとテロップが消える）。
  await evalJs(`(function(){
    var r = window.__run;
    window.__named = false;
    var oa = r.add.text.bind(r.add);
    r.add.text = function(x, y, str, style){
      if (String(str).indexOf('軌道神核') >= 0) window.__named = true;
      return oa(x, y, str, style);
    };
    r.player.maxHp = 99999; r.player.hp = 99999;
    r.boss.practiceAwaken();
    return true;
  })()`);
  let named = false;
  for (let i = 0; i < 400 && !named; i++) {
    named = await evalJs('window.__named');
    if (!named) await sleep(60);
  }
  await sleep(420);           // 名前のテロップが明滅している最中
  console.log('軌道神核の出現: ' + (named ? 'YES' : 'NO'));
  await snap('awaken-name', 2);
  // ★R44W10「メッセージの後にコメントを」＝2枚に分かれているはず。
  //   名前の寿命 2.42秒 ＋ 遅延 2.52秒 なので、名前が消えた後にもう1枚撮る。
  await sleep(2500);
  console.log('（名前が消えたあと）');
  await snap('awaken-line', 2);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
