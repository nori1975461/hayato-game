#!/bin/bash
# 蒼神骸華 第二案：2026-09-21 00:11 の FB「4 昇る蝕と 6 食の最終形態をみせてくれないと判断の仕様がない」へ渡した一式（0921/１）の写真とページを全部つくる。
#   bash build-gaika2-folder26.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
#   枠＝ページは全部 2 倍・880×800・中心 (0,13.5)＝閉じた姿と開いた姿を同じ枠で撮る（クリックで装甲が開く）
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VU="$D/３_ブラウザでクリックして見る（4 昇る蝕＝平常から最終形態まで）"
VB="$D/４_ブラウザでクリックして見る（6 食＝閉じた姿から最終形態まで）"
VF="$D/５_ブラウザでクリックして見る（最終形態の見比べ＝元の殻・昇る蝕・食）"
mkdir -p "$VU" "$VB" "$VF"
# 土台＝候補 34（首は襟なし）。「開」は open・thirdPts・thirdArm を足す（あとに書いたほうが勝つ）
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse","shoulder":{"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7,"accent":["chamfer","fin"]},"collar":"none","head":{"cheek":"steel","top":"mast"}'
OP='"open":16,"thirdPts":[[67,-32],[90,-34],[108,-30]],"thirdArm":true'
U1='"dormantX":{"kind":"umbra"}'; U2='"dormantX":{"kind":"umbra","c":[0,58]}'; UF='"dormantX":{"kind":"umbra","r":215,"inner":true,"burn":"R"}'; BT='"dormantX":{"kind":"bite"}'
cd "$(dirname "$0")"
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/１_一覧（等倍＝ゲームで見える大きさ・上段＝4 昇る蝕の 1〜4／下段＝6 食の 1〜2 と 元の殻の最終形態）.png" 1 0 13.5 4 400 380 "4-1 UMBRA: NORMAL={$B,$U1}" "4-2 UMBRA: RISING={$B,$U2}" "4-3 UMBRA: TOTALITY (RIM BURNS)={$B,$UF}" "4-4 UMBRA: FINAL FORM (OPEN)={$B,$OP,$UF}" "6-1 BITE: CLOSED={$B,$BT}" "6-2 BITE: FINAL FORM (OPEN)={$B,$OP,$BT}" "REF PLAIN SHELL: FINAL FORM (DRAFT 1)={$B,$OP}" | tail -1
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$D/２_最終形態の見比べ（拡大2倍・左から 元の殻／4 昇る蝕／6 食）.png" 2 0 13.5 3 800 720 "REF PLAIN SHELL (DRAFT 1)={$B,$OP}" "4 UMBRA: FINAL FORM={$B,$OP,$UF}" "6 BITE: FINAL FORM={$B,$OP,$BT}" | tail -1
export LABEL_SCALE=2
i=0; for a in "1 NORMAL={$B,$U1}" "2 RISING (OMEN)={$B,$U2}" "3 TOTALITY: RIM BURNS={$B,$UF}" "4 FINAL FORM: ARMOR OPENS={$B,$OP,$UF}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VU/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VU" "蒼神骸華 4 昇る蝕（平常から最終形態まで＝蒼神 → 骸 → 華）" \
  "1.png|1 平常|蒼の装甲の下を 闇が呑みはじめている。足したのは 灼けた縁の弧 1 本だけ（前回の 4）" \
  "2.png|2 前ぶれ＝闇が昇る|闇が 二枚目の月牙の下まで昇る（前回の 5）。闇に呑まれた所は 稜線も金の縁取りも一段沈む" \
  "3.png|3 皆既＝闇が昇りきる|蒼がすべて消え 沈んでいた縁取りが 一斉に深紅に灼ける（皆既日蝕で 縁だけが見えるのと同じ）" \
  "4.png|4 最終形態＝装甲が開く|黒い板が稜線で割れ 外の板が牙の先を軸に 16° 開く。割れ目の奥で 炉の赤が咲く。月牙は六枚すべて目覚める" | tail -1
i=0; for a in "1 CLOSED={$B,$BT}" "2 FINAL FORM: ARMOR OPENS={$B,$OP,$BT}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VB/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VB" "蒼神骸華 6 食（閉じた姿から最終形態まで）" \
  "1.png|1 閉じた姿|殻の外の縁を 大きな円弧で切り欠く（前回の 6）" \
  "2.png|2 最終形態＝装甲が開く|切り欠いた縁のまま 外の板が開く。開く板の下半分が細い（幅 34.8 → 18.0）" | tail -1
i=0; for a in "1 REF: PLAIN SHELL (DRAFT 1)={$B,$OP}" "2 UMBRA: FINAL FORM={$B,$OP,$UF}" "3 BITE: FINAL FORM={$B,$OP,$BT}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VF/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VF" "蒼神骸華 最終形態の見比べ（変わるのは 蒼の装甲だけ）" \
  "1.png|1 元の殻（くらべる基準＝「開」の第一稿に 今日までの決定を載せた姿）|蒼の装甲は 蒼いまま開く" \
  "2.png|2 4 昇る蝕の最終形態|蒼が消えた黒い板に 灼けた縁。割れ目の奥の炉の赤と 段のすき間の光だけが残る" \
  "3.png|3 6 食の最終形態|蒼いまま 切り欠いた縁で開く。切り欠きから 日蝕の輪が覗く" | tail -1
echo BUILD26_OK
