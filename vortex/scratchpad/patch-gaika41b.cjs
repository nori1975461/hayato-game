// 第41稿の描き直し（1回だけ）。node patch-gaika41b.cjs
//   1回目＝輪郭は良いが ①右半分が真っ黒（44% で j/k を割っていた）で面が潰れ、鉄の胴でなく黒い布に見えた ②裾に板の厚みが無い
//   直し＝①面を三つに割る（左の翼 j・中央の扉二枚 j・右の翼 k）＝樽の丸みを明度で出す ②裾に平行な面取りの一筋 ③V の先端＝扇の要に金の鋲ひとつ（輪にしない＝目になる）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 60)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("      else c = x + w < 2.8 ? 'm' : w - x < 1.4 ? 'j' : x < -0.12 * fw ? 'j' : 'k';",
  "      else if (style !== 'slab' && x < sx && hemD(x, y) >= 3 && hemD(x, y) < 4) c = 'k';\n      else c = x + w < 2.8 ? 'm' : w - x < 1.4 ? 'j' : x < sx ? 'j' : 'k';");
rep("  const flank = (y) => (style === 'slab' ? 27.6 : 27.6 + Math.max(0, y - FL0) * K);",
  "  const flank = (y) => (style === 'slab' ? 27.6 : 27.6 + Math.max(0, y - FL0) * K);\n  const hemD = (x, y) => TIP_Y - Math.abs(x) * (TIP_Y - BASE_Y) / BASE_W - y;   // 裾（浅い V）までの縦の距離");
rep("  for (let y = -6; y <= (style === 'slab' ? 36 : TIP_Y - 4); y += 0.25)", "  for (let y = -6; y <= (style === 'slab' ? 36 : TIP_Y - 10); y += 0.25)");
rep("  OUTLINE(G);\n  return R(G);\n};\nconst TORSO4 = torso4();",
  "  // 第41稿：扇の要＝V の先端に金の鋲ひとつ（菱形の無垢。輪と芯にすると目になる）\n  if (style !== 'slab') for (let dy = -3.2; dy <= 3.2; dy += 0.25) for (let dx = -3.2; dx <= 3.2; dx += 0.25) { const d = Math.abs(dx) + Math.abs(dy); if (d <= 3.2) P(G, X(dx), Y(TIP_Y - 6.5 + dy), d > 2.2 ? 'k' : dx + dy < 0 ? 'Y' : 'y'); }\n  OUTLINE(G);\n  return R(G);\n};\nconst TORSO4 = torso4();");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH41B_OK');
