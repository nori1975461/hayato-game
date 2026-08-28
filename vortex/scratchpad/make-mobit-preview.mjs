// モビット図鑑（プレビュー）を1枚のHTMLとして書き出す。
// ★数値は必ず monsters.js / balance.js から**実際に読んで**埋める。手打ちすると
//   「今の実装の値」でなくなり、確認用のページとしての意味が消える。
// node vortex/scratchpad/make-mobit-preview.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONSTERS } from '../src/data/monsters.js';
import { BALANCE } from '../src/data/balance.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = BALANCE.archetypes;
const W = BALANCE.weapon;

// 役割の説明と、実装から引いた数値。★ここが「性能」の本体
const ROLE = {
  SLASH: { group: 'fight', label: 'きりつけ',
    desc: `まわりの敵を ${A.SLASH.tickSec}秒ごとに切る（半径${A.SLASH.hitRadius}）` },
  SHOT: { group: 'fight', label: 'たま',
    desc: `${A.SHOT.intervalSec}秒ごとに弾（速さ${A.SHOT.bulletSpeed}・射程${A.SHOT.range}）` },
  BEAM: { group: 'fight', label: 'ビーム',
    desc: `${A.BEAM.intervalSec}秒ごとに光線（長さ${A.BEAM.length}・幅${A.BEAM.width}）` },
  FIELD: { group: 'fight', label: 'フィールド',
    desc: `半径${A.FIELD.radius}を ${A.FIELD.slowFactor}倍に遅くし ${A.FIELD.tickSec}秒ごとに${A.FIELD.tickDamage}ダメージ` },
  BOOMERANG: { group: 'fight', label: 'ブーメラン',
    desc: `${A.BOOMERANG.intervalSec}秒ごとに投げて戻る（飛距離${A.BOOMERANG.maxDist}）` },
  RINGWAVE: { group: 'fight', label: 'わのなみ',
    desc: `${A.RINGWAVE.intervalSec}秒ごとに輪の波（最大半径${A.RINGWAVE.maxRadius}）` },
  HEAL: { group: 'support', label: 'かいふく',
    desc: `${A.HEAL.intervalSec}秒ごとに ${A.HEAL.amount}回復（毎秒${(A.HEAL.amount / A.HEAL.intervalSec).toFixed(2)}）` },
  AMMO: { group: 'support', label: 'とくべつなたま',
    desc: `ボス戦で特殊弾を手渡す。1ボス${A.AMMO.perBoss}発／マオウレクス${A.AMMO.perFinal}発`
        + `／軌道神核で+${A.AMMO.trueFormRefill}発` },
  SHIELD: { group: 'support', label: 'いのちのたて',
    desc: `HPが${Math.round(A.SHIELD.hpTrigger * 100)}%を切った瞬間、${A.SHIELD.durSec}秒だけ完全無敵。ボス戦${A.SHIELD.perBoss}回` },
  SPEED: { group: 'support', label: 'ばくそくドリンク',
    desc: `ボス戦の${A.SPEED.delaySec}秒後、移動だけ${A.SPEED.moveMul}倍を${A.SPEED.durSec}秒。ボス戦${A.SPEED.perBoss}回` },
  SLEEPY: { group: 'support', label: 'ねむり／かくせい',
    desc: `軌道神核に入るまで何もしない。覚醒後は${A.SLEEPY.everySec}秒ごとに`
        + `たて／ドリンク／回復(${A.SLEEPY.healAmount})をランダム・**上限なし**` },
  LANCER: { group: 'solo', label: 'ひとりで たたかう',
    desc: `${A.LANCER.huntSec}秒 狩って ${A.LANCER.pantSec}秒 休む。主人公から`
        + `${A.LANCER.minStandoff}〜${A.LANCER.huntRange}px の前線で、${A.LANCER.thrustSec}秒ごとに`
        + `1体ずつ **消滅**させる（気絶させて弾にしない）` },
};
const RARITY = { N: 'よく でる', R: 'ときどき', SR: 'めったに' };

const data = MONSTERS.map((m) => ({
  id: m.id, name: m.name, rarity: m.rarity, color: m.color,
  archetype: m.archetype, baseDamage: m.baseDamage,
  forms: m.forms.map((f) => ({ name: f.name, kind: f.kind, archetype: f.archetype })),
  sprite: m.sprite,
  evo: m.evo ? { id: m.evo.id, name: m.evo.name, baseDamage: m.evo.baseDamage, sprite: m.evo.sprite } : null,
}));

const meta = {
  roles: ROLE, rarity: RARITY,
  maxLevel: W.maxLevel,
  slots: BALANCE.orbit.maxSlots,
  ammoExtra: BALANCE.orbit.ammoExtraSlots,
  lancer: A.LANCER,
  build: fs.readFileSync(path.join(HERE, '../src/data/version.js'), 'utf8').match(/BUILD = '([^']+)'/)[1],
};

const html = `<title>モビット図鑑</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<style>
:root {
  --bg: #f2f4fa;
  --panel: #ffffff;
  --panel-2: #e9edf7;
  --line: #ccd3e6;
  --ink: #171c2b;
  --dim: #5b6480;
  --gold: #b8860b;
  --fight: #2f6fd8;
  --support: #1f8f5f;
  --solo: #b3441a;
  --shadow: 0 1px 2px rgba(20,26,46,.07), 0 6px 18px rgba(20,26,46,.06);
  --grid: rgba(23,28,43,.05);
}
:root:not([data-theme="light"]) {
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #070a16;
    --panel: #101728;
    --panel-2: #17203a;
    --line: #29344f;
    --ink: #e8ecf8;
    --dim: #8b93b4;
    --gold: #ffd23f;
    --fight: #7fb0ff;
    --support: #6ce0a8;
    --solo: #ff8a5c;
    --shadow: 0 1px 2px rgba(0,0,0,.5), 0 10px 26px rgba(0,0,0,.42);
    --grid: rgba(232,236,248,.045);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #070a16;
  --panel: #101728;
  --panel-2: #17203a;
  --line: #29344f;
  --ink: #e8ecf8;
  --dim: #8b93b4;
  --gold: #ffd23f;
  --fight: #7fb0ff;
  --support: #6ce0a8;
  --solo: #ff8a5c;
  --shadow: 0 1px 2px rgba(0,0,0,.5), 0 10px 26px rgba(0,0,0,.42);
  --grid: rgba(232,236,248,.045);
  color-scheme: dark;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  /* ドット絵エディタの方眼。地の色は必ずトークンから塗る（透明のままだと host の地を借りる） */
  background-image: linear-gradient(var(--grid) 1px, transparent 1px),
                    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 16px 16px;
  color: var(--ink);
  font-family: 'Zen Kaku Gothic New', system-ui, -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 40px 20px 88px; }

header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
h1 {
  font-family: 'DotGothic16', monospace;
  font-size: clamp(28px, 5vw, 46px);
  margin: 0; letter-spacing: .04em; text-wrap: balance;
}
.sub { color: var(--dim); font-size: 15px; max-width: 62ch; }
.meta {
  display: flex; flex-wrap: wrap; gap: 8px 18px;
  font-size: 12.5px; color: var(--dim);
  font-variant-numeric: tabular-nums;
  padding-top: 6px; border-top: 1px solid var(--line); margin-top: 14px;
}
.meta b { color: var(--ink); font-weight: 700; }

h2 {
  font-family: 'DotGothic16', monospace;
  font-size: 20px; margin: 46px 0 4px; letter-spacing: .06em;
  display: flex; align-items: center; gap: 10px;
}
h2::before { content: ''; width: 12px; height: 12px; border-radius: 2px; background: var(--accent, var(--gold)); }
h2 .n { color: var(--dim); font-size: 13px; font-family: 'Zen Kaku Gothic New', sans-serif; letter-spacing: 0; }
.lead { color: var(--dim); font-size: 14px; margin: 0 0 20px; max-width: 66ch; }

.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 16px 16px 14px;
  display: flex; flex-direction: column; gap: 12px;
  border-top: 3px solid var(--accent);
}
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.nm { font-family: 'DotGothic16', monospace; font-size: 20px; line-height: 1.25; letter-spacing: .03em; }
.evonm { color: var(--dim); font-size: 12.5px; font-family: 'DotGothic16', monospace; letter-spacing: .03em; }
.chip {
  font-size: 11px; padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--line); color: var(--dim); background: var(--panel-2);
}
.chip.role { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); }

.art {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  background: var(--panel-2); border-radius: 8px; padding: 12px 8px;
}
.art canvas { display: block; image-rendering: pixelated; }
.arrow { color: var(--dim); font-size: 15px; }
.cap { text-align: center; font-size: 11px; color: var(--dim); margin-top: 4px; }

.desc { font-size: 13.5px; }
.desc strong { color: var(--accent); font-weight: 700; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font-size: 12.5px; }
dt { color: var(--dim); }
dd { margin: 0; font-variant-numeric: tabular-nums; }
.forms { font-size: 12px; color: var(--dim); border-top: 1px dashed var(--line); padding-top: 9px; }
.forms span { color: var(--ink); }

footer { margin-top: 54px; padding-top: 16px; border-top: 1px solid var(--line);
         color: var(--dim); font-size: 12.5px; }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform .16s ease, box-shadow .16s ease; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(0,0,0,.14), 0 14px 30px rgba(0,0,0,.16); }
}
</style>

<div class="wrap">
  <header>
    <h1>モビット図鑑</h1>
    <p class="sub">「クルット・モビット」に出てくる仲間モンスター全12種。絵・名前・進化形・実装されている性能の数値を、ゲーム本体のデータからそのまま書き出したもの。</p>
    <div class="meta">
      <span>ビルド <b id="build"></b></span>
      <span>公転わく <b id="slots"></b>人（＋とくべつなたま役の専用わく <b id="extra"></b>）</span>
      <span>ぶきレベル上限 <b id="maxlv"></b></span>
    </div>
  </header>

  <h2 style="--accent: var(--fight)">たたかう <span class="n" id="nfight"></span></h2>
  <p class="lead">敵にダメージを与える役。公転わくを取り合うのはこの子たち。数字はぶきレベル1の素の値で、レベルと進化と合体で伸びる。</p>
  <div class="grid" id="fight"></div>

  <h2 style="--accent: var(--support)">ささえる <span class="n" id="nsupport"></span></h2>
  <p class="lead">敵に一切さわらない役。攻撃しないので「仲間はとどめを刺せない」という設計の関門と関係なく成立する。ここの数値はぶきレベルでも合体でも伸びない ― この子たちの価値は量ではなく「ここぞで必ず1回ある」ことなので。</p>
  <div class="grid" id="support"></div>

  <h2 style="--accent: var(--solo)">ひとりで たたかう <span class="n" id="nsolo"></span></h2>
  <p class="lead">公転の輪から外れて自分で前線へ出ていく、たった1体の例外。<b>このゲームで唯一とどめを刺せる仲間</b>でもある ― 他の子は敵をよろけさせるまでしかできず、消すのは主人公の投げだけ、という根本ルールをこの子だけが破る。だから合体でしか手に入らない超レアに置いてある。</p>
  <div class="grid" id="solo"></div>

  <footer>数値はすべて <code>src/data/monsters.js</code> と <code>src/data/balance.js</code> から生成。手で書いた数字は1つも無い。</footer>
</div>

<script>
const MONS = ${JSON.stringify(data)};
const META = ${JSON.stringify(meta)};

function draw(sprite, px) {
  const rows = sprite.rows, pal = sprite.palette;
  const w = rows[0].length, h = rows.length;
  const c = document.createElement('canvas');
  c.width = w * px; c.height = h * px;
  c.style.width = (w * px) + 'px'; c.style.height = (h * px) + 'px';
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(x * px, y * px, px, px);
    }
  }
  return c;
}

function card(m) {
  const role = META.roles[m.archetype];
  const el = document.createElement('article');
  el.className = 'card';
  el.style.setProperty('--accent', m.color);

  const top = document.createElement('div');
  top.className = 'top';
  const names = document.createElement('div');
  names.innerHTML = '<div class="nm"></div>' + (m.evo ? '<div class="evonm"></div>' : '');
  names.querySelector('.nm').textContent = m.name;
  if (m.evo) names.querySelector('.evonm').textContent = '→ ' + m.evo.name;
  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;flex-direction:column;gap:5px;align-items:flex-end';
  const c1 = document.createElement('span'); c1.className = 'chip role'; c1.textContent = role.label;
  const c2 = document.createElement('span'); c2.className = 'chip';
  c2.textContent = m.rarity + '・' + META.rarity[m.rarity];
  chips.append(c1, c2);
  top.append(names, chips);

  const art = document.createElement('div');
  art.className = 'art';
  const a = document.createElement('div');
  a.append(draw(m.sprite, 5));
  const cap1 = document.createElement('div'); cap1.className = 'cap'; cap1.textContent = 'きほん';
  a.append(cap1);
  art.append(a);
  if (m.evo) {
    const ar = document.createElement('div'); ar.className = 'arrow'; ar.textContent = '▶';
    const b = document.createElement('div');
    b.append(draw(m.evo.sprite, 5));
    const cap2 = document.createElement('div'); cap2.className = 'cap'; cap2.textContent = 'しんか';
    b.append(cap2);
    art.append(ar, b);
  }

  const d = document.createElement('p');
  d.className = 'desc';
  d.innerHTML = role.desc.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

  const dl = document.createElement('dl');
  const rows = [];
  if (role.group === 'fight') {
    rows.push(['きほん攻撃力', m.baseDamage + (m.evo ? '  →  ' + m.evo.baseDamage + '（しんか）' : '')]);
  } else if (role.group === 'solo') {
    rows.push(['きほん攻撃力', m.baseDamage + (m.evo ? '  →  ' + m.evo.baseDamage + '（しんか）' : '')]);
    rows.push(['やりの ながさ', (META.lancer.reach * 2) + 'px（からだは ' + Math.round(16 * META.lancer.spriteScale) + 'px）']);
    rows.push(['からだの 大きさ', META.lancer.spriteScale + '倍（ほかの子は 2.5倍）']);
  } else {
    rows.push(['攻撃力', 'なし（敵にさわらない）']);
  }
  rows.push(['ID', m.id + (m.evo ? ' / ' + m.evo.id : '')]);
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }

  const f = document.createElement('div');
  f.className = 'forms';
  f.innerHTML = 'ぶきフォーム： <span>' + m.forms.map((x) =>
    x.name + '（' + (x.kind === 'melee' ? '近' : '遠') + '）').join('</span> ／ <span>') + '</span>';

  el.append(top, art, d, dl, f);
  return el;
}

document.getElementById('build').textContent = 'v' + META.build;
document.getElementById('slots').textContent = META.slots;
document.getElementById('extra').textContent = META.ammoExtra;
document.getElementById('maxlv').textContent = META.maxLevel;

for (const g of ['fight', 'support', 'solo']) {
  const list = MONS.filter((m) => META.roles[m.archetype].group === g);
  document.getElementById('n' + g).textContent = list.length + 'たい';
  for (const m of list) document.getElementById(g).append(card(m));
}
</script>
`;

fs.writeFileSync(path.join(HERE, 'mobits.html'), html, 'utf8');
console.log('書き出し: vortex/scratchpad/mobits.html');
for (const g of ['fight', 'support', 'solo']) {
  console.log(`  ${g}: ${data.filter((m) => ROLE[m.archetype].group === g).length}体`);
}
console.log(`  合計 ${data.length}体`);
