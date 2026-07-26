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
];

// プレイヤー3段階（項目12）。Lv5で player_2・Lv10で player_3 へテクスチャ差し替え。
// 軍事的パワードスーツの2段階変身（可愛さ排除。参考: スターシップ・トゥルーパーズ／Halo風重装甲兵）。
// 段が上がるほど装甲が増し、シルエットが厚く・大きく・威圧的になる（3体が一目で別物）。
export const PLAYER_SPRITES = [
  // Stage1(Lv1-4): 軽装コンバットアーマー。無骨なヘルメット＋アンバー発光バイザー・小肩当て・胸プレート・装甲ブーツ（12×14）。
  {
    palette: {
      g: '#3a4453', // ガンメタル装甲
      s: '#8a99ad', // スチール(ハイライト)
      d: '#161b22', // 近黒の影/ブーツ
      t: '#c7a06a', // タン(砂漠装甲・肩当て/ベルト)
      v: '#ffb43a', // アンバー発光バイザー
    },
    rows: [
      '...gggggg...',
      '..gggggggg..',
      '..gvvvvvvg..',
      '..gssssssg..',
      '...gssssg...',
      '.ttggggggtt.',
      '.tggssssggt.',
      '.tgssssssgt.',
      '..gggggggg..',
      '..gttttttg..',
      '..gggggggg..',
      '..ggg..ggg..',
      '..ggg..ggg..',
      '..ddd..ddd..',
    ],
  },
  // Stage2(Lv5-9): パワードスーツ。増加装甲＝大型パウルドロン・アンバーバイザー・胸装甲プレート・背面スラスター(アンバー噴気口)・装甲脚（14×15）。
  {
    palette: {
      g: '#3a4453', s: '#8a99ad', d: '#161b22', t: '#c7a06a', v: '#ffb43a',
    },
    rows: [
      '....gggggg....',
      '...gggggggg...',
      '...gggggggg...',
      '...gvvvvvvg...',
      '...gssssssg...',
      '....gssssg....',
      '.ttsggggggstt.',
      'tttvggggggvttt',
      '..gsssddsssg..',
      '..gssssssssg..',
      '...gggggggg...',
      '..gttttttttg..',
      '..gggg..gggg..',
      '..gggg..gggg..',
      '..dddd..dddd..',
    ],
  },
  // Stage3(Lv10+): 重パワードエクソ。フル装甲最終形態＝巨大パウルドロン・ヘビーヘルメット(金クレスト)・胸のシアン炉心＋金リング・脚部フレーム・金/レッドのアクセント（16×16）。
  {
    palette: {
      g: '#3a4453', s: '#8a99ad', d: '#161b22', t: '#c7a06a', v: '#ffb43a',
      o: '#ffd23f', // 金アクセント/クレスト/ベルト
      y: '#3fe0ff', // シアン炉心
      r: '#ff5a3c', // レッド発光アクセント(噴気口/膝)
    },
    rows: [
      '......oooo......',
      '....gggggggg....',
      '...gggggggggg...',
      '...gvvvvvvvvg...',
      '...gsssddsssg...',
      '....goooooog....',
      '.ttsggggggggstt.',
      'ttorggggggggrott',
      'sttsggggggggstts',
      '..gssssssssssg..',
      '..gsssoyyosssg..',
      '..gssssssssssg..',
      '..gtttooootttg..',
      '..ggggg..ggggg..',
      '..gggrg..grggg..',
      '..ddddd..ddddd..',
    ],
  },
];

// 互換用: 単数の PLAYER_SPRITE は Stage1 を指す（既存参照を壊さない）。
export const PLAYER_SPRITE = PLAYER_SPRITES[0];

// 主人公の武器＝段階進化する銃/ライフル（PLAYER_SPRITES と同じ段で進化。ユーザー要望「武器も銃系に」）。
// 全て右向き＝銃口(v/アンバー)が +X 側。Run.js が狙い角へ setRotation して構える（左向きは setFlipY で整える）。
// 配色はアーマーと統一（ガンメタルg/スチールs/近黒d/アンバー銃口v／Stage3のみ金o・レッドr）。
// 段が上がるほど銃身が長く太く威圧的に（Stage1小型→Stage2アサルト→Stage3重機関砲）。全行同長。
export const HERO_GUNS = [
  // Stage1: コンパクトなサブマシンガン（短い銃身＋小マガジン＋グリップ。小さめ）。12×6。
  {
    palette: { g: '#3a4453', s: '#8a99ad', d: '#161b22', v: '#ffb43a' },
    rows: [
      '..ssss......',
      '.ggggggggvv.',
      '.ggggggggss.',
      '.dg.dd......',
      '.d..dd......',
      '............',
    ],
  },
  // Stage2: アサルトライフル（厚い機関部＋長い銃身＋長マガジン＝一回り大きく強そう）。14×8。
  {
    palette: { g: '#3a4453', s: '#8a99ad', d: '#161b22', v: '#ffb43a' },
    rows: [
      '..sss.........',
      '.gggggggggggvv',
      '.gggggggggggss',
      '.gggggg.......',
      '...dd.dd......',
      '...dd.dd......',
      '......dd......',
      '..............',
    ],
  },
  // Stage3: 重機関砲/多砲身ガトリング（太い3列砲身＋金の砲口リング＋レッド炉心＋ドラムマガジン＝最も大きく威圧的）。16×9。
  {
    palette: { g: '#3a4453', s: '#8a99ad', d: '#161b22', v: '#ffb43a', o: '#ffd23f', r: '#ff5a3c' },
    rows: [
      '...ssss.........',
      '..gggggggg......',
      '.ggggggggggggovv',
      '.gggrrgggggggovv',
      '.ggggggggggggovv',
      '.gooooooog......',
      '.ggggggggg......',
      '.dd.ggggg.......',
      '.dd.ggggg.......',
    ],
  },
];
