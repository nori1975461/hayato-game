// R29W2 検証：れんしゅうじょうのFB3件（①音の差／②つかめない罰／③爆弾弾）。
//
// ★①は「本当に差をつけたのか」が問いなので、**実際に鳴らして波形を測る**。
//   masterGain に AnalyserNode を分岐で挿し、各プリセットの1発と締めを鳴らして
//   周波数ビンの最大値を拾う。低域/中域/高域のエネルギー比と重心が違えば「別の音」。
//   ⚠️ 設定値が違うことは差の証明にならない（旧実装は gapMs だけ違って音は完全に同一だった）。
//
// ②は掴めない窓の実長と、弾かれたときに何が起きるか（ノックバック・しびれ・被ダメ0）を実測。
// ③は導火線が残っているうちに投げた弾が spec='bomb' になり、敵に当たって爆発するかを実測。
//
// node vortex/scratchpad/cdp-r29w2.mjs [seed]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8893, DBG = 9443;
const SEED = process.argv[2] || '42';
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

// AudioContext と GainNode を作る前に仕込む。masterGain は最初に作られる Gain。
const TAP = `(function(){
  window.__gains = [];
  var AC = window.AudioContext || window.webkitAudioContext;
  var origGain = AC.prototype.createGain;
  AC.prototype.createGain = function(){ var g = origGain.call(this); window.__gains.push(g); return g; };
  var Orig = AC;
  var Patched = function(){ var c = new Orig(); window.__ctx = c; return c; };
  Patched.prototype = Orig.prototype;
  window.AudioContext = Patched;
  window.webkitAudioContext = Patched;
})()`;

const INSTALL = `(function(){
  var g = window.__vortexGame; if(!g) return 'no game';
  var r = g.scene.getScene('Run'); if(!r) return 'no run';
  if (!r.__pin) {
    r.__pin = 1;
    var of = r.updateHeroFist.bind(r);
    r.updateHeroFist = function(dt){ of(dt); if (r.player) r.player.hp = r.player.maxHp; };
  }
  return 'ok';
})()`;

async function main() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? '/vortex/index.html' : u);
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
                           'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(PORT, r));
  // ⚠️ --mute-audio は付けない。付けると出力が止まって解析ノードに何も来ない可能性がある。
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r29w2')}`, 'about:blank'], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 150 && !wsUrl; i++) {
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
    if (m.method === 'Runtime.exceptionThrown') {
      exceptions.push((m.params.exceptionDetails.text || '') +
        ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
    }
    if (m.id && pending.has(m.id)) { const { resolve } = pending.get(m.id); pending.delete(m.id); resolve(m.result || {}); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: TAP });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?seed=${SEED}&practice=1` });
  await sleep(3500);
  const space = `window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',keyCode:32,which:32,bubbles:true})),
                 window.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',keyCode:32,which:32,bubbles:true})), true`;
  await evalJs(space);
  await sleep(900);
  let started = false;
  for (let i = 0; i < 40 && !started; i++) {
    started = await evalJs(`(function(){var r=window.__vortexGame.scene.getScene('Run');return !!(r && r.cameras && r.cameras.main && r.billiard && r.player);})()`);
    if (!started) { await evalJs(space); await sleep(700); }
  }
  if (!started) { console.log('RUN_NOT_STARTED'); process.exit(1); }
  await evalJs(INSTALL);
  await sleep(1500);

  // ---------------- ① 4つのプリセットは本当に別の音か ----------------
  // ⚠️ Phaser も別の AudioContext を作るので、createGain を横取りして拾うと**別文脈の Gain**を掴む
  //    （実際に InvalidAccessError で落ちた）。ゲーム本体の出力点を Sound.debugTap() で正しく取る。
  //    ESモジュールはキャッシュされるので、動的 import で得られるのはゲームと同一のインスタンス。
  const tapOk = await evalJs(`(async function(){
    if (window.__an) return 'ok';
    var m = await import('/vortex/src/audio/sound.js');
    var t = m.Sound.debugTap();
    if (!t || !t.master) return 'no tap';
    var an = t.ctx.createAnalyser();
    an.fftSize = 4096; an.smoothingTimeConstant = 0;
    t.master.connect(an);     // masterGain から分岐（出力の経路は変えない）
    window.__an = an;
    window.__sr = t.ctx.sampleRate;
    window.__Sound = m.Sound;
    return 'ok(' + t.ctx.state + ')';
  })()`);
  console.log('解析ノード: ' + tapOk);

  // 1つの音を鳴らして 700ms ぶんの最大スペクトルを取り、20本の対数バンドに畳む。
  // ⚠️ BGMと敵の音が混ざると「同じ音どうし」でも数字がずれる（初回の実測で実際にずれた）。
  //    BGMを止めてゲームを一時停止し、無音のバンド（floor）を先に取って必ず引く。
  const MEASURE = (call) => `(async function(){
    var an = window.__an, sr = window.__sr, N = an.frequencyBinCount;
    var peak = new Float32Array(N); peak.fill(-200);
    var buf = new Float32Array(N);
    ${call};
    for (var t = 0; t < 70; t++) {
      an.getFloatFrequencyData(buf);
      for (var i = 0; i < N; i++) if (buf[i] > peak[i]) peak[i] = buf[i];
      await new Promise(function(r){ setTimeout(r, 10); });
    }
    var hz = function(i){ return i * sr / (N * 2); };
    var lin = function(db){ return db <= -110 ? 0 : Math.pow(10, db / 20); };
    // 50Hz〜16kHz を20本の対数バンドへ
    var NB = 20, F0 = 50, F1 = 16000, band = new Array(NB).fill(0);
    var lo = 0, mid = 0, hi = 0, num = 0, den = 0, top = 0, topv = -999;
    for (var i = 1; i < N; i++) {
      var f = hz(i), v = lin(peak[i]);
      if (f >= F0 && f < F1) {
        var b = Math.floor(Math.log(f / F0) / Math.log(F1 / F0) * NB);
        if (b >= 0 && b < NB) band[b] += v;
      }
      if (f >= 60 && f < 200) lo += v;
      else if (f >= 200 && f < 2000) mid += v;
      else if (f >= 2000 && f < 12000) hi += v;
      if (f >= 40 && f < 14000) { num += f * v; den += v; if (v > topv) { topv = v; top = f; } }
    }
    var tot = lo + mid + hi || 1;
    return { band: band, 低: Math.round(lo/tot*100), 中: Math.round(mid/tot*100), 高: Math.round(hi/tot*100),
             重心Hz: Math.round(den ? num/den : 0), 最大Hz: Math.round(top) };
  })()`;

  // Sound.sfx の呼び出し名を記録する（どの音が鳴ったかを名前で確定させる）
  await evalJs(`(function(){
    var r = window.__vortexGame.scene.getScene('Run');
    if (r.__sfxHooked) return 'ok';
    r.__sfxHooked = 1; r.__sfxLog = [];
    // crushBeat / crushFinale が実際に呼ぶ名前を記録する（本編と同じ経路で確かめる）
    var ob = r.crushBeat.bind(r), of = r.crushFinale.bind(r);
    r.crushBeat = function(it, i, P){ r.__sfxLog.push('beat:' + (P.sfx||'crush')); return ob(it, i, P); };
    r.crushFinale = function(n, x, y){ r.__sfxLog.push('end:' + (r.crushPreset().endSfx||'crushEnd')); return of(n, x, y); };
    return 'ok';
  })()`);

  console.log('\n=== ① いっき撃破の音（4プリセット） ===');
  // 混入を止める。BGMを切り、ゲームを止めてから測る
  await evalJs(`(function(){
    var r = window.__vortexGame.scene.getScene('Run');
    window.__Sound.stopBgm(); r.paused = true; return 'ok';
  })()`);
  await sleep(700);
  const floor = await evalJs(MEASURE(`0`));
  console.log(`無音の床（この上に音が乗る）: 低${floor.低}% 中${floor.中}% 高${floor.高}%`
    + `  総量=${floor.band.reduce((a, b) => a + b, 0).toFixed(3)}`);

  const sub = (m) => m.band.map((v, i) => Math.max(0, v - floor.band[i]));
  const norm = (v) => { const s = v.reduce((a, b) => a + b, 0) || 1; return v.map((x) => x / s); };
  // 2つのスペクトルの距離（0＝完全一致・1＝まったく別）。正規化した20バンドのL1距離÷2。
  const dist = (a, b) => { const x = norm(a), y = norm(b);
    return x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / 2; };

  const beats = [], fins = [], labels = [];
  for (let p = 0; p < 4; p++) {
    const info = await evalJs(`(function(){
      var r = window.__vortexGame.scene.getScene('Run');
      r._crushIdx = ${p}; r.__sfxLog = [];
      var P = r.crushPreset();
      return { name: P.name, on: P.on, gapMs: P.gapMs, sfx: P.sfx, endSfx: P.endSfx };
    })()`);
    // 打撃1発（i=3）
    const beat = await evalJs(MEASURE(`(function(){
      var r = window.__vortexGame.scene.getScene('Run');
      r.crushBeat({ x: r.player.x, y: r.player.y, color: 0xffffff, ghost: null }, 3, r.crushPreset());
    })()`));
    await sleep(500);
    // 締め（8体ぶん）
    const fin = await evalJs(MEASURE(`(function(){
      var r = window.__vortexGame.scene.getScene('Run');
      r.crushFinale(8, r.player.x, r.player.y);
    })()`));
    await sleep(600);
    const log = await evalJs(`window.__vortexGame.scene.getScene('Run').__sfxLog.join(',')`);
    labels.push(info.name);
    beats.push(sub(beat)); fins.push(sub(fin));
    console.log(`[${p}] ${info.name}  gap=${info.gapMs}ms  鳴らした関数=${log}`);
    console.log(`     1発 : 低${beat.低}% 中${beat.中}% 高${beat.高}%  重心${beat.重心Hz}Hz  最大${beat.最大Hz}Hz`);
    console.log(`     締め: 低${fin.低}% 中${fin.中}% 高${fin.高}%  重心${fin.重心Hz}Hz  最大${fin.最大Hz}Hz`);
  }
  // ★対照実験：[3]切 は [0]たいこ と**同じ関数**を鳴らす。ここの距離が測定誤差の大きさ。
  console.log('\n  スペクトル距離（0=同じ音 / 1=まったく別）');
  console.log(`   対照 たいこ vs 切（同じ関数）  1発 ${dist(beats[0], beats[3]).toFixed(3)}  締め ${dist(fins[0], fins[3]).toFixed(3)}`);
  console.log(`   たいこ vs ばくは               1発 ${dist(beats[0], beats[1]).toFixed(3)}  締め ${dist(fins[0], fins[1]).toFixed(3)}`);
  console.log(`   たいこ vs きらきら             1発 ${dist(beats[0], beats[2]).toFixed(3)}  締め ${dist(fins[0], fins[2]).toFixed(3)}`);
  console.log(`   ばくは vs きらきら             1発 ${dist(beats[1], beats[2]).toFixed(3)}  締め ${dist(fins[1], fins[2]).toFixed(3)}`);
  await evalJs(`(function(){ window.__vortexGame.scene.getScene('Run').paused = false; return 'ok'; })()`);

  // ---------------- ② つかめない窓と、弾かれたときの罰 ----------------
  console.log('\n=== ② むらさきの わ（つかめない） ===');
  const key = (k, code, kc) => evalJs(`(window.dispatchEvent(new KeyboardEvent('keydown',
      {key:'${k}',code:'${code}',keyCode:${kc},which:${kc},bubbles:true})),
    window.dispatchEvent(new KeyboardEvent('keyup',
      {key:'${k}',code:'${code}',keyCode:${kc},which:${kc},bubbles:true})), true)`);
  await key('2', 'Digit2', 50);
  await sleep(400);
  // 窓の実長：断末魔が始まってから guardT が 0 になるまでを毎フレーム数える
  const win = await evalJs(`(async function(){
    var r = window.__vortexGame.scene.getScene('Run');
    r.practice.setCourse(1);
    await new Promise(function(res){ setTimeout(res, 250); });
    var e = r.practice.st.tgt;
    // ⚠️ 途中から測ると窓が短く見える（初回の実測で 0.85秒の窓を 0.53秒から数え始めていた）。
    //    掛け直して**先頭から**測る。掴み禁止と予告の関係を見るのが目的なので条件は本編のまま。
    r.clearStagger(e); e.hp = 1; r._throeT = -99; r.enterStagger(e);
    var t0 = r.elapsed, g0 = e.guardT, tele0 = e.atkT;
    var gEnd = -1, tEnd = -1, ringPurple = 0, guarded = 0;
    while (r.elapsed - t0 < 2.2) {
      var g = !!(e.throe && e.guardT > 0);
      if (g) { guarded++; if (e.stagRing && e.stagRing.tintTopLeft === 0xc44bff) ringPurple++; }
      if (gEnd < 0 && !g) gEnd = r.elapsed - t0;
      if (tEnd < 0 && !e.throe) tEnd = r.elapsed - t0;
      await new Promise(function(res){ setTimeout(res, 16); });
    }
    return { 設定値のguardSec: Math.round(g0*100)/100, 設定値の予告Sec: Math.round(tele0*100)/100,
             実測つかめない秒: Math.round(gEnd*100)/100, 実測の予告終了秒: Math.round(tEnd*100)/100,
             '掴めない間ずっと輪が紫だった率%': guarded ? Math.round(ringPurple/guarded*100) : -1,
             主役までの距離: Math.round(Math.hypot(e.x-r.player.x, e.y-r.player.y)),
             掴める距離: r.billiard.st.mode === 1 ? 78 : 78 };
  })()`);
  console.log('窓: ' + JSON.stringify(win));

  const blocked = await evalJs(`(async function(){
    var r = window.__vortexGame.scene.getScene('Run');
    r.practice.setCourse(1);
    await new Promise(function(res){ setTimeout(res, 250); });
    var e = r.practice.st.tgt;
    var b0 = r.billiard.st.blocked, hp0 = r.player.hp;
    var x0 = r.player.x, y0 = r.player.y;
    var d0 = Math.hypot(e.x-x0, e.y-y0);
    // 掴もうとする（本編と同じ入力経路：_jKey.isDown）
    r._jKey = { isDown: true };
    await new Promise(function(res){ setTimeout(res, 60); });
    r._jKey = { isDown: false };
    var stun = r.billiard.st.stunT;
    await new Promise(function(res){ setTimeout(res, 350); });
    var d1 = Math.hypot(e.x-r.player.x, e.y-r.player.y);
    return { はじかれた回数: r.billiard.st.blocked - b0,
             しびれ秒: Math.round(stun*100)/100,
             被ダメージ: hp0 - r.player.hp,
             距離: Math.round(d0) + '→' + Math.round(d1),
             掴めたか: !!r.billiard.st.held };
  })()`);
  console.log('弾かれたとき: ' + JSON.stringify(blocked));

  const after = await evalJs(`(async function(){
    var r = window.__vortexGame.scene.getScene('Run');
    var e = r.practice.st.tgt;
    // 予告が終わるまで待ってから掴む＝「よけてから つかむ」が成立するか
    for (var i = 0; i < 200 && e.active && e.throe; i++) await new Promise(function(res){ setTimeout(res, 20); });
    await new Promise(function(res){ setTimeout(res, 700); });
    // ⚠️ 弾かれて95pxまで下がっているとただの射程外で失敗する（ボットが居ないので歩いて戻れない）。
    //    「弾かれた罰＝間合いを失う」ことは前の測定で確認済みなので、ここでは間合いだけ戻す。
    r.player.x = e.x - 40; r.player.y = e.y;
    await new Promise(function(res){ setTimeout(res, 80); });
    r._jKey = { isDown: true };
    await new Promise(function(res){ setTimeout(res, 80); });
    var got = !!r.billiard.st.held;
    r._jKey = { isDown: false };
    await new Promise(function(res){ setTimeout(res, 400); });
    return { 予告のあとに掴めたか: got };
  })()`);
  console.log('予告のあと: ' + JSON.stringify(after));

  // ---------------- ③ 時間内に投げたら爆弾弾になるか ----------------
  console.log('\n=== ③ ボンバ → ばくだんの たま ===');
  await sleep(600);
  const bomb = await evalJs(`(async function(){
    var r = window.__vortexGame.scene.getScene('Run');
    r.practice.setCourse(2);
    await new Promise(function(res){ setTimeout(res, 500); });
    var e = r.practice.st.tgt;
    // 的を右手に並べる（爆風でまとめて消えるかを見る）
    var def = null;
    for (var i = 0; i < 40; i++) { var o = r.enemies[i]; }
    var ENEM = r.__enemyDefs || null;
    var chibit = (r.practice.st.cluster[0] && r.practice.st.cluster[0].def) || (e && e.def);
    var made = 0;
    for (var k = 0; k < 6; k++) {
      var t = r.spawnEnemy(chibit, r.player.x + 150 + (k%3)*20, r.player.y - 22 + Math.floor(k/3)*30, false, 1);
      if (t) { t.speed = 0; t.atkT = 1e9; made++; }
    }
    var kills0 = r.kills, bh0 = r.billiard.st.bombHits;
    // 掴む
    r._jKey = { isDown: true };
    await new Promise(function(res){ setTimeout(res, 60); });
    var held = r.billiard.st.held;
    var spec = held && held.spec, fuse = held && Math.round(held.fuse*100)/100;
    // 右へ狙って即投げる（導火線が残っているうちに投げ切る）
    r.input.activePointer.worldX = r.player.x + 300;
    r.input.activePointer.worldY = r.player.y;
    r._jKey = { isDown: false };
    await new Promise(function(res){ setTimeout(res, 120); });
    var shot = r.billiard.st.shots[0];
    var shotSpec = shot && shot.spec, shotR = shot && Math.round(shot.radius);
    await new Promise(function(res){ setTimeout(res, 1400); });
    return { 手の中のspec: spec, 投げた時の導火線: fuse,
             とんだ弾のspec: shotSpec, 弾の当たり判定: shotR,
             用意した的: made,
             爆発した回数: r.billiard.st.bombHits - bh0,
             倒した数: r.kills - kills0 };
  })()`);
  console.log('ばくだん: ' + JSON.stringify(bomb));

  const inHand = await evalJs(`(async function(){
    var r = window.__vortexGame.scene.getScene('Run');
    r.practice.setCourse(2);
    await new Promise(function(res){ setTimeout(res, 700); });
    var hb0 = r.billiard.st.handBooms, hp0 = r.player.hp;
    r._jKey = { isDown: true };
    await new Promise(function(res){ setTimeout(res, 1600); });   // 持ち続ける＝手の中で爆発
    r._jKey = { isDown: false };
    await new Promise(function(res){ setTimeout(res, 300); });
    return { 手の中で爆発: r.billiard.st.handBooms - hb0, 被ダメージ: hp0 - r.player.hp };
  })()`);
  console.log('溜めたとき（従来どおり失敗する）: ' + JSON.stringify(inHand));

  console.log('\nEXCEPTIONS=' + exceptions.length);
  for (const e of exceptions.slice(0, 8)) console.log('  [EXC] ' + e);
  try { chrome.kill(); } catch { /* noop */ }
  server.close();
  process.exit(0);
}

main();
