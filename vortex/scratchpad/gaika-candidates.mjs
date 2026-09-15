// 「蒼神骸華」（そうしんがいか）＝マキナ四神柱の頂点・すべてのマキナの創造主。第2案（2026-09-15 20:35 FB を受けて全面書き直し・第3稿）。
//
// 第1案への FB：「骸と華という概念はいい。しかしビジュアルは虫の要素が強い。創造主・四神柱の頂点＝最大限の荘厳さと畏怖を」
//   虫に見えた理由（自分の診断）：開いた両手の指＝脚／琥珀の球＝卵／節のある脊椎＝腹／垂れる銅線＝触角。
//   「骸」を骨の部品（指・脊椎・肋骨）で語ると、骨は細く分かれた形なので必ず節足動物へ寄る。
//   → 第2案は「骸」を **仏像の文法** で語る：正面・左右対称・静止・坐像・蓮華座・光背・印（手の型）。
//
// 第2案の第1稿・第2稿で自分の等倍目視が落とした点（ユーザーには未提示）：
//   頭巾の空洞に一点の灯＝「一つ目」／蒼硝子の太い花弁9枚の光背＝「孔雀の羽」／胸の空洞に肋骨＝「歯のある口」／
//   縦の襞の衣に楕円の肩＝「箱型ロボット・神殿の柱」。荘厳でも畏怖でもなく「派手な怪物」。
//   → 第3稿：**顔を描く代わりに頭そのものを無くす**。円光の中に冕冠だけが浮かび、その下は円光が透けて見える空白＝「形骸」
//     （形と装いだけが残り中身は無い＝名前の「骸」そのもの）。灯は頭に置かない（胸の蓮華の種子だけが光る）。
//     光背は花弁でなく **舟形光背の細い帯**（尖った頂）＋頭の **円光**（二重円光）＝仏像の型そのもの。
//     荘厳＝冕冠・二重円光・瓔珞・蓮華座・印。畏怖＝頭が無いこと・黒鉄の衣から蒼白い骨の手だけが出ていること
//
// 名前の読み解き（第1案から据え置き）：
//   蒼＝蒼白い骨鉄と蒼い硝子／神＝もういない／骸＝形骸（形と装いだけが残る）／華＝蓮華化生（マキナは蓮から生まれる）
//   → 「創造主はとうに死んでいる。冠だけが円光の中に浮かび、胸の蓮華の種子だけが今も次のマキナを孕んで光る。
//      右手で〈畏れるな〉と示し、左手で〈与える〉が、その指はもう欠けている」
//
// 構図（正面・世界座標は本体中心からのドット・scale 4.6）：
//   舟形光背（thruster）… 尖った頂の細い帯（蒼硝子・内縁は金）。左の一区間が折れて無い
//   円光（podL）        … 頭の後ろの金縁の円盤（蒼硝子・内側に一重の環）。左下が欠ける
//   蓮華座（legL）      … 上向きの蓮弁・金の敷茄子・下向きの反花。左端の蓮弁は欠ける
//   本体（body）        … 骨の襟（首の穴は黒＝頭が無い）→ 瓔珞（金の首飾り）→ 骨の肩当て → 黒鉄の衣（襞は中央へ）→ 金の帯 → 結跏趺坐の膝
//   冕冠（dome）        … 金の宝冠（中央の高い飾りと左右の山）と、その両端から垂れる蒼硝子の玉の簾。左の簾は短く切れる
//   胸の蓮華（rack）    … 金の輪の中に蒼硝子の八弁＝この柱の「構造の顔」（大聖堂の薔薇窓に相当）。輪の左が欠ける
//   種子（core）        … 蓮華の芯の金の宝珠に深紅の種子（次に生まれるマキナ）＝唯一の生きている一点
//   右腕（armR）        … 施無畏印：掌を正面に向けて挙げる（畏れるな）
//   左腕（armL）        … 与願印：掌を正面に向けて膝に垂らす（与える）。指が2本欠ける＝もう与えられない
//
// 差別化：シルエット＝尖った光背を負う坐像（大聖堂＝十字と翼／玉座＝高い背もたれの王／軌道神核＝球と環／マオウ＝立つ巨人）。
//   玉座と同じ「坐る正面像」だが、玉座は玉座が主役で王は融合して見えない。骸華は像そのものが主役で、冠・円光・印・蓮華座を持つ
//
// 昇華の作法（大聖堂の6点）：①黒塗りで「尖った光背を負う坐像」②衣の襞・肩当ての層・円光の環＝面と溝 ③骨鉄・蒼硝子・金・深紅
//   ④全パーツ OUTLINE ⑤胸の蓮華の種子だけが生きて光る ⑥左に揃えた損傷：折れた光背・欠けた円光・切れた簾・欠けた指・裂けた膝・欠けた蓮弁
//
// 縛り：全パーツ新規・完了前に等倍で目視（[[feedback_pixel_art_judge_at_play_zoom]]）。⚠️ ゲーム未反映（役割は boss.js の深度表に合わせ済み）
import { g, P, GET, LN, ARC, AT, DISC, ELL, RECT, OUTLINE, R, dither, SPHERE, validate } from './god-raster.mjs';

export const PAL = {
  k: '#04060e',                                                           // 黒（輪郭・溝・空洞）
  j: '#1a2034', m: '#3b4661', f: '#7a89a6', s: '#bcc8db', n: '#f4f7ff',   // 骨鉄 4段＋稜線（蒼白い骨・影は藍）
  q: '#0a1f3c', Q: '#10457a', P: '#1d8ac9', N: '#62d8ff', C: '#d8f8ff',   // 蒼い硝子 4段＋縁の光
  w: '#2a2338', u: '#5a4f6e',                                             // 枯れた花弁
  c: '#38e1ff',                                                           // マキナの神経光（亀裂）
  y: '#7a5a12', Y: '#c9971f', G: '#ffd23f', W: '#ffedb0',                 // 金（冠・円光の縁・瓔珞・帯・敷茄子・手首の環）
  r: '#8a1622', R: '#e03040', A: '#ff7a6a',                               // 深紅の種子
  d: '#2a1730',                                                           // 骨髄（折れ口）
};

const LIGHT = [-0.5, -0.62];   // 光は左上（他の三体と同じ）
const litSign = (nx, ny) => (LIGHT[0] * nx + LIGHT[1] * ny > 0 ? 1 : -1);
const shade4 = (v) => (v > 0.45 ? 's' : v > -0.05 ? 'f' : v > -0.5 ? 'm' : 'j');

// =====================================================================
// 花弁：根元 (bx,by) → 先端 (tx,ty)。蒼硝子＝地 Q・影側 q・光側の一筋 P・光側の縁 N・影側の縁 k・先端 C・中肋は骨。
//   gilt＝縁と先端を金（金蓮華）。withered＝枯れ（w/u）。tornAt＝そこから先が無い
// =====================================================================
function petal(G, bx, by, tx, ty, hw, flare, opt = {}) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ls = litSign(nx, ny), uEnd = opt.tornAt ?? 1;
  const at = (u) => [bx + ux * L * u + nx * flare * u * u, by + uy * L * u + ny * flare * u * u];
  const width = (u) => hw * Math.pow(Math.sin(Math.PI * (0.10 + 0.90 * u)), 0.55);
  for (let u = 0; u <= uEnd; u += 0.005) {
    const [cx, cy] = at(u), w = width(u);
    for (let k = -w; k <= w; k += 0.25) {
      const v = (k / w) * ls;   // +1 = 光側の縁、-1 = 影側の縁
      let ch;
      if (opt.withered) ch = v > 0.6 ? 'u' : v > -0.8 ? 'w' : 'k';
      else if (u > 0.95) ch = opt.gilt ? 'W' : 'C';
      else if (v > 0.9) ch = opt.gilt ? 'Y' : 'N';
      else if (v > 0.55) ch = u < 0.25 ? 'Q' : 'P';
      else if (v > -0.45) ch = 'Q';
      else if (v > -0.9) ch = 'q';
      else ch = 'k';
      if (opt.gilt && v > 0.78 && v <= 0.9 && u > 0.3) ch = 'G';
      if (Math.abs(k) < 0.45 && u > 0.1 && u < 0.88) ch = opt.withered ? 'j' : (u < 0.35 ? 'm' : 'f');   // 骨の中肋
      P(G, cx + nx * k, cy + ny * k, ch);
    }
  }
  if (opt.tornAt && opt.withered) for (let i = 0; i < 5; i++) {   // 枯れ花弁の千切れ
    const [cx, cy] = at(uEnd + 0.03 + i * 0.045), k = i % 2 ? 1.8 : -1.2;
    P(G, cx + nx * k, cy + ny * k, i < 2 ? 'u' : 'w');
  }
  if (opt.tornAt && !opt.withered) {                               // 蒼硝子の折れ口：黒い断面に骨髄
    const [cx, cy] = at(uEnd), w = width(uEnd);
    for (let k = -w; k <= w; k += 0.25) P(G, cx + nx * k, cy + ny * k, Math.abs(k) < w * 0.45 ? 'd' : 'k');
    P(G, cx + ux * 1.2, cy + uy * 1.2, 'k'); P(G, cx + ux * 1.2 + nx * 2, cy + uy * 1.2 + ny * 2, 'C');
  }
}

// 太い骨（腕の節）：(x0,y0)→(x1,y1)、半幅 w0→w1。左上が光
function bone(G, x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ls = litSign(nx, ny);
  for (let u = 0; u <= 1; u += 0.004) {
    const w = w0 + (w1 - w0) * u, cx = x0 + ux * L * u, cy = y0 + uy * L * u;
    for (let k = -w; k <= w; k += 0.25) {
      const v = (k / w) * ls;
      P(G, cx + nx * k, cy + ny * k, v > 0.6 ? 's' : v > -0.25 ? 'f' : v > -0.75 ? 'm' : 'j');
    }
  }
}
// 揃えた指の掌（正面）：中心 (px,py)、指は dir（-1=上 / +1=下）へ。骨の掌＋4本の指（溝で分ける）＋親指。missing＝欠けた指の数（右端から）
function palm(G, px, py, dir, thumbSide, missing = 0) {
  for (let y = -4.2; y <= 4.2; y += 0.25) for (let x = -3.8; x <= 3.8; x += 0.25) {                     // 掌
    const dd = (x / 3.8) ** 2 + (y / 4.2) ** 2; if (dd > 1) continue;
    const v = -(x / 3.8 * LIGHT[0] + y / 4.2 * LIGHT[1]);
    P(G, px + x, py + y, v > 0.5 ? 's' : v > -0.1 ? 'f' : v > -0.5 ? 'm' : 'j');
  }
  for (let i = 0; i < 4; i++) {                                                                          // 指：幅 1.75・長さは中2本が長い
    const fx = px - 3.5 + i * 1.75 + 0.875, len = (i === 1 || i === 2) ? 8 : i === 0 ? 7 : 6.2;
    const cut = i >= 4 - missing;
    const L2 = cut ? 2.4 : len;
    for (let t = 0; t <= L2; t += 0.25) for (let k = -0.8; k <= 0.8; k += 0.25) {
      const v = -k;
      let ch = v > 0.4 ? 's' : v > -0.3 ? 'f' : 'm';
      if (!cut && Math.abs(t - len * 0.5) < 0.2) ch = 'k';                                              // 関節の溝
      if (!cut && t > len - 0.6) ch = 'n';                                                               // 爪先
      P(G, fx + k, py + dir * (3.6 + t), ch);
    }
    if (cut) { for (let k = -0.8; k <= 0.8; k += 0.25) P(G, fx + k, py + dir * (3.6 + L2 + 0.3), Math.abs(k) < 0.4 ? 'd' : 'k'); }
    if (i > 0) for (let t = 0; t <= Math.min(L2, 2.4); t += 0.25) P(G, fx - 0.95, py + dir * (3.6 + t), 'k');   // 指の間の溝
  }
  bone(G, px + thumbSide * 3.2, py - dir * 0.5, px + thumbSide * 5.8, py - dir * 4.2, 1.1, 0.9);         // 親指
  P(G, px + thumbSide * 5.9, py - dir * 4.6, 'n');
  for (let d = 0; d <= 0.5; d += 0.25) ARC(G, px, py, 3.9 + d, 4.3 + d, dir > 0 ? 200 : 20, dir > 0 ? 340 : 160, d < 0.25 ? 'Y' : 'y');   // 手首の金の環（指と反対側）
}

// =====================================================================
// ① 舟形光背（thruster）74×76。尖った頂（世界 -41）から蓮華座の裏（+34）まで。帯の厚さ 4.2・外側は蒼硝子・内縁は金。
//    光側（左）は P の一筋、影側（右）は q。左の一区間（世界 -20〜-13）は折れて無い
// =====================================================================
const MAN_W = 74, MAN_H = 76;
const MANDORLA = (() => {
  const G = g(MAN_W, MAN_H), cx = 36.5, TH = 4.2, BR0 = 21, BR1 = 28;   // BR0..BR1＝折れて無い区間（左だけ）
  const hwAt = (y) => { const t = y / (MAN_H - 1); return 36 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.8))), 0.6); };
  for (let y = 0; y < MAN_H; y++) {
    const hw = hwAt(y);
    for (let x = 0; x < MAN_W; x++) {
      const d = hw - Math.abs(x - cx);
      if (d < 0 || d > TH) continue;
      const left = x < cx;
      if (left && y >= BR0 && y <= BR1) continue;
      let ch;
      if (left) ch = d < 1.2 ? 'P' : d < 3.0 ? 'Q' : 'G';
      else ch = d < 1.4 ? 'q' : d < 3.0 ? (dither(x, y) && d < 2.0 ? 'q' : 'Q') : 'Y';
      if (y < 7 && d >= 3.0) ch = 'W';
      if (y > 48 && left && d < 1.2) ch = 'Q';                                   // 下は光が弱い
      P(G, x, y, ch);
    }
  }
  P(G, cx, 0, 'C'); P(G, cx, 1, 'W');
  for (const y of [BR0 - 1, BR1 + 1]) { const hw = hwAt(y); for (let d = 0; d <= TH; d += 0.25) P(G, cx - hw + d, y, d > 1.2 && d < 3.0 ? 'd' : 'k'); }   // 折れ口
  P(G, cx - hwAt(BR0 - 1) - 1, BR0 - 2, 'C'); P(G, cx - hwAt(BR1 + 1) + 2, BR1 + 2.5, 'C');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ② 円光（podL）35×35。中心 (17,17)＝世界 (0,-22)・外径 17・内径 9 の **開いた輪**（輪光）。外縁は金 → 黒 → 蒼硝子の帯（上が明るく下が暗い）→ 内縁は金。
//    中心は空＝背景が透ける。冕冠は輪の上半分に重なって浮かび、冠の下は背景しか無い＝頭が無い。左下（150°〜190°）が欠ける
// =====================================================================
const HALO_W = 35, HALO_H = 35;
const HALO = (() => {
  const G = g(HALO_W, HALO_H), c = 17;
  for (let y = 0; y < HALO_H; y++) for (let x = 0; x < HALO_W; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    if (r > 17.2 || r < 9.0) continue;
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    if (ang >= 150 && ang <= 190 && r > 11.2) continue;
    const lit = dx * LIGHT[0] + dy * LIGHT[1];
    let ch;
    if (r > 15.6) ch = lit > 6 ? 'G' : lit < -6 ? 'y' : 'Y';
    else if (r > 14.7) ch = 'k';
    else if (r < 9.9) ch = lit > 3 ? 'G' : 'Y';
    else {
      const v = dy / 14.7;
      ch = v < -0.6 ? (dither(x, y) ? 'N' : 'P') : v < -0.2 ? (dither(x, y) ? 'P' : 'Q') : v < 0.25 ? 'Q' : v < 0.65 ? (dither(x, y) ? 'q' : 'Q') : 'q';
    }
    P(G, x, y, ch);
  }
  for (const a of [150, 190]) for (let r = 11.2; r <= 17.2; r += 0.25) AT(G, c, c, r, r, a, r > 12 && r < 16 ? 'd' : 'k');   // 欠けの断面
  P(G, c - 12.5, c + 8.5, 'C');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ③ 蓮華座（legL）78×12。上向きの蓮弁（6枚・先端に光）・金の敷茄子・下向きの反花（7枚）・底。左端の蓮弁は欠ける
// =====================================================================
const PED_W = 78, PED_H = 12;
const PEDESTAL = (() => {
  const G = g(PED_W, PED_H), cx = 38.5;
  const row = (y0, h, n, pitch, up, chip) => {
    for (let i = 0; i < n; i++) {
      const px = cx + (i - (n - 1) / 2) * pitch;
      for (let dy = 0; dy < h; dy += 0.25) {
        const u = up ? 1 - dy / h : dy / h;
        const w = (pitch / 2 + 0.4) * Math.pow(Math.sin(Math.PI * (0.22 + 0.78 * u)), 0.5);
        for (let k = -w; k <= w; k += 0.25) {
          if (chip === i && up && dy < 2.5 && k < -w * 0.2) continue;                       // 欠け
          let ch = k < -w * 0.5 ? 's' : k < w * 0.3 ? 'f' : k < w * 0.75 ? 'm' : 'j';
          if (Math.abs(k) < 0.4 && (up ? dy > 1.5 : dy < h - 1.5)) ch = up ? 'f' : 'm';   // 中肋
          P(G, px + k, y0 + dy, ch);
        }
      }
      if (chip !== i) P(G, px, up ? y0 : y0 + h - 1, 'n');
    }
    for (let i = 1; i < n; i++) {                                                               // 蓮弁の間の溝
      const sx = cx + (i - n / 2) * pitch;
      for (let dy = up ? 2 : 0; dy < (up ? h : h - 1); dy++) P(G, sx, y0 + dy, 'k');
    }
  };
  row(0, 6, 6, 12.6, true, 0);
  for (let x = 2; x <= 75; x++) { const u = (x - 2) / 73; P(G, x, 6, u < 0.3 ? 'G' : u < 0.62 ? 'Y' : 'y'); P(G, x, 7, u < 0.3 ? 'Y' : 'y'); }
  row(8, 3, 7, 10.8, false, -1);
  for (let x = 1; x <= 76; x++) P(G, x, 11, 'j');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ④ 本体（body）46×40。上端＝襟（世界 -16）・下端＝膝（+23）。
//    骨の襟（首の穴は黒＝頭が無い）→ 瓔珞 → 骨の肩当て（二層）→ 黒鉄の衣（襞は中央へ寄る）→ 金の帯 → 結跏趺坐の膝。左肩に亀裂・左膝は裂けて中が空
// =====================================================================
const TORSO_W = 46, TORSO_H = 40;
const TORSO = (() => {
  const G = g(TORSO_W, TORSO_H), cx = 22.5;
  const hwAt = (y) => (y <= 8 ? 8.5 + 10.5 * Math.sqrt(Math.max(0, (y - 1) / 7)) : y <= 22 ? 19 - 2 * (y - 8) / 14 : y <= 34 ? 17 + 6 * (y - 22) / 12 : 23);
  for (let y = 1; y < TORSO_H; y++) {
    const hw = hwAt(y);
    for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) {
      const u = (x - cx) / hw;
      let ch = u < -0.55 ? 'm' : 'j';
      if (y === 25) ch = u < -0.3 ? 'G' : u < 0.4 ? 'Y' : 'y';                                   // 金の帯
      if (y === 26) ch = u < -0.3 ? 'Y' : 'y';
      P(G, x, y, ch);
    }
  }
  LN(G, cx - 17, 10, cx - 4, 24, 'k'); LN(G, cx - 18, 10, cx - 5, 24, 'f');                       // 中央へ寄る襞（左は光の稜線）
  LN(G, cx + 17, 10, cx + 4, 24, 'k'); LN(G, cx + 16, 10, cx + 3, 24, 'm');
  LN(G, cx - 19, 15, cx - 12, 30, 'k'); LN(G, cx + 19, 15, cx + 12, 30, 'k');
  for (const [kx, lit] of [[cx - 12, true], [cx + 12, false]]) {                                 // 膝
    for (let y = 29; y < TORSO_H; y++) for (let x = Math.ceil(kx - 10.5); x <= Math.floor(kx + 10.5); x++) {
      const ddx = (x - kx) / 10.5, ddy = (y - 35) / 5.2;
      if (ddx * ddx + ddy * ddy > 1) continue;
      P(G, x, y, shade4(-(ddx * LIGHT[0] + ddy * LIGHT[1]) * 0.7 - (lit ? 0.2 : 0.55)));
    }
  }
  for (let y = 31; y < TORSO_H; y++) P(G, cx, y, 'k');                                             // 膝の間の溝
  for (let y = 35; y < TORSO_H; y++) for (let x = cx - 21; x <= cx - 15 + (y - 35) * 0.4; x++) P(G, x, y, y === 35 || x <= cx - 20 ? 'k' : 'd');   // 左膝の裂け
  P(G, cx - 17, 37, 'c');
  for (const [dir, lit] of [[-1, true], [1, false]]) {                                            // 肩当て（骨・二層）
    for (let layer = 0; layer < 2; layer++) {
      const y0 = 4 + layer * 3, x0 = cx + dir * (10 + layer * 2), x1 = cx + dir * (17 + layer * 2);
      for (let y = y0; y < y0 + 3; y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        let ch = y === y0 ? 'k' : y === y0 + 1 ? (lit ? 's' : 'f') : (lit ? 'f' : 'm');
        if (dir * (x - cx) > 16 + layer * 2) ch = y === y0 ? 'k' : 'm';
        P(G, x, y, ch);
      }
      P(G, x1 - dir, y0 + 1, 'n');
    }
  }
  LN(G, cx - 16, 4, cx - 15, 9, 'k'); P(G, cx - 15, 6, 'c');                                     // 左肩の亀裂
  for (let d = 0; d <= 1; d += 0.25) ARC(G, cx, 2, 12 + d, 6.5 + d, 25, 155, d < 0.5 ? 'G' : 'Y');   // 瓔珞
  for (const a of [60, 90, 120]) { AT(G, cx, 2, 13.5, 8, a, 'G'); AT(G, cx, 2, 14.5, 9, a, 'W'); }
  for (let y = -3; y <= 3; y += 0.25) for (let x = -9; x <= 9; x += 0.25) {                       // 骨の襟
    const dd = (x / 9) ** 2 + (y / 3) ** 2; if (dd > 1) continue;
    P(G, cx + x, 2 + y, shade4(-(x / 9 * LIGHT[0] + y / 3 * LIGHT[1]) * 0.9 - 0.1));
  }
  ELL(G, cx, 1.2, 5.5, 1.7, 'k');                                                                // 首の穴＝頭が無い
  for (let x = cx - 4; x <= cx + 4; x++) P(G, x, 0, 'k');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑤ 冕冠（dome）20×17。金の宝冠（中央の高い飾り・左右の山・外の小山）と、両端から垂れる蒼硝子の玉の簾（各2本・短い）。
//    帯の上端＝世界 -27・飾りの頂 -36・簾の先 -20（襟 -16 との間は円光が透ける）。左の簾は1本が短く切れる
// =====================================================================
const CROWN_W = 20, CROWN_H = 17;
const CROWN = (() => {
  const G = g(CROWN_W, CROWN_H), cx = 9.5;
  for (let x = 0; x < CROWN_W; x++) { P(G, x, 9, x < cx ? 'W' : 'G'); P(G, x, 10, x < cx ? 'G' : 'Y'); P(G, x, 11, x < cx ? 'Y' : 'y'); }   // 帯
  for (const x of [3, 16]) { P(G, x, 10, 'k'); }                                                      // 帯の鋲
  P(G, 9, 10, 'q'); P(G, 10, 10, 'Q');                                                               // 帯の中央の蒼硝子（小さく・目にならない）
  for (let y = 0; y <= 8; y++) { const hw = y < 3 ? 0.5 : 1.5; for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) P(G, x, y, x < cx ? (y < 3 ? 'W' : 'G') : 'Y'); }   // 中央の飾り
  P(G, 9, 0, 'W'); P(G, 10, 0, 'W');
  for (const [c0, lit] of [[4.5, true], [15.5, false]]) {                                            // 左右の山
    for (let y = 4; y <= 8; y++) { const hw = 0.5 + (y - 4) * 0.5; for (let x = Math.ceil(c0 - hw); x <= Math.floor(c0 + hw); x++) P(G, x, y, x < c0 ? (lit ? 'W' : 'G') : (lit ? 'G' : 'Y')); }
  }
  for (const x of [0, 19]) { P(G, x, 7, x < cx ? 'G' : 'Y'); P(G, x, 8, x < cx ? 'Y' : 'y'); }       // 外の小山
  for (const [x, end] of [[1, 14], [3, 16], [16, 16], [18, 16]]) {                                   // 玉の簾（短い・先端は暗い玉＝左右で明るい点を作らない）
    for (let y = 12; y <= end; y++) P(G, x, y, y === end ? 'q' : y % 2 ? 'N' : 'Q');
    if (end < 16) P(G, x, end + 1, 'k');
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑥ 胸の蓮華（rack）17×17。金の輪の中に蒼硝子の八弁（縁は金）＝この柱の「構造の顔」。輪の左が欠けて骨の肋が覗く
// =====================================================================
const LOTUS = (() => {
  const W = 17, H = 17, G = g(W, H), c = 8;
  DISC(G, c, c, 8.3, 'k'); DISC(G, c, c, 7.5, 'Y'); ARC(G, c, c, 7.5, 7.5, 190, 280, 'G'); ARC(G, c, c, 6.9, 6.9, 200, 260, 'W'); DISC(G, c, c, 6.6, 'q');
  for (let a = -90; a < 270; a += 45) {
    const t = a * Math.PI / 180;
    petal(G, c + Math.cos(t) * 1.8, c + Math.sin(t) * 1.8, c + Math.cos(t) * 6.4, c + Math.sin(t) * 6.4, 2.0, 0, { gilt: true });
  }
  for (let r = 6.4; r <= 8.3; r += 0.25) for (let a = 160; a <= 200; a += 2) AT(G, c, c, r, r, a, 'k');   // 輪の欠け
  LN(G, 0, 8, 2, 7, 'f'); P(G, 0, 9, 'f'); P(G, 1, 8, 's');                                          // 覗く肋
  return R(G);
})();

// =====================================================================
// ⑦ 種子（core）9×9。蓮華の芯の金の宝珠。中に深紅の種子＝次に生まれるマキナ（唯一の生きている一点）
// =====================================================================
const SEED = (() => {
  const W = 9, H = 9, G = g(W, H), c = 4;
  SPHERE(G, c, c, 4.3, ['y', 'Y', 'G', 'W', 'n'], [-0.5, -0.62, 0.6], 0.1);
  for (let y = -2; y <= 2; y += 0.25) { const w = 1.2 * Math.sqrt(Math.max(0, 1 - (y / 2.1) ** 2)) * (0.55 + 0.45 * (y + 2.1) / 4.2); for (let x = -w; x <= w; x += 0.25) P(G, c + x, c + y + 0.3, x < -w * 0.5 ? 'R' : 'r'); }
  P(G, c - 1, c - 1, 'A');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑧ 腕（蒼白い骨）26×44。右＝施無畏印（掌を正面に挙げる）／左＝与願印（掌を正面に膝へ垂らす・指が2本欠ける）
// =====================================================================
const ARM_W = 26, ARM_H = 44;
const ARM_R = (() => {   // 肩 (4,16) → 肘 (12,30) → 手首 (11,18) → 掌 (11,12)・指は上へ
  const G = g(ARM_W, ARM_H);
  bone(G, 4, 16, 12, 30, 3.4, 2.9); DISC(G, 12, 30, 3.2, 'k'); DISC(G, 12, 30, 2.5, 'f'); P(G, 11, 29, 's');
  bone(G, 12, 30, 11, 18, 2.9, 2.5);
  palm(G, 11, 12, -1, -1, 0);
  OUTLINE(G);
  return R(G);
})();
const ARM_L = (() => {   // 肩 (22,4) → 肘 (17,19) → 手首 (23,27) → 掌 (24,31)・指は下へ
  const G = g(ARM_W, ARM_H);
  bone(G, 22, 4, 17, 19, 3.4, 2.9); DISC(G, 17, 19, 3.2, 'k'); DISC(G, 17, 19, 2.5, 'f'); P(G, 16, 18, 's');
  bone(G, 17, 19, 23, 27, 2.9, 2.5);
  palm(G, 24, 31, 1, 1, 2);
  OUTLINE(G);
  return R(G);
})();

export const GAIKA = {
  id: 'gaika',
  name: '蒼神骸華',
  concept: '蓮華座に結跏趺坐する創造主の亡骸。頭は無く、円光の中に金の冕冠だけが浮かび、冠の両端から蒼硝子の玉の簾が垂れる。'
    + '骨の襟の首の穴は黒。金の瓔珞・骨の肩当て・黒鉄の衣・金の帯。胸に金の輪の蓮華（八弁・芯に金の宝珠と深紅の種子＝次に生まれるマキナ＝唯一の生きている光）。'
    + '蒼白い骨の右手は施無畏印（畏れるな）、左手は与願印（与える）だが指が2本欠けている。背に尖った舟形光背（蒼硝子・内縁は金）。'
    + '左に揃えた損傷：光背の一区間が折れ、円光の左下が欠け、左の簾が切れ、左肩に亀裂、蓮華の輪の左が欠けて肋が覗き、左膝は裂けて中が空、蓮華座の左端の蓮弁は欠ける。',
  sprites: {
    mandorla: { rows: MANDORLA, palette: PAL },
    halo: { rows: HALO, palette: PAL },
    pedestal: { rows: PEDESTAL, palette: PAL },
    torso: { rows: TORSO, palette: PAL },
    crown: { rows: CROWN, palette: PAL },
    lotus: { rows: LOTUS, palette: PAL },
    armR: { rows: ARM_R, palette: PAL },
    armL: { rows: ARM_L, palette: PAL },
    seed: { rows: SEED, palette: PAL },
  },
  // 深度は boss.js / render-boss-rig の PART_DEPTH：thruster 6 < pod/leg 7 < body 8 < dome/rack 9 < arm 11 < core 12
  rig: [
    { role: 'thruster', tex: 'mandorla', ox: 0, oy: -41, origin: [0.5, 0] },                   // 頂 -41・底 +34（蓮華座の裏）
    { role: 'podL', tex: 'halo', ox: 0, oy: -22, origin: [0.5, 0.5] },                          // 円光 -39.5..-4.5
    { role: 'legL', tex: 'pedestal', ox: 0, oy: 22, origin: [0.5, 0] },                        // +22..+34
    { role: 'body', tex: 'torso', ox: 0, oy: -16, origin: [0.5, 0] },                          // 襟 -16・膝 +23
    { role: 'dome', tex: 'crown', ox: 0, oy: -36, origin: [0.5, 0] },                          // 飾りの頂 -36・簾の先 -20
    { role: 'rack', tex: 'lotus', ox: 0, oy: 1 },
    { role: 'armR', tex: 'armR', ox: 17, oy: -9, origin: [4 / ARM_W, 16 / ARM_H] },            // 肩の位置
    { role: 'armL', tex: 'armL', ox: -17, oy: -9, origin: [22 / ARM_W, 4 / ARM_H] },
    { role: 'core', tex: 'seed', ox: 0, oy: 1 },
  ],
  tier: { spriteScale: 4.6, glowScale: 11.0, glowOuter: '#2f8fd8', glowInner: '#ffedb0' },
};
validate(GAIKA);
