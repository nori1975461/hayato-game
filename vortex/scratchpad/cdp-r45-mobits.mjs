// R45 新モビット3体（マモリン＝命の盾／ドリンゴ＝爆速ドリンク／ネムッコ）の機能実測。
//
// 測るのは「入れたつもり」ではなく**実際に起きたか**：
//   ①ネムッコが軌道神核**以外**では何もしない（配った回数0）／💤 と寝姿が出ている
//   ②マモリンの盾がボス戦で1回だけ張られ、その間の被弾が0
//   ③ドリンゴの薬で移動倍率が実際に1.5倍になる
//   ④軌道神核に入るとネムッコが覚醒し、上限なしで配り続ける
// node vortex/scratchpad/cdp-r45-mobits.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8973, DBG = 9523;
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
async function shot(name) {
  const b64 = await evalJs(`new Promise((res) => window.__vortexGame.renderer.snapshot(
    (img) => res(img.src)))`);
  if (!b64) { console.log('  スクショ失敗: ' + name); return; }
  fs.writeFileSync(path.join(HERE, name), Buffer.from(b64.split(',')[1], 'base64'));
  console.log('  スクショ: ' + name);
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r45')}`, 'about:blank'], { stdio: 'ignore' });

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
      return !!(r&&r.boss&&r.orbit&&r.sys.settings.status>=4&&r.boss.practiceAwaken);})()`);
    if (ok) break;
    await sleep(200);
  }

  // 3体だけのパーティにする（他の仲間が混ざると誰の仕業か分からなくなる）
  const party = await evalJs(`(async function(){
    const m = await import('/vortex/src/data/monsters.js');
    const r = window.__run;
    r.practiceMode = true;
    const ids = ['mamorin', 'doringo', 'nemukko'];
    r.party.length = 0;
    for (const id of ids) r.party.push({ def: m.MONSTERS.find((x) => x.id === id) });
    r.orbit.rebuild();
    r.player.maxHp = 99999; r.player.hp = 99999;
    // 配られた効果をここで数える（本体が呼ぶ入口を包む＝実装と同じ条件式で数える）
    window.__G = { shield: 0, speed: 0, heal: 0, blocks: 0 };
    const gs = r.grantShield.bind(r), gp = r.grantSpeed.bind(r);
    r.grantShield = function(){ window.__G.shield++; return gs.apply(r, arguments); };
    r.grantSpeed  = function(){ window.__G.speed++;  return gp.apply(r, arguments); };
    const ft = r.floatText.bind(r);
    r.floatText = function(x, y, t){ if (/HP|まんたん/.test(t)) window.__G.heal++; return ft.apply(r, arguments); };
    return r.party.map((p) => p.def.name).join('/');
  })()`);
  console.log('パーティ: ' + party);

  // ---- ① ネムッコは軌道神核以外では何もしない（＋寝姿と💤）----
  await sleep(3000);
  const sleepy = await evalJs(`(function(){
    var r = window.__run, o = r.orbit.debugSleepy ? r.orbit.debugSleepy() : null;
    return { g: window.__G, s: o };
  })()`);
  console.log('');
  console.log('① 通常時のネムッコ（3秒観測）');
  console.log(`   配った回数: 盾${sleepy.g.shield} 薬${sleepy.g.speed} 回復${sleepy.g.heal}`
    + `  ← ボス戦の外なので**全部0**が正しい`);
  console.log(`   寝姿: ${JSON.stringify(sleepy.s)}`);
  await shot('r45-sleep-a.png');
  await sleep(4600);   // poseSec 4.5 をまたいで、もう一方の寝姿へ
  await shot('r45-sleep-b.png');

  // ---- ②③ 通常ボス戦：盾は1回だけ／薬で移動倍率1.5 ----
  // ⚠️ ボスは**マオウレクスで通す**。練習モードの片付け（practiceClear）と出し直しを挟むと
  //    カメラの固定解除が間に合わず登場演出が落ちる（実測 TypeError）。第1〜3形態は
  //    ネムッコにとって「軌道神核ではない」ので、そのまま①の続きとして観測できる。
  await evalJs(`(function(){
    var r = window.__run;
    window.__G = { shield: 0, speed: 0, heal: 0, blocks: 0 };
    r.boss.practiceSpawn('maou');
    r.player.maxHp = 140; r.player.hp = 140;
    // 盾の引き金（HP65%以下）を作る。以後も84に固定＝盾が切れても再発動しないことを見る
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e && !r.boss.awakening) e.hp = e.maxHp * 0.9;
      if (r.player.hp > 84) r.player.hp = 84;
    }, 60);
    return true;
  })()`);
  await sleep(18000);
  const boss1 = await evalJs(`(function(){
    var r = window.__run, o = r.orbit.debugSleepy();
    return { g: window.__G, mul: r._speedMul, blocks: r.shieldBlocks || 0, s: o,
             tf: !!r.boss.trueForm };
  })()`);
  console.log('');
  console.log('②③ マオウレクス戦（軌道神核より前・18秒）');
  console.log(`   命の盾      : ${boss1.g.shield}回（ボス戦ごとに1回のみ＝1が正しい）`
    + ` ／ 弾いた回数 ${boss1.blocks}`);
  console.log(`   爆速ドリンク: ${boss1.g.speed}回・移動倍率 ${boss1.mul}（1.5が正しい）`);
  console.log(`   ネムッコ    : ${boss1.s.awake ? '覚醒' : '寝たまま'}`
    + `（軌道神核ではないので**寝たまま**が正しい）・配った回復 ${boss1.g.heal}回`);
  await shot('r45-shield.png');

  // ---- ④ 軌道神核：ネムッコが覚醒し、上限なしで配り続ける ----
  // ⚠️ 転生（practiceAwaken）が通るのは**登場演出の最中だけ**という狭い窓しかない
  //    （終わるまで待つと練習モードではボスが片付き、同フレームだと下地が無くて落ちる）。
  //    ②③でボスを1体消費したあとでは窓が閉じているので、**ページを読み直して**やり直す。
  await send('Page.navigate', { url: URL });
  await sleep(2500);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;
      return !!(r&&r.boss&&r.orbit&&r.sys.settings.status>=4&&r.boss.practiceAwaken);})()`);
    if (ok) break;
    await sleep(200);
  }
  await evalJs(`(async function(){
    const m = await import('/vortex/src/data/monsters.js');
    const r = window.__run;
    r.practiceMode = true;
    r.party.length = 0;
    for (const id of ['mamorin', 'doringo', 'nemukko']) {
      r.party.push({ def: m.MONSTERS.find((x) => x.id === id) });
    }
    r.orbit.rebuild();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__G = { shield: 0, speed: 0, heal: 0 };
    const gs = r.grantShield.bind(r), gp = r.grantSpeed.bind(r);
    r.grantShield = function(){ window.__G.shield++; return gs.apply(r, arguments); };
    r.grantSpeed  = function(){ window.__G.speed++;  return gp.apply(r, arguments); };
    const ft = r.floatText.bind(r);
    r.floatText = function(x, y, t){ if (/HP|まんたん/.test(t)) window.__G.heal++; return ft.apply(r, arguments); };
    r.boss.practiceSpawn('maou');
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e && !r.boss.awakening) e.hp = e.maxHp * 0.9;
      r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  await sleep(1600);
  await evalJs('window.__run.boss.practiceAwaken()');
  for (let i = 0; i < 80; i++) {
    const tf = await evalJs('window.__run.boss.trueForm');
    if (tf) break;
    await sleep(400);
  }
  console.log('');
  console.log('④ 軌道神核へ転生: ' + (await evalJs('window.__run.boss.trueForm') ? 'YES' : 'NO'));
  const wake = await evalJs('window.__run.orbit.debugSleepy()');
  console.log(`   覚醒したか: ${JSON.stringify(wake)}`);
  await shot('r45-awake.png');
  await evalJs('window.__G = { shield: 0, speed: 0, heal: 0 }');
  await sleep(42000);   // everySec 12 なので3回ぶん見える
  const boss2 = await evalJs(`(function(){
    var r = window.__run;
    return { g: window.__G, s: r.orbit.debugSleepy() };
  })()`);
  const total = boss2.g.shield + boss2.g.speed + boss2.g.heal;
  console.log(`   配った回数（42秒）: 盾${boss2.g.shield} 薬${boss2.g.speed} 回復${boss2.g.heal}`
    + `  合計${total}回（12秒ごと＝3回前後が正しい／★上限なし）`);
  console.log(`   見た目: ${JSON.stringify(boss2.s)}`);
  console.log('     ← tex=mon_mezamegami / awake=true / zzz=false / rot=0 が正しい');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
