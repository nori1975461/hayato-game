// 波動の描き直し（1回目＝棘が短く太く色が暗い→「ウニ／花」に見えた）。貼付資料に寄せる＝明るい結晶状の体＋細く長い破片
const fs = require('fs'), F = __dirname + '/gaika-candidates.mjs';
let t = fs.readFileSync(F, 'utf8'); const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const re = /function burstAt\(G, cx, cy, dx, dy, sc, R\) \{[\s\S]*?\n\}\nfunction openShots4/;
if ((t.match(new RegExp(re.source, 'g')) || []).length !== 1) throw new Error('BURST_FN_NOT_UNIQUE');
const NEW = `function burstAt(G, cx, cy, dx, dy, sc, R) {   // 波動＝光の先で膨れた結晶状の閃光（貼付資料）。①細く長い破片（前がいちばん長い・横は長さ違い・後ろは短い）②角ばった明るい体（短く太い棘の重なり＝丸い円にすると玉に見える罠）③白い芯
  const fw = Math.atan2(dy, dx), rad = (ad) => fw + (ad * Math.PI) / 180, ray = (ad, lf) => mkSlab(G, cx, cy, cx + Math.cos(rad(ad)) * R * lf, cy + Math.sin(rad(ad)) * R * lf);
  const SH = [[0, 1.4, 0.17], [24, 0.95, 0.15], [-24, 0.95, 0.15], [52, 0.72, 0.13], [-52, 0.72, 0.13], [88, 0.85, 0.15], [-88, 0.85, 0.15], [118, 0.55, 0.12], [-118, 0.55, 0.12], [148, 0.62, 0.13], [-148, 0.62, 0.13], [180, 0.42, 0.11]];   // [向き°, 長さ/R, 根の半幅/R]
  const shards = SH.map(([ad, lf, wf]) => ({ s: ray(ad, lf), hw: (u) => R * wf * (1 - u) + 0.3 }));
  for (const { s, hw } of shards) s.slab(0, 0.98, (u) => hw(u) + 0.7, () => 'k');   // 縁を先に全部置いてから中を塗る（破片どうしの重なりに黒い線を残さない）
  for (const { s, hw } of shards) { s.slab(0, 1, hw, () => sc.b); s.slab(0, 1, (u) => hw(u) * 0.5, () => sc.a); s.slab(0, 0.6, (u) => hw(u) * 0.22, () => sc.core); }
  const BD = [[10, 0.55, 0.3], [-14, 0.5, 0.3], [40, 0.46, 0.28], [-38, 0.5, 0.28], [72, 0.44, 0.26], [-68, 0.42, 0.26], [104, 0.4, 0.24], [-108, 0.42, 0.24], [140, 0.4, 0.24], [-136, 0.38, 0.24], [172, 0.34, 0.22], [-170, 0.32, 0.22]];   // 体＝わざと不揃い
  for (const [ad, lf, wf] of BD) { const s = ray(ad, lf), hw = (u) => R * wf * (1 - u * 0.9); s.slab(0, 1, hw, () => sc.b); s.slab(0, 1, (u) => hw(u) * 0.72, () => sc.a); }
  const rc = R * 0.26, cd = mkSlab(G, cx - dx * rc, cy - dy * rc, cx + dx * rc, cy + dy * rc), cw = (u) => rc * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
  cd.slab(0, 1, (u) => cw(u) + 0.5, () => sc.a); cd.slab(0, 1, cw, () => sc.core);   // 芯＝白い円
}
function openShots4`;
t = t.replace(re, () => NEW);
fs.writeFileSync(F, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCH_BURST2_OK');
