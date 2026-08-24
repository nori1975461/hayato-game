// R31 追加調査：**実プレイで360秒に到達したとき、主人公はどれくらい強いのか**。
//
// 直前の実測で「レベル20（heroMult 2.65）ならマオウレクスは16秒・投げ14回で沈む」と分かった。
// つまり「体力がへらない」の正体は HP の絶対値ではなく、**そこへ到達したときの強さ**の可能性が高い。
// ここでは時間を飛ばさず、0秒から普通に遊ばせて 360秒時点のレベル／heroMult を測る。
//
// node vortex/scratchpad/cdp-r31-natural-level.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8899, DBG = 9449;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31n')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error('CDP target not found');
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
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: URL });
  await sleep(2000);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // 死なせない（強さの推移だけを見たいので、上手さの差は消す）
  await evalJs(`(function(){
    var r = window.__run;
    window.__snap = [];
    if (window.__godTimer) clearInterval(window.__godTimer);
    window.__godTimer = setInterval(function(){
      if(!r||!r.player) return; r.player.hp = r.player.maxHp; r.player.invuln = 1;
    }, 16);
    return true;
  })()`);

  // ---- 0秒から普通に遊ばせる（時間は飛ばさない）----
  await evalJs(`(async function(){
    var r = window.__run;
    var kd = function(k, c, code){ window.dispatchEvent(new KeyboardEvent(k,
      { key: c, code: code, keyCode: code === 'KeyJ' ? 74 : 0, which: code === 'KeyJ' ? 74 : 0, bubbles: true })); };
    var dirs = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
    var di = 0, turnT = 0;
    var last = 0;
    while (r.elapsed < 362 && !r.ended) {
      // 30秒ごとに強さを記録
      if (r.elapsed - last >= 30) {
        last = r.elapsed;
        window.__snap.push({ 秒: Math.round(r.elapsed), レベル: r.level,
          heroMult: +(r.stats.heroMult || 1).toFixed(2),
          ぶきLv: (r.orbit && r.orbit.weaponLevel) || 0 });
      }
      // 近い敵の方へ歩いて殴る（人間の下手さは再現できないので「常に前へ出る」を上限として測る）
      var t = r.nearestEnemy ? r.nearestEnemy(600, 0, false) : null;
      if (t) {
        var dx = t.x - r.player.x, dy = t.y - r.player.y, d = Math.hypot(dx, dy) || 1;
        if (d > 60) { r.player.x += (dx/d) * 2.2; r.player.y += (dy/d) * 2.2; }
        if (r.input.activePointer) {
          var cam = r.cameras.main;
          r.input.activePointer.x = t.x - cam.scrollX;
          r.input.activePointer.y = t.y - cam.scrollY;
          r._pointerMoveT = r.elapsed;
        }
      } else {
        turnT += 0.11;
        if (turnT > 1.5) { turnT = 0; di = (di + 3) % dirs.length; }
        r.player.x += dirs[di][0] * 2.0; r.player.y += dirs[di][1] * 2.0;
      }
      kd('keydown', 'j', 'KeyJ');
      await new Promise(function(res){ setTimeout(res, 70); });
      kd('keyup', 'j', 'KeyJ');
      await new Promise(function(res){ setTimeout(res, 40); });
    }
    return { 到達秒: Math.round(r.elapsed), 終了したか: !!r.ended };
  })()`);

  const snap = await evalJs(`window.__snap`);
  say('強さの推移（30秒ごと・死なない条件・常に敵へ前進する上限のボット）:');
  for (const s of (snap || [])) say('  ' + JSON.stringify(s));

  const at360 = await evalJs(`(function(){
    var r = window.__run;
    var B = r.billiard;
    return { 秒: Math.round(r.elapsed), レベル: r.level,
             heroMult: +(r.stats.heroMult || 1).toFixed(3),
             ぶきLv: (r.orbit && r.orbit.weaponLevel) || 0,
             投げた回数: (B && B.st && B.st.throws) || 0 };
  })()`);
  say('360秒時点: ' + JSON.stringify(at360));

  // その強さでマオウレクスは何秒もつか
  const fight = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    for (var i = 0; i < 400 && !(b.entity && b.entity.def && b.entity.def.id === 'maou'); i++) {
      await new Promise(function(res){ setTimeout(res, 100); });
    }
    for (var k = 0; k < 200 && b.state === 'maouIntro'; k++) await new Promise(function(res){ setTimeout(res, 50); });
    var e = b.entity;
    if (!e) return { マオウレクスに会えなかった: true };
    var hp0 = e.hp, t0 = r.elapsed;
    var end = Date.now() + 90000;
    var kd = function(k2, code){ window.dispatchEvent(new KeyboardEvent(k2,
      { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true })); };
    while (Date.now() < end && b.active) {
      var en = b.entity; if (!en) break;
      var w = b.weakPoint(en);
      var dx = en.x - r.player.x, dy = en.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 110) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x - cam.scrollX;
        r.input.activePointer.y = w.y - cam.scrollY;
        r._pointerMoveT = r.elapsed;
      }
      kd('keydown'); await new Promise(function(res){ setTimeout(res, 70); });
      kd('keyup');   await new Promise(function(res){ setTimeout(res, 40); });
    }
    var en2 = b.entity;
    var sec = Math.max(1, r.elapsed - t0);
    var lost = hp0 - (en2 ? en2.hp : 0);
    return { たたかった秒: Math.round(sec), へったHP: lost, maxHp: e.maxHp,
             へった割合: Math.round((lost / e.maxHp) * 100) + '%',
             たおせたか: !b.active,
             このペースで撃破に必要な秒: lost > 0 ? Math.round(e.maxHp / (lost / sec)) : -1 };
  })()`);
  say('マオウレクス戦（その強さのまま・コアを常に狙う上限のボット）: ' + JSON.stringify(fight));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-natural.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
