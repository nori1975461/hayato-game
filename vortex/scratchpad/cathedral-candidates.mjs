// 「堕天の大聖堂」（旧・真マオウレクス案A）を、軌道神核（案C）と同じ水準まで昇華させる。
// ジャム版のボス②として単体で出す前提（マオウの転生形ではない）。
//
// 旧・案Aの下絵（maou-true-candidates.mjs）が案Cに負けていた理由＝案Cで踏んだ作法を1つも使っていない：
//   ・パーツが小さい（頭17×11・胴18×13）／面がべた塗り／稜線と溝が無い／色が13色
//   ・「大聖堂」なのに建築の語彙（尖塔・飛梁・薔薇窓の狭間飾り・石積み）が1つも無い
//   ・翼が「骨」だけで閉じた輪郭を持たず、蜘蛛の脚に見えた（初稿の失敗メモどおり）
//
// 昇華の方針（案Cと同じ文法を、建築の語彙で言い直す）：
//   ①シルエットの格 … 背後に双つの尖塔＋飛梁（案Cのコロナに相当）。黒塗りで「聖堂」と言い当てられる形
//   ②大きな面＋黒い溝＋面の中の明度差 … 胴は石積み（目地）、翼は鉄骨（リベット・筋交い）
//   ③素材ごとに4段の階調 … 石・鉄・金・硝子。段の境目は市松ディザ
//   ④黒で締める … 全パーツの外縁は必ず k。締めないと #0a0a1e に溶ける
//   ⑤生きている一点 … 薔薇窓の中心の単眼と、開いた胸の聖核（案Cの眼に相当）
//   ⑥退廃 … 欠けて逆回転する光輪・折れた翼・切れて銅線を晒す配線束・鉄の油膜色
//
// 縛り（[[feedback_boss_sprite_originality]] / [[feedback_pixel_art_judge_at_play_zoom]]）：
//   ・既存パーツのスケール加工は不可。全パーツ新規
//   ・完了報告の前に必ずPNG化し、等倍（640×360・主人公scale3）で目視
//   ・幾何（環・弧・桁）はラスタライザで生成、手描きは意図を込める面だけ

// ---- ラスタライザ（maou-true-candidates.mjs と同じもの。オーサリング専用） ----
const g = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const P = (G, x, y, ch) => {
  x = Math.round(x); y = Math.round(y);
  if (G[y] && x >= 0 && x < G[0].length) G[y][x] = ch;
};
const GET = (G, x, y) => { x = Math.round(x); y = Math.round(y); return (G[y] && x >= 0 && x < G[0].length) ? G[y][x] : null; };
const LN = (G, x0, y0, x1, y1, ch) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3));
  for (let i = 0; i <= n; i++) P(G, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch);
};
const LNT = (G, x0, y0, x1, y1, ch, t = 2) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  for (let k = -(t - 1) / 2; k <= (t - 1) / 2 + 1e-9; k += 0.5) {
    LN(G, x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, ch);
  }
};
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
const RECT = (G, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(G, x, y, ch); };
// 外縁を黒で締める：塗られたセルの4近傍が空なら k を置く（④の自動化）
const OUTLINE = (G, ch = 'k') => {
  const H = G.length, W = G[0].length, add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (G[y][x] !== '.') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = GET(G, x + dx, y + dy); return c && c !== '.' && c !== ch; })) add.push([x, y]);
  }
  for (const [x, y] of add) G[y][x] = ch;
};
const R = (G) => G.map((r) => r.join(''));

// =====================================================================
// パレット（26色）。素材ごとに4段＝案Cと同じ。最暗段は背景 #0a0a1e より明るく保つ
// =====================================================================
export const PAL = {
  k: '#04040c',                                   // 締めの黒
  q: '#161c33', Q: '#293557', P: '#45588a', N: '#8ea3d4',   // 石（青灰の石積み）
  n: '#d2ddf6',                                   // 石の稜線・ハイライト
  j: '#12121c', m: '#25273a', f: '#42465e', s: '#767c9c',   // 鉄（翼・扉・配線束）
  y: '#7a5a10', Y: '#c9971f', G: '#ffd23f', W: '#ffedb0',   // 金（光輪・縁飾り・鋲）
  r: '#5c0a18', R: '#c81736', A: '#ff5a6a',                 // 深紅の硝子・聖核の心臓
  b: '#0f2258', B: '#1f47b8', D: '#5f8cff',                 // 藍の硝子・胸の奥の光
  o: '#8a3a12', O: '#ff8a2a',                               // 銅線の切り口・火花
  c: '#ffffff', C: '#cfe0ff',                               // 白熱
  g: '#3fd9c8', p: '#e070c0',                               // 黒い鉄の油膜色（干渉光）
};

// =====================================================================
// ① 尖塔＋飛梁（thruster）46×32。背後で聖堂のシルエットを作る＝案Cのコロナに相当。
//    双つの塔は左右で高さを変え（右が折れて低い）、間に破風。飛梁は塔の腹から肩へ落ちる。
// =====================================================================
const SPIRES = (() => {
  const W = 74, H = 46, G = g(W, H), C = 36.5;
  const tower = (x0, top, broken) => {
    const TW = 9, x1 = x0 + TW - 1;
    // 塔身：石の4段。左面が明、右面が暗（光源は左上）
    for (let y = top + 6; y < H; y++) {
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (TW - 1);
        let ch = u < 0.22 ? 'N' : u < 0.55 ? 'P' : u < 0.82 ? 'Q' : 'q';
        if ((y - top) % 5 === 0) ch = 'k';                                        // 石段の目地（横）
        else if (((x - x0 + Math.floor((y - top) / 5) * 2) % 4) === 0) ch = 'q'; // 縦の目地（千鳥）
        P(G, x, y, ch);
      }
    }
    // ランセット窓（藍・上端だけ明るい）＝塔ごとに2つ
    for (const wy of [top + 9, top + 19, top + 29]) {
      if (wy + 6 >= H) continue;
      RECT(G, x0 + 3, wy, x0 + 5, wy + 6, 'b'); P(G, x0 + 4, wy - 1, 'b');
      P(G, x0 + 4, wy, 'D'); P(G, x0 + 3, wy + 1, 'B'); P(G, x0 + 4, wy + 1, 'B');
      P(G, x0 + 2, wy, 'k'); P(G, x0 + 6, wy, 'k');
    }
    // コーニス（塔身の上端に金の帯）
    for (let x = x0; x <= x1; x++) { P(G, x, top + 6, x % 2 ? 'Y' : 'G'); P(G, x, top + 7, 'y'); }
    if (!broken) {
      // 尖頂：三角に絞り、頂に金の十字
      for (let y = top; y < top + 6; y++) {
        const hw = (y - top) * 0.75 + 0.5;
        for (let x = x0 + 4 - hw; x <= x0 + 4 + hw; x++) P(G, x, y, x < x0 + 4 ? 'P' : 'Q');
        P(G, x0 + 4 - hw, y, 'n');
      }
      RECT(G, x0 + 4, top - 4, x0 + 4, top - 1, 'G'); RECT(G, x0 + 3, top - 3, x0 + 5, top - 3, 'G'); P(G, x0 + 4, top - 4, 'W');
    } else {
      // 折れた塔：ぎざぎざの破断面。切り口に白熱と火花・欠片が浮く
      for (let x = x0; x <= x1; x++) { const yy = top + 3 + ((x * 5) % 4); RECT(G, x, yy, x, top + 6, x < x0 + 4 ? 'P' : 'Q'); P(G, x, yy - 1, 'k'); }
      P(G, x0 + 2, top + 2, 'W'); P(G, x0 + 6, top + 1, 'O'); P(G, x0 + 4, top - 2, 'Q'); P(G, x0 + 5, top - 2, 'Q'); P(G, x0 + 7, top - 4, 'q');
    }
    // 塔の稜線（左縁を明るく）
    for (let y = top + 8; y < H; y++) if ((y - top) % 5 !== 0) P(G, x0, y, 'n');
  };
  tower(2, 13, true);        // 左塔：折れている（折れた翼と同じ側＝損傷は左に揃える）
  tower(63, 4, false);       // 右塔：高い・無傷。十字と尖頂が大翼の上に出る
  // 中央の破風（尖りアーチの妻壁）：頭の後ろで輪郭だけ出る。上に小さい尖塔
  for (let y = 8; y < H; y++) {
    const hw = Math.min(16, (y - 8) * 1.1 + 1);
    for (let x = C - hw; x <= C + hw; x++) if (GET(G, x, y) === '.') P(G, x, y, (y - 8) % 5 === 0 ? 'k' : (x < C ? 'Q' : 'q'));
    if (hw < 16) { P(G, C - hw, y, 'n'); }
  }
  RECT(G, 36, 4, 37, 7, 'P'); P(G, 36, 3, 'G'); P(G, 37, 3, 'G'); P(G, 36, 2, 'W');
  // 飛梁（フライング・バットレス）：塔の腹から中央の妻壁へ架かる弧。厚み3の石の帯＋アーチ下の空
  for (const [cx, a0, a1, flip] of [[13, 275, 350, 1], [60, 190, 265, -1]]) {
    ARC(G, cx, 44, 21, 20, a0, a1, 'k');
    ARC(G, cx, 44, 20, 19, a0, a1, flip > 0 ? 'P' : 'Q');
    ARC(G, cx, 44, 19, 18, a0, a1, flip > 0 ? 'N' : 'P');
    ARC(G, cx, 44, 18, 17, a0, a1, flip > 0 ? 'P' : 'q');
    ARC(G, cx, 44, 17, 16, a0, a1, 'k');
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ② 光輪（dome）38×11。欠けた金の歯車の環。厚み3の帯を4段で焼き、外側に歯を立てる。
//    欠けは右。切り口は白熱＋火花＝「いま壊れている」
// =====================================================================
const HALO = (() => {
  const W = 38, H = 11, G = g(W, H);
  const cx = 18.5, cy = 5, rx = 17, ry = 4.2;
  const GAP = [[318, 360], [0, 22]];
  for (let d = -1.5; d <= 1.5; d += 0.25) {
    const u = (d + 1.5) / 3;
    const ch = u < 0.2 ? 'y' : u < 0.45 ? 'Y' : u < 0.75 ? 'G' : 'Y';
    ARC(G, cx, cy, rx + d, ry + d * 0.35, 0, 360, ch, GAP);
  }
  // 手前（下側＝90°付近）は白熱の稜線＝こちら側が向かってくる（逆回転の向き）
  ARC(G, cx, cy, rx - 0.6, ry - 0.25, 40, 140, 'W', GAP);
  // 歯：等間隔に外へ1px立てる
  for (let a = 8; a < 360; a += 24) {
    if (GAP.some(([s, e]) => a >= s - 6 && a <= e + 6)) continue;
    AT(G, cx, cy, rx + 2.2, ry + 1.0, a, 'Y'); AT(G, cx, cy, rx + 2.9, ry + 1.4, a, 'y');
  }
  // 切り口
  for (const a of [316, 24]) { AT(G, cx, cy, rx, ry, a, 'c'); AT(G, cx, cy, rx + 0.8, ry + 0.3, a, 'W'); }
  AT(G, cx, cy, rx + 3.5, ry + 2.4, 350, 'O'); AT(G, cx, cy, rx + 2.6, ry + 3.6, 335, 'W'); AT(G, cx, cy, rx + 4.2, ry + 1.2, 8, 'O');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ③ 頭＝薔薇窓（rack）21×21。顔は無い。石の縁→金の枠→12枚の硝子（深紅と藍が交互）→
//    放射の鉛桟→金の内輪→中心に単眼（白熱・縦裂の瞳・奥に炎）。案Cの眼と同じ「生きている一点」
// =====================================================================
const ROSE = (() => {
  const W = 21, H = 21, G = g(W, H), c = 10;
  DISC(G, c, c, 10.4, 'k');
  DISC(G, c, c, 9.8, 'Q');                 // 石の縁
  for (let a = 0; a < 360; a += 30) AT(G, c, c, 9.4, 9.4, a, 'k');   // 石の目地
  ARC(G, c, c, 9.6, 9.6, 190, 300, 'N');   // 石の縁の稜線（左上）
  DISC(G, c, c, 8.6, 'k');
  DISC(G, c, c, 8.1, 'Y');                 // 金の枠
  ARC(G, c, c, 7.9, 7.9, 195, 290, 'G');
  DISC(G, c, c, 7.2, 'k');
  // 硝子：12枚の花弁。角度で色を交互、左上は明段、右下は暗段
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
    if (d > 6.9 || d < 2.9) continue;
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + 15) % 360;
    const petal = Math.floor(ang / 30);
    const red = petal % 2 === 0;
    const lit = (dx * -0.6 + dy * -0.8) > 0.8;
    const dim = (dx * 0.6 + dy * 0.8) > 3.6;
    P(G, x, y, red ? (lit ? 'A' : dim ? 'r' : 'R') : (lit ? 'D' : dim ? 'b' : 'B'));
  }
  for (let a = 0; a < 360; a += 30) {       // 鉛の桟（放射）
    const t = a * Math.PI / 180;
    LN(G, c + Math.cos(t) * 2.8, c + Math.sin(t) * 2.8, c + Math.cos(t) * 7.0, c + Math.sin(t) * 7.0, 'k');
  }
  for (let a = 15; a < 360; a += 30) AT(G, c, c, 5.2, 5.2, a, 'c');   // 花弁ごとの1点のハイライト
  DISC(G, c, c, 3.3, 'k');
  DISC(G, c, c, 2.9, 'Y');                 // 金の内輪
  DISC(G, c, c, 2.3, 'k');
  DISC(G, c, c, 1.9, 'c');                 // 単眼：白熱
  P(G, c, c - 1, 'k'); P(G, c, c, 'k'); P(G, c, c + 1, 'k');   // 縦裂の瞳
  P(G, c, c, 'O');                         // 瞳の奥の炎
  P(G, c - 1, c - 1, 'C');
  for (let i = 0; i < 8; i++) AT(G, c, c, 8.1, 8.1, 22.5 + i * 45, 'W');   // 金枠の鋲
  return R(G);
})();

// =====================================================================
// ④ 胴＝身廊（body）28×17。石積みの塊。中央が観音開きに割れ、藍の内陣が見える。
//    扉は左右に開いた鉄板（蝶番は金）。上端に金の蛇腹。
// =====================================================================
const NAVE = (() => {
  const W = 28, H = 17, G = g(W, H);
  // 石積み：左上が明、右下が暗。3段ごとに横目地、千鳥に縦目地
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const u = (x + y * 1.4) / (W + H * 1.4);
    let ch = u < 0.28 ? 'N' : u < 0.52 ? 'P' : u < 0.78 ? 'Q' : 'q';
    if (u >= 0.25 && u < 0.31 && (x + y) % 2 === 0) ch = 'P';       // 市松ディザ
    if (u >= 0.49 && u < 0.55 && (x + y) % 2 === 0) ch = 'Q';
    if (y % 3 === 0) ch = 'k';
    else if (((x + (Math.floor(y / 3) % 2) * 3) % 6) === 0) ch = 'q';
    P(G, x, y, ch);
  }
  // 上端の金の蛇腹（コーニス）
  for (let x = 1; x < W - 1; x++) { P(G, x, 1, x % 3 === 0 ? 'Y' : 'G'); P(G, x, 2, 'y'); }
  // 肩：両端に石の柱頭（立体感）
  for (const x of [1, 2, W - 3, W - 2]) for (let y = 3; y < H - 1; y++) P(G, x, y, x < 3 ? (y % 3 === 0 ? 'k' : 'n') : (y % 3 === 0 ? 'k' : 'q'));
  // 観音開きの開口：尖りアーチ。内陣は藍、中心ほど明るい
  const ax = 13.5, top = 4, bot = 15, hw = 4.5;
  for (let y = top; y <= bot; y++) {
    const w2 = y < top + 3 ? (y - top + 1) * 1.4 : hw;
    for (let x = ax - w2; x <= ax + w2; x++) {
      const d = Math.hypot((x - ax) / hw, (y - 10) / 5.5);
      P(G, x, y, d < 0.45 ? 'D' : d < 0.8 ? 'B' : 'b');
    }
  }
  for (let y = top; y <= bot; y++) { const w2 = y < top + 3 ? (y - top + 1) * 1.4 : hw; P(G, ax - w2 - 1, y, 'k'); P(G, ax + w2 + 1, y, 'k'); }
  P(G, ax - 0.5, top - 1, 'k'); P(G, ax + 0.5, top - 1, 'k');
  // 内陣の祭壇段（奥行き）：下に2段の白い線
  LN(G, ax - 3, bot - 1, ax + 3, bot - 1, 'C'); LN(G, ax - 2, bot - 2, ax + 2, bot - 2, 'D');
  // 開いた扉：開口の外側に鉄板2枚（外へ開いている）。蝶番の金2点
  for (const [x0, dir] of [[ax - hw - 5, 1], [ax + hw + 2, -1]]) {
    for (let y = top + 2; y <= bot; y++) for (let x = x0; x <= x0 + 3; x++) {
      const inner = (dir > 0 ? x - x0 : x0 + 3 - x);
      P(G, x, y, inner === 0 ? 'j' : inner === 1 ? 'm' : inner === 2 ? 'f' : 's');
    }
    P(G, x0 + (dir > 0 ? 3 : 0), top + 4, 'G'); P(G, x0 + (dir > 0 ? 3 : 0), bot - 3, 'G');
    for (let y = top + 3; y <= bot - 1; y += 3) P(G, x0 + (dir > 0 ? 1 : 2), y, 'Y');   // 鋲
  }
  // 引きちぎられた腰：下端2行を不規則に欠く
  for (let x = 1; x < W - 1; x++) { const cutY = H - 1 - ((x * 5 + 2) % 3); for (let y = cutY; y < H; y++) if (x < 8 || x > W - 9) P(G, x, y, '.'); }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑤ 聖核（core）12×8。開いた胸の奥で白熱する聖遺物。金の輪→白熱→深紅の心臓。四方に金の光条
// =====================================================================
const RELIC = (() => {
  const W = 12, H = 8, G = g(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 5.5) / 5.6, (y - 3.5) / 3.6);
    if (d > 1) continue;
    P(G, x, y, d > 0.82 ? 'k' : d > 0.66 ? 'Y' : d > 0.5 ? 'W' : 'c');
  }
  RECT(G, 4, 3, 7, 4, 'R'); P(G, 5, 2, 'R'); P(G, 6, 2, 'R'); P(G, 5, 5, 'A'); P(G, 6, 5, 'A'); P(G, 4, 3, 'A');
  P(G, 5, 3, 'O');
  P(G, 0, 0, 'G'); P(G, 11, 0, 'G'); P(G, 0, 7, 'G'); P(G, 11, 7, 'G');
  return R(G);
})();

// =====================================================================
// ⑥ 翼・右（wingR）30×26。羽根の無い鉄骨の翼。
//    初稿は骨だけで蜘蛛の脚に見えた→前縁に太い主桁（閉じた輪郭）を通し、内側にトラス。
//    鉄は油膜色（teal/rose）を影側に疎らに置く。桁にはリベット（金）
// =====================================================================
// 翼＝コウモリの翼の骨格を鉄骨で組み、骨の間に「錆びた鉄板の膜」を張る。膜は破れて穴が開く。
//   ・膜があるから遠目に「翼」の閉じた形になる（初稿の扇＝骨だけの失敗を直す）
//   ・骨は太さ3の鉄（外郭j／芯f／稜線s）、根元に金の関節、骨の途中に金のリベット
//   ・tips は根元から放射する骨の先端。隣り合う骨の間を膜（三角形）で埋め、tear で穴を抜く
function ironWing(W, H, root, wrist, tips, tears, brokenAt) {
  const G = g(W, H);
  const [bx, by] = root, [wx, wy] = wrist;
  // 膜：手首を中心に、隣り合う指の間を扇形に埋め、後縁は指の間で内側へ食い込ませる（波形）
  //     さらに最後の指と肩の間にも膜（体側の膜）
  const polar = (x, y) => [Math.hypot(x - wx, y - wy), Math.atan2(y - wy, x - wx)];
  const fingers = tips.map(([x, y]) => polar(x, y));
  const shade = (u, x, y) => {
    let ch = u < 0.35 ? 'j' : u < 0.7 ? 'm' : 'f';
    if (u >= 0.32 && u < 0.38 && (x + y) % 2) ch = 'm';
    if (u >= 0.67 && u < 0.73 && (x + y) % 2) ch = 'f';
    if (((x * 7 + y * 3) % 11) === 0) ch = u < 0.5 ? 'm' : 's';
    return ch;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [r, a] = polar(x, y);
    for (let i = 0; i < fingers.length - 1; i++) {
      const [r0, a0] = fingers[i], [r1, a1] = fingers[i + 1];
      const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      if (a < lo || a > hi || hi - lo > Math.PI) continue;
      const v = (a - a0) / (a1 - a0);
      const rmax = (r0 + (r1 - r0) * v) * (1 - 0.32 * Math.sin(Math.PI * v));
      if (r <= rmax) P(G, x, y, shade(r / rmax, x, y));
      break;
    }
  }
  // 体側の膜：肩・手首・最後の指先の三角
  const last = tips[tips.length - 1];
  const inTri = (px, py, a, b, c) => {
    const s1 = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
    const s2 = (c[0] - b[0]) * (py - b[1]) - (c[1] - b[1]) * (px - b[0]);
    const s3 = (a[0] - c[0]) * (py - c[1]) - (a[1] - c[1]) * (px - c[0]);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (GET(G, x, y) !== '.' || !inTri(x, y, root, wrist, last)) continue;
    // 肩と指先を結ぶ辺を内側へ食い込ませる
    const t = ((x - bx) * (last[0] - bx) + (y - by) * (last[1] - by)) / (Math.hypot(last[0] - bx, last[1] - by) ** 2);
    const ex = bx + (last[0] - bx) * t, ey = by + (last[1] - by) * t;
    const dEdge = Math.hypot(x - ex, y - ey);
    if (dEdge < 3.2 * Math.sin(Math.PI * Math.max(0, Math.min(1, t)))) continue;
    P(G, x, y, shade(Math.hypot(x - wx, y - wy) / fingers[fingers.length - 1][0], x, y));
  }
  // 破れ：膜に穴を抜く。縁は k
  for (const [tx, ty, rx, ry] of tears) {
    for (let y = ty - ry - 1; y <= ty + ry + 1; y++) for (let x = tx - rx - 1; x <= tx + rx + 1; x++) {
      const d = Math.hypot((x - tx) / rx, (y - ty) / ry);
      if (d <= 1) P(G, x, y, '.'); else if (d <= 1.45 && GET(G, x, y) && GET(G, x, y) !== '.') P(G, x, y, 'k');
    }
  }
  // 骨：上腕（肩→手首）は太さ4、指は太さ3。外郭 j → 芯 f → 稜線 s
  LNT(G, bx, by, wx, wy, 'j', 4.5); LNT(G, bx, by, wx, wy, 'f', 2.5); LNT(G, bx, by, wx, wy, 's', 1);
  for (const [tx, ty] of tips) LNT(G, wx, wy, tx, ty, 'j', 3.2);
  for (const [tx, ty] of tips) LNT(G, wx, wy, tx, ty, 'f', 1.8);
  for (const [tx, ty] of tips) LNT(G, wx, wy, tx, ty, 's', 1);
  // 指先の爪（金）・リベット
  for (const [tx, ty] of tips) { P(G, tx, ty, 'Y'); P(G, wx + (tx - wx) * 0.5, wy + (ty - wy) * 0.5, 'Y'); }
  P(G, bx + (wx - bx) * 0.5, by + (wy - by) * 0.5, 'Y');
  // 油膜色：骨の影側に疎らに
  for (const [tx, ty] of tips) for (const u of [0.35, 0.8]) { const X = Math.round(wx + (tx - wx) * u + 1), Y = Math.round(wy + (ty - wy) * u + 1); if (GET(G, X, Y) === 'j') P(G, X, Y, u > 0.5 ? 'p' : 'g'); }
  // 関節：肩（大）と手首（小）の金
  DISC(G, bx, by, 3.0, 'k'); DISC(G, bx, by, 2.3, 'Y'); P(G, bx - 1, by - 1, 'W'); P(G, bx, by, 'y');
  DISC(G, wx, wy, 2.0, 'k'); DISC(G, wx, wy, 1.4, 'Y'); P(G, wx, wy - 1, 'W');
  // 折れ：矩形を消して切り口に火花
  if (brokenAt) { const [x0, y0, x1, y1] = brokenAt; RECT(G, x0, y0, x1, y1, '.'); P(G, x0 - 1, y0 + 1, 'O'); P(G, x0 - 2, y0 - 1, 'W'); P(G, x0 - 1, y1, 'O'); }
  OUTLINE(G);
  return R(G);
}
// 右翼：大きく開く。肩(2,24)→手首(13,5)。指4本が右へ・下へ広がる。膜に穴2つ
const WING_R = ironWing(38, 34, [2, 24], [13, 6], [[29, 3], [36, 12], [34, 23], [25, 32]],
  [[24, 14, 2.6, 2], [20, 25, 2, 2.6]], null);
// 左翼：折れて短い。肩(2,18)→手首(11,4)。指2本、下側の指が途中で折れている
const WING_L = ironWing(28, 24, [2, 18], [11, 4], [[24, 1], [27, 10], [22, 20]],
  [[17, 9, 2.2, 1.8]], [20, 13, 27, 23]);

// =====================================================================
// ⑦ 腕（armR/armL）8×13。祈りの形に垂れた鉄の腕。肘と手首に金の環。
// =====================================================================
const ARM = (() => {
  const W = 8, H = 13, G = g(W, H);
  for (let y = 1; y < H - 1; y++) for (let x = 2; x <= 5; x++) P(G, x, y, x === 2 ? 's' : x === 3 ? 'f' : x === 4 ? 'm' : 'j');
  RECT(G, 1, 1, 6, 2, 'f'); P(G, 1, 1, 's');                    // 肩の張り出し
  for (const y of [5, 10]) { for (let x = 1; x <= 6; x++) P(G, x, y, 'Y'); P(G, 1, y, 'W'); }   // 金の環
  RECT(G, 2, 11, 5, 12, 'm'); P(G, 3, 12, 'f'); P(G, 4, 12, 'f');  // 握った手
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑧ 配線束（legL）26×13。腰から垂れて床を引きずる。太い束3本、切り口に銅線と火花。
// =====================================================================
const CABLES = (() => {
  const W = 26, H = 13, G = g(W, H);
  // 上端は腰の幅いっぱいの鉄の腰板（配線の出口）
  for (let x = 4; x <= 21; x++) { P(G, x, 0, 'f'); P(G, x, 1, x % 3 === 0 ? 'k' : 'm'); }
  const bundle = (x0, x1, y1, sway, thick) => {
    // 上から下へ、たわみながら落ちる。太さ2（芯 f・影 j）、締めバンドは s
    for (let y = 1; y <= y1; y++) {
      const t = (y - 1) / (y1 - 1);
      const xx = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * sway;
      P(G, xx, y, 'f'); if (thick > 1) P(G, xx + 1, y, 'j');
      if (y % 4 === 2) { P(G, xx, y, 's'); if (thick > 1) P(G, xx + 1, y, 'm'); }
    }
    // 切り口：銅線が2〜3本ばらける
    P(G, x1, y1 + 1, 'O'); P(G, x1 - 1, y1 + 1, 'o'); P(G, x1 + 1, y1 + 2, 'o');
  };
  bundle(5, 1, 12, -2.5, 2);
  bundle(9, 10, 6, 1.0, 1);
  bundle(13, 15, 10, -1.5, 2);
  bundle(17, 16, 5, 0.5, 1);
  bundle(20, 24, 12, 2.5, 2);
  // 床を引きずるループ（右下）
  ARC(G, 9, 12, 5, 1.6, 0, 180, 'f'); ARC(G, 9, 12, 5, 1.6, 20, 160, 'j');
  // 火花
  P(G, 0, 11, 'W'); P(G, 25, 12, 'O'); P(G, 11, 13, 'W');
  OUTLINE(G);
  return R(G);
})();

export const CATHEDRAL = {
  id: 'cathedral',
  name: '堕天の大聖堂',
  concept: '下半身を失って宙に浮く聖堂。背後に双つの尖塔（右は折れている）と飛梁。'
    + '欠けた金の歯車の光輪が逆回転し、羽根の無い鉄骨の翼（右は大きく、左は折れて短い）。'
    + '顔は無く、頭部そのものが薔薇窓＝12枚の硝子の中心で単眼が白熱する。'
    + '胸は観音開きに割れ、藍の内陣の奥で聖核が脈打つ。腰からは切れた配線束が垂れ、銅線を晒して床を引きずる。',
  sprites: {
    spires: { rows: SPIRES, palette: PAL },
    halo: { rows: HALO, palette: PAL },
    rose: { rows: ROSE, palette: PAL },
    nave: { rows: NAVE, palette: PAL },
    relic: { rows: RELIC, palette: PAL },
    wingR: { rows: WING_R, palette: PAL },
    wingL: { rows: WING_L, palette: PAL },
    arm: { rows: ARM, palette: PAL },
    cables: { rows: CABLES, palette: PAL },
  },
  // 深度は render-boss-rig / boss.js の PART_DEPTH に従う：
  //   thruster 6 < wing/leg 7 < body 8 < dome/rack 9 < arm 11 < core 12
  // 座標は「本体中心からのドット単位」。mirror の翼は origin を中央にして ox で置く
  //（origin を端に寄せると mirror 時に左右が反転して胴の裏へ潜る＝初稿の失敗）
  rig: [
    { role: 'thruster', tex: 'spires', ox: 0, oy: -9 },                      // 上端 -32・下端 +14
    { role: 'wingR', tex: 'wingR', ox: 30, oy: -14 },                        // 肩 (+13,-7)
    { role: 'wingL', tex: 'wingL', ox: -25, oy: -13, mirror: true },         // 肩 (-13,-7)
    { role: 'legL', tex: 'cables', ox: 0, oy: 9, origin: [0.5, 0.05] },      // 下端 +22
    { role: 'body', tex: 'nave', ox: 0, oy: 2 },
    { role: 'dome', tex: 'halo', ox: 0, oy: -25 },                           // 上端 -30
    { role: 'rack', tex: 'rose', ox: 0, oy: -13 },
    { role: 'armL', tex: 'arm', ox: -15, oy: 1, mirror: true, origin: [0.5, 0.1] },
    { role: 'armR', tex: 'arm', ox: 15, oy: 1, origin: [0.5, 0.1] },
    { role: 'core', tex: 'relic', ox: 0, oy: 4 },
  ],
  // 上下 54ドット × 6.2 ＝ 335px（画面高 360）。案Cの 7.4 より小さいのは背丈が高い構図のため
  tier: { spriteScale: 6.2, glowScale: 11.0, glowOuter: '#c9971f', glowInner: '#1f47b8' },
};

// ---- 行長とパレットの自己検査 ----
for (const [name, sp] of Object.entries(CATHEDRAL.sprites)) {
  const w = sp.rows[0].length;
  sp.rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: 行${i} の長さが ${r.length}（期待 ${w}）`);
    for (const ch of r) if (ch !== '.' && !sp.palette[ch]) throw new Error(`${name}: 行${i} の文字 "${ch}" がパレットに無い`);
  });
}
for (const p of CATHEDRAL.rig) if (!CATHEDRAL.sprites[p.tex]) throw new Error(`rig tex "${p.tex}" が sprites に無い`);
