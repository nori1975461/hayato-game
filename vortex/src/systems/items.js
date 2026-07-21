// systems/items.js — どうくつ（洞窟）と たからばこ（宝箱）（PROTOTYPE_SPEC §10.6-D）。
// 60s/180s に洞窟が1個ずつ出現。lifeSec で消滅（残5sで点滅）。触れると宝箱が開き重み抽選で報酬。
// 洞窟/宝箱の見た目は既存テクスチャ（glow/core/white）から合成する（Boot.js は専用テクスチャを持たない）。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

export function createItems(run) {
  const C = BALANCE.cave;
  const spawnFired = C.times.map(() => false);
  let cave = null;   // { x, y, life, glow, spr, label }

  function spawnCave() {
    const ang = run.rng.range(0, Math.PI * 2);
    const d = run.rng.range(C.minDist, C.maxDist);
    const x = run.player.x + Math.cos(ang) * d;
    const y = run.player.y + Math.sin(ang) * d;

    const glow = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(6)
      .setTint(0xffd23f).setScale(3);
    const spr = run.add.image(x, y, 'core').setDepth(12).setTint(0xffe066).setScale(2.4);
    const label = run.add.text(x, y - 26, 'どうくつ', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffe066',
      stroke: '#1b1030', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(13);

    cave = { x, y, life: C.lifeSec, glow, spr, label };

    Sound.sfx('altar');
    if (run.fx && run.fx.announce) run.fx.announce('どうくつが あらわれた！', '#ffe066');
    if (run.fx && run.fx.setTarget) run.fx.setTarget('cave', x, y, { color: 0xffd23f, label: 'どうくつ' });
  }

  function closeCave() {
    if (!cave) return;
    cave.glow.destroy();
    cave.spr.destroy();
    cave.label.destroy();
    if (run.fx && run.fx.clearTarget) run.fx.clearTarget('cave');
    cave = null;
  }

  // 重み抽選（run.rng 使用）
  function drawReward() {
    const rewards = C.rewards;
    let total = 0;
    for (const r of rewards) total += r.weight;
    let n = run.rng.random() * total;
    for (const r of rewards) {
      n -= r.weight;
      if (n <= 0) return r;
    }
    return rewards[rewards.length - 1];
  }

  function applyReward(r) {
    if (r.stat === 'maxHpAdd') {
      run.player.maxHp += r.add;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + r.add);
    } else if (r.stat) {
      run.stats[r.stat] = (run.stats[r.stat] || 0) + r.add;
    }
    if (r.invulnSec) run.player.invuln = Math.max(run.player.invuln || 0, r.invulnSec);
    if (r.dropCore && run.capture && run.capture.dropCoreAt) {
      run.capture.dropCoreAt(run.player.x, run.player.y, r.dropCore);
    }
    if (r.coins) run.coins += r.coins;

    Sound.sfx('powerup');
    run.floatText(run.player.x, run.player.y - 34, r.label + '！', '#ffe066');
    if (run.fx && run.fx.announce) run.fx.announce(r.label + ' ゲット！', '#ffe066');
    if (run.fx && run.fx.powerupFlash) run.fx.powerupFlash(null);
  }

  function openChest() {
    const x = cave.x, y = cave.y;
    closeCave();

    Sound.sfx('chest');
    run.shake(120, 3);
    run.spawnParticles(x, y, 0xffd23f, 24);

    // たからばこがポップして弾ける演出
    const chest = run.add.image(x, y, 'core').setDepth(1300).setTint(0xffe066).setScale(0.1);
    run.tweens.add({
      targets: chest, scale: 3.2, duration: 260, ease: 'Back.out',
      onComplete: () => run.tweens.add({
        targets: chest, alpha: 0, scale: 4.4, duration: 400, delay: 250,
        onComplete: () => chest.destroy(),
      }),
    });

    applyReward(drawReward());
  }

  function update(dt) {
    for (let i = 0; i < C.times.length; i++) {
      if (!spawnFired[i] && run.elapsed >= C.times[i]) {
        spawnFired[i] = true;
        if (!cave) spawnCave();      // 同時には1個だけ
      }
    }
    if (!cave) return;

    cave.life -= dt;
    cave.spr.rotation += dt * 2;
    cave.glow.setScale(2.8 + Math.sin(run.elapsed * 3) * 0.4);

    if (cave.life <= 5) {            // 残り5秒で点滅
      const on = Math.floor(cave.life * 6) % 2 === 0;
      cave.spr.setVisible(on);
      cave.glow.setVisible(on);
      cave.label.setVisible(on);
    }

    const dx = run.player.x - cave.x, dy = run.player.y - cave.y;
    if (dx * dx + dy * dy <= C.touchRadius * C.touchRadius) {
      openChest();
    } else if (cave.life <= 0) {
      closeCave();
    }
  }

  function destroy() {
    closeCave();
  }

  return {
    update, destroy,
    get caveCount() { return cave ? 1 : 0; },
  };
}
