// game.jsからPALETTEとSPRITES定義を抽出してプレビューHTMLを生成する
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.argv[2], 'utf8');

const palette = src.match(/const PALETTE = \{[\s\S]*?\};/)[0];
const sprites = src.match(/const SPRITES = \{[\s\S]*?\n\};/)[0];

// BOSS_TYPES から sprite→remap の対応表を作る。
// これを反映しないと、色ちがい（remap）を持つボスがずかん・戦闘中と違う色で表示されてしまう
// （例: ガルーダは赤スプライトをremapで金色に変える。remap無視だと赤いまま＝実物と不一致）。
const BOSS_TYPES = eval('(' + src.match(/const BOSS_TYPES = (\[[\s\S]*?\n\]);/)[1] + ')');
const remaps = {};
for (const b of BOSS_TYPES) { if (b && b.sprite && b.remap) remaps[b.sprite] = b.remap; }

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>ボスプレビュー</title>
<style>
  body { background: #1a1c2c; color: #f4f4f4; font-family: sans-serif; text-align: center; }
  .row { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin-top: 20px; }
  canvas { image-rendering: pixelated; background: #29366f; border: 2px solid #ffcd75; }
  h3 { margin: 8px 0 2px; color: #ffcd75; }
  p { margin: 0; color: #94b0c2; font-size: 13px; }
</style>
</head>
<body>
<h1>神話ボス キャラデザ確認</h1>
<div class="row" id="row"></div>
<script>
${palette}
${sprites}
const REMAPS = ${JSON.stringify(remaps)};
// game.js の shade()/drawSprite(hd=true) と同じロジック。ずかんの見た目を忠実に再現する
const shadeCache = {};
function shade(hex, f) {
  const key = hex + f;
  if (!shadeCache[key]) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    shadeCache[key] = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  return shadeCache[key];
}
const bosses = [
  ['orochi', 'ヤマタノオロチ', '日本神話 St.1'],
  ['trex', 'ティラノサウルス', '恐竜の王 St.2'],
  ['hydra', 'ヒュドラ', 'ギリシャ神話 St.3'],
  ['griffin', 'グリフォン', '伝説の魔獣 St.4'],
  ['kraken', 'クラーケン', '海の魔物 St.5'],
  ['gigantes', 'ギガンテス', '一つ目の巨人族 St.6'],
  ['anubis', 'アヌビス', 'エジプト神話 St.7'],
  ['sphinx', 'スフィンクス', 'エジプト神話 St.8'],
  ['hades', 'ハデス', 'ギリシャ神話 St.9'],
  ['surtr', 'スルト', '北欧神話 St.10'],
  ['ymir', 'ユミル', '北欧神話 St.11'],
  ['fenrir', 'フェンリル', '北欧神話 St.12'],
  ['megalodon', 'メガロドン', '深海の王者 St.13'],
  ['loki', 'ロキ', '北欧神話 St.14'],
  ['enma', 'エンマだいおう', '日本神話 St.15'],
  ['zeus', 'ゼウス', 'ギリシャ神話 St.16'],
  ['amaterasu', 'アマテラス', '日本神話 St.17'],
  ['behemoth', 'ベヒーモス', '邪竜の側近 St.18'],
  ['reaper', 'デスサイザー', '邪竜の側近 St.19'],
  ['dragon', 'じゃりゅうジギムント', '最強の邪竜 St.20'],
  ['vritra', 'ヴリトラ（専用スプライト）', 'インド神話 Phase4'],
  ['garuda', 'ガルーダ（専用スプライト）', 'インド神話 St.21'],
  ['balor', 'バロール（専用スプライト）', 'ケルト神話 St.22'],
  ['tezcatlipoca', 'テスカトリポカ（専用スプライト）', 'アステカ神話 St.23'],
  ['humbaba', 'フンババ（専用スプライト）', 'メソポタミア神話 St.24'],
  ['seiryu', 'セイリュウ（専用スプライト）', '中国神話 St.26'],
  ['tiamat', 'ティアマト（専用スプライト・荘厳）', 'メソポタミア神話 最終ボス'],
  ['rairyu', 'ライリュウ（雷龍・専用スプライト）', 'てんくうのはおう 真の最終ボス St.28'],
];
const row = document.getElementById('row');
for (const [key, name, origin] of bosses) {
  const card = document.createElement('div');
  const cv = document.createElement('canvas');
  const BOX = 192;
  cv.width = BOX; cv.height = BOX;
  const c = cv.getContext('2d');
  const spr = SPRITES[key];
  const cols = Math.max(...spr.map(r => r.length));
  const rows = spr.length;
  // スプライトの行数・列数が異なっても同じ枠(192x192)に収まるよう自動フィット
  const cell = Math.max(1, Math.floor(Math.min(BOX / cols, BOX / rows)));
  const offX = Math.floor((BOX - cols * cell) / 2);
  const offY = Math.floor((BOX - rows * cell) / 2);
  const remap = REMAPS[key] || null;
  const useHd = cell >= 2; // ずかんは hd=true で描画されるので合わせる
  for (let r = 0; r < spr.length; r++) {
    for (let col = 0; col < spr[r].length; col++) {
      const ch = spr[r][col];
      if (ch === '.') continue;
      const color = (remap && remap[ch]) || PALETTE[ch];
      const cx = offX + col * cell, cy = offY + r * cell;
      c.fillStyle = color;
      c.fillRect(cx, cy, cell, cell);
      if (useHd) {
        const t = Math.max(1, Math.floor(cell * 0.28));
        if (r === 0 || spr[r - 1][col] === '.' || spr[r - 1][col] !== ch) {
          c.fillStyle = shade(color, 1.3);
          c.fillRect(cx, cy, cell, t);
        }
        if (r === spr.length - 1 || spr[r + 1][col] === '.' || spr[r + 1][col] !== ch) {
          c.fillStyle = shade(color, 0.72);
          c.fillRect(cx, cy + cell - t, cell, t);
        }
        if (col === 0 || spr[r][col - 1] === '.') {
          c.fillStyle = shade(color, 1.18);
          c.fillRect(cx, cy, Math.max(1, Math.floor(t / 2) + 1), cell);
        }
      }
    }
  }
  card.appendChild(cv);
  const h = document.createElement('h3'); h.textContent = name;
  const p = document.createElement('p'); p.textContent = origin;
  card.appendChild(h); card.appendChild(p);
  row.appendChild(card);
}
</script>
</body>
</html>`;

const out = path.join(path.dirname(process.argv[1]), 'boss-preview.html');
fs.writeFileSync(out, html);
console.log('written: ' + out);
