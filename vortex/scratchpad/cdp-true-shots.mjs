// 真マオウレクスを「Phaser の実描画」で撮る。
// ⚠️ 設計プレビュー（maou-true-candidates.mjs）は自作ラスタライザで描いた別物なので、
//    それが良く見えても本編で同じに見える保証はない。**実プレイの画面をそのまま撮って確かめる**
//    ＝[[feedback_pixel_art_judge_at_play_zoom]]／「完了報告前に必ずPNG化して構図を比較する」。
// node vortex/scratchpad/cdp-true-shots.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const OUT = path.join(HERE, 'shots-true');
const PORT = 8933, DBG = 9483;
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
let CLIP = null;
async function shot(name) {
  if (!CLIP) {
    CLIP = await evalJs(`(function(){var c=document.querySelector('canvas');if(!c)return null;
      var b=c.getBoundingClientRect();
      return {x:b.x,y:b.y,width:b.width,height:b.height,scale:1,css:c.width+'x'+c.height};})()`);
    if (CLIP) { console.log('  canvas: ' + CLIP.css + ' 表示 ' +
      Math.round(CLIP.width) + 'x' + Math.round(CLIP.height)); delete CLIP.css; }
  }
  const r = await send('Page.captureScreenshot',
    CLIP ? { format: 'png', clip: CLIP, captureBeyondViewport: true } : { format: 'png' });
  if (!r || !r.data) { console.log('  撮影失敗:', name); return; }
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  const st = await evalJs('window.__run.boss.state');
  console.log('  ' + name.padEnd(22) + ' state=' + st);
}
// 目的の state になるまで待つ（来なければ諦めて撮らない＝「撮れたことにしない」）
async function waitState(want, limitMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limitMs) {
    const st = await evalJs('window.__run.boss.state');
    if (Array.isArray(want) ? want.includes(st) : st === want) return st;
    await sleep(60);
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=560,520', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-tshot')}`, 'about:blank'], { stdio: 'ignore' });

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
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.billiard&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    r.boss.practiceSpawn('maou');
    window.__near = setInterval(function(){
      var b = r.boss.entity; if (!b || !r.player) return;
      var dx = b.x - r.player.x, dy = b.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      // 診断のときはボスを画面中央に置く（カメラは主人公中心なので主人公をボスへ重ねる）。
      // 実プレイの間合い(150px)だと巨体が必ず画面外へ出て、絵として読めるかを判定できない。
      var want = window.__center ? 0 : 150;
      r.player.x = b.x - (dx/d) * want;
      r.player.y = b.y - (dy/d) * want;
    }, 40);
    return true;
  })()`);
  await waitState(['chase'], 20000);

  console.log('--- 第3形態（メタリックパープル） ---');
  // 見比べのため、まず旧体をそのまま1枚。合体後の色にしてから撮る
  await evalJs(`(function(){
    var r = window.__run, b = r.boss.entity;
    b.hp = b.maxHp * 0.30;   // 再合体の節目を越えさせる（メタリックパープルへ）
    return true;
  })()`);
  await waitState(['mergeCine'], 12000);
  await sleep(2600);
  await waitState(['chase', 'chestTele', 'wireTele', 'knuckleTele', 'missileTele'], 12000);
  await evalJs(`window.__keep = setInterval(function(){
    var b = window.__run.boss.entity; if (b) b.hp = b.maxHp; }, 50)`);
  await sleep(400);
  console.log('  phase3=' + await evalJs('window.__run.boss.phase3')
    + ' split=' + await evalJs('window.__run.boss.split')
    + ' tint=0x' + ((await evalJs('window.__run.boss.bossTint')) || 0).toString(16));
  await shot('01-phase3-purple');

  console.log('--- 転生カットシーン ---');
  await evalJs(`(function(){
    var r = window.__run;
    clearInterval(window.__keep);
    r.killEnemy(r.boss.entity);   // HP0＝撃破ではなく転生の入口
    return true;
  })()`);
  await sleep(1200); await shot('02-crack');        // 亀裂が走っている途中
  // 粉砕＝旧パーツが中心から離れ始めた瞬間。実時間で待つとスローの分だけ必ずずれる
  for (let i = 0; i < 300; i++) {
    // ⚠️ 「中心からのずれ」では測れない。腕は素の配置で既に105px離れているので常に閾値を超え、
    //    無傷の旧体を「粉砕」として撮っていた。粉砕 tween は alpha を 1→0 にするので、そこを見る。
    const d = await evalJs(`(function(){var r=window.__run;var m=1;
      r.children.list.forEach(function(o){var k=o.texture&&o.texture.key;
      if(!/^boss_maou_(body|core|arm|leg|cannon|pauldron|cellpod)$/.test(k||''))return;
      m=Math.min(m,o.alpha);});return +m.toFixed(2);})()`);
    if (d < 0.6) { console.log('  粉砕を検出（旧パーツのα ' + d + '）'); break; }
    await sleep(50);
  }
  await shot('03-shatter');                        // 粉砕の直後（破片が飛んでいる）
  for (let i = 0; i < 300; i++) {
    if (await evalJs('window.__run.boss.trueForm')) break;
    await sleep(60);
  }
  await sleep(600);  await shot('04-rise');         // 真の姿がせり上がる
  await waitState(['chase'], 12000);
  await evalJs(`window.__keep = setInterval(function(){
    var b = window.__run.boss.entity; if (b) b.hp = b.maxHp; }, 50)`);
  await sleep(500);  await shot('05-true-idle');    // 真の姿（通常・実プレイの間合い）
  await evalJs('window.__center = true'); await sleep(700);
  // テロップが眼に被らない瞬間を選ぶ（予告中に撮ると文字で顔が隠れて絵の判定にならない）
  for (let i = 0; i < 120; i++) {
    if (await evalJs(`window.__run.boss.state`) === 'chase') break;
    await sleep(100);
  }
  await sleep(900);
  await shot('05c-center');                        // 診断：ボスを画面中央に置いた1枚
  await evalJs('window.__center = false'); await sleep(500);

  console.log('--- 攻撃3種 ---');
  if (await waitState('alignTele', 22000)) { await sleep(1700); await shot('06-align-tele'); }
  if (await waitState('alignFire', 8000))  { await sleep(250);  await shot('07-align-fire'); }
  if (await waitState('verseFire', 22000)) { await sleep(1100); await shot('08-verse-fire'); }
  if (await waitState('shellClose', 30000)) { await sleep(1000); await shot('09-shell-close'); }
  if (await waitState('shellHold', 8000))  { await sleep(400);  await shot('10-shell-hold'); }

  console.log('');
  console.log('出力: ' + OUT);
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
