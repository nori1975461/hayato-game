// systems/levelup.js — XP管理・自動強化・進化トリガ（PROTOTYPE_SPEC §4 / §10.6-A,E）。
// v3: 3択ドラフトを廃止。★でレベルが上がった瞬間に cycle 順で自動強化＋なかまの武器レベルアップ。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

export function createLevelup(run) {
  const E = BALANCE.evolve;        // startLevel, everyLevels
  const AU = BALANCE.autoUpgrade;  // cycle, bonusEveryLevels

  function needFor(level) {
    return BALANCE.xp.firstLevelNeed + BALANCE.xp.needStep * (level - 2);
  }

  function addXp(amount) {
    run.xp += amount;
    while (run.xp >= run.xpNeed) {
      run.xp -= run.xpNeed;
      run.level += 1;
      run.xpNeed = needFor(run.level + 1);
      ripple();
      Sound.sfx('levelup');
      if (isEvolveLevel(run.level)) tryEvolve();
      autoUpgrade();
    }
  }

  // ---- 自動強化（cycle を順に一巡。Lv2 で cycle[0]） ----
  function pickUpgrade() {
    const cycle = AU.cycle;
    if (!cycle || !cycle.length) return null;
    const id = cycle[((run.level - 2) % cycle.length + cycle.length) % cycle.length];
    return BALANCE.upgrades.find(u => u.id === id) || BALANCE.upgrades[0] || null;
  }

  function partyNames() {
    if (!run.party) return [];
    return run.party.map(p => {
      const src = (p.evolved && p.def.evo) ? p.def.evo : p.def;
      return src.name;
    }).filter(n => !!n);
  }

  function autoUpgrade() {
    const up = pickUpgrade();
    if (up) apply(up);

    // 5レベル毎はご褒美（虹:オールアップ＋HP全回復）
    if (AU.bonusEveryLevels > 0 && run.level % AU.bonusEveryLevels === 0) {
      const all = BALANCE.rainbowUpgrades.find(u => u.id === 'rainbow_all');
      if (all) apply(all);
      run.player.hp = run.player.maxHp;
    }

    // なかまの武器レベルアップ（上限に達したら通常のパワーアップ演出）
    const leveled = !!(run.orbit && run.orbit.levelUp && run.orbit.levelUp());
    if (leveled && run.fx && run.fx.weaponLevelUp) {
      run.fx.weaponLevelUp(run.orbit.weaponLevel, partyNames());
    } else if (up && run.fx && run.fx.powerupFlash) {
      run.fx.powerupFlash(up);
    }

    if (up && run.fx && run.fx.announce) {
      run.fx.announce(up.label + ' アップ！', '#ffe066');
    }
    Sound.sfx('powerup');
    if (!run.cinematic) run.freezeT = 0.06;   // ごく短い手応え（シネマ中は干渉しない）
  }

  // ---- 進化（§10.6-E: Lv6 以降2レベル毎・party先頭の未進化かつ非合成を1体） ----
  function isEvolveLevel(level) {
    return level >= E.startLevel && (level - E.startLevel) % E.everyLevels === 0;
  }

  function tryEvolve() {
    for (let i = 0; i < run.party.length; i++) {
      const p = run.party[i];
      if (p.fused || p.evolved) continue;
      if (!p.def.evo) continue;
      // orbit.js が p.evolved を見て base.evo のスプライト/戦闘値へ切り替える（色は基本形を継承）
      p.evolved = true;
      run.orbit.rebuild();
      if (run.fx && run.fx.evolveBurst) {
        run.fx.evolveBurst({ x: run.player.x, y: run.player.y }, p.def.evo);
      }
      return true;
    }
    return false;
  }

  function ripple() {
    const r = run.add.image(320, 180, 'glow')
      .setScrollFactor(0).setDepth(1900).setBlendMode(ADD)
      .setTint(0xffffff).setScale(1).setAlpha(0.85);
    run.tweens.add({ targets: r, scale: 22, alpha: 0, duration: 520,
      ease: 'Cubic.out', onComplete: () => r.destroy() });
  }

  // ---- 効果適用 ----
  function applyStat(stat, add) {
    if (stat === 'maxHpAdd') {
      run.player.maxHp += add;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + add);
    } else {
      run.stats[stat] = (run.stats[stat] || 0) + add;
    }
  }

  function apply(up) {
    if (up.effects) {
      for (const e of up.effects) applyStat(e.stat, e.add);
      if (up.heal === 'full') run.player.hp = run.player.maxHp;
    } else {
      applyStat(up.stat, up.add);
    }
  }

  function update() {}

  // ドラフト廃止後の保険（他所から呼ばれても落ちないようにする no-op）
  function select() {}
  function confirm() {}

  return {
    addXp, confirm, select, update,
    get open() { return false; },
  };
}
