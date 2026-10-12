// 主人公（ブレイズの少年）の正典。Godot 版（kurutto-godot/tools/sprite2png.mjs）がここから PNG を焼く。
//   設計＝Desktop『主人公のビジュアル設計_ブレイズ_2026-10-12.docx』（改訂 2）・候補の図は vortex/scratchpad/hero-blaze-candidates.mjs
//   普通の少年（白髪＋漆黒の一房・漆黒のマフラー・青い上着・八の字の足）＋前腕のブレイズ（黒・鋼の縁・蒼の封印の帯）
//   体は 20×18（中心 10, 9）。腕を使う動き（突き・掴み・投げ）では、使う側の腕を体の絵から消し、腕は Godot 側（hand.gd）が肩から描く
//   左向き（左腕を使う）は腕と脚だけを左右反転して別に焼く＝髪の一房とマフラーは左のまま（画像の flip_h は使わない）

export const HERO_PAL = {
  k: '#e6e9f0', // 白髪
  m: '#1c1a28', // 漆黒（前髪の一房・マフラー・ブレイズ）＝ドラグスティチューノスの色
  n: '#07070f', // ブレイズの深い黒
  g: '#3c4058', // ブレイズの縁（鈍い鋼＝マキナが作った殻）
  c: '#38e1ff', // 蒼の光（封印の帯＝モビットが入れた光）
  h: '#d8f8ff', // 蒼の芯
  f: '#f0c8a0', // 肌
  e: '#2a2028', // 目
  s: '#2f6fe4', // 上着（青）。完全版の着せ替えはこの 1 文字を差し替える（HAYATO の OUTFITS と同じ作法）
  p: '#6b7280', // ズボン
  u: '#c9d0da', // 靴
  d: '#232c3d', // 靴下の線
};

// 行 0〜11（頭・マフラー・胴・前腕の上半分）
const TOP = [
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
// 行 12〜17 の腕（前腕の下半分と手）
const ARMS_LOW = [
  '...gmg........gmg...',
  '...mhm........mhm...',
  '...m.m........m.m...',
  '....................',
  '....................',
  '....................',
];
// 脚（行 12〜17・列 6〜13 に差し込む）。八の字＝靴下の線＋つま先だけ外へ 1 画素（白い四角を無くす）
const FEET = {
  stand: ['.pp..pp.', '.pp..pp.', '.pp..pp.', '.dd..dd.', '.uu..uu.', 'uuu..uuu'],
  walk1: ['.pp..pp.', '.pp..pp.', '.dd..pp.', '.uu..dd.', 'uuu..uu.', '.....uuu'],
  walk2: ['.pp..pp.', '.pp..pp.', '.pp..dd.', '.dd..uu.', '.uu..uuu', 'uuu.....'],
};
const RIGHT_LEG = ['pp.', 'pp.', 'pp.', 'dd.', 'uu.', 'uuu'];   // 右脚（体の列 11〜13・行 12〜17）
const LEFT_LEG = ['.pp', '.pp', '.pp', '.dd', '.uu', 'uuu'];    // 左脚（列 6〜8）

function base(legs) {
  const rows = TOP.map((r) => r.split(''));
  for (let i = 0; i < 6; i++) {
    const cells = ARMS_LOW[i].split('');
    const f = FEET[legs][i];
    for (let x = 0; x < 8; x++) if (f[x] !== '.') cells[6 + x] = f[x];
    rows.push(cells);
  }
  return rows;
}
function stamp(G, x0, y0, art) {
  art.forEach((r, j) => [...r].forEach((c, i) => {
    if (c === '.') return;
    const X = x0 + i, Y = y0 + j;
    if (Y >= 0 && Y < G.length && X >= 0 && X < G[0].length) G[Y][X] = c;
  }));
}
function clear(G, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = '.';
}
// 右腕を使う姿勢（右へ投げる・突く）。左腕を使う姿勢は、腕と脚の部分だけを左右反転して作る
//   pose: stand＝腕だけ無し／knee1〜3＝右膝を上げる（溜め）／step＝右足を 2 画素踏み込む（リリース）／lift＝後ろ足（左）が 1 画素浮く（フォロースルー）
function rightPose(pose) {
  const G = base('stand');
  clear(G, 14, 9, 16, 14);   // 右の前腕と手
  clear(G, 14, 6, 14, 8);    // 右の二の腕（肌）
  if (pose.startsWith('knee')) {
    const k = Number(pose.slice(4));
    clear(G, 11, 12, 13, 17); stamp(G, 11, 12 - k, RIGHT_LEG);
  } else if (pose === 'step') {
    clear(G, 11, 12, 13, 17); stamp(G, 13, 12, RIGHT_LEG);
  } else if (pose === 'lift') {
    clear(G, 6, 12, 8, 17); stamp(G, 6, 11, LEFT_LEG);
  }
  return G;
}
// 左右反転は「腕と脚の領域」（行 9 以降と、行 6〜8 の二の腕の列）だけ。頭・マフラー・胴はそのまま
function mirrorLimbs(G) {
  const W = G[0].length;
  const src = base('stand');   // 反転しない部分の正しい絵
  const out = src.map((r) => r.slice());
  for (let y = 9; y < G.length; y++) for (let x = 0; x < W; x++) out[y][x] = G[y][W - 1 - x];
  // 行 9 以降の胴（上着とズボン）は左右対称なので反転しても同じ。行 6〜8 の二の腕：右の肌が消えていたら左の肌を消す
  for (let y = 6; y <= 8; y++) {
    out[y][14] = src[y][14];
    if (G[y][14] === '.' && src[y][5] === 'f') out[y][5] = '.';
  }
  return out;
}

const sprite = (G) => ({ palette: HERO_PAL, rows: G.map((r) => r.join('')) });

// 書き出す絵の一覧（ファイル名の末尾 → 絵）
export const HERO_FRAMES = (() => {
  const out = { idle: sprite(base('stand')), walk1: sprite(base('walk1')), walk2: sprite(base('walk2')) };
  for (const pose of ['stand', 'knee1', 'knee2', 'knee3', 'step', 'lift']) {
    const R = rightPose(pose);
    out[`r_${pose}`] = sprite(R);
    out[`l_${pose}`] = sprite(mirrorLimbs(R));
  }
  return out;
})();

// ブレイズの手（右向き＝指先が右。hand.gd が腕の向きへ回して描く）。拳＝突き／爪＝掴み・投げ
export const BLAZE_HANDS = {
  fist: { palette: HERO_PAL, rows: ['gmm.', 'mmhm', 'mmhm', 'gmm.'] },
  claw: { palette: HERO_PAL, rows: ['gm.m', 'mmh.', 'mmh.', 'gm.m'] },
};
