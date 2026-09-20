// FB（2026-09-21 00:11）「4 昇る蝕と 6 食の最終形態をみせてくれないと判断の仕様がない。よろしく頼む」
// 読み：閉じた姿だけでは決められない＝それぞれの案が「装甲が開いた姿（最終形態）」でどうなるかを、閉じた姿と同じ枠の写真で見せる。
//       前回（23:42 の指摘）で分かったとおり、最初の試作は「開」で昇る蝕も食も消えていた（saku4 = !open4 && …／sx = xf ? null : …）。
// 作り：①「開」でも dormantX の kind が 'umbra'／'bite' なら通す（'none'／'band' と kind の無い繊月は従来どおり「開」では無効）。
//         食＝切り欠いた外の縁のまま外の板が回る（縁の刃と一筋も付いて回る）／昇る蝕＝闇と灼けた縁は板に塗られたまま回る。
//       ②昇る蝕に inner の口＝内の面にも闇を掛ける（灼けた縁の弧は外の面だけのまま）。闇が昇りきった姿と「開」の姿で使う
//         （平常と前ぶれでは付けない＝内の面は腕と胴に隠れていて、弧の欠片が覗くのを避けるため外の面だけにした経緯は変えない）。
//       ③闇が月牙の座（収めた姿の無地の板）にかかったら、座の板も闇の色にする（闇の中に蒼い板の角が残るのを直す）。
//         ＝候補 37（昇る蝕・高い）の絵が変わる（中の月牙の座の左下）。36 は闇が座に届かないので不変。
// 昇る蝕の最終形態の考え＝名前のとおり「蒼神 → 骸 → 華」＝閉じた姿は蒼神（蒼の漆）→ 闇が昇りきって蒼が消えると骸（黒い板）→ 装甲が割れて炉の赤が咲くと華。
//   昇りきった闇＝{ kind:'umbra', r:215, inner:true }（円が殻ぜんぶを覆う＝牙の頂 (22,-134) まで中心 (0,70) から 205）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①「開」でも昇る蝕と食は通す
rep("const saku4 = !open4 && o.dormantX ? (typeof o.dormantX === 'object' ? o.dormantX : SAKU4[o.dormantX]) || null : null;",
  "const sakuRaw4 = o.dormantX ? (typeof o.dormantX === 'object' ? o.dormantX : SAKU4[o.dormantX]) || null : null, saku4 = sakuRaw4 && (!open4 || sakuRaw4.kind === 'umbra' || sakuRaw4.kind === 'bite') ? sakuRaw4 : null;");
rep("  const sx = xf ? null : shSeatX, bt =", "  const sx = shSeatX, bt =");   // 「開」で通すかどうかは build4 が決める（上の行）

// ---- ②昇る蝕：内の面にも闇を掛ける口
rep("sink: sx.sink !== false } : null,", "sink: sx.sink !== false, inner: !!sx.inner, burn: sx.burn || null } : null,");
rep("else if (um && x > xr && dU >= um.w) c = um.dark;", "else if (um && (x > xr || um.inner) && dU >= um.w) c = um.dark;");

// ---- ④昇る蝕：闇の中の縁取りを灼く口（burn＝色）。平常と前ぶれでは縁取りは一段沈む（sink）。闇が昇りきったら沈んでいた縁が一斉に灼ける
//   ＝皆既日蝕で太陽が隠れきった瞬間に縁（コロナ）だけが見えるのと同じ絵＝蝕刃・蝕の軌条の「芯が黒く縁だけが灼ける」が殻ぜんたいで完成する。
rep("c = UM_DIM[lit ? trim[0] : trim[1]] || (lit ? trim[0] : trim[1]);", "c = um.burn || UM_DIM[lit ? trim[0] : trim[1]] || (lit ? trim[0] : trim[1]);");

// ---- ③闇の中の座の板は闇の色
rep("      else if (sd < 1.0 && !(dOut >= 1.8 && dOut < 3.0)) c = lit ? 'b' : 'q';",
  "      else if (sd < 1.0 && !(dOut >= 1.8 && dOut < 3.0)) c = um && (x > xr || um.inner) && dU >= um.w ? um.dark : lit ? 'b' : 'q';");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_SEATX_OPEN_OK');
