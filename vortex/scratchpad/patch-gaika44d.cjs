// 第44稿の確定値を既定にする。node patch-gaika44d.cjs
//   決定＝胸の半幅 24（第42稿 27.6 → 第43稿 26.2 → 24＝−13%）／脇の線は二段の直線（折れ y 4・張り出し 2.5）／腕のつかない下の関節の円盤は外す／裾の V の先端 y 36.5
//   ドム版＝スカート・アーマーの上縁を胸 +5.2（腹からの張り出しは第43稿と同じ 6.6）・裾 y 29.5／ザク版＝管の膨らみを胸の縮みの 1.5 倍だけ内へ
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("const CH4_DEF = 24.6, CH4_V43 = 26.2;", "const CH4_DEF = 24, CH4_V43 = 26.2;");
rep("  const FP = opt.fp ?? 1, DISC2 = opt.disc2 ?? 'full';", "  const FP = opt.fp ?? 1, DISC2 = opt.disc2 ?? 'none';");
rep("TIP_Y = opt.tip ?? 37.5, BASE_W = 36.6;", "TIP_Y = opt.tip ?? 36.5, BASE_W = 36.6;");
rep("  const KN = opt.knee;   //", "  const KN = opt.knee === undefined ? [4, 2.5] : opt.knee;   //");
rep("const RIM_Y = 10, RIM_W = CH4 + 5.8, HEM_Y = 30.5, APEX_Y = 17.5,", "const RIM_Y = 10, RIM_W = CH4 + 5.2, HEM_Y = 29.5, APEX_Y = 17,");
rep("nh = (y) => (y - APEX_Y) * (8 / 13);", "nh = (y) => (y - APEX_Y) * (8 / 12.5);");
rep("TIP_Y = 37.5, BASE_W = 36.6, R0 = 4.0, dX = CH4 - CH4_V43;", "TIP_Y = 36.5, BASE_W = 36.6, R0 = 4.0, dX = CH4 - CH4_V43;");
rep("cx = s * (a * a * (20.6 + dX) + 2 * a * t * (32.2 + dX) + t * t * (25.4 + dX * 0.5)),", "cx = s * (a * a * (20.6 + dX) + 2 * a * t * (32.2 + dX * 1.5) + t * t * (25.4 + dX * 0.5)),");
rep("        const tx = s * (2 * a * 11.6 + 2 * t * (-6.8 - dX * 0.5)),", "        const tx = s * (2 * a * (11.6 + dX * 0.5) + 2 * t * (-6.8 - dX)),");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH44D_OK');
