// R43 グラップクローの実測＋スクリーンショット。
// 測るのは推測ではなく結果：①クローの表示px（体との相対比） ②腕が実際に何pxまで伸びるか
// ③突きの判定射程（78px）と一致しているか ④節が出ているか ⑤例外0件。
// 等倍で判定するため、殴っている瞬間の画面も撮る（[[feedback_pixel_art_judge_at_play_zoom]]）。
// node vortex/scratchpad/cdp-r43-claw.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8945, DBG = 9495;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=3`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r43c')}`, 'about:blank'], { stdio: 'ignore' });

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

  // 各段のクロー表示サイズ（等倍・体との相対比）
  const sizes = await evalJs(`(function(){
    var r = window.__run, out = [];
    for (var s = 1; s <= 3; s++) {
      r.transformPlayer(s);
      var f = r.playerFistImg, p = r.playerImg;
      out.push({ 段: s,
        クローpx: Math.round(f.displayWidth) + 'x' + Math.round(f.displayHeight),
        体px: Math.round(p.displayWidth) + 'x' + Math.round(p.displayHeight),
        面積比: +((f.displayWidth * f.displayHeight) / (p.displayWidth * p.displayHeight)).toFixed(2) });
    }
    r.transformPlayer(1);
    return out;
  })()`);
  console.log('=== クローの寸法（等倍）===');
  for (const s of sizes || []) console.log(' ', JSON.stringify(s));

  // 突きを撃たせて、腕が何pxまで伸びるかを毎フレーム測る
  const ext = await evalJs(`(function(){
    var r = window.__run;
    window.__E = { max: 0, maxSeg: 0, punches: 0, reachSeen: 0, reach: r.billiard ? null : null, samples: [] };
    var B = r.billiard;
    // 突き（jab）を直接呼ぶ＝獲物が居ない状態のボタン押下と同じ経路
    // 実経路で撃たせる：入力キーを押しっぱなしにすると update→press→（獲物なし）→jab へ落ちる
    // ⚠️ 掴んでいる間は billiard.drawHandAt が拳の位置を上書きする（Run→billiard の順）ので、
    //    そのままだと「手の位置」を腕の伸びとして誤計測する（計測器を実装に合わせる）。
    //    獲物を遠ざけて press が jab へ落ちる条件を作り、掴みも毎フレーム捨てる。
    window.__clear = setInterval(function(){
      if (r.billiard.st.held) r.billiard.st.held = null;
      for (var i = 0; i < r.enemies.length; i++) {
        var e = r.enemies[i];
        if (e.active) { e.x = r.player.x + 600; e.y = r.player.y + 600; e.stag = 0; }
      }
      // ⚠️ cd を0に強制すると毎フレーム jab が再発火して _punchT が巻き戻り、モーションが
      //    永久に最初の1コマから進まない（実装と噛み合わない計測）。cd は自然に任せる。
    }, 16);
    r._jKey = { isDown: true };
    var t0 = performance.now();
    window.__ei = setInterval(function(){
      var d = Math.hypot(r.playerFistImg.x - r.player.x, r.playerFistImg.y - r.player.y);
      // 突きが出ている瞬間だけを測る（掴んでいる間の手の位置と混ぜない）
      if (r._punchT > 0 && r.playerFistImg.visible) {
        if (d > window.__E.max) window.__E.max = d;
        window.__E.punches++;
        window.__E.reachSeen = Math.max(window.__E.reachSeen, r._punchReach || 0);
      }
      var nseg = 0;
      if (r._punchT <= 0) { window.__E.samples.push(-1); }
      if (r.playerArmSegs) for (var i = 0; i < r.playerArmSegs.length; i++)
        if (r.playerArmSegs[i].visible) nseg++;
      if (nseg > window.__E.maxSeg) window.__E.maxSeg = nseg;
      window.__E.samples.push(Math.round(d));
      window.__E.mode = r.billiard.st.mode; window.__E.punchT = +(r._punchT||0).toFixed(2);
      window.__E.reachSet = r._punchReach||0; window.__E.vis = r.playerFistImg.visible;
    }, 16);
    return true;
  })()`);
  await sleep(6000);
  const fin = await evalJs(`(function(){
    clearInterval(window.__ei); clearInterval(window.__clear);
    var r = window.__run;
    return { 腕の最大到達px: Math.round(window.__E.max),
      突きの判定射程px: window.__run.billiard ? 78 : null,
      節の最大表示数: window.__E.maxSeg, モード: window.__E.mode,
      最後のpunchT: window.__E.punchT, 渡された射程: window.__E.reachSet, 拳表示: window.__E.vis,
      突きの観測フレーム数: window.__E.punches, 実際に渡された射程: window.__E.reachSeen };
  })()`);
  console.log('\n=== 突きの伸び ===');
  console.log(JSON.stringify(fin, null, 1));
  if (fin) {
    const ok = Math.abs(fin.腕の最大到達px - 78) <= 4;
    console.log('判定: 腕が判定射程78pxまで伸びる:', ok ? 'YES ' + fin.腕の最大到達px + 'px' : 'NO ' + fin.腕の最大到達px + 'px');
    console.log('判定: 蛇腹の節が出る:', fin.節の最大表示数 >= 3 ? 'YES' : 'NO ' + fin.節の最大表示数);
  }

  // 殴っている瞬間の画面を撮る（等倍で判定するため）
  await evalJs(`(function(){
    var r = window.__run;
    r.player.x = 320; r.player.y = 180;
    r._jKey = { isDown: true };
    window.__clear2 = setInterval(function(){
      if (r.billiard.st.held) r.billiard.st.held = null;
      for (var i = 0; i < r.enemies.length; i++) {
        var e = r.enemies[i]; if (e.active) { e.x = 60; e.y = 60; e.stag = 0; }
      }
    }, 16);
    return true;
  })()`);
  // 伸び切り（ext=1＝p≒0.3）の瞬間でゲームループを止めてから撮る。
  // 撮影タイミングを合わせないと、クールダウン中の「腕が出ていない画」しか残らない。
  await evalJs(`(function(){
    var r = window.__run, g = window.__vortexGame;
    window.__snap = setInterval(function(){
      var M = 0.2;                       // melee.punchSec
      var p = 1 - Math.max(0, r._punchT / M);
      if (r._punchT > 0 && p >= 0.26 && p <= 0.42) {
        clearInterval(window.__snap); clearInterval(window.__clear2);
        g.loop.stop();                   // ここで画面を凍結
      }
    }, 8);
    return true;
  })()`);
  await sleep(2500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    const out = path.join(HERE, 'r43-claw.png');
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('\nスクリーンショット:', out);
  }
  
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
