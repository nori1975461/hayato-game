// 蒼神骸華 第二案：三本目の腕の武器＝⭐「砲身＋脈打つ光＋粒立ち＋薬室と放熱フィン」で確定（2026-09-22 23:22）
// ユーザー「４＋砲身の作りこみでお願い。２．育つもよかったが、ビジュアル的に私の好みではなかった。
//   ４＋は、薬室の存在、放熱フィンの存在をみせることで、より遠距離攻撃であることを強調してくれた」
// 読み＝クリックページの 4（粒立ち＋育つ＋薬室）から **育つ（grow）だけを外す**。残すのは粒立ち 0.65 と薬室・放熱フィン。
//   左右の位相ずらし（asym）と走る脈（skew）は、ご覧いただいた 4 の状態に無かったので入れない（あとから一言で足せる）。
// 採用の理由（ユーザーの言葉）＝薬室と放熱フィンという「装置」が見えることで、遠距離攻撃の武器だと強調される。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("openHole: { kind: 'socket', seat: true }, openGun: 'saber' };   // 09-22 決定：跡＝月牙の形の窪み＋座の軌条と金の留め具／三本目の腕はマゼンタの光刃（候補 95）。⭐12:37 この光刃は遠距離の武器＝刃に見えて先から光弾を撃つ（撃つ瞬間は openGun: { kind:'saber', shots:3 }＝候補 98・光弾は掴めない＝避けるだけ）",
  `openHole: { kind: 'socket', seat: true }, saberLen: 120, openGun: { kind: 'saber', style: 'pulse', barrel: 20, gapPulse: 0.65, chamber: true } };   // 09-22 決定：跡＝月牙の形の窪み＋座の軌条と金の留め具（候補 95）。⭐12:37 三本目の腕は遠距離の武器（光弾は掴めない＝避けるだけ・撃つ瞬間は shots:3）。⭐⭐23:22 その姿を確定＝砲身（長さ20・薬室の隙間と放熱フィン）から 粒立った脈の光（長さ120）が出る＝候補 117。育つ grow は「ビジュアル的に好みでない」で不採用・左右ずらし asym と走る脈 skew は保留`);

rep("蒼の装甲が開けば、肩の腕がもう一対現れて細い光刃を水平に構える。刃に見えて、その先から光弾が飛ぶ。",
  "蒼の装甲が開けば、肩の腕がもう一対現れて短い砲身を水平に構える。薬室の隙間から光が漏れ、筒の口から粒立った光が長く伸び、その先へ光弾が飛ぶ。");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_DEF_LASER_OK');
