// R31 実測：分離した下半身に玉を当てたとき、玉が**食べられず弾かれる**か。
//
// 旧実装では下半身に当たった玉は消費され、bossImpact が止め・揺れ・衝撃波・金属音を全部出した
// うえで「0」を表示していた（＝全力の投げが丸ごと消える）。修正後は「カキン！」だけ返して通す。
//
// node vortex/scratchpad/cdp-r31-lower.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8907, DBG = 9457;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31l')}`, 'about:blank'], { stdio: 'ignore' });

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

  await evalJs(`(function(){
    var r = window.__run;
    window.__M = { lowerDmg: 0, deflects: 0, coreHits: 0, throws0: 0 };
    var od = r.dealDamage.bind(r);
    r.dealDamage = function(e, dmg, color, src, at) {
      if (e && e.isLowerHalf && src === 'manual' && at && at.x != null) window.__M.lowerDmg++;
      return od(e, dmg, color, src, at);
    };
    var odf = r.boss.deflect;
    r.boss.deflect = function(x, y) { window.__M.deflects++; return odf(x, y); };
    for (var i = 0; i < 60 && r.level < 27; i++) { try { r.levelup.addXp(200); } catch (e) { break; } }
    r.elapsed = 360.4;
    return true;
  })()`);

  const out = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    b.practiceSpawn('maou');
    for (var k = 0; k < 200 && b.state === 'maouIntro'; k++) await new Promise(function(x){ setTimeout(x, 50); });
    if (!b.entity) return { マオウレクスが出なかった: true };
    // 分離の節目まで一気に落として、分離が起きるのを待つ
    b.entity.hp = Math.floor(b.entity.maxHp * 0.49);
    for (var j = 0; j < 300 && !b.split; j++) await new Promise(function(x){ setTimeout(x, 50); });
    if (!b.split) return { 分離しなかった: true };
    // 分離後はHPを固定（倒すと再合体まで行ってしまう）。主人公も死なせない。
    if (window.__pin) clearInterval(window.__pin);
    window.__pin = setInterval(function(){
      if (b.entity) b.entity.hp = Math.floor(b.entity.maxHp * 0.45);
      if (r.player) r.player.hp = r.player.maxHp;
    }, 16);
    var kd = function(k2){ window.dispatchEvent(new KeyboardEvent(k2,
      { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true })); };
    var t0 = Date.now(), aimed = 0;
    // ★下半身だけを狙い続ける（＝旧実装なら投げが全部そこで消えていた状況）
    while (Date.now() - t0 < 45000 && b.split) {
      var lp = b.lowerPos;
      if (lp) {
        aimed++;
        var dx = lp.x - r.player.x, dy = lp.y - r.player.y, d = Math.hypot(dx, dy) || 1;
        if (d > 150) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
        if (r.input.activePointer) {
          var cam = r.cameras.main;
          r.input.activePointer.x = lp.x - cam.scrollX;
          r.input.activePointer.y = lp.y - cam.scrollY;
          r._pointerMoveT = r.elapsed;
        }
      }
      kd('keydown'); await new Promise(function(x){ setTimeout(x, 70); });
      kd('keyup');   await new Promise(function(x){ setTimeout(x, 40); });
    }
    clearInterval(window.__pin);
    return { 下半身を狙ったフレーム: aimed, 投げた回数: r.billiard.st.throws,
             下半身へのダメージ判定が走った回数: window.__M.lowerDmg,
             はじかれた回数: window.__M.deflects, まだ分離中か: !!b.split };
  })()`);
  say('【下半身】分離中に下半身だけを狙って45秒: ' + JSON.stringify(out));
  say(out && out.下半身へのダメージ判定が走った回数 === 0
    ? '→ 玉は下半身に食べられていない（＝「0」表示で消える投げが無くなった）'
    : '→ ⚠️ まだ下半身が玉を食べている');

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-lower.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
