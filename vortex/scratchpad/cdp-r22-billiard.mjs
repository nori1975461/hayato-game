// R22スパイク：ビリヤード攻撃（掴む→溜める→投げる）の実行時検証＋実測
//
// 構文チェックでは実行時エラーは捕まらない（タイトル画面クラッシュの教訓）。まず「落ちずに動くか」。
// そのうえで合議が指摘した3つの未決を数字で見る：
//   ① 投げは何回/分・平均何体倒すか（「使わなくても死なない技」になっていないか）
//   ② 溜めは使われるか（速度だけを買う設計だと最小溜め連打が支配戦略になる）
//   ③ 時間切れ＝消滅にすると、掴みだけで湧きと釣り合ってしまわないか
//
// node vortex/scratchpad/cdp-r22-billiard.mjs <seed> <drift 0|1|2> <expire vanish|reboot> [秒]
//   drift 0=歩く（現行） 1=ゆっくり漂う 2=その場で漂う
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8853, DBG = 9403;
const SEED = process.argv[2] || '42';
const DRIFT = Number(process.argv[3] || 0);
const EXPIRE = (process.argv[4] || 'vanish') === 'vanish';
const RUN_SEC = Number(process.argv[5] || 90);
const FORCE_LV = Number(process.argv[6] || 0);   // 段位の見た目を確認するためにレベルを固定する
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

// ボットは「溜めてから投げる」を再現する。⚠️ r.update を差し替えても効かない
// （Phaser は Systems.init で scene.update をキャッシュする）。Run.update から毎フレーム
// 呼ばれる updateHeroFist を包むのが既存スクリプトと共通の手法。
const INSTALL = `(function(){
  var g = window.__vortexGame; if(!g) return 'no game';
  var r = g.scene.getScene('Run'); if(!r) return 'no run';
  if (!r.billiard) return 'no billiard';
  if (r.__r22) return 'already';
  r.__r22 = true;

  r.billiard.st.driftIdx = ${DRIFT};
  r.billiard.st.expireVanish = ${EXPIRE};
  if (${FORCE_LV} > 0) {
    r.level = ${FORCE_LV};
    r.billiard.st.tierIdx = 0;   // 段位アップの演出も1回見る
  }
  // 炸裂した瞬間を撮るための目印
  var origShake = r.shake.bind(r);
  r.shake = function(dur, px){ if (px >= 6) window.__burstAt = performance.now(); return origShake(dur, px); };

  var B = window.__B = {
    frames: 0, deadAt: null, nextSec: 0, perSec: [],
    charges: [],          // 実際に溜めた秒数
    expired: 0,           // 時間切れで消えた獲物
    hurt: 0, hurtLow: 0,  // 被弾回数 / HP30%未満のフレーム
    TARGET: 0.45,         // ボットの狙う溜め秒（人間の中間的な溜め）
  };

  var origHurt = r.hitPlayer.bind(r);
  r.hitPlayer = function(d, sx, sy){ B.hurt++; return origHurt(d, sx, sy); };
  var origKill = r.killEnemy.bind(r);
  r.killEnemy = function(e, color, src){ if (src === 'expire') B.expired++; return origKill(e, color, src); };
  // ジェル回復（R22 FB）。ゲームと同じ入口を包んで、実際に発火した回数だけを数える。
  const origGemHeal = r.gainGemHeal.bind(r);
  B.gemHeals = 0; B.gemPicks = 0;
  r.gainGemHeal = function(n){
    B.gemPicks += n;
    const hpBefore = r.player.hp, before = r.gemHealCount;
    origGemHeal(n);
    if (r.gemHealCount < before + n) B.gemHeals++;
    void hpBefore;
  };

  var origFist = r.updateHeroFist.bind(r);
  r.updateHeroFist = function(dt){
    origFist(dt);
    if (!r.player || r.ended) { if (B.deadAt === null && r.ended) B.deadAt = r.elapsed; return; }
    B.frames++;
    if (r.player.hp < r.player.maxHp * 0.3) B.hurtLow++;
    var t = r.elapsed, px = r.player.x, py = r.player.y;
    var bs = r.billiard.st;

    // ---- 攻撃：獲物がいれば掴んで TARGET 秒だけ溜めて投げる。いなければ突く ----
    var reach = 78 + (r.playerStage - 1) * 12;
    var hasPrey = false, stagCount = 0, nearestStag = 1e9;
    for (var i=0;i<r.enemies.length;i++){
      var e = r.enemies[i];
      if (!e || !e.active || e.isBoss || !e.stag) continue;
      stagCount++;
      var dx = e.x-px, dy = e.y-py, d = Math.sqrt(dx*dx+dy*dy);
      if (d < nearestStag) nearestStag = d;
      if (d <= reach) hasPrey = true;
    }
    if (r._jKey) {
      if (bs.held) {
        var keep = bs.chargeT < B.TARGET;
        if (!keep && r._jKey.isDown) B.charges.push(Math.round(bs.chargeT*100)/100);
        r._jKey.isDown = keep;
      } else {
        r._jKey.isDown = true;   // 押しっぱなし＝獲物が入れば掴み、いなければ突き（CD刻み）
      }
    }

    while (t >= B.nextSec && B.nextSec <= 300) {
      var pop = 0;
      for (var pi=0; pi<r.enemies.length; pi++){ var pe=r.enemies[pi];
        if (pe && pe.active && !pe.isBoss) pop++; }
      B.perSec.push({ s: B.nextSec, stag: stagCount, pop: pop, thr: bs.throws,
                      near: (nearestStag<1e9?Math.round(nearestStag):-1),
                      hp: Math.round(r.player.hp) });
      B.nextSec++;
    }

    // ---- 移動：最寄りジェムを追う／HP半分以下なら最寄り敵から離れる（既存スクリプトと同一）----
    var kk = r.moveKeys; if (!kk) return;
    kk.left.isDown = kk.right.isDown = kk.up.isDown = kk.down.isDown = false;
    kk.a.isDown = kk.d.isDown = kk.w.isDown = kk.s.isDown = false;
    var tx=null, ty=null, bg=1e9;
    var gems = r.gems || [];
    for (var gi=0; gi<gems.length; gi++){ var gm=gems[gi]; if(!gm||!gm.active) continue;
      var dd=(gm.x-px)*(gm.x-px)+(gm.y-py)*(gm.y-py); if(dd<bg){bg=dd;tx=gm.x;ty=gm.y;} }
    if (r.player.hp < r.player.maxHp*0.5) {
      var ed=1e9, ex=null, ey=null;
      for (var ei=0; ei<r.enemies.length; ei++){ var en=r.enemies[ei]; if(!en||!en.active) continue;
        var d2=(en.x-px)*(en.x-px)+(en.y-py)*(en.y-py); if(d2<ed){ed=d2;ex=en.x;ey=en.y;} }
      if (ex!=null && ed<90*90){ tx=px*2-ex; ty=py*2-ey; }
    }
    if (tx==null) return;
    var ddx=tx-px, ddy=ty-py;
    if (ddx<-4) kk.left.isDown=true; else if (ddx>4) kk.right.isDown=true;
    if (ddy<-4) kk.up.isDown=true; else if (ddy>4) kk.down.isDown=true;
  };
  return 'ok';
})()`;

const REPORT = `(function(){
  var B = window.__B; if(!B) return JSON.stringify({err:'no B'});
  var r = window.__vortexGame.scene.getScene('Run');
  var s = r.billiard.st;
  var avg = function(a){ return a.length ? a.reduce(function(x,y){return x+y;},0)/a.length : 0; };
  return JSON.stringify({
    elapsed: Math.round(r.elapsed*10)/10, alive: !!(r.player && r.player.hp>0), ended: !!r.ended,
    level: r.level, party: (r.party||[]).length, kills: r.kills,
    mode: s.mode, drift: s.driftIdx, vanish: !!s.expireVanish,
    grabs: s.grabs, throws: s.throws, jabs: s.jabs, jabStaggers: s.jabStaggers,
    throwKills: s.throwKills, bestChain: s.bestChain, dud: s.dud,
    avgCharge: Math.round(avg(B.charges)*1000)/1000, nCharge: B.charges.length,
    expired: B.expired, hurt: B.hurt, lowHpFrames: B.hurtLow, frames: B.frames,
    gemHeals: B.gemHeals, gemPicks: B.gemPicks, hp: Math.round(r.player.hp), maxHp: r.player.maxHp,
    perSec: B.perSec,
  });
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

  for (let i = 0; i < 100; i++) {
    let busy = false;
    try { await fetch(`http://127.0.0.1:${DBG}/json/version`); busy = true; } catch { busy = false; }
    if (!busy) break;
    await sleep(200);
  }

  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r22')}`, 'about:blank'], { stdio: 'ignore' });

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
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})),
                window.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})), true`);
  await sleep(800);
  const inst = await evalJs(INSTALL);
  if (inst !== 'ok') { console.log('INSTALL_FAILED=' + inst); process.exit(1); }

  // 実プレイの等倍で見た目を判定するためのスクリーンショット（拡大PNGだけで良し悪しを決めない）。
  // 殴っている瞬間を捉えたいので、_punchT が立っているフレームを待って撮る。
  const shots = [];
  for (let i = 0; i < RUN_SEC * 25 && shots.length < 3; i++) {
    await sleep(40);
    // 1枚目=溜め中（照準ラインが見えるか）／2枚目以降=飛翔中（軌跡と着弾）
    const want = shots.length === 0
      ? `(function(){var r=window.__vortexGame.scene.getScene('Run');
          return !!(r && r.billiard.st.held && r.billiard.st.chargeT > 0.3) ? 1 : 0;})()`
      : shots.length === 1
        ? `(function(){var r=window.__vortexGame.scene.getScene('Run');
            return (r && r.billiard.st.shots.some(function(x){return x.active && x.kills>0;})) ? 1 : 0;})()`
        : `(window.__burstAt && performance.now() - window.__burstAt < 130) ? 1 : 0`;
    const punching = await evalJs(want);
    if (punching) {
      const png = await send('Page.captureScreenshot', { format: 'png' });
      if (png && png.data) {
        const f = path.join(HERE, `r22-punch-${shots.length + 1}.png`);
        fs.writeFileSync(f, Buffer.from(png.data, 'base64'));
        shots.push(f);
      }
      await sleep(900);
    }
  }
  await sleep(Math.max(0, RUN_SEC * 1000 - 30000));
  const r = JSON.parse(await evalJs(REPORT));
  console.log('SHOTS=' + shots.length + (shots.length ? ' → ' + shots.map((x) => path.basename(x)).join(' ') : ''));

  const driftName = ['歩く（現行）', 'ゆっくり漂う', 'その場で漂う'][r.drift] || '?';
  console.log(`===== seed=${SEED} / よろけ=${driftName} / 時間切れ=${r.vanish ? '消滅' : '復活'} =====`);
  console.log(`BOOT_OK=${r.frames > 0 ? 'YES' : 'NO'} FRAMES=${r.frames} EXCEPTIONS=${exceptions.length}`);
  for (const e of exceptions.slice(0, 5)) console.log('  [EXC] ' + e);
  console.log(`実測 ${r.elapsed}s / Lv${r.level} 仲間${r.party}体 / 生存=${r.alive} / 総撃破${r.kills}`);
  console.log(`--- ①投げ ---`);
  const perMin = r.elapsed > 0 ? (r.throws / r.elapsed * 60) : 0;
  // ⚠️ billiard.st.throwKills は過小。burstStagger の戻り値 total は「よろけを何体割ったか」だけで、
  //    炸裂が健常敵へ通す burstDamage(16) の巻き添え撃破（src='manual' なので本当に死ぬ）を数えない。
  //    消滅モードでは主人公以外に敵を倒せる者がいない（仲間・自動拳は enterStagger 止まり）ので、
  //    「総撃破 − 掴み − 時間切れ」が投げに帰属する撃破の正しい実数になる。本体と同じ条件式で数える。
  const realKills = r.vanish ? (r.kills - r.grabs - r.expired) : null;
  console.log(`THROWS=${r.throws} (${perMin.toFixed(1)}回/分)`);
  if (realKills !== null) {
    console.log(`AVG_KILLS=${r.throws ? (realKills / r.throws).toFixed(2) : 0}体/投げ  (投げ帰属の撃破 ${realKills} ＝ 総撃破${r.kills} − 掴み${r.grabs} − 時間切れ${r.expired})`);
  } else {
    console.log(`AVG_KILLS=計測不可（復活モードでは仲間が復活体を倒せるため帰属を分離できない）`);
  }
  console.log(`  参考: st.throwKills=${r.throwKills}（連鎖で割ったよろけのみ。巻き添え撃破を含まない過小値）`);
  console.log(`BEST_CHAIN=${r.bestChain}  DUD=${r.dud} (0体で終わった投げ)`);
  console.log(`--- ②溜め ---`);
  console.log(`AVG_CHARGE=${r.avgCharge}s (n=${r.nCharge})  ※ボットは0.45秒狙い。仕様上限0.85秒`);
  console.log(`--- ③掴み・突き・消滅 ---`);
  console.log(`GEM_HEALS=${r.gemHeals} (ジェル${r.gemPicks}個ぶん取得 → ${r.gemHeals ? (r.elapsed / r.gemHeals).toFixed(1) : '-'}秒に1回回復) HP=${r.hp}/${r.maxHp}`);
  console.log(`GRABS=${r.grabs}  JABS=${r.jabs} → 突きで作った獲物=${r.jabStaggers}  EXPIRED=${r.expired}`);
  console.log(`--- 被弾（②緊張感の材料）---`);
  console.log(`HURT=${r.hurt}回  LOW_HP_FRAMES=${r.lowHpFrames}/${r.frames} (${r.frames ? (r.lowHpFrames / r.frames * 100).toFixed(1) : 0}%)`);
  console.log('--- 推移（s: よろけ体数 / 場の敵 / 投げ累計 / 最寄りよろけpx / HP） ---');
  for (const p of r.perSec.filter((x) => x.s <= 12 || x.s % 15 === 0)) {
    console.log(`  ${String(p.s).padStart(3)}s: stag=${p.stag} pop=${p.pop} throws=${p.thr} near=${p.near} hp=${p.hp}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
