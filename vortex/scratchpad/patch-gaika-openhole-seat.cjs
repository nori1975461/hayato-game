// 蒼神骸華 第二案「開」の姿：月牙の形の跡にも「座の軌条と金の留め具」を残せるようにする（openHole の seat: true）
// 検品でわかったこと：角丸の開口（'seat'／'round'）は、月牙が角丸の穴に収まっていた頃（第36稿）の形。
//   いまの閉じた姿は「月牙が装甲の面にきっちり嵌まっていて穴はない」（09-20 15:17 のご指示）なので、
//   抜けた跡は月牙の形であるべきで、角丸の開口は設計と食い違う。
//   ただし「空の座＝軌条と留め具だけが残る」という第36稿の考えは機能美として残したい。
// 作り：{ kind: 'moon'|'socket'|'grid', seat: true } で、月牙の形の跡に軌条と金の留め具を重ねる。
//   軌条は座の中心を縦に通る（＝三日月の欠けた側＝跡の外にも出る）＝月牙を送り出す軌条が装甲に彫ってある、と読める。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("      let mo = 0; if (shHole && shHole.kind !== 'seat' && shHole.kind !== 'round') for (const hi of SH_HOLE) { const v = moonMask4(hi, x, y); if (v) { mo = v; break; } }",
  "      let mo = 0, msc = null; if (shHole && shHole.kind !== 'seat' && shHole.kind !== 'round') { for (const hi of SH_HOLE) { const v = moonMask4(hi, x, y); if (v) { mo = v; break; } } if (shHole.seat) msc = seatDeco4(x, y); }");

rep("      else if (mo) { const hk = shHole.kind,",
  `      else if (msc) c = msc;                                                                             // 座の軌条と金の留め具（月牙の形の跡にも残す）
      else if (mo) { const hk = shHole.kind,`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_OPENHOLE_SEAT_OK');
