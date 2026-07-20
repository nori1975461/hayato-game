// systems/levelup.js — XP管理・レベルアップ・3択ドラフト（PROTOTYPE_SPEC §4 / §6）。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;

export function createLevelup(run) {
  let pending = 0;        // 未消化のドラフト数
  let open = false;
  let cards = [];
  let sel = 0;
  let panel = null;

  function needFor(level) {
    // レベル level に上がるのに必要なXP（L=2で5, L=3で9, …）
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
    }
    if (pending > 0 && !open) openDraft();
  }

  function ripple() {
    const r = run.add.image(320, 180, 'glow')
      .setScrollFactor(0).setDepth(1900)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffffff).setScale(1).setAlpha(0.85);
    run.tweens.add({ targets: r, scale: 22, alpha: 0, duration: 520,
      ease: 'Cubic.out', onComplete: () => r.destroy() });
  }

  function openDraft() {
    open = true;
    run.setDrafting(true);
    sel = 0;
    const picks = run.rng.shuffle(BALANCE.upgrades).slice(0, 3);

    const items = [];
    const dark = run.add.rectangle(320, 180, 640, 360, 0x000018, 0.62)
      .setScrollFactor(0).setDepth(2000);
    items.push(dark);
    const title = run.add.text(320, 96, 'レベルアップ！  つよくなろう', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffe066', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    items.push(title);
    const hint = run.add.text(320, 268, '1 / 2 / 3 か クリックで えらぶ（SPACEで けってい）', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    items.push(hint);

    cards = [];
    const xs = [150, 320, 490];
    for (let i = 0; i < picks.length; i++) {
      const up = picks[i];
      const rect = run.add.rectangle(xs[i], 180, 150, 108, 0x14224a, 1)
        .setStrokeStyle(2, 0x4de1c0).setScrollFactor(0).setDepth(2001)
        .setInteractive({ useHandCursor: true });
      const num = run.add.text(xs[i], 142, (i + 1) + '', {
        fontFamily: 'monospace', fontSize: '16px', color: '#7fffcf', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
      const label = run.add.text(xs[i], 186, up.label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center',
        wordWrap: { width: 132 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
      rect.on('pointerdown', () => { sel = i; confirm(); });
      rect.on('pointerover', () => { sel = i; highlight(); });
      cards.push({ up, rect, num, label });
      items.push(rect, num, label);
    }
    panel = items;
    highlight();
  }

  function highlight() {
    for (let i = 0; i < cards.length; i++) {
      const on = i === sel;
      cards[i].rect.setStrokeStyle(on ? 3 : 2, on ? 0xffe066 : 0x4de1c0);
      cards[i].rect.setFillStyle(on ? 0x243a72 : 0x14224a, 1);
    }
  }

  function apply(up) {
    if (up.stat === 'maxHpAdd') {
      run.player.maxHp += up.add;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + up.add);
    } else {
      run.stats[up.stat] = (run.stats[up.stat] || 0) + up.add;
    }
  }

  function teardown() {
    if (panel) for (const o of panel) o.destroy();
    panel = null; cards = [];
  }

  function confirm() {
    if (!open) return;
    apply(cards[sel].up);
    Sound.sfx('select');
    teardown();
    open = false;
    pending -= 1;
    if (pending > 0) openDraft();
    else run.setDrafting(false);
  }

  function select(i) {
    if (!open || i < 0 || i >= cards.length) return;
    sel = i;
    highlight();
  }

  return {
    addXp, confirm, select,
    get open() { return open; },
  };
}
