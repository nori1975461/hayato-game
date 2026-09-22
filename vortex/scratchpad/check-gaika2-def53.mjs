// 第53稿の既定が、ユーザーが選んだ候補と画素まで同じかを確かめる。node check-gaika2-def53.mjs
// 既定 GAIKA2＝候補 63（ふだん＝左肩は跳ね上げ・金）／GAIKA2_KEYDOWN＝候補 87（鍵が入った姿）／GAIKA2_FINAL＝候補 117（最終形態＝09-22 に跡＝窪み＋金具・三本目はマゼンタの光刃で確定）
import { createHash } from 'node:crypto';
import { GAIKA2, GAIKA2_KEYDOWN, GAIKA2_FINAL, gaika2With } from './gaika-candidates.mjs';
import { CANDS } from './resume-gaika-now.mjs';

const sig = (g) => createHash('sha256').update(JSON.stringify({
  rows: Object.fromEntries(Object.entries(g.sprites).map(([k, v]) => [k, v.rows])),
  rig: g.rig.map(({ role, tex, ox, oy, origin }) => ({ role, tex, ox, oy, origin })),
})).digest('hex').slice(0, 12);

let ng = 0;
for (const [name, built, no] of [['GAIKA2', GAIKA2, 63], ['GAIKA2_KEYDOWN', GAIKA2_KEYDOWN, 87], ['GAIKA2_FINAL', GAIKA2_FINAL, 117]]) {
  const c = CANDS[no];
  if (!c) { console.log(name, '候補', no, 'が見つからない'); ng++; continue; }
  const want = sig(gaika2With(c.opt || c.o || c));
  const got = sig(built);
  const ok = want === got;
  if (!ok) ng++;
  console.log(`${name} = 候補${no} ${ok ? 'SAME' : 'DIFF'} ${got} ${want}`);
}
console.log(ng === 0 ? 'DEF53_OK' : 'DEF53_NG ' + ng);
