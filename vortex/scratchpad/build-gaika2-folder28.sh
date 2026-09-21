#!/bin/bash
# 蒼神骸華 第二案：2026-09-21 12:45〜13:08 の FB（炉心が不気味＝ビジュアルを創造して／胸の装甲が開いて弱点が出る設計だったか／左肩は棘でなく「面上げ」・色は真紅・金・黄色の全体像をクリックで／弱点を左肩にする案の良し悪し）へ渡した一式（0921/３）。
#   bash build-gaika2-folder28.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
#   全体像のページは 0921/１ と同じ枠＝2 倍・880×800・中心 (0,13.5)。
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VC="$D/２_ブラウザでクリックして見る（左肩＝面取り・真紅／金／黄色の全体像）"
VF="$D/３_ブラウザでクリックして見る（左肩＝跳ね上げの場合・真紅／金／黄色の全体像）"
VK="$D/４_ブラウザでクリックして見る（炉心の案＝最終形態の全体像 6 枚）"
VD="$D/５_ブラウザでクリックして見る（胸の炉の扉の拡大＝閉じている → 開く）"
mkdir -p "$VC" "$VF" "$VK" "$VD"
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse","collar":"none","head":{"cheek":"steel","top":"mast"}'
U1='"dormantX":{"kind":"umbra"}'; UF='"dormantX":{"kind":"umbra","r":215,"inner":true,"burn":"R"}'; OP='"open":16,"thirdPts":[[67,-32],[90,-34],[108,-30]],"thirdArm":true'
S0='"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7'
shc(){ echo "\"shoulder\":{$S0,\"accent\":\"chamfer\"${1:+,\"tint\":[null,\"$1\"]}}"; }              # 左肩＝面取り（右肩と同じ形）・$1＝色（空なら黒鉄）
shf(){ echo "\"shoulder\":{$S0,\"accent\":[\"chamfer\",\"fin\"]${1:+,\"tint\":[null,\"$1\"]}}"; }     # 左肩＝跳ね上げ
K2='"openCore":"spine"'; K3='"openCore":"rack"'; K4='"openCore":"rack","chest":{"tone":"gold"}'; K5='"openCore":"rack","chest":{"tone":"crimson"}'; K6='"openCore":{"kind":"rim","tone":"gold"},"chest":{"tone":"gold"}'
cd "$(dirname "$0")"
# ---- 写真
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/１_左肩の三色の一覧（等倍＝ゲームで見える大きさ・上段＝面取り／下段＝跳ね上げ・左から 真紅／金／黄色）.png" 1 0 13.5 3 344 352 "CHAMFER: CRIMSON={$B,$U1,$(shc crimson)}" "CHAMFER: GOLD={$B,$U1,$(shc gold)}" "CHAMFER: YELLOW={$B,$U1,$(shc yellow)}" "FIN: CRIMSON={$B,$U1,$(shf crimson)}" "FIN: GOLD={$B,$U1,$(shf gold)}" "FIN: YELLOW={$B,$U1,$(shf yellow)}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/６_最終形態で三色を確かめた（等倍・炉心は私の推し・左から 真紅／金／黄色）.png" 1 0 13.5 3 400 380 "FINAL: CRIMSON SHOULDER={$B,$OP,$UF,$K4,$(shc crimson)}" "FINAL: GOLD SHOULDER={$B,$OP,$UF,$K4,$(shc gold)}" "FINAL: YELLOW SHOULDER={$B,$OP,$UF,$K4,$(shc yellow)}" | tail -1
node render-gaika2-weak-diagram.mjs "$D/７_弱点の置き場所の検証図（金の円＝胸の炉心／水色の円＝左肩・点線＝実際に当たる範囲・白い円＝玉の大きさ）.png" "{$B,$OP,$UF,$K4,$(shc gold)}" | tail -1
export LABEL_SCALE=2
# ---- ページ：左肩の三色（閉じた姿・全体像）
i=0; for a in "1 CRIMSON={$B,$U1,$(shc crimson)}" "2 GOLD={$B,$U1,$(shc gold)}" "3 YELLOW={$B,$U1,$(shc yellow)}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VC/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VC" "蒼神骸華 左肩の色（形は面取り＝右肩と同じ形・変わるのは色だけ）" \
  "1.png|1 真紅|機体になじむ。ただし機体の 1 割が同系色で 最終形態では炉の赤・灼けた縁に紛れる" \
  "2.png|2 金|日蝕の輪・腕の帯とそろう。落ち着いた くすんだ金" \
  "3.png|3 黄色|いちばん明るく いちばん目に入る。本編の軌道神核の弱点の印と同じ色 (#ffd23f)" | tail -1
i=0; for a in "1 CRIMSON={$B,$U1,$(shf crimson)}" "2 GOLD={$B,$U1,$(shf gold)}" "3 YELLOW={$B,$U1,$(shf yellow)}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VF/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VF" "蒼神骸華 左肩の色（形が跳ね上げだった場合・変わるのは色だけ）" \
  "1.png|1 真紅|「面上げ」が「跳ね上げ」の意味だった場合のための 同じ三色" \
  "2.png|2 金|" \
  "3.png|3 黄色|" | tail -1
# ---- ページ：炉心の案（最終形態・全体像）＝左肩は色を決める前なので 両肩とも黒鉄の面取りで固定
i=0; for a in "1 NOW: SPINE + VERTEBRAE={$B,$OP,$UF,$(shc)}" "2 SPINE ONLY={$B,$OP,$UF,$K2,$(shc)}" "3 LAUNCH RACK (NO GLOW)={$B,$OP,$UF,$K3,$(shc)}" "4 RACK + CHEST CORE OPENS: WHITE GOLD (MY PICK)={$B,$OP,$UF,$K4,$(shc)}" "5 RACK + CHEST CORE: CRIMSON={$B,$OP,$UF,$K5,$(shc)}" "6 CHEST CORE + ITS LIGHT ON THE OPENED PLATES={$B,$OP,$UF,$K6,$(shc)}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VK/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VK" "蒼神骸華 炉心の案（最終形態・変わるのは 割れ目の奥と 胸の中央だけ）" \
  "1.png|1 いまの絵（くらべる基準）|割れ目の奥に 赤い背骨と短い椎骨＝頭の両脇に 骨格が立って見える（不気味の正体）" \
  "2.png|2 椎骨を外す|背骨の光だけ。骨には見えなくなるが 赤い管が残る" \
  "3.png|3 発射架（光なし）|割れ目の奥は 月牙の発射架＝黒鉄の軌条一本と 座（蒼い軌条・金の留め具）だけ。炉心は ここには無い" \
  "4.png|4 発射架＋胸の炉の扉が開く・白金の光（私の推し）|炉心は胸に一つ。中央の覗き窓が左右へ割れ 奥が白く灼ける。黒と赤だけの姿の中で 光は ここ一か所" \
  "5.png|5 同・炉心が深紅|4 との違いは 炉心の色だけ" \
  "6.png|6 4＋炉心の光が 開いた板の内側を灼く|胸から来た光が 外の板の内側の面だけを 金に灼く（光は縁だけ）" | tail -1
# ---- ページ：胸の炉の扉の拡大（左＝上半身 3 倍／右上＝等倍／右下＝胸 6 倍）
i=0; for a in "1 TOTALITY: DOOR CLOSED={$B,$UF,$(shc)}" "2 FINAL FORM: DOOR STILL CLOSED={$B,$OP,$UF,$K3,$(shc)}" "3 FINAL FORM: DOOR OPENS, WHITE GOLD (MY PICK)={$B,$OP,$UF,$K4,$(shc)}" "4 FINAL FORM: DOOR OPENS, CRIMSON={$B,$OP,$UF,$K5,$(shc)}"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VD/$i.png" 0 -18 "$a" | tail -1; done
node make-click-viewer.mjs "$VD" "蒼神骸華 胸の炉の扉（閉じている → 開く）" \
  "1.png|1 皆既（装甲が開く前）|胸の中央は 縦一条の灼けた覗き窓＝閉じた炉の扉（いままでの絵のまま）" \
  "2.png|2 最終形態・扉は閉じたまま|装甲は開いたが 炉心はまだ見えない" \
  "3.png|3 扉が開く・白金の光（私の推し）|覗き窓が左右へ割れ 火格子の奥が白く灼ける。扉の小口と ルーバーの枠の内側の一列だけが 光を受ける" \
  "4.png|4 扉が開く・深紅|3 との違いは 色だけ" | tail -1
echo BUILD28_OK
