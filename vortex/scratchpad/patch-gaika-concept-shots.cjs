// 蒼神骸華 第二案：三本目の腕の光刃は「刃に見えて光弾を撃つ」遠距離の武器（2026-09-22 12:37・ユーザー案を採用）＝CONCEPT4 と既定の注記
// 経緯＝私の根拠「弱点は胸の中心 → 近づくしかない → 近づくと刃が待つ」をユーザーが反駁（ビリヤード弾＝遠距離が基本・近づいたのは
//   ボスの近くに弾があったから・骸華の月牙は飛来する弾なのでボスの近くにない）。vortex/src を実測して認めた：
//   ・装甲片はボス共通（billiard.js:1765・balance.js shards dist 62）＝近づく動線は骸華にもあるが HP 20% ごとの一瞬だけ
//   ・投げ弾の射程 560〜1200px（speed 200〜430 × life 2.8s）は画面幅 640 を超える＝離れたまま当てられる
//   ・月牙は掴んで投げ返せる弾（好機）・光弾は掴めない弾（脅威）＝役割が逆で被らない。近接 4 本は遠距離にいる時間には脅威にならない
// 絵＝構え（候補 95）は変えない。撃つ瞬間だけ刃先に閃きと光弾（openGun: { kind:'saber', shots:3 }＝候補 98・patch-gaika-shots.cjs）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

rep("蒼の装甲が開けば、肩の腕がもう一対現れて細い光刃を水平に構え、月牙は六枚とも座を離れて有線で飛ぶ。空いた座には月牙の形の窪みと蒼い軌条と金の留め具だけが残る。'",
  "蒼の装甲が開けば、肩の腕がもう一対現れて細い光刃を水平に構える。刃に見えて、その先から光弾が飛ぶ。月牙は六枚とも座を離れて有線で飛び、空いた座には月牙の形の窪みと蒼い軌条と金の留め具だけが残る。'");

rep("openHole: { kind: 'socket', seat: true }, openGun: 'saber' };   // 09-22 決定：跡＝月牙の形の窪み＋座の軌条と金の留め具／三本目の腕はマゼンタの光刃（候補 95）",
  "openHole: { kind: 'socket', seat: true }, openGun: 'saber' };   // 09-22 決定：跡＝月牙の形の窪み＋座の軌条と金の留め具／三本目の腕はマゼンタの光刃（候補 95）。⭐12:37 この光刃は遠距離の武器＝刃に見えて先から光弾を撃つ（撃つ瞬間は openGun: { kind:'saber', shots:3 }＝候補 98・光弾は掴めない＝避けるだけ）");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_CONCEPT_SHOTS_OK');
