// 「腐蝕の玉座」（マキナ四神の一柱・旧 真マオウレクス案B）を、堕天の大聖堂と同じ水準まで昇華させる。
//
// 旧・案Bの下絵（maou-true-candidates.mjs）が弱かった理由＝大聖堂で踏んだ作法を使っていない：
//   ・部位が小さい（玉座 30×16・王 18×15）を 10.2 倍で引き伸ばし＝面が大きすぎて彫りが無い
//   ・15色・べた塗り／祈る腕が細く暗く、6本と数えられない／冠は平らな帯
//   ・「玉座」なのに玉座の間の語彙（天蓋・段・後光・肘掛けの獣頭）が無い
//
// 昇華の方針（大聖堂と同じ文法を「玉座の間」の語彙で言い直す）：
//   ①シルエットの格 … 尖り頂の高い背もたれ＋左右の柱と尖塔飾り＋3段の壇。黒塗りで「玉座に座る多腕の王」と言い当てられる形
//   ②大きな面＋黒い溝＋面の中の明度差 … 背もたれは3枚の青銅板（縦の溝）、壇は石段、王は鎧板
//   ③素材ごとに4段 … 緑青の青銅（玉座）・黒鉄（腕・王）・腐った金（冠・縁飾り）・黒い樹脂（艶）・銅（剥がれた下地）・深紅（眼と心臓）
//   ④黒で締める … OUTLINE
//   ⑤生きている一点 … 兜の裂け目の深紅の眼・胸の心臓・王笏の先の第2の核
//   ⑥退廃 … 緑青が板を蝕み銅が覗く・樹脂が座面から垂れて壇に溜まる・冠は二片に割れて浮く・腕の1本は肘から先が無い・
//            王の下半身は玉座と融合して見えない
import { g, P, GET, LN, LNT, LNO, ARC, AT, DISC, ELL, RECT, OUTLINE, R, dither, validate } from './god-raster.mjs';

export const PAL = {
  k: '#04060a',
  q: '#0f1f1a', Q: '#1b3a30', P: '#2c6a52', N: '#5fbf95',   // 緑青の青銅 4段（玉座の主材）
  n: '#b9f2d6',                                             // 青銅の稜線
  j: '#101014', m: '#22222c', f: '#3d3d4c', s: '#737389',   // 黒鉄 4段（腕・王）
  y: '#6e5410', Y: '#b8901f', G: '#e6c24a', W: '#fff0b0',   // 腐った金 4段
  o: '#7a4a1a', O: '#d9873a',                               // 銅（腐蝕で剥がれた下地・切れた線）
  t: '#08080c', T: '#17151f', u: '#3a3648',                 // 黒い樹脂（艶の段）
  r: '#6b0f1e', R: '#c22a44', A: '#ff5a6a',                 // 深紅（眼・心臓）
  g: '#1f7a5c', E: '#3fd9a0', L: '#b8ffe0',                 // 緑青の腐蝕（強）・王笏の実
  c: '#ffffff', C: '#fff6d8',                               // 白熱
};

// =====================================================================
// ① 玉座の背（thruster）46×56。尖り頂の背もたれ＋左右の柱（尖塔飾り）＋頭の後ろの後光の円盤
// =====================================================================
const BACK = (() => {
  const W = 46, H = 56, G = g(W, H), C = 22.5;
  // 背もたれ：y=2 で幅1 → y=12 で全幅（尖りアーチ）。3枚の板＝縦の溝、横の溝で段
  for (let y = 2; y < H; y++) {
    const hw = y < 12 ? 1 + (y - 2) * 1.55 : 16.5;
    for (let x = Math.ceil(C - hw); x <= Math.floor(C + hw); x++) {
      const u = (x - (C - 16.5)) / 33;
      let ch = u < 0.2 ? 'N' : u < 0.5 ? 'P' : u < 0.8 ? 'Q' : 'q';
      if (u >= 0.17 && u < 0.23 && dither(x, y)) ch = 'P';
      if (u >= 0.47 && u < 0.53 && dither(x, y)) ch = 'Q';
      if (y >= 12 && (x === 17 || x === 28)) ch = 'k';
      if (y >= 12 && (x === 18 || x === 29)) ch = 'N';       // 溝の右壁に光
      if (y === 28 || y === 44) ch = 'k';
      P(G, x, y, ch);
    }
  }
  // 頂の飾りと尖りの斜辺の金
  RECT(G, 22, 0, 23, 2, 'Y'); P(G, 22, 0, 'W'); P(G, 21, 2, 'Y'); P(G, 24, 2, 'y');
  for (let y = 2; y < 12; y++) { const hw = 1 + (y - 2) * 1.55; P(G, C - hw, y, 'G'); P(G, C + hw, y, 'y'); }
  // 柱 x 0..5 / 40..45（y 6..）：4段の縦ランプ・8行ごとの継ぎ目・鋲。柱頭は尖塔飾り
  for (const [x0, lit] of [[0, true], [40, false]]) {
    for (let y = 6; y < H; y++) for (let x = x0; x <= x0 + 5; x++) {
      const u = (x - x0) / 5;
      let ch = lit ? (u < 0.25 ? 'N' : u < 0.6 ? 'P' : u < 0.85 ? 'Q' : 'q') : (u < 0.25 ? 'P' : u < 0.6 ? 'Q' : 'q');
      if ((y - 6) % 8 === 0) ch = 'k';
      P(G, x, y, ch);
    }
    for (let y = 10; y < H; y += 8) P(G, x0 + 2, y, 'Y');
    for (let y = 0; y < 6; y++) { const hw = y * 0.55; for (let x = x0 + 2.5 - hw; x <= x0 + 2.5 + hw; x++) P(G, x, y, x < x0 + 2.5 ? 'G' : 'Y'); }
    P(G, x0 + 2, 0, 'W'); P(G, x0 + 3, 0, 'W');
  }
  // 後光の円盤（頭の後ろ）：腐った金の輪・暗い内側に放射・輪の一部が緑青に蝕まれる
  for (let d = 8.4; d <= 9.8; d += 0.3) ARC(G, C, 21, d, d, 0, 360, d > 9.4 ? 'y' : 'Y');
  ARC(G, C, 21, 9.0, 9.0, 190, 300, 'G');
  DISC(G, C, 21, 8.1, 'q');
  for (let a = 0; a < 360; a += 22.5) {
    const t = a * Math.PI / 180;
    LN(G, C + Math.cos(t) * 2.5, 21 + Math.sin(t) * 2.5, C + Math.cos(t) * 7.6, 21 + Math.sin(t) * 7.6, a % 45 === 0 ? 'Y' : 'y');
  }
  for (const a of [35, 120, 250]) { AT(G, C, 21, 9.0, 9.0, a, 'g'); AT(G, C, 21, 9.5, 9.5, a + 7, 'g'); AT(G, C, 21, 8.6, 8.6, a - 6, 'E'); }
  // 緑青の斑：中心 E・縁 g・ふちに銅
  const blot = (cx, cy, r) => { DISC(G, cx, cy, r, 'g'); DISC(G, cx - 0.5, cy - 0.5, r * 0.55, 'E'); for (const a of [20, 140, 260]) AT(G, cx, cy, r + 0.9, r + 0.9, a, 'o'); };
  blot(10, 34, 2.3); blot(34, 50, 2.7); blot(23, 53, 1.8); blot(12, 48, 1.7); blot(36, 33, 1.5); blot(8, 16, 1.4); blot(38, 20, 1.3); blot(2, 40, 1.2); blot(43, 30, 1.2);
  // 黒い樹脂の垂れ：座面の後ろ（y 40）から下へ。艶は u
  for (const [x, len] of [[12, 12], [20, 7], [27, 14], [33, 9]]) {
    for (let y = 40; y < 40 + len && y < H; y++) { P(G, x, y, 't'); P(G, x + 1, y, 'T'); if (y % 5 === 2) P(G, x, y, 'u'); }
    P(G, x, Math.min(H - 1, 40 + len), 'T'); P(G, x + 1, Math.min(H - 1, 40 + len), 't'); P(G, x - 1, Math.min(H - 1, 40 + len - 1), 't');
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ② 祈る腕（wingR / wingL）32×34。根元は左下＝肩の裏。3本が扇に開き、それぞれ別の物を持つ。
//    太さ5.5/4.5 の黒鉄（外郭 j・芯 f・稜線 s）＋肘と手首に金の環＝等倍でも3本と数えられる
// =====================================================================
function prayArms(tools) {
  const W = 32, H = 34, G = g(W, H);
  const arms = [
    { root: [5, 29], elbow: [8, 14], hand: [5, 4] },     // 上（ほぼ垂直）
    { root: [3, 31], elbow: [16, 15], hand: [26, 6] },   // 中
    { root: [1, 33], elbow: [18, 27], hand: [30, 20] },  // 下（手前）
  ];
  arms.forEach((a, i) => {
    const tool = tools[i];
    const [bx, by] = a.root, [ex, ey] = a.elbow, [hx, hy] = a.hand;
    LNT(G, bx, by, ex, ey, 'j', 5.5); LNT(G, bx, by, ex, ey, 'f', 3.2); LNO(G, bx, by, ex, ey, 's', -1.3); LNO(G, bx, by, ex, ey, 'm', 1.2);
    if (tool !== 'stump') {
      LNT(G, ex, ey, hx, hy, 'j', 4.5); LNT(G, ex, ey, hx, hy, 'f', 2.6); LNO(G, ex, ey, hx, hy, 's', -1.1);
      DISC(G, hx, hy, 2.3, 'k'); DISC(G, hx, hy, 1.7, 'f'); P(G, hx - 1, hy - 1, 's'); P(G, hx, hy, 'm');
    }
    DISC(G, ex, ey, 2.7, 'k'); DISC(G, ex, ey, 2.0, 'Y'); P(G, ex - 1, ey - 1, 'W'); P(G, ex + 1, ey + 1, 'y');
    if (tool === 'blade') { LNT(G, 31, 18, 31, 7, 'n', 2); LN(G, 30, 18, 30, 8, 's'); RECT(G, 28, 19, 31, 19, 'Y'); P(G, 31, 6, 'c'); }
    if (tool === 'orb') { DISC(G, 26, 2.8, 3.3, 'k'); DISC(G, 26, 2.8, 2.6, 'g'); DISC(G, 25.5, 2.3, 1.6, 'E'); P(G, 25, 2, 'L'); }
    if (tool === 'censer') {
      P(G, 7, 5, 'Y'); P(G, 9, 6, 'y'); P(G, 11, 7, 'Y'); P(G, 13, 8, 'y');
      DISC(G, 15.5, 10.5, 2.6, 'k'); DISC(G, 15.5, 10.5, 1.9, 'm'); P(G, 15, 10, 'O'); P(G, 16, 11, 'o'); P(G, 14, 10, 'f'); P(G, 15, 9, 'Y');
    }
    if (tool === 'hook') { ARC(G, 26, 16, 4.6, 4.6, 205, 420, 'n'); ARC(G, 26, 16, 3.6, 3.6, 215, 415, 'f'); AT(G, 26, 16, 4.6, 4.6, 207, 'c'); }
    if (tool === 'bell') {
      P(G, 29, 8, 'y');
      for (let y = 9; y <= 13; y++) { const hw = (y - 8) * 0.55 + 0.5; for (let x = 29 - hw; x <= 29 + hw; x++) P(G, x, y, x < 29 ? 'G' : 'Y'); }
      for (let x = 26; x <= 31; x++) P(G, x, 14, 'W'); P(G, 29, 15, 'k'); P(G, 29, 16, 'Y');
    }
    if (tool === 'stump') {
      DISC(G, ex, ey, 2.7, 'k'); DISC(G, ex, ey, 2.0, 'm'); P(G, ex - 1, ey - 2, 'k'); P(G, ex + 1, ey - 2, 'k');
      LN(G, ex, ey - 1, ex - 2, ey - 5, 'o'); LN(G, ex + 1, ey - 1, ex + 3, ey - 5, 'O'); LN(G, ex, ey - 2, ex, ey - 6, 'o');
      P(G, ex - 2, ey - 6, 'c'); P(G, ex + 3, ey - 6, 'W'); P(G, ex, ey - 7, 'O');
    }
  });
  OUTLINE(G);
  return R(G);
}
const ARMS_R = prayArms(['censer', 'orb', 'blade']);
const ARMS_L = prayArms(['stump', 'bell', 'hook']);   // 鏡映して左に置く（欠けた腕は左＝損傷は左に揃える）

// =====================================================================
// ③ 王（body）24×26。座ったまま動かない上半身。兜の裂け目に深紅の眼、胸はU字の開口（心臓は core）
// =====================================================================
const KING = (() => {
  const W = 24, H = 26, G = g(W, H);
  for (let y = 0; y <= 9; y++) for (let x = 5; x <= 18; x++) {
    const d = Math.hypot((x - 11.5) / 6.8, (y - 8) / 8.6);
    if (d > 1) continue;
    const u = (x - 5) / 13 + y / 30;
    P(G, x, y, u < 0.25 ? 's' : u < 0.5 ? 'f' : u < 0.75 ? 'm' : 'j');
  }
  for (let y = 0; y <= 4; y++) P(G, 11.5, y, 'Y'); P(G, 11, 0, 'W'); P(G, 12, 0, 'W');   // 鶏冠
  for (let x = 6; x <= 17; x++) P(G, x, 5, x < 11 ? 'G' : 'Y');                             // 眉の金帯
  for (let y = 6; y <= 9; y++) for (let x = 5; x <= 18; x++) if (GET(G, x, y) !== '.' && GET(G, x, y) !== null) P(G, x, y, y === 6 ? 'j' : 'm');
  for (let x = 7; x <= 16; x++) P(G, x, 7, x < 9 || x > 14 ? 'r' : 'R'); P(G, 11, 7, 'A'); P(G, 12, 7, 'A');   // 裂け目の眼
  for (let x = 7; x <= 16; x++) P(G, x, 8, 'k');
  RECT(G, 9, 10, 14, 10, 'k'); RECT(G, 10, 10, 13, 10, 'j');                                   // 首
  for (const [x0, x1, lit] of [[0, 8, true], [15, 23, false]]) {                                 // 肩当て
    for (let y = 11; y <= 16; y++) for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      let ch = lit ? (u < 0.3 ? 's' : u < 0.7 ? 'f' : 'm') : (u < 0.3 ? 'f' : u < 0.7 ? 'm' : 'j');
      if (y === 11) ch = 'Y'; if (y === 14) ch = 'k';
      P(G, x, y, ch);
    }
    P(G, lit ? x0 + 1 : x1 - 1, 12, 'W');
  }
  for (let y = 11; y <= 22; y++) for (let x = 6; x <= 17; x++) {                                 // 胸板
    if (y <= 16 && (x <= 8 || x >= 15)) continue;
    const u = (x - 6) / 11;
    P(G, x, y, y === 17 ? 'k' : u < 0.3 ? 'f' : u < 0.65 ? 'm' : 'j');
  }
  RECT(G, 8, 13, 15, 21, 'k');                                                                   // U字の開口
  for (let y = 13; y <= 20; y++) { P(G, 8, y, 'Y'); P(G, 15, y, 'y'); } for (let x = 8; x <= 15; x++) P(G, x, 21, 'Y');
  P(G, 8, 13, 'W');
  RECT(G, 0, 15, 3, 20, 'f'); RECT(G, 1, 16, 2, 19, 'm'); P(G, 0, 15, 's');                       // 肘掛けに置いた左腕
  RECT(G, 0, 21, 4, 22, 'f'); P(G, 1, 21, 'Y'); P(G, 3, 21, 'Y');
  for (let y = 23; y <= 25; y++) for (let x = 5; x <= 18; x++) P(G, x, y, y % 2 ? 'j' : 'f');   // 腰の蛇腹
  for (let x = 6; x <= 17; x += 3) { P(G, x, 25, 't'); P(G, x + 1, 25, 'T'); }                   // 融合＝樹脂が染みる
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ④ 座面（cannon 役・王の前）36×13。肘掛けの前端に単眼の獣頭、縁から樹脂が垂れる
// =====================================================================
const SEAT = (() => {
  const W = 36, H = 13, G = g(W, H);
  for (const [x0, lit] of [[0, true], [28, false]]) {
    for (let y = 0; y < H; y++) for (let x = x0; x <= x0 + 7; x++) {
      const u = (x - x0) / 7;
      let ch = lit ? (u < 0.25 ? 'N' : u < 0.6 ? 'P' : u < 0.85 ? 'Q' : 'q') : (u < 0.25 ? 'P' : u < 0.6 ? 'Q' : 'q');
      if (y === 0) ch = 'Y'; if (y === 6) ch = 'k';
      P(G, x, y, ch);
    }
    const cx = x0 + 3.5;
    DISC(G, cx, 3, 2.7, 'k'); DISC(G, cx, 3, 2.0, 'Q'); P(G, cx, 3, 'A'); P(G, cx - 1, 2, 'N');
    P(G, cx - 2, 0, 'Y'); P(G, cx + 2, 0, 'Y'); P(G, cx - 2, -1, 'W');
  }
  for (let y = 4; y < H; y++) for (let x = 8; x <= 27; x++) P(G, x, y, y === 4 ? 'Y' : y === 5 ? 'P' : y < 9 ? 'Q' : 'q');
  for (let x = 12; x <= 24; x += 6) for (let y = 6; y <= 11; y++) P(G, x, y, 'k');
  for (let x = 10; x <= 26; x++) if (x % 4) P(G, x, 5, 't');
  for (const [x, len] of [[11, 7], [16, 4], [21, 8], [25, 5]]) {
    for (let y = 5; y < 5 + len && y < H; y++) { P(G, x, y, 't'); P(G, x + 1, y, 'T'); }
    P(G, x, Math.min(H - 1, 5 + len), 'T'); P(G, x + 1, Math.min(H - 1, 5 + len), 't'); P(G, x, 6, 'u');
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑤ 壇（legL）56×10。3段の石段。樹脂が溜まり、銅の染みと緑青
// =====================================================================
const DAIS = (() => {
  const W = 56, H = 10, G = g(W, H);
  for (const [x0, x1, y0] of [[13, 42, 0], [7, 48, 3], [0, 55, 6]]) {
    for (let y = y0; y < y0 + 4 && y < H; y++) for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      P(G, x, y, y === y0 ? (u < 0.5 ? 'N' : 'P') : y === y0 + 3 ? 'k' : (u < 0.35 ? 'P' : u < 0.7 ? 'Q' : 'q'));
    }
    for (let x = x0 + 3; x <= x1 - 3; x += 7) P(G, x, y0 + 2, 'k');
  }
  ELL(G, 27.5, 4, 8, 1.3, 't'); ELL(G, 26, 3.8, 4, 0.7, 'T'); P(G, 24, 4, 'u');
  ELL(G, 30, 7.5, 11, 1.4, 't'); ELL(G, 28, 7.3, 5, 0.8, 'T'); P(G, 26, 7, 'u');
  for (const [x, y] of [[4, 8], [51, 7], [10, 5], [45, 4], [20, 1]]) { P(G, x, y, 'o'); P(G, x + 1, y, 'g'); P(G, x, y + 1, 'g'); }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑥ 割れた冠（rack）22×9。二片に割れて頭上に浮く。割れ目側はぎざぎざ、腐った金に緑青
// =====================================================================
const CROWN = (() => {
  const W = 22, H = 9, G = g(W, H);
  const half = (x0, dir) => {
    for (let y = 5; y <= 7; y++) for (let x = x0; x <= x0 + 8; x++) P(G, x, y, y === 7 ? 'y' : y === 5 ? 'G' : 'Y');
    const pts = dir > 0 ? [[x0 + 1, 4], [x0 + 4, 2], [x0 + 7, 3]] : [[x0 + 1, 3], [x0 + 4, 2], [x0 + 7, 4]];
    for (const [px, top] of pts) { for (let y = top; y <= 4; y++) { P(G, px, y, 'G'); P(G, px + 1, y, 'Y'); } P(G, px, top - 1, 'W'); }
    const ex = dir > 0 ? x0 + 8 : x0;
    P(G, ex, 5, 'k'); P(G, ex, 7, 'k'); P(G, ex + (dir > 0 ? -1 : 1), 6, 'k');
    P(G, x0 + 2, 6, 'g'); P(G, x0 + 6, 7, 'g'); P(G, x0 + (dir > 0 ? 3 : 5), 5, 'o');
  };
  half(0, 1); half(13, -1);
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑦ 王笏（armR）18×40。王の右腕が握る、ケーブル束の杖。先端に第2の核が実る。下端は銅線がほつれる
// =====================================================================
const SCEPTER = (() => {
  const W = 18, H = 40, G = g(W, H), sx = 13;
  DISC(G, sx, 5.5, 4.8, 'k'); DISC(G, sx, 5.5, 4.1, 'g'); DISC(G, sx - 0.6, 5, 2.8, 'E'); DISC(G, sx - 1.2, 4.4, 1.3, 'L'); P(G, sx - 2, 3, 'c');
  for (const a of [40, 160, 280]) AT(G, sx, 5.5, 4.3, 4.3, a, 'Y');
  for (let y = 11; y < H; y++) {
    const tw = Math.sin(y * 0.9);
    P(G, sx - 1 + (tw > 0.3 ? 1 : 0), y, 'f'); P(G, sx, y, 'm'); P(G, sx + 1 - (tw < -0.3 ? 1 : 0), y, 's');
    if (y % 6 === 3) { P(G, sx - 1, y, 'Y'); P(G, sx, y, 'Y'); P(G, sx + 1, y, 'y'); }
  }
  P(G, sx, 10, 'Y');
  RECT(G, 0, 29, 10, 33, 'f'); RECT(G, 1, 30, 9, 32, 'm'); P(G, 0, 29, 's'); RECT(G, 0, 29, 1, 33, 'Y'); P(G, 0, 29, 'W');   // 前腕（肩から）
  RECT(G, 10, 28, 16, 34, 'f'); RECT(G, 11, 29, 15, 33, 'm'); P(G, 10, 28, 's'); P(G, 11, 31, 'Y'); P(G, 15, 31, 'Y'); P(G, 13, 29, 'Y');   // 握り
  P(G, sx - 2, 38, 'o'); P(G, sx - 3, 39, 'O'); P(G, sx + 2, 38, 'o'); P(G, sx + 3, 39, 'O'); P(G, sx, 39, 'o');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑧ 心臓（core）10×8。金の輪→白熱→深紅の心臓（大聖堂の聖核と同じ族＝マキナの神の核）
// =====================================================================
const HEART = (() => {
  const W = 10, H = 8, G = g(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 4.5) / 4.6, (y - 3.5) / 3.6);
    if (d > 1) continue;
    P(G, x, y, d > 0.8 ? 'k' : d > 0.62 ? 'Y' : d > 0.45 ? 'W' : 'C');
  }
  RECT(G, 3, 3, 6, 4, 'R'); P(G, 4, 2, 'R'); P(G, 5, 2, 'R'); P(G, 4, 5, 'A'); P(G, 5, 5, 'A'); P(G, 3, 3, 'A'); P(G, 4, 3, 'O');
  return R(G);
})();

export const THRONE = {
  id: 'throne',
  name: '腐蝕の玉座',
  concept: '玉座と融合して二度と立てない王。尖り頂の高い背もたれと左右の柱、頭の後ろに腐った金の後光。'
    + '背後から6本の祈る腕が扇に開き、香炉・宝珠・剣／鉤・鐘・折れた腕（銅線を晒す）を掲げる。'
    + '割れた冠は頭に載らず頭上に浮き、王笏はケーブル束で先端に第2の核が実る。緑青が青銅を蝕み、黒い樹脂が座面から垂れて壇に溜まる。',
  sprites: {
    back: { rows: BACK, palette: PAL },
    armsR: { rows: ARMS_R, palette: PAL },
    armsL: { rows: ARMS_L, palette: PAL },
    king: { rows: KING, palette: PAL },
    seat: { rows: SEAT, palette: PAL },
    dais: { rows: DAIS, palette: PAL },
    crown: { rows: CROWN, palette: PAL },
    scepter: { rows: SCEPTER, palette: PAL },
    heart: { rows: HEART, palette: PAL },
  },
  // 深度は boss.js / render-boss-rig の PART_DEPTH：thruster 6 < wing/leg 7 < body 8 < rack 9 < cannon 10 < arm 11 < core 12
  rig: [
    { role: 'thruster', tex: 'back', ox: 0, oy: -10 },                              // 頂 -38・下端 +18
    { role: 'wingR', tex: 'armsR', ox: 8, oy: -4, origin: [0, 1] },                 // 根元＝肩の裏
    { role: 'wingL', tex: 'armsL', ox: -8, oy: -4, origin: [0, 1], mirror: true },
    { role: 'legL', tex: 'dais', ox: 0, oy: 26, origin: [0.5, 0.5] },               // 下端 +31
    { role: 'body', tex: 'king', ox: 0, oy: -1 },
    { role: 'rack', tex: 'crown', ox: 0, oy: -20 },
    { role: 'cannon', tex: 'seat', ox: 0, oy: 15, origin: [0.5, 0.5] },
    { role: 'armR', tex: 'scepter', ox: 20, oy: -26, origin: [0.5, 0.1] },          // 前腕の左端が王の右肩に接する
    { role: 'core', tex: 'heart', ox: 0, oy: 3 },
  ],
  tier: { spriteScale: 5.0, glowScale: 11.0, glowOuter: '#3fd9a0', glowInner: '#b8901f' },
};
validate(THRONE);
