// 敵5種＋ボスの定義（PROTOTYPE_SPEC §3.2/§3.3/§4.3/§10.5）。
// radius は表示スケール適用後の当たり半径(px)。movement は 'chase' | 'sine' | 'charge' | 'hop' | 'spiral' | 'hover'。
// Wave R1: 雑魚を「異空間ロボット軍団ヴォイド・マキナ」5種に総入れ替え。全種に attack（予告付き攻撃）を持たせる。
//   attack.type = 'quake'（衝撃波）/'divebomb'（急降下突進）/'selfdestruct'（自爆）/'lockbeam'（狙撃弾）/'spread'（扇状弾）。
//   実処理は Run.updateEnemyAttack が解釈する。予告(telegraphSec)を必ず挟む＝理不尽な即死を出さない。
// BOSS は ENEMIES 配列に入れず別 export（出現プール/重み検証を汚さない）。
//
// R17d: 5種のビジュアルを刷新。造形は「Aシャープ戦闘機械」を基調に、ボンバとスナイパだけ
//   世話道具（哺乳瓶・ベビーモニタ）のシルエットをAの素材で描く＝正典§22の皮肉を形に残す。
// R19: 体は全機共通のガンメタルで統一し、役割ごとに変えるのは眼・コア＝ MACHINE_PALETTE の r だけ。
//   艦隊としての統一感と、脅威の種類の即判別を両立させる。
//   ⚠️ def.color は sprite.palette.r と必ず一致させること（Run.spawnEnemy が def.color で背後のグローと
//      撃破パーティクルを塗るため、ズレると「眼と後光が違う色の機体」になる）。validate-data.js が恒久ガード。
const MACHINE = { k: '#171b24', g: '#67748c', s: '#c8d6ea', f: '#3d4658' };
const machinePalette = (role) => ({ ...MACHINE, r: role });

// 役割色（R19b・画面上の全色とのCIELAB距離を実測して決定）
const ROLE = {
  gareon: '#ff2438',   // 壁＝血赤
  chibit: '#94ad3e',   // 量産＝オリーブライム（最も数が出るぶん最も目立たなくてよい）
  bomba: '#ff6a1f',    // 特攻＝警告橙
  snipa: '#e84dff',    // 狙撃＝紫紅
  turret: '#5ff0d0',   // 砲台＝ミント
  magman: '#ff2f00',   // R24 レア＝溶岩の赤橙（ガレオンの血赤 #ff2438 とは色相で12°離す）
};

// R24 レア雑魚の配色（実プレイFB「見た目もひとめでそれとわかる外観で。ボディの色は赤」）。
// ⚠️ **この機体だけ本体がガンメタルではない**。艦隊の統一感をわざと1機だけ破ることが、
//    そのまま「こいつは違う」という記号になる（説明文を1文字も足さずに伝わる）。
const MAGMA = { k: '#2a0a05', m: '#d42a12', d: '#8a1405', o: '#ff8a1f', y: '#ffcf3a', s: '#ffe9c9' };

export const ENEMIES = [
  {
    // 壁役：角付きの重楔形。じわじわ迫り、たまに地面を叩いて衝撃波（quake）を出す。
    id: 'gareon',
    name: 'ガレオン',
    movement: 'chase',
    color: ROLE.gareon,
    hp: 14,   // FB#3: 序盤の近接1ヒット(≈4dmg)で3〜4発。壁役なので雑魚内では最も硬いまま
    speed: 26,   // R21W2
    damage: 16,
    radius: 9,
    // R21W3: range 96 は主人公の攻撃圏(78〜138px)の内側で、253秒の計測で発火3回。しかも aoe 56+7 <
    //   range なので、その3回も届いていない（雑魚起因の被弾は実測0）。判定をキル圏の外(148)へ出し、
    //   爆風 120 は主人公の攻撃圏(78〜138px)を覆う大きさ。判定距離148pxまで届かせると画面の1/4を
    //   赤く塗ることになるので届かせない。「予告中のガレオンを殴りに行く＝爆風の中にいる」が成立すれば
    //   〈割るか、退くか〉の選択は毎回起きる。予告中は足が止まる（Run.js の updateEnemies）ので爆心は固定。
    //   ⚠️ ダメージは 18 のまま据え置く。接触ダメージ16より弱くすると「予告して撃つ大技より
    //   ただ触る方が痛い」逆転が起き、赤いリング＝一番危ない という学習が壊れる。
    attack: { type: 'quake', intervalSec: 3.5, telegraphSec: 0.8, range: 148, aoe: 120, damage: 18 },   // R21W3
    sprite: {
      palette: machinePalette(ROLE.gareon),
      rows: [
        's..........s',
        'ks........sk',
        '.ksggggggsk.',
        '.sgffffffgs.',
        'sgfkrrrrkfgs',
        'sgfkrrrrkfgs',
        '.sgffkkffgs.',
        '.ksgffffgsk.',
        '..ksgffgsk..',
        '...ksggsk...',
        '....kssk....',
        '.....ss.....',
      ],
    },
  },
  {
    // 手数役：フィン付きの小型ダート。ふらふら寄り（sine）、たまに急降下突進（divebomb）で刺しに来る。
    id: 'chibit',
    name: 'チビット',
    movement: 'sine',
    color: ROLE.chibit,
    hp: 4,   // FB#3: 手数役の量産機。近接1〜2発で弾ける（最弱）
    speed: 62,
    damage: 7,
    radius: 5,
    attack: { type: 'divebomb', intervalSec: 3.4, telegraphSec: 0.4, range: 100, dashSec: 0.55, dashMult: 3.1 },   // R21W2
    sprite: {
      palette: machinePalette(ROLE.chibit),
      rows: [
        '..s......s..',
        '..ss....ss..',
        '...sggggs...',
        '...gfrrfg...',
        '...gfrrfg...',
        '....gffg....',
        '....gffg....',
        '.....gg.....',
        '.....gg.....',
        '.....ss.....',
        '............',
        '............',
      ],
    },
  },
  {
    // 特攻役：哺乳瓶の形をした爆弾（D形×A素材）。溜めて突進(charge)し、間合いで自爆（selfdestruct）。
    //   世話道具が凶器になっている＝正典§22の皮肉を最も強く出す機体。
    id: 'bomba',
    name: 'ボンバ',
    movement: 'charge',
    color: ROLE.bomba,
    hp: 8,   // FB#3: 特攻役。近接2〜3発で倒せる紙装甲（自爆前に処理できる）
    speed: 46,
    damage: 8,
    radius: 7,
    // R21W3: range 52 はキル圏の最深部＝253秒で発火0回。自爆役なのに一度も爆発しない状態だった。
    //   判定を 144 へ出し、爆風も 118 に広げる。予告0.8秒で素の主人公が動けるのは speed 120×0.8＝96px
    //   なので、爆心(=敵の足元)の内側から歩いて出るのは不可能。内側に居るときの正解は「殴って割る」で、
    //   赤いリングの外に居るときの正解は「そのまま離れる」。
    //   ⚠️ 自爆だけは予告中も止まらず、ロック方向へ素の速度(46px/s)で詰める＝0.8秒で必ず37px。
    //   突進倍率を無視するので、どの位相で予告が始まっても詰める距離は毎回同じになる。
    //   なお range 144 は charge の溜め移行 140 より外なので、下の movement:'charge' の
    //   溜め→突進は実プレイでは発生しない（予告の詰めがその役目を引き継いでいる）。
    attack: { type: 'selfdestruct', intervalSec: 0, telegraphSec: 0.8, range: 144, aoe: 118, damage: 28 },   // R21W3
    sprite: {
      palette: machinePalette(ROLE.bomba),
      rows: [
        '.....gg.....',
        '....sggs....',
        '...ssssss...',
        '..sgffffgs..',
        '..sgkrrkgs..',
        '..sgrrrrgs..',
        '..sgrrrrgs..',
        '..sgkrrkgs..',
        '..sgffffgs..',
        '...sgffgs...',
        '...ssssss...',
        '............',
      ],
    },
  },
  {
    // 遠距離厄介役：ベビーモニタのレンズから細い銃身が伸びた狙撃機（D形×A素材）。
    //   渦を巻いて間合いを取り(spiral)、狙いを定めて速い弾を撃つ（lockbeam）。銃身は1px厚＝細長さがライフルの記号。
    id: 'snipa',
    name: 'スナイパ',
    movement: 'spiral',
    color: ROLE.snipa,
    hp: 9,   // FB#3: 狙撃役。近接3発前後
    speed: 40,
    damage: 10,
    radius: 6,
    // FB#4: 狙撃弾を +20%（240→288）で速く＝避けにくく。弾数は1発なので据え置き
    // R21W3: 方向を予告の「開始時」に固定していたため、発射までの0.7秒で主人公が84〜111px動き、
    //   当たり判定の半幅10pxの8〜11倍ずれていた（442発中13発＝2.9%しか当たらない主因）。
    //   lateLockSec = 残りこの秒数になった時点で本ロック＋偏差射撃。残り0.2秒でも24〜32px動けるので
    //   「予告の最後に向きを変える」判断で避けられる＝弾数もダメージも増やさず1発を重くする。
    attack: { type: 'lockbeam', intervalSec: 3.8, telegraphSec: 0.7, lateLockSec: 0.2, range: 230, bulletSpeed: 330, bulletRadius: 3, damage: 12, leadMul: 1 },   // R21W3
    sprite: {
      palette: machinePalette(ROLE.snipa),
      rows: [
        '.sggggs.....',
        'sgffffgs....',
        'sgkrrkgs....',
        'sgrkkrgsssss',
        'sgrkkrgs....',
        'sgkrrkgs....',
        'sgffffgs....',
        '.sggggs.....',
        '...gg.......',
        '....gg......',
        '..sggggs....',
        '............',
      ],
    },
  },
  {
    // R24 レア役：溶岩を詰めた球状の爆弾機。頭から炎が噴き出している。
    //   実プレイFB「弾にすると火力が高いレアな雑魚キャラを一体つくって」。
    //   **掴んで投げると「炎の炸裂弾」になる**（billiard.js の blast）。倒しても普通の雑魚と同じ。
    //   ＝価値は撃破ではなく**弾にすること**にある。だから遅く（速度34）して必ず追いつけるようにし、
    //     接触ダメージは高く（18）して「触らずに削ってよろけさせろ」を体で分からせる。
    //   出現は spawnPhases の重み抽選に入れず、balance.rareEnemy の独立タイマーが不定期に湧かせる。
    id: 'magman',
    name: 'マグマン',
    rare: true,          // ★エリート抽選(spawnElite)と重み抽選から外す印
    movement: 'chase',
    color: ROLE.magman,
    // ⚠️ HPは意図的に**雑魚内で最硬にしない**（ガレオン14より下）。この機体の価値は倒すことでは
    //    なく弾にすることなので、よろけさせるまでが遠いと誰も使わない。
    //    ついでに dev/test-core.js の安全網（「終盤の最硬雑魚を1発で倒せるか」）の基準も動かさずに済む。
    hp: 12,
    speed: 34,
    damage: 18,
    radius: 10,
    // 踏みしめて熱波を出す。ガレオンと同型(quake)だが、こちらは範囲も威力も控えめ＝
    // 「近づいて削る」ことを罰しない（近づかせないと弾にできないので、追い返す技にしてはいけない）。
    attack: { type: 'quake', intervalSec: 4.2, telegraphSec: 0.9, range: 120, aoe: 78, damage: 14 },
    sprite: {
      palette: { ...MAGMA, r: ROLE.magman },
      rows: [
        '.....yy.....',
        '....yooy....',
        '..y.yooy.y..',
        '...yoooy....',
        '...kooook...',
        '.kmmmmmmmmk.',
        'kmmsdrrdsmmk',
        'kmmmdrrdmmmk',
        'kmmmmddmmmmk',
        '.kmmmmmmmmk.',
        '..kddmmddk..',
        '...kkddkk...',
      ],
    },
  },
  {
    // 砲台役：甲板から長砲身が3本突き出す艦砲。一定距離を保って浮遊(hover)し、扇状の3連弾（spread）を撒く。
    //   砲身の本数と実際の弾数(count:3)を一致させ、見た目がそのまま攻撃の予告になるようにしている。
    id: 'turret',
    name: 'タレット',
    movement: 'hover',
    color: ROLE.turret,
    hp: 12,   // FB#3: 砲台役。雑魚内では硬め＝近接3発前後
    speed: 30,
    damage: 9,
    radius: 7,
    hoverDist: 160,   // R21W2: 仲間の到達上限 allyMaxReach 132 の確実に外側へ
    // FB#4: 扇状弾を +20%（150→180）で速く。count は3（唯一の複数弾攻撃だが、-10%だと2.7で3へ丸まり、
    //       2発は約-33%で「約1割減」を超え唯一の弾幕を過度に弱めるため3のまま維持）
    // R21W3: 発射時に狙い直してはいるが、弾速180で210px先まで約1.2秒かかる間に主人公は144〜190px
    //   動く（当たり判定の半幅11pxの13〜17倍）＝構造的に当たらない。弾全体の68%がこの扇弾なので
    //   ここが雑魚帯の被弾の本丸。leadMul は読みの甘さ（1.0で完全予測）。0.8 にして
    //   「まっすぐ走り続けた者だけが当たる・曲がれば外れる」余地を残す。弾数もダメージも増やさない。
    attack: { type: 'spread', intervalSec: 3.2, telegraphSec: 0.4, range: 210, count: 3, spreadDeg: 24, bulletSpeed: 180, bulletRadius: 4, damage: 11, leadMul: 0.8 },   // R21W3
    sprite: {
      palette: machinePalette(ROLE.turret),
      rows: [
        '.kk..kk..kk.',
        '.sg..sg..sg.',
        '.sg..sg..sg.',
        '.sg..sg..sg.',
        '.ssssssssss.',
        'sgffkrrkffgs',
        'sgffkrrkffgs',
        'ssgffffffgss',
        '.ksggggggsk.',
        '..ssssssss..',
        '..kk....kk..',
        '............',
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
// R20: texf文法（鋼のはしご・4段面塗り・二段の闇）で再設計＋色ラウンドで配色決定。設計意図は vortex/scratchpad/boss-v-korotama-final.mjs のNOTES参照。
const KORO_PAL = { k: '#0c1316', j: '#131f24', f: '#192d35', g: '#295b70', m: '#3795be', s: '#e69f68', p: '#21414e', c: '#38e1ff' };
export const KOROTAMA = {
  id: 'korotama',
  name: 'コロガンナー',
  color: '#8a9098',
  sprites: {
    body: { palette: KORO_PAL, rows: [
      '....ssssssssss....',
      '.mmmmmmmmmmmmmmmm.',
      'mmmmmmmmmmmmmmmmmm',
      'gjjjjjjjjjjjjjjjjg',
      'ggggjggggggggjgggg',
      '.gggjggggggggjggg.',
      '..ggjggggggggjgg..',
      '...ffffffffffff...',
    ] },
    dome: { palette: KORO_PAL, rows: [
      '...ssss...',
      '..mmmmmm..',
      '.mmmmmmmm.',
      '.mmmmmmmm.',
      'mmmmmmmmmm',
      '.kkkkkkkk.',
    ] },
    pod: { palette: KORO_PAL, rows: [
      'mmmmmm',
      'mggkkg',
      'mggkkg',
      'mggggg',
      'ffffff',
    ] },
    cannon: { palette: KORO_PAL, rows: [
      '.mmmmmmmm...',
      'mmggggggkkkg',
      'mmggggggkkkg',
      '.ffffffff...',
    ] },
    core: { palette: KORO_PAL, rows: [
      '.pppppp.',
      'gkkkkkkg',
      'gkkkcckg',
      'gkkkkkkg',
      'ffffffff',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'dome', tex: 'dome', ox: 0, oy: -7 },
    { role: 'podL', tex: 'pod', ox: -9, oy: 0.5, mirror: true },
    { role: 'podR', tex: 'pod', ox: 9, oy: 0.5 },
    { role: 'cannon', tex: 'cannon', ox: 0, oy: 5 },
    { role: 'core', tex: 'core', ox: 0, oy: 4.5 },
  ],
};

// 2. 小+ボス「ジェットバイパー」＝飛行機/ジェット戦闘機型（機首を下＝プレイヤー側へ・後退翼）。円鋸カッター。
//    パーツ：fuselage(機体・機首下向き) / wing(後退翼・左右) / thruster(尾部エンジン炎) / cannon(機首カッター射出口) / core(コックピット単眼)。
// R20: texf文法で再設計＋色ラウンドで配色決定。設計意図は vortex/scratchpad/boss-v-jetviper-final.mjs のNOTES参照。
const JET_PAL = { k: '#151018', j: '#231a27', f: '#2c1f32', g: '#482e55', m: '#6e3f85', s: '#edbc97', c: '#1dff12' };
export const JETVIPER = {
  id: 'jetviper',
  name: 'ジェットバイパー',
  color: '#2a6bff',
  sprites: {
    body: { palette: JET_PAL, rows: [
      '...mmff...',
      '..mmmmff..',
      '.jjjjjjjj.',
      'mmmmmmmmff',
      'mmmmmmmmff',
      'mmmmmmmmff',
      'mmmmmmmmff',
      'mmmmmmmmff',
      'mmmmmmmmff',
      'kkmmmmmmkk',
      'kkmmmmmmkk',
      '.jjjjjjjj.',
      '.mmmmmmff.',
      '..mmmmff..',
      '..mmmmff..',
      '...mmff...',
    ] },
    wing: { palette: JET_PAL, rows: [
      'ggggg.......',
      'ggggggg.....',
      'ggggggggm...',
      'ggggggggmmm.',
      'ggggggggmmmm',
      '.gggggggkkmm',
      '..ggggggkkmm',
      '....ggggmmmm',
      '......ggmmmm',
      '........mmmm',
    ] },
    thruster: { palette: JET_PAL, rows: [
      'ssss',
      'mkkm',
      'mkkm',
      'mkkm',
      'mggm',
      'ffff',
    ] },
    cannon: { palette: JET_PAL, rows: [
      '.mmm....',
      'mmmm.cc.',
      'mggkckkc',
      'mggkckkc',
      'mmmm.cc.',
      '.fff....',
    ] },
    core: { palette: JET_PAL, rows: [
      'ssssss',
      'kkkkkk',
      'mkkckf',
      'mkkckf',
      'mkkkkf',
      'mggggf',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'wingL', tex: 'wing', ox: -6, oy: 1, mirror: true },
    { role: 'wingR', tex: 'wing', ox: 6, oy: 1 },
    { role: 'thruster', tex: 'thruster', ox: 0, oy: -8 },
    { role: 'cannon', tex: 'cannon', ox: 0, oy: 9, origin: [0.125, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: -2 },
  ],
};

// 3. 中ボス「ウズバルカン」＝4足歩行/多脚砲台型（甲虫状の車体＋4本脚）。背部にバルカン砲塔。
//    パーツ：body(甲虫車体) / leg(角ばった脚・4本をミラー配置) / cannon(背部バルカン砲塔) / core(前部単眼)。phase2「ぶちギレ」。
// R20: texf文法で再設計＋色ラウンドで配色決定。設計意図は vortex/scratchpad/boss-v-uzuking-final.mjs のNOTES参照。
const UZU_PAL = { k: '#18110b', j: '#281a10', f: '#3b2616', g: '#804920', m: '#be641f', s: '#a3b5c7', p: '#58361b', c: '#ff3d00' };
export const UZUKING = {
  id: 'uzuking',
  name: 'ウズバルカン',
  color: '#e8720c',
  sprites: {
    body: { palette: UZU_PAL, rows: [
      '..ssssssssssss..',
      '.mmmmmmmmmmmmmm.',
      'mmmmmmmmmmmmmmmm',
      '.mmkkkkkkkkkkmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '.mmggggggggggmm.',
      '..mmkkkkkkkkmm..',
    ] },
    core: { palette: UZU_PAL, rows: [
      'mmmmmmmmmm',
      'ppkkkkkkpp',
      'gkkcckkkkg',
      'gkkcckkkkg',
      'ffffffffff',
    ] },
    cannon: { palette: UZU_PAL, rows: [
      '.sssssssssss.',
      '.mmmmmmmmkkkm',
      '.mmmmjjjjjjjm',
      '.mccmmmmmkkkm',
      '.mmmmjjjjjjjm',
      '.mmmmmmmmkkkm',
      '..ggggggggggg',
    ] },
    legf: { palette: UZU_PAL, rows: [
      'gmmmm..',
      'gmmmm..',
      'kkkkk..',
      '.gmmmm.',
      '.gmmmm.',
      '.gmmmm.',
      '.gmmmm.',
      '.kkkkk.',
      '.mmmmmm',
      '.mmmmmm',
      '.kkkkkk',
    ] },
    legb: { palette: UZU_PAL, rows: [
      'ggg.',
      'ggg.',
      'kkk.',
      '.ggg',
      '.ggg',
      '.ggg',
      '.ggg',
      '.kkk',
      '.ggg',
      '.kkk',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'qlegBL', tex: 'legb', ox: -4, oy: 2.5, mirror: true },
    { role: 'qlegBR', tex: 'legb', ox: 4, oy: 2.5 },
    { role: 'qlegFL', tex: 'legf', ox: -9, oy: 3.5, mirror: true },
    { role: 'qlegFR', tex: 'legf', ox: 9, oy: 3.5 },
    { role: 'cannon', tex: 'cannon', ox: 1, oy: -6.5, origin: [0.15384615384615385, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: 1.5 },
  ],
};

// 4. 中+ボス「ウェイブロード」＝キャタピラ/戦車型（低く幅広の車体＋左右履帯＋巨大波動主砲）。
//    パーツ：body(戦車ハル) / track(履帯・左右) / cannon(前方へ伸びる極太波動砲＝照準回転) / core(砲塔前面の単眼ビューポート)。phase2「かくせい」。
// R20: texf文法で再設計＋色ラウンドで配色決定。設計意図は vortex/scratchpad/boss-v-wavelord-final.mjs のNOTES参照。
const WAVE_PAL = { k: '#0e1219', j: '#141b26', f: '#192434', g: '#264065', m: '#3060a2', s: '#e6ab7e', p: '#203149', c: '#a8f0ff' };
export const WAVELORD = {
  id: 'wavelord',
  name: 'ウェイブロード',
  color: '#38e1ff',
  sprites: {
    body: { palette: WAVE_PAL, rows: [
      'gssssssssssssssssf',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'jjjjjjjjjjjjjjjjjj',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'gmmmmmmmmmmmmmmmmf',
      'jjjjjjkkkkkkjjjjjj',
      '..kkkkkkkkkkkkkk..',
    ] },
    track: { palette: WAVE_PAL, rows: [
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
      'kkkkkk',
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
      'kkkkkk',
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
      'mmmmmm',
    ] },
    cannon: { palette: WAVE_PAL, rows: [
      '............ssss',
      'fggjggggggggjkkm',
      'fggjggggccggjkkm',
      'fggjggggccggjkkm',
      'fffjffffffffjkkm',
      '............gggg',
    ] },
    core: { palette: WAVE_PAL, rows: [
      '.pppppppp.',
      'kkkkkkcckk',
      'kkkkkkcckk',
      '.kkkkkkkk.',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'trackL', tex: 'track', ox: -9, oy: 0, mirror: true },
    { role: 'trackR', tex: 'track', ox: 9, oy: 0 },
    { role: 'cannon', tex: 'cannon', ox: 0, oy: 3, origin: [0.125, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: -3 },
  ],
};

// 5. 大ボス「ミサイルガ」＝ミサイルキャリア型（低く幅広の車体＋上部に多連ミサイルポッド＋左右ホバー脚）。
//    上記4型（UFO/戦闘機/多脚/戦車）と被らせない。パーツ：body(車体) / rack(4連ミサイルポッド＝予告で上昇) /
//    base(左右ホバー/車輪ユニット) / cannon(前部バルカン＝照準) / core(前部単眼)。phase2「ぶちギレ」。
// R20: texf文法で再設計＋色ラウンドで配色決定。設計意図は vortex/scratchpad/boss-v-missilga-final.mjs のNOTES参照。
const MIS_PAL = { k: '#0f1219', f: '#232a36', g: '#86492a', m: '#b0a79c', s: '#b5c5db', c: '#ff4d4d' };
export const MISSILGA = {
  id: 'missilga',
  name: 'ミサイルガ',
  color: '#e8720c',
  sprites: {
    body: { palette: MIS_PAL, rows: [
      'fkkkkkkkkkkkkkkkkkkf',
      'fkkkkkkkkkkkkkkkkkkf',
      'fkkkkkkkkkkkkkkkkkkf',
      'fssssssssssssssssssf',
      'fggggggggggggggggggf',
      'mmmmmggggggggggmmmmm',
      'mkkmmggggggggggmmmmm',
      'mkkmmggggggggggmmmmm',
      'kkkkkkkkkkkkkkkkkkkk',
      'mmmmmmmmmmmmmmmmmmmm',
    ] },
    rack: { palette: MIS_PAL, rows: [
      'mssssssssssssssssm',
      'mgggmgggmmgggmgggm',
      'mkkkmkkkmmkkkmkkkm',
      'mkckmkckmmkckmkckm',
      'mkkkmkkkmmkkkmkkkm',
      'mkkkmkkkmmkkkmkkkm',
      'mgggmgggmmgggmgggm',
      'mgggmgggmmgggmgggm',
      'mfffmfffmmfffmfffm',
      'kkkkkkkkkkkkkkkkkk',
      'gggggggggggggggggg',
      'ffffffffffffffffff',
    ] },
    base: { palette: MIS_PAL, rows: [
      'ffffffffffffffff',
      'mmmmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmmmm',
      'kkkkkkkkkkkkkkgg',
      'ggmmmgggggmmmggg',
      'ggmmmgggggmmmggg',
      'ggmmmgggggmmmggg',
      'kkkkkkkkkkkkkkkk',
    ] },
    cannon: { palette: MIS_PAL, rows: [
      'ffffffffff',
      'mmmmkkkkkm',
      'mmmmmmmmmm',
      'mmmmkkkkkm',
      'gggggggggg',
    ] },
    core: { palette: MIS_PAL, rows: [
      'gggggggggg',
      'gffffffffg',
      'gkkkkkkkkg',
      'gkkkkkcckg',
      'kkkkkkkkkk',
      'mmmmmmmmmm',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'baseL', tex: 'base', ox: -7, oy: 7, mirror: true },
    { role: 'baseR', tex: 'base', ox: 7, oy: 7 },
    { role: 'rack', tex: 'rack', ox: 0, oy: -8 },
    { role: 'cannon', tex: 'cannon', ox: 6, oy: 1.5, origin: [0.1, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: 2 },
  ],
};

// 6. 最終ボス「マオウレクス」＝大型2足歩行メカ型（唯一の人型＝王者）。金冠・広い肩・厚い胴・2腕2脚。最大サイズ。
//    他5体を非人型にしたことで、重厚な人型シルエットが際立つ。パーツ：body(冠付き頭＋胸胴) / core(頭部の単眼バイザー) /
//    armR(重装甲アーム＋拳・左右ミラー) / leg(大足・左右ミラー) / cannon(肩/胸のレーザー砲＝照準)。亜空間レーザー。
// ラスボスの威厳＝ダークガンメタル(w)本体＋深紅の炉心(r)＋シルバー縁(s)で締める重厚配色（白ロボから脱却）。
// 濃淡3段：s(明シルバー縁)＞w(ガンメタル本体)＞k(近黒の影)。金冠(y)とシアン炉心(c)は威厳/エネルギーのアクセントとして残す。
// R20: texf文法（14体合議で確定・recの逆説＝質感は面の整理）で再設計＋色ラウンドで「深紅×黒鋼」に確定。
// 設計意図は vortex/scratchpad/maou-v-final.mjs（塗り）・maou-v-texf.mjs（骨格）のNOTES参照。
const MAOU_PAL = { k: '#0b0808', j: '#120c0d', f: '#1d1012', g: '#3a1d20', m: '#a1182a', s: '#edac86', c: '#38e1ff', r: '#e5202c', d: '#7a141c', y: '#c8860f', S: '#a1182a', M: '#3a1d20', F: '#1a222e', p: '#291618' };
export const MAOU = {
  id: 'maou',
  name: 'マオウレクス',
  color: '#e03028',
  sprites: {
    body: { palette: MAOU_PAL, rows: [
      '..SSS..SSSS..SSS..',
      '..MMM..MMMM..MMM..',
      '..MMMMMMMMMMMMMF..',
      '..MMMMMMMMMMMMMF..',
      '..MMMMMMMMMMMMMF..',
      '..MMMMMMMMMMMMMF..',
      'MMMMMMMMMMMMMMMMMF',
      'Mkkkkkkkkkkkkkkkkk',
      'ssssssssssssssssss',
      'mmmmggggggggggmmmf',
      'mmmmfkkrrrrkkfmmmf',
      'mmmmfkrrrrrrkfmmmf',
      'mmmmfkrddddrkfmmmf',
      'mmmmfkkddddkkfmmmf',
      'mmmmfkkkkkkkkfmmmf',
      '.mmmmmmmmmmmmmmmf.',
      '.mjjjjjjjjjjjjjjf.',
      '..mkkkkkkkkkkkff..',
    ] },
    core: { palette: MAOU_PAL, rows: [
      '..SSSSSSSSSS..',
      '.pppkkkkkkppp.',
      'MMMkkkkkkkkMMF',
      'MMMkkkkkcckkMF',
      '.MMkkkkkkkkkM.',
      '..MMFFFFFFFF..',
    ] },
    pauldron: { palette: MAOU_PAL, rows: [
      '.ssssssss.',
      'mmmmmmmmmc',
      'mmkkkmmmmc',
      'mmkkkmmmmc',
      'mmmmmmmmgf',
      '..kkkkkkkk',
    ] },
    cellpod: { palette: MAOU_PAL, rows: [
      'mkkmkkmkkf',
      'mkkmkkmkkf',
      '.ssssssss.',
      'mmmmmmmmmc',
      'mmkkkmmmmc',
      'mmkkkmmmmc',
      'mmmmmmmmgf',
      '..kkkkkkkf',
    ] },
    arm: { palette: MAOU_PAL, rows: [
      '.sssss.',
      '.mmmmf.',
      '.mmkmf.',
      '.jjkjj.',
      '.kkckk.',
      '.jjkjj.',
      '.mmkmf.',
      '.mmkmf.',
      '.mmkmf.',
      'sssssss',
      'mmyykcc',
      'mmyykcc',
      'kgggkcc',
    ] },
    cannon: { palette: MAOU_PAL, rows: [
      '.sssssssssss',
      'mmmmmmmmkkkm',
      'mmkkmmmckkkm',
      'mmkkmmmckkkm',
      'mmmmmmmmkkkm',
      '.gggggggggg.',
    ] },
    leg: { palette: MAOU_PAL, rows: [
      '.gmmmmmm....',
      '.gmmmmmm....',
      '.gmmmmmm....',
      '.gmmmmmm....',
      '.kkkkkkkk...',
      '..gmmmmmm...',
      '..gmmmmmm...',
      '..gmmmmmm...',
      '..kkkkkkkkk.',
      '..mmmmkkmmmm',
      '..mmmmkkmmmm',
      '..mmmmmmmmmm',
      '..kkkkkkkkkk',
    ] },
  },
  rig: [
    { role: 'body', tex: 'body', ox: 0, oy: 0 },
    { role: 'legL', tex: 'leg', ox: -6, oy: 8, mirror: true },
    { role: 'legR', tex: 'leg', ox: 6, oy: 8 },
    { role: 'podL', tex: 'cellpod', ox: -9, oy: -5, mirror: true },
    { role: 'podR', tex: 'pauldron', ox: 9, oy: -4 },
    { role: 'armL', tex: 'arm', ox: -11, oy: -2, mirror: true, origin: [0.5, 0.1] },
    { role: 'armR', tex: 'arm', ox: 11, oy: -2, origin: [0.5, 0.1] },
    { role: 'cannon', tex: 'cannon', ox: 7, oy: -5, origin: [0.12, 0.5] },
    { role: 'core', tex: 'core', ox: 0, oy: -4 },
  ],
};

// 出現順（小→final）。Boot/validate はこの配列を走査してテクスチャ生成・検証する。
export const BOSSES = [KOROTAMA, JETVIPER, UZUKING, WAVELORD, MISSILGA, MAOU];
// 後方互換：単一ボス参照(test-core / 既存コード)は id=uzuking を指す（改名後も id は据え置き）。
export const BOSS = UZUKING;
