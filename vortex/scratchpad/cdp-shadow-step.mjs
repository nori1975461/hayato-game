// R44W12 実プレイFB「かげおにの移動音をもっと大きくして。その方がプレーヤーが追われてる感がでる」の実測。
//
// ★測るのは「実プレイで shadowStep が**どれだけの音量で**何回鳴っているか」。
//   ゲーム本体と同じ Sound（importmap と同じ URL の dynamic import）を掴んで sfx を包み、
//   呼び出しの第2引数（vol）を全部拾う。ついでにその瞬間の影との距離も記録して、
//   「近いほど大きい」（R44W10 の距離の情報）が保たれているかも見る。
// node vortex/scratchpad/cdp-shadow-step.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8972, DBG = 9522;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=41`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BUILD = fs.readFileSync(path.join(ROOT, 'vortex/src/data/version.js'), 'utf8')
  .match(/BUILD = '([^']+)'/)[1];
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-step')}`, 'about:blank'], { stdio: 'ignore' });

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
      return !!(r&&r.boss&&r.sys.settings.status>=4&&r.boss.practiceAwaken);})()`);
    if (ok) break;
    await sleep(200);
  }

  // ★ゲーム本体と同一の Sound を掴む（ESモジュールは URL でキャッシュされる）
  const hooked = await evalJs(`(async function(){
    const m = await import('/vortex/src/audio/sound.js?v=${BUILD}');
    const S = m.Sound, orig = S.sfx.bind(S);
    S.init();
    window.__steps = [];
    S.sfx = function(name, vol, pitch){
      if (name === 'shadowStep') {
        var r = window.__run, gs = (r.boss.debugShadows && r.boss.debugShadows()) || [];
        var near = 1e9;
        for (var i = 0; i < gs.length; i++) {
          if (!gs[i].biter) continue;
          near = Math.min(near, Math.hypot(gs[i].x - r.player.x, gs[i].y - r.player.y));
        }
        window.__steps.push({ vol: vol, pitch: pitch, d: near });
      }
      return orig.apply(S, arguments);
    };
    return true;
  })()`);
  console.log('Sound.sfx フック: ' + (hooked ? 'OK' : 'NG'));

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e && !r.boss.awakening) e.hp = e.maxHp * 0.9;   // 段(rage)0で測る
      r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 60; i++) {
    const st = await evalJs('window.__run.boss.state');
    if (st && st !== 'awakenCine') break;
    await sleep(400);
  }
  console.log('軌道神核へ転生: YES');

  // かげおにが2回ぶん出るまで待つ（殻閉じは攻撃ローテーションの1つ）
  await evalJs('window.__steps.length = 0');
  for (let i = 0; i < 600; i++) {
    const n = await evalJs('window.__steps.length');
    if (n >= 60) break;
    await sleep(250);
  }
  const steps = await evalJs('window.__steps') || [];
  console.log('');
  if (!steps.length) { console.log('足音が1回も鳴らなかった'); console.log('EXCEPTIONS=' + exceptions); process.exit(1); }
  const vols = steps.map((s) => s.vol).sort((a, b) => a - b);
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  // 実際に耳に届く大きさ＝vol × shadowStep 内の最大 gain。実装から係数を読み出す
  const src = fs.readFileSync(path.join(ROOT, 'vortex/src/audio/sound.js'), 'utf8');
  const body = (src.match(/shadowStep\(vol = 1, pitch = 1\)[\s\S]*?\n  \},/) || [''])[0];
  const gains = [...body.matchAll(/gain: ([\d.]+) \* g/g)].map((m) => Number(m[1]));
  const gmax = gains.length ? Math.max(...gains) : 0;
  console.log(`足音（shadowStep）が鳴った回数: ${steps.length}`);
  console.log(`  vol   最小 ${vols[0].toFixed(2)} / 中央 ${vols[Math.floor(vols.length / 2)].toFixed(2)}`
    + ` / 平均 ${mean.toFixed(2)} / 最大 ${vols[vols.length - 1].toFixed(2)}`);
  console.log(`  実装の最大 gain 係数: ${gmax}`);
  console.log(`★耳に届く大きさ（vol×gain）: 平均 ${(mean * gmax).toFixed(3)} / `
    + `**最大 ${(vols[vols.length - 1] * gmax).toFixed(3)}**`);
  // 「近いほど大きい」が保たれているか（距離と vol の相関）
  const near = steps.filter((s) => s.d < 120), far = steps.filter((s) => s.d > 220);
  const avg = (a) => (a.length ? a.reduce((x, s) => x + s.vol, 0) / a.length : 0);
  console.log(`  近い(<120px) 平均 vol ${avg(near).toFixed(2)} (${near.length}回)  / `
    + `遠い(>220px) 平均 vol ${avg(far).toFixed(2)} (${far.length}回)`);
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
