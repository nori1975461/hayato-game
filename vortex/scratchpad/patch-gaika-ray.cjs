// 蒼神骸華 第二案：波動＝候補 120（半径 20）を既定に。撃つ瞬間は「弾」でなく、波動から敵めがけて一直線に飛ぶレーザー（2026-09-23 10:50）
// ユーザー「波動の形は５．の大きい波動。飛ぶ弾は、弾が一個ずつ飛ぶのではなく、波動から敵めがけて一直線にレーザーが飛ぶビジュアルにして。
//   波動はあくまで光の集合体にすぎないのだから、弾として発射されるのはおかしい」
// 読み（最小の変形）＝光（砲身・育つ脈）と波動はそのまま。変えるのは撃つ瞬間の絵だけ＝
//   弾（紡錘／曳光弾／波動が飛ぶ）→ 波動の芯から一直線に伸びる連続したレーザー（openGun.ray: { len, w }）。波動は発射口として残る
//   設計図では腕の向き（17°）へ伸ばす。ゲームでは主人公へ向ける（行動設計で決める）
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①openShots4 に ray（連続したレーザー）
rep(`function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true, shape = 'spindle', accel = 0, burstR = 0) {`,
  `function openShots4(n, gap, sc, shotLen = 10, shotW = 3.4, flash = true, shape = 'spindle', accel = 0, burstR = 0, ray = null) {   // ray＝{ len, w }＝弾でなく波動から一直線に伸びる連続したレーザー（09-23）`);
rep(`dAt = (i) => 7 + saberLen + 5 + burstR * 0.8 + i * gap + accel * i * i, dMax = dAt(n - 1) + LEN + 6;   // 進むほど間が開く＝加速して遠ざかる。波動があれば弾はその縁から出る`,
  `dAt = (i) => 7 + saberLen + 5 + burstR * 0.8 + i * gap + accel * i * i, rd0 = 7 + saberLen + burstR * 0.45, dMax = ray ? rd0 + ray.len + 4 : dAt(n - 1) + LEN + 6;   // 進むほど間が開く＝加速して遠ざかる。波動があれば弾はその縁から出る。レーザーは波動の芯（白い円のすぐ外）から出る`);
rep(`  for (let i = 0; i < n; i++) {
    const d = dAt(i), cx = GC[0] + dx * (d + LEN / 2)`,
  `  if (ray) {   // 連続したレーザー＝等幅・白い芯が全長に通る・先は切らず（テクスチャの外＝敵まで続く）。根は波動の体の中から少し太く明るく出す
    const rw = ray.w, x0 = GC[0] + dx * rd0, y0 = GC[1] + dy * rd0, x1 = GC[0] + dx * (rd0 + ray.len), y1 = GC[1] + dy * (rd0 + ray.len), rb = mkSlab(G, x0, y0, x1, y1);
    rb.slab(0, 1, rw + 0.7, () => 'k'); rb.slab(0, 1, rw, () => sc.c); rb.slab(0, 1, rw * 0.72, () => sc.b); rb.slab(0, 1, rw * 0.45, () => sc.a); rb.slab(0, 1, Math.min(rw * 0.24, 0.9), () => sc.core);
    const tx = GC[0] + dx * (7 + saberLen), ty = GC[1] + dy * (7 + saberLen), rt = mkSlab(G, tx, ty, x0 + dx * 8, y0 + dy * 8);
    rt.slab(0, 1, (u) => rw * (1.45 - 0.45 * u), () => sc.a); rt.slab(0, 1, (u) => rw * (0.8 - 0.3 * u), () => sc.core);
    n = 0;   // 弾は描かない
  }
  for (let i = 0; i < n; i++) {
    const d = dAt(i), cx = GC[0] + dx * (d + LEN / 2)`);

// ---- ②build4＝openGun.ray があれば shots が無くても撃つ瞬間を作る
rep(`thirdGun4.kind === 'saber' && thirdGun4.shots ? thirdGun4 : null;`,
  `thirdGun4.kind === 'saber' && (thirdGun4.shots || thirdGun4.ray) ? thirdGun4 : null;`);
rep(`openShots4(tg4.shots, tg4.gap ?? 14, tg4.tone ? SCH[tg4.tone] : saber, tg4.shotLen ?? 10, tg4.shotW ?? 3.4, tg4.flash ?? !saberTipR, tg4.shotShape ?? 'spindle', tg4.accel ?? 0, saberTipR) : null;`,
  `openShots4(tg4.shots || 0, tg4.gap ?? 14, tg4.tone ? SCH[tg4.tone] : saber, tg4.shotLen ?? 10, tg4.shotW ?? 3.4, tg4.flash ?? !saberTipR, tg4.shotShape ?? 'spindle', tg4.accel ?? 0, saberTipR, tg4.ray ? { len: 230, w: 2.4, ...(typeof tg4.ray === 'object' ? tg4.ray : {}) } : null) : null;`);

// ---- ③既定＝波動 20（候補 120）・CONCEPT4
rep(`chamber: true, grow: 0.7, tipBurst: 16 } };   // ⭐⭐23:50「育つを入れる・いちばん先で大きな波動になり ライフルのように撃ち出される」＝grow 0.7 を戻し tipBurst 16（結晶状の閃光）＝候補 118`,
  `chamber: true, grow: 0.7, tipBurst: 20 } };   // ⭐⭐23:50「育つを入れる・いちばん先で大きな波動になり ライフルのように撃ち出される」＝grow 0.7 を戻し tipBurst（結晶状の閃光）。⭐09-23 10:50「波動の形は５の大きい波動」＝20（候補 120）。撃つ瞬間は弾でなく ray（波動から一直線のレーザー・openGun.ray:true）`);
rep(`いちばん先で大きな波動に膨れて、そこから光弾がライフルのように撃ち出される。`,
  `いちばん先で大きな波動に膨れる。波動は光の集合体＝発射口で、そこから敵めがけて一直線にレーザーが飛ぶ。`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_RAY_OK');
