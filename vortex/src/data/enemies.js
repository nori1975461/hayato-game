// 敵8種＋ボスの定義（PROTOTYPE_SPEC §3.2/§3.3/§4.3/§10.5）。
// radius は表示スケール適用後の当たり半径(px)。movement は 'chase' | 'sine' | 'charge' | 'hop' | 'spiral'。
// v2: 敵は仲間との対比を明確化（ほっぺ無し・太まゆ/つり目・トゲや暴走感）。詳細は dev/SPRITE_GUIDE.md。
// BOSS は ENEMIES 配列に入れず別 export（出現プール/重み検証を汚さない）。

export const ENEMIES = [
  {
    // まっすぐ突っ込んでくる紫の突撃体。V字太まゆ＋への字口＋ぷんぷんマーク。
    id: 'zunzun',
    name: 'ズンズン',
    movement: 'chase',
    color: '#a06bff',
    hp: 10,
    speed: 40,
    damage: 8,
    radius: 7,
    sprite: {
      palette: { a: '#a06bff', c: '#1b1030', b: '#ffffff' },
      rows: [
        '.c.c....c.c.',
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        '.accaaaacca.',
        '.acbaaaabca.',
        '.aaaaaaaaaa.',
        '.aaaccccaaa.',
        '.aacaaaacaa.',
        '.aaaaaaaaaa.',
        '..aaaaaaaa..',
        '..a.a..a.a..',
      ],
    },
  },
  {
    // ふわふわ漂う水色のいたずらオバケ雲。片目ウインク＋ベロ出し＋下端モコモコ（sine）。
    id: 'fuwafuwa',
    name: 'フワフワ',
    movement: 'sine',
    color: '#7fe8ff',
    hp: 6,
    speed: 55,
    damage: 6,
    radius: 6,
    sprite: {
      palette: { a: '#7fe8ff', c: '#1b3b5f', w: '#c8f7ff', t: '#ff9ec7' },
      rows: [
        '...aaaaaa...',
        '..awwwwwwa..',
        '.aawwwwwwaa.',
        '.aaaaaaaaaa.',
        '.accaaaaaaa.',
        '.accaaaacca.',
        '.aaaaaaaaaa.',
        '.aaaaccaaaa.',
        'aaa.aaa.aaa.',
        '....ttt.....',
      ],
    },
  },
  {
    // 赤い暴走カブトあんちゃん。リーゼント風の金房角＋キリッと縦長目＋背中の炎デカール（charge）。
    id: 'dashbeetle',
    name: 'ダッシュビートル',
    movement: 'charge',
    color: '#ff5e5e',
    hp: 14,
    speed: 30,
    damage: 12,
    radius: 8,
    sprite: {
      palette: { a: '#ff5e5e', c: '#3a0a0a', h: '#ffd23f', b: '#ffffff' },
      rows: [
        '..hhhhhh....',
        '.hhhhhhhh...',
        '..hhhhhh....',
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        '.abcaaaacba.',
        '.abcaaaacba.',
        '.aaaaaaaaaa.',
        '.aaahhhhaaa.',
        '.aahhhhhhaa.',
        '.a.a.aa.a.a.',
      ],
    },
  },
  {
    // 半透明の不気味カワイイおばけ。丸シーツ形＋まん丸黒目＋裾ギザ3山（sine）。
    id: 'ghoston',
    name: 'ゴーストン',
    movement: 'sine',
    color: '#a8f2c8',
    hp: 8,
    speed: 70,
    damage: 6,
    radius: 6,
    sprite: {
      palette: { a: '#a8f2c8', c: '#1b3b5f', w: '#ffffff' },
      rows: [
        '...aaaaaa...',
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        '.aaaaaaaaaa.',
        '.awcaaaacwa.',
        '.accaaaacca.',
        '.aaaaaaaaaa.',
        '.aaaaccaaaa.',
        '.aaaaaaaaaa.',
        '.aa..aa..aa.',
      ],
    },
  },
  {
    // 溜めてから突進するイガ栗ボール。普段は横線の閉じ目（charge）。
    id: 'igagurin',
    name: 'イガグリン',
    movement: 'charge',
    color: '#d88a4a',
    hp: 20,
    speed: 26,
    damage: 10,
    radius: 8,
    sprite: {
      palette: { a: '#d88a4a', c: '#2a1505', s: '#8a5a2a' },
      rows: [
        '.s.s.s.s.s..',
        '..saaaaaas..',
        '.saaaaaaaas.',
        's.aaaaaaaa.s',
        '.saaaaaaaas.',
        '.accaaaacca.',
        '.aaaaaaaaaa.',
        '.aaaaccaaaa.',
        '.saaaaaaaas.',
        '..saaaaaas..',
        '.s.s.s.s.s..',
      ],
    },
  },
  {
    // Wave C: 跳ねて距離を詰めるバネ足。着地の一瞬だけ止まるので避けやすい。
    id: 'pyonpi',
    name: 'ピョンピ',
    movement: 'hop',
    color: '#ffd36e',
    hp: 7,
    speed: 90,
    damage: 6,
    radius: 6,
    sprite: {
      palette: { a: '#ffd36e', c: '#3a2400', b: '#ffffff', f: '#e0952b' },
      rows: [
        '..a......a..',
        '..a.aaaa.a..',
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        '.acc.aa.cca.',
        '.acbaaaabca.',
        '.aaaaaaaaaa.',
        '.aaaccccaaa.',
        '..aaaaaaaa..',
        '...ffffff...',
        '..ff....ff..',
      ],
    },
  },
  {
    // Wave C: まっすぐ来ずに渦を巻きながら寄る。囲まれる感を作る担当。
    id: 'kururin',
    name: 'クルリン',
    movement: 'spiral',
    color: '#8affc1',
    hp: 12,
    speed: 50,
    damage: 7,
    radius: 7,
    sprite: {
      palette: { a: '#8affc1', c: '#0f3a24', b: '#ffffff', s: '#3fd98c' },
      rows: [
        '...ssssss...',
        '..saaaaaas..',
        '.saaaaaaaas.',
        'saaaaaaaaaas',
        's.accaacca.s',
        '.aacbaabcaa.',
        '.aaaaaaaaaa.',
        'saaaaccaaaas',
        '.saaaaaaaas.',
        '..saaaaaas..',
        '...ssssss...',
      ],
    },
  },
  {
    // Wave C: 倒すと小さいのが2体に分かれる餅。split は Run.killEnemy が解釈する。
    id: 'mochimo',
    name: 'モチモ',
    movement: 'chase',
    color: '#ffb3d9',
    hp: 16,
    speed: 34,
    damage: 9,
    radius: 8,
    split: { count: 2, hpMult: 0.3, scaleMult: 0.7, speedMult: 1.4 },
    sprite: {
      palette: { a: '#ffb3d9', c: '#4a1030', b: '#ffffff', d: '#ff7fbf' },
      rows: [
        '...aaaaaa...',
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        'aaccaaaaccaa',
        'aacbaaaabcaa',
        'aaaaaaaaaaaa',
        'aaaaddddaaaa',
        '.aaaddddaaa.',
        '.aaaaaaaaaa.',
        '..daaaaaad..',
        '..d.d..d.d..',
      ],
    },
  },
];

// === ボス群（Wave D：小/中/大の3段） ===
// いずれも 渦(回転)＋顔(非回転) の2枚重ねテクスチャ。ENEMIES には入れない。

// 小ボス「コロたま」。パステルの可愛い王冠ぷに。序盤(~90秒)の最初の山場。
export const KOROTAMA = {
  id: 'korotama',
  name: 'コロたま',
  color: '#ff9ec4',
  sprites: {
    // 回転させる本体。パステルピンク×ミントの丸い風車（180°回転対称）。
    swirl: {
      palette: { a: '#ffc2e0', b: '#b8f0d8' },
      rows: [
        '......aabb......',
        '....aaaabbbb....',
        '...aaaaabbbbb...',
        '..aaaaaabbbbbb..',
        '.aaaaaaabbbbbbb.',
        '.aaaaaaabbbbbbb.',
        'aaaaaaaabbbbbbbb',
        'aaaaaaaabbbbbbbb',
        'bbbbbbbbaaaaaaaa',
        'bbbbbbbbaaaaaaaa',
        '.bbbbbbbaaaaaaa.',
        '.bbbbbbbaaaaaaa.',
        '..bbbbbbaaaaaa..',
        '...bbbbbaaaaa...',
        '....bbbbaaaa....',
        '......bbaa......',
      ],
    },
    // 非回転の顔。小さな金冠＋つぶらな目＋ほっぺ＋にっこり。
    face: {
      palette: { g: '#ffd85e', p: '#ffd6ee', w: '#ffffff', k: '#5a2a4a', c: '#ff9ec4' },
      rows: [
        '...g.g.g.g.g....',
        '...gggggggggg...',
        '..pppppppppppp..',
        '.pppppppppppppp.',
        '.pwwkppppppkwwp.',
        '.pwwkppppppkwwp.',
        '.pppppppppppppp.',
        '.pcpppppppppcpp.',
        '.ppppkkkkkppppp.',
        '..pppkkkkkkppp..',
        '..pppppppppppp..',
        '...pppppppppp...',
        '....pppppppp....',
        '.....pppppp.....',
        '......pppp......',
        '.......pp.......',
      ],
    },
  },
};

// 中ボス「ウズキング」。渦(回転)＋顔(非回転)の2枚重ねテクスチャ。
export const UZUKING = {
  id: 'uzuking',
  name: 'ウズキング',
  color: '#ff6ec7',
  sprites: {
    // 回転させる渦本体。マゼンタと紫のS字スパイラル（180°回転対称）。
    swirl: {
      palette: { m: '#ff6ec7', p: '#7a3bf0' },
      rows: [
        '......mmmp......',
        '....mmmmmmpp....',
        '...mmmmmmmmpp...',
        '..mmmmmmmmmppp..',
        '.mmmmmmmmmppppp.',
        '.mmmmmmmmpppppp.',
        'mmmmmmmmmppppppp',
        'mmmmmmmmpppppppp',
        'mmmmmmmmpppppppp',
        'mmmmmmmppppppppp',
        '.mmmmmmpppppppp.',
        '.mmmmmppppppppp.',
        '..mmmppppppppp..',
        '...mmpppppppp...',
        '....mmpppppp....',
        '......mppp......',
      ],
    },
    // 非回転の顔。金の王冠＋大きな目＋にやり笑い＋1本キバ＋短腕。
    face: {
      palette: { p: '#7a3bf0', g: '#ffd23f', w: '#ffffff', k: '#1b1030', m: '#ff6ec7' },
      rows: [
        '...g.g.g.g.g....',
        '...gggggggggg...',
        '..pppppppppppp..',
        '.pppppppppppppp.',
        '.pwkwppppppwkwp.',
        '.pwwwppppppwwwp.',
        '.pppppppppppppp.',
        '..ppkkkkkkkkpp..',
        '..ppkwkkkkkkpp..',
        '..pppkkkkkkppp..',
        'mmppppppppppppmm',
        'mmppppppppppppmm',
        '..mmppppppppmm..',
        '...pppppppppp...',
        '....pppppppp....',
        '......pppp......',
      ],
    },
  },
};

// 大ボス「マオウ」。金×黒・放射状の棘/角・多眼・赤紫の宝石・砲身状突起。
// 威圧的な見た目 → 撃破すると可愛い顔でぽよん、の「かわいさとのギャップ」担当。
export const MAOU = {
  id: 'maou',
  name: 'マオウ',
  color: '#ffcb3d',
  sprites: {
    // 回転させる本体。黒い核から金の棘が8方向に放射（回転対称）。
    swirl: {
      palette: { g: '#ffcb3d', k: '#1a1015' },
      rows: [
        '.......gg.......',
        '...g...gg...g...',
        '....g..gg..g....',
        '.g...gkkkkg...g.',
        '..g.gkkkkkkg.g..',
        '...gkkkkkkkkg...',
        '.gggkkkkkkkkggg.',
        'ggkkkkkkkkkkkkgg',
        'ggkkkkkkkkkkkkgg',
        '.gggkkkkkkkkggg.',
        '...gkkkkkkkkg...',
        '..g.gkkkkkkg.g..',
        '.g...gkkkkg...g.',
        '....g..gg..g....',
        '...g...gg...g...',
        '.......gg.......',
      ],
    },
    // 非回転の顔。金の角・多眼(赤紫の宝石)・中央の大宝石・左右の砲身。
    face: {
      palette: { k: '#1a1015', g: '#ffcb3d', r: '#c9187e', w: '#ff6ec7', d: '#5c4a2a' },
      rows: [
        '..g..g....g..g..',
        '..gg.gg..gg.gg..',
        '.kkkkkkkkkkkkkk.',
        '.kwkkkkkkkkkkwk.',
        '.krkkkkkkkkkkrk.',
        'dkkkkgggggkkkkkd',
        'dkkkgrrrrrgkkkkd',
        'dkkkgrrwrrgkkkkd',
        'dkkkgrrrrrgkkkkd',
        'dkkkkgggggkkkkkd',
        '.kkkkkkkkkkkkkk.',
        '.kkrkkkkkkkkrkk.',
        '..kkkkkkkkkkkk..',
        '...gkkkkkkkkg...',
        '...g.gkkkkg.g...',
        '......gkkg......',
      ],
    },
  },
};

// 出現順（小→中→大）。Boot/validate はこの配列を走査してテクスチャ生成・検証する。
export const BOSSES = [KOROTAMA, UZUKING, MAOU];
// 後方互換：単一ボス参照(test-core / 既存コード)は中ボス=ウズキングを指す。
export const BOSS = UZUKING;
