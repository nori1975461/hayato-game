// systems/capture.js — スターコアのドロップ/拾得と合成祭壇（PROTOTYPE_SPEC §3.4 / §4.4）。
import { BALANCE } from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

const N_MONS = MONSTERS.filter((m) => m.rarity === 'N');
const R_MONS = MONSTERS.filter((m) => m.rarity === 'R');
const SR_MONS = MONSTERS.filter((m) => m.rarity === 'SR');
const NtoR = MONSTERS.filter((m) => m.id === 'samet' || m.id === 'neonworm');

export function createCapture(run) {
  const C = BALANCE.capture;
  const cores = [];
  let altar = null;
  let altarSpawned = false;
  let msg = null;         // 「あと◯たい ひつよう」表示
  let msgT = 0;

  function makeCore(x, y, def) {
    const glow = run.add.image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(6)
      .setTint(int(def.color)).setScale(1.6);
    const spr = run.add.image(x, y, 'core').setDepth(12)
      .setTint(int(def.color)).setScale(1.6);
    cores.push({ x, y, def, glow, spr, life: C.coreLifeSec });
  }

  // 敵撃破時のドロップ抽選
  function onEnemyKilled(e) {
    const rate = e.isElite ? C.eliteDropRate : C.dropRate;
    // ほかくアップ（captureAdd）はドロップ率に加算
    if (!run.rng.chance(rate + run.stats.captureAdd)) return;
    const pool = e.isElite ? R_MONS : N_MONS;
    const def = run.rng.pick(pool);
    makeCore(e.x, e.y, def);
  }

  // G キー: 足元へ強制ドロップ（N からランダム）
  function forceDropCore() {
    makeCore(run.player.x, run.player.y, run.rng.pick(N_MONS));
  }

  function pickupCore(core) {
    if (run.party.length < BALANCE.orbit.maxSlots) {
      run.party.push({ def: core.def });
      run.orbit.rebuild();
      run.captures++;
      Sound.sfx('capture');
      run.spawnParticles(core.x, core.y, int(core.def.color), 14);
      run.floatText(core.x, core.y, core.def.name + ' なかま！', '#ffe066');
    } else {
      run.coins += C.fullPartyCoins;
      Sound.sfx('pickup');
      run.spawnParticles(core.x, core.y, 0xffd23f, 10);
      run.floatText(core.x, core.y, '+' + C.fullPartyCoins + ' コイン', '#ffd23f');
    }
  }

  function updateCores(dt) {
    const px = run.player.x, py = run.player.y;
    for (const core of cores) {
      if (core.dead) continue;
      core.life -= dt;
      // 残り3秒は点滅
      if (core.life <= 3) {
        const on = Math.floor(core.life * 8) % 2 === 0;
        core.spr.setVisible(on);
        core.glow.setVisible(on);
      }
      // ふわふわ回転
      core.spr.rotation += dt * 3;
      // 拾得判定
      const dx = px - core.x, dy = py - core.y;
      if (dx * dx + dy * dy <= 20 * 20) {
        pickupCore(core);
        core.dead = true;
      } else if (core.life <= 0) {
        core.dead = true;
      }
      if (core.dead) { core.glow.destroy(); core.spr.destroy(); }
    }
    for (let i = cores.length - 1; i >= 0; i--) {
      if (cores[i].dead) cores.splice(i, 1);
    }
  }

  function spawnAltar() {
    const x = run.player.x, y = run.player.y - 110;
    const glow = run.add.image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(4)
      .setTint(0xff6ec7).setScale(3.5);
    const spr = run.add.image(x, y, 'core').setDepth(12)
      .setTint(0xffffff).setScale(3.2);
    const label = run.add.text(x, y - 30, 'ごうせいの さいだん', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd6f0',
    }).setOrigin(0.5).setDepth(13);
    altar = { x, y, glow, spr, label };
    Sound.sfx('altar');
    run.floatText(x, y + 26, 'さわって ごうせい！', '#ff6ec7');
  }

  // パーティ先頭から同レアリティ2体を選び上位へ合成
  function tryFuse() {
    const seen = {};
    let pair = null, resultPool = null;
    for (let i = 0; i < run.party.length; i++) {
      const rar = run.party[i].def.rarity;
      if (rar === 'SR') continue;           // SR は素材にしない
      if (seen[rar] != null) {
        pair = [seen[rar], i];
        resultPool = rar === 'N' ? NtoR : SR_MONS;
        break;
      }
      seen[rar] = i;
    }
    if (!pair) return false;
    const def = run.rng.pick(resultPool);
    // 素材を除去（大きいインデックスから）
    run.party.splice(pair[1], 1);
    run.party.splice(pair[0], 1);
    run.party.push({ def });
    run.orbit.rebuild();
    Sound.sfx('fusion');
    run.shake(120, 4);
    run.spawnParticles(run.player.x, run.player.y, int(def.color), 20);
    run.floatText(run.player.x, run.player.y - 20, def.name + ' たんじょう！', '#ff6ec7');
    return true;
  }

  function updateAltar(dt) {
    if (!altarSpawned && run.elapsed >= BALANCE.altar.appearSec) {
      altarSpawned = true;
      spawnAltar();
    }
    if (!altar) return;
    altar.spr.rotation += dt * 1.5;
    altar.glow.setScale(3.3 + Math.sin(run.elapsed * 3) * 0.3);
    const dx = run.player.x - altar.x, dy = run.player.y - altar.y;
    if (dx * dx + dy * dy <= 26 * 26) {
      if (run.party.length >= BALANCE.altar.minParty) {
        if (tryFuse()) {
          altar.glow.destroy(); altar.spr.destroy(); altar.label.destroy();
          altar = null;
        }
      } else {
        const need = BALANCE.altar.minParty - run.party.length;
        showMsg('あと' + need + 'たい ひつよう');
      }
    }
  }

  function showMsg(text) {
    if (!msg) {
      msg = run.add.text(320, 300, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1500);
    }
    msg.setText(text).setVisible(true);
    msgT = 1.2;
  }

  function update(dt) {
    updateCores(dt);
    updateAltar(dt);
    if (msg && msg.visible) {
      msgT -= dt;
      if (msgT <= 0) msg.setVisible(false);
    }
  }

  return { update, onEnemyKilled, forceDropCore, get coreCount() { return cores.length; } };
}
