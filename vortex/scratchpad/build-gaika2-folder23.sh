#!/bin/bash
# 蒼神骸華 第二案：2026-09-20 に渡した一式（0920/２３＝肩当て・顔の両脇・頭の新案）の写真とページを全部つくる。次の一式を作るときのひな形。
#   bash build-gaika2-folder23.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VS="$D/５_ブラウザでクリックして見る（肩当て）"
VK="$D/６_ブラウザでクリックして見る（顔の両脇＝首の装甲）"
VH="$D/７_ブラウザでクリックして見る（頭）"
mkdir -p "$VS" "$VK" "$VH"
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"dormantX":"sliverEmber","subBoom":true,"subBlade":"eclipse"'
S5='"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88'
SH1="\"shoulder\":{$S5}"
SH2="\"shoulder\":{$S5,\"dx\":7}"
SH3="\"shoulder\":{$S5,\"dx\":7,\"accent\":\"chamfer\"}"
SH4="\"shoulder\":{$S5,\"dx\":7,\"accent\":\"fin\"}"
SH5="\"shoulder\":{$S5,\"dx\":7,\"accent\":\"spike\"}"
HB0='"head":{"top":"blade"}'
HBS='"head":{"top":"blade","cheek":"steel"}'
K3='"collar":{"seam":false}'; K2='"collar":{}'; K4='"collar":"none"'
hd() { echo "\"head\":{\"cheek\":\"steel\",$1}"; }
H1=$(hd '"top":"blade"'); H2=$(hd '"top":"cross"'); H3=$(hd '"top":"sunk"'); H4=$(hd '"top":"mast"'); H5=$(hd '"top":"mast","w0":3.4,"w1":1.3,"yK":-57,"h":10'); H6=$(hd '"top":"sunk","ex":-3.6')
H7=$(hd '"top":"sunk","eyeAt":[0,-55.5]'); H8=$(hd '"top":"mast","eyeAt":[0,-66]')
cd "$(dirname "$0")"
export LABEL_SCALE=2
node render-gaika2-cand-grid.mjs "$D/１_頭の案（拡大4倍・上段が1〜4・下段が5〜8）.png" 4 0 -54 4 156 176 "1 BLADE={$B,$SH3,$K2,$H1}" "2 CROSS={$B,$SH3,$K2,$H2}" "3 RAIL+BLADE={$B,$SH3,$K2,$H3}" "4 MAST={$B,$SH3,$K2,$H4}" "5 MAST CREST={$B,$SH3,$K2,$H5}" "6 ON THE EYE={$B,$SH3,$K2,$H6}" "7 REF EYE UP={$B,$SH3,$K2,$H7}" "8 REF EYE UP={$B,$SH3,$K2,$H8}" | tail -1
node render-gaika2-cand-grid.mjs "$D/２_肩当て（拡大3倍・左上から1〜5）.png" 3 0 -40 2 312 132 "1 LAST TIME No.5={$B,$SH1,$HB0}" "2 MOVED IN={$B,$SH2,$HB0}" "3 + CHAMFER={$B,$SH3,$HB0}" "4 ALT FIN={$B,$SH4,$HB0}" "5 ALT SPIKE={$B,$SH5,$HB0}" | tail -1
node render-gaika2-cand-grid.mjs "$D/３_顔の両脇（拡大4倍・左上から1〜5）.png" 4 0 -42 3 208 150 "1 NOW={$B,$SH3,$HB0}" "2 GOLD TO STEEL={$B,$SH3,$HBS}" "3 IRON GUARD={$B,$SH3,$HBS,$K3}" "4 + SEAM GLOW={$B,$SH3,$HBS,$K2}" "5 REF NO COLLAR={$B,$SH3,$HBS,$K4}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/４_等倍の全身（ゲームで見える大きさ・頭の案1〜6）.png" 1 0 13.5 3 344 352 "1 BLADE={$B,$SH3,$K2,$H1}" "2 CROSS={$B,$SH3,$K2,$H2}" "3 RAIL+BLADE={$B,$SH3,$K2,$H3}" "4 MAST={$B,$SH3,$K2,$H4}" "5 MAST CREST={$B,$SH3,$K2,$H5}" "6 ON THE EYE={$B,$SH3,$K2,$H6}" | tail -1
i=0; for a in "1 LAST TIME: No.5={$B,$SH1,$HB0}" "2 MOVED 7PX TO THE CENTER={$B,$SH2,$HB0}" "3 + CHAMFER={$B,$SH3,$HB0}" "4 ALT: FIN={$B,$SH4,$HB0}" "5 ALT: SPIKE={$B,$SH5,$HB0}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VS/$i.png" 33 -31 "$a" | tail -1; done
node make-click-viewer.mjs "$VS" "蒼神骸華 肩当て（5＋中心へ寄せる＋形のアクセント）" \
  "1.png|1 前回の 5|肩の関節の円盤が 内側に 5 画素のぞいている" \
  "2.png|2 中心へ 7 画素寄せる|関節の円盤が隠れる（実測）" \
  "3.png|3 ＋面取り（私の推し）|上の外の角を斜めに落とす＝装甲の傾斜" \
  "4.png|4 別案＝跳ね上げ|上の縁が外の角へ向かって尖る" \
  "5.png|5 別案＝棘|上の縁に短い棘が一本" | tail -1
i=0; for a in "1 NOW={$B,$SH3,$HB0}" "2 GOLD TRIM TO STEEL={$B,$SH3,$HBS}" "3 BLACK IRON NECK GUARD={$B,$SH3,$HBS,$K3}" "4 + SEAM GLOW={$B,$SH3,$HBS,$K2}" "5 REF: NO COLLAR={$B,$SH3,$HBS,$K4}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VK/$i.png" 0 -42 "$a" | tail -1; done
node make-click-viewer.mjs "$VK" "蒼神骸華 顔の両脇（深紅の板と金の縁どり → 黒鉄の首の装甲）" \
  "1.png|1 いまの姿|深紅の高い襟（胴）＋頬当ての金の縁（頭）" \
  "2.png|2 金の縁を鋼に|頬当ての外の縁＝光の当たる側だけ明るい鋼" \
  "3.png|3 深紅の襟を 黒鉄の首の装甲に|顔より低い厚い板。上へ行くほど内へ傾く" \
  "4.png|4 ＋すき間の灯（私の推し）|深紅は面でなく 頭と装甲のすき間から漏れる細い光だけ" \
  "5.png|5 参考＝襟なし|首まわりが空いて 頭が浮いて見える" | tail -1
i=0; for a in "1 BLADE (YOUR PICK 3)={$B,$SH3,$K2,$H1}" "2 CROSS RAIL (YOUR PICK 5)={$B,$SH3,$K2,$H2}" "3 BLADE FROM THE RAIL={$B,$SH3,$K2,$H3}" "4 ECLIPSE MAST={$B,$SH3,$K2,$H4}" "5 MAST IN CREST SHAPE={$B,$SH3,$K2,$H5}" "6 AXIS ON THE EYE={$B,$SH3,$K2,$H6}" "7 REF: THE EYE RISES (3)={$B,$SH3,$K2,$H7}" "8 REF: THE EYE RISES (4)={$B,$SH3,$K2,$H8}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VH/$i.png" 0 -55 "$a" | tail -1; done
node make-click-viewer.mjs "$VH" "蒼神骸華 頭の新案（一本の刃と縦の軌条）" \
  "1.png|1 ブレードアンテナ（前回の 3）|比較の基準" \
  "2.png|2 十字の軌条（前回の 5）|比較の基準" \
  "3.png|3 溝から生える刃（私の推し）|3＋5。刃が 眼の通り道から生えている" \
  "4.png|4 蝕の軌条|枠つきの十字が 鶏冠のように頭の上まで立ち上がる。芯が黒い" \
  "5.png|5 蝕の軌条・鶏冠の形|4 の根を広く 先を細く" \
  "6.png|6 眼の真上に立つ刃|3 の軸を 眼の真上へずらす" \
  "7.png|7 参考＝眼が昇る（3）|行動の種。大技の前に 眼が縦の軌条を昇る" \
  "8.png|8 参考＝眼が昇る（4）|行動の種。眼が頭を離れて 軌条の先に灯る" | tail -1
echo BUILD23_OK
