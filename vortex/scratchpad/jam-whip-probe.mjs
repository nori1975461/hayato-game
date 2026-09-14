// R63 ボス難度プローブ — 「初回でミサイルガまで行けた＝ボスが弱すぎないか」を実測する。
//
// 測るもの（ボス6体それぞれ）：
//   ・出現時刻／撃破時刻＝戦闘長（出現は時刻固定なので、到達＝前のボスを倒せた証拠）
//   ・ボスへ入ったダメージの内訳（投げ:格ごと／特殊弾:種類ごと／装甲片／突き／必殺／仲間／ラゴン）
//   ・主人公が受けたダメージの内訳（ボスの攻撃か雑魚か＝呼び出し元のファイル名で分ける）
//   ・戦闘中の最低HP／死亡回数（死んだら全快で続行し、REVIVES に数える）
//   ・マグマンの出現数と、マグマン弾（ほのおだん）がボスに当たった回数
// ボット2種で下限と上限を挟む：
//   profile=mob  … 従来ボット（雑魚の群れへ投げる・必殺を使わない）＝ボスを狙わない下手な遊び方
//   profile=boss … ボス戦中は持った玉を必ずボスへ投げ、必殺が溜まれば撃つ＝ボスを狙う遊び方
// 使い方: node r63-boss-difficulty-probe.mjs <seed> <portOffset> <mob|boss>   （env RUN_SEC 既定 470）
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { judge } from '../src/data/verdict.js';   // 2026-09-13 裁き
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SEED = +(process.argv[2] || 42);
const OFF = +(process.argv[3] || 0);
const PROFILE = process.argv[4] === 'mob' ? 'mob' : 'boss';
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const RUN_SEC = +(process.env.RUN_SEC || 240);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/vortex/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(fp).pipe(res);
});

let ws, msgId = 0, exceptions = 0;
const pending = new Map();
function send(method, params = {}) { const id = ++msgId; ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve) => pending.set(id, { resolve })); }
async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) { exceptions++; console.log('  [eval EXC]', (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return undefined; }
  return r.result && r.result.value;
}

// ================= ページ内（ホスト変数は参照しない） =================
/* eslint-disable */
function pageInstall(cfg) {
  var run = window.__run;
  var P = window.__P = { profile: cfg.profile, fights: [], deaths: [], samples: [], magman: { spawned: 0, grabbed: 0 }, throws: 0, specialFires: 0, exceptions: [], done: false, clear: false };
  var cur = null;                     // 進行中のボス戦レコード
  var seenMag = new Set();
  function tsec() { return +run.elapsed.toFixed(1); }
  function where() {
    var st = String(new Error().stack || '').split('\n'), out = [];
    for (var i = 0; i < st.length; i++) { var m = /([A-Za-z]+\.js)[^:]*:(\d+):\d+/.exec(st[i]); if (m) out.push(m[1] + ':' + m[2]); }
    return out;
  }
  function gradeKey(g) { var GR = (window.__BAL && window.__BAL.hero.billiard.grades) || null; return GR && GR[g] ? GR[g].key : String(g); }
  function shotKind(at) {
    var st = run.billiard && run.billiard.st; if (!st) return 'throw:?';
    for (var i = 0; i < st.shots.length; i++) { var s = st.shots[i];
      if (Math.abs(s.x - at.x) < 0.01 && Math.abs(s.y - at.y) < 0.01) {
        if (s.spec) return 'spec:' + s.spec;
        if (s.shard) return 'shard';
        return 'throw:' + gradeKey(s.grade);
      } }
    return 'throw:?';
  }
  // ---- ボスへ入ったダメージ（PROTO＝試作案の介入もここ） ----
  var PR = cfg.proto || {};
  P.proto = PR; P.denied = { sb: 0, brk: 0 };
  var dd0 = run.dealDamage.bind(run);
  run.dealDamage = function (e, dmg, color, src, at) {
    if (!e || !e.isBoss || !e.active) return dd0.apply(run, arguments);
    var kind = src === 'ally' ? 'ally' : src === 'lagon' ? 'lagon' : src === 'jab' ? 'jab'
      : (at && at.r != null) ? 'special' : (at && at.hitR != null) ? shotKind(at) : 'strike';
    var args = Array.prototype.slice.call(arguments);
    // 試作①：装甲片のダメージを「ボス最大HPの割合」にする（ブレイク中の×2.4は dealDamage 側で従来どおり乗る）
    if (PR.shardRatio && kind === 'shard') args[1] = Math.max(1, Math.round(e.maxHp * PR.shardRatio));
    // 試作①b：装甲片は従来の倍率式のまま、**上限**だけ最大HPの割合で縛る（小ボスを1枚で半壊させない）
    if (PR.shardCap && kind === 'shard') args[1] = Math.min(args[1], Math.max(1, Math.round(e.maxHp * PR.shardCap)));
    // 試作②：スーパーボールが同じボスに当たる回数を1投げあたり cap 回まで
    if (PR.superballCap && kind === 'spec:superball') {
      var sh = shotObj(at); if (sh) { sh.__bossHits = (sh.__bossHits || 0) + 1; if (sh.__bossHits > PR.superballCap) { P.denied.sb++; return; } }
    }
    var before = e.hp;
    var r = dd0.apply(run, args);
    var dealt = Math.max(0, before - e.hp);
    if (cur && dealt > 0) {
      if (cur.trueDmgBy) cur.trueDmgBy[kind] = (cur.trueDmgBy[kind] || 0) + dealt;
      cur.dmgBy[kind] = (cur.dmgBy[kind] || 0) + dealt;
      cur.hitsBy[kind] = (cur.hitsBy[kind] || 0) + 1;
      if (kind === 'spec:blast') cur.magmanHits++;
      if (run.boss && run.boss.staggered && src === 'manual') cur.breakDmg += dealt;
    }
    return r;
  };
  function shotObj(at) {
    var st = run.billiard && run.billiard.st; if (!st) return null;
    for (var i = 0; i < st.shots.length; i++) { var s = st.shots[i]; if (Math.abs(s.x - at.x) < 0.01 && Math.abs(s.y - at.y) < 0.01) return s; }
    return null;
  }
  // ---- 主人公が受けたダメージ ----
  var hp0 = run.hitPlayer.bind(run);
  run.hitPlayer = function (dmg, sx, sy) {
    var before = run.player.hp;
    var r = hp0.apply(run, arguments);
    var taken = Math.max(0, before - run.player.hp);
    if (taken > 0) {
      var w = where(), fromBoss = false;
      for (var i = 0; i < w.length; i++) if (w[i].indexOf('boss.js') === 0) fromBoss = true;
      var k = fromBoss ? 'boss' : 'mob';
      P.takenAll = P.takenAll || { boss: 0, mob: 0 }; P.takenAll[k] += taken;
      if (cur) { cur.taken[k] += taken; cur.takenHits[k]++; cur.minHp = Math.min(cur.minHp, run.player.hp); }
    }
    return r;
  };
  // ---- 死亡→全快で続行（回数を数える） ----
  var er0 = run.endRun.bind(run);
  run.endRun = function (clear) {
    if (clear) { P.clear = true; P.done = true; return er0.apply(run, arguments); }
    var b = run.boss && run.boss.active && run.boss.entity;
    P.deaths.push({ t: tsec(), boss: b ? b.def.id : null, bossHpPct: b ? Math.round(100 * b.hp / b.maxHp) : null, level: run.level });
    if (cur) cur.deaths++;
    run.player.hp = run.player.maxHp; reviving = true;
  };
  // ---- 回復（'+N HP' 文言＝ジェム回復・ハート／それ以外はレベルアップ等） ----
  P.heal = { text: 0, textCount: 0, frameGain: 0, bossReward: 0 };
  var ft0 = run.floatText.bind(run);
  run.floatText = function (x, y, text) {
    var m = typeof text === 'string' && /^\+(\d+) HP$/.exec(text);
    if (m) { P.heal.text += +m[1]; P.heal.textCount++; if (cur) { cur.heal += +m[1]; cur.healCount++; } }
    return ft0.apply(run, arguments);
  };
  var prevHp = run.player.hp, reviving = false;
  // ---- 予告割り（ブレイク）の成立回数：billiard は run.boss.breakTelegraph() 経由で呼ぶのでここで数えられる ----
  if (run.boss && typeof run.boss.breakTelegraph === 'function') {
    var bt0 = run.boss.breakTelegraph;
    var lastBreakT = -1e9;
    run.boss.breakTelegraph = function () {
      if (PR.breakCd && run.elapsed - lastBreakT < PR.breakCd) { P.denied.brk++; if (cur) cur.breakDenied = (cur.breakDenied || 0) + 1; return false; }
      var ok = bt0.apply(run.boss, arguments); if (ok) { lastBreakT = run.elapsed; if (cur) cur.breaks++; } return ok;
    };
  }
  var prevState = null;
  // ---- 必殺（ボスを狙うプロファイルだけ） ----
  var sp0 = run.special && run.special.fire ? run.special.fire.bind(run.special) : null;
  if (sp0) run.special.fire = function () { var ok = sp0.apply(run.special, arguments); if (ok) P.specialFires++; return ok; };
  // ---- 掴み（マグマン） ----
  var prevHeld = null;
  // ---- 毎フレーム ----
  var lastSample = -1;
  function onPost() {
    if (P.done) return;
    try {
      var gain = run.player.hp - prevHp;
      if (gain > 0 && !reviving) { P.heal.frameGain += gain; if (cur) cur.healFrame += gain; }
      reviving = false; prevHp = run.player.hp;
      var st = run.billiard && run.billiard.st;
      var held = st && st.held;
      if (held && !prevHeld) { if (held.spec === 'blast') P.magman.grabbed++; }
      if (!held && prevHeld) P.throws++;
      prevHeld = held;
      for (var i = 0; i < run.enemies.length; i++) { var e = run.enemies[i]; if (e.active && e.def && e.def.id === 'magman' && !seenMag.has(e)) { seenMag.add(e); P.magman.spawned++; if (cur) cur.magmanSpawned++; } }
      var bs = run.boss, be = bs && bs.entity;
      var active = !!(bs && bs.active && be);
      if (active && !cur) {
        cur = { id: be.def.id, name: be.def.name, spawnT: tsec(), maxHp: be.maxHp, endT: null, killed: false, phase2T: null, deaths: 0, heal: 0, healCount: 0, healFrame: 0, breaks: 0, teles: 0, states: {},
          dmgBy: {}, hitsBy: {}, breakDmg: 0, magmanHits: 0, magmanSpawned: 0, taken: { boss: 0, mob: 0 }, takenHits: { boss: 0, mob: 0 },
          minHp: run.player.hp, hpStart: run.player.hp, maxHpStart: run.player.maxHp, level: run.level, heroMult: run.stats.heroMult,
          party: run.party.map(function (m) { return m.def.id; }), hpTrace: [], awaken: false };
        P.fights.push(cur);
      }
      if (cur) {
        if (active) {
          if (cur.phase2T == null && be.hp <= cur.maxHp * 0.5) cur.phase2T = tsec();
          var stn = bs.state;
          if (stn !== prevState) { cur.states[stn] = (cur.states[stn] || 0) + 1; if (typeof stn === 'string' && (/Tele$/.test(stn) || stn === 'crackCine')) { cur.teles++; cur.seq = cur.seq || []; cur.seq.push([+(run.elapsed - cur.spawnT).toFixed(1), stn.replace(/Tele$/, ''), Math.round(100 * be.hp / be.maxHp)]); } prevState = stn; }
          if (bs.trueForm && !cur.awaken) { cur.awaken = true; cur.awakenT = tsec(); cur.trueMaxHp = be.maxHp; cur.trueDmgBy = {}; }
          // 試作④：マオウレクス戦の測定用に、出現から awakenAt 秒で転生へ飛ばす（真の姿のDPSを測る）
          if (PR.awakenAt && cur.id === 'maou' && !bs.trueForm && !bs.awakening && run.elapsed - cur.spawnT >= PR.awakenAt && typeof bs.practiceAwaken === 'function') { if (bs.practiceAwaken()) cur.forcedAwaken = true; }
          if (Math.floor(run.elapsed) !== cur.lastTrace) { cur.lastTrace = Math.floor(run.elapsed); cur.hpTrace.push([cur.lastTrace, Math.round(100 * be.hp / be.maxHp), Math.round(run.player.hp)]); }
        } else {
          cur.endT = tsec(); cur.killed = true; cur.levelEnd = run.level; cur.heroMultEnd = run.stats.heroMult;
          cur = null;
        }
      }
      var sec = Math.floor(run.elapsed);
      if (sec !== lastSample && sec % 10 === 0) { lastSample = sec; P.samples.push({ t: sec, hp: Math.round(run.player.hp), maxHp: run.player.maxHp, level: run.level, heroMult: +run.stats.heroMult.toFixed(2), enemies: run.enemies.filter(function (e) { return e.active; }).length, coins: run.coins, party: run.party.length, wl: run.orbit && run.orbit.weaponLevel, kills: run.kills, prog: +(run.progress || 0).toFixed(1) }); }
    } catch (err) { P.exceptions.push('post: ' + (err && err.message)); if (P.exceptions.length > 20) P.done = true; }
  }
  run.events.on('postupdate', onPost);
  return true;
}

function pageDrive(profile) {
  var run = window.__run, k = run.moveKeys, p = run.player;
  if (!k || !p || run.ended) return;
  var vx = 0, vy = 0;
  function push(sx, sy, range, w) { var dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy) || 1; if (d < range) { vx += (dx / d) * ((range - d) / range) * w; vy += (dy / d) * ((range - d) / range) * w; } }
  function pull(sx, sy, w) { var dx = sx - p.x, dy = sy - p.y, d = Math.hypot(dx, dy) || 1; vx += (dx / d) * w; vy += (dy / d) * w; }
  var st = run.billiard && run.billiard.st, holding = !!(st && st.held);
  var bs = run.boss, be = bs && bs.active && bs.entity;
  for (var i = 0; i < run.enemies.length; i++) { var e = run.enemies[i]; if (!e.active || e.stag) continue; push(e.x, e.y, e.isBoss ? 170 : 62, e.isBoss ? 2.4 : 0.9); }
  for (var j = 0; j < run.bullets.length; j++) { var b = run.bullets[j]; if (b.active) push(b.x, b.y, 58, 1.5); }
  for (var j2 = 0; j2 < run.foeBullets.length; j2++) { var fb = run.foeBullets[j2]; if (fb.active) push(fb.x, fb.y, 58, 1.5); }
  var best = null, bd = 1e9, list = run.children.list;
  for (var c = 0; c < list.length; c++) { var o = list[c]; if (!o.texture || o.texture.key !== 'core' || !o.visible) continue; var dc = Math.hypot(o.x - p.x, o.y - p.y); if (dc < bd) { bd = dc; best = o; } }
  if (best && bd < 260) pull(best.x, best.y, 2.6);
  if (holding) {
    if (profile === 'boss' && be) pull(be.x, be.y, 3.4);
    else {
      var bx = 0, by = 0, n = 0;
      for (var i2 = 0; i2 < run.enemies.length; i2++) { var e2 = run.enemies[i2]; if (!e2.active || e2.isBoss) continue; if (Math.hypot(e2.x - p.x, e2.y - p.y) > 340) continue; bx += e2.x; by += e2.y; n++; }
      if (n) pull(bx / n, by / n, 3.2); else if (be) pull(be.x, be.y, 3.2);
    }
  } else {
    var tg = null, bdd = 1e9;
    for (var i3 = 0; i3 < run.enemies.length; i3++) { var e3 = run.enemies[i3]; if (!e3.active || !e3.stag) continue; var d3 = Math.hypot(e3.x - p.x, e3.y - p.y); if (d3 < bdd) { bdd = d3; tg = e3; } }
    if (!tg) { var ed = 1e9, en = null;
      for (var i4 = 0; i4 < run.enemies.length; i4++) { var e4 = run.enemies[i4]; if (!e4.active || e4.isBoss) continue; var d4 = Math.hypot(e4.x - p.x, e4.y - p.y); if (d4 < ed) { ed = d4; en = e4; } }
      if (en) pull(en.x, en.y, 1.2); }
    else pull(tg.x, tg.y, 2.0);
  }
  k.left.isDown = vx < -0.22; k.right.isDown = vx > 0.22; k.up.isDown = vy < -0.22; k.down.isDown = vy > 0.22;
  k.a.isDown = false; k.d.isDown = false; k.w.isDown = false; k.s.isDown = false;
  var press = true;
  if (st && st.held && !st.held.handed && st.maxRung) press = false;
  if (run._jKey) run._jKey.isDown = press;
  if (profile === 'boss' && be && run.special && run.special.ready) run.special.fire();
}
/* eslint-enable */

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding', `--remote-debugging-port=${DBG}`, '--window-size=700,420', '--hide-scrollbars',
    `--user-data-dir=${path.join(ROOT, 'vortex', 'scratchpad', '.chrome-prof-jam-' + OFF)}`, 'about:blank'], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('R63_NG'); process.exit(1); }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (ev2) => {
    const m = JSON.parse(ev2.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { exceptions++; const d = m.params.exceptionDetails; console.log('  [EXC]', d.text, (d.exception && d.exception.description) || ''); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/vortex/index.html?autotest=1&jam=1&seed=${SEED}` });
  await sleep(2500);
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    ready = await ev(`(function(){var g=window.__vortexGame;if(!g)return false;var r=g.scene.getScene('Run');if(!r||!r.sys||r.sys.settings.status<4)return false;window.__run=r;return !!(r.orbit&&r.billiard&&r.boss&&r.player&&r.moveKeys&&r.special);})()`);
    if (!ready) await sleep(200);
  }
  if (!ready) { console.log('Run 起動待ちタイムアウト'); console.log('R63_NG'); process.exit(1); }
  // importmap と同じ URL（?v=BUILD）で import すると、ゲーム本体と**同じモジュール実体**が取れる
  //（素の URL だと別実体になり、上書きがゲームに届かない）。
  const BUILD = /BUILD\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'vortex/src/data/version.js'), 'utf8'))[1];
  await ev(`import('/vortex/src/data/balance.js?v=${BUILD}').then(function(m){ window.__BAL = m.BALANCE; })`);
  // env OVERRIDE='{"boss":{"tiers":[{"hp":3600}]}}' のように JSON を渡すと BALANCE へ深い上書き（配列は index ごと）。
  if (process.env.OVERRIDE) {
    const applied = await ev(`(function(o){ function merge(dst, src){ for (var k in src){ var v = src[k];
        if (v && typeof v === 'object' && dst[k] && typeof dst[k] === 'object') merge(dst[k], v); else dst[k] = v; } }
      merge(window.__BAL, o); return JSON.stringify(o); })(${process.env.OVERRIDE})`);
    console.log('  OVERRIDE 適用:', applied);
  }
  const PROTO = process.env.PROTO ? JSON.parse(process.env.PROTO) : null;
  if (PROTO) console.log('  PROTO 適用:', JSON.stringify(PROTO));
  await ev('(' + pageInstall.toString() + ')(' + JSON.stringify({ profile: PROFILE, proto: PROTO }) + ')');

  let st = { t: 0, alive: true }, tick = 0;
  const t0 = Date.now();
  const wall = (RUN_SEC * 2.6 + 60) * 1000;
  while (st && st.t < RUN_SEC && Date.now() - t0 < wall) {
    await ev('(' + pageDrive.toString() + ')(' + JSON.stringify(PROFILE) + ')');
    if (++tick % 2 === 0) st = await ev(`(function(){var r=window.__run;return {t:r.elapsed, ended:!!r.ended, alive:r.scene.isActive(), done: !!(window.__P&&window.__P.done)};})()`);
    if (st && (st.ended || !st.alive || st.done)) { console.log('  ループ終了:', JSON.stringify(st)); break; }
    await sleep(90);
  }
  const R = JSON.parse(await ev('JSON.stringify(window.__P)') || 'null');
  if (!R) { console.log('R63_NG'); process.exit(1); }
  R.seed = SEED; R.endT = st && st.t; R.hostExceptions = exceptions;
  R.bossTimes = await ev('JSON.stringify(window.__run.bossTimes || null)');
  R.jam = await ev('JSON.stringify(window.__run.jamSt || null)');   // 2026-09-13 裁きの統計
  console.log('  Run.bossTimes（R63・Result表示の元データ）:', R.bossTimes);
  const TAG = process.env.TAG || '';
  const out = path.join(HERE, `jam-a-out-seed${SEED}-${PROFILE}${TAG}.json`);
  fs.writeFileSync(out, JSON.stringify(R, null, 1));

  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  console.log(`\n■ R63 seed=${SEED} profile=${PROFILE} 経過 ${f1(R.endT || 0)}秒・EXCEPTIONS=${exceptions + R.exceptions.length}・REVIVES=${R.deaths.length}・投げ ${R.throws}・必殺 ${R.specialFires}・マグマン出現 ${R.magman.spawned}／掴み ${R.magman.grabbed}`);
  for (const f of R.fights) {
    const len = f.endT != null ? f.endT - f.spawnT : (R.endT - f.spawnT);
    const tot = Object.values(f.dmgBy).reduce((a, b) => a + b, 0);
    const parts = Object.keys(f.dmgBy).sort((a, b) => f.dmgBy[b] - f.dmgBy[a]).map((k) => `${k} ${Math.round(100 * f.dmgBy[k] / Math.max(1, tot))}%(${f.hitsBy[k]}発)`).join(' / ');
    console.log(`  ${f.name}(HP${f.maxHp}) 出現${f1(f.spawnT)}s → ${f.killed ? '撃破' + f1(f.endT) + 's' : '未撃破'} 戦闘${f1(len)}秒${f.phase2T != null ? '・50%まで' + f1(f.phase2T - f.spawnT) + 's' : ''}${f.awaken ? '・転生' + f1(f.awakenT - f.spawnT) + 's' : ''}`);
    console.log(`     与ダメ合計 ${tot}（${Math.round(100 * tot / f.maxHp)}%）: ${parts}${f.breakDmg ? ' ｜ブレイク中 ' + Math.round(100 * f.breakDmg / Math.max(1, tot)) + '%' : ''}`);
    console.log(`     被ダメ ボス${f.taken.boss}(${f.takenHits.boss}回)・雑魚${f.taken.mob}(${f.takenHits.mob}回)／HP ${f.hpStart}→最低${f.minHp}（max${f.maxHpStart}）／死亡${f.deaths}／Lv${f.level}→${f.levelEnd || '-'} 攻${f1(f.heroMult)}→${f.heroMultEnd ? f1(f.heroMultEnd) : '-'}／仲間[${f.party.join(',')}]／マグマン出現${f.magmanSpawned}・命中${f.magmanHits}／回復 文言${f.heal}(${f.healCount}回)・増分計${Math.round(f.healFrame)}`);
    if (f.trueDmgBy) { const tt = Object.values(f.trueDmgBy).reduce((a, b) => a + b, 0); const tl = (f.endT != null ? f.endT : R.endT) - f.awakenT;
      console.log(`     真の姿(HP${f.trueMaxHp}) ${f1(tl)}秒で ${tt}（${Math.round(100 * tt / f.trueMaxHp)}%・${Math.round(tt / Math.max(1, tl))}/秒）${f.forcedAwaken ? '［強制転生］' : ''}: ${Object.keys(f.trueDmgBy).sort((a, b) => f.trueDmgBy[b] - f.trueDmgBy[a]).map((k) => k + ' ' + Math.round(100 * f.trueDmgBy[k] / Math.max(1, tt)) + '%').join(' / ')}`); }
    if (f.seq) { const st1 = f.seq.filter((q) => q[2] <= 66 && q[2] > 33), st2 = f.seq.filter((q) => q[2] <= 33);
      console.log(`     WHIPSEQ 堕天 ${st1.length}手 鞭${st1.filter((q) => q[1] === 'wire').length}・破鐘 ${st2.length}手 鞭${st2.filter((q) => q[1] === 'wire').length}: ${f.seq.map((q) => q[0] + 's:' + q[1] + '@' + q[2]).join(' ')}`); }
    console.log(`     予告 ${f.teles}回・ブレイク ${f.breaks}回（${f.teles ? Math.round(100 * f.breaks / f.teles) : 0}%）${f.breakDenied ? '・CDで拒否 ' + f.breakDenied : ''}／状態遷移: ${Object.keys(f.states).map((k) => k + ' ' + f.states[k]).join(', ')}`);
  }
  console.log(`  死亡: ${R.deaths.map((d) => d.t + 's@' + (d.boss || '雑魚') + (d.bossHpPct != null ? d.bossHpPct + '%' : '') + ' Lv' + d.level).join(' / ') || 'なし'}`);
  if (R.jam) {
    const j = JSON.parse(R.jam); const last = R.deaths[R.deaths.length - 1];
    const stat = { clear: false, hits: j.hits, throws: 30, coreHits: j.coreHits, shardShare: j.bossDmg > 0 ? j.shardDmg / j.bossDmg : 0,
      choirBest: j.choirBest, haloHit: j.haloHit, haloGrabbed: j.haloGrabbed, deathCause: j.lastCause,
      remainPct: last && last.bossHpPct != null ? last.bossHpPct : null, stage: null, tries: j.tries, bossSec: 20 };
    console.log(`  裁き: 被弾${j.hits} 内訳${JSON.stringify(j.hitsByCause)} 聖核${j.coreHits} 装甲片${j.shardHits}(${Math.round(100 * stat.shardShare)}%) 聖歌隊${j.choirBest}/8 欠片 掴${j.haloGrabbed ? 1 : 0} 当${j.haloHit ? 1 : 0} 最高の一投${JSON.stringify(j.best)} → ${judge(stat).title}`);
  }
  console.log(`  被ダメ総計: ボス ${R.takenAll ? R.takenAll.boss : 0} / 雑魚 ${R.takenAll ? R.takenAll.mob : 0} ／ 回復総計: 文言 ${R.heal.text}(${R.heal.textCount}回)・HP増分計 ${Math.round(R.heal.frameGain)}`);
  console.log(`  推移: ${R.samples.filter((s) => s.t % 30 === 0).map((s) => s.t + 's 倒' + s.kills + ' 進' + s.prog + ' HP' + s.hp + '/' + s.maxHp + ' Lv' + s.level + ' 攻' + s.heroMult + ' 敵' + s.enemies + ' 仲間' + s.party).join(' | ')}`);
  console.log('R63_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('R63_NG'); process.exit(1); });
