// R46 実プレイFB「雷光弾はボス戦中だけ間隔を詰めて。ボス戦でこそ真価を発揮する」の実測。
//
// 測るのは2つ：
//   ①マグマン（炎熱炸裂弾の出処）が**ボス戦中に何体出るか**
//     ← R45の実測では 315秒で5体のうちボス戦中は**1体だけ**だった
//   ②雷光弾の在庫が**軌道神核でも残っているか**
//     ← 転生は同じ boss オブジェクトを使い回すので在庫が作り直されない疑い
// node vortex/scratchpad/cdp-r46-boss-ammo.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8974, DBG = 9524;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=41`;
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
    console.log('  [eval EXC]', (r.exceptionDetails.exception
      && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return undefined;
  }
  return r.result && r.result.value;
}

async function boot() {
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.orbit&&r.sys.settings.status>=4&&r.boss.practiceAwaken);})()`);
    if (ok) break;
    await sleep(200);
  }
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r46')}`, 'about:blank'], { stdio: 'ignore' });

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
  await boot();

  // ---- ① ボス戦中のマグマン ----
  // 練習モードでボスを出しっぱなしにし、「ボス戦のあいだ何体出たか」を数える。
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__R = { seen: 0, times: [] };
    window.__t0 = r.elapsed;
    window.__w = setInterval(function(){
      for (var i = 0; i < r.enemies.length; i++) {
        var e = r.enemies[i];
        if (!e.active || !e.def || e.def.id !== 'magman' || e.__seen) continue;
        e.__seen = true;
        window.__R.seen++;
        window.__R.times.push(+(r.elapsed - window.__t0).toFixed(1));
      }
      r.player.hp = 99999;
    }, 60);
    r.boss.practiceSpawn('uzuking');
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e) e.hp = e.maxHp * 0.9;
    }, 60);
    return true;
  })()`);
  await sleep(70000);   // ボス戦を70秒ぶん観測
  const rare = await evalJs('window.__R');
  console.log('① ボス戦中のマグマン（70秒）');
  console.log(`   出現 ${rare.seen}体  出た時刻(ボス戦開始からの秒) ${rare.times.join(', ')}`);
  console.log('   ← R45の実測では「315秒で5体・うちボス戦中は1体だけ」だった');

  // ---- ② 雷光弾の在庫が軌道神核でも残るか ----
  // ★補充を 0発 と 1発 の2通りで回して**引き算で示す**。「入れたら動いた」だけでは
  //   入れる前が本当に0だったかを言えない（[[演出が派手になったかは差分で測る]]）。
  async function measureAmmo(refill) {
    await boot();
    await evalJs(`(async function(){
      const b = await import('/vortex/src/data/balance.js');
      const m = await import('/vortex/src/data/monsters.js');
      b.BALANCE.archetypes.AMMO.trueFormRefill = ${refill};
      const r = window.__run;
      r.practiceMode = true;
      r.party.length = 0;
      r.party.push({ def: m.MONSTERS.find((x) => x.id === 'biricco') });
      r.orbit.rebuild();
      r.player.maxHp = 99999; r.player.hp = 99999;
      window.__A = { given: [] };
      const g = r.billiard.giveAmmo.bind(r.billiard);
      r.billiard.giveAmmo = function(o, kind){
        window.__A.given.push({ kind: kind, tf: !!r.boss.trueForm });
        return g.apply(r.billiard, arguments);
      };
      // ⚠️ 手がふさがっていると渡されない（canReceiveAmmo）。掴んだものは毎tick捨てる
      window.__hand = setInterval(function(){
        var st = r.billiard.st;
        if (st && st.held) { st.held = null; }
        r.player.hp = 99999;
      }, 80);
      r.boss.practiceSpawn('maou');
      window.__fix = setInterval(function(){
        var e = r.boss.entity; if (e && !r.boss.awakening) e.hp = e.maxHp * 0.9;
      }, 60);
      return true;
    })()`);
    await sleep(26000);   // 第1形態で perFinal 2発を使い切らせる
    const before = await evalJs('window.__run.orbit.debugAmmo()');
    await evalJs('window.__run.boss.practiceAwaken()');
    for (let i = 0; i < 80; i++) {
      if (await evalJs('window.__run.boss.trueForm')) break;
      await sleep(400);
    }
    const tf = !!(await evalJs('window.__run.boss.trueForm'));
    await sleep(14000);
    const given = await evalJs('window.__A.given') || [];
    return { pre: before.stock, tf, total: given.length, tfGiven: given.filter((x) => x.tf).length };
  }

  console.log('');
  console.log('② 雷光弾（ビリッコ1体だけのパーティ・第1形態で2発使い切ってから転生）');
  for (const refill of [0, 1]) {
    const r = await measureAmmo(refill);
    console.log(`   転生時の補充 ${refill}発 → 転生直前の在庫 ${r.pre}発 / 転生 ${r.tf ? 'YES' : 'NO'}`
      + ` / 配った合計 ${r.total}発（**軌道神核戦で ${r.tfGiven}発**）`);
  }
  console.log('     ← 0発のときが「いちばん切り札が欲しい場面で1発も来ない」状態＝FBの言う真価が出ない');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
