#!/bin/bash
# 0922/１ の一式＝「開」の姿の詰め ①月牙が出ていった跡（5 案） ②装甲が開いて出る砲（4 案）
#   bash build-gaika2-folder31.sh "<出力先フォルダ>"
#   跡は「月牙の形」で揃えた（閉じた姿が『面にきっちり嵌め込み・穴なし』で確定しているため。
#   角丸の開口＝第36稿の形は、月牙が穴に収まっていた頃の名残なので案から外し、その軌条と留め具だけを残した）。
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

J() { node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, ...JSON.parse(process.argv[1])})))" "$1"; }

# ================= ①月牙が出ていった跡 =================
H1=$(J '{"openHole":"none"}')
H2=$(J '{"openHole":"socket"}')
H3=$(J '{"openHole":{"kind":"socket","seat":true}}')
H4=$(J '{"openHole":{"kind":"moon","seat":true}}')
H5=$(J '{"openHole":{"kind":"moon","seat":true,"burn":true}}')

node render-gaika2-cand-grid.mjs "$OUT/１_跡の一覧（3倍・左から いまのまま／窪み／窪み＋金具／抜けた穴＋金具／穴＋金具＋灼けた縁）.png" \
  3 90 -40 5 168 344 "1 NONE=$H1" "2 SOCKET=$H2" "3 +SEAT=$H3" "4 HOLE+SEAT=$H4" "5 +BURN=$H5"

S1="$OUT/２_跡の全体像と拡大 5 枚＋ブラウザでクリックして見るページ"
mkdir -p "$S1"
node render-gaika2-closeup-sheet.mjs "$S1/1_いまのまま（跡なし）.png"                   91 -40 "NONE=$H1"   > /dev/null
node render-gaika2-closeup-sheet.mjs "$S1/2_月牙の形の窪み（いちばん静か）.png"         91 -40 "SOCKET=$H2" > /dev/null
node render-gaika2-closeup-sheet.mjs "$S1/3_窪み＋軌条と金の留め具.png"                 91 -40 "SEAT=$H3"   > /dev/null
node render-gaika2-closeup-sheet.mjs "$S1/4_抜けた穴＋軌条と金の留め具.png"             91 -40 "HOLE=$H4"   > /dev/null
node render-gaika2-closeup-sheet.mjs "$S1/5_穴＋軌条と留め具＋灼けた縁（私の推し）.png" 91 -40 "BURN=$H5"   > /dev/null

node make-click-viewer.mjs "$S1" "月牙が出ていった跡＝装甲が開いて六枚とも射出したあと 座に何が残るか（5 種）" \
  "1_いまのまま（跡なし）.png|1 いまのまま|月牙が抜けても板は無地のまま。閉じた姿の「面にきっちり嵌まっている」とつながらない" \
  "2_月牙の形の窪み（いちばん静か）.png|2 月牙の形の窪み|嵌まっていた形の窪みだけが残る（底は暗い鋼）。等倍ではほとんど見えない" \
  "3_窪み＋軌条と金の留め具.png|3 窪み＋金具|2 に第36稿の「空の座」＝蒼い軌条と金の留め具二つを足した。月牙を送り出す機構が残る" \
  "4_抜けた穴＋軌条と金の留め具.png|4 抜けた穴＋金具|3 の底を抜いて穴にした（奥は闇・縁に炉の残り火）" \
  "5_穴＋軌条と留め具＋灼けた縁（私の推し）.png|5 ＋灼けた縁|4 の縁が灼ける＝撃った直後の熱。等倍でも跡があると読めるのはこの案だけ"

# ================= ②装甲が開いて出る砲 =================
G1=$(J '{"openHole":{"kind":"moon","seat":true,"burn":true}}')
G2=$(J '{"openHole":{"kind":"moon","seat":true,"burn":true},"openGun":"gun"}')
G3=$(J '{"openHole":{"kind":"moon","seat":true,"burn":true},"openGun":["launcher","gun"]}')
G4=$(J '{"openHole":{"kind":"moon","seat":true,"burn":true},"openGun":"saber"}')

node render-gaika2-cand-grid.mjs "$OUT/３_出る砲の一覧（2倍・上から メガランチャー／左右で違える／バルカン砲／光刃・両肩が入る帯）.png" \
  2 0 -24 1 640 104 "1 LAUNCHER=$G1" "2 MIXED=$G3" "3 VULCAN=$G2" "4 SABER=$G4"

S2="$OUT/４_出る砲の全体像と拡大 4 枚＋ブラウザでクリックして見るページ"
mkdir -p "$S2"
node render-gaika2-closeup-sheet.mjs "$S2/1_メガランチャー（いまのまま）.png"         128 -22 "LAUNCHER=$G1" > /dev/null
node render-gaika2-closeup-sheet.mjs "$S2/2_左右で違える（画面右だけバルカン砲）.png" 128 -22 "MIXED=$G3"    > /dev/null
node render-gaika2-closeup-sheet.mjs "$S2/3_バルカン砲（私の推し）.png"               128 -22 "VULCAN=$G2"   > /dev/null
node render-gaika2-closeup-sheet.mjs "$S2/4_光刃（参考＝砲を出さない）.png"            128 -22 "SABER=$G4"    > /dev/null

node make-click-viewer.mjs "$S2" "蒼の装甲が開いて出る砲＝三本目の腕が持つもの（4 種）" \
  "1_メガランチャー（いまのまま）.png|1 メガランチャー|いまの最終形態が持っている単砲身。三段の装甲と口縁の金" \
  "2_左右で違える（画面右だけバルカン砲）.png|2 左右で違える|骸華の左肩（画面右）だけバルカン砲。左肩は鍵なので 鍵の側が短い砲になる" \
  "3_バルカン砲（私の推し）.png|3 バルカン砲|砲身の束三本。仰った「バルカン砲（電子パルス砲）」そのもの" \
  "4_光刃（参考＝砲を出さない）.png|4 光刃（参考）|砲をやめて三本目の腕も光刃にした姿。刃だけの最終形態"

echo "FOLDER31_OK"
