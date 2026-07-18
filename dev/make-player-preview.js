// game.jsからPALETTEとSPRITES定義を抽出して、クラスチェンジ8形態のプレビューHTMLを生成
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.argv[2], 'utf8');

const palette = src.match(/const PALETTE = \{[\s\S]*?\};/)[0];
const sprites = src.match(/const SPRITES = \{[\s\S]*?\n\};/)[0];

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>クラスチェンジ プレビュー</title>
<style>
  body { background: #1a1c2c; color: #f4f4f4; font-family: sans-serif; text-align: center; }
  .row { display: flex; justify-content: center; gap: 26px; flex-wrap: wrap; margin-top: 24px; }
  canvas { image-rendering: pixelated; background: #29366f; border: 2px solid #ffcd75; }
  h3 { margin: 8px 0 2px; color: #ffcd75; font-size: 15px; }
  p { margin: 0; color: #94b0c2; font-size: 12px; }
</style>
</head>
<body>
<h1>クラスチェンジ（ぶき8レベルごとに進化）</h1>
<div class="row" id="row"></div>
<script>
${palette}
${sprites}
const forms = [
  ['player0', 'ぼうけんしゃ', 'ぶきLv1〜'],
  ['player1', 'せんし', 'ぶきLv9〜（バンダナ＋ベルト）'],
  ['player2', 'ナイト', 'ぶきLv17〜（銀のかぶと＋盾）'],
  ['player3', 'ゴールドナイト', 'ぶきLv25〜（白銀の兜＋金鎧＋マント）'],
  ['player4', 'ひかりのせんし', 'ぶきLv33〜（赤の兜＋赤の盾のナイト）'],
  ['player5', 'でんせつのゆうしゃ', 'ぶきLv41〜（発光する白銀＋白銀のつばさ）'],
  ['player6', 'せいなるゆうしゃ', 'ぶきLv49〜（黄金の光輪＋白いつばさ）'],
  ['player7', 'しんわのゆうしゃ', 'ぶきLv57〜（虹色の星のかがやき）'],
  ['player8', 'てんくうのおうじゃ', '12万点〜（とがった金の王冠＋水色の翼）'],
  ['player9', 'せいれいおう', '14.5万点〜（緑のツノ冠＋浮かぶ光の玉＋広がるローブ）'],
  ['player10', 'りゅうしんのゆうしゃ', '17.3万点〜（大きな竜のツノ＋赤いうろこ鎧＋尾）'],
  ['player11', 'そうせいのしんおう', '20.4万点〜（星の冠＋光のリング＋紫の宇宙ローブ）'],
  ['player12', 'ぜったいのかみ', '23.8万点〜（八方の光すじ＋金と白の神身）'],
];
const row = document.getElementById('row');
for (const [key, name, desc] of forms) {
  const card = document.createElement('div');
  const cv = document.createElement('canvas');
  cv.width = 12 * 10; cv.height = 12 * 10;
  const c = cv.getContext('2d');
  const spr = SPRITES[key];
  for (let r = 0; r < spr.length; r++) {
    for (let col = 0; col < spr[r].length; col++) {
      const ch = spr[r][col];
      if (ch === '.') continue;
      c.fillStyle = PALETTE[ch];
      c.fillRect(col * 10, r * 10, 10, 10);
    }
  }
  card.appendChild(cv);
  const h = document.createElement('h3'); h.textContent = name;
  const p = document.createElement('p'); p.textContent = desc;
  card.appendChild(h); card.appendChild(p);
  row.appendChild(card);
}
</script>
</body>
</html>`;

const out = path.join(path.dirname(process.argv[1]), 'player-preview.html');
fs.writeFileSync(out, html);
console.log('written: ' + out);
