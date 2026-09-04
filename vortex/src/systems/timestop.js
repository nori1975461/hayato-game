// timestop.js — 「時間を止める権利」の予算管理（R58）＋ 混雑時の「止める回数」制限（R59）。
//
// 何を解くか：実プレイFB「敵が多く出てきた際に、画面がゆっくりストップモーションのようになってしまった」。
// 実測（scratchpad/r58-slowmo-diag.mjs）では敵130体でも 60fps・update 0.78ms で**重くはなかった**。
// 止まって見えた正体は演出＝ヒットストップ（run.freezeT：その間 Run.update を丸ごとスキップ）と
// スローモーション（run.slowT：dt を slowMul 倍に縮める）で、これらが敵の数に比例して連続発火し、
// **画面時間の 50.4% が止まるか遅い**状態になっていた（通常の敵11体なら 22.2%）。
//
// なぜ既存の上限で防げないか：freezeCapSec（1発の上限）は「1発が長くなりすぎる」ことしか防げない。
// 敵が多いと、1発が短くても毎フレーム誰か（自動パンチ・着弾・貫通・一気消し）が立て直すので
// 切れ目が無くなる。必要なのは1発の長さではなく**単位時間あたりの停止時間の上限**＝デューティ比。
//
// 仕組み①（R58・予算）：直近 windowSec 秒の「止めた時間」を spent として持つ（時定数 windowSec の
// 指数減衰）。予算は **budget（デューティ比）× windowSec 秒**。新しい停止/減速の**延長ぶん** delta が
// 来たら、予算の残りまでしか認めない。ただし minFrac までは必ず認める＝手応えを0にはしない
// （消すのではなく**切れ目を作る**のが目的）。
// 値は模擬（60fps で実測と同じ発火パターンを流す・test-core R58）で掃引して決めた：
//   windowSec=3 / budget=0.30 / minFrac=0.25 → 静かな場面（24.6%）は -0.08pt で**変わらず**、
//   混雑（模擬 74%）は 31.5% に頭打ち。窓が短い（1秒）と静かな場面の山まで削ってしまい、
//   窓を長く（3秒）取ると山は平均に埋もれて通り、混雑の連続だけが予算に当たる。
//
// 仕組み②（R59・回数）：予算を入れたあとも「3体目・4体目のボスのとき、敵が多すぎると
// ストップモーションになる」。実測（scratchpad/r58b-boss-crowd-diag.mjs・ボス戦＋敵94〜133体）＝
// 止まる割合は 27〜31% で予算どおり頭打ちなのに、**止まる区間が 1秒に 3.1〜3.5 回・1回 4〜5フレーム**
// （通常は 2.4 回/秒）。同じ30%でも「たまに0.3秒止まる」と「0.3秒ごとに4フレーム止まる」は別物で、
// 後者がコマ送りの正体。予算（時間の合計）では回数は縛れないので、**敵の数に応じて「次の停止を
// 始めるまでの間隔」を空ける**。敵が少ないとき（crowd.lo 以下）は間隔0＝従来と完全に同じ。
// 被弾・一気消しのような大きな要求（bigSec 以上）は間隔を待たずに通す＝大事な手応えは消さない。
//
// ⚠️ この予算は Run のインスタンスに freezeT / slowT のアクセサ（setter）として取り付ける。
//    立てる側は30か所以上（billiard/boss/fx/levelup/Run）あり、全部を書き換えると必ず漏れる。
//    「値が増えた瞬間」を1か所で捕まえるのが、漏れなく・元の意図を壊さず入れられる唯一の形。

export function createTimeStopGovernor(cfg) {
  const windowSec = Math.max(0.1, (cfg && cfg.windowSec) || 3.0);
  const duty = Math.max(0, Math.min(1, (cfg && cfg.budget) != null ? cfg.budget : 0.30));
  const minFrac = Math.max(0, Math.min(1, (cfg && cfg.minFrac) != null ? cfg.minFrac : 0.25));
  const budget = duty * windowSec;   // 秒。窓のうち止めてよい時間
  // 縮めた結果がこれ未満（60fpsで2フレーム）なら延長そのものを見送る。
  // 1〜2フレームの停止は「止まった」ではなく「引っかかった」に見え、混雑で量産されると
  // それ自体がコマ落ちの正体になる（予算で短くしただけでは、数は減らない）。
  const minGrantSec = Math.max(0, (cfg && cfg.minGrantSec) != null ? cfg.minGrantSec : 0.034);
  // R59 回数制限。crowd 0..1（敵の少なさ→多さ）に比例して、停止と停止の間を gapSec まで空ける。
  const CR = (cfg && cfg.crowd) || {};
  const gapSec = CR.gapSec != null ? Math.max(0, CR.gapSec) : 0.6;
  const bigSec = CR.bigSec != null ? Math.max(0, CR.bigSec) : 0.12;
  let spent = 0;   // 直近 windowSec 秒ぶんの「止めた時間」（秒相当）
  let now = 0;     // 実時間の累計（tick で進む）
  let stopping = false;      // 直前の tick で止まって/遅くなっていたか
  let lastEnd = -Infinity;   // 最後に停止/減速が終わった実時間

  // 毎フレーム呼ぶ。frozen＝この実時間 dt のあいだ完全停止していたか。
  // slowMul＝減速中ならその倍率（1なら減速なし）。減速は (1 - slowMul) の割合だけ「止めた」と数える
  // （0.16倍なら 84% 止まっているのと同じ体感）。
  function tick(dt, frozen, slowMul) {
    if (!(dt > 0)) return spent;
    spent *= Math.exp(-dt / windowSec);
    const slow = slowMul != null && slowMul < 1;
    if (frozen) spent += dt;
    else if (slow) spent += dt * (1 - slowMul);
    const stop = !!frozen || slow;
    if (stopping && !stop) lastEnd = now;   // 区間が終わった瞬間を記録
    stopping = stop;
    now += dt;
    return spent;
  }

  // 停止/減速を delta 秒ぶん**延ばす**要求に対して、認める延長ぶんを返す。
  // weight＝その延長が「止めた時間」として予算を食う割合（完全停止=1、減速= 1-slowMul の見込み）。
  function grant(delta, weight) {
    if (!(delta > 0)) return 0;
    const w = weight == null ? 1 : Math.max(0.05, Math.min(1, weight));
    const remaining = Math.max(0, budget - spent) / w;
    // 予算の内側なら全部認める＝静かな場面は従来と完全に同じ。
    if (remaining >= delta) return delta;
    // 使い切っていても minFrac は認める＝大きな手応え（被弾・一気消し）は消さない、切れ目だけを作る。
    // ただし縮めた結果が2フレーム未満になる小さな停止（自動パンチ・貫通の1発ずつ）は見送る
    // ＝混雑では「細かく何度も引っかかる」より「たまにしっかり止まる」のほうが読める。
    const g = Math.max(delta * minFrac, remaining);
    return g < minGrantSec ? 0 : g;
  }

  // R59: いま止まっていない状態から**新しく**停止を始めてよいか。crowd 0..1 に比例した間隔を空ける。
  // 大きな要求（bigSec 以上＝被弾 0.16・一気消し）は待たずに通す。すでに止まっている最中の延長は
  // 「新しい区間」ではないので、呼び出し側はこの判定を通さない。
  function allowEpisode(delta, crowd) {
    if (!(delta > 0)) return false;
    if (delta >= bigSec) return true;
    const c = Math.max(0, Math.min(1, crowd || 0));
    if (c <= 0) return true;
    return (now - lastEnd) >= gapSec * c;
  }

  return {
    tick,
    grant,
    allowEpisode,
    get spent() { return spent; },
    get budget() { return budget; },
    get now() { return now; },
    reset() { spent = 0; now = 0; stopping = false; lastEnd = -Infinity; },
  };
}

// 敵の数を 0..1 の「混雑度」へ。lo 以下なら 0（＝従来と同じ）、hi 以上なら 1。
export function crowdLevel(count, cfg) {
  const CR = (cfg && cfg.crowd) || {};
  const lo = CR.lo != null ? CR.lo : 40, hi = CR.hi != null ? CR.hi : 120;
  if (!(hi > lo)) return count > lo ? 1 : 0;
  return Math.max(0, Math.min(1, (count - lo) / (hi - lo)));
}

// Run のインスタンスへ取り付ける。freezeT / slowT を「増えた瞬間だけ予算で削る」アクセサに置き換える。
// 減らす代入（毎フレームの -= dt や 0 リセット）はそのまま通す。
// slowT の重みは代入時点の slowMul で見る（slowMotion() は slowT→slowMul の順に代入するので、
// その瞬間はまだ前回の slowMul。代表値として 0.7 を下限に使う＝実際の slowMul 0.16〜0.45 に相当）。
export function installTimeStopGovernor(run, cfg) {
  const gov = createTimeStopGovernor(cfg);
  let freeze = 0, slow = 0;
  const crowd = () => crowdLevel(run.enemies ? run.enemies.length : 0, cfg);
  Object.defineProperty(run, 'freezeT', {
    configurable: true, enumerable: true,
    get() { return freeze; },
    set(nv) {
      const v = +nv || 0;
      // 減らす・0以下にする代入は素通し（毎フレームの -= dt は 0 をわずかに割るので、
      // 「0 を代入」も増やす方向と誤認しないよう v<=0 を先に返す）
      if (v <= 0 || v <= freeze) { freeze = v; return; }
      const base = Math.max(0, freeze);
      // R59: 止まっていない所から新しく止め始めるときだけ、混雑に応じた間隔を見る
      if (base <= 0 && slow <= 0 && !gov.allowEpisode(v, crowd())) return;
      freeze = base + gov.grant(v - base, 1);
    },
  });
  Object.defineProperty(run, 'slowT', {
    configurable: true, enumerable: true,
    get() { return slow; },
    set(nv) {
      const v = +nv || 0;
      if (v <= 0 || v <= slow) { slow = v; return; }
      const base = Math.max(0, slow);
      const mul = run.slowMul != null ? run.slowMul : 0.3;
      slow = base + gov.grant(v - base, Math.max(0.7, 1 - mul));
    },
  });
  return gov;
}
