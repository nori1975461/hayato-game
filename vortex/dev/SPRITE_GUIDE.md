# SPRITE_GUIDE.md — ボルモン！ v2 スプライト制作ガイド

このファイルは開発用（dev文書）。ゲーム本体（Phaser側）からは参照されない。
`vortex/src/data/monsters.js` / `enemies.js` のスプライトを描く・直すときの唯一の基準。
出典は `dev/PROTOTYPE_SPEC.md` §10.5「スプライト・ビジュアル v2」。

## スプライト形式（HAYATO式テキストグリッド）

```js
sprite: {
  palette: { a: '#7fd8ff', k: '#1b3b5f', ... }, // 1文字キー → #RRGGBB
  rows: [ '....aaaa....', ... ],                  // '.'=透明・全行同長
}
```

- `'.'` は透明。palette に無い文字を `rows` に入れない。
- 全行が同じ長さ（矩形）。幅・高さともに **8〜16** の範囲（`validate-data.js:33-35`）。
- 1セル=1px。`Boot.makeGrid` が `generateTexture` で一度だけテクスチャ化するため、ランタイムコストは無い。
- 黒 `#000000` 禁止・純彩度100%禁止（ネオン背景 `#0a0a1e` で沈む/飛ぶため）。暗色は紺・茶系で作る。

## サイズ体系（§3.3 を上書き。これが正典）

| 対象 | グリッド | setScale | 実表示 |
|---|---|---|---|
| 仲間（基本形） | 16×16 | 2.5 | 40px |
| 仲間（進化形） | 16×16 | 3.0 | 48px |
| 仲間（合成） | 16×16 | 3.0 | 48px＋glowScale 2.2 |
| 敵（通常） | 8〜12幅 | 2 | 据え置き |
| エリート | 同上 | 4 | 据え置き |
| ボス | 16×16 ×2枚重ね | 6 | 96px |
| 主人公 | 12×14 | 2 | 据え置き（radius 7 も据え置き） |

「大きく見せる」＝グリッド上限16×16化 ＋ setScale増 の組合せでのみ実現する。当たり判定（radius / hitRadius）は原則いじらない。

## palette キー命名規約（固定）

| キー | 用途 | 備考 |
|---|---|---|
| `a` | 本体メイン色 | def の `color` と同一か近縁色 |
| `d` | `a` の暗色（シェード） | 明度−25%目安。**最下端1〜2行と足裏に必ず使う** |
| `w` | 白（腹・ハイライト・歯） | 目のハイライトは必ず `w` |
| `k` | 目・口の紺 | 仲間は全員 `#1b3b5f` に統一（世界観の統一感） |
| `p` | ほっぺ | 仲間のみ必須。ピンク系（電気系は赤系可） |
| `s`/`o`/`g`/`m`/`y`/`c` | アクセント（星・内耳・金・マゼンタ・虹 等） | 1体につきアクセントは2キーまで |

- palette 総数は **仲間6色以内・進化/ボスのみ7色可**。

## ゆるふわ造形ルール（仲間6種共通・厳守）

1. **シルエット＝まる**。体幅はグリッド幅の70%以上。角は2段階の階段で丸める。鋭い1px突起は耳・トゲ・尾のチャームポイントだけに許可。
2. **目＝2×2 の紺（`k`＝#1b3b5f 全員統一）＋左上1pxの白ハイライト（`w`）**。つり目禁止。
3. **ほっぺ（`p`）＝全員必須**。目の外側下に2×1のピンク系。
4. **口は小さく（1〜2px）**。ピカビットのように前歯1px（`w`）を混ぜてよい。
5. **黒アウトラインなし**（発光世界でグローが輪郭を作る）。代わりに本体暗色（`d`）で下端1〜2行をシェード、腹に白〜明色（`w`）パッチ。
6. **手足は短く胴に密着**。2×2の短足スタブを左右対称に。体の内部に意図しない `.`（透明穴）を作らない。

シェーディングは「下と右に `d`、腹に `w`」の左上光源で全キャラ統一。左右対称を基本とし、非対称はしっぽ等チャーム1箇所まで。

## 敵の対比ルール（かわいいが、ちょっと悪そう）

仲間と描き分けて「敵だ」と一目で分かるようにする。

- **ほっぺ禁止**（`p` を使わない）。
- **まゆ or 特徴的な目＋表情必須**（V字太まゆ・つり目・片目ウインク・キリッと縦長目 など）。
- パステルでもよいが、角ばり・トゲ・暴走感・不気味さのどれかを1つ持たせる。
- 表示スケール2倍・radius 値は変更しない（見た目と当たり判定の一致を維持）。

## 描く手順チェックリスト

1. グリッド確定：仲間・進化・ボス＝16×16、敵＝8〜12幅。
2. 全行同長・palette外文字なし・体内部に穴なしを目視。
3. 左右対称を基本、非対称はチャーム1箇所まで。
4. 仲間はゆるふわ6項、敵は対比ルールを適用。
5. 描いたら必ず `node vortex/dev/validate-data.js` を実行（矩形性・幅高8〜16・palette検証）。
6. **完成報告前にPNG化または実表示で目視確認**（HAYATO本体の教訓：テキストグリッドの見た目チェックを省略しない）。手段はブラウザ `?autotest=1` の実表示スクショでよい。

---

## 完成グリッド例

### 仲間・基本形：starpuppy（16×16・6色）

星型の耳が頭と一体化、白腹、右腰に星しっぽ、下端 `d` シェード。

```
palette: { a:'#7fd8ff', d:'#4a9fd8', w:'#ffffff', k:'#1b3b5f', p:'#ffb3d9', s:'#ffe066' }
...s........s...
..sss......sss..
..ssaaaaaaaass..
...aaaaaaaaaa...
..aaaaaaaaaaaa..
..aaaaaaaaaaaa..
..aawkaaaawkaa..   ← 目 wk（左上ハイライト＋紺）
..aakkaaaakkaa..
..ppaaakkaaapp..   ← ほっぺ pp ＋ 小さな口 kk
..aaawwwwwwaaas.   ← 白腹＋右腰の星しっぽ s
..aaawwwwwwaaass
...aawwwwwwaa...
...aaaaaaaaaa...
....aaddddaa....
....aa....aa....   ← 短足スタブ
....dd....dd....   ← 足裏 d
```

### 仲間・SHOT：pikabit（16×16・6色）

長耳＋内耳 `o`、赤い電気ほっぺ `p`、口に前歯 `w`（`kw`）。

```
palette: { a:'#ffe066', d:'#d8a838', w:'#ffffff', k:'#1b3b5f', p:'#ff8f8f', o:'#ff9e66' }
...aa......aa...
..aoa......aoa..
..aoa......aoa..
..aoa......aoa..
..aaa......aaa..
...aaaaaaaaaa...
..aaaaaaaaaaaa..
..aawkaaaawkaa..
..aakkaaaakkaa..
..ppaaakwaaapp..   ← ほっぺ＋前歯 kw
..aaawwwwwwaaa..
..aaawwwwwwaaa..
...aawwwwwwaa...
...aaaaaaaaaa...
....aa....aa....
....dd....dd....
```

### 進化例：togeron → togeking（16×16・7色）

進化はコンセプトを1段強める（金トゲ王冠・足裏を金に）。`evo.ovr` は数値上書きのみ（新メカニクス不採用）。

```
palette: { a:'#9dff70', d:'#5fbf3f', w:'#ffffff', k:'#1b3b5f', p:'#ffb3d9', g:'#ffd23f' }
..g.g.g..g.g.g..   ← 金トゲが王冠に
..gggggggggggg..
.aaaaaaaaaaaaaa.
...（顔は基本形を継承）...
....gg....gg....
....gg....gg....
```

### 主人公・Stage3：ボルテックスマスター（16×16・7色）

三ツ星クラウン→金バンド→発光バイザー→胸エンブレム→金ベルト→裾広がりマント→金ブーツ。

```
palette: { g:'#ffd23f', h:'#2b2f77', s:'#ffcf9e', c:'#10203a', a:'#4de1c0', m:'#ff6ec7', v:'#ffffff' }
.....g.gg.g.....
....gggggggg....
....hhhhhhhh....
...hhhhhhhhhh...
...hssssssssh...
...hvcvvvvcvh...   ← 発光バイザー内に目 c
....sssccsss....
..mmaaaaaaaamm..   ← 肩マント m
..maaaggggaaam..   ← 胸エンブレム g
..maaaaaaaaaam..
..maaggggggaam..   ← 金ベルト
.mmaaaaaaaaaamm.
.mm.aaa..aaa.mm.
mm..aaa..aaa..mm   ← 大マントの裾
....ccc..ccc....
....ggg..ggg....   ← 金ブーツ
```

### 敵の再デザイン例：zunzun（12×11）

対比ルール適用：ほっぺ無し・V字太まゆ・への字口・頭上のぷんぷんマーク。

```
palette: { a:'#a06bff', c:'#1b1030', b:'#ffffff' }
.c.c....c.c.   ← ぷんぷんマーク
..aaaaaaaa..
.aaaaaaaaaa.
.accaaaacca.   ← V字太まゆ cc
.acbaaaabca.   ← 目
.aaaaaaaaaa.
.aaaccccaaa.   ← への字口
.aacaaaacaa.
.aaaaaaaaaa.
..aaaaaaaa..
..a.a..a.a..   ← 踏ん張る短足
```

### ボス：ウズキング（16×16 ×2枚重ね・setScale 6＝96px）

「公転」の主人公に対する「渦（VORTEX）」の王。1枚では大迫力が出ないので2枚重ねにする。

- `boss_uzu_swirl`：マゼンタ `#ff6ec7`＋紫 `#7a3bf0` のS字渦（180°回転対称）。本体エンティティで `rotation += dt * 1.2` 常時回転。
- `boss_uzu_face`：金の王冠 `#ffd23f`＋大きな目＋にやり笑い＋キバ1本＋短腕。非回転・本体に追随する image。怖すぎ禁止（小6向け）。

データは `enemies.js` に `export const BOSS = { id:'uzuking', name:'ウズキング', color:'#ff6ec7', sprites:{ swirl:{...}, face:{...} } }`。**ENEMIES 配列には入れない**（出現プール／重み検証を汚さないため）。Boot.js は `boss_uzu_swirl` / `boss_uzu_face` でテクスチャ化する。
