// systems/orbit.js — 仲間の公転と4アーキタイプ攻撃（PROTOTYPE_SPEC §3.4 / §5.3 / §10.5）。
// Run.js から run を注入して使う（Phaser 参照は run 経由）。
// party[i] = { def, fused?, evolved? }。fused/進化で表示スケールと戦闘値が変わる。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

export function createOrbit(run) {
  const A = BALANCE.archetypes;
  const F = BALANCE.fused;
  const orbs = [];          // 公転体の内部状態（run.party と1:1で同期）
  let angle = 0;            // 全体の公転位相（ラジアン）

  // run.party の増減・進化・合成に合わせて公転体スプライトと戦闘値を作り直す
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
      const p = run.party[i];
      const base = p.def;
      const fused = !!p.fused;
      const evolved = !!p.evolved && !!base.evo;
      const src = evolved ? base.evo : base;   // 進化形態は id/baseDamage/sprite/ovr を持つ
      const big = evolved || fused;            // 表示スケール拡大の条件
      const ovr = src.ovr || {};

      o.def = base;
      o.fused = fused;
      o.evolved = evolved;
      o.archetype = base.archetype;            // archetype/color は基本形を継承
      o.color = int(base.color);
      o.textureId = src.id;
      o.dmgBase = src.baseDamage;
      o.fusedDmgMult = fused ? F.damageMult : 1;

      // アーキタイプ別の実効パラメータ（進化ovr → 合成倍率 の順で適用）
      o.hitRadius    = (ovr.hitRadius   ?? A.SLASH.hitRadius)  * (fused ? F.slashRadiusMult : 1);
      o.shotInterval = (ovr.intervalSec ?? A.SHOT.intervalSec) * (fused ? F.shotIntervalMult : 1);
      o.bulletSpeed  =  ovr.bulletSpeed ?? A.SHOT.bulletSpeed;
      o.beamLength   = (ovr.length      ?? A.BEAM.length)      * (fused ? F.beamLengthMult : 1);
      o.beamWidth    = (ovr.width       ?? A.BEAM.width)       * (fused ? F.beamWidthMult : 1);
      o.fieldRadius  = fused ? F.fieldRadius     : (ovr.radius     ?? A.FIELD.radius);
      o.fieldTick    = fused ? F.fieldTickDamage : (ovr.tickDamage ?? A.FIELD.tickDamage);

      o.spr.setTexture('mon_' + o.textureId)
        .setScale(big ? F.spriteScale : 2.5).clearTint();
      o.glow.setTint(o.color).setScale(fused ? F.glowScale : (big ? 1.9 : 1.5));

      if (o.archetype === 'FIELD') {
        if (!o.aura) {
          o.aura = run.add.image(0, 0, 'glow')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
        }
        o.aura.setTint(o.color).setScale((o.fieldRadius * 2) / 32).setVisible(true);
      } else if (o.aura) {
        o.aura.setVisible(false);
      }
    }
  }

  function memberDamage(o) {
    return Math.max(1, Math.round(o.dmgBase * run.stats.damageMult * o.fusedDmgMult));
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
      const bob = Math.sin(run.elapsed * 4 + i * 1.3) * 2;   // ふわふわ浮遊
      const ox = px + Math.cos(a) * radius;
      const oy = py + Math.sin(a) * radius + bob;
      o.x = ox; o.y = oy;
      o.spr.setPosition(ox, oy);
      o.glow.setPosition(ox, oy);

      switch (o.archetype) {
        case 'SLASH': updateSlash(o, dt); break;
        case 'SHOT':  updateShot(o, dt); break;
        case 'BEAM':  updateBeam(o, a, dt); break;
        case 'FIELD': updateField(o, dt); break;
      }
    }
  }

  function updateSlash(o, dt) {
    const hitR = o.hitRadius;
    const dmg = memberDamage(o);
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
    o.shotT = o.shotInterval;
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
    const sp = o.bulletSpeed;
    run.spawnBullet(o.x, o.y, Math.cos(ang) * sp, Math.sin(ang) * sp,
      o.color, memberDamage(o), A.SHOT.bulletRadius);
    Sound.sfx('shoot');
  }

  function updateBeam(o, aimAngle, dt) {
    o.beamT -= dt;
    if (o.beamT > 0) return;
    o.beamT = A.BEAM.intervalSec;
    // プレイヤー→公転体の延長方向（radial 外向き）
    run.activateBeam(o.x, o.y, aimAngle, o.beamLength, o.beamWidth,
      o.color, memberDamage(o));
    Sound.sfx('beam');
  }

  function updateField(o, dt) {
    const px = run.player.x, py = run.player.y;
    if (o.aura) o.aura.setPosition(px, py);
    const R = o.fieldRadius;
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
        if (doTick) run.dealDamage(e, o.fieldTick, o.color);
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
