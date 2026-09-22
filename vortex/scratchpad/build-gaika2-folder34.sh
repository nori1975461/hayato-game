#!/bin/bash
# 0922/４ の一式＝蒼神骸華の全身を Version（段階）ごとに撮る（ユーザー 2026-09-22 18:05「Version ごとに撮影して・それぞれ全身画像を確認できるように」）
#   1 基本 → 2 蒼の装甲が満ち始める → 3 ほぼ満つる → 4 完全に満つる（皆既） → 5 最終形態・月牙放射前 → 6 最終形態・月牙放射後 → 7 炉心光る（鍵が入った姿）
#   bash build-gaika2-folder34.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(eval('(' + process.argv[1] + ')'))))" "$1"; }
S1=$(J '({ ...m.GAIKA2_DEF53 })')
S2=$(J '({ ...m.GAIKA2_DEF53, dormantX: { kind: "umbra", r: 145 } })')
S3=$(J '({ ...m.GAIKA2_DEF53, dormantX: { kind: "umbra", r: 180 } })')
S4=$(J '({ ...m.GAIKA2_DEF53, dormantX: { kind: "umbra", r: 215, inner: true, burn: "R" } })')
S5=$(J '({ ...m.GAIKA2_FINAL_OPT, moonsSeated: true, openHole: "none" })')
S6=$(J '({ ...m.GAIKA2_FINAL_OPT })')
S7=$(J '({ ...m.GAIKA2_KEYDOWN_OPT })')

NAMES=("１_基本" "２_蒼の装甲が満ち始める" "３_蒼の装甲がほぼ満つる" "４_蒼の装甲が完全に満つる（皆既）" "５_最終形態（月牙放射前）" "６_最終形態（月牙放射後）" "７_炉心光る（鍵が入った姿）")
TAGS=("1 BASE" "2 FILLING" "3 NEARLY FULL" "4 FULL (TOTAL ECLIPSE)" "5 FINAL: BEFORE LAUNCH" "6 FINAL: AFTER LAUNCH" "7 CORE LIT (KEY IN)")
ARGS=("$S1" "$S2" "$S3" "$S4" "$S5" "$S6" "$S7")

# 各段階＝2 倍の全身（世界 480×360＝飛んだ月牙と刃先まで入る枠）。クリックページの写真と同じもの
C="$OUT/８_7段階をクリックで順に見るページ"
mkdir -p "$C"
SPECS=()
for i in 0 1 2 3 4 5 6; do
  LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$C/${NAMES[$i]}.png" 2 0 -20 1 960 720 "${TAGS[$i]}=${ARGS[$i]}" > /dev/null
  cp "$C/${NAMES[$i]}.png" "$OUT/${NAMES[$i]}.png"
  SPECS+=("${NAMES[$i]}.png|${NAMES[$i]#*_}|")
done

# 一覧＝等倍で 7 段階を 4 列に
node render-gaika2-cand-grid.mjs "$OUT/９_一覧（等倍・7段階を順に）.png" 1 0 -20 4 480 360 \
  "${TAGS[0]}=$S1" "${TAGS[1]}=$S2" "${TAGS[2]}=$S3" "${TAGS[3]}=$S4" "${TAGS[4]}=$S5" "${TAGS[5]}=$S6" "${TAGS[6]}=$S7"

node make-click-viewer.mjs "$C" "蒼神骸華 7 段階（基本 → 満ちる → 皆既 → 最終形態 放射前／後 → 炉心光る）" \
  "${NAMES[0]}.png|1 基本|ふだんの姿（第53稿・候補 63）。蝕の闇は板の下半分（r115）" \
  "${NAMES[1]}.png|2 蒼の装甲が満ち始める|昇る蝕の闇が板を上へ満たし始める（r145・仮の値）" \
  "${NAMES[2]}.png|3 蒼の装甲がほぼ満つる|闇が板の上端近くまで（r180・仮の値）" \
  "${NAMES[3]}.png|4 完全に満つる（皆既）|板が全部闇に呑まれ 縁が灼ける（r215・inner・burn）" \
  "${NAMES[4]}.png|5 最終形態・月牙放射前|蒼の装甲が開き 肩の腕と光刃が出て 胸の炉が開く。月牙は開いた板の座に載ったまま（今日作った口 moonsSeated）" \
  "${NAMES[5]}.png|6 最終形態・月牙放射後|六枚とも座を離れて有線で飛ぶ。座には月牙の形の窪みと軌条と金の留め具（候補 95）" \
  "${NAMES[6]}.png|7 炉心光る（鍵が入った姿）|左肩の板が落ちて面取りになり 胸の炉の扉が開いて炉心が灯る（候補 87）"

echo "FOLDER34_OK"
