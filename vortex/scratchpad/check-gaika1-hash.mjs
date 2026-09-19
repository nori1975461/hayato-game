// 第一案 GAIKA が無傷かを確かめる（rows と rig だけのハッシュ・この式での正は 5b00b4e44917＝第39稿の時点で採取。旧い式の 0047746b7253 とは式が違うだけ）。node check-gaika1-hash.mjs
import { createHash } from 'node:crypto';
import { GAIKA } from './gaika-candidates.mjs';
const rows = Object.fromEntries(Object.entries(GAIKA.sprites).map(([k, v]) => [k, v.rows]));
const h = createHash('sha256').update(JSON.stringify({ rows, rig: GAIKA.rig })).digest('hex').slice(0, 12);
console.log('GAIKA1_HASH', h, h === '5b00b4e44917' ? 'SAME' : 'DIFF');
