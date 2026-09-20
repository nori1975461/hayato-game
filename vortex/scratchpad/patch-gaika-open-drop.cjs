// 月牙を6枚→4枚にしたときの検証用：「開」の姿も dropMoons に従わせる（割れ目の奥の座と、有線で射出される月牙を同じ段だけ減らす）。既定と既存の形は不変
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("const shoRot = (x, y, a) =>", "let shoOn = [0, 1, 2];   // 「開」の姿で生きている座（上から T・M・X）。build4 が dropMoons から差し替える\nconst shoRot = (x, y, a) =>");
rep("    for (const ys of SHO_SEATS) { const d = Math.abs(y - ys);", "    for (const ys of SHO_SEATS.filter((_, i) => shoOn.includes(i))) { const d = Math.abs(y - ys);");
rep("  SHO_SEATS.forEach((ys, i) => {\n    const sp = shoRot(", "  SHO_SEATS.forEach((ys, i) => {\n    if (!shoOn.includes(i)) return;\n    const sp = shoRot(");
rep("  { const drop = o.dropMoons || [], ti = { moonT: 0, moonM: 1, moonX: 2 }; SH_HATCH =", "  { const drop = o.dropMoons || [], ti = { moonT: 0, moonM: 1, moonX: 2 }; shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i)); SH_HATCH =");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('OPEN_DROP_PATCH_OK');
