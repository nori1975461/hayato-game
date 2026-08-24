// R31 ②の実測：マオウレクス戦BGMで**実際に鳴った音の周波数**を拾い、長三和音（C / A）が
// 本当に鳴っているかを見る。設定値を読むのではなく、鳴った音を数える。
//
// node vortex/scratchpad/cdp-r31-bgm.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8903, DBG = 9453;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31b')}`, 'about:blank'], { stdio: 'ignore' });

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

  // 鳴った音の周波数を拾う。BGM は bgmGain、SFX は sfxGain へ行くので、
  // 接続先で選り分けて BGM のぶんだけ数える（雑魚の効果音を混ぜない）。
  await evalJs(`(async function(){
    window.__F = { on: false, freqs: [] };
    var AC = window.AudioContext || window.webkitAudioContext;
    var oc = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function() {
      var osc = oc.call(this);
      var sv = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = function(v, t) {
        if (window.__F.on) window.__F.freqs.push(Math.round(v));
        return sv(v, t);
      };
      return osc;
    };
    var mod = await import('/vortex/src/audio/sound.js');
    window.__S = mod.Sound;
    return typeof mod.Sound.startBgm === 'function';
  })()`);

  // 効果音が混ざらないよう、シーンを止めて曲だけ鳴らす
  const res = await evalJs(`(async function(){
    var S = window.__S, r = window.__run;
    try { r.scene.pause(); } catch (e) {}
    // ⚠️ headless では AudioContext が作られていないことがある。startBgm は !ctx で即 return
    //    するので、init() を呼ばないと「0音」になる（1回目の計測がこれで空振りした）。
    S.init();
    S.stopBgm();
    await new Promise(function(x){ setTimeout(x, 300); });
    window.__F.freqs = [];
    S.startBgm('maou');
    window.__F.on = true;
    // 84BPM・8小節 ＝ 16分音符128ステップ × (60/84/4 = 0.1786秒) ≒ 22.9秒で1周
    await new Promise(function(x){ setTimeout(x, 25000); });
    window.__F.on = false;
    var fs = window.__F.freqs;
    var NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var set = {};
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i]; if (f < 40 || f > 4500) continue;
      var n = Math.round(12 * Math.log2(f / 440));
      var nm = NAMES[(((n + 9) % 12) + 12) % 12];
      set[nm] = (set[nm] || 0) + 1;
    }
    var top = Math.max.apply(null, fs.filter(function(f){ return f < 8000; }));
    return { 鳴った音の総数: fs.length, 音名ごとの回数: set,
             'Cメジャー(C E G)が鳴った': !!(set.C && set.E && set.G),
             'Aメジャー(A C# E)が鳴った': !!(set.A && set['C#'] && set.E),
             'C#（ピカルディ終止の第3音）の回数': set['C#'] || 0,
             最高音Hz: top };
  })()`);
  say('【②BGM】1周ぶんに実際に鳴った音: ' + JSON.stringify(res, null, 1));

  // 比較：旧版に無かった C# が、他の曲では鳴らないこと（＝マオウレクス曲固有の変化だと示す）
  const cmp = await evalJs(`(async function(){
    var S = window.__S;
    S.stopBgm();
    await new Promise(function(x){ setTimeout(x, 300); });
    window.__F.freqs = []; window.__F.on = true;
    S.startBgm('boss');
    await new Promise(function(x){ setTimeout(x, 12000); });
    window.__F.on = false;
    var fs = window.__F.freqs, NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var set = {};
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i]; if (f < 40 || f > 4500) continue;
      var n = Math.round(12 * Math.log2(f / 440));
      set[NAMES[(((n + 9) % 12) + 12) % 12]] = 1;
    }
    return { 'ボス戦(ポップ)曲でC#が鳴るか': !!set['C#'] };
  })()`);
  say('【②BGM】対照: ' + JSON.stringify(cmp));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-bgm.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
