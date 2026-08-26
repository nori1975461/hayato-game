// index.html に importmap を書き出して、**全モジュールのURLに ?v=BUILD を付ける**。
//
//   node vortex/dev/stamp-cache-bust.js
//
// 背景（実プレイFB「音楽が全然変わってない。私が見てるURLが違うのか？」の実調査）:
//   index.html がキャッシュを破っていたのは `src/main.js?v=...` の **1本だけ**だった。
//   main.js が import する30個あまりのモジュールはURLが不変なので、ブラウザは古いものを
//   使い続けられる。GitHub Pages は Cache-Control: max-age=600 を返すため、
//   ページを開きっぱなしにしていれば（ゲームは普通そうする）いつまでも更新されない。
//   結果として「新しい main.js ＋ 古い sound.js」という混ざった状態が成立する。
//
// なぜ importmap なのか:
//   import 文そのものに ?v= を書くと毎回30ファイルが差分に出る。importmap なら
//   **index.html の1ブロックだけ**で全モジュールを差し替えられる。
//   仕様上、相対指定子は「参照元URLで解決 → その絶対URLを importmap のキーと突き合わせ」の順で
//   処理されるので、キーを `./src/...` の相対で書けば公開先（/hayato-game/vortex/）でも
//   ローカル（/vortex/）でも同じ1ファイルが効く。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const INDEX = path.join(ROOT, 'index.html');

const ver = /BUILD\s*=\s*'([^']+)'/.exec(fs.readFileSync(path.join(SRC, 'data/version.js'), 'utf8'));
if (!ver) { console.error('version.js から BUILD を読めない'); process.exit(1); }
const BUILD = ver[1];

// src 配下の .js を全部集める
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) files.push(p);
  }
})(SRC);
files.sort();

const imports = {};
for (const f of files) {
  const rel = './' + path.relative(ROOT, f).split(path.sep).join('/');
  imports[rel] = rel + '?v=' + BUILD;
}

const NL = '\n';
const block = '  <!-- 自動生成: node vortex/dev/stamp-cache-bust.js -->' + NL
  + '  <!-- 全モジュールに ?v= を付けてキャッシュを確実に破る（main.js だけでは足りない） -->' + NL
  + '  <script type="importmap">' + NL
  + JSON.stringify({ imports }, null, 2).split(NL).map((l) => '  ' + l).join(NL) + NL
  + '  </script>';

let html = fs.readFileSync(INDEX, 'utf8');

// 既存の importmap ブロック（コメント2行込み）を丸ごと置換、無ければ Phaser の後ろへ挿入
const RE = /[ \t]*<!-- 自動生成: node vortex\/dev\/stamp-cache-bust\.js -->[\s\S]*?<\/script>/;
if (RE.test(html)) {
  html = html.replace(RE, block);
} else {
  html = html.replace(/([ \t]*<script src="lib\/phaser\.min\.js"><\/script>)/,
    '$1' + NL + block);
}
// main.js 側の ?v= も同じ版に揃える（importmap は <script src> には効かないため両方要る）
html = html.replace(/(src="src\/main\.js\?v=)[^"]*(")/, '$1' + BUILD + '$2');

fs.writeFileSync(INDEX, html, 'utf8');
console.log(`stamp-cache-bust: BUILD=${BUILD} / モジュール ${files.length} 本に ?v= を付与`);
