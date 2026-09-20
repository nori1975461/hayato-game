// 月牙を収めた姿の直し：穴を消したら、穴に隠れていた段の光（赤い帯）と稜線が月牙の下を横切って見えた＝座のまわり（元の開口と同じ形）は無地の装甲板にする
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("let SH_HATCH = SH_HATCH_ALL;", "let SH_SEAT = [];   // 月牙を収めた姿：穴の代わりに無地の座（段の光と稜線を通さない）\nlet SH_HATCH = SH_HATCH_ALL;");
rep("      if (tt > 0.94) c = lit ? 'G' : 'Y';", "      let sd = 9; for (const [hx, hy] of SH_SEAT) { const ddx = Math.abs(x - hx) / 20, ddy = Math.abs(y - hy) / 15.5, d = Math.pow(Math.pow(ddx, 8) + Math.pow(ddy, 8), 0.125); if (d < sd) sd = d; }\n      if (tt > 0.94) c = lit ? 'G' : 'Y';");
rep("      else if (f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';", "      else if (sd < 1.0 && !(dOut >= 1.8 && dOut < 3.0)) c = lit ? 'b' : 'q';                              // 月牙を収めた座＝無地の装甲板\n      else if (f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';");
rep("SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); }", "SH_HATCH = open4 || stowed4 ? [] : SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)); SH_SEAT = stowed4 && !open4 ? SH_HATCH_ALL.filter((_, i) => !drop.some((k) => ti[k] === i)) : []; }");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('STOWED2_PATCH_OK');
