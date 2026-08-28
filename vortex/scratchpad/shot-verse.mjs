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
const PORT = 8954, DBG = 9504;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=21`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-verseshot')}`, 'about:blank'], { stdio: 'ignore' });

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

  // ①テクスチャそのものを並べて撮る（等倍と8倍）。形の良し悪しはまずここで見る。
  await evalJs(`(function(){
    var g = window.__vortexGame, s = window.__run;
    window.__sheet = [];
    var y = 40;
    ['verse_glyph', 'verse_glyph_fallen'].forEach(function(k, i){
      [1, 6].forEach(function(z, j){
        var im = s.add.image(120 + i * 220 + j * 90, y + 60, k)
          .setScrollFactor(0).setDepth(9999).setScale(z);
        if (k === 'verse_glyph') im.setTint(0xfff0b0); else im.setTint(0xa24bff);
        window.__sheet.push(im);
      });
    });
    return true;
  })()`);
  console.log('①テクスチャ見本（左＝聖・白金 / 右＝堕・紫）');
  await snap('verse-glyphs', 2);
  await evalJs('window.__sheet.forEach(function(i){ i.destroy(); }); true;');

  // ②実戦。真の姿を出して聖句を撃たせ、弾が飛んでいる瞬間を撮る。
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e) e.hp = e.maxHp * 0.9;
      r.player.hp = r.player.maxHp;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 60; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(400);
  }
  // 予告（魔法陣・3枚の環）
  for (let i = 0; i < 300; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st === 'verseTele') break;
    await sleep(120);
  }
  console.log('②予告（魔法陣＝金・白・紫黒の3環）');
  await snap('verse-telegraph', 2);
  // 発射中。堕ちた弾が十分そろうまで待つ
  for (let i = 0; i < 200; i++) {
    const n = await evalJs(`(function(){var g=window.__run.boss.debugGlyphs();
      return g.filter(function(b){return b.fallen;}).length;})()`);
    if (n >= 12) break;
    await sleep(80);
  }
  const mix = await evalJs(`(function(){
    var g = window.__run.boss.debugGlyphs();
    return { all: g.length, holy: g.filter(function(b){return !b.fallen;}).length,
      fallen: g.filter(function(b){return b.fallen;}).length };
  })()`);
  console.log(`③発射中（画面の弾 ${mix ? mix.all : '?'} 発＝聖 ${mix ? mix.holy : '?'} / 堕 ${mix ? mix.fallen : '?'}）`);
  await snap('verse-fire', 2);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
