// systems/levelup.js — XP管理・ノンストップ3択ドラフト・進化トリガ（PROTOTYPE_SPEC §4 / §10.6-A,E）。
// v2: 時間停止をやめ、カードは画面下（cardY 308）へスライドイン。ゲームは進行し続ける。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

export function createLevelup(run) {
  const F = BALANCE.levelupFlow;   // autoPickSec, rainbowChance, cardY, cardW, cardH, cardXs
  const E = BALANCE.evolve;        // startLevel, everyLevels
  let pending = 0;                 // 未消化のドラフト数
  let open = false;
  let cards = [];                  // { up, rect, rainbow }
  let sel = 0;
  let panel = [];
  let timeLeft = 0;
  let timerBar = null;

  function needFor(level) {
    return BALANCE.xp.firstLevelNeed + BALANCE.xp.needStep * (level - 2);
  }

  function addXp(amount) {
    run.xp += amount;
    while (run.xp >= run.xpNeed) {
      run.xp -= run.xpNeed;
      run.level += 1;
      run.xpNeed = needFor(run.level + 1);
      pending += 1;
      ripple();
      Sound.sfx('levelup');
      if (isEvolveLevel(run.level)) tryEvolve();
    }
    if (pending > 0 && !open) openDraft();
  }

  // ---- 進化（§10.6-E: Lv6 以降2レベル毎・party先頭の未進化かつ非合成を1体） ----
  function isEvolveLevel(level) {
    return level >= E.startLevel && (level - E.startLevel) % E.everyLevels === 0;
  }

  function tryEvolve() {
    for (let i = 0; i < run.party.length; i++) {
      const p = run.party[i];
      if (p.fused || p.evolved) continue;
      if (!p.def.evo) continue;
      // orbit.js が p.evolved を見て base.evo のスプライト/戦闘値へ切り替える（色は基本形を継承）
      p.evolved = true;
      run.orbit.rebuild();
      if (run.fx && run.fx.evolveBurst) {
        run.fx.evolveBurst({ x: run.player.x, y: run.player.y }, p.def.evo);
      }
      return true;
    }
    return false;
  }

  function ripple() {
    const r = run.add.image(320, 180, 'glow')
      .setScrollFactor(0).setDepth(1900).setBlendMode(ADD)
      .setTint(0xffffff).setScale(1).setAlpha(0.85);
    run.tweens.add({ targets: r, scale: 22, alpha: 0, duration: 520,
      ease: 'Cubic.out', onComplete: () => r.destroy() });
  }

  // ---- ドラフト構築 ----
  function buildPicks() {
    const picks = run.rng.shuffle(BALANCE.upgrades).slice(0, 3);
    if (run.rng.chance(F.rainbowChance)) {
      const idx = Math.floor(run.rng.range(0, picks.length));
      picks[idx] = run.rng.pick(BALANCE.rainbowUpgrades);
    }
    return picks;
  }

  function openDraft() {
    open = true;
    run.setDrafting(true);
    sel = 0;
    timeLeft = F.autoPickSec;
    panel = [];
    cards = [];

    const title = run.add.text(320, 248, 'レベルアップ！ カードを えらぼう', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    panel.push(title);

    // オートピックのタイマーバー（y=272・10秒で右から縮む）
    const barBg = run.add.rectangle(320, 272, 306, 7, 0x000000, 0.55)
      .setScrollFactor(0).setDepth(2001);
    timerBar = run.add.rectangle(320, 272, 300, 4, 0xffe066, 1)
      .setScrollFactor(0).setDepth(2002);
    panel.push(barBg, timerBar);

    const picks = buildPicks();
    for (let i = 0; i < picks.length; i++) buildCard(i, picks[i]);
    highlight();
    Sound.sfx('draftReady');
  }

  function buildCard(i, up) {
    const cx = F.cardXs[i], cy = F.cardY, w = F.cardW, h = F.cardH;
    const rainbow = !!up.effects;

    const rect = run.add.rectangle(cx, cy, w, h, rainbow ? 0x2a1c4a : 0x14224a, 0.96)
      .setStrokeStyle(2, rainbow ? 0xffd23f : 0x4de1c0)
      .setScrollFactor(0).setDepth(2001)
      .setInteractive({ useHandCursor: true });

    const iconKey = 'icon_' + up.id;
    const icon = run.textures.exists(iconKey)
      ? run.add.image(cx - 66, cy, iconKey).setScale(2.4)
      : run.add.image(cx - 66, cy, 'glow').setBlendMode(ADD)
          .setTint(rainbow ? 0xffd23f : 0x7fffcf).setScale(1.2);
    icon.setScrollFactor(0).setDepth(2002);

    const num = run.add.text(cx - w / 2 + 7, cy - h / 2 + 5, (i + 1) + '', {
      fontFamily: 'monospace', fontSize: '12px',
      color: rainbow ? '#ffd23f' : '#7fffcf', fontStyle: 'bold',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(2003);

    const label = run.add.text(cx - 46, cy - 12, up.label, {
      fontFamily: 'monospace', fontSize: '12px',
      color: rainbow ? '#ffe6a0' : '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);

    const desc = run.add.text(cx - 46, cy + 12, up.desc, {
      fontFamily: 'monospace', fontSize: '9px', color: '#cfe0ff',
      wordWrap: { width: w - 58 },
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2002);

    rect.on('pointerdown', () => { sel = i; decide(); });
    rect.on('pointerover', () => {
      if (sel !== i) { sel = i; highlight(); Sound.sfx('select'); }
    });

    const parts = [rect, icon, num, label, desc];
    // 下からスライドイン
    for (const o of parts) o.y += 72;
    run.tweens.add({ targets: parts, y: '-=72', duration: 260, ease: 'Back.out', delay: i * 45 });
    // 虹カードは金枠パルス
    if (rainbow) {
      run.tweens.add({ targets: rect, scaleX: 1.05, scaleY: 1.08, duration: 520,
        yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    cards.push({ up, rect, rainbow });
    for (const o of parts) panel.push(o);
  }

  function highlight() {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const on = i === sel;
      const base = c.rainbow ? 0xffd23f : 0x4de1c0;
      c.rect.setStrokeStyle(on ? 3 : 2, on ? 0xffe066 : base);
      c.rect.setFillStyle(
        c.rainbow ? (on ? 0x3a2860 : 0x2a1c4a) : (on ? 0x243a72 : 0x14224a), 0.96);
    }
  }

  // ---- 効果適用 ----
  function applyStat(stat, add) {
    if (stat === 'maxHpAdd') {
      run.player.maxHp += add;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + add);
    } else {
      run.stats[stat] = (run.stats[stat] || 0) + add;
    }
  }

  function apply(up) {
    if (up.effects) {
      for (const e of up.effects) applyStat(e.stat, e.add);
      if (up.heal === 'full') run.player.hp = run.player.maxHp;
    } else {
      applyStat(up.stat, up.add);
    }
  }

  function teardown() {
    for (const o of panel) { run.tweens.killTweensOf(o); o.destroy(); }
    panel = []; cards = []; timerBar = null;
  }

  function decide() {
    if (run.cinematic) return;      // 合成/ボス撃破シネマ中の誤操作(SPACE/数字/クリック)は無視
    if (!open || !cards.length) return;
    const up = cards[sel].up;
    apply(up);
    if (run.fx && run.fx.powerupFlash) run.fx.powerupFlash(up);
    Sound.sfx('powerup');
    run.freezeT = 0.09;              // 90ms ヒットストップ
    teardown();
    open = false;
    pending -= 1;
    if (pending > 0) openDraft();
    else run.setDrafting(false);
  }

  // 数字キー(1/2/3)=即決定・SPACE=ハイライト中を決定（§10.6-A）
  function select(i) {
    if (!open || i < 0 || i >= cards.length) return;
    sel = i;
    decide();
  }

  function confirm() {
    if (!open) return;
    decide();
  }

  function update(dt) {
    if (!open) return;
    timeLeft -= dt;
    if (timerBar) timerBar.scaleX = Math.max(0, timeLeft / F.autoPickSec);
    if (timeLeft <= 0) decide();    // オートピック（ハイライト中を自動決定）
  }

  return {
    addXp, confirm, select, update,
    get open() { return open; },
  };
}
