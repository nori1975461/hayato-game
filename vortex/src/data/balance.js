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

  // v5(Wave C): 中盤以降の密度不足を解消。湧き数は小数のまま累積するので階段状に増えない。
  // 硬さ(hpMultEnd)は据え置き＝倒す手応えは変えずに「数」だけで山場を作る。
  wave: { stepSec: 30, steps: 10, spawnIntervalStart: 1.6, spawnIntervalEnd: 0.45,
          hpMultStart: 1.0, hpMultEnd: 3.2, spawnCountStart: 1, spawnCountEnd: 5 },
  enemyCap: 220,
  // 敵数上限は時間で段階的に上がる（序盤はむしろ軽く、後半で「囲まれる」密度になる）
  capSteps: [
    { untilSec: 90,   cap: 90 },
    { untilSec: 180,  cap: 140 },
    { untilSec: 9999, cap: 220 },
  ],
  // ラッシュ（山場）。warnSec前にテロップ＋警告リングで必ず予告する
  rush: { startSec: 100, intervalSec: 70, counts: [14, 20, 26, 32], warnSec: 1.2 },
  // 雑魚の“ぷるぷる”。生成時に消費済みのsinePhaseを流用するので乱数を追加消費しない
  enemyFx: { bobHz: 7, bobAmp: 0.09, tiltAmp: 0.10 },
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
    // ボス戦中の雑魚スポーン制限（spawner.js が参照）
    trashInterval: 2.4, trashCount: 1,

    // 出現順（小→中→大）。betweenAttacks の長さは attacks の長さと一致させること。
    tiers: [
      // 小ボス「コロたま」（~90秒）。攻撃は突進のみ・phase2なし・撃破でプレイ続行。
      {
        tier: 'small', bossId: 'korotama', final: false,
        warnSec: 88, spawnSec: 90, spawnDist: 200,
        hp: 1200, radius: 30, spriteScale: 5, glowScale: 4,
        glowOuter: '#ffc2e0', glowInner: '#b8f0d8',
        chaseSpeed: 55, bodyDamage: 10,
        attacks: ['dash'],
        dash: { telegraphSec: 1.0, speed: 300, durationSec: 0.7, damage: 16 },
        ring: { telegraphSec: 0.5, count: 6, count2: 8, bulletSpeed: 100,
                bulletRadius: 4, damage: 8, lifeSec: 3.0 },
        summon: { count: 4, enemyId: 'zunzun', ringRadius: 50 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5] },
        phase2: false, phase2HpRatio: 0.5, phase2IdleMult: 0.8, phase2DashSpeedMult: 1.1,
        rageText: '', bulletTint: '#ff9ec4',
        rewardCoins: 120, deathCinematicSec: 1.0,
      },
      // 中ボス「ウズキング」（~185秒）。突進/放射弾/召喚＋phase2「ぶちギレ」。撃破でプレイ続行。
      {
        tier: 'mid', bossId: 'uzuking', final: false,
        warnSec: 183, spawnSec: 185, spawnDist: 220,
        hp: 3200, radius: 40, spriteScale: 6, glowScale: 5,
        glowOuter: '#7a3bf0', glowInner: '#ff6ec7',
        chaseSpeed: 45, bodyDamage: 15,
        attacks: ['dash', 'ring', 'summon'],
        dash: { telegraphSec: 0.9, speed: 380, durationSec: 0.8, damage: 25 },
        ring: { telegraphSec: 0.5, count: 8, count2: 12, bulletSpeed: 110,
                bulletRadius: 4, damage: 10, lifeSec: 3.5 },
        summon: { count: 6, enemyId: 'zunzun', ringRadius: 60 },
        idleSec: { afterSpawn: 3, betweenAttacks: [3, 2, 3] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.7, phase2DashSpeedMult: 1.15,
        rageText: 'ウズキング ぶちギレ！', bulletTint: '#ff6ec7',
        rewardCoins: 250, deathCinematicSec: 1.5,
      },
      // 大ボス「マオウ」（~278秒＝クリア条件）。全攻撃を強化＋phase2「かくせい」。撃破でクリア。
      {
        tier: 'final', bossId: 'maou', final: true,
        warnSec: 276, spawnSec: 278, spawnDist: 240,
        hp: 6000, radius: 46, spriteScale: 7, glowScale: 6,
        glowOuter: '#ffcb3d', glowInner: '#c9187e',
        chaseSpeed: 50, bodyDamage: 18,
        attacks: ['dash', 'ring', 'summon'],
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 28 },
        ring: { telegraphSec: 0.5, count: 12, count2: 16, bulletSpeed: 125,
                bulletRadius: 4, damage: 12, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'zunzun', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.5, 1.8, 2.5] },
        phase2: true, phase2HpRatio: 0.5, phase2IdleMult: 0.65, phase2DashSpeedMult: 1.2,
        rageText: 'マオウ かくせい！', bulletTint: '#c9187e',
        rewardCoins: 400, deathCinematicSec: 1.8,
      },
    ],
  },

  // 序盤はかわいい系、後半に突進・分裂が混ざるよう再構成（Wave C）
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
