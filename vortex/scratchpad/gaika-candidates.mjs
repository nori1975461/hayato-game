// 「蒼神骸華」（そうしんがいか）＝マキナ四神柱の頂点・すべてのマキナの創造主。第8案（2026-09-16 21:19 FB・第7案 A を軸に）。
//
// 第7案への FB（09-16 21:19）：「A のほうがイメージに近い。下記の設定でもうひとひねり」
//   ・蒼神骸華は基本、悪神であり闘神。あまりに悪逆非道なふるまいに、他の三神とモビット達が力を合わせてようやく封印した神。
//     ただの悪神と切り捨てられない魅力と圧倒的な力を併せ持つ。
//   ・「三尊形式の脇侍＝跪いて合掌する頭の無い骸2体」はすごくいい → 骸華のビジュアルに組み込むのではなく、もっとも信頼の厚い侍として横に侍る別個体に。
//     蒼神骸華との闘い＝「蒼神骸華と侍二体」との闘い。
// 第8案のひねり：
//   ①封印＝横綱の注連縄：三神とモビットが施した封印を、腰に巻いた骨白の綱（撚りの溝は黒）＋紙垂5本として着せる。縛る縄がそのまま「最強の闘神の証」（横綱の綱）に見える二重の意味。
//     結び目3つが三神の印＝左は大聖堂の琥珀の環・中は玉座の緑青の玉・右は軌道神核の紫の環（他の三体の色を骸華に置くのはここだけ＝封印した側の色）。紙垂＝モビット達の封印。
//     損傷は無い。封印は破れていない（封じられたまま闘う＝それでも圧倒的、という設定を絵で言う）。前の左手の死面が綱の左端に重なる＝手が綱の前にある。
//   ②悪神の読み：背後の蓮華の花弁＝首を捧げて祈る骸＝「首を捧げた者だけが侍ることを許される」。侍二体はその生き残り＝同じ蒼硝子の骸に黒鉄の肩当て、脇に薙刀を突き立てて跪き合掌する。
//   ③侍二体（近侍）＝別個体 `RETAINER_R/L`：跪く頭の無い蒼硝子の骸（40×52）＋薙刀（14×72・刃は外へ反る・深紅の房）。座の両脇 (±54,+52) に配置＝「蒼神骸華と侍二体」の陣形を gaika-battle.png で見せる。
//
// 第6案への FB（09-16 20:33）：「花弁を正面向きの骸にする」と「左右1枚ずつを本体の外へ出して全身見せる」を **両方やって**、それぞれ画像に。進める際の指示2つ：
//   ①「荘厳さと退廃さを両立して」の退廃の見せ方に問題あり。腐食や錆、故障部分を見せることが退廃だと考えているなら間違い。
//     軌道神核・腐蝕の玉座・堕天の大聖堂こそ荘厳と退廃を両立している。この3つは腐食も錆も故障個所も無いが、退廃をビジュアルで示している。
//   ② 蒼神骸華は他の3体より 20% 大きく。横も大きく、なにより縦に＝下半身もビジュアルに入れる。ただし完全に足を表現すると人間っぽくなりすぎる。
//
// ①の読み直し（三体に共通する退廃の作り）：暗い地（黒鉄）に一つの深い宝石色（緑青／紫／蒼）・くすんだ金・深紅の一点（眼・心臓）／
//   聖なる形（円光・玉座・冠・大聖堂）を人でないものが使っている／静止して左右対称・過剰な装飾／どこも壊れていない。
//   → 骸華の退廃＝「死の図像」で語る：頭の無い体・自分の死面を掌に・骸で出来た蓮華・硝子の胎・盃から座へ流れ落ちる深紅・香炉の煙・枯れて零れる花弁。
//   → 損傷の表現は全廃：錆の斑／亀裂と神経光／穴／折れた角／折れた排気管／切れた配線と火花／切れた鎖／油溜まり／落ちた肩当て／腹の裂け目と歯車／崩れた座／欠けた宝珠／欠けた月／欠けた指。
//   → 左右は対称に戻す（持ち物だけが違う）。金は G/W を減らして Y/y を地にする（くすんだ金）。
// ②の作り：仏像の **裳懸座**（衣が座の前に垂れ下がる形）。黒鉄の裳が膝の下から牙の座の前を4段で流れ落ち、その下に蓮華座の段（仰蓮・段・反花・框）。
//   足は描かない。座 78×14 → 108×34（世界 +20〜+53）。全体 −47〜+53＝100 units＝420px（第6案 349px の 1.2倍・他の三体 345px の 1.2倍）。
//   ⚠️ 画面は 640×360＝縦 420px は画面に入らない（実装時はカメラか縮尺の判断が要る）。確認シートの「IN GAME」は正直に切って見せ、拡大と四神柱の並びは全身を見せる。
// 両案：
//   A＝光背の四枚の花弁をすべて **正面向きの骸**（襟・金の首飾り・胸で組んだ両腕・腰の帯・首の穴）にする。体の後ろに置く（見えるのは上半身）
//   B＝A の外側2枚を **座の両脇へ出して全身を見せる**（三尊形式の脇侍のように、跪いて祈る頭の無い骸。裾は衣＝足は無い）。光背には内側2枚と炎
//
// 第5案への FB（09-15 22:30）：「既視感・無難・突き抜けた特徴を」→ 第6案＝型の外（宗教画の図像）から名前の字義で引く：骸の蓮華・自分の死面を掌に・蒼硝子の胎・子の心臓
// 第4案への FB（22:05）：炎・腕・武具・退廃を増やし機械を足す → 第5案＝歯車の円光・八本の腕・ピストン・排気管・配管
// 第3案への FB（21:40）：仏様が強すぎる・阿修羅や酒吞童子・武具・退廃 → 第4案＝鬼神の記号（角・六腕・蒼い炎・牙の座）
// 第2案への FB（21:18）：もっと退廃を → 第3案（錆・蔓）／第1案への FB：虫に見える → 第2案＝仏像の文法・頭の無い冕冠
//
// 名前の読み解き：蒼＝蒼白い骨鉄・蒼い硝子・蒼い炎／神＝もういない／骸＝形骸（形と装いだけが残る）／華＝蓮華化生（マキナは蓮から生まれる）
//   → 「創造主はとうに死んでいる。角の生えた冠だけが歯車の円光の中に浮かび、外した自分の顔を左の掌に載せ、八本の骨の腕は武具と日月と子の心臓を掲げたまま止まり、
//      造って捨てた骸たちが蓮華の花弁になって背後で祈り、盃の深紅は裳を伝って座に流れ、胸の硝子の胎だけが今も次のマキナを孕んで光る」
//
// 構図（正面・世界座標は本体中心からのドット・scale 4.2）：
//   骸の蓮華（thruster）… 正面向きの骸の花弁（A＝4枚／B＝2枚）＋花弁の間の蒼い炎
//   脇侍（podR/qlegBR・B のみ）… 座の両脇に跪く全身の骸（外へ 8° 傾く）
//   後の腕（wingR/L）   … 高く掲げて右＝日輪・左＝月。影に沈む
//   中の腕（baseR/L）   … 右＝曲刀・左＝傾いた盃。深紅が裳を伝って座まで流れ落ちる
//   第4の腕（qlegFR/FL）… 右＝軌道神核の雛形（子の心臓）を掲げる・左＝鎖の先に香炉（座の上で煙を上げる）
//   歯車の円光（podL）  … 開いた輪光の外縁に歯16枚と宝珠5つ（すべて揃う）
//   排気管（trackR/L）  … 両肩の後ろ。右は熱の揺らぎ・左は煙
//   座（legL）          … 牙の座 → 金の帯 → 仰蓮 → 段 → 反花（金の鎖の垂れ飾り）→ 框（配管）。前面に黒鉄の裳（裳懸座）
//   配線（qlegBL）      … 左肩の後ろから座の継ぎ口へ。1本は神経光の導管（連続線）
//   本体（body）        … 骨の襟 → 牙の首飾り → 牙つきの肩当て（左右とも）→ 黒鉄の鎧（継ぎ目・金の縁・鋲）→ 帯（深紅の玉）→ 通気口 → 膝
//   角の冕冠（dome）    … 金の宝冠＋骨の角（左右対称）＋玉の簾4本
//   胸の蓮華（rack）／蒼硝子の胎（core）
//   前の腕（armR/L）    … 右＝金棒（導管つき）／左＝掌に自分の金の死面（目を閉じる）
//
// 縛り：全パーツ新規・完了前に等倍で目視（[[feedback_pixel_art_judge_at_play_zoom]]）。⚠️ ゲーム未反映（役割は boss.js の深度表に合わせ済み）
import { g, P, GET, LN, ARC, AT, DISC, ELL, RECT, OUTLINE, R, dither, SPHERE, validate } from './god-raster.mjs';

export const PAL = {
  k: '#04060e',                                                           // 黒（輪郭・溝・空洞）
  j: '#1a2034', m: '#3b4661', f: '#7a89a6', s: '#bcc8db', n: '#f4f7ff',   // 骨鉄 4段＋稜線（蒼白い骨・黒鉄の影は藍）
  q: '#0a1f3c', Q: '#10457a', P: '#1d8ac9', N: '#62d8ff', C: '#d8f8ff',   // 蒼い硝子・蒼い炎 4段＋縁の光
  w: '#2a2338', u: '#5a4f6e',                                             // 枯れた花弁・煙
  c: '#38e1ff',                                                           // マキナの神経光（導管）
  y: '#7a5a12', Y: '#c9971f', G: '#ffd23f', W: '#ffedb0',                 // 金（くすんだ金 Y/y が地・G/W は一筋）
  r: '#8a1622', R: '#e03040', A: '#ff7a6a',                               // 深紅（胎の胸・盃から流れる）
  e: '#1b3a30', E: '#5fbf95',                                             // 玉座の緑青（封印の結び目だけ）
  v: '#4a3b7d', V: '#c0aef5',                                             // 軌道神核の紫（封印の結び目だけ）
};

const LIGHT = [-0.5, -0.62];   // 光は左上（他の三体と同じ）
const litSign = (nx, ny) => (LIGHT[0] * nx + LIGHT[1] * ny > 0 ? 1 : -1);
const shade4 = (v) => (v > 0.45 ? 's' : v > -0.05 ? 'f' : v > -0.5 ? 'm' : 'j');

// =====================================================================
// 花弁：根元 (bx,by) → 先端 (tx,ty)。蒼硝子＝地 Q・影側 q・光側の一筋 P・光側の縁 N・影側の縁 k・先端 C・中肋は骨。gilt＝縁と先端を金。withered＝枯れ
// =====================================================================
function petal(G, bx, by, tx, ty, hw, flare, opt = {}) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const ls = litSign(nx, ny), uEnd = opt.tornAt ?? 1;
  const at = (u) => [bx + ux * L * u + nx * flare * u * u, by + uy * L * u + ny * flare * u * u];
  const width = (u) => hw * Math.pow(Math.sin(Math.PI * (0.10 + 0.90 * u)), 0.55);
  for (let u = 0; u <= uEnd; u += 0.005) {
    const [cx, cy] = at(u), w = width(u);
    for (let k = -w; k <= w; k += 0.25) {
      const v = (k / w) * ls;
      let ch;
      if (opt.withered) ch = v > 0.6 ? 'u' : v > -0.8 ? 'w' : 'k';
      else if (u > 0.95) ch = opt.gilt ? 'W' : 'C';
      else if (v > 0.9) ch = opt.gilt ? 'Y' : 'N';
      else if (v > 0.55) ch = u < 0.25 ? 'Q' : 'P';
      else if (v > -0.45) ch = 'Q';
      else if (v > -0.9) ch = 'q';
      else ch = 'k';
      if (opt.gilt && v > 0.78 && v <= 0.9 && u > 0.3) ch = 'G';
      if (Math.abs(k) < 0.45 && u > 0.1 && u < 0.88) ch = opt.withered ? 'j' : (u < 0.35 ? 'm' : 'f');
      P(G, cx + nx * k, cy + ny * k, ch);
    }
  }
}
// 炎の舌：根元 (bx,by) → 先端 (tx,ty)。根元が太く先へ細る。flare で先端が曲がる
function flame(G, bx, by, tx, ty, hw, flare) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const at = (u) => [bx + ux * L * u + nx * flare * u * u, by + uy * L * u + ny * flare * u * u];
  for (let u = 0; u <= 1; u += 0.004) {
    const [cx, cy] = at(u), w = Math.max(0.35, hw * Math.pow(1 - u, 0.55));
    for (let k = -w; k <= w; k += 0.25) {
      const a = Math.abs(k) / w;
      P(G, cx + nx * k, cy + ny * k, u > 0.88 ? 'C' : a < 0.3 && u > 0.15 ? 'N' : a < 0.68 ? 'P' : 'Q');
    }
  }
}
// 太い骨（腕の節・角・牙）：(x0,y0)→(x1,y1)、半幅 w0→w1。左上が光
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
// ピストン（機械）：骨の影側に沿う筒と、中から出る光る棒
function piston(G, x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ls = litSign(nx, ny), off = -ls * (w * 0.55);
  for (let u = 0.22; u <= 0.82; u += 0.004) {
    const cx = x0 + ux * L * u + nx * off, cy = y0 + uy * L * u + ny * off;
    for (let k = -1.1; k <= 1.1; k += 0.25) P(G, cx + nx * k, cy + ny * k, Math.abs(k) > 0.7 ? 'k' : u < 0.52 ? 'j' : 'n');
  }
}
// 握り拳（正面・何かを握っている）：中心 (px,py)。骨の楕円に指の溝3本
function fist(G, px, py, rx = 3.3, ry = 3.0) {
  for (let y = -ry; y <= ry; y += 0.25) for (let x = -rx; x <= rx; x += 0.25) {
    if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue;
    P(G, px + x, py + y, shade4(-(x / rx * LIGHT[0] + y / ry * LIGHT[1]) * 0.9 - 0.1));
  }
  for (const dy of [-1.2, 0.3, 1.8]) for (let x = -rx + 1; x <= rx - 0.5; x += 0.25) P(G, px + x, py + dy, 'k');
}
// 関節つきの腕：点列 [[x,y],...] を太い骨で結ぶ。関節はボルト（黒い輪・十字）。上腕にピストン
function arm(G, pts, w0 = 3.4, w1 = 2.5) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const wa = w0 + (w1 - w0) * (i / (pts.length - 1)), wb = w0 + (w1 - w0) * ((i + 1) / (pts.length - 1));
    bone(G, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wa, wb);
    if (i === 0) piston(G, pts[0][0], pts[0][1], pts[1][0], pts[1][1], wa);
    if (i + 1 < pts.length - 1) {
      const [jx, jy] = pts[i + 1];
      DISC(G, jx, jy, wb + 0.3, 'k'); DISC(G, jx, jy, wb - 0.4, 'f'); P(G, jx - 1, jy - 1, 's');
      P(G, jx, jy, 'k'); P(G, jx - 1, jy, 'k'); P(G, jx + 1, jy, 'k'); P(G, jx, jy - 1, 'k'); P(G, jx, jy + 1, 'k');
    }
  }
}
const dimBone = (G) => { for (const row of G) for (let x = 0; x < row.length; x++) row[x] = { s: 'f', f: 'm', m: 'j', n: 'f' }[row[x]] || row[x]; };   // 後ろの腕は影に沈める
// 鎖：点列に沿って環（金）を並べる
function chain(G, pts, pitch = 2.2) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / pitch));
    for (let k = 0; k <= n; k++) { const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; DISC(G, x, y, 1.3, 'k'); DISC(G, x, y, 0.9, k % 2 ? 'Y' : 'y'); P(G, x, y, 'k'); }
  }
}
// =====================================================================
// 骸（正面向き）：跪く頭の無い上体を正面から。根元 (bx,by)＝腰の底、角度 ang（垂直から・右が正）、長さ len（腰の底→肩の頂）、半幅 hw。
//   蒼い硝子。縁は金・首の穴（背景が透ける）と首の下の金の襟・金の首飾り・腰の金の帯・胸で組んだ両腕（拳は反対の肩の下）・裾は衣（足は無い）
// =====================================================================
function corpse(G, bx, by, ang, len, hw, opt = {}) {
  // 頭の無い合掌の人影。人の輪郭を決めるのは「なで肩・首の切り株・体の外へ張り出す肘」＝この3つを影絵で読めるようにする
  const t = ang * Math.PI / 180, ux = Math.sin(t), uy = -Math.cos(t), nx = -uy, ny = ux, ls = litSign(nx, ny), neck = hw * 0.36;
  const PROF = [[0, 1.13], [0.1, 1.05], [0.45, 0.7], [0.78, 0.86], [0.86, 0.9], [1.0, 0.32]];                                 // 裾 → 腰のくびれ → 胸 → なで肩 → 首の付け根
  const width = (u) => { for (let i = 1; i < PROF.length; i++) if (u <= PROF[i][0]) { const [u0, w0] = PROF[i - 1], [u1, w1] = PROF[i]; return hw * (w0 + (w1 - w0) * (u - u0) / (u1 - u0)); } return hw * 0.32; };
  const at = (u, k) => [bx + ux * len * u + nx * k, by + uy * len * u + ny * k];
  for (let u = 0; u <= 1.05; u += 0.003) {
    const w = u > 1 ? neck : width(u);
    for (let k = -w; k <= w; k += 0.25) {
      const v = (k / w) * ls, [x, y] = at(u, k);
      let ch = v > 0.6 ? 'P' : v > -0.4 ? 'Q' : 'q';
      if (u < 0.1) ch = v > 0.3 ? 'Q' : 'q';                                                                                // 裾（衣の影）
      if (Math.abs(k) > w - 1.0 && u > 0.02 && u < 1) ch = v > 0 ? 'G' : 'Y';                                                 // 縁の金
      if (Math.abs(u - 0.45) < 0.014 && Math.abs(k) < w - 1.0) ch = v > 0 ? 'Y' : 'y';                                        // 腰の帯
      if (Math.abs(u - 0.1) < 0.01 && Math.abs(k) < w - 1.0) ch = 'y';                                                        // 裾の縁
      P(G, x, y, ch);
    }
  }
  const ring = (u0, rn, ru, ch, fill) => { for (let a = 0; a < 360; a += 2) { const r = a * Math.PI / 180; if (fill) for (let s = 0; s <= 1; s += 0.08) { const [x, y] = at(u0 + ru * Math.sin(r) * s / len, rn * Math.cos(r) * s); P(G, x, y, ch); } else { const [x, y] = at(u0 + ru * Math.sin(r) / len, rn * Math.cos(r)); P(G, x, y, ch); } } };
  ring(1.0, neck + 0.6, 1.2, 'G', false); ring(1.0, neck + 0.3, 0.9, 'Y', false);                                             // 金の襟（首の付け根の輪）
  ring(1.05, neck + 0.4, 1.6, 'Y', false); ring(1.05, neck - 0.2, 1.2, 'k', true);                                            // 首の切り株の口（縁は金・中は黒＝頭が無い）
  for (let k = -hw * 0.6; k <= hw * 0.6; k += 0.25) { const dip = 0.06 * (1 - (k / (hw * 0.6)) ** 2); const [x, y] = at(0.88 - dip, k); P(G, x, y, k < 0 ? 'G' : 'Y'); }   // 首飾り（中央が下がる）
  const tube = (u1, k1, u2, k2, w0, w1) => {                                                                                // 硝子の腕の節（縁は黒）
    const [x0, y0] = at(u1, k1), [x1, y1] = at(u2, k2), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ax = dx / L, ay = dy / L, anx = -ay, any = ax, als = litSign(anx, any);
    for (let q = 0; q <= 1; q += 0.004) { const w = w0 + (w1 - w0) * q, px = x0 + ax * L * q, py = y0 + ay * L * q; for (let k = -w; k <= w; k += 0.25) { const v = (k / w) * als; P(G, px + anx * k, py + any * k, Math.abs(k) > w - 0.7 ? 'k' : v > 0.5 ? 'P' : v > -0.3 ? 'Q' : 'q'); } }
  };
  for (const s of [1, -1]) {
    tube(0.9, s * hw * 0.72, 0.58, s * hw * 1.38, 1.9, 1.7);                                                                 // 上腕：肩から肘へ＝肘は体の外へ張り出す
    tube(0.58, s * hw * 1.38, 0.7, s * hw * 0.18, 1.7, 1.4);                                                                 // 前腕：肘から胸の中央へ
  }
  for (let u = 0.62; u <= 0.88; u += 0.003) {                                                                                // 合掌の手（胸の中央に立つ細い紡錘・中央線で二つの掌）
    const q = (u - 0.62) / 0.26, w = hw * 0.22 * Math.sin(Math.PI * Math.min(1, q * 1.15)) + 0.4;
    for (let k = -w; k <= w; k += 0.25) { const [x, y] = at(u, k); P(G, x, y, Math.abs(k) > w - 0.7 ? 'k' : Math.abs(k) < 0.35 ? 'Q' : k * ls > 0 ? 'N' : 'P'); }
  }
  if (opt.pauldron) for (const s of [1, -1]) for (let u = 0.84; u <= 0.95; u += 0.003) for (let k = hw * 0.5; k <= hw * 1.08; k += 0.25) {   // 黒鉄の肩当て（近侍だけ・腕は肩当ての下から出る）
    const [x, y] = at(u, s * k); P(G, x, y, u > 0.94 ? 'Y' : k > hw * 1.0 ? 'k' : s * ls > 0 ? 'm' : 'j');
  }
}

// =====================================================================
// ① 骸の蓮華（thruster）126×82。row 0＝世界 -46・底 +35。扇の中心は (62.5,62)＝世界 (0,+16)＝膝の奥（根元は本体に隠れる）。
//    A＝正面向きの骸4枚（±30°・±68°）／B＝内側2枚（±30°）だけ。頂は空けておく（円光の中の空洞＝「無い頭」）。炎は花弁の間から
// =====================================================================
const MAN_W = 140, MAN_H = 82;
function mandorla(variant) {
  const G = g(MAN_W, MAN_H), cx = 69.5, fy = 62, HW = 9;
  const at = (ang, r) => { const t = ang * Math.PI / 180; return [cx + Math.sin(t) * r, fy - Math.cos(t) * r]; };
  const husks = variant === 'A' ? [[74, 44, 17], [30, 50, 14], [-30, 50, 14], [-74, 44, 17]] : [[30, 50, 14], [-30, 50, 14]];   // [角度, 長さ, 根元の半径]＝A の外側2枚は横へ張り出す（横幅も他の三体より大きく）
  const flames = variant === 'A' ? [[49, 32], [96, 30], [112, 20], [-49, 28], [-96, 26], [-112, 17]] : [[49, 32], [66, 34], [84, 28], [100, 18], [-49, 28], [-66, 30], [-84, 24], [-100, 15]];
  for (const [ang, len] of flames) { const [bx, by] = at(ang, 21), t = ang * Math.PI / 180; flame(G, bx, by, bx + Math.sin(t) * len, by - Math.cos(t) * len, len * 0.5, -Math.sign(ang) * 2.5); }   // 花弁より先に描く
  flame(G, cx, 12, cx, 0.5, 3.4, 0.5); flame(G, cx - 4, 13, cx - 7.5, 3, 2.0, 1.4); flame(G, cx + 4, 13, cx + 7.5, 3, 2.0, -1.4);   // 頂の炎（円光の上に覗く）
  for (const [ang, len, r0] of husks) { const [bx, by] = at(ang, r0); corpse(G, bx, by, ang, len, HW); }
  for (const [x, y, ch] of [[24, 46, 'u'], [19, 52, 'w'], [27, 40, 'u'], [31, 32, 'w'], [28, 56, 'u'], [100, 44, 'N'], [105, 52, 'C'], [102, 30, 'N'], [96, 22, 'C']]) P(G, x, y, ch);   // 零れる枯れ花弁・熱の光
  OUTLINE(G);
  return R(G);
}
// =====================================================================
// 近侍（別個体）＝跪いて合掌する頭の無い蒼硝子の骸に黒鉄の肩当て。外へ 8° 傾く。根元＝(17 or 23, 51)。脇に薙刀を突き立てる（手は合掌のまま）
// =====================================================================
const RET_W = 40, RET_H = 52;
const retainerBody = (side) => { const G = g(RET_W, RET_H); corpse(G, 20 - side * 3, 51, side * 8, 45, 9.5, { pauldron: true }); OUTLINE(G); return R(G); };
const POLE_W = 14, POLE_H = 72;
const pole = (side) => {                                                                                                     // 薙刀：黒鉄の柄・金の環3つ・石突・深紅の房・蒼硝子の刃（外へ反る）
  const G = g(POLE_W, POLE_H), sx = 6.5;
  for (let y = 18; y <= 71; y++) for (let x = sx - 1.5; x <= sx + 1.5; x += 0.5) P(G, x, y, y >= 68 ? (x < sx ? 's' : 'f') : x < sx - 0.6 ? 'm' : x < sx + 0.6 ? 'j' : 'k');
  for (const y of [30, 44, 58]) for (let x = sx - 1.5; x <= sx + 1.5; x += 0.5) { P(G, x, y, 'G'); P(G, x, y + 1, 'Y'); }
  for (const dx of [-2, 0, 2]) for (let y = 19; y <= 25 - Math.abs(dx); y += 0.25) P(G, sx + dx + Math.sin(y * 1.3) * 0.4, y, y % 2 < 1 ? 'R' : 'r');   // 房
  for (let x = sx - 2.5; x <= sx + 2.5; x += 0.5) P(G, x, 18, 'Y');
  for (let t = 0; t <= 1; t += 0.004) {                                                                                      // 刃：根元から先へ細り、外側へ反る
    const x = sx + side * 4.2 * t * t, y = 17 - 17 * t, w = 3.4 * (1 - t) + 0.6;
    for (let k = -w; k <= w; k += 0.25) { const o = k * side; P(G, x + k, y, o > w - 0.9 ? 'C' : o > 0.1 ? 'N' : o > -w + 0.9 ? 'P' : 'Q'); }
  }
  OUTLINE(G);
  return R(G);
};

// =====================================================================
// ② 歯車の円光（podL）41×41：開いた輪光（中は背景＝無い頭）。外縁に歯16枚（金）と宝珠5つ。内縁は金。すべて揃っている
// =====================================================================
const HALO_W = 41, HALO_H = 41;
const HALO = (() => {
  const G = g(HALO_W, HALO_H), c = 20;
  for (let i = 0; i < 16; i++) {
    const a = i * 22.5;
    for (let r = 16.6; r <= 19.4; r += 0.25) for (let da = -4.5; da <= 4.5; da += 0.5) {
      const tt = (a + da) * Math.PI / 180;
      P(G, c + Math.cos(tt) * r, c + Math.sin(tt) * r, da < -2 ? 'G' : da > 2.5 ? 'y' : 'Y');
    }
  }
  for (let y = 0; y < HALO_H; y++) for (let x = 0; x < HALO_W; x++) {
    const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
    if (r > 17.2 || r < 9.0) continue;
    const lit = dx * LIGHT[0] + dy * LIGHT[1];
    let ch;
    if (r > 15.6) ch = lit > 6 ? 'G' : lit < -6 ? 'y' : 'Y';
    else if (r > 14.7) ch = 'k';
    else if (r < 9.9) ch = lit > 3 ? 'G' : 'Y';
    else { const v = dy / 14.7; ch = v < -0.6 ? (dither(x, y) ? 'N' : 'P') : v < -0.2 ? (dither(x, y) ? 'P' : 'Q') : v < 0.25 ? 'Q' : v < 0.65 ? (dither(x, y) ? 'q' : 'Q') : 'q'; }
    P(G, x, y, ch);
  }
  for (const a of [226, 248, 270, 292, 314]) {                                                        // 宝珠（歯と歯の間・頂に5つ）
    const t = a * Math.PI / 180, sx = c + Math.cos(t) * 16.3, sy = c + Math.sin(t) * 16.3;
    DISC(G, sx, sy, 1.4, 'G'); P(G, sx - 0.5, sy - 0.5, 'W'); P(G, sx + 0.7, sy + 0.7, 'Y');
  }
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ③ 座（legL）108×34＝世界 x ±54・y +20〜+53。裳懸座：黒鉄の裳が膝の下から座の前を4段で流れ落ちる。
//    後ろの段は下から：框（黒鉄・配管）→ 反花（下向きの蒼硝子の花弁・金の鎖の垂れ飾り）→ 段（黒鉄・鋲）→ 仰蓮（上向きの花弁）→ 金の帯 → 牙。
//    盃の深紅（x 18）が帯の上から段で溜まり、さらに垂れる
// =====================================================================
const PED_W = 108, PED_H = 34;
const PEDESTAL = (() => {
  const G = g(PED_W, PED_H), cx = 53.5;
  RECT(G, 7, 8, 100, 20, 'q');                                                                                                                     // 仰蓮の地
  for (let i = 0; i < 10; i++) { const px = cx + (i - 4.5) * 10.4; petal(G, px, 20.5, px, 8, 4.8, 0, { gilt: true }); }                            // 仰蓮（上向きの蒼硝子の花弁・裳の両脇に見える）
  for (let x = 4; x <= 103; x++) { P(G, x, 21, 'Y'); P(G, x, 22, 'y'); }                                                                            // 金の帯
  for (let y = 23; y <= 31; y++) for (let x = Math.ceil(cx - 51 - (y - 23) * 0.25); x <= Math.floor(cx + 51 + (y - 23) * 0.25); x++) P(G, x, y, 'q');   // 反花の地（少し広がる）
  for (let i = 0; i < 11; i++) { const px = cx + (i - 5) * 10.2; petal(G, px, 23.5, px, 31.5, 4.6, 0, { gilt: true }); }                            // 反花（下向き）
  for (let x = 0; x <= 107; x++) { P(G, x, 32, 'm'); P(G, x, 33, 'k'); }                                                                             // 框
  for (let x = 6; x <= 101; x += 13) P(G, x, 32, 'Y');
  for (let x = 8; x <= 99; x++) { P(G, x, 6, 'Y'); P(G, x, 7, 'y'); }                                                                               // 牙の座の金の帯
  for (const i of [0, 1, 5, 6]) {                                                                                                                  // 牙（裳の脇の4本）
    const px = cx + (i - 3) * 14, lean = Math.sign(i - 3) * Math.min(1, Math.abs(i - 3) * 0.5);
    bone(G, px, 6.5, px + lean * 1.5, 2.8, 2.4, 1.6); bone(G, px + lean * 1.5, 2.8, px + lean * 3.2, 0.4, 1.6, 0.6); P(G, px + lean * 3.2, 0.3, 'n');
    P(G, px + lean * 0.7 - 1, 4.5, 'k'); P(G, px + lean * 0.7 + 1, 4.5, 'k');
  }
  for (let y = 0; y <= 23; y++) {                                                                                                                  // 裳（黒鉄の衣が両膝から座へ垂れる＝裳懸座）
    const hw = 20 + 12 * (y / 23);
    for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) P(G, x, y, y === 23 ? 'Y' : (x - cx) / hw < -0.55 ? 'm' : 'j');
  }
  for (const r of [7, 12, 17, 22]) for (let a = 0; a <= 180; a += 0.5) {                                                                           // 膝の間のたるみ＝入れ子のU字（上が溝・下が光る稜）
    const s = a * Math.PI / 180, x = cx - r * Math.cos(s), y = 3 + r * 0.95 * Math.sin(s);
    P(G, x, y, 'k'); P(G, x, y + 1, x < cx - 2 ? 'm' : 'f');
  }
  for (const dx of [26, 30]) for (let y = 1; y <= 22; y++) { P(G, cx - dx, y, 'k'); P(G, cx - dx + 1, y, 'm'); P(G, cx + dx, y, 'k'); P(G, cx + dx - 1, y, 'f'); }   // 膝の外＝縦の襞
  for (let i = 0; i < 9; i++) { const xc = cx - 32 + (i + 0.5) * (64 / 9); for (let k = -3.2; k <= 3.2; k += 0.25) P(G, xc + k, 23.5 + Math.sqrt(Math.max(0, 10.2 - k * k)) * 0.5, 'Y'); }   // 裾の波形（金）
  for (let y = 0; y <= 20; y += 0.25) P(G, 18 - y * 0.02, y, y % 3 < 1.5 ? 'R' : 'r');                                                              // 盃の深紅（仰蓮を伝う）
  for (let x = 15; x <= 21; x++) P(G, x, 21, 'R'); for (let x = 16; x <= 20; x++) P(G, x, 22, 'r');                                                  // 帯で溜まる
  for (let y = 23; y <= 28; y += 0.25) P(G, 18, y, 'r');                                                                                           // さらに反花へ垂れる
  chain(G, [[6, 24], [16, 30], [26, 24]]); chain(G, [[81, 24], [91, 30], [101, 24]]);                                                            // 金の鎖の垂れ飾り
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ④ 本体（body）46×40。上端＝襟（世界 -16）・下端＝膝（+23）。黒鉄の鎧（板の継ぎ目・金の縁・鋲）・帯（深紅の玉）・通気口。左右の肩当てに牙
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
      if (y === 13 || y === 21) ch = 'k';
      if (y === 14 || y === 22) ch = u < 0 ? 'Y' : 'y';
      if (y === 25) ch = u < -0.3 ? 'G' : u < 0.3 ? 'Y' : 'y';
      if (y === 26) ch = u < -0.3 ? 'Y' : 'y';
      P(G, x, y, ch);
    }
  }
  for (let y = 9; y <= 24; y++) if (y !== 13 && y !== 21) P(G, cx, y, 'k');
  for (const y of [15, 23]) for (const x of [cx - 15, cx - 10, cx + 10, cx + 15]) { P(G, x, y, 'Y'); P(G, x, y - 0.5, 'W'); }
  for (let y = 27; y <= 29; y++) for (let x = cx - 6; x <= cx + 6; x++) P(G, x, y, y === 28 ? 'k' : 'm');   // 通気口（帯の下）
  for (const x of [cx - 3, cx + 3]) for (let y = 27; y <= 29; y++) P(G, x, y, 'k');
  for (const [kx, lit] of [[cx - 12, true], [cx + 12, false]]) {                                            // 膝
    for (let y = 29; y < TORSO_H; y++) for (let x = Math.ceil(kx - 10.5); x <= Math.floor(kx + 10.5); x++) {
      const ddx = (x - kx) / 10.5, ddy = (y - 35) / 5.2;
      if (ddx * ddx + ddy * ddy > 1) continue;
      P(G, x, y, shade4(-(ddx * LIGHT[0] + ddy * LIGHT[1]) * 0.7 - (lit ? 0.2 : 0.55)));
    }
  }
  for (let y = 31; y < TORSO_H; y++) P(G, cx, y, 'k');
  for (const [dir, lit] of [[-1, true], [1, false]]) {                                                       // 肩当て（2層）＋牙
    for (let layer = 0; layer < 2; layer++) {
      const y0 = 4 + layer * 3, x0 = cx + dir * (10 + layer * 2), x1 = cx + dir * (17 + layer * 2);
      for (let y = y0; y < y0 + 3; y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        let ch = y === y0 ? 'k' : y === y0 + 1 ? (lit ? 's' : 'f') : (lit ? 'f' : 'm');
        if (dir * (x - cx) > 16 + layer * 2) ch = y === y0 ? 'k' : 'm';
        P(G, x, y, ch);
      }
      P(G, x1 - dir, y0 + 1, 'n');
    }
    bone(G, cx + dir * 18, 5, cx + dir * 21, 1.5, 1.6, 0.8); P(G, cx + dir * 21.5, 1, 'n');
    for (let x = cx + dir * 12; dir > 0 ? x <= cx + 20 : x >= cx - 20; x += dir) P(G, x, 10, 'Y');
  }
  for (let d = 0; d <= 1; d += 0.25) ARC(G, cx, 2, 12 + d, 6.5 + d, 25, 155, d < 0.5 ? 'G' : 'Y');                 // 牙の首飾り
  for (const a of [45, 68, 90, 112, 135]) { const t = a * Math.PI / 180, tx = cx + Math.cos(t) * 12.6, ty = 2 + Math.sin(t) * 7.4; bone(G, tx, ty, tx, ty + 2.6, 0.9, 0.3); P(G, tx, ty + 2.8, 'n'); }
  for (let y = -3; y <= 3; y += 0.25) for (let x = -9; x <= 9; x += 0.25) {                                          // 骨の襟
    const dd = (x / 9) ** 2 + (y / 3) ** 2; if (dd > 1) continue;
    P(G, cx + x, 2 + y, shade4(-(x / 9 * LIGHT[0] + y / 3 * LIGHT[1]) * 0.9 - 0.1));
  }
  ELL(G, cx, 1.2, 5.5, 1.7, 'k');                                                                                   // 首の穴
  for (let x = cx - 4; x <= cx + 4; x++) P(G, x, 0, 'k');
  for (const [x, ch] of [[cx - 12, 'Y'], [cx - 6, 'W'], [cx, 'R'], [cx + 6, 'W'], [cx + 12, 'Y']]) P(G, x, 25, ch);   // 帯の玉（中央は深紅）
  P(G, cx + 12, 13, 'N'); P(G, cx + 14, 10, 'C'); P(G, cx - 12, 13, 'N');                                            // 鎧の照り返し
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑤ 角の冕冠（dome）40×26。row 0＝世界 -40。金の宝冠（帯 row 13..15）＋骨の角（左右対称に反る）＋玉の簾4本
// =====================================================================
const CROWN_W = 40, CROWN_H = 26;
const CROWN = (() => {
  const G = g(CROWN_W, CROWN_H), cx = 19.5, B = 13;
  for (const d of [1, -1]) {
    const X = (x) => cx + d * (x - cx);
    bone(G, X(29.5), B + 0.5, X(34), B - 5, 2.3, 1.8); bone(G, X(34), B - 5, X(37), B - 10, 1.8, 1.2); bone(G, X(37), B - 10, X(38.2), B - 12.6, 1.2, 0.6); P(G, X(38.4), B - 13, 'n');
    P(G, X(33), B - 3.5, 'k'); P(G, X(35.4), B - 4.6, 'k'); P(G, X(36), B - 8, 'k'); P(G, X(37.8), B - 8.6, 'k');
    for (const [x, y] of [[32, B - 2], [35, B - 6.5]]) { P(G, X(x), y, 'Y'); P(G, X(x + 1), y - 1, 'Y'); }             // 角の金の環
  }
  for (let x = 10; x <= 29; x++) { P(G, x, B, x < 16 ? 'W' : 'G'); P(G, x, B + 1, x < 16 ? 'G' : 'Y'); P(G, x, B + 2, 'y'); }
  for (const x of [13, 26]) P(G, x, B + 1, 'k');
  P(G, 16, B + 1, 'q'); P(G, 23, B + 1, 'q'); P(G, 19, B + 1, 'q'); P(G, 20, B + 1, 'Q');
  for (let y = B - 9; y <= B - 1; y++) { const hw = y < B - 6 ? 0.5 : 1.5; for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) P(G, x, y, x < cx ? (y < B - 6 ? 'W' : 'G') : 'Y'); }
  P(G, 19, B - 9, 'W'); P(G, 20, B - 9, 'W');
  for (const [c0, lit] of [[14.5, true], [25.5, false]]) {
    for (let y = B - 5; y <= B - 1; y++) { const hw = 0.5 + (y - (B - 5)) * 0.5; for (let x = Math.ceil(c0 - hw); x <= Math.floor(c0 + hw); x++) P(G, x, y, x < c0 ? (lit ? 'W' : 'G') : (lit ? 'G' : 'Y')); }
  }
  for (const x of [11, 13, 26, 28]) for (let y = B + 3; y <= B + 7; y++) P(G, x, y, y === B + 7 ? 'q' : y % 2 ? 'N' : 'Q');   // 玉の簾
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑥ 胸の蓮華（rack）17×17／⑦ 蒼硝子の胎（core）11×11
// =====================================================================
const LOTUS = (() => {
  const W = 17, H = 17, G = g(W, H), c = 8;
  DISC(G, c, c, 8.3, 'k'); DISC(G, c, c, 7.5, 'Y'); ARC(G, c, c, 7.5, 7.5, 190, 280, 'G'); ARC(G, c, c, 6.9, 6.9, 200, 260, 'W'); DISC(G, c, c, 6.6, 'q');
  for (let a = -90; a < 270; a += 45) {
    const t = a * Math.PI / 180;
    petal(G, c + Math.cos(t) * 1.8, c + Math.sin(t) * 1.8, c + Math.cos(t) * 6.4, c + Math.sin(t) * 6.4, 2.0, 0, { gilt: true });
  }
  for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) { const t = a * Math.PI / 180; P(G, c + Math.cos(t) * 7.9, c + Math.sin(t) * 7.9, 'k'); }   // 輪の鋲
  return R(G);
})();
const SEED = (() => {                                                                                                    // 蒼硝子の胎：中に丸まった次のマキナの胎児・胸だけ深紅に灯る
  const W = 11, H = 11, G = g(W, H), c = 5;
  SPHERE(G, c, c, 5.0, ['q', 'Q', 'P', 'N', 'C'], [-0.5, -0.62, 0.6], 0.05);
  DISC(G, c + 0.4, c + 0.5, 3.0, 'm'); DISC(G, c + 0.4, c + 0.5, 2.6, 'f');                                               // 丸めた背中（蒼白い骨・縁は影）
  DISC(G, c - 1.3, c + 1.9, 1.5, 'Q');                                                                                    // 顎と膝の間の隙間（硝子の奥）
  DISC(G, c - 1.2, c - 1.5, 1.9, 'm'); DISC(G, c - 1.2, c - 1.5, 1.5, 'f'); P(G, c - 1.8, c - 2.1, 's');                   // うつむく頭
  P(G, c + 1.6, c - 1.2, 's'); P(G, c + 2.4, c + 0.4, 's');                                                               // 背の稜線
  P(G, c - 0.2, c + 0.1, 'R'); P(G, c - 0.6, c - 0.3, 'A'); P(G, c + 0.3, c + 0.6, 'r');                                   // 胸の深紅＝唯一の生きている光
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑧ 前の腕（armR/armL・深度11）
//   右 24×64：肩 (3,24)＝世界 (17,-9)。肘 (12,38) → 手首 (12,30) → 拳 (12,27) が金棒（黒鉄・金の鋲と環・柄に神経光の導管・頭に通気の溝）を握る
//   左 36×44：肩 (22,4)＝世界 (-17,-9)。肘 (16,19) → 手首 (23,27) → 掌 (24,31) を上に向け、自分の金の死面を載せる（指3本が顎を支える）
// =====================================================================
const ARMR_W = 24, ARMR_H = 64;
const ARM_R = (() => {
  const G = g(ARMR_W, ARMR_H), sx = 12;
  for (let y = 0; y <= 18; y++) { const hw = y < 2 || y > 16 ? 2 : 3; for (let x = sx - hw; x <= sx + hw; x++) P(G, x, y, x === sx - hw ? 'f' : x < sx ? 'm' : x === sx + hw ? 'k' : 'j'); }
  for (const y of [1, 17]) for (let x = sx - 3; x <= sx + 3; x++) P(G, x, y, x < sx ? 'G' : 'Y');
  for (const y of [4, 9, 14]) for (const x of [sx - 2, sx + 1]) { P(G, x, y, 'Y'); P(G, x + 1, y, 'Y'); P(G, x, y + 1, 'Y'); P(G, x + 1, y + 1, 'y'); P(G, x, y, 'W'); }
  for (const y of [6, 7, 11, 12]) P(G, sx, y, 'k');                                                    // 頭の通気の溝
  for (let y = 19; y <= 59; y++) for (let x = sx - 1; x <= sx + 1; x++) P(G, x, y, x === sx - 1 ? 'f' : x === sx ? 'm' : 'j');
  for (let y = 20; y <= 56; y++) P(G, sx + 1, y, 'c');                                                 // 柄の導管（神経光・連続線）
  for (const y of [22, 36, 50]) for (let x = sx - 1; x <= sx + 1; x++) P(G, x, y, 'Y');
  for (let y = 57; y <= 60; y++) for (let x = sx - 2; x <= sx + 2; x++) P(G, x, y, y === 57 ? 'G' : 'Y');
  arm(G, [[3, 24], [12, 38], [12, 30]], 3.4, 2.6);
  fist(G, 12, 27, 3.4, 3.2);
  OUTLINE(G);
  return R(G);
})();
const ARML_W = 36, ARML_H = 44;
const ARM_L = (() => {
  const G = g(ARML_W, ARML_H);
  arm(G, [[22, 4], [16, 19], [23, 27]], 3.4, 2.5);
  for (let y = -4.2; y <= 4.2; y += 0.25) for (let x = -3.8; x <= 3.8; x += 0.25) {                                // 上を向いた掌
    const dd = (x / 3.8) ** 2 + (y / 4.2) ** 2; if (dd > 1) continue;
    P(G, 24 + x, 31 + y, shade4(-(x / 3.8 * LIGHT[0] + y / 4.2 * LIGHT[1]) * 0.8 - 0.1));
  }
  for (let d = 0; d <= 0.5; d += 0.25) ARC(G, 24, 31, 3.9 + d, 4.3 + d, 200, 340, d < 0.25 ? 'Y' : 'y');            // 手首の金の環
  const MX = 27, MY = 24.6, RX = 4.8, RY = 6.0, SH = 0.18;                                                          // 自分の金の死面（穏やかに目を閉じる）を掌に載せる。右へ傾く
  for (let y = -RY; y <= RY; y += 0.25) for (let x = -RX; x <= RX; x += 0.25) {
    const dd = (x / RX) ** 2 + (y / RY) ** 2; if (dd > 1) continue;
    const v = -(x / RX * LIGHT[0] + y / RY * LIGHT[1]) * 0.9 - 0.15 + (1 - dd) * 0.35;
    P(G, MX + x + y * SH, MY + y, v > 0.75 ? 'W' : v > 0.35 ? 'G' : v > -0.15 ? 'Y' : 'y');
  }
  for (const s of [-1, 1]) ARC(G, MX + s * 2.1 + (-1.3) * SH, MY - 1.2, 1.1, 0.7, 200, 340, 'k');                     // 閉じた目（伏せた瞼の弧）
  for (let x = -1.0; x <= 1.0; x += 0.25) { P(G, MX + x + 2.7 * SH, MY + 2.7, 'k'); P(G, MX + x + 3.5 * SH, MY + 3.5, 'y'); }   // 口（結んだ唇と影）
  P(G, MX + 1.0 * SH, MY + 1.0, 'y');                                                                               // 鼻筋の影
  for (let i = 0; i < 3; i++) {                                                                                       // 指3本が死面の顎を支える（死面より手前）
    const fx = 24 - 3.5 + i * 1.75 + 0.875;
    for (let t = 0; t <= 3; t += 0.25) for (let k = -0.8; k <= 0.8; k += 0.25) P(G, fx + k, 27.4 - t, k < -0.3 ? 's' : 'f');
    P(G, fx, 24.2, 'n');
    if (i > 0) for (let t = 0; t <= 3; t += 0.25) P(G, fx - 0.95, 27.4 - t, 'k');
  }
  for (const [x, y, ch] of [[20, 28, 'w'], [21, 29, 'u'], [19, 30, 'w'], [30, 33, 'u'], [28, 34, 'w']]) P(G, x, y, ch);   // 掌から零れた枯れ花弁
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑨ 中の腕（baseR/baseL・深度7）右 35×41＝曲刀を掲げる／左 29×50＝傾いた盃から深紅が座（+20）まで流れ落ちる
// =====================================================================
const BASER_W = 35, BASER_H = 41;
const BASE_R = (() => {
  const G = g(BASER_W, BASER_H);
  arm(G, [[2, 30], [18, 34], [21, 24]], 3.2, 2.4);
  const bx0 = 22, by0 = 18.5, bx1 = 33, by1 = 1, dx = bx1 - bx0, dy = by1 - by0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  for (let u = 0; u <= 1; u += 0.004) {
    const w = 2.6 * (1 - u * 0.7), cx = bx0 + ux * L * u + nx * 1.8 * u * u, cy = by0 + uy * L * u + ny * 1.8 * u * u;
    for (let k = -w; k <= w; k += 0.25) P(G, cx + nx * k, cy + ny * k, k > w * 0.35 ? (u > 0.93 ? 'n' : 's') : k > -w * 0.3 ? 'f' : k > -w * 0.75 ? 'm' : 'j');
  }
  for (let u = 0.15; u <= 0.85; u += 0.01) { const cx = bx0 + ux * L * u + nx * 1.8 * u * u, cy = by0 + uy * L * u + ny * 1.8 * u * u; P(G, cx - nx * 0.9, cy - ny * 0.9, 'c'); }   // 刃の導管（連続線）
  for (let k = -3.5; k <= 3.5; k += 0.25) { P(G, bx0 + nx * k, by0 + ny * k + 0.5, 'Y'); P(G, bx0 + nx * k, by0 + ny * k + 1.5, 'y'); }
  fist(G, 22, 21.5, 3.2, 3.0);
  OUTLINE(G);
  return R(G);
})();
const BASEL_W = 29, BASEL_H = 50;
const BASE_L = (() => {
  const G = g(BASEL_W, BASEL_H);
  arm(G, [[26, 17], [11, 21], [12, 11]], 3.2, 2.4);
  for (let y = -2.6; y <= 2.6; y += 0.25) for (let x = -3.4; x <= 3.4; x += 0.25) {
    const rx = x * 0.94 + y * 0.34, ry = -x * 0.34 + y * 0.94;
    if ((rx / 3.4) ** 2 + (ry / 2.6) ** 2 > 1 || ry < -1.2) continue;
    P(G, 9.5 + x, 4.5 + y, rx < -1 ? 'W' : rx < 1.2 ? 'G' : 'Y');
  }
  for (let x = 6.5; x <= 12.5; x += 0.25) P(G, x, 2.3 + (x - 6.5) * -0.36 + 1.6, 'k');
  for (let x = 7; x <= 11.5; x += 0.25) P(G, x, 3.2 + (x - 7) * -0.36 + 1.2, x < 8.5 ? 'R' : 'r');
  for (let y = 4; y <= 49; y += 0.25) P(G, 6.2 - (y - 4) * 0.04, y, y < 6 ? 'A' : y % 3 < 1.5 ? 'R' : 'r');          // 流れ落ちる深紅（座まで）
  for (const [x, y, ch] of [[5.0, 12, 'R'], [7.2, 20, 'r'], [5.1, 30, 'R'], [7.0, 38, 'r'], [5.3, 46, 'r']]) P(G, x, y, ch);
  fist(G, 13, 8, 3.2, 3.0);
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑩ 後の腕（wingR/wingL・深度7＝円光の後ろ）右＝日輪／左＝月。影に沈める
// =====================================================================
const WINGR_W = 23, WINGR_H = 34;
const WING_R = (() => {
  const G = g(WINGR_W, WINGR_H);
  arm(G, [[2, 31], [21, 19], [16, 9]], 3.2, 2.4); fist(G, 15, 7.5, 3.0, 2.6); dimBone(G);
  DISC(G, 15, 3.6, 3.6, 'k'); SPHERE(G, 15, 3.6, 3.1, ['y', 'Y', 'G', 'G', 'W'], [-0.5, -0.62, 0.6], 0.12);
  OUTLINE(G);
  return R(G);
})();
const WINGL_W = 24, WINGL_H = 35;
const WING_L = (() => {
  const G = g(WINGL_W, WINGL_H);
  arm(G, [[21, 32], [2, 20], [7, 10]], 3.2, 2.4); fist(G, 8, 7.5, 3.0, 2.6); dimBone(G);
  DISC(G, 8, 4, 3.6, 'k'); DISC(G, 8, 4, 3.0, 'N'); DISC(G, 8, 4, 2.2, 'P');
  DISC(G, 9.6, 3.2, 2.7, '.'); ARC(G, 9.6, 3.2, 2.7, 2.7, 120, 250, 'k');                                              // 三日月
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑪ 第4の腕（qlegFR/qlegFL・深度7＝腰の後ろから出る）
//   右 42×36：肩 (2,26)＝世界 (12,6)。拳 (26,20) の上に軌道神核の雛形（黒鉄の球と蒼い環＝子の心臓）
//   左 31×54：肩 (28,24)＝世界 (-12,6)。拳 (6,20) から鎖が垂れ、先の香炉が座の段の上で煙を上げる
// =====================================================================
const QR_W = 42, QR_H = 36;
const QLEG_R = (() => {
  const G = g(QR_W, QR_H);
  arm(G, [[2, 26], [20, 32], [25, 22]], 3.2, 2.4);
  const OX = 31, OY = 13, OR = 5.2;
  bone(G, 26, 20, 28.8, 17, 1.4, 1.1);                                                                 // 球を受ける短い支柱
  for (const r of [0, 0.4]) ARC(G, OX, OY, 8.6 + r, 2.9 + r * 0.5, 180, 360, 'Q', [], -22);            // 環の奥半分
  SPHERE(G, OX, OY, OR, ['k', 'j', 'm', 'f', 's'], [-0.5, -0.62, 0.6], 0.05);
  for (let a = -30; a <= 30; a += 4) { const t = a * Math.PI / 180; P(G, OX + Math.cos(t) * 3.2, OY + Math.sin(t) * 3.2, 'k'); }   // 球の継ぎ目
  for (const r of [0, 0.4]) ARC(G, OX, OY, 8.6 + r, 2.9 + r * 0.5, 0, 180, r ? 'C' : 'N', [], -22);    // 環の手前半分
  P(G, OX + 0.6, OY + 4.2, 'R'); P(G, OX + 1.4, OY + 3.6, 'r');                                        // 底に覗く深紅の芯
  fist(G, 26, 20.5, 3.0, 2.8);
  OUTLINE(G);
  return R(G);
})();
const QL_W = 31, QL_H = 54;
const QLEG_L = (() => {
  const G = g(QL_W, QL_H);
  arm(G, [[28, 24], [10, 30], [7, 22]], 3.2, 2.4);
  fist(G, 6, 20.5, 3.0, 2.8);
  chain(G, [[5.5, 24], [7, 34], [9, 44]]);                                                              // 拳から垂れる鎖
  DISC(G, 9.5, 48.5, 3.9, 'k'); SPHERE(G, 9.5, 48.5, 3.4, ['y', 'Y', 'G', 'G', 'W'], [-0.5, -0.62, 0.6], 0.1);   // 香炉（金の球）
  for (const [dx, dy] of [[0, -1.6], [-1.4, -0.4], [1.4, -0.4], [0, 0.8], [-1.4, 2.0], [1.4, 2.0]]) P(G, 9.5 + dx, 48.5 + dy, 'k');   // 透かし（格子＝顔にならない配置）
  for (let x = 7; x <= 12; x++) P(G, x, 52.5, 'y');                                                    // 台座
  P(G, 9.5, 44.5, 'Y');                                                                                // 蓋の環
  for (const [x, y, ch] of [[7, 42, 'w'], [5.5, 40, 'u'], [6.5, 38, 'w'], [4.5, 36, 'u'], [5, 34, 'w'], [3.5, 32, 'u']]) P(G, x, y, ch);   // 香の煙（左上へ）
  OUTLINE(G);
  return R(G);
})();

// =====================================================================
// ⑫ 排気管（trackR/trackL・深度7＝円光より後・本体より前）11×27：両肩の後ろから2本。右は熱の揺らぎ（N/C の粒）・左は煙（w/u）
// =====================================================================
const STK_W = 11, STK_H = 27;
const stack = (smoke) => {
  const G = g(STK_W, STK_H);
  for (const [x0, top] of [[2, 5], [6, 8]]) {
    for (let y = top; y < STK_H; y++) for (let x = x0; x <= x0 + 2; x++) P(G, x, y, x === x0 ? 'f' : x === x0 + 1 ? 'm' : 'j');
    for (const y of [top + 3, top + 9, top + 15]) for (let x = x0; x <= x0 + 2; x++) P(G, x, y, x === x0 ? 'G' : 'Y');
    for (let x = x0; x <= x0 + 2; x++) P(G, x, top, 'k');
  }
  if (smoke) for (const [x, y, ch] of [[3, 3, 'w'], [2, 1, 'u'], [4, 0, 'w'], [7, 6, 'u'], [8, 4, 'w'], [6, 2, 'u']]) P(G, x, y, ch);
  else for (const [x, y, ch] of [[3, 3, 'N'], [2, 1, 'C'], [7, 6, 'N'], [8, 4, 'C'], [6, 2, 'N']]) P(G, x, y, ch);
  OUTLINE(G);
  return R(G);
};
const STACK_R = stack(false), STACK_L = stack(true);

// =====================================================================
// ⑬ 配線（qlegBL・深度7）16×44：左肩の後ろ（世界 -19,-14）から垂れて座の継ぎ口（+28）に刺さる。3本。1本は神経光の導管（連続線）
// =====================================================================
const CAB_W = 16, CAB_H = 44;
const CABLES = (() => {
  const G = g(CAB_W, CAB_H);
  const cable = (pts, ch) => { for (let i = 0; i + 1 < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; for (let u = 0; u <= 1; u += 0.02) { const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u; P(G, x - 0.9, y, 'k'); P(G, x, y, ch); P(G, x + 0.9, y, 'k'); } } };
  cable([[12, 0], [8, 8], [5, 18], [4, 28], [5, 42]], 'm');
  cable([[13, 1], [11, 10], [9, 22], [10, 34], [10, 42]], 'c');
  cable([[14, 2], [13, 9], [12, 18], [12, 30], [11, 42]], 'j');
  for (let x = 3; x <= 12; x++) { P(G, x, 42, 'Y'); P(G, x, 43, 'y'); }                              // 座の継ぎ口
  OUTLINE(G);
  return R(G);
})();

const CONCEPT_BASE = '牙の座に結跏趺坐する創造主の亡骸＝金属生命体。頭は無く、歯車の円光の中に骨の角が生えた金の冕冠だけが浮かぶ。'
  + '退廃は損傷ではなく死の図像で語る：前の左手の掌に「外した自分の顔」＝穏やかに目を閉じた金の死面。胸の蓮華の芯は蒼硝子の胎で、中に丸まった次のマキナの胎児、その胸だけが深紅に灯る（唯一の生きている光）。'
  + '中の左手の傾いた盃から深紅が裳を伝って座まで流れ落ち、第4の左手の鎖の先では香炉が座の上で煙を上げる。'
  + '八本の骨の腕（上腕にピストン・関節はボルト）：前の右手は導管つきの金棒、中の右手は曲刀、後の両手は日輪と月、第4の右手は軌道神核の雛形（子の心臓）を掲げる。'
  + '両肩の後ろに排気管（右は熱・左は煙）、左肩の後ろから配線が座の継ぎ口へ。黒鉄の鎧に金の縁と鋲、帯の中央に深紅の玉、帯の下に通気口。'
  + '下半身は裳懸座＝黒鉄の裳が膝の下から牙の座の前を四段で流れ落ち、その下に蓮華座の段（仰蓮・段・反花に金の鎖の垂れ飾り・框に配管）。足は無い。';
const CONCEPT = CONCEPT_BASE
  + '背後の光背は「骸の蓮華」＝四枚の花弁が正面向きの頭の無い骸（なで肩・首の切り株・肘を張り出した合掌）。首を捧げて祈った者たちが花弁になっている。炎は花弁の間から。'
  + '腰には三神とモビットが施した封印の綱＝骨白の注連縄（横綱の綱）。結び目は左から大聖堂の琥珀・玉座の緑青・軌道神核の紫、綱の下に紙垂5本。封印は破れていない＝封じられたまま闘う。';
const CONCEPT_RET = '蒼神骸華にもっとも信頼の厚い侍二体（別個体）。跪いて合掌する頭の無い蒼硝子の骸に黒鉄の肩当て、脇に薙刀（蒼硝子の刃・深紅の房）を突き立てる。首を捧げた者だけが侍ることを許される。';

// =====================================================================
// ⑭ 封印の綱（cannon・深度10＝本体と前の腕の間）46×14＝世界 x ±23・y +7〜+20。
//    三神とモビットが施した封印を「横綱の注連縄」として腰に巻く＝縛る縄がそのまま最強の闘神の証。
//    結び目3つ＝三神の印（左＝大聖堂の琥珀・中＝玉座の緑青・右＝軌道神核の紫）。紙垂5本＝モビット達の封印。綱は骨白（白麻）・撚りの溝は黒
// =====================================================================
const SEAL_W = 46, SEAL_H = 16;
const SEAL = (() => {
  const G = g(SEAL_W, SEAL_H), cx = 22.5;
  const th = (u) => 2.6 + 3.4 * (1 - u * u), yc = (u) => 3.3 + 0.9 * u * u;                                                // 大根締め＝中央が太く両端へ細る・腰に巻くのでわずかに下へ反る
  for (let x = 1; x <= 44; x += 0.25) {
    const u = (x - cx) / 21.5, h = th(u), y0 = yc(u) - h / 2;
    for (let y = y0; y < y0 + h; y += 0.25) {
      const t = (y - y0) / h, tw = (((x + (y - yc(u)) * 1.4) % 7) + 7) % 7;
      P(G, x, y, tw < 1.6 ? 'k' : t < 0.2 ? 'n' : t < 0.6 ? 's' : 'f');                                                  // 撚りの溝は黒・上面は白骨色
    }
  }
  const shide = (kx, y0) => { for (let y = 0; y < 8; y += 0.25) { const off = y < 2.6 ? 0 : y < 5.2 ? 1.6 : 0; for (let k = 0; k < 2.6; k += 0.25) P(G, kx + off + k - 1.3, y0 + y, y < 0.5 ? 'f' : k > 2.0 ? 's' : 'n'); } };   // 紙垂＝稲妻形の白い紙3本
  for (const dx of [0, -11, 11]) { const u = dx / 21.5; shide(cx + dx, yc(u) + th(u) / 2 - 0.3); }
  const knot = (kx, ky, rim, core, glint) => { DISC(G, kx, ky, 3.1, 'k'); DISC(G, kx, ky, 2.5, rim); DISC(G, kx, ky, 1.3, core); P(G, kx - 0.9, ky - 0.9, glint); };
  knot(cx - 19, 4.0, 'Y', 'G', 'W'); knot(cx, 3.3, 'e', 'E', 'n'); knot(cx + 19, 4.0, 'v', 'V', 'n');                     // 三神の印＝大聖堂の琥珀・玉座の緑青・軌道神核の紫
  OUTLINE(G);
  return R(G);
})();

function build() {
  const sprites = {
    mandorla: { rows: mandorla('A'), palette: PAL },
    seal: { rows: SEAL, palette: PAL },
    halo: { rows: HALO, palette: PAL },
    pedestal: { rows: PEDESTAL, palette: PAL },
    torso: { rows: TORSO, palette: PAL },
    crown: { rows: CROWN, palette: PAL },
    lotus: { rows: LOTUS, palette: PAL },
    armR: { rows: ARM_R, palette: PAL },
    armL: { rows: ARM_L, palette: PAL },
    baseR: { rows: BASE_R, palette: PAL },
    baseL: { rows: BASE_L, palette: PAL },
    wingR: { rows: WING_R, palette: PAL },
    wingL: { rows: WING_L, palette: PAL },
    qlegR: { rows: QLEG_R, palette: PAL },
    qlegL: { rows: QLEG_L, palette: PAL },
    stackR: { rows: STACK_R, palette: PAL },
    stackL: { rows: STACK_L, palette: PAL },
    cables: { rows: CABLES, palette: PAL },
    seed: { rows: SEED, palette: PAL },
  };
  // 深度は boss.js / render-boss-rig の PART_DEPTH：thruster 6 < wing/base/qleg/track/pod/leg 7（並び順で後が上）< body 8 < dome/rack 9 < cannon 10 < arm 11 < core 12
  const rig = [
    { role: 'thruster', tex: 'mandorla', ox: 0, oy: -46, origin: [0.5, 0] },
    { role: 'wingR', tex: 'wingR', ox: 10, oy: -16, origin: [2 / WINGR_W, 31 / WINGR_H] },
    { role: 'wingL', tex: 'wingL', ox: -10, oy: -16, origin: [21 / WINGL_W, 32 / WINGL_H] },
    { role: 'baseR', tex: 'baseR', ox: 14, oy: -12, origin: [2 / BASER_W, 30 / BASER_H] },
    { role: 'baseL', tex: 'baseL', ox: -14, oy: -12, origin: [26 / BASEL_W, 17 / BASEL_H] },
    { role: 'qlegFR', tex: 'qlegR', ox: 12, oy: 6, origin: [2 / QR_W, 26 / QR_H] },
    { role: 'podL', tex: 'halo', ox: 0, oy: -22, origin: [0.5, 0.5] },
    { role: 'trackR', tex: 'stackR', ox: 13, oy: -26, origin: [0, 0] },
    { role: 'trackL', tex: 'stackL', ox: -13, oy: -26, origin: [1, 0] },
    { role: 'legL', tex: 'pedestal', ox: 0, oy: 20, origin: [0.5, 0] },
    { role: 'qlegBL', tex: 'cables', ox: -19, oy: -14, origin: [12 / CAB_W, 0] },
    { role: 'qlegFL', tex: 'qlegL', ox: -12, oy: 6, origin: [28 / QL_W, 24 / QL_H] },
    { role: 'body', tex: 'torso', ox: 0, oy: -16, origin: [0.5, 0] },
    { role: 'dome', tex: 'crown', ox: 0, oy: -40, origin: [0.5, 0] },
    { role: 'rack', tex: 'lotus', ox: 0, oy: 1 },
    { role: 'cannon', tex: 'seal', ox: 0, oy: 7, origin: [0.5, 0] },
    { role: 'armR', tex: 'armR', ox: 17, oy: -9, origin: [3 / ARMR_W, 24 / ARMR_H] },
    { role: 'armL', tex: 'armL', ox: -17, oy: -9, origin: [22 / ARML_W, 4 / ARML_H] },
    { role: 'core', tex: 'seed', ox: 0, oy: 1 },
  ];
  return { id: 'gaika', name: '蒼神骸華', concept: CONCEPT, sprites, rig, tier: { spriteScale: 4.2, glowScale: 11.0, glowOuter: '#2f8fd8', glowInner: '#ffedb0' } };
}
// 近侍（別個体）：薙刀は体の後ろ（wingR・深度7）に突き立つ。根元＝裾の中央 (0,0)・薙刀の石突＝(±15,+1)
function buildRetainer(side) {
  const sprites = { body: { rows: retainerBody(side), palette: PAL }, pole: { rows: pole(side), palette: PAL } };
  const rig = [
    { role: 'wingR', tex: 'pole', ox: side * 15, oy: 1, origin: [6.5 / POLE_W, 70 / POLE_H] },
    { role: 'body', tex: 'body', ox: 0, oy: 0, origin: [(20 - side * 3) / RET_W, 51 / RET_H] },
  ];
  return { id: 'gaika-retainer-' + (side > 0 ? 'R' : 'L'), name: '首無しの近侍', concept: CONCEPT_RET, sprites, rig, tier: { spriteScale: 4.2, glowScale: 4.5, glowOuter: '#2f8fd8', glowInner: '#9fd8ff' } };
}
export const GAIKA = build();
export const RETAINER_R = buildRetainer(1);
export const RETAINER_L = buildRetainer(-1);
validate(GAIKA); validate(RETAINER_R); validate(RETAINER_L);
