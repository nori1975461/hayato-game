// 月牙を全部収めた姿：gaika2With({ stowed: true })＝殻の黒い開口（穴）を彫らず、月牙を装甲の面に嵌め込む／左上の射出ずみの一枚も座へ戻す／空の座の飾りは描かない。既定は不変
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("let thirdArm4 = true;", "let stowed4 = false;   // 月牙を全部収めた姿（穴なし・嵌め込み）\nlet thirdArm4 = true;");
rep("open4 = o.open === true ? 16 : Number(o.open) || 0;\n", "open4 = o.open === true ? 16 : Number(o.open) || 0; stowed4 = !!o.stowed;\n");
rep("SH_HATCH = open4 ? [] : SH_HATCH_ALL.filter(", "SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter(");
rep("  if (s < 0 && !xf) {\n    // 第36稿：空の座", "  if (s < 0 && !xf && !stowed4) {\n    // 第36稿：空の座");
rep("moon('qlegFL', 3, false)]).filter(", "(stowed4 ? moon('wingL', 0, false) : moon('qlegFL', 3, false))]).filter(");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('STOWED_PATCH_OK');
