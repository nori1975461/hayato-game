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
  archetype: 'SLASH',       // 'SLASH' | 'SHOT' | 'BEAM' | 'FIELD' | 'BOOMERANG' | 'RINGWAVE'
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

- `orbit.js` — 仲間の公転位置更新・SLASH接触判定・SHOT発射・BEAM発動・FIELD適用・BOOMERANG往復・RINGWAVE拡大リング。パーティ配列を受け取り毎フレーム更新
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
| togeron | トゲロン | N | BOOMERANG | #9dff70 | 5 | トゲトゲのやんちゃ坊主。クッキーブーメランを投げて戻す |
| pikabit | ピカビット | N | SHOT | #ffe066 | 3 | 電気ウサギ。弾は黄色 |
| samet | サメット | R | RINGWAVE | #66a3ff | 5 | 小さなサメ。おんぷリングが広がる |
| neonworm | ネオンワーム | R | BEAM | #ff9e66 | 8 | 発光する節を持つ虫 |
| aurajelly | オーラジェリー | SR | FIELD | #ff6ec7 | — | FIELDはtickDamage=1固定＋減速。baseDamageは1を入れておく |

- **開始編成**: starpuppy ＋ pikabit の2体
- 同種の重複編成OK（スターパピー2体なども可）

### 4.3 敵3種

| id | 名前 | movement | color | hp | speed | damage | radius |
|---|---|---|---|---|---|---|---|
| zunzun | ズンズン | chase | #a06bff | 14 | 40 | 11 | 7 |
| fuwafuwa | フワフワ | sine | #7fe8ff | 9 | 55 | 9 | 6 |
| dashbeetle | ダッシュビートル | charge | #ff5e5e | 20 | 30 | 17 | 8 |

movement仕様:

- `chase` — プレイヤーへ直進（speed）
- `sine` — プレイヤー方向へ進みつつ、進行方向と直交に sin 振幅40px・周期1.2秒で揺れる
- `charge` — speed=30で接近 → プレイヤーとの距離140px以内で0.6秒停止（点滅で予告）→ プレイヤー方向へ速度260で1.0秒突進 → クールダウン1.5秒 → 繰り返し
- `hop` — Wave C。プレイヤー方向へ「跳ねる」。速度を周期的に強弱させ、着地の一瞬（谷）はほぼ静止するため避けやすい。scale を上下に伸縮（ぷるぷる／非等方）させて着地感を出す
- `spiral` — Wave C。プレイヤーへ寄る直進成分に接線方向の回り込み成分を加え、渦を巻きながら接近する。単体では避けやすいが、複数湧くと「囲まれる」圧を作る担当
- `hover` — Wave R1。目標距離 `def.hoverDist`（≈150px）を保って浮遊する（近すぎ→後退・遠すぎ→接近・中間帯は静止）。加えて `sin(elapsed*1.5 + sinePhase)` の横ドリフトを足す（乱数不使用の決定的挙動）。砲台役 turret 用

> 注：§4.3・§12.2 の雑魚表は **Wave R1（§12.4）で全て「ヴォイド・マキナ」5種に置換済み**。以後の正典は §12.4 とする。

> **敵の総数**: §4.3 の3種＋§10.5 の2種（ghoston/igagurin）＋Wave C の3種（pyonpi/kururin/mochimo・§12.2）＝**計8種**（`ENEMIES` 配列）。ボス `uzuking` は別 export で本数に含めない。

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
3. 6アーキタイプ全てが実際に敵へダメージを与える（SLASH接触・SHOT弾・BEAM線・FIELD減速+tick・BOOMERANG往復・RINGWAVE拡大リング）
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
    // Wave B: かわいい武器の新アーキタイプ
    BOOMERANG: { intervalSec: 1.6, speed: 260, maxDist: 120, hitRadius: 14, tickSec: 0.25 },
    RINGWAVE:  { intervalSec: 1.5, maxRadius: 95, expandSpeed: 220, thickness: 16 },
  },

  // 合成モンスターの強化倍率（orbit.js が party[i].fused を見て適用）
  fused: {
    damageMult: 2.5, spriteScale: 3, glowScale: 2.2,
    slashRadiusMult: 1.5, shotIntervalMult: 0.7,
    beamLengthMult: 1.4, beamWidthMult: 2.0,
    fieldRadius: 90, fieldTickDamage: 3,
    boomerangDistMult: 1.4, boomerangRadiusMult: 1.6,
    ringwaveRadiusMult: 1.5, ringwaveThicknessMult: 1.8,
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
    boomerang: { intervalMult: 0.955, intervalMin: 0.5, maxDistAdd: 6, hitRadiusAdd: 0.8, speedAdd: 8 },
    ringwave:  { intervalMult: 0.95,  intervalMin: 0.5, maxRadiusAdd: 5, expandSpeedAdd: 8, thicknessAdd: 0.6 },
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

  // ボス（Wave D：小/中/大の3段スケジュール）。boss.js が tiers を時間順に処理する。
  // top-level はHUD/spawner/test-core 互換の代表値（＝最終ボス=マオウ基準）を残す。
  boss: {
    hudBossSec: 270,                // HUDタイマーがBOSS赤表示に切替（最終ボス接近の合図）
    warnSec: 276, spawnSec: 278, spawnDist: 220,  // ← spawnSec は最終ボス=クリア条件時刻
    trashInterval: 2.4, trashCount: 1,            // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    tiers: [
      // 小ボス「コロたま」（~90秒）。突進のみ・phase2なし・撃破でプレイ続行。
      { tier: 'small', bossId: 'korotama', final: false,
        warnSec: 88, spawnSec: 90, spawnDist: 200,
        hp: 2600, radius: 30, spriteScale: 5, glowScale: 4,
        chaseSpeed: 72, bodyDamage: 15,
        dash: { telegraphSec: 1.0, speed: 300, durationSec: 0.7, damage: 24 },
        ring: { telegraphSec: 0.5, count: 6, count2: 8, bulletSpeed: 100,
                bulletRadius: 4, damage: 12, lifeSec: 3.0 },
        summon: { count: 4, enemyId: 'zunzun', ringRadius: 50 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5] },
        phase2: false, rewardCoins: 120, deathCinematicSec: 1.0 },
      // 中ボス「ウズキング」（~185秒）。突進/放射弾/召喚＋phase2「ぶちギレ」。撃破でプレイ続行。
      { tier: 'mid', bossId: 'uzuking', final: false,
        warnSec: 183, spawnSec: 185, spawnDist: 220,
        hp: 7200, radius: 40, spriteScale: 6, glowScale: 5,
        chaseSpeed: 64, bodyDamage: 23,
        dash: { telegraphSec: 0.9, speed: 380, durationSec: 0.8, damage: 38 },
        ring: { telegraphSec: 0.5, count: 8, count2: 12, bulletSpeed: 110,
                bulletRadius: 4, damage: 15, lifeSec: 3.5 },
        summon: { count: 6, enemyId: 'zunzun', ringRadius: 60 },
        idleSec: { afterSpawn: 3, betweenAttacks: [3, 2, 3] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        rewardCoins: 250, deathCinematicSec: 1.5 },
      // 大ボス「マオウ」（~278秒＝クリア条件）。全攻撃を強化＋phase2「かくせい」。撃破でクリア。
      { tier: 'final', bossId: 'maou', final: true,
        warnSec: 276, spawnSec: 278, spawnDist: 240,
        hp: 14000, radius: 46, spriteScale: 7, glowScale: 6,
        chaseSpeed: 72, bodyDamage: 27,
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 42 },
        ring: { telegraphSec: 0.5, count: 12, count2: 16, bulletSpeed: 125,
                bulletRadius: 4, damage: 18, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'zunzun', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5, 1.8, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.65, phase2DashSpeedMult: 1.2,
        rewardCoins: 400, deathCinematicSec: 1.8 },
    ],
  },

  spawnPhases: [
    { untilSec: 60,   weights: { zunzun: 0.55, fuwafuwa: 0.30, pyonpi: 0.15 } },
    { untilSec: 120,  weights: { zunzun: 0.35, fuwafuwa: 0.20, pyonpi: 0.15,
                                 dashbeetle: 0.20, kururin: 0.10 } },
    { untilSec: 240,  weights: { zunzun: 0.20, fuwafuwa: 0.12, pyonpi: 0.12, dashbeetle: 0.18,
                                 kururin: 0.13, ghoston: 0.12, igagurin: 0.08, mochimo: 0.05 } },
    { untilSec: 9999, weights: { zunzun: 0.12, fuwafuwa: 0.08, pyonpi: 0.12, dashbeetle: 0.20,
                                 kururin: 0.14, ghoston: 0.14, igagurin: 0.10, mochimo: 0.10 } },
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
| ghoston | ゴーストン | sine | #a8f2c8 | 11 | 70 | 9 | 6 |
| igagurin | イガグリン | charge | #d88a4a | 28 | 26 | 14 | 8 |

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
| samet | megasamet | メガサメット | 5→11 | expandSpeed: 300 |
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
- 武器Lv最大時の SLASH/SHOT/BEAM/FIELD/BOOMERANG/RINGWAVE の間隔が下限クランプを下回らない（`max(min, base * mult^wl)`・`0 < mult < 1` と `min <= base` も検証）
- `special.maxUses === 3`（**ユーザー要望「1ステージで3回が限度」の回帰防止**）・special の各数値キーが有限数
- `autoUpgrade.cycle` が非空配列で、全 id が `upgrades` に実在・`bonusEveryLevels` が数値
- `levelupFlow` が BALANCE から消えている（ドラフト廃止の確認）
- 敵の量: `wave.spawnCountEnd <= 5` / `enemyCap <= 220` / `wave.hpMultEnd <= 4`（**§12 Wave C でユーザー承認のもと上限を引き上げた**。爽快感重視への方針転換。旧 `<= 3` / `<= 200` は v3 の値）

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
  - BOOMERANG: `interval = max(intervalMin, interval * intervalMult^wl)` / `maxDist += maxDistAdd*wl` / `hitRadius += hitRadiusAdd*wl` / `speed += speedAdd*wl`
  - RINGWAVE: `interval = max(intervalMin, interval * intervalMult^wl)` / `maxRadius += maxRadiusAdd*wl` / `expandSpeed += expandSpeedAdd*wl` / `thickness += thicknessAdd*wl`
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

test-core が `spawnCountEnd <= 5` / `enemyCap <= 220` / `hpMultEnd <= 4` を回帰テストする（**上限は §12 Wave C で承認のうえ引き上げ済み**。本節の 150 / 3 は v3 時点の値で、現行値は §12 が正典）。

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

---

# 12. Wave C 拡張（要望④敵数増＋⑤雑魚魅力化）

大型拡張は Wave A〜D の4段で進める。Wave A（派手化・必殺技テンポ）／Wave B（かわいい武器 BOOMERANG・RINGWAVE）は実装済み。本章は **Wave C**。設計の正典ブリーフは `dev/WAVE_C_BRIEF.md`。

## 12.0 方針転換（v3「敵を減らす」→ Wave C「爽快に増やす」）

v3（§11.5）は要望「集まってくる敵が多すぎる」に応えて敵数を絞った。Wave C はユーザー承認（3問すべて推奨案）のもと、**爽快感の底上げ**のため上限を引き上げる方向へ転じる。減らして避けやすくするのではなく、**魅力的な雑魚を増やして「たくさん倒す気持ちよさ」を作る**のが狙い。

- **判断**: `enemyCap` を 220、`wave.spawnCountEnd` を 5、`wave.hpMultEnd` を 3.2 まで許容する。
- **根拠**: CDP 実機（headless Chrome・`?autotest=1&seed=42`）で cap 到達まで敵を満たして実測。
- **事実**: 画面内 **216体で min/avg ともに 60fps**、例外0件（`LOGS` 空）。180へ落とす必要はないと判断し 220 を維持。

## 12.1 敵数の増加（要望④）

段階的に上限が上がる `capSteps` を導入。序盤は少なく、時間経過で密度が上がる。

| 項目 | 値 | 備考 |
|---|---|---|
| `enemyCap`（最終上限） | **220** | v3 の 150 を上書き |
| `wave.spawnCountEnd` | **5** | 1湧きの最大数。v3 の 3 を上書き |
| `wave.spawnCountStart` | 1 | |
| `wave.hpMultStart` / `hpMultEnd` | 1.0 / **3.2** | |
| `capSteps` | 経過秒で cap を段階昇格（最終段が `enemyCap` 220） | `spawner.currentCap()` が走査 |

- **ラッシュウェーブ**（承認「入れる」）: ボス非戦闘中のみ、`balance.js` の `rush`（`startSec` ＋ `intervalSec` 間隔）で予告→一斉湧き。予告は SFX `rush`（C5-E5-G5-C6 アルペジオ）＋ `fx.rushWarning()`（画面端リップル）。発火で `spawnBurst(counts[i])`。湧き数の小数は `countAcc` で持ち越す。

## 12.2 雑魚の魅力化（要望⑤）

**Wave C 敵3種**（`ENEMIES` に追加）:

| id | 名前 | movement | color | hp | speed | damage | radius | 特徴 |
|---|---|---|---|---|---|---|---|---|
| pyonpi | ピョンピ | hop | #ffd36e | 10 | 90 | 9 | 6 | 跳ねて距離を詰める。着地の一瞬止まるので避けやすい |
| kururin | クルリン | spiral | #8affc1 | 17 | 50 | 10 | 7 | 渦を巻いて寄る。囲まれる感の担当 |
| mochimo | モチモ | chase | #ffb3d9 | 22 | 34 | 13 | 8 | 倒すと小さいのが2体に分裂する餅 |

- movement `hop` / `spiral` の挙動は §4.3 movement仕様を参照。
- **mochimo の分裂**（承認「入れる」）: `mochimo.split = { count:2, hpMult:0.3, scaleMult:0.7, speedMult:1.4 }`。`Run.killEnemy` が解釈し、撃破位置に子2体を生成。
  - 子は `noSplit=true`（**再分裂しない**＝無限増殖を防ぐ）、`hp = max(1, round(親maxHp × hpMult))`、`speed = def.speed × speedMult`、表示 scale × scaleMult。
  - エリート個体（`isElite`）は分裂しない。
- **撃破ぷちフィードバック**: `Run.popFx(x,y,color)` を撃破時に発火。`w_star2`（ADD合成）を scale 1.2→3.2・alpha 0.95→0・180ms でぱっと弾く。SFX `pop`（sine 880→1320・gain 0.12）は 0.05秒に1回へ間引き（大量撃破時の音割れ防止）。

## 12.3 検証 v5（Wave C）

- `node vortex/dev/test-core.js` — ENEMIES 8種／mochimo split／pyonpi hop／kururin spiral／回帰上限 `spawnCountEnd <= 5` `enemyCap <= 220` `hpMultEnd <= 4` をアサート（§10.8 の旧 `<= 3` / `<= 200` は本章が上書き）
- `node vortex/dev/validate-data.js` — MOVEMENT に `hop`／`spiral`、`split` 構造、v5必須キーを検証
- **CDP 実機検証**（`dev/` 外の一時スクリプトで実施）: ①序盤fps ②capStep（50/130/200秒で cap 昇格）④mochimo 分裂（子2体・子は再分裂なし・子hp≒0.3倍）⑤hop/spiral（画面内で移動・非等方 scale・可視）⑥負荷fps（cap 220 まで満たして 60fps）。**全項目 PASS・例外0件を実測**。

## 12.4 Wave R1（雑魚総入れ替え：ヴォイド・マキナ5種＋敵攻撃システム）

旧雑魚8種（zunzun/fuwafuwa/dashbeetle/ghoston/igagurin/pyonpi/kururin/mochimo）を全削除し、**異空間ロボット軍団「ヴォイド・マキナ」5種**へ総入れ替え。全種が「役割」と「予告付き攻撃」を持ち、避け・詰め・散らしの判断を生む。BOSS/BOSS群の定義は不変。

| id | 名前 | 役割 | movement | color | hp | speed | damage | radius | attack |
|---|---|---|---|---|---|---|---|---|---|
| gareon | ガレオン | 壁（重装甲タンク） | chase | #d5382f | 42 | 22 | 16 | 9 | quake（衝撃波） |
| chibit | チビット | 手数（量産ドローン） | sine | #ffcf3d | 6 | 62 | 7 | 5 | divebomb（急降下突進） |
| bomba | ボンバ | 特攻（自爆重機） | charge | #ff8a2a | 9 | 46 | 8 | 7 | selfdestruct（自爆） |
| snipa | スナイパ | 遠距離（狙撃機） | spiral | #ff3b3b | 12 | 40 | 10 | 6 | lockbeam（狙撃弾） |
| turret | タレット | 砲台（浮遊ドローン） | hover | #7fe8ff | 16 | 30 | 9 | 7 | spread（扇状3連弾） |

**敵攻撃システム**（`Run.updateEnemyAttack` / `Run.fireEnemyAttack`）:

- 状態機械 `ready →（射程 range 内で）telegraph → 発動 → ready`。生成時に `atkT = attack.intervalSec × (0.4 + 0.6 × sinePhase/2π)` で初回発火を個体ごとにばらす（乱数を追加消費しない）。
- **予告(telegraph)は必須**: 本体を `floor(elapsed*10)%2` で白点滅。snipa は加えて照準ライン（'white' を細長く・tint赤・alpha0.35・自分→ロック方向）を表示し、発動で破棄。方向は telegraph 開始時にロック（`e.lockX/lockY`）。
- 発動:
  - `quake` — 距離 ≤ aoe+player.radius でダメージ。`w_ring` を ADD で拡大 tween（alpha0.45→0）＋SFX `elite`。
  - `divebomb` — `e.dashT = dashSec` を立て、`updateEnemies` が dashT>0 の間ロック方向へ `speed×dashMult` で直進。
  - `selfdestruct` — 距離 ≤ aoe+player.radius でダメージ後 `killEnemy`（XP/コアは通常付与）。`spawnParticles`＋`popFx`（白フラッシュなし）。intervalSec=0＝射程内で即予告。
  - `lockbeam` — ロック方向へ敵弾1発＋SFX `shoot`。
  - `spread` — プレイヤー方向中心に `count` 発を `spreadDeg` 間隔で扇状発射＋SFX `shoot`。
- **敵弾プール** `foeBullets`/`_foeBulletPool`（`spawnFoeBullet`/`updateFoeBullets`）: テクスチャ 'bullet' を敵色 tint、`life≈3s`、プレイヤー距離判定で `hitPlayer`。boss弾を雛形にリサイクル。
- 出現スケジュール（`spawnPhases`）: ~60s は手数(chibit).70/壁(gareon).30 → ~120s で狙撃(snipa)/特攻(bomba)追加 → ~240s〜で砲台(turret)も加わり全5役が揃う。ボス召喚 `summon.enemyId` は全て `chibit` へ差し替え。

**検証 v6（Wave R1）**: `test-core`（ENEMIES=5／snipa=spiral／turret=hover／全種 attack.telegraphSec>0／summon=chibit）・`validate-data`（MOVEMENT に `hover`、attack type enum／telegraphSec>0）・CDP実機（5種テクスチャ存在／250s ワープで5種可視スポーン／各攻撃タイプ発火／60秒相当で例外0件）。

## 12.5 Wave R2（バランス再調整：仲間人数・祭壇回数・ステージ尺・強さカーブ）

ステージが短く（300s）中盤で編成・強化が飽和していた課題へ、進行と火力の伸びを緩やかに再設計。**数値のみの調整で、敵5種・ボス3段の定義は不変**（ボス6段化は Wave R3 が担当）。

- **公転仲間は最大3人**（`orbit.maxSlots` 5→3・火力過多防止）。`orbit.slotSchedule = [{untilSec:180,slots:2},{untilSec:9999,slots:3}]` で**開始2人・180秒で3人目を解禁**。`capture.pickupCore` は固定 `maxSlots` ではなく `currentSlots()`（slotSchedule を `run.elapsed` で走査し maxSlots でクランプ）を上限に使う。満員時のコイン化処理は不変。
- **合成祭壇は3回出現**（`altar.appearSecs = [150,250,340]`・旧 `appearSec` 単発を廃止）。`capture` は `altarFired = appearSecs.map(()=>false)` のインデックス方式で各時刻を順に発火（前の祭壇が残存中は多重生成しない）。`altar.minParty` 3→2（開始2人に合わせる）。
- **ステージ尺 420s へ延長**（`runDurationSec` 300→420）。強さカーブ `wave.steps` 10→14（`totalSec = stepSec×steps = 420` へ補間終端が伸びる／`spawner` はコード変更不要）。開幕を易しく（`hpMultStart` 1.0→0.9・`spawnIntervalStart` 1.6→1.9）、終盤の硬さは微増（`hpMultEnd` 3.2→3.4）。
- **同時出現上限 `capSteps` を5段化**（`[60→50, 150→90, 260→140, 360→190, 9999→220]`・末尾 = `enemyCap` 220）。
- **ラッシュ早め・6波化**（`rush.startSec` 100→40・`intervalSec` 70→50・`counts` [14,20,26,32]→[12,16,20,26,30,36]）。エリートは3体化（`elite.times` [120,240]→[110,200,290]）。

**検証 v7（Wave R2）**: `test-core`（`orbit.maxSlots≤3`／`slotSchedule` 単調増加・末尾 slots=maxSlots／`altar.appearSecs` 3回・単調増加・旧 appearSec 廃止／既存の capSteps 単調増加・末尾一致・rush.counts≤40 も新値で成立）・`validate-data`（monsters=6・enemies=5 不変）・CDP実機（開始 party=2／179s は2人上限・180s超で捕獲すると3人まで（3を超えない）／祭壇 150・250・340s で各1回出現／`runDurationSec=420`・hpMult が 420s 補間で終盤3.4付近／60秒相当で例外0件）。

# 13. Wave D 拡張（要望⑥小/中/大ボス＋⑦爽快感の限界突破）

大型拡張 Wave A〜D の最終段。これまでボスは大ボス（uzuking）1体のみで、300秒プレイの山場が終盤に一度きりだった。**時間軸に3つの山場を作る**ため、小→中→大の3段ボスへ再構成する。設計方針＝「倒す達成感を3回味わえる」「かわいさとのギャップで派手に」。

## 13.1 3段ボス（要望⑥）

`enemies.js`: `export const BOSSES = [KOROTAMA, UZUKING, MAOU]`。後方互換のため `export const BOSS = UZUKING` を維持（既存の単一ボス参照が壊れないように）。各ボスに専用 `sprites.swirl`（回転渦本体）／`sprites.face`（非回転の顔）を持たせる。

| tier | id | 名前 | 色 | spawnSec | HP | rewardCoins | deathCinematicSec | final |
|---|---|---|---|---|---|---|---|---|
| 小 | korotama | コロたま | #ff9ec4 | 90 | 2600 | 120 | 1.0 | – |
| 中 | uzuking | ウズキング | #ff6ec7 | 185 | 7200 | 250 | 1.5 | – |
| 大 | maou | マオウ | #ffcb3d | 278 | 14000 | 400 | 1.8 | ✓ |

- `balance.js`: `boss.tiers` を3段化。tier別に `bossId/warnSec/spawnSec/hp/radius/chaseSpeed/bodyDamage/rewardCoins/deathCinematicSec/attacks/idleSec/summon/final` を定義。`final:true` はちょうど1つ（クリア判定の分岐を一意にする）。`spawnSec` は tier 昇順で単調増加（出現の重なり防止）。
- `boss.js`: 多段スケジューラ化。tier 順に warn→spawnFight。撃破 `onBossKilled`→`awardKillRewards`（コイン加算＋`killsPerCharge` 回 `addKill` で必殺ゲージ満タン化）→**非finalは `finishMini`（通常戦BGM 'battle' へ復帰・プレイ続行）／finalは `finishFinal`→クリア→Result 遷移**。BGMは spawnFight で 'boss' へ（`run.withAudio` ガード）。
- `Boot.js`: `BOSSES` をループして全ボス分 `boss_<id>_swirl`／`boss_<id>_face` をテクスチャ化（`makeGrid` は既存キーがあればスキップ）。
- `hud.js`: ボス名を `entity.def.name` から動的表示（3ボスで自動切替）。

## 13.2 検証 v6（Wave D）

- `node vortex/dev/test-core.js` — `BOSS export が存在し id=uzuking`／`boss.tiers が3段（小/中/大）`／`final:true がちょうど1つ`／`spawnSec が単調増加`／回帰上限（enemyCap ≤ 220・capSteps 最終段一致）をアサート
- `node vortex/dev/validate-data.js` — `BOSSES` 各体の id/name/color/sprites.swirl・face を検証。`boss.tiers` の bossId 実在・warnSec<spawnSec・spawnSec 単調増加・attacks 非空・idleSec 長さ一致・summon.enemyId 実在・hp/radius/chaseSpeed/bodyDamage 正数・final ちょうど1つ
- **CDP 実機検証**（`dev/` 外の一時スクリプト・`run.elapsed` を各 tier の spawnSec 直前へワープ→実ダメージ経路 `dealDamage→killEnemy→onBossKilled` で撃破）: 3段すべて出現→ID/名前/maxHp 検証→実撃破→コイン加算＋必殺満タン化→非finalは通常戦復帰・finalは Result 遷移。**24/24 PASS・例外0件を実測**。

# 14. Wave R3 拡張（Wave E＝ボス6段ロボット化・「顔だけ」脱却）

Wave D の3段ボスは「回転渦＋顔」の2枚重ねで、実質“顔だけ”が浮いていた。R3 ではボスを **3体→6体** に増やし、見た目を **body(胴)/core(顔=単眼センサー)/armR・armL(腕＋手)/legR・legL(脚)/cannon(砲身)** の **7パーツリグ** へ刷新。**ボス本体そのものが動く**攻撃アニメと、ロボットらしい **署名武器6種** を実装した。改名はユーザー承認済み（id は据え置き）。

## 14.1 ロボット6体（出現ラダー）

| # | id | 名称 | tier | spawnSec | HP | bodyDmg | reward | 署名武器 | attacks | phase2 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | korotama | コロガンナー | small  | 60  | 1800  | 12 | 100 | マシンガン | [machinegun,dash] | – |
| 2 | jetviper | ジェットバイパー | small+ | 120 | 3600  | 15 | 150 | カッター | [cutter,dash] | – |
| 3 | uzuking  | ウズバルカン | mid    | 180 | 6500  | 18 | 220 | バルカン砲 | [vulcan,armslam] | ✓(0.5) |
| 4 | wavelord | ウェイブロード | mid+   | 240 | 11000 | 22 | 300 | 波動砲 | [wavecannon,armslam,summon] | ✓(0.5) |
| 5 | missilga | ミサイルガ | large  | 300 | 18000 | 26 | 380 | ミサイル | [missile,vulcan,summon] | ✓(0.5) |
| 6 | maou     | マオウレクス | final  | 360 | 28000 | 30 | 500 | 亜空間レーザー | [laser,missile,nova]† | ✓(0.55) |

> † 最終ボスは **§18（Wave R6）で3特別攻撃 [laser, missile, nova] へ再構成**（armslam は近接データとして保持しローテーションから除外）＋全ボスを約2倍に巨大化。spriteScale/attacks 等の現行値は §18 と balance.js が正典。

- top-level 代表値を最終ボス基準へ更新（`hudBossSec:350 / warnSec:358 / spawnSec:360 / spawnDist:260`）。`runDurationSec` は420のまま。
- `enemies.js`: `BOSSES=[KOROTAMA,JETVIPER,UZUKING,WAVELORD,MISSILGA,MAOU]`。各ボスは `sprites`（body/core/armR/cannon/leg 等のパーツ集合）＋ `rig`（`{role,tex,ox,oy,mirror,origin?}` の配列）を持つ。`swirl/face` は廃止（core が顔を継承）。`export const BOSS = UZUKING` は後方互換で維持。armL/legL は armR/leg テクスチャを `setScale(-s,s)` でミラー表示。

## 14.2 7パーツリグと本体アニメ（boss.js）

- `disp.parts = def.rig.map(...)`：role 別に depth（body8/leg7/cannon10/arm11/core12）と origin を割り当て。`ORBITS`（旧公転オーブ装飾）は廃止。
- `updateDisp`：`run.elapsed` と攻撃 `state/stateT` から決定的に算出。**hover**（全体浮遊＋機体傾き）/ **step**（脚の交互踏みしめ）/ **arm**（待機スウェイ）/ **aim**（砲身がプレイヤー追従）。**armslam** は telegraph で両腕を頭上へ→発動0.15sで振り下ろし＋body沈み込み＋衝撃波リング。波動砲/レーザー発射時は全パーツを -aim 方向へキックする **recoil**。被弾フラッシュ/予告点滅/phase2 tint は全パーツへループ適用。

## 14.3 ロボット武器6種（全て予告付き）

- **machinegun**：予告→burst 間 `shotInterval` 毎に微スプレッド連射（`sin(shotIdx)` で決定的）。銃口フラッシュ点滅。
- **cutter**：円鋸を扇状射出・高速自転・`returns` でブーメラン軌道（bullets `kind:'cutter'`）。
- **vulcan**：`bursts×perBurst` を `sweepDeg` ずつ掃射（上半身旋回）。SFX throttle＋shake。
- **wavecannon**：溜め→前方へ太い短命ビームを `sweepDeg` 薙ぐ（`bossBeam`・白フラッシュ0.4＋`bigBoom`）。
- **missile**：上方射出→弱ホーミング（`maxTurnDeg` 上限で走れば振り切れる／bullets `kind:'missile'`・煙軌跡・寿命/命中で小爆発）。
- **laser**（final）：溜め→極太貫通ビームを `sweepFromDeg→sweepToDeg` へ回転薙ぎ（白フラッシュ0.45）。phase2 は laser の直後に vulcan を割り込ませる。
- 共通で残す攻撃：`dash`（体当たり）・`summon`（chibit 召喚）・`armslam`。
- **`bossBeam`**：プレイヤー1点判定（線分-点距離）＋ `boss_beam`（縦グラデ白帯）ADD描画・`activeSec` フェード。boss.js が所有（Run.js は不変）。弾テクスチャ `boss_missile/boss_cutter/boss_muzzle/boss_beam` は boss.js `ensureTextures` で内製。

## 14.4 検証 v8（Wave R3）

- `node vortex/dev/test-core.js` — `BOSS export=uzuking`／`boss.tiers が6段`／`final:true が1つ`／`spawnSec 単調増加`／`betweenAttacks 長=attacks 長`／`bossId 並び=korotama,jetviper,uzuking,wavelord,missilga,maou`／R1・R2 の回帰ガードも維持。**全PASS**。
- `node vortex/dev/validate-data.js` — `BOSSES` 各体の全パーツ矩形チェック（パーツは3〜20px許容）・`body/core` 必須・`rig` の tex 実在・ox/oy 数値。`boss.tiers` の bossId 実在・warn<spawn・単調増加・attacks 非空・idleSec 長一致・summon.enemyId 実在。**OK（monsters=6, enemies=5, bosses=6）**。
- **CDP 実機検証**（`scratchpad/cdp-r3-boss6.mjs`・PORT 8797/DBG 9339）：6体×各 spawnSec へワープ→(a)出現・ID一致／(b)パーツ≥4枚可視（顔だけでない）＋body/core存在／(c)本体アニメ発火（armR が2フレーム間で変化）／(d)署名攻撃で弾増加 or beam or 特殊弾出現／(e)実撃破→報酬増→非finalは復帰・finalは Result 遷移／(f)例外0。**72/72 PASS・例外0件を実測**。

## 14.5 実装後レビューと修正（4次元コードレビュー＋敵対的検証）

実装完了後、balance／boss-logic／sprites・統合／要望完全性の4次元でコードレビューし、各指摘を敵対的に再検証した（確定15件・**critical/major=0**）。ユーザー要望・制約・体感に直結する4点を修正:

- **summon の予告化**：`summon` だけ予告なし即発火だった（制約「全ボス攻撃に予告」の唯一の抜け）。`summonTele` ステート＋`telegraphSummon()`（湧く位置をリング状に光らせ `warning` 音）を追加。`isTelegraph`（`state.endsWith('Tele')`）が拾い本体も予告点滅。balance の wavelord/missilga summon に `telegraphSec:0.6`。
- **機関銃/ミサイルの本体モーション**（要望⑦「ボス自身の動きで迫力」の部分未達）：`missileTele` で両腕を振り上げ（発射ハッチ）、`mgFire` で上体を小刻み反動＋腕を前へ構え。`fireMissiles` に `recoil(aim)`＋発射煙を追加。
- **追尾速度の単調化**：jetviper `chaseSpeed 78→70`（小型とはいえ最終ボス maou 68 より速い違和感を解消）。
- **撃破時の銃口フラッシュ残り**：連射中に撃破すると `disp.muzzle` が残るため、`startDeathSpin` 冒頭で `setVisible(false)`。

**R4以降の検討事項（過剰修正を避け今回は見送った nit）**：phase2 の未使用パラメータ `phase2DashSpeedMult`／`ring.count2`（dash∩phase2＝空・ring は attacks 未搭載で死にコード。phase2 の強化は攻撃間隔短縮が主）・`missile.homingRate` 未使用（旋回は `maxTurnDeg` で実装済み）・ボス弾の当たり半径が固定値で `bulletRadius/bladeRadius/shockRadius` 未反映・missilga 配色が uzuking と近いオレンジ基調で描き分けが弱い。いずれも実害なし（CDP 72/72 で回避可能・当たると確認済み）。修正後も **test-core／validate-data／CDP 72/72 を再実測しグリーン維持**。

# 15. Wave R4 拡張（武器フォームチェンジ＋主人公スターオーラ）

R3 までボスを厚くしたが、なかまの攻撃は「各自の固定 archetype で弾を撃つだけ」で単調だった（ユーザーFB「弾を撃つだけで飽きる」）。R4 は **weaponLevel が上がるごとに近接↔遠距離フォームが交互に切り替わる**新機構と、**主人公の常時スターオーラ**を実装。要望#4（主人公も攻撃してる爽快感・自動でよい・HAYATO参考）／#5（近接遠距離を交互・可愛さモットー）／#8（オーラ常時＋ショット強化）。

## 15.1 武器フォームチェンジ（要望#5）

- 各なかま（monsters.js）に `forms:[{name,kind:'melee',archetype,tex,sfx}, {name,kind:'ranged',...}]` の2フォーム。**form0=必ず近接・form1=必ず遠距離**。
- 帯計算 `formIndexFor(lv)=Math.floor((lv-1)/2)%2`。帯0(Lv1-2)=近接／帯1(Lv3-4)=遠距離／帯2(Lv5-6)=近接…と2Lv刻みで交互。全なかま共通 weaponLevel なので帯上昇で6体同時切替。
- orbit.js `rebuild()` で従来固定の `o.archetype=base.archetype` を `o.form=forms[formIndexFor(weaponLevel)]; o.archetype=o.form.archetype` へ動的化。攻撃機構（SLASH/SHOT/BEAM/FIELD/BOOMERANG/RINGWAVE）は既存を再利用し、テクスチャ・SFX・武器名で差別化。各orbに持続 `weaponSpr`（近接=弧を描いて振る／遠距離=脇で浮遊）。
- なかま別: starpuppy=グーパンチ(SLASH)/おもちゃ投げ(SHOT)・togeron=巨大ハンマー(SLASH)/ケーキ投げ(BOOMERANG)・pikabit=ビンタ(SLASH)/ピカピカビーム(BEAM)・samet=ピアニカ(SLASH)/水鉄砲(SHOT)・neonworm=頭突き(SLASH)/念動力(RINGWAVE)・aurajelly=スポンジ(FIELD)/なわとび(RINGWAVE)。新テクスチャ `w_toy/w_hammer/w_note/w_drop`（Boot.js内製）＋新SFX `punch/hammer/note/water/psychic`（sound.js・LCG決定・Sound.sfxは未知キー無視で安全）。

## 15.2 主人公スターオーラ＋ショット強化（要望#4/#8）

- Run.js `updateHeroAura`：主人公周囲 `auraRadius(28)+(stage-1)*10` 内の敵へ `auraTickSec(0.5)` ごと自動近接ダメージ（`e.id` ゲート・**ボスは対象外**＝接近戦バランス保護）。`playerAura`（w_star2 ADD 回転脈動・alpha 0.22〜0.34＝<0.5厳守）。「主人公自身が常に攻撃判定を持つ」＝撃ってる感覚（HAYATO参考）。
- `updateHeroShot`：弾数を playerStage 連動 `shotByStage[1,2,3]`（扇状）、stage3 で貫通（`spawnBullet`/`updateBullets` の `pierce`＋hitSet で二重ヒット防止）。弾色は変身連動（ミント→マゼンタ→金）。

## 15.3 実装後レビューと修正（3次元コードレビュー＋敵対的検証）

form-mechanism／hero-aura-shot／completeness-integration の3次元でレビューし敵対的検証（確定9・**critical 0**）。4テーマを修正:

- **【major】フォーム帯切替でブーメラン/リング波が固着＋リーク**：`rebuild()` の再割り当てループが `releaseWeaponVisuals` を呼ばず、遠距離帯→近接帯（Lv4→5・8→9）で archetype が変わると飛翔中の boomerang/ringwave スプライトが孤児化（どの update からも参照されず画面固着＋GameObjectリーク＝制約「リーク厳禁」抵触）。→ 再割り当てループで `prevArch !== o.archetype` の時 `releaseWeaponVisuals(o)`。
- **【minor】進化ovrがフォームarchetypeと不一致で3体の進化強化が死ぬ**：thunderbit(intervalSec→pikabitはSLASH/BEAM)・megasamet(expandSpeed→sametはSLASH/SHOT)・neonmoth(width→neonwormはSLASH/RINGWAVE)。→ 各 ovr を実フォームのパラメータへ振り直し（近接hitRadius＋各遠距離キー length/width・bulletSpeed/intervalSec・maxRadius/expandSpeed）。
- **【nit】hero.twinLevel/tripleLevel 死に設定残置**：shotByStage へ移行済み。→ 削除。
- **【nit】aurajelly近接FIELDで w_bubble が aura と weaponSpr 二重表示**：→ FIELD近接時 weaponSpr 非表示（他フォームで復帰）。

**見送り（実害小の nit・意図固定）**：主人公ショットはボスにも当たる（弾数増でチップ増だが damageBase6 と軽微・オーラはボス除外済み・主力は仲間）＝**主人公スターショットはボスにも軽減なしで当たる仕様**とする。`_auraTick` の size>128 一括 clear で直後に在圏敵が1回余分tick（実害極小・許容）。

## 15.4 検証 v9（Wave R4）

- `node --check` 全9ファイル OK・`validate-data` OK（monsters=6・enemies=5・bosses=6・forms検証）・`test-core` 全PASS（R1/R2/R3ガード維持＋forms構造/帯交互性/hero設定の新ガード）
- **CDP実機**（`scratchpad/cdp-r4-weapons.mjs`・PORT 8798/DBG 9340）：weaponLevel 1/3/5/7/9/11 で近接↔遠距離が反転（Lv1/5/9=melee・Lv3/7/11=ranged）／近接で敵HP減／遠距離で飛び道具出現／主人公オーラ常時ダメージ＋ショット弾数[1,2,3]／例外0。**修正後も 13/13 PASS・例外0を再実測**（修正で近接帯の可視武器テクスチャ 4→3＝aurajelly の二重表示解消も確認）。

# 16. Wave R5（実プレイFB8件：手応え・爽快感・ボス外見差別化）

実機プレイのFB8件を2エージェント並行で実装（体感/演出＝balance/orbit/Run/sound/fx/hud、敵/ボス＝enemies/boss）。ファイル無衝突で分担しメインが統合。

## 16.1 手応え・バランス調整（FB#1/#3/#4）

- **#1 必殺技**: `special.maxUses 3→5`・`killsPerCharge 26→18`（約3割速い）・`startCharge 0.6→0.7`。test-core の回帰ガードも 3→5 へ更新。
- **#3 雑魚3発撃破**: 「当初5発で不満」の主因 gareon を中心にHPを下げ、序盤(weaponLevel=1)の近接1ヒット（starpuppy4/pikabit3）で概ね3ヒット撃破へ。gareon 42→14・chibit 6→4・bomba 9→8・snipa 12→9・turret 16→12。攻撃力/頻度は据え置き（脅威は維持）。
- **#4 弾を速く・数を1割減**: プレイヤー hero.bulletSpeed 300→360・intervalSec 1.4→1.55、SHOT 260→315・0.8→0.88。ボス6段の弾速+20%（ring/vulcan/missile/machinegun/cutter/armslam）・発射数-約1割（ring.count/count2・vulcan.perBurst 10→9・missile 5→4・cutter 3→2・armslam.shockCount 10→9）。雑魚 snipa 240→288・turret 150→180。ビーム系(laser/wavecannon)は弾速概念なしで据え置き。

## 16.2 爽快感の可視化（FB#2/#5/#6/#7）

- **#2 合成なかま強化**: `fused.weaponLevelBonus:3`。orbit.js に `effLevel(o)=min(maxLevel, weaponLevel+(fused?3:0))` を新設し、ダメージ倍率・フォーム選択・武器成長・deco の全てで実効レベルを使用。既存の固定倍率(fusedDmgMult 2.5)は別枠のまま＝二重取りなし。祭壇で苦労して作った仲間が武器3Lvぶん強い。
- **#5 武器LvUp体感（HAYATO参考）**: レベルアップ瞬間に各orb本体をポップ（scale×1.4 yoyo）＋グロー脈動（levelPulseT）＋中央テロップ「ぶき レベルアップ！」（fx.js）＋上昇スティンガー `weaponTier`。hud.js の「ぶき LvN」表示もミント色スケールで0.6秒パルス。
- **#6 発射音を派手に**: 新規 `starShot`（主人公）追加・既存 `shoot` 強化。近接/遠距離/主人公で音色差（water/psychic/note/starShot）。
- **#7 被弾の手応え**: hitPlayer に `Sound.sfx('hurt')`＋`shake(180,5)`＋赤の全画面加算フラッシュ(alpha0.30・<0.5厳守)＋リップル＋ヒットストップ0.05s。
- 新規SFX: `starShot`/`weaponTier`/`hurt`。MASTER_VOL 0.33 維持。

## 16.3 ボス6体の外見差別化（FB#8）

「6体中4体が似すぎ」→ 共通7パーツ人型リグを廃し、rig構造そのものをボディタイプ別に再設計。単眼センサー(core)の「らしさ」は各型に合う位置で残す。機械質感は維持。

| ボス | 型 | rig（パーツ） | アニメ出し分け |
|---|---|---|---|
| korotama | UFO/円盤 | pod×2 / body(円盤) / dome / cannon / core | dome=浮遊のみ・脚なし |
| jetviper | 戦闘機 | wing×2 / thruster / body / cannon / core | wing=cutter予告でバンク |
| uzuking | 4足砲台 | qleg×4 / body / cannon(砲塔) / core | 対角交互ステップ・armslamで踏ん張り |
| wavelord | 戦車/履帯 | track×2 / body / cannon(主砲) / core | 車体沈み込み(armslam) |
| missilga | ミサイル車 | base×2 / body / rack(4連ポッド) / cannon / core | rack=missile予告で上昇 |
| maou | 大型2足 | leg×2 / armR×2 / body(冠+赤炉心) / cannon / core | 既存armslam/legstep継承 |

boss.js: `PART_DEPTH`/`PART_ORIGIN` に新role追加（未知roleは depth9/中心/静止に安全フォールバック）。`updateDisp` に dome/qleg/wing/rack のアニメ分岐追加。balance.js の boss.tiers（HP/攻撃）は不変＝**見た目だけ**変更。partCount はボスごと 5〜7 で可変（固定7でなくなった）。

## 16.4 検証 v10（Wave R5）

- `validate-data` OK（monsters=6・enemies=5・bosses=6）・`test-core` 全PASS（special.maxUses 5 へ更新、boss.tiers 6段・bossId順など既存ガード維持）・全編集ファイル `node --check` OK・両エージェントの擬似DOMスモークで例外0（6体 spawn→全攻撃→撃破シネマまで）。
- **CDP実機**（`scratchpad/cdp-fb8-boss-shots.mjs`・PORT 8801/DBG 9343）：6体を順に出現→中央ズームでPNGスクショ→撃破で次段、19/19 PASS・例外0。rig構成が6体で相異＋PNG目視で6体が別物（円盤/戦闘機/4足/戦車/ミサイル車/2足）であることを確認（教訓：完了報告前にPNG化・目視比較）。

# 17. オープニング演出（コールドオープン「鉄のコマンド、ポンッで上書き。」）

ユーザー承認済み設計（workflow 4案設計→3審査採点→統合。絵コンテartifactで承認）を実装。約12.5秒・Boot直後コールドオープン・反転からbattle先行BGM。

## 17.1 構成と各種フック
- 新規 `src/scenes/Opening.js`（約380行）。main.js scene配列を [Boot, Opening, Title, Run, Result] に、Boot.js 末尾を `scene.start('Opening')` へ。
- **autotestバイパス**: create冒頭で `V.autotest` 時は即 `scene.start('Title')`（既存テスト/CDP無影響）。
- **音声解錠**: コールドオープンの初回押下(SPACE/クリック)で `Sound.init()`＋playSequence。押下前は無音待機。
- **1ロード1回**: Boot直後のみ在席、Result→Title/Run のリトライでは通らない（永続化不要）。
- **スキップ**: 起動後にonceリスナ登録＋1.5秒後SKIP▶常設。skip/自然終端は共通の `_goTitle()` で全timer/tween/生成物を回収（`_finished`ガードで二重発火防止）。

## 17.2 ビート（押下t0基準・約12.5s）
0.0ゲート→1.2固有名『ヴォイド・マキナ』(可読死守)→3.0命令3連『セカイを/すべて/機械に。』(可読死守)→4.9単眼ロボ行進(enemy_gareon/chibit/bomba・走査線・カタカタ)→6.4頂点+0.3sフリーズ→7.2『でも』+完全無音0.2s→**7.7反転『だいじょうぶ！』＝黒帯上下に開く/モノクロ→キャンディ/書体ポップ/`startBgm('battle')`を同時発火**→8.4主人公＆相棒登場→9.3ポンッ連鎖(ロボが星に弾ける)→10.9収束→ロゴ結像→12.2 Title同一座標で着地。
- 核テキスト(固有名・命令)は可読死守、他は映像/擬音/色反転へ逃がし画面文字は約12トークン。
- 新規SFX: `tick`/`metalSlam`/`voidHum`（脅威音は小音量短時間・直後に解決）。反転は既存 capture/powerup/pop 流用。
- 白フラッシュは固有名スラムの一瞬(alpha0.4)のみ・反転は白でなく有色ADDウォッシュ。MASTER_VOL 0.33 据え置き。

## 17.3 継ぎ目ゼロ接続
最終フレームを Title.js と同一座標(logo320,112 34px #ffe066/縁#ff6ec7・sub320,156 #7fffcf・player320,236 scale2.4・starpuppy5体公転 半径46×26・prompt320,312)で組み、相棒を base角に静止させ `scene.start('Title')`（Titleは _a=0 から回転開始＝同位相）。camera bg も同色でカット段差なし。

## 17.4 検証 v11
- validate-data/test-core 全PASS（Opening追加はデータ不変）・`node --check` 4ファイルOK・擬似DOMスモーク9項目PASS。
- **CDP実機**（`scratchpad/cdp-opening-verify.mjs`・PORT8802/DBG9344）：非autotestで起動→SPACE dispatch→各ビートPNGスクショ→Title遷移→autotestバイパスでRun到達、4/4PASS・例外0。**PNG目視で反転『だいじょうぶ！』・ロゴ結像・ポンッ連鎖が全て画面中央域に描画されることを確認**（空中/画面外再生の回帰なし）・ゲート/固有名/命令の核テキスト可読も確認。

---

# 18. Wave R6（実プレイFB第3ラウンド：ボス巨大化・最終ボス3特別攻撃・ボス戦BGM）

> 実プレイFB第3ラウンド5件のうち **#3（ボス巨大化＋最終ボス特別攻撃3つ）／#4（ボス戦BGM）** を本章に記録。#1（HP回復アイテム）/#2（自他弾の判別）/#5（弾の迫力）は §19。

## 18.1 ボス巨大化（FB#3）

全ボスを約2倍・最終ボスは通常ボスの約1.5倍へ。boss.js は `spawnFight` で `cfg.spriteScale` をリグ各パーツの `ox/oy` に乗算（相似拡大）。radius（接触ダメージ範囲）・glowScale・spawnDist（巨体の重なり出現防止）も比例拡大。

| ボス | spriteScale | radius | glowScale | spawnDist |
|---|---|---|---|---|
| korotama | 4→**8** | 28→**52** | 3.4→**6.8** | 200→**290** |
| jetviper | 4→**8** | 30→**56** | 3.6→**7.2** | 210→**300** |
| uzuking | 4.5→**9** | 34→**64** | 4.6→**9** | 220→**310** |
| wavelord | 4.5→**9** | 38→**72** | 5→**10** | 230→**320** |
| missilga | 4→**8** | 40→**76** | 5.2→**10** | 240→**330** |
| maou（final） | 5→**10** | 44→**82** | 6→**11.5** | 260→**340** |‡

> ‡ maou は後の **§20.1（Wave R8）で spriteScale 8・radius 68・glowScale 9.5・spawnDist 320（通常ボスの約1.2倍＝実寸263×235px）へ再縮小＋白→重厚ガンメタル色**に調整（本表の scale10 は R6 時点の記録）。

- 最終ボスは縦長人型スプライトのため scale10 でも実表示 **329×294px**（画面640×360 に対し横51%・縦82%）＝圧倒的だが下・左右に余地を残す（scale11-12 は縦360px超で操作不能のため 10 に決定＝「埋め切らない」原則）。

## 18.2 最終ボスの3特別攻撃（FB#3）

maou の attacks ローテーション＝3特別攻撃 `[laser, missile, nova]`（armslam は近接データとして保持・ローテから除外）。`idleSec.betweenAttacks=[2.2,2.0,2.6]`（長さ一致）。phase2 は laser 直後に vulcan を割り込ませる従来ロジックを維持。

1. **① 亜空間レーザー薙ぎ（laser強化）**：beamWidth 34→46・beamLength 340→420・sweep ±35°→±42°・activeSec 0.6→0.7。極太/長射程の回転薙ぎ。
2. **② 多連ホーミングミサイル斉射（missile強化）**：count 4→**7**。`fireMissiles` が扇状（`sx=(i-mid)*45`）に一斉発射＝「斉射」感。
3. **③ 重力弾幕ノヴァ（nova・新規）**：`novaTele`（telegraphSec1.1・`specialCharge`音・腕を振り上げ＋上体旋回）→ `novaFire` で waves5×perWave14 の全方位弾を `spinDeg`13°ずつ回して螺旋状に連続波で放つ（bulletSpeed116・やや遅弾で隙間を縫って回避可）。起爆の一瞬のみ `whiteFlash(0.32<0.5)` を1回。波index/角度のみで**全決定論**（Math.random不使用）。

## 18.3 ボス戦BGM（FB#4）

- 配線は既存を踏襲：`spawnFight` で `startBgm('boss')`、warn予告で `stopBgm()`、非final撃破の `finishMini` で `startBgm('battle')` 復帰、final撃破は Result 遷移。オープニング/通常プレイ='battle'、ボス戦のみ='boss' でメリハリ。
- 強化：`boss` 曲（Am）に小節頭のオクターブ下サステインパッド（saw・gain0.05）＋ループ先頭クラッシュシンバル（gain0.06）で緊張感と山場感を付与。MASTER_VOL 0.33 据え置き・突発スパイクなし。

## 18.4 検証 v12（Wave R6）

- `node vortex/dev/validate-data.js` — **OK（monsters=6, enemies=5, bosses=6）**。`node vortex/dev/test-core.js` — **全PASS**（6段・bossId順・final1つ・spawnSec単調増加・`betweenAttacks長=attacks長`・`special.maxUses=5` の回帰維持）。`node --check` 3ファイルOK。
- **CDP実機**（`scratchpad/cdp-r3-boss-giant.mjs` PORT8803/DBG9345、`cdp-maou-nova2.mjs` PORT8805/DBG9347）：6体を実寸(zoom=1)で撮影しパーツ union の表示px実測＝**全ボス縦占有98%以下（操作余地あり）／maou 329×294px**。maou 到達後の state監視で laser/missile/nova の3特別攻撃stateを観測、**nova弾がボス中心から放射され画面全体へ弾幕展開（bulletCount実測＋PNG目視）** を確認。**例外0件**。
- **BGMは音声のため headless 自動検証の対象外**（autotest は `withAudio=false`）。配線（'boss'開始/復帰）と SONGS/SFX 構造整合を静的確認。
- 検証知見：プレイヤーをボス中心に密着させるとボス中心発射のnova弾が生成瞬間の衝突判定で即消滅する（bulletCount=0）。実プレイ相当にプレイヤーを離して計測する必要がある（**実バグではなく検証アーティファクト**）。

---

# 19. Wave R7（実プレイFB第3ラウンド：体力回復アイテム・弾の判別・弾の迫力）

> FB第3ラウンド #1（体力回復アイテム）／#2（自機と敵弾の判別）／#5（弾の迫力）を本章に記録（#3/#4は §18）。

## 19.1 体力回復アイテム（FB#1）

- balance.js `healItem`：`dropRate:0.045`（雑魚4.5%）／`eliteDropRate:0.6`／`healAmount:25`（maxHp100基準で約25%＝回復過多で崩さない）／`lifeSec:12`（残3秒点滅）／`magnetRadius:24`・`pull:140`（gemの40/220より弱め＝貴重感）／`pickupRadius:13`／`fullBonusCoins:15`。
- ドロップ源：雑魚・エリート＝`Run.killEnemy`→`rollHealDrop`（`run.rng.chance(rate)`）、ボス撃破＝`boss.js awardKillRewards`→`run.spawnHeal` 確定1個。gem/core と同じ撃破フローに乗せる。
- 取得：gem同型の `spawnHeal`/`updateHearts`/`releaseHeart`＋`_heartPool`。接触＋弱magnet。`collectHeal` でHP回復（満タン時は無駄にせず `fullBonusCoins` コインへ）＋緑桃パーティクル＋`heal`音。HUDのHPバーは毎フレーム `player.hp` を読むので自動増加。
- 見た目：`heart` テクスチャ（ふくらんだ2円＋下向き三角＝ハート）赤本体＋桃グロー・`run.elapsed` 基準のふわふわ浮遊/脈動（乱数追加消費なし）。XPジェム（緑金のひし形）と色・形で明確に別物。

## 19.2 味方弾／敵弾の判別（FB#2）

形が主軸・色が補助。**味方＝星型＋金白フチ／敵＝丸い危険弾（foe_orb）＋赤フチ**。各モンスター/ボスの個性色(tint)は弾本体に残す。

- 味方弾（`Run.spawnBullet`）：既存の星/かわいい武器形を維持＋グローを金白 `0xfff2b0` に統一＋進行方向へ長い尾。
- 敵弾（`Run.spawnFoeBullet`＋`boss.spawnBullet2` の汎用orb）：新テクスチャ **`foe_orb`**（詰まった円＋上下左右トゲ）＋グロー赤 `0xff2f2f`。**重要修正＝ボス汎用弾が従来 `'core'`（5点星＝味方に見えた）だったのを `foe_orb` へ差し替え**。
- テクスチャ生成＝`Boot.js`（`makeHeart`/`makeFoeOrb`）。ボス特殊弾（missile涙滴／cutter円鋸／beam）は既存見た目を維持しつつグローのみ赤フチへ統一。
- BOOMERANG（回るクッキー）/RINGWAVE（音符リング）は形が既に味方寄りで丸弾と混同しないため本体色のまま据え置き。

## 19.3 弾の迫力（FB#5）

- サイズ/グロー拡大：味方弾 body 2.4→2.9・尾 6.5×2.8→8.0×3.2。敵弾（Run/boss）2.4/2.6→3.0＋静止ドットだった敵グローを進行方向トレイル化。すべて ADD。
- `fx.muzzleFlash(x,y,angle,color)` 新設＝**発射1回につき1回**（主人公ショット/仲間SHOT/ボス ring・cutter・missile・nova）。弾1発ごとには呼ばない＝nova等の多弾でも負荷を増やさない。
- `fx.hitSpark(x,y,color)` 新設＝味方弾命中時に呼ぶ（`_hitSparkT` 0.03sスロットル）。
- 両ヘルパーはプール再利用（`muzPool`/`sparkPool`）・rng不使用・短命tween・color=null フォールバック。
- スピード：据え置き（FB#4で+20%済み・避けられない弾幕を避ける）。迫力はビジュアル/エフェクトで確保。

## 19.4 検証 v13（Wave R7）

- `node vortex/dev/validate-data.js` — **OK**（monsters=6, enemies=5, bosses=6・healItem追加でスキーマ抵触なし）。`node vortex/dev/test-core.js` — **全PASS**（balance既存キー/構造不変）。`node --check` 7ファイルOK・擬似DOMスモーク例外0。
- **CDP実機**（`scratchpad/cdp-r3-bullets-heal.mjs` PORT8806/DBG9348）：foe_orb/heart 生成・**HP回復 40→65(+25)**・満タン時ハート→コイン 0→15・korotama 弾判別シーンで敵弾 foe_orb 最大8発・**ボス撃破の確定ハートdrop**・**FPS60維持**・例外0。**PNG目視で味方弾(白/金の星)と敵弾(赤/橙のfoe_orb丸)が色・形で区別でき、赤ハートがXPジェム(緑金ひし形)と別物**であることを確認。**8/8 PASS**。
- 要フォロー（実プレイFB判断）：味方が赤系tintの武器を持つ場合の弾本体色が敵弾の赤に近づく可能性（フチ色=金白/赤＋形=星/丸で区別を担保）。赤い敵弾と赤いハートは形（丸/ハート）で区別。

---

# 20. Wave R8（実プレイFB第3ラウンドの追加調整）

> FB第3ラウンド反映後のユーザー追加要望。20.1＝最終ボスの色/サイズ再調整、20.2＝必殺技上限8回・弾/ハートの色微調整（後続バッチ）。

## 20.1 最終ボス maou：白→重厚色・通常ボスの約1.2倍へ縮小（ユーザー「白から重厚色へ」「大きすぎ→通常の1.2倍に縮小」）

- **色（#4）**：白ロボ脱却。enemies.js `MAOU_PAL` を w本体 `#f2f4f8→#3a4150`(ダークガンメタル)・s縁 `#9aa0ab→#aeb6c4`(明シルバー)・k影 `#20242c→#171b22`(近黒鋼)・r炉心 `#e03028→#c8202c`(深紅)。c炉心シアン `#46e6ff`・y金冠は威厳アクセントとして残す。glow: outer `#e03028→#b01c22`・inner `#38e1ff→#4ad4ff`。濃淡3段で暗背景からシルエット分離。`bulletTint` は弾バッチ領域のため未変更。
- **サイズ（#5）**：spriteScale `10→8`・radius `82→68`・glowScale `11.5→9.5`・spawnDist `340→320`。CDP実寸 329×294→**263×235px**（通常ボス最大 uzuking 217×184 の幅1.21倍・高1.28倍＝約1.2倍）・縦占有 82%→65%。rig の ox/oy はスケール乗算で相似縮小（boss.js L677-678）＝配置破綻なし。
- 検証：validate-data/test-core 全PASS・`node --check`OK・CDP実機（`scratchpad/cdp-r3-boss-giant.mjs`）で**重厚色が暗背景で潰れず**（赤炉心/金冠/シアンのアクセントが映え）・**実寸が通常ボスの約1.2倍**・例外0を確認。

## 20.2 必殺技8回化・弾/ハート色の判別微調整（#2必殺・#1弾色フォロー）

- **必殺 maxUses 5→8**（他 special 値は据え置き）。test-core ガードを `=== 8` に更新。HUD は数値表示「ひっさつ x{usesLeft}」で 1桁のまま破綻なし（special.js は `BALANCE.special.maxUses` を動的参照）。
- **弾/ハート色**（Run.js に `lightenC`/`darkenC` ヘルパー追加）：ハート本体を4隅グラデ tint（上 `0xffd0ec` 白桃／下 `0xff4da6` マゼンタ桃）＋glow `0xff9edf` 明桃で「明るい桃ハート」に、敵弾 foe_orb 本体を `darkenC(color,0.18)`＋フチ glow `0xcc1420` 深紅で「濃く重い危険弾」に＝赤同士を分離。味方弾を4隅 tint（上 `lightenC(color,0.5)`／下 `0.22`）で常時白コア化＋glow `0xfff8d0` 金白強化で、赤系 tint 武器でも「明るい星＝味方」。
- 検証：test-core「maxUses8」PASS・CDP実機で弾/ハート色反映・例外0。

## 20.3 最終ボス マオウレクス 登場イベント（ユーザー要望）

- 対象は final(maou) のみ。`spawnFight` 末尾で `state='maouIntro'`（3.6s）へ分岐（他5体は不変）。**フリーズ不使用**（`run.cinematic`/`freezeT` 中は Run.update 早期return で boss.update と elapsed が止まり演出タイマーも破綻するため）＝boss内部 state で実時間自動進行。
- シーケンス（intro開始からの経過）：t0 `bigBoom`+shake+`startBgm('boss')`＝**BGM切替**・パーツ alpha≈0 →t0-1.8 フェードイン＋スケールイン(0.55→1.0)＋降下(-26→0)で**ゆっくり登場** →t1.0 セリフ1「オマエタチ・・・ハ・・・キケン・・・」(シアン) →t2.0 セリフ2「ハイジョ・・・スル・・・」(赤) →t2.9 テロップ「【マオウレクスが現れた】」(白)+shake+bigBoom →t3.6 `chase` 復帰。
- テキストは `run.add.text` を boss.js から直接生成・`setScrollFactor(0)` で画面固定（必ず画面内）・depth1500・機械的明滅→自壊、`introEls` 追跡で `destroyDisp` 時に掃除（リーク/二重発火なし）。
- autotest/CDP非阻害：`boss.active`/`entity`/`state('maouIntro')` が spawn 直後から立つ・3.6s で必ず chase 復帰・intro中も `dealDamage` で撃破可能・`Math.random` 不使用・白フラッシュ不使用（MASTER_VOL据え置き）。
- 検証：CDP実機（`scratchpad/cdp-r8-verify.mjs`）8/8（maouIntro発火・セリフ2行/テロップが画面内・chase復帰・撃破可能・例外0）。
- **既知の改善余地（要ユーザー判断・未実装）**：終盤は雑魚（最大220体）＋敵弾が画面に多く、ゆっくり登場する maou 本体・セリフ・テロップが埋もれ気味＋プレイヤーのレベルアップテロップと重なることがある。登場の荘厳さを出すには intro 中の暗幕/雑魚フェード等の追加演出が有効。

## 20.4 未対応の提案（ユーザー確認待ち）

1. **「ボスが自分の腕で殴る」の主役化**：腕(armR/armL)パーツを持つのは maou のみ（enemies.js）だが、maou は §18.2 で armslam をローテから外し[laser,missile,nova]に。armslam を持つ uzuking(4足)/wavelord(戦車) は腕がなく前脚/代替で叩くため「腕で殴る」絵にならない。→ **maou に armslam（腕の叩きつけ）を復活・大きく可視化**する提案。
2. **登場イベントの荘厳化**：§20.3 の雑魚埋もれ対策（暗幕/雑魚フェード）。

> **→ §20.4 の両提案は §20.5 で実施済み（ユーザー両方承認）。**

## 20.5 maou 腕叩きつけ復活＋登場イベント荘厳化（§20.4提案の実施・ユーザー両方承認）

- **A. maou armslam 復活・可視化**（「ボスが自分の腕で殴る」の主役化）：attacks `[laser,missile,nova]`→**`[laser,armslam,missile,nova]`**（betweenAttacks `[2.2,2.2,2.0,2.6]`・長一致＝test-coreガード維持）。armslam を大きくゆっくり：telegraphSec 0.7→**1.1**（前半0.66sで振り上げ armPose -1.5→**-2.2**、残りは頂点保持＝**タメ**）→slamHit で armPose **-2.2→+1.3** を加速カーブで一気に**振り下ろし**＋bodySink 4→6。腕(armR/armL・肩支点 origin[0.5,0.10])が明確に振り下ろされる。damage系(shock/melee)は据え置き（見せる目的・火力過多にしない）。他ボス(uzuking/wavelord)は `isMaou` ガードで従来のまま。phase2 の laser→vulcan 割り込みは無改変。
- **B. 登場イベント荘厳化**：maouIntro 中だけ暗幕（全画面 tint `0x00030a`・setScrollFactor0・depth900・alpha 0→**0.42**（<0.5厳守））を敷き、maou 全パーツを depth+1000 持ち上げ（intro テキストは既存1500）＝雑魚(depth9/11)を暗幕下に沈め maou本体・セリフ・テロップを前面化。`endIntro`/`destroyDisp` で暗幕破棄＋depth復帰＝完全復帰・リークなし。
- 検証：validate-data/test-core 全PASS（betweenAttacks長=attacks長 維持）・`node --check`OK・CDP実機（`scratchpad/cdp-r8b-maou.mjs`）**7/7**（**maou が腕を振り上げ→タメ→振り下ろして殴るのを撮影**・登場暗幕・intro後の完全復帰・撃破可能・例外0）。
- **要フォロー（実プレイ判断）**：暗幕(alpha0.42)で全体が暗くなりセリフ/テロップは読みやすくなったが、終盤の雑魚(最大220体)が多く maou本体はまだやや紛れる。さらに荘厳にするには intro 中の雑魚 alpha フェード/停止の追加が有効（未実装）。

# §21 R12：主人公＝突撃兵（キャラクター特性の確定／攻撃と被弾の手応え）

ユーザー指示「クルット・モビットを完成させたい。主人公のキャラクター特性を決めたい。それにあうビジュアルも。
そして攻撃の感触と攻撃を受けた感触を磨きたい。これが最重要」への対応。AskUserQuestion での確定事項は
**①戦い方＝突撃兵（近接主体） ②新しい操作は追加しない（演出だけ磨く） ③見た目は全面再設計**の3点。

## 21.1 設計の核（なぜこうしたか）

操作を増やさない縛りがあるため、プレイヤーにできる選択は**移動だけ**になる。そこで「**どれだけ敵に踏み込むか**」
がそのまま火力になるよう設計し、移動だけで駆け引きが成立するようにした。軸は2つ：

1. **距離**：`melee.closeDist(20)` 以内の至近で殴ると `closeMul(1.7)` 倍。一番危険な距離が一番強い。
2. **ヒート**：殴るたび `heatPerHit` 加算・毎秒 `heatDecayPerSec` 減衰。火力（+4%/段・最大+40%）と
   演出（拳とオーラの色・光の筋の本数・打撃音の音程）が連動する。**被弾すると半減**＝踏み込みのリスク。

⚠️ **ヒートの収支に注意**：殴る間隔0.3秒なので1回あたりの減衰は `heatDecayPerSec×0.3`。`heatPerHit=1` /
`decay=3` では実質 +0.1/回にしかならず、実プレイでは永遠に溜まらない（CDP実測で判明し `heatPerHit=2` へ修正）。
現行は実質 +1.1/回 ＝ 殴り続けて約3秒で満タン、離れると約3.3秒で冷める。

## 21.2 主武器クラッシュアーム（旧スターオーラの置き換え）

- `BALANCE.hero.melee`：radius 34（+9/段）・intervalSec 0.3・damage 12（+6/段）・maxTargets 5・
  closeDist 20/closeMul 1.7・**bossMul 0.5**（接近リスクに報いるがボス戦は壊さない）・knockback 150/0.12s・
  heatMax 10/heatPerHit 2/heatDecay 3/heatDamageMulPerStep 0.04・punchSec 0.14/punchLunge 7
- `Run.updateHeroMelee`：間合い内の敵を最大5体まとめて殴る→ダメージ→`e.knock*` でノックバック付与→
  ヒート加算→踏み込みモーション（`_punchT`/`_punchAng`）→`fx.heroImpact`→ヒットストップ0.03→`Sound.sfx('heroPunch', heat)`。
  空振り時は `_meleeT=0.06` で短く再判定し、間合いに入った瞬間に殴る。**rng は一切消費しない**（autotest の決定性）。
- `Run.updateHeroFist`：`hero_fist1-3` を殴りの0.14秒間だけ前方へ突き出す。**通常描画**（加算合成にすると熱色が
  飽和して「黄色い四角」に潰れ、腕と拳の形が読めなくなる）。光り物は `fx.heroImpact` が担当し役割を分ける。
- 敵側：`spawnEnemy` で `knockX/knockY/knockT` を0初期化（プール再利用の残留防止）、`updateEnemies` が減衰適用。

## 21.3 銃はサブ武器へ降格（**§23 で全廃・以下は歴史的記録**）

- `findShotTarget()`：**拳の間合いの外**にいる敵を優先し、いなければ射程内の最寄りを狙う（＝銃は拳が届かない
  敵への牽制）。`updateHeroWeapon`/`updateHeroShot` が共用。damage/interval は不変。
- 表示：scale 2→**1.1（+0.25/段）**・構え位置を腰だめへ（hold 10・y+7）。旧scale2は本体より銃が大きく、
  正面から見て銃しか見えない絵だった（PNG目視で判明）。
- test-core が **拳のDPS > 銃のDPSの2倍** を恒久ガードしている（主従が逆転しないように）。

## 21.4 被弾の手応え

- `hitPlayer(dmg, srcX, srcY)`：加害者座標は**任意引数**（旧呼び出しも動く）。渡すと①反対方向へノックバック
  （`player.hurtKnockback 150` / `hurtKnockSec 0.18`＝操作を奪わない長さ）②その方向の画面端が光る。
  Run.js 4箇所・boss.js 6箇所すべてで発生源を渡すよう更新済み。
- ダメージの重み `ratio = dmg/maxHp` で**音・シェイク・フラッシュ濃さ・ヒットストップを一律に強弱**させる
  （かすり傷と大ダメージが同じ手応えにならない）。`Sound.sfx(name, arg)` は arg を音関数へ渡せるよう拡張
  （既存の引数なしSFXは無視するので後方互換）。
- 低HP警告：`player.lowHpRatio 0.3` を割ると `fx.setLowHp(true)` で画面周縁4辺が赤く脈動（alpha 0.10〜0.19・
  加算・中央は塞がない）＋`Sound.sfx('lowHp')` を1回。回復で自動解除。
- 白/赤フラッシュの子ども安全上限（alpha<0.5）は全経路で厳守（被弾フラッシュ最大0.44・周縁警告最大0.19）。

## 21.5 ビジュアル全面再設計（突撃兵）

正面から見て「拳を構えて踏み込む」ボクサー型シルエット。熱色は味方色ルール（味方＝白〜金、敵＝赤）に従い
オレンジ〜金に寄せ、敵弾の深紅と混同しない。

- `PLAYER_SPRITES`：Stage1 アサルト・トルーパー（12×14・小型ガントレット）／Stage2 ブレイカー・エクソ
  （14×15・端まで張り出す肩＋腰の熱噴気）／Stage3 タイタン・スマッシャー（16×**18**・**頭の2本角**＋最も厚い肩＋
  胸の大型シアン炉心）。表示スケールも 2 / 2.15 / 2.3 と段階差を付けた（当たり判定 radius 7 は不変）。
- `HERO_FISTS`（新規）：Stage1 小型ガントレット 8×6／Stage2 パワーアーム 12×8／Stage3 巨大破砕アーム 16×10
  （金のパワーリング入り）。右向き基準・Boot.js が `hero_fist1-3` として生成。
- ⚠️ **ドット絵の視認性の教訓**：角を2px高で描いたら実機でまったく見えず、テクスチャのピクセルを直接読んで
  「描画はされている／小さすぎて見えないだけ」と切り分けた（`scratchpad/cdp-tex-probe.mjs`）。角は3px高＋
  頭部に接続（1px浮かせると"点"に見えて角にならない）。

## 21.6 検証 v14（R12）

- `node dev/test-core.js`（旧オーラ検証を突撃兵ガードへ置換）／`validate-data.js`／全js `node --check` 全PASS
- CDP実機 `scratchpad/cdp-r12-assault.mjs`（PORT 8821 / DBG 9361）**19/19 PASS・例外0**：
  拳が可視位置に描画（58/120フレーム可視・**可視分はすべてカメラ内**＝画面外再生の回帰なし）／拳が実際にHPを削る／
  至近20 > 間合いギリギリ12（踏み込みボーナス）／ヒート 2→10・火力 12→17・冷却・被弾で半減／敵ノックバック／
  被弾で反対方向へ実移動／低HP警告のon-off／銃が間合い外を優先／60fps維持
- ⚠️ **CDP検証の落とし穴（新規）**：`transformPlayer(stage)` を直接呼んでも、`updatePlayer` が毎フレーム
  `level` から段を再判定して呼び直すため、**level を合わせないと待機中に Stage1 へ戻る**。3段階のPNGが全部
  Stage1 だったのに気づかず「3段の差が小さい」と誤判定しかけた。段の撮影時は `r.level` も設定すること。

## 21.7 R12b：実プレイの縮尺で主人公が見えるようにする

R12を公開したのち「主人公が修正されてない」との指摘。調査したところ**デプロイもキャッシュも正常で、
新デザインは動いていた**（公開URLのブラウザ内 `PLAYER_SPRITES` に拳`h`あり／Stage3高さ18／`HERO_FISTS`3段／
テクスチャの熱オレンジ14px・旧タン0px。キャッシュ有効/クエリのみ/完全無効の3条件すべてで新版）。
真の原因は**縮尺と輝度**だった。

- **主人公が画面で一番小さかった**：12×14ドット×スケール2＝**24×28px**。一方 なかまは 16×16×2.5＝**40×40px**
  （レベルでさらに拡大）。主役が脇役より小さいので、ドット絵をどれだけ作り込んでも潰れて見えない。
- **背景に沈んでいた**：装甲 `#3a4453`（平均輝度≒67）が背景 `#0a0a1e`（輝度≒12）と近く、
  明るいシアン/黄色のなかまの横で暗い染みになっていた。

対処（当たり判定 `player.radius = 7` は不変。**見た目だけ**変更）：

| 項目 | 旧 | 新 |
|---|---|---|
| 本体スケール | 2 / 2.15 / 2.3 | **2.8 / 3.0 / 3.2** |
| 実表示サイズ | 24×28 / 30×32 / 37×41 | **34×39 / 42×45 / 51×58** |
| 装甲テクスチャの平均輝度 | ≒67 | **140 / 137 / 153**（背景12） |
| パレット g / s / d | `#3a4453` / `#8a99ad` / `#161b22` | `#55647c` / `#cfe0f2` / `#232c3d` |
| グロー | scale1.6・α1.0 | **scale2.2＋0.55/段・α0.55**（本体を焼かない明るさ） |
| 拳の突き出し `reach` | `9 + (12+5(s-1))·ext` | `11 + (15+6(s-1))·ext`（本体拡大で埋もれた分を外へ） |
| 拳スケール / 銃スケール | 2＋0.35/段 / 1.1＋0.25/段 | 2.6＋0.4/段 / 1.4＋0.3/段 |
| タイトルのデモ機 | 2.4 | 3.2 |

- 変身の膨らみtweenは固定値 `scale: 3.2` だと拡大後のスケールと並んで**膨らまなくなる**ため、
  `this.playerImg.scaleX * 1.4` の相対値へ変更した。
- `dev/validate-data.js` の寸法上限は 8〜16 固定で、**Stage3(16×18) が R12 時点から NG のままだった**
  （R12で気づけていなかった見落とし）。主人公のみ上限20へ緩めた（角のぶん縦に長いのは意図的）。
- ⚠️ **教訓**：ドット絵の良し悪しは**必ず実プレイの等倍スクリーンショットで判定する**。拡大PNGだけ見て
  「良く描けている」と判断すると、画面上で存在しないのと同じ絵を作り込むことになる。加えて**周囲の
  キャラと並べた相対サイズ・相対輝度**まで測ること（`scratchpad/cdp-hero-size.mjs`）。

## 21.8 R12c：拳が「主武器」として実際に機能するようにする

実プレイFB「**武器が銃だけなのだが。主武器は拳に変えたのではなかったか。いまゲームをしているのだが
いちども殴らない**」。CDPで自然進行のまま40秒計測したところ、指摘は完全に正しかった。

**実測（修正前）**：撃破31体・**平均撃破距離57px**・**拳の間合い(34px)内で倒れた敵0体**・**殴った回数0回**。
原因は3つの複合。

1. **なかまが先に全部倒す**：公転半径48の上を回りながら SLASH の hitRadius18 で**66pxまで**叩く。
   拳の間合い34pxは、その内側＝敵が到達する前に死ぬ「死に値」だった。
2. **銃が牽制ではなく主力だった**：range240・1.55秒間隔で遠方から削り切る。
3. **序盤の敵密度が薄すぎた**：spawnIntervalStart1.9 × spawnCountStart1 ＝ **0.53体/秒**。
   そもそも殴る相手が供給されていない。

さらに**拳は殴る0.14秒しか表示されず**、常時表示の銃だけが目に入る＝「銃だけ」に見えていた。

### 対処と実測の推移

| | 殴った回数/40秒 | 間合い内フレーム率 | 撃破 | 間合い内で撃破 | HP |
|---|---|---|---|---|---|
| 修正前（間合い34） | **0** | 0% | 31 | 0 | 86 |
| 間合い56へ | 20 | 3.6% | 35 | 6 | 100 |
| 間合い70へ | 24 | **2.2%（悪化）** | 28 | 2 | 100 |
| 密度2.5倍＋間合い52 | 45 | 6.7% | 57 | 13 | 100 |
| **密度5倍＋間合い58（採用）** | **64〜71** | **15.6〜17.2%** | **97〜101** | **19〜23** | **100** |

- ⚠️ **間合いを広げるだけでは逆効果**：70にしたら最寄り敵距離が27→62pxへ後退し、間合い内フレーム率が
  3.6%→2.2%へ**下がった**。拳が遠くで敵を倒してしまい、自分で敵を近づけなくする**自己相殺**が起きる。
  頻度は「間合い」ではなく「**敵の供給密度**」で作るのが正しい。
- `hero.melee.radius` 34→**58**（+10/段＝58/68/78）・`closeDist` 20→26・`punchSec` 0.14→**0.2**
  （8フレームは速すぎて殴った絵が見えない）
- `hero` 銃を本当に牽制へ降格：`range` 240→**175**・`intervalSec` 1.55→**1.9**・表示スケール
  1.4→**1.0＋0.2/段**・構えを腰だめへ（`hold`12→9・y+7→+11）＝顔の前を横切って拳より目立っていた
- `wave` 序盤のみ厚く：`spawnIntervalStart` 1.9→**1.15**・`spawnCountStart` 1→**3**（0.53→**2.6体/秒**）。
  **終盤側（IntervalEnd0.45/CountEnd5）は据え置き＝最終密度は不変**。HPは無傷のままで難度は上がっていない
- **拳を常時表示（構え）に変更**：`updateHeroFist` は殴っていない間も `ext=0.45` で拳を前方に構える。
  `reach` のベースは**16**（Stage1の体半幅16.8pxが下限。下回ると構えの拳が胴体に埋もれて見えない）
- 間合いのオーラを星（w_star2）→**リング（w_ring）**へ。星形では「どこまで届くか」が読めず、
  踏み込む判断ができなかった

### 検証 v15（R12c）
- `test-core.js` / `validate-data.js` OK ／ CDP `cdp-r12-assault.mjs` **19/19 PASS・例外0**
- CDP `scratchpad/cdp-punch-freq.mjs`（新規・PORT8825/DBG9377）＝**自然進行のまま殴る回数を実測**する。
  ⚠️ Phaser は boot 時に `scene.update` をキャッシュするため `r.update` の差し替えは効かない
  （frames=0 になる）。毎フレーム呼ばれる `updateHeroFist` をラップして観測すること

# §22 R13：物語正典『手だけが、おぼえていた』（2026-08-08 全項目確定）

3エージェント協議＋相互批評→統合→ユーザー精査（約10ラウンド）で確定した物語の正典。**未決定ゼロ**。
以後のテキスト・ビジュアル・システム変更はすべて本章に従う。本章と矛盾する実装・提案は作業失敗。

## 22.0 設計原理（この物語の作り方そのもの）

- **意味づけ最小の原則**：攻撃は攻撃。他者を傷つける行為であり、殴打に「伝える」「解放する」等の
  生産的な意味を与えない。意味は**関係と代償**（誰が何を失ったか）にのみ宿る。
  作者都合の後付け設定が一言でも入ると参加者は冷める（ユーザー恒久指示）。
- **フェアプレーの誤認**：オープニング2行目は少年の一人称の**誤認**（本人がそう信じている）。
  客観的事実ではない。クリア画面の返歌が同じ動詞で訂正する＝ミステリーの反転として設計されている。
- **説明しないことの指定**：少年が廃墟に留まる理由は語らない（公転が止まらないという実装事実で見せる）。
  入植地の背景はゲーム内で語らない。人類が他星系に居るかは物語の外。

## 22.1 世界の事実：ヴォイドと三種族

- **ヴォイド＝星が消える宇宙の理そのもの**。悪役は存在しない。約10年前、この星系の星が消えた。
  それだけで三つの種族のすべてが変わった。
- 三種族（マキナ・少年・モビット）は災厄以前、同じ星系で**接点なく**生きていた。三者を編んだのは災厄。

## 22.2 マキナ＝ゆりかご艦隊（こどもたちの箱舟）

- 星のそばの人間の**入植地**が建てた「もしものときの、こどもたちの箱舟」。乗組員はすべて世話の機械
  （＝巨艦の理由。マオウレクスの空虚な広さは設計ではなく**災厄の指紋**）。
- 災厄の日：星が瞬き（冷えの前兆）避難開始。順番は**いちばん小さい子から**。最初に運ばれたのが
  当時2歳の少年。星は予定より早く消え、地上とシャトル＝親兄弟・友達・他の人間はすべて失われた。
  鋼の艦隊だけが冷えに耐えた——乗せていたのは、ひとりだけ。
- **選ばれし者の否定**：彼が生き残ったのは特別だからではない。**いちばん幼かったから**。それだけ。
- **名簿**：たくさんの名前。乗艦できたのは1名。その1名だけが「ミカクニン」＝10年の捜索対象
  （他は喪失確定。捜索対象が一意に定まる）。
- **暴走**：子を失った保護システムは「危険の完全排除」へ振り切れた。もしものために作られ、もしもの日に
  ほとんど何もできなかった機械の過剰防衛。
- **戦争をさせてもらえなかった機械**：敵（ヴォイド）に体がないため、10年間、無害なもの（モビット）だけを
  狩り続けた。**聞く機能はない**（だから誰にも尋ねられなかった）。予告つき攻撃＝育児安全設計の名残。
  狩りは下手。
- **装甲＝熱の蓋**：戦時改修で温かさを密閉した＝敵マキナが冷たい理由。「サムイ」＝壊れて装甲が割れ、
  密閉していた熱が逃げていく。

## 22.3 少年と守り手

- 少年は**生身**の人間。救ったのは**名もない一体**の守り手（マオウレクス本体ではない——死亡部品参照）。
  災厄の日、自分の胸の心臓をポッドに入れ、掴んだまま**両腕ごと千切れて**艦と沈んだ。
- **ゆりかごの腕**：少年はその両腕を装着して戦う（生身が鋼鉄を壊せる理由・強さの説明）。
  **変身＝腕の復元**（XPジェム＝機体のかけらを取り込み、腕が本来の形へ戻っていく）。
- **守り手の心臓**：腕の中で10年動き続けている。剥き出しのまま放熱する＝モビットが少年に集まる理由
  （熱走性）。
- **記憶**：当時2歳。人間はだれも2歳を覚えていない＝記憶喪失は装置ですらない、ただの人間の事実。
- **たたかいかたの正体**：体が覚えていたのは**育てられ方**（だきとめられた動作）。漂流の歳月に少年自身が
  それを武器へ裏返した。マキナが世話の動作を武器に裏返したのと**同じ変換＝壊れ方の一致**。
  最終戦がミラーマッチになる根拠。
- 返歌の能動形「だきとめかた」は誇張ではない：おぼえていた「手」には、だきとめた側の腕（ゆりかごの腕）が
  含まれている。

## 22.4 モビット

- 天敵のいない星で進化した**島嶼馴化種**。武器も恐れも持たない。語彙が全部遊び。
- 災厄後は**寄り添って生き延びた**（熱源に集まる熱走性）。合成祭壇＝二つの火がひとつになること。
- **遊び＝生存戦略ではなく尊厳**。種の危機だから遊ぶのをやめる、という発想自体を持たない生き物。

## 22.5 確定文言（一言一句変更禁止）

| 場面 | 文言 |
|---|---|
| オープニング（詰め表記） | むかしのことはおぼえていない<br>おぼえているのは、たたかいかただけ |
| クリア画面の返歌（分かち書き） | おぼえていたのは たたかいかたじゃ なかった<br>——だきとめかた だった |
| ボス戦開始（初使用ログ） | 「ヘイキ・・・キドウ・・・ショカイ・シヨウ・・・」（10年戦えなかった＝全武器が初使用） |
| ボス撃破つぶやき5種 | 「・・・サガス・・・」「・・・ミツカラナイ・・・」「ズット・・・サガシテ・・・イル・・・」<br>「ミツケル・・・マデ・・・」「・・・サムイ・・・」 |
| ゲームオーバー | 「・・・ネテ・・・イル・・・」（トドメを刺さない。**？は付けない**） |
| 最終場面 | 受け止める軌道のワイヤーアーム→掌が開く→「アソンデ・・・イル・・・」→<br>「ミツケタ・・・」→「オオキク・・・ナッ」（言い切らず停止） |
| 名簿演出（クリア後・返歌の直前） | 名前が流れて暗く沈む（状態文字なし・視覚のみ）→ひとつだけ明るく残り<br>「ミカクニン」→一拍おいて「**カクニンズミ**」へ書き換わる |

- つぶやきは**全文が目的語欠落**。対象は最終場面の視線でのみ供給される。
- オルゴール2小節（最終場面・任意）は実機テストで採否判断。
- オープニングと返歌の**表記の非対称は意図**（詰め表記＝事実の吐露／分かち書き＝心情の開示）。統一禁止。

## 22.6 語りの三層規則（すべてのテキストはどれかの層に属する）

1. **システム文書**（名簿・ログ・図鑑・UI）：事務的な事実の羅列のみ。感情語彙禁止。
   ミカクニン→カクニンズミは事務的な状態遷移（「ミツケタ」を押すのは層の混同＝禁止）。
2. **マキナの声**：カタカナ・「・・・」で途切れる・すべて**観測の宣言**。**疑問符は存在しない**
   （聞く機能なしの帰結。動かない子ども＝「寝ている」以外の分類を持たない断定が正体と痛ましさを見せる）。
3. **少年の心情**：分かち書きの空白で息をする（返歌のみ。オープニングはまだ意味を知らない声＝詰め表記）。

- **語り手ルール**：「たたかいかたをおぼえていた」と言ってよいのは少年の一人称のみ。
  客観テキスト（図鑑・UI・ナレーション）がこれを事実として書くのは禁止。

## 22.7 システムへの帰結（実装マッピング）

| 変更 | 対象 |
|---|---|
| **銃の全廃**（主人公は近接のみ。サブ含め遠距離廃止） | monsters.js `HERO_GUNS`／Run.js 発射・`playerWeaponImg`／Boot.js `hero_gun1-3`・`hero_tracer`／sound.js `heroGun`／balance.js gun系／test-core の銃前提 |
| **腕の技解放**：Stage2＝ワイヤーアーム・Stage3＝アームスラム（最終戦ミラーマッチ） | boss.js の実装済みコード流用（startWireShot／armslam） |
| **主人公再デザイン**：生身の少年＋ゆりかごの腕（兵士コンセプト廃止） | 「移動の判断だけが火力」（§21.1 距離＋ヒート）は継承 |
| **名前**：`HERO_NAME` 定数1箇所に集約 | 息子さんが決定。名簿演出の「ミカクニン」の1件＝この名前 |
| テキスト実装 | Opening.js（OP2行）／boss.js（初使用ログ・つぶやき）／Run.js（ゲームオーバー）／Result.js（名簿→返歌） |

## 22.8 死亡部品リスト（検討済み・廃棄済み。**復活禁止**）

殴打＝伝達・照合・解放／声＝偽物判定／撃破＝読書／主人公＝機械／コアからモビット出生／
ヒート＝傷つけ慣れ／遊び＝兵器仕様・生存戦略／「アノコ」（推論を確定させる語）／完成セリフでの停止
（「オオキク・ナッ」を言い切らせない）／マオウレクス＝救い主（救ったのは名もない一体）／
名簿スタンプ「ミツケタ」（感情層と記録層の混同）／マキナの発話への疑問符

# §23 R14：銃の全廃と「腕の技」解放（SPEC§22.7 の実装）

正典§22 の「主人公は近接のみ」「変身＝ゆりかごの腕の復元」をシステムに落とし込む。
**銃を消すだけでは火力に穴が空く**ので、穴を埋める腕の技を同時に実装した（片方だけのコミットは禁止）。

## 23.1 銃の全廃（撤去した実体）

| ファイル | 撤去したもの |
|---|---|
| `data/monsters.js` | `HERO_GUNS`（3段のドット絵） |
| `data/balance.js` | `hero` の `intervalSec`/`bulletSpeed`/`range`/`bulletRadius`/`damageBase`/`damagePerTwoLevels`/`spreadDeg`/`shotByStage`/`pierceFromStage`/`pierceCount` |
| `scenes/Boot.js` | `hero_gun1-3` テクスチャ生成・`hero_tracer` 生成・`makeTracer()` メソッド |
| `scenes/Run.js` | `playerWeaponImg`・`heroShotT`・`findShotTarget()`・`updateHeroWeapon()`・`updateHeroShot()`・`spawnBullet` の `hero_tracer` 分岐 |
| `audio/sound.js` | `heroGun()` |
| `dev/test-core.js` | 「拳のDPS > 銃のDPSの2倍」ガード → **「銃パラメータが存在しない」ガードへ反転** |

- 狙い角は `updateHeroAim()`＋`nearestEnemy(range, minDist)` に集約（`hero.aimRange 260`）。
  これは**攻撃の射程ではなく体の向き**。拳もワイヤーアームも同じ角を使う。
- 虹カード `rainbow_hero` の文言「スターショットが1.5ばい」→「こうげきが1.5ばい」（`heroMult` の効果は不変）。

## 23.2 腕の技①ワイヤーアーム（Stage2解放）

肘から先をワイヤーで射出し、伸びる道中と戻り道の敵を殴って手繰り戻す。**boss.js `wirearm` のミラー**。

- `hero.wireArm`：intervalSec 3.2／maxLen 170／extendSpeed 520／backSec 0.22／turnDegPerSec 200／
  fistRadius 10／damage 16(+6/段)／maxHits 4／knockback 220／bossMul 0.5
- 標的選択は**拳の間合いの外にいる最寄りの敵**＝拳で殴れる相手には使わない（主役を食わない）。
- 1体につき往復で1回まで（`hits` Set）。追尾はマイルド（`turnDegPerSec`）で振り切れる余地を残す。
- 描画は `drawWire()`：外装ケーブル2本（`#55647c`＝主人公の装甲色）＋発光コア（アンバー`0xffb43a`）＋節。
  **敵のワイヤーはシアン**なので、味方色ルール（味方＝白〜金）で区別している。
- 音は既存の `wireShot`/`wireFly`（射出）・`metalSlam`（命中）を流用＝新規音は追加していない。

## 23.3 腕の技②アームスラム（Stage3解放）

両腕を振り上げて叩きつける範囲打撃。**boss.js `armslam` のミラー＝最終戦が同じ技の撃ち合いになる**。

- `hero.armSlam`：cooldownSec 7／minEnemies 4／radius 95／damage 26／telegraphSec 0.35／
  knockback 260／bossMul 0.5
- **`minEnemies` 未満では発動しない**＝空振りの絵を作らず「囲まれたときに捌く技」として意味を持たせる。
- 予告（`_slamTele`）中は `updateHeroFist` が拳を頭上へ振り上げる（ボスの `armPose` のミラー）。
  予告→叩きつけの文法自体がボスと同じ＝正典の「壊れ方の一致」を操作感で見せる。
- 全画面を覆う演出は使わず、広がるリング＋粒子＋シェイクで見せる（子ども安全上限 α<0.5 を厳守）。

## 23.4 検証 v16（R14）

- `node dev/test-core.js`（銃パラメータ不在＋腕の技2種のガードを新設）／`validate-data.js`／
  全js `node --check` 全PASS
- **A. 銃あり版との同一条件比較**（最重要）。`git worktree` で `ae7b012`（銃あり）を展開し、
  同じ seed 42・同じ静止条件・同じ計測コードで測って差分だけを見た（`scratchpad/cdp-r14-melee-only.mjs`・
  PORT8827/DBG9379）。

  | 指標 | 銃あり `ae7b012` | 銃なし（R14） |
  |---|---|---|
  | 40秒 殴り回数 | 67 | 66 |
  | 40秒 撃破数 | 99 | 98 |
  | 40秒 HP | 100 | 100 |
  | 力尽きた時刻 | 78秒 | 78秒 |
  | その時点の撃破数 | 185 | 187 |

  **結論：銃の有無で結果が一致した＝銃はこの時点で実質的に何も貢献していなかった**（R12c で射程175・
  間隔1.9秒まで牽制に降格させた結果、火力としては誤差の範囲に落ちていた）。「銃を消すと弱くなる」は
  実測で否定された。78秒で力尽きるのは**静止し続ける計測条件そのものの帰結**で、銃とは無関係。

- ⚠️ **静止計測の二重バイアス（新しい教訓）**：`autotest` 素の状態では主人公が動かないため
  ①XPジェムを拾えず（`magnetRadius 40` に対し敵の平均撃破距離は約57px）レベルが上がらない
  ②被弾を避けられない、という2つの偏りが同時にかかる。実測でも 78秒で **Lv4 / Stage1 のまま死亡**し、
  **腕の技（Stage2/3解放）が一度も発動しない**。静止計測は「殴りの頻度」には有効だが
  「段階解放される要素」の検証には使えない。
- **B. 実プレイ相当の計測**（`scratchpad/cdp-r14-moving.mjs`・PORT8831/DBG9383）：`moveKeys.isDown` を
  直接操作して「ジェムへ寄る／HP半減で敵から離れる」自動操縦を入れ、40/90/150/210秒で
  **Stage2・Stage3へ実際に到達するか／腕の技が自然に何回発動するか**を測る。rng は消費しない。

  | 時刻 | 段 | Lv | HP | 殴り | ワイヤー | スラム | 撃破 |
  |---|---|---|---|---|---|---|---|
  | 43秒 | 2 | 6 | 135 | 56 | 5 | 0 | 98 |
  | 91秒 | 2 | 9 | 93 | 104 | 16 | 0 | 209 |
  | 149秒 | 3 | 13 | 170 | 155 | 31 | 0 | 427 |
  | 204秒 | 3 | 15 | 170 | 187 | 42 | **1** | 588 |

  **ワイヤーアームは成功**（Stage2到達後 約3.8秒に1回＝設定間隔3.2秒のほぼ上限。主武器の拳187回を食わない）。
  **アームスラムは失敗**（Stage3の84秒間で1回＝プレイヤーは自分がこの技を持つことに気づけない）。

## 23.5 アームスラムの設計やり直し（「自分のキル圏の内側」を対象にしてはいけない）

発動しない原因を勘で潰さず、Stage3 の165秒間の**分布**を実測した（`scratchpad/cdp-r14-slam-diag.mjs`）。

| 半径 | 1体以上 | 2体以上 | 3体以上 | 4体以上 |
|---|---|---|---|---|
| 95px（旧スラム範囲） | **8.6%** | 1.4% | 0.4% | **0.2%** |
| 130px | 27.8% | 12.2% | 6.8% | 3.8% |

- **95px以内に敵が1体でもいる時間が全体の8.6%しかない**（クールダウンは明けているのに条件未達で
  見送った時間＝165秒中144秒＝87%）。`minEnemies` が厳しすぎたのではなく、
  **スラムの範囲95pxが主人公自身のキル圏（拳78px＋仲間66px）の中に丸ごと収まっていた**のが原因。
  この内側を対象にする限り、条件を何体にしようと成立しない。
- しかも**時間が経つほど悪化する**（150秒時点で1体以上15.5% → 260秒で8.6%）。強くなるほど周囲が空く。
- 単純に半径を広げる案は却下：画面は640×360なので半径150pxは直径300px＝画面高のほぼ全域。
  身長34pxの少年の叩きつけとして絵が破綻する。
- **正しい答えはボスの実装にあった**：`maou.armslam` は `meleeRadius 46`（小さな着弾）＋
  `shockCount 9 / shockSpeed 144`（放射状に走る衝撃波）であって、**巨大な円ではない**。
  波が外へ走るからキル圏の外の敵に届く。構造まで含めてミラーにすることで、
  ①絵が破綻しない ②当たらない問題が解ける ③正典の「壊れ方の一致」がより厳密になる、が同時に成立する。
- **改修後**：`triggerRadius 170`（発動判定は**キル圏の外側**を見る）／`minEnemies 2`／`cooldownSec 6`／
  `radius 62`（着弾は小さいまま）／`shockCount 10・shockSpeed 210・shockDamage 18・pierce 3`。
- **恒久ガード**を test-core に追加：`triggerRadius > radius*2`（判定はキル圏の外側）・
  `shockCount>=8 && shockSpeed>0`（本体は走る波）・`radius<=80`（少年の体格で破綻しない）。

**改修後の実測（同一条件・seed42）**

| 指標 | 改修前 | 改修後 |
|---|---|---|
| Stage3中のスラム発動 | 1回／84秒 | **20回／164秒（約8.2秒に1回）** |
| 条件未達で見送った時間 | 165秒中144秒（87%） | 164秒中35秒（**21%**） |
| 260秒時点の撃破数 | 896 | 879 |

クールダウン6秒に対し約8.2秒に1回＝ほぼ設計上限で回りつつ、**撃破数はむしろ微減（896→879）＝
火力インフレを起こしていない**。技として成立し、かつバランスを壊していないことを両方の数字で確認した。

## 23.6 恒久教訓（R14で得たもの）

1. **「自分のキル圏の内側」を対象にする仕組みは成立しない。** 主人公が強くなるほど周囲は空くので、
   範囲・条件をどう調整しても発動率は下がり続ける。judgeする半径は必ずキル圏の外側に置く。
   （R12c の「間合いを広げたら発動率が下がった」と同じ罠の別の顔）
2. **静止した autotest は「段階解放される要素」の検証に使えない。** ジェムを拾えずレベルが上がらないため、
   Stage2/3 に永久に到達しない。段階要素を測るときは `moveKeys.isDown` を操作して動かす。
3. **既存のボス実装は設計の答えを持っていることがある。** 「巨大な円にすると絵が破綻する／小さくすると
   当たらない」の板挟みは、`maou.armslam` が既に解いていた（小さな着弾＋走る波）。
   自分で新しく考える前に、同じ問題を解いている既存コードを読む。
4. **撤去のコミットは、穴を埋める実装と同時に行う。** 銃だけ消して腕の技を後回しにすると、
   その間のビルドは「弱くなっただけの主人公」になる。

# §24 R15：主人公のキャラクターデザイン（生身の少年＋ゆりかごの腕）

正典§22に合わせた全面再設計。R11〜R12の軍事的パワードスーツ（突撃兵）は**破棄**する。
彼は兵士ではない。ゆりかごで育てられ、名もない守り手の腕を借りて立っている12歳の少年である。

## 24.1 設計の核（この4点は仕様であり、崩すと正典と矛盾する）

1. **成長するのは腕だけ。** 少年の体・服・顔・背丈は3段階を通じて完全に同一。強くなるのは本人ではなく、
   壊れた「ゆりかごの腕」が本来の形へ戻っていくから（＝変身＝腕の復元）。
   → 3枚とも **16×18 の同一キャンバス**にし、表示スケールも**全段 3.0 固定**にした
   （R12までの「段が上がるほど本体も大きくなる」は撤回）。彼は成長しない。
2. **装甲色は敵マキナと同系**（`g #55647c` / `s #cfe0f2` ＝同じゆりかご艦隊の製造物なので当然）。
   両者を分けるのは**熱の光が漏れているかどうか**だけ。敵は戦時改修で温かさを密閉されたので光らない
   （＝「サムイ」）。§22の「装甲＝熱の蓋」がそのまま視覚ルールになっている。
3. **左右非対称。** 守り手が入れた心臓は**ひとつ**なので、心臓を抱えた側（画面左）の腕だけが
   `c #ffd23f` の金を漏らし、反対側は素のスチールで光らない。モビットが寄る理由でもある。
4. **服は戦闘服ではない。** ゆりかごで着せられた簡素な白い衣（`w #e8e4d8`）と素足（`f #f0c8a0`）。
   明るい衣は背景`#0a0a1e`に対する視認性が最良で、R12bの「主人公が背景に沈む」を素材から解いている
   （実測：背景 luma 12.3 に対し主人公の平均 luma 194〜198）。

## 24.2 腕の被覆は「前腕型（肘から先）」

ユーザー選択。肩まで覆わないので、Stage3でも「機械に飲まれた戦士」ではなく**「腕を借りている少年」**に
見える。段階差は肩へ伸ばすのではなく **前腕の充填量・厚み・拳の張り出し**で作る。

| 段 | 腕 | 心臓の金(c) | スチール(s) |
|---|---|---|---|
| Stage1 | 手首の「かけら」＋小さな拳 | 1px | 2px |
| Stage2 | 前腕の半ばまで＋拳2行 | 3px | 5px |
| Stage3 | 肘までびっしり＋拳が最大に張り出す | 7px | 11px |

肩→前腕→拳が**外へ広がるテーパー**になるよう列を刻む（横一直線の帯にすると「板」に見えて腕として
読めない。最初の試作がこれで失敗した）。

## 24.3 恒久ガード（validate-data.js）

「成長するのは腕だけ」はコメントではなく**検証で固定**した。3枚について：

- `16×18` の同寸であること
- **少年本体の画素が Stage1 と完全一致**すること。不変範囲は ①頭（0-5行）②脚と裾（13-17行）
  ③胴の芯（6-12行の5〜10列）。腕の列（0-4/11-15列）は装甲が肌を覆うので段ごとに変わってよい
  （＝前腕型の成長そのもの）

⚠️ このガードは実際に1度発火して、装甲が上腕を覆う正しい成長を誤検出した。
**「不変」の範囲は思い込みで書かず、何が覆われてよいかを列単位で定義すること。**

## 24.4 検証

- `validate-data`（上記ガード込み）／`test-core`／全js `node --check` 全PASS
- PNG目視（`scratchpad/render-hero-r15.mjs`）＝**拡大と実プレイ等倍の両方**で確認（§21.7の教訓）。
  等倍では なかま・敵と並べて相対サイズと相対輝度まで見る
- 数値確認：3段で 衣w=52・肌f=32 が**完全に同一**（＝少年は不変）、変化したのは金c 1→3→7 と
  スチールs 2→5→11 だけ
