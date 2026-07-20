# ボルモン！ 〜VORTEX MONSTERS〜 テストモード仕様書（PROTOTYPE_SPEC）

この文書がテストモード実装の**正典**。実装担当（builder）はコードを書く前に必ず全文を読むこと。
数値・API・ファイル分担はこの文書に従い、独断で変更しない。この文書に無い細部（スプライトの絵柄・音色の質感など）は担当者のセンスで決めてよい。

## 0. 絶対規則（違反＝作業失敗）

1. `vortex/` 配下以外のファイルを作成・変更・削除しない（ルートの index.html / game.js / style.css / dev/ はHAYATO本体。触らない）
2. gitコマンドを一切実行しない（コミットはオーケストレーターが行う）
3. `Math.random()` 直呼び禁止。乱数は必ず `src/core/rng.js` の rng インスタンス経由
4. 日本語を含むファイルは UTF-8（BOMなし）。Write/Edit ツールで書く（PowerShell の Set-Content 等で書かない）
5. 外部読み込み禁止（CDN・画像ファイル・音声ファイル・Webフォント全て不可）。Phaser は同梱の `lib/phaser.min.js` のみ
6. Phaser は index.html の `<script>` でグローバル読み込み。ES Module から `import Phaser` しない（`window.Phaser` を参照）
7. APIキー等のシークレット・個人情報をコードに書かない（公開リポジトリ）
8. すべてのパスは相対パス（GitHub Pages のサブパス `/hayato-game/vortex/` で動く必要がある）

## 1. ゲーム概要

- 『ボルモン！』＝捕まえたモンスターが自分の周囲を**公転**して戦う収集型サバイバーアクションのテストモード（垂直スライス）
- 論理解像度 **640×360**・pixelArt・PC専用（矢印キー/WASD）・1ラン**5分**
- 核となる体験：「捕まえる→周りを回る仲間が増える→どんどん派手になる」
- 見た目の方向性：ネオン宇宙。暗い背景（#0a0a1e）に発光体が映える。加算合成グロー多用
- 音の方向性：ポップで明るい（HAYATO文化を継承）。WebAudio合成のみ

## 2. ファイルオーナー表

| ファイル | 担当 | 備考 |
|---|---|---|
| `vortex/src/core/rng.js` | builder-① | mulberry32 |
| `vortex/src/data/balance.js` | builder-① | §4のリテラルをそのまま採用 |
| `vortex/src/data/monsters.js` | builder-① | 6種＋プレイヤーのスプライト設計込み |
| `vortex/src/data/enemies.js` | builder-① | 3種のスプライト設計込み |
| `vortex/dev/validate-data.js` | builder-① | §8 |
| `vortex/dev/test-core.js` | builder-① | §8 |
| `vortex/src/audio/sound.js` | builder-② | §3.5 |
| `vortex/index.html` / `vortex/style.css` | builder-③ | |
| `vortex/src/main.js` | builder-③ | |
| `vortex/src/scenes/Boot.js` / `Title.js` / `Run.js` / `Result.js` | builder-③ | |
| `vortex/src/systems/orbit.js` / `spawner.js` / `capture.js` / `levelup.js` | builder-③ | |
| `vortex/src/ui/hud.js` | builder-③ | エラーバナー含む |

- 他人のファイルは**変更禁止**（Fixフェーズの修正担当のみ例外）
- `data/` と `core/` は **Phaser非依存**（node で import して実行できること）

## 3. モジュール契約

### 3.1 core/rng.js

```js
export function createRng(seed) // seed: 正の整数
```

返り値オブジェクトのAPI（mulberry32ベース・全て決定的）:

- `random()` → [0,1) の float
- `range(min, max)` → [min,max) の float
- `int(min, max)` → min〜max の整数（両端含む）
- `pick(arr)` → 配列から1要素
- `chance(p)` → 確率 p (0〜1) で true
- `shuffle(arr)` → 新しいシャッフル済み配列（元配列は破壊しない）

同一 seed → 完全に同一の乱数列（test-core.js で検証する）。

### 3.2 data スキーマ

`monsters.js` は `export const MONSTERS = [...]` と `export const PLAYER_SPRITE = {...}`。
`enemies.js` は `export const ENEMIES = [...]`。

```js
// MONSTERS の1要素
{
  id: 'starpuppy',          // 英小文字
  name: 'スターパピー',
  rarity: 'N',              // 'N' | 'R' | 'SR'
  archetype: 'SLASH',       // 'SLASH' | 'SHOT' | 'BEAM' | 'FIELD'
  color: '#7fd8ff',         // テーマ色（グロー・パーティクルに使用）
  baseDamage: 4,
  sprite: { palette: {...}, rows: [...] },   // §3.3
}

// ENEMIES の1要素
{
  id: 'zunzun',
  name: 'ズンズン',
  movement: 'chase',        // 'chase' | 'sine' | 'charge'
  color: '#a06bff',
  hp: 10, speed: 40, damage: 8, radius: 7,   // radius=表示スケール適用後の当たり半径(px)
  sprite: { palette: {...}, rows: [...] },
}
```

### 3.3 スプライト形式（HAYATO式テキストグリッド）

```js
sprite: {
  palette: { a: '#7fd8ff', b: '#ffffff', c: '#1b3b5f' },  // 1文字→色
  rows: [
    '....aaaa....',
    '...abbbba...',
    // …
  ],
}
```

- `.` は透明。全行同じ長さ（矩形）。幅・高さとも 8〜16
- palette に無い文字を rows に使わない（validate-data.js が検証）
- 表示スケール：モンスター・敵・プレイヤー=2倍、エリート=4倍
- 各モンスターは名前と型が伝わる**個性あるデザイン**にする（例：スターパピー=星型の耳の子犬、ネオンワーム=発光する節）

### 3.4 systems の責務（builder-③内部のモジュール分割）

- `orbit.js` — 仲間の公転位置更新・SLASH接触判定・SHOT発射・BEAM発動・FIELD適用。パーティ配列を受け取り毎フレーム更新
- `spawner.js` — ウェーブ進行（§4 wave）・敵の出現位置（カメラ外周20〜60px）・種別抽選（§4 spawnPhases）・エリート出現・敵cap制御
- `capture.js` — スターコアのドロップ抽選・拾得処理（仲間化 or 満員時コイン）・合成祭壇のロジック
- `levelup.js` — XP管理・レベルアップ判定・3択ドラフト抽選と適用
- いずれも Phaser のシーン/グループ参照は Run.js から注入する（直接 new しない）。関数ベースでもクラスでも可

### 3.5 audio/sound.js

```js
export const Sound = {
  init(),         // AudioContext生成。ユーザー操作後に呼ぶ。多重呼び出し安全
  get ready(),    // boolean
  sfx(name),      // init前に呼ばれても例外を出さない（無音で無視）
  startBgm(), stopBgm(),
  toggleMute(),   // 戻り値: ミュート中なら true
}
```

SFX名（全て実装すること）: `hit` `shoot` `beam` `pickup` `capture` `levelup` `fusion` `elite` `altar` `select` `gameover` `clear`

- 音色はポップで明るく。矩形波/三角波＋短いエンベロープ基調。capture/fusion はキラキラした上昇系で気持ちよく
- BGM：長調・約128BPM・4〜8小節ループ（アルペジオ＋ベース＋ノイズ打楽器程度）。マスターゲイン 0.25 で控えめに
- 外部ファイル禁止。全て OscillatorNode / GainNode / ノイズバッファで合成

## 4. バランス数値（正典）

### 4.1 balance.js のリテラル

以下を `src/data/balance.js` の `export const BALANCE = {...}` として**そのまま**採用する（値の変更禁止）:

```js
export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 300,
  player: { hp: 100, speed: 120, invulnSec: 0.8, radius: 7 },
  orbit: { baseRadius: 48, baseAngularDeg: 120, maxSlots: 5 },
  archetypes: {
    SLASH: { tickSec: 0.25, hitRadius: 14 },
    SHOT:  { intervalSec: 0.8, bulletSpeed: 260, range: 220, bulletRadius: 3 },
    BEAM:  { intervalSec: 3.5, durationSec: 0.4, length: 160, width: 6 },
    FIELD: { radius: 60, slowFactor: 0.6, tickSec: 0.5, tickDamage: 1 },
  },
  wave: { stepSec: 30, steps: 10, spawnIntervalStart: 1.2, spawnIntervalEnd: 0.35,
          hpMultStart: 1.0, hpMultEnd: 3.0, spawnCountStart: 1, spawnCountEnd: 4 },
  enemyCap: 350,
  elite: { times: [120, 240], hpMult: 10, sizeMult: 2, speedMult: 0.8 },
  altar: { appearSec: 150, minParty: 3 },
  xp: { gemValue: 1, eliteGemValue: 10, firstLevelNeed: 5, needStep: 4, magnetRadius: 40 },
  capture: { dropRate: 0.25, eliteDropRate: 1.0, coreLifeSec: 10, fullPartyCoins: 50 },
  upgrades: [
    { id: 'atk',    label: 'こうげき +10%',  stat: 'damageMult',  add: 0.10 },
    { id: 'spin',   label: 'かいてん +15%',  stat: 'angularMult', add: 0.15 },
    { id: 'radius', label: 'きどう +12%',    stat: 'radiusMult',  add: 0.12 },
    { id: 'move',   label: 'いどう +10%',    stat: 'moveMult',    add: 0.10 },
    { id: 'hp',     label: 'たいりょく +20', stat: 'maxHpAdd',    add: 20 },
    { id: 'catch',  label: 'ほかく +5%',     stat: 'captureAdd',  add: 0.05 },
    { id: 'magnet', label: 'じしゃく +16px', stat: 'magnetAdd',   add: 16 },
  ],
  spawnPhases: [
    { untilSec: 60,   weights: { zunzun: 1 } },
    { untilSec: 120,  weights: { zunzun: 0.7, fuwafuwa: 0.3 } },
    { untilSec: 9999, weights: { zunzun: 0.5, fuwafuwa: 0.3, dashbeetle: 0.2 } },
  ],
}
```

補足ルール:

- ウェーブ補間: `spawnInterval` / `hpMult` / `spawnCount` は経過時間 0〜(stepSec×steps) で開始値→終了値へ**線形補間**。30秒毎の段階更新でも可（担当者判断）だが端点の値は厳守
- `upgrades.hp` は最大HP+20と同時に**即時20回復**も行う
- XP必要量: レベルLに上がるのに必要なXP = `firstLevelNeed + needStep × (L - 2)`（L=2で5、L=3で9、…）
- ジェム上限200個。超過したら**最古のジェムを自動回収**（プレイヤーにXP付与してから消す。消滅ロスなし）
- seed既定値 20260720。`?seed=N` で上書き。自動検証は seed=42 を使う

### 4.2 モンスター6種

| id | 名前 | rarity | archetype | color | baseDamage | 備考 |
|---|---|---|---|---|---|---|
| starpuppy | スターパピー | N | SLASH | #7fd8ff | 4 | 星型の耳の子犬 |
| togeron | トゲロン | N | SLASH | #9dff70 | 5 | トゲトゲのやんちゃ坊主 |
| pikabit | ピカビット | N | SHOT | #ffe066 | 3 | 電気ウサギ。弾は黄色 |
| samet | サメット | R | SHOT | #66a3ff | 5 | 小さなサメ。弾は水色 |
| neonworm | ネオンワーム | R | BEAM | #ff9e66 | 8 | 発光する節を持つ虫 |
| aurajelly | オーラジェリー | SR | FIELD | #ff6ec7 | — | FIELDはtickDamage=1固定＋減速。baseDamageは1を入れておく |

- **開始編成**: starpuppy ＋ pikabit の2体
- 同種の重複編成OK（スターパピー2体なども可）

### 4.3 敵3種

| id | 名前 | movement | color | hp | speed | damage | radius |
|---|---|---|---|---|---|---|---|
| zunzun | ズンズン | chase | #a06bff | 10 | 40 | 8 | 7 |
| fuwafuwa | フワフワ | sine | #7fe8ff | 6 | 55 | 6 | 6 |
| dashbeetle | ダッシュビートル | charge | #ff5e5e | 14 | 30 | 12 | 8 |

movement仕様:

- `chase` — プレイヤーへ直進（speed）
- `sine` — プレイヤー方向へ進みつつ、進行方向と直交に sin 振幅40px・周期1.2秒で揺れる
- `charge` — speed=30で接近 → プレイヤーとの距離140px以内で0.6秒停止（点滅で予告）→ プレイヤー方向へ速度260で1.0秒突進 → クールダウン1.5秒 → 繰り返し

### 4.4 捕獲と合成

- スターコア: 敵撃破時 `dropRate`（25%）でドロップ。エリートは100%
- コアの中身: 通常敵のコア=Nモンスターからrngでランダム1種、エリートのコア=Rモンスターからrngでランダム1種（確定）
- 拾得: パーティに空きがあれば仲間化（お祝い演出＋SFX `capture`）。満員（5体）ならコイン+50（SFX `pickup`）
- コアは `coreLifeSec`（10秒）で消滅。残り3秒は点滅
- 合成祭壇: 150秒（2:30）にカメラ近くへ出現（SFX `altar`）。パーティ3体以上で使用可。触れると **同レアリティ2体 → 上位1体**：N+N→R（samet / neonworm からrng.pick）、R+R→SR（aurajelly）。素材はパーティ先頭から同レアリティ2体を自動選択。派手な合体演出＋SFX `fusion`。1回使うと消える。3体未満で触れたら「あと◯たい ひつよう」表示

## 5. シーン仕様

### 5.1 Boot

- §3.3のテキストグリッドを Phaser の `Graphics` → `generateTexture()` でテクスチャ化（全モンスター・敵・プレイヤー・弾・ジェム・コア）
- 完了したら Title へ（autotest時はTitleが即Runへ流す）

### 5.2 Title

- ロゴ「ボルモン！」＋サブタイトル「〜VORTEX MONSTERS〜」＋「SPACE か クリックで スタート」
- **最初のユーザー入力で `Sound.init()`** を呼んでから Run へ（ブラウザの自動再生制限対策）
- `?autotest=1` のときは入力を待たず即 Run へ（Sound.init は呼ばない。sfxは無音無視される契約）

### 5.3 Run（本編）

- ワールドは無限平面。カメラはプレイヤー追従
- 背景: 星空2層の `tileSprite`（`scrollFactor 0` に固定し `tilePosition` をカメラ位置×0.2 / ×0.5 で動かす視差）。ベース色 #0a0a1e
- 攻撃仕様の詳細:
  - SLASH: 公転体と敵の円判定。同一敵へは `tickSec` 毎に1ヒット
  - SHOT: `intervalSec` 毎に `range` 内の最寄り敵へ弾（速度 `bulletSpeed`）。弾はプール管理
  - BEAM: `intervalSec` 毎に発動。**公転位置からradial外向き**（プレイヤー→自分の延長方向）へ長さ `length` の貫通レーザーを `durationSec` 表示。1発動につき同一敵へ1回ダメージ
  - FIELD: プレイヤー中心 半径 `radius` 内の敵を `slowFactor` 倍速に減速＋ `tickSec` 毎に `tickDamage`
- 敵cap 350: 到達中のスポーンはスキップ（キュー持ち越し不要）
- 衝突は**手動の円判定**でよい（physics不使用可。プール配列を全走査）
- ポーズ（P）: 物理・タイマー停止＋「ポーズちゅう」表示。ポーズ中のみ R でランやり直し可

### 5.4 Result

- 5:00生存（クリア・SFX `clear`）または HP0（ゲームオーバー・SFX `gameover`）で遷移
- 表示: 生存タイム・たおした数・つかまえた数・コイン・最終パーティ5枠のスプライト
- R かクリックでタイトルへ

## 6. 演出要件（「全体的に派手に」）

- 発光体（公転モンスター・弾・ジェム・コア）は加算合成（`setBlendMode(Phaser.BlendModes.ADD)`）のグロー（本体の下に大きめ半透明円）
- 敵撃破: テーマ色のスター爆散パーティクル8〜12個（プール管理）
- エリート撃破・合成: 画面シェイク 100ms/4px ＋ 大きめの爆散
- 被弾: プレイヤーを80msヒットフラッシュ（白）＋無敵時間中は点滅
- 敵被弾: 80msの白フラッシュ（tint）
- レベルアップ: 全画面に軽い波紋＋ドラフトUI表示（時間停止）

## 7. HUD・キー・テスト機能

### 7.1 HUD（hud.js・カメラ固定）

- 左上: HPバー（緑→赤）＋レベル＋XPバー
- 上中央: 残りタイム `M:SS`（カウントダウン）
- 右上: パーティ5枠（スプライト縮小表示・空きは枠のみ）＋コイン数
- **左下: テストオーバーレイ常時表示** `FPS 60 | 敵 123 | 弾 45 | seed 20260720`
- エラーバナー: `window.onerror` と `unhandledrejection` を捕捉し、画面上部に赤帯でメッセージをDOM表示（Phaserが死んでいても見えるようにDOM要素で）

### 7.2 キー

| キー | 動作 |
|---|---|
| 矢印 / WASD | 移動 |
| SPACE / クリック | タイトル開始・リザルト操作・ドラフト決定 |
| 1 / 2 / 3 またはクリック | ドラフト選択 |
| P | ポーズ |
| M | ミュート切替 |
| R | やり直し（**ポーズ中とリザルトのみ有効**） |
| T | 負荷テスト: 敵を一気に300体スポーン |
| G | スターコアをプレイヤー足元に強制ドロップ |

### 7.3 URLパラメータ

- `?autotest=1` — タイトルをスキップして即ラン開始（ヘッドレス検証用）
- `?seed=N` — rngのseed上書き（既定 20260720。自動検証は 42）

## 8. dev検証スクリプト（node実行・Phaser非依存であること）

### 8.1 validate-data.js

`node vortex/dev/validate-data.js` で実行。失敗時は理由を出力して `process.exit(1)`:

- MONSTERS / ENEMIES / PLAYER_SPRITE のschema検証（必須キー・型）
- rarity / archetype / movement が enum 内か
- color が `#` + 16進6桁か
- スプライト矩形性（全行同長）・幅高さ8〜16・palette外文字なし
- BALANCE の必須キー存在

### 8.2 test-core.js

`node vortex/dev/test-core.js` で実行。失敗時 `process.exit(1)`:

- rng決定性: `createRng(42)` を2回作り、各100個の `random()` が完全一致
- `range` / `int` の境界（intは両端を含む）・`chance(0)`=false・`chance(1)`=true・`shuffle` が元配列を破壊しない
- upgrades 7種の id 一意
- MONSTERS が6種・ENEMIES が3種・開始編成（starpuppy / pikabit）の id が存在
- spawnPhases の weights のキーが全て ENEMIES の id に存在

## 9. 完成条件チェックリスト（Verifyフェーズの判定基準）

1. `?autotest=1&seed=42` でロード後3秒以内に戦闘画面が始まり、エラーバナーが出ていない
2. 同一seedで敵の出現順・ドロップが再現する
3. 4アーキタイプ全てが実際に敵へダメージを与える（SLASH接触・SHOT弾・BEAM線・FIELD減速+tick）
4. レベルアップでドラフトが開き、選択で効果が反映される
5. コア拾得で仲間が増える。満員時はコイン+50
6. エリートが 2:00 / 4:00 に出る
7. 祭壇が 2:30 に出て、3体以上で合成が成立する
8. 5:00 生存でリザルトへ遷移する
9. T キーで300体出しても敵数が cap 350 を超えない
10. エラーバナーが `window.onerror` で実際に表示される（動作確認済みであること）
11. どのjsも `import Phaser` していない（グローバル参照）
12. `Math.random()` を1箇所も使っていない
13. `vortex/` 配下以外のファイルに変更がない
