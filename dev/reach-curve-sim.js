// スコア曲線シミュレータ: ステージ進行に対して「武器idx / ゆうしゃレベル / クラスチェンジ形態」が
// どのテンポで最強に到達するかを机上で試算する（実プレイのばらつきは無視した理論値）。
// 使い方: node reach-curve-sim.js <game.jsのパス>
//
// スコアの源泉（game.jsの実装に合わせたモデル）:
//   - ボスはスコアが nextBossScore に達すると出現（初期3000）。道中は雑魚狩りでここまで到達する前提。
//   - ボスHP = round((26 + stage*16 + bossCount*4) * hpMul)。ヒットごとに +round(dmg*10) 入るため、
//     1体を倒す間に稼ぐボスヒット点 ≈ HP*10（ダメージ量に依らずほぼ一定）。
//   - 撃破ボーナス ≈ points = 2000 + stage*100（コンボ倍率は1として理論下限）。
//   - 撃破後 nextBossScore = max(nextBossScore + 4000 + stage*200, score + 3000)。
// hpMul・コンボ・道中雑魚の上振れは無視した「最低ライン」の見積り。実プレイはこれより速く育つ。
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');

// game.jsからテーブルと関数だけを取り出す（描画やDOMは読み込まない）
function extract(re) { const m = src.match(re); if (!m) throw new Error('抽出失敗: ' + re); return m[0]; }
const chunk = [
  extract(/const FORMS = \[[\s\S]*?\n\];/),
  extract(/const FORM_SCORES = \[[^\]]*\];/),
  extract(/function formForScore\(s\)[\s\S]*?\n\}/),
  extract(/const HERO_LV = \[[\s\S]*?\n\];/),
  extract(/function defaultHero\(\)[\s\S]*?\n\}/),
  'let hero = defaultHero();',
  extract(/const WEAPONS = \[[\s\S]*?\n\];/),
  extract(/function weaponForScore\(s\)[\s\S]*?\n\}/),
  // vmの字句宣言(const/let)はsandboxのプロパティにならないので明示的に載せ替える
  'this.WEAPONS = WEAPONS; this.HERO_LV = HERO_LV; this.FORMS = FORMS; this.FORM_SCORES = FORM_SCORES; this.formForScore = formForScore; this.weaponForScore = weaponForScore;',
].join('\n');

const sandbox = { Math };
vm.createContext(sandbox);
vm.runInContext(chunk, sandbox);
const { WEAPONS, HERO_LV, FORMS, FORM_SCORES, formForScore, weaponForScore } = sandbox;

// スコアからゆうしゃレベル（Lv1〜）を求める
function heroLevelForScore(s) {
  let lv = 1;
  for (let i = 0; i < HERO_LV.length; i++) if (s >= HERO_LV[i].score) lv = i + 2;
  return lv;
}
function line(label, score) {
  const wi = weaponForScore(score);
  const lv = heroLevelForScore(score);
  const fi = formForScore(score); // クラスチェンジはスコア基準（game.jsと同じ判定）
  return `${label}  score=${String(score).padStart(7)}  ぶきLv${String(wi + 1).padStart(2)} ${WEAPONS[wi].name.padEnd(12, '　')}  ゆうしゃLv${String(lv).padStart(2)}  形態${fi} ${FORMS[fi].name}`;
}

const LAST_STAGE = 20;
console.log('=== スコア曲線シミュレータ（理論最低ライン）===');
console.log('武器69段階 / ゆうしゃLv1〜12 / クラスチェンジ8形態\n');

let score = 0;
let nextBossScore = 3000;
let bossCount = 0;
const clearScores = [];
for (let stage = 1; stage <= LAST_STAGE; stage++) {
  // 道中の雑魚狩りでボス出現ラインまで到達
  score = Math.max(score, nextBossScore);
  console.log(line(`S${String(stage).padStart(2)}ボス出現`, score));

  bossCount++;
  const hp = Math.round(26 + stage * 16 + bossCount * 4);
  score += hp * 10;                 // ボスへのヒットで貯まる点（≈HP*10）
  score += 2000 + stage * 100;      // 撃破ボーナス（コンボ倍率1の理論下限）
  console.log(line(`S${String(stage).padStart(2)}クリア  `, score));
  clearScores.push(score);

  nextBossScore = Math.max(nextBossScore + 4000 + stage * 200, score + 3000);
  console.log('');
}

// ---- 到達テンポの要約 ----
function firstStageReaching(pred) {
  for (let i = 0; i < clearScores.length; i++) if (pred(clearScores[i])) return i + 1;
  return null;
}
const finalWeaponScore = WEAPONS[WEAPONS.length - 1].score;
const finalFormScore = FORM_SCORES[FORM_SCORES.length - 1]; // 最終形態(idx7)に入るスコア閾値
const maxHeroScore = HERO_LV[HERO_LV.length - 1].score;

console.log('=== 到達テンポの要約（各クリア時点で条件到達した最初のステージ）===');
console.log(`最終武器「${WEAPONS[WEAPONS.length - 1].name}」(${finalWeaponScore}点): S${firstStageReaching(s => s >= finalWeaponScore)}クリア`);
console.log(`最終形態 idx7「${FORMS[7].name}」(スコア閾値${finalFormScore}点): S${firstStageReaching(s => formForScore(s) >= FORMS.length - 1)}クリア`);
console.log(`ゆうしゃ最大Lv12 (${maxHeroScore}点): S${firstStageReaching(s => s >= maxHeroScore)}クリア`);
console.log(`\n参考ターゲット: 最終形態は約97,000点(=武器idx56)・ステージ17前後で到達が狙い。`);
