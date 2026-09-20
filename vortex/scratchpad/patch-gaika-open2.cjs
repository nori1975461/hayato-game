// 「開」の姿 第一稿の直し：割れ目の奥の赤が強すぎて日蝕の輪とぶつかった＝黒い空洞に「細い背骨一本＋短い椎骨」だけを残す（線を減らす）
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("mid = Math.abs(u - 0.5), rib = (y - SH_TOP) % 9 < 1.3;", "mid = Math.abs(u - 0.5), rib = (y - SH_TOP) % 13 < 1.2;");
rep("    else if (mid < 0.035 && tt > 0.1 && tt < 0.7) c = 'W';\n    else if (mid < 0.085 && tt > 0.07 && tt < 0.76) c = 'A';\n    else if (mid < 0.16 && tt > 0.05 && tt < 0.82) c = 'R';\n    else if (rib && tt < 0.9) c = mid < 0.3 ? 'R' : 'r';\n    else if (mid < 0.27 && tt < 0.86) c = 'r';\n",
    "    else if (mid < 0.028 && tt > 0.1 && tt < 0.7) c = 'A';\n    else if (mid < 0.06 && tt > 0.07 && tt < 0.76) c = 'R';\n    else if (mid < 0.095 && tt > 0.05 && tt < 0.8) c = 'r';\n    else if (rib && mid < 0.24 && tt > 0.08 && tt < 0.78) c = 'r';\n");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('OPEN2_PATCH_OK');
