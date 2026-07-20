// 決定的乱数（mulberry32ベース）。ゲーム全体で標準の乱数関数は使わずこの rng 経由で乱数を得る。
// 同一 seed → 完全に同一の乱数列（test-core.js で検証）。

export function createRng(seed) {
  // seed は正の整数。0や非整数が来ても一応動くよう >>> 0 で32bit符号なし化する。
  let state = (seed >>> 0) || 1;

  function random() {
    // mulberry32
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + random() * (max - min);
  }

  function int(min, max) {
    // min〜max の整数（両端含む）
    return min + Math.floor(random() * (max - min + 1));
  }

  function pick(arr) {
    return arr[Math.floor(random() * arr.length)];
  }

  function chance(p) {
    // p=0 は必ず false、p=1 は必ず true
    if (p <= 0) return false;
    if (p >= 1) return true;
    return random() < p;
  }

  function shuffle(arr) {
    // 元配列を破壊しない Fisher-Yates
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  return { random, range, int, pick, chance, shuffle };
}
