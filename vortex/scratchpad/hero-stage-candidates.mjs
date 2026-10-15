// 段階の絵の候補（ジャム版＝変化は 1 回「第一の封印が砕ける」2026-10-15 20:13 合格の中身）＋相棒リバの目（蒼→深い藍へ 1 段）
//   正典 src/data/hero.js の立ち姿（正面・背中・横顔）に差分を当てて「変化前／A 控えめ／B 本命／C 強」を並べる。軸は 1 つ＝蒼の脈がどこまで走るか
//   共通の差分（A〜C 同じ）＝帯が砕けて黒い割れ目（cmc）・爪が開く・二の腕に漆黒の筋 1 本・前髪の一房が額の 3 分の 1 へ
//   服＝player.gd OUTFITS 2（漆黒＋黒のズボン）・背景＝project.godot の既定色。リバの頭＝hand.gd の RIBA_PROF を「3 尾の先」の置き場に写す（照りと目のにじみも）
//   使い方: node vortex/scratchpad/hero-stage-candidates.mjs → Desktop の 1015_ フォルダへ PNG と labels.json（日本語の見出しは stamp-labels.ps1 が後から描く）
import fs from 'node:fs';
import zlib from 'node:zlib';
import { HERO_FRAMES, HERO_PAL } from '../src/data/hero.js';

const OUT = 'C:/Users/siniz/OneDrive/Desktop/クルット・モビット/主人公ブレイズ/1015_段階の絵の候補（第一の封印が砕ける・リバの目）';
fs.mkdirSync(OUT, { recursive: true });
const BG = [10, 10, 30];                                        // default_clear_color
const OUTFIT = { s: '#17151f', p: '#0e0d14', q: '#08080c' };    // 漆黒＋黒のズボン
const RIM = '#7a86a8';                                          // hand.gd RIBA_RIM
const EYES = { E0: '#38e1ff', E1: '#2895b9', E2: '#21799f', E3: '#1b5c85', E4: '#15406a' };   // E0＝今の蒼（c）。E1〜E4＝濃藍 #0f2350 へ 40／55／70／85%
const PAL = { ...HERO_PAL, ...OUTFIT, r: RIM };

const rowsOf = (k) => HERO_FRAMES[k].rows.map((r) => r.split(''));
function put(G, y, x, s) { for (let i = 0; i < s.length; i++) G[y][x + i] = s[i]; }

// ---- 変化後（第一の封印が砕ける）
const FACINGS = {
  // 髪＝髪の画素の 3 分の 2 を漆黒に（10-15 21:49 ユーザー「半分では目立たない」）・目の真上の 1 画素は肌のまま（「髪と目が黒でつながっておかしい」）
  down: { key: 'idle', arms: [3, 14], hair: [[0, 8, 'mmm'], [1, 7, 'mmmm']], streak: [[7, 14, 'm']] },          // 8/12。画面左の二の腕はリバの尾に隠れている＝筋は右だけ
  up: { key: 'back_idle', arms: [3, 14], hair: [[0, 9, 'mmm'], [1, 9, 'mmmm'], [2, 9, 'mmmm'], [3, 9, 'mmmm']], streak: [[7, 5, 'm'], [7, 14, 'm']] },   // 15/22＝一房の側から後ろ頭へ
  right: { key: 'side_r_idle', arms: [9], hair: [[0, 9, 'mmm'], [1, 9, 'mmmm'], [2, 9, 'mm']], streak: [[7, 10, 'm']] },   // 10/15＝額の側から後ろへ
};
function after(f, vein) {
  const G = rowsOf(f.key);
  for (const [y, x, s] of f.hair) put(G, y, x, s);
  for (const [y, x, s] of f.streak) put(G, y, x, s);
  for (const a of f.arms) {
    put(G, 10, a, 'cmc');                 // 帯が砕ける＝真ん中が黒い割れ目
    put(G, 11, a, 'gcg');                 // 割れ目から蒼の脈
    if (vein >= 1) put(G, 12, a, 'gcg');  // B＝拳（h）までつながる
    if (vein >= 2) put(G, 13, a, 'chc');  // C＝拳の黒も蒼に
    const leg = G[14][a + 1] === 'p';     // 横顔＝爪の間に奥の脚が見えている
    G[14][a - 1] = 'm'; G[14][a] = '.'; G[14][a + 1] = leg ? 'p' : '.'; G[14][a + 2] = '.'; G[14][a + 3] = 'm';   // 爪が開く（3→5 画素）
  }
  return G;
}
const VARIANTS = [
  { id: '今', make: (f) => rowsOf(f.key) },
  { id: 'A', make: (f) => after(f, 0) },
  { id: 'B', make: (f) => after(f, 1) },
  { id: 'C', make: (f) => after(f, 2) },
];

// ---- 相棒リバ（hand.gd の写し）。頭＝RIBA_PROF・置き場 3「尾の先」・体の後ろ（背中だけ前）。照り＝首の帯と垂れた尾の縁
const RIBA_PROF = ['.g...', 'ggggg', 'gmmcg', '.ggg.'];
const RIBA = {
  down: { at: [1, 4], right: true, front: false, band: [7, 11], edge: [[6, 6], [5, 7], [5, 8]] },
  up: { at: [13, 2], right: true, front: true, band: [7, 12], edge: [[9, 6], [11, 7], [11, 8], [9, 9]] },
  right: { at: [1, 5], right: false, front: false, band: [8, 11], edge: [[6, 6], [7, 6], [5, 7], [5, 8]] },
};
function withRiba(G, facing) {
  const r = RIBA[facing];
  const eyes = [];
  for (let x = r.band[0]; x <= r.band[1]; x++) G[5][x] = 'r';
  for (const [x, y] of r.edge) G[y][x] = 'r';
  RIBA_PROF.forEach((row, j) => {
    const s = r.right ? row : [...row].reverse().join('');
    [...s].forEach((ch, i) => {
      if (ch === '.') return;
      const x = r.at[0] + i, y = r.at[1] + j;
      if (!r.front && G[y][x] !== '.') return;
      G[y][x] = ch === 'g' ? 'r' : ch === 'c' ? 'E' : 'm';
      if (ch === 'c') eyes.push([x, y]);
    });
  });
  return { G, eyes };
}

// ---- 攻撃中の腕（hand.gd の描き方のまね＝二の腕 4・前腕 6（縁 3 列の真ん中が漆黒・肘寄り 30% に帯）・手 4×4）。右へ伸ばした形
const FIST = ['gmm.', 'mmhm', 'mmhm', 'gmm.'];
const CLAW = ['gm.m', 'mmh.', 'mmh.', 'gm.m'];
const CLAW_OPEN = ['gm..m', 'mmhm.', 'mmhm.', 'gm..m'];   // 爪が開く＝3 本の爪が外へ割れる（新しい手の絵の候補）
function armMock(vein, hand) {
  const G = Array.from({ length: 4 }, () => Array(15).fill('.'));
  put(G, 2, 0, 'ffff');                         // 二の腕（肌）
  for (let x = 4; x < 10; x++) { G[1][x] = 'g'; G[2][x] = 'm'; G[3][x] = 'g'; }
  G[1][6] = G[2][6] = G[3][6] = 'c';            // 封印の帯
  if (vein >= 0) {                              // 変化後
    G[2][1] = 'm';                              // 二の腕の筋
    G[2][6] = 'm';                              // 帯の割れ目
    G[2][7] = 'c';                              // 脈
    if (vein >= 1) G[2][8] = G[2][9] = 'c';     // 拳まで
  }
  hand.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') G[j][9 + i] = ch; }));
  if (vein >= 2) { G[1][9] = G[1][10] = G[2][9] = G[2][10] = 'c'; }   // 拳の甲も蒼
  return G;
}

// ---- 描画
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function luma([r, g, b]) { return 0.299 * r + 0.587 * g + 0.114 * b; }
function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }
  return { w, h, px };
}
function blit(cv, rows, palette, ox, oy, scale) {
  for (let sy = 0; sy < rows.length; sy++) for (let sx = 0; sx < rows[0].length; sx++) {
    const ch = rows[sy][sx];
    if (ch === '.' || !palette[ch]) continue;
    const [r, g, b] = hex(palette[ch]);
    for (let py = 0; py < scale; py++) for (let px = 0; px < scale; px++) {
      const X = ox + sx * scale + px, Y = oy + sy * scale + py;
      if (X < 0 || Y < 0 || X >= cv.w || Y >= cv.h) continue;
      const i = (Y * cv.w + X) * 3;
      cv.px[i] = r; cv.px[i + 1] = g; cv.px[i + 2] = b;
    }
  }
}
// 目のにじみ（hand.gd＝4×4 world px の光を α0.35 で目の中心に）。world 1px＝絵の 1/3 画素
function glow(cv, cx, cy, rad, color, alpha) {
  const [r, g, b] = hex(color);
  for (let Y = Math.floor(cy - rad); Y <= Math.ceil(cy + rad); Y++) for (let X = Math.floor(cx - rad); X <= Math.ceil(cx + rad); X++) {
    if (X < 0 || Y < 0 || X >= cv.w || Y >= cv.h) continue;
    const d = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy) / rad;
    if (d >= 1) continue;
    const a = alpha * (1 - d);
    const i = (Y * cv.w + X) * 3;
    cv.px[i] = Math.round(cv.px[i] * (1 - a) + r * a); cv.px[i + 1] = Math.round(cv.px[i + 1] * (1 - a) + g * a); cv.px[i + 2] = Math.round(cv.px[i + 2] * (1 - a) + b * a);
  }
}
let TBL = null;
function crc32(buf) {
  if (!TBL) { TBL = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TBL[n] = c; } }
  let c = -1; for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ -1;
}
function writePng(cv, file) {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h); let o = 0;
  for (let y = 0; y < cv.h; y++) { raw[o++] = 0; for (let x = 0; x < cv.w * 3; x++) raw[o++] = cv.px[y * cv.w * 3 + x]; }
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'ascii'), d]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const labels = [];   // stamp-labels.ps1 が描く日本語の見出し
function sheet(file, w, h, draw) {
  const cv = canvas(w, h);
  const items = [];
  draw(cv, (x, y, text, size = 11) => items.push({ x, y, text, size }));
  const path = `${OUT}/${file}`;
  writePng(cv, path);
  labels.push({ file: path, items });
  console.log('wrote', file, `${w}x${h}`);
}

// 01 立ち姿＝正面・背中・横顔 × 今・A・B・C（上＝3 倍＝実プレイの等倍・下＝6 倍）。リバ（目は今の蒼）も乗せる
{
  const facings = ['down', 'up', 'right'];
  const names = { down: '正面', up: '背中', right: '横顔' };
  const vnames = { '今': '今（変化前）', A: 'A 控えめ＝脈は 1 画素', B: 'B 本命＝脈が拳の芯まで', C: 'C 強＝拳の黒も蒼に' };
  const L = 170, T = 30;
  const blocks = [[3, 0], [6, 4 * (18 * 3 + 16) + 10]];
  const W = L + 3 * (20 * 6 + 16) + 10, H = T + blocks[1][1] + 4 * (18 * 6 + 16) + 10;
  sheet('01_立ち姿_今とA・B・C（上は実プレイの等倍・下は2倍）.png', W, H, (cv, label) => {
    for (const [scale, y0] of blocks) {
      label(8, T + y0 - 22, scale === 3 ? '実プレイの等倍（3 倍）' : '2 倍（6 倍）', 10);
      facings.forEach((f, ci) => label(L + ci * (20 * 6 + 16) + 2, T + y0 - 22, names[f], 10));
      VARIANTS.forEach((v, vi) => {
        const y = T + y0 + vi * (18 * scale + 16);
        label(8, y + 18 * scale / 2 - 9, vnames[v.id], 10);
        facings.forEach((f, ci) => {
          const x = L + ci * (20 * 6 + 16);
          const { G, eyes } = withRiba(v.make(FACINGS[f]), f);
          blit(cv, G, { ...PAL, E: EYES.E0 }, x, y, scale);
          for (const [ex, ey] of eyes) glow(cv, x + (ex + 0.5) * scale, y + (ey + 0.5) * scale, 2 * scale / 3, EYES.E0, 0.35);
        });
      });
    }
  });
}

// 02 攻撃中の腕（hand.gd のまね）＝拳（突き）と爪（掴み・投げ）× 今・A・B・C。6 倍と 12 倍
{
  const hands = [['拳（突き）', FIST, FIST], ['爪（掴み）', CLAW, CLAW_OPEN]];
  const vnames = { '今': '今', A: 'A', B: 'B', C: 'C' };
  const L = 110, T = 30;
  const cw = 15 * 12 + 24;
  const W = L + 2 * cw, H = T + 4 * (4 * 12 + 4 * 6 + 24) + 10;
  sheet('02_攻撃中の腕_拳と爪（6倍と12倍）.png', W, H, (cv, label) => {
    hands.forEach(([hn], hi) => label(L + hi * cw, T - 24, hn, 10));
    VARIANTS.forEach((v, vi) => {
      const y = T + vi * (4 * 12 + 4 * 6 + 24);
      label(8, y + 20, vnames[v.id] + (v.id === '今' ? '' : '（変化後）'), 10);
      hands.forEach(([, before, open], hi) => {
        const x = L + hi * cw;
        const vein = v.id === '今' ? -1 : v.id === 'A' ? 0 : v.id === 'B' ? 1 : 2;
        const G = armMock(vein, vein < 0 ? before : open);
        blit(cv, G, PAL, x, y, 6);
        blit(cv, G, PAL, x, y + 4 * 6 + 6, 12);
      });
    });
  });
}

// 03 リバの目＝今の蒼と藍 4 段 × 正面・横顔（3 倍・6 倍）＋頭だけ 12 倍。にじみの光も同じ色
{
  const keys = Object.keys(EYES);
  const L = 70, T = 30;
  const cw = 20 * 6 + 20;
  const rows = [['正面 3 倍', 'down', 3], ['横顔 3 倍', 'right', 3], ['正面 6 倍', 'down', 6], ['横顔 6 倍', 'right', 6]];
  const rh = [18 * 3 + 14, 18 * 3 + 14, 18 * 6 + 14, 18 * 6 + 14, 4 * 12 + 14];
  const W = L + keys.length * cw, H = T + rh.reduce((a, b) => a + b, 0) + 10;
  sheet('03_リバの目_蒼と藍4段（正面・横顔）.png', W, H, (cv, label) => {
    keys.forEach((k, ki) => label(L + ki * cw, T - 24, k === 'E0' ? '今 蒼 ' + EYES[k] : `藍${ki} ${EYES[k]}`, 10));
    let y = T;
    rows.forEach(([rn, f, scale], ri) => {
      label(8, y + 18 * scale / 2 - 9, rn, 10);
      keys.forEach((k, ki) => {
        const x = L + ki * cw;
        const { G, eyes } = withRiba(rowsOf(FACINGS[f].key), f);
        blit(cv, G, { ...PAL, E: EYES[k] }, x, y, scale);
        for (const [ex, ey] of eyes) glow(cv, x + (ex + 0.5) * scale, y + (ey + 0.5) * scale, 2 * scale / 3, EYES[k], 0.35);
      });
      y += rh[ri];
    });
    label(8, y + 14, '頭 12 倍', 10);
    keys.forEach((k, ki) => {
      const x = L + ki * cw;
      const G = RIBA_PROF.map((r) => [...r].map((ch) => ch === 'g' ? 'r' : ch === 'c' ? 'E' : ch));
      blit(cv, G, { ...PAL, E: EYES[k] }, x, y, 12);
      glow(cv, x + 3.5 * 12, y + 2.5 * 12, 8, EYES[k], 0.35);
    });
  });
  console.log('目の輝度（体の漆黒 m＝%s・照り r＝%s）', luma(hex(PAL.m)).toFixed(0), luma(hex(RIM)).toFixed(0));
  for (const [k, v] of Object.entries(EYES)) console.log(`  ${k} ${v} 輝度 ${luma(hex(v)).toFixed(0)}（体の ${(luma(hex(v)) / luma(hex(PAL.m))).toFixed(1)} 倍）`);
}

// 04 確定案＝今（蒼の目）と B＋藍2 を並べる（10-15 21:49 ユーザー決定）
{
  const facings = ['down', 'up', 'right'];
  const names = { down: '正面', up: '背中', right: '横顔' };
  const pairs = [['今（変化前）', (f) => rowsOf(f.key), EYES.E0], ['変化後 B＋藍2', (f) => after(f, 1), EYES.E2]];
  const L = 120, T = 30, cw = 20 * 6 + 16;
  const blocks = [[3, 0], [6, 2 * (18 * 3 + 16) + 10]];
  const W = L + 3 * cw + 10, H = T + blocks[1][1] + 2 * (18 * 6 + 16) + 10;
  sheet('04_確定案_今とB＋藍2（上は実プレイの等倍・下は2倍）.png', W, H, (cv, label) => {
    for (const [scale, y0] of blocks) {
      label(8, T + y0 - 22, scale === 3 ? '実プレイの等倍' : '2 倍', 10);
      facings.forEach((f, ci) => label(L + ci * cw + 2, T + y0 - 22, names[f], 10));
      pairs.forEach(([pn, make, eye], pi) => {
        const y = T + y0 + pi * (18 * scale + 16);
        label(8, y + 18 * scale / 2 - 9, pn, 10);
        facings.forEach((f, ci) => {
          const x = L + ci * cw;
          const { G, eyes } = withRiba(make(FACINGS[f]), f);
          blit(cv, G, { ...PAL, E: eye }, x, y, scale);
          for (const [ex, ey] of eyes) glow(cv, x + (ex + 0.5) * scale, y + (ey + 0.5) * scale, 2 * scale / 3, eye, 0.35);
        });
      });
    }
  });
}

fs.writeFileSync(new URL('./.labels.json', import.meta.url), JSON.stringify(labels));   // ASCII の場所＝日本語のパスは PowerShell の引数で化ける
