// FB（2026-09-20 17:44）「6枚の方が退廃的な不気味さがある。4枚の方がすっきりしている。しかし、なにもない空間で物足りない。赤の線はなかなかよいがまだ物足りない。ごちゃつかず、意味のあるスペースにしたい」
// 案：一番下の座を「朔（さく）の座」にする＝三枚目の月牙は在るが灯が落ちている（眠る月）。閉じた姿は 灯る4枚＋眠る2枚、「開」の姿で六枚すべてが目覚める（「六枚で皆既」はそのまま生きる）。
// 作り：{ dormantX: 'dark' | 'ember' } のとき、moonX のテクスチャを dock の絵の色だけ差し替えたものにする（形は 1 ドットも変えない）。
//   'dark' ＝黒い月に鈍い鋼の縁（深紅と金の光を消す）／'ember'＝同じ黒い月の前の刃の縁だけ暗い深紅（消えかけの残り火）。
// 既定は不変。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, b); };
rep("const MOONS4 = [{ c: [-48, -84],", "const DORMANT4 = { dark: { R: 'm', Q: 'j', q: 'k', r: 'j', A: 'm', Y: 'y', s: 'm', f: 'j' }, ember: { R: 'r', Q: 'j', q: 'k', r: 'j', A: 'r', Y: 'y', s: 'm', f: 'j' } };   // 朔の座：灯の落ちた月牙（色だけ差し替え）\nconst dormant4 = (rows, mode) => { const map = DORMANT4[mode] || DORMANT4.dark; return rows.map((r) => r.replace(/[RQqrAYsf]/g, (ch) => map[ch] || ch)); };\nconst MOONS4 = [{ c: [-48, -84],");
rep("moonX: P7(MOONS4[2].rows),", "moonX: P7(o.dormantX ? dormant4(MOONS4[2].rows, o.dormantX) : MOONS4[2].rows),");
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('DORMANT_PATCH_OK');
