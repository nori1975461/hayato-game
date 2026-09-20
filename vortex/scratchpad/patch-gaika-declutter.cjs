// 腕まわりの整理の検討用：thirdArm:false＝肩の腕（三本目）と砲を描かない／dropMoons:['moonX']＝その月牙と殻の座（ハッチ）を描かない。既定は不変
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE ' + a.slice(0, 50)); t = t.replace(a, b); };
rep("const SH_HATCH = [[48, -84], [64, -46], [72, -8]];", "const SH_HATCH_ALL = [[48, -84], [64, -46], [72, -8]];\nlet SH_HATCH = SH_HATCH_ALL;   // 整理の検討：dropMoons に moonX を入れると一番下の座（ハッチ）も彫らない（build4 が差し替える）");
rep("let subStraight = false;", "let thirdArm4 = true;   // 整理の検討：false＝肩の腕（三本目）と砲を描かない（gaika2With({ thirdArm: false })）\nlet subStraight = false;");
rep("  subStraight = !!o.subStraight;\n", "  subStraight = !!o.subStraight; thirdArm4 = o.thirdArm !== false;\n  { const drop = o.dropMoons || [], ti = { moonT: 0, moonM: 1, moonX: 2 }; SH_HATCH = SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); }\n");
rep("if (only !== 'sub') { third(s); main(s); }", "if (only !== 'sub') { if (thirdArm4) third(s); main(s); }");
rep("    moon('wingR', 0, true), moon('baseL', 1, false), moon('baseR', 1, true), moon('podR', 2, false), moon('podR', 2, true), moon('qlegFL', 3, false),",
    "    ...[moon('wingR', 0, true), moon('baseL', 1, false), moon('baseR', 1, true), moon('podR', 2, false), moon('podR', 2, true), moon('qlegFL', 3, false)].filter((m) => !(o.dropMoons || []).includes(m.tex)),");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('DECLUTTER_PATCH_OK');
