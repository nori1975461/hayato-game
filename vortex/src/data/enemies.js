// 敵3種の定義（PROTOTYPE_SPEC §3.2/§3.3/§4.3）。
// radius は表示スケール適用後の当たり半径(px)。movement は 'chase' | 'sine' | 'charge'。

export const ENEMIES = [
  {
    // まっすぐ突っ込んでくる紫の突撃体。むすっとした顔。
    id: 'zunzun',
    name: 'ズンズン',
    movement: 'chase',
    color: '#a06bff',
    hp: 10,
    speed: 40,
    damage: 8,
    radius: 7,
    sprite: {
      palette: { a: '#a06bff', c: '#1b1030', b: '#ffffff', g: '#c9a0ff' },
      rows: [
        '..aaaaaaaa..',
        '.aaaaaaaaaa.',
        '.agaaaaaaga.',
        '.aaaaaaaaaa.',
        '.accaaaacca.',
        '.acbaaaabca.',
        '.aaaaaaaaaa.',
        '.aacccccaa..',
        '.aaaaaaaaaa.',
        '..aaaaaaaa..',
        '..a.a..a.a..',
      ],
    },
  },
  {
    // ふわふわ漂う水色の雲。左右に揺れて近づく（sine）。
    id: 'fuwafuwa',
    name: 'フワフワ',
    movement: 'sine',
    color: '#7fe8ff',
    hp: 6,
    speed: 55,
    damage: 6,
    radius: 6,
    sprite: {
      palette: { a: '#7fe8ff', b: '#ffffff', c: '#1b3b5f', w: '#c8f7ff' },
      rows: [
        '...aaaaaa...',
        '..aawwwwaa..',
        '.aawwwwwwaa.',
        '.aaaaaaaaaa.',
        '.acaaaaaaca.',
        '.aaaabbaaaa.',
        '.aaaaaaaaaa.',
        '..aaaaaaaa..',
        '..a.a..a.a..',
      ],
    },
  },
  {
    // 赤い甲虫。黄色い角を構えて溜め、猛突進する（charge）。
    id: 'dashbeetle',
    name: 'ダッシュビートル',
    movement: 'charge',
    color: '#ff5e5e',
    hp: 14,
    speed: 30,
    damage: 12,
    radius: 8,
    sprite: {
      palette: { a: '#ff5e5e', c: '#3a0a0a', h: '#ffd23f', g: '#ff9a9a' },
      rows: [
        '.....hh.....',
        '....hhhh....',
        '.....hh.....',
        '..aaaaaaaa..',
        '.agaaaaaaga.',
        '.acaaaaaaca.',
        '.aaaaaaaaaa.',
        '.aaaaccaaaa.',
        '.aaaaccaaaa.',
        '..aaaaaaaa..',
        '.a.a.aa.a.a.',
      ],
    },
  },
];
