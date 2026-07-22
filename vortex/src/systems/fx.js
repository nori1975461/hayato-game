// systems/fx.js — 演出専任モジュール（PROTOTYPE_SPEC §10.3 / §10.6-E,F / §10.7）。
// 契約: ゲームロジックへは書き込まない。例外として run.cinematic / run.freezeT のみ設定可。
// 乱数は run.rng（Math.random 禁止）。Phaser は window.Phaser のグローバル参照。
import { Sound } from '../audio/sound.js';
import { BALANCE } from '../data/balance.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

const colInt = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));
const colStr = (c) => (typeof c === 'string' ? c : '#' + (c & 0xffffff).toString(16).padStart(6, '0'));

// upgrade id → テーマ色（powerupFlash の粒子・ripple 色）
const THEME = {
  atk: 0xff6e6e, spin: 0x7fffcf, radius: 0x7fd8ff, move: 0xffe066,
  hp: 0x66ff88, catch: 0xffd23f, magnet: 0x66ccff,
};
function themeColor(up) {
  if (!up) return 0xffe066;
  if (String(up.id).indexOf('rainbow') === 0) return 0xffd23f;
  return THEME[up.id] || 0xffe066;
}

export function createFx(run) {
  const W = 640, H = 360;
  const targets = {};   // id → { wx, wy, color, arrow, text, phase }

  // ---- cinematic のトークン方式（多重シネマ対策・§10.6） ----
  // 複数のシネマが入れ子になっても「先に始まった側が終わった順に false」で
  // 踏み潰されないよう、最後に始めたシネマのトークンだけが解除できる。
  // 例: 必殺技でボスを倒すと specialBlast の中で bossVictory が始まる。
  //     specialBlast が先に終端しても、後発の bossVictory のトークンが有効な間は
  //     cinematic=false にせず、ボス撃破シネマ→endRun(true) を守る。
  let cineSeq = 0;
  function cineBegin() { run.cinematic = true; run._cineToken = ++cineSeq; return run._cineToken; }
  function cineEnd(token) { if (run._cineToken === token) run.cinematic = false; }

  // ---- 汎用ヘルパ ----
  function worldToScreen(wx, wy) {
    const cam = run.cameras.main;
    return { x: wx - cam.scrollX, y: wy - cam.scrollY };
  }

  // 画面座標（scrollFactor 0）の粒子バースト。暗幕より上のシネマ用（run.spawnParticles は
  // depth 13 固定で暗幕に隠れるため、演出専用にこちらを使う）。
  function burstUI(x, y, color, count, depth) {
    for (let i = 0; i < count; i++) {
      const ang = run.rng.range(0, Math.PI * 2);
      const sp = run.rng.range(60, 210);
      const p = run.add.image(x, y, 'spark').setScrollFactor(0).setDepth(depth)
        .setBlendMode(ADD).setTint(color).setScale(run.rng.range(0.8, 1.6));
      run.tweens.add({
        targets: p, x: x + Math.cos(ang) * sp, y: y + Math.sin(ang) * sp,
        alpha: 0, scale: 0.2, duration: run.rng.range(500, 900), ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  function ripple(x, y, color, scrollFactor) {
    const r = run.add.image(x, y, 'glow').setScrollFactor(scrollFactor == null ? 0 : scrollFactor)
      .setDepth(1900).setBlendMode(ADD).setTint(color).setScale(1).setAlpha(0.85);
    run.tweens.add({
      targets: r, scale: 14, alpha: 0, duration: 440, ease: 'Cubic.out',
      onComplete: () => r.destroy(),
    });
  }

  // 中心（画面座標）から放射状に伸びる光の筋。origin(0,0.5) で外側へ伸びる。
  // colorFn(i) で筋ごとに色を変えられる（色相の波用）。シネマ用に scrollFactor0。
  function radialStreaks(sx, sy, count, colorFn, len, depth, dur, baseAng) {
    for (let i = 0; i < count; i++) {
      const ang = (baseAng || 0) + (i / count) * Math.PI * 2 + run.rng.range(-0.12, 0.12);
      const col = typeof colorFn === 'function' ? colorFn(i) : colorFn;
      const st = run.add.image(sx, sy, 'white').setScrollFactor(0).setDepth(depth)
        .setBlendMode(ADD).setTint(col).setOrigin(0, 0.5).setRotation(ang)
        .setDisplaySize(8, run.rng.range(2.5, 5)).setAlpha(0.95);
      run.tweens.add({
        targets: st, displayWidth: len * run.rng.range(0.7, 1.2), alpha: 0,
        duration: dur * run.rng.range(0.8, 1.15), ease: 'Cubic.out',
        onComplete: () => st.destroy(),
      });
    }
  }

  // 外周から中心へ吸い込まれる集中線（渦の溜め演出）。画面座標・scrollFactor0。
  function convergeLines(sx, sy, count, color, dist, depth, dur) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + run.rng.range(-0.15, 0.15);
      const ox = sx + Math.cos(ang) * dist;
      const oy = sy + Math.sin(ang) * dist;
      const line = run.add.image(ox, oy, 'white').setScrollFactor(0).setDepth(depth)
        .setBlendMode(ADD).setTint(color).setOrigin(0.5).setRotation(ang)
        .setDisplaySize(dist * 0.55, 3).setAlpha(0);
      run.tweens.add({ targets: line, alpha: 0.85, duration: dur * 0.4 });
      run.tweens.add({
        targets: line, x: sx, y: sy, displayWidth: 4, alpha: 0,
        duration: dur, ease: 'Cubic.in', onComplete: () => line.destroy(),
      });
    }
  }

  // ---- 誘導矢印（祭壇・洞窟） ----
  function ensureArrow() {
    if (run.textures.exists('fxArrow')) return;
    const g = run.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(1, 1); g.lineTo(15, 8); g.lineTo(1, 15); g.closePath();
    g.fillPath();
    g.generateTexture('fxArrow', 16, 16);
    g.destroy();
  }

  function setTarget(id, x, y, opts) {
    opts = opts || {};
    ensureArrow();
    clearTarget(id);
    const color = opts.color != null ? colInt(opts.color) : 0xffe066;
    const arrow = run.add.image(W / 2, H / 2, 'fxArrow').setScrollFactor(0)
      .setDepth(1750).setBlendMode(ADD).setTint(color).setOrigin(0.5).setScale(1.5);
    let text = null;
    if (opts.label) {
      text = run.add.text(W / 2, H / 2, opts.label, {
        fontFamily: 'monospace', fontSize: '11px', color: colStr(color),
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1751);
    }
    targets[id] = { wx: x, wy: y, color, arrow, text, phase: 0 };
  }

  function clearTarget(id) {
    const t = targets[id];
    if (!t) return;
    if (t.arrow) t.arrow.destroy();
    if (t.text) t.text.destroy();
    delete targets[id];
  }

  function updateTargets(dt) {
    const margin = 18;
    for (const id in targets) {
      const t = targets[id];
      const s = worldToScreen(t.wx, t.wy);
      const ang = Math.atan2(s.y - H / 2, s.x - W / 2);
      const ax = Math.max(margin, Math.min(W - margin, s.x));
      const ay = Math.max(margin, Math.min(H - margin, s.y));
      t.phase += dt * 6;
      const pulse = 1.5 + Math.sin(t.phase) * 0.28;
      t.arrow.setPosition(ax, ay).setRotation(ang).setScale(pulse);
      if (t.text) t.text.setPosition(ax, ay - 18);
    }
  }

  // ---- レベルアップ決定演出（§10.7） ----
  function powerupFlash(up) {
    const color = themeColor(up);
    // 白フラッシュ（alpha 0.45→0・0.45超は禁止）
    const flash = run.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.45)
      .setScrollFactor(0).setDepth(2100);
    run.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
    // テーマ色の加算ウォッシュ＋二重リングで色をしっかり見せる（有色は上限なし）
    const wash = run.add.rectangle(W / 2, H / 2, W, H, color, 0.28)
      .setScrollFactor(0).setDepth(2099).setBlendMode(ADD);
    run.tweens.add({ targets: wash, alpha: 0, duration: 320, onComplete: () => wash.destroy() });
    ripple(W / 2, H / 2, color, 0);
    run.time.delayedCall(90, () => ripple(W / 2, H / 2, 0xffffff, 0));
    // 足元から立ち上る光柱＋粒子で「強くなった」手応え
    const pillar = run.add.image(run.player.x, run.player.y, 'white').setBlendMode(ADD)
      .setDepth(1400).setTint(color).setOrigin(0.5, 1).setDisplaySize(10, 4).setAlpha(0.9);
    run.tweens.add({ targets: pillar, displayHeight: 90, duration: 200, ease: 'Cubic.out' });
    run.tweens.add({
      targets: pillar, alpha: 0, delay: 220, duration: 340,
      onComplete: () => pillar.destroy(),
    });
    run.spawnParticles(run.player.x, run.player.y, color, 30);
    run.spawnParticles(run.player.x, run.player.y, 0xffffff, 12);
    run.floatText(run.player.x, run.player.y - 30, 'パワーアップ！', '#ffe066');
  }

  // ---- 告知バナー（§10.6-F） ----
  // 洞窟出現と報酬ゲット、祭壇出現とボス警告などが近接すると同じ y に重なって判読不能に
  // なるため、表示中のバナーは上へ退避させてから新しいバナーを出す。
  let banners = [];
  function announce(text, color) {
    banners = banners.filter((b) => b.active && b.scene);
    for (const b of banners) {
      run.tweens.killTweensOf(b);
      run.tweens.add({ targets: b, y: b.y - 26, alpha: 0.6, duration: 160 });
      run.tweens.add({
        targets: b, alpha: 0, delay: 900, duration: 300,
        onComplete: () => b.destroy(),
      });
    }

    const c = color != null ? colStr(color) : '#ffe066';
    const banner = run.add.text(W / 2, -30, text, {
      fontFamily: 'monospace', fontSize: '18px', color: c, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1800).setAlpha(0);
    run.tweens.add({ targets: banner, y: 120, alpha: 1, duration: 250, ease: 'Back.out' });
    run.tweens.add({
      targets: banner, alpha: 0, delay: 250 + 1600, duration: 400,
      onComplete: () => banner.destroy(),
    });
    banners.push(banner);
  }

  // ---- 合成シネマティック（§10.6-E・2.6s・スキップ可） ----
  function matSprite(def, x, y) {
    const key = 'mon_' + def.id;
    const img = run.textures.exists(key)
      ? run.add.image(x, y, key).setScale(3)
      : run.add.image(x, y, 'glow').setBlendMode(ADD).setTint(colInt(def.color)).setScale(2.4);
    return img.setScrollFactor(0).setDepth(2055);
  }

  function fusionCinematic(defA, defB, resultDef, onDone) {
    const cineTok = cineBegin();
    Sound.sfx('fusionCharge');
    const cx = W / 2, cy = 160;
    const objs = [];
    const timers = [];
    let finished = false;

    const dark = run.add.rectangle(W / 2, H / 2, W, H, 0x000010, 0)
      .setScrollFactor(0).setDepth(2050);
    objs.push(dark);
    run.tweens.add({ targets: dark, alpha: 0.72, duration: 300 });

    const sprA = matSprite(defA, cx - 130, cy);
    const sprB = matSprite(defB, cx + 130, cy);
    objs.push(sprA, sprB);
    run.tweens.add({ targets: sprA, x: cx, y: cy, duration: 900, delay: 300, ease: 'Cubic.in' });
    run.tweens.add({ targets: sprB, x: cx, y: cy, duration: 900, delay: 300, ease: 'Cubic.in' });

    // 収束の瞬間：白フラッシュ＋shake＋粒子＋結果登場
    timers.push(run.time.delayedCall(1250, () => {
      if (finished) return;
      sprA.setVisible(false); sprB.setVisible(false);
      Sound.sfx('fusion');
      run.shake(150, 5);
      // 白フラッシュは子ども向け安全上限 alpha 0.45 を厳守（0.45超は禁止）
      const flash = run.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.45)
        .setScrollFactor(0).setDepth(2060);
      objs.push(flash);
      run.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
      burstUI(cx, cy, 0xffd23f, 20, 2062);
      burstUI(cx, cy, colInt(resultDef.color), 20, 2062);

      const rkey = 'mon_' + resultDef.id;
      const rspr = (run.textures.exists(rkey)
        ? run.add.image(cx, cy, rkey)
        : run.add.image(cx, cy, 'glow').setBlendMode(ADD).setTint(colInt(resultDef.color)))
        .setScrollFactor(0).setDepth(2058).setScale(0);
      objs.push(rspr);
      run.tweens.add({ targets: rspr, scale: 6, duration: 450, ease: 'Back.out' });

      const nameT = run.add.text(cx, 258, resultDef.name + ' たんじょう！！', {
        fontFamily: 'monospace', fontSize: '18px', color: colStr(resultDef.color),
        fontStyle: 'bold', stroke: '#000000', strokeThickness: 5, align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2059).setAlpha(0);
      objs.push(nameT);
      run.tweens.add({ targets: nameT, alpha: 1, y: 250, duration: 300, delay: 150 });
    }));

    function finish() {
      if (finished) return;
      finished = true;
      run.input.off('pointerdown', finish);
      if (run.input.keyboard) run.input.keyboard.off('keydown-SPACE', finish);
      for (const t of timers) if (t) t.remove(false);
      for (const o of objs) { run.tweens.killTweensOf(o); o.destroy(); }
      cineEnd(cineTok);
      if (onDone) onDone();
    }

    timers.push(run.time.delayedCall(2600, finish));
    // スキップ（クリック / SPACE）
    run.input.once('pointerdown', finish);
    if (run.input.keyboard) run.input.keyboard.once('keydown-SPACE', finish);
  }

  // ---- 進化バースト（§10.6-E・光柱＋粒子） ----
  function evolveBurst(orb, newDef) {
    const x = (orb && orb.x != null) ? orb.x : run.player.x;
    const y = (orb && orb.y != null) ? orb.y : run.player.y;
    Sound.sfx('evolve');
    run.shake(160, 3);
    // 光柱（下から立ち上る）
    const pillar = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(1400)
      .setTint(0x8fffff).setOrigin(0.5, 1).setDisplaySize(10, 4).setAlpha(0.9);
    run.tweens.add({ targets: pillar, displayHeight: 96, duration: 220, ease: 'Cubic.out' });
    run.tweens.add({
      targets: pillar, alpha: 0, delay: 260, duration: 380,
      onComplete: () => pillar.destroy(),
    });
    // 二重リング＋色替えの追いリングで昇華感を強める
    ripple(x, y, 0x7fe8ff, 1);
    run.time.delayedCall(90, () => ripple(x, y, 0xffffff, 1));
    run.time.delayedCall(180, () => ripple(x, y, 0xffd23f, 1));
    // 光の粒を華やかに（白＋水色＋金）
    run.spawnParticles(x, y, 0xffffff, 20);
    run.spawnParticles(x, y, 0x7fe8ff, 18);
    run.spawnParticles(x, y, 0xffd23f, 12);
    // 細い光柱をもう1本重ねて太く見せる
    const pillar2 = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(1401)
      .setTint(0xffffff).setOrigin(0.5, 1).setDisplaySize(4, 4).setAlpha(0.85);
    run.tweens.add({ targets: pillar2, displayHeight: 80, duration: 200, ease: 'Cubic.out' });
    run.tweens.add({
      targets: pillar2, alpha: 0, delay: 220, duration: 340,
      onComplete: () => pillar2.destroy(),
    });
    const t = run.add.text(x, y - 40, 'しんか！ ' + newDef.name, {
      fontFamily: 'monospace', fontSize: '13px', color: '#8fffff', fontStyle: 'bold',
      stroke: '#003344', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1450).setScale(0);
    run.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.out' });
    run.tweens.add({
      targets: t, y: y - 62, alpha: 0, delay: 700, duration: 420,
      onComplete: () => t.destroy(),
    });
  }

  // ---- ボス警告（§10.6-B・2.0s。音は boss.js が所有するため fx は視覚のみ） ----
  function bossWarning(onDone) {
    run.shake(400, 3);
    const band = run.add.rectangle(W / 2, H / 2, W, 90, 0xff2244, 0)
      .setScrollFactor(0).setDepth(1850);
    const txt = run.add.text(W / 2, H / 2, 'W A R N I N G !!', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1851);
    run.tweens.add({ targets: band, alpha: 0.5, duration: 200 });
    // 4Hz 点滅（125ms 毎トグル）
    const blink = run.time.addEvent({
      delay: 125, repeat: 15, callback: () => txt.setVisible(!txt.visible),
    });
    run.time.delayedCall(2000, () => {
      if (blink) blink.remove();
      band.destroy(); txt.destroy();
      if (onDone) onDone();
    });
  }

  // ---- ボス撃破シネマ（§10.6-B・1.8s。コイン加算/bossdown音は boss.js の責務） ----
  function bossVictory(x, y, onDone) {
    const cineTok = cineBegin();
    run.shake(400, 8);
    let finished = false;
    const colors = [0xffd23f, 0xff6ec7, 0x7a3bf0, 0x7fd8ff, 0x36e0ff, 0x66ff88];
    // cinematic 中は updateParticles が回らず run.spawnParticles は凍結するため、
    // tween 駆動の burstUI を画面座標で使う（fusionCinematic と同じ手法・§10.6-B）。
    // 撃破点の大花火＋画面各所に打ち上がる連発花火で「勝った！」感を強化。
    for (let i = 0; i < 12; i++) {
      run.time.delayedCall(i * 130, () => {
        const s = worldToScreen(x, y);
        // 撃破点の本花火
        burstUI(s.x, s.y, colors[i % colors.length], 20, 2062);
        // 画面各所に散る打ち上げ花火＋リング
        const fx = run.rng.range(W * 0.15, W * 0.85);
        const fy = run.rng.range(H * 0.2, H * 0.7);
        const col = colors[(i + 2) % colors.length];
        burstUI(fx, fy, col, 14, 2062);
        ripple(fx, fy, col, 0);
      });
    }
    run.time.delayedCall(1800, () => {
      if (finished) return;
      finished = true;
      cineEnd(cineTok);
      if (onDone) onDone();
    });
  }

  // ---- 武器レベルアップ演出（v3・仲間全員が一斉に強くなる瞬間） ----
  // プレイを止めないため cinematic にはしない（freezeT で一瞬だけ溜めを作る）。
  function weaponLevelUp(level, names) {
    const list = Array.isArray(names) ? names : [];
    Sound.sfx('weaponUp');
    run.shake(180, 4);
    run.freezeT = 0.12;

    // 公転体の座標は orbit の外からは取れないため、公転半径の円周上に等間隔で出す
    const px = run.player.x, py = run.player.y;
    const radius = BALANCE.orbit.baseRadius * run.stats.radiusMult;
    const n = Math.max(1, (run.party && run.party.length) || list.length || 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = px + Math.cos(a) * radius;
      const y = py + Math.sin(a) * radius;
      run.time.delayedCall(i * 60, () => {
        const pillar = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(1400)
          .setTint(0x7fffcf).setOrigin(0.5, 1).setDisplaySize(12, 4).setAlpha(0.95);
        run.tweens.add({ targets: pillar, displayHeight: 120, duration: 200, ease: 'Cubic.out' });
        run.tweens.add({
          targets: pillar, alpha: 0, delay: 240, duration: 360,
          onComplete: () => pillar.destroy(),
        });
        ripple(x, y, 0xffd23f, 1);
        run.spawnParticles(x, y, 0x7fffcf, 10);
      });
    }

    // 中心から広がる二重リング＋足元の大粒子で全員強化の一体感を出す
    ripple(px, py, 0x7fffcf, 1);
    run.time.delayedCall(120, () => ripple(run.player.x, run.player.y, 0xffd23f, 1));
    run.time.delayedCall(220, () => ripple(run.player.x, run.player.y, 0xff6ec7, 1));
    run.spawnParticles(px, py, 0xffd23f, 26);
    run.spawnParticles(px, py, 0x7fd8ff, 22);
    run.spawnParticles(px, py, 0xff6ec7, 14);
    announce('ぶきレベル ' + level + ' ！', '#7fffcf');
    run.floatText(px, py - 30, 'ぶきパワーアップ！', '#7fffcf');
  }

  // ---- 必殺技「ボルテックスバースト」（v3・cinematic・onImpact/onDone は各1回保証） ----
  // "やりすぎ"級の派手さ：渦の溜め→全画面炸裂→色相を回す多重リング＋放射ストリーク
  // ＋火花の嵐＋ショックウェーブ→きらめきの余韻。テンポは balance.special.cinematicSec で決まる。
  function specialBlast(x, y, radius, onImpact, onDone) {
    const cineTok = cineBegin();
    run.shake(500, 10);
    Sound.sfx('specialCharge');   // 溜めの唸り（新SFX・音響担当が追加）
    Sound.sfx('special');
    announce('ボルテックスバースト！！', '#ffd23f');

    // 色相の波（金→ピンク→水色→紫→シアン→橙）。i で回して虹の渦を作る。
    const HUES = [0xffd23f, 0xff6ec7, 0x7fd8ff, 0x9b6bff, 0x36e0ff, 0xff9e3f];
    const hue = (i) => HUES[((i % HUES.length) + HUES.length) % HUES.length];

    const objs = [];
    let impacted = false, finished = false;
    const s0 = worldToScreen(x, y);

    // ── 溜め（0〜180ms）：内へ吸い込む渦 ──
    // 中心の輝きコア＋逆回転する2枚の渦リング＋外周から吸い込む集中線。
    const charge = run.add.image(s0.x, s0.y, 'glow').setScrollFactor(0).setDepth(2062)
      .setBlendMode(ADD).setTint(0x7fd8ff).setScale(radius / 16).setAlpha(0.5);
    objs.push(charge);
    run.tweens.add({ targets: charge, scale: 1, alpha: 0.95, duration: 180, ease: 'Cubic.in' });

    for (let v = 0; v < 2; v++) {
      const vr = run.add.image(s0.x, s0.y, 'glow').setScrollFactor(0).setDepth(2061)
        .setBlendMode(ADD).setTint(v === 0 ? 0xff6ec7 : 0xffd23f)
        .setScale((radius * 1.6) / 32).setAlpha(0.55).setRotation(run.rng.range(0, 6.28));
      objs.push(vr);
      run.tweens.add({
        targets: vr, scale: 0.5, alpha: 0.9, rotation: vr.rotation + (v ? 4 : -4),
        duration: 200, ease: 'Cubic.in',
      });
    }
    convergeLines(s0.x, s0.y, 14, 0x9becff, radius * 1.3, 2060, 200);

    // ── 炸裂（180ms）＝ダメージ判定タイミング ──
    run.time.delayedCall(180, () => {
      if (!impacted) { impacted = true; if (onImpact) onImpact(); }
      Sound.sfx('bigBoom');   // 特大の炸裂音（新SFX・音響担当が追加）
      run.shake(360, 12);     // 炸裂の追い足しシェイク
      run.tweens.add({ targets: charge, alpha: 0, scale: 3.4, duration: 240, ease: 'Cubic.out' });

      // 白フラッシュ（子ども向け安全上限 alpha 0.45・厳守）
      const flash = run.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.45)
        .setScrollFactor(0).setDepth(2092);
      run.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
      // 有色グロー幕は派手にしてよい（金の全画面加算フラッシュ）
      const goldWash = run.add.rectangle(W / 2, H / 2, W, H, 0xffd23f, 0.5)
        .setScrollFactor(0).setDepth(2091).setBlendMode(ADD);
      run.tweens.add({ targets: goldWash, alpha: 0, duration: 420, onComplete: () => goldWash.destroy() });

      const s = worldToScreen(x, y);

      // 色相を回す多重巨大リングを7枚、時間差で重ねる
      for (let i = 0; i < 7; i++) {
        run.time.delayedCall(i * 55, () => {
          const ring = run.add.image(s.x, s.y, 'glow').setScrollFactor(0).setDepth(2063)
            .setBlendMode(ADD).setTint(hue(i)).setScale(0.6).setAlpha(0.9);
          run.tweens.add({
            targets: ring, scale: (radius * 2.2) / 32 * run.rng.range(0.85, 1.1), alpha: 0,
            duration: 680, ease: 'Cubic.out', onComplete: () => ring.destroy(),
          });
        });
      }

      // 全画面リング状ショックウェーブ（画面を突き抜ける1枚）
      const shock = run.add.image(s.x, s.y, 'glow').setScrollFactor(0).setDepth(2064)
        .setBlendMode(ADD).setTint(0xffffff).setScale(0.4).setAlpha(0.6);
      run.tweens.add({
        targets: shock, scale: (W * 1.3) / 32, alpha: 0, duration: 520, ease: 'Cubic.out',
        onComplete: () => shock.destroy(),
      });

      // 放射状ストリーク（中心から外へ伸びる光の筋を2波・色相の波）
      radialStreaks(s.x, s.y, 20, hue, radius * 1.9, 2066, 460, run.rng.range(0, 1));
      run.time.delayedCall(140, () => {
        const s2 = worldToScreen(x, y);
        radialStreaks(s2.x, s2.y, 16, (i) => hue(i + 3), radius * 2.3, 2066, 520, run.rng.range(0, 1));
      });

      // 火花の嵐：中心の大爆発＋周囲の飛び火を一気に
      burstUI(s.x, s.y, 0xffd23f, 26, 2068);
      burstUI(s.x, s.y, 0xff6ec7, 22, 2068);
      for (let k = 0; k < 6; k++) {
        const ka = (k / 6) * Math.PI * 2;
        const kd = radius * run.rng.range(0.5, 1.0);
        burstUI(s.x + Math.cos(ka) * kd, s.y + Math.sin(ka) * kd, hue(k), 14, 2067);
      }
    });

    // 火花の追い撃ち：炸裂後に広範囲へ連続で撒く（cinematic 中は burstUI で）
    for (let i = 0; i < 10; i++) {
      run.time.delayedCall(200 + i * 85, () => {
        const s = worldToScreen(x, y);
        const off = run.rng.range(-radius * 0.9, radius * 0.9);
        burstUI(s.x + off, s.y + run.rng.range(-radius * 0.7, radius * 0.7), hue(i), 16, 2065);
      });
    }

    const cineMs = Math.round((BALANCE.special.cinematicSec || 1.5) * 1000);

    // ── 余韻：終端手前できらめきを漂わせて締める ──
    run.time.delayedCall(Math.max(300, cineMs - 420), () => {
      const s = worldToScreen(x, y);
      for (let k = 0; k < 5; k++) {
        const ka = run.rng.range(0, Math.PI * 2);
        const kd = run.rng.range(0, radius * 0.8);
        burstUI(s.x + Math.cos(ka) * kd, s.y + Math.sin(ka) * kd, hue(k + 2), 6, 2065);
      }
    });

    run.time.delayedCall(cineMs, () => {
      if (finished) return;
      finished = true;
      if (!impacted) { impacted = true; if (onImpact) onImpact(); }
      for (const o of objs) { run.tweens.killTweensOf(o); o.destroy(); }
      cineEnd(cineTok);
      if (onDone) onDone();
    });
  }

  // ---- 必殺ゲージ満タン通知（v3・軽め） ----
  function specialReady() {
    Sound.sfx('gaugeFull');
    announce('ひっさつ じゅんび OK！ SPACEキー！', '#ffd23f');
    ripple(run.player.x, run.player.y, 0xffd23f, 1);
  }

  function update(dt) {
    updateTargets(dt);
  }

  return {
    update, powerupFlash, announce, setTarget, clearTarget,
    fusionCinematic, evolveBurst, bossWarning, bossVictory,
    weaponLevelUp, specialBlast, specialReady,
  };
}
