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
    // R23 らいこうだん（ビリッコの手渡し）
    handover: null, boltSpr: null, boltGlow: null, boltsGot: 0, boltHits: 0,
    // R24 ほのおだん（レア雑魚マグマンを掴んで投げた弾）
    blastHits: 0, heldRing: null, heldRing2: null, heldCore: null, heldMotes: null,
    // R25 格ごとの掴み回数・王冠・手の中の爆発。「自然なプレイで何回起きるか」を実プレイでも見る。
    gradeGrabs: [0, 0, 0, 0], crownGrabs: 0, handBooms: 0, fuseBeep: 0,
    // R29W2 つかめない獲物に手を出して弾かれた回数と、そのしびれの残り時間
    blocked: 0, blockT: -99, stunT: 0, bombHits: 0,
    // R33 ビリッコが配る弾が3種になった。スーパーボール（跳ね返り）とブラックホール（吸い込み）
    superHits: 0, bestBounce: 0, holeHits: 0, holeStaggers: 0, holes: [],
  };

  const B = () => BALANCE.hero.billiard;
  // R24: 主人公の攻撃力。自動強化のトップ項目とやしろがここを伸ばす。
  // ⚠️ これを掛けていなかったので、レベルが上がっても投げの威力は段位が変わる瞬間しか動かなかった
  //    （実プレイFB「なにもレベルアップしたことが感じられない」の実体）。
  const heroMul = () => (run.stats && run.stats.heroMult) || 1;
  // 現在の段位の添字（0起点）。checkTierUp が維持する。
  const tierIdx = () => (st.tierIdx == null ? 0 : st.tierIdx);
  // 'bolt'（らいこうだん）/ 'blast'（ほのおだん）/ 'bomb'（ばくだん）。設定名＝kind名で引く
  const SPEC = (kind) => (kind ? B()[kind] || null : null);
  // 弾の格（0=かるい 〜 3=ばくだん級）。held / 飛んでいる弾のどちらからも引ける。
  const GR = (g) => B().grades[Math.max(0, Math.min(B().grades.length - 1, g || 0))];
  // 現在の段位。レベルが上がるほど威力と派手さが同時に上がる。
  function tier() {
    const T = B().throwTiers;
    for (let i = 0; i < T.length; i++) if (run.level <= T[i].untilLevel) return T[i];
    return T[T.length - 1];
  }
  // 段が上がった瞬間を見せる。ここが「成長を感じる」の発火点。
  // R24: 実プレイFB「名称は勇ましいが、なにもレベルアップしたことが感じられない」。
  //   テロップ1行では流れて終わるので、**時間を落として**その瞬間を跨がせる（らいこうだんと同じ手）。
  //   加えて、新しい投げの音をその場で1回鳴らす＝「音が変わった」を耳で先に教える。
  function checkTierUp() {
    const T = B().throwTiers;
    let idx = T.length - 1;
    for (let i = 0; i < T.length; i++) if (run.level <= T[i].untilLevel) { idx = i; break; }
    if (st.tierIdx === undefined) { st.tierIdx = idx; return; }
    if (idx <= st.tierIdx) return;
    const prev = T[st.tierIdx];
    st.tierIdx = idx;
    const t = T[idx];
    if (run.fx && run.fx.announce) run.fx.announce('なげる が ' + t.name + ' に！', '#ffe9a8');
    // 何が強くなったかを数字で出す（言葉だけだと小6には「名前が変わっただけ」に見える）
    run.floatText(run.player.x, run.player.y - 46,
      'いりょく ×' + (t.dmgMul / prev.dmgMul).toFixed(2), '#ffd23f');
    Sound.sfx('weaponTier');
    Sound.sfx(t.sfx || 'throwLight', 1, t.pitch || 1);   // ★新しい投げの音を1回聴かせる
    run.slowMotion(0.55, 0.30);
    screenFlash(0.3, t.color);
    burstStreaks(run.player.x, run.player.y, t.streaks + 10, t.color, 130);
    zoomPunch(t.zoom * 2.2);
    shockRing(run.player.x, run.player.y, 120, t.color);
    for (let i = 0; i < 3; i++) {
      const rr = 60 + 55 * i;
      run.time.delayedCall(i * 70, () => shockRing(run.player.x, run.player.y, rr, i % 2 ? 0xffffff : t.color));
    }
  }
  // R32: どうくつのビッグ／ミニで届く距離が伸び縮みする（run.reachMul）。
  const grabReach = () => (B().grabReach + (run.playerStage - 1) * B().grabReachPerStage)
    * (run.reachMul ? run.reachMul() : 1);
  // R32 マシンガンアーム：溜めが要らなくなる＝掴んだ瞬間から最大威力。
  const machineOn = () => !!(run.hasBuff && run.hasBuff('machine'));
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
      // R24: レア雑魚（マグマン）を掴んだ弾は**炎の炸裂弾**になる。
      // 掴んだ敵の絵をそのまま持つので、赤い機体が手の中にあること自体が「特別な弾」の合図になる。
      // R29W2: 導火線が燃えているボンバを掴んだ弾は**ばくだん**になる。時間内に投げ切れば
      //   敵に当たった瞬間に爆発する（＝間に合わせたことへの報酬。従来は普通の弾だった）。
      spec: (e.def && BALANCE.rareEnemy && e.def.id === BALANCE.rareEnemy.enemyId) ? 'blast'
          : (e.throe && BALANCE.deathThroe.fuse && e.def
             && e.def.id === BALANCE.deathThroe.fuse.enemyId) ? (BALANCE.deathThroe.fuse.throwSpec || null)
          : null,
      // ★R25 弾の「おもさ（格）」。掴んだ相手で威力・炸裂範囲・運ぶ重さが変わる。
      //   実測で「掴んだ敵の強さは貫通HPにしか効かず、その69%が捨てられていた」と分かったので、
      //   報酬を飽和しない軸（威力・範囲・効果）へ移した本体がここ。
      grade: run.gradeIdx(e),
      crown: !!e.crown,
      // ボンバは掴んでも導火線が燃え続ける＝時限爆弾。持ちすぎると手の中で爆発する。
      fuse: (e.throe && BALANCE.deathThroe.fuse && e.def
             && e.def.id === BALANCE.deathThroe.fuse.enemyId) ? Math.max(0.35, e.atkT) : 0,
    };
    // ★R32 マシンガンアーム中は掴んだ瞬間に溜め切り扱い＝押した瞬間に最大威力で飛ぶ。
    //   「1発を大きく」ではなく「N発ならべる」側の報酬（快感は数えられること）。
    st.chargeT = machineOn() ? B().chargeMaxSec : 0;
    st.maxRung = machineOn();
    st.grabs++;
    st.gradeGrabs[st.held.grade] = (st.gradeGrabs[st.held.grade] || 0) + 1;
    if (st.held.crown) st.crownGrabs++;
    st.fuseBeep = 0;
    // 掴んだ敵は場から消える。報酬は「基本」＝手動で割った時の2倍は付かない。
    // 消滅=無報酬／掴み=基本／投げ撃破=満額+連鎖 という勾配で「投げた方が得」を作る。
    run.killEnemy(e, BALANCE.stagger.tint, 'grab');
    // 山は着弾に集中させる。掴みは乾いた装填音の小拍だけ（振幅ゼロ＝画面は揺らさない）。
    Sound.sfx('knuckle', 0.6, 1.2);      // ガシッと掴んだ手応え
    Sound.sfx('specialCharge');
    // ★格を言葉で出す。「重い弾を掴んだ」は絵だけでは伝わらない（弾は敵の絵のままなので）。
    const G0 = GR(st.held.grade);
    if (st.held.grade >= 2) {
      run.floatText(run.player.x, run.player.y - 40, G0.label + '！', '#ffd23f');
      Sound.sfx('metalSlam', 0.7, st.held.grade >= 3 ? 0.62 : 0.82);
      // ★R26 実プレイFB「重量のある弾を取得したという重みがそもそも感じられなかった」。
      //   実測すると弾を持っている時間は格に関係なく0.53秒しかない＝「持っている間」では伝わらない。
      //   山は掴んだ**瞬間**に置く：一瞬止めて、画面を揺らして、足元から波紋を出す。
      if (G0.grabFreeze > 0 && !run.cinematic) run.freezeT = Math.max(run.freezeT || 0, G0.grabFreeze);
      if (G0.grabShake > 0) run.shake(150, G0.grabShake);
      for (let g = 0; g < (G0.grabRing || 0); g++) {
        const rr = 52 + 34 * g;
        if (g === 0) shockRing(run.player.x, run.player.y + 6, rr, G0.color);
        else run.time.delayedCall(90, () => shockRing(run.player.x, run.player.y + 6, rr, 0xffffff));
      }
      run.spawnParticles(run.player.x, run.player.y + 8, G0.color, 10 + 8 * st.held.grade);
    }
    if (run.fx && run.fx.hitSpark) run.fx.hitSpark(e.x, e.y, BALANCE.stagger.tint);
  }

  // 掴んだ獲物は「手」に持たせる。振りかぶれば後ろへ、振れば前へ、手と一緒に動く。
  // ⚠️ 旧実装は常に狙いの方向の体の前(17〜24px)に置いていた。これだと振りかぶりが絵にならない。
  function showHeld(h, off, ratio) {
    const A = B().heldAura;
    if (!st.heldSpr) {
      st.heldSpr = run.add.image(0, 0, 'bullet').setDepth(14);
      // ⚠️ 旧実装は depth 8 ＝主人公より**下**だった。弾は頭の上にあるので体と重なる部分が
      //    そのまま隠れ、等倍では光っているのが分からなかった（差分計測で発覚）。
      st.heldGlow = run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(A.depth);
      st.heldCore = run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(A.depth);
    }
    // R23: 手の位置は角度＋距離ではなく**オフセット**で受け取る（頭上を通る弧を描くため）
    const x = run.player.x + off.x;
    const y = run.player.y + off.y - 2;
    // R23/R24: 特殊弾はそれぞれの色。ふつうの獲物は**段位の色**で包む
    // （実プレイFB本人の案「捕獲した敵が光に包まれて威力が増す。レベルアップのたびに派手に」）。
    const SP = SPEC(h.spec);
    const tint = SP ? SP.color : tier().color;
    st.heldSpr.setTexture(h.tex).setTint(SP ? SP.coreColor : 0xffffff).setVisible(true)
      .setScale(h.scale * (1 + 0.18 * ratio))
      .setRotation(run.elapsed * (5 + 16 * ratio))
      .setPosition(x, y);
    // 溜まるほど速く脈打つ＝「いつ離すか」が目で分かる
    const pulse = 0.55 + 0.45 * Math.sin(run.elapsed * (7 + 22 * ratio));
    // ⚠️ 4.2+3.4 だと溜め切りで直径76〜100pxになり、主人公の姿勢を光で塗りつぶしていた。
    //    ポーズが読めなくなるので、溜めが分かる範囲で絞る。
    // R24: 光の大きさは「段位」＋「レベル」で育つ。段位の谷間でも lvGlow のぶんは毎レベル伸びるので、
    //      レベルアップのたびに手の中の弾が少しずつ大きく光る＝伸びが目で分かる。
    const ti = tierIdx();
    const grow = SP ? 4.8 : (A.glowBase + A.glowPerTier * ti + A.lvGlow * (run.level || 1));
    const ar = A.baseRadius + h.radius * A.radiusShare;   // 光の基準は自分の強さ（掴んだ敵の大小ではない）
    const sz = ar * (grow + 2.4 * ratio);
    st.heldGlow.setVisible(true).setTint(tint)
      .setAlpha((SP ? 0.6 : A.glowAlpha + A.glowAlphaPerTier * ti) + 0.4 * ratio * pulse)
      .setDisplaySize(sz, sz).setPosition(x, y);
    // 白い芯＝「段位が上がる＝熱い」を色相に頼らず伝える。ここが無いと赤や桃の段位で暗くなる。
    const cs = ar * ((SP ? 2.6 : A.coreBase + A.corePerTier * ti) + 0.7 * ratio);
    st.heldCore.setVisible(true).setTint(SP ? 0xffffff : 0xffffff)
      .setAlpha((SP ? 0.55 : A.coreAlpha + A.coreAlphaPerTier * ti) * (0.7 + 0.3 * pulse))
      .setDisplaySize(cs, cs).setPosition(x, y);
  }

  // ★段位の光をまとわせる（実プレイFB「光に包まれて威力が増す／レベルアップのたびに派手に」）。
  // 段位が上がるほど「輪が回りはじめ → 2枚になり → 火花が散る」と要素そのものが増える。
  // 大きさだけ変えても気づかれないので、**種類を増やす**のが要点。
  function heldAura(off, ratio, dt, spec) {
    const A = B().heldAura, ti = tierIdx();
    const SP = SPEC(spec);
    const col = SP ? SP.color : tier().color;
    const x = run.player.x + off.x, y = run.player.y + off.y - 2;
    if (ti >= A.ringFromTier || SP) {
      if (!st.heldRing) {
        st.heldRing = run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(A.depth);
        st.heldRing2 = run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(A.depth);
      }
      // ⚠️ w_ring は 48px・太さ5px。scale 0.1 台だと直径9px・太さ0.5px＝等倍では線が消える。
      const base = A.ringBase + A.ringPerTier * ti + A.ringCharge * ratio + (SP ? 0.18 : 0);
      st.heldRing.setVisible(true).setTint(col)
        .setAlpha(A.ringAlpha + A.ringAlphaPerTier * ti + 0.25 * ratio)
        .setScale(base).setRotation(run.elapsed * (2.2 + 0.5 * ti)).setPosition(x, y);
      st.heldRing2.setVisible(ti >= A.ring2FromTier || !!SP).setTint(0xffffff)
        .setAlpha(0.25 + 0.35 * ratio).setScale(base * A.ring2Mul)
        .setRotation(-run.elapsed * (1.6 + 0.4 * ti)).setPosition(x, y);
    } else if (st.heldRing) {
      st.heldRing.setVisible(false); st.heldRing2.setVisible(false);
    }
    // 最上位帯だけ、光の粒が弾のまわりを回る（「まだ上がある」を見せるための最後の1要素）
    if (ti >= A.moteFromTier || SP) {
      if (!st.heldMotes) {
        st.heldMotes = [];
        for (let i = 0; i < A.motes; i++) {
          st.heldMotes.push(run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(A.depth));
        }
      }
      const rr = A.moteRadius * (0.75 + 0.35 * ratio);
      for (let i = 0; i < st.heldMotes.length; i++) {
        const a = run.elapsed * 3.4 + (i * Math.PI * 2) / st.heldMotes.length;
        const s = 7 + 4 * ratio;
        st.heldMotes[i].setVisible(true).setTint(SP ? col : 0xffffff).setAlpha(0.55 + 0.35 * ratio)
          .setDisplaySize(s, s).setPosition(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7);
      }
    } else if (st.heldMotes) {
      for (const m of st.heldMotes) m.setVisible(false);
    }
    if (ti < A.sparkFromTier && !SP) return;
    st.sparkT = (st.sparkT || 0) - dt;
    if (st.sparkT > 0) return;
    st.sparkT = A.sparkEverySec / (1 + 0.18 * ti);   // 上の段位ほど散る間隔が詰まる
    const a = run.rng.range(0, Math.PI * 2);
    const r = run.rng.range(A.sparkRange * 0.5, A.sparkRange) * (0.6 + 0.6 * ratio);
    if (spec === 'blast' || spec === 'bomb') emberBurst(x, y, 2, 20);   // 炎／導火線の火花
    else lightning(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, col,
      { seg: 3, jitter: 5, width: 2, lifeMs: 120 });
  }

  // 手の中で爆発する。弾を失い、自分も巻き込まれる（避ける手段は「早く投げる」だけ）。
  function blowUpInHand() {
    const F = BALANCE.deathThroe.fuse;
    const px = run.player.x, py = run.player.y;
    st.held = null; st.chargeT = 0; st.maxRung = false;
    st.handBooms++;
    hideHeld();
    if (run.fx && run.fx.explosion) run.fx.explosion(px, py, F.heldRadius, 0xff8a1f);
    emberBurst(px, py, 18, 360);
    shockRing(px, py, F.heldRadius, 0xff8a1f);
    screenFlash(0.22, 0xff8a1f);
    run.shake(300, 12);
    Sound.sfx('bigBoom', 0.9);
    run.hitPlayer(F.heldDamage, px, py - 20);
    run.floatText(px, py - 46, 'てのなかで ばくはつ！', '#ff8a3d');
  }

  function hideHeld() {
    if (st.heldSpr) { st.heldSpr.setVisible(false); st.heldGlow.setVisible(false); }
    if (st.heldCore) st.heldCore.setVisible(false);
    if (st.heldRing) { st.heldRing.setVisible(false); st.heldRing2.setVisible(false); }
    if (st.heldMotes) for (const m of st.heldMotes) m.setVisible(false);
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
  // ★R28 ms を足した。200ms固定だと「一瞬光って終わり」で、等倍で見ると光った実感が残らない。
  //   大きな着弾だけ長く（400ms前後）残す。
  function screenFlash(alpha, color, ms) {
    // ★情報レベル1以上：弱い閃光だけを捨てる。実測で全画面フラッシュは1ランに約91回＝
    //   飛行中の明滅(0.04〜0.08)・手渡し(0.32)・投げの弱い明滅が数の大半で、
    //   これが「画面が忙しい」の正体だった。溜め切り(0.45)や特殊弾の締めなど**滅多に出ない大技**は
    //   閾値0.35の上に残る＝派手さの山は削らずに、地面のノイズだけを下げる。
    if (run.infoLevel >= 1 && alpha < 0.35) return;
    const V = BALANCE.view;
    const f = run.add.image(V.width / 2, V.height / 2, 'white').setScrollFactor(0)
      .setBlendMode(ADD).setDepth(60).setTint(color).setAlpha(alpha)
      .setDisplaySize(V.width, V.height);
    run.tweens.add({ targets: f, alpha: 0, duration: ms || 200, onComplete: () => f.destroy() });
  }

  // ---- 稲妻 ----
  // 2点をギザギザの折れ線で結ぶ。白い1x1画像を短い棒として並べるだけなので、
  // テクスチャを1枚も足さずに「迸る」線が引ける（ドット絵の見た目とも喧嘩しない）。
  function lightning(x0, y0, x1, y1, color, opt) {
    const o = opt || {};
    const seg = o.seg || 6, jit = o.jitter == null ? 9 : o.jitter;
    const life = o.lifeMs || 170, w = o.width || 3;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;   // 進行方向と直角＝ここへ振ると「折れた」線になる
    let px = x0, py = y0;
    for (let i = 1; i <= seg; i++) {
      const t = i / seg;
      const off = i === seg ? 0 : run.rng.range(-jit, jit);   // 終点は必ず狙った所へ着く
      const qx = x0 + dx * t + nx * off, qy = y0 + dy * t + ny * off;
      const a = Math.atan2(qy - py, qx - px), r = Math.hypot(qx - px, qy - py);
      const g = run.add.image(px, py, 'white').setOrigin(0, 0.5).setBlendMode(ADD).setDepth(15)
        .setRotation(a).setDisplaySize(Math.max(1, r), w).setTint(color).setAlpha(1);
      run.tweens.add({ targets: g, alpha: 0, duration: life, onComplete: () => g.destroy() });
      px = qx; py = qy;
    }
  }

  // ---- 炎（R24）----
  // 稲妻が「直線のギザギザ」なのに対して、炎は**膨らみながら上へ流れる**。
  // 同じ helper で両方を描くと見分けが付かなくなるので、意図的に別の動きにしている。
  function emberBurst(x, y, n, spread) {
    const L = B().blast;
    for (let i = 0; i < n; i++) {
      const a = run.rng.range(0, Math.PI * 2);
      const d = run.rng.range(spread * 0.35, spread);
      const sz = run.rng.range(4, 11);
      const g = run.add.image(x, y, 'glow').setBlendMode(ADD).setDepth(14)
        .setTint(i % 3 === 0 ? L.coreColor : L.color).setDisplaySize(sz, sz).setAlpha(0.95);
      run.tweens.add({
        targets: g, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - run.rng.range(6, 26),
        alpha: 0, displayWidth: sz * 0.3, displayHeight: sz * 0.3,
        duration: run.rng.range(260, 520), ease: 'Cubic.out', onComplete: () => g.destroy(),
      });
    }
  }

  // 立ち上る火柱。らいこうだんの「天から落ちる柱」と上下が逆＝一目で別物と分かる。
  function firePillar(x, y, mul) {
    const L = B().blast;
    const m = mul || 1;
    for (let i = 0; i < 3; i++) {
      const w = (30 - i * 8) * m;
      const g = run.add.image(x, y + 8, 'glow').setBlendMode(ADD).setDepth(15)
        .setTint(i === 0 ? L.color : L.coreColor).setOrigin(0.5, 1)
        .setDisplaySize(w, 10).setAlpha(0.9);
      run.tweens.add({ targets: g, displayHeight: (130 - i * 28) * m, displayWidth: w * 1.7, alpha: 0,
        duration: (420 + i * 90) * (0.8 + 0.35 * m), ease: 'Cubic.out', onComplete: () => g.destroy() });
    }
  }

  // ---- らいこうだん（R23）----
  // 実プレイFB「特殊弾を生成してくれるモビットもいれて。そのモビットから特殊弾を手渡しされる際は
  //   スローモーションでゆっくりと。特殊な弾をわたされたことをプレイヤーが意識できるように。
  //   その弾のエフェクトはド派手に。威力も破壊的にして。イナズマが迸る雷光弾。
  //   ボス戦でのみ。1ボスに対して1弾。マオウレクス戦では2弾」。
  //
  // ★操作は1つも増えない。手の中身が雷光弾に変わるだけで、狙って離す動作は普段の投げと同じ。
  //   増えるのは「今これを持っている」という緊張だけ＝新しい語彙を子どもに覚えさせない。
  // ★渡すタイミングを決めるのは orbit.js（ビリッコ本体）。ここは渡す演出と弾の中身を持つ。
  // ★R33 手渡しの弾は3種になった。手渡しの尺（スロー・稲妻）は らいこうだん の設定を
  //   共通の「手渡し演出」として使い回す（種類ごとに違う渡され方を覚えさせない）。
  //   変わるのは色と名前と、受け取ったあとの弾の中身だけ。
  const BOLT = () => B().bolt;
  const HANDED_NAME = { bolt: 'らいこうだん', superball: 'スーパーボールだん', blackhole: 'ブラックホールだん' };

  // ★R34 特殊弾のボス特効に掛かる、ボス個別の倍率。boss.js が spawn 時に entity へ載せる。
  //   らいこうだん30%は通常ボス（HP1800〜8000・戦闘30〜60秒）に合わせた値で、3段構えの
  //   マオウレクス（HP90000・分離/再合体）に素で掛けると**1発で1段が消える**。最終ボスだけ薄める。
  const bossSpecialMul = (e) => (e && e.specialMul) || 1;

  function canReceiveAmmo() {
    return st.mode === 1 && !st.held && !st.wind && !st.handover
      && !!run.player && !run.ended && !run.cinematic && !run.paused;
  }

  function giveAmmo(o, kind) {
    const k = SPEC(kind) ? kind : 'bolt';
    const L = BOLT(), S = SPEC(k);
    st.handover = { o, t: 0, arcT: 0, kind: k };
    // ★時間を落とす。ここが「渡されたことを意識させる」唯一の仕掛け。
    //   数字やアイコンで説明せず、世界が止まりかけることで「何か起きた」を体に入れる。
    run.slowMotion(L.slowSec, L.slowMul);
    Sound.sfx('boltCharge');
    // ★R49 名前は**渡してきた本人**から取る。「ビリッコ」で固定していたので、進化して
    //   ライジンガーになっても画面には「ビリッコ」と出ていた＝進化した実感を打ち消していた。
    const who = (o && o.def)
      ? ((o.evolved && o.def.evo) ? o.def.evo.name : o.def.name)
      : 'ビリッコ';
    if (run.fx && run.fx.announce) {
      run.fx.announce(who + ' が ' + (HANDED_NAME[k] || 'とくべつな たま') + ' を つくった！', S.color);
    }
    screenFlash(0.32, S.color);
  }

  function cancelHandover() {
    st.handover = null;
    if (st.boltSpr) { st.boltSpr.setVisible(false); st.boltGlow.setVisible(false); }
  }

  // dtReal＝スローで縮める前の実時間。縮めたdtで数えると、遅くしたぶん手渡しが延びて終わらない。
  function updateHandover(dtReal) {
    const L = BOLT(), H = st.handover;
    const S = SPEC(H.kind) || L;      // 色と大きさは受け取る弾のもの、尺は共通
    H.t += dtReal;
    const k = Math.min(1, H.t / L.handoverSec);
    const px = run.player.x, py = run.player.y - 4;
    const o = H.o;
    const ox = o && o.x != null ? o.x : px, oy = o && o.y != null ? o.y : py;
    const ease = k * k * (3 - 2 * k);
    const bx = ox + (px - ox) * ease;
    const by = oy + (py - oy) * ease - Math.sin(k * Math.PI) * 16;   // 山なりに渡す
    if (!st.boltSpr) {
      st.boltSpr = run.add.image(0, 0, 'bullet').setBlendMode(ADD).setDepth(16);
      st.boltGlow = run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(15);
    }
    st.boltSpr.setVisible(true).setTint(S.coreColor).setScale(S.scale * (0.35 + 0.75 * k))
      .setRotation(run.elapsed * 16).setPosition(bx, by);
    const sz = S.radius * (3.4 + 4.2 * k);
    st.boltGlow.setVisible(true).setTint(S.color).setAlpha(0.5 + 0.45 * k)
      .setDisplaySize(sz, sz).setPosition(bx, by);
    // 迸る稲妻。モビット→弾／弾→主人公の両方へ走らせる＝「渡している」線がはっきり出る
    H.arcT -= dtReal;
    if (H.arcT <= 0) {
      H.arcT = L.arcEverySec;
      lightning(ox, oy, bx, by, S.color, { seg: 5, jitter: 8, width: 3 });
      lightning(bx, by, px, py, S.coreColor, { seg: 6, jitter: 10, width: 2 });
      for (let i = 0; i < 2; i++) {
        const a = run.rng.range(0, Math.PI * 2), r = 24 + 20 * k;
        lightning(bx, by, bx + Math.cos(a) * r, by + Math.sin(a) * r, S.color,
          { seg: 3, jitter: 7, width: 2, lifeMs: 140 });
      }
      run.spawnParticles(bx, by, S.color, 3);
    }
    if (k < 1) return;

    // 受け取り。溜めは済んだ状態で手に収まる＝あとは狙って離すだけ。
    const kind = H.kind || 'bolt';
    cancelHandover();
    st.held = { maxHp: 1, color: S.color, tex: 'bullet', scale: S.scale, radius: S.radius,
                shard: false, spec: kind, handed: true };
    st.chargeT = B().chargeMaxSec;
    st.maxRung = true;
    st.boltsGot++;
    screenFlash(0.45, S.color);
    run.shake(200, 9);
    zoomPunch(0.05);
    shockRing(px, py, 74, S.color);
    burstStreaks(px, py, 18, S.color, 76);
    Sound.sfx('gaugeFull');
    Sound.sfx(kind === 'bolt' ? 'thunder' : kind === 'superball' ? 'superGet' : 'holeGet');
    // ⚠️ ここでテロップをもう1本出すと、受け取りの瞬間に3行が縦に積まれて全部読めなくなる
    //    （等倍スクショで確認）。指示は主人公の頭上の1行だけにする。
    run.floatText(px, py - 40, 'なげろ！', '#' + S.color.toString(16).padStart(6, '0'));
  }

  // 着弾点から周囲の敵へ広がる二次被害。らいこうだん＝連鎖雷／ほのおだん＝延焼。
  // どちらもよろけ（＝弾薬）は巻き込まない（自分の弾を自分で消さない）。
  function specialChain(x, y, skip, kind) {
    const L = SPEC(kind);
    if (!L) return 0;
    // ★R33 連鎖を持たない弾（スーパーボール＝跳ね返りが本体／ブラックホール＝吸い込みが本体）。
    //   ここを素通りさせると chainCount/chainDamage が undefined のまま全員に NaN ダメージが入る。
    if (typeof L.chainCount !== 'number' || typeof L.chainDamage !== 'number') return 0;
    let n = 0;
    for (const e of run.enemies) {
      if (n >= L.chainCount) break;
      if (!e.active || e === skip || e.isBoss || e.stag) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy > L.chainRange * L.chainRange) continue;
      n++;
      if (kind === 'bolt') {
        lightning(x, y, e.x, e.y, n % 2 ? L.color : L.coreColor,
          { seg: 7, jitter: 14, width: 3, lifeMs: 240 });
      } else {
        emberBurst(e.x, e.y, 4, 22);
      }
      run.dealDamage(e, L.chainDamage, L.color, 'manual');
      run.spawnParticles(e.x, e.y, L.color, 6);
    }
    if (n > 0) Sound.sfx('rush', 0.5);
    return n;
  }

  // ★R25 格の炸裂。着弾点の半径 rr にいる**健常な敵も**まとめて倒す。
  //   実測が指した核心：雑魚は威力を上げなくても1発で死ぬし、貫通は場の敵数で頭打ち（未使用72%）。
  //   ＝ 重い弾の価値は「1体を強く叩く」ではなく「面をまとめて消す」でしか作れない。
  function gradeBurst(x, y, skip, G, T) {
    const rr = G.burstAll;
    if (!rr) return 0;
    let n = 0;
    const dmg = Math.round(B().damage * T.dmgMul * heroMul() * G.dmgMul);
    // ⚠️ 上限は2つの意味がある：(1) 振幅を頭打ちにする (2) dealDamage が分裂で敵を増やしても
    //    走査が発散しない（run.enemies を回している最中に push され得る）。
    const cap = G.burstMax || 12;
    for (const e of run.enemies) {
      if (n >= cap) break;
      if (!e.active || e === skip || e.isBoss) continue;
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy > rr * rr) continue;
      n++;
      run.dealDamage(e, dmg, G.color, 'manual');
      run.spawnParticles(e.x, e.y, G.color, 5);
    }
    shockRing(x, y, rr, G.color);
    shockRing(x, y, rr * 0.62, 0xffffff);
    burstStreaks(x, y, 10 + 6 * n, G.color, rr);
    Sound.sfx('bigBoom', G.burstAll >= 150 ? 0.75 : 0.5, G.burstAll >= 150 ? 0.85 : 1.05);
    return n;
  }

  // ---- 投げる ----
  // ★弾を生む。px/py は **手の座標**（投球モーションの release 時点）であって体の中心ではない。
  //   実プレイFB「主人公の身体から弾が飛び出しているようにしか見えない」の直接の原因がここだった。
  function launchShot(ang, ratio, h, px, py) {
    const b = B();
    // ★R32 こうしえんの すな。ここで1回ぶん消費して、この弾にだけ「渾身」の印を付ける。
    //   ⚠️ 溜め量に関係なく必ず最大（ratio=1）にする。レアの価値を溜め操作の成否に賭けさせない。
    const suna = run.sunaShots > 0;
    if (suna) {
      run.sunaShots--;
      ratio = 1;
      if (run.fx && run.fx.announce) run.fx.announce('こんしんの いっとう！！', '#ffe6a8');
      Sound.sfx('sunaThrow');
      run.shake(240, 8);
      run.slowMotion(0.32, 0.34);   // 投げた瞬間だけ世界が遅くなる＝「ここぞ」が体に伝わる
    }
    let speed = b.speedMin + (b.speedMax - b.speedMin) * ratio;
    // 溜めは速度と貫通HPの両方を買う（速度だけだと最小溜め連打が支配戦略になる）
    // ⚠️ 下限つき。掴んだ敵のHPだけだとチビット(4)を掴んだ時に4体で砕け、
    //    「一番よく掴む相手が一番弱い弾」という逆の関係になる（実プレイFB「弱すぎる」の原因）。
    const T = tier();
    const kind = h.spec || null;         // 'bolt'（らいこうだん）/ 'blast'（ほのおだん）/ null
    const L = SPEC(kind);
    const SU = BALANCE.cave.buffs.suna;
    const hp = (L ? L.pierceHp
                  : Math.max(b.minHp, h.maxHp) + Math.round(b.chargeHpBonus * ratio) + T.hpBonus)
             + (suna ? SU.pierceHpAdd : 0);   // 渾身の一投は群れを端まで貫く

    const disp = st.pool.pop() || {
      spr: run.add.image(0, 0, 'bullet').setDepth(13),
      glow: run.add.image(0, 0, 'glow').setBlendMode(ADD).setDepth(7),
      ring: run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(12),
    };
    if (!disp.ring) disp.ring = run.add.image(0, 0, 'w_ring').setBlendMode(ADD).setDepth(12);
    // 段が上がるほど弾そのものが大きく派手になる（実プレイFB「地味で攻撃している実感がない」）
    // ★特殊弾（らいこうだん／ほのおだん）は段位を無視して常に最大級の見た目。
    // ばくだんはボンバ本体（半径7）が弾になるので、そのままだと普通の弾より小さくなる。
    // 「当たると爆発する」弾が一番細いのは噛み合わないので、絵と判定を一回り太らせる。
    const ballScale = kind === 'bomb' ? h.scale * 1.25
                    : L ? h.scale : h.scale * T.ballMul * GR(h.grade).ballMul;
    const shotColor = L ? L.color : T.color;
    if (L) speed = b.speedMax * L.speedMul;
    disp.spr.setTexture(h.tex).setTint(L && kind === 'bolt' ? L.coreColor : 0xffffff).setVisible(true)
      .setScale(ballScale).setRotation(0).setPosition(px, py);
    disp.glow.setVisible(true).setTint(shotColor).setAlpha(0.95)
      .setDisplaySize(h.radius * (L ? 9 : (7 + 4 * ratio) * T.ballMul * 0.6),
                      h.radius * (L ? 6 : 4 * T.ballMul * 0.6))
      .setRotation(ang).setPosition(px, py);
    // まとわりつく輪。飛んでいる間ずっと回るので「ただの点」に見えなくなる（実プレイFB「まだ地味」）
    disp.ring.setVisible(true).setTint(shotColor).setAlpha(L ? 1 : 0.75)
      .setScale(h.radius * (L ? 0.14 : T.ballMul * 0.055)).setPosition(px, py);

    st.shots.push({
      active: true, x: px, y: py,
      vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      hp, color: h.color,
      radius: kind === 'bomb' ? Math.max(b.hitRadius, h.radius) * 1.5
            : L ? h.radius * 1.4
                : Math.max(b.hitRadius, h.radius) * (0.85 + 0.25 * T.ballMul * 0.6),
      // ★R33 スーパーボールだけは跳ね返るぶん長く生きる（設定に lifeSec があればそちらが勝つ）
      life: (L && L.lifeSec) || b.lifeSec,
      hit: new Set(), kills: 0, chain: 0, tier: T, shard: !!h.shard, spec: kind,
      grade: h.grade || 0, crown: !!h.crown, suna,
      hero: heroMul(),   // 投げた時点の攻撃力で固定する（飛んでいる間に強化が入っても揺れない）
      spin: 7 + 20 * ratio, spr: disp.spr, glow: disp.glow, ring: disp.ring,
    });
    if (suna) {
      // 見た目でも「これは別の弾だ」と分かるようにする（数字だけ強い弾は強く見えない）
      const s = st.shots[st.shots.length - 1];
      s.radius *= 1.5;
      disp.spr.setScale(ballScale * 1.7).setTint(SU.tint);
      disp.glow.setTint(SU.tint).setAlpha(1)
        .setDisplaySize(h.radius * 16, h.radius * 9).setRotation(ang);
      disp.ring.setTint(SU.tint).setAlpha(1).setScale(h.radius * 0.13);
    }

    st.throws++;
    st.chargeSum += ratio * b.chargeMaxSec;
    hideHeld();
    // ★投げの音は**段位ごとに別物**にする（実プレイFB「投げたときの効果音…レベルアップが感じられない」）。
    //   音量を上げるのではなく中身を替える：軽い→低音の芯が入る→サブベース＋和音の余韻。
    Sound.sfx(T.sfx || 'throwLight', 0.6 + 0.4 * ratio, (T.pitch || 1) * (0.94 + 0.12 * ratio));
    Sound.sfx('heroPunch', ratio * 0.7, 1 + 0.25 * ratio);
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
    if (kind === 'bomb') {
      // ★ばくだんはボンバを掴むたびに起きる＝頻度が高い。投げ出しでは画面を光らせない
      //   （振幅は頻度と逆相関。ここで毎回フラッシュすると擦り切れて「特別」が消える）。
      shockRing(px, py, 64, L.color);
      burstStreaks(px, py, 10, L.coreColor, 60);
      emberBurst(px, py, 8, 34);
      Sound.sfx('tick', 0.9, 1.9);
      run.floatText(px, py - 26, 'まにあった！', '#ffd23f');
    } else if (L) {
      // 特殊弾は投げ出しの瞬間から本気で出す（1回が稀なので遠慮しない）
      screenFlash(0.4, L.color);
      run.shake(220, 10);
      shockRing(px, py, 90, L.color);
      burstStreaks(px, py, 18, L.color, 90);
      if (kind === 'bolt') {
        Sound.sfx('thunder', 0.75);
        for (let i = 0; i < 7; i++) {
          const a = ang + run.rng.range(-1.4, 1.4);
          lightning(px, py, px + Math.cos(a) * run.rng.range(50, 95),
            py + Math.sin(a) * run.rng.range(50, 95), i % 2 ? L.coreColor : L.color,
            { seg: 5, jitter: 14, width: i === 0 ? 5 : 3, lifeMs: 220 });
        }
        screenFlash(0.28, 0xffffff);
      } else {
        Sound.sfx('fireBlast', 0.7);
        emberBurst(px, py, 26, 60);
        firePillar(px, py);
      }
    }
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

  // ---- 特殊弾の着弾（ボス）----
  // らいこうだん：最大HPの30%・**縦の一撃**（天から落ちる柱）
  // ほのおだん  ：最大HPの12%・**面を焼く**（立ち上る火柱＋延焼）
  // ボスのHPは1800〜28000と幅があるので固定値ではなく**比率**で置く＝
  // どのボスでも必ず「ゲージが決まった割合だけ吹き飛ぶ」絵になる（外れの当たりを作らない）。
  function specialImpact(s, e, dealt) {
    const kind = s.spec, L = SPEC(kind);
    s.hp = 0;
    s.noChain = true;   // 装甲片を自分の炸裂で消さない（bossImpact と同じ理由）
    s.x = e.x + (s.x - e.x) * 0.3;
    s.y = e.y + (s.y - e.y) * 0.3;
    if (run.boss && run.boss.bossHitReact) run.boss.bossHitReact(Math.atan2(s.vy, s.vx), 0.32);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT, L.freezeSec);
    // 止めたあとに少し引き伸ばす＝「効いた」余韻。freezeT が明けてから slowT が減り始める。
    run.slowMotion(kind === 'bolt' ? 0.5 : 0.32, kind === 'bolt' ? 0.32 : 0.45);
    run.shake(L.shakeMs, L.shakeAmp);
    zoomPunch(L.zoom * 3);
    screenFlash(L.flash, L.color);
    if (kind === 'bolt') {
      // 天から落ちる本柱。画面の上端の外から引くので「落雷」に読める
      const nb = L.hitBolts || 3;
      for (let i = 0; i < nb; i++) {
        const wide = i === 0 ? 9 : i < 3 ? 5 : 3;
        run.time.delayedCall(i * 26, () => lightning(
          e.x + run.rng.range(-46, 46), e.y - 280, e.x + run.rng.range(-10, 10), e.y,
          i === 0 ? L.coreColor : L.color,
          { seg: 13, jitter: 24, width: wide, lifeMs: 480 }));
      }
      // ★R28 放射状の枝。落ちたあとに地面を這って広がる＝「一撃」が「範囲」に見える
      for (let i = 0; i < (L.hitBranches || 8); i++) {
        const a = (i / (L.hitBranches || 8)) * Math.PI * 2 + run.rng.range(-0.2, 0.2);
        const d = run.rng.range(90, 190);
        run.time.delayedCall(60 + i * 14, () => lightning(
          e.x, e.y, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, L.color,
          { seg: 7, jitter: 18, width: 3, lifeMs: 380 }));
      }
      // 画面を横切る線。ここだけ「画面の外から外へ」引くので規模が別物に見える。
      // ⚠️ カメラは主人公を追うので、BALANCE.view の座標ではなく **いま映っている範囲**で引く。
      // ★等倍のスクショで見ると1本・220msでは「一瞬」で終わっていたので、3本を時間差で重ねる。
      for (let i = 0; i < 3; i++) {
        run.time.delayedCall(i * 130, () => {
          const wv = run.cameras.main.worldView;
          lightning(wv.x - 20, e.y + run.rng.range(-60, 60), wv.right + 20, e.y + run.rng.range(-60, 60),
            i % 2 ? L.color : L.coreColor, { seg: 16, jitter: 30, width: 5 - i, lifeMs: 420 });
        });
      }
      // 白 → 金 の2段フラッシュ。本物の雷は一度光ってから空が明るくなる
      screenFlash(0.5, 0xffffff, 260);
      run.time.delayedCall(90, () => screenFlash(0.34, L.color, 460));
      Sound.sfx('thunder', 1);
      Sound.sfx('bigBoom', 1);
      run.time.delayedCall(150, () => Sound.sfx('thunder', 0.55));   // 遅れて届く2発目の雷鳴
    } else {
      // ★R28 火柱を並べて立てる＝1本の柱ではなく「火の壁」になる
      const np = L.hitPillars || 3;
      for (let i = 0; i < np; i++) {
        const ox = (i - (np - 1) / 2) * 42;
        run.time.delayedCall(i * 40,
          () => firePillar(e.x + ox, e.y + run.rng.range(-6, 6), i === Math.floor(np / 2) ? 2.1 : 1.5));
      }
      // 放射状に噴き出す火炎。稲妻とは違い「太く短く」＝別の語彙にする
      for (let i = 0; i < (L.hitJets || 8); i++) {
        const a = (i / (L.hitJets || 8)) * Math.PI * 2 + run.rng.range(-0.15, 0.15);
        const d = run.rng.range(70, 130);
        run.time.delayedCall(30 + i * 16, () => {
          lightning(e.x, e.y, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d,
            i % 2 ? L.coreColor : L.color, { seg: 3, jitter: 10, width: 9, lifeMs: 420 });
          emberBurst(e.x + Math.cos(a) * d * 0.7, e.y + Math.sin(a) * d * 0.7, 4, 30);
        });
      }
      emberBurst(s.x, s.y, 48, 110);
      run.time.delayedCall(180, () => emberBurst(s.x, s.y, 26, 150));
      // ★らいこうだんの「画面を横切る稲妻」に相当する、規模を見せる層。
      //   炎は線ではなく **広がる輪** で規模を出す（語彙を分ける）。
      for (let i = 0; i < 3; i++) {
        run.time.delayedCall(i * 90, () => shockRing(e.x, e.y, 120 + i * 90, i % 2 ? L.coreColor : L.color));
      }
      screenFlash(0.42, 0xffd24a, 260);
      run.time.delayedCall(110, () => screenFlash(0.30, L.color, 460));
      Sound.sfx('fireBlast', 1);
      Sound.sfx('bigBoom', 0.9);
      run.time.delayedCall(220, () => Sound.sfx('fireBlast', 0.4));  // まだ燃えている
    }
    for (let i = 0; i < L.rings; i++) {
      const rr = 70 + 46 * i;
      run.time.delayedCall(i * 60, () => shockRing(s.x, s.y, rr, i % 2 ? 0xffffff : L.color));
    }
    burstStreaks(s.x, s.y, L.streaks, L.color, 120);
    run.spawnParticles(s.x, s.y, L.color, 40);
    run.floatText(e.x, e.y - e.radius - 6, String(dealt), kind === 'bolt' ? '#ffe14d' : '#ff8a3d');
    run.floatText(e.x, e.y - e.radius - 26,
      kind === 'bolt' ? 'らいこうだん!!' : kind === 'bomb' ? 'ばくだん!!' : 'ほのおだん!!', '#ffffff');
    specialChain(s.x, s.y, e, kind);
    if (kind === 'bolt') st.boltHits++; else st.blastHits++;
  }

  // ★R29W2 ばくだん。触れた最初の1体で爆発して終わる（らいこうだん／ほのおだんは貫通し続ける）。
  //   ここが「爆弾らしさ」の中心：飛び続けないから、**どこで当てるか**を選ぶ弾になる。
  function bombHit(s, e) {
    const L = SPEC('bomb');
    const x = s.x, y = s.y;
    s.noChain = 1;          // burstEnd で二重に爆発させない（爆発はこの1回だけ）
    st.bombHits = (st.bombHits || 0) + 1;
    if (e.isBoss) {
      breakBoss(e);
      let dmg = Math.max(1, Math.round((e.maxHp || 1) * L.bossHpRatio * bossSpecialMul(e)));
      if (run.boss && run.boss.staggered) {
        dmg = Math.max(1, Math.round(dmg / BALANCE.hero.strike.bossBreakMul));
      }
      const hpBefore = e.hp;
      // 命中座標＝マオウレクスの弱点コア判定。R31: hitR で判定円を当たり判定とそろえる
      run.dealDamage(e, dmg, L.color, 'manual', { x, y, hitR: s.radius });
      specialImpact(s, e, Math.max(0, hpBefore - e.hp));
      s.hp = 0;
      return;
    }
    // よろけている獲物は連鎖炸裂、健常な敵は面でまとめて倒す（＝「ダメージ大」の実体）
    const r = run.burstStagger(x, y, B().burstRadius * (L.radiusMul || 2.2), B().burstMaxChain);
    s.kills += r.total;
    s.chain = Math.max(s.chain, r.chain);
    s.kills += gradeBurst(x, y, null,
      { burstAll: L.blastRadius, burstMax: L.blastMax, dmgMul: L.blastDmgMul, color: L.color },
      s.tier || tier());
    for (let i = 0; i < (L.rings || 3); i++) {
      const rr = 60 + 42 * i;
      run.time.delayedCall(i * 55, () => shockRing(x, y, rr, i % 2 ? 0xffffff : L.color));
    }
    burstStreaks(x, y, L.streaks, L.color, 120);
    emberBurst(x, y, 14, 56);
    for (let i = 0; i < (L.hitPillars || 3); i++) {
      firePillar(x + run.rng.range(-34, 34), y + run.rng.range(-20, 20));
    }
    run.spawnParticles(x, y, L.color, 30);
    screenFlash(L.flash, L.color);
    run.shake(L.shakeMs, L.shakeAmp);
    zoomPunch(L.zoom);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, L.freezeSec);
    // ⚠️ 爆発音は gradeBurst が既に bigBoom を鳴らしている。ここで重ねると濁って1発に聞こえない
    Sound.sfx('fireBlast', 0.55);
    run.floatText(x, y - 30, 'ばくだん！！', '#ffd23f');
    s.hp = 0;               // 爆弾は貫通しない。ここで飛行を終える
  }

  // ---- ★R33 スーパーボールだん。敵から敵へ跳ね返り続ける「数える」弾 ----
  // 快感は振幅ではなく数えられること。1発を大きくするのではなく、跳ね返りを積み上げる。
  // ⚠️ 一度当てた相手は s.hit に入るので二度は狙わない＝同じ敵で無限に跳ねる事故が起きない。
  function nextBounceTarget(s, range) {
    // ★R50 跳ね先は**画面内の敵だけ**。画面外の敵を追うと弾ごと画面外へ消えて、
    //   「跳ねている」がプレイヤーから見えなくなる（縁の反射とセットの制約）。
    const cam = run.cameras.main.worldView;
    let best = null, bd = range * range;
    for (const e of run.enemies) {
      if (!e.active || s.hit.has(e.id)) continue;
      if (e.x < cam.x - 10 || e.x > cam.right + 10 ||
          e.y < cam.y - 10 || e.y > cam.bottom + 10) continue;
      const dx = e.x - s.x, dy = e.y - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  function superballHit(s, e) {
    const L = SPEC('superball');
    s.bounced = (s.bounced || 0) + 1;
    const mul = 1 + (L.bounceDmgAdd || 0) * (s.bounced - 1);   // 跳ねるほど重くなる
    if (e.stag) {
      const r = run.burstStagger(e.x, e.y, B().burstRadius * 1.4, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    } else if (e.isBoss) {
      breakBoss(e);
      let dmg = Math.max(1, Math.round((e.maxHp || 1) * L.bossHpRatio * mul * bossSpecialMul(e)));
      if (run.boss && run.boss.staggered) {
        dmg = Math.max(1, Math.round(dmg / BALANCE.hero.strike.bossBreakMul));
      }
      const hpBefore = e.hp;
      run.dealDamage(e, dmg, L.color, 'manual', { x: s.x, y: s.y, hitR: s.radius });
      run.floatText(e.x, e.y - e.radius - 6, String(Math.max(0, hpBefore - e.hp)), '#4dff9e');
    } else {
      const alive = e.active;
      run.dealDamage(e, L.trashDamage, L.color, 'manual');
      if (alive && !e.active) s.kills++;
    }
    // 1回ぶんの手応えは小さく、刻みでカウンタを大きく出す（＝数えられる形にする）
    Sound.sfx(L.bounceSfx || 'counter', 0.55, Math.min(2.4, 1 + 0.07 * s.bounced));
    run.spawnHitMark(s.x, s.y, L.color);
    shockRing(s.x, s.y, 36, s.bounced % 2 ? L.coreColor : L.color);
    st.superHits++;
    st.bestBounce = Math.max(st.bestBounce, s.bounced);
    if (s.bounced % (L.comboEvery || 3) === 0) {
      run.floatText(s.x, s.y - 26, s.bounced + ' れんぞく！', '#4dff9e');
      zoomPunch(0.018);
      run.shake(90, 5);
    }
    if (s.bounced >= (L.bounces || 12)) { s.hp = 0; return; }
    let t = nextBounceTarget(s, L.bounceRange || 300);
    // ★まだ跳ね返り回数が残っているのに「初めての相手」が居ないときは、一度だけ相手を
    //   リセットしてもう一周する（本物のスーパーボールと同じで、同じ壁に何度でも当たる）。
    //   実測：これが無いと35体いる群れでも4回で止まり、14回まで数える設計が働かなかった。
    if (!t && s.hit.size >= 1) {
      s.hit.clear();
      s.hit.add(e.id);     // いま当てた相手だけは除く（重なったまま同じ敵を連打しない）
      t = nextBounceTarget(s, L.bounceRange || 300);
    }
    if (!t) { s.hp = 0; return; }        // 跳ね先が無くなったら締めの一発で終わる
    const ang = Math.atan2(t.y - s.y, t.x - s.x);
    const sp = Math.hypot(s.vx, s.vy) || 1;
    s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
    s.bTarget = t.id;                    // 以降は毎フレーム少しずつこの相手へ曲がる
    s.life = Math.max(s.life, 1.0);      // 跳ね続けるあいだは寿命を継ぎ足す
    lightning(s.x, s.y, t.x, t.y, L.coreColor, { seg: 3, jitter: 6, width: 2, lifeMs: 110 });
  }

  // ---- ★R33 ブラックホールだん。唯一「壊す」ではなく「集める」弾 ----
  // 着弾点に穴が開き、雑魚を吸い寄せて、閉じるときにまとめてよろけさせる＝**弾の量産機**。
  // 骨子（掴む→溜める→投げる）に直結させるのが狙い。倒す力ではなく次に投げるものを作る力。
  function openHole(x, y) {
    const L = SPEC('blackhole');
    const core = run.add.image(x, y, 'core').setBlendMode(ADD).setDepth(14)
      .setTint(L.color).setScale(1.2);
    const ring = run.add.image(x, y, 'w_ring').setBlendMode(ADD).setDepth(13)
      .setTint(L.coreColor).setScale(0.5).setAlpha(0.9);
    st.holes.push({ x, y, t: L.holeSec, max: L.holeSec, core, ring, pulled: new Set() });
    screenFlash(L.flash, L.color);
    run.shake(L.shakeMs, L.shakeAmp);
    zoomPunch(L.zoom);
    shockRing(x, y, L.holeRadius * 0.5, L.color);
    run.floatText(x, y - 30, 'ブラックホール！！', '#b06bff');
    Sound.sfx('holeOpen');
  }

  function updateHoles(dt) {
    if (!st.holes.length) return;
    const L = SPEC('blackhole');
    for (const h of st.holes) {
      h.t -= dt;
      const k = Math.max(0, h.t / h.max);
      // 見た目：渦は最後に向かって縮みながら速く回る＝「閉じる」が目で分かる
      const sc = 0.6 + 1.5 * k;
      h.core.setScale(sc * 1.5).setRotation(run.elapsed * L.spinSpeed).setAlpha(0.75 + 0.25 * k);
      h.ring.setScale((L.holeRadius / 32) * (0.35 + 0.65 * k))
        .setRotation(-run.elapsed * L.spinSpeed * 0.6).setAlpha(0.25 + 0.5 * k);
      // 吸い寄せ。ボスは重くて動かない（吸えるなら位置取りの遊びが全部壊れる）
      let n = 0;
      for (const e of run.enemies) {
        if (!e.active || e.isBoss) continue;
        const dx = h.x - e.x, dy = h.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d > L.holeRadius) continue;
        if (n++ >= L.holeMax) break;
        h.pulled.add(e.id);
        const step = Math.min(d, L.pullSpeed * dt);
        e.x += (dx / (d || 1)) * step;
        e.y += (dy / (d || 1)) * step;
      }
      if (h.t > 0) continue;
      // 閉じる。吸い込んだ相手をまとめて**よろけさせる**＝そのまま次の弾になる。
      // ⚠️ ここで run.burstStagger を使ってはいけない。あれは「既によろけている敵を連鎖で
      //    消す」処理で、健常な敵は削るだけ＝弾が1体も増えない（実測：吸い込み7体→弾0体）。
      //    弾を作るのは enterStagger（ビリビリホイッスルと同じ経路）。
      let made = 0;
      const er2 = L.endRadius * L.endRadius;
      for (const e of run.enemies) {
        if (made >= L.endMax) break;
        if (!e.active || e.isBoss || e.stag) continue;
        const dx = e.x - h.x, dy = e.y - h.y;
        if (dx * dx + dy * dy > er2) continue;
        e.hp = 1;
        run.enterStagger(e);
        run.spawnParticles(e.x, e.y, L.color, 6);
        made++;
      }
      st.holeStaggers += made;
      screenFlash(L.endFlash, L.color);
      run.shake(L.endShakeMs, L.endShakeAmp);
      zoomPunch(0.04);
      for (let i = 0; i < 3; i++) {
        run.time.delayedCall(i * 70,
          () => shockRing(h.x, h.y, 90 + i * 80, i % 2 ? 0xffffff : L.color));
      }
      burstStreaks(h.x, h.y, 26, L.color, L.endRadius * 0.8);
      run.spawnParticles(h.x, h.y, L.color, 34);
      // ★出す数は「新しくよろけさせた数」ではなく**穴のまわりに集まった弾の総数**。
      //   ボス戦では場の雑魚が絞られていて（trashCount 1／2.4秒）新規は0になりがちだが、
      //   散らばった装甲片を1か所へ集める働きは実際にある。0と出すと失敗に見えてしまう。
      let gathered = 0;
      for (const e of run.enemies) {
        if (!e.active || e.isBoss || !e.stag) continue;
        const gx = e.x - h.x, gy = e.y - h.y;
        if (gx * gx + gy * gy <= er2) gathered++;
      }
      run.floatText(h.x, h.y - 30, gathered + 'この たまが あつまった！', '#b06bff');
      Sound.sfx('holeClose');
      Sound.sfx('bigBoom', 0.6, 0.7);
      h.core.destroy(); h.ring.destroy();
      h.dead = true;
    }
    st.holes = st.holes.filter((h) => !h.dead);
  }

  function blackholeHit(s, e) {
    const L = SPEC('blackhole');
    const x = s.x, y = s.y;
    s.noChain = 1;              // 穴が本体。burstEnd で二重に演出しない
    st.holeHits++;
    if (e.isBoss) {
      breakBoss(e);
      let dmg = Math.max(1, Math.round((e.maxHp || 1) * L.bossHpRatio * bossSpecialMul(e)));
      if (run.boss && run.boss.staggered) {
        dmg = Math.max(1, Math.round(dmg / BALANCE.hero.strike.bossBreakMul));
      }
      const hpBefore = e.hp;
      run.dealDamage(e, dmg, L.color, 'manual', { x, y, hitR: s.radius });
      run.floatText(e.x, e.y - e.radius - 6, String(Math.max(0, hpBefore - e.hp)), '#b06bff');
    } else {
      const alive = e.active;
      run.dealDamage(e, L.trashDamage, L.color, 'manual');
      if (alive && !e.active) s.kills++;
    }
    openHole(x, y);
    s.hp = 0;                   // 穴を開けたらそこで終わり＝「どこで開くか」を選ぶ弾になる
  }

  // 特殊弾は砕けない。触れた敵を全部消し飛ばしながら飛び続ける。
  function specialHit(s, e) {
    const kind = s.spec, L = SPEC(kind);
    if (kind === 'bomb') { bombHit(s, e); return; }
    if (kind === 'superball') { superballHit(s, e); return; }
    if (kind === 'blackhole') { blackholeHit(s, e); return; }
    if (e.stag) {
      const r = run.burstStagger(e.x, e.y, B().burstRadius * (L.radiusMul || 1.6), B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
      if (kind === 'blast') emberBurst(e.x, e.y, 8, 40);
    } else if (e.isBoss) {
      breakBoss(e);
      // ★「必ず最大HPの◯%」を守る。dealDamage はブレイク中の手動命中に ×2.4 を乗せるので、
      //   その分をここで割って打ち消す（乗ると1発で7割超＝マオウレクス戦が2発で終わってしまう）。
      //   タイミングの当たり外れを作らないのは意図：稀な弾に運を絡ませない。
      let dmg = Math.max(1, Math.round((e.maxHp || 1) * L.bossHpRatio * bossSpecialMul(e)));
      if (run.boss && run.boss.staggered) {
        dmg = Math.max(1, Math.round(dmg / BALANCE.hero.strike.bossBreakMul));
      }
      const hpBefore = e.hp;
      // R29: 命中座標＝弱点コア判定。R31: hitR で判定円を当たり判定とそろえる
      run.dealDamage(e, dmg, L.color, 'manual', { x: s.x, y: s.y, hitR: s.radius });
      specialImpact(s, e, Math.max(0, hpBefore - e.hp));
      return;
    } else {
      const alive = e.active;
      run.dealDamage(e, L.trashDamage, L.color, 'manual');
      if (alive && !e.active) s.kills++;
    }
    // ★R28 実プレイFB「当たったときも当たった音と一緒に雷の音も」。
    //   打撃音だけだと通常の弾と区別が付かないので、必ず属性の音を重ねる。
    if (kind === 'bolt') {
      lightning(s.x, s.y, e.x, e.y, L.coreColor, { seg: 5, jitter: 10, width: 4, lifeMs: 180 });
      for (let i = 0; i < 3; i++) {
        const a = run.rng.range(0, Math.PI * 2);
        lightning(e.x, e.y, e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 46, L.color,
          { seg: 4, jitter: 12, width: 2, lifeMs: 150 });
      }
      screenFlash(0.14, L.coreColor);
      Sound.sfx('thunder', 0.30);           // 小さな雷鳴を重ねる
      Sound.sfx('boltFly', 1, 0.9);
    } else {
      emberBurst(e.x, e.y, 10, 46);
      firePillar(e.x, e.y);
      screenFlash(0.12, L.color);
      Sound.sfx('fireBlast', 0.28);
      Sound.sfx('blastFly', 1, 0.85);
    }
    run.spawnHitMark(s.x, s.y, L.color);
    Sound.sfx('metalSlam', 0.4, 1.5);
    run.shake(70, 5);
    s.hp -= B().hpCostPerHit;   // 貫通HPが大きいので雑魚では砕けない
  }

  // ---- 着弾 ----
  function hitOne(s, e) {
    if (s.spec) { specialHit(s, e); return; }
    if (e.stag) {
      // 獲物に当てると炸裂連鎖。これがビリヤードの本体（群れの中心を叩くほど得）。
      // 一撃の 76/6 より広く長い（108/9）＝一発が大きいのは投げの特権。
      const T = s.tier || tier();
      const G = GR(s.grade);
      const r = run.burstStagger(e.x, e.y, B().burstRadius * T.radiusMul * G.radiusMul, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    } else {
      // ボスの予告を割る権利を一撃から継承する（継承しないとブレイクの受け皿が消える）
      breakBoss(e);
      const alive = e.active;
      const T = s.tier || tier();
      // ★威力＝基礎 × 段位 × 攻撃力（レベルアップとやしろで伸びる）。
      //   R24 まで heroMult が掛かっておらず、段位が変わる瞬間しか強くならなかった。
      // ★格の倍率。ボスへは bossMul（半額側）を使う＝「ボス戦の主役は装甲片(×2.5)」を壊さない。
      const G = GR(s.grade);
      let dmg = Math.round(B().damage * T.dmgMul * (s.hero || 1) * (e.isBoss ? G.bossMul : G.dmgMul));
      // ★R32 こうしえんの すな＝渾身の一投。ボスにも雑魚にも同じ倍率で乗せる。
      if (s.suna) dmg = Math.round(dmg * BALANCE.cave.buffs.suna.dmgMul);
      // ★装甲片をボスへ投げ返すと特効＝「ボスの装甲でボスを殴る」。
      //   ボス戦の与ダメの主役を、仲間や必殺ではなく看板の動詞（投げ）に戻すための倍率。
      if (e.isBoss && s.shard) {
        dmg = Math.round(dmg * shardMode().mul);
        run.floatText(e.x, e.y - e.radius - 22, 'アーマーブレイク！', '#ffd23f');
      }
      // src='manual' ＝ とどめの権利。dealDamage 側で bossBreakMul も掛かる。
      const hpBefore = e.hp;
      // R29: 命中座標＝弱点コア判定。R31: hitR で判定円を上の当たり判定(s.radius + weak.r)とそろえる。
      run.dealDamage(e, dmg, T.color, 'manual', { x: s.x, y: s.y, hitR: s.radius });
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
    // ★R25 格の手応え。重い弾ほど画面が揺れ、最上位は一瞬止まる（1発目の命中で1回だけ）。
    if (!s.__feel) {
      s.__feel = 1;
      const G1 = GR(s.grade);
      if (G1.shake > 0) run.shake(120 + 40 * s.grade, G1.shake);
      if (G1.burstAll) s.kills += gradeBurst(s.x, s.y, e, G1, s.tier || tier());
      if (G1.freeze > 0) run.freezeT = Math.max(run.freezeT || 0, G1.freeze);
      // ハイリスクの見返りは「次の安全」に変換する＝必殺ゲージ
      if (run.special) for (let c = 0; c < (G1.charge || 0); c++) run.special.addKill();
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
    // ★R32 こうしえんの すな は、雑魚に当てても・外しても**必ず特大の爆風**で終わる。
    //   レアを雑魚に誤爆した瞬間に「損した」と感じさせない（小5が取り置きに失敗しても報われる）。
    //   ボスに当たって砕けた場合(noChain)は装甲片を巻き込むので連鎖はさせず、演出だけ出す。
    if (s.suna) {
      const SU = BALANCE.cave.buffs.suna;
      if (!s.noChain) {
        const rs = run.burstStagger(s.x, s.y, SU.blastRadius, SU.blastMax);
        s.kills += rs.total;
        s.chain = Math.max(s.chain, rs.chain);
      }
      screenFlash(0.30, SU.tint);
      shockRing(s.x, s.y, SU.blastRadius * 1.15, SU.tint);
      shockRing(s.x, s.y, SU.blastRadius * 0.7, 0xffffff);
      burstStreaks(s.x, s.y, 34, SU.tint, SU.blastRadius);
      run.spawnParticles(s.x, s.y, SU.tint, 30);
      run.spawnParticles(s.x, s.y, 0xffffff, 18);
      run.shake(420, 13);
      zoomPunch(0.055);
      Sound.sfx('sunaBoom');
      Sound.sfx('bigBoom', 0.9, 0.8);
    }
    // 飛び終わりに必ず炸裂する。ここが無いと「当たらなかった投げ」が完全な無駄になり、
    // 主武器としての信頼が落ちる＝必殺技に頼る動機になる（実プレイFB）。
    // s.noChain ＝ ボスに当たって砕けた玉。ここで連鎖させると自分の装甲片を巻き込んで消す
    if (B().endBurst && !s.noChain) {
      const r = run.burstStagger(s.x, s.y, B().burstRadius * (s.tier || tier()).radiusMul
        * GR(s.grade).radiusMul, B().burstMaxChain);
      s.kills += r.total;
      s.chain = Math.max(s.chain, r.chain);
    }
    // ★特殊弾は外れても必ず大技で終わる。稀にしか手に入らない弾が
    //   「何も起きずに消えた」になると、次から怖くて使えなくなる（＝切り札が死ぬ）。
    if (s.spec && !s.noChain) {
      const L = SPEC(s.spec);
      screenFlash(L.flash * 0.7, L.color);
      run.shake(300, 12);
      zoomPunch(L.zoom * 2);
      if (s.spec === 'bolt') {
        Sound.sfx('thunder');
        for (let i = 0; i < 2; i++) {
          lightning(s.x + run.rng.range(-30, 30), s.y - 240, s.x, s.y, i ? L.color : L.coreColor,
            { seg: 11, jitter: 20, width: i ? 3 : 5, lifeMs: 300 });
        }
      } else if (s.spec === 'bomb') {
        // 外れて落ちた爆弾もちゃんと爆発する（「投げ損」を作らない）
        Sound.sfx('bigBoom', 0.7, 1.0);
        firePillar(s.x, s.y);
        emberBurst(s.x, s.y, 16, 60);
      } else if (s.spec === 'superball') {
        // ★跳ね返りを使い切った締め。数えた先にごほうびが要る（数えるだけで終わらせない）。
        const r = run.burstStagger(s.x, s.y, L.endRadius, L.endMax);
        s.kills += r.total;
        s.chain = Math.max(s.chain, r.chain);
        run.shake(L.endShakeMs, L.endShakeAmp);
        screenFlash(L.endFlash, L.color);
        for (let i = 0; i < 3; i++) {
          run.time.delayedCall(i * 60,
            () => shockRing(s.x, s.y, 90 + i * 70, i % 2 ? 0xffffff : L.color));
        }
        run.floatText(s.x, s.y - 42, (s.bounced || 0) + ' かい はねた！！', '#4dff9e');
        Sound.sfx('superEnd');
        Sound.sfx('bigBoom', 0.8, 1.25);
      } else if (s.spec === 'blackhole') {
        // 当たらずに落ちても穴は開く（稀な弾が「何も起きずに消えた」を作らない）
        openHole(s.x, s.y);
      } else {
        Sound.sfx('fireBlast');
        firePillar(s.x, s.y);
        emberBurst(s.x, s.y, 22, 70);
      }
      shockRing(s.x, s.y, 110, L.color);
      s.kills += specialChain(s.x, s.y, null, s.spec);
    }
    run.spawnParticles(s.x, s.y, s.color, 12);
    run.popNow(s.x, s.y, s.color);   // R27: 玉自体が砕けた絵。撃破ではないので連打の列には混ぜない
    st.throwKills += s.kills;
    st.bestChain = Math.max(st.bestChain, s.kills);
    // ボスに当たって砕けた玉は空振りではない（連鎖しないので kills は0のまま）
    if (s.kills === 0 && !s.noChain && !s.spec) st.dud++;
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
      // ★R27 音の役割を分ける。玉が落ちた瞬間は短い「ドッ」だけにして、
      //   重さと段数は Run 側の連打（ガガガガ…ドン！）に持たせる。両方を長く鳴らすと
      //   低域どうしが被って、せっかく並べた打撃が数えられなくなる。
      const casc = run.crushPreset && run.crushPreset().on;
      Sound.sfx('bigBoom', casc ? Math.min(0.5, 0.22 + 0.07 * s.kills) : Math.min(1, s.kills / 5));
      // 毎回の炸裂で全画面を洗うと敵が読めなくなるので上限を抑える（段位アップの一発だけは濃くてよい）
      if (T.flash > 0) screenFlash(T.flash * Math.min(1.25, 0.6 + 0.16 * s.kills), T.color);
      if (!casc) {
        if (s.kills >= 3) Sound.sfx('rush', 0.5);
        if (s.kills >= 5) Sound.sfx('gaugeFull');
        run.floatText(s.x, s.y - 12, s.kills + '体！', s.kills >= 3 ? '#ffd23f' : '#9fe8ff');
      } else if (s.kills > 0 && s.kills < BALANCE.crush.textFrom) {
        run.floatText(s.x, s.y - 12, s.kills + '体！', '#9fe8ff');
      }
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
      // ★R33 スーパーボールだけは「次に当てる相手」を追いかける。跳ね返った瞬間に向きを
      //   決め打ちすると、狙った敵が動くぶんだけ外れて2回目が起きない（実測1回で停止）。
      if (s.spec === 'superball' && s.bTarget != null) {
        let tg = null;
        for (const e of run.enemies) { if (e.active && e.id === s.bTarget) { tg = e; break; } }
        if (!tg) {
          s.bTarget = null;
        } else {
          const want = Math.atan2(tg.y - s.y, tg.x - s.x);
          const cur = Math.atan2(s.vy, s.vx);
          let d = Phaser.Math.Angle.Wrap(want - cur);
          const mx = (SPEC('superball').turnRate || 9) * dt;
          if (d > mx) d = mx; else if (d < -mx) d = -mx;
          const sp = Math.hypot(s.vx, s.vy) || 1;
          s.vx = Math.cos(cur + d) * sp; s.vy = Math.sin(cur + d) * sp;
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      // ★R50 スーパーボールは画面の縁で跳ね返る。実プレイFB「画面外に消えて跳ねる爽快感が
      //   ない」＝狙った敵が死ぬ・外すなどで向きを失うと、そのまま画面外へ飛んで寿命切れの
      //   締め（21行の大技）が**誰も見ていない場所**で再生されていた。本物のスーパーボール
      //   らしく壁で反射し、締めも必ず見える位置で起きる。
      if (s.spec === 'superball') {
        const L = SPEC('superball');
        const cam = run.cameras.main.worldView;
        const m = s.radius;
        let wall = false;
        if (s.x < cam.x + m && s.vx < 0) { s.x = cam.x + m; s.vx = -s.vx; wall = true; }
        else if (s.x > cam.right - m && s.vx > 0) { s.x = cam.right - m; s.vx = -s.vx; wall = true; }
        if (s.y < cam.y + m && s.vy < 0) { s.y = cam.y + m; s.vy = -s.vy; wall = true; }
        else if (s.y > cam.bottom - m && s.vy > 0) { s.y = cam.bottom - m; s.vy = -s.vy; wall = true; }
        if (wall) {
          // 壁は敵ではないのでカウント（bounced）は進めない＝威力の積み上げは敵ヒット限定のまま
          Sound.sfx(L.bounceSfx || 'counter', 0.45, 0.85);
          shockRing(s.x, s.y, 26, L.color);
          run.spawnParticles(s.x, s.y, L.coreColor, 3);
          const t = nextBounceTarget(s, L.bounceRange || 300);
          s.bTarget = t ? t.id : null;   // 反射した先で次の相手を狙い直す
        }
      }
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
      // 特殊弾は飛んでいる間ずっと自分を主張する（軌跡そのものが技になる）
      if (s.spec) {
        const L = SPEC(s.spec);
        s.arcT = (s.arcT || 0) - dt;
        if (s.arcT <= 0) {
          if (s.spec === 'bolt') {
            s.arcT = 0.035;
            const back = Math.atan2(s.vy, s.vx) + Math.PI;
            lightning(s.x, s.y, s.x + Math.cos(back) * 40, s.y + Math.sin(back) * 40, L.color,
              { seg: 5, jitter: 11, width: 3, lifeMs: 150 });
            const a = run.rng.range(0, Math.PI * 2);
            lightning(s.x, s.y, s.x + Math.cos(a) * 26, s.y + Math.sin(a) * 26, L.coreColor,
              { seg: 3, jitter: 8, width: 2, lifeMs: 120 });
            // ★R28 前方にも走らせる＝「これから通る道が光っている」
            const fwd = Math.atan2(s.vy, s.vx) + run.rng.range(-0.5, 0.5);
            lightning(s.x, s.y, s.x + Math.cos(fwd) * 52, s.y + Math.sin(fwd) * 52, L.coreColor,
              { seg: 4, jitter: 13, width: 2, lifeMs: 130 });
          } else if (s.spec === 'superball') {
            // ★R33 弾んでいる残像。跳ね返るたびに向きが変わるので、通った線を細かく置く
            s.arcT = 0.04;
            const back = Math.atan2(s.vy, s.vx) + Math.PI;
            run.spawnParticles(s.x + Math.cos(back) * 12, s.y + Math.sin(back) * 12, L.color, 2);
            shockRing(s.x, s.y, 16, L.color);
          } else if (s.spec === 'blackhole') {
            // ★R33 飛んでいる間から空間を吸っている＝着弾前に「これは吸う弾だ」と分かる
            s.arcT = 0.06;
            const a = run.rng.range(0, Math.PI * 2), r = run.rng.range(24, 44);
            lightning(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, s.x, s.y, L.color,
              { seg: 3, jitter: 5, width: 2, lifeMs: 130 });
            run.spawnParticles(s.x, s.y, L.color, 1);
          } else {
            // 炎は後ろへ流れて上へ立ちのぼる＝「燃えながら飛んでいる」
            s.arcT = L.emberEverySec;
            const back = Math.atan2(s.vy, s.vx) + Math.PI;
            emberBurst(s.x + Math.cos(back) * 10, s.y + Math.sin(back) * 10, 4, 26);
          }
        }
        // ★R28 飛行中の音。実プレイFB「飛んでいくときに稲光のエフェクトと音」。
        //   1ボスに1〜2発しか来ないので、飛んでいる間じゅう鳴らして構わない。
        //   ⚠️ 毎回同じ音程だと機械の警報音になるので、強さと音程を必ずずらす。
        s.sfxT = (s.sfxT || 0) - dt;
        if (s.sfxT <= 0) {
          s.sfxT = L.flySfxSec || 0.12;
          Sound.sfx(L.flySfx || (s.spec === 'bolt' ? 'boltFly' : 'blastFly'),
            run.rng.range(0.45, 1), run.rng.range(0.88, 1.14));
        }
        // 画面全体の明滅。雷（炎）が近くを通っている明るさの変化
        s.flashT = (s.flashT || 0) - dt;
        if (s.flashT <= 0) {
          s.flashT = L.flyFlashSec || 0.25;
          screenFlash(L.flyFlash || 0.08, s.spec === 'bolt' ? L.coreColor : L.color);
        }
        if (s.spec === 'bolt') {
          // 近くの敵へ「当たっていない」放電が伸びる＝通り道の周りが危なく見える
          s.zapT = (s.zapT || 0) - dt;
          if (s.zapT <= 0) {
            s.zapT = 0.09;
            let n = 0;
            for (const e of run.enemies) {
              if (n >= (L.flyZaps || 2)) break;
              if (!e.active || e.isBoss) continue;
              const dx = e.x - s.x, dy = e.y - s.y;
              if (dx * dx + dy * dy > (L.flyReach || 150) ** 2) continue;
              lightning(s.x, s.y, e.x, e.y, L.color, { seg: 6, jitter: 14, width: 2, lifeMs: 110 });
              n++;
            }
          }
        } else if (s.spec === 'blast' || s.spec === 'bomb') {
          // 通った跡がしばらく燃えている＝軌跡そのものが炎の川になる
          s.trailT = (s.trailT || 0) - dt;
          if (s.trailT <= 0) {
            s.trailT = L.flyTrailSec || 0.10;
            firePillar(s.x, s.y);
          }
        }
      }
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
        // ★R29 弱点コア持ちボス（マオウレクス）は、当たり判定そのものが本体ではなくコア。
        //   本体の輪郭(radius 82)で当たり判定を取ると、コア(中心から約25px)には物理的に一生届かない。
        //   そこで本体は「触れると弾かれるだけの装甲」にし、ダメージ判定はコア円だけで取る。
        // ★R31 分離した下半身（R30）はHPを持たない砲台なので、当てても絶対に減らない。
        //   それ自体は仕様だが、旧実装ではここで玉が**消費**され、bossImpact が止め・揺れ・
        //   衝撃波・金属音を全部出したうえで「0」を表示していた＝全力の投げが丸ごと消える。
        //   上半身の装甲と同じ扱いにする：カキン！だけ返して**弾は通す**（奥のコアへ届く）。
        if (e.isBoss && e.isLowerHalf) {
          const lrr = s.radius + e.radius;
          const ldx = e.x - s.x, ldy = e.y - s.y;
          if (ldx * ldx + ldy * ldy <= lrr * lrr && !s.__deflectedLower) {
            s.__deflectedLower = 1;
            if (run.boss && run.boss.deflect) run.boss.deflect(s.x, s.y);
          }
          continue;
        }
        const weak = (e.isBoss && run.boss && run.boss.hasWeak) ? run.boss.weakPoint(e) : null;
        if (weak) {
          const wrr = s.radius + weak.r;
          const wdx = weak.x - s.x, wdy = weak.y - s.y;
          if (wdx * wdx + wdy * wdy <= wrr * wrr) {
            s.hit.add(e.id);
            hitOne(s, e);
            if (s.hp <= 0) { burstEnd(s); break; }
          } else {
            const brr = s.radius + e.radius;
            const bdx = e.x - s.x, bdy = e.y - s.y;
            // 装甲に触れた1回だけ「カキン！」を出す（弾は止めない＝奥のコアへ通り抜けられる）
            if (bdx * bdx + bdy * bdy <= brr * brr && !s.__deflected) {
              s.__deflected = 1;
              run.boss.deflect(s.x, s.y);
            }
          }
          continue;
        }
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
    // ★R43 腕が実際に届く先を渡す＝**判定と同じ 78px まで伸びる**。
    //   旧実装は判定78pxに対し腕が最大31pxしか伸びず、「届いていない拳」で遠くの敵が
    //   吹き飛んでいた（実プレイFB「身体に生えてるようにみえる不自然な小さな拳」の本体）。
    run._punchReach = J.reach;
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
    st.cd = b.grabCooldownSec * (machineOn() ? BALANCE.cave.buffs.machine.grabCdMul : 1);
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
    if (run.playerArmSegs) for (const s of run.playerArmSegs) s.setVisible(false);   // R43 蛇腹の節
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
    // ★R26 断末魔の予告中は掴めない。実測で「よろけ→掴み 中央値0.23秒」だったため、
    //   ここを開けたままだと予告23回中19回が掴みで消えて発火9%になっていた。
    // ★R29W2 掴める獲物が居なくても、手が届く範囲に**紫の獲物**が居るなら弾き返す。
    //   旧実装は候補から外すだけで突きに落ちていた＝「掴めなかった」瞬間が体験として存在しなかった。
    const prey = run.nearestEnemy(grabReach(), 0, true,
      (e) => !e.isBoss && !(e.throe && e.guardT > 0));
    if (prey) { grab(prey); return; }
    // ★1回のミスにつき罰は1回だけ。同じ紫の窓で2度3度しびれると、押しっぱなしのプレイヤー
    //   （＝小さい子）が動けない時間だけを積む。実測でボットは 5.8〜11.1回/分 弾かれており、
    //   0.30秒×その頻度＝プレイ時間の3〜6%が上限。ここを1窓1回に抑えて天井を下げる。
    const guarded = run.nearestEnemy(grabReach(), 0, true,
      (e) => !e.isBoss && e.throe && e.guardT > 0 && !e.grabBlocked);
    if (guarded && blockedGrab(guarded)) return;
    jab();
  }

  // ★R29W2 つかめなかった演出＋罰（実プレイFB「主人公が後ろに弾かれる／ビリっとしびれる等」）。
  //   ダメージは与えない。難易度を上げずに「今のは失敗だった」だけを確実に伝える。
  //   連打で毎回止まると理不尽になるので、短い間隔で2回目以降は従来どおり突きへ落とす。
  function blockedGrab(e) {
    const K = BALANCE.deathThroe.block;
    if (!K) return false;
    if (run.elapsed - (st.blockT == null ? -99 : st.blockT) < (K.cooldownSec || 0.5)) return false;
    st.blockT = run.elapsed;
    st.blocked = (st.blocked || 0) + 1;
    e.grabBlocked = true;      // この紫の窓ではもう罰しない（startDeathThroe で戻る）
    // 主人公 ← 敵 の向きへ弾く（＝間合いの外へ押し出される。掴み直すには近づき直すしかない）
    const a = Math.atan2(run.player.y - e.y, run.player.x - e.x);
    run._knockX = Math.cos(a) * (K.knockback || 300);
    run._knockY = Math.sin(a) * (K.knockback || 300);
    run._knockT = K.knockSec || 0.18;
    st.stunT = K.stunSec || 0.3;
    const col = K.tint || 0xc44bff;
    // ビリッ：主人公から放射状に紫の電気。敵からも1本つないで「触ったから痺れた」を見せる
    lightning(e.x, e.y, run.player.x, run.player.y, col, { seg: 6, jitter: 12, width: 4, lifeMs: 260 });
    for (let i = 0; i < 5; i++) {
      const t = a + run.rng.range(-2.6, 2.6);
      lightning(run.player.x, run.player.y,
        run.player.x + Math.cos(t) * run.rng.range(26, 48),
        run.player.y + Math.sin(t) * run.rng.range(26, 48),
        i % 2 ? 0xffffff : col, { seg: 4, jitter: 9, width: 2, lifeMs: 240 });
    }
    run.time.delayedCall(140, () => {
      if (!run.player || run.ended) return;
      for (let i = 0; i < 3; i++) {
        const t = run.rng.range(0, Math.PI * 2);
        lightning(run.player.x, run.player.y,
          run.player.x + Math.cos(t) * 34, run.player.y + Math.sin(t) * 34,
          col, { seg: 3, jitter: 8, width: 2, lifeMs: 200 });
      }
    });
    shockRing(e.x, e.y, e.radius * 2 + 34, col);
    run.spawnParticles(run.player.x, run.player.y, col, 10);
    run.floatText(run.player.x, run.player.y - 34, 'ビリッ！ つかめない！', '#e0a0ff');
    Sound.sfx('numb');
    Sound.sfx('counter', 0.4, 0.7);
    run.shake(180, 7);
    if (!run.cinematic) run.freezeT = Math.max(run.freezeT || 0, 0.06);
    return true;
  }

  // ---- 毎フレーム ----
  function update(dt) {
    if (st.mode !== 1) { run._moveMul = 1; if (st.wind) endPitch(); return; }
    // ランが終わった瞬間にズーム中だと寄ったまま残るので必ず戻す
    if (run.ended && run.cameras && run.cameras.main && run.cameras.main.zoom !== 1) {
      run.cameras.main.setZoom(1); st.zooming = false;
    }
    updateShots(dt);
    updateHoles(dt);          // ★R33 ブラックホールだんが開けた穴（吸い込み→閉じてよろけ）
    // ランが終わったら、振りかぶりで傾けた体と残像を必ず戻す（残すと死亡画面で斜めのまま固まる）
    if (!run.player || run.cinematic || run.paused || run.ended) {
      if (run.ended) {
        hideGhosts(); resetBody(); cancelHandover();
        // しびれの点滅色を残したまま止まると、死亡画面で主人公が紫のまま固まる
        st.stunT = 0;
        if (run.playerImg) run.playerImg.clearTint();
      }
      return;
    }
    if (!st.seeded) seedOpeningPrey();
    checkTierUp();
    if (st.cd > 0) st.cd -= dt;

    // 投げているあいだ（0.17秒）は他の入力を受けない。腕を振り切るまでが1回の投球。
    if (st.wind) { updatePitch(dt); return; }

    const p = run.input.activePointer;
    const want = (p && p.isDown) || (run._jKey && run._jKey.isDown);

    // らいこうだんの手渡し中は操作を受けない。時間が落ちているこの1秒だけは、
    // 「渡された」を見るための時間として丸ごと明け渡す（実プレイFB「意識できるように」）。
    if (st.handover) {
      run._moveMul = 0;
      hideAim();
      updateHandover(run.realDt == null ? dt : run.realDt);
      return;
    }

    if (st.held) {
      // ★手渡された直後は、ボタンを押すまで手の中で待たせる。
      //   ここが無いと、次のフレームで「押していない＝離した」と判定されて勝手に投げてしまう。
      if (st.held.handed) {
        if (want) st.held.handed = false;   // 押した＝ここから先は普段の投げとまったく同じ
        const a0 = aimAngle();
        run._weaponAim = a0;
        run._moveMul = 1;
        st.chargeT = B().chargeMaxSec;
        const h0 = handAt(a0, 0, 1);
        showHeld(st.held, h0, 1);
        drawHandAt(h0, a0);
        setBody(a0, -PT().bodyLean, -PT().drawBack, -PT().drawStretch);
        showAim(a0, 1);
        heldAura(h0, 1, dt, st.held.spec);
        return;
      }
      st.chargeT = Math.min(B().chargeMaxSec, st.chargeT + dt);
      if (!st.maxRung && st.chargeT >= B().chargeMaxSec) { st.maxRung = true; Sound.sfx('gaugeFull'); }
      // ★R25 ボンバの導火線。掴んでも燃え続け、0になると手の中で爆発する。
      //   ＝「よろけさせて安全に運ぶ」が通じない相手を1種だけ置く（ハイリスクの象徴）。
      if (st.held && st.held.fuse > 0) {
        st.held.fuse -= dt;
        // 残りが減るほど速く鳴る＝耳で残り時間が分かる（数字は出さない）
        st.fuseBeep = (st.fuseBeep || 0) - dt;
        const fsec = (BALANCE.deathThroe.fuse && BALANCE.deathThroe.fuse.sec) || 1.4;
        if (st.fuseBeep <= 0) {
          st.fuseBeep = Math.max(0.06, st.held.fuse * 0.22);
          Sound.sfx('tick', 0.6, 1.1 + 0.9 * (1 - Math.min(1, st.held.fuse / fsec)));
        }
        // 耳だけでなく目でも残りが分かるように、手の中の弾を赤く明滅させる（速さが残り時間）
        if (st.heldSpr) {
          const bl = Math.sin(run.elapsed * (16 + 34 * (1 - st.held.fuse / fsec))) > 0;
          st.heldSpr.setTint(bl ? 0xff4020 : 0xffffff);
        }
        if (st.held.fuse <= 0) { blowUpInHand(); return; }
      }
      // ★②のアンカー。溜め中は移動が鈍る＝「群れの中心で溜め切るか、浅く投げて下がるか」の判断が毎周期出る。
      const ang = aimAngle();
      // 溜め中に方向キーを押している間は足を止め、狙いだけを変える＝「上下左右斜めと自由に狙える」。
      // ただし止まるのは溜め開始から aimStopSec 秒まで（実プレイFB「足がとまる時間は0.5秒にしてくれ」）。
      // それ以降は溜めっぱなしでも動けるので、群れの中で永久に足を縛られることがない。
      const bb = B();
      const aiming = st.keyActive && st.chargeT < (bb.aimStopSec == null ? bb.chargeMaxSec : bb.aimStopSec);
      // ★R25 重い弾は足を鈍らせる。溜め中の減速（既存の②アンカー）と同じ語彙で、
      //   「強い弾を運んでいる間は逃げにくい」というリスクを作る。
      const gm = st.held ? GR(st.held.grade).holdMoveMul : 1;
      run._moveMul = (aiming ? (bb.moveMulWhileAiming == null ? 0 : bb.moveMulWhileAiming)
                             : bb.moveMulWhileCharge) * gm;
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
      heldAura(hp0, ratio, dt, st.held.spec);
      if (!want) startThrow(ang);
    } else if (st.stunT > 0) {
      // R29W2 しびれ。動けない・掴めない＝つかみ損ねた0.3秒ぶんの罰（ダメージは無い）
      st.stunT = Math.max(0, st.stunT - dt);
      run._moveMul = 0;
      hideAim();
      resetBody();
      // ⚠️ 主人公の当たり判定(run.player)はただのオブジェクト。絵は run.playerImg。
      //    updatePlayer は billiard.update より前に走るので、ここで塗った色はこのフレーム有効。
      if (run.playerImg) {
        run.playerImg.setTint(Math.floor(run.elapsed * 30) % 2 === 0
          ? (BALANCE.deathThroe.block.tint || 0xc44bff) : 0xffffff);
        if (st.stunT <= 0) run.playerImg.clearTint();
      }
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
    if (st.mode === 0) { st.held = null; st.chargeT = 0; hideHeld(); hideAim(); endPitch(); cancelHandover(); }
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
      + ' 溜' + avgCharge.toFixed(2) + 's 掴' + st.grabs + ' 突' + st.jabs + '→獲' + st.jabStaggers
      + ' 雷' + st.boltsGot + '→命中' + st.boltHits + ' 炎命中' + st.blastHits
      + ' 攻×' + heroMul().toFixed(2)
      + ' 格' + st.gradeGrabs.join('/') + ' 冠' + st.crownGrabs + ' 手爆' + st.handBooms;
  }

  return { update, toggleMode, cycleDrift, toggleExpire, cycleShards, statsLine, driftMul,
           canReceiveAmmo, giveAmmo, shockRing, st };
}
