// 2026-09-23 四神柱を「1ユニット=1ドット」で合成したときの実寸を測る（ジャム版オープニングの影絵用）。
//   ここで測った値から、影絵に焼くときの縮小率（整数）と表示の大きさを決める。
// node scratchpad/probe-gods-bbox.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THRONE } from './throne-candidates.mjs';
import { GAIKA, GAIKA2_FINAL } from './gaika-candidates.mjs';
import { CATHEDRAL, MAOU } from '../src/data/enemies.js';

const PART_DEPTH = { thruster: 0, wingR: 1, wingL: 1, legL: 1, legR: 1, body: 2, dome: 3, rack: 3, podL: 4, podR: 4, armL: 5, armR: 5, cannon: 5, core: 6 };
const PART_ORIGIN = { armR: [0.5, 0.12], armL: [0.5, 0.12], legL: [0.5, 0.1], legR: [0.5, 0.1] };

// rig を 1ユニット=1ドットで合成して char のグリッドにする。'.' は透明。
export function compose(def, rig) {
  const parts = (rig || def.rig).map((r) => ({
    ...r,
    depth: PART_DEPTH[r.role] != null ? PART_DEPTH[r.role] : 9,
    origin: r.origin || PART_ORIGIN[r.role] || [0.5, 0.5],
  })).sort((a, b) => a.depth - b.depth);
  // まず置き場所の範囲を測る
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const placed = [];
  for (const p of parts) {
    const sp = def.sprites[p.tex];
    if (!sp) throw new Error(`${def.id}: rig tex "${p.tex}" が sprites に無い`);
    const w = sp.rows[0].length, h = sp.rows.length;
    const left = Math.round(p.ox - (p.mirror ? (1 - p.origin[0]) : p.origin[0]) * w);
    const top = Math.round(p.oy - p.origin[1] * h);
    placed.push({ p, sp, w, h, left, top });
    x0 = Math.min(x0, left); y0 = Math.min(y0, top);
    x1 = Math.max(x1, left + w); y1 = Math.max(y1, top + h);
  }
  const W = x1 - x0, H = y1 - y0;
  const G = Array.from({ length: H }, () => Array(W).fill('.'));
  const pal = {};          // 合成後の文字 → 色
  const seen = new Map();  // 色 → 文字
  let next = 0;
  const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-=<>?@^~';
  const charFor = (col) => {
    if (seen.has(col)) return seen.get(col);
    if (next >= CHARS.length) throw new Error('色が多すぎる（' + next + '）');
    const c = CHARS[next++];
    seen.set(col, c); pal[c] = col;
    return c;
  };
  for (const { p, sp, w, h, left, top } of placed) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = sp.rows[y][p.mirror ? (w - 1 - x) : x];
        if (ch === '.' || ch === ' ') continue;
        const col = sp.palette[ch];
        if (!col) continue;
        G[top - y0 + y][left - x0 + x] = charFor(col);
      }
    }
  }
  return { G, pal, W, H };
}

export function bboxOf(G) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < G.length; y++) {
    for (let x = 0; x < G[0].length; x++) {
      if (G[y][x] === '.') continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = [
    ['堕天の大聖堂', CATHEDRAL, CATHEDRAL.rig],
    ['腐蝕の玉座', THRONE, THRONE.rig],
    ['軌道神核', { ...MAOU, sprites: MAOU.trueSprites }, MAOU.trueRig],
    ['蒼神骸華 第一案', GAIKA, GAIKA.rig],
    ['蒼神骸華 第二案', GAIKA2_FINAL, GAIKA2_FINAL.rig],
  ];
  for (const [name, def, rig] of list) {
    const { G, pal } = compose(def, rig);
    const b = bboxOf(G);
    let filled = 0;
    for (let y = b.y0; y < b.y0 + b.h; y++) for (let x = b.x0; x < b.x0 + b.w; x++) if (G[y][x] !== '.') filled++;
    console.log(`${name}: 塗りの外接 ${b.w}×${b.h}（縦横比 ${(b.w / b.h).toFixed(2)}）・色 ${Object.keys(pal).length}・塗り率 ${(filled / (b.w * b.h) * 100).toFixed(0)}%`);
    console.log(`  rig パーツ: ${rig.map((r) => r.tex).join(' ')}`);
    // 高さ 104 に収めるときの整数の縮小率
    for (const box of [116]) {
      const n = Math.max(1, Math.round(Math.max(b.w / 140, b.h / box)));
      console.log(`  縮小 1/${n} → ${Math.ceil(b.w / n)}×${Math.ceil(b.h / n)}（文字数 ${Math.ceil(b.w / n) * Math.ceil(b.h / n)}）`);
    }
  }
}
