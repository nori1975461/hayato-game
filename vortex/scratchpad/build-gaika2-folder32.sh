#!/bin/bash
# 0922/２ の一式＝「開」の姿の確定（跡＝窪み＋金具／三本目の腕はマゼンタの光刃）と、作って捨てた色の案
#   bash build-gaika2-folder32.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

FIXED=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(m.GAIKA2_FINAL_OPT)))")
J() { node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, ...JSON.parse(process.argv[1])})))" "$1"; }
GOLD=$(J '{"openGun":{"kind":"saber","tone":"gold"}}')
SILVER=$(J '{"openGun":{"kind":"saber","tone":"silver"}}')

node render-gaika2-closeup-sheet.mjs "$OUT/１_確定した「開」の姿（上半身3倍｜等倍の全身／刃の拡大6倍）.png" 128 -22 "FIXED=$FIXED" > /dev/null

node render-gaika2-cand-grid.mjs "$OUT/２_刃の色（3倍・左から 採用＝マゼンタ／却下＝白金／却下＝白銀）.png" \
  3 128 -22 3 208 208 "1 MAGENTA（採用）=$FIXED" "2 PLATINUM（却下）=$GOLD" "3 SILVER（却下）=$SILVER"

node render-gaika2-cand-grid.mjs "$OUT/３_刃の色（等倍・両肩が入る帯・上から マゼンタ／白金／白銀）.png" \
  2 0 -24 1 640 104 "1 MAGENTA=$FIXED" "2 PLATINUM=$GOLD" "3 SILVER=$SILVER"

S="$OUT/４_確定版と却下案をクリックで見るページ"
mkdir -p "$S"
node render-gaika2-closeup-sheet.mjs "$S/1_採用＝マゼンタの光刃.png" 128 -22 "MAGENTA=$FIXED"  > /dev/null
node render-gaika2-closeup-sheet.mjs "$S/2_却下＝白金の刃.png"       128 -22 "PLATINUM=$GOLD" > /dev/null
node render-gaika2-closeup-sheet.mjs "$S/3_却下＝白銀の刃.png"       128 -22 "SILVER=$SILVER" > /dev/null

node make-click-viewer.mjs "$S" "三本目の腕の刃の色＝採用（マゼンタ）と 作って捨てた 2 案" \
  "1_採用＝マゼンタの光刃.png|1 マゼンタ（採用）|機体の中で埋もれない唯一の色（同系色が機体のほかにあるのは 1.90%）" \
  "2_却下＝白金の刃.png|2 白金（却下）|胸の炉と同じ色域にして差をつける案。拡大では金の棒に見え 等倍では輪の炎と胸の金に埋もれた（8.46%）" \
  "3_却下＝白銀の刃.png|3 白銀（却下）|機体の鋼と同系色（15.10%）＝塗っていない金属に見える"

echo "FOLDER32_OK"
