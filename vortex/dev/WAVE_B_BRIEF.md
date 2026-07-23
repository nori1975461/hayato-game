# クルット・モビット Wave B 実装ブリーフ（武器多様化＝かわいい武器）

`/clear` 後でもこのファイルだけ読めば再開できるようにした作業指示書。設計は確定済み・実装は未着手。

## 大前提（恒久制約）

- **刀・槍・棒・方天戟・鞭・アイアンナックル等の「現実の武器」系は全面撤回済み。再導入禁止。**
  理由（ユーザー指示）：「刀や槍等では HAYATO との差別化ができない」。
- Wave B の武器コンセプトは **かわいい系**の4カテゴリ：スイーツ系／どうぶつ系／きらきら・星系／おもちゃ系。
- 白フラッシュ 0.5 未満・`MASTER_VOL` 0.34 未満を厳守。
- `Math.random()` 禁止（`createRng` の mulberry32 を使う）。`import Phaser` 禁止（`window.Phaser`）。

## やること（3点）

1. 新アーキタイプ **BOOMERANG**（飛んで戻る）と **RINGWAVE**（広がる輪）を追加
2. 既存2体のアーキタイプを差し替え（togeron→BOOMERANG、samet→RINGWAVE）
3. 主人公弾・ヒット表現をかわいくリスキン（スター弾・虹ビーム・肉球ヒットマーク）

## 実装順と確定値

### 1. `vortex/src/data/balance.js`

`archetypes:`（16行目〜）に追加：

```js
BOOMERANG: { intervalSec: 1.6, speed: 260, maxDist: 120, hitRadius: 14, tickSec: 0.25 },
RINGWAVE:  { intervalSec: 1.5, maxRadius: 95, expandSpeed: 220, thickness: 16 },
```

`weapon:`（43行目〜）にレベルアップ係数を追加：

```js
boomerang: { intervalMult: 0.955, intervalMin: 0.5, maxDistAdd: 6, hitRadiusAdd: 0.8, speedAdd: 8 },
ringwave:  { intervalMult: 0.95,  intervalMin: 0.5, maxRadiusAdd: 5, expandSpeedAdd: 8, thicknessAdd: 0.6 },
```

`fused:`（24行目〜）に合成倍率を追加：

```js
boomerangDistMult: 1.4, boomerangRadiusMult: 1.6,
ringwaveRadiusMult: 1.5, ringwaveThicknessMult: 1.8,
```

**変更禁止の守り値**（他Waveのバランスが崩れる）：
`special.maxUses: 3` / `wave.spawnCountEnd: 3` / `enemyCap: 150` / `wave.hpMultEnd: 3.2`

### 2. `vortex/src/data/monsters.js`

- `togeron`（id: 69行目 / archetype: **72行目**）: `'SLASH'` → `'BOOMERANG'`
- `samet`（id: 185行目 / archetype: **188行目**）: `'SHOT'` → `'RINGWAVE'`
- `megasamet`（214行目〜）の `ovr: { bulletSpeed: 320 }` は RINGWAVE では**死にキー**。
  `ovr: { expandSpeed: 300 }` 等へ置換すること。

> `archetype: 'SLASH',` と `archetype: 'SHOT',` は**各2箇所ある**（starpuppy/togeron、pikabit/samet）。
> Edit の `old_string` には直前の `id:` 行を含めて一意化すること。

### 3. `vortex/src/scenes/Boot.js`

白テクスチャを追加（実行時に `setTint` で色付けする方式）：
`w_star2` / `w_cookie` / `w_ring` / `w_bubble` / `w_paw` / `w_rainbow`

### 4. `vortex/src/audio/sound.js`

`boomerang` / `ringwave` の短いかわいい効果音を追加。
`Sound.sfx` は未知キーを無視するため、先に呼び出し側を書いても落ちない。

### 5. `vortex/src/systems/orbit.js`

- `rebuild()` の push オブジェクトに `boomerang: null, ringwave: null` を追加
- `update(dt)` の `switch (o.archetype)` に `case 'BOOMERANG'` / `case 'RINGWAVE'` を追加
- **リーク注意**：新規ビジュアルは `rebuild()` の pop ループ**と** `destroy()` の**両方**で destroy すること

### 6. `vortex/src/scenes/Run.js`

- `spawnBullet(x, y, vx, vy, color, damage, radius)` に任意引数 `tex`（既定 `'bullet'`）を追加。
  **オブジェクトプール再利用のため、毎回 `setTexture` を呼ぶこと**（呼ばないと前の見た目が残る）
- `activateBeam` は BEAM からのみ呼ばれるので、虹化（`w_rainbow`）は安全
- `spawnHitMark`（肉球ヒットマーク）は**新規実装が必要**

## 検証（push前に必ず全部）

```bash
node vortex/dev/test-core.js        # 33項目
node vortex/dev/validate-data.js
node --check vortex/src/...         # 触った各ファイル
```

- `test-core.js` は**編集不要**。武器形状テストは固定オブジェクト、間隔クランプテストは固定配列を回すため、
  新アーキタイプを足してもテストは壊れない（確認済み）。
- CDP ヘッドレスで実機確認。`Network.setCacheDisabled {cacheDisabled: true}` 必須。
  `window.__vortexGame` → `scene.getScene('Run')`、キー入力は `window.dispatchEvent(new KeyboardEvent(...))`。
  `?autotest=1&seed=42` を使う。
- **「発動するか」ではなく「見える位置に描画されるか」まで見る**（HAYATO側の画面外シネマティック事故の教訓）。

## 仕様同期（実装後・忘れやすい）

`vortex/dev/PROTOTYPE_SPEC.md` を更新：
- §10.4 は `balance.js` の**逐語コピー**なので差分をそのまま反映
- §10.5・モンスター表・schema の archetype enum に **BOOMERANG / RINGWAVE を追加**

## デプロイ

1. `vortex/index.html` の `main.js?v=20260723-1` → `20260723-2` に bump（**上げ忘れると反映されない**）
2. 関係ファイルを**個別に** `git add`（`git add -A` は使わない）
3. `feat:` プレフィックスでコミット → `git push origin main`
4. curl で公開URLの反映を実測確認

## 完了後

メモリ `project_vortex_monsters.md` の「Wave B確定設計」節を「実装済み」に更新。
次は **Wave C**（④敵数増＋⑤雑魚魅力化）、その次が **Wave D**（⑥小中大ボス＋⑦爽快感）。
