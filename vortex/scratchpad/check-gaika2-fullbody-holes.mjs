// 全身に組んで実際に描いたとき 首に背景が透けないかを見る（襟なし collar:'none' を既定にしたときの検査）。
// 胴単体の check-gaika2-holes.mjs は部品ごとの検査なので、頭と肩当てが手前から覆う首の切り欠きまで穴に数えてしまう。
// ここは本番と同じ renderBoss で背景をマゼンタに塗ってから描き、残ったマゼンタを数える。
// node check-gaika2-fullbody-holes.mjs
import { makeCanvas, renderBoss } from './render-boss-rig.mjs';
import { rect } from './gods-sheet.mjs';
import { GAIKA2, GAIKA2_KEYDOWN, GAIKA2_FINAL, GAIKA2_DEF53, gaika2With } from './gaika-candidates.mjs';

const S = Number(process.argv[2]) || 4.2;   // 本番の縮尺（tier.spriteScale）で測る。等倍だけで見ると部品ごとの丸めの隙間を拾う
const W = Math.round(420 * S), H = Math.round(460 * S), CX = W >> 1, CY = H >> 1;
const shoot = (def) => {
  const cv = makeCanvas(W, H); rect(cv, 0, 0, W, H, [255, 0, 255]);
  renderBoss(cv, def, { ...def.tier, spriteScale: S }, CX, CY, { glow: false });
  return cv;
};
const countBg = (cv, x0, x1, y0, y1) => {   // 世界座標の帯にあたる画面の矩形を全部見る＝背景が透けた画素
  let n = 0;
  const px0 = Math.max(0, Math.round(CX + x0 * S)), px1 = Math.min(W - 1, Math.round(CX + x1 * S));
  const py0 = Math.max(0, Math.round(CY + y0 * S)), py1 = Math.min(H - 1, Math.round(CY + y1 * S));
  for (let py = py0; py <= py1; py++) for (let px = px0; px <= px1; px++) {
    const i = (py * W + px) * 3;
    if (cv.px[i] === 255 && cv.px[i + 1] === 0 && cv.px[i + 2] === 255) n++;
  }
  return n;
};

let ng = 0;
for (const [name, def] of [['既定（第53稿）', GAIKA2], ['鍵が入った姿', GAIKA2_KEYDOWN], ['最終形態', GAIKA2_FINAL],
  ['（参考）襟あり', gaika2With({ ...GAIKA2_DEF53, collar: undefined })]]) {
  const cv = shoot(def);
  const neck = countBg(cv, -20, 20, -60, -33);     // 首と頭の両脇（襟をなくした帯）＝事実として出すだけ
  const chest = countBg(cv, -12, 12, -20, 6);      // 胸の炉心のまわり＝弱点が背景で抜けていないか
  console.log(name.padEnd(14), '首と頭の脇', String(neck).padStart(4), '／ 胸', String(chest).padStart(3));
  if (chest > 0) ng++;
}
console.log(ng === 0 ? 'CHEST_OK 胸の弱点に透ける所はない' : 'CHEST_NG ' + ng);
