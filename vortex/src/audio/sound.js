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
  // 合成：長いキラキラ上昇スイープ＋和音（派手に）＋低音キックで重み
  fusion() {
    tone({ type: 'sine', freq: 160, freqEnd: 45, dur: 0.25, gain: 0.25 });
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
  // 選択（カーソル移動）：軽いクリック上昇。ドラフトのハイライト切替で鳴らす
  select() {
    tone({ type: 'square', freq: noteFreq(NOTE.G5), dur: 0.05, gain: 0.16 });
    tone({ type: 'square', freq: noteFreq(NOTE.C6), start: 0.04, dur: 0.08, gain: 0.16 });
  },
  // レベルアップ到達（カード出現）予告：控えめ2音チャイム
  draftReady() {
    tone({ type: 'triangle', freq: noteFreq(NOTE.E5), dur: 0.09, gain: 0.12 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.A5), start: 0.08, dur: 0.14, gain: 0.12 });
  },
  // 強化決定：高速上昇アルペジオ＋オクターブ重ね＋シャイン（一番気持ちいい音・約0.5秒）
  powerup() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.045, dur: 0.12, gain: 0.22 });
      tone({ type: 'triangle', freq: noteFreq(n) * 2, start: i * 0.045, dur: 0.1, gain: 0.08 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.18, dur: 0.3, gain: 0.18 });
    noiseHit({ start: 0.18, dur: 0.12, gain: 0.07, hpFreq: 5000 });
  },
  // 祭壇出現ファンファーレ：Fメジャー上昇＋チャイム（約0.9秒）
  altarFanfare() {
    const seq = [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.07, dur: 0.18, gain: 0.16 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6), start: 0.3, dur: 0.5, gain: 0.14 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.A5), start: 0.38, dur: 0.4, gain: 0.1 });
  },
  // 合成チャージ：上昇スイープ＋きらめき（約0.6秒）
  fusionCharge() {
    tone({ type: 'triangle', freq: 180, freqEnd: 1500, dur: 0.55, gain: 0.14 });
    [NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.15 + i * 0.15, dur: 0.1, gain: 0.08 });
    });
  },
  // 進化：ピッチベンド上昇＋2音＋高音チャイム（合成と音色系統を変える・約0.6秒）
  evolve() {
    tone({ type: 'triangle', freq: noteFreq(NOTE.C5), freqEnd: noteFreq(NOTE.C6), dur: 0.25, gain: 0.16 });
    tone({ type: 'square', freq: noteFreq(NOTE.E5), start: 0.1, dur: 0.12, gain: 0.14 });
    tone({ type: 'square', freq: noteFreq(NOTE.A5), start: 0.2, dur: 0.12, gain: 0.14 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.E6), start: 0.3, dur: 0.3, gain: 0.14 });
    noiseHit({ start: 0.28, dur: 0.15, gain: 0.06, hpFreq: 4000 });
  },
  // 警告サイレン：2音交互×3回＋低音ゴロ（緊張感を出してよい唯一の音・約1.1秒）
  warning() {
    for (let i = 0; i < 3; i++) {
      tone({ type: 'sawtooth', freq: noteFreq(NOTE.A3), start: i * 0.36, dur: 0.17, gain: 0.2 });
      tone({ type: 'sawtooth', freq: noteFreq(NOTE.F3), start: i * 0.36 + 0.18, dur: 0.17, gain: 0.2 });
    }
    noiseHit({ dur: 0.5, gain: 0.1, hpFreq: 60, lpFreq: 500 });
  },
  // ボス撃破：低音ドーン→上昇ファンファーレ（約1.3秒）
  bossdown() {
    noiseHit({ dur: 0.35, gain: 0.2, hpFreq: 100, lpFreq: 1200 });
    tone({ type: 'sine', freq: 120, freqEnd: 35, dur: 0.4, gain: 0.3 });
    const seq = [NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.35 + i * 0.09, dur: 0.16, gain: 0.2 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6), start: 0.75, dur: 0.5, gain: 0.16 });
  },
  // 宝箱開封：軽い上昇3音ジングル＋きらめき（約0.45秒）
  chest() {
    const seq = [NOTE.C5, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.07, dur: 0.12, gain: 0.18 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.E6), start: 0.2, dur: 0.24, gain: 0.14 });
    noiseHit({ dur: 0.05, gain: 0.06, hpFreq: 3000 });
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
// 3曲構成（battle / boss / result）。全曲とも 16分音符ステップを setTimeout で駆動。
// STEPS_PER_BAR は共通16。STEP_SEC・小節数・声部は曲ごとに切替える。
const STEPS_PER_BAR = 16;

// --- 曲1: 通常戦闘 battle（現行曲そのまま・長調・128BPM・8小節・C-Am-F-G×2巡）---
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

// --- 曲2: ボス戦 boss（Aマイナー・140BPM・4小節・Am-F-G-Am）---
const CHORDS_BOSS = [
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], bass: NOTE.F2 }, // F
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], bass: NOTE.G2 }, // G
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 }, // Am
];
const MELODY_BOSS = [
  [NOTE.A4, -1, NOTE.C5, NOTE.D5, NOTE.E5, -1, NOTE.E5, NOTE.D5],
  [NOTE.C5, -1, NOTE.A4, NOTE.C5, NOTE.F5, -1, NOTE.E5, NOTE.D5],
  [NOTE.B4, -1, NOTE.D5, NOTE.B4, NOTE.G5, -1, NOTE.F5, NOTE.D5],
  [NOTE.E5, NOTE.E5, -1, NOTE.C5, NOTE.A4, -1, -1, -1],
];

// --- 曲3: リザルト result（Cメジャー・96BPM・4小節・C-G-Am-F・やさしいバラード）---
const CHORDS_RESULT = [
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 }, // C
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], bass: NOTE.G2 }, // G
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], bass: NOTE.F2 }, // F
];
const MELODY_RESULT = [
  [NOTE.E5, -1, -1, NOTE.D5, NOTE.C5, -1, -1, -1],
  [NOTE.D5, -1, -1, NOTE.B4, NOTE.G4, -1, -1, -1],
  [NOTE.C5, -1, -1, NOTE.A4, NOTE.E5, -1, -1, -1],
  [NOTE.A4, -1, NOTE.B4, NOTE.C5, NOTE.D5, -1, -1, -1],
];

// 曲テーブル。style で声部・ドラムパターンを分岐する。
const SONGS = {
  battle: { bpm: 128, bars: 8, chords: CHORDS,        melody: MELODY,        style: 'battle' },
  boss:   { bpm: 140, bars: 4, chords: CHORDS_BOSS,   melody: MELODY_BOSS,   style: 'boss'   },
  result: { bpm: 96,  bars: 4, chords: CHORDS_RESULT, melody: MELODY_RESULT, style: 'result' },
};
let currentSong = SONGS.battle;   // 現在再生中の曲定義

function playBgmStep(step) {
  if (!ctx || !bgmGain) return;
  const song = currentSong;
  const stepSec = 60 / song.bpm / 4;
  const bar = Math.floor(step / STEPS_PER_BAR) % song.bars;
  const inBar = step % STEPS_PER_BAR;
  const chord = song.chords[bar];

  if (song.style === 'battle') {
    // ベース：小節頭と8ステップ目に鳴らす
    if (inBar === 0 || inBar === 8) {
      tone({ type: 'triangle', freq: noteFreq(chord.bass), dur: stepSec * 7,
             gain: 0.22, dest: bgmGain, attack: 0.01 });
    }
    // アルペジオ：8分音符（偶数ステップ）に順番に
    if (inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'square', freq: noteFreq(chord.arp[arpIdx]), dur: stepSec * 1.6,
             gain: 0.1, dest: bgmGain, attack: 0.005 });
    }
    // リードメロディ：8分音符解像度
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== -1) {
        tone({ type: 'triangle', freq: noteFreq(m), dur: stepSec * 1.8,
               gain: 0.16, dest: bgmGain, attack: 0.005 });
      }
    }
    // ドラム：ハイハット裏・キック小節頭・スネア中間
    if (inBar % 4 === 2) {
      noiseHit({ dur: 0.04, gain: 0.05, hpFreq: 6000, lpFreq: 12000, dest: bgmGain });
    }
    if (inBar % 8 === 0) {
      tone({ type: 'sine', freq: 140, freqEnd: 50, dur: 0.12, gain: 0.2,
             dest: bgmGain, attack: 0.002 });
    }
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.1, gain: 0.09, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
    }
  } else if (song.style === 'boss') {
    // ベース：8分刻みで駆動感。6・14ステップ目はオクターブ上
    if (inBar % 2 === 0) {
      const oct = (inBar === 6 || inBar === 14) ? 12 : 0;
      tone({ type: 'square', freq: noteFreq(chord.bass + oct), dur: stepSec * 1.8,
             gain: 0.14, dest: bgmGain, attack: 0.005 });
    }
    // アルペジオ：8分音符で薄く土台を補強
    if (inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'square', freq: noteFreq(chord.arp[arpIdx]), dur: stepSec * 1.4,
             gain: 0.06, dest: bgmGain, attack: 0.005 });
    }
    // リード：sawtoothで通常曲と音色を差別化
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== -1) {
        tone({ type: 'sawtooth', freq: noteFreq(m), dur: stepSec * 1.7,
               gain: 0.11, dest: bgmGain, attack: 0.005 });
      }
    }
    // ドラム：キック4つ打ち・スネア中間・ハット16分裏
    if (inBar % 4 === 0) {
      tone({ type: 'sine', freq: 150, freqEnd: 45, dur: 0.12, gain: 0.22,
             dest: bgmGain, attack: 0.002 });
    }
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.1, gain: 0.1, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
    }
    if (inBar % 2 === 1) {
      noiseHit({ dur: 0.03, gain: 0.035, hpFreq: 6000, lpFreq: 12000, dest: bgmGain });
    }
  } else if (song.style === 'result') {
    // ベース：小節頭のみ・長く伸ばす
    if (inBar === 0) {
      tone({ type: 'triangle', freq: noteFreq(chord.bass), dur: stepSec * 14,
             gain: 0.18, dest: bgmGain, attack: 0.02 });
    }
    // アルペジオ：8分音符・triangleでやわらかく
    if (inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'triangle', freq: noteFreq(chord.arp[arpIdx]), dur: stepSec * 1.8,
             gain: 0.09, dest: bgmGain, attack: 0.01 });
    }
    // メロディ：triangle・8分解像度
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== -1) {
        tone({ type: 'triangle', freq: noteFreq(m), dur: stepSec * 2.4,
               gain: 0.12, dest: bgmGain, attack: 0.01 });
      }
    }
    // ドラムは無し。小節中間に控えめなハットのみ
    if (inBar === 8) {
      noiseHit({ dur: 0.04, gain: 0.03, hpFreq: 7000, lpFreq: 12000, dest: bgmGain });
    }
  }
}

function scheduleBgm() {
  if (!bgmPlaying) return;
  const totalSteps = STEPS_PER_BAR * currentSong.bars;
  const stepSec = 60 / currentSong.bpm / 4;
  playBgmStep(bgmStep);
  bgmStep = (bgmStep + 1) % totalSteps;
  bgmTimer = setTimeout(scheduleBgm, stepSec * 1000);
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

  // 曲名指定でBGM開始。無引数は battle（後方互換）。
  // 再生中に別の曲名を渡すと、その曲へ頭から切替える。
  startBgm(name = 'battle') {
    if (!ctx) return;
    const song = SONGS[name] || SONGS.battle;
    if (bgmPlaying && currentSong === song) return; // 同じ曲を再生中なら何もしない
    if (bgmPlaying && bgmTimer != null) {
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }
    currentSong = song;
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
