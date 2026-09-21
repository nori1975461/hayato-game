// FB（2026-09-21 12:45〜13:08）「#昇る蝕について。月が満ちて蝕が開始されるのはいい。ただ、蝕開始後に蒼の装甲がわれてむき出しになる炉心が不気味。
//   破滅的要素と不気味さは違う。炉心のビジュアルを創造して #最終的に胸の装甲が開いて弱点が露出される設計だったか？その説明とビジュアルも。
//   #左肩の色と形状について。形状は棘ではなく、面上げで。色の候補は真紅、金、黄色に絞る。その三つの全体像をクリックで比較できるようにして。
//   弱点は割れた装甲の炉心ではなく、左肩にするか？それの善し悪しも検証して。」（途中の追記「蝕最終形態が平凡…」は本人が「無視して」と取り消した）
// 読み：昇る蝕の流れ（平常 → 前ぶれ → 皆既 → 装甲が開く）は据え置き。変えるのは「割れ目の奥に見える絵」だけ。
//       不気味の正体＝割れ目の奥の「炉の光の背骨一本＋13px ごとの短い椎骨」＝骨格（体の中身）の図像。黒い裂け目に赤い背骨＝開いた傷口に見える。
// 事実：承認済み（09-19 15:09）は「蒼の装甲は開閉式（閉＝守り／開＝射出と弱点露出）」まで。胸の合わせ目（閉じた炉の扉）を開く案は、
//       09-20 の「開」の第一稿で私が「まだ入れていない案」と書いただけ＝絵にしたことも承認されたことも無い。今回はじめて絵にする。
// 作り（どれも省略すれば従来どおり・既定は不変）：
//   ①o.openCore＝割れ目の奥の絵。'spine'＝椎骨を外し背骨の光だけ／'rack'＝光なし＝月牙の発射架（黒鉄の軌条一本と座だけ）／
//     { kind:'rim', tone:'gold'|'crimson' }＝光は縁だけ（炉心＝胸の側から来た光が、開いた外の板の内側の面だけを灼く）。
//   ②o.chest＝胸の炉の扉が開く＝{ tone:'gold'|'crimson', w（開口の半幅・既定 3.4）, bars（格子・既定 true）}。
//     いまの胸の中央の「縦一条の灼けた覗き窓」が左右へ割れ、奥の炉心が見える。⚠️紡錘形にしない（縦長の瞳＝目の罠）＝長方形の口＋格子＝炉の火格子と読ませる。
// 私の推し＝openCore:'rack'＋chest:{tone:'gold'}（resume-gaika-now.mjs の候補 68）。根拠＝不気味＝体の中身・骨・暗がりの小さな赤／破滅＝まぶしすぎる光・幾何学・一か所に集まった力。
//   黒と赤だけの最終形態で白金の光が胸に一か所だけ灯る＝「蒼神 → 骸 → 華」の華が骨でなく光になる。掌蝕「太陽を握りつぶして投げる」とつながる＝炉心は呑んだ太陽の光。殻は月牙の発射架（炉が殻に二つあるのは機械として不自然だった）。
// 試して外した＝炉心に中心→縁の階調（W→G→Y→y）＝光でなく金の円柱（固体）に見えた → 奥は W で白く飛ばし縁だけ G／深紅の炉心に 'A'（#ff7a6a）＝桃色の飴に見えた → 'R' の一色へ／格子なし＝白い板の貼り紙に見える（格子があると「光の前の影」になり開口と読める）。
// 実測（check-gaika2-core-diff.mjs）＝変わる画素は殻の領域と胸の中央だけ（spine 108／rack 1466／胸 256・その外 0）・閉じた姿では openCore は 0 画素。
// 弱点の置き場所の検証（render-gaika2-weak-diagram.mjs・本体 src/systems/boss.js の weakPoint／billiard.js）＝弱点は中心線上の円一つ（offY と左右の泳ぎだけ・横ずらしは無い）・玉は本体を貫通し「弱点の半径＋玉の半径」で当たる
//   （マオウ 38＋玉 22.7〜28.4≒63）。胸の炉心 (0,−18) と左肩 (32,−31) は 34.5 しか離れず、当たる範囲の 65.5% が重なる＝左肩へ移しても狙う場所はほぼ変わらない。私の判断＝弱点は胸の炉心（左肩は勧めない）。
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const rep = (a, b) => { a = a.replace(/\r\n/g, '\n'); b = b.replace(/\r\n/g, '\n'); if (t.split(a).length !== 2) throw new Error('NOT_UNIQUE(' + (t.split(a).length - 1) + ') ' + a.slice(0, 60)); t = t.replace(a, () => b); };

// ---- ①割れ目の奥の絵
rep("let shoOn = [0, 1, 2];",
  "let shoCore = null;   // 割れ目の奥の絵を差し替える口（build4 が o.openCore から差し替える。null＝従来＝背骨＋椎骨）\nlet shoOn = [0, 1, 2];");
rep("    let c = 'k';\n    if (u < 0.06 || u > 0.94) c = 'j';\n    else if (mid < 0.028 && tt > 0.1 && tt < 0.7) c = 'A';",
  "    let c = 'k';\n" +
  "    const ck = shoCore ? shoCore.kind || shoCore : null, cT = shoCore && shoCore.tone === 'crimson' ? ['A', 'R', 'r'] : ['W', 'G', 'Y'];\n" +
  "    if (u < 0.06 || u > 0.94) c = 'j';\n" +
  "    else if (ck === 'rack') c = mid < 0.022 && tt > 0.06 && tt < 0.8 ? 'm' : mid < 0.05 && tt > 0.06 && tt < 0.8 ? 'j' : 'k';   // 発射架＝光なし。黒鉄の軌条が一本、座をつなぐ\n" +
  "    else if (ck === 'rim') c = tt > 0.05 && tt < 0.82 ? (u > 0.905 ? cT[0] : u > 0.865 ? cT[1] : u > 0.815 && tt > 0.1 && tt < 0.74 ? cT[2] : 'k') : 'k';   // 光は縁だけ＝胸の側から来た光が外の板の内側の面だけを灼く\n" +
  "    else if (mid < 0.028 && tt > 0.1 && tt < 0.7) c = 'A';");
rep("    else if (rib && mid < 0.24 && tt > 0.08 && tt < 0.78) c = 'r';",
  "    else if (rib && !ck && mid < 0.24 && tt > 0.08 && tt < 0.78) c = 'r';   // 椎骨（'spine' では外す）");
rep("shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i));",
  "shoOn = [0, 1, 2].filter((i) => !drop.some((k) => ti[k] === i)); shoCore = o.openCore || null;");

// ---- ②胸の炉の扉
rep("torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, o.collar ? { ...(o.torsoOpt || (o.torso ? {} : ZAKU2_DEF)), collar: o.collar } : o.torsoOpt || (o.torso ? {} : ZAKU2_DEF))),",
  "torso: P7(torso4(o.torso || 'zaku2', o.torsoCH || CH4_DEF, (() => { const t0 = o.torsoOpt || (o.torso ? {} : ZAKU2_DEF); return o.collar || o.chest ? { ...t0, ...(o.collar ? { collar: o.collar } : {}), ...(o.chest ? { chest: o.chest } : {}) } : t0; })())),");
rep("  // 第41稿：扇の要＝V の先端に金の鋲ひとつ",
  "  if (opt.chest) {   // 胸の炉の扉が開く＝中央の覗き窓が左右へ割れ、奥の炉心が見える。長方形の口＋格子（紡錘形にすると縦長の瞳＝目になる）\n" +
  "    const hw = opt.chest.w ?? 3.4, T = opt.chest.tone === 'crimson' ? ['R', 'r', 'r', 'h'] : ['W', 'G', 'Y', 'y'], bars = opt.chest.bars === false ? [] : [-22.6, -15.4];\n" +
  "    for (let y = -30.4; y <= -6.6; y += 0.25) for (let x = -hw - 1.5; x <= hw + 1.5; x += 0.25) { const ax = Math.abs(x);\n" +
  "      const c = y < -29.4 || y > -7.6 ? (ax > hw + 0.7 ? 'm' : 'k') : ax > hw + 0.7 ? T[2] : ax > hw ? 'k' : bars.some((by) => Math.abs(y - by) < 0.7) ? 'k' : ax < hw * 0.72 ? T[0] : T[1];   // 奥は白く飛ばす（中心→縁の階調を付けると光でなく金の円柱＝固体に見えた）。扉の縁（開いた扉の小口）は炉心の光を受けて灼ける\n" +
  "      P(G, X(x), Y(y), c); }\n" +
  "    if (opt.chest.spill !== false) for (const s of [-1, 1]) for (let y = -26; y <= -14; y += 0.25) P(G, X(s * LVa), Y(y), T[3]);   // 光は縁にしか無い＝ルーバーの枠の内側の一列だけが炉心の光を受ける\n" +
  "  }\n" +
  "  // 第41稿：扇の要＝V の先端に金の鋲ひとつ");

fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_CORE_OK');
