// 蒼神骸華 第二案：撃つ瞬間＝太いレーザー（半幅 3.6）で確定＝正典 GAIKA2_FIRING を足す（2026-09-23 11:15）
// ユーザー「撃つ瞬間：太いレーザーでお願い」
// 読み＝撃っていない姿（GAIKA2_FINAL＝候補 120）はそのまま。撃つ瞬間を**別の正典**として足す
//   （最終形態は「撃っていない姿」が既定でよく、撃つ瞬間はゲームの一場面なので姿を分ける）。
//   ray の太さの既定も 2.4 → 3.6 にして、`ray:true` と書いただけでご承認の太さになるようにする。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①ray の太さの既定＝3.6（ご承認の太さ）
rep(`tg4.ray ? { len: 230, w: 2.4, ...(typeof tg4.ray === 'object' ? tg4.ray : {}) } : null`,
  `tg4.ray ? { len: 230, w: 3.6, ...(typeof tg4.ray === 'object' ? tg4.ray : {}) } : null`);   // 09-23 11:12 ユーザー「撃つ瞬間：太いレーザーでお願い」

// ---- ②撃つ瞬間の正典＝GAIKA2_FIRING（候補 125）
rep(`export const GAIKA2_FINAL = build4({ tag: '-final', ...GAIKA2_FINAL_OPT });`,
  `export const GAIKA2_FINAL = build4({ tag: '-final', ...GAIKA2_FINAL_OPT });
export const GAIKA2_FIRING_OPT = { ...GAIKA2_FINAL_OPT, openGun: { ...GAIKA2_FINAL_OPT.openGun, ray: true } };   // ⭐09-23 11:12 決定：撃つ瞬間＝波動から一直線の**太い**レーザー（半幅 3.6・候補 125）。撃っていない姿は GAIKA2_FINAL のまま
export const GAIKA2_FIRING = build4({ tag: '-fire', ...GAIKA2_FIRING_OPT });`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_FIRE_OK');
