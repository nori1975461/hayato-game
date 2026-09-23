#!/bin/bash
# 0923/２ の一式＝撃つ瞬間は太いレーザーで確定（GAIKA2_FIRING＝候補 125）・効果音は D で確定（照射版）
#   bash build-gaika2-folder40.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

FIRE=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(m.GAIKA2_FIRING_OPT)))")
FIN=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(m.GAIKA2_FINAL_OPT)))")
THIN=$(node -e "import('./resume-gaika-now.mjs').then(m=>console.log(JSON.stringify(m.CANDS[124].o)))")

node render-gaika2-cand-grid.mjs "$OUT/１_撃つ瞬間（等倍の全身・太いレーザー）.png" 1 0 -20 1 560 340 "FIRING (FIXED)=$FIRE"
node render-gaika2-cand-grid.mjs "$OUT/２_撃つ瞬間（2倍・砲身から先）.png" 2 -270 10 1 640 180 "FIRING (THICK RAY)=$FIRE"
node render-gaika2-cand-grid.mjs "$OUT/３_レーザーの根元（4倍・波動の芯から出る）.png" 4 -250 8 1 640 240 "ROOT 4X=$FIRE"
node render-gaika2-cand-grid.mjs "$OUT/４_撃つ前と撃つ瞬間（2倍・上＝撃つ前／下＝撃つ）.png" 2 -270 10 1 640 180 "BEFORE (CHARGED)=$FIN" "FIRING=$FIRE"
node render-gaika2-cand-grid.mjs "$OUT/５_（記録）落とした細いレーザー（2倍・上＝細い／下＝確定した太い）.png" 2 -270 10 1 640 180 "REJECTED (THIN 2.4)=$THIN" "FIXED (THICK 3.6)=$FIRE"
echo "FOLDER40_OK"
