// ============================================================
// HAYATO GAME - 360度回転武器アクション
// 操作: 矢印キー（またはWASD）= 移動
// 武器は自動でキャラの周りを回転し、当たった敵を倒す
// スコアで武器が進化: ナイフ→剣→槍→大剣→大槍→炎の剣
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 480
const H = canvas.height;  // 360

// ---------- ドット絵スプライト定義 ----------
// 文字1つが1ピクセル。'.'は透明
const PALETTE = {
  B: '#29366f', // 濃い青
  b: '#3b5dc9', // 青
  C: '#41a6f6', // 水色
  W: '#f4f4f4', // 白
  Y: '#ffcd75', // 黄（肌）
  O: '#ef7d57', // オレンジ
  R: '#b13e53', // 赤
  G: '#38b764', // 緑
  g: '#257179', // 深緑
  P: '#5d275d', // 紫
  K: '#1a1c2c', // 黒
  M: '#ff77a8', // ピンク
  S: '#94b0c2', // 銀
};

const SPRITES = {
  player: [
    '..KKKK..',
    '.KYYYYK.',
    '.KYKYKY.',
    '.KYYYYK.',
    '..CCCC..',
    '.CCCCCC.',
    '.KC..CK.',
    '.KK..KK.',
  ],
  enemy: [
    '........',
    '..PPPP..',
    '.PPPPPP.',
    'PPWKWKPP',
    'PPPPPPPP',
    'P.PPPP.P',
    '..P..P..',
    '.PP..PP.',
  ],
  enemyFast: [
    '........',
    '..RRRR..',
    '.RRRRRR.',
    'RRWKWKRR',
    'RRRRRRRR',
    'R.RRRR.R',
    '..R..R..',
    '.RR..RR.',
  ],
  enemyTank: [
    '.GGGGGG.',
    'GGGGGGGG',
    'GWKGGWKG',
    'GGGGGGGG',
    'GGgggggG',
    'GGGGGGGG',
    'G.G..G.G',
    'GG.GG.GG',
  ],
  heart: [
    '.MM.MM.',
    'MMMMMMM',
    'MMMMMMM',
    '.MMMMM.',
    '..MMM..',
    '...M...',
  ],
};

function drawSprite(name, x, y, scale = 3) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(px + col * scale, py + row * scale, scale, scale);
    }
  }
}

// ---------- 武器の進化テーブル ----------
const WEAPONS = [
  { name: 'ナイフ',   score: 0,    len: 26, width: 3,  spin: 0.09, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '剣',       score: 500,  len: 38, width: 5,  spin: 0.10, color: '#f4f4f4', edge: '#94b0c2' },
  { name: '槍',       score: 1200, len: 56, width: 4,  spin: 0.11, color: '#ffcd75', edge: '#ef7d57' },
  { name: '大剣',     score: 2500, len: 50, width: 10, spin: 0.12, color: '#41a6f6', edge: '#f4f4f4' },
  { name: '大槍',     score: 4000, len: 72, width: 8,  spin: 0.13, color: '#38b764', edge: '#ffcd75' },
  { name: '炎の剣',   score: 6000, len: 64, width: 10, spin: 0.14, color: '#ef7d57', edge: '#ffcd75', flame: true },
];

function weaponForScore(s) {
  let idx = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    if (s >= WEAPONS[i].score) idx = i;
  }
  return idx;
}

// ---------- 効果音（Web Audio・ファイル不要） ----------
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* 音が出ない環境でもゲームは動かす */ }
  }
}
function beep(freq, dur, type = 'square', vol = 0.04, slideTo = null) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideTo !== null) {
    osc.frequency.linearRampToValueAtTime(slideTo, audioCtx.currentTime + dur);
  }
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}
const SFX = {
  kill: () => beep(320, 0.12, 'square', 0.05, 80),
  hurt: () => beep(120, 0.3, 'sawtooth', 0.06, 40),
  levelup: () => { beep(440, 0.1); setTimeout(() => beep(660, 0.1), 90); setTimeout(() => beep(880, 0.15), 180); },
  heart: () => { beep(660, 0.08, 'sine', 0.06); setTimeout(() => beep(990, 0.12, 'sine', 0.06), 70); },
  fire: () => beep(200, 0.08, 'sawtooth', 0.03, 120),
};

// ---------- 入力 ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  initAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (state === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
  if (state === 'gameover' && (e.key === 'Enter' || e.key === ' ')) {
    state = 'title';
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ---------- ゲーム状態 ----------
const PLAYER_SIZE = 24;  // 8px × 3倍
const ENEMY_SIZE = 24;
const TANK_SIZE = 32;    // 大型敵は8px × 4倍
const MAX_LIVES = 5;

let state = 'title'; // title / playing / gameover
let player, enemies, particles, flames, items;
let score, lives, weaponIdx, weaponAngle, frame, spawnTimer, invincibleTimer;
let bannerText, bannerTimer, shakeTimer, flameTimer;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);

function startGame() {
  player = { x: W / 2 - PLAYER_SIZE / 2, y: H / 2 - PLAYER_SIZE / 2, speed: 2.2 };
  enemies = [];
  particles = [];
  flames = [];
  items = [];
  score = 0;
  lives = 3;
  weaponIdx = 0;
  weaponAngle = 0;
  frame = 0;
  spawnTimer = 0;
  invincibleTimer = 0;
  bannerText = '';
  bannerTimer = 0;
  shakeTimer = 0;
  flameTimer = 0;
  state = 'playing';
}

function playerCenter() {
  return { x: player.x + PLAYER_SIZE / 2, y: player.y + PLAYER_SIZE / 2 };
}

// ---------- 敵の出現 ----------
function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -TANK_SIZE; }
  else if (side === 1) { x = Math.random() * W; y = H; }
  else if (side === 2) { x = -TANK_SIZE; y = Math.random() * H; }
  else { x = W; y = Math.random() * H; }

  const roll = Math.random();
  if (score >= 1500 && roll < 0.12) {
    // 大型敵: 硬い（3回斬る必要あり）・高得点
    enemies.push({ x, y, speed: 0.35, sprite: 'enemyTank', size: TANK_SIZE, hp: 3, maxHp: 3, points: 300, hitTimer: 0 });
  } else if (score >= 800 && roll < 0.35) {
    // 速い敵
    enemies.push({ x, y, speed: 1.0 + score / 8000, sprite: 'enemyFast', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 150, hitTimer: 0 });
  } else {
    enemies.push({ x, y, speed: 0.55 + score / 10000, sprite: 'enemy', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 100, hitTimer: 0 });
  }
}

// ---------- パーティクル（斬った演出） ----------
function burst(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const sp = 1 + Math.random() * 1.5;
    particles.push({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 15 + Math.random() * 10, color });
  }
}

// ---------- 敵を倒したときの共通処理 ----------
function killEnemy(e) {
  e.hp = 0;
  score += e.points;
  burst(e.x + e.size / 2, e.y + e.size / 2, e.sprite === 'enemyFast' ? PALETTE.R : e.sprite === 'enemyTank' ? PALETTE.G : PALETTE.P, 10);

  // 武器の進化チェック
  const newIdx = weaponForScore(score);
  if (newIdx > weaponIdx) {
    bannerText = `ぶきしんか！ ${WEAPONS[weaponIdx].name} → ${WEAPONS[newIdx].name}`;
    bannerTimer = 120;
    weaponIdx = newIdx;
    SFX.levelup();
  } else {
    SFX.kill();
  }

  // ライフが減っていたら10%でハートを落とす
  if (lives < MAX_LIVES && Math.random() < 0.1) {
    items.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
}

// ---------- 更新 ----------
function update() {
  if (state !== 'playing') return;
  frame++;

  // プレイヤー移動（矢印キー、WASDでも可）
  let dx = 0, dy = 0;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x + dx * player.speed));
  player.y = Math.max(0, Math.min(H - PLAYER_SIZE, player.y + dy * player.speed));

  // 武器の回転
  const weapon = WEAPONS[weaponIdx];
  weaponAngle += weapon.spin;
  const pc = playerCenter();

  // 炎の剣: 定期的に剣先から火の玉を発射
  if (weapon.flame) {
    flameTimer--;
    if (flameTimer <= 0) {
      const tipX = pc.x + Math.cos(weaponAngle) * weapon.len;
      const tipY = pc.y + Math.sin(weaponAngle) * weapon.len;
      flames.push({ x: tipX, y: tipY, vx: Math.cos(weaponAngle) * 3, vy: Math.sin(weaponAngle) * 3, life: 50 });
      flameTimer = 18;
      SFX.fire();
    }
  }

  // 火の玉の移動
  flames = flames.filter((f) => {
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    return f.life > 0 && f.x > -10 && f.x < W + 10 && f.y > -10 && f.y < H + 10;
  });

  // 敵の出現ペース（スコアで加速）
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(16, 55 - Math.floor(score / 300) * 3);
  }

  // 敵の移動（プレイヤーを追跡）
  for (const e of enemies) {
    if (e.hitTimer > 0) { e.hitTimer--; continue; } // ノックバック直後は硬直
    const angle = Math.atan2(pc.y - (e.y + e.size / 2), pc.x - (e.x + e.size / 2));
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;
  }

  // 武器（回転する刃）と敵の当たり判定
  // 刃に沿って数点サンプリングして距離判定する
  for (const e of enemies) {
    if (e.hp <= 0 || e.hitTimer > 0) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    const eRadius = e.size / 2 + weapon.width / 2;
    let hit = false;
    for (const t of [0.35, 0.55, 0.75, 0.9, 1.0]) {
      const bx = pc.x + Math.cos(weaponAngle) * weapon.len * t;
      const by = pc.y + Math.sin(weaponAngle) * weapon.len * t;
      if ((bx - ecx) ** 2 + (by - ecy) ** 2 < eRadius ** 2) { hit = true; break; }
    }
    if (hit) {
      e.hp--;
      if (e.hp <= 0) {
        killEnemy(e);
      } else {
        // 硬い敵はノックバック＋一瞬白く光る
        const kb = Math.atan2(ecy - pc.y, ecx - pc.x);
        e.x += Math.cos(kb) * 14;
        e.y += Math.sin(kb) * 14;
        e.hitTimer = 18;
        burst(ecx, ecy, PALETTE.W, 5);
        SFX.kill();
      }
      shakeTimer = 5;
    }
  }

  // 火の玉と敵の当たり判定
  for (const f of flames) {
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      if ((f.x - ecx) ** 2 + (f.y - ecy) ** 2 < (e.size / 2 + 5) ** 2) {
        e.hp--;
        f.life = 0;
        if (e.hp <= 0) killEnemy(e);
        else { e.hitTimer = 12; burst(ecx, ecy, PALETTE.O, 5); }
        break;
      }
    }
  }
  flames = flames.filter((f) => f.life > 0);
  enemies = enemies.filter((e) => e.hp > 0);

  // ハートアイテムの取得と消滅
  items = items.filter((it) => {
    it.life--;
    if ((it.x - pc.x) ** 2 + (it.y - pc.y) ** 2 < 20 ** 2) {
      if (lives < MAX_LIVES) lives++;
      SFX.heart();
      burst(it.x, it.y, PALETTE.M, 8);
      return false;
    }
    return it.life > 0;
  });

  // 敵とプレイヤーの当たり判定
  if (invincibleTimer > 0) invincibleTimer--;
  if (invincibleTimer === 0) {
    for (const e of enemies) {
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      if ((pc.x - ecx) ** 2 + (pc.y - ecy) ** 2 < (PLAYER_SIZE / 2 + e.size / 2 - 4) ** 2) {
        lives--;
        invincibleTimer = 90;
        shakeTimer = 10;
        burst(pc.x, pc.y, PALETTE.C, 12);
        SFX.hurt();
        if (lives <= 0) {
          state = 'gameover';
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('hayato-highscore', String(highScore));
          }
        }
        break;
      }
    }
  }

  // パーティクル更新
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });

  if (bannerTimer > 0) bannerTimer--;
  if (shakeTimer > 0) shakeTimer--;
}

// ---------- 描画 ----------
function drawText(text, x, y, color = '#f4f4f4', size = 10) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "MS Gothic", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawCenteredText(text, y, color = '#f4f4f4', size = 10) {
  ctx.font = `${size}px "MS Gothic", monospace`;
  const w = ctx.measureText(text).width;
  drawText(text, (W - w) / 2, y, color, size);
}

function drawWeapon() {
  const weapon = WEAPONS[weaponIdx];
  const pc = playerCenter();
  ctx.save();
  ctx.translate(pc.x, pc.y);
  ctx.rotate(weaponAngle);
  // 柄（持ち手）
  ctx.fillStyle = '#743f39';
  ctx.fillRect(8, -2, 8, 4);
  // 刃
  ctx.fillStyle = weapon.color;
  ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, weapon.width);
  // 刃の縁（ハイライト）
  ctx.fillStyle = weapon.edge;
  ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, Math.max(1, weapon.width / 4));
  // 先端
  ctx.fillStyle = weapon.edge;
  ctx.fillRect(weapon.len - 3, -weapon.width / 2 - 1, 4, weapon.width + 2);
  // 炎の剣: 刃からゆらめく炎
  if (weapon.flame && state === 'playing') {
    for (let i = 0; i < 4; i++) {
      const fx = 18 + Math.random() * (weapon.len - 22);
      ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
      ctx.fillRect(fx, -weapon.width / 2 - 3 - Math.random() * 3, 2, 3);
    }
  }
  ctx.restore();
}

function render() {
  ctx.save();
  // 画面シェイク
  if (shakeTimer > 0) {
    ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  }

  // 背景
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(-4, -4, W + 8, H + 8);
  // 星空風の点（固定パターン）
  ctx.fillStyle = '#29366f';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect((i * 53) % W, (i * 97) % H, 2, 2);
  }

  if (state === 'title') {
    drawCenteredText('HAYATO GAME', 90, '#ffcd75', 36);
    drawCenteredText('やじるしキー：いどう', 165, '#f4f4f4', 14);
    drawCenteredText('ぶきは じどうで ぐるぐるまわる！', 185, '#f4f4f4', 14);
    drawCenteredText('てきをたおすと ぶきがしんか：', 215, '#94b0c2', 11);
    drawCenteredText('ナイフ→剣→槍→大剣→大槍→炎の剣', 230, '#ef7d57', 12);
    drawCenteredText('ENTERキーでスタート！', 265, '#41a6f6', 16);
    if (highScore > 0) drawCenteredText(`ハイスコア: ${highScore}`, 300, '#ff77a8', 12);
    ctx.restore();
    return;
  }

  // ハートアイテム（消える直前は点滅）
  for (const it of items) {
    if (it.life > 120 || Math.floor(it.life / 6) % 2 === 0) {
      drawSprite('heart', it.x - 7, it.y - 6, 2);
    }
  }

  // パーティクル
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }

  // 火の玉
  for (const f of flames) {
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = PALETTE.R;
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  }

  // 敵（斬られた直後は白点滅）
  for (const e of enemies) {
    if (e.hitTimer > 0 && Math.floor(frame / 3) % 2 === 0) continue;
    drawSprite(e.sprite, e.x, e.y, e.size / 8);
  }

  // 武器（プレイヤーより手前に描く）
  drawWeapon();

  // プレイヤー（無敵中は点滅）
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    drawSprite('player', player.x, player.y, 3);
  }

  // HUD
  drawText(`スコア ${score}`, 6, 6, '#f4f4f4', 13);
  drawText(`ぶき: ${WEAPONS[weaponIdx].name}`, 6, 24, WEAPONS[weaponIdx].color, 13);
  for (let i = 0; i < lives; i++) drawSprite('heart', W - 18 - i * 17, 6, 2);

  // 武器進化バナー
  if (bannerTimer > 0 && (bannerTimer > 30 || Math.floor(bannerTimer / 4) % 2 === 0)) {
    drawCenteredText(bannerText, 60, '#ffcd75', 18);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-4, -4, W + 8, H + 8);
    drawCenteredText('ゲームオーバー', 110, '#b13e53', 30);
    drawCenteredText(`スコア: ${score}`, 170, '#f4f4f4', 16);
    drawCenteredText(`とうたつぶき: ${WEAPONS[weaponIdx].name}`, 195, WEAPONS[weaponIdx].color, 13);
    if (score >= highScore && score > 0) {
      drawCenteredText('★ハイスコアこうしん！★', 225, '#ffcd75', 16);
    } else {
      drawCenteredText(`ハイスコア: ${highScore}`, 225, '#ff77a8', 13);
    }
    drawCenteredText('ENTERキーでタイトルにもどる', 270, '#41a6f6', 13);
  }

  ctx.restore();
}

// ---------- メインループ ----------
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();
