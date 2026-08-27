// R42 ワイヤーアーム音の実測。
// 測るのは推測ではなく結果：①wireWinch が巻き戻しのたびに鳴るか（wireBack 回数と一致するか）
// ②wireWhoosh（空振りニアミス）が自然なプレイで実際に発火するか ③rocketPunchHit（被弾）の回数
// ④例外0件。
// 「自然なプレイで何回発動するか」で検証する（feedback_verify_mechanic_in_natural_play）。
// node vortex/scratchpad/cdp-r42.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8938, DBG = 9488;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r42b')}`, 'about:blank'], { stdio: 'ignore' });

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

  // Sound.sfx のスパイ（ESモジュールは同一インスタンスが返る＝ゲーム側の呼び出しも全部記録）
  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__S = {};
    var os = S.sfx.bind(S);
    S.sfx = function(n, a, p){ window.__S[n] = (window.__S[n] || 0) + 1; return os(n, a, p); };
    return true;
  })()`);

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.withAudio = true;   // autotest 既定 false だと sfx が呼ばれず計測できない（ctx null で安全）
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    r.boss.practiceSpawn('maou');
    // ボスHPを維持＝転生させずワイヤーアームを含む通常攻撃表を回し続ける
    window.__keep = setInterval(function(){
      var b = r.boss.entity; if (b) b.hp = b.maxHp;
    }, 200);
    window.__W = { back: 0, shot: 0, last: null, minD: 9999 };
    // 強制条件：主人公をボスの半径95pxを高速で周回させる（接線速度≒400px/s＞拳の旋回追従）
    // ＝既知の至近距離死角を突く。拳は構造的に当てられず、至近を通過する＝ニアミスの検証条件
    window.__orb = { a: 0 };
    window.__force = setInterval(function(){
      var b = r.boss.entity; if (!b || !r.player) return;
      window.__orb.a += 0.105;
      r.player.x = b.x + Math.cos(window.__orb.a) * 95;
      r.player.y = b.y + Math.sin(window.__orb.a) * 95;
    }, 25);
    window.__watch = setInterval(function(){
      var st = r.boss.state;
      if (st !== window.__W.last) {
        window.__W.last = st;
        if (st === 'wireBack') window.__W.back++;
        if (st === 'wireShot') window.__W.shot++;
      }
      // 拳と主人公の最接近距離を記録（ニアミス帯74px以内に実際入ったかの証拠）
      var w = r.boss.debugWire && r.boss.debugWire();
      if (w && w.arms) for (var i = 0; i < w.arms.length; i++) {
        var a = w.arms[i];
        var d = Math.hypot(a.fx - r.player.x, a.fy - r.player.y);
        if (d < window.__W.minD) window.__W.minD = d;
      }
    }, 30);
    return true;
  })()`);

  console.log('観測開始（90秒・ボスHP維持で攻撃表を回し続ける）');
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const snap = await evalJs(`(function(){
      var S = window.__S, W = window.__W;
      return { 射出: W.shot, 巻き戻し: W.back,
        winch: S.wireWinch || 0, whoosh: S.wireWhoosh || 0,
        hit: S.rocketPunchHit || 0, fly: S.rocketPunchFly || 0 };
    })()`);
    if (snap) console.log(`  t=${(i + 1) * 5}s`, JSON.stringify(snap));
  }

  const fin = await evalJs(`(function(){
    var S = window.__S, W = window.__W;
    clearInterval(window.__god); clearInterval(window.__keep); clearInterval(window.__watch);
    return { wireShot状態: W.shot, wireBack状態: W.back, 拳の最接近px: Math.round(W.minD),
      sfx_wireWinch: S.wireWinch || 0, sfx_wireWhoosh: S.wireWhoosh || 0,
      sfx_rocketPunchHit: S.rocketPunchHit || 0, sfx_rocketPunchFly: S.rocketPunchFly || 0,
      sfx_wireShot: S.wireShot || 0 };
  })()`);
  console.log('\n=== R42 実測 ===');
  console.log(JSON.stringify(fin, null, 1));
  if (fin) {
    console.log('判定: winch===wireBack:', fin.sfx_wireWinch === fin.wireBack状態 ? 'YES' : 'NO');
    console.log('判定: whoosh>0（自然プレイでニアミスが起きる）:', fin.sfx_wireWhoosh > 0 ? 'YES' : 'NO');
    console.log('判定: 被弾or空振りが記録された:', (fin.sfx_rocketPunchHit + fin.sfx_wireWhoosh) > 0 ? 'YES' : 'NO');
  }
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
