// 第45稿のパッチ g（一度だけ当てる）。node patch-gaika45g.cjs
//   「もうひとひねり」の見比べ用の変種を opt で足す（既定＝長い管・鋼は 1 ドットも変えない＝ハッシュ c1c7ccb6546d のまま）
//     opt.trunk 'bellows'＝幹を蛇腹の腹（横に割れた三〜四枚の板・中央の合わせ目は通さない＝十字の箱を避ける）／'spine'＝下向きの V の板の連なり（裾の V と同じ向き）
//     opt.spiral＝節を斜めに巻く（らせんの蛇腹＝縒った索）／opt.asym 'double'＝画面右だけ細い管の二連
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const rep = (from, to) => { const i = src.indexOf(from); if (i < 0 || src.indexOf(from, i + 1) >= 0) throw new Error('not unique: ' + from.slice(0, 80)); src = src.slice(0, i) + to + src.slice(i + from.length); };
rep("          let c;\n          if (Math.abs(k) > R - 0.55 || band) c = 'k';\n          else if (ring) c = hot > 0.5",
  "          let c; const rg = opt.spiral ? !o.smooth && (((len + s * k * 0.9) % per) + per) % per > per - 1.0 : ring;   // らせん＝節の位相を管の幅方向へずらす\n          if (Math.abs(k) > R - 0.55 || band) c = 'k';\n          else if (rg) c = hot > 0.5");
rep("    for (let y = -3; y <= COL_Y; y += 0.25) { const w = opt.trunk === 'plug' ? (y < 7 ? CH4 - 9 : CH4 - 13) : CH4 - 11.5; row(y, w, (x) => (x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k')); }\n    seam(-2, COL_Y);\n",
  String.raw`    const PLATES = opt.trunk === 'bellows' || opt.trunk === 'spine';
    for (let y = -3; y <= COL_Y; y += 0.25) {
      const w = opt.trunk === 'plug' ? (y < 7 ? CH4 - 9 : CH4 - 13) : PLATES ? CH4 - 13 : CH4 - 11.5;
      row(y, w, (x) => {
        if (!PLATES) return x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k';
        const u = y + 1.5 + (opt.trunk === 'spine' ? -Math.abs(x) * 0.5 + 5.5 : 0), ph = ((u % 5) + 5) % 5;   // 板の周期 5。spine は中央が低い V
        return ph < 1 ? 'k' : ph < 2 ? (x < 0 ? 'm' : 'j') : x + w < 2.2 ? 'm' : x < 0 ? 'j' : 'k';
      });
    }
    if (!PLATES) seam(-2, COL_Y);
`);
rep("    if (ROUTE === 'long') for (const s of [-1, 1]) tube(ell(22, 4.5, 7.5, 15, -82, 72), s, R0);",
  "    if (ROUTE === 'long') for (const s of [-1, 1]) { if (opt.asym === 'double' && s > 0) { tube(ell(24.4, 4.5, 8.4, 15.4, -82, 72), s, 2.5, { period: 3.0 }); tube(ell(20.2, 4.5, 5.0, 13.6, -80, 74), s, 2.5, { period: 3.0 }); } else tube(ell(22, 4.5, 7.5, 15, -82, 72), s, R0); }");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH45G_OK');
