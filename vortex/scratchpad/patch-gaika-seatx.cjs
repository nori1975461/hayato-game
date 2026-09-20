// FB（2026-09-20 22:47・0920/２４ への回答）
//   a「首の装甲の高さ＝4 襟なし」＝決定（collar:'none'）。
//   b「一番下の座については、3（満ちかけ 0.3）かなと思ったがまだもやもやが解消されない。再度アイデアを練り直して。質問はいくらでも受ける」
// 絞った質問への回答（22:58）＝もやもやの正体は「絵に凄みがない」「無くてもいい気もする」／守りたいのは「月にこだわらない」
//   （閉じた姿は 4 枚でよく、この空間に別の意味・機能があればよい。開いたら 6 枚になるのは変えない）／左右で違える案は「もやもやが解消されるとは思えないので不要」。
// 読み：色の軸（鋼⇔深紅・太さ・満ち具合）は 2 回見比べて 2 回とも決まらなかった＝色の問題ではない。私の診断（模様に見える・空間が寂しい）も外れ。
//       正体は「小さな月の印」という絵の当たり前さ。月の形はもう使わず、空間の意味の与え方そのものを三通りに振る＝足す／塗る／引く。
//       凄みの文法は今日ユーザーが選んだ蝕刃・蝕の軌条と同じ「光の芯が黒い」「蝕＝欠け」から借りる。
// 作り：{ dormantX: { kind, … } }＝一番下の座を月でない絵にする口（省略すれば従来どおり・既定は不変・「開」には効かない）。
//       kind:'none'＝無地／'band'＝段の隙間の炉の光を残す（eclipse:true で芯が黒く縁だけ灼ける＝蝕の炉口）
//       ／'umbra'＝殻の下を大きな円弧の闇が呑む（c＝円の中心・r＝半径・rim＝縁の色・w＝縁の太さ）＝昇る蝕
//       ／'bite'＝殻の外縁を円弧で切り欠く（c・r）＝食。縁には外縁と同じ白銀の刃と深紅の一筋が回る（円までの実距離で測る）。
//       パレットに d（蒼の漆の闇＝q より暗い蒼）を足す。
// 私の推し＝{ dormantX:{ kind:'umbra' } }（昇る蝕）＝足さない（弧 1 本＋面の明るさだけ）・蝕が蒼の装甲そのものに宿る・殻の面ぜんたいが蝕の進み具合の目盛りになる
//   ＝行動の種「闇が昇りきったら皆既が来る」（平常は既定の高さ → 前ぶれで c:[0,58] へ昇る → 月牙を一枚ずつ呑む → 呑みきったら装甲が開く）。
// 渡したもの＝0920/２５（build-gaika2-folder25.sh）＝1 無地／2 前回の 3／3 蝕の炉口／4 昇る蝕（推し）／5 昇る蝕・高い c:[0,58]／6 食。聞いたこと＝「もやもやがいちばん小さいのはどれ」。
// 実測（measure-gaika2-clutter.mjs・色の変わり目 /100px）＝無地 34.5／前回の繊月 35.2／蝕の炉口 35.7／昇る蝕 35.7／高い 35.4／食 34.9／参考＝6 枚 38.6。
//   闇の面は 2606 画素（殻の左の絵）・b (12,42,78) → d (6,18,42)。⚠️この暗い蒼どうしの差は私の目（画像の読み取り）では拾えなかった＝画素の値で確かめた。効き具合はユーザーの目が正。
// 試して外した＝食の小さい弧（c:[108,2], r:27＝等倍では「少しくびれた」程度）→ 既定を大きく浅い弧 c:[118,0], r:40 へ（副腕の支柱の根 [76,12] は弧の外 3.7）。
//   昇る蝕を稜線の内の面にも掛ける（高い版で腕と胴のすき間に赤い欠片が覗いた）→ 外の面だけに限った。
// 作らなかった＝座を閉じた蓋にする（ただのハッチ＝凄みが無い）・眼や紋章（目の罠・「太陽マークはダサい」）・日本刀の刃文（既製の様式）・殻の下を骨組みにする（退廃は損傷で示さない）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- パレット：蒼の漆の闇
rep("  b: '#0c2a4e',\n", "  b: '#0c2a4e',\n  d: '#06122a',                                                           // 一番下の座の検討：蒼の漆が蝕に呑まれた闇（q より暗い蒼・黒 k とは蒼みで分かれる）\n");

// ---- 殻：一番下の座を月でない絵にする口
rep("let shBandOff = 0;", "let shSeatX = null;   // 一番下の座を月でない絵にする口（dormantX に kind があるとき build4 が差し替える）\nlet shBandOff = 0;");
rep("  for (let y = SH_TOP; y <= SH_TOP + SH_LEN; y += 0.25) {\n    const [xi, xo0, tt] = shellEdges(y), xo = xo0, xr = polyX(SH_RIDGE, y);",
  "  const sx = xf ? null : shSeatX, bt = sx && sx.kind === 'bite' ? { c: sx.c || [118, 0], r: sx.r ?? 40 } : null, um = sx && sx.kind === 'umbra' ? { c: sx.c || [0, 70], r: sx.r ?? 115, rim: sx.rim ?? 'R', w: sx.w ?? 1.2, w2: sx.w2 ?? 1.1, dark: sx.dark || 'd', sink: sx.sink !== false } : null, UM_DIM = { R: 'r', A: 'R', G: 'Y', Y: 'y', W: 'G', s: 'f', f: 'm' }, ecl2 = !!(sx && sx.kind === 'band' && sx.eclipse);\n  for (let y = SH_TOP; y <= SH_TOP + SH_LEN; y += 0.25) {\n    const [xi, xo0, tt] = shellEdges(y), bdy = bt ? y - bt.c[1] : 0, xo = bt && Math.abs(bdy) < bt.r ? Math.min(xo0, bt.c[0] - Math.sqrt(bt.r * bt.r - bdy * bdy)) : xo0, xr = polyX(SH_RIDGE, y);");
rep("lit = s < 0 ? x > xr : x < xr, dIn = x - xi, dOut = xo - x, f =",
  "lit = s < 0 ? x > xr : x < xr, dIn = x - xi, dOut = bt ? Math.min(xo - x, Math.hypot(x - bt.c[0], y - bt.c[1]) - bt.r) : xo - x, dU = um ? um.r - Math.hypot(x - um.c[0], y - um.c[1]) : -9, f =");
rep("      else if (bandOn && f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';",
  "      else if (um && lit && dU >= 0 && dU < um.w) c = um.rim;                                            // 昇る蝕：闇の縁の一筋（稜線より外の面だけ＝内の面は腕と胴のすき間から欠片が覗くので掛けない）\n      else if (um && lit && dU >= um.w && dU < um.w + um.w2) c = 'r';                                         // 昇る蝕：縁のすぐ内側は灼けた暗い深紅（蝕刃と同じ「縁だけが灼ける」）\n      else if (um && um.sink && dU >= um.w && dOut >= 1.8 && dOut < 3.0 && tt > 0.08) c = UM_DIM[lit ? trim[0] : trim[1]] || (lit ? trim[0] : trim[1]);   // 昇る蝕：闇の中の縁取りは一段沈む\n      else if (um && um.sink && dU >= um.w && Math.abs(x - xr) < 0.55) c = lit ? 'm' : 'k';               // 昇る蝕：闇の中の稜線も一段沈む\n      else if (ecl2 && Math.floor(f) === 2 && fr < 0.22) c = fr < (sx.e0 ?? 0.035) || fr >= 0.22 - (sx.e1 ?? 0.035) ? (lit ? 'R' : 'r') : 'k';   // 蝕の炉口：芯が黒く縁だけ灼ける\n      else if (bandOn && f > 0.9 && fr < 0.075) c = lit ? 'A' : 'R';");
rep("      else c = lit ? (fr > 0.86 && Math.floor(f) + 1 !== shBandOff ? 'Q' : 'b') : 'q';",
  "      else if (um && lit && dU >= um.w) c = um.dark;                                                    // 昇る蝕：闇に呑まれた面\n      else c = lit ? (fr > 0.86 && Math.floor(f) + 1 !== shBandOff ? 'Q' : 'b') : 'q';");

// ---- build4：口を受ける（kind があれば繊月は描かず・'band' は段の光を残す）
rep("shBandOff = !open4 && dropS.includes('moonX') && !o.keepBand2 ? 2 : 0;",
  "shSeatX = saku4 && saku4.kind ? saku4 : null; shBandOff = !open4 && dropS.includes('moonX') && !o.keepBand2 && !(shSeatX && shSeatX.kind === 'band') ? 2 : 0;");
rep("moonX: P7(saku4 ? sakuSeal4(saku4) :", "moonX: P7(shSeatX ? R(g(MOON4_W, MOON4_H)) : saku4 ? sakuSeal4(saku4) :");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_SEATX_OK');
