// systems/special.js — ひっさつわざ（必殺技）。敵を倒すとゲージがたまり、SPACEで広範囲を一掃する。
// 1ステージ BALANCE.special.maxUses 回まで。ダメージは fx.specialBlast の閃光ピーク（onImpact）で入る。
import { BALANCE } from '../data/balance.js';
import { Sound } from '../audio/sound.js';

export function createSpecial(run) {
  const S = BALANCE.special;

  let charge = S.startCharge;
  let used = 0;
  let notified = charge >= 1;   // 「満タンになった」通知を出したか
  let blasting = false;         // 爆発演出中は addKill を無視（自キルでのゲージ再充填を防ぐ）

  function usesLeft() { return Math.max(0, S.maxUses - used); }
  function isReady() { return charge >= 1 && usesLeft() > 0; }

  function addKill() {
    if (blasting) return;         // 必殺演出中の巻き込みキルではゲージを回復させない
    if (usesLeft() <= 0) return;
    if (charge >= 1) return;
    charge = Math.min(1, charge + 1 / S.killsPerCharge);
    if (charge >= 1 && !notified) {
      notified = true;
      // 効果音は fx 側が演出とセットで鳴らす（fx が無い時だけ直接鳴らす）
      if (run.fx && run.fx.specialReady) run.fx.specialReady();
      else Sound.sfx('gaugeFull');
    }
  }

  // 閃光ピークで実際にダメージを入れる。走査中に run.enemies が変化しても壊れないよう先に集める。
  function onImpact() {
    const px = run.player.x, py = run.player.y;
    const rr = S.radius * S.radius;
    const targets = [];
    for (const e of run.enemies) {
      if (!e || !e.active) continue;
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy <= rr) targets.push(e);
    }
    for (const e of targets) {
      if (!e.active) continue;
      if (e.isBoss) {
        run.dealDamage(e, S.bossDamage, e.color);   // ボスは即死させずダメージのみ（撃破経路は dealDamage が持つ）
      } else {
        run.killEnemy(e, e.color);
      }
    }
    run.shake(260, 6);
  }

  function onDone() {
    blasting = false;   // 爆発演出が終わったらゲージ加算を再開
  }

  function fire() {
    if (!isReady()) return false;
    if (run.cinematic || run.paused || run.ended) return false;

    blasting = true;
    charge = 0;
    notified = false;
    used++;

    // 効果音は fx.specialBlast が閃光と同時に鳴らす（fx が無い時だけ直接鳴らす）
    if (run.fx && run.fx.specialBlast) {
      run.fx.specialBlast(run.player.x, run.player.y, S.radius, onImpact, onDone);
    } else {
      Sound.sfx('special');
      onImpact();
      onDone();
    }
    return true;
  }

  function update(dt) {
    // 現状は時間回復なし（将来用の受け口）
  }

  function destroy() {
    // 参照を切るだけ
  }

  return {
    update, addKill, fire, destroy,
    get charge() { return charge; },
    get usesLeft() { return usesLeft(); },
    get ready() { return isReady(); },
  };
}
