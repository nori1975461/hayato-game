# hayato-game — 「HAYATO ― 邪竜と20の世界 ―」

小学5年生の息子向けの360度回転武器アクション（ヴァンパイアサバイバー式）。ビルド不要のvanilla JS。開発方針は**「全体的に派手に」「ポップで明るい音」「アイデアはどんどん取り入れてよい」**。

## 構成

- `index.html` + `style.css` + `game.js`（Canvas 480×360・ドット絵・PC専用・矢印キー/WASD操作）
- 外部ライブラリなし。効果音・BGMはWeb Audio APIで合成
- `dev/` — 開発用ツール（下記。ゲーム本体からは参照されない）

## デプロイ

- **`git push origin main` だけでGitHub Pagesに自動反映**（ビルドなし・`npm run deploy` 不要）
- 公開URL: https://nori1975461.github.io/hayato-game/
- **game.jsを変更したら、index.html の `game.js?v=YYYYMMDD-n` バージョンクエリの番号を必ず上げる**（ブラウザキャッシュ対策。上げ忘れると修正が反映されない）
- デプロイ反映の確認は curl で公開URLの内容grep一致を実測する

## push前の必須チェック

```bash
node dev/smoke-test.js game.js           # 疑似DOMスモークテスト17項目（実行時エラー検出）
node dev/validate-sprites.js game.js     # スプライト行長の検証
node dev/sigmund-death-test.js game.js   # 最終ボス撃破シネマティックの4シナリオ（実ダメージ経路）
```

- 構文チェックだけでは実行時エラーは捕まえられない（タイトル画面クラッシュの教訓）
- 演出系は「発動するか」だけでなく「**見える位置で描画されるか**」まで検証する（空中トドメでシネマティックが画面外再生になったバグの教訓）
- ボスプレビューは `node dev/make-preview.js`・主人公プレビューは `node dev/make-player-preview.js` で再生成

## ゲームバランスの恒久原則（ユーザー指示・変更時は要確認）

- ダブル攻撃（回転+弾）はhybrid武器（炎の剣/ジャベリン/ドラゴンキラー/エクスカリバー/インフィニティセーバー）のみ。多用しない（火力過多防止）
- hybrid武器の弾はボスへダメージ50%（ボスは接近戦が基本）。純遠距離武器は通常ダメージ。弱点コア持ちボスは半減の例外
- 音の好み・演出の好みは文章で議論せず、ゲーム内切り替えテストモードで選んでもらうのが最速

## Git

共通ルール（毎回push・add -A回避等）は `~/.claude/CLAUDE.md` に従う。リポジトリ: https://github.com/nori1975461/hayato-game

## 仕様の記録

恒久仕様・次のステップはメモリ（`project_overview.md`）に記録している。コミット単位の変更履歴はgit historyが正典であり、メモリには書かない。
