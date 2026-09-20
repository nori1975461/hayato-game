// 候補（gaika2With へ渡す JSON か export 名）のテクスチャごとのハッシュ。変種を足す前後で旧い形が不変かを確かめる。node check-gaika2-cand-hash.mjs <候補>...
import { createHash } from 'node:crypto';
import * as M from './gaika-candidates.mjs';
for (const a of process.argv.slice(2)) {
  const d = a.startsWith('{') ? M.gaika2With(JSON.parse(a)) : M[a];
  const hs = Object.entries(d.sprites).map(([k, v]) => k + ':' + createHash('sha256').update(JSON.stringify(v.rows)).digest('hex').slice(0, 8));
  console.log('CAND', a, '\n  ' + hs.join(' '));
}
