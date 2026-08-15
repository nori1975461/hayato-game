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

// プレイヤー3段階。Lv5で player_2・Lv10で player_3 へテクスチャ差し替え。
// R15（SPEC§24）: 正典§22に合わせて「生身の少年＋ゆりかごの腕」へ全面再設計した。
// R11〜R12の軍事的パワードスーツ（突撃兵）は破棄。少年は兵士ではない。
//
// 設計の核（この4点は仕様であり、崩すと正典と矛盾する）：
//  1. **成長するのは腕だけ**。少年の体・服・顔・背丈は3段階を通じて完全に同一。強くなるのは
//     本人ではなく、壊れた「ゆりかごの腕」が本来の形へ戻っていくから（＝変身＝腕の復元）。
//  2. **装甲色は敵マキナと同系**（g/s＝同じゆりかご艦隊の製造物なので当然）。両者を分けるのは
//     「熱の光が漏れているか」だけ。敵は戦時改修で温かさを密閉されたので光らない（＝サムイ）。
//  3. **左右非対称**。守り手が入れた心臓はひとつなので、心臓を抱えた側（画面左）の腕だけが
//     関節から金(c)の熱を漏らし、反対側は素のスチール(s)で光らない。モビットが寄る理由でもある。
//  4. **服は戦闘服ではない**。ゆりかごで着せられた簡素な白い衣(w)と素足(f)。明るい衣は
//     背景(#0a0a1e)に対する視認性も最良で、R12bの「主人公が背景に沈む」問題を素材から解く。
//
// 腕の被覆は**前腕型（肘から先）**で固定（ユーザー選択）。肩まで覆わないので、Stage3でも
// 「機械に飲まれた戦士」ではなく「腕を借りている少年」に見える。段階差は肩へ伸ばすのではなく
// **前腕の充填量・厚み・放熱の開き方**で作る（Stage1=手首だけ→2=前腕半ば→3=肘までびっしり）。
export const PLAYER_SPRITES = [
  // ⚠️ キャンバスは 16×18 → 20×18 → 24×18。**高さと少年の画素は3段とも完全に同一**で、
  // 幅が広がるのは腕がせり出すぶんだけ。画面上の拡大率も段階で変えない（Run.js は全段 scale 3.0）＝
  // 「彼は成長しない。戻ってくるのは腕だけ」を、比喩ではなくデータの事実として持たせている。
  //
  // R15b: 当初は3段とも16×18にしていたが、Stage1→2の差分が全画素の8.6%（10ドット）しかなく
  // シルエットも不変のため「レベルアップが実感できない」（実プレイFB）。人間が一瞬で認識するのは
  // 色の増減ではなく**輪郭の変化**なので、腕を横へ伸ばして幅48→60→72pxの段差を作った。
  // 守り手の腕は大人の機械の腕＝少年本人より大きいのが本来の姿（正典§22とより整合する）。
  //
  // Stage1(Lv1-4): 手首から先だけの「かけら」。拾い集めた破片を嵌めているだけで、ほぼ素手。
  {
    palette: {
      w: '#e8e4d8', // ゆりかごの白い衣（最も明るい＝背景に沈まないための主面積）
      f: '#f0c8a0', // 肌（顔・上腕・素足）
      k: '#7a5a3c', // 髪（暗すぎると背景#0a0a1eに溶けるので明るめの茶）
      e: '#2a2028', // 目
      g: '#55647c', // ゆりかごの腕の装甲（＝敵マキナと同系色。違いは光るかどうかだけ）
      s: '#cfe0f2', // スチール（光らない側の腕のエッジ。ここが立たないと右腕が背景に消える）
      c: '#ffd23f', // 守り手の心臓が漏らす金の熱（左腕のみ＝心臓はひとつ）
      h: '#ff8a1f', // 熱の内側（金から装甲へのグラデ）
    },
    rows: [
      '......kkkk......',
      '.....kkkkkk.....',
      '.....kffffk.....',
      '.....feffef.....',
      '......ffff......',
      '.....wwwwww.....',
      '....fwwwwwwf....',
      '....fwwwwwwf....',
      '....gwwwwwwg....',
      '..chgwwwwwwgss..',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '.....wwwwww.....',
      '.....ww..ww.....',
      '.....ff..ff.....',
      '.....ff..ff.....',
      '.....ff..ff.....',
      '....fff..fff....',
    ],
  },
  // Stage2(Lv5-9): 肩から下が戻る（20×18）。R15c: ユーザー決定で被覆を前腕型→**肩から下**へ拡大。
  // 造形の文法（モダンに見せる3点・SPEC§24.6）：
  //  ①肩当て(パウルドロン)が張り→肘で絞り→拳で再び開く「くびれ」シルエット（塊/ミトン禁止）
  //  ②輪郭に斜めの段差を作る（水平垂直だけだと鈍重）
  //  ③心臓の金(c)が肩から拳へ1本の筋で流れる（装飾ではなく §22 の熱漏れ＝縫い目）
  {
    palette: {
      w: '#e8e4d8', f: '#f0c8a0', k: '#7a5a3c', e: '#2a2028',
      g: '#55647c', s: '#cfe0f2', c: '#ffd23f', h: '#ff8a1f',
      d: '#232c3d', // 関節の継ぎ目（暗色は装甲の内側だけ＝外縁に使うと背景に溶ける）
    },
    rows: [
      '........kkkk........',
      '.......kkkkkk.......',
      '.......kffffk.......',
      '.......feffef.......',
      '........ffff........',
      '.......wwwwww.......',
      '..ssssgwwwwwwgssss..',
      '..sggggwwwwwwggggs..',
      '..sggg.wwwwww.gggs..',
      '..sddg.wwwwww.gdds..',
      '..sggg.wwwwww.gggs..',
      '..cchg.wwwwww.gsss..',
      '...chg.wwwwww.gss...',
      '.......ww..ww.......',
      '.......ff..ff.......',
      '.......ff..ff.......',
      '.......ff..ff.......',
      '......fff..fff......',
    ],
  },
  // Stage3(Lv10+): 守り手の腕の完全な形（24×18・拳の行はキャンバス幅いっぱい＝72px）。
  // 肩当ては首の横まで立ち上がり、肘で強く絞れ、こぶしは少年の頭より大きい＝
  // かつてポッドを抱きとめた大人の機械の腕を、12歳がそのまま着けている。
  // それでも頭・胴・脚は生身のまま＝最後まで「腕を借りている少年」に見える。
  {
    palette: {
      w: '#e8e4d8', f: '#f0c8a0', k: '#7a5a3c', e: '#2a2028',
      g: '#55647c', s: '#cfe0f2', c: '#ffd23f', h: '#ff8a1f',
      d: '#232c3d', // 関節の継ぎ目（暗色は装甲の内側だけ）
    },
    rows: [
      '..........kkkk..........',
      '.........kkkkkk.........',
      '.........kffffk.........',
      '.........feffef.........',
      '..........ffff..........',
      '.ssssss..wwwwww..ssssss.',
      '.sgggggggwwwwwwgggggggs.',
      '.sgggggggwwwwwwgggggggs.',
      '.scgggg..wwwwww..gggggs.',
      '.scgggg..wwwwww..gggggs.',
      '.sddggg..wwwwww..gggdds.',
      '.cchhgg..wwwwww..ggssss.',
      '..chhgg..wwwwww..ggsss..',
      '.........ww..ww.........',
      '.........ff..ff.........',
      '.........ff..ff.........',
      '.........ff..ff.........',
      '........fff..fff........',
    ],
  },
];

// 互換用: 単数の PLAYER_SPRITE は Stage1 を指す（既存参照を壊さない）。
export const PLAYER_SPRITE = PLAYER_SPRITES[0];

// R14（SPEC§22）: 銃は全廃した（主人公は近接のみ。旧 HERO_GUNS は削除）。
// 遠い敵への手当てはワイヤーアーム（Stage2解放・Run.js updateHeroWire）が拳のまま担う。

// R12: 主人公の主武器＝クラッシュアーム（殴る瞬間だけ拳を前方へ突き出す）。
// 全て右向き＝打撃面(v/金)が +X 側。Run.js が狙い角へ setRotation し、殴りの一瞬だけ表示する
// （常時出すと画面が拳だらけになるので、パンチのモーション中だけ可視）。
// 熱(h)の部分は連撃ヒートに応じて実行時に tint を明るくするので、素は暗めのオレンジで描く。
// 段が上がるほど腕が長く太くなる（Stage1 小型ガントレット→2 パワーアーム→3 巨大破砕アーム）。
export const HERO_FISTS = [
  // Stage1: 小型ガントレット。8×6。
  {
    palette: { g: '#55647c', h: '#ff8a1f', v: '#ffd23f' },
    rows: [
      '..gghhh.',
      '.gghhhhh',
      'ggghhhhv',
      'ggghhhhv',
      '.gghhhhh',
      '..gghhh.',
    ],
  },
  // Stage2: パワーアーム（腕が伸び、打撃面が広がる）。12×8。
  {
    palette: { g: '#55647c', h: '#ff8a1f', v: '#ffd23f' },
    rows: [
      '...gggghhhh.',
      '..gggghhhhhh',
      '.ggggghhhhhv',
      'gggggghhhhvv',
      'gggggghhhhvv',
      '.ggggghhhhhv',
      '..gggghhhhhh',
      '...gggghhhh.',
    ],
  },
  // Stage3: 巨大破砕アーム（金のパワーリング入り・打撃面が最大）。16×10。
  {
    palette: { g: '#55647c', h: '#ff8a1f', v: '#ffd23f', o: '#ffd23f' },
    rows: [
      '....ggggghhhhh..',
      '..gggggghhhhhhh.',
      '.gggggggghhhhhhv',
      'ggggoogghhhhhhvv',
      'ggggoogghhhhhhvv',
      'ggggoogghhhhhhvv',
      'ggggoogghhhhhhvv',
      '.gggggggghhhhhhv',
      '..gggggghhhhhhh.',
      '....ggggghhhhh..',
    ],
  },
];
