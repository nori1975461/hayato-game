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
  q: '#4a505f', // 奥の脚のズボン（横顔の歩き・走り＝どちらの脚が前か読めるように暗く）
  w: '#8f98a6', // 奥の脚の靴
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
  followR: ['.pp..pp.', '.pp.uuu.', '.pp.uuu.', '.dd.....', '.uu.....', 'uuu.....'],   // 投げたあと（背中・画面の右の腕で投げた）＝投げた側の脚を後ろへ蹴り上げ靴の裏が見える・反対の脚は着地
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
// ===== 横顔の歩き・走り（第 2 版 2026-10-13 ユーザー「完全に摺り足」＋見本動画『正しい歩き方のポイント』中日新聞 youtu.be/6WhLyA3-wE4）=====
//   摺り足の正体＝体の速さ 148px/秒（身長 18 画素の 2.7 倍/秒）に対して足が地面に止まっていないこと。コマを時間で回す限りどんな絵でも滑る
//   動画の人（30 コマ/秒で追跡）＝1 秒に 2 歩・歩幅は身長の 0.40・速さは身長の 0.73 倍/秒＝主人公はその 3.7 倍の速さで動いている（人間なら走る速さ）
//   直し＝①player.gd がコマを「進んだ距離」で回す（1 周 cycle 画素）＝着いた足は体が進む分だけ絵の中で後ろへ下がる＝原理的に滑らない
//        ②1 周 8 コマを骨（腰→膝→足首・脚の長さ 5）から機械で描く＝着地（かかと・つま先上げ）→体が足の上を通る（腰が 1 画素沈む）→かかとが浮いて蹴る→膝を上げて振り出す
//        ③奥の脚は暗い色（q・w）・腰の 1 画素後ろ＝どちらの脚が前か読める。腕は手前だけ＝脚と逆に振る（手描きの 3 姿勢）
//   走り（既定）＝1 周 24 画素・接地 3 コマ＋空中・膝 2・前傾 [頭 2, 胸 1]・肘を曲げて振る＝148px/秒で 1 秒に 4.1 歩
//   早歩き（比較用 Shift+9）＝1 周 12 画素・常にどちらかの足が地面・膝 2・前傾 [1, 1]・腕を伸ばして振る＝1 秒に 8.2 歩（この速さでは歩きは成立しない、の実証）
const GAITS = {
  run: { cycle: 24, contact: 3, spread: 3, lift: 2, lean: [2, 1], arm: 'bent' },
  walk: { cycle: 12, contact: 5, spread: 3, lift: 2, lean: [1, 1], arm: 'straight' },
};
const GAIT_N = 8;               // 1 周のコマ数
const HIP = { x: 10, y: 11 };   // 腰の関節（立ち姿の行 11・足首は行 16・足は行 17）
const LEG = 5;                  // 脚の長さ（股関節→足首）＝太もも 2.5＋すね 2.5
function footOf(g, i) {         // コマ i（0〜7）の片脚＝足首の x（腰から）・持ち上げ・足の形
  const perFrame = g.cycle / GAIT_N;                        // 1 コマで体が進む画素
  if (i < g.contact) {                                      // 接地＝体が進む分だけ後ろへ（滑らない）
    const x = g.spread - i * perFrame;
    const style = i === 0 ? 'heel' : i === g.contact - 1 ? 'toe' : 'flat';
    return { x: Math.round(x), lift: 0, style };
  }
  const k = (i - g.contact + 1) / (GAIT_N - g.contact + 1);   // 振り出し 0→1
  const xs = -g.spread + (2 * g.spread) * (k * k * (3 - 2 * k));
  const lk = g.arm === 'bent' ? 0.2 + 0.8 * k : k;                                     // 走り＝蹴った直後が最も高い（かかとが尻へ）・歩き＝真ん中が最も高い
  return { x: Math.round(xs), lift: Math.round(g.lift * Math.sin(Math.PI * lk)), style: 'air' };
}
// 2 画素幅の線（x0,y0）→（x1,y1）。ch は (k, n)→文字
function thick(G, x0, y0, x1, y1, chAt) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) {
    const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
    stamp(G, x, y, [chAt(k, n, y).repeat(2)]);
  }
}
// 脚＝腰 (hx,hy)→膝→足首。膝は「前へ出す量」で置く（着いた脚＝腰と足首を結ぶ線の上・振る脚＝持ち上げるほど前へ）。足首の上 1 行が靴下の線・足首の行が靴
function drawLeg(G, hx, hy, foot, pants, shoe) {
  const ax = hx + foot.x, ay = 16 - foot.lift;
  const kneeFwd = foot.lift > 0 ? 1 + 0.5 * foot.lift : (ax - hx) / 2 + (foot.style === 'flat' ? 0.5 : 0);   // 振る脚＝持ち上げるほど膝が前へ・着いた脚＝腰と足首を結ぶ線の上（真下なら少し前）
  const kx = hx + kneeFwd, ky = Math.min(hy + 2, ay);
  thick(G, hx, hy, kx, ky, () => pants);                                                   // 太もも
  thick(G, kx, ky, ax, ay, (k, n) => (k === n ? shoe : k === n - 1 ? 'd' : pants));        // すね＝足首の 1 歩手前が靴下の線・足首が靴
  const fy = ay + 1;                                             // 足（地面の行 17。浮いていればその分上）
  if (foot.style === 'heel') { stamp(G, ax, fy, [shoe + shoe]); stamp(G, ax + 2, ay, [shoe]); }        // かかとから着く＝つま先が上がる
  else if (foot.style === 'toe') { stamp(G, ax - 1, ay, [shoe + shoe]); stamp(G, ax + 1, fy, [shoe]); }   // 蹴り出し＝かかとが浮く
  else if (foot.style === 'air') stamp(G, ax, fy, [shoe + shoe]);
  else stamp(G, ax, fy, [shoe + shoe + shoe]);
}
// 手前の腕（肩は列 10・行 6 を基準に、胸のずれ chest と沈み bob を足す）。脚と逆に振る
const GAIT_ARMS = {
  straight: {   // 伸ばして振る（早歩き）
    back: { x: 7, art: ['...f', '..f.', '..f.', '.gmg', '.ccc', '.gmg', 'gmg.', 'mhm.', 'm.m.'] },
    mid: { x: 9, art: ['.f.', '.f.', '.f.', 'gmg', 'ccc', 'gmg', 'gmg', 'mhm', 'm.m'] },
    fore: { x: 10, art: ['f....', '.f...', '.f...', '.gmg.', '.ccc.', '.gmg.', '..gmg', '..mhm', '..m.m'] },
  },
  bent: {       // 肘を曲げて振る（走り）＝前腕は前へ水平・肘が前後 2 画素動く
    back: { x: 7, art: ['...f..', '..f...', '.f....', '.gggg.', 'gcmmmh', '.gggg.'] },
    mid: { x: 9, art: ['.f....', '.f....', '.f....', '.gggg.', 'gcmmmh', '.gggg.'] },
    fore: { x: 10, art: ['f.....', '.f....', '..f...', '..gggg', '.gcmmm', '..gggg'] },
  },
};
function gaitFrame(gait, i) {
  const g = GAITS[gait];
  const near = footOf(g, i), far = footOf(g, (i + GAIT_N / 2) % GAIT_N);
  const onGround = [near, far].filter((f) => f.style !== 'air');
  const hipY = onGround.length ? Math.round(16 - Math.sqrt(Math.max(0, LEG * LEG - Math.max(...onGround.map((f) => f.x * f.x))))) : HIP.y;   // 着いた足が前後にあるほど腰が沈む
  const bob = Math.max(0, hipY - HIP.y);                        // 体の沈み（0 か 1）
  const G = [];
  for (let y = 0; y < 18; y++) G.push('....................'.split(''));
  // 奥の脚（暗い色・腰の 1 画素後ろ）→体→手前の脚→手前の腕
  drawLeg(G, HIP.x - 1, hipY, far, 'q', 'w');
  const [head, chest] = g.lean;
  for (let y = 0; y < 12; y++) {                                 // 体＝SIDE_TOP の行 0〜11 を沈み bob と前傾でずらして写す
    const sh = y < 5 ? head : y < 10 ? chest : 0;
    for (let x = 0; x < 20; x++) { const c = SIDE_TOP[y][x]; if (c !== '.' && x + sh < 20) G[y + bob][x + sh] = c; }
  }
  drawLeg(G, HIP.x, hipY, near, 'p', 'u');
  const a = -near.x / g.spread;                                 // 手前の腕は手前の脚と逆（−1 後ろ〜+1 前）
  const arm = GAIT_ARMS[g.arm][a < -0.34 ? 'back' : a > 0.34 ? 'fore' : 'mid'];
  stamp(G, arm.x + chest, 6 + bob, arm.art);
  return G;
}
export const GAIT_INFO = Object.fromEntries(Object.entries(GAITS).map(([k, g]) => [k, { cycle: g.cycle, chest: g.lean[1], bob: Array.from({ length: GAIT_N }, (_, i) => (gaitFrame(k, i)[0].join('').includes('k') ? 0 : 1)) }]));   // player.gd が写す値（1 周の画素・胸のずれ・コマごとの沈み）
function sideBase() {
  const G = SIDE_TOP.map((r) => r.split(''));
  for (let i = 0; i < 6; i++) G.push('....................'.split(''));
  return G;
}
// legs: stand＝脚がそろう／knee1〜3＝前脚の膝を上げる／step＝前脚を踏み込む／lift＝後ろ脚が浮く
//   kick（横顔のフォロースルー）は下の SIDE_KICK
function sideFrame(legs, withArm) {
  const G = sideBase();
  const back = { stand: [9, 12], knee1: [9, 12], knee2: [9, 12], knee3: [9, 12], step: [9, 12], lift: [8, 11] }[legs];   // 立ち姿は後ろ脚を 1 画素ずらす（脚が 1 本に見えないように）
  const front = { stand: [10, 12], knee1: [11, 11], knee2: [11, 10], knee3: [11, 9], step: [13, 12], lift: [13, 12] }[legs];
  stamp(G, back[0], back[1], SIDE_LEG);
  stamp(G, front[0], front[1], SIDE_LEG);
  if (withArm) stamp(G, SIDE_ARM.x, SIDE_ARM.y, SIDE_ARM.art);
  return G;
}
// ===== 思いっきり投げたあとの絵（2026-10-13 22:10 ユーザー「Shift+6 の旧を基に、オーバースローで思いっきり弾を投げつける描写で」）=====
//   見本動画（今井達也）どおりに段階を積んだ第 2 版（足上げ→踏み出し→着地→離す→蹴り上げ→戻り・48 枚）は「動きや構えが多くて踊りながら投げてるように見える」で不採用（git 5c17bbb に残る）
//   溜め＝旧のまま膝 1〜3（膝の高さが溜めのゲージ）・投げ＝旧の step（踏み込み）→フォロースルーだけ専用の絵：
//   横顔 kick＝上体を 45°倒し、顔は上げて相手を見る、後ろ脚は膝を曲げて後ろに引きずる（つま先は地面から 1 画素浮く）、前膝は曲がる（前脚＝奥の脚は暗い色）
//     （22:44 ユーザー「投げたあとに足を地面と平行にピーンと伸ばすのをやめて」＝腰より高く蹴り上げる版は 55652b6 に残る）
//   正面・背中 follow＝lift（後ろ足が浮く）の脚のまま頭を 2 行下げる＝体ごと前へ突っ込んだあと
const SIDE_KICK = [
  '....................',
  '....................',
  '....................',
  '...............kkkk.',
  '...............kkkm.',
  '...........mmmmkkff.',
  '.............ssmmef.',
  '............ssss....',
  '...........ssss.....',
  '..........psss......',
  '........ppppp.......',
  '.......ppppp........',
  '......ppp...qq......',
  '.....pp......qq.....',
  '.....pp......qq.....',
  '.....dd......dd.....',
  '....uu.......ww.....',
  '.............www....',
];
// ===== 投手の 5 段階（2026-10-17 18:31 ユーザー「貼付資料（コッキング初期→後期→加速期→減速期→フォロースルー）の動作をどうにかして入れられないか」＝横顔の投げの型 3）=====
//   脚は全段「踏み込んだ開脚」stride（前膝を曲げて着地・後ろ脚は伸びる・両足とも地面）＝図のコッキング後期〜減速期の下半身。膝上げ（knee）は使わない
//   胸の反り「ぐっと胸をそり」は体を回さず絵で出す＝頭と胴を上の行ほど後ろへずらす（arch 1〜3 画素＝溜めのゲージ cock1〜3）。足は 1 画素も動かない（回すと前足が浮く）
//   腕（玉を持つ手）は hand.gd が描く＝player.gd の PT_*（腰の前→腰の後ろ→顔の後ろ→頭上→前上で離す→前下→前脚の前）
const STRIDE_LEGS = [
  '.........pp.p.......',
  '........pp..pp......',
  '.......pp....pp.....',
  '......dd.....dd.....',
  '.....uu......uu.....',
  '....uuu......uuu....',
];
function sideStride(arch) {
  const G = sideBase();
  for (let y = 0; y < 12; y++) {
    const s = Math.round(arch * (12 - y) / 12);
    if (s > 0) { const row = G[y].slice(); for (let x = 0; x < 20; x++) G[y][x] = x + s < 20 ? row[x + s] : '.'; }
  }
  for (let i = 0; i < 6; i++) G[12 + i] = STRIDE_LEGS[i].split('');
  return G;
}
export const COCK_SHIFT = [0, 1, 2, 3].map((a) => Math.round(a * (12 - 6) / 12));   // 肩の行（6）の後ろへのずれ（player.gd の shoulder_pos が写す）＝[0,1,1,2]
// 頭（行 0〜4）を drop 行だけ下げて肩に重ねる＝上体を倒す（正面・背中）
// 背中で画面の右の腕を抜いた体（脚は FEET の鍵で選ぶ）＝投げたあとの絵（follow）に使う
function backArmless(legs) {
  const G = backBase(legs);
  clear(G, 14, 9, 16, 14);
  clear(G, 14, 6, 14, 8);
  return G;
}
// 背中・両脚を 1 画素ずつ外へ開いて踏ん張る（上投げのサイド「横薙ぎ」の投げたあと）
function backWide() {
  const G = backArmless('stand');
  clear(G, 6, 12, 13, 17);
  stamp(G, 5, 12, LEFT_LEG);
  stamp(G, 12, 12, RIGHT_LEG);
  return G;
}
// 正面・背中の小走り 4 コマ（2026-10-13 23:08 ユーザー「上下小走りも着手して」）＝横顔の走りと同じく進んだ距離で回す（1 周 24 画素・4 コマ＝歩数は横顔の走りと同じ）
//   0＝左膝上げ／1＝通過（体が 1 画素沈む）／2＝右膝上げ／3＝通過。膝上げ＝その脚が短く見え靴が 2 画素浮く
//   腕の振り＝カメラ側へ振る腕の拳が胸の高さに上がる（正面＝上げた膝と反対の腕が前へ・背中＝上げた膝と同じ側の腕が後ろ＝カメラ側へ）
const RUN_FEET = {
  kneeL: ['.pp..pp.', '.dd..pp.', '.uu..pp.', 'uuu..dd.', '.....uu.', '.....uuu'],
  kneeR: ['.pp..pp.', '.pp..dd.', '.pp..uu.', '.dd..uuu', '.uu.....', 'uuu.....'],
  pass: ['.pp..pp.', '.pp..pp.', '.dd..dd.', '.uu..uu.', 'uuu..uuu'],
};
const RUN_FIST = ['ccc', 'mhm', 'gmg'];   // 胸の高さに上がった拳（前腕を真正面から見た形＝封印の帯・拳・縁）
function fbRun(top, i, isBack) {
  const sink = i % 2 === 1 ? 1 : 0;
  const G = [];
  for (let y = 0; y < sink; y++) G.push('....................'.split(''));
  top.forEach((r) => G.push(r.split('')));
  for (let k = 0; k < 6 - sink; k++) G.push(ARMS_LOW[k].split(''));
  const legs = i === 0 ? RUN_FEET.kneeL : i === 2 ? RUN_FEET.kneeR : RUN_FEET.pass;
  legs.forEach((row, k) => [...row].forEach((c, x) => { if (c !== '.') G[12 + sink + k][6 + x] = c; }));
  if (sink === 0) {
    const kneeLeft = i === 0;
    const raiseLeft = isBack ? kneeLeft : !kneeLeft;
    const x0 = raiseLeft ? 3 : 14;
    clear(G, x0, 9, x0 + 2, 14);                                  // 垂れた前腕と手を消す
    const ux = raiseLeft ? 5 : 14;
    if (G[8][ux] === 'f') G[8][ux] = '.';                         // 二の腕は 2 画素に（肘が上がる）
    stamp(G, x0, 8, RUN_FIST);
  }
  return G;
}
function headDrop(G, drop) {
  const head = G.slice(0, 5).map((r) => r.slice());
  for (let y = 0; y < drop; y++) G[y] = '....................'.split('');
  head.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') G[y + drop][x] = c; }));
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
  for (let i = 0; i < 4; i++) {   // 正面・背中の小走り（進んだ距離で回す 4 コマ）
    out['run' + (i + 1)] = sprite(fbRun(TOP, i, false));
    out['back_run' + (i + 1)] = sprite(fbRun(BACK_TOP, i, true));
  }
  const sr = { idle: sideFrame('stand', true) };
  for (const gait of Object.keys(GAITS)) for (let i = 0; i < GAIT_N; i++) sr[gait + (i + 1)] = gaitFrame(gait, i);   // 横顔の走り run1〜8・早歩き walk1〜8（player.gd が進んだ距離で回す）
  for (const [k, G] of Object.entries(sr)) { out[`side_r_${k}`] = sprite(G); out[`side_l_${k}`] = sprite(mirror(G)); }
  for (const pose of ['stand', 'knee1', 'knee2', 'knee3', 'step', 'lift']) {
    const R = rightPose(pose);
    out[`r_${pose}`] = sprite(R);
    out[`l_${pose}`] = sprite(mirrorLimbs(R, base('stand')));
    const B = backPose(pose);
    out[`back_r_${pose}`] = sprite(B);
    out[`back_l_${pose}`] = sprite(mirrorLimbs(B, backBase('stand')));
  }
  for (const pose of ['stand', 'knee1', 'knee2', 'knee3', 'step', 'lift']) {
    const G = sideFrame(pose, false);   // 横顔で腕を使う姿勢＝手前の腕を抜く（腕は hand.gd が肩から描く）
    out[`side_r_${pose}`] = sprite(G);
    out[`side_l_${pose}`] = sprite(mirror(G));
  }
  out.side_r_kick = sprite(SIDE_KICK.map((r) => r.split('')));   // 思いっきり投げたあと（横顔）
  out.side_r_stride = sprite(sideStride(0));   // 投手の 5 段階（横顔の型 3）＝踏み込んだ開脚・cock1〜3＝胸の反り（溜めのゲージ）
  out.side_l_stride = sprite(mirror(sideStride(0)));
  for (let a = 1; a <= 3; a++) { out[`side_r_cock${a}`] = sprite(sideStride(a)); out[`side_l_cock${a}`] = sprite(mirror(sideStride(a))); }
  out.side_l_kick = sprite(mirror(SIDE_KICK.map((r) => r.split(''))));
  out.r_follow = sprite(headDrop(rightPose('lift'), 2));            // 思いっきり投げたあと（正面・背中）＝後ろ足が浮いて頭が下がる
  out.l_follow = sprite(headDrop(mirrorLimbs(rightPose('lift'), base('stand')), 2));
  out.back_r_follow = sprite(headDrop(backArmless('followR'), 3));   // 背中＝上体を深く倒し（頭が 3 行下がる）投げた側の脚を後ろへ蹴り上げる（23:07 ユーザー「上投げのフォロースルーが変」・貼付の投球 6 段階）
  out.back_l_follow = sprite(headDrop(mirrorLimbs(backArmless('followR'), backBase('stand')), 3));
  // 上投げの型の絵（2026-10-14 ユーザー「上投げは投げた瞬間に頭が後ろにのけぞって見える」＝背中はカメラが後ろ上なので頭を下げると「手前（後ろ）へ倒れる」に読める）
  //   reach＝頭は下げない・投げた側の足だけ蹴り上がる（オーバー改・アンダー）／wide＝両脚を外へ開いて踏ん張る（サイド）
  out.back_r_reach = sprite(backArmless('followR'));
  out.back_l_reach = sprite(mirrorLimbs(backArmless('followR'), backBase('stand')));
  out.back_r_wide = sprite(backWide());
  out.back_l_wide = sprite(mirrorLimbs(backWide(), backBase('stand')));
  return out;
})();

// ブレイズの手（右向き＝指先が右。hand.gd が腕の向きへ回して描く）。拳＝突き／爪＝掴み・投げ
export const BLAZE_HANDS = {
  fist: { palette: HERO_PAL, rows: ['gmm.', 'mmhm', 'mmhm', 'gmm.'] },
  claw: { palette: HERO_PAL, rows: ['gm.m', 'mmh.', 'mmh.', 'gm.m'] },
};

// ===== 段階の絵（ジャム版の変化は 1 回「第一の封印が砕ける」2026-10-15 ユーザー決定）=====
//   候補の設計＝scratchpad/hero-stage-candidates.mjs（B＋藍2・T 字・髪 3 分の 2 で合格）。全部の絵に同じ規則を当てて覚醒版を作る（player.gd が覚醒後に差し替える）
//   ①髪＝髪の画素の 3 分の 2 を漆黒に（一房の側から広げる・目の真上の 1 画素は肌のまま）＝頭のいちばん上の行の左端を起点に k だけを m へ
//   ②蒼が T 字＝帯（ccc）は横一文字のまま・その下 2 行の前腕の芯（gmg）を蒼（gcg）に＝脈が拳の芯 h へつながる
//   ③二の腕に漆黒の筋 1 本（帯の 3 行上の肌）④爪が開く＝拳（mhm）の下の爪（m?m）を外へ 1 画素ずつ（3→5 画素）
const AWAKE_HAIR = {   // 起点からの [行, 列のずれ…]
  front: [[0, [0, 1, 2]], [1, [-1, 0, 1, 2]]],                                    // 8/12
  back: [[0, [1, 2, 3]], [1, [1, 2, 3, 4]], [2, [1, 2, 3, 4]], [3, [1, 2, 3, 4]]],   // 15/22
  side: [[0, [0, 1, 2]], [1, [0, 1, 2, 3]], [2, [0, 1]]],                          // 10/15
};
// ===== 変化後のブレイズ＝肘の角（2026-10-16 00:18 ユーザー「さんざん悩んだが M でいこう」）=====
//   蒼は変化前の帯 1 つのまま（T 字や帯の形・位置・ゆらぎの案は「目につく／動き回るので感知できない」で否決）。
//   動き回る前提で読めるのは輪郭の変化だけ＝肘の体の外側に縁（鋼の殻）の突起 2 画素（上へ）。禍々しさは要素でなく線の少なさで出す
//   候補の経緯（H 肘がとがる／I 手首／J 爪と拳／K／L 肘当て／R 鉤爪／Z＝L＋M＋R）は git の履歴とメモリ project_hero_blaze_redesign に
//   has() の条件は残してある＝AWAKE_STYLES に文字を足せば候補が戻る（I・K は手首・J は爪・L は肘当て・R は鉤爪の手の絵が要る）
export const AWAKE_STYLES = ['M'];
function awaken(rows, kind, style0) {
  const style = style0 === 'Z' ? 'LMR' : style0;   // 合わせ技は文字を並べる＝has() で見る
  const has = (c) => style.includes(c);
  const G = rows.map((r) => r.split(''));
  const top = G.findIndex((r) => r.some((c) => c === 'k' || c === 'm'));
  const ax = G[top].findIndex((c) => c !== '.');
  for (const [dy, dxs] of AWAKE_HAIR[kind]) for (const dx of dxs) if (G[top + dy]?.[ax + dx] === 'k') G[top + dy][ax + dx] = 'm';
  const W = G[0].length;
  const row3 = (y, x) => (G[y] ? G[y].slice(x, x + 3).join('') : '');
  const edge = (y, x) => { if (G[y]?.[x] === '.') G[y][x] = 'g'; };   // 縁（鋼の殻）を 1 画素足す（空いていれば）
  const bands = [];
  for (let y = 0; y < G.length; y++) for (let x = 0; x + 2 < W; x++) if (row3(y, x) === 'ccc') bands.push([y, x]);
  for (const [y, x] of bands) {   // ぶら下げた前腕（帯 ccc の列）
    const out = x + 1 <= 10 ? -1 : 1;   // 体の外側（腕の芯が絵の真ん中より左なら左）
    const ox = out < 0 ? x - 1 : x + 3;
    for (let i = x; i <= x + 2; i++) if (G[y - 3]?.[i] === 'f') { G[y - 3][i] = 'm'; break; }   // 二の腕の筋
    let tips = null;
    for (let d = 3; d <= 4; d++) {   // 爪が開く（3→5 画素）
      if (row3(y + d, x) !== 'mhm') continue;
      const c = G[y + d + 1];
      if (c && c[x] === 'm' && c[x + 2] === 'm') {
        c[x] = '.'; c[x + 2] = '.';
        const xs = [];
        if (c[x - 1] === '.') { c[x - 1] = 'm'; xs.push(x - 1); }
        if (c[x + 3] === '.') { c[x + 3] = 'm'; xs.push(x + 3); }
        tips = { y: y + d + 1, xs };
      }
    }
    if (has('H') || has('K')) edge(y - 2, ox);
    if (has('M')) { edge(y - 2, ox); edge(y - 3, ox); }
    if (has('I') || has('K')) edge(y + 2, ox);
    if (has('L')) edge(y - 1, ox);
    if (has('J') && tips) for (const tx of tips.xs) if (G[tips.y + 1]?.[tx] === '.') G[tips.y + 1][tx] = 'm';
    if (has('R') && tips) for (const tx of tips.xs) {   // 鉤爪＝先が内へ曲がる（奥の脚の靴下 d の上に重なってよい＝腕は脚の手前）
      const ix = tx < x ? x : x + 2, c = G[tips.y + 1];
      if (c && (c[ix] === '.' || c[ix] === 'd')) c[ix] = 'm';
    }
  }
  // 横へ曲げた前腕（横顔の走り）＝帯は縦の 1 画素（上下が縁 g）・芯は横に並ぶ m・肘は帯の手前の縁・拳は芯の先
  for (let y = 1; y + 1 < G.length; y++) for (let x = 2; x + 2 < W; x++) {
    if (G[y][x] !== 'c' || G[y - 1][x] !== 'g' || G[y + 1][x] !== 'g') continue;
    const dir = G[y][x - 1] === 'g' && G[y][x + 1] === 'm' ? 1 : G[y][x + 1] === 'g' && G[y][x - 1] === 'm' ? -1 : 0;
    if (!dir) continue;
    let end = x;
    while (G[y][end + dir] === 'm') end += dir;
    if (has('H') || has('K') || has('M')) edge(y - 2, x - 2 * dir);
    if (has('M')) edge(y - 3, x - 2 * dir);
    if (has('L')) edge(y - 2, x - dir);
    if (has('I') || has('K')) { if (G[y - 2]?.[end] === '.') G[y - 2][end] = 'g'; else edge(y + 2, end); }
    x += 3;
  }
  return G.map((r) => r.join(''));
}
const flipRows = (rows) => rows.map((r) => [...r].reverse().join(''));
// 覚醒版の絵＝{ 漏れ方: { 絵の名: 絵 } }
export const HERO_FRAMES_AWAKE = Object.fromEntries(AWAKE_STYLES.map((st) => [st, Object.fromEntries(Object.entries(HERO_FRAMES).map(([k, sp]) => {
  let rows;
  if (k.startsWith('side_l_')) rows = flipRows(awaken(flipRows(sp.rows), 'side', st));
  else rows = awaken(sp.rows, k.startsWith('side_r_') ? 'side' : k.startsWith('back_') ? 'back' : 'front', st);
  return [k, { palette: HERO_PAL, rows }];
}))]));
// 開いた爪（覚醒後の掴み・投げ）＝3 本の爪が外へ割れる
BLAZE_HANDS.claw_open = { palette: HERO_PAL, rows: ['gm..m', 'mmhm.', 'mmhm.', 'gm..m'] };

