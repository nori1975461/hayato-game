// 2026-09-23 ジャム版オープニング 幕1「四柱の神」の影絵データを src/data/gods.js へ焼く生成スクリプト。
//
// なぜ焼くのか：四神柱は素性がばらばらで、そのままでは 1 つの画面に並べられない。
//   ・堕天の大聖堂／軌道神核＝ゲーム内に rig がある（enemies.js）
//   ・腐蝕の玉座／蒼神骸華＝**src に存在しない**（設計は scratchpad の候補スクリプトだけ）
//   ・骸華は素材が巨大（合成 515×337・元のパーツは eclipse 262×262 や arms 182×516）＝そのままは載せられない
//   → **合成して 1 枚にし、必要なら整数で縮めてから**「文字の行＋パレット」で焼く。
//     ドットの行は設計スクリプトが唯一の正典なので、手で写さず機械で差し込む（emit-maou-data.mjs と同じ作法）。
//
// 縮小は「多数決」（block 内でいちばん多い文字を採る）＝パレットに無い中間色を作らないのでドット絵のまま縮む。
//   平均を取ると色が濁り、間引きだと細い線が消える。
//
// 再生成：node scratchpad/emit-god-pillars.mjs        （--png で確認用の等倍プレビューも書く）
//   設計（throne-candidates.mjs／gaika-candidates.mjs）や enemies.js の rig を直したら、これを再実行して
//   git diff を見る。差分が出なければ焼き直しは不要。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THRONE } from './throne-candidates.mjs';
import { GAIKA } from './gaika-candidates.mjs';
import { CATHEDRAL, MAOU } from '../src/data/enemies.js';
import { makeCanvas, writePng, PART_DEPTH, PART_ORIGIN } from './render-boss-rig.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../src/data/gods.js');
const PNG = path.join(HERE, 'god-pillars');

// ⚠️ 重ね順と origin は**正典（render-boss-rig.mjs＝boss.js の写し）から借りる**。ここで作り直すと
//   表に無い役割（骸華の trackL/baseR など）が最前面へ回り、殻や月牙が体の上に乗る（2026-09-23 に踏んだ）。
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&+-=<>?@^~';

// rig を 1ユニット=1ドットで 1 枚に合成する。'.' は透明。
function compose(def, rig) {
  const parts = rig.map((r) => ({
    ...r,
    depth: PART_DEPTH[r.role] != null ? PART_DEPTH[r.role] : 9,
    origin: r.origin || PART_ORIGIN[r.role] || [0.5, 0.5],
  })).sort((a, b) => a.depth - b.depth);
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
  const G = Array.from({ length: y1 - y0 }, () => Array(x1 - x0).fill('.'));
  for (const { p, sp, w, h, left, top } of placed) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = sp.rows[y][p.mirror ? (w - 1 - x) : x];
        if (ch === '.' || ch === ' ') continue;
        const col = sp.palette[ch];
        if (col) G[top - y0 + y][left - x0 + x] = col;   // いったん色そのものを入れる（パレットは最後に組む）
      }
    }
  }
  return G;
}

function crop(G) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < G.length; y++) for (let x = 0; x < G[0].length; x++) {
    if (G[y][x] === '.') continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return G.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1));
}

// 影絵を並べる枠（JamOpening の BOXW／BOXH と同じ数字。test-core が食い違いを見張る）。
export const BOXW = 148, BOXH = 140;

// 枠に合わせた大きさへ多数決で縮める（区画でいちばん多い文字を採る）。
//   ⚠️**縮めるときだけ**焼き直す。伸ばすほうは焼かずに Phaser へ任せる（焼くとドットが倍になるだけで情報は増えず、データだけ太る）。
//   ⚠️整数分の1（1/2 など）では足りない＝骸華 第一案（142×167）を 1/2 にしたら光背の輪が途切れ蓮華座が潰れた（2026-09-23 に実測）。
//     **表示する大きさぴったり**へ落とすと、実行時の間引きも起きず線が残る。
//   平均を取るとパレットに無い中間色ができ、間引きだと細い線が消えるので、どちらも使わない。
function fitTo(G, W2, H2) {
  const H = G.length, W = G[0].length;
  const out = Array.from({ length: H2 }, () => Array(W2).fill('.'));
  for (let y = 0; y < H2; y++) {
    const sy0 = Math.floor((y * H) / H2), sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * H) / H2));
    for (let x = 0; x < W2; x++) {
      const sx0 = Math.floor((x * W) / W2), sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * W) / W2));
      const count = new Map();
      let empty = 0, total = 0;
      for (let sy = sy0; sy < sy1 && sy < H; sy++) {
        for (let sx = sx0; sx < sx1 && sx < W; sx++) {
          total++;
          const c = G[sy][sx];
          if (c === '.') { empty++; continue; }
          count.set(c, (count.get(c) || 0) + 1);
        }
      }
      if (empty > total / 2 || count.size === 0) continue;
      let best = null, bn = -1;
      for (const [c, k] of count) if (k > bn) { bn = k; best = c; }
      out[y][x] = best;
    }
  }
  return out;
}

// 色のグリッド → { palette, rows }。使われている色だけを文字に割り当てる（多い色から順）。
function toSprite(G) {
  const freq = new Map();
  for (const row of G) for (const c of row) if (c !== '.') freq.set(c, (freq.get(c) || 0) + 1);
  const cols = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (cols.length > CHARS.length) throw new Error('色が多すぎる: ' + cols.length);
  const palette = {}, ch = new Map();
  cols.forEach((c, i) => { ch.set(c, CHARS[i]); palette[CHARS[i]] = c; });
  const rows = G.map((row) => row.map((c) => (c === '.' ? '.' : ch.get(c))).join(''));
  return { palette, rows };
}

// ★四柱。並びはユーザー指定（2026-09-23）＝堕天の大聖堂／腐蝕の玉座／軌道神核／蒼神骸華。
//   reveal＝最後の一瞬だけ本当の色で見せる「身体の4分の1」（左上を 0,0 とした割合・面積が全体の 1/4）。
const LIST = [
  { id: 'cathedral', name: '堕天の大聖堂', def: CATHEDRAL, rig: CATHEDRAL.rig,
    reveal: [0.25, 0.0, 0.5, 0.5], revealNote: '光輪と薔薇窓（上の中央）' },
  { id: 'throne', name: '腐蝕の玉座', def: THRONE, rig: THRONE.rig,
    reveal: [0.25, 0.0, 0.5, 0.5], revealNote: '冠と王（上の中央）' },
  { id: 'godcore', name: '軌道神核', def: { ...MAOU, sprites: MAOU.trueSprites }, rig: MAOU.trueRig,
    reveal: [0.25, 0.25, 0.5, 0.5], revealNote: '単眼（真ん中）' },
  // ★2026-09-23 ユーザー指示「骸華は**第一案**を載せて。第二案は第一案を倒したら現れる（第二形態）」＝
  //   オープニングに並ぶのは**第一形態＝第一案（GAIKA・第28案改４）**。第二案（GAIKA2_FINAL）は使わない。
  //   縦長（142×167）なので 1/2 に縮めて 71×84＝枠（高さ116）へ 1.38 倍で伸ばす（実行時に縮めると細い線が消える）。
  { id: 'gaika', name: '蒼神骸華', def: GAIKA, rig: GAIKA.rig,
    reveal: [0.25, 0.0, 0.5, 0.5], revealNote: '宝冠と光背（上の中央）' },
];

const built = LIST.map((g) => {
  const raw = crop(compose(g.def, g.rig));
  const s0 = Math.min(BOXW / raw[0].length, BOXH / raw.length);
  // 枠より大きい柱だけ、枠にぴったりの大きさへ落としてから焼く（小さい柱は原寸のまま＝伸ばすのは Phaser に任せる）
  const fitted = s0 < 1 ? fitTo(raw, Math.round(raw[0].length * s0), Math.round(raw.length * s0)) : raw;
  const sp = toSprite(crop(fitted));
  const how = s0 < 1 ? `枠に合わせて ${(s0 * 100).toFixed(0)}% へ` : '原寸のまま';
  console.log(`${g.name}: 合成 ${raw[0].length}×${raw.length} → ${how} → ${sp.rows[0].length}×${sp.rows.length}・色 ${Object.keys(sp.palette).length}`);
  return { ...g, sp, srcW: raw[0].length, srcH: raw.length, how };
});

const EOL = '\r\n';
const palLine = (p) => '{ ' + Object.entries(p).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }';
const body = built.map((g) => [
  `  // ${g.name}　合成 ${g.srcW}×${g.srcH} → ${g.how}／一瞬見せるのは ${g.revealNote}`,
  `  {`,
  `    id: '${g.id}', name: '${g.name}', reveal: [${g.reveal.join(', ')}],`,
  `    sprite: { palette: ${palLine(g.sp.palette)}, rows: [`,
  ...g.sp.rows.map((r) => `      '${r}',`),
  `    ] },`,
  `  },`,
].join(EOL)).join(EOL);

const out = [
  `// data/gods.js — 金属生命体マキナの「四柱の神」の姿（ジャム版オープニング 幕1 の影絵）。`,
  `//`,
  `// ⚠️ **手で書き換えない**。\`node scratchpad/emit-god-pillars.mjs\` が設計から焼いたもの。`,
  `//   元：堕天の大聖堂＝enemies.js CATHEDRAL.rig ／ 軌道神核＝enemies.js MAOU.trueRig ／`,
  `//       腐蝕の玉座＝scratchpad/throne-candidates.mjs ／ 蒼神骸華＝scratchpad/gaika-candidates.mjs（GAIKA＝第一案）。`,
  `//   玉座と骸華は**ゲーム本体には居ない**（行動と攻撃が未設計）。ここにあるのは姿だけで、オープニングの影絵にしか使わない。`,
  `//   骸華は**第一案（第一形態）**。第二案は第一案を倒したあとに現れる第二形態なのでここには出さない。`,
  `//`,
  `// reveal＝最後の一瞬だけ本当の色で見せる「身体の4分の1」（[x, y, 幅, 高さ] の割合・左上が 0,0）。`,
  `export const GOD_PILLARS = [`,
  body,
  `];`,
  ``,
].join(EOL);
fs.writeFileSync(OUT, out, 'utf8');
console.log('書いた:', path.relative(path.resolve(HERE, '..'), OUT), (out.length / 1024).toFixed(1) + 'KB');

// ---- 確認用プレビュー（--png）：オープニングと同じ並び・同じ大きさで、影絵と「4分の1」を描く
if (process.argv.includes('--png')) {
  fs.mkdirSync(PNG, { recursive: true });
  const W = 640, H = 360, XS = [92, 244, 396, 548], CY = 118;
  const cv = makeCanvas(W, H);
  const addPx2 = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; cv.px[i] = Math.min(255, cv.px[i] + r); cv.px[i + 1] = Math.min(255, cv.px[i + 1] + g); cv.px[i + 2] = Math.min(255, cv.px[i + 2] + b); };
  const backlight = (cx, cy, R, col, mul) => {
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const d = Math.hypot(x - cx, y - cy); if (d > R) continue;
      const a = Math.pow(1 - d / R, 2) * mul;
      addPx2(x, y, col[0] * a, col[1] * a, col[2] * a);
    }
  };
  const put = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; cv.px[i] = r; cv.px[i + 1] = g; cv.px[i + 2] = b; };
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  built.forEach((g, i) => { backlight(XS[i], CY - 8, 92, [255, 210, 63], 0.5); });
  built.forEach((g, i) => {
    const rows = g.sp.rows, w = rows[0].length, h = rows.length;
    const s = Math.min(BOXW / w, BOXH / h);
    const left = XS[i] - w * s / 2, top = CY - h * s / 2;
    const rv = g.reveal;
    const rx0 = w * rv[0], ry0 = h * rv[1], rx1 = rx0 + w * rv[2], ry1 = ry0 + h * rv[3];
    for (let y = 0; y < Math.round(h * s); y++) {
      for (let x = 0; x < Math.round(w * s); x++) {
        const sx = Math.floor(x / s), sy = Math.floor(y / s);
        const ch = rows[sy] && rows[sy][sx];
        if (!ch || ch === '.') continue;
        const inRv = sx >= rx0 && sx < rx1 && sy >= ry0 && sy < ry1;
        const c = inRv ? hex(g.sp.palette[ch]) : [8, 8, 14];
        put(Math.round(left) + x, Math.round(top) + y, c[0], c[1], c[2]);
      }
    }
  });
  writePng(cv, path.join(PNG, 'pillars-silhouette.png'));
  // 2×2 の拡大（約2倍）＝「4分の1」が何を見せているかを確かめる用
  const cv2 = makeCanvas(640, 350);
  const put2 = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= 640 || y >= 350) return; const i = (y * 640 + x) * 3; cv2.px[i] = r; cv2.px[i + 1] = g; cv2.px[i + 2] = b; };
  built.forEach((g, i) => {
    const rows = g.sp.rows, w = rows[0].length, h = rows.length;
    const cw = 312, chh = 168, ox = (i % 2) * 320 + 4, oy = Math.floor(i / 2) * 175 + 4;
    const s2 = Math.min(cw / w, chh / h);
    const rv = g.reveal, rx0 = w * rv[0], ry0 = h * rv[1], rx1 = rx0 + w * rv[2], ry1 = ry0 + h * rv[3];
    const left = ox + (cw - w * s2) / 2, top = oy + (chh - h * s2) / 2;
    for (let y = 0; y < Math.round(h * s2); y++) for (let x = 0; x < Math.round(w * s2); x++) {
      const sx = Math.floor(x / s2), sy = Math.floor(y / s2);
      const ch = rows[sy] && rows[sy][sx];
      if (!ch || ch === '.') continue;
      const inRv = sx >= rx0 && sx < rx1 && sy >= ry0 && sy < ry1;
      const c = hex(g.sp.palette[ch]);
      const k = inRv ? 1 : 0.42;   // 全身を色で見せ、いま選んでいる「4分の1」だけ明るくする（窓の選び直し用）
      put2(Math.round(left) + x, Math.round(top) + y, c[0] * k, c[1] * k, c[2] * k);
    }
  });
  // 四分割の目安線（窓を選び直すとき用）
  built.forEach((g, i) => {
    const rows = g.sp.rows, w = rows[0].length, h = rows.length;
    const cw = 312, chh = 168, ox = (i % 2) * 320 + 4, oy = Math.floor(i / 2) * 175 + 4;
    const s2 = Math.min(cw / w, chh / h);
    const left = ox + (cw - w * s2) / 2, top = oy + (chh - h * s2) / 2;
    for (const fx of [0.25, 0.5, 0.75]) for (let y = 0; y < h * s2; y += 3) put2(Math.round(left + w * s2 * fx), Math.round(top) + y, 60, 70, 110);
    for (const fy of [0.25, 0.5, 0.75]) for (let x = 0; x < w * s2; x += 3) put2(Math.round(left) + x, Math.round(top + h * s2 * fy), 60, 70, 110);
  });
  writePng(cv2, path.join(PNG, 'pillars-zoom.png'));
  console.log('プレビュー:', path.relative(path.resolve(HERE, '..'), path.join(PNG, 'pillars-silhouette.png')));
}
