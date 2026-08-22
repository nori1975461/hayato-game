// systems/billiard.js — R22スパイク：ビリヤード攻撃（掴む → 溜める → 投げる）
//
// 【これは検証用のスパイクであり、確定仕様ではない】
// ゲーム内キーで現行の「一撃」モードと切り替えて、実際に触って比較するために作った。
//
// 設計の核（thinker合議 2026-08-22 の収束点）：
//   ・とどめを刺せるのは **投げの着弾だけ**。掴みも突きも敵を倒さない
//   ・ボタンは物理的に1つ。文脈で2つの動詞に分かれる
//       獲物（よろけ）が射程内 → 掴む（押しっぱなしで溜め、離すと投げる）
//       いない               → 突き（倒せない。削ってよろけにする＋ノックバック＋カウンター）
//   ・突きを「倒せない」に留める理由：倒せる通常攻撃を併設すると、CDの安い方に自然プレイが収束して
//     投げが使われなくなる（過去の失敗「必殺技が84秒に1回」と同型）
//   ・突きを残す理由：一撃は理論上2.8回/秒、掴み→溜め→投げは0.4〜0.8回/秒。押す回数が3〜7分の1に
//     落ちる。「ボタンを押して戦うのが好き」な読者にはこの落差が効く
//
// 未確定の仮定数（合議が「ここで設計全体の成否が決まる」と特定した箇所）：
//   ・billiard.hpCostPerHit = 1（固定1。被弾側HP比例にするとチビット弾がチビット1体で砕けて破綻する）
//   ・billiard.chargeHpBonus = 4（溜めが速度だけを買うと、最小溜め連打が数学的に支配戦略になるため）
import { BALANCE } from '../data/balance.js';
import { ENEMIES } from '../data/enemies.js';
import { Sound } from '../audio/sound.js';

const Phaser = window.Phaser;
const ADD = Phaser.BlendModes.ADD;

export function createBilliard(run) {
  const st = {
    mode: 1,          // 0＝一撃（現行 updateHeroStrike） / 1＝ビリヤード
    driftIdx: 0,      // BALANCE.stagger.driftModes の添字（キー6で巡回）
    shardIdx: 0,      // hero.billiard.shards.modes の添字（キー9で巡回）＝ボス戦の装甲片の強さ
    expireVanish: true,   // よろけの時間切れ：true＝消滅（新案） / false＝強化復活（現行）
    held: null,       // 掴んでいる獲物 { maxHp, color, tex, scale, radius }
    chargeT: 0,
    cd: 0,
    seeded: false,
    maxRung: false,   // 溜め切りの合図を1回だけ鳴らすため
    shots: [],
    pool: [],
    heldSpr: null, heldGlow: null,
    // R22 投球モーション。null＝投げていない / オブジェクト＝振っている最中
    wind: null, ghosts: null, bodyDirty: false, canScale: true, bodyBase: 3,
    // 計測（キー7で表示）。「自然なプレイで何回発動するか」で判定するため。
    grabs: 0, throws: 0, jabs: 0, jabStaggers: 0,
    throwKills: 0, chargeSum: 0, bestChain: 0, dud: 0,
  };

  const B = () => BALANCE.hero.billiard;
  // 現在の段位。レベルが上がるほど威力と派手さが同時に上がる。
  function tier() {
    const T = B().throwTiers;
    for (let i = 0; i < T.length; i++) if (run.level <= T[i].untilLevel) return T[i];
    return T[T.length - 1];
  }
  // 段が上がった瞬間を見せる。ここが「成長を感じる」の発火点。
  function checkTierUp() {
    const T = B().throwTiers;
    let idx = T.length - 1;
    for (let i = 0; i < T.length; i++) if (run.level <= T[i].untilLevel) { idx = i; break; }
    if (st.tierIdx === undefined) { st.tierIdx = idx; return; }
    if (idx <= st.tierIdx) return;
    st.tierIdx = idx;
    const t = T[idx];
    if (run.fx && run.fx.announce) run.fx.announce('なげる が ' + t.name + ' に！', '#ffe9a8');
    Sound.sfx('weaponTier');
    screenFlash(0.3, t.color);
    burstStreaks(run.player.x, run.player.y, t.streaks + 10, t.color, 130);
    zoomPunch(t.zoom * 2.2);
    shockRing(run.player.x, run.player.y, 120, t.color);
  }
  const grabReach = () => B().grabReach + (run.playerStage - 1) * B().grabReachPerStage;
  const driftMul = () => (BALANCE.stagger.driftModes[st.driftIdx] || { speedMul: 0.55 }).speedMul;

  // ---- 開幕の空白対策 ----
  // 実測で最初の獲物が生まれるのは4.48〜4.62秒。「最初の10秒」の45%が無反応だった。
  // 湧きは可視矩形の外周（最短200〜240px）からなので湧きレートでは消せない＝開幕だけ直接置く。
  function seedOpeningPrey() {
    st.seeded = true;
    const n = B().openingPrey | 0;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 / n) * i + run.rng.range(0, 1);
      const d = B().openingPreyDist;
      const e = run.spawnEnemy(run.rng.pick(ENEMIES),
        run.player.x + Math.cos(a) * d, run.player.y + Math.sin(a) * d, false, 1);
      if (!e) break;
      e.hp = 1;
      run.enterStagger(e);
    }
  }

  // ---- 掴む ----
  function grab(e) {
    st.held = {
      maxHp: Math.max(1, e.maxHp || 1),
      color: e.color,
      tex: e.spr.texture.key,
      scale: e.baseScale || 1,
      radius: e.radius || 10,
      shard: !!e.shard,        // ボスの装甲片＝ボスへ投げ返すと特効
    };
    st.chargeT = 0;
    st.maxRung = false;
    st.grabs++;
    // 掴んだ敵は場から消える。報酬は「基本」＝手動で割った時の2倍は付かない。
    // 消滅=無報酬／掴み=基本／投げ撃破=満額+連鎖 という勾配で「投げた方が得」を作る。
    run.killEnemy(e, BALANCE.stagger.tint, 'grab');
    // 山は着弾に集中させる。掴みは乾いた装填音の小拍だけ（振幅ゼロ＝画面は揺らさない）。
    Sound.sfx('knuckle', 0.6, 1.2);      // ガシッと掴んだ手応え
    Sound.sfx('specialCharge');
    if (run.fx && run.fx.hitSpark) run.fx.hitSpark(e.x, e.y, BALANCE.stagger.tint);
  }

  // 掴んだ獲物は「手」に持たせる。振りかぶれば後ろへ、振れば前へ、手と一緒に動く。
  // ⚠️ 旧実装は常に狙いの方向の体の前(17〜24px)に置いていた。これだと振りかぶりが絵にならない。
  function showHeld(h, off, ratio) {
    if (!st.heldSpr) {
      st.heldSpr = run.add.image(0, 0, 'bullet').setDepth(14);
      st.heldGlow = run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(8);
    }
    // R23: 手の位置は角度＋距離ではなく**オフセット**で受け取る（頭上を通る弧を描くため）
    const x = run.player.x + off.x;
    const y = run.player.y + off.y - 2;
    st.heldSpr.setTexture(h.tex).setVisible(true)
      .setScale(h.scale * (1 + 0.18 * ratio))
      .setRotation(run.elapsed * (5 + 16 * ratio))
      .setPosition(x, y);
    // 溜まるほど速く脈打つ＝「いつ離すか」が目で分かる
    const pulse = 0.55 + 0.45 * Math.sin(run.elapsed * (7 + 22 * ratio));
    // ⚠️ 4.2+3.4 だと溜め切りで直径76〜100pxになり、主人公の姿勢を光で塗りつぶしていた。
    //    ポーズが読めなくなるので、溜めが分かる範囲で絞る。
    const sz = h.radius * (3.2 + 2.4 * ratio);
    st.heldGlow.setVisible(true).setTint(BALANCE.stagger.tint)
      .setAlpha(0.3 + 0.5 * ratio * pulse).setDisplaySize(sz, sz).setPosition(x, y);
  }

  function hideHeld() {
    if (st.heldSpr) { st.heldSpr.setVisible(false); st.heldGlow.setVisible(false); }
  }

  // ---- 照準 ----
  // 実プレイFB「標準がゴミすぎる。全然狙ったところに標準できない。上下左右斜めと自由に狙いつけられるように」。
  //
  // 主犯は2つあった：
  //  (1) 攻撃が左クリックなので、一度押すと `_pointerSeen` が立ちっぱなしになり、以後の狙いが
  //      **常にマウスカーソルの方向**に固定されていた。キーボードで遊ぶ人はカーソルを動かさないので、
  //      画面の隅に置いたままのカーソルへ永久に投げ続けることになる
  //  (2) 私が入れたエイムアシストが ±26°・0.75 と強すぎ、群れの中心を狙っても手前の1体へ吸われていた
  //      （＝「集団を狙って投げる」という、このゲームで一番大事な戦術を自分で壊していた）
  //
  // 直した方針＝**最後に使った入力が勝つ**。方向キーを押せば8方向、マウスを動かせば360°自由。
  // どちらも押していない間は最後の向きを保持するので、狙いが勝手に動くことはもう無い。
  function aimAngle() {
    const b = B();
    const k = run.moveKeys;
    let kx = 0, ky = 0;
    if (k) {
      if (k.left.isDown || k.a.isDown) kx -= 1;
      if (k.right.isDown || k.d.isDown) kx += 1;
      if (k.up.isDown || k.w.isDown) ky -= 1;
      if (k.down.isDown || k.s.isDown) ky += 1;
    }
    st.keyActive = !!(kx || ky);
    if (st.keyActive) { st.keyAim = Math.atan2(ky, kx); st.keyAimT = run.elapsed; }

    const mT = run._pointerMoveT == null ? -1 : run._pointerMoveT;
    const kT = st.keyAimT == null ? -1 : st.keyAimT;
    let raw;
    if (mT > kT && run.input.activePointer) {
      // マウスを最後に動かした＝カーソル方向（完全に自由な360°）
      const w = run.cameras.main.getWorldPoint(run.input.activePointer.x, run.input.activePointer.y);
      raw = Math.atan2(w.y - run.player.y, w.x - run.player.x);
    } else if (st.keyAim != null) {
      raw = st.keyAim;                      // 方向キーの8方向。離しても保持される
    } else {
      raw = run._weaponAim || 0;
    }
    st.lastAim = raw;

    // アシストは「8方向の刻みを埋める」ためだけの弱いもの。狙いを奪わない。
    if (b.aimAssistPull <= 0) return raw;
    const px = run.player.x, py = run.player.y;
    const lim = Phaser.Math.DegToRad(b.aimAssistDeg);
    let best = null, bestScore = -1;
    for (const e of run.enemies) {
      if (!e.active || e.stag) continue;
      const dx = e.x - px, dy = e.y - py;
      const d = Math.hypot(dx, dy);
      if (d < 24 || d > 300) continue;
      const off = Math.abs(run.angDiff(Math.atan2(dy, dx), raw));
      if (off > lim) continue;
      // ★狙った方向に「何体固まっているか」で選ぶ。手前の1体ではなく群れの側へ寄せる＝戦術を助ける。
      let cluster = 0;
      for (const o of run.enemies) {
        if (!o.active) continue;
        const ddx = o.x - e.x, ddy = o.y - e.y;
        if (ddx * ddx + ddy * ddy <= 70 * 70) cluster++;
      }
      const score = cluster * 10 - off * 12 - d * 0.02;
      if (score > bestScore) { bestScore = score; best = Math.atan2(dy, dx); }
    }
    if (best == null) return raw;
    return raw + run.angDiff(best, raw) * b.aimAssistPull;
  }

  // 溜め中に「どこへ飛ぶか」を点線で見せる。これが無いと狙って投げるという行為自体が成立しない。
  function showAim(ang, ratio) {
    const b = B();
    if (!st.aimDots) {
      // ⚠️ 点だけだと星空の背景に沈んで見えない（実測：先端の輪しか判別できなかった）。
      //    土台に1本の帯を敷き、その上に点を重ねて「線」として読ませる。
      st.aimBeam = run.add.image(0, 0, 'white').setOrigin(0, 0.5)
        .setBlendMode(ADD).setDepth(5);
      st.aimDots = [];
      for (let i = 0; i < b.aimDots; i++) {
        st.aimDots.push(run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(6));
      }
      st.aimTip = run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(6);
    }
    const px = run.player.x, py = run.player.y;
    const n = st.aimDots.length;
    const hot = ratio >= 1;
    const col = hot ? 0xffd23f : BALANCE.stagger.tint;
    // 溜めるほど線が伸びる＝飛距離が増えることが目で分かる
    const step = b.aimDotStep * (0.6 + 0.4 * ratio);
    const len = step * n;
    st.aimBeam.setVisible(true).setTint(col).setRotation(ang)
      .setAlpha(0.22 + 0.30 * ratio)
      .setDisplaySize(len, 3 + 3 * ratio)
      .setPosition(px + Math.cos(ang) * 22, py + Math.sin(ang) * 22);
    for (let i = 0; i < n; i++) {
      const d = 26 + step * i;
      const k = 1 - i / n * 0.55;
      const sz = (6 + 5 * ratio) * k;
      st.aimDots[i].setVisible(true).setTint(col)
        .setAlpha((0.5 + 0.4 * ratio) * k)
        .setDisplaySize(sz * 2, sz * 2)
        .setPosition(px + Math.cos(ang) * d, py + Math.sin(ang) * d);
    }
    const td = 22 + len;
    // 溜め切ると先端が金色に脈打つ＝「いま離すと最大」が一目で分かる
    const pulse = hot ? 0.85 + 0.15 * Math.sin(run.elapsed * 18) : 1;
    st.aimTip.setVisible(true).setTint(col)
      .setAlpha((0.6 + 0.35 * ratio) * pulse).setScale((0.75 + 0.55 * ratio) * pulse)
      .setRotation(run.elapsed * 3)
      .setPosition(px + Math.cos(ang) * td, py + Math.sin(ang) * td);
  }

  function hideAim() {
    if (!st.aimDots) return;
    for (const d of st.aimDots) d.setVisible(false);
    st.aimTip.setVisible(false);
    st.aimBeam.setVisible(false);
  }

  // 画面全体の閃光。大連鎖のときだけ＝滅多に出ないから効く。
  function screenFlash(alpha, color) {
    const V = BALANCE.view;
    const f = run.add.image(V.width / 2, V.height / 2, 'white').setScrollFactor(0)
      .setBlendMode(ADD).setDepth(60).setTint(color).setAlpha(alpha)
      .setDisplaySize(V.width, V.height);
    run.tweens.add({ targets: f, alpha: 0, duration: 200, onComplete: () => f.destroy() });
  }

  // ---- 投げる ----
  // ★弾を生む。px/py は **手の座標**（投球モーションの release 時点）であって体の中心ではない。
  //   実プレイFB「主人公の身体から弾が飛び出しているようにしか見えない」の直接の原因がここだった。
  function launchShot(ang, ratio, h, px, py) {
    const b = B();
    const speed = b.speedMin + (b.speedMax - b.speedMin) * ratio;
    // 溜めは速度と貫通HPの両方を買う（速度だけだと最小溜め連打が支配戦略になる）
    // ⚠️ 下限つき。掴んだ敵のHPだけだとチビット(4)を掴んだ時に4体で砕け、
    //    「一番よく掴む相手が一番弱い弾」という逆の関係になる（実プレイFB「弱すぎる」の原因）。
    const T = tier();
    const hp = Math.max(b.minHp, h.maxHp) + Math.round(b.chargeHpBonus * ratio) + T.hpBonus;

    const disp = st.pool.pop() || {
      spr: run.add.image(0, 0, 'bullet').setDepth(13),
      glow: run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(7),
      ring: run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(12),
    };
    if (!disp.ring) disp.ring = run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(12);
    // 段が上がるほど弾そのものが大きく派手になる（実プレイFB「地味で攻撃している実感がない」）
    disp.spr.setTexture(h.tex).setVisible(true).setScale(h.scale * T.ballMul)
      .setRotation(0).setPosition(px, py);
    disp.glow.setVisible(true).setTint(T.color).setAlpha(0.95)
      .setDisplaySize(h.radius * (7 + 4 * ratio) * T.ballMul * 0.6, h.radius * 4 * T.ballMul * 0.6)
      .setRotation(ang).setPosition(px, py);
    // まとわりつく輪。飛んでいる間ずっと回るので「ただの点」に見えなくなる（実プレイFB「まだ地味」）
    disp.ring.setVisible(true).setTint(T.color).setAlpha(0.75)
      .setScale(h.radius * T.ballMul * 0.055).setPosition(px, py);

    st.shots.push({
      active: true, x: px, y: py,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      hp, radius: Math.max(b.hitRadius, h.radius) * (0.85 + 0.25 * T.ballMul * 0.6), color: h.color,
      life: b.lifeSec, hit: new Set(), kills: 0, chain: 0, tier: T, shard: !!h.shard,
      spin: 7 + 20 * ratio, spr: disp.spr, glow: disp.glow, ring: disp.ring,
    });

    st.throws++;
    st.chargeSum += ratio * b.chargeMaxSec;
    hideHeld();
    // 実プレイFB「もっと派手なエフェクトと効果音で盛り上げて」。投げは1.2〜2.5秒に1回＝稀なので大きく出す。
    Sound.sfx('hammer', 0.5 + 0.5 * ratio, 0.9 + 0.3 * ratio);
    Sound.sfx('heroPunch', ratio, 1 + 0.25 * ratio);
    run.shake(90 + 90 * ratio, (4 + 5 * ratio) * T.stopMul);
    // 反動で下がる＝「重いものを投げた」手応え。操作は奪わない（ノックバックの既存経路を使う）
    run._knockX = -Math.cos(ang) * b.recoil * (0.6 + 0.4 * ratio);
    run._knockY = -Math.sin(ang) * b.recoil * (0.6 + 0.4 * ratio);
    run._knockT = 0.14;
    burstStreaks(px, py, Math.max(4, Math.round(T.streaks * 0.5)), T.color, 46 + 30 * ratio);
    if (run.fx && run.fx.heroImpact) run.fx.heroImpact(px + Math.cos(ang) * 10, py + Math.sin(ang) * 10, ang, ratio);
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(px + Math.cos(ang) * 6, py + Math.sin(ang) * 6, ang, BALANCE.stagger.tint);
    shockRing(px, py, 52 + 40 * ratio, ratio >= 1 ? 0xffd23f : T.color);
    if (ratio >= 1) screenFlash(0.22, 0xffd23f);   // 溜め切りだけの特典
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT, 0.04 + 0.05 * ratio);
  }

  // ---- ボスに当たったときの手応え ----
  // 実プレイFB「ビリヤード弾がボスに当たったときの感触が無い。素通りして見える。
  //   体力ゲージは減っているので当たっているのは確認できるが、非常に不満」。
  //
  // 白フラッシュ（boss.flashT）は元から出ている。足りなかったのは3つ：
  //   1. **玉がボスを貫通して飛び去っていた**（＝文字どおり素通りの絵）。玉が反応しない限り、
  //      ボス側をどれだけ光らせても「当たった」には見えない。玉はボスで**砕けて終わる**ようにする
  //   2. 画面が一切動かない（振動もヒットストップもカメラの寄りも無い）
  //   3. 巨体が微動だにしない（Run.updateEnemies は isBoss を飛ばすので、雑魚のつぶれ・
  //      ノックバックはボスには一切適用されない）→ boss.js 側にのけぞりを依頼する
  //
  // 振幅は頻度と逆相関。ボスへの手動命中はボス戦でも毎秒1回未満なので、大きく出してよい。
  function bossImpact(s, e, dealt, T) {
    // 1. 玉はここで砕ける。ただし**連鎖はさせない**（burstStagger を走らせると、せっかく
    //    剥がした装甲片を自分の炸裂で消してしまい、弾薬供給が半減する）
    s.hp = 0;
    s.noChain = true;
    s.x = e.x + (s.x - e.x) * 0.35;   // 着弾点をボス寄りへ寄せる＝「めり込んだ」位置で炸裂する
    s.y = e.y + (s.y - e.y) * 0.35;
    // 2. ボス本体の反応（描画は boss.js が持っているので依頼する）
    if (run.boss && run.boss.bossHitReact) run.boss.bossHitReact(Math.atan2(s.vy, s.vx), 0.16);
    // 3. 手に返る感触。止める→揺らす→寄せる の3点セット
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT, 0.09 * T.stopMul);
    run.shake(170, Math.min(11, 6 * T.stopMul));
    zoomPunch(T.zoom * 1.8);
    // 4. 着弾点の炸裂。ボスの装甲を叩いた音（金属）と、めり込んだ輪
    shockRing(s.x, s.y, 86 * T.radiusMul, T.color);
    shockRing(s.x, s.y, 52 * T.radiusMul, 0xffffff);
    burstStreaks(s.x, s.y, Math.max(8, T.streaks), T.color, 78);
    run.spawnParticles(s.x, s.y, T.color, 18);
    if (T.flash > 0) screenFlash(T.flash * 0.9, T.color);
    Sound.sfx('metalSlam', 1, 0.72);
    Sound.sfx('bigBoom', 0.45);
    // 5. 与えたダメージを必ず出す（通常のダメージ数字は0.06秒で間引かれるので、ここは自前で出す）
    run.floatText(e.x, e.y - e.radius - 6, String(dealt), s.shard ? '#ffd23f' : '#9fe8ff');
  }

  // ---- 着弾 ----
  function hitOne(s, e) {
    if (e.stag) {
      // 獲物に当てると炸裂連鎖。これがビリヤードの本体（群れの中心を叩くほど得）。
      // 一撃の 76/6 より広く長い（108/9）＝一発が大きいのは投げの特権。
      const T = s.tier || tier();
      const r = run.burstStagger(e.x, e.y, B().burstRadius * T.radiusMul, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    } else {
      // ボスの予告を割る権利を一撃から継承する（継承しないとブレイクの受け皿が消える）
      breakBoss(e);
      const alive = e.active;
      const T = s.tier || tier();
      let dmg = Math.round(B().damage * T.dmgMul);
      // ★装甲片をボスへ投げ返すと特効＝「ボスの装甲でボスを殴る」。
      //   ボス戦の与ダメの主役を、仲間や必殺ではなく看板の動詞（投げ）に戻すための倍率。
      if (e.isBoss && s.shard) {
        dmg = Math.round(dmg * shardMode().mul);
        run.floatText(e.x, e.y - e.radius - 22, 'アーマーブレイク！', '#ffd23f');
      }
      // src='manual' ＝ とどめの権利。dealDamage 側で bossBreakMul も掛かる。
      const hpBefore = e.hp;
      run.dealDamage(e, dmg, T.color, 'manual');
      if (e.isBoss) bossImpact(s, e, Math.max(0, hpBefore - e.hp), T);
      if (alive && !e.active) s.kills++;
      // 生き残った敵は弾き飛ばす＝弾が通過したことが目に見える（貫通の手応え）
      else if (e.active) {
        const d = Math.hypot(s.vx, s.vy) || 1;
        e.knockX = (s.vx / d) * B().pierceKnock;
        e.knockY = (s.vy / d) * B().pierceKnock;
        e.knockT = 0.12;
      }
    }
    const b = B(), Tc = (s.tier || tier()).color;
    run.spawnHitMark(s.x, s.y, Tc);
    if (run.fx && run.fx.hitSpark) run.fx.hitSpark(s.x, s.y, Tc);
    // 当てるたびに音程が上がる階段＝連鎖が耳で分かる
    Sound.sfx('metalSlam', 0, Math.min(1.7, 1 + 0.07 * s.kills));
    // ★なぎ倒す触感（実プレイFB）。1体ごとに「一瞬止まる・小さく揺れる・減速する・弾がぶれる」。
    //   連鎖するとこれが積み重なり、群れに食い込んでいく抵抗として体に伝わる。
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT, b.pierceStopSec);
    run.shake(60, b.pierceShake);
    s.vx *= b.pierceDrag; s.vy *= b.pierceDrag;   // 貫くほど重くなる＝手応え
    s.wob = b.pierceWobble; s.wobT = 0;
    s.hp -= b.hpCostPerHit;
  }

  // 着弾でカメラが一瞬寄る。揺れ(shake)より「押された」感じが強く出る。
  // ⚠️ このゲームは他でカメラzoomを使っていないので基準は必ず1。終了時に必ず1へ戻す。
  function zoomPunch(amount) {
    const cam = run.cameras && run.cameras.main;
    if (!cam || st.zooming || amount <= 0) return;
    st.zooming = true;
    const o = { z: 1 };
    run.tweens.add({
      targets: o, z: 1 + amount, duration: 75, yoyo: true, ease: 'Quad.Out',
      onUpdate: () => { if (cam.setZoom) cam.setZoom(o.z); },
      onComplete: () => { if (cam.setZoom) cam.setZoom(1); st.zooming = false; },
    });
  }

  // 放射する光条。段が上がるほど本数が増える＝画面の派手さがそのまま成長の証明になる。
  function burstStreaks(x, y, count, color, len) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + run.rng.range(-0.15, 0.15);
      const img = run.add.image(x, y, 'white').setBlendMode(ADD).setDepth(14)
        .setTint(color).setOrigin(0, 0.5).setRotation(ang)
        .setDisplaySize(10, run.rng.range(2.5, 5.5)).setAlpha(0.95);
      run.tweens.add({
        targets: img, displayWidth: len * run.rng.range(0.7, 1.25), alpha: 0,
        duration: run.rng.range(230, 340), ease: 'Cubic.Out',
        onComplete: () => img.destroy(),
      });
    }
  }

  // 衝撃の輪。着弾の位置と規模が一目で分かる＝「自分がやった」の帰属を強める。
  function shockRing(x, y, radius, color) {
    const img = run.add.image(x, y, 'w_ring').setBlendMode(ADD)
      .setDepth(13).setTint(color).setAlpha(0.9).setScale(0.15);
    run.tweens.add({
      targets: img, scale: radius / 24, alpha: 0,
      duration: 260, ease: 'Cubic.Out',
      onComplete: () => img.destroy(),
    });
  }

  function burstEnd(s) {
    s.active = false;
    // 飛び終わりに必ず炸裂する。ここが無いと「当たらなかった投げ」が完全な無駄になり、
    // 主武器としての信頼が落ちる＝必殺技に頼る動機になる（実プレイFB）。
    // s.noChain ＝ ボスに当たって砕けた玉。ここで連鎖させると自分の装甲片を巻き込んで消す
    if (B().endBurst && !s.noChain) {
      const r = run.burstStagger(s.x, s.y, B().burstRadius * (s.tier || tier()).radiusMul, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    }
    run.spawnParticles(s.x, s.y, s.color, 12);
    run.popFx(s.x, s.y, s.color);
    st.throwKills += s.kills;
    st.bestChain = Math.max(st.bestChain, s.kills);
    // ボスに当たって砕けた玉は空振りではない（連鎖しないので kills は0のまま）
    if (s.kills === 0 && !s.noChain) st.dud++;
    if (s.kills > 0) {
      const b = B(), T = s.tier || tier();
      // 振幅は頻度と逆相関。投げは0.4〜0.8回/秒＝一撃の3〜7分の1なので、倒した数ぶん大きく出す。
      // さらに段位（T.stopMul / T.rings / T.streaks / T.flash）で全体を底上げする＝成長が画面で分かる。
      run.shake(100 + 24 * s.kills,
        Math.min(b.shakeMax * T.stopMul, (b.shakeBase + b.shakePerKill * s.kills) * T.stopMul));
      if (!run.cinematic) {
        run.freezeT = Math.max(run.freezeT,
          Math.min(b.freezeMax, (b.freezeBase + b.freezePerKill * s.kills) * T.stopMul));
      }
      // 輪を段位ぶん重ねる。時間差で広がるので「衝撃が伝わった」ように見える。
      const baseR = b.burstRadius * T.radiusMul;
      for (let i = 0; i < T.rings; i++) {
        const dly = i * 55;
        run.time.delayedCall(dly, () => shockRing(s.x, s.y, baseR * (0.75 + 0.35 * i), i === 0 ? T.color : 0xffd23f));
      }
      if (T.streaks > 0) burstStreaks(s.x, s.y, T.streaks, T.color, baseR * 0.9);
      zoomPunch(T.zoom * Math.min(2.2, 0.7 + 0.22 * s.kills));
      run.spawnParticles(s.x, s.y, T.color, Math.min(46, 10 + 5 * s.kills));
      Sound.sfx('bigBoom', Math.min(1, s.kills / 5));
      // 毎回の炸裂で全画面を洗うと敵が読めなくなるので上限を抑える（段位アップの一発だけは濃くてよい）
      if (T.flash > 0) screenFlash(T.flash * Math.min(1.25, 0.6 + 0.16 * s.kills), T.color);
      if (s.kills >= 3) Sound.sfx('rush', 0.5);
      if (s.kills >= 5) Sound.sfx('gaugeFull');
      run.floatText(s.x, s.y - 12, s.kills + '体！', s.kills >= 3 ? '#ffd23f' : '#9fe8ff');
    }
  }

  function releaseShot(s) {
    s.spr.setVisible(false);
    s.glow.setVisible(false);
    s.ring.setVisible(false);
    st.pool.push({ spr: s.spr, glow: s.glow, ring: s.ring });
  }

  function updateShots(dt) {
    for (const s of st.shots) {
      if (!s.active) continue;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      // ゆらぎ：当てた直後だけ弾の「絵」が進行方向と直角に振れる。当たり判定(s.x,s.y)はぶらさない。
      let ox = 0, oy = 0;
      if (s.wob > 0) {
        s.wobT += dt;
        s.wob = Math.max(0, s.wob - dt * 110);
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const amp = Math.sin(s.wobT * 46) * s.wob * 0.1;
        ox = (-s.vy / sp) * amp; oy = (s.vx / sp) * amp;
      }
      s.spr.setPosition(s.x + ox, s.y + oy).setRotation(s.spr.rotation + s.spin * dt);
      s.glow.setPosition(s.x + ox, s.y + oy);
      // 輪は弾と逆回りにする＝二重の回転で目が離せなくなる
      s.ring.setPosition(s.x + ox, s.y + oy).setRotation(s.ring.rotation - s.spin * 0.7 * dt);
      // 軌跡。どこを通ったかが残る＝速さと「自分が投げた」が目で追える。
      if ((s.tick = (s.tick || 0) + 1) % B().trailEveryFrames === 0) {
        const T = s.tier || tier();
        const sz = s.radius * 2.2 * (0.7 + 0.35 * T.trailMul);
        const t = run.add.image(s.x, s.y, 'glow').setBlendMode(ADD).setDepth(6)
          .setTint(T.color).setAlpha(0.4 + 0.18 * T.trailMul).setDisplaySize(sz, sz);
        run.tweens.add({ targets: t, alpha: 0, scale: 0.2, duration: B().trailLifeMs * T.trailMul,
          onComplete: () => t.destroy() });
      }
      if (s.life <= 0) { burstEnd(s); continue; }
      for (const e of run.enemies) {
        if (!e.active || s.hit.has(e.id)) continue;
        const rr = s.radius + e.radius;
        const dx = e.x - s.x, dy = e.y - s.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        s.hit.add(e.id);
        hitOne(s, e);
        if (s.hp <= 0) { burstEnd(s); break; }
      }
    }
    st.shots = run.compact(st.shots, releaseShot);
  }

  // ---- ボス戦の弾薬（装甲片） ----
  // ボスの予告を割ると装甲が剥がれ落ちて弾になる。実体はよろけ状態の敵なので、
  // 掴む・溜める・投げるの経路は雑魚とまったく同じ（新しい語彙をプレイヤーに増やさない）。
  // 現在の装甲片モード（ゲーム内キー9で切り替え）。既定は modes[0]＝標準。
  function shardMode() {
    const S = B().shards;
    const list = (S && S.modes) || [];
    return list[st.shardIdx] || { name: '標準', count: (S && S.count) || 0, mul: (S && S.bossMul) || 1 };
  }

  function dropShards(bossEnt) {
    const S = B().shards;
    const M = shardMode();
    if (!S || M.count <= 0 || !bossEnt) return;
    const def = ENEMIES.find((x) => x.id === S.enemyId) || ENEMIES[0];
    // 主人公の側へ撒く＝拾いに行く動きがボスへ近づく動きと同じ向きになる（逃げ得にしない）
    const base = Math.atan2(run.player.y - bossEnt.y, run.player.x - bossEnt.x);
    const step = Phaser.Math.DegToRad(S.spreadDeg);
    let made = 0;
    for (let i = 0; i < M.count; i++) {
      const a = base + (i - (M.count - 1) / 2) * step;
      const e = run.spawnEnemy(def, bossEnt.x + Math.cos(a) * S.dist, bossEnt.y + Math.sin(a) * S.dist, false, 1);
      if (!e) break;                 // enemyCap に当たったら諦める（弾薬のために上限を破らない）
      e.hp = 1;
      e.shard = true;                // ★これを掴んだ弾はボスへ特効
      e.noReward = true;             // 弾薬の供給が経験値の蛇口になると、ボス戦が稼ぎ場になる
      e.baseScale = (e.baseScale || 1) * S.scaleMul;
      e.radius = (e.radius || 10) * S.scaleMul;
      e.spr.setScale(e.baseScale);
      run.enterStagger(e);
      if (run.fx && run.fx.hitSpark) run.fx.hitSpark(e.x, e.y, BALANCE.stagger.tint);
      made++;
    }
    if (made > 0) {
      shockRing(bossEnt.x, bossEnt.y, bossEnt.radius + 26, BALANCE.stagger.tint);
      Sound.sfx('metalSlam', 0.5, 0.8);
      // 初回だけ言葉で教える。「割ると弾が出る」は見ているだけでは繋がらない（小6向け）
      if (!st.shardHinted) {
        st.shardHinted = true;
        if (run.fx && run.fx.announce) run.fx.announce('そうびが はがれた！ つかんで なげろ！', '#9fe8ff');
      }
    }
  }

  // ボスの予告を突きで割る。一撃モード（Run.doStrike）は持っていた経路が、ビリヤードモードでは
  // 投げ（hitOne）にしか無く、弾薬の乏しいボス戦でカウンターのチャンネルごと消えていた。
  function breakBoss(e) {
    if (!e.isBoss || !run.boss || !run.boss.breakTelegraph) return false;
    if (!run.boss.breakTelegraph()) return false;
    run._breakTotal = (run._breakTotal || 0) + 1;
    run.floatText(e.x, e.y - e.radius - 10, 'ブレイク！', '#9fe8ff');
    dropShards(e);
    return true;
  }

  // ---- 突き（倒せない動詞） ----
  // ★獲物(stag)は対象外。掴み圏から弾き出してしまうと、投げる理由が痩せるため。
  function jab() {
    const b = B(), J = b.jab;
    const ang = aimAngle();
    run._weaponAim = ang;
    run._punchAng = ang;
    run._punchT = BALANCE.hero.melee.punchSec;
    const px = run.player.x, py = run.player.y;
    const half = Phaser.Math.DegToRad(J.arcDeg) * 0.5;
    const dmg = J.damage + (run.playerStage - 1) * J.damagePerStage;
    let n = 0, counters = 0;

    for (const e of run.enemies) {
      if (!e.active || e.stag) continue;
      const dx = e.x - px, dy = e.y - py;
      const rr = J.reach + e.radius;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (Math.abs(run.angDiff(Math.atan2(dy, dx), ang)) > half) continue;

      let mul = 1;
      // ボスの予告を割る権利も突きが持つ（＝弾薬供給の蛇口。dropShards がここから開く）
      if (breakBoss(e)) { mul = J.counterMul; counters++; }
      if (e.atkState === 'telegraph') {
        // 予告を割る権利は突きが持つ（一撃の実測20.4回/分のチャンネルを絶やさない）
        mul = J.counterMul;
        counters++;
        Sound.sfx('counter');
        if (run.fx && run.fx.hitSpark) run.fx.hitSpark(e.x, e.y, 0xff6ec7);
        e.atkState = 'ready';
        e.atkT = Math.max(1, (e.def.attack ? e.def.attack.intervalSec : 1));
        if (e.aimLine) { e.aimLine.destroy(); e.aimLine = null; }
      }
      // src='jab' ＝ とどめの権利なし。HPが尽きた敵は killEnemy ではなく enterStagger へ落ちる（＝獲物になる）。
      run.dealDamage(e, Math.max(1, Math.round(dmg * mul)), 0xffd23f, 'jab');
      if (e.stag) st.jabStaggers++;
      if (e.active) {
        const d = Math.hypot(dx, dy) || 1;
        e.knockX = (dx / d) * J.knockback;
        e.knockY = (dy / d) * J.knockback;
        e.knockT = J.knockbackSec;
      }
      if (++n >= J.maxTargets) break;
    }

    st.jabs++;
    st.cd = b.cooldownSec;
    if (counters > 0) run._counterTotal = (run._counterTotal || 0) + counters;
    if (n === 0) {
      Sound.sfx('tick', 0, 0.7);
    } else {
      Sound.sfx('punch', 0.2, 1.1);
      if (run.fx && run.fx.heroImpact) {
        run.fx.heroImpact(px + Math.cos(ang) * J.reach * 0.5, py + Math.sin(ang) * J.reach * 0.5, ang, 0.15);
      }
    }
  }

  // ============ 投球モーション（R22・実プレイFB） ============
  // 実プレイFB「ファミスタの投手のように、おもいっきり振りかぶって、足を高く上げて、高速スピードで
  // 腕を振って投げつける動きを。今は主人公の身体から弾が飛び出しているようにしか見えない」。
  //
  // FBは見え方ではなく**実装そのもの**を言い当てていた。旧 doThrow は run.player.x/y ＝体の中心から
  // 弾を生んでいたので、どれだけエフェクトを足しても「体から湧いた」ようにしか見えようがなかった。
  //
  // 直す核は3つ。順に効く：
  //   (1) 弾は**手から出る**（releaseReach だけ前に出た座標から生む）
  //   (2) 溜め中は腕とボールを**後ろへ引く**（＝振りかぶり）。前に構えていては振りかぶりに見えない
  //   (3) 振りは**加速**させ、腕の残像を重ねる（等速で動かすと「速く振った」に見えない）
  // これを 0.17 秒のモーションに畳んで、途中の releaseAt で弾を離す。
  function PT() { return B().pitch; }

  // 腕を後ろへ引く回転の向き。画面上で「上を通って後ろへ」回る側を選ぶ。
  // 逆を選ぶと腕が地面をくぐって回り、投球に見えない。
  function facingOf(ang) { return Math.cos(ang) >= 0 ? 1 : -1; }

  // ---- 手の軌道（R23 再設計）----
  // 振りかぶり点（頭の上・やや後ろ）と 振り抜き点（前方・やや下）を2次ベジエの弧で結ぶ。
  // ⚠️ 角度ではなく**位置**を補間するのが要点。トップダウンでは水平の腕の回転は画面上で
  //    「回っている」以上の意味を持たないが、縦の動き（頭上→前下）は画面のYにそのまま出るので、
  //    36pxの体でも「振りかぶって叩きつけた」がはっきり読める。
  function handAt(ang, k, ratio) {
    const p = PT();
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const wx = -ca * p.windBack, wy = -(p.windUp + p.windUpMax * ratio);      // 頭上・やや後ろ
    const rx = ca * p.releaseReach, ry = sa * p.releaseReach + p.releaseDown; // 前方・やや下
    const cx = (wx + rx) * 0.5 + ca * p.arcBulge;
    const cy = Math.min(wy, ry) - p.arcLift;
    const t = k < 0 ? 0 : k > 1 ? 1 : k, mt = 1 - t;
    return { x: mt * mt * wx + 2 * mt * t * cx + t * t * rx,
             y: mt * mt * wy + 2 * mt * t * cy + t * t * ry };
  }

  // 腕と拳。updatePlayer / updateHeroFist の**後**に呼ばれるので、ここでの上書きが最終的に画面に出る。
  // 手の位置を自由に置けるよう、肩からその点までを1本の腕として描く。
  function drawHandAt(off, ang) {
    const a = Math.atan2(off.y, off.x);
    const r = Math.hypot(off.x, off.y);
    const fi = run.playerFistImg;
    if (fi) {
      fi.setPosition(run.player.x + off.x, run.player.y + off.y + 1)
        .setRotation(a).setFlipY(facingOf(ang) < 0).setTint(0xffffff).setAlpha(1)
        .setVisible(run.playerImg.visible && r > 4);
    }
    run.drawArm(a, r, 0xffffff);
  }

  // 振り下ろしの残像。旧実装は腕を扇状に5枚重ねていたが、体が36pxしかないので扇はノイズになる。
  // 弧の上の「少し前の手の位置」へ腕を3本置く＝実際に通った道がそのまま線になる。
  function ghostArc(ang, k, ratio, alphaMul) {
    const p = PT();
    if (!st.ghosts) {
      st.ghosts = [];
      for (let i = 0; i < 8; i++) {
        st.ghosts.push(run.add.image(0, 0, 'white').setOrigin(0, 0.5)
          .setBlendMode(ADD).setDepth(11).setVisible(false));
      }
    }
    const n = Math.min(st.ghosts.length, p.ghosts | 0);
    const sh = 5;
    for (let i = 0; i < st.ghosts.length; i++) {
      const g = st.ghosts[i];
      const kk = k - (i + 1) * 0.17;
      if (i >= n || kk <= 0 || !run.playerImg.visible) { g.setVisible(false); continue; }
      const h = handAt(ang, kk, ratio);
      const a = Math.atan2(h.y, h.x), r = Math.hypot(h.x, h.y);
      g.setPosition(run.player.x + Math.cos(a) * sh, run.player.y + Math.sin(a) * sh + 1)
        .setRotation(a)
        .setDisplaySize(Math.max(2, r - sh), 7 * (1 - i * 0.2))
        .setTint(0x9fe0ff)
        .setAlpha(0.55 * (1 - i / (n + 1)) * (alphaMul == null ? 1 : alphaMul))
        .setVisible(true);
    }
  }

  function hideGhosts() {
    if (!st.ghosts) return;
    for (const g of st.ghosts) g.setVisible(false);
  }

  // 体の姿勢。lean=反り・前傾(rad) / lunge=前後の踏み込み(負＝引く) / squash=潰れ(負＝縦に伸びる)
  // ⚠️ 旧実装にあった lift（足を高く上げる）は**廃止**した。トップダウンでは体が上へ動くと
  //    「跳ねた・浮いた」にしか見えず、投球には読めない（実プレイFBで廃止を許可された）。
  function setBody(ang, lean, lunge, squash) {
    const img = run.playerImg;
    if (!img) return;
    if (!st.bodyDirty) {
      st.bodyDirty = true;
      // レベルアップの拡大tweenが走っている間は縮尺に触らない（奪い合うとスケールが壊れる）
      st.canScale = !(run.tweens && run.tweens.isTweening && run.tweens.isTweening(img));
      st.bodyBase = img.scaleX;
    }
    const f = facingOf(ang);
    const x = run.player.x + Math.cos(ang) * lunge;
    const y = run.player.y + Math.sin(ang) * lunge * 0.6;   // 3/4視点なので前後の踏み込みはYへ控えめに乗せる
    img.setPosition(x, y).setRotation(lean * f);
    if (st.canScale) img.setScale(st.bodyBase * (1 + squash), st.bodyBase * (1 - squash));
    if (run.playerGlow) run.playerGlow.setPosition(x, y);
  }

  function resetBody() {
    if (!st.bodyDirty) return;
    st.bodyDirty = false;
    const img = run.playerImg;
    if (!img) return;
    img.setRotation(0);
    if (st.canScale) img.setScale(st.bodyBase);
  }

  // 溜めを解いた瞬間。ここではまだ弾は出ない（出るのは releaseAt の時点＝手が前に来てから）。
  function startThrow(ang) {
    const b = B(), ratio = Math.min(1, st.chargeT / b.chargeMaxSec);
    // e＝振りかぶりの深さ。軽い溜めでも半分は引く（引かないと「振りかぶった」に見えない）
    st.wind = { ang, ratio, h: st.held, t: 0, fired: false, e: 0.5 + 0.5 * ratio };
    st.held = null; st.chargeT = 0; st.maxRung = false;
    st.cd = b.grabCooldownSec;
    hideAim();
    // 振り始めの風切り。「ヒュッ（振り）→ ドンッ（離す）」の2段になって投げた実感が出る
    Sound.sfx('throwWhoosh', ratio);
  }

  function endPitch() {
    st.wind = null;
    hideGhosts();
    hideHeld();
    resetBody();
    run._moveMul = 1;
    if (run.playerFistImg) run.playerFistImg.setVisible(false);
    if (run.playerArmImg) run.playerArmImg.setVisible(false);
  }

  function updatePitch(dt) {
    const p = PT(), w = st.wind;
    w.t += dt;
    const u = Math.min(1, w.t / p.motionSec);
    const rel = p.releaseAt;
    run._moveMul = p.moveMulWhileThrow;
    run._weaponAim = w.ang;

    if (u < rel) {
      // 振り下ろし。頭上から前下へ**加速**しながら抜ける（等速だと速く見えない）
      const k = Math.pow(u / rel, 1.7);
      const h = handAt(w.ang, k, w.ratio);
      ghostArc(w.ang, k, w.ratio, 1);
      drawHandAt(h, w.ang);
      showHeld(w.h, h, w.ratio);
      // 体：後ろへ引いた姿勢から前へ出る。同時に「縦長（引き絞り）→ 横潰れ（踏み込み）」へ反転する。
      // 等倍で読めるのはこのシルエットの変化だけなので、ここに全部を賭ける。
      setBody(w.ang,
        -p.bodyLean * w.e * (1 - k) + p.bodyLungeLean * k,
        -p.drawBack * w.e * (1 - k) + p.bodyLunge * k,
        -p.drawStretch * w.e * (1 - k) + p.squash * k);
      return;
    }

    if (!w.fired) {
      w.fired = true;
      // ★弾が生まれる場所＝手。体の中心ではない
      const h = handAt(w.ang, 1, w.ratio);
      launchShot(w.ang, w.ratio, w.h, run.player.x + h.x, run.player.y + h.y + 1);
      // 踏み込みの土煙（足元）
      run.spawnParticles(run.player.x + Math.cos(w.ang) * 6, run.player.y + 11, 0xd7e3f2, p.dust | 0);
      Sound.sfx('stepPlant');
      // ★離した瞬間に画面が止まる。1コマ止まることでポーズが「決まる」＝投げつけた感触の中心。
      //   freezeT は Run.update 全体を止めるので、この間ポーズも弾も静止する（＝スナップ）。
      if (!run.cinematic) run.freezeT = Math.max(run.freezeT, p.releaseFreeze);
    }

    // フォロースルー。振り抜いた勢いで前へ行き過ぎてから戻る
    const k2 = (u - rel) / (1 - rel);
    const h = handAt(w.ang, 1, w.ratio);
    const over = 1 + (p.followUp / Math.max(1, p.releaseReach)) * Math.sin(k2 * Math.PI);
    const hh = { x: h.x * over, y: h.y * over };
    ghostArc(w.ang, 1, w.ratio, 1 - k2);
    drawHandAt(hh, w.ang);
    setBody(w.ang, p.bodyLungeLean * (1 - k2), p.bodyLunge * (1 - k2), p.squash * (1 - k2));
    if (u >= 1) endPitch();
  }

  function press() {
    const prey = run.nearestEnemy(grabReach(), 0, true, (e) => !e.isBoss);
    if (prey) grab(prey); else jab();
  }

  // ---- 毎フレーム ----
  function update(dt) {
    if (st.mode !== 1) { run._moveMul = 1; if (st.wind) endPitch(); return; }
    // ランが終わった瞬間にズーム中だと寄ったまま残るので必ず戻す
    if (run.ended && run.cameras && run.cameras.main && run.cameras.main.zoom !== 1) {
      run.cameras.main.setZoom(1); st.zooming = false;
    }
    updateShots(dt);
    // ランが終わったら、振りかぶりで傾けた体と残像を必ず戻す（残すと死亡画面で斜めのまま固まる）
    if (!run.player || run.cinematic || run.paused || run.ended) {
      if (run.ended) { hideGhosts(); resetBody(); }
      return;
    }
    if (!st.seeded) seedOpeningPrey();
    checkTierUp();
    if (st.cd > 0) st.cd -= dt;

    // 投げているあいだ（0.17秒）は他の入力を受けない。腕を振り切るまでが1回の投球。
    if (st.wind) { updatePitch(dt); return; }

    const p = run.input.activePointer;
    const want = (p && p.isDown) || (run._jKey && run._jKey.isDown);

    if (st.held) {
      st.chargeT = Math.min(B().chargeMaxSec, st.chargeT + dt);
      if (!st.maxRung && st.chargeT >= B().chargeMaxSec) { st.maxRung = true; Sound.sfx('gaugeFull'); }
      // ★②のアンカー。溜め中は移動が鈍る＝「群れの中心で溜め切るか、浅く投げて下がるか」の判断が毎周期出る。
      const ang = aimAngle();
      // 溜め中に方向キーを押している間は足を止め、狙いだけを変える＝「上下左右斜めと自由に狙える」。
      // ただし止まるのは溜め開始から aimStopSec 秒まで（実プレイFB「足がとまる時間は0.5秒にしてくれ」）。
      // それ以降は溜めっぱなしでも動けるので、群れの中で永久に足を縛られることがない。
      const bb = B();
      const aiming = st.keyActive && st.chargeT < (bb.aimStopSec == null ? bb.chargeMaxSec : bb.aimStopSec);
      run._moveMul = aiming ? (bb.moveMulWhileAiming == null ? 0 : bb.moveMulWhileAiming)
                            : bb.moveMulWhileCharge;
      const ratio = Math.min(1, st.chargeT / B().chargeMaxSec);
      run._weaponAim = ang;
      // ★振りかぶり。腕とボールを後ろへ引き、体を反らせ、足を持ち上げる。
      //   溜めるほど大きく引くので、ゲージを見なくても「どれだけ溜まったか」が体で分かる。
      // 振りかぶり：手とボールを頭の上へ。体は後ろへ引きながら縦に伸びる（引き絞り）。
      // 溜めるほど深く引くので、ゲージを見なくても「どれだけ溜まったか」がシルエットで分かる。
      const e = 0.5 + 0.5 * ratio;
      const hp0 = handAt(ang, 0, ratio);
      showHeld(st.held, hp0, ratio);
      drawHandAt(hp0, ang);
      setBody(ang, -PT().bodyLean * e, -PT().drawBack * e, -PT().drawStretch * e);
      showAim(ang, ratio);
      if (!want) startThrow(ang);
    } else {
      run._moveMul = 1;
      hideAim();
      resetBody();
      if (want && st.cd <= 0) press();
    }
  }

  // ---- ゲーム内切り替え（実プレイで体感して選ぶためのスパイク機能）----
  function toggleMode() {
    st.mode = st.mode === 1 ? 0 : 1;
    if (st.mode === 0) { st.held = null; st.chargeT = 0; hideHeld(); hideAim(); endPitch(); }
    return st.mode === 1 ? 'ビリヤード（掴む→投げる）' : '一撃（現行）';
  }

  function cycleDrift() {
    st.driftIdx = (st.driftIdx + 1) % BALANCE.stagger.driftModes.length;
    return BALANCE.stagger.driftModes[st.driftIdx].name;
  }

  function toggleExpire() {
    st.expireVanish = !st.expireVanish;
    return st.expireVanish ? '消滅（新案・無報酬）' : '強化復活（現行）';
  }

  // ボス戦の装甲片の強さを巡回する（キー9）。「切」＝R23前の状態なので、その場で前後を比べられる。
  function cycleShards() {
    const list = (B().shards && B().shards.modes) || [];
    if (!list.length) return '（設定なし）';
    st.shardIdx = (st.shardIdx + 1) % list.length;
    const m = list[st.shardIdx];
    return m.name + '（1回のブレイクで' + m.count + '個・ボスへ×' + m.mul + '）';
  }

  function statsLine() {
    const avgCharge = st.throws ? (st.chargeSum / st.throws) : 0;
    const avgKills = st.throws ? (st.throwKills / st.throws) : 0;
    const perMin = run.elapsed > 0 ? (st.throws / run.elapsed * 60) : 0;
    return '[' + tier().name + '] 投' + st.throws + '(' + perMin.toFixed(0) + '/分) 平均' + avgKills.toFixed(1) + '体'
      + ' 最大' + st.bestChain + ' 空' + st.dud
      + ' 溜' + avgCharge.toFixed(2) + 's 掴' + st.grabs + ' 突' + st.jabs + '→獲' + st.jabStaggers;
  }

  return { update, toggleMode, cycleDrift, toggleExpire, cycleShards, statsLine, driftMul, st };
}
