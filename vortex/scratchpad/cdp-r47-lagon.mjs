// R47 ラゴン（単独行動する槍使い）の実測。
//
// 測るのは4つ：
//   ①単独行動しているか＝主人公からの距離の分布（公転仲間 48px との差が数で出るか）
//   ②狩り→帰還→肩で息 の往復が実際に回るか（各状態に居た秒数・肩で息の上下）
//   ③何体を「消滅」させたか（＝よろけを経由せず消したか）
//   ④★ラゴンが居ることで**プレイヤーの獲物（よろけ）が減っていないか**
//     ← ここが今回いちばん危ない。R21W2で潰した「仲間が掃除して主人公の獲物が消える」の再発。
//        居る／居ないの2回まわして**引き算**で見る（[[feedback_measure_vfx_by_diff]]）。
// node vortex/scratchpad/cdp-r47-lagon.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8977, DBG = 9527;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=41`;
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
    console.log('  [eval EXC]', (r.exceptionDetails.exception
      && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return undefined;
  }
  return r.result && r.result.value;
}

async function boot() {
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.orbit&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }
}

// パーティを固定して observeSec 秒ぶん観測する。
//   withLagon=true …… スターパピー＋ラゴン
//   withLagon=false … スターパピーだけ（ラゴン抜きの対照）
async function run1(withLagon, observeSec) {
  await boot();
  await evalJs(`(async function(){
    const m = await import('/vortex/src/data/monsters.js');
    const r = window.__run;
    r.party.length = 0;
    r.party.push({ def: m.MONSTERS.find((x) => x.id === 'starpuppy') });
    ${withLagon ? "r.party.push({ def: m.MONSTERS.find((x) => x.id === 'lagon') });" : ''}
    r.orbit.rebuild();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__S = { states: {}, dist: [], huntDist: [], breath: 0, slain: 0, scale: 0,
                   stagSeen: 0, stagNow: [], kills: 0, ticks: 0, sally: 0, bladeOut: 0, backDist: [] };
    const seenStag = new Set();
    window.__w = setInterval(function(){
      const S = window.__S;
      S.ticks++;
      r.player.hp = 99999;
      // よろけ（＝主人公の獲物）の数。**延べ**と**同時**の両方を見る
      let now = 0;
      for (const e of r.enemies) {
        if (!e.active || !e.stag) continue;
        now++;
        if (!seenStag.has(e.id)) { seenStag.add(e.id); S.stagSeen++; }
      }
      S.stagNow.push(now);
      S.kills = r.kills;
      const d = r.orbit.debugLancer && r.orbit.debugLancer();
      if (!d) return;
      S.states[d.state] = (S.states[d.state] || 0) + 1;
      S.dist.push(d.dist);
      // ★状態ごとに分ける。pant は主人公の隣に居るのが正しいので、全部混ぜた平均で
      //   「離れて戦っているか」を判定すると必ず小さく出る（計測器の欠陥になる）。
      if (d.state === 'hunt') S.huntDist.push(d.dist);
      if (d.sally) S.sally++;
      if (d.blade > 0.5) S.bladeOut++;
      if (d.state === 'back') S.backDist.push(d.dist);
      S.breath = Math.max(S.breath, Math.abs(d.breath));
      S.slain = d.slain;
      S.scale = d.scale;
    }, 100);
    return true;
  })()`);
  await sleep(observeSec * 1000);
  return await evalJs('window.__S');
}

const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r47')}`, 'about:blank'], { stdio: 'ignore' });

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

  const SEC = 90;
  const A = await run1(true, SEC);
  const B = await run1(false, SEC);

  const secs = (n) => (n * 0.1).toFixed(1);
  console.log(`\n① 単独行動（${SEC}秒・スターパピー＋ラゴン）`);
  console.log(`   主人公からの距離  全体 平均 ${avg(A.dist).toFixed(1)}px / 最大 ${Math.max(...A.dist).toFixed(1)}px`);
  console.log(`   ★狩っている間だけ  平均 ${avg(A.huntDist).toFixed(1)}px / 最大 ${Math.max(...A.huntDist).toFixed(1)}px`
    + ` / 100px超が ${(A.huntDist.filter((d) => d > 100).length / A.huntDist.length * 100).toFixed(1)}%`);
  console.log('   ← 公転仲間はつねに 48px。狩りの上限は 150px（画面内）');
  console.log(`   表示スケール ${A.scale}（通常のモビットは 2.5）`);

  console.log(`\n② 狩り→帰還→肩で息 の往復`);
  for (const k of ['hunt', 'back', 'pant']) {
    console.log(`   ${k.padEnd(5)} ${secs(A.states[k] || 0)}秒`);
  }
  console.log(`   うち 出撃（前線へ駆ける） ${secs(A.sally)}秒`);
  console.log(`   帰り道の距離 平均 ${avg(A.backDist).toFixed(1)}px`);
  console.log(`   肩で息の上下の最大 ${A.breath}px（0だと画面では休んでいるように見えない）`);
  console.log(`   ★刃が出ている時間 ${secs(A.bladeOut)}秒 / ${secs(A.ticks)}秒`
    + `（狩っている間だけ点火＝休憩中に槍を構えたままにしない）`);

  console.log(`\n③ 消滅させた数  ${A.slain}体`);

  console.log(`\n④ プレイヤーの獲物（よろけ）が減っていないか＝ラゴン有無の引き算`);
  console.log(`   ラゴン あり： よろけ延べ ${A.stagSeen}体 / 同時平均 ${avg(A.stagNow).toFixed(2)}体 / 撃破 ${A.kills}`);
  console.log(`   ラゴン なし： よろけ延べ ${B.stagSeen}体 / 同時平均 ${avg(B.stagNow).toFixed(2)}体 / 撃破 ${B.kills}`);
  const drop = B.stagSeen ? (1 - A.stagSeen / B.stagSeen) * 100 : 0;
  console.log(`   → ラゴンが居ると獲物が ${drop.toFixed(1)}% 減る`);
  console.log('     （大きく減るなら狩りの範囲・頻度を絞る。動詞＝掴んで投げる を奪ってはいけない）');

  console.log('\nEXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
