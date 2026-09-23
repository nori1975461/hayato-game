// 2026-09-13 ジャム版「裁き」の結果画面・傷跡・光輪の欠片を「実プレイの等倍」で撮る。
//   1回目：大聖堂を 60% まで削って死ぬ → 裁き（死因・残り%）→ V で一覧 → SPACE で再挑戦（Run に直接戻るか）
//   2回目：HUD の傷跡（60% の刻み）→ 越えた瞬間 → 30% で破鐘 → 光輪の欠片（金の輪）→ 掴んで投げ当てる → 撃破の裁き
// 使い方: node scratchpad/jam-result-shots.mjs [seed] [portOffset]
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 4);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-result-shots');
fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});

let ws, msgId = 0, exceptions = 0;
const pending = new Map();
function send(method, params = {}) { const id = ++msgId; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve) => pending.set(id, { resolve })); }
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { exceptions++; console.log('  [eval EXC]', (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return undefined; }
  return r.result && r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  shot', name);
}
async function key(code, keyName) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 32 });
  await sleep(40);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 32 });
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); }
  return false;
}
async function waitScene(name, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await ev(`(function(){var g=window.__vortexGame;var s=g&&g.scene.getScene('${name}');return !!(s&&s.sys&&s.sys.settings.active);})()`);
    if (ok) return true;
    await sleep(120);
  }
  return false;
}
async function waitState(pred, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(35); }
  return null;
}
async function godMode() {
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; r.player.invuln=1; },16); return 1; })()`);
}
async function spawnCathedral() {
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  for (let i = 0; i < 80; i++) { if (await ev(`(window.__run.boss.entity||{}).def && window.__run.boss.entity.def.id==='cathedral'`)) break; await sleep(100); }
  await waitState((s) => s === 'maouIntro', 4000);
  await waitState((s) => s && s !== 'maouIntro', 9000);
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__h);return;} var b=r.boss.entity; if(!b) return; r.player.x=b.x-170; r.player.y=b.y+40; },50); return 1; })()`);
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamresult-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });   // localStorage を空から（傷跡の初回/2回目を確かめる）
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', `--remote-debugging-port=${DBG}`, '--window-size=640,360', '--hide-scrollbars',
    `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch { /* */ } });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMRESULT_NG'); process.exit(1); }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { exceptions++; const d = m.params.exceptionDetails; console.log('  [EXC]', d.text, (d.exception && d.exception.description) || ''); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=${SEED}` });
  await sleep(2500);
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMRESULT_NG'); process.exit(1); }
  console.log('  1回目 jamMode =', await ev('window.__run.jamMode'), 'tries =', await ev('window.__run.jamSt.tries'), 'scar =', await ev('window.__run.jamScar'));

  // ---- 1回目：60% まで削って、薔薇窓で死ぬ（死因の記録を確かめる）
  await godMode();
  await spawnCathedral();
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.60); return 1;})()');
  await sleep(300);
  // 無敵を切って、次に当たった攻撃で死ぬ（hp=1）
  await ev('(function(){ clearInterval(window.__g); var r=window.__run; r.player.invuln=0; r.player.hp=1; r._shieldT=0; return 1; })()');
  const ok1 = await waitScene('Result', 25000);
  console.log('  1回目 Result =', ok1, 'cause =', await ev(`(function(){var s=window.__vortexGame.scene.getScene('Result');return s&&s.scene.settings.data&&s.scene.settings.data.jam&&JSON.stringify({v:s.scene.settings.data.jam.verdict.id,c:s.scene.settings.data.jam.stat.deathCause,r:s.scene.settings.data.jam.stat.remainPct,st:s.scene.settings.data.jam.stat.stage,imp:s.scene.settings.data.jam.improved});})()`));
  await sleep(2600); await shot('01-result-death');
  // 2026-09-23 R72：V の直後（0.3秒）＝滑り込み完了＋「当てる光」で自分の行だけ明るい／1.9秒後＝明けて全部読める
  await key('KeyV', 'v'); await sleep(300); await shot('02-result-gallery');
  await sleep(1600); await shot('03-result-gallery-settled');
  await key('KeyV', 'v'); await sleep(300);
  console.log('  localStorage vortex.jam =', await ev("window.localStorage.getItem('vortex.jam')"));
  await key('Space', ' ');
  const back = await waitRun(15000);
  console.log('  SPACE → Run =', back, 'jamMode =', await ev('window.__run.jamMode'), 'tries =', await ev('window.__run.jamSt.tries'), 'scar =', await ev('window.__run.jamScar'));

  // ---- 2回目：傷跡を見る → 越える → 破鐘 → 欠片 → 投げ当てる → 撃破
  await godMode();
  await spawnCathedral();
  await sleep(400); await shot('10-hud-scar');
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.55); return 1;})()');
  await sleep(250); await shot('11-hud-scar-passed');
  console.log('  傷跡を越えた =', await ev('!!window.__run._scarPassed'));
  // 拡大した HUD（ボスのHPバーと刻み）。等倍では2pxの刻みが見えるかを確かめる
  {
    const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 130, y: 22, width: 380, height: 46, scale: 3 } });
    fs.writeFileSync(path.join(OUT, '12-hud-scar-zoom.png'), Buffer.from(r.data, 'base64'));
    console.log('  shot 12-hud-scar-zoom');
  }
  // 聖歌隊：歌っている間の HUD「n/8」と、1体を投げ返した数え
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.50); return 1;})()');
  const choir = await waitState((s) => s === 'choirTele', 40000);
  await waitState((s) => s !== 'choirTele', 3000);
  await sleep(500); await shot('15-choir-hud');
  console.log('  choir =', choir, 'HUD前 =', await ev('JSON.stringify({ret:window.__run.jamSt.choirWaveRet,n:window.__run.jamSt.choirWaveN,alive:window.__run.enemies.filter(function(e){return e.active&&e.choir;}).length})'));
  const grabThrow = (findSrc) => ev(`(async function(){ var r=window.__run; var e=r.enemies.find(${findSrc}); if(!e) return 'no-target';
    clearInterval(window.__h); var b=r.boss.entity; var hp0=b.hp; var k=r.moveKeys;
    e.x=b.x-150; e.y=b.y; r.player.x=e.x; r.player.y=e.y;      // 的（ボス）の左150pxに獲物と主人公を置く
    await new Promise(function(res){setTimeout(res,120);});
    r._jKey.isDown=true;                                       // 掴む（近くのよろけ敵）
    await new Promise(function(res){setTimeout(res,700);});    // 溜め
    k.right.isDown=true;                                       // 狙い＝移動方向（右＝ボス）
    await new Promise(function(res){setTimeout(res,60);});
    r._jKey.isDown=false;                                      // 投げ
    await new Promise(function(res){setTimeout(res,1400);});
    k.right.isDown=false;
    return JSON.stringify({hp0:hp0,hp1:r.boss.entity?r.boss.entity.hp:null,dealt:hp0-(r.boss.entity?r.boss.entity.hp:0),haloHit:r.jamSt.haloHit,grabbed:r.jamSt.haloGrabbed,choirRet:r.jamSt.choirWaveRet,choirBest:r.jamSt.choirBest,best:r.jamSt.best,throws:r.billiard.st.throws}); })()`);
  console.log('  聖歌隊を投げ返し =', await grabThrow('function(q){return q.active&&q.choir&&q.stag;}'));
  await sleep(100); await shot('16-choir-thrown');
  // 破鐘 → 欠片
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.30); return 1;})()');
  const nova = await waitState((s) => s === 'haloNova', 30000);
  console.log('  haloNova =', nova);
  await sleep(600);
  // 欠片の隣へ主人公を置いて撮る（砕けた場所は画面端＝カメラが追っていないことがある）
  await ev(`(function(){ var r=window.__run; clearInterval(window.__h); var e=r.enemies.find(function(q){return q.active&&q.haloPiece;}); if(e){ r.player.x=e.x-60; r.player.y=e.y+10; } return 1; })()`);
  await sleep(250); await shot('20-halo-piece');
  const piece = await ev(`(function(){var e=window.__run.enemies.find(function(q){return q.active&&q.haloPiece;}); return e?JSON.stringify({x:Math.round(e.x),y:Math.round(e.y),stag:!!e.stag,stagT:+e.stagT.toFixed(1),scale:e.baseScale}):null;})()`);
  console.log('  欠片 =', piece);
  console.log('  欠片を投げ返し =', await grabThrow('function(q){return q.active&&q.haloPiece;}'));
  await sleep(200); await shot('21-after-throw');
  // 上限の検算：装甲片（6%）と光輪の欠片（25%）を dealDamage に直接通す（コア命中＝2.4倍込みでも上限で止まるか）
  console.log('  上限 =', await ev(`(function(){ var r=window.__run, b=r.boss.entity; var out={};
    var h0=b.hp; r.dealDamage(b, 5000, 0xffffff, 'manual', {x:b.x,y:b.y,hitR:20,shard:true,grade:0}); out.shard=h0-b.hp;
    h0=b.hp; r.dealDamage(b, 5000, 0xffffff, 'manual', {x:b.x,y:b.y,hitR:20,shard:true,piece:true,grade:3}); out.piece=h0-b.hp;
    out.max=b.maxHp; out.haloHit=r.jamSt.haloHit; out.best=r.jamSt.best; r.jamSt.haloHit=false; r.jamSt.best={dmg:0}; return JSON.stringify(out); })()`));

  // 撃破の裁き
  await ev('(function(){var b=window.__run.boss; if(b.entity) b.onBossKilled(b.entity); return 1;})()');
  const ok2 = await waitScene('Result', 25000);
  console.log('  2回目 Result =', ok2, await ev(`(function(){var s=window.__vortexGame.scene.getScene('Result');var j=s&&s.scene.settings.data&&s.scene.settings.data.jam;return j&&JSON.stringify({v:j.verdict.id,clear:s.scene.settings.data.clear,tries:j.tries,seen:Object.keys(j.seen)});})()`));
  await sleep(3200); await shot('30-result-clear');
  // 2026-09-14 被弾0（the One）を達成した状態の「裁きの一覧」。ユーザー確認用にデスクトップへも出す。
  //   一覧は seen にある id だけ名前が出るので、ここで見えている行＝この回に到達した裁き。
  await ev(`(function(){var s=window.__vortexGame.scene.getScene('Result');var j=s.scene.settings.data.jam;
    return JSON.stringify({hits:j.stat?j.stat.hits:null, v:j.verdict.id, seen:Object.keys(j.seen)});})()`).then((r) => console.log('  一覧の前提:', r));
  await key('KeyV', 'v'); await sleep(300); await shot('31-gallery-theone');
  await sleep(1600); await shot('32-gallery-theone-settled');
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMRESULT_EXC' : 'JAMRESULT_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMRESULT_NG'); process.exit(1); });
