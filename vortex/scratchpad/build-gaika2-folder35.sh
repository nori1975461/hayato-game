#!/bin/bash
# 0922/５ の一式＝三本目の光刃を「レーザー兵器」に（長さ＋形の案・2026-09-22 19:34 のご指示）
#   bash build-gaika2-folder35.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, ...JSON.parse(process.argv[1])})))" "$1"; }
NOW=$(J '{}')
A=$(J '{"saberLen":120}')
B=$(J '{"saberLen":120,"openGun":{"kind":"saber","style":"beam","barrel":20}}')
C=$(J '{"saberLen":120,"openGun":{"kind":"saber","style":"cone","barrel":20}}')
D=$(J '{"saberLen":120,"openGun":{"kind":"saber","style":"pulse","barrel":20}}')
E=$(J '{"saberLen":120,"openGun":{"kind":"saber","style":"beam"}}')
L70=$(J '{"saberLen":70,"openGun":{"kind":"saber","style":"beam","barrel":20}}')
L150=$(J '{"saberLen":150,"openGun":{"kind":"saber","style":"beam","barrel":20}}')
FIRE=$(J '{"saberLen":120,"openGun":{"kind":"saber","style":"beam","barrel":20,"shots":3}}')

# １ 形の見比べ（3倍）
node render-gaika2-cand-grid.mjs "$OUT/１_形の見比べ（3倍・上から いまの姿／長いだけ／砲身＋等幅／砲身＋広がる／砲身＋脈／砲身なし）.png" \
  3 -172 -11 1 640 130 "0 NOW (BLADE L70)=$NOW" "A LONGER BLADE L120=$A" "B BARREL + STRAIGHT BEAM=$B" "C BARREL + WIDENING BEAM=$C" "D BARREL + PULSING BEAM=$D" "E NO BARREL (CONTROL)=$E"

# ２ 等倍の全身（いまの姿と 私の推し）
node render-gaika2-cand-grid.mjs "$OUT/２_等倍の全身（左＝いまの姿／右＝砲身＋等幅の光）.png" \
  1 0 -20 2 560 340 "0 NOW=$NOW" "B BARREL + BEAM=$B"

# ３ 柄まわり（6倍・砲身のあり／なし）
node render-gaika2-cand-grid.mjs "$OUT/３_柄まわりの6倍（左＝砲身なし／右＝砲身あり＝光は筒の口から出る）.png" \
  6 -118 -26 2 320 200 "E NO BARREL=$E" "B BARREL=$B"

# ４ 長さ（等倍の全身・砲身＋等幅で 70／120／150）
node render-gaika2-cand-grid.mjs "$OUT/４_長さの見比べ（等倍・左から 70／120／150）.png" \
  1 0 -20 3 560 340 "L70=$L70" "L120 (PROPOSED)=$B" "L150=$L150"

# ５ 撃つ瞬間（2倍）
node render-gaika2-cand-grid.mjs "$OUT/５_撃つ瞬間（2倍・光弾は光の先から出る）.png" \
  2 -215 -4 1 640 150 "B FIRING=$FIRE"

# ６ クリックページ（同じ枠・2倍）
S="$OUT/６_6案をクリックで見るページ"
mkdir -p "$S"
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/1_いまの姿（刃・長さ70）.png"        2 0 -20 1 1040 700 "0 NOW=$NOW" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/2_長いだけ（刃のまま・120）.png"      2 0 -20 1 1040 700 "A LONGER BLADE=$A" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/3_砲身＋等幅の光.png"                  2 0 -20 1 1040 700 "B BARREL + BEAM=$B" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/4_砲身＋先へ広がる光.png"              2 0 -20 1 1040 700 "C BARREL + CONE=$C" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/5_砲身＋脈打つ光.png"                  2 0 -20 1 1040 700 "D BARREL + PULSE=$D" > /dev/null
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$S/6_砲身なし・等幅の光（対照）.png"      2 0 -20 1 1040 700 "E NO BARREL=$E" > /dev/null
node make-click-viewer.mjs "$S" "三本目の光刃＝レーザー兵器の形（6 案）" \
  "1_いまの姿（刃・長さ70）.png|0 いまの姿|長さ 70・先へ細る刃の形・柄は鍔（刀の記号）" \
  "2_長いだけ（刃のまま・120）.png|A 長いだけ|長さだけ 120 に。形は刃のまま＝長い剣に見える" \
  "3_砲身＋等幅の光.png|B 砲身＋等幅の光（私の推し）|手の先に灰の筒（砲身）があり その口から等幅の光が出る。先は尖らせず切ったまま" \
  "4_砲身＋先へ広がる光.png|C 砲身＋先へ広がる光|根元が細く先へ広がる＝剣ではありえない形。いちばん「刃でない」" \
  "5_砲身＋脈打つ光.png|D 砲身＋脈打つ光|等幅の光に節が流れる＝エネルギーが送られて見える" \
  "6_砲身なし・等幅の光（対照）.png|E 砲身なし（対照）|B から砲身だけ外したもの＝砲身が効いているかを見るための一枚"

echo "FOLDER35_OK"
