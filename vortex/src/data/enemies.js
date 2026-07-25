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
    hp: 14,   // FB#3: 序盤の近接1ヒット(≈4dmg)で3〜4発。壁役なので雑魚内では最も硬いまま
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
    hp: 4,   // FB#3: 手数役の量産機。近接1〜2発で弾ける（最弱）
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
    hp: 8,   // FB#3: 特攻役。近接2〜3発で倒せる紙装甲（自爆前に処理できる）
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
    hp: 9,   // FB#3: 狙撃役。近接3発前後
    speed: 40,
    damage: 10,
    radius: 6,
    // FB#4: 狙撃弾を +20%（240→288）で速く＝避けにくく。弾数は1発なので据え置き
    attack: { type: 'lockbeam', intervalSec: 4.5, telegraphSec: 0.9, range: 230, bulletSpeed: 288, bulletRadius: 3, damage: 12 },
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
    hp: 12,   // FB#3: 砲台役。雑魚内では硬め＝近接3発前後
    speed: 30,
    damage: 9,
    radius: 7,
    hoverDist: 150,
    // FB#4: 扇状弾を +20%（150→180）で速く。count は3（唯一の複数弾攻撃だが、-10%だと2.7で3へ丸まり、
    //       2発は約-33%で「約1割減」を超え唯一の弾幕を過度に弱めるため3のまま維持）
    attack: { type: 'spread', intervalSec: 3.8, telegraphSec: 0.4, range: 210, count: 3, spreadDeg: 24, bulletSpeed: 180, bulletRadius: 4, damage: 9 },
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

// === ボス群（Wave R3→FB#8：ロボット6体・ボディタイプ別リグ） ===
// FB#8「6体が似すぎ」への対応。共通7パーツ人型リグをやめ、各ボスの rig 構造そのものを
// ボディタイプ別に作り分けてシルエットを別物にする（UFO/戦闘機/多脚/戦車/ミサイルキャリア/大型人型）。
// テクスチャキーは boss_<id>_<part>。左右対称パーツは setScale(-s,s) でミラー（rig.mirror）。
// rig の ox/oy はスプライト元px（表示時に spriteScale 倍）。role によって boss.js が depth/origin/アニメ
// （dome=浮遊天蓋 / wing=バンク / qleg=4脚交互 / track=履帯 / rack=ミサイル上昇 / cannon=照準）を出し分ける。
// 全ボス共通の「らしさ」＝単眼センサー(core) は各型に合う位置に残す。ENEMIES には入れない。

// 1. 小ボス「コロガンナー」＝UFO/ホバー円盤型（脚なし・浮遊）。マシンガン。序盤(~60秒)の最初の山場。
//    パーツ：saucer(円盤胴) / dome(天蓋グラス) / pod(左右スラスター) / cannon(機銃バレル) / core(下部単眼センサー)。
const KORO_PAL = { g: '#8a8f98', d: '#5a606b', k: '#1a1d24', c: '#38e1ff', b: '#e8edf5', o: '#e8720c' };
export const KOROTAMA = {
  id: 'korotama',
  name: 'コロガンナー',
  color: '#8a9098',
  sprites: {
    // 円盤（レンズ状の胴）。上に天蓋、下に単眼。脚は一切持たない＝UFOシルエット。
    body: { palette: KORO_PAL, rows: [
      '......gggggggg......',
      '...ggggddddddgggg...',
      '.ggggddddddddddgggg.',
      'ggggddddddddddddgggg',
      'bgggddddddddddddgggb',
      'ggggddddddddddddgggg',
      '.gggkddddddddddkggg.',
      '...ggkkddddddkkgg...',
      '......ggkkkkgg......',
    ] },
    dome: { palette: KORO_PAL, rows: [
      '...cccc...',
      '..cbbbbc..',
      '.cbbbbbbc.',
      '.cbbccbbc.',
      '.cccccccc.',
      '..gkkkkg..',
    ] },
    pod: { palette: KORO_PAL, rows: [
      '.kkk.',
      'kdddk',
      'kccck',
      '.kkk.',
    ] },
    cannon: { palette: KORO_PAL, rows: [
      '.kkkkk.',
      'kdddddo',
      'kddddoo',
      'kdddddo',
      '.kkkkk.',
    ] },
    // 下部の単眼センサー（大きな青い目）。
    core: { palette: KORO_PAL, rows: [
      '..gggggg..',
      '.gkkkkkkg.',
      'gkcccccckg',
      'gkccbbcckg',
      'gkcccccckg',
      'gkkkkkkkkg',
      '.gkkkkkkg.',
      '..gggggg..',
    ] },
  },
  rig: [
    { role: 'body',   tex: 'body',   ox: 0,  oy: 0 },
    { role: 'dome',   tex: 'dome',   ox: 0,  oy: -6 },
    { role: 'podL',   tex: 'pod',    ox: -9, oy: 2,  mirror: true },
    { role: 'podR',   tex: 'pod',    ox: 9,  oy: 2 },
    { role: 'cannon', tex: 'cannon', ox: 0,  oy: 6 },
    { role: 'core',   tex: 'core',   ox: 0,  oy: 1 },
  ],
};

// 2. 小+ボス「ジェットバイパー」＝飛行機/ジェット戦闘機型（機首を下＝プレイヤー側へ・後退翼）。円鋸カッター。
//    パーツ：fuselage(機体・機首下向き) / wing(後退翼・左右) / thruster(尾部エンジン炎) / cannon(機首カッター射出口) / core(コックピット単眼)。
const JET_PAL = { w: '#eef2f7', s: '#aab2bd', k: '#181b22', b: '#2a6bff', c: '#7fd0ff', r: '#ff4d4d' };
export const JETVIPER = {
  id: 'jetviper',
  name: 'ジェットバイパー',
  color: '#2a6bff',
  sprites: {
    // ダート状の細長い機体。上が尾部、下が尖った機首。中央にコックピット。
    body: { palette: JET_PAL, rows: [
      '...wwww...',
      '..swwwws..',
      '..wwwwww..',
      '.wwwwwwww.',
      '.wwwwwwww.',
      '.wwwwwwww.',
      'swwwwwwwws',
      'swwwwwwwws',
      '.wwwwwwww.',
      '.wwwwwwww.',
      '..wwwwww..',
      '..wwwwww..',
      '...wwww...',
      '...wwww...',
      '....ww....',
      '....kk....',
    ] },
    // 後退翼（付け根＝上内側、翼端＝下外側へ後退）。左翼はミラー。
    wing: { palette: JET_PAL, rows: [
      'sswwwww..',
      '.swwwwww.',
      '..swwwwww',
      '...swwwww',
      '....swwww',
      '.....swww',
      '......sww',
    ] },
    thruster: { palette: JET_PAL, rows: [
      '..cc..',
      '.crrc.',
      '.crrc.',
      '..cc..',
    ] },
    cannon: { palette: JET_PAL, rows: [
      '.sssss.',
      'skkkkkr',
      'skkkkrr',
      'skkkkkr',
      '.sssss.',
    ] },
    core: { palette: JET_PAL, rows: [
      '.wwwwww.',
      'wkkkkkkw',
      'wkbbbbkw',
      'wkbccbkw',
      'wkbbbbkw',
      '.wwwwww.',
    ] },
  },
  rig: [
    { role: 'body',     tex: 'body',     ox: 0,  oy: 0 },
    { role: 'wingL',    tex: 'wing',     ox: -6, oy: 0,  mirror: true },
    { role: 'wingR',    tex: 'wing',     ox: 6,  oy: 0 },
    { role: 'thruster', tex: 'thruster', ox: 0,  oy: -8 },
    { role: 'cannon',   tex: 'cannon',   ox: 0,  oy: 8 },
    { role: 'core',     tex: 'core',     ox: 0,  oy: -2 },
  ],
};

// 3. 中ボス「ウズバルカン」＝4足歩行/多脚砲台型（甲虫状の車体＋4本脚）。背部にバルカン砲塔。
//    パーツ：body(甲虫車体) / leg(角ばった脚・4本をミラー配置) / cannon(背部バルカン砲塔) / core(前部単眼)。phase2「ぶちギレ」。
const UZU_PAL = { o: '#e8720c', d: '#a8500a', k: '#1a1d24', s: '#c9ced6', y: '#ffd23f', c: '#38e1ff' };
export const UZUKING = {
  id: 'uzuking',
  name: 'ウズバルカン',
  color: '#e8720c',
  sprites: {
    // 横に張り出した甲虫状の車体（縦より横に広い）。四隅から脚が生える。
    body: { palette: UZU_PAL, rows: [
      '....oooooooo....',
      '..oooddddddooo..',
      '.ooddddddddddoo.',
      'ooddddddddddddoo',
      'oddddddddddddddo',
      'odddkddddddddkdo',
      'oyddddddddddddyo',
      'ooddddddddddddoo',
      '.ooddddddddddoo.',
      '..oookkkkkkooo..',
      '...oooooooooo...',
    ] },
    // 角ばった昆虫脚（付け根＝上、足先＝下外へ）。右側用に描き、左側はミラー。
    leg: { palette: UZU_PAL, rows: [
      'ooo...',
      'oddo..',
      '.oddo.',
      '..oddo',
      '..oddo',
      '..okko',
      '...kkk',
      '...kk.',
    ] },
    // 背部のバルカン砲塔（複数バレルが下に突き出す）。
    cannon: { palette: UZU_PAL, rows: [
      '.oooooo.',
      'oykkkkyo',
      'okkkkkko',
      'okkkkkko',
      '.oooooo.',
      '..kkkk..',
    ] },
    core: { palette: UZU_PAL, rows: [
      '.oooooooo.',
      'oykkkkkkyo',
      'oksccccsko',
      'oksccccsko',
      'oksccccsko',
      'oykkkkkkyo',
      '.oooooooo.',
    ] },
  },
  rig: [
    { role: 'body',    tex: 'body',   ox: 0,  oy: 0 },
    { role: 'qlegBL',  tex: 'leg',    ox: -9, oy: 6, mirror: true },
    { role: 'qlegBR',  tex: 'leg',    ox: 9,  oy: 6 },
    { role: 'qlegFL',  tex: 'leg',    ox: -7, oy: 2, mirror: true },
    { role: 'qlegFR',  tex: 'leg',    ox: 7,  oy: 2 },
    { role: 'cannon',  tex: 'cannon', ox: 0,  oy: -4 },
    { role: 'core',    tex: 'core',   ox: 0,  oy: 1 },
  ],
};

// 4. 中+ボス「ウェイブロード」＝キャタピラ/戦車型（低く幅広の車体＋左右履帯＋巨大波動主砲）。
//    パーツ：body(戦車ハル) / track(履帯・左右) / cannon(前方へ伸びる極太波動砲＝照準回転) / core(砲塔前面の単眼ビューポート)。phase2「かくせい」。
const WAVE_PAL = { w: '#eef2f7', g: '#7d838d', k: '#181b22', c: '#38e1ff', b: '#a8f0ff', y: '#ffd23f' };
export const WAVELORD = {
  id: 'wavelord',
  name: 'ウェイブロード',
  color: '#38e1ff',
  sprites: {
    // 低く幅広の戦車ハル。左右に履帯が付く。
    body: { palette: WAVE_PAL, rows: [
      '..wwwwwwwwwwwwww..',
      '.wwwwwwwwwwwwwwww.',
      'wwwwwwwwwwwwwwwwww',
      'wggwwwwwwwwwwwwggw',
      'wgwwwwwwwwwwwwwwgw',
      'wwwwwwwwwwwwwwwwww',
      '.wwwwwwwwwwwwwwww.',
      '..wwwwwwwwwwwwww..',
      '.kkwwwwwwwwwwwwkk.',
      '..wwwwwwwwwwwwww..',
    ] },
    // 履帯（リンクが上下に連なる）。左右で同一・ミラー不要だが対称配置。
    track: { palette: WAVE_PAL, rows: [
      'kkkkk',
      'kgggk',
      'kkkkk',
      'kgggk',
      'kkkkk',
      'kgggk',
      'kkkkk',
      'kgggk',
      'kkkkk',
      'kgggk',
      'kkkkk',
      'kgggk',
    ] },
    // 極太の波動砲身（左端が砲基部＝origin付近、右へ長く伸び照準方向へ回る）。
    cannon: { palette: WAVE_PAL, rows: [
      '.gggggg.....',
      'gkcccccccccc',
      'gkcccccccccc',
      'gkcccccccccc',
      'gkcccccccccc',
      '.gggggg.....',
    ] },
    core: { palette: WAVE_PAL, rows: [
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      'wwkkkkkkkkww',
      'wkcccccccckw',
      'wkcccccccckw',
      'wwkkkkkkkkww',
      '.wwwwwwwwww.',
      '..wwwwwwww..',
    ] },
  },
  rig: [
    { role: 'body',    tex: 'body',   ox: 0,  oy: 0 },
    { role: 'trackL',  tex: 'track',  ox: -9, oy: 1, mirror: true },
    { role: 'trackR',  tex: 'track',  ox: 9,  oy: 1 },
    { role: 'cannon',  tex: 'cannon', ox: 0,  oy: -1 },
    { role: 'core',    tex: 'core',   ox: 0,  oy: -2 },
  ],
};

// 5. 大ボス「ミサイルガ」＝ミサイルキャリア型（低く幅広の車体＋上部に多連ミサイルポッド＋左右ホバー脚）。
//    上記4型（UFO/戦闘機/多脚/戦車）と被らせない。パーツ：body(車体) / rack(4連ミサイルポッド＝予告で上昇) /
//    base(左右ホバー/車輪ユニット) / cannon(前部バルカン＝照準) / core(前部単眼)。phase2「ぶちギレ」。
const MIS_PAL = { o: '#e8720c', d: '#a8500a', k: '#1a1d24', s: '#c9ced6', y: '#ffd23f', r: '#ff4d4d', c: '#38e1ff' };
export const MISSILGA = {
  id: 'missilga',
  name: 'ミサイルガ',
  color: '#e8720c',
  sprites: {
    // 低く幅広の運搬車体。上にミサイルポッド、下にホバーユニットを積む台座。
    body: { palette: MIS_PAL, rows: [
      '..oooooooooooooo..',
      '.osddddddddddddso.',
      'oddddddddddddddddo',
      'oyddddddddddddddyo',
      'oddddddddddddddddo',
      'osddddddddddddddso',
      '.oddddddddddddddo.',
      '..oooooooooooooo..',
      '...oooooooooooo...',
    ] },
    // 4連ミサイルポッド（垂直発射管が並ぶ・赤い弾頭）。上部に立つ＝キャリアのシルエット。
    rack: { palette: MIS_PAL, rows: [
      '..r...r...r...r.',
      '.kck.kck.kck.kck',
      '.sds.sds.sds.sds',
      '.sds.sds.sds.sds',
      '.sds.sds.sds.sds',
      '.kok.kok.kok.kok',
      'oooooooooooooooo',
      '.oooooooooooooo.',
    ] },
    base: { palette: MIS_PAL, rows: [
      '.kkkk.',
      'kddddk',
      'kdccdk',
      'kddddk',
      '.kkkk.',
    ] },
    cannon: { palette: MIS_PAL, rows: [
      'ooooooo.',
      'okkkkkkr',
      'okkkkkkr',
      'okkkkkkk',
      'ooooooo.',
    ] },
    core: { palette: MIS_PAL, rows: [
      'oooooooo',
      'okkkkkko',
      'okccccko',
      'okccccko',
      'oooooooo',
      'dd....dd',
    ] },
  },
  rig: [
    { role: 'body',   tex: 'body',   ox: 0,  oy: 0 },
    { role: 'baseL',  tex: 'base',   ox: -8, oy: 5, mirror: true },
    { role: 'baseR',  tex: 'base',   ox: 8,  oy: 5 },
    { role: 'rack',   tex: 'rack',   ox: 0,  oy: -7 },
    { role: 'cannon', tex: 'cannon', ox: 0,  oy: 4 },
    { role: 'core',   tex: 'core',   ox: 0,  oy: 1 },
  ],
};

// 6. 最終ボス「マオウレクス」＝大型2足歩行メカ型（唯一の人型＝王者）。金冠・広い肩・厚い胴・2腕2脚。最大サイズ。
//    他5体を非人型にしたことで、重厚な人型シルエットが際立つ。パーツ：body(冠付き頭＋胸胴) / core(頭部の単眼バイザー) /
//    armR(重装甲アーム＋拳・左右ミラー) / leg(大足・左右ミラー) / cannon(肩/胸のレーザー砲＝照準)。亜空間レーザー。
const MAOU_PAL = { w: '#f2f4f8', r: '#e03028', d: '#b01c18', k: '#20242c', y: '#ffd23f', s: '#9aa0ab', c: '#38e1ff' };
export const MAOU = {
  id: 'maou',
  name: 'マオウレクス',
  color: '#e03028',
  sprites: {
    // 頂部に金冠、その下に頭、広い肩、赤い胸（中央に炉心シアン）、絞った腰。堂々の人型。
    body: { palette: MAOU_PAL, rows: [
      '.....y..yy..y.....',
      '....wwwwwwwwww....',
      '...wwwwwwwwwwww...',
      '...wwkkkkkkkkww...',
      '..wwwwwwwwwwwwww..',
      '.wwwwwwwwwwwwwwww.',
      'sswwwwwwwwwwwwwwss',
      'swwwwrrrrrrrrwwwws',
      'swwwrrrrrrrrrrwwws',
      'swwwrrccccccrrwwws',
      'swwwrrccccccrrwwws',
      'swwwwrrrrrrrrwwwws',
      '.wwwwwwwwwwwwwwww.',
      '..wwwsssssssswww..',
      '..kkw........wkk..',
    ] },
    // 頭部の単眼バイザー（怒りの赤スリット）。
    core: { palette: MAOU_PAL, rows: [
      '..wwwwwwww..',
      '.wkkkkkkkkw.',
      'wkcccccccckw',
      'wkccrrrrcckw',
      '.wkkkkkkkkw.',
      '..wwwwwwww..',
    ] },
    armR: { palette: MAOU_PAL, rows: [
      '.ssssss.',
      'skwwwwks',
      'skwwwwks',
      'skwrrwks',
      'sskkkkss',
      'skwwwwks',
      'skwwwwks',
      'skwrrwks',
      'wwwwwwww',
      'wwwwwwww',
      'wkwkwkwk',
      'kwkwkwkw',
      'k.k.k.k.',
    ] },
    cannon: { palette: MAOU_PAL, rows: [
      '.ssssss...',
      'skkkkkkccc',
      'skkkkkcccc',
      'skkkkkcccc',
      'skkkkkkccc',
      '.ssssss...',
    ] },
    leg: { palette: MAOU_PAL, rows: [
      '.wwwwwwwwww.',
      'wssssssssssw',
      'kkkkkkkkkkkk',
      'kwkwkwkwkwkw',
      'kwkwkwkwkwkw',
      'kkkkkkkkkkkk',
      '.kwkwkwkwkw.',
      '..kkkkkkkk..',
    ] },
  },
  rig: [
    { role: 'body',   tex: 'body',   ox: 0,   oy: 0 },
    { role: 'legL',   tex: 'leg',    ox: -6,  oy: 13, mirror: true },
    { role: 'legR',   tex: 'leg',    ox: 6,   oy: 13 },
    { role: 'armL',   tex: 'armR',   ox: -11, oy: -1, mirror: true, origin: [0.5, 0.10] },
    { role: 'armR',   tex: 'armR',   ox: 11,  oy: -1, origin: [0.5, 0.10] },
    { role: 'cannon', tex: 'cannon', ox: 9,   oy: 0,  origin: [0.12, 0.5] },
    { role: 'core',   tex: 'core',   ox: 0,   oy: -6 },
  ],
};

// 出現順（小→final）。Boot/validate はこの配列を走査してテクスチャ生成・検証する。
export const BOSSES = [KOROTAMA, JETVIPER, UZUKING, WAVELORD, MISSILGA, MAOU];
// 後方互換：単一ボス参照(test-core / 既存コード)は id=uzuking を指す（改名後も id は据え置き）。
export const BOSS = UZUKING;
