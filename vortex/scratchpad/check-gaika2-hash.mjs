// 第二案 GAIKA2（現行＝ノイエ・ジール版）の rows+rig のハッシュ。変種を足す前後で不変かを確かめる。node check-gaika2-hash.mjs [期待値]
import { createHash } from 'node:crypto';
import { GAIKA2 } from './gaika-candidates.mjs';
const rows = Object.fromEntries(Object.entries(GAIKA2.sprites).map(([k, v]) => [k, v.rows]));
const h = createHash('sha256').update(JSON.stringify({ rows, rig: GAIKA2.rig })).digest('hex').slice(0, 12);
console.log('GAIKA2_HASH', h, process.argv[2] ? (h === process.argv[2] ? 'SAME' : 'DIFF') : '');
