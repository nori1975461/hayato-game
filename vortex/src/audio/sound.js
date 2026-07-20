// audio/sound.js — ボルモン！ 効果音・BGM合成（WebAudio・外部ファイルなし）
// 仕様書 §3.5 のAPI契約を厳守。init前に sfx() が呼ばれても無音で無視する。

let ctx = null;         // AudioContext
let masterGain = null;  // 全体音量（0.25基調）
let sfxGain = null;     // SFX用サブバス
let bgmGain = null;     // BGM用サブバス
let muted = false;

// BGM再生管理
let bgmTimer = null;    // setTimeout ハンドル
let bgmPlaying = false;
let bgmStep = 0;        // 現在の16分音符ステップ

// --- 音階ヘルパ（等分平均律・A4=440基準の周波数） ---
function noteFreq(semitonesFromA4) {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}
// 音名→A4からの半音数（Cメジャー中心・明るい長調）
const NOTE = {
  C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2,
  C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, A5: 12, B5: 14,
  C6: 15, D6: 17, E6: 19, G6: 22,
  C3: -21, D3: -19, E3: -17, F3: -16, G3: -14, A3: -12, B3: -10,
  C2: -33, G2: -26, F2: -28, A2: -24,
};

// --- ノイズバッファ（打楽器用・キャッシュ） ---
let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // 決定的な擬似ノイズ（Math.random禁止のためLCGで生成）
  let s = 0x2545f491;
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (s / 0x3fffffff) - 1;
  }
  noiseBuffer = buf;
  return buf;
}

// --- 基本トーン生成：エンベロープ付き単発オシレータ ---
function tone(opts) {
  if (!ctx) return;
  const {
    type = 'square',
    freq = 440,
    freqEnd = null,     // 指定時は freq→freqEnd へ指数スイープ
    start = 0,          // 現在時刻からの相対開始（秒）
    dur = 0.12,
    attack = 0.005,
    release = null,     // null なら dur 内で減衰
    gain = 0.3,
    dest = sfxGain,
    detune = 0,
  } = opts;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(Math.max(1, freq), t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  }
  const g = ctx.createGain();
  const rel = release == null ? dur : release;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(attack + 0.01, rel));
  osc.connect(g).connect(dest || sfxGain);
  osc.start(t0);
  osc.stop(t0 + Math.max(dur, rel) + 0.02);
}

// --- ノイズ打（打楽器・ヒット用） ---
function noiseHit(opts) {
  if (!ctx) return;
  const {
    start = 0, dur = 0.1, gain = 0.3, dest = sfxGain,
    hpFreq = 800, lpFreq = 6000,
  } = opts;
  const t0 = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hpFreq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lpFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(hp).connect(lp).connect(g).connect(dest || sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// --- SFX定義テーブル ---
// 各キーは対応関数。ポップで明るい音色（矩形/三角波＋短エンベロープ基調）。
const SFX = {
  // 敵被弾：短く硬い矩形＋軽いノイズ
  hit() {
    tone({ type: 'square', freq: 320, freqEnd: 180, dur: 0.07, gain: 0.22 });
    noiseHit({ dur: 0.05, gain: 0.12, hpFreq: 1200 });
  },
  // 弾発射：軽い上昇ピュン（三角波）
  shoot() {
    tone({ type: 'triangle', freq: 620, freqEnd: 1040, dur: 0.09, gain: 0.16 });
  },
  // ビーム：太い持続＋倍音（矩形＋のこぎり）
  beam() {
    tone({ type: 'sawtooth', freq: 180, freqEnd: 90, dur: 0.32, gain: 0.14 });
    tone({ type: 'square', freq: 720, freqEnd: 480, dur: 0.3, gain: 0.1 });
    noiseHit({ dur: 0.28, gain: 0.06, hpFreq: 400, lpFreq: 3000 });
  },
  // 拾得（コイン等）：軽い2音アップ
  pickup() {
    tone({ type: 'square', freq: noteFreq(NOTE.E5), dur: 0.07, gain: 0.18 });
    tone({ type: 'square', freq: noteFreq(NOTE.B5), start: 0.06, dur: 0.1, gain: 0.18 });
  },
  // 捕獲：キラキラした上昇アルペジオ（気持ちよく）
  capture() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: i * 0.05, dur: 0.16, gain: 0.2 });
      tone({ type: 'square', freq: noteFreq(n) * 2, start: i * 0.05, dur: 0.1, gain: 0.06 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.22, dur: 0.24, gain: 0.16 });
  },
  // レベルアップ：華やかな上昇ファンファーレ
  levelup() {
    const seq = [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E5];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.08, dur: 0.14, gain: 0.2 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.32, dur: 0.3, gain: 0.16 });
  },
  // 合成：長いキラキラ上昇スイープ＋和音（派手に）
  fusion() {
    tone({ type: 'triangle', freq: 300, freqEnd: 1800, dur: 0.5, gain: 0.16 });
    const chord = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    chord.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.4 + i * 0.03, dur: 0.4, gain: 0.14 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.5, dur: 0.35, gain: 0.1 });
    noiseHit({ start: 0.4, dur: 0.3, gain: 0.08, hpFreq: 2000 });
  },
  // エリート出現：不穏だが明るい低音アラート
  elite() {
    tone({ type: 'sawtooth', freq: noteFreq(NOTE.C3), dur: 0.24, gain: 0.18 });
    tone({ type: 'square', freq: noteFreq(NOTE.G3), start: 0.12, dur: 0.24, gain: 0.16 });
    tone({ type: 'square', freq: noteFreq(NOTE.C4), start: 0.24, dur: 0.28, gain: 0.16 });
    noiseHit({ dur: 0.2, gain: 0.1, hpFreq: 200, lpFreq: 2000 });
  },
  // 祭壇出現：神秘的なきらめき和音
  altar() {
    const chord = [NOTE.C5, NOTE.F4, NOTE.A5];
    chord.forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: i * 0.04, dur: 0.5, gain: 0.14 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6), start: 0.2, dur: 0.4, gain: 0.1 });
  },
  // 選択（ドラフト決定）：軽いクリック上昇
  select() {
    tone({ type: 'square', freq: noteFreq(NOTE.G5), dur: 0.05, gain: 0.16 });
    tone({ type: 'square', freq: noteFreq(NOTE.C6), start: 0.04, dur: 0.08, gain: 0.16 });
  },
  // ゲームオーバー：下降トロンボーン風（明るさは残す）
  gameover() {
    const seq = [NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G3];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: i * 0.16, dur: 0.24, gain: 0.2 });
    });
    tone({ type: 'sawtooth', freq: noteFreq(NOTE.C3), start: 0.6, dur: 0.5, gain: 0.14 });
  },
  // クリア：明るい勝利ファンファーレ
  clear() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.12, dur: 0.16, gain: 0.2 });
      tone({ type: 'triangle', freq: noteFreq(n) / 2, start: i * 0.12, dur: 0.16, gain: 0.1 });
    });
    const chord = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    chord.forEach((n) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.72, dur: 0.6, gain: 0.14 });
    });
  },
};

// ================= BGM =================
// 長調・約128BPM。16分音符 = 60/128/4 ≒ 0.1172秒。
// 8小節ループ（コード進行 C - Am - F - G を2巡）。
const BPM = 128;
const STEP_SEC = 60 / BPM / 4;              // 16分音符長
const STEPS_PER_BAR = 16;
const TOTAL_BARS = 8;
const TOTAL_STEPS = STEPS_PER_BAR * TOTAL_BARS;

// 各小節のコード（アルペジオ音とベースの土台）
const CHORDS = [
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 }, // C
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F4], bass: NOTE.F2 }, // F
  { arp: [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G4], bass: NOTE.G2 }, // G
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 }, // C
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F4], bass: NOTE.F2 }, // F
  { arp: [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G4], bass: NOTE.G2 }, // G
];

// 明るいリードメロディ（小節ごとに8ステップ分・-1は休符）
const MELODY = [
  [NOTE.C5, -1, NOTE.E5, -1, NOTE.G5, -1, NOTE.E5, -1],
  [NOTE.A4, -1, NOTE.C5, -1, NOTE.E5, -1, NOTE.C5, -1],
  [NOTE.F5, -1, NOTE.A5, -1, NOTE.C6, -1, NOTE.A5, -1],
  [NOTE.G5, -1, NOTE.B5, -1, NOTE.D6, -1, NOTE.B5, -1],
  [NOTE.E5, NOTE.G5, NOTE.C6, -1, NOTE.G5, -1, NOTE.E5, -1],
  [NOTE.C5, NOTE.E5, NOTE.A5, -1, NOTE.E5, -1, NOTE.C5, -1],
  [NOTE.A5, NOTE.C6, NOTE.F5, -1, NOTE.A5, -1, NOTE.C6, -1],
  [NOTE.D6, NOTE.B5, NOTE.G5, -1, NOTE.D6, -1, NOTE.G5, -1],
];

function playBgmStep(step) {
  if (!ctx || !bgmGain) return;
  const bar = Math.floor(step / STEPS_PER_BAR) % TOTAL_BARS;
  const inBar = step % STEPS_PER_BAR;
  const chord = CHORDS[bar];

  // ベース：小節頭と8ステップ目に鳴らす
  if (inBar === 0 || inBar === 8) {
    tone({ type: 'triangle', freq: noteFreq(chord.bass), dur: STEP_SEC * 7,
           gain: 0.22, dest: bgmGain, attack: 0.01 });
  }

  // アルペジオ：4ステップ毎（8分音符）に順番に
  if (inBar % 2 === 0) {
    const arpIdx = (inBar / 2) % chord.arp.length;
    const n = chord.arp[arpIdx];
    tone({ type: 'square', freq: noteFreq(n), dur: STEP_SEC * 1.6,
           gain: 0.1, dest: bgmGain, attack: 0.005 });
  }

  // リードメロディ：8分音符解像度（偶数ステップ）
  if (inBar % 2 === 0) {
    const m = MELODY[bar][inBar / 2];
    if (m !== -1) {
      tone({ type: 'triangle', freq: noteFreq(m), dur: STEP_SEC * 1.8,
             gain: 0.16, dest: bgmGain, attack: 0.005 });
    }
  }

  // ノイズ打楽器：ハイハット風を各16分の裏、キック風を小節頭
  if (inBar % 4 === 2) {
    noiseHit({ dur: 0.04, gain: 0.05, hpFreq: 6000, lpFreq: 12000, dest: bgmGain });
  }
  if (inBar % 8 === 0) {
    // キック：低い短パルス
    tone({ type: 'sine', freq: 140, freqEnd: 50, dur: 0.12, gain: 0.2,
           dest: bgmGain, attack: 0.002 });
  }
  if (inBar === 4 || inBar === 12) {
    // スネア風
    noiseHit({ dur: 0.1, gain: 0.09, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
  }
}

function scheduleBgm() {
  if (!bgmPlaying) return;
  playBgmStep(bgmStep);
  bgmStep = (bgmStep + 1) % TOTAL_STEPS;
  bgmTimer = setTimeout(scheduleBgm, STEP_SEC * 1000);
}

// ================= 公開API =================
export const Sound = {
  // AudioContext生成。ユーザー操作後に呼ぶ。多重呼び出し安全。
  init() {
    if (ctx) {
      // 既に生成済み。suspend状態なら再開だけ試みる。
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return;
    }
    const AC = (typeof window !== 'undefined')
      ? (window.AudioContext || window.webkitAudioContext)
      : null;
    if (!AC) return; // 非対応環境（node等）では無音のまま
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return;
    }
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.25;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.7; // BGMはSFXよりやや控えめ
    bgmGain.connect(masterGain);

    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
  },

  get ready() {
    return !!ctx && ctx.state === 'running';
  },

  // init前・未対応環境でも例外を出さず無音で無視する。
  sfx(name) {
    if (!ctx || muted) return;
    const fn = SFX[name];
    if (!fn) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      fn();
    } catch (e) {
      // 再生失敗は握りつぶす（ゲーム進行を止めない）
    }
  },

  startBgm() {
    if (!ctx) return;
    if (bgmPlaying) return;
    bgmPlaying = true;
    bgmStep = 0;
    scheduleBgm();
  },

  stopBgm() {
    bgmPlaying = false;
    if (bgmTimer != null) {
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }
  },

  // ミュート切替。戻り値: ミュート中なら true。
  toggleMute() {
    muted = !muted;
    if (masterGain && ctx) {
      // クリックノイズ回避のため短くランプ
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.25, now + 0.05);
    }
    return muted;
  },
};
