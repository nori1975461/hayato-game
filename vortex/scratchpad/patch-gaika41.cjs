// 第41稿のパッチ（一度だけ当てる）。node patch-gaika41.cjs
//   第40稿 FB「なにこれ？違和感しかない。どうみてもおかしい」→ 質問への回答（09-19 17:10）
//     ①腰の文法＝A「腰を見せない樽胴」 ②第39稿の色の違和感＝明るい灰色の腰ブロック・黒い腹と横縞
//     ③第40稿の違和感＝紺の箱の形・箱が胸より広い・紺という色 ④胸＝必要なら大きさ・形も変えてよい
//   直し＝腹・金の帯・六角の腰ブロック・紺の受け座を全廃。肩の下から扇の付け根まで一枚の黒鉄で通す（絞らない・段をつけない・横線を引かない）。
//         扇の付け根の全幅（±36）は胴の裾が覆う＝六角の腰ブロックは第二案から外す（SKIRT_BIG_NH）。裾は浅い V＝刃が裾の下から放射状に出る（扇の要）
const fs = require('fs');
const F = __dirname + '/gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), CRLF = raw.includes('\r\n');
let src = raw.split('\r\n').join('\n');
const uniq = (s) => { const i = src.indexOf(s); if (i < 0 || src.indexOf(s, i + 1) >= 0) throw new Error('not unique: ' + s.slice(0, 60)); return i; };
const rep = (from, to) => { const i = uniq(from); src = src.slice(0, i) + to + src.slice(i + from.length); };

// 1) 胴のブロックを丸ごと差し替える（変えない行は元の文字列をそのまま拾う）
const a = uniq('const TOR4_W = 76, TOR4_H = 112, TOR4_OY = 58;');
const b = uniq('const HEAD4_W = 52');
const old = src.slice(a, b).split('\n');
const pick = (prefix) => { const l = old.filter((s) => s.startsWith(prefix)); if (l.length !== 1) throw new Error('pick: ' + prefix); return l[0]; };
const collar = pick('  for (const s of [-1, 1]) polyFill(G, Q([[s * 7, -32]');
const discs = pick('  for (const s of [-1, 1]) for (const [dx, dy] of [[35, -28], [36.5, -6]])');
const slitNote = pick('  // 第21稿：FB「胸の太陽マーク');
const slit = pick('  for (let y = -30; y <= -6; y += 0.25) for (let x = -2.6;');
const louver = pick('  for (const s of [-1, 1]) for (let y = -27; y <= -13;');
const NEW = [
  "const TOR4_W = 78, TOR4_H = 112, TOR4_OY = 58;   // 第41稿：樽胴の裾（半幅 37）と輪郭が入るよう幅 76→78",
  "// 第41稿：樽胴。第39稿＝胸／黒い腹（横縞）／金の帯／明るい灰の腰ブロックの四段重ね（主役機の胴）・第40稿＝紺の箱（胸より広い・別の材）はどちらも否決",
  "//   肩の下（y −12）から扇の付け根（y 25）まで、胴の側面は一本の直線で開く（折れ目が無い＝腰も尻も無い）。面の線は中央の合わせ目と胸の分割線の延長だけ",
  "//   中央の合わせ目＝炉の縦筋がそのまま裾まで下りる＝閉じた炉の扉（開閉式の「開」で開く場所）。裾は浅い V＝扇の要。逆さ扇の刃はこの下から放射状に出る",
  "//   style 'slab' は比較用（まっすぐな胴＋平らな台）",
  "const torso4 = (style = 'bell') => {",
  "  const G = g(TOR4_W, TOR4_H), X = (x) => x + TOR4_W / 2, Y = (y) => y + TOR4_OY, Q = (pts) => pts.map(([x, y]) => [X(x), Y(y)]);",
  collar,
  "  const FL0 = -12, BASE_Y = 25, TIP_Y = 42, BASE_W = 37, K = (BASE_W - 27.6) / (BASE_Y - FL0);",
  "  const flank = (y) => (style === 'slab' ? 27.6 : 27.6 + Math.max(0, y - FL0) * K);",
  "  const hwAt = (y) => (y < -33 ? 6 : y < -29 ? 14 + (y + 33) * 3.4 : style === 'slab' ? (y < 22 ? 27.6 : 35.5 - Math.max(0, y - 26) * 0.85) : y <= BASE_Y ? flank(y) : BASE_W * (TIP_Y - y) / (TIP_Y - BASE_Y));",
  "  for (let y = -40; y <= (style === 'slab' ? 38 : TIP_Y); y += 0.25) {",
  "    const w = hwAt(y), fw = flank(y), sx = 16 * fw / 27.6;",
  "    for (let x = -w; x <= w; x += 0.25) {",
  "      let c;",
  "      if (y < -33) c = (x + w) / (2 * w) < 0.3 ? 'm' : 'j';",
  "      else if (Math.abs(Math.abs(x) - sx) < 0.5) c = 'k';",
  "      else if (y < FL0 && Math.abs(x) > 17.5 && Math.abs(x) < 24.5 && [-25, -22, -19].some((vy) => Math.abs(y - vy) < 0.55)) c = 'k';",
  "      else c = x + w < 2.8 ? 'm' : w - x < 1.4 ? 'j' : x < -0.12 * fw ? 'j' : 'k';",
  "      P(G, X(x), Y(y), c);",
  "    }",
  "  }",
  discs,
  slitNote,
  slit,
  "  // 第41稿：合わせ目（炉の残り火は腹の途中で消える）",
  "  for (let y = -6; y <= (style === 'slab' ? 36 : TIP_Y - 4); y += 0.25) for (let x = -1.5; x <= 1.5; x += 0.25) P(G, X(x), Y(y), x < -0.6 ? 'm' : x <= 0.6 ? (y < 12 ? 'r' : 'k') : 'j');",
  louver,
  "  OUTLINE(G);",
  "  return R(G);",
  "};",
  "const TORSO4 = torso4();",
  "",
  ""].join('\n');
src = src.slice(0, a) + NEW + src.slice(b);

// 2) 六角の腰ブロックの無いスカート（第二案だけ。SKIRT_BIG は比較と記録のために残す）
const sk = src.split('\n').filter((s) => s.startsWith('const SKIRT_BIG = skirtTex('));
if (sk.length !== 1 || !sk[0].includes('SKB_KY, true,')) throw new Error('SKIRT_BIG');
rep(sk[0], sk[0] + "\n// 第41稿：六角の腰ブロック無し＝扇の付け根は胴の裾（浅い V）が覆う。FB「明るい灰色の腰ブロックに違和感」\n" + sk[0].replace('const SKIRT_BIG = ', 'const SKIRT_BIG_NH = ').replace('SKB_KY, true,', 'SKB_KY, false,'));

// 3) build4 に切り替えを足す
rep("pedestal: P7(limbs === 'none' ? SKIRT_BIG : SK_BLADES)", "pedestal: P7(limbs === 'none' ? (o.hub ? SKIRT_BIG : SKIRT_BIG_NH) : SK_BLADES)");
rep("torso: P7(TORSO4)", "torso: P7(o.torso ? torso4(o.torso) : TORSO4)");
rep("export const GAIKA2_BOOST = build4({ tag: '-boost', limbs: 'booster' });", "export const GAIKA2_SLAB = build4({ tag: '-slab', torso: 'slab' });   // 第41稿の比較用＝まっすぐな胴＋平らな台\nexport const GAIKA2_BOOST = build4({ tag: '-boost', limbs: 'booster' });");
fs.writeFileSync(F, CRLF ? src.split('\n').join('\r\n') : src);
console.log('PATCH41_OK');
