// バランス数値の正典 v3。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 420,            // 参考値（クリア条件はボス撃破。時間切れ敗北なし）。Wave R2でステージ尺を延長
  // R12: 被弾に「押し返される」重みを持たせる（hurtKnockback）。lowHpRatio を割ると画面周縁が赤く脈打つ。
  player: { hp: 100, speed: 120, invulnSec: 0.8, radius: 7,
            hurtKnockback: 150, hurtKnockSec: 0.18, lowHpRatio: 0.3 },

  // 主人公＝近接のみ（R14・SPEC§22）。主武器は拳（クラッシュアーム）。銃は全廃し、
  // 変身（＝ゆりかごの腕の復元）で「腕の技」が解放される：Stage2 ワイヤーアーム／Stage3 アームスラム。
  // 最終ボス（マオウレクス）と同じ技＝ミラーマッチ（技の型の一致は正典の核。boss.js の同名攻撃を参照）。
  hero: {
    // 構えの狙い角に使う索敵距離（拳とワイヤーアームが同じ角を使う）。攻撃の射程ではない。
    aimRange: 260,

    // --- 腕の技①：ワイヤーアーム（Stage2で解放・自動発動・rng不使用） ---
    // 拳が届かない敵へ片腕をワイヤーで射出し、道中の敵を殴って戻す。旧銃（range175の牽制）の
    // 「遠い敵への手当て」役を腕の技で置き換える。主役は拳なので発動間隔は長めに留める。
    wireArm: {
      unlockStage: 2,
      intervalSec: 3.2,               // 発動間隔。拳(0.3秒)の主役を食わない頻度
      maxLen: 170, extendSpeed: 520,  // 最大到達≒旧銃射程。伸び切りまで約0.33秒
      backSec: 0.22,                  // 手繰り戻す時間
      turnDegPerSec: 200,             // マイルド追尾（boss.js wirearm と同じ方式・振り切れる余地を残す）
      fistRadius: 10,                 // 拳先端の当たり半径
      damage: 16, damagePerStage: 6,  // Stage2=16 / Stage3=22
      maxHits: 4,                     // 1射で殴れる敵数（伸びる道中を薙ぎ払う）
      knockback: 220, knockbackSec: 0.15,
      bossMul: 0.5,                   // ボスへは拳と同じく半減
    },

    // --- 腕の技②：アームスラム（Stage3で解放・自動発動・rng不使用） ---
    // 両腕を振り上げて叩きつけ、放射状の衝撃波を走らせる。boss.js armslam の**構造まで含めた**ミラー
    // （ボスも meleeRadius46 の小さな着弾＋shockCount9 の走る衝撃波であって、巨大な円ではない）。
    // 予告（振り上げ）→叩きつけ、はボスの予告つき攻撃（育児安全設計の名残）と同じ文法。
    //
    // ⚠️ 半径だけの範囲攻撃にしてはいけない（実測で判明・SPEC§23.5）：Stage3 の主人公は
    // 拳78px＋仲間66pxで周囲を刈り続けるため、95px以内に敵が1体でもいる時間は全体の8.6%しかない。
    // 自分のキル圏の内側を対象にする技は、条件を何体にしようと成立しない。**外へ走る波**が本体。
    armSlam: {
      unlockStage: 3,
      cooldownSec: 6,
      triggerRadius: 170,             // この距離に敵がいれば振る（波が届く範囲＝キル圏の外側を見る）
      minEnemies: 2,                  // triggerRadius 内にこれ以上いるとき（空振りの絵を作らない）
      radius: 62, damage: 26,         // 直接の着弾。少年の体格で破綻しない大きさに留める
      telegraphSec: 0.35,             // 振り上げのタメ（自分の技なので短い）
      knockback: 260, knockbackSec: 0.2,
      shockCount: 10,                 // 放射状に走る衝撃波の本数（ボスは9・こちらは全方位10）
      shockSpeed: 210, shockRadius: 7, shockDamage: 18, shockLife: 1.1,
      bossMul: 0.5,
    },

    // --- 主武器：クラッシュアーム（R12・自動近接連撃） ---
    // 設計の核＝「操作を増やさずに駆け引きを作る」。プレイヤーができるのは移動だけなので、
    // "どれだけ踏み込むか" がそのまま火力になるよう、距離とヒートの2軸で威力を変える。
    //   ① closeDist 以内まで踏み込むと closeMul 倍（＝敵に触れる距離が一番強い＝一番危険）
    //   ② 殴り続けると heat が溜まり heatDamageMulPerStep ずつ加算（離れると decay で冷める）
    // 旧スターオーラ（auraDamage 4・tick 0.5秒＝実質8dps の飾り）を置き換える主役。
    melee: {
      // 拳の届く範囲（Stage1=58 / 2=68 / 3=78）。
      // ⚠️ 旧34は「実プレイで一度も殴れない」死に値だった：なかまは公転半径48の上を回りながら
      // SLASHのhitRadius18で66pxまで叩き、当時の銃も240px先から削るため、敵は34pxに入る前に
      // 全滅する（実測40秒＝31体撃破・平均撃破距離57px・間合い内で倒れた敵0体・殴り0回）。
      // ただし広げるほど拳が遠くで敵を倒してしまい、かえって敵が近づかない（70にしたら最寄り距離が
      // 27→62pxへ後退＝自己相殺）。間合いは近接らしい58に留め、頻度は敵の密度側で確保する。
      radius: 58, radiusPerStage: 10,
      intervalSec: 0.3,                     // 殴る間隔（旧オーラ0.5秒より速く＝連撃の手応え）
      damage: 12, damagePerStage: 6,        // Stage1=12 / 2=18 / 3=24（1発の重みを出す）
      maxTargets: 5,                        // 1回の振りで巻き込める敵数（囲まれても薙ぎ払える）
      // 至近ボーナス：踏み込むほど強い。間合いを広げたぶん「踏み込む」意味が薄れないよう、
      // ボーナス圏は間合いの半分以下（26/56）に保つ＝わざわざ近づいた者だけが1.7倍を取れる。
      closeDist: 26, closeMul: 1.7,
      bossMul: 0.5,                         // ボスへは半減（接近リスクに報いるがボス戦を壊さない）
      knockback: 150, knockbackSec: 0.12,   // 殴った敵を弾く（押し返せる手応え）
      // ヒート：連撃で腕が熱を持つ。火力（+4%/段・最大+40%）と見た目の派手さが連動する。
      // 収支に注意：殴る間隔が 0.3秒なので1回あたりの減衰は heatDecayPerSec×0.3＝0.9。
      // heatPerHit=2 との差し引きで実質 +1.1/回 ＝ 殴り続けて約3秒で満タン、離れると約3.3秒で冷める。
      // （heatPerHit=1 だと実質 +0.1/回 にしかならず、実プレイでは永遠に溜まらない。CDP実測で判明）
      heatMax: 10, heatPerHit: 2, heatDecayPerSec: 3, heatDamageMulPerStep: 0.04,
      // 踏み込みモーション。0.14秒＝8フレームは速すぎて「殴った絵」が見えなかったので 0.2秒へ。
      punchSec: 0.2, punchLunge: 7,
    },
  },

  // R21: 打撃感（イース風）。実プレイFB「当たった感触がほぼない・殴る爽快感が皆無」への対応。
  // ⚠️着手前の実測で判明した欠落：拳にも仲間の攻撃にも画面振動が一切なく（Run.updateHeroMelee /
  //   orbit.js のどこにも shake 呼び出しがない）、仲間には命中音そのものが無かった（発射音だけ）。
  //   ヒットストップも 0.03秒固定で強さに連動していなかった。ここを power(0..1) 一本へ統一する。
  // 好みは文章で決められないので、プリセットを数値で並べてゲーム内キー 1〜4 で即切替して選ぶ。
  hitFeel: {
    defaultPreset: 2,          // 起動時のプリセット（0基点・2='イース'）
    // 仲間の攻撃は6体×高頻度で当たるため、素通しにすると音と揺れが渋滞して逆に何も感じなくなる。
    // 「最も近い1発だけ」に間引くのが要点（イースも1撃ごとに1回しか鳴らない）。
    allySfxMinSec: 0.085,      // 仲間の命中音の最短間隔
    allyShakeMinSec: 0.05,     // 仲間の命中による揺れの最短間隔
    dmgTextMinSec: 0.05,       // ダメージ数字の最短間隔
    killShakeMul: 1.6,         // 撃破した瞬間だけ揺れを増す（トドメの手応え）
    presets: [
      // heroShake/allyShake = [振幅px, 持続ms]。stop = [最小秒, 最大秒]（power で補間）。
      {
        id: 'off', name: '現行（変更なし）',
        heroShake: [0, 0], allyShake: [0, 0], stop: [0.03, 0.03],
        allySfx: false, pitch: false, dmgText: false, squash: 0, sparkMul: 1,
      },
      {
        id: 'mild', name: 'ひかえめ',
        heroShake: [2.5, 90], allyShake: [1.2, 70], stop: [0.03, 0.045],
        allySfx: true, pitch: true, dmgText: false, squash: 0.10, sparkMul: 1.2,
      },
      {
        id: 'ys', name: 'イース',
        heroShake: [5, 130], allyShake: [2.2, 90], stop: [0.045, 0.075],
        allySfx: true, pitch: true, dmgText: true, squash: 0.18, sparkMul: 1.7,
      },
      {
        id: 'max', name: 'やりすぎ',
        heroShake: [8, 170], allyShake: [3.4, 110], stop: [0.06, 0.10],
        allySfx: true, pitch: true, dmgText: true, squash: 0.26, sparkMul: 2.3,
      },
    ],
  },

  // Wave R2: 公転仲間は最大3人（火力過多防止）。開始2人・180秒で3人目を解禁（強さカーブを緩やかに）
  orbit: {
    baseRadius: 48, baseAngularDeg: 120, maxSlots: 3,
    slotSchedule: [{ untilSec: 180, slots: 2 }, { untilSec: 9999, slots: 3 }],
  },
  archetypes: {
    SLASH: { tickSec: 0.25, hitRadius: 18 },
    SHOT:  { intervalSec: 0.88, bulletSpeed: 315, range: 220, bulletRadius: 3 },  // FB#4: 弾速+20%・手数-約1割
    BEAM:  { intervalSec: 3.5, durationSec: 0.4, length: 160, width: 6 },
    FIELD: { radius: 60, slowFactor: 0.6, tickSec: 0.5, tickDamage: 1 },
    // Wave B: かわいい武器の新アーキタイプ
    BOOMERANG: { intervalSec: 1.6, speed: 260, maxDist: 120, hitRadius: 14, tickSec: 0.25 },
    RINGWAVE:  { intervalSec: 1.5, maxRadius: 95, expandSpeed: 220, thickness: 16 },
  },

  // 合成モンスターの強化倍率（orbit.js が party[i].fused を見て適用）
  fused: {
    // FB#2: 合成なかまは「実効武器レベル」に+3のボーナス（レベル起因の成長。damageMult 等の固定倍率とは別枠）。
    damageMult: 2.5, spriteScale: 3, glowScale: 2.2, weaponLevelBonus: 3,
    slashRadiusMult: 1.5, shotIntervalMult: 0.7,
    beamLengthMult: 1.4, beamWidthMult: 2.0,
    fieldRadius: 90, fieldTickDamage: 3,
    boomerangDistMult: 1.4, boomerangRadiusMult: 1.6,
    ringwaveRadiusMult: 1.5, ringwaveThicknessMult: 1.8,
  },

  // 進化（プレイヤーLv6から2レベル毎にparty先頭の未進化1体が進化）
  evolve: { startLevel: 6, everyLevels: 2 },

  // v5(Wave C): 中盤以降の密度不足を解消。湧き数は小数のまま累積するので階段状に増えない。
  // Wave R2: ステージ尺420sへ合わせて強さカーブを14ステップ(=420s)に延長。開幕を易しく(hpMultStart0.9,
  // spawnIntervalStart1.9)し、終盤の硬さは微増(hpMultEnd3.4)。
  // R12c: 序盤の湧きが 1.9秒に1体＝0.53体/秒しかなく、拳の間合いへ敵が到達する前に
  // なかまと銃が処理しきっていた（＝突撃兵なのに殴る相手がいない）。序盤だけ約2.5倍に厚くして
  // 「群がる敵を殴り倒す」絵を成立させる（0.53体/秒→2.6体/秒）。終盤側（IntervalEnd/CountEnd）は据え置き＝最終密度は不変。
  wave: { stepSec: 30, steps: 14, spawnIntervalStart: 1.15, spawnIntervalEnd: 0.45,
          hpMultStart: 0.9, hpMultEnd: 3.4, spawnCountStart: 3, spawnCountEnd: 5 },
  enemyCap: 220,
  // 敵数上限は時間で段階的に上がる（序盤はむしろ軽く、後半で「囲まれる」密度になる）。Wave R2で5段化
  capSteps: [
    { untilSec: 60,   cap: 50 },
    { untilSec: 150,  cap: 90 },
    { untilSec: 260,  cap: 140 },
    { untilSec: 360,  cap: 190 },
    { untilSec: 9999, cap: 220 },
  ],
  // ラッシュ（山場）。warnSec前にテロップ＋警告リングで必ず予告する。Wave R2で早め・6波化
  rush: { startSec: 40, intervalSec: 50, counts: [12, 16, 20, 26, 30, 36], warnSec: 1.2 },
  // 雑魚の“ぷるぷる”。生成時に消費済みのsinePhaseを流用するので乱数を追加消費しない
  enemyFx: { bobHz: 7, bobAmp: 0.09, tiltAmp: 0.10 },
  elite: { times: [110, 200, 290], hpMult: 9, sizeMult: 2, speedMult: 0.8 },
  // Wave R2: 合成祭壇は3回出現（150/250/340s）。開始2人スタートに合わせ最低人数を2へ
  altar: { appearSecs: [150, 250, 340], minParty: 2 },
  xp: { gemValue: 1, eliteGemValue: 10, firstLevelNeed: 5, needStep: 5, magnetRadius: 40 },
  capture: { dropRate: 0.25, eliteDropRate: 1.0, coreLifeSec: 10, fullPartyCoins: 50 },

  // FB#1: 体力回復アイテム（ハート）。雑魚は低確率・エリートは高確率・ボスは撃破で確定1個（boss.js）。
  // healAmount は player.hp=100 基準で 25（約25%）＝回復過多で難度が壊れない範囲。貴重なので magnet は弱め
  // （xp.magnetRadius=40 より狭く・吸引も弱い）。満タンで拾ったら無駄にせず少額コインに替える。
  healItem: {
    dropRate: 0.045, eliteDropRate: 0.6, healAmount: 25,
    lifeSec: 12, magnetRadius: 24, pickupRadius: 13, pull: 140, fullBonusCoins: 15,
  },

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

  // 必殺技（敵を倒すとゲージが溜まる。1ステージ10回まで）
  // v4: テンポ改善（cinematicSec短縮=すぐ操作に戻れる・killsPerCharge減=撃ちやすい・startCharge増=序盤から1発目が近い）
  special: {
    // R9: 最終ボス マオウレクス最強化の対価として必殺を2点強化。
    //   ① 最大 8→10 回（回数増・威力/ゲージ速度は据え置き）
    //   ② ボスへのダメージのみ「近いほど強い」3段階（雑魚は距離無関係に即死のまま）
    killsPerCharge: 18, maxUses: 10, radius: 320, damage: 9999, bossDamage: 360,
    cinematicSec: 0.7, startCharge: 0.7,
    // ボス限定の距離倍率：接近戦を報いる。プレイヤー↔ボス距離で near×2.0 / mid×1.0 / far×0.6。
    // 実効ダメージ = round(bossDamage × mul)（near720 / mid360 / far216）。雑魚には一切適用しない。
    distanceScale: { nearDist: 110, midDist: 220, nearMul: 2.0, midMul: 1.0, farMul: 0.6 },
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
      desc: 'じぶんの こうげきが 1.5ばい',
      effects: [{ stat: 'heroMult', add: 0.5 }] },
  ],

  // どうくつ・たからばこ
  cave: {
    times: [50, 115, 175, 245, 310], lifeSec: 25, minDist: 260, maxDist: 320, touchRadius: 24,
    rewards: [
      { id: 'ring',   label: 'ぶき パワーリング',   weight: 3, stat: 'damageMult', add: 0.30 },
      { id: 'shield', label: 'ぼうぐ ほしのたて',   weight: 3, stat: 'maxHpAdd',   add: 30, invulnSec: 2 },
      { id: 'boots',  label: 'スピードブーツ',      weight: 2, stat: 'moveMult',   add: 0.20 },
      { id: 'magnet', label: 'メガじしゃく',        weight: 2, stat: 'magnetAdd',  add: 60 },
      { id: 'rcore',  label: 'にじのコア',          weight: 2, dropCore: 'R' },
      { id: 'coins',  label: 'コインぶくろ',        weight: 2, coins: 100 },
    ],
  },

  // ボス（Wave R3：ロボット6体・6段スケジュール）。boss.js が tiers を時間順に処理する。
  // top-level はHUD/spawner/test-core 互換の代表値（＝最終ボス=マオウレクス基準）を残す。
  // 各 tier に「署名武器」の小ブロック（machinegun/cutter/vulcan/wavecannon/missile/laser/armslam）を持たせ、
  // attacks に載せた武器のみ発動する。dash/ring/summon は共通の予備パラメータとして全 tier が保持。
  boss: {
    hudBossSec: 350,                // HUDタイマーがBOSS赤表示に切替（最終ボス接近の合図）
    warnSec: 358, spawnSec: 360, spawnDist: 260,  // ← spawnSec は最終ボス=クリア条件時刻
    // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    trashInterval: 2.4, trashCount: 1,

    // 出現順（小→final）。betweenAttacks の長さは attacks の長さと一致させること。
    tiers: [
      // 1. 小ボス「コロガンナー」（~60秒）。マシンガン連射＋突進。phase2なし・撃破でプレイ続行。
      {
        tier: 'small', bossId: 'korotama', final: false,
        warnSec: 58, spawnSec: 60, spawnDist: 290,
        hp: 1800, radius: 52, spriteScale: 8, glowScale: 6.8,
        glowOuter: '#8a8f98', glowInner: '#38e1ff',
        chaseSpeed: 68, bodyDamage: 12,
        attacks: ['machinegun', 'dash'],
        machinegun: { telegraphSec: 0.5, burstSec: 0.9, shotInterval: 0.08, bulletSpeed: 264,
                      bulletRadius: 3, damage: 6, spreadDeg: 14, lifeSec: 1.6 },
        dash: { telegraphSec: 1.0, speed: 300, durationSec: 0.7, damage: 20 },
        ring: { telegraphSec: 0.5, count: 5, count2: 7, bulletSpeed: 120,
                bulletRadius: 4, damage: 12, lifeSec: 3.0 },
        summon: { count: 4, enemyId: 'chibit', ringRadius: 50 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.2, 2.2] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.85, phase2DashSpeedMult: 1.1,
        rageText: '', bulletTint: '#38e1ff',
        rewardCoins: 100, deathCinematicSec: 1.0,
      },
      // 2. 小+ボス「ジェットバイパー」（~120秒）。円鋸カッター（ブーメラン）＋突進。
      {
        tier: 'small', bossId: 'jetviper', final: false,
        warnSec: 118, spawnSec: 120, spawnDist: 300,
        hp: 3600, radius: 56, spriteScale: 8, glowScale: 7.2,
        glowOuter: '#2a6bff', glowInner: '#7fd0ff',
        chaseSpeed: 70, bodyDamage: 15,
        attacks: ['cutter', 'dash'],
        cutter: { telegraphSec: 0.6, count: 2, speed: 180, spreadDeg: 40, bladeRadius: 9,
                  damage: 20, spinSpeed: 12, lifeSec: 2.4, returns: true },
        dash: { telegraphSec: 0.9, speed: 340, durationSec: 0.75, damage: 28 },
        ring: { telegraphSec: 0.5, count: 7, count2: 9, bulletSpeed: 132,
                bulletRadius: 4, damage: 14, lifeSec: 3.2 },
        summon: { count: 5, enemyId: 'chibit', ringRadius: 55 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.0, 2.0] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.8, phase2DashSpeedMult: 1.12,
        // R19d: 弾色は #7fd0ff（仲間スターパピー #7fd8ff と ΔE 5.8＝ほぼ同色）だった。毒々しい蛍光グリーンへ。
        rageText: '', bulletTint: '#1dff12',
        rewardCoins: 150, deathCinematicSec: 1.2,
      },
      // 3. 中ボス「ウズバルカン」（~180秒）。バルカン掃射＋アームスラム＋phase2「ぶちギレ」。
      {
        tier: 'mid', bossId: 'uzuking', final: false,
        warnSec: 178, spawnSec: 180, spawnDist: 310,
        hp: 6500, radius: 64, spriteScale: 9, glowScale: 9,
        glowOuter: '#e8720c', glowInner: '#ffd23f',
        chaseSpeed: 66, bodyDamage: 18,
        attacks: ['vulcan', 'armslam'],
        vulcan: { telegraphSec: 0.5, bursts: 3, perBurst: 9, sweepDeg: 14, bulletSpeed: 138,
                  bulletRadius: 4, damage: 15, lifeSec: 3.2 },
        armslam: { telegraphSec: 0.7, slamSec: 0.5, shockCount: 9, shockSpeed: 144,
                   shockRadius: 5, shockDamage: 20, meleeRadius: 46, meleeDamage: 34 },
        dash: { telegraphSec: 0.9, speed: 360, durationSec: 0.8, damage: 34 },
        ring: { telegraphSec: 0.5, count: 7, count2: 11, bulletSpeed: 132,
                bulletRadius: 4, damage: 15, lifeSec: 3.5 },
        summon: { count: 6, enemyId: 'chibit', ringRadius: 60 },
        idleSec: { afterSpawn: 3, betweenAttacks: [2.5, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        // R19d: 弾色は #ffd23f（主人公の金と完全同一・ΔE 0.0）だった。「味方の攻撃＝金」に統一した以上、
        //   ボスの弾が味方の攻撃に見えてしまうので灼熱の橙赤へ。乱射バルカンには金より似合う。
        rageText: 'ウズバルカン ぶちギレ！', bulletTint: '#ff3d00',
        rewardCoins: 220, deathCinematicSec: 1.5,
      },
      // 4. 中+ボス「ウェイブロード」（~240秒）。波動砲（薙ぎビーム）＋アームスラム＋召喚＋phase2。
      {
        tier: 'mid', bossId: 'wavelord', final: false,
        warnSec: 238, spawnSec: 240, spawnDist: 320,
        hp: 11000, radius: 72, spriteScale: 9, glowScale: 10,
        glowOuter: '#38e1ff', glowInner: '#a8f0ff',
        chaseSpeed: 60, bodyDamage: 22,
        attacks: ['wavecannon', 'armslam', 'summon'],
        wavecannon: { chargeSec: 1.2, beamWidth: 44, beamLength: 260, damage: 34,
                      sweepDeg: 18, activeSec: 0.5 },
        armslam: { telegraphSec: 0.7, slamSec: 0.5, shockCount: 9, shockSpeed: 144,
                   shockRadius: 5, shockDamage: 20, meleeRadius: 46, meleeDamage: 34 },
        dash: { telegraphSec: 0.85, speed: 370, durationSec: 0.8, damage: 40 },
        ring: { telegraphSec: 0.5, count: 9, count2: 13, bulletSpeed: 142,
                bulletRadius: 4, damage: 16, lifeSec: 3.6 },
        summon: { count: 6, enemyId: 'chibit', ringRadius: 65, telegraphSec: 0.6 },
        idleSec: { afterSpawn: 3, betweenAttacks: [2.5, 2.0, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        rageText: 'ウェイブロード かくせい！', bulletTint: '#a8f0ff',
        rewardCoins: 300, deathCinematicSec: 1.6,
      },
      // 5. 大ボス「ミサイルガ」（~300秒）。ホーミングミサイル＋バルカン＋召喚＋phase2。
      {
        tier: 'large', bossId: 'missilga', final: false,
        warnSec: 298, spawnSec: 300, spawnDist: 330,
        hp: 18000, radius: 76, spriteScale: 8, glowScale: 10,
        glowOuter: '#e8720c', glowInner: '#ff4d4d',
        chaseSpeed: 60, bodyDamage: 26,
        attacks: ['missile', 'vulcan', 'summon'],
        missile: { telegraphSec: 0.6, count: 4, launchSpeed: 216, homingRate: 2.4, maxTurnDeg: 70,
                   speed: 180, radius: 6, damage: 24, blastDamage: 18, lifeSec: 3.5 },
        vulcan: { telegraphSec: 0.5, bursts: 3, perBurst: 9, sweepDeg: 14, bulletSpeed: 138,
                  bulletRadius: 4, damage: 15, lifeSec: 3.2 },
        dash: { telegraphSec: 0.85, speed: 380, durationSec: 0.85, damage: 46 },
        ring: { telegraphSec: 0.5, count: 11, count2: 14, bulletSpeed: 144,
                bulletRadius: 4, damage: 17, lifeSec: 3.6 },
        summon: { count: 7, enemyId: 'chibit', ringRadius: 68, telegraphSec: 0.6 },
        idleSec: { afterSpawn: 2.8, betweenAttacks: [2.2, 2.2, 2.2] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.68, phase2DashSpeedMult: 1.18,
        rageText: 'ミサイルガ ぶちギレ！', bulletTint: '#ff4d4d',
        rewardCoins: 380, deathCinematicSec: 1.7,
      },
      // 6. 最終ボス「マオウレクス」（~360秒＝クリア条件）。最終ボスは5つの必殺級攻撃を持つ：
      //    ① 亜空間レーザー薙ぎ（laser・極太/長射程） ② ナックルウェーブ（knuckle＝新・最強武器／両手を胸前で叩き
      //    合わせ、米軍トマホーク型の巨大ミサイルを扇状に一斉発射） ③ ワイヤーアーム（wirearm＝新・最強武器／両拳を
      //    ワイヤーで主人公へ射出し殴って手繰り戻すロケットパンチ・最大の見せ場） ④ 多連ホーミングミサイル斉射
      //    （missile・弾数7の扇状"斉射"） ⑤ 重力弾幕ノヴァ（nova／全方位弾を回転させ連続波で放つ弾幕）。この5つが
      //    attacks ローテーション。phase2 では laser の後に vulcan を割り込ませる（beginAttack が cfg.vulcan を参照）。
      //    knuckle/wirearm は maou 専用（armslam は uzuking/wavelord 用に残す＝丸い衝撃波のまま不変）。
      //    腕(armR/armL)パーツを持つのは maou のみ＝「腕で殴る絵」はこのボスで主役化する。撃破でクリア。
      //    サイズ：spriteScale 8（縦長人型のため通常ボス≈8-9 に対し素の大きさで約1.2倍・画面占有を抑え「大きすぎ」を解消）・
      //    radius/glow/spawnDist も追随縮小（通常ボスの radius 64〜76 帯へ）。
      {
        tier: 'final', bossId: 'maou', final: true,
        warnSec: 358, spawnSec: 360, spawnDist: 320,
        hp: 28000, radius: 68, spriteScale: 8, glowScale: 9.5,
        glowOuter: '#b01c22', glowInner: '#4ad4ff',
        chaseSpeed: 68, bodyDamage: 30,
        attacks: ['laser', 'knuckle', 'wirearm', 'missile', 'nova'],
        laser: { chargeSec: 1.0, beamWidth: 46, beamLength: 420, damage: 42,
                 sweepFromDeg: -42, sweepToDeg: 42, activeSec: 0.7 },
        // 特別攻撃②：多連ホーミングミサイル斉射（count 4→7・扇状に一斉発射で"斉射"感）
        missile: { telegraphSec: 0.6, count: 7, launchSpeed: 216, homingRate: 2.4, maxTurnDeg: 70,
                   speed: 180, radius: 6, damage: 24, blastDamage: 18, lifeSec: 3.5 },
        // 特別攻撃③：重力弾幕ノヴァ（予告付き・全方位弾を波ごとに spinDeg 回して螺旋状に連続で放つ）
        nova: { telegraphSec: 1.1, waves: 5, waveInterval: 0.16, perWave: 14,
                bulletSpeed: 116, bulletRadius: 4, damage: 20, lifeSec: 4.0, spinDeg: 13 },
        // 最強武器①ナックルウェーブ（maou 専用）：両腕を胸前で叩き合わせ、トマホーク型の巨大ミサイルを
        // 扇状（spreadDeg 分の広がり）に count 本一斉発射する。丸い衝撃波(armslam)の刷新版＝派手さ優先。
        // ミサイルは直進弾（避けられる）＝威力はやや高めでも理不尽にしない。clapSec は叩き合わせのモーション尺。
        knuckle: { telegraphSec: 1.0, clapSec: 0.4, count: 7, spreadDeg: 150,
                   bulletSpeed: 178, radius: 8, damage: 22, lifeSec: 3.4 },
        // 最強武器②ワイヤーアーム（maou 専用）：両拳をワイヤーで主人公方向へ射出し、最大長 maxLen まで伸ばして
        // 殴り、手繰り戻す（飛ばしっぱなしにしない）。extendSpeed で伸長、turnDeg/秒 のマイルド追尾（横移動で振り切れる）。
        // damage は現状最強クラス(dash 52)超えの大ダメージだが、プレイヤー maxHp 100 未満＝満タンから一撃死しない値。
        wirearm: { teleSec: 1.1, shotSec: 0.5, backSec: 0.35, maxLen: 210,
                   extendSpeed: 640, fistRadius: 16, damage: 64, turnDeg: 55 },
        vulcan: { telegraphSec: 0.4, bursts: 3, perBurst: 9, sweepDeg: 16, bulletSpeed: 150,
                  bulletRadius: 4, damage: 16, lifeSec: 3.2 },
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 52 },
        ring: { telegraphSec: 0.5, count: 11, count2: 14, bulletSpeed: 150,
                bulletRadius: 4, damage: 18, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'chibit', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.2, 2.4, 2.6, 2.0, 2.6] },
        phase2: true, phase2HpRatio: 0.55, phase2IdleMult: 0.65, phase2DashSpeedMult: 1.2,
        rageText: 'マオウレクス かくせい！', bulletTint: '#38e1ff',
        rewardCoins: 500, deathCinematicSec: 1.8,
      },
    ],
  },

  // Wave R1: 序盤は手数(chibit)＋壁(gareon)、中盤で狙撃(snipa)/特攻(bomba)、後半で砲台(turret)も加わり役割が増える
  spawnPhases: [
    { untilSec: 60,   weights: { chibit: 0.70, gareon: 0.30 } },
    { untilSec: 120,  weights: { chibit: 0.42, gareon: 0.23, snipa: 0.20, bomba: 0.15 } },
    { untilSec: 240,  weights: { chibit: 0.26, gareon: 0.20, snipa: 0.20, turret: 0.19, bomba: 0.15 } },
    { untilSec: 9999, weights: { chibit: 0.18, gareon: 0.22, snipa: 0.22, turret: 0.20, bomba: 0.18 } },
  ],
};
