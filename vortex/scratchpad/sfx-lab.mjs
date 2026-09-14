// 2026-09-14 振り香炉（配線の鞭）と天啓の「恐れ」の音を、ゲームと同じ sound.js をオフラインで描画して数字で確かめる。
//   旧＝BUILD-6 まで鳴っていた組み合わせ（マオウレクスのロケット系／小さな鐘＋鉄の軋み＋雷鳴）と、新＝BUILD-7 を、
//   boss.js と同じ時刻表で並べて描画する。出すもの：
//   ①実行時エラー（Sound.sfx は例外を握りつぶすので、読み込み時に catch を書き換えて記録する）
//   ②ピーク・音割れ（マスターのリミッタ込み）
//   ③一撃の直前 120ms の音量と、その前の 120ms（直前で落ち込む＝驚きを弱める側／Lane 1991・Peterson 2018）
//   ④一撃の大きさ（着弾後 0.3 秒の 50ms RMS の最大）＝旧より小さくなっていないか
//   ⑤帯域の割合（150Hz 未満はノートPCのスピーカーで出ない）
//   ⑥包絡の 30〜150Hz 変調の割合（ラフネスの目安・Arnal 2015。ノイズでも上がるので目安どまり）
//   WAV は scratchpad/sfx-lab/ に書く（--desktop でデスクトップにも「旧→新」の聞き比べを置く）。
// 使い方: node scratchpad/sfx-lab.mjs [portOffset] [--desktop]
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const OFF = +(process.argv[2] || 31);
const DESK = process.argv.includes('--desktop');
const PORT = 9110 + OFF, DBG = 9660 + OFF;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = path.join(HERE, 'sfx-lab');
fs.mkdirSync(OUT, { recursive: true });
const SR = 48000;

// ---- ページ側（Chrome の中で動く）。Node の変数は参照しない ----
async function pageMain() {
  window.__sfxErr = [];
  const SRC = await (await fetch('/vortex/src/audio/sound.js', { cache: 'no-store' })).text();
  const RE = /fn\(arg, pitch\);(\s*)\}(\s*)catch \(e\) \{/g;
  window.__patchCount = (SRC.match(RE) || []).length;
  const PATCHED = SRC.replace(RE, (m0, a, b) => 'fn(arg, pitch);' + a + '}' + b + "catch (e) { window.__sfxErr.push(String(name) + ': ' + ((e && e.stack) || e));");
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < h; k++) {
          const a = i + k, b = a + h;
          const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
          const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
  }
  window.__renderPlan = async (plan, sec, probes) => {
    const sr = 48000;
    const oc = new OfflineAudioContext(2, Math.ceil(sec * sr), sr);
    const realResume = oc.resume.bind(oc);
    oc.resume = () => Promise.resolve();   // sfx() は suspended を見ると resume を呼ぶ＝描画前は何もしない
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return oc; };
    const url = URL.createObjectURL(new Blob([PATCHED], { type: 'text/javascript' }));   // 描画ごとに別の実体（ctx を持ち越さない）
    const mod = await import(url);
    mod.Sound.init();
    window.AudioContext = RealAC;
    const e0 = window.__sfxErr.length;
    const play = (ev) => mod.Sound.sfx(ev[1], ev[2], ev[3]);
    const groups = new Map();
    for (const ev of plan) {
      const q = Math.round((ev[0] * sr) / 128);
      if (!groups.has(q)) groups.set(q, []);
      groups.get(q).push(ev);
    }
    for (const q of [...groups.keys()].sort((a, b) => a - b)) {
      const evs = groups.get(q);
      if (q === 0) evs.forEach(play);
      else oc.suspend((q * 128) / sr).then(() => { evs.forEach(play); realResume(); });
    }
    const buf = await oc.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), N = L.length;
    const m = new Float32Array(N);
    let peak = 0, clip = 0;
    for (let i = 0; i < N; i++) {
      m[i] = (L[i] + R[i]) / 2;
      const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      if (a > peak) peak = a;
      if (a >= 0.999) clip++;
    }
    const rms = (t0, t1) => {
      const a = Math.max(0, Math.floor(t0 * sr)), b = Math.min(N, Math.floor(t1 * sr));
      let s = 0; for (let i = a; i < b; i++) s += m[i] * m[i];
      return b > a ? Math.sqrt(s / (b - a)) : 0;
    };
    const db = (x) => (x > 1e-5 ? Math.round(200 * Math.log10(x)) / 10 : -100);
    const out = {};
    for (const p of probes) {
      if (p.kind === 'pre') {
        out[p.key] = { last: db(rms(p.T - 0.12, p.T)), before: db(rms(p.T - 0.24, p.T - 0.12)) };
      } else if (p.kind === 'loud') {
        let best = 0; for (let t = p.t0; t + 0.05 <= p.t1; t += 0.005) best = Math.max(best, rms(t, t + 0.05));
        out[p.key] = db(best);
      } else if (p.kind === 'bands') {
        const F = 4096, a = Math.floor(p.t0 * sr), b = Math.min(N, Math.floor(p.t1 * sr));
        const acc = new Float64Array(F / 2);
        for (let s = a; s < b; s += F / 2) {
          const re = new Float64Array(F), im = new Float64Array(F);
          for (let i = 0; i < F; i++) re[i] = (s + i < b ? m[s + i] : 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (F - 1)));
          fft(re, im);
          for (let k = 0; k < F / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
        }
        const edges = [0, 150, 300, 2000, 6000, sr / 2], bands = [0, 0, 0, 0, 0];
        let tot = 0;
        for (let k = 1; k < F / 2; k++) {
          const f = (k * sr) / F; tot += acc[k];
          for (let e = 0; e < 5; e++) if (f >= edges[e] && f < edges[e + 1]) { bands[e] += acc[k]; break; }
        }
        out[p.key] = bands.map((v) => Math.round((1000 * v) / (tot || 1)) / 10);
        // 300Hz 以上の絶対量（ノートPCで聞こえる分）。割合だけだと低音を減らしても「聞こえる音」が増えたか分からない
        const hi = bands[2] + bands[3] + bands[4];
        out[p.key.replace('帯域', '300Hz以上')] = hi > 0 ? Math.round(100 * Math.log10(hi / (F * F))) / 10 : -100;
      } else if (p.kind === 'rough') {
        const hop = 48, win = 96, env = [];
        for (let s = Math.floor(p.t0 * sr); s + win <= Math.min(N, Math.floor(p.t1 * sr)); s += hop) {
          let q = 0; for (let i = 0; i < win; i++) q += m[s + i] * m[s + i];
          env.push(Math.sqrt(q / win));
        }
        const n = 1 << Math.floor(Math.log2(Math.max(1, env.length)));
        if (n < 64) { out[p.key] = null; continue; }
        let mean = 0; for (let i = 0; i < n; i++) mean += env[i] / n;
        const re = new Float64Array(n), im = new Float64Array(n);
        for (let i = 0; i < n; i++) re[i] = (env[i] - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
        fft(re, im);
        const fs = sr / hop;
        let r = 0, tot = 0;
        for (let k = 1; k < n / 2; k++) {
          const f = (k * fs) / n, pw = re[k] * re[k] + im[k] * im[k];
          if (f >= 1 && f <= 150) tot += pw;
          if (f >= 30 && f <= 150) r += pw;
        }
        out[p.key] = Math.round((1000 * r) / (tot || 1)) / 10;
      }
    }
    const i16 = new Int16Array(N * 2);
    for (let i = 0; i < N; i++) {
      i16[2 * i] = Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767)));
      i16[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767)));
    }
    const u8 = new Uint8Array(i16.buffer);
    let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    URL.revokeObjectURL(url);
    return { peak: Math.round(peak * 1000) / 1000, clip, errs: window.__sfxErr.slice(e0), probes: out, pcm: btoa(bin), frames: N };
  };
  window.__labReady = true;
}
const PAGE = `<!doctype html><meta charset="utf-8"><title>sfx-lab</title><script type="module">(${pageMain.toString()})();</script>`;

// ---- 時刻表（boss.js と同じ） ----
// updateCenserWind と同じ式で、右の香炉が半周をまたぐ時刻（censerWhirl が鳴る時刻）を 60fps で求める
//   （stateT を減らす順番による差は 1 フレーム以内）
function whirlTimes(T) {
  const out = []; let ang = -Math.PI / 2, st = T; const dt = 1 / 60;
  while (st > 0) {
    st -= dt;
    const p = Math.min(1, Math.max(0, 1 - st / T)), w = 5 + 31 * p * p;
    const h0 = Math.floor(ang / Math.PI); ang += w * dt;
    if (st > 0.1 && Math.floor(ang / Math.PI) !== h0) out.push([Math.round((T - st) * 1000) / 1000, p]);
  }
  return out;
}
const WH = whirlTimes(1.0);
const FLY = [[1.12, 1.0, 1.3], [1.24, 0.8, 1.1], [1.36, 0.95, 1.25], [1.46, 1.05, 1.35]];   // 近さで vol・pitch が上がる（near 式の概算）
const HIT = 1.18, WHOOSH = 1.5, BACK = 1.85;   // shotSec 0.55 + secondDelay 0.3 → 1.85 で巻き戻し
const whipNewHit = [[0, 'censerSwing', 1.0], ...WH.map(([t, p]) => [t, 'censerWhirl', 0.45 + 0.65 * p, 0.8 + 0.5 * p]), [1.0, 'censerHurl'],
  ...FLY.map(([t, v, p]) => [t, 'censerFly', v, p]), [HIT, 'censerSmite', 1, 1], [WHOOSH, 'censerWhoosh', 0.9, 1.2], [BACK, 'censerReel']];
const whipOldHit = [[0, 'ironCreak', 0.6, 1.5], [0, 'relock'], [1.0, 'wireCannon'], [1.0, 'rocketPunchFire', 0.45], [1.0, 'wireShot', 0.35],
  ...FLY.map(([t, v, p]) => [t, 'rocketPunchFly', v, p]), [HIT, 'rocketPunchHit'], [WHOOSH, 'wireWhoosh', 0.9, 1.2], [BACK, 'wireWinch']];
const whipNewMiss = whipNewHit.filter((e) => e[1] !== 'censerSmite' && e[1] !== 'censerWhoosh').concat([[BACK, 'censerSmite', 0.6, 1.15]]);
const whipOldMiss = whipOldHit.filter((e) => e[1] !== 'rocketPunchHit' && e[1] !== 'wireWhoosh').concat([[BACK, 'rocketHit']]);
// 天啓：0／0.6／1.2 秒に出現、予告 0.7／0.7／1.0 → 0.7／1.3／2.2 秒に落下。2本目・3本目の出現は前の柱の着弾の 0.1 秒前（delay 0.13）
const pillarNew = [[0, 'pillarMark', { sec: 0.7, i: 0, big: false, delay: 0 }], [0.6, 'pillarMark', { sec: 0.7, i: 1, big: false, delay: 0.13 }],
  [0.7, 'pillarSmite', { big: false, i: 0 }], [1.2, 'pillarMark', { sec: 1.0, i: 2, big: true, delay: 0.13 }],
  [1.3, 'pillarSmite', { big: false, i: 1 }], [2.2, 'pillarSmite', { big: true, i: 2 }]];
const pillarNewNoDelay = pillarNew.map((e) => (e[1] === 'pillarMark' ? [e[0], e[1], { ...e[2], delay: 0 }] : e));
const pillarOld = [[0, 'pillarWarn', 1, 0.75], [0, 'pillarWarn', 1.0, 1], [0, 'ironCreak', 0.4, 1.1], [0.6, 'pillarWarn', 1.0, 1.16], [0.6, 'ironCreak', 0.4, 1.2],
  [0.7, 'pillarFall', 1.15, 1], [1.2, 'pillarWarn', 1.2, 0.7], [1.2, 'ironCreak', 0.7, 0.8], [1.3, 'pillarFall', 1.15, 1],
  [2.2, 'pillarFall', 1.4, 0.7], [2.2, 'thunder', 0.9]];

const WHIP_PROBES = [
  { key: '射出の直前', kind: 'pre', T: 1.0 },
  { key: '射出', kind: 'loud', t0: 1.0, t1: 1.3 }, { key: '命中', kind: 'loud', t0: HIT, t1: HIT + 0.3 }, { key: '巻き戻し', kind: 'loud', t0: BACK, t1: BACK + 0.3 },
  { key: '帯域:予告', kind: 'bands', t0: 0, t1: 1.0 }, { key: '帯域:命中', kind: 'bands', t0: HIT, t1: HIT + 0.5 },
  { key: 'ラフネス:予告', kind: 'rough', t0: 0.5, t1: 1.0 }, { key: 'ラフネス:命中', kind: 'rough', t0: HIT, t1: HIT + 0.5 },
];
const WHIP_MISS_PROBES = [{ key: '地を叩く', kind: 'loud', t0: BACK, t1: BACK + 0.3 }, { key: '帯域:地を叩く', kind: 'bands', t0: BACK, t1: BACK + 0.5 }];
const PILLAR_PROBES = [
  { key: '1本目の直前', kind: 'pre', T: 0.7 }, { key: '2本目の直前', kind: 'pre', T: 1.3 }, { key: '3本目の直前', kind: 'pre', T: 2.2 },
  { key: '1本目', kind: 'loud', t0: 0.7, t1: 1.0 }, { key: '2本目', kind: 'loud', t0: 1.3, t1: 1.6 }, { key: '3本目', kind: 'loud', t0: 2.2, t1: 2.5 },
  { key: '帯域:予告', kind: 'bands', t0: 0, t1: 0.7 }, { key: '帯域:3本目', kind: 'bands', t0: 2.2, t1: 2.7 },
  { key: 'ラフネス:1本目', kind: 'rough', t0: 0.7, t1: 1.2 }, { key: 'ラフネス:3本目', kind: 'rough', t0: 2.2, t1: 2.7 },
];
const RUNS = [
  { id: 'whip_old_hit', plan: whipOldHit, sec: 3.2, probes: WHIP_PROBES },
  { id: 'whip_new_hit', plan: whipNewHit, sec: 3.2, probes: WHIP_PROBES },
  { id: 'whip_old_miss', plan: whipOldMiss, sec: 3.2, probes: WHIP_MISS_PROBES },
  { id: 'whip_new_miss', plan: whipNewMiss, sec: 3.2, probes: WHIP_MISS_PROBES },
  { id: 'pillar_old', plan: pillarOld, sec: 4.2, probes: PILLAR_PROBES },
  { id: 'pillar_new', plan: pillarNew, sec: 4.2, probes: PILLAR_PROBES },
  { id: 'pillar_new_nodelay', plan: pillarNewNoDelay, sec: 4.2, probes: PILLAR_PROBES.filter((p) => p.kind === 'pre') },
];

function writeWav(file, parts) {
  const data = Buffer.concat(parts.map((c) => (typeof c === 'number' ? Buffer.alloc(Math.round(c * SR) * 4) : Buffer.from(c, 'base64'))));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/sfx-lab.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(PAGE); return; }
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

async function main() {
  // 時刻表の名前が sound.js に実在するか（無い名前は Sound.sfx が黙って無視する）
  const src = fs.readFileSync(path.join(ROOT, 'vortex/src/audio/sound.js'), 'utf8');
  const names = new Set(RUNS.flatMap((r) => r.plan.map((e) => e[1])));
  const missing = [...names].filter((n) => !new RegExp('^  ' + n + '\\(', 'm').test(src));
  if (missing.length) { console.log('sound.js に無い名前:', missing.join(', ')); console.log('SFXLAB_NG'); process.exit(1); }
  console.log('censerWhirl の時刻（右の香炉の半周）:', WH.map(([t]) => t).join(' / '));

  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const prof = path.join(HERE, '.chrome-prof-sfxlab-' + OFF);
  fs.rmSync(prof, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${DBG}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => { try { chrome.kill(); } catch { /* */ } });
  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl); if (page) wsUrl = page.webSocketDebuggerUrl; } catch { /* retry */ }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) { console.log('Chrome に接続できません'); console.log('SFXLAB_NG'); process.exit(1); }
  ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || {}); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') { exceptions++; const d = m.params.exceptionDetails; console.log('  [EXC]', d.text, (d.exception && d.exception.description) || ''); }
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/sfx-lab.html` });
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) { await sleep(100); ready = await ev('!!window.__labReady'); }
  if (!ready) { console.log('ページの準備がタイムアウト'); console.log('SFXLAB_NG'); process.exit(1); }
  const pc = await ev('window.__patchCount');
  if (pc !== 1) { console.log('Sound.sfx の catch を書き換えられない（一致', pc, '件）'); console.log('SFXLAB_NG'); process.exit(1); }

  const res = {};
  let errTotal = 0;
  for (const r of RUNS) {
    const v = await ev(`window.__renderPlan(${JSON.stringify(r.plan)}, ${r.sec}, ${JSON.stringify(r.probes)})`);
    if (!v) { console.log(r.id, '描画に失敗'); errTotal++; continue; }
    res[r.id] = v;
    errTotal += v.errs.length;
    writeWav(path.join(OUT, r.id + '.wav'), [v.pcm]);
    console.log(`\n[${r.id}] peak=${v.peak} clip=${v.clip} errs=${v.errs.length}`);
    v.errs.slice(0, 5).forEach((e) => console.log('   ERR', e.split('\n')[0]));
    for (const [k, x] of Object.entries(v.probes)) {
      if (x && typeof x === 'object' && !Array.isArray(x)) console.log(`   ${k}: 直前120ms ${x.last}dB ／ その前 ${x.before}dB（差 ${Math.round((x.last - x.before) * 10) / 10}）`);
      else if (Array.isArray(x)) console.log(`   ${k}: <150Hz ${x[0]}% | 150-300 ${x[1]}% | 300-2k ${x[2]}% | 2-6k ${x[3]}% | >6k ${x[4]}%（300Hz 以上 ${Math.round((x[2] + x[3] + x[4]) * 10) / 10}%）`);
      else console.log(`   ${k}: ${x}${k.startsWith('ラフネス') ? '%' : 'dB'}`);
    }
  }
  if (DESK) {
    const desk = path.join(os.homedir(), 'OneDrive', 'Desktop');
    if (fs.existsSync(desk) && res.whip_old_hit && res.whip_new_hit && res.whip_old_miss && res.whip_new_miss && res.pillar_old && res.pillar_new) {
      const f1 = path.join(desk, '振り香炉の音_旧→新（当たり→外れ）_2026-09-14.wav');
      const f2 = path.join(desk, '天啓の音_旧→新_2026-09-14.wav');
      writeWav(f1, [res.whip_old_hit.pcm, 0.6, res.whip_new_hit.pcm, 1.0, res.whip_old_miss.pcm, 0.6, res.whip_new_miss.pcm]);
      writeWav(f2, [res.pillar_old.pcm, 0.8, res.pillar_new.pcm]);
      console.log('\nデスクトップ:', path.basename(f1), '/', path.basename(f2));
    } else console.log('\nデスクトップに書けませんでした');
  }
  console.log('\nSFX_ERRORS=', errTotal, ' EXCEPTIONS=', exceptions);
  console.log(errTotal || exceptions ? 'SFXLAB_ERR' : 'SFXLAB_DONE');
  process.exit(0);
}
main().catch((e) => { console.log('落ちました:', e && e.message); console.log('SFXLAB_NG'); process.exit(1); });
