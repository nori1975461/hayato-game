# クルット・モビット 仕様書（PROTOTYPE_SPEC）

この文書がテストモード実装の**正典**。実装担当（builder）はコードを書く前に必ず全文を読むこと。
数値・API・ファイル分担はこの文書に従い、独断で変更しない。この文書に無い細部（スプライトの絵柄・音色の質感など）は担当者のセンスで決めてよい。

> **v3改訂（2026-07-22）**: §11「v3 爽快感アップグレード」が最新の正典。**§1〜§10と矛盾する箇所は§11が優先**する。ゲーム名は『ボルモン！ 〜VORTEX MONSTERS〜』から **『クルット・モビット』** に変更。
> **v2改訂（2026-07-21）**: §10「v2 大型アップグレード」。§1〜§9はv1（テストモード）の記録として残すが、**§10と矛盾する箇所は§10が優先**する。

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

## 2. ファイルオーナー表（v1時点。**v2の分担は§10.2**）

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
- 表示スケール：モンスター・敵・プレイヤー=2倍、エリート=4倍（**v2で改訂: §10.5のサイズ体系が正典**）
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

SFX名（全て実装すること）: `hit` `shoot` `beam` `pickup` `capture` `levelup` `fusion` `elite` `altar` `select` `gameover` `clear`（**v2で8種追加＋BGM3曲化: §10.7**）

- 音色はポップで明るく。矩形波/三角波＋短いエンベロープ基調。capture/fusion はキラキラした上昇系で気持ちよく
- BGM：長調・約128BPM・4〜8小節ループ（アルペジオ＋ベース＋ノイズ打楽器程度）。マスターゲイン 0.25 で控えめに
- 外部ファイル禁止。全て OscillatorNode / GainNode / ノイズバッファで合成

## 4. バランス数値（正典）

### 4.1 balance.js のリテラル

以下はv1の値（記録）。**v2では§10.4のリテラルで全置換する**:

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

- ロゴ「クルット・モビット」＋サブタイトル「〜 KURUTTO MOBIT 〜」＋「SPACE か クリックで スタート」（**v3で改名**。index.html の `<title>` も同じ）
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
| SPACE | **ひっさつわざ発動（v3）**／タイトル開始・リザルト操作 |
| クリック | タイトル開始・リザルト操作・シネマスキップ |
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
- MONSTERS が6種・ENEMIES が3種・開始編成（starpuppy / pikabit）の id が存在（**v2で改訂: §10.8**）
- spawnPhases の weights のキーが全て ENEMIES の id に存在
- **v3追加**: weapon / special / autoUpgrade のキー検証・敵の量の上限検証・`levelupFlow` 廃止の検証（詳細は §10.8 / §11.7）

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

---

# 10. v2 大型アップグレード（2026-07-21・最新の正典）

## 10.0 目的とフィードバック対応表

ユーザー（小6の息子）の実プレイフィードバック13項目への全対応。実装は本章を正典とする。

| # | フィードバック | v2での対応 | 主担当条項 |
|---|---|---|---|
| 1 | カードに説明文がない | 全upgradeに `desc` 追加・カードに2行表示 | §10.4, §10.6-A |
| 2 | 合成祭壇に気づきにくい | 誘導矢印＋光柱＋ファンファーレ＋告知バナー | §10.6-F |
| 3 | レベルアップの特別感・爽快感 | powerupFlash演出＋専用SFX＋ヒットストップ | §10.6-A, §10.7 |
| 4 | 主人公に攻撃手段 | スターショット（自動弾・Lv連動2連/3連） | §10.6-C |
| 5 | 仲間をかわいく・ゆるふわに | 全6種＋evo6種を新造形（SPRITE_GUIDE.md準拠） | §10.5 |
| 6 | キャラを大きく | 仲間40px（scale2.5）・進化48px・ボス96px | §10.5 |
| 7 | 祭壇合成を派手に＋合成キャラ強化 | fusionCinematic 2.6s＋ダメージ×2.5 | §10.6-E, §10.4 |
| 8 | ボス戦追加 | ウズキング（276s出現・撃破=クリア） | §10.6-B |
| 9 | レベルアップが中断する | ノンストップ・ドラフト（時間停止廃止） | §10.6-A |
| 10 | アイテム・洞窟・宝箱 | 洞窟60s/180s出現・宝箱6種報酬 | §10.6-D |
| 11 | 仲間レベルアップを派手に・進化 | Lv6から2Lv毎に1体ずつ進化（姿・性能変化） | §10.6-E |
| 12 | 主人公の姿も変化 | player_1〜3・Lv5/Lv10で差し替え | §10.5 |
| 13 | 敵の魅力アップ | 新敵2種追加＋敵対比造形ルール | §10.5 |

## 10.1 v1条項の上書き宣言

本章と矛盾する場合は本章が優先する。明示的に上書きするv1条項:

- §2 ファイルオーナー表 → **§10.2**
- §3.3 表示スケール → **§10.5 サイズ体系**
- §3.5 SFX一覧 → **§10.7**（8種追加＋BGM3曲化）
- §4.1〜§4.3 全バランス値 → **§10.4 のリテラルで全置換**
- §4.4 合成 → §10.6-E（演出・強化倍率を追加。素材選択ロジックはv1踏襲）
- §5 Run合格条件のうち「5:00生存でクリア」 → **クリア条件はボス撃破のみ。時間切れ敗北なし**
- §8 検証 → **§10.8**
- §9 完成条件 → **§10.8 完成条件v2**

## 10.2 ファイルオーナー表 v2（実装Workflow分担）

**Phase A（並列・相互独立）**

| 担当 | ファイル |
|---|---|
| builder-data | `src/data/balance.js`（§10.4リテラル全置換）・`dev/validate-data.js`・`dev/test-core.js` |
| builder-sprites | `src/data/monsters.js`・`src/data/enemies.js`・`dev/SPRITE_GUIDE.md`（新規） |
| builder-sound | `src/audio/sound.js` |
| builder-icons | `src/ui/icons.js`（新規） |

**Phase B（Phase A成果を参照）**

| 担当 | ファイル |
|---|---|
| builder-core | `src/scenes/Run.js`・`src/systems/boss.js`（新規）・`src/systems/items.js`（新規） |
| builder-fx | `src/systems/fx.js`（新規）・`src/systems/levelup.js`・`src/systems/capture.js` |
| builder-support | `src/systems/orbit.js`・`src/systems/spawner.js`・`src/ui/hud.js`・`src/scenes/Boot.js`・`src/scenes/Title.js`・`src/scenes/Result.js`・`index.html` |

§0の絶対規則（vortex/外変更禁止・gitコマンド禁止・Math.random禁止・UTF-8 BOMなし・外部読み込み禁止・import Phaser禁止）はv2でも全員に適用。本章に書かれた既存コードの行番号は**参考値**であり、実装時は必ず現物を確認すること。

## 10.3 新規・変更モジュール契約

### 新規モジュール

- **`src/systems/boss.js`**: `createBoss(run)` → `{ update(dt), get active(), get warned(), get entity(), onBossKilled(e), destroy() }`。ボスの出現・状態機械・弾・撃破シネマティックを内包。Run.jsはupdate呼び出しと `killEnemy` からの `onBossKilled` 委譲のみ
- **`src/systems/items.js`**: `createItems(run)` → `{ update(dt), destroy(), get caveCount() }`。洞窟の出現・寿命・接触判定・宝箱開封・報酬適用
- **`src/systems/fx.js`**: `createFx(run)` → `{ update(dt), powerupFlash(up), announce(text, color), setTarget(id, x, y, {color, label}), clearTarget(id), fusionCinematic(defA, defB, resultDef, onDone), evolveBurst(orb, newDef), bossWarning(onDone), bossVictory(x, y, onDone) }`。演出専任（ゲームロジックへの書き込み禁止。ただし `run.cinematic`/`run.freezeT` の設定のみ許可）
- **`src/ui/icons.js`**: `UPGRADE_ICONS` — upgrade id → 12×12テキストグリッド（palette+rows・HAYATO式）7個。Boot.jsでテクスチャ化。描画失敗時はテーマ色グローで代用可

### 既存モジュールの契約変更

- **`src/systems/levelup.js`**: `update(dt)` を追加（ノンストップ化に伴うautoPickタイマー・カードアニメ管理）。進化トリガ（§10.6-E）もここが所有
- **`src/systems/capture.js`**: `dropCoreAt(x, y, rarity)` を新設（洞窟報酬 `dropCore:'R'` から呼ぶ）
- **`src/audio/sound.js`**: `startBgm(name = 'battle')` に後方互換で拡張。`SONGS = { battle, boss, result }`
- **`src/data/monsters.js`**: 各モンスターに `evo` ネスト（`{ id, name, baseDamage, sprite, ovr }`）。`PLAYER_SPRITES = [s1, s2, s3]` 追加＋互換用 `PLAYER_SPRITE = PLAYER_SPRITES[0]` 維持
- **`src/data/enemies.js`**: ENEMIES 5種（既存3＋ghoston/igagurin）＋ **`BOSS` を別export**（ENEMIES配列に入れない——capture抽選プール・spawnPhases weights検証への非混入を構造的に保証）

## 10.4 balance.js 完全リテラル（**v3の現行値**・balance.js の写し）

```js
// バランス数値の正典 v3。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 300,            // 参考値（クリア条件はボス撃破。時間切れ敗北なし）
  player: { hp: 100, speed: 120, invulnSec: 0.8, radius: 7 },

  // 主人公の自動攻撃「スターショット」
  hero: {
    intervalSec: 1.4, bulletSpeed: 300, range: 240, bulletRadius: 4,
    damageBase: 6, damagePerTwoLevels: 1,   // damage = base + floor(level/2)
    twinLevel: 8, tripleLevel: 16, spreadDeg: 12,
  },

  orbit: { baseRadius: 48, baseAngularDeg: 120, maxSlots: 5 },
  archetypes: {
    SLASH: { tickSec: 0.25, hitRadius: 18 },
    SHOT:  { intervalSec: 0.8, bulletSpeed: 260, range: 220, bulletRadius: 3 },
    BEAM:  { intervalSec: 3.5, durationSec: 0.4, length: 160, width: 6 },
    FIELD: { radius: 60, slowFactor: 0.6, tickSec: 0.5, tickDamage: 1 },
  },

  // 合成モンスターの強化倍率（orbit.js が party[i].fused を見て適用）
  fused: {
    damageMult: 2.5, spriteScale: 3, glowScale: 2.2,
    slashRadiusMult: 1.5, shotIntervalMult: 0.7,
    beamLengthMult: 1.4, beamWidthMult: 2.0,
    fieldRadius: 90, fieldTickDamage: 3,
  },

  // 進化（プレイヤーLv6から2レベル毎にparty先頭の未進化1体が進化）
  evolve: { startLevel: 6, everyLevels: 2 },

  wave: { stepSec: 30, steps: 10, spawnIntervalStart: 1.6, spawnIntervalEnd: 0.55,
          hpMultStart: 1.0, hpMultEnd: 3.2, spawnCountStart: 1, spawnCountEnd: 3 },
  enemyCap: 150,
  elite: { times: [120, 240], hpMult: 9, sizeMult: 2, speedMult: 0.8 },
  altar: { appearSec: 150, minParty: 3 },
  xp: { gemValue: 1, eliteGemValue: 10, firstLevelNeed: 5, needStep: 5, magnetRadius: 40 },
  capture: { dropRate: 0.25, eliteDropRate: 1.0, coreLifeSec: 10, fullPartyCoins: 50 },

  // 武器レベル（★取得でなかまの攻撃そのものが成長する）
  weapon: {
    maxLevel: 12,
    damageAddPerLevel: 0.28,
    slash: { hitRadiusAdd: 2.2, tickSecMult: 0.955, tickSecMin: 0.10 },
    shot:  { intervalMult: 0.945, intervalMin: 0.18, bulletSpeedAdd: 9, bulletRadiusAdd: 0.32,
             extraShotEvery: 3, maxShots: 5, spreadDeg: 10 },
    beam:  { intervalMult: 0.94, intervalMin: 1.2, lengthAdd: 13, widthAdd: 1.1 },
    field: { radiusAdd: 5, tickDamageAdd: 0.7, tickSecMult: 0.955, tickSecMin: 0.18 },
  },

  // 必殺技（敵を倒すとゲージが溜まる。1ステージ3回まで）
  // v4: テンポ改善（cinematicSec短縮=すぐ操作に戻れる・killsPerCharge減=撃ちやすい・startCharge増=序盤から1発目が近い）
  special: {
    killsPerCharge: 26, maxUses: 3, radius: 320, damage: 9999, bossDamage: 360,
    cinematicSec: 0.7, startCharge: 0.6,
  },

  // レベルアップは選択せず自動強化（cycle は upgrades[].id を順に適用）
  autoUpgrade: {
    cycle: ['atk', 'spin', 'hp', 'move', 'atk', 'magnet', 'radius', 'catch'],
    bonusEveryLevels: 5,
  },

  upgrades: [
    { id: 'atk',    label: 'こうげき +30%',  desc: 'なかまの こうげきが つよくなる',   stat: 'damageMult',  add: 0.30 },
    { id: 'spin',   label: 'かいてん +35%',  desc: 'なかまが まわる はやさ アップ',    stat: 'angularMult', add: 0.35 },
    { id: 'radius', label: 'きどう +22%',    desc: 'なかまの まわる わが ひろがる',    stat: 'radiusMult',  add: 0.22 },
    { id: 'move',   label: 'いどう +16%',    desc: 'じぶんの あしが はやくなる',       stat: 'moveMult',    add: 0.16 },
    { id: 'hp',     label: 'たいりょく +35', desc: 'さいだいHPアップ ＋ 35かいふく',   stat: 'maxHpAdd',    add: 35 },
    { id: 'catch',  label: 'ほかく +10%',    desc: 'スターコアが おちやすくなる',      stat: 'captureAdd',  add: 0.10 },
    { id: 'magnet', label: 'じしゃく +50px', desc: 'ジェムを すいよせる はんい アップ', stat: 'magnetAdd',   add: 50 },
  ],

  // 虹カード（金枠レア。levelup.js が effects/heal を解釈する）
  rainbowUpgrades: [
    { id: 'rainbow_all',  label: 'にじ:オールアップ',
      desc: 'こうげき・かいてん・いどう ぜんぶアップ！',
      effects: [{ stat: 'damageMult', add: 0.15 }, { stat: 'angularMult', add: 0.15 },
                { stat: 'moveMult', add: 0.10 }] },
    { id: 'rainbow_heal', label: 'にじ:きせきのいやし',
      desc: 'HPぜんかいふく ＋ さいだいHP+20',
      effects: [{ stat: 'maxHpAdd', add: 20 }], heal: 'full' },
    { id: 'rainbow_hero', label: 'にじ:ヒーローパワー',
      desc: 'じぶんの スターショットが 1.5ばい',
      effects: [{ stat: 'heroMult', add: 0.5 }] },
  ],

  // どうくつ・たからばこ
  cave: {
    times: [60, 180], lifeSec: 25, minDist: 260, maxDist: 320, touchRadius: 24,
    rewards: [
      { id: 'ring',   label: 'ぶき パワーリング',   weight: 3, stat: 'damageMult', add: 0.30 },
      { id: 'shield', label: 'ぼうぐ ほしのたて',   weight: 3, stat: 'maxHpAdd',   add: 30, invulnSec: 2 },
      { id: 'boots',  label: 'スピードブーツ',      weight: 2, stat: 'moveMult',   add: 0.20 },
      { id: 'magnet', label: 'メガじしゃく',        weight: 2, stat: 'magnetAdd',  add: 60 },
      { id: 'rcore',  label: 'にじのコア',          weight: 2, dropCore: 'R' },
      { id: 'coins',  label: 'コインぶくろ',        weight: 2, coins: 100 },
    ],
  },

  // ボス「ウズキング」（enemies.js の BOSS export と対応）
  boss: {
    hudBossSec: 270,                // HUDタイマーがBOSS赤表示に切替
    warnSec: 274, spawnSec: 276, spawnDist: 220,
    hp: 4500, radius: 40, spriteScale: 6, glowScale: 5,
    chaseSpeed: 45, bodyDamage: 15,
    dash: { telegraphSec: 0.9, speed: 380, durationSec: 0.8, damage: 25 },
    ring: { telegraphSec: 0.5, count: 8, count2: 12, bulletSpeed: 110,
            bulletRadius: 4, damage: 10, lifeSec: 3.5 },
    summon: { count: 6, enemyId: 'zunzun', ringRadius: 60 },
    idleSec: { afterSpawn: 3, betweenAttacks: [3, 2, 3] },  // chase→dash→chase→ring→chase→summon
    phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
    rewardCoins: 300, deathCinematicSec: 1.8,
    // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    trashInterval: 2.4, trashCount: 1,
  },

  spawnPhases: [
    { untilSec: 60,   weights: { zunzun: 0.7, fuwafuwa: 0.3 } },
    { untilSec: 120,  weights: { zunzun: 0.5, fuwafuwa: 0.3, dashbeetle: 0.2 } },
    { untilSec: 240,  weights: { zunzun: 0.3, fuwafuwa: 0.2, dashbeetle: 0.2,
                                 ghoston: 0.2, igagurin: 0.1 } },
    { untilSec: 9999, weights: { zunzun: 0.2, fuwafuwa: 0.15, dashbeetle: 0.3,
                                 ghoston: 0.2, igagurin: 0.15 } },
  ],
};
```

## 10.5 スプライト・ビジュアル v2

### サイズ体系（§3.3を上書き）

| 対象 | グリッド | setScale | 実表示 |
|---|---|---|---|
| 仲間（基本形） | 16×16 | 2.5 | 40px |
| 仲間（進化形） | 16×16 | 3.0 | 48px |
| 仲間（合成） | 16×16 | 3.0 | 48px＋glowScale 2.2 |
| 敵（通常） | 8〜12 | 2 | 据え置き |
| エリート | 同上 | 4 | 据え置き |
| ボス | 16×16 | 6 | 96px |
| 主人公 | 12×14 | 2 | 据え置き（radius 7も据え置き） |

### ゆるふわ造形ルール（詳細は `dev/SPRITE_GUIDE.md`（新規）に完成グリッド例と共に記載）

1. 輪郭は丸基調（角を'.'で落とす）2. 目は2×2以上の大きな黒目＋1pxハイライト 3. ほっぺ（ピンク系1〜2px）必須 4. 口は小さく（1〜2px）5. パステル基調＋白ハイライト 6. 手足は短く胴に密着。**敵の対比ルール**: ほっぺ無し・太まゆ/つり目で「かわいいがちょっと悪そう」に描き分ける。設計完成グリッド（starpuppy/pikabit/主人公Stage3）は設計書 design-visual.md にあり、実装時はSPRITE_GUIDE.mdへ転記する

### 新敵2種（movementは既存実装を流用・データ追加のみ）

| id | 名 | movement | color | hp | speed | dmg | r |
|---|---|---|---|---|---|---|---|
| ghoston | ゴーストン | sine | #a8f2c8 | 8 | 70 | 6 | 6 |
| igagurin | イガグリン | charge | #d88a4a | 20 | 26 | 10 | 8 |

### ボス「ウズキング」（uzuking）

- 2枚重ね構成: `boss_uzu_swirl`（マゼンタ#ff6ec7＋紫#7a3bf0の渦・本体エンティティ・`rotation += dt * 1.2`）＋ `boss_uzu_face`（顔＋金王冠#ffd23f・非回転・本体に追随するimage）
- グロー2枚（scale 8 紫／scale 4.5 マゼンタ・ADD・脈動tween）。撃破時は3色×3回=60個パーティクル
- enemies.jsで `export const BOSS = { id: 'uzuking', name: 'ウズキング', color: '#ff6ec7', sprites: { swirl: {...}, face: {...} } }`。Boot.jsは `boss_uzu_swirl` / `boss_uzu_face` でテクスチャ化

### 進化6形態（`evo.ovr` は基本ステータスへの上書きフィールド。colorは基本形を継承）

| 基本形 | 進化形 | 名 | baseDamage | ovr |
|---|---|---|---|---|
| starpuppy | comethound | コメットハウンド | 4→9 | hitRadius: 20 |
| togeron | togeking | トゲキング（金王冠） | 5→11 | hitRadius: 20 |
| pikabit | thunderbit | サンダービット | 3→7 | intervalSec: 0.55 |
| samet | megasamet | メガサメット | 5→11 | bulletSpeed: 320 |
| neonworm | neonmoth | ネオンモス | 8→16 | width: 10 |
| aurajelly | aurorajelly | オーロラジェリー | FIELD | tickDamage: 2, radius: 80 |

「貫通」「2連射」等の新メカニクスは不採用——進化強化は**数値上書き（ovr）に統一**する。

### 主人公3段階

`PLAYER_SPRITES = [player_1, player_2, player_3]`。Lv5でplayer_2・Lv10でplayer_3へテクスチャ差し替え（radius 7・当たり判定は不変）。Title.jsの主人公表示（参考: Title.js:35）は `player_1` を使う。

## 10.6 ゲームフロー v2

### A. ノンストップ・ドラフト（項目1・3・9）

- **時間停止を廃止**: Run.updateの `if (this.paused || this.drafting) return;`（参考: Run.js:139）を `if (this.paused) return;` に変更。drafting中もゲームは進行する
- カードは画面下部（cardY 308・cardXs [115,320,525]・190×60）に3枚スライドイン。各カードは label＋desc（1行）＋アイコン（icons.js）を表示
- 選択: 1/2/3キー=即決定・カードクリック=即決定・SPACE=ハイライト中カードを決定・矢印キーでハイライト移動。autoPickSec 10秒放置でハイライト中カードを自動決定（タイマーバーをy=272に表示）
- autotest互換: 「1→SPACE」の既存手順で1枚目が決定されること（1キーが即決定するため互換維持）
- 決定時: powerupFlash演出＋SFX powerup＋**90msヒットストップ**（`run.freezeT = 0.09`・Run.update冒頭でdtを食う）
- 「あと◯たい ひつよう」等の祭壇メッセージはy=252へ移動（カードUIとの衝突回避）
- 虹カード: rainbowChance 0.15で3枚中1枚が虹カードに置換（金枠・虹グラデ枠アニメ）

### B. ボス戦「ウズキング」（項目8）

- タイムライン: **270s** HUDタイマーが赤「BOSS」表示 → **274s** fx.bossWarning（2.0秒・stopBgm・警告帯0xff2244・『W A R N I N G !!』4Hz点滅・shake(400,3)）→ **276s** ボスspawn（プレイヤーからspawnDist 220px）＋`startBgm('boss')`
- 状態機械: spawn後3s chase → dash（予告0.9s白点滅→speed 380で0.8s突進）→ 3s chase → ring（予告0.5s→弾8発、phase2は12発）→ 2s chase → summon（zunzun 6体をringRadius 60で円形召喚）→ 3s chase → loop
- HP≤50%でフェーズ2: tint赤・idle×0.7・ring 12発・dash速度×1.15
- FIELD減速はボス無効（`&& !e.isBoss`）。hybrid弾50%減の概念はボルモンには無い（HAYATO側の原則。ボルモンは全攻撃通常ダメージ）
- killEnemy冒頭で `if (e.isBoss) { e.active = false; this.boss.onBossKilled(e); return; }`（通常の撃破処理・コアドロップに乗せない）
- ボス戦中はspawnerが trashInterval 1.6s / trashCount 2 の固定スポーンに切替
- hud.jsにボスHPバー（画面上部・名前「ウズキング」付き）
- **撃破=ゲームクリア**: fx.bossVictory（1.8秒シネマ: 150ms×10回バースト16個＋shake(400,8)＋コイン+300）→ 完了後 `endRun(true)`。**時間切れ勝利は廃止**（参考: Run.js:165-166のクリア判定を削除・Run.js:535の `Math.min` 除去）。BGMはendRunでstop→Result側でresult曲

### C. 主人公スターショット（項目4）

- 1.4s毎に射程240px内の最寄り敵へ自動発射。`core` テクスチャの#4de1c0 tint弾・弾速300・半径4
- damage = (6 + floor(level/2)) × stats.heroMult。Lv8で2連（±12°）・Lv16で3連
- `stats.heroMult: 1` をRun.js statsに追加（虹カード rainbow_hero が+0.5）

### D. 洞窟と宝箱（項目10）

- 60s/180sにプレイヤーから260〜320px・rng方向に洞窟出現。寿命25s（残5sで点滅）
- fx.setTarget('cave', ...)の誘導矢印＋announce『どうくつが あらわれた！』
- 触れる（touchRadius 24）と0.6s暗転→宝箱表示→開封演出→報酬floatText。報酬はrewards 6種のweight抽選（rng使用）
- rcoreは `capture.dropCoreAt(px, py, 'R')`・coinsはコイン+100

### E. 進化と合成（項目7・11）

- **進化**: プレイヤーLv6から2レベル毎（Lv6/8/10/12/14）に、party順で未進化の先頭1体が進化。fusedキャラは進化対象外。levelup.jsのレベルアップ処理がトリガし、fx.evolveBurst（光柱＋パーティクル＋SFX evolve）→テクスチャ・数値をevo定義へ差し替え
- **合成**: 結果は `run.party.push({def, fused: true})`。ダメージ×2.5・scale 3・専用グロー。fx.fusionCinematic 2.6s（`run.cinematic = true` で全ゲーム進行停止・クリック/SPACEでスキップ可・暗幕alpha 0.72→素材2体が中央へ収束→白フラッシュ＋shake(150,5)＋金20/結果色20パーティクル→結果がscale 0→6 Back.outで登場→『<name> たんじょう！！』）。SFXはfusionCharge→fusion（低音キック追加）
- cinematic中のtween/timerはPhaserでScene.updateと独立駆動のため動作する想定——**実機確認必須・NG時は `this.time.delayedCall` ベースへ切替**

### F. 祭壇の視認性（項目2）

- fx.setTarget('altar', ...)の誘導矢印（画面端マージン18pxクランプ・脈動）
- 祭壇に光柱（8×76・ADD・tint 0xff9ee0）
- 出現時: SFX altarFanfare＋announceバナー『がったいの さいだんが あらわれた！』（y=120・slide-in 250ms→1.6s表示→fade）

## 10.7 演出・SFX・BGM v2

### SFX追加8種（§3.5に追加。全てtone()/noiseHit()合成）

`draftReady`（カード到達音）・`powerup`（決定音・C5-E5-G5-C6アルペジオ）・`altarFanfare`・`fusionCharge`・`evolve`・`warning`・`bossdown`・`chest`。既存 `fusion` に低音キック `tone({type:'sine', freq:160, freqEnd:45, dur:0.25, gain:0.25})` を追加。`select` はカーソル移動音として残す。

### powerupFlash（レベルアップ決定演出）

白フラッシュ rect alpha 0.45→0 を200ms（**0.5超は禁止**・目に優しく）＋選択upgradeテーマ色のripple＋粒子24個＋『パワーアップ！』floatText。

### BGM 3曲化

`SONGS = { battle: 現行曲, boss: Am・140BPM・MELODY_BOSS, result: C・96BPM・MELODY_RESULT }`。音符列は設計書 design-fx.md の記載を使用。`startBgm()` 無引数は battle（後方互換）。

### Result.js

- `if (d.withAudio) Sound.startBgm('result');` を追加・toTitleに `Sound.stopBgm();`
- `bossDefeated` 表示『ボスを たおした！』
- 図鑑表示のidルックアップは `MONSTERS.flatMap(m => [m, m.evo])` へ差し替え（進化idが未描画になるバグの予防。参考: Result.js:82）

## 10.8 検証 v2

### validate-data.js 追加項目

- 全MONSTERSに `evo` が存在し、evoスプライトも矩形性・幅高8〜16・palette検証を通る
- `PLAYER_SPRITES` が3枚・各々検証を通る
- `BOSS.sprites` が swirl/face の2枚・各々検証を通る
- BALANCE新キー存在: hero / fused / evolve / cave / boss / rainbowUpgrades・upgrades全件に `desc`（**v3で `levelupFlow` は必須キーから除外**。ドラフト廃止に伴い balance.js から削除済み）

### test-core.js 更新項目

- 「ENEMIES が3種」→ **5種**（ghoston/igagurin含む）
- MONSTERS 6種＋evo idを合わせて**全id一意**
- rainbowUpgrades 3種のid一意・upgrades全件にdesc存在
- spawnPhasesのweightsキーが全てENEMIESのidに存在（**uzukingが含まれないこと**も検証）
- `BOSS` exportの存在（id='uzuking'）

### test-core.js 追加項目 v3（全33項目）

- `BALANCE.weapon` の maxLevel / damageAddPerLevel が数値・maxLevel が2以上・slash/shot/beam/field の全キーが有限数
- 武器Lv最大時の SHOT 弾数が `1..maxShots` に収まる（orbit.js と同じ式 `min(maxShots, 1 + floor(wl / extraShotEvery))` を再現）
- 武器Lv最大時の SLASH/SHOT/BEAM/FIELD の間隔が下限クランプを下回らない（`max(min, base * mult^wl)`・`0 < mult < 1` と `min <= base` も検証）
- `special.maxUses === 3`（**ユーザー要望「1ステージで3回が限度」の回帰防止**）・special の各数値キーが有限数
- `autoUpgrade.cycle` が非空配列で、全 id が `upgrades` に実在・`bonusEveryLevels` が数値
- `levelupFlow` が BALANCE から消えている（ドラフト廃止の確認）
- 敵の量: `wave.spawnCountEnd <= 3` / `enemyCap <= 200` / `wave.hpMultEnd <= 4`（**要望「敵が多すぎる」の回帰防止**）

### 完成条件チェックリスト v2（Verifyフェーズの判定基準）

1. v1条件のうち 1・2・3・5・6・9・10・11・12・13 は引き続き成立（4はv2仕様に読み替え・7は§10.6-E・8は廃止）
2. ドラフト中もゲームが進行する（drafting中に elapsed が増える・敵が動く）
3. カードに desc が表示され、1/2/3・クリック・SPACE・autoPick 10s の全決定経路が動く
4. ボスが276sに出現し、HUD 270s赤表示・274s WARNING演出の順で前置きが入る
5. ボス撃破で bossVictory 演出→リザルト（クリア）へ遷移。**時間切れではクリアにならない**
6. 洞窟が60s/180sに出現し、宝箱報酬が実際にstatsへ反映される
7. Lv6で最初の進化が発動し、姿と性能が変わる
8. 主人公弾が発射され敵にダメージを与える。Lv8で2連になる
9. fusedモンスターのダメージが×2.5になっている（コードパス確認）
10. fusionCinematic中にゲーム進行が停止し、スキップが効く（**tween完走の実機確認込み**）
11. スプライトはPNG化または実機スクリーンショットで**目視確認**（ゆるふわ造形・サイズ体系・ボス2枚重ね）
12. seed=42でボス討伐時間を実測し45〜90秒レンジ内（外れたらboss.hpを±20%刻みで調整）
13. 60FPS維持（追加常駐は主人公弾・ボス弾最大24・洞窟1個のみ。Tキー300体負荷で再実測）

---

# 11. v3 爽快感アップグレード（2026-07-22・最新の正典）

**§1〜§10と矛盾する箇所は本章が優先する。**

## 11.0 ユーザー要望とv3対応表

| # | 要望（原文） | 実装 | 主なファイル |
| --- | --- | --- | --- |
| 1 | 公転する仲間の攻撃が次々レベルアップ・エフェクト派手に | 武器レベル成長（§11.1）＋ `fx.weaponLevelUp()`（§11.2） | `src/data/balance.js`(weapon) / `src/systems/orbit.js` / `src/systems/fx.js` / `src/systems/levelup.js` |
| 2 | 集まってくる敵の数を少なく | wave/enemyCap の下方修正（§11.5） | `src/data/balance.js`(wave, enemyCap, elite, boss.trash*) |
| 3 | レベルアップの1/2/3選択が操作中うざい → ★取得で自動強化 | ドラフトUI全廃・`autoUpgrade.cycle` 順の自動適用（§11.4） | `src/systems/levelup.js` / `src/data/balance.js`(autoUpgrade) / `src/scenes/Run.js` |
| 4 | 一定数撃破でゲージ→必殺技（派手・広範囲）・1ステージ3回限度 | ボルテックスバースト（§11.3） | `src/systems/special.js` / `src/systems/fx.js` / `src/ui/hud.js` / `src/scenes/Run.js` |
| 5 | 敵を倒す爽快感第一（逃げ回るゲームにしない） | 武器レベル成長＋必殺技＋敵量削減の合わせ技（§11.1・§11.3・§11.5） | 上記すべて |
| 6 | BGMを明るくノリのよいポップに | battle曲をC major・150BPM・8小節へ刷新（§11.6） | `src/audio/sound.js` |
| 7 | タイトルを「クルット・モビット」に | ロゴ・`<title>`・仕様書タイトルを改名（§5.2） | `src/scenes/Title.js` / `index.html` / 本書 |

## 11.1 なかまの武器レベル成長（要望1・5）

- `run.orbit` が **パーティ共通の `weaponLevel`（初期1・上限 `BALANCE.weapon.maxLevel`=12）** を持つ。
- API: `orbit.levelUp()`（上限到達時 `false` を返す）・`orbit.setWeaponLevel(n)`・getter `orbit.weaponLevel`。
- ダメージ: `lvMult = 1 + weapon.damageAddPerLevel * (weaponLevel - 1)` を `memberDamage()` に乗算。
- アーキタイプ別の成長（`wl = weaponLevel - 1`・`rebuild()` の**最後**に適用）:
  - SLASH: `hitRadius += hitRadiusAdd*wl` / `tickSec = max(tickSecMin, tickSec * tickSecMult^wl)`
  - SHOT: `interval = max(intervalMin, interval * intervalMult^wl)` / `bulletSpeed += bulletSpeedAdd*wl` / `bulletRadius += bulletRadiusAdd*wl` / **弾数 `shots = min(maxShots, 1 + floor(wl / extraShotEvery))`**（`spreadDeg` 間隔で扇状）
  - BEAM: `interval = max(intervalMin, interval * intervalMult^wl)` / `length += lengthAdd*wl` / `width += widthAdd*wl`
  - FIELD: `radius += radiusAdd*wl` / `tickDamage += tickDamageAdd*wl` / `tickSec = max(tickSecMin, tickSec * tickSecMult^wl)`
- 見た目もレベルで育つ: `lvGrow = wl / (maxLevel-1)` を使い、スプライト `scale *= 1 + lvGrow*0.12`・グロー `scale *= 1 + lvGrow*0.35`。

## 11.2 fx.weaponLevelUp（要望1）

`run.fx.weaponLevelUp(level, names)`。**シネマティックにはしない**（操作を止めないのがv3の方針）。

- SFX `weaponUp`・`run.shake(180, 4)`・`run.freezeT = 0.12`（ごく短いヒットストップ）
- 公転円上に **60ms ずつずらした光柱**をなかま人数ぶん立ち上げ、リング状のripple＋粒子を重ねる
- `announce('ぶきレベル N ！', '#7fffcf')` ＋ なかま名の floatText

## 11.3 ひっさつわざ「ボルテックスバースト」（要望4・5）

**モジュール**: `src/systems/special.js` — `createSpecial(run)` → `{ update(dt), addKill(), fire(), destroy(), get charge, get usesLeft, get ready }`

- ゲージ: 開始時 `special.startCharge`（**v4: 0.6**）。敵撃破ごと `addKill()` が `1 / killsPerCharge`（**v4: 26体で満タン**）を加算。満タン時に `Sound.sfx('gaugeFull')` ＋ `run.fx.specialReady()`。
- **使用回数は1ステージ `special.maxUses` = 3 回まで**（要望「3回が限度」）。`usesLeft` が0になったらゲージは溜まらない。
- 発動: SPACEキー（`Run.js` の `keydown-SPACE` → `special.fire()`）。`run.cinematic || run.paused || run.ended` の間は発動しない。
- 効果: 主人公中心 半径 `special.radius`(**v4: 320**) 内の雑魚を `run.killEnemy()` で**即死**、ボスには `special.bossDamage`(**v4: 360**) を `run.dealDamage()`。
- 演出 `fx.specialBlast(x, y, radius, onImpact, onDone)`（**v4で派手さ全面強化**・要望#1/#2）:
  - `cineBegin()` トークン方式で `run.cinematic = true` ＋ `run.shake(500, 10)` ＋ `Sound.sfx('specialCharge')`（溜め上昇音）＋ `Sound.sfx('special')` ＋ announce『ボルテックスバースト！！』＋ 6色虹の放射
  - 溜めフェーズ: `convergeLines`（外周→中心へ集束する光線）＋ glow core
  - 180ms で炸裂 `onImpact()`（`impacted` フラグで**必ず1回だけ**）＝ `Sound.sfx('bigBoom')`（重低音の大爆発）＋ `run.shake(360, 12)`
  - 白フラッシュ rect **alpha 0.45**（§10.7同様 **0.5超は禁止**）＋ `goldWash`（金の加算フラッシュ alpha 0.5・着色済みなので可）
  - 7枚の虹リングを時間差で展開＋衝撃波＋`radialStreaks`（放射状の光条）＋スパーク（**`run.spawnParticles` はシネマ中に凍結するため画面座標=scrollFactor 0 の tween で描く**）
  - `special.cinematicSec`(**v4: 0.7**) 後に `cineEnd(token)` で `run.cinematic = false` と `onDone()`（`finished` フラグで**必ず1回だけ**）＝短縮でテンポ改善、すぐ操作に戻れる
- HUD（`ui/hud.js`）: XPバーの下 `fillRect(8, 48, 120, 6)` にゲージ。満タン時は `Math.floor(run.elapsed*6)%2` で `0xff6ec7` に決定的点滅。テキストは `ひっさつ x{usesLeft}`、満タン時は末尾に `  SPACE!`。

## 11.4 レベルアップ自動強化（要望3・**§10.6-A ノンストップ・ドラフトを廃止**）

- **3択ドラフトUI・カード・1/2/3キー・autoPick は全廃**。`BALANCE.levelupFlow` も削除済み（test-core が不在を検証）。
- ★（XP）でレベルが上がった瞬間に `levelup.js` が自動で強化を適用する:
  1. `up = upgrades[ autoUpgrade.cycle[(level-2) mod cycle.length] ]` を適用（Lv2 で `cycle[0]`。cycle は `atk, spin, hp, move, atk, magnet, radius, catch` の8種一巡）
  2. `level % autoUpgrade.bonusEveryLevels`(5) === 0 なら **ご褒美**として `rainbow_all`（オールアップ）＋ HP全回復
  3. `orbit.levelUp()` が成功したら `fx.weaponLevelUp()`、上限到達なら `fx.powerupFlash(up)`
  4. `announce('{label} アップ！', '#ffe066')` ＋ SFX `powerup` ＋ `run.freezeT = 0.06`（シネマ中は設定しない）
- 進化（§10.6-E）は従来どおり Lv6以降2レベル毎に先に判定してから自動強化を行う。
- `createLevelup()` の戻り値は互換のため `select()` / `confirm()` を no-op として残し、`open` は常に `false`。

## 11.5 敵の量の調整（要望2・5）

「逃げ回るゲーム」にしないため、湧き量とHP倍率を下げ、1体あたりの手応えを残す。

| キー | v3の現行値（balance.js の写し） |
| --- | --- |
| `wave.spawnIntervalStart` / `End` | 1.6 / 0.55 |
| `wave.spawnCountStart` / `End` | 1 / 3 |
| `wave.hpMultStart` / `End` | 1.0 / 3.2 |
| `enemyCap` | 150 |
| `elite.hpMult` / `sizeMult` / `speedMult` | 9 / 2 / 0.8 |
| `boss.trashInterval` / `trashCount` | 2.4 / 1 |

test-core が `spawnCountEnd <= 3` / `enemyCap <= 200` / `hpMultEnd <= 4` を回帰テストする。

## 11.6 BGM刷新（要望6）

`SONGS.battle` を **C major・150BPM・8小節**（王道進行 C-G-Am-F / C-G-F-G）へ刷新し、明るくノリのよいポップに:

- ベース: `BASS_STEPS` のオフビート込みで triangle＋square（オクターブ上）を重ねて跳ねさせる
- コードスタブ: `STAB_STEPS`（8分裏）に square の和音を短く刺す
- アルペジオ: **後半4小節のみ**8分で追加し、前半はメロディを立たせる
- リード: 16分解像度の square 主旋律＋detune 9 の triangle と1オクターブ下の薄い重ね
- ドラム: 四つ打ちキック（+ 14ステップ目に食い込み）・2/4拍のスネア＋ハンドクラップ・8分ハット（後半は16分）・小節終わりのオープンハット・最終小節後半のスネアロール

`boss` は Am・152BPM・4小節、`result` は C・96BPM・4小節（**§10.7 の「boss 140BPM」は本節が上書き**）。SFXは `weaponUp` / `special` / `gaugeFull` の3種を追加。

**v4 派手化（要望1・2）**: `MASTER_VOL` を 0.30→**0.33**（子ども安全上限 0.34 以内）へ引き上げ、必殺技用に2種のSFXを新設。`specialCharge`（溜め上昇スイープ＋ノイズライザー＋きらめきアルペジオ＋頂点チャイム、約0.6秒）と `bigBoom`（重低音2層の大爆発＋ノイズバースト＋C majorブラスト和音＋余韻スパークル、約0.8秒）。いずれも LCG 決定ノイズで合成し `Math.random` は使わない。

## 11.7 検証 v3

- `node vortex/dev/test-core.js` — **全33項目**（v3追加項目は §10.8「test-core.js 追加項目 v3」を参照）
- `node vortex/dev/validate-data.js` — `requiredBalanceKeys` から `levelupFlow` を外し、`weapon` / `special` / `autoUpgrade` を追加すること
- 完成条件 v3（v2チェックリストの 2・3 は廃止し、以下に読み替える）:
  1. レベルアップで操作が中断されない（UIが開かず、自動で強化が適用されて演出だけ走る）
  2. なかまの武器レベルが上がるたびに攻撃が目に見えて強くなる（SHOTの弾数増加を実機確認）
  3. 撃破35体でゲージ満タン→SPACEでボルテックスバーストが発動し、画面内の雑魚が消える
  4. ひっさつは1ステージ3回で打ち止めになり、HUDの `ひっさつ x0` で確認できる
  5. タイトル・ブラウザタブが「クルット・モビット」表記になっている
