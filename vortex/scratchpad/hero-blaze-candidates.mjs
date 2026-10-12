// 主人公のビジュアル修正（ブレイズ）＝腕の形の候補 A／B／C を「実プレイ等倍」で並べる。
//   少年の体（服・髪・顔・脚）は 3 案とも同じ。変えるのは両腕（ブレイズ）だけ＝軸を 1 つに揃えた実験。
//   並べる相手：いまの主人公（Stage1・3 倍）・チビット（2 倍）・スターパピー（2.5 倍）。背景は実際の色 #0a0a1e。
//   判定は等倍（上段）で行い、拡大（下段）は細部を読むためだけに使う（2026-08-07 の教訓）。
//   node vortex/scratchpad/hero-blaze-candidates.mjs [出力先フォルダ]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PLAYER_SPRITES, MONSTERS } from '../src/data/monsters.js';
import { ENEMIES } from '../src/data/enemies.js';

const OUT_DIR = process.argv[2] || path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop');
const BG = [0x0a, 0x0a, 0x1e];

// ---- 色。ブレイズは漆黒（ドラグスティチューノスの色）＋継ぎ目の蒼（候補・要相談）。暗色は輪郭の内側だけ＝外縁は g で縁取る
export const PAL = {
  k: '#7a5a3c', // 髪（いまと同じ＝生身の少年の証）
  f: '#f0c8a0', // 肌
  e: '#2a2028', // 目
  w: '#f2f4f8', // 白いシャツ・靴（普通の子。白い「体」と黒い「腕」の対比が芯）
  p: '#3b4f7a', // ズボン（中くらいの青。背景 12 に対し輝度 75）
  m: '#1c1a28', // ブレイズの黒（主）。背景より少しだけ明るい＝塊として読める
  n: '#07070f', // ブレイズの深い黒（爪の間・影）
  g: '#3c4058', // ブレイズの縁（鈍い鋼。黒を背景から切り離す線）
  c: '#38e1ff', // 蒼の光（継ぎ目・封印・脈）＝蒼神骸華の v と同じ色
  h: '#d8f8ff', // 蒼の芯（いちばん明るい 1〜2 画素）
};

// ---- 少年の体（24×18・中央 12）。腕は無い＝腕は各案の overlay が足す
const BODY = [
  '..........kkkk..........',
  '.........kkkkkk.........',
  '.........kffffk.........',
  '.........feffef.........',
  '..........ffff..........',
  '........wwwffwww........',
  '.......ffwwwwwwff.......',
  '.........wwwwww.........',
  '.........wwwwww.........',
  '.........wwwwww.........',
  '.........pppppp.........',
  '.........pppppp.........',
  '.........pp..pp.........',
  '.........pp..pp.........',
  '.........pp..pp.........',
  '........ppp..ppp........',
  '........www..www........',
  '........www..www........',
];

// ---- 左腕（列 0〜8）。右腕は左右反転。肩は行 5（襟の高さ）・手は足の高さまで＝腕が長すぎる＝異物
export const ARMS = {
  // A 封印型：なめらかな黒い筒に蒼の輪（錠）が 2 本。手の甲に光点。「抑制機」寄り
  A: [
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '....ggggg',
    '...gmmmmm',
    '..gmmmmmg',
    '..gccccmg',
    '..gmmmmmg',
    '..gmmmmmg',
    '..gccccg.',
    '...gmmg..',
    '.gmmmmmg.',
    '.gmmhmmg.',
    '..mnmnm..',
  ],
  // B 脈型：外縁に棘・蒼の脈が斜めに走る・爪が開く。「証」寄り（中の意思が漏れている）
  B: [
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '....ggggg',
    '...gmmmmm',
    '.ggmmcmmg',
    '..gmmmcmg',
    '.ggmmmcmg',
    '..gmmmcmg',
    '..gmmcmg.',
    '...gmcg..',
    '.gmmmhmmg',
    'gmmmmmmmg',
    'm.m.m.m..',
  ],
  // C 殻型：角ばった硬い殻・前腕に蒼の細い「眼」が 1 つ・重い拳の指関節が光る。「何かが見ている」
  C: [
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '...gggggg',
    '..gmmmmmm',
    '..gmmmmmg',
    '..gmhcmmg',
    '..gmmmmmg',
    '..gmmmmmg',
    '...gmmmg.',
    '...gmmg..',
    '.gmmmmmmg',
    '.gccccmmg',
    '.gmmmmmg.',
  ],
};


// ---- 段階（2026-10-12 15:03 ユーザー採用＝ブレイズは「意思を封じたまま力だけを引き出す変換器」。
//   段が上がるたびに封印（蒼の輪）が 1 つずつ外れ、割れ目から脈が漏れて禍々しさが増す＝成長と物語が同じ絵）。
//   高さ 18 と少年の画素は 3 段とも同じ（従来の原則）。変わるのは腕だけ
export const STAGES = {
  // Lv1〜4：封印 2 本とも無傷（＝候補 A）。爪は閉じている
  1: ARMS.A,
  // Lv5〜9：手首側の封印が割れ、割れ目から脈が手まで漏れる。外縁に棘が 1 つ。爪が開き始める
  2: [
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '....ggggg',
    '...gmmmmm',
    '..gmmmmmg',
    '..gccccmg',
    '.ggmmmmmg',
    '..gmmmmmg',
    '..gcmmccg',
    '...gmcg..',
    '.gmmmcmg.',
    '.gmmhmmg.',
    '..m.mnm..',
  ],
  // Lv10 以上：封印は 2 本とも無い。脈が前腕を貫き、棘が並び、手が大きく爪が開く（＝候補 B）
  3: ARMS.B,
};

// ---- 2026-10-12 15:53 ユーザー指摘「腕のサイズが全くあっていない。主人公は外見は普通の人間で、腕につけているブレイズが
//   異彩（不純物）を放っている」「服は白でないほうがいい。マキナは作り直すので主人公の色を残り物に限定しなくてよい」
//   ＝参考画像から「方向だけ借りる」と決めていたのに大きさまで借りていた。腕は人間の比率（2 画素）に戻し、
//   ブレイズは前腕に着けた 3 画素幅の道具にする。異彩は大きさでなく「黒＋蒼の光」の質で出す
//   体は 20×18・胴 6 画素・腕 1 画素（肌）・前腕のブレイズ 3 画素・手は腿の高さまで（人間の腕の長さ）
export const HUMAN_BODY = [
  '........kkkk........',
  '.......kkkkkk.......',
  '.......kffffk.......',
  '.......feffef.......',
  '........ffff........',
  '......ssssssss......',
  '.....fssssssssf.....',
  '.....f.ssssss.f.....',
  '.....f.ssssss.f.....',
  '...gmg.ssssss.gmg...',
  '...ccc.pppppp.ccc...',
  '...gmg.pppppp.gmg...',
  '...gmg.pp..pp.gmg...',
  '...mhm.pp..pp.mhm...',
  '...m.m.pp..pp.m.m...',
  '.......pp..pp.......',
  '......uuu..uuu......',
  '......uuu..uuu......',
];
// 服の色（白以外・3 案）。s＝上着・p＝ズボン・u＝靴
export const CLOTHES = {
  '紺': { s: '#2f4a9e', p: '#6b7280', u: '#d8dde6' },
  'カーキ': { s: '#7a8a3c', p: '#4a3a2a', u: '#d8dde6' },
  'えんじ': { s: '#a0303c', p: '#2f3f6e', u: '#d8dde6' },
};
export function humanSprite(cl) {
  return { palette: { ...PAL, ...CLOTHES[cl] }, rows: HUMAN_BODY };
}

// ---- 2026-10-12 16:07 ユーザー決定「基本服の色は青（完全版では HAYATO のように着せ替え）」「概ねいいが、ワンアクセントほしい。
//   ドラグスティチューノスも繋がるなにか」。アクセント 3 案（体と服は同じ・変えるのはアクセントだけ）
export const BLUE = { s: '#2f6fe4', p: '#6b7280', u: '#d8dde6' };
export const ACCENTS = {
  // ① 胸の四芒の刻印：黒い四芒（意思は 4 つに分かれた）・中心に蒼。ブレイズの封印と同じ印が体にもある＝封じられているのは本人
  '刻印': { 6: { 9: 'm' }, 7: { 8: 'm', 9: 'c', 10: 'm' }, 8: { 9: 'm' } },
  // ② 漆黒のマフラー：記憶を失って現れたとき持っていた唯一の物。首に蒼の結び目・左へ垂れて先が蒼。動くとなびく（実装で）
  'マフラー': { 5: { 7: 'm', 8: 'm', 9: 'c', 10: 'm', 11: 'm', 12: 'm' }, 6: { 6: 'm', 7: 'm' }, 7: { 5: 'm', 6: 'm' }, 8: { 5: 'm', 6: 'c' } },
  // ③ 前髪の一房が漆黒：中の意思が髪に漏れている。段が上がると黒が広がる（Lv10 で半分）
  '一房': { 0: { 8: 'm' }, 1: { 7: 'm', 8: 'm' }, 2: { 7: 'm' } },
};
export function accentSprite(key) {
  const rows = HUMAN_BODY.map((r, y) => {
    const cells = r.split('');
    const ov = key && ACCENTS[key][y];
    if (ov) for (const [x, ch] of Object.entries(ov)) cells[+x] = ch;
    return cells.join('');
  });
  return { palette: { ...PAL, ...BLUE }, rows };
}

// ---- 2026-10-12 21:16 ユーザー「②マフラー採用。ただし黒だと背景と同化する。漆黒を変えるか？」
//   体の外へなびいた状態（右へ走っている場面＝尾が左へ 6 画素）で 4 通りを並べる。
//   黒のまま＝縁に光を走らせる（四神柱の黒が鈍い金の縁で読めているのと同じ手）／布の色を変える（深紅＝四神柱の 3 色目）
export const SCARF_PAL = { o: '#c9971f', r: '#c81736', R: '#ff3355' };
export const SCARFS = {
  // 対照：黒だけ（ユーザー指摘の再現＝背景に沈む）
  '黒のみ': { band: 'm', knot: 'm', rim: null, core: 'm', tip: 'm' },
  // 黒＋蒼の縁：封印の光が布の縁を走る（ブレイズと同じ語彙）
  '蒼の縁': { band: 'm', knot: 'c', rim: 'c', core: 'm', tip: 'c' },
  // 黒＋鈍い金の縁：四神柱の縁の色（光輪の欠片の金 #ffd23f と近い＝取り違えの恐れ）
  '金の縁': { band: 'm', knot: 'o', rim: 'o', core: 'm', tip: 'o' },
  // 深紅の布：四神柱の 3 色目（堕天の硝子と同じ系統＝主人公と大聖堂が同じ色を持つ）。赤は被弾・手遅れの信号でもある
  '深紅': { band: 'r', knot: 'R', rim: null, core: 'r', tip: 'R' },
};
export function scarfSprite(key) {
  const d = SCARFS[key];
  const rows = HUMAN_BODY.map((r) => r.split(''));
  for (let x = 7; x <= 12; x++) rows[5][x] = d.band;   // 首
  rows[5][9] = d.knot;
  if (d.rim) {                                          // 尾：縁・芯・縁（3 画素厚）
    for (let x = 1; x <= 6; x++) { rows[5][x] = d.rim; rows[6][x] = d.core; rows[7][x] = d.rim; }
    rows[5][1] = d.tip; rows[6][1] = d.tip; rows[7][1] = d.tip;
  } else {                                              // 尾：2 画素厚
    for (let x = 1; x <= 6; x++) { rows[5][x] = d.core; rows[6][x] = d.core; }
    rows[5][1] = d.tip; rows[6][1] = d.tip;
  }
  return { palette: { ...PAL, ...BLUE, ...SCARF_PAL }, rows: rows.map((r) => r.join('')) };
}

// ---- 2026-10-12 21:30 ユーザー決定「マフラーは黒のみ（首の右端がはみ出すので少し切る）」「③も入れる＝基本白髪で一房が漆黒」
//   「足がレゴみたい。靴の表現かもっとよい案を」。レゴの正体＝左右対称の真っ直ぐな 2 本の脚＋脚より幅広の白い四角い靴。
//   行 0〜11 は共通（白髪・黒の一房・黒いマフラー＝首は列 7〜11 に 1 画素詰めた・尾は左へ垂れる）。行 12〜17 の脚と靴を 3 通り
export const V3_PAL = { k: '#e6e9f0', u: '#c9d0da', d: '#232c3d' };   // 白髪・靴（明るい灰）・靴底と靴下（暗）
export const V3_TOP = [
  '........mkkk........',
  '.......mmkkkk.......',
  '.......mffffk.......',
  '.......feffef.......',
  '........ffff........',
  '......smmmmmss......',
  '.....fmmssssssf.....',
  '.....mmssssss.f.....',
  '.....mmssssss.f.....',
  '...gmg.ssssss.gmg...',
  '...ccc.pppppp.ccc...',
  '...gmg.pppppp.gmg...',
];
// 行 12〜17 の腕（列 3〜5・14〜16）。脚は列 6〜13 に差し込む
const V3_ARMS = [
  '...gmg........gmg...',
  '...mhm........mhm...',
  '...m.m........m.m...',
  '....................',
  '....................',
  '....................',
];
export const FEET = {
  // A 八の字：脚 2 画素・足首に暗い靴下の線・靴は脚の下 2 画素＋つま先だけ外へ 1 画素（L 字）。白い四角を無くす
  '八の字': [
    '.pp..pp.',
    '.pp..pp.',
    '.pp..pp.',
    '.dd..dd.',
    '.uu..uu.',
    'uuu..uuu',
  ],
  // B 片足重心：右脚は真っ直ぐ・左脚は膝から外へ 1 画素（体重が片足に乗る）。対称を崩す
  '片足重心': [
    '.pp..pp.',
    'pp...pp.',
    'pp...pp.',
    'dd...dd.',
    'uu...uu.',
    'uu..uuuu',
  ],
  // C 短いブーツ：暗い口（d）＋明るい靴 2 段＋つま先。脚は 1 画素短く見える
  'ブーツ': [
    '.pp..pp.',
    '.pp..pp.',
    '.dd..dd.',
    '.uu..uu.',
    '.uu..uu.',
    'uuu..uuu',
  ],
  // 歩き（八の字の 2 コマ）：左脚を 1 画素持ち上げ、右脚はそのまま → 次のコマで入れ替える。止まった脚が「レゴ」の本当の原因
  '歩き1': [
    '.pp..pp.',
    '.pp..pp.',
    '.dd..pp.',
    '.uu..dd.',
    'uuu..uu.',
    '.....uuu',
  ],
  '歩き2': [
    '.pp..pp.',
    '.pp..pp.',
    '.pp..dd.',
    '.dd..uu.',
    '.uu..uuu',
    'uuu.....',
  ],
};
export function v3Sprite(feetKey) {
  const rows = V3_TOP.slice();
  for (let i = 0; i < 6; i++) {
    const cells = V3_ARMS[i].split('');
    const f = FEET[feetKey][i];
    for (let x = 0; x < 8; x++) if (f[x] !== '.') cells[6 + x] = f[x];
    rows.push(cells.join(''));
  }
  return { palette: { ...PAL, ...BLUE, ...V3_PAL }, rows };
}

export function compose(armKey) {
  const arm = typeof armKey === 'string' ? ARMS[armKey] : STAGES[armKey];
  const W = BODY[0].length;
  return BODY.map((row, y) => {
    const cells = row.split('');
    const a = arm[y] || '';
    for (let x = 0; x < a.length; x++) {
      if (a[x] !== '.') cells[x] = a[x];                       // 左腕
      if (a[x] !== '.') cells[W - 1 - x] = a[x];               // 右腕（反転）
    }
    return cells.join('');
  });
}

// ---- 描画
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function luma([r, g, b]) { return 0.299 * r + 0.587 * g + 0.114 * b; }
function canvas(w, h) {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }
  return { w, h, px };
}
// 小数の倍率にも対応（スターパピーは 2.5 倍）。出力の画素から元の画素へ戻して拾う
function blit(cv, { rows, palette }, ox, oy, scale) {
  const sw = rows[0].length, sh = rows.length;
  const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
  for (let py = 0; py < dh; py++) for (let px = 0; px < dw; px++) {
    const sx = Math.min(sw - 1, Math.floor(px / scale)), sy = Math.min(sh - 1, Math.floor(py / scale));
    const ch = rows[sy][sx];
    if (ch === '.' || !palette[ch]) continue;
    const [r, g, b] = hex(palette[ch]);
    const X = ox + px, Y = oy + py;
    if (X < 0 || Y < 0 || X >= cv.w || Y >= cv.h) continue;
    const i = (Y * cv.w + X) * 3;
    cv.px[i] = r; cv.px[i + 1] = g; cv.px[i + 2] = b;
  }
  return dw;
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

const chibit = ENEMIES.find((e) => e.id === 'chibit').sprite;
const puppy = MONSTERS.find((m) => m.id === 'starpuppy').sprite;
const cur = PLAYER_SPRITES[0];
const items = [
  { name: 'いま', sp: cur, scale: 3 },
  { name: 'A', sp: { palette: PAL, rows: compose('A') }, scale: 3 },
  { name: 'B', sp: { palette: PAL, rows: compose('B') }, scale: 3 },
  { name: 'C', sp: { palette: PAL, rows: compose('C') }, scale: 3 },
  { name: 'チビット', sp: chibit, scale: 2 },
  { name: 'スターパピー', sp: puppy, scale: 2.5 },
];

if (process.argv[1] && process.argv[1].endsWith('hero-blaze-candidates.mjs')) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // 上段：等倍（主人公 3 倍・雑魚 2 倍・なかま 2.5 倍）。間隔 24px
  {
    const cv = canvas(24 + items.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of items) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ候補_等倍_2026-10-12.png'));
  }
  // 下段：拡大（1 ドット＝8px）。細部を読むためだけ
  {
    const S = 8;
    const cv = canvas(16 + items.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of items) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ候補_拡大_2026-10-12.png'));
  }
  // 段階（Lv1〜4／Lv5〜9／Lv10 以上）＝等倍と拡大
  const stageItems = [
    { name: 'Lv1-4', sp: { palette: PAL, rows: compose(1) }, scale: 3 },
    { name: 'Lv5-9', sp: { palette: PAL, rows: compose(2) }, scale: 3 },
    { name: 'Lv10+', sp: { palette: PAL, rows: compose(3) }, scale: 3 },
    { name: 'チビット', sp: chibit, scale: 2 },
    { name: 'スターパピー', sp: puppy, scale: 2.5 },
  ];
  {
    const cv = canvas(24 + stageItems.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of stageItems) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ段階_等倍_2026-10-12.png'));
  }
  {
    const S = 8;
    const cv = canvas(16 + stageItems.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of stageItems) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ段階_拡大_2026-10-12.png'));
  }
  // 人間の比率（15:53 の直し）：いま／紺／カーキ／えんじ／チビット／スターパピー
  const humanItems = [
    { name: 'いま', sp: cur, scale: 3 },
    ...Object.keys(CLOTHES).map((cl) => ({ name: cl, sp: humanSprite(cl), scale: 3 })),
    { name: 'チビット', sp: chibit, scale: 2 },
    { name: 'スターパピー', sp: puppy, scale: 2.5 },
  ];
  {
    const cv = canvas(24 + humanItems.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of humanItems) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_人間比_等倍_2026-10-12.png'));
  }
  {
    const S = 8;
    const cv = canvas(16 + humanItems.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of humanItems) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_人間比_拡大_2026-10-12.png'));
  }
  for (const [cl, c] of Object.entries(CLOTHES)) console.log(`服 ${cl}: 上着 ${c.s} 輝度 ${luma(hex(c.s)).toFixed(1)}・ズボン ${c.p} 輝度 ${luma(hex(c.p)).toFixed(1)}`);
  // アクセント（16:07）：青・無し／刻印／マフラー／一房／チビット／スターパピー
  const accItems = [
    { name: '無し', sp: accentSprite(null), scale: 3 },
    ...Object.keys(ACCENTS).map((k) => ({ name: k, sp: accentSprite(k), scale: 3 })),
    { name: 'チビット', sp: chibit, scale: 2 },
    { name: 'スターパピー', sp: puppy, scale: 2.5 },
  ];
  {
    const cv = canvas(24 + accItems.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of accItems) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_アクセント_等倍_2026-10-12.png'));
  }
  {
    const S = 8;
    const cv = canvas(16 + accItems.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of accItems) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_アクセント_拡大_2026-10-12.png'));
  }
  // マフラーの色（21:16）：黒のみ／蒼の縁／金の縁／深紅／チビット／スターパピー（右へ走っている＝尾が左へなびく）
  const scItems = [
    ...Object.keys(SCARFS).map((k) => ({ name: k, sp: scarfSprite(k), scale: 3 })),
    { name: 'チビット', sp: chibit, scale: 2 },
    { name: 'スターパピー', sp: puppy, scale: 2.5 },
  ];
  {
    const cv = canvas(24 + scItems.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of scItems) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_マフラーの色_等倍_2026-10-12.png'));
  }
  {
    const S = 8;
    const cv = canvas(16 + scItems.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of scItems) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_マフラーの色_拡大_2026-10-12.png'));
  }
  for (const [k, v] of Object.entries(SCARF_PAL)) console.log(`${k} ${v} 輝度 ${luma(hex(v)).toFixed(1)}`);
  // 足（21:30）：八の字／片足重心／ブーツ／チビット／スターパピー（白髪＋一房・黒のマフラー入り）
  const ftItems = [
    ...Object.keys(FEET).map((k) => ({ name: k, sp: v3Sprite(k), scale: 3 })),
    { name: 'チビット', sp: chibit, scale: 2 },
    { name: 'スターパピー', sp: puppy, scale: 2.5 },
  ];
  {
    const cv = canvas(24 + ftItems.reduce((s, it) => s + Math.round(it.sp.rows[0].length * it.scale) + 24, 0), 54 + 48);
    let x = 24;
    for (const it of ftItems) { x += blit(cv, it.sp, x, 24 + (54 - Math.round(it.sp.rows.length * it.scale)), it.scale) + 24; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_足_等倍_2026-10-12.png'));
  }
  {
    const S = 8;
    const cv = canvas(16 + ftItems.reduce((s, it) => s + it.sp.rows[0].length * S + 16, 0), 18 * S + 32);
    let x = 16;
    for (const it of ftItems) { x += blit(cv, it.sp, x, 16 + (18 - it.sp.rows.length) * S, S) + 16; }
    writePng(cv, path.join(OUT_DIR, '主人公ブレイズ_足_拡大_2026-10-12.png'));
  }
  // 数字：輝度（背景 12.3 に対して）と幅
  for (const [k, v] of Object.entries(PAL)) console.log(`${k} ${v} 輝度 ${luma(hex(v)).toFixed(1)}`);
  console.log('背景 輝度', luma(BG).toFixed(1));
  for (const it of items) console.log(`${it.name}: ${it.sp.rows[0].length}x${it.sp.rows.length} ×${it.scale} → 画面 ${Math.round(it.sp.rows[0].length * it.scale)}x${Math.round(it.sp.rows.length * it.scale)}px`);
  console.log('出力先', OUT_DIR);
}
