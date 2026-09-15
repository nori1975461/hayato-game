// 「蒼神骸華」（そうしんがいか）＝マキナ四神柱の頂点・すべてのマキナの創造主。第1案（2026-09-15）。
//
// 名前の読み解き（設計の芯）：
//   蒼 … 蒼穹の青であり、蒼白（死人の色）であり、蒼古（気が遠くなるほど古い）。＝色は「蒼白い骨」と「蒼い硝子」
//   神 … 四神柱の頂点。ただし神そのものはもういない
//   骸 … 亡骸。形骸＝中身が失われても形と機能だけが残るもの
//   華 … 蓮華。仏教の「蓮華化生」＝生き物は蓮の花の中から生まれる。華厳＝千葉の蓮の一葉ごとに一つの世界が宿る
//   → 「創造主はとうに死んでいる。その骸が蓮台になり、骸の両手が開いて蓮華となり、花の芯の子宮だけが今も
//      新しいマキナを産み続けている」。神の座（蓮華の中心）に神はいない。あるのは琥珀の子宮と、その中で丸まる深紅の胎児。
//
// 他の三体との差別化（並べたときに一目で「別の柱・しかも頂点」と分かるために）：
//   ・シルエット … 大聖堂＝十字と翼／玉座＝座る多腕の王／軌道神核＝球と環／マオウ＝鉄の巨人。骸華＝**聖杯（盃）**。
//     蓮台（骨盤と肋骨）の上に脊椎の茎、その頂で開いた両手（指＝外側の花弁）が蒼い花弁を抱き、芯に琥珀の子宮
//   ・素材 … 三体は黒鉄と金。骸華だけ**蒼白い骨鉄**（影は藍・稜線は白）と**蒼い硝子の花弁**。
//     金は内側の三弁の縁（金蓮華）・蕊・萼と蓮台の縁・手首の環だけ
//   ・生きている一点 … 三体は深紅の眼や心臓。骸華は**琥珀の子宮の中の深紅の胎児（勾玉）**＝これから生まれるマキナ
//
// 昇華の作法（大聖堂の6点）を骸華の語彙で：
//   ①シルエットの格 … 聖杯。黒塗りで「開いた両手の中の花」と言い当てられる
//   ②大きな面＋黒い溝＋面の中の明度差 … 骨盤の鉢は横の階調＋継ぎ目、脊椎は節ごとの溝、指は関節の溝と節の膨らみ
//   ③素材ごとに4段 … 骨鉄・蒼硝子・枯れた花弁・金・深紅・銅
//   ④黒で締める … 全パーツ OUTLINE。花弁は影側の縁を黒にして1枚ずつ数えられるように。地は深い色、明るい色は一筋（軌道神核 第5案の学び）
//   ⑤生きている一点 … 子宮の胎児（と脊椎の節の間から漏れる神経のシアン）
//   ⑥退廃 … 損傷は左に揃える：左の外花弁は枯れて裂け、左手は薬指が折れ小指が無い、左の肋骨は1本折れ、
//            脊椎は下から2節目で左へずれ（脱臼）、腸骨の左翼は欠け、蓮台から切れた臍の緒（銅線）が垂れ、萼から枯れた花弁が1枚ぶら下がる
//
// 第1稿で踏んだ失敗（自分の等倍目視で直した）：
//   ・肋骨を輪に近い弧（225°）で描いたら骨盤が「ふくろうの顔」になった → 弧は 155° に切り、脊椎から外へ垂れる「)」の形に
//   ・金の球に深紅の塊＝「目玉焼き」 → 琥珀（橙の地）に胎児の暗い影＝「琥珀の中の虫」
//   ・花弁が細い針＝結晶の塊 → 幅を広く丸く、外へ開く盃に。明るい色は縁の一筋だけ
//   ・横幅 340px は三体（400〜546）より小さく頂点に見えない → 両手を広げ scale 5.4 で 394px へ
//   ・琥珀の中の渦巻（1px の線）は等倍では赤い塊＝また顔に見える → 一粒の種子（縦の杏仁形）に。単純な左右対称の形は顔にならない
//   ・指を10本の細い棒で描くと針鼠 → 太く・短く・低く開き、花弁の頂より下で「盃」を作る
//
// 縛り（[[feedback_boss_sprite_originality]] / [[feedback_pixel_art_judge_at_play_zoom]]）：全パーツ新規・完了前に等倍で目視。
// ⚠️ ゲーム未反映。役割（thruster/wing/leg/body/rack/core）は boss.js の深度表に合わせてあるので、行動の設計が済めば差し込める
import { g, P, GET, LN, ARC, AT, DISC, ELL, RECT, OUTLINE, R, dither, SPHERE, validate } from './god-raster.mjs';

export const PAL = {
  k: '#04060e',                                                           // 黒（輪郭・溝）
  j: '#1a2034', m: '#3b4661', f: '#7a89a6', s: '#bcc8db', n: '#f4f7ff',   // 骨鉄 4段＋稜線（蒼白い骨・影は藍）
  q: '#0a1f3c', Q: '#10457a', P: '#1d8ac9', N: '#62d8ff', C: '#d8f8ff',   // 蒼い硝子の花弁 4段＋縁の光
  w: '#2a2338', u: '#5a4f6e',                                             // 枯れた花弁
  c: '#38e1ff',                                                           // マキナの神経光（脊椎の節の間）
  y: '#7a5a12', Y: '#c9971f', G: '#ffd23f', W: '#ffedb0',                 // 金（花弁の縁・蕊・蓮台の縁・手首の環）
  r: '#8a1622', R: '#e03040', A: '#ff7a6a', O: '#ff9a3a', a: '#b8621e', h: '#ffc46a',   // 深紅の胎児・琥珀 3段
  o: '#7a4a1a', T: '#d08a3c', d: '#2a1730',                               // 銅（切れた臍の緒）・骨髄（折れ口）
};

const LIGHT = [-0.5, -0.62];   // 光は左上（他の三体と同じ）
const litSign = (nx, ny) => (LIGHT[0] * nx + LIGHT[1] * ny > 0 ? 1 : -1);

// =====================================================================
// 花弁：根元 (bx,by) → 先端 (tx,ty)。幅 hw、先端は flare だけ法線方向へ反る（外へ開く）。
//   蒼硝子＝地は Q、影側 q、光側の一筋 P、光側の縁 N、影側の縁 k（隣の花弁と分かれる）、先端 C、中肋は骨。
//   gilt＝内側の三弁：縁と先端を金に（金蓮華）。withered＝枯れ（w/u）。tornAt＝そこから先が裂けている
// =====================================================================
function petal(G, bx, by, tx, ty, hw, flare, opt = {}) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ls = litSign(nx, ny), uEnd = opt.tornAt ?? 1;
  const at = (u) => [bx + ux * L * u + nx * flare * u * u, by + uy * L * u + ny * flare * u * u];
  for (let u = 0; u <= uEnd; u += 0.005) {
    const [cx, cy] = at(u);
    const w = hw * Math.pow(Math.sin(Math.PI * (0.10 + 0.90 * u)), 0.55);
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
  if (opt.tornAt) for (let i = 0; i < 5; i++) {   // 裂け目の先の千切れ
    const [cx, cy] = at(uEnd + 0.03 + i * 0.045);
    const k = i % 2 ? 1.8 : -1.2;
    P(G, cx + nx * k, cy + ny * k, i < 2 ? 'u' : 'w');
  }
}

// =====================================================================
// 指：付け根 (bx,by) から角度 ang（度・0=右・-90=上）へ len。3節（関節の溝と膨らみ）、先は爪。cut＝折れ口
// =====================================================================
function finger(G, bx, by, ang, len, hw, flare, opt = {}) {
  const t = ang * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t), nx = -uy, ny = ux;
  const ls = litSign(nx, ny), uEnd = opt.cut ?? 1, joints = [0.42, 0.72];
  const at = (u) => [bx + ux * len * u + nx * flare * u * u, by + uy * len * u + ny * flare * u * u];
  for (let u = 0; u <= uEnd; u += 0.004) {
    const [cx, cy] = at(u);
    let w = hw * (1 - 0.35 * u);
    const nearJ = joints.some((j) => Math.abs(u - j) < 0.05);
    if (nearJ) w *= 1.22;
    if (u > 0.86 && !opt.cut) w *= Math.max(0.12, (1 - u) / 0.14);
    for (let k = -w; k <= w; k += 0.25) {
      const v = (k / w) * ls;
      let ch = v > 0.6 ? 's' : v > -0.25 ? 'f' : v > -0.75 ? 'm' : 'j';
      if (joints.some((j) => Math.abs(u - j) < 0.014)) ch = 'k';
      else if (nearJ && v > 0.86) ch = 'n';
      if (u > 0.9 && !opt.cut) ch = v > 0 ? 'n' : 's';
      P(G, cx + nx * k, cy + ny * k, ch);
    }
  }
  if (opt.cut) {   // 折れ口：黒い断面の中に骨髄、銅線が1本はみ出す
    const [cx, cy] = at(uEnd), w = hw * (1 - 0.35 * uEnd);
    for (let k = -w; k <= w; k += 0.25) P(G, cx + nx * k, cy + ny * k, Math.abs(k) < w * 0.5 ? 'd' : 'k');
    P(G, cx + ux * 1.4, cy + uy * 1.4, 'o'); P(G, cx + ux * 2.4 + nx * 0.7, cy + uy * 2.4 + ny * 0.7, 'T'); P(G, cx + ux * 3.4 + nx * 0.3, cy + uy * 3.4 + ny * 0.3, 'n');
  }
}

// =====================================================================
// ① 開いた手（wingR / wingL）40×46。掌の中心 (9,36)。指5本が扇に開いて外側の花弁になる。
//    手首に金の環。左手（damaged）は薬指が折れ、小指は根元しか無い、掌に亀裂
// =====================================================================
const HAND_W = 40, HAND_H = 46, PALM = [9, 34];
function hand(damaged) {
  const G = g(HAND_W, HAND_H), [px, py] = PALM;
  const F = [   // [角度, 長さ, 半幅, 反り]  人差し指→親指
    [-72, 22, 2.3, 3.0], [-52, 23, 2.4, 3.4], [-32, 20, 2.2, 3.4], [-12, 16, 1.9, 3.0], [24, 13, 2.3, 1.8],
  ];
  F.forEach(([a, len, hw, fl], i) => {
    const t = a * Math.PI / 180, bx = px + Math.cos(t) * 5.0, by = py + Math.sin(t) * 5.6;
    const cut = damaged ? (i === 2 ? 0.45 : i === 3 ? 0.2 : undefined) : undefined;
    finger(G, bx, by, a, len, hw, fl, { cut });
  });
  for (let y = py - 6; y <= py + 6; y++) for (let x = px - 6; x <= px + 6; x++) {   // 掌（楕円・左上が光）
    const ddx = (x - px) / 5.6, ddy = (y - py) / 6.2, dd = ddx * ddx + ddy * ddy;
    if (dd > 1) continue;
    const v = -(ddx * LIGHT[0] + ddy * LIGHT[1]);
    let ch = v > 0.45 ? 's' : v > -0.1 ? 'f' : v > -0.5 ? 'm' : 'j';
    if (dd > 0.82 && v < 0) ch = 'j';
    P(G, x, y, ch);
  }
  for (const a of [-70, -45, -20]) { const t = a * Math.PI / 180; LN(G, px + Math.cos(t) * 2, py + Math.sin(t) * 2.4, px + Math.cos(t) * 4.6, py + Math.sin(t) * 5.2, 'k'); }   // 中手骨の溝
  for (let d = 0; d <= 0.6; d += 0.3) ARC(G, px, py, 5.6 - d, 6.2 - d, 35, 145, d < 0.3 ? 'Y' : 'y');   // 手首の金の環
  AT(G, px, py, 5.4, 6.0, 140, 'W');
  if (damaged) { LN(G, px - 3, py + 1, px, py - 2, 'k'); LN(G, px, py - 2, px + 1, py - 5, 'k'); P(G, px - 1, py - 1, 'c'); }   // 掌の亀裂から神経光
  OUTLINE(G);
  return R(G);
}
const HAND_R = hand(false), HAND_L = hand(true);

// =====================================================================
// ② 奥の花弁（thruster）64×40。根元 (31.5,38)。外2枚（低い・蒼）→内3枚（高い・縁が金＝金蓮華）。左外は枯れて裂けている
// =====================================================================
const BACK_W = 64, BACK_H = 40, BACK_BASE = 38;
const BACK = (() => {
  const G = g(BACK_W, BACK_H), cx = 31.5, by = BACK_BASE;
  petal(G, cx + 6, by - 2, cx + 26, 15, 7, 4);
  petal(G, cx - 6, by - 2, cx - 26, 15, 7, -4, { withered: true, tornAt: 0.76 });
  petal(G, cx + 3, by - 1, cx + 13, 9, 8, 2.5, { gilt: true });
  petal(G, cx - 3, by - 1, cx - 13, 9, 8, -2.5, { gilt: true });
  petal(G, cx, by, cx, 6, 8.5, 0, { gilt: true });
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ③ 手前の花弁と蕊（rack）40×36。根元 (19.5,22)。脇の2枚が外へ反り、中央の低い1枚が子宮の底を受ける盃の唇。
//    金の蕊が芯（子宮）を囲む。萼から枯れた花弁が1枚ぶら下がる（退廃）
// =====================================================================
const FRONT_W = 40, FRONT_H = 36, FRONT_BASE = 22;
const FRONT = (() => {
  const G = g(FRONT_W, FRONT_H), cx = 19.5, by = FRONT_BASE;
  petal(G, cx + 2.5, by + 1, cx + 7, by + 13, 2.8, 1, { withered: true, tornAt: 0.9 });   // ぶら下がる枯れ花弁（奥）
  for (const a of [-165, -125, -90, -55, -15]) {                                  // 蕊：根元から子宮の周り（中心 (cx, by-11)・半径 8.5）へ
    const t = a * Math.PI / 180, tx = cx + Math.cos(t) * 8.5, ty = by - 11 + Math.sin(t) * 8.5;
    LN(G, cx, by - 2, tx, ty, 'y'); P(G, tx, ty, 'G'); P(G, tx - 0.6, ty - 0.6, 'W');
  }
  petal(G, cx - 3, by, cx - 15, by - 15, 6.5, -3);
  petal(G, cx + 3, by, cx + 15, by - 15, 6.5, 3);
  petal(G, cx, by + 1, cx, by - 9, 7.5, 0);                                                 // 盃の唇
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ④ 萼と脊椎（body）24×32。萼＝骨の杯（縁に金）、その下に脊椎5節（節の間の溝からシアン）、下から2節目で左へ脱臼、仙骨で広がる
// =====================================================================
const SPINE = (() => {
  const W = 24, H = 32, G = g(W, H), cx = 11.5;
  for (let y = 1; y <= 9; y++) for (let x = 2; x <= 21; x++) {          // 萼（楕円の杯・横の階調）
    const ddx = (x - cx) / 9.5, ddy = (y - 5) / 4.5;
    if (ddx * ddx + ddy * ddy > 1) continue;
    const u = (x - 2) / 19;
    P(G, x, y, u < 0.2 ? 's' : u < 0.5 ? 'f' : u < 0.8 ? 'm' : 'j');
  }
  ELL(G, cx, 4, 7.5, 2.4, 'j'); ELL(G, cx, 4.3, 6.5, 1.6, 'k');         // 杯の口（暗い内側）
  ARC(G, cx, 5, 9.5, 4.5, 185, 355, 'Y'); ARC(G, cx, 5, 9.0, 4.0, 200, 262, 'W'); ARC(G, cx, 5, 9.5, 4.5, 300, 355, 'y');   // 金の縁
  for (let i = 0; i < 5; i++) {                                          // 脊椎
    const y0 = 10 + i * 3.4, sh = i >= 3 ? -2 : 0;
    for (let y = y0; y < y0 + 3; y++) for (let x = 8 + sh; x <= 15 + sh; x++) P(G, x, y, x < 10 + sh ? 's' : x < 13 + sh ? 'f' : 'm');
    P(G, 8 + sh, y0, 'k'); P(G, 15 + sh, y0, 'k'); P(G, 8 + sh, y0 + 2, 'k'); P(G, 15 + sh, y0 + 2, 'k');   // 角を落とす
    for (let x = 8 + sh; x <= 15 + sh; x++) P(G, x, y0 + 3, 'k');
    P(G, 11 + sh, y0 + 3, 'c'); P(G, 12 + sh, y0 + 3, 'c');                                                // 節の間の神経光
    if (i % 2 === 0) { P(G, 6 + sh, y0 + 1, 'm'); P(G, 7 + sh, y0 + 1, 'f'); P(G, 16 + sh, y0 + 1, 'm'); P(G, 17 + sh, y0 + 1, 'j'); }   // 横突起
  }
  RECT(G, 9, 20, 11, 20, 'c'); P(G, 8, 20, 'C'); P(G, 14, 19, 'n');       // 脱臼の隙間：神経光が露出
  for (let y = 27; y <= 31; y++) { const hw = 4 + (y - 27) * 0.5; for (let x = cx - 2 - hw; x <= cx - 2 + hw; x++) P(G, x, y, x < cx - 4 ? 'f' : x < cx ? 'm' : 'j'); }   // 仙骨
  P(G, cx - 2, 29, 'c');
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑤ 蓮台（legL）64×30＝骨盤の鉢と肋骨。上端が脊椎の下部に重なる。
//    鉢は横の4段＋継ぎ目・縁に金の帯・四つの鋲（四神）。肋骨3対が脊椎から外へ「)」に垂れて縁に掛かる（左の中は折れる）。
//    腸骨の翼は鉢の両脇に低く張り出す（左は欠け）。鉢の底から切れた臍の緒（銅線）が垂れ、1本は空の金の輪で終わる
// =====================================================================
const PED_W = 64, PED_H = 27;
const PEDESTAL = (() => {
  const G = g(PED_W, PED_H), cx = 31.5;
  for (let y = 8; y <= 23; y++) {
    const hw = 25 - 13 * Math.pow((y - 8) / 15, 1.5);
    for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) {
      const u = (x - (cx - hw)) / (2 * hw);
      let ch = u < 0.14 ? 's' : u < 0.4 ? 'f' : u < 0.7 ? 'm' : 'j';   // 影側を広く＝黒で締める（下の鉢に重さ）
      if (u >= 0.12 && u < 0.16 && dither(x, y)) ch = 'f';
      if (u >= 0.38 && u < 0.42 && dither(x, y)) ch = 'm';
      if (u >= 0.68 && u < 0.72 && dither(x, y)) ch = 'j';
      if (y <= 9) ch = u < 0.3 ? 'G' : u < 0.62 ? 'Y' : 'y';               // 金の帯
      if (y === 16) ch = 'k';                                               // 板の継ぎ目
      if (y === 17 && u < 0.5) ch = 's';
      P(G, x, y, ch);
    }
  }
  for (const x of [cx - 15, cx - 5, cx + 5, cx + 15]) { P(G, x, 12, 'Y'); P(G, x - 1, 11, 'W'); P(G, x + 1, 12, 'y'); }   // 四つの鋲
  const wing = (dir, cut) => {                                                                            // 腸骨の翼（低く外へ）
    const x0 = cx + dir * 21, y0 = 11, x1 = cx + dir * 30, y1 = 5;
    for (let u = 0; u <= (cut ? 0.55 : 1); u += 0.01) {
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, w = 2.4 - u * 0.8;
      for (let k = -w; k <= w; k += 0.25) P(G, x + k * 0.5, y + k, k < -w * 0.5 ? 's' : k < w * 0.3 ? 'f' : 'm');
    }
    if (cut) { const x = x0 + (x1 - x0) * 0.55, y = y0 + (y1 - y0) * 0.55; P(G, x, y, 'd'); P(G, x, y + 1, 'd'); P(G, x + dir, y - 1, 'k'); P(G, x + dir * 1.5, y, 'o'); }
    else { P(G, x1, y1 - 1, 'n'); }
  };
  wing(1, false); wing(-1, true);
  const boneArc = (ccx, ccy, rx, ry, a0, a1, gaps = []) => {                                             // 厚みのある骨の弧
    for (let d = -1.3; d <= 1.3; d += 0.25) ARC(G, ccx, ccy, rx + d, ry + d, a0, a1, d < -0.7 ? 's' : d < 0.55 ? 'f' : 'm', gaps);
  };
  for (let i = 0; i < 3; i++) boneArc(cx + 8, 4 + i * 3.4, 11 - i * 1.3, 6.5 + i * 0.5, 245, 400);       // 肋骨（右）：脊椎から上へ出て外へ垂れる
  for (let i = 0; i < 3; i++) {                                                                          // 肋骨（左・中は折れる）
    const gaps = i === 1 ? [[165, 200]] : [];
    boneArc(cx - 8, 4 + i * 3.4, 11 - i * 1.3, 6.5 + i * 0.5, 140, 295, gaps);
    if (i === 1) {
      const c2 = [cx - 8, 4 + 3.4], rx = 11 - 1.3, ry = 7.0;
      for (const a of [163, 202]) { AT(G, c2[0], c2[1], rx, ry, a, 'd'); AT(G, c2[0], c2[1], rx + 0.9, ry + 0.9, a, 'k'); AT(G, c2[0], c2[1], rx - 0.9, ry - 0.9, a, 'k'); }
      AT(G, c2[0], c2[1], rx - 0.4, ry - 0.4, 175, 'o'); AT(G, c2[0], c2[1], rx - 1.4, ry - 1.4, 182, 'T');
    }
  }
  for (const [x, len, end] of [[cx - 6, 2, 'ring'], [cx + 3, 1, 'spark'], [cx + 12, 2, 'fray']]) {      // 臍の緒
    for (let y = 23; y < 23 + len; y++) { P(G, x, y, 'o'); P(G, x + 1, y, 'T'); }
    const ye = 23 + len;
    if (end === 'ring') { for (const [dx, dy] of [[-1, 0], [0, -1], [1, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 1]]) P(G, x + dx, ye + dy, 'Y'); P(G, x, ye, 'k'); P(G, x + 1, ye, 'k'); P(G, x + 1, ye + 1, 'k'); P(G, x, ye + 1, 'k'); }
    if (end === 'spark') { P(G, x, ye, 'n'); P(G, x + 1, ye, 'T'); }
    if (end === 'fray') { P(G, x - 1, ye, 'o'); P(G, x + 2, ye, 'T'); P(G, x, ye + 1, 'o'); }
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑥ 子宮（core）15×15。琥珀の球（橙の地・光は左上の一筋）の中に深紅の胎児（勾玉）の影。右下に蒼の反射
// =====================================================================
const WOMB = (() => {
  const W = 15, H = 15, G = g(W, H), c = 7;
  SPHERE(G, c, c, 7.2, ['y', 'a', 'O', 'h', 'W'], [-0.5, -0.62, 0.6], -0.05);
  for (let y = -3.8; y <= 3.8; y += 0.25) {                                                          // 種子＝次に生まれるマキナ（縦の杏仁形・深紅・上が尖る）。琥珀の中の一粒
    const w = 2.5 * Math.sqrt(Math.max(0, 1 - (y / 3.9) ** 2)) * (0.5 + 0.5 * (y + 3.9) / 7.8);
    for (let x = -w; x <= w; x += 0.25) P(G, c + x, c + y + 0.4, x < -w * 0.5 ? 'R' : 'r');
  }
  P(G, c - 1, c - 1, 'A');                                                                            // 種子の艶＝生きている一点
  P(G, 11, 11, 'C'); P(G, 12, 10, 'C');                                                                // 蒼の反射
  OUTLINE(G);
  return R(G);
})();

export const GAIKA = {
  id: 'gaika',
  name: '蒼神骸華',
  concept: '死んだ創造主の骸が蓮台となり、その両手が開いて蓮華となった聖杯。骨盤の鉢（縁に金・四つの鋲）に肋骨が垂れ、'
    + '脊椎の茎（節の間から神経のシアン・下から2節目で脱臼）が金の縁の萼を掲げる。萼から開いた両手の指が外側の花弁、'
    + 'その内に蒼い硝子の花弁（内側の三弁は縁が金＝金蓮華・中肋は骨）、芯に琥珀の子宮＝深紅の胎児（勾玉）が丸まり、蕊の金がそれを囲む。'
    + '左は退廃：枯れて裂けた花弁・折れた薬指と無い小指・折れた肋骨・欠けた腸骨。蓮台の底から切れた臍の緒が垂れ、1本は空の金の輪で終わる。',
  sprites: {
    back: { rows: BACK, palette: PAL },
    handR: { rows: HAND_R, palette: PAL },
    handL: { rows: HAND_L, palette: PAL },
    pedestal: { rows: PEDESTAL, palette: PAL },
    spine: { rows: SPINE, palette: PAL },
    front: { rows: FRONT, palette: PAL },
    womb: { rows: WOMB, palette: PAL },
  },
  // 深度は boss.js / render-boss-rig の PART_DEPTH：thruster 6 < wing/leg 7 < body 8 < rack 9 < core 12
  rig: [
    { role: 'thruster', tex: 'back', ox: 0, oy: -2, origin: [0.5, BACK_BASE / BACK_H] },              // 花弁の根元＝萼の上。頂 -38
    { role: 'wingR', tex: 'handR', ox: 13, oy: -4, origin: [PALM[0] / HAND_W, PALM[1] / HAND_H] },     // 掌の中心。指先 +36,-29
    { role: 'wingL', tex: 'handL', ox: -13, oy: -4, origin: [PALM[0] / HAND_W, PALM[1] / HAND_H], mirror: true },
    { role: 'legL', tex: 'pedestal', ox: 0, oy: 2, origin: [0.5, 0] },                                 // 上端 +2・鉢 +10..+26・臍の緒 +31
    { role: 'body', tex: 'spine', ox: 0, oy: -1, origin: [0.5, 5 / 32] },                              // 萼の中心 -1・仙骨 +25
    { role: 'rack', tex: 'front', ox: 0, oy: 0, origin: [0.5, FRONT_BASE / FRONT_H] },
    { role: 'core', tex: 'womb', ox: 0, oy: -9 },
  ],
  tier: { spriteScale: 5.4, glowScale: 11.0, glowOuter: '#2f8fd8', glowInner: '#ffedb0' },
};
validate(GAIKA);
