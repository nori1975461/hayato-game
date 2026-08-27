// R44W3 せいれつ（整列レーザー）作り直しの実測。
//
// 実プレイFB「せいれつは、攻撃予告の赤いラインはいらない。あれがあると簡単によけられる。
// せいれつはかなりよけづらい攻撃でよい。ラスボス最大の攻撃なので『この攻撃手ごわい』と
// 思わせるのが肝要」。
//
// ★この技の合否は1つの数では出ない。**避け方ごとに結果が分かれること**が設計そのものなので、
//   3種類のボットを同じ条件で走らせて突き合わせる：
//     Ａ 棒立ち          … 必ず当たる（＝ちゃんと脅威である）
//     Ｂ 正しい側へ直角逃げ … 避けられる（＝理不尽ではない）
//     Ｃ 逆側へ直角逃げ   … 薙ぎに掬われて当たる（＝「側を選ぶ」判断が本物である）
//   Ｂが当たるなら理不尽、ＡかＣが避けられるなら手ごたえが無い。両方見て初めて判定できる。
// あわせて：射線プレビューが本当に描かれていないか／振りかぶりが出ているか／薙ぎ角。
// node vortex/scratchpad/cdp-align.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8951, DBG = 9501;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=13`;
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

// mode: 0=棒立ち / 1=正しい側へ逃げる / 2=逆側へ逃げる
// ⚠️ 初回の計測器はHPの差分で被弾を数えていて、**主人公が死んでシーンが作り直される**と
//    数字が0に戻っていた（棒立ちなのに被弾0という嘘が出た＝[[feedback_instrument_must_match_impl]]）。
//    直し方は2つ：①HPを毎フレーム満タンに固定して死なせない ②被弾は hitPlayer の
//    **呼び出しそのもの**を数える（HPの増減に依存しない）。
function runnerScript(mode) {
  return `(function(){
    var r = window.__run, B = r.boss;
    window.__S = { fires: 0, line: 0, windMax: 0, spans: [], lastState: null,
      hitBig: 0, hitAny: 0 };
    if (window.__t) clearInterval(window.__t);
    if (!r.__spied) {
      r.__spied = true;
      var oh = r.hitPlayer.bind(r);
      r.hitPlayer = function(d, x, y){
        var S = window.__S;
        if (S && B.state === 'alignFire') { S.hitAny++; if (d >= 80) S.hitBig++; }
        return oh(d, x, y);
      };
    }
    window.__t = setInterval(function(){
      if (!B.active) return;
      r.player.hp = r.player.maxHp;      // 死なせない（測るのは耐久ではなく命中）
      var st = B.state, S = window.__S;
      var a = B.debugAlign ? B.debugAlign() : null;
      if (st === 'alignTele' && a && a.lineDrawn) S.line++;
      if (st === 'alignTele' && a) S.windMax = Math.max(S.windMax, Math.abs(a.wind));
      if (st === 'alignFire' && S.lastState !== 'alignFire') {
        S.fires++;
        var b = B.debugBeam();
        if (b) S.spans.push(Math.round((b.to - b.from) * 180 / Math.PI));
      }
      S.lastState = st;
      if (${mode} > 0 && (st === 'alignTele' || st === 'alignFire') && a && a.locked) {
        // 薙ぎは ang → ang + dir*span。安全なのは -dir 側。
        var side = (${mode} === 1) ? -a.dir : a.dir;
        var pa = a.ang + side * Math.PI / 2;
        var step = 148 * 0.05;
        r.player.x += Math.cos(pa) * step;
        r.player.y += Math.sin(pa) * step;
      }
    }, 50);
    return true;
  })()`;
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-align')}`, 'about:blank'], { stdio: 'ignore' });

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
      return !!(r&&r.boss&&r.hud&&r.sys.settings.status>=4);})()`);
    if (ok) break;
    await sleep(200);
  }

  // 真の姿を出す。HPは実測のあいだ落ちないよう固定（尺ではなく技だけを測る）。
  const up = await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e) e.hp = e.maxHp * 0.9;         // 段(rage)を上げずに測る
    }, 60);
    return true;
  })()`);
  // 転生カットシーン（約7秒）が明けるまで待つ
  for (let i = 0; i < 60; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(400);
  }
  console.log('①軌道神核へ転生:      ' + (up ? 'YES' : 'NO'));

  const LABEL = ['Ａ 棒立ち', 'Ｂ 正しい側へ逃げる', 'Ｃ 逆側へ逃げる'];
  const out = [];
  for (let mode = 0; mode < 3; mode++) {
    await evalJs(`(function(){
      var r = window.__run, e = r.boss.entity;
      r.player.hp = r.player.maxHp;
      if (e) { r.player.x = e.x + 230; r.player.y = e.y; }   // 毎回おなじ間合いから始める
      return true;
    })()`);
    await evalJs(runnerScript(mode));
    // 整列が4回出るまで（または上限）待つ
    let s = null;
    for (let i = 0; i < 90; i++) {
      await sleep(500);
      s = await evalJs(`(function(){
        var S = window.__S;
        return { fires: S.fires, line: S.line, windMax: +S.windMax.toFixed(3), spans: S.spans,
          hitBig: S.hitBig, hitAny: S.hitAny };
      })()`);
      if (!s) break;
      if (s.fires >= 4) break;
    }
    await evalJs('clearInterval(window.__t); true;');
    // ダメージは回復で潰れるので、被弾は「整列の直後にHPが減ったか」で数え直す
    out.push({ mode, s });
    const span = s && s.spans.length ? s.spans[0] : null;
    console.log(`   ${LABEL[mode].padEnd(20)} 整列${s ? s.fires : '?'}回 / 直撃${s ? s.hitBig : '?'}回`
      + ` / 射線プレビュー描画${s ? s.line : '?'}フレーム / 振りかぶり最大${s ? (s.windMax * 180 / Math.PI).toFixed(1) : '?'}°`
      + (span != null ? ` / 薙ぎ${span}°` : ''));
  }

  const A = out[0] && out[0].s, B = out[1] && out[1].s, C = out[2] && out[2].s;
  console.log('②射線プレビュー:      ' + ((A && A.line === 0) ? 'YES 出ていない（FBどおり）' : 'NO まだ描かれている'));
  console.log('③振りかぶり:          ' + (A ? (A.windMax * 180 / Math.PI).toFixed(1) + '°（設計18°）' : '?'));
  console.log('④薙ぎ角:              ' + (A && A.spans.length ? A.spans.join(',') + '°（設計120°・片方向）' : '?'));
  const rate = (o) => (o && o.fires ? (o.hitBig / o.fires) : null);
  const pct = (v) => (v == null ? '?' : (v * 100).toFixed(0) + '%');
  console.log('⑤棒立ちの被弾率:      ' + pct(rate(A)) + `（${A ? A.hitBig : '?'}/${A ? A.fires : '?'}）`
    + ' ← 高いほど「脅威である」');
  console.log('⑥正しい側の被弾率:    ' + pct(rate(B)) + `（${B ? B.hitBig : '?'}/${B ? B.fires : '?'}）`
    + ' ← 低いほど「理不尽ではない」');
  console.log('⑦逆側の被弾率:        ' + pct(rate(C)) + `（${C ? C.hitBig : '?'}/${C ? C.fires : '?'}）`
    + ' ← 高いほど「側を選ぶ判断が本物」');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
