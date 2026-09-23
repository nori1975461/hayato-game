// R20 ボス刷新用リグレンダラ（ゲームコード不変更・プレビュー/検証専用）。
// boss.js の組み立て式（パーツ位置=中心+(ox,oy)×scale・PART_ORIGIN・mirror=水平反転・depth順・
// 背後にグロー2枚 ADD）を忠実に再現して、rig定義から「ゲームに出る姿」を静止画で確かめる。
// 現行6体の「旧」画像づくりと、Workflow 2 の builder が新デザインを自己検証するループの両方で使う。
//
// 使い方:
//   node vortex/scratchpad/render-boss-rig.mjs                 … 現行BOSSES 6体を描く
//   import { renderBoss, writePng, makeCanvas } from ...       … builderが新rig定義を渡して描く
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BG = [0x0a, 0x0a, 0x1e];

// boss.js:17-31 の写し（依存を持たないよう定数を複製。boss.js変更時はここも同期）
export const PART_DEPTH = {
  body: 8, core: 12, armR: 11, armL: 11, legR: 7, legL: 7, cannon: 10,
  dome: 9, rack: 9,
  wingR: 7, wingL: 7, trackR: 7, trackL: 7, baseR: 7, baseL: 7, podR: 7, podL: 7, thruster: 6,
  qlegFL: 7, qlegFR: 7, qlegBL: 7, qlegBR: 7,
};
export const PART_ORIGIN = {
  body: [0.5, 0.5], core: [0.5, 0.5],
  armR: [0.5, 0.12], armL: [0.5, 0.12],
  legR: [0.5, 0.1], legL: [0.5, 0.1],
  cannon: [0.15, 0.5],
  qlegFL: [0.5, 0.1], qlegFR: [0.5, 0.1], qlegBL: [0.5, 0.1], qlegBR: [0.5, 0.1],
};

export const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function makeCanvas(w, h) {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2]; }
  return { w, h, px };
}
function setPx(cv, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 3;
  cv.px[i] = r; cv.px[i + 1] = g; cv.px[i + 2] = b;
}
function addPx(cv, x, y, r, g, b) {   // ADD合成（グロー用）
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 3;
  cv.px[i] = Math.min(255, cv.px[i] + r);
  cv.px[i + 1] = Math.min(255, cv.px[i + 1] + g);
  cv.px[i + 2] = Math.min(255, cv.px[i + 2] + b);
}

// Boot.makeGlow の写し：32px・12段の同心円（各段α0.14×(1-(i-1)/12)の重なり）を
// 「累積アルファ→tint色をADD」で近似する。displaySize = 32×scale。
function drawGlow(cv, cx, cy, scale, tint, alphaMul = 1) {
  const [tr, tg, tb] = hex(tint);
  const R = 16 * scale;
  const steps = 12;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R) continue;
      let a = 0;
      for (let i = steps; i >= 1; i--) {
        const rr = (R * i) / steps;
        if (d <= rr) a += 0.14 * (1 - (i - 1) / steps);
      }
      a = Math.min(1, a) * alphaMul;
      addPx(cv, x, y, tr * a, tg * a, tb * a);
    }
  }
}

// 1パーツをドット矩形として描く（scale倍・mirror対応）。px,py はパーツ「中心」…ではなく
// Phaser の origin 基準点。左端 = px - origin_x*w*scale（mirror時は px - (1-origin_x)*w*scale）。
// rot（ラジアン）は origin 支点の回転（Phaser の setRotation と同じ）。silhouette は単色塗り。
function blitPart(cv, sprite, px, py, scale, mirror, origin, rot = 0, silhouette = null) {
  const rows = sprite.rows, pal = sprite.palette;
  const w = rows[0].length, h = rows.length;
  const sil = silhouette ? hex(silhouette) : null;
  if (!rot) {
    const left = px - (mirror ? (1 - origin[0]) : origin[0]) * w * scale;
    const top = py - origin[1] * h * scale;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][mirror ? (w - 1 - x) : x];
        if (ch === '.' || !pal[ch]) continue;
        const [r, g, b] = sil || hex(pal[ch]);
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          setPx(cv, Math.round(left + x * scale + dx), Math.round(top + y * scale + dy), r, g, b);
        }
      }
    }
    return;
  }
  // 回転あり：出力側の近傍矩形を走査し、逆回転でスプライト座標へ引き戻す（最近傍・プレビュー用途）
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const R = Math.ceil(Math.hypot(w, h) * scale) + 2;
  for (let oy2 = -R; oy2 <= R; oy2++) {
    for (let ox2 = -R; ox2 <= R; ox2++) {
      // origin 支点ローカル座標へ逆回転
      const lx = ox2 * cos + oy2 * sin;
      const ly = -ox2 * sin + oy2 * cos;
      let sx = lx / scale + (mirror ? (1 - origin[0]) : origin[0]) * w;
      const sy = ly / scale + origin[1] * h;
      let xi = Math.floor(sx), yi = Math.floor(sy);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue;
      if (mirror) xi = w - 1 - xi;
      const ch = rows[yi][xi];
      if (ch === '.' || !pal[ch]) continue;
      const [r, g, b] = sil || hex(pal[ch]);
      setPx(cv, Math.round(px + ox2), Math.round(py + oy2), r, g, b);
    }
  }
}

// ボス1体を (cx,cy) 中心に組み立てて描く。
// def = { id, sprites, rig }（enemies.js の BOSSES と同形）
// tier = { spriteScale, glowScale, glowOuter, glowInner }（balance.js の tier と同形）
// opt.armPose: 腕role(armR/armL)へ boss.js と同じ向きの回転をかける（mirror側は逆符号）。
// opt.silhouette: '#RRGGBB' 指定で全パーツ単色（「黒塗りで言い当てられるか」検査用。グローも消す）。
export function renderBoss(cv, def, tier, cx, cy, opt = {}) {
  const s = opt.scaleOverride ?? tier.spriteScale;
  if (opt.glow !== false && !opt.silhouette) {
    drawGlow(cv, cx, cy, tier.glowScale * 1.6 * (s / tier.spriteScale), tier.glowOuter);
    drawGlow(cv, cx, cy, tier.glowScale * 0.9 * (s / tier.spriteScale), tier.glowInner);
  }
  const parts = def.rig.map((r) => ({
    ...r,
    depth: PART_DEPTH[r.role] || 9,
    origin: r.origin || PART_ORIGIN[r.role] || [0.5, 0.5],
  })).sort((a, b) => a.depth - b.depth);
  for (const p of parts) {
    const sprite = def.sprites[p.tex];
    if (!sprite) { console.error(`NG ${def.id}: rig tex "${p.tex}" が sprites に無い`); process.exit(1); }
    let rot = p.rot ? p.rot * (p.mirror ? -1 : 1) : 0;   // パーツ自身の回転（ラジアン・mirror 側は逆符号）＝開いた板に載ったままの月牙（gaika moonsSeated）に使う
    if (opt.armPose && (p.role === 'armR' || p.role === 'armL')) {
      rot = opt.armPose * (p.mirror ? -1 : 1);   // boss.js updateDisp: rot = base * m
    }
    blitPart(cv, sprite, cx + p.ox * s, cy + p.oy * s, s, !!p.mirror, p.origin, rot, opt.silhouette || null);
  }
}

// 単純スプライト（雑魚/主人公の比較用）
export function blitSimple(cv, sprite, x, y, scale) {
  blitPart(cv, sprite, x, y, scale, false, [0, 0]);
}

let TBL = null;
function crc32(buf) {
  if (!TBL) {
    TBL = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TBL[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TBL[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}
export function writePng(cv, file) {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  let o = 0;
  for (let y = 0; y < cv.h; y++) {
    raw[o++] = 0;
    for (let x = 0; x < cv.w * 3; x++) raw[o++] = cv.px[y * cv.w * 3 + x];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0); ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
  console.log('[png]', path.relative(HERE, file) || file, `${cv.w}x${cv.h}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { BOSSES } = await import('../src/data/enemies.js');
  const { BALANCE } = await import('../src/data/balance.js');
  const { ENEMIES } = await import('../src/data/enemies.js');
  const { PLAYER_SPRITES } = await import('../src/data/monsters.js');
  const tierOf = Object.fromEntries(BALANCE.boss.tiers.map((t) => [t.bossId, t]));

  // --- 1. 実プレイ等倍・6体横並び＋主人公/雑魚の相対サイズ（ゲームどおり spriteScale 8-9） ---
  {
    const cv = makeCanvas(1560, 300);
    let x = 130;
    for (const b of BOSSES) {
      renderBoss(cv, b, tierOf[b.id], x, 140);
      x += 250;
    }
    // 左端に主人公(scale3)と雑魚2種(scale2)を基準として置く
    blitSimple(cv, PLAYER_SPRITES[2], 10, 110, 3);
    blitSimple(cv, ENEMIES[0].sprite, 12, 200, 2);
    blitSimple(cv, ENEMIES[4].sprite, 12, 240, 2);
    writePng(cv, path.join(HERE, 'boss-old-play.png'));
  }
  // --- 2. 個別PNG（Artifact埋め込み用・グロー付き・余白つき） ---
  for (const b of BOSSES) {
    const t = tierOf[b.id];
    const cv = makeCanvas(280, 280);
    renderBoss(cv, b, t, 140, 140);
    writePng(cv, path.join(HERE, `boss-old-${b.id}.png`));
  }
  console.log('OK: 現行6体を描画（boss-old-play.png / boss-old-<id>.png ×6）');
}
