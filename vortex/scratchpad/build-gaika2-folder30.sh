#!/bin/bash
# 0921/５ の一式＝割れ目の奥に機械を詰める 4 案＋月牙 6 枚の最終攻撃の検証
#   bash build-gaika2-folder30.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"
SUB="$OUT/２_全体像と割れ目の拡大 5 枚＋ブラウザでクリックして見るページ"
mkdir -p "$SUB"

# 一覧（4 倍・1 クリックで変わるのが一つだけの順）
node render-gaika2-core-grid.mjs "$OUT/１_割れ目の奥の一覧（4倍・左から いまのまま／送弾機構だけ／配管だけ／両方／いちばん詰める）.png" \
  "1 NOW=rack" "2 WORKS=works" "3 PIPES=pipes" "4 PACKED=packed" "5 DENSE=dense"

# 一枚ずつ（上半身 3 倍｜等倍の全身／割れ目 6 倍）
i=0
for pair in "1_いまのまま（黒い空洞）:rack" "2_送弾機構だけ:works" "3_配管だけ:pipes" "4_機構と配管の両方（私の推し）:packed" "5_いちばん詰める（管を四本ずつ＋残り火）:dense"; do
  name="${pair%%:*}"; core="${pair##*:}"
  J=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, openCore:'$core'})))")
  node render-gaika2-closeup-sheet.mjs "$SUB/$name.png" 45 -90 "$(echo "$core" | tr 'a-z' 'A-Z')=$J" > /dev/null
  i=$((i+1))
done

node make-click-viewer.mjs "$SUB" "蒼の装甲が割れた奥＝機械の詰め方 5 種（月牙 6 枚を射出したところ）" \
  "1_いまのまま（黒い空洞）.png|1 いまのまま|黒い面に黒鉄の軌条が一本だけ。有線の行き先が空洞に見える" \
  "2_送弾機構だけ.png|2 送弾機構だけ|中央に主軌条 座の真後ろに射出シリンダー。いちばん静か" \
  "3_配管だけ.png|3 配管だけ|外側に動力の配管の束（節つき）と いちばん外の隙間の残り火" \
  "4_機構と配管の両方（私の推し）.png|4 両方（私の推し）|中央＝送弾機構 外側＝配管。縦と横を交差させないので格子に見えない" \
  "5_いちばん詰める（管を四本ずつ＋残り火）.png|5 いちばん詰める|管を四本ずつ＋残り火。いちばん機械が詰まるが 暗がりの小さな赤が増える" \
  > /dev/null
echo "FOLDER30_OK $OUT"
