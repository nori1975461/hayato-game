// R34 実測②：マオウレクスの24000HPを、誰が何秒で削っているのか（内訳）。
// 「撃破が速すぎる」の原因を推測ではなく配分で出す。dealDamage の合流点を包んで src 別に集計する。
// node vortex/scratchpad/cdp-r34-dps.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8917, DBG = 9467;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=7`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r34d')}`, 'about:blank'], { stdio: 'ignore' });

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

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  const lv = await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 900 && r.level < 27; i++) r.levelup.addXp(60);
    return { レベル: r.level, heroMult: +(r.stats.heroMult || 1).toFixed(2), withAudio: !!r.withAudio };
  })()`);
  say('主人公: ' + JSON.stringify(lv));

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    window.__D = { by: {}, hits: {}, big: [], t0: null, phase: [], last: null };
    var od = r.dealDamage.bind(r);
    r.dealDamage = function(e, dmg, color, src, at) {
      var b = r.boss.entity;
      if (e && b && e === b) {
        var hp0 = e.hp;
        var out = od(e, dmg, color, src, at);
        var real = hp0 - e.hp;
        if (real > 0) {
          var key = src || 'unknown';
          window.__D.by[key] = (window.__D.by[key] || 0) + real;
          window.__D.hits[key] = (window.__D.hits[key] || 0) + 1;
          if (real >= 900) window.__D.big.push({ src: key, dmg: Math.round(real),
            t: +(r.elapsed - (window.__D.t0 || r.elapsed)).toFixed(1) });
        }
        return out;
      }
      return od(e, dmg, color, src, at);
    };
    r.boss.practiceSpawn('maou');
    window.__watch = setInterval(function(){
      var b = r.boss.entity; if (!b) return;
      if (window.__D.t0 == null) window.__D.t0 = r.elapsed;
      var st = r.boss.state;
      if (st !== window.__D.last) {
        window.__D.phase.push({ st: st, t: +(r.elapsed - window.__D.t0).toFixed(1),
          hp: Math.round(b.hp / b.maxHp * 100) + '%' });
        window.__D.last = st;
      }
    }, 50);
    return true;
  })()`);

  for (let i = 0; i < 200; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'maouIntro') break;
    await sleep(100);
  }

  await evalJs(`(function(){
    var r = window.__run;
    window.__bot = setInterval(function(){
      var b = r.boss.entity; if (!b || !r.player) return;
      var dx = b.x - r.player.x, dy = b.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 110) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      var w = r.boss.weakPoint(b);
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x - cam.scrollX + (Math.sin(r.elapsed * 7) * 20);
        r.input.activePointer.y = w.y - cam.scrollY + (Math.cos(r.elapsed * 5) * 20);
        r._pointerMoveT = r.elapsed;
      }
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      setTimeout(function(){
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      }, 70);
    }, 120);
    return true;
  })()`);

  let dead = false;
  for (let i = 0; i < 160 && !dead; i++) {
    dead = await evalJs(`(function(){ return !window.__run.boss.entity || !window.__run.boss.active; })()`);
    if (!dead) await sleep(500);
  }

  const fin = await evalJs(`(function(){
    var r = window.__run, D = window.__D;
    clearInterval(window.__bot); clearInterval(window.__watch);
    var tot = 0; for (var k in D.by) tot += D.by[k];
    var pct = {};
    for (var k2 in D.by) pct[k2] = Math.round(D.by[k2]) + ' (' + Math.round(D.by[k2] / tot * 100) + '%) / '
      + D.hits[k2] + '発 = 1発' + Math.round(D.by[k2] / D.hits[k2]);
    return {
      'ボスに入った総ダメージ': Math.round(tot),
      '内訳': pct,
      '900以上の一撃': D.big,
      '状態の推移': D.phase,
    };
  })()`);
  say('【ダメージの内訳】' + JSON.stringify(fin, null, 1));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r34-dps.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}
main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
