// バランス数値の正典 v3。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 420,            // 参考値（クリア条件はボス撃破。時間切れ敗北なし）。Wave R2でステージ尺を延長
  player: { hp: 100, speed: 120, invulnSec: 0.8, radius: 7 },

  // 主人公の自動攻撃「スターショット」
  hero: {
    intervalSec: 1.4, bulletSpeed: 300, range: 240, bulletRadius: 4,
    damageBase: 6, damagePerTwoLevels: 1,   // damage = base + floor(level/2)
    twinLevel: 8, tripleLevel: 16, spreadDeg: 12,
  },

  // Wave R2: 公転仲間は最大3人（火力過多防止）。開始2人・180秒で3人目を解禁（強さカーブを緩やかに）
  orbit: {
    baseRadius: 48, baseAngularDeg: 120, maxSlots: 3,
    slotSchedule: [{ untilSec: 180, slots: 2 }, { untilSec: 9999, slots: 3 }],
  },
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

  // v5(Wave C): 中盤以降の密度不足を解消。湧き数は小数のまま累積するので階段状に増えない。
  // Wave R2: ステージ尺420sへ合わせて強さカーブを14ステップ(=420s)に延長。開幕を易しく(hpMultStart0.9,
  // spawnIntervalStart1.9)し、終盤の硬さは微増(hpMultEnd3.4)。
  wave: { stepSec: 30, steps: 14, spawnIntervalStart: 1.9, spawnIntervalEnd: 0.45,
          hpMultStart: 0.9, hpMultEnd: 3.4, spawnCountStart: 1, spawnCountEnd: 5 },
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
    // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    trashInterval: 2.4, trashCount: 1,

    // 出現順（小→中→大）。betweenAttacks の長さは attacks の長さと一致させること。
    tiers: [
      // 小ボス「コロたま」（~90秒）。攻撃は突進のみ・phase2なし・撃破でプレイ続行。
      {
        tier: 'small', bossId: 'korotama', final: false,
        warnSec: 88, spawnSec: 90, spawnDist: 200,
        hp: 2600, radius: 30, spriteScale: 5, glowScale: 4,
        glowOuter: '#ffc2e0', glowInner: '#b8f0d8',
        chaseSpeed: 72, bodyDamage: 15,
        attacks: ['dash'],
        dash: { telegraphSec: 1.0, speed: 300, durationSec: 0.7, damage: 24 },
        ring: { telegraphSec: 0.5, count: 6, count2: 8, bulletSpeed: 100,
                bulletRadius: 4, damage: 12, lifeSec: 3.0 },
        summon: { count: 4, enemyId: 'chibit', ringRadius: 50 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.8, phase2DashSpeedMult: 1.1,
        rageText: '', bulletTint: '#ff9ec4',
        rewardCoins: 120, deathCinematicSec: 1.0,
      },
      // 中ボス「ウズキング」（~185秒）。突進/放射弾/召喚＋phase2「ぶちギレ」。撃破でプレイ続行。
      {
        tier: 'mid', bossId: 'uzuking', final: false,
        warnSec: 183, spawnSec: 185, spawnDist: 220,
        hp: 7200, radius: 40, spriteScale: 6, glowScale: 5,
        glowOuter: '#7a3bf0', glowInner: '#ff6ec7',
        chaseSpeed: 64, bodyDamage: 23,
        attacks: ['dash', 'ring', 'summon'],
        dash: { telegraphSec: 0.9, speed: 380, durationSec: 0.8, damage: 38 },
        ring: { telegraphSec: 0.5, count: 8, count2: 12, bulletSpeed: 110,
                bulletRadius: 4, damage: 15, lifeSec: 3.5 },
        summon: { count: 6, enemyId: 'chibit', ringRadius: 60 },
        idleSec: { afterSpawn: 3, betweenAttacks: [3, 2, 3] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        rageText: 'ウズキング ぶちギレ！', bulletTint: '#ff6ec7',
        rewardCoins: 250, deathCinematicSec: 1.5,
      },
      // 大ボス「マオウ」（~278秒＝クリア条件）。全攻撃を強化＋phase2「かくせい」。撃破でクリア。
      {
        tier: 'final', bossId: 'maou', final: true,
        warnSec: 276, spawnSec: 278, spawnDist: 240,
        hp: 14000, radius: 46, spriteScale: 7, glowScale: 6,
        glowOuter: '#ffcb3d', glowInner: '#c9187e',
        chaseSpeed: 72, bodyDamage: 27,
        attacks: ['dash', 'ring', 'summon'],
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 42 },
        ring: { telegraphSec: 0.5, count: 12, count2: 16, bulletSpeed: 125,
                bulletRadius: 4, damage: 18, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'chibit', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5, 1.8, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.65, phase2DashSpeedMult: 1.2,
        rageText: 'マオウ かくせい！', bulletTint: '#c9187e',
        rewardCoins: 400, deathCinematicSec: 1.8,
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
