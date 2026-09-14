// 「マオウレクス」第一形態（本編の最終ボス・大型2足歩行の王）を、堕天の大聖堂と同じ水準まで昇華させる。
//
// 現行（R20 texf・深紅×黒鋼）が持っていないもの：
//   ・胴 18×18 を 9.6 倍＝1ドットが 10px。面が大きすぎて彫り（溝・鋲・段）が無く、遠目に「赤い箱」で止まる
//   ・15色・素材が深紅と黒鋼の2つしか無く、4段の階調も無い
//   ・①シルエットの格 … 頭が胸と同じ幅で「箱＋脚」。王の輪郭（狭い兜・高い肩・翻る外套）が無い
// 1回目の試作で学んだこと：頭を胸と同じ幅にすると、どれだけ彫っても箱に戻る。輪郭は幅の差で作る
// 2回目の FB「顔と王冠がいただけない・ロボットに偏りすぎ。マキナは金属生命体で、四神柱は荘厳さの中に退廃を混ぜる」
//   → 兜＋バイザー＋冠（＝ロボットの記号）を捨て、頭を「金の仮面と円光」にした：
//   半眼（伏し目）の金の仮面（額に深紅の白毫・口は一文字・右頬に亀裂・左顎が欠けて中の黒い機構と銅が覗く）、
//   背後に黒鉄と金の円光（12本の光条・右上が欠けている）。冠の金は仮面と円光の金へ移した
//
// 昇華の方針（作法を「鉄の王」の語彙で言い直す。識別＝人型・深紅×黒鋼・金の顔・シアンの眼・深紅の炉心・右肩の砲）：
//   ①シルエットの格 … 円光を背負う仮面の頭（幅13）→ 耳まで上がる二層の肩当て（幅30）→ 腰で締まる → 背後で裾が広がる外套（幅48）→ 最厚のブーツ
//   ②大きな面＋黒い溝＋面の中の明度差 … 胸板は3枚（縦の溝と溝の隣の光）、腹は蛇腹、肘・膝は段、拳は角で4本の指
//   ③素材ごとに4段 … 深紅 4段・黒鋼 4段・金 3段・シアン 2段・銅
//   ④黒で締める … OUTLINE
//   ⑤生きている一点 … 仮面の半眼から漏れるシアンの光と、眼から頬へ零れる光の筋（泣く仮面）・U字ケージの炉心（深紅の心臓に白熱の芯）
//   ⑥退廃 … 円光の欠け・仮面の亀裂と欠け・外套の裾の裂け・腰から垂れる銅のケーブル・砲口の焦げ
//
// ⚠️ 採用時の契約：role と tex 名は現行と同じ（body/legL/legR/podL/podR/armL/armR/cannon/core）＋外套（thruster・円光を含む）が1つ増える。
//   core（弱点）は仮面の眼の帯 12×3（現行 14×6）＝radius の見直しが要る。
//   紫パレット（第3形態）はキー集合を完全一致させる必要がある（test-core が縛る）＝PAL_P を同じキーで用意した
import { g, P, LN, ARC, DISC, RECT, OUTLINE, R, dither, validate } from './god-raster.mjs';

export const PAL = {
  k: '#0b0808',
  j: '#160e10', f: '#241418', g: '#3a2024', h: '#55323a',   // 黒鋼 4段（暗→明）
  d: '#6e101a', m: '#a1182a', r: '#e5202c', R: '#ff6a5c',   // 深紅 4段
  s: '#d8b08a', S: '#fff1dc',                               // 温かい銀の縁（上縁1行の光）
  y: '#8a5a0a', Y: '#c8860f', W: '#ffe08a',                 // 金 3段
  c: '#38e1ff', C: '#c8f6ff',                               // シアン（単眼・導管）
  p: '#2a1418',                                             // バイザーの窪み
  o: '#8a4a1a', O: '#ff8a2a',                               // 銅のケーブル・砲口の熱
  w: '#ffffff',
};
// 第3形態（メタリックパープル）用。キー集合は PAL と完全一致（赤族→紫族・黒鋼→紫がかった暗部・銀縁→ラベンダー白）
export const PAL_P = {
  k: '#0b0810',
  j: '#130c1c', f: '#1e1229', g: '#382153', h: '#4e3370',
  d: '#5c2a94', m: '#8b3fd6', r: '#c470ff', R: '#e0a0ff',
  s: '#e6d4f8', S: '#fbf6ff',
  y: '#8a5a0a', Y: '#c8860f', W: '#ffe08a',
  c: '#38e1ff', C: '#c8f6ff',
  p: '#281838',
  o: '#8a4a1a', O: '#ff8a2a',
  w: '#ffffff',
};

// =====================================================================
// ① 外套＋円光（thruster）48×56。上 20 行＝頭の背後の円光（黒鉄の盤に12本の金の光条・金の縁・右上が欠けている）。
//   下 36 行＝肩から垂れて裾が広がる黒鉄の板鎧（襟・鱗板の段・金の裾・深紅の裏地・裂けた裾・肩の留め具）
// =====================================================================
const MANTLE = (() => {
  const W = 48, H = 56, G = g(W, H), HX = 23.5, HY = 11.5, HR = 11;
  DISC(G, HX, HY, HR + 0.4, 'k'); DISC(G, HX, HY, HR - 0.4, 'Y');
  for (let d = HR - 1.2; d <= HR - 0.6; d += 0.3) ARC(G, HX, HY, d, d, 200, 340, 'W');
  DISC(G, HX, HY, HR - 2.0, 'j');
  for (let a = 0; a < 360; a += 30) {                                                           // 光条は暗い金＝盤は暗く保ち、金の仮面を浮かせる
    const t = a * Math.PI / 180;
    for (let rr = 2.5; rr <= HR - 2.2; rr += 0.3) P(G, HX + Math.cos(t) * rr, HY + Math.sin(t) * rr, 'y');
  }
  DISC(G, HX, HY, 2.0, 'y');
  for (let y = 0; y < 24; y++) for (let x = 0; x < W; x++) {                                    // 欠け（右上 300°〜335°・r 5.5 以遠）
    const dx = x - HX, dy = y - HY, d = Math.hypot(dx, dy), ang = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
    if (d > 5.5 && ang >= 300 && ang <= 335) P(G, x, y, '.');
  }
  for (const a of [300, 335]) { const t = a * Math.PI / 180; for (let rr = 5.5; rr <= HR + 0.4; rr += 0.3) P(G, HX + Math.cos(t) * rr, HY + Math.sin(t) * rr, 'S'); }
  const T = 20;                                                                                  // 外套はここから
  for (let y = 0; y < 36; y++) {
    const hw = 13 + (y / 35) * 10;
    for (let x = Math.ceil(23.5 - hw); x <= Math.floor(23.5 + hw); x++) {
      let ch;
      if (y === 0) ch = 'h'; else if (y === 1) ch = 'k';
      else if (y <= 29) {
        const row = Math.floor((y - 2) / 7), ly = (y - 2) % 7, lx = (x + (row % 2) * 4) % 8;
        if (ly === 0) ch = 'k'; else if (ly === 1) ch = 'h'; else if (lx === 0) ch = 'k'; else ch = lx < 3 ? 'g' : 'f';
        if (ly >= 4 && lx >= 5) ch = 'j';
      } else if (y === 30) ch = 'Y'; else if (y === 31) ch = 'y';
      else ch = y === 33 ? 'm' : y === 35 ? 'j' : 'd';   // 裏地（深紅）
      P(G, x, T + y, ch);
    }
  }
  for (const [x0, w] of [[3, 4], [15, 5], [28, 5], [41, 4]]) for (let dy = 0; dy < 4; dy++) for (let x = x0 + dy; x < x0 + w - dy; x++) P(G, x, T + 35 - dy, '.');
  DISC(G, 10, T + 3, 2.3, 'k'); DISC(G, 10, T + 3, 1.6, 'Y'); P(G, 9, T + 2, 'W'); DISC(G, 37, T + 3, 2.3, 'k'); DISC(G, 37, T + 3, 1.6, 'Y'); P(G, 36, T + 2, 'W');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ② 胴（body）30×36。金の仮面（半眼・白毫・一文字の口・亀裂・欠け）→ 首 → 肩の桁（幅30）→
//   胸板3枚＋U字ケージの炉心 → 腹の蛇腹 → 金の帯 → 腰のケーブル
// =====================================================================
const BODY = (() => {
  const W = 30, H = 36, G = g(W, H);
  for (let y = 17; y <= 29; y++) for (let x = 0; x <= 29; x++) {                                           // 肩の桁と胸板
    if (y >= 21 && (x < 2 || x > 27)) continue;
    const u = (x + (y - 17) * 0.4) / 40;
    let ch = u < 0.3 ? 'r' : u < 0.55 ? 'm' : 'd';
    if (y === 17) ch = 'S';
    if (y === 20) ch = 'k';
    if (y >= 21 && (x === 9 || x === 20)) ch = 'k';
    if (y >= 21 && (x === 2 || x === 21)) ch = 'R';
    if (y >= 18 && y <= 19 && (x === 5 || x === 24)) ch = 'k';
    P(G, x, y, ch);
  }
  RECT(G, 10, 20, 19, 29, 'k');                                                                            // U字のケージ
  for (let y = 21; y <= 28; y++) { P(G, 10, y, 'Y'); P(G, 19, y, 'y'); } for (let x = 10; x <= 19; x++) P(G, x, 29, 'Y');
  P(G, 10, 21, 'W'); P(G, 14, 29, 'W'); P(G, 15, 29, 'W');
  for (let y = 22; y <= 27; y += 2) { P(G, 12, y, 'g'); P(G, 17, y, 'g'); }
  DISC(G, 14.5, 24.5, 3.4, 'd'); DISC(G, 14.5, 24.5, 2.6, 'r'); DISC(G, 14, 24, 1.6, 'R'); P(G, 14, 24, 'w'); P(G, 13, 23, 'w');   // 炉心
  for (let y = 30; y <= 32; y++) for (let x = 6; x <= 23; x++) P(G, x, y, y === 31 ? 'g' : 'j');           // 腹の蛇腹
  P(G, 14, 30, 'k'); P(G, 15, 30, 'k'); P(G, 14, 32, 'k'); P(G, 15, 32, 'k');
  for (let x = 5; x <= 24; x++) { P(G, x, 33, 'Y'); P(G, x, 34, 'y'); } P(G, 14, 33, 'W'); P(G, 15, 33, 'W');   // 金の帯
  for (let x = 6; x <= 23; x++) P(G, x, 35, 'k');
  P(G, 4, 31, 'o'); P(G, 3, 32, 'O'); P(G, 25, 31, 'o'); P(G, 26, 32, 'O');                                 // 腰のケーブル
  // 金の仮面：楕円（中心 14.5,9.5・半径 6.2×7.2）。光は左上。半眼の帯（core）は行 8〜10 に嵌る
  const HX = 14.5, HY = 9.5, RX = 6.2, RY = 7.2;
  for (let y = 2; y <= 17; y++) for (let x = 8; x <= 21; x++) {
    const dx = (x - HX) / RX, dy = (y - HY) / RY; if (dx * dx + dy * dy > 1) continue;
    const u = (dx + dy * 0.8 + 1.8) / 3.6;
    let ch = u < 0.3 ? 'W' : u < 0.66 ? 'Y' : 'y';
    if (u >= 0.27 && u < 0.33 && dither(x, y)) ch = 'Y'; if (u >= 0.63 && u < 0.69 && dither(x, y)) ch = 'Y';
    P(G, x, y, ch);
  }
  P(G, 14, 5, 'R'); P(G, 15, 5, 'r'); P(G, 14, 6, 'r'); P(G, 15, 6, 'd');                                   // 白毫（額の深紅の宝石）
  for (const [x, y] of [[13, 5], [16, 5], [13, 6], [16, 6], [14, 4], [15, 4], [14, 7], [15, 7]]) P(G, x, y, 'k');
  for (let x = 10; x <= 13; x++) P(G, x, 7, 'y'); for (let x = 16; x <= 19; x++) P(G, x, 7, 'y');            // 眉の影
  P(G, 14, 11, 'y'); P(G, 14, 12, 'y');                                                                     // 鼻筋の影
  for (let x = 12; x <= 17; x++) { P(G, x, 13, 'k'); P(G, x, 14, 'y'); }                                     // 一文字の口（2段の影で等倍でも読める）
  P(G, 12, 15, 'W'); P(G, 13, 15, 'W');                                                                     // 下唇の光
  LN(G, 19, 4, 18, 7, 'k'); LN(G, 17, 11, 19, 15, 'k');                                                     // 右頬の亀裂
  for (const x of [11, 18]) { P(G, x, 11, 'C'); P(G, x, 12, 'c'); P(G, x, 13, 'c'); }                        // 眼から零れる光＝泣く仮面（金属生命体の証）
  for (const [x, y] of [[9, 13], [10, 13], [9, 14], [10, 14], [11, 14], [10, 15]]) P(G, x, y, 'g');           // 左顎の欠け＝中の黒い機構
  P(G, 10, 14, 'o'); P(G, 11, 13, 'k'); P(G, 12, 14, 'k'); P(G, 11, 15, 'k');
  for (let x = 12; x <= 17; x++) P(G, x, 17, 'j');                                                          // 首（桁の光を切る）
  OUTLINE(G);
  return R(G);
})();

// ③ 半眼（core）12×3。伏し目の二つの眼：黒い上瞼の下からシアンの光が漏れ、下瞼は金
const EYES = (() => {
  const G = g(12, 3);
  for (const x0 of [0, 7]) {
    for (let x = x0; x <= x0 + 4; x++) P(G, x, 0, 'k');
    P(G, x0, 1, 'k'); P(G, x0 + 4, 1, 'k'); for (let x = x0 + 1; x <= x0 + 3; x++) P(G, x, 1, 'c'); P(G, x0 + 2, 1, 'C');
    for (let x = x0 + 1; x <= x0 + 3; x++) P(G, x, 2, 'y');
  }
  return R(G);
})();

// ④ 肩当て（podR）16×11／セルポッド（podL）16×14＝セル3本の上に同じ肩当て
function shoulder(G, oy) {
  for (let y = 0; y <= 6; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot((x - 7.5) / 8.2, (y - 7) / 7.4);
    if (d > 1) continue;
    const u = (x + y * 0.8) / 22;
    let ch = u < 0.3 ? 'r' : u < 0.6 ? 'm' : 'd';
    if (y === 0 || (y === 1 && (x < 3 || x > 12))) ch = 'S';
    P(G, x, y + oy, ch);
  }
  RECT(G, 0, 6 + oy, 15, 6 + oy, 'k');
  for (let y = 7; y <= 10; y++) for (let x = 1; x <= 14; x++) P(G, x, y + oy, y === 7 ? 'h' : y === 10 ? 'k' : (x < 7 ? 'g' : 'f'));
  P(G, 3, 3 + oy, 'Y'); P(G, 12, 3 + oy, 'Y'); P(G, 7, 2 + oy, 'W');
  P(G, 15, 1 + oy, 'Y'); P(G, 15, 0 + oy, 'W'); P(G, 14, 2 + oy, 'Y');
}
const PAULDRON = (() => { const G = g(16, 11); shoulder(G, 0); OUTLINE(G); return R(G); })();
const CELLPOD = (() => {
  const G = g(16, 14);
  for (const x0 of [2, 7, 12]) { RECT(G, x0, 0, x0 + 2, 3, 'g'); P(G, x0, 0, 'h'); P(G, x0 + 1, 1, 'k'); P(G, x0 + 1, 2, 'c'); }
  shoulder(G, 3); OUTLINE(G); return R(G);
})();

// ⑤ 腕（arm）12×22。上腕（深紅の板）→ 肘の蛇腹 → 細い前腕（黒鋼・シアンの導管）→ 幅いっぱいの角拳（4本の指）
const ARM = (() => {
  const W = 12, H = 22, G = g(W, H);
  for (let y = 0; y <= 7; y++) for (let x = 3; x <= 8; x++) P(G, x, y, y === 0 ? 'S' : x < 5 ? 'r' : x < 7 ? 'm' : 'd');
  P(G, 5, 4, 'k'); P(G, 6, 4, 'k');
  for (let y = 8; y <= 10; y++) for (let x = 3; x <= 8; x++) P(G, x, y, y === 9 ? 'g' : 'j');
  P(G, 8, 9, 'Y');
  for (let y = 11; y <= 15; y++) for (let x = 3; x <= 8; x++) P(G, x, y, y === 11 ? 'h' : x < 5 ? 'h' : x < 7 ? 'g' : 'f');
  P(G, 8, 12, 'c'); P(G, 8, 14, 'c');
  for (let y = 16; y <= 21; y++) for (let x = 0; x <= 11; x++) P(G, x, y, y === 16 ? 'S' : y === 21 ? 'k' : (x < 3 ? 'h' : x < 8 ? 'g' : 'f'));
  for (const x of [3, 6, 9]) { P(G, x, 17, 'k'); P(G, x, 18, 'k'); P(G, x, 19, 'k'); P(G, x, 20, 'k'); }
  for (const x of [1, 4, 7, 10]) P(G, x, 17, 'c');
  OUTLINE(G);
  return R(G);
})();

// ⑥ 砲（cannon）18×7。右肩のレーザー砲。砲口は黒く焦げ、金の帯、蓄電の窓
const CANNON = (() => {
  const W = 18, H = 7, G = g(W, H);
  for (let y = 1; y <= 5; y++) for (let x = 0; x <= 17; x++) P(G, x, y, y === 1 ? 'S' : y === 5 ? 'k' : (y === 2 ? 'r' : y === 3 ? 'm' : 'd'));
  RECT(G, 14, 1, 17, 5, 'g'); RECT(G, 15, 2, 17, 4, 'k'); P(G, 16, 3, 'O'); P(G, 14, 1, 'h');
  RECT(G, 11, 1, 12, 5, 'Y'); P(G, 11, 1, 'W');
  P(G, 3, 3, 'c'); P(G, 5, 3, 'c'); P(G, 7, 3, 'C'); P(G, 9, 3, 'c');
  P(G, 1, 0, 'g'); P(G, 2, 0, 'g'); P(G, 1, 6, 'g'); P(G, 2, 6, 'g');
  OUTLINE(G);
  return R(G);
})();

// ⑦ 脚（leg）14×20。腿（深紅の板）→ 膝当て（黒鋼＋金のキャップ）→ 脛 → 最厚のブーツ
const LEG = (() => {
  const W = 14, H = 20, G = g(W, H);
  for (let y = 0; y <= 7; y++) for (let x = 2; x <= 11; x++) P(G, x, y, y === 0 ? 'S' : x < 5 ? 'r' : x < 9 ? 'm' : 'd');
  P(G, 6, 4, 'k'); P(G, 7, 4, 'k');
  for (let y = 8; y <= 11; y++) for (let x = 1; x <= 12; x++) P(G, x, y, y === 8 ? 'h' : y === 11 ? 'k' : x < 6 ? 'g' : 'f');
  RECT(G, 5, 9, 8, 10, 'Y'); P(G, 5, 9, 'W');
  for (let y = 12; y <= 15; y++) for (let x = 2; x <= 11; x++) P(G, x, y, x < 5 ? 'r' : x < 9 ? 'm' : 'd');
  P(G, 3, 13, 'c');
  for (let y = 16; y <= 19; y++) for (let x = 0; x <= 13; x++) P(G, x, y, y === 16 ? 'h' : y === 19 ? 'k' : x < 5 ? 'g' : 'f');
  P(G, 0, 17, 's'); P(G, 1, 17, 's');
  OUTLINE(G);
  return R(G);
})();

export const MAOU1 = {
  id: 'maou1',
  name: 'マオウレクス',
  concept: '欠けた円光を背負い、黒鉄の板鎧の外套を翻す鉄の王。半眼の金の仮面は額に深紅の白毫、伏せた瞼の下からシアンの光が漏れ、'
    + '右頬に亀裂、左顎は欠けて中の黒い機構が覗く。耳まで上がる二層の肩当て、右肩のレーザー砲、幅いっぱいの角拳。'
    + '胸板は3枚に割れ、U字の金のケージの奥で深紅の炉心が白熱する。外套の裾は金の縁と深紅の裏地が裂け、腰から銅のケーブルが垂れる。',
  sprites: {
    mantle: { rows: MANTLE, palette: PAL },
    body: { rows: BODY, palette: PAL },
    core: { rows: EYES, palette: PAL },
    pauldron: { rows: PAULDRON, palette: PAL },
    cellpod: { rows: CELLPOD, palette: PAL },
    arm: { rows: ARM, palette: PAL },
    cannon: { rows: CANNON, palette: PAL },
    leg: { rows: LEG, palette: PAL },
  },
  rig: [
    { role: 'thruster', tex: 'mantle', ox: 0, oy: 7 },
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'legL', tex: 'leg', ox: -7, oy: 17, mirror: true },
    { role: 'legR', tex: 'leg', ox: 7, oy: 17 },
    { role: 'podL', tex: 'cellpod', ox: -16, oy: -4, mirror: true },
    { role: 'podR', tex: 'pauldron', ox: 16, oy: -3 },
    { role: 'armL', tex: 'arm', ox: -17, oy: 1, mirror: true, origin: [0.5, 0.1] },
    { role: 'armR', tex: 'arm', ox: 17, oy: 1, origin: [0.5, 0.1] },
    { role: 'cannon', tex: 'cannon', ox: 16, oy: -10, origin: [0.12, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: -8.5 },
  ],
  tier: { spriteScale: 6.4, glowScale: 11.4, glowOuter: '#b01c22', glowInner: '#4ad4ff' },
};
validate(MAOU1);
