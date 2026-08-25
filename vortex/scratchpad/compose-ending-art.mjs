// R34 エンディングのキーイラストを組む道具。
// 実プレイFB「エンディングがしょぼすぎる。……主人公とモビットが一緒に戦っているイラストを
// 入れるとかできないか」。96×54 の1枚絵を描き、PNG化して**実プレイの縮尺で**確かめる。
// ⚠️ 既存スプライトの拡大は不可（[[feedback_boss_sprite_originality]]）。
//    ここで描くキャラは「イラスト用の新しいポーズ」であって、ゲーム内スプライトの流用ではない。
// 出力: scratchpad/ending-art.png（6倍）/ ending-art-1x.png（等倍）/ src/data/ending_art.js
// node vortex/scratchpad/compose-ending-art.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = 96, H = 54;
const NL = String.fromCharCode(10);

// ---- パレット（ゲーム本編の配色から外れないこと） ----
const PAL = {
  // 空・光
  '1': '#070b1c', '2': '#101a3d', '3': '#1d2c68', '4': '#33509f', '5': '#6f97e8', '6': '#bcd6ff',
  '7': '#ffffff', '8': '#ffe9a8',
  // 主人公
  b: '#2f6fe4', B: '#1a4aa8', w: '#f2f4f8', W: '#c3cede', f: '#f0c8a0', F: '#c9976e',
  k: '#7a5a3c', K: '#523c26', e: '#2a2028', c: '#ffd23f', h: '#ff8a1f', s: '#9fe0ff',
  // マオウレクス（メタリックパープル）
  p: '#a86bff', P: '#5b2b9e', q: '#2c1450', r: '#ff4d6d', R: '#b01c22', g: '#4ad4ff',
  // モビット
  y: '#7fd8ff', Y: '#4a9fd8',   // スターパピー
  n: '#ffe066', N: '#d8a838',   // ピカビット
  m: '#9dff70', M: '#5fbf3f',   // トゲロン
  o: '#ff9e66', t: '#ffb3d9', j: '#1b3b5f',
  // 地面
  d: '#2a2438', D: '#14101f', l: '#4f4670',
};

const grid = [];
for (let y = 0; y < H; y++) grid.push(new Array(W).fill('.'));

const put = (x, y, ch) => {
  if (ch === '.' || x < 0 || y < 0 || x >= W || y >= H) return;
  grid[y | 0][x | 0] = ch;
};
const rect = (x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch);
};
const disc = (cx, cy, r, ch) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = (x - cx) / r, dy = (y - cy) / r;
      if (dx * dx + dy * dy <= 1) put(x, y, ch);
    }
  }
};
const ellipse = (cx, cy, rx, ry, ch) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(x, y, ch);
    }
  }
};
// 太さ付きの線（腕・脚・光条を引く主役）
const line = (x0, y0, x1, y1, th, ch) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (th <= 1) put(Math.round(x), Math.round(y), ch);
    else disc(x, y, th / 2, ch);
  }
};
// 手描きのコマ絵を貼る（'.' は透過）
const stamp = (rows, ox, oy) => {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) put(ox + x, oy + y, rows[y][x]);
  }
};

// ================== ① 空 ==================
// ⚠️ 段でベタ塗りすると、6倍表示で**水平の縞**がはっきり出た（実測のスクショで発覚）。
//    かといって空全体を混ぜると、今度は画面いっぱいが網点になって騒がしい。
//    段の芯はベタのまま、**境目の上下4行だけ**を4×4の整列ディザで溶かす（ドット絵の階調の定石）。
const SKY = [[0, 9, '1'], [9, 21, '2'], [21, 33, '3'], [33, H, '2']];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
for (const [y0, y1, ch] of SKY) rect(0, y0, W - 1, y1 - 1, ch);
for (let b = 1; b < SKY.length; b++) {
  const edge = SKY[b][0], prev = SKY[b - 1][2], cur = SKY[b][2];
  for (let dy = -4; dy <= 3; dy++) {
    const y = edge + dy;
    if (y < 0 || y >= H) continue;
    const t = (dy + 4.5) / 8.5;
    for (let x = 0; x < W; x++) {
      put(x, y, t > (BAYER[y % 4][x % 4] + 0.5) / 16 ? cur : prev);
    }
  }
}

// 決定的な星（Math.random 禁止の作法に合わせ、固定のLCGで散らす）
let seed = 0x2f6fe4;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let i = 0; i < 130; i++) {
  const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 42);
  put(x, y, rnd() < 0.25 ? '7' : rnd() < 0.5 ? '6' : '5');
}

// ================== ② 敵の核から差す光条（控えめに。主役を食わせない） ==================
const CX = 74, CY = 27;
for (let a = 0; a < 12; a++) {
  const ang = (Math.PI * 2 * a) / 12 + 0.18;
  const len = 34 + rnd() * 26;
  line(CX, CY, CX + Math.cos(ang) * len, CY + Math.sin(ang) * len, 1, a % 3 === 0 ? '4' : '3');
}

// ================== ③ マオウレクス（逆光のシルエット・崩れかけ） ==================
// 「顔と角と割れた核」だけを読ませる。爆発で塗りつぶすと**ただの爆炎**になって誰と戦って
// いるのか分からなくなる（1枚目の試作がまさにそれだった）。
ellipse(74, 34, 21, 15, 'q');                                  // 胴
ellipse(56, 27, 10, 9, 'q'); ellipse(92, 27, 10, 9, 'q');      // 肩
ellipse(55, 26, 8, 7, 'P'); ellipse(93, 26, 8, 7, 'P');
line(54, 33, 49, 45, 6, 'q'); line(94, 33, 99, 45, 6, 'q');    // 腕
rect(69, 18, 79, 24, 'q'); rect(70, 19, 78, 23, 'P');          // 首
ellipse(74, 11, 12, 9, 'q');                                   // 頭
ellipse(74, 11, 10, 7, 'P');
line(67, 7, 57, -4, 3, 'P'); line(81, 7, 91, -4, 3, 'P');      // 角（後ろへ長く反らす）
line(67, 7, 57, -4, 1, 'p'); line(81, 7, 91, -4, 1, 'p');
rect(64, 7, 84, 8, 'q'); rect(65, 8, 83, 9, 'P');              // 眉庇（顔を機械にする）
rect(68, 9, 71, 12, 'R'); rect(77, 9, 80, 12, 'R');            // 眼
rect(69, 10, 70, 11, 'r'); rect(78, 10, 79, 11, 'r');
put(69, 10, '7'); put(78, 10, '7');
rect(70, 16, 78, 17, 'q'); rect(71, 17, 77, 18, 'P');          // 顎
for (let x = 71; x <= 77; x += 2) put(x, 17, 'p');             // 牙
// 割れた胸のコア（ここに主人公の玉が命中している）
disc(CX, CY, 9, 'P');
disc(CX, CY, 7, 'R');
disc(CX, CY, 5, 'r');
disc(CX, CY, 3, '8');
disc(CX, CY, 1.6, '7');
for (let i = 0; i < 14; i++) {                                 // 装甲の裂け目
  const ang = (Math.PI * 2 * i) / 14 + 0.2;
  line(CX + Math.cos(ang) * 8, CY + Math.sin(ang) * 8,
       CX + Math.cos(ang) * (12 + rnd() * 6), CY + Math.sin(ang) * (12 + rnd() * 6), 1,
       i % 2 ? '8' : 'r');
}

// ★逆光のふち（敵側）。玉に照らされている左半分の輪郭を1pxだけ明るい紫で抜く。
//   これが無いと夜空と同じ暗さで、巨体があることすら分からない。
{
  const BOSS_INK = new Set(['q', 'P', 'R', 'r']);
  for (let y = 0; y < 46; y++) {
    for (let x = 40; x < W; x++) {
      if (BOSS_INK.has(grid[y][x])) { grid[y][x] = 'p'; break; }
    }
  }
}

// ================== ④ 地面（前景の岩棚） ==================
for (let x = 0; x < W; x++) {
  const top = 45 + Math.round(Math.sin(x * 0.21) * 1.4 + Math.sin(x * 0.07) * 1.2);
  rect(x, top, x, H - 1, 'd');
  put(x, top, 'l');
  if ((x + Math.floor(top)) % 7 === 0) put(x, top + 2, 'D');
  rect(x, H - 3, x, H - 1, 'D');
}

// ================== ⑤ なかま ==================
// スターパピー（跳び込み）
const PUPPY = [
  '..n........n..',
  '.nnn......nnn.',
  '.nnyyyyyyyynn.',
  '..yyyyyyyyyy..',
  '.yyyyyyyyyyyy.',
  '.yyjwyyyywjyy.',
  '.yyjjyyyyjjyy.',
  '.ttyyyjjyyytt.',
  '.yyywwwwwwyyy.',
  '.yyywwwwwwyyy.',
  '..yywwwwwwyy..',
  '..yyyyyyyyyy..',
  '.YY.YY..YY.YY.',
  '.Y...Y..Y...Y.',
];
// ⚠️ スターパピーだけは主人公より**手前**に置くので、貼るのは⑥のあと（⑥bを見よ）。

// ピカビット（ビームを撃つ）
const PIKA = [
  '..n......n..',
  '.non....non.',
  '.non....non.',
  '.nnn....nnn.',
  '..nnnnnnnn..',
  '.nnnnnnnnnn.',
  '.njwnnnnwjn.',
  '.njjnnnnjjn.',
  '.tnnnwwnnnt.',
  '.nnwwwwwwnn.',
  '.nnwwwwwwnn.',
  '..nnnnnnnn..',
  '..NN....NN..',
  '..N......N..',
];
stamp(PIKA, 47, 32);
line(53, 31, 59, 27, 1, '8'); line(59, 27, 56, 24, 1, '8'); line(56, 24, 64, 23, 1, '7');

// トゲロン（ハンマーを振り上げ）
const TOGE = [
  '.m.m.m..m.m.m.',
  '.mmmmmmmmmmmm.',
  'mmmmmmmmmmmmmm',
  'mmmmmmmmmmmmmm',
  'mmjwmmmmmmwjmm',
  'mmjjmmmmmmjjmm',
  '.ttmmmmmmmmtt.',
  '.mmmmwwwwmmmm.',
  '.mmmwwwwwwmmm.',
  '.mmmwwwwwwmmm.',
  '.mmmmmmmmmmmm.',
  '..mmMMMMMMmm..',
  '..MM......MM..',
  '..M........M..',
];
stamp(TOGE, 79, 32);
line(87, 32, 92, 26, 2, 'W');
disc(93, 24, 4, 'w'); disc(93, 24, 2, 'c');

// ================== ⑥ 主人公（投げ切った瞬間・右向き） ==================
// 体はコード（太線）で組み、顔だけ手描き＝小さくても人間に見える最小の手間。
// 背後に淡い光を敷いて、夜空から人型を切り離す（1枚目は空に沈んで読めなかった）。
const HX = 20, HY = 11;
ellipse(HX + 10, HY + 12, 12, 12, '3');            // 頭と肩の後ろだけの淡い光
// なびく髪は顔より先に置く（後から重ねると棒が刺さって見える）
line(HX + 7, HY + 1, HX + 1, HY - 2, 2, 'K');
line(HX + 6, HY + 4, HX - 1, HY + 3, 2, 'K');
line(HX + 6, HY + 6, HX, HY + 8, 1, 'K');
line(HX + 8, HY + 19, HX + 3, HY + 26, 4, 'B');    // 後ろ足
line(HX + 3, HY + 26, HX + 2, HY + 30, 4, 'B');
line(HX + 12, HY + 19, HX + 17, HY + 25, 4, 'b');  // 前足（踏み込み）
line(HX + 17, HY + 25, HX + 19, HY + 30, 4, 'b');
rect(HX - 1, HY + 30, HX + 5, HY + 32, 'w');       // ブーツ
rect(HX + 16, HY + 30, HX + 22, HY + 32, 'w');
// 胴は台形。楕円で描くと**雪だるま**になって人型に見えなかった（試作2の失敗）。
for (let i = 0; i <= 10; i++) {
  const y = HY + 9 + i;
  const hw = Math.round(6.4 - i * 0.34);
  rect(HX + 10 - hw, y, HX + 10 + hw, y, 'b');
  rect(HX + 10 - hw, y, HX + 10 - hw + 1, y, 'B');
}
rect(HX + 8, HY + 12, HX + 12, HY + 13, 'c');      // 胸のクレスト（小さく）
rect(HX + 9, HY + 11, HX + 11, HY + 16, 'c');
line(HX + 5, HY + 12, HX - 4, HY + 19, 3, 'B');    // 後ろ腕（引き）
disc(HX - 5, HY + 20, 2.6, 'W');
line(HX + 14, HY + 11, HX + 25, HY + 3, 3, 'b');   // 投げ切った腕
disc(HX + 26, HY + 2, 3.4, 'w');                   // 拳（クラッシュアーム）
disc(HX + 26, HY + 2, 1.8, 'c');
rect(HX + 3, HY + 8, HX + 8, HY + 10, 'w');        // 肩（角ばらせる。丸いと雲に見えた）
rect(HX + 4, HY + 7, HX + 7, HY + 8, 'W');
rect(HX + 12, HY + 8, HX + 17, HY + 10, 'w');
rect(HX + 13, HY + 7, HX + 16, HY + 8, 'W');
const FACE = [
  '..KKKKKK..',
  '.KKKKKKKK.',
  'KKKffffKK.',
  'KKffffffK.',
  'Kffefefff.',
  '.fffffff..',
  '.fFfffF...',
  '..fffff...',
];
stamp(FACE, HX + 5, HY);
// ★逆光のふち。背後の爆発に照らされている側（右）を1pxだけ水色で抜く。
//   これが無いと、夜空でも青い装甲でも同じ明度に沈んで**輪郭が読めない**。
const HERO_INK = new Set(['b', 'B', 'w', 'W', 'f', 'F', 'k', 'K', 'c']);
for (let y = HY - 3; y <= HY + 33; y++) {
  for (let x = HX + 31; x >= HX - 8; x--) {
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    if (HERO_INK.has(grid[y][x])) { grid[y][x] = 's'; break; }
  }
}

// ================== ⑥b スターパピー（主人公より手前＝いちばん近い相棒） ==================
stamp(PUPPY, 3, 31);
for (let i = 0; i < 4; i++) line(0, 34 + i * 3, 2, 34 + i * 3, 1, '6');

// ================== ⑦ 投げた玉と、その航跡 ==================
// 主人公の拳から敵のコアへ伸びる対角線＝視線の道。太くしすぎると画面中央が白飛びする。
const FX0 = HX + 30, FY0 = HY + 2;
for (let i = 0; i <= 30; i++) {
  const t = i / 30;
  const x = FX0 + (CX - 9 - FX0) * t, y = FY0 + (CY - 6 - FY0) * t;
  const th = 1 + t * 3.2;
  disc(x, y, th / 2, t < 0.5 ? '6' : '8');
  if (t > 0.7) disc(x, y, th / 3.2, '7');
}
disc(CX - 9, CY - 6, 4, '8');
disc(CX - 9, CY - 6, 2.4, '7');
for (let i = 0; i < 10; i++) {
  const ang = (Math.PI * 2 * i) / 10 + 0.3;
  line(CX - 9 + Math.cos(ang) * 4, CY - 6 + Math.sin(ang) * 4,
       CX - 9 + Math.cos(ang) * (8 + rnd() * 5), CY - 6 + Math.sin(ang) * (8 + rnd() * 5), 1, '7');
}

// ================== 出力 ==================
const rows = grid.map((r) => r.join(''));
const used = new Set(rows.join('').split('').filter((c) => c !== '.'));
for (const c of used) if (!PAL[c]) throw new Error('パレットに無い文字: ' + c);

const pal = {};
for (const c of Object.keys(PAL)) if (used.has(c)) pal[c] = PAL[c];

// --- PNG ---
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function writePng(file, scale, bg) {
  const w = W * scale, h = H * scale;
  const px = Buffer.alloc(w * h * 3);
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const bgc = hex(bg);
  for (let i = 0; i < w * h; i++) { px[i * 3] = bgc[0]; px[i * 3 + 1] = bgc[1]; px[i * 3 + 2] = bgc[2]; }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const [r, g, b] = hex(PAL[ch]);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = ((y * scale + dy) * w + (x * scale + dx)) * 3;
          px[i] = r; px[i + 1] = g; px[i + 2] = b;
        }
      }
    }
  }
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) { raw[o++] = 0; px.copy(raw, o, y * w * 3, (y + 1) * w * 3); o += w * 3; }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, cb]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
writePng(path.join(HERE, 'ending-art.png'), 6, '#000000');
writePng(path.join(HERE, 'ending-art-1x.png'), 1, '#000000');

const palStr = '{ ' + Object.keys(pal).map((k) => `${/^[a-zA-Z]$/.test(k) ? k : `'${k}'`}: '${pal[k]}'`)
  .join(', ') + ' }';
const js = [
  '// data/ending_art.js — エンディングのキーイラスト（R34・96×54）。',
  '// 実プレイFB「エンディングがしょぼすぎる。……主人公とモビットが一緒に戦っている',
  '// イラストを入れるとかできないか」。Boot.js が makeGrid でテクスチャ化し、',
  '// Ending.js が 6倍（576×324）で全画面に敷く。',
  '// ⚠️ 生成元は scratchpad/compose-ending-art.mjs。手で直さず、あちらを直して再生成する。',
  'export const ENDING_ART = {',
  '  palette: ' + palStr + ',',
  '  rows: [',
  ...rows.map((r) => '    \'' + r + '\','),
  '  ],',
  '};',
].join(NL) + NL;
fs.writeFileSync(path.join(HERE, '../src/data/ending_art.js'), js);
console.log('rows=' + H + ' cols=' + W + ' colors=' + Object.keys(pal).length);
console.log('wrote ending-art.png / ending-art-1x.png / src/data/ending_art.js');
