// resume-gaika.mjs の抽出を座標の直書きに依存しない形へ（第36稿で三本目の腕の根元が変わり拾えなくなった）＋第36〜39稿の確定値を足す
const fs = require('fs');
const F = __dirname + '/resume-gaika.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const a = src.indexOf("grab(/const pts = \\[\\[40, -38\\]"), b = src.indexOf("\nconsole.log('\\n=== 3.");
if (a < 0 || b < 0) throw new Error('marks');
src = src.slice(0, a) + `grab(/const third = \\(s\\) => \\{[^\\n]*\\n\\s*const pts = [^\\n]{0,70}/, '三本目の腕（メガランチャー）の骨');
{ const m = src.match(/const third = \\(s\\) => \\{[\\s\\S]{0,600}?const a = \\((\\d+) \\* Math\\.PI\\)[\\s\\S]{0,200}?L = (\\d+)/); console.log('  三本目の砲:', m ? '角度 ' + m[1] + '° / 長さ ' + m[2] : '(見つからない＝コードが変わった)'); }
{ const m = src.match(/const sub = \\(s\\) => \\{[\\s\\S]{0,700}?const pts = (\\[\\[[^\\n]{0,40}\\]\\])/); console.log('  副腕（殻の奥から生える）の骨:', m ? m[1] : '(見つからない＝コードが変わった)'); }
{ const m = src.match(/const main = \\(s\\) => \\{\\n\\s*const pts = (\\[\\[[^\\n]{0,40}\\]\\])/); console.log('  主腕の骨（肩の関節 (38,-25)）:', m ? m[1] : '(見つからない＝コードが変わった)'); }
console.log('  描画順（リグの順＝奥→手前）:', b.rig.map((p) => p.tex).join(' > '));
console.log('  月牙の枚数:', b.rig.filter((p) => /^moon/.test(p.tex)).length, '（六枚が正＝三枚ずつ・画面左の一番上は発射済みで座が空）');
` + src.slice(b);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('RESUME_PATCH_OK');
