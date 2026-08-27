// 真マオウレクス「軌道神核」＝第4形態の実測。
// 測るのは推測ではなく結果：①転生が起きたか ②真の姿の戦闘が何秒か（目標20〜25秒）
// ③攻撃3種がそれぞれ何回出たか ④殻閉じを割れたか ⑤例外0件。
//
// ⚠️ 「攻撃が出た」は state の遷移で数える（Tele で止まった回はカウントしない）。
//    R34 の教訓＝「再生される前に終わる」を、また見落とさないため。
// node vortex/scratchpad/cdp-true-maou.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8931, DBG = 9481;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=11`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-true')}`, 'about:blank'], { stdio: 'ignore' });

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

  const lv = await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 900 && r.level < 27; i++) r.levelup.addXp(60);
    return { レベル: r.level, heroMult: +(r.stats.heroMult || 1).toFixed(2) };
  })()`);
  console.log('主人公:', JSON.stringify(lv));

  // R36W2: BGM切替のスパイ（転生後に maouTrue が鳴るか）。ES モジュールは同一インスタンスが
  // 返るので、Sound.startBgm を包めばゲーム側の切替も全部記録される（R35と同じ手法）。
  await evalJs(`(async function(){
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__B = [];
    var ob = S.startBgm.bind(S);
    S.startBgm = function(nm){ window.__B.push(nm || 'battle'); return ob(nm); };
    return true;
  })()`);
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    // autotest は withAudio=false で startBgm 自体が呼ばれない＝切替の列が測れない。
    // true にしても sound.js は ctx null ガードで安全（音は鳴らず、呼び出しだけ記録される）。
    r.withAudio = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    window.__D = { seq: [], last: null, t0: null, tTrue: null, tKill: null,
      count: {}, awakened: false, shellBreak: 0, maxParts: 0, hpAtTrue: 0, name: '' };
    r.boss.practiceSpawn('maou');
    window.__watch = setInterval(function(){
      var b = r.boss.entity; if (!b) return;
      var D = window.__D;
      if (D.t0 == null) D.t0 = r.elapsed;
      var st = r.boss.state;
      if (st !== D.last) {
        D.seq.push({ st: st, t: +(r.elapsed - D.t0).toFixed(2),
          hp: Math.round(b.hp / b.maxHp * 100), tf: !!r.boss.trueForm });
        // 「発火した」状態だけを数える（Tele で終わった回は攻撃が起きていない）
        if (st === 'alignFire') D.count.aligned = (D.count.aligned || 0) + 1;
        if (st === 'verseFire') D.count.verse = (D.count.verse || 0) + 1;
        if (st === 'shellHold') D.count.shell = (D.count.shell || 0) + 1;
        if (st === 'shellBreak') D.shellBreak++;
        if (st === 'laserFire') D.count.laser = (D.count.laser || 0) + 1;   // R36W2 じゃがんレーザー（分離中）
        // R36W2 再合体後：紫テクスチャ（P接頭辞）に差し替わった枚数を数える
        if (r.boss.phase3 && !D.purple) {
          var pc = 0;
          r.children.list.forEach(function(o){
            var k2 = o.texture && o.texture.key;
            if (k2 && k2.indexOf('boss_maou_P') === 0) pc++;
          });
          if (pc > 0) D.purple = pc;
        }
        D.last = st;
      }
      if (!D.awakened && r.boss.trueForm) {
        D.awakened = true; D.tTrue = r.elapsed - D.t0;
        D.hpAtTrue = b.maxHp; D.name = (b.def && b.def.name) || '';
      }
      D.maxParts = Math.max(D.maxParts, r.boss.partCount);
      if (D.tKill == null && (!r.boss.entity || !r.boss.active)) D.tKill = r.elapsed - D.t0;
    }, 40);
    return true;
  })()`);

  for (let i = 0; i < 200; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'maouIntro') break;
    await sleep(100);
  }

  // ボット：コアへ狙いを合わせて投げ続ける（実プレイに近い削り方）
  await evalJs(`(function(){
    var r = window.__run;
    window.__bot = setInterval(function(){
      var b = r.boss.entity; if (!b || !r.player) return;
      var dx = b.x - r.player.x, dy = b.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 130) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      var w = r.boss.weakPoint(b);
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x - cam.scrollX + (Math.sin(r.elapsed * 7) * 16);
        r.input.activePointer.y = w.y - cam.scrollY + (Math.cos(r.elapsed * 5) * 16);
        r._pointerMoveT = r.elapsed;
      }
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      setTimeout(function(){
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      }, 70);
    }, 120);
    return true;
  })()`);

  let dead = false;
  for (let i = 0; i < 340 && !dead; i++) {   // R37 尺65秒＋転生前30秒でも撃破まで見届ける
    dead = await evalJs(`(function(){ return window.__D.tKill != null; })()`);
    if (!dead) await sleep(500);
  }

  const D = await evalJs(`(function(){
    clearInterval(window.__bot); clearInterval(window.__watch); clearInterval(window.__god);
    return window.__D;
  })()`);
  const BGM = await evalJs(`window.__B || []`);
  console.log('BGM切替の列: ' + JSON.stringify(BGM));

  console.log('');
  if (!D) { console.log('計測に失敗（__D が取れない）'); }
  else {
    const trueSec = (D.tKill != null && D.tTrue != null) ? +(D.tKill - D.tTrue).toFixed(1) : null;
    console.log('転生した:            ' + (D.awakened ? 'YES' : 'NO'));
    console.log('HPバーの見出し:      ' + D.name);
    console.log('転生までの秒数:      ' + (D.tTrue != null ? D.tTrue.toFixed(1) + '秒' : '—'));
    console.log('真の姿のHP:          ' + D.hpAtTrue);
    console.log('真の姿の戦闘長:      ' + (trueSec != null ? trueSec + '秒' : '—') + '  （目標65秒前後・R37）');
    console.log('全体の戦闘長:        ' + (D.tKill != null ? D.tKill.toFixed(1) + '秒' : '—'));
    console.log('整列レーザー 発射:   ' + (D.count.aligned || 0) + '回');
    console.log('聖句解放     発射:   ' + (D.count.verse || 0) + '回');
    console.log('殻閉じ       成立:   ' + (D.count.shell || 0) + '回');
    console.log('殻閉じ       割れた: ' + D.shellBreak + '回');
    console.log('じゃがんレーザー発射: ' + (D.count.laser || 0) + '回（分離中のみ・R36W2）');
    console.log('紫テクスチャ枚数:    ' + (D.purple || 0) + '（再合体後・9で全パーツ）');
    console.log('パーツ最大数:        ' + D.maxParts + '（真の姿は9）');
    console.log('');
    console.log('状態の推移（真の姿ぶんだけ）:');
    for (const e of D.seq) {
      if (!e.tf && e.st !== 'awakenCine') continue;
      console.log('  ' + String(e.t).padStart(6) + 's  ' + e.st.padEnd(12) + ' HP' + e.hp + '%');
    }
  }
  console.log('');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
