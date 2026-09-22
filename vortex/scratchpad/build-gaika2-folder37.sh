#!/bin/bash
# 0922/７ の一式＝三本目の武器が確定（砲身＋粒立った脈の光・薬室と放熱フィン）＝確認用
#   bash build-gaika2-folder37.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

FIX=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(m.GAIKA2_FINAL_OPT)))")
PRE=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, moonsSeated:true, openHole:'none'})))")
FIRE=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, openGun:{...m.GAIKA2_FINAL_OPT.openGun, shots:3}})))")
OLD=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, saberLen:70, openGun:'saber'})))")

node render-gaika2-cand-grid.mjs "$OUT/１_確定した最終形態（等倍の全身）.png" 1 0 -20 1 560 340 "FIXED=$FIX"
node render-gaika2-cand-grid.mjs "$OUT/２_砲身まわり（4倍・薬室の隙間と放熱フィン）.png" 4 -122 -24 1 640 220 "BARREL=$FIX"
node render-gaika2-cand-grid.mjs "$OUT/３_撃つ瞬間（2倍）.png" 2 -200 -6 1 640 160 "FIRING=$FIRE"
node render-gaika2-cand-grid.mjs "$OUT/４_月牙の放射前と放射後（等倍・武器が新しくなった分の撮り直し）.png" 1 0 -20 2 560 340 "BEFORE LAUNCH=$PRE" "AFTER LAUNCH=$FIX"
node render-gaika2-cand-grid.mjs "$OUT/５_ここまでの変化（3倍・上＝9-22 昼の光刃／下＝確定した砲）.png" 3 -172 -11 1 640 130 "WAS (NOON)=$OLD" "NOW (FIXED)=$FIX"

# ６ （ご参考）弾を「曳光弾＋加速」にする別案＝ご承認いただいた１の弾と並べる
TR=$(node -e "import('./gaika-candidates.mjs').then(m=>{const o=m.GAIKA2_FINAL_OPT;console.log(JSON.stringify({...o,openGun:{...o.openGun,shots:3,shotShape:'tracer',accel:3}}))})")
node render-gaika2-cand-grid.mjs "$OUT/６_（ご参考）弾の別案（2倍・上＝ご承認の弾／下＝曳光弾＋加速）.png"   2 -215 -4 1 640 150 "1 APPROVED=$FIRE" "2 TRACER (ALT)=$TR"

echo "FOLDER37_OK"
