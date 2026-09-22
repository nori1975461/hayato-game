// 蒼神骸華 第二案：⭐2026-09-22 のご決定「跡の全体像は『３．窪み＋金具』で」を「開」の既定へ入れる
//   ＝月牙が出ていった跡は 月牙の形の窪み（底は暗い鋼）＋ 第36稿の空の座（蒼い軌条と金の留め具二つ）。灼けた縁（私の推し）は不採用。
//   GAIKA2_FINAL（最終形態の既定）だけが変わる。ふだんの姿と鍵が入った姿は open していないので 1 画素も変わらない。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' } };",
  "dormantX: { kind: 'umbra', r: 215, inner: true, burn: 'R' }, openHole: { kind: 'socket', seat: true } };   // 09-22 決定：月牙が出ていった跡＝月牙の形の窪み＋座の軌条と金の留め具（候補 89）");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_DEF53_HOLE_OK');
