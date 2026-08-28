// R44W11 実プレイFB「マオウレクスがバラバラになるシーン。効果音を修正して。**爆発音とその余韻**をいれて」の実測。
//
// ★測るのは「その瞬間に鳴った音が、どれだけの層で、どれだけ長く残るか」。
//   sound.js はすべての音を tone()/noiseHit() で作り、必ず絶対時刻で stop() を予約する。
//   そこで OscillatorNode / AudioBufferSourceNode の start/stop をフックし、
//   （呼ばれた ctx 時刻, 予約された stop 時刻）の対を全部拾う。
//   呼び出しの間隔が 0.25秒 以上あいたら別の「発音イベント」として束ね、
//     ・層＝そのイベントに属するノード数
//     ・余韻＝max(stopAt) − イベント開始時刻
//   を出す。★余韻はここでしか測れない（画面には出ない・耳では前後関係が分からない）。
// node vortex/scratchpad/cdp-awaken-sfx.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8971, DBG = 9521;
// ★autotest は Sound.init を呼ばない（タイトルをスキップするため）＝音が1つも鳴らない。
//   音を測るときは**タイトルから T キーで入る**（れんしゅうじょう＋withAudio:true）。
//   ★autotest のまま **Sound.init() を自分で呼ぶ**（--autoplay-policy=no-user-gesture-required
//     があるので操作なしで AudioContext を起こせる）。ES モジュールは URL でキャッシュされるので、
//     importmap と同じ URL で dynamic import すればゲーム本体と同一の Sound を掴める。
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-awsfx')}`, 'about:blank'], { stdio: 'ignore' });

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

  // ★フックは**ページ生成の前**に仕込む（ゲームが AudioContext を作る前に prototype を差し替える）
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    (function(){
      window.__SFX = { ev: [], t0: null };
      function wrap(Proto, kind) {
        const os = Proto.prototype.start, ot = Proto.prototype.stop;
        Proto.prototype.start = function(when) {
          try {
            const now = this.context.currentTime;
            window.__SFX.ev.push({ kind, call: now, at: (when == null ? now : when), stop: null });
            this.__ix = window.__SFX.ev.length - 1;
          } catch (e) { /* ignore */ }
          return os.apply(this, arguments);
        };
        Proto.prototype.stop = function(when) {
          try {
            const e = window.__SFX.ev[this.__ix];
            if (e) e.stop = (when == null ? this.context.currentTime : when);
          } catch (e2) { /* ignore */ }
          return ot.apply(this, arguments);
        };
      }
      wrap(OscillatorNode, 'osc');
      wrap(AudioBufferSourceNode, 'buf');
    })();
  ` });

  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.sys.settings.status>=4&&r.boss.practiceAwaken);})()`);
    if (ok) break;
    await sleep(200);
  }
  const hooked = await evalJs('!!(window.__SFX && window.__SFX.ev)');
  console.log('フック: ' + (hooked ? 'OK' : 'NG'));
  console.log('シーン: ' + await evalJs(`(function(){var g=window.__vortexGame;if(!g)return 'no game';
    return g.scene.scenes.filter(function(s){return s.sys.settings.active;})
      .map(function(s){return s.sys.settings.key;}).join(',');})()`));
  console.log('Run: ' + await evalJs(`(function(){var g=window.__vortexGame;if(!g)return 'no game';
    var r=g.scene.getScene('Run'); if(!r) return 'no Run';
    return 'status='+r.sys.settings.status+' audio='+r.withAudio+' boss='+(!!r.boss)
      +' awaken='+(!!(r.boss&&r.boss.practiceAwaken));})()`));

  // 第3形態を出し、音の記録を空にしてから転生へ入る
  const sp = await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.player.maxHp = 99999; r.player.hp = 99999;
    // 誰にも倒されないよう固定（autotest のボットが削るので、待っている間に消えてしまう）
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e && !r.boss.awakening) e.hp = e.maxHp * 0.9;
      r.player.hp = 99999;
    }, 60);
    return r.boss.state || 'none';
  })()`);
  console.log('第3形態: ' + sp);
  // ★登場カットシーン（maouIntro）が終わるのを待つ。終わる時に state を idle へ上書きするので、
  //   途中で practiceAwaken すると **awakenCine が即座に潰される**（実測：段が1つも進まなかった）。
  for (let i = 0; i < 60; i++) {
    const st = await evalJs('window.__run.boss.state');
    if (st && st !== 'maouIntro') break;
    await sleep(300);
  }
  // ★どのイベントがどのSFXなのかを名前で突き合わせる。ESモジュールは URL でキャッシュされるので、
  //   importmap と**同じURL**で dynamic import すればゲーム本体と同一の Sound を掴める。
  const named = await evalJs(`(async function(){
    const m = await import('/vortex/src/audio/sound.js?v=20260828-9');
    const S = m.Sound, orig = S.sfx.bind(S);
    S.init();                        // autotest は init を呼ばないので自分で起こす
    window.__run.withAudio = true;
    window.__calls = [];
    S.sfx = function(name){
      try { window.__calls.push({ name: name, n: window.__SFX.ev.length }); } catch (e) {}
      return orig.apply(S, arguments);
    };
    return true;
  })()`);
  console.log('Sound.sfx フック: ' + (named ? 'OK' : 'NG'));

  const spawned = await evalJs(`(function(){
    window.__SFX.ev.length = 0; window.__calls.length = 0;
    var B = window.__run.boss;
    var ok = B.practiceAwaken();
    return ok + ' / ' + B.state + ' / trueForm=' + B.trueForm + ' awakening=' + B.awakening
      + ' entity=' + (B.entity ? B.entity.type : 'none');
  })()`);
  console.log('転生へ: ' + spawned);

  // 転生カットシーン（亀裂1.3＋粉砕1.8＋出現3.4＝スローモーション込みで実時間はもっと長い）
  await evalJs(`(function(){
    window.__states = [];
    window.__s = setInterval(function(){
      var B = window.__run.boss, st = B.state;
      var L = window.__states;
      if (!L.length || L[L.length-1].st !== st) L.push({ st: st, n: window.__SFX.ev.length });
    }, 20);
    return true;
  })()`);
  await sleep(16000);
  console.log('状態の遷移: ' + (await evalJs('window.__states') || []).map((s) => s.st).join(' → '));

  const ev = await evalJs('window.__SFX.ev');
  const calls = await evalJs('window.__calls') || [];
  console.log('');
  if (!ev || !ev.length) { console.log('音のノードが1つも取れなかった'); process.exit(1); }
  const base = ev[0].call;
  // 呼び出しの間隔が 0.25秒 以上あいたら別の「発音イベント」として束ねる
  const groups = [];
  let cur = null;
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    if (!cur || e.call - cur.last > 0.25) {
      cur = { start: e.call, last: e.call, n: 0, end: 0, i0: i, i1: i }; groups.push(cur);
    }
    cur.last = Math.max(cur.last, e.call);
    cur.n++; cur.i1 = i;
    cur.end = Math.max(cur.end, e.stop != null ? e.stop : e.at);
  }
  for (const g of groups) {
    const names = calls.filter((c) => c.n >= g.i0 && c.n <= g.i1).map((c) => c.name);
    g.names = [...new Set(names)].join('+') || '(不明)';
  }
  // ★SFX 1回ぶんの層と余韻を切り出す。__calls[i].n は「その呼び出しの直前までのノード数」なので、
  //   ev[calls[i].n .. calls[i+1].n-1] がその SFX が作ったノードそのもの（他の音と混ざらない）。
  const per = [];
  for (let i = 0; i < calls.length; i++) {
    const a = calls[i].n, b = (i + 1 < calls.length) ? calls[i + 1].n : ev.length;
    if (b <= a) continue;
    let st = ev[a].call, end = 0;
    for (let k = a; k < b; k++) end = Math.max(end, ev[k].stop != null ? ev[k].stop : ev[k].at);
    per.push({ name: calls[i].name, t: st - base, n: b - a, tail: end - st });
  }
  const WATCH = ['crush', 'metalSlam', 'bossStress', 'bigBoom', 'maouShatter', 'maouRubble', 'thunder'];
  console.log('転生カットシーンで鳴った音（SFX 1回ぶんを切り出して層と余韻を測る）');
  console.log('     時刻(s)   層(ノード数)   余韻(s)   SFX');
  for (const p of per) {
    if (!WATCH.includes(p.name)) continue;
    console.log(`    ${p.t.toFixed(2).padStart(7)}   ${String(p.n).padStart(8)}    `
      + `${p.tail.toFixed(2).padStart(6)}   ${p.name}`);
  }
  const shat = per.filter((p) => ['maouShatter', 'bigBoom'].includes(p.name));
  if (shat.length) {
    const s = shat[0];
    console.log('');
    console.log(`★粉砕の瞬間の音 ${s.name}: 層 ${s.n} / **余韻 ${s.tail.toFixed(2)}秒**`);
  }
  console.log('');
  const big = groups.reduce((a, b) => (b.n > a.n ? b : a), groups[0]);
  console.log('');
  console.log(`★いちばん層の厚いイベント＝粉砕の瞬間: 開始 ${(big.start - base).toFixed(2)}s / `
    + `層 ${big.n} / **余韻 ${(big.end - big.start).toFixed(2)}秒**`);
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
