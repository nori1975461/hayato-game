// R33 実測：ビリッコが配る弾3種が**画面で本当に起きているか**。
//
// 設定値は読まない。観測可能な結果だけで判定する：
//   らいこうだん   … ボスのHPが最大HPの約30%減ったか
//   スーパーボール … 実際に何回跳ね返ったか（＝数えられる形になっているか）
//   ブラックホール … 敵が実際に穴へ寄ったか／閉じたときに何体が弾になったか
//
// node vortex/scratchpad/cdp-r33-bullets.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8914, DBG = 9464;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=11`;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r33b')}`, 'about:blank'], { stdio: 'ignore' });

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
  await sleep(2000);

  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    ready = await evalJs(`(function(){var g=window.__vortexGame;if(!g)return false;
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.billiard&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [], OK = [];
  const say = (s) => { console.log(s); REP.push(s); };
  const check = (name, pass, detail) => { OK.push(pass); say((pass ? '  ok  ' : '  NG  ') + name + '  ' + detail); };

  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;                      // 時間で勝手にボスが出てこないように
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 40);
    // 手渡された弾をその場で投げるヘルパ（本編と同じ経路：押す→離す）
    window.__throw = async function(kind, dir) {
      var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
      r.billiard.giveAmmo(null, kind);
      for (var i = 0; i < 120 && !(r.billiard.st.held && r.billiard.st.held.spec === kind); i++) await wait(50);
      if (!r.billiard.st.held) return false;
      var cam = r.cameras.main;
      if (r.input.activePointer) {
        r.input.activePointer.x = (r.player.x + Math.cos(dir) * 300) - cam.scrollX;
        r.input.activePointer.y = (r.player.y + Math.sin(dir) * 300) - cam.scrollY;
        r._pointerMoveT = r.elapsed;
      }
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      await wait(120);
      window.dispatchEvent(new KeyboardEvent('keyup',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      return true;
    };
    return true;
  })()`);

  // ---------- ① 3種すべてが受け取れて、指定どおりの弾が手に入るか ----------
  const handed = await evalJs(`(async function(){
    var r = window.__run, out = {};
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    var kinds = ['bolt', 'superball', 'blackhole'];
    for (var i = 0; i < kinds.length; i++) {
      r.billiard.st.held = null; r.billiard.st.handover = null;
      r.billiard.giveAmmo(null, kinds[i]);
      var ok = false;
      for (var t = 0; t < 120 && !ok; t++) {
        await wait(50);
        ok = !!(r.billiard.st.held && r.billiard.st.held.spec === kinds[i]);
      }
      out[kinds[i]] = ok ? '受け取れた' : '受け取れない';
      r.billiard.st.held = null;
    }
    return out;
  })()`);
  say('【① 手渡し3種】' + JSON.stringify(handed));
  check('3種すべてを受け取れる',
    handed && handed.bolt === '受け取れた' && handed.superball === '受け取れた'
      && handed.blackhole === '受け取れた', JSON.stringify(handed));

  // ---------- ② スーパーボールだん：本当に跳ね返るか ----------
  const sb = await evalJs(`(async function(){
    var r = window.__run;
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    r.billiard.st.bestBounce = 0; r.billiard.st.superHits = 0;
    // 群れを用意する（跳ね先が無ければ跳ねようがない）。
    // ⚠️ 湧きは遠い（300〜400px）ので、寄ってくるまで待たないと「散らばった場」で測ることになり、
    //    同じコードでも 3回 と 14回 のあいだで結果が揺れる（実測で踏んだ）。
    for (var i = 0; i < 24; i++) {
      var nearCount = r.enemies.filter(function(e){ return e.active && !e.isBoss && !e.stag
        && Math.hypot(e.x - r.player.x, e.y - r.player.y) < 360; }).length;
      if (nearCount >= 16) break;
      r.spawner.spawnBurst(12);
      await wait(400);
    }
    var before = r.enemies.filter(function(e){ return e.active && !e.isBoss; }).length;
    // ⚠️ 決め打ちの方向（右）へ投げたら35体いても1体も当たらなかった。
    //    測りたいのは命中率ではなく「当たったあと跳ね返るか」なので、必ず一番近い敵へ向ける。
    var near = r.enemies.filter(function(e){ return e.active && !e.isBoss; })
      .sort(function(a, b){
        return Math.hypot(a.x - r.player.x, a.y - r.player.y)
             - Math.hypot(b.x - r.player.x, b.y - r.player.y); })[0];
    var ang = near ? Math.atan2(near.y - r.player.y, near.x - r.player.x) : 0;
    await window.__throw('superball', ang);
    await wait(4000);
    var after = r.enemies.filter(function(e){ return e.active && !e.isBoss; }).length;
    return { 場にいた雑魚: before, なげたあと: after, たおした: before - after,
             はねかえり回数: r.billiard.st.bestBounce, あてた回数: r.billiard.st.superHits };
  })()`);
  say('【② スーパーボールだん】' + JSON.stringify(sb));
  check('スーパーボールだん：跳ね返って何度も当たる',
    sb && sb.はねかえり回数 >= 6 && sb.あてた回数 >= 6,
    (sb && sb.はねかえり回数) + '回はねて ' + (sb && sb.たおした) + '体たおした');

  // ---------- ③ ブラックホールだん：敵が本当に寄るか・弾になるか ----------
  const bh = await evalJs(`(async function(){
    var r = window.__run;
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    r.billiard.st.holeStaggers = 0; r.billiard.st.holeHits = 0;
    // ⚠️ ②のスーパーボールが場を掃除してしまうので、測る前に群れを作り直す。
    //    しかも湧きは遠い（300〜400px）ので、寄ってくるまで待たないと空振りで測ってしまう。
    for (var i = 0; i < 24; i++) {
      var nearCount = r.enemies.filter(function(e){ return e.active && !e.isBoss && !e.stag
        && Math.hypot(e.x - r.player.x, e.y - r.player.y) < 360; }).length;
      if (nearCount >= 16) break;
      r.spawner.spawnBurst(12);
      await wait(400);
    }
    var near = r.enemies.filter(function(e){ return e.active && !e.isBoss; })
      .sort(function(a, b){
        return Math.hypot(a.x - r.player.x, a.y - r.player.y)
             - Math.hypot(b.x - r.player.x, b.y - r.player.y); })[0];
    var ang = near ? Math.atan2(near.y - r.player.y, near.x - r.player.x) : 0;
    await window.__throw('blackhole', ang);
    // ⚠️「主人公からの距離が縮んだか」で吸い込みを測ってはいけない。敵はもともと主人公を
    //    追ってくるので、穴が無くても縮む（前回それで28体が"寄った"と誤検出した）。
    //    穴の中心からの距離を、穴が生きているあいだに測る。
    // 穴が生きているあいだ、追跡中の敵の「穴からの距離」を毎回上書きしていく。
    // 閉じる瞬間を捉えられなくても、最後に見えた値と最初の値で比べられる。
    var maxHoles = 0, hx = null, hy = null, dBefore = null, dLast = null, seen = false;
    for (var t = 0; t < 150; t++) {
      var hs = r.billiard.st.holes;
      maxHoles = Math.max(maxHoles, hs.length);
      if (hs.length) {
        seen = true;
        if (hx == null) {
          hx = hs[0].x; hy = hs[0].y;
          dBefore = r.enemies.filter(function(e){ return e.active && !e.isBoss
              && Math.hypot(e.x - hx, e.y - hy) < 240; })
            .map(function(e){ return { id: e.id, d: Math.hypot(e.x - hx, e.y - hy) }; });
        }
        var m = {};
        r.enemies.forEach(function(e){ if (e.active) m[e.id] = Math.hypot(e.x - hx, e.y - hy); });
        dLast = m;
      } else if (seen) break;
      await wait(60);
    }
    var pulled = 0, checked = 0;
    (dBefore || []).forEach(function(b){
      var a = dLast && dLast[b.id];
      if (a == null) return;
      checked++;
      if (a < b.d - 40) pulled++;                   // 穴の中心へ40px以上寄った
    });
    // ★この弾の成果は「倒した数」ではなく**穴のまわりに弾（よろけ敵）が何体集まったか**。
    //   新しくよろけさせた数だけを見ると、直前の測定で既によろけていた敵が数から漏れる。
    var ammoNear = r.enemies.filter(function(e){ return e.active && !e.isBoss && e.stag
      && Math.hypot(e.x - hx, e.y - hy) < 260; }).length;
    return { ひらいた穴: maxHoles, 範囲内にいた敵: (dBefore || []).length,
             生き残って測れた敵: checked, 穴へ寄った敵: pulled,
             あつまった弾: ammoNear,
             あらたによろけた数: r.billiard.st.holeStaggers, あてた回数: r.billiard.st.holeHits };
  })()`);
  say('【③ ブラックホールだん】' + JSON.stringify(bh));
  check('ブラックホールだん：敵に当たって穴が開く',
    bh && bh.ひらいた穴 >= 1 && bh.あてた回数 >= 1,
    '穴 ' + (bh && bh.ひらいた穴) + ' / 命中 ' + (bh && bh.あてた回数));
  check('ブラックホールだん：敵が穴へ吸い寄せられる',
    bh && bh.生き残って測れた敵 > 0 && bh.穴へ寄った敵 >= bh.生き残って測れた敵 * 0.5,
    (bh && bh.穴へ寄った敵) + '/' + (bh && bh.生き残って測れた敵) + '体');
  check('ブラックホールだん：穴のまわりに弾が集まる', bh && bh.あつまった弾 >= 5,
    (bh && bh.あつまった弾) + '体の弾が 穴のまわりに（うち あらたに '
      + (bh && bh.あらたによろけた数) + '体）');

  // ---------- ④ らいこうだん：ボスへの効きが変わっていないか（回帰確認）----------
  const bolt = await evalJs(`(async function(){
    var r = window.__run;
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    r.boss.practiceSpawn('korotama');
    for (var k = 0; k < 100 && !(r.boss.active && r.boss.entity); k++) await wait(100);
    if (!r.boss.entity) return { ボスが出なかった: true };
    await wait(3000);
    var e = r.boss.entity;
    e.hp = e.maxHp;
    var max = e.maxHp;
    var ang = Math.atan2(e.y - r.player.y, e.x - r.player.x);
    // 的を真横に置く（当てるのが目的ではなく、当たったときの削り量を見るため）
    var pin = setInterval(function(){
      var b = r.boss.entity; if (!b) return;
      b.x = r.player.x + 90; b.y = r.player.y;
    }, 16);
    await window.__throw('bolt', 0);
    await wait(2500);
    clearInterval(pin);
    var now = r.boss.entity ? r.boss.entity.hp : 0;
    return { ボスのmaxHp: max, へったHP: max - now,
             わりあい: Math.round(((max - now) / max) * 100) + '%' };
  })()`);
  say('【④ らいこうだん（回帰確認）】' + JSON.stringify(bolt));
  check('らいこうだん：ボスの最大HPの約3割を1発で削る（従来どおり）',
    bolt && bolt.へったHP > 0 && (bolt.へったHP / bolt.ボスのmaxHp) >= 0.25
      && (bolt.へったHP / bolt.ボスのmaxHp) <= 0.45,
    bolt && bolt.わりあい);

  const ng = OK.filter((x) => !x).length;
  say('');
  say(ng === 0 ? `弾3種：${OK.length}/${OK.length} 合格` : `⚠️ ${ng} 件 NG`);
  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r33-bullets.txt'),
    REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(ng === 0 && exceptions === 0 ? 0 : 1);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
