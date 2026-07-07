// ============================================================
// HAYATO GAME - 360度回転武器アクション
// 操作: 矢印キー（またはWASD）= 移動 / Mキー = おんがくON/OFF
// 武器は自動でキャラの周りを回転し、当たった敵を倒す
// スコアで武器が進化: ナイフ→剣→槍→大剣→大槍→炎の剣
// 一定スコアで巨大ボス（紫ドラゴン）が出現して炎を吐いてくる
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
  Y: '#ffcd75', // 黄
  O: '#ef7d57', // オレンジ
  R: '#b13e53', // 赤
  G: '#38b764', // 緑
  g: '#257179', // 深緑
  P: '#5d275d', // 紫
  p: '#8b4f8b', // 明るい紫
  K: '#1a1c2c', // 黒
  M: '#ff77a8', // ピンク
  S: '#94b0c2', // 銀
};

// 派手演出用のレインボーカラー
const RAINBOW = ['#ffcd75', '#ff77a8', '#41a6f6', '#38b764', '#ef7d57', '#f4f4f4'];

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
  // ボス: 紫の巨大ドラゴン（16x16 × 10倍 = 160px、緑の敵の5倍）
  boss: [
    '..Y..........Y..',
    '..YY........YY..',
    '..PPP......PPP..',
    '.PPPPPPPPPPPPPP.',
    '.PPpPPPPPPPPpPP.',
    'PPWWKPPPPPPKWWPP',
    'PPWKKPPPPPPKKWPP',
    'PPPPPPPPPPPPPPPP',
    'PPPPpPPPPPPpPPPP',
    'PPKKPPPPPPPPKKPP',
    'PPKOOKKKKKKOOKPP',
    '.PKOYYOOOOYYOKP.',
    '.PPKKKKKKKKKKPP.',
    '..PPPP.PP.PPPP..',
    '..PP..P..P..PP..',
    '.PP...P..P...PP.',
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
  { name: 'ナイフ',   score: 0,    len: 34, width: 3,  spin: 0.09, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '剣',       score: 500,  len: 42, width: 5,  spin: 0.10, color: '#f4f4f4', edge: '#94b0c2' },
  { name: '槍',       score: 1200, len: 58, width: 4,  spin: 0.11, color: '#ffcd75', edge: '#ef7d57' },
  { name: '大剣',     score: 2500, len: 52, width: 10, spin: 0.12, color: '#41a6f6', edge: '#f4f4f4' },
  { name: '大槍',     score: 4000, len: 74, width: 8,  spin: 0.13, color: '#38b764', edge: '#ffcd75' },
  { name: '炎の剣',   score: 6000, len: 66, width: 10, spin: 0.14, color: '#ef7d57', edge: '#ffcd75', flame: true },
];

function weaponForScore(s) {
  let idx = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    if (s >= WEAPONS[i].score) idx = i;
  }
  return idx;
}

// ---------- 効果音＆BGM（Web Audio・ファイル不要） ----------
let audioCtx = null;
let musicOn = true;

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* 音が出ない環境でもゲームは動かす */ }
  }
}

function beep(freq, dur, type = 'square', vol = 0.04, slideTo = null, delayMs = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

const SFX = {
  // 倒すたびコンボで音がどんどん高くなる（ポップな上昇ブリップ）
  kill: (combo) => beep(520 + Math.min(combo, 12) * 45, 0.09, 'triangle', 0.055, 950 + combo * 45),
  hurt: () => beep(140, 0.25, 'sawtooth', 0.06, 50),
  heart: () => { beep(660, 0.08, 'sine', 0.06); beep(990, 0.12, 'sine', 0.06, null, 70); },
  fire: () => beep(300, 0.06, 'triangle', 0.02, 500),
  bossFire: () => beep(180, 0.3, 'sawtooth', 0.05, 50),
  warn: () => beep(750, 0.16, 'square', 0.05, 480),
  // 豪華ファンファーレ（駆け上がり＋和音フィニッシュ）
  fanfare: () => {
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => beep(f, 0.12, 'square', 0.05, null, i * 70));
    [1047, 1319, 1568].forEach((f) => beep(f, 0.45, 'triangle', 0.05, null, seq.length * 70));
  },
  bossDie: () => {
    beep(400, 0.5, 'sawtooth', 0.07, 40);
    [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.15, 'square', 0.05, null, 350 + i * 80));
  },
};

// 明るいチップチューンBGM（16ステップループ・Mキーで切替）
const BGM_BASS = [48, 48, 55, 48, 45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43];
const BGM_MELODY = [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 74, 0, 79, 0, 83, 0];
let musicFrame = 0;
let musicStep = 0;
const midi2f = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tickMusic() {
  if (!audioCtx || !musicOn || state !== 'playing') return;
  musicFrame++;
  if (musicFrame % 9 !== 0) return; // 約100BPMの16分音符
  const bass = BGM_BASS[musicStep];
  if (bass) beep(midi2f(bass), 0.13, 'square', 0.018);
  const mel = BGM_MELODY[musicStep];
  if (mel) beep(midi2f(mel), 0.1, 'triangle', 0.02);
  musicStep = (musicStep + 1) % 16;
}

// ---------- 入力 ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  initAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'm' || e.key === 'M') musicOn = !musicOn;
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
const BOSS_SIZE = 160;   // ボスは16px × 10倍（緑の敵の5倍）
const MAX_LIVES = 5;

let state = 'title'; // title / playing / gameover
let gframe = 0;      // タイトル画面でも進む演出用フレーム
let player, enemies, particles, flames, fireballs, items, popups;
let score, lives, weaponIdx, weaponAngle, frame, spawnTimer, invincibleTimer;
let bannerText, bannerTimer, shakeTimer, flameTimer, flashTimer;
let combo, comboTimer, maxCombo;
let bossActive, nextBossScore, bossCount, warningTimer;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);

function startGame() {
  player = { x: W / 2 - PLAYER_SIZE / 2, y: H / 2 - PLAYER_SIZE / 2, speed: 2.3 };
  enemies = [];
  particles = [];
  flames = [];
  fireballs = [];
  items = [];
  popups = [];
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
  flashTimer = 0;
  combo = 0;
  comboTimer = 0;
  maxCombo = 0;
  bossActive = false;
  nextBossScore = 3000;
  bossCount = 0;
  warningTimer = 0;
  musicFrame = 0;
  musicStep = 0;
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

function spawnBoss() {
  bossCount++;
  enemies.push({
    x: W / 2 - BOSS_SIZE / 2,
    y: -BOSS_SIZE - 10,
    speed: 0.25,
    sprite: 'boss',
    size: BOSS_SIZE,
    hp: 20 + bossCount * 8,
    maxHp: 20 + bossCount * 8,
    points: 2000,
    hitTimer: 0,
    boss: true,
    fireTimer: 160,
  });
  bossActive = true;
}

// ---------- パーティクル ----------
function burst(x, y, color, count = 8, speed = 1.5) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const sp = speed * (0.7 + Math.random());
    particles.push({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 15 + Math.random() * 12, color });
  }
}

function rainbowBurst(x, y, count = 30, speed = 2.5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: 25 + Math.random() * 25,
      color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    });
  }
}

function addPopup(x, y, text, color = '#ffcd75', size = 11) {
  popups.push({ x, y, text, color, size, life: 45 });
}

// ---------- 敵を倒したときの共通処理 ----------
function killEnemy(e) {
  e.hp = 0;

  // コンボ: 連続で倒すとスコア倍率アップ
  combo++;
  comboTimer = 90;
  if (combo > maxCombo) maxCombo = combo;
  const gained = Math.floor(e.points * (1 + (combo - 1) * 0.1));
  score += gained;
  addPopup(e.x + e.size / 2, e.y, `+${gained}`, e.boss ? '#ffcd75' : '#f4f4f4', e.boss ? 16 : 11);

  if (e.boss) {
    // ボス撃破: 大爆発＋フラッシュ＋ハート2個確定ドロップ
    rainbowBurst(e.x + e.size / 2, e.y + e.size / 2, 60, 4);
    flashTimer = 20;
    shakeTimer = 25;
    bossActive = false;
    nextBossScore = Math.max(nextBossScore + 5000, score + 3000);
    items.push({ x: e.x + e.size / 3, y: e.y + e.size / 2, life: 600 });
    items.push({ x: e.x + (e.size * 2) / 3, y: e.y + e.size / 2, life: 600 });
    bannerText = 'ボスげきは！！';
    bannerTimer = 150;
    SFX.bossDie();
  } else {
    burst(e.x + e.size / 2, e.y + e.size / 2, e.sprite === 'enemyFast' ? PALETTE.R : e.sprite === 'enemyTank' ? PALETTE.G : PALETTE.P, 10);
  }

  // 武器の進化チェック（フラッシュ＋レインボー＋ファンファーレ）
  const newIdx = weaponForScore(score);
  if (newIdx > weaponIdx) {
    bannerText = `ぶきしんか！ ${WEAPONS[weaponIdx].name} → ${WEAPONS[newIdx].name}`;
    bannerTimer = 150;
    weaponIdx = newIdx;
    flashTimer = 15;
    const pc = playerCenter();
    rainbowBurst(pc.x, pc.y, 40, 3);
    SFX.fanfare();
  } else if (!e.boss) {
    SFX.kill(combo);
  }

  // ライフが減っていたら10%でハートを落とす
  if (lives < MAX_LIVES && Math.random() < 0.1) {
    items.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
}

// ---------- プレイヤー被弾の共通処理 ----------
function hurtPlayer() {
  lives--;
  invincibleTimer = 90;
  shakeTimer = 10;
  combo = 0;
  const pc = playerCenter();
  burst(pc.x, pc.y, PALETTE.C, 12);
  SFX.hurt();
  if (lives <= 0) {
    state = 'gameover';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('hayato-highscore', String(highScore));
    }
  }
}

// ---------- 更新 ----------
function update() {
  gframe++;
  tickMusic();
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

  // 火の玉（プレイヤー側）の移動
  flames = flames.filter((f) => {
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    return f.life > 0 && f.x > -10 && f.x < W + 10 && f.y > -10 && f.y < H + 10;
  });

  // ボス出現の警告
  if (!bossActive && warningTimer === 0 && score >= nextBossScore) {
    warningTimer = 120;
  }
  if (warningTimer > 0) {
    warningTimer--;
    if (warningTimer % 30 === 0) SFX.warn();
    if (warningTimer === 1) spawnBoss();
  }

  // 敵の出現ペース（スコアで加速、ボス中は少し控えめ）
  spawnTimer--;
  if (spawnTimer <= 0 && enemies.length < 40) {
    spawnEnemy();
    const base = Math.max(16, 55 - Math.floor(score / 300) * 3);
    spawnTimer = bossActive ? Math.max(base, 34) : base;
  }

  // 敵の移動（プレイヤーを追跡）＋ボスの炎ブレス
  for (const e of enemies) {
    if (e.hitTimer > 0) {
      e.hitTimer--;
      if (!e.boss) continue; // ボスはひるまず動き続ける
    }
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    const angle = Math.atan2(pc.y - ecy, pc.x - ecx);
    e.x += Math.cos(angle) * e.speed;
    e.y += Math.sin(angle) * e.speed;

    if (e.boss) {
      e.fireTimer--;
      // 発射前チャージ: 口に火の粉が集まる演出
      if (e.fireTimer < 40 && e.fireTimer > 0) {
        const mouthX = ecx;
        const mouthY = e.y + e.size * 0.66;
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 30;
        particles.push({
          x: mouthX + Math.cos(a) * d,
          y: mouthY + Math.sin(a) * d,
          vx: -Math.cos(a) * 2.5,
          vy: -Math.sin(a) * 2.5,
          life: 12,
          color: Math.random() < 0.5 ? PALETTE.O : PALETTE.Y,
        });
      }
      if (e.fireTimer <= 0) {
        // プレイヤーに向けて扇状に炎を発射（ボスが強くなるほど本数が増える）
        const mouthX = ecx;
        const mouthY = e.y + e.size * 0.66;
        const aim = Math.atan2(pc.y - mouthY, pc.x - mouthX);
        const n = Math.min(3 + bossCount, 7);
        for (let i = 0; i < n; i++) {
          const spread = (i - (n - 1) / 2) * 0.28;
          fireballs.push({
            x: mouthX, y: mouthY,
            vx: Math.cos(aim + spread) * 1.8,
            vy: Math.sin(aim + spread) * 1.8,
            life: 300,
          });
        }
        e.fireTimer = Math.max(90, 160 - bossCount * 10);
        shakeTimer = 8;
        SFX.bossFire();
      }
    }
  }

  // ボスの炎（敵弾）の移動＋火の粉の軌跡
  fireballs = fireballs.filter((f) => {
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    if (Math.random() < 0.6) {
      particles.push({
        x: f.x + (Math.random() - 0.5) * 6,
        y: f.y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 10 + Math.random() * 8,
        color: Math.random() < 0.5 ? PALETTE.O : PALETTE.Y,
      });
    }
    return f.life > 0 && f.x > -20 && f.x < W + 20 && f.y > -20 && f.y < H + 20;
  });

  // 武器（回転する刃）と敵の当たり判定
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
        // ノックバック（ボスは重いのでほとんど動かない）
        const kb = Math.atan2(ecy - pc.y, ecx - pc.x);
        const kbDist = e.boss ? 3 : 14;
        e.x += Math.cos(kb) * kbDist;
        e.y += Math.sin(kb) * kbDist;
        e.hitTimer = 18;
        burst(ecx, ecy, PALETTE.W, 5);
        SFX.kill(combo);
      }
      shakeTimer = Math.max(shakeTimer, 5);
    }
  }

  // 火の玉（プレイヤー側）と敵の当たり判定
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
      addPopup(it.x, it.y - 10, 'かいふく！', '#ff77a8', 11);
      return false;
    }
    return it.life > 0;
  });

  // 敵・ボスの炎とプレイヤーの当たり判定
  if (invincibleTimer > 0) invincibleTimer--;
  if (invincibleTimer === 0) {
    for (const e of enemies) {
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      const hitR = e.boss ? e.size / 2 - 14 : PLAYER_SIZE / 2 + e.size / 2 - 4;
      if ((pc.x - ecx) ** 2 + (pc.y - ecy) ** 2 < hitR ** 2) {
        hurtPlayer();
        break;
      }
    }
  }
  if (invincibleTimer === 0 && state === 'playing') {
    for (const f of fireballs) {
      if ((f.x - pc.x) ** 2 + (f.y - pc.y) ** 2 < 15 ** 2) {
        f.life = 0;
        hurtPlayer();
        break;
      }
    }
  }

  // コンボタイマー（切れるとコンボリセット）
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) combo = 0;
  }

  // パーティクル・ポップアップ更新
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });
  popups = popups.filter((p) => {
    p.y -= 0.8;
    p.life--;
    return p.life > 0;
  });

  if (bannerTimer > 0) bannerTimer--;
  if (shakeTimer > 0) shakeTimer--;
  if (flashTimer > 0) flashTimer--;
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
    const s = Math.min(shakeTimer, 8);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // 背景
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(-8, -8, W + 16, H + 16);
  // 星空（キラキラまたたく）
  for (let i = 0; i < 60; i++) {
    const tw = Math.floor((gframe / 12 + i) % 3);
    ctx.fillStyle = tw === 0 ? '#3b5dc9' : '#29366f';
    ctx.fillRect((i * 53) % W, (i * 97) % H, 2, 2);
  }

  if (state === 'title') {
    // タイトル: 色が流れるロゴ＋パレードする敵たち
    const c = RAINBOW[Math.floor(gframe / 8) % RAINBOW.length];
    const bob = Math.sin(gframe * 0.05) * 5;
    drawCenteredText('HAYATO GAME', 78 + bob, c, 38);
    drawCenteredText('やじるしキー：いどう', 150, '#f4f4f4', 14);
    drawCenteredText('ぶきは じどうで ぐるぐるまわる！', 170, '#f4f4f4', 14);
    drawCenteredText('ナイフ→剣→槍→大剣→大槍→炎の剣', 198, '#ef7d57', 13);
    drawCenteredText('スコア3000で きょだいボスしゅつげん！？', 218, '#ff77a8', 12);
    if (Math.floor(gframe / 30) % 2 === 0) {
      drawCenteredText('ENTERキーでスタート！', 255, '#41a6f6', 18);
    }
    drawCenteredText('Mキー：おんがくON/OFF', 285, '#94b0c2', 10);
    if (highScore > 0) drawCenteredText(`ハイスコア: ${highScore}`, 308, '#ffcd75', 12);
    // 下を行進する敵たち
    for (let i = 0; i < 4; i++) {
      const ex = ((gframe * 0.6 + i * 130) % (W + 60)) - 30;
      drawSprite(i === 3 ? 'enemyTank' : i % 2 === 0 ? 'enemy' : 'enemyFast', ex, 328, 3);
    }
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

  // 火の玉（プレイヤー側）
  for (const f of flames) {
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = PALETTE.R;
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  }

  // ボスの炎（敵弾）: 大きめの火の玉
  for (const f of fireballs) {
    ctx.fillStyle = PALETTE.R;
    ctx.fillRect(Math.round(f.x) - 5, Math.round(f.y) - 5, 10, 10);
    ctx.fillStyle = PALETTE.O;
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = PALETTE.Y;
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  }

  // 敵（斬られた直後は白点滅、ボスは点滅しない）
  for (const e of enemies) {
    if (!e.boss && e.hitTimer > 0 && Math.floor(frame / 3) % 2 === 0) continue;
    drawSprite(e.sprite, e.x, e.y, e.size / SPRITES[e.sprite].length);
  }

  // 武器（プレイヤーより手前に描く）
  drawWeapon();

  // プレイヤー（無敵中は点滅）
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    drawSprite('player', player.x, player.y, 3);
  }

  // ポップアップ（+100 など）
  for (const p of popups) {
    drawText(p.text, p.x - 10, p.y, p.color, p.size);
  }

  // HUD
  drawText(`スコア ${score}`, 6, 6, '#f4f4f4', 13);
  drawText(`ぶき: ${WEAPONS[weaponIdx].name}`, 6, 24, WEAPONS[weaponIdx].color, 13);
  for (let i = 0; i < lives; i++) drawSprite('heart', W - 18 - i * 17, 6, 2);

  // コンボ表示（大きくポップに脈動）
  if (combo >= 2 && comboTimer > 0) {
    const pulse = 16 + Math.sin(gframe * 0.3) * 2;
    drawCenteredText(`${combo} コンボ！`, 30, RAINBOW[combo % RAINBOW.length], pulse);
  }

  // ボスHPバー
  const boss = enemies.find((e) => e.boss);
  if (boss) {
    const barW = 220;
    const ratio = boss.hp / boss.maxHp;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(W / 2 - barW / 2 - 2, H - 26, barW + 4, 14);
    ctx.fillStyle = '#5d275d';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW, 10);
    ctx.fillStyle = ratio > 0.4 ? '#b13e53' : '#ef7d57';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW * ratio, 10);
    drawCenteredText('ボス', H - 40, '#b13e53', 12);
  }

  // WARNING演出（ボス出現前）
  if (warningTimer > 0 && Math.floor(warningTimer / 15) % 2 === 0) {
    ctx.fillStyle = 'rgba(177,62,83,0.25)';
    ctx.fillRect(-8, H / 2 - 40, W + 16, 80);
    drawCenteredText('！！ WARNING ！！', H / 2 - 28, '#b13e53', 26);
    drawCenteredText('きょだいボス しゅつげん！', H / 2 + 6, '#ffcd75', 15);
  }

  // 武器進化・ボス撃破バナー（脈動する大きな文字）
  if (bannerTimer > 0 && (bannerTimer > 30 || Math.floor(bannerTimer / 4) % 2 === 0)) {
    const pulse = 20 + Math.sin(gframe * 0.25) * 4;
    const bc = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
    drawCenteredText(bannerText, 58, bc, pulse);
  }

  // 全画面フラッシュ（進化・ボス撃破の瞬間）
  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 250, 210, ${(flashTimer / 20) * 0.55})`;
    ctx.fillRect(-8, -8, W + 16, H + 16);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    drawCenteredText('ゲームオーバー', 100, '#b13e53', 30);
    drawCenteredText(`スコア: ${score}`, 155, '#f4f4f4', 16);
    drawCenteredText(`さいだいコンボ: ${maxCombo}  とうたつぶき: ${WEAPONS[weaponIdx].name}`, 180, '#94b0c2', 12);
    if (bossCount > 0) drawCenteredText(`たおしたボス: ${bossCount}たい`, 200, '#ff77a8', 12);
    if (score >= highScore && score > 0) {
      drawCenteredText('★ハイスコアこうしん！★', 230, RAINBOW[Math.floor(gframe / 8) % RAINBOW.length], 18);
    } else {
      drawCenteredText(`ハイスコア: ${highScore}`, 230, '#ff77a8', 13);
    }
    drawCenteredText('ENTERキーでタイトルにもどる', 275, '#41a6f6', 13);
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
