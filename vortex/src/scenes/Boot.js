// scenes/Boot.js — テキストグリッドをテクスチャ化してから Title へ（PROTOTYPE_SPEC §5.1）。
import { MONSTERS, PLAYER_SPRITE, PLAYER_SPRITES, HERO_FISTS } from '../data/monsters.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
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
    // R14: 銃は全廃（hero_gun/hero_tracer テクスチャは作らない）。主人公は拳＋腕の技のみ。
    // R12: 主人公の主武器（クラッシュアーム＝殴る瞬間だけ突き出す拳）。
    HERO_FISTS.forEach((s, i) => this.makeGrid('hero_fist' + (i + 1), s));
    // ボス（Wave R3：ロボット6体・7パーツリグ）。sprites の各パーツを boss_<id>_<part> でテクスチャ化。
    for (const d of BOSSES) {
      for (const [k, s] of Object.entries(d.sprites)) this.makeGrid('boss_' + d.id + '_' + k, s);
    }
    // 強化アイコン7種
    for (const [id, ic] of Object.entries(UPGRADE_ICONS)) this.makeGrid('icon_' + id, ic);

    // --- 発光・エフェクト系テクスチャ（白で作り、実行時に tint） ---
    this.makeGlow('glow', 32);
    this.makeBullet('bullet', 8);
    this.makeStar('core', 12, 6, 2.6, 5);   // スターコア（5点星）
    this.makeGem('gem', 12);                  // XPジェム（多面カットのクリスタル・実行時に寒色で tint）
    this.makeHeart('heart', 12);              // FB#1: 体力回復アイテム（ハート・実行時に赤/桃で tint）
    this.makeFoeOrb('foe_orb', 12);           // FB#2: 丸い危険弾（現在は未使用の予備テクスチャ。boss_boltに役目を譲った）
    // R18b: 雑魚の敵弾は撃った相手が形で分かるようにする（丸い点だと3種とも同じに見えた）。
    //   進行方向へ回して使うので、どちらも「左が後ろ・右が先端」の向きで定義する。
    this.makeFoeDart('foe_dart', 24, 8);      // 狙撃＝細長い徹甲ダート（穂先＋矢羽）
    this.makeFoeShell('foe_shell', 18, 10);   // 砲台＝鈍頭の榴弾シェル（弾帯＋尾フィン）
    // R20 Gate2: ボス汎用弾（machinegun/vulcan/ring/nova/shockwave）を丸い点からプラズマ・ボルトへ。
    //   +Xが進行方向の鏃形＝dart/shellと同じ「左が後ろ・右が先端」の向き。設計意図はscratchpad/render-foe-bolt.mjsのNOTES参照。
    this.makeFoeBolt('boss_bolt', 16, 10);
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
    // --- Wave R4: 武器フォームチェンジ用のかわいい武器テクスチャ（白＝実行時に tint） ---
    this.makeToy('w_toy', 12);                // おもちゃボール（丸＋星ハイライト）
    this.makeHammer('w_hammer', 16);          // ぺろぺろ巨大ハンマー
    this.makeNote('w_note', 14);              // ピアニカのおんぷ（8分音符）
    this.makeDrop('w_drop', 12);              // みずでっぽうの水玉
    this.makeHeart('w_heart', 14);            // R22 回復モビットのハート（白＝実行時に tint）

    // --- 星空タイル（視差背景・決定的パターン） ---
    this.makeStarfield('stars1', 128, 34, 1, 0.9);
    this.makeStarfield('stars2', 160, 16, 2, 0.5);

    this.scene.start('Opening');
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

  // XPジェム（多面カットのクリスタル）。丸い敵弾（foe_orb）と一目で区別できる角ばった宝石シルエット。
  // FB: 宝石が赤系の敵弾と紛らわしい対策。カット面ごとに白のアルファを変えておくと、Run 側で単色 tint しても
  // 「面の濃淡＝きらめき」が出て、ただの塗り潰しでなく“カットされた宝石”に見える（テーブル面が最も明るい）。
  makeGem(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const k = size / 12;   // 基準サイズ12pxからのスケール（座標は12px系で定義）
    const P = (arr) => this.toPoints(arr.map((v) => v * k));
    // [頂点列(12px系), 白アルファ]。上=テーブル面（明）→下=パビリオン（暗）で立体的なカット面に。
    const facets = [
      [[3, 1, 9, 1, 8, 4.5, 4, 4.5], 1.00],    // テーブル（最も明るい輝き面）
      [[3, 1, 4, 4.5, 0.5, 4.5], 0.74],        // 左クラウン
      [[9, 1, 11.5, 4.5, 8, 4.5], 0.82],       // 右クラウン
      [[4, 4.5, 8, 4.5, 6, 11.5], 0.62],       // 中央パビリオン
      [[0.5, 4.5, 4, 4.5, 6, 11.5], 0.46],     // 左パビリオン（影）
      [[8, 4.5, 11.5, 4.5, 6, 11.5], 0.54],    // 右パビリオン
    ];
    for (const [pts, a] of facets) {
      g.fillStyle(0xffffff, a);
      g.fillPoints(P(pts), true);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // FB#1: 回復ハート。ふくらんだ2つの円＋下向き三角で「ハート」と一目で分かる形（gem のひし形と別物）。
  makeHeart(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const s = size, r = s * 0.27;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s * 0.32, s * 0.34, r);
    g.fillCircle(s * 0.68, s * 0.34, r);
    g.fillPoints(this.toPoints([s * 0.06, s * 0.42, s * 0.94, s * 0.42, s * 0.5, s * 0.95]), true);
    g.generateTexture(key, s, s);
    g.destroy();
  }

  // FB(機械軍団化): 敵弾＝異空間ロボット軍団の「メカ・エネルギー弾」。横長ヘキサゴンの装甲殻＋上下のトゲで
  // 角ばった危険形にし、味方の5点スター弾／緑紫のカットジェム／桃ハートと輪郭で明確に区別する。
  // makeGem と同じく面ごとに白アルファを変えて焼き込む＝Run 側が単色 tint しても「明るいコア→暗い装甲リム」の
  // 立体エネルギー弾に見える（外殻ほど暗く、中心コアほど白熱）。
  makeFoeOrb(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const k = size / 12;   // 基準12px系で頂点を定義しスケール
    const P = (arr) => this.toPoints(arr.map((v) => v * k));
    // [頂点列(12px系), 白アルファ]。外殻(暗)→中心コア(白1.0)の順に重ねて描く。
    const facets = [
      // 装甲リム：横長ヘキサゴン（左右に尖った機械弾の外殻・最も暗い）
      [[0.5, 6, 3.2, 1.6, 8.8, 1.6, 11.5, 6, 8.8, 10.4, 3.2, 10.4], 0.40],
      [[5.1, 1.6, 6.9, 1.6, 6, 0.2], 0.40],       // 上フィン（トゲ＝あぶない）
      [[5.1, 10.4, 6.9, 10.4, 6, 11.8], 0.40],    // 下フィン（トゲ）
      // 中間プレート（テックな段差・切り欠きで機械感）
      [[2.4, 6, 4.2, 3.2, 5.0, 3.2, 5.0, 4.4, 7.0, 4.4, 7.0, 3.2, 7.8, 3.2, 9.6, 6, 7.8, 8.8, 7.0, 8.8, 7.0, 7.6, 5.0, 7.6, 5.0, 8.8, 4.2, 8.8], 0.66],
      // 内側エネルギー（明）
      [[4.0, 6, 5.2, 4.4, 6.8, 4.4, 8.0, 6, 6.8, 7.6, 5.2, 7.6], 0.90],
      // 中心コア（最高輝度・白熱）
      [[5.0, 6, 6, 4.9, 7.0, 6, 6, 7.1], 1.00],
    ];
    for (const [pts, a] of facets) {
      g.fillStyle(0xffffff, a);
      g.fillPoints(P(pts), true);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // R18b: 狙撃の徹甲ダート。全高の三角穂先＋細い軸＋V字の矢羽。
  //   穂先を軸より明るく焼いておくと、単色 tint でも「矢」として読める（面ごとに白アルファを変える makeGem と同じ手）。
  makeFoeDart(key, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const P = (arr) => this.toPoints(arr);
    const facets = [
      // 外形（穂先〜軸〜矢羽をひと筆で）
      [[23.8, 4, 14, 0.1, 14, 3.0, 4, 3.0, 0.2, 0.2, 2.8, 3.7, 2.8, 4.3, 0.2, 7.8, 4, 5.0, 14, 5.0, 14, 7.9], 0.55],
      [[23.2, 4, 14.4, 0.6, 14.4, 7.4], 0.88],   // 穂先（明）
      [[14, 3.2, 3.5, 3.2, 3.5, 4.8, 14, 4.8], 0.22],   // 軸の陰
      [[23.6, 4, 19.5, 2.2, 19.5, 5.8], 1.0],    // 先端の白熱
    ];
    for (const [pts, a] of facets) {
      g.fillStyle(0xffffff, a);
      g.fillPoints(P(pts), true);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // R18b: 砲台の榴弾シェル。鈍頭の弾頭キャップ＋弾帯のリング＋胴より背の高い尾フィン。
  //   ダートと逆に「鈍く・太く」焼くことで、同じ単色でも重い弾として読める。
  makeFoeShell(key, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const P = (arr) => this.toPoints(arr);
    const facets = [
      [[17.6, 4.4, 17.6, 5.6, 15.6, 7.6, 13.0, 8.9, 4.0, 8.9, 4.0, 9.8, 0.2, 9.8,
        0.2, 0.2, 4.0, 0.2, 4.0, 1.1, 13.0, 1.1, 15.6, 2.4], 0.42],   // 外形＋尾フィン
      [[15.6, 5, 12.4, 2.0, 4.6, 2.0, 4.6, 8.0, 12.4, 8.0], 0.45],    // 胴
      [[6.2, 2.0, 7.8, 2.0, 7.8, 8.0, 6.2, 8.0], 0.80],               // 弾帯
      [[17.4, 4.4, 17.4, 5.6, 15.0, 7.0, 15.0, 3.0], 1.0],            // 弾頭キャップ（白熱）
      [[5.2, 4.4, 0.5, 4.4, 0.5, 5.6, 5.2, 5.6], 0.70],               // 噴射口
    ];
    for (const [pts, a] of facets) {
      g.fillStyle(0xffffff, a);
      g.fillPoints(P(pts), true);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // R20 Gate2: ボス汎用弾「プラズマ・ボルト」。texf文法（二段の闇＝穴k/溝j・4段面塗り・recの逆説）を
  // 弾へ翻訳した鏃形。dart/shellと同じ「+Xが進行方向・左が後ろ・右が先端」の向きで定義する。
  // 後ろの二又ノッチ（穴＝未処理のまま切り欠き）と先端の白熱コアで、単色tintでも矢として読める。
  // 設計の全根拠は vortex/scratchpad/render-foe-bolt.mjs のNOTES参照（16×10・r=4基準）。
  makeFoeBolt(key, w, h) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const P = (arr) => this.toPoints(arr);
    const facets = [
      // 全形＝溝jの底。後ろが二又の鏃（ノッチ）。後端の上下角は1px面取り。
      [[1.1, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 1.1, 10,
        0, 8.9, 3.6, 5, 0, 1.1], 0.42],
      // 後板＝矢羽（休符：無処理の平板）。上下の外縁行だけ前板と繋げて溝を塞ぐ。
      [[1.1, 0, 4, 0, 4, 1, 3, 1, 3, 2, 6.6, 5, 3, 8, 3, 9, 4, 9, 4, 10, 1.1, 10,
        0, 8.9, 3.6, 5, 0, 1.1], 0.3103],
      // 前板＝頭（大きな平板）。後板との隙間1pxがそのまま溝になる。
      [[4, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 4, 10, 4, 8, 7.6, 5, 4, 2], 0.3103],
      // 受光ベベル＝前板の先端側の塊。
      [[5.5, 0, 7, 0, 16, 4.4, 16, 5.6, 7, 10, 5.5, 10, 10, 5], 0.45],
      // 芯＝白熱（切っ先まで届く塊）。
      [[11.6, 4, 16, 4, 16, 6, 11.6, 6], 1.0],
    ];
    for (const [pts, a] of facets) {
      g.fillStyle(0xffffff, a);
      g.fillPoints(P(pts), true);
    }
    g.generateTexture(key, w, h);
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

  // --- Wave R4: 武器フォームチェンジ用テクスチャ ---

  // おもちゃボール。丸い玉に星形の穴を1つ空けて「ぷに」っと可愛く（穴は透明＝ハイライト風）。
  makeToy(key, size) {
    const c = size / 2;
    const r = c - 0.5;
    const sr = size * 0.24, sir = sr * 0.42;   // 星ハイライトの外径/内径
    const scx = c - r * 0.28, scy = c - r * 0.28;
    const inStar = (x, y) => {
      const dx = x - scx, dy = y - scy;
      const ang = Math.atan2(dy, dx);
      // 5点星の輪郭内かを角度→半径で判定
      const k = ((ang + Math.PI / 2) % (Math.PI * 2 / 5) + Math.PI * 2 / 5) % (Math.PI * 2 / 5);
      const rr = sir + (sr - sir) * (1 - Math.abs(k - Math.PI / 5) / (Math.PI / 5));
      return dx * dx + dy * dy <= rr * rr;
    };
    this.makeMask(key, size, (x, y) => {
      const dx = x - c, dy = y - c;
      if (dx * dx + dy * dy > r * r) return false;
      return !inStar(x, y);
    });
  }

  // ぺろぺろ巨大ハンマー。太い柄＋大きな長方形の頭（縦向き。実行時に回転して振る）。
  makeHammer(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    const headH = size * 0.34;
    g.fillRect(size * 0.14, size * 0.06, size * 0.72, headH);         // ハンマーの頭
    g.fillRect(size * 0.42, size * 0.06 + headH, size * 0.16, size * 0.86 - headH); // 柄
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ピアニカのおんぷ（8分音符）。左下の音玉＋右上への棒＋旗。
  makeNote(key, size) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size * 0.34, size * 0.74, size * 0.24);              // 音玉
    g.fillRect(size * 0.52, size * 0.14, size * 0.10, size * 0.62);   // 棒
    g.fillPoints(this.toPoints([                                       // 旗
      size * 0.62, size * 0.14, size * 0.86, size * 0.30,
      size * 0.62, size * 0.40,
    ]), true);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // みずでっぽうの水玉（しずく）。下の円＋上のとがり。
  // R22: 回復モビット（マシュモ）の武器テクスチャ。上の2つの丸＋下のV字＝ハート。
  makeHeart(key, size) {
    const c = size / 2;
    const r = size * 0.26;                      // 上の2つの丸の半径
    const cy = size * 0.34;                     // 丸の中心y
    const lx = c - r * 0.92, rx = c + r * 0.92;
    const botY = size * 0.94;                   // 下の尖り
    this.makeMask(key, size, (x, y) => {
      let dx = x - lx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) return true;
      dx = x - rx;
      if (dx * dx + dy * dy <= r * r) return true;
      if (y < cy) return false;
      const frac = (y - cy) / (botY - cy);
      const halfW = r * 1.92 * Math.max(0, 1 - frac);
      return Math.abs(x - c) <= halfW;
    });
  }

  makeDrop(key, size) {
    const c = size / 2;
    const br = size * 0.34;                     // 下の丸の半径
    const bcy = size * 0.62;                    // 下の丸の中心y
    const tipY = size * 0.06;                   // てっぺん
    this.makeMask(key, size, (x, y) => {
      const dx = x - c, dy = y - bcy;
      if (dx * dx + dy * dy <= br * br) return true;      // 下の丸
      if (y >= bcy) return false;
      // てっぺんから丸へ向かって直線的に広がる三角部
      const frac = (y - tipY) / (bcy - tipY);
      const halfW = br * Math.max(0, frac);
      return Math.abs(x - c) <= halfW;
    });
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
