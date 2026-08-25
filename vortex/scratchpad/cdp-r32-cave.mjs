// R32 実測：作り直したどうくつのアイテム9種が**画面で本当に起きているか**。
//
// ⚠️ 旧どうくつが「意味がない」と言われた直接の原因は、効果が設定値にしか無く画面に出ないこと
//    だった。だからここでは設定値を読まない。**観測可能な結果**だけで判定する:
//      すな＝実ダメージが5倍になったか／とけい＝敵が実際に止まったか／
//      むてき＝実際に無傷か／金＝実際に格が上がったか／大小＝実際に大きさと判定が変わったか。
//
// node vortex/scratchpad/cdp-r32-cave.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const PORT = 8911, DBG = 9461;
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
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r32')}`, 'about:blank'], { stdio: 'ignore' });

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
      var r=g.scene.getScene('Run');window.__run=r;return !!(r&&r.boss&&r.items&&r.sys.settings.status>=4);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) throw new Error('Run scene not ready');

  const REP = [];
  const OK = [];
  const say = (s) => { console.log(s); REP.push(s); };
  const check = (name, pass, detail) => {
    OK.push(pass);
    say((pass ? '  ok  ' : '  NG  ') + name + '  ' + detail);
  };

  // 共通の下ごしらえ：主人公を実プレイ相当まで育て、死なないようにする
  await evalJs(`(function(){
    var r = window.__run;
    for (var i = 0; i < 60 && r.level < 20; i++) { try { r.levelup.addXp(200); } catch (e) { break; } }
    if (window.__god) clearInterval(window.__god);
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 16);
    r.practiceMode = true;   // 時間で別のボスが勝手に出てこないようにする（計測の邪魔）
    // 全バフを毎回まっさらにするヘルパ
    window.__clear = function(){ r.buffs = {}; r.sunaShots = 0; };
    return true;
  })()`);

  const table = await evalJs(`(function(){
    var C = window.__run.items;
    return { ある: typeof C.giveReward === 'function' };
  })()`);
  say('計測の口: ' + JSON.stringify(table));

  // ---------- ① こうしえんの すな：実ダメージが5倍になるか ----------
  // ⚠️ 玉のダメージは「掴んだ敵の格」で変わる。掴む相手が毎回ちがうと倍率が測れないので、
  //    比較の間だけ格を0に固定する（両方の条件に同じ固定をかけるので比は歪まない）。
  const suna = await evalJs(`(async function(){
    var r = window.__run;
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    window.__clear();
    // 標的：ボスを1体出し、HPを毎フレーム満タンに戻して「動く的」にする
    r.boss.practiceSpawn('korotama');
    for (var k = 0; k < 100 && !(r.boss.active && r.boss.entity); k++) await wait(100);
    if (!r.boss.entity) return { ボスが出なかった: true };
    await wait(3000);                       // 登場演出ぶん
    // ⚠️ 予告を割った直後の一撃は bossBreakMul 倍になる。324×6＝1944 で maxHp 1800 を
    //    一発で超え、HPを毎回満タンに戻しても的が死んでいた（実測：最低HP -144）。
    //    的のmaxHpごと大きくして、どの一撃でも絶対に死なないようにする。
    r.boss.entity.maxHp = 9999999;
    r.boss.entity.hp = r.boss.entity.maxHp;
    if (window.__pin) clearInterval(window.__pin);
    // ⚠️ ボットは狙いが下手で、離れた的には18秒で3発しか当たらなかった（＝倍率が測れない）。
    //    測りたいのは命中率ではなく「1発のダメージ」なので、的を主人公の真横に固定する。
    window.__pinN = 0; window.__minHp = 1e9; window.__maxHp = 0;
    window.__pin = setInterval(function(){
      var b = r.boss.entity; if (!b) return;
      window.__pinN++;
      if (b.hp < window.__minHp) window.__minHp = b.hp;
      window.__maxHp = b.maxHp;
      b.x = r.player.x + 70; b.y = r.player.y;
    }, 16);

    var ogi = r.gradeIdx.bind(r);
    r.gradeIdx = function(){ return 0; };   // 格を固定（比較のための統制）
    var hits = [];
    var od = r.dealDamage.bind(r);
    // ⚠️ setInterval でHPを戻すやり方は失敗した。実測で pin は 14回/秒しか回らず、
    //    その隙間に取り巻き武器の当たりが積もってHPが -144 まで落ちてボスが死ぬ。
    //    ダメージの入口そのもので毎回満タンに戻す（1発が maxHp 未満なら絶対に死なない）。
    r.dealDamage = function(en, dmg, color, src, at) {
      if (en && en.isBoss) en.hp = en.maxHp;
      if (en && en.isBoss && src === 'manual' && at && at.hitR != null) hits.push(dmg);
      return od(en, dmg, color, src, at);
    };
    // ボスに密着してJを連打する。弾（よろけた雑魚）は手元に用意してやる
    var why = [];
    var mash = async function(sec, refillSuna) {
      hits.length = 0;
      var t0 = Date.now(), end = t0 + sec * 1000, loops = 0;
      while (Date.now() < end) {
        loops++;
        var b = r.boss.entity;
        if (!b) { why.push('的が消えた:' + Math.round((Date.now()-t0)/1000) + '秒/' + loops + '周'); break; }
        if (refillSuna && r.sunaShots <= 0) r.sunaShots = 1;
        // ⚠️ ボス戦中は雑魚の湧きが絞られる（BALANCE.boss.trashInterval）。弾切れで
        //    「投げていないのに弱い」を測ってしまうので、弾は自分で補給する。
        var pool = r.enemies.filter(function(x){ return x.active && !x.isBoss; });
        if (pool.length < 4) { r.spawner.spawnBurst(6); pool = r.enemies.filter(function(x){ return x.active && !x.isBoss; }); }
        // ⚠️ 「よろけた敵が場にいる」ではなく「掴める距離にいる」で見る。
        //    遠くのよろけ敵を数えていたせいで手元が空になり、掴み損ね＝0.3秒しびれを
        //    延々ともらって投げ回数が 0 になっていた（渾身の一投が1回も出なかった原因）。
        if (!r.billiard.st.held && pool.length) {
          var near = pool.filter(function(x){
            return x.stag && Math.hypot(x.x - r.player.x, x.y - r.player.y) < 50; });
          if (!near.length) {
            var cand = pool.filter(function(x){ return !x.stag; })[0] || pool[0];
            cand.x = r.player.x + 14; cand.y = r.player.y;
            if (!cand.stag) { cand.hp = 1; r.enterStagger(cand); }
          }
        }
        if (r.billiard.st.stunT > 0) { await wait(60); continue; }
        if (r.input.activePointer) {
          var cam = r.cameras.main;
          r.input.activePointer.x = b.x - cam.scrollX;
          r.input.activePointer.y = b.y - cam.scrollY;
          r._pointerMoveT = r.elapsed;
        }
        window.dispatchEvent(new KeyboardEvent('keydown',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
        await wait(90);
        window.dispatchEvent(new KeyboardEvent('keyup',
          { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
        await wait(60);
      }
      why.push('周回:' + loops + ' 秒:' + Math.round((Date.now()-t0)/1000)
        + ' ボス生存:' + !!(r.boss.entity) + ' 弾:' + r.enemies.filter(function(x){return x.active && !x.isBoss;}).length);
      return hits.slice();
    };

    var g0 = r.billiard.st.throws || 0;
    var normal = await mash(14, false);
    var thrownNormal = (r.billiard.st.throws || 0) - g0;
    // 配り口の配線確認：giveReward が本当に「渾身の一投」を1回ぶん配るか
    r.sunaShots = 0;
    r.items.giveReward('suna');
    var wired = r.sunaShots;
    var g1 = r.billiard.st.throws || 0;
    var sunaHits = await mash(22, true);
    var thrownSuna = (r.billiard.st.throws || 0) - g1;
    clearInterval(window.__pin);
    r.dealDamage = od; r.gradeIdx = ogi; r.sunaShots = 0;
    var med = function(a){ var s = a.slice().sort(function(p,q){ return p-q; });
      return s.length ? s[Math.floor(s.length/2)] : -1; };
    var n = med(normal), s = med(sunaHits);
    return { ふつう投げた回数: thrownNormal, ふつうの命中数: normal.length, ふつう中央値: n,
             giveRewardが配った回数: wired,
             渾身投げた回数: thrownSuna, 渾身の命中数: sunaHits.length, 渾身中央値: s,
             倍率: n > 0 && s > 0 ? +(s / n).toFixed(2) : -1, 経過: why,
             HP固定の回数: window.__pinN, 観測した最低HP: window.__minHp, ボスのmaxHp: window.__maxHp };
  })()`);
  say('【① こうしえんの すな】' + JSON.stringify(suna));
  check('こうしえんの すな：giveRewardで1回ぶん配られる', suna && suna.giveRewardが配った回数 === 1,
    '配られた回数 ' + (suna && suna.giveRewardが配った回数));
  check('こうしえんの すな：実ダメージが5倍になる', suna && suna.倍率 >= 4.8 && suna.倍率 <= 5.2,
    '実測 ' + (suna && suna.倍率) + '倍（' + (suna && suna.ふつう中央値) + ' → '
      + (suna && suna.渾身中央値) + '）');

  // ---------- ② ときのすなどけい：敵が本当に止まるか ----------
  const clock = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    r.boss.practiceClear();
    // 敵を数体そろえる
    for (var i = 0; i < 40 && r.enemies.filter(function(x){return x.active && !x.isBoss;}).length < 6; i++) {
      await new Promise(function(x){ setTimeout(x, 100); });
    }
    var snap = function(){ return r.enemies.filter(function(x){ return x.active && !x.isBoss; })
      .slice(0, 6).map(function(e){ return { id: e.id, x: e.x, y: e.y }; }); };
    var moved = function(a, b){
      var sum = 0, n = 0;
      for (var i = 0; i < a.length; i++) {
        var m = b.find(function(z){ return z.id === a[i].id; });
        if (!m) continue;
        sum += Math.hypot(m.x - a[i].x, m.y - a[i].y); n++;
      }
      return n ? +(sum / n).toFixed(1) : -1;
    };
    // 通常時：1秒で敵はどれだけ動くか
    var a0 = snap(); var p0 = { x: r.player.x, y: r.player.y };
    await new Promise(function(x){ setTimeout(x, 1000); });
    var normalEnemy = moved(a0, snap());
    // 時間停止中：同じ1秒
    r.items.giveReward('clock');
    var a1 = snap(); var p1 = { x: r.player.x, y: r.player.y };
    await new Promise(function(x){ setTimeout(x, 1000); });
    var stoppedEnemy = moved(a1, snap());
    var stillOn = r.hasBuff('clock');
    return { ふつうの1秒で敵が動いた距離: normalEnemy, 時間停止中の1秒: stoppedEnemy,
             とまった割合: normalEnemy > 0 ? Math.round((1 - stoppedEnemy / normalEnemy) * 100) + '%' : '-',
             まだ効いている: stillOn };
  })()`);
  say('【② ときのすなどけい】' + JSON.stringify(clock));
  check('ときのすなどけい：敵の動きが9割以上止まる',
    clock && clock.ふつうの1秒で敵が動いた距離 > 0
      && clock.時間停止中の1秒 <= clock.ふつうの1秒で敵が動いた距離 * 0.15,
    clock && (clock.ふつうの1秒で敵が動いた距離 + 'px → ' + clock.時間停止中の1秒 + 'px'));

  // ---------- ③ スターダスト：本当に無傷か＋触れた敵がよろけるか ----------
  const star = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    clearInterval(window.__god);          // ★HPを戻す細工を外す（無敵を測るので）
    r.player.hp = r.player.maxHp;
    var hurt = 0;
    var oh = r.hitPlayer.bind(r);
    r.hitPlayer = function(d, x, y){ var b = r.player.hp; oh(d, x, y); if (r.player.hp < b) hurt++; };
    // 敵の真ん中へ突っ込み続ける（同じ動きを「無敵なし」「無敵あり」の2回やって比べる）
    var charge = async function(sec){
      var t0 = Date.now();
      while (Date.now() - t0 < sec * 1000) {
        var c = r.enemies.filter(function(e){ return e.active && !e.isBoss && !e.stag; });
        if (c.length) {
          var dx = c[0].x - r.player.x, dy = c[0].y - r.player.y, d = Math.hypot(dx, dy) || 1;
          r.player.x += (dx/d) * 4; r.player.y += (dy/d) * 4;
        }
        await new Promise(function(x){ setTimeout(x, 30); });
      }
    };
    // ★対照：無敵なしで同じことをして、そもそも痛いのかを確かめる
    r.player.invuln = 0; hurt = 0;
    var hpC = r.player.hp;
    await charge(5);
    var ctrl = { へったHP: hpC - r.player.hp, 被弾回数: hurt };

    r.player.hp = r.player.maxHp; r.player.invuln = 0; hurt = 0;
    r.items.giveReward('star');
    var hp0 = r.player.hp;
    var stagBefore = r.enemies.filter(function(e){ return e.active && e.stag; }).length;
    await charge(6);
    var stagAfter = r.enemies.filter(function(e){ return e.active && e.stag; }).length;
    var res = { 対照_無敵なし5秒: ctrl,
                無敵6秒で減ったHP: hp0 - r.player.hp, 被弾回数: hurt,
                よろけ敵: stagBefore + '→' + stagAfter,
                ふれた敵がよろけた: stagAfter > stagBefore,
                のこり秒: +r.buffT('star').toFixed(1) };
    r.hitPlayer = oh;
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 16);
    return res;
  })()`);
  say('【③ スターダスト】' + JSON.stringify(star));
  check('対照：無敵なしなら同じ動きで痛い（計測が成立している）',
    star && star.対照_無敵なし5秒 && star.対照_無敵なし5秒.へったHP > 0,
    'へったHP ' + (star && star.対照_無敵なし5秒 && star.対照_無敵なし5秒.へったHP));
  check('スターダスト：6秒つっこんでHPが減らない', star && star['無敵6秒で減ったHP'] === 0,
    'へったHP ' + (star && star['無敵6秒で減ったHP']));
  check('スターダスト：ぶつかった敵がよろける', star && star.ふれた敵がよろけた === true,
    'よろけ ' + (star && star.よろけ敵));

  // ---------- ④ ゴールドスーツ：見た目が金色になり、掴んだ弾の格が上がるか ----------
  const gold = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    var e = r.enemies.find(function(x){ return x.active && !x.isBoss; });
    if (!e) return { 敵がいない: true };
    var before = r.gradeIdx(e);
    r.items.giveReward('gold');
    await new Promise(function(x){ setTimeout(x, 120); });
    var after = r.gradeIdx(e);
    return { 格: before + '→' + after,
             あがったか: after > before,
             主人公の色: '0x' + (r.playerImg.tintTopLeft >>> 0).toString(16),
             きんいろか: r.playerImg.tintTopLeft === 0xffd23f,
             のこり秒: Math.round(r.buffT('gold')) };
  })()`);
  say('【④ ゴールドスーツ】' + JSON.stringify(gold));
  check('ゴールドスーツ：見た目が金色＋弾の格が1段あがる',
    gold && gold.あがったか && gold.きんいろか, gold && (gold.格 + ' / ' + gold.主人公の色));

  // ---------- ⑤⑥ ビッグ／ミニ：見た目と当たり判定が本当に変わるか ----------
  const size = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    await new Promise(function(x){ setTimeout(x, 120); });
    var base = { scale: +r.playerImg.scaleX.toFixed(2), radius: r.player.radius,
                 grab: Math.round(r.strikeRange()) };
    r.items.giveReward('big');
    await new Promise(function(x){ setTimeout(x, 150); });
    var big = { scale: +r.playerImg.scaleX.toFixed(2), radius: r.player.radius,
                grab: Math.round(r.strikeRange()) };
    window.__clear();
    await new Promise(function(x){ setTimeout(x, 150); });
    r.items.giveReward('mini');
    await new Promise(function(x){ setTimeout(x, 150); });
    var mini = { scale: +r.playerImg.scaleX.toFixed(2), radius: r.player.radius,
                 grab: Math.round(r.strikeRange()), うごき: r._buffMove };
    window.__clear();
    await new Promise(function(x){ setTimeout(x, 150); });
    var back = { scale: +r.playerImg.scaleX.toFixed(2), radius: r.player.radius };
    return { ふつう: base, ビッグ: big, ミニ: mini, きれたあと: back };
  })()`);
  say('【⑤⑥ ビッグ／ミニ】' + JSON.stringify(size));
  check('ビッグドリンク：見た目も当たり判定も大きくなる',
    size && size.ビッグ.scale > size.ふつう.scale && size.ビッグ.radius > size.ふつう.radius
      && size.ビッグ.grab > size.ふつう.grab,
    size && ('scale ' + size.ふつう.scale + '→' + size.ビッグ.scale
      + ' / radius ' + size.ふつう.radius + '→' + size.ビッグ.radius));
  check('ミニドリンク：小さく・速く・届かなくなる',
    size && size.ミニ.scale < size.ふつう.scale && size.ミニ.radius < size.ふつう.radius
      && size.ミニ.grab < size.ふつう.grab && size.ミニ.うごき > 1,
    size && ('scale ' + size.ミニ.scale + ' / radius ' + size.ミニ.radius
      + ' / うごき ×' + size.ミニ.うごき));
  check('きれたら元に戻る', size && size.きれたあと.scale === size.ふつう.scale
      && size.きれたあと.radius === size.ふつう.radius,
    size && JSON.stringify(size.きれたあと));

  // ---------- ⑦ マシンガンアーム：掴んだ瞬間に溜め切りになるか ----------
  const machine = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    var B = r.billiard;
    var wait = function(ms){ return new Promise(function(x){ setTimeout(x, ms); }); };
    // 「掴めた瞬間の溜め」を読む。前の投球（wind 0.17秒＋cd）が完全に終わってから押す。
    var grabAndRead = async function(){
      for (var w = 0; w < 60 && (B.st.wind || B.st.held || B.st.cd > 0 || B.st.stunT > 0); w++) await wait(50);
      var c = r.enemies.filter(function(e){ return e.active && !e.isBoss && !e.stag; });
      if (c.length < 1) { r.spawner.spawnBurst(6); await wait(100);
        c = r.enemies.filter(function(e){ return e.active && !e.isBoss && !e.stag; }); }
      if (!c.length) return { 溜め: -1, りゆう: '弾になる敵がいない' };
      var t = c[0];
      t.x = r.player.x + 14; t.y = r.player.y;
      t.hp = 1; r.enterStagger(t);
      window.dispatchEvent(new KeyboardEvent('keydown',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      var ct = -1, held = false;
      // ⚠️ 獲物が1フレームでも掴める距離から外れると「掴み損ね＝0.3秒しびれ」になり、
      //    測りたいものの手前で失敗する。掴めるまで手元に貼り付けておく。
      for (var i = 0; i < 12 && !held; i++) {
        if (t.active) { t.x = r.player.x + 14; t.y = r.player.y; }
        await wait(20);
        if (B.st.held) { held = true; ct = B.st.chargeT; }
      }
      var snap = { held: held, 溜め: held ? +ct.toFixed(2) : -1,
                   cd: +B.st.cd.toFixed(2), wind: !!B.st.wind, stun: +(B.st.stunT || 0).toFixed(2) };
      window.dispatchEvent(new KeyboardEvent('keyup',
        { key: 'j', code: 'KeyJ', keyCode: 74, which: 74, bubbles: true }));
      await wait(600);
      return snap;
    };
    var normal = await grabAndRead();
    r.items.giveReward('machine');
    await wait(150);
    var fast = await grabAndRead();
    return { ふつう: normal, マシンガン中: fast, さいだい: 0.85,
             かかっている: r.hasBuff('machine') };
  })()`);
  say('【⑦ マシンガンアーム】' + JSON.stringify(machine));
  check('マシンガンアーム：掴んだ瞬間に溜め切り',
    machine && machine['マシンガン中'] && machine['ふつう']
      && machine['マシンガン中'].溜め >= 0.84
      && machine['ふつう'].溜め >= 0 && machine['ふつう'].溜め < 0.5,
    machine && ('ふつう ' + machine['ふつう'].溜め + '秒 → マシンガン '
      + machine['マシンガン中'].溜め + '秒'));

  // ---------- ⑧ ビリビリホイッスル：画面じゅうがよろけるか ----------
  const whistle = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    for (var i = 0; i < 40 && r.enemies.filter(function(x){return x.active && !x.isBoss && !x.stag;}).length < 8; i++) {
      await new Promise(function(x){ setTimeout(x, 100); });
    }
    var before = r.enemies.filter(function(e){ return e.active && e.stag; }).length;
    var alive = r.enemies.filter(function(e){ return e.active && !e.isBoss; }).length;
    r.items.giveReward('whistle');
    await new Promise(function(x){ setTimeout(x, 60); });
    var after = r.enemies.filter(function(e){ return e.active && e.stag; }).length;
    return { 場にいた雑魚: alive, よろけ: before + '→' + after, ふえた: after - before };
  })()`);
  say('【⑧ ビリビリホイッスル】' + JSON.stringify(whistle));
  check('ビリビリホイッスル：雑魚が一斉によろける', whistle && whistle.ふえた >= 5,
    '一度に ' + (whistle && whistle.ふえた) + '体');

  // ---------- ⑨ ほしのたて：全回復するか ----------
  const heal = await evalJs(`(async function(){
    var r = window.__run;
    window.__clear();
    clearInterval(window.__god);
    r.player.hp = 20;
    var maxBefore = r.player.maxHp;
    r.items.giveReward('heal');
    await new Promise(function(x){ setTimeout(x, 60); });
    var res = { HP: '20→' + r.player.hp, さいだいHP: maxBefore + '→' + r.player.maxHp,
                まんたんか: r.player.hp === r.player.maxHp, むてき秒: +r.player.invuln.toFixed(1) };
    window.__god = setInterval(function(){ if (r.player) r.player.hp = r.player.maxHp; }, 16);
    return res;
  })()`);
  say('【⑨ ほしのたて】' + JSON.stringify(heal));
  check('ほしのたて：全回復＋最大HPアップ＋短い無敵',
    heal && heal.まんたんか && heal.むてき秒 > 0, heal && (heal.HP + ' / ' + heal.さいだいHP));

  const ng = OK.filter((x) => !x).length;
  say('');
  say(ng === 0 ? `どうくつ9種：${OK.length}/${OK.length} 合格` : `⚠️ ${ng} 件 NG`);
  console.log(NL + 'EXCEPTIONS=' + exceptions);
  fs.writeFileSync(path.join(HERE, 'r32-cave.txt'),
    REP.join(NL) + NL + 'EXCEPTIONS=' + exceptions + NL);
  try { await send('Browser.close'); } catch { /* noop */ }
  server.close();
  process.exit(ng === 0 && exceptions === 0 ? 0 : 1);
}

main().catch((e) => { console.log('FAIL', e && e.message); process.exit(1); });
