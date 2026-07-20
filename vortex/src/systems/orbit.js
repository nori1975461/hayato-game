// systems/orbit.js — 仲間の公転と4アーキタイプ攻撃（PROTOTYPE_SPEC §3.4 / §5.3）。
// Run.js から run を注入して使う（Phaser 参照は run 経由）。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

export function createOrbit(run) {
  const A = BALANCE.archetypes;
  const orbs = [];          // 公転体の内部状態（run.party と1:1で同期）
  let angle = 0;            // 全体の公転位相（ラジアン）

  // run.party の増減に合わせて公転体スプライトを作り直す
  function rebuild() {
    // 余分を破棄
    while (orbs.length > run.party.length) {
      const o = orbs.pop();
      o.glow.destroy();
      o.spr.destroy();
      if (o.aura) o.aura.destroy();
    }
    // 不足を追加
    while (orbs.length < run.party.length) {
      const glow = run.add.image(0, 0, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
      const spr = run.add.image(0, 0, 'white').setDepth(11);
      orbs.push({ glow, spr, aura: null, shotT: 0, beamT: 0, fieldT: 0, slash: new Map() });
    }
    // 定義を各公転体へ割り当て
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const def = run.party[i].def;
      o.def = def;
      o.color = int(def.color);
      o.spr.setTexture('mon_' + def.id).setScale(2).clearTint();
      o.glow.setTint(o.color).setScale(1.5);
      if (def.archetype === 'FIELD') {
        if (!o.aura) {
          o.aura = run.add.image(0, 0, 'glow')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(3)
            .setTint(o.color);
        }
        o.aura.setScale((A.FIELD.radius * 2) / 32).setVisible(true);
      } else if (o.aura) {
        o.aura.setVisible(false);
      }
    }
  }

  function memberDamage(def) {
    return Math.max(1, Math.round(def.baseDamage * run.stats.damageMult));
  }

  function update(dt) {
    const px = run.player.x, py = run.player.y;
    const angMult = run.stats.angularMult;
    const radius = BALANCE.orbit.baseRadius * run.stats.radiusMult;
    angle += Phaser.Math.DegToRad(BALANCE.orbit.baseAngularDeg) * angMult * dt;

    const n = orbs.length || 1;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const a = angle + (i / n) * Math.PI * 2;
      const ox = px + Math.cos(a) * radius;
      const oy = py + Math.sin(a) * radius;
      o.x = ox; o.y = oy;
      o.spr.setPosition(ox, oy);
      o.glow.setPosition(ox, oy);

      switch (o.def.archetype) {
        case 'SLASH': updateSlash(o, dt); break;
        case 'SHOT':  updateShot(o, dt); break;
        case 'BEAM':  updateBeam(o, a, dt); break;
        case 'FIELD': updateField(o, dt); break;
      }
    }
  }

  function updateSlash(o, dt) {
    const hitR = A.SLASH.hitRadius;
    const dmg = memberDamage(o.def);
    for (const e of run.enemies) {
      if (!e.active) continue;
      const rr = hitR + e.radius;
      const dx = e.x - o.x, dy = e.y - o.y;
      if (dx * dx + dy * dy <= rr * rr) {
        const last = o.slash.get(e.id);
        if (last == null || run.elapsed - last >= A.SLASH.tickSec) {
          o.slash.set(e.id, run.elapsed);
          run.dealDamage(e, dmg, o.color);
        }
      }
    }
    // 溜まった古いエントリを軽く掃除
    if (o.slash.size > 64) o.slash.clear();
  }

  function updateShot(o, dt) {
    o.shotT -= dt;
    if (o.shotT > 0) return;
    o.shotT = A.SHOT.intervalSec;
    // range 内の最寄り敵
    let best = null, bestD = A.SHOT.range * A.SHOT.range;
    for (const e of run.enemies) {
      if (!e.active) continue;
      const dx = e.x - o.x, dy = e.y - o.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) return;
    const ang = Math.atan2(best.y - o.y, best.x - o.x);
    const sp = A.SHOT.bulletSpeed;
    run.spawnBullet(o.x, o.y, Math.cos(ang) * sp, Math.sin(ang) * sp,
      o.color, memberDamage(o.def), A.SHOT.bulletRadius);
    Sound.sfx('shoot');
  }

  function updateBeam(o, aimAngle, dt) {
    o.beamT -= dt;
    if (o.beamT > 0) return;
    o.beamT = A.BEAM.intervalSec;
    // プレイヤー→公転体の延長方向（radial 外向き）
    run.activateBeam(o.x, o.y, aimAngle, A.BEAM.length, A.BEAM.width,
      o.color, memberDamage(o.def));
    Sound.sfx('beam');
  }

  function updateField(o, dt) {
    const px = run.player.x, py = run.player.y;
    if (o.aura) o.aura.setPosition(px, py);
    const R = A.FIELD.radius;
    // 減速マークと tick ダメージ
    o.fieldT -= dt;
    const doTick = o.fieldT <= 0;
    if (doTick) o.fieldT = A.FIELD.tickSec;
    for (const e of run.enemies) {
      if (!e.active) continue;
      const dx = e.x - px, dy = e.y - py;
      const rr = R + e.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        e.slowMark = run.elapsed;      // 移動側が参照して減速
        if (doTick) run.dealDamage(e, A.FIELD.tickDamage, o.color);
      }
    }
  }

  function destroy() {
    for (const o of orbs) {
      o.glow.destroy();
      o.spr.destroy();
      if (o.aura) o.aura.destroy();
    }
    orbs.length = 0;
  }

  return { rebuild, update, destroy, get count() { return orbs.length; } };
}
