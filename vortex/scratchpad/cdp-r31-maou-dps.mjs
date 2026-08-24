// R31 調査：「本編のマオウレクスの体力がほとんどへらない。コアにビリヤード弾をあてているのに」
//
// 仮説を立てずに、まず**1発が何ダメージ入るか**と**何発必要か**を数える。
//   ・コアに通った1発の実ダメージ（HPの差で数える＝倍率を計測器側で再現しない）
//   ・75秒でどれだけ削れるか／このペースなら撃破に何秒かかるか
//   ・はじかれた回数（＝コアの当てにくさ）
//   ・分離中に下半身が弾を食べていないか
//
// node vortex/scratchpad/cdp-r31-maou-dps.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8898, DBG = 9448;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r31')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [];
  const say = (s) => { console.log(s); REP.push(s); };

  // 計測器：ボスへ入った1発ごとに (src, 実際に減ったHP) を記録する。
  // ⚠️ 渡した dmg ではなく **HP の差** で数える（倍率の掛け忘れを計測器側で再現しない）。
  await evalJs(`(function(){
    var r = window.__run;
    window.__log = { hits: [], deflects: 0, lowerEats: 0, err: null };
    var od = r.dealDamage.bind(r);
    r.dealDamage = function(e, dmg, color, src, at){
      var boss = e && e.isBoss;
      var before = boss ? e.hp : 0;
      od(e, dmg, color, src, at);
      if (boss) {
        var d = before - e.hp;
        if (d > 0) window.__log.hits.push({ src: src, req: dmg, real: d });
        else if (e.isLowerHalf) window.__log.lowerEats++;
      }
    };
    var ob = r.boss.deflect;
    r.boss.deflect = function(x, y){ window.__log.deflects++; return ob(x, y); };
    // 誰がボスを叩いたのかを分けて数える（突きと投げが混ざると原因が特定できない）
    window.__log.bySrc = {};
    var od2 = r.dealDamage;
    r.dealDamage = function(e, dmg, color, src, at){
      if (e && e.isBoss) {
        var k = (src || 'none') + (at && at.x != null ? '+座標' : '(座標なし)');
        window.__log.bySrc[k] = (window.__log.bySrc[k] || 0) + 1;
      }
      return od2.call(this, e, dmg, color, src, at);
    };
    if (window.__godTimer) clearInterval(window.__godTimer);
    window.__godTimer = setInterval(function(){
      if(!r||!r.player) return; r.player.hp = r.player.maxHp; r.player.invuln = 1;
    }, 16);
    return true;
  })()`);

  // 最終ボスまで送る
  const SPAWN = [60, 120, 180, 240, 300];
  for (let t = 0; t < SPAWN.length; t++) {
    await evalJs(`(function(){ window.__run.elapsed = ${SPAWN[t] + 0.4}; return true; })()`);
    for (let i = 0; i < 60; i++) {
      if (await evalJs(`!!(window.__run.boss && window.__run.boss.entity)`)) break;
      await sleep(100);
    }
    await evalJs(`(function(){ var b=window.__run.boss; if(b&&b.entity) b.onBossKilled(b.entity); return true; })()`);
    for (let i = 0; i < 80; i++) {
      if (await evalJs(`!(window.__run.boss && window.__run.boss.entity)`)) break;
      await sleep(100);
    }
    await sleep(150);
  }
  await evalJs(`(function(){ window.__run.elapsed = 360.4; return true; })()`);
  for (let i = 0; i < 60; i++) {
    if (await evalJs(`(function(){var b=window.__run.boss;return !!(b&&b.entity&&b.entity.def&&b.entity.def.id==='maou');})()`)) break;
    await sleep(100);
  }
  for (let i = 0; i < 80; i++) {
    const s = await evalJs(`window.__run.boss.state`);
    if (s && s !== 'maouIntro') break;
    await sleep(150);
  }

  // ★実プレイに近い強さへ育てる。elapsed を飛ばしただけではレベル1のままなので、
  //   本編の levelup.addXp を回して自動強化を実際に適用させる（倍率を手で書かない）。
  const lv = await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 600 && r.level < 20; i++) r.levelup.addXp(60);
    return r.level;
  })()`);
  await sleep(800);

  const power = await evalJs(`(function(){
    var r = window.__run, e = r.boss.entity;
    var w = r.boss.weakPoint(e) || {};
    return { レベル: r.level, heroMult: +(r.stats.heroMult || 1).toFixed(3),
             ボスHP: e.maxHp, ボス半径: e.radius, コア半径: w.r };
  })()`);
  say('主人公の強さ（自動強化を実際に適用・レベル' + lv + '）: ' + JSON.stringify(power));

  // ---- 自然プレイ：ボスへ寄って突きで予告を割り、出た装甲片を投げ返す（本編の手順そのまま）----
  const natural = await evalJs(`(async function(){
    var r = window.__run, b = r.boss;
    var e0 = b.entity;
    var t0 = r.elapsed, hp0 = e0.hp, max = e0.maxHp;
    window.__log.hits.length = 0; window.__log.deflects = 0; window.__log.lowerEats = 0;
    var end = Date.now() + 75000;
    while (Date.now() < end) {
      var e = b.entity;
      if (!b.active || !e) break;
      try {
        var dx = e.x - r.player.x, dy = e.y - r.player.y;
        var d = Math.hypot(dx, dy) || 1;
        if (d > 110) { r.player.x += (dx / d) * 4; r.player.y += (dy / d) * 4; }
        // ⚠️ ボットは狙いを持たない。狙わないと突きの扇(110度)にも入らず、投げも明後日へ飛ぶ。
        //    本編と同じ経路（カーソル位置）で**コアを狙わせる**。息子さんがやっていることの再現。
        var w = b.weakPoint(e);
        if (w && r.input.activePointer) {
          var cam = r.cameras.main;
          r.input.activePointer.x = w.x - cam.scrollX;
          r.input.activePointer.y = w.y - cam.scrollY;
          r._pointerMoveT = r.elapsed;
        }
        // ⚠️ keyCode を付けないと Phaser のキー管理に届かない（isDown が立たず主人公が
        //    一度も攻撃しない状態を「攻撃しているつもり」で測ってしまった。実測で踏んだ）
        window.dispatchEvent(new KeyboardEvent('keydown',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
        await new Promise(function(res){ setTimeout(res, 70); });
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
        await new Promise(function(res){ setTimeout(res, 40); });
      } catch (err) { window.__log.err = String(err); break; }
    }
    var e = b.entity;
    var L = window.__log;
    var sum = 0; for (var i = 0; i < L.hits.length; i++) sum += L.hits[i].real;
    var sec = Math.max(1, r.elapsed - t0);
    var lost = hp0 - (e ? e.hp : 0);
    return {
      たたかった秒: Math.round(sec),
      へったHP: lost, のこりHP: e ? e.hp : 0, maxHp: max,
      へった割合: Math.round((lost / max) * 100) + '%',
      コアに通った回数: L.hits.length,
      一発あたり: L.hits.length ? Math.round(sum / L.hits.length) : 0,
      はじかれた回数: L.deflects,
      ボスを叩いた内訳: L.bySrc,
      投げた回数: r.billiard.st.throws || 0,
      つかんだ回数: r.billiard.st.grabs || 0,
      突いた回数: r.billiard.st.jabs || 0,
      いま持っている弾: !!r.billiard.st.held,
      場にあるよろけ敵: r.enemies.filter(function(o){ return o.active && o.stag; }).length,
      下半身が食べた回数: L.lowerEats,
      このペースで撃破に必要な秒: lost > 0 ? Math.round(max / (lost / sec)) : -1,
      エラー: L.err,
      内訳: L.hits.slice(0, 8),
    };
  })()`);
  say('自然プレイ75秒（ボット・押しっぱなし・ボスへ密着）: ' + JSON.stringify(natural, null, 1));

  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r31-dps.txt'), REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
