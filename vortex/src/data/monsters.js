// 仲間モンスター6種＋プレイヤーのスプライト定義（PROTOTYPE_SPEC §3.2/§3.3/§4.2）。
// スプライトは HAYATO 式テキストグリッド（'.'=透明・全行同長・幅高さ8〜16）。
// palette に無い文字を rows に使わないこと（validate-data.js が検証）。

export const MONSTERS = [
  {
    // 星型の耳を持つ子犬。開始編成の1体。
    id: 'starpuppy',
    name: 'スターパピー',
    rarity: 'N',
    archetype: 'SLASH',
    color: '#7fd8ff',
    baseDamage: 4,
    sprite: {
      palette: { a: '#7fd8ff', b: '#ffffff', c: '#1b3b5f', s: '#ffe066' },
      rows: [
        '.s........s.',
        'sss......sss',
        '.s.aaaaaa.s.',
        '..aaaaaaaa..',
        '..aacaacaa..',
        '..aaaaaaaa..',
        '..abbbbbba..',
        '..abbccbba..',
        '..abbbbbba..',
        '...aaaaaa...',
        '..a.a..a.a..',
      ],
    },
  },
  {
    // トゲトゲのやんちゃ坊主。全身にスパイク。
    id: 'togeron',
    name: 'トゲロン',
    rarity: 'N',
    archetype: 'SLASH',
    color: '#9dff70',
    baseDamage: 5,
    sprite: {
      palette: { a: '#9dff70', c: '#1b3b5f', s: '#5fbf3f' },
      rows: [
        '..s.s..s.s..',
        '..aaaaaaaa..',
        's.aaaaaaaa.s',
        '..aacaacaa..',
        's.aaaaaaaa.s',
        '..aaccccaa..',
        '..aaaaaaaa..',
        's.aaaaaaaa.s',
        '..aaaaaaaa..',
        '...s.ss.s...',
        '...a....a...',
      ],
    },
  },
  {
    // 電気ウサギ。長い耳とほっぺの電気。弾は黄色。開始編成の1体。
    id: 'pikabit',
    name: 'ピカビット',
    rarity: 'N',
    archetype: 'SHOT',
    color: '#ffe066',
    baseDamage: 3,
    sprite: {
      palette: { a: '#ffe066', b: '#ffffff', c: '#1b3b5f', e: '#ff9e66', k: '#ff5e5e' },
      rows: [
        '..ee..ee..',
        '..aa..aa..',
        '..aa..aa..',
        '..aa..aa..',
        '.aaaaaaaa.',
        '.aaaaaaaa.',
        '.acaaaaca.',
        '.aaaaaaaa.',
        '.akaaaaka.',
        '.aabbbbaa.',
        '.aabccbaa.',
        '.aaaaaaaa.',
        '..aaaaaa..',
        '..a.aa.a..',
      ],
    },
  },
  {
    // 小さなサメ。背びれと尾びれ、鋭い歯。弾は水色。
    id: 'samet',
    name: 'サメット',
    rarity: 'R',
    archetype: 'SHOT',
    color: '#66a3ff',
    baseDamage: 5,
    sprite: {
      palette: { a: '#66a3ff', b: '#ffffff', c: '#1b3b5f', f: '#2f6fd8' },
      rows: [
        '......ff......',
        '.....ffff.....',
        '.aaaaaaaaaa..f',
        'aacaaaaaaaaaff',
        'aaaaaaaaaaaaff',
        'baaaaaaaaaa.ff',
        '.bbaaaaaaaa..f',
        '..bbbbbbbb....',
        '..ff..........',
      ],
    },
  },
  {
    // 発光する節を持つ虫。触角と光るセグメント。
    id: 'neonworm',
    name: 'ネオンワーム',
    rarity: 'R',
    archetype: 'BEAM',
    color: '#ff9e66',
    baseDamage: 8,
    sprite: {
      palette: { a: '#ff9e66', g: '#ffe0b3', c: '#1b3b5f', o: '#c9502a' },
      rows: [
        '..c......c..',
        '..c......c..',
        '...c....c...',
        '...aaaaaa...',
        '..aaaaaaaa..',
        '..acaaaaca..',
        '..aaaaaaaa..',
        '..oaaaaaao..',
        '..agggggga..',
        '..oaaaaaao..',
        '..agggggga..',
        '..oaaaaaao..',
        '...aaaaaa...',
      ],
    },
  },
  {
    // オーラをまとうクラゲ。減速フィールド持ち（FIELDはtickDamage=1固定）。
    id: 'aurajelly',
    name: 'オーラジェリー',
    rarity: 'SR',
    archetype: 'FIELD',
    color: '#ff6ec7',
    baseDamage: 1,
    sprite: {
      palette: { a: '#ff6ec7', b: '#ffd6f0', c: '#7a1b5f', t: '#ff9ede' },
      rows: [
        '...aaaaaa...',
        '..aaaaaaaa..',
        '.aabbbbbbaa.',
        '.aaaaaaaaaa.',
        '.acaaaaaaca.',
        '.aaaaaaaaaa.',
        '.aabbbbbbaa.',
        '..aaaaaaaa..',
        '.t.t.tt.t.t.',
        '.t.t.tt.t.t.',
        '..t.t..t.t..',
        '..t.t..t.t..',
        '.t...tt...t.',
      ],
    },
  },
];

// プレイヤー（モンスターテイマーの子ども）。キャップ・バイザーの紋章・ベルト・ブーツ。
export const PLAYER_SPRITE = {
  palette: {
    h: '#2b2f77', // 帽子/髪
    s: '#ffcf9e', // 肌
    c: '#10203a', // 目/ブーツの暗色
    a: '#4de1c0', // スーツ
    v: '#ffffff', // バイザー紋章
    b: '#ffd23f', // ベルト
  },
  rows: [
    '...hhhhhh...',
    '..hhhhhhhh..',
    '..hhhhhhhh..',
    '..hssssssh..',
    '..scsssscs..',
    '..ssssssss..',
    '...ssssss...',
    '..aaaaaaaa..',
    '.aaaavvaaaa.',
    '.aaaaaaaaaa.',
    'saaabbbbaaas',
    '.aaaaaaaaaa.',
    '..aaa..aaa..',
    '..ccc..ccc..',
  ],
};
