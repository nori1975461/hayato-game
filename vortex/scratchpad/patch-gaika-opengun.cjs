// 蒼神骸華 第二案「開」の姿：三本目の腕（肩の腕）が持つもの＝openGun
// 経緯：ユーザー決定（09-20 16:59）「バルカン砲（電子パルス砲）は外そう。蒼の装甲開く際に出現するものとする」
//   ＝閉じた姿は thirdArm:false（肩の腕ごと無し）・砲は「開」で隠し腕と一緒に現れる。
//   ところが「出現する砲」の絵は決めていない＝いまの最終形態は third() の既定（第34稿のメガランチャー＝単砲身・三段の装甲）のまま。
//   コードには第51稿のバルカン砲（gunAt＝機関部＋砲身の束三本）も残っている。どちらを出すかはユーザーが選ぶ。
// 作り：third() の装備を `openGun` で差し替える口（'gun'＝バルカン砲／'launcher'＝メガランチャー／'saber'＝光刃）。
//   配列 ['画面左','画面右'] で左右を違えられる（⚠️骸華は非対称が選ばれてきた＝左肩は跳ね上げ・右肩は面取り）。
//   省略＝従来どおり kit に従う（'swap'→バルカン砲／'vulcan'→光刃／それ以外→メガランチャー）＝既定は 1 画素も変わらない。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①口の変数
rep("let armGunDeg = ARMGUN4_DEG,",
  `let thirdGun4 = null;   // 「開」の姿で三本目の腕が持つもの（gaika2With({ openGun: 'gun' | 'launcher' | 'saber' | ['画面左', '画面右'] })）
let armGunDeg = ARMGUN4_DEG,`);

// ---- ②third() の装備を差し替える（既定は kit のまま＝従来と同じ絵）
rep(`    if (kit === 'swap') { gunAt(pts[2], s, armGunDeg, armGunLen, 3); return; }   // 第51稿：この手にバルカン砲（向きは第50稿の光刃と同じ）
    if (kit === 'vulcan') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }   // 第49稿：砲を外し、この手にマゼンタの光刃（前腕に光刃と同じ色の帯）`,
  `    const tk = thirdGun4 ? (Array.isArray(thirdGun4) ? (s > 0 ? thirdGun4[1] : thirdGun4[0]) : thirdGun4) : kit === 'swap' ? 'gun' : kit === 'vulcan' ? 'saber' : 'launcher';   // 「開」の姿：出る砲（省略＝kit のまま）
    if (tk === 'gun') { gunAt(pts[2], s, armGunDeg, armGunLen, 3); return; }   // 第51稿：この手にバルカン砲（向きは第50稿の光刃と同じ）
    if (tk === 'saber') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }   // 第49稿：砲を外し、この手にマゼンタの光刃（前腕に光刃と同じ色の帯）`);

// ---- ③build4 の口
rep("armGunDeg = o.armGunDeg ?? ARMGUN4_DEG;",
  "thirdGun4 = o.openGun || null; armGunDeg = o.armGunDeg ?? ARMGUN4_DEG;");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_OPENGUN_OK');
