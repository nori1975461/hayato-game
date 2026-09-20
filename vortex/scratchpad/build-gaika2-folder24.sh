#!/bin/bash
# 蒼神骸華 第二案：2026-09-20 22:07 の FB へ渡した一式（0920/２４＝決定の反映・首の装甲の高さ・一番下の座）の写真とページを全部つくる。
#   bash build-gaika2-folder24.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VK="$D/５_ブラウザでクリックして見る（首の装甲の高さ）"
VD="$D/６_ブラウザでクリックして見る（一番下の座）"
mkdir -p "$VK" "$VD"
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse"'
S5='"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7'
SH0="\"shoulder\":{$S5,\"accent\":\"chamfer\"}"              # 前回の土台（左右とも面取り）
SH="\"shoulder\":{$S5,\"accent\":[\"chamfer\",\"fin\"]}"      # 決定＝[画面左（骸華の右肩）＝面取り, 画面右（骸華の左肩）＝跳ね上げ]
HD0='"head":{"cheek":"steel","top":"sunk"}'; HD='"head":{"cheek":"steel","top":"mast"}'   # 決定＝蝕の軌条
K4='"collar":{}'; KL='"collar":{"top":-41}'; KLL='"collar":{"top":-38}'; K5='"collar":"none"'
D0='"dormantX":"sliver"'; D2='"dormantX":{"c":"m","fill":0.2}'; D3='"dormantX":{"c":"m","fill":0.3}'; D45='"dormantX":{"c":"m","fill":0.45}'; D1='"dormantX":"sliverEmber"'; DE='"dormantX":{"c":"r","core":"k"}'
cd "$(dirname "$0")"
export LABEL_SCALE=2
node render-gaika2-cand-grid.mjs "$D/１_決まった姿（右肩＝面取り・左肩＝跳ね上げ・頭＝蝕の軌条）拡大3倍.png" 3 0 -46 2 312 200 "LAST TIME={$B,$SH0,$HD0,$K4,$D1}" "DECIDED={$B,$SH,$HD,$K4,$D1}" | tail -1
node render-gaika2-cand-grid.mjs "$D/２_首の装甲の高さ（拡大4倍・左から1〜4）.png" 4 0 -42 4 208 150 "1 LAST 4={$B,$SH,$HD,$K4,$D1}" "2 LOWER={$B,$SH,$HD,$KL,$D1}" "3 LOWEST={$B,$SH,$HD,$KLL,$D1}" "4 LAST 5 NONE={$B,$SH,$HD,$K5,$D1}" | tail -1
node render-gaika2-cand-grid.mjs "$D/３_一番下の座（拡大3倍・上段が1〜3・下段が4〜6）.png" 3 -68 -12 3 156 170 "1 STEEL={$B,$SH,$HD,$K4,$D0}" "2 WAXING 0.2={$B,$SH,$HD,$K4,$D2}" "3 WAXING 0.3={$B,$SH,$HD,$K4,$D3}" "4 WAXING 0.45={$B,$SH,$HD,$K4,$D45}" "5 EMBER={$B,$SH,$HD,$K4,$D1}" "6 REF ECLIPSE={$B,$SH,$HD,$K4,$DE}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/４_等倍の全身（ゲームで見える大きさ）.png" 1 0 13.5 2 344 352 "1 LAST TIME={$B,$SH0,$HD0,$K4,$D1}" "2 DECIDED (NECK 4 + EMBER)={$B,$SH,$HD,$K4,$D1}" "3 MY PICK (LOWER NECK + WAXING 0.3)={$B,$SH,$HD,$KL,$D3}" "4 NO COLLAR + WAXING 0.3={$B,$SH,$HD,$K5,$D3}" | tail -1
i=0; for a in "1 NECK GUARD + SEAM GLOW (LAST TIME 4)={$B,$SH,$HD,$K4,$D1}" "2 LOWER GUARD={$B,$SH,$HD,$KL,$D1}" "3 LOWEST GUARD={$B,$SH,$HD,$KLL,$D1}" "4 NO COLLAR (LAST TIME 5)={$B,$SH,$HD,$K5,$D1}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VK/$i.png" 0 -42 "$a" | tail -1; done
node make-click-viewer.mjs "$VK" "蒼神骸華 首の装甲の高さ（前回の 4 から 5 まで 一段ずつ下げる）" \
  "1.png|1 前回の 4＝首の装甲＋すき間の灯|上端は 兜の鉢の下の縁。頭の両脇の黒い板が 肩当てまで続く" \
  "2.png|2 低い首の装甲＋灯（私の推し）|上端を 4.5 下げる。頬当ての尖りが出て 灯は顎の横に短く残る" \
  "3.png|3 もっと低い|上端を 7.5 下げる。灯はほぼ点" \
  "4.png|4 前回の 5＝襟なし|装甲も灯も無い。頭が胸にじかに載る（蝕の軌条の頭では 浮いて見えない）" | tail -1
i=0; for a in "1 STEEL SLIVER (FILL 0)={$B,$SH,$HD,$K4,$D0}" "2 WAXING 0.2={$B,$SH,$HD,$K4,$D2}" "3 WAXING 0.3={$B,$SH,$HD,$K4,$D3}" "4 WAXING 0.45={$B,$SH,$HD,$K4,$D45}" "5 EMBER SLIVER (FILL 1)={$B,$SH,$HD,$K4,$D1}" "6 REF: ECLIPSE SLIVER={$B,$SH,$HD,$K4,$DE}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VD/$i.png" -72 -8 "$a" | tail -1; done
node make-click-viewer.mjs "$VD" "蒼神骸華 一番下の座（鋼の繊月を 深紅が下の先端から満たしていく）" \
  "1.png|1 繊月・鋼|満ち具合 0。眠りきった月" \
  "2.png|2 満ちかけ 0.2|下の先端にだけ 深紅が入る" \
  "3.png|3 満ちかけ 0.3（私の推し）|鋼＝眠り・深紅＝目覚めの進み具合。平常はここで止まっている" \
  "4.png|4 満ちかけ 0.45|半分近くまで満ちた" \
  "5.png|5 繊月・深紅|満ち具合 1。1 と 5 は 同じ一本の軸の両端" \
  "6.png|6 参考＝蝕の繊月|芯が黒く 縁だけ深紅（蝕刃と同じ文法）。線が二重になる" | tail -1
echo BUILD24_OK
