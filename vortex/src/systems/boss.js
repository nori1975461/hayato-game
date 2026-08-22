// systems/boss.js — ボス（Wave R3：ロボット6体・6段）の出現・状態機械・弾/ビーム・撃破シネマティック。
// BALANCE.boss.tiers を時間順に処理する。同時に戦うボスは常に1体（前のボスを倒すまで次は出ない）。
// ボスは run.enemies に isBoss エンティティとして載せる（弾/ビーム/dealDamage/killEnemy 経路を流用）。
// 見た目は def.rig で組み、本体そのものが動く。FB#8 で rig 構造をボディタイプ別（UFO/戦闘機/多脚/戦車/
// ミサイルキャリア/大型人型）に作り分けたため、role も型ごとに増えている（dome/wing/qleg/track/rack/pod/base/thruster）。
import { BALANCE } from '../data/balance.js';
import { BOSSES, ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;
const int = (c) => parseInt(c.slice(1), 16);
const D2R = Math.PI / 180;

// パーツ role → 描画depth / origin / アニメ役割。rig.origin があればそちらを優先。未知 role は depth9/中心。
// FB#8: ボディタイプ別 role を追加。背面(履帯/脚/翼/台座=6〜7) → 胴(8) → 天蓋/ラック(9) → 砲(10) → 腕(11) → 単眼(12)。
const PART_DEPTH  = {
  body: 8, core: 12, armR: 11, armL: 11, legR: 7, legL: 7, cannon: 10,
  dome: 9, rack: 9,
  wingR: 7, wingL: 7, trackR: 7, trackL: 7, baseR: 7, baseL: 7, podR: 7, podL: 7, thruster: 6,
  qlegFL: 7, qlegFR: 7, qlegBL: 7, qlegBR: 7,
};
const PART_ORIGIN = {
  body: [0.5, 0.5], core: [0.5, 0.5],
  armR: [0.5, 0.12], armL: [0.5, 0.12],
  legR: [0.5, 0.1], legL: [0.5, 0.1],
  cannon: [0.15, 0.5],
  // 4脚は付け根(上)を支点に振る。翼/天蓋/ラック等はそのまま中心。
  qlegFL: [0.5, 0.1], qlegFR: [0.5, 0.1], qlegBL: [0.5, 0.1], qlegBR: [0.5, 0.1],
};

// 最終ボス「マオウレクス(maou)」専用の登場イベント（§20.3 想定）。
// 実時間で自動進行する（フリーズ／入力待ちにしない＝autotest/CDPを阻害しない）。
// dur 全体を state='maouIntro' として保持し、fadeSec でゆっくり姿を現す。lineXAt/telopAt は
// 登場開始からの経過秒(it = dur - stateT)でセリフ/テロップを1回ずつ出す閾値。
const MAOU_INTRO = {
  dur: 3.6, fadeSec: 1.8,
  line1At: 1.0, line2At: 2.0, telopAt: 2.9,
  dimAlpha: 0.42,     // 登場中の暗幕の不透明度（子ども安全：< 0.5 厳守）
};
// 登場イベントの暗幕/前面化に使う depth。暗幕は雑魚(spr=9/glow=4)・敵弾(11)・プレイヤー(10)より前・
// ボスパーツ/テキストより後ろに敷く。intro 中だけボスパーツ/グロウを INTRO_LIFT 分だけ暗幕より前へ持ち上げる。
const INTRO_DIM_DEPTH = 900;
const INTRO_LIFT = 1000;

export function createBoss(run) {
  const B = BALANCE.boss;
  const W = BALANCE.wave;
  const tiers = B.tiers;
  const killsPerCharge = BALANCE.special.killsPerCharge;
  const bossMap = {};
  for (const d of BOSSES) bossMap[d.id] = d;

  // --- スケジューラ状態（BALANCE は書き換えない・ローカルで進行管理） ---
  const warnedArr = tiers.map(() => false);
  const spawnedArr = tiers.map(() => false);
  let ti = 0;                   // 次に出現させる tier のインデックス
  let allDone = false;          // 全ボス撃破済み（最終ボス撃破で true）

  // --- 現在戦っているボスの状態（spawnFight でセット、endFight でクリア） ---
  let cfg = null;               // 現 tier の設定
  let def = null;               // 現ボスの見た目定義（enemies.js）
  let boss = null;              // run.enemies に載せるエンティティ
  let disp = null;              // { parts, glowP, glowM, muzzle, spriteScale }
  let state = 'idle';
  let stateT = 0;
  let attackIdx = 0;
  let phase2 = false;
  let killing = false;          // 撃破シネマティック中は多重発火を防ぐ
  let lockX = 0, lockY = 0;     // ダッシュ方向ロック
  let aim = 0;                  // 毎フレーム更新するプレイヤー方向角（砲身/弾に共用）
  // 攻撃の連射/掃射用アキュムレータ（stateT基準・決定的）
  let shotAcc = 0, shotIdx = 0, slamFired = false, chainVulcan = false;
  let knuckleFired = false;         // ナックルウェーブの一斉発射を1回だけにするフラグ
  let wire = null;                  // ワイヤーアーム（両拳＋ワイヤー）の表示状態。攻撃終了/撃破で必ず destroy
  let recoilT = 0, recoilAng = 0;   // 発射反動（のけぞり）
  // R21W2: 予告を主人公の一撃で割られた直後の隙。recoilT は描画オフセット専用で state を止めない
  // ため、スタンの代用にはならない。別変数として持つ。
  let bossStagT = 0;
  let introStage = -1;          // maou 登場イベントのセリフ/テロップ進行段（-1=未使用/非final）
  const introEls = [];          // 登場イベントで生成した text（リーク防止に必ず destroy）
  let introDim = null;          // 登場イベント中の暗幕（雑魚を沈めボス/セリフを引き立てる・intro 終了で破棄）
  const bullets = [];           // ボス弾（プレイヤーへ当たる）
  const pool = [];
  let beam = null;              // 波動砲/レーザーの薙ぎビーム（同時1本）
  let beamImg = null;

  ensureTextures();

  // --- Boot.js がボステクスチャ未生成でも動くよう自前生成（全ボスの全パーツ＋弾） ---
  function ensureTextures() {
    for (const d of BOSSES) {
      for (const [k, s] of Object.entries(d.sprites)) makeSprite(`boss_${d.id}_${k}`, s);
    }
    makeMissile('boss_missile', 7, 11);
    makeSaw('boss_cutter', 16);
    makeMuzzle('boss_muzzle', 16);
    makeBeamTex('boss_beam', 8, 16);
    makeFist('boss_maou_fist');       // 最終ボス ワイヤーアームのゴツい鉄拳
    makeTomahawk('boss_tomahawk');    // 最終ボス ナックルウェーブのトマホーク型ミサイル
  }
  // 最終ボスの最強武器「ワイヤーアーム」の拳＝ゴツい装甲鉄拳（右向き＝knuckle が +X 側）。
  // MAOU_PAL 系のガンメタル＋シルバー縁＋赤/シアンのアクセント＋リベット。少し大きめに作る。
  function makeFist(key) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const W = 24, H = 20;
    const gun = 0x3a4150, sil = 0xaeb6c4, drk = 0x171b22, red = 0xc8202c, cy = 0x46e6ff, gold = 0xffd23f;
    // シルバーの外殻（一回り大きい輪郭）＋右端の4つのナックル膨らみ
    g.fillStyle(sil, 1);
    g.fillRoundedRect(1, 2, 21, 16, 4);
    for (let i = 0; i < 4; i++) g.fillCircle(22, 4.5 + i * 4, 2.4);
    // ガンメタルの本体
    g.fillStyle(gun, 1);
    g.fillRoundedRect(3, 4, 18, 12, 3);
    for (let i = 0; i < 4; i++) g.fillCircle(21, 5.5 + i * 4, 1.8);
    // 手首カフ（左）＋シアンのエネルギーバンド
    g.fillStyle(sil, 1); g.fillRect(0, 5, 5, 10);
    g.fillStyle(drk, 1); g.fillRect(2, 5, 1, 10);
    g.fillStyle(cy, 1); g.fillRect(0, 7, 3, 6);
    // 拳を横断する赤いアクセント帯
    g.fillStyle(red, 1); g.fillRect(8, 9, 9, 2);
    // ナックルの黒い溝
    g.fillStyle(drk, 1);
    for (let i = 0; i < 4; i++) g.fillRect(18, 4.5 + i * 4, 1, 2);
    // リベット（四隅の黒点）
    g.fillCircle(6, 6, 1); g.fillCircle(6, 14, 1); g.fillCircle(15, 6, 1); g.fillCircle(15, 14, 1);
    // 上縁の金ハイライト
    g.fillStyle(gold, 1); g.fillRect(5, 3, 12, 1);
    g.generateTexture(key, W, H);
    g.destroy();
  }
  // ナックルウェーブのトマホーク型（BGM-109 巡航ミサイル）シルエット。ノーズ=下向き(+Y 前方＝
  // updateBullets の missile 系と同じ回転規約)。細長い白胴＋赤ノーズ＋横翼＋尾翼＋噴射炎。
  // 弾は白 tint で撃つ（tint:0xffffff）＝下の baked 配色（白/赤/オレンジ）がそのまま出て雑魚から浮く。
  function makeTomahawk(key) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const W = 14, H = 34, cx = 7;
    const white = 0xf2f6ff, sil = 0xb8c0cc, drk = 0x10131a,
      red = 0xe23b2f, dred = 0x8f1a12, orange = 0xff8a2a, yellow = 0xffe24a, cy = 0x46e6ff;
    // 噴射炎（尾・上端）：オレンジ外炎＋黄コア
    g.fillStyle(orange, 1); g.fillTriangle(cx - 3.5, 6, cx + 3.5, 6, cx, 0);
    g.fillStyle(yellow, 1); g.fillTriangle(cx - 1.8, 6, cx + 1.8, 6, cx, 1.5);
    // 後部尾翼（X字・シルバー）
    g.fillStyle(sil, 1);
    g.fillTriangle(cx - 5, 5, cx - 1, 10, cx - 1, 5);
    g.fillTriangle(cx + 5, 5, cx + 1, 10, cx + 1, 5);
    // 円筒胴（白）＋暗い縁取り（背景から分離）
    g.fillStyle(drk, 1); g.fillRect(cx - 3, 6, 6, 21);
    g.fillStyle(white, 1); g.fillRect(cx - 2, 7, 4, 19);
    g.fillStyle(sil, 1); g.fillRect(cx - 2, 7, 1, 19);
    // 胴中央の横翼（シルバー・前寄り）＋暗縁
    g.fillStyle(drk, 1);
    g.fillTriangle(cx - 2, 15, cx - 7, 19, cx - 2, 19);
    g.fillTriangle(cx + 2, 15, cx + 7, 19, cx + 2, 19);
    g.fillStyle(sil, 1);
    g.fillTriangle(cx - 2, 16, cx - 6, 19, cx - 2, 19);
    g.fillTriangle(cx + 2, 16, cx + 6, 19, cx + 2, 19);
    // シアンのバンド＋リベット
    g.fillStyle(cy, 1); g.fillRect(cx - 2, 11, 4, 2);
    g.fillStyle(drk, 1); g.fillRect(cx - 1, 9, 2, 1); g.fillRect(cx - 1, 23, 2, 1);
    // 尖ったノーズ（下・赤）＋暗い先端縁
    g.fillStyle(dred, 1); g.fillTriangle(cx - 3, 26, cx + 3, 26, cx, 34);
    g.fillStyle(red, 1); g.fillTriangle(cx - 2.4, 27, cx + 2.4, 27, cx, 32.5);
    g.generateTexture(key, W, H);
    g.destroy();
  }
  function makeSprite(key, sprite) {
    if (run.textures.exists(key)) return;
    const g = run.make.graphics({ x: 0, y: 0, add: false });
    const rows = sprite.rows, h = rows.length, w = rows[0].length;
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
  function newG() { return run.make.graphics({ x: 0, y: 0, add: false }); }
  // 涙滴型のミサイル（頭が丸く尾が尖る・白で作り実行時 tint）
  function makeMissile(key, w, h) {
    if (run.textures.exists(key)) return;
    const g = newG();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, w / 2, w / 2 - 0.5);
    g.fillPoints([new Phaser.Geom.Point(0.5, w / 2),
      new Phaser.Geom.Point(w - 0.5, w / 2), new Phaser.Geom.Point(w / 2, h)], true);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  // 円鋸（中心円＋6枚の刃）
  function makeSaw(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2, inr = c * 0.5, out = c - 0.5;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, inr);
    for (let i = 0; i < 6; i++) {
      const a0 = (Math.PI * 2 * i) / 6, a1 = a0 + 0.35, am = a0 + 0.17;
      g.fillPoints([
        new Phaser.Geom.Point(c + Math.cos(a0) * inr, c + Math.sin(a0) * inr),
        new Phaser.Geom.Point(c + Math.cos(am) * out, c + Math.sin(am) * out),
        new Phaser.Geom.Point(c + Math.cos(a1) * inr, c + Math.sin(a1) * inr),
      ], true);
    }
    g.generateTexture(key, s, s);
    g.destroy();
  }
  // 放射状の銃口フラッシュ（十字＋斜め）
  function makeMuzzle(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, s * 0.16);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * i) / 4;
      g.fillPoints([
        new Phaser.Geom.Point(c + Math.cos(a + 0.14) * s * 0.12, c + Math.sin(a + 0.14) * s * 0.12),
        new Phaser.Geom.Point(c + Math.cos(a) * (c - 0.5), c + Math.sin(a) * (c - 0.5)),
        new Phaser.Geom.Point(c + Math.cos(a - 0.14) * s * 0.12, c + Math.sin(a - 0.14) * s * 0.12),
      ], true);
    }
    g.generateTexture(key, s, s);
    g.destroy();
  }
  // ビーム帯（幅方向=縦にソフトなグラデ）。origin(0,0.5)・setDisplaySize(len,width) で使う。
  function makeBeamTex(key, w, h) {
    if (run.textures.exists(key)) return;
    const g = newG();
    for (let y = 0; y < h; y++) {
      const t = 1 - Math.abs((y + 0.5) / h - 0.5) * 2;   // 中央1→端0
      g.fillStyle(0xffffff, 0.35 + 0.65 * t);
      g.fillRect(0, y, w, 1);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  function summonHpMult() {
    const t = Math.max(0, Math.min(1, run.elapsed / (W.stepSec * W.steps)));
    return lerp(W.hpMultStart, W.hpMultEnd, t);
  }
  function idleDur(sec) { return sec * (phase2 ? cfg.phase2IdleMult : 1); }
  function aimAngle() { return Math.atan2(run.player.y - boss.y, run.player.x - boss.x); }
  function isTelegraph(st) { return typeof st === 'string' && st.endsWith('Tele'); }
  function resetAttackVars() { shotAcc = 0; shotIdx = 0; slamFired = false; chainVulcan = false; knuckleFired = false; recoilT = 0; }

  // ============ 出現 ============
  function spawnFight(tierCfg) {
    cfg = tierCfg;
    def = bossMap[cfg.bossId];
    phase2 = false;
    killing = false;
    resetAttackVars();

    const ang = run.rng.range(0, Math.PI * 2);
    const x = run.player.x + Math.cos(ang) * cfg.spawnDist;
    const y = run.player.y + Math.sin(ang) * cfg.spawnDist;
    const s = cfg.spriteScale;

    const glowP = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(6)
      .setTint(int(cfg.glowOuter)).setScale(cfg.glowScale * 1.6);
    const glowM = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(6)
      .setTint(int(cfg.glowInner)).setScale(cfg.glowScale * 0.9);

    // rig からパーツ画像を生成（body 背面 → 脚 → 砲身 → 腕 → core 顔 の depth 順）
    const parts = def.rig.map((r) => {
      const img = run.add.image(x, y, `boss_${def.id}_${r.tex}`);
      const origin = r.origin || PART_ORIGIN[r.role] || [0.5, 0.5];
      const depth = PART_DEPTH[r.role] || 9;
      img.setDepth(depth).setOrigin(origin[0], origin[1])
        .setScale(r.mirror ? -s : s, s);
      return { img, role: r.role, ox: r.ox, oy: r.oy, mirror: !!r.mirror, depth };
    });
    const muzzle = run.add.image(x, y, 'boss_muzzle').setBlendMode(ADD).setDepth(11)
      .setTint(int(cfg.glowInner)).setVisible(false).setScale(s * 0.4);
    disp = { parts, glowP, glowM, muzzle, spriteScale: s };

    boss = {
      active: true, isBoss: true, id: ++run._eid, def,
      x, y, color: int(def.color),
      hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius,
      damage: cfg.bodyDamage, isElite: false, slowMark: -1, flashT: 0,
      spr: parts[0].img, glow: glowP,   // releaseEnemy 互換（isBoss なので実際はプールされない）
    };
    run.enemies.push(boss);

    // 最終ボス（maou）は専用の登場イベント（ゆっくり登場＋セリフ2行＋テロップ）から開始する。
    // それ以外の5体は従来どおり即時に戦闘（chase）へ。登場中も boss.active/entity/state は立ち、
    // 実時間で自動進行して数秒で通常戦闘へ戻る（CDP/autotest の出現検出・撃破を阻害しない）。
    if (cfg.final) {
      state = 'maouIntro';
      stateT = MAOU_INTRO.dur;
      introStage = 0;
      spawnIntroDim();                 // 背景の雑魚を暗幕で沈める
      setBossDepthLift(INTRO_LIFT);    // maou 本体を暗幕より前へ＝雑魚に埋もれず主役として見せる
    } else {
      state = 'chase';
      stateT = idleDur(cfg.idleSec.afterSpawn);
    }
    attackIdx = 0;

    run.spawnParticles(x, y, int(def.color), 30);
    run.shake(cfg.final ? 360 : 300, cfg.final ? 6 : 5);
    if (cfg.final) Sound.sfx('bigBoom');            // 登場の"ドゥーン"（重量感／既存SFX）
    if (run.withAudio) Sound.startBgm('boss');      // BGM切替＝登場の合図（warn の静寂→ボス戦BGM）
  }

  // ============ AI ============
  function moveBoss(vx, vy, dt) { boss.x += vx * dt; boss.y += vy * dt; }

  function beginAttack() {
    const a = cfg.attacks[attackIdx];
    // 最終ボスは phase2 で laser の直後に vulcan を割り込ませる（連続コンボ）
    chainVulcan = (a === 'laser' && phase2 && !!cfg.vulcan);
    startAttackByName(a);
  }

  // 攻撃名 → 予告(Tele)ステートへ遷移。summon は即時発火。
  function startAttackByName(a) {
    switch (a) {
      case 'dash':       state = 'dashTele';    stateT = cfg.dash.telegraphSec; break;
      case 'machinegun': state = 'mgTele';      stateT = cfg.machinegun.telegraphSec; break;
      case 'cutter':     state = 'cutterTele';  stateT = cfg.cutter.telegraphSec; break;
      case 'vulcan':     state = 'vulcanTele';  stateT = cfg.vulcan.telegraphSec; break;
      case 'wavecannon': state = 'waveTele';    stateT = cfg.wavecannon.chargeSec; Sound.sfx('specialCharge'); break;
      case 'missile':    state = 'missileTele'; stateT = cfg.missile.telegraphSec; break;
      case 'laser':      state = 'laserTele';   stateT = cfg.laser.chargeSec; Sound.sfx('specialCharge'); break;
      case 'nova':       state = 'novaTele';    stateT = cfg.nova.telegraphSec; Sound.sfx('specialCharge'); break;
      case 'armslam':    state = 'slamTele';    stateT = cfg.armslam.telegraphSec; break;
      case 'knuckle':    state = 'knuckleTele'; stateT = cfg.knuckle.telegraphSec; knuckleFired = false;
                         introText('ナックルウェーブはっしゃ', '#ffd23f', 156, 18, 1); break;
      case 'wirearm':    state = 'wireTele';    stateT = cfg.wirearm.teleSec;
                         introText('ワイヤーアームはっしゃ', '#46e6ff', 156, 18, 1); break;
      case 'ring':       state = 'ringTele';    stateT = cfg.ring.telegraphSec; break;
      case 'summon':     state = 'summonTele'; stateT = cfg.summon.telegraphSec || 0.6; telegraphSummon(); break;
      default:           afterAttack(); break;
    }
  }

  // 攻撃1つが終わったとき。chainVulcan があれば vulcan へ、無ければ待機して次の攻撃へ。
  function afterAttack() {
    if (chainVulcan) { chainVulcan = false; startAttackByName('vulcan'); return; }
    endAttackChase();
  }
  // R21W2: 予告中のボスに手動の一撃を当てると割り込める＝ボス戦でも「倒すのは手動」が効く。
  // ボスによろけは持ち込まない（独自のライフサイクルとHPバーを壊すため）。代わりにこれ。
  function breakTelegraph() {
    if (!boss || !boss.active || !isTelegraph(state)) return false;
    destroyWire();
    if (beamImg) { beamImg.destroy(); beamImg = null; }
    resetAttackVars();
    recoil(aim);
    endAttackChase();                       // 通常の攻撃終了と同じ経路（後始末の漏れを作らない）
    bossStagT = BALANCE.hero.strike.bossBreakSec;
    Sound.sfx('metalSlam');
    return true;
  }

  function endAttackChase() {
    state = 'chase';
    stateT = idleDur(cfg.idleSec.betweenAttacks[attackIdx]);
    attackIdx = (attackIdx + 1) % cfg.attacks.length;
  }

  function updateAI(dt) {
    const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    aim = Math.atan2(dy, dx);
    stateT -= dt;
    if (bossStagT > 0) bossStagT -= dt;   // R21W2

    switch (state) {
      // 最終ボス登場イベント：移動/攻撃はせず、経過秒でセリフ→セリフ→テロップを1回ずつ出す。
      // 視覚のフェードイン/降下は updateDisp 側（maouIntroFx）で担当。stateT<=0 で通常戦闘へ。
      case 'maouIntro': {
        const it = MAOU_INTRO.dur - stateT;
        if (introStage < 1 && it >= MAOU_INTRO.line1At) {
          introStage = 1;
          introText('オマエタチ・・・ハ・・・キケン・・・', '#bff5ff', 108, 16, 3);
        }
        if (introStage < 2 && it >= MAOU_INTRO.line2At) {
          introStage = 2;
          introText('ハイジョ・・・スル・・・', '#ff7a7a', 140, 16, 3);
        }
        if (introStage < 3 && it >= MAOU_INTRO.telopAt) {
          introStage = 3;
          introText('【マオウレクスが現れた】', '#ffffff', 186, 22, 5);
          run.shake(220, 4);
          Sound.sfx('bigBoom');   // 「現れた」の一撃感（既存SFX）
        }
        if (stateT <= 0) endIntro();
        break;
      }

      case 'chase':
        moveBoss(nx * cfg.chaseSpeed, ny * cfg.chaseSpeed, dt);
        if (stateT <= 0) beginAttack();
        break;

      case 'dashTele':
        lockX = nx; lockY = ny;
        if (stateT <= 0) { state = 'dash'; stateT = cfg.dash.durationSec; }
        break;
      case 'dash': {
        const sp = cfg.dash.speed * (phase2 ? cfg.phase2DashSpeedMult : 1);
        moveBoss(lockX * sp, lockY * sp, dt);
        if (stateT <= 0) afterAttack();
        break;
      }

      case 'mgTele':
        if (stateT <= 0) { state = 'mgFire'; stateT = cfg.machinegun.burstSec; shotAcc = 0; shotIdx = 0; }
        break;
      case 'mgFire': {
        const mg = cfg.machinegun;
        shotAcc += dt;
        while (shotAcc >= mg.shotInterval) {
          shotAcc -= mg.shotInterval;
          const a = aim + Math.sin(shotIdx * 1.7) * (mg.spreadDeg * D2R);
          const t = tip();
          spawnBullet2(t.x, t.y, Math.cos(a) * mg.bulletSpeed, Math.sin(a) * mg.bulletSpeed,
            { radius: mg.bulletRadius, damage: mg.damage, life: mg.lifeSec });
          if (shotIdx % 3 === 0) Sound.sfx('shoot');
          shotIdx++;
        }
        if (stateT <= 0) afterAttack();
        break;
      }

      case 'cutterTele':
        if (stateT <= 0) { fireCutters(); afterAttack(); }
        break;

      case 'vulcanTele':
        if (stateT <= 0) {
          const v = cfg.vulcan;
          state = 'vulcanFire'; stateT = v.bursts * v.perBurst * 0.05 + 0.2; shotAcc = 0; shotIdx = 0;
        }
        break;
      case 'vulcanFire': {
        const v = cfg.vulcan, total = v.bursts * v.perBurst;
        shotAcc += dt;
        while (shotAcc >= 0.05 && shotIdx < total) {
          shotAcc -= 0.05;
          const a = aim + Math.sin(shotIdx * 0.5) * (v.sweepDeg * D2R);
          const t = tip();
          spawnBullet2(t.x, t.y, Math.cos(a) * v.bulletSpeed, Math.sin(a) * v.bulletSpeed,
            { radius: v.bulletRadius, damage: v.damage, life: v.lifeSec });
          if (shotIdx % 2 === 0) { Sound.sfx('shoot'); run.shake(50, 2); }
          shotIdx++;
        }
        if (shotIdx >= total && stateT <= 0) afterAttack();
        break;
      }

      case 'waveTele':
        if (stateT <= 0) fireWave();
        break;
      case 'waveFire':
        if (stateT <= 0) afterAttack();
        break;

      case 'missileTele':
        if (stateT <= 0) { fireMissiles(); afterAttack(); }
        break;

      case 'laserTele':
        if (stateT <= 0) fireLaser();
        break;
      case 'laserFire':
        if (stateT <= 0) afterAttack();
        break;

      case 'novaTele':
        if (stateT <= 0) {
          const nv = cfg.nova;
          state = 'novaFire'; stateT = nv.waves * nv.waveInterval + 0.1;
          shotAcc = 0; shotIdx = 0;
          whiteFlash(0.32); Sound.sfx('bigBoom'); run.shake(220, 6);   // 起爆の一瞬だけフラッシュ（<0.5）
        }
        break;
      case 'novaFire': {
        const nv = cfg.nova;
        shotAcc += dt;
        while (shotAcc >= nv.waveInterval && shotIdx < nv.waves) {
          shotAcc -= nv.waveInterval;
          fireNovaWave(shotIdx);
          shotIdx++;
        }
        if (shotIdx >= nv.waves && stateT <= 0) afterAttack();
        break;
      }

      case 'slamTele':
        if (stateT <= 0) { state = 'slamHit'; stateT = cfg.armslam.slamSec; slamFired = false; }
        break;
      case 'slamHit': {
        const sk = cfg.armslam;
        if (!slamFired && stateT <= sk.slamSec - 0.15) { slamFired = true; doSlam(); }
        if (stateT <= 0) afterAttack();
        break;
      }

      // ナックルウェーブ：予告（腕を振り上げ）→叩き合わせ（clap）の瞬間にトマホーク一斉発射。
      case 'knuckleTele':
        if (stateT <= 0) { state = 'knuckleHit'; stateT = cfg.knuckle.clapSec; knuckleFired = false; }
        break;
      case 'knuckleHit':
        if (!knuckleFired && stateT <= cfg.knuckle.clapSec - 0.15) { knuckleFired = true; doKnuckle(); }
        if (stateT <= 0) afterAttack();
        break;

      // ワイヤーアーム：予告（両腕を後方へ引き絞る）→射出（拳が伸びる・マイルド追尾）→収縮（手繰り戻す）。
      case 'wireTele':
        if (stateT <= 0) startWireShot();
        break;
      case 'wireShot':
        updateWire(dt);
        break;
      case 'wireBack':
        updateWireBack(dt);
        if (stateT <= 0) { destroyWire(); afterAttack(); }
        break;

      case 'ringTele':
        if (stateT <= 0) { fireRing(); afterAttack(); }
        break;

      case 'summonTele':
        if (stateT <= 0) { doSummon(); afterAttack(); }
        break;

      default:
        break;
    }
  }

  // 砲口（プレイヤー方向の本体外周）
  function tip() {
    const bd = boss.radius * 1.05;
    return { x: boss.x + Math.cos(aim) * bd, y: boss.y + Math.sin(aim) * bd };
  }

  function enterPhase2() {
    phase2 = true;
    run.shake(300, 5);
    run.spawnParticles(boss.x, boss.y, 0xff3355, 24);
    if (cfg.rageText) run.floatText(boss.x, boss.y - 40, cfg.rageText, '#ff5e5e');
  }

  // ============ 攻撃 ============
  function fireRing() {
    const count = phase2 ? cfg.ring.count2 : cfg.ring.count;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      spawnBullet2(boss.x, boss.y, Math.cos(a) * cfg.ring.bulletSpeed, Math.sin(a) * cfg.ring.bulletSpeed,
        { radius: cfg.ring.bulletRadius, damage: cfg.ring.damage, life: cfg.ring.lifeSec });
    }
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(boss.x, boss.y, aim, int(cfg.bulletTint));
    Sound.sfx('shoot');
  }

  // カッター：扇状に円鋸を射出（returns でブーメラン軌道）
  function fireCutters() {
    const ck = cfg.cutter;
    const base = aim, mid = (ck.count - 1) / 2;
    for (let i = 0; i < ck.count; i++) {
      const a = base + (i - mid) * (ck.spreadDeg * D2R);
      spawnBullet2(boss.x, boss.y, Math.cos(a) * ck.speed, Math.sin(a) * ck.speed,
        { radius: ck.bladeRadius, damage: ck.damage, life: ck.lifeSec,
          kind: 'cutter', spin: ck.spinSpeed, returns: ck.returns });
    }
    const ct = tip();
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(ct.x, ct.y, aim, int(cfg.bulletTint));
    Sound.sfx('shoot');
  }

  // ミサイル：上方へ射出→弱ホーミング。走れば振り切れる旋回上限つき。
  function fireMissiles() {
    const mk = cfg.missile, mid = (mk.count - 1) / 2;
    for (let i = 0; i < mk.count; i++) {
      const sx = (i - mid) * 45;
      spawnBullet2(boss.x, boss.y, sx, -mk.launchSpeed,
        { radius: mk.radius, damage: mk.damage, life: mk.lifeSec, kind: 'missile',
          maxTurn: mk.maxTurnDeg * D2R, speed: mk.speed, blast: mk.blastDamage });
    }
    Sound.sfx('beam');
    recoil(aim);                                        // 発射の反動でボス本体がのけぞる
    const mt = tip();
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(mt.x, mt.y, aim, int(cfg.bulletTint));
    run.spawnParticles(mt.x, mt.y, int(cfg.bulletTint), 10);
  }

  // 波動砲：前方へ太い短命ビームを sweepDeg 分だけ薙ぐ
  function fireWave() {
    const wc = cfg.wavecannon, half = wc.sweepDeg * 0.5 * D2R;
    startBeam(aim - half, aim + half, wc.beamLength, wc.beamWidth, wc.damage, wc.activeSec);
    whiteFlash(0.4); Sound.sfx('bigBoom'); recoil(aim);
    state = 'waveFire'; stateT = wc.activeSec;
  }

  // 亜空間レーザー：極太貫通ビームを sweepFrom→sweepTo へゆっくり回転薙ぎ
  function fireLaser() {
    const lk = cfg.laser;
    startBeam(aim + lk.sweepFromDeg * D2R, aim + lk.sweepToDeg * D2R, lk.beamLength, lk.beamWidth, lk.damage, lk.activeSec);
    whiteFlash(0.45); Sound.sfx('bigBoom'); recoil(aim);
    state = 'laserFire'; stateT = lk.activeSec;
  }

  // 重力弾幕ノヴァ（最終ボス専用の特別攻撃）：全方位弾を波ごとに spinDeg ずつ回して螺旋状に放つ。
  // 弾はやや遅めで隙間を縫って避けられるが、連続波で画面全体に弾幕の花を咲かせる（派手・巨体からの迫力）。
  function fireNovaWave(w) {
    const nv = cfg.nova, base = w * nv.spinDeg * D2R;
    for (let i = 0; i < nv.perWave; i++) {
      const a = base + (Math.PI * 2 * i) / nv.perWave;
      spawnBullet2(boss.x, boss.y, Math.cos(a) * nv.bulletSpeed, Math.sin(a) * nv.bulletSpeed,
        { radius: nv.bulletRadius, damage: nv.damage, life: nv.lifeSec });
    }
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(boss.x, boss.y, base, int(cfg.bulletTint));
    Sound.sfx('shoot'); run.shake(60, 3);
    run.spawnParticles(boss.x, boss.y, int(cfg.bulletTint), 12);
  }

  // アームスラム：叩きつけの瞬間に衝撃波リング＋至近メレー
  function doSlam() {
    const sk = cfg.armslam;
    for (let i = 0; i < sk.shockCount; i++) {
      const a = (Math.PI * 2 * i) / sk.shockCount;
      spawnBullet2(boss.x, boss.y, Math.cos(a) * sk.shockSpeed, Math.sin(a) * sk.shockSpeed,
        { radius: sk.shockRadius, damage: sk.shockDamage, life: 2.5 });
    }
    const d = Math.hypot(run.player.x - boss.x, run.player.y - boss.y);
    if (d <= sk.meleeRadius + run.player.radius) run.hitPlayer(sk.meleeDamage, boss.x, boss.y);
    run.shake(280, 7); Sound.sfx('bigBoom');
    run.spawnParticles(boss.x, boss.y, int(cfg.bulletTint), 22);
  }

  // ナックルウェーブ（最終ボス専用）：両拳を叩き合わせた瞬間に、トマホーク型ミサイルを扇状へ一斉発射。
  function doKnuckle() {
    const kk = cfg.knuckle;
    const half = kk.spreadDeg * 0.5 * D2R, mid = (kk.count - 1) / 2;
    for (let i = 0; i < kk.count; i++) {
      const a = aim + (mid > 0 ? (i - mid) / mid : 0) * half;
      spawnBullet2(boss.x, boss.y, Math.cos(a) * kk.bulletSpeed, Math.sin(a) * kk.bulletSpeed,
        { radius: kk.radius, damage: kk.damage, life: kk.lifeSec, kind: 'tomahawk', tint: 0xffffff });
    }
    whiteFlash(0.34); Sound.sfx('knuckle'); Sound.sfx('missileFly'); Sound.sfx('shoot');
    run.shake(240, 6); recoil(aim);
    run.spawnParticles(boss.x, boss.y, int(cfg.bulletTint), 20);
  }

  // ============ ワイヤーアーム（最強武器・ロケットパンチ／両腕） ============
  // 拳(2枚)＋ワイヤー(Graphics)を生成/表示。生成物は attack 終了時と destroyDisp/撃破時の両方で destroy。
  function ensureWire() {
    const s = disp.spriteScale;
    if (!wire) {
      wire = { arms: [], g: run.add.graphics().setDepth(11) };
      for (const side of [1, -1]) {   // 右拳→左拳の2本
        // 拳は前腕(armR 8px×s)より少し大きめの鉄拳（24px×s*0.5≒96px＝ボス本体に埋もれず殴りが映える）
        const img = run.add.image(0, 0, 'boss_maou_fist').setDepth(13).setOrigin(0.5, 0.5).setScale(s * 0.5);
        wire.arms.push({ side, sx: 0, sy: 0, fx: 0, fy: 0, ang: 0, len: 0, hit: false, backFrom: 0, img });
      }
    }
    wire.g.setVisible(true);
    for (const arm of wire.arms) arm.img.setVisible(true);
  }
  // 肩(拳の付け根)のワールド座標。armR ox:11 / oy:-1（左腕はミラー）に合わせる。
  function shoulderOf(arm) {
    const s = disp.spriteScale;
    return { x: boss.x + arm.side * 11 * s, y: boss.y - 1 * s };
  }
  function startWireShot() {
    state = 'wireShot'; stateT = cfg.wirearm.shotSec;
    ensureWire();
    const a0 = aimAngle();
    for (const arm of wire.arms) {
      const sh = shoulderOf(arm);
      arm.len = 0; arm.hit = false; arm.ang = a0;
      arm.sx = sh.x; arm.sy = sh.y; arm.fx = sh.x; arm.fy = sh.y;
    }
    Sound.sfx('wireShot'); Sound.sfx('wireFly'); run.shake(120, 4);
    drawWire();
  }
  function updateWire(dt) {
    const wk = cfg.wirearm;
    for (const arm of wire.arms) {
      const sh = shoulderOf(arm); arm.sx = sh.x; arm.sy = sh.y;
      if (!arm.hit && arm.len < wk.maxLen) {
        // マイルド追尾（予告で方向が読め、横に動けば振り切れる余地を残す＝理不尽にしない）
        const desired = Math.atan2(run.player.y - arm.fy, run.player.x - arm.fx);
        const diff = Phaser.Math.Angle.Wrap(desired - arm.ang);
        const maxStep = wk.turnDeg * D2R * dt;
        arm.ang += Math.max(-maxStep, Math.min(maxStep, diff));
        arm.len = Math.min(wk.maxLen, arm.len + wk.extendSpeed * dt);
      }
      arm.fx = arm.sx + Math.cos(arm.ang) * arm.len;
      arm.fy = arm.sy + Math.sin(arm.ang) * arm.len;
      // 命中（拳先端の円が主人公に触れたら1回だけ命中）
      if (!arm.hit) {
        const dx = arm.fx - run.player.x, dy = arm.fy - run.player.y;
        const rr = wk.fistRadius + run.player.radius;
        if (dx * dx + dy * dy <= rr * rr) {
          arm.hit = true; run.hitPlayer(wk.damage, arm.fx, arm.fy);
          Sound.sfx('hit'); run.spawnParticles(arm.fx, arm.fy, int(cfg.bulletTint), 10);
        }
      }
    }
    drawWire();
    // 全拳が最大到達 or 命中 or 尺切れ → 大きな衝撃演出を挟んで収縮へ
    const reached = wire.arms.every((a) => a.hit || a.len >= wk.maxLen);
    if (reached || stateT <= 0) startWireBack();
  }
  function startWireBack() {
    state = 'wireBack'; stateT = cfg.wirearm.backSec;
    for (const arm of wire.arms) arm.backFrom = arm.len;
    // 命中/最大到達の一撃感：大きな衝撃音＋強めシェイク＋whiteFlash(<0.5)＋一瞬のヒットストップ
    Sound.sfx('metalSlam'); run.shake(260, 7); whiteFlash(0.4);
    if (run.freezeT != null && !run.cinematic) run.freezeT = Math.max(run.freezeT, 0.07);
    for (const arm of wire.arms) run.spawnParticles(arm.fx, arm.fy, int(cfg.bulletTint), 12);
  }
  function updateWireBack(dt) {
    const wk = cfg.wirearm;
    const t = clamp01(1 - stateT / wk.backSec);   // 0→1
    for (const arm of wire.arms) {
      const sh = shoulderOf(arm); arm.sx = sh.x; arm.sy = sh.y;
      arm.len = lerp(arm.backFrom, 0, t);
      arm.fx = arm.sx + Math.cos(arm.ang) * arm.len;
      arm.fy = arm.sy + Math.sin(arm.ang) * arm.len;
    }
    drawWire();
  }
  // 肩〜拳を結ぶ重厚なケーブルを毎フレーム再描画（2本の外装ケーブル＋シアン発光コア＋節）。
  function drawWire() {
    if (!wire) return;
    const g = wire.g; g.clear();
    for (const arm of wire.arms) {
      const sx = arm.sx, sy = arm.sy, fx = arm.fx, fy = arm.fy;
      const ang = Math.atan2(fy - sy, fx - sx);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      const off = 2.4;
      g.lineStyle(2.6, 0x3a4150, 1);   // 外装ケーブル2本（ガンメタル）
      g.lineBetween(sx + nx * off, sy + ny * off, fx + nx * off, fy + ny * off);
      g.lineBetween(sx - nx * off, sy - ny * off, fx - nx * off, fy - ny * off);
      g.lineStyle(1.4, 0x46e6ff, 0.9);  // 発光コア（シアン）
      g.lineBetween(sx, sy, fx, fy);
      g.fillStyle(0xaeb6c4, 1);          // 節（シルバー）
      const segs = 6;
      for (let i = 1; i < segs; i++) { const t = i / segs; g.fillCircle(sx + (fx - sx) * t, sy + (fy - sy) * t, 1.6); }
      arm.img.setPosition(fx, fy).setRotation(ang);   // 拳はテクスチャが右向き＝進行方向へそのまま回転
    }
  }
  function destroyWire() {
    if (!wire) return;
    for (const arm of wire.arms) { if (arm.img) arm.img.destroy(); }
    if (wire.g) wire.g.destroy();
    wire = null;
  }

  // 召喚の予告：湧く位置をリング状に光らせる（予告なし即湧きを防ぐ）
  function telegraphSummon() {
    Sound.sfx('warning');
    const n = cfg.summon.count;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const x = boss.x + Math.cos(a) * cfg.summon.ringRadius;
      const y = boss.y + Math.sin(a) * cfg.summon.ringRadius;
      run.spawnParticles(x, y, int(def.color), 5);
    }
  }

  function doSummon() {
    const zunDef = ENEMIES.find((e) => e.id === cfg.summon.enemyId);
    const n = cfg.summon.count;
    const hpMult = summonHpMult();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const x = boss.x + Math.cos(a) * cfg.summon.ringRadius;
      const y = boss.y + Math.sin(a) * cfg.summon.ringRadius;
      run.spawnEnemy(zunDef, x, y, false, hpMult);
    }
    run.spawnParticles(boss.x, boss.y, int(def.color), 16);
    Sound.sfx('elite');
  }

  function recoil(ang) { recoilT = 0.2; recoilAng = ang; }

  // 主人公の手動の一撃が当たったときの「効いた」反応（billiard が呼ぶ）。
  // 実プレイFB「弾がボスに当たったときの感触が無い。素通りして見える」。
  // 白フラッシュ（flashT）は既にあるが、それだけでは玉が飛び去る絵に負ける。
  // 巨体をのけぞらせて、白く光る時間も伸ばす＝「押し返された」を体で見せる。
  function bossHitReact(ang, flashSec) {
    if (!boss || !boss.active) return false;
    recoil(ang);
    boss.flashT = Math.max(boss.flashT, flashSec == null ? 0.14 : flashSec);
    return true;
  }
  // 画面フラッシュ（白フラッシュ alpha < 0.5 厳守）
  function whiteFlash(a) {
    const cam = run.cameras.main;
    const f = run.add.image(cam.width / 2, cam.height / 2, 'white').setScrollFactor(0)
      .setDepth(2000).setBlendMode(ADD).setTint(0xffffff)
      .setDisplaySize(cam.width, cam.height).setAlpha(Math.min(0.49, a));
    run.tweens.add({ targets: f, alpha: 0, duration: 260, onComplete: () => f.destroy() });
  }

  // ============ 最終ボス登場イベント ============
  // セリフ/テロップ text を1つ生成。setScrollFactor(0) でカメラ固定＝ボス/プレイヤー位置に依らず
  // 常に画面内に出る。機械生命体らしくフェードイン→低速の明滅（flickerRepeat 回）→フェードアウトで自壊。
  // 生成物は必ず introEls で追跡し、撃破/破棄時に clearIntroEls で確実に destroy（リーク・二重発火防止）。
  function introText(text, color, y, sizePx, flickerRepeat) {
    const cam = run.cameras.main;
    // depth 1992：レベルアップテロップ（fx.announce=1800）より前面へ。stroke を太く（4→6）して密集時も輪郭を保つ。
    const t = run.add.text(cam.width / 2, y, text, {
      fontFamily: 'monospace', fontSize: sizePx + 'px', color,
      stroke: '#00131f', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1992).setAlpha(0);
    // 背後の横長の暗プレート（他テロップ/雑魚と重なっても読めるように・子ども安全 alpha<0.5 厳守）。
    const plate = run.add.image(cam.width / 2, y, 'white').setScrollFactor(0).setDepth(1991)
      .setTint(0x00060f).setOrigin(0.5).setDisplaySize(t.width + 30, t.height + 10).setAlpha(0);
    introEls.push(plate, t);
    const removeEls = () => {
      for (const el of [t, plate]) { const i = introEls.indexOf(el); if (i >= 0) introEls.splice(i, 1); el.destroy(); }
    };
    run.tweens.add({ targets: plate, alpha: 0.38, duration: 160, ease: 'Sine.out' });
    run.tweens.add({
      targets: t, alpha: 1, duration: 160, ease: 'Sine.out',
      onComplete: () => {
        run.tweens.add({
          targets: t, alpha: 0.45, duration: 200, yoyo: true, repeat: flickerRepeat, ease: 'Sine.inOut',
          onComplete: () => {
            run.tweens.add({ targets: [t, plate], alpha: 0, duration: 260, ease: 'Sine.in', onComplete: removeEls });
          },
        });
      },
    });
    return t;
  }
  function clearIntroEls() {
    for (const t of introEls) { if (t) { run.tweens.killTweensOf(t); t.destroy(); } }
    introEls.length = 0;
  }
  // 登場中のパーツ/グロウの見た目係数。smoothstep で「フェードイン＋スケールイン＋上からの降下」を
  // 決定的に算出（fadeSec を過ぎると alpha=1/scale=1/drop=0 の等身大に収束＝以降は通常描画と一致）。
  function maouIntroFx() {
    const it = MAOU_INTRO.dur - stateT;
    const f = clamp01(it / MAOU_INTRO.fadeSec);
    const e = f * f * (3 - 2 * f);
    return { alpha: e, scale: lerp(0.55, 1, e), drop: lerp(-26, 0, e) };
  }
  function endIntro() {
    clearIntroDim();          // 暗幕をフェードアウト＝通常画面へ完全復帰
    setBossDepthLift(0);      // ボスパーツ/グロウの depth を元へ戻す（雑魚と同層の通常描画に復帰）
    state = 'chase';
    stateT = idleDur(cfg.idleSec.afterSpawn);
    attackIdx = 0;
  }

  // 登場イベント中だけ半透明の暗幕を全画面へ敷き、背景の雑魚を沈めて maou 本体/セリフ/テロップを引き立てる。
  // カメラ固定・暗色 tint・alpha < 0.5（子ども安全）。intro 終了で clearIntroDim でフェードアウト破棄する。
  function spawnIntroDim() {
    const cam = run.cameras.main;
    introDim = run.add.image(cam.width / 2, cam.height / 2, 'white').setScrollFactor(0)
      .setDepth(INTRO_DIM_DEPTH).setTint(0x00030a)
      .setDisplaySize(cam.width, cam.height).setAlpha(0);
    run.tweens.add({ targets: introDim, alpha: MAOU_INTRO.dimAlpha, duration: 420, ease: 'Sine.out' });
  }
  // intro 終了：暗幕をフェードアウトして自壊（画面を完全に元へ戻す）。
  function clearIntroDim() {
    if (!introDim) return;
    const d = introDim; introDim = null;
    run.tweens.killTweensOf(d);
    run.tweens.add({ targets: d, alpha: 0, duration: 320, ease: 'Sine.in', onComplete: () => d.destroy() });
  }
  // 撃破/破棄時：暗幕を即時破棄（フェード無し・リーク防止）。
  function destroyIntroDim() {
    if (introDim) { run.tweens.killTweensOf(introDim); introDim.destroy(); introDim = null; }
  }
  // 登場中だけボスパーツ/グロウの depth を lift 分だけ持ち上げ/戻す（相対順は保持＝重なりが崩れない）。
  function setBossDepthLift(lift) {
    if (!disp) return;
    for (const p of disp.parts) p.img.setDepth((p.depth || 9) + lift);
    if (disp.glowP) disp.glowP.setDepth(6 + lift);
    if (disp.glowM) disp.glowM.setDepth(6 + lift);
  }

  // ============ ビーム（プレイヤー1点判定・波動砲/レーザー共用） ============
  function startBeam(angFrom, angTo, len, width, dmg, activeSec) {
    if (!beamImg) {
      beamImg = run.add.image(0, 0, 'boss_beam').setOrigin(0, 0.5).setBlendMode(ADD).setDepth(10);
    }
    beam = { angFrom, angTo, len, width, dmg, life: activeSec, maxLife: activeSec, dmgT: 0 };
    beamImg.setVisible(true).setTint(int(cfg.glowInner));
  }
  function updateBeam(dt) {
    beam.life -= dt;
    if (beam.life <= 0) { if (beamImg) beamImg.setVisible(false); beam = null; return; }
    const t = 1 - beam.life / beam.maxLife;
    const ang = beam.angFrom + (beam.angTo - beam.angFrom) * t;
    const x = boss ? boss.x : 0, y = boss ? boss.y : 0;
    beamImg.setPosition(x, y).setRotation(ang).setDisplaySize(beam.len, beam.width)
      .setAlpha(0.65 + 0.25 * Math.sin(run.elapsed * 30));
    // 点(プレイヤー)と線分[本体, 本体+dir*len]の距離
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    const rx = run.player.x - x, ry = run.player.y - y;
    let tt = rx * dirX + ry * dirY; tt = Math.max(0, Math.min(beam.len, tt));
    const cx = x + dirX * tt, cy = y + dirY * tt;
    const ddx = run.player.x - cx, ddy = run.player.y - cy;
    const half = beam.width / 2 + run.player.radius;
    beam.dmgT -= dt;
    if (ddx * ddx + ddy * ddy <= half * half && beam.dmgT <= 0) { run.hitPlayer(beam.dmg, cx, cy); beam.dmgT = 0.25; }
  }

  // ============ ボス弾（プレイヤーへ当たる・kind別に挙動） ============
  function spawnBullet2(x, y, vx, vy, opts) {
    opts = opts || {};
    const kind = opts.kind || 'orb';
    const tint = opts.tint != null ? opts.tint : int(cfg.bulletTint);
    const d = pool.pop() || {
      glow: run.add.image(0, 0, 'glow').setBlendMode(ADD),
      spr: run.add.image(0, 0, 'core'),
    };
    // FB#2: 汎用弾(orb)は丸い危険弾(foe_orb)＝味方の星弾と形で区別。ミサイル/カッターは既存の見た目を維持。
    // tomahawk（最終ボスのナックルウェーブ）は細長い巨大トマホーク＝進行方向へ向けて発射。
    // R20 Gate2: 汎用弾(orb)は丸い点からプラズマ・ボルト（boss_bolt・鏃形）へ。dart/shellと同じ
    //   「+Xが進行方向」の向きで焼いてあるので、進行方向へ向けて発射する（tomahawkと同じ考え方・オフセットなし）。
    const isTom = kind === 'tomahawk';
    const isOrb = kind !== 'cutter' && kind !== 'missile' && !isTom;
    const tex = kind === 'cutter' ? 'boss_cutter' : kind === 'missile' ? 'boss_missile'
      : isTom ? 'boss_tomahawk' : 'boss_bolt';
    const r = opts.radius != null ? opts.radius : 4;
    // FB#5: 一回り大きく（2.6→3.0）。個性色 bulletTint は弾本体に残す。tomahawk は細長く巨大に（雑魚より一目で大きく）。
    // Gate2: ボルトは16×10比率（r=4のとき16×10）＝dispW=r*4.0/dispH=r*2.5。
    const dispW = isTom ? r * 3.0 : isOrb ? r * 4.0 : r * 3.0;
    const dispH = isTom ? r * 7.2 : isOrb ? r * 2.5 : r * 3.0;
    const rot0 = isTom ? (Math.atan2(vy, vx) + Math.PI / 2)          // 胴=+Y前方なので +90°
      : isOrb ? Math.atan2(vy, vx) : 0;                              // ボルトは+Xが先端＝オフセットなし
    d.spr.setTexture(tex).setVisible(true).setDepth(11).setTint(tint)
      .setDisplaySize(dispW, dispH).setPosition(x, y).setRotation(rot0);
    // FB#2/#5: 敵弾は赤い危険フチ＋進行方向へ短いトレイル（味方の金白フチと即区別）。
    // tomahawk は進行方向へ長く伸びる明るいオレンジの噴射グロウ＝密集した雑魚の中でも大きく目立つ。
    const ta = Math.atan2(vy, vx);
    if (isTom) {
      d.glow.setVisible(true).setDepth(10).setTint(0xffa030)
        .setRotation(ta).setDisplaySize(r * 9.0, r * 4.0).setPosition(x, y);
    } else {
      d.glow.setVisible(true).setDepth(6).setTint(0xff2f2f)
        .setRotation(ta).setDisplaySize(r * 4.6, r * 2.6).setPosition(x, y);
    }
    bullets.push({
      active: true, x, y, vx, vy, kind,
      spin: opts.spin || 0, returns: !!opts.returns,
      maxTurn: opts.maxTurn || 0, spd: Math.hypot(vx, vy) || 1, cruise: opts.speed || 0,
      blast: opts.blast || 0, age: 0, trailT: 0,
      life: opts.life != null ? opts.life : 3,
      dmg: opts.damage != null ? opts.damage : 10,
      spr: d.spr, glow: d.glow,
    });
  }

  function recycleBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    pool.push({ spr: b.spr, glow: b.glow });
  }

  function updateBullets(dt) {
    const px = run.player.x, py = run.player.y;
    for (const b of bullets) {
      if (!b.active) continue;
      if (b.kind === 'missile') {
        const desired = Math.atan2(py - b.y, px - b.x);
        let cur = Math.atan2(b.vy, b.vx);
        const diff = Phaser.Math.Angle.Wrap(desired - cur);
        const maxStep = b.maxTurn * dt;
        cur += Math.max(-maxStep, Math.min(maxStep, diff));
        b.spd += (b.cruise - b.spd) * Math.min(1, dt * 1.5);
        b.vx = Math.cos(cur) * b.spd; b.vy = Math.sin(cur) * b.spd;
        b.spr.setRotation(cur + Math.PI / 2);
        b.trailT -= dt;
        if (b.trailT <= 0) { b.trailT = 0.09; run.spawnParticles(b.x, b.y, int(cfg.bulletTint), 2); }
      } else if (b.kind === 'tomahawk') {
        // 直進（回転は発射時に進行方向へ固定済み）。明るい噴射炎の尾を長く曳いて雑魚より目立たせる。
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.035;
          run.spawnParticles(b.x - b.vx * 0.02, b.y - b.vy * 0.02, 0xffb020, 3);
          run.spawnParticles(b.x - b.vx * 0.045, b.y - b.vy * 0.045, 0xffe24a, 2);
        }
      } else if (b.kind === 'cutter') {
        b.spr.rotation += dt * b.spin;
        if (b.returns) {
          b.age += dt;
          if (b.age > b.life * 0.4 && boss) {
            const a = Math.atan2(boss.y - b.y, boss.x - b.x);
            const sp = Math.hypot(b.vx, b.vy) || 120;
            b.vx += (Math.cos(a) * sp - b.vx) * Math.min(1, dt * 2.5);
            b.vy += (Math.sin(a) * sp - b.vy) * Math.min(1, dt * 2.5);
          }
        }
      }
      // ボルト（既定kind）は直進のみ＝回転は発射時に進行方向へ固定済み（dart/shellと同じ考え方）。
      // 旧foe_orbは形が円対称だったため常時回転で動きを出していたが、ボルトは鏃形なので回すと向きが崩れる。
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      b.spr.setPosition(b.x, b.y);
      b.glow.setPosition(b.x, b.y);
      if (b.life <= 0) {
        b.active = false;
        if (b.kind === 'missile' && b.blast > 0) {
          const dx = b.x - px, dy = b.y - py, rr = 30 + run.player.radius;
          if (dx * dx + dy * dy <= rr * rr) run.hitPlayer(b.blast, b.x, b.y);
          run.spawnParticles(b.x, b.y, int(cfg.bulletTint), 8);
        }
      } else {
        const rr = run.player.radius + (b.kind === 'orb' ? 4 : 6);
        const dx = b.x - px, dy = b.y - py;
        if (dx * dx + dy * dy <= rr * rr) {
          run.hitPlayer(b.dmg, b.x, b.y); b.active = false;
          if (b.kind === 'missile') { run.spawnParticles(b.x, b.y, int(cfg.bulletTint), 8); Sound.sfx('hit'); }
        }
      }
      if (!b.active) recycleBullet(b);
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].active) bullets.splice(i, 1);
    }
  }

  function clearBullets() {
    for (const b of bullets) { if (b.active) { b.active = false; recycleBullet(b); } }
    bullets.length = 0;
    if (beam) { beam = null; if (beamImg) beamImg.setVisible(false); }
  }

  // ============ 表示（本体そのものが動く） ============
  function updateDisp(dt) {
    const s = disp.spriteScale;
    const cx = boss.x, cy = boss.y;
    const bob = Math.sin(run.elapsed * 2) * 1.5;         // 全体の浮遊
    const tilt = Math.sin(run.elapsed * 1.5) * 0.04;     // 機体の傾き

    // 攻撃姿勢：腕の振り上げ/叩きつけ・上半身旋回・沈み込み
    let armPose = 0, bodySink = 0, upperSpin = 0;
    const isMaou = !!(cfg && cfg.final);   // 最終ボスは腕叩きを大きくゆっくり主役級に見せる
    if (state === 'slamTele') {
      const prog = clamp01(1 - stateT / cfg.armslam.telegraphSec);
      if (isMaou) {
        // 前半で腕を大きく振り上げ（通常-1.5より大きい-2.2）→頂点でタメ（後半は保持）→「ドーン」を予感させる。
        const up = clamp01(prog / 0.6);
        const wind = up * up * (3 - 2 * up);
        armPose = lerp(0, -2.2, wind);
        if (prog > 0.6) bodySink = -Math.sin(((prog - 0.6) / 0.4) * Math.PI) * 1.5;   // タメ中に僅かに伸び上がる
      } else {
        armPose = lerp(0, -1.5, prog);
      }
    } else if (state === 'slamHit') {
      const el = cfg.armslam.slamSec - stateT;
      const dn = clamp01(el / 0.15);
      if (isMaou) {
        armPose = lerp(-2.2, 1.3, dn * dn);   // 頂点から加速して一気に振り下ろす（ドーン）
        bodySink = dn * 6;                     // 叩きつけで大きく沈み込む
      } else {
        armPose = lerp(-1.5, 1.0, dn);
        bodySink = dn * 4;
      }
    } else if (state === 'cutterTele') {
      armPose = lerp(0, -0.9, clamp01(1 - stateT / cfg.cutter.telegraphSec));
    } else if (state === 'missileTele') {
      // ミサイル：発射ハッチを開くように両腕を振り上げる
      armPose = lerp(0, -1.1, clamp01(1 - stateT / cfg.missile.telegraphSec));
    } else if (state === 'novaTele') {
      // ノヴァ：エネルギーを溜めるように両腕を大きく振り上げる
      armPose = lerp(0, -1.4, clamp01(1 - stateT / cfg.nova.telegraphSec));
    } else if (state === 'knuckleTele') {
      // ナックルウェーブ：両腕を大きく振り上げて叩き合わせに備える
      armPose = lerp(0, -2.0, clamp01(1 - stateT / cfg.knuckle.telegraphSec));
    } else if (state === 'knuckleHit') {
      // 叩き合わせ：頂点から胸前へ一気に振り下ろす（ガーン）
      const el = cfg.knuckle.clapSec - stateT;
      armPose = lerp(-2.0, 0.9, clamp01(el / 0.15));
    } else if (state === 'wireTele') {
      // ワイヤーアーム予告：両腕を後方へ引き絞る（ロケットパンチのタメ）
      armPose = lerp(0, -1.7, clamp01(1 - stateT / cfg.wirearm.teleSec));
    } else if (state === 'wireShot' || state === 'wireBack') {
      // 射出中：両腕を前方へ突き出す（拳を撃ち出した姿勢）
      armPose = 1.0;
    }
    if (state === 'vulcanTele' || state === 'vulcanFire') upperSpin = Math.sin(run.elapsed * 18) * 0.12;
    if (state === 'novaTele' || state === 'novaFire') upperSpin = Math.sin(run.elapsed * 24) * 0.16;
    // 機関銃：連射中は上体を小刻みに反動させ、腕を前へ構える（撃つ動き）
    if (state === 'mgFire') { upperSpin = Math.sin(run.elapsed * 40) * 0.06; if (armPose === 0) armPose = -0.5; }

    if (recoilT > 0) recoilT -= dt;
    const rk = recoilT > 0 ? (recoilT / 0.2) * 6 : 0;
    const rcx = -Math.cos(recoilAng) * rk, rcy = -Math.sin(recoilAng) * rk;

    // 最終ボス登場中：全パーツ/グロウをフェードイン＋スケールイン＋上から降下させる（重量感のある登場）。
    const introFx = state === 'maouIntro' ? maouIntroFx() : null;

    for (const p of disp.parts) {
      let px = cx + p.ox * s + rcx;
      let py = cy + p.oy * s + bob + rcy;
      let rot = 0;
      const m = p.mirror ? -1 : 1;
      switch (p.role) {
        case 'body': rot = tilt + upperSpin * 0.3; py += bodySink; break;
        case 'core': rot = tilt + upperSpin; py += bodySink; break;
        // UFO の天蓋グラス。胴と一緒に僅かに沈む（脚のステップは無い＝浮遊）。
        case 'dome': rot = tilt; py += bodySink * 0.5; break;
        case 'legR': case 'legL': {
          const ph = p.mirror ? Math.PI : 0;
          py += Math.abs(Math.sin(run.elapsed * 3 + ph)) * 1.2;
          rot = tilt; break;
        }
        // 4足歩行の交互ステップ。対角（FL+BR / FR+BL）を同位相にして「歩いている」感を出す。
        // armslam を持つボス（uzuking）は前脚が踏ん張る＝armPose を前脚だけ足で受ける。
        case 'qlegFL': case 'qlegFR': case 'qlegBL': case 'qlegBR': {
          const gaitPh = (p.role === 'qlegFL' || p.role === 'qlegBR') ? 0 : Math.PI;
          py += Math.abs(Math.sin(run.elapsed * 3.4 + gaitPh)) * 1.4;
          const front = (p.role === 'qlegFL' || p.role === 'qlegFR');
          if (front && armPose !== 0) py += armPose * 2.0;   // 溜め＝脚を上げ、叩き＝踏み込む
          rot = tilt; break;
        }
        // 戦闘機の後退翼。カッター溜め(cutterTele で armPose)中は翼を上へバンクさせて予告に見せる。
        case 'wingR': case 'wingL': {
          const bank = armPose !== 0 ? armPose * 0.5 : Math.sin(run.elapsed * 2.2) * 0.06;
          rot = bank * m + tilt; break;
        }
        case 'armR': case 'armL': {
          const base = armPose !== 0 ? armPose : Math.sin(run.elapsed * 3) * 0.08;
          rot = base * m + tilt;
          if (isMaou && state === 'slamHit') py += bodySink * 0.6;   // 叩きつけで拳も前方へ沈む（殴る手応え）
          break;
        }
        case 'cannon': rot = aim - tilt; break;
        // ミサイルキャリアの発射ポッド。missile 予告中にせり上がる（発射管を立てる動き）。
        case 'rack': {
          if (state === 'missileTele' && cfg.missile) {
            py -= clamp01(1 - stateT / cfg.missile.telegraphSec) * 3;
          }
          rot = tilt; break;
        }
        default: rot = tilt; break;
      }
      if (introFx) {
        py += introFx.drop;
        p.img.setAlpha(introFx.alpha).setScale((p.mirror ? -1 : 1) * s * introFx.scale, s * introFx.scale);
      }
      p.img.setPosition(px, py).setRotation(rot);
    }

    const pulse = 1 + Math.sin(run.elapsed * 4) * 0.12;
    disp.glowP.setPosition(cx, cy).setScale(cfg.glowScale * 1.6 * pulse);
    disp.glowM.setPosition(cx, cy).setScale(cfg.glowScale * 0.9 * pulse);
    if (introFx) { disp.glowP.setAlpha(introFx.alpha); disp.glowM.setAlpha(introFx.alpha); }

    // 銃口フラッシュ（連射/掃射中のみ・砲口位置で点滅）
    if (state === 'mgFire' || state === 'vulcanFire') {
      const bd = boss.radius * 1.1;
      disp.muzzle.setVisible(Math.floor(run.elapsed * 30) % 2 === 0)
        .setPosition(cx + Math.cos(aim) * bd, cy + Math.sin(aim) * bd).setRotation(aim);
    } else {
      disp.muzzle.setVisible(false);
    }

    // 被弾フラッシュ / 予告点滅 / phase2 tint を全パーツへ
    boss.flashT -= dt;
    let tint = null;
    if (boss.flashT > 0) tint = 0xffffff;
    // R21W2: 予告を割った直後の追撃窓（bossBreakSec）。倍率2.4が効いているのに見た目が
    // 変わらず「今だけ大きい」が伝わっていなかった。よろけと同じ青白で塗って記号を揃える。
    else if (bossStagT > 0) tint = BALANCE.stagger.tint;
    else if (isTelegraph(state)) tint = (Math.floor(run.elapsed * 16) % 2 === 0) ? 0xffffff : null;
    else if (phase2) tint = 0xff6a6a;
    for (const p of disp.parts) { if (tint == null) p.img.clearTint(); else p.img.setTint(tint); }
  }

  // ============ 撃破時の共通ごほうび（必殺満タン＋コイン＋派手バースト） ============
  function awardKillRewards(x, y) {
    if (run.special) { for (let i = 0; i < killsPerCharge; i++) run.special.addKill(); }
    // FB#1: ボス撃破で回復ハートを確定1個ドロップ（次の戦いへ体力を立て直せる）。
    if (run.spawnHeal) run.spawnHeal(x, y);
    run.coins += cfg.rewardCoins;
    run.floatText(run.player.x, run.player.y - 30, '+' + cfg.rewardCoins + ' コイン', '#ffd23f');
    for (let i = 0; i < 4; i++) {
      run.spawnParticles(
        x + run.rng.range(-30, 30), y + run.rng.range(-30, 30),
        run.rng.pick([0xff6ec7, 0xffd23f, 0x7ef7c8, 0x8fd0ff]), 14);
    }
  }

  // ============ 撃破シネマティック ============
  function onBossKilled(e) {
    if (killing || !boss || e !== boss) return;
    killing = true;
    boss.active = false;
    const x = boss.x, y = boss.y;
    clearBullets();
    Sound.sfx('bossdown');
    awardKillRewards(x, y);
    startDeathSpin();
    if (cfg.final) finishFinal(x, y);
    else finishMini(x, y);
  }

  // 最終ボス撃破＝フルbossVictory＋クリア
  function finishFinal(x, y) {
    allDone = true;
    run.floatText(x, y - 46, def.name + ' を たおした！', '#ff6ec7');
    const finish = () => {
      run.cinematic = false;
      destroyDisp();
      endFight();
      run.endRun(true);
    };
    if (run.fx && run.fx.bossVictory) {
      run.fx.bossVictory(x, y, finish);
    } else {
      run.shake(400, 8);
      run.time.addEvent({
        delay: 150, repeat: 9,
        callback: () => run.spawnParticles(
          x + run.rng.range(-40, 40), y + run.rng.range(-40, 40),
          run.rng.pick([0xff6ec7, 0x7a3bf0, 0xffd23f]), 16),
      });
      run.time.delayedCall(cfg.deathCinematicSec * 1000, finish);
    }
  }

  // 小/中ボス撃破＝ミニ勝利演出（クリアにはならない・通常BGMへ戻してプレイ続行）
  function finishMini(x, y) {
    run.shake(300, 5);
    run.floatText(x, y - 40, def.name + ' げきは！', '#ffd23f');
    run.time.addEvent({
      delay: 120, repeat: 5,
      callback: () => run.spawnParticles(
        x + run.rng.range(-30, 30), y + run.rng.range(-30, 30),
        run.rng.pick([0xff6ec7, 0xffd23f, 0x7ef7c8]), 14),
    });
    run.time.delayedCall(cfg.deathCinematicSec * 1000, () => {
      destroyDisp();
      endFight();
      if (run.withAudio) Sound.startBgm('battle');
    });
  }

  function startDeathSpin() {
    if (!disp) return;
    if (disp.muzzle) disp.muzzle.setVisible(false);   // 連射中に撃破しても銃口フラッシュを残さない
    const ms = cfg.deathCinematicSec * 1000;
    const imgs = disp.parts.map((p) => p.img);
    run.tweens.add({ targets: imgs, angle: '+=540', duration: ms, ease: 'Cubic.in' });
    run.tweens.add({
      targets: [...imgs, disp.glowP, disp.glowM], alpha: 0, duration: ms, ease: 'Cubic.in',
    });
  }

  function destroyDisp() {
    clearIntroEls();     // 登場イベント途中で撃破/破棄されても text を確実に片付ける
    destroyIntroDim();   // 同上：暗幕を確実に破棄（depth 戻し漏れ/リーク防止）
    destroyWire();       // ワイヤーアームの拳/ケーブルを確実に破棄（リーク防止）
    if (!disp) return;
    for (const p of disp.parts) { if (p.img) p.img.destroy(); }
    if (disp.glowP) disp.glowP.destroy();
    if (disp.glowM) disp.glowM.destroy();
    if (disp.muzzle) disp.muzzle.destroy();
    if (beamImg) { beamImg.destroy(); beamImg = null; }
    disp = null;
  }

  function endFight() {
    boss = null;
    cfg = null;
    def = null;
    state = 'idle';
    phase2 = false;
    killing = false;
    ti++;
  }

  // ============ 毎フレーム ============
  function update(dt) {
    if (!allDone && !boss && ti < tiers.length) {
      const t = tiers[ti];
      if (!warnedArr[ti] && run.elapsed >= t.warnSec) {
        warnedArr[ti] = true;
        if (run.withAudio) Sound.stopBgm();
        Sound.sfx('warning');
        if (run.fx && run.fx.bossWarning) run.fx.bossWarning();
        else run.shake(400, 3);
      }
      if (!spawnedArr[ti] && warnedArr[ti] && run.elapsed >= t.spawnSec) {
        spawnedArr[ti] = true;
        spawnFight(t);
      }
    }

    if (boss && boss.active) {
      updateAI(dt);
      updateDisp(dt);
      if (cfg.phase2 && !phase2 && boss.hp <= cfg.hp * cfg.phase2HpRatio) enterPhase2();
      const dmg = (state === 'dash') ? cfg.dash.damage : cfg.bodyDamage;
      const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
      const rr = run.player.radius + boss.radius;
      if (dx * dx + dy * dy <= rr * rr) run.hitPlayer(dmg, boss.x, boss.y);
    }

    updateBullets(dt);
    if (beam) updateBeam(dt);
  }

  function destroy() {
    clearBullets();
    for (const d of pool) { if (d.spr) d.spr.destroy(); if (d.glow) d.glow.destroy(); }
    pool.length = 0;
    destroyDisp();
    boss = null;
  }

  return {
    update, onBossKilled, destroy,
    get active() { return !!(boss && boss.active); },
    get warned() { return warnedArr.some(Boolean); },
    get entity() { return boss; },
    // R21W2: 予告ブレイク（Run.doStrike が呼ぶ）
    breakTelegraph,
    // R23: 手動の命中に対する見た目の反応（billiard.hitOne が呼ぶ）
    bossHitReact,
    get telegraphing() { return isTelegraph(state); },
    get staggered() { return bossStagT > 0; },
    // 検証用の読み取り専用アクセサ（CDPが攻撃発火/パーツ生存を観測する）
    get state() { return state; },
    get bulletCount() { return bullets.length; },
    get beamActive() { return !!beam; },
    get partCount() { return disp ? disp.parts.length : 0; },
  };
}
