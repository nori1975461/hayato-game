#!/bin/bash
# 0922/８ の一式＝育つ＋いちばん先で波動＋ライフルのように撃ち出す（候補 118 が既定）
#   bash build-gaika2-folder38.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./resume-gaika-now.mjs').then(m=>console.log(JSON.stringify(m.CANDS[$1].o)))"; }
C117=$(J 117); C118=$(J 118); C119=$(J 119); C120=$(J 120); C121=$(J 121); C122=$(J 122); C123=$(J 123)
GROW=$(node -e "import('./gaika-candidates.mjs').then(m=>{const o=m.GAIKA2_FINAL_OPT;console.log(JSON.stringify({...o,openGun:{...o.openGun,tipBurst:0}}))})")
PRE=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, moonsSeated:true, openHole:'none'})))")

node render-gaika2-cand-grid.mjs "$OUT/１_最終形態（等倍の全身・育つ＋波動）.png" 1 0 -20 1 560 340 "118 FINAL=$C118"
node render-gaika2-cand-grid.mjs "$OUT/２_光の先の波動（4倍）.png" 4 -215 8 1 640 220 "118 TIP BURST=$C118"
node render-gaika2-cand-grid.mjs "$OUT/３_撃つ瞬間（2倍・上＝A 波動が残り弾が出る／下＝B 波動そのものが飛ぶ）.png" 2 -240 4 1 640 170 "A BURST STAYS + SHOTS=$C121" "B THE BURST FLIES=$C122"   # 枠の高さ 170＝B の三つ目の波動（y 30）が下で切れないように
node render-gaika2-cand-grid.mjs "$OUT/４_波動の大きさ（3倍・上から 12／16 既定／20）.png" 3 -228 6 1 640 110 "R12=$C119" "R16 (DEFAULT)=$C118" "R20=$C120"
node render-gaika2-cand-grid.mjs "$OUT/５_前後（2倍・上＝昨夜の確定 117／中＝育つだけ／下＝育つ＋波動 118）.png" 2 -200 -4 1 640 130 "117 (LAST NIGHT)=$C117" "GROW ONLY=$GROW" "118 GROW + BURST=$C118"
node render-gaika2-cand-grid.mjs "$OUT/６_（ご参考）撃つ瞬間 C＝波動＋曳光弾（2倍）.png" 2 -240 4 1 640 170 "C BURST + TRACER=$C123"
node render-gaika2-cand-grid.mjs "$OUT/７_月牙の放射前と放射後（等倍・撮り直し）.png" 1 0 -20 2 560 340 "BEFORE LAUNCH=$PRE" "AFTER LAUNCH=$C118"

# クリックページ＝同じ枠（2 倍・砲身から弾まで）で 1 クリック 1 変化
CV="$OUT/クリック用"
mkdir -p "$CV"
node render-gaika2-cand-grid.mjs "$CV/c1.png" 2 -240 4 1 640 170 "1 LAST NIGHT (117)=$C117"
node render-gaika2-cand-grid.mjs "$CV/c2.png" 2 -240 4 1 640 170 "2 + GROW=$GROW"
node render-gaika2-cand-grid.mjs "$CV/c3.png" 2 -240 4 1 640 170 "3 + TIP BURST 16 (118 DEFAULT)=$C118"
node render-gaika2-cand-grid.mjs "$CV/c4.png" 2 -240 4 1 640 170 "4 BURST 12=$C119"
node render-gaika2-cand-grid.mjs "$CV/c5.png" 2 -240 4 1 640 170 "5 BURST 20=$C120"
node render-gaika2-cand-grid.mjs "$CV/c6.png" 2 -240 4 1 640 170 "6 FIRING A: BURST STAYS=$C121"
node render-gaika2-cand-grid.mjs "$CV/c7.png" 2 -240 4 1 640 170 "7 FIRING B: THE BURST FLIES=$C122"
node render-gaika2-cand-grid.mjs "$CV/c8.png" 2 -240 4 1 640 170 "8 FIRING C: TRACER=$C123"
node make-click-viewer.mjs "$CV" "蒼神骸華 三本目の光＝育つ＋波動＋撃つ（2倍）" \
  "c1.png|1 昨夜の確定（117）|砲身＋粒立った脈・波動なし" \
  "c2.png|2 ＋育つ|粒が先へ行くほど大きくなる（grow 0.7）" \
  "c3.png|3 ＋波動 16（118＝いまの既定）|いちばん先で結晶状の閃光になる" \
  "c4.png|4 波動 12|小さめ" \
  "c5.png|5 波動 20|大きめ" \
  "c6.png|6 撃つ瞬間 A|波動が残り その縁からご承認の弾が出る" \
  "c7.png|7 撃つ瞬間 B|波動そのものが弾として飛ぶ" \
  "c8.png|8 撃つ瞬間 C（参考）|波動＋曳光弾（加速）"
node check-click-viewer.mjs "$CV" 2>&1 | tail -1
echo "FOLDER38_OK"
