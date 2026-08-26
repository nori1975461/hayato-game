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
  k: '#03030a', j: '#0b0b18', m: '#17172b', f: '#3a3a63', s: '#7d7db5',
  n: '#c2c2ea',                                  // 環の稜線
  c: '#ffffff', C: '#e8f2ff',
  a: '#ff2f6a', b: '#2f8cff', G: '#2fffb0', v: '#c98cff', y: '#ffd23f',
  // 環ごとの地色（外＝紫 / 中＝青 / 内＝緑）。同じ色にすると3枚が1つの渦に融合する
  Q: '#33285c', P: '#6f58bc', N: '#b8a4f2',
  E: '#1e3560', D: '#3f6dc0', M: '#9dc0f5',
  I: '#1b4a42', H: '#2f9f80', L: '#8fe6c8',
};

// 環。厚み3の楕円＋刻まれた聖句（2px）＋欠け。rot で傾ける。
function ringSprite(w, h, rx, ry, rot, glyphCol, gaps, glyphEvery, dark, mid, lit) {
  const G = g(w, h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  ARC(G, cx, cy, rx, ry, 0, 360, dark, gaps, rot);
  ARC(G, cx, cy, rx - 1.1, ry - 1.1, 0, 360, mid, gaps, rot);   // 中を明るく＝等倍で環だと分かる
  ARC(G, cx, cy, rx - 2.1, ry - 2.1, 0, 360, dark, gaps, rot);
  ARC(G, cx, cy, rx - 1.1, ry - 1.1, 0, 34, lit, [], rot);       // 進む側だけ光る＝回転の向き
  ARC(G, cx, cy, rx - 1.1, ry - 1.1, 180, 214, lit, [], rot);
  for (let a = 0; a < 360; a += glyphEvery) {                     // 刻まれた聖句（2px＝等倍で読める）
    if (gaps.some(([s, e]) => a >= s && a <= e)) continue;
    AT(G, cx, cy, rx - 1.1, ry - 1.1, a, glyphCol, rot);
    AT(G, cx, cy, rx - 1.1, ry - 1.1, a + 3, glyphCol, rot);
  }
  for (const [s, e] of gaps) {                                    // 割れ口の断面
    AT(G, cx, cy, rx - 1.1, ry - 1.1, s - 1, 'c', rot);
    AT(G, cx, cy, rx - 1.1, ry - 1.1, e + 1, 'c', rot);
  }
  return R(G);
}

const C_RING_OUT = ringSprite(40, 24, 19, 8.6, 0, 'N', [[62, 98]], 40, 'Q', 'P', 'c');
const C_RING_MID = ringSprite(34, 30, 15.5, 7.0, -37, 'M', [[238, 272]], 45, 'E', 'D', 'c');
const C_RING_IN = ringSprite(26, 24, 11.5, 5.4, 46, 'L', [[140, 176]], 50, 'I', 'H', 'c');

// 核を包んでいた装甲が4片に割れて浮いている 24×24。片ごとに外へずれている。
const C_SHARDS = (() => {
  const G = g(17, 17);
  const cx = 8, cy = 8;
  for (const [a0, a1] of [[196, 252], [278, 334], [22, 74], [104, 158]]) {
    const mid = (a0 + a1) / 2 * Math.PI / 180;
    const dx = Math.cos(mid) * 1.5, dy = Math.sin(mid) * 1.5;
    ARC(G, cx + dx, cy + dy, 6.4, 6.4, a0, a1, 'f');
    ARC(G, cx + dx, cy + dy, 5.4, 5.4, a0, a1, 'n');
    ARC(G, cx + dx, cy + dy, 4.4, 4.4, a0, a1, 'f');
    AT(G, cx + dx, cy + dy, 5.4, 5.4, a0, 'c'); AT(G, cx + dx, cy + dy, 5.4, 5.4, a1, 'c');
  }
  return R(G);
})();

// 核＝瞬きする眼 9×9。虹彩は白熱、瞳は虚無の黒。
const C_EYE = [
  '..ccc..',
  '.cCCCc.',
  'cCCkCCc',
  'cCkkkCc',
  'cCCkCCc',
  '.cCCCc.',
  '..ccc..',
];

export const CAND_C = {
  id: 'maouTrueC',
  name: '真マオウレクス／軌道神核',
  concept: '本体は核だけ。装甲は体に触れず、傾きの違う3つの環として別々の速さで公転する。環に機械の聖句が'
    + '刻まれ、環が一直線に揃った瞬間に攻撃が来る（予告が「形」で分かる）。環は攻撃で割れ、割れ目から核を狙う。',
  sprites: {
    ringOut: { rows: C_RING_OUT, palette: PAL_C },
    ringMid: { rows: C_RING_MID, palette: PAL_C },
    ringIn: { rows: C_RING_IN, palette: PAL_C },
    shards: { rows: C_SHARDS, palette: PAL_C },
    eye: { rows: C_EYE, palette: PAL_C },
  },
  rig: [
    { role: 'wingR', tex: 'ringOut', ox: 0, oy: 0 },
    { role: 'body', tex: 'shards', ox: 0, oy: 0 },
    { role: 'dome', tex: 'ringMid', ox: 0, oy: 0 },
    { role: 'rack', tex: 'ringIn', ox: 0, oy: 0 },
    { role: 'core', tex: 'eye', ox: 0, oy: 0 },
  ],
  tier: { spriteScale: 10.4, glowScale: 12.6, glowOuter: '#c98cff', glowInner: '#ffffff' },
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
