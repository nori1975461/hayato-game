// R22 投球モーションの検証。
//
// 実プレイFB「ファミスタの投手のように振りかぶって、足を高く上げて、高速で腕を振って投げつけて。
// いまは主人公の身体から弾が飛び出しているようにしか見えない」への対応を、**数値と絵の両方**で確かめる。
//
// このスクリプトの肝は「モーションの時間を止められる」こと。投球は 0.17 秒しかないので、
// 普通にスクリーンショットを撮ってもどのコマが写るか運任せになる。billiard.st.wind.t を毎フレーム
// 書き戻して任意のフェーズで固定し、そのポーズを撮る（＝ポーズを取らせて確認する）。
//
// 検証項目：
//   A1 ★弾は「手」から出るか（体の中心からではないか）＝今回の修正の核心
//   A2 振りかぶりでボールが体の**後ろ**にあるか（前に構えていたら振りかぶりに見えない）
//   A3 体が傾く（振りかぶりの反り→振り抜きの前傾）／足が上がる（体が持ち上がる）
//   A4 腕の残像が出ているか（「高速で振った」を見せる担当）
//   A5 モーション後に体の傾き・縮尺が元に戻るか（戻し忘れは斜めのまま固まるバグになる）
//   A6 実行時例外ゼロ
//
// node vortex/scratchpad/cdp-r22-pitch.mjs [seed] [秒]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8857, DBG = 9407;
const SEED = process.argv[2] || '42';
const RUN_SEC = Number(process.argv[3] || 45);
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

// ⚠️ r.update を差し替えても効かない（Phaser は Systems.init で scene.update をキャッシュする）。
// Run.update から毎フレーム呼ばれる updateHeroFist を包むのが既存スクリプトと共通の手法。
// updateHeroFist は billiard.update より**前**に走るので、ここでの書き込みはモーション計算に効く。
const INSTALL = `(function(){
  var g = window.__vortexGame; if(!g) return 'no game';
  var r = g.scene.getScene('Run'); if(!r) return 'no run';
  if (!r.billiard) return 'no billiard';
  if (r.__pitch) return 'already';
  r.__pitch = true;

  var B = window.__B = {
    frames: 0, throws: 0,
    // A1: 弾が生まれた場所（プレイヤー中心からの相対）。drawArm の中で拾うので誤差ゼロ
    spawnDist: [], spawnAngErr: [],
    heldBehind: [], heldFront: [],   // A2: 振りかぶり中のボールの前後（狙い方向への射影）
    maxRot: 0, maxLift: 0, maxGhost: 0,   // A3/A4
    restRot: null, restScale: null,       // A5
    holdU: null, posed: 0,
  };

  // ---- A1: 弾の生成位置を厳密に拾う ----
  // launchShot の直後に drawHand -> run.drawArm が呼ばれる。その瞬間に shots が増えていれば、
  // 弾はまだ1フレームも動いていないので、記録した座標がそのまま「生まれた場所」になる。
  var prevShots = r.billiard.st.shots.length;
  var origDrawArm = r.drawArm.bind(r);
  r.drawArm = function(ang, reach, tint){
    var st = r.billiard.st;
    if (st.shots.length > prevShots) {
      var s = st.shots[st.shots.length-1];
      var dx = s.x - r.player.x, dy = s.y - r.player.y;
      B.spawnDist.push(Math.round(Math.sqrt(dx*dx+dy*dy)*10)/10);
      var want = st.wind ? st.wind.ang : Math.atan2(s.vy, s.vx);
      var d = Math.atan2(dy, dx) - want;
      while (d > Math.PI) d -= Math.PI*2;
      while (d < -Math.PI) d += Math.PI*2;
      B.spawnAngErr.push(Math.round(Math.abs(d)*180/Math.PI*10)/10);
    }
    prevShots = st.shots.length;
    return origDrawArm(ang, reach, tint);
  };

  // ⚠️ 観測は **billiard.update より後** に置く。updateHeroFist は billiard.update より前に走るので、
  //    そこで読むと「まだ書かれていない前フレームの状態」を測ってしまう（1回目の検証でA2/A7がNGに見えた原因）。
  //    しかも updateHeroFist 本体はビリヤードモードで毎フレーム腕を非表示にするため、腕は必ず invisible に見える。
  //    Run.update の呼び順は updatePlayer → updateHeroFist → billiard.update → updateEnemies → updateGems。
  var origGems = r.updateGems.bind(r);
  r.updateGems = function(dt){
    var bs = r.billiard.st;
    var aim = r._weaponAim || 0;
    // ---- A2: 振りかぶり中、ボールは体の後ろにあるか ----
    if (bs.held && bs.heldSpr && bs.heldSpr.visible && bs.chargeT > 0.25) {
      var proj = (bs.heldSpr.x - r.player.x) * Math.cos(aim) + (bs.heldSpr.y - r.player.y) * Math.sin(aim);
      if (proj < 0) B.heldBehind.push(1); else B.heldFront.push(1);
    }
    // ---- A7: 腕が描かれ、狙いより後ろを向いているか ----
    if (bs.held && bs.chargeT > 0.25 && r.playerArmImg && r.playerArmImg.visible) {
      B.armFrames = (B.armFrames||0) + 1;
      B.armLen = Math.max(B.armLen||0, Math.round(r.playerArmImg.displayWidth));
      var da = r.playerArmImg.rotation - aim;
      while (da > Math.PI) da -= Math.PI*2;
      while (da < -Math.PI) da += Math.PI*2;
      B.armBackDeg = Math.max(B.armBackDeg||0, Math.round(Math.abs(da)*180/Math.PI));
    }
    // ---- A3/A4: 体の傾き・持ち上げ・残像 ----
    if (bs.held || bs.wind) {
      B.maxRot = Math.max(B.maxRot, Math.abs(r.playerImg.rotation));
      B.maxLift = Math.max(B.maxLift, r.player.y - r.playerImg.y);
      var gv = 0;
      if (bs.ghosts) for (var i=0;i<bs.ghosts.length;i++) if (bs.ghosts[i].visible) gv++;
      B.maxGhost = Math.max(B.maxGhost, gv);
      // A8: 振り(swing)の最中に腕が前へ抜けているか
      if (bs.wind && r.playerArmImg && r.playerArmImg.visible) {
        var db = r.playerArmImg.rotation - bs.wind.ang;
        while (db > Math.PI) db -= Math.PI*2;
        while (db < -Math.PI) db += Math.PI*2;
        B.swingMin = Math.min(B.swingMin==null?999:B.swingMin, Math.round(Math.abs(db)*180/Math.PI));
        B.swingMax = Math.max(B.swingMax||0, Math.round(Math.abs(db)*180/Math.PI));
      }
    } else {
      // ---- A5: 手ぶらのときは真っ直ぐ・素の縮尺に戻っているか ----
      B.restRot = Math.round(Math.abs(r.playerImg.rotation)*1000)/1000;
      B.restScale = Math.round(r.playerImg.scaleX*1000)/1000;
    }
    return origGems(dt);
  };

  var origFist = r.updateHeroFist.bind(r);
  r.updateHeroFist = function(dt){
    origFist(dt);
    B.frames++;
    var bs = r.billiard.st;
    var P = (window.__BAL && window.__BAL.hero.billiard.pitch) || null;

    // ---- ポーズ固定：モーションの時間を毎フレーム書き戻す ----
    if (bs.wind && typeof B.holdU === 'number' && P) {
      // billiard.update がこの直後に dt を足すので、その分を引いておく
      bs.wind.t = Math.max(0, B.holdU * P.motionSec - dt);
    }

    B.throws = bs.throws;

    // ---- ボット：獲物がいれば掴んで溜め切ってから投げる ----
    var px = r.player.x, py = r.player.y;
    if (r._jKey) {
      if (bs.held) {
        // ポーズ撮影中は溜めを維持する（勝手に投げてしまうと振りかぶりが撮れない）
        var keep = (B.holdU === 'charge') ? true : (bs.chargeT < 0.8);
        r._jKey.isDown = keep;
      } else if (!bs.wind) {
        r._jKey.isDown = true;
      }
    }

    // ---- 移動：最寄りジェムを追う ----
    var kk = r.moveKeys; if (!kk) return;
    kk.left.isDown = kk.right.isDown = kk.up.isDown = kk.down.isDown = false;
    kk.a.isDown = kk.d.isDown = kk.w.isDown = kk.s.isDown = false;
    if (B.holdU != null) return;    // ポーズ中は動かない
    var tx=null, ty=null, bg=1e9;
    var gems = r.gems || [];
    for (var gi=0; gi<gems.length; gi++){ var gm=gems[gi]; if(!gm||!gm.active) continue;
      var dd=(gm.x-px)*(gm.x-px)+(gm.y-py)*(gm.y-py); if(dd<bg){bg=dd;tx=gm.x;ty=gm.y;} }
    if (tx==null) return;
    var ddx=tx-px, ddy=ty-py;
    if (ddx < -4) kk.left.isDown = true; else if (ddx > 4) kk.right.isDown = true;
    if (ddy < -4) kk.up.isDown = true;   else if (ddy > 4) kk.down.isDown = true;
  };
  return 'ok';
})()`;

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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-pitch')}`, 'about:blank'], { stdio: 'ignore' });

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

  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=${SEED}` });
  await sleep(3500);
  await evalJs(`import('/vortex/src/data/balance.js').then(m=>{window.__BAL=m.BALANCE}), true`);
  await sleep(400);
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})),
                window.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})), true`);
  await sleep(800);
  const inst = await evalJs(INSTALL);
  if (inst !== 'ok') { console.log('INSTALL_FAILED=' + inst); process.exit(1); }

  // ---- 1. 自然プレイで数値を貯める ----
  const t0 = Date.now();
  while (Date.now() - t0 < RUN_SEC * 1000) {
    await sleep(500);
    const alive = await evalJs(`(function(){var r=window.__vortexGame.scene.getScene('Run');
      return r && !r.ended;})()`);
    if (!alive) break;
    const th = await evalJs(`window.__B.throws`);
    if (th >= 14) break;    // 十分なサンプルが取れたら次のポーズ撮影へ
  }

  const m = await evalJs(`(function(){var B=window.__B, r=window.__vortexGame.scene.getScene('Run');
    var P = window.__BAL.hero.billiard.pitch;
    return { frames:B.frames, throws:B.throws,
      spawnDist:B.spawnDist, spawnAngErr:B.spawnAngErr,
      behind:B.heldBehind.length, front:B.heldFront.length,
      maxRot:Math.round(B.maxRot*1000)/1000, maxLift:Math.round(B.maxLift*10)/10,
      maxGhost:B.maxGhost, restRot:B.restRot, restScale:B.restScale,
      armFrames:B.armFrames||0, armLen:B.armLen||0, armBackDeg:B.armBackDeg||0,
      swingMin:B.swingMin, swingMax:B.swingMax||0,
      releaseReach:P.releaseReach, ghosts:P.ghosts, bodyLift:P.bodyLift, ended:!!r.ended };})()`);

  const avg = (a) => a && a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
  console.log('===== R22 投球モーション検証 (seed=' + SEED + ') =====');
  console.log(`FRAMES=${m.frames} THROWS=${m.throws} EXCEPTIONS=${exceptions.length}`);
  for (const e of exceptions.slice(0, 4)) console.log('  ' + e);
  console.log('');
  console.log('--- A1 ★弾は「手」から出るか（旧実装は体の中心＝0px から出ていた）---');
  console.log(`  生成距離 平均${avg(m.spawnDist)}px / 全${m.spawnDist.length}回 [${m.spawnDist.slice(0, 8).join(', ')}]`);
  console.log(`  期待値 releaseReach=${m.releaseReach}px  → ${avg(m.spawnDist) >= m.releaseReach * 0.85 ? 'OK' : 'NG'}`);
  console.log(`  投げた向きとのズレ 平均${avg(m.spawnAngErr)}°  → ${avg(m.spawnAngErr) <= 6 ? 'OK' : 'NG'}`);
  console.log('');
  console.log('--- A2 振りかぶり中、ボールは体の後ろにあるか ---');
  console.log(`  後ろ=${m.behind}フレーム / 前=${m.front}フレーム → ${m.behind > m.front * 3 ? 'OK' : 'NG'}`);
  console.log('');
  console.log('--- A3 体の動き（反り／前傾／足を上げる）---');
  console.log(`  最大の傾き=${m.maxRot}rad (${Math.round(m.maxRot * 180 / Math.PI)}°) → ${m.maxRot > 0.1 ? 'OK' : 'NG'}`);
  console.log(`  最大の持ち上げ=${m.maxLift}px (設定 bodyLift=${m.bodyLift}) → ${m.maxLift >= m.bodyLift * 0.6 ? 'OK' : 'NG'}`);
  console.log('');
  console.log('--- A4 腕の残像（高速で振ったことを見せる担当）---');
  console.log(`  同時表示の最大=${m.maxGhost}枚 (設定 ghosts=${m.ghosts}) → ${m.maxGhost >= m.ghosts ? 'OK' : 'NG'}`);
  console.log('');
  console.log('--- A7 腕そのものが描かれ、後ろを向いているか ---');
  console.log(`  腕の描画=${m.armFrames}フレーム / 最大の長さ=${m.armLen}px / 狙いとの角度差 最大${m.armBackDeg}°`);
  console.log(`  → ${m.armFrames > 0 && m.armLen >= 20 && m.armBackDeg >= 95 ? 'OK' : 'NG'}（体半幅18pxより長く・90°超で後ろ）`);
  console.log('');
  console.log('--- A8 振りの最中、腕は後ろから前へ抜けているか ---');
  console.log(`  投げる向きとの角度差: 最大${m.swingMax}° → 最小${m.swingMin}° → ${m.swingMax >= 95 && m.swingMin <= 25 ? 'OK' : 'NG'}`);
  console.log('');
  console.log('--- A5 投げ終わりに姿勢が戻るか（戻し忘れは斜めのまま固まるバグ）---');
  console.log(`  手ぶら時の傾き=${m.restRot}rad / 縮尺=${m.restScale} → ${m.restRot === 0 && Math.abs(m.restScale - 3) < 0.001 ? 'OK' : 'NG'}`);

  // ---- 2. ポーズ撮影（0.17秒のモーションを任意のコマで止めて撮る）----
  if (!m.ended) {
    const poses = [
      ['charge', 'r22-pitch-1-windup.png', '振りかぶり（溜め切り・腕とボールが後ろ）'],
      [0.20, 'r22-pitch-2-swing.png', '振りの途中（腕が加速・残像）'],
      [0.42, 'r22-pitch-3-release.png', 'リリース直後（手から弾が出た瞬間）'],
      [0.78, 'r22-pitch-4-follow.png', 'フォロースルー（振り抜き）'],
    ];
    console.log('\n--- ポーズ撮影 ---');
    for (const [u, file, label] of poses) {
      await evalJs(`window.__B.holdU = ${typeof u === 'string' ? `'${u}'` : u}, true`);
      // 目的のフェーズに入るまで待つ
      let ok = false;
      for (let i = 0; i < 200 && !ok; i++) {
        await sleep(50);
        ok = await evalJs(u === 'charge'
          ? `(function(){var s=window.__vortexGame.scene.getScene('Run').billiard.st;
              return !!(s.held && s.chargeT >= 0.8);})()`
          : `(function(){var s=window.__vortexGame.scene.getScene('Run').billiard.st;
              return !!s.wind;})()`);
      }
      if (!ok) { console.log(`  ${file}: フェーズに到達せず（撮影スキップ）`); continue; }
      await sleep(200);
      const png = await send('Page.captureScreenshot', { format: 'png' });
      if (png && png.data) {
        fs.writeFileSync(path.join(HERE, file), Buffer.from(png.data, 'base64'));
        console.log(`  ${file}  ${label}`);
      }
      // 次のポーズへ進むため、いったん解放して投げ切らせる
      await evalJs(`window.__B.holdU = null, true`);
      await sleep(400);
    }
  } else {
    console.log('\n（ボットが死亡したためポーズ撮影はスキップ）');
  }

  console.log(`\nEXCEPTIONS=${exceptions.length}`);
  try { ws.close(); } catch { /* noop */ }
  server.close();
  await evalJs('window.close()');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
