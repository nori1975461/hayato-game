// 敵5種＋ボスの定義（PROTOTYPE_SPEC §3.2/§3.3/§4.3/§10.5）。
// radius は表示スケール適用後の当たり半径(px)。movement は 'chase' | 'sine' | 'charge' | 'hop' | 'spiral' | 'hover'。
// Wave R1: 雑魚を「異空間ロボット軍団ヴォイド・マキナ」5種に総入れ替え。全種に attack（予告付き攻撃）を持たせる。
//   attack.type = 'quake'（衝撃波）/'divebomb'（急降下突進）/'selfdestruct'（自爆）/'lockbeam'（狙撃弾）/'spread'（扇状弾）。
//   実処理は Run.updateEnemyAttack が解釈する。予告(telegraphSec)を必ず挟む＝理不尽な即死を出さない。
// BOSS は ENEMIES 配列に入れず別 export（出現プール/重み検証を汚さない）。

export const ENEMIES = [
  {
    // 壁役：紅白の重装甲タンク。じわじわ迫り、たまに地面を叩いて衝撃波（quake）を出す。
    id: 'gareon',
    name: 'ガレオン',
    movement: 'chase',
    color: '#d5382f',
    hp: 42,
    speed: 22,
    damage: 16,
    radius: 9,
    attack: { type: 'quake', intervalSec: 3.5, telegraphSec: 0.5, range: 60, aoe: 46, damage: 14 },
    sprite: {
      palette: { k: '#14171d', w: '#d9dde2', r: '#d5382f', y: '#ffcf3d', e: '#ff5a4d', t: '#3a3f47' },
      rows: [
        '..k......k..',
        '..k.wwww.k..',
        '.kwwwwwwwwk.',
        'kwywwwwwwywk',
        'kwwwwwwwwwwk',
        'kkkkkkkkkkkk',
        'kkkeeeeeekkk',
        'krrrrrrrrrrk',
        'kwywwwwwwywk',
        '.kwwwwwwwwk.',
        '.tttttttttt.',
        '.t.tt.tt.tt.',
      ],
    },
  },
  {
    // 手数役：黄の量産ドローン。ふらふら寄り（sine）、たまに急降下突進（divebomb）で刺しに来る。
    id: 'chibit',
    name: 'チビット',
    movement: 'sine',
    color: '#ffcf3d',
    hp: 6,
    speed: 62,
    damage: 7,
    radius: 5,
    attack: { type: 'divebomb', intervalSec: 4.0, telegraphSec: 0.3, range: 80, dashSec: 0.4, dashMult: 2.6 },
    sprite: {
      palette: { k: '#14171d', m: '#8a929c', l: '#c2c8d0', y: '#ffcf3d', j: '#40454d' },
      rows: [
        '.....kk.....',
        '.....mm.....',
        '...kmmmmk...',
        '..kmllllmk..',
        '..kkkkkkkk..',
        '..kkyyyykk..',
        '..kmmmmmmk..',
        '..kmyllymk..',
        '...kmmmmk...',
        '..kj....jk..',
        '.mm......mm.',
        'mm........mm',
      ],
    },
  },
  {
    // 特攻役：オレンジの重機。溜めて突進(charge)し、間合いに入ると導火線を光らせて自爆（selfdestruct）。
    id: 'bomba',
    name: 'ボンバ',
    movement: 'charge',
    color: '#ff8a2a',
    hp: 9,
    speed: 46,
    damage: 8,
    radius: 7,
    attack: { type: 'selfdestruct', intervalSec: 0, telegraphSec: 0.7, range: 40, aoe: 50, damage: 26 },
    sprite: {
      palette: { k: '#14171d', o: '#ff8a2a', d: '#b85e18', e: '#ff3020', y: '#ffcf3d', t: '#3a3f47' },
      rows: [
        '....k..k....',
        '....y..y....',
        '...kooook...',
        '..koddddok..',
        '.koddeeddok.',
        'koddeeeeddok',
        'koddeeeeddok',
        '.koddeeddok.',
        '..koddddok..',
        '...kooook...',
        '..ttoooott..',
        '..t.tttt.t..',
      ],
    },
  },
  {
    // 遠距離厄介役：ガンメタルの狙撃機。渦を巻いて間合いを取り(spiral)、狙いを定めて速い弾を撃つ（lockbeam）。
    id: 'snipa',
    name: 'スナイパ',
    movement: 'spiral',
    color: '#ff3b3b',
    hp: 12,
    speed: 40,
    damage: 10,
    radius: 6,
    attack: { type: 'lockbeam', intervalSec: 4.5, telegraphSec: 0.9, range: 230, bulletSpeed: 240, bulletRadius: 3, damage: 12 },
    sprite: {
      palette: { k: '#14171d', m: '#6b6f78', l: '#9a9ea6', e: '#ff3b3b', b: '#42454c', j: '#2e3138' },
      rows: [
        '.....kk.....',
        '....kmmk....',
        '...keeeek...',
        '..kleeeelk..',
        '..kkkkkkkk..',
        'bbkmmmmmmk..',
        'bbkmllllmk..',
        '..kmmmmmmk..',
        '..kj....jk..',
        '.mm......mm.',
        '..mm....mm..',
        '.kk......kk.',
      ],
    },
  },
  {
    // 砲台役：白装甲の浮遊ドローン。一定距離を保って浮遊(hover)し、扇状の3連弾（spread）を撒く。
    id: 'turret',
    name: 'タレット',
    movement: 'hover',
    color: '#7fe8ff',
    hp: 16,
    speed: 30,
    damage: 9,
    radius: 7,
    hoverDist: 150,
    attack: { type: 'spread', intervalSec: 3.8, telegraphSec: 0.4, range: 210, count: 3, spreadDeg: 24, bulletSpeed: 150, bulletRadius: 4, damage: 9 },
    sprite: {
      palette: { k: '#14171d', w: '#e2e6ea', l: '#f4f6f8', y: '#ffd23f', r: '#ff3b2f', c: '#7fe8ff' },
      rows: [
        '...kwwwwk...',
        '..kwllllwk..',
        '.kwyywwyywk.',
        'kwwwkkkkwwwk',
        'kwwkkrrkkwwk',
        'kwwkkrrkkwwk',
        'kwwwkkkkwwwk',
        '.kwwwwwwwwk.',
        'rr.kwwwwk.rr',
        '...kwwwwk...',
        '....krrk....',
        '...cc..cc...',
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
