// 第48稿：既定を「骸華の左手（画面右）＝垂らして指を内へ巻いた手・前腕はほぼ真下（外へ 8°）」へ
const fs = require('fs');
const F = './gaika-candidates.mjs';
const raw = fs.readFileSync(F, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
const rep = (a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) { console.error('PATCH_MISS', a.slice(0, 70)); process.exit(1); } s = s.replace(a, () => b); };
rep("const FORE4_DEF = 20, HANDL4_DEF = 'clench';",
    "// 第48稿：FB（添付＝前腕がまっすぐ垂れ、指が内へゆるく巻いた手の素描）「添付資料のように主腕、肘、掌を書きなおして。ただし、直すのは蒼神骸華の左手だけ。右手は直さなくてよい」\n" +
    "//   骸華の左手＝画面右（s>0）。添付は右手の絵なので左右を反転。肩と肘の位置は据え置き・前腕は肘からほぼ真下（FORE4_DEF[1] = 35＝鉛直から外へ 8°。真下 42.9 は親指の付け根が胴の陰に 14px 隠れる）・\n" +
    "//   手は『握り潰す手（掌の蝕に指が折れる＝赤い輪の塊に見えた）』をやめ、鋼の手の甲＋外の高い拳頭から内の低い拳頭へ並ぶ四指が内へ巻く＋内の手前に垂れる親指。握り込んだ蝕は親指と人差し指の間の残り火だけ。\n" +
    "//   骸華の右手（画面左＝開いた手）はコードを通らない＝1 ドットも変えない。第47稿の腕は gaika2With({ foreTurn: 20, handL: 'clench' })\n" +
    "const FORE4_DEF = [20, 35], HANDL4_DEF = 'hang';");
fs.writeFileSync(F, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('PATCH_OK');
