// rarity.js — レアリティの順位と「珍しいコアは満員でも仲間になる」ための純粋関数（R60）。
//
// 何を解くか：実プレイFB「ドリンゴ、マモリン、ラゴン。この3体が一度も出てこない。出現確率低すぎでは？」。
// 実測（scratchpad/r60-mobit-acq-probe.mjs・3シード×200秒超）：確率の問題ではなかった。
//   ・R のコアはエリート（110/200/290秒）撃破の確定ドロップだけが入口。3ランで R は7回抽選され、
//     うちドリンゴは3回出ている。**しかし3回とも「+50 コイン」に化けた**＝パーティが満員だったから。
//   ・パーティは開始38秒（ビリッコ）で 2/2＋特別枠が満杯になり、以後ずっと満員（N コアは 200秒で 44〜69個
//     が全部コインに化ける）。3枠目が開く180秒も、毎秒0.3個落ちる N コアが数秒で埋める。
//   ・つまり**エリートの R コアは事実上100%捨てられていた**。合成（祭壇）で作れる R はサメット／ネオンワームの
//     2種だけなので、マモリン／ドリンゴは仲間になる経路がほぼ無い。ラゴン（SR）は R＋R 合成だけで、
//     素材の R が揃わないので実質 0。
// 直し方：珍しいコアを拾ったときパーティが満員なら、**いちばん格の低いメンバーと「こうたい」**する。
//   N が R に、R が SR に置き換わる＝「レアは必ず仲間になる」。弾配り役（AMMO＝ビリッコ）は特別枠なので
//   交代の相手にしない。あわせて、R／SR の抽選は「まだ持っていない種」を優先＝同じ子ばかり出ない。
//   火力の上限（戦う仲間は最大3人）には触れていない＝置き換えであって増員ではない。
// ⚠️ Phaser に依存しない純粋関数だけを置く（test-core が Node から import して数で縛る）。

export const RARITY_RANK = { N: 0, R: 1, SR: 2 };

export function rarityRank(rarity) {
  return RARITY_RANK[rarity] != null ? RARITY_RANK[rarity] : -1;
}

// 満員のとき、より珍しいコア def が「こうたい」で入る相手のインデックス。
// いちばん格の低いメンバー（同格なら先に入った順＝先頭）。AMMO（特別枠）は対象外。
// def より格の低い者が居なければ -1（＝従来どおりコインに替える）。
export function findSwapIndex(party, def) {
  let idx = -1;
  let low = rarityRank(def && def.rarity);
  if (low < 0) return -1;
  for (let i = 0; i < party.length; i++) {
    const d = party[i] && party[i].def;
    if (!d || d.archetype === 'AMMO') continue;
    const rk = rarityRank(d.rarity);
    if (rk < low) { low = rk; idx = i; }
  }
  return idx;
}

// 抽選プールから「まだ持っていない id」だけを残す。全部持っていれば元のプールをそのまま返す。
export function preferUnowned(pool, ownedIds) {
  if (!ownedIds || !ownedIds.size) return pool;
  const rest = pool.filter((m) => !ownedIds.has(m.id));
  return rest.length ? rest : pool;
}
