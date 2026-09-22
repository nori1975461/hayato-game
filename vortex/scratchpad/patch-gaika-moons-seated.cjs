// 蒼神骸華 第二案：「開」の姿で月牙が板に載ったまま（＝月牙放射前）を描く口 moonsSeated（2026-09-22 夕・ユーザー「Version ごとの全身撮影」で必要になった）
//   蒼の装甲が開く → 月牙が座を離れて飛ぶ、の間の一瞬。座は板と一緒に SHO_PIV を軸に open4 度だけ回るので、
//   閉じた姿の座（MOONS4[i].root・右側の世界座標）を shoRot で回し、月牙の絵にも同じ角度の回転（rig の rot）を掛ける。
//   描画器 render-boss-rig.mjs にパーツ自身の rot（ラジアン・mirror 側は逆符号）を足す＝これまで腕（armPose）だけだった。
//   ⚠️本編 boss.js に同じ rot が無ければ採用時の宿題（月牙は本編では別スプライトの動きになる見込み）。
const fs = require('fs');
const patch = (F, reps) => {
  let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
  for (const [a0, b0] of reps) { const a = a0.replace(/\r\n/g, '\n'), b = b0.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); }
  fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
};

patch(__dirname + '/render-boss-rig.mjs', [[
  "    let rot = 0;\n    if (opt.armPose && (p.role === 'armR' || p.role === 'armL')) {",
  "    let rot = p.rot ? p.rot * (p.mirror ? -1 : 1) : 0;   // パーツ自身の回転（ラジアン・mirror 側は逆符号）＝開いた板に載ったままの月牙（gaika moonsSeated）に使う\n    if (opt.armPose && (p.role === 'armR' || p.role === 'armL')) {",
]]);

patch(__dirname + '/gaika-candidates.mjs', [
  ["  const OM4 = open4 ? openMoons4(open4) : null; if (OM4) Object.assign(sprites, OM4.sprites);",
   "  const OM4 = open4 ? openMoons4(open4) : null; if (OM4) Object.assign(sprites, OM4.sprites);\n  const seated4 = !!(open4 && o.moonsSeated), seatTh = (open4 * Math.PI) / 180;   // 月牙放射前＝開いた板に月牙が載ったまま（座は板と一緒に SHO_PIV を軸に回る・跡は描かない）"],
  ["  const moon = (role, i, mirror) => ({ role, tex: ['moonT', 'moonM', 'moonX', 'moonB'][i], ox: MOONS4[i].root[0] * (mirror ? -1 : 1), oy: MOONS4[i].root[1], origin: MOONS4[i].origin, ...(mirror ? { mirror: true } : {}) });",
   "  const moon = (role, i, mirror) => { const r0 = MOONS4[i].root, rp = seated4 ? shoRot(-r0[0], r0[1], seatTh) : [-r0[0], r0[1]]; return { role, tex: ['moonT', 'moonM', 'moonX', 'moonB'][i], ox: rp[0] * (mirror ? 1 : -1), oy: rp[1], origin: MOONS4[i].origin, ...(mirror ? { mirror: true } : {}), ...(seated4 ? { rot: -seatTh } : {}) }; };   // root は左側の世界座標。shoRot は右側の座標で回す"],
  ["    ...(OM4 ? OM4.rig : []), ...(OM4 ? [] : [moon('wingR', 0, true),",
   "    ...(OM4 && !seated4 ? OM4.rig : []), ...(OM4 && !seated4 ? [] : [moon('wingR', 0, true),"],
]);
console.log('PATCH_MOONS_SEATED_OK');
