// 月牙を4枚にした版の仕上げ：一番下の月牙（moonX）を外すと、その座に隠れていた段の光の2本目（幅13pxの赤い帯）がむき出しになる。
// 第39稿で「裾の赤い一本線も不要」の前例があるので、moonX を外した閉じた姿ではこの段の光と下唇（Q）を描かない＝殻の下半分は無地の蒼の装甲。
// 既定・6枚の版・「開」の姿は不変。仕上げ前の姿は { keepBand2: true } で再現できる。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("let SH_SEAT = [];", "let shBandOff = 0;   // 月牙を減らした段の炉の光を消す（2＝一番下の座の段）。build4 が dropMoons から差し替える\nlet SH_SEAT = [];");
rep("(1 - Math.min(1, u)), fr = f % 1;", "(1 - Math.min(1, u)), fr = f % 1, bandOn = Math.floor(f) !== shBandOff;");
rep("      else if (f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';", "      else if (bandOn && f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';");
rep("      else if (f > 0.9 && fr < 0.15) c = 'r';", "      else if (bandOn && f > 0.9 && fr < 0.15) c = 'r';");
rep("      else if (f > 0.9 && fr < 0.22) c = 'k';", "      else if (bandOn && f > 0.9 && fr < 0.22) c = 'k';");
rep("      else c = lit ? (fr > 0.86 ? 'Q' : 'b') : 'q';", "      else c = lit ? (fr > 0.86 && Math.floor(f) + 1 !== shBandOff ? 'Q' : 'b') : 'q';");
rep("shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i));", "shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i)); shBandOff = !open4 && drop.includes('moonX') && !o.keepBand2 ? 2 : 0;");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('BAND2_PATCH_OK');
