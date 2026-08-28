// systems/orbit.js — 仲間の公転と4アーキタイプ攻撃（PROTOTYPE_SPEC §3.4 / §5.3 / §10.5）。
// Run.js から run を注入して使う（Phaser 参照は run 経由）。
// party[i] = { def, fused?, evolved? }。fused/進化で表示スケールと戦闘値が変わる。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

// R19: 「味方の攻撃はすべて金白」に統一する。仲間の体色（o.color）を攻撃にも使うと
// 全10色が画面へ散り、敵弾・拾い物と色が衝突して避けられなくなるため。
// 体色は本体グロー（o.glow）と装飾だけに残し、誰の攻撃かは形で読ませる。
const ALLY_ATK = 0xffe9a8;
// ★R47 ラゴンの光の槍だけは金白ではない。FB「槍はライトセーバーのように青白く光る
//   スタイリッシュな武器にして」＝**指定による唯一の例外**。
// ⚠️ よろけの輪も青白（0x9fe8ff＝「これは自分の獲物」の語彙）なので、同じ色にすると
//    2つの意味が1色に乗る。槍は**彩度を上げた濃い青**にして、淡い水色の輪と分ける。
const LANCE_GLOW = 0x4aa8ff;
const HEAL_FX_SEC = 0.35;   // R22: 回復の光の帯が残る時間

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
// ── R4/R21W2: 武器フォームチェンジ。form0(近接)↔form1(遠距離)。
// ⚠️ 旧実装は weaponLevel の2Lv帯で決めていたが、maxLevel(12) が帯5＝遠距離に当たるため、
//    weaponLevel 11 到達（実測94秒）以降ラン終了まで遠距離に固定されていた（遠距離時間比 実測85.7%）。
//    maxLevel を13にしても formIndexFor(13)=0 で今度は近接へ固定されるだけで直らない。
//    原因はパリティではなく「単調増加して飽和する変数の関数であること」。
// 時間と個体番号で決める。run.rng を一切消費しない決定的な式（シード固定テストを壊さない）。
// +i により常にパーティの約半分が近接＝誰かが必ず主人公の隣で殴っている絵になる。
const formIndexFor = (i, t) => ((Math.floor(t / BALANCE.orbit.formCycleSec) + i) % 2);
// 虹シマー：連続位相 ph をHUESインデックスへ巡回（各装飾で位相をずらすと全体で虹グラデに見える）
const hueAt = (ph) => HUES[((Math.floor(ph) % HUES.length) + HUES.length) % HUES.length];

export function createOrbit(run) {
  const A = BALANCE.archetypes;
  const F = BALANCE.fused;
  const W = BALANCE.weapon;
  const orbs = [];          // 公転体の内部状態（run.party と1:1で同期）
  let angle = 0;            // 全体の公転位相（ラジアン）
  let formPhase = -1;       // R21W2: フォーム往復の現在位相（formCycleSec ごとに繰り上がる）
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
      if (o.zzz) o.zzz.destroy();       // R45 ネムッコの💤
      if (o.lanceGlow) o.lanceGlow.destroy();   // R47 ラゴンの槍のグロー
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
      o.form = forms ? forms[formIndexFor(i, run.elapsed)] : null;
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
      o.healSec      = (ovr.intervalSec ?? A.HEAL.intervalSec);
      o.healAmount   = (ovr.amount      ?? A.HEAL.amount) * (fused ? F.healMult : 1);
      // R23 AMMO（ビリッコ）。武器レベルでは一切伸びない＝増えるのは合体したときだけ。
      o.ammoFirst    = (ovr.firstDelaySec ?? A.AMMO.firstDelaySec);
      o.ammoRefill   = (ovr.refillSec     ?? A.AMMO.refillSec);
      o.ammoPerBoss  = (ovr.perBoss       ?? A.AMMO.perBoss);
      o.ammoPerFinal = (ovr.perFinal      ?? A.AMMO.perFinal);
      // ★R45 SHIELD/SPEED/SLEEPY は**武器レベルでも合体でも一切伸びない**。
      //   AMMO と同じ理由＝この子たちの価値は「量」ではなく「ボス戦に必ず1回ある」こと。
      //   伸ばすと終盤ボスが一方的になる（無敵時間が積み上がって②被弾の緊張感が消える）。

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
        o.healAmount  += W.heal.amountAdd * wl;
        o.healSec      = Math.max(W.heal.intervalMin, o.healSec * Math.pow(W.heal.intervalMult, wl));
      }
      // 次の回復までの残り。rebuild は編成やレベルが変わるたびに走るので、
      // ここで毎回リセットすると「レベルが上がるほど回復が遅れる」逆転が起きる。初回だけ入れる。
      if (o.healT == null) o.healT = o.healSec;
      o.shots = Math.min(W.shot.maxShots, 1 + Math.floor(wl / W.shot.extraShotEvery));

      const lvGrow = wl / (W.maxLevel - 1);     // 0..1。レベルが上がるほど僅かに大きく光る
      // ★R47 ラゴンだけ基準スケールが大きい。FB「他のモビットより、一回り身体が大きく
      //   筋肉もりもりの武闘派」＝ドット絵の造形だけでは伝わらない（16×16は全員同じ）ので、
      //   **画面上の実寸**で差を付ける（2.5 → 3.3＝約1.3倍）。
      const baseScale = o.archetype === 'LANCER'
        ? (A.LANCER.spriteScale || 3.3) * (big ? 1.15 : 1)
        : (big ? F.spriteScale : 2.5);
      o.spr.setTexture('mon_' + o.textureId)
        .setScale(baseScale * (1 + lvGrow * 0.12)).clearTint();
      // ★R45 ネムッコの寝姿はスケールと回転を毎フレーム触るので、基準をここで控える
      //   （rebuild でしか決まらない値なので、寝姿が上書きしたまま戻せなくなるのを防ぐ）。
      o.slBase = o.spr.scaleX;
      if (o.archetype !== 'SLEEPY') {
        if (o.zzz) { o.zzz.destroy(); o.zzz = null; }
        o.spr.setRotation(0);
      }
      // ★R47 LANCER でなくなったら単独行動の残骸を必ず片付ける。lnBreath を残すと
      //   公転に戻った子のスプライトだけが浮いたままになる（座標のズレは静かに残る）。
      if (o.archetype !== 'LANCER') {
        if (o.lanceGlow) { o.lanceGlow.destroy(); o.lanceGlow = null; }
        o.lnBreath = 0; o.lnState = null;
      }
      // グローの基準スケール。脈動は updateDeco が glowBase×glowMul×鼓動 で毎フレーム上書きする
      o.glowBase = (fused ? F.glowScale : (big ? 1.9 : 1.5)) * (1 + lvGrow * 0.35);
      o.glow.setTint(o.color).setScale(o.glowBase);

      if (o.archetype === 'FIELD') {
        if (!o.aura) {
          // Wave B: フィールドはシャボン玉の輪で見せる（glowのぼんやり円より範囲が分かりやすい）
          o.aura = run.add.image(0, 0, 'w_bubble')
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
        }
        o.aura.setTint(ALLY_ATK).setAlpha(0.75)   // R19: 攻撃圏なので金白（体色は本体グローに残す）
          .setDisplaySize(o.fieldRadius * 2, o.fieldRadius * 2).setVisible(true);
      } else if (o.aura) {
        o.aura.setVisible(false);
      }
      if (o.archetype !== 'HEAL' && o.healFx) o.healFx.setVisible(false);

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
          .setTint(o.form.tex === 'w_rainbow' ? 0xffffff : ALLY_ATK)
          .setDisplaySize(wsize, wsize).setVisible(true);
      } else if (o.weaponSpr) {
        o.weaponSpr.setVisible(false);
      }

      // ★武器レベルに応じた「まとう装飾」を再構築（ティアが上がるほど別物の見た目へ）
      // FB#2: 実効レベル el で選ぶので、合成なかまは装飾ティアも一段上がって見た目でも強さが伝わる。
      clampReach(o);
      buildDeco(o, el, big);
    }
  }

  // R21W2: 仲間の到達距離を BALANCE.orbit.allyMaxReach 以内へ揃える。
  // 合成倍率(fused.*Mult)や成長加算が個別値を跳ね上げるので、balance.js の数値表ではなくここが正典。
  function clampReach(o) {
    const orbR = BALANCE.orbit.baseRadius * run.stats.radiusMult;
    const room = Math.max(8, BALANCE.orbit.allyMaxReach - orbR);
    if (o.hitRadius   > room) o.hitRadius   = room;
    if (o.beamLength  > room) o.beamLength  = room;
    if (o.boomDist    > room) o.boomDist    = room;
    if (o.ringMaxR    > room) o.ringMaxR    = room;
    // FIELD は主人公中心なので公転半径を引かない
    if (o.fieldRadius > BALANCE.orbit.allyMaxReach) o.fieldRadius = BALANCE.orbit.allyMaxReach;
  }

  function memberDamage(o) {
    // FB#2: レベル倍率は実効レベル基準（合成なかまは +weaponLevelBonus ぶん上乗せ）。
    const lvMult = 1 + W.damageAddPerLevel * (effLevel(o) - 1);
    return Math.max(1, Math.round(o.dmgBase * run.stats.damageMult * o.fusedDmgMult * lvMult));
  }

  function update(dt) {
    // R21W2: フォーム往復。位相が繰り上がった瞬間に全員まとめて作り直す。
    // 全員が同時に反転するので rebuild は formCycleSec に1回だけ。飛翔体の破棄は
    // rebuild 内の releaseWeaponVisuals（archetype が変わったら破棄）がそのまま担う。
    const ph = Math.floor(run.elapsed / BALANCE.orbit.formCycleSec);
    if (ph !== formPhase) { formPhase = ph; rebuild(); }
    const px = run.player.x, py = run.player.y;
    const angMult = run.stats.angularMult;
    const radius = BALANCE.orbit.baseRadius * run.stats.radiusMult;
    angle += Phaser.Math.DegToRad(BALANCE.orbit.baseAngularDeg) * angMult * dt;

    const n = orbs.length || 1;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      const a = angle + (i / n) * Math.PI * 2;
      // ★R47 ラゴン（LANCER）だけは公転しない。FB「ふつうモビットは主人公の近くを離れないが、
      //   このモビットだけ単独行動して敵を攻撃しにいく」＝位置も攻撃も updateLancer が決める。
      //   ここで呼ぶのは、この下の setPosition／武器の追従に**同じフレームの座標**を使うため。
      if (o.archetype === 'LANCER') {
        updateLancer(o, dt);
      } else {
        const bob = Math.sin(run.elapsed * 4 + i * 1.3) * 2;   // ふわふわ浮遊
        o.x = px + Math.cos(a) * radius;
        o.y = py + Math.sin(a) * radius + bob;
      }
      const ox = o.x, oy = o.y;
      // lnBreath＝肩で息の上下（LANCER 以外では常に 0）
      o.spr.setPosition(ox, oy + (o.lnBreath || 0));
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
        case 'HEAL':      updateHeal(o, dt); break;
        case 'AMMO':      updateAmmo(o, dt); break;
        case 'SHIELD':    updateShield(o, dt); break;
        case 'SPEED':     updateSpeed(o, dt); break;
        case 'SLEEPY':    updateSleepy(o, dt); break;
        case 'LANCER':    break;   // 上の位置決めと同時に済ませている（単独行動なので分けられない）
      }
    }
  }

  // R23: 弾薬モビット（ビリッコ）。実プレイFB「特殊弾を生成してくれるモビットもいれて。…
  //   ボス戦でのみ。1ボスに対して1弾。マオウレクス戦では2弾」。
  //
  // ここが決めるのは **いつ渡すか** だけ。渡す演出（スローモーション）と弾そのものは
  // billiard.js が持つ（手の中の状態を触るのはあちらの責任なので、二重管理にしない）。
  function updateAmmo(o, dt) {
    const bs = run.boss;
    // ボス戦以外では一切働かない。在庫はボスごとに作り直すので持ち越しも起きない。
    if (!bs || !bs.active) { o.ammoBossId = null; return; }
    const ent = bs.entity;
    if (!ent) return;
    if (o.ammoBossId !== ent.id) {
      o.ammoBossId = ent.id;
      const final = !!(ent.def && ent.def.id === 'maou');
      o.ammoStock = final ? o.ammoPerFinal : o.ammoPerBoss;
      o.ammoT = o.ammoFirst;
      // ★R33 配る弾は3種になった。ボスごとに引き直す＝「今回は何をくれるか」がボス戦の顔になる。
      //   マオウレクス戦は2発なので、シャッフルした順に配る＝**必ず違う種類**が来る。
      o.ammoQueue = run.rng.shuffle((BALANCE.hero.billiard.ammoKinds || ['bolt']).slice());
    }
    // ★R46 実プレイFB「雷光弾はボス戦中だけ間隔を詰めて。**ボス戦でこそ真価を発揮する**」。
    //   ⚠️ ここに実バグがあった：転生（第3形態→軌道神核）は**同じ boss オブジェクトを
    //      使い回す**ので ent.id が変わらず、在庫が作り直されない。マオウレクス戦の2発を
    //      転生前に使い切ると、**いちばん切り札が欲しい軌道神核戦で0発**になっていた。
    //   → 転生した瞬間に1発だけ足す（第4形態を別のボスとして数え直すと2発になり多すぎる）。
    if (bs.trueForm && !o.ammoTrueDone) {
      o.ammoTrueDone = true;
      o.ammoStock = (o.ammoStock || 0) + (A.AMMO.trueFormRefill || 0);
      o.ammoT = Math.min(o.ammoT, A.AMMO.trueFormDelaySec || o.ammoFirst);
    }
    if (!bs.trueForm) o.ammoTrueDone = false;
    if (o.ammoStock <= 0) return;
    o.ammoT -= dt;
    if (o.ammoT > 0) return;
    // 手がふさがっている間は渡さずに待つ。掴んでいる獲物を雷光弾で上書きすると、
    // 「投げようとしていた弾が消えた」＝プレイヤーの入力を奪うことになる。
    const bl = run.billiard;
    if (!bl || !bl.canReceiveAmmo || !bl.canReceiveAmmo()) return;
    o.ammoStock--;
    o.ammoT = o.ammoRefill;
    const kind = (o.ammoQueue && o.ammoQueue.length) ? o.ammoQueue.shift() : 'bolt';
    bl.giveAmmo(o, kind);
  }

  // ============ R45 新モビット3体（命の盾／爆速ドリンク／ネムッコ）============
  // 3つとも敵に触れない＝run.dealDamage を一度も呼ばない。決めるのは「いつ配るか」だけで、
  // 効果そのもの（無敵・移動倍率）と見た目は Run.js が持つ（主人公に付くものなので）。

  // 現在のボスが軌道神核（真マオウレクス第4形態）か。ネムッコの覚醒条件。
  function isTrueMaou() {
    const bs = run.boss;
    return !!(bs && bs.active && bs.trueForm);
  }

  // ボスが変わったら在庫を作り直す共通処理（AMMO と同じ作法＝持ち越しを作らない）。
  // 戻り値：ボス戦中でなければ false。
  function bossStock(o, key, perBoss, perFinal) {
    const bs = run.boss;
    if (!bs || !bs.active) { o[key + 'BossId'] = null; return false; }
    const ent = bs.entity;
    if (!ent) return false;
    if (o[key + 'BossId'] !== ent.id) {
      o[key + 'BossId'] = ent.id;
      o[key + 'Stock'] = (ent.def && ent.def.id === 'maou') ? perFinal : perBoss;
      o[key + 'T'] = 0;
    }
    return true;
  }

  // ★①命の盾（マモリン）。FB「主人公を守る防御壁（名称：命の盾・ボス戦ごとに1回のみ）」。
  // ⚠️ 引き金は**HPが落ちた瞬間**。ボス戦の開始と同時に張ると、いちばん安全な時間帯を
  //    無敵で潰して終わる＝盾が1回も仕事をしない（守った実感が生まれない）。
  function updateShield(o, dt) {
    const S = BALANCE.archetypes.SHIELD;
    if (!bossStock(o, 'sh', S.perBoss, S.perFinal)) return;
    if (o.shStock <= 0) return;
    const p = run.player;
    if (!p || run.ended || run.cinematic) return;
    if (p.hp > p.maxHp * S.hpTrigger) return;
    o.shStock--;
    run.grantShield(S.durSec, o);
  }

  // ★②爆速ドリンク（ドリンゴ）。FB「一時的に移動速度を1.5倍に上げる薬（ボス戦ごとに1回のみ）」。
  // 注入はボス戦の開始から delaySec 後。登場カットシーンと名乗りが終わって、
  // 実際に攻撃が始まる頃に効き始める＝薬が「効いている」時間が戦闘に重なる。
  function updateSpeed(o, dt) {
    const S = BALANCE.archetypes.SPEED;
    if (!bossStock(o, 'sp', S.perBoss, S.perFinal)) return;
    if (o.spStock <= 0) return;
    if (run.cinematic) return;
    o.spT = (o.spT || 0) + dt;
    if (o.spT < S.delaySec) return;
    o.spStock--;
    run.grantSpeed(S.moveMul, S.durSec, o);
  }

  // ★③ネムッコ。FB「ずっとなにもせずに欠伸ばかりして役に立たないが、軌道神核との戦闘に
  //   入ると覚醒し、命の盾・爆速ドリンク・体力回復をランダムに行う。このモビットの時だけ、
  //   ボス戦での使用上限なし。軌道神核との闘い以外では明らかに役に立ってないことを
  //   プレーヤーがわかるように」。
  //
  // ⚠️ 「何もしない」を**何も描かない**で実装すると、プレイヤーには「壊れている」としか
  //    読めない。役立たずは**演出として積極的に見せる**必要がある（💤・体育座り・横になる）。
  function updateSleepy(o, dt) {
    const S = BALANCE.archetypes.SLEEPY;
    const awake = isTrueMaou();
    if (awake !== !!o.slAwake) { o.slAwake = awake; applySleepyLook(o, awake); }
    if (!awake) { updateSleepPose(o, dt, S); return; }
    // ★覚醒した姿を**毎フレーム守る**。⚠️ 実測で踏んだ：進化やフォーム帯の切替で rebuild が
    //   走るとテクスチャが基本形（寝顔）へ戻り、起きているのに寝顔のまま戦っていた。
    //   applySleepyLook は「覚醒した瞬間」にしか呼ばれないので、そこだけでは守れない。
    const evo = o.def && o.def.evo;
    const key = evo ? 'mon_' + evo.id : null;
    if (key && o.spr.texture.key !== key && run.textures.exists(key)) o.spr.setTexture(key);
    // 覚醒中：上限なし。everySec ごとに3つの効果からランダムで1つ。
    o.slT = (o.slT || 0) - dt;
    if (o.slT > 0) return;
    const first = o.slFired == null;
    if (first) { o.slFired = 0; o.slT = S.firstDelaySec; return; }
    o.slT = S.everySec;
    o.slFired++;
    const kind = run.rng.pick(S.kinds);
    if (kind === 'shield') {
      run.grantShield(BALANCE.archetypes.SHIELD.durSec, o);
    } else if (kind === 'speed') {
      run.grantSpeed(BALANCE.archetypes.SPEED.moveMul, BALANCE.archetypes.SPEED.durSec, o);
    } else {
      const p = run.player;
      if (!p) return;
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + S.healAmount);
      const got = Math.round(p.hp - before);
      run.spawnParticles(p.x, p.y, 0x7dff8f, 14);
      run.floatText(p.x, p.y - 34, got > 0 ? '+' + got + ' HP' : 'まんたん！', '#7dff8f');
      Sound.sfx('heal');
    }
  }

  // 寝ている姿。★ここがこのモビットの本体＝「役に立っていない」を絵で言い切る。
  //   ①体育座り（縦に縮んで沈む） → ②横になる（90度倒れる） を poseSec ごとに往復
  //   ③頭の上に 💤 を浮かべ、yawnSec ごとに大きくふくらませる（あくび）
  function updateSleepPose(o, dt, S) {
    if (!o.spr) return;
    const ph = Math.floor(run.elapsed / S.poseSec) % 2;   // 0=体育座り／1=横になる
    const k = (run.elapsed / S.poseSec) % 1;
    if (ph === 0) {
      // 体育座り：ひざを抱えて丸くなる＝縦に潰して下へ沈める。呼吸でゆっくり上下する。
      const br = Math.sin(run.elapsed * 1.6) * 0.03;
      o.spr.setRotation(0).setScale(o.slBase * (1.06 + br), o.slBase * (0.78 - br));
      o.spr.y = o.y + o.slBase * 2.4;
    } else {
      // 横になる：完全に倒れる。起き上がる素振りも見せない（そこが可笑しい）。
      const tip = Math.min(1, k * 4);                     // 倒れきるまで少しだけ間を置く
      o.spr.setRotation(Math.PI * 0.5 * tip).setScale(o.slBase, o.slBase);
      o.spr.y = o.y + o.slBase * 3.2 * tip;
    }
    // 💤（FB「眠そうな目で顔のうえに寝てる時の表示である💤という表示を出して」）。
    // ⚠️ 絵文字テキストではなくドット絵（deco_zzz）。理由は ensureDecoTextures のコメント。
    if (!o.zzz) {
      o.zzz = run.add.image(o.x, o.y - 20, 'deco_zzz').setDepth(13).setTint(0xcfd6ff);
    }
    const yp = (run.elapsed % S.yawnSec) / S.yawnSec;     // 0→1 で浮かんで消える
    o.zzz.setPosition(o.x + 12 + yp * 8, o.y - 20 - yp * 16)
      .setAlpha(Math.max(0, 1 - yp) * 0.95)
      .setScale(0.9 + yp * 0.7)
      .setVisible(true);
  }

  // 覚醒／二度寝の切り替え。★見た目が変わらないと「起きた」が伝わらないので、
  //   テクスチャそのものを覚醒形（メザメガミ）へ差し替える＝進化とは独立した切り替え。
  function applySleepyLook(o, awake) {
    if (!o.spr) return;
    if (awake) {
      if (o.zzz) { o.zzz.destroy(); o.zzz = null; }
      o.spr.setRotation(0).setScale(o.slBase, o.slBase);
      o.spr.y = o.y;
      const evo = o.def && o.def.evo;
      if (evo && run.textures.exists('mon_' + evo.id)) o.spr.setTexture('mon_' + evo.id);
      // 目覚めの一撃：光と音と名乗りで「こいつ、起きた」を伝える
      run.spawnParticles(o.x, o.y, 0xffe14d, 22);
      Sound.sfx('nemukkoWake');
      if (run.fx && run.fx.announce) {
        run.fx.announce((evo ? evo.name : 'ネムッコ') + ' が めをさました！', '#ffe14d');
      }
      if (o.glow) o.glow.setTint(0xffe14d).setAlpha(0.9);
    } else {
      const base = o.def && o.def.id;
      if (base && run.textures.exists('mon_' + base)) o.spr.setTexture('mon_' + base);
      if (o.glow && o.def) o.glow.setTint(parseInt(o.def.color.slice(1), 16)).setAlpha(0.55);
    }
  }

  // ============ R47 ラゴン（LANCER）＝単独行動する槍使い ============
  // FB「ふつうモビットは主人公の近くを離れないが、このモビットだけ単独行動して敵を
  //   攻撃しにいく。敵を気絶させて弾にするのではない。完全に倒す。（消滅させる）
  //   しばらく戦ったら、疲れをいやすために主人公のもとに帰ってくる。その際に肩で息をする
  //   行動をいれて。しばらくしたらまた戦いにいく。このモビットに体力ゲージは不要」。
  //
  // 3つの状態を往復するだけ：
  //   hunt（狩り・huntSec）→ back（帰還）→ pant（肩で息・pantSec）→ hunt …
  // ★体力ゲージは持たせない（FB指定）。そもそも公転仲間は敵から一切ダメージを受けない仕様なので、
  //   ゲージを出すと「減らないゲージ」が画面に増えるだけになる。疲労は**時間**で表す。
  // ⚠️ 狩りは主人公から huntRange 内に限る。ここを外すと R21W2 で潰した最悪の構造
  //    （仲間が画面外まで掃除して、敵が主人公に届く前に消える）がこの子だけで再現する。
  function updateLancer(o, dt) {
    const L = A.LANCER;
    const px = run.player.x, py = run.player.y;
    if (o.lnState == null) {
      o.x = px + 34; o.y = py - 6;
      o.lnState = 'pant'; o.lnT = 1.2; o.lnBreath = 0; o.lnThrust = 0;
      o.lnAim = 0; o.lnSlain = 0; o.lnBlade = 0;
    }
    // ★刃の伸び縮み。狩っている間だけ光の刃が出ていて、帰り道と休憩中はしまわれている。
    //   FBの「ライトセーバーのように」を**動作**の側でも使う＝点火してから出かけ、
    //   しまってから帰る。休んでいるラゴンが槍を構えたままだと「休んでいる」に見えない。
    const wantBlade = (o.lnState === 'hunt') ? 1 : 0;
    const bs = L.bladeSec || 0.35;
    o.lnBlade = o.lnBlade == null ? 0
      : Math.max(0, Math.min(1, o.lnBlade + (wantBlade ? dt / bs : -dt / bs)));

    // 演出中・決着後は狩りに出ない（カットシーンの画面外で勝手に暴れないため）
    if (run.ended || run.cinematic) { lancerHome(o, dt, px, py, L.returnSpeed); return; }

    o.lnT -= dt;
    if (o.lnState === 'hunt') {
      lancerHunt(o, dt, px, py, L);
      if (o.lnT <= 0) { o.lnState = 'back'; }
    } else if (o.lnState === 'back') {
      const home = lancerHome(o, dt, px, py, L.returnSpeed);
      o.lnAim = Math.atan2(py - o.y, px - o.x);
      if (home <= L.homeRadius) {
        o.lnState = 'pant'; o.lnT = L.pantSec;
        Sound.sfx('lancePant');
        // 息が上がっている：口元から白い息が漏れる
        run.spawnParticles(o.x, o.y + 6, 0xdfefff, 8);
      }
    } else {
      // pant＝肩で息。★ここが「疲れた」を画面で言い切る唯一の場所なので、
      //   止まって待つのではなく**大きく上下**させる（呼吸は縦の運動として読まれる）。
      lancerHome(o, dt, px, py, L.moveSpeed * 0.5);
      const br = Math.sin(run.elapsed * 7.5);
      o.lnBreath = br * 3.2;
      o.spr.setRotation(br * 0.06);
      o.lnAim = -Math.PI / 2;                     // 槍は下ろして立てる
      // 息のパフを 1.1 秒ごとに（吐くタイミングで音も1回だけ）
      o.lnPuff = (o.lnPuff || 0) - dt;
      if (o.lnPuff <= 0) {
        o.lnPuff = 1.1;
        run.spawnParticles(o.x + 8, o.y + 4, 0xdfefff, 5);
        Sound.sfx('lancePant', 0.7);
      }
      if (o.lnT <= 0) {
        o.lnState = 'hunt'; o.lnT = L.huntSec; o.lnBreath = 0;
        o.spr.setRotation(0);
        // ★出撃。休み明けは標的を探す前に**前線まで一気に出る**。
        //   これが無いと、敵は主人公へ向かって集まる性質のせいで「中間で会う」だけになり、
        //   狩っている間の主人公からの距離が平均68px（公転48pxの1.4倍）にしかならなかった＝実測。
        //   「戦いに行く」も「帰ってくる」も、まず**離れていること**が前提になる。
        o.lnSally = true;
        o.lnSallyAng = sallyAngle(px, py, run.elapsed);
        Sound.sfx('lanceIgnite');
        run.spawnParticles(o.x, o.y, LANCE_GLOW, 12);
      }
    }
  }

  // 主人公のもとへ戻る。戻った距離を返す（呼び出し側が到着判定に使う）。
  function lancerHome(o, dt, px, py, speed) {
    const dx = px - o.x, dy = py - o.y;
    const d = Math.hypot(dx, dy);
    const stop = A.LANCER.homeRadius * 0.7;
    if (d > stop) {
      const k = Math.min(1, (speed * dt) / d);
      o.x += dx * k; o.y += dy * k;
    }
    return d;
  }

  // 出撃していく向き。いちばん遠くにいる敵の方角＝「これから来る群れを迎え撃つ」向き。
  // ⚠️ run.rng は使わない（autotest の乱数消費順が変わるとシード固定の検証が壊れる）。
  function sallyAngle(px, py, t) {
    let best = null, bestFar = -1;
    for (const e of run.enemies) {
      if (!e.active || e.stag || e.isBoss) continue;
      const hx = e.x - px, hy = e.y - py;
      const d2 = hx * hx + hy * hy;
      if (d2 > bestFar) { bestFar = d2; best = e; }
    }
    return best ? Math.atan2(best.y - py, best.x - px) : t * 0.8;
  }

  // 狩っている間の立ち位置を minStandoff〜huntRange の帯へ押し戻す。
  function lancerStandoff(o, px, py, L) {
    const ox = o.x - px, oy = o.y - py;
    const od = Math.hypot(ox, oy) || 1;
    const lo = L.minStandoff || 0;
    const clamped = od > L.huntRange ? L.huntRange : (od < lo ? lo : od);
    if (clamped === od) return;
    o.x = px + (ox / od) * clamped;
    o.y = py + (oy / od) * clamped;
  }

  // 狩り。★1回の突きで1体だけ（範囲攻撃にしない）。掃除機になると②被弾の緊張感が消える。
  function lancerHunt(o, dt, px, py, L) {
    // 出撃中：前線（狩りの上限の8割）まで駆けていく。この間は敵を素通りする
    if (o.lnSally) {
      const od = Math.hypot(o.x - px, o.y - py);
      if (od >= L.huntRange * 0.8) {
        o.lnSally = false;
      } else {
        const ang = o.lnSallyAng || 0;
        const k = L.sallySpeed * dt;
        o.x += Math.cos(ang) * k; o.y += Math.sin(ang) * k;
        o.lnAim = ang;
        o.lnThrust = Math.max(0, (o.lnThrust || 0) - dt);
        return;
      }
    }
    // 標的＝主人公から huntRange 内にいる敵のうち、**主人公からいちばん遠い**1体。
    // ⚠️ よろけ（青白い輪＝主人公の獲物）は狙わない。奪うとこのゲームの動詞が消える。
    //
    // ★実測で2回作り直した箇所。
    //   1回目「ラゴンに近い順」→ 主人公からの距離が**平均49.5px**＝公転仲間(48px)と
    //     区別がつかない。敵は主人公へ集まるので、近い順に潰すとずっと主人公の隣に立つ
    //     （[[自分のキル圏の内側を判定に使う仕組みは成立しない]]と同じ形）。
    //   2回目「毎フレーム最も遠い敵を選び直す」→ **消滅が53体→8体へ激減**。新しく湧いた敵が
    //     常に最遠になるので標的が飛び続け、往復するだけで一度も間合いに入れなかった。
    //   → 3回目＝**遠い敵を選び、決めたらロックして仕留めるまで追う**。
    const rng2 = L.huntRange * L.huntRange;
    let best = null;
    if (o.lnTargetId != null) {
      for (const e of run.enemies) {
        if (e.id !== o.lnTargetId) continue;
        const hx = e.x - px, hy = e.y - py;
        if (e.active && !e.stag && !e.isBoss && hx * hx + hy * hy <= rng2) best = e;
        break;
      }
    }
    if (!best) {
      let bestFar = -1;
      for (const e of run.enemies) {
        if (!e.active || e.stag || e.isBoss) continue;
        const hx = e.x - px, hy = e.y - py;
        const hd2 = hx * hx + hy * hy;
        if (hd2 > rng2) continue;
        if (hd2 > bestFar) { bestFar = hd2; best = e; }
      }
      o.lnTargetId = best ? best.id : null;
    }
    o.lnThrust = Math.max(0, (o.lnThrust || 0) - dt);
    if (!best) {
      // 獲物なし：主人公のずっと前を歩いて次を探す（棒立ちにしない）。
      // 半径は狩りの上限の 0.72 倍＝公転(48px)とはっきり違う位置に居続ける
      const a = run.elapsed * 1.1;
      const rr = L.huntRange * 0.72;
      const tx = px + Math.cos(a) * rr, ty = py + Math.sin(a) * rr;
      const dx = tx - o.x, dy = ty - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, (L.moveSpeed * 0.7 * dt) / d);
      o.x += dx * k; o.y += dy * k;
      lancerStandoff(o, px, py, L);
      o.lnAim = Math.atan2(dy, dx);
      return;
    }
    const dx = best.x - o.x, dy = best.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    o.lnAim = Math.atan2(dy, dx);
    const reach = L.reach + best.radius;
    if (d > reach) {
      const k = Math.min(1, (L.moveSpeed * dt) / d);
      o.x += dx * k; o.y += dy * k;
    }
    // ★立ち位置を 70〜150px の帯に閉じ込める。外側は画面内保証（単独行動の唯一の鎖）、
    //   内側は「主人公の周りには入らない」＝前線を守る役に徹する。
    lancerStandoff(o, px, py, L);
    if (d > reach) return;
    // 間合いの中：突く
    o.lnAtkT = (o.lnAtkT || 0) - dt;
    if (o.lnAtkT > 0) return;
    o.lnAtkT = L.thrustSec;
    o.lnThrust = 0.2;
    const dmg = memberDamage(o);
    const alive = best.active;
    run.dealDamage(best, dmg, LANCE_GLOW, 'lagon');
    if (alive && !best.active) {
      // ★消滅させた。突きの音とは別物を鳴らす＝**数えられる**ようにする。
      o.lnSlain = (o.lnSlain || 0) + 1;
      Sound.sfx('lanceSlay');
      run.spawnParticles(best.x, best.y, LANCE_GLOW, 10);
    } else {
      Sound.sfx('lanceThrust');
    }
  }

  // 光の槍の描画。★芯（白・細）＋グロー（青・太）の2枚重ねで発光体にする。
  //   突きの瞬間だけ前へ伸びる＝「刺した」が形で分かる。
  function updateLanceVisual(o) {
    if (!o.weaponSpr) return;
    if (!o.lanceGlow) {
      o.lanceGlow = run.add.image(0, 0, 'w_lance_glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(11).setTint(LANCE_GLOW);
    }
    const blade = o.lnBlade == null ? 1 : o.lnBlade;
    if (blade <= 0.02) {
      // しまわれている（帰り道と休憩中）。柄は本体の手に隠れるので何も描かない
      o.weaponSpr.setVisible(false);
      o.lanceGlow.setVisible(false);
      return;
    }
    const ang = o.lnAim || 0;
    const push = (o.lnThrust || 0) > 0 ? 12 * ((o.lnThrust || 0) / 0.2) : 0;
    const bodyR = (o.spr.displayWidth * 0.5) || 24;
    // ★握りの位置＝体の外。⚠️ 最初は中心（bodyR*0.5）に置いて origin も中央だったので、
    //   実プレイの等倍で見ると**槍が体を横切り、半分が背中へ突き抜けていた**
    //   （[[feedback_pixel_art_judge_at_play_zoom]]で撮って気づいた）。
    //   origin を柄側（0.5, 0.86）にすると、そこが手の位置になって刃だけが前へ伸びる。
    // +bodyR*0.22 は「手の高さ」。顔の真横から生えていると槍を担いでいるように見えない
    const cx = o.x + Math.cos(ang) * (bodyR * 0.62 + push);
    const cy = o.y + (o.lnBreath || 0) + bodyR * 0.22 + Math.sin(ang) * (bodyR * 0.62 + push);
    const len = A.LANCER.reach * 2.0 * blade;   // 点火・格納は「長さ」で見せる
    const rot = ang + Math.PI / 2;   // テクスチャは穂先が上向き
    o.weaponSpr.setTexture('w_lance').setTint(0xffffff).setOrigin(0.5, 0.86)
      .setPosition(cx, cy).setRotation(rot)
      .setDisplaySize(5, len).setAlpha(0.85).setVisible(true)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    const pulse = 1 + Math.sin(run.elapsed * 16) * 0.06;
    o.lanceGlow.setOrigin(0.5, 0.86).setPosition(cx, cy).setRotation(rot)
      .setDisplaySize(12 * pulse, len * 1.03)
      .setAlpha((0.5 + (o.lnThrust > 0 ? 0.28 : 0)) * blade).setVisible(true);
  }

  // R22: 回復モビット（マシュモ）。実プレイFB「体力を少しずつ回復してくれるモビットをいれて」。
  // 唯一、敵に一切触れないアーキタイプ。run.dealDamage を呼ばないので、
  // 「仲間はとどめを刺せない」というビリヤード攻撃の設計の関門とは無関係に成立する。
  function updateHeal(o, dt) {
    // 回復の光の帯（モビット→主人公）。誰が回復してくれているのかを線で見せる。
    // ⚠️ これが無いと、数字だけ増えて「なぜ回復したのか」が分からない＝入れた意味が伝わらない。
    if (o.healFx && o.healFxT > 0) {
      o.healFxT -= dt;
      const k = Math.max(0, o.healFxT / HEAL_FX_SEC);
      const p0 = run.player;
      const ang = Math.atan2(p0.y - o.y, p0.x - o.x);
      const d = Math.hypot(p0.x - o.x, p0.y - o.y);
      o.healFx.setPosition(o.x, o.y).setRotation(ang)
        .setDisplaySize(d, 2 + 4 * k).setAlpha(0.8 * k).setVisible(k > 0);
    }

    o.healT -= dt;
    if (o.healT > 0) return;
    o.healT = o.healSec;

    const p = run.player;
    if (!p || run.ended) return;
    if (!o.healFx) {
      o.healFx = run.add.image(0, 0, 'white').setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setTint(0x7dff8f);
    }
    o.healFxT = HEAL_FX_SEC;
    run.spawnParticles(o.x, o.y, 0x7dff8f, 6);
    // 満タンのときは回復しない。光だけ出して「働いてはいる」ことは見せる（無音・無表示だと壊れて見える）
    if (p.hp >= p.maxHp) return;
    // 端数は持ち越して、実際に回す量を整数にそろえる。
    // 「2.8回復したのに +3 と出す」ような表示と実態のズレを作らないため（子どもが読む数字なので嘘をつかない）。
    o.healCarry = (o.healCarry || 0) + o.healAmount;
    const give = Math.floor(o.healCarry);
    if (give <= 0) return;
    o.healCarry -= give;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + give);
    const got = Math.round(p.hp - before);
    if (got > 0) run.floatText(p.x, p.y - 34, '+' + got + ' HP', '#7dff8f');   // ジェル回復(-28)と高さを分ける
    Sound.sfx('healTick');
  }

  function updateSlash(o, dt) {
    const hitR = o.hitRadius;
    const dmg = memberDamage(o);
    for (const e of run.enemies) {
      if (!e.active || e.stag) continue;   // R21W2: よろけは仲間の標的外
      const rr = hitR + e.radius;
      const dx = e.x - o.x, dy = e.y - o.y;
      if (dx * dx + dy * dy <= rr * rr) {
        const last = o.slash.get(e.id);
        if (last == null || run.elapsed - last >= o.slashTick) {
          o.slash.set(e.id, run.elapsed);
          run.dealDamage(e, dmg, ALLY_ATK, 'ally');
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
      if (!e.active || e.stag) continue;   // R21W2: よろけは仲間の標的外
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
        ALLY_ATK, dmg, o.bulletRadius, tex);
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
      ALLY_ATK, memberDamage(o));
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
      if (!e.active || e.stag) continue;   // R21W2: よろけは仲間の標的外
      const dx = e.x - px, dy = e.y - py;
      const rr = R + e.radius;
      if (dx * dx + dy * dy <= rr * rr) {
        e.slowMark = run.elapsed;      // 移動側が参照して減速
        if (doTick) {
          run.dealDamage(e, o.fieldTick, ALLY_ATK, 'ally');
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
        if (!e.active || e.stag) continue;   // R21W2: よろけは仲間の標的外
        const dx = e.x - o.x, dy = e.y - o.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) return;
      o.boomT = o.boomInterval;
      const ang = Math.atan2(best.y - o.y, best.x - o.x);
      const btex = (o.form && run.textures.exists(o.form.tex)) ? o.form.tex : 'w_cookie';
      const spr = run.add.image(o.x, o.y, btex).setDepth(12).setTint(ALLY_ATK);
      const glow = run.add.image(o.x, o.y, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setTint(ALLY_ATK).setScale(0.7);
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
      if (!e.active || e.stag) continue;   // R21W2: よろけは仲間の標的外
      const rr = hr + e.radius;
      const ex = e.x - b.x, ey = e.y - b.y;
      if (ex * ex + ey * ey <= rr * rr) {
        const last = b.hit.get(e.id);
        if (last == null || run.elapsed - last >= o.boomTick) {
          b.hit.set(e.id, run.elapsed);
          run.dealDamage(e, dmg, ALLY_ATK, 'ally');
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
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(10).setTint(ALLY_ATK);
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
        if (!e.active || e.stag || g.hitSet.has(e.id)) continue;   // R21W2: よろけは仲間の標的外
        const dx = e.x - g.cx, dy = e.y - g.cy;
        const d = Math.hypot(dx, dy);
        if (Math.abs(d - g.r) <= halfT + e.radius) {
          g.hitSet.add(e.id);
          run.dealDamage(e, dmg, ALLY_ATK, 'ally');
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
    // ★R45 ネムッコの「💤」。FB は絵文字で指定されたが、**絵文字はフォント依存**で
    //   Chrome のヘッドレスでは豆腐になり（実測：灰色の四角が1つ出ただけ）、私が
    //   表示を検証できない。子どものPCで同じことが起きても気づけない。
    //   そこで 💤 の形（右上へ小さくなっていく Z が3つ）を**ドット絵で描く**。
    //   ドット絵のゲームに絵文字が1つだけ混ざる違和感も同時に消える。
    if (!run.textures.exists('deco_zzz')) {
      const g = G(); const s = 24;
      g.fillStyle(0xffffff, 1);
      // 大・中・小の Z を右上へ階段状に。Z は 上バー／斜め／下バー の3本で描く
      const zed = (x, y, w, t) => {
        g.fillRect(x, y, w, t);                       // 上のバー
        g.fillRect(x, y + w - t, w, t);               // 下のバー
        for (let i = 0; i < w; i++) {                 // 斜め（1ドットずつ置いて階段に）
          g.fillRect(x + w - t - i * ((w - t) / (w - 1)), y + i * ((w - t) / (w - 1)), t, t);
        }
      };
      zed(1, 13, 10, 2);
      zed(11, 6, 7, 2);
      zed(17, 1, 5, 1);
      g.generateTexture('deco_zzz', s, s); g.destroy();
    }
    star('deco_sat', 16, 5, 7.5, 3.2);    // ぷっくり5点の衛星星
    star('deco_spark', 14, 4, 6.5, 2.0);  // 4点きらきら
    star('deco_halo', 80, 16, 39, 12);    // 16条のサンバースト後光

    if (!run.textures.exists('deco_heart')) {
      // キラ結晶（多面カットの菱形クリスタル）— 回復ハート(桃・丸み)と形も色も明確に別物にする
      const g = G(); const s = 22;
      g.fillStyle(0xffffff, 1);
      g.fillPoints([
        P(s * 0.50, s * 0.03),   // 上の頂点
        P(s * 0.80, s * 0.28),   // 右肩
        P(s * 0.72, s * 0.62),   // 右腹
        P(s * 0.50, s * 0.97),   // 下の頂点
        P(s * 0.28, s * 0.62),   // 左腹
        P(s * 0.20, s * 0.28),   // 左肩
      ], true);
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
    // キラ結晶（衛星星の外側を逆回転・シアン）
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
        case 'heart': {   // キラ結晶：外周を逆回転。固定シアン（回復ハートの桃と混同しない）
          const a = -t * 1.6 + (d.idx / d.n) * Math.PI * 2 + Math.PI / 4;
          const orbR = bodyR * 1.75;
          d.setPosition(o.x + Math.cos(a) * orbR, o.y + Math.sin(a) * orbR);
          const sc = (bodyR * 0.6 * d.baseScale) / 22;
          d.setScale(sc * (1 + Math.sin(t * 5 + d.idx * 2) * 0.15));
          d.rotation += dt * 3;                              // 結晶をゆっくり自転させてキラッと
          const tw = 0.5 + 0.5 * Math.sin(t * 5 + d.idx * 2);// シアン(0x36e0ff)→白コアへ明滅
          const cr = 0x36 + Math.round((0xd8 - 0x36) * tw);
          const cg = 0xe0 + Math.round((0xff - 0xe0) * tw);
          d.setTint((cr << 16) | (cg << 8) | 0xff);
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
    // ★R47 ラゴンの槍は「振る」のではなく「狙って突く」ので専用の追従にする
    if (o.archetype === 'LANCER') { updateLanceVisual(o); return; }
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
      if (o.zzz) o.zzz.destroy();
      if (o.lanceGlow) o.lanceGlow.destroy();
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
    // 検証用（R22）：回復モビットが実際に働いているかを外から観測するため。書き換え用ではない。
    get orbs() { return orbs; },
    // 検証用（R46）：弾配り役の在庫。★軌道神核で0発になっていないかを外から測る。
    debugAmmo() {
      const o = orbs.find((x) => x.archetype === 'AMMO');
      if (!o) return null;
      return { stock: o.ammoStock, t: +(o.ammoT || 0).toFixed(1),
               bossId: o.ammoBossId, trueDone: !!o.ammoTrueDone };
    },
    // 検証用（R45）：ネムッコの寝姿・💤・覚醒を外から測る。
    // ⚠️ 「寝ている」は絵でしか確認できないので、絵を決めている値そのものを返す
    //    （回転・沈み・テクスチャ）＝スクショの目視と数値の両方で判定できるようにする。
    debugSleepy() {
      const o = orbs.find((x) => x.archetype === 'SLEEPY');
      if (!o) return null;
      return { zzz: !!(o.zzz && o.zzz.visible), rot: +o.spr.rotation.toFixed(3),
               sy: +(o.spr.y - o.y).toFixed(1), sx: +o.spr.scaleX.toFixed(2),
               scy: +o.spr.scaleY.toFixed(2), tex: o.spr.texture.key,
               awake: !!o.slAwake, fired: o.slFired || 0 };
    },
    // 検証用（R47）：ラゴンの単独行動を外から測る。
    // ⚠️ 「離れて戦っている」は距離でしか確かめられない（画面を見て「離れて見える」で
    //    済ませると、公転半径48px と 60px の区別がつかないまま実装が終わる）。
    debugLancer() {
      const o = orbs.find((x) => x.archetype === 'LANCER');
      if (!o) return null;
      const p = run.player;
      return { state: o.lnState, dist: +Math.hypot(o.x - p.x, o.y - p.y).toFixed(1),
               slain: o.lnSlain || 0, breath: +(o.lnBreath || 0).toFixed(1),
               thrust: +(o.lnThrust || 0).toFixed(2), t: +(o.lnT || 0).toFixed(1),
               blade: +(o.lnBlade || 0).toFixed(2), sally: !!o.lnSally,
               scale: +o.spr.scaleX.toFixed(2) };
    },
    get weaponLevel() { return weaponLevel; },
    // R4: HUD 用。全なかま共通 weaponLevel なので先頭 orb の現フォームを代表として返す。
    // orb がまだ無い場合でも band から kind を算出して返す（表示が空にならないように）。
    get currentForm() {
      if (orbs.length && orbs[0].form) return orbs[0].form;
      const idx = formIndexFor(0, run.elapsed);
      return { kind: idx === 0 ? 'melee' : 'ranged', name: '' };
    },
  };
}
