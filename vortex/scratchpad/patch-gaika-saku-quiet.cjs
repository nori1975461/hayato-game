// FB（2026-09-20 18:41）「朔の座（眠る月）というアイデアはいい。だが、残り火なしの朔の座でも、まだすっきりさが足りない。朔の座のビジュアルを変更して。月牙よりうるささがなく、よりすっきりしたビジュアルに」
// 読み：三枚目の座の「中身の絵」だけを差し替える。座の位置・ほかの四枚・輪郭は 1 画素も動かさない。
// 原因：'dark'／'ember' は月牙の絵の色を替えただけ＝二重の三日月・背の杭・留め金二つ・円い鋲・黒い輪郭が全部残る（灯は消えたが形の数は減っていない）。
// 作り：{ dormantX: 'sliver' | 'sliverEmber' | 'sliverEmberBold'（SAKU4 の名前）か { c, dd, rc, thr } の仕様 } のとき、moonX を「繊月（せんげつ）の象嵌」にする
//   ＝主の月牙と同じ円・同じ向きの、ごく細い月を一色で装甲の面に埋める（杭・留め金・鋲・奥の刃・黒い輪郭は無し）。
//   地は無地の版と同じ（その段の炉の光を消す・座の板は置かない。板を置いても稜線の途切れは腕の陰で見えず同じ絵になるのを確かめた）。
//   「開」の姿には効かない（六枚すべてが目覚める）。'dark'／'ember' は従来どおり。既定は不変。
// 試して落としたもの：金 'y'／明るい鋼 'f'＝灯っている月に見える・黒 'k'＝傷や穴に読める・地球照（円の面）＝等倍で丸い穴に読める・主の月牙と同じ形の面＝鋼の繊月とほぼ同じ絵
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("const MOONS4 = [{ c: [-48, -84],",
  "// 朔の座の絵（第二版）：繊月の象嵌。c＝月の色・dd／rc＝欠けの円のずれと半径（厚みの最大＝r−rc+dd）・thr＝画素を塗る被覆率\n" +
  "const SAKU4 = { sliver: { c: 'm' }, sliverEmber: { c: 'r' }, sliverEmberBold: { c: 'r', dd: 3.8, rc: 12.5 } };\n" +
  "const sakuSeal4 = ({ c = 'm', dd = 3.0, rc = 12.7, thr = 0.4 }) => {\n" +
  "  const G = g(MOON4_W, MOON4_H), [cx, cy] = MOON4_C, r = 11.5 * MOON4_K, a = Math.atan2(-2.5, 5.5), ox = Math.cos(a) * dd, oy = Math.sin(a) * dd;   // 円と欠けの向きは灯る月牙の主の刃と同じ\n" +
  "  for (let y = 0; y < MOON4_H; y++) for (let x = 0; x < MOON4_W; x++) {\n" +
  "    let n = 0;\n" +
  "    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const px = x - 0.375 + i * 0.25, py = y - 0.375 + j * 0.25; if (Math.hypot(px - cx, py - cy) <= r && Math.hypot(px - cx - ox, py - cy - oy) >= rc) n++; }\n" +
  "    if (n / 16 >= thr) G[y][x] = c;\n" +
  "  }\n" +
  "  return R(G);   // 輪郭の黒は付けない＝面に埋まった象嵌\n" +
  "};\n" +
  "const MOONS4 = [{ c: [-48, -84],");
rep("  { const drop = o.dropMoons || [], ti = { moonT: 0, moonM: 1, moonX: 2 }; shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i)); shBandOff = !open4 && drop.includes('moonX') && !o.keepBand2 ? 2 : 0; SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); SH_SEAT = stowed4 && !open4 ? SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)) : []; }",
  "  const saku4 = !open4 && o.dormantX ? (typeof o.dormantX === 'object' ? o.dormantX : SAKU4[o.dormantX]) || null : null;   // 朔の座の絵（第二版）。'dark'／'ember' は null＝従来どおり月牙の色替え\n" +
  "  { const drop = o.dropMoons || [], ti = { moonT: 0, moonM: 1, moonX: 2 }, dropS = saku4 ? [...drop, 'moonX'] : drop; shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i)); shBandOff = !open4 && dropS.includes('moonX') && !o.keepBand2 ? 2 : 0; SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !dropS.some((k) => ti[k] === i)); SH_SEAT = stowed4 && !open4 ? SH_HATCH_ALL.filter((_, i) => !dropS.some((k) => ti[k] === i)) : []; }");
rep("moonX: P7(o.dormantX ? dormant4(MOONS4[2].rows, o.dormantX) : MOONS4[2].rows),",
  "moonX: P7(saku4 ? sakuSeal4(saku4) : o.dormantX ? dormant4(MOONS4[2].rows, o.dormantX) : MOONS4[2].rows),");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('SAKU_QUIET_PATCH_OK');
