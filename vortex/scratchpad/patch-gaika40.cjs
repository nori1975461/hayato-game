// 第40稿のパッチ（一度だけ当てる）。node patch-gaika40.cjs
//   FB「腰が女性のようにくびれている・ビジュアルも色も違和感・アニメロボット感がここに残っている」
//   原因（実測）＝胸の半幅 27.6 → 腹が 12.7 まで曲線で絞られ（46%）→ 最も細い所に金の帯 → 腰が 35 へ開く＝主役機の胴の三分割（胸／腹／ベルトと腰アーマー）そのもの
//   直し＝腹の逆台形・金の帯・開く腰を全廃。胸の下は短く太い旋回基部（半幅 21＝胸の 76%・高さ 8・影の中に縦の支柱）だけを見せ、
//         下半身の側から立ち上がる受け座（平らな棚 → 外へ倒れる壁 → 内へ折れる面）に胴を沈める。輪郭は曲線で絞らず段差で切る。受け座は蒼の漆 b＝肩の装甲と同じ材
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const a = src.indexOf("  for (let y = -40; y <= 38; y += 0.25) {\n    const w = y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : y < -11 ? 27.6");
const endMark = "      P(G, X(x), Y(y), c);\n    }\n  }\n";
const b = src.indexOf(endMark, a);
if (a < 0 || b < 0 || b - a > 2600 || src.indexOf("y < -11 ? 27.6", a + 60) >= 0 && src.indexOf("y < -11 ? 27.6", a + 60) < b - 2000) throw new Error('torso loop');
const body = [
  "  // 第40稿：FB「腰が女性のようにくびれている・アニメロボット感が残る」＝腹の逆台形・最も細い所の金の帯・開く腰（主役機の胴の三分割）を全廃",
  "  //   胸の下は短く太い旋回基部（半幅 21＝胸の 76%）だけを見せ、下半身から立ち上がる受け座（棚→外へ倒れる壁→内へ折れる面）に胴を沈める。輪郭は曲線でなく段差で切る",
  "  const seatW = (y) => (y < 22 ? 29.5 + (y - 5) * 0.34 : y < 26 ? 35.5 : 35.5 - (y - 26) * 0.85);",
  "  for (let y = -40; y <= 38; y += 0.25) {",
  "    const w = y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : y < -8 ? 27.6 : y < -3 ? 27.6 - (y + 8) * 0.8 : y < 5 ? 21 : seatW(y);",
  "    for (let x = -w; x <= w; x += 0.25) {",
  "      const lx = (x + w) / (2 * w);",
  "      let c;",
  "      if (y < -33) c = lx < 0.3 ? 'm' : 'j';",
  "      else if (y < -3) c = y > -4.6 ? 'R' : Math.abs(Math.abs(x) - 16) < 0.5 ? 'k' : Math.abs(x) > 17.5 && Math.abs(x) < 24.5 && [-25, -22, -19].some((vy) => Math.abs(y - vy) < 0.55) ? 'k' : lx < 0.05 ? 'm' : lx < 0.44 ? 'j' : 'k';                   // 紺の胸（分割線・吸気の溝・下の縁に深紅）",
  "      else if (y < 5) c = y < -1.2 ? 'k' : [-15, -7.5, 7.5, 15].some((vx) => Math.abs(x - vx) < 1.3) ? (x - Math.round(x / 7.5) * 7.5 < -0.3 ? 'm' : 'j') : 'k';   // 旋回基部＝胸の影に沈む黒。縦の支柱四本だけ（横の節は腹筋に見える）",
  "      else if (y < 6.3) c = lx < 0.5 ? 'f' : 'm';   // 受け座の棚の縁（上から光を受ける鋼の一筋＝黒い基部と明度で分ける）",
  "      else if (Math.abs(x) > w - 1.2) c = 'k';",
  "      else if (Math.abs(x) < 0.6) c = y < 22 && x < 0 ? 'f' : 'k';   // 中央の稜＝逆さ扇の中央の刃へ続く",
  "      else if (y >= 22 && y < 23) c = x < 0 ? 'm' : 'j';   // 壁が内へ折れる稜",
  "      else if (y > 36.4) c = 'k';",
  "      else c = y < 22 ? (x < 0 ? 'b' : 'q') : (x < 0 ? 'q' : 'k');   // 蒼の漆＝肩の装甲と同じ材。下の面は下を向くので一段暗い",
  "      P(G, X(x), Y(y), c);",
  "    }",
  "  }",
  ""].join('\n');
src = src.slice(0, a) + body + src.slice(b + endMark.length);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH40_OK');
