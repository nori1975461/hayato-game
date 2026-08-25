// systems/items.js — どうくつ（洞窟）＋たからばこ（宝箱）と、やしろ（R23）。
// 60s/180s に洞窟が1個ずつ出現。lifeSec で消滅（残5sで点滅）。触れると宝箱が開き重み抽選で報酬。
// 洞窟/宝箱の見た目は既存テクスチャ（glow/core/white）から合成する（Boot.js は専用テクスチャを持たない）。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

export function createItems(run) {
  const C = BALANCE.cave;
  const S = BALANCE.shrine;
  const spawnFired = C.times.map(() => false);
  const shrineFired = S.times.map(() => false);
  let cave = null;     // { x, y, life, glow, spr, label }
  let shrine = null;   // { x, y, life, parts[], label }

  function spawnCave() {
    const ang = run.rng.range(0, Math.PI * 2);
    const d = run.rng.range(C.minDist, C.maxDist);
    const x = run.player.x + Math.cos(ang) * d;
    const y = run.player.y + Math.sin(ang) * d;

    // R19: 旧色は #ffd23f/#ffe066＝主人公の金と同一だった。金は「味方の攻撃」に統一したので、
    //   どうくつは近い色相のライラックへ逃がす（最小ΔE 30.9／明側 25.9・全画面色に対して検算済み）。
    const glow = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(6)
      .setTint(0xffb0e8).setScale(3);
    const spr = run.add.image(x, y, 'core').setDepth(12).setTint(0xffc9ee).setScale(2.4);
    const label = run.add.text(x, y - 26, 'どうくつ', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffc9ee',
      stroke: '#1b1030', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(13);

    cave = { x, y, life: C.lifeSec, glow, spr, label };

    Sound.sfx('altar');
    if (run.fx && run.fx.announce) run.fx.announce('どうくつが あらわれた！', '#ffc9ee');
    if (run.fx && run.fx.setTarget) run.fx.setTarget('cave', x, y, { color: 0xffb0e8, label: 'どうくつ' });
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

  // ★R32 報酬の適用。どうくつは「取った瞬間に画面が変わる」ものだけを配る。
  //   旧版は damageMult や coins のような**画面に何も出ない数字**を配っていて、
  //   実プレイFBで「あまり意味がない」と言われた。ここでは全種類に必ず見える変化を付ける。
  function applyReward(r) {
    const CB = C.buffs, cfg = CB[r.buff] || {};
    const px = run.player.x, py = run.player.y;

    switch (r.buff) {
      case 'suna':
        // こうしえんの すな：次の1投が渾身の一撃。秒ではなく**回数**で持つ（投げるまで消えない）。
        run.sunaShots += cfg.shots;
        break;
      case 'clock':
        run.addBuff('clock', cfg.sec);
        break;
      case 'star':
        run.addBuff('star', cfg.sec);
        run.player.invuln = Math.max(run.player.invuln || 0, cfg.sec);
        break;
      case 'gold':
      case 'big':
      case 'mini':
      case 'machine':
        run.addBuff(r.buff, cfg.sec);
        break;
      case 'whistle': {
        // 即時。画面じゅうの雑魚を一斉によろけさせる＝弾が一気に手に入る。
        let n = 0;
        for (const e of run.enemies) {
          if (!e.active || e.isBoss || e.stag) continue;
          const dx = e.x - px, dy = e.y - py;
          if (dx * dx + dy * dy > cfg.radius * cfg.radius) continue;
          e.hp = 1; run.enterStagger(e);
          run.spawnParticles(e.x, e.y, cfg.tint, 8);
          n++;
        }
        run.floatText(px, py - 56, n + 'たい よろけた！', '#9fe8ff');
        break;
      }
      case 'heal':
        run.player.maxHp += cfg.maxHpAdd;
        run.player.hp = run.player.maxHp;
        run.addBuff('heal', cfg.sec);
        run.player.invuln = Math.max(run.player.invuln || 0, cfg.sec);
        break;
      default:
        break;
    }

    // ---- 取った瞬間の演出。レアは尺も振幅も別格にする（頻度6.25%なので振り切ってよい）----
    const tint = cfg.tint || 0xffc9ee;
    if (r.rare) {
      Sound.sfx('rareGet');
      run.shake(360, 10);
      if (run.fx && run.fx.powerupFlash) run.fx.powerupFlash(tint);
      run.slowMotion(0.5, 0.35);
      for (let i = 0; i < 3; i++) {
        run.time.delayedCall(i * 110, () => {
          if (run.billiard && run.billiard.shockRing) {
            run.billiard.shockRing(run.player.x, run.player.y, 150 + i * 60, i % 2 ? 0xffffff : tint);
          }
        });
      }
      run.spawnParticles(px, py, tint, 34);
      run.spawnParticles(px, py, 0xffffff, 20);
    } else {
      Sound.sfx('powerup');
      run.shake(150, 4);
      if (run.fx && run.fx.powerupFlash) run.fx.powerupFlash(tint);
      if (run.billiard && run.billiard.shockRing) run.billiard.shockRing(px, py, 120, tint);
      run.spawnParticles(px, py, tint, 20);
    }
    const color = '#' + tint.toString(16).padStart(6, '0');
    run.floatText(px, py - 34, r.label + '！', color);
    // ★2行で出す。名前だけだと何が起きたのか分からない（旧版の「意味がない」の一因）。
    if (run.fx && run.fx.announce) {
      run.fx.announce((r.rare ? '★レア★ ' : '') + r.label + ' ゲット！', color);
      run.time.delayedCall(420, () => {
        if (run.fx && run.fx.announce) run.fx.announce(r.get, color);
      });
    }
  }

  function openChest() {
    const x = cave.x, y = cave.y;
    closeCave();

    Sound.sfx('chest');
    run.shake(120, 3);
    run.spawnParticles(x, y, 0xffb0e8, 24);

    // たからばこがポップして弾ける演出
    const chest = run.add.image(x, y, 'core').setDepth(1300).setTint(0xffc9ee).setScale(0.1);
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
    updateShrine(dt);
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

  // ============ やしろ（R23・3つ目の場所）============
  // どうくつ＝1個のランダム報酬／さいだん＝モビット合体／やしろ＝**3つの能力が同時に上がる**。
  // 鳥居の形（柱2本＋横木2本）で作る。トップダウンの小さな画面でも、この輪郭は一目で「やしろ」と読める。
  function spawnShrine() {
    const ang = run.rng.range(0, Math.PI * 2);
    const d = run.rng.range(S.minDist, S.maxDist);
    const x = run.player.x + Math.cos(ang) * d;
    const y = run.player.y + Math.sin(ang) * d;

    const bar = (dx, dy, w, h, tint, depth) => run.add.image(x + dx, y + dy, 'white')
      .setDepth(depth).setTint(tint).setDisplaySize(w, h);
    const parts = [
      run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(6).setTint(S.tint).setScale(3.2),
      bar(0, -18, 44, 5, S.tint, 12),    // 笠木（いちばん上の横木）
      bar(0, -10, 34, 4, S.tint, 12),    // 貫（2本目の横木）
      bar(-13, 0, 5, 30, S.tint, 12),    // 左の柱
      bar(13, 0, 5, 30, S.tint, 12),     // 右の柱
      run.add.image(x, y - 4, 'core').setBlendMode(ADD).setDepth(13)
        .setTint(S.label).setScale(1.1).setAlpha(0.9),
    ];
    const label = run.add.text(x, y - 34, 'やしろ', {
      fontFamily: 'monospace', fontSize: '11px', color: '#e8d9ff',
      stroke: '#241040', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(13);

    shrine = { x, y, life: S.lifeSec, parts, label };
    Sound.sfx('altarFanfare');
    if (run.fx && run.fx.announce) run.fx.announce('やしろが あらわれた！', '#e8d9ff');
    if (run.fx && run.fx.setTarget) run.fx.setTarget('shrine', x, y, { color: S.tint, label: 'やしろ' });
  }

  function closeShrine() {
    if (!shrine) return;
    for (const p of shrine.parts) p.destroy();
    shrine.label.destroy();
    if (run.fx && run.fx.clearTarget) run.fx.clearTarget('shrine');
    shrine = null;
  }

  function prayShrine() {
    const x = shrine.x, y = shrine.y;
    closeShrine();

    run.stats.damageMult += S.attackAdd;
    // R24: 主人公側（投げ・突き）にも同じだけ乗せる。damageMult は「なかまの攻撃」専用なので、
    // これが無いと「攻撃力アップ」の御利益が看板の動詞にまったく効かない。
    run.stats.heroMult += S.attackAdd;
    run.stats.moveMult += S.speedAdd;
    // 防御は「被ダメージを何割減らすか」で持つ。加算にすると重ねがけでいずれ0になるので上限を置く。
    run.stats.defenseCut = Math.min(S.defenseCap, (run.stats.defenseCut || 0) + S.defenseAdd);

    Sound.sfx('powerup');
    run.shake(150, 4);
    run.spawnParticles(x, y, S.tint, 30);
    // 主人公から光の柱が立つ＝「授かった」を体で見せる
    const pillar = run.add.image(run.player.x, run.player.y - 26, 'white').setBlendMode(ADD)
      .setDepth(1300).setTint(S.label).setDisplaySize(14, 4).setAlpha(0.95);
    run.tweens.add({ targets: pillar, displayHeight: 120, alpha: 0, duration: 520,
      ease: 'Cubic.Out', onComplete: () => pillar.destroy() });
    run.floatText(run.player.x, run.player.y - 40, 'こうげき・ぼうぎょ・スピード ＋20%！', '#e8d9ff');
    if (run.fx && run.fx.announce) run.fx.announce('やしろの ごりやく！ すべてが つよくなった！', '#e8d9ff');
    if (run.fx && run.fx.powerupFlash) run.fx.powerupFlash(null);
  }

  function updateShrine(dt) {
    for (let i = 0; i < S.times.length; i++) {
      if (!shrineFired[i] && run.elapsed >= S.times[i]) {
        shrineFired[i] = true;
        if (!shrine) spawnShrine();     // 同時には1個だけ
      }
    }
    if (!shrine) return;

    shrine.life -= dt;
    shrine.parts[0].setScale(3.0 + Math.sin(run.elapsed * 3) * 0.4);
    shrine.parts[5].setAlpha(0.6 + 0.35 * Math.sin(run.elapsed * 5));

    if (shrine.life <= 5) {             // 残り5秒で点滅（どうくつと同じ作法）
      const on = Math.floor(shrine.life * 6) % 2 === 0;
      for (const p of shrine.parts) p.setVisible(on);
      shrine.label.setVisible(on);
    }

    const dx = run.player.x - shrine.x, dy = run.player.y - shrine.y;
    if (dx * dx + dy * dy <= S.touchRadius * S.touchRadius) prayShrine();
    else if (shrine.life <= 0) closeShrine();
  }

  function destroy() {
    closeCave();
    closeShrine();
  }

  return {
    update, destroy,
    get caveCount() { return cave ? 1 : 0; },
    get shrineCount() { return shrine ? 1 : 0; },
    // 検証用（R32）：どうくつの報酬を id 名指しで発動させる。抽選を待つと9種を測れないため。
    // ⚠️ 適用経路は本編とまったく同じ applyReward を通す（別経路を作ると測ったものが本編と違う）。
    giveReward(id) {
      const r = C.rewards.find((x) => x.id === id);
      if (!r) return false;
      applyReward(r);
      return true;
    },
  };
}
