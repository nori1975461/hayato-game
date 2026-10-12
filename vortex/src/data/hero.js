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

// ---- 向き（2026-10-12 22:50 ユーザー「右へ動いたら右向き・左なら左・上なら上・下なら下。顔も体も移動した方向を向く」）
//   down＝正面（上の絵）／up＝背中／side_r＝右向きの横顔／side_l＝その左右反転（前髪の一房は額の前・マフラーの尾は背中側＝反転しても正しい）
// 背中（上を向く）。後ろ頭は白髪（一房は額の右＝背中から見て画面の右に 1 画素のぞく）・首にマフラーの帯・尾は背中の真ん中に垂れる（行 9 は中央＝腕と脚の反転で動かない）。腕と脚は正面と同じ
const BACK_TOP = [
  '........kkkk........',
  '.......kkkkkm.......',
  '.......kkkkkk.......',
  '.......kkkkkk.......',
  '........ffff........',
  '......smmmmmms......',
  '.....fsssmmsssf.....',
  '.....f.sssmms.f.....',
  '.....f.sssmms.f.....',
  '...gmg.ssmmss.gmg...',
  '...ccc.pppppp.ccc...',
  '...gmg.pppppp.gmg...',
];
function backBase(legs) {
  const rows = BACK_TOP.map((r) => r.split(''));
  for (let i = 0; i < 6; i++) {
    const cells = ARMS_LOW[i].split('');
    const f = FEET[legs][i];
    for (let x = 0; x < 8; x++) if (f[x] !== '.') cells[6 + x] = f[x];
    rows.push(cells);
  }
  return rows;
}
// 背中で右腕（画面の右）を使う姿勢。正面の rightPose と同じ作り
function backPose(pose) {
  const G = backBase('stand');
  clear(G, 14, 9, 16, 14);
  clear(G, 14, 6, 14, 8);
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
// 横顔（右向き）。胴は 4 画素・手前の腕（左腕）が胴の上に垂れる・前髪の一房は額の前・マフラーの尾は背中へ
const SIDE_TOP = [
  '.........kkk........',
  '........kkkkm.......',
  '........kkkfm.......',
  '........kkfef.......',
  '.........kfff.......',
  '........mmmm........',
  '......mmmssss.......',
  '.....mm..ssss.......',
  '.....m...ssss.......',
  '.........ssss.......',
  '.........pppp.......',
  '.........pppp.......',
];
const SIDE_LEG = ['pp.', 'pp.', 'pp.', 'dd.', 'uu.', 'uuu'];   // 横から見た脚（つま先は右）
const SIDE_ARM = { x: 9, y: 6, art: ['.f.', '.f.', '.f.', 'gmg', 'ccc', 'gmg', 'gmg', 'mhm', 'm.m'] };   // 手前の腕（肩は列 10・行 6）
function sideBase() {
  const G = SIDE_TOP.map((r) => r.split(''));
  for (let i = 0; i < 6; i++) G.push('....................'.split(''));
  return G;
}
// 投手のフォロースルー（kick）＝上体をほぼ水平に倒し、頭は前で下を向き、後ろ脚を腰より高く蹴り上げる。前脚は着いたまま
//   2026-10-13 00:00 ユーザー「この動きをもっと強調して」（貼付＝加速期・減速期・フォロースルーの 3 図）。回転だけでは脚まで傾くので専用の絵
//   腕は hand.gd が描く＝肩は上体の前の上（列 15・行 8）＝player.gd の SIDE_SHOULDER_BEND
const SIDE_BEND = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.uu.................',
  '.uddpp.....mmmm.....',
  '.....ppp..ssssssm...',
  '........pssssssskkk.',
  '.........ppsssskkkk.',
  '.........pppp..kkkm.',
  '.............pp.ff..',
  '.............pp.....',
  '.............pp.....',
  '.............dd.....',
  '.............uu.....',
  '.............uuu....',
];
// legs: stand＝脚がそろう／walk1＝前脚が前・後ろ脚が後ろ（歩幅）／knee1〜3＝前脚の膝を上げる／step＝前脚を踏み込む／lift＝後ろ脚が浮く
//   stride＝投手の踏み込み（前脚を大きく前へ・後ろ脚は後ろ＝コッキング後期〜加速期）／kick＝フォロースルー（上の SIDE_BEND＝上体を倒して後ろ脚を蹴り上げる）
function sideFrame(legs, withArm) {
  if (legs === 'kick') return SIDE_BEND.map((r) => r.split(''));
  const G = sideBase();
  const back = { stand: [9, 12], walk1: [8, 12], knee1: [9, 12], knee2: [9, 12], knee3: [9, 12], step: [9, 12], lift: [8, 11], stride: [8, 12] }[legs];   // 立ち姿は後ろ脚を 1 画素ずらす（脚が 1 本に見えないように）
  const front = { stand: [10, 12], walk1: [12, 12], knee1: [11, 11], knee2: [11, 10], knee3: [11, 9], step: [13, 12], lift: [13, 12], stride: [14, 12] }[legs];
  stamp(G, back[0], back[1], SIDE_LEG);
  stamp(G, front[0], front[1], SIDE_LEG);
  if (withArm) stamp(G, SIDE_ARM.x, SIDE_ARM.y, SIDE_ARM.art);
  return G;
}
const mirror = (G) => G.map((r) => r.slice().reverse());
// 正面・背中の左腕を使う姿勢＝腕と脚の領域（行 9 以降）だけを左右反転する。頭とマフラーは反転しない（髪の一房とマフラーは左のまま）
//   src＝反転しない部分の正しい絵（base('stand') か backBase('stand')）
function mirrorLimbs(G, src) {
  const W = G[0].length;
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

// 書き出す絵の一覧（ファイル名の末尾 → 絵）。正面＝idle・walk1・walk2・r_*（腕を使う姿勢＝画面の右の腕を抜いた体）
export const HERO_FRAMES = (() => {
  const out = { idle: sprite(base('stand')), walk1: sprite(base('walk1')), walk2: sprite(base('walk2')) };
  out.back_idle = sprite(backBase('stand'));
  out.back_walk1 = sprite(backBase('walk1'));
  out.back_walk2 = sprite(backBase('walk2'));
  const sr = { idle: sideFrame('stand', true), walk1: sideFrame('walk1', true), walk2: sideFrame('stand', true) };
  for (const [k, G] of Object.entries(sr)) { out[`side_r_${k}`] = sprite(G); out[`side_l_${k}`] = sprite(mirror(G)); }
  for (const pose of ['stand', 'knee1', 'knee2', 'knee3', 'step', 'lift']) {
    const R = rightPose(pose);
    out[`r_${pose}`] = sprite(R);
    out[`l_${pose}`] = sprite(mirrorLimbs(R, base('stand')));
    const B = backPose(pose);
    out[`back_r_${pose}`] = sprite(B);
    out[`back_l_${pose}`] = sprite(mirrorLimbs(B, backBase('stand')));
  }
  for (const pose of ['stand', 'knee1', 'knee2', 'knee3', 'step', 'lift', 'stride', 'kick']) {
    const G = sideFrame(pose, false);   // 横顔で腕を使う姿勢＝手前の腕を抜く（腕は hand.gd が肩から描く）。stride・kick は投手のフォーム（横顔だけ）
    out[`side_r_${pose}`] = sprite(G);
    out[`side_l_${pose}`] = sprite(mirror(G));
  }
  return out;
})();

// ブレイズの手（右向き＝指先が右。hand.gd が腕の向きへ回して描く）。拳＝突き／爪＝掴み・投げ
export const BLAZE_HANDS = {
  fist: { palette: HERO_PAL, rows: ['gmm.', 'mmhm', 'mmhm', 'gmm.'] },
  claw: { palette: HERO_PAL, rows: ['gm.m', 'mmh.', 'mmh.', 'gm.m'] },
};
