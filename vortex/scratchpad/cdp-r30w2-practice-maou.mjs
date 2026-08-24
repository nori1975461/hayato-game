// CDP 実機検証（R30W2）：れんしゅうじょう④「マオウレクスと たたかう」。PORT 8897 / DBG 9447。
// node vortex/scratchpad/cdp-r30w2-practice-maou.mjs     SHOT=1 でPNGを残す
//
// 測るのは「練習場で本編と同じことが起きるか」。
//   A ④に入るとマオウレクスが出る（他のボスは時間で勝手に出てこない）
//   B Zキー相当でHPを49%にすると分離が起き、下半身が実体化する
//   C Xキー相当でHPを32%にすると再合体してメタリックパープルになる
//   D 胸部レーザーが練習場でも撃たれる
//   E 撃破してもエンディングへ飛ばず、出し直される
//   F コースを①へ戻すとボスが完全に消える（幽霊が残らない）
//   G 主人公は死なない／EXCEPTIONS=0
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8897, DBG = 9447;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&practice=1&seed=42`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOT = process.env.SHOT === '1';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
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
async function shot(name) {
  if (!SHOT) return;
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(HERE, `r30w2-${name}.png`), Buffer.from(r.data, 'base64'));
  console.log('  [shot]', `r30w2-${name}.png`);
}
// 実キーを送る（本番と同じ入力経路を通す。関数を直接呼ぶとキー割り当ての間違いを見逃す）
async function key(k, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: code, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: code, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) });
  await sleep(120);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r30w2')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.practice&&r.boss);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('practice scene not ready');

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // ---- 時間が経ってもボスが勝手に出ないこと（tier スケジューラが止まっているか）----
  const idle = await evalJs(`(async function(){
    var r = window.__run;
    r.elapsed = 400;                        // 本編なら全ボスの出現時刻を過ぎている
    await new Promise(function(res){ setTimeout(res, 1200); });
    return { コース: r.practice.st.course, ボスが出た: r.boss.active };
  })()`);
  say('前提 ①のまま400秒経過: ' + JSON.stringify(idle) + '（ボスが出たら NG）');

  // ---- A キー4で④へ ----
  await key('4', 'Digit4');
  await sleep(900);
  const A = await evalJs(`(function(){
    var r = window.__run, b = r.boss;
    return { コース: r.practice.st.course, ボスが出た: b.active,
             だれ: b.entity && b.entity.def ? b.entity.def.id : null,
             maxHp: b.entity ? b.entity.maxHp : 0,
             ボスを回している: r.practice.wantBoss() };
  })()`);
  say('A キー4で④へ: ' + JSON.stringify(A));

  // 登場イベントを終わらせる
  await evalJs(`(async function(){
    var b = window.__run.boss;
    for (var i = 0; i < 300 && b.state === 'maouIntro'; i++) await new Promise(function(res){ setTimeout(res, 30); });
    return b.state;
  })()`);
  await shot('course4');

  // ---- B Zキーで分離 ----
  await key('z', 'KeyZ');
  const B = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    var sawCine = false;
    for (var i = 0; i < 300; i++) {
      if (b.state === 'splitCine') sawCine = true;
      if (b.split) break;
      await new Promise(function(res){ setTimeout(res, 20); });
    }
    var lp = b.lowerPos;
    return { HPが下がった: Math.round((b.entity.hp / b.entity.maxHp) * 100) + '%',
             カットシーン: sawCine, 分離した: b.split, 下半身: !!lp,
             ぶんりつ回数: r.practice.st.splits };
  })()`);
  say('B Zキー→分離: ' + JSON.stringify(B));
  await shot('split');

  // ---- C Xキーで再合体 ----
  await key('x', 'KeyX');
  const C = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    var sawCine = false;
    for (var i = 0; i < 400; i++) {
      if (b.state === 'mergeCine') sawCine = true;
      if (b.phase3 && b.state !== 'mergeCine') break;
      await new Promise(function(res){ setTimeout(res, 20); });
    }
    return { カットシーン: sawCine, 合体した: b.phase3, 下半身が消えた: b.lowerPos === null,
             色: '0x' + (b.bossTint || 0).toString(16),
             さいごうたい回数: r.practice.st.merges };
  })()`);
  say('C Xキー→再合体: ' + JSON.stringify(C));
  await shot('merged');

  // ---- D 胸部レーザー ----
  const D = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    var tele = false, fire = false;
    for (var i = 0; i < 1500; i++) {
      if (b.state === 'chestTele') tele = true;
      if (b.state === 'chestFire') { fire = true; break; }
      await new Promise(function(res){ setTimeout(res, 16); });
    }
    await new Promise(function(res){ setTimeout(res, 400); });
    return { 溜め: tele, 発射: fire, レーザー回数: r.practice.st.lasers,
             主人公のHP: r.player.hp };
  })()`);
  say('D 胸部レーザー: ' + JSON.stringify(D));
  await shot('chestlaser');

  // ---- Cキーで全快（節目を何度でも見られるか）----
  await key('c', 'KeyC');
  await sleep(300);
  const full = await evalJs(`(function(){ var b=window.__run.boss;
    return { HP: Math.round((b.entity.hp/b.entity.maxHp)*100) + '%' }; })()`);
  say('  Cキー→全快: ' + JSON.stringify(full));

  // ---- E 撃破してもエンディングへ飛ばず出し直される ----
  const E = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    b.onBossKilled(b.entity);
    var gone = false;
    for (var i = 0; i < 400; i++) {
      if (!b.active) gone = true;
      if (gone && b.active) break;                 // 出し直された
      await new Promise(function(res){ setTimeout(res, 40); });
    }
    return { いちど消えた: gone, 出し直された: b.active,
             シーンはRunのまま: r.scene.isActive('Run'),
             ended: !!r.ended, たいりょく: r.player.hp };
  })()`);
  say('E 撃破→出し直し: ' + JSON.stringify(E));

  // ---- F コース①へ戻すとボスが完全に消える ----
  await key('1', 'Digit1');
  await sleep(900);
  const F = await evalJs(`(function(){
    var r = window.__run;
    return { コース: r.practice.st.course, ボスが残っている: r.boss.active,
             敵リストのボス: r.enemies.filter(function(o){ return o.active && o.isBoss; }).length,
             下半身の幽霊: r.enemies.some(function(o){ return o.active && o.isLowerHalf; }) };
  })()`);
  say('F ①へ戻す: ' + JSON.stringify(F));

  // ---- ④へ戻して再入できるか ----
  await key('4', 'Digit4');
  await sleep(1200);
  const G = await evalJs(`(function(){ var r = window.__run, b = r.boss;
    return { 再入できた: b.active, だれ: b.entity && b.entity.def ? b.entity.def.id : null,
             HP: b.entity ? Math.round((b.entity.hp/b.entity.maxHp)*100) + '%' : '-' }; })()`);
  say('G ④へ再入: ' + JSON.stringify(G));

  console.log('\nEXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r30w2-report.txt'), REP.join('\n') + '\nEXCEPTIONS=' + exceptions + '\n');
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
