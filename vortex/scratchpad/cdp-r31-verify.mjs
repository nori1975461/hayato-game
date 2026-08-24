// R31 実測：①弱点コアの判定円の不一致（バグ修正）／②BGM／③ミサイル／④ロケットパンチ。
//
// ① は**同じ1回のラン**の中で旧判定(コア半径だけ)と新判定(コア半径＋玉の半径)を両方数える
//    ＝対照実験。「直したら速くなった」ではなく「旧実装なら何%が0ダメージで砕けていたか」を出す。
// ② は設定値ではなく**実際に鳴った音の周波数**を拾って、長三和音(C / A)が本当に鳴っているかを見る。
// ③④ は効果音の呼び出し回数と、弾の実速度（px/秒）を画面から数える。
//
// 順番が大事：先に「倒さずに攻撃を受ける」段を回す。先に倒すとランが終わってボスが出せなくなる。
//
// node vortex/scratchpad/cdp-r31-verify.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8901, DBG = 9451;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=42`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31v')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;window.__G=g;return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // ---------- 計測器 ----------
  // 効果音: ES モジュールは同一インスタンスがキャッシュされるので、動的 import で掴んだ
  //   Sound オブジェクトを差し替えれば boss.js の呼び出しもこちらを通る。
  const wrapOk = await evalJs(`(async function(){
    window.__M = { sfx: {}, missileSpd: [], core: [], freqs: [], recFreq: false };
    var mod = await import('/vortex/src/audio/sound.js');
    var S = mod.Sound;
    window.__S = S;
    var orig = S.sfx.bind(S);
    S.sfx = function(n, a, p) { window.__M.sfx[n] = (window.__M.sfx[n] || 0) + 1; return orig(n, a, p); };
    // 鳴った音の周波数を拾う（BGMの和音が本当に変わったかを設定値でなく音で見る）
    var AC = window.AudioContext || window.webkitAudioContext;
    var oc = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function() {
      var osc = oc.call(this);
      var sv = osc.frequency.setValueAtTime.bind(osc.frequency);
      osc.frequency.setValueAtTime = function(v, t) {
        if (window.__M.recFreq) window.__M.freqs.push(Math.round(v));
        return sv(v, t);
      };
      return osc;
    };
    return true;
  })()`);
  say('計測器を取り付けた（効果音＋周波数）: ' + wrapOk);

  // dealDamage を包み、コア命中の距離を記録（旧判定と新判定を同じ命中で比較する）
  await evalJs(`(function(){
    var r = window.__run;
    var od = r.dealDamage.bind(r);
    r.dealDamage = function(e, dmg, color, src, at) {
      var w = null;
      try { if (e && e.isBoss && r.boss && r.boss.weakPoint) w = r.boss.weakPoint(e); } catch (x) {}
      var before = e ? e.hp : 0;
      var out = od(e, dmg, color, src, at);
      if (w && src === 'manual' && at && at.x != null && at.hitR != null) {
        var d = Math.hypot(at.x - w.x, at.y - w.y);
        window.__M.core.push({ d: Math.round(d), coreR: w.r, ballR: Math.round(at.hitR),
                               oldPass: d <= w.r, newPass: d <= w.r + at.hitR,
                               dealt: Math.max(0, before - e.hp) });
      }
      return out;
    };
    return true;
  })()`);

  // ---------- 段階A: ②BGM（ボスを出す前に、曲だけ鳴らして音を拾う）----------
  // 84BPM・8小節 ＝ 16分音符128ステップ × (60/84/4=0.1786秒) ≒ 22.9秒で1周。
  const bgm = await evalJs(`(async function(){
    var S = window.__S;
    window.__M.freqs = [];
    S.bgm('maou');
    window.__M.recFreq = true;
    await new Promise(function(res){ setTimeout(res, 24000); });   // 1周ぶん
    window.__M.recFreq = false;
    var fs = window.__M.freqs;
    // 平均律で最寄りの音名へ丸める（A4=440基準）
    var NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    var set = {};
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i]; if (f < 40 || f > 4200) continue;
      var n = Math.round(12 * Math.log2(f / 440));
      var nm = NAMES[((n + 9) % 12 + 12) % 12];
      set[nm] = (set[nm] || 0) + 1;
    }
    return { 鳴った音の総数: fs.length, 音名ごとの回数: set,
             'Cメジャーの構成音(C_E_G)が鳴った': !!(set.C && set.E && set.G),
             'Aメジャーの構成音(A_C#_E)が鳴った': !!(set.A && set['C#'] && set.E),
             'C#(ピカルディ終止の第3音)': set['C#'] || 0 };
  })()`);
  say('【②BGM】実際に鳴った音: ' + JSON.stringify(bgm));

  // ---------- 主人公を実プレイ相当まで育てる（自然プレイ実測: 360秒でレベル27）----------
  const power = await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 60 && r.level < 27; i++) { try { r.levelup.addXp(200); } catch (e) { break; } }
    r.elapsed = 360.4;
    return { レベル: r.level, heroMult: +(r.stats.heroMult || 1).toFixed(2) };
  })()`);
  say('主人公の強さ（自然プレイ360秒の実測に合わせた）: ' + JSON.stringify(power));

  // ---------- 段階B: ③④（倒さずに攻撃を受ける側にまわる）----------
  const atk = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    b.practiceSpawn('maou');
    for (var k = 0; k < 200 && b.state === 'maouIntro'; k++) await new Promise(function(res){ setTimeout(res, 50); });
    if (!b.entity) return { マオウレクスが出なかった: true };
    window.__M.sfx = {}; window.__M.missileSpd = [];
    // HPを毎フレーム満タンに戻す＝倒さない（攻撃をひととおり見るため）。主人公も死なせない。
    if (window.__pin) clearInterval(window.__pin);
    window.__pin = setInterval(function(){
      if (b.entity) b.entity.hp = b.entity.maxHp;
      if (r.player) r.player.hp = r.player.maxHp;
    }, 16);
    var t0 = Date.now(), hurt = 0, seen = {};
    while (Date.now() - t0 < 100000) {
      try {
        var bl = b.debugBullets ? b.debugBullets() : [];
        for (var i = 0; i < bl.length; i++) {
          if (bl[i].kind === 'missile') window.__M.missileSpd.push(Math.round(Math.hypot(bl[i].vx, bl[i].vy)));
        }
      } catch (x) {}
      seen[b.state] = (seen[b.state] || 0) + 1;
      var ph = (Date.now() - t0) / 900;
      r.player.x += Math.cos(ph) * 1.7; r.player.y += Math.sin(ph * 1.3) * 1.7;
      await new Promise(function(res){ setTimeout(res, 30); });
    }
    clearInterval(window.__pin);
    var sp = window.__M.missileSpd.slice().sort(function(p,q){ return p-q; });
    return { 観測秒: 100,
             ミサイルの実速度_最大: sp.length ? sp[sp.length-1] : -1,
             ミサイルの実速度_中央値: sp.length ? sp[Math.floor(sp.length/2)] : -1,
             ミサイルのサンプル数: sp.length,
             通った状態: seen,
             鳴った効果音: window.__M.sfx };
  })()`);
  say('【③④攻撃】: ' + JSON.stringify(atk, null, 1));

  // ---------- 段階C: ①コア判定（HPを固定したまま60秒殴り、命中を数で稼ぐ）----------
  const core = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    if (!b.entity) { b.practiceSpawn('maou'); await new Promise(function(res){ setTimeout(res, 2500); }); }
    window.__M.core = [];
    if (window.__pin2) clearInterval(window.__pin2);
    window.__pin2 = setInterval(function(){
      if (b.entity) b.entity.hp = b.entity.maxHp;
      if (r.player) r.player.hp = r.player.maxHp;
    }, 16);
    var kd = function(k){ window.dispatchEvent(new KeyboardEvent(k,
      { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true })); };
    // 人間の照準は毎フレーム完璧ではないので、狙点に±26pxのぶれを乗せる（決定的な擬似乱数）
    var seed = 12345;
    var rnd = function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x3fffffff) - 1; };
    var t0 = Date.now();
    while (Date.now() - t0 < 70000) {
      var en = b.entity; if (!en) break;
      var w = b.weakPoint(en);
      var dx = en.x - r.player.x, dy = en.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 130) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x + rnd() * 26 - cam.scrollX;
        r.input.activePointer.y = w.y + rnd() * 26 - cam.scrollY;
        r._pointerMoveT = r.elapsed;
      }
      kd('keydown'); await new Promise(function(res){ setTimeout(res, 70); });
      kd('keyup');   await new Promise(function(res){ setTimeout(res, 40); });
    }
    clearInterval(window.__pin2);
    var a = window.__M.core, n = a.length;
    var oldOk = a.filter(function(x){ return x.oldPass; }).length;
    var newOk = a.filter(function(x){ return x.newPass; }).length;
    var dealt0 = a.filter(function(x){ return x.newPass && x.dealt === 0; }).length;
    var ds = a.map(function(x){ return x.d; }).sort(function(p,q){ return p-q; });
    return { コアに当たった回数: n, 旧実装で通った: oldOk, 修正後に通った: newOk,
             旧実装なら0ダメージだった割合: newOk ? Math.round((1 - oldOk / newOk) * 100) + '%' : '-',
             命中距離の中央値: n ? ds[Math.floor(n/2)] : -1,
             玉の半径: n ? a[0].ballR : -1, コア半径: n ? a[0].coreR : -1,
             修正後に0ダメージで砕けた回数: dealt0 };
  })()`);
  say('【①コア判定】旧実装との対照（HP固定・70秒）: ' + JSON.stringify(core));

  // ---------- 段階D: 実際の撃破タイム（HP固定を外して倒しきる）----------
  const kill = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    if (!b.entity) return { ボスがいない: true };
    if (window.__god) clearInterval(window.__god);
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 16);
    var e = b.entity, hp0 = e.hp, maxHp = e.maxHp, t0 = r.elapsed;
    var kd = function(k){ window.dispatchEvent(new KeyboardEvent(k,
      { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true })); };
    var seed = 999;
    var rnd = function(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x3fffffff) - 1; };
    var end = Date.now() + 90000;
    while (Date.now() < end && b.active) {
      var en = b.entity; if (!en) break;
      var w = b.weakPoint(en);
      var dx = en.x - r.player.x, dy = en.y - r.player.y, d = Math.hypot(dx, dy) || 1;
      if (d > 130) { r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4; }
      if (w && r.input.activePointer) {
        var cam = r.cameras.main;
        r.input.activePointer.x = w.x + rnd() * 26 - cam.scrollX;
        r.input.activePointer.y = w.y + rnd() * 26 - cam.scrollY;
        r._pointerMoveT = r.elapsed;
      }
      kd('keydown'); await new Promise(function(res){ setTimeout(res, 70); });
      kd('keyup');   await new Promise(function(res){ setTimeout(res, 40); });
    }
    var sec = Math.max(0.1, r.elapsed - t0);
    return { 撃破までの秒: Math.round(sec), たおせたか: !b.active, maxHp: maxHp,
             のこりHP: b.entity ? b.entity.hp : 0, スタート時HP: hp0 };
  })()`);
  say('【①撃破タイム】レベル27・±26pxのぶれ付き照準: ' + JSON.stringify(kill));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-verify.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
