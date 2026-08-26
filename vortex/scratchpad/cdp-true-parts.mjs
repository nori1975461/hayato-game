// 真マオウレクスの各パーツが「実際にどこに・どの大きさで」置かれているかを数値で出す。
// スクリーンショットを目で見て原因を当てにいくと外す（設計プレビューでは成立していた構図が
// 本編で読めない、という状態そのものが「絵の問題」なのか「置き方の問題」なのか分からない）。
// node vortex/scratchpad/cdp-true-parts.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8935, DBG = 9485;
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
    `--remote-debugging-port=${DBG}`, '--window-size=560,520', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-tpart')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    r.boss.practiceSpawn('maou');
    return true;
  })()`);
  for (let i = 0; i < 400; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st === 'chase') break;
    await sleep(100);
  }
  console.log('出現後の state: ' + await evalJs(`window.__run.boss.state`));
  await evalJs(`window.__run.killEnemy(window.__run.boss.entity)`);
  let got = false;
  for (let i = 0; i < 200; i++) {
    if (await evalJs(`window.__run.boss.trueForm`)) { got = true; break; }
    await sleep(100);
  }
  console.log('転生した: ' + (got ? 'YES' : 'NO')
    + '  state=' + await evalJs(`window.__run.boss.state`)
    + '  awakening=' + await evalJs(`window.__run.boss.awakening`)
    + '  partCount=' + await evalJs(`window.__run.boss.partCount`));
  await sleep(1600);
  await evalJs(`window.__keep = setInterval(function(){
    var b = window.__run.boss.entity; if (b) b.hp = b.maxHp; }, 50)`);
  await sleep(500);

  const info = await evalJs(`(function(){
    var r = window.__run, b = r.boss.entity, cam = r.cameras.main;
    var out = { boss: { x: Math.round(b.x), y: Math.round(b.y), radius: b.radius },
      cam: { w: cam.width, h: cam.height, sx: Math.round(cam.scrollX), sy: Math.round(cam.scrollY) },
      player: { x: Math.round(r.player.x), y: Math.round(r.player.y) }, parts: [] };
    r.children.list.forEach(function(o){
      var k = o.texture && o.texture.key;
      if (!k || k.indexOf('boss_maou_T') !== 0) return;
      out.parts.push({ tex: k.replace('boss_maou_T',''),
        dx: Math.round(o.x - b.x), dy: Math.round(o.y - b.y),
        w: Math.round(o.displayWidth), h: Math.round(o.displayHeight),
        depth: o.depth, alpha: +o.alpha.toFixed(2), vis: o.visible,
        sx: +o.scaleX.toFixed(2), sy: +o.scaleY.toFixed(2) });
    });
    out.parts.sort(function(a,c){ return a.depth - c.depth; });
    return out;
  })()`);

  console.log('');
  console.log('カメラ ' + info.cam.w + 'x' + info.cam.h
    + '  ボス(' + info.boss.x + ',' + info.boss.y + ') r=' + info.boss.radius
    + '  主人公(' + info.player.x + ',' + info.player.y + ')');
  // ボスが画面のどこに居るか（カメラ座標）＝はみ出しの実測
  const bx = info.boss.x - info.cam.sx, by = info.boss.y - info.cam.sy;
  console.log('ボスの画面内座標: (' + Math.round(bx) + ',' + Math.round(by) + ')');
  console.log('');
  console.log('depth  パーツ    中心ずれ(dx,dy)   表示サイズ  scale        α   画面内の左右端');
  for (const p of info.parts) {
    const l = Math.round(bx + p.dx - p.w / 2), rr = Math.round(bx + p.dx + p.w / 2);
    const t = Math.round(by + p.dy - p.h / 2), bo = Math.round(by + p.dy + p.h / 2);
    const outFlag = (l < 0 || rr > info.cam.w || t < 0 || bo > info.cam.h) ? '  ←はみ出し' : '';
    console.log(String(p.depth).padStart(5) + '  ' + p.tex.padEnd(8)
      + ('(' + p.dx + ',' + p.dy + ')').padStart(12)
      + ('  ' + p.w + 'x' + p.h).padStart(12)
      + ('  ' + p.sx + '/' + p.sy).padStart(14)
      + ('  ' + p.alpha).padStart(6)
      + '   x[' + l + '..' + rr + '] y[' + t + '..' + bo + ']' + outFlag);
  }
  console.log('');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
