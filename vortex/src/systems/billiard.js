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
    expireVanish: true,   // よろけの時間切れ：true＝消滅（新案） / false＝強化復活（現行）
    held: null,       // 掴んでいる獲物 { maxHp, color, tex, scale, radius }
    chargeT: 0,
    cd: 0,
    seeded: false,
    maxRung: false,   // 溜め切りの合図を1回だけ鳴らすため
    shots: [],
    pool: [],
    heldSpr: null, heldGlow: null,
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

  function showHeld(ang) {
    const h = st.held;
    if (!st.heldSpr) {
      st.heldSpr = run.add.image(0, 0, 'bullet').setDepth(14);
      st.heldGlow = run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(8);
    }
    const ratio = Math.min(1, st.chargeT / B().chargeMaxSec);
    const d = 17 + 7 * ratio;
    const x = run.player.x + Math.cos(ang) * d;
    const y = run.player.y + Math.sin(ang) * d - 4;
    st.heldSpr.setTexture(h.tex).setVisible(true)
      .setScale(h.scale * (1 + 0.18 * ratio))
      .setRotation(run.elapsed * (5 + 16 * ratio))
      .setPosition(x, y);
    // 溜まるほど速く脈打つ＝「いつ離すか」が目で分かる
    const pulse = 0.55 + 0.45 * Math.sin(run.elapsed * (7 + 22 * ratio));
    const sz = h.radius * (4.2 + 3.4 * ratio);
    st.heldGlow.setVisible(true).setTint(BALANCE.stagger.tint)
      .setAlpha(0.3 + 0.5 * ratio * pulse).setDisplaySize(sz, sz).setPosition(x, y);
  }

  function hideHeld() {
    if (st.heldSpr) { st.heldSpr.setVisible(false); st.heldGlow.setVisible(false); }
  }

  // ---- 照準 ----
  // 実プレイFB「標準（照準）をつけやすくして」への対応。素の狙い角に近い敵へ吸い付かせる。
  // 完全な自動照準にはしない（それだと「狙って投げた」感が消える）。aimAssistPull で寄せるだけ。
  function aimAngle() {
    const b = B();
    const raw = run.strikeAim();
    const px = run.player.x, py = run.player.y;
    const lim = Phaser.Math.DegToRad(b.aimAssistDeg);
    let best = null, bestScore = 1e9;
    for (const e of run.enemies) {
      if (!e.active || e.stag) continue;   // 狙う相手は健常な敵（獲物は既に自分のもの）
      const dx = e.x - px, dy = e.y - py;
      const d = Math.hypot(dx, dy);
      if (d < 20 || d > 320) continue;
      const off = Math.abs(run.angDiff(Math.atan2(dy, dx), raw));
      if (off > lim) continue;
      // 角度のズレを優先しつつ、近い方を選ぶ
      const score = off * 220 + d * 0.35;
      if (score < bestScore) { bestScore = score; best = { a: Math.atan2(dy, dx) }; }
    }
    if (!best) return raw;
    return raw + run.angDiff(best.a, raw) * b.aimAssistPull;
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
  function doThrow(ang) {
    const b = B(), h = st.held;
    const ratio = Math.min(1, st.chargeT / b.chargeMaxSec);
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
    const px = run.player.x, py = run.player.y;
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
      life: b.lifeSec, hit: new Set(), kills: 0, chain: 0, tier: T,
      spin: 7 + 20 * ratio, spr: disp.spr, glow: disp.glow, ring: disp.ring,
    });

    st.throws++;
    st.chargeSum += st.chargeT;
    st.held = null; st.chargeT = 0; st.cd = b.grabCooldownSec;
    run._moveMul = 1;
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
    if (run.fx && run.fx.heroImpact) run.fx.heroImpact(px + Math.cos(ang) * 26, py + Math.sin(ang) * 26, ang, ratio);
    if (run.fx && run.fx.muzzleFlash) run.fx.muzzleFlash(px + Math.cos(ang) * 20, py + Math.sin(ang) * 20, ang, BALANCE.stagger.tint);
    shockRing(px, py, 52 + 40 * ratio, ratio >= 1 ? 0xffd23f : T.color);
    if (ratio >= 1) screenFlash(0.22, 0xffd23f);   // 溜め切りだけの特典
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT, 0.04 + 0.05 * ratio);
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
      if (e.isBoss && run.boss && run.boss.breakTelegraph && run.boss.breakTelegraph()) {
        run._breakTotal = (run._breakTotal || 0) + 1;
        run.floatText(e.x, e.y - e.radius - 10, 'ブレイク！', '#9fe8ff');
      }
      const alive = e.active;
      const T = s.tier || tier();
      // src='manual' ＝ とどめの権利。dealDamage 側で bossBreakMul も掛かる。
      run.dealDamage(e, Math.round(B().damage * T.dmgMul), T.color, 'manual');
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
    if (B().endBurst) {
      const r = run.burstStagger(s.x, s.y, B().burstRadius * (s.tier || tier()).radiusMul, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    }
    run.spawnParticles(s.x, s.y, s.color, 12);
    run.popFx(s.x, s.y, s.color);
    st.throwKills += s.kills;
    st.bestChain = Math.max(st.bestChain, s.kills);
    if (s.kills === 0) st.dud++;
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

  // ---- 突き（倒せない動詞） ----
  // ★獲物(stag)は対象外。掴み圏から弾き出してしまうと、投げる理由が痩せるため。
  function jab() {
    const b = B(), J = b.jab;
    const ang = run.strikeAim();
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

  function press() {
    const prey = run.nearestEnemy(grabReach(), 0, true, (e) => !e.isBoss);
    if (prey) grab(prey); else jab();
  }

  // ---- 毎フレーム ----
  function update(dt) {
    if (st.mode !== 1) { run._moveMul = 1; return; }
    // ランが終わった瞬間にズーム中だと寄ったまま残るので必ず戻す
    if (run.ended && run.cameras && run.cameras.main && run.cameras.main.zoom !== 1) {
      run.cameras.main.setZoom(1); st.zooming = false;
    }
    updateShots(dt);
    if (!run.player || run.cinematic || run.paused || run.ended) return;
    if (!st.seeded) seedOpeningPrey();
    checkTierUp();
    if (st.cd > 0) st.cd -= dt;

    const p = run.input.activePointer;
    const want = (p && p.isDown) || (run._jKey && run._jKey.isDown);

    if (st.held) {
      st.chargeT = Math.min(B().chargeMaxSec, st.chargeT + dt);
      if (!st.maxRung && st.chargeT >= B().chargeMaxSec) { st.maxRung = true; Sound.sfx('gaugeFull'); }
      // ★②のアンカー。溜め中は移動が鈍る＝「群れの中心で溜め切るか、浅く投げて下がるか」の判断が毎周期出る。
      run._moveMul = B().moveMulWhileCharge;
      const ang = aimAngle();
      const ratio = Math.min(1, st.chargeT / B().chargeMaxSec);
      run._weaponAim = ang;
      showHeld(ang);
      showAim(ang, ratio);
      if (!want) { hideAim(); doThrow(ang); }
    } else {
      run._moveMul = 1;
      hideAim();
      if (want && st.cd <= 0) press();
    }
  }

  // ---- ゲーム内切り替え（実プレイで体感して選ぶためのスパイク機能）----
  function toggleMode() {
    st.mode = st.mode === 1 ? 0 : 1;
    if (st.mode === 0) { st.held = null; st.chargeT = 0; hideHeld(); hideAim(); run._moveMul = 1; }
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

  function statsLine() {
    const avgCharge = st.throws ? (st.chargeSum / st.throws) : 0;
    const avgKills = st.throws ? (st.throwKills / st.throws) : 0;
    const perMin = run.elapsed > 0 ? (st.throws / run.elapsed * 60) : 0;
    return '[' + tier().name + '] 投' + st.throws + '(' + perMin.toFixed(0) + '/分) 平均' + avgKills.toFixed(1) + '体'
      + ' 最大' + st.bestChain + ' 空' + st.dud
      + ' 溜' + avgCharge.toFixed(2) + 's 掴' + st.grabs + ' 突' + st.jabs + '→獲' + st.jabStaggers;
  }

  return { update, toggleMode, cycleDrift, toggleExpire, statsLine, driftMul, st };
}
