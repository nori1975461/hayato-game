# Wave C ブリーフ — ④中盤以降の敵数増 ＋ ⑤雑魚魅力化

7要望大型拡張の第3波。Wave A（派手化・必殺技テンポ）／Wave B（かわいい武器＝BOOMERANG/RINGWAVE）に続く。
このファイルは**実装前の確定設計**。実装者はここの「実装順と確定値」どおりに進めれば良い。

---

## 0. 恒久制約（Wave A/B から引き継ぎ・違反禁止）

- `Math.random()` 禁止（`createRng` の mulberry32＝`run.rng` を使う）
- `import Phaser` 禁止（同梱の `window.Phaser` を参照）
- 白フラッシュのアルファは **0.5 未満**、`MASTER_VOL` は **0.34 未満**（子ども向け安全上限）
- 「現実の武器」系（刀・槍・棒・方天戟・鞭・アイアンナックル）は全面撤回済み・再導入禁止
- 相対パス必須（GitHub Pages のサブパス配信のため）
- `main.js?v=` のバージョンクエリを必ず bump する
- 演出のゲートに `rng` を使わない（時間スロットルを使う）。※Wave C では**スポーン体数の変更で rng の消費順自体が変わる**が、seed 固定なら決定的なので autotest は成立する。test-core が固定値をアサートしている箇所は同時に更新すること

---

## 1. 現状の実測値（設計の根拠）

### スポーンレート（`spawner.js` の線形補間 `waveT() = clamp(elapsed/300, 0, 1)`）

| 経過 | t | count=`round(lerp(1,3,t))` | interval=`lerp(1.6,0.55,t)` | 体/秒 |
|---|---|---|---|---|
| 0s | 0.0 | 1 | 1.60 | 0.63 |
| 60s | 0.2 | 1 | 1.39 | 0.72 |
| 120s | 0.4 | 2 | 1.18 | 1.69 |
| 180s | 0.6 | 2 | 0.97 | 2.06 |
| 240s | 0.8 | 3 | 0.76 | 3.95 |
| 300s | 1.0 | 3 | 0.55 | 5.45 |

**問題点（要望④の原因）**

1. `Math.round()` のせいで増加が**階段状**（120s と 240s で急に倍、その間は横ばい）。中盤の手応えが伸びない
2. `enemyCap: 150` が実質の天井。中盤以降の「密度」は cap がすべてを決めるが、cap は最初から最後まで固定＝**中盤以降に増えた実感が出ない**
3. 山場（ラッシュ）が無く、単調に湧き続けるだけ

### 敵5種（`enemies.js`）

| id | name | movement | color | hp | speed | damage | radius |
|---|---|---|---|---|---|---|---|
| zunzun | ズンズン | chase | #a06bff | 10 | 40 | 8 | 7 |
| fuwafuwa | フワフワ | sine | #7fe8ff | 6 | 55 | 6 | 6 |
| dashbeetle | ダッシュビートル | charge | #ff5e5e | 14 | 30 | 12 | 8 |
| ghoston | ゴーストン | sine | #a8f2c8 | 8 | 70 | 6 | 6 |
| igagurin | イガグリン | charge | #d88a4a | 20 | 26 | 10 | 8 |

**問題点（要望⑤の原因）**: movement が `chase`/`sine`/`charge` の3種しかなく、5体中4体が「まっすぐ or 揺れながら寄ってくる」だけ。撃破時も汎用パーティクルのみで、1体1体の「かわいさ」「倒す気持ちよさ」が薄い。

---

## 2. ④ 中盤以降の敵数増 — 確定設計

### C-1. 小数カウントの累積（階段を消す）

`spawner.js` の `currentCount()` から `Math.round()` を外し、float のまま累積器に足して整数部だけスポーンする。

```js
let countAcc = 0;
function currentCount() { return lerp(W.spawnCountStart, W.spawnCountEnd, waveT()); } // round しない
// update 内
countAcc += count;
const n = Math.floor(countAcc);
countAcc -= n;
```

→ 増加が滑らかになり、中盤の伸びが体感できる。

### C-2. 時間で上がる敵数上限（要望④の本命）

`enemyCap` を固定値ではなく**時間で段階的に上がる**ようにする。序盤は軽く、中盤以降に密度が増す。

```js
// balance.js
enemyCap: 220,                       // 終端の上限（＝capSteps の最大値と一致させる）
capSteps: [
  { untilSec: 90,   cap: 90  },
  { untilSec: 180,  cap: 140 },
  { untilSec: 9999, cap: 220 },
],
```

- `spawner.js` に `currentCap()` を追加し、`update()` の頭で `run.enemyCap = currentCap()` を毎フレーム更新
- `Run.js:292` の `if (this.enemies.length >= BALANCE.enemyCap) return null;` を
  `if (this.enemies.length >= (this.enemyCap || BALANCE.enemyCap)) return null;` に変更（`Run.create` で `this.enemyCap = BALANCE.capSteps[0].cap` を初期化）

### C-3. 出現レートの終端引き上げ

```js
wave: { stepSec: 30, steps: 10, spawnIntervalStart: 1.6, spawnIntervalEnd: 0.45,
        hpMultStart: 1.0, hpMultEnd: 3.2, spawnCountStart: 1, spawnCountEnd: 5 },
```

- `spawnIntervalEnd: 0.55 → 0.45`
- `spawnCountEnd: 3 → 5`
- **`hpMultEnd: 3.2` は据え置き**（難度は「数」で上げる。硬さを上げると小5には作業感が出て爽快感が落ちる＝要望⑦と逆行するため）

補間後（小数累積込み）: 120s ≒ 2.6体/秒 / 180s ≒ 3.7体/秒 / 240s ≒ 5.6体/秒 / 300s ≒ 11.1体/秒。
300s の 11体/秒 は cap 220 で頭打ちになる想定（＝画面が敵で埋まる山場）。

### C-4. ラッシュウェーブ（中盤以降の山場・要望①の派手さにも寄与）

```js
rush: { startSec: 100, intervalSec: 70, counts: [14, 20, 26, 32], warnSec: 1.2 },
```

- 100s / 170s / 240s / 310s… に発生。`counts` は発生回数ごとの体数（超えたら末尾値を使い回す）
- 演出: 発生 1.2 秒前にテロップ「ラッシュ！」＋画面外周に警告リングを出す → 一斉に外周から湧く
- 音: `Sound.sfx('rush')`（後述）
- ボス戦中（`run.boss && run.boss.active`）はラッシュを起こさない（ボスに集中させる既存方針 §10.4 と整合）
- cap を超える分は湧かない（既存の cap チェックをそのまま通す）

---

## 3. ⑤ 雑魚魅力化 — 確定設計

### C-5. 全敵共通「ぷるぷる」（低コスト・高効果）

`Run.js` の `updateEnemies()` 末尾で、スケールにスカッシュ＆ストレッチを掛ける。

```js
// balance.js
enemyFx: { bobHz: 7, bobAmp: 0.09, tiltAmp: 0.10 },
```

```js
const base = e.isElite ? 4 : 2;
const s = Math.sin(this.elapsed * FX.bobHz + e.sinePhase);
e.spr.setScale(base * (1 + s * FX.bobAmp), base * (1 - s * FX.bobAmp));
e.spr.setRotation(Math.cos(this.elapsed * FX.bobHz * 0.5 + e.sinePhase) * FX.tiltAmp);
```

- `sinePhase` は生成時に `rng.range(0, 2π)` 済み＝**追加の rng 消費なし**・個体ごとに位相がずれてワサワサ動く
- 分裂子など scale を変える個体は `e.baseScale` を持たせてそれを基準にする

### C-6. 撃破の「ポンっ！」（要望⑦の爽快感にも寄与）

現状 `killEnemy()` はパーティクルのみ。ここに 0.18 秒のスケールアウト演出を足す。

- Wave B で追加した `w_star2`（きらきらスター）を流用し、`_popPool` から取り出して敵色に tint
- `scale 1.2 → 3.2`・`alpha 0.9 → 0`・0.18秒で消える（`this.tweens.add`）
- 音: `Sound.sfx('pop')`。ただし**毎撃破で鳴らすと音が飽和する**ため `this.elapsed` の 0.05 秒スロットルで間引く（rng 不使用）

### C-7. 新雑魚3種（計8種）＋ 新 movement 2種

敵の見た目規約は既存どおり「**ほっぺ無し・つり目/太まゆ・仲間との対比を明確に**」（`dev/SPRITE_GUIDE.md`）。
スプライトは **幅8〜16・高さ8〜16・全行同幅の矩形・palette 外の文字禁止**（`validate-data.js` の制約）。

| id | name | movement | color | hp | speed | damage | radius | 性格 |
|---|---|---|---|---|---|---|---|---|
| `pyonpi` | ピョンピ | `hop` | `#ffd36e` | 7 | 90 | 6 | 6 | ぴょんぴょん跳ねて距離を詰める。着地中は停止＝避けやすい |
| `kururin` | クルリン | `spiral` | `#8affc1` | 12 | 50 | 7 | 7 | 周回しながらじわじわ寄る。囲まれる圧を作る |
| `mochimo` | モチモ | `chase` | `#ffb3d9` | 16 | 34 | 9 | 8 | 撃破時に小型2体へ分裂（1回だけ） |

**新 movement の挙動（`Run.js` の movement 分岐に追加）**

```js
} else if (e.movement === 'hop') {
  // 0.62秒周期: 前半0.38秒が跳躍（速い）・後半が着地硬直（停止）
  e.hopT = (e.hopT || 0) + dt;
  if (e.hopT >= 0.62) e.hopT -= 0.62;
  const air = e.hopT < 0.38;
  const k = air ? Math.sin((e.hopT / 0.38) * Math.PI) : 0;
  vx = nx * e.speed * k; vy = ny * e.speed * k;
  e.spr.setY(e.y - k * 10);   // 見た目だけ浮かせる（当たり判定は e.x,e.y のまま）
} else if (e.movement === 'spiral') {
  // 接近成分＋接線成分。dist が小さいほど接線を弱めて最後は寄り切る
  const tang = Math.min(1, dist / 120);
  vx = nx * e.speed * (1 - tang * 0.55) - ny * e.speed * tang * 0.9;
  vy = ny * e.speed * (1 - tang * 0.55) + nx * e.speed * tang * 0.9;
```

**分裂（`mochimo`）**

- `enemies.js` に任意フィールド `split: { count: 2, hpMult: 0.3, scaleMult: 0.7, speedMult: 1.4 }`
- `Run.js:killEnemy()` で `if (e.def.split && !e.noSplit)` のとき、`e.x,e.y` の周囲に `count` 体を `spawnEnemy` し、生成した個体に `noSplit = true` を立てる（**無限分裂の防止**）
- 分裂子の位置オフセットは `rng.range(-10, 10)`（rng 消費が増えるが決定性は保たれる）
- 分裂子も cap チェックを通る（cap 満杯なら分裂しない＝暴走しない）

### C-8. `spawnPhases` の再構成（8種・中盤以降の多様化）

```js
spawnPhases: [
  { untilSec: 60,   weights: { zunzun: 0.55, fuwafuwa: 0.30, pyonpi: 0.15 } },
  { untilSec: 120,  weights: { zunzun: 0.35, fuwafuwa: 0.20, pyonpi: 0.15,
                               dashbeetle: 0.20, kururin: 0.10 } },
  { untilSec: 240,  weights: { zunzun: 0.20, fuwafuwa: 0.12, pyonpi: 0.12, dashbeetle: 0.18,
                               kururin: 0.13, ghoston: 0.12, igagurin: 0.08, mochimo: 0.05 } },
  { untilSec: 9999, weights: { zunzun: 0.12, fuwafuwa: 0.08, pyonpi: 0.12, dashbeetle: 0.20,
                               kururin: 0.14, ghoston: 0.14, igagurin: 0.10, mochimo: 0.10 } },
],
```

序盤はやさしい3種、中盤で `kururin` の周回圧、終盤で `mochimo` の分裂が効いて画面が賑やかになる。

### C-9. 効果音（`sound.js` の `SFX` に追加。`MASTER_VOL` は触らない）

- `pop()` — 撃破の「ぽんっ」。sine 880→1320Hz を 0.06秒（既存 `tone()` を使用）
- `rush()` — ラッシュ告知。三和音の上昇 C5→E5→G5→C6 を 0.1秒間隔（既存 `tone()` を使用）

---

## 4. 実装順と対象ファイル

1. `src/data/balance.js` — `wave`（C-3）／`enemyCap`＋`capSteps`（C-2）／`rush`（C-4）／`enemyFx`（C-5）／`spawnPhases`（C-8）
2. `src/data/enemies.js` — 新3種＋スプライト＋`mochimo.split`（C-7）
3. `dev/validate-data.js` — `MOVEMENT` enum に `'hop','spiral'` を追加。`split` を持つ敵の検証（count/hpMult/scaleMult/speedMult が正の数）。`requiredBalanceKeys` に `'capSteps','rush','enemyFx'` を追加
4. `dev/test-core.js` — `ENEMIES.length === 5` → `=== 8`。守り値ガードを後述の新値へ更新
5. `src/systems/spawner.js` — 小数累積（C-1）／`currentCap()`（C-2）／ラッシュ（C-4）
6. `src/scenes/Run.js` — `this.enemyCap` 初期化と cap 参照（C-2）／`hop`/`spiral` 分岐と `baseScale`（C-7）／ぷるぷる（C-5）／ポン演出と `_popPool`（C-6）／分裂（C-7）
7. `src/audio/sound.js` — `pop` / `rush`（C-9）
8. `index.html` — `src/main.js?v=20260724-2` へ bump
9. `dev/PROTOTYPE_SPEC.md` — 上記すべてを同期

---

## 5. 守り値の変更（**実装前にユーザー確認が要る箇所**）

`dev/test-core.js` の 232-234 行は「子ども向けとして行き過ぎないための安全ガード」。要望④は敵数を増やす指示そのものなので、ガードも同時に引き上げる。

| 項目 | 現行 | Wave C 案 | test-core ガード | 理由 |
|---|---|---|---|---|
| `wave.spawnCountEnd` | 3 | **5** | `<= 3` → `<= 6` | 終盤の湧き量。cap があるので暴走はしない |
| `enemyCap` | 150 | **220** | `<= 200` → `<= 260` | 中盤以降の密度の本体。`capSteps` で序盤は 90 に**下がる** |
| `wave.hpMultEnd` | 3.2 | **3.2（据え置き）** | `<= 4`（変更なし） | 硬さは上げない＝爽快感を維持 |
| `special.maxUses` | 3 | **3（据え置き）** | 変更なし | Wave A の確定値 |

**パフォーマンス懸念（実装時に必ず実測すること）**: 敵1体につき表示オブジェクトは `spr` + `glow` の2個。cap 220 なら最大 440 個＋弾・ジェム・パーティクル。Wave C の CDP 検証では**敵数と平均 fps を必ず計測**し、55fps を下回るなら `enemyCap` を 180 へ落とす。

---

## 6. 検証（push 前に全部通す）

```bash
node --check vortex/src/data/balance.js
node --check vortex/src/data/enemies.js
node --check vortex/src/systems/spawner.js
node --check vortex/src/scenes/Run.js
node --check vortex/src/audio/sound.js
node vortex/dev/test-core.js          # ENEMIES=8・新守り値
node vortex/dev/validate-data.js      # monsters=6, enemies=8
```

**CDP 実描画検証**（`scratchpad/cdp-waveb.js` を `cdp-wavec.js` として流用・改造）

- `Network.setCacheDisabled: true` 必須
- `?autotest=1&seed=42` で起動
- 可視判定は**ワールド座標ではなく `cam.worldView` 基準**（カメラはプレイヤー追従）
- 計測項目:
  1. `run.elapsed` を 60/120/180/240/300s 相当まで進め、各時点の `run.enemies.length` と `run.enemyCap` を記録（`capSteps` どおり 90→140→220 に上がるか）
  2. 各時点の**平均 fps**（`game.loop.actualFps` を 100ms×30 回サンプリング）
  3. 新 movement（`hop`/`spiral`）の敵が **worldView 内に描画されているか**
  4. `mochimo` 撃破 → 分裂子が2体生成され、`noSplit` により**再分裂しない**こと
  5. ラッシュ発生時に敵数が跳ね上がること
  6. `Runtime.exceptionThrown` / `console.error` が 0 件

**短命演出（ポン 0.18秒）は単発スナップショットでは捕まらない** — 時系列サンプリングで `maxOnscreen` を累積すること（Wave B の教訓）。

---

## 7. 完了後

- `git add` は**関係ファイルを個別に**（`-A` 禁止）→ `feat:` プレフィックスでコミット → `git push origin main`
- curl で公開 URL の `?v=20260724-2` と新実装（`capSteps` / `pyonpi` / `hop` 等）の実配信を実測確認
- メモリ `project_vortex_monsters.md` と `MEMORY.md` を更新
- 次は **Wave D（⑥小/中/大ボス ＋ ⑦爽快感の限界突破）**
