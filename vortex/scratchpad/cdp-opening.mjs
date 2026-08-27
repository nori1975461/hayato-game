// R41 オープニング作り直しの実測。
//
// ⚠️ オープニングは autotest では**丸ごとスキップされる**（Opening.create の先頭で Title へ飛ぶ）。
//    つまり smoke-test も既存CDPも一度もここを通らない＝実行時エラーを誰も見ていない領域。
//    だから本物のブラウザで autotest 無しに再生し、幕ごとに「何が画面に居るか」を数える。
//
// 測るもの：
//   ①解錠ゲートが出る ②SPACEで開始し例外が出ない ③幕ごとの主役オブジェクトが実在する
//   ④ビリヤードが実際に軍団を薙いだ数（数えられることが快感＝0なら演出が死んでいる）
//   ⑤Title へ到達し、Title の座標（ロゴ112/サブ156/自機236 scale3.2/プロンプト306）と一致する
//   ⑥例外0件
// node vortex/scratchpad/cdp-opening.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8941, DBG = 9491;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?seed=7`;   // ★autotest を付けない
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

// 画面に居るテキストを全部拾う（幕の成立を「文字」で確かめる）
const TEXTS = `(function(){
  var g = window.__vortexGame; if (!g) return [];
  var s = g.scene.getScene('Opening');
  if (!s || !s.children) return [];
  return s.children.list.filter(function(o){ return o.type === 'Text' && o.alpha > 0.05; })
    .map(function(o){ return o.text; });
})()`;

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-open')}`, 'about:blank'], { stdio: 'ignore' });

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
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });

  // Opening シーンが立つまで待つ
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    up = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var s=g.scene.getScene('Opening');return !!(s && s.sys && s.sys.settings.status>=4);})()`);
    if (!up) await sleep(200);
  }
  console.log('①Openingシーン起動:  ' + (up ? 'YES' : 'NO'));

  const gate = await evalJs(TEXTS);
  console.log('②解錠ゲート:        ' + JSON.stringify(gate));

  // SPACE で解錠（scene の begin を直接叩かず、実際のキーイベントで開始する）
  await evalJs(`(function(){
    window.dispatchEvent(new KeyboardEvent('keydown',
      { key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true }));
    return true;
  })()`);
  await sleep(120);
  const begun = await evalJs(`(function(){var s=window.__vortexGame.scene.getScene('Opening');
    return !!(s && s._begun);})()`);
  console.log('③解錠(SPACE):       ' + (begun ? 'YES' : 'NO'));

  // 幕ごとにサンプル（押下からの相対ms）
  const SAMPLES = [
    [1100, '幕1 名乗り'],
    [3000, '幕1 命令'],
    [4200, '幕1 整列'],
    [5200, '幕2 軍団'],
    [6600, '幕3 予兆'],
    [7700, '幕4 でも'],
    [8300, '幕4 反転'],
    [9000, '幕4 仲間'],
    [9700, '動詞 つかむ'],
    [10300, '動詞 ためる'],
    [10900, '動詞 なげる'],
    [12200, '幕5 収束'],
  ];
  let prev = 0;
  const seen = {};
  for (const [ms, label] of SAMPLES) {
    await sleep(ms - prev); prev = ms;
    const t = await evalJs(TEXTS);
    const info = await evalJs(`(function(){
      var s = window.__vortexGame.scene.getScene('Opening');
      if (!s || !s.children) return null;
      var imgs = s.children.list.filter(function(o){ return o.type === 'Image' && o.visible; });
      var keys = {};
      imgs.forEach(function(o){ var k = o.texture && o.texture.key; if (k) keys[k] = (keys[k]||0)+1; });
      return { imgKinds: Object.keys(keys).length, kill: s._killCount || 0,
        robots: (s.robots||[]).filter(function(r){return r.alive;}).length,
        buddies: (s.buddies||[]).length, core: !!s._coreActive };
    })()`);
    if (info) { seen.kill = Math.max(seen.kill || 0, info.kill); seen.buddies = Math.max(seen.buddies || 0, info.buddies); }
    console.log(`  ${String(ms).padStart(5)}ms ${label.padEnd(12)} 文字=${JSON.stringify(t)}`
      + (info ? ` 画像種=${info.imgKinds} 生存=${info.robots} 相棒=${info.buddies} 予兆=${info.core} 薙いだ数=${info.kill}` : ''));
  }

  console.log('④ビリヤードで薙いだ数: ' + (seen.kill || 0) + '（0なら演出が死んでいる／5で満点）');

  // Title へ到達したか＋座標一致
  for (let i = 0; i < 40; i++) {
    const on = await evalJs(`(function(){var s=window.__vortexGame.scene.getScene('Title');
      return !!(s && s.sys && s.sys.settings.status>=4 && s.sys.settings.active);})()`);
    if (on) break;
    await sleep(200);
  }
  const title = await evalJs(`(function(){
    var s = window.__vortexGame.scene.getScene('Title');
    if (!s || !s.children) return null;
    var txt = s.children.list.filter(function(o){ return o.type === 'Text'; })
      .map(function(o){ return { t: o.text, y: Math.round(o.y) }; });
    var pl = s.children.list.find(function(o){ return o.texture && o.texture.key === 'player_1'; });
    return { txt: txt, heroY: pl ? Math.round(pl.y) : null, heroScale: pl ? +pl.scaleX.toFixed(2) : null };
  })()`);
  console.log('⑤Title到達:         ' + (title ? 'YES' : 'NO'));
  if (title) {
    const logo = title.txt.find((o) => o.t.indexOf('クルット') >= 0);
    const sub = title.txt.find((o) => o.t.indexOf('KURUTTO') >= 0);
    const pr = title.txt.find((o) => o.t.indexOf('スタート') >= 0);
    console.log(`   ロゴy=${logo && logo.y}（112が正） サブy=${sub && sub.y}（156が正）`
      + ` 自機y=${title.heroY} scale=${title.heroScale}（236 / 3.2が正） プロンプトy=${pr && pr.y}（306が正）`);
  }
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
