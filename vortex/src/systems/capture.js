// systems/capture.js — スターコアのドロップ/拾得と合成祭壇（PROTOTYPE_SPEC §3.4 / §4.4）。
import { BALANCE } from '../data/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);

const N_MONS = MONSTERS.filter((m) => m.rarity === 'N');
const R_MONS = MONSTERS.filter((m) => m.rarity === 'R');
const SR_MONS = MONSTERS.filter((m) => m.rarity === 'SR');
const NtoR = MONSTERS.filter((m) => m.id === 'samet' || m.id === 'neonworm');

export function createCapture(run) {
  const C = BALANCE.capture;
  const cores = [];
  let altar = null;
  // Wave R2: 祭壇は複数回（appearSecs）出現。各時刻の発火済みフラグをインデックスで持つ
  const altarFired = BALANCE.altar.appearSecs.map(() => false);
  let msg = null;         // 「あと◯たい ひつよう」表示
  let msgT = 0;
  let boltCoreGiven = false;   // R23: ビリッコのコアを配ったか（1ランに1回）

  // Wave R2: 経過時間で解禁される現在の公転スロット数（spawner.currentCap と同型）。
  // slotSchedule を走査し、maxSlots を絶対上限としてクランプする。
  function currentSlots() {
    let slots = BALANCE.orbit.maxSlots;
    for (const s of BALANCE.orbit.slotSchedule) {
      if (run.elapsed < s.untilSec) { slots = s.slots; break; }
    }
    return Math.min(slots, BALANCE.orbit.maxSlots);
  }

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

  // どうくつ報酬などから任意レアリティのコアを落とす（§10.6・items.js から呼ぶ）
  function dropCoreAt(x, y, rarity) {
    const pool = rarity === 'SR' ? SR_MONS : rarity === 'R' ? R_MONS : N_MONS;
    makeCore(x, y, run.rng.pick(pool));
  }

  // ★R33 弾配り役（AMMO）だけの特別枠。戦う仲間は今までどおり最大3人。
  //   AMMO は敵にダメージを一切与えないので「公転仲間は最大3人（火力過多の回帰防止）」の
  //   趣旨には触れない。ここが無いと、開始時点で満杯のパーティに弾配り役は永久に入れない。
  function canJoin(def) {
    if (run.party.length < currentSlots()) return true;
    if (!def || def.archetype !== 'AMMO') return false;
    if (run.party.some((p) => p.def && p.def.archetype === 'AMMO')) return false;  // 1体だけ
    const extra = BALANCE.orbit.ammoExtraSlots || 0;
    return run.party.length < currentSlots() + extra;
  }

  function pickupCore(core) {
    if (canJoin(core.def)) {
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

  // R23: らいこうだんの出処であるビリッコを、1ランに1回だけ必ず配る。
  // 実プレイFB由来の切り札（ボス戦の雷光弾）が、コア抽選の運で一度も見られないのは
  // 「入れていない」のと同じなので、抽選には委ねない。
  // ⚠️ 配る時刻は**3枠目が開く瞬間**にしてある。手持ちの攻撃役を降ろさずに載せられる唯一のタイミング。
  function ensureBoltMobit() {
    if (boltCoreGiven) return;
    // ★R33 旧実装は「3枠目が開く180秒」に配っていたが、開いた瞬間に落ちている通常コアが
    //   先に入って枠が埋まり、ビリッコのコアは10秒で消えてコインに化けていた（実測で確認）。
    //   ammoExtraSlots（弾配り役の特別枠）で取り合いが消えたので、1体目のボスに間に合わせる。
    const gate = C.ammoCoreSec == null ? 180 : C.ammoCoreSec;
    if (run.elapsed < gate) return;
    boltCoreGiven = true;
    if (run.party.some((pt) => pt.def && pt.def.id === 'biricco')) return;   // もう持っている
    const def = MONSTERS.find((m) => m.id === 'biricco');
    if (!def) return;
    makeCore(run.player.x + 26, run.player.y - 18, def);
    Sound.sfx('draftReady');
    if (run.fx && run.fx.announce) run.fx.announce('ビリッコ の コア！ ボスに きく らしい', '#ffe14d');
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
      .setBlendMode(ADD).setDepth(4)
      .setTint(0xff6ec7).setScale(3.5);
    // 下から一気に立ち上がる太い光柱（14×120・ADD）を成長トゥイーンで出す
    const pillar = run.add.image(x, y + 44, 'white')
      .setBlendMode(ADD).setDepth(3)
      .setTint(0xff9ee0).setOrigin(0.5, 1).setDisplaySize(14, 4).setAlpha(0.9);
    run.tweens.add({ targets: pillar, displayHeight: 120, duration: 260, ease: 'Cubic.out' });
    // 白い芯の細い光柱を重ねて中心を白熱させる
    const pillar2 = run.add.image(x, y + 44, 'white')
      .setBlendMode(ADD).setDepth(3)
      .setTint(0xffffff).setOrigin(0.5, 1).setDisplaySize(5, 4).setAlpha(0.85);
    run.tweens.add({ targets: pillar2, displayHeight: 96, duration: 260, ease: 'Cubic.out' });
    // 常時ゆっくり逆回転する二重の光輪（華やかさを持続させる後光。回転は updateAltar 側）
    const ring1 = run.add.image(x, y, 'w_ring')
      .setBlendMode(ADD).setDepth(5).setTint(0xffd23f).setScale(1.6).setAlpha(0.85);
    const ring2 = run.add.image(x, y, 'w_ring')
      .setBlendMode(ADD).setDepth(5).setTint(0x7fd8ff).setScale(2.3).setAlpha(0.55);
    const spr = run.add.image(x, y, 'core').setDepth(12)
      .setTint(0xffffff).setScale(3.2);
    const label = run.add.text(x, y - 30, 'ごうせいの さいだん', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffd6f0',
    }).setOrigin(0.5).setDepth(13);
    altar = { x, y, glow, spr, label, pillar, pillar2, rings: [ring1, ring2] };
    Sound.sfx('altarFanfare');

    // 登場バースト：放射する光条＋広がるリング波＋立ち上るきらめき＋粒子で祝祭感を出す
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const ray = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(5)
        .setTint(i % 2 ? 0xffd23f : 0xff9ee0).setOrigin(0, 0.5).setRotation(ang)
        .setDisplaySize(6, 3).setAlpha(0.9);
      run.tweens.add({
        targets: ray, displayWidth: run.rng.range(46, 66), alpha: 0,
        duration: run.rng.range(420, 620), ease: 'Cubic.out',
        onComplete: () => ray.destroy(),
      });
    }
    for (let k = 0; k < 3; k++) {
      run.time.delayedCall(k * 110, () => {
        const wave = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(4)
          .setTint(k % 2 ? 0xffd23f : 0xff9ee0).setScale(0.6).setAlpha(0.8);
        run.tweens.add({
          targets: wave, scale: 5.5, alpha: 0, duration: 560, ease: 'Cubic.out',
          onComplete: () => wave.destroy(),
        });
      });
    }
    for (let s = 0; s < 14; s++) {
      const star = run.add.image(x + run.rng.range(-22, 22), y + 30, 'w_star2')
        .setBlendMode(ADD).setDepth(6)
        .setTint(run.rng.chance(0.5) ? 0xffd23f : 0xffffff)
        .setScale(run.rng.range(0.5, 1.1)).setAlpha(0.95);
      run.tweens.add({
        targets: star, y: y - run.rng.range(20, 70), alpha: 0, scale: 0.2,
        duration: run.rng.range(600, 1000), delay: run.rng.range(0, 200), ease: 'Cubic.out',
        onComplete: () => star.destroy(),
      });
    }
    run.spawnParticles(x, y, 0xff9ee0, 20);
    run.spawnParticles(x, y, 0xffd23f, 14);

    if (run.fx && run.fx.setTarget) {
      run.fx.setTarget('altar', x, y, { color: 0xff9ee0, label: 'さいだん' });
    }
    if (run.fx && run.fx.announce) {
      run.fx.announce('がったいの さいだんが あらわれた！', '#ff9ee0');
    }
    run.floatText(x, y + 26, 'さわって ごうせい！', '#ff6ec7');
  }

  function consumeAltar() {
    if (altar) {
      altar.glow.destroy();
      altar.spr.destroy();
      altar.label.destroy();
      if (altar.pillar) altar.pillar.destroy();
      if (altar.pillar2) altar.pillar2.destroy();
      if (altar.rings) altar.rings.forEach((r) => r.destroy());
      altar = null;
    }
    if (run.fx && run.fx.clearTarget) run.fx.clearTarget('altar');
  }

  // R23: 非戦闘の役どころ（回復＝マシュモ／弾薬＝ビリッコ）は合成の素材にしない。
  // 合成は素材2体を消して**上位のランダム1体**にするので、役割を持つ子を混ぜると
  // 「ボス戦の切り札を配る係が、勝手に別の攻撃役へ化けて消える」ことが起きる。
  // 実測（seed=42）：ビリッコが300秒あたりの合成で消え、ミサイルガとマオウレクスで
  // らいこうだんが1発も配られなかった。プレイヤーが選んだ役割は合成で奪わない。
  const NON_COMBAT = ['HEAL', 'AMMO'];

  // パーティ先頭から同レアリティ2体を選び上位へ合成
  function tryFuse() {
    const seen = {};
    let pair = null, resultPool = null;
    for (let i = 0; i < run.party.length; i++) {
      const d = run.party[i].def;
      const rar = d.rarity;
      if (rar === 'SR') continue;           // SR は素材にしない
      if (NON_COMBAT.includes(d.archetype)) continue;
      if (seen[rar] != null) {
        pair = [seen[rar], i];
        resultPool = rar === 'N' ? NtoR : SR_MONS;
        break;
      }
      seen[rar] = i;
    }
    if (!pair) return false;
    const def = run.rng.pick(resultPool);
    const defA = run.party[pair[0]].def;
    const defB = run.party[pair[1]].def;
    // 素材を除去（大きいインデックスから）
    run.party.splice(pair[1], 1);
    run.party.splice(pair[0], 1);
    run.party.push({ def, fused: true });
    run.orbit.rebuild();
    // 合成シネマティック（音・シェイク・粒子は fx 側が担当）
    if (run.fx && run.fx.fusionCinematic) {
      run.fx.fusionCinematic(defA, defB, def, () => {});
    } else {
      Sound.sfx('fusion');
      run.shake(120, 4);
      run.spawnParticles(run.player.x, run.player.y, int(def.color), 20);
      run.floatText(run.player.x, run.player.y - 20, def.name + ' たんじょう！', '#ff6ec7');
    }
    return true;
  }

  function updateAltar(dt) {
    // Wave R2: 祭壇は3回（appearSecs）出す。前の祭壇を使い切ってから次を出すので、
    // 合成素材が揃わず滞っても「3回のチャンス」は失われない（厳密な時刻より回数を優先）。
    if (!altar) {
      for (let i = 0; i < BALANCE.altar.appearSecs.length; i++) {
        if (!altarFired[i]) {
          if (run.elapsed >= BALANCE.altar.appearSecs[i]) {
            altarFired[i] = true;
            spawnAltar();
          }
          break;   // 最も早い未消費の時刻だけを対象にする（順番に発火・回を飛ばさない）
        }
      }
    }
    if (!altar) return;
    altar.spr.rotation += dt * 1.5;
    altar.glow.setScale(3.3 + Math.sin(run.elapsed * 3) * 0.3);
    if (altar.rings) {
      const p = 1 + Math.sin(run.elapsed * 4) * 0.12;
      altar.rings[0].rotation += dt * 0.8;
      altar.rings[0].setScale(1.6 * p);
      altar.rings[1].rotation -= dt * 0.5;
      altar.rings[1].setScale(2.3 * p);
    }
    const dx = run.player.x - altar.x, dy = run.player.y - altar.y;
    if (dx * dx + dy * dy <= 26 * 26) {
      if (run.party.length >= BALANCE.altar.minParty) {
        if (tryFuse()) {
          consumeAltar();
        } else {
          showMsg('おなじレアリティ2たいが ひつよう');
        }
      } else {
        const need = BALANCE.altar.minParty - run.party.length;
        showMsg('あと' + need + 'たい ひつよう');
      }
    }
  }

  function showMsg(text) {
    if (!msg) {
      msg = run.add.text(320, 252, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 6, y: 3 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1500);
    }
    msg.setText(text).setVisible(true);
    msgT = 1.2;
  }

  function update(dt) {
    ensureBoltMobit();
    updateCores(dt);
    updateAltar(dt);
    if (msg && msg.visible) {
      msgT -= dt;
      if (msgT <= 0) msg.setVisible(false);
    }
  }

  return {
    update, onEnemyKilled, forceDropCore, dropCoreAt,
    get coreCount() { return cores.length; },
    // 検証用（R22）：どのモビットのコアが落ちたかを外から観測するため。書き換え用ではない。
    get cores() { return cores; },
    // 検証用（Wave R2）: 現在の解禁スロット数・祭壇の発火済み回数・祭壇存在を観測できるようにする
    currentSlots,
    get altarFiredCount() { return altarFired.filter(Boolean).length; },
    get altarActive() { return !!altar; },
    get altarPos() { return altar ? { x: altar.x, y: altar.y } : null; },
  };
}
