// R44W2 ボスの方向指示の実測。
//
// 実プレイFB「ボスとの戦闘中に退避行動をとりたい。その際にボスがどこにいるか矢印でしめして」。
// 測るのは推測ではなく結果：
//   ①退避が本当に成立するか（下がり続けてボスを引き離せるか＝距離が伸びるか）
//   ②ボスが画面外へ出たら矢印が出るか／画面内では出ないか
//   ③矢印の向きが**本当にボスの方向か**（画面中心→ボスの真の角度とのズレ）
//   ④矢印がHUDの帯と重ならない位置にあるか
//   ⑤画面外で予告が始まったら警告に変わるか（見えない一撃を理不尽にしない）
//   ⑥例外0件
// node vortex/scratchpad/cdp-boss-arrow.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8947, DBG = 9497;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=5`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-arrow')}`, 'about:blank'], { stdio: 'ignore' });

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
      return !!(r&&r.boss&&r.hud&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  // ボスを名指しで出す（時間では出せない）。主人公は無敵にして観測に集中する。
  const spawned = await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('uzuking');   // 中堅ボス（chaseSpeed 66）＝退避の実感が一番出る帯
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    return !!(r.boss.active && r.boss.entity);
  })()`);
  console.log('①ボス出現:            ' + (spawned ? 'YES' : 'NO'));
  await sleep(600);

  // 画面内にいるあいだは矢印が出ないこと
  const inside = await evalJs(`(function(){
    var r = window.__run, e = r.boss.entity, c = r.cameras.main;
    r.player.x = e.x + 40; r.player.y = e.y + 20;
    return null;
  })()`);
  await sleep(300);
  const near = await evalJs(`(function(){ return window.__run.hud.debugBossArrow(); })()`);
  console.log('②画面内では出さない:   ' + (near === null ? 'YES（矢印なし）' : 'NO ' + JSON.stringify(near)));

  // ★退避：主人公を実際の速度（148px/s）で下がらせ続ける。ワープではなく歩いて離す＝
  //   「逃げ切れるか」も同時に測る（ワープさせると速度差の検証にならない）。
  const SPEED = 148, STEP = 0.1;
  await evalJs(`(function(){
    var r = window.__run;
    window.__d0 = Math.hypot(r.boss.entity.x - r.player.x, r.boss.entity.y - r.player.y);
    window.__retreat = setInterval(function(){
      if (!r.player || !r.boss.active) return;
      r.player.x -= ${SPEED} * ${STEP};       // 左へ全力で下がる
      r.player.y -= ${SPEED} * ${STEP} * 0.35;
    }, ${STEP * 1000});
    return true;
  })()`);

  const samples = [];
  let warnSeen = null, maxErr = 0, offCount = 0;
  for (let i = 0; i < 26; i++) {
    await sleep(400);
    const s = await evalJs(`(function(){
      var r = window.__run, a = r.hud.debugBossArrow();
      return { a: a, d: Math.round(Math.hypot(r.boss.entity.x - r.player.x, r.boss.entity.y - r.player.y)),
        st: r.boss.state, tele: !!r.boss.telegraphing };
    })()`);
    if (!s) break;
    if (s.a) {
      offCount++;
      // 角度は -180/180 をまたぐので円周差で測る
      let e = Math.abs(s.a.deg - s.a.trueDeg) % 360;
      if (e > 180) e = 360 - e;
      maxErr = Math.max(maxErr, e);
      if (s.a.warn && !warnSeen) warnSeen = { st: s.st, label: s.a.label, d: s.a.dist };
    }
    if (i % 4 === 0 || (s.a && s.a.warn)) samples.push(s);
  }
  await evalJs(`clearInterval(window.__retreat); clearInterval(window.__god); true;`);

  const d0 = await evalJs('window.__d0');
  const last = samples[samples.length - 1];
  console.log('③退避が成立するか:     開始距離 ' + Math.round(d0) + 'px → 最終 ' + (last ? last.d : '?') + 'px'
    + '（伸びていれば引き離せている＝下がる遊びが成立）');
  console.log('④矢印が出たサンプル:   ' + offCount + ' / 26');
  console.log('⑤向きのズレ（最大）:   ' + maxErr.toFixed(1) + '°（0に近いほど正しくボスを指している）');
  console.log('⑥予告中の警告:        ' + (warnSeen ? 'YES ' + JSON.stringify(warnSeen) : 'NO（予告に当たらなかった）'));

  for (const s of samples.slice(0, 12)) {
    console.log('   d=' + String(s.d).padStart(4) + 'px 状態=' + String(s.st).padEnd(11)
      + (s.a ? ' 矢印(' + String(s.a.x).padStart(3) + ',' + String(s.a.y).padStart(3) + ') '
        + String(s.a.deg).padStart(4) + '°/真' + String(s.a.trueDeg).padStart(4) + '° '
        + (s.a.warn ? '★警告 ' : '') + s.a.label : ' 矢印なし'));
  }

  // 帯と重ならないか（上端は MT=68 の内側にあるはず）
  const ys = samples.filter((s) => s.a).map((s) => s.a.y);
  if (ys.length) {
    console.log('⑦矢印のy範囲:         ' + Math.min(...ys) + '〜' + Math.max(...ys)
      + '（68〜334の内側ならHUDの帯と重ならない）');
  }
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
