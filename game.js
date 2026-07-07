// ============================================================
// HAYATO GAME - トップビュー・シューティング
// 操作: WASD = 移動 / 矢印キー = その方向にショット
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 320
const H = canvas.height;  // 240

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
  heart: [
    '.MM.MM.',
    'MMMMMMM',
    'MMMMMMM',
    '.MMMMM.',
    '..MMM..',
    '...M...',
  ],
};

function drawSprite(name, x, y) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(px + col, py + row, 1, 1);
    }
  }
}

// ---------- 入力 ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
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
let state = 'title'; // title / playing / gameover
let player, bullets, enemies, particles;
let score, lives, level, frame, spawnTimer, invincibleTimer, shootCooldown;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);

function startGame() {
  player = { x: W / 2 - 4, y: H / 2 - 4, speed: 1.6 };
  bullets = [];
  enemies = [];
  particles = [];
  score = 0;
  lives = 3;
  level = 1;
  frame = 0;
  spawnTimer = 0;
  invincibleTimer = 0;
  shootCooldown = 0;
  state = 'playing';
}

// ---------- 敵の出現 ----------
function spawnEnemy() {
  // 画面の外周からランダムに出現してプレイヤーを追いかける
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -8; }
  else if (side === 1) { x = Math.random() * W; y = H; }
  else if (side === 2) { x = -8; y = Math.random() * H; }
  else { x = W; y = Math.random() * H; }

  // レベルが上がると速い敵（赤）が混ざる
  const fast = level >= 2 && Math.random() < 0.2 + level * 0.05;
  enemies.push({
    x, y,
    speed: fast ? 0.9 + level * 0.06 : 0.45 + level * 0.04,
    sprite: fast ? 'enemyFast' : 'enemy',
    hp: 1,
  });
}

// ---------- パーティクル（やられ演出） ----------
function burst(x, y, color) {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5,
      life: 15,
      color,
    });
  }
}

// ---------- 更新 ----------
function update() {
  if (state !== 'playing') return;
  frame++;

  // プレイヤー移動（WASD）
  let dx = 0, dy = 0;
  if (keys['w'] || keys['W']) dy -= 1;
  if (keys['s'] || keys['S']) dy += 1;
  if (keys['a'] || keys['A']) dx -= 1;
  if (keys['d'] || keys['D']) dx += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  player.x = Math.max(0, Math.min(W - 8, player.x + dx * player.speed));
  player.y = Math.max(0, Math.min(H - 8, player.y + dy * player.speed));

  // ショット（矢印キー：押した方向に発射）
  if (shootCooldown > 0) shootCooldown--;
  if (shootCooldown === 0) {
    let sx = 0, sy = 0;
    if (keys['ArrowUp']) sy = -1;
    else if (keys['ArrowDown']) sy = 1;
    else if (keys['ArrowLeft']) sx = -1;
    else if (keys['ArrowRight']) sx = 1;
    if (sx !== 0 || sy !== 0) {
      bullets.push({ x: player.x + 3, y: player.y + 3, vx: sx * 3.5, vy: sy * 3.5 });
      shootCooldown = 10;
    }
  }

  // 弾の移動
  bullets = bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    return b.x > -4 && b.x < W + 4 && b.y > -4 && b.y < H + 4;
  });

  // 敵の出現ペース（レベルで加速）
  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(20, 70 - level * 6);
  }

  // 敵の移動（プレイヤーを追跡）
  for (const e of enemies) {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;
  }

  // 弾と敵の当たり判定
  for (const b of bullets) {
    for (const e of enemies) {
      if (e.hp > 0 && Math.abs(b.x - (e.x + 4)) < 5 && Math.abs(b.y - (e.y + 4)) < 5) {
        e.hp = 0;
        b.dead = true;
        score += 100;
        burst(e.x + 4, e.y + 4, e.sprite === 'enemyFast' ? PALETTE.R : PALETTE.P);
        // 1000点ごとにレベルアップ
        const newLevel = Math.floor(score / 1000) + 1;
        if (newLevel > level) level = newLevel;
      }
    }
  }
  bullets = bullets.filter((b) => !b.dead);
  enemies = enemies.filter((e) => e.hp > 0);

  // 敵とプレイヤーの当たり判定
  if (invincibleTimer > 0) invincibleTimer--;
  if (invincibleTimer === 0) {
    for (const e of enemies) {
      if (Math.abs(player.x - e.x) < 6 && Math.abs(player.y - e.y) < 6) {
        lives--;
        invincibleTimer = 90;
        burst(player.x + 4, player.y + 4, PALETTE.C);
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
}

// ---------- 描画 ----------
function drawText(text, x, y, color = '#f4f4f4', size = 8) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "MS Gothic", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawCenteredText(text, y, color = '#f4f4f4', size = 8) {
  ctx.font = `${size}px "MS Gothic", monospace`;
  const w = ctx.measureText(text).width;
  drawText(text, (W - w) / 2, y, color, size);
}

function render() {
  // 背景
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(0, 0, W, H);
  // 星空風の点（固定パターン）
  ctx.fillStyle = '#29366f';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 53) % W, (i * 97) % H, 1, 1);
  }

  if (state === 'title') {
    drawCenteredText('HAYATO GAME', 70, '#ffcd75', 24);
    drawCenteredText('WASD:いどう  やじるしキー:ショット', 120, '#f4f4f4', 10);
    drawCenteredText('ENTERキーでスタート！', 150, '#41a6f6', 12);
    if (highScore > 0) drawCenteredText(`ハイスコア: ${highScore}`, 185, '#ff77a8', 10);
    return;
  }

  // パーティクル
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }

  // 弾
  ctx.fillStyle = '#ffcd75';
  for (const b of bullets) {
    ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);
  }

  // 敵
  for (const e of enemies) drawSprite(e.sprite, e.x, e.y);

  // プレイヤー（無敵中は点滅）
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    drawSprite('player', player.x, player.y);
  }

  // HUD
  drawText(`スコア ${score}`, 4, 4, '#f4f4f4', 10);
  drawText(`レベル ${level}`, 4, 16, '#41a6f6', 10);
  for (let i = 0; i < lives; i++) drawSprite('heart', W - 12 - i * 10, 4);

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    drawCenteredText('ゲームオーバー', 80, '#b13e53', 20);
    drawCenteredText(`スコア: ${score}`, 120, '#f4f4f4', 12);
    if (score >= highScore && score > 0) {
      drawCenteredText('★ハイスコアこうしん！★', 140, '#ffcd75', 12);
    } else {
      drawCenteredText(`ハイスコア: ${highScore}`, 140, '#ff77a8', 10);
    }
    drawCenteredText('ENTERキーでタイトルにもどる', 175, '#41a6f6', 10);
  }
}

// ---------- メインループ ----------
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();
