// 第37稿のパッチ（一度だけ当てる）。node patch-gaika37.cjs
//   FB①「蒼の装甲がスカートの前にきてしまっている。現実的にありえない。スカートの後ろになるように。左右とも」
//     ＝描画順はリグの配列順。スカート（legL）を殻（trackL／trackR）の後ろへ移す＝殻の下端の牙はスカートの陰に入る
//   FB②「スカートの前面のギザギザはなに？スカートは強調したいので不要。なくして」＝第28稿で胴の裾に足した牙の列（七本）を撤去
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const cut = (mark, to) => {
  const a = src.indexOf(mark); if (a < 0) throw new Error('NOT FOUND: ' + mark.slice(0, 50));
  if (src.indexOf(mark, a + 1) >= 0) throw new Error('NOT UNIQUE: ' + mark.slice(0, 50));
  const b = src.indexOf('\n', a);
  const line = src.slice(a, b);
  src = src.slice(0, a) + to + src.slice(b);
  return line;
};
// ② 牙の列を撤去（行ごと置き換える）
cut('  for (const bx of [-21, -14, -7, 0, 7, 14, 21]) for (let y = 0; y <= 11; y += 0.5)', '  // 第37稿：腰の牙の列（第28稿）は撤去＝スカートの前面を空けて逆さ扇そのものを見せる');
// ① スカートの行を抜き、殻の行の直後へ差す
const ped = cut("    { role: 'legL', tex: 'pedestal', ox: 0, oy: 22, origin: [0.5, 0] },", '    // 第37稿：スカートは殻の後ろへ移した（下の行）');
const shellMark = "    { role: 'trackL', tex: 'shellL', ox: -112, oy: -138, origin: [0, 0] }, { role: 'trackR', tex: 'shellR', ox: 10, oy: -138, origin: [0, 0] },\n    moon('wingR', 0, true),";
const i = src.indexOf(shellMark); if (i < 0 || src.indexOf(shellMark, i + 1) >= 0) throw new Error('shell line');
const eol = src.indexOf('\n', i);
src = src.slice(0, eol + 1) + ped + '\n' + src.slice(eol + 1);
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH37_OK');
