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
  dur: 4.4, fadeSec: 1.8,
  line1At: 1.0, line2At: 2.0, telopAt: 2.9, hintAt: 3.7,   // hint＝弱点コアの遊び方を先に教える
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
  // ★R30 マオウレクスの分離／再合体。
  //   split  … 上半身（boss本体・コアを持つ）と下半身（lower・装甲だけの砲台）に分かれている
  //   phase3 … 再合体してメタリックパープル。胸部レーザーを撃つ
  //   ⚠️ HPは boss 1本だけ。lower はダメージを受けない（コアが上半身にあるため）＝
  //      HPバーも撃破処理も既存のまま1体ぶんで足りる。
  let split = false;
  let phase3 = false;
  // ★真マオウレクス「軌道神核」＝第4形態。メタリックパープルのHPが0になった瞬間を
  //   撃破ではなく**変身**へ差し替える（onBossKilled の先頭で横取りする）。
  //   trueForm が立っている間は HP/半径/弱点/攻撃表がすべて cfg.trueForm 側に切り替わる。
  let trueForm = false;
  let awakening = false;      // 転生カットシーン中（多重発火と二重撃破を防ぐ）
  let trueCrack = null;       // 旧体に走る亀裂の描画（graphics・カットシーン終了で必ず破棄）
  const shardImgs = [];       // R43 粉砕の小片（tween で飛ぶ・applyTrueLook と destroy で必ず片付ける）
  // ★R43 レーザーの照準ロック。予告の最後の lockSec は狙いを固定し、射線を見せる。
  //   lockAng が null＝まだ追尾中。数値が入っている＝ロック済み（以後 aim で上書きしない）。
  let lockAng = null;         // 確定した射線の角度
  let lockDir = 1;            // 薙ぐ向き（+1/-1）。片方向薙ぎのときに使う
  let lockGfx = null;         // 射線プレビューの描画
  let ringSpin = [0, 0, 0];   // 3つの環の公転角（別々の速さで回る）
  let tfTier = 0;             // R37 激化の段（ゲージ1本割るごとに+1・trueForm.rage の添字）
  let splitLaserDone = false; // R37 分離中にじゃがんレーザーを1回撃ちきった印（撃つまで再合体しない）
  let alignAng = 0;           // 整列レーザーの射線（環が揃う向き＝そのまま射線）
  let alignWind = 0;          // R44W3 振りかぶり（環の面を薙ぐ向きと逆へ溜める角度・rad）
  let alignTold = false;      // R44W8 技名テロップを出したか（照射の直前に1回だけ出す）
  let scorchGfx = null;       // R44W3 薙いだ跡の焼け扇（ビームの後ろに残る）
  // ★R40 軌道遊弋＋座の転移（trueForm の移動）。「フワフワ浮遊しているだけでは荘厳さを
  //   感じれない」への回答＝**神は追いかけない**。主人公を中心にした軌道の上を滑り、
  //   攻撃の前に光へ折りたたまれて軌道の先の「座」へ転移する（歩かず、座を移す）。
  let tfOrbA = 0;             // 軌道角（主人公から見たボスの方位）
  let tfOrbDir = 1;           // 公転の向き（転移ごとに反転＝同じ弧を描き続けない）
  let tfWarpPhase = 0;        // 0=遊弋 1=消える(warpOut) 2=現れる(warpIn)
  let tfWarpT = 0;            // 転移フェーズの残り秒
  let tfWarped = false;       // この chase で転移を済ませた印
  let tfWarpAlpha = 1;        // 表示の透明度（updateTrueDisp が読む）
  let tfTrailT = 0;           // 遊弋の航跡パーティクルの間引き
  const fxList = [];          // R40 環・光柱のワンショットFX（updateFx が寿命管理）
  let shellDmg = 0;           // 殻閉じを「閉じきる前に割る」ための蓄積ダメージ
  let lastHp = 0;             // 前フレームのHP（差分から被ダメージ量を取る）
  let merging = false;        // 再合体カットシーンに入った印（多重発火を防ぐ）
  let camHeld = false;        // カットシーン中にカメラを主人公から預かっている印
  let lower = null;             // 下半身のエンティティ（run.enemies に載せる・被弾は弾く）
  let lowerGlow = null;
  let lowerState = 'chase';
  let lowerT = 0;
  let cineStage = 0;            // 分離/再合体カットシーンの進行段（1回ずつ発火させる）
  let mergeFrom = null;         // 再合体の開始位置（下半身をここから本体へ吸い寄せる）
  let chestAcc = 0;             // 胸部レーザーの溜め演出の間引き
  let killing = false;          // 撃破シネマティック中は多重発火を防ぐ
  let lockX = 0, lockY = 0;     // ダッシュ方向ロック
  let aim = 0;                  // 毎フレーム更新するプレイヤー方向角（砲身/弾に共用）
  // 攻撃の連射/掃射用アキュムレータ（stateT基準・決定的）
  let shotAcc = 0, shotIdx = 0, slamFired = false, chainVulcan = false;
  // R34: 1回の予告につき「割られる」のは1回まで（unstoppable のボスで連打を無効化する）
  let brokeThisAttack = false;
  let knuckleFired = false;         // ナックルウェーブの一斉発射を1回だけにするフラグ
  // R31: ミサイルの「飛来する音」を飛んでいるあいだ鳴らし続けるためのタイマー（0で次を鳴らす）。
  // 発射時に1回だけ鳴らすと、速度を上げたぶん「音より先に着弾する」ので迫る怖さが出ない。
  let missileFlyT = 0;
  // R31: 着弾爆発音の間引き。7発斉射が同時に爆ぜると音が潰れて1発ぶんに聞こえる（＝派手さが消える）。
  let missileBoomT = 0;
  // R34W2: トマホーク（ナックルウェーブ）の巡航音。ミサイルとは別枠で持つ
  //   （同じタイマーにすると音の性格が違う2種が互いを間引いてしまう）。
  let tomahawkFlyT = 0;
  // R31: ロケットパンチの飛来音。拳が近づくほど音程を上げて鳴らす（マッハ2で迫る恐怖）。
  let punchFlyT = 0;
  let wire = null;                  // ワイヤーアーム（両拳＋ワイヤー）の表示状態。攻撃終了/撃破で必ず destroy
  let recoilT = 0, recoilAng = 0;   // 発射反動（のけぞり）
  // R21W2: 予告を主人公の一撃で割られた直後の隙。recoilT は描画オフセット専用で state を止めない
  // ため、スタンの代用にはならない。別変数として持つ。
  let bossStagT = 0;
  let introStage = -1;          // maou 登場イベントのセリフ/テロップ進行段（-1=未使用/非final）
  const introEls = [];          // 登場イベントで生成した text（リーク防止に必ず destroy）
  let introDim = null;          // 登場イベント中の暗幕（雑魚を沈めボス/セリフを引き立てる・intro 終了で破棄）
  const bullets = [];           // ボス弾（プレイヤーへ当たる）
  const strikes = [];           // R29 着弾予告→時間差爆発（ローリングボム／ぜんだんはっしゃ）
  let strikeSfxT = -9;          // 爆発音/揺れの間引き用（同時多発でも渋滞させない）
  let weakEls = null;           // R29 弱点コアの表示（cfg.weak を持つボスのみ）
  let deflectT = -9, deflectTextT = -9, coreTextT = -9;   // 弾かれ/コアヒットの演出の間引き
  const pool = [];
  let beam = null;              // 波動砲/レーザーの薙ぎビーム（同時1本）
  let beamImg = null;
  let beamCore = null;          // R36W2 ビームの白熱の芯（「深みのある」は縁と芯の2層でしか出ない）

  ensureTextures();

  // --- Boot.js がボステクスチャ未生成でも動くよう自前生成（全ボスの全パーツ＋弾） ---
  function ensureTextures() {
    for (const d of BOSSES) {
      for (const [k, s] of Object.entries(d.sprites)) makeSprite(`boss_${d.id}_${k}`, s);
      // ★真の姿（第4形態）のパーツ。BOSSES には別エントリとして足さない＝ステージの並びに影響させない。
      //   キーは `boss_maou_T<tex>` と接頭辞で分ける（通常パーツと名前が衝突しない）。
      if (d.trueSprites) {
        for (const [k, s] of Object.entries(d.trueSprites)) makeSprite(`boss_${d.id}_T${k}`, s);
      }
      // ★R36W2 再合体後のメタリックパープルの実体（P 接頭辞）。tint の乗算では赤は紫にならない
      //   （#e5202c×#a86bff=#970d2c＝赤のまま）ので、紫パレットで同じ rows を焼き直した
      //   別テクスチャを持ち、applyMergeLook で差し替える。
      if (d.palette3) {
        for (const [k, s] of Object.entries(d.sprites)) {
          makeSprite(`boss_${d.id}_P${k}`, { palette: d.palette3, rows: s.rows });
        }
      }
    }
    makeMissile('boss_missile', 7, 11);
    makeSaw('boss_cutter', 16);
    makeMuzzle('boss_muzzle', 16);
    makeBeamTex('boss_beam', 8, 16);
    makeFist('boss_maou_fist');       // 最終ボス ワイヤーアームのゴツい鉄拳
    makeTomahawk('boss_tomahawk');    // 最終ボス ナックルウェーブのトマホーク型ミサイル
    makeBomb('boss_bomb', 14);        // コロガンナー ローリングボムの球体爆弾
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
  // R29 ローリングボム：ずんぐりした球体爆弾（外殻＋上部の導火線口＋ハイライト）。白で作り実行時 tint。
  function makeBomb(key, s) {
    if (run.textures.exists(key)) return;
    const g = newG();
    const c = s / 2;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c + s * 0.06, c - 0.5);          // 本体（やや下寄り＝地面に転がる質感）
    g.fillRect(c - s * 0.12, 0, s * 0.24, s * 0.22);  // 導火線の口金
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(c - s * 0.2, c - s * 0.1, s * 0.13); // ハイライト
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
  // 24bit色の線形補間（R34 メタリックパープルの光沢に使う）
  const mixHex = (a, b, t) => {
    const u = clamp01(t);
    const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u));
    const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u));
    const bl = Math.round(lerp(a & 255, b & 255, u));
    return (r << 16) | (g << 8) | bl;
  };
  function summonHpMult() {
    const t = Math.max(0, Math.min(1, run.elapsed / (W.stepSec * W.steps)));
    return lerp(W.hpMultStart, W.hpMultEnd, t);
  }
  function idleDur(sec) { return sec * (phase2 ? cfg.phase2IdleMult : 1); }
  function aimAngle() { return Math.atan2(run.player.y - boss.y, run.player.x - boss.x); }
  function isTelegraph(st) { return typeof st === 'string' && st.endsWith('Tele'); }
  function resetAttackVars() { shotAcc = 0; shotIdx = 0; slamFired = false; chainVulcan = false; knuckleFired = false; recoilT = 0; punchFlyT = 0; alignWind = 0; clearLock(); }

  // ============ 出現 ============
  function spawnFight(tierCfg) {
    cfg = tierCfg;
    def = bossMap[cfg.bossId];
    phase2 = false;
    split = false; phase3 = false; merging = false; lower = null; lowerGlow = null; cineStage = 0;
    trueForm = false; awakening = false; shellDmg = 0; ringSpin = [0, 0, 0]; tfTier = 0;
    tfWarpPhase = 0; tfWarped = false; tfWarpAlpha = 1;
    clearFx();
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
      return { img, role: r.role, tex: r.tex, ox: r.ox, oy: r.oy, mirror: !!r.mirror, depth };
    });
    const muzzle = run.add.image(x, y, 'boss_muzzle').setBlendMode(ADD).setDepth(11)
      .setTint(int(cfg.glowInner)).setVisible(false).setScale(s * 0.4);
    disp = { parts, glowP, glowM, muzzle, spriteScale: s };

    boss = {
      active: true, isBoss: true, id: ++run._eid, def,
      x, y, color: int(def.color),
      hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius,
      damage: cfg.bodyDamage, isElite: false, slowMark: -1, flashT: 0,
      // R34: 特殊弾のボス特効に掛かる個別倍率（billiard.js が読む）。最終ボスだけ薄める。
      specialMul: cfg.specialBulletMul || 1,
      // R34: HPゲージを何本に区切って描くか（hud.js が読む）。長い戦いを「硬いだけ」にしないため、
      //   1本ぶち抜いたことが数えられるようにする＝[[快感は振幅ではなく数えられること]]。
      gaugeSegments: cfg.gaugeSegments || 1,
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
    // BGM切替＝登場の合図（warn の静寂→ボス戦BGM）。最終ボスだけは専用の荘厳曲へ切り替える
    // ＝「ここからは今までのボスと違う」を、姿を見る前に耳で分からせる。
    if (run.withAudio) Sound.startBgm(cfg.final ? 'maou' : 'boss');
  }

  // ============ AI ============
  function moveBoss(vx, vy, dt) { boss.x += vx * dt; boss.y += vy * dt; }

  // ★R30 段階ごとの攻撃表。分離中は上半身の技だけ（ミサイルは下半身が撃つ）、
  //   再合体後は胸部レーザーを軸にする。長さが違ってよいよう待ち時間は剰余で引く。
  // ★真の姿の設定（第4形態中だけ有効）。cfg そのものは BALANCE の参照なので**書き換えない**。
  //   段ごとに値が違うものは全部この関数を通して引く＝差し替え漏れを1か所に集める。
  function TF() { return (trueForm && cfg && cfg.trueForm) ? cfg.trueForm : null; }
  function weakCfg() { const t = TF(); return (t && t.weak) || (cfg && cfg.weak) || null; }

  // ★R37 激化の係数（trueForm.rage・段ごとの配列）。段で値が変わるものは全部ここを通す＝
  //   差し替え漏れを1か所に集める（TF() と同じ思想）。rage が無いボスは既定値のまま。
  function rageArr(key, dflt) {
    const t = TF();
    const a = t && t.rage && t.rage[key];
    return a ? a[Math.min(tfTier, a.length - 1)] : dflt;
  }
  // 整列レーザーの実効予告秒。予告の開始(startAttackByName)・進行(alignTele)・
  //   環の整列描画(updateTrueDisp)の3か所が同じ値を見ないと、環が揃いきる前に撃つ嘘になる。
  function tfAlignSec() { return TF().aligned.alignSec * rageArr('alignSecMul', 1); }
  // 段の再計算。ゲージ1本割るごとに1段（gaugeSegments と同数）。上がった瞬間に宣言する＝
  //   数値の変化を「届く」形にする（[[feedback_change_must_reach_the_player]]）。
  function updateRageTier() {
    const t = TF();
    if (!t || !t.rage || !boss) return;
    const seg = t.gaugeSegments || 1;
    const tier = Math.min(seg - 1, Math.floor((1 - boss.hp / boss.maxHp) * seg));
    if (tier > tfTier) {
      tfTier = tier;
      const msg = t.rage.texts && t.rage.texts[Math.min(tier, t.rage.texts.length) - 1];
      if (msg) introText(msg, '#ff9a3c', 156, 19, 2);
      Sound.sfx('warning', 0.9, 1.0 + tier * 0.18);
      run.spawnParticles(boss.x, boss.y, 0xff9a3c, 26);
    }
  }

  function attackList() {
    const t = TF();
    if (t) return t.attacks;
    if (phase3 && cfg.attacksP3) return cfg.attacksP3;
    if (split && cfg.attacksSplit) return cfg.attacksSplit;
    return cfg.attacks;
  }
  function idleFor(i) {
    const t = TF();
    const arr = t ? t.idleSec : cfg.idleSec.betweenAttacks;
    // R37 激化：段が上がるほど間合いが詰まる（手数で密度を上げる・ダメージは上げない）
    return arr[i % arr.length] * (t ? rageArr('idleMul', 1) : 1);
  }

  function beginAttack() {
    const a = attackList()[attackIdx % attackList().length];
    // 最終ボスは phase2 で laser の直後に vulcan を割り込ませる（連続コンボ）
    chainVulcan = (a === 'laser' && phase2 && !!cfg.vulcan);
    startAttackByName(a);
  }

  // 攻撃名 → 予告(Tele)ステートへ遷移。summon は即時発火。
  function startAttackByName(a) {
    brokeThisAttack = false;   // R34: 新しい予告が始まったら「割られる権利」が1回戻る
    switch (a) {
      case 'dash':       state = 'dashTele';    stateT = cfg.dash.telegraphSec; break;
      case 'machinegun': state = 'mgTele';      stateT = cfg.machinegun.telegraphSec; break;
      case 'cutter':     state = 'cutterTele';  stateT = cfg.cutter.telegraphSec; break;
      case 'vulcan':     state = 'vulcanTele';  stateT = cfg.vulcan.telegraphSec; break;
      case 'wavecannon': state = 'waveTele';    stateT = cfg.wavecannon.chargeSec; Sound.sfx('specialCharge'); break;
      case 'missile':    state = 'missileTele'; stateT = cfg.missile.telegraphSec; break;
      case 'laser':      state = 'laserTele';   stateT = cfg.laser.chargeSec; Sound.sfx('specialCharge');
                         // R36W2 じゃがんレーザー（分離中の技になった・名前は balance が持つ）
                         if (cfg.laser.name) introText(cfg.laser.name, '#d9a0ff', 156, 18, 1); break;
      // ★R30 再合体後だけの胸部レーザー。溜めのあいだ胸のコアへ光が収束する（updateDisp が描く）
      case 'chestLaser': state = 'chestTele';   stateT = cfg.chestLaser.chargeSec;
                         Sound.sfx('specialCharge'); Sound.sfx('warning', 0.7, 0.7);
                         // R36W2 改名（きょうぶレーザー→じゃしんレーザー・実プレイFB「ダサすぎる」）
                         introText(cfg.chestLaser.name + ' ちょくげき', '#e0a0ff', 156, 18, 1); break;
      case 'nova':       state = 'novaTele';    stateT = cfg.nova.telegraphSec; Sound.sfx('specialCharge'); break;
      case 'armslam':    state = 'slamTele';    stateT = cfg.armslam.telegraphSec; break;
      case 'knuckle':    state = 'knuckleTele'; stateT = cfg.knuckle.telegraphSec; knuckleFired = false;
                         introText('ナックルウェーブはっしゃ', '#ffd23f', 156, 18, 1); break;
      case 'wirearm':    state = 'wireTele';    stateT = cfg.wirearm.teleSec;
                         introText('ワイヤーアームはっしゃ', '#46e6ff', 156, 18, 1); break;
      case 'ring':       state = 'ringTele';    stateT = cfg.ring.telegraphSec; break;
      // ★真マオウレクス（第4形態）の3種。予告はどれも**形**で読める（文字より先に姿が変わる）。
      // ★R44W8 実プレイFB「攻撃予告の**文字が表示されたら、間髪入れずに**レーザーを照射して。
      //   **いきなり攻撃される怖さ**を出すため」。予告そのもの（環の整列・振りかぶり・気配の粒）は
      //   そのまま残し、**文字だけを照射の直前へ遅らせる**（alignTele 内の textLeadSec）。
      //   ＝「文字が出た＝もう来ている」。文字を消さないのは、技の名前は憶えてほしいから。
      case 'aligned':    state = 'alignTele';  stateT = tfAlignSec(); alignTold = false;
                         Sound.sfx('specialCharge'); Sound.sfx('warning', 0.7, 0.8); break;
      case 'verse':      state = 'verseTele';  stateT = TF().verse.teleSec; shotAcc = 0; shotIdx = 0;
                         // ★R40 予告を「魔法陣の展開」にする：外へ開く金環＋内へ閉じる白環＋詠唱の
                         //   スウェル。文字が剥がれる前に**儀式の場**が組み上がる＝最終ボスの格。
                         Sound.sfx('verseCharge');
                         spawnRingFx(boss.x, boss.y, 0xffd23f, boss.radius * 0.5, boss.radius * 2.4,
                           TF().verse.teleSec, 0.8);
                         spawnRingFx(boss.x, boss.y, 0xffffff, boss.radius * 2.8, boss.radius * 1.1,
                           TF().verse.teleSec, 0.6);
                         // ★R44W4 悪魔性は弾だけでなく**儀式の場**にも要る。金環（外へ開く祈り）と
                         //   白環（内へ閉じる祈り）の下から、遅れて**紫の第3の環**が滲み出る。
                         //   遅い＝2枚の祈りの下に別のものが混ざっている、が形で分かる。
                         //   色は VERSE_FALL_A と同じ紫＝**この環の色に、これから弾が堕ちる**。
                         spawnRingFx(boss.x, boss.y, 0xa24bff, boss.radius * 0.3, boss.radius * 1.7,
                           TF().verse.teleSec * 1.35, 0.7);
                         introText('せいく かいほう', '#ffd23f', 156, 18, 1); break;
      case 'shell':      state = 'shellTele';  stateT = TF().shell.teleSec; shellDmg = 0;
                         Sound.sfx('warning', 0.8, 0.6);
                         introText('から とじ', '#c98cff', 156, 18, 1); break;
      case 'summon':     state = 'summonTele'; stateT = cfg.summon.telegraphSec || 0.6; telegraphSummon(); break;
      // ★R29 署名攻撃（通常ボス5体に1種類ずつ）。どれも「飛んでくる弾を避ける」以外の遊びを1つ足す。
      case 'rollbomb':   state = 'rollTele';   stateT = cfg.rollbomb.telegraphSec; break;
      case 'flypass':    state = 'flyBack';    stateT = cfg.flypass.backSec; Sound.sfx('warning'); break;
      case 'spiral':     state = 'spiralTele'; stateT = cfg.spiral.telegraphSec; Sound.sfx('specialCharge'); break;
      case 'tsunami':    state = 'tsuTele';    stateT = cfg.tsunami.telegraphSec; Sound.sfx('specialCharge'); break;
      case 'barrage':    state = 'barTele';    stateT = cfg.barrage.telegraphSec; Sound.sfx('warning'); break;
      default:           afterAttack(); break;
    }
  }

  // 攻撃1つが終わったとき。chainVulcan があれば vulcan へ、無ければ待機して次の攻撃へ。
  function afterAttack() {
    clearLock();          // R43 射線プレビューを残さない（次の攻撃へ持ち越すと嘘の予告になる）
    if (chainVulcan) { chainVulcan = false; startAttackByName('vulcan'); return; }
    endAttackChase();
  }
  // R21W2: 予告中のボスに手動の一撃を当てると割り込める＝ボス戦でも「倒すのは手動」が効く。
  // ボスによろけは持ち込まない（独自のライフサイクルとHPバーを壊すため）。代わりにこれ。
  // ★R34 実測で分かったこと：ボットは**予告をほぼ毎回割っていた**ので、マオウレクスの
  //   ロケットパンチは 31.5秒の戦闘で射出音が **0回**（wireTele は17回サンプルされたのに
  //   wireShot へ一度も進んでいない）。実プレイFB「ミサイルやロケットパンチ？も攻撃音や
  //   射出音は修正したか？」に対する答えは「直っているが、割られて発射に至っていない」だった。
  //   → 最終ボスだけ「割ってもひるむだけで止まらない」にする（cfg.unstoppable）。
  //     追撃の窓（×2.4）も装甲片（弾薬供給）も今までどおり渡すので、割る動機は減らない。
  //     ただし**1回の予告につき1回まで**。同じ予告を連打で割り続けると窓と弾が無限に湧く。
  function breakTelegraph() {
    if (!boss || !boss.active || !isTelegraph(state)) return false;
    if (cfg.unstoppable) {
      if (brokeThisAttack) return false;
      brokeThisAttack = true;
      bossStagT = BALANCE.hero.strike.bossBreakSec;
      Sound.sfx('metalSlam');
      run.shake(200, 6);
      run.floatText(boss.x, boss.y - boss.radius - 26, 'それでも とまらない！', '#ff9e66');
      return true;
    }
    destroyWire();
    if (beamImg) { beamImg.destroy(); beamImg = null; }
    if (beamCore) { beamCore.destroy(); beamCore = null; }
    resetAttackVars();
    recoil(aim);
    endAttackChase();                       // 通常の攻撃終了と同じ経路（後始末の漏れを作らない）
    bossStagT = BALANCE.hero.strike.bossBreakSec;
    Sound.sfx('metalSlam');
    return true;
  }

  function endAttackChase() {
    state = 'chase';
    stateT = idleDur(idleFor(attackIdx)) * (phase3 && cfg.merge ? cfg.merge.idleMul : 1);
    attackIdx = (attackIdx + 1) % attackList().length;
  }

  // ★R43 照準ロック。予告 state の update から毎フレーム呼ぶ。
  //   残り時間が lockSec を切ったら狙いを**その瞬間の方向で固定**し、射線を見せて音を鳴らす。
  //   これが無いと、予告は「来る」ことしか伝えず「どこへ」を伝えない＝走っても発射時に
  //   正面へ引き直されるので、避ける遊びが原理的に成立しない（実プレイFB「避けようがない」）。
  //   戻り値＝いま狙っている角度（ロック済みならその固定値）。
  // ★R44W3 showLine=false で「線を描かない」ロック。整列レーザーだけがこれを使う＝
  //   ロック（＝どこへ撃つかの確定）は残したまま、**答えの表示**だけを外す。読み筋は
  //   環の面と振りかぶりへ移る。線を消してもロックは残るので、避けられない技にはならない。
  function lockAim(lockSec, spanDeg, len, showLine) {
    if (lockAng == null && stateT > (lockSec || 0)) return aim;      // まだ追尾中
    if (lockAng == null) {
      lockAng = aim;
      lockDir = run.rng.chance(0.5) ? 1 : -1;
      Sound.sfx('relock');
    }
    if (showLine !== false) drawLockLine(lockAng, spanDeg || 0, len || 480);
    return lockAng;
  }

  // 射線プレビュー：確定した射線を細い線で描き、薙ぐ側を扇で示す。
  //   「どこへ来るか」と「どっちへ逃げればいいか」の2つを**形**で伝える（文字では読めない）。
  function drawLockLine(ang, spanDeg, len) {
    if (!lockGfx) lockGfx = run.add.graphics().setDepth(13 + INTRO_LIFT);
    const pulse = 0.45 + 0.35 * (Math.sin(run.elapsed * 26) * 0.5 + 0.5);
    lockGfx.clear();
    // 薙ぐ範囲（片方向なら射線から lockDir 側だけ・両側なら左右対称）
    if (spanDeg > 0) {
      const a0 = ang, a1 = ang + lockDir * spanDeg * D2R;
      lockGfx.fillStyle(0xff5a3c, 0.10);
      lockGfx.slice(boss.x, boss.y, len, Math.min(a0, a1), Math.max(a0, a1), false);
      lockGfx.fillPath();
    }
    // 確定した射線そのもの
    lockGfx.lineStyle(2, 0xff9a6a, pulse);
    lockGfx.beginPath();
    lockGfx.moveTo(boss.x, boss.y);
    lockGfx.lineTo(boss.x + Math.cos(ang) * len, boss.y + Math.sin(ang) * len);
    lockGfx.strokePath();
  }

  function clearLock() {
    lockAng = null;
    if (lockGfx) { lockGfx.clear(); }
  }

  function updateAI(dt) {
    const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    aim = Math.atan2(dy, dx);
    stateT -= dt;
    if (bossStagT > 0) bossStagT -= dt;   // R21W2
    updateRageTier();                     // R37 激化（trueForm 中だけ中身が動く）

    switch (state) {
      // 最終ボス登場イベント：移動/攻撃はせず、経過秒でセリフ→セリフ→テロップを1回ずつ出す。
      // 視覚のフェードイン/降下は updateDisp 側（maouIntroFx）で担当。stateT<=0 で通常戦闘へ。
      case 'maouIntro': {
        const it = MAOU_INTRO.dur - stateT;
        // ★R44W6 実プレイFB「『おまえたちはきけん・・・』はいまいち。唐突すぎるし、言葉に
        //   なんの意味もつながりもない。『ひかりをけす』という意味のコメントを。最終ボス
        //   （厳密には軌道神核の一つ前）らしい威厳をもった言葉を」。
        //   ロボットの吃音（カタカナ＋・・・）をやめ、**漢字交じりの断定**で王の声にする
        //   （小6・漢字OK。世界がひらがなの中で、この者だけ漢字で話す＝異質さと格）。
        //   意味のつながり＝オープニングの命令「セカイから ひかりを けせ」を出した張本人が、
        //   主人公を「小さき光」と呼んで同じ宣告を重ねる。エンディング「ひかりが もどった」の対句。
        if (introStage < 1 && it >= MAOU_INTRO.line1At) {
          introStage = 1;
          introText('よくぞ来た 小さき光よ', '#bff5ff', 108, 16, 3);
        }
        if (introStage < 2 && it >= MAOU_INTRO.line2At) {
          introStage = 2;
          introText('この世界の光は 我が手で消す', '#ff7a7a', 140, 16, 3);
        }
        if (introStage < 3 && it >= MAOU_INTRO.telopAt) {
          introStage = 3;
          introText('【マオウレクスが現れた】', '#ffffff', 186, 22, 5);
          run.shake(220, 4);
          Sound.sfx('bigBoom');   // 「現れた」の一撃感（既存SFX）
        }
        // ★弱点コアの遊び方は、最初に必ず言葉で教える。
        //   「当たっているのに減らない」は、理由が分からないと理不尽にしか感じられないため。
        if (introStage < 4 && cfg.weak && it >= MAOU_INTRO.hintAt) {
          introStage = 4;
          introText('よわてん：むねの コアを ねらえ！', cfg.weak.coreTint, 216, 17, 3);
          Sound.sfx('warning');
        }
        if (stateT <= 0) endIntro();
        break;
      }

      case 'chase': {
        const tfc = TF();
        // ★R40 軌道神核は追いかけない（「フワフワ浮遊しているだけでは荘厳さを感じれない」）。
        //   ①遊弋＝主人公を中心にした軌道の上をゆっくり滑る（衛星の運行。名前のとおり「軌道」）
        //   ②転移＝chase の最後に光へ折りたたまれ、軌道の先の「座」へ跳ぶ。次の攻撃に合った
        //     間合い（motion.anchors）へ**自分の意思で座を移す**＝挙動そのものが儀式になる。
        if (tfc && tfc.motion) {
          const mo = tfc.motion;
          const nextAtk = attackList()[attackIdx % attackList().length];
          const R = (mo.anchors && mo.anchors[nextAtk]) || mo.orbitRadius;
          const wTotal = mo.warpOutSec + mo.warpInSec;
          if (stateT <= wTotal && !tfWarped) {
            tfWarped = true; tfWarpPhase = 1; tfWarpT = mo.warpOutSec;
            Sound.sfx('warpOut');
            // 消える座に環がすぼまる＝「畳まれた」が形で残る
            spawnRingFx(boss.x, boss.y, int(tfc.glowInner), boss.radius * 1.5, 8, mo.warpOutSec + 0.1);
          }
          if (tfWarpPhase === 1) {
            tfWarpT -= dt;
            tfWarpAlpha = Math.max(0, tfWarpT / mo.warpOutSec);
            if (tfWarpT <= 0) {
              tfOrbA += (mo.warpJumpDeg[0]
                + run.rng.range(0, mo.warpJumpDeg[1] - mo.warpJumpDeg[0])) * D2R * tfOrbDir;
              boss.x = run.player.x + Math.cos(tfOrbA) * R;
              boss.y = run.player.y + Math.sin(tfOrbA) * R;
              tfOrbDir *= -1;
              tfWarpPhase = 2; tfWarpT = mo.warpInSec;
              Sound.sfx('warpIn');
              whiteFlash(0.14);
              spawnRingFx(boss.x, boss.y, 0xffffff, 10, boss.radius * 2.1, mo.warpInSec + 0.25);
              spawnPillarFx(boss.x, boss.y + boss.radius * 0.6, int(tfc.glowInner),
                26, boss.radius * 3.2, mo.warpInSec + 0.30);
              run.spawnParticles(boss.x, boss.y, int(tfc.glowInner), 14);
            }
          } else if (tfWarpPhase === 2) {
            tfWarpT -= dt;
            tfWarpAlpha = Math.min(1, 1 - tfWarpT / mo.warpInSec);
            if (tfWarpT <= 0) { tfWarpPhase = 0; tfWarpAlpha = 1; }
          } else {
            tfWarpAlpha = 1;
            tfOrbA += mo.orbitDegSec * D2R * tfOrbDir * dt;
            const txp = run.player.x + Math.cos(tfOrbA) * R;
            const typ = run.player.y + Math.sin(tfOrbA) * R;
            boss.x += (txp - boss.x) * Math.min(1, mo.glideRate * dt);
            boss.y += (typ - boss.y) * Math.min(1, mo.glideRate * dt);
            tfTrailT -= dt;
            if (tfTrailT <= 0) {   // 航跡：金の光が尾を引く（1発/0.07秒の予算制）
              tfTrailT = 0.07;
              run.spawnParticles(boss.x, boss.y + 6, int(tfc.glowInner), 1);
            }
          }
          if (stateT <= 0 && tfWarpPhase === 0) { tfWarped = false; beginAttack(); }
          break;
        }
        // R30「移動スピードも速い」。分離した上半身は身軽になり、再合体後はさらに詰めてくる。
        const cs = tfc ? tfc.chaseSpeed
          : cfg.chaseSpeed * (split ? cfg.split.upperSpeedMul : phase3 ? cfg.merge.speedMul : 1);
        moveBoss(nx * cs, ny * cs, dt);
        if (stateT <= 0) beginAttack();
        break;
      }

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

      case 'laserTele': {
        // R43 予告の後半で射線を固定し、薙ぐ側まで見せる（避ける情報を与える）
        const lk = cfg.laser;
        lockAim(lk.lockSec, lk.sweepToDeg - lk.sweepFromDeg, lk.beamLength);
        if (stateT <= 0) fireLaser();
        break;
      }
      case 'laserFire':
        if (stateT <= 0) afterAttack();
        break;

      // ★R30 分離のカットシーン。攻撃も体当たりもせず、下半身が切り離されるところだけを見せる。
      case 'splitCine': {
        const sp = cfg.split;
        const it = sp.cineSec - stateT;
        trackCine();
        if (cineStage < 1 && it >= 0.45) {
          cineStage = 1;
          detachLower();                          // ここで下半身が実体になる（以後2体で襲う）
        }
        if (stateT <= 0) finishSplit();
        break;
      }

      // ★R30 再合体のカットシーン。**必ずプレイヤーに見せる**（ユーザー指示）ので、
      //   暗幕・スローモーション・吸い寄せ・白フラッシュ・色変化を順番に置く。
      case 'mergeCine': {
        const mg = cfg.merge;
        const it = mg.cineSec - stateT;
        trackCine();
        if (lower && lower.active && mergeFrom) {
          // 下半身を本体へ吸い寄せる（＝合体していく様子そのもの。脚の絵はこの座標に追従する）
          const t = clamp01(it / (mg.cineSec * mg.contactAt));
          const e = t * t * (3 - 2 * t);
          lower.x = lerp(mergeFrom.x, boss.x, e);
          lower.y = lerp(mergeFrom.y, boss.y, e);
          if (lowerGlow) lowerGlow.setPosition(lower.x, lower.y).setAlpha(1 - e * 0.5);
          if (Math.floor(it * 20) % 2 === 0) {
            run.spawnParticles(lower.x, lower.y, int(cfg.glowInner), 2);
          }
        }
        if (cineStage < 2 && it >= mg.cineSec * mg.contactAt) {
          cineStage = 2;
          applyMergeLook();                       // 合体の瞬間＝メタリックパープルへ変わる
        }
        if (stateT <= 0) finishMerge();
        break;
      }

      // ★★ 転生カットシーン（亀裂→粉砕→真の姿の出現）。この間は無敵＝演出の途中で倒せない
      //    （R34で踏んだ「合体の瞬間に到達する前にHPが0になっていた」を繰り返さない）。
      case 'awakenCine': {
        const tf = cfg.trueForm;
        const it = (tf.crackSec + tf.riseSec) - stateT;
        trackCine();
        drawCrack(it);
        // R43 4段構成：亀裂 →(shatterAt)→ 溜め（膨らんで静止）→(burstAt)→ 粉砕 →(crackSec)→ 出現
        if (cineStage < 1 && it >= tf.shatterAt) { cineStage = 1; braceOldBody(); }
        if (cineStage < 2 && it >= (tf.burstAt || tf.shatterAt)) { cineStage = 2; shatterOldBody(); }
        if (cineStage < 3 && it >= tf.crackSec) { cineStage = 3; applyTrueLook(); }
        if (stateT <= 0) finishAwaken();
        break;
      }

      // ①整列レーザー：3つの環が主人公の方向へ一直線に揃う＝**射線が形で読める**予告。
      case 'alignTele': {
        // ★R43 揃いきる前に射線を固定する（旧実装は発射の瞬間まで追い続けていたので、
        //   発射フレームで既にビーム内＝反応時間0の確定84ダメージだった）。
        // ★R44W3 ただし**線は描かない**（実プレイFB「赤いラインはいらない。簡単によけられる」）。
        //   読む材料は環の面に戻す：揃った面が射線／ロックで追尾が止まる／振りかぶりで薙ぐ側。
        const ak = TF().aligned;
        alignAng = lockAim(ak.lockSec, 0, ak.beamLength, ak.showLine !== false);
        // 振りかぶり：ロック後、環の面を**薙ぐ向きと逆へ**溜める。剣を振る前に引くのと同じで、
        // どちらへ薙ぐかが形だけで読める（UIの線ではなく、ボスの体で伝える）。
        if (lockAng != null && ak.windUpDeg) {
          const w = clamp01(1 - stateT / Math.max(0.01, ak.lockSec));
          alignWind = -lockDir * ak.windUpDeg * D2R * (w * w * (3 - 2 * w));
          // 光が振りかぶり側へ集まる＝形に加えて「気配」でも薙ぐ側を伝える
          if (Math.floor(run.elapsed * 22) % 2 === 0) {
            const a = alignAng + alignWind - lockDir * 0.5;
            run.spawnParticles(boss.x + Math.cos(a) * boss.radius * 1.15,
              boss.y + Math.sin(a) * boss.radius * 1.15, 0xff3040, 2);
          }
        } else alignWind = 0;
        const prog = clamp01(1 - stateT / tfAlignSec());
        if (Math.floor(run.elapsed * 14) % 2 === 0 && prog > 0.4) {
          // 溜めの後半は赤を混ぜる＝「深紅のレーザーが来る」を色でも予告する（R36W2）
          run.spawnParticles(boss.x, boss.y,
            Math.floor(run.elapsed * 7) % 2 === 0 ? 0xff3040 : int(TF().glowInner), 2);
        }
        // ★文字は照射の直前（既定0.12秒前）に出す＝「文字が出た＝もう来ている」（R44W8）。
        //   予告の頭に出していた旧実装では、文字から照射まで 2.0秒 の猶予があった。
        if (!alignTold && stateT <= (ak.textLeadSec != null ? ak.textLeadSec : 0.12)) {
          alignTold = true;
          introText('せいれつ―― かんつうこう', '#ffedb0', 156, 18, 1);
        }
        if (stateT <= 0) fireAligned();
        break;
      }
      case 'alignFire':
        if (stateT <= 0) {
          // ★R40 実プレイFB「せいれつ―かんつうこうは素晴らしいが、よけやすいかも」。
          //   一射目は今までどおり**避けられる**（読める公平さは崩さない）。そのかわり
          //   二射目「再照準」が、避けた先の**新しい位置**へ短い予告で撃ち直す＝
          //   1回横に避けて立ち止まる怠けを罰する。二射目も発射後は固定＝必ず避けられる。
          if (TF() && TF().aligned2) {
            state = 'align2Tele'; stateT = TF().aligned2.relockSec;
            Sound.sfx('relock');
            introText('さいしょうじゅん', '#ff9e9e', 156, 15, 1);
          } else afterAttack();
        }
        break;
      case 'align2Tele': {
        // R43 二射目も最後の lockSec で固定する（避けた先を追うのは lockSec より前まで）
        alignAng = lockAim(TF().aligned2.lockSec, 0, TF().aligned2.beamLength);
        if (Math.floor(run.elapsed * 18) % 2 === 0) {
          run.spawnParticles(boss.x, boss.y, 0xff3040, 2);
        }
        if (stateT <= 0) fireAligned2();
        break;
      }
      case 'alignFire2':
        if (stateT <= 0) afterAttack();
        break;

      // ②聖句解放：環に刻まれた聖句が1文字ずつ剥がれて弾になる。3環が同じ角度から同時に剥がれるので
      //   弾は「環の形」のまま散る＝どこが空くかが形で読める。
      case 'verseTele':
        if (stateT <= 0) {
          state = 'verseFire'; stateT = TF().verse.fireSec; shotAcc = 0; shotIdx = 0;
          Sound.sfx('ringwave', 0.8, 1.2);
        }
        break;
      case 'verseFire': {
        const vk = TF().verse;
        // R37 激化：1環あたりの聖句が増える（14→20発）。fireSec は据え置き＝読み上げが速くなる
        const per = vk.perRing + rageArr('verseAdd', 0);
        const total = per * 3;
        const interval = vk.fireSec / total;
        shotAcc += dt;
        while (shotAcc >= interval && shotIdx < total) { shotAcc -= interval; fireVerse(shotIdx++, vk, per); }
        if (stateT <= 0) {
          // R40 読み上げ終わり＝ハロー（光輪）がひとつ大きく開いて閉幕。区切りが音と形で分かる
          spawnRingFx(boss.x, boss.y, 0xfff0b0, boss.radius * 0.8, boss.radius * 3.0, 0.5, 0.8);
          Sound.sfx('ringwave', 0.8, 1.5);
          afterAttack();
        }
        break;
      }

      // ③殻閉じ：装甲片（3つの環）が核へ戻って球に閉じ、無敵になって全方位へ衝撃波を吐く。
      //   ⚠️ 閉じ**きる前**（shellClose）はまだ眼が出ている＝ここへ当てれば閉じられない。
      //      「無敵で待たされる」を「割りにいく」へ裏返すための窓。
      case 'shellTele':
        if (stateT <= 0) {
          state = 'shellClose'; stateT = TF().shell.closeSec; shellDmg = 0;
          introText('いまなら とめられる！', '#ffd23f', 186, 17, 2);
          Sound.sfx('metalSlam', 0.8, 1.3);
        }
        break;
      case 'shellClose': {
        const sk = TF().shell;
        if (shellDmg >= boss.maxHp * sk.interruptRatio) { shellInterrupt(); break; }
        if (stateT <= 0) {
          state = 'shellHold'; stateT = sk.holdSec;
          whiteFlash(0.34); run.shake(320, 8);
          Sound.sfx('metalSlam'); Sound.sfx('bigBoom', 0.7, 0.7);
          // ★R44W5 かげおに。殻を閉じて祈っているあいだ、神は弾を撃たない——
          //   代わりに**主人公自身の影**を放つ。割って止めていれば（shellInterrupt）ここへ
          //   来ないので、**割れば影は出ない**＝「割りにいく」動機がいちばん強い技になる。
          spawnShadows();
          introText('かげおに ―― とまるな！', '#c98cff', 156, 18, 1);
        }
        break;
      }
      case 'shellHold': {
        // R44W5: 波の発射は廃止（→かげおに）。閉じているあいだは無敵のまま影が狩る。
        if (stateT <= 0) { state = 'shellOpen'; stateT = TF().shell.openSec; Sound.sfx('metalSlam', 0.8, 1.5); }
        break;
      }
      case 'shellOpen':
        if (stateT <= 0) afterAttack();
        break;
      case 'shellBreak':
        if (stateT <= 0) afterAttack();
        break;

      case 'chestTele': {
        // 溜めの「ド派手」は光が**胸のコアへ集まる**ことで作る（撃つ前から場所が分かる＝避けられる）
        const ck = cfg.chestLaser;
        const prog = clamp01(1 - stateT / ck.chargeSec);
        chestAcc = (chestAcc || 0) + dt;
        if (chestAcc >= 0.05) {
          chestAcc = 0;
          const w = weakPoint();
          const r = lerp(150, 26, prog);
          for (let i = 0; i < 3; i++) {
            const a = run.rng.range(0, Math.PI * 2);
            run.spawnParticles(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r,
              i % 2 ? int(cfg.merge.glowInner) : 0xffffff, 2);
          }
          if (prog > 0.6) run.shake(90, 2 + prog * 4);
        }
        lockAim(ck.lockSec, ck.sweepToDeg - ck.sweepFromDeg, ck.beamLength);   // R43 射線を固定して見せる
        if (stateT <= 0) fireChestLaser();
        break;
      }
      case 'chestFire':
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

      // ---- R29 コロガンナー：ローリングボム（転がる爆弾を撒く→止まった場所で予告→爆発）----
      case 'rollTele':
        if (stateT <= 0) { fireRollBombs(); afterAttack(); }
        break;

      // ---- R29 ジェットバイパー：フライパス（後退して助走→高速で突っ切りつつ弾を落とす）----
      case 'flyBack': {
        const fp = cfg.flypass;
        moveBoss(-nx * fp.backSpeed, -ny * fp.backSpeed, dt);   // 主人公から離れる＝これが予告
        if (stateT <= 0) {
          lockX = nx; lockY = ny;                                // 助走の終点で進路を固定
          state = 'flypass'; stateT = fp.durationSec; shotAcc = 0; shotIdx = 0;
          Sound.sfx('rush'); run.shake(120, 3);
        }
        break;
      }
      case 'flypass': {
        const fp = cfg.flypass;
        moveBoss(lockX * fp.speed, lockY * fp.speed, dt);
        shotAcc += dt;
        while (shotAcc >= fp.dropInterval) {
          shotAcc -= fp.dropInterval;
          dropFlypassBullets(fp);
        }
        if (stateT <= 0) afterAttack();
        break;
      }

      // ---- R29 ウズバルカン：うずまきバルカン（本体が回りながら螺旋弾）----
      case 'spiralTele':
        if (stateT <= 0) {
          state = 'spiralFire'; stateT = cfg.spiral.durationSec; shotAcc = 0; shotIdx = 0;
          run.shake(90, 3);
        }
        break;
      case 'spiralFire': {
        const sp = cfg.spiral;
        shotAcc += dt;
        while (shotAcc >= sp.shotInterval) {
          shotAcc -= sp.shotInterval;
          fireSpiralShot(sp, shotIdx);
          shotIdx++;
        }
        if (stateT <= 0) afterAttack();
        break;
      }

      // ---- R29 ウェイブロード：つなみウェーブ（切れ目が1箇所ある弾の壁を3枚）----
      case 'tsuTele':
        if (stateT <= 0) {
          state = 'tsuFire'; stateT = cfg.tsunami.waves * cfg.tsunami.waveInterval + 0.1;
          shotAcc = cfg.tsunami.waveInterval; shotIdx = 0;   // 1枚目は即発射
        }
        break;
      case 'tsuFire': {
        const tw = cfg.tsunami;
        shotAcc += dt;
        while (shotAcc >= tw.waveInterval && shotIdx < tw.waves) {
          shotAcc -= tw.waveInterval;
          fireTsunamiWave(tw, shotIdx);
          shotIdx++;
        }
        if (shotIdx >= tw.waves && stateT <= 0) afterAttack();
        break;
      }

      // ---- R29 ミサイルガ：ぜんだんはっしゃ（全弾を打ち上げ→着弾予告→時間差爆発）----
      case 'barTele':
        if (stateT <= 0) {
          const bg = cfg.barrage;
          state = 'barFire'; stateT = bg.count * bg.launchInterval + 0.1;
          shotAcc = bg.launchInterval; shotIdx = 0;
          run.floatText(boss.x, boss.y - boss.radius - 12, 'ぜんだん はっしゃ！', '#ff8a3d');
        }
        break;
      case 'barFire': {
        const bg = cfg.barrage;
        shotAcc += dt;
        while (shotAcc >= bg.launchInterval && shotIdx < bg.count) {
          shotAcc -= bg.launchInterval;
          fireBarrageOne(bg, shotIdx);
          shotIdx++;
        }
        if (shotIdx >= bg.count && stateT <= 0) afterAttack();
        break;
      }

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
    // ★R30 マオウレクスは phase2 ＝ 分離。節目を1つにまとめる（節目が多いほど1つ1つが薄まる）。
    if (cfg.split) { startSplit(); return; }
    if (cfg.rageText) run.floatText(boss.x, boss.y - 40, cfg.rageText, '#ff5e5e');
  }

  // ============ R30 分離／再合体（マオウレクス専用） ============
  // 設計：HPは boss 1本のまま。下半身(lower)は**ダメージを受けない砲台**にして、
  //   「どちらを先に倒すか」という別のゲームを作らない＝狙う場所は最後までコア1つに保つ。
  //   ⚠️ 下半身の絵は新規に作らない。rig の legL/legR を lower の座標へ付け替えるだけ
  //      （updateDisp のパーツ配置ループ1か所で分岐する）。破棄経路も既存のままで済む。
  function startSplit() {
    clearBullets();
    destroyWire();
    resetAttackVars();
    splitLaserDone = false;   // R37 じゃがんレーザーの保証（下の startMerge 条件を参照）
    cineStage = 0;
    state = 'splitCine';
    stateT = cfg.split.cineSec;
    spawnIntroDim();
    setBossDepthLift(INTRO_LIFT);
    if (!run.cinematic) { run.slowT = Math.max(run.slowT || 0, cfg.split.cineSec * 0.7); run.slowMul = 0.42; }
    whiteFlash(0.42);
    run.shake(420, 9);
    Sound.sfx('bigBoom');
    Sound.sfx('metalSlam', 1, 0.55);
    introText(cfg.split.text, '#ff7a7a', 128, 22, 3);
    introText(cfg.split.text2, '#ffd23f', 162, 16, 2);
  }

  // 下半身を実体化して切り離す。ここから2体で襲う。
  function detachLower() {
    const ang = aim + Math.PI;                        // 主人公と反対側へ抜ける＝挟み撃ちの形になる
    const d = cfg.split.dropDist;
    lowerGlow = run.add.image(boss.x, boss.y, 'glow').setBlendMode(ADD).setDepth(6 + INTRO_LIFT)
      .setTint(int(cfg.glowOuter)).setScale(cfg.glowScale * 0.9);
    lower = {
      active: true, isBoss: true, isLowerHalf: true, id: ++run._eid, def,
      x: boss.x + Math.cos(ang) * d, y: boss.y + Math.sin(ang) * d,
      color: int(def.color),
      // 実体はダメージを受けない（コアは上半身にある）。HPバーも撃破処理も上半身のものだけを使う。
      hp: 1e9, maxHp: 1e9,
      radius: cfg.split.lowerRadius, damage: cfg.split.lowerBodyDamage,
      isElite: false, slowMark: -1, flashT: 0,
      spr: disp.parts[0].img, glow: lowerGlow,
    };
    run.enemies.push(lower);
    lowerState = 'chase';
    lowerT = cfg.split.lowerFirstDelay;
    run.spawnParticles(boss.x, boss.y, int(cfg.glowInner), 34);
    run.spawnParticles(lower.x, lower.y, 0xffb020, 24);
    Sound.sfx('metalSlam', 1, 0.7);
    Sound.sfx('missileLaunch', 0.6, 0.6);
  }

  function finishSplit() {
    split = true;
    releaseCamera();
    clearIntroDim();
    setBossDepthLift(0);
    if (lowerGlow) lowerGlow.setDepth(6);
    // ★R37 分離の1手目（じゃがんレーザー）は間合いを取らず**即**撃ち始める。
    //   転生前HPを68000へ削った結果、chase 1.8秒を挟むとコア投げ2〜3発（約13000/発）で
    //   33%や0%を先に割り、「分かれたら撃ってくる」（R36W2で名指しの見せ場）が
    //   0回に終わる回が実測で出た。カットシーン明け→溜め1.0秒→発射なら、
    //   最速のコア2投（実測約1.3秒）より先に照射が始まる＝腕前に関係なく1回は見える。
    attackIdx = 0;
    beginAttack();
  }

  // 下半身のAI。追いかけて、一定間隔でホーミングミサイルを斉射するだけ（覚えることを増やさない）。
  function updateLower(dt) {
    if (!lower || !lower.active) return;
    const dx = run.player.x - lower.x, dy = run.player.y - lower.y;
    const d = Math.hypot(dx, dy) || 1;
    lowerT -= dt;
    if (lowerState === 'chase') {
      const sp = cfg.split.lowerSpeed;
      lower.x += (dx / d) * sp * dt;
      lower.y += (dy / d) * sp * dt;
      if (lowerT <= 0) {
        lowerState = 'tele'; lowerT = cfg.split.lowerTeleSec;
        Sound.sfx('warning', 0.5, 1.3);
      }
    } else if (lowerState === 'tele') {
      if (lowerT <= 0) {
        fireMissilesFrom(lower.x, lower.y, Math.atan2(dy, dx));
        lowerState = 'chase'; lowerT = cfg.split.lowerIntervalSec;
      }
    }
    if (lower.flashT > 0) lower.flashT -= dt;
    // 体当たり。上半身と同じ扱い（近づかれたら痛い）
    const rr = run.player.radius + lower.radius;
    if (dx * dx + dy * dy <= rr * rr) run.hitPlayer(lower.damage, lower.x, lower.y);
  }

  function startMerge() {
    // ⚠️ この印を立てないと update の条件が毎フレーム真のままで startMerge が呼ばれ続け、
    //    stateT と cineStage が巻き戻って**合体が永遠に終わらない**（実測で踏んだ）。
    merging = true;
    clearBullets();
    destroyWire();
    resetAttackVars();
    cineStage = 0;
    mergeFrom = lower ? { x: lower.x, y: lower.y } : null;
    state = 'mergeCine';
    stateT = cfg.merge.cineSec;
    spawnIntroDim();
    setBossDepthLift(INTRO_LIFT);
    if (lowerGlow) lowerGlow.setDepth(6 + INTRO_LIFT);
    if (!run.cinematic) { run.slowT = Math.max(run.slowT || 0, cfg.merge.cineSec * 0.8); run.slowMul = 0.38; }
    run.shake(300, 5);
    Sound.sfx('specialCharge');
    Sound.sfx('warning', 0.8, 0.6);
    introText(cfg.merge.text, '#e0a0ff', 122, 22, 3);
  }

  // ★R34 メタリックパープルの光沢。tint 単色だと「塗った」ではなく「暗くなった」に見えるので、
  //   本体色(#a86bff)と内側グロウ(#e0a0ff)のあいだをゆっくり往復させて金属の照り返しを作る。
  // ★R36W2 役割が変わった。旧実装は tint の乗算だけで「紫にする」を担っていたが、乗算では赤は
  //   紫にならない（実プレイFB「一部のみ変わっただけに見える」の正体）。紫そのものはテクスチャの
  //   差し替え（applyMergeLook）が担い、ここは**金属光沢**だけを担う：白（無変化）とラベンダーの
  //   間をゆっくり往復させ、ハイライトが表面を舐める。tint の乗算は暗くする方向にしか働かないので、
  //   「明 ⇄ やや暗」の往復＝艶に見える。
  function metalPurple() {
    const t = (Math.sin(run.elapsed * 2.6) + 1) / 2;
    return mixHex(0xffffff, int(cfg.merge.glowInner), 0.10 + t * 0.30);
  }

  // 合体の瞬間。色が変わるところを必ず1フレームの白フラッシュ越しに見せる。
  function applyMergeLook() {
    removeLower();
    split = false;
    phase3 = true;
    // ★R36W2 実プレイFB「いまは一部のみ変わっただけに見える。赤部分をメタリックパープルに」。
    //   tint（乗算）では赤は紫にならないので、紫パレットで焼いた別テクスチャへ**丸ごと差し替える**
    //   （詳細は enemies.js の MAOU_PAL_P コメント）。白フラッシュの裏で替わるので継ぎ目は見えない。
    if (def.palette3) {
      for (const p of disp.parts) { if (p.tex) p.img.setTexture(`boss_${def.id}_P${p.tex}`); }
    }
    disp.glowP.setTint(int(cfg.merge.glowOuter));
    disp.glowM.setTint(int(cfg.merge.glowInner));
    whiteFlash(0.48);
    run.shake(520, 12);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.16);
    run.spawnParticles(boss.x, boss.y, int(cfg.merge.tint), 48);
    run.spawnParticles(boss.x, boss.y, 0xffffff, 30);
    for (let i = 0; i < 3; i++) {
      run.time.delayedCall(i * 90, () => {
        if (!boss || !boss.active) return;
        run.spawnParticles(boss.x, boss.y, i % 2 ? 0xffffff : int(cfg.merge.glowInner), 22);
      });
    }
    Sound.sfx('bigBoom');
    Sound.sfx('thunder', 0.8);
    Sound.sfx('metalSlam', 1, 0.5);
    introText(cfg.merge.text2, '#c79cff', 160, 20, 3);
  }

  function finishMerge() {
    releaseCamera();
    clearIntroDim();
    setBossDepthLift(0);
    endAttackChase();
    attackIdx = 0;
    if (run.withAudio) Sound.startBgm('maou');
  }

  // ============ ★★ 真マオウレクス「軌道神核」＝第4形態への転生 ============
  // 実プレイFB「現在のメタリックパープルのマオウレクスを倒したら、そのマオウレクスのボディが亀裂を
  // 生じて、粉々に飛び散る。そして真のマオウレクスが出現する」。
  // ⚠️ 新しいボスを湧かせるのではなく、**同じエンティティを作り替える**。HPバー・報酬・撃破処理・
  //    弱点コアの経路が全部そのまま使えるので、真の姿だけで壊れる/湧く箇所を作らない。

  // HPが0になった瞬間に横取りする入口。旧体はここで止まり、無敵のカットシーンへ入る。
  function startAwaken() {
    const tf = cfg.trueForm;
    awakening = true;
    boss.active = true;              // killEnemy が落とした active を戻す（撃破ではなく変身）
    boss.hp = 1;                     // 0のままだと同じフレームで再び撃破判定に拾われる
    clearBullets();
    clearStrikes();
    destroyWire();
    removeLower();
    resetAttackVars();
    if (beamImg) { beamImg.setVisible(false); }
    if (beamCore) { beamCore.setVisible(false); }
    beam = null;
    // 旧体は砕けて無くなるので、分離／再合体の状態も一緒に畳む。残すと updateLower が
    // 居ない下半身を触りにいくし、legTransform も真の姿には無い脚を探しにいく。
    split = false; merging = false;
    cineStage = 0;
    state = 'awakenCine';
    stateT = tf.crackSec + tf.riseSec;
    spawnIntroDim();
    setBossDepthLift(INTRO_LIFT);
    if (!run.cinematic) { run.slowT = Math.max(run.slowT || 0, tf.crackSec * 0.8); run.slowMul = 0.38; }
    // 転生の瞬間は音楽を止める＝「終わったと思った」ところに沈黙を置いてから、真の姿で鳴らし直す
    if (run.withAudio) Sound.stopBgm();
    Sound.sfx('crush', 3);
    Sound.sfx('metalSlam', 1, 0.5);
    run.shake(460, 10);
    introText(tf.text, '#ff7a7a', 128, 22, 3);
  }

  // 旧体に走る亀裂。カットシーンの経過秒に応じて伸び、粉砕の瞬間に消える。
  function drawCrack(it) {
    const tf = cfg.trueForm;
    // R43: 亀裂は粉砕の瞬間（burstAt）まで描き続ける。shatterAt〜burstAt の「溜め」の間は
    //   p=1 のまま脈打たせる＝**割れきる寸前で止まっている**ことが絵で分かる（重さは溜めが作る）。
    const burst = tf.burstAt || tf.shatterAt;
    if (it >= burst) { if (trueCrack) { trueCrack.clear(); } return; }
    if (!trueCrack) trueCrack = run.add.graphics().setDepth(14 + INTRO_LIFT);
    const p = clamp01(it / tf.shatterAt);
    const held = it >= tf.shatterAt;                  // 溜め中＝限界の亀裂が脈打つ
    const R = boss.radius * 1.05 * (held ? 1.06 : 1);
    trueCrack.clear();
    // 中心から外へ枝分かれする稲妻を6本。太さより「伸びる速さ」で割れていく感じを作る
    // R43: 溜め中は本数を倍（6→12）＝限界まで走った亀裂。破片が増える伏線にもなる
    const lines = held ? 12 : 6;
    for (let i = 0; i < lines; i++) {
      const base = i * (Math.PI * 2 / lines) + 0.4;
      const seg = 5;
      let x = boss.x, y = boss.y, a = base;
      trueCrack.lineStyle(2.4 + Math.sin(run.elapsed * 40 + i) * 0.8,
        i % 2 === 0 ? 0xff3b2f : 0xffd23f, 0.55 + 0.45 * p);
      trueCrack.beginPath();
      trueCrack.moveTo(x, y);
      for (let k = 1; k <= seg; k++) {
        const t = (k / seg) * p;
        a = base + Math.sin(i * 2.3 + k * 1.7) * 0.42;
        x = boss.x + Math.cos(a) * R * t;
        y = boss.y + Math.sin(a) * R * t;
        trueCrack.lineTo(x, y);
      }
      trueCrack.strokePath();
    }
    if (Math.floor(it * 24) % 3 === 0) {
      run.spawnParticles(boss.x + run.rng.range(-R, R), boss.y + run.rng.range(-R, R), 0xff6a1f, 3);
    }
  }

  // R43 溜め：亀裂が限界に達し、旧体が**膨らんで静止する**。ここではまだ砕けない。
  //   重さは速度を落とすことではなく「止まる時間」が作る（R35 打撃音の二段構えと同じ原理）。
  //   息を吸うように外へ膨らみ、内側の火が漏れ、地鳴りだけが続く0.5秒。
  function braceOldBody() {
    const tf = cfg.trueForm;
    const ms = Math.max(120, ((tf.burstAt || tf.shatterAt) - tf.shatterAt) * 1000);
    Sound.sfx('bossStress');
    run.shake(ms, 5);                                  // 弱く長く＝破裂前の地鳴り
    if (disp) {
      for (const p of disp.parts) {
        const a = Math.atan2(p.img.y - boss.y, p.img.x - boss.x) + run.rng.range(-0.3, 0.3);
        run.tweens.add({
          targets: p.img, x: p.img.x + Math.cos(a) * 7, y: p.img.y + Math.sin(a) * 7,
          scaleX: p.img.scaleX * 1.10, scaleY: p.img.scaleY * 1.10,
          duration: ms, ease: 'Quad.in',               // じわ→ぐっ＝限界へ向かう膨張
        });
      }
    }
    for (let i = 0; i < 5; i++) {
      run.spawnParticles(boss.x + run.rng.range(-46, 46), boss.y + run.rng.range(-46, 46), 0xff6a1f, 5);
    }
  }

  // 粉砕：旧体の9パーツを外へ吹き飛ばす。破片は tween に任せ、applyTrueLook で必ず destroy する。
  // ★R43 実プレイFB「バラバラになるスピードをもう少し遅くして。破片の数もふやして」。
  //   ①遅く＝尺を 1.0秒→1.8秒（balance の burstAt で確保）＋ ease を Quart.out へ
  //     （出だしだけ速く、あとは空気に押されて重く漂う＝質量のある破片の落ち方）
  //   ②数＝9パーツから **各3片の小片**を追加で散らす（9→36片）。小片は本体パーツの
  //     テクスチャを縮めた複製なので、色も形も旧体そのもの＝「あの体が砕けた」に見える。
  function shatterOldBody() {
    if (trueCrack) { trueCrack.clear(); }
    whiteFlash(0.55);
    run.shake(620, 14);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.14);
    Sound.sfx('bigBoom');
    Sound.sfx('crush', 3);
    Sound.sfx('metalSlam', 1, 0.9);
    const tf = cfg.trueForm;
    const ms = Math.max(120, (tf.crackSec - (tf.burstAt || tf.shatterAt)) * 1000);
    const nShard = tf.shardsPerPart || 0;
    if (disp) {
      for (const p of disp.parts) {
        const a = run.rng.range(0, Math.PI * 2);
        const d = run.rng.range(150, 360);
        run.tweens.add({
          targets: p.img, x: p.img.x + Math.cos(a) * d, y: p.img.y + Math.sin(a) * d,
          angle: run.rng.range(-540, 540), alpha: 0, scaleX: p.img.scaleX * 0.5, scaleY: p.img.scaleY * 0.5,
          duration: ms, ease: 'Quart.out',
        });
        // 小片：同じ絵を縮めた複製をばらまく。飛距離・速さ・回転をばらつかせないと
        // 「一斉に開く花火」になってしまい、砕けたようには見えない。
        for (let k = 0; k < nShard; k++) {
          const sc = run.rng.range(0.26, 0.48);
          const img = run.add.image(p.img.x, p.img.y, p.img.texture.key)
            .setDepth(p.img.depth).setOrigin(0.5, 0.5)
            .setScale(p.img.scaleX * sc, p.img.scaleY * sc)
            .setAlpha(0.95);
          if (p.img.tintTopLeft != null && p.img.isTinted) img.setTint(p.img.tintTopLeft);
          shardImgs.push(img);
          const sa = run.rng.range(0, Math.PI * 2);
          const sd = run.rng.range(90, 420);
          run.tweens.add({
            targets: img, x: img.x + Math.cos(sa) * sd, y: img.y + Math.sin(sa) * sd,
            angle: run.rng.range(-900, 900), alpha: 0,
            scaleX: img.scaleX * 0.6, scaleY: img.scaleY * 0.6,
            duration: ms * run.rng.range(0.72, 1.0), ease: 'Quart.out',
          });
        }
      }
    }
    for (let i = 0; i < 16; i++) {
      run.spawnParticles(
        boss.x + run.rng.range(-84, 84), boss.y + run.rng.range(-84, 84),
        run.rng.pick([0xff3b2f, 0xffd23f, 0xc98cff, 0xffffff]), 16);
    }
  }

  // 小片の片付け（applyTrueLook / destroy から必ず呼ぶ＝tween 途中でも残さない）
  function clearShards() {
    for (const img of shardImgs) { run.tweens.killTweensOf(img); img.destroy(); }
    shardImgs.length = 0;
  }

  // 旧体を捨てて真の姿のリグへ組み替える。HP/半径/弱点/攻撃表もここで一斉に切り替わる。
  function applyTrueLook() {
    const tf = cfg.trueForm;
    const s = tf.spriteScale;
    clearShards();                      // R43 粉砕の小片（tween 途中でも必ず消す）
    if (disp) {
      for (const p of disp.parts) { run.tweens.killTweensOf(p.img); p.img.destroy(); }
      // ring/back は描画ループが役割を引くための印。role から推理させると、あとで rig を触った
      // ときに静かにズレる（環が1つだけ回らない、が起きても気づけない）ので明示的に持たせる。
      const RING_OF = { ringAb: [0, 1], ringAf: [0, 0], ringBb: [1, 1], ringBf: [1, 0],
        ringCb: [2, 1], ringCf: [2, 0] };
      const parts = def.trueRig.map((r) => {
        const img = run.add.image(boss.x, boss.y, `boss_${def.id}_T${r.tex}`);
        const origin = r.origin || PART_ORIGIN[r.role] || [0.5, 0.5];
        const depth = PART_DEPTH[r.role] || 9;
        img.setDepth(depth + INTRO_LIFT).setOrigin(origin[0], origin[1])
          .setScale(r.mirror ? -s : s, s).setAlpha(0);
        const rg = RING_OF[r.tex];
        return { img, role: r.role, tex: r.tex, ox: r.ox, oy: r.oy, mirror: !!r.mirror, depth,
          ring: rg ? rg[0] : -1, back: !!(rg && rg[1]) };
      });
      disp.parts = parts;
      disp.spriteScale = s;
      disp.glowP.setTint(int(tf.glowOuter));
      disp.glowM.setTint(int(tf.glowInner));
      boss.spr = parts[0].img;
    }
    destroyWeak();                      // 弱点表示は色が変わるので作り直す（tint は生成時に焼かれる）
    // HPバーの見出しも作り替える（hud は ent.def.name を読む）。def そのものは書き換えない＝
    // 次の周回で「最初からしん・マオウレクス」になってしまわないように浅いコピーを持たせる。
    if (tf.name) boss.def = Object.assign({}, def, { name: tf.name });
    trueForm = true;
    awakening = false;
    boss.hp = tf.hp; boss.maxHp = tf.hp;
    boss.radius = tf.radius;
    boss.damage = tf.bodyDamage;
    boss.gaugeSegments = tf.gaugeSegments || 1;
    lastHp = tf.hp;
    attackIdx = 0;
    ringSpin = [0, 2.1, 4.2];
    // R40 軌道遊弋の初期化：いまの方位から軌道に乗る（転生の瞬間に瞬間移動しない）
    tfOrbA = Math.atan2(boss.y - run.player.y, boss.x - run.player.x);
    tfOrbDir = 1; tfWarpPhase = 0; tfWarped = false; tfWarpAlpha = 1;
    whiteFlash(0.5);
    run.shake(520, 12);
    Sound.sfx('thunder');
    Sound.sfx('elite');
    run.spawnParticles(boss.x, boss.y, int(tf.glowInner), 40);
    introText(tf.text2, '#ffedb0', 162, 20, 4);
  }

  function finishAwaken() {
    releaseCamera();
    clearIntroDim();
    setBossDepthLift(0);
    if (trueCrack) { trueCrack.destroy(); trueCrack = null; }
    endAttackChase();
    attackIdx = 0;
    // ★R36W2 沈黙のあとは**専用曲**で鳴らし直す（実プレイFB「軌道神核用のBGMを用意して。
    //   マオウレクスのBGMを基に、神々しさのアレンジを」）。同じ作曲のまま編成が昇格するので、
    //   「同じ戦いの、別の段」だと耳で分かる。
    if (run.withAudio) Sound.startBgm('maouTrue');
  }

  // ============ 真の姿の攻撃3種 ============
  // ①整列レーザー。環が揃った向きがそのまま射線になる（予告が文字でなく形）。
  function fireAligned() {
    // R37 激化：薙ぎ幅が段で広がる。R44W3 で基準が 14°→120° になったので刻みも広げた
    // （最終段でも 146° ＜ 180°＝**逆側は必ず安全に残る**）。
    const ak = TF().aligned;
    const span = (ak.sweepDeg + rageArr('sweepDegAdd', 0)) * D2R;
    // ★R44W3 片方向の薙ぎ。射線から lockDir 側へ 120°を舐める＝横へ一歩ずれる答えを消し、
    //   「振りかぶりを読んで**正しい側**を選ぶ」を正解にする。両側に振ると主人公は必ず
    //   通過点になる（薙ぎ104°/s ＞ 座230pxでの横走り36.9°/s）ので、片方向であることが公平の芯。
    const dir = lockDir;  // clearLock より前に控える
    const a0 = ak.sweepOneWay ? alignAng : alignAng - span * 0.5;
    const a1 = ak.sweepOneWay ? alignAng + dir * span : alignAng + span * 0.5;
    // ★R36W2 実プレイFB「深みのある赤に。発射音や演出をできるだけ派手に」。
    //   深みは 暗い深紅の縁（beamTint）＋白熱の芯（coreTint）の2層で出す。音は専用の godLaser
    //   （sound.js・BGMを沈めて撃つ）。撃つ瞬間は 白フラッシュ＋揺れ＋ヒットストップ。
    clearLock();          // R43 一射目のロックを解く（二射目は改めて狙い直す）
    alignWind = 0;        // 振りかぶりは発射で戻る（溜めた力が返る）
    startBeam(a0, a1, ak.beamLength, ak.beamWidth, ak.damage, ak.activeSec,
      { tint: ak.beamTint, core: ak.coreTint, spark: 0xff4030, heavy: true, scorch: !!ak.scorch,
        sweepSec: ak.sweepSec });
    whiteFlash(0.55);
    run.shake(800, 18);
    Sound.sfx('godLaser');
    Sound.sfx('thunder');
    Sound.sfx('beam', 0.8, 0.7);
    recoil(alignAng);
    run.spawnParticles(boss.x, boss.y, 0xff3040, 30);
    run.spawnParticles(boss.x, boss.y, int(TF().glowInner), 22);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.20);
    state = 'alignFire'; stateT = ak.activeSec;
  }

  // ★R40 二射目「再照準」。細く・短く・軽く（84+52=136＜主人公HP140＝2連被弾でも即死しない）。
  //   一射目と同じ2層ビームだが幅0.72倍＝「同じ裁きの、追いの一太刀」に見える。
  function fireAligned2() {
    const ak = TF().aligned, a2 = TF().aligned2;
    const half = a2.sweepDeg * 0.5 * D2R;
    clearLock();          // R43 二射目のロックも解いてから撃つ
    startBeam(alignAng - half, alignAng + half, a2.beamLength, a2.beamWidth, a2.damage, a2.activeSec,
      { tint: ak.beamTint, core: ak.coreTint, spark: 0xff4030, heavy: true });
    whiteFlash(0.35);
    run.shake(420, 10);
    Sound.sfx('godLaser', 0.7, 1.25);
    recoil(alignAng);
    run.spawnParticles(boss.x, boss.y, 0xff3040, 16);
    state = 'alignFire2'; stateT = a2.activeSec;
  }

  // 環の楕円（スプライトと同じ形）。弾の湧く場所を絵と一致させるための表＝
  // [rx, ry, 傾き°]。ここがズレると「環から出ていない弾」になって嘘になる。
  const TRUE_RING_GEO = [[23, 8.5, 24], [23, 8.5, -24], [21, 6.4, 0]];

  // ②聖句解放。3つの環が同じ角度から同時に1文字ずつ剥がれ、環の形のまま外へ散る。
  function fireVerse(i, vk, per) {
    const ri = i % 3, step = Math.floor(i / 3);
    const n = per || vk.perRing;                          // R37 激化で1環の発数が変わる
    const sp = vk.bulletSpeed * rageArr('bulletMul', 1);  // R37 激化で弾速が上がる（最大×1.25）
    const s = disp ? disp.spriteScale : 9.4;
    const G = TRUE_RING_GEO[ri];
    const a = (step / n) * Math.PI * 2 + ringSpin[ri];
    const rot = G[2] * D2R, cr = Math.cos(rot), sr = Math.sin(rot);
    const ex = Math.cos(a) * G[0] * s, ey = Math.sin(a) * G[1] * s;
    const px = boss.x + ex * cr - ey * sr, py = boss.y + ex * sr + ey * cr;
    const out = Math.atan2(py - boss.y, px - boss.x);
    // ★R40 実プレイFB「せいくかいほうの攻撃ビジュアルがしょぼすぎる。最終ボスの攻撃ではない」。
    //   弾を**聖句の文字そのもの**にする：専用ルーン弾（verse_glyph・回転しながら飛ぶ）＋
    //   白金の輝き。剥がれる瞬間は環の位置に小さな輪が弾け、光の欠片が散る＝
    //   「環から文字が剥がれた」が1発ずつ見える。
    // ★R44W4「文字を基にしているのは神格性があっていい。そこに退廃（悪魔性）を込められないか」。
    //   発射の瞬間は**あくまで聖句**（白金）。堕ちるのは飛んでからで、fallSec 後に
    //   corruptGlyph() が形・色・回転をまとめて堕とす＝過程が見える（→ updateBullets）。
    spawnBullet2(px, py, Math.cos(out) * sp, Math.sin(out) * sp,
      { radius: vk.bulletRadius, damage: vk.damage, life: vk.lifeSec,
        kind: 'glyph', tint: 0xfff0b0, spin: 3.2, fallSec: vk.fallSec });
    run.spawnParticles(px, py, 0xffd23f, 2);
    if (i % 3 === 0) {
      spawnRingFx(px, py, 0xffd23f, 4, 22, 0.30, 0.7);
      // 読み上げの鐘。tick（機械音）から versePeal（聖堂の小鐘）へ＝音程が1周ぶん昇る
      Sound.sfx('versePeal', 0.6, 1.0 + (step / n) * 1.0);
    }
  }

  // ③殻閉じ →「かげおに」（R44W5）。
  // ★実プレイFB「丸い弾も修正して。オリジナリティーあふれる攻撃に。今度は退廃性（悪魔性）が
  //   強く、やや理不尽な攻撃にして。できれば弾以外の意外な攻撃に」。
  //   旧実装（R40 の judge_orb 全方位弾 3〜4波）を廃止し、**主人公自身の影**が狩る技へ。
  //   ⚠️ judge_orb のテクスチャと弾種 'judge' の機構は残してある（spawnBullet2 は汎用の
  //     弾インフラで、消すと差分が広がるだけ。使うのをやめただけ＝grep で確認済み）。
  //
  //   仕組み：主人公の位置を毎フレーム記録し（shadowHist）、影はその**過去の再生**として動く。
  //     - 影の再生時計 pt は実時間の speedMul 倍で進む＝過去がだんだん現在に追いつく
  //     - ただし (いま − pt) は minGapSec より縮まない＝**走り続ける限り絶対に捕まらない**床。
  //       止まる・引き返す・小さく回る、だけが捕まる＝「やや理不尽」はこの床の上に立つ
  //     - 倒立（flipY）＝堕ちた聖句と同じ語彙。色も紫→深紅（VERSE_FALL_A/B）を脈で往復
  //     - 殻が開いても影は lifeSec まで残り、果てる瞬間に小さな闇の炸裂（nova）を置いていく
  let shadowHist = [];      // {t, x, y} 主人公の足あと（真の姿のあいだだけ記録）
  let shadows = [];         // 生きている影
  // 検証用の実績カウンタ。⚠️ hitPlayer のダメージ値で外から仕分けると、聖句16と炸裂16の
  // ように**同値の別ソース**を混同する（実測で139回の誤計上をやった）。発生源で数える。
  const shadowStats = { spawned: 0, bites: 0, novaHits: 0, novas: 0 };
  let novaFxBudget = 2;     // 後続の影が撒く炎の1フレーム上限（判定は無いので絵だけ間引く）
  // R44W7: 影の姿は**モビット**（主人公ではない）。実プレイFB「かげおには主人公ではなく
  //   モビットのほうがよい」。いま連れているパーティの顔ぶれをそのまま使う＝
  //   「自分のなかまの堕ちた影に追われる」。進化ずみなら進化形の顔で来る。
  const SHADOW_SCALE = 3.3;   // モビットは16x16（主人公は18x16）ぶん大きめにして画面上の背丈を合わせる
  function shadowTexKeys() {
    const keys = [];
    for (const m of (run.party || [])) {
      const src = (m.evolved && m.def && m.def.evo) ? m.def.evo : m.def;
      if (src && run.textures.exists('mon_' + src.id)) keys.push('mon_' + src.id);
    }
    if (!keys.length && run.textures.exists('mon_starpuppy')) keys.push('mon_starpuppy');
    return keys.length ? keys : ['player'];
  }
  function recordShadowHist() {
    shadowHist.push({ t: run.elapsed, x: run.player.x, y: run.player.y });
    // 最長ディレイ+余裕ぶんだけ保持（無限に伸ばさない）
    const keep = run.elapsed - 6.5;
    while (shadowHist.length > 2 && shadowHist[0].t < keep) shadowHist.shift();
  }
  function histAt(t) {
    if (!shadowHist.length) return { x: run.player.x, y: run.player.y };
    if (t <= shadowHist[0].t) return shadowHist[0];
    for (let i = shadowHist.length - 1; i >= 0; i--) {
      if (shadowHist[i].t <= t) {
        const a = shadowHist[i], b = shadowHist[Math.min(i + 1, shadowHist.length - 1)];
        const span = b.t - a.t || 1;
        const k = clamp01((t - a.t) / span);
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      }
    }
    return shadowHist[shadowHist.length - 1];
  }
  // R44W7: 進行方向（履歴上の速度ベクトル）。列を「進行方向に垂直」へ振るために要る。
  //   ここが無いと横並びが画面のX軸に固定され、主人公が縦へ走ると隊列が1列に潰れて見える。
  function histDirAt(t) {
    const a = histAt(t - 0.12), b = histAt(t);
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) return { x: 1, y: 0 };
    return { x: dx / d, y: dy / d };
  }
  function spawnShadows() {
    destroyShadows();                                   // 前回の残りが居たら重ねない
    const sk = TF().shell.shadow;
    const lanes = sk.lanes + rageArr('lanesAdd', 0);
    // 列のオフセット（中央から左右対称）。中央に近いほど |off| が小さい＝先頭の噛み手を選ぶ基準
    const laneOffs = [];
    for (let l = 0; l < lanes; l++) laneOffs.push((l - (lanes - 1) / 2) * sk.laneGapPx);
    // ★噛み手は「中央にいちばん近い列」を**添字で**選ぶ。旧実装は |offset| < laneGapPx/2 で
    //   選んでいたので、列が**偶数**（R44W8 の4列）だと中央に0の列が無く**誰も噛み手にならない**
    //   （＝どの影も判定を持たない無音の空振り）。噛み手だけは lane を 0 に固定する＝
    //   足あとの上を正確になぞる（横にずれると立ち止まっても届かない）。
    let biterLane = 0;
    for (let l = 1; l < lanes; l++) {
      if (Math.abs(laneOffs[l]) < Math.abs(laneOffs[biterLane])) biterLane = l;
    }
    const texKeys = shadowTexKeys();          // 顔ぶれは体ごとに巡回＝隊列がぜんぶ同じ顔にならない
    for (let r = 0; r < sk.ranks; r++) {
      for (let l = 0; l < lanes; l++) {
        const pt = run.elapsed - (sk.spawnBackSec + r * sk.rankSpreadSec);
        const p = histAt(pt);
        // 後ろの段ほど小さく淡い＝奥行き。先頭（噛み手）だけが等身大＝「追いつくのは先頭だけ」が形で分かる
        const depth = 1 - r / Math.max(1, sk.ranks) * 0.42;
        const isBiter = r === 0 && l === biterLane;
        // 千鳥＝奇数段を半列ずらす。間隔を広げずに**真後ろの重なり**だけを消せる
        const stag = (sk.stagger && r % 2) ? sk.laneGapPx * 0.5 : 0;
        // 個体ごとの固定ゆらぎ（決定的な擬似乱数）＝整列した格子ではなく「群れ」になる
        const hsh = Math.sin(r * 12.9898 + l * 78.233) * 43758.5453;
        const jit = ((hsh - Math.floor(hsh)) * 2 - 1) * (sk.jitterPx || 0);
        const lane = isBiter ? 0 : laneOffs[l] + stag + jit;
        // ★R44W8 depth は**種類ごと**に分ける（体ごとに pool→img→eye と積むと、描画順が
        //   white / mon_ / glow と交互になり、24体ぶん**バッチが割れて**FPSが落ちる。
        //   実測 15体56fps → 24体33fps の主因はここだった）。同じテクスチャがまとまるので
        //   ドローコールは体数に比例しなくなる。噛み手だけは前面（+1）。
        const dz = isBiter ? 1 : 0;
        const pool = run.add.image(p.x, p.y + 10, 'white').setDepth(7.5)
          .setTint(0x14060e).setAlpha(0).setDisplaySize(44 * depth, 14 * depth);
        const tex = texKeys[(r * lanes + l) % texKeys.length];
        const img = run.add.image(p.x, p.y, tex).setScale(SHADOW_SCALE * depth).setFlipY(true)
          .setDepth(8 + dz).setAlpha(0).setTint(VERSE_FALL_A);
        const eye = run.add.image(p.x, p.y + 8, 'glow').setBlendMode(ADD)
          .setDepth(8.5 + dz).setTint(0xd01228).setAlpha(0)
          .setDisplaySize(16 * depth, 16 * depth);
        // ★分身（残像）＝自分の再生時計を ghostLagSec ずつ遡った位置に置く。
        //   「走る姿がぶれて見える」＝速さの記号。位置は履歴から引くだけなので毎フレームの
        //   生成が要らず、体数が増えても破綻しない。
        //   ★R44W8 後ろの段は1枚だけにする＝体数が1.6倍になっても画面上の枚数はほぼ据え置き。
        //     分身が効くのは「速く走って見える」ためなので、読める距離にいる前列だけで足りる。
        const gc = r < (sk.ghostNearRanks != null ? sk.ghostNearRanks : sk.ranks) ? sk.ghostCount : 1;
        const ghosts = [];
        for (let g = 0; g < gc; g++) {
          ghosts.push(run.add.image(p.x, p.y, tex).setScale(SHADOW_SCALE * depth).setFlipY(true)
            .setDepth(7).setAlpha(0).setTint(VERSE_FALL_A));
        }
        shadows.push({ img, eye, pool, ghosts,
          pt, riseT: 0, rising: true,
          // 段ごとに寿命をずらす＝先頭から後ろへ**連鎖して**爆ぜる（同時だと1発の白飛びになる）
          life: sk.lifeSec - (sk.ranks - 1 - r) * sk.chainSec,
          dmgT: 0, idx: r, rank: r, laneIdx: l, lane, depth, biter: isBiter });
        shadowStats.spawned++;
      }
    }
    Sound.sfx('shadowRise');
  }
  function updateShadows(dt) {
    if (!shadows.length) return;
    const sk = TF() && TF().shell ? TF().shell.shadow : null;
    if (!sk) { destroyShadows(); return; }
    let dripBudget = 2;                                 // 影のしずくは1フレーム合計2個まで
    novaFxBudget = 2;                                   // 後続の炎は1フレーム2体まで（24体の連鎖でも粒が暴れない）
    for (let i = shadows.length - 1; i >= 0; i--) {
      const s = shadows[i];
      const baseA = s.biter ? 0.9 : 0.34 + s.depth * 0.34;   // 後続は淡い＝先頭が読める
      if (s.rising) {
        s.riseT += dt;
        const k = clamp01(s.riseT / sk.riseSec);
        s.img.setAlpha(baseA * k).setScale(SHADOW_SCALE * s.depth * (0.4 + 0.6 * k));
        s.pool.setAlpha(0.5 * s.depth * k);
        s.eye.setAlpha(0.9 * s.depth * k);
        if (k >= 1) s.rising = false;
        continue;                                       // 起き上がるまでは動かない＝読める
      }
      // 再生時計を進める。床＝影ごとに minGap + idx×gapStep（同じ床だと全員が1点に重なって
      // 1体に見える＝実測で判明。ずらすと「堕ちた自分の隊列」が数えられる）。
      // ★残り flareSec は**その場に静止**＝時計を進めない。走者の背後で爆ぜる回避不能を消し、
      //   「影が立ち止まった＝爆ぜる」の予告を身体の動きで伝える（振りかぶりと同じ考え方）。
      const flaring = s.life <= sk.flareSec;
      if (!flaring) {
        s.pt += dt * sk.speedMul;
        const floor = sk.minGapSec + s.rank * sk.rankGapSec;
        if (run.elapsed - s.pt < floor) s.pt = run.elapsed - floor;
      }
      // 列は**進行方向に垂直**へ振る（画面のX軸に固定すると縦走行で1列に潰れる）
      const d = histDirAt(s.pt);
      const nx = -d.y * s.lane, ny = d.x * s.lane;
      const h = histAt(s.pt);
      const p = { x: h.x + nx, y: h.y + ny };
      if (p.x !== s.img.x) s.img.setFlipX(p.x < s.img.x);
      s.img.setPosition(p.x, p.y);
      s.pool.setPosition(p.x, p.y + 10);
      s.eye.setPosition(p.x, p.y + 8);
      // 分身（残像）＝自分の再生時計を少しずつ遡った位置。静止しているあいだは出さない
      // （動いていないのにぶれると「壊れている」に見える）。
      for (let g = 0; g < s.ghosts.length; g++) {
        const gh = s.ghosts[g];
        if (flaring) { gh.setAlpha(0); continue; }
        const gt = s.pt - sk.ghostLagSec * (g + 1);
        const hg = histAt(gt), dg = histDirAt(gt);
        gh.setPosition(hg.x - dg.y * s.lane, hg.y + dg.x * s.lane)
          .setFlipX(s.img.flipX)
          .setScale(SHADOW_SCALE * s.depth * (1 - 0.06 * (g + 1)))
          .setAlpha(baseA * (0.42 / (g + 1)))
          .setTint(s.img.tintTopLeft);
      }
      // 紫⇄深紅の脈（堕ちた聖句と同じ2色を往復＝同じ「堕ちたもの」だと色で分かる）
      const pulse = 0.5 + 0.5 * Math.sin(run.elapsed * 6 + s.idx * 2.1);
      s.img.setTint(mixRgb(VERSE_FALL_A, VERSE_FALL_B, pulse));
      if (dripBudget > 0 && s.biter && Math.floor(run.elapsed * 14) % 3 === 0) {
        dripBudget--;
        run.spawnParticles(p.x, p.y + 6, 0x2a0a18, 1);
      }
      // ★噛むのは先頭1体だけ（実プレイFB「主人公に追いつくのは常に先頭だけ」）。
      //   後続は速さと圧の演出に徹する＝15体ぶんの判定が重ならない＝理不尽にならない。
      const dx = run.player.x - p.x, dy = run.player.y - p.y;
      if (s.biter) {
        s.dmgT -= dt;
        const rr = sk.radius + run.player.radius;
        if (s.dmgT <= 0 && dx * dx + dy * dy <= rr * rr) {
          s.dmgT = 0.8;
          shadowStats.bites++;
          Sound.sfx('shadowBite');
          run.hitPlayer(sk.damage, p.x, p.y);
        }
      }
      // 寿命。残り flareSec は静止して深紅に張りつめ、膨らむ＝炸裂の予告
      s.life -= dt;
      if (flaring) {
        const w = clamp01(1 - s.life / sk.flareSec);
        s.img.setTint(mixRgb(VERSE_FALL_B, 0xff6a5a, w))
          .setScale(SHADOW_SCALE * s.depth + w * 0.9);
        s.eye.setDisplaySize(16 * s.depth + w * 22, 16 * s.depth + w * 22);
        // 先頭だけは足元に**判定と同じ半径の環**を出す＝爆風の本当の広さを学習できる
        if (s.biter && !s.ringed && s.life <= sk.flareSec * 0.45) {
          s.ringed = true;
          spawnRingFx(p.x, p.y, 0xff8a1f, sk.novaRadius * 0.35, sk.novaRadius, sk.flareSec * 0.45, 0.5);
        }
      }
      if (s.life <= 0) {
        shadowNova(s, p, sk, dx, dy);
        s.img.destroy(); s.eye.destroy(); s.pool.destroy();
        for (const gh of s.ghosts) gh.destroy();
        shadows.splice(i, 1);
      }
    }
  }
  // ★R44W7「最後弾けるのも演出が地味。**炎を出しながら大爆発**して。爆発音も派手に。
  //   **爆風が主人公を襲う**効果もいい。ただし爆風の範囲が広すぎるのはダメ」。
  //   判定を持つのは**先頭1体の1つの円だけ**（novaRadius）。後続は炎だけを撒く＝
  //   画面は大爆発、判定は1つ（[[feedback_one_hit_one_circle]]）。
  //   見た目は判定より外まで広がる。逆（判定＞見た目）は「かすってもいないのに当たった」になる。
  function shadowNova(s, p, sk, dx, dy) {
    shadowStats.novas++;
    if (s.biter) {
      // ★★R44W8 実プレイFB「かげおにの一番の不満点は**爆発と爆風**。もっとずっと派手に。
      //   とくに**エフェクトと音（爆発音と爆風音）**をいまよりずっと派手に」。
      //   派手さは「1枚を強くする」では出ない（0.36の閃光は白飛びして炎が消えた実測）。
      //   **層を増やして時間差で置く**＝目が「まだ終わらない」と感じ続けるのが派手さの正体。
      //   ①白の閃光 →（40ms）橙の閃光＝炎が画面を舐める ②環6枚（芯・衝撃波・火球・
      //   外環・煤・遅れて第二衝撃波）③放射状の炎柱8本 ④遅れて立ち上る煙柱
      //   ⑤billiard の shockRing 2枚 ⑥火の粉4種 ⑦二段の画面ゆれ。
      whiteFlash(0.26);
      run.time.delayedCall(40, () => whiteFlash(0.30, 0xff8a1f, 200));   // 炎が舐める
      run.shake(760, 26);
      run.time.delayedCall(150, () => run.shake(380, 10));               // 遅れて来る地響き
      Sound.sfx('shadowBurst');            // BGMを沈めるのは SFX 側（duckBgm は sound.js の内部関数）
      // 白熱の芯 → 白の衝撃波 → 炎 → 深紅の外環 → 煤。★2枚目の橙が**判定と同じ半径**
      spawnRingFx(p.x, p.y, 0xffffff, 6, sk.novaRadius * 0.42, 0.12, 1.0);
      spawnRingFx(p.x, p.y, 0xfff3d0, 8, sk.novaRadius * 0.75, 0.18, 0.95);
      spawnRingFx(p.x, p.y, 0xff8a1f, 10, sk.novaRadius, 0.30, 0.92);
      spawnRingFx(p.x, p.y, 0xff3a12, 12, sk.novaRadius * 1.45, 0.40, 0.8);
      spawnRingFx(p.x, p.y, 0xc0102a, 14, sk.novaRadius * 2.2, 0.60, 0.62);
      spawnRingFx(p.x, p.y, 0x2a0a18, 18, sk.novaRadius * 1.15, 0.70, 0.55);
      run.time.delayedCall(120, () =>                                    // 第二衝撃波＝1発で終わらない
        spawnRingFx(p.x, p.y, 0xffd07a, 20, sk.novaRadius * 1.8, 0.34, 0.5));
      // ★炎柱を放射状に8本。pillar は上へしか伸びないので、**周囲8点に置いて**四方へ噴かせる
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const rr = sk.novaRadius * (0.35 + (k % 2) * 0.35);
        spawnPillarFx(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.6 + 6,
          k % 2 ? 0xffb020 : 0xff5a10, 18, sk.novaRadius * (1.1 + (k % 3) * 0.35), 0.36);
      }
      spawnPillarFx(p.x, p.y + 6, 0xff6a1f, 34, sk.novaRadius * 2.1, 0.46);
      run.time.delayedCall(180, () =>                                    // 遅れて立ち上る煙
        spawnPillarFx(p.x, p.y + 4, 0x3a1420, 26, sk.novaRadius * 2.6, 0.85, 0.5));
      if (run.billiard && run.billiard.shockRing) {
        run.billiard.shockRing(p.x, p.y, sk.novaRadius * 1.1, 0xffc060);
        run.billiard.shockRing(p.x, p.y, sk.novaRadius * 1.9, 0xffffff);
      }
      run.spawnParticles(p.x, p.y, 0xffffff, 12);      // 白熱の破片
      run.spawnParticles(p.x, p.y, 0xffe9a8, 22);
      run.spawnParticles(p.x, p.y, 0xff6a1f, 26);
      run.spawnParticles(p.x, p.y, 0x2a0a18, 18);      // 煤
      if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.15);
      const nr = sk.novaRadius + run.player.radius;
      if (dx * dx + dy * dy <= nr * nr) {
        shadowStats.novaHits++;
        run.hitPlayer(sk.novaDamage, p.x, p.y);        // 位置を渡す＝爆風が主人公を押し飛ばす
        // ★「爆風音」は爆発音とは別（FBが2つに分けて書かれている）。爆心から**主人公へ**
        //   届いた風＝当たった本人にだけ鳴る。絵も主人公から外向きに火の粉を散らす＝
        //   「巻き込まれた」が自分の身体の側で起きる。
        const d = Math.hypot(dx, dy) || 1;
        Sound.sfx('shadowBlast');
        whiteFlash(0.22, 0xff5a10, 240);
        run.shake(520, 16);
        run.spawnParticles(run.player.x + (dx / d) * 10, run.player.y + (dy / d) * 10, 0xff8a1f, 14);
        run.spawnParticles(run.player.x, run.player.y, 0xffffff, 8);
        spawnRingFx(run.player.x, run.player.y, 0xffd07a, 4, 46, 0.26, 0.8);
      }
    } else {
      // 後続は判定を持たない炎だけ。段が後ろほど小さく＝奥で連鎖しているように見える
      if (novaFxBudget > 0) {
        novaFxBudget--;
        spawnRingFx(p.x, p.y, 0xff8a1f, 6, sk.novaRadius * 0.75 * s.depth, 0.26, 0.6);
        run.spawnParticles(p.x, p.y, 0xff6a1f, 5);
        run.spawnParticles(p.x, p.y, 0x2a0a18, 4);
        Sound.sfx('shadowBurst', 0.35, 1.15 + s.rank * 0.06);
      }
    }
  }
  function destroyShadows() {
    for (const s of shadows) {
      s.img.destroy(); s.eye.destroy(); s.pool.destroy();
      if (s.ghosts) for (const gh of s.ghosts) gh.destroy();
    }
    shadows.length = 0;
  }

  // 閉じきる前に眼へ規定量を当てられた＝閉じられない。大きな隙（追撃の窓）に化ける。
  function shellInterrupt() {
    const sk = TF().shell;
    state = 'shellBreak'; stateT = sk.breakSec;
    bossStagT = sk.breakSec;
    shellDmg = 0;
    whiteFlash(0.3);
    run.shake(380, 9);
    Sound.sfx('crush', 3);
    Sound.sfx('metalSlam', 1, 0.8);
    run.spawnParticles(boss.x, boss.y, 0xffd23f, 30);
    introText('から とじを こわした！', '#ffd23f', 156, 20, 2);
  }

  // ★胸部レーザー（再合体後だけ・作中最大ダメージ）。既存のビーム経路に乗せて、
  //   派手さは「溜めの収束光＋発射の白フラッシュ＋長い薙ぎ＋落雷音」で作る。
  function fireChestLaser() {
    const ck = cfg.chestLaser;
    // R36W2 紫の2層ビーム（光線の色は紫・実プレイFB）＋専用発射音＋受けた実感（heavy）
    // R43 ロックした射線から片方向へ薙ぐ（じゃがんと同じ理由＝主人公を通過点にしない）
    const a0 = lockAng != null ? lockAng : aim;
    const span = (ck.sweepToDeg - ck.sweepFromDeg) * D2R;
    const cFrom = ck.sweepOneWay ? a0 : a0 + ck.sweepFromDeg * D2R;
    const cTo = ck.sweepOneWay ? a0 + lockDir * span : a0 + ck.sweepToDeg * D2R;
    clearLock();
    startBeam(cFrom, cTo,
      ck.beamLength, ck.beamWidth, ck.damage, ck.activeSec,
      { tint: ck.beamTint, core: '#f6eaff', spark: 0xb44dff, heavy: true });
    whiteFlash(0.49);
    run.shake(600, 14);
    Sound.sfx('darkLaser');
    Sound.sfx('thunder');
    recoil(aim);
    run.spawnParticles(boss.x, boss.y, int(cfg.merge.glowInner), 40);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.10);
    state = 'chestFire'; stateT = ck.activeSec;
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
  function fireMissiles() { fireMissilesFrom(boss.x, boss.y, aim); }

  // R30: 発射元を引数にした（分離中は**下半身**が撃つ＝ユーザー指示「ミサイルは下半身が出す」）。
  function fireMissilesFrom(ox, oy, ang) {
    const mk = cfg.missile, mid = (mk.count - 1) / 2;
    for (let i = 0; i < mk.count; i++) {
      const sx = (i - mid) * 45;
      spawnBullet2(ox, oy, sx, -mk.launchSpeed,
        { radius: mk.radius, damage: mk.damage, life: mk.lifeSec, kind: 'missile',
          maxTurn: mk.maxTurnDeg * D2R, speed: mk.speed, blast: mk.blastDamage });
    }
    // R29: 発射音（実プレイFB「発射音も作って」）。斉射なので3発ぶんだけ音程をずらして重ね、
    //   「シュボボッ！」と束で撃ち出された厚みを作る（7発ぶん鳴らすと潰れて1発に聞こえる）。
    // R31: 実プレイFB「発射音やミサイルの飛来する音は、本物の地対空ミサイルを参考にして」。
    //   missileLaunch（点火だけ）→ samLaunch（コールドローンチの破裂→空中点火のクラック→短い噴射）へ。
    //   飛来音は撃った瞬間に1回鳴らして終わりだったので、飛んでいるあいだ鳴らし続ける（下の flySfxT）。
    Sound.sfx('samLaunch');
    Sound.sfx('samLaunch', 0.72, 1.14);
    Sound.sfx('samLaunch', 0.56, 0.88);
    Sound.sfx('samFly', 0.85);
    missileFlyT = 0.34;
    run.shake(220, 6);
    // 反動でのけぞるのは「撃った本人」だけ。下半身が撃ったのに上半身が揺れると、
    // どちらが撃ったのか分からなくなる（＝2体に分かれた意味が消える）。
    const fromBoss = ox === boss.x && oy === boss.y;
    if (fromBoss) recoil(aim);
    const mt = fromBoss ? tip()
      : { x: ox + Math.cos(ang) * cfg.split.lowerRadius, y: oy + Math.sin(ang) * cfg.split.lowerRadius };
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(mt.x, mt.y, ang, int(cfg.bulletTint));
    run.spawnParticles(mt.x, mt.y, int(cfg.bulletTint), 10);
    run.spawnParticles(mt.x, mt.y, 0xffb020, 8);
  }

  // R31 ミサイルの着弾爆発（実プレイFB「主人公に当たった先の爆発や爆発音もつけて」）。
  // 旧実装は `Sound.sfx('hit')` と粒子8個だけで、当たっても爆発が起きていなかった。
  // big = 主人公に直撃した1発（＝いちばん見せたい爆発）。false は寿命切れの自爆。
  function missileBoom(x, y, big, snd) {
    const tint = int(cfg.bulletTint);
    run.spawnParticles(x, y, 0xfff0a0, big ? 18 : 8);   // 閃光の芯（白〜黄）
    run.spawnParticles(x, y, 0xff8a2b, big ? 22 : 10);  // 火の玉（橙）
    run.spawnParticles(x, y, tint, big ? 14 : 6);       // 弾体の破片
    if (run.billiard && run.billiard.shockRing) {
      run.billiard.shockRing(x, y, big ? 96 : 52, 0xffc060);
      if (big) run.billiard.shockRing(x, y, 150, 0xffffff);
    }
    // 音は間引く（7発が同時に爆ぜると潰れて1発ぶんに聞こえ、かえって地味になる）
    if (missileBoomT <= 0) {
      Sound.sfx(snd || 'samBoom', big ? 1 : 0.6);
      missileBoomT = big ? 0.16 : 0.09;
    }
    // ⚠️ 揺れは「主人公に起きたこと」だけに使う。Phaser の shake は実行中だと後から来た
    //    強い揺れを**無視する**ので、7発の自爆それぞれで揺らすと直撃の大きな揺れが飲まれる。
    if (big) {
      run.shake(280, 9); whiteFlash(0.30);
      if (run.freezeT != null && !run.cinematic) run.freezeT = Math.max(run.freezeT, 0.05);
    }
  }

  // 波動砲：前方へ太い短命ビームを sweepDeg 分だけ薙ぐ
  function fireWave() {
    const wc = cfg.wavecannon, half = wc.sweepDeg * 0.5 * D2R;
    startBeam(aim - half, aim + half, wc.beamLength, wc.beamWidth, wc.damage, wc.activeSec);
    whiteFlash(0.4); Sound.sfx('bigBoom'); recoil(aim);
    state = 'waveFire'; stateT = wc.activeSec;
  }

  // じゃがんレーザー（R36W2 改名・分離した上半身の単眼バイザーから撃つ）：極太貫通ビームを
  // sweepFrom→sweepTo へゆっくり回転薙ぎ。紫の縁＋白熱の芯の2層＋専用発射音＋受けた実感（heavy）。
  function fireLaser() {
    if (split) splitLaserDone = true;   // R37 「分かれたら撃ってくる」が今回も1回見えた
    const lk = cfg.laser;
    // ★R43 ロックした射線から撃つ（発射時に主人公の正面へ引き直さない）。
    //   薙ぎは片方向＝主人公を薙ぎの**始点**に置く。両側へ振ると主人公は必ず通過点になり、
    //   薙ぎ120°/s ＞ 主人公148px/s のため構造的に回避不能だった。
    const a0 = lockAng != null ? lockAng : aim;
    const span = (lk.sweepToDeg - lk.sweepFromDeg) * D2R;
    const from = lk.sweepOneWay ? a0 : a0 + lk.sweepFromDeg * D2R;
    const to = lk.sweepOneWay ? a0 + lockDir * span : a0 + lk.sweepToDeg * D2R;
    clearLock();
    startBeam(from, to, lk.beamLength, lk.beamWidth,
      lk.damage, lk.activeSec,
      { tint: lk.beamTint, core: '#f2e2ff', spark: 0xc470ff, heavy: true });
    whiteFlash(0.45); Sound.sfx('darkLaser'); recoil(a0);
    run.shake(420, 10);
    run.spawnParticles(boss.x, boss.y, 0xc470ff, 24);
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

  // ============ R29 署名攻撃（通常ボス5体・1体につき1種類） ============
  // ローリングボム（コロガンナー）：転がる爆弾を扇状に撒く。止まると予告円が出て、少し遅れて爆発。
  // 「飛んでくる弾を避ける」ではなく「置かれた爆弾から離れる」＝立ち位置を動かす遊びになる。
  function fireRollBombs() {
    const rb = cfg.rollbomb, mid = (rb.count - 1) / 2;
    for (let i = 0; i < rb.count; i++) {
      const a = aim + (i - mid) * (rb.spreadDeg * D2R);
      spawnBullet2(boss.x, boss.y, Math.cos(a) * rb.speed, Math.sin(a) * rb.speed,
        { radius: 7, damage: 0, life: rb.fuseSec, kind: 'bomb', decel: rb.decel, noHit: true });
    }
    Sound.sfx('metalSlam', 0.4, 1.6);
    run.spawnParticles(boss.x, boss.y, int(cfg.bulletTint), 10);
    recoil(aim);
  }

  // フライパス（ジェットバイパー）：通過中に進行方向の左右へ弾をばら撒く。真後ろへは撒かない
  // ＝「通り過ぎたら安全」が成立し、横へ逃げる正解が読める。
  function dropFlypassBullets(fp) {
    const base = Math.atan2(lockY, lockX);
    for (const s of [1, -1]) {
      const a = base + s * (Math.PI / 2);   // 進行方向の真横（前後には撒かない）
      spawnBullet2(boss.x, boss.y, Math.cos(a) * fp.bulletSpeed, Math.sin(a) * fp.bulletSpeed,
        { radius: fp.bulletRadius, damage: fp.damage, life: fp.lifeSec });
    }
    if (shotIdx % 3 === 0) Sound.sfx('shoot');
    run.spawnParticles(boss.x - lockX * 14, boss.y - lockY * 14, int(cfg.bulletTint), 3);
    shotIdx++;
  }

  // うずまきバルカン（ウズバルカン）：主人公を狙わず、arms 本の腕を stepDeg ずつ回しながら撃ち続ける。
  // 弾が渦を描くので、立ち止まると必ず当たる／走り続ければ隙間を抜けられる、という別の遊びになる。
  function fireSpiralShot(sp, i) {
    const base = i * sp.stepDeg * D2R;
    for (let k = 0; k < sp.arms; k++) {
      const a = base + (Math.PI * 2 * k) / sp.arms;
      spawnBullet2(boss.x, boss.y, Math.cos(a) * sp.bulletSpeed, Math.sin(a) * sp.bulletSpeed,
        { radius: sp.bulletRadius, damage: sp.damage, life: sp.lifeSec });
    }
    if (i % 4 === 0) { Sound.sfx('shoot'); run.shake(40, 2); }
  }

  // つなみウェーブ（ウェイブロード）：全方位の壁を1枚。ただし gapDeg 分だけ穴を空ける。
  // 穴の位置は波ごとに gapSpinDeg 回るので、次の穴を探して走り抜ける遊びになる。
  function fireTsunamiWave(tw, w) {
    const gapCenter = aim + Math.PI + w * tw.gapSpinDeg * D2R;   // 1枚目の穴は主人公の背後側
    const half = tw.gapDeg * 0.5 * D2R;
    for (let i = 0; i < tw.count; i++) {
      const a = (Math.PI * 2 * i) / tw.count;
      if (Math.abs(Phaser.Math.Angle.Wrap(a - gapCenter)) < half) continue;   // ここが抜け道
      spawnBullet2(boss.x, boss.y, Math.cos(a) * tw.bulletSpeed, Math.sin(a) * tw.bulletSpeed,
        { radius: tw.bulletRadius, damage: tw.damage, life: tw.lifeSec });
    }
    // 抜け道の方向にだけ光の筋を出す＝穴の位置を目で探せるようにする（理不尽にしない）
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(boss.x, boss.y, gapCenter, 0xffffff);
    Sound.sfx('ringwave');
    run.shake(90, 3);
    run.spawnParticles(boss.x, boss.y, int(cfg.bulletTint), 10);
  }

  // ぜんだんはっしゃ（ミサイルガ）：背中のラックからミサイルを1発ずつ真上へ打ち上げ、
  // 主人公の"進む先"へ着弾予告マーカーを落とす。warnSec 後に順番に爆発＝足元が塗り潰されていく。
  function fireBarrageOne(bg, i) {
    // 打ち上げの見た目（当たり判定なし）。ラック位置からミサイルが飛び出して画面上へ消える。
    const sx = boss.x + (i % 2 === 0 ? -1 : 1) * boss.radius * 0.42;
    const sy = boss.y - boss.radius * 0.2;
    launchVisual(sx, sy);
    // 着弾点：主人公の現在地＋進行方向の予測（leadSec 秒先）＋ばらつき。1発目は必ず足元へ落とす。
    const lead = i === 0 ? 0 : bg.leadSec;
    const tx = run.player.x + (run.player.vx || 0) * lead + (i === 0 ? 0 : run.rng.range(-bg.spread, bg.spread));
    const ty = run.player.y + (run.player.vy || 0) * lead + (i === 0 ? 0 : run.rng.range(-bg.spread, bg.spread));
    spawnStrike(tx, ty, bg.warnSec, bg.blastRadius, bg.damage);
    Sound.sfx('missileLaunch', 0.7, 1 + (i % 3) * 0.05);
    if (i % 3 === 0) run.shake(50, 2);
    recoil(aim);
  }

  // 打ち上げの見た目だけの1発（判定なし）。上へ加速しながら小さくなって消える。
  function launchVisual(x, y) {
    const img = run.add.image(x, y, 'boss_missile').setDepth(11).setTint(int(cfg.bulletTint))
      .setDisplaySize(14, 26).setRotation(Math.PI);       // 頭を上へ
    run.tweens.add({
      targets: img, y: y - 190, scaleX: 0.4, scaleY: 0.4, alpha: 0,
      duration: 480, ease: 'Cubic.in', onComplete: () => img.destroy(),
    });
    run.spawnParticles(x, y, 0xffb020, 4);
  }

  // ============ 着弾予告→爆発（ローリングボム／ぜんだんはっしゃ が共用） ============
  // 予告円が縮んで着弾点へ収束し、0になった瞬間に爆発する。ボス弾と違い**位置が先に見える**ので、
  // 「避ける」ではなく「そこに居ないようにする」遊びになる。生成物は必ず clearStrikes で破棄する。
  function spawnStrike(x, y, delay, radius, damage) {
    const color = int(cfg.bulletTint);
    const g = run.add.graphics().setDepth(5);
    const halo = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(5).setTint(color)
      .setScale(radius / 40).setAlpha(0.18);
    strikes.push({ x, y, t: delay, max: delay, radius, damage, color, g, halo });
  }
  function updateStrikes(dt) {
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.t -= dt;
      const p = clamp01(1 - s.t / s.max);
      if (s.t <= 0) { explodeStrike(s); destroyStrike(s); strikes.splice(i, 1); continue; }
      const blink = (Math.floor(run.elapsed * 16) % 2 === 0) ? 1 : 0.45;
      s.g.clear();
      s.g.lineStyle(3, s.color, 0.85 * blink);
      s.g.strokeCircle(s.x, s.y, s.radius);                    // 爆発範囲（動かない）
      s.g.lineStyle(2, 0xffffff, 0.8 * blink);
      s.g.strokeCircle(s.x, s.y, s.radius * (1 - p * 0.82));   // 収束する内側の輪＝残り時間
      s.halo.setAlpha(0.14 + 0.22 * p);
    }
  }
  function explodeStrike(s) {
    const dx = run.player.x - s.x, dy = run.player.y - s.y;
    const rr = s.radius + run.player.radius;
    if (dx * dx + dy * dy <= rr * rr) run.hitPlayer(s.damage, s.x, s.y);
    run.spawnParticles(s.x, s.y, s.color, 16);
    run.spawnParticles(s.x, s.y, 0xffe24a, 10);
    if (run.fx && run.fx.hitSpark) run.fx.hitSpark(s.x, s.y, 0xffffff);
    // 爆発は同時多発するので、音と揺れだけ間引く（渋滞させると1発も感じられなくなる）
    if (run.elapsed - strikeSfxT >= 0.11) {
      strikeSfxT = run.elapsed;
      Sound.sfx('bigBoom', 0.5);
      run.shake(120, 4);
    }
  }
  function destroyStrike(s) {
    if (s.g) s.g.destroy();
    if (s.halo) s.halo.destroy();
  }
  function clearStrikes() {
    for (const s of strikes) destroyStrike(s);
    strikes.length = 0;
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
    // R34W2: 実プレイFB「ナックルウェーブの攻撃音や発射音がなにもかわっていない」。
    //   旧実装は R29 の knuckle＋missileFly＋shoot の重ね（＝汎用ミサイル音の流用）だった。
    //   knuckleWave は「両拳のクラッシュ → 発射管が開く → 7本が1本ずつずれて点火」の専用音。
    //   ずらすのが要点＝同時だと1発の爆発に聞こえて「7本撃った」が数えられない。
    whiteFlash(0.34); Sound.sfx('knuckleWave');
    run.shake(300, 8); recoil(aim);
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
    // R29: 射出音を激しく（実プレイFB）。金属スイープ(wireShot)だけだと「ギーン」で終わるので、
    //   ロケットの点火(missileLaunch)を重ねて「ドシュッ！ギュイィン」の2段にし、揺れも倍にする。
    // R31: 実プレイFB「攻撃音をもっと派手に。マジンガーゼットを参考にして」。
    //   マジンガーZ のロケットパンチは①肘から先が分離 ②光子力ロケットで点火 ③マッハ2で飛ぶ、の3段。
    //   旧実装には①の分離音と③の超音速が無かったので、rocketPunchFire（3段を1音にまとめた新SFX）へ。
    // R34W3: 実プレイFB「射出音をもっと派手にして。戦車の砲撃音を参考に」。
    //   砲撃音(wireCannon)を頭に据え、ロケットの点火(rocketPunchFire)は薄く後ろへ回す。
    //   両方を全開で重ねると潰れて「一発の破裂」になり、かえって小さく聞こえる。
    Sound.sfx('wireCannon');
    Sound.sfx('rocketPunchFire', 0.45);   // 点火とマッハ2のスイープは残す（拳＝ロケットなので）
    Sound.sfx('wireShot', 0.35);          // 従来の金属スイープはさらに薄く（拳＝機械の質感）
    punchFlyT = 0.12;
    run.shake(430, 14); whiteFlash(0.44);
    if (run.freezeT != null && !run.cinematic) run.freezeT = Math.max(run.freezeT, 0.05);
    for (const arm of wire.arms) {
      run.spawnParticles(arm.sx, arm.sy, 0xffb020, 14);   // 肘から噴く光子力ロケットの炎
      run.spawnParticles(arm.sx, arm.sy, 0xffffff, 8);
      if (run.billiard && run.billiard.shockRing) run.billiard.shockRing(arm.sx, arm.sy, 62, 0xffd070);
    }
    drawWire();
  }
  function updateWire(dt) {
    const wk = cfg.wirearm;
    // R31: 飛来音。拳が主人公へ近づくほど音程を上げて連打する（マッハ2で迫ってくる恐怖）。
    // 旧実装は射出時に wireFly を1回鳴らすだけで、飛んでいる 0.55 秒間ずっと無音だった。
    if (punchFlyT > 0) punchFlyT -= dt;
    if (punchFlyT <= 0) {
      let nd = -1;
      for (const arm of wire.arms) {
        if (arm.hit) continue;
        const d = Math.hypot(arm.fx - run.player.x, arm.fy - run.player.y);
        if (nd < 0 || d < nd) nd = d;
      }
      if (nd >= 0) {
        const near = clamp01(1 - nd / 360);
        Sound.sfx('rocketPunchFly', 0.6 + near * 0.5, 0.9 + near * 0.5);
        punchFlyT = 0.16 - near * 0.06;
      }
    }
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
          // R29: 命中の瞬間を「殴られた」音にする（hit の軽い音では 64 ダメージの重さに合わない）
          // R31: 「主人公にあたったときの音や衝撃も」＝音だけでなく**衝撃**を足す。
          //   rocketPunchHit（より低く長い金属爆発）＋強シェイク＋白フラッシュ＋ヒットストップ＋衝撃波。
          // R35: 「もっとガツンという激しい音に。極端すぎるくらいでちょうど良い」。
          //   音だけ大きくしても「ガツン」にはならない。**画面が止まる時間**が体で感じる衝撃を作るので、
          //   ヒットストップ 0.11→0.17秒（+55%）、シェイク 460/14→560/22 まで引き上げる。
          //   音側は sound.js で二段構え＋本物の歪み＋BGMダックへ作り直してある。
          Sound.sfx('rocketPunchHit');
          run.shake(560, 22); whiteFlash(0.48);
          if (run.freezeT != null && !run.cinematic) run.freezeT = Math.max(run.freezeT, 0.17);
          if (run.billiard && run.billiard.shockRing) {
            run.billiard.shockRing(arm.fx, arm.fy, 120, 0xffffff);
            run.billiard.shockRing(arm.fx, arm.fy, 76, int(cfg.bulletTint));
          }
          run.spawnParticles(arm.fx, arm.fy, int(cfg.bulletTint), 22);
          run.spawnParticles(arm.fx, arm.fy, 0xffffff, 16);
          run.spawnParticles(arm.fx, arm.fy, 0xffb020, 12);
        }
      }
      // R42: 空振りニアミス。拳が最接近して**離れ始めた瞬間**に「ヒュンッ」（近いほど大きく鋭く）。
      //   接近中に鳴らすと直後の命中音と重なるので、通過が確定してから。緊張感は避けた回数（恒久基準）。
      if (!arm.hit && !arm.whooshed) {
        const d = Math.hypot(arm.fx - run.player.x, arm.fy - run.player.y);
        if (arm.minD == null || d < arm.minD) arm.minD = d;
        else if (arm.minD < 74 && d > arm.minD + 2) {
          arm.whooshed = true;
          const near = clamp01(1 - (arm.minD - 35) / 39);
          Sound.sfx('wireWhoosh', 0.5 + near * 0.5, 0.95 + near * 0.25);
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
    // R42: 巻き戻しウィンチ（backSec 0.3秒がこれまで無音だった）。命中/空振りに関係なく
    //   機械の音として毎回鳴らす＝「攻撃が終わった」の合図。下の rocketHit とは帯域が違うので重ねてよい。
    Sound.sfx('wireWinch');
    // 命中/最大到達の一撃感：大きな衝撃音＋強めシェイク＋whiteFlash(<0.5)＋一瞬のヒットストップ
    // R29: metalSlam → rocketHit（拉げる低音＋破断の高域）に差し替えて攻撃音を激しくする
    // R31: 命中していたら updateWire で rocketPunchHit を鳴らし切っているので、ここで重ねると
    //   低音が団子になって**かえって軽く聞こえる**。当たらず空振りで伸び切ったときだけ鳴らす。
    const anyHit = wire.arms.some((a) => a.hit);
    if (!anyHit) {
      Sound.sfx('rocketHit'); run.shake(300, 8); whiteFlash(0.44);
      if (run.freezeT != null && !run.cinematic) run.freezeT = Math.max(run.freezeT, 0.07);
    }
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

  // ============ R29 弱点コア（cfg.weak を持つボス＝マオウレクスのみ） ============
  // 実プレイFB「弱点部分を作成し、そこに弾を当てないとダメージを与えられないようにして」。
  // 設計：本体はどこを殴っても通らない（「カキン！」と弾く）。**位置を持つ攻撃がコア円に触れたときだけ**
  // ダメージが通り、狙って当てた報酬として weak.mul 倍になる。
  //   - 投げた弾／特殊弾／仲間の弾 … 当たった座標で判定する（＝狙えば通る・流し撃ちでは通らない）
  //   - 素手の一撃／自動拳／オーラ  … 座標を持たない近接なので常に弾かれる（＝接近しても解決しない）
  //   - 必殺技                      … 爆風なので「コアが爆心から radius 以内か」で判定する（倍率は付かない）
  // コアは胸の高さで左右にゆっくり泳ぐ。phase2 では周期が縮んで狙いにくくなる。
  // ent を渡すとその個体のコアを返す。★R30 下半身(lower)はコアを持たない＝null。
  //   null を返すと billiard 側は通常の当たり判定に落ち、dealDamage が weakGate で必ず弾く
  //   （＝下半身は「触れると弾く装甲」。倒すには上半身のコアを狙うしかない）。
  function weakPoint(ent) {
    if (!boss || !boss.active || !cfg || !cfg.weak) return null;
    if (ent && ent.isLowerHalf) return null;
    const w = weakCfg();
    // ★真の姿：殻を閉じているあいだは眼そのものが装甲の内側に隠れる＝狙う場所が消える。
    //   （weakGate が弾くだけだと「見えているのに通らない」になり、R31 で直したのと同じ形になる）
    if (trueForm && (state === 'shellHold' || state === 'shellOpen')) return null;
    const sec = phase2 ? w.phase2SwaySec : w.swaySec;
    const sx = w.swayX ? Math.sin((run.elapsed * Math.PI * 2) / sec) * w.swayX : 0;
    return { x: boss.x + sx, y: boss.y + boss.radius * w.offY, r: w.radius };
  }
  // at = { x, y, r, hitR } … r>0 は爆風（範囲攻撃・コア倍率なし）。at 省略＝座標を持たない近接。
  // ★R31 hitR ＝ **飛び道具そのものの当たり半径**。実プレイFB「コアにビリヤード弾をあてているのに
  //   体力がほとんどへらない」の原因がここにあった。
  //   billiard 側の当たり判定は `s.radius + weak.r`（玉の半径を数える）で「コアに当たった」と判定して
  //   玉を消費するのに、ここのダメージ判定は `weak.r` だけ（＝玉の中心が27px以内）を要求していた。
  //   玉の半径は 22.7〜28.4px あるので、当たった面積のうち実際に通るのは 27²/(27+22.7)² ≒ 24〜30% だけ。
  //   残りは **bossImpact の演出（止め・揺れ・輪・金属音）を全部出したうえで「0」を表示して砕ける**。
  //   しかも玉は段位が上がるほど大きくなるので、**強くなるほど通らなくなる**という逆転まで起きていた。
  //   → 判定円を billiard 側と一致させる。r（範囲攻撃）と違いコア倍率(2.4)は落とさない：
  //     これは「範囲攻撃だからボーナス無し」ではなく「同じ1発の判定円をそろえる」だけの修正。
  function weakGate(src, at, ent) {
    if (!cfg || !cfg.weak) return { pass: true, mul: 1 };
    // ★R34 実バグ。カットシーン中は一切通さない。
    //   実測：再合体カットシーン(2.4秒)の**0.9秒目**でHPが0になり、体の色がメタリックパープルへ
    //   変わる瞬間（contactAt=0.62＝1.49秒目）に一度も到達していなかった。実プレイFB
    //   「再合体した際に体の色がメタリックパープルへ変化するはずだが。それもなかった」の正体はこれ。
    //   演出の途中で倒せてしまう限り、演出をどれだけ豪華にしても**原理的に見えない**。
    if (state === 'maouIntro' || state === 'splitCine' || state === 'mergeCine'
      || state === 'awakenCine' || awakening) {
      return { pass: false, mul: 0 };
    }
    if (ent && ent.isLowerHalf) return { pass: false, mul: 0 };
    // ★真の姿の殻閉じ：閉じきったあいだは何を当てても通らない（眼が装甲の内側）。
    //   閉じている**途中**（shellClose）は通る＝そこが「割りにいく」窓になる。
    if (trueForm && (state === 'shellHold' || state === 'shellOpen')) return { pass: false, mul: 0 };
    const w = weakPoint(ent);
    if (!w) return { pass: true, mul: 1 };
    if (!at || at.x == null) return { pass: false, mul: 0 };
    const dx = at.x - w.x, dy = at.y - w.y;
    const rr = w.r + (at.r || at.hitR || 0);
    if (dx * dx + dy * dy <= rr * rr) return { pass: true, mul: at.r ? 1 : weakCfg().mul, core: !at.r };
    return { pass: false, mul: 0 };
  }
  // 弾かれた（＝コアを外した）ときの反応。多発するので音と文字は間引く。
  function deflect(x, y) {
    if (!boss || !cfg || !cfg.weak) return;
    const px = x == null ? boss.x : x, py = y == null ? boss.y : y;
    // 仲間の弾も自動拳も全部ここへ来るので、演出はまとめて間引く（渋滞させると何も伝わらない）
    if (run.elapsed - deflectT < 0.14) return;
    deflectT = run.elapsed;
    if (run.fx && run.fx.hitSpark) run.fx.hitSpark(px, py, 0xdfe6ee);
    Sound.sfx('counter', 0.4, 1.7);
    run.spawnParticles(px, py, 0xdfe6ee, 5);
    if (run.elapsed - deflectTextT >= 1.1) {
      deflectTextT = run.elapsed;
      run.floatText(px, py - 12, 'カキン！', '#dfe6ee');
    }
  }
  // コアに当てたときの反応（狙って当てた手応え＝ここは派手に）。
  function coreHitFx(x, y) {
    if (!cfg || !cfg.weak) return;
    const w = weakPoint();
    const cx = x == null ? (w ? w.x : boss.x) : x, cy = y == null ? (w ? w.y : boss.y) : y;
    Sound.sfx('crush', 3);
    Sound.sfx('metalSlam', 0.6, 1.25);
    run.shake(180, 6);
    run.spawnParticles(cx, cy, int(weakCfg().tint), 18);
    run.spawnParticles(cx, cy, 0xffffff, 10);
    if (run.elapsed - coreTextT >= 0.5) {
      coreTextT = run.elapsed;
      run.floatText(cx, cy - 22, weakCfg().label, '#fff2a8');
    }
  }
  // コアの見た目（毎フレーム再描画）。露出した炉心＝赤いハロー＋白熱した芯＋脈打つ照準リング。
  function drawWeak() {
    const w = weakPoint();
    if (!w) { if (weakEls) hideWeak(); return; }
    if (!weakEls) {
      weakEls = {
        halo: run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(12).setTint(int(weakCfg().tint)),
        g: run.add.graphics().setDepth(13),
      };
    }
    const pulse = 0.5 + 0.5 * Math.sin(run.elapsed * 7);
    const haloMul = weakCfg().ringOnly ? 0.45 : 1;   // 眼が自分で光るぶんハローは控える
    weakEls.halo.setVisible(true).setPosition(w.x, w.y)
      .setDisplaySize(w.r * 4.4, w.r * 4.4).setAlpha((0.34 + 0.2 * pulse) * haloMul);
    const g = weakEls.g;
    g.clear();
    // ★ringOnly＝弱点そのものが「絵」のとき（真の姿の単眼）は塗りつぶさない。
    //   実測でこれが起きていた：weak.radius 48 の72%＝半径34pxの金色ベタが眼の中心を覆い、
    //   描き下ろした眼（強膜・金の輪・虹彩・縦裂の瞳）が**画面に一度も出ていなかった**。
    //   第3形態は「装甲が開いて露出した炉心」＝そこに絵が無いので塗りが正しかった。
    if (!weakCfg().ringOnly) {
      g.fillStyle(int(weakCfg().tint), 0.95);
      g.fillCircle(w.x, w.y, w.r * 0.72);
      g.fillStyle(int(weakCfg().coreTint), 0.95);
      g.fillCircle(w.x, w.y, w.r * (0.30 + 0.10 * pulse));   // 白熱した芯が脈打つ
    }
    // 照準リング（外へ広がって消える2重の輪）＝「ここを狙え」の記号
    g.lineStyle(2.4, 0xffffff, 0.85);
    g.strokeCircle(w.x, w.y, w.r);
    g.lineStyle(1.6, int(weakCfg().coreTint), 0.55 + 0.35 * pulse);
    g.strokeCircle(w.x, w.y, w.r * (1.15 + 0.35 * pulse));
    for (let i = 0; i < 4; i++) {           // 十字の照準マーク
      const a = (Math.PI / 2) * i + Math.PI / 4;
      const r0 = w.r * 1.1, r1 = w.r * 1.45;
      g.lineStyle(2, 0xffffff, 0.7);
      g.lineBetween(w.x + Math.cos(a) * r0, w.y + Math.sin(a) * r0,
        w.x + Math.cos(a) * r1, w.y + Math.sin(a) * r1);
    }
  }
  function hideWeak() {
    if (!weakEls) return;
    if (weakEls.halo) weakEls.halo.setVisible(false);
    if (weakEls.g) weakEls.g.clear();
  }
  function destroyWeak() {
    if (!weakEls) return;
    if (weakEls.halo) weakEls.halo.destroy();
    if (weakEls.g) weakEls.g.destroy();
    weakEls = null;
  }

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
  // ★R30 カットシーンのあいだだけカメラを上半身（＋下半身）へ寄せる。
  //   ⚠️ これが無いと、ボスから離れた位置で節目を迎えたとき分離も変色も**画面外で起きる**。
  //      実測：主人公が320px離れていると、再合体の瞬間は画面左端の外だった。
  //   ズームは触らない（scrollFactor 0 の暗幕/テロップがズームで縮み、画面端が空くため）。
  //   尺は実時間で詰める（スロー中でもカメラだけは間に合わせる）。
  function trackCine() {
    if (!boss) return;
    const cam = run.cameras.main;
    if (!camHeld) { camHeld = true; cam.stopFollow(); }
    const lp = lower && lower.active ? lower : null;
    const tx = (lp ? (boss.x + lp.x) / 2 : boss.x) - cam.width / 2;
    const ty = (lp ? (boss.y + lp.y) / 2 : boss.y) - cam.height / 2;
    const k = Math.min(1, (run.realDt || 0.016) * 5);
    cam.scrollX += (tx - cam.scrollX) * k;
    cam.scrollY += (ty - cam.scrollY) * k;
    // 見せているあいだは雑魚にも殴らせない（ボスの体当たりは既に止めてある）。
    // 画面の外にいる主人公が理不尽に削られるのが一番しらける。
    if (run.player) run.player.invuln = Math.max(run.player.invuln || 0, 0.3);
  }
  function releaseCamera() {
    if (!camHeld) return;
    camHeld = false;
    const cam = run.cameras.main;
    if (run.playerImg) cam.startFollow(run.playerImg, true, 0.18, 0.18);
  }

  // 画面フラッシュ（白フラッシュ alpha < 0.5 厳守）
  // tint / dur は省略可（既定＝従来どおり白・260ms）。★色つきの短い閃光を白の直後に重ねると
  //   「炎が画面を舐めた」に見える＝白だけを強くするより派手で、しかも炎が白飛びで消えない。
  function whiteFlash(a, tint = 0xffffff, dur = 260) {
    const cam = run.cameras.main;
    const f = run.add.image(cam.width / 2, cam.height / 2, 'white').setScrollFactor(0)
      .setDepth(2000).setBlendMode(ADD).setTint(tint)
      .setDisplaySize(cam.width, cam.height).setAlpha(Math.min(0.49, a));
    run.tweens.add({ targets: f, alpha: 0, duration: dur, onComplete: () => f.destroy() });
  }

  // ============ R40 ワンショットFX（環・光柱） ============
  // 転移の座・魔法陣・裁きの環の「広がる/すぼまる輪」と「立ち上る光柱」。
  // tween ではなく fxList で寿命管理する＝ボス破棄時に確実に消せる（リークを作らない）。
  function spawnRingFx(x, y, tint, r0, r1, sec, a0 = 0.85) {
    const img = run.add.image(x, y, 'w_ring').setBlendMode(ADD).setDepth(12)
      .setTint(tint).setDisplaySize(r0 * 2, r0 * 2).setAlpha(a0);
    fxList.push({ img, t: 0, sec, r0, r1, a0, kind: 'ring' });
  }
  function spawnPillarFx(x, y, tint, w, h, sec, a0 = 0.75) {
    const img = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(12)
      .setTint(tint).setOrigin(0.5, 1).setDisplaySize(w, 8).setAlpha(a0);
    fxList.push({ img, t: 0, sec, w, h, a0, kind: 'pillar' });
  }
  function updateFx(dt) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.t += dt;
      const p = Math.min(1, f.t / f.sec);
      const e = 1 - (1 - p) * (1 - p);          // easeOut＝出だしが速く終わりが静か
      if (f.kind === 'ring') {
        const r = f.r0 + (f.r1 - f.r0) * e;
        f.img.setDisplaySize(r * 2, r * 2).setAlpha(f.a0 * (1 - p));
      } else {
        f.img.setDisplaySize(f.w * (1 - p * 0.5), 8 + (f.h - 8) * e).setAlpha(f.a0 * (1 - p));
      }
      if (p >= 1) { f.img.destroy(); fxList.splice(i, 1); }
    }
  }
  function clearFx() {
    for (const f of fxList) f.img.destroy();
    fxList.length = 0;
    // R44W3 薙いだ跡は「1拍だけ残す」ものなので、戦闘が終わったら必ず消す
    // （撃破が薙ぎの最中に起きると、赤い扇が画面に焼き付いたまま残る）
    if (scorchGfx) { run.tweens.killTweensOf(scorchGfx); scorchGfx.clear().setVisible(false); }
    // R44W5 かげおに：撃破・練習リセットで影と足あとも必ず消す（勝った画面に影が残ると嘘になる）
    destroyShadows();
    shadowHist.length = 0;
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
  // ★R36W2 opts を追加。実プレイFB「光線の色は紫」「整列レーザーは深みのある赤に」へ応えるため、
  //   ビームの色を攻撃ごとに変えられるようにした（従来は全ビームが cfg.glowInner の1色固定）。
  //     opts.tint  … ビーム本体（縁）の色
  //     opts.core  … 白熱の芯の色。指定すると幅38%の第2層を重ねる。「深みのある赤」は
  //                  暗い縁＋白熱の芯の**2層**でしか出ない（1色のベタは薄っぺらいまま）
  //     opts.spark … 照射中に線に沿って散る火花の色（1フレーム最大2個の予算制＝R35の教訓）
  //     opts.heavy … 主人公が受けたときの手応えを重くする（専用SFX＋ビーム方向へ吹き飛ばす）
  function startBeam(angFrom, angTo, len, width, dmg, activeSec, opts = {}) {
    if (!beamImg) {
      beamImg = run.add.image(0, 0, 'boss_beam').setOrigin(0, 0.5).setBlendMode(ADD).setDepth(10);
    }
    if (!beamCore) {
      beamCore = run.add.image(0, 0, 'boss_beam').setOrigin(0, 0.5).setBlendMode(ADD).setDepth(10);
    }
    // R44W6: sweepSec＝薙ぎ相の長さ。指定が無ければ activeSec 全体で薙ぐ（従来どおり）。
    //   指定があれば sweepSec で薙ぎ切り、残り時間は終端で燃え続ける（焼き付き相）＝
    //   「速く薙ぎ・長く照射」しても総角度は増えない（薙がない側の安全を保つ）。
    beam = { angFrom, angTo, len, width, dmg, life: activeSec, maxLife: activeSec, dmgT: 0,
      sweepSec: opts.sweepSec || activeSec,
      spark: opts.spark || 0, heavy: !!opts.heavy, hasCore: !!opts.core, scorch: !!opts.scorch };
    // ★R44W3 薙いだ跡の焼け扇。**ビームの後ろにだけ**伸びる（先回りして描くと射線の
    //   先読みになり、消したはずの赤い線を扇の形で復活させてしまう）。
    if (opts.scorch) {
      if (!scorchGfx) scorchGfx = run.add.graphics().setDepth(9);
      run.tweens.killTweensOf(scorchGfx);
      scorchGfx.clear().setAlpha(1).setVisible(true);
    }
    beamImg.setVisible(true).setTint(opts.tint != null ? int(opts.tint) : int(cfg.glowInner));
    beamCore.setVisible(!!opts.core);
    if (opts.core) beamCore.setTint(int(opts.core));
  }
  function updateBeam(dt) {
    beam.life -= dt;
    if (beam.life <= 0) {
      if (beamImg) beamImg.setVisible(false);
      if (beamCore) beamCore.setVisible(false);
      // 焼け跡は薙ぎ終わってから消える＝「何が起きたか」を一拍だけ画面に残す
      if (beam.scorch && scorchGfx) {
        run.tweens.add({ targets: scorchGfx, alpha: 0, duration: 620,
          onComplete: () => { if (scorchGfx) scorchGfx.clear().setVisible(false); } });
      }
      beam = null; return;
    }
    const t = Math.min(1, (beam.maxLife - beam.life) / beam.sweepSec);   // R44W6: 薙ぎ相→焼き付き相
    const ang = beam.angFrom + (beam.angTo - beam.angFrom) * t;
    const x = boss ? boss.x : 0, y = boss ? boss.y : 0;
    if (beam.scorch && scorchGfx) {
      // 通り過ぎたぶんだけ扇を伸ばす（angFrom → いまの ang）
      scorchGfx.clear();
      scorchGfx.fillStyle(0x8c0a1c, 0.20);
      scorchGfx.slice(x, y, beam.len, Math.min(beam.angFrom, ang), Math.max(beam.angFrom, ang), false);
      scorchGfx.fillPath();
    }
    beamImg.setPosition(x, y).setRotation(ang).setDisplaySize(beam.len, beam.width)
      .setAlpha(0.65 + 0.25 * Math.sin(run.elapsed * 30));
    if (beam.hasCore) {
      // 芯は縁より少し速く明滅させる（2層の位相がずれると「うねって」見える＝生きた光になる）
      beamCore.setPosition(x, y).setRotation(ang).setDisplaySize(beam.len, beam.width * 0.38)
        .setAlpha(0.75 + 0.25 * Math.sin(run.elapsed * 41));
    }
    // 点(プレイヤー)と線分[本体, 本体+dir*len]の距離
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    // 火花：線に沿って散らす（決定的な位置＋rngの散らし・1フレーム2個まで）
    if (beam.spark) {
      for (let i = 0; i < 2; i++) {
        const st = ((run.elapsed * (5.1 + i * 2.3)) % 1) * beam.len;
        run.spawnParticles(x + dirX * st + run.rng.range(-8, 8),
          y + dirY * st + run.rng.range(-8, 8), beam.spark, 1);
      }
    }
    const rx = run.player.x - x, ry = run.player.y - y;
    let tt = rx * dirX + ry * dirY; tt = Math.max(0, Math.min(beam.len, tt));
    const cx = x + dirX * tt, cy = y + dirY * tt;
    const ddx = run.player.x - cx, ddy = run.player.y - cy;
    const half = beam.width / 2 + run.player.radius;
    beam.dmgT -= dt;
    if (ddx * ddx + ddy * ddy <= half * half && beam.dmgT <= 0) {
      if (beam.heavy) {
        // ★R36W2 実プレイFB「レーザーを受けた主人公が、攻撃を受けてしまった実感がでるように」。
        //   ①専用の被弾音（焼かれる音） ②ビームの進行方向へ吹き飛ばす（hitPlayer の押し返しは
        //     発生源から放射状。線分の最近点はほぼ主人公自身の座標なので向きが出ない＝源を
        //     ビーム後方へ置き直して「光に押し流される」向きにする） ③揺れとヒットストップを上乗せ
        Sound.sfx('beamHit');
        run.shake(340, 10);
        if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.10);
        run.spawnParticles(run.player.x, run.player.y, 0xffe0c0, 10);
        run.hitPlayer(beam.dmg, run.player.x - dirX * 40, run.player.y - dirY * 40);
      } else {
        run.hitPlayer(beam.dmg, cx, cy);
      }
      beam.dmgT = 0.25;
    }
  }

  // ============ ボス弾（プレイヤーへ当たる・kind別に挙動） ============
  function spawnBullet2(x, y, vx, vy, opts) {
    opts = opts || {};
    // R35: kind 未指定の弾は、そのボスの既定形（cfg.bulletKind）に従う。
    //   マオウレクスだけ 'comet'＝専用の彗星弾になり、他のボスは従来どおり 'orb'（boss_bolt）。
    const kind = opts.kind || (cfg && cfg.bulletKind) || 'orb';
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
    const isBomb = kind === 'bomb';
    const isComet = kind === 'comet';                                // R35: マオウレクス専用
    const isGlyph = kind === 'glyph';                                // R40: 聖句の文字弾（軌道神核）
    const isJudge = kind === 'judge';                                // R40: 裁きの輪弾（軌道神核）
    const isOrb = kind !== 'cutter' && kind !== 'missile' && !isTom && !isBomb && !isGlyph && !isJudge;
    const tex = kind === 'cutter' ? 'boss_cutter' : kind === 'missile' ? 'boss_missile'
      : isTom ? 'boss_tomahawk' : isBomb ? 'boss_bomb' : isComet ? 'boss_comet'
      : isGlyph ? 'verse_glyph' : isJudge ? 'judge_orb' : 'boss_bolt';
    const r = opts.radius != null ? opts.radius : 4;
    // FB#5: 一回り大きく（2.6→3.0）。個性色 bulletTint は弾本体に残す。tomahawk は細長く巨大に（雑魚より一目で大きく）。
    // Gate2: ボルトは16×10比率（r=4のとき16×10）＝dispW=r*4.0/dispH=r*2.5。
    // R35: 彗星は30×16比率（r=8のとき30.4×16）。ボルトより横も縦も大きい＝巨体から出る弾の質量。
    // R40: 文字弾/輪弾は正方形＝向きは進行方向ではなく spin（回転しながら飛ぶ）が担う
    const dispW = isTom ? r * 3.0 : isBomb ? r * 3.4 : isComet ? r * 3.8
      : isGlyph ? r * 3.4 : isJudge ? r * 3.6 : isOrb ? r * 4.0 : r * 3.0;
    const dispH = isTom ? r * 7.2 : isBomb ? r * 3.4 : isComet ? r * 2.0
      : isGlyph ? r * 3.4 : isJudge ? r * 3.6 : isOrb ? r * 2.5 : r * 3.0;
    const rot0 = isTom ? (Math.atan2(vy, vx) + Math.PI / 2)          // 胴=+Y前方なので +90°
      : isOrb ? Math.atan2(vy, vx) : 0;                              // ボルト／彗星は+Xが先端＝オフセットなし
    d.spr.setTexture(tex).setVisible(true).setDepth(11).setTint(tint)
      .setDisplaySize(dispW, dispH).setPosition(x, y).setRotation(rot0);
    // FB#2/#5: 敵弾は赤い危険フチ＋進行方向へ短いトレイル（味方の金白フチと即区別）。
    // tomahawk は進行方向へ長く伸びる明るいオレンジの噴射グロウ＝密集した雑魚の中でも大きく目立つ。
    const ta = Math.atan2(vy, vx);
    if (isTom) {
      d.glow.setVisible(true).setDepth(10).setTint(0xffa030)
        .setRotation(ta).setDisplaySize(r * 9.0, r * 4.0).setPosition(x, y);
    } else if (isComet) {
      // R35: 彗星は後ろへ長く伸びる白熱グロウ。尾が長いほど同じ速度でも速く見える
      //   （モーションブラーと同じ原理）。ボルトの 4.6×2.6 に対して 8.4×3.2 と一段大きい。
      d.glow.setVisible(true).setDepth(10).setTint(0xff6a1f).setAlpha(0.9)
        .setRotation(ta).setDisplaySize(r * 8.4, r * 3.2).setPosition(x, y);
    } else if (isGlyph || isJudge) {
      // R40: 神核の弾は光背（丸いハロー）を弾色でまとう＝金と紫の弾幕が「神の火」に見える。
      //   熱の色（赤縁）ではなく光の色＝敵弾識別は大きさと形（回転する文字/輪）が担う。
      d.glow.setVisible(true).setDepth(10).setTint(isGlyph ? 0xffc040 : tint).setAlpha(0.95)
        .setRotation(0).setDisplaySize(r * 5.2, r * 5.2).setPosition(x, y);
    } else {
      d.glow.setVisible(true).setDepth(6).setTint(0xff2f2f).setAlpha(1)
        .setRotation(ta).setDisplaySize(r * 4.6, r * 2.6).setPosition(x, y);
    }
    bullets.push({
      active: true, x, y, vx, vy, kind, r,
      spin: opts.spin || 0, returns: !!opts.returns,
      maxTurn: opts.maxTurn || 0, spd: Math.hypot(vx, vy) || 1, cruise: opts.speed || 0,
      blast: opts.blast || 0, age: 0, trailT: 0,
      decel: opts.decel || 0, noHit: !!opts.noHit,   // R29: 転がって止まる爆弾（触れても爆ぜない＝時間で爆発）
      life: opts.life != null ? opts.life : 3,
      dmg: opts.damage != null ? opts.damage : 10,
      // R44W4: 聖句の文字が堕ちるまでの秒数（0なら堕ちない＝他の弾は無関係）
      fallSec: opts.fallSec || 0, fallen: false, fallT: 0,
      spr: d.spr, glow: d.glow,
    });
  }

  // ★R44W4 聖句の文字が「堕ちる」瞬間。形・色・回転・音を**同じフレームでまとめて**変える。
  //   ばらけて変わると「壊れた」に見えるので、1つの出来事として起こす。
  const VERSE_FALL_A = 0xa24bff;   // 堕ちた直後＝紫（軌道神核の紫と同じ語彙）
  const VERSE_FALL_B = 0xc0102a;   // 落ちきった先＝深紅（整列レーザーの縁と同じ語彙）
  let fallBudget = 2;              // 1フレームに鳴らす/輪を出す上限（1回で最大60発が堕ちるため）
  function corruptGlyph(b) {
    b.fallen = true; b.fallT = 0;
    b.spr.setTexture('verse_glyph_fallen').setTint(VERSE_FALL_A)
      .setDisplaySize(b.r * 3.9, b.r * 3.9);        // 堕ちて一回り膨らむ＝「重くなった」
    // ★実撮影で最初の版を却下した：光背を暗い血の色（0x5a0e28）にしたら弾が**画面から消えた**。
    //   退廃は「暗さ」ではない。このゲームの退廃の語彙は**紫と深紅の飽和**（軌道神核の紫・
    //   整列レーザーの縁 #d01228）で、暗さは一度も使っていない。文字（暗い深紅）の後ろに
    //   深紅の光背を置く＝**黒い文字が縁で燃えている**＝退廃も可読性も両立する。
    b.glow.setTint(0xd01228).setAlpha(0.95);
    run.spawnParticles(b.x, b.y, 0x2a0a18, 2);      // 灰＝燃え尽きた神の光（一瞬だけ暗くてよい）
    if (fallBudget > 0) {
      fallBudget--;
      spawnRingFx(b.x, b.y, 0xff2a5a, 3, 17, 0.26, 0.8);   // 堕ちた瞬間がいちばん目立つ
      Sound.sfx('verseFall', 0.5);
    }
  }
  // 2色の間を混ぜる（堕ちた紫が深紅へ落ちていく途中の色）
  function mixRgb(a, c, t) {
    const r = ((a >> 16) & 255) + (((c >> 16) & 255) - ((a >> 16) & 255)) * t;
    const g = ((a >> 8) & 255) + (((c >> 8) & 255) - ((a >> 8) & 255)) * t;
    const b = (a & 255) + ((c & 255) - (a & 255)) * t;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }

  function recycleBullet(b) {
    b.spr.setVisible(false);
    b.glow.setVisible(false);
    pool.push({ spr: b.spr, glow: b.glow });
  }

  function updateBullets(dt) {
    const px = run.player.x, py = run.player.y;
    // R31: 飛来音／爆発音のタイマーを進める（実プレイFB「ミサイルの飛来する音」「爆発音もつけて」）。
    if (missileFlyT > 0) missileFlyT -= dt;
    if (missileBoomT > 0) missileBoomT -= dt;
    if (tomahawkFlyT > 0) tomahawkFlyT -= dt;
    let nearestMissile = -1;      // 主人公にいちばん近いミサイルまでの距離（飛来音の音程に使う）
    let nearestTomahawk = -1;     // R34W2: 同上（トマホーク＝ナックルウェーブの弾）
    // R35: 彗星弾の火の粉は**1フレーム合計3個まで**。ノヴァは1回で70発飛ぶので、
    //   1発ずつ尾を出すと毎秒数千個のスプライトになって確実に処理落ちする。
    //   予算制にすると「近くの弾から順に少しだけ散る」＝見た目は保ったまま上限が固定される。
    let trailBudget = 3;
    fallBudget = 2;               // R44W4: 堕ちの輪と音は1フレーム2発まで（1回で最大60発が堕ちる）
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
        const md = Math.hypot(b.x - px, b.y - py);
        if (nearestMissile < 0 || md < nearestMissile) nearestMissile = md;
        b.trailT -= dt;
        if (b.trailT <= 0) { b.trailT = 0.09; run.spawnParticles(b.x, b.y, int(cfg.bulletTint), 2); }
      } else if (b.kind === 'tomahawk') {
        // 直進（回転は発射時に進行方向へ固定済み）。明るい噴射炎の尾を長く曳いて雑魚より目立たせる。
        const td = Math.hypot(b.x - px, b.y - py);
        if (nearestTomahawk < 0 || td < nearestTomahawk) nearestTomahawk = td;
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.035;
          run.spawnParticles(b.x - b.vx * 0.02, b.y - b.vy * 0.02, 0xffb020, 3);
          run.spawnParticles(b.x - b.vx * 0.045, b.y - b.vy * 0.045, 0xffe24a, 2);
        }
      } else if (b.kind === 'comet') {
        // R35: 直進（回転は発射時に進行方向へ固定済み）。芯を脈打たせて「生きている火の玉」にする。
        //   ⚠️ 脈動はグロウの alpha だけで作る＝オブジェクトを1つも増やさない。
        //      弾が70発同時に飛ぶ攻撃があるので、1発ごとの追加描画は許容できない。
        b.age += dt;
        b.glow.setAlpha(0.62 + Math.sin(b.age * 22) * 0.30);
        b.trailT -= dt;
        if (b.trailT <= 0 && trailBudget > 0) {
          b.trailT = 0.10; trailBudget--;
          run.spawnParticles(b.x - b.vx * 0.03, b.y - b.vy * 0.03, 0xff8a2a, 1);
        }
      } else if (b.kind === 'bomb') {
        // 転がりながら減速して止まる。回転させて「転がっている」ことを見せる（導火線口が回る）。
        const k = Math.max(0, 1 - b.decel * dt);
        b.vx *= k; b.vy *= k;
        b.spr.rotation += dt * 9;
        b.trailT -= dt;
        if (b.trailT <= 0) { b.trailT = 0.08; run.spawnParticles(b.x, b.y, 0xffe24a, 1); }
      } else if (b.kind === 'glyph' || b.kind === 'judge') {
        // ★R44W4 で見つけた実装漏れ：R40 は「回転しながら飛ぶ」と書いて spin:3.2 まで渡して
        //   いたのに、spin を読んでいるのは cutter の分岐だけだった＝**文字弾も輪弾も一度も
        //   回っていなかった**（rot0 も 0 固定）。ここで結線する。
        b.age += dt;
        b.spr.rotation += dt * b.spin * (b.fallen ? 2.6 : 1);   // 堕ちると回転が跳ねる＝読めなくなる
        if (b.fallSec > 0 && !b.fallen && b.age >= b.fallSec) corruptGlyph(b);
        if (b.fallen) {
          b.fallT += dt;
          const k = Math.min(1, b.fallT / 0.5);                 // 紫→深紅は0.5秒かけて落ちる
          b.spr.setTint(mixRgb(VERSE_FALL_A, VERSE_FALL_B, k));
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
          const near = dx * dx + dy * dy <= rr * rr;
          if (near) run.hitPlayer(b.blast, b.x, b.y);
          missileBoom(b.x, b.y, near);   // R31: 寿命切れの自爆も爆発として見せる
        } else if (b.kind === 'bomb' && cfg && cfg.rollbomb) {
          // 導火線が尽きた＝止まった場所に予告円を出し、warnSec 後に爆発（逃げる猶予を必ず作る）
          const rb = cfg.rollbomb;
          spawnStrike(b.x, b.y, rb.warnSec, rb.blastRadius, rb.damage);
          Sound.sfx('tick', 0, 1.4);
        }
      } else if (b.noHit) {
        // 転がる爆弾は触れても爆ぜない（時間で爆発する）＝踏んでも即死しない安心を残す
      } else {
        // R35: 彗星弾は見た目が30×16と大きいが、当たり判定は**白熱の芯**に合わせて5pxに留める。
        //   外形（炎）の大きさで当てると「かすってもいないのに当たった」になる＝絵と判定は別物。
        const rr = run.player.radius + (b.kind === 'comet' ? 5 : b.kind === 'orb' ? 4 : 6);
        const dx = b.x - px, dy = b.y - py;
        if (dx * dx + dy * dy <= rr * rr) {
          run.hitPlayer(b.dmg, b.x, b.y); b.active = false;
          // R31: 直撃こそがユーザーの言う「主人公に当たった先の爆発」。ここが `hit` の軽い音だった。
          if (b.kind === 'missile') missileBoom(b.x, b.y, true);
          // R34W2: トマホークは直撃しても無音だった（爆発も起きていない）
          else if (b.kind === 'tomahawk') missileBoom(b.x, b.y, true, 'tomahawkBoom');
        }
      }
      if (!b.active) recycleBullet(b);
    }
    // R31: 飛んでいるあいだ「飛来する音」を鳴らし続ける（実プレイFB）。
    // 近いほど音程を上げる＝ドップラー。480px/秒まで上げたので、発射時の1回きりでは
    // 音が鳴り終わる前に着弾してしまい「迫ってくる」怖さが出ない。
    if (nearestMissile >= 0 && missileFlyT <= 0) {
      const near = clamp01(1 - nearestMissile / 520);        // 0(遠い)→1(目の前)
      Sound.sfx('samFly', 0.5 + near * 0.55, 0.86 + near * 0.42);
      missileFlyT = 0.30 - near * 0.10;                      // 近いほど間隔も詰める
    }
    // R34W2: トマホークは飛んでいるあいだ**完全に無音**だった（実プレイFB）。
    //   亜音速の巡航ミサイルなので、SAM の風切りではなく低いジェットのうなりを鳴らす。
    if (nearestTomahawk >= 0 && tomahawkFlyT <= 0) {
      const near = clamp01(1 - nearestTomahawk / 520);
      Sound.sfx('tomahawkFly', 0.45 + near * 0.5, 0.84 + near * 0.36);
      tomahawkFlyT = 0.34 - near * 0.12;
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (!bullets[i].active) bullets.splice(i, 1);
    }
  }

  function clearBullets() {
    for (const b of bullets) { if (b.active) { b.active = false; recycleBullet(b); } }
    bullets.length = 0;
    clearStrikes();   // 撃破の瞬間に予告中だった着弾も消す（勝利演出の最中に爆発させない）
    if (beam) { beam = null; if (beamImg) beamImg.setVisible(false); if (beamCore) beamCore.setVisible(false); }
  }

  // ============ 表示（本体そのものが動く） ============
  // ★R30 脚パーツの持ち主。null＝上半身にくっついたまま（＝従来どおり）。
  //   splitCine 中は本体→切り離し先へ補間、分離中は lower に完全追従、
  //   mergeCine 中は lower→本体へ吸い寄せる（＝合体していく様子が見える）。
  function legTransform() {
    const sp = cfg && cfg.split;
    if (!sp) return null;
    if (state === 'splitCine') {
      if (!lower) return null;
      const t = clamp01((sp.cineSec - stateT - 0.45) / Math.max(0.01, sp.cineSec - 0.45));
      const e = t * t * (3 - 2 * t);
      return { x: lerp(boss.x, lower.x, e), y: lerp(boss.y, lower.y, e),
               scale: lerp(1, sp.lowerScaleMul, e), spread: lerp(1, 1.15, e) };
    }
    if (state === 'mergeCine' && lower) {
      // 座標は updateAI 側で本体へ吸い寄せている。ここは大きさと開きだけを戻す。
      const t = clamp01((cfg.merge.cineSec - stateT) / (cfg.merge.cineSec * cfg.merge.contactAt));
      const e = t * t * (3 - 2 * t);
      return { x: lower.x, y: lower.y, scale: lerp(sp.lowerScaleMul, 1, e), spread: lerp(1.15, 1, e) };
    }
    if (split && lower && lower.active) {
      return { x: lower.x, y: lower.y, scale: sp.lowerScaleMul, spread: 1.15 };
    }
    return null;
  }

  // 角度の短経路補間（±πを跨ぐときに逆回りしないように）
  function angLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  }
  // 環に焼き込まれている傾き（スプライト側の rot）。整列で「真横」を作るとき、この分を引く。
  const TRUE_RING_BAKED = [24 * D2R, -24 * D2R, 0];

  // ★★ 真マオウレクス「軌道神核」の描画。腕・脚・砲身という既存の概念が1つも無いので経路を分ける。
  //    動かすのは4つだけ：①3つの環の公転 ②眼の視線追従と瞬き ③光背の脈動 ④攻撃ごとの形の変化。
  //    ④が主役＝**予告を文字ではなく形で読ませる**（環が揃えばレーザー、環が閉じれば無敵）。
  function updateTrueDisp(dt) {
    const tf = cfg.trueForm;
    const s = disp.spriteScale;
    const cx = boss.x, cy = boss.y;
    const bob = Math.sin(run.elapsed * 1.6) * 2.2;

    // 出現：下から浮かび上がりながら実体化する（riseSec ぶん）
    // ★R43 実プレイFB「軌道神核ももう少しゆっくり登場して。そのほうが重々しさがでる」。
    //   尺を伸ばすだけでは「遅いだけ」になる。重い物の登場は3つの性質を持つ：
    //     ①**姿が先に見え、動きは後から追いつく**（暗闇に輪郭が浮かんでから持ち上がる）
    //       → alpha は t^0.62 で早く、位置は smoothstep で遅く＝2本の曲線を分ける
    //     ②**深いところから**上がる（52→86px）＝持ち上がる距離が長いほど質量に見える
    //     ③**慣性**：環は止まっている状態から徐々に回り出す（riseSpin）。いきなり全速で
    //       回っている物は軽い。下の公転計算がこの係数を掛ける。
    let rise = 1, riseDrop = 0, riseSpin = 1;
    if (state === 'awakenCine') {
      const t = clamp01(((tf.crackSec + tf.riseSec) - stateT - tf.crackSec) / tf.riseSec);
      const e = t * t * (3 - 2 * t);
      rise = Math.pow(t, 0.62);                      // ①姿は早く現れ
      riseDrop = (1 - e) * 86;                       // ②位置は遅れて重く上がる
      riseSpin = e * e;                              // ③回転は最後に追いつく（慣性）
    }

    // ①公転。3つの環を別々の速さ・別々の向きで回す＝「軌道」に見せる。
    //   環は静止画なので、回転そのものではなく**見込み角（縦の潰れ）**を周期で変える。
    //   これが土星の環がゆっくり傾いて見える現象と同じで、回っていることが等倍でも読める。
    const spinSpd = [0.90, -0.72, 1.25];
    // R37 激化：環の公転が段で速くなる（×1.0→×1.95）＝激化がひと目で分かる「形」の変化
    const sm = rageArr('spinMul', 1);
    // R43 出現中は riseSpin（0→1）を掛ける＝静止した環が慣性で回り出す
    for (let i = 0; i < 3; i++) ringSpin[i] += spinSpd[i] * sm * riseSpin * dt;

    // ④攻撃ごとの形。alignT=1 で3環が射線方向へ一直線、shellT=1 で環が核へ閉じきる。
    let alignT = 0, shellT = 0;
    if (state === 'alignTele') alignT = clamp01(1 - stateT / tfAlignSec());
    else if (state === 'alignFire' || state === 'alignFire2') alignT = 1;
    // R40 二射目の再照準：整列は保ったまま新しい射線へ向き直る（避けた先を環が追う）
    else if (state === 'align2Tele') alignT = 1;
    else if (state === 'shellTele') shellT = clamp01(1 - stateT / tf.shell.teleSec) * 0.20;
    else if (state === 'shellClose') shellT = 0.20 + clamp01(1 - stateT / tf.shell.closeSec) * 0.80;
    else if (state === 'shellHold') shellT = 1;
    else if (state === 'shellOpen') shellT = clamp01(stateT / tf.shell.openSec);
    const alignE = alignT * alignT * (3 - 2 * alignT);
    const shellE = shellT * shellT * (3 - 2 * shellT);
    const ringShrink = 1 - shellE * 0.70;

    // ②瞬き。3.4秒に1回、0.11秒だけ瞼が落ちる（生き物であることの合図）
    const blink = (run.elapsed % 3.4) < 0.11 ? 0.12 : 1;

    for (const p of disp.parts) {
      let px = cx + p.ox * s, py = cy + p.oy * s + bob + riseDrop;
      let rot = 0, sx = s, sy = s, alpha = rise * tfWarpAlpha;   // R40 転移中は光へ折りたたまれる
      // R43 眼は最後に開く：体が浮かび上がりきってから瞼が上がる＝「見られた」の一拍を作る
      if (p.tex === 'eye' && rise < 1) alpha = clamp01((rise - 0.58) / 0.42) * tfWarpAlpha;

      if (p.ring >= 0) {
        const i = p.ring;
        const seen = 0.84 + 0.16 * (0.5 + 0.5 * Math.cos(ringSpin[i]));   // 見込み角
        rot = Math.sin(ringSpin[i] * 0.5) * 0.06;
        sy = s * seen;
        if (alignE > 0) {
          // 整列：長軸を射線へ向け、縦を潰して「真横から見た環」＝一直線にする
          // R44W3 alignWind＝振りかぶり。環の面が薙ぐ向きと逆へ溜まる＝**どちらへ薙ぐかが
          // 形で読める**（赤い射線の代わりに、ボスの体そのものが答えを持つ）
          rot = angLerp(rot, (alignAng + alignWind) - TRUE_RING_BAKED[i], alignE);
          sy = lerp(sy, s * 0.20, alignE);
        }
        sx = s * ringShrink; sy *= ringShrink;
        // 奥半分は殻閉じで先に隠れる（前後関係が閉じる順で伝わる）
        if (p.back) alpha *= 1 - shellE * 0.85;
      } else if (p.role === 'body') {
        // 球：殻を閉じるあいだ、装甲片を受け止めて少し膨らむ
        const g = 1 + shellE * 0.13;
        sx = s * g; sy = s * g;
        rot = Math.sin(run.elapsed * 0.8) * 0.02;
      } else if (p.role === 'core') {
        // ②視線追従。閉じているあいだは眼そのものが装甲の内側へ沈む
        const look = 11 * (1 - shellE);
        px += Math.cos(aim) * look; py += Math.sin(aim) * look * 0.62;
        sy = s * blink * (1 - shellE);
        sx = s * (1 - shellE * 0.5);
        alpha *= 1 - shellE;
      } else if (p.role === 'thruster') {
        // ③光背の脈動。予告中は大きく張り出す＝「何か来る」が背面のシルエットで分かる
        const tel = isTelegraph(state) ? 0.10 : 0;
        const g = 1 + Math.sin(run.elapsed * 3) * 0.03 + tel;
        sx = s * g; sy = s * g;
      }

      p.img.setPosition(px, py).setRotation(rot)
        .setScale((p.mirror ? -1 : 1) * sx, sy).setAlpha(alpha);
    }

    const pulse = 1 + Math.sin(run.elapsed * 4) * 0.12;
    disp.glowP.setPosition(cx, cy).setScale(tf.glowScale * 1.6 * pulse * (1 - shellE * 0.3))
      .setAlpha(rise * tfWarpAlpha);
    disp.glowM.setPosition(cx, cy).setScale(tf.glowScale * 0.9 * pulse * (1 + shellE * 0.4))
      .setAlpha(rise * tfWarpAlpha);
    disp.muzzle.setVisible(false);

    // 記号は既存と同じ順番で読ませる（被弾フラッシュ＞割られた隙＞予告点滅）
    boss.flashT -= dt;
    let tint = null;
    if (boss.flashT > 0) tint = 0xffffff;
    else if (bossStagT > 0) tint = BALANCE.stagger.tint;
    else if (isTelegraph(state)) tint = (Math.floor(run.elapsed * 16) % 2 === 0) ? 0xffffff : null;
    else if (state === 'shellHold') tint = 0xc8c8e6;   // 閉じているあいだは冷えた鋼＝通らないことの合図
    for (const p of disp.parts) { if (tint == null) p.img.clearTint(); else p.img.setTint(tint); }
  }

  function updateDisp(dt) {
    if (trueForm) { updateTrueDisp(dt); return; }
    // 粉砕中は位置を tween に任せる（毎フレーム setPosition で上書きすると破片が飛ばない）
    if (awakening && cineStage >= 1) return;
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
    } else if (state === 'chestTele' && cfg.chestLaser) {
      // 両腕を大きく開いて胸を晒す＝「胸から来る」を姿勢で予告する
      const prog = clamp01(1 - stateT / cfg.chestLaser.chargeSec);
      armPose = lerp(0, -1.9, prog);
      bodySink = -prog * 3;
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

    // ★R30 分離中は脚パーツだけを下半身(lower)の座標へ付け替える。新しい絵は作らない。
    //   分離のカットシーン中は「切り離されて離れていく」途中経過を補間で見せる。
    const legOwner = legTransform();

    for (const p of disp.parts) {
      const isLeg = legOwner && (p.role === 'legL' || p.role === 'legR');
      // ⚠️ 位置は必ず素の s で置く。拡大した ls で ox を掛けると、脚2本の間隔が
      //    scale×spread ぶん二重に開いて画面幅(640px)を超える（392px離れた）。
      const ls = isLeg ? s * legOwner.scale : s;
      let px = (isLeg ? legOwner.x : cx) + p.ox * s * (isLeg ? legOwner.spread : 1) + (isLeg ? 0 : rcx);
      let py = (isLeg ? legOwner.y : cy) + p.oy * s * (isLeg ? 0.15 : 1) + bob + (isLeg ? 0 : rcy);
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
      } else if (isLeg) {
        p.img.setScale((p.mirror ? -1 : 1) * ls, ls);
      } else if (p.img.scaleY !== s) {
        p.img.setScale((p.mirror ? -1 : 1) * s, s);   // 合体で元の大きさへ戻す
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
    else if (isTelegraph(state)) {
      // R34→R36W2: かつては消灯側も紫 tint で塗っていた（素に戻すと赤へ剥がれたため）。
      //   いまは**テクスチャそのものが紫**なので、素（null）に戻しても紫のまま＝白の点滅だけで足りる。
      tint = (Math.floor(run.elapsed * 16) % 2 === 0) ? 0xffffff : null;
    }
    // ★R30 再合体後はメタリックパープル（ユーザー指示）。予告の点滅より下・被弾フラッシュより下に
    //   置くので、「今は何をしているか」の記号は今までどおり読める。
    // ★R34 単色で塗るだけだと「紫にした」ではなく「暗くなった」に見える。ハイライトが表面を
    //   舐めるようにゆっくり明滅させて金属光沢にする（＝メタリックの定石）。
    else if (phase3 && cfg.merge) tint = metalPurple();
    else if (phase2) tint = 0xff6a6a;
    // 合体の瞬間だけ真っ白に飛ばす＝そのあと紫が現れる（色が変わったことが必ず目に入る）
    if (state === 'mergeCine' && cineStage >= 2) {
      const since = (cfg.merge.cineSec - stateT) - cfg.merge.cineSec * cfg.merge.contactAt;
      if (since < 0.30) tint = 0xffffff;
    }
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
    // ★R37 じゃがんレーザーの構造的な保証。分離カットシーン中に放たれた玉が明けた瞬間に
    //   連続着弾し、溜め1.0秒を追い越してHP0→転生する回が実測で残った（即時発射＋合体待ちを
    //   入れてもなお）。分離の1手目を撃ちきるまでは**HP1で耐える**＝腕前に関係なく
    //   「分かれたら撃ってくる」が必ず1回見える。耐えるのは最長でも溜め1.0秒＋照射0.7秒。
    //   ⚠️ 「発射まで」の保証では足りなかった：発射と同じフレームでHP0/33%を割ると、
    //   照射が40ms未満で転生/合体に断ち切られて実質見えない（実測run8）。**照射中も**耐える。
    if (split && (!splitLaserDone || state === 'laserFire')
        && cfg && (cfg.attacksSplit || []).includes('laser')) {
      boss.hp = 1; return;
    }
    // ★★ 真マオウレクス：メタリックパープルのHPが0になっても、そこは終わりではなく**転生**。
    //    撃破処理より前に横取りして、亀裂→粉砕→出現のカットシーンへ渡す。
    if (cfg && cfg.final && cfg.trueForm && !trueForm && !awakening) { startAwaken(); return; }
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
    allDone = !run.practiceMode;
    const nm = (boss && boss.def && boss.def.name) || def.name;
    run.floatText(x, y - 46, nm + ' を たおした！', '#ff6ec7');
    const finish = () => {
      run.cinematic = false;
      destroyDisp();
      const keep = ti;
      endFight();
      // ★れんしゅうじょうはクリアで終わらせない。何度でも出し直せるよう tier を戻す。
      if (run.practiceMode) { ti = keep; allDone = false; return; }
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
    removeLower();       // R30: 分離中に撃破/破棄されても下半身を必ず消す
    clearIntroEls();     // 登場イベント途中で撃破/破棄されても text を確実に片付ける
    destroyIntroDim();   // 同上：暗幕を確実に破棄（depth 戻し漏れ/リーク防止）
    destroyWire();       // ワイヤーアームの拳/ケーブルを確実に破棄（リーク防止）
    destroyWeak();       // 弱点コアの表示を確実に破棄（リーク防止）
    if (trueCrack) { trueCrack.destroy(); trueCrack = null; }   // 転生カットシーンの亀裂
    clearShards();                                              // R43 粉砕の小片
    if (lockGfx) { lockGfx.destroy(); lockGfx = null; }         // R43 射線プレビュー
    if (scorchGfx) { run.tweens.killTweensOf(scorchGfx); scorchGfx.destroy(); scorchGfx = null; }  // R44W3 焼け跡
    lockAng = null; alignWind = 0;
    if (!disp) return;
    for (const p of disp.parts) { if (p.img) p.img.destroy(); }
    if (disp.glowP) disp.glowP.destroy();
    if (disp.glowM) disp.glowM.destroy();
    if (disp.muzzle) disp.muzzle.destroy();
    if (beamImg) { beamImg.destroy(); beamImg = null; }
    if (beamCore) { beamCore.destroy(); beamCore = null; }
    disp = null;
  }

  function endFight() {
    releaseCamera();
    removeLower();
    boss = null;
    cfg = null;
    def = null;
    state = 'idle';
    phase2 = false;
    split = false; phase3 = false; merging = false; mergeFrom = null;
    trueForm = false; awakening = false; shellDmg = 0; tfTier = 0;
    killing = false;
    ti++;
  }

  // ★R30 下半身の後始末。撃破・破棄・合体の全経路から必ず通す。
  //   run.enemies から外すのは active=false で足りる（isBoss はプールへ戻らない）。
  function removeLower() {
    if (lower) { lower.active = false; lower = null; }
    if (lowerGlow) { lowerGlow.destroy(); lowerGlow = null; }
  }

  // ============ R30W2 れんしゅうじょう専用の出入口 ============
  // ⚠️ ここで戦闘を作り直さない。本編の spawnFight / endFight をそのまま呼ぶだけにする
  //    （練習では起きるのに本編では起きない、を作らないため）。
  function practiceSpawn(bossId) {
    practiceClear();
    const t = tiers.find((x) => x.bossId === bossId);
    if (!t) return false;
    ti = tiers.indexOf(t);       // 撃破後に endFight が正しい tier から戻せるよう合わせる
    warnedArr[ti] = true; spawnedArr[ti] = true;
    killing = false;
    spawnFight(t);
    return true;
  }
  // ★R37 れんしゅうじょう用：軌道神核（第4形態）へ即ジャンプ。HPを0に落とすのではなく
  //   本編と同じ startAwaken を呼ぶ＝転生カットシーン込みで「本編で見えるものだけ」を見せる。
  //   分離/合体の途中からでもよい（startAwaken 側が旧体の片付けを持っている）。
  function practiceAwaken() {
    if (!boss || !cfg || !cfg.trueForm || trueForm || awakening) return false;
    splitLaserDone = true;   // 名指しのジャンプはレーザー保証より優先（練習用の割り込み）
    startAwaken();
    return true;
  }
  // 出し直し・コース切替のための片付け。ごほうびも撃破演出も出さずに消す。
  function practiceClear() {
    if (!boss) return;
    const keep = ti;
    killing = true;              // 片付けの途中で撃破シネマが走らないようにする
    boss.active = false;
    clearBullets();
    clearStrikes();
    destroyWire();
    clearIntroEls();
    destroyIntroDim();
    destroyDisp();
    endFight();
    ti = keep;
    allDone = false;
  }

  // ============ 毎フレーム ============
  function update(dt) {
    // ★れんしゅうじょうでは時間で自動的にボスを出さない（practiceSpawn で名指しで出す）。
    if (!run.practiceMode && !allDone && !boss && ti < tiers.length) {
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
      drawWeak();          // R29 弱点コア（持たないボスでは何もしない）
      // ★★ 実バグだった：転生（awakenCine）に入ると boss.hp を 1 に落とすので、同じフレームで
      //    「HP50%で分離」「33%で再合体」の判定が**両方とも**成立し、startSplit() が
      //    state='awakenCine' を上書きして**転生カットシーンが丸ごと消えていた**（実測：
      //    awakening=true のまま state=chase・partCount=9・trueForm=false）。
      //    実プレイでも、HP33%超から一撃で0にすれば同じことが起きる（R34 の実測でコアへの
      //    渾身の一投は最大HPの23%＝十分あり得る）。転生中と真の姿では段の判定を止める。
      //    真の姿は maxHp そのものが別物なので、cfg.hp 基準の比較はどのみち意味を持たない。
      if (!awakening && !trueForm) {
        if (cfg.phase2 && !phase2 && boss.hp <= cfg.hp * cfg.phase2HpRatio) enterPhase2();
        // ★R30 三分の一で再合体。分離中にしか起きない（＝節目は必ず1回ずつ通る）。
        // ★R37 じゃがんレーザーの保証。HPを削って分離帯（50%→33%＝幅約11000）がコアへの
        //   渾身の一投1発（約13000）で貫通するようになり、**レーザーを撃つ前に再合体して
        //   0回に終わる回が実測で出た**（R36W2 でユーザーが名指しした見せ場が消える）。
        //   分離中の1手目はレーザー固定なので、撃ちきるまで数秒だけ合体を待つ＝見た目は自然。
        //   HP0での転生（onBossKilled→startAwaken）はこの条件に縛られず従来どおり先に走る。
        //   照射中（laserFire）の合体も同罪＝startMerge がビームを消して40ms未満で終わる。
        if (split && !phase3 && !merging && cfg.merge && boss.hp <= cfg.hp * cfg.merge.hpRatio
            && state !== 'laserTele' && state !== 'laserFire'
            && (splitLaserDone || !(cfg.attacksSplit || []).includes('laser'))) startMerge();
      }
      // ★真の姿：殻閉じを「閉じきる前に割る」ための被ダメージ量。HPの差分で取る＝
      //   どの武器・どの経路から入ったダメージでも同じように数えられる（数え漏れを作らない）。
      if (trueForm) {
        if (state === 'shellClose' && boss.hp < lastHp) shellDmg += lastHp - boss.hp;
        lastHp = boss.hp;
      }
      if (camHeld && state !== 'splitCine' && state !== 'mergeCine' && state !== 'awakenCine') releaseCamera();
      if (split && state !== 'mergeCine') updateLower(dt);
      if (lowerGlow && lower && lower.active && state !== 'mergeCine') {
        lowerGlow.setPosition(lower.x, lower.y)
          .setScale(cfg.glowScale * 0.9 * (1 + Math.sin(run.elapsed * 4) * 0.12));
      }
      // 突進中/フライパス通過中は体当たりのダメージが上がる（速い＝重い、が体で分かる）
      const dmg = (state === 'dash') ? cfg.dash.damage
        : (state === 'flypass') ? cfg.flypass.bodyDamage
        : trueForm ? boss.damage : cfg.bodyDamage;
      const dx = run.player.x - boss.x, dy = run.player.y - boss.y;
      const rr = run.player.radius + boss.radius;
      // カットシーン中は体当たりで削らない。見せている最中に理不尽に減るのが一番しらける
      const cine = state === 'splitCine' || state === 'mergeCine' || state === 'awakenCine';
      if (!cine && dx * dx + dy * dy <= rr * rr) run.hitPlayer(dmg, boss.x, boss.y);
      // R44W5 かげおに：真の姿のあいだは主人公の足あとを常に記録する（影の材料）。
      //   カットシーン中も記録は止めない＝影の再生に穴を作らない。
      if (trueForm) recordShadowHist();
    }

    updateShadows(dt);        // R44W5: 影は殻が開いても lifeSec まで残る＝boss の state に縛らない
    updateBullets(dt);
    updateStrikes(dt);      // R29: ボスが消えた後も残った着弾は最後まで爆発させる（bullets と同じ扱い）
    if (beam) updateBeam(dt);
    updateFx(dt);           // R40: 環・光柱のワンショットFX（ボス撃破後も残りは最後まで消える）
  }

  function destroy() {
    releaseCamera();
    clearBullets();
    clearStrikes();
    clearFx();              // R40: 環・光柱FXも確実に破棄（リーク防止）
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
    // R29: 弱点コア。Run.dealDamage が weakGate で通す/弾くを決め、演出をここへ戻す。
    weakGate, weakPoint, deflect, coreHitFx,
    get hasWeak() { return !!(boss && boss.active && cfg && cfg.weak); },
    get telegraphing() { return isTelegraph(state); },
    get staggered() { return bossStagT > 0; },
    // 検証用の読み取り専用アクセサ（CDPが攻撃発火/パーツ生存を観測する）
    get state() { return state; },
    get bulletCount() { return bullets.length; },
    get strikeCount() { return strikes.length; },
    // R29 検証用：弾の実速度／ロケットパンチの到達長を外から測る（本体は書き換えない）
    debugBullets() { return bullets.map((b) => ({ kind: b.kind, x: b.x, y: b.y, vx: b.vx, vy: b.vy })); },
    debugWire() {
      // R42: ニアミス（最接近距離・発火済みか）も観測できるようにする（読み取り専用）
      return wire ? { maxLen: Math.max(...wire.arms.map((a) => a.len)),
        arms: wire.arms.map((a) => ({ fx: a.fx, fy: a.fy, hit: !!a.hit,
          minD: a.minD == null ? null : Math.round(a.minD), whooshed: !!a.whooshed })) } : null;
    },
    get beamActive() { return !!beam; },
    // R43 検証用：いま張られているビームの向きと太さ（射線から主人公が何px離れているかを外から測る）
    debugBeam() {
      if (!beam) return null;
      const t = Math.min(1, (beam.maxLife - beam.life) / beam.sweepSec);
      return { ang: beam.angFrom + (beam.angTo - beam.angFrom) * t,
        from: beam.angFrom, to: beam.angTo, width: beam.width, len: beam.len,
        sweepDone: t >= 1 };
    },
    get locked() { return lockAng != null; },
    // R44W3 検証用：整列レーザーの射線・振りかぶり・薙ぐ向き（読み筋が本当に出ているかを外から測る）
    debugAlign() {
      return { locked: lockAng != null, ang: alignAng, wind: alignWind, dir: lockDir,
        lineDrawn: !!(lockGfx && lockGfx.commandBuffer && lockGfx.commandBuffer.length) };
    },
    // R44W5 検証用：かげおに（画面に出ている影そのもの）。gap＝再生時計と現在の差＝
    //   minGapSec の床が効いているか（0.35未満なら「走っても捕まる」理不尽になっている）。
    debugShadows() {
      return shadows.map((s) => ({ x: Math.round(s.img.x), y: Math.round(s.img.y),
        rising: s.rising, gap: +(run.elapsed - s.pt).toFixed(3), life: +s.life.toFixed(2),
        tex: s.img.texture && s.img.texture.key, flipY: s.img.flipY,
        rank: s.rank, lane: s.lane, laneIdx: s.laneIdx, biter: !!s.biter, ghosts: s.ghosts.length,
        alpha: +s.img.alpha.toFixed(2), tint: s.img.tintTopLeft }));
    },
    get shadowHistLen() { return shadowHist.length; },
    get shadowStats() { return { ...shadowStats }; },
    // R44W4 検証用：飛んでいる聖句の文字弾（速さ・堕ちたか・回っているか）。
    //   ★「堕ちた」は設定値ではなく**画面に出ているテクスチャの名前**で数える
    //     ＝[[feedback_measure_vfx_by_diff]]（値だけ変わって絵が変わらない、を通さない）。
    debugGlyphs() {
      const out = [];
      for (const b of bullets) {
        if (!b.active || b.kind !== 'glyph') continue;
        out.push({ spd: Math.round(Math.hypot(b.vx, b.vy)), age: +b.age.toFixed(2),
          fallen: !!b.fallen, tex: b.spr.texture && b.spr.texture.key,
          rot: +b.spr.rotation.toFixed(3), tint: b.spr.tintTopLeft });
      }
      return out;
    },
    get partCount() { return disp ? disp.parts.length : 0; },
    // R30W2 れんしゅうじょう（Run が practiceMode のときだけ使う）
    practiceSpawn, practiceClear, practiceAwaken,
    // R30 検証用：分離／再合体の観測（本体は書き換えない）
    get split() { return split; },
    get phase3() { return phase3; },
    // ★真の姿（第4形態）の観測。転生が起きたか／今どちらの姿かを外から測れるようにする
    get trueForm() { return trueForm; },
    get awakening() { return awakening; },
    get lowerPos() { return lower && lower.active ? { x: lower.x, y: lower.y, r: lower.radius } : null; },
    get bossTint() { return disp && disp.parts[0] ? disp.parts[0].img.tintTopLeft : null; },
  };
}
