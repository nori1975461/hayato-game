// R44W4 せいく（聖句解放）の実測。
//
// 実プレイFB「①せいくの弾のスピードを上げて ②せいくのビジュアルは文字を基にしているという
// 発想は神格性があっていいのだが、そこに退廃的な要素（悪魔性）をビジュアルに込められないか」。
//
// ★測るのは設定値ではなく **画面に出ているもの**（[[feedback_measure_vfx_by_diff]]）：
//   - 弾速は「飛んでいる弾の速さ」を数える（balance.js を読み直すのは検証ではない）
//   - 「堕ちた」は **spr.texture.key が verse_glyph_fallen になったか**で数える
//     （値だけ変わって絵が変わらない、が過去に何度も起きている）
//   - 回転は rotation が実際に変化しているか（R40 は spin を渡していたのに一度も回っていなかった）
// node vortex/scratchpad/cdp-verse.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8953, DBG = 9503;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=21`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-verse')}`, 'about:blank'], { stdio: 'ignore' });

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

  // テクスチャが2枚とも焼かれているか（絵が存在しなければ以降は全部無意味）
  const tex = await evalJs(`(function(){
    var t = window.__vortexGame.textures;
    var a = t.get('verse_glyph'), b = t.get('verse_glyph_fallen');
    return { holy: !!a && a.key === 'verse_glyph', fallen: !!b && b.key === 'verse_glyph_fallen',
      w: b ? b.source[0].width : 0, h: b ? b.source[0].height : 0 };
  })()`);
  console.log('①堕ちた文字のテクスチャ: ' + (tex && tex.fallen ? `YES（${tex.w}×${tex.h}）` : 'NO'));

  // 真の姿を出し、HPを固定して聖句だけを何度も撃たせる
  const up = await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e) e.hp = e.maxHp * 0.9;          // 段(rage)を上げずに測る＝基準の弾速で測る
      r.player.hp = r.player.maxHp;         // 死なせない
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 60; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(400);
  }
  console.log('②軌道神核へ転生:        ' + (up ? 'YES' : 'NO'));

  // 観測器：毎フレーム debugGlyphs() を舐めて、速さ・堕ち・回転を集める
  await evalJs(`(function(){
    var r = window.__run, B = r.boss;
    window.__S = { seen: 0, spd: [], fallen: 0, holyTex: 0, fallTex: 0,
      fallAge: [], rotMoved: 0, rotStuck: 0, rings: 0, tints: {} };
    window.__prevRot = {};
    if (window.__t) clearInterval(window.__t);
    window.__t = setInterval(function(){
      if (!B.active || !B.debugGlyphs) return;
      var S = window.__S, gs = B.debugGlyphs();
      var prev = window.__prevRot, next = {};
      for (var i = 0; i < gs.length; i++) {
        var g = gs[i], id = g.spd + '_' + Math.round(g.age * 100);
        if (g.tex === 'verse_glyph') S.holyTex++;
        if (g.tex === 'verse_glyph_fallen') S.fallTex++;
        if (g.age < 0.1) { S.seen++; S.spd.push(g.spd); }
        if (g.fallen) { S.tints[g.tint] = (S.tints[g.tint] || 0) + 1; }
      }
      // 回転が実際に動いているか：同じ弾を追わずに「全体の回転値の集合」が毎回変わるかで見る
      var key = gs.map(function(g){ return g.rot; }).join(',');
      if (gs.length) { if (key !== window.__prevKey) S.rotMoved++; else S.rotStuck++; }
      window.__prevKey = key;
      // 弾1発ごとに輪と灰を出すので、処理落ちしていないかも同時に見る
      if (B.state === 'verseFire') S.fps = Math.min(S.fps == null ? 999 : S.fps,
        Math.round(window.__vortexGame.loop.actualFps));
      // 一番古い弾の齢と堕ち状態＝堕ちるまでの実測秒
      for (var j = 0; j < gs.length; j++) {
        if (gs[j].fallen && S.fallAge.length < 200) S.fallAge.push(gs[j].age);
      }
    }, 30);
    return true;
  })()`);

  // 聖句が3回終わるまで見る
  let last = null, verseFires = 0;
  for (let i = 0; i < 200 && verseFires < 3; i++) {
    await sleep(300);
    const st = await evalJs(`window.__run.boss.state`);
    if (st === 'verseFire' && last !== 'verseFire') verseFires++;
    last = st;
  }
  await evalJs('clearInterval(window.__t); true;');
  const S = await evalJs('window.__S');

  const avg = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const minA = (a) => (a && a.length ? Math.min(...a) : 0);
  console.log('③せいく発射回数:        ' + verseFires + '回');
  console.log('④飛んだ文字の速さ:      ' + (S ? avg(S.spd).toFixed(0) : '?')
    + ' px/秒（旧280・主人公148の' + (S ? (avg(S.spd) / 148).toFixed(2) : '?') + '倍）');
  console.log('⑤聖のまま／堕ちた:      ' + (S ? S.holyTex : '?') + ' / ' + (S ? S.fallTex : '?')
    + ' サンプル ← 両方0でなければ「過程」が画面に出ている');
  console.log('⑥堕ちるまでの実測:      ' + (S ? minA(S.fallAge).toFixed(2) : '?') + '秒（設計0.26秒）');
  console.log('⑦堕ちた弾の色の種類:    ' + (S ? Object.keys(S.tints).length : '?')
    + '（1なら紫のまま＝深紅へ落ちていない）');
  console.log('⑧回転:                  動いた' + (S ? S.rotMoved : '?')
    + ' / 止まっていた' + (S ? S.rotStuck : '?') + ' ← R40の実装漏れの是正');
  console.log('⑨発射中の最低FPS:       ' + (S && S.fps != null ? S.fps : '?')
    + ' ← 弾1発ごとに輪と灰を出すので処理落ちを見る');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
