// R25 検証：弾の「格」・断末魔・王冠を入れたあと、狙いどおりになったか。
// （調査版は cdp-r25-prey.mjs。こちらは実装後の実測用）
//
// 測るのは4つ。提案の前に**事実**を確定させる。
//   A 何を掴んでいるか（種類別・エリート別）
//   B 弾に与えた貫通HPのうち、実際に使われたのは何%か（＝強い敵を掴む報酬は届いているか）
//   C 掴んだ相手の強さと、その1投の戦果（撃破数・連鎖）の関係
//   D エリート3体（110/200/290秒）の顛末＝よろけたか・掴まれたか・復帰したか
//   E 掴む直前3秒に受けたダメージ（＝払ったリスク）。nogod のときだけ意味がある
//
// node vortex/scratchpad/cdp-r25-prey.mjs [seed] [秒] [god|nogod]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 8894, DBG = 9444;
const SEED = process.argv[2] || '42';
const SECS = Number(process.argv[3] || 420);
const GOD = process.argv[4] !== 'nogod';
// R26の機能だけを止めた対照ラン。同じビルド・同じseedで被弾の差分を取るために使う。
// （ボットは死ぬ時刻がランごとに大きくぶれるので、生存時間の比較では判定できない）
const OFF = process.argv[5] === 'off';
// R29W2: つかみ失敗の罰（弾かれ＋しびれ）だけを止めた対照ラン。同じビルド・同じseedで
//        生存時間と被弾を突き合わせて「難易度をどれだけ上げたか」を測るために使う。
const NOBLOCK = process.argv[6] === 'noblock';
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

const INSTALL = `(function(){
  var g = window.__vortexGame; if(!g) return 'no game';
  var r = g.scene.getScene('Run'); if(!r) return 'no run';
  if (!r.billiard) return 'no billiard';
  if (r.__r28) return 'already';
  r.__r28 = true;
  var GOD = ${GOD};
  if (${OFF}) { r.startDeathThroe = function(){}; r.maybeCrown = function(){}; }
  if (${NOBLOCK}) { var K = r.billiard.st; Object.defineProperty(K, 'stunT', { get: function(){ return 0; }, set: function(){}, configurable: true }); }
  var B = window.__B = {
    frames: 0, god: GOD,
    grabs: [],       // {t, id, elite, maxHp, riskDmg}
    throws: [],      // {t, id, elite, heldHp, hp0, used, kills, chain}
    elites: [],      // {t, id, maxHp, staggered, grabbed, rebooted}
    hpLog: [], dmgWindow: [],   // 直近の被弾（{t, dmg}）
    open: [],        // 追跡中の弾
    lastHeld: null,
    prevHp: null, totalTaken: 0,
    lives: [], aliveSum: 0, aliveN: 0, aliveMax: 0, deadHook: 0,
    gradeGrab: [0,0,0,0], gradeThrow: [[],[],[],[]],   // 格ごとの掴みと1投の戦果
    crowns: 0, crownGrabs: 0, throes: 0, fuses: 0, throeHits: 0, handBooms: 0,
    bossDmg: { shard: 0, grade: 0, spec: 0 },
    fired: [],        // 断末魔が発火したときの命中/回避
    killT: [],        // 全撃破の時刻（同時性を測る）
    beats: [],        // 連打の1発ごと {i, t}
    finales: [],      // 締め {n}
    gaps: [],         // ビートの実測間隔(ms)
    throwKills: [],   // 1投あたりの撃破数
    throeLog: [],     // {id, out}  断末魔の顛末（発火したか／何で消えたか）
    fuseLog: [],      // 導火線（ボンバ）の顛末
    crownLife: [],    // {age, src, dist} 王冠が生まれてから消えるまで
    holdSec: [[],[],[],[]],  // 格ごとの「掴んでから投げるまで」の秒数
    stagToGrab: [],   // よろけてから掴むまでの秒数
  };

  // ★R27 連打（ガガガガ）が本当に鳴っているかを、実装と同じ経路で数える。
  //   crushBeat / crushFinale は Run のメソッドなので、そのまま包める。
  if (r.crushBeat) {
    var ob = r.crushBeat.bind(r);
    r.crushBeat = function(it, i, P){
      var now = performance.now();
      if (B.__lastBeat != null && now - B.__lastBeat < 400) B.gaps.push(Math.round(now - B.__lastBeat));
      B.__lastBeat = now;
      B.beats.push({ i: i, t: Math.round(now) });
      return ob(it, i, P);
    };
  }
  if (r.crushFinale) {
    var of2 = r.crushFinale.bind(r);
    r.crushFinale = function(n, x, y){ B.finales.push(n | 0); return of2(n, x, y); };
  }

  // 被弾を拾う（プレイヤーのHP減少をフレーム差分で見る。無敵時は0になる）
  var origFist = r.updateHeroFist.bind(r);
  r.updateHeroFist = function(dt){
    origFist(dt);
    if (!r.player || r.ended) return;
    B.frames++;
    var now = r.elapsed;
    if (B.prevHp != null && r.player.hp < B.prevHp) {
      var d = B.prevHp - r.player.hp;
      B.totalTaken += d;
      B.dmgWindow.push({ t: now, dmg: d });
    }
    B.prevHp = r.player.hp;
    while (B.dmgWindow.length && now - B.dmgWindow[0].t > 3.0) B.dmgWindow.shift();
    if (GOD) { r.player.hp = r.player.maxHp; B.prevHp = r.player.hp; }

    var bs = r.billiard.st;

    // ---- 雑魚の生存時間と場の敵数 ----
    // 「一定時間生き残った敵を格上げする」案の閾値は、実際の生存時間を知らないと決められない。
    var alive = 0;
    for (var v = 0; v < r.enemies.length; v++) {
      var ev = r.enemies[v];
      if (!ev.active || ev.isBoss) continue;
      alive++;
      if (ev.__born == null) ev.__born = now;
      ev.__age = now - ev.__born;
    }
    B.aliveSum += alive; B.aliveN++;
    B.aliveMax = Math.max(B.aliveMax, alive);
    if (!B.fireHook) {
      B.fireHook = 1;
      var origFire = r.fireEnemyAttack.bind(r);
      r.fireEnemyAttack = function(en){
        var wasThroe = !!(en && en.throe);
        var hp0 = r.player.hp;
        var ret = origFire(en);
        if (wasThroe) {
          // quake/selfdestruct は同期で当たるのでここで判定できる。
          // spread(タレット)は弾を撃つだけなので「撃たれた」までしか分からない＝別枠。
          var kind = (en.def && en.def.attack && en.def.attack.type) || '?';
          var hit = r.player.hp < hp0;
          B.fired.push({ id: en.def ? en.def.id : '?', kind: kind, hit: hit });
        }
        return ret;
      };
    }
    if (!B.deadHook) {
      B.deadHook = 1;
      var origKill = r.killEnemy.bind(r);
      r.killEnemy = function(e, color, src){
        if (e && e.__thRec && e.__thRec.out === 'まだ') {
          e.__thRec.out = (src === 'grab') ? '掴まれて消滅'
            : (src === 'manual') ? '割られて消滅' : ('消滅:' + (src || '?'));
        }
        if (e && e.__cw) {
          B.crownLife.push({ age: +(r.elapsed - e.__cwT).toFixed(1),
                             src: src || '?', dist: e.__cwD, id: e.def ? e.def.id : '?' });
          e.__cw = 0;
        }
        if (e && e.__stagT != null && src === 'grab') B.stagToGrab.push(+(r.elapsed - e.__stagT).toFixed(2));
        if (e && !e.isBoss && e.__born != null && !e.__logged) {
          e.__logged = 1;
          B.lives.push({ id: e.def ? e.def.id : '?', age: +(r.elapsed - e.__born).toFixed(1),
                         src: src || '?', elite: !!e.isElite });
          B.killT.push(+r.elapsed.toFixed(3));
        }
        return origKill(e, color, src);
      };
    }

    // ---- 王冠と断末魔の発生数 ----
    for (var c1 = 0; c1 < r.enemies.length; c1++) {
      var ec = r.enemies[c1];
      if (!ec.active) continue;
      if (ec.crown && !ec.__cw) {
        ec.__cw = 1; B.crowns++;
        ec.__cwT = now;
        ec.__cwD = Math.round(Math.hypot(ec.x - r.player.x, ec.y - r.player.y));
      }
      if (ec.stag && ec.__stagT == null) ec.__stagT = now;
      // 断末魔（上位の反撃）と導火線（ボンバ）は別物なので分けて数える
      if (ec.throe && !ec.__th) {
        ec.__th = 1;
        var isF = ec.def && ec.def.id === 'bomba';
        if (isF) B.fuses++; else B.throes++;
        ec.__thRec = { id: ec.def ? ec.def.id : '?', out: 'まだ', fuse: !!isF };
        (isF ? B.fuseLog : B.throeLog).push(ec.__thRec);
      }
      // ★顛末の判定。ゲーム本体と同じ条件式で見る（発火だけが「体験された1回」）
      if (ec.__thRec && ec.__thRec.out === 'まだ') {
        // 本体は発火時に throe=false / atkT=1e9 にする
        if (!ec.throe) ec.__thRec.out = '発火';
        // 予告中に殴られるとカウンター（atkState が ready に戻る）
        else if (ec.atkState !== 'telegraph') ec.__thRec.out = 'カウンタで停止';
        else if (ec.rebooted) ec.__thRec.out = '復帰で消滅';
      }
    }
    if (r.billiard && r.billiard.st) {
      var bst = r.billiard.st;
      B.spec = { boltsGot: bst.boltsGot || 0, boltHits: bst.boltHits || 0,
                 blastHits: bst.blastHits || 0, magmanGrabs: B.__mg || 0 };
      B.handBooms = bst.handBooms || 0;
      B.crownGrabs = bst.crownGrabs || 0;
      if (bst.gradeGrabs) B.gradeGrab = bst.gradeGrabs.slice();
    }

    // ---- エリートの顛末 ----
    for (var i = 0; i < r.enemies.length; i++) {
      var e = r.enemies[i];
      if (!e.active || !e.isElite) continue;
      if (!e.__el) {
        e.__el = { t: Math.round(now), id: e.def ? e.def.id : '?', maxHp: Math.round(e.maxHp),
                   staggered: false, grabbed: false, rebooted: false };
        B.elites.push(e.__el);
      }
      if (e.stag) e.__el.staggered = true;
      if (e.rebooted) e.__el.rebooted = true;
    }

    // ---- 1投あたりの撃破数（弾が消える瞬間に確定する）----
    if (bs.shots) {
      for (var si = 0; si < bs.shots.length; si++) {
        var sh = bs.shots[si];
        if (sh && sh.active) { sh.__seen = 1; sh.__k = sh.kills; }
        else if (sh && sh.__seen && !sh.__done) { sh.__done = 1; B.throwKills.push(sh.kills | 0); }
      }
    }

    // ---- 「持っている時間」＝重さを体で感じる窓 ----
    if (bs.held && B.__hT == null) { B.__hT = now; B.__hG = bs.held.grade || 0; }
    if (!bs.held && B.__hT != null) {
      B.holdSec[B.__hG].push(+(now - B.__hT).toFixed(2));
      B.__hT = null;
    }

    // ---- 掴んだ瞬間 ----
    if (bs.held && !bs.held.__c) {
      bs.held.__c = 1;
      var h = bs.held;
      var id = (h.tex || '').indexOf('enemy_') === 0 ? h.tex.slice(6) : (h.tex || '?');
      if (id === 'magman') B.__mg = (B.__mg || 0) + 1;
      var elite = (h.scale || 2) >= 4;
      var risk = 0;
      for (var q = 0; q < B.dmgWindow.length; q++) risk += B.dmgWindow[q].dmg;
      var rec = { t: Math.round(now), id: id, elite: elite, maxHp: Math.round(h.maxHp || 0),
                  shard: !!h.shard, spec: h.spec || null, riskDmg: Math.round(risk) };
      B.grabs.push(rec);
      B.lastHeld = rec;
      // エリートを掴んだ印
      for (var z = 0; z < r.enemies.length; z++) { /* 掴んだ時点で敵は消えているので印は下で付ける */ }
      if (elite) { for (var y = B.elites.length - 1; y >= 0; y--) {
        if (!B.elites[y].grabbed && B.elites[y].maxHp === rec.maxHp) { B.elites[y].grabbed = true; break; } } }
    }

    // ---- 飛んでいる弾を追う（生まれた時のHPと、消える時の残りHP）----
    var sh = bs.shots;
    for (var s = 0; s < sh.length; s++) {
      var o = sh[s];
      if (!o.__t) {
        o.__t = { t: Math.round(now), hp0: o.hp, held: B.lastHeld, spec: o.spec || null };
        B.open.push(o);
      }
    }
    for (var k = B.open.length - 1; k >= 0; k--) {
      var oo = B.open[k];
      if (oo.active && sh.indexOf(oo) >= 0) continue;
      var T = oo.__t;
      B.throws.push({ t: T.t, id: T.held ? T.held.id : '?', elite: !!(T.held && T.held.elite),
                      spec: T.spec, heldHp: T.held ? T.held.maxHp : 0,
                      hp0: T.hp0, used: Math.max(0, T.hp0 - oo.hp),
                      kills: oo.kills || 0, chain: oo.chain || 0, grade: oo.grade || 0 });
      if (!T.spec) B.gradeThrow[oo.grade || 0].push(oo.kills || 0);
      B.open.splice(k, 1);
    }

    // ---- ボット：一番近い獲物を掴んで、一番近い敵へ投げる（好みを持たない素の挙動）----
    if (r._jKey) {
      if (bs.held) r._jKey.isDown = !!bs.held.handed || bs.chargeT < 0.5;
      else r._jKey.isDown = true;
    }
    var kk = r.moveKeys; if (!kk) return;
    kk.left.isDown = kk.right.isDown = kk.up.isDown = kk.down.isDown = false;
    kk.a.isDown = kk.d.isDown = kk.w.isDown = kk.s.isDown = false;
    var px = r.player.x, py = r.player.y;
    var bent = (r.boss && r.boss.active) ? r.boss.entity : null;
    if (bs.held) {
      var tgt = bent, nd0 = 1e9;
      if (!tgt) for (var j = 0; j < r.enemies.length; j++) {
        var e2 = r.enemies[j];
        if (!e2.active || e2.isBoss) continue;
        var d0 = (e2.x-px)*(e2.x-px)+(e2.y-py)*(e2.y-py);
        if (d0 < nd0) { nd0 = d0; tgt = e2; }
      }
      if (tgt) { bs.keyAim = Math.atan2(tgt.y - py, tgt.x - px); bs.keyAimT = r.elapsed; }
      return;
    }
    var tx = null, ty = null, best = 1e9;
    for (var m = 0; m < r.enemies.length; m++) {
      var e4 = r.enemies[m];
      if (!e4.active || e4.isBoss) continue;
      var d1 = (e4.x-px)*(e4.x-px)+(e4.y-py)*(e4.y-py);
      if (e4.stag) d1 *= 0.25;         // よろけ中は優先（掴みに行く）
      if (d1 < best) { best = d1; tx = e4.x; ty = e4.y; }
    }
    if (tx === null && bent) { tx = bent.x; ty = bent.y; }
    if (tx === null) return;
    var dx = tx - px, dy = ty - py, dd = Math.hypot(dx, dy) || 1;
    if (dd > 40) {
      if (dx < -8) kk.left.isDown = true; else if (dx > 8) kk.right.isDown = true;
      if (dy < -8) kk.up.isDown = true;   else if (dy > 8) kk.down.isDown = true;
    }
  };
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
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(HERE, '.chrome-prof-r29w2p')}`, 'about:blank'], { stdio: 'ignore' });

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
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&seed=${SEED}` });
  await sleep(3500);
  await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})),
                window.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true})), true`);
  await sleep(900);
  const inst = await evalJs(INSTALL);
  if (inst !== 'ok') { console.log('INSTALL_FAILED=' + inst); process.exit(1); }

  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < SECS * 1.35) {
    await sleep(4000);
    const s = await evalJs(`(function(){var r=window.__vortexGame.scene.getScene('Run');
      return JSON.stringify({t: Math.round(r.elapsed), lv: r.level, ended: !!r.ended,
        grabs: window.__B.grabs.length, throws: window.__B.throws.length});})()`);
    if (!s) break;
    const o = JSON.parse(s);
    process.stdout.write(`  t=${o.t}s Lv${o.lv} 掴${o.grabs} 投${o.throws}   `);
    if (o.ended || o.t >= SECS) break;
  }
  console.log('\n');

  const raw = await evalJs(`JSON.stringify({
    b: window.__B,
    t: Math.round(window.__vortexGame.scene.getScene('Run').elapsed),
    lv: window.__vortexGame.scene.getScene('Run').level,
    ended: !!window.__vortexGame.scene.getScene('Run').ended
  }, function(k,v){ return k === 'open' || k === 'hpLog' || k === 'dmgWindow' ? undefined : v; })`);
  const R = JSON.parse(raw);
  const B = R.b;
  fs.writeFileSync(path.join(HERE, `r27-multi-${SEED}-${GOD ? 'god' : 'nogod'}.json`), JSON.stringify(B));

  console.log(`===== R26 計測（seed=${SEED} / ${GOD ? '無敵' : '通常'} / R26機能=${OFF ? 'OFF(対照)' : 'ON'} / つかみ失敗の罰=${NOBLOCK ? 'OFF(対照)' : 'ON'}）=====`);
  console.log(`★被弾レート = ${(B.totalTaken / Math.max(1, R.t)).toFixed(2)} /秒  （合計${Math.round(B.totalTaken)} ÷ ${R.t}秒）`);
  console.log(`EXCEPTIONS=${exceptions.length} 経過=${R.t}s Lv${R.lv} ended=${R.ended} 被弾合計=${Math.round(B.totalTaken)}`);
  for (const e of exceptions.slice(0, 3)) console.log('  [EXC] ' + e);

  // A 種類別の掴み
  const byId = new Map();
  for (const g of B.grabs) {
    const k = (g.elite ? 'ELITE:' : '') + g.id + (g.shard ? '(装甲片)' : '');
    const o = byId.get(k) || { n: 0, hp: 0, risk: 0 };
    o.n++; o.hp += g.maxHp; o.risk += g.riskDmg; byId.set(k, o);
  }
  console.log('\nA 何を掴んだか');
  [...byId.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, o]) => {
    console.log(`   ${k.padEnd(20)} ${String(o.n).padStart(4)}回  平均maxHp=${(o.hp / o.n).toFixed(1).padStart(6)}  掴む前3秒の被弾=${(o.risk / o.n).toFixed(1)}`);
  });

  // B 貫通HPは使われているか
  const th = B.throws.filter((t) => !t.spec);
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  if (th.length) {
    const hp0 = sum(th, (t) => t.hp0), used = sum(th, (t) => t.used);
    console.log(`\nB 貫通HP  与えた合計=${hp0}  使われた合計=${used}  使用率=${(100 * used / hp0).toFixed(1)}%`);
    const full = th.filter((t) => t.used >= t.hp0).length;
    console.log(`   使い切った投げ=${full}/${th.length} (${(100 * full / th.length).toFixed(1)}%)  ` +
                `平均 与=${(hp0 / th.length).toFixed(1)} 使=${(used / th.length).toFixed(2)}`);
  }

  // C 掴んだ相手の強さ別の戦果
  console.log('\nC 掴んだ相手の強さ別の戦果（1投あたり）');
  const buckets = [[0, 10], [10, 20], [20, 40], [40, 100], [100, 1e9]];
  for (const [lo, hi] of buckets) {
    const g = th.filter((t) => t.heldHp >= lo && t.heldHp < hi);
    if (!g.length) continue;
    console.log(`   maxHp ${String(lo).padStart(3)}〜${hi === 1e9 ? '∞ ' : String(hi).padStart(3)}  ` +
      `${String(g.length).padStart(4)}投  貫通HP=${(sum(g, (t) => t.hp0) / g.length).toFixed(1).padStart(6)}  ` +
      `撃破=${(sum(g, (t) => t.kills) / g.length).toFixed(2)}  連鎖最大=${Math.max(...g.map((t) => t.chain))}`);
  }

  // D エリートの顛末
  console.log('\nD エリート（110/200/290秒）の顛末');
  if (!B.elites.length) console.log('   出現なし');
  for (const e of B.elites) {
    console.log(`   t=${String(e.t).padStart(3)}s ${e.id.padEnd(8)} maxHp=${String(e.maxHp).padStart(4)}  ` +
      `よろけ=${e.staggered ? 'YES' : 'no '}  掴んだ=${e.grabbed ? 'YES' : 'no '}  復帰=${e.rebooted ? 'YES' : 'no '}`);
  }

  // G 格の効き
  console.log('\nG 弾の格ごとの戦果（1投あたりの撃破数）');
  const GN = ['かるい', 'おもい', 'ずっしり', 'ばくだん級'];
  for (let g = 0; g < 4; g++) {
    const a = B.gradeThrow[g];
    if (!a.length) { console.log(`   ${GN[g].padEnd(6)} 投げ0回`); continue; }
    const avg = a.reduce((x, y) => x + y, 0) / a.length;
    console.log(`   ${GN[g].padEnd(6)} ${String(a.length).padStart(4)}投  撃破=${avg.toFixed(2)}  ` +
      `掴み=${B.gradeGrab[g]}回 (${(B.gradeGrab[g] / (R.t / 60)).toFixed(1)}回/分)`);
  }
  console.log(`   王冠の発生=${B.crowns}体 (${(B.crowns / (R.t / 60)).toFixed(1)}体/分)  ` +
    `王冠を弾にした=${B.crownGrabs}回  断末魔=${B.throes}回 (${(B.throes / (R.t / 60)).toFixed(1)}回/分)  ` +
    `手の中で爆発=${B.handBooms}回`);

  // ---- H 断末魔は「本当に発火したか」 ----
  const tally = (arr) => { const m = new Map(); for (const o of arr) m.set(o.out, (m.get(o.out) || 0) + 1); return m; };
  const show = (title, arr) => {
    console.log(`\n${title}  合計=${arr.length}`);
    if (!arr.length) { console.log('   （0回）'); return; }
    [...tally(arr).entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
      console.log(`   ${String(k).padEnd(16)} ${String(n).padStart(4)}回 (${(n / arr.length * 100).toFixed(0)}%)`));
    const fired = arr.filter((o) => o.out === '発火').length;
    console.log(`   ★実際に発火した = ${fired}回 (${(fired / (R.t / 60)).toFixed(1)}回/分)`);
  };
  // ---- M 「一気に何体倒れたか」＝テトリスの段数に相当する分布 ----
  {
    const tk = B.throwKills || [];
    const bins = new Map();
    for (const k of tk) { const b = k >= 8 ? '8+' : String(k); bins.set(b, (bins.get(b) || 0) + 1); }
    console.log(`
M 1投あたりの撃破数の分布（${tk.length}投）`);
    ['0','1','2','3','4','5','6','7','8+'].forEach((b) => {
      const n = bins.get(b) || 0;
      if (!n && b !== '0' && b !== '1') return;
      console.log(`   ${b.padStart(2)}体  ${String(n).padStart(4)}投 (${(n / Math.max(1, tk.length) * 100).toFixed(1)}%)` +
        `  ${(n / (R.t / 60)).toFixed(1)}回/分`);
    });
    const big3 = tk.filter((k) => k >= 3).length, big5 = tk.filter((k) => k >= 5).length, big8 = tk.filter((k) => k >= 8).length;
    console.log(`   ★3体以上=${big3}回 (${(big3 / (R.t / 60)).toFixed(1)}回/分)  5体以上=${big5}回 (${(big5 / (R.t / 60)).toFixed(1)}回/分)  8体以上=${big8}回 (${(big8 / (R.t / 60)).toFixed(1)}回/分)`);
  }

  // ---- N 撃破の「同時性」。0.30秒の窓に何体が入るか（投げ以外の経路も含む）----
  {
    const ts = (B.killT || []).slice().sort((a, b) => a - b);
    const W = 0.30;
    const groups = [];
    let i = 0;
    while (i < ts.length) {
      let j = i;
      while (j + 1 < ts.length && ts[j + 1] - ts[i] <= W) j++;
      groups.push(j - i + 1);
      i = j + 1;
    }
    const bins = new Map();
    for (const g of groups) { const b = g >= 8 ? '8+' : String(g); bins.set(b, (bins.get(b) || 0) + 1); }
    console.log(`
N 0.30秒の窓に入った撃破数（全経路・${ts.length}体を${groups.length}山に分けた）`);
    ['1','2','3','4','5','6','7','8+'].forEach((b) => {
      const n = bins.get(b) || 0;
      if (!n) return;
      console.log(`   ${b.padStart(2)}体同時  ${String(n).padStart(4)}回 (${(n / groups.length * 100).toFixed(1)}%)  ${(n / (R.t / 60)).toFixed(1)}回/分`);
    });
    const g3 = groups.filter((g) => g >= 3).length, g5 = groups.filter((g) => g >= 5).length;
    console.log(`   ★3体以上の山=${g3}回 (${(g3 / (R.t / 60)).toFixed(1)}回/分)  5体以上=${g5}回 (${(g5 / (R.t / 60)).toFixed(1)}回/分)`);
  }

  // ---- O 連打（ガガガガ）が実際に何発鳴ったか ----
  {
    const fin = B.finales || [];
    const beats = B.beats || [];
    const gaps = (B.gaps || []).slice().sort((a, b) => a - b);
    console.log(`
O 連打の実測  打撃=${beats.length}発  締め=${fin.length}回`);
    if (gaps.length) {
      const med = gaps[Math.floor(gaps.length / 2)];
      const over = gaps.filter((g) => g > 120).length;
      console.log(`   打撃の間隔  中央値=${med}ms  最小=${gaps[0]}ms  最大=${gaps[gaps.length-1]}ms` +
        `  120ms超=${over}件 (${(over / gaps.length * 100).toFixed(0)}%) ← ヒットストップで列が途切れた回数`);
    }
    const bins = new Map();
    for (const n of fin) { const b = n >= 8 ? '8+' : String(n); bins.set(b, (bins.get(b) || 0) + 1); }
    ['3','4','5','6','7','8+'].forEach((b) => {
      const n = bins.get(b) || 0;
      if (!n) return;
      console.log(`   ${b.padStart(2)}体で締め  ${String(n).padStart(4)}回  ${(n / (R.t / 60)).toFixed(1)}回/分`);
    });
    const maxI = beats.reduce((m, o) => Math.max(m, o.i), -1);
    // ⚠️ crushFinale は3体未満でも呼ばれて即returnする。**鳴った回数**だけを数える
    const audible = fin.filter((n) => n >= 3).length;
    console.log(`   ★最長の連打=${maxI + 1}発  実際に鳴った締め=${audible}回 (${(audible / (R.t / 60)).toFixed(1)}回/分)` +
      `  ／ 呼ばれただけ(2体以下)=${fin.length - audible}回`);
  }

  // ---- P 特殊弾（らいこうだん／ほのおだん）の頻度 ----
  {
    const bs = B.spec || {};
    console.log(`
P 特殊弾の頻度（${R.t}秒）`);
    const row = (k, v) => console.log(`   ${k.padEnd(22)} ${String(v).padStart(4)}回  ${(v / (R.t / 60)).toFixed(2)}回/分  ` +
      (v ? `≒ ${(R.t / v).toFixed(0)}秒に1回` : ''));
    row('らいこうだん 受取', bs.boltsGot || 0);
    row('らいこうだん 命中', bs.boltHits || 0);
    row('ほのおだん 命中', bs.blastHits || 0);
    row('マグマン 掴み', bs.magmanGrabs || 0);
  }

  show('H 断末魔の顛末（上位雑魚の反撃）', B.throeLog || []);
  const fired = B.fired || [];
  if (fired.length) {
    const sync = fired.filter((f) => f.kind === 'quake' || f.kind === 'selfdestruct');
    const hit = sync.filter((f) => f.hit).length;
    console.log(`   ★避けたか（爆風系 ${sync.length}回のみ判定可）: 被弾${hit}回 / 回避${sync.length - hit}回` +
      (sync.length ? `  回避率=${((sync.length - hit) / sync.length * 100).toFixed(0)}%` : ''));
    const byK = new Map(); for (const f of fired) byK.set(f.id, (byK.get(f.id) || 0) + 1);
    console.log('   発火した敵: ' + [...byK.entries()].map(([k, n]) => `${k}=${n}`).join(' '));
  }
  show('I 導火線の顛末（ボンバ）', B.fuseLog || []);

  // ---- J 王冠は「認識できる時間」生きていたか ----
  const cl = B.crownLife || [];
  console.log(`\nJ 王冠の生存（${cl.length}体ぶん）`);
  if (cl.length) {
    const ages = cl.map((c) => c.age).sort((a, b) => a - b);
    const med = ages[Math.floor(ages.length / 2)];
    const short = cl.filter((c) => c.age < 2).length;
    console.log(`   生存の中央値=${med.toFixed(1)}s  最短=${ages[0].toFixed(1)}s  最長=${ages[ages.length-1].toFixed(1)}s`);
    console.log(`   2秒未満で消えた = ${short}体 (${(short / cl.length * 100).toFixed(0)}%)  ← 認識できない帯`);
    const bySrc = new Map(); for (const c of cl) bySrc.set(c.src, (bySrc.get(c.src) || 0) + 1);
    console.log('   消え方: ' + [...bySrc.entries()].map(([k, n]) => `${k}=${n}`).join(' '));
    const dd = cl.map((c) => c.dist).sort((a, b) => a - b);
    console.log(`   生まれた位置の主人公からの距離 中央値=${dd[Math.floor(dd.length/2)]}px`);
  }

  // ---- K 弾を「持っている時間」＝重さを感じる窓 ----
  const GN2 = ['かるい', 'おもい', 'ずっしり', 'ばくだん級'];
  console.log('\nK 掴んでから投げるまでの時間（＝重さを体で感じる窓）');
  (B.holdSec || []).forEach((a, i) => {
    if (!a.length) { console.log(`   ${GN2[i].padEnd(10)} 0回`); return; }
    const av = a.reduce((x, y) => x + y, 0) / a.length;
    console.log(`   ${GN2[i].padEnd(10)} ${String(a.length).padStart(4)}回  平均=${av.toFixed(2)}s  最長=${Math.max(...a).toFixed(2)}s`);
  });
  const s2g = B.stagToGrab || [];
  if (s2g.length) {
    const av2 = s2g.reduce((x, y) => x + y, 0) / s2g.length;
    console.log(`\nL よろけてから掴むまで 平均=${av2.toFixed(2)}s  中央値=${s2g.slice().sort((a,b)=>a-b)[Math.floor(s2g.length/2)].toFixed(2)}s`);
    console.log(`   ＝断末魔の予告0.5秒より短いなら、予告は最後まで見えずに掴みで消える`);
  }

  // F 生存時間と密度
  const lv2 = B.lives.filter((x) => !x.elite);
  if (lv2.length) {
    const ages = lv2.map((x) => x.age).sort((a, b) => a - b);
    const q = (p) => ages[Math.min(ages.length - 1, Math.floor(ages.length * p))];
    console.log(`
F 雑魚の生存時間（撃破${lv2.length}体）  中央値=${q(0.5).toFixed(1)}s  ` +
      `上位25%=${q(0.75).toFixed(1)}s  上位10%=${q(0.9).toFixed(1)}s  上位5%=${q(0.95).toFixed(1)}s  最長=${ages[ages.length-1].toFixed(1)}s`);
    for (const th of [20, 30, 40, 60]) {
      const n = ages.filter((a) => a >= th).length;
      console.log(`   ${String(th).padStart(3)}秒以上いきのびた = ${n}体 (${(100*n/ages.length).toFixed(1)}%)  ≒ ${(n/(R.t/60)).toFixed(1)}体/分`);
    }
    const bySrc = new Map();
    for (const x of lv2) bySrc.set(x.src, (bySrc.get(x.src) || 0) + 1);
    console.log('   倒した経路: ' + [...bySrc.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+'='+v).join(' '));
  }
  console.log(`   場の敵数  平均=${(B.aliveSum/Math.max(1,B.aliveN)).toFixed(1)}  最大=${B.aliveMax}  (enemyCap=220)`);

  // E リスク
  const withRisk = B.grabs.filter((g) => g.riskDmg > 0);
  console.log(`\nE 掴む直前3秒に被弾した割合 = ${withRisk.length}/${B.grabs.length}` +
    ` (${B.grabs.length ? (100 * withRisk.length / B.grabs.length).toFixed(1) : 0}%)` +
    `${GOD ? ' ※無敵なので常に0。nogodで測ること' : ''}`);

  // ---- R29W2 追加：新しい仕組みが「自然なプレイで何回起きるか」 ----
  const w2 = await evalJs(`(function(){
    var r = window.__vortexGame.scene.getScene('Run');
    var s = r.billiard.st;
    return { blocked: s.blocked||0, bombHits: s.bombHits||0, handBooms: s.handBooms||0,
             grabs: s.grabs||0, throws: s.throws||0 };
  })()`) || {};
  const perMin = (n) => (n / Math.max(1, R.t / 60)).toFixed(2);
  const bombGrabs = B.grabs.filter((g) => g.spec === 'bomb').length;
  const bombThrows = B.throws.filter((t) => t.spec === 'bomb').length;
  console.log(`\nR29W2 新しい仕組みの発生頻度（${R.t}秒）`);
  console.log(`   つかめない獲物に手を出して弾かれた = ${w2.blocked}回 (${perMin(w2.blocked)}回/分)`);
  console.log(`   ボンバを導火線つきで掴んだ         = ${bombGrabs}回 (${perMin(bombGrabs)}回/分)  掴み全体の${(100*bombGrabs/Math.max(1,B.grabs.length)).toFixed(1)}%`);
  console.log(`   ばくだんとして投げ切れた           = ${bombThrows}回 (${perMin(bombThrows)}回/分)`);
  console.log(`   手の中で爆発した（投げ損ね）       = ${w2.handBooms}回 (${perMin(w2.handBooms)}回/分)`);
  console.log(`   ばくだんが敵に当たって爆発した     = ${w2.bombHits}回 (${perMin(w2.bombHits)}回/分)`);
  {
    const bk = B.throws.filter((t) => t.spec === 'bomb').map((t) => t.kills | 0);
    const other = B.throws.filter((t) => !t.spec).map((t) => t.kills | 0);
    const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-');
    console.log(`   1投あたりの撃破  ばくだん=${avg(bk)}（${bk.length}投）  ふつうの弾=${avg(other)}（${other.length}投）`);
  }

  try { ws.close(); } catch { /* noop */ }
  chrome.kill(); server.close();
  process.exit(0);
}
main();
