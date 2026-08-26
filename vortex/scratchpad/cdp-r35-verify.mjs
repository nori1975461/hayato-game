// R35 の実測。実プレイFB:
//   「曲はどれも違う。つくりなおして」
//   「ワイヤーアーム直撃の効果音をもっとガツンという激しい音に。鈍器で頭を思いっきりなぐったような音」
//   「マオウレクスから放たれる、小さな破砕片のような弾が全くイケてない。弾のスピードも遅い」
//
// ここで確かめるのは6つ:
//   ① importmap が効いて全モジュールが ?v= 付きで取れること＋タイトルの版番号
//   ② 音づくりの土台（WaveShaper と DelayNode）が**実ブラウザで本当に作られる**こと
//      ＝コード上に書いてあることと、実行時に生成されることは別物なので両方見る
//   ③ れんしゅうじょうで3つの編成（guitar/orch/synth）に切り替わること
//   ④ マオウレクスの弾が **実際に彗星(comet)で飛んでいる**こと＋**走っている速度**
//      （設定値ではなく実測。「設定は直したが繋がっていない」を何度も踏んでいるため）
//   ⑤ ワイヤーアーム直撃音が鳴った回数
//   ⑥ 弾が増えても描画が破綻していないこと（火の粉の予算制が効いているか＝実FPS）
//
// node vortex/scratchpad/cdp-r35-verify.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8934, DBG = 9484;
const BASE = `http://127.0.0.1:${PORT}/vortex/index.html`;
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
const fetched = [];
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

const REP = [];
const say = (s) => { console.log(s); REP.push(s); };

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r35')}`, 'about:blank'], { stdio: 'ignore' });

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
    else if (m.method === 'Network.requestWillBeSent') { fetched.push(m.params.request.url); }
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
  await send('Network.enable');

  // ② 音づくりの土台を、ページのどのスクリプトより前に仕掛けて数える。
  //    「sound.js に createWaveShaper と書いてある」と「実ブラウザで本当に作られた」は別物。
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__AUDIO = { shaper: 0, delay: 0, curveLen: 0, curveNonLinear: null };
    window.__GAINS = [];
    (function(){
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // init() で作られる最初の数個だけ拾う（tone() が1音ごとに作るので全部溜めると際限がない）。
      var og = AC.prototype.createGain;
      AC.prototype.createGain = function(){
        var n = og.apply(this, arguments);
        if (window.__GAINS.length < 12) window.__GAINS.push(n);
        return n;
      };
      var ows = AC.prototype.createWaveShaper;
      AC.prototype.createWaveShaper = function(){
        window.__AUDIO.shaper++;
        var n = ows.apply(this, arguments);
        var setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n), 'curve');
        Object.defineProperty(n, 'curve', {
          set: function(v){
            if (v && v.length) {
              window.__AUDIO.curveLen = v.length;
              // 非線形＝入力2倍で出力2倍にならないこと（実際に焼かれた配列で確かめる）
              var q = v.length - 1;
              var a = v[Math.round(q * 0.525)], b = v[Math.round(q * 0.55)];
              window.__AUDIO.curveNonLinear = +( (b - v[Math.round(q*0.5)]) /
                                                 (a - v[Math.round(q*0.5)]) ).toFixed(3);
            }
            setter.set.call(this, v);
          },
          get: function(){ return setter.get.call(this); },
        });
        return n;
      };
      var od = AC.prototype.createDelay;
      AC.prototype.createDelay = function(){ window.__AUDIO.delay++; return od.apply(this, arguments); };
    })();
  ` });

  // ---------- ① importmap と版表示 ----------
  await send('Page.navigate', { url: BASE });
  await sleep(2500);
  for (let i = 0; i < 40; i++) {
    const st = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return '';
      return g.scene.isActive('Title') ? 'title' : (g.scene.isActive('Opening') ? 'opening' : '?');})()`);
    if (st === 'title') break;
    await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',
      { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }))`);
    await sleep(300);
  }
  const mods = fetched.filter((u) => /\/vortex\/src\/.*\.js/.test(u));
  say(`① モジュール取得 ${mods.length}本 / うち ?v= 付き ${mods.filter((u) => /\?v=/.test(u)).length}本`);
  const shown = await evalJs(`(function(){
    var g = window.__vortexGame; if (!g) return 'no-game';
    var t = g.scene.getScene('Title'); if (!t || !t.children) return 'no-title';
    var out = []; t.children.list.forEach(function(o){ if (o.text) out.push(o.text); });
    return out.filter(function(s){ return /^v\\d/.test(s); }).join(',');
  })()`);
  say('   タイトルの版表示: ' + JSON.stringify(shown));

  // ---------- ③ れんしゅうじょうの聞き比べ（ここで音が初期化される＝②も測れる） ----------
  const bgmLog = await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__B = [];
    var ob = S.startBgm.bind(S);
    S.startBgm = function(n){ window.__B.push(n || 'battle'); return ob(n); };
    var key = function(code, kc){
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: code, code: code, keyCode: kc, which: kc, bubbles: true }));
    };
    key('KeyT', 84);   await new Promise(function(r){ setTimeout(r, 1200); });
    key('Digit4', 52); await new Promise(function(r){ setTimeout(r, 900); });
    key('KeyB', 66);   await new Promise(function(r){ setTimeout(r, 500); });
    key('KeyB', 66);   await new Promise(function(r){ setTimeout(r, 500); });
    key('KeyB', 66);   await new Promise(function(r){ setTimeout(r, 500); });
    return window.__B;
  })()`);
  say('③ れんしゅうじょうで鳴らしたBGMの並び: ' + JSON.stringify(bgmLog));

  const aud = await evalJs('window.__AUDIO');
  say('② 実ブラウザで生成された音づくりの土台');
  say('   WaveShaperNode: ' + (aud && aud.shaper) + '個 / DelayNode: ' + (aud && aud.delay) + '個');
  say('   焼かれたカーブの長さ: ' + (aud && aud.curveLen)
    + ' / 入力2倍→出力 ' + (aud && aud.curveNonLinear) + '倍（2.0未満＝本当に潰れている）');

  // ⑤a 命中音そのものを鳴らして、BGMのダックが**必ず元の音量へ戻る**ことを実測する。
  //     戻し忘れると「BGMが小さいまま」になり、しかも静かに壊れるので気付けない。
  const duck = await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    // init 直後に 0.78 が入っているノード＝BGMバス
    var g = window.__GAINS.filter(function(n){ return Math.abs(n.gain.value - 0.78) < 1e-6; })[0];
    if (!g) return { err: 'bgmGain が見つからない' };
    var before = +g.gain.value.toFixed(3);
    S.sfx('rocketPunchHit');
    await new Promise(function(r){ setTimeout(r, 60); });
    var during = +g.gain.value.toFixed(3);
    await new Promise(function(r){ setTimeout(r, 900); });
    var after = +g.gain.value.toFixed(3);
    return { before: before, during: during, after: after };
  })()`);
  say('   命中音のBGMダック: 前 ' + duck.before + ' → 直後 ' + duck.during
    + ' → 1秒後 ' + duck.after + '（前と1秒後が一致＝戻っている）');

  // ---------- ④⑤⑥ 戦闘の実測 ----------
  await send('Page.navigate', { url: BASE + '?autotest=1&seed=42' });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }
  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__L = { sfx: {} };
    var os = S.sfx.bind(S);
    S.sfx = function(n, g, p) { window.__L.sfx[n] = (window.__L.sfx[n] || 0) + 1; return os(n, g, p); };
    return true;
  })()`);

  await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 900 && r.level < 27; i++) r.levelup.addXp(60);
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    window.__L.sfx = {};
    r.boss.practiceSpawn('maou');
    // 実速度と実個数の観測（設定値ではなく走っている値）
    window.__M = { cometMax: 0, cometMin: 1e9, cometN: 0, peakAlive: 0, kinds: {},
                   fpsMin: 999, fpsN: 0, fpsSum: 0, t0: null, end: null };
    window.__watch = setInterval(function(){
      var bs = r.boss.debugBullets ? r.boss.debugBullets() : [];
      var alive = 0;
      for (var i = 0; i < bs.length; i++) {
        window.__M.kinds[bs[i].kind] = (window.__M.kinds[bs[i].kind] || 0) + 1;
        if (bs[i].kind !== 'comet') continue;
        alive++;
        var sp = Math.hypot(bs[i].vx, bs[i].vy);
        window.__M.cometN++;
        if (sp > window.__M.cometMax) window.__M.cometMax = Math.round(sp);
        if (sp < window.__M.cometMin) window.__M.cometMin = Math.round(sp);
      }
      if (alive > window.__M.peakAlive) window.__M.peakAlive = alive;
      var fps = r.game.loop.actualFps;
      if (fps > 0) { window.__M.fpsN++; window.__M.fpsSum += fps;
                     if (fps < window.__M.fpsMin) window.__M.fpsMin = Math.round(fps); }
      var b0 = r.boss.entity;
      if (b0 && b0.active) {
        if (window.__M.t0 == null) window.__M.t0 = r.elapsed;
        window.__M.end = +(r.elapsed - window.__M.t0).toFixed(1);
      }
    }, 60);
    return true;
  })()`);

  await evalJs(`(function(){
    var r = window.__run;
    window.__bot = setInterval(function(){
      var b = r.boss.entity;
      if (!b || !r.player) return;
      var dx = b.x - r.player.x, dy = b.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      // ⚠️ 前回の実測では射出3回とも外れて直撃音が0回だった。原因は**至近距離の死角**：
      //    拳は肩（ボス中心から左右へ 11×9.6＝±105px）から出るのに、狙う向きはボス中心から
      //    見た角度なので、主人公が110pxまで寄っていると必要な旋回が atan(105/110)≒44°、
      //    旋回上限は 54°/秒×0.55秒＝約30°で**構造的に届かない**。
      //    ここで測りたいのは AI の強さではなく「作った音が鳴るか」なので、
      //    予告のあいだに 260px まで離れて、射出中は動かず当たりに行かせる。
      var st = String(r.boss.state || '');
      if (st === 'wireShot' || st === 'wireBack') return;
      var want = st === 'wireTele' ? 260 : 110;
      if (d > want + 20) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      else if (d < want - 20) { r.player.x -= (dx/d) * 4; r.player.y -= (dy/d) * 4; }
      var w = r.boss.weakPoint(b);
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x - cam.scrollX + (Math.sin(r.elapsed * 7) * 20);
        r.input.activePointer.y = w.y - cam.scrollY + (Math.cos(r.elapsed * 7) * 20);
      }
    }, 33);
    var key = function(type){
      window.dispatchEvent(new KeyboardEvent(type, { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
    };
    window.__mash = setInterval(function(){ key('keydown'); setTimeout(function(){ key('keyup'); }, 120); }, 330);
    return true;
  })()`);

  await sleep(58000);
  const m = await evalJs(`(function(){
    clearInterval(window.__bot); clearInterval(window.__mash);
    clearInterval(window.__watch); clearInterval(window.__god);
    return { 計測: window.__M, 音: window.__L.sfx };
  })()`);
  const S = (m && m.音) || {};
  const M = (m && m.計測) || {};
  say('');
  say('④ マオウレクスの弾（実測・設定値ではなく走っている値）');
  say('   観測できた弾の種類: ' + JSON.stringify(M.kinds));
  say('   彗星弾のサンプル数: ' + M.cometN + ' / 同時に生きていた最大数: ' + M.peakAlive);
  say('   彗星弾の実速度: 最小 ' + (M.cometMin === 1e9 ? '-' : M.cometMin)
    + ' 〜 最大 ' + M.cometMax + ' px/秒（旧 nova 116 / vulcan 150・主人公の移動 148）');
  say('⑤ ワイヤーアーム直撃音 rocketPunchHit: ' + (S.rocketPunchHit || 0) + '回');
  say('   （参考）wireCannon ' + (S.wireCannon || 0) + ' / knuckleWave ' + (S.knuckleWave || 0)
    + ' / shoot ' + (S.shoot || 0));
  say('⑥ 描画（火の粉の予算制が効いているか）');
  say('   実FPS: 平均 ' + (M.fpsN ? (M.fpsSum / M.fpsN).toFixed(1) : '-')
    + ' / 最低 ' + M.fpsMin);
  say('   戦闘の長さ: ' + M.end + '秒');
  say('');
  say('EXCEPTIONS=' + exceptions);

  fs.writeFileSync(path.join(HERE, 'r35-verify.txt'), REP.join(NL), 'utf8');
  ws.close(); server.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
