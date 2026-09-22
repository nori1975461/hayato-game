#!/bin/bash
# 0922/３ の一式＝三本目の光刃を「刃に見えて光弾を撃つ」遠距離の武器に（09-22 12:37 ユーザー案を採用）＋刃先が格子で切れていた不具合の前後
#   bash build-gaika2-folder33.sh "<出力先フォルダ>"
set -e
OUT="$1"
[ -z "$OUT" ] && { echo "出力先を渡してください"; exit 1; }
cd "$(dirname "$0")"
mkdir -p "$OUT"

FIXED=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify(m.GAIKA2_FINAL_OPT)))")
SHOTS=$(node -e "import('./gaika-candidates.mjs').then(m=>console.log(JSON.stringify({...m.GAIKA2_FINAL_OPT, openGun:{kind:'saber',shots:3}})))")

# １ 等倍の全身＝構え（候補 95）と 撃つ瞬間（候補 98）。光弾は機体の外（x=±183〜225）へ飛ぶので枠は 520 幅
node render-gaika2-cand-grid.mjs "$OUT/１_等倍の全身（左＝構え＝確定版95／右＝光弾を撃つ瞬間＝98）.png" \
  1 0 -20 2 520 340 "1 READY (95)=$FIXED" "2 FIRING (98)=$SHOTS"

# ２ 刃先の 3 倍＝上が構え・下が撃つ瞬間（画面左の腕。右は鏡）
node render-gaika2-cand-grid.mjs "$OUT/２_刃先の3倍（上＝構え／下＝撃つ瞬間＝刃先の閃きと光弾3発）.png" \
  3 -170 -12 1 640 200 "1 READY=$FIXED" "2 FIRING=$SHOTS"

# ３ 刃先の不具合の前後＝前は直す前のコード（コミット 2f7b590）で同じ候補 95 を描く
git show 2f7b590:vortex/scratchpad/gaika-candidates.mjs > ./.gaika-candidates-old.mjs
cat > ./.render-before-after.mjs <<'EOS'
import { makeCanvas, renderBoss, writePng } from './render-boss-rig.mjs';
import { rect, text, BGC, WHITE } from './gods-sheet.mjs';
import * as OLD from './.gaika-candidates-old.mjs';
import * as NEW from './gaika-candidates.mjs';
const [file, a] = [process.argv[2], JSON.parse(process.argv[3])], S = 4, wx = -165, wy = -12, PW = 320, PH = 180, W = PW * 2 + 2, out = makeCanvas(W, PH); rect(out, 0, 0, W, PH, [40, 42, 64]);
[[OLD, 'BEFORE (CLIPPED AT GRID EDGE)'], [NEW, 'AFTER (TIP DRAWN TO THE END)']].forEach(([M, tag], i) => {
  const d = M.gaika2With(a), cv = makeCanvas(PW, PH); rect(cv, 0, 0, PW, PH, BGC);
  renderBoss(cv, d, { ...d.tier, spriteScale: S }, PW / 2 - wx * S, PH / 2 - wy * S, { glow: false }); text(cv, tag, 4, 4, WHITE, 1);
  const ox = i * (PW + 2); for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const s = (y * PW + x) * 3, p = (y * W + ox + x) * 3; out.px[p] = cv.px[s]; out.px[p + 1] = cv.px[s + 1]; out.px[p + 2] = cv.px[s + 2]; }
});
writePng(out, file); console.log('BEFORE_AFTER_OK');
EOS
node ./.render-before-after.mjs "$OUT/３_刃先の不具合（4倍・左＝直す前＝格子の縁で平らに切れていた／右＝直した後＝先まで細る）.png" "$FIXED"
rm -f ./.gaika-candidates-old.mjs ./.render-before-after.mjs

# ４ クリックで見るページ（構え → 撃つ瞬間）＝2 倍・画面左の腕と胸が入る枠
S="$OUT/４_構えと撃つ瞬間をクリックで見るページ"
mkdir -p "$S"
node render-gaika2-cand-grid.mjs "$S/1_構え（確定版95）.png"   2 -100 -20 1 640 360 "1 READY (95)=$FIXED"  > /dev/null
node render-gaika2-cand-grid.mjs "$S/2_撃つ瞬間（98）.png"     2 -100 -20 1 640 360 "2 FIRING (98)=$SHOTS" > /dev/null
node make-click-viewer.mjs "$S" "三本目の光刃＝刃に見えて光弾を撃つ（構え → 撃つ瞬間）" \
  "1_構え（確定版95）.png|1 構え（確定版 95）|09-22 昼に確定した絵。刃先が格子で切れていた不具合だけ直してある（先まで細る）" \
  "2_撃つ瞬間（98）.png|2 撃つ瞬間（98）|刃先に閃き・刃の延長線上へ紡錘の光弾 3 発。刃と同じ 4 層の色・光弾は掴めない（避けるだけ）"

echo "FOLDER33_OK"
