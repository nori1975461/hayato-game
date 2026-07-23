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
  const W = BALANCE.weapon;
  const orbs = [];          // 公転体の内部状態（run.party と1:1で同期）
  let angle = 0;            // 全体の公転位相（ラジアン）
  let weaponLevel = 1;      // ★取得で上がる武器レベル（全なかま共通・1..W.maxLevel）

  // run.party の増減・進化・合成に合わせて公転体スプライトと戦闘値を作り直す
  function rebuild() {
    // 余分を破棄
    while (orbs.length > run.party.length) {
      const o = orbs.pop();
      o.glow.destroy();
      o.spr.destroy();
      if (o.aura) o.aura.destroy();
      releaseWeaponVisuals(o);
    }
    // 不足を追加
    while (orbs.length < run.party.length) {
      const glow = run.add.image(0, 0, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
      const spr = run.add.image(0, 0, 'white').setDepth(11);
      orbs.push({ glow, spr, aura: null, shotT: 0, beamT: 0, fieldT: 0, slash: new Map(),
                  boomT: 0, ringT: 0, boomerang: null, ringwave: null });
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

      // アーキタイプ別の実効パラメータ（進化ovr → 合成倍率 → 武器レベル の順で適用）
      o.hitRadius    = (ovr.hitRadius   ?? A.SLASH.hitRadius)  * (fused ? F.slashRadiusMult : 1);
      o.slashTick    = A.SLASH.tickSec;
      o.shotInterval = (ovr.intervalSec ?? A.SHOT.intervalSec) * (fused ? F.shotIntervalMult : 1);
      o.bulletSpeed  =  ovr.bulletSpeed ?? A.SHOT.bulletSpeed;
      o.bulletRadius = A.SHOT.bulletRadius;
      o.shots        = 1;
      o.beamLength   = (ovr.length      ?? A.BEAM.length)      * (fused ? F.beamLengthMult : 1);
      o.beamWidth    = (ovr.width       ?? A.BEAM.width)       * (fused ? F.beamWidthMult : 1);
      o.beamInterval = A.BEAM.intervalSec;
      o.fieldRadius  = fused ? F.fieldRadius     : (ovr.radius     ?? A.FIELD.radius);
      o.fieldTick    = fused ? F.fieldTickDamage : (ovr.tickDamage ?? A.FIELD.tickDamage);
      o.fieldTickSec = A.FIELD.tickSec;
      o.boomInterval = (ovr.intervalSec ?? A.BOOMERANG.intervalSec);
      o.boomSpeed    =  ovr.speed       ?? A.BOOMERANG.speed;
      o.boomDist     = (ovr.maxDist     ?? A.BOOMERANG.maxDist)   * (fused ? F.boomerangDistMult : 1);
      o.boomRadius   = (ovr.hitRadius   ?? A.BOOMERANG.hitRadius) * (fused ? F.boomerangRadiusMult : 1);
      o.boomTick     = A.BOOMERANG.tickSec;
      o.ringInterval = (ovr.intervalSec ?? A.RINGWAVE.intervalSec);
      o.ringMaxR     = (ovr.maxRadius   ?? A.RINGWAVE.maxRadius)  * (fused ? F.ringwaveRadiusMult : 1);
      o.ringSpeed    =  ovr.expandSpeed ?? A.RINGWAVE.expandSpeed;
      o.ringThick    = (ovr.thickness   ?? A.RINGWAVE.thickness)  * (fused ? F.ringwaveThicknessMult : 1);

      // 武器レベル成長（必ず最後に適用）
      const wl = weaponLevel - 1;
      if (wl > 0) {
        o.hitRadius   += W.slash.hitRadiusAdd * wl;
        o.slashTick    = Math.max(W.slash.tickSecMin, o.slashTick * Math.pow(W.slash.tickSecMult, wl));
        o.shotInterval = Math.max(W.shot.intervalMin, o.shotInterval * Math.pow(W.shot.intervalMult, wl));
        o.bulletSpeed  += W.shot.bulletSpeedAdd * wl;
        o.bulletRadius += W.shot.bulletRadiusAdd * wl;
        o.beamInterval = Math.max(W.beam.intervalMin, o.beamInterval * Math.pow(W.beam.intervalMult, wl));
        o.beamLength  += W.beam.lengthAdd * wl;
        o.beamWidth   += W.beam.widthAdd * wl;
        o.fieldRadius += W.field.radiusAdd * wl;
        o.fieldTick   += W.field.tickDamageAdd * wl;
        o.fieldTickSec = Math.max(W.field.tickSecMin, o.fieldTickSec * Math.pow(W.field.tickSecMult, wl));
        o.boomInterval = Math.max(W.boomerang.intervalMin, o.boomInterval * Math.pow(W.boomerang.intervalMult, wl));
        o.boomDist    += W.boomerang.maxDistAdd * wl;
        o.boomRadius  += W.boomerang.hitRadiusAdd * wl;
        o.boomSpeed   += W.boomerang.speedAdd * wl;
        o.ringInterval = Math.max(W.ringwave.intervalMin, o.ringInterval * Math.pow(W.ringwave.intervalMult, wl));
        o.ringMaxR    += W.ringwave.maxRadiusAdd * wl;
        o.ringSpeed   += W.ringwave.expandSpeedAdd * wl;
        o.ringThick   += W.ringwave.thicknessAdd * wl;
      }
      o.shots = Math.min(W.shot.maxShots, 1 + Math.floor(wl / W.shot.extraShotEvery));

      const lvGrow = wl / (W.maxLevel - 1);     // 0..1。レベルが上がるほど僅かに大きく光る
      o.spr.setTexture('mon_' + o.textureId)
        .setScale((big ? F.spriteScale : 2.5) * (1 + lvGrow * 0.12)).clearTint();
      o.glow.setTint(o.color)
        .setScale((fused ? F.glowScale : (big ? 1.9 : 1.5)) * (1 + lvGrow * 0.35));

      if (o.archetype === 'FIELD') {
        if (!o.aura) {
          // Wave B: フィールドはシャボン玉の輪で見せる（glowのぼんやり円より範囲が分かりやすい）
          o.aura = run.add.image(0, 0, 'w_bubble')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
        }
        o.aura.setTint(o.color).setAlpha(0.75)
          .setDisplaySize(o.fieldRadius * 2, o.fieldRadius * 2).setVisible(true);
      } else if (o.aura) {
        o.aura.setVisible(false);
      }
    }
  }

  function memberDamage(o) {
    const lvMult = 1 + W.damageAddPerLevel * (weaponLevel - 1);
    return Math.max(1, Math.round(o.dmgBase * run.stats.damageMult * o.fusedDmgMult * lvMult));
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
        case 'BOOMERANG': updateBoomerang(o, dt); break;
        case 'RINGWAVE':  updateRingwave(o, dt); break;
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
        if (last == null || run.elapsed - last >= o.slashTick) {
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
    const dmg = memberDamage(o);
    const n = o.shots;
    const step = Phaser.Math.DegToRad(W.shot.spreadDeg);
    // 狙い角を中心に左右対称の扇状（1発なら従来どおり真っ直ぐ）
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * step;
      run.spawnBullet(o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp,
        o.color, dmg, o.bulletRadius);
    }
    Sound.sfx('shoot');
  }

  function updateBeam(o, aimAngle, dt) {
    o.beamT -= dt;
    if (o.beamT > 0) return;
    o.beamT = o.beamInterval;
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
    if (doTick) o.fieldT = o.fieldTickSec;
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

  // クッキーブーメラン（BOOMERANG）。最寄り敵の方へ投げ、maxDist で折り返して
  // 「移動中の」なかまへ戻る。往路・復路の両方でヒットする（敵ごとに tickSec でゲート）。
  function updateBoomerang(o, dt) {
    const dmg = memberDamage(o);
    if (!o.boomerang) {
      o.boomT -= dt;
      if (o.boomT > 0) return;
      // 射程内の最寄り敵（往復ぶんの余裕を見て maxDist の1.5倍まで探す）
      const range = o.boomDist * 1.5;
      let best = null, bestD = range * range;
      for (const e of run.enemies) {
        if (!e.active) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) return;
      o.boomT = o.boomInterval;
      const ang = Math.atan2(best.y - o.y, best.x - o.x);
      const spr = run.add.image(o.x, o.y, 'w_cookie').setDepth(12).setTint(o.color);
      const glow = run.add.image(o.x, o.y, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setTint(o.color).setScale(0.7);
      o.boomerang = {
        x: o.x, y: o.y, dirx: Math.cos(ang), diry: Math.sin(ang),
        phase: 'out', dist: 0, hit: new Map(), spr, glow,
      };
      Sound.sfx('boomerang');
      return;
    }

    const b = o.boomerang;
    const sp = o.boomSpeed;
    if (b.phase === 'out') {
      b.x += b.dirx * sp * dt;
      b.y += b.diry * sp * dt;
      b.dist += sp * dt;
      if (b.dist >= o.boomDist) b.phase = 'back';
    } else {
      const dx = o.x - b.x, dy = o.y - b.y;   // なかまは公転で動くので毎フレーム狙い直す
      const d = Math.hypot(dx, dy);
      if (d <= 12) {                           // 回収
        b.spr.destroy();
        b.glow.destroy();
        o.boomerang = null;
        return;
      }
      b.x += (dx / d) * sp * dt;
      b.y += (dy / d) * sp * dt;
    }
    b.spr.setPosition(b.x, b.y);
    b.spr.rotation += 12 * dt;
    b.glow.setPosition(b.x, b.y);

    const hr = o.boomRadius;
    for (const e of run.enemies) {
      if (!e.active) continue;
      const rr = hr + e.radius;
      const ex = e.x - b.x, ey = e.y - b.y;
      if (ex * ex + ey * ey <= rr * rr) {
        const last = b.hit.get(e.id);
        if (last == null || run.elapsed - last >= o.boomTick) {
          b.hit.set(e.id, run.elapsed);
          run.dealDamage(e, dmg, o.color);
        }
      }
    }
  }

  // おんぷリング（RINGWAVE）。周期的に広がる輪。輪の前面が通った敵に1回だけ当たる。
  function updateRingwave(o, dt) {
    if (!o.ringwave) o.ringwave = { rings: [] };
    const rings = o.ringwave.rings;

    o.ringT -= dt;
    if (o.ringT <= 0) {
      o.ringT = o.ringInterval;
      const spr = run.add.image(o.x, o.y, 'w_ring')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(10).setTint(o.color);
      rings.push({ cx: o.x, cy: o.y, r: 0, hitSet: new Set(), spr });
      Sound.sfx('ringwave');
    }

    const dmg = memberDamage(o);
    const halfT = o.ringThick / 2;
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i];
      g.r += o.ringSpeed * dt;
      if (g.r >= o.ringMaxR) {
        g.spr.destroy();
        rings.splice(i, 1);
        continue;
      }
      const size = Math.max(2, g.r * 2);
      g.spr.setPosition(g.cx, g.cy).setDisplaySize(size, size)
        .setAlpha(Math.max(0, 1 - g.r / o.ringMaxR));
      for (const e of run.enemies) {
        if (!e.active || g.hitSet.has(e.id)) continue;
        const dx = e.x - g.cx, dy = e.y - g.cy;
        const d = Math.hypot(dx, dy);
        if (Math.abs(d - g.r) <= halfT + e.radius) {
          g.hitSet.add(e.id);
          run.dealDamage(e, dmg, o.color);
        }
      }
    }
  }

  // 武器ビジュアルの後始末。rebuild() の pop ループと destroy() の「両方」から呼ぶ
  // （片方だけだとなかま入替時にスプライトが残ってリークする）。
  function releaseWeaponVisuals(o) {
    if (o.boomerang) {
      o.boomerang.spr.destroy();
      o.boomerang.glow.destroy();
      o.boomerang = null;
    }
    if (o.ringwave) {
      for (const g of o.ringwave.rings) g.spr.destroy();
      o.ringwave = null;
    }
  }

  function destroy() {
    for (const o of orbs) {
      o.glow.destroy();
      o.spr.destroy();
      if (o.aura) o.aura.destroy();
      releaseWeaponVisuals(o);
    }
    orbs.length = 0;
  }

  // ★取得で呼ばれる。上限に達していたら false
  function levelUp() {
    if (weaponLevel >= W.maxLevel) return false;
    weaponLevel++;
    rebuild();
    return true;
  }

  function setWeaponLevel(n) {
    weaponLevel = Phaser.Math.Clamp(Math.floor(n), 1, W.maxLevel);
    rebuild();
  }

  return {
    rebuild, update, destroy, levelUp, setWeaponLevel,
    get count() { return orbs.length; },
    get weaponLevel() { return weaponLevel; },
  };
}
