// 蒼神骸華 第二案「開」の姿：月牙が出ていった跡（穴）の形＝openHole
// 読み（最小の変形）：閉じた姿は「月牙が装甲の面にきっちり嵌まっている（穴なし）」で確定した（09-20 15:22 の FB）。
//   その姿から装甲が開いて月牙が六枚とも射出されるのだから、開いた外の板には「月牙が抜けた跡」が残るはず。
//   いまの「開」は SH_HATCH も SH_SEAT も空（build4 が open4 のとき両方 [] にする）＝外の板が無地の黒い面になっていた。
// 作り：①月牙の絵そのものを型にして跡を抜く（moonMask4＝MOONS4[i].rows の非 '.' が跡の中・四近傍に '.' があれば跡の縁）。
//         月牙の格子（112×44・中心 MOON4_C=[25,22]）と座 SH_HATCH_ALL[i] の対応は px = 25 + hx - x, py = 22 + y - hy
//         （shell のループの x は世界の |x|＝座と同じ空間。月牙は外側＝x の大きいほうへ伸びるので hx - x）。
//       ②跡の形＝'seat'（角丸の開口＋第36稿の空の座の軌条と留め具）／'round'（角丸の開口だけ）／'socket'（月牙の形の窪み・底は暗い鋼）／
//         'moon'（月牙の形の闇の穴）／'grid'（月牙の形＋底に機械の横縞）。どの形にも { kind, burn: true } で「灼けた縁」を足せる。省略＝跡なし。
//       ③閉じた姿（open4 = 0）では shHole が null ＝ 1 画素も変わらない。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①跡の型（月牙の絵）を引く道具
rep("let SH_HATCH = SH_HATCH_ALL;",
  `let SH_HATCH = SH_HATCH_ALL;
let SH_HOLE = [], shHole = null, moonHitI = 0;   // 「開」の姿：月牙が出ていった跡（形は gaika2With({ openHole: … })）
const moonMask4 = (i, x, y) => {   // 月牙が嵌まっていた跡＝月牙の絵そのものを型にする（0 跡の外／1 跡の中／2 跡の縁）
  const m = MOONS4[i]; if (!m) return 0;
  const [hx, hy] = SH_HATCH_ALL[i], px = Math.round(MOON4_C[0] + hx - x), py = Math.round(MOON4_C[1] + y - hy);
  const at = (a, b) => (b >= 0 && b < MOON4_H && a >= 0 && a < MOON4_W ? m.rows[b][a] : '.');
  if (at(px, py) === '.') return 0;
  moonHitI = i;
  return at(px + 1, py) === '.' || at(px - 1, py) === '.' || at(px, py + 1) === '.' || at(px, py - 1) === '.' ? 2 : 1;
};
const seatDeco4 = (x, y) => {   // 第36稿の「空の座」（画面左の一番上に描いてあった絵）を、射出ずみの座すべてに。蒼い軌条と金の留め具二つ
  for (const i of SH_HOLE) {
    const [hx, hy] = SH_HATCH_ALL[i], dx = x - hx, dy = y - hy;
    if (Math.abs(dx) <= 1.2 && Math.abs(dy) <= 6) return Math.abs(dx) < 0.5 ? 'N' : 'Q';
    for (const [ax, ay] of [[11, -9], [6, 13]]) { const ex = Math.abs(dx - ax), ey = Math.abs(dy - ay); if (ex <= 2 && ey <= 1.5) return ex <= 1 && ey <= 0.5 ? 'Y' : 'k'; }
  }
  return null;
};`);

// ---- ②shell() の中で跡を引く（座の無地の板 SH_SEAT と同じ場所で計算する）
rep("      let sd = 9; for (const [hx, hy] of SH_SEAT) { const ddx = Math.abs(x - hx) / 20, ddy = Math.abs(y - hy) / 15.5, d = Math.pow(Math.pow(ddx, 8) + Math.pow(ddy, 8), 0.125); if (d < sd) sd = d; }",
  `      let sd = 9; for (const [hx, hy] of SH_SEAT) { const ddx = Math.abs(x - hx) / 20, ddy = Math.abs(y - hy) / 15.5, d = Math.pow(Math.pow(ddx, 8) + Math.pow(ddy, 8), 0.125); if (d < sd) sd = d; }
      let mo = 0; if (shHole && shHole.kind !== 'seat' && shHole.kind !== 'round') for (const hi of SH_HOLE) { const v = moonMask4(hi, x, y); if (v) { mo = v; break; } }`);

// ---- ③跡を描く（装甲に彫られた開口 hd の手前＝同じ深さの絵）
rep("      else if (hd < 0.92) c = 'k';                                                                       // 月牙の座＝装甲に彫られた開口（奥は闇）",
  `      else if (mo) { const hk = shHole.kind, dn = y - SH_HATCH_ALL[moonHitI][1] + 60; c = hk === 'grid' ? (mo === 2 ? 'k' : dn % 4 < 1.6 ? 'm' : 'j') : hk === 'socket' ? (mo === 2 ? 'k' : 'j') : mo === 2 ? (shHole.burn ? (lit ? 'A' : 'R') : lit ? 'r' : 'k') : 'k'; }   // 月牙が出ていった跡（型は月牙の絵。burn＝縁が灼ける）
      else if (hd < 0.92) c = (shHole && shHole.kind === 'seat' && seatDeco4(x, y)) || 'k';               // 月牙の座＝装甲に彫られた開口（奥は闇。'seat' は空の座の軌条と留め具）`);

// ---- ③b 角丸の開口の縁も burn で灼ける（'seat'／'round' 用。閉じた姿は shHole が null なので従来どおり残り火だけ）
rep("      else if (hd < 1.0) c = lit ? 'r' : 'k';                                                          // 開口の縁（炉の残り火だけ）",
  "      else if (hd < 1.0) c = shHole && shHole.burn ? (lit ? 'A' : 'R') : lit ? 'r' : 'k';                // 開口の縁（炉の残り火だけ。burn＝射出したばかりで灼けている）");

// ---- ④build4 の口（'round' は閉じた姿と同じ角丸の開口を「開」でも彫る）
rep("SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !dropS.some((k) => ti[k] === i));",
  "SH_HATCH = open4 ? (shHole && (shHole.kind === 'round' || shHole.kind === 'seat') ? SH_HATCH_ALL.filter((_, i) => shoOn.includes(i)) : []) : stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !dropS.some((k) => ti[k] === i));");
rep("shoCore = o.openCore || null;",
  "shoCore = o.openCore || null; shHole = open4 && o.openHole && o.openHole !== 'none' ? (typeof o.openHole === 'object' ? o.openHole : { kind: o.openHole }) : null; SH_HOLE = shHole ? [0, 1, 2].filter((i) => shoOn.includes(i)) : [];");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_OPENHOLE_OK');
