// バランス数値の正典 v3。値を変更したら dev/PROTOTYPE_SPEC.md §10.4 も併せて改訂すること。

export const BALANCE = {
  view: { width: 640, height: 360 },
  runDurationSec: 420,            // 参考値（クリア条件はボス撃破。時間切れ敗北なし）。Wave R2でステージ尺を延長
  player: { hp: 100, speed: 120, invulnSec: 0.8, radius: 7 },

  // 主人公の自動攻撃「スターショット」
  hero: {
    intervalSec: 1.55, bulletSpeed: 360, range: 240, bulletRadius: 4,   // FB#4: 弾速+20%・手数-約1割（intervalSec+約10%）
    damageBase: 6, damagePerTwoLevels: 1,   // damage = base + floor(level/2)
    spreadDeg: 12,   // R4: 旧 twinLevel/tripleLevel（プレイヤーLv基準の2連/3連）は shotByStage（playerStage基準）へ移行し削除
    // R4(#4/#8): 主人公にも「攻撃してる感覚」を。常時スターオーラ（周囲の敵へ自動近接ダメージ）。
    // 主力はあくまで公転仲間なので威力は控えめ。playerStage(1/2/3) で範囲が広がる。
    auraRadius: 28, auraRadiusPerStage: 10, auraTickSec: 0.5, auraDamage: 4,
    // ショット強化：弾数は playerStage 連動（1→2→3）。stage3 で貫通1（2体まで貫く）。
    shotByStage: [1, 2, 3], pierceFromStage: 3, pierceCount: 1,
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

  // 必殺技（敵を倒すとゲージが溜まる。1ステージ3回まで）
  // v4: テンポ改善（cinematicSec短縮=すぐ操作に戻れる・killsPerCharge減=撃ちやすい・startCharge増=序盤から1発目が近い）
  special: {
    // FB#1: 最大5回・ゲージ約3割速く・1発目をさらに近く
    killsPerCharge: 18, maxUses: 5, radius: 320, damage: 9999, bossDamage: 360,
    cinematicSec: 0.7, startCharge: 0.7,
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
        rageText: '', bulletTint: '#7fd0ff',
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
        rageText: 'ウズバルカン ぶちギレ！', bulletTint: '#ffd23f',
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
      // 6. 最終ボス「マオウレクス」（~360秒＝クリア条件）。最終ボスは3つの必殺級「特別攻撃」を持つ：
      //    ① 亜空間レーザー薙ぎ（laser・極太/長射程に強化） ② 多連ホーミングミサイル斉射（missile・弾数を7へ増やし
      //    扇状の"斉射"に） ③ 重力弾幕ノヴァ（nova＝新規／全方位弾を回転させながら連続波で放つ弾幕）。この3つが
      //    attacks ローテーション。phase2 では laser の後に vulcan を割り込ませる（beginAttack が cfg.vulcan を参照）。
      //    armslam は近接データとして保持するがローテーションには載せない（3特別攻撃に集中させる）。撃破でクリア。
      //    サイズ：spriteScale 8（縦長人型のため通常ボス≈8-9 に対し素の大きさで約1.2倍・画面占有を抑え「大きすぎ」を解消）・
      //    radius/glow/spawnDist も追随縮小（通常ボスの radius 64〜76 帯へ）。
      {
        tier: 'final', bossId: 'maou', final: true,
        warnSec: 358, spawnSec: 360, spawnDist: 320,
        hp: 28000, radius: 68, spriteScale: 8, glowScale: 9.5,
        glowOuter: '#b01c22', glowInner: '#4ad4ff',
        chaseSpeed: 68, bodyDamage: 30,
        attacks: ['laser', 'missile', 'nova'],
        laser: { chargeSec: 1.0, beamWidth: 46, beamLength: 420, damage: 42,
                 sweepFromDeg: -42, sweepToDeg: 42, activeSec: 0.7 },
        // 特別攻撃②：多連ホーミングミサイル斉射（count 4→7・扇状に一斉発射で"斉射"感）
        missile: { telegraphSec: 0.6, count: 7, launchSpeed: 216, homingRate: 2.4, maxTurnDeg: 70,
                   speed: 180, radius: 6, damage: 24, blastDamage: 18, lifeSec: 3.5 },
        // 特別攻撃③：重力弾幕ノヴァ（予告付き・全方位弾を波ごとに spinDeg 回して螺旋状に連続で放つ）
        nova: { telegraphSec: 1.1, waves: 5, waveInterval: 0.16, perWave: 14,
                bulletSpeed: 116, bulletRadius: 4, damage: 20, lifeSec: 4.0, spinDeg: 13 },
        armslam: { telegraphSec: 0.7, slamSec: 0.5, shockCount: 9, shockSpeed: 144,
                   shockRadius: 5, shockDamage: 20, meleeRadius: 50, meleeDamage: 38 },
        vulcan: { telegraphSec: 0.4, bursts: 3, perBurst: 9, sweepDeg: 16, bulletSpeed: 150,
                  bulletRadius: 4, damage: 16, lifeSec: 3.2 },
        dash: { telegraphSec: 0.8, speed: 400, durationSec: 0.85, damage: 52 },
        ring: { telegraphSec: 0.5, count: 11, count2: 14, bulletSpeed: 150,
                bulletRadius: 4, damage: 18, lifeSec: 3.8 },
        summon: { count: 8, enemyId: 'chibit', ringRadius: 70 },
        idleSec: { afterSpawn: 2.5, betweenAttacks: [2.2, 2.0, 2.6] },
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
