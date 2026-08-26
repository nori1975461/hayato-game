// 真マオウレクス（第4形態）のビジュアル候補 A / B / C。
// メタリックパープルのマオウレクスを倒すと、そのボディが亀裂を生じて粉々に飛び散り、
// 「真のマオウレクス」が出現する ― という依頼に対する3案。まだゲーム本体には入れていない。
//
// 設計の縛り（[[feedback_boss_sprite_originality]]）
//   ・既存パーツのスケール加工は不可。全パーツを新規に描き起こす
//   ・完了報告の前に必ず PNG 化して目視で構図を比較する
//   ・判定は実プレイの等倍で行う（[[feedback_pixel_art_judge_at_play_zoom]]）
//
// ⚠️ 1回目に描いたものは目視で全滅した。記録として残す（同じ轍を踏まないため）：
//   A: 骨も配線も1px幅の線だったので「鉄骨の翼」ではなく蜘蛛の脚に見えた。暗い色ばかりで沈んだ
//   B: 祈る腕が細く暗く、玉座と冠に埋もれて6本と数えられなかった＝案の核が消えていた
//   C: 3つの環を同心・同傾きで描いたので重なって輪郭が1つに融合し、巨大な目玉1個にしか見えなかった
//   → 教訓は3つとも同じ。「等倍で読めるか」は線の太さ・明度差・重なりの角度で決まる。
//
// 幾何パーツ（光輪・骨組みの翼・祈る腕の扇・公転する環）は、座標を1つ間違えると
// 輪郭に穴が空くのに数字を見ても気づけない（R35 の彗星弾で3か所やらかした）。
// なので楕円・線はラスタライザで生成し、手描きは「意図を込めたい面」だけにする。
// 行長はこのファイルの末尾で全スプライト assert する。

// ---- 小さなラスタライザ（オーサリング用。ゲームには入らない） ----
const g = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const P = (G, x, y, ch) => {
  x = Math.round(x); y = Math.round(y);
  if (G[y] && x >= 0 && x < G[0].length) G[y][x] = ch;
};
const LN = (G, x0, y0, x1, y1, ch) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
  for (let i = 0; i <= n; i++) P(G, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
};
// 太い線（法線方向へ厚み t 分ずらして重ね引き）。1pxの線は等倍で消える。
const LNT = (G, x0, y0, x1, y1, ch, t = 2) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let k = -(t - 1) / 2; k <= (t - 1) / 2 + 1e-9; k += 0.5) {
    LN(G, x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, ch);
  }
};
// 楕円弧。a0..a1 は度（0=右, 90=下）。rot で楕円ごと傾ける。gaps で欠けを作る。
const ARC = (G, cx, cy, rx, ry, a0, a1, ch, gaps = [], rot = 0) => {
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  for (let a = a0; a <= a1; a += 0.3) {
    if (gaps.some(([s, e]) => a >= s && a <= e)) continue;
    const t = a * Math.PI / 180, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
    P(G, cx + ex * cr - ey * sr, cy + ex * sr + ey * cr, ch);
  }
};
const AT = (G, cx, cy, rx, ry, a, ch, rot = 0) => {
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
  const t = a * Math.PI / 180, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry;
  P(G, cx + ex * cr - ey * sr, cy + ex * sr + ey * cr, ch);
};
const DISC = (G, cx, cy, r, ch) => {
  for (let y = Math.ceil(cy - r); y <= cy + r; y++) {
    for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) P(G, x, y, ch);
    }
  }
};
const R = (G) => G.map((r) => r.join(''));

// =====================================================================
// 案A 堕天の大聖堂 ― 下半身を失い宙に浮く上半身
//   欠けた金の光輪が逆回転 / 羽根の無い鉄骨だけの翼（左右非対称）/
//   顔は無く、頭部そのものが薔薇窓＝単眼のステンドグラス /
//   胸が観音開きになって聖核が剥き出し / 腰から配線束が垂れて床を引きずる
// =====================================================================
const PAL_A = {
  k: '#05050a', j: '#111422', m: '#1a1f33', f: '#2c3552', s: '#5a6b96',
  n: '#8fa2cf',                                  // 骨の稜線（等倍で形を立たせる明部）
  b: '#122a6b', B: '#1f47b8',                    // 藍（体内の光）
  r: '#5c0a18', R: '#c81736',                    // 深紅（薔薇窓・聖核）
  y: '#8a6a12', Y: '#e3b53a', W: '#fff2b8',      // 金（光輪・縁飾り）
  c: '#ffffff',
};

// 光輪 28×11：欠けた輪。楕円にして「傾いて公転している」ことを静止画でも読ませる。
const A_HALO = (() => {
  const G = g(32, 12);
  const GAP = [[148, 194], [334, 360], [0, 16]];   // 欠けは左右。上に欠けを置くと頭の「角」に見えた
  ARC(G, 15.5, 5.5, 15, 5.2, 0, 360, 'y', GAP);
  ARC(G, 15.5, 5.5, 13.4, 3.8, 0, 360, 'Y', GAP);
  ARC(G, 15.5, 5.5, 14.2, 4.5, 0, 360, 'W', [[100, 360]]);   // 手前側だけ白熱＝逆回転の向き
  for (const a of [40, 80, 110, 200, 240, 280, 310]) AT(G, 15.5, 5.5, 14.2, 4.5, a, 'W');
  for (const [a0, a1] of GAP) { AT(G, 15.5, 5.5, 14.2, 4.5, a0 - 2, 's'); AT(G, 15.5, 5.5, 14.2, 4.5, a1 + 2, 's'); }
  return R(G);
})();

// 鉄骨だけの翼・右（大きい）19×21。羽根は無く、トラスの骨組みだけが残っている。
const A_WING_R = (() => {
  const G = g(19, 21);
  const bx = 2, by = 19;
  const spars = [[18, 2], [18, 9], [15, 15], [11, 0], [5, 0]];
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'm', 5);      // 主桁の外郭
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'f', 3);      // 主桁の芯
  // 筋交い＝トラス。骨と骨のあいだを斜めに繋いで「鉄骨」だと分からせる（暗いと破片に見える）
  for (let i = 0; i < spars.length - 1; i++) {
    for (const u of [0.38, 0.62, 0.86]) {
      const a = spars[i], b2 = spars[i + 1];
      LNT(G, bx + (a[0] - bx) * u, by + (a[1] - by) * u,
        bx + (b2[0] - bx) * (u + 0.14), by + (b2[1] - by) * (u + 0.14), 'f', 2);
    }
  }
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'n', 1);      // 桁の稜線（全長に通す）
  for (const [tx, ty] of spars) { P(G, tx, ty, 'n'); P(G, tx, ty + 1, 's'); }
  ARC(G, bx, by, 9.0, 9.0, 250, 356, 'm');
  ARC(G, bx, by, 15.0, 15.0, 254, 350, 'm');
  LNT(G, 0, 17, 4, 20, 'j', 3);
  P(G, 2, 19, 'Y'); P(G, 3, 19, 'y'); P(G, 2, 18, 'Y');
  return R(G);
})();

// 鉄骨だけの翼・左（折れて短い）13×15。左右非対称にして「壊れたまま飛んでいる」を作る。
const A_WING_L = (() => {
  const G = g(13, 15);
  const bx = 11, by = 13;
  const spars = [[1, 1], [7, 4], [0, 8]];        // 真ん中の骨は途中で折れて先が無い
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'm', 5);
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'f', 3);
  for (const u of [0.42, 0.68, 0.9]) {
    LNT(G, bx + (1 - bx) * u, by + (1 - by) * u, bx + (0 - bx) * (u + 0.14), by + (8 - by) * (u + 0.14), 'f', 2);
  }
  for (const [tx, ty] of spars) LNT(G, bx, by, tx, ty, 'n', 1);
  for (const [tx, ty] of spars) { P(G, tx, ty, 'n'); P(G, tx, ty + 1, 's'); }
  ARC(G, bx, by, 7.6, 7.6, 175, 258, 'm');
  P(G, 11, 13, 'Y'); P(G, 11, 12, 'y');
  return R(G);
})();

// 頭部＝薔薇窓 17×11。目も口も無い。円窓そのものが顔で、鉛の桟(k)が放射状に走る。
const A_HEAD = [
  '....kkkkkkkkk....',
  '..kkjyYYYYYyjkk..',
  '.kjyYWRRRRRWYyjk.',
  'kjyYWRRRkRRRWYyjk',
  'kjYWRRRRkRRRRWYjk',
  'kjYWRRcccccRRWYjk',
  'kjYWRRRRkRRRRWYjk',
  'kjyYWRRRkRRRWYyjk',
  '.kjyYWRRRRRWYyjk.',
  '..kkjyYYYYYyjkk..',
  '....kkkkkkkkk....',
];

// 上半身 18×13。腰から下は無い。胸が観音開きになって内側（藍）が剥き出し。
const A_TORSO = [
  '..mmffffffffffmm..',
  '.mffssssssssssffm.',
  'mffsYYYYYYYYYYYsfm',
  'mfsYkkkkkkkkkkYsfm',
  'mfsYbbbbbbbbbbYsfm',
  'mfsYbBBBBBBBBbYsfm',
  'mfsYbBBBBBBBBbYsfm',
  'mfsYbBBBBBBBBbYsfm',
  'mfsYbbbbbbbbbbYsfm',
  'mfsYkkkkkkkkkkYsfm',
  'mffsYYYYYYYYYYYsfm',
  '.mffssssssssssffm.',
  '..mmffffffffffmm..',
];

// 腰から垂れる配線束 16×14。3本の太い束が下で溜まり、床を引きずる。
const A_VISCERA = [
  '...ssssssssssss...',
  '..mssffffffffssm..',
  '..msf.sff.ffs.fm..',
  '.msf..sff.ffs..fm.',
  '.sf...sff.ffs...fs',
  'ssf...sf...fs...fs',
  'sf....sf...fs....f',
  'sf...sff..ffs....f',
  'sf...sf....fs...fs',
  '.sf.ssf....fss.fs.',
  '.ssfff......fffss.',
  'mmsff........ffsmm',
  'mmmm..........mmmm',
  'mmmmmmm....mmmmmmm',
  '.jjjjjjjjjjjjjjjj.',
];

// 剥き出しの聖核 10×6。開いた胸の奥で白熱している。
const A_CORE = [
  '...WWYYWW...',
  '.YWccccccWY.',
  'YWccRRRRccWY',
  '.YWccccccWY.',
  '...WWYYWW...',
];

// 腕 8×15。祈りの形に垂れた腕。等倍で消えないよう4px幅の芯を持たせる。
const A_ARM = [
  '..ffff..',
  '.mffffm.',
  '.sffffs.',
  '.mffffm.',
  '.kffffk.',
  '..ffff..',
  '.mffffm.',
  '.sffffs.',
  '.kffffk.',
  '..mYYm..',
  '...kk...',
];

export const CAND_A = {
  id: 'maouTrueA',
  name: '真マオウレクス／堕天の大聖堂',
  concept: '下半身を失い宙に浮く上半身。欠けた金の光輪が逆回転し、羽根の無い鉄骨の翼が左右非対称に残る。'
    + '顔は無く頭部そのものが薔薇窓（単眼のステンドグラス）。胸が観音開きになって聖核が剥き出し、'
    + '腰からは配線束が垂れて床を引きずる。',
  sprites: {
    halo: { rows: A_HALO, palette: PAL_A },
    wingR: { rows: A_WING_R, palette: PAL_A },
    wingL: { rows: A_WING_L, palette: PAL_A },
    head: { rows: A_HEAD, palette: PAL_A },
    torso: { rows: A_TORSO, palette: PAL_A },
    viscera: { rows: A_VISCERA, palette: PAL_A },
    core: { rows: A_CORE, palette: PAL_A },
    arm: { rows: A_ARM, palette: PAL_A },
  },
  rig: [
    { role: 'wingR', tex: 'wingR', ox: 12, oy: -2 },
    { role: 'wingL', tex: 'wingL', ox: -13, oy: 0, mirror: true },
    { role: 'legL', tex: 'viscera', ox: 0, oy: 9 },
    { role: 'body', tex: 'torso', ox: 0, oy: 2 },
    { role: 'armL', tex: 'arm', ox: -9, oy: 2, mirror: true, origin: [0.5, 0.1] },
    { role: 'armR', tex: 'arm', ox: 9, oy: 2, origin: [0.5, 0.1] },
    { role: 'dome', tex: 'halo', ox: 0, oy: -18 },
    { role: 'rack', tex: 'head', ox: 0, oy: -8 },
    { role: 'core', tex: 'core', ox: 0, oy: 2 },
  ],
  tier: { spriteScale: 7.4, glowScale: 11.4, glowOuter: '#e3b53a', glowInner: '#1f47b8' },
};

// =====================================================================
// 案B 腐蝕の玉座 ― 玉座と融合して二度と立てない王
//   背後から6本の「祈る腕」が扇状に生えて別々の武器を持つ / 割れた冠が頭上で公転 /
//   王笏はケーブル束で先端に第2の核 / 緑青の腐蝕と黒い樹脂
// =====================================================================
const PAL_B = {
  k: '#060a09', j: '#0f1815', m: '#1c2b26', f: '#2f4c42', s: '#59897a',
  n: '#8fc4b0',                                  // 腕の稜線（6本と数えられるように）
  g: '#1f7a5c', G: '#3fd9a0',                    // 緑青
  t: '#0a0a0d',                                  // 黒い樹脂
  y: '#6e5410', Y: '#b8901f', W: '#f0d47a',      // 腐った金
  r: '#6b0f1e', R: '#c22a44',
  c: '#fff6d8',
};

// 玉座 30×16。王を左右から包む高い背もたれ。座面の境目から黒い樹脂が垂れる。
const B_THRONE = (() => {
  const G = g(30, 16);
  const put = (x0, y0, w, h, ch) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) P(G, x, y, ch); };
  put(0, 3, 5, 13, 'm'); put(25, 3, 5, 13, 'm');                    // 左右の柱
  put(1, 4, 3, 12, 'f'); put(26, 4, 3, 12, 'f');
  put(1, 5, 1, 10, 's'); put(28, 5, 1, 10, 's');                    // 柱の稜線
  put(5, 9, 20, 7, 'm'); put(6, 10, 18, 6, 'f');                    // 座面まわり
  put(4, 12, 22, 4, 'm');
  ARC(G, 15, 14, 11, 9, 182, 358, 'f');                             // 背もたれの縁
  ARC(G, 15, 14, 9.6, 7.6, 186, 354, 's');
  for (const a of [200, 225, 250, 290, 315, 340]) AT(G, 15, 14, 10.3, 8.3, a, 'G');   // 腐蝕の緑青
  put(12, 13, 6, 3, 't'); put(13, 12, 4, 1, 't');                   // 黒い樹脂だまり
  put(2, 2, 3, 2, 'j'); put(25, 2, 3, 2, 'j');
  put(0, 15, 30, 1, 'k');
  return R(G);
})();

// 背後から扇状に生える6本の「祈る腕」34×21。太さ3pxの芯＋稜線で、等倍でも6本と数えられる。
const B_PRAY = (() => {
  const G = g(34, 21);
  const bx = 16.5, by = 20;
  // 根元を6点に散らす＝1点から生やすと束になって「2枚の翼」に見える
  const roots = [[9, 19], [11.5, 17.5], [14, 16.5], [19, 16.5], [21.5, 17.5], [24, 19]];
  const arms = [
    [0, 9, 'blade'], [1, 3, 'hook'], [9, 0, 'orb'],
    [24, 0, 'orb'], [32, 3, 'blade'], [33, 9, 'hook'],
  ];
  for (let ai = 0; ai < arms.length; ai++) {
    const [tx, ty] = arms[ai];
    const [bx, by] = roots[ai];
    const ex = (bx + tx) / 2 + (tx - bx) * 0.18, ey = (by + ty) / 2 - 1.4;    // 肘
    LNT(G, bx, by, ex, ey, 'm', 5); LNT(G, ex, ey, tx, ty, 'm', 5);          // 腕の外郭
    LNT(G, bx, by, ex, ey, 'f', 3); LNT(G, ex, ey, tx, ty, 'f', 3);          // 芯
    LNT(G, bx, by, ex, ey, 's', 1); LNT(G, ex, ey, tx, ty, 's', 1);          // 稜線
    for (const [ox2, oy2] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]]) P(G, Math.round(ex) + ox2, Math.round(ey) + oy2, 'n');
  }
  for (const [tx, ty, kind] of arms) {
    if (kind === 'blade') { for (let k = 0; k < 4; k++) { P(G, tx, ty + k, k < 2 ? 'n' : 's'); P(G, tx + (tx < 16 ? 1 : -1), ty + k, 'f'); } }
    if (kind === 'hook') { P(G, tx, ty, 'G'); P(G, tx, ty + 1, 'G'); P(G, tx + (tx < 16 ? 1 : -1), ty + 2, 'n'); }
    if (kind === 'orb') {
      for (const [dx, dy, c] of [[0, 0, 'G'], [1, 0, 'G'], [0, 1, 'G'], [1, 1, 'G'], [-1, 0, 'g'], [2, 0, 'g'], [0, 2, 'g'], [1, 2, 'g'], [0, -1, 'g'], [1, -1, 'g']]) P(G, tx + dx, ty + dy, c);
    }
  }
  ARC(G, bx, by, 8.5, 8.5, 184, 356, 'm');
  ARC(G, bx, by, 7.2, 7.2, 188, 352, 'f');
  return R(G);
})();

// 王 18×15。座ったまま動かない上半身。兜の奥に赤い目、胸の中央に第1の核。
const B_KING = [
  '.......ffff.......',
  '.....fmssssmf.....',
  '....fmssnnssmf....',
  '....fmsnnnnsmf....',
  '...fmsnRRRRnsmf...',
  '...fmsnRRRRnsmf...',
  '....fmsnnnnsmf....',
  '......fmssmf......',
  '..kkjmmffffmmjkk..',
  '.kjmmffkkkkffmmjk.',
  'kjmmffkgGGGGgkffmj',
  'kjmmffkgGGGGgkffmj',
  'kjmmffkkkkkkkkffmj',
  '.kjmmffssssssffmj.',
  '..kjmmttttttmmjk..',
];

// 割れた冠 16×6。頭に載っていない＝頭上を公転している。中央で二片に割れている。
const B_CROWN = [
  '.Y..W..YY..W..Y.',
  '.YY.WW.YY.WW.YY.',
  'yYYYYYY..YYYYYYy',
  '.yyYYYY..YYYYyy.',
  '..kkkkk..kkkkk..',
  '...y........y...',
];

// 王笏 7×19。金属ではなくケーブル束で、先端に第2の核が実っている。
const B_SCEPTER = [
  '..GGG..',
  '.GcccG.',
  'GccWccG',
  'GcWWWcG',
  'GccWccG',
  '.GcccG.',
  '..GGG..',
  '..ygy..',
  '.sfgfs.',
  '.sfgfs.',
  '.fjgjf.',
  '.f.g.f.',
  '.sfgfs.',
  '.sfgfs.',
  '.fjgjf.',
  '.sfgfs.',
  '.sfgfs.',
  '..mjm..',
  '..kkk..',
];

const B_CORE = [
  '.GWWG.',
  'GWccWG',
  'GWRRWG',
  '.GWWG.',
];

export const CAND_B = {
  id: 'maouTrueB',
  name: '真マオウレクス／腐蝕の玉座',
  concept: '玉座と融合して二度と立てない王。背後から6本の「祈る腕」が扇状に生え、それぞれ別の武器を持つ。'
    + '割れた冠は頭に載らず頭上を公転し、王笏はケーブル束で先端に第2の核が実っている。',
  sprites: {
    throne: { rows: B_THRONE, palette: PAL_B },
    pray: { rows: B_PRAY, palette: PAL_B },
    king: { rows: B_KING, palette: PAL_B },
    crown: { rows: B_CROWN, palette: PAL_B },
    scepter: { rows: B_SCEPTER, palette: PAL_B },
    core: { rows: B_CORE, palette: PAL_B },
  },
  rig: [
    { role: 'wingR', tex: 'pray', ox: 0, oy: -4 },
    { role: 'legR', tex: 'throne', ox: 0, oy: 3 },
    { role: 'body', tex: 'king', ox: 0, oy: -3 },
    { role: 'armR', tex: 'scepter', ox: 13, oy: 0, origin: [0.5, 0.12] },
    { role: 'rack', tex: 'crown', ox: 0, oy: -14 },
    { role: 'core', tex: 'core', ox: 0, oy: 0.5 },
  ],
  tier: { spriteScale: 10.2, glowScale: 11.4, glowOuter: '#3fd9a0', glowInner: '#b8901f' },
};

// =====================================================================
// 案C 軌道神核 ― 本体は核だけ。装甲は体に触れず、複数の環として公転する
//   3つの環は傾きが全部違う（同心に描くと1つの輪郭に融合して目玉になる＝1回目の失敗）/
//   環に機械の聖句が刻まれ、環が一直線に揃った瞬間に攻撃が来る（予告が「形」で分かる）/
//   環は攻撃で割れ、割れ目から核を狙う / 核は瞬きする眼
// =====================================================================
const PAL_C = {
  k: '#04040c', j: '#141426', m: '#262640', f: '#454570', s: '#8a8ac2',
  n: '#cdcdf0',                                  // 金属の稜線
  c: '#ffffff', C: '#cfe0ff',
  a: '#ff2f6a', v: '#c98cff',
  y: '#ffd23f', Y: '#c9971f', W: '#ffedb0',      // 金（神々しさの担当）
  r: '#8a1622', R: '#e03040', O: '#ff8a2a',      // 深紅と炎（悪魔性の担当）
  g: '#3fd9c8', p: '#e070c0',                    // 干渉光（黒い金属の油膜色）
  // 環ごとの4段（深＝溝の底 / 暗 / 地 / 明＝稜線）。同じ色にすると3枚が1つの渦に融合する。
  // ⚠️ 最暗段は背景 #0a0a1e よりはっきり明るくすること。溶けると形が消えて黒い塊になる
  q: '#2a1e52', Q: '#4a3b7d', P: '#7c66c9', N: '#c0aef5',   // 紫
  e: '#1a2b4d', E: '#2f4f85', D: '#4d7ccc', M: '#a6c6f7',   // 青
  i: '#163f36', I: '#276b5c', H: '#3aa98a', L: '#96e9cd',   // 緑
};

// 環。1本の線ではなく「厚みのある装甲の帯」として焼く。
//   ・帯の断面を連続で塗り、外縁→内縁で 黒→深→暗→明→地→暗→黒 の階調をつける
//   ・等間隔の黒い溝（パネルライン）で装甲板に割り、板の中央に金の聖句を1点だけ刻む
//   ・外縁と内縁は必ず黒で締める。締めないと背景に溶けて「ペラペラの線」になる
//   ・a0..a1 で前半分/後半分だけを焼ける（球の手前と奥に振り分ける）
//   ・nodes＝環上の「祠」モジュール（菱形）。聖句解放の発射元になる
function ringSprite(w, h, rx, ry, rot, gaps, seamEvery, t, deep, dark, mid, lit, nodes = [], a0 = 0, a1 = 360, back = false) {
  const G = g(w, h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const rs = Math.max(0.6, ry / rx);
  for (let d = -t; d <= t + 1e-9; d += 0.3) {
    const u = (d + t) / (2 * t);
    // 奥半分は装飾を持たず一段暗い（視線の序列：眼＞球＞手前の環＞奥の環）。
    // ただし中芯に mid を1段通す。真っ黒にすると「輪の続き」ではなく影の塊に見える
    const ch = back
      ? (u < 0.08 ? 'k' : u < 0.28 ? deep : u < 0.50 ? dark : u < 0.62 ? mid : u < 0.80 ? dark : u < 0.92 ? deep : 'k')
      : (u < 0.08 ? 'k' : u < 0.24 ? deep : u < 0.42 ? dark
        : u < 0.62 ? lit : u < 0.80 ? mid : u < 0.92 ? dark : 'k');
    ARC(G, cx, cy, rx + d, ry + d * rs, a0, a1, ch, gaps, rot);
  }
  if (!back) {
    for (let ang = Math.ceil(a0 / seamEvery) * seamEvery; ang < a1; ang += seamEvery) {
      if (gaps.some(([s0, e0]) => ang >= s0 - 5 && ang <= e0 + 5)) continue;
      for (let d = -t * 0.86; d <= t * 0.86; d += 0.3) AT(G, cx, cy, rx + d, ry + d * rs, ang, 'k', rot);
    }
    // 板ごとの聖句は金。白だとリベットに、散らすとノイズになる
    for (let ang = Math.ceil((a0 - seamEvery / 2) / seamEvery) * seamEvery + seamEvery / 2; ang < a1; ang += seamEvery) {
      if (ang < a0 || gaps.some(([s0, e0]) => ang >= s0 - 7 && ang <= e0 + 7)) continue;
      AT(G, cx, cy, rx + t * 0.1, ry + t * 0.1 * rs, ang, 'y', rot);
    }
    for (let ang = a0 + 20; ang <= a1 - 20; ang += 40) {
      if (gaps.some(([s0, e0]) => ang >= s0 && ang <= e0)) continue;
      AT(G, cx, cy, rx - t * 0.22, ry - t * 0.22 * rs, ang, 'c', rot);
    }
    for (const [s0, e0] of gaps) {
      for (const ang of [s0 - 1, e0 + 1]) {
        if (ang < a0 || ang > a1) continue;
        for (let d = -t * 0.86; d <= t * 0.86; d += 0.3) AT(G, cx, cy, rx + d, ry + d * rs, ang, 'n', rot);
      }
    }
    // 祠モジュール（菱形）＝環に付いた小さな社。聖句解放の発射元として意味を持たせる
    const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);
    for (const na of nodes) {
      if (na < a0 || na > a1) continue;
      const t2 = na * Math.PI / 180;
      const ex = Math.cos(t2) * rx, ey = Math.sin(t2) * ry;
      const X = cx + ex * cr - ey * sr, Y = cy + ex * sr + ey * cr;
      for (const [dx, dy, ch] of [[2, 0, 'k'], [-2, 0, 'k'], [0, 2, 'k'], [0, -2, 'k'],
        [1, 0, lit], [-1, 0, lit], [0, 1, lit], [0, -1, lit], [0, 0, 'W']]) P(G, X + dx, Y + dy, ch);
    }
  }
  return R(G);
}

// ★同心（半径違い）はやめた。同じ半径で傾きだけ違う3つの軌道にしてある。
//   半径を変えて厚みを足すと帯どうしが重なって1枚の塊になる（実際そうなった）。
//   C-3 採用：手前を通すのは水平ベルトの前半分だけ。3枚とも手前に置くと球の質感が消える。
const RA = [51, 35, 23, 8.5, 24, [[64, 96]], 44, 3.4, 'q', 'Q', 'P', 'N', [140]];
const RB = [51, 35, 23, 8.5, -24, [[238, 270]], 44, 3.4, 'e', 'E', 'D', 'M', [40]];
const RC = [48, 19, 21, 6.4, 0, [[142, 174]], 50, 2.6, 'i', 'I', 'H', 'L', [62]];
const C_RING_AB = ringSprite(...RA, 180, 360, true), C_RING_AF = ringSprite(...RA, 0, 180);
const C_RING_BB = ringSprite(...RB, 180, 360, true), C_RING_BF = ringSprite(...RB, 0, 180);
const C_RING_CB = ringSprite(...RC, 180, 360, true), C_RING_CF = ringSprite(...RC, 0, 180);

// 光背（コロナ）43×25。球の背後から上半分に放射する黒鉄の尖塔＋金の縁。
// 最終ボスに要るのは「シルエットの格」。球と環だけだと土星で止まってしまう。
// 長短を交互にし、先端ほど細く、先端だけ白熱させる（仏像の放射光背と同じ文法）。
const C_CORONA = (() => {
  const W = 43, H = 26, cx = 21, cy = 20.8;
  const G = g(W, H);
  // 襟＝全尖塔が共有する台座。これが無いと尖塔が「浮かんだ金の紙吹雪」に散る（実際そうなった）
  for (let rr = 16.0; rr <= 17.6; rr += 0.3) ARC(G, cx, cy, rr, rr, 172, 368, rr > 17.2 ? 'Y' : rr < 16.4 ? 'j' : 'm');
  for (let i = 0; i < 9; i++) {
    const adeg = 175 + i * 23.75;
    const long = i % 2 === 0;
    const len = long ? 3.6 : 2.4, hw = long ? 1.7 : 1.1;
    const t = adeg * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t);
    const nx = -uy, ny = ux, r0 = 17.0;
    for (let u = 0; u <= 1; u += 0.02) {
      const rr = r0 + len * u, w2 = hw * (1 - u * 0.9);
      for (let k2 = -w2; k2 <= w2; k2 += 0.3) {
        const ch = u > 0.8 ? 'W' : k2 < -w2 * 0.4 ? 'Y' : k2 > w2 * 0.5 ? 'j' : 'f';
        P(G, cx + ux * rr + nx * k2, cy + uy * rr + ny * k2, ch);
      }
    }
  }
  return R(G);
})();

// 神核の本体＝装甲に覆われた球 33×33。ここが質感の主役。
//   ・明度は本物の球面シェーディング（法線×光源）を4段に量子化。手置きは必ず同心円の縞になる
//   ・段の境目は市松のディザで混ぜる＝べた塗りの「石膏」が磨いた金属に変わる
//   ・マオウレクス本体と同じ「大きな面＋黒い溝＋面の中の明度差」。溝の片側に光のエッジ
//   ・影側の段境に干渉光（teal/rose）をごく疎らに置く＝黒い金属の油膜色（虹色の干渉光）
//   ・影側の装甲の継ぎ目に亀裂＝内部の火が漏れる（転生の演出と地続きの「中身」）
//   ・手前を通るベルトの真下に落ち影を焼く＝前後関係が一目で分かる
const C_ORB = (() => {
  const G = g(33, 33);
  const c = 16, Rr = 16.0;
  const ramp = ['q', 'Q', 'P', 'N'];
  const LX = -0.46, LY = -0.54, LZ = 0.70;
  const inSphere = (x, y) => (x - c) ** 2 + (y - c) ** 2 <= Rr * Rr - 1;
  for (let y = 0; y < 33; y++) {
    for (let x = 0; x < 33; x++) {
      const nx = (x - c) / Rr, ny = (y - c) / Rr, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      const v = Math.pow(Math.max(0, nx * LX + ny * LY + nz * LZ), 1.05) * ramp.length;
      let k2 = Math.min(ramp.length - 1, Math.floor(v));
      const frac = v - k2;
      if (frac > 0.55 && k2 < ramp.length - 1 && (x + y) % 2 === 0) k2++;   // 市松ディザ
      if (d2 > 0.86) k2 = Math.max(k2, 1);                 // リムライト＝縁の回り込み
      P(G, x, y, d2 > 0.955 ? 'k' : ramp[k2]);
      if (v / ramp.length > 0.93 && d2 < 0.6) P(G, x, y, 'n');
    }
  }
  const put = (x, y, ch) => { if (inSphere(x, y)) P(G, x, y, ch); };
  // 経線の溝（2本が限界。増やすと面が細切れになって質感が消える）
  for (const lon of [-0.42, 0.42]) {
    for (let u = -1; u <= 1; u += 0.01) {
      const lat = u * Math.PI / 2;
      const X = c + Math.sin(lon * Math.PI) * Math.cos(lat) * Rr;
      const Y = c + Math.sin(lat) * Rr;
      put(X - 1, Y, 'k'); put(X, Y, 'k'); put(X + 1, Y, 'n');
    }
  }
  // 緯線の溝
  for (const u of [-0.45, 0.45]) {
    const lat = u * Math.PI / 2, rr = Math.cos(lat) * Rr, yy = c + Math.sin(lat) * Rr;
    for (const [dy, ch] of [[-1, 'n'], [0, 'k'], [1, 'k']]) {
      for (let ang = 0; ang < 360; ang += 0.4) {
        put(c + Math.cos(ang * Math.PI / 180) * rr, yy + Math.sin(ang * Math.PI / 180) * rr * 0.26 + dy, ch);
      }
    }
  }
  // 亀裂＝内部の火。影側（右下）だけ。窓の周りには掛けない
  // 亀裂は1px幅の稲妻＋ときどき明滅。太くすると「赤い口」になる（実際なった）
  const crack = (pts) => {
    let step = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const nseg = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
      for (let j2 = 0; j2 <= nseg; j2++) {
        const X = c + x0 + (x1 - x0) * j2 / nseg, Y = c + y0 + (y1 - y0) * j2 / nseg;
        if (Math.hypot(X - c, Y - c) < 10.2) continue;
        put(X, Y, (step++ % 3 === 0) ? 'R' : 'r');
      }
    }
    put(c + pts[1][0], c + pts[1][1], 'O');
  };
  crack([[11, -4], [13.5, 0], [12, 4], [14, 7]]);
  crack([[6, 11], [9, 10], [10.5, 13]]);
  // 手前を通る環の落ち影（環は常に同じ位置を通るので焼き込める）。窓の周りには掛けない
  const castShadow = (rx2, ry2, rot2) => {
    const cr2 = Math.cos(rot2 * Math.PI / 180), sr2 = Math.sin(rot2 * Math.PI / 180);
    for (let th = 16; th <= 164; th += 1) {
      const t2 = th * Math.PI / 180;
      const ex = Math.cos(t2) * rx2, ey = Math.sin(t2) * ry2;
      const X = c + ex * cr2 - ey * sr2, Y = c + ex * sr2 + ey * cr2;
      if (Math.hypot(X - c, Y + 3.5 - c) < 10.4) continue;
      put(X, Y + 3, 'q'); put(X, Y + 4, 'q');
    }
  };
  castShadow(21, 6.4, 0);   // 斜めの2枚は影を落とさない。3本焼くと球が影だらけになる
  // 窓枠は金の多段（1段だと紙を切り抜いた穴に見える）。16個の鋲を金と白熱で交互に
  DISC(G, c, c, 9.6, 'k');
  DISC(G, c, c, 9.0, 'Y');
  DISC(G, c, c, 8.3, 'f');
  DISC(G, c, c, 7.8, 'k');
  for (let i = 0; i < 8; i++) AT(G, c, c, 8.65, 8.65, 22.5 + i * 45, 'W');
  return R(G);
})();

// 核＝真マオウレクスの眼 15×15。ここがこのボスの顔なので、いちばん手を掛ける。
//   ・金属の眼窩（稜線つき）→白熱の強膜→金の輪→紫の虹彩（放射の筋）→縦裂の瞳
//   ・強膜の縁に血走り（4本の短い赤）＝生体の気配。機械の中の「生きている一点」
//   ・瞳の奥に炎の柱：深紅→橙→金の縦グラデーション
const C_EYE = (() => {
  const G = g(15, 15);
  const c = 7;
  DISC(G, c, c, 7.4, 'k');
  DISC(G, c, c, 6.9, 'f');
  DISC(G, c, c, 6.3, 'n');
  DISC(G, c, c, 5.7, 'k');
  DISC(G, c, c, 5.2, 'c');           // 強膜＝白熱
  DISC(G, c, c, 4.6, 'C');
  for (const [ang, len] of [[15, 1.6], [150, 2.0], [205, 1.5], [330, 1.9]]) {   // 血走り
    const t = ang * Math.PI / 180;
    for (let rr = 5.0; rr > 5.0 - len; rr -= 0.3) P(G, c + Math.cos(t) * rr, c + Math.sin(t) * rr * 0.9, 'a');
  }
  DISC(G, c, c, 3.9, 'y');           // 金の輪（虹彩の縁取り）
  DISC(G, c, c, 3.4, 'Q');           // 虹彩：外が暗く内が明るい＝奥行き
  DISC(G, c, c, 2.6, 'P');
  DISC(G, c, c, 1.8, 'v');
  for (const a2 of [20, 70, 110, 160, 200, 250, 290, 340]) {                    // 放射の筋
    const t = a2 * Math.PI / 180;
    LN(G, c + Math.cos(t) * 1.7, c + Math.sin(t) * 1.7, c + Math.cos(t) * 3.1, c + Math.sin(t) * 3.1, 'N');
  }
  for (let y = c - 4; y <= c + 4; y++) P(G, c, y, 'k');                         // 縦裂の瞳
  for (let y = c - 3; y <= c + 3; y++) { P(G, c - 1, y, 'k'); P(G, c + 1, y, 'k'); }
  P(G, c, c - 2, 'r'); P(G, c, c - 1, 'O'); P(G, c, c, 'y');                    // 奥の炎
  P(G, c, c + 1, 'O'); P(G, c, c + 2, 'r');
  P(G, c - 3, c - 3, 'c'); P(G, c - 2, c - 4, 'c');                             // ハイライト
  return R(G);
})();

export const CAND_C = {
  id: 'maouTrueC',
  name: '真マオウレクス／軌道神核',
  concept: '装甲に覆われた球（神核）の窓から、血走った単眼が覗く。背後には黒鉄と金の光背（コロナ）が'
    + '放射し、傾きの違う3つの環が球を貫いて公転する（C-4）。眼だけが環より手前＝眼がいちばん近い。'
    + '影側の装甲は亀裂から内部の火が漏れる。',
  sprites: {
    ringAb: { rows: C_RING_AB, palette: PAL_C }, ringAf: { rows: C_RING_AF, palette: PAL_C },
    ringBb: { rows: C_RING_BB, palette: PAL_C }, ringBf: { rows: C_RING_BF, palette: PAL_C },
    ringCb: { rows: C_RING_CB, palette: PAL_C }, ringCf: { rows: C_RING_CF, palette: PAL_C },
    corona: { rows: C_CORONA, palette: PAL_C },
    orb: { rows: C_ORB, palette: PAL_C },
    eye: { rows: C_EYE, palette: PAL_C },
  },
  // C-4：3枚とも球を貫く。前半分（dome/rack/cannon）は球の手前、後半分（wing/leg）は奥。
  // 眼（core）は最前面なので、環は眼の後ろへ潜って見える＝眼がいちばん近くにいる
  rig: [
    { role: 'thruster', tex: 'corona', ox: 0, oy: 0, origin: [0.5, 0.8] },
    { role: 'wingR', tex: 'ringAb', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'wingL', tex: 'ringBb', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'legR', tex: 'ringCb', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'body', tex: 'orb', ox: 0, oy: 0 },
    { role: 'dome', tex: 'ringAf', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'rack', tex: 'ringBf', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'cannon', tex: 'ringCf', ox: 0, oy: 0, origin: [0.5, 0.5] },
    { role: 'core', tex: 'eye', ox: 0, oy: 0 },
  ],
  tier: { spriteScale: 9.4, glowScale: 13.4, glowOuter: '#c98cff', glowInner: '#ffedb0' },
};

export const CANDIDATES = [CAND_A, CAND_B, CAND_C];

// ---- 行長とパレットの自己検査（ここで落ちるなら描く前に直す） ----
for (const cand of CANDIDATES) {
  for (const [name, sp] of Object.entries(cand.sprites)) {
    const w = sp.rows[0].length;
    sp.rows.forEach((r, i) => {
      if (r.length !== w) throw new Error(`${cand.id}/${name}: 行${i} の長さが ${r.length}（期待 ${w}）`);
      for (const ch of r) {
        if (ch !== '.' && !sp.palette[ch]) throw new Error(`${cand.id}/${name}: 行${i} の文字 "${ch}" がパレットに無い`);
      }
    });
  }
  for (const p of cand.rig) {
    if (!cand.sprites[p.tex]) throw new Error(`${cand.id}: rig tex "${p.tex}" が sprites に無い`);
  }
}
