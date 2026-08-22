// R22 回復モビット「マシュモ」の検証。
//
// 実プレイFB「体力を少しずつ回復してくれるモビットをいれて」。
// 機能が動くかだけでは足りない（過去の失敗：拳が主武器のはずが実プレイで殴り0回／必殺技が84秒に1回）。
// 「自然なプレイで実際に何回働くか」まで測る。
//
//   H1 編成に入れたとき、実際に回復が起きるか（回数・合計HP・HP毎秒）
//   H2 満タンのときに無駄撃ちしていないか（光は出すがHPは動かさない設計どおりか）
//   H3 自然プレイで、マシュモのコアがどれくらい落ちるか（＝出会えるのか）
//   H4 実行時例外ゼロ／回復の光の帯が描画されるか
//
// node vortex/scratchpad/cdp-r22-heal.mjs [seed] [秒]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8859, DBG = 9409;
const SEED = process.argv[2] || '42';
const RUN_SEC = Number(process.argv[3] || 60);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

let ws, msgId = 0;
const pending = new Map();
const exceptions = [];
function send(method, params = {}) {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, { resolve }));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    console.log('  [EXC]', r.exceptionDetails.text,
      (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '');
    return undefined;
  }
  return r.result && r.result.value;
}

// FORCE=1 のとき、開始編成の1体をマシュモに差し替えて「入れたら効くか」を測る。
// FORCE=0 のときは触らず、自然プレイでどれだけ出会えるかを測る。
const INSTALL = (force) => `(function(){
  var g = window.__vortexGame; if(!g) return 'no game';
  var r = g.scene.getScene('Run'); if(!r) return 'no run';
  if (r.__heal) return 'already';
  r.__heal = true;

  var B = window.__B = { frames: 0, ticks: 0, healed: 0, wasted: 0, fxFrames: 0,
                         cores: 0, mashumoCores: 0, t0: r.elapsed };

  if (${force ? 1 : 0}) {
    var M = r.__MONSTERS;
    if (M) {
      var def = null;
      for (var i=0;i<M.length;i++) if (M[i].id === 'mashumo') def = M[i];
      if (!def) return 'no mashumo';
      r.party[r.party.length-1] = { def: def };
      r.orbit.rebuild();
    } else return 'no MONSTERS';
  }

  // H3: マシュモのコアが落ちた回数（capture 側の makeCore は非公開なので配列を毎フレーム見る）
  var seenCores = new Set();

  // H1/H2: HPの増分は player.hp を直接見る。ゲーム本体と同じ観測点なので取りこぼさない。
  var origGems = r.updateGems.bind(r);
  var lastHp = r.player.hp;
  r.updateGems = function(dt){
    B.frames++;
    var hp = r.player.hp;
    if (hp > lastHp) B.healed += (hp - lastHp);   // 回復ハート／ジェル回復も混ざるので下で切り分ける
    lastHp = hp;
    var orbs = r.orbit && r.orbit.orbs ? r.orbit.orbs : [];
    for (var i=0;i<orbs.length;i++){
      var o = orbs[i];
      if (o && o.archetype === 'HEAL' && o.healFx && o.healFx.visible) B.fxFrames++;
    }
    var cs = (r.capture && r.capture.cores) || [];
    for (var j=0;j<cs.length;j++){
      var c = cs[j];
      if (!c || !c.def) continue;
      if (!c.__id) c.__id = 'c' + (++B.cores);
      if (!seenCores.has(c.__id)) {
        seenCores.add(c.__id);
        if (c.def.id === 'mashumo') B.mashumoCores++;
      }
    }
    return origGems(dt);
  };

  // ボット：獲物を掴んで投げる＋ジェムを追う（既存スクリプトと同じ動き）
  var origFist = r.updateHeroFist.bind(r);
  r.updateHeroFist = function(dt){
    origFist(dt);
    var bs = r.billiard.st, px = r.player.x, py = r.player.y;
    if (r._jKey) {
      if (bs.held) r._jKey.isDown = bs.chargeT < 0.5;
      else if (!bs.wind) r._jKey.isDown = true;
    }
    var kk = r.moveKeys; if (!kk) return;
    kk.left.isDown = kk.right.isDown = kk.up.isDown = kk.down.isDown = false;
    kk.a.isDown = kk.d.isDown = kk.w.isDown = kk.s.isDown = false;
    var tx=null, ty=null, bg=1e9;
    var gems = r.gems || [];
    for (var gi=0; gi<gems.length; gi++){ var gm=gems[gi]; if(!gm||!gm.active) continue;
      var dd=(gm.x-px)*(gm.x-px)+(gm.y-py)*(gm.y-py); if(dd<bg){bg=dd;tx=gm.x;ty=gm.y;} }
    var cs2 = (r.capture && r.capture.cores) || [];
    for (var ci=0; ci<cs2.length; ci++){ var co=cs2[ci]; if(!co) continue;
      var cd=(co.x-px)*(co.x-px)+(co.y-py)*(co.y-py); if(cd<bg){bg=cd;tx=co.x;ty=co.y;} }
    if (tx==null) return;
    var ddx=tx-px, ddy=ty-py;
    if (ddx < -4) kk.left.isDown = true; else if (ddx > 4) kk.right.isDown = true;
    if (ddy < -4) kk.up.isDown = true;   else if (ddy > 4) kk.down.isDown = true;
  };
  return 'ok';
})()`;

async function run(force, label) {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=${SEED}` });
  await sleep(3500);
  // MONSTERS をシーンから触れるようにする（本体は import しか公開していないため）
  await evalJs(`import('/vortex/src/data/monsters.js').then(function(m){
    var r = window.__vortexGame.scene.getScene('Run'); if (r) r.__MONSTERS = m.MONSTERS;
  }), true`);
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})),
                window.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})), true`);
  await sleep(900);
  await evalJs(`import('/vortex/src/data/monsters.js').then(function(m){
    var r = window.__vortexGame.scene.getScene('Run'); if (r) r.__MONSTERS = m.MONSTERS;
  }), true`);
  await sleep(300);
  const inst = await evalJs(INSTALL(force));
  if (inst !== 'ok') { console.log(`${label}: INSTALL_FAILED=` + inst); return null; }

  const t0 = Date.now();
  let shot = false;
  while (Date.now() - t0 < RUN_SEC * 1000) {
    await sleep(1000);
    const alive = await evalJs(`(function(){var r=window.__vortexGame.scene.getScene('Run'); return r && !r.ended;})()`);
    if (!alive) break;
    // 回復の光が出ている瞬間を1枚だけ撮る（実プレイの等倍でスプライトと帯を目視するため）
    if (force && !shot) {
      const lit = await evalJs(`(function(){
        var r = window.__vortexGame.scene.getScene('Run');
        var os = (r.orbit && r.orbit.orbs) || [];
        for (var i=0;i<os.length;i++) if (os[i] && os[i].archetype==='HEAL' && os[i].healFx && os[i].healFx.visible) return 1;
        return 0; })()`);
      if (lit) {
        const png = await send('Page.captureScreenshot', { format: 'png' });
        if (png && png.data) {
          fs.writeFileSync(path.join(HERE, 'r22-heal-mashumo.png'), Buffer.from(png.data, 'base64'));
          shot = true;
        }
      }
    }
  }
  return await evalJs(`(function(){
    var r = window.__vortexGame.scene.getScene('Run'), B = window.__B;
    var orbs = (r.orbit && r.orbit.orbs) || [], heal = null;
    for (var i=0;i<orbs.length;i++) if (orbs[i] && orbs[i].archetype === 'HEAL') heal = orbs[i];
    var names = [];
    for (var j=0;j<r.party.length;j++) names.push(r.party[j].def.name);
    return { sec: Math.round((r.elapsed - B.t0)*10)/10, frames: B.frames, healed: Math.round(B.healed*10)/10,
             fxFrames: B.fxFrames, mashumoCores: B.mashumoCores, cores: B.cores,
             party: names.join('/'), alive: !r.ended, hp: Math.round(r.player.hp), maxHp: r.player.maxHp,
             healSec: heal ? Math.round(heal.healSec*100)/100 : null,
             healAmount: heal ? Math.round(heal.healAmount*100)/100 : null };
  })()`);
}

async function main() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url || '/').split('?')[0]);
    const f = path.join(ROOT, u.replace(/^\/+/, ''));
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
                           'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(PORT, r));

  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-heal')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 150 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error(`CDP のページが見つからない（ポート ${DBG}）`);
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      exceptions.push((m.params.exceptionDetails.text || '') +
        ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
    }
    if (m.id && pending.has(m.id)) { const { resolve } = pending.get(m.id); pending.delete(m.id); resolve(m.result || {}); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  console.log('===== R22 回復モビット「マシュモ」検証 (seed=' + SEED + ') =====');

  const A = await run(true, '編成に入れた場合');
  if (A) {
    console.log('\n--- H1 編成に入れたとき、実際に回復するか ---');
    console.log(`  編成: ${A.party}`);
    console.log(`  回復の設定値: ${A.healAmount} HP / ${A.healSec} 秒 = ${(A.healAmount / A.healSec).toFixed(2)} HP毎秒`);
    console.log(`  ${A.sec}秒で 回復した合計HP=${A.healed}（ジェル回復・回復ハートを含む総量）`);
    console.log(`  最終HP=${A.hp}/${A.maxHp} 生存=${A.alive}`);
    console.log('\n--- H4 回復の光の帯が描画されているか ---');
    console.log(`  帯が見えていたフレーム=${A.fxFrames} / 全${A.frames}フレーム → ${A.fxFrames > 0 ? 'OK' : 'NG'}`);
  }

  const C = await run(false, '自然プレイ');
  if (C) {
    console.log('\n--- H3 自然プレイでマシュモに出会えるか ---');
    console.log(`  ${C.sec}秒で 落ちたコア=${C.cores}個 / うちマシュモ=${C.mashumoCores}個`);
    console.log(`  最終編成: ${C.party}`);
    console.log(`  → ${C.mashumoCores > 0 ? 'OK（出会える）' : '要確認（この尺では出会えなかった）'}`);
  }

  console.log(`\nEXCEPTIONS=${exceptions.length}`);
  for (const e of exceptions.slice(0, 4)) console.log('  ' + e);
  try { ws.close(); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
