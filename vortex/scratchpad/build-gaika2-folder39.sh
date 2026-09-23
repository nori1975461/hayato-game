#!/bin/bash
# 0923/１ の一式＝波動は大きい方（20）を既定に・撃つ瞬間は弾でなく波動から一直線のレーザー（候補 120 が既定・124/125 が撃つ瞬間）
#   bash build-gaika2-folder39.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./resume-gaika-now.mjs').then(m=>console.log(JSON.stringify(m.CANDS[$1].o)))"; }
C120=$(J 120); C122=$(J 122); C124=$(J 124); C125=$(J 125)
PRE=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, moonsSeated:true, openHole:'none'})))")

node render-gaika2-cand-grid.mjs "$OUT/１_最終形態（等倍の全身・波動 20）.png" 1 0 -20 1 560 340 "120 FINAL=$C120"
node render-gaika2-cand-grid.mjs "$OUT/２_撃つ瞬間＝波動から一直線のレーザー（2倍・上＝細い／下＝太い）.png" 2 -270 10 1 640 180 "THIN (HALF WIDTH 2.4)=$C124" "THICK (HALF WIDTH 3.6)=$C125"
node render-gaika2-cand-grid.mjs "$OUT/３_レーザーの根元（4倍・波動の芯から出る）.png" 4 -250 22 1 640 200 "ROOT 4X (THIN)=$C124"
node render-gaika2-cand-grid.mjs "$OUT/４_前後（2倍・上＝前回の B 弾が飛ぶ／下＝レーザー）.png" 2 -270 10 1 640 180 "BEFORE: BULLETS (B)=$C122" "NOW: RAY (THIN)=$C124"
node render-gaika2-cand-grid.mjs "$OUT/５_月牙の放射前と放射後（等倍・波動 20 で撮り直し）.png" 1 0 -20 2 560 340 "BEFORE LAUNCH=$PRE" "AFTER LAUNCH=$C120"

CV="$OUT/クリック用"
mkdir -p "$CV"
node render-gaika2-cand-grid.mjs "$CV/c1.png" 2 -270 10 1 640 180 "1 CHARGED (120 DEFAULT)=$C120"
node render-gaika2-cand-grid.mjs "$CV/c2.png" 2 -270 10 1 640 180 "2 FIRING: THIN RAY=$C124"
node render-gaika2-cand-grid.mjs "$CV/c3.png" 2 -270 10 1 640 180 "3 FIRING: THICK RAY=$C125"
node make-click-viewer.mjs "$CV" "蒼神骸華 三本目の光＝波動 20 からレーザー（2倍）" \
  "c1.png|1 撃つ前（120＝いまの既定）|育つ光の先に波動 20" \
  "c2.png|2 撃つ瞬間＝細いレーザー|半幅 2.4・白い芯が全長に通る" \
  "c3.png|3 撃つ瞬間＝太いレーザー|半幅 3.6＝育つ前の光と同じ太さ"
node check-click-viewer.mjs "$CV" 2>&1 | tail -1
echo "FOLDER39_OK"
