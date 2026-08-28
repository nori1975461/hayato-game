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
const PORT = 8961, DBG = 9511;
const URL = `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=33`;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-w6')}`, 'about:blank'], { stdio: 'ignore' });
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

  // ============ ① ESC＝1回押しでは戻らない・2度押しでタイトルへ ============
  // ⚠️ autotest モードは Title.create が即 Run を再開する（タイトルスキップ）ので、
  //    ESC の検証中だけ切る。切らないと「タイトルへ戻った」が1フレームで消えて観測できない。
  await evalJs(`window.VORTEX.autotest = false; true;`);
  const key = (type) => send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape',
    windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await key('rawKeyDown'); await key('keyUp');
  await sleep(700);
  const after1 = await evalJs(`(function(){var g=window.__vortexGame;
    return { run: g.scene.isActive('Run'), title: g.scene.isActive('Title'),
      confirm: !!window.__run._escText };})()`);
  console.log('①ESC 1回目:            Run続行=' + (after1 && after1.run ? 'YES' : 'NO')
    + ' / 確認の文言=' + (after1 && after1.confirm ? 'YES' : 'NO'));
  await key('rawKeyDown'); await key('keyUp');
  await sleep(900);
  const after2 = await evalJs(`(function(){var g=window.__vortexGame;
    return { run: g.scene.isActive('Run'), title: g.scene.isActive('Title') };})()`);
  console.log('②ESC 2回目:            タイトルへ=' + (after2 && after2.title && !after2.run ? 'YES' : 'NO'));

  // ============ Run を再開して残りを測る（autotest を戻す） ============
  await evalJs(`(function(){var g=window.__vortexGame; window.VORTEX.autotest = true;
    g.scene.getScene('Title').startRun(false); return true;})()`);
  await sleep(2200);
  for (let i = 0; i < 60; i++) {
    const ok = await evalJs(`(function(){var g=window.__vortexGame;var r=g.scene.getScene('Run');
      window.__run=r; return !!(r&&r.boss&&r.sys.settings.status>=4&&r.boss.practiceSpawn);})()`);
    if (ok) break;
    await sleep(200);
  }

  // ============ ② 出現コメント（maouIntro の実テキスト） ============
  await evalJs(`(function(){
    var r = window.__run;
    r.practiceMode = true;
    window.__texts = [];
    var oa = r.add.text.bind(r.add);
    r.add.text = function(x, y, str, style){ window.__texts.push(String(str)); return oa(x, y, str, style); };
    r.boss.practiceSpawn('maou');
    return true;
  })()`);
  await sleep(5200);
  const texts = await evalJs('window.__texts');
  const t1 = texts && texts.some((t) => t.includes('よくぞ来た 小さき光よ'));
  const t2 = texts && texts.some((t) => t.includes('この世界の光は 我が手で消す'));
  const t3 = texts && texts.some((t) => t.includes('キケン') || t.includes('ハイジョ'));
  console.log('③名乗り（新2行）:      ' + (t1 && t2 ? 'YES 画面に出た' : 'NO') + ' / 旧セリフ=' + (t3 ? '残存NG' : 'なし'));

  // ============ ③ 転生後の名前表記（HPバーの実テキスト） ============
  await evalJs(`(function(){
    var r = window.__run;
    r.boss.practiceAwaken();
    r.player.maxHp = 99999; r.player.hp = 99999;
    window.__fix = setInterval(function(){
      var e = r.boss.entity; if (e) e.hp = e.maxHp * 0.9; r.player.hp = 99999;
    }, 60);
    return true;
  })()`);
  for (let i = 0; i < 60; i++) {
    const st = await evalJs(`window.__run.boss.state`);
    if (st && st !== 'awakenCine' && st !== 'maouIntro') break;
    await sleep(400);
  }
  const nm = await evalJs(`(function(){
    var b = window.__run.boss.entity;
    return b && b.def && b.def.name;
  })()`);
  console.log('④HPバーの見出し:       ' + nm);
  console.log('   指定どおり:          ' + (nm === '真マオウレクス【軌道神核（きどうしんかく）】' ? 'YES' : 'NO'));

  // ============ ④ せいれつ＝薙ぎ相＋焼き付き相の実測 ============
  // alignFire 中の debugBeam を高頻度サンプリングして、角度の推移から
  // 「薙いでいる時間」と「終端で止まっている時間」を分けて測る。
  // ⚠️ 壁時計（Date.now）で測ってはいけない：発射時のヒットストップ0.20秒とスローモーションで
  //    ゲーム内時間は止まる/遅れるので、設計0.95秒が壁時計では1.29秒に見える（実際に一度誤読した）。
  //    ビームの寿命は run の dt で進むので、**run.elapsed（ゲーム内時間）**で測る。
  await evalJs(`(function(){
    window.__B = { samples: [], w: 0, from: 0, to: 0 };
    if (window.__t) clearInterval(window.__t);
    window.__t = setInterval(function(){
      var r = window.__run, B = r.boss;
      if (B.state === 'alignFire') {
        var b = B.debugBeam();
        if (b) {
          window.__B.samples.push({ t: r.elapsed, ang: b.ang, done: b.sweepDone });
          window.__B.w = b.width; window.__B.from = b.from; window.__B.to = b.to;
        }
      }
    }, 16);
    return true;
  })()`);
  // alignFire を**照射が終わるまで**観測する（途中で打ち切ると焼き付き相が測れない）
  let got = 0, sawFire = false;
  for (let i = 0; i < 300; i++) {
    await sleep(300);
    got = await evalJs('window.__B.samples.length');
    const st = await evalJs('window.__run.boss.state');
    if (st === 'alignFire') sawFire = true;
    if (sawFire && st !== 'alignFire' && got >= 25) break;
  }
  await evalJs('clearInterval(window.__t); true;');
  const B2 = await evalJs('window.__B');
  if (B2 && B2.samples.length >= 10) {
    const ss = B2.samples;
    const span = Math.abs(B2.to - B2.from) * 180 / Math.PI;                  // 設計上の薙ぎ幅
    const swept = Math.abs(ss[ss.length - 1].ang - ss[0].ang) * 180 / Math.PI; // 実際に動いた角度
    const f = ss.find((x) => x.done);
    const sweepSec = f ? f.t - ss[0].t : -1;                                  // ゲーム内時間
    const holdSec = f ? ss[ss.length - 1].t - f.t : 0;
    console.log('⑤せいれつ 実測:        幅' + B2.w + 'px（旧100）/ 薙ぎ幅' + span.toFixed(0)
      + '°（実測で動いた角度' + swept.toFixed(0) + '°）');
    console.log('   照射の2相:          薙ぎ' + sweepSec.toFixed(2) + '秒 ＋ 焼き付き'
      + holdSec.toFixed(2) + '秒 ＝ 計' + (sweepSec + holdSec).toFixed(2) + '秒（ゲーム内時間）');
    console.log('   薙ぎ速度:           ' + (sweepSec > 0 ? (span / sweepSec).toFixed(0) : '?')
      + '°/秒（旧104°/秒）');
  } else {
    console.log('⑤せいれつ 実測:        alignFire を観測できなかった（' + (got || 0) + 'サンプル）');
  }
  console.log('EXCEPTIONS=' + exceptions);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
