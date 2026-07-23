// audio/sound.js — ボルモン！ 効果音・BGM合成（WebAudio・外部ファイルなし）
// 仕様書 §3.5 のAPI契約を厳守。init前に sfx() が呼ばれても無音で無視する。

const MASTER_VOL = 0.33; // 全体音量。派手さ増強に伴い0.30→0.33（子ども向け安全上限0.34未満・眩しすぎない範囲）

let ctx = null;         // AudioContext
let masterGain = null;  // 全体音量（MASTER_VOL基調）
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
  const len = Math.floor(ctx.sampleRate * 0.6); // 炸裂・ライザーの長尺バースト用に0.4→0.6秒ぶん確保
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
  // 敵被弾：短く硬い矩形＋軽いノイズ＋三角の芯で気持ちよく厚みを出す
  hit() {
    tone({ type: 'square', freq: 320, freqEnd: 180, dur: 0.07, gain: 0.22 });
    tone({ type: 'triangle', freq: 520, freqEnd: 260, dur: 0.06, gain: 0.09 });
    noiseHit({ dur: 0.05, gain: 0.13, hpFreq: 1200 });
    noiseHit({ dur: 0.03, gain: 0.06, hpFreq: 4000, lpFreq: 12000 });
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
  // 捕獲：キラキラした上昇アルペジオ＋到達和音＋シャイン（気持ちよく派手に）
  capture() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: i * 0.05, dur: 0.16, gain: 0.2 });
      tone({ type: 'square', freq: noteFreq(n) * 2, start: i * 0.05, dur: 0.1, gain: 0.06 });
    });
    // 到達点でC和音をふわっと重ねて華やかに
    [NOTE.C6, NOTE.E6, NOTE.G6].forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: 0.2 + i * 0.02, dur: 0.28, gain: 0.13 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.22, dur: 0.24, gain: 0.16 });
    noiseHit({ start: 0.2, dur: 0.12, gain: 0.05, hpFreq: 6000 });
  },
  // レベルアップ：華やかな上昇ファンファーレ＋低音の芯＋きらめきで盛る
  levelup() {
    tone({ type: 'sine', freq: 130, freqEnd: 55, dur: 0.18, gain: 0.16, attack: 0.002 });
    const seq = [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E5];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.08, dur: 0.14, gain: 0.2 });
      tone({ type: 'triangle', freq: noteFreq(n) * 2, start: i * 0.08, dur: 0.1, gain: 0.06 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.32, dur: 0.3, gain: 0.16 });
    noiseHit({ start: 0.32, dur: 0.14, gain: 0.05, hpFreq: 5500 });
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
  // ボス撃破：特大ドーン→上昇ファンファーレ→到達和音（約1.4秒・派手に）
  bossdown() {
    noiseHit({ dur: 0.4, gain: 0.22, hpFreq: 100, lpFreq: 1400 });
    noiseHit({ dur: 0.25, gain: 0.12, hpFreq: 2500, lpFreq: 12000 });
    tone({ type: 'sine', freq: 140, freqEnd: 32, dur: 0.45, gain: 0.32, attack: 0.002 });
    tone({ type: 'triangle', freq: 80, freqEnd: 26, dur: 0.4, gain: 0.14, attack: 0.002 });
    const seq = [NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.35 + i * 0.09, dur: 0.16, gain: 0.2 });
      tone({ type: 'triangle', freq: noteFreq(n) / 2, start: 0.35 + i * 0.09, dur: 0.16, gain: 0.08 });
    });
    // 到達点のC和音を広く鳴らして勝利感
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.72, dur: 0.55, gain: 0.13 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6), start: 0.75, dur: 0.5, gain: 0.16 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.82, dur: 0.4, gain: 0.11 });
    noiseHit({ start: 0.72, dur: 0.2, gain: 0.05, hpFreq: 6000 });
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
  // 仲間の武器レベルアップ：上昇アルペジオ2オクターブ＋きらめき＋和音で締め（levelupより豪華・約0.8秒）
  weaponUp() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.045, dur: 0.13, gain: 0.2 });
      tone({ type: 'triangle', freq: noteFreq(n) * 2, start: i * 0.045, dur: 0.09, gain: 0.07 });
    });
    // 到達点の和音（C-E-G-Cを一気に鳴らして華やかに）
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.3 + i * 0.02, dur: 0.34, gain: 0.15 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.34, dur: 0.4, gain: 0.12 });
    noiseHit({ start: 0.3, dur: 0.22, gain: 0.07, hpFreq: 5000 });
    noiseHit({ start: 0.5, dur: 0.18, gain: 0.05, hpFreq: 7000 });
  },
  // 必殺技発動：溜め→特大炸裂→余韻のフル演出（テンポよく派手に・約1.2秒）
  // 溜めを0.45秒に詰めてテンポを上げ、きらめきライザーで「来るぞ！」感を強化。
  special() {
    // 予備動作：低く沈む唸り＋うねる下降
    tone({ type: 'sine', freq: 190, freqEnd: 40, dur: 0.45, gain: 0.32, attack: 0.002 });
    tone({ type: 'sawtooth', freq: 95, freqEnd: 30, dur: 0.42, gain: 0.12 });
    // チャージスイープ（0.45秒で一気に上昇）＋きらめきライザー
    tone({ type: 'triangle', freq: 150, freqEnd: 2800, dur: 0.45, gain: 0.16 });
    tone({ type: 'square', freq: 75, freqEnd: 1400, dur: 0.45, gain: 0.08 });
    noiseHit({ dur: 0.42, gain: 0.08, hpFreq: 300, lpFreq: 5000 });
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: 0.08 + i * 0.09, dur: 0.1, gain: 0.09 });
    });
    // 炸裂（0.45秒地点）：ノイズバースト＋特大低音インパクト
    noiseHit({ start: 0.45, dur: 0.45, gain: 0.26, hpFreq: 120, lpFreq: 9000 });
    noiseHit({ start: 0.45, dur: 0.2, gain: 0.12, hpFreq: 2500, lpFreq: 13000 });
    tone({ type: 'sine', freq: 230, freqEnd: 30, dur: 0.5, start: 0.45, gain: 0.34, attack: 0.002 });
    tone({ type: 'triangle', freq: 110, freqEnd: 26, dur: 0.45, start: 0.45, gain: 0.14, attack: 0.002 });
    // 炸裂和音（Cメジャー・広い音域で派手に）
    [NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.47 + i * 0.014, dur: 0.42, gain: 0.12 });
    });
    // 余韻：高音チャイムが残る
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.72, dur: 0.42, gain: 0.14 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.8, dur: 0.34, gain: 0.1 });
    noiseHit({ start: 0.72, dur: 0.32, gain: 0.05, hpFreq: 6000 });
  },
  // 必殺技チャージ：低音から一気に駆け上がる上昇スイープ＋きらめきで「来るぞ！」の高揚（約0.6秒）
  // 必殺技演出が bigBoom の直前に鳴らす想定。単体でも完結する溜め音。
  specialCharge() {
    // 上昇スイープ3層（うねりと厚み）
    tone({ type: 'sawtooth', freq: 80, freqEnd: 900, dur: 0.6, gain: 0.10 });
    tone({ type: 'triangle', freq: 160, freqEnd: 2400, dur: 0.6, gain: 0.15 });
    tone({ type: 'square', freq: 120, freqEnd: 1800, dur: 0.58, gain: 0.06 });
    // ノイズライザー（だんだん明るく持ち上げる）
    noiseHit({ dur: 0.3, gain: 0.05, hpFreq: 400, lpFreq: 3000 });
    noiseHit({ start: 0.3, dur: 0.3, gain: 0.09, hpFreq: 900, lpFreq: 9000 });
    // きらめき上昇アルペジオ
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: 0.1 + i * 0.09, dur: 0.14, gain: 0.12 });
      tone({ type: 'square', freq: noteFreq(n) * 2, start: 0.1 + i * 0.09, dur: 0.08, gain: 0.04 });
    });
    // 締めのチャイム（頂点で「来た！」）
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.55, dur: 0.2, gain: 0.14 });
  },
  // 特大炸裂：ズドン！重い低音インパクト＋ノイズバースト＋広い炸裂和音（約0.8秒・歪ませず厚みで派手に）
  // 必殺技のトドメや大ボスの決定打で鳴らす想定。
  bigBoom() {
    // 重い低音インパクト2層（芯＋サブ）
    tone({ type: 'sine', freq: 210, freqEnd: 28, dur: 0.55, gain: 0.34, attack: 0.002 });
    tone({ type: 'triangle', freq: 100, freqEnd: 24, dur: 0.5, gain: 0.16, attack: 0.002 });
    // 炸裂ノイズバースト（明るめ・歪ませない）
    noiseHit({ dur: 0.4, gain: 0.22, hpFreq: 120, lpFreq: 9000 });
    noiseHit({ start: 0.02, dur: 0.25, gain: 0.12, hpFreq: 2000, lpFreq: 13000 });
    // 広い音域の炸裂和音（Cメジャー・分厚く）
    [NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.02 + i * 0.012, dur: 0.45, gain: 0.11 });
    });
    // 余韻のきらめき
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.25, dur: 0.4, gain: 0.13 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.32, dur: 0.3, gain: 0.09 });
    noiseHit({ start: 0.25, dur: 0.2, gain: 0.05, hpFreq: 6500 });
  },
  // 必殺技ゲージ満タン：短い「チャリン↑」3音（約0.25秒）
  gaugeFull() {
    const seq = [NOTE.G5, NOTE.C6, NOTE.E6];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: i * 0.055, dur: 0.13, gain: 0.2 });
      tone({ type: 'square', freq: noteFreq(n) * 2, start: i * 0.055, dur: 0.07, gain: 0.05 });
    });
    noiseHit({ start: 0.11, dur: 0.1, gain: 0.05, hpFreq: 7000 });
  },
  // クリア：明るい勝利ファンファーレ＋ドラム一撃＋到達和音のきらめき（派手に）
  clear() {
    noiseHit({ dur: 0.14, gain: 0.1, hpFreq: 1500, lpFreq: 9000 });
    tone({ type: 'sine', freq: 150, freqEnd: 50, dur: 0.14, gain: 0.18, attack: 0.002 });
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.12, dur: 0.16, gain: 0.2 });
      tone({ type: 'triangle', freq: noteFreq(n) / 2, start: i * 0.12, dur: 0.16, gain: 0.1 });
    });
    const chord = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
    chord.forEach((n) => {
      tone({ type: 'square', freq: noteFreq(n), start: 0.72, dur: 0.6, gain: 0.13 });
    });
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.76, dur: 0.55, gain: 0.13 });
    noiseHit({ start: 0.72, dur: 0.2, gain: 0.05, hpFreq: 6000 });
  },
  // クッキーブーメラン投擲：「ぽよ〜ん↑」の軽い放物線＋クッキーのサクッ
  boomerang() {
    tone({ type: 'triangle', freq: 520, freqEnd: 880, dur: 0.11, gain: 0.15 });
    tone({ type: 'sine', freq: 1040, freqEnd: 700, start: 0.09, dur: 0.1, gain: 0.08 });
    noiseHit({ dur: 0.05, gain: 0.04, hpFreq: 3000, lpFreq: 9000 });
  },
  // おんぷリング発射：「ぽわ〜ん」と広がる3度重ねの丸い音
  ringwave() {
    tone({ type: 'sine', freq: noteFreq(NOTE.E5), dur: 0.22, gain: 0.13, attack: 0.012 });
    tone({ type: 'sine', freq: noteFreq(NOTE.G5), start: 0.03, dur: 0.2, gain: 0.09, attack: 0.012 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6), start: 0.06, dur: 0.16, gain: 0.06 });
  },
};

// ================= BGM =================
// 3曲構成（battle / boss / result）。全曲とも 16分音符ステップを setTimeout で駆動。
// STEPS_PER_BAR は共通16。STEP_SEC・小節数・声部は曲ごとに切替える。
const STEPS_PER_BAR = 16;

// --- 曲1: 通常戦闘 battle（Cメジャー・150BPM・8小節・王道進行 C-G-Am-F / C-G-F-G）---
// 四つ打ちキック＋オフビートのコードスタブ＋16分ハットで踊れるポップに。
// 前半4小節はメロディ主体、後半4小節はアルペジオを重ねて盛り上げる。
const CHORDS = [
  { arp: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], stab: [NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 }, // C
  { arp: [NOTE.D5, NOTE.G5, NOTE.B5, NOTE.D6], stab: [NOTE.D4, NOTE.G4, NOTE.B4], bass: NOTE.G2 }, // G
  { arp: [NOTE.A4, NOTE.C5, NOTE.E5, NOTE.A5], stab: [NOTE.E4, NOTE.A4, NOTE.C5], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F5, NOTE.A5, NOTE.C6, NOTE.F5], stab: [NOTE.F4, NOTE.A4, NOTE.C5], bass: NOTE.F2 }, // F
  { arp: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], stab: [NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 }, // C
  { arp: [NOTE.D5, NOTE.G5, NOTE.B5, NOTE.D6], stab: [NOTE.D4, NOTE.G4, NOTE.B4], bass: NOTE.G2 }, // G
  { arp: [NOTE.F5, NOTE.A5, NOTE.C6, NOTE.F5], stab: [NOTE.F4, NOTE.A4, NOTE.C5], bass: NOTE.F2 }, // F
  { arp: [NOTE.D5, NOTE.G5, NOTE.B5, NOTE.D6], stab: [NOTE.D4, NOTE.G4, NOTE.B4], bass: NOTE.G2 }, // G
];

// 明るいリードメロディ（battleのみ16分解像度＝1小節16ステップ・-1は休符）。
// 付点8分（3ステップ）を軸にしたシンコペーションで跳ねさせる。
const MELODY = [
  [NOTE.G5, -1, -1, NOTE.C6, -1, -1, NOTE.B5, -1, NOTE.G5, -1, NOTE.E5, -1, NOTE.G5, -1, -1, -1],
  [NOTE.A5, -1, -1, NOTE.B5, -1, -1, NOTE.D6, -1, NOTE.B5, -1, NOTE.G5, -1, NOTE.A5, -1, NOTE.B5, -1],
  [NOTE.C6, -1, -1, NOTE.A5, -1, -1, NOTE.E5, -1, NOTE.A5, -1, NOTE.C6, -1, NOTE.B5, -1, -1, -1],
  [NOTE.A5, -1, NOTE.C6, -1, -1, NOTE.F5, -1, -1, NOTE.A5, -1, NOTE.G5, -1, NOTE.F5, -1, NOTE.E5, -1],
  [NOTE.C6, -1, -1, NOTE.E6, -1, -1, NOTE.D6, -1, NOTE.C6, -1, NOTE.G5, -1, NOTE.C6, -1, -1, -1],
  [NOTE.B5, -1, -1, NOTE.D6, -1, -1, NOTE.B5, -1, NOTE.G5, -1, NOTE.A5, -1, NOTE.B5, -1, NOTE.D6, -1],
  [NOTE.C6, -1, -1, NOTE.A5, -1, NOTE.F5, -1, -1, NOTE.A5, -1, NOTE.C6, -1, NOTE.D6, -1, NOTE.C6, -1],
  [NOTE.B5, -1, NOTE.A5, -1, NOTE.G5, -1, NOTE.A5, -1, NOTE.B5, -1, NOTE.C6, -1, NOTE.D6, -1, -1, -1],
];

// ベースのオフビート位置（1小節16ステップ中）。3・11の食い込みでノリを出す。
const BASS_STEPS = [0, 3, 6, 8, 11, 14];
// コードスタブは8分裏（&）に置く
const STAB_STEPS = [2, 6, 10, 14];

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
  battle: { bpm: 150, bars: 8, chords: CHORDS,        melody: MELODY,        style: 'battle' },
  boss:   { bpm: 152, bars: 4, chords: CHORDS_BOSS,   melody: MELODY_BOSS,   style: 'boss'   },
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
    // ベース：オフビート込みの跳ねるパターン（triangle＋squareで芯を出す）
    if (BASS_STEPS.indexOf(inBar) >= 0) {
      const bf = noteFreq(chord.bass);
      tone({ type: 'triangle', freq: bf, dur: stepSec * 1.9,
             gain: 0.22, dest: bgmGain, attack: 0.005 });
      tone({ type: 'square', freq: bf * 2, dur: stepSec * 1.2,
             gain: 0.05, dest: bgmGain, attack: 0.005 });
    }
    // コードスタブ：8分裏に和音を短く刺してポップな推進力を作る
    if (STAB_STEPS.indexOf(inBar) >= 0) {
      chord.stab.forEach((n) => {
        tone({ type: 'square', freq: noteFreq(n), dur: stepSec * 1.1,
               gain: 0.075, dest: bgmGain, attack: 0.004 });
      });
    }
    // アルペジオ：後半4小節だけ8分で重ねて盛り上げる（前半はメロディを立たせる）
    if (bar >= 4 && inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'triangle', freq: noteFreq(chord.arp[arpIdx]), dur: stepSec * 1.4,
             gain: 0.05, dest: bgmGain, attack: 0.004 });
    }
    // リードメロディ：16分解像度。squareの主旋律にdetuneした薄い重ね＋オクターブ上のきらめきで厚みを出す
    const m = song.melody[bar][inBar];
    if (m !== undefined && m !== -1) {
      const mf = noteFreq(m);
      tone({ type: 'square', freq: mf, dur: stepSec * 2.4,
             gain: 0.17, dest: bgmGain, attack: 0.005 });
      tone({ type: 'triangle', freq: mf, dur: stepSec * 2.2,
             gain: 0.08, dest: bgmGain, attack: 0.005, detune: 9 });
      tone({ type: 'triangle', freq: mf, dur: stepSec * 2.2,
             gain: 0.07, dest: bgmGain, attack: 0.005, detune: -9 });
      tone({ type: 'triangle', freq: mf / 2, dur: stepSec * 2.0,
             gain: 0.05, dest: bgmGain, attack: 0.006 });
      // オクターブ上のきらめき（拍頭で軽く上物を足して華やかに）
      if (inBar % 4 === 0) {
        tone({ type: 'triangle', freq: mf * 2, dur: stepSec * 1.4,
               gain: 0.045, dest: bgmGain, attack: 0.004 });
      }
    }
    // キック：四つ打ち＋小節終盤に食い込み1発。サブ低音を重ねてズンと厚く
    if (inBar % 4 === 0 || inBar === 14) {
      tone({ type: 'sine', freq: 150, freqEnd: 48, dur: 0.13, gain: 0.25,
             dest: bgmGain, attack: 0.002 });
      tone({ type: 'triangle', freq: 70, freqEnd: 34, dur: 0.11, gain: 0.10,
             dest: bgmGain, attack: 0.002 });
      noiseHit({ dur: 0.02, gain: 0.04, hpFreq: 3000, lpFreq: 9000, dest: bgmGain });
    }
    // スネア＋ハンドクラップ：2拍4拍（クラップ2枚重ねで厚みを増す）
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.1, gain: 0.11, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
      noiseHit({ start: 0.012, dur: 0.09, gain: 0.07, hpFreq: 1100, lpFreq: 6000, dest: bgmGain });
      noiseHit({ start: 0.026, dur: 0.07, gain: 0.05, hpFreq: 1300, lpFreq: 7000, dest: bgmGain });
    }
    // ハット：8分でキープしオフビートにアクセント。小節後半は16分で刻んで疾走感
    if (inBar % 2 === 0) {
      const acc = (inBar % 4 === 2) ? 0.058 : 0.03;
      noiseHit({ dur: 0.035, gain: acc, hpFreq: 6500, lpFreq: 13000, dest: bgmGain });
    } else if (inBar >= 8) {
      noiseHit({ dur: 0.025, gain: 0.022, hpFreq: 7000, lpFreq: 13000, dest: bgmGain });
    }
    // クラッシュシンバル：フレーズ頭（0・4小節の頭）で抜けよく盛り上げる
    if (inBar === 0 && (bar === 0 || bar === 4)) {
      noiseHit({ dur: 0.35, gain: 0.07, hpFreq: 4000, lpFreq: 14000, dest: bgmGain });
    }
    // オープンハット：小節終わりの抜け
    if (inBar === 14) {
      noiseHit({ dur: 0.11, gain: 0.05, hpFreq: 5000, lpFreq: 12000, dest: bgmGain });
    }
    // 最終小節の後半はスネア＋タムのフィルでループへ勢いよく繋ぐ
    if (bar === song.bars - 1 && inBar >= 12) {
      noiseHit({ dur: 0.05, gain: 0.06 + (inBar - 12) * 0.016,
                 hpFreq: 1800, lpFreq: 9000, dest: bgmGain });
      // 下降タム風の音程フィルで盛り上げる
      tone({ type: 'triangle', freq: noteFreq(NOTE.G4) - (inBar - 12) * 12, dur: 0.09,
             gain: 0.09, dest: bgmGain, attack: 0.003 });
    }
  } else if (song.style === 'boss') {
    // ベース：8分刻みで駆動感。6・14ステップ目はオクターブ上。sawのサブを重ねて太く
    if (inBar % 2 === 0) {
      const oct = (inBar === 6 || inBar === 14) ? 12 : 0;
      tone({ type: 'square', freq: noteFreq(chord.bass + oct), dur: stepSec * 1.8,
             gain: 0.14, dest: bgmGain, attack: 0.005 });
      tone({ type: 'sawtooth', freq: noteFreq(chord.bass + oct) / 2, dur: stepSec * 1.6,
             gain: 0.06, dest: bgmGain, attack: 0.006 });
    }
    // アルペジオ：8分音符で薄く土台を補強
    if (inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'square', freq: noteFreq(chord.arp[arpIdx]), dur: stepSec * 1.4,
             gain: 0.06, dest: bgmGain, attack: 0.005 });
    }
    // パワーコードスタブ：拍頭にarpの1・5度を短く刺して迫力を出す（明るさは残す）
    if (inBar % 4 === 0) {
      tone({ type: 'square', freq: noteFreq(chord.arp[0]), dur: stepSec * 1.1,
             gain: 0.07, dest: bgmGain, attack: 0.004 });
      tone({ type: 'square', freq: noteFreq(chord.arp[2]), dur: stepSec * 1.1,
             gain: 0.06, dest: bgmGain, attack: 0.004 });
    }
    // リード：sawtoothで通常曲と音色を差別化＋detune薄重ね＋オクターブ上のきらめきで厚く
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== -1) {
        const mf = noteFreq(m);
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 1.7,
               gain: 0.11, dest: bgmGain, attack: 0.005 });
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 1.6,
               gain: 0.05, dest: bgmGain, attack: 0.005, detune: 10 });
        tone({ type: 'triangle', freq: mf * 2, dur: stepSec * 1.2,
               gain: 0.035, dest: bgmGain, attack: 0.005 });
      }
    }
    // ドラム：キック4つ打ち＋食い込み・スネア中間＋クラップ・ハット16分裏。サブ低音で厚み
    if (inBar % 4 === 0 || inBar === 10) {
      tone({ type: 'sine', freq: 150, freqEnd: 45, dur: 0.12, gain: 0.23,
             dest: bgmGain, attack: 0.002 });
      tone({ type: 'triangle', freq: 72, freqEnd: 32, dur: 0.1, gain: 0.09,
             dest: bgmGain, attack: 0.002 });
    }
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.1, gain: 0.11, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
      noiseHit({ start: 0.014, dur: 0.08, gain: 0.06, hpFreq: 1100, lpFreq: 6000, dest: bgmGain });
      noiseHit({ start: 0.028, dur: 0.06, gain: 0.045, hpFreq: 1300, lpFreq: 7000, dest: bgmGain });
    }
    if (inBar % 2 === 1) {
      noiseHit({ dur: 0.03, gain: 0.038, hpFreq: 6000, lpFreq: 12000, dest: bgmGain });
    }
    // 最終小節の後半はライザー＆スネアロールで山場感を出しループへ繋ぐ
    if (bar === song.bars - 1 && inBar >= 12) {
      noiseHit({ dur: 0.05, gain: 0.05 + (inBar - 12) * 0.016,
                 hpFreq: 2000, lpFreq: 10000, dest: bgmGain });
      tone({ type: 'sawtooth', freq: 300 + (inBar - 12) * 90, dur: stepSec * 1.2,
             gain: 0.05, dest: bgmGain, attack: 0.004 });
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
    // メロディ：triangle・8分解像度＋オクターブ上のやわらかいベルで達成感を添える
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== -1) {
        tone({ type: 'triangle', freq: noteFreq(m), dur: stepSec * 2.4,
               gain: 0.12, dest: bgmGain, attack: 0.01 });
        tone({ type: 'sine', freq: noteFreq(m) * 2, dur: stepSec * 2.0,
               gain: 0.045, dest: bgmGain, attack: 0.012 });
      }
    }
    // フレーズ頭で温かいベルのきらめきを1音（達成感・派手にしすぎない）
    if (inBar === 0) {
      tone({ type: 'sine', freq: noteFreq(NOTE.C6), dur: stepSec * 6,
             gain: 0.05, dest: bgmGain, attack: 0.02 });
    }
    // ドラムは無し。小節中間に控えめなハットのみ
    if (inBar === 8) {
      noiseHit({ dur: 0.04, gain: 0.032, hpFreq: 7000, lpFreq: 12000, dest: bgmGain });
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
    masterGain.gain.value = muted ? 0 : MASTER_VOL;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(masterGain);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.78; // BGMはSFXよりやや控えめ（ノリを出すため0.7から微増）
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
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, now + 0.05);
    }
    return muted;
  },
};
