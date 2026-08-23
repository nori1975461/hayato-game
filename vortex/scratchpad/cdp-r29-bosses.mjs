// CDP 実機検証（R29）：ボス5体の署名攻撃／マオウレクスの巨大化・弱点コア・ミサイル速度・
// ロケットパンチの射程を実測する。PORT 8871 / DBG 9391。
// node vortex/scratchpad/cdp-r29-bosses.mjs
// 手順：静的サーバ→headless Chrome→?autotest=1&seed=42→god mode→各tierを出現させ、
//       攻撃ローテを強制的に回して発火・生成物・例外を数える。PNGも各1枚残す。
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const OUT = HERE;
const PORT = 8871, DBG = 9391;
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
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
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
  fs.writeFileSync(path.join(OUT, `r29-${name}.png`), Buffer.from(r.data, 'base64'));
  console.log('  [shot]', `r29-${name}.png`);
}

// tier の spawnSec（balance.js の既知値）
const SPAWN = [60, 120, 180, 240, 300, 360];
// 各ボスの署名攻撃と、その攻撃が入る state（発火の観測点）
const SIG = [
  { id: 'korotama', atk: 'rollbomb', tele: 'rollTele',   fire: null,        expect: 'strike' },
  { id: 'jetviper', atk: 'flypass',  tele: 'flyBack',    fire: 'flypass',   expect: 'bullet' },
  { id: 'uzuking',  atk: 'spiral',   tele: 'spiralTele', fire: 'spiralFire', expect: 'bullet' },
  { id: 'wavelord', atk: 'tsunami',  tele: 'tsuTele',    fire: 'tsuFire',   expect: 'bullet' },
  { id: 'missilga', atk: 'barrage',  tele: 'barTele',    fire: 'barFire',   expect: 'strike' },
];

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  const userDir = path.join(OUT, '.chrome-prof-r29');
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${userDir}`, 'about:blank'], { stdio: 'ignore' });

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
      // favicon 等の 404 はゲームの欠陥ではないので数えない（数えると EXCEPTIONS=0 が意味を失う）
      if (/404 \(Not Found\)/.test(m.params.entry.text || '')) return;
      exceptions++; console.log('  [LOG error]', m.params.entry.text);
    }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.navigate', { url: URL });
  await sleep(1600);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  await evalJs(`(function(){
    var run = window.__vortexGame.scene.getScene('Run');
    window.__run = run;
    run.hitPlayer = function(d){ window.__hits=(window.__hits||0)+1; window.__dmg=(window.__dmg||0)+d; this.player.invuln = 1; };
    if (window.__godTimer) clearInterval(window.__godTimer);
    window.__godTimer = setInterval(function(){
      if(!run||!run.player) return;
      run.player.hp = run.player.maxHp; run.player.invuln = 1;
    }, 16);
    return true;
  })()`);

  const report = [];

  // ---- 前段5ボス：署名攻撃を強制発火して観測 ----
  for (let ti = 0; ti < 5; ti++) {
    const sig = SIG[ti];
    await evalJs(`(function(){ window.__run.elapsed = ${SPAWN[ti] + 0.4}; return true; })()`);
    let ent = false;
    for (let i = 0; i < 40 && !ent; i++) {
      ent = await evalJs(`(function(){ var b=window.__run.boss; return !!(b&&b.entity&&b.entity.def&&b.entity.def.id==='${sig.id}'); })()`);
      if (!ent) await sleep(100);
    }
    // 攻撃が回ってくるのを待つ（idle→attack のローテを最大25秒観測）
    const seen = { tele: false, fire: false, bullets: 0 };
    const dl = Date.now() + 25000;
    while (Date.now() < dl) {
      const st = await evalJs(`window.__run.boss.state`);
      if (st === sig.tele) {
        if (!seen.tele) { seen.tele = true; await shot(`${sig.id}-tele`); }
      }
      if (sig.fire && st === sig.fire && !seen.fire) {
        seen.fire = true;
        await sleep(220);
        await shot(`${sig.id}-fire`);
      }
      // ⚠️ 計測器の前提：ボスが主人公に密着していると、ボス中心で生まれた弾が生成直後に
      //    主人公へ当たって消え、bulletCount が常に0になる（実測で踏んだ）。観測中は必ず引き離す。
      const cnt = await evalJs(`(function(){var r=window.__run,b=r.boss;
        if(b.entity){ var d=Math.hypot(b.entity.x-r.player.x, b.entity.y-r.player.y);
          if(d<190){ b.entity.x=r.player.x+210; b.entity.y=r.player.y; } }
        return {b:b.bulletCount, s:b.strikeCount};})()`);
      if (cnt) { seen.bullets = Math.max(seen.bullets, sig.expect === 'strike' ? cnt.s : cnt.b); }
      if (seen.tele && seen.bullets > 0 && (!sig.fire || seen.fire)) break;
      await sleep(60);
    }
    if (sig.expect === 'strike' && seen.bullets > 0) await shot(`${sig.id}-strike`);
    report.push(`${sig.id}/${sig.atk}: tele=${seen.tele} fire=${sig.fire ? seen.fire : '-'} ${sig.expect}=${seen.bullets}`);
    console.log('  ' + report[report.length - 1]);
    // 撃破して次へ
    await evalJs(`(function(){ var b=window.__run.boss; if(b&&b.entity){ b.onBossKilled(b.entity); } return true; })()`);
    for (let i = 0; i < 60; i++) {
      const gone = await evalJs(`(function(){ var b=window.__run.boss; return !(b&&b.entity); })()`);
      if (gone) break;
      await sleep(100);
    }
    await sleep(120);
  }

  // ---- マオウレクス ----
  await evalJs(`(function(){ window.__run.elapsed = 360.4; return true; })()`);
  let maou = false;
  for (let i = 0; i < 40 && !maou; i++) {
    maou = await evalJs(`(function(){ var b=window.__run.boss; return !!(b&&b.entity&&b.entity.def&&b.entity.def.id==='maou'); })()`);
    if (!maou) await sleep(100);
  }
  await sleep(500);
  await shot('maou-intro');
  for (let i = 0; i < 90; i++) {
    const s = await evalJs(`window.__run.boss.state`);
    if (s && s !== 'maouIntro') break;
    await sleep(100);
  }

  // サイズ（1.2倍）
  const size = await evalJs(`(function(){ var b=window.__run.boss.entity; return { radius:b.radius, hp:b.maxHp }; })()`);
  console.log('  maou size:', JSON.stringify(size));
  report.push(`maou: radius=${size.radius} (旧68→82=1.21倍) maxHp=${size.hp}`);

  // 弱点コアの位置と半径
  const wp = await evalJs(`(function(){ var w=window.__run.boss.weakPoint(); var b=window.__run.boss.entity;
    return w? { dx: Math.round(w.x-b.x), dy: Math.round(w.y-b.y), r: w.r } : null; })()`);
  console.log('  weakPoint:', JSON.stringify(wp));
  report.push(`weakPoint: ${wp ? `本体中心から (${wp.dx}, ${wp.dy}) 半径${wp.r}` : 'なし（NG）'}`);
  await shot('maou-core');

  // ダメージ経路：本体に当てた場合とコアに当てた場合を dealDamage で直接比較
  const dmgTest = await evalJs(`(function(){
    var run = window.__run, b = run.boss, e = b.entity;
    // 必殺の爆風は「コアが爆心から半径内か」で判定するので、距離を既知の200pxに固定してから測る
    //（ボスの現在位置任せだと、ルールではなく偶然の距離を測ってしまう）
    e.x = run.player.x + 200; e.y = run.player.y;
    var w = b.weakPoint();
    function probe(at){ var before = e.hp; run.dealDamage(e, 1000, 0xffffff, 'manual', at); var d = before - e.hp; e.hp = before; return d; }
    return {
      body:  probe({ x: e.x + e.radius, y: e.y }),                 // 装甲（外周）
      core:  probe({ x: w.x, y: w.y }),                            // コアど真ん中
      melee: probe(null),                                          // 座標なし＝素手/オーラ
      blast: probe({ x: run.player.x, y: run.player.y, r: 320 }),  // 必殺の爆風
      ally:  (function(){ var before=e.hp; run.dealDamage(e, 1000, 0xffffff, 'ally', { x: e.x + e.radius, y: e.y }); var d=before-e.hp; e.hp=before; return d; })(),
    };
  })()`);
  console.log('  damage:', JSON.stringify(dmgTest));
  report.push(`ダメージ経路: 装甲=${dmgTest.body} コア=${dmgTest.core} 近接(座標なし)=${dmgTest.melee} 必殺の爆風=${dmgTest.blast} 仲間弾(装甲)=${dmgTest.ally}`);

  // 攻撃ローテを回して missile / wirearm を観測（弾速と拳の到達長を実測）
  const obs = { missileSpeed: 0, wireLen: 0, wireSeen: false, misSeen: false };
  const dl2 = Date.now() + 60000;
  while (Date.now() < dl2) {
    const s = await evalJs(`(function(){var r=window.__run,b=r.boss;
      if(b.entity){ var d=Math.hypot(b.entity.x-r.player.x, b.entity.y-r.player.y);
        if(d<190){ b.entity.x=r.player.x+210; b.entity.y=r.player.y; } }
      return b.state;})()`);
    if (s === 'missileTele' && !obs.misSeen) { await shot('maou-missile-tele'); }
    if (!obs.misSeen) {
      const v = await evalJs(`(function(){ var b=window.__run.boss; var m=b.debugBullets&&b.debugBullets(); if(!m||!m.length) return 0;
        var f=m.filter(function(x){return x.kind==='missile';}); if(!f.length) return 0;
        return Math.round(Math.max.apply(null, f.map(function(x){return Math.hypot(x.vx,x.vy);}))); })()`);
      if (v > 0) { obs.missileSpeed = v; obs.misSeen = true; await shot('maou-missile'); }
    }
    if (s === 'wireShot') {
      const l = await evalJs(`(function(){ var b=window.__run.boss; var w=b.debugWire&&b.debugWire(); return w?Math.round(w.maxLen):0; })()`);
      if (l > obs.wireLen) obs.wireLen = l;
      if (!obs.wireSeen) { obs.wireSeen = true; await sleep(140); await shot('maou-wirearm'); }
    }
    if (obs.misSeen && obs.wireSeen && obs.wireLen > 0) break;
    await sleep(50);
  }
  console.log('  maou weapons:', JSON.stringify(obs));
  report.push(`ミサイル実測速度=${obs.missileSpeed}px/秒（旧180）／ロケットパンチ実測到達長=${obs.wireLen}px（旧最大210）`);

  console.log('\n===== R29 REPORT =====');
  for (const r of report) console.log(' ・' + r);
  console.log('EXCEPTIONS=' + exceptions);
  await sleep(200);
  process.exit(0);
}

main().catch((e) => { console.error('FAILED', e); console.log('EXCEPTIONS=' + (exceptions + 1)); process.exit(1); });
