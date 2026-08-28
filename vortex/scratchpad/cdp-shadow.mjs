// R44W5 かげおに（殻閉じの丸い弾の置換）の実測。
//
// 実プレイFB「丸い弾も修正して。退廃性（悪魔性）が強く、やや理不尽な、できれば弾以外の攻撃に」。
//
// ★「やや理不尽」の合否は3種のボットの**差**で出す（ルールは「とまるな」の1つだけ）：
//   Ａ 棒立ち        … 必ず捕まる（影は床0.55秒前の自分＝止まれば届く）＋炸裂も食らう
//   Ｂ 一直線に走る  … 完全無傷（床81px＋炸裂前の静止89px＝正しく走れば必ず躱せる）
//   Ｃ 小さく円を回る… 無傷が正しい（動き続けてさえいれば軌道の形は問わない＝ルールが1つ）
//   Ｂが捕まるなら完全理不尽（床が壊れている）。Ａが無傷なら手ごたえが無い。
// あわせて：影が主人公と同じテクスチャで倒立しているか／gap の床／炸裂／FPS。
// node vortex/scratchpad/cdp-shadow.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8956, DBG = 9506;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=29`;
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

// mode: 0=棒立ち / 1=一直線に走る / 2=小さく円を回る（半径60px）
// ⚠️ 被弾を hitPlayer のダメージ値で仕分けると聖句16と炸裂16を混同する（139回の誤計上をやった）
//    → boss.shadowStats（発生源カウンタ）の差分で数える。
// HPは毎フレーム満タン＝死んでシーンが作り直されると数字が消える嘘を防ぐ。
function runnerScript(mode) {
  return `(function(){
    var r = window.__run, B = r.boss;
    window.__S = { bites: 0, novas: 0, novaBursts: 0, maxShadows: 0, minGap: 99,
      texOk: 0, texNg: 0, flipOk: 0, flipNg: 0, fps: 999, circA: 0 };
    if (window.__t) clearInterval(window.__t);
    window.__base = B.shadowStats;   // モード開始時点の実績（発生源カウンタ・差分で数える）
    window.__t = setInterval(function(){
      if (!B.active) return;
      r.player.hp = r.player.maxHp;
      var S = window.__S;
      var st = B.shadowStats, b0 = window.__base;
      S.bites = st.bites - b0.bites; S.novas = st.novaHits - b0.novaHits;
      S.novaBursts = st.novas - b0.novas;
      var gs = B.debugShadows ? B.debugShadows() : [];
      S.maxShadows = Math.max(S.maxShadows, gs.length);
      for (var i = 0; i < gs.length; i++) {
        var g = gs[i];
        if (!g.rising) S.minGap = Math.min(S.minGap, g.gap);
        if (g.tex === 'player') S.texOk++; else S.texNg++;
        if (g.flipY) S.flipOk++; else S.flipNg++;
      }
      if (gs.length) S.fps = Math.min(S.fps, Math.round(window.__vortexGame.loop.actualFps));
      var step = 148 * 0.05;
      if (${mode} === 1) { r.player.x += step; }
      else if (${mode} === 2) {
        S.circA += (148 / 60) * 0.05;              // 円周速度148px/s・半径60px
        r.player.x = window.__cx + Math.cos(S.circA) * 60;
        r.player.y = window.__cy + Math.sin(S.circA) * 60;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-shadow')}`, 'about:blank'], { stdio: 'ignore' });

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

  const up = await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    r.boss.practiceSpawn('maou');
    r.boss.practiceAwaken();
    // ⚠️ 60msごとのHP回復では足りない：整列84＋再照準52＋体当たり38が同じ窓に重なると
    //    140を超えて主人公が死に、ランごと終わる（elapsed停止・boss.active=false）。
    //    実測はダメージ量ではなく回数を数えるので、maxHp を大きくして死そのものを消す。
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){
      var e = r.boss.entity;
      if (e) e.hp = e.maxHp * 0.9;      // 段(rage)0で測る＝影は基準の2体
      r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 60; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine') break;
    await sleep(400);
  }
  console.log('①軌道神核へ転生:      ' + (up ? 'YES' : 'NO'));

  // 状態遷移の記録（shellHold が来ないときに「選ばれていない」のか「毎回割られている」のかを
  // 切り分けられるように、待っている間の遷移を常に残す）
  await evalJs(`(function(){
    var r = window.__run;
    window.__stLog = []; window.__stLast = null;
    setInterval(function(){
      var st = r.boss.state;
      if (st !== window.__stLast) { window.__stLog.push(st); window.__stLast = st;
        if (window.__stLog.length > 60) window.__stLog.shift(); }
    }, 40);
    return true;
  })()`);

  const LABEL = ['Ａ 棒立ち', 'Ｂ 一直線に走る', 'Ｃ 小さく円を回る'];
  const out = [];
  for (let mode = 0; mode < 3; mode++) {
    // 次の shellHold（影の召喚）を待つ。割られたら（shellBreak）その回は流れる＝待ち直す
    let held = false;
    for (let i = 0; i < 400 && !held; i++) {
      const st = await evalJs(`window.__run.boss.state`);
      if (st === 'shellHold') held = true;
      else await sleep(150);
    }
    if (!held) {
      const lg = await evalJs('window.__stLog.join(" > ")');
      console.log(`   ${LABEL[mode]}: shellHold が来なかった`);
      console.log('     遷移: ' + lg);
      continue;
    }
    await evalJs(`(function(){
      var r = window.__run;
      window.__cx = r.player.x; window.__cy = r.player.y;
      return true;
    })()`);
    await evalJs(runnerScript(mode));
    // 影が全滅する（寿命+殻）まで見る＝召喚から炸裂まで一部始終
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const n = await evalJs(`window.__run.boss.debugShadows().length`);
      if (i > 8 && n === 0) break;
    }
    await evalJs('clearInterval(window.__t); true;');
    const s = await evalJs(`window.__S`);
    out.push(s);
    console.log(`   ${LABEL[mode].padEnd(16)} 影 最大${s ? s.maxShadows : '?'}体 / `
      + `噛みつき${s ? s.bites : '?'}回 / 炸裂${s ? s.novaBursts : '?'}発中ヒット${s ? s.novas : '?'}回 / `
      + `gap最小${s ? s.minGap.toFixed(2) : '?'}秒 / 最低FPS${s ? s.fps : '?'}`);
  }

  const [A, B, C] = out;
  console.log('②影は主人公の倒立か:  '
    + (A && A.texOk > 0 && A.texNg === 0 && A.flipNg === 0 ? `YES（player×flipY ${A.texOk}サンプル）` : 'NO'));
  console.log('③床（minGap）:        '
    + (out.every((s) => s && s.minGap >= 0.34) ? `YES 全モード0.34秒以上` : 'NO 床割れ＝完全理不尽')
    + `（A ${A ? A.minGap.toFixed(2) : '?'} / B ${B ? B.minGap.toFixed(2) : '?'} / C ${C ? C.minGap.toFixed(2) : '?'}）`);
  console.log('④棒立ちの噛みつき:    ' + (A ? A.bites : '?') + '回 ← 多いほど「止まったら死ぬ」が本物');
  console.log('⑤走り続けの噛みつき:  ' + (B ? B.bites : '?') + '回 ← 0なら「理不尽ではない」');
  console.log('⑥ループの噛みつき:    ' + (C ? C.bites : '?') + '回 ← 0が正しい＝動き続ければ形は問わない（ルールは とまるな だけ）');
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
