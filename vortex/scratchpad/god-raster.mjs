// マキナ四神（ボス）の昇華用ラスタライザ。cathedral-candidates.mjs / maou-true-candidates.mjs の写しに
// 補助（オフセット線・楕円塗り・球面シェード・検査）を足して共有化した。オーサリング専用＝ゲームには入らない。
export const g = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
export const P = (G, x, y, ch) => {
  x = Math.round(x); y = Math.round(y);
  if (G[y] && x >= 0 && x < G[0].length) G[y][x] = ch;
};
export const GET = (G, x, y) => { x = Math.round(x); y = Math.round(y); return (G[y] && x >= 0 && x < G[0].length) ? G[y][x] : null; };
export const LN = (G, x0, y0, x1, y1, ch) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
  for (let i = 0; i <= n; i++) P(G, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
};
// 太い線（法線方向へ厚み t 分ずらして重ね引き）。1px の線は等倍で消える
export const LNT = (G, x0, y0, x1, y1, ch, t = 2) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let k = -(t - 1) / 2; k <= (t - 1) / 2 + 1e-9; k += 0.5) LN(G, x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, ch);
};
// 法線方向へ off だけずらした1本線（稜線＝光の縁を太い線の片側に置く）
export const LNO = (G, x0, y0, x1, y1, ch, off) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  LN(G, x0 + nx * off, y0 + ny * off, x1 + nx * off, y1 + ny * off, ch);
};
// 楕円弧。a0..a1 は度（0=右, 90=下）。rot で楕円ごと傾ける。gaps で欠けを作る
export const ARC = (G, cx, cy, rx, ry, a0, a1, ch, gaps = [], rot = 0) => {
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  for (let a = a0; a <= a1; a += 0.3) {
    if (gaps.some(([s, e]) => a >= s && a <= e)) continue;
    const t = a * Math.PI / 180, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
    P(G, cx + ex * cr - ey * sr, cy + ex * sr + ey * cr, ch);
  }
};
export const AT = (G, cx, cy, rx, ry, a, ch, rot = 0) => {
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  const t = a * Math.PI / 180, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
  P(G, cx + ex * cr - ey * sr, cy + ex * sr + ey * cr, ch);
};
export const DISC = (G, cx, cy, r, ch) => {
  for (let y = Math.ceil(cy - r); y <= cy + r; y++) for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) P(G, x, y, ch);
  }
};
export const ELL = (G, cx, cy, rx, ry, ch) => {
  for (let y = Math.ceil(cy - ry); y <= cy + ry; y++) for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) P(G, x, y, ch);
  }
};
export const RECT = (G, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(G, x, y, ch); };
export const dither = (x, y) => (Math.round(x) + Math.round(y)) % 2 === 0;
// 外縁を黒で締める：塗られたセルの4近傍が空なら k を置く
export const OUTLINE = (G, ch = 'k') => {
  const H = G.length, W = G[0].length, add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (G[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = GET(G, x + dx, y + dy); return c && c !== '.' && c !== ch; })) add.push([x, y]);
  }
  for (const [x, y] of add) G[y][x] = ch;
};
export const R = (G) => G.map((r) => r.join(''));

// 球面シェード：法線×光源を段数に量子化し、段の境目を市松で混ぜる。ramp は暗→明の文字列配列
export const SPHERE = (G, cx, cy, r, ramp, light = [-0.5, -0.62, 0.6], bias = 0.18) => {
  const ln = Math.hypot(...light), L = light.map((v) => v / ln);
  for (let y = Math.ceil(cy - r); y <= cy + r; y++) for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
    const dx = (x - cx) / r, dy = (y - cy) / r, dd = dx * dx + dy * dy;
    if (dd > 1) continue;
    const nz = Math.sqrt(1 - dd);
    const v = (dx * L[0] + dy * L[1] + nz * L[2] + bias + 1) / 2;   // 0..1
    const n = ramp.length, f = v * n;
    let i = Math.min(n - 1, Math.floor(f));
    const frac = f - i;
    if (frac < 0.22 && i > 0 && dither(x, y)) i -= 1;
    else if (frac > 0.78 && i < n - 1 && dither(x, y)) i += 1;
    P(G, x, y, ramp[i]);
  }
};

// 行長・パレット・rig の自己検査（enemies.js に入れたとき makeSprite が黙って穴を開けないため）
export function validate(def) {
  for (const [name, sp] of Object.entries(def.sprites)) {
    const w = sp.rows[0].length;
    sp.rows.forEach((row, i) => {
      if (row.length !== w) throw new Error(`${def.id}/${name}: 行${i} の長さが ${row.length}（期待 ${w}）`);
      for (const ch of row) if (ch !== '.' && !sp.palette[ch]) throw new Error(`${def.id}/${name}: 行${i} の文字 "${ch}" がパレットに無い`);
    });
  }
  for (const p of def.rig) if (!def.sprites[p.tex]) throw new Error(`${def.id}: rig tex "${p.tex}" が sprites に無い`);
}
// 占有（ドット単位）。origin の既定は render-boss-rig と同じ
const DEF_ORG = { armR: [0.5, 0.12], armL: [0.5, 0.12], legR: [0.5, 0.1], legL: [0.5, 0.1], cannon: [0.15, 0.5] };
export function bbox(def) {
  let l = 1e9, r = -1e9, t = 1e9, b = -1e9;
  for (const p of def.rig) {
    const sp = def.sprites[p.tex]; const w = sp.rows[0].length, h = sp.rows.length;
    const org = p.origin || DEF_ORG[p.role] || [0.5, 0.5];
    const x0 = p.ox - (p.mirror ? (1 - org[0]) : org[0]) * w, y0 = p.oy - org[1] * h;
    l = Math.min(l, x0); r = Math.max(r, x0 + w); t = Math.min(t, y0); b = Math.max(b, y0 + h);
  }
  return { l, r, t, b, w: r - l, h: b - t };
}
