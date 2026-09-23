// gaika-sfx-d.js の「貼り付け用コード」が本当に本体へ入るかを機械で確かめる。
//   ①構文が通るか（3 つの断片を 1 ファイルに組んで node の parser にかける）
//   ②TONE_PATCH が「いまの sound.js の tone() に、足すもの以外を 1 行も変えていない」か
//      ＝元の tone() の各行が、差し替え後にも（新規行を除いて）そのまま在ることを照合する
//   ③音の部品が設計どおりの数だけ呼ばれるか（育つ 1・一発 6・照射 4・切れ 2）
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TONE_PATCH, GROW_PULSE, SOUND_METHOD } from './gaika-sfx-d.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, '../src/audio/sound.js'), 'utf8');
let ng = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'NG   ') + msg); if (!cond) ng++; };

// ---- ①構文
const combined = `let ctx, sfxGain, verbBus;\nfunction noiseHit(){}\nfunction duckBgm(){}\n${TONE_PATCH}\n${GROW_PULSE}\nconst Sound = {\n${SOUND_METHOD}\n};\n`;
try { new vm.Script(combined); ok(true, '構文（3 断片を組んで parse できる）'); }
catch (e) { ok(false, '構文：' + e.message); }

// ---- ②元の tone() を 1 行も壊していないか
const m = src.match(/\nfunction tone\(opts\) \{[\s\S]*?\n\}\n/);
ok(!!m, '本体から tone() を取り出せた');
if (m) {
  const orig = m[0].trim().split('\n').map((s) => s.trim()).filter(Boolean);
  const patched = TONE_PATCH.trim().split('\n').map((s) => s.trim()).filter(Boolean);
  // 接続の行は else 節の中へ移しただけなので、消える行は 1 行も無いのが正しい
  const missing = orig.filter((l) => !patched.includes(l));
  ok(missing.length === 0, '元の tone() の行が 1 行も消えていない  消えた行=' + JSON.stringify(missing));
  const added = patched.filter((l) => !orig.includes(l));
  ok(added.every((l) => /lp|osc\.connect|} else \{|\}/.test(l)),
    '足した行はローパスと接続だけ（' + added.length + ' 行）');
  ok(/lpFreq = 0/.test(TONE_PATCH) && /lpFreq > 0/.test(TONE_PATCH),
    'ローパスは既定で無効（lpFreq = 0 のとき従来と同じ経路）');
}

// ---- ③設計どおりの部品数と長さ
const n = (re) => (SOUND_METHOD.match(re) || []).length;
ok(n(/growPulse\(/g) === 1, '育つ＝growPulse 1 回');
// 一発 5（ピ・掃引 2 本・丸い成分・ドン）＋照射 3（胴・矩形・粒）＋切れ 1 ＝ 9 本。noiseHit は カッ・照射・切れ の 3
ok(n(/tone\(/g) === 9 && n(/noiseHit\(/g) === 3, '発音の数＝tone 9・noiseHit 3（' + n(/tone\(/g) + '／' + n(/noiseHit\(/g) + '）');
ok(/const CH = 0\.35, BEAM = 1\.00/.test(SOUND_METHOD), '⭐D-長＝育つ 0.35 秒・照射 1.00 秒（09-23 11:19 確定）');
ok(/freq: 2400, freqEnd: 150[\s\S]*?lpQ: 8/.test(SOUND_METHOD), '一発＝2400→150Hz の共鳴つき掃引（ビームライフルの芯）');
ok(/freq: 140, freqEnd: 42/.test(SOUND_METHOD), '一発＝140→42Hz の土台のドン');
ok(/freq: 900, freqEnd: 120/.test(SOUND_METHOD), '切れる＝900→120Hz');

// ---- ④本体はまだ触っていないこと（骸華が入るまで入れない約束）
ok(!/gaikaBeamRifle|growPulse/.test(src), '本体 sound.js にはまだ入れていない（ボス実装時に入れる）');

console.log(ng === 0 ? 'GAIKA_SFX_D_OK' : 'GAIKA_SFX_D_NG ' + ng);
process.exit(ng === 0 ? 0 : 1);
