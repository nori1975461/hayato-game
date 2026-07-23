// scenes/Boot.js — テキストグリッドをテクスチャ化してから Title へ（PROTOTYPE_SPEC §5.1）。
import { MONSTERS, PLAYER_SPRITE, PLAYER_SPRITES } from '../data/monsters.js';
import { ENEMIES, BOSS } from '../data/enemies.js';
import { UPGRADE_ICONS } from '../ui/icons.js';
import { createRng } from '../core/rng.js';

const Phaser = window.Phaser;
const int = (c) => parseInt(c.slice(1), 16);

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // --- テキストグリッド → テクスチャ ---
    for (const m of MONSTERS) {
      this.makeGrid('mon_' + m.id, m.sprite);
      if (m.evo) this.makeGrid('mon_' + m.evo.id, m.evo.sprite);   // 進化形態
    }
    for (const e of ENEMIES) this.makeGrid('enemy_' + e.id, e.sprite);
    // 自機3段階（Run.js は 'player' も参照するため基本形も残す）
    this.makeGrid('player', PLAYER_SPRITE);
    PLAYER_SPRITES.forEach((s, i) => this.makeGrid('player_' + (i + 1), s));
    // ボス「ウズキング」の2枚重ね（渦＋顔）
    this.makeGrid('boss_uzu_swirl', BOSS.sprites.swirl);
    this.makeGrid('boss_uzu_face', BOSS.sprites.face);
    // 強化アイコン7種
    for (const [id, ic] of Object.entries(UPGRADE_ICONS)) this.makeGrid('icon_' + id, ic);

    // --- 発光・エフェクト系テクスチャ（白で作り、実行時に tint） ---
    this.makeGlow('glow', 32);
    this.makeBullet('bullet', 8);
    this.makeStar('core', 12, 6, 2.6, 5);   // スターコア（5点星）
    this.makeGem('gem', 8);                   // XPジェム（ひし形）
    this.makeSpark('spark', 7);               // 爆散パーティクル
    this.makeWhite('white', 4);               // ビーム・リング用の白基材
    this.makeArrow('arrow', 12, 10);          // 画面外の敵/ボス方向インジケータ

    // --- Wave B: かわいい武器テクスチャ（w_rainbow 以外は白＝実行時に tint） ---
    this.makeStar('w_star2', 10, 5, 2.0, 5);  // 主人公のスター弾（きらきら系）
    this.makeCookie('w_cookie', 12);          // クッキーブーメラン（スイーツ系）
    this.makeRing('w_ring', 48, 5);           // おんぷリングの輪（おもちゃ系）
    this.makeBubble('w_bubble', 16);          // シャボン（フィールド系）
    this.makePaw('w_paw', 14);                // 肉球ヒットマーク（どうぶつ系）
    this.makeRainbow('w_rainbow', 4, 12);     // にじビーム（唯一の彩色テクスチャ）

    // --- 星空タイル（視差背景・決定的パターン） ---
    this.makeStarfield('stars1', 128, 34, 1, 0.9);
    this.makeStarfield('stars2', 160, 16, 2, 0.5);

    this.scene.start('Title');
  }

  // HAYATO式テキストグリッドを1px/セルで描画してテクスチャ化
  makeGrid(key, sprite) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const rows = sprite.rows;
    const h = rows.length;
    const w = rows[0].length;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        const col = sprite.palette[ch];
        if (!col) continue;
        g.fillStyle(int(col), 1);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeGlow(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const r = size / 2;
    const steps = 12;
    for (let i = steps; i >= 1; i--) {
      const rr = (r * i) / steps;
      const a = 0.14 * (1 - (i - 1) / steps);
      g.fillStyle(0xffffff, a);
      g.fillCircle(r, r, rr);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeBullet(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 1);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeStar(key, size, outer, inner, points) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * i) / points - Math.PI / 2;
      pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.fillStyle(0xffffff, 1);
    g.fillPoints(this.toPoints(pts), true);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeGem(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const c = size / 2;
    g.fillStyle(0xffffff, 1);
    g.fillPoints(this.toPoints([c, 0, size, c, c, size, 0, c]), true);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeSpark(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const m = Math.floor(size / 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(m, 0, 1, size);
    g.fillRect(0, m, size, 1);
    g.fillRect(m - 1, m - 1, 3, 3);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makeWhite(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, size, size);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // 右向きの三角矢印（白）。実行時に回転・tint して方向インジケータに使う。
  makeArrow(key, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillPoints(this.toPoints([0, 0, w, h / 2, 0, h]), true);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // --- Wave B: かわいい武器テクスチャ ---

  // 1px走査で白テクスチャを作る。Graphics には「消しゴム」がないため、
  // クッキーのチョコチップやリングの中心は fn が false を返す＝透明で表現する。
  makeMask(key, size, fn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (fn(x + 0.5, y + 0.5)) g.fillRect(x, y, 1, 1);
      }
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // クッキーブーメラン（スイーツ系）。丸い生地にチョコチップの穴を3つ空ける。
  makeCookie(key, size) {
    const c = size / 2;
    const r = c - 0.5;
    const chipR = size * 0.13;
    const chips = [
      [c - r * 0.35, c - r * 0.30],
      [c + r * 0.40, c],
      [c - r * 0.10, c + r * 0.45],
    ];
    this.makeMask(key, size, (x, y) => {
      const dx = x - c, dy = y - c;
      if (dx * dx + dy * dy > r * r) return false;
      for (const ch of chips) {
        const cx = x - ch[0], cy = y - ch[1];
        if (cx * cx + cy * cy <= chipR * chipR) return false;
      }
      return true;
    });
  }

  // おんぷリングの輪（おもちゃ系）。中心は透明な円環。
  makeRing(key, size, thickness) {
    const c = size / 2;
    const outer = c - 0.5;
    const inner = outer - thickness;
    this.makeMask(key, size, (x, y) => {
      const dx = x - c, dy = y - c;
      const d2 = dx * dx + dy * dy;
      return d2 <= outer * outer && d2 >= inner * inner;
    });
  }

  // シャボン（フィールド系）。細い輪＋左上のハイライト。
  makeBubble(key, size) {
    const c = size / 2;
    const outer = c - 0.5;
    const inner = outer - 1.6;
    const hx = c - outer * 0.42, hy = c - outer * 0.42;
    const hr = size * 0.13;
    this.makeMask(key, size, (x, y) => {
      const dx = x - c, dy = y - c;
      const d2 = dx * dx + dy * dy;
      if (d2 <= outer * outer && d2 >= inner * inner) return true;
      const gx = x - hx, gy = y - hy;
      return gx * gx + gy * gy <= hr * hr;
    });
  }

  // 肉球ヒットマーク（どうぶつ系）。パッド楕円＋指4つ。
  makePaw(key, size) {
    const s = size / 14;   // 基準サイズ14pxからのスケール
    const padX = 7 * s, padY = 9 * s, rx = 4.2 * s, ry = 3.4 * s;
    const toeR = 1.7 * s;
    const toes = [[2.6 * s, 4.4 * s], [5.4 * s, 3.0 * s], [8.6 * s, 3.0 * s], [11.4 * s, 4.4 * s]];
    this.makeMask(key, size, (x, y) => {
      const dx = (x - padX) / rx, dy = (y - padY) / ry;
      if (dx * dx + dy * dy <= 1) return true;
      for (const t of toes) {
        const tx = x - t[0], ty = y - t[1];
        if (tx * tx + ty * ty <= toeR * toeR) return true;
      }
      return false;
    });
  }

  // にじビーム。白＋tintでは虹にならないため、ここだけ彩色済みテクスチャを作る。
  makeRainbow(key, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cols = [0xff6b6b, 0xffb46b, 0xffe66b, 0x7bdc7b, 0x6bc4ff, 0xc38bff];
    const bh = h / cols.length;
    for (let i = 0; i < cols.length; i++) {
      g.fillStyle(cols[i], 1);
      g.fillRect(0, i * bh, w, bh);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  makeStarfield(key, size, count, dotSize, alpha) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const rng = createRng(key === 'stars1' ? 991 : 7331);
    for (let i = 0; i < count; i++) {
      const x = rng.int(0, size - 1);
      const y = rng.int(0, size - 1);
      const a = alpha * rng.range(0.4, 1.0);
      g.fillStyle(0xffffff, a);
      g.fillRect(x, y, dotSize, dotSize);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  toPoints(flat) {
    const out = [];
    for (let i = 0; i < flat.length; i += 2) out.push(new Phaser.Geom.Point(flat[i], flat[i + 1]));
    return out;
  }
}
