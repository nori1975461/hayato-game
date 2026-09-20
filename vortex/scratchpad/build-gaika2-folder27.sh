#!/bin/bash
# 蒼神骸華 第二案：2026-09-21 01:17 の FB「#4 昇る蝕にしよう／左肩を 跳ね上げではなく棘に・左肩のプロテクターの色を変えて」へ渡した一式（0921/２）の写真とページを全部つくる。
#   bash build-gaika2-folder27.sh <出力フォルダ>   （写真の候補・札・ページの順番と注記はこの中が正）
#   土台＝候補 34 の座を 昇る蝕へ（01:17 の決定）。変えるのは 骸華の左肩（＝画面の右）の肩当てだけ。
set -e
mkdir -p "$1"; D="$(cd "$1" && pwd)"
VF="$D/４_ブラウザでクリックして見る（棘の形 5 枚・色は白骨で固定）"
VC="$D/５_ブラウザでクリックして見る（色 9 枚・形は 大きな一本棘で固定）"
VS="$D/６_ブラウザでクリックして見る（白骨の肩で 平常 → 皆既 → 最終形態）"
mkdir -p "$VF" "$VC" "$VS"
B='"kit":"launcher","foreTurn":[20,35],"subStraight":true,"stowed":true,"thirdArm":false,"subBehind":true,"subBoom":true,"subBlade":"eclipse","collar":"none","head":{"cheek":"steel","top":"mast"}'
U1='"dormantX":{"kind":"umbra"}'; UF='"dormantX":{"kind":"umbra","r":215,"inner":true,"burn":"R"}'; OP='"open":16,"thirdPts":[[67,-32],[90,-34],[108,-30]],"thirdArm":true'
S0='"edge":"none","bands":false,"flare":5,"topW":9,"scale":0.88,"dx":7'
UP='"accent":["chamfer","spikes"],"spikes":[[5,-11,80,18,5]],"seam":true'                     # 大きな一本棘・ほぼ直立（私の推し）
D62='"accent":["chamfer","spikes"],"spikes":[[7,-10,62,18,5]],"seam":true'
D45='"accent":["chamfer","spikes"],"spikes":[[8,-8,45,17,4.5]],"seam":true'
TRI='"accent":["chamfer","spikes"],"spikes":[[2,-11,85,9,3.8],[8.5,-8,48,10,3.8],[12,0,12,9,3.8]],"seam":true'
SHORT='"accent":["chamfer","spike"]'
sh(){ echo "\"shoulder\":{$S0,$1$2}"; }            # $1＝形／$2＝色（,"tint":[null,"bone"] など・空なら黒鉄のまま）
T(){ echo ",\"tint\":[null,\"$1\"]"; }
cd "$(dirname "$0")"
# ---- 写真
C0="0 IRON (SHAPE ONLY)={$B,$U1,$(sh "$UP" "")}"; C1="1 BONE WHITE={$B,$U1,$(sh "$UP" "$(T bone)")}"; C2="2 CRIMSON={$B,$U1,$(sh "$UP" "$(T crimson)")}"; C3="3 DEEP CRIMSON={$B,$U1,$(sh "$UP" "$(T blood)")}"
C4="4 GOLD={$B,$U1,$(sh "$UP" "$(T gold)")}"; C5="5 SILVER={$B,$U1,$(sh "$UP" "$(T silver)")}"; C6="6 GREEN={$B,$U1,$(sh "$UP" "$(T green)")}"; C7="7 YELLOW={$B,$U1,$(sh "$UP" "$(T yellow)")}"
C8="8 REF: ONLY THE SPIKE IS BONE={$B,$U1,$(sh "$UP" "$(T bone),\"tintPlate\":false")}"
F1="1 SHORT SPIKE (SHOWN BEFORE)={$B,$U1,$(sh "$SHORT" "$(T bone)")}"; F2="2 ONE BIG SPIKE, UPRIGHT={$B,$U1,$(sh "$UP" "$(T bone)")}"; F3="3 LEANING OUT 62={$B,$U1,$(sh "$D62" "$(T bone)")}"; F4="4 LEANING OUT 45={$B,$U1,$(sh "$D45" "$(T bone)")}"; F5="5 REF: THREE SPIKES={$B,$U1,$(sh "$TRI" "$(T bone)")}"
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/１_色の一覧（等倍＝ゲームで見える大きさ・上段 0〜2／中段 3〜5／下段 6〜8）.png" 1 0 -38 3 236 200 "$C0" "$C1" "$C2" "$C3" "$C4" "$C5" "$C6" "$C7" "$C8" | tail -1
LABEL_SCALE=2 node render-gaika2-cand-grid.mjs "$D/２_棘の形の一覧（拡大3倍・両肩が写る枠・上段 1〜3／下段 4〜5）.png" 3 0 -42 3 372 170 "$F1" "$F2" "$F3" "$F4" "$F5" | tail -1
LABEL_SCALE=1 node render-gaika2-cand-grid.mjs "$D/３_最終形態でも確かめた（等倍・左から 白骨／真紅／金）.png" 1 0 13.5 3 400 380 "1 BONE WHITE: FINAL FORM={$B,$OP,$UF,$(sh "$UP" "$(T bone)")}" "2 CRIMSON: FINAL FORM={$B,$OP,$UF,$(sh "$UP" "$(T crimson)")}" "4 GOLD: FINAL FORM={$B,$OP,$UF,$(sh "$UP" "$(T gold)")}" | tail -1
# ---- ページ（形）＝色は白骨で固定
i=0; for a in "$F1" "$F2" "$F3" "$F4" "$F5"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VF/$i.png" 36 -42 "$a" | tail -1; done
node make-click-viewer.mjs "$VF" "蒼神骸華 左肩の棘の形（色は白骨で固定・変わるのは棘だけ）" \
  "1.png|1 前にお見せした短い棘|上の縁の外寄りに 短い棘が一本（0920/２３ の 3 と同じ形）。色が付いたぶん 前より見えます" \
  "2.png|2 大きな一本棘・ほぼ直立（私の推し）|根は 上の縁の外半分。外へ 10° だけ傾く。根の黒い一筋＝面に据えた別の部品と読ませる継ぎ目" \
  "3.png|3 外へ倒した一本棘（62°）|2 との違いは 向きと根の位置だけ" \
  "4.png|4 もっと外へ（45°）|等倍では 後ろの月牙の白銀の刃と 紛れやすい" \
  "5.png|5 参考＝三本棘（ザクの左肩の型）|小さい棘が多いと 荒くれ者の肩当てに寄って 格が落ちる と私は見ます" | tail -1
# ---- ページ（色）＝形は 大きな一本棘で固定
i=-1; for a in "$C0" "$C1" "$C2" "$C3" "$C4" "$C5" "$C6" "$C7" "$C8"; do i=$((i+1)); node render-gaika2-closeup-sheet.mjs "$VC/$i.png" 36 -42 "$a" | tail -1; done
node make-click-viewer.mjs "$VC" "蒼神骸華 左肩の色（形は 大きな一本棘で固定・変わるのは色だけ）" \
  "0.png|0 黒鉄のまま（くらべる基準）|形だけ棘にした姿。等倍（右上）では 棘が ほとんど見えません" \
  "1.png|1 白（白骨）＝私の推し|名前の「骸」の一字。機体の ほかの場所に 同じ色が 0.9% しか無い" \
  "2.png|2 真紅|機体になじむ。ただし 真紅は この機体の「危険の合図」の色で 最終形態では 炉の赤に紛れます（写真３）" \
  "3.png|3 深い真紅（血の色）|2 より暗い。品はあるが 等倍では 目に入りにくい" \
  "4.png|4 金|日蝕の輪・腕の帯と そろう。そのぶん 主役の側（ヒーロー）の匂いが出ます" \
  "5.png|5 銀|腕の機械の色に近く 色を変えた と気づきにくい" \
  "6.png|6 緑|量産機の色に寄ります" \
  "7.png|7 黄色|いちばん目立つ。ただし 工事の標識の色に寄ります" \
  "8.png|8 参考＝棘だけ白骨（面は黒鉄のまま）|ご指定（肩当ての色を変える）からは外れる 控えめな版" | tail -1
# ---- ページ（流れ）＝白骨の肩で 平常 → 皆既 → 最終形態（0921/１ と同じ枠＝2 倍・880×800・中心 (0,13.5)）
export LABEL_SCALE=2
i=0; for a in "1 NORMAL={$B,$U1,$(sh "$UP" "$(T bone)")}" "2 TOTALITY: RIM BURNS={$B,$UF,$(sh "$UP" "$(T bone)")}" "3 FINAL FORM: ARMOR OPENS={$B,$OP,$UF,$(sh "$UP" "$(T bone)")}"; do i=$((i+1)); node render-gaika2-cand-grid.mjs "$VS/$i.png" 2 0 13.5 1 880 800 "$a" | tail -1; done
node make-click-viewer.mjs "$VS" "蒼神骸華 白骨の左肩で 平常 → 皆既 → 最終形態" \
  "1.png|1 平常|蒼の装甲・黒鉄の機体・白骨の左肩" \
  "2.png|2 皆既＝闇が昇りきる|蒼が消えても 白骨の肩は残る＝「蒼神」が蝕まれたあとに残るのは「骸」" \
  "3.png|3 最終形態＝装甲が開く|黒と赤だけの姿の中で 白は 左肩の一か所だけ" | tail -1
echo BUILD27_OK
