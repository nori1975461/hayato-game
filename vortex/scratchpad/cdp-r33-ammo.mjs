// R33 実測：らいこうだんは「自然なプレイで何回発動するか」。
//
// 実プレイFB「マオウレクスまでいったのだが、一度も雷光弾が生成されなかった」。
// 実装が消えたのか、それとも配り役（ビリッコ）が仲間になっていなかっただけなのかを、
// 360秒（マオウレクス出現まで）の自然プレイで数える。
// ⚠️ 機能テスト（ビリッコを強制的にパーティへ入れて手渡しを起こす）では絶対に分からない。
//    噛み合わせの失敗はいつも「条件を強制的に作るテスト」の外側で起きる。
//
// node vortex/scratchpad/cdp-r33-ammo.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8913, DBG = 9463;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=7`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r33')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.capture&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  // 観測の仕掛け。プレイヤーが実際に画面で見る文言だけを数える。
  await evalJs(`(function(){
    var r = window.__run;
    window.__L = { なかま: [], コインに化けたコア: 0, おちたコア: {}, 手渡し: 0, 配られた弾: {} };
    // 何の弾が配られたかを数える（3種になったので種類ごとに見る）
    var og = r.billiard.giveAmmo;
    r.billiard.giveAmmo = function(o, kind) {
      window.__L.配られた弾[kind] = (window.__L.配られた弾[kind] || 0) + 1;
      window.__L.手渡し++;
      return og(o, kind);
    };
    var oft = r.floatText.bind(r);
    r.floatText = function(x, y, text, color) {
      if (/なかま！/.test(text)) window.__L.なかま.push(text.replace(' なかま！',''));
      if (/コイン$/.test(text) && /\\+50/.test(text)) window.__L.コインに化けたコア++;
      return oft(x, y, text, color);
    };
    // 落ちたコアの種類（拾えたかどうかに関係なく、抽選で何が出たか）
    window.__seen = new Set();
    window.__tick = setInterval(function(){
      var cs = r.capture.cores || [];
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        var key = c.def.id + '@' + Math.round(c.x) + ',' + Math.round(c.y);
        if (window.__seen.has(key)) continue;
        window.__seen.add(key);
        window.__L.おちたコア[c.def.id] = (window.__L.おちたコア[c.def.id] || 0) + 1;
      }
    }, 200);
    return true;
  })()`);

  // ⚠️ ボットは避けないので途中で力尽き、3枠目が開く180秒とエリート(200/290秒)を観測できない。
  //    HPを固定するのは「仲間になれるか」を測るうえで**有利側**への細工なので、
  //    これで仲間にならないなら実プレイでも仲間にならない（結論は弱くならない）。
  await evalJs(`(function(){
    var r = window.__run;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 50);
    return true;
  })()`);

  // ボット：落ちているコアを最優先で拾いに行く（＝人間がやることの再現）。
  // コアが無いときは敵の少ない方へ逃げつつJを押す。強さは測らないので雑でよい。
  await evalJs(`(function(){
    var r = window.__run;
    window.__bot = setInterval(function(){
      if (!r.player) return;
      var cs = r.capture.cores || [];
      var tx = null, ty = null, best = 1e9;
      for (var i = 0; i < cs.length; i++) {
        var d = Math.hypot(cs[i].x - r.player.x, cs[i].y - r.player.y);
        if (d < best) { best = d; tx = cs[i].x; ty = cs[i].y; }
      }
      if (tx == null) {
        var e = r.enemies.filter(function(o){ return o.active && !o.isBoss; })[0];
        if (e) { tx = e.x; ty = e.y; }
      }
      if (tx != null) {
        var dx = tx - r.player.x, dy = ty - r.player.y, d2 = Math.hypot(dx, dy) || 1;
        if (d2 > 8) { r.player.x += (dx/d2) * 3.2; r.player.y += (dy/d2) * 3.2; }
      }
    }, 30);
    // 攻撃はJの連打。掴めれば投げる。らいこうだんの手渡しも J で始まる。
    window.__atk = setInterval(function(){
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      setTimeout(function(){
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      }, 90);
    }, 220);
    return true;
  })()`);

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };
  say('=== 自然プレイ360秒（マオウレクス出現まで）。ボットはコアを最優先で拾いに行く ===');

  let last = -1;
  for (let i = 0; i < 200; i++) {
    const s = await evalJs(`(function(){
      var r = window.__run, L = window.__L;
      if (!r || !r.player || r.player.hp <= 0) return { しんだ: true };
      return {
        秒: Math.round(r.elapsed),
        なかま: r.party.map(function(m){ return m.def.name; }),
        枠: r.party.length,
        ビリッコいる: r.party.some(function(m){ return m.def.id === 'biricco'; }),
        コインに化けたコア: L.コインに化けたコア,
        手渡し: r.billiard.st.boltsGot || 0,
        らいこうだん命中: r.billiard.st.boltHits || 0,
        ボス: r.boss.active,
      };
    })()`);
    if (!s) break;
    if (s.しんだ) { say('主人公が力尽きた（計測終了）'); break; }
    if (s.秒 >= last + 30) {
      last = s.秒 - (s.秒 % 30);
      say(`t=${String(s.秒).padStart(3)}秒 なかま[${s.なかま.join('/')}] `
        + `ビリッコ:${s.ビリッコいる ? 'いる' : 'いない'} `
        + `枠満杯で捨てたコア:${s.コインに化けたコア} とくべつな弾:${s.手渡し}回`);
    }
    if (s.秒 >= 362) break;
    await sleep(1500);
  }

  const fin = await evalJs(`(function(){
    var r = window.__run, L = window.__L;
    clearInterval(window.__bot); clearInterval(window.__atk); clearInterval(window.__tick);
    return {
      さいご: Math.round(r.elapsed),
      なかま: r.party.map(function(m){ return m.def.id + '(' + m.def.name + ')'; }),
      ビリッコが仲間になった: r.party.some(function(m){ return m.def.id === 'biricco'; }),
      仲間になった順: L.なかま,
      枠満杯で捨てたコア: L.コインに化けたコア,
      落ちたコアの内訳: L.おちたコア,
      手渡し回数: r.billiard.st.boltsGot || 0,
      配られた弾の内訳: L.配られた弾,
      らいこうだん命中: r.billiard.st.boltHits || 0,
      スーパーボール命中: r.billiard.st.superHits || 0,
      ブラックホール命中: r.billiard.st.holeHits || 0,
      穴が作った弾: r.billiard.st.holeStaggers || 0,
      投げた回数: r.billiard.st.throws || 0,
    };
  })()`);
  say('');
  say('【結果】' + JSON.stringify(fin, null, 1));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r33-ammo.txt'),
    REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
