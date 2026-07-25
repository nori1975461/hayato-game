// systems/orbit.js — 仲間の公転と4アーキタイプ攻撃（PROTOTYPE_SPEC §3.4 / §5.3 / §10.5）。
// Run.js から run を注入して使う（Phaser 参照は run 経由）。
// party[i] = { def, fused?, evolved? }。fused/進化で表示スケールと戦闘値が変わる。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

// ── FB#4: 武器レベルアップの「まとう装飾」を段階的に派手化（HAYATO本体の40段階武器を参考）。
// maxLevel(=12) を6つの見た目ティアに束ね、帯が上がるごとに装飾が累積で足され
// 「明らかに別物へ変わった」と一目で分かるようにする。テーマ＝可愛さ×派手さ・限界突破。
const HUES = [0xffd23f, 0xff6ec7, 0x7fd8ff, 0x9b6bff, 0x36e0ff, 0xff9e3f];
const DECO_TIERS = [
  // Lv1-2:  素のグローのみ（原点）
  { sats: 0, hearts: 0, halo: 0, crown: false, ribbon: false, wings: false, sparks: 0, pulse: 0.00, glowMul: 1.00 },
  // Lv3-4:  星の衛星が2つ回りだす（最初の「変わった！」）
  { sats: 2, hearts: 0, halo: 0, crown: false, ribbon: false, wings: false, sparks: 0, pulse: 0.06, glowMul: 1.15 },
  // Lv5-6:  衛星3つ＋リボン＋脈動グロー
  { sats: 3, hearts: 0, halo: 0, crown: false, ribbon: true,  wings: false, sparks: 2, pulse: 0.10, glowMul: 1.30 },
  // Lv7-8:  衛星4つ＋王冠＋虹サンバースト後光（派手さの入口）
  { sats: 4, hearts: 0, halo: 1, crown: true,  ribbon: true,  wings: false, sparks: 3, pulse: 0.12, glowMul: 1.50 },
  // Lv9-10: ＋ハート衛星2つ＋きらきら増（きらびやか）
  { sats: 4, hearts: 2, halo: 1, crown: true,  ribbon: true,  wings: false, sparks: 4, pulse: 0.14, glowMul: 1.70 },
  // Lv11-12:限界突破＝天使羽＋王冠＋特大後光2重＋衛星6＋ハート2＋スパーク全開＋虹シマー
  { sats: 6, hearts: 2, halo: 2, crown: true,  ribbon: true,  wings: true,  sparks: 6, pulse: 0.18, glowMul: 2.00 },
];
const decoTierIndex = (lv) => Math.min(DECO_TIERS.length - 1, Math.max(0, Math.floor((lv - 1) / 2)));
// ── R4: 武器フォームチェンジ。weaponLevel の2Lv帯ごとに form0(近接)↔form1(遠距離)を交互に。
// band=floor((lv-1)/2)、formIndex=band%2。帯0(Lv1-2)=近接／帯1(Lv3-4)=遠距離／帯2(Lv5-6)=近接…
const formIndexFor = (lv) => (Math.floor((lv - 1) / 2) % 2);
// 虹シマー：連続位相 ph をHUESインデックスへ巡回（各装飾で位相をずらすと全体で虹グラデに見える）
const hueAt = (ph) => HUES[((Math.floor(ph) % HUES.length) + HUES.length) % HUES.length];

export function createOrbit(run) {
  const A = BALANCE.archetypes;
  const F = BALANCE.fused;
  const W = BALANCE.weapon;
  const orbs = [];          // 公転体の内部状態（run.party と1:1で同期）
  let angle = 0;            // 全体の公転位相（ラジアン）
  let weaponLevel = 1;      // ★取得で上がる武器レベル（全なかま共通・1..W.maxLevel）

  // FB#2: 合成なかまだけ「実効武器レベル」に +weaponLevelBonus（レベル起因の成長を上乗せ）。
  // 固定倍率 fusedDmgMult（damageMult 由来）とは別枠なので二重取りにはならない。
  const effLevel = (o) => Math.min(W.maxLevel, weaponLevel + (o && o.fused ? (F.weaponLevelBonus || 0) : 0));

  ensureDecoTextures();     // 装飾テクスチャを一度だけ内製（textures.exists でガード）

  // run.party の増減・進化・合成に合わせて公転体スプライトと戦闘値を作り直す
  function rebuild() {
    // 余分を破棄
    while (orbs.length > run.party.length) {
      const o = orbs.pop();
      o.glow.destroy();
      o.spr.destroy();
      if (o.aura) o.aura.destroy();
      if (o.weaponSpr) o.weaponSpr.destroy();
      disposeDeco(o);
      releaseWeaponVisuals(o);
    }
    // 不足を追加
    while (orbs.length < run.party.length) {
      const glow = run.add.image(0, 0, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
      const spr = run.add.image(0, 0, 'white').setDepth(11);
      orbs.push({ glow, spr, aura: null, deco: [], glowBase: 1.5, glowMul: 1, decoTier: null,
                  shotT: 0, beamT: 0, fieldT: 0, slash: new Map(),
                  boomT: 0, ringT: 0, boomerang: null, ringwave: null,
                  form: null, weaponSpr: null, meleeSfxT: -1, levelPulseT: 0 });
    }
    // 定義を各公転体へ割り当て
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const prevArch = o.archetype;   // R4: フォーム帯切替で archetype が変わったら旧飛翔体を破棄するため保持
      const p = run.party[i];
      const base = p.def;
      const fused = !!p.fused;
      const evolved = !!p.evolved && !!base.evo;
      const src = evolved ? base.evo : base;   // 進化形態は id/baseDamage/sprite/ovr を持つ
      const big = evolved || fused;            // 表示スケール拡大の条件
      const ovr = src.ovr || {};

      o.def = base;
      o.idx = i;                               // 脈動などの位相ずらしに使う
      o.fused = fused;
      o.evolved = evolved;
      const el = effLevel(o);   // FB#2: このなかまの実効武器レベル（合成なら +weaponLevelBonus）
      // R4: 現フォームを決定（進化体に forms が無ければ基本形から継承）。実効 archetype はフォーム側。
      // FB#2: フォーム帯も実効レベル基準（合成なかまは別フォーム帯になりうる）。
      const forms = src.forms || base.forms;
      o.form = forms ? forms[formIndexFor(el)] : null;
      o.archetype = o.form ? o.form.archetype : base.archetype;
      // R4: フォーム帯切替で archetype が別物へ変わったら、旧 archetype の飛翔中スプライト
      //     (boomerang/ringwave) を破棄する（どの update からも参照されず画面に固着＋リークするため）。
      if (prevArch && prevArch !== o.archetype) releaseWeaponVisuals(o);
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

      // 武器レベル成長（必ず最後に適用）。FB#2: 実効レベル el 基準（合成なかまは強く伸びる）。
      const wl = el - 1;
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
      // グローの基準スケール。脈動は updateDeco が glowBase×glowMul×鼓動 で毎フレーム上書きする
      o.glowBase = (fused ? F.glowScale : (big ? 1.9 : 1.5)) * (1 + lvGrow * 0.35);
      o.glow.setTint(o.color).setScale(o.glowBase);

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

      // R4: 現フォームの武器テクスチャを本体に携える（近接は振り／遠距離は携えて浮遊）。
      // update() の updateWeaponVisual が毎フレーム追従・アニメする。虹テクスチャのみ tint 白。
      if (o.form) {
        if (!o.weaponSpr) {
          o.weaponSpr = run.add.image(0, 0, 'white')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
        }
        const tex = run.textures.exists(o.form.tex) ? o.form.tex : 'white';
        const wsize = o.form.kind === 'melee' ? (big ? 26 : 20) : (big ? 18 : 14);
        o.weaponSpr.setTexture(tex)
          .setTint(o.form.tex === 'w_rainbow' ? 0xffffff : o.color)
          .setDisplaySize(wsize, wsize).setVisible(true);
      } else if (o.weaponSpr) {
        o.weaponSpr.setVisible(false);
      }

      // ★武器レベルに応じた「まとう装飾」を再構築（ティアが上がるほど別物の見た目へ）
      // FB#2: 実効レベル el で選ぶので、合成なかまは装飾ティアも一段上がって見た目でも強さが伝わる。
      buildDeco(o, el, big);
    }
  }

  function memberDamage(o) {
    // FB#2: レベル倍率は実効レベル基準（合成なかまは +weaponLevelBonus ぶん上乗せ）。
    const lvMult = 1 + W.damageAddPerLevel * (effLevel(o) - 1);
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
      updateDeco(o, dt);     // まとう装飾を本体へ追従＋アニメ（グロー脈動もここ）
      updateWeaponVisual(o); // R4: フォームの武器テクスチャを本体へ追従（近接は振り／遠距離は携える）

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
          // 近接フォームの打撃音（多発するので orb ごとに間引く・rng不使用）
          if (o.form && (o.meleeSfxT < 0 || run.elapsed - o.meleeSfxT >= 0.18)) {
            o.meleeSfxT = run.elapsed;
            Sound.sfx(o.form.sfx);
          }
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
    const tex = o.form ? o.form.tex : 'bullet';
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * step;
      run.spawnBullet(o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp,
        o.color, dmg, o.bulletRadius, tex);
    }
    // FB#5: 発射位置に一瞬の閃光（味方共通の金白フラッシュ・1斉射につき1回）
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(o.x, o.y, ang, 0xfff2b0);
    Sound.sfx((o.form && o.form.sfx) || 'shoot');
  }

  function updateBeam(o, aimAngle, dt) {
    o.beamT -= dt;
    if (o.beamT > 0) return;
    o.beamT = o.beamInterval;
    // プレイヤー→公転体の延長方向（radial 外向き）
    run.activateBeam(o.x, o.y, aimAngle, o.beamLength, o.beamWidth,
      o.color, memberDamage(o));
    Sound.sfx((o.form && o.form.sfx) || 'beam');
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
        if (doTick) {
          run.dealDamage(e, o.fieldTick, o.color);
          // もこもこスポンジ（近接FIELD）の控えめな当たり音（間引く）
          if (o.form && o.form.kind === 'melee'
              && (o.meleeSfxT < 0 || run.elapsed - o.meleeSfxT >= 0.4)) {
            o.meleeSfxT = run.elapsed;
            Sound.sfx(o.form.sfx);
          }
        }
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
      const btex = (o.form && run.textures.exists(o.form.tex)) ? o.form.tex : 'w_cookie';
      const spr = run.add.image(o.x, o.y, btex).setDepth(12).setTint(o.color);
      const glow = run.add.image(o.x, o.y, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setTint(o.color).setScale(0.7);
      o.boomerang = {
        x: o.x, y: o.y, dirx: Math.cos(ang), diry: Math.sin(ang),
        phase: 'out', dist: 0, hit: new Map(), spr, glow,
      };
      Sound.sfx((o.form && o.form.sfx) || 'boomerang');
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
      const rtex = (o.form && run.textures.exists(o.form.tex)) ? o.form.tex : 'w_ring';
      const spr = run.add.image(o.x, o.y, rtex)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(10).setTint(o.color);
      rings.push({ cx: o.x, cy: o.y, r: 0, hitSet: new Set(), spr });
      Sound.sfx((o.form && o.form.sfx) || 'ringwave');
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

  // ── FB#4 装飾テクスチャの内製（boss.js と同じ方式：白で描いて実行時 setTint で色付け）。
  function ensureDecoTextures() {
    const G = () => run.make.graphics({ x: 0, y: 0, add: false });
    const P = (x, y) => new Phaser.Geom.Point(x, y);
    // N点星（衛星星・きらきら・サンバースト後光に共用）
    const star = (key, s, points, outR, inR) => {
      if (run.textures.exists(key)) return;
      const g = G(); const c = s / 2; const pts = [];
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? outR : inR;
        const a = (Math.PI * i) / points - Math.PI / 2;
        pts.push(P(c + Math.cos(a) * rad, c + Math.sin(a) * rad));
      }
      g.fillStyle(0xffffff, 1); g.fillPoints(pts, true);
      g.generateTexture(key, s, s); g.destroy();
    };
    star('deco_sat', 16, 5, 7.5, 3.2);    // ぷっくり5点の衛星星
    star('deco_spark', 14, 4, 6.5, 2.0);  // 4点きらきら
    star('deco_halo', 80, 16, 39, 12);    // 16条のサンバースト後光

    if (!run.textures.exists('deco_heart')) {
      const g = G(); const s = 22, r = s * 0.26;
      g.fillStyle(0xffffff, 1);
      g.fillCircle(s * 0.32, s * 0.36, r);
      g.fillCircle(s * 0.68, s * 0.36, r);
      g.fillPoints([P(s * 0.08, s * 0.42), P(s * 0.92, s * 0.42), P(s * 0.5, s * 0.95)], true);
      g.generateTexture('deco_heart', s, s); g.destroy();
    }
    if (!run.textures.exists('deco_crown')) {
      const g = G(); const s = 26;
      g.fillStyle(0xffffff, 1);
      g.fillPoints([
        P(s * 0.12, s * 0.82), P(s * 0.12, s * 0.34), P(s * 0.30, s * 0.56),
        P(s * 0.50, s * 0.20), P(s * 0.70, s * 0.56), P(s * 0.88, s * 0.34),
        P(s * 0.88, s * 0.82),
      ], true);
      g.fillCircle(s * 0.12, s * 0.30, s * 0.09);   // 山の先の玉
      g.fillCircle(s * 0.50, s * 0.16, s * 0.10);
      g.fillCircle(s * 0.88, s * 0.30, s * 0.09);
      g.generateTexture('deco_crown', s, s); g.destroy();
    }
    if (!run.textures.exists('deco_ribbon')) {
      const g = G(); const s = 28, cy = s * 0.5;
      g.fillStyle(0xffffff, 1);
      g.fillPoints([P(s * 0.5, cy), P(s * 0.06, s * 0.28), P(s * 0.06, s * 0.72)], true);  // 左の羽
      g.fillPoints([P(s * 0.5, cy), P(s * 0.94, s * 0.28), P(s * 0.94, s * 0.72)], true);  // 右の羽
      g.fillCircle(s * 0.5, cy, s * 0.13);          // 中央の結び目
      g.generateTexture('deco_ribbon', s, s); g.destroy();
    }
    if (!run.textures.exists('deco_wing')) {
      const w = 28, h = 34;
      const g = G(); g.fillStyle(0xffffff, 1);
      // 付け根(右下)から先端(左上)へ細くなる天使羽のシルエット（円の重ねで作る）
      g.fillCircle(w * 0.60, h * 0.78, w * 0.30);
      g.fillCircle(w * 0.50, h * 0.54, w * 0.26);
      g.fillCircle(w * 0.42, h * 0.32, w * 0.20);
      g.fillCircle(w * 0.36, h * 0.14, w * 0.13);
      g.generateTexture('deco_wing', w, h); g.destroy();
    }
  }

  // ティアに応じた装飾スプライトを生成（既存は disposeDeco で破棄してから作り直す）
  function buildDeco(o, level, big) {
    disposeDeco(o);
    const t = DECO_TIERS[decoTierIndex(level)];
    o.decoTier = t;
    o.glowMul = t.glowMul;
    const baseScale = big ? 1.25 : 1.0;    // 進化/合成のなかまは装飾も少し大きく
    const add = (key, depth, blend) => {
      const img = run.add.image(0, 0, key).setDepth(depth);
      if (blend != null) img.setBlendMode(blend);
      o.deco.push(img);
      return img;
    };
    // サンバースト後光（本体の背後・ADD）
    for (let i = 0; i < t.halo; i++) {
      const img = add('deco_halo', 4, Phaser.BlendModes.ADD);
      img.role = 'halo'; img.idx = i;
      img.spin = (i % 2 ? -1 : 1) * 0.5;
      img.baseScale = baseScale * (1.1 + i * 0.55);
    }
    // 天使羽（本体の背後・左右）
    if (t.wings) {
      for (let s = 0; s < 2; s++) {
        const img = add('deco_wing', 10, Phaser.BlendModes.ADD);
        img.role = 'wing'; img.side = s === 0 ? -1 : 1;
        img.setFlipX(s === 0);
        img.baseScale = baseScale;
      }
    }
    // 衛星星（本体の周りを公転・虹回転）
    for (let i = 0; i < t.sats; i++) {
      const img = add('deco_sat', 12, Phaser.BlendModes.ADD);
      img.role = 'sat'; img.idx = i; img.n = t.sats;
      img.baseScale = baseScale;
    }
    // ハート衛星（衛星星の外側を逆回転）
    for (let i = 0; i < t.hearts; i++) {
      const img = add('deco_heart', 12, null);
      img.role = 'heart'; img.idx = i; img.n = t.hearts;
      img.baseScale = baseScale;
    }
    // 王冠（本体の頭上・金）
    if (t.crown) {
      const img = add('deco_crown', 12, null);
      img.role = 'crown'; img.baseScale = baseScale;
      img.setTint(0xffe45c);
    }
    // リボン（本体の足元・虹）
    if (t.ribbon) {
      const img = add('deco_ribbon', 12, null);
      img.role = 'ribbon'; img.baseScale = baseScale;
    }
    // きらきらスパーク（本体周囲で明滅・虹）
    for (let i = 0; i < t.sparks; i++) {
      const img = add('deco_spark', 13, Phaser.BlendModes.ADD);
      img.role = 'spark'; img.idx = i; img.n = t.sparks;
      img.baseScale = baseScale;
    }
  }

  // 装飾の追従・アニメ。決定的（run.elapsed と idx のみ・Math.random不使用）。
  function updateDeco(o, dt) {
    if (o.glowBase == null) return;
    // FB#5: レベルアップ直後の一瞬だけグローを強く膨らませる（段が上がった手応え）。
    let lvPop = 1;
    if (o.levelPulseT > 0) {
      o.levelPulseT = Math.max(0, o.levelPulseT - dt);
      lvPop = 1 + (o.levelPulseT / 0.5) * 0.6;   // 立ち上がりで最大約1.6倍→1へ減衰
    }
    // グロー脈動（ティアが上がるほど大きく強く脈打つ）
    const pulse = o.decoTier ? o.decoTier.pulse : 0;
    const beat = 1 + Math.sin(run.elapsed * 6 + (o.idx || 0)) * pulse;
    o.glow.setScale(o.glowBase * (o.glowMul || 1) * beat * lvPop);

    if (!o.deco.length) return;
    const bodyR = (o.spr.displayWidth * 0.5) || 20;
    const t = run.elapsed;
    for (const d of o.deco) {
      switch (d.role) {
        case 'halo': {
          d.setPosition(o.x, o.y);
          d.rotation += d.spin * dt;
          const sc = (bodyR * 2.4 * d.baseScale) / 80;     // 後光は本体の約2.4倍径
          d.setScale(sc * (1 + Math.sin(t * 3 + d.idx) * 0.10));
          d.setTint(hueAt(t * 1.5 + d.idx * 2));
          d.setAlpha(0.35);                                // ADD・全画面ではないので子ども安全内
          break;
        }
        case 'wing': {
          const flap = Math.sin(t * 4) * 0.12;
          d.setPosition(o.x + d.side * bodyR * 0.55, o.y - bodyR * 0.1);
          d.setRotation(d.side * (0.35 + flap));           // 外向きに開いて羽ばたく
          d.setScale((bodyR * 1.6 * d.baseScale) / 34);
          d.setTint(hueAt(t * 1.2 + (d.side > 0 ? 3 : 0)));
          d.setAlpha(0.45);
          break;
        }
        case 'sat': {
          const a = t * 2.2 + (d.idx / d.n) * Math.PI * 2;
          const orbR = bodyR * 1.35;
          d.setPosition(o.x + Math.cos(a) * orbR, o.y + Math.sin(a) * orbR);
          d.rotation += dt * 6;
          const sc = (bodyR * 0.55 * d.baseScale) / 16;
          d.setScale(sc * (1 + Math.sin(t * 8 + d.idx) * 0.20));
          d.setTint(hueAt(t * 3 + d.idx));                 // 各星で位相ずれ＝虹の輪
          d.setAlpha(0.95);
          break;
        }
        case 'heart': {
          const a = -t * 1.6 + (d.idx / d.n) * Math.PI * 2 + Math.PI / 4;
          const orbR = bodyR * 1.75;
          d.setPosition(o.x + Math.cos(a) * orbR, o.y + Math.sin(a) * orbR);
          const sc = (bodyR * 0.6 * d.baseScale) / 22;
          d.setScale(sc * (1 + Math.sin(t * 5 + d.idx * 2) * 0.15));
          d.setTint(hueAt(t * 2 + d.idx * 3 + 1));
          d.setAlpha(0.95);
          break;
        }
        case 'crown': {
          const bobY = Math.sin(t * 3) * bodyR * 0.05;
          d.setPosition(o.x, o.y - bodyR * 0.95 + bobY);
          d.setScale((bodyR * 1.1 * d.baseScale) / 26);
          d.setRotation(Math.sin(t * 2) * 0.08);
          break;
        }
        case 'ribbon': {
          d.setPosition(o.x, o.y + bodyR * 0.85);
          const sc = (bodyR * 0.95 * d.baseScale) / 28;
          d.setScale(sc, sc * (1 + Math.sin(t * 6) * 0.08));   // ひらひら
          d.setRotation(Math.sin(t * 4) * 0.12);
          d.setTint(hueAt(t * 2 + 2));
          d.setAlpha(0.95);
          break;
        }
        case 'spark': {
          const a = d.idx * 2.399963 + t * 0.6;                // 黄金角で決定的に散らす
          const rr = bodyR * (1.0 + ((d.idx * 0.37) % 1) * 0.9);
          d.setPosition(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr);
          const tw = 0.5 + 0.5 * Math.sin(t * 7 + d.idx * 1.7); // 明滅
          d.setScale((bodyR * 0.35 * d.baseScale) / 14 * (0.6 + tw * 0.8));
          d.rotation += dt * 4;
          d.setTint(hueAt(t * 4 + d.idx * 2));
          d.setAlpha(0.3 + tw * 0.45);
          break;
        }
      }
    }
  }

  function disposeDeco(o) {
    if (o.deco) {
      for (const d of o.deco) d.destroy();
      o.deco.length = 0;
    }
  }

  // R4: フォームの武器テクスチャを本体へ追従・アニメ。決定的（run.elapsed と idx のみ）。
  // 近接＝本体の外側で弧を描いて振る（打撃感）。遠距離＝脇に携えてゆらゆら浮遊。
  function updateWeaponVisual(o) {
    const w = o.weaponSpr;
    if (!w || !o.form) return;
    // R4: aurajelly の近接FIELDフォームは o.aura（泡の輪）が既に範囲を見せるので、同じ w_bubble の
    //     weaponSpr は隠して二重表示を避ける（遠距離など他フォームでは表示に戻す）。
    if (o.form.kind === 'melee' && o.archetype === 'FIELD') { w.setVisible(false); return; }
    w.setVisible(true);
    const t = run.elapsed;
    const bodyR = (o.spr.displayWidth * 0.5) || 20;
    const outAng = Math.atan2(o.y - run.player.y, o.x - run.player.x);
    if (o.form.kind === 'melee') {
      const swing = Math.sin(t * 9 + o.idx * 1.7);
      const ang = outAng + swing * 0.7;
      const rr = bodyR * 1.15;
      w.setPosition(o.x + Math.cos(ang) * rr, o.y + Math.sin(ang) * rr);
      w.setRotation(ang + Math.PI / 2 + swing * 0.9);
      w.setAlpha(0.9);
    } else {
      const a = t * 1.6 + o.idx * 1.3;
      const rr = bodyR * 0.85;
      w.setPosition(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.6 - bodyR * 0.2);
      w.setRotation(Math.sin(t * 3 + o.idx) * 0.4);
      w.setAlpha(0.82);
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
      if (o.weaponSpr) o.weaponSpr.destroy();
      disposeDeco(o);
      releaseWeaponVisuals(o);
    }
    orbs.length = 0;
  }

  // ★取得で呼ばれる。上限に達していたら false
  function levelUp() {
    if (weaponLevel >= W.maxLevel) return false;
    weaponLevel++;
    rebuild();
    // FB#5: 段が上がった瞬間を体感させる。本体をポンッと膨らませ、装飾のグローを一瞬強く脈打たせる。
    for (const o of orbs) {
      o.levelPulseT = 0.5;
      const base = o.spr.scaleX || 1;
      run.tweens.add({ targets: o.spr, scaleX: base * 1.4, scaleY: base * 1.4,
        duration: 140, yoyo: true, ease: 'Quad.out' });
    }
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
    // R4: HUD 用。全なかま共通 weaponLevel なので先頭 orb の現フォームを代表として返す。
    // orb がまだ無い場合でも band から kind を算出して返す（表示が空にならないように）。
    get currentForm() {
      if (orbs.length && orbs[0].form) return orbs[0].form;
      const idx = formIndexFor(weaponLevel);
      return { kind: idx === 0 ? 'melee' : 'ranged', name: '' };
    },
  };
}
