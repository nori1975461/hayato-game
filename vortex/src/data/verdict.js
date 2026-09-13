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
  rose:     { name: '薔薇窓の裁き',   tip: '赤い光柱の間に立ち、青が来る前に半歩ずれる' },
  bell:     { name: '鎮魂の鐘',       tip: '光輪の欠けた向きへ抜ける' },
  feathers: { name: '鉄羽の雨',       tip: '翼が上がったら走る。扇の端から抜ける' },
  whip:     { name: '配線の鞭',       tip: '正面に立たない。横へ抜ける' },
  crack:    { name: '破鐘',           tip: '転がる光輪の線から離れる' },
  spires:   { name: '尖塔の連打',     tip: '掃射の外側へ回り込む' },
  pillar:   { name: '天啓',           tip: '足元の光の輪が出たら、止まらずに走る' },
  body:     { name: '大聖堂の巨体',   tip: '触れない。投げの間合いを保つ' },
  choir:    { name: '聖歌隊',         tip: '歌っている間に掴んで投げ返す' },
  mob:      { name: '群れ',           tip: '大聖堂の前に、まず周りを片づける' },
  held:     { name: '掴んだ敵の暴れ', tip: '溜めすぎない' },
};
export const STAGE_NAMES = ['聖務', '堕天', '破鐘'];

// 裁きの一覧（順番＝一覧の表示順・判定の優先順）。id は記録の鍵なので変えない。title が称号、line が大聖堂の声。
export const VERDICTS = [
  { id: 'clear_pure',  title: '傷なき異端者',         line: '……我が裁きは、届かなかった。' },
  { id: 'clear_halo',  title: '光輪を返せし者',       line: '我が輪で、我を穿つとは。' },
  { id: 'clear_choir', title: '聖歌隊を黙らせし者',   line: '歌は、途絶えた。' },
  { id: 'clear_fast',  title: '刹那に裁きし者',       line: '祈る暇も、なかったか。' },
  { id: 'clear_wing',  title: '翼を恐れぬ者',         line: '鉄の羽も、汝を止められぬか。' },
  { id: 'clear_armor', title: '鎧を返せし者',         line: '我が装甲が、我を砕くか。' },
  { id: 'clear_hand',  title: '己が手で覆せし者',     line: '借り物なしで、ここまで来たか。' },
  { id: 'clear_storm', title: '投げ続けし者',         line: '数で、祈りを押し流したな。' },
  { id: 'clear_blood', title: '血にまみれし勝者',     line: '傷だらけで、なお立つか。' },
  { id: 'clear_long',  title: '長き祈りを断ちし者',   line: '長い、長い祈りだった。' },
  { id: 'clear_again', title: '幾度も立ち上がりし者', line: '何度でも来るがよい……もう、来ぬのか。' },
  { id: 'clear',       title: '裁きを覆せし者',       line: '祈り届かぬ者よ……汝が、裁いたのだ。' },
  { id: 'near',        title: 'あと一歩の信徒',       line: 'あと一歩。それが、永遠に遠い。' },
  { id: 'halo_dead',   title: '光輪を掴みし者',       line: '我が輪に触れたな。次は、投げよ。' },
  { id: 'choir_dead',  title: '聖歌を止めし者',       line: '歌を止めても、鐘は鳴る。' },
  { id: 'again',       title: '幾度も立ち上がる者',   line: '何度倒れても来るか。……よい。' },
  { id: 'lost',        title: '祈りの迷い子',         line: '何に打たれたかも、分からぬままか。' },
  { id: 'idle',        title: '手を出さぬ巡礼者',     line: '投げぬ者に、裁きは軽い。' },
  { id: 'rose',        title: '硝子に裁かれし者',     line: '赤と青。その間に、道はあった。' },
  { id: 'bell',        title: '鐘の音に怯えし者',     line: '欠けた向きへ。輪は、そう告げていた。' },
  { id: 'feathers',    title: '鉄の羽に貫かれし者',   line: '翼が上がるのを、見ていなかったな。' },
  { id: 'whip',        title: '配線に縛られし者',     line: '正面に立つ者を、鞭は逃さぬ。' },
  { id: 'crack',       title: '光輪に轢かれし者',     line: '外れた輪は、もう我の物ではない。' },
  { id: 'spires',      title: '尖塔の雨に沈みし者',   line: '塔は、二本ある。' },
  { id: 'pillar',      title: '天啓に灼かれし者',     line: '光は、逃げた先にも降る。' },
  { id: 'body',        title: '巨体に潰されし者',     line: '近づきすぎた。祈りの間合いを知れ。' },
  { id: 'choir',       title: '聖歌に呑まれし者',     line: '歌う者は、掴めるのだ。' },
  { id: 'mob',         title: '群れに呑まれし者',     line: '我の前に、まず群れを払え。' },
  { id: 'held',        title: '溜めすぎし者',         line: '掴んだ手を、離す時を誤ったな。' },
  { id: 'stage0',      title: '聖務に倒れし者',       line: 'まだ、最初の祈りの途中だ。' },
  { id: 'stage1',      title: '堕天を見し者',         line: '硝子は深紅に染まった。そこで終わるか。' },
  { id: 'stage2',      title: '破鐘を聞きし者',       line: '鐘は割れた。あと少し、だった。' },
];

// 当てはまる裁きを優先順に**全部**列挙する（珍しい行いほど上）。
// st: { clear, hits, throws, shardHits, specHits, shardShare(0..1), choirBest, haloHit, haloGrabbed,
//       deathCause, remainPct(0..100|null), stage(0..2|null), tries, bossSec }
export function matches(st) {
  const s = st || {};
  const out = [];
  if (s.clear) {
    if (s.hits === 0) out.push('clear_pure');
    if (s.haloHit) out.push('clear_halo');
    if (s.choirBest >= 8) out.push('clear_choir');
    if (s.bossSec > 0 && s.bossSec < 60) out.push('clear_fast');
    if (s.hits <= 5) out.push('clear_wing');
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
