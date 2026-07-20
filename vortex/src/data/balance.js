// バランス数値の正典（PROTOTYPE_SPEC §4.1）。値は独断で変更しないこと。

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
};
