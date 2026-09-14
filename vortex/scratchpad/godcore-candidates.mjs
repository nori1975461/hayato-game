// 「軌道神核」（真マオウレクス第4形態・現行＝案C）を、堕天の大聖堂と同じ水準まで昇華させる再挑戦。
//
// 現行が持っていないもの（大聖堂で踏んだ作法のうち）：
//   ・①シルエットの格 … 光背が上半分だけで小さく、遠目には「土星に葉が付いた」形で止まる
//   ・②面の中の明度差 … 球は法線シェードだけで、装甲板の継ぎ目・鋲・窓枠が無い＝平滑な風船
//   ・⑥退廃 … 裂け目はあるが切り口が無く、傷んだ板も血も無い。神々しさはあるが悪魔性が薄い
// 現行が持っていて壊してはいけないもの（1回目の試作で壊して学んだ）：
//   ・環は薄い。厚くすると球が見えなくなり「紫の塊」になる（1回目 t 4.0 → 現行と同じ 3.0 前後へ）
//   ・眼は「縦の裂け目」ひとつ。絞り羽根を8枚入れたら縞玉になった
//   ・小さな点（目盛り・聖句）を環に散らすと紙吹雪になる＝面と溝で語る（点は板の中央の鋲だけ）
//
// 昇華の方針（作法を「天球儀（アーミラリー）」の語彙で言い直す）：
//   ①シルエットの格 … 第1案の棘の冠を半分以下に短くしたもの（FB「第1案の角を短くして」）。
//      第2案の天蓋（FB「大きいアイテムは不要」）と第3案の円光（FB「全然違う」）は廃止。棘の根元に深紅の灯を点す
//   ②大きな面＋黒い溝＋面の中の明度差 … 球は装甲板（大円の継ぎ目・板の輪・鋲）、環は30°ごとの板（黒い溝＋溝の隣の光）
//   ③素材ごとに4段 … 黒鉄・金・環3色（紫／青／緑＝現行の識別を保つ）・深紅
//   ④黒で締める … 環の内外縁・球の輪郭
//   ⑤生きている一点 … 眼（金の虹彩・縦裂の瞳の奥に炎・血走った白目）
//   ⑥退廃 … 環の裂け目に白い断面と銅線と火花・球の右下の板が焼け割れて赤熱・窓枠から血管が板へ這う・棘が1本折れている
//
// ⚠️ 実行時（boss.js updateTrueDisp）との契約は現行と同じ＝採用時はそのまま差し替えられる：
//   ・tex 名 ringAb/Af・ringBb/Bf・ringCb/Cf・corona・orb・eye（RING_OF が tex 名で環番号と前後を引く）
//   ・環の焼き込み角 A=+24° / B=-24° / C=0°（TRUE_RING_BAKED と一致しないと整列レーザーの向きがずれる）
//   ・前半分 f＝0..180°（画面手前＝下半分）／後半分 b＝180..360°
//   ・眼は 17×17（現行 15×15）・spriteScale 6.5（現行 7.4）＝見た目 111px（現行 111px）＝balance の trueForm.radius はそのままでよい
import { g, P, GET, LN, ARC, AT, DISC, RECT, OUTLINE, R, dither, SPHERE, validate } from './god-raster.mjs';

export const PAL = {
  k: '#04040c', j: '#141426', m: '#262640', f: '#454570', s: '#8a8ac2', n: '#cdcdf0',   // 黒鉄 4段＋稜線
  c: '#ffffff', C: '#cfe0ff',
  a: '#ff2f6a',                                                                          // 血管
  y: '#ffd23f', Y: '#c9971f', W: '#ffedb0',                                              // 金
  r: '#8a1622', R: '#e03040', O: '#ff8a2a',                                              // 深紅・炎
  q: '#2a1e52', Q: '#4a3b7d', P: '#7c66c9', N: '#c0aef5',                                // 環A 紫 4段（球の装甲も同族）
  e: '#1a2b4d', E: '#2f4f85', D: '#4d7ccc', M: '#a6c6f7',                                // 環B 青
  i: '#163f36', I: '#276b5c', H: '#3aa98a', L: '#96e9cd',                                // 環C 緑
  o: '#7a4a1a',                                                                          // 銅線
};

// =====================================================================
// 環＝厚みのある装甲の帯。外→内で k・深・暗・明・地・深・k、外側に金の縁。
//   30°ごとの板（黒い溝＋溝の隣の光の縁）／板の中央に鋲／祠（菱形）／裂け目の切り口（白い断面・銅線・火花）
// =====================================================================
function ringSprite(W, H, rx, ry, rot, gaps, seam, t, deep, dark, mid, lit, nodes, a0, a1, back) {
  const G = g(W, H), cx = (W - 1) / 2, cy = (H - 1) / 2, rs = Math.max(0.6, ry / rx);
  const nearGap = (ang, pad) => gaps.some(([s0, e0]) => ang >= s0 - pad && ang <= e0 + pad);
  for (let d = -t; d <= t + 1e-9; d += 0.25) {
    const u = (d + t) / (2 * t);
    const ch = back
      ? (u < 0.1 ? 'k' : u < 0.35 ? deep : u < 0.65 ? dark : u < 0.9 ? deep : 'k')
      : (u < 0.08 ? 'k' : u < 0.25 ? deep : u < 0.42 ? dark : u < 0.62 ? lit : u < 0.8 ? mid : u < 0.92 ? deep : 'k');
    ARC(G, cx, cy, rx + d, ry + d * rs, a0, a1, ch, gaps, rot);
  }
  if (back) return R(G);
  for (let d = t + 0.3; d <= t + 0.8; d += 0.25) ARC(G, cx, cy, rx + d, ry + d * rs, a0, a1, 'Y', gaps, rot);   // 金の縁
  for (let ang = Math.ceil(a0 / seam) * seam; ang < a1; ang += seam) {                                        // 板の溝と溝の隣の光
    if (nearGap(ang, 6)) continue;
    for (let d = -t * 0.85; d <= t * 0.85; d += 0.25) AT(G, cx, cy, rx + d, ry + d * rs, ang, 'k', rot);
    for (let d = -t * 0.45; d <= t * 0.45; d += 0.25) AT(G, cx, cy, rx + d, ry + d * rs, ang + 2.4, 'n', rot);
  }
  for (let ang = Math.ceil(a0 / seam) * seam + seam / 2; ang < a1; ang += seam) {                              // 板の中央の鋲
    if (nearGap(ang, 8)) continue;
    AT(G, cx, cy, rx + t * 0.35, ry + t * 0.35 * rs, ang, 'Y', rot);
  }
  for (const [s0, e0] of gaps) {                                                                              // 裂け目の切り口
    for (const [ang, dir] of [[s0 - 1, -1], [e0 + 1, 1]]) {
      if (ang < a0 || ang > a1) continue;
      for (let d = -t * 0.9; d <= t * 0.9; d += 0.25) AT(G, cx, cy, rx + d, ry + d * rs, ang, 'n', rot);
      AT(G, cx, cy, rx + t * 0.3, ry + t * 0.3 * rs, ang - dir * 4, 'o', rot); AT(G, cx, cy, rx - t * 0.4, ry - t * 0.4 * rs, ang - dir * 5, 'O', rot);
      AT(G, cx, cy, rx + t + 1.6, ry + (t + 1.6) * rs, ang - dir * 2, 'c', rot);
    }
  }
  const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180);                              // 祠（菱形）
  for (const na of nodes) {
    if (na < a0 || na > a1) continue;
    const t2 = na * Math.PI / 180, ex = Math.cos(t2) * rx, ey = Math.sin(t2) * ry;
    const X = cx + ex * cr - ey * sr, Y = cy + ex * sr + ey * cr;
    for (const [dx, dy, ch] of [[3, 0, 'k'], [-3, 0, 'k'], [0, 3, 'k'], [0, -3, 'k'], [2, 1, 'k'], [2, -1, 'k'], [-2, 1, 'k'], [-2, -1, 'k'], [1, 2, 'k'], [-1, 2, 'k'], [1, -2, 'k'], [-1, -2, 'k'],
      [2, 0, 'Y'], [-2, 0, 'Y'], [0, 2, 'Y'], [0, -2, 'Y'], [1, 1, lit], [-1, 1, lit], [1, -1, lit], [-1, -1, lit], [1, 0, 'W'], [-1, 0, 'W'], [0, 1, 'W'], [0, -1, 'W'], [0, 0, 'a']]) P(G, X + dx, Y + dy, ch);
  }
  return R(G);
}
// 同じ半径で傾きだけ違う3つの軌道（同心だと1つの塊になる＝現行の設計どおり）。焼き込み角は現行と同じ
const RA = [71, 45, 28, 10.5, 24, [[64, 96]], 30, 3.0, 'q', 'Q', 'P', 'N', [140]];
const RB = [71, 45, 28, 10.5, -24, [[238, 270]], 30, 3.0, 'e', 'E', 'D', 'M', [40]];
const RC = [65, 29, 25, 8.5, 0, [[142, 174]], 30, 2.4, 'i', 'I', 'H', 'L', [62]];
const RING_AB = ringSprite(...RA, 180, 360, true), RING_AF = ringSprite(...RA, 0, 180, false);
const RING_BB = ringSprite(...RB, 180, 360, true), RING_BF = ringSprite(...RB, 0, 180, false);
const RING_CB = ringSprite(...RC, 180, 360, true), RING_CF = ringSprite(...RC, 0, 180, false);

// =====================================================================
// 光背（thruster）64×40。球の中心は (31.5, 32)＝origin [0.5, 0.8]（現行と同じ契約）。
//   第4案＝第1案の棘の冠を、FB「第1案の角を短くして」のとおり半分以下に（頂 13→6・長 9→4.5・短 5.5→3）。
//   金の先端（W）は頂の3本だけに残す。上側の1本は折れている（退廃）。
//   私の追加（一滴）：襟の金の縁に、棘の根元ごとに深紅の灯を点す。頂の真上の1灯だけ明るい＝冠を灯明で荘厳する
// =====================================================================
const CORONA = (() => {
  const W = 64, H = 40, G = g(W, H), cx = 31.5, cy = 32;
  for (let rr = 19.5; rr <= 22; rr += 0.25) ARC(G, cx, cy, rr, rr, 150, 390, rr > 21.5 ? 'Y' : rr < 20 ? 'j' : rr < 21 ? 'm' : 'f');   // 襟
  const N = 13;
  for (let i = 0; i < N; i++) {
    const adeg = 160 + i * (220 / (N - 1));
    const crown = i >= 5 && i <= 7, long = i % 2 === 0;
    const len = crown ? 6 : long ? 4.5 : 3, hw = crown ? 2.0 : long ? 1.6 : 1.2;
    const t = adeg * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t), nx = -uy, ny = ux, r0 = 21.5;
    const broken = i === 4;
    for (let u = 0; u <= (broken ? 0.5 : 1); u += 0.012) {
      const rr = r0 + len * u, w2 = hw * (1 - u * 0.8);
      for (let k2 = -w2; k2 <= w2; k2 += 0.25) {
        const ch = (crown && u > 0.8) ? 'W' : k2 < -w2 * 0.35 ? 'Y' : k2 > w2 * 0.45 ? 'j' : 'f';
        P(G, cx + ux * rr + nx * k2, cy + uy * rr + ny * k2, ch);
      }
    }
    if (broken) { const rr = r0 + len * 0.5; P(G, cx + ux * rr + nx * 0.8, cy + uy * rr + ny * 0.8, 'n'); P(G, cx + ux * (rr + 1.2), cy + uy * (rr + 1.2), 'o'); }
    else if (i % 2 === 1) AT(G, cx, cy, 20.6, 20.6, adeg + 220 / (N - 1) / 2 - 220 / (N - 1), 'r');            // 棘と棘の間の灯（深紅）
  }
  AT(G, cx, cy, 20.6, 20.6, 270 + 220 / (N - 1) / 2, 'a'); AT(G, cx, cy, 20.6, 20.6, 270 - 220 / (N - 1) / 2, 'a');   // 頂の両脇だけ明るい灯
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// 神核の球（body）37×37。法線シェード5段＋市松→装甲板（縦横の大円の継ぎ目・板の輪・鋲）→
//   金の窓枠（4本のボルト）→血管→右下の板が焼け割れて赤熱
// =====================================================================
const ORB = (() => {
  const W = 37, H = 37, G = g(W, H), c = 18, r = 17.6;
  SPHERE(G, c, c, r, ['q', 'Q', 'P', 'N', 'n'], [-0.5, -0.62, 0.6], 0.12);
  const inside = (x, y) => { const d = Math.hypot(x - c, y - c); return d <= r && d > 10.2; };
  const seam = (x, y) => { if (inside(x, y)) P(G, x, y, 'k'); };
  const edge = (x, y) => { if (inside(x, y) && GET(G, x, y) !== 'k') P(G, x, y, 'n'); };
  for (let y = 0; y < H; y++) { seam(c, y); edge(c + 1, y); }                         // 縦の大円（溝の右が光）
  for (let x = 0; x < W; x++) { seam(x, c); edge(x, c - 1); }                         // 横の大円（溝の上が光）
  for (let d = 12.6; d <= 13.4; d += 0.3) ARC(G, c, c, d, d, 0, 360, 'k');            // 板の輪の継ぎ目
  ARC(G, c, c, 12.1, 12.1, 190, 300, 'n');
  for (const a of [45, 135, 225, 315]) { AT(G, c, c, 15.3, 15.3, a, 'Y'); AT(G, c, c, 11.3, 11.3, a, 'y'); }   // 鋲
  DISC(G, c, c, 10.2, 'k');                                                            // 窓：黒い縁→金の枠（左上が明）→4本のボルト→暗い座
  for (let d = 8.9; d <= 9.7; d += 0.25) ARC(G, c, c, d, d, 0, 360, 'Y');
  ARC(G, c, c, 9.3, 9.3, 190, 290, 'W');
  for (const a of [45, 135, 225, 315]) AT(G, c, c, 9.3, 9.3, a, 'k');
  DISC(G, c, c, 8.5, 'j');
  for (const [a, len, bend] of [[20, 7, 1], [150, 6, 1], [250, 7, 1], [320, 5, -1]]) {   // 血管：窓枠から板へ這う
    const t = a * Math.PI / 180;
    let x = c + Math.cos(t) * 10.4, y = c + Math.sin(t) * 10.4;
    for (let k = 0; k < len; k++) {
      const wob = Math.sin(k * 1.7) * 0.8 * bend;
      x += Math.cos(t) * 1 - Math.sin(t) * wob * 0.5; y += Math.sin(t) * 1 + Math.cos(t) * wob * 0.5;
      if (inside(x, y) && GET(G, x, y) !== 'k') P(G, x, y, k < len - 2 ? 'a' : 'r');
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {                           // 焼け割れた板（右下）
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    if (d < 11 || d > 17.2 || ang < 25 || ang > 65) continue;
    if (GET(G, x, y) === 'k') continue;
    P(G, x, y, dither(x, y) ? 'j' : 'm');
  }
  LN(G, c + 8, c + 7, c + 12, c + 11, 'k'); LN(G, c + 12, c + 11, c + 11, c + 15, 'k'); LN(G, c + 10, c + 10, c + 14, c + 9, 'k');
  P(G, c + 10, c + 9, 'R'); P(G, c + 12, c + 11, 'O'); P(G, c + 11, c + 13, 'R'); P(G, c + 13, c + 9, 'r'); P(G, c + 11, c + 12, 'R');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// 眼（core）17×17。血走った白目・金の虹彩（艶は左上）・縦裂の瞳（黒い裂け目の奥に炎）・上瞼は鋼
// =====================================================================
const EYE = (() => {
  const W = 17, H = 17, G = g(W, H), c = 8;
  DISC(G, c, c, 8.3, 'k'); DISC(G, c, c, 7.6, 'c');
  for (const [a, len] of [[15, 3], [70, 2], [160, 3], [215, 2], [300, 3]]) {
    const t = a * Math.PI / 180;
    for (let k = 0; k < len; k++) P(G, c + Math.cos(t) * (7.2 - k), c + Math.sin(t) * (7.2 - k) + (k % 2 ? 0.6 : -0.4), 'a');
  }
  DISC(G, c, c, 5.4, 'Y'); DISC(G, c, c, 4.6, 'y'); ARC(G, c, c, 4.9, 4.9, 190, 290, 'W');
  for (const a of [45, 135, 225, 315]) { const t = a * Math.PI / 180; LN(G, c + Math.cos(t) * 3.4, c + Math.sin(t) * 3.4, c + Math.cos(t) * 4.6, c + Math.sin(t) * 4.6, 'Y'); }
  RECT(G, c - 1, c - 4, c + 1, c + 4, 'k'); RECT(G, c, c - 3, c, c + 3, 'r'); P(G, c, c - 1, 'R'); P(G, c, c, 'O'); P(G, c, c + 1, 'R');
  P(G, c - 3, c - 3, 'C'); P(G, c - 4, c - 2, 'c');
  for (let x = 4; x <= 12; x++) P(G, x, 1, 'm'); for (let x = 5; x <= 11; x++) P(G, x, 2, 'f');   // 上瞼（鋼）
  P(G, 3, 2, 'm'); P(G, 13, 2, 'm');
  return R(G);
})();

export const GODCORE = {
  id: 'godcore',
  name: '軌道神核',
  concept: '黒鉄と金の天球儀に囚われた神の眼。球は装甲板で、金の窓枠の奥に血走った単眼。'
    + '傾きの違う3つの環（紫・青・緑）は30°ごとの板に割れ、板の中央に鋲、祠がひとつ。球の上に短い棘の冠（頂の3本だけ金の先端・1本折れ）、棘の根元に深紅の灯。'
    + '環の裂け目は白い断面から銅線を垂らし、球の右下の板は焼け割れて赤熱し、窓枠から血管が装甲へ這う。',
  sprites: {
    ringAb: { rows: RING_AB, palette: PAL }, ringAf: { rows: RING_AF, palette: PAL },
    ringBb: { rows: RING_BB, palette: PAL }, ringBf: { rows: RING_BF, palette: PAL },
    ringCb: { rows: RING_CB, palette: PAL }, ringCf: { rows: RING_CF, palette: PAL },
    corona: { rows: CORONA, palette: PAL },
    orb: { rows: ORB, palette: PAL },
    eye: { rows: EYE, palette: PAL },
  },
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
  tier: { spriteScale: 6.5, glowScale: 10.6, glowOuter: '#c98cff', glowInner: '#ffedb0' },
};
validate(GODCORE);
