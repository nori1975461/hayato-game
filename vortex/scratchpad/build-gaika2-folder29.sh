#!/bin/bash
# 蒼神骸華 第二案：2026-09-21 18:08 の FB（弱点＝胸の炉心・扉が開く白金の光を採用・左肩＝胸の扉を開ける鍵／左肩は 真紅・金・銀・黄色 と 跳ね上げ・棘 でまだ迷っている＝全体像の写真を各種一枚ずつ）へ渡した一式（0921/４）。
#   bash build-gaika2-folder29.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
#   全体像は 0921/１〜３ と同じ枠＝2 倍・880×800・中心 (0,13.5)。並びは「1 クリックで変わるのは一つだけ」＝跳ね上げの 4 色 → 形だけ棘へ → 棘の 4 色を逆順。
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VA="$D/２_全体像の写真 8 枚（各種一枚ずつ）＋ブラウザでクリックして見るページ"
VB="$D/４_最終形態（胸の扉が開いた姿）の全体像 8 枚＋ブラウザでクリックして見るページ"
VK="$D/６_案：跳ね上げた板が「鍵」そのもの（叩くと板が落ちて胸が開く）ブラウザでクリックして見る"
mkdir -p "$VA" "$VB" "$VK"
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse","collar":"none","head":{"cheek":"steel","top":"mast"}'
U1='"dormantX":{"kind":"umbra"}'; UF='"dormantX":{"kind":"umbra","r":215,"inner":true,"burn":"R"}'; OP='"open":16,"thirdPts":[[67,-32],[90,-34],[108,-30]],"thirdArm":true'
S0='"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7'
shc(){ echo "\"shoulder\":{$S0,\"accent\":\"chamfer\"${1:+,\"tint\":[null,\"$1\"]}}"; }              # 左肩＝面取り（右肩と同じ形）・$1＝色（空なら黒鉄）
shf(){ echo "\"shoulder\":{$S0,\"accent\":[\"chamfer\",\"fin\"]${1:+,\"tint\":[null,\"$1\"]}}"; }     # 左肩＝跳ね上げ
shs(){ echo "\"shoulder\":{$S0,\"accent\":[\"chamfer\",\"spike\"]${1:+,\"tint\":[null,\"$1\"]}}"; }   # 左肩＝短い棘（0921/２ の「形の 1」＝前に見せた短い棘）。⚠️18:18 にユーザーが訂正＝ここで言う「棘」は大きな一本棘ではなく短い棘
K4='"openCore":"rack","chest":{"tone":"gold"}'   # ⭐採用＝割れ目の奥は発射架・胸の炉の扉が開く・白金の光
cd "$(dirname "$0")"
# ---- 一覧（等倍）
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/１_一覧（等倍＝ゲームで見える大きさ・上段＝跳ね上げ／下段＝棘・左から 真紅／金／銀／黄色）.png" 1 0 13.5 4 344 352 "FIN: CRIMSON={$B,$U1,$(shf crimson)}" "FIN: GOLD={$B,$U1,$(shf gold)}" "FIN: SILVER={$B,$U1,$(shf silver)}" "FIN: YELLOW={$B,$U1,$(shf yellow)}" "SPIKE: CRIMSON={$B,$U1,$(shs crimson)}" "SPIKE: GOLD={$B,$U1,$(shs gold)}" "SPIKE: SILVER={$B,$U1,$(shs silver)}" "SPIKE: YELLOW={$B,$U1,$(shs yellow)}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/３_一覧・最終形態（等倍・胸の扉が開いた姿・上段＝跳ね上げ／下段＝棘・左から 真紅／金／銀／黄色）.png" 1 0 13.5 4 400 380 "FINAL FIN: CRIMSON={$B,$OP,$UF,$K4,$(shf crimson)}" "FINAL FIN: GOLD={$B,$OP,$UF,$K4,$(shf gold)}" "FINAL FIN: SILVER={$B,$OP,$UF,$K4,$(shf silver)}" "FINAL FIN: YELLOW={$B,$OP,$UF,$K4,$(shf yellow)}" "FINAL SPIKE: CRIMSON={$B,$OP,$UF,$K4,$(shs crimson)}" "FINAL SPIKE: GOLD={$B,$OP,$UF,$K4,$(shs gold)}" "FINAL SPIKE: SILVER={$B,$OP,$UF,$K4,$(shs silver)}" "FINAL SPIKE: YELLOW={$B,$OP,$UF,$K4,$(shs yellow)}" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/５_案：跳ね上げた板が「鍵」そのもの（等倍・左＝ふだん＝板が跳ね上がり胸は閉じている／右＝叩かれて板が落ち 胸が開く）.png" 1 0 13.5 2 344 352 "ARMED: PLATE UP, CHEST SHUT={$B,$U1,$(shf gold)}" "STRUCK: PLATE DOWN, CHEST OPEN={$B,$U1,\"chest\":{\"tone\":\"gold\"},$(shc gold)}" | tail -1
export LABEL_SCALE=2
# ---- 全体像の写真 8 枚（平常の姿）。ファイル名の番号順＝ページの順＝1 クリックで変わるのは一つだけ
N=("1_跳ね上げ・真紅" "2_跳ね上げ・金" "3_跳ね上げ・銀" "4_跳ね上げ・黄色" "5_棘・黄色" "6_棘・銀" "7_棘・金" "8_棘・真紅")
L=("1 FIN: CRIMSON" "2 FIN: GOLD" "3 FIN: SILVER" "4 FIN: YELLOW" "5 SPIKE: YELLOW" "6 SPIKE: SILVER" "7 SPIKE: GOLD" "8 SPIKE: CRIMSON")
S=("$(shf crimson)" "$(shf gold)" "$(shf silver)" "$(shf yellow)" "$(shs yellow)" "$(shs silver)" "$(shs gold)" "$(shs crimson)")
for i in 0 1 2 3 4 5 6 7; do node render-gaika2-cand-grid.mjs "$VA/${N[$i]}.png" 2 0 13.5 1 880 800 "${L[$i]}={$B,$U1,${S[$i]}}" | tail -1; done
node make-click-viewer.mjs "$VA" "蒼神骸華 左肩の全体像（1〜4＝跳ね上げ／5〜8＝棘・1 クリックで変わるのは一つだけ）" \
  "${N[0]}.png|1 跳ね上げ・真紅|周りとの色の差 161・明るさの差 40（4 色でいちばん小さい）・機体の 10.4% が同系色" \
  "${N[1]}.png|2 跳ね上げ・金|色の差 199・明るさの差 104・同系色 4.5%（日蝕の輪・腕の帯と同じ くすんだ金）" \
  "${N[2]}.png|3 跳ね上げ・銀|色の差 156・明るさの差 87・同系色 5.2%（腕の機械・頬当ての鋼と同じ色）" \
  "${N[3]}.png|4 跳ね上げ・黄色|色の差 272・明るさの差 158（いちばん大きい）・本編の「味方の攻撃＝金」「弱点の印」と同じ色 (#ffd23f)" \
  "${N[4]}.png|5 棘・黄色|4 との違いは 形だけ（跳ね上げ → 短い棘）" \
  "${N[5]}.png|6 棘・銀|" \
  "${N[6]}.png|7 棘・金|" \
  "${N[7]}.png|8 棘・真紅|次のクリックで 1 へ戻る（形だけが変わる）" | tail -1
# ---- 最終形態（装甲が開き 胸の炉の扉も開いた姿）の 8 枚＝同じ枠・同じ順
for i in 0 1 2 3 4 5 6 7; do node render-gaika2-cand-grid.mjs "$VB/${N[$i]}.png" 2 0 13.5 1 880 800 "FINAL ${L[$i]}={$B,$OP,$UF,$K4,${S[$i]}}" | tail -1; done
node make-click-viewer.mjs "$VB" "蒼神骸華 最終形態での左肩（蒼が消え 胸の炉の扉が開いた姿・順番は平常の姿と同じ）" \
  "${N[0]}.png|1 跳ね上げ・真紅|最終形態では 機体の 8.8% が同系色（灼けた縁・蝕の赤）＝いちばん紛れる" \
  "${N[1]}.png|2 跳ね上げ・金|同系色 2.1%（4 色でいちばん少ない）・胸の白金の光と同じ系統の色" \
  "${N[2]}.png|3 跳ね上げ・銀|同系色 4.4%・肩から出た腕（機械の色）と並ぶ" \
  "${N[3]}.png|4 跳ね上げ・黄色|同系色 3.0%・色の差 273（いちばん大きい）" \
  "${N[4]}.png|5 棘・黄色|4 との違いは 形だけ" \
  "${N[5]}.png|6 棘・銀|" \
  "${N[6]}.png|7 棘・金|" \
  "${N[7]}.png|8 棘・真紅|" | tail -1
# ---- 案：跳ね上げた板が「鍵」そのもの（色は説明用に金・色が決まったら撮り直す）
node render-gaika2-cand-grid.mjs "$VK/1.png" 2 0 13.5 1 880 800 "1 ARMED: PLATE UP, CHEST SHUT={$B,$U1,$(shf gold)}" | tail -1
node render-gaika2-cand-grid.mjs "$VK/2.png" 2 0 13.5 1 880 800 "2 STRUCK: PLATE DOWN, CHEST OPEN={$B,$U1,\"chest\":{\"tone\":\"gold\"},$(shc gold)}" | tail -1
node make-click-viewer.mjs "$VK" "蒼神骸華 案：跳ね上げた板が「鍵」そのもの（色は説明用に金）" \
  "1.png|1 ふだん|左肩の板は跳ね上がっている＝鍵はまだ入っていない。胸の炉の扉は閉じている" \
  "2.png|2 叩かれた（ガツン）|板が落ちて 右肩と同じ形になる＝鍵が入った。胸の炉の扉が開き 白金の光が出る。一定時間で板が跳ね上がり 扉が閉じる" | tail -1
echo BUILD29_OK
