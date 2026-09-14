// 2026-09-14 振り香炉（配線の鞭）と天啓の「恐れ」の絵を、実プレイの等倍（640×360）で撮る＋実際に鳴った効果音を記録する。
//   天啓＝天の裂け目・落ちてくる光・締まる照準 → 着弾の残り（光の芯・赤熱・昇る粒）→ 3本目（巨大）
//   振り香炉＝予告で肩に振り回す（半径が開き・火が育つ）→ 射出（深紅の閃き）→ 炎の尾 → 命中（割れた鐘の火の輪）
//            → 鎖の届かない所では空振りで地を叩く → 巻き戻し
//   効果音は Sound.sfx を包んで名前と引数を記録する（本編マオウレクスの音・雷鳴が鳴っていないかも数える）。
// 使い方: node scratchpad/jam-fear-shots.mjs [seed] [portOffset]   出力: scratchpad/jam-fear-shots/*.png
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 33);
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'jam-fear-shots');
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
async function shot(name, t) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  const st = await ev('window.__run && window.__run.boss ? window.__run.boss.state : null');
  console.log('  shot', name, `t=${t}ms`, 'state=', st);
}
const RUN_READY = `(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||!r.sys.settings.active||!r.boss||!r.player||!r.moveKeys)return false;window.__run=r;return true;})()`;
async function waitRun(maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { if (await ev(RUN_READY)) return true; await sleep(150); }
  return false;
}
async function waitState(pred, maxMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { const st = await ev('window.__run.boss.state'); if (pred(st)) return st; await sleep(30); }
  return null;
}
// invuln=false でも HP は毎フレーム満タン（命中の絵を撮るため、当たり判定だけは通す）
async function godMode(invuln) {
  await ev(`(function(){ var r=window.__run; if(window.__g)clearInterval(window.__g);
    window.__g=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__g);return;} r.player.hp=r.player.maxHp; ${invuln ? 'r.player.invuln=1;' : ''} },16); return 1; })()`);
}
async function stand(dx, dy) {
  await ev(`(function(){ var r=window.__run; if(window.__h)clearInterval(window.__h);
    window.__h=setInterval(function(){ if(!r.sys.settings.active){clearInterval(window.__h);return;} var b=r.boss.entity; if(!b) return; r.player.x=b.x+(${dx}); r.player.y=b.y+(${dy}); r.player.vx=120; r.player.vy=0; },50); return 1; })()`);
}
async function takeLog() {
  return (await ev('(function(){ var l = window.__sfxLog || []; window.__sfxLog = []; return l; })()')) || [];
}
function summarize(tag, log) {
  const t0 = log.length ? log[0][0] : 0, cnt = {};
  for (const [, n] of log) cnt[n] = (cnt[n] || 0) + 1;
  console.log(`  [${tag}] 鳴った音:`, Object.entries(cnt).map(([n, c]) => `${n}×${c}`).join(' '));
  const keyN = ['censerSwing', 'censerWhirl', 'censerHurl', 'censerSmite', 'censerWhoosh', 'censerReel', 'pillarMark', 'pillarSmite',
    'rocketPunchHit', 'rocketPunchFire', 'wireCannon', 'wireWinch', 'rocketHit', 'thunder', 'pillarWarn', 'pillarFall', 'ironCreak'];
  const lines = log.filter(([, n]) => keyN.includes(n)).map(([t, n, a]) => `${Math.round(t - t0)}ms ${n}${a ? ' ' + a : ''}`);
  if (lines.length) console.log('    ' + lines.join('\n    '));
  return cnt;
}
async function attackShots(name, tag, plan) {
  await takeLog();
  const st = await ev(`window.__run.boss.debugAttack('${name}')`);
  const t0 = Date.now();
  console.log('  攻撃', name, '→', st);
  for (const [at, label] of plan) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    await shot(tag + '-' + label, Date.now() - t0);
  }
  await waitState((s) => s === 'chase', 14000);
  return summarize(tag, await takeLog());
}

async function main() {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-jamfear-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });
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
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('JAMFEAR_NG'); process.exit(1); }
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
  if (!(await waitRun(20000))) { console.log('Run 起動待ちタイムアウト'); console.log('JAMFEAR_NG'); process.exit(1); }
  await godMode(true);
  // ゲームが読み込んだのと同じ URL（importmap の ?v=）で sound.js を開く＝同じ Sound を包める
  const bust = await ev("(function(){var s=document.querySelector('script[type=module]');return s?s.src:'';})()");
  const v = (bust.match(/[?&]v=([^&]+)/) || [])[1] || '';
  console.log('  BUILD(?v=) =', v, ' sfx wrap =', await ev(`import('/vortex/src/audio/sound.js${v ? '?v=' + v : ''}').then(function(m){ var S=m.Sound; if(S.__wrapped) return 'already'; var o=S.sfx; S.sfx=function(n,a,p){ (window.__sfxLog=window.__sfxLog||[]).push([performance.now(), n, (a && typeof a==='object') ? JSON.stringify(a) : (a==null?'':String(a))]); return o.call(this,n,a,p); }; S.__wrapped=true; return 'ok'; })`));
  await ev('(function(){ window.__run.progress = 201; return 1; })()');
  await waitState((s) => s === 'maouIntro', 12000);
  await waitState((s) => s && s !== 'maouIntro', 12000);
  await sleep(1500);
  await stand(-190, 60);
  await sleep(600);

  const cP = await attackShots('pillar', '10-pillar', [[180, 'mark1-early'], [480, 'mark1-late'], [640, 'mark1-flare'], [900, 'fall1-after'],
    [1450, 'mark3-big-early'], [2050, 'mark3-big-late'], [2330, 'big-fall'], [2900, 'big-after']]);
  // 堕天（段階2）へ：配線の鞭は両腕
  await ev('(function(){var b=window.__run.boss.entity; b.hp = Math.round(b.maxHp*0.60); return 1;})()');
  await sleep(2500);
  await waitState((s) => s === 'chase', 12000);
  await takeLog();
  await godMode(false);   // 命中の火の輪を撮るため無敵を外す（HP は毎フレーム満タン）
  const cH = await attackShots('whip', '20-whip-hit', [[200, 'wind-a'], [480, 'wind-b'], [760, 'wind-c'], [930, 'wind-d'], [1090, 'hurl'],
    [1200, 'fly-trail'], [1330, 'smite'], [1600, 'second-arm'], [2050, 'reel']]);
  await godMode(true);
  await stand(-470, 0);   // 鎖（maxLen 360）の届かない所＝空振りで伸び切って地を叩く
  await sleep(700);
  await waitState((s) => s === 'chase', 12000);
  const cM = await attackShots('whip', '30-whip-miss', [[1300, 'extended'], [1900, 'ground-smite'], [2200, 'ground-after']]);

  const bad = ['rocketPunchHit', 'rocketPunchFire', 'wireCannon', 'wireWinch', 'rocketHit', 'rocketPunchFly', 'wireWhoosh', 'thunder', 'pillarWarn', 'pillarFall'];
  const leaked = bad.filter((n) => cP[n] || cH[n] || cM[n]);
  console.log('  本編の音・雷鳴の混入 =', leaked.length ? leaked.join(',') : 'なし');
  console.log('  censerWhirl（命中の回）=', cH.censerWhirl || 0, '／ pillarMark =', cP.pillarMark || 0, '／ pillarSmite =', cP.pillarSmite || 0);
  console.log('  EXCEPTIONS=', exceptions);
  console.log(exceptions ? 'JAMFEAR_EXC' : 'JAMFEAR_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('JAMFEAR_NG'); process.exit(1); });
