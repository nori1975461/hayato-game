// CDP 実機検証（R30）：マオウレクスの分離／再合体。PORT 8896 / DBG 9446。
// node vortex/scratchpad/cdp-r30-split.mjs      SHOT=1 でPNGを残す
//
// 測るのは設定値ではなく**画面で起きたこと**。
//   A HPが1.2倍（20000→24000）になっているか
//   B 50%で分離のカットシーンを通り、下半身が実体として存在し、上半身と別々に動くか
//   C ミサイルは下半身から出るか（弾の生成位置で判定）／ロケットパンチは上半身が出すか
//   D 下半身にはダメージが通らないか（狙う場所は最後までコア1つ）
//   E 33%で再合体し、色がメタリックパープルへ変わり、下半身が消えるか
//   F 胸部レーザーが発射され、実際に主人公へ与えるダメージが作中最大（80）か
//   G 撃破まで通して後片付けの漏れがないか／EXCEPTIONS=0
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8896, DBG = 9446;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
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
  fs.writeFileSync(path.join(HERE, `r30-${name}.png`), Buffer.from(r.data, 'base64'));
  console.log('  [shot]', `r30-${name}.png`);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    // ページ内 setTimeout が1秒へ絞られると計測ループが実時間で数百秒かかる（実測で踏んだ）
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r30')}`, 'about:blank'], { stdio: 'ignore' });

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
  await sleep(1800);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  // god mode ＋ 主人公が受けたダメージを全部記録（作中最大ダメージの実測に使う）
  await evalJs(`(function(){
    var run = window.__vortexGame.scene.getScene('Run');
    window.__run = run;
    window.__dmgs = [];
    run.hitPlayer = function(d){ window.__dmgs.push(d); this.player.invuln = 1; };
    if (window.__godTimer) clearInterval(window.__godTimer);
    window.__godTimer = setInterval(function(){
      if(!run||!run.player) return;
      run.player.hp = run.player.maxHp; run.player.invuln = 1;
    }, 16);
    return true;
  })()`);

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // ---- A 出現とHP ----
  // ボスは tier 順に1体ずつしか出ない（ti は撃破でしか進まない）。前段5体を出しては即撃破して
  // 最終tierまで送る。elapsed を進めるだけでは出ないのを実測で踏んだ。
  const SPAWN = [60, 120, 180, 240, 300];
  for (let t = 0; t < SPAWN.length; t++) {
    await evalJs(`(function(){ window.__run.elapsed = ${SPAWN[t] + 0.4}; return true; })()`);
    for (let i = 0; i < 60; i++) {
      const on = await evalJs(`(function(){ var b=window.__run.boss; return !!(b&&b.entity); })()`);
      if (on) break;
      await sleep(100);
    }
    await evalJs(`(function(){ var b=window.__run.boss; if(b&&b.entity) b.onBossKilled(b.entity); return true; })()`);
    for (let i = 0; i < 80; i++) {
      const gone = await evalJs(`(function(){ var b=window.__run.boss; return !(b&&b.entity); })()`);
      if (gone) break;
      await sleep(100);
    }
    await sleep(150);
  }
  await evalJs(`(function(){ window.__run.elapsed = 360.4; return true; })()`);
  let maou = false;
  for (let i = 0; i < 60 && !maou; i++) {
    maou = await evalJs(`(function(){ var b=window.__run.boss; return !!(b&&b.entity&&b.entity.def&&b.entity.def.id==='maou'); })()`);
    if (!maou) await sleep(100);
  }
  if (!maou) throw new Error('maou did not spawn');
  for (let i = 0; i < 80; i++) {
    const s = await evalJs(`window.__run.boss.state`);
    if (s && s !== 'maouIntro') break;
    await sleep(150);
  }
  const A = await evalJs(`(function(){ var e=window.__run.boss.entity;
    return { maxHp: e.maxHp, hp: e.hp, radius: e.radius }; })()`);
  say(`A 出現 maxHp=${A.maxHp} (旧20000→1.2倍=24000) ${A.maxHp === 24000 ? 'OK' : 'NG'}`);

  // ---- B 50%で分離 ----
  const Bp = evalJs(`(async function(){
    var r = window.__run, b = r.boss, e = b.entity;
    // ⚠️ 最悪ケースで測る：主人公をボスから400px離した状態で節目を跨がせる。
    //    近くに居るときしか見えない演出は「見せている」ことにならない。
    r.player.x = e.x + 400; r.player.y = e.y + 120;
    e.hp = Math.floor(e.maxHp * 0.49);
    var sawCine = false, onScreen = 0, frames = 0;
    for (var i = 0; i < 400; i++) {
      if (b.state === 'splitCine') {
        sawCine = true; frames++;
        var cam = r.cameras.main;
        var sx = e.x - cam.scrollX, sy = e.y - cam.scrollY;
        if (sx > 0 && sx < cam.width && sy > 0 && sy < cam.height) onScreen++;
      }
      if (b.split) break;
      await new Promise(function(res){ setTimeout(res, 20); });
    }
    var lp = b.lowerPos;
    return { cine: sawCine, カットシーン中にボスが画面内: onScreen + '/' + frames, split: b.split,
             lower: lp ? { x: Math.round(lp.x), y: Math.round(lp.y), r: lp.r } : null,
             dist: lp ? Math.round(Math.hypot(lp.x-e.x, lp.y-e.y)) : -1,
             bossEntities: r.enemies.filter(function(o){return o.active&&o.isBoss;}).length };
  })()`);
  // カットシーンの最中を1枚。in-page ループは setTimeout で譲るので、この間に撮れる。
  for (let i = 0; i < 120; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st === 'splitCine') { await sleep(700); await shot('split-cine'); break; }
    await sleep(40);
  }
  const B = await Bp;
  say('B 分離: ' + JSON.stringify(B));
  await shot('split');

  const Bm = await evalJs(`(async function(){
    var r = window.__run, b = r.boss, e = b.entity;
    var p0 = b.lowerPos, e0 = { x: e.x, y: e.y };
    await new Promise(function(res){ setTimeout(res, 1500); });
    var p1 = b.lowerPos;
    return { lowerMoved: p1 ? Math.round(Math.hypot(p1.x-p0.x, p1.y-p0.y)) : -1,
             upperMoved: Math.round(Math.hypot(e.x-e0.x, e.y-e0.y)),
             stillApart: p1 ? Math.round(Math.hypot(p1.x-e.x, p1.y-e.y)) : -1 };
  })()`);
  say('  別々に動くか: ' + JSON.stringify(Bm));

  // ---- C 発射元 ----
  // ミサイルが0発の瞬間から16msで張り込み、湧いた斉射の重心が上下どちらに近いかで判定する。
  const C = await evalJs(`(async function(){
    var r = window.__run, b = r.boss, e = b.entity;
    // ⚠️ ミサイルは寿命3.2秒・間隔2.6秒で重なるので「0発になるのを待つ」と1回しか数えられない
    //    （実測で踏んだ）。斉射は**本数が一気に増えた瞬間**で捉え、生まれたての弾は必ず砲口の
    //    すぐ横にいる＝上下それぞれへの最短距離で発射元を決める。
    var res = { salvos: 0, nearLower: 0, nearUpper: 0, wireShot: 0, upperMissileTele: 0, minDist: [] };
    var prev = 0;
    for (var i = 0; i < 2400; i++) {
      var st = b.state;
      if (st === 'wireShot') res.wireShot++;
      if (st === 'missileTele') res.upperMissileTele++;
      // ⚠️ 計測器の前提：下半身は主人公を追うので密着する。密着すると砲口で生まれた弾が
      //    その場で主人公に当たって消え、本数が増えたように見えない（R29で踏んだのと同じ罠）。
      var lpNow = b.lowerPos;
      if (lpNow && Math.hypot(r.player.x - lpNow.x, r.player.y - lpNow.y) < 300) {
        r.player.x = lpNow.x + 320; r.player.y = lpNow.y;
      }
      var ms = b.debugBullets().filter(function(x){ return x.kind === 'missile'; });
      if (ms.length - prev >= 4) {
        res.salvos++;
        var lp = b.lowerPos;
        var du = 1e9, dl = 1e9;
        for (var k = 0; k < ms.length; k++) {
          du = Math.min(du, Math.hypot(ms[k].x - e.x, ms[k].y - e.y));
          if (lp) dl = Math.min(dl, Math.hypot(ms[k].x - lp.x, ms[k].y - lp.y));
        }
        if (dl < du) res.nearLower++; else res.nearUpper++;
        res.minDist.push({ toLower: Math.round(dl), toUpper: Math.round(du) });
      }
      prev = ms.length;
      if (res.salvos >= 5 && res.wireShot > 0) break;
      await new Promise(function(res2){ setTimeout(res2, 16); });
    }
    return res;
  })()`);
  say('C 発射元: ' + JSON.stringify(C));
  await shot('lower-missile');

  // 見え方の確認用：主人公を上下の中間の外側へ置き、2体が同時に映る絵を1枚撮る
  await evalJs(`(function(){ var r = window.__run, b = r.boss, e = b.entity, lp = b.lowerPos;
    if (lp) { r.player.x = (e.x + lp.x) / 2; r.player.y = (e.y + lp.y) / 2 + 150; } return true; })()`);
  await sleep(400);
  await shot('split-view');

  // ---- D 下半身は弾く ----
  const D = await evalJs(`(function(){
    var r = window.__run, b = r.boss, e = b.entity;
    var low = r.enemies.find(function(o){ return o.active && o.isLowerHalf; });
    if (!low) return { lowerExists: false };
    var hp0 = e.hp;
    r.dealDamage(low, 1000, 0xffffff, 'manual', { x: low.x, y: low.y });
    var mid = e.hp;
    var w = b.weakPoint(e);
    r.dealDamage(e, 1000, 0xffffff, 'manual', { x: w.x, y: w.y });
    return { lowerExists: true, hitLower1000: hp0 - mid, hitCore1000: mid - e.hp };
  })()`);
  say('D 装甲: ' + JSON.stringify(D));

  // ---- E 33%で再合体 ----
  const Ep = evalJs(`(async function(){
    var r = window.__run, b = r.boss, e = b.entity;
    var tint0 = b.bossTint;
    r.player.x = e.x + 420; r.player.y = e.y - 140;   // 最悪ケース：離れた位置で節目を迎える
    e.hp = Math.floor(e.maxHp * 0.32);
    // 「見せる」＝カットシーンが実時間で流れること。フレーム数ではなく経過ミリ秒で測る。
    var sawCine = false, tCineStart = 0, tCineEnd = 0, onScreen = 0, frames = 0, atColorChange = null;
    var wasP3 = b.phase3;
    for (var i = 0; i < 900; i++) {
      if (b.state === 'mergeCine') {
        if (!sawCine) { sawCine = true; tCineStart = performance.now(); }
        tCineEnd = performance.now(); frames++;
        var cam = r.cameras.main;
        var sx = e.x - cam.scrollX, sy = e.y - cam.scrollY;
        if (sx > 0 && sx < cam.width && sy > 0 && sy < cam.height) onScreen++;
        // 色が変わった最初のフレームの画面内座標＝「変色をプレイヤーが見たか」の実測点
        if (!wasP3 && b.phase3) { wasP3 = true; atColorChange = { sx: Math.round(sx), sy: Math.round(sy),
          w: cam.width, h: cam.height, 画面内: sx > 0 && sx < cam.width && sy > 0 && sy < cam.height }; }
      }
      if (b.phase3 && b.state !== 'mergeCine') break;
      await new Promise(function(res){ setTimeout(res, 20); });
    }
    return { cine: sawCine, cineMs: Math.round(tCineEnd - tCineStart),
             カットシーン中にボスが画面内: onScreen + '/' + frames,
             変色の瞬間: atColorChange, phase3: b.phase3,
             splitCleared: b.split === false, lowerGone: b.lowerPos === null,
             lowerInList: r.enemies.some(function(o){ return o.active && o.isLowerHalf; }),
             tintBefore: '0x' + (tint0||0).toString(16), tintAfter: '0x' + (b.bossTint||0).toString(16) };
  })()`);
  for (let i = 0; i < 160; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st === 'mergeCine') { await sleep(1500); await shot('merge-cine'); break; }
    await sleep(40);
  }
  const E = await Ep;
  say('E 再合体: ' + JSON.stringify(E));
  await shot('merged');

  // ---- F 胸部レーザー ----
  const F = await evalJs(`(async function(){
    var r = window.__run, b = r.boss, e = b.entity;
    window.__dmgs = [];
    var sawTele = false, sawFire = false, sawBeam = false, shotAt = -1;
    for (var i = 0; i < 2000; i++) {
      if (b.state === 'chestTele') sawTele = true;
      if (b.state === 'chestFire') {
        sawFire = true;
        if (b.beamActive) sawBeam = true;
        var a = Math.atan2(r.player.y - e.y, r.player.x - e.x);
        r.player.x = e.x + Math.cos(a) * 200; r.player.y = e.y + Math.sin(a) * 200;
      }
      if (sawBeam && shotAt < 0) shotAt = i;
      if (shotAt >= 0 && i > shotAt + 90) break;
      await new Promise(function(res){ setTimeout(res, 16); });
    }
    var mx = window.__dmgs.length ? Math.max.apply(null, window.__dmgs) : 0;
    return { tele: sawTele, fire: sawFire, beam: sawBeam,
             maxDamageToPlayer: mx, hits: window.__dmgs.length };
  })()`);
  say('F 胸部レーザー: ' + JSON.stringify(F));
  await shot('chestlaser');

  // カメラが主人公へ返っているか（預かったままだと以後ずっと操作不能に見える）
  const CAM = await evalJs(`(async function(){
    var r = window.__run;
    r.player.x += 260; r.player.y += 160;
    await new Promise(function(res){ setTimeout(res, 900); });
    var cam = r.cameras.main;
    var sx = r.player.x - cam.scrollX, sy = r.player.y - cam.scrollY;
    return { 主人公が画面中央付近: Math.abs(sx - cam.width/2) < 60 && Math.abs(sy - cam.height/2) < 60,
             sx: Math.round(sx), sy: Math.round(sy), w: cam.width, h: cam.height };
  })()`);
  say('カメラ復帰: ' + JSON.stringify(CAM));

  // ---- G 撃破まで ----
  const G = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    for (var k = 0; k < 60 && b.active; k++) {
      var e = b.entity;
      if (e) { var w = b.weakPoint(e); if (w) r.dealDamage(e, 3000, 0xffffff, 'manual', { x: w.x, y: w.y }); }
      await new Promise(function(res){ setTimeout(res, 60); });
    }
    await new Promise(function(res){ setTimeout(res, 3000); });
    return { bossGone: !b.active, lowerPos: b.lowerPos,
             lowerInList: r.enemies.some(function(o){ return o.active && o.isLowerHalf; }) };
  })()`);
  say('G 撃破後: ' + JSON.stringify(G));

  console.log('\nEXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r30-report.txt'), REP.join('\n') + '\nEXCEPTIONS=' + exceptions + '\n');
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
