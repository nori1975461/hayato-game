// バランス数値の正典 v2。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

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

  wave: { stepSec: 30, steps: 10, spawnIntervalStart: 1.2, spawnIntervalEnd: 0.30,
          hpMultStart: 1.0, hpMultEnd: 6.0, spawnCountStart: 1, spawnCountEnd: 5 },
  enemyCap: 350,
  elite: { times: [120, 240], hpMult: 14, sizeMult: 2, speedMult: 0.8 },
  altar: { appearSec: 150, minParty: 3 },
  xp: { gemValue: 1, eliteGemValue: 10, firstLevelNeed: 5, needStep: 5, magnetRadius: 40 },
  capture: { dropRate: 0.25, eliteDropRate: 1.0, coreLifeSec: 10, fullPartyCoins: 50 },

  // ノンストップ・ドラフト（時間停止なし）
  levelupFlow: {
    autoPickSec: 10,          // 放置時にハイライト中カードを自動決定
    rainbowChance: 0.15,      // 3枚中1枚が虹カードに置換される確率
    cardY: 308, cardW: 190, cardH: 60, cardXs: [115, 320, 525],
  },

  upgrades: [
    { id: 'atk',    label: 'こうげき +25%',  desc: 'なかまの こうげきが つよくなる',   stat: 'damageMult',  add: 0.25 },
    { id: 'spin',   label: 'かいてん +30%',  desc: 'なかまが まわる はやさ アップ',    stat: 'angularMult', add: 0.30 },
    { id: 'radius', label: 'きどう +20%',    desc: 'なかまの まわる わが ひろがる',    stat: 'radiusMult',  add: 0.20 },
    { id: 'move',   label: 'いどう +15%',    desc: 'じぶんの あしが はやくなる',       stat: 'moveMult',    add: 0.15 },
    { id: 'hp',     label: 'たいりょく +30', desc: 'さいだいHPアップ ＋ 30かいふく',   stat: 'maxHpAdd',    add: 30 },
    { id: 'catch',  label: 'ほかく +10%',    desc: 'スターコアが おちやすくなる',      stat: 'captureAdd',  add: 0.10 },
    { id: 'magnet', label: 'じしゃく +40px', desc: 'ジェムを すいよせる はんい アップ', stat: 'magnetAdd',   add: 40 },
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
    trashInterval: 1.6, trashCount: 2,
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
