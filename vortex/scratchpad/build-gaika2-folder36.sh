#!/bin/bash
# 0922/６ の一式＝D（砲身＋脈打つ光）への「もうひとひねり」（2026-09-22 22:57 のご指示）
#   bash build-gaika2-folder36.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, saberLen:120, openGun:{kind:'saber',style:'pulse',barrel:20, ...JSON.parse(process.argv[1])}})))" "$1"; }
D0=$(J '{}')
T1=$(J '{"gapPulse":0.65}')
T2=$(J '{"gapPulse":0.65,"grow":0.7}')
T3=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true}')
PICK=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true,"asym":true}')
SKEW=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true,"asym":true,"skew":0.8}')
CORE=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true,"darkCore":0.7}')
RING=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true,"rings":true}')
G40=$(J '{"gapPulse":0.4,"grow":0.7,"chamber":true}')
G85=$(J '{"gapPulse":0.85,"grow":0.7,"chamber":true}')
FIRE=$(J '{"gapPulse":0.65,"grow":0.7,"chamber":true,"asym":true,"shots":3}')

# １ 土台と推し（3倍）
node render-gaika2-cand-grid.mjs "$OUT/１_土台と推し（3倍・上＝いまのD／下＝ひねり後）.png" \
  3 -172 -11 1 640 130 "D (AS PICKED)=$D0" "PROPOSED=$T3"

# ２ ひねりの部品（3倍・上から 粒／育つ／薬室／走る脈／蝕の芯（不採用）／磁環（不採用））
node render-gaika2-cand-grid.mjs "$OUT/２_ひねりの部品（3倍・上から 粒／育つ／薬室／走る脈／蝕の芯＝不採用／磁環＝不採用）.png" \
  3 -172 -11 1 640 130 "1 GRAINY=$T1" "2 + GROWING=$T2" "3 + CHAMBER=$T3" "4 + RUNNING=$SKEW" "X DARK CORE (NO)=$CORE" "X RINGS (NO)=$RING"

# ３ 粒立ちの強さ（3倍）
node render-gaika2-cand-grid.mjs "$OUT/３_粒立ちの強さ（3倍・上から 弱0.40／中0.65＝推し／強0.85）.png" \
  3 -172 -11 1 640 130 "WEAK 0.40=$G40" "MID 0.65 (PROPOSED)=$T3" "STRONG 0.85=$G85"

# ４ 等倍の全身（土台と推し＝左右で脈をずらしてある）
node render-gaika2-cand-grid.mjs "$OUT/４_等倍の全身（左＝いまのD／右＝ひねり後・左右で脈がずれています）.png" \
  1 0 -20 2 560 340 "D=$D0" "PROPOSED=$PICK"

# ５ 撃つ瞬間（2倍）＝育った粒がそのまま弾として離れる
node render-gaika2-cand-grid.mjs "$OUT/５_撃つ瞬間（2倍・育った粒がそのまま弾として離れます）.png" \
  2 -200 -6 1 640 160 "FIRING=$FIRE"

# ６ クリックページ（1 クリックで足すひねりは一つだけ）
S="$OUT/６_ひねりを一つずつ足して見るページ"
mkdir -p "$S"
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/1_いまのD（砲身＋脈打つ光）.png"     2 -150 -14 1 1040 360 "D=$D0"   > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/2_＋粒立ち.png"                       2 -150 -14 1 1040 360 "+GRAINY=$T1" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/3_＋先へ行くほど育つ.png"             2 -150 -14 1 1040 360 "+GROWING=$T2" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/4_＋砲身の薬室と放熱フィン.png"       2 -150 -14 1 1040 360 "+CHAMBER=$T3" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/5_＋走る脈（別案）.png"               2 -150 -14 1 1040 360 "+RUNNING=$SKEW" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/6_蝕の芯（不採用）.png"               2 -150 -14 1 1040 360 "DARK CORE=$CORE" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/7_磁環（不採用）.png"                 2 -150 -14 1 1040 360 "RINGS=$RING" > /dev/null
node make-click-viewer.mjs "$S" "D へのひねりを一つずつ足す（最後の 2 枚は測って落とした案）" \
  "1_いまのD（砲身＋脈打つ光）.png|D いまの形|0922/５ でお選びいただいた 砲身＋脈打つ光" \
  "2_＋粒立ち.png|＋粒立ち|節と節の間を細らせて 光の粒が連なって見えるように（強さは 3 段階から選べます）" \
  "3_＋先へ行くほど育つ.png|＋育つ|粒が先へ行くほど大きくなる＝外へ送られて育つ。いちばん先の粒がそのまま弾になります" \
  "4_＋砲身の薬室と放熱フィン.png|＋砲身の作り込み|筒の隙間から中の光が漏れ 短い羽根（放熱フィン）が出る。光には触っていません" \
  "5_＋走る脈（別案）.png|別案＝走る脈|粒の前側を立てて 後ろへ尾を引かせた形。動かしたときに外へ走って見えます" \
  "6_蝕の芯（不採用）.png|測って落とした案①＝蝕の芯|光の中に黒い糸を通す案。等倍で光の量が 17% 減り 4 か所で切れて 細く弱く見えました" \
  "7_磁環（不採用）.png|測って落とした案②＝磁環|光の脇に金の輪を並べる案。光を横切らせると 21 か所で断ち切られ「金の棒」に見え 外に出すと ただの金の粒になりました"

echo "FOLDER36_OK"
