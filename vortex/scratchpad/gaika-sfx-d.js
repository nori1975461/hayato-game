// 蒼神骸華 三本目の腕＝ビームライフルの効果音【D-長で確定（2026-09-23 11:19）】
//   ユーザー選択の経緯＝A 原典寄り／B 重め／C 速い／D この武器用 → **D**（09-23 11:12）
//     → 絵が「弾 3 発」から「一直線のレーザー」に変わったので D の最後を照射に作り直し
//     → 照射 0.45 秒（D-短）と 1.00 秒（D-長）を出して **D-長**（09-23 11:19）
//
// ⚠️これは **src/audio/sound.js へ貼り付けるための完成コード**。骸華がまだゲームに入っていないので
//   本体へは入れていない（使われない関数を本体に置かないため）。ボスを実装するときに下の手順で 1 度に入る。
//
// ── 入れ方（3 か所）────────────────────────────────────────────
// ①`tone()` に共鳴つきローパスと掃引を足す（既定は無効＝既存の呼び出しは 1 音も変わらない。
//    `noiseHit()` の `lpEnd` と同じ作法）。sound.js の tone() を下の TONE_PATCH のとおり書き換える。
// ②`growPulse()` を tone() の下に足す（脈が速くなりながら昇る音＝絵の grow と対になる）。
// ③`Sound` オブジェクトへ `gaikaBeamRifle()` を足す（`darkLaser()` の並び）。
//
// ── 音の骨格（三つの部品）──────────────────────────────────────
//   ①育つ　0.35 秒　220Hz → 1500Hz へ昇る。脈（音量の揺れ）が 9 回/秒 → 26 回/秒 へ速くなる
//   ②一発　雑音の「カッ」12ms ＋ 上へ跳ねる「ピ」＋ 2400Hz → 150Hz の共鳴つき掃引 ＋ 140Hz → 42Hz の「ドン」
//   ③照射　1.00 秒　92Hz の胴 ＋ 184Hz の矩形 ＋ 1560 → 1180Hz の粒 ＋ 雑音。終わりに 900 → 120Hz で切る
//   合計 約 1.6 秒。⚠️掃引の数値は私の設計値＝推測（原典の実測ではない）。原典は松尾祐夫氏が 1979 年に
//   ミニムーグで電圧とフィルタの掃引を手で動かした合成音＝「鋭いアタック＋急降下する掃引」が特徴。

// ===== ① tone() の差し替え（TONE_PATCH）=====
// 変更は 2 点だけ：(a) 受け取るオプションに lpFreq / lpEnd / lpQ を足す (b) lpFreq があるときだけ
// osc と g のあいだに lowpass を挟む。lpFreq を渡さない既存の呼び出しは経路も音も従来どおり。
export const TONE_PATCH = `
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
    lpFreq = 0,         // 09-23: 共鳴つきローパス（0＝無効＝従来どおりフィルタを挟まない）
    lpEnd = 0,          //        指定時は lpFreq→lpEnd へ掃引（ビームの「落ちる」正体はここ）
    lpQ = 1,            //        共鳴。8 前後で「ミュウン」と鳴く電子音になる
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
  if (lpFreq > 0) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = lpQ;
    lp.frequency.setValueAtTime(lpFreq, t0);
    if (lpEnd > 0) lp.frequency.exponentialRampToValueAtTime(Math.max(40, lpEnd), t0 + dur);
    osc.connect(lp).connect(g).connect(dest || sfxGain);
  } else {
    osc.connect(g).connect(dest || sfxGain);
  }
  if (verb > 0 && verbBus) {
    const vs = ctx.createGain();
    vs.gain.value = verb;
    g.connect(vs).connect(verbBus);
  }
  osc.start(t0);
  osc.stop(t0 + Math.max(dur, rel) + 0.02);
}
`;

// ===== ② growPulse()＝脈が速くなりながら昇る（tone() の下に足す）=====
export const GROW_PULSE = `
// 09-23: 蒼神骸華の「育つ光」用。音量を LFO で揺らしながら音程とフィルタを上げる。
//   絵の grow（粒が先へ行くほど大きくなる）と対。脈の速さが上がるので「溜まっている」と読める。
function growPulse({ start = 0, dur = 0.35, gain = 0.34, dest = sfxGain }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), lfo = ctx.createOscillator();
  const lg = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(1500, t0 + dur);
  osc2.type = 'square';
  osc2.detune.value = -8;
  osc2.frequency.setValueAtTime(110, t0);
  osc2.frequency.exponentialRampToValueAtTime(750, t0 + dur);
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(9, t0);
  lfo.frequency.linearRampToValueAtTime(26, t0 + dur);   // 脈が速くなる＝溜まっていく
  lg.gain.value = 0.5;
  lp.type = 'lowpass';
  lp.Q.value = 4;
  lp.frequency.setValueAtTime(900, t0);
  lp.frequency.exponentialRampToValueAtTime(5200, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * 0.65, t0 + 0.05);
  g.gain.linearRampToValueAtTime(gain, t0 + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.03);
  lfo.connect(lg).connect(g.gain);
  osc.connect(lp); osc2.connect(lp); lp.connect(g).connect(dest || sfxGain);
  osc.start(t0); osc2.start(t0); lfo.start(t0);
  const tEnd = t0 + dur + 0.05;
  osc.stop(tEnd); osc2.stop(tEnd); lfo.stop(tEnd);
}
`;

// ===== ③ Sound へ足すメソッド（darkLaser の並び）=====
export const SOUND_METHOD = `
  // 蒼神骸華 三本目の腕＝ビームライフル（D-長・2026-09-23 確定）。
  //   育つ 0.35 →（波動が弾ける一発）→ 照射 1.00 → 切れる。合計 約 1.6 秒。
  //   絵と 1 対 1：育つ＝粒が育つ／一発＝波動が弾ける／照射＝レーザーが伸びているあいだ。
  //   ⚠️照射の長さは行動設計（何秒撃つか）と揃えること。変えるときは BEAM だけ動かす。
  gaikaBeamRifle() {
    const CH = 0.35, BEAM = 1.00, T1 = CH, T2 = CH + 0.12;
    duckBgm(0.34, 0.10, 0.30);
    // ①育つ
    growPulse({ dur: CH, gain: 0.34 });
    // ②波動が弾ける一発（鋭いアタック＋急降下する掃引＝ビームライフルの芯）
    noiseHit({ start: T1, dur: 0.012, gain: 0.5, hpFreq: 1200, lpFreq: 14000 });
    tone({ start: T1, type: 'square', freq: 900, freqEnd: 2600, dur: 0.03, gain: 0.12, release: 0.05 });
    tone({ start: T1 + 0.02, type: 'sawtooth', freq: 2400, freqEnd: 150, dur: 0.5, gain: 0.32, attack: 0.004, release: 0.62, lpFreq: 6500, lpEnd: 260, lpQ: 8 });
    tone({ start: T1 + 0.02, type: 'sawtooth', freq: 2412, freqEnd: 152, dur: 0.5, gain: 0.18, attack: 0.004, release: 0.62, detune: 9, lpFreq: 6500, lpEnd: 260, lpQ: 8 });
    tone({ start: T1 + 0.02, type: 'sine', freq: 1200, freqEnd: 75, dur: 0.4, gain: 0.14, attack: 0.004, release: 0.5 });
    tone({ start: T1 + 0.01, type: 'sine', freq: 140, freqEnd: 42, dur: 0.32, gain: 0.55, attack: 0.002, release: 0.47 });
    // ③照射（出ているあいだ鳴り続ける胴）
    tone({ start: T2, type: 'sawtooth', freq: 92, dur: BEAM, gain: 0.20, attack: 0.03, release: BEAM + 0.06, lpFreq: 2600, lpQ: 3 });
    tone({ start: T2, type: 'square', freq: 184, dur: BEAM, gain: 0.09, attack: 0.04, release: BEAM + 0.06, detune: -10, lpFreq: 3200, lpQ: 2 });
    tone({ start: T2 + 0.02, type: 'sine', freq: 1560, freqEnd: 1180, dur: BEAM - 0.02, gain: 0.06, attack: 0.03, release: BEAM + 0.06, verb: 0.4 });
    noiseHit({ start: T2 + 0.02, dur: BEAM - 0.02, gain: 0.10, hpFreq: 2600, lpFreq: 9000 });
    // 切れる
    tone({ start: T2 + BEAM, type: 'sawtooth', freq: 900, freqEnd: 120, dur: 0.14, gain: 0.16, attack: 0.002, release: 0.24, lpFreq: 4000, lpEnd: 300, lpQ: 6 });
    noiseHit({ start: T2 + BEAM, dur: 0.16, gain: 0.14, hpFreq: 1800, lpFreq: 10000 });
  },
`;
