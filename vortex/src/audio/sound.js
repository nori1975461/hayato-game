// audio/sound.js — ボルモン！ 効果音・BGM合成（WebAudio・外部ファイルなし）
// 仕様書 §3.5 のAPI契約を厳守。init前に sfx() が呼ばれても無音で無視する。

const MASTER_VOL = 0.33; // 全体音量。派手さ増強に伴い0.30→0.33（子ども向け安全上限0.34未満・眩しすぎない範囲）

let ctx = null;         // AudioContext
let masterGain = null;  // 全体音量（MASTER_VOL基調）
let sfxGain = null;     // SFX用サブバス
let bgmGain = null;     // BGM用サブバス
let muted = false;

// --- R35: 本物の音づくり（ここまで一度も持っていなかった2つ） ---
// マオウレクス戦BGMを3回作り直して3回とも「違う」と言われた。テンポ（168/184/208）も
// 和音（32個・七の連鎖・転調）も変えたのに刺さらなかった＝**残っているのは音色**、という判断。
//   ・distBus … WaveShaperNode による**波形クリップ＝本物の歪み**。
//     旧実装は「sawtooth を3枚デチューン＋3倍音・5倍音を足し算」で歪みを近似していたが、
//     足し算では倍音の比率が入力の大きさで変わらないので「歪んだギター」にはならない。
//     歪みの本体は非線形＝大きい入力ほど潰れること。それは波形を折らないと出せない。
//   ・verbBus … フィードバック・ディレイ（＝簡易リバーブ）。
//     「荘厳」は残響が作る。今まで全声部が完全にドライで、音が床に落ちていた。
let distBus = null;     // 歪みギター用の入口（ここへ送った音だけ潰れる）
let verbBus = null;     // 残響の送り口
let sfxDistBus = null;  // SFX用の歪み（BGMより深く潰す。鈍器の一撃に使う）

// 非線形カーブ（arctan型ソフトクリップ）。k が大きいほど深く潰れる。
function makeDistCurve(k, n = 2048) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
}

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
// Cs（C#）は R31 で足した。最終ボス曲の締めを A メジャー（ピカルディ終止）にするのに要る。
const NOTE = {
  C4: -9, Cs4: -8, D4: -7, E4: -5, F4: -4, G4: -2, Gs4: -1, A4: 0, B4: 2,
  C5: 3, Cs5: 4, D5: 5, E5: 7, F5: 8, G5: 10, Gs5: 11, A5: 12, B5: 14,
  C6: 15, D6: 17, E6: 19, F6: 20, G6: 22, A6: 24,
  C3: -21, D3: -19, E3: -17, F3: -16, G3: -14, Gs3: -13, A3: -12, B3: -10,
  C2: -33, D2: -31, E2: -29, F2: -28, G2: -26, A2: -24, B2: -22,
  // R34W3: マオウレクス戦を Cマイナー へ移したので派生音を足す（Eb=Ds / Bb=As / F#=Fs）
  Gs2: -25, As2: -23, Cs3: -20, Ds3: -18, Fs3: -15, As3: -11,
  Ds4: -6, Fs4: -3, As4: 1, Ds5: 6, Fs5: 9, As5: 13, Ds6: 18,
  // R35: F#dim7（ディミニッシュのパッシング）の低音と、主題の最高音 C#6
  Fs2: -27, Cs6: 16,
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
    verb = 0,           // R35: 残響へ送る量（0で完全ドライ＝従来どおり）
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
  if (verb > 0 && verbBus) {
    const vs = ctx.createGain();
    vs.gain.value = verb;
    g.connect(vs).connect(verbBus);
  }
  osc.start(t0);
  osc.stop(t0 + Math.max(dur, rel) + 0.02);
}

// --- R35: 一瞬だけBGMを沈める（サイドチェイン・ダック）---
// 「ガツン」の正体の半分はこれ。強打の瞬間に周りの音が引くと、同じ音量でも一撃が重くなる。
// 実際の映画・格ゲーが必ずやっている処理で、音を大きくするより効く（＝耳に痛くしないまま迫力が出る）。
function duckBgm(depth = 0.35, holdSec = 0.09, releaseSec = 0.26) {
  if (!ctx || !bgmGain) return;
  const t0 = ctx.currentTime;
  const base = 0.78;   // ミュートは masterGain 側で処理しているので bgmGain は常にここへ戻す
  const g = bgmGain.gain;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(g.value, t0);
  g.linearRampToValueAtTime(base * depth, t0 + 0.012);
  g.setValueAtTime(base * depth, t0 + 0.012 + holdSec);
  g.linearRampToValueAtTime(base, t0 + 0.012 + holdSec + releaseSec);
}

// --- ノイズ打（打楽器・ヒット用） ---
function noiseHit(opts) {
  if (!ctx) return;
  const {
    start = 0, dur = 0.1, gain = 0.3, dest = sfxGain,
    hpFreq = 800, lpFreq = 6000, lpEnd = 0,
  } = opts;
  const t0 = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hpFreq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(lpFreq, t0);
  // R44W7: 帯域を時間で下げる掃引（既定は無効＝既存の呼び出しは一切変わらない）。
  //   「広がって燃える炎」は音量ではなく**帯域が下へ落ちること**で聞こえる。
  if (lpEnd > 0) lp.frequency.exponentialRampToValueAtTime(Math.max(60, lpEnd), t0 + dur);
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
  // ★R52 ボス出現の警報（マオウレクスより前の5体・警告フェーズの2秒で3回鳴らす）。
  //   実プレイFB「各ボス出現時に、音楽、効果音、エフェクトを駆使して、ボス出現の迫力と
  //   緊張感を出して」。従来はここが warning 1回きり＝1.1秒鳴って、残り0.9秒は無音だった。
  //   ⚠️ 汎用の warning() は本編の12か所（攻撃の予告・激怒・オープニング）で鳴っているので
  //     触らない。出現専用の音を別に作って、そちらだけを段階的に上げていく。
  //   step（0,1,2）で音程が上がる＝「近づいてくる」を音程の上昇で表す。
  //   ・クラクション：E4 と A#4（増4度＝トライトーン）の交互。E はボス戦BGMの主音なので、
  //     警報が鳴りやんだところへ曲の調がそのまま乗る（警報と曲が別々の調でぶつからない）。
  //   ・地鳴り：lowpass を 260Hz まで絞ったノイズ＋55Hzの低い唸り＝床が震えている音。
  bossAlarm(step) {
    const s = Math.max(0, Math.min(2, step || 0));
    const p = [1, 1.09, 1.19][s];
    const g = [1, 0.95, 0.92][s];
    for (let i = 0; i < 3; i++) {
      const f = noteFreq(i % 2 === 0 ? NOTE.E4 : NOTE.As4) * p;
      const t = i * 0.22;
      tone({ type: 'sawtooth', freq: f, start: t, dur: 0.15, gain: 0.20 * g });
      tone({ type: 'square', freq: f * 2, start: t, dur: 0.13, gain: 0.07 * g, detune: 10 });
      noiseHit({ start: t, dur: 0.03, gain: 0.05 * g, hpFreq: 4000, lpFreq: 13000 }); // 金属の当たり
    }
    // 低い地鳴り（lowpassノイズ＋唸り）。警報の下にずっと敷いて「逃げ場がない」を作る。
    noiseHit({ dur: 0.75, gain: 0.09 * g, hpFreq: 40, lpFreq: 260 });
    tone({ type: 'sine', freq: 55 * p, freqEnd: 44 * p, dur: 0.8, gain: 0.11 * g, attack: 0.06 });
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

  // ★R56 主人公の被弾（ゲーム中）専用。実プレイFB「当たったときの感触が感じられない。
  //   『やられた！』とわかる手ごたえを」。
  // ⚠️ 旧 hurt() は Opening のカットシーンが使うので**残したまま**、ゲーム中だけこちらへ替える。
  // 敗因は音量ではない（R55の教訓）。被弾は画面のどんな情報より優先して伝わるべき信号なのに、
  // BGM（弦の16分オスティナート＋ギター）の上に**ダックなしで**薄く乗っていた。
  // 「やられた！」の作り：
  //   ⑴ 深いダック＝一瞬まわりが引く（音量を上げずに前へ出す唯一の方法）
  //   ⑵ 打撃の芯＝サブまで落ちる低域の一撃（腹に来る）
  //   ⑶ 痛みの記号＝歪んだ軋み（金属がへこむ）。**重さに関係なく必ず鳴らす**
  //      （旧 hurt は w>0.25 が条件で、実プレイの 0.086〜0.286 ではほぼ鳴っていなかった）
  //   ⑷ 息が詰まる高域の一瞬（ヒットストップと同時刻に置く＝止まった感じが増す）
  hurtHeavy(weight) {
    const w = weight == null ? 0.4 : Math.max(0, Math.min(1, weight));
    duckBgm(0.30 - 0.10 * w, 0.10 + 0.06 * w, 0.30);   // 重いほど深く長く引く（0.30〜0.20）
    // ⑵ 打撃の芯。sine のサブ＋triangle の胴鳴りで「へこんだ」厚みを作る
    tone({ type: 'sine', freq: 250 - 90 * w, freqEnd: 30, dur: 0.30 + 0.16 * w,
           gain: 0.30 + 0.08 * w, attack: 0.001 });
    tone({ type: 'triangle', freq: 130 - 40 * w, freqEnd: 22, dur: 0.26 + 0.12 * w,
           gain: 0.16 + 0.06 * w, attack: 0.001 });
    // 立ち上がりの噛みつき（当たった瞬間の点）
    noiseHit({ dur: 0.035, gain: 0.26 + 0.06 * w, hpFreq: 200, lpFreq: 12000 });
    // ⑶ 痛みの記号＝歪んだ軋み。歪みバスへ通す（sfxDistBus）＝「無事では済まなかった」音色
    tone({ type: 'sawtooth', freq: 190 - 60 * w, freqEnd: 52, start: 0.02, dur: 0.22 + 0.12 * w,
           gain: 0.14 + 0.08 * w, attack: 0.004, dest: sfxDistBus });
    tone({ type: 'square', freq: 96, freqEnd: 44, start: 0.02, dur: 0.18, gain: 0.07 + 0.04 * w });
    // ⑷ 息が詰まる高域（ヒットストップの尺と同じあたりで切れる）
    noiseHit({ start: 0.01, dur: 0.09 + 0.06 * w, gain: 0.10 + 0.05 * w,
               hpFreq: 2600, lpFreq: 14000, lpEnd: 3000 });
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

  // ★R29W2 実プレイFB「複数敵を破壊する音は、4種類でほぼ差がなかった」。調べたら**その通り**だった：
  //   プリセットが変えていたのは打撃の間隔（52/44/64ms＝1発あたり8〜12ms）と衝撃の輪の有無だけで、
  //   鳴らしている音は4つとも `crush`／`crushEnd` の**完全に同一のコード**だった。
  //   ＝ 音量も音程も音色も1バイトも違わない。「ほぼ差がなかった」ではなく「差が無かった」。
  // 直し方：選ぶ軸を「間」から**音色**へ移す。間の8msは耳では判別できないが、音色は一瞬で分かる。
  //   たいこ（打楽器）／ばくは（炸裂ノイズ）／きらきら（金属の音階）＝3つとも語彙が別。

  // ばくは：主役をノイズにする。胴は「たいこ」より低く（150→38Hz）長く、尾が残る。
  //   数を伝える粒は**下がる**（たいこは上がる）＝段が増えるほど深く掘っている感じになる。
  crushBoom(i) {
    const step = Math.max(0, Math.min(11, i | 0));
    const k = 1 + 0.05 * step;
    tone({ type: 'sine', freq: 150 * Math.pow(1.02, step), freqEnd: 38, dur: 0.20,
           gain: 0.26 * k, attack: 0.001 });
    tone({ type: 'square', freq: 70, freqEnd: 34, dur: 0.16, gain: 0.12 * k, attack: 0.001 });
    // 炸裂ノイズ（たいこは0.045秒で切っているのでここが最大の違いになる）
    noiseHit({ dur: 0.22 * k, gain: 0.24 * k, hpFreq: 60, lpFreq: 5200 });
    noiseHit({ start: 0.01, dur: 0.09, gain: 0.13 * k, hpFreq: 1800, lpFreq: 12000 });
    tone({ type: 'sawtooth', freq: noteFreq(NOTE.G4 - step), freqEnd: noteFreq(NOTE.G3 - step),
           dur: 0.09, gain: 0.065 });
  },

  crushBoomEnd(n) {
    const c = Math.max(1, Math.min(14, n | 0));
    const big = Math.max(0, Math.min(1, (c - 2) / 8));
    tone({ type: 'sine', freq: 120, freqEnd: 28, dur: 0.90 + 0.50 * big, gain: 0.30 + 0.10 * big, attack: 0.003 });
    tone({ type: 'square', freq: 60, freqEnd: 24, dur: 0.50 + 0.30 * big, gain: 0.12 + 0.06 * big, attack: 0.003 });
    noiseHit({ dur: 0.80 + 0.50 * big, gain: 0.25 + 0.10 * big, hpFreq: 40, lpFreq: 2600 });
    noiseHit({ start: 0.02, dur: 0.18, gain: 0.15, hpFreq: 1200, lpFreq: 14000 });
    // 遅れて崩れ落ちる残骸。和音を一切使わないので「たいこ」の締めと取り違えようがない
    noiseHit({ start: 0.30, dur: 0.22, gain: 0.10 + 0.05 * big, hpFreq: 300, lpFreq: 5000 });
    noiseHit({ start: 0.52, dur: 0.18, gain: 0.07 + 0.04 * big, hpFreq: 200, lpFreq: 4000 });
    if (c >= 8) tone({ type: 'sawtooth', freq: 90, freqEnd: 20, dur: 1.10, gain: 0.09, attack: 0.004 });
  },

  // きらきら：低音を捨てて金属の音階だけで数える。五音音階なので段差が大きく、
  //   「何段目か」が半音階（たいこ）よりはっきり分かる。
  crushBell(i) {
    const step = Math.max(0, Math.min(11, i | 0));
    const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
    const f = noteFreq(NOTE.C5 + PENTA[step]);
    tone({ type: 'triangle', freq: f, dur: 0.22, gain: 0.19, attack: 0.001 });
    tone({ type: 'sine', freq: f * 2, dur: 0.16, gain: 0.10, attack: 0.001 });
    // 非整数倍音＝ベルらしさ（整数倍だけだとオルガンに聞こえる）
    tone({ type: 'sine', freq: f * 3.01, dur: 0.10, gain: 0.05, attack: 0.001 });
    noiseHit({ dur: 0.03, gain: 0.055, hpFreq: 6000 });   // 撥が当たる音。低域は入れない
  },

  crushBellEnd(n) {
    const c = Math.max(1, Math.min(14, n | 0));
    const big = Math.max(0, Math.min(1, (c - 2) / 8));
    const arp = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C6 + 12, NOTE.E6 + 12];
    const take = Math.min(arp.length, 3 + Math.round(big * 5));
    for (let i = 0; i < take; i++) {
      tone({ type: 'triangle', freq: noteFreq(arp[i]), start: i * 0.028, dur: 0.50, gain: 0.105, attack: 0.001 });
      tone({ type: 'sine', freq: noteFreq(arp[i]) * 2, start: i * 0.028, dur: 0.35, gain: 0.05 });
    }
    // 余韻の鐘。ここだけ胴があるので「締まった」と分かる
    tone({ type: 'sine', freq: noteFreq(NOTE.C4), dur: 0.90 + 0.40 * big, gain: 0.13 + 0.06 * big, attack: 0.004 });
    noiseHit({ start: 0.02, dur: 0.50, gain: 0.05 + 0.03 * big, hpFreq: 7000 });
    if (c >= 8) tone({ type: 'sine', freq: noteFreq(NOTE.C6) * 2, start: 0.34, dur: 0.60, gain: 0.085 });
  },

  // ★R29W2 つかめなかったときの「ビリッ」。紫の予告中に掴もうとすると弾かれる。
  //   ダメージは無し＝難易度は上げない。奪うのは0.3秒の操作と間合いだけ。
  numb() {
    // ざらついた電気：矩形波を速く上下させる（きれいな正弦だと「音」になってしまう）
    tone({ type: 'square', freq: 320, freqEnd: 140, dur: 0.16, gain: 0.16, attack: 0.001 });
    tone({ type: 'sawtooth', freq: 90, freqEnd: 62, dur: 0.26, gain: 0.11, attack: 0.001 });
    tone({ type: 'square', freq: 1500, freqEnd: 900, dur: 0.07, gain: 0.07 });
    noiseHit({ dur: 0.10, gain: 0.14, hpFreq: 900, lpFreq: 9000 });
    noiseHit({ start: 0.08, dur: 0.14, gain: 0.09, hpFreq: 400, lpFreq: 5000 });
    // 弾かれて下がる「ぼよん」＝手応えが返ってきた合図
    tone({ type: 'triangle', freq: 220, freqEnd: 110, dur: 0.20, gain: 0.10, attack: 0.004 });
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
  // ★R53 会話の打鍵音（1文字ずつ表示のとき数文字ごとに鳴る）。
  //   1行で7回前後鳴るので、tick（gain 0.10）より一段小さく・一段柔らかくする。
  //   固い矩形にすると機械の点滅音と混ざるので、三角波の短い「コッ」だけにした。
  talkTick() {
    tone({ type: 'triangle', freq: 860, freqEnd: 640, dur: 0.028, gain: 0.045 });
    noiseHit({ dur: 0.014, gain: 0.018, hpFreq: 5000, lpFreq: 13000 });
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
  // R29 ミサイル発射音（実プレイFB「発射音も作って」）。飛翔音(missileFly)は"迫ってくる"音なので、
  // 発射の瞬間＝**点火の破裂**が要る。「シュボッ！ヒュゴォ」の順で、点火→加速の2段に分けて鳴らす。
  // 斉射で7発同時に鳴っても潰れないよう、飛翔音より短く（0.26秒）ピークを立てる。
  missileLaunch(power, pitch) {
    const p = pitch == null ? 1 : pitch;
    const g = 0.9 * (power == null ? 1 : power);
    noiseHit({ dur: 0.045, gain: 0.17 * g, hpFreq: 300, lpFreq: 7000 });          // 点火の破裂
    noiseHit({ start: 0.02, dur: 0.24, gain: 0.10 * g, hpFreq: 600, lpFreq: 5200 }); // 噴射の吹き出し
    tone({ type: 'square', freq: 1500 * p, freqEnd: 320 * p, dur: 0.08, gain: 0.11 * g });   // 撃鉄の弾ける音
    tone({ type: 'sawtooth', freq: 150 * p, freqEnd: 600 * p, dur: 0.26, gain: 0.11 * g, attack: 0.004 }); // 加速のうなり
    tone({ type: 'triangle', freq: 900 * p, freqEnd: 2600 * p, dur: 0.22, gain: 0.06 * g, attack: 0.012 }); // 抜けるホイッスル
  },
  // R29 ロケットパンチの命中/衝撃音（実プレイFB「攻撃音を激しく」）。metalSlam の流用をやめ、
  // 「ゴキィン！」＝金属が拉げる低音＋高域の破断音＋長い胴鳴りで、殴られた質量を出す。
  rocketHit() {
    tone({ type: 'sine', freq: 300, freqEnd: 24, dur: 0.46, gain: 0.36, attack: 0.001 });
    tone({ type: 'triangle', freq: 150, freqEnd: 20, dur: 0.42, gain: 0.18, attack: 0.001 });
    tone({ type: 'square', freq: 1250, freqEnd: 120, dur: 0.16, gain: 0.13 });
    tone({ type: 'sawtooth', freq: 640, freqEnd: 90, dur: 0.20, gain: 0.09 });
    noiseHit({ dur: 0.05, gain: 0.19, hpFreq: 120, lpFreq: 6500 });   // 拉げた瞬間の鋭いアタック
    noiseHit({ dur: 0.34, gain: 0.15, hpFreq: 240, lpFreq: 3800 });   // 長く残る胴鳴り
    noiseHit({ dur: 0.11, gain: 0.11, hpFreq: 3200, lpFreq: 14000 }); // 破断した金属片の高域
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

  // ============ R31 ミサイル：本物の地対空ミサイル(SAM)を参考にした3点セット ============
  // 実プレイFB「発射音やミサイルの飛来する音は、本物の地対空ミサイルを参考にして」。
  // 参考にした実物の音響特徴（S-400 等のコールドローンチ式）:
  //   ① 発射の第一音は「火の轟音」ではなく**高圧ガスの破裂**（発射管から押し出す）
  //   ② 空中でモーターに点火し、**耳を裂く鋭いクラック**が走る
  //   ③ 固体燃料は数秒で燃え尽きるので、宇宙ロケットのような**持続する轟音にはならない**
  //   ④ 飛翔中に聞こえるのは主に**大気を切り裂く風の音**（＋超音速のクラックル）
  // 旧 missileLaunch は②③が無く「シュボッ」で終わっていた＝遅く軽く聞こえる主因。
  samLaunch(power, pitch) {
    const p = pitch == null ? 1 : pitch;
    const g = power == null ? 1 : power;
    // ① コールドローンチ：高圧ガスで押し出す「ボスンッ」（低く詰まった破裂）
    tone({ type: 'sine', freq: 190 * p, freqEnd: 44 * p, dur: 0.10, gain: 0.30 * g, attack: 0.001 });
    noiseHit({ dur: 0.07, gain: 0.13 * g, hpFreq: 60, lpFreq: 900 });
    // ② 空中でのモーター点火：耳を裂く鋭いクラック
    noiseHit({ start: 0.07, dur: 0.035, gain: 0.22 * g, hpFreq: 1800, lpFreq: 14000 });
    tone({ type: 'square', freq: 2600 * p, freqEnd: 480 * p, dur: 0.06, start: 0.07,
           gain: 0.13 * g, attack: 0.001 });
    // ③ 短く猛烈な噴射ブラスト（持続させない＝ロケット打上げの音にしない）
    noiseHit({ start: 0.09, dur: 0.30, gain: 0.13 * g, hpFreq: 320, lpFreq: 5200 });
    tone({ type: 'sawtooth', freq: 120 * p, freqEnd: 700 * p, dur: 0.30, start: 0.09,
           gain: 0.11 * g, attack: 0.006 });
  },
  // 飛来音：主役は**大気を切り裂く風**。近づくぶんの音程上昇（ドップラー）を必ず付ける。
  samFly(power, pitch) {
    const p = pitch == null ? 1 : pitch;
    const g = power == null ? 1 : power;
    noiseHit({ dur: 0.46, gain: 0.12 * g, hpFreq: 700, lpFreq: 7000 });
    noiseHit({ start: 0.05, dur: 0.34, gain: 0.07 * g, hpFreq: 3200, lpFreq: 15000 }); // 超音速のクラックル
    tone({ type: 'sawtooth', freq: 220 * p, freqEnd: 620 * p, dur: 0.44, gain: 0.09 * g, attack: 0.05 });
    tone({ type: 'triangle', freq: 880 * p, freqEnd: 2100 * p, dur: 0.40, gain: 0.05 * g, attack: 0.07 });
  },
  // 着弾爆発：腹に来る低音ドロップ＋爆風の轟き＋破片の高域。命中の瞬間にだけ鳴らす。
  samBoom(power) {
    const g = power == null ? 1 : power;
    tone({ type: 'sine', freq: 240, freqEnd: 18, dur: 0.60, gain: 0.40 * g, attack: 0.001 });
    tone({ type: 'triangle', freq: 120, freqEnd: 16, dur: 0.52, gain: 0.20 * g, attack: 0.001 });
    noiseHit({ dur: 0.045, gain: 0.26 * g, hpFreq: 200, lpFreq: 11000 });               // 炸裂の一撃
    noiseHit({ start: 0.02, dur: 0.42, gain: 0.17 * g, hpFreq: 150, lpFreq: 3200 });    // 爆風の轟き
    noiseHit({ start: 0.03, dur: 0.16, gain: 0.11 * g, hpFreq: 4000, lpFreq: 15000 });  // 破片の飛散
    tone({ type: 'square', freq: 900, freqEnd: 90, dur: 0.18, gain: 0.10 * g });
  },

  // ============ R31 ロケットパンチ：マジンガーZ を参考にした3点セット ============
  // 実プレイFB「発射音や飛来する音、主人公にあたったときの音や衝撃も。マジンガーゼットを参考にして」。
  // 参考にした設定（東映アニメ／各資料）: 肘から先が**分離**し、**光子力ロケット**で飛行、速度は**マッハ2**、
  // 誘導も可能。⚠️ 実際の効果音の音色そのものは資料で確認できなかったので、上の「分離・ロケット点火・
  // 超音速」という**機構**から音を組み立てている（音色の再現ではない＝ここは推測を含む）。
  // 旧実装は wireShot（金属スイープ）＋missileLaunch の重ねで、①分離の機械音と③超音速が無かった。
  // R34W3: 戦車砲(wireCannon)と重ねるので音量引数を足した（既定1＝従来どおり）。
  rocketPunchFire(power) {
    const g = power == null ? 1 : power;
    // ① 肘の結合が外れて鉄拳が撃ち出される「ガシャンッ」
    tone({ type: 'square', freq: 1500, freqEnd: 300, dur: 0.07, gain: 0.15 * g, attack: 0.001 });
    noiseHit({ dur: 0.05, gain: 0.17 * g, hpFreq: 400, lpFreq: 9000 });
    // ② 光子力ロケットの点火＝腹に来る破裂
    tone({ type: 'sine', freq: 220, freqEnd: 40, dur: 0.16, gain: 0.30 * g, attack: 0.001 });
    noiseHit({ start: 0.03, dur: 0.28, gain: 0.14 * g, hpFreq: 300, lpFreq: 5000 });
    // ③ マッハ2へ駆け上がる金属スイープ「ギュイィィン！」
    tone({ type: 'sawtooth', freq: 300, freqEnd: 3000, dur: 0.34, gain: 0.19 * g, attack: 0.004 });
    tone({ type: 'square', freq: 600, freqEnd: 4200, dur: 0.30, gain: 0.10 * g, detune: 14 });
    tone({ type: 'triangle', freq: 1200, freqEnd: 5400, dur: 0.26, gain: 0.08 * g });
    noiseHit({ start: 0.04, dur: 0.30, gain: 0.10 * g, hpFreq: 2200, lpFreq: 12000 });
  },

  // ============ R34W3 ワイヤーアーム射出：戦車の主砲を参考にした砲撃音 ============
  // 実プレイFB「ワイヤーアームの射出音をもっと派手にして。戦車の砲撃音を参考に」。
  // 参考にした実物の音響特徴（大口径砲の砲口爆風に関する測定研究より）:
  //   ① 砲口爆風は装薬室と大気の**圧力差**で生じる衝撃波＝立ち上がりが極端に速い（ミリ秒級）
  //   ② 推進ガスが**超音速**で砲身を抜けるため、高強度のインパルス音になる
  //   ③ 戦車砲(HEAT弾)の初速はマッハ3.5。弾体そのものが**N波**（鋭いクラック）を引く
  //   ④ 銃声・砲声は「一発の破裂」ではなく、そのあと周囲に**轟いて減衰する長い尾**を持つ
  // ⚠️ 録音そのものの音色資料は確認できていないので、上の①〜④という**機構**から組み立てている。
  // 旧実装（rocketPunchFire）は「ガシャン→点火→スイープ」でロケットの語彙だけだった。
  // 足りなかったのは **極端に速い立ち上がり** と **長い反響**＝これが「砲撃」の正体。
  wireCannon() {
    // ① 撃発：圧力が一瞬で立ち上がって落ちる（attack を 0.5ms まで詰めるのが要点）
    tone({ type: 'sine', freq: 430, freqEnd: 24, dur: 0.30, gain: 0.46, attack: 0.0005 });
    tone({ type: 'triangle', freq: 215, freqEnd: 19, dur: 0.44, gain: 0.26, attack: 0.0005 });
    // ② 砲口爆風：超音速のガス流。極端に短く、極端に広帯域
    noiseHit({ dur: 0.030, gain: 0.40, hpFreq: 40, lpFreq: 16000 });
    noiseHit({ start: 0.004, dur: 0.10, gain: 0.26, hpFreq: 60, lpFreq: 5000 });
    // ③ N波：マッハ3.5 で飛ぶ弾体が空気を裂く鋭いクラック
    noiseHit({ start: 0.016, dur: 0.022, gain: 0.24, hpFreq: 3500, lpFreq: 18000 });
    tone({ start: 0.016, type: 'square', freq: 3300, freqEnd: 700, dur: 0.05,
           gain: 0.10, attack: 0.0005 });
    // ④ 反響：周囲に轟いて減衰していく長い尾。これが無いと「大砲」ではなく「破裂」に聞こえる
    noiseHit({ start: 0.05, dur: 0.88, gain: 0.13, hpFreq: 70, lpFreq: 1500 });
    tone({ start: 0.05, type: 'sine', freq: 62, freqEnd: 26, dur: 0.92, gain: 0.16, attack: 0.02 });
    // ⑤ 後座：砲身が下がって戻る重い金属（発射の"重さ"はここで出る）
    tone({ start: 0.06, type: 'sawtooth', freq: 190, freqEnd: 92, dur: 0.22,
           gain: 0.09, attack: 0.006 });
    noiseHit({ start: 0.21, dur: 0.15, gain: 0.09, hpFreq: 700, lpFreq: 5200 });
  },
  // 飛来音：マッハ2＝大気を裂く裂帛＋超音速のクラックル。近づくほど pitch を上げて呼ぶ。
  rocketPunchFly(power, pitch) {
    const p = pitch == null ? 1 : pitch;
    const g = power == null ? 1 : power;
    noiseHit({ dur: 0.30, gain: 0.10 * g, hpFreq: 900, lpFreq: 8000 });
    noiseHit({ start: 0.03, dur: 0.20, gain: 0.06 * g, hpFreq: 3600, lpFreq: 15000 });
    tone({ type: 'sawtooth', freq: 420 * p, freqEnd: 1300 * p, dur: 0.28, gain: 0.10 * g, attack: 0.03 });
    tone({ type: 'square', freq: 840 * p, freqEnd: 2600 * p, dur: 0.24, gain: 0.05 * g,
           attack: 0.04, detune: 10 });
  },
  // ============ R32 どうくつのアイテム ============
  // ★レア入手：短いファンファーレ。他の入手音(powerup)と**明確に別物**でなければ、
  //   レアを引いた瞬間が「いつものやつ」に埋もれる（旧洞窟が意味を失っていた理由のひとつ）。
  rareGet() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];   // C-E-G-C-E（明るい分散和音の駆け上がり）
    seq.forEach((f, i) => {
      tone({ type: 'square', freq: f, dur: 0.16, start: i * 0.065, gain: 0.14, attack: 0.004 });
      tone({ type: 'triangle', freq: f * 2, dur: 0.20, start: i * 0.065, gain: 0.07, attack: 0.006 });
    });
    tone({ type: 'sine', freq: 1046.5, dur: 0.9, start: 0.34, gain: 0.11, attack: 0.01 });  // 伸びる主音
    tone({ type: 'sine', freq: 1567.98, dur: 0.8, start: 0.34, gain: 0.05, attack: 0.02 }); // 5度上の輝き
    noiseHit({ start: 0.34, dur: 0.5, gain: 0.06, hpFreq: 5000, lpFreq: 15000 });           // きらめき
  },
  // ★こうしえんの すな を投げる瞬間：息を吸い込んでから振り抜く「タメ→バシュンッ」。
  sunaThrow() {
    tone({ type: 'sine', freq: 90, freqEnd: 300, dur: 0.14, gain: 0.20, attack: 0.02 });    // 踏み込み
    noiseHit({ start: 0.10, dur: 0.10, gain: 0.20, hpFreq: 700, lpFreq: 11000 });           // 振り抜き
    tone({ type: 'sawtooth', freq: 300, freqEnd: 1700, dur: 0.20, start: 0.10, gain: 0.15, attack: 0.004 });
    tone({ type: 'square', freq: 900, freqEnd: 2600, dur: 0.16, start: 0.10, gain: 0.07 });
  },
  // ★こうしえんの すな の着弾：作中でいちばん大きい炸裂。低音の底を深く、余韻を長く。
  sunaBoom() {
    tone({ type: 'sine', freq: 300, freqEnd: 14, dur: 0.85, gain: 0.44, attack: 0.001 });
    tone({ type: 'triangle', freq: 150, freqEnd: 13, dur: 0.75, gain: 0.24, attack: 0.001 });
    tone({ type: 'square', freq: 1300, freqEnd: 70, dur: 0.24, gain: 0.14 });
    noiseHit({ dur: 0.05, gain: 0.28, hpFreq: 180, lpFreq: 12000 });                   // 炸裂の芯
    noiseHit({ start: 0.02, dur: 0.60, gain: 0.19, hpFreq: 130, lpFreq: 3000 });       // 長い爆風
    noiseHit({ start: 0.04, dur: 0.22, gain: 0.13, hpFreq: 4200, lpFreq: 15000 });     // 砂と破片
    tone({ type: 'sine', freq: 1046.5, dur: 0.5, start: 0.06, gain: 0.06, attack: 0.01 }); // 抜ける余韻
  },
  // ★バフ切れ：下がる2音だけ。短く小さく（終わりを知らせるだけで、場面の主役にはしない）。
  buffEnd() {
    tone({ type: 'triangle', freq: 660, dur: 0.10, gain: 0.07, attack: 0.004 });
    tone({ type: 'triangle', freq: 440, dur: 0.14, start: 0.09, gain: 0.06, attack: 0.004 });
  },

  // ============ R33 ビリッコが配る弾（らいこうだん以外の2種）============
  // ⚠️ 3種は「受け取った瞬間の音」で聞き分けられなければならない。手渡しの尺は共通なので、
  //    音だけが「今どれを渡されたか」を伝える唯一の手がかりになる。
  //    らいこうだん＝thunder（低く裂ける）／スーパーボール＝弾む上昇／ブラックホール＝沈む下降。
  superGet() {
    // ぽんぽんと弾んで上がる。間隔が詰まっていくので「弾んでいる」ことが耳で分かる
    const seq = [0, 0.13, 0.23, 0.30, 0.35, 0.385];
    seq.forEach((t, i) => {
      const f = 420 * Math.pow(1.16, i);
      tone({ type: 'square', freq: f, freqEnd: f * 1.5, dur: 0.09, start: t, gain: 0.13 - i * 0.012,
             attack: 0.002 });
      tone({ type: 'sine', freq: f * 2, dur: 0.07, start: t, gain: 0.05 });
    });
    tone({ type: 'triangle', freq: 1318.5, dur: 0.5, start: 0.42, gain: 0.10, attack: 0.008 });
  },
  // 跳ね返った瞬間の締め（跳ね返り回数を使い切ったとき）。上がりきって弾ける
  superEnd() {
    tone({ type: 'square', freq: 700, freqEnd: 2400, dur: 0.18, gain: 0.16, attack: 0.003 });
    tone({ type: 'sine', freq: 1400, freqEnd: 3200, dur: 0.22, gain: 0.09, attack: 0.004 });
    noiseHit({ dur: 0.06, gain: 0.20, hpFreq: 900, lpFreq: 14000 });
    noiseHit({ start: 0.05, dur: 0.30, gain: 0.11, hpFreq: 400, lpFreq: 6000 });
  },
  // ブラックホールを受け取る：下へ沈み込む。上の2種と逆向きにして取り違えを消す
  holeGet() {
    tone({ type: 'sawtooth', freq: 620, freqEnd: 90, dur: 0.55, gain: 0.15, attack: 0.01 });
    tone({ type: 'sine', freq: 310, freqEnd: 45, dur: 0.65, gain: 0.17, attack: 0.02 });
    tone({ type: 'triangle', freq: 155, freqEnd: 30, dur: 0.75, gain: 0.10, attack: 0.03 });
    noiseHit({ start: 0.06, dur: 0.55, gain: 0.08, hpFreq: 120, lpFreq: 1800 });
  },
  // 穴が開く：空気を吸い込む長い音。爆発ではないので破裂音を混ぜない
  holeOpen() {
    tone({ type: 'sine', freq: 60, freqEnd: 220, dur: 0.70, gain: 0.22, attack: 0.08 });
    tone({ type: 'sawtooth', freq: 120, freqEnd: 480, dur: 0.60, gain: 0.08, attack: 0.10 });
    noiseHit({ dur: 0.70, gain: 0.12, hpFreq: 200, lpFreq: 2600 });
  },
  // 穴が閉じる：吸い込んだものが一点で潰れる。低い「ドンッ」＋金属的なきしみ
  holeClose() {
    tone({ type: 'sine', freq: 420, freqEnd: 20, dur: 0.55, gain: 0.36, attack: 0.001 });
    tone({ type: 'triangle', freq: 210, freqEnd: 18, dur: 0.50, gain: 0.20, attack: 0.001 });
    tone({ type: 'sawtooth', freq: 1600, freqEnd: 120, dur: 0.18, gain: 0.10 });
    noiseHit({ dur: 0.05, gain: 0.22, hpFreq: 200, lpFreq: 10000 });
    noiseHit({ start: 0.03, dur: 0.34, gain: 0.13, hpFreq: 150, lpFreq: 3000 });
  },

  // 命中：鉄拳の質量が叩き込まれる「ドゴォォン！」。既存 rocketHit より低く・長く・爆発を伴う。
  // R34W4 作り直し。実プレイFB「主人公に当たったときの豆鉄砲のような空気の抜けた音を修正して。
  //   鈍器で殴ったような派手な効果音にして」。
  // ⚠️「空気が抜ける」の正体は**長い下降スイープ**だった：旧実装は 320Hz→16Hz を0.62秒かけて
  //    下げており、これは物理的に「ひゅ〜」と抜けていく笛の作り方そのもの。さらに0.46秒の
  //    中域ヒスが乗って「シュー」を足していた。
  // 鈍器の一撃は逆の性質を持つ：**一瞬で立ち上がり、ほとんど下がらずに一瞬で止まる**。
  //    ①立ち上がりは0.4ms級 ②基音はほぼ固定（下げても半分まで） ③尾は短い
  //    ④打撃面の「ゴッ」という固定音程の胴鳴りが要る（スイープでは出ない）
  // ★R35 再作成。FB「もっとガツンという激しい音にして。鈍器で頭を思いっきりなぐったような音。
  //   極端すぎるくらいでちょうど良い」。前回は「豆鉄砲を消す」ところで止まっていた＝抜けは直ったが
  //   **痛くなかった**。強打を強打に聞かせるのに要るものが3つ、まだ入っていなかった：
  //     ⓐ **二段構え**「ガッ」→(18ms)→「ツン」。重さは一発の大きさではなく**2つの音の間**が作る。
  //        一点に全部重ねると、大きいだけの「ドン」になって硬さが出ない。
  //     ⓑ **本物の歪み**（WaveShaper＝波形クリップ）。潰れた波形＝出せる限界を超えている音で、
  //        「暴力的」の正体はこれ。倍音の足し算では入力が大きくても比率が変わらないので出ない。
  //     ⓒ **BGMを0.1秒沈める**（サイドチェイン・ダック）。周りが引くと同じ音量でも一撃が重くなる。
  //        音量を上げるより効き、しかも子どもの耳に痛くならない。
  //   ⚠️ 「豆鉄砲」の回帰防止（長い下降スイープ禁止・0.3秒以上のノイズ尾禁止）はそのまま守っている。
  // ★R42 再増強。FB「金属音がまだたりない」。R38W2 の主役交代（帯域）は正しかったが、
  //   金属を金属に聞かせる証拠がまだ3つ欠けていた：
  //     ⓐ **リング（余韻）**。金属は叩かれたあと0.5秒以上鳴き続ける。旧実装の最長は0.26秒＝
  //        それは金属ではなく「硬い木」の減衰。ガツンの「ン」＝この鳴き。
  //     ⓑ **うなり（ビート）**。実物の鉄は近接した振動モード対（例 520Hz と 537Hz）を持ち、
  //        その干渉が「ウワンウワン」という揺れを作る。単独の正弦波はシンセにしか聞こえない。
  //     ⓒ **鳴きは歪みバスに入れない**。5本の partial を同じ WaveShaper へ同時に入れると
  //        相互変調で潰れ合い「ビャッ」というブザーに平坦化する。本物のクラングの構造は
  //        「歪んだアタック＋**素通しで鳴り残る**非整数倍音＋残響」。役割を分ける。
  rocketPunchHit() {
    const D = sfxDistBus;                 // null なら tone 側で素の sfxGain に落ちる
    duckBgm(0.34, 0.12, 0.42);            // ⓒ 周りを黙らせる（R42 リングが聞こえるよう戻りを長く）

    // ① 「ガッ」＝インパクトの輪郭（1.5〜8ms）。ここが鋭いほど「殴った」に聞こえる
    noiseHit({ dur: 0.008, gain: 0.85, hpFreq: 400, lpFreq: 17000 });
    noiseHit({ dur: 0.020, gain: 0.62, hpFreq: 1400, lpFreq: 9000 });
    tone({ type: 'square', freq: 3200, freqEnd: 1900, dur: 0.014, gain: 0.34, attack: 0.0003, dest: D });

    // ② 胴鳴り（R34W4の作法＝固定音程のsquare）。R38 金属寄りに1オクターブ上げる
    tone({ type: 'square', freq: 330, dur: 0.09, gain: 0.40, attack: 0.0004, dest: D });
    tone({ type: 'square', freq: 464, dur: 0.075, gain: 0.28, attack: 0.0004, detune: -18, dest: D });

    // ②' ★R38 鉄床（アンヴィル）の主役スタック＝「ガツン！」の正体。
    //   実プレイFB「ボン！ではなくガツン！という強い金属音に」。旧実装が「ボン」に聞こえた
    //   原因は数値で明らか：低域の塊 gain 0.94 が主役で、金属の鳴きは 0.15 以下の脇役だった。
    //   低域が主役＝「ボン」、中高域の非整数倍音が主役＝「ガツン」。主役を交代する。
    //   非整数比 1 : 2.76 : 5.40 : 8.93（実際の鉄板・棒の振動モード比）を**本物の歪み**へ
    //   通す＝倍音同士が潰し合って金属の「軋み」が出る。
    tone({ type: 'sawtooth', freq: 520, dur: 0.20, gain: 0.70, attack: 0.0003, dest: D });
    tone({ type: 'sawtooth', freq: 1435, dur: 0.16, gain: 0.48, attack: 0.0003, dest: D });
    tone({ type: 'square', freq: 2808, dur: 0.12, gain: 0.30, attack: 0.0004, dest: D });
    tone({ type: 'sine', freq: 4644, dur: 0.09, gain: 0.16, attack: 0.0005 });

    // ③ 「ツン」＝18ms 遅らせて叩き込む低域の塊。この遅れが二段構えの本体。
    //   R38 gain 0.94→0.62 へ＝重さの土台には残すが、主役（＝ボン）からは降ろす
    tone({ start: 0.018, type: 'sine', freq: 96, freqEnd: 52, dur: 0.18, gain: 0.62, attack: 0.0005 });
    tone({ start: 0.018, type: 'triangle', freq: 64, freqEnd: 40, dur: 0.22, gain: 0.38, attack: 0.0006 });
    tone({ start: 0.018, type: 'square', freq: 128, dur: 0.09, gain: 0.30, attack: 0.0004, dest: D });
    noiseHit({ start: 0.016, dur: 0.045, gain: 0.48, hpFreq: 70, lpFreq: 2200 });

    // ④ ★R42 リング層＝鉄床と同じ非整数比の**鳴き**。歪みバスへは入れず素通し＋verb残響（ⓒ）。
    //   ②'（歪み・短い）が「ガツ」、この層（クリーン・長い）が「ン〜」。同じ金属の2つの顔。
    //   各基音に数%ずらした相方を並走させ、うなりを作る（ⓑ 520+537=17Hz / 1435+1481=46Hz）。
    //   freqEnd の微小サグ（約-3%）は叩かれた金属の張力が緩む挙動＝ピッチが僅かに垂れる。
    tone({ start: 0.022, type: 'sine', freq: 520, freqEnd: 506, dur: 0.72, gain: 0.46, attack: 0.0008, verb: 0.40 });
    tone({ start: 0.022, type: 'sine', freq: 537, dur: 0.64, gain: 0.22, attack: 0.001, verb: 0.35 });
    tone({ start: 0.024, type: 'sine', freq: 1435, freqEnd: 1394, dur: 0.55, gain: 0.30, attack: 0.001, verb: 0.35 });
    tone({ start: 0.024, type: 'sine', freq: 1481, dur: 0.48, gain: 0.15, attack: 0.001 });
    tone({ start: 0.026, type: 'sine', freq: 2808, freqEnd: 2726, dur: 0.40, gain: 0.18, attack: 0.001, verb: 0.30 });
    tone({ start: 0.026, type: 'sine', freq: 4644, dur: 0.26, gain: 0.10, attack: 0.001 });
    noiseHit({ start: 0.010, dur: 0.11, gain: 0.30, hpFreq: 3200, lpFreq: 14000 });

    // ⑤ 尾：短く（noiseの尾0.3秒未満は R34W4 の回帰ガードどおり。低域の尾も短縮）
    tone({ start: 0.04, type: 'sine', freq: 46, freqEnd: 32, dur: 0.22, gain: 0.24, attack: 0.008 });
    noiseHit({ start: 0.05, dur: 0.16, gain: 0.13, hpFreq: 55, lpFreq: 760 });

    // ⑤' ★R42 破片：一撃のあと細かい金属片が跳ねて散る「チン…チッ…」。
    //   大きな鳴きの背後で小さな高音が時間差で鳴る＝「本当に何かが壊れた」の証拠音。
    tone({ start: 0.16, type: 'sine', freq: 3520, freqEnd: 3350, dur: 0.07, gain: 0.11, attack: 0.001, verb: 0.30 });
    tone({ start: 0.27, type: 'sine', freq: 5270, freqEnd: 5020, dur: 0.055, gain: 0.08, attack: 0.001, verb: 0.30 });
    tone({ start: 0.36, type: 'sine', freq: 4180, dur: 0.045, gain: 0.05, attack: 0.001, verb: 0.25 });
  },

  // ★R43 転生の「溜め」＝旧体が限界まで膨らんで静止している0.5秒の音。
  //   破裂の前に置く**張力**の音なので、鳴り終わりが破裂と重ならないよう上へ昇らせて切る：
  //   ①金属が軋む上昇うなり（ゆっくり上がる＝これから壊れる予感） ②内圧の低い唸り
  //   ③不安定に震えるきしみ（近接2音のうなりで「もう保たない」を出す）
  bossStress() {
    const D = sfxDistBus;
    duckBgm(0.42, 0.26, 0.20);          // 周りを深く長く引かせる＝静止の時間そのものを聴かせる
    tone({ type: 'sawtooth', freq: 118, freqEnd: 232, dur: 0.50, gain: 0.30, attack: 0.10, dest: D });
    tone({ type: 'sawtooth', freq: 121, freqEnd: 238, dur: 0.50, gain: 0.20, attack: 0.10, detune: 16, dest: D });
    tone({ type: 'sine', freq: 44, freqEnd: 58, dur: 0.52, gain: 0.44, attack: 0.12 });
    tone({ type: 'sine', freq: 860, freqEnd: 1180, dur: 0.44, gain: 0.10, attack: 0.16, verb: 0.40 });
    tone({ type: 'sine', freq: 884, freqEnd: 1214, dur: 0.44, gain: 0.07, attack: 0.16, verb: 0.40 });
    noiseHit({ start: 0.06, dur: 0.28, gain: 0.09, hpFreq: 900, lpFreq: 5200 });
  },

  // ★R42 空振りニアミス：拳が主人公のすぐ横を通り過ぎた「ヒュンッ！」。
  //   緊張感は被弾量ではなく**避けた回数**で作る（恒久基準）。避けたことが音で数えられると
  //   「今の避けた！」が体験になる。帯域ノイズ＋通過の瞬間に音程が落ちるドップラー。
  wireWhoosh(vol = 1, pitch = 1) {
    noiseHit({ dur: 0.10, gain: 0.30 * vol, hpFreq: 700 * pitch, lpFreq: 7000 * pitch });
    noiseHit({ start: 0.05, dur: 0.10, gain: 0.16 * vol, hpFreq: 300 * pitch, lpFreq: 2600 * pitch });
    tone({ type: 'sawtooth', freq: 620 * pitch, freqEnd: 210 * pitch, dur: 0.13, gain: 0.10 * vol, attack: 0.010 });
    tone({ type: 'sine', freq: 340 * pitch, freqEnd: 150 * pitch, dur: 0.14, gain: 0.12 * vol, attack: 0.012 });
  },

  // ★R42 巻き戻しウィンチ：backSec 0.3秒はこれまで完全に無音だった。ワイヤーは機械なので
  //   巻き取りのラチェット「カカカカッ」＋モーターのうなり＋収納の「ガチャン」で締める。
  //   攻撃の終わりが音で分かる＝次の行動へ移ってよい合図にもなる。
  // ★R44 増強。実プレイFB「巻き戻しラチェット＋モーター＋収納のガチャンがはっきり確認
  //   できなかった。もっとはっきり目立つように」。原因は音の有無ではなく**埋もれ**だった：
  //     ①gain 0.06〜0.18 に対し、直前に鳴る被弾音は 0.70＝**7倍**の音量差
  //     ②被弾音のリング（R42で足した鳴き）が0.72秒残る真上に重ねていた
  //     ③ラチェットが 1350〜2100Hz ＝ 鉄床の鳴き(1435Hz)と同じ帯域で溶ける
  //   対策は3つとも「分ける」：**音量を上げる**／**帯域を上へ逃がす**（4.2〜6.6kHzの硬い点音＝
  //   打撃の鳴きより上）／**BGMを一段沈める**。さらにラチェットを6→10回・0.055秒間隔＝
  //   0.55秒へ伸ばし、巻き戻りの尺（backSec）と絵の長さを合わせる。
  wireWinch() {
    duckBgm(0.52, 0.16, 0.30);           // 周りを下げて通す（打撃ほど深くはしない）
    for (let i = 0; i < 10; i++) {
      const t = i * 0.055;
      // 爪が歯を1つ送るクリック。上の帯域に置くと打撃の余韻と混ざらず「カカカ」が粒で聞こえる
      tone({ start: t, type: 'square', freq: 4200 + i * 240, dur: 0.012, gain: 0.34, attack: 0.0004 });
      tone({ start: t + 0.004, type: 'square', freq: 6600 + i * 180, dur: 0.008, gain: 0.20, attack: 0.0004 });
      noiseHit({ start: t, dur: 0.010, gain: 0.26, hpFreq: 3800, lpFreq: 15000 });
    }
    // 巻き上げモーター（唸りが昇る＝張力が戻っていく）
    tone({ type: 'sawtooth', freq: 190, freqEnd: 330, dur: 0.56, gain: 0.20, attack: 0.02 });
    tone({ type: 'sawtooth', freq: 192, freqEnd: 334, dur: 0.56, gain: 0.12, attack: 0.02, detune: 12 });
    // 収納の「ガチャン」＝拳が肩に収まって止まる。ここだけ低くして終止を作る
    tone({ start: 0.56, type: 'square', freq: 520, dur: 0.07, gain: 0.42, attack: 0.0006 });
    tone({ start: 0.56, type: 'sine', freq: 138, freqEnd: 96, dur: 0.12, gain: 0.34, attack: 0.001 });
    tone({ start: 0.565, type: 'sine', freq: 1435, dur: 0.24, gain: 0.20, attack: 0.001, verb: 0.35 });
    noiseHit({ start: 0.56, dur: 0.035, gain: 0.40, hpFreq: 1200, lpFreq: 12000 });
  },

  // ============ R36W2 マオウレクスのレーザー3点セット ============
  // 実プレイFB「照射時に効果音」「発射音やその演出をできるだけ派手に」「レーザーを受けた主人公が、
  // 攻撃を受けてしまった実感がでるように」。3つで1組：
  //   darkLaser … じゃがん/じゃしんレーザー（紫）の発射。邪悪＝**下へ落ちる音**で作る
  //   godLaser  … 整列レーザー（深紅・作中最大）の発射。ここが最大の見せ場
  //   beamHit   … 受けた側の音。R34W4 の鈍器の作法（鋭い立ち上がり・固定音程の胴・短い尾）に
  //               「焼かれる」のジリジリを足す

  // 紫レーザー発射：「ヴンッ…ゾゾゾ」。高から低へ落ちる歪んだうなり＝邪悪の定石
  //（神々しい音は上へ昇り、邪悪な音は下へ落ちる。じゃがん＝邪眼はこちら）。
  darkLaser() {
    const D = sfxDistBus;
    duckBgm(0.38, 0.08, 0.24);
    // 点火の「カッ」
    noiseHit({ dur: 0.012, gain: 0.5, hpFreq: 900, lpFreq: 14000 });
    // 落ちる主部（歪みへ送る＝ただのサイレンにしない）
    tone({ type: 'sawtooth', freq: 860, freqEnd: 120, dur: 0.5, gain: 0.34, attack: 0.004, dest: D });
    tone({ type: 'sawtooth', freq: 862, freqEnd: 118, dur: 0.5, gain: 0.22, attack: 0.004, detune: 14, dest: D });
    // 低い土台のドン
    tone({ type: 'sine', freq: 150, freqEnd: 40, dur: 0.42, gain: 0.6, attack: 0.002 });
    // 照射のうなり（activeSec 0.7〜1.1 のあいだ鳴り続ける胴）
    tone({ type: 'sawtooth', freq: 92, dur: 0.85, gain: 0.20, attack: 0.03, release: 0.95, dest: D });
    tone({ type: 'square', freq: 184, dur: 0.8, gain: 0.10, attack: 0.04, detune: -10, dest: D });
    // 邪気のきらめき（高域を1本だけ・残響へ）
    tone({ type: 'sine', freq: 1560, freqEnd: 1180, dur: 0.5, gain: 0.07, attack: 0.02, verb: 0.5 });
    noiseHit({ start: 0.03, dur: 0.28, gain: 0.12, hpFreq: 2400, lpFreq: 9000 });
  },

  // 整列レーザー発射：「カッ→ドンッ→ゴォォォ」。作中最大ダメージにふさわしい最大の音。
  // ①点火の閃光 ②地を踏む低音 ③本物の歪みを通した照射の轟音 ④金属の悲鳴 の4段構成。
  // BGMを深く沈める（duck）＝音量を上げずに「世界がこの一撃に譲る」を作る。
  godLaser() {
    const D = sfxDistBus;
    duckBgm(0.20, 0.16, 0.42);
    // ① 点火（1〜2ms の閃光。ここが鋭いほど「撃った」に聞こえる）
    noiseHit({ dur: 0.010, gain: 0.9, hpFreq: 500, lpFreq: 16000 });
    tone({ type: 'square', freq: 4200, freqEnd: 2300, dur: 0.018, gain: 0.30, attack: 0.0004, dest: D });
    // ② 地を踏む（サブの落下＋胴の固定音程）
    tone({ type: 'sine', freq: 130, freqEnd: 30, dur: 0.5, gain: 0.95, attack: 0.001 });
    tone({ type: 'square', freq: 98, dur: 0.16, gain: 0.4, attack: 0.001, dest: D });
    noiseHit({ start: 0.012, dur: 0.10, gain: 0.55, hpFreq: 90, lpFreq: 2600 });
    // ③ 照射の轟音（デチューンした2本を同じシェイパーへ＝互いに潰し合う本物の歪み）
    tone({ type: 'sawtooth', freq: 55, dur: 0.92, gain: 0.30, attack: 0.02, release: 1.0, dest: D });
    tone({ type: 'sawtooth', freq: 82.5, dur: 0.9, gain: 0.22, attack: 0.02, detune: 9, dest: D });
    noiseHit({ start: 0.05, dur: 0.55, gain: 0.16, hpFreq: 300, lpFreq: 5200 });
    // ④ 金属の悲鳴（非整数比の高域が残響へ伸びる＝巨大な構造物が撃った感じ）
    tone({ type: 'sawtooth', freq: 2200, freqEnd: 880, dur: 0.4, gain: 0.10, attack: 0.006, verb: 0.55 });
    tone({ type: 'sine', freq: 3060, freqEnd: 1400, dur: 0.3, gain: 0.06, attack: 0.008, verb: 0.5 });
    // 尾（0.3秒未満の低いゴロゴロ）
    tone({ start: 0.10, type: 'sine', freq: 44, freqEnd: 32, dur: 0.28, gain: 0.30, attack: 0.01 });
  },

  // レーザー被弾：「バチィッ＋ジリッ」。鈍器の作法（R34W4）＝0.4ms級の立ち上がり・固定音程の胴・
  // 短い尾。そこへ「焼かれる」ジリジリ（高域ノイズ0.18秒＝0.3秒未満に収める）を足す。
  beamHit() {
    const D = sfxDistBus;
    duckBgm(0.30, 0.08, 0.22);
    // 直撃の輪郭
    noiseHit({ dur: 0.010, gain: 0.7, hpFreq: 600, lpFreq: 15000 });
    tone({ type: 'square', freq: 190, dur: 0.08, gain: 0.45, attack: 0.0004, dest: D });
    tone({ type: 'square', freq: 266, dur: 0.06, gain: 0.28, attack: 0.0004, detune: -14, dest: D });
    // 重さ（固定寄りの低音・下げても半分まで）
    tone({ type: 'sine', freq: 90, freqEnd: 52, dur: 0.16, gain: 0.7, attack: 0.0006 });
    // 焼かれるジリジリ（バチバチ2発＋短い高域ヒス）
    tone({ start: 0.015, type: 'square', freq: 1500, freqEnd: 900, dur: 0.03, gain: 0.16, dest: D });
    tone({ start: 0.05, type: 'square', freq: 1180, freqEnd: 760, dur: 0.03, gain: 0.12, dest: D });
    noiseHit({ start: 0.012, dur: 0.18, gain: 0.26, hpFreq: 2800, lpFreq: 12000 });
  },

  // ============ R40 軌道神核の儀式音6種 ============
  // 実プレイFB「聖句解放も炸裂弾もしょぼい。最終ボスの攻撃という自覚を」＋「移動にひと工夫」。
  // 神々しさの共通文法：**上の帯域＋残響（verb）**。邪悪は下へ落ち、神々しさは上へ昇る（R36W2）。

  // 転移・消（座を畳む）：吸い込まれる上昇スイープ。終わりを断ち切る＝「消えた」が音で分かる
  warpOut() {
    tone({ type: 'sine', freq: 260, freqEnd: 1050, dur: 0.26, gain: 0.22, attack: 0.05, verb: 0.35 });
    tone({ type: 'triangle', freq: 520, freqEnd: 2100, dur: 0.24, gain: 0.10, attack: 0.06, verb: 0.40 });
    noiseHit({ dur: 0.22, gain: 0.10, hpFreq: 1800, lpFreq: 12000 });
    tone({ type: 'sine', freq: 84, freqEnd: 46, dur: 0.24, gain: 0.30, attack: 0.02 });
  },
  // 転移・現（座に降り立つ）：鐘＋着地の震脚＋きらめき。「現れた」を鐘が宣言する
  warpIn() {
    const b = 1046.5;
    tone({ type: 'sine', freq: b, dur: 0.55, gain: 0.20, attack: 0.002, verb: 0.60 });
    tone({ type: 'sine', freq: b * 1.5, dur: 0.40, gain: 0.09, attack: 0.004, verb: 0.55 });
    tone({ type: 'sine', freq: b * 2.67, dur: 0.28, gain: 0.05, attack: 0.006, verb: 0.50 });
    tone({ type: 'sine', freq: 120, freqEnd: 44, dur: 0.20, gain: 0.50, attack: 0.001 });
    noiseHit({ dur: 0.05, gain: 0.16, hpFreq: 200, lpFreq: 2400 });
    noiseHit({ start: 0.02, dur: 0.30, gain: 0.07, hpFreq: 4200, lpFreq: 14000 });
  },
  // 聖句解放・詠唱（予告0.9秒ぶんのスウェル）：聖歌隊の和音＋オルガンの土台＋昇る光
  verseCharge() {
    const D = sfxDistBus;
    [523.3, 659.3, 784.0].forEach((f, i) => {
      tone({ type: 'triangle', freq: f, dur: 0.85, gain: 0.11 - i * 0.02, attack: 0.30, verb: 0.60 });
      tone({ type: 'sine', freq: f * 2, dur: 0.75, gain: 0.05, attack: 0.34, verb: 0.55 });
    });
    tone({ type: 'sawtooth', freq: 130.8, dur: 0.85, gain: 0.10, attack: 0.25, verb: 0.30, dest: D });
    tone({ type: 'sine', freq: 392, freqEnd: 784, dur: 0.80, gain: 0.08, attack: 0.10, verb: 0.45 });
    noiseHit({ start: 0.3, dur: 0.5, gain: 0.05, hpFreq: 6000, lpFreq: 14000 });
  },
  // ★R44 聖句解放・**発語**（旧「読み上げの小鐘」を作り直し）。
  //   実プレイFB「せいくの2種類目の発射音を変更して。1種類目（詠唱＝verseCharge）は
  //   意外性がある音でとてもいい」。旧実装は 1560Hz の「チーン」＝どこにでもある小鐘で、
  //   詠唱の意外性に対して**釣り合っていなかった**。
  //   この攻撃は「環に刻まれた聖句が1文字ずつ**剥がれて弾になる**」。ならば鳴るべきは鐘ではなく
  //   **その文字が発される声**。母音のフォルマント（F1/F2＝口の中の共鳴）を置くと、合成音でも
  //   人が言葉を発したように聞こえる。文字ごとに母音を変える＝「読んでいる」が耳で分かる。
  //     ア800/1200・イ300/2300・ウ350/800・エ500/1900・オ500/900（実測されている母音の共鳴）
  //   ＋石が剥離する一瞬のきしみ＋弾になる瞬間の光。声→石→光の順で0.06秒に収める。
  versePeal(vol = 1, pitch = 1) {
    const VOW = [[800, 1200], [300, 2300], [350, 800], [500, 1900], [500, 900]];
    const idx = Math.min(4, Math.max(0, Math.floor((pitch - 1) * 4.99)));
    const [f1, f2] = VOW[idx];
    const base = 174.6 * (1 + (pitch - 1) * 0.42);      // 喉の基音（低い詠唱の声）
    // 喉：のこぎり波＝倍音が密＝声帯の代わり
    tone({ type: 'sawtooth', freq: base, dur: 0.30, gain: 0.16 * vol, attack: 0.012, verb: 0.55 });
    tone({ type: 'sawtooth', freq: base * 1.005, dur: 0.30, gain: 0.10 * vol, attack: 0.012, detune: 7 });
    // 口の共鳴（フォルマント）＝ここが母音を決める。F1 を主役に、F2 を色づけに。
    tone({ type: 'sine', freq: f1, dur: 0.26, gain: 0.30 * vol, attack: 0.016, verb: 0.50 });
    tone({ type: 'sine', freq: f2, dur: 0.22, gain: 0.20 * vol, attack: 0.018, verb: 0.50 });
    tone({ type: 'sine', freq: f2 * 1.5, dur: 0.16, gain: 0.07 * vol, attack: 0.02, verb: 0.45 });
    // 石の剥離（文字が環から離れる一瞬のきしみ）
    noiseHit({ dur: 0.018, gain: 0.22 * vol, hpFreq: 2400, lpFreq: 9000 });
    // 弾になる瞬間の光（高いが短い＝声を邪魔しない）
    tone({ start: 0.05, type: 'sine', freq: 2093 * (1 + (pitch - 1) * 0.3), dur: 0.10,
           gain: 0.13 * vol, attack: 0.002, verb: 0.55 });
  },
  // ★R44W4 聖句が「堕ちる」音。versePeal（読み上げの鐘＝音程が**昇る**）の対句として、
  //   ここは全部**降りる**：声の基音が下へ滑り、鐘が濁ったうなりに変わる。
  //   濁りは非整数比の2音を近接させて作る（うなり＝金属でも声でもない不快な帯）。
  //   0.16秒に収める＝1発ごとに鳴っても弾幕の読み上げを潰さない（呼び出し側でも1フレーム2発に制限）。
  verseFall(vol = 1) {
    const D = sfxDistBus;
    // 声が落ちる：のこぎり波が下降＝「聖句が言葉でなくなる」
    tone({ type: 'sawtooth', freq: 174.6, freqEnd: 61.7, dur: 0.16, gain: 0.30 * vol,
           attack: 0.002, dest: D });
    // 濁りのうなり：311Hz と 327Hz＝16Hz のうなり（澄んだ和音にならない間隔）
    tone({ type: 'square', freq: 311, dur: 0.14, gain: 0.12 * vol, attack: 0.003, dest: D });
    tone({ type: 'square', freq: 327, dur: 0.14, gain: 0.12 * vol, attack: 0.003, dest: D });
    // 石が砕けて灰になる質感（高域は短く＝耳に刺さらない）
    noiseHit({ dur: 0.05, gain: 0.16 * vol, hpFreq: 300, lpFreq: 2600 });
  },
  // ★R44W5 かげおに3点セット。退廃の音の署名＝**非整数比の近接2音のうなり**（verseFall の
  //   311/327Hz）を家族で共有する。影は聖句より深いところの存在なので**1オクターブ下**（155/163）。
  // ①影が足あとから起き上がる：息を吸うような遅い立ち上がり＋地の底のうねり
  shadowRise(vol = 1) {
    tone({ type: 'sine', freq: 46, freqEnd: 92, dur: 0.7, gain: 0.5 * vol, attack: 0.4 });
    tone({ type: 'square', freq: 155.5, dur: 0.6, gain: 0.10 * vol, attack: 0.35, verb: 0.6 });
    tone({ type: 'square', freq: 163.5, dur: 0.6, gain: 0.10 * vol, attack: 0.35, verb: 0.6 });
    noiseHit({ dur: 0.55, gain: 0.12 * vol, hpFreq: 2400, lpFreq: 8000 });
  },
  // ②影に噛みつかれた：重い一撃＋うなり（弾とは違う「冷たい」被弾だと音で分かる）
  shadowBite(vol = 1) {
    const D = sfxDistBus;
    tone({ type: 'sine', freq: 140, freqEnd: 48, dur: 0.18, gain: 0.6 * vol, attack: 0.001, dest: D });
    tone({ type: 'square', freq: 311, dur: 0.12, gain: 0.14 * vol, attack: 0.002 });
    tone({ type: 'square', freq: 327, dur: 0.12, gain: 0.14 * vol, attack: 0.002 });
    noiseHit({ dur: 0.04, gain: 0.2 * vol, hpFreq: 500, lpFreq: 4000 });
  },
  // ③影が果てる大爆発（R44W7「炎を出しながら大爆発して。爆発音も派手に」）。
  //   爆発が「近い・大きい」と聞こえるのは音量ではなく**時間構造**：
  //     ①先行するクラック（0ms・ごく短い高域）＝これが無いと遠い花火になる
  //     ②本体の低音（深い下降）＝大きさの体
  //     ③炎＝帯域が 9k→260Hz へ落ちる掃引ノイズ（広がって燃える）
  //     ④うなりの尾＝かげおに家族の署名 155.5/163.5Hz を残響で伸ばす
  //     ⑤がれき＝遅れて降る短い高域（時間差があると「大きいものが壊れた」に聞こえる）
  //   ★後続の影（vol小）は①〜③の縮小版だけ。15体ぶんの尾が重なると濁って逆に小さくなる。
  //   ★★R44W8「かげおにの一番の不満点は爆発と爆風。もっとずっと派手に。とくにエフェクトと
  //     音（爆発音と爆風音）をいまよりずっと派手に」。★音量では派手にならない（既に0.95で
  //     ヘッドルームが無い）。**層と時間**を足す：
  //       ⑥サブベース 42→18Hz＝体に来る帯域（旧実装に無かった）
  //       ⑦**二段の本体**（0ms と 55ms）＝「ドッ…ドーン」。1発の低音より確実に大きく聞こえる
  //       ⑧金属の裂け（非整数比の3本を歪みバスへ）＝「割れた」の証拠
  //       ⑨轟きの掃引を**2本**（速い炎0.72秒＋遅い轟き1.5秒）＝尾が長く残る
  //       ⑩がれきを3発へ・duck を 0.5→0.62 / release 0.42→0.62
  shadowBurst(vol = 1, pitch = 1) {
    const D = sfxDistBus;
    const big = vol >= 0.6;
    if (big) duckBgm(0.78, 0.16, 0.95);           // 爆発の瞬間だけ音楽を沈める＝一撃が抜ける
    noiseHit({ dur: 0.035, gain: 0.34 * vol, hpFreq: 3200, lpFreq: 12000 });
    tone({ type: 'sine', freq: 118 * pitch, freqEnd: 27, dur: 0.62, gain: 0.95 * vol, attack: 0.001 });
    tone({ type: 'triangle', freq: 74 * pitch, freqEnd: 22, dur: 0.50, gain: 0.42 * vol, attack: 0.002 });
    noiseHit({ dur: big ? 0.72 : 0.30, gain: 0.30 * vol, hpFreq: 160, lpFreq: 9000, lpEnd: 520 });
    tone({ type: 'sawtooth', freq: 880 * pitch, freqEnd: 120, dur: 0.28, gain: 0.20 * vol,
           attack: 0.002, dest: D });
    if (!big) return;
    // ★★R44W10「爆発音・爆発のエフェクト・爆風の音・爆風のエフェクト、**4つともすべて足りない**。
    //   全体的に迫力不足。最終ボスである軌道神核の攻撃であるという自覚をもって」。
    //   ★音の「足りない」の正体は**帯域**だった。R44W8 で足したいちばん大きい層は
    //     サブベース 42→18Hz（gain 0.62）で、これは**子どものノートPCではほぼ無音**
    //     （[[R34W3の教訓]]：下はノートPCで鳴らない）。本体 118→27Hz も後半は聞こえない。
    //     つまり「派手にしたつもりの層」がそもそも届いていなかった。
    //   → 低域は残したまま（良いスピーカーでは効く）、**同じ形を聞こえる帯域にも重ねる**。
    //     これは R38 の「主役交代」と同じ形＝足すのではなく、主役を届く側へ移す。
    tone({ type: 'sine', freq: 42, freqEnd: 18, dur: 1.1, gain: 0.42 * vol, attack: 0.004 });
    tone({ type: 'triangle', freq: 168, freqEnd: 72, dur: 1.0, gain: 0.50 * vol, attack: 0.004 });
    // 二段の本体（0ms と 55ms）＝「ドッ…ドーン」。低域の相棒を2オクターブ上まで重ねる
    tone({ type: 'sine', freq: 96, freqEnd: 24, start: 0.055, dur: 0.80, gain: 0.60 * vol,
           attack: 0.001 });
    tone({ type: 'triangle', freq: 236, freqEnd: 62, start: 0.055, dur: 0.72, gain: 0.52 * vol,
           attack: 0.001 });
    tone({ type: 'sawtooth', freq: 472, freqEnd: 108, start: 0.055, dur: 0.46, gain: 0.26 * vol,
           attack: 0.001, dest: D });
    tone({ type: 'triangle', freq: 58, freqEnd: 19, start: 0.055, dur: 0.70, gain: 0.24 * vol,
           attack: 0.002 });
    // 三段目（0.19秒）＝「…ゴォン」。最終ボスの一撃は1発では終わらない
    tone({ type: 'triangle', freq: 190, freqEnd: 54, start: 0.19, dur: 0.95, gain: 0.44 * vol,
           attack: 0.002, verb: 0.5 });
    // 金属の裂け：520 / 1435 / 2808Hz＝鉄床（wireHit）と同じ非整数比。歪みバスで「割れた」音に
    tone({ type: 'square', freq: 520, freqEnd: 240, dur: 0.30, gain: 0.22 * vol,
           attack: 0.001, dest: D });
    tone({ type: 'square', freq: 1435, freqEnd: 620, dur: 0.24, gain: 0.15 * vol,
           attack: 0.001, dest: D });
    tone({ type: 'square', freq: 2808, freqEnd: 980, dur: 0.18, gain: 0.10 * vol,
           attack: 0.001, dest: D });
    // 轟きの掃引を2本：速い炎（帯域が聞こえる側へ落ちる）＋遅い轟き（2.4秒＝余韻）
    noiseHit({ start: 0.05, dur: 2.4, gain: 0.26 * vol, hpFreq: 140, lpFreq: 3200, lpEnd: 320 });
    tone({ type: 'square', freq: 155.5, dur: 1.8, gain: 0.13 * vol, attack: 0.01, verb: 0.9 });
    tone({ type: 'square', freq: 163.5, dur: 1.8, gain: 0.13 * vol, attack: 0.01, verb: 0.9 });
    // がれきは5発（時間差が多いほど「大きいものが壊れた」に聞こえる）
    noiseHit({ start: 0.16, dur: 0.07, gain: 0.18 * vol, hpFreq: 1800, lpFreq: 7000 });
    noiseHit({ start: 0.29, dur: 0.06, gain: 0.15 * vol, hpFreq: 2400, lpFreq: 9000 });
    noiseHit({ start: 0.44, dur: 0.05, gain: 0.12 * vol, hpFreq: 3000, lpFreq: 11000 });
    noiseHit({ start: 0.63, dur: 0.05, gain: 0.10 * vol, hpFreq: 2200, lpFreq: 8000 });
    noiseHit({ start: 0.86, dur: 0.04, gain: 0.08 * vol, hpFreq: 2800, lpFreq: 10000 });
  },
  // ★R44W8「爆風音」＝爆発音とは別（FBが2つに分けて書かれている）。爆発は**遠くで起きた出来事**、
  //   爆風は**自分の身体に当たった風**。だから材料が違う：破裂の芯を持たず、
  //   ①押し寄せる帯域（低い唸りが 0.09秒かけて**立ち上がる**＝ぶつかってくる） ②風のノイズが
  //   1.4k→180Hz へ落ちる（体を通り過ぎる） ③服と地面が煽られる短い高域 ④肋に来るサブベース。
  //   立ち上がりが遅い（attack 0.09）のがミソ＝これで「破裂」ではなく「風」に聞こえる。
  shadowBlast(vol = 1) {
    const D = sfxDistBus;
    duckBgm(0.68, 0.14, 0.8);
    // ★R44W10 爆風も同じ理由で届いていなかった（68→34Hz・36→20Hz はノートPCで鳴らない）。
    //   押し寄せる唸りの主役を**204→96Hz**へ移し、低域は下支えに降格する。
    tone({ type: 'sawtooth', freq: 68, freqEnd: 34, dur: 0.65, gain: 0.42 * vol, attack: 0.09 });
    tone({ type: 'sawtooth', freq: 204, freqEnd: 96, dur: 0.75, gain: 0.70 * vol, attack: 0.09,
           dest: D });
    tone({ type: 'triangle', freq: 144, freqEnd: 80, dur: 0.9, gain: 0.46 * vol, attack: 0.06 });
    tone({ type: 'sine', freq: 36, freqEnd: 20, dur: 0.85, gain: 0.34 * vol, attack: 0.06 });
    // 風が体を通り過ぎる：帯域が落ちる長いノイズ＋煽られる高域＋遅れて戻る空気
    noiseHit({ dur: 0.9, gain: 0.40 * vol, hpFreq: 200, lpFreq: 3200, lpEnd: 420 });
    noiseHit({ start: 0.04, dur: 0.30, gain: 0.26 * vol, hpFreq: 1600, lpFreq: 9000, lpEnd: 2200 });
    noiseHit({ start: 0.38, dur: 0.45, gain: 0.16 * vol, hpFreq: 300, lpFreq: 2200, lpEnd: 600 });
    tone({ type: 'square', freq: 163.5, dur: 0.9, gain: 0.12 * vol, attack: 0.05, verb: 0.8 });
  },
  // ★R44W10「移動時に**ザッザッザッという迫ってくる効果音**を」。
  //   ★1回の再生で**大勢が踏んだ**に聞こえるよう、同じ踏み込みを 0/17/31ms とばらして重ねる
  //     （24体ぶん個別に鳴らすと足音ではなく雑音になる。隊列の足音は音の側で作る）。
  //   ザッ の正体＝砂を擦る短い高域ノイズ（帯域が落ちる）＋踏み固める短い中域。
  //   ★重さを「低いドスン」で出さない（ノートPCで鳴らない）。168→96Hz の胴で出す。
  //   ★R44W12 実プレイFB「かげおにの移動音をもっと大きくして。その方がプレーヤーが
  //     **追われてる感**がでる」。実測（cdp-shadow-step.mjs）で耳に届く大きさは最大0.313＝
  //     被弾音 shadowBite(0.6) の半分しかなく、しかも軌道神核BGM（歪んだギター＋16分の
  //     ベース）と帯域が丸かぶりだった。音量・帯域の2つで上げる（[[R44W4 巻き戻し音]]と同じ処方）：
  //       ①gain を約1.7倍（0.34→0.56）＝被弾音と同格まで
  //       ②擦り（ザッ）を 900-7000Hz → 1500-9500Hz へ。歪みギターの中域から逃がす
  //       ③踏み込みの胴を 168→210Hz へ。16分刻みのベースの上へ抜けさせる
  shadowStep(vol = 1, pitch = 1) {
    const feet = [0, 0.017, 0.031];
    for (let i = 0; i < feet.length; i++) {
      const g = vol * (i === 0 ? 1 : 0.46 - i * 0.10);
      noiseHit({ start: feet[i], dur: 0.055, gain: 0.52 * g,
                 hpFreq: 1500 * pitch, lpFreq: 9500 * pitch, lpEnd: 2200 * pitch });
      tone({ type: 'triangle', freq: 210 * pitch, freqEnd: 112 * pitch, start: feet[i],
             dur: 0.07, gain: 0.56 * g, attack: 0.001 });
    }
    noiseHit({ dur: 0.10, gain: 0.20 * vol, hpFreq: 190, lpFreq: 900 });
  },
  // ============ R45 新モビット3体の音 ============
  // ★4つとも「主人公に良いことが起きた」音なので、敵の音（歪み・低い・濁った）とは
  //   反対側に置く＝澄んだ倍音・上行・長い残響。歪みバスは一切使わない。
  //
  // ①命の盾が張られる：ガラスの壁が立ち上がる。低い芯が**上へ**伸び、和音が開いて残る
  //   （被弾音 hurt が下行なので、上行にすると「守られた」と反対の意味で読める）。
  lifeShield(vol = 1) {
    noiseHit({ dur: 0.05, gain: 0.22 * vol, hpFreq: 2600, lpFreq: 12000 });
    tone({ type: 'sine', freq: 220, freqEnd: 660, dur: 0.30, gain: 0.42 * vol, attack: 0.004 });
    // 完全5度＋オクターブ（440 : 660 : 880）＝澄んで揺るがない和音＝「壁」
    tone({ type: 'triangle', freq: 440, dur: 0.85, gain: 0.26 * vol, attack: 0.01, verb: 0.75 });
    tone({ type: 'triangle', freq: 660, dur: 0.85, gain: 0.20 * vol, attack: 0.012, verb: 0.75 });
    tone({ type: 'sine',     freq: 880, dur: 0.70, gain: 0.14 * vol, attack: 0.014, verb: 0.75 });
    noiseHit({ start: 0.03, dur: 0.55, gain: 0.10 * vol, hpFreq: 1800, lpFreq: 9000, lpEnd: 3200 });
  },
  // ②その盾が攻撃を弾いた瞬間。★ここが無音だと「当たったのに減らない＝バグ」に見える。
  //   短く硬い「キン」＋わずかな残響だけ。頻度が高いので長い尾は付けない（濁る）。
  shieldBlock(vol = 1) {
    noiseHit({ dur: 0.03, gain: 0.26 * vol, hpFreq: 3200, lpFreq: 14000 });
    tone({ type: 'square', freq: 1320, freqEnd: 880, dur: 0.10, gain: 0.20 * vol, attack: 0.001 });
    tone({ type: 'sine',   freq: 1760, dur: 0.22, gain: 0.12 * vol, attack: 0.002, verb: 0.55 });
  },
  // ③爆速ドリンクを注入：栓が抜ける「ポン」→ 炭酸のしゅわしゅわ → 上がっていく回転数。
  //   ⚠️ 上行グリッサンドを**止めずに切る**のがコツ。着地させると「終わった音」になり、
  //      これから速く走るという予告にならない。
  speedDrink(vol = 1) {
    tone({ type: 'sine', freq: 700, freqEnd: 1500, dur: 0.07, gain: 0.30 * vol, attack: 0.001 });
    noiseHit({ start: 0.05, dur: 0.42, gain: 0.20 * vol, hpFreq: 3800, lpFreq: 13000, lpEnd: 6000 });
    tone({ type: 'triangle', freq: 330, freqEnd: 990, start: 0.06, dur: 0.34, gain: 0.30 * vol,
           attack: 0.006 });
    tone({ type: 'square', freq: 495, freqEnd: 1485, start: 0.06, dur: 0.30, gain: 0.14 * vol,
           attack: 0.008 });
    tone({ type: 'sine', freq: 1320, start: 0.30, dur: 0.26, gain: 0.16 * vol, attack: 0.004,
           verb: 0.5 });
  },
  // ④ネムッコの覚醒。★この子の物語がここに全部乗る＝いちばん長くて派手にしてよい音。
  //   眠りの中の低いうなり →（間）→ 目が開く鐘 → 上へ抜ける和音。
  //   ⚠️ 軌道神核の名乗り（低く濁った側）と真正面からぶつける音にする＝味方の側の「神」。
  nemukkoWake(vol = 1) {
    // まだ眠っている低いうなり（ここで一度、耳が下を向く）
    tone({ type: 'sine', freq: 110, freqEnd: 165, dur: 0.42, gain: 0.34 * vol, attack: 0.05 });
    // 目が開く：金の鐘（非整数比を避けて澄ませる＝敵の金属音と正反対）
    tone({ type: 'sine',     freq: 880,  start: 0.30, dur: 1.30, gain: 0.30 * vol,
           attack: 0.003, verb: 0.85 });
    tone({ type: 'triangle', freq: 1320, start: 0.30, dur: 1.10, gain: 0.20 * vol,
           attack: 0.004, verb: 0.85 });
    tone({ type: 'sine',     freq: 1760, start: 0.34, dur: 0.95, gain: 0.14 * vol,
           attack: 0.005, verb: 0.85 });
    noiseHit({ start: 0.30, dur: 0.10, gain: 0.20 * vol, hpFreq: 4000, lpFreq: 15000 });
    // 上へ抜ける（起き上がった）
    tone({ type: 'triangle', freq: 440, freqEnd: 1760, start: 0.52, dur: 0.55, gain: 0.24 * vol,
           attack: 0.01 });
    tone({ type: 'sine', freq: 660, freqEnd: 2640, start: 0.56, dur: 0.50, gain: 0.14 * vol,
           attack: 0.012 });
    // 余韻（BGMの上に残る光）
    tone({ type: 'sine', freq: 2093, start: 0.85, dur: 1.40, gain: 0.10 * vol,
           attack: 0.02, verb: 0.9 });
  },
  // ============ R47 ラゴン（単独行動の槍使い）の音 ============
  // ★4音とも「ライトセーバー」を軸に組む。FBの指定は見た目（青白く光る槍）だけだが、
  //   あの武器の正体は**うなり（ビート）**なので、音を外すと見た目だけの棒になる。
  //   ⚠️ 歪みバスには入れない（味方の音＝澄んだ側／[[R42の教訓]]）。ザラつきは歪みではなく
  //      **2本の近接した矩形波のうなり**で作る（174Hz と 179Hz ＝毎秒5回の脈）。
  //   ⚠️ 芯を低域だけに置かない（子どものノートPCで鳴らない）。348/696Hz にも同じ形を重ねる。
  //
  // ①点火：主人公のもとを離れて狩りへ出る合図。低い立ち上がり →（うなりが乗る）→ 高い抜け。
  lanceIgnite(vol = 1) {
    // 刃が伸びる：短い上行。ここだけノイズを混ぜて「起動した」硬さを出す
    noiseHit({ dur: 0.09, gain: 0.20 * vol, hpFreq: 1800, lpFreq: 12000, lpEnd: 5000 });
    tone({ type: 'sine', freq: 120, freqEnd: 348, dur: 0.22, gain: 0.40 * vol, attack: 0.004 });
    // ハム（うなり）。2本を5Hzずらして重ねる＝ライトセーバーの脈
    tone({ type: 'square', freq: 174, dur: 0.95, gain: 0.15 * vol, attack: 0.03, verb: 0.35 });
    tone({ type: 'square', freq: 179, dur: 0.95, gain: 0.15 * vol, attack: 0.03, verb: 0.35 });
    tone({ type: 'triangle', freq: 348, dur: 0.85, gain: 0.13 * vol, attack: 0.035, verb: 0.4 });
    tone({ type: 'triangle', freq: 696, dur: 0.60, gain: 0.07 * vol, attack: 0.04, verb: 0.4 });
    // 抜けていく高音（「シュイン」の上側）
    tone({ type: 'sine', freq: 520, freqEnd: 1760, start: 0.05, dur: 0.30, gain: 0.20 * vol,
           attack: 0.006 });
  },
  // ②突き。0.62秒ごとに鳴るので**短く軽く**（長い尾を付けると連打で濁る）。
  //   「ヒュン（空気を裂く）」＋「ジュッ（刃が触れた）」の2枚だけ。
  lanceThrust(vol = 1, pitch = 1) {
    noiseHit({ dur: 0.055, gain: 0.20 * vol, hpFreq: 2400 * pitch, lpFreq: 13000, lpEnd: 4200 });
    tone({ type: 'square', freq: 880 * pitch, freqEnd: 420 * pitch, dur: 0.09,
           gain: 0.16 * vol, attack: 0.001 });
    tone({ type: 'sine', freq: 1760 * pitch, dur: 0.12, gain: 0.09 * vol, attack: 0.002, verb: 0.3 });
  },
  // ③消滅させた瞬間。★ここがこの子の快感の核＝**数えられる**ように、突きの音とはっきり別物にする。
  //   刃が抜ける「シャッ」→ 相手が光になって散る高い和音 → 短い残響。
  lanceSlay(vol = 1, pitch = 1) {
    noiseHit({ dur: 0.07, gain: 0.26 * vol, hpFreq: 3000, lpFreq: 15000, lpEnd: 6000 });
    tone({ type: 'square', freq: 1320 * pitch, freqEnd: 660 * pitch, dur: 0.11,
           gain: 0.18 * vol, attack: 0.001 });
    // 散る光（長3和音を上へ）＝「消えた」を明るい側で言い切る
    tone({ type: 'sine', freq: 1046.5 * pitch, start: 0.04, dur: 0.30, gain: 0.13 * vol,
           attack: 0.003, verb: 0.55 });
    tone({ type: 'sine', freq: 1318.5 * pitch, start: 0.06, dur: 0.28, gain: 0.10 * vol,
           attack: 0.003, verb: 0.55 });
    tone({ type: 'sine', freq: 1568 * pitch, start: 0.08, dur: 0.24, gain: 0.08 * vol,
           attack: 0.003, verb: 0.6 });
  },
  // ④肩で息。FB「その際に肩で息をする行動をいれて」。
  //   ★息は音程を持たない＝**帯域が上下するノイズ**で作る（吸う＝上がる／吐く＝下がる）。
  //   胸の鳴り（低い三角波）を薄く添えると「大きな体が息をしている」に読める。
  lancePant(vol = 1) {
    // 吸う（ヒュー）：帯域が上へ
    noiseHit({ dur: 0.26, gain: 0.16 * vol, hpFreq: 700, lpFreq: 2600, lpEnd: 6000 });
    tone({ type: 'triangle', freq: 150, freqEnd: 190, dur: 0.24, gain: 0.10 * vol, attack: 0.06 });
    // 吐く（ハァ）：帯域が下へ・少し長い
    noiseHit({ start: 0.30, dur: 0.38, gain: 0.20 * vol, hpFreq: 500, lpFreq: 5200, lpEnd: 1400 });
    tone({ type: 'triangle', freq: 190, freqEnd: 128, start: 0.30, dur: 0.34, gain: 0.12 * vol,
           attack: 0.03 });
  },
  // 裁きの環（殻の全方位波・波ごとに音程が昇る）：地の轟き＋金属の裂け＋高い光輪
  judgeWave(vol = 1, pitch = 1) {
    const D = sfxDistBus;
    tone({ type: 'sine', freq: 130, freqEnd: 38, dur: 0.35, gain: 0.75 * vol, attack: 0.001 });
    noiseHit({ dur: 0.06, gain: 0.30 * vol, hpFreq: 120, lpFreq: 3000 });
    tone({ type: 'sawtooth', freq: 1900 * pitch, freqEnd: 700 * pitch, dur: 0.28,
           gain: 0.16 * vol, attack: 0.003, verb: 0.40, dest: D });
    tone({ type: 'sine', freq: 1046.5 * pitch, dur: 0.30, gain: 0.10 * vol, attack: 0.004, verb: 0.50 });
    noiseHit({ start: 0.02, dur: 0.20, gain: 0.10 * vol, hpFreq: 2600, lpFreq: 11000 });
  },
  // 整列レーザー二射目の再照準：「ガチッ＋二連ピッ＋昇圧」＝もう一度来る、が0.5秒で読める
  relock() {
    const D = sfxDistBus;
    noiseHit({ dur: 0.018, gain: 0.30, hpFreq: 3000, lpFreq: 14000 });
    tone({ type: 'square', freq: 780, freqEnd: 1560, dur: 0.09, gain: 0.16, attack: 0.001, dest: D });
    tone({ start: 0.10, type: 'sine', freq: 1180, dur: 0.07, gain: 0.14, attack: 0.001 });
    tone({ start: 0.22, type: 'sine', freq: 1180, dur: 0.07, gain: 0.14, attack: 0.001 });
    tone({ start: 0.10, type: 'sawtooth', freq: 500, freqEnd: 1000, dur: 0.30, gain: 0.07,
           attack: 0.02, dest: D });
  },
  // ★R44W11 実プレイFB「マオウレクスがバラバラになるシーン。効果音を修正して。
  //   **爆発音とその余韻**をいれて」。
  //   実測（cdp-awaken-sfx.mjs）で指摘の裏が取れた：粉砕の瞬間に鳴っていたのは汎用SFXの
  //   寄せ集め（bigBoom＋crush＋metalSlam）で **25層・余韻0.71秒**。かげおに1体の大爆発
  //   （shadowBurst＝2.4秒の尾）より短い。**作中最大の破壊が、雑魚の爆発より早く消えていた**。
  //
  //   ★この場面は startAwaken で **BGMを止めている**＝作中でいちばん静かな瞬間。
  //     だから余韻はここでこそ効く（沈黙へ溶けていく尾を、他の曲が邪魔しない）。
  //   構造：①先行クラック ②三段の破裂（0/70/220ms＝「ドッ ドーン …ゴォン」）
  //         ③**装甲が引き裂かれる**（歪みバス）と④**金属の鳴き**（★歪ませない）
  //         ⑤破片が散る ⑥時間差の伸びるがれき ⑦帯域が落ちていく3秒の轟き ⑧沈み込み
  //   ★③と④を分けるのが要（[[R42の教訓]]）。5本の倍音を同じ WaveShaper に入れると
  //     相互変調で潰れて「ブザー」に平坦化する。クラングの構造＝**歪んだアタック＋
  //     素通しの鳴き＋残響**で、役割を分担させる。余韻の主役は④。
  //   ★重さを100Hz未満だけで作らない（[[R34W3の教訓]]：下は子どものノートPCで鳴らない）。
  //     低域は残したまま、同じ形を 320 / 262 / 196 / 148Hz に重ねて**届く側に主役を置く**。
  maouShatter(vol = 1) {
    const D = sfxDistBus;
    // ①先行クラック：これが無いと「遠くの花火」になる（近さは高域の一瞬が作る）
    noiseHit({ dur: 0.04, gain: 0.40 * vol, hpFreq: 3400, lpFreq: 13000 });
    // ②一段目「ドッ」＝破裂の芯
    tone({ type: 'sine', freq: 190, freqEnd: 34, dur: 0.80, gain: 0.95 * vol, attack: 0.0008 });
    tone({ type: 'triangle', freq: 320, freqEnd: 80, dur: 0.70, gain: 0.62 * vol, attack: 0.0008 });
    tone({ type: 'sine', freq: 52, freqEnd: 20, dur: 1.30, gain: 0.45 * vol, attack: 0.004 });
    // 二段目「ドーン」（70ms）＝1発の低音より確実に大きく聞こえる
    tone({ type: 'sine', freq: 128, freqEnd: 28, start: 0.07, dur: 1.00, gain: 0.72 * vol,
           attack: 0.001 });
    tone({ type: 'triangle', freq: 262, freqEnd: 64, start: 0.07, dur: 0.90, gain: 0.58 * vol,
           attack: 0.001 });
    tone({ type: 'sawtooth', freq: 524, freqEnd: 110, start: 0.07, dur: 0.50, gain: 0.28 * vol,
           attack: 0.001, dest: D });
    // 三段目「…ゴォン」（220ms）＝最終ボスの破壊は1発では終わらない
    tone({ type: 'triangle', freq: 196, freqEnd: 52, start: 0.22, dur: 1.30, gain: 0.50 * vol,
           attack: 0.002, verb: 0.55 });
    // ③装甲が引き裂かれる：歪みバスへ入れるのは**アタックだけ**
    tone({ type: 'sawtooth', freq: 700, freqEnd: 180, dur: 0.55, gain: 0.30 * vol,
           attack: 0.001, dest: D });
    tone({ type: 'square', freq: 1435, freqEnd: 520, dur: 0.42, gain: 0.18 * vol,
           attack: 0.001, dest: D });
    // ④金属の鳴き：鉄床と同じ非整数比（520 : 1435 : 2808 ＝ 1 : 2.76 : 5.40）を**素通しで**長く。
    //   ここが余韻の主役＝「巨大な金属の胴が、砕けたあとも鳴り続けている」
    tone({ type: 'square', freq: 520, dur: 2.40, gain: 0.145 * vol, attack: 0.004, verb: 0.90 });
    tone({ type: 'square', freq: 1435, dur: 2.00, gain: 0.090 * vol, attack: 0.004, verb: 0.90 });
    tone({ type: 'square', freq: 2808, dur: 1.60, gain: 0.055 * vol, attack: 0.004, verb: 0.90 });
    // 壊れた機械のうなり（13.5Hz のうなりが出る2本）＝止まらない駆動音が軋みながら落ちていく
    tone({ type: 'square', freq: 233, dur: 2.60, gain: 0.10 * vol, attack: 0.02, verb: 0.90 });
    tone({ type: 'square', freq: 246.5, dur: 2.60, gain: 0.10 * vol, attack: 0.02, verb: 0.90 });
    // ⑤破片が四方へ散る：帯域が 10k→1.6k へ落ちる＝遠ざかっていく（「バラバラ」の音の側）
    noiseHit({ start: 0.02, dur: 0.70, gain: 0.26 * vol, hpFreq: 900, lpFreq: 10000, lpEnd: 1600 });
    // ⑦余韻の轟き：3.0秒かけて 3.6k→300Hz へ落ちる。★終端を聞こえる帯域に置く
    noiseHit({ start: 0.06, dur: 3.00, gain: 0.28 * vol, hpFreq: 120, lpFreq: 3600, lpEnd: 300 });
    // ⑥がれき：間隔が**だんだん伸びる**6発（等間隔だと機械的に聞こえ、質量が消える）
    const rubble = [0.20, 0.36, 0.55, 0.79, 1.08, 1.44];
    for (let i = 0; i < rubble.length; i++) {
      noiseHit({ start: rubble[i], dur: 0.07 - i * 0.005, gain: (0.20 - i * 0.025) * vol,
                 hpFreq: 1800 + i * 220, lpFreq: 9000 });
      tone({ type: 'triangle', freq: 210 - i * 14, freqEnd: 90, start: rubble[i], dur: 0.10,
             gain: (0.16 - i * 0.02) * vol, attack: 0.001 });
    }
    // ⑧沈み込み：最後に体へ残る低音。BGMが無いので、これがそのまま沈黙へ溶ける
    tone({ type: 'sine', freq: 74, freqEnd: 30, start: 0.80, dur: 2.20, gain: 0.30 * vol,
           attack: 0.06 });
    tone({ type: 'triangle', freq: 148, freqEnd: 60, start: 0.80, dur: 2.20, gain: 0.26 * vol,
           attack: 0.06, verb: 0.6 });
  },

  // ============ R34W2 ナックルウェーブ：トマホーク斉射の3点セット ============
  // 実プレイFB「ナックルウェーブやワイヤーアームも攻撃音や発射音がなにもかわっていない」。
  // 実測したところ**指摘のとおり**で、ナックルウェーブは R29 の knuckle＋missileFly＋shoot を
  // 鳴らしたきり一度も作り直していなかった（飛来音も着弾音も無く、飛んでいる間は無音）。
  // R31 で作った SAM の3点セットは missile 側にしか繋いでいない。
  //
  // ⚠️ ここは SAM の流用にしない。実物の BGM-109 トマホークは**亜音速の巡航ミサイル**で、
  //    ブースターで撃ち出したあと翼を開いてターボファンで飛ぶ。SAM の「超音速のクラック」ではなく
  //    **低いジェットのうなり**が主役になる＝同じ「ミサイル」でも音の性格が違う。
  //    （音色そのものの録音資料は確認できていないので、ここは機構からの再構成＝推測を含む）

  // 発射：①両拳の巨大な金属クラッシュ ②発射管が開く ③7本が**1本ずつずれて**点火する
  //   ③をずらすのが要点。同時に鳴らすと1発の爆発に聞こえて「7本撃った」が数えられない。
  knuckleWave() {
    // ① 両拳を叩き合わせる衝撃（旧 knuckle より低く・長く。ここが"ため"になる）
    tone({ type: 'sine', freq: 300, freqEnd: 26, dur: 0.52, gain: 0.36, attack: 0.001 });
    tone({ type: 'triangle', freq: 150, freqEnd: 20, dur: 0.46, gain: 0.18, attack: 0.001 });
    noiseHit({ dur: 0.05, gain: 0.20, hpFreq: 180, lpFreq: 9000 });
    noiseHit({ start: 0.02, dur: 0.30, gain: 0.15, hpFreq: 300, lpFreq: 4200 });
    // ② 発射管が開く金属スライド（「シャコンッ」＝これから撃つ、の合図）
    tone({ type: 'square', freq: 380, freqEnd: 1250, dur: 0.11, start: 0.06, gain: 0.10 });
    noiseHit({ start: 0.06, dur: 0.09, gain: 0.09, hpFreq: 2200, lpFreq: 12000 });
    // ③ 7本の一斉点火。0.035秒ずつずらして「ドドドドドドッ」と数えられるようにする
    for (let i = 0; i < 7; i++) {
      const t = 0.15 + i * 0.035;
      const p = 1 + (i - 3) * 0.04;                 // 扇状に散るので1本ずつ高さを変える
      tone({ start: t, type: 'sine', freq: 210 * p, freqEnd: 52 * p, dur: 0.11,
             gain: 0.17, attack: 0.001 });
      noiseHit({ start: t, dur: 0.05, gain: 0.10, hpFreq: 120, lpFreq: 2600 });
      noiseHit({ start: t + 0.02, dur: 0.20, gain: 0.055, hpFreq: 400, lpFreq: 5000 });
    }
    // ④ 扇に散っていく噴射の尾
    noiseHit({ start: 0.22, dur: 0.55, gain: 0.075, hpFreq: 260, lpFreq: 3600 });
    tone({ type: 'sawtooth', freq: 90, freqEnd: 240, dur: 0.55, start: 0.22,
           gain: 0.075, attack: 0.02 });
  },

  // 巡航中：ターボファンの低いうなり＋翼が切る風。samFly の超音速クラックは**入れない**。
  tomahawkFly(power, pitch) {
    const p = pitch == null ? 1 : pitch;
    const g = power == null ? 1 : power;
    tone({ type: 'sawtooth', freq: 128 * p, freqEnd: 172 * p, dur: 0.50, gain: 0.10 * g, attack: 0.06 });
    tone({ type: 'square', freq: 64 * p, freqEnd: 86 * p, dur: 0.50, gain: 0.05 * g,
           attack: 0.06, detune: 12 });
    tone({ type: 'triangle', freq: 512 * p, freqEnd: 688 * p, dur: 0.44, gain: 0.035 * g, attack: 0.09 });
    noiseHit({ dur: 0.50, gain: 0.075 * g, hpFreq: 380, lpFreq: 3000 });     // 翼が切る風
  },

  // 着弾：巡航ミサイルは重い弾頭を運ぶので、SAM より**低く・遅く・長い**爆発にする
  tomahawkBoom(power) {
    const g = power == null ? 1 : power;
    tone({ type: 'sine', freq: 200, freqEnd: 14, dur: 0.78, gain: 0.42 * g, attack: 0.002 });
    tone({ type: 'triangle', freq: 96, freqEnd: 13, dur: 0.70, gain: 0.22 * g, attack: 0.002 });
    noiseHit({ dur: 0.055, gain: 0.26 * g, hpFreq: 160, lpFreq: 10000 });
    noiseHit({ start: 0.03, dur: 0.60, gain: 0.17 * g, hpFreq: 110, lpFreq: 2400 });
    noiseHit({ start: 0.04, dur: 0.20, gain: 0.10 * g, hpFreq: 3600, lpFreq: 15000 });
  },

  // ================= R34 エンディング専用 =================
  // 実プレイFB「エンディングがしょぼすぎる。もっと派手な演出や音にして」。
  // ここまでの音は全部「戦いの音」なので、祝祭の語彙（打ち上げ花火・シャンパンの泡・
  // ファンファーレ・鐘）を新しく作る。戦闘音の使い回しでは"派手"にならない。

  // 打ち上げ花火：①ヒュ〜ッと上がる笛 ②ドン！の破裂 ③パチパチと散る火の粉
  firework(arg) {
    const p = 0.9 + (arg || 0) * 0.2;
    // ①上昇の笛（0.42秒かけて上がる）
    tone({ type: 'sine', freq: 420 * p, freqEnd: 1500 * p, dur: 0.42, gain: 0.10, attack: 0.02 });
    noiseHit({ dur: 0.40, gain: 0.035, hpFreq: 1800, lpFreq: 6000 });
    // ②破裂
    tone({ start: 0.44, type: 'sine', freq: 220, freqEnd: 40, dur: 0.34, gain: 0.34, attack: 0.001 });
    noiseHit({ start: 0.44, dur: 0.13, gain: 0.30, hpFreq: 200, lpFreq: 12000 });
    // ③散る火の粉（間隔をずらした細かい破裂を12粒）
    for (let i = 0; i < 12; i++) {
      noiseHit({ start: 0.50 + i * 0.045 + (i % 3) * 0.012, dur: 0.05,
                 gain: 0.085 - i * 0.005, hpFreq: 3000, lpFreq: 15000 });
    }
  },

  // 到達のきらめき：上へ駆け上がる鐘の分散和音（イラストが現れる瞬間に使う）
  endChime() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
    seq.forEach((f, i) => {
      tone({ start: i * 0.055, type: 'sine', freq: f, dur: 0.9 - i * 0.06,
             gain: 0.14 - i * 0.012, attack: 0.003 });
      tone({ start: i * 0.055, type: 'triangle', freq: f * 2, dur: 0.5 - i * 0.04,
             gain: 0.05 - i * 0.005, attack: 0.004 });
    });
  },

  // 凱歌のファンファーレ：金管の付点3連（タッタ・ター！）＋ティンパニ。締めの一発。
  endFanfare() {
    const fig = [[0, 392], [0.11, 523.25], [0.22, 659.25], [0.40, 783.99]];
    for (const [t, f] of fig) {
      const long = t >= 0.40;
      tone({ start: t, type: 'sawtooth', freq: f, dur: long ? 1.1 : 0.13,
             gain: 0.20, attack: 0.006 });
      tone({ start: t, type: 'square', freq: f, dur: long ? 1.0 : 0.11,
             gain: 0.085, attack: 0.008, detune: 8 });
      tone({ start: t, type: 'sawtooth', freq: f * 1.5, dur: long ? 0.9 : 0.10,
             gain: 0.07, attack: 0.006 });
      tone({ start: t, type: 'triangle', freq: f / 2, dur: long ? 1.0 : 0.12,
             gain: 0.10, attack: 0.006 });
    }
    tone({ type: 'sine', freq: 120, freqEnd: 50, dur: 0.4, gain: 0.26, attack: 0.003 });
    tone({ start: 0.40, type: 'sine', freq: 120, freqEnd: 46, dur: 0.5, gain: 0.30, attack: 0.003 });
    noiseHit({ start: 0.40, dur: 0.12, gain: 0.10, hpFreq: 120, lpFreq: 2600 });
  },

  // 記録が1行ずつ「押される」音（スタンプ）。紙を打つ乾いた一撃。
  stampHit(arg) {
    const p = 1 + (arg || 0) * 0.06;
    tone({ type: 'square', freq: 900 * p, freqEnd: 300 * p, dur: 0.05, gain: 0.14 });
    tone({ type: 'sine', freq: 180 * p, freqEnd: 70 * p, dur: 0.11, gain: 0.16, attack: 0.001 });
    noiseHit({ dur: 0.035, gain: 0.13, hpFreq: 900, lpFreq: 9000 });
  },

  // 崩れ落ちる残骸（エンディング冒頭の連鎖爆発）。bigBoom より低く、尾を長く。
  endRubble(arg) {
    const p = 0.85 + (arg || 0) * 0.3;
    tone({ type: 'sine', freq: 150 * p, freqEnd: 22, dur: 0.9, gain: 0.30, attack: 0.002 });
    tone({ type: 'triangle', freq: 74 * p, freqEnd: 18, dur: 1.0, gain: 0.16, attack: 0.002 });
    noiseHit({ dur: 0.10, gain: 0.22, hpFreq: 120, lpFreq: 8000 });
    noiseHit({ start: 0.05, dur: 0.75, gain: 0.13, hpFreq: 90, lpFreq: 2400 });
  },

  // ============ R54 通常ボス5体の「特徴攻撃」専用音 ============
  // 実プレイFB「せっかくの各ボスの特徴的な攻撃が、効果音やエフェクトが小さいもしくはなければ、
  // なんの迫力も緊張も生み出さない」。今まで5体の署名攻撃は shoot / ringwave / metalSlam など
  // **他の場面と共用の音**しか鳴っておらず、耳では「いま何をされているか」が区別できなかった。
  // ⚠️ 音量の上限は bigBoom（低域 0.34）と同じ帯に揃える。BGM（オーケストラルロック）と
  //    同時に鳴るので、目立たせたい音は**音量ではなく帯域と持続**で分ける（R44の教訓）。
  // ⚠️ 持続音（rollRumble / vulcanRoar）はノイズバッファが0.6秒しかないので、短いバーストを
  //    尺のぶんだけ並べて敷き詰める（wireWinch のラチェットと同じ作法）。呼び出しは攻撃1回に
  //    つき1度きり＝毎フレーム鳴らさない。

  // コロガンナー：転がり続けるゴロゴロ。sec＝鳴らし切る尺、vol＝音量倍率（既定1）。
  // 「重い球が地面を削って転がる」＝低いノイズの敷き詰め＋わずかにずれた低オシレータのうなり。
  rollRumble(sec, vol) {
    const d = Math.max(0.2, Math.min(3.0, sec == null ? 1.2 : sec));
    const g = vol == null ? 1 : vol;
    duckBgm(0.62, d * 0.45, 0.24);          // 転がっている間だけ周りを沈める＝地響きが通る
    for (let t = 0; t < d; t += 0.15) {
      const w = 1 + 0.22 * Math.sin(t * 11);   // うねり＝同じ音が続かない（機械的に聞こえない）
      noiseHit({ start: t, dur: 0.21, gain: 0.20 * g * w, hpFreq: 40, lpFreq: 460 });  // 地響き
      noiseHit({ start: t + 0.04, dur: 0.11, gain: 0.055 * g, hpFreq: 900, lpFreq: 4600 }); // 砂利
      tone({ start: t, type: 'sawtooth', freq: 58 * w, freqEnd: 72 * w, dur: 0.20,
             gain: 0.16 * g, attack: 0.02, dest: sfxDistBus });
      tone({ start: t, type: 'sine', freq: 41, freqEnd: 50, dur: 0.22, gain: 0.24 * g, attack: 0.02 });
    }
  },
  // コロガンナー：1回ぶんの突進の踏み出し。「ギュルルッ」＝空転してから食いつく。
  // ⚠️ ここを既存 rush（上昇アルペジオ）に頼っていたが、rush は vol/pitch を無視するので
  //    3回とも同じ音量・同じ音程で鳴っていた＝「2回目・3回目のほうが速い」が耳に届かなかった。
  rollLunge(vol, pitch) {
    const g = vol == null ? 1 : vol;
    const p = pitch == null ? 1 : pitch;
    noiseHit({ dur: 0.05, gain: 0.24 * g, hpFreq: 200, lpFreq: 7000 });                 // 蹴り出し
    noiseHit({ start: 0.02, dur: 0.26, gain: 0.13 * g, hpFreq: 500 * p, lpFreq: 5200 * p, lpEnd: 900 });
    tone({ type: 'sawtooth', freq: 150 * p, freqEnd: 780 * p, dur: 0.30, gain: 0.20 * g,
           attack: 0.006, dest: sfxDistBus });                                          // 空転→加速
    tone({ type: 'square', freq: 300 * p, freqEnd: 1240 * p, dur: 0.26, gain: 0.10 * g, detune: 14 });
    tone({ type: 'sine', freq: 96, freqEnd: 46, dur: 0.16, gain: 0.26 * g, attack: 0.001 }); // 踏み込みの重さ
  },
  // コロガンナー：突進が止まった瞬間の「ズシン」。metalSlam の流用をやめて低域を一段深くする。
  rollSlam(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.44, 0.10, 0.24);
    tone({ type: 'sine', freq: 210, freqEnd: 22, dur: 0.44, gain: 0.36 * g, attack: 0.001 });
    tone({ type: 'triangle', freq: 104, freqEnd: 18, dur: 0.40, gain: 0.18 * g, attack: 0.001 });
    noiseHit({ dur: 0.05, gain: 0.20 * g, hpFreq: 110, lpFreq: 6000 });      // 着地のアタック
    noiseHit({ start: 0.02, dur: 0.30, gain: 0.13 * g, hpFreq: 90, lpFreq: 2200 }); // 土煙の胴鳴り
    tone({ type: 'square', freq: 620, freqEnd: 120, dur: 0.10, gain: 0.08 * g });
  },

  // ============ R55 「目立たない」への作り直し（実プレイFB 3件）============
  // ⚠️ 原因を推測で潰さない。R54 の3音を並べて分かった構造的な敗因は2つ：
  //   ①**ダックが浅すぎた**。duckBgm の第1引数は「BGMを何倍まで下げるか」なので**小さいほど深い**。
  //     既存の重い音は 0.38（darkLaser）〜0.42（bossStress）なのに、R54 は 0.48〜0.60＝
  //     **既存のどの決め音より浅い**＝弦の16分オスティナートの上に薄く乗るだけだった。
  //   ②**帯域がBGMと正面衝突していた**。ボス曲はギター（歪み・100〜2kHz）＋弦（200〜800Hz）＋
  //     ベース（50〜120Hz）で中低域が埋まっている。R54 の3音は主部がちょうどそこ。
  //     → 空いている**超高域（6〜16kHz）とサブ（20〜45Hz）**へ主役を移す。
  //   音量（gain）を上げるのは最後の手段（耳に痛くなるだけで「目立つ」にはならない）。

  // ジェットバイパー：フライパスの悲鳴。⚠️ 尺も敗因だった＝助走0.55秒＋通過0.7秒＝1.25秒の
  //   出来事に対し 0.44秒の音しか鳴っておらず、「通り過ぎた」余韻が残らなかった。0.86秒へ延長し、
  //   前半＝近づく（音程が上がる）／後半＝すれ違って落ちる（ドップラー）の2部構成にする。
  jetScream(vol, pitch) {
    const g = vol == null ? 1 : vol;
    const p = pitch == null ? 1 : pitch;
    duckBgm(0.24, 0.34, 0.34);          // R54の0.50から一気に深く・長く（BGMを24%まで沈める）
    // ① 超高域の悲鳴（BGMがほぼ何も出していない 5〜11kHz。ここが「目立つ」の主役）
    tone({ type: 'sawtooth', freq: 3200 * p, freqEnd: 9600 * p, dur: 0.34, gain: 0.20 * g, attack: 0.04 });
    tone({ type: 'square', freq: 4800 * p, freqEnd: 11000 * p, dur: 0.30, gain: 0.10 * g, attack: 0.06, detune: 18 });
    // ② すれ違いのドップラー（上がりきった悲鳴が一気に落ちる＝「抜けていった」）
    tone({ start: 0.30, type: 'sawtooth', freq: 9600 * p, freqEnd: 620 * p, dur: 0.52, gain: 0.22 * g,
           attack: 0.004, dest: sfxDistBus });
    tone({ start: 0.30, type: 'sawtooth', freq: 9400 * p, freqEnd: 600 * p, dur: 0.52, gain: 0.13 * g,
           attack: 0.004, detune: 22, dest: sfxDistBus });
    // ③ サブベース（ベースより下の 60→26Hz。曲と喧嘩せずに「重い機体」が通る）
    tone({ type: 'sine', freq: 60, freqEnd: 26, dur: 0.80, gain: 0.30 * g, attack: 0.06 });
    // ④ 空気を裂く風（帯域が下へ落ちる＝近づいて遠ざかる）。尺いっぱいに敷く
    noiseHit({ dur: 0.42, gain: 0.16 * g, hpFreq: 2000, lpFreq: 16000 });
    noiseHit({ start: 0.30, dur: 0.56, gain: 0.18 * g, hpFreq: 400, lpFreq: 14000, lpEnd: 700 });
  },

  // ウズバルカン：**ガンダムの頭部バルカン＝ガトリング機関砲**として作り直し（R55）。
  // 調べて分かった実音の性質（出典は下記2件）:
  //   ・M61 バルカンは 6,000発/分＝**毎秒100発**の6砲身ロータリー砲
  //     （米空軍博物館 M61A1 ファクトシート／Wikipedia "M61 Vulcan"）
  //   ・GAU-8 は約3,900発/分＝**毎秒65発**で、「65発/秒では人間の耳は個々の発射音を分離できず、
  //     ひと続きの唸り（BRRRT）に融合する」「胸に感じるほど低い周波数になる」
  //     （Simple Flying / militarymachine の GAU-8 解説）
  //   ・ガンダムの頭部バルカンはガトリング砲の一種で牽制用の機関砲（アニヲタWiki「バルカン」）
  // ⚠️ R54 の敗因はここだった：**13発/秒**＝融合の閾値（およそ20発/秒）よりずっと粗く、
  //    1発1発が分離して聞こえる＝機関砲ではなく「大砲の連打」になっていた。
  // ⚠️ 直し方の軸を「パルスの粗密」から**音色そのもの**へ変える（テンポ違いで3回外した過去の教訓）。
  //    毎秒100発のパルス列は、波形として見れば**基本周波数100Hzの倍音の密な波**そのもの。
  //    だから個別の tone を100個並べるのではなく、**100Hzの鋸波を歪ませて持続させる**のが正解。
  //    そこへ乾いた高域ノイズ（薬莢と発射炎の「ジャリジャリ」）を重ね、
  //    ガトリング特有の**回転の立ち上がり（スピンアップ）と止まり際（スピンダウン）**を付ける。
  vulcanRoar(sec, vol) {
    const d = Math.max(0.2, Math.min(3.2, sec == null ? 2.1 : sec));
    const g = vol == null ? 1 : vol;
    duckBgm(0.26, d * 0.75, 0.32);      // 掃射の間ずっとBGMを26%まで沈める
    const RPS = 104;                    // 発射レート＝唸りの基本周波数（M61の100発/秒に合わせる）
    const UP = 0.11, DOWN = 0.16;       // 砲身が回り上がる/回り落ちる尺
    const mid = Math.max(0.06, d - UP - DOWN);
    // ① スピンアップ：レートが上がりきるまで音程が上がる（ガトリングだけが持つ立ち上がり）
    tone({ type: 'sawtooth', freq: RPS * 0.45, freqEnd: RPS, dur: UP, gain: 0.17 * g,
           attack: 0.006, dest: sfxDistBus });
    noiseHit({ dur: UP, gain: 0.08 * g, hpFreq: 1200, lpFreq: 8000 });
    // ② 定常の唸り（BRRRT）。0.22秒ごとに継ぎ足して尺ぶん敷き詰める。
    //    ⚠️ 主役は低域ではなく**乾いた中高域**（頭部バルカンは高めの乾いた連続音）。
    for (let t = UP; t < UP + mid; t += 0.22) {
      tone({ start: t, type: 'sawtooth', freq: RPS, dur: 0.26, gain: 0.17 * g, attack: 0.012, dest: sfxDistBus });
      tone({ start: t, type: 'sawtooth', freq: RPS * 1.012, dur: 0.26, gain: 0.11 * g,
             attack: 0.012, detune: 11, dest: sfxDistBus });   // わずかなずれ＝唸りのざらつき
      tone({ start: t, type: 'square', freq: RPS * 3, dur: 0.26, gain: 0.07 * g, attack: 0.012 });
      noiseHit({ start: t, dur: 0.26, gain: 0.15 * g, hpFreq: 1800, lpFreq: 9000 });    // 乾いた連射感
      noiseHit({ start: t, dur: 0.26, gain: 0.07 * g, hpFreq: 6000, lpFreq: 16000 });   // 薬莢のジャリジャリ
    }
    // ③ スピンダウン：レートが落ちて「ブツッ」と切れる（バースト射撃の止まり方）
    const de = UP + mid;
    tone({ start: de, type: 'sawtooth', freq: RPS, freqEnd: RPS * 0.5, dur: DOWN, gain: 0.16 * g,
           attack: 0.004, dest: sfxDistBus });
    noiseHit({ start: de, dur: DOWN, gain: 0.10 * g, hpFreq: 1400, lpFreq: 7000, lpEnd: 900 });
    tone({ start: de + DOWN - 0.02, type: 'square', freq: 260, freqEnd: 90, dur: 0.05, gain: 0.12 * g });
  },

  // ウェイブロード：つなみウェーブ1枚ぶんの大波。R55で「派手すぎるくらい」へ。
  // ⚠️ 1回の技で3枚来るので、1枚の**音量**を上げると3枚が轟音で潰れて数えられなくなる。
  //    そこで上げるのは音量ではなく **①ダックの深さ ②低域の伸び ③砕けた後の尺**：
  //    低い一撃（0.7秒）は3枚それぞれが立ち、その上に長い泡の「ザーッ」（1.1秒）が
  //    重なって溜まっていく＝枚数は数えられたまま、全体は派手になる。
  //    pitch で1枚ごとに少しずつ高くする＝「3枚目がいちばん大きい」が耳で分かる。
  waveCrash(vol, pitch) {
    const g = vol == null ? 1 : vol;
    const p = pitch == null ? 1 : pitch;
    duckBgm(0.28, 0.22, 0.38);
    // ① 寄せ（帯域が下から上がってくる＝壁が近づく）
    noiseHit({ dur: 0.26, gain: 0.12 * g, hpFreq: 160, lpFreq: 1800 });
    tone({ type: 'sine', freq: 56 * p, freqEnd: 104 * p, dur: 0.26, gain: 0.18 * g, attack: 0.08 });
    // ② 砕け。低域を 0.46→0.70秒 へ伸ばし、さらに下（サブ 40→14Hz）を1枚足す
    tone({ start: 0.24, type: 'sine', freq: 190 * p, freqEnd: 22, dur: 0.70, gain: 0.36 * g, attack: 0.002 });
    tone({ start: 0.24, type: 'triangle', freq: 96 * p, freqEnd: 18, dur: 0.62, gain: 0.19 * g, attack: 0.002 });
    tone({ start: 0.24, type: 'sine', freq: 40, freqEnd: 14, dur: 0.80, gain: 0.26 * g, attack: 0.03 });
    noiseHit({ start: 0.24, dur: 0.06, gain: 0.24 * g, hpFreq: 140, lpFreq: 11000 });   // 砕けた瞬間の白い一撃
    noiseHit({ start: 0.26, dur: 0.52, gain: 0.17 * g, hpFreq: 240, lpFreq: 6000, lpEnd: 520 });
    // ③ 泡の「ザーッ」（長い高域の尾）。3枚ぶん重なって溜まるので1枚は控えめに置く
    //    ＝尺で聞かせる（音量を上げるより埋もれにくい）。
    for (let i = 0; i < 3; i++) {
      noiseHit({ start: 0.34 + i * 0.28, dur: 0.42, gain: (0.085 - i * 0.02) * g,
                 hpFreq: 2600 + i * 900, lpFreq: 15000, lpEnd: 4000 });
    }
    tone({ start: 0.40, type: 'sine', freq: 2400 * p, freqEnd: 1500 * p, dur: 0.60,
           gain: 0.05 * g, attack: 0.10, verb: 0.45 });        // 引き波の残響（濡れた尾）
  },

  // ★R55 ソニックブーム（フライパスの最接近）。bigBoom(0.42) の流用をやめて新設。
  //   衝撃波の聞こえ方は「①直前に音が引く ②一瞬の破裂 ③長く尾を引く残響」。
  //   ①は duckBgm を**このゲームでいちばん深く**（0.16＝BGMを16%まで）かけて作る＝
  //   音量を上げずに「目立つ」を作る唯一の方法（周りが引くと同じ音量でも一撃が重くなる）。
  sonicBoom(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.16, 0.26, 0.46);
    // ② 破裂：極短の広帯域クラック＋鞭のような高域
    noiseHit({ dur: 0.022, gain: 0.34 * g, hpFreq: 260, lpFreq: 16000 });
    tone({ type: 'square', freq: 2600, freqEnd: 300, dur: 0.06, gain: 0.16 * g, attack: 0.0006 });
    // サブの落下（BGMのベースより下＝正面衝突しない）
    tone({ type: 'sine', freq: 96, freqEnd: 16, dur: 0.72, gain: 0.36 * g, attack: 0.001 });
    tone({ type: 'triangle', freq: 150, freqEnd: 20, dur: 0.60, gain: 0.20 * g, attack: 0.001 });
    // ③ 尾を引く残響（雷が遠ざかるときの低いゴロゴロ）。verb で濡らす＝空間が広く聞こえる
    noiseHit({ start: 0.03, dur: 0.70, gain: 0.16 * g, hpFreq: 70, lpFreq: 2600, lpEnd: 180 });
    tone({ start: 0.05, type: 'sine', freq: 210, freqEnd: 60, dur: 0.80, gain: 0.10 * g,
           attack: 0.02, verb: 0.60 });
  },

  // ============ R56 アンカーショット（ウェイブロード）専用の3段 ============
  // 実プレイFB「効果音やエフェクトも重要。マオウレクスのミサイルを参考に」。
  // ⚠️ 従来は射出に `wireCannon`（マオウレクスのワイヤーアームと共用）を鳴らしていた。
  //    あれ自体はよく出来た砲声だが **duckBgm を1つも呼んでいない**＝ボスBGMの上に
  //    そのまま重なって埋もれる（R55で3音を作り直したときと同じ敗因）。しかも共用なので
  //    深くすると最終ボスの音まで変わる。だから錨には専用の3段を作る：
  //    ⑴ 射出の砲声 ⑵ 鎖が繰り出される持続音 ⑶ 張り切る瞬間の金属衝撃。

  // ⑴ 射出：重い鉄塊を撃ち出す砲声。海の王＝低く湿った響き（verb で濡らす）。
  anchorFire(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.22, 0.16, 0.34);
    // 撃発（立ち上がりを0.5msまで詰めると「圧が抜けた」音になる）
    tone({ type: 'sine', freq: 400, freqEnd: 26, dur: 0.34, gain: 0.34 * g, attack: 0.0005 });
    tone({ type: 'triangle', freq: 200, freqEnd: 20, dur: 0.46, gain: 0.20 * g, attack: 0.0005 });
    noiseHit({ dur: 0.032, gain: 0.30 * g, hpFreq: 50, lpFreq: 16000 });
    // 鉄塊が砲口を離れる軋み（歪みバス＝鋼の重さ）
    tone({ start: 0.02, type: 'sawtooth', freq: 240, freqEnd: 90, dur: 0.26, gain: 0.14 * g,
           attack: 0.004, dest: sfxDistBus });
    // 海の反響（濡れた長い尾。これがあると「海の王の得物」に聞こえる）
    noiseHit({ start: 0.05, dur: 0.56, gain: 0.12 * g, hpFreq: 60, lpFreq: 1400, lpEnd: 260 });
    tone({ start: 0.05, type: 'sine', freq: 58, freqEnd: 24, dur: 0.58, gain: 0.16 * g,
           attack: 0.02, verb: 0.45 });
  },
  // ⑵ 飛翔中：鎖が繰り出されて鳴り続ける。sec ぶん敷き詰める（呼び出しは1回だけ）。
  //    ⚠️ ノイズバッファは0.6秒しかないので短いバーストを継ぎ足す（R54で決めた作法）。
  anchorChain(sec, vol) {
    const d = Math.max(0.2, Math.min(2.0, sec == null ? 1.1 : sec));
    const g = vol == null ? 1 : vol;
    // 鎖の環がぶつかる粒（0.045秒ごと＝約22粒/秒。粒が見えるくらい粗くする＝「鎖」に聞こえる）
    for (let t = 0; t < d; t += 0.045) {
      const p = 1 + 0.10 * Math.sin(t * 23);
      tone({ start: t, type: 'square', freq: 2600 * p, dur: 0.012, gain: 0.075 * g, attack: 0.0005 });
      noiseHit({ start: t, dur: 0.016, gain: 0.070 * g, hpFreq: 2400, lpFreq: 13000 });
    }
    // 張っていく張力（唸りが上がる＝もう戻れないところまで伸びている）
    tone({ type: 'sawtooth', freq: 74, freqEnd: 108, dur: d, gain: 0.13 * g, attack: 0.04,
           dest: sfxDistBus });
    tone({ type: 'sine', freq: 46, freqEnd: 58, dur: d, gain: 0.16 * g, attack: 0.04 });
  },
  // ⑶ 最大長で張り切る「ガキン」。錨が止まって鎖が一直線になる瞬間＝ここが一番痛そうな音。
  anchorBite(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.20, 0.10, 0.32);
    // 鋼と鋼（非整数比の倍音＝鐘のような鳴き。整数倍にすると「楽器」になって痛くない）
    tone({ type: 'sine', freq: 620, freqEnd: 604, dur: 0.40, gain: 0.26 * g, attack: 0.0008, verb: 0.35 });
    tone({ type: 'sine', freq: 1712, freqEnd: 1660, dur: 0.30, gain: 0.14 * g, attack: 0.001, verb: 0.30 });
    tone({ type: 'square', freq: 3180, freqEnd: 2900, dur: 0.07, gain: 0.09 * g, attack: 0.0005 });
    // 芯（腹に来る低域）
    tone({ type: 'sine', freq: 190, freqEnd: 20, dur: 0.46, gain: 0.32 * g, attack: 0.001 });
    noiseHit({ dur: 0.030, gain: 0.26 * g, hpFreq: 900, lpFreq: 15000 });
    noiseHit({ start: 0.02, dur: 0.34, gain: 0.11 * g, hpFreq: 120, lpFreq: 2600, lpEnd: 300 });
  },

  // ★R56 全方位攻撃の発射（うずまきバルカン＝渦の1掃射ぶん）。
  // 実プレイFB「各ボスの全方位攻撃の弾が単調かつ退屈。効果音やエフェクトを派手にかつもっと刺激的に」。
  // ⚠️ 従来は汎用 `shoot` を3発に1回鳴らすだけ＝「弾が出た」しか伝えず、**渦（回りながら広がる）**
  //    という技の性格が音に出ていなかった。ここでは「回って外へ抜けていく」を音程の上昇で作る。
  // ⚠️ 掃射2.1秒のあいだ3発に1回（＝約12回）鳴るので、1回は**短く軽く**する。
  //    duckBgm はここでは呼ばない（12回ぶんBGMが上下すると曲が波打って気持ち悪い。
  //    掃射全体のダックは vulcanRoar が1回で深くかけている＝役割を分けている）。
  swirlShot(vol, pitch) {
    const g = vol == null ? 1 : vol;
    const p = pitch == null ? 1 : pitch;
    // 外へ抜ける（音程が上がって消える＝弾が遠ざかる）
    tone({ type: 'square', freq: 340 * p, freqEnd: 1180 * p, dur: 0.075, gain: 0.13 * g, attack: 0.0008 });
    tone({ type: 'sawtooth', freq: 170 * p, freqEnd: 640 * p, dur: 0.065, gain: 0.08 * g,
           attack: 0.0008, dest: sfxDistBus });
    // 芯（撃った点）
    tone({ type: 'sine', freq: 150, freqEnd: 60, dur: 0.07, gain: 0.14 * g, attack: 0.0006 });
    noiseHit({ dur: 0.026, gain: 0.10 * g, hpFreq: 1600, lpFreq: 11000 });
  },

  // ★R56 全方位の壁が広がっているあいだの持続音（つなみウェーブの「間」）。
  // 緊張感は被弾量ではなく**避けた回数**で作る。壁が来ているあいだ低く鳴り続けることで
  // 「まだ抜けていない」が耳に残り、抜け道を探して走る時間そのものが緊張になる。
  waveApproach(sec, vol) {
    const d = Math.max(0.2, Math.min(2.0, sec == null ? 0.9 : sec));
    const g = vol == null ? 1 : vol;
    // 低い唸りが少しずつ上がる（近づいてくる）。⚠️ ダックはしない（波1枚ごとの waveCrash が
    //   深くかけているので、こちらも下げると曲が消えたままになる）。
    tone({ type: 'sawtooth', freq: 52, freqEnd: 74, dur: d, gain: 0.11 * g, attack: 0.06,
           dest: sfxDistBus });
    tone({ type: 'sine', freq: 34, freqEnd: 46, dur: d, gain: 0.15 * g, attack: 0.06 });
    // 水が迫る帯（0.6秒のノイズバッファを継ぎ足す）
    for (let t = 0; t < d; t += 0.3) {
      noiseHit({ start: t, dur: 0.34, gain: 0.055 * g, hpFreq: 260, lpFreq: 1500 });
    }
  },

  // ============ R56 ミニロボ噴出（ミサイルガ）の2段 ============
  // 実プレイFB「もっと大量に噴射する感じで。アリの巣を壊したら大量にアリがわいてくるあの感じ」。
  // ⚠️ 30体ぶん1体ずつ音を鳴らすと轟音になって1体も聞こえない。だから
  //    「ハッチが開く一撃」＋「湧いているあいだのざわめき1本」の2つに分ける。

  // ⑴ ハッチが開く：金属の扉が跳ね上がって内圧が抜ける。
  roboHatch(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.24, 0.14, 0.32);
    // 掛け金が外れる（硬い一撃）
    tone({ type: 'square', freq: 880, freqEnd: 300, dur: 0.05, gain: 0.20 * g, attack: 0.0006 });
    noiseHit({ dur: 0.035, gain: 0.26 * g, hpFreq: 700, lpFreq: 14000 });
    // 扉が開ききって当たる「ガコン」
    tone({ start: 0.05, type: 'sine', freq: 220, freqEnd: 40, dur: 0.30, gain: 0.30 * g, attack: 0.001 });
    tone({ start: 0.05, type: 'triangle', freq: 108, freqEnd: 26, dur: 0.26, gain: 0.16 * g, attack: 0.001 });
    // 内圧が抜ける噴射（帯域が下へ落ちる＝中から出てくる）
    noiseHit({ start: 0.04, dur: 0.44, gain: 0.17 * g, hpFreq: 900, lpFreq: 12000, lpEnd: 900 });
  },
  // ⑵ 湧いているあいだのざわめき。sec ぶん鳴らし切る（呼び出しは攻撃1回につき1度だけ）。
  //   「たくさんの小さいものが動いている」＝**高い短いパルスを不規則に密に**置く。
  //   ⚠️ 規則的に並べると機械の駆動音（バルカン）になってしまうので、間隔と音程を揺らす。
  roboSwarm(sec, vol) {
    const d = Math.max(0.2, Math.min(3.0, sec == null ? 1.5 : sec));
    const g = vol == null ? 1 : vol;
    duckBgm(0.34, d * 0.7, 0.30);
    // 小さな脚音・駆動音が重なるざわめき（0.022秒おき＝約45粒/秒。1粒は極小）
    let k = 0;
    for (let t = 0; t < d; t += 0.022) {
      k++;
      const w = 1 + 0.34 * Math.sin(k * 1.7) + 0.18 * Math.sin(k * 0.61);   // 不規則な揺らぎ
      tone({ start: t, type: 'square', freq: 1500 * w, dur: 0.010, gain: 0.045 * g, attack: 0.0004 });
      if (k % 2 === 0) {
        noiseHit({ start: t, dur: 0.014, gain: 0.045 * g, hpFreq: 3000 * w, lpFreq: 15000 });
      }
    }
    // 群れの厚み（低い唸りが少し盛り上がって引く＝数が増えて散っていく）
    for (let t = 0; t < d; t += 0.26) {
      const up = t < d * 0.45;
      tone({ start: t, type: 'sawtooth', freq: up ? 62 : 78, freqEnd: up ? 78 : 58, dur: 0.32,
             gain: 0.11 * g, attack: 0.04, dest: sfxDistBus });
      tone({ start: t, type: 'sine', freq: 44, dur: 0.32, gain: 0.13 * g, attack: 0.04 });
    }
  },

  // ミサイルガ：ぜんだんはっしゃの直前に鳴る発射警報（クラクション）。
  // 2音の交代＝現実の警報と同じ形。ここだけは「音程を持つ」ので弾幕の轟音と混ざらない。
  barrageAlarm(vol) {
    const g = vol == null ? 1 : vol;
    duckBgm(0.55, 0.30, 0.26);
    for (let i = 0; i < 3; i++) {
      const t = i * 0.19;
      const f = i % 2 === 0 ? 520 : 392;
      tone({ start: t, type: 'square', freq: f, dur: 0.15, gain: 0.20 * g, attack: 0.006 });
      tone({ start: t, type: 'square', freq: f * 1.5, dur: 0.15, gain: 0.10 * g, attack: 0.006 });
      tone({ start: t, type: 'sawtooth', freq: f * 0.5, dur: 0.15, gain: 0.09 * g, attack: 0.008 });
    }
    tone({ type: 'sine', freq: 70, freqEnd: 58, dur: 0.60, gain: 0.16 * g, attack: 0.05 });
  },
  // ミサイルガ：着弾予告のあいだ落ちてくるミサイルのホイッスル。sec＝着弾までの秒数。
  // ⚠️ ピッチは**下降**（近づくのに上がるのは打ち上げ側の音）。着弾の瞬間に最低音へ着く。
  bombWhistle(sec, vol) {
    const d = Math.max(0.25, Math.min(2.0, sec == null ? 0.9 : sec));
    const g = vol == null ? 1 : vol;
    tone({ type: 'sine', freq: 1750, freqEnd: 300, dur: d, gain: 0.13 * g, attack: 0.05 });
    tone({ type: 'triangle', freq: 2620, freqEnd: 450, dur: d, gain: 0.06 * g, attack: 0.07 });
    noiseHit({ dur: d, gain: 0.045 * g, hpFreq: 2600, lpFreq: 12000, lpEnd: 2000 });
  },
  // 着弾爆発（ローリングボム／ぜんだんはっしゃ 共用）。bigBoom(0.5) の流用をやめ、
  // 腹に来る低域と長い残響を持たせる＝「足元が塗り潰される」怖さを音でも出す。
  blastHeavy(power) {
    const p = power == null ? 1 : Math.max(0.2, Math.min(1.4, power));
    tone({ type: 'sine', freq: 230, freqEnd: 18, dur: 0.58 * p, gain: 0.36 * p, attack: 0.001 });
    tone({ type: 'triangle', freq: 112, freqEnd: 16, dur: 0.52 * p, gain: 0.19 * p, attack: 0.001 });
    noiseHit({ dur: 0.045, gain: 0.24 * p, hpFreq: 180, lpFreq: 11000 });               // 炸裂
    noiseHit({ start: 0.02, dur: 0.40 * p, gain: 0.16 * p, hpFreq: 120, lpFreq: 3000, lpEnd: 320 });
    noiseHit({ start: 0.03, dur: 0.15, gain: 0.10 * p, hpFreq: 4200, lpFreq: 15000 });  // 破片
    tone({ type: 'square', freq: 760, freqEnd: 84, dur: 0.16, gain: 0.09 * p });
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

// ================= ボス戦（マオウレクスより前の5体の共通曲）=================
// コロガンナー／ジェットバイパー／ウズキング／ウェーブロード／ミサイルガが共通で使う。
// boss.js が非finalのボス出現で startBgm('boss') する。
//
// ★経緯（作り直し2回ぶん）
//   1回目(R52) : 長調ポップ（F-G-Em-Am・172BPM）→「ボス戦に聞こえない」
//   2回目(R52) : Eマイナーの重い曲（160BPM）へ作り直し →「**ダサすぎる。サザエさんの主題歌みたい。
//                 モダンでスタイリッシュな曲にして**」＝**不採用（コードごと削除した）**
//
// ★2回目の敗因は調ではなく **リズムと音色の語彙が昭和のブラスバンド／マーチだった**こと。
//   具体的に何がそう聞かせていたか（＝今回まるごと捨てたもの）:
//     ・8分キープ＋3・11の食い込みベース ……… 跳ね（スウィング）＝主題歌のノリ
//     ・裏拍に置いた和音スタブ／警報スタブ … ブラスヒット＝歌謡曲・運動会の語彙
//     ・表拍中心で起承転結する歌モノの旋律 … 「主題歌」に聞こえた直接の原因
//   1回目→2回目で変えた軸は「調性と音色」だったが、**リズムの語彙が旧来のまま**だった。
//
// ★今回変える軸は **①リズムの語彙（跳ね → ストレート）** ＝ 16分グリッドのちょうど上にしか
//   音を置かない。和音は「裏拍に刺す」のをやめる。ここは A/B どちらの案でも共通の絶対条件。
//   ⚠️テンポは今回も主差別化にしない（A=168 / B=128 は編成から決まった結果）。
//
// ★参考曲の指定（2026-09-02）「ロマンシングサガ Re;univerSe の楽曲を参考にして」。
//   ＝A案は**オーケストラルロック（伊藤賢治のバトル曲の語彙）**で作る。前回NGだったのは
//   「跳ねるノリ（スウィング／裏拍のブラス連打）」であって**旋律が歌うこと自体ではない**、
//   と解釈を修正した＝ロマサガの旋律は歌う。歌わせてよい。
//
// ★2曲つくって選んでもらう（好みは文章で議論せずゲーム内で切り替えて選ぶ・CLAUDE.mdの方針）。
//     A オーケストラルロック（本編で鳴るのはこちら）… 168BPM・16小節・ストレート16分の弦
//     B ダークシンセ（対比用）                      … 128BPM・8小節・ストレート16分のサブベース

// --- 曲2A: ボス戦 boss「オーケストラルロック」（Eハーモニックマイナー・168BPM・16小節）---
// ロマサガ系バトル曲の語彙を5つ積む:
//   ①ストレート16分の弦オスティナート（根音と5度の2音だけを刻む＝疾走の土台。跳ねない）
//   ②ハーモニックマイナーの劇的な進行 i→♭VI→♭VII→V（B7 の D# ＝導音の緊張）
//   ③ピアノの速い16分の駆け上がり（**フレーズの節目＝4小節ごとの後半だけ**。常時鳴らさない）
//   ④決めのブラス／オーケストラヒット（**16小節に4回だけ**。裏拍の連打にしない＝マーチ化の防止）
//   ⑤短調の勇壮な旋律（歌ってよい。長い音と休符で呼吸を作る）
// ★見せ場：13〜14小節目で **同主長調 E メジャー**へ跳ぶ（G# が差し込む）。
//   「決戦！サルーイン」から採譜した核＝「同じ場所に光が差す」（maouTrue のイントロで既に使った
//   作法を、こちらでは**転調の見せ場**として本編の途中に置く）。maou/maouTrue 本体は不変。
const CHORDS_BOSS = [
  { pad: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], bass: NOTE.E2, fifth: NOTE.B3 },   // 1  Em   i
  { pad: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3, fifth: NOTE.G3 },   // 2  C    ♭VI
  { pad: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.D5], bass: NOTE.D3, fifth: NOTE.A3 },  // 3  D    ♭VII
  { pad: [NOTE.B3, NOTE.Ds4, NOTE.Fs4, NOTE.A4], bass: NOTE.B2, fifth: NOTE.Fs3 }, // 4 B7   V（導音 D#）
  { pad: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], bass: NOTE.E2, fifth: NOTE.B3 },   // 5  Em
  { pad: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3, fifth: NOTE.G3 },   // 6  C
  { pad: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.D5], bass: NOTE.D3, fifth: NOTE.A3 },  // 7  D
  { pad: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], bass: NOTE.E2, fifth: NOTE.B3 },   // 8  Em   一度着地
  { pad: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2, fifth: NOTE.E3 },   // 9  Am   iv（展開）
  { pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], bass: NOTE.F2, fifth: NOTE.C3 },   // 10 F    ♭II ナポリ
  { pad: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], bass: NOTE.G2, fifth: NOTE.D3 },   // 11 G    ♭III
  { pad: [NOTE.B3, NOTE.Ds4, NOTE.Fs4, NOTE.A4], bass: NOTE.B2, fifth: NOTE.Fs3 }, // 12 B7
  { pad: [NOTE.E4, NOTE.Gs4, NOTE.B4, NOTE.E5], bass: NOTE.E2, fifth: NOTE.B3 },  // 13 E    ★同主長調へ跳ぶ
  { pad: [NOTE.E4, NOTE.Gs4, NOTE.B4, NOTE.E5], bass: NOTE.E2, fifth: NOTE.B3 },  // 14 E
  { pad: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3, fifth: NOTE.G3 },   // 15 C    影へ戻る
  { pad: [NOTE.B3, NOTE.Ds4, NOTE.Fs4, NOTE.A4], bass: NOTE.B2, fifth: NOTE.Fs3 }, // 16 B7  → 振り出しへ
];
// 勇壮な主題（16分解像度・-1＝休符）。1小節4〜6音。音の長さは**次の音までの間隔から自動で伸ばす**
// ので、[X,-1,-1,-1,-1,-1,-1,-1] と書けば2分音符相当まで伸びる＝長い音と休符で歌になる。
const MELODY_BOSS = [
  // 呼びかけ（1〜4小節）：B→E の跳躍で名乗り、B7 の導音 D#6 で宙づりにする
  [NOTE.B5, -1, NOTE.B5, -1, NOTE.E6, -1, -1, -1, -1, -1, -1, -1, NOTE.D6, -1, -1, -1],
  [NOTE.C6, -1, -1, -1, NOTE.B5, -1, -1, -1, NOTE.G5, -1, NOTE.A5, -1, NOTE.B5, -1, -1, -1],
  [NOTE.A5, -1, -1, -1, NOTE.D6, -1, -1, -1, NOTE.C6, -1, NOTE.B5, -1, NOTE.A5, -1, -1, -1],
  [NOTE.Fs5, -1, -1, -1, NOTE.B5, -1, -1, -1, NOTE.Ds6, -1, -1, -1, -1, -1, -1, -1],
  // 応え（5〜8小節）：同じ形を一段上へ。最高音 G6 を通って Em へ着地する
  [NOTE.B5, -1, NOTE.B5, -1, NOTE.E6, -1, -1, -1, -1, -1, -1, -1, NOTE.G6, -1, -1, -1],
  [NOTE.E6, -1, -1, -1, NOTE.D6, -1, -1, -1, NOTE.C6, -1, NOTE.B5, -1, NOTE.C6, -1, -1, -1],
  [NOTE.D6, -1, -1, -1, NOTE.A5, -1, -1, -1, NOTE.Fs5, -1, NOTE.A5, -1, NOTE.D6, -1, -1, -1],
  [NOTE.E6, -1, -1, -1, -1, -1, -1, -1, NOTE.B5, -1, -1, -1, NOTE.E6, -1, -1, -1],
  // 展開（9〜12小節）：iv → ナポリ → ♭III → V。F6 から降りて B7 の導音へ登り直す
  [NOTE.A5, -1, NOTE.C6, -1, NOTE.E6, -1, -1, -1, NOTE.C6, -1, -1, -1, NOTE.A5, -1, -1, -1],
  [NOTE.F6, -1, -1, -1, NOTE.E6, -1, -1, -1, NOTE.C6, -1, -1, -1, NOTE.A5, -1, -1, -1],
  [NOTE.G5, -1, NOTE.B5, -1, NOTE.D6, -1, -1, -1, NOTE.G6, -1, -1, -1, -1, -1, -1, -1],
  [NOTE.Ds6, -1, -1, -1, NOTE.Fs5, -1, NOTE.A5, -1, NOTE.B5, -1, NOTE.Ds6, -1, -1, -1, -1, -1],
  // 見せ場（13〜16小節）：同主長調 E の G#5 が差し込む → C へ戻り → B7 で振り出しへ
  [NOTE.E6, -1, -1, -1, NOTE.Gs5, -1, NOTE.B5, -1, NOTE.E6, -1, -1, -1, -1, -1, -1, -1],
  [NOTE.B5, -1, -1, -1, NOTE.Gs5, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, -1, -1],
  [NOTE.C6, -1, -1, -1, NOTE.B5, -1, -1, -1, NOTE.A5, -1, NOTE.G5, -1, NOTE.A5, -1, NOTE.B5, -1],
  [NOTE.B5, -1, -1, -1, NOTE.Ds6, -1, -1, -1, NOTE.B5, -1, NOTE.A5, -1, NOTE.Fs5, -1, -1, -1],
];

// --- 曲2B: ボス戦 bossSynth「ダークシンセ」（Eマイナー・128BPM・8小節・対比用）---
// A とは正反対の作り方で「モダン」を出す案。和音は2小節にひとつだけ動き（クラブ系は和音を
// 動かさない＝場が続く）、上物は2〜3音の音形をそのまま反復する（歌わせない）。
//   Em - C - Am - F（i - ♭VI - iv - ♭II）。最後の F は半音下がって Em へ戻る＝解決しない循環。
const CHORDS_BSYN = [
  { pad: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], bass: NOTE.E2 },  // Em
  { pad: [NOTE.E4, NOTE.G4, NOTE.B4, NOTE.E5], bass: NOTE.E2 },
  { pad: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 },  // C  ♭VI
  { pad: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], bass: NOTE.C3 },
  { pad: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 },  // Am iv
  { pad: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], bass: NOTE.A2 },
  { pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], bass: NOTE.F2 },  // F  ♭II（半音上から Em へ落ちる）
  { pad: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], bass: NOTE.F2 },
];
// 氷のリフ。1小節3音だけを 0・6・12 の位置に置き、**同じ形を次の小節でもそのまま繰り返す**。
// 音を足したくなったら、代わりに残響（verb）で埋める＝この案の上物は音数ではなく空間で作る。
const MELODY_BSYN = [
  [NOTE.B5, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.D6, -1, -1, -1],  // Em
  [NOTE.B5, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.D6, -1, -1, -1],  // 反復（同じ形が返る＝リフ）
  [NOTE.C6, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.D6, -1, -1, -1],  // C（D6＝9th の冷たさ）
  [NOTE.C6, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.D6, -1, -1, -1],
  [NOTE.A5, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.C6, -1, -1, -1],  // Am
  [NOTE.A5, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1, -1, -1, NOTE.C6, -1, -1, -1],
  [NOTE.C6, -1, -1, -1, -1, -1, NOTE.F6, -1, -1, -1, -1, -1, NOTE.E6, -1, -1, -1],  // F（E6＝maj7 の氷）
  [NOTE.C6, -1, -1, -1, -1, -1, NOTE.F6, -1, -1, -1, -1, -1, NOTE.B5, -1, -1, -1],  // 最後だけ B5＝F から見た増4度
];

// --- 曲4: 最終ボス maou（84BPM・8小節・Am-F-C-G / Am-F-E-A／荘厳＋光）---
// 実プレイFB①「マオウレクス戦は荘厳に」→ 172→76BPM、跳ねを消して全音符/2分音符主体、
//   終止を E メジャー（G# を含むハーモニックマイナーのドミナント）に。声部＝パイプオルガンの
//   持続和音／斉唱パッド／ティンパニ／教会の鐘。ドラムのビートは置かない（四つ打ちを入れた瞬間ポップに戻る）。
// 実プレイFB②（R31）「荘厳さはあったが、暗すぎる。いまの荘厳さ＋もう少し明るさをだして」。
//   暗さの原因は3つあり、**荘厳さの材料には一切手を付けずに**その3つだけを直す:
//     (1) 和音が全部マイナー（Am-F-G-E）で長三和音が1つも無かった
//         → 4小節→8小節に伸ばし、3小節目に **C（長調の主和音）**、8小節目に **A メジャー**を置く。
//            短調の曲を最後だけ長三和音で閉じるのは**ピカルディ終止**というバロック教会音楽の定石で、
//            厳かさを崩さずに光だけを入れられる（＝「荘厳さ＋明るさ」の教科書的な解）。
//     (2) 主題がオクターブ**下**しか重なっておらず、輝く高域が無かった → オクターブ上を足す
//     (3) 鐘（唯一の明るい声部）が2小節に1回しか鳴っていなかった → 毎小節にする
//   テンポも 76→84BPM。沈み込みを減らすが、まだ battle(150)/boss(172) の半分以下＝重さは保つ。
// 実プレイFB③（R34）「マオウレクスの音楽が変わってない。元の荘厳さ＋明るさを足した勇ましい曲を
//   依頼したはずだが」。実測すると R31 の明るさは**確かに入っていたが、一度も鳴っていなかった**：
//   ピカルディ終止は8小節目＝20.0秒の位置にあるのに、戦闘の実測が 12.8〜17.6秒だったため。
//   直し方は3つ:
//     (1) 戦闘そのものを伸ばす（boss側・HP 24000→90000）＝1周が最後まで鳴るようにする
//     (2) **光を曲の頭へ移す**。1小節目を F(短調寄り) から C(長三和音) へ入れ替え、
//         長三和音が 5.7秒→**2.5秒**で来るようにした（第一印象が短調一色だった）
//     (3) 「勇ましさ」の声部を新設する。荘厳さの材料（オルガン・鐘・低音・和声）には触らず、
//         **ファンファーレ（付点の三連ブラス）と行進のティンパニ／スネア**だけを足す。
//         勇ましさ＝前へ進む推進力なので、和音を明るくするのではなくリズムで作るのが定石。
//   テンポも 84→96BPM（ゆっくりした行進の速さ。battle 150 / boss 172 とはなお別世界）。
// --- 曲: 最終ボス maou（★R35 で作曲からやり直し・Cマイナー・16小節）---
// 実プレイFB「曲はどれも違う。つくりなおして」。R34（勇ましい行進）→R34W3（サルーイン参考・160）
// →R34W4（184/208/168 の3編曲）と3回作り直して3回とも不採用。
//
// ★3回の失敗から絞り込めたこと（＝今回の設計の根拠）
//   ・テンポは軸ではない。168/184/208 を並べて聞いてもらって**3つとも「違う」**だった。
//   ・和声も軸ではなかった。32個の和音・七の連鎖・転調まで入れて、それでも届かなかった。
//   → 残っているのは **①旋律 ②音色** の2つ。そしてどちらも、これまで本気で触っていなかった。
//
// ★①旋律：「アップテンポで迫力」に対して**音符を2倍（99.6音符/秒）に増やしたのが逆効果だった**。
//   8分音符で全部の枡を埋めると、それは旋律ではなく**分散和音の壁**になる。参考曲が耳に残るのは
//   音が多いからではなく、**長い音と休符があって歌えるから**。今回は音符の長さを可変にして
//   （H＝タイで伸ばす）、1小節3〜5音まで減らし、2小節の呼びかけ＋2小節の応えで組み直した。
//   伴奏（16分ベース＋ツーバス）は残すので疾走感は落ちない。
//
// ★②音色：歪みが**本物ではなかった**。旧実装は「sawtooth を3枚デチューン＋3倍音・5倍音を足す」で
//   近似していたが、足し算では入力の大きさで倍音比が変わらない＝歪んで聞こえない。今回 WaveShaper
//   による波形クリップ（distBus）と、フィードバック・ディレイの残響（verbBus）を土台に入れた。
//   「荘厳」は残響が作る。今までBGMは全声部が完全にドライで、音が床に落ちていた。
//
// ★調査（出典は docs/r34w4_maou_bgm_rebuild2.md）
//   「神曲」と呼ばれるのは主に **四魔貴族バトル2（ロマサガ3）** と **七英雄バトル（ロマサガ2）**。
//   四魔貴族バトル2 は公式に **高速ロック／劇的な転調／ツーバス＋ディストーションギター** と
//   語られている（作曲者本人が「初めてエレキギターを使った曲」と述べている）。
//   四魔貴族バトル1 の採譜から読み取れた作法5つのうち、R34W4 では3つしか使えていなかった。
//   **今回で5つ全部を使い切っている**：
//     ・1小節に2つの和音（＝CHORDS_MAOU が32要素）        … R34W4 で導入済み
//     ・セブンスの連鎖（Cm7 Bb7 Eb7 C7♭9 Fm7 Ab7 D7 G7）  … R34W4 で導入済み
//     ・4度上行の連鎖（Ab7 → D7 → G7）                    … R34W4 で導入済み
//     ・**ディミニッシュのパッシング（F#dim7）**           … ★R35 で追加
//     ・**転回形でベースが半音で動く（G7(onB) → Cm）**     … ★R35 で追加
//   ⚠️ 借りたのは**作法**であって旋律ではない。主題はこの曲のために書いている。
const CHORDS_MAOU = [
  { arp: [NOTE.C4, NOTE.Ds4, NOTE.G4, NOTE.As4], pad: [NOTE.C3, NOTE.G3, NOTE.As3], bass: NOTE.C3 },    // Cm7
  { arp: [NOTE.C4, NOTE.Ds4, NOTE.G4, NOTE.As4], pad: [NOTE.C3, NOTE.G3, NOTE.As3], bass: NOTE.C3 },    // Cm7
  { arp: [NOTE.As3, NOTE.D4, NOTE.F4, NOTE.Gs4], pad: [NOTE.As2, NOTE.F3, NOTE.D4], bass: NOTE.As2 },    // Bb7
  { arp: [NOTE.As3, NOTE.D4, NOTE.F4, NOTE.Gs4], pad: [NOTE.As2, NOTE.F3, NOTE.D4], bass: NOTE.As2 },    // Bb7
  { arp: [NOTE.Ds4, NOTE.G4, NOTE.As4, NOTE.Cs5], pad: [NOTE.Ds3, NOTE.As3, NOTE.G4], bass: NOTE.Ds3 },   // Eb7
  { arp: [NOTE.C4, NOTE.E4, NOTE.As4, NOTE.Cs5], pad: [NOTE.C3, NOTE.G3, NOTE.E4], bass: NOTE.C3 },     // C7(b9) 濃い緊張
  { arp: [NOTE.F3, NOTE.Gs3, NOTE.C4, NOTE.Ds4], pad: [NOTE.F2, NOTE.C3, NOTE.Gs3], bass: NOTE.F2 },    // Fm7
  { arp: [NOTE.F3, NOTE.Gs3, NOTE.C4, NOTE.Ds4], pad: [NOTE.F2, NOTE.C3, NOTE.Gs3], bass: NOTE.F2 },    // Fm7
  { arp: [NOTE.As3, NOTE.D4, NOTE.F4, NOTE.Gs4], pad: [NOTE.As2, NOTE.F3, NOTE.D4], bass: NOTE.As2 },    // Bb7
  { arp: [NOTE.C4, NOTE.Ds4, NOTE.G4, NOTE.As4], pad: [NOTE.C3, NOTE.G3, NOTE.As3], bass: NOTE.C3 },    // Cm7
  { arp: [NOTE.As3, NOTE.D4, NOTE.F4, NOTE.Gs4], pad: [NOTE.As2, NOTE.F3, NOTE.D4], bass: NOTE.As2 },    // Bb7
  { arp: [NOTE.Ds4, NOTE.G4, NOTE.As4, NOTE.Cs5], pad: [NOTE.Ds3, NOTE.As3, NOTE.G4], bass: NOTE.Ds3 },   // Eb7
  { arp: [NOTE.Gs3, NOTE.C4, NOTE.Ds4, NOTE.Fs4], pad: [NOTE.Gs2, NOTE.Ds3, NOTE.C4], bass: NOTE.Gs2 },   // Ab7
  { arp: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.C5], pad: [NOTE.D3, NOTE.A3, NOTE.Fs4], bass: NOTE.D3 },    // D7 ドッペルドミナント
  { arp: [NOTE.Fs3, NOTE.A3, NOTE.C4, NOTE.Ds4], pad: [NOTE.Fs2, NOTE.C3, NOTE.A3], bass: NOTE.Fs2 },    // F#dim7 ★ディミニッシュのパッシング（G7の導音上に置く）
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.F4], pad: [NOTE.G2, NOTE.D3, NOTE.B3], bass: NOTE.G2 },     // G7
  { arp: [NOTE.C4, NOTE.Ds4, NOTE.G4, NOTE.C5], pad: [NOTE.C3, NOTE.G3, NOTE.C4], bass: NOTE.C3 },     // Cm
  { arp: [NOTE.D4, NOTE.Fs4, NOTE.A4, NOTE.C5], pad: [NOTE.D3, NOTE.A3, NOTE.Fs4], bass: NOTE.D3 },    // D7
  { arp: [NOTE.G3, NOTE.As3, NOTE.D4, NOTE.G4], pad: [NOTE.G2, NOTE.D3, NOTE.As3], bass: NOTE.G2 },    // Gm
  { arp: [NOTE.Ds4, NOTE.G4, NOTE.As4, NOTE.Ds5], pad: [NOTE.Ds3, NOTE.As3, NOTE.G4], bass: NOTE.Ds3 },   // Eb
  { arp: [NOTE.Gs3, NOTE.C4, NOTE.Ds4, NOTE.Gs4], pad: [NOTE.Gs2, NOTE.Ds3, NOTE.C4], bass: NOTE.Gs2 },   // Ab
  { arp: [NOTE.B3, NOTE.D4, NOTE.F4, NOTE.G4], pad: [NOTE.B2, NOTE.F3, NOTE.D4], bass: NOTE.B2 },     // G7(onB) ★転回形でベースが半音で動く（B→C）
  { arp: [NOTE.C4, NOTE.Ds4, NOTE.G4, NOTE.C5], pad: [NOTE.C3, NOTE.G3, NOTE.C4], bass: NOTE.C3 },     // Cm
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.F4], pad: [NOTE.G2, NOTE.D3, NOTE.B3], bass: NOTE.G2 },     // G7
  { arp: [NOTE.Cs4, NOTE.E4, NOTE.Gs4, NOTE.Cs5], pad: [NOTE.Cs3, NOTE.Gs3, NOTE.Cs4], bass: NOTE.Cs3 },  // C#m ★半音上へ転調
  { arp: [NOTE.Ds4, NOTE.G4, NOTE.As4, NOTE.Cs5], pad: [NOTE.Ds3, NOTE.As3, NOTE.G4], bass: NOTE.Ds3 },   // D#7
  { arp: [NOTE.Gs3, NOTE.B3, NOTE.Ds4, NOTE.Gs4], pad: [NOTE.Gs2, NOTE.Ds3, NOTE.B3], bass: NOTE.Gs2 },   // G#m
  { arp: [NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.E4], pad: [NOTE.E2, NOTE.B2, NOTE.Gs3], bass: NOTE.E2 },    // E
  { arp: [NOTE.A3, NOTE.Cs4, NOTE.E4, NOTE.A4], pad: [NOTE.A2, NOTE.E3, NOTE.Cs4], bass: NOTE.A2 },    // A
  { arp: [NOTE.Gs3, NOTE.C4, NOTE.Ds4, NOTE.Fs4], pad: [NOTE.Gs2, NOTE.Ds3, NOTE.C4], bass: NOTE.Gs2 },   // G#7 半音上のドミナント
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.F4], pad: [NOTE.G2, NOTE.D3, NOTE.B3], bass: NOTE.G2 },     // G7 半音すべり落ちて元調へ
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.F4], pad: [NOTE.G2, NOTE.D3, NOTE.B3], bass: NOTE.G2 },     // G7
];
// H＝タイ（前の音をそのまま伸ばす）。-1＝休符。1枡＝8分音符。
// ★R35 の最大の変更点。旧実装は全部の音が同じ長さ（1.9枡）で鳴っていて、
//   「長い音」と「休符」が一つも無かった＝歌にならない構造だった。
const H = -99;
const MELODY_MAOU = [
  [NOTE.G4, NOTE.G4, NOTE.C5, H, NOTE.Ds5, H, H, H],             // 段1 名乗り：ソソド〜ミ♭〜
  [NOTE.D5, H, NOTE.C5, H, NOTE.As4, H, H, H],                   // レ〜ド〜シ♭〜
  [NOTE.C5, NOTE.C5, NOTE.Ds5, H, NOTE.G5, H, H, H],             // 同じ動機を一段上げて繰り返す
  [NOTE.F5, H, NOTE.Ds5, NOTE.D5, NOTE.C5, H, H, H],             // 降りてきて着地
  [NOTE.G4, NOTE.G4, NOTE.C5, H, NOTE.Ds5, H, NOTE.G5, H],       // 段2 応え：同じ形＋さらに上へ
  [NOTE.F5, H, NOTE.Ds5, H, NOTE.Cs5, H, H, H],                  // Db＝Eb7の第7音で色を付ける
  [NOTE.C5, NOTE.Ds5, NOTE.G5, H, NOTE.Fs5, H, NOTE.D5, H],      // D7 の F# で異国の緊張
  [NOTE.A5, NOTE.G5, NOTE.Ds5, H, NOTE.D5, H, NOTE.B4, NOTE.D5], // F#dim7 の上を駆け下りて G7 へ
  [NOTE.G5, H, H, NOTE.Ds5, NOTE.Fs5, H, H, H],                  // 段3 主題：いちばん歌えるところ
  [NOTE.D5, H, NOTE.G5, H, NOTE.As4, H, H, H],
  [NOTE.C5, H, NOTE.Ds5, NOTE.F5, NOTE.G5, H, H, H],
  [NOTE.Ds5, NOTE.D5, NOTE.C5, H, H, H, NOTE.D5, NOTE.Ds5],      // 一度置いて、最後の2音で頂点へ助走
  [NOTE.Gs5, H, H, NOTE.Fs5, NOTE.As5, H, H, H],                 // 段4 頂点：主題が半音上で鳴る
  [NOTE.Ds5, H, NOTE.Gs5, H, NOTE.B5, H, H, H],
  [NOTE.Cs6, H, NOTE.B5, NOTE.A5, NOTE.Gs5, H, H, H],            // ★最高音 C#6
  [NOTE.G5, NOTE.F5, NOTE.Ds5, NOTE.D5, NOTE.C5, H, NOTE.D5, NOTE.F5], // 元調へ駆け下り、そのまま振り出しへ
];

// ★R39 軌道神核だけの第2旋律「神核の主題」（オルガンの独立声部）。
//   実プレイFB「オルガンをもう少し目立たせて」＋「軌道神核のBGM自体の個性を」。
//   R38 までの maouTrue は**旋律も和音もマオウレクスと同一**で、違いはミックス（音量比）と
//   イントロだけだった＝「個性」の材料が編曲にしか無かった。個性は旋律で出す（R35 の教訓：
//   軸は旋律と音色）。ただし土台（和音・ベース・ドラム・ギターの主題）は全部残す＝
//   「マオウレクスの流れを汲む」はこの土台が保証する。
//   構造は4段の**対話**：
//     段1: オルガン沈黙（ギターがマオウレクスの主題を名乗る＝同じ戦いの証を先に立てる）
//     段2: 光の接近（全音符の上行。速い戦場の上を、テンポと無関係な歩幅でゆっくり歩く——
//          「神は急がない」。周りが16分で疾走しているほど長い音は神々しく聞こえる）
//     段3: 神核の主題（ここだけの旋律。ギターは伴奏へ退き、オルガンが主役に立つ）
//     段4: 対位法の頂点（半音上がったギターの主題の上に、長い光の音が架かる）
const MELODY_TRUE = [
  [-1, -1, -1, -1, -1, -1, -1, -1],                              // 段1 沈黙
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [NOTE.D5, H, H, H, H, H, H, H],                                // 段2 光の接近：D（Bb7の3度→Cm7の9度）
  [NOTE.Ds5, H, H, H, H, H, H, H],                               // Eb へ半音（聖歌の係留）
  [NOTE.C5, H, H, H, NOTE.D5, H, H, H],                          // 一度沈んでまた昇る
  [NOTE.Ds5, H, H, H, NOTE.D5, H, H, H],                         // G7 の5度へ寄せて主題への扉を開く
  [NOTE.G5, H, H, H, NOTE.A5, H, H, H],                          // 段3 神核の主題：ソ→ラ（昇る）
  [NOTE.As5, H, H, H, NOTE.G5, H, H, H],                         // シ♭で頂点→ソへ置く
  [NOTE.C6, H, H, H, NOTE.B5, H, H, H],                          // ド（Abの3度）→シ＝半音の解決（G7(onB)）
  [NOTE.C6, H, H, H, NOTE.G5, H, NOTE.F5, H],                    // ドに着地して降り、G7の7度で次段へ
  [NOTE.Gs5, H, H, H, H, H, H, H],                               // 段4 長い光：C#m の5度
  [NOTE.B5, H, H, H, H, H, H, H],                                // G#m の3度（Eの5度と兼帯）
  [NOTE.Cs6, H, H, H, NOTE.C6, H, H, H],                         // ★最高音 C#6 → 半音で滑り G#7 の3度へ
  [NOTE.B5, H, NOTE.G5, H, -1, -1, -1, -1],                      // G7 の上で閉じ、末尾は休符＝フィルインに場所を譲る
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

// --- 曲5: エンディング ending（112BPM・8小節・C-G-Am-F / C-F-G-C／凱歌）---
// リザルト曲(result)は「終わったね」のバラードなので、勝利の行進には軽すぎる。
// ここは**明るいまま重く**する：ブラス風の主旋律＋行進のスネア＋祝祭のベル。最後の小節で C へ帰る。
const CHORDS_END = [
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], pad: [NOTE.C3, NOTE.G3, NOTE.C4], bass: NOTE.C3 }, // C
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], pad: [NOTE.G2, NOTE.D3, NOTE.G3], bass: NOTE.G2 }, // G
  { arp: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4], pad: [NOTE.A2, NOTE.E3, NOTE.A3], bass: NOTE.A2 }, // Am
  { arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], pad: [NOTE.F2, NOTE.C3, NOTE.F3], bass: NOTE.F2 }, // F
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], pad: [NOTE.C3, NOTE.G3, NOTE.C4], bass: NOTE.C3 }, // C
  { arp: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4], pad: [NOTE.F2, NOTE.C3, NOTE.F3], bass: NOTE.F2 }, // F
  { arp: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4], pad: [NOTE.G2, NOTE.D3, NOTE.G3], bass: NOTE.G2 }, // G
  { arp: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5], pad: [NOTE.C3, NOTE.G3, NOTE.C4], bass: NOTE.C3 }, // C
];
// 8分解像度（1小節=8音）の凱歌の主題。跳ね上がって降りてくる、歌える形にする。
const MELODY_END = [
  [NOTE.G4, -1, NOTE.C5, -1, NOTE.E5, -1, NOTE.G5, -1],
  [NOTE.D5, -1, NOTE.B4, -1, NOTE.D5, -1, -1, -1],
  [NOTE.C5, -1, NOTE.E5, -1, NOTE.A5, -1, NOTE.G5, -1],
  [NOTE.F5, -1, NOTE.E5, -1, NOTE.C5, -1, -1, -1],
  [NOTE.E5, -1, NOTE.G5, -1, NOTE.C6, -1, -1, NOTE.B5],
  [NOTE.A5, -1, NOTE.C6, -1, NOTE.A5, -1, NOTE.F5, -1],
  [NOTE.G5, -1, NOTE.B5, -1, NOTE.D6, -1, NOTE.B5, -1],
  [NOTE.C6, -1, -1, NOTE.G5, NOTE.E5, -1, NOTE.C5, -1],
];

// 曲テーブル。style で声部・ドラムパターンを分岐する。
const SONGS = {
  battle: { bpm: 150, bars: 8, chords: CHORDS,        melody: MELODY,        style: 'battle' },
  // ★R52W2 ボス共通曲は2案つくって、れんしゅうじょう④のBキーで選んでもらう（⑤＝A／⑥＝B）。
  //   本編のボス戦で鳴るのは A（'boss'）。B が選ばれたら SONGS の中身を入れ替えるだけで済む。
  // ★2026-09-02 聞き比べで決着：**⑤オーケストラルロックを本番に採用**。
  //   ⑥ダークシンセは「かなりいい曲」の評価つきで**保存の指示**＝削除しない
  //   （将来の転用候補：別ボス・別モード・Godot版。Bキー⑥でいつでも聴ける）。
  boss:      { bpm: 168, bars: 16, chords: CHORDS_BOSS, melody: MELODY_BOSS, style: 'boss',
               label: '⑤ ボス（オーケストラルロック）' },
  bossSynth: { bpm: 128, bars: 8, chords: CHORDS_BSYN, melody: MELODY_BSYN, style: 'bossSynth',
               label: '⑥ ボス（ダークシンセ）' },
  // ★R35: 好みの判定は文章で議論せず**ゲーム内で切り替えて選んでもらう**（CLAUDE.md の方針）。
  // R34W4 は「テンポとドラムの重さ」だけを変えた3つを並べて、3つとも「違う」と言われた。
  // ＝**テンポは軸ではなかった**。今回は同じ作曲（和音・主題）を、**まったく別の編成**で鳴らす。
  // どれが選ばれるかで「音色が軸だったのか」が分かる（＝聞き比べを実験として設計している）。
  maou:      { bpm: 178, bars: 16, chords: CHORDS_MAOU, melody: MELODY_MAOU, style: 'maou',
               variant: 'guitar', label: '① ギター（ひずみ）' },
  maouOrch:  { bpm: 168, bars: 16, chords: CHORDS_MAOU, melody: MELODY_MAOU, style: 'maou',
               variant: 'orch',   label: '② オーケストラ' },
  maouSynth: { bpm: 190, bars: 16, chords: CHORDS_MAOU, melody: MELODY_MAOU, style: 'maou',
               variant: 'synth',  label: '③ シンセ（しっそう）' },
  // ★R36W2 軌道神核（第4形態）の専用曲。実プレイFB「マオウレクスのBGMを基にしてよい。それに
  //   神々しさのアレンジを加えて」＋「BGMはギターでいこう」（聞き比べの決着）。
  //   ＝**採用されたギター編成を土台のまま**、神々しさの声部を上へ積む（変えるのではなく足す）。
  // ★R38 実プレイFB「マオウレクスのBGMとの違いをほぼ感じれない。もっと神々しさをはっきり
  //   わかる形に。参考は決戦！サルーイン」。原因は数値で明らか：追加した神々しさ声部の gain は
  //   0.012〜0.032 で、土台（ベース0.088・ギターの壁0.070×3枚・リード0.105×3枚）の
  //   **1/3〜1/10＝歪みの海にマスクされて届いていなかった**。直しは2本柱：
  //   ①専用イントロ「降臨」（introSec）＝決戦！サルーインの構造（荘厳な導入→一転して疾走）を
  //     借りる。テンポの無いパイプオルガンの Cm 全和音→**同主長調 C への跳躍**（R34W3 で
  //     採譜した同曲の核「同じ場所に光が差す」）→ティンパニロール→疾走へ。
  //     **曲の0秒目で別の曲だと分かる**＝「はっきりわかる」の最短経路。
  //   ②本体は**主役交代**＝神々しさ声部（オルガン・聖歌隊・天使の声・鐘・ドローン・カリヨン）を
  //     約2倍へ、ギターの壁とリードを約3割下げる。ベースとドラムは据え置き＝「同じ戦い」の証。
  // ★R39 実プレイFB「オルガンをもう少し目立たせて」＋「軌道神核のBGM自体の個性をもっと。
  //   マオウレクスの流れを汲みながら最終決戦だとはっきりわからせる曲に」。
  //   R38 までの違いはミックス（音量比）とイントロだけ＝個性の材料が編曲にしか無かった。
  //   今回は**旋律**で個性を出す：melody2（MELODY_TRUE＝神核の主題）をオルガンの独立声部として
  //   重ね、段3ではギターが伴奏へ退いて主役交代が「曲の中で」起きる。和音・ベース・ドラム・
  //   ギターの主題は全部残す＝「流れを汲む」はこの土台が保証する。
  maouTrue:  { bpm: 178, bars: 16, chords: CHORDS_MAOU, melody: MELODY_MAOU, melody2: MELODY_TRUE,
               style: 'maou', variant: 'true', introSec: 5.4, label: '④ きどうしんかく（かみ）' },
  ending: { bpm: 112, bars: 8, chords: CHORDS_END,    melody: MELODY_END,    style: 'ending' },
  result: { bpm: 96,  bars: 4, chords: CHORDS_RESULT, melody: MELODY_RESULT, style: 'result' },
};
let currentSong = SONGS.battle;   // 現在再生中の曲定義

// ★R38 軌道神核イントロ「降臨」（introSec ぶん・切替時に1回だけ）。
//   決戦！サルーインの構造＝**荘厳な導入から一転して疾走**を借りる。
//   0.0秒: 大鐘＋テンポの無いパイプオルガンの Cm 全和音（空気が満ちる attack 0.22）
//   2.7秒: **同主長調 C への跳躍**（R34W3 で採譜した同曲の核。Eb が E へ半音上がるだけで
//          「同じ場所に光が差す」）＋聖歌隊＋光の一点 E6＋カリヨン下行
//   4.5秒: ティンパニロールのクレッシェンド → 疾走本体へ雪崩れ込む
//   ドラムもギターも無し＝**曲の0秒目で別の曲だと分かる**。
function playMaouTrueIntro() {
  // 大鐘：降臨の合図（1.5倍・2.67倍の倍音で教会の鐘の非整数倍音に寄せる）
  const bell = noteFreq(NOTE.C5);
  tone({ type: 'sine', freq: bell, dur: 3.4, gain: 0.085, attack: 0.004, verb: 0.65, dest: bgmGain });
  tone({ type: 'sine', freq: bell * 1.5, dur: 2.8, gain: 0.036, attack: 0.006, verb: 0.60, dest: bgmGain });
  tone({ type: 'sine', freq: bell * 2.67, dur: 2.0, gain: 0.020, attack: 0.008, verb: 0.55, dest: bgmGain });
  // パイプオルガン Cm＋16フィートの唸り
  [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.Ds4, NOTE.G4].forEach((n, i) => {
    const f = noteFreq(n);
    tone({ type: 'sawtooth', freq: f, dur: 2.75, gain: 0.062 - i * 0.006,
           attack: 0.22, verb: 0.50, dest: bgmGain });
    tone({ type: 'square', freq: f * 2, dur: 2.70, gain: 0.020,
           attack: 0.28, verb: 0.45, dest: bgmGain });
  });
  tone({ type: 'sine', freq: noteFreq(NOTE.C2), dur: 2.8, gain: 0.13, attack: 0.15, dest: bgmGain });
  // 2.7秒: 同主長調 C（長三和音）＝光が差す
  [NOTE.C3, NOTE.G3, NOTE.C4, NOTE.E4, NOTE.G4].forEach((n, i) => {
    const f = noteFreq(n);
    tone({ start: 2.7, type: 'sawtooth', freq: f, dur: 2.55, gain: 0.068 - i * 0.006,
           attack: 0.16, verb: 0.50, dest: bgmGain });
    tone({ start: 2.7, type: 'square', freq: f * 2, dur: 2.50, gain: 0.024,
           attack: 0.20, verb: 0.45, dest: bgmGain });
  });
  tone({ start: 2.7, type: 'sine', freq: noteFreq(NOTE.C2), dur: 2.6, gain: 0.13, attack: 0.10, dest: bgmGain });
  // 聖歌隊（跳躍の瞬間から歌う）＋光の一点 E6
  [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5].forEach((n, i) => {
    tone({ start: 2.7, type: 'triangle', freq: noteFreq(n) * 2, dur: 2.5,
           gain: 0.040 - i * 0.005, attack: 0.30, verb: 0.65, dest: bgmGain });
  });
  tone({ start: 2.7, type: 'sine', freq: noteFreq(NOTE.E6), dur: 2.4, gain: 0.030,
         attack: 0.05, verb: 0.60, dest: bgmGain });
  // カリヨン下行（天から降る）：G6 → E6 → C6
  [NOTE.G6, NOTE.E6, NOTE.C6].forEach((n, k) => {
    tone({ start: 2.9 + k * 0.34, type: 'sine', freq: noteFreq(n), dur: 1.6,
           gain: 0.034 - k * 0.005, attack: 0.004, verb: 0.60, dest: bgmGain });
  });
  // 4.5秒〜: ティンパニロール（クレッシェンド）→ 疾走へ
  for (let k = 0; k < 8; k++) {
    tone({ start: 4.5 + k * 0.105, type: 'sine', freq: 96, freqEnd: 62, dur: 0.10,
           gain: 0.05 + k * 0.016, attack: 0.002, dest: bgmGain });
    noiseHit({ start: 4.5 + k * 0.105, dur: 0.03, gain: 0.012 + k * 0.005,
               hpFreq: 100, lpFreq: 1800, dest: bgmGain });
  }
  noiseHit({ start: 5.32, dur: 0.6, gain: 0.10, hpFreq: 2600, lpFreq: 15000, dest: bgmGain });
}

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
  } else if (song.style === 'bossSynth') {
    // ★R52W2 案B「ダークシンセ」（128BPM）。案Aと対比して選んでもらうための電子系。
    // ⚠️ここで**絶対にやらないこと**（前々案がダサかった正体。戻したら同じFBが返ってくる）:
    //     ・3・11 への食い込み（跳ね）      ・裏拍に和音を刺す（ブラスヒット）
    //     ・起承転結する歌モノの旋律        ・オクターブ上のきらめき
    //   モダンな電子音楽は「音の置き方が真っ直ぐで、音数が少なく、空間で埋める」。
    //   声部は5つだけ：①16分のサブベース ②持続パッド ③氷のリフ ④四つ打ち＋裏拍ハット
    //   ⑤8小節に1回のライザー。
    const bassF = noteFreq(chord.bass);

    // ① サブベースのオスティナート：**16分グリッドの全ステップ**を同じ1音で刻む。
    //    休符も跳ねも食い込みも作らない＝機械が等間隔で脈打つ床。曲の推進力はここだけで足りる。
    tone({ type: 'sine', freq: bassF, dur: stepSec * 0.9,
           gain: 0.20, dest: bgmGain, attack: 0.004 });
    tone({ type: 'sawtooth', freq: bassF * 2, dur: stepSec * 0.6,
           gain: 0.032, dest: bgmGain, attack: 0.003 });

    // ② パッド：2小節ぶん持続するデチューンした saw（±12セント）。
    //    ⚠️「刺す」のではなく「敷く」。attack 0.55秒でゆっくり立ち上がるので拍が立たない
    //    ＝ブラスヒットにならない。和音の役目はリズムを作ることではなく場を作ること。
    if (inBar === 0 && bar % 2 === 0) {
      chord.pad.forEach((n, i) => {
        for (const det of [-12, 12]) {
          tone({ type: 'sawtooth', freq: noteFreq(n), dur: stepSec * 31,
                 gain: 0.030 - i * 0.005, dest: bgmGain, attack: 0.55, detune: det, verb: 0.30 });
        }
      });
    }

    // ③ 氷のリフ：1小節3音。残響（verb）へ送って**音数ではなく空間**で埋める。
    const m = song.melody[bar][inBar];
    if (m !== undefined && m !== -1) {
      const mf = noteFreq(m);
      tone({ type: 'square', freq: mf, dur: stepSec * 1.1,
             gain: 0.085, dest: bgmGain, attack: 0.002, verb: 0.45 });
      tone({ type: 'triangle', freq: mf * 2, dur: stepSec * 0.7,
             gain: 0.028, dest: bgmGain, attack: 0.002, verb: 0.38 });
      tone({ type: 'sawtooth', freq: mf, dur: stepSec * 0.45,
             gain: 0.020, dest: bgmGain, attack: 0.002, detune: 9 });
    }

    // ④ ドラム：四つ打ちキック（0/4/8/12）＋2拍4拍のクラップ＋裏拍のオープンハット。
    //    ハットは8分の**裏だけ**が長く開く（クラブの推進はここ）。16分は一切刻まない。
    if (inBar % 4 === 0) {
      tone({ type: 'sine', freq: 118, freqEnd: 33, dur: 0.20, gain: 0.30,
             dest: bgmGain, attack: 0.002 });
      noiseHit({ dur: 0.018, gain: 0.035, hpFreq: 900, lpFreq: 5000, dest: bgmGain });
    }
    if (inBar === 4 || inBar === 12) {
      // 2枚とも同時に鳴らす（ずらすと手拍子＝昭和の語彙になる）。長い方が残響の代わり。
      noiseHit({ dur: 0.05, gain: 0.10, hpFreq: 1400, lpFreq: 7000, dest: bgmGain });
      noiseHit({ dur: 0.22, gain: 0.042, hpFreq: 3800, lpFreq: 12000, dest: bgmGain });
    }
    if (inBar % 4 === 2) {
      noiseHit({ dur: 0.13, gain: 0.045, hpFreq: 7000, lpFreq: 15000, dest: bgmGain });  // オープン
    } else if (inBar % 2 === 0) {
      noiseHit({ dur: 0.016, gain: 0.016, hpFreq: 8500, lpFreq: 15000, dest: bgmGain }); // クローズ
    }

    // ⑤ ライザー：8小節に1回。最終小節をまるごと使って帯域と音量を上げ、ループ頭へ吸い込む。
    if (bar === song.bars - 1) {
      noiseHit({ dur: stepSec * 1.2, gain: 0.012 + inBar * 0.0035,
                 hpFreq: 700 + inBar * 520, lpFreq: 16000, dest: bgmGain });
    }
    // ループ頭と5小節目のサブドロップ（低い一撃＋空気の抜け）
    if (inBar === 0 && (bar === 0 || bar === 4)) {
      tone({ type: 'sine', freq: 70, freqEnd: 27, dur: 0.9, gain: 0.20,
             dest: bgmGain, attack: 0.003 });
      noiseHit({ dur: 0.7, gain: 0.045, hpFreq: 2600, lpFreq: 14000, dest: bgmGain });
    }
  } else if (song.style === 'boss') {
    // ★R52W2 案A「オーケストラルロック」（Eハーモニックマイナー・168BPM・16小節）。
    //   参考曲の指定＝ロマンシングサガ Re;univerSe（伊藤賢治のバトル曲）。
    // ⚠️ここで**絶対にやらないこと**（前案「サザエさんの主題歌みたい」の正体）:
    //     ・3・11 への食い込み（跳ね＝スウィング）
    //     ・裏拍にブラスを連打する（＝マーチ／運動会の語彙）
    //   逆に、**旋律が歌うことは禁止しない**。ロマサガの旋律は歌う。前回の敗因はノリであって
    //   旋律の存在ではなかった、と解釈を修正した。
    //   声部は6つ：①ストレート16分の弦オスティナート ②低弦とベース（ストレート8分）
    //   ③勇壮な主題（弦＋ブラスのユニゾン） ④ピアノの速い駆け上がり（節目だけ）
    //   ⑤決めのオーケストラヒット（16小節に4回だけ） ⑥ロックドラム。
    const bassF = noteFreq(chord.bass);
    const sec4 = Math.floor(bar / 4);                    // 0=呼びかけ 1=応え 2=展開 3=見せ場
    const lastBar = bar === song.bars - 1;

    // ① 弦オスティナート：**16分グリッドの全ステップ**を、根音と5度の2音だけで刻む。
    //    ここが疾走の土台で、休符も跳ねも食い込みも一切作らない（＝サザエさん要素の根絶）。
    {
      // fifth-7＝その和音の根音（ベースより1〜2オクターブ上）。ヴィオラ〜ヴァイオリンの帯域へ
      // 上げてベース（82〜165Hz）と場所を分ける。
      const f = 2 * noteFreq((inBar % 4 === 2) ? chord.fifth : chord.fifth - 7);
      tone({ type: 'sawtooth', freq: f, dur: stepSec * 0.85,
             gain: 0.075 + sec4 * 0.006, dest: bgmGain, attack: 0.003, verb: 0.16 });
      tone({ type: 'sawtooth', freq: f * 2, dur: stepSec * 0.6,
             gain: 0.020, dest: bgmGain, attack: 0.003, detune: 7 });
    }
    // ② 低弦＋ベース：ストレートな8分だけ（0,2,4,…,14）。⚠️3・11 には置かない。
    if (inBar % 2 === 0) {
      tone({ type: 'sine', freq: bassF, dur: stepSec * 1.7,
             gain: 0.20, dest: bgmGain, attack: 0.004 });
      tone({ type: 'sawtooth', freq: bassF * 2, dur: stepSec * 1.2,
             gain: 0.045, dest: bgmGain, attack: 0.004 });
    }
    // ③ 主題：弦とブラスのユニゾン。**次の音までの間隔から長さを決める**ので、
    //    休符を並べれば自然に長い音になる＝歌になる（音符で枡を埋めない）。
    const m = song.melody[bar][inBar];
    if (m !== undefined && m !== -1) {
      let hold = 1;
      for (let k = inBar + 1; k < STEPS_PER_BAR && song.melody[bar][k] === -1; k++) hold++;
      const mf = noteFreq(m);
      const d = stepSec * Math.min(hold + 0.6, 8);
      tone({ type: 'sawtooth', freq: mf, dur: d, gain: 0.115,
             dest: bgmGain, attack: 0.012, verb: 0.30 });                    // 弦（ゆっくり立ち上がる）
      tone({ type: 'sawtooth', freq: mf, dur: d * 0.9, gain: 0.055,
             dest: bgmGain, attack: 0.010, detune: 11, verb: 0.24 });        // 厚み（デチューン）
      tone({ type: 'square', freq: mf, dur: d * 0.55, gain: 0.055,
             dest: bgmGain, attack: 0.006 });                                // ブラスの芯
      tone({ type: 'triangle', freq: mf / 2, dur: d * 0.8, gain: 0.045,
             dest: bgmGain, attack: 0.008 });                                // オクターブ下の支え
    }
    // ④ ピアノの速い駆け上がり：**4小節ごとの最後の小節の後半だけ**（＝フレーズの節目）。
    //    常時鳴らすと分散和音の壁になるので、16小節で4回、各8音しか置かない。
    if (bar % 4 === 3 && inBar >= 8) {
      const k = inBar - 8;
      const n = chord.pad[k % 4] + (k >= 4 ? 12 : 0);   // 和音の構成音を2オクターブ駆け上がる
      tone({ type: 'triangle', freq: noteFreq(n), dur: stepSec * 1.6,
             gain: 0.070, dest: bgmGain, attack: 0.002, verb: 0.34 });
      tone({ type: 'sine', freq: noteFreq(n) * 2, dur: stepSec * 1.0,
             gain: 0.024, dest: bgmGain, attack: 0.002, verb: 0.30 });
    }
    // ⑤ 決めのオーケストラヒット：4小節ごとの頭だけ（16小節で4回）。
    //    ⚠️裏拍で連打しないこと自体が設計。ここを増やした瞬間にマーチへ戻る。
    if (inBar === 0 && bar % 4 === 0) {
      chord.pad.forEach((n, i) => {
        tone({ type: 'sawtooth', freq: noteFreq(n), dur: 0.26, gain: 0.075 - i * 0.010,
               dest: bgmGain, attack: 0.004, verb: 0.30 });
        tone({ type: 'square', freq: noteFreq(n), dur: 0.14, gain: 0.030 - i * 0.005,
               dest: bgmGain, attack: 0.003 });
      });
      noiseHit({ dur: 0.05, gain: 0.09, hpFreq: 200, lpFreq: 5000, dest: bgmGain });   // 打点
      noiseHit({ dur: 0.45, gain: 0.055, hpFreq: 3000, lpFreq: 14000, dest: bgmGain }); // シンバル
      tone({ type: 'sine', freq: 92, freqEnd: 44, dur: 0.35, gain: 0.17,
             dest: bgmGain, attack: 0.003 });                                          // ティンパニ
    }
    // ⑥ 見せ場（13〜14小節＝同主長調 E）だけ、聖歌隊の持続を上に架ける。
    //    「同じ場所に光が差す」を音色でも見せる（maouTrue のイントロと同じ部品・本体は不変）。
    if (inBar === 0 && (bar === 12 || bar === 13)) {
      [NOTE.E5, NOTE.Gs5, NOTE.B5].forEach((n, i) => {
        tone({ type: 'triangle', freq: noteFreq(n), dur: stepSec * 15,
               gain: 0.030 - i * 0.006, dest: bgmGain, attack: 0.40, verb: 0.55 });
      });
    }
    // ⑦ ロックドラム：キック 0・8・10（後半は 6 も）／スネア 2拍4拍／ハットは8分のストレート。
    if (inBar === 0 || inBar === 8 || inBar === 10 || (sec4 >= 2 && inBar === 6)) {
      tone({ type: 'sine', freq: 132, freqEnd: 36, dur: 0.14, gain: 0.27,
             dest: bgmGain, attack: 0.002 });
      noiseHit({ dur: 0.02, gain: 0.035, hpFreq: 700, lpFreq: 4500, dest: bgmGain });
    }
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.07, gain: 0.105, hpFreq: 1500, lpFreq: 9000, dest: bgmGain });
      noiseHit({ dur: 0.16, gain: 0.040, hpFreq: 4000, lpFreq: 13000, dest: bgmGain });
      tone({ type: 'triangle', freq: 210, freqEnd: 130, dur: 0.06, gain: 0.05,
             dest: bgmGain, attack: 0.001 });
    }
    if (inBar % 2 === 0) {
      noiseHit({ dur: (inBar % 4 === 2) ? 0.030 : 0.018,
                 gain: (inBar % 4 === 2) ? 0.030 : 0.020,
                 hpFreq: 7500, lpFreq: 15000, dest: bgmGain });
    }
    // ⑧ 最終小節の後半はティンパニ／タムの下降フィルでループの頭へ叩き込む（ストレートな16分）。
    if (lastBar && inBar >= 12) {
      const k = inBar - 12;
      tone({ type: 'sine', freq: 180 - k * 26, freqEnd: 60 - k * 8, dur: 0.11,
             gain: 0.15 + k * 0.02, dest: bgmGain, attack: 0.002 });
      noiseHit({ dur: 0.04, gain: 0.05 + k * 0.012, hpFreq: 900, lpFreq: 7000, dest: bgmGain });
    }
  } else if (song.style === 'maou') {
    // ★R35 再編曲。3つの variant は「テンポ違い」ではなく**編成そのものが別**（設計の根拠は
    // CHORDS_MAOU の上の解説）。R34W4 でテンポ違いの3つを並べて3つとも不採用だったので、
    // 今回は音色を軸にして、どれが選ばれるかで「音色が原因だったのか」を確かめる。
    //   guitar … WaveShaper で本当に潰した歪みギター＋ツーバス
    //   orch   … ブラス／弦のトレモロ／合唱／ティンパニ（歪み無し・残響たっぷり）
    //   synth  … 矩形波と16分アルペジオの疾走（ファミコン〜SFC寄り）
    const ch = song.chords[bar * 2 + (inBar >= 8 ? 1 : 0)];
    const sec = Math.floor(bar / 4);            // 0=名乗り 1=追い立て 2=主題 3=頂点（半音上へ転調）
    const lift = [0, 0.10, 0.20, 0.36][sec];
    const beat = inBar % 4;
    const V = song.variant || 'guitar';
    const GT = V === 'guitar' || V === 'true';  // R36W2 軌道神核はギター編成が土台（採用版に足すだけ）
    const GTR = distBus || bgmGain;             // WaveShaper 非対応環境では素のBGMバスへ落とす
    // ★R38 主役交代。「神々しさ声部を足しただけ」では歪みの海にマスクされて届かなかったので、
    //   軌道神核では**神々しさ×2倍・ギター×0.7**でオルガンと聖歌隊がギターの上に立つ。
    //   ベースとドラムは据え置き＝疾走の背骨は同じ＝「同じ戦いの別の段」は保つ。
    const HOLY = V === 'true' ? 2.0 : 1;        // 神々しさ声部（オルガン/聖歌隊/鐘/ドローン/天使の声）
    const GDIM = V === 'true' ? 0.70 : 1;       // ギターの壁とリードを下げる係数
    // ★R39 段3＝神核の主題（melody2）の間だけギターのリードが伴奏へ退く。
    //   gain を半分以下にするのではなく 0.45＝「消える」のではなく「一歩下がる」。
    //   主役交代が**曲の中で**起きること自体が軌道神核の個性（マオウレクスでは起きない）。
    const LEAD_DUCK = V === 'true' ? [1, 1, 0.45, 1][sec] : 1;

    // ===== ① 低音：疾走の土台 =====
    {
      const root = noteFreq(ch.bass) / 2;
      if (V === 'orch') {
        // オーケストラはコントラバス＋チェロ。16分で刻まず、8分で長く弓を引く
        if (inBar % 2 === 0) {
          tone({ type: 'sawtooth', freq: root, dur: stepSec * 2.1,
                 gain: 0.105 * (1 + lift), dest: bgmGain, attack: 0.014, verb: 0.30 });
          tone({ type: 'triangle', freq: root * 2, dur: stepSec * 2.0,
                 gain: 0.052, dest: bgmGain, attack: 0.018, verb: 0.22 });
        }
      } else {
        // ギター／シンセは**16分音符で刻み続けるベース**（疾走感の本体）
        const f = beat === 0 ? root : beat === 2 ? root * 2 : root * 1.4983;   // 1.4983 = 完全5度
        const g = (beat === 0 ? 0.088 : 0.046) * (1 + lift);
        tone({ type: V === 'synth' ? 'square' : 'sawtooth', freq: f,
               dur: stepSec * 0.94, gain: g, dest: bgmGain, attack: 0.002 });
        // ⚠️ 重ねはオクターブ**上**。下へ重ねても子どものノートPCのスピーカーでは何も鳴らない。
        tone({ type: 'square', freq: f * 2, dur: stepSec * 0.88, gain: g * 0.34,
               dest: bgmGain, attack: 0.002 });
      }
    }

    // ===== ② 中音：和音の受け持ち（ここが編成の性格をいちばん決める） =====
    if (GT) {
      // パワーコードのバッキング。**本物の歪み**を通すので、同時に鳴る音同士が
      // シェイパーの中で干渉して濁る＝実際のギターアンプと同じ「壁」ができる。
      if (inBar % 2 === 0) {
        const r = noteFreq(ch.arp[0]);
        const g = 0.070 * (1 + lift) * GDIM;   // R38 軌道神核は壁を下げてオルガンに主役を譲る
        for (const [mul, det] of [[1, -8], [1, 8], [1.4983, 0]]) {
          tone({ type: 'sawtooth', freq: r * mul, dur: stepSec * 1.6, gain: g,
                 dest: GTR, attack: 0.003, detune: det });
        }
      }
    } else if (V === 'orch') {
      // 弦のトレモロ（16分の細かい刻み）＝オーケストラの緊迫。1音ずつは小さく、数で押す。
      const n = ch.arp[inBar % ch.arp.length];
      tone({ type: 'sawtooth', freq: noteFreq(n), dur: stepSec * 1.1,
             gain: 0.030 * (1 + lift), dest: bgmGain, attack: 0.006, verb: 0.34 });
      tone({ type: 'triangle', freq: noteFreq(n) * 2, dur: stepSec * 1.0,
             gain: 0.014, dest: bgmGain, attack: 0.008, verb: 0.30 });
    } else {
      // シンセは16分アルペジオ。和音を分解して駆け上がる＝ファミコン〜SFC の疾走の作法。
      const n = ch.arp[inBar % 4];
      tone({ type: 'square', freq: noteFreq(n) * 2, dur: stepSec * 0.9,
             gain: 0.038 * (1 + lift), dest: bgmGain, attack: 0.002 });
      if (inBar % 2 === 0) {
        tone({ type: 'sawtooth', freq: noteFreq(ch.arp[0]), dur: stepSec * 1.5,
               gain: 0.040 * (1 + lift), dest: bgmGain, attack: 0.004, verb: 0.16 });
      }
    }

    // ===== ③ 打楽器 =====
    {
      // ツーバス（四魔貴族バトル2の要）。orch はティンパニなので4分で重く。
      const kickOn = V === 'orch' ? (beat === 0)
        : V === 'synth' ? (sec >= 1 || inBar % 2 === 0)
        : (inBar % 2 === 0);
      if (kickOn) {
        const g = (V === 'orch' ? 0.23 : 0.16) * (inBar === 0 ? 1.25 : 1) * (1 + lift * 0.5);
        tone({ type: 'sine', freq: V === 'orch' ? 118 : 132, freqEnd: V === 'orch' ? 42 : 46,
               dur: V === 'orch' ? 0.20 : 0.10, gain: g, dest: bgmGain, attack: 0.0015,
               verb: V === 'orch' ? 0.20 : 0 });
        noiseHit({ dur: 0.03, gain: g * 0.32, hpFreq: 50, lpFreq: 1400, dest: bgmGain });
      }
      if (inBar === 4 || inBar === 12) {
        const g = 0.086 * (1 + lift);
        noiseHit({ dur: 0.09, gain: g, hpFreq: 900, lpFreq: 9500, dest: bgmGain });
        noiseHit({ start: 0.005, dur: 0.16, gain: g * 0.45, hpFreq: 300, lpFreq: 4000, dest: bgmGain });
        tone({ type: 'triangle', freq: 232, freqEnd: 158, dur: 0.07,
               gain: 0.055, dest: bgmGain, attack: 0.001 });
      }
      if (inBar % 2 === 1 && sec >= 1) {
        noiseHit({ dur: 0.020, gain: 0.019 + lift * 0.018, hpFreq: 6500, lpFreq: 15000, dest: bgmGain });
      }
      // クラッシュシンバル：段の頭（＝段が変わったことを一撃で知らせる）
      if (inBar === 0 && bar % 4 === 0) {
        noiseHit({ dur: 0.55, gain: 0.085 + lift * 0.05, hpFreq: 3000, lpFreq: 15000, dest: bgmGain });
      }
      // ドラムのフィルイン（段の変わり目に雪崩れ込む）
      if ((bar === 3 || bar === 7 || bar === 11 || bar === 15) && inBar >= 12) {
        const k = inBar - 12;
        noiseHit({ dur: 0.045, gain: 0.028 + k * 0.014, hpFreq: 700, lpFreq: 9000, dest: bgmGain });
        tone({ type: 'triangle', freq: 300 - k * 42, freqEnd: 150 - k * 20, dur: 0.06,
               gain: 0.045 + k * 0.016, dest: bgmGain, attack: 0.001 });
        if (bar === 15) {
          tone({ type: 'sine', freq: 120, freqEnd: 54, dur: 0.13,
                 gain: 0.07 + k * 0.020, dest: bgmGain, attack: 0.002, verb: 0.25 });
        }
      }
    }

    // ===== ④ 荘厳：パイプオルガンと16フィートの唸り（疾走のために荘厳を捨てない） =====
    if (inBar === 0) {
      ch.pad.forEach((n, i) => {
        const f = noteFreq(n);
        tone({ type: 'sawtooth', freq: f, dur: stepSec * 15.2,
               gain: (0.052 - i * 0.009) * (1 + lift * 0.6) * HOLY, dest: bgmGain,
               attack: 0.06, verb: 0.40 });
        tone({ type: 'square', freq: f * 2, dur: stepSec * 15.0,
               gain: 0.020 * HOLY, dest: bgmGain, attack: 0.09, verb: 0.30 });
      });
      tone({ type: 'sine', freq: noteFreq(ch.bass) / 2, dur: stepSec * 15.4,
             gain: 0.12, dest: bgmGain, attack: 0.04 });
      // R38 軌道神核：オルガンの4フィート管（2オクターブ上の輝き）＝上に積むほど神々しい
      // ★R39 「オルガンをもう少し目立たせて」：gain 0.022→0.032 に加えて、
      //   2 2/3フィートのクイント管（×3＝12度上）を足す。整数倍でない响きの混ざった
      //   ミクスチャーこそ「パイプオルガンの指紋」＝音量ではなく音色で目立たせる。
      if (V === 'true') {
        tone({ type: 'square', freq: noteFreq(ch.pad[0]) * 4, dur: stepSec * 14.5,
               gain: 0.032, dest: bgmGain, attack: 0.12, verb: 0.45 });
        tone({ type: 'sine', freq: noteFreq(ch.pad[0]) * 3, dur: stepSec * 14.8,
               gain: 0.026, dest: bgmGain, attack: 0.10, verb: 0.45 });
      }
    }
    // ★R39 オルガンの呼吸：小節の後半（和音が変わる瞬間）にもう一度弾き直す。
    //   R38 までは小節頭の1回きり＝半小節ごとに動く和音（CHORDS_MAOU 32要素）に
    //   オルガンだけ付いて行けず、長いパッドが濁っていた。2回吸って吐く＝存在感は
    //   gain ではなく**動き**で出す（この ch は inBar>=8 で後半の和音に切り替わっている）。
    if (V === 'true' && inBar === 8) {
      ch.pad.forEach((n, i) => {
        tone({ type: 'sawtooth', freq: noteFreq(n), dur: stepSec * 7.4,
               gain: (0.040 - i * 0.007) * (1 + lift * 0.6) * HOLY, dest: bgmGain,
               attack: 0.05, verb: 0.40 });
      });
      tone({ type: 'square', freq: noteFreq(ch.pad[0]) * 4, dur: stepSec * 7.2,
             gain: 0.024, dest: bgmGain, attack: 0.08, verb: 0.45 });
    }

    // ===== ⑤ 荘厳：聖歌隊（第3段から。orch は第2段から厚く） =====
    // R36W2 軌道神核は聖歌隊が**最初の小節から**入る（神々しさは「あとから来る」ものではなく
    //   その姿の常態。段の高まりは音量 lift が引き受ける）。
    if (inBar === 8 && (sec >= 2 || (V === 'orch' && sec >= 1) || V === 'true')) {
      ch.arp.forEach((n, i) => {
        const f = noteFreq(n);
        tone({ type: 'triangle', freq: f * 2, dur: stepSec * 7,
               gain: (0.032 - i * 0.005) * (1 + lift) * HOLY, dest: bgmGain,
               attack: 0.14, verb: 0.55 });
        if (i < 3) {
          tone({ type: 'sine', freq: f * 4, dur: stepSec * 6,
                 gain: (0.018 - i * 0.004) * HOLY, dest: bgmGain, attack: 0.18, verb: 0.50 });
        }
      });
    }

    // ===== ⑥ ★主題：長さを持った旋律（R35 の中心） =====
    // 旧実装は全部の音が同じ長さ（1.9枡）で鳴っていた＝長い音も休符も無く、歌にならなかった。
    // ここでは H（タイ）を数えて**実際の音価**を出す。1小節3〜5音まで減らしてあるぶん、
    // 1音の長さと音色に体重を掛けられる。
    if (inBar % 2 === 0) {
      const j = inBar / 2;
      const m = song.melody[bar][j];
      if (m !== undefined && m !== -1 && m !== -99) {
        let hold = 1, bi = bar, jj = j + 1;
        while (hold < 10) {
          if (jj >= 8) { jj = 0; bi++; if (bi >= song.bars) break; }
          if (song.melody[bi][jj] !== -99) break;
          hold++; jj++;
        }
        const len = stepSec * 2 * hold;          // 1枡＝8分音符＝2ステップ
        const mf = noteFreq(m);
        const g = 0.105 * (1 + lift) * LEAD_DUCK;   // R39 神核の主題の段はギターが一歩下がる
        if (GT) {
          // 歪みギターのリード。デチューン3枚を**同じシェイパーへ**送るので、
          // 足し算ではなく互いに潰し合って本当のひずみになる。
          for (const det of [-12, 0, 12]) {
            tone({ type: 'sawtooth', freq: mf, dur: len * 0.96, gain: g * 0.70 * GDIM,
                   dest: GTR, attack: 0.008, detune: det });
          }
          tone({ type: 'triangle', freq: mf * 2, dur: len * 0.9, gain: g * 0.40,
                 dest: bgmGain, attack: 0.008, verb: 0.30 });
          // R36W2 軌道神核：天使の声のユニゾン（1オクターブ上・遅い立ち上がり・深い残響）。
          // ギターの刃の上に、同じ旋律が光としてかぶさる＝「歌っているのは同じ主題」。
          // R38 gain を約2倍へ＝ギターの刃と**同格**に（0.30では埋もれて聞こえなかった）。
          if (V === 'true') {
            tone({ type: 'sine', freq: mf * 2, dur: len * 0.95, gain: g * 0.55,
                   dest: bgmGain, attack: 0.07, verb: 0.60 });
            tone({ type: 'triangle', freq: mf * 4, dur: len * 0.7, gain: g * 0.24,
                   dest: bgmGain, attack: 0.09, verb: 0.55 });
          }
        } else if (V === 'orch') {
          // ブラス。立ち上がりをわずかに遅らせる（0.03秒）と金管らしい「ブワッ」になる。
          for (const det of [-6, 6]) {
            tone({ type: 'sawtooth', freq: mf, dur: len * 0.94, gain: g * 0.62,
                   dest: bgmGain, attack: 0.030, detune: det, verb: 0.45 });
          }
          tone({ type: 'square', freq: mf, dur: len * 0.85, gain: g * 0.26,
                 dest: bgmGain, attack: 0.040, verb: 0.40 });
          tone({ type: 'sine', freq: mf * 2, dur: len * 0.8, gain: g * 0.30,
                 dest: bgmGain, attack: 0.035, verb: 0.50 });
          tone({ type: 'triangle', freq: mf / 2, dur: len * 0.9, gain: g * 0.34,
                 dest: bgmGain, attack: 0.030, verb: 0.35 });
        } else {
          // シンセリード。矩形波の芯＋のこぎりの厚み＋オクターブ上のきらめき。
          tone({ type: 'square', freq: mf, dur: len * 0.92, gain: g * 0.66,
                 dest: bgmGain, attack: 0.004, verb: 0.22 });
          tone({ type: 'sawtooth', freq: mf, dur: len * 0.88, gain: g * 0.34,
                 dest: bgmGain, attack: 0.006, detune: 9, verb: 0.18 });
          tone({ type: 'square', freq: mf * 2, dur: len * 0.6, gain: g * 0.20,
                 dest: bgmGain, attack: 0.004, verb: 0.26 });
        }
      }
    }

    // ===== ⑥b ★R39 神核の主題：オルガンの独立声部（melody2・軌道神核だけ） =====
    // ギターの主題（⑥）とは別の旋律を、本物のオルガンのレジストレーションで鳴らす：
    //   プリンシパル 8'＋4'＋2 2/3'＋2'。×3（クイント）が入ると耳は即座に
    //   「パイプオルガン」と認識する（整数オクターブだけだと太いシンセにしか聞こえない）。
    //   attack 0.05〜0.08＝オルガンの「発語」。ギターの 0.008 と立ち上がりが違うから、
    //   同じ帯域でも混ざらずに聞き分けられる。
    if (V === 'true' && song.melody2 && inBar % 2 === 0) {
      const j2 = inBar / 2;
      const m2 = song.melody2[bar][j2];
      if (m2 !== undefined && m2 !== -1 && m2 !== -99) {
        let hold2 = 1, bi2 = bar, jj2 = j2 + 1;
        while (hold2 < 10) {
          if (jj2 >= 8) { jj2 = 0; bi2++; if (bi2 >= song.bars) break; }
          if (song.melody2[bi2][jj2] !== -99) break;
          hold2++; jj2++;
        }
        const len2 = stepSec * 2 * hold2;
        const mf2 = noteFreq(m2);
        const og = 0.088 * (1 + lift * 0.5);
        tone({ type: 'sawtooth', freq: mf2, dur: len2 * 0.97, gain: og,
               dest: bgmGain, attack: 0.05, verb: 0.50 });
        tone({ type: 'square', freq: mf2 * 2, dur: len2 * 0.94, gain: og * 0.48,
               dest: bgmGain, attack: 0.06, verb: 0.45 });
        tone({ type: 'sine', freq: mf2 * 3, dur: len2 * 0.90, gain: og * 0.36,
               dest: bgmGain, attack: 0.07, verb: 0.45 });
        tone({ type: 'square', freq: mf2 * 4, dur: len2 * 0.85, gain: og * 0.26,
               dest: bgmGain, attack: 0.08, verb: 0.50 });
      }
    }

    // ===== ⑦ 光：教会の鐘（段の頭と、転調した頂点の段。軌道神核は2小節ごと＝倍の頻度） =====
    if (inBar === 0 && (bar % 4 === 0 || sec === 3 || (V === 'true' && bar % 2 === 0))) {
      const bright = sec === 3;
      const bf = noteFreq(bright ? ch.arp[1] : ch.arp[0]) * 2;
      const bg = (bright ? 0.058 : 0.040) * (1 + lift * 0.5) * (V === 'true' ? 1.55 : 1);
      tone({ type: 'sine', freq: bf, dur: stepSec * 13, gain: bg,
             dest: bgmGain, attack: 0.004, verb: 0.60 });
      tone({ type: 'sine', freq: bf * 1.5, dur: stepSec * 11, gain: bg * 0.42,
             dest: bgmGain, attack: 0.006, verb: 0.55 });
      tone({ type: 'sine', freq: bf * 2.67, dur: stepSec * 8, gain: bg * 0.22,
             dest: bgmGain, attack: 0.008, verb: 0.50 });
    }

    // ===== ⑧ R36W2 軌道神核だけの声部 =====
    if (V === 'true') {
      // 光背ドローン：和音の4倍音の高いサインが頭上で鳴り続ける（光は上に置く。
      // 下へ重ねても子どものノートPCでは鳴らない＝R34W3の教訓の逆用）。
      if (inBar === 0) {
        tone({ type: 'sine', freq: noteFreq(ch.arp[0]) * 4, dur: stepSec * 15.5,
               gain: 0.048 * (1 + lift * 0.5), dest: bgmGain, attack: 0.12, verb: 0.60 });
        tone({ type: 'sine', freq: noteFreq(ch.arp[2]) * 4, dur: stepSec * 15.5,
               gain: 0.034, dest: bgmGain, attack: 0.16, verb: 0.60 });
      }
      // カリヨン：段の頭で3連の鐘が上から降りてくる（arp[2]→arp[1]→arp[0]の下行＝
      // 「天から降る」方向。上行にすると出発の音になり、降臨の音にならない）。
      if (inBar === 0 && bar % 4 === 0) {
        [2, 1, 0].forEach((ai, k) => {
          const bf2 = noteFreq(ch.arp[ai]) * 4;
          tone({ start: k * stepSec * 2, type: 'sine', freq: bf2, dur: stepSec * 9,
                 gain: 0.052 - k * 0.008, attack: 0.004, dest: bgmGain, verb: 0.60 });
          tone({ start: k * stepSec * 2, type: 'sine', freq: bf2 * 2.67, dur: stepSec * 5,
                 gain: 0.020, attack: 0.006, dest: bgmGain, verb: 0.55 });
        });
      }
    }
  } else if (song.style === 'ending') {
    // ★凱歌（112BPM）。明るいまま「重く」する＝ブラス風の厚い主旋律＋行進のスネア＋祝祭のベル。
    // 弦のパッド：小節頭で和音を長く伸ばして土台を広げる
    if (inBar === 0) {
      chord.pad.forEach((n, i) => {
        tone({ type: 'triangle', freq: noteFreq(n), dur: stepSec * 15,
               gain: 0.075 - i * 0.012, dest: bgmGain, attack: 0.05 });
      });
      tone({ type: 'sine', freq: noteFreq(chord.bass) / 2, dur: stepSec * 15,
             gain: 0.11, dest: bgmGain, attack: 0.03 });
    }
    // ベース：拍頭の力強い4分（行進のリズム。跳ねさせない）
    if (inBar % 4 === 0) {
      tone({ type: 'triangle', freq: noteFreq(chord.bass), dur: stepSec * 3.2,
             gain: 0.20, dest: bgmGain, attack: 0.006 });
    }
    // アルペジオ：8分でやわらかく流して華やかさを添える
    if (inBar % 2 === 0) {
      const arpIdx = (inBar / 2) % chord.arp.length;
      tone({ type: 'triangle', freq: noteFreq(chord.arp[arpIdx]) * 2, dur: stepSec * 1.6,
             gain: 0.038, dest: bgmGain, attack: 0.006 });
    }
    // 主旋律：sawtooth のブラス＋detune＋オクターブ下の芯。歌える形なので長めに伸ばす
    if (inBar % 2 === 0) {
      const m = song.melody[bar][inBar / 2];
      if (m !== undefined && m !== -1) {
        const mf = noteFreq(m);
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 2.6,
               gain: 0.13, dest: bgmGain, attack: 0.012 });
        tone({ type: 'sawtooth', freq: mf, dur: stepSec * 2.4,
               gain: 0.055, dest: bgmGain, attack: 0.012, detune: 9 });
        tone({ type: 'triangle', freq: mf / 2, dur: stepSec * 2.2,
               gain: 0.06, dest: bgmGain, attack: 0.014 });
        tone({ type: 'sine', freq: mf * 2, dur: stepSec * 2.0,
               gain: 0.03, dest: bgmGain, attack: 0.01 });
      }
    }
    // キック＋行進のスネア（タタッ・タン）。祝祭なので裏の刻みは入れない
    if (inBar % 8 === 0) {
      tone({ type: 'sine', freq: 150, freqEnd: 48, dur: 0.14, gain: 0.22,
             dest: bgmGain, attack: 0.002 });
    }
    if (inBar === 4 || inBar === 12) {
      noiseHit({ dur: 0.09, gain: 0.10, hpFreq: 1500, lpFreq: 8000, dest: bgmGain });
    }
    if (inBar === 6 || inBar === 7 || inBar === 14 || inBar === 15) {
      noiseHit({ dur: 0.05, gain: 0.05, hpFreq: 1700, lpFreq: 8500, dest: bgmGain });
    }
    // 祝祭のベル：フレーズ頭で高い鐘を1発、長く残す
    if (inBar === 0 && (bar === 0 || bar === 4)) {
      noiseHit({ dur: 0.36, gain: 0.06, hpFreq: 4000, lpFreq: 14000, dest: bgmGain });
      tone({ type: 'sine', freq: noteFreq(NOTE.C6), dur: stepSec * 10, gain: 0.05,
             dest: bgmGain, attack: 0.006 });
      tone({ type: 'sine', freq: noteFreq(NOTE.G6), dur: stepSec * 8, gain: 0.028,
             dest: bgmGain, attack: 0.01 });
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

    // --- R35: 残響（フィードバック・ディレイ）---
    // 出力を bgmGain へ返す。入口は別ノード（verbBus）にしてあるので発振ループにならない。
    if (ctx.createDelay) {
      verbBus = ctx.createGain();
      verbBus.gain.value = 1.0;
      const d1 = ctx.createDelay(0.5); d1.delayTime.value = 0.111;
      const d2 = ctx.createDelay(0.5); d2.delayTime.value = 0.173;   // 素数っぽい比で濁らせる
      const fb = ctx.createGain(); fb.gain.value = 0.36;
      const damp = ctx.createBiquadFilter();                          // 残響は高域から先に減る
      damp.type = 'lowpass'; damp.frequency.value = 2900;
      const wet = ctx.createGain(); wet.gain.value = 0.62;
      verbBus.connect(d1); verbBus.connect(d2);
      d1.connect(damp); d2.connect(damp);
      damp.connect(fb); fb.connect(d1);                               // 減衰しながら回る
      damp.connect(wet).connect(bgmGain);
    }

    // --- R35: 本物の歪み（WaveShaper）---
    // 入口で持ち上げて潰し → キャビネット相当のローパスで角を落とす → 出口で戻す。
    // 複数の音を同じシェイパーへ通すと互いに干渉して濁る＝実際のギターアンプと同じ挙動で、
    // これがパワーコードの「壁」を作る。
    if (ctx.createWaveShaper) {
      const mk = (drive, k, lp, out, dest) => {
        const inG = ctx.createGain(); inG.gain.value = drive;
        const ws = ctx.createWaveShaper();
        ws.curve = makeDistCurve(k);
        if ('oversample' in ws) ws.oversample = '4x';                 // 折り返しノイズを抑える
        const cab = ctx.createBiquadFilter();
        cab.type = 'lowpass'; cab.frequency.value = lp; cab.Q.value = 0.9;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 90;                // 低域の泥を切る
        const outG = ctx.createGain(); outG.gain.value = out;
        inG.connect(ws).connect(cab).connect(hp).connect(outG).connect(dest);
        return inG;
      };
      // ⚠️ drive は「潰れ具合」を決めるが、上げすぎると**常時フルクリップ＝ただのブザー**になる。
      //    WebAudio のカーブは入力 ±1 の外を端の値へ丸めるので、入力が1を超え続けると出力が
      //    定数（＝純粋な矩形波）に張り付いて、強弱も音程感も消える。
      //    BGM側は同時に鳴る声部の合計が概ね 0.2〜0.37 なので drive 3.2 で 0.64〜1.18＝
      //    「普段は歪み、山でだけ潰れる」に収まる。SFXの一撃は逆に潰し切ってよい（一瞬なので）。
      distBus = mk(3.2, 8, 3600, 0.28, bgmGain);        // BGMのギター（歪むが音程は残る）
      sfxDistBus = mk(5.0, 25, 5200, 0.38, sfxGain);    // SFXの一撃（潰し切る＝暴力的）
    }

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
    // R38 専用イントロ（降臨）。ある曲だけ、その長さぶんループの開始を遅らせる。
    if (song.introSec) {
      playMaouTrueIntro();
      bgmTimer = setTimeout(scheduleBgm, song.introSec * 1000);
    } else {
      scheduleBgm();
    }
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

  // 検証用。「音を変えた」を主張するには**鳴った波形**を測るしかないので、
  // 出力の分岐点を1つだけ外へ出す（boss.js の debugBullets と同じ位置づけ）。
  // ⚠️ ここから先へは何も繋がない。ゲーム側の音の経路は一切変えない。
  debugTap() {
    return ctx ? { ctx, master: masterGain, sfx: sfxGain } : null;
  },
};
