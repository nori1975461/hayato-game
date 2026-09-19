// 第45稿：既定の GAIKA2 が「ザク型のひねり（zaku2・長い管）＋掌 B」になったので、NZ（ノイエ・ジール版）を名指ししていた道具を GAIKA2_NZ へ付け替え、既定の版（Z2）を検査の対象に足す。node patch-scripts45.cjs
const fs = require('fs');
const edit = (name, pairs) => {
  const F = __dirname + '/' + name; let src = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
  for (const [from, to] of pairs) { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error(name + ' not unique: ' + from.slice(0, 70)); src = src.slice(0, i) + to + src.slice(i + from.length); }
  fs.writeFileSync(F, src); console.log('OK', name);
};
edit('check-gaika2-fanroot.mjs', [
  ["// 死守する制約の検査：四版とも世界 y 22", "// 死守する制約の検査：既定（Z2＝ザク型のひねり）と比較用の四版とも世界 y 22"],
  ["[['NZ', M.GAIKA2], ['DOM', M.GAIKA2_DOM]", "[['Z2', M.GAIKA2], ['NZ', M.GAIKA2_NZ], ['DOM', M.GAIKA2_DOM]"],
]);
edit('check-gaika2-holes.mjs', [
  ["どのテクスチャにも覆われない点を四版それぞれ数える。", "どのテクスチャにも覆われない点を、既定（Z2＝ザク型のひねり・第45稿〜）と比較用の四版それぞれ数える。"],
  ["ジオング版は細い旋回円筒の両脇が空間として抜けるのが仕様（第44稿で 148）。それ以外の三版は 0 が正。", "ジオング版は細い旋回円筒の両脇が空間として抜けるのが仕様（第44稿で 148）。それ以外は 0 が正。"],
  ["[['NZ', 'GAIKA2', 0], ['DOM', 'GAIKA2_DOM', 0]", "[['Z2', 'GAIKA2', 0], ['NZ', 'GAIKA2_NZ', 0], ['DOM', 'GAIKA2_DOM', 0]"],
]);
edit('measure-gaika2-torso-hand.mjs', [
  ["[['NZ', M.GAIKA2], ['DOM', M.GAIKA2_DOM]", "[['Z2', M.GAIKA2], ['NZ', M.GAIKA2_NZ], ['DOM', M.GAIKA2_DOM]"],
]);
edit('render-gaika2-waists.mjs', [
  ["[['nz', 'NEUE ZIEL', M.GAIKA2], ", "[['nz', 'NEUE ZIEL', M.GAIKA2_NZ], "],
]);
