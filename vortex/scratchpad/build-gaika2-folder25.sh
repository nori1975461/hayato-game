#!/bin/bash
# 蒼神骸華 第二案：2026-09-20 22:47 の FB へ渡した一式（0920/２５＝襟なしを反映・一番下の座の練り直し＝月の形をやめて 蝕の炉口／昇る蝕／食）の写真とページを全部つくる。
#   bash build-gaika2-folder25.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VD="$D/４_ブラウザでクリックして見る（一番下の座の新案）"
mkdir -p "$VD"
# 土台＝候補 23 の首を襟なしへ（22:47 の決定）
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse","shoulder":{"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7,"accent":["chamfer","fin"]},"collar":"none","head":{"cheek":"steel","top":"mast"}'
N='"dormantX":{"kind":"none"}'; W3='"dormantX":{"c":"m","fill":0.3}'; BE='"dormantX":{"kind":"band","eclipse":true}'; UM='"dormantX":{"kind":"umbra"}'; UH='"dormantX":{"kind":"umbra","c":[0,58]}'; BT='"dormantX":{"kind":"bite"}'
cd "$(dirname "$0")"
export LABEL_SCALE=2
node render-gaika2-cand-grid.mjs "$D/１_一番下の座の新案（拡大3倍・上段が1〜3・下段が4〜6）.png" 3 -66 -30 3 236 345 "1 PLAIN={$B,$N}" "2 LAST 3 WAXING={$B,$W3}" "3 ECLIPSED VENT={$B,$BE}" "4 RISING UMBRA={$B,$UM}" "5 UMBRA HIGH={$B,$UH}" "6 BITE={$B,$BT}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/２_等倍の上半身（ゲームで見える大きさ・上段が1〜3・下段が4〜6）.png" 1 0 -38 3 236 200 "1 PLAIN={$B,$N}" "2 LAST 3 WAXING={$B,$W3}" "3 ECLIPSED VENT={$B,$BE}" "4 RISING UMBRA={$B,$UM}" "5 UMBRA HIGH={$B,$UH}" "6 BITE={$B,$BT}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/３_等倍の全身（上段が1〜3・下段が4〜6）.png" 1 0 13.5 3 344 352 "1 PLAIN={$B,$N}" "2 LAST 3 WAXING={$B,$W3}" "3 ECLIPSED VENT={$B,$BE}" "4 RISING UMBRA={$B,$UM}" "5 UMBRA HIGH={$B,$UH}" "6 BITE={$B,$BT}" | tail -1
i=0; for a in "1 PLAIN (4 MOONS ONLY)={$B,$N}" "2 LAST TIME 3: WAXING SLIVER 0.3={$B,$W3}" "3 ECLIPSED VENT (ADD)={$B,$BE}" "4 RISING UMBRA (PAINT)={$B,$UM}" "5 RISING UMBRA, HIGHER={$B,$UH}" "6 BITE (CUT)={$B,$BT}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VD/$i.png" -76 -8 "$a" | tail -1; done
node make-click-viewer.mjs "$VD" "蒼神骸華 一番下の座の練り直し（月の形をやめて 足す／塗る／引く）" \
  "1.png|1 無地（くらべる基準）|月牙は 4 枚。座には何も置かない" \
  "2.png|2 前回の 3＝満ちかけの繊月 0.3（くらべる基準）|もやもやが残った案" \
  "3.png|3 蝕の炉口（足す）|段のすき間の炉の光が 芯から黒く蝕まれ 縁だけが灼ける。蝕刃・頭の軌条と同じ文法" \
  "4.png|4 昇る蝕（塗る・私の推し）|蒼の装甲が 下から闇に呑まれはじめている。足したのは 灼けた縁の弧 1 本だけ" \
  "5.png|5 昇る蝕・高い|4 との違いは 闇の高さだけ。二枚目の月牙のすぐ下まで昇った姿" \
  "6.png|6 食（引く）|殻の外の縁を 大きな円弧で切り欠く。殻そのものが 欠けた月になり 空いた空間ごと無くなる" | tail -1
echo BUILD25_OK
