// R44W8「せいれつの**予告の文字が表示されたら間髪入れずに**照射して」の実測。
//
// ★測るのは「文字が出てから、ビームが出るまでの**ゲーム内**の秒数」。
//   ⚠️ 壁時計（Date.now）で測ってはいけない：発射時のヒットストップとスローモーションで
//      ゲーム内時間は止まる（R44W6 で 0.95秒の薙ぎを 1.29秒と誤読した）。run.elapsed で測る。
//   run.add.text を包んで「せいれつ」を含む文字が生まれた run.elapsed を拾い、
//   debugBeam() が最初に非nullになった run.elapsed との差を出す。
// node vortex/scratchpad/cdp-align-telop.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8965, DBG = 9515;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=33`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-aligntelop')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.sys.settings.status>=4&&r.boss.practiceSpawn);})()`);
    if (ok) break;
    await sleep(200);
  }

  // 技名テロップの発生時刻（run.elapsed）と、ビームが立った時刻（run.elapsed）を拾う
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__M = { telops: [], fires: [], teleStarts: [] };
    var oa = r.add.text.bind(r.add);
    r.add.text = function(x, y, str, style){
      if (String(str).indexOf('せいれつ') >= 0) window.__M.telops.push(+r.elapsed.toFixed(3));
      return oa(x, y, str, style);
    };
    r.player.maxHp = 99999; r.player.hp = 99999;
    r.boss.practiceSpawn('maou');
    return true;
  })()`);
  await sleep(5200);
  await evalJs(`(function(){
    var r = window.__run;
    r.boss.practiceAwaken();
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e) e.hp = e.maxHp * 0.9; r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 80; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(300);
  }
  // 予告の開始（alignTele に入った瞬間）と、ビームが立った瞬間を毎フレーム見張る
  await evalJs(`(function(){
    var r = window.__run, B = r.boss, last = null, hadBeam = false;
    window.__w = setInterval(function(){
      var st = B.state;
      if (st === 'alignTele' && last !== 'alignTele') window.__M.teleStarts.push(+r.elapsed.toFixed(3));
      var b = B.debugBeam ? B.debugBeam() : null;
      if (b && !hadBeam) { window.__M.fires.push(+r.elapsed.toFixed(3)); hadBeam = true; }
      if (!b) hadBeam = false;
      last = st;
    }, 16);
    return true;
  })()`);
  // せいれつを3回ぶん見る
  for (let i = 0; i < 900; i++) {
    const n = await evalJs('window.__M.fires.length');
    if (n >= 3) break;
    await sleep(200);
  }
  const M = await evalJs('window.__M');
  console.log('予告の開始（alignTele）:', (M.teleStarts || []).join(' , '));
  console.log('技名テロップ:          ', (M.telops || []).join(' , '));
  console.log('ビーム発射:            ', (M.fires || []).join(' , '));
  // ★一射目（せいれつ本体）だけを対象にする。二射目「さいしょうじゅん」は別技（0.55秒予告で
  //   撃ち直す）なので、直前の「せいれつ」テロップと突き合わせると 2.1秒 という嘘が出る
  //   （実際に一度そう誤読した）。**予告の開始ごとに、その後の最初の発射**が一射目。
  const gaps = [], leads = [];
  for (const ts of (M.teleStarts || [])) {
    const f = (M.fires || []).find((v) => v >= ts);
    if (f == null) continue;
    leads.push(+(f - ts).toFixed(3));
    const cand = (M.telops || []).filter((t) => t >= ts && t <= f + 0.02);
    if (cand.length) gaps.push(+(f - cand[cand.length - 1]).toFixed(3));
  }
  console.log('');
  console.log('① 文字 → 照射（ゲーム内秒）: ' + (gaps.length ? gaps.join(' , ') : '観測なし')
    + '  ← 旧実装は 2.0秒');
  console.log('② 予告の開始 → 照射:         ' + (leads.length ? leads.join(' , ') : '観測なし')
    + '  ← 予告そのものの長さは変えていない');
  const ok = gaps.length > 0 && gaps.every((g) => g <= 0.35);
  console.log('判定: 文字が出たら間髪入れずに照射 … ' + (ok ? 'YES' : 'NO'));
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
