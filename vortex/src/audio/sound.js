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
// Gs（G#）は最終ボス曲の E メジャー和音（ハーモニックマイナーのドミナント＝荘厳の決め手）に使う。
const NOTE = {
  C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, Gs4: -1, A4: 0, B4: 2,
  C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, Gs5: 11, A5: 12, B5: 14,
  C6: 15, D6: 17, E6: 19, F6: 20, G6: 22, A6: 24,
  C3: -21, D3: -19, E3: -17, F3: -16, G3: -14, Gs3: -13, A3: -12, B3: -10,
  C2: -33, D2: -31, E2: -29, F2: -28, G2: -26, A2: -24, B2: -22,
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
  // 弾発射：軽い上昇ピュン（三角波）。FB#6: 芯の矩形＋極短ノイズで「撃った」当たりを足して派手に。
  shoot() {
    tone({ type: 'triangle', freq: 620, freqEnd: 1160, dur: 0.10, gain: 0.16 });
    tone({ type: 'square', freq: 320, freqEnd: 520, dur: 0.05, gain: 0.06 });
    noiseHit({ dur: 0.02, gain: 0.03, hpFreq: 3000, lpFreq: 12000 });
  },
  // R14: heroGun（銃発射音）と starShot（旧主人公ショット音）は銃全廃に伴い削除。
  // 腕の技は既存の wireShot/wireFly/metalSlam を使う（新規音は追加していない）。
  // R21W2: カウンター（敵の予告を殴って止めた）。20回/分鳴るので極短・控えめに。
  // pop より高く硬い「キィン」で、通常ヒット(hit)と聞き分けられるようにする。
  counter() {
    tone({ type: 'square', freq: 1180, freqEnd: 1760, dur: 0.05, gain: 0.13 });
    tone({ type: 'triangle', freq: 2360, freqEnd: 1560, dur: 0.05, gain: 0.06 });
    noiseHit({ dur: 0.03, gain: 0.05, hpFreq: 5000, lpFreq: 13000 });
  },
  // R21W3: グレイズ（敵弾を判定+9pxですれすれに避けた）。「避けた」を伝える音がゲーム内に
  //   1つも無く、緊張が快感に変換されていなかった。空気を切る「ヒュッ」だけ。多発するので
  //   音程を持たせず（ヒット音と混ざらない）、gain も pop の半分以下に抑える。
  graze() {
    noiseHit({ dur: 0.09, gain: 0.05, hpFreq: 2600, lpFreq: 9000 });
  },
  // 雑魚撃破の「ポンっ」（Wave C）。多発するので極短＋控えめゲインで耳に痛くしない
  pop() {
    tone({ type: 'sine', freq: 880, freqEnd: 1320, dur: 0.06, gain: 0.12 });
  },
  // ラッシュ予告（Wave C）。capture と同じ上昇アルペジオ型で「来るぞ！」感を出す
  rush() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
    seq.forEach((n, i) => {
      tone({ type: 'square', freq: noteFreq(n), start: i * 0.1, dur: 0.14, gain: 0.14 });
      tone({ type: 'triangle', freq: noteFreq(n) * 2, start: i * 0.1, dur: 0.1, gain: 0.07 });
    });
    noiseHit({ start: 0.3, dur: 0.14, gain: 0.06, hpFreq: 5000 });
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
  // FB#1: 回復アイテム取得。やわらかい正弦波の上昇3音＋高音のきらめきで「元気になった」あたたかい響き。
  // pickup（矩形2音）や capture（きらきらアルペジオ）と音色・波形を変えて混同しないようにする。
  heal() {
    tone({ type: 'sine', freq: noteFreq(NOTE.G4), dur: 0.13, gain: 0.17, attack: 0.006 });
    tone({ type: 'sine', freq: noteFreq(NOTE.C5), start: 0.07, dur: 0.14, gain: 0.17, attack: 0.006 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.E5), start: 0.14, dur: 0.22, gain: 0.14, attack: 0.008 });
    tone({ type: 'sine', freq: noteFreq(NOTE.C6), start: 0.17, dur: 0.24, gain: 0.08, attack: 0.01 });
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
  // FB#5: 武器レベルアップの上昇スティンガー。weaponUp のファンファーレに重ねる短い駆け上がり（約0.3秒）。
  // 「段が1つ上がった！」の瞬間を鋭く強調する。単体でも上昇感が出る。
  weaponTier() {
    tone({ type: 'triangle', freq: 300, freqEnd: 1600, dur: 0.28, gain: 0.12 });
    tone({ type: 'square', freq: 150, freqEnd: 800, dur: 0.26, gain: 0.05 });
    noiseHit({ start: 0.18, dur: 0.12, gain: 0.05, hpFreq: 5000 });
  },
  // FB#7: 被弾（プレイヤー）。効いたのが伝わるが怖すぎない、短い低音のインパクト＋やわらかいノイズ。
  // R12: 引数 weight(0..1・最大HPに対するダメージ割合) で重みが変わる。かすり傷と大ダメージが
  // 同じ音だと「何にやられたか」が分からないため、重いほど低く長く沈ませる（怖がらせすぎない範囲）。
  hurt(weight) {
    const w = weight == null ? 0.35 : Math.max(0, Math.min(1, weight));
    const f0 = 300 - 80 * w;                       // 重いほど低く
    tone({ type: 'sine', freq: f0, freqEnd: 80, dur: 0.14 + 0.1 * w, gain: 0.2 + 0.08 * w, attack: 0.002 });
    tone({ type: 'triangle', freq: 400, freqEnd: 180, dur: 0.10, gain: 0.08 });
    noiseHit({ dur: 0.08 + 0.05 * w, gain: 0.09 + 0.05 * w, hpFreq: 300, lpFreq: 2600 });
    // 大ダメージのときだけ、金属装甲がへこむ軋みを足す
    if (w > 0.25) tone({ type: 'sawtooth', freq: 160, freqEnd: 60, start: 0.03, dur: 0.16, gain: 0.06 });
  },

  // ── R12: 突撃兵（主人公の主武器＝クラッシュアーム） ──
  // 殴打。引数 heat(0..1) は連撃ヒート。殴り続けるほど音程と芯が上がり「乗ってくる」感触を出す。
  // 0.3秒間隔で鳴り続けるので、極短＋控えめゲインで連打しても耳に痛くしない。
  // R21: pitch（±5%の揺らぎ）を受ける。イースの打撃が連打でも機械的に聞こえないのは、
  // 1発ごとに音程と質感が僅かに違うため。さらに「殴った」実感を出すため、低域の芯を
  // 一段厚くし（sineの倍音としてtriangleを重ねる）、立ち上がりの噛みつきをノイズで作る。
  heroPunch(heat, pitch) {
    const h = heat == null ? 0 : Math.max(0, Math.min(1, heat));
    const q = pitch == null ? 1 : pitch;
    const base = (210 + 120 * h) * q;
    tone({ type: 'square', freq: base, freqEnd: base * 0.42, dur: 0.06, gain: 0.16 });        // 打撃の当たり
    tone({ type: 'sine', freq: base * 0.5, freqEnd: base * 0.28, dur: 0.12, gain: 0.15, attack: 0.002 }); // 芯の重さ
    // 芯の一段下。骨に響く重さはここで出る（低すぎると小型スピーカーで消えるので0.34倍まで）
    tone({ type: 'triangle', freq: base * 0.34, freqEnd: base * 0.2, dur: 0.14, gain: 0.10, attack: 0.003 });
    noiseHit({ dur: 0.045, gain: 0.11 + 0.05 * h, hpFreq: 700, lpFreq: 6000 + 4000 * h });     // 金属の擦れ
    // ヒートが高いときだけ、拳の熱が抜ける高音のきらめきを重ねる（派手さの上乗せ）
    if (h > 0.55) tone({ type: 'triangle', freq: (900 + 500 * h) * q, freqEnd: (1600 + 700 * h) * q, start: 0.02, dur: 0.07, gain: 0.06 });
  },
  // R21: 仲間の攻撃が敵に当たった音（新設）。着手前は仲間側に命中音が存在せず、
  // 鳴っていたのは「武器を振った音」だけだった＝当たっても無反応に見えていた主因。
  // 6体×高頻度で当たるので、短く・軽く・低音を持たせない（heroPunch の主役を食わない）。
  // 呼び出し側が最短間隔で間引く前提の音量設計。
  allyHit(power, pitch) {
    const p = power == null ? 0.5 : Math.max(0, Math.min(1, power));
    const q = pitch == null ? 1 : pitch;
    const base = (620 + 220 * p) * q;
    tone({ type: 'square', freq: base, freqEnd: base * 0.55, dur: 0.035, gain: 0.055 + 0.02 * p });
    noiseHit({ dur: 0.028, gain: 0.045 + 0.02 * p, hpFreq: 2600, lpFreq: 11000 });
  },
  // ヒート満タン到達の合図（1回だけ鳴らす）。上昇アルペジオで「腕が焼けた」高揚を出す。
  heatMax() {
    tone({ type: 'triangle', freq: 520, freqEnd: 1040, dur: 0.16, gain: 0.13 });
    tone({ type: 'square', freq: 260, freqEnd: 520, dur: 0.14, gain: 0.06 });
    tone({ type: 'sine', freq: 1300, freqEnd: 1900, start: 0.08, dur: 0.12, gain: 0.07 });
    noiseHit({ start: 0.02, dur: 0.06, gain: 0.05, hpFreq: 4000, lpFreq: 13000 });
  },
  // 体力が危険域に落ちた合図（閾値を割った瞬間に1回だけ）。警告だが怖すぎない2音。
  lowHp() {
    tone({ type: 'triangle', freq: 420, freqEnd: 300, dur: 0.18, gain: 0.14 });
    tone({ type: 'triangle', freq: 330, freqEnd: 240, start: 0.16, dur: 0.22, gain: 0.12 });
    tone({ type: 'sine', freq: 150, freqEnd: 90, dur: 0.3, gain: 0.08, attack: 0.004 });
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
  // R27: 第1引数 power(0..1) を**受け取っていなかった**ので、1体倒しても10体倒しても
  //   まったく同じ音が鳴っていた（呼び出し側は kills/5 を渡していたのに無視されていた）。
  //   ここで尾の長さ・低域の量・和音の枚数を power で変える。無引数の呼び出しは従来どおり。
  bigBoom(power) {
    const p = (power == null) ? 1 : Math.max(0, Math.min(1, power));
    const k = 0.72 + 0.38 * p;      // p=0.6 で従来とほぼ同じ。上にも下にも伸びる
    // 重い低音インパクト2層（芯＋サブ）
    tone({ type: 'sine', freq: 210, freqEnd: 28, dur: 0.55 * k, gain: 0.34 * k, attack: 0.002 });
    tone({ type: 'triangle', freq: 100, freqEnd: 24, dur: 0.5 * k, gain: 0.16 * k, attack: 0.002 });
    // 炸裂ノイズバースト（明るめ・歪ませない）
    noiseHit({ dur: 0.4 * k, gain: 0.22 * k, hpFreq: 120, lpFreq: 9000 });
    noiseHit({ start: 0.02, dur: 0.25 * k, gain: 0.12 * k, hpFreq: 2000, lpFreq: 13000 });
    // 広い音域の炸裂和音（Cメジャー・分厚く）。枚数も power で変える＝規模が耳で分かる
    const chord = [NOTE.C4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
    const take = Math.max(3, Math.min(chord.length, 3 + Math.round(p * 4)));
    for (let i = 0; i < take; i++) {
      tone({ type: 'square', freq: noteFreq(chord[i]), start: 0.02 + i * 0.012, dur: 0.45 * k, gain: 0.11 * k });
    }
    // 余韻のきらめき
    tone({ type: 'triangle', freq: noteFreq(NOTE.G6), start: 0.25, dur: 0.4 * k, gain: 0.13 * k });
    tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.32, dur: 0.3 * k, gain: 0.09 * k });
    noiseHit({ start: 0.25, dur: 0.2 * k, gain: 0.05 * k, hpFreq: 6500 });
  },

  // ★R27 「ガガガガ」の1発ぶん。テトリスの段消しで気持ちがいいのは1発の大きさではなく
  //   **打撃が何回続いたかを耳で数えられる**こと。だから同時に鳴らさず、必ず1発ずつ並べる。
  //   i = 何発目（0起点）。半音ずつ上がる粒が「何段消えたか」を伝える。
  crush(i) {
    const step = Math.max(0, Math.min(11, i | 0));
    // 胴体：低いサイン波が落ちる＝「ガ」の重さ。
    //   ⚠️ 30Hz台まで落とすとノートPCやタブレットのスピーカーでは**再生されずに重さが消える**。
    //   終端を60Hzで止めて、可聴帯(60〜200Hz)にエネルギーを残す。
    tone({ type: 'sine', freq: 180 * Math.pow(1.045, step), freqEnd: 60, dur: 0.10,
           gain: 0.26 + 0.012 * step, attack: 0.001 });
    // 倍音の胴：小さいスピーカーは基音が出なくても倍音から低さを感じ取る（ミッシングファンダメンタル）。
    //   矩形波をここに置くことで「安いスピーカーでも重い」を成立させる。
    tone({ type: 'square', freq: 92, freqEnd: 46, dur: 0.09, gain: 0.11 + 0.006 * step, attack: 0.001 });
    // サブ：ちゃんとした環境でだけ効く土台
    tone({ type: 'triangle', freq: 62, freqEnd: 30, dur: 0.13, gain: 0.10 + 0.006 * step, attack: 0.001 });
    // 破壊のざらつき：低域を残したノイズ（高域だけ通すと紙を破る音になる）
    noiseHit({ dur: 0.045, gain: 0.17 + 0.008 * step, hpFreq: 160, lpFreq: 4200 });
    // 数を伝える粒。半音ずつ上がるので、耳が勝手に段数を数える
    tone({ type: 'square', freq: noteFreq(NOTE.C4 + step), dur: 0.05, gain: 0.075 + 0.006 * step });
  },

  // ★R27 連打の締め。「ガガガガ…ドン！」の最後のドン。倒した数で重さが変わる。
  crushEnd(n) {
    const c = Math.max(1, Math.min(14, n | 0));
    const big = Math.max(0, Math.min(1, (c - 2) / 8));   // 3体で0.13・10体で1.0
    tone({ type: 'sine', freq: 140, freqEnd: 52, dur: 0.55 + 0.25 * big, gain: 0.30 + 0.10 * big, attack: 0.002 });
    // 締めも同じ理由で倍音を持たせる（小型スピーカーで「ドン」が消えないように）
    tone({ type: 'square', freq: 74, freqEnd: 40, dur: 0.30 + 0.20 * big, gain: 0.12 + 0.06 * big, attack: 0.002 });
    tone({ type: 'triangle', freq: 58, freqEnd: 22, dur: 0.50 + 0.30 * big, gain: 0.16 + 0.08 * big, attack: 0.002 });
    noiseHit({ dur: 0.30 + 0.20 * big, gain: 0.20 + 0.08 * big, hpFreq: 90, lpFreq: 3200 });
    noiseHit({ start: 0.015, dur: 0.10, gain: 0.12, hpFreq: 2200, lpFreq: 12000 });
    // 上昇和音。枚数が段数に比例する＝「今のは大きかった」が音だけで分かる
    const chord = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
    const take = Math.min(chord.length, 2 + Math.round(big * 6));
    for (let i = 0; i < take; i++) {
      tone({ type: 'square', freq: noteFreq(chord[i]), start: 0.02 + i * 0.018, dur: 0.34, gain: 0.10 });
    }
    if (c >= 8) {   // ここだけの特別な余韻＝テトリスの4段消しに当たる位置
      tone({ type: 'triangle', freq: noteFreq(NOTE.C6) * 2, start: 0.30, dur: 0.35, gain: 0.12 });
      noiseHit({ start: 0.30, dur: 0.25, gain: 0.06, hpFreq: 6000 });
    }
  },

  // ---- R24 投げの効果音（段位で3段階）----
  // 実プレイFB「メガ投げ？ボルテクス投げ？と名称は勇ましいが、なにもレベルアップしたことが
  //   感じられない。投げたときの効果音」。段位が上がったのに音が同じなら、耳では何も変わっていない。
  // ⚠️ 音量ではなく**中身**を変える。低音の層が増え、芯が下がり、余韻が伸びる＝「重くなった」。
  throwLight() {
    // 軽い「ヒュッ・パンッ」。序盤の弾は軽いことがはっきり分かるように高く短く。
    tone({ type: 'triangle', freq: 880, freqEnd: 420, dur: 0.09, gain: 0.16, attack: 0.002 });
    tone({ type: 'square', freq: 300, freqEnd: 190, dur: 0.07, gain: 0.09 });
    noiseHit({ dur: 0.05, gain: 0.10, hpFreq: 2500, lpFreq: 12000 });
  },
  throwHeavy() {
    // 「ドンッ」。低音の芯が入り、ノイズの尾が伸びる。
    tone({ type: 'sine', freq: 260, freqEnd: 62, dur: 0.30, gain: 0.30, attack: 0.002 });
    tone({ type: 'square', freq: 520, freqEnd: 210, dur: 0.12, gain: 0.13 });
    tone({ type: 'triangle', freq: 120, freqEnd: 44, dur: 0.26, gain: 0.14 });
    noiseHit({ dur: 0.16, gain: 0.16, hpFreq: 500, lpFreq: 10000 });
    noiseHit({ start: 0.02, dur: 0.08, gain: 0.08, hpFreq: 3500 });
  },
  throwUltra() {
    // 「ゴォンッ…」。サブベース＋金属の芯＋明るい和音の余韻。ここまで来ると音だけで段位が分かる。
    tone({ type: 'sine', freq: 300, freqEnd: 34, dur: 0.55, gain: 0.34, attack: 0.002 });
    tone({ type: 'triangle', freq: 150, freqEnd: 30, dur: 0.48, gain: 0.18, attack: 0.002 });
    tone({ type: 'square', freq: 700, freqEnd: 230, dur: 0.16, gain: 0.15 });
    noiseHit({ dur: 0.30, gain: 0.20, hpFreq: 260, lpFreq: 9000 });
    noiseHit({ start: 0.02, dur: 0.10, gain: 0.10, hpFreq: 4500, lpFreq: 14000 });
    [NOTE.C5, NOTE.G5, NOTE.C6].forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: 0.05 + i * 0.03, dur: 0.34, gain: 0.11 });
    });
  },
  // R24 ほのおだんの炸裂：らいこうだんの「パキッ」に対して、こちらは「ボワッ→ゴォォ」。
  // 高域の割れる音を出さず、低〜中域のうねりで「面が燃え広がる」を作る。
  // ★R28 「炎熱炸裂弾も同様に派手すぎるぐらい」。power(0..1) で規模が変わる。
  //   雷が「裂ける」なら炎は「膨らんで、長く燃え続ける」。尾の長さで別物として聞かせる。
  fireBlast(power) {
    const p = (power == null) ? 1 : Math.max(0, Math.min(1, power));
    const k = 0.8 + 0.5 * p;
    // ① 点火の一撃（ドッ）
    noiseHit({ dur: 0.13 * k, gain: 0.26 * k, hpFreq: 200, lpFreq: 5200 });
    tone({ type: 'sawtooth', freq: 190, freqEnd: 42, dur: 0.48 * k, gain: 0.24 * k, attack: 0.003 });
    tone({ type: 'sine', freq: 250, freqEnd: 46, dur: 0.62 * k, gain: 0.31 * k, attack: 0.003 });
    // 小型スピーカー用の倍音（R27と同じ理由）
    tone({ type: 'square', freq: 88, freqEnd: 42, dur: 0.36 * k, gain: 0.14 * k, attack: 0.003 });
    // ② 膨らむ火球。帯域を上から下へ動かすと「広がった」ように聞こえる
    noiseHit({ start: 0.04, dur: 0.55 * k, gain: 0.19 * k, hpFreq: 120, lpFreq: 3400 });
    noiseHit({ start: 0.26, dur: 0.50 * k, gain: 0.12 * k, hpFreq: 90, lpFreq: 1900 });
    // ③ 燃え続ける尾。ここを長くするほど「まだ燃えている」になる
    noiseHit({ start: 0.50, dur: 0.55 * k, gain: 0.09 * k, hpFreq: 70, lpFreq: 1200 });
    if (p >= 0.9) {
      noiseHit({ start: 0.85, dur: 0.45, gain: 0.06, hpFreq: 60, lpFreq: 900 });
      // 爆ぜる粒（パチパチ）。着弾のときだけ
      for (let i = 0; i < 7; i++) {
        noiseHit({ start: 0.12 + i * 0.10, dur: 0.03, gain: 0.055, hpFreq: 2600, lpFreq: 12000 });
      }
    }
    // ④ 明るい和音（ポップさの層）。枚数が power で増える
    const chord = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5];
    const take = Math.max(3, Math.min(chord.length, 3 + Math.round(p * 2)));
    for (let i = 0; i < take; i++) {
      tone({ type: 'triangle', freq: noteFreq(chord[i]), start: 0.03 + i * 0.025, dur: 0.42, gain: 0.11 * k });
    }
  },

  // R23 らいこうだんの手渡し：スローモーションの間ずっと鳴る「充電が満ちる」上昇音。
  // ⚠️ この音が鳴っている＝時間が遅い、と耳で分かるようにゆっくり上げる（1.1秒）。
  boltCharge() {
    tone({ type: 'triangle', freq: 180, freqEnd: 1300, dur: 1.0, gain: 0.16, attack: 0.05 });
    tone({ type: 'square', freq: 90, freqEnd: 650, dur: 1.0, gain: 0.06, attack: 0.05 });
    // ちりちりと帯電するノイズを重ねる（無音の1秒は「固まった」に見えるので必ず埋める）
    for (let i = 0; i < 7; i++) {
      noiseHit({ start: 0.1 + i * 0.13, dur: 0.05, gain: 0.05, hpFreq: 5000, lpFreq: 15000 });
    }
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((n, i) => {
      tone({ type: 'triangle', freq: noteFreq(n), start: 0.55 + i * 0.1, dur: 0.3, gain: 0.14 });
    });
  },
  // R23 らいこうだんの着弾：落雷。パキッと割れる高音のクラック → 腹に来る低いゴロゴロ。
  // ★R28 実プレイFB「らいこうだんの効果音をもっと派手に。派手すぎるぐらいでいい」。
  //   power(0..1) で規模が変わる。投げ出しは0.75・着弾は1.0で呼ぶ。
  //   本物の雷が怖いのは「裂ける音が何度も重なる」から。1発ではなく3段に割って重ねる。
  thunder(power) {
    const p = (power == null) ? 1 : Math.max(0, Math.min(1, power));
    const k = 0.8 + 0.5 * p;
    // ① 空気が裂ける瞬間を3段に割る＝「バリバリバリッ」。1発だと「パン」で終わってしまう
    const rip = [0, 0.035, 0.085];
    rip.forEach((t, i) => {
      const d = 1 - i * 0.22;
      noiseHit({ start: t, dur: 0.05 * d, gain: 0.30 * k * d, hpFreq: 6000, lpFreq: 16000 });
      noiseHit({ start: t + 0.008, dur: 0.11 * d, gain: 0.22 * k * d, hpFreq: 2200, lpFreq: 14000 });
      tone({ type: 'square', freq: 2600 - i * 420, freqEnd: 620, dur: 0.08 * d,
             gain: 0.15 * k * d, attack: 0.001 });
    });
    // ② 落ちてくる芯。2本を少しずらす＝落雷が1本ではなく束に見える
    tone({ type: 'sine', freq: 330, freqEnd: 44, dur: 0.75 * k, gain: 0.36 * k, attack: 0.002 });
    tone({ type: 'sine', freq: 250, freqEnd: 52, start: 0.04, dur: 0.60 * k, gain: 0.22 * k, attack: 0.002 });
    // 小型スピーカーでも重さが出るように倍音を置く（R27と同じ理由）
    tone({ type: 'square', freq: 96, freqEnd: 44, dur: 0.34 * k, gain: 0.14 * k, attack: 0.002 });
    tone({ type: 'triangle', freq: 140, freqEnd: 30, dur: 0.62 * k, gain: 0.18 * k, attack: 0.002 });
    // ③ 遠くまで転がる余韻（ゴロゴロ）。長いほど「でかい雷だった」になる
    noiseHit({ start: 0.06, dur: 0.60 * k, gain: 0.17 * k, hpFreq: 90, lpFreq: 2600 });
    noiseHit({ start: 0.30, dur: 0.55 * k, gain: 0.11 * k, hpFreq: 70, lpFreq: 1400 });
    noiseHit({ start: 0.62, dur: 0.50 * k, gain: 0.07 * k, hpFreq: 60, lpFreq: 900 });
    // ④ 明るい和音（この作品の「ポップさ」を保つ層）。枚数が power で増える
    const chord = [NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
    const take = Math.max(3, Math.min(chord.length, 3 + Math.round(p * 2)));
    for (let i = 0; i < take; i++) {
      tone({ type: 'square', freq: noteFreq(chord[i]), start: 0.03 + i * 0.02, dur: 0.42, gain: 0.10 * k });
    }
    // ⑤ 高域の残り火（ちりちり）。着弾のときだけ
    if (p >= 0.9) {
      for (let i = 0; i < 5; i++) {
        noiseHit({ start: 0.18 + i * 0.09, dur: 0.05, gain: 0.05, hpFreq: 7000, lpFreq: 16000 });
      }
    }
  },

  // ★R28 らいこうだんが飛んでいる間の放電。0.11秒ごとに鳴らして「ビリビリ」を作る。
  //   arg=強さ(0..1)・pitch=音程倍率。毎回ずらさないと機械の警報音になる。
  boltFly(v, pitch) {
    const g = 0.7 + 0.6 * (v == null ? 0.5 : v);
    const q = pitch || 1;
    noiseHit({ dur: 0.035, gain: 0.15 * g, hpFreq: 5500 * q, lpFreq: 16000 });
    tone({ type: 'square', freq: 2600 * q, freqEnd: 900 * q, dur: 0.045, gain: 0.085 * g, attack: 0.001 });
    tone({ type: 'sawtooth', freq: 430 * q, freqEnd: 190 * q, dur: 0.05, gain: 0.055 * g, attack: 0.001 });
    // 帯電のうなり。ここが無いと「軽いノイズ」で終わって、通り過ぎる重さが出ない
    tone({ type: 'square', freq: 118, freqEnd: 92, dur: 0.09, gain: 0.05 * g, attack: 0.002 });
  },

  // ★R28 ほのおだんが飛んでいる間の燃焼。「ゴォ…パチ」を0.12秒ごと。
  blastFly(v, pitch) {
    const g = 0.7 + 0.6 * (v == null ? 0.5 : v);
    const q = pitch || 1;
    noiseHit({ dur: 0.11, gain: 0.11 * g, hpFreq: 220 * q, lpFreq: 2600 * q });   // ゴォ
    noiseHit({ start: 0.02, dur: 0.022, gain: 0.07 * g, hpFreq: 3500, lpFreq: 13000 }); // パチッ
    tone({ type: 'sawtooth', freq: 152 * q, freqEnd: 96, dur: 0.11, gain: 0.05 * g, attack: 0.004 });
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
  // ── R4: 近接／遠距離フォーム用のかわいい打撃音（どれも極短・控えめ。多発するので耳に優しく）
  // グーパンチ/ビンタ/頭突き：ぽむっと軽い当たり
  punch() {
    tone({ type: 'sine', freq: 300, freqEnd: 150, dur: 0.06, gain: 0.13 });
    noiseHit({ dur: 0.03, gain: 0.05, hpFreq: 1500, lpFreq: 7000 });
  },
  // 巨大ハンマー：ぼよ〜んと弾む重めのヒット（可愛く）
  hammer() {
    tone({ type: 'sine', freq: 200, freqEnd: 70, dur: 0.12, gain: 0.16, attack: 0.002 });
    tone({ type: 'triangle', freq: 420, freqEnd: 210, dur: 0.08, gain: 0.07 });
    noiseHit({ dur: 0.04, gain: 0.06, hpFreq: 400, lpFreq: 3000 });
  },
  // ピアニカおんぷ打：ド→ミの2音でかわいく
  note() {
    tone({ type: 'triangle', freq: noteFreq(NOTE.C5), dur: 0.09, gain: 0.13 });
    tone({ type: 'triangle', freq: noteFreq(NOTE.E5), start: 0.05, dur: 0.1, gain: 0.11 });
  },
  // みずでっぽう：ぴちゅん！と弾ける水音
  water() {
    tone({ type: 'sine', freq: 900, freqEnd: 1500, dur: 0.06, gain: 0.11 });
    noiseHit({ dur: 0.04, gain: 0.05, hpFreq: 2500, lpFreq: 11000 });
  },
  // 念動力弾：ふにょ〜んと揺れる不思議な音
  psychic() {
    tone({ type: 'sine', freq: 500, freqEnd: 780, dur: 0.16, gain: 0.10, attack: 0.02 });
    tone({ type: 'triangle', freq: 780, freqEnd: 500, start: 0.05, dur: 0.14, gain: 0.06 });
  },
  // ── オープニング演出用（コールドオープン） ──
  // 機械のコマンド行スタンプ／単眼行進のカウント：極短の硬いクリック（多発OKな小音量）
  tick() {
    tone({ type: 'square', freq: 1200, freqEnd: 900, dur: 0.03, gain: 0.10 });
    noiseHit({ dur: 0.02, gain: 0.04, hpFreq: 4000, lpFreq: 12000 });
  },
  // 固有名スラムの金属着弾：低音ドロップ＋金属質の矩形＋ノイズ（重いが短い）
  // 拳の着弾＝殴られた大衝撃。より深い低音ドロップ＋鋭いアタックの金属クラッシュで「ドゴォン！」の重量感を強める。
  metalSlam() {
    tone({ type: 'sine', freq: 260, freqEnd: 26, dur: 0.36, gain: 0.34, attack: 0.001 });
    tone({ type: 'triangle', freq: 130, freqEnd: 22, dur: 0.32, gain: 0.16, attack: 0.001 });
    tone({ type: 'square', freq: 980, freqEnd: 150, dur: 0.12, gain: 0.10 });
    noiseHit({ dur: 0.05, gain: 0.16, hpFreq: 120, lpFreq: 6000 });  // アタックの一撃（鋭い立ち上がり）
    noiseHit({ dur: 0.22, gain: 0.15, hpFreq: 260, lpFreq: 4000 });  // 胴鳴りの余韻
    noiseHit({ dur: 0.07, gain: 0.10, hpFreq: 3000, lpFreq: 13000 }); // 金属質の高域きらめき
  },
  // 虚空のうなり：低い不穏なハム（緊張はごく小音量・短時間で・直後に必ず解決させる）
  voidHum() {
    tone({ type: 'sine', freq: 70, freqEnd: 55, dur: 0.9, gain: 0.13, attack: 0.05 });
    tone({ type: 'triangle', freq: 104, freqEnd: 98, dur: 0.8, gain: 0.05, attack: 0.05 });
  },
  // 最終ボス ワイヤーアーム射出：「ギーン！」と一気に駆け上がる金属スイープ（拳がワイヤーで伸びる音）。
  // 4層の上昇トーン＋厚い金属ノイズで鋭く激しく。到達周波数を上げて「引き絞って射出した」鋭さを強調。決定的。
  wireShot() {
    tone({ type: 'sawtooth', freq: 320, freqEnd: 2600, dur: 0.36, gain: 0.18 });
    tone({ type: 'square', freq: 640, freqEnd: 3600, dur: 0.32, gain: 0.10 });
    tone({ type: 'square', freq: 900, freqEnd: 4400, dur: 0.28, gain: 0.06, detune: 12 });
    tone({ type: 'triangle', freq: 1200, freqEnd: 5000, dur: 0.24, gain: 0.07 });
    noiseHit({ dur: 0.05, gain: 0.10, hpFreq: 1500, lpFreq: 9000 });   // 射出の噛みつくアタック
    noiseHit({ dur: 0.30, gain: 0.09, hpFreq: 2400, lpFreq: 11000 });  // 金属質の擦過ノイズ（厚め）
  },
  // 最終ボス ナックルウェーブ：両拳を叩き合わせる「ガーン！」の重い金属クラッシュ＋発射のきしみ。
  // 低音の一撃感を深く（freqを最低域まで）＋金属クラッシュのノイズを厚くして「ドガァン！」と激しく。
  knuckle() {
    tone({ type: 'sine', freq: 280, freqEnd: 30, dur: 0.40, gain: 0.34, attack: 0.001 });
    tone({ type: 'triangle', freq: 140, freqEnd: 24, dur: 0.36, gain: 0.16, attack: 0.001 });
    tone({ type: 'square', freq: 1400, freqEnd: 260, dur: 0.18, gain: 0.12 });
    tone({ type: 'sawtooth', freq: 820, freqEnd: 150, dur: 0.14, gain: 0.08 });
    noiseHit({ dur: 0.06, gain: 0.17, hpFreq: 150, lpFreq: 6000 });    // 叩き合わせた瞬間の鋭いアタック
    noiseHit({ dur: 0.26, gain: 0.16, hpFreq: 350, lpFreq: 5000 });    // 重い金属の胴鳴り
    noiseHit({ dur: 0.09, gain: 0.10, hpFreq: 3000, lpFreq: 13000 });  // 金属片が散る高域
  },
  // 最終ボス ワイヤーアームの拳が飛来する音：「シュイィィン」と迫る金属ドップラー。
  // うなりを効かせた金属トーンが上がりながら音量も増して「拳が突進してくる」迫力を出す。wireShot 直後に鳴らす。
  wireFly() {
    tone({ type: 'sawtooth', freq: 380, freqEnd: 1500, dur: 0.42, gain: 0.14, attack: 0.06 });
    tone({ type: 'square', freq: 760, freqEnd: 3000, dur: 0.40, gain: 0.07, attack: 0.08, detune: 8 });
    tone({ type: 'triangle', freq: 1140, freqEnd: 4200, dur: 0.34, gain: 0.05, attack: 0.10 });
    noiseHit({ dur: 0.40, gain: 0.07, hpFreq: 1800, lpFreq: 10000 });  // 空気を切り裂く金属のうなり
  },
  // R22 回復モビット：3.5秒ごとに鳴るので、既存の heal より**ずっと小さく短い**2音にする。
  // 同じ音量で鳴らすと回復が主役になってしまい、戦闘の音が埋もれる。
  healTick() {
    tone({ type: 'sine', freq: 880, dur: 0.07, gain: 0.045, attack: 0.004 });
    tone({ type: 'sine', freq: 1320, dur: 0.09, gain: 0.035, attack: 0.03 });
  },
  // R22 投球モーション：腕を振り抜く一瞬の風切り音。0.09秒と短くして「ヒュッ」で切る
  //（wireFly は 0.42 秒あり、投球の振りには長すぎて音が置いていかれる）。
  throwWhoosh(power) {
    const g = 0.06 + 0.06 * (power == null ? 1 : power);
    noiseHit({ dur: 0.09, gain: g, hpFreq: 900, lpFreq: 9000 });
    tone({ type: 'triangle', freq: 260, freqEnd: 1500, dur: 0.08, gain: g * 0.55, attack: 0.004 });
  },
  // R22 投球モーション：踏み込んで足を突く音。低く短い「ドッ」
  stepPlant() {
    tone({ type: 'sine', freq: 150, freqEnd: 62, dur: 0.09, gain: 0.11, attack: 0.002 });
    noiseHit({ dur: 0.05, gain: 0.05, hpFreq: 150, lpFreq: 1400 });
  },
  // 最終ボス ナックルウェーブのミサイル飛翔：ジェット/ロケットの噴射轟音＋上昇ホイッスル。
  // 噴射ノイズを厚く敷き、鋭いホイッスルが駆け上がって「複数ミサイルが噴き出して飛んでくる」迫力を出す。
  missileFly() {
    noiseHit({ dur: 0.06, gain: 0.14, hpFreq: 200, lpFreq: 5000 });    // 点火の一撃
    noiseHit({ dur: 0.44, gain: 0.11, hpFreq: 500, lpFreq: 6000 });    // 噴射の轟音（厚い低〜中域ノイズ）
    tone({ type: 'sawtooth', freq: 90, freqEnd: 60, dur: 0.44, gain: 0.10, attack: 0.004 }); // 推進の低いうなり
    tone({ type: 'triangle', freq: 700, freqEnd: 2400, dur: 0.40, gain: 0.08, attack: 0.02 }); // 上昇ホイッスル
    tone({ type: 'square', freq: 1050, freqEnd: 3400, dur: 0.34, gain: 0.04, attack: 0.03, detune: 10 });
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

// --- 曲2: ボス戦 boss（172BPM・8小節・王道進行 F-G-Em-Am / F-G-C-C）---
// 実プレイFB（2026-08-23）「ボス戦はポップに」。従来は Am 4小節のマイナー曲で、
// 通常戦闘(battle)より暗く短く、周回するとすぐ飽きた。ここを**明るい長調のポップス**へ全面刷新する。
// 差別化は「暗さ」ではなく **速さ（150→172BPM）・跳ね（16分の食い込み）・厚いコーラス**で作る。
// 最後の2小節が C（トニック）へ解決するので、ループしても「サビが戻ってきた」と感じられる。
const CHORDS_BOSS = [
  { arp: [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5], stab: [NOTE.F4, NOTE.A4, NOTE.C5], bass: NOTE.F2 }, // F
  { arp: [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5], stab: [NOTE.G4, NOTE.B4, NOTE.D5], bass: NOTE.G2 }, // G
  { arp: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], stab: [NOTE.E4, NOTE.G4, NOTE.B4], bass: NOTE.E2 }, // Em
  { arp: [NOTE.A4, NOTE.C5, NOTE.E5, NOTE.A5], stab: [NOTE.A4, NOTE.C5, NOTE.E5], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F4, NOTE.A4, NOTE.C5, NOTE.F5], stab: [NOTE.F4, NOTE.A4, NOTE.C5], bass: NOTE.F2 }, // F
  { arp: [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5], stab: [NOTE.G4, NOTE.B4, NOTE.D5], bass: NOTE.G2 }, // G
  { arp: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], stab: [NOTE.C5, NOTE.E5, NOTE.G5], bass: NOTE.C3 }, // C
  { arp: [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], stab: [NOTE.G4, NOTE.C5, NOTE.E5], bass: NOTE.G2 }, // C/G
];
// 16分解像度の跳ねるリード。付点8分（3ステップ）の食い込みを軸に、サビ頭は高いC6で抜ける。
const MELODY_BOSS = [
  [NOTE.C6, -1, -1, NOTE.A5, -1, -1, NOTE.C6, -1, NOTE.D6, -1, NOTE.C6, -1, NOTE.A5, -1, -1, -1],
  [NOTE.B5, -1, -1, NOTE.D6, -1, -1, NOTE.B5, -1, NOTE.G5, -1, NOTE.B5, -1, NOTE.D6, -1, NOTE.B5, -1],
  [NOTE.E5, -1, NOTE.G5, -1, NOTE.B5, -1, -1, NOTE.G5, -1, NOTE.E5, -1, -1, NOTE.G5, -1, -1, -1],
  [NOTE.A5, -1, -1, NOTE.C6, -1, -1, NOTE.E6, -1, NOTE.C6, -1, NOTE.A5, -1, NOTE.B5, -1, NOTE.C6, -1],
  [NOTE.F6, -1, -1, NOTE.C6, -1, -1, NOTE.A5, -1, NOTE.C6, -1, NOTE.F6, -1, -1, -1, -1, -1],
  [NOTE.E6, -1, -1, NOTE.B5, -1, -1, NOTE.G5, -1, NOTE.B5, -1, NOTE.D6, -1, NOTE.E6, -1, NOTE.D6, -1],
  [NOTE.C6, -1, -1, NOTE.E6, -1, -1, NOTE.G6, -1, NOTE.E6, -1, NOTE.C6, -1, NOTE.G5, -1, -1, -1],
  [NOTE.E6, -1, NOTE.D6, -1, NOTE.C6, -1, NOTE.B5, -1, NOTE.C6, -1, NOTE.D6, -1, NOTE.E6, -1, -1, -1],
];

// --- 曲4: 最終ボス maou（76BPM・4小節・Am-F-G-E／荘厳）---
// 実プレイFB「マオウレクス戦は荘厳に」。ポップなボス戦曲との対比が命なので、
// **速さ・跳ね・明るさを全部捨てる**：172→76BPM（半分以下）、跳ねを消して全音符/2分音符主体、
// 終止を E メジャー（G# を含むハーモニックマイナーのドミナント）にして教会音楽の厳かさを作る。
// 声部＝パイプオルガンの持続和音／低い斉唱パッド／ティンパニ／教会の鐘。ドラムのビートは置かない
// （四つ打ちを入れた瞬間ポップに戻ってしまうため）。
const CHORDS_MAOU = [
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], pad: [NOTE.A2, NOTE.E3, NOTE.A3], bass: NOTE.A2 },  // Am
  { arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], pad: [NOTE.F2, NOTE.C3, NOTE.F3], bass: NOTE.F2 },  // F
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], pad: [NOTE.G2, NOTE.D3, NOTE.G3], bass: NOTE.G2 },  // G
  { arp: [NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4], pad: [NOTE.E2, NOTE.B2, NOTE.E3], bass: NOTE.E2 }, // E（荘厳な終止）
];
// 4分音符解像度（1小節=4音）の重い主題。高く跳ねず、じりじりと半音で締め上げる。
const MELODY_MAOU = [
  [NOTE.A4, -1, NOTE.C5, -1],
  [NOTE.C5, -1, NOTE.A4, -1],
  [NOTE.B4, -1, NOTE.D5, -1],
  [NOTE.Gs4, -1, NOTE.B4, -1],
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
  boss:   { bpm: 172, bars: 8, chords: CHORDS_BOSS,   melody: MELODY_BOSS,   style: 'boss'   },
  maou:   { bpm: 76,  bars: 4, chords: CHORDS_MAOU,   melody: MELODY_MAOU,   style: 'maou'   },
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
    // ★ポップなボス戦（172BPM）。狙いは「怖い」ではなく「アガる」。
    //   ベースは8分＋16分の食い込みで跳ねさせ、コードは裏拍のスタブ、上物はきらめくベル。
    // ベース：跳ねるパターン（3・11の食い込みが battle と共通のノリ＝シリーズの統一感）
    if (inBar % 2 === 0 || inBar === 3 || inBar === 11) {
      const oct = (inBar === 6 || inBar === 14) ? 12 : 0;
      tone({ type: 'triangle', freq: noteFreq(chord.bass + oct), dur: stepSec * 1.6,
             gain: 0.20, dest: bgmGain, attack: 0.004 });
      tone({ type: 'square', freq: noteFreq(chord.bass + oct) * 2, dur: stepSec * 1.1,
             gain: 0.05, dest: bgmGain, attack: 0.004 });
    }
    // コードスタブ：8分裏に和音を短く刺す（ポップスの推進力はここで出る）
    if (inBar % 4 === 2) {
      chord.stab.forEach((n) => {
        tone({ type: 'square', freq: noteFreq(n), dur: stepSec * 1.0,
               gain: 0.07, dest: bgmGain, attack: 0.003 });
      });
    }
    // アルペジオ：16分でキラキラ流す（後半4小節だけ＝サビで景色が変わる）
    if (bar >= 4) {
      const arpIdx = inBar % chord.arp.length;
      tone({ type: 'triangle', freq: noteFreq(chord.arp[arpIdx]) * 2, dur: stepSec * 0.9,
             gain: 0.028, dest: bgmGain, attack: 0.003 });
    }
    // リードメロディ：16分解像度。square の主旋律＋detune の薄重ね＋オクターブ下の芯で厚く
    const m = song.melody[bar][inBar];
    if (m !== undefined && m !== -1) {
      const mf = noteFreq(m);
      tone({ type: 'square', freq: mf, dur: stepSec * 2.2,
             gain: 0.16, dest: bgmGain, attack: 0.004 });
      tone({ type: 'square', freq: mf, dur: stepSec * 2.0,
             gain: 0.06, dest: bgmGain, attack: 0.004, detune: 11 });
      tone({ type: 'triangle', freq: mf / 2, dur: stepSec * 1.8,
             gain: 0.055, dest: bgmGain, attack: 0.005 });
      // 拍頭だけオクターブ上のベルを足して抜けを作る
      if (inBar % 4 === 0) {
        tone({ type: 'sine', freq: mf * 2, dur: stepSec * 1.6,
               gain: 0.04, dest: bgmGain, attack: 0.003 });
      }
    }
    // キック：四つ打ち＋14の食い込み。サブ低音を重ねてズンと厚く
    if (inBar % 4 === 0 || inBar === 14) {
      tone({ type: 'sine', freq: 155, freqEnd: 46, dur: 0.12, gain: 0.25,
             dest: bgmGain, attack: 0.002 });
      tone({ type: 'triangle', freq: 74, freqEnd: 33, dur: 0.10, gain: 0.10,
             dest: bgmGain, attack: 0.002 });
    }
    // スネア＋ハンドクラップ3枚重ね：2拍4拍（ポップスの手拍子。ここが一番「明るい」を作る）
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.10, gain: 0.12, hpFreq: 1600, lpFreq: 8500, dest: bgmGain });
      noiseHit({ start: 0.012, dur: 0.08, gain: 0.075, hpFreq: 1100, lpFreq: 6000, dest: bgmGain });
      noiseHit({ start: 0.026, dur: 0.06, gain: 0.05, hpFreq: 1400, lpFreq: 7000, dest: bgmGain });
    }
    // ハット：8分キープ＋オフビートのアクセント。小節後半は16分で疾走感
    if (inBar % 2 === 0) {
      noiseHit({ dur: 0.032, gain: (inBar % 4 === 2) ? 0.055 : 0.03,
                 hpFreq: 6500, lpFreq: 13000, dest: bgmGain });
    } else if (inBar >= 8) {
      noiseHit({ dur: 0.022, gain: 0.02, hpFreq: 7000, lpFreq: 13000, dest: bgmGain });
    }
    // クラッシュ：ループ頭とサビ頭（5小節目）で抜けよく
    if (inBar === 0 && (bar === 0 || bar === 4)) {
      noiseHit({ dur: 0.34, gain: 0.07, hpFreq: 4000, lpFreq: 14000, dest: bgmGain });
    }
    // オープンハット：小節終わりの抜け
    if (inBar === 14) {
      noiseHit({ dur: 0.10, gain: 0.045, hpFreq: 5000, lpFreq: 12000, dest: bgmGain });
    }
    // 最終小節の後半はスネアロール＋上昇ライザーでループへ勢いよく繋ぐ
    if (bar === song.bars - 1 && inBar >= 12) {
      noiseHit({ dur: 0.05, gain: 0.055 + (inBar - 12) * 0.016,
                 hpFreq: 1800, lpFreq: 9000, dest: bgmGain });
      tone({ type: 'square', freq: 420 + (inBar - 12) * 110, dur: stepSec * 1.1,
             gain: 0.045, dest: bgmGain, attack: 0.003 });
    }
  } else if (song.style === 'maou') {
    // ★荘厳（76BPM）。ポップなボス戦曲との対比が全て。ビートを置かず、和音の厚みと余韻で押す。
    // パイプオルガン：小節頭で pad の3声を全音符で伸ばす（sawtooth＋square の重ねでリード管の質感）。
    if (inBar === 0) {
      chord.pad.forEach((n, i) => {
        const f = noteFreq(n);
        tone({ type: 'sawtooth', freq: f, dur: stepSec * 15.2,
               gain: 0.075 - i * 0.012, dest: bgmGain, attack: 0.09 });
        tone({ type: 'square', freq: f * 2, dur: stepSec * 15.0,
               gain: 0.028, dest: bgmGain, attack: 0.12 });
      });
      // 16フィートの唸り（ルートの1オクターブ下）＝床が鳴る重さ
      tone({ type: 'sine', freq: noteFreq(chord.bass) / 2, dur: stepSec * 15.4,
             gain: 0.15, dest: bgmGain, attack: 0.06 });
    }
    // 斉唱パッド：2拍目から遅れて入る高音の持続（人の声のように後から重なる）
    if (inBar === 4) {
      chord.arp.forEach((n, i) => {
        tone({ type: 'triangle', freq: noteFreq(n) * 2, dur: stepSec * 10,
               gain: 0.032 - i * 0.005, dest: bgmGain, attack: 0.22 });
      });
    }
    // ティンパニ：小節頭と3拍目の2発。重い胴鳴りを噛ませる（ビートではなく「合図」）
    if (inBar === 0 || inBar === 8) {
      const g = inBar === 0 ? 0.20 : 0.13;
      tone({ type: 'sine', freq: 120, freqEnd: 52, dur: 0.34, gain: g,
             dest: bgmGain, attack: 0.004 });
      tone({ type: 'triangle', freq: 61, freqEnd: 34, dur: 0.30, gain: g * 0.5,
             dest: bgmGain, attack: 0.004 });
      noiseHit({ dur: 0.10, gain: g * 0.28, hpFreq: 90, lpFreq: 1600, dest: bgmGain });
    }
    // 教会の鐘：1小節目と3小節目の頭で1発。長く残響させて空間を広く見せる
    if (inBar === 0 && bar % 2 === 0) {
      const bf = noteFreq(NOTE.A5);
      tone({ type: 'sine', freq: bf, dur: stepSec * 13, gain: 0.06,
             dest: bgmGain, attack: 0.004 });
      tone({ type: 'sine', freq: bf * 1.5, dur: stepSec * 11, gain: 0.026,
             dest: bgmGain, attack: 0.006 });
      tone({ type: 'sine', freq: bf * 2.67, dur: stepSec * 8, gain: 0.014,
             dest: bgmGain, attack: 0.008 });
    }
    // 主題：4分音符解像度。sawtooth のブラス＋オクターブ下の重ねで威圧する
    if (inBar % 4 === 0) {
      const m = song.melody[bar][inBar / 4];
      if (m !== undefined && m !== -1) {
        const mf = noteFreq(m);
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 3.6,
               gain: 0.10, dest: bgmGain, attack: 0.03 });
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 3.4,
               gain: 0.045, dest: bgmGain, attack: 0.03, detune: 8 });
        tone({ type: 'triangle', freq: mf / 2, dur: stepSec * 3.2,
               gain: 0.05, dest: bgmGain, attack: 0.04 });
      }
    }
    // 最終小節の終わりだけティンパニの連打で締め、Am へ戻る（＝ループが「一周した」と分かる）
    if (bar === song.bars - 1 && inBar >= 12) {
      tone({ type: 'sine', freq: 116, freqEnd: 58, dur: 0.16,
             gain: 0.08 + (inBar - 12) * 0.022, dest: bgmGain, attack: 0.003 });
      noiseHit({ dur: 0.07, gain: 0.03 + (inBar - 12) * 0.01, hpFreq: 90, lpFreq: 1800, dest: bgmGain });
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
    // R27: 保護リミッタ。連打＋締め＋着弾が重なるとピークが1.0を超えて歪むため、
    //   最後だけ潰す。通常の音では働かない（threshold -3dB）ので音色は変わらない。
    if (ctx.createDynamicsCompressor) {
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -3;
      lim.knee.value = 6;
      lim.ratio.value = 12;
      lim.attack.value = 0.003;
      lim.release.value = 0.15;
      masterGain.connect(lim).connect(ctx.destination);
    } else {
      masterGain.connect(ctx.destination);
    }

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
  // R12: 任意の arg を音側へ渡せる（heroPunch のヒート・hurt のダメージ重みなど）。
  // 既存の引数なしSFXは arg を単に無視するので後方互換。
  // R21: 第3引数 pitch（周波数倍率・既定1）を足した。同じ打撃音が同じ音程で連打されると
  // 機械的に聞こえるため、呼び出し側が ±5% ずらして渡す。既存SFXは無視するので後方互換。
  sfx(name, arg, pitch) {
    if (!ctx || muted) return;
    const fn = SFX[name];
    if (!fn) return;
    try {
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      fn(arg, pitch);
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
