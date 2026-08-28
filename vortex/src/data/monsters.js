// 仲間モンスター6種＋進化6形態＋プレイヤー3段階のスプライト定義（PROTOTYPE_SPEC §10.5）。
// スプライトは HAYATO 式テキストグリッド（'.'=透明・全行同長・幅高さ8〜16）。
// palette に無い文字を rows に使わないこと（validate-data.js が検証）。
// v2: 仲間は16×16のゆるふわ造形（丸目2×2＋白ハイライト＋ほっぺ＋小さな口）。
//     各要素に evo（進化形態: id/name/baseDamage/sprite/ovr。color は基本形を継承）をネスト。
//     詳細な造形ルールは dev/SPRITE_GUIDE.md を参照。

export const MONSTERS = [
  {
    // 星型の耳を持つまんまる子犬。開始編成の1体。おしりに星のしっぽ。
    id: 'starpuppy',
    name: 'スターパピー',
    rarity: 'N',
    archetype: 'SLASH',
    color: '#7fd8ff',
    baseDamage: 4,
    // R4: 武器フォームチェンジ。form0=近接(melee)/form1=遠距離(ranged)を必ずこの順で。
    // weaponLevel の2Lv帯ごとに交互に切り替わる（band%2）。tex は Boot.js で内製する武器テクスチャ名。
    forms: [
      { name: 'にくきゅうグーパンチ', kind: 'melee',  archetype: 'SLASH', tex: 'w_paw', sfx: 'punch' },
      { name: 'おもちゃボールなげ',   kind: 'ranged', archetype: 'SHOT',  tex: 'w_toy', sfx: 'shoot' },
    ],
    sprite: {
      palette: { a: '#7fd8ff', d: '#4a9fd8', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', s: '#ffe066' },
      rows: [
        '...s........s...',
        '..sss......sss..',
        '..ssaaaaaaaass..',
        '...aaaaaaaaaa...',
        '..aaaaaaaaaaaa..',
        '..aaaaaaaaaaaa..',
        '..aawkaaaawkaa..',
        '..aakkaaaakkaa..',
        '..ppaaakkaaapp..',
        '..aaawwwwwwaaas.',
        '..aaawwwwwwaaass',
        '...aawwwwwwaa...',
        '...aaaaaaaaaa...',
        '....aaddddaa....',
        '....aa....aa....',
        '....dd....dd....',
      ],
    },
    // 彗星の角と流星の尾を持つ青白い大型犬。
    evo: {
      id: 'comethound',
      name: 'コメットハウンド',
      baseDamage: 9,
      ovr: { hitRadius: 20 },
      sprite: {
        palette: { a: '#7fd8ff', d: '#4a9fd8', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', s: '#ffe066' },
        rows: [
          '..s..........s..',
          '..ss........ss..',
          '..ssaaaaaaaass..',
          '...aaaaaaaaaa...',
          '..aaaaaaaaaaaa..',
          '..aaaaaaaaaaaa..',
          '..aawkaaaawkaa..',
          '..aakkaaaakkaa..',
          '..ppaaakkaaapp..',
          '..aaawwwwwwaaa..',
          '..aawwwwwwwwaa..',
          '..aawwwwwwwwaas.',
          '...aaaaaaaaaass.',
          '....aaddddaa....',
          '....aa....aa....',
          '....dd....dd....',
        ],
      },
    },
  },
  {
    // トゲトゲのやんちゃ坊主。縫いぐるみトゲ＋にっと笑った八重歯。
    id: 'togeron',
    name: 'トゲロン',
    rarity: 'N',
    archetype: 'BOOMERANG',   // クッキーブーメラン（スイーツ系）
    color: '#9dff70',
    baseDamage: 5,
    forms: [
      { name: 'ぺろぺろ巨大ハンマー', kind: 'melee',  archetype: 'SLASH',     tex: 'w_hammer', sfx: 'hammer' },
      { name: 'ケーキなげ',           kind: 'ranged', archetype: 'BOOMERANG', tex: 'w_cookie', sfx: 'boomerang' },
    ],
    sprite: {
      palette: { a: '#9dff70', d: '#5fbf3f', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', s: '#d4ff9e' },
      rows: [
        '..s.s.s..s.s.s..',
        '..aaaaaaaaaaaa..',
        '.aaaaaaaaaaaaaa.',
        'saaaaaaaaaaaaaas',
        '.aaaaaaaaaaaaaa.',
        '.aawkaaaaaawkaa.',
        '.aakkaaaaaakkaa.',
        '.ppaaaaaaaaaapp.',
        '.aaaakwwwwkaaaa.',
        '.aaaawwwwwwaaaa.',
        '.aaaawwwwwwaaaa.',
        '..aaawwwwwwaaa..',
        '..aaaaaaaaaaaa..',
        '...aaddddddaa...',
        '....dd....dd....',
        '....dd....dd....',
      ],
    },
    // 金のトゲ王冠をかぶったトゲの王。
    evo: {
      id: 'togeking',
      name: 'トゲキング',
      baseDamage: 11,
      ovr: { hitRadius: 20 },
      sprite: {
        palette: { a: '#9dff70', d: '#5fbf3f', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', g: '#ffd23f' },
        rows: [
          '..g.g.g..g.g.g..',
          '..gggggggggggg..',
          '.aaaaaaaaaaaaaa.',
          'gaaaaaaaaaaaaaag',
          '.aaaaaaaaaaaaaa.',
          '.aawkaaaaaawkaa.',
          '.aakkaaaaaakkaa.',
          '.ppaaaaaaaaaapp.',
          '.aaaakwwwwkaaaa.',
          '.aaaawwwwwwaaaa.',
          '.aaaawwwwwwaaaa.',
          '..aaawwwwwwaaa..',
          '..aaaaaaaaaaaa..',
          '...aaddddddaa...',
          '....gg....gg....',
          '....gg....gg....',
        ],
      },
    },
  },
  {
    // たまご型の電気ウサギ。長い耳と赤い電気ほっぺ。弾は黄色。開始編成の1体。
    id: 'pikabit',
    name: 'ピカビット',
    rarity: 'N',
    archetype: 'SHOT',
    color: '#ffe066',
    baseDamage: 3,
    forms: [
      { name: 'きらきらビンタ',   kind: 'melee',  archetype: 'SLASH', tex: 'w_star2',   sfx: 'punch' },
      { name: 'ピカピカビーム',   kind: 'ranged', archetype: 'BEAM',  tex: 'w_rainbow', sfx: 'beam' },
    ],
    sprite: {
      palette: { a: '#ffe066', d: '#d8a838', w: '#ffffff', k: '#1b3b5f', p: '#ff8f8f', o: '#ff9e66' },
      rows: [
        '...aa......aa...',
        '..aoa......aoa..',
        '..aoa......aoa..',
        '..aoa......aoa..',
        '..aaa......aaa..',
        '...aaaaaaaaaa...',
        '..aaaaaaaaaaaa..',
        '..aawkaaaawkaa..',
        '..aakkaaaakkaa..',
        '..ppaaakwaaapp..',
        '..aaawwwwwwaaa..',
        '..aaawwwwwwaaa..',
        '...aawwwwwwaa...',
        '...aaaaaaaaaa...',
        '....aa....aa....',
        '....dd....dd....',
      ],
    },
    // 稲妻耳が逆立った電光の兎。
    evo: {
      id: 'thunderbit',
      name: 'サンダービット',
      baseDamage: 7,
      ovr: { hitRadius: 20, length: 190, width: 9 },   // R4: pikabitのフォームは SLASH/BEAM。近接hitRadius＋ピカピカビームの length/width を強化（旧 intervalSec は BEAM で読まれず死んでいた）
      sprite: {
        palette: { a: '#ffe066', d: '#d8a838', w: '#ffffff', k: '#1b3b5f', p: '#ff5e5e', o: '#ff9e66' },
        rows: [
          '....a......a....',
          '...aa......aa...',
          '..aa........aa..',
          '..aoa......aoa..',
          '..aaa......aaa..',
          '...aaaaaaaaaa...',
          '..aaaaaaaaaaaa..',
          '..aawkaaaawkaa..',
          '..aakkaaaakkaa..',
          '..ppaaakwaaapp..',
          '..aaawwwwwwaaa..',
          '..aaawwwwwwaaa..',
          '...aawwwwwwaa...',
          '...aaaaaaaaaa...',
          '....aa....aa....',
          '....dd....dd....',
        ],
      },
    },
  },
  {
    // 二頭身のチビザメ。頭でっかち・丸ヒレ・おなか白＋1本歯。弾は水色。
    id: 'samet',
    name: 'サメット',
    rarity: 'R',
    archetype: 'RINGWAVE',    // おんぷリング（おもちゃ系）
    color: '#66a3ff',
    baseDamage: 5,
    forms: [
      { name: 'ピアニカおんぷ打', kind: 'melee',  archetype: 'SLASH', tex: 'w_note', sfx: 'note' },
      { name: 'みずでっぽう',     kind: 'ranged', archetype: 'SHOT',  tex: 'w_drop', sfx: 'water' },
    ],
    sprite: {
      palette: { a: '#66a3ff', d: '#2f6fd8', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9' },
      rows: [
        '.......dd.......',
        '......dddd......',
        '..aaaaddddaaaa..',
        '.aaaaaaaaaaaaaa.',
        'aaaaaaaaaaaaaaaa',
        'aawkaaaaaaaawkaa',
        'aakkaaaaaaaakkaa',
        'appaaaaaaaaaappa',
        'aaaaakkwkkaaaaaa',
        'aaaawwwwwwwwaaaa',
        '..aaawwwwaaadd..',
        '..aaawwwwaaaddd.',
        '..aaaawwaaaadd..',
        '...aaaaaaaaaa...',
        '....dd....dd....',
        '....dd....dd....',
      ],
    },
    // 背びれ2枚とジェット尾をもつ大型ザメ。歯2本。
    evo: {
      id: 'megasamet',
      name: 'メガサメット',
      baseDamage: 11,
      ovr: { hitRadius: 20, bulletSpeed: 320, intervalSec: 0.6 },   // R4: sametのフォームは SLASH/SHOT。近接hitRadius＋みずでっぽうの弾速/連射を強化（旧 expandSpeed は SHOT で読まれず死んでいた）
      sprite: {
        palette: { a: '#66a3ff', d: '#2f6fd8', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', o: '#ff9e66' },
        rows: [
          '...d........d...',
          '...dd......dd...',
          '.aaddaaaaaaddaa.',
          'aaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaa',
          'aawkaaaaaaaawkaa',
          'aakkaaaaaaaakkaa',
          'appaaaaaaaaaappa',
          'aaaakwwkkwwkaaaa',
          'aaaawwwwwwwwaaaa',
          '.aaawwwwwwaaaoo.',
          '..aawwwwwwaaoooo',
          '..aaawwwwaaaoo..',
          '...aaaaaaaaaa...',
          '....dd....dd....',
          '....dd....dd....',
        ],
      },
    },
  },
  {
    // 発光する節が3連のだんご芋虫。触角の先に光る玉。
    id: 'neonworm',
    name: 'ネオンワーム',
    rarity: 'R',
    archetype: 'BEAM',
    color: '#ff9e66',
    baseDamage: 8,
    forms: [
      { name: 'にじいろ頭突き',       kind: 'melee',  archetype: 'SLASH',    tex: 'w_star2', sfx: 'punch' },
      { name: 'ねんどうりょくだん',   kind: 'ranged', archetype: 'RINGWAVE', tex: 'w_ring',  sfx: 'psychic' },
    ],
    sprite: {
      palette: { a: '#ff9e66', d: '#c9502a', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', g: '#ffe0b3' },
      rows: [
        '...g........g...',
        '...a........a...',
        '...aaaaaaaaaa...',
        '..aaaaaaaaaaaa..',
        '..aawkaaaawkaa..',
        '..aakkaaaakkaa..',
        '..ppaaawwaaapp..',
        '..aaaaaaaaaaaa..',
        '...gggggggggg...',
        '..aaaaaaaaaaaa..',
        '..aawwwwwwwwaa..',
        '..aawwwwwwwwaa..',
        '...gggggggggg...',
        '..aaaaaaaaaaaa..',
        '...aaddddddaa...',
        '....dd....dd....',
      ],
    },
    // 発光する大羽をもつ蛾。羽に目玉模様。
    evo: {
      id: 'neonmoth',
      name: 'ネオンモス',
      baseDamage: 16,
      ovr: { hitRadius: 20, maxRadius: 115, expandSpeed: 260 },   // R4: neonwormのフォームは SLASH/RINGWAVE。近接hitRadius＋ねんどうりょくの輪(maxRadius/expandSpeed)を強化（旧 width は BEAM で読まれず死んでいた）
      sprite: {
        palette: { a: '#ff9e66', d: '#c9502a', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', g: '#ffe0b3' },
        rows: [
          '...d........d...',
          '....a......a....',
          '.ggaaaaaaaaaagg.',
          'gggaaaaaaaaaaggg',
          'gwgaaaaaaaaaagwg',
          'gggawkaaaawkaggg',
          'gggakkaaaakkaggg',
          'gggppaaaaaappggg',
          'gggaaawwwwaaaggg',
          'gwgaaaaaaaaaagwg',
          'gggaaaaaaaaaaggg',
          '.ggaaaaaaaaaagg.',
          '..gaaaaaaaaaag..',
          '...daaaaaaaad...',
          '....dd....dd....',
          '....dd....dd....',
        ],
      },
    },
  },
  {
    // オーラをまとうドーム型クラゲ。傘フチのフリルと短い触手。減速フィールド持ち。
    id: 'aurajelly',
    name: 'オーラジェリー',
    rarity: 'SR',
    archetype: 'FIELD',
    color: '#ff6ec7',
    baseDamage: 1,
    // 近接フォームは FIELD（もこもこ泡オーラ）。遠距離はなわとびウェーブ（RINGWAVE）。
    forms: [
      { name: 'もこもこスポンジ', kind: 'melee',  archetype: 'FIELD',    tex: 'w_bubble', sfx: 'pop' },
      { name: 'なわとびウェーブ', kind: 'ranged', archetype: 'RINGWAVE', tex: 'w_ring',   sfx: 'ringwave' },
    ],
    sprite: {
      palette: { a: '#ff6ec7', d: '#c9337f', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', s: '#ffe066' },
      rows: [
        '.......ss.......',
        '....aaaaaaaa....',
        '..aaaaaaaaaaaa..',
        '.aaaawaaaawaaaa.',
        '.aaaaaaaaaaaaaa.',
        '.aawkaaaaaawkaa.',
        '.aakkaaaaaakkaa.',
        '.ppaawaaaawaapp.',
        '.aaaaaaaaaaaaaa.',
        '.aaaaaaaaaaaaaa.',
        'awwaawwaawwaawwa',
        '.aa..aa..aa..aa.',
        '.aa..aa..aa..aa.',
        '.aa..aa..aa..aa.',
        '..a...a...a...a.',
        '..d...d...d...d.',
      ],
    },
    // 傘が虹色に輝くクラゲの女王。頂点に王冠。
    evo: {
      id: 'aurorajelly',
      name: 'オーロラジェリー',
      baseDamage: 1,
      ovr: { tickDamage: 2, radius: 80 },
      sprite: {
        palette: { a: '#ff6ec7', o: '#ff9e66', y: '#ffe066', c: '#7fe8ff', w: '#ffffff', k: '#1b3b5f', g: '#ffd23f' },
        rows: [
          '.....g.g.g......',
          '....ggggggg.....',
          '..aaaaaaaaaaaa..',
          '.oooooooooooooo.',
          '.yyyyyyyyyyyyyy.',
          'cccwkccccccwkccc',
          'ccckkcccccckkccc',
          '.ccaawwwwwwaacc.',
          '.cccccccccccccc.',
          '.aaaaaaaaaaaaaa.',
          'awwaawwaawwaawwa',
          '.aa..aa..aa..aa.',
          '.aa..aa..aa..aa.',
          '.aa..aa..aa..aa.',
          '..a...a...a...a.',
          '..w...w...w...w.',
        ],
      },
    },
  },
  {
    // R22（実プレイFB「体力を少しずつ回復してくれるモビットをいれて」）。
    // 唯一の非戦闘モビット：敵に一切触れず、主人公の体力だけを少しずつ戻す。
    // わたあめの綿毛をかぶった、おなかにハートを抱えたまるい子。足はなく、ふわふわ浮いている。
    // ⚠️ 体色をミント（回復の色 #7dff8f 系）にしているのは飾りではない。
    //    「この子は回復役」を、説明文ではなく色で分からせるため（画面に文字を増やさない）。
    id: 'mashumo',
    name: 'マシュモ',
    rarity: 'N',
    archetype: 'HEAL',
    color: '#8ef0a8',
    baseDamage: 2,   // HEAL は敵にダメージを与えないので未使用。データ検証のために持たせている
    forms: [
      { name: 'ばんそうこうヒール', kind: 'melee',  archetype: 'HEAL', tex: 'w_heart',  sfx: 'healTick' },
      { name: 'わたあめミスト',     kind: 'ranged', archetype: 'HEAL', tex: 'w_bubble', sfx: 'healTick' },
    ],
    sprite: {
      palette: { a: '#8ef0a8', d: '#4fbf74', w: '#ffffff', k: '#1e4a32', p: '#ffb3d9', h: '#ff7fa8' },
      rows: [
        '................',
        '.....wwwwww.....',
        '...wwaaaaaaww...',
        '..waaaaaaaaaaw..',
        '.waaaaaaaaaaaaw.',
        '.aaaaaaaaaaaaaa.',
        '.aawkaaaaaawkaa.',
        '.aakkaaaaaakkaa.',
        '.ppaaaakkaaaapp.',
        '.aaaaahhhhaaaaa.',
        '.aaaahhhhhhaaaa.',
        '.aaaahhhhhhaaaa.',
        '..aaaahhhhaaaa..',
        '..aaaaahhaaaaa..',
        '...aaaaaaaaaa...',
        '....dddddddd....',
      ],
    },
    // 綿毛が翼になり、頭上に光の輪をいただいた姿。回復量が上がる。
    evo: {
      id: 'heartangel',
      name: 'ハートエンジェル',
      baseDamage: 3,
      // ⚠️ ovr が無く、コメントの「回復量が上がる」が実装されていなかった（進化しても2のまま）。
      //    3.5秒に3回復＝0.86HP/秒。ジェル回復(1.25HP/秒)は超えないので「少しずつ」は保たれる。
      ovr: { amount: 3 },
      sprite: {
        palette: { a: '#8ef0a8', d: '#4fbf74', w: '#ffffff', k: '#1e4a32', p: '#ffb3d9', h: '#ff7fa8' },
        rows: [
          '.....hhhhhh.....',
          '................',
          'ww..wwwwwwww..ww',
          'www.waaaaaaw.www',
          '.wwwaaaaaaaawww.',
          '..waaaaaaaaaaw..',
          '..aawkaaaawkaa..',
          '..aakkaaaakkaa..',
          '..ppaaakkaaapp..',
          '..aaahhhhhhaaa..',
          '..aahhhhhhhhaa..',
          '..aahhhhhhhhaa..',
          '...aahhhhhhaa...',
          '...aaahhhhaaa...',
          '....aaaaaaaa....',
          '.....dddddd.....',
        ],
      },
    },
  },
  {
    // R23（実プレイFB「特殊弾を生成してくれるモビットもいれて。…イナズマが迸る雷光弾。
    //   ボス戦でのみ。1ボスに対して1弾。マオウレクス戦では2弾」）。
    // 2体目の非戦闘モビット。敵に触れず、ボス戦のあいだだけ主人公へ「らいこうだん」を手渡す。
    // ⚠️ 濃紺の雷雲の体に電光の黄を差す配色にしたのは、同じ雷系のサンダービット（ピカビットの進化形）と
    //    見分けるため。あちらは全身が明るい光、こちらは「雲の中で光る」。
    id: 'biricco',
    name: 'ビリッコ',
    rarity: 'R',
    archetype: 'AMMO',
    color: '#8e93e8',
    baseDamage: 2,   // AMMO は敵にダメージを与えないので未使用。データ検証のために持たせている
    forms: [
      { name: 'ちくでんタッチ',   kind: 'melee',  archetype: 'AMMO', tex: 'w_star2', sfx: 'counter' },
      { name: 'とくべつなたま わたし', kind: 'ranged', archetype: 'AMMO', tex: 'w_rainbow', sfx: 'counter' },
    ],
    sprite: {
      palette: { c: '#5b5fa8', d: '#33376e', y: '#ffe14d', w: '#ffffff', k: '#191b3d' },
      rows: [
        '................',
        '......y....y....',
        '.....yy...yy....',
        '..ccccccccccc...',
        '.ccccccccccccc..',
        'cccccccccccccccc',
        'ccckcccccccckccc',
        'cccwcccccccwcccc',
        'cccccccyyccccccc',
        'ccccccyycccccccc',
        'cccccyyyyycccccc',
        'ccccccccyyccccc.',
        '.cccccccycccccc.',
        '..ddddddddddd...',
        '...d.d...d.d....',
        '....y.....y.....',
      ],
    },
    // 雷雲が渦を巻き、角から常時放電する姿。渡す発数は進化しても増えない（1発30%×複数は強すぎる）。
    evo: {
      id: 'raijinger',
      name: 'ライジンガー',
      baseDamage: 3,
      sprite: {
        palette: { c: '#5b5fa8', d: '#33376e', y: '#ffe14d', w: '#ffffff', k: '#191b3d' },
        rows: [
          '....y.......y...',
          '...yy.......yy..',
          '..yycccccccccyy.',
          '.yccccccccccccy.',
          'ycccccccccccccy.',
          'cccccccccccccccc',
          'ccckcccccccckccc',
          'cccwcccccccwcccc',
          'ccyyccyyccyyccyy',
          'cccccyycccccccyc',
          'ccccyyyyyccccccc',
          'cyccccccyyccccyc',
          'yccccccccyccccc.',
          '.dddddddddddddd.',
          '..d.d.d...d.d.d.',
          '.y...y.....y...y',
        ],
      },
    },
  },
  {
    // ★R45 実プレイFB「①主人公を守る防御壁（名称：命の盾・ボス戦ごとに1回のみ）を
    //   特殊能力でもつ」モビット。
    // 3体目の非戦闘モビット。敵に触れず、主人公のHPが落ちた瞬間だけ光の壁を張る。
    // ⚠️ 体色を水色＋白銀にしたのは、既存の非戦闘2体（マシュモ＝ミント／ビリッコ＝濃紺）
    //    どちらとも色相で離すため。公転している輪の中で「誰が何の役か」を色で読ませる。
    // 姿：白銀のかぶとをかぶり、自分の背丈より大きい光の盾を正面に構えた小さな衛兵。
    id: 'mamorin',
    name: 'マモリン',
    rarity: 'R',
    archetype: 'SHIELD',
    color: '#5ad0ff',
    baseDamage: 2,   // SHIELD は敵にダメージを与えないので未使用。データ検証のために持たせている
    forms: [
      { name: 'いのちのたて かまえ', kind: 'melee',  archetype: 'SHIELD', tex: 'w_ring',  sfx: 'lifeShield' },
      { name: 'まもりのひかり',     kind: 'ranged', archetype: 'SHIELD', tex: 'w_drop',  sfx: 'lifeShield' },
    ],
    sprite: {
      palette: { w: '#eef3ff', g: '#ffd23f', c: '#5ad0ff', k: '#1a2340' },
      rows: [
        '................',
        '.....gg..gg.....',
        '....wwwwwwww....',
        '...wwwwwwwwww...',
        '...wwkwwwwkww...',
        '...wwwwwwwwww...',
        '..gggggggggggg..',
        '.gccccccccccccg.',
        '.gccwwwwwwwwccg.',
        '.gccwccccccwccg.',
        '.gccwccccccwccg.',
        '.gccwwwwwwwwccg.',
        '..gcccccccccg...',
        '...gccccccg.....',
        '....gccccg......',
        '.....gggg.......',
      ],
    },
    // 進化＝盾が体を追い越して伸び、金の縁が上下へ広がる（守る面積そのものが増えた姿）。
    evo: {
      id: 'saintwall',
      name: 'セイントウォール',
      baseDamage: 3,
      sprite: {
        palette: { w: '#eef3ff', g: '#ffd23f', c: '#5ad0ff', k: '#1a2340' },
        rows: [
          '...g........g...',
          '...gg.wwww.gg...',
          '....wwwwwwww....',
          '...wwwwwwwwww...',
          '...wwkwwwwkww...',
          '...wwwwwwwwww...',
          '.gggggggggggggg.',
          'gccccccccccccccg',
          'gccwwwwwwwwwwccg',
          'gccwccccccccwccg',
          'gccwccccccccwccg',
          'gccwwwwwwwwwwccg',
          'gcccccccccccccg.',
          '.gcccccccccccg..',
          '..gcccccccccg...',
          '...gggggggg.....',
        ],
      },
    },
  },
  {
    // ★R45 実プレイFB「②一時的に移動速度を1.5倍に上げる薬（爆速ドリンク・ボス戦ごとに
    //   1回のみ）を注入するモビット」。
    // 4体目の非戦闘モビット。⚠️ 上げるのは**足だけ**＝火力は1も増えない。
    //    「避けきれなかった攻撃が避けられる」＝②被弾の緊張感の側を動かす薬になる。
    // 姿：炭酸の瓶そのものが目と足を持った子。王冠のキャップ＋黄色のラベル。
    id: 'doringo',
    name: 'ドリンゴ',
    rarity: 'R',
    archetype: 'SPEED',
    color: '#ff8a1f',
    baseDamage: 2,   // SPEED は敵にダメージを与えないので未使用
    forms: [
      { name: 'ばくそくドリンク', kind: 'melee',  archetype: 'SPEED', tex: 'w_drop', sfx: 'pickup' },
      { name: 'しゅわしゅわミスト', kind: 'ranged', archetype: 'SPEED', tex: 'w_bubble', sfx: 'pickup' },
    ],
    sprite: {
      palette: { o: '#ff8a1f', d: '#c4400f', k: '#2a1408', w: '#ffffff', y: '#ffe14d' },
      rows: [
        '......kkkk......',
        '......kwwk......',
        '.......oo.......',
        '......oooo......',
        '....oooooooo....',
        '...oooooooooo...',
        '...ookooookoo...',
        '...oowoooowoo...',
        '...oooooooooo...',
        '...ooyyyyyyoo...',
        '...ooyddddyoo...',
        '...ooyyyyyyoo...',
        '...oooooooooo...',
        '...oooooooooo...',
        '....dddddddd....',
        '.....d....d.....',
      ],
    },
    // 進化＝瓶が一回り大きくなり、キャップから泡が吹き出したまま止まらない姿。
    evo: {
      id: 'hyperdoringo',
      name: 'ハイパードリンゴ',
      baseDamage: 3,
      sprite: {
        palette: { o: '#ff8a1f', d: '#c4400f', k: '#2a1408', w: '#ffffff', y: '#ffe14d' },
        rows: [
          '...y..kkkk..y...',
          '....y.kwwk.y....',
          '.......oo.......',
          '.....oooooo.....',
          '...oooooooooo...',
          '..oooooooooooo..',
          '..ookooooookoo..',
          '..oowoooooowoo..',
          '..oooooooooooo..',
          '..ooyyyyyyyyoo..',
          '..ooyddddddyoo..',
          '..ooyyyyyyyyoo..',
          '..oooooooooooo..',
          '..oooooooooooo..',
          '...dddddddddd...',
          '....d......d....',
        ],
      },
    },
  },
  {
    // ★R45 実プレイFB「③ずっとなにもせずに欠伸ばかりして役に立たないが、軌道神核との戦闘に
    //   入ると覚醒し、命の盾・爆速ドリンク・体力回復をランダムに行う。このモビットの時だけ、
    //   ボス戦での使用上限なし。軌道神核との闘い以外では明らかに役に立ってないことを
    //   プレーヤーがわかるようにして」。
    //
    // ⚠️ レアリティを **N（いちばん出やすい）** にしたのは意図。SR にすると一生仲間にならず、
    //    「役立たずが最後に覚醒する」という体験そのものが発生しない（[[入れていないのと同じ]]）。
    //    よく来る → また寝ている → ラスボスで起きる、という順番でこそ効く。
    // 姿：目を閉じたまま（横線の目）あくびをしている、灰紫のかぶりものにクリーム色の丸い体。
    id: 'nemukko',
    name: 'ネムッコ',
    rarity: 'N',
    archetype: 'SLEEPY',
    color: '#b0a8d8',
    baseDamage: 2,   // SLEEPY は敵にダメージを与えないので未使用
    forms: [
      { name: 'すやすや',     kind: 'melee',  archetype: 'SLEEPY', tex: 'w_bubble', sfx: 'pickup' },
      { name: 'ゆめみごこち', kind: 'ranged', archetype: 'SLEEPY', tex: 'w_star2',  sfx: 'pickup' },
    ],
    sprite: {
      palette: { p: '#b0a8d8', c: '#f2e8c8', k: '#4a4470', m: '#6b3a5a', d: '#8b84b0' },
      rows: [
        '................',
        '.....pppppp.....',
        '....pppppppp....',
        '...pppppppppp...',
        '...pkkppppkkp...',
        '...pppppppppp...',
        '....ppmmmmpp....',
        '....pppppppp....',
        '...cccccccccc...',
        '..cccccccccccc..',
        '..cccccccccccc..',
        '..cccccccccccc..',
        '...cccccccccc...',
        '....cccccccc....',
        '.....dddddd.....',
        '................',
      ],
    },
    // 覚醒した姿。⚠️ これは進化（レベル）でも使うが、**軌道神核戦では進化していなくても
    //    この姿へ切り替える**（orbit.js の覚醒処理）。目が開き、閉じた横線が金の光になる。
    evo: {
      id: 'mezamegami',
      name: 'メザメガミ',
      baseDamage: 3,
      sprite: {
        palette: { p: '#b0a8d8', c: '#f2e8c8', w: '#ffffff', y: '#ffe14d' },
        rows: [
          '.......y........',
          '...y...y...y....',
          '....pppppppp....',
          '...pppppppppp...',
          '...pwyppppywp...',
          '...pppppppppp...',
          '....ppyyyypp....',
          '....pppppppp....',
          '...wcccccccccw..',
          '..wcccccccccccw.',
          '..wcccccccccccw.',
          '..wcccccccccccw.',
          '...wccccccccw...',
          '....wcccccw.....',
          '.....yyyyyy.....',
          '......y..y......',
        ],
      },
    },
  },
];

// プレイヤー3段階。Lv5で player_2・Lv10で player_3 へテクスチャ差し替え。
// R16（SPEC§24.7）: 「ブレイブギア」＝R15cへの実プレイFB「いまいち」を受け、ユーザーへの
// 4問インタビューの回答から再設計した。回答＝①腕の形・色・少年本体・棒立ちの全部が不満
// ②腕は王道ヒーローロボ系 ③色は正典の灰縛りを捨てて完全に自由 ④参考はロックマンエグゼ系。
//
// 設計の核（4回答の翻訳）：
//  1. **配色はエグゼ直系**＝コバルト(b)×白装甲(w)×金(c)。画面上の他要素（敵=灰銅・モビット=
//     パステル小球・ジェム=緑/紫・回復=桃）とどれとも被らない色域なので、識別性も同時に最大化。
//  2. **ポーズは構え**。両脚を開いたA字の踏み込みスタンス＋腕の非対称で「棒立ち」を廃止。
//     本体に拳は描かない（拳は playerFistImg が常時狙い角へ構える＝二重表示を避ける役割分担）。
//  3. **腕は王道ロボ文法**＝白エッジのパウルドロンが斜め上へ張り出し（S2）→首の横まで立ち上がる
//     （S3）。暗色(d)は装甲の内側の継ぎ目だけ（外縁に使うと背景#0a0a1eに溶ける・R15cの教訓）。
//  4. **正典§22は色で維持**。心臓はひとつ＝心臓側（画面左）の腕だけ金(c)のエネルギーシームが
//     肩→拳へ走り、反対側は冷たいスカイ(s)のエッジライト。「白い衣」は戦闘スーツへ更新した
//     （見た目優先のユーザー決定。物語上の説明はSPECで後追い）。
//
// 少年の不変条件（validate-data が強制）：髪・顔・目・胴のスーツ芯・脚とスタンスは3段とも
// 完全に同一。変わるのは腕・パウルドロン・ヘッドギアの装飾（バンド→耳ポッド→金クレスト）だけ＝
// 「彼は成長しない。戻ってくるのは腕だけ」をデータの事実として維持する。
export const PLAYER_SPRITES = [
  // ⚠️ キャンバスは 16×18 → 20×18 → 24×18。**高さと少年の画素は3段とも完全に同一**で、
  // 幅が広がるのは腕とパウルドロンがせり出すぶんだけ。拡大率も段階で変えない（Run.js 全段 scale 3.0）。
  //
  // R15b の教訓（維持）: 人間が一瞬で認識するのは色の増減ではなく**輪郭の変化**。
  // 段差はシルエット（肩の張り出し幅と腕の長さ）で作る。
  //
  // Stage1(Lv1-4): 素のブレイブスーツ。ヘッドバンド＋胸の金コア＋大型ブーツの踏み込みスタンス。
  // 腕はまだスーツの細腕（左手首に金のかけらだけ）＝ここから肩が育つ余白を残す。
  {
    palette: {
      b: '#2f6fe4', // コバルトブルーのブレイブスーツ（エグゼ直系の主色・輝度105で背景12に対し十分浮く）
      w: '#f2f4f8', // 白装甲（ブーツ・胸パネル。ヒート時の金tintと相性が最良の素材色）
      f: '#f0c8a0', // 肌（顔・素手）
      k: '#7a5a3c', // 髪（生身の少年の証・3段不変）
      e: '#2a2028', // 目
      c: '#ffd23f', // 金＝守り手の心臓。胸コアと心臓側（画面左）のエネルギーシームだけに使う
      h: '#ff8a1f', // アンバー熱（金の内側のグラデ）
      s: '#9fe0ff', // スカイ＝光らない側（画面右）の冷たいエッジライト（左右非対称は色で語る）
      d: '#232c3d', // 黒アンダースーツ・継ぎ目（暗色は輪郭の内側だけ＝外縁に使うと背景に溶ける）
    },
    rows: [
      '......kkkk......',
      '.....kkkkkk.....',
      '.....bbbbbb.....',
      '.....feffef.....',
      '......ffff......',
      '.....bddddb.....',
      '....bbbccbbb....',
      '...b.bbccbb.b...',
      '..cb.bbbbbb.bf..',
      '.....bbbbbb.....',
      '.....bddddb.....',
      '.....bbbbbb.....',
      '.....bb..bb.....',
      '....bb....bb....',
      '...bb......bb...',
      '..bww......wwb..',
      '..www......www..',
      '.wwww......wwww.',
    ],
  },
  // Stage2(Lv5-9): 肩から下が戻る（20×18）。白エッジのパウルドロンが斜めに張り出し、
  // 腕が肩→前腕まで装甲化。耳に通信ポッド(w)が付く。金シームは肩の付け根→手首へ。
  {
    palette: {
      b: '#2f6fe4', w: '#f2f4f8', f: '#f0c8a0', k: '#7a5a3c', e: '#2a2028',
      c: '#ffd23f', h: '#ff8a1f', s: '#9fe0ff', d: '#232c3d',
    },
    rows: [
      '........kkkk........',
      '.......kkkkkk.......',
      '.......bbbbbb.......',
      '......wfeffefw......',
      '........ffff........',
      '....wwwbddddbwww....',
      '...wcbbbbccbbbbbw...',
      '...bcbdbbccbbdbbs...',
      '..bcbbdbbbbbbdbbbs..',
      '..bchbdbbbbbbdbbss..',
      '...cc..bddddb..ss...',
      '.......bbbbbb.......',
      '.......bb..bb.......',
      '......bb....bb......',
      '.....bb......bb.....',
      '....bww......wwb....',
      '....www......www....',
      '...wwww......wwww...',
    ],
  },
  // Stage3(Lv10+): 完全体（24×18）。パウルドロンは顎の横まで立ち上がり、腕は手首まで
  // フル装甲で画面幅いっぱいへ届く。バンド中央に金のクレスト＝ギアだけが育った証。
  // それでも髪・顔・胴・脚は Stage1 と同一＝最後まで「腕を借りている少年」。
  {
    palette: {
      b: '#2f6fe4', w: '#f2f4f8', f: '#f0c8a0', k: '#7a5a3c', e: '#2a2028',
      c: '#ffd23f', h: '#ff8a1f', s: '#9fe0ff', d: '#232c3d',
    },
    rows: [
      '..........kkkk..........',
      '.........kkkkkk.........',
      '.........bbccbb.........',
      '.......ccfeffefcc.......',
      '..........ffff..........',
      '..wwwww..bddddb..wwwww..',
      '..wwwwwdbbbccbbbdwwwww..',
      '....bcbbdbbccbbdbbbs....',
      '...bcbbbdbbbbbbdbbbbs...',
      '...bchbbdbbbbbbdbbbbs...',
      '....bchb.bddddb.bbss....',
      '.....cc..bbbbbb..ss.....',
      '.........bb..bb.........',
      '........bb....bb........',
      '.......bb......bb.......',
      '......bww......wwb......',
      '......www......www......',
      '.....wwww......wwww.....',
    ],
  },
];

// 互換用: 単数の PLAYER_SPRITE は Stage1 を指す（既存参照を壊さない）。
export const PLAYER_SPRITE = PLAYER_SPRITES[0];

// R14（SPEC§22）: 銃は全廃した（主人公は近接のみ。旧 HERO_GUNS は削除）。
// 遠い敵への手当ては手動の一撃の踏み込み突進（R21W2・Run.js doStrike）が担う。

// R12: 主人公の主武器＝クラッシュアーム。全て右向き＝打撃面(v/金)が +X 側。
// Run.js が狙い角へ setRotation し、構え(常時)と殴り(突き出し)の両方で表示する。
// R16: 本体と同じブレイブギア配色へ刷新＝白装甲(w)の角拳＋金の打撃面(v)。
// 白はヒート時の金tint（0xffd23f 乗算）で素直に金へ振れる＝旧配色の青灰よりヒート表現が濁らない。
// 王道ロボ文法：丸い弾頭ではなく**角ばったナックルブロック**。d は指の継ぎ目（内側のみ）。
// ★R43 実プレイFB「敵を捕獲するための武器がパンチ？なのだが、身体に生えてるようにみえる
//   不自然な小さな拳になっている。あまりに不自然だしださすぎる。パンチにこだわらなくてもよい」。
//   ★指摘は3つの実測値に裏付けられていた：
//     ①**小さい**：Stage1 は 8×6px×2.6＝20.8×15.6px。主人公は 48×54px なので**面積比12.5%**。
//     ②**生えて見える**：構えの reach は 22.75px。拳の半幅10.4pxを引くと手前側は 12.3px＝
//       体半幅24pxの**内側**。つまり拳は常に体に半分めり込んだ位置にあった。
//     ③**絵と判定が合っていない**：突きの判定は 78px 先まであるのに、腕は最大31pxしか伸びない。
//       78px先の敵が「届いていない拳」で吹き飛ぶ＝不自然さの本体はここ。
//   → 拳（殴る記号）をやめ、**グラップクロー＝上下に開いた捕獲用の爪**へ作り直す。
//     この作品の動詞は「つかむ→ためる→なげる」なので、**開いた爪**こそが正しい記号。
//     サイズも 12×10 / 16×12 / 20×14 へ拡大（Stage1で面積比31%）。
//     全て右向き＝爪先(v)が +X 側。Run.js が狙い角へ setRotation する。
//     配色はブレイブギア（青装甲b・金の縁c・白w・金の爪v・継ぎ目d・熱核h）を踏襲。
export const HERO_FISTS = [
  // Stage1: グラップクロー。12×10。中央が空く＝「掴む口」が等倍でも読める形。
  {
    palette: { b: '#2f6fe4', c: '#ffb43a', w: '#f2f4f8', v: '#ffd23f', d: '#232c3d' },
    rows: [
      '.....wwvvv..',
      '..bbwwwvvvv.',
      'bbbcwwwvvv..',
      'bbbcwwd.....',
      'bbbcwww.....',
      'bbbcwww.....',
      'bbbcwwd.....',
      'bbbcwwwvvv..',
      '..bbwwwvvvv.',
      '.....wwvvv..',
    ],
  },
  // Stage2: パワークロー（手首に金のパワーリング・爪が伸びて熱核が灯る）。16×12。
  {
    palette: { b: '#2f6fe4', c: '#ffb43a', w: '#f2f4f8', h: '#ff8a1f', v: '#ffd23f', d: '#232c3d' },
    rows: [
      '......wwwvvvv...',
      '...bbwwwwvvvvvv.',
      '.bbbcwwwwvvvvv..',
      'bbbbcwwwwvvv....',
      'bbbbcwwhd.......',
      'bbbbcwwhd.......',
      'bbbbcwwhd.......',
      'bbbbcwwhd.......',
      'bbbbcwwwwvvv....',
      '.bbbcwwwwvvvvv..',
      '...bbwwwwvvvvvv.',
      '......wwwvvvv...',
    ],
  },
  // Stage3: 破砕クロー（三重の爪＋熱核が縦に伸びる＝掴んだものを砕く握力）。20×14。
  {
    palette: { b: '#2f6fe4', c: '#ffb43a', w: '#f2f4f8', h: '#ff8a1f', v: '#ffd23f', d: '#232c3d' },
    rows: [
      '.......wwwwvvvvv....',
      '....bbwwwwwvvvvvvv..',
      '..bbbcwwwwwvvvvvvvvv',
      'bbbbbcwwwwwvvvvvvv..',
      'bbbbbcwwwwwvvvvv....',
      'bbbbbcwwhhd.........',
      'bbbbbcwwhhd.........',
      'bbbbbcwwhhd.........',
      'bbbbbcwwhhd.........',
      'bbbbbcwwwwwvvvvv....',
      'bbbbbcwwwwwvvvvvvv..',
      '..bbbcwwwwwvvvvvvvvv',
      '....bbwwwwwvvvvvvv..',
      '.......wwwwvvvvv....',
    ],
  },
];
