// systems/record.js — 遊んだ記録をブラウザ（localStorage）に残す（R69）。
//
// なぜ要るか：調整の最終判断は「息子さんのResult左下の数字」で決めているのに、その数字は
// 画面を閉じた瞬間に消えていた。毎回スクリーンショットを撮ってもらうのは手間で、実際に
// 1回ぶんしか届かない日が続いた（R67/R68の判断が1〜2回の記憶頼りになった）。
//
// 方針：
//  ・画面に出す情報は増やさない（息子さんが引いた「情報量はこれでよい」の境界を越えない）。
//    保存は黙って行い、取り出しは**タイトル画面で K キー**を押したときだけ。
//  ・れんしゅうじょう／1めんボスおためしは本番の記録ではないので保存しない。
//  ・localStorage はプライベートウィンドウ等で例外を投げることがあるので、読み書きは必ず
//    try/catch で包み、失敗しても遊びには一切影響させない。
import { BUILD } from '../data/version.js';

const KEY = 'vortex.runs';
const MAX = 60;                 // 古いものから捨てる（容量とコピーの長さの両方を抑える）

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}

function stamp() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function saveRun(rec) {
  try {
    const list = read();
    list.push(Object.assign({ b: BUILD, at: stamp() }, rec));
    while (list.length > MAX) list.shift();
    window.localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (e) { return false; }
}

export function runCount() { return read().length; }

// 人が読める1行/1プレイのテキスト。ユーザーがそのまま貼って渡せる形にする（JSONは読みにくい）。
export function dumpText() {
  const list = read();
  if (!list.length) return 'クルット・モビット あそんだ きろく：まだ ありません';
  const mmss = (s) => Math.floor((s || 0) / 60) + ':' + (Math.floor((s || 0) % 60) < 10 ? '0' : '') + Math.floor((s || 0) % 60);
  const lines = list.map((r, i) => {
    const bt = Array.isArray(r.bt) ? r.bt.map((v) => (v < 0 ? `${-v}…` : String(v))).join('・') : '-';
    return `${i + 1}) ${r.at || '-'} v${r.b || '-'} ${r.mode || '-'} ${r.clear ? 'クリア' : 'ゲームオーバー'}`
      + ` タイム${mmss(r.t)} ボス[${bt}] たおした${r.k || 0} つかまえた${r.cap || 0} コイン${r.coin || 0}`
      + ` Lv${r.lv || 0} ぶきLv${r.wl || 0} なかま[${(r.party || []).join(',')}] しんこう${r.prog == null ? '-' : r.prog}`
      + ` しょり${r.fps == null ? '-' : r.fps}fps/30われ${r.slow == null ? '-' : r.slow}%/おくれ${r.clamp == null ? '-' : r.clamp}%`;
  });
  return `クルット・モビット あそんだ きろく（${list.length}かい ぶん）\n` + lines.join('\n');
}
