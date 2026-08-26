// ビルド版番号。タイトル画面の左下に出す。
//
// なぜ要るか：実プレイFB「音楽が全然変わってない。私が見てるURLが違うのか？」。
// 調べたところ **URLもpushも正しく、サーバ上のコードは確かに新しかった**。
// にもかかわらず古い音が鳴りうる理由が index.html の作りにあった：
//   <script type="module" src="src/main.js?v=..."> でキャッシュを破っているのは **main.js だけ**で、
//   main.js が import する30個あまりのモジュール（sound.js / balance.js / boss.js …）は
//   URLが一度も変わらないので、ブラウザが古いものを再利用しうる。
//   ＝「新しい main.js ＋ 古い sound.js」という混ざった状態が作れてしまう。
//
// 対策は2つ入れてある：
//   ① dev/stamp-cache-bust.js が index.html に importmap を書き出し、**全モジュールに ?v= を付ける**
//   ② この版番号をタイトルに表示する。画面の数字が下の BUILD と違えば、それは間違いなくキャッシュ。
//
// ⚠️ この値を書き換えたら必ず `node vortex/dev/stamp-cache-bust.js` を実行して index.html を作り直す。
export const BUILD = '20260826-5';
