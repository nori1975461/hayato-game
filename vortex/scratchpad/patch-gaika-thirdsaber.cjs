// 蒼神骸華 第二案「開」の姿：三本目の腕の光刃に色と間合いの口（openGun: { kind:'saber', tone, deg, len }）
// ユーザー（2026-09-22 11:05）「光刃4枚とも近接武器でもいいかもしれない。制約しないので、あなたの最適解をだして」
// 私の最適解と根拠：
//   ①三本目の腕は近接（刃）のまま＝遠距離は月牙六枚が担っている。ここに砲を足すと役割が被り、
//     「供給の経路が増えただけで新しい体験がない」形になる（[[feedback_hidden_mechanic_supply_path]] の裏返し）。
//     弱点が胸の中心にある以上プレイヤーは近づくしかなく、「近づくしかない／近づくと刃が待つ」は緊張感の作り方として噛み合う。
//     遠距離砲を足すと遠くにいても危険＝逃げ場が消えて理不尽側へ倒れる（[[feedback_tension_is_not_damage]]）。
//   ②ただし 4 本を同じ刃にはしない＝三本目の刃を白金（SCH.gold＝胸の炉の扉が開いたときの光と同じ色域）にする。
//     「炉の扉が開いて初めて灯る刃」になり、開の姿でしか出ない理由が絵で説明される。
//     副腕のマゼンタの蝕刃と一目で分かれ、色は新規追加ではなく胸の炉の色の再利用（情報量を増やさない）。
//   ③間合いは既に違う（副腕の蝕刃 62°・長さ 110 ／三本目 17°・70）＝同じ動きに見えない。口だけ用意して既定は動かさない。
// 作り：saberAt に第5引数（色の組）を足す。省略＝従来どおり o.saber（既定 mag）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①saberAt に色の組を渡せるようにする（省略＝従来の sb）
rep("  const saberAt = (W0, s, deg, L) => {\n    const a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a);",
  "  const saberAt = (W0, s, deg, L, pal) => {   // pal＝色の組（SCH の値）。省略＝機体の光刃の色（o.saber・既定 mag）\n    const sc = pal || sb;\n    const a = (deg * Math.PI) / 180, dx = s * Math.cos(a), dy = Math.sin(a);");
rep("    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, (u) => BW(u), () => sb.c); bl.slab(0, 1, (u) => BW(u) * 0.55, () => sb.b); bl.slab(0, 1, (u) => BW(u) * 0.3, () => sb.a); bl.slab(0, 1, (u) => BW(u) * 0.08, () => sb.core);",
  "    bl.slab(0, 1, (u) => BW(u) + 0.8, () => 'k'); bl.slab(0, 1, (u) => BW(u), () => sc.c); bl.slab(0, 1, (u) => BW(u) * 0.55, () => sc.b); bl.slab(0, 1, (u) => BW(u) * 0.3, () => sc.a); bl.slab(0, 1, (u) => BW(u) * 0.08, () => sc.core);");

// ---- ②三本目の腕：色と間合いを引数で受ける（オブジェクトでも文字列でも書ける）
rep("    const tk = thirdGun4 ? (Array.isArray(thirdGun4) ? (s > 0 ? thirdGun4[1] : thirdGun4[0]) : thirdGun4) : kit === 'swap' ? 'gun' : kit === 'vulcan' ? 'saber' : 'launcher';   // 「開」の姿：出る砲（省略＝kit のまま）\n    if (tk === 'gun') { gunAt(pts[2], s, armGunDeg, armGunLen, 3); return; }   // 第51稿：この手にバルカン砲（向きは第50稿の光刃と同じ）\n    if (tk === 'saber') { fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sb.b : sb.c)); saberAt(pts[2], s, saberDeg, saberLen); return; }   // 第49稿：砲を外し、この手にマゼンタの光刃（前腕に光刃と同じ色の帯）",
  `    const tk0 = thirdGun4 ? (Array.isArray(thirdGun4) ? (s > 0 ? thirdGun4[1] : thirdGun4[0]) : thirdGun4) : kit === 'swap' ? 'gun' : kit === 'vulcan' ? 'saber' : 'launcher';   // 「開」の姿：出る砲か刃（省略＝kit のまま）
    const tk = typeof tk0 === 'object' ? tk0.kind : tk0, tko = typeof tk0 === 'object' ? tk0 : {};
    if (tk === 'gun') { gunAt(pts[2], s, tko.deg ?? armGunDeg, tko.len ?? armGunLen, 3); return; }   // 第51稿：この手にバルカン砲（向きは第50稿の光刃と同じ）
    if (tk === 'saber') { const sc = tko.tone ? SCH[tko.tone] : sb; fa.slab(0.4, 0.78, 1.5, (v) => (v < 0 ? sc.b : sc.c)); saberAt(pts[2], s, tko.deg ?? saberDeg, tko.len ?? saberLen, sc); return; }   // 第49稿：砲を外し、この手に光刃（前腕に刃と同じ色の帯）。tone で色を変える`);

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_THIRDSABER_OK');
