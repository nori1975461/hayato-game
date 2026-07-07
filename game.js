// ============================================================
// HAYATO GAME - 360度回転武器アクション
// 操作: 矢印キー（またはWASD）= 移動 / スペース = 必殺技（ゲージ満タン時）
//       Mキー = おんがくON/OFF / タイトルで C = いろかえ, N = なまえ
// 武器はスコアで15段階進化（ナイフ→…→エクスカリバー）
// ボスを倒すとステージが進んで背景が変わる（草原→火山→宇宙→魔界→天空）
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 480
const H = canvas.height;  // 360

// ---------- ドット絵スプライト定義 ----------
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
  // ===== 神話ボス（32x32・漫画風キャラデザ） =====
  // ヤマタノオロチ: 3つの蛇頭＋とぐろを巻いた胴体
  orochi: [
    '..gGGg....................gGGg..',
    '.gGGGGg..................gGGGGg.',
    '.GRKGGG....gGGGGg........GGGKRG.',
    '.GGGGGG...gGGGGGGg......GGGGGG..',
    '.GWGGG...gGGGGGGGGg.....GGGGWG..',
    '..GGG....GGRKGGKRGG......GGGG...',
    '..gGG....GGGGGGGGGG......GGg....',
    '...gGG...GWGGGGGGWG.....GGg.....',
    '....gGG..GGGGGGGGGG....GGg......',
    '.....gGG..GGGGGGGG....GGg.......',
    '......gGG..gGGGGg....GGg........',
    '.......gGG..GGGG....GGg.........',
    '........gGG.GGGG...GGg..........',
    '.........gGGGGGG..GGg...........',
    '..........gGGGGGGGGg............',
    '...........GGGGGGGG.............',
    '..........GGGGGGGGGG............',
    '.........GGGGGGGGGGGG...........',
    '........GGGGgggGGGGGGG..........',
    '.......GGGGgggggGGGGGGG.........',
    '......GGGGgggggggGGGGGGG........',
    '.....GGGGgggggggggGGGGGG........',
    '....GGGGgggggggggggGGGGGG.......',
    '....GGGGgggggggggggGGGGGGG......',
    '....GGGGGgggggggggGGGGGGGG......',
    '.....GGGGGgggggggGGGGGGGG.......',
    '......GGGGGgggggGGGGGGGG........',
    '.......GGGGGGGGGGGGGGG..........',
    '........GGGGGGGGGGGGGGG.........',
    '..........GGGGGGGGGGGGGG........',
    '.............GGGGGGGGGGGG.......',
    '................GGGGGGGgg.......',
  ],
  // ハデス: 燃える炎の髪＋影の落ちた顔＋赤く光る目＋ボロボロの黒マント
  hades: [
    '..........O..Y....O.............',
    '.......Y..OO.YY..OO..Y..........',
    '......OO.OOOOYYOOOO.OO..........',
    '.....OOOOOYYYYYYYYOOOOO.........',
    '......OOYYYYYYYYYYYYOO..........',
    '.......OYYYYYYYYYYYYO...........',
    '.......SSSSSSSSSSSSSS...........',
    '.......SSKKKKKKKKKKSS...........',
    '.......SKKRRKKKKRRKKS...........',
    '.......SSKKKKKKKKKKSS...........',
    '.......SSSSSSSSSSSSSS...........',
    '.......SSSSKKKKKKSSSS...........',
    '......PPSSSSSSSSSSSSPP..........',
    '.....PPPPSSSSSSSSSSPPPP.........',
    '....PPPPPPPPPPPPPPPPPPPP........',
    '...PPKKKKKKKKKKKKKKKKKKPP.......',
    '...PKKKKKKKKKKKKKKKKKKKKP.......',
    '..PPKKKKKKKOOOOKKKKKKKKKPP......',
    '..PKKKKKKKOOYYOOKKKKKKKKKP......',
    '..PKKKKKKKOYYYYOKKKKKKKKKP......',
    '..PKKKKKKKOOYYOOKKKKKKKKKP......',
    '..PKKKKKKKKOOOOKKKKKKKKKKP......',
    '..PKKKKKKKKKKKKKKKKKKKKKKP......',
    '..PKKKKKKKKKKKKKKKKKKKKKKP......',
    '..PPKKKKKKKKKKKKKKKKKKKKPP......',
    '...PKKKKKKKKKKKKKKKKKKKKP.......',
    '...PPKKKKKKKKKKKKKKKKKKPP.......',
    '....PKKKKKKKKKKKKKKKKKKP........',
    '....PPKKKKKKKKKKKKKKKKPP........',
    '....PKKKKK..KKKK..KKKKKP........',
    '....PKKK.....KK.....KKKP........',
    '....PK.......K........KP........',
  ],
  // ゼウス: 逆立つ銀髪＋白髭＋金の鎧＋青いマント＋手にした稲妻
  zeus: [
    '.....S...S...S..S...............',
    '.....SS..SS..SS.SS.......Y......',
    '......SSSSSSSSSSSS......YY......',
    '.....SSSSSSSSSSSSSS....YY.......',
    '.....SSYYYYYYYYYYSS....YYY......',
    '.....SYYYYYYYYYYYYS.....YY......',
    '.....SYKCYYYYYYCKYS....YY.......',
    '.....SYYYYYYYYYYYYS....YYY......',
    '.....SYYWWWWWWWWYYS.....YY......',
    '......WWWWWWWWWWWW.....YY.......',
    '......WWWWWWWWWWWW......Y.......',
    '.......WWWWWWWWWW...............',
    '....bbYYYYYYYYYYYYbb....Y.......',
    '...bbbYYYYYYYYYYYYbbb..YYY......',
    '..bbbbYYYYYYYYYYYYbbbb..Y.......',
    '..bbbYYYYYYYYYYYYYYbbbYYY.......',
    '..bbbYYYYbYYYYbYYYYbbb..........',
    '..bbYYYYYbbYYbbYYYYYbb..........',
    '..bbYYYYYYbbbbYYYYYYbb..........',
    '..bbYYYYYYYbbYYYYYYYbb..........',
    '..bbbYYYYYYYYYYYYYYbbb..........',
    '...bbYYYYYYYYYYYYYYbb...........',
    '...bbbYYYYYYYYYYYYbbb...........',
    '....bbYYYYYYYYYYYYbb............',
    '....bbbWWWWWWWWWWbbb............',
    '.....bbWWWWWWWWWWbb.............',
    '.....bWWWWWWWWWWWWb.............',
    '.....WWWWWWWWWWWWWW.............',
    '.....WWWWW....WWWWW.............',
    '.....WWWW......WWWW.............',
    '.....WWW........WWW.............',
    '.....WW..........WW.............',
  ],
  // ロキ: 大きく曲がった金の角＋ニヤリと笑う口元＋緑の鎧×紫のマント
  loki: [
    '...YY..................YY.......',
    '..YYY..................YYY......',
    '..YY....................YY......',
    '..YY..GGGGGGGGGGGG......YY......',
    '..YYY.GGGGGGGGGGGG.....YYY......',
    '...YYGGGGGGGGGGGGGG...YYY.......',
    '....YGGGGGGGGGGGGGGY..YY........',
    '.....GGYYYYYYYYYYGG.............',
    '.....GYYKKYYYYKKYYG.............',
    '.....GYYYYYYYYYYYYG.............',
    '.....GYYYYKKKKKYYYG.............',
    '......YYYYYYKKYYYY..............',
    '....ppGGGGGGGGGGGGpp............',
    '...pppGGGGGGGGGGGGppp...........',
    '..ppppGGGYYGGYYGGGpppp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '..ppGGGGGYYYYYYGGGGGpp..........',
    '..ppGGGGGGGGGGGGGGGGpp..........',
    '..ppGGGGGGGGGGGGGGGGpp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '...ppGGGGGGGGGGGGGGpp...........',
    '...pppGGGGGGGGGGGGppp...........',
    '....ppGGGGGGGGGGGGpp............',
    '....ppgGGGGGGGGGGgpp............',
    '.....pgggGGGGGGgggp.............',
    '.....pggg..gg..gggp.............',
    '.....pgg...gg...ggp.............',
    '.....pg....gg....gp.............',
    '......p....gg....p..............',
    '...........gg...................',
    '................................',
  ],
  // オーディン: 翼付き兜＋隻眼（右目に眼帯）＋長い白髭＋槍グングニル
  odin: [
    '...........SSSSSS..........Y....',
    '..........SSSSSSSS.........YY...',
    '..WW......SSSSSSSS.........S....',
    '..WWW....SSSSSSSSSS........S....',
    '..WWWW...SSSSSSSSSS........S....',
    '...WWWW..SSSSSSSSSS........S....',
    '....WWW...SSSSSSSS.........S....',
    '..........YYYYYYYY.........S....',
    '..........YCKYYKKY.........S....',
    '..........YYYYYYYY.........S....',
    '.........WWYYYYYYWW........S....',
    '.........WWWWWWWWWW........S....',
    '........WWWWWWWWWWWW.......S....',
    '........WWWWWWWWWWWW.......S....',
    '.......WWWWWWWWWWWWWW......S....',
    '.......WWWWWWWWWWWWWW......S....',
    '........WWWWWWWWWWWW.......S....',
    '......YYYYWWWWWWWWYYYY.....S....',
    '.....YYYYYWWWWWWWWYYYYY....S....',
    '....YYYYYYWWWWWWWWYYYYYY...SY...',
    '....YYYYYYYWWWWWWYYYYYYY...SY...',
    '....YYYYYYYYWWWWYYYYYYYY...S....',
    '....YYYYYYYYYYYYYYYYYYYY...S....',
    '....YYYYYYYYYYYYYYYYYYYY...S....',
    '.....WWWWYYYYYYYYYYWWWW....S....',
    '.....WWWWWYYYYYYYYWWWWW....S....',
    '......WWWWWWWWWWWWWWWW.....S....',
    '......WWWWWWWWWWWWWWWW.....S....',
    '......WWWWW......WWWWW.....S....',
    '......WWWW........WWWW..........',
    '......WWW..........WWW..........',
    '......WW............WW..........',
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

// remap: 特定パレット文字の色を差し替える（服の色カスタマイズ用）
function drawSprite(name, x, y, scale = 3, remap = null) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = (remap && remap[ch]) || PALETTE[ch];
      ctx.fillRect(px + col * scale, py + row * scale, scale, scale);
    }
  }
}

// ---------- キャラカスタマイズ ----------
const OUTFITS = [
  { name: 'みずいろ', hex: '#41a6f6' },
  { name: 'あか',     hex: '#b13e53' },
  { name: 'みどり',   hex: '#38b764' },
  { name: 'ピンク',   hex: '#ff77a8' },
  { name: 'ゴールド', hex: '#ffcd75' },
];
let outfitIdx = Number(localStorage.getItem('hayato-outfit') || 0) % OUTFITS.length;
let playerName = localStorage.getItem('hayato-name') || '';

function playerRemap() {
  return { C: OUTFITS[outfitIdx].hex };
}

// ---------- 武器の進化テーブル（15段階） ----------
// blades: 刃の本数 / dmg: 1振りのダメージ / flame: 火の玉発射
// lightning: 撃破時に近くの敵へ雷が連鎖 / ice: 当てた敵が凍って遅くなる
// rainbow: 刃が虹色に光る
const WEAPONS = [
  { name: 'ナイフ',         score: 0,     len: 34, width: 3,  spin: 0.090, blades: 1, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '剣',             score: 300,   len: 42, width: 5,  spin: 0.100, blades: 1, dmg: 1, color: '#f4f4f4', edge: '#94b0c2' },
  { name: '槍',             score: 700,   len: 58, width: 4,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#ef7d57' },
  { name: 'ダブルナイフ',   score: 1200,  len: 38, width: 3,  spin: 0.115, blades: 2, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '大剣',           score: 1800,  len: 52, width: 10, spin: 0.120, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4' },
  { name: '大槍',           score: 2500,  len: 74, width: 8,  spin: 0.120, blades: 1, dmg: 1, color: '#38b764', edge: '#ffcd75' },
  { name: '炎の剣',         score: 3300,  len: 60, width: 9,  spin: 0.130, blades: 1, dmg: 1, color: '#ef7d57', edge: '#ffcd75', flame: true },
  { name: 'ダブル炎の剣',   score: 4200,  len: 56, width: 8,  spin: 0.130, blades: 2, dmg: 1, color: '#ef7d57', edge: '#ffcd75', flame: true },
  { name: '雷の槍',         score: 5200,  len: 78, width: 5,  spin: 0.145, blades: 1, dmg: 1, color: '#ffcd75', edge: '#f4f4f4', lightning: true },
  { name: '氷の大剣',       score: 6300,  len: 64, width: 11, spin: 0.130, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4', ice: true },
  { name: 'トリプルソード', score: 7500,  len: 58, width: 7,  spin: 0.130, blades: 3, dmg: 1, color: '#f4f4f4', edge: '#41a6f6' },
  { name: 'ゴールデンソード', score: 9000, len: 70, width: 12, spin: 0.140, blades: 1, dmg: 2, color: '#ffcd75', edge: '#f4f4f4' },
  { name: '虹の剣',         score: 10500, len: 72, width: 9,  spin: 0.150, blades: 2, dmg: 2, rainbow: true, color: '#f4f4f4', edge: '#f4f4f4' },
  { name: 'ドラゴンキラー', score: 12000, len: 76, width: 11, spin: 0.150, blades: 1, dmg: 3, color: '#b13e53', edge: '#ef7d57', flame: true },
  { name: 'エクスカリバー', score: 13500, len: 84, width: 11, spin: 0.160, blades: 3, dmg: 3, rainbow: true, flame: true, lightning: true, color: '#f4f4f4', edge: '#ffcd75' },
];

function weaponForScore(s) {
  let idx = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    if (s >= WEAPONS[i].score) idx = i;
  }
  return idx;
}

// ---------- ステージごとのボス（神話の神々がモチーフ） ----------
// pattern: aim=狙い撃ち / wide=広範囲狙い撃ち / ring=全方向リング /
//          mix=狙い撃ちとリングを交互 / spiral=回転しながら螺旋発射
const BOSS_TYPES = [
  { name: 'ヤマタノオロチ', origin: 'にほんしんわ',   sprite: 'orochi', aura: '#38b764', pattern: 'aim' },
  { name: 'ハデス',         origin: 'ギリシャしんわ', sprite: 'hades',  aura: '#ef7d57', pattern: 'wide' },
  { name: 'ゼウス',         origin: 'ギリシャしんわ', sprite: 'zeus',   aura: '#ffcd75', pattern: 'ring', ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'] },
  { name: 'ロキ',           origin: 'ほくおうしんわ', sprite: 'loki',   aura: '#8b4f8b', pattern: 'mix', ballColors: ['#5d275d', '#8b4f8b', '#38b764'] },
  { name: 'オーディン',     origin: 'ほくおうしんわ', sprite: 'odin',   aura: '#ffcd75', pattern: 'spiral', hpBonus: 10 },
];

function currentBossType() {
  return BOSS_TYPES[(stage - 1) % BOSS_TYPES.length];
}

// ---------- ステージ（ボスを倒すと進む） ----------
const STAGES = [
  { name: 'そうげん', bg: '#1f3323', dot: '#2e5c33' },
  { name: 'かざん',   bg: '#2e1a17', dot: '#5c3230', embers: true },
  { name: 'うちゅう', bg: '#1a1c2c', dot: '#3b5dc9', stars: true },
  { name: 'まかい',   bg: '#241631', dot: '#5d275d', embers: true },
  { name: 'てんくう', bg: '#16303e', dot: '#257179', stars: true },
];

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

let quietKills = false; // 必殺技の全滅処理中は個別の撃破音を鳴らさない

const SFX = {
  kill: (combo) => { if (!quietKills) beep(520 + Math.min(combo, 12) * 45, 0.09, 'triangle', 0.055, 950 + combo * 45); },
  hurt: () => beep(140, 0.25, 'sawtooth', 0.06, 50),
  heart: () => { beep(660, 0.08, 'sine', 0.06); beep(990, 0.12, 'sine', 0.06, null, 70); },
  fire: () => beep(300, 0.06, 'triangle', 0.02, 500),
  bossFire: () => beep(180, 0.3, 'sawtooth', 0.05, 50),
  warn: () => beep(750, 0.16, 'square', 0.05, 480),
  zap: () => beep(1400, 0.08, 'sawtooth', 0.04, 200),
  freeze: () => beep(880, 0.1, 'sine', 0.04, 660),
  special: () => {
    beep(80, 0.7, 'sawtooth', 0.09, 320);
    beep(400, 0.6, 'square', 0.05, 1400, 80);
    [1047, 1319, 1568, 2093].forEach((f, i) => beep(f, 0.2, 'triangle', 0.05, null, 250 + i * 60));
  },
  fanfare: () => {
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => beep(f, 0.12, 'square', 0.05, null, i * 70));
    [1047, 1319, 1568].forEach((f) => beep(f, 0.45, 'triangle', 0.05, null, seq.length * 70));
  },
  bossDie: () => {
    beep(400, 0.5, 'sawtooth', 0.07, 40);
    [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.15, 'square', 0.05, null, 350 + i * 80));
  },
  roar: () => {
    beep(90, 0.8, 'sawtooth', 0.09, 45);
    beep(60, 0.9, 'square', 0.06, 30, 100);
  },
};

// 明るいチップチューンBGM（ステージが進むとキーが上がる）
const BGM_BASS = [48, 48, 55, 48, 45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43];
const BGM_MELODY = [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 74, 0, 79, 0, 83, 0];
// ボス戦専用BGM: 荘厳なオルガン風。短調の和音進行（Am→F→Dm→Em）を
// 低音オクターブ重ね＋鐘の音＋太鼓の鼓動で重厚に鳴らす
const BOSS_CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [50, 53, 57], // Dm
  [52, 55, 59], // Em
];
let bossChordIdx = 0;
let musicFrame = 0;
let musicStep = 0;
const midi2f = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tickMusic() {
  if (!audioCtx || !musicOn || state !== 'playing') return;
  if (warningTimer > 0) return; // WARNING中はサイレンだけ響かせる
  musicFrame++;
  if (bossActive) {
    if (musicFrame % 10 !== 0) return; // ゆったりした重い拍
    const chord = BOSS_CHORDS[bossChordIdx % BOSS_CHORDS.length];
    if (musicStep === 0 || musicStep === 8) {
      // オルガン和音（2オクターブ重ね）＋地を這うベース
      for (const n of chord) {
        beep(midi2f(n), 1.7, 'triangle', 0.02);
        beep(midi2f(n - 12), 1.7, 'sine', 0.02);
      }
      beep(midi2f(chord[0] - 24), 1.7, 'sawtooth', 0.03);
      bossChordIdx++;
    }
    if (musicStep % 4 === 2) {
      // 太鼓の鼓動
      beep(midi2f(chord[0] - 24), 0.18, 'square', 0.035, midi2f(chord[0] - 26));
    }
    if (musicStep === 4 || musicStep === 12) {
      // 高く響く鐘
      beep(midi2f(chord[(musicStep / 4) % 3] + 24), 1.0, 'sine', 0.03);
    }
  } else {
    if (musicFrame % 9 !== 0) return;
    const tr = Math.min((stage - 1) * 2, 8);
    const bass = BGM_BASS[musicStep];
    if (bass) beep(midi2f(bass + tr), 0.13, 'square', 0.018);
    const mel = BGM_MELODY[musicStep];
    if (mel) beep(midi2f(mel + tr), 0.1, 'triangle', 0.02);
  }
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
  if (state === 'title') {
    if (e.key === 'Enter') startGame();
    if (e.key === 'c' || e.key === 'C') {
      outfitIdx = (outfitIdx + 1) % OUTFITS.length;
      localStorage.setItem('hayato-outfit', String(outfitIdx));
      beep(700, 0.07, 'triangle', 0.05);
    }
    if (e.key === 'n' || e.key === 'N') {
      const input = window.prompt('なまえをいれてね（8もじまで）', playerName);
      if (input !== null) {
        playerName = input.trim().slice(0, 8);
        localStorage.setItem('hayato-name', playerName);
      }
    }
  } else if (state === 'playing') {
    if (e.key === ' ' && specialGauge >= 100) specialAttack();
  } else if (state === 'gameover') {
    if (e.key === 'Enter' || e.key === ' ') state = 'title';
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ---------- ゲーム状態 ----------
const PLAYER_SIZE = 24;
const ENEMY_SIZE = 24;
const TANK_SIZE = 32;
const BOSS_SIZE = 160;   // ボスは緑の敵の5倍
const MAX_LIVES = 5;

let state = 'title'; // title / playing / gameover
let gframe = 0;
let player, enemies, particles, flames, fireballs, items, popups, bolts;
let score, lives, weaponIdx, weaponAngle, frame, spawnTimer, invincibleTimer;
let bannerText, bannerTimer, shakeTimer, flameTimer, flashTimer;
let combo, comboTimer, maxCombo;
let bossActive, nextBossScore, bossCount, warningTimer;
let stage, specialGauge;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);

function startGame() {
  player = { x: W / 2 - PLAYER_SIZE / 2, y: H / 2 - PLAYER_SIZE / 2, speed: 2.3 };
  enemies = [];
  particles = [];
  flames = [];
  fireballs = [];
  items = [];
  popups = [];
  bolts = [];
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
  stage = 1;
  specialGauge = 0;
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
    enemies.push({ x, y, speed: 0.35, sprite: 'enemyTank', size: TANK_SIZE, hp: 3, maxHp: 3, points: 300, hitTimer: 0, slowTimer: 0 });
  } else if (score >= 800 && roll < 0.35) {
    enemies.push({ x, y, speed: 1.0 + score / 8000, sprite: 'enemyFast', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 150, hitTimer: 0, slowTimer: 0 });
  } else {
    enemies.push({ x, y, speed: 0.55 + score / 10000, sprite: 'enemy', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 100, hitTimer: 0, slowTimer: 0 });
  }
}

function spawnBoss() {
  bossCount++;
  const type = currentBossType();
  const hp = 20 + bossCount * 8 + (type.hpBonus || 0);
  enemies.push({
    x: W / 2 - BOSS_SIZE / 2,
    y: -BOSS_SIZE - 10,
    speed: 0.25,
    sprite: 'boss',
    size: BOSS_SIZE,
    hp,
    maxHp: hp,
    points: 2000,
    hitTimer: 0,
    slowTimer: 0,
    boss: true,
    fireTimer: type.pattern === 'spiral' ? 100 : 160,
    type,
    altRing: false,
    spiralAngle: 0,
  });
  bossActive = true;
  bossChordIdx = 0;
  musicStep = 0;
  shakeTimer = 15;
  burst(W / 2, 40, PALETTE.p, 30, 3);
  SFX.roar();

  // 雑魚の2/3はドラゴンにおびえて逃げ出す（1/3だけ残って戦う）
  const minions = enemies.filter((e) => !e.boss);
  for (const m of minions) {
    if (Math.random() < 2 / 3) {
      m.flee = true;
      addPopup(m.x + m.size / 2, m.y - 6, '！！', '#f4f4f4', 12);
    }
  }
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

// ---------- 雷の連鎖（雷属性の武器で敵を倒したとき） ----------
function chainLightning(fromX, fromY, depth) {
  if (depth <= 0) return;
  let nearest = null;
  let nearestD2 = 70 ** 2;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const d2 = (e.x + e.size / 2 - fromX) ** 2 + (e.y + e.size / 2 - fromY) ** 2;
    if (d2 < nearestD2) { nearest = e; nearestD2 = d2; }
  }
  if (!nearest) return;
  const tx = nearest.x + nearest.size / 2;
  const ty = nearest.y + nearest.size / 2;
  bolts.push({ x1: fromX, y1: fromY, x2: tx, y2: ty, life: 8 });
  SFX.zap();
  nearest.hp--;
  if (nearest.hp <= 0) {
    killEnemy(nearest, depth - 1);
  } else {
    nearest.hitTimer = 12;
    burst(tx, ty, PALETTE.Y, 5);
  }
}

// ---------- 敵を倒したときの共通処理 ----------
function killEnemy(e, lightningDepth = 2) {
  e.hp = 0;

  combo++;
  comboTimer = 90;
  if (combo > maxCombo) maxCombo = combo;
  const gained = Math.floor(e.points * (1 + (combo - 1) * 0.1));
  score += gained;
  addPopup(e.x + e.size / 2, e.y, `+${gained}`, e.boss ? '#ffcd75' : '#f4f4f4', e.boss ? 16 : 11);

  // 必殺技ゲージが溜まる
  specialGauge = Math.min(100, specialGauge + (e.boss ? 30 : 4));

  if (e.boss) {
    // ボス撃破: 大爆発＋ステージクリア！
    rainbowBurst(e.x + e.size / 2, e.y + e.size / 2, 60, 4);
    flashTimer = 20;
    shakeTimer = 25;
    bossActive = false;
    nextBossScore = Math.max(nextBossScore + 5000, score + 3000);
    items.push({ x: e.x + e.size / 3, y: e.y + e.size / 2, life: 600 });
    items.push({ x: e.x + (e.size * 2) / 3, y: e.y + e.size / 2, life: 600 });
    stage++;
    const st = STAGES[(stage - 1) % STAGES.length];
    bannerText = `ステージ${stage} ${st.name}へ！`;
    bannerTimer = 180;
    // 逃げていた雑魚は戻ってくる
    for (const m of enemies) m.flee = false;
    SFX.bossDie();
  } else {
    burst(e.x + e.size / 2, e.y + e.size / 2, e.sprite === 'enemyFast' ? PALETTE.R : e.sprite === 'enemyTank' ? PALETTE.G : PALETTE.P, 10);
  }

  // 武器の進化チェック
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

  // 雷属性: 近くの敵へ連鎖
  if (WEAPONS[weaponIdx].lightning && lightningDepth > 0 && !e.boss) {
    chainLightning(e.x + e.size / 2, e.y + e.size / 2, lightningDepth);
  }

  // ライフが減っていたら10%でハートを落とす
  if (lives < MAX_LIVES && Math.random() < 0.1) {
    items.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
}

// ---------- 必殺技: 画面全体の大爆発 ----------
function specialAttack() {
  specialGauge = 0;
  flashTimer = 25;
  shakeTimer = 20;
  const pc = playerCenter();
  rainbowBurst(pc.x, pc.y, 80, 5);
  for (let i = 0; i < 6; i++) {
    rainbowBurst(Math.random() * W, Math.random() * H, 15, 3);
  }
  // ボスの炎は全部消える
  fireballs = [];
  // 雑魚は全滅、ボスには5ダメージ
  quietKills = true;
  for (const e of [...enemies]) {
    if (e.hp <= 0) continue;
    if (e.boss) {
      e.hp -= 5;
      e.hitTimer = 24;
      burst(e.x + e.size / 2, e.y + e.size / 2, PALETTE.Y, 20, 3);
      if (e.hp <= 0) killEnemy(e);
    } else {
      killEnemy(e);
    }
  }
  quietKills = false;
  enemies = enemies.filter((e) => e.hp > 0);
  addPopup(pc.x, pc.y - 24, 'ひっさつわざ！！', '#ffcd75', 18);
  SFX.special();
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

  // プレイヤー移動
  let dx = 0, dy = 0;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x + dx * player.speed));
  player.y = Math.max(0, Math.min(H - PLAYER_SIZE, player.y + dy * player.speed));

  const weapon = WEAPONS[weaponIdx];
  weaponAngle += weapon.spin;
  const pc = playerCenter();

  // 炎属性: 各刃の先から火の玉を発射
  if (weapon.flame) {
    flameTimer--;
    if (flameTimer <= 0) {
      for (let b = 0; b < weapon.blades; b++) {
        const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
        flames.push({
          x: pc.x + Math.cos(a) * weapon.len,
          y: pc.y + Math.sin(a) * weapon.len,
          vx: Math.cos(a) * 3,
          vy: Math.sin(a) * 3,
          life: 50,
        });
      }
      flameTimer = 18;
      SFX.fire();
    }
  }

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

  // 敵の出現ペース（ボス戦中は新しい雑魚を増やさない）
  spawnTimer--;
  if (spawnTimer <= 0 && enemies.length < 40 && !bossActive && warningTimer === 0) {
    spawnEnemy();
    spawnTimer = Math.max(16, 55 - Math.floor(score / 300) * 3);
  }

  // 敵の移動＋ボスの炎ブレス
  const bossRef = enemies.find((en) => en.boss);
  for (const e of enemies) {
    if (e.slowTimer > 0) e.slowTimer--;
    const spd = e.speed * (e.slowTimer > 0 ? 0.45 : 1);
    if (e.hitTimer > 0) {
      e.hitTimer--;
      if (!e.boss) continue; // ボスはひるまず動き続ける
    }
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;

    if (e.flee && bossRef) {
      // ドラゴンから逃げる（画面外に出たら消える）
      const away = Math.atan2(ecy - (bossRef.y + bossRef.size / 2), ecx - (bossRef.x + bossRef.size / 2));
      e.x += Math.cos(away) * 2.2;
      e.y += Math.sin(away) * 2.2;
      if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) e.hp = 0;
      continue;
    }

    const angle = Math.atan2(pc.y - ecy, pc.x - ecx);
    e.x += Math.cos(angle) * spd;
    e.y += Math.sin(angle) * spd;

    if (e.boss) {
      const type = e.type;
      // 神様のオーラ（体の周りから立ちのぼる光）
      if (frame % 3 === 0) {
        const auraColor = type.aura || PALETTE.p;
        particles.push({
          x: e.x + Math.random() * e.size,
          y: e.y + e.size - Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.6 - Math.random() * 0.6,
          life: 20 + Math.random() * 15,
          color: auraColor,
        });
      }
      e.fireTimer--;
      const mouthX = ecx;
      const mouthY = e.y + e.size * 0.55;
      if (e.fireTimer < 40 && e.fireTimer > 0) {
        // チャージ演出: 口元に力が集まる
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 30;
        const cc = type.ballColors ? type.ballColors[Math.floor(Math.random() * 3)] : (Math.random() < 0.5 ? PALETTE.O : PALETTE.Y);
        particles.push({
          x: mouthX + Math.cos(a) * d,
          y: mouthY + Math.sin(a) * d,
          vx: -Math.cos(a) * 2.5,
          vy: -Math.sin(a) * 2.5,
          life: 12,
          color: cc,
        });
      }
      if (e.fireTimer <= 0) {
        const shoot = (ang) => {
          fireballs.push({
            x: mouthX, y: mouthY,
            vx: Math.cos(ang) * 1.15,
            vy: Math.sin(ang) * 1.15,
            life: 380,
            colors: type.ballColors || null,
          });
        };
        const aim = Math.atan2(pc.y - mouthY, pc.x - mouthX);
        if (type.pattern === 'aim') {
          const n = Math.min(3 + bossCount, 7);
          for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.28);
        } else if (type.pattern === 'wide') {
          const n = Math.min(5 + bossCount, 9);
          for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.32);
        } else if (type.pattern === 'ring') {
          for (let i = 0; i < 10; i++) shoot((Math.PI * 2 * i) / 10);
        } else if (type.pattern === 'mix') {
          e.altRing = !e.altRing;
          if (e.altRing) {
            for (let i = 0; i < 8; i++) shoot((Math.PI * 2 * i) / 8);
          } else {
            const n = Math.min(3 + bossCount, 7);
            for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.28);
          }
        } else if (type.pattern === 'spiral') {
          for (let i = 0; i < 3; i++) shoot(e.spiralAngle + (Math.PI * 2 * i) / 3);
          e.spiralAngle += 0.5;
        }
        e.fireTimer = type.pattern === 'spiral' ? 55 : Math.max(90, 160 - bossCount * 10);
        shakeTimer = 8;
        SFX.bossFire();
      }
    }
  }
  enemies = enemies.filter((e) => e.hp > 0);

  // ボスの炎の移動＋火の粉の軌跡
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

  // 武器（回転する刃・複数本対応）と敵の当たり判定
  for (const e of enemies) {
    if (e.hp <= 0 || e.hitTimer > 0) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    const eRadius = e.size / 2 + weapon.width / 2;
    let hit = false;
    for (let b = 0; b < weapon.blades && !hit; b++) {
      const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
      for (const t of [0.35, 0.55, 0.75, 0.9, 1.0]) {
        const bx = pc.x + Math.cos(a) * weapon.len * t;
        const by = pc.y + Math.sin(a) * weapon.len * t;
        if ((bx - ecx) ** 2 + (by - ecy) ** 2 < eRadius ** 2) { hit = true; break; }
      }
    }
    if (hit) {
      e.hp -= weapon.dmg;
      if (weapon.ice) {
        e.slowTimer = 140;
        burst(ecx, ecy, PALETTE.C, 6);
        SFX.freeze();
      }
      if (e.hp <= 0) {
        killEnemy(e);
      } else {
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

  // ハートアイテム
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

  // ステージ固有の環境演出
  const st = STAGES[(stage - 1) % STAGES.length];
  if (st.embers && frame % 6 === 0) {
    // 火山・魔界: 下から立ちのぼる火の粉
    particles.push({
      x: Math.random() * W,
      y: H + 4,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.7 - Math.random() * 0.8,
      life: 40 + Math.random() * 30,
      color: Math.random() < 0.5 ? PALETTE.O : PALETTE.R,
    });
  }
  if (st.stars && frame % 90 === 0) {
    // 宇宙・天空: ながれ星
    particles.push({
      x: Math.random() * W,
      y: -4,
      vx: 2.5 + Math.random() * 2,
      vy: 1.5 + Math.random(),
      life: 30,
      color: '#f4f4f4',
    });
  }

  // コンボタイマー
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) combo = 0;
  }

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
  bolts = bolts.filter((b) => --b.life > 0);

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
  for (let b = 0; b < weapon.blades; b++) {
    const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
    const color = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2) % RAINBOW.length] : weapon.color;
    const edge = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2 + 3) % RAINBOW.length] : weapon.edge;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.rotate(a);
    ctx.fillStyle = '#743f39';
    ctx.fillRect(8, -2, 8, 4);
    ctx.fillStyle = color;
    ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, weapon.width);
    ctx.fillStyle = edge;
    ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, Math.max(1, weapon.width / 4));
    ctx.fillStyle = edge;
    ctx.fillRect(weapon.len - 3, -weapon.width / 2 - 1, 4, weapon.width + 2);
    if (weapon.flame && state === 'playing') {
      for (let i = 0; i < 4; i++) {
        const fx = 18 + Math.random() * (weapon.len - 22);
        ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
        ctx.fillRect(fx, -weapon.width / 2 - 3 - Math.random() * 3, 2, 3);
      }
    }
    if (weapon.lightning && state === 'playing' && Math.random() < 0.5) {
      const fx = 18 + Math.random() * (weapon.len - 22);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(fx, weapon.width / 2 + Math.random() * 4, 2, 2);
    }
    if (weapon.ice && state === 'playing' && Math.random() < 0.4) {
      const fx = 18 + Math.random() * (weapon.len - 22);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(fx, -weapon.width / 2 - 2 - Math.random() * 3, 1, 1);
    }
    ctx.restore();
  }
}

function drawBackground() {
  const st = state === 'title' ? STAGES[2] : STAGES[(stage - 1) % STAGES.length];
  ctx.fillStyle = st.bg;
  ctx.fillRect(-8, -8, W + 16, H + 16);
  for (let i = 0; i < 60; i++) {
    const tw = Math.floor((gframe / 12 + i) % 3);
    ctx.fillStyle = tw === 0 ? st.dot : st.bg;
    if (tw === 0) ctx.fillRect((i * 53) % W, (i * 97) % H, 2, 2);
    else {
      ctx.fillStyle = st.dot + '88';
      ctx.fillRect((i * 53) % W, (i * 97) % H, 2, 2);
    }
  }
}

function render() {
  ctx.save();
  // 画面シェイクはプレイ中のみ（ゲームオーバー画面では揺らさない）
  if (shakeTimer > 0 && state === 'playing') {
    const s = Math.min(shakeTimer, 8);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  drawBackground();

  if (state === 'title') {
    const c = RAINBOW[Math.floor(gframe / 8) % RAINBOW.length];
    const bob = Math.sin(gframe * 0.05) * 5;
    drawCenteredText('HAYATO GAME', 64 + bob, c, 38);
    drawCenteredText('やじるしキー：いどう / スペース：ひっさつわざ', 132, '#f4f4f4', 12);
    drawCenteredText('ぶきは 15だんかい しんか！ さいごは…エクスカリバー！？', 152, '#ef7d57', 12);
    drawCenteredText('ボスをたおすと つぎのステージへ すすむ！', 172, '#ff77a8', 12);
    if (Math.floor(gframe / 30) % 2 === 0) {
      drawCenteredText('ENTERキーでスタート！', 205, '#41a6f6', 18);
    }
    // カスタマイズ
    drawSprite('player', W / 2 - 60, 244, 3, playerRemap());
    drawText(`Cキー：いろかえ（${OUTFITS[outfitIdx].name}）`, W / 2 - 24, 250, '#94b0c2', 11);
    drawText(`Nキー：なまえ（${playerName || 'なし'}）`, W / 2 - 24, 266, '#94b0c2', 11);
    drawCenteredText('Mキー：おんがくON/OFF', 296, '#94b0c2', 10);
    if (highScore > 0) drawCenteredText(`ハイスコア: ${highScore}`, 314, '#ffcd75', 12);
    for (let i = 0; i < 4; i++) {
      const ex = ((gframe * 0.6 + i * 130) % (W + 60)) - 30;
      drawSprite(i === 3 ? 'enemyTank' : i % 2 === 0 ? 'enemy' : 'enemyFast', ex, 332, 3);
    }
    ctx.restore();
    return;
  }

  // ハートアイテム
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

  // 雷の連鎖ボルト
  for (const b of bolts) {
    ctx.strokeStyle = Math.random() < 0.5 ? '#ffcd75' : '#f4f4f4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 16;
    const my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 16;
    ctx.lineTo(mx, my);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }

  // 火の玉（プレイヤー側）
  for (const f of flames) {
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = PALETTE.R;
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  }

  // ボスの弾（神様ごとに色が違う: 炎・雷球・闇の球など）
  for (const f of fireballs) {
    const cols = f.colors || ['#b13e53', '#ef7d57', '#ffcd75'];
    ctx.fillStyle = cols[0];
    ctx.fillRect(Math.round(f.x) - 5, Math.round(f.y) - 5, 10, 10);
    ctx.fillStyle = cols[1];
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = cols[2];
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  }

  // 敵（ボスは神様ごとの専用スプライト＋ふわふわ浮遊、凍結中は青いオーバーレイ）
  for (const e of enemies) {
    if (!e.boss && e.hitTimer > 0 && Math.floor(frame / 3) % 2 === 0) continue;
    const sname = e.boss ? e.type.sprite : e.sprite;
    const spr = SPRITES[sname];
    const scale = e.size / spr.length;
    const offX = (e.size - spr[0].length * scale) / 2;
    const bob = e.boss ? Math.sin(gframe * 0.08) * 3 : 0;
    drawSprite(sname, e.x + offX, e.y + bob, scale);
    if (e.slowTimer > 0) {
      ctx.fillStyle = 'rgba(65, 166, 246, 0.35)';
      ctx.fillRect(e.x + offX, e.y + bob, spr[0].length * scale, spr.length * scale);
    }
  }

  drawWeapon();

  // プレイヤー
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    drawSprite('player', player.x, player.y, 3, playerRemap());
    if (playerName) {
      ctx.font = '9px "MS Gothic", monospace';
      const nw = ctx.measureText(playerName).width;
      drawText(playerName, player.x + PLAYER_SIZE / 2 - nw / 2, player.y - 12, '#ffcd75', 9);
    }
  }

  // ポップアップ
  for (const p of popups) {
    drawText(p.text, p.x - 10, p.y, p.color, p.size);
  }

  // HUD
  drawText(`スコア ${score}`, 6, 6, '#f4f4f4', 13);
  drawText(`ぶき: ${WEAPONS[weaponIdx].name}`, 6, 24, WEAPONS[weaponIdx].rainbow ? RAINBOW[Math.floor(gframe / 6) % RAINBOW.length] : WEAPONS[weaponIdx].color, 13);
  drawText(`ステージ${stage}`, 6, 42, '#94b0c2', 11);
  for (let i = 0; i < lives; i++) drawSprite('heart', W - 18 - i * 17, 6, 2);

  // 必殺技ゲージ
  const gaugeW = 90;
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(5, 58, gaugeW + 2, 9);
  ctx.fillStyle = '#29366f';
  ctx.fillRect(6, 59, gaugeW, 7);
  ctx.fillStyle = specialGauge >= 100 ? RAINBOW[Math.floor(gframe / 4) % RAINBOW.length] : '#ff77a8';
  ctx.fillRect(6, 59, gaugeW * (specialGauge / 100), 7);
  if (specialGauge >= 100 && Math.floor(gframe / 20) % 2 === 0) {
    drawText('スペースキーで ひっさつわざ！', 6, 70, '#ffcd75', 11);
  } else {
    drawText('ひっさつ', 6, 70, '#94b0c2', 9);
  }

  // コンボ表示
  if (combo >= 2 && comboTimer > 0) {
    const pulse = 16 + Math.sin(gframe * 0.3) * 2;
    drawCenteredText(`${combo} コンボ！`, 30, RAINBOW[combo % RAINBOW.length], pulse);
  }

  // ボスHPバー
  const boss = enemies.find((e) => e.boss);
  if (boss) {
    const barW = 220;
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(W / 2 - barW / 2 - 2, H - 26, barW + 4, 14);
    ctx.fillStyle = '#5d275d';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW, 10);
    ctx.fillStyle = ratio > 0.4 ? '#b13e53' : '#ef7d57';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW * ratio, 10);
    drawCenteredText(boss.type.name, H - 40, '#b13e53', 12);
  }

  // WARNING演出（神様の名前と神話の出典つき）
  if (warningTimer > 0 && Math.floor(warningTimer / 15) % 2 === 0) {
    const bt = currentBossType();
    ctx.fillStyle = 'rgba(177,62,83,0.25)';
    ctx.fillRect(-8, H / 2 - 48, W + 16, 96);
    drawCenteredText('！！ WARNING ！！', H / 2 - 36, '#b13e53', 26);
    drawCenteredText(`${bt.origin}のかみ`, H / 2 - 2, '#94b0c2', 12);
    drawCenteredText(`${bt.name} しゅつげん！`, H / 2 + 14, '#ffcd75', 17);
  }

  // バナー
  if (bannerTimer > 0 && (bannerTimer > 30 || Math.floor(bannerTimer / 4) % 2 === 0)) {
    const pulse = 20 + Math.sin(gframe * 0.25) * 4;
    const bc = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
    drawCenteredText(bannerText, 58, bc, pulse);
  }

  // 全画面フラッシュ
  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 250, 210, ${(flashTimer / 25) * 0.55})`;
    ctx.fillRect(-8, -8, W + 16, H + 16);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    drawCenteredText('ゲームオーバー', 92, '#b13e53', 30);
    drawCenteredText(`${playerName ? playerName + 'の ' : ''}スコア: ${score}`, 148, '#f4f4f4', 16);
    drawCenteredText(`さいだいコンボ: ${maxCombo}  とうたつぶき: ${WEAPONS[weaponIdx].name}`, 175, '#94b0c2', 12);
    drawCenteredText(`ステージ${stage}まで とうたつ  たおしたボス: ${bossCount}たい`, 195, '#94b0c2', 12);
    if (score >= highScore && score > 0) {
      drawCenteredText('★ハイスコアこうしん！★', 226, RAINBOW[Math.floor(gframe / 8) % RAINBOW.length], 18);
    } else {
      drawCenteredText(`ハイスコア: ${highScore}`, 226, '#ff77a8', 13);
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
