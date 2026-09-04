// timestop.js — 「時間を止める権利」の予算管理（R58）。
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
// 仕組み：直近 windowSec 秒の「止めた時間」を spent として持つ（時定数 windowSec の指数減衰）。
// 予算は **budget（デューティ比）× windowSec 秒**。新しい停止/減速の**延長ぶん** delta が来たら、
// 予算の残りまでしか認めない。ただし minFrac までは必ず認める＝手応えを0にはしない
// （消すのではなく**切れ目を作る**のが目的）。
// 値は模擬（60fps で実測と同じ発火パターンを流す・test-core R58）で掃引して決めた：
//   windowSec=3 / budget=0.30 / minFrac=0.25 → 静かな場面（24.6%）は -0.08pt で**変わらず**、
//   混雑（模擬 74%）は 31.5% に頭打ち。窓が短い（1秒）と静かな場面の山まで削ってしまい、
//   窓を長く（3秒）取ると山は平均に埋もれて通り、混雑の連続だけが予算に当たる。
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
  let spent = 0;   // 直近 windowSec 秒ぶんの「止めた時間」（秒相当）

  // 毎フレーム呼ぶ。frozen＝この実時間 dt のあいだ完全停止していたか。
  // slowMul＝減速中ならその倍率（1なら減速なし）。減速は (1 - slowMul) の割合だけ「止めた」と数える
  // （0.16倍なら 84% 止まっているのと同じ体感）。
  function tick(dt, frozen, slowMul) {
    if (!(dt > 0)) return spent;
    spent *= Math.exp(-dt / windowSec);
    if (frozen) spent += dt;
    else if (slowMul != null && slowMul < 1) spent += dt * (1 - slowMul);
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

  return {
    tick,
    grant,
    get spent() { return spent; },
    get budget() { return budget; },
    reset() { spent = 0; },
  };
}

// Run のインスタンスへ取り付ける。freezeT / slowT を「増えた瞬間だけ予算で削る」アクセサに置き換える。
// 減らす代入（毎フレームの -= dt や 0 リセット）はそのまま通す。
// slowT の重みは代入時点の slowMul で見る（slowMotion() は slowT→slowMul の順に代入するので、
// その瞬間はまだ前回の slowMul。代表値として 0.7 を下限に使う＝実際の slowMul 0.16〜0.45 に相当）。
export function installTimeStopGovernor(run, cfg) {
  const gov = createTimeStopGovernor(cfg);
  let freeze = 0, slow = 0;
  Object.defineProperty(run, 'freezeT', {
    configurable: true, enumerable: true,
    get() { return freeze; },
    set(nv) {
      const v = +nv || 0;
      freeze = v > freeze ? freeze + gov.grant(v - freeze, 1) : v;
    },
  });
  Object.defineProperty(run, 'slowT', {
    configurable: true, enumerable: true,
    get() { return slow; },
    set(nv) {
      const v = +nv || 0;
      if (v > slow) {
        const mul = run.slowMul != null ? run.slowMul : 0.3;
        slow = slow + gov.grant(v - slow, Math.max(0.7, 1 - mul));
      } else slow = v;
    },
  });
  return gov;
}
