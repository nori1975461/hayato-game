#!/bin/bash
# 蒼神骸華 第二案：いまの作業の土台（resume-gaika-now.mjs の候補 23＝右肩は面取り・左肩は跳ね上げ・頭は蝕の軌条）に、札ごとの追加分を足して、同じ場所・同じ倍率で格子に並べて撮る。
#   bash shot-gaika2.sh <出力パス> <倍率> <中心の世界x> <中心の世界y> <列の数> <枠の幅> <枠の高さ> "札=追加の JSON（波括弧なし・空なら土台のまま）" ...
#   例: bash shot-gaika2.sh /tmp/a.png 4 0 -54 3 156 176 'NOW=' 'MAST="head":{"cheek":"steel","top":"mast"}'
#   追加分に土台と同じキー（"head" など）を書くと、あとに書いたほうが勝つ（JSON.parse の仕様）＝丸ごと差し替え。札は ASCII。自分で Read する写真は 640×360 以下に。
#   目安: 頭 4倍 (0,-54) 枠156×176／顔の両脇 4倍 (0,-42) 枠208×150／肩当て（両肩）3倍 (0,-40) 枠312×132／一番下の座 3倍 (-68,-12) 枠156×170／等倍の全身 1倍 (0,13.5) 枠344×352
BASE='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"dormantX":"sliverEmber","subBoom":true,"subBlade":"eclipse","shoulder":{"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7,"accent":["chamfer","fin"]},"collar":{},"head":{"cheek":"steel","top":"mast"}'
out="$1"; S="$2"; cx="$3"; cy="$4"; cols="$5"; pw="$6"; ph="$7"; shift 7
args=(); for a in "$@"; do label="${a%%=*}"; extra="${a#*=}"; if [ -z "$extra" ]; then args+=("$label={$BASE}"); else args+=("$label={$BASE,$extra}"); fi; done
cd "$(dirname "$0")" && LABEL_SCALE=${LABEL_SCALE:-2} node render-gaika2-cand-grid.mjs "$out" "$S" "$cx" "$cy" "$cols" "$pw" "$ph" "${args[@]}" | tail -1
