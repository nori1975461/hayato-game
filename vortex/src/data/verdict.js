// data/verdict.js — ジャム版の「裁き」。堕天の大聖堂がプレイを一行で裁く（結果画面の主役）。
//
// 2026-09-13 ユーザー決定「unity1week出品・コメント100取得に全振り」。到達タイム以外の再挑戦／コメントの動機＝
//   ①自分だけの一文（統計から一意に決まる＝人ごとに違う） ②何にやられたかが分かる（理不尽でない）
//   ③一覧に空欄が見える（集めきる） ④「大聖堂 残り n%」（あと少し）。
// コメント欄はゲームの外（unityroomのページ下）にあるので、ここで**書く一文を手渡して**画面を閉じさせる。
// ⚠️ ジャム版だけ漢字まじり（評価者は大人）。本編（ひらがな）の作法は変えない。
// ⚠️ 戦闘中に文字は足さない（③装飾が飽和側）。ここの文はすべて結果画面で出す。
// ★2026-09-13 実プレイFB「二回やって二回とも同じ文言」→ クリアの裁きを8→12種にし、当てはまるものの中で
//   **まだ見ていないものを優先**する（judge の第2引数 seen）。同じ行いでも一覧が埋まるまで別の一文が出る。

// 死因（Run.hitPlayer の cause）→ 名前と避け方の一言。
export const CAUSES = {
  rose:     { name: '薔薇窓の裁き',   tip: '赤い光柱の間に立ち青が来る前に半歩ずれる' },
  bell:     { name: '鎮魂の鐘',       tip: '光輪の欠けた向きへ抜ける' },
  feathers: { name: '鉄羽の雨',       tip: '翼が上がったら走る。扇の端から抜ける' },
  whip:     { name: '配線の鞭',       tip: '正面に立たない。横へ抜ける' },
  crack:    { name: '破鐘',           tip: '転がる光輪の線から離れる' },
  spires:   { name: '尖塔の連打',     tip: '掃射の外側へ回り込む' },
  pillar:   { name: '天啓',           tip: '足元の光の輪が出たら止まらずに走る' },
  body:     { name: '大聖堂の巨体',   tip: '触れない。投げの間合いを保つ' },
  choir:    { name: '聖歌隊',         tip: '歌っている間に掴んで投げ返す' },
  mob:      { name: '群れ',           tip: '大聖堂の前にまず周りを片づける' },
  held:     { name: '掴んだ敵の暴れ', tip: '溜めすぎない' },
};
export const STAGE_NAMES = ['聖務', '堕天', '破鐘'];

// 裁きの一覧（順番＝判定の優先順）。id は記録の鍵なので変えない。title が称号、line が大聖堂の声。
// ★2026-09-13 rank＝順位（1が最上位・全32種で一意）。実プレイFB「傷なき異端者が最高位だと作者には分かるが、
//   プレーヤーには見えない」→ 結果画面と一覧に**第n位**と階位の印（王冠1〜3／金4〜12／銀13〜19／鉄20〜32）を出す。
//   順位の根拠＝クリアは条件の厳しさ（無被弾＞借り物なし＞60秒＞欠片＞聖歌隊8＞被弾5以下＞…＞回数）、
//   死は「どこまで届いたか」（残り10%＞欠片を掴んだ＞聖歌隊8＞破鐘＞第3段階の技＞第2段階の技＞…＞手を出さず＞迷い子）。
export const VERDICTS = [
  // ★2026-09-14 頂点（ユーザー指示）。被弾0＝一度も打たれずに覆した者だけ。一覧の最上段に単独で君臨する。
  //   実装上は到達可能（主人公148px/s に対し雑魚は26〜62／掴みの間合い78px は投げの拘束0.72秒に雑魚が詰める45pxより長い）。
  { id: 'clear_one', rank:  1,   title: 'the One',              line: '……傷ひとつ無く。汝は何だ。' },
  // ★2026-09-14 旧「傷なき異端者」（被弾0）は到達不能な条件だった（実測の最小は46・ボット57〜80）。
  //   被弾3＝3回まで間違えられる＝挑戦が成立する位置へ。無傷は上の the One が引き取った。
  { id: 'clear_pure', rank:  2,  title: '伝説を作りし者',       line: '……我が裁きは届かなかった。' },
  { id: 'clear_halo', rank:  5,  title: '光輪を返せし者',       line: '我が輪で我を穿つとは。' },
  { id: 'clear_choir', rank:  6, title: '聖歌隊を黙らせし者',   line: '歌は途絶えた。' },
  { id: 'clear_fast', rank:  4,  title: '刹那に裁きし者',       line: '祈る暇もなかったか。' },
  { id: 'clear_wing', rank:  7,  title: '翼を恐れぬ者',         line: '鉄の羽も汝を止められぬか。' },
  { id: 'clear_armor', rank:  8, title: '鎧を返せし者',         line: '我が装甲が我を砕くか。' },
  { id: 'clear_hand', rank:  3,  title: '己が手で覆せし者',     line: '借り物なしでここまで来たか。' },
  { id: 'clear_storm', rank:  9, title: '投げ続けし者',         line: '数で祈りを押し流したな。' },
  { id: 'clear_blood', rank: 12, title: '血にまみれし勝者',     line: '傷だらけでなお立つか。' },
  { id: 'clear_long', rank: 11,  title: '長き祈りを断ちし者',   line: '長い……長い祈りだった。' },
  { id: 'clear_again', rank: 13, title: '幾度も立ち上がりし者', line: '何度でも来るがよい……もう来ぬのか。' },
  { id: 'clear', rank: 10,       title: '裁きを覆せし者',       line: '祈り届かぬ者よ……汝が裁いたのだ。' },
  { id: 'near', rank: 14,        title: 'あと一歩の信徒',       line: 'あと一歩。それが永遠に遠い。' },
  { id: 'halo_dead', rank: 15,   title: '光輪を掴みし者',       line: '我が輪に触れたな。次は投げよ。' },
  { id: 'choir_dead', rank: 16,  title: '聖歌を止めし者',       line: '歌を止めても鐘は鳴る。' },
  { id: 'again', rank: 18,       title: '幾度も立ち上がる者',   line: '何度倒れても来るか。……よい。' },
  { id: 'lost', rank: 33,        title: '祈りの迷い子',         line: '何に打たれたかも分からぬままか。' },
  { id: 'idle', rank: 32,        title: '手を出さぬ巡礼者',     line: '投げぬ者に裁きは軽い。' },
  { id: 'rose', rank: 22,        title: '硝子に裁かれし者',     line: '赤と青。その間に道はあった。' },
  { id: 'bell', rank: 24,        title: '鐘の音に怯えし者',     line: '欠けた向きへ。輪はそう告げていた。' },
  { id: 'feathers', rank: 25,    title: '鉄の羽に貫かれし者',   line: '翼が上がるのを見ていなかったな。' },
  { id: 'whip', rank: 23,        title: '配線に縛られし者',     line: '正面に立つ者を鞭は逃さぬ。' },
  { id: 'crack', rank: 20,       title: '光輪に轢かれし者',     line: '外れた輪はもう我の物ではない。' },
  { id: 'spires', rank: 19,      title: '尖塔の雨に沈みし者',   line: '塔は二本ある。' },
  { id: 'pillar', rank: 21,      title: '天啓に灼かれし者',     line: '光は逃げた先にも降る。' },
  { id: 'body', rank: 26,        title: '巨体に潰されし者',     line: '近づきすぎた。祈りの間合いを知れ。' },
  { id: 'choir', rank: 27,       title: '聖歌に呑まれし者',     line: '歌う者は掴めるのだ。' },
  { id: 'mob', rank: 30,         title: '群れに呑まれし者',     line: '我の前にまず群れを払え。' },
  { id: 'held', rank: 29,        title: '溜めすぎし者',         line: '掴んだ手を離す時を誤ったな。' },
  { id: 'stage0', rank: 31,      title: '聖務に倒れし者',       line: 'まだ最初の祈りの途中だ。' },
  { id: 'stage1', rank: 28,      title: '堕天を見し者',         line: '硝子は深紅に染まった。そこで終わるか。' },
  { id: 'stage2', rank: 17,      title: '破鐘を聞きし者',       line: '鐘は割れた。あと少しだった。' },
];

// 当てはまる裁きを優先順に**全部**列挙する（珍しい行いほど上）。
// st: { clear, hits, throws, shardHits, specHits, shardShare(0..1), choirBest, haloHit, haloGrabbed,
//       deathCause, remainPct(0..100|null), stage(0..2|null), tries, bossSec }
export function matches(st) {
  const s = st || {};
  const out = [];
  if (s.clear) {
    if (s.hits === 0) out.push('clear_one');     // 頂（1位）＝一度も打たれていない
    if (s.hits <= 3) out.push('clear_pure');    // 2位＝3回まで。被弾0はこの上の行が拾う
    if (s.haloHit) out.push('clear_halo');
    if (s.choirBest >= 8) out.push('clear_choir');
    // ★2026-09-14 60→75秒（ユーザー承認）。60秒は届かない条件だった：無敵ボットでも 47〜56秒（雑魚なし・
    //   全弾命中の上限側）、人間の実プレイは45回で 71・97・123・136・141・152・171・191秒で最速71秒。
    //   条件は「上手い人が狙える」位置に置く＝最速記録のすぐ上に 75 を置き、王冠の3位を到達可能にする。
    if (s.bossSec > 0 && s.bossSec < 75) out.push('clear_fast');
    // ★2026-09-14 被弾5→15（ユーザー承認）。5 は誰も近づけない条件だった（人間の実測46〜52・ボット57〜259）。
    //   被弾の62〜90%は「自由に動けたとき」＝腕で減らせる分なので、雑魚の接触をほぼ消せば届く 15 に置く
    //   （1位 the One＝0／2位 伝説を作りし者＝3 との間に、金の帯の段として成立する距離を取る）。
    if (s.hits <= 15) out.push('clear_wing');
    if (s.shardShare >= 0.5) out.push('clear_armor');
    if (!s.shardHits && !s.haloHit && !s.specHits) out.push('clear_hand');
    if (s.throws >= 40) out.push('clear_storm');
    if (s.hits >= 20) out.push('clear_blood');
    if (s.bossSec >= 150) out.push('clear_long');
    if (s.tries >= 5) out.push('clear_again');
    out.push('clear');
  } else {
    const c = s.deathCause;
    if (s.remainPct != null && s.remainPct <= 10) out.push('near');
    if (s.haloGrabbed) out.push('halo_dead');
    if (s.choirBest >= 8) out.push('choir_dead');
    if (s.tries >= 5 && s.stage >= 2) out.push('again');
    if (s.stage === 0 && s.hits >= 10) out.push('lost');
    if (s.stage != null && s.throws <= 5 && s.bossSec >= 15) out.push('idle');
    if (c && VERDICTS.some((v) => v.id === c)) out.push(c);
    out.push('stage' + Math.max(0, Math.min(2, s.stage || 0)));
  }
  return out;
}

// 裁きを決める。当てはまるものの中で**まだ見ていない**最上位、全部見ていれば最上位。
export function judge(st, seen) {
  const ids = matches(st);
  const S = seen || {};
  const id = ids.find((k) => !S[k]) || ids[0];
  return VERDICTS.find((v) => v.id === id) || VERDICTS[VERDICTS.length - 1];
}

// ★2026-09-14 今回の行いが届いた最高位。judge は「まだ見ていない」ものを優先するので、表示の位より上に届いていることがある
//   （実プレイ55回目＝第5位の条件も満たしたのに第8位と出た＝下がって見えた）。Result が小さく1行添える。
export function bestReached(st) {
  let best = null;
  for (const id of matches(st)) {
    const v = VERDICTS.find((x) => x.id === id);
    if (v && (!best || v.rank < best.rank)) best = v;
  }
  return best;
}

// 階位（順位の帯）。icon は Result が描く印の種類（crown/gold/silver/iron）。
export const TIERS = [
  // ★2026-09-14 王冠の上に「頂」を新設（1位 the One のためだけの帯）。燦然と輝く＝Result が専用の印と脈打つ光で描く。
  { id: 'one',    name: '超越者', from: 1, to: 1,  color: '#ffffff' },   // 一覧では「超越者　1位」と出る（の裁き／n〜m位 を付けない）
  { id: 'crown',  name: '王冠', from: 2,  to: 4,  color: '#ffe066' },
  { id: 'gold',   name: '金',   from: 5,  to: 13, color: '#ffd23f' },
  { id: 'silver', name: '銀',   from: 14, to: 20, color: '#d8dfe8' },
  { id: 'iron',   name: '鉄',   from: 21, to: 33, color: '#8a90a8' },
];
export function tierOf(rank) { return TIERS.find((t) => rank >= t.from && rank <= t.to) || TIERS[TIERS.length - 1]; }
// 順位順の一覧（一覧画面用）
export function byRank() { return VERDICTS.slice().sort((a, b) => a.rank - b.rank); }

// ★2026-09-13 死んだ結果画面で、その回に**触れなかった鍵**を1つだけ指す（実プレイ5回で聖歌隊が分からなかった）。
//   戦闘中に文字は足さない原則のまま、結果画面で「次に試すこと」を1行だけ手渡す。優先＝出ていたのに使わなかった物。
//   st: { choirWaves(聖歌隊が出た回数), choirBest, stage, haloGrabbed, shardDrops(剥がれた枚数), shardHits }
// ★2026-09-13 撃破したのに鍵を使わなかった人へ「上の位へ行く道」を1行（実プレイ18回目＝欠片なしで第8位・上に7つ）。
//   まだ見ていない中で最も高い位を指す：欠片（4位）→聖歌隊8（5位）→装甲片（7位）→60秒（3位は速さの道・最後に）。
//   今回の位より上のものだけ。文字は結果画面にだけ足す。
export function clearHint(st, seen, curRank) {
  const s = st || {}, sn = seen || {};
  const cand = [
    { id: 'clear_halo', cond: !s.haloHit, text: '光輪の欠片を当てて覆せば' },
    { id: 'clear_choir', cond: !(s.choirBest >= 8), text: '聖歌隊8体を投げ返して覆せば' },
    { id: 'clear_armor', cond: !(s.shardShare >= 0.5), text: '与ダメの半分を装甲片で覆せば' },
    { id: 'clear_fast', cond: !(s.bossSec != null && s.bossSec < 75), text: '75秒以内に覆せば' },
    // ★2026-09-14 ユーザー指示：第3位（借り物なし）は案内の候補に無く、第4位の次が第2位へ飛んでいた＝画面のどこにも条件が出なかった
    { id: 'clear_hand', cond: !!(s.shardHits || s.haloHit || s.specHits), text: '装甲片・欠片・特殊弾を使わずに覆せば' },
    { id: 'clear_pure', cond: !(s.hits <= 3), text: '被弾3回までで覆せば' },
    { id: 'clear_one', cond: !(s.hits === 0), text: '一度も打たれずに覆せば' },
  ];
  for (const c of cand) {
    const v = VERDICTS.find((x) => x.id === c.id);
    if (!v || sn[c.id] || !c.cond) continue;
    if (curRank != null && v.rank >= curRank) continue;
    return { key: c.id, text: `${c.text} 第${v.rank}位「${v.title}」` };
  }
  return null;
}

export function keyHint(st) {
  const s = st || {};
  if (s.clear) return null;
  if (s.choirWaves > 0 && !(s.choirBest > 0)) return { key: 'choir', text: '光の輪をまとって歌う8体は掴んで大聖堂へ投げ返せる（聖歌隊 0/8）' };
  if (s.stage >= 2 && !s.haloGrabbed) return { key: 'halo', text: '転がって止まった光輪の欠片は掴んで投げ返せる（最大HPの25%）' };
  if (s.shardDrops > 0 && !(s.shardHits > 0)) return { key: 'shard', text: '大聖堂から剥がれた装甲片は掴んで投げ返すと特効' };
  return null;
}
