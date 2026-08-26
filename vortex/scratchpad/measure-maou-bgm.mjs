// マオウレクス戦BGMを「実際にスケジュールされた音」で実測する。
//
// 実プレイFB「音楽が全然変わってない。本当に変えたのか？」への回答は、
// ソースの差分では足りない（差分があっても鳴っていない実例を R29W2 で踏んでいる）。
// AudioContext を差し替えて **鳴らそうとした音符を1個ずつ記録**し、
// 変更前(pre-R34)と変更後(HEAD)を同じ物差しで並べる。
//
//   node vortex/scratchpad/measure-maou-bgm.mjs
//
// ⚠️ ブラウザは使わない（headless の音は測れないため）。ここで測るのは
//    「どの高さの音が、いつ、どれだけの音量で発音予約されたか」。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../');
const SRC = path.join(ROOT, 'vortex/src/audio/sound.js');

// ---- AudioContext のスタブ。発音予約だけを記録する ----
function makeStub(log) {
  const param = (v) => ({
    value: v,
    first: null,
    setValueAtTime(val) { if (this.first === null) this.first = val; this.value = val; return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
    cancelScheduledValues() { return this; },
  });
  const node = () => ({ connect(n) { return n; }, disconnect() {} });
  class Ctx {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.sampleRate = 48000;
      this.destination = node();
    }
    resume() {}
    createGain() { const n = node(); n.gain = param(1); return n; }
    createBiquadFilter() {
      const n = node(); n.type = ''; n.frequency = param(0); n.Q = param(1); return n;
    }
    createDynamicsCompressor() {
      const n = node();
      n.threshold = param(0); n.knee = param(0); n.ratio = param(1);
      n.attack = param(0); n.release = param(0);
      return n;
    }
    createBuffer(ch, len) {
      return { length: len, getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      const n = node();
      n.buffer = null;
      n.playbackRate = param(1);
      n.start = (t) => log.push({ kind: 'noise', t: +(t || 0).toFixed(4) });
      n.stop = () => {};
      return n;
    }
    createOscillator() {
      const n = node();
      n.type = 'square';
      n.frequency = param(440);
      n.detune = param(0);
      n.start = (t) => {
        n._t = +(t || 0).toFixed(4);
      };
      n.stop = (t) => {
        const f0 = n.frequency.first === null ? n.frequency.value : n.frequency.first;
        log.push({ kind: 'tone', t: n._t, type: n.type, f: +f0.toFixed(1),
          step: log.step, dur: +((t || 0) - n._t).toFixed(3) });
      };
      return n;
    }
  }
  return Ctx;
}

// ---- 1本ぶんの計測 ----
async function measure(modPath, label) {
  const log = [];
  const Ctx = makeStub(log);
  global.window = { AudioContext: Ctx };
  globalThis.window = global.window;

  // setTimeout を仮想時間に差し替える（スケジューラを手で回すため）
  const q = [];
  const realTimeout = global.setTimeout;
  global.setTimeout = (fn, ms) => { q.push({ fn, ms }); return q.length; };
  global.clearTimeout = () => {};

  const mod = await import('file://' + modPath.replace(/\\/g, '/') + '?t=' + label);
  const S = mod.Sound;
  S.init();
  log.step = 0;                 // startBgm は step0 をその場で鳴らす
  S.startBgm('maou');

  // 8小節ぶん（16step×8）を回す。ctx.currentTime も一緒に進める
  const ctxRef = log; // ctx は閉じているので、時刻はスケジューラのms合計で追う
  let tSec = 0, steps = 0;
  while (q.length && steps < 16 * 32) {   // R34W3 で16小節になったので上限を広げる
    const job = q.shift();
    tSec += job.ms / 1000;
    // sound.js 内の ctx.currentTime を進める術がないので、記録側は step 番号で持つ
    log.step = steps + 1;        // ⚠️ step0 は上で消化済み
    job.fn();
    steps++;
  }
  global.setTimeout = realTimeout;

  return { log, steps, tSec: +tSec.toFixed(2) };
}

// ---- 集計 ----
function summarize(r, bpm) {
  const tones = r.log.filter((x) => x.kind === 'tone');
  const noises = r.log.filter((x) => x.kind === 'noise');
  const byType = {};
  for (const t of tones) byType[t.type] = (byType[t.type] || 0) + 1;
  const freqs = tones.map((t) => t.f).filter((f) => f > 0);
  const bars = [];
  const nBar = Math.max(...tones.map((t) => Math.floor(t.step / 16))) + 1;
  for (let b = 0; b < nBar; b++) {
    const inBar = tones.filter((t) => Math.floor(t.step / 16) === b && t.f > 0);
    bars.push(inBar.length ? +Math.min(...inBar.map((t) => t.f)).toFixed(1) : 0);
  }
  return {
    小節数: bars.length,
    小節ごとの最低音Hz: bars,
    音符の総数: tones.length,
    ノイズ打の総数: noises.length,
    波形の内訳: byType,
    最高音Hz: Math.max(...freqs).toFixed(0),
    最低音Hz: Math.min(...freqs).toFixed(0),
    '1周の秒数': r.tSec,
  };
}

const OLD_REF = process.argv[2] || '80e6b6c';   // R34 直前のコミット
const tmpOld = path.join(HERE, '_sound_pre_r34.mjs');
const tmpNew = path.join(HERE, '_sound_head.mjs');
fs.writeFileSync(tmpOld, execFileSync('git', ['show', `${OLD_REF}:vortex/src/audio/sound.js`],
  { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
fs.copyFileSync(SRC, tmpNew);

const NL = String.fromCharCode(10);
const out = [];
const say = (s) => { console.log(s); out.push(s); };

// ⚠️ 同一プロセスで2回 import すると module のトップレベル状態（ctx）が残るので、
//    別プロセスで1本ずつ測る。
if (process.env.MEASURE_ONE) {
  const r = await measure(process.env.MEASURE_ONE, 'x');
  const tones = r.log.filter((x) => x.kind === 'tone');
  // step 単位の指紋（何step目に何個の音が鳴るか）も出す＝リズムの変化を見る
  console.log(JSON.stringify({ sum: summarize(r), steps: r.steps,
    fingerprint: tones.slice(0, 400).map((t) => t.f + '/' + t.type).join(' ') }));
} else {
  for (const [label, p] of [['変更前(pre-R34)', tmpOld], ['変更後(HEAD)', tmpNew]]) {
    const json = execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: ROOT, env: { ...process.env, MEASURE_ONE: p }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    const d = JSON.parse(json.trim().split(NL).pop());
    say('■ ' + label);
    say('  ' + JSON.stringify(d.sum));
    out.push('FP:' + label + ':' + d.fingerprint);
  }
  const fpOld = out.find((s) => s.startsWith('FP:変更前'));
  const fpNew = out.find((s) => s.startsWith('FP:変更後'));
  say('');
  say('冒頭400音の並びが同一か: ' + (fpOld.split(':').slice(2).join(':') ===
    fpNew.split(':').slice(2).join(':') ? '同一（＝変わっていない）' : '別物（＝変わっている）'));
  fs.writeFileSync(path.join(HERE, 'maou-bgm-measure.txt'), out.join(NL), 'utf8');
}
