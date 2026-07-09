// ============================================================
// HAYATO GAME - 360度回転武器アクション
// 操作: 矢印キー（またはWASD）= 移動 / スペース = 必殺技（ゲージ満タン時）
//       Mキー = おんがくON/OFF / タイトルで C = いろかえ, N = なまえ
// 武器はスコアで30段階進化（ナイフ→…→ライトセーバー）
// ステージは全20種、ボスは神話の神々20体
// 5ステージごとに「けっさん」→ ゴールドで おみせ（防具10種）
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 480
const H = canvas.height;  // 360

// ---------- ドット絵スプライト定義 ----------
const PALETTE = {
  B: '#29366f', // 濃い青
  b: '#3b5dc9', // 青
  C: '#41a6f6', // 水色
  W: '#f4f4f4', // 白
  Y: '#ffcd75', // 黄
  O: '#ef7d57', // オレンジ
  R: '#b13e53', // 赤
  G: '#38b764', // 緑
  g: '#257179', // 深緑
  P: '#5d275d', // 紫
  p: '#8b4f8b', // 明るい紫
  K: '#1a1c2c', // 黒
  M: '#ff77a8', // ピンク
  S: '#94b0c2', // 銀
  T: '#a77b5b', // 茶（砂・革）
  D: '#73eff7', // 氷の水色
  L: '#566c86', // 濃いグレー
  N: '#333c57', // 暗い紺
};

const RAINBOW = ['#ffcd75', '#ff77a8', '#41a6f6', '#38b764', '#ef7d57', '#f4f4f4'];

const SPRITES = {
  // ===== プレイヤー（武器レベルで見た目が6段階進化） =====
  player: [
    '..KKKK..',
    '.KYYYYK.',
    '.KYKYKY.',
    '.KYYYYK.',
    '..CCCC..',
    '.CCCCCC.',
    '.KC..CK.',
    '.KK..KK.',
  ],
  player1: [ // せんし: 赤いバンダナ
    '..RRRR..',
    '.KYYYYK.',
    '.KYKYKY.',
    '.KYYYYK.',
    '..CCCC..',
    '.CCCCCC.',
    '.KC..CK.',
    '.KK..KK.',
  ],
  player2: [ // ナイト: 銀のかぶと
    '..SSSS..',
    '.SSSSSS.',
    '.SKYYKS.',
    '.SYYYYS.',
    '..CCCC..',
    '.SCCCCS.',
    '.KC..CK.',
    '.KK..KK.',
  ],
  player3: [ // ゴールドナイト: 金のよろい
    '..YYYY..',
    '.YYYYYY.',
    '.YKYYKY.',
    '.YYYYYY.',
    '..CCCC..',
    '.YCCCCY.',
    '.KC..CK.',
    '.YY..YY.',
  ],
  player4: [ // ひかりのせんし: 白銀に光る
    '..WWWW..',
    '.WWWWWW.',
    '.WKYYKW.',
    '.WYYYYW.',
    '.WCCCCW.',
    'WCCCCCCW',
    '.KC..CK.',
    '.WW..WW.',
  ],
  player5: [ // でんせつのゆうしゃ: 金＋白のつばさ
    '..YYYY..',
    'WYYYYYYW',
    'WYKYYKYW',
    '.YYYYYY.',
    'W.CCCC.W',
    'WCCCCCCW',
    '.KC..CK.',
    '.YY..YY.',
  ],
  enemy: [
    '........',
    '..PPPP..',
    '.PPPPPP.',
    'PPWKWKPP',
    'PPPPPPPP',
    'P.PPPP.P',
    '..P..P..',
    '.PP..PP.',
  ],
  enemyFast: [
    '........',
    '..RRRR..',
    '.RRRRRR.',
    'RRWKWKRR',
    'RRRRRRRR',
    'R.RRRR.R',
    '..R..R..',
    '.RR..RR.',
  ],
  enemyTank: [
    '.GGGGGG.',
    'GGGGGGGG',
    'GWKGGWKG',
    'GGGGGGGG',
    'GGgggggG',
    'GGGGGGGG',
    'G.G..G.G',
    'GG.GG.GG',
  ],
  heart: [
    '.MM.MM.',
    'MMMMMMM',
    'MMMMMMM',
    '.MMMMM.',
    '..MMM..',
    '...M...',
  ],
  // ===== 神話ボス（32x32・漫画風キャラデザ） =====
  // ヤマタノオロチ: 3つの蛇頭＋とぐろを巻いた胴体（ヒュドラは色ちがい）
  orochi: [
    '..gGGg....................gGGg..',
    '.gGGGGg..................gGGGGg.',
    '.GRKGGG....gGGGGg........GGGKRG.',
    '.GGGGGG...gGGGGGGg......GGGGGG..',
    '.GWGGG...gGGGGGGGGg.....GGGGWG..',
    '..GGG....GGRKGGKRGG......GGGG...',
    '..gGG....GGGGGGGGGG......GGg....',
    '...gGG...GWGGGGGGWG.....GGg.....',
    '....gGG..GGGGGGGGGG....GGg......',
    '.....gGG..GGGGGGGG....GGg.......',
    '......gGG..gGGGGg....GGg........',
    '.......gGG..GGGG....GGg.........',
    '........gGG.GGGG...GGg..........',
    '.........gGGGGGG..GGg...........',
    '..........gGGGGGGGGg............',
    '...........GGGGGGGG.............',
    '..........GGGGGGGGGG............',
    '.........GGGGGGGGGGGG...........',
    '........GGGGgggGGGGGGG..........',
    '.......GGGGgggggGGGGGGG.........',
    '......GGGGgggggggGGGGGGG........',
    '.....GGGGgggggggggGGGGGG........',
    '....GGGGgggggggggggGGGGGG.......',
    '....GGGGgggggggggggGGGGGGG......',
    '....GGGGGgggggggggGGGGGGGG......',
    '.....GGGGGgggggggGGGGGGGG.......',
    '......GGGGGgggggGGGGGGGG........',
    '.......GGGGGGGGGGGGGGG..........',
    '........GGGGGGGGGGGGGGG.........',
    '..........GGGGGGGGGGGGGG........',
    '.............GGGGGGGGGGGG.......',
    '................GGGGGGGgg.......',
  ],
  // ハデス: 燃える炎の髪＋影の落ちた顔＋赤く光る目＋ボロボロの黒マント
  hades: [
    '..........O..Y....O.............',
    '.......Y..OO.YY..OO..Y..........',
    '......OO.OOOOYYOOOO.OO..........',
    '.....OOOOOYYYYYYYYOOOOO.........',
    '......OOYYYYYYYYYYYYOO..........',
    '.......OYYYYYYYYYYYYO...........',
    '.......SSSSSSSSSSSSSS...........',
    '.......SSKKKKKKKKKKSS...........',
    '.......SKKRRKKKKRRKKS...........',
    '.......SSKKKKKKKKKKSS...........',
    '.......SSSSSSSSSSSSSS...........',
    '.......SSSSKKKKKKSSSS...........',
    '......PPSSSSSSSSSSSSPP..........',
    '.....PPPPSSSSSSSSSSPPPP.........',
    '....PPPPPPPPPPPPPPPPPPPP........',
    '...PPKKKKKKKKKKKKKKKKKKPP.......',
    '...PKKKKKKKKKKKKKKKKKKKKP.......',
    '..PPKKKKKKKOOOOKKKKKKKKKPP......',
    '..PKKKKKKKOOYYOOKKKKKKKKKP......',
    '..PKKKKKKKOYYYYOKKKKKKKKKP......',
    '..PKKKKKKKOOYYOOKKKKKKKKKP......',
    '..PKKKKKKKKOOOOKKKKKKKKKKP......',
    '..PKKKKKKKKKKKKKKKKKKKKKKP......',
    '..PKKKKKKKKKKKKKKKKKKKKKKP......',
    '..PPKKKKKKKKKKKKKKKKKKKKPP......',
    '...PKKKKKKKKKKKKKKKKKKKKP.......',
    '...PPKKKKKKKKKKKKKKKKKKPP.......',
    '....PKKKKKKKKKKKKKKKKKKP........',
    '....PPKKKKKKKKKKKKKKKKPP........',
    '....PKKKKK..KKKK..KKKKKP........',
    '....PKKK.....KK.....KKKP........',
    '....PK.......K........KP........',
  ],
  // ゼウス: 黄金の月桂冠＋長い白髭＋胸に紋章の黄金鎧＋掲げた大きな稲妻
  zeus: [
    '....Y...Y...Y...Y...Y.....YY....',
    '....YYYYYYYYYYYYYYYYY....YY.....',
    '.....SSSSSSSSSSSSSS.....YYY.....',
    '....SSSSSSSSSSSSSSSS.....YY.....',
    '....SSYYYYYYYYYYYYSS....YY......',
    '....SYYYYYYYYYYYYYYS...YYY......',
    '....SYYKCYYYYYYCKYYS....YY......',
    '....SYYYYYYYYYYYYYYS...YY.......',
    '....SYYYWWWWWWWWYYYS..YYY.......',
    '.....WWWWWWWWWWWWWW...YY........',
    '.....WWWWWWWWWWWWWW..YY.........',
    '......WWWWWWWWWWWW...YYY........',
    '......WWWWWWWWWWWW....YY........',
    '.......WWWWWWWWWW....YY.........',
    '...bbbYYYYYYYYYYYYbbbYY.........',
    '..bbbbYYYWWWWWWYYYbbbb..........',
    '..bbbYYYYYWWWWYYYYYbbb..........',
    '..bbYYYYYYYCCYYYYYYYbb..........',
    '..bbYYYYYYCCCCYYYYYYbb..........',
    '..bbYYYYYYYCCYYYYYYYbb..........',
    '..bbbYYYYYYYYYYYYYYbbb..........',
    '...bbYYYYYYYYYYYYYYbb...........',
    '...bbbYYYYYYYYYYYYbbb...........',
    '....bbYYYYYYYYYYYYbb............',
    '....bbbWWWWWWWWWWbbb............',
    '.....bbWWWWWWWWWWbb.............',
    '.....bWWWWWWWWWWWWb.............',
    '.....WWWWWWWWWWWWWW.............',
    '.....WWWWW....WWWWW.............',
    '.....WWWW......WWWW.............',
    '.....WWW........WWW.............',
    '.....WW..........WW.............',
  ],
  // ロキ: 大きく曲がった金の角＋ニヤリと笑う口元＋緑の鎧×紫のマント
  loki: [
    '...YY..................YY.......',
    '..YYY..................YYY......',
    '..YY....................YY......',
    '..YY..GGGGGGGGGGGG......YY......',
    '..YYY.GGGGGGGGGGGG.....YYY......',
    '...YYGGGGGGGGGGGGGG...YYY.......',
    '....YGGGGGGGGGGGGGGY..YY........',
    '.....GGYYYYYYYYYYGG.............',
    '.....GYYKKYYYYKKYYG.............',
    '.....GYYYYYYYYYYYYG.............',
    '.....GYYYYKKKKKYYYG.............',
    '......YYYYYYKKYYYY..............',
    '....ppGGGGGGGGGGGGpp............',
    '...pppGGGGGGGGGGGGppp...........',
    '..ppppGGGYYGGYYGGGpppp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '..ppGGGGGYYYYYYGGGGGpp..........',
    '..ppGGGGGGGGGGGGGGGGpp..........',
    '..ppGGGGGGGGGGGGGGGGpp..........',
    '..pppGGGGGGGGGGGGGGppp..........',
    '...ppGGGGGGGGGGGGGGpp...........',
    '...pppGGGGGGGGGGGGppp...........',
    '....ppGGGGGGGGGGGGpp............',
    '....ppgGGGGGGGGGGgpp............',
    '.....pgggGGGGGGgggp.............',
    '.....pggg..gg..gggp.............',
    '.....pgg...gg...ggp.............',
    '.....pg....gg....gp.............',
    '......p....gg....p..............',
    '...........gg...................',
    '................................',
  ],
  // オーディン: 翼付き兜＋隻眼（右目に眼帯）＋長い白髭＋槍グングニル
  odin: [
    '...........SSSSSS..........Y....',
    '..........SSSSSSSS.........YY...',
    '..WW......SSSSSSSS.........S....',
    '..WWW....SSSSSSSSSS........S....',
    '..WWWW...SSSSSSSSSS........S....',
    '...WWWW..SSSSSSSSSS........S....',
    '....WWW...SSSSSSSS.........S....',
    '..........YYYYYYYY.........S....',
    '..........YCKYYKKY.........S....',
    '..........YYYYYYYY.........S....',
    '.........WWYYYYYYWW........S....',
    '.........WWWWWWWWWW........S....',
    '........WWWWWWWWWWWW.......S....',
    '........WWWWWWWWWWWW.......S....',
    '.......WWWWWWWWWWWWWW......S....',
    '.......WWWWWWWWWWWWWW......S....',
    '........WWWWWWWWWWWW.......S....',
    '......YYYYWWWWWWWWYYYY.....S....',
    '.....YYYYYWWWWWWWWYYYYY....S....',
    '....YYYYYYWWWWWWWWYYYYYY...SY...',
    '....YYYYYYYWWWWWWYYYYYYY...SY...',
    '....YYYYYYYYWWWWYYYYYYYY...S....',
    '....YYYYYYYYYYYYYYYYYYYY...S....',
    '....YYYYYYYYYYYYYYYYYYYY...S....',
    '.....WWWWYYYYYYYYYYWWWW....S....',
    '.....WWWWWYYYYYYYYWWWWW....S....',
    '......WWWWWWWWWWWWWWWW.....S....',
    '......WWWWWWWWWWWWWWWW.....S....',
    '......WWWWW......WWWWW.....S....',
    '......WWWW........WWWW..........',
    '......WWW..........WWW..........',
    '......WW............WW..........',
  ],
  // フェンリル: 巨大な銀色の狼。赤い目＋牙をむき出した大きな口
  fenrir: [
    '.....SS..................SS.....',
    '....SSSS................SSSS....',
    '....SSSS................SSSS....',
    '...SSSSSSSSSSSSSSSSSSSSSSSSSS...',
    '..SSSSSSSSSSSSSSSSSSSSSSSSSSSS..',
    '..SSSSSSSSSSSSSSSSSSSSSSSSSSSS..',
    '..SSRRSSSSSSSSSSSSSSSSSSSSRRSS..',
    '..SRRRSSSSSSSSSSSSSSSSSSSSRRRS..',
    '..SSRRSSSSSSSSSSSSSSSSSSSSRRSS..',
    '...SSSSSSSSSSSSSSSSSSSSSSSSSS...',
    '....SSSSSSSSSSKKKKSSSSSSSSSS....',
    '....SSSSSSSSSSKKKKSSSSSSSSSS....',
    '.....SSSSSSSSSSSSSSSSSSSSSS.....',
    '.....SKWKWKWKWKWKWKWKWKWKWS.....',
    '.....SKKKKKKKKKKKKKKKKKKKKS.....',
    '......SWKWKWKWKWKWKWKWKWKS......',
    '......SSSSWWWWWWWWWWWWSSSS......',
    '.....SSSSSWWWWWWWWWWWWSSSSS.....',
    '.....SSSSSSWWWWWWWWWWSSSSSS.....',
    '....SSSSSSSSWWWWWWWWSSSSSSSS....',
    '....SSSSSSSSSWWWWWWSSSSSSSSS....',
    '....SSSSSSSSSSSSSSSSSSSSSSSS....',
    '....SSSS..SSSS....SSSS..SSSS....',
    '....SSS...SSS......SSS...SSS....',
    '....KKK...KKK......KKK...KKK....',
  ],
  // フウジン: 風の神。白い風袋をかつぐ緑の鬼＋金の角
  fujin: [
    '......WWWWWWWWWWWWWWWWWWWW......',
    '....WWWWWWWWWWWWWWWWWWWWWWWW....',
    '...WWWW..................WWWW...',
    '...WWW....................WWW...',
    '...WWW....YY......YY......WWW...',
    '...WWW...GGGGGGGGGGGG.....WWW...',
    '...WWWW..GGGGGGGGGGGG....WWWW...',
    '...WWW...GKKGGGGGGKKG.....WWW...',
    '...WWW...GGWWKKKKWWGG.....WWW...',
    '...WWWW..GGGGGGGGGGGG....WWWW...',
    '......GGGGGGGGGGGGGGGGGGGG......',
    '.....GGGGGGGGGGGGGGGGGGGGGG.....',
    '.....GGYYGGGGGGGGGGGGGGYYGG.....',
    '.....GGGGGGGGGGGGGGGGGGGGGG.....',
    '.....GGGGGGGKKKKKKKKGGGGGGG.....',
    '.....GGGGGGGGGGGGGGGGGGGGGG.....',
    '......GGGGGGGGGGGGGGGGGGGG......',
    '.......GGGG..........GGGG.......',
    '.......GGG............GGG.......',
    '.......KKK............KKK.......',
  ],
  // ポセイドン: 海の王。金の冠＋水色のひげ＋黄金のトライデント
  poseidon: [
    '.........................W.Y.W..',
    '.........................WWYWW..',
    '...........................Y....',
    '.......YYYYYYYYYY..........Y....',
    '.......WWWWWWWWWW..........Y....',
    '.......WKKWWWWKKW..........Y....',
    '.......WWWWWWWWWW..........Y....',
    '......CCWWWWWWWWCC.........Y....',
    '......CCCCCCCCCCCC.........Y....',
    '......CCCCCCCCCCCC.........Y....',
    '.......CCCCCCCCCC..........Y....',
    '........CCCCCCCC......WWWWWY....',
    '......bbbbbbbbbbbb.........Y....',
    '.....bbbbbbbbbbbbbb........Y....',
    '.....bbbbCCCCCCbbbb........Y....',
    '.....bbbbbbbbbbbbbb........Y....',
    '.....bbbbbbbbbbbbbb........Y....',
    '......bbbbbbbbbbbb.........Y....',
    '......bbbbbbbbbbbb.........Y....',
    '.......bbbbbbbbbb..........Y....',
    '.......bbb....bbb..........Y....',
    '.......KKK....KKK..........Y....',
  ],
  // メデューサ: 蛇の髪の魔女。赤く光る目＋紫のローブ＋蛇の下半身
  medusa: [
    '...GG...GG....GG....GG...GG.....',
    '..GG..GG..GG..GG..GG..GG..GG....',
    '...GGGGGGGGGGGGGGGGGGGGGGGG.....',
    '..GGGGGGGGGGGGGGGGGGGGGGGGGG....',
    '....GGGWWWWWWWWWWWWWWWWGGG......',
    '....GGGWWRRWWWWWWWWRRWWGGG......',
    '....GGGWWWWWWWWWWWWWWWWGGG......',
    '....GGGWWWWWKKKKKKWWWWWGGG......',
    '.....GGWWWWWWWWWWWWWWWWGG.......',
    '......PPPPPPPPPPPPPPPPPP........',
    '.....PPPPPPPPPPPPPPPPPPPP.......',
    '.....PPPPPPPPPPPPPPPPPPPP.......',
    '..GG.PPPPPPPPPPPPPPPPPPPP.GG....',
    '..GG.PPPPPPPPPPPPPPPPPPPP.GG....',
    '...G.PPPPPPPPPPPPPPPPPPPP.G.....',
    '.....PPPPPPPPPPPPPPPPPPPP.......',
    '.....PPPPPPPPPPPPPPPPPPPP.......',
    '......PPPPPPPPPPPPPPPPPP........',
    '.......GGGGGGGGGGGGGGGG.........',
    '........GGGGGGGGGGGGGG..........',
    '..........GGGGGGGGGGGG..........',
    '.............GGGGGGGGG..........',
  ],
  // アヌビス: 黒いジャッカルの頭＋金の首かざり＋砂色の体
  anubis: [
    '........KKK..........KKK........',
    '........KKKK........KKKK........',
    '........KKKK........KKKK........',
    '........KKKKKKKKKKKKKKKK........',
    '.......KKKKKKKKKKKKKKKKKK.......',
    '.......KKYYKKKKKKKKKKYYKK.......',
    '.......KKKKKKKKKKKKKKKKKK.......',
    '.........KKKKKKKKKKKK...........',
    '...........KKKKKKKK.............',
    '.......YYYYYYYYYYYYYYYYYY.......',
    '......YYYYYYYYYYYYYYYYYYYY......',
    '.......TTTTTTTTTTTTTTTTTT.......',
    '.......TTTTTTTTTTTTTTTTTT.......',
    '.......TTTYYYYYYYYYYYYTTT.......',
    '.......TTTTTTTTTTTTTTTTTT.......',
    '........TTTTTTTTTTTTTTTT........',
    '........TTTT........TTTT........',
    '........TTT..........TTT........',
    '........KKK..........KKK........',
  ],
  // スフィンクス: 人の顔＋金の頭かざり＋ライオンの体＋白いつばさ
  sphinx: [
    '...........YYYYYYYYYY...........',
    '..........YYYYYYYYYYYY..........',
    '..........YYWWWWWWWWYY..........',
    '..........YYWKWWWWKWYY..........',
    '..........YYWWWWWWWWYY..........',
    '..........YYYWWWWWWYYY..........',
    '.........YYYYYYYYYYYYYY.........',
    '........YYYYYYYYYYYYYYYY........',
    '......TTTTTTTTTTTTTTTTTTTT......',
    '.....TTTTTTTTTTTTTTTTTTTTTT.....',
    '....TTTTTTTTTTTTTTTTTTTTTTTT....',
    '....TTTTTTTTTTTTTTTTTTTTTTTT....',
    '..WWTTTTTTTTTTTTTTTTTTTTTTTTWW..',
    '..WWWTTTTTTTTTTTTTTTTTTTTTTWWW..',
    '...WWTTTTTTTTTTTTTTTTTTTTTTWW...',
    '....TTTTTTTTTTTTTTTTTTTTTTTT....',
    '....TTTT..TTTT....TTTT..TTTT....',
    '....TTT...TTT......TTT...TTT....',
    '....YYY...YYY......YYY...YYY....',
  ],
  // スルト: 炎の巨人。黒い体に炎のひび＋燃えさかる大剣
  surtr: [
    '........O..Y..O..Y..........OO..',
    '.......OOYYOOYYOOYY.........OOO.',
    '.......OOOOOOOOOOOO.........YYY.',
    '.......KKKKKKKKKKKK.........YYY.',
    '.......KKOOKKKKOOKK..........Y..',
    '.......KKKKKKKKKKKK..........Y..',
    '.......KKKOROROKKKK..........Y..',
    '.....KKKKKKKKKKKKKKKK........Y..',
    '....KKKKKKKKKKKKKKKKKK.......Y..',
    '....KKKORKKKKKKKROKKKK.......Y..',
    '....KKKKORKKKKKROKKKKK......YYY.',
    '....KKKKKKKKKKKKKKKKKKKKKKK.YYY.',
    '....KKKKKKKKKKKKKKKKKK....OOOOO.',
    '.....KKKKKKKKKKKKKKKK.....OOOOO.',
    '.....KKKKKKKKKKKKKKKK.....ORRRO.',
    '.....KKKKKKKKKKKKKKKK.....ORRRO.',
    '......KKKKKKKKKKKKKK......OOOOO.',
    '......KKKK....KKKK........OOOOO.',
    '......KKKK....KKKK.........OOO..',
    '......KKK......KKK.........OOO..',
    '.....KKKK......KKKK.........O...',
  ],
  // ユミル: 氷の巨人。氷のトゲの冠＋白いひげ＋氷のよろい
  ymir: [
    '.....D..D...D...D...D..D........',
    '......DDDDDDDDDDDDDDDDDDDD......',
    '......CCCCCCCCCCCCCCCCCCCC......',
    '......CCWWCCCCCCCCCCCCWWCC......',
    '......CCCCCCCCCCCCCCCCCCCC......',
    '....WWCCCCCCCCCCCCCCCCCCCCWW....',
    '....WWWWWWWWWWWWWWWWWWWWWWWW....',
    '....WWWWWWWWWWWWWWWWWWWWWWWW....',
    '.....WWWWWWWWWWWWWWWWWWWWWW.....',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
    '..CCDDCCCCCCCCCCCCCCCCCCCCDDCC..',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
    '..CCCCCCCCDDDDDDDDDDCCCCCCCCCC..',
    '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '....CCCCCCCCCCCCCCCCCCCCCCCC....',
    '.....CCCCCC..........CCCCCC.....',
    '.....CCCCC............CCCCC.....',
    '.....DDDDD............DDDDD.....',
  ],
  // ゆきおんな: 白いきもの＋長い黒髪＋青ざめた顔
  yukionna: [
    '.........KKKKKKKKKKKKKK.........',
    '........KKKKKKKKKKKKKKKK........',
    '........KKWWWWWWWWWWWWKK........',
    '........KKWWCKWWWWKCWWKK........',
    '........KKWWWWWRRWWWWWKK........',
    '........KKWWWWWWWWWWWWKK........',
    '.......KKWWWWWWWWWWWWWWKK.......',
    '......KKWWCCWWWWWWWWCCWWKK......',
    '......KKWWWWWWWWWWWWWWWWKK......',
    '......KK.WWWWWWWWWWWWWW.KK......',
    '......KK.WWWWWWWWWWWWWW.KK......',
    '......K..WWCCCCCCCCCCWW..K......',
    '.........WWWWWWWWWWWWWW.........',
    '.........WWWWWWWWWWWWWW.........',
    '........WWWWWWWWWWWWWWWW........',
    '........WWWWWWWWWWWWWWWW........',
    '.......WWWWWWWWWWWWWWWWWW.......',
    '.......WWWWWWWWWWWWWWWWWW.......',
    '......CCWWWWWWWWWWWWWWWWCC......',
    '......CCCCCCCCCCCCCCCCCCCC......',
  ],
  // クラーケン: 紫の大ダコ。金色の目＋うねる触手
  kraken: [
    '..........PPPPPPPPPPPP..........',
    '........PPPPPPPPPPPPPPPP........',
    '.......PPPPPPPPPPPPPPPPPP.......',
    '......PPPPPPPPPPPPPPPPPPPP......',
    '......PPYYYYPPPPPPPPYYYYPP......',
    '......PPYKKYPPPPPPPPYKKYPP......',
    '......PPYYYYPPPPPPPPYYYYPP......',
    '......PPPPPPPPPPPPPPPPPPPP......',
    '.......PPPPPPPWWWWPPPPPPP.......',
    '.......PPPPPPPPPPPPPPPPPP.......',
    '.....PPP.PPP.PPP.PPP.PPP.PPP....',
    '.....PPP.PPP.PPP.PPP.PPP.PPP....',
    '.....ppp.ppp.ppp.ppp.ppp.ppp....',
    '....ppp..ppp...ppp...ppp..ppp...',
    '...ppp...ppp....ppp...ppp..ppp..',
  ],
  // エンマだいおう: 赤い顔＋黒いひげ＋金の冠＋暗い着物
  enma: [
    '.........YYYYYYYYYYYYYY.........',
    '.........YYYYKKYYKKYYYY.........',
    '.........YYYYYYYYYYYYYY.........',
    '........RRRRRRRRRRRRRRRR........',
    '........RKKKRRRRRRRRKKKR........',
    '........RWWKRRRRRRRRKWWR........',
    '........RRRRRRRRRRRRRRRR........',
    '........RKKKKKRRRRKKKKKR........',
    '........RRKKKKKKKKKKKKRR........',
    '.........KKKKKKKKKKKKKK.........',
    '.........KKKKKKKKKKKKKK.........',
    '......NNNNNNNNNNNNNNNNNNNN......',
    '.....NNNNNNNNNNNNNNNNNNNNNN.....',
    '.....NNYYNNNNNNNNNNNNNNYYNN.....',
    '.....NNNNNNNNNNNNNNNNNNNNNN.....',
    '.....NNNNNNNYYYYYYYYNNNNNNN.....',
    '.....NNNNNNNNNNNNNNNNNNNNNN.....',
    '......NNNNNNNNNNNNNNNNNNNN......',
    '......NNNNNNNNNNNNNNNNNNNN......',
    '.......NNNNN......NNNNN.........',
    '.......NNNN........NNNN.........',
  ],
  // アマテラス: 太陽の女神。金の光輪＋黒髪＋白と赤の巫女すがた
  amaterasu: [
    '....Y....Y.....Y.....Y....Y.....',
    '.......YYYYYYYYYYYYYYYYYY.......',
    '.......YYKKKKKKKKKKKKKKYY.......',
    '......YYKKKKKKKKKKKKKKKKYY......',
    '.......YKKWWWWWWWWWWWWKKY.......',
    '.......YKKWWKWWWWWWKWWKKY.......',
    '.......YKKWWWWWRRWWWWWKKY.......',
    '........KKWWWWWWWWWWWWKK........',
    '.......KKWWWWWWWWWWWWWWKK.......',
    '......KK.WWWWWWWWWWWWWW.KK......',
    '.........WWRRWWWWWWRRWW.........',
    '.........WWWWWWWWWWWWWW.........',
    '......WWWWWWWWWWWWWWWWWWWW......',
    '.....WWWWWWWWWWWWWWWWWWWWWW.....',
    '......RRRRRRRRRRRRRRRRRRRR......',
    '......RRRRRRRRRRRRRRRRRRRR......',
    '.......RRRRRRRRRRRRRRRRRR.......',
    '.......RRRRRRRRRRRRRRRRRR.......',
    '........RRRRR......RRRRR........',
  ],
  // トール: 翼のかぶと＋赤いひげ＋青い服＋ハンマー「ミョルニル」
  thor: [
    '..W.......SSSSSS.......W........',
    '.WWW.....SSSSSSSS.....WWW.......',
    '.WWWW....SSSSSSSS....WWWW.......',
    '..WW....SSSSSSSSSSSS....WW......',
    '..........WWWWWWWWWWWW..........',
    '..........WWKWWWWWWKWW..........',
    '.........RRWWWWWWWWWWRR.........',
    '.........RRRRRRRRRRRRRR.........',
    '..........RRRRRRRRRRRR..........',
    '..SSSS....bbbbbbbbbbbb..........',
    '..SSSSSS..bbbbbbbbbbbbbb........',
    '..SSSSSSTTbbbbbbbbbbbbbb........',
    '..SSSSSS..bbbbbbbbbbbbbb........',
    '..SSSS....bbbbbbbbbbbbbb........',
    '..........bbbYYYYYYYYbbb........',
    '..........bbbbbbbbbbbbbb........',
    '..........bbbb....bbbb..........',
    '..........bbb......bbb..........',
    '..........KKK......KKK..........',
  ],
  // クロノス: 時の魔神。暗いフードの巨人＋光る時のコア＋大鎌
  chronos: [
    '......................SSSSSSSS..',
    '.....................SSSSSSSSSS.',
    '.....................SS......SS.',
    '.......................S........',
    '.........NNNNNNNNNNNN..S........',
    '........NNNNNNNNNNNNNN.S........',
    '........NNDDNNNNNNDDNN.S........',
    '........NNNNNNNNNNNNNN.S........',
    '.......NNNNNNNNNNNNNNNNS........',
    '......NNNNNNNNNNNNNNNN.S........',
    '......NNNNNNDDDDNNNNNN.S........',
    '......NNNNNDDDDDDNNNNN.S........',
    '......NNNNNNDDDDNNNNNN.S........',
    '......NNNNNNNNNNNNNNNN.S........',
    '......NNNNNNNNNNNNNNNN.S........',
    '......PPPPPPPPPPPPPPPP.S........',
    '.......PPPPPPPPPPPPPP..S........',
    '........PPPPPPPPPPPP...S........',
    '........PP.PPP.PPP.PP...S.......',
  ],
};

// remap: 特定パレット文字の色を差し替える（服の色・ボスの色ちがい用）
function drawSprite(name, x, y, scale = 3, remap = null) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      ctx.fillStyle = (remap && remap[ch]) || PALETTE[ch];
      ctx.fillRect(px + col * scale, py + row * scale, scale, scale);
    }
  }
}

// ---------- キャラカスタマイズ ----------
const OUTFITS = [
  { name: 'みずいろ', hex: '#41a6f6' },
  { name: 'あか',     hex: '#b13e53' },
  { name: 'みどり',   hex: '#38b764' },
  { name: 'ピンク',   hex: '#ff77a8' },
  { name: 'ゴールド', hex: '#ffcd75' },
];
let outfitIdx = Number(localStorage.getItem('hayato-outfit') || 0) % OUTFITS.length;
let playerName = localStorage.getItem('hayato-name') || '';

function playerRemap() {
  return { C: OUTFITS[outfitIdx].hex };
}

// 武器レベルで見た目が進化（5レベルごと）
const FORMS = [
  { sprite: 'player',  name: 'ぼうけんしゃ' },
  { sprite: 'player1', name: 'せんし' },
  { sprite: 'player2', name: 'ナイト' },
  { sprite: 'player3', name: 'ゴールドナイト' },
  { sprite: 'player4', name: 'ひかりのせんし' },
  { sprite: 'player5', name: 'でんせつのゆうしゃ' },
];

// ---------- 武器の進化テーブル（30段階） ----------
// blades: 刃の本数 / dmg: 1振りのダメージ / kind: 見た目の種類
// flame: 火の玉 / lightning: 雷連鎖 / ice: 凍らせる / rainbow: 虹色 / saber: 光る刃
// shoot: 飛び道具 {kind, interval, speed, dmg, count, pierce, aoe, aim}
const WEAPONS = [
  { name: 'ナイフ',             score: 0,     len: 34, width: 3,  spin: 0.090, blades: 1, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: 'こんぼう',           score: 250,   len: 40, width: 9,  spin: 0.110, blades: 1, dmg: 1, color: '#a77b5b', edge: '#8a5c3b', kind: 'club', knock: 24 },
  { name: '剣',                 score: 600,   len: 42, width: 5,  spin: 0.100, blades: 1, dmg: 1, color: '#f4f4f4', edge: '#94b0c2' },
  { name: 'パチンコ',           score: 1000,  len: 30, width: 4,  spin: 0.100, blades: 1, dmg: 1, color: '#a77b5b', edge: '#f4f4f4', kind: 'sling',
    shoot: { kind: 'pellet', interval: 26, speed: 4.0, dmg: 1, count: 3 } },
  { name: '槍',                 score: 1500,  len: 58, width: 4,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#ef7d57', kind: 'spear' },
  { name: 'はんげつとう',       score: 2100,  len: 46, width: 8,  spin: 0.120, blades: 1, dmg: 1, color: '#f4f4f4', edge: '#ffcd75', kind: 'scimitar' },
  { name: 'ブーメラン',         score: 2800,  len: 36, width: 5,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#a77b5b', kind: 'boomer',
    shoot: { kind: 'boomerang', interval: 40, speed: 4.5, dmg: 1, pierce: true } },
  { name: 'てつぼう',           score: 3600,  len: 70, width: 7,  spin: 0.120, blades: 1, dmg: 1, color: '#566c86', edge: '#94b0c2', kind: 'club', knock: 24 },
  { name: 'ゆみ',               score: 4500,  len: 34, width: 4,  spin: 0.110, blades: 1, dmg: 1, color: '#a77b5b', edge: '#f4f4f4', kind: 'bow',
    shoot: { kind: 'arrow', interval: 22, speed: 6.0, dmg: 1, pierce: true, aim: true } },
  { name: 'ダブルナイフ',       score: 5500,  len: 38, width: 3,  spin: 0.115, blades: 2, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '大剣',               score: 6600,  len: 52, width: 10, spin: 0.140, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4' },
  { name: 'モーニングスター',   score: 7800,  len: 56, width: 5,  spin: 0.160, blades: 1, dmg: 2, color: '#566c86', edge: '#94b0c2', kind: 'chain', ballR: 11, knock: 22 },
  { name: '大槍',               score: 9100,  len: 74, width: 8,  spin: 0.140, blades: 1, dmg: 1, color: '#38b764', edge: '#ffcd75', kind: 'spear' },
  { name: 'みつまたのほこ',     score: 10500, len: 66, width: 6,  spin: 0.140, blades: 1, dmg: 2, color: '#ffcd75', edge: '#f4f4f4', kind: 'trident' },
  { name: '炎の剣',             score: 12000, len: 60, width: 9,  spin: 0.130, blades: 1, dmg: 1, color: '#ef7d57', edge: '#ffcd75', flame: true },
  { name: 'ジャベリン',         score: 13600, len: 62, width: 5,  spin: 0.125, blades: 1, dmg: 2, color: '#94b0c2', edge: '#ffcd75', kind: 'spear',
    shoot: { kind: 'javelin', interval: 42, speed: 5.0, dmg: 2 } },
  { name: 'クロスボウ',         score: 15300, len: 36, width: 5,  spin: 0.120, blades: 1, dmg: 1, color: '#566c86', edge: '#a77b5b', kind: 'bow',
    shoot: { kind: 'arrow', interval: 13, speed: 7.0, dmg: 1, aim: true } },
  { name: '雷の槍',             score: 17100, len: 78, width: 5,  spin: 0.145, blades: 1, dmg: 1, color: '#ffcd75', edge: '#f4f4f4', lightning: true, kind: 'spear' },
  { name: 'てっきゅう',         score: 19000, len: 60, width: 6,  spin: 0.150, blades: 1, dmg: 3, color: '#333c57', edge: '#566c86', kind: 'chain', ballR: 14, knock: 26 },
  { name: '氷の大剣',           score: 21000, len: 64, width: 11, spin: 0.145, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4', ice: true },
  { name: 'トリプルソード',     score: 23100, len: 58, width: 7,  spin: 0.130, blades: 3, dmg: 1, color: '#f4f4f4', edge: '#41a6f6' },
  { name: 'マシンガン',         score: 25300, len: 34, width: 5,  spin: 0.130, blades: 1, dmg: 1, color: '#333c57', edge: '#94b0c2', kind: 'gun',
    shoot: { kind: 'bullet', interval: 7, speed: 6.5, dmg: 1, aim: true } },
  { name: 'ゴールデンソード',   score: 27600, len: 70, width: 12, spin: 0.155, blades: 1, dmg: 3, color: '#ffcd75', edge: '#f4f4f4' },
  { name: 'たいほう',           score: 30000, len: 38, width: 9,  spin: 0.130, blades: 1, dmg: 2, color: '#333c57', edge: '#566c86', kind: 'cannon',
    shoot: { kind: 'cannonball', interval: 55, speed: 3.2, dmg: 3, aoe: 42, aim: true } },
  { name: '虹の剣',             score: 32500, len: 72, width: 9,  spin: 0.150, blades: 2, dmg: 3, rainbow: true, color: '#f4f4f4', edge: '#f4f4f4' },
  { name: 'カイザーブレード',   score: 35100, len: 76, width: 13, spin: 0.160, blades: 1, dmg: 4, color: '#ffcd75', edge: '#8b4f8b' },
  { name: 'レーザーブラスター', score: 37800, len: 36, width: 5,  spin: 0.140, blades: 1, dmg: 1, color: '#566c86', edge: '#73eff7', kind: 'gun',
    shoot: { kind: 'laser', interval: 9, speed: 8.0, dmg: 2, pierce: true, aim: true } },
  { name: 'ドラゴンキラー',     score: 40600, len: 76, width: 11, spin: 0.150, blades: 1, dmg: 4, color: '#b13e53', edge: '#ef7d57', flame: true },
  { name: 'エクスカリバー',     score: 43500, len: 84, width: 11, spin: 0.160, blades: 3, dmg: 4, rainbow: true, flame: true, lightning: true, color: '#f4f4f4', edge: '#ffcd75' },
  { name: 'ライトセーバー',     score: 46500, len: 82, width: 7,  spin: 0.170, blades: 2, dmg: 5, saber: true, color: '#73eff7', edge: '#f4f4f4' },
];

function weaponForScore(s) {
  let idx = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    if (s >= WEAPONS[i].score) idx = i;
  }
  return idx;
}

// ---------- ステージ（全20。ボスを倒すと進む） ----------
// deco: 地面のかざり / fx: 天気・環境エフェクト
const STAGES = [
  { name: 'だいそうげん',     bg: '#2b5a30', dot: '#4a8f52', deco: 'grass',   fx: 'petal' },
  { name: 'ジャングル',       bg: '#1c421f', dot: '#357a3c', deco: 'jungle',  fx: 'leaf' },
  { name: 'しっちたい',       bg: '#3c4526', dot: '#5f6b35', deco: 'swamp',   fx: 'bubble' },
  { name: 'あらしのへいげん', bg: '#2e3d4d', dot: '#46586b', deco: 'storm',   fx: 'rain' },
  { name: 'みずうみ',         bg: '#1d4e6b', dot: '#2f7ba3', deco: 'lake',    fx: 'ripple' },
  { name: 'ちていこ',         bg: '#132f3a', dot: '#215a66', deco: 'cave',    fx: 'drip' },
  { name: 'さばく',           bg: '#6b562c', dot: '#8f7a45', deco: 'desert',  fx: 'sand' },
  { name: 'こだいいせき',     bg: '#474156', dot: '#6b6480', deco: 'ruins',   fx: 'dust' },
  { name: 'かざん',           bg: '#46201a', dot: '#7a3a2a', deco: 'volcano', fx: 'ember' },
  { name: 'ようがんのうみ',   bg: '#571c0e', dot: '#963415', deco: 'lava',    fx: 'ember2' },
  { name: 'ひょうざん',       bg: '#2b5876', dot: '#4f8cb0', deco: 'iceberg', fx: 'snow' },
  { name: 'こおりのせかい',   bg: '#1f3c5e', dot: '#3b6ea5', deco: 'iceworld', fx: 'aurora' },
  { name: 'うみのせかい',     bg: '#0f3350', dot: '#1d5a80', deco: 'sea',     fx: 'bubble2' },
  { name: 'まかい',           bg: '#241631', dot: '#5d275d', deco: 'makai',   fx: 'miasma' },
  { name: 'じごく',           bg: '#380d12', dot: '#7d1c26', deco: 'hell',    fx: 'hellfire' },
  { name: 'てんかい',         bg: '#3d6a92', dot: '#6fa3c9', deco: 'heaven',  fx: 'feather' },
  { name: 'うちゅう',         bg: '#191b2b', dot: '#3b5dc9', deco: 'space',   fx: 'star' },
  { name: 'ぎんが',           bg: '#241a3d', dot: '#5d4a8a', deco: 'galaxy',  fx: 'gstar' },
  { name: 'ブラックホール',   bg: '#0c0c13', dot: '#26263a', deco: 'hole',    fx: 'warp' },
  { name: 'たじげんうちゅう', bg: '#2a1030', dot: '#7a2a8a', deco: 'multi',   fx: 'dimension' },
];
const LAST_STAGE = STAGES.length; // 20

function currentStage() {
  return STAGES[Math.min(stage, LAST_STAGE) - 1];
}

// ---------- ステージごとのボス（神話の神々20体） ----------
// pattern: aim=狙い撃ち / wide=広範囲 / ring=全方向 / mix=交互 / spiral=螺旋
// shot: 投げるものの見た目 / gimmicks: split=分裂 rage=激怒 speed=高速化
//        summon=仲間よび shield=盾ガード weakpoint=弱点コア
// melee: punch=突進パンチ tail=しっぽ回転 stomp=ジャンプ踏みつけ dive=急降下体当たり
const BOSS_TYPES = [
  { name: 'ヤマタノオロチ', origin: 'にほんしんわ',   sprite: 'orochi',    aura: '#38b764', pattern: 'aim',    shot: 'ball',
    gimmicks: [],                    melee: ['tail'] },
  { name: 'フェンリル',     origin: 'ほくおうしんわ', sprite: 'fenrir',    aura: '#94b0c2', pattern: 'aim',    shot: 'fang',
    gimmicks: ['speed'],             melee: ['punch'], ballColors: ['#f4f4f4', '#94b0c2', '#f4f4f4'] },
  { name: 'ヒュドラ',       origin: 'ギリシャしんわ', sprite: 'orochi',    aura: '#8b4f8b', pattern: 'wide',   shot: 'snake',
    gimmicks: ['split'],             melee: ['tail'], remap: { G: '#8b4f8b', g: '#5d275d', R: '#ffcd75' }, ballColors: ['#38b764', '#8b4f8b', '#38b764'] },
  { name: 'フウジン',       origin: 'にほんしんわ',   sprite: 'fujin',     aura: '#73eff7', pattern: 'ring',   shot: 'wind',
    gimmicks: ['speed'],             melee: ['dive'], ballColors: ['#73eff7', '#f4f4f4', '#73eff7'] },
  { name: 'ポセイドン',     origin: 'ギリシャしんわ', sprite: 'poseidon',  aura: '#41a6f6', pattern: 'mix',    shot: 'trident',
    gimmicks: ['summon'],            melee: ['stomp'], hpMul: 1.1, ballColors: ['#41a6f6', '#ffcd75', '#41a6f6'] },
  { name: 'メデューサ',     origin: 'ギリシャしんわ', sprite: 'medusa',    aura: '#38b764', pattern: 'spiral', shot: 'snake',
    gimmicks: ['weakpoint'],         melee: ['punch'], ballColors: ['#38b764', '#8b4f8b', '#38b764'] },
  { name: 'アヌビス',       origin: 'エジプトしんわ', sprite: 'anubis',    aura: '#ffcd75', pattern: 'aim',    shot: 'light',
    gimmicks: ['shield'],            melee: ['stomp'], ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'] },
  { name: 'スフィンクス',   origin: 'エジプトしんわ', sprite: 'sphinx',    aura: '#ffcd75', pattern: 'wide',   shot: 'light',
    gimmicks: ['shield'],            melee: ['dive'], hpMul: 1.1, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'] },
  { name: 'ハデス',         origin: 'ギリシャしんわ', sprite: 'hades',     aura: '#ef7d57', pattern: 'wide',   shot: 'ball',
    gimmicks: ['rage'],              melee: ['punch'], hpMul: 1.15 },
  { name: 'スルト',         origin: 'ほくおうしんわ', sprite: 'surtr',     aura: '#ef7d57', pattern: 'mix',    shot: 'ball',
    gimmicks: ['rage'],              melee: ['stomp', 'punch'], hpMul: 1.25 },
  { name: 'ユミル',         origin: 'ほくおうしんわ', sprite: 'ymir',      aura: '#73eff7', pattern: 'ring',   shot: 'ice',
    gimmicks: ['shield'],            melee: ['stomp'], hpMul: 1.15, ballColors: ['#73eff7', '#f4f4f4', '#41a6f6'] },
  { name: 'ゆきおんな',     origin: 'にほんしんわ',   sprite: 'yukionna',  aura: '#f4f4f4', pattern: 'spiral', shot: 'ice',
    gimmicks: ['weakpoint'],         melee: ['dive'], ballColors: ['#73eff7', '#f4f4f4', '#41a6f6'] },
  { name: 'クラーケン',     origin: 'ほくおうでんせつ', sprite: 'kraken',  aura: '#8b4f8b', pattern: 'wide',   shot: 'ball',
    gimmicks: ['split'],             melee: ['tail'], hpMul: 1.1, ballColors: ['#5d275d', '#8b4f8b', '#1a1c2c'] },
  { name: 'ロキ',           origin: 'ほくおうしんわ', sprite: 'loki',      aura: '#8b4f8b', pattern: 'mix',    shot: 'sword',
    gimmicks: ['summon', 'speed'],   melee: ['punch', 'dive'], hpMul: 1.15, ballColors: ['#94b0c2', '#f4f4f4', '#94b0c2'] },
  { name: 'エンマだいおう', origin: 'にほんしんわ',   sprite: 'enma',      aura: '#b13e53', pattern: 'ring',   shot: 'ball',
    gimmicks: ['rage'],              melee: ['stomp', 'punch'], hpMul: 1.3 },
  { name: 'ゼウス',         origin: 'ギリシャしんわ', sprite: 'zeus',      aura: '#ffcd75', pattern: 'ring',   shot: 'bolt',
    gimmicks: ['shield'],            melee: ['dive'], hpMul: 1.2, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'] },
  { name: 'アマテラス',     origin: 'にほんしんわ',   sprite: 'amaterasu', aura: '#ffcd75', pattern: 'spiral', shot: 'light',
    gimmicks: ['weakpoint'],         melee: ['stomp'], hpMul: 1.2, ballColors: ['#ffcd75', '#f4f4f4', '#ef7d57'] },
  { name: 'トール',         origin: 'ほくおうしんわ', sprite: 'thor',      aura: '#b13e53', pattern: 'aim',    shot: 'hammer',
    gimmicks: ['rage', 'speed'],     melee: ['punch', 'dive'], hpMul: 1.35, ballColors: ['#94b0c2', '#ffcd75', '#94b0c2'] },
  { name: 'クロノス',       origin: 'ギリシャしんわ', sprite: 'chronos',   aura: '#8b4f8b', pattern: 'spiral', shot: 'scythe',
    gimmicks: ['weakpoint', 'summon'], melee: ['tail', 'stomp'], hpMul: 1.4, ballColors: ['#94b0c2', '#73eff7', '#94b0c2'] },
  { name: 'オーディン',     origin: 'ほくおうしんわ', sprite: 'odin',      aura: '#ffcd75', pattern: 'spiral', shot: 'spear',
    gimmicks: ['rage', 'summon'],    melee: ['punch', 'tail', 'stomp', 'dive'], hpMul: 1.6, points: 5000, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'] },
];

function currentBossType() {
  return BOSS_TYPES[Math.min(stage, LAST_STAGE) - 1];
}

// ---------- おみせ（5ステージごとのけっさん後に開く） ----------
const SHOP_ITEMS = [
  { id: 'heal',     name: 'ライフぜんかいふく',   desc: 'ハートが まんたんに もどる',            price: 200,  repeat: true },
  { id: 'armor',    name: 'てつのよろい',         desc: '20%で こうげきを ガードする',           price: 800 },
  { id: 'helm',     name: 'ゆうしゃのかぶと',     desc: 'さいだいライフが +1 ふえる',            price: 600 },
  { id: 'gauntlet', name: 'ちからのこて',         desc: 'ぶきの かいてんが 15% はやくなる',      price: 500 },
  { id: 'shield',   name: 'まほうのたて',         desc: 'てきのたまを 30%で はじきかえす',       price: 700 },
  { id: 'boots',    name: 'はやてのブーツ',       desc: 'いどうスピードが 20% アップ',           price: 400 },
  { id: 'cloak',    name: 'かげのマント',         desc: 'やられたあとの むてきじかんが 2ばい',   price: 500 },
  { id: 'ring',     name: 'ひっさつのゆびわ',     desc: 'ひっさつゲージが 1.5ばい たまる',       price: 450 },
  { id: 'charm',    name: 'いのちのおまもり',     desc: 'ハートが 2ばい おちやすくなる',         price: 350 },
  { id: 'hagoromo', name: 'てんしのはごろも',     desc: 'やられても コンボが きれない',          price: 600 },
  { id: 'orb',      name: 'ふっかつのたま',       desc: 'ライフ0でも 1かいだけ ふっかつする',    price: 1500 },
];

// ---------- 効果音＆BGM（Web Audio・ファイル不要） ----------
let audioCtx = null;
let musicOn = true;

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* 音が出ない環境でもゲームは動かす */ }
  }
}

function beep(freq, dur, type = 'square', vol = 0.04, slideTo = null, delayMs = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

let quietKills = false; // 必殺技の全滅処理中は個別の撃破音を鳴らさない

const SFX = {
  kill: (combo) => { if (!quietKills) beep(520 + Math.min(combo, 12) * 45, 0.09, 'triangle', 0.055, 950 + combo * 45); },
  hurt: () => beep(140, 0.25, 'sawtooth', 0.06, 50),
  heart: () => { beep(660, 0.08, 'sine', 0.06); beep(990, 0.12, 'sine', 0.06, null, 70); },
  fire: () => beep(300, 0.06, 'triangle', 0.02, 500),
  shoot: () => beep(700, 0.05, 'square', 0.02, 1100),
  boom: () => { beep(90, 0.4, 'sawtooth', 0.08, 40); beep(200, 0.25, 'square', 0.05, 60, 40); },
  bossFire: () => beep(180, 0.3, 'sawtooth', 0.05, 50),
  warn: () => beep(750, 0.16, 'square', 0.05, 480),
  zap: () => beep(1400, 0.08, 'sawtooth', 0.04, 200),
  freeze: () => beep(880, 0.1, 'sine', 0.04, 660),
  guard: () => { beep(1200, 0.05, 'square', 0.05); beep(900, 0.08, 'square', 0.04, 500, 40); },
  plink: () => beep(1500, 0.04, 'triangle', 0.035),
  coin: () => { beep(988, 0.06, 'square', 0.05); beep(1319, 0.14, 'square', 0.05, null, 60); },
  buy: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, 'triangle', 0.05, null, i * 60)),
  buzz: () => beep(160, 0.18, 'sawtooth', 0.05, 120),
  tick: (p) => beep(500 + p * 700, 0.03, 'square', 0.04),
  stomp: () => { beep(70, 0.35, 'sawtooth', 0.1, 30); beep(50, 0.3, 'square', 0.07, 25, 60); },
  dash: () => { beep(1000, 0.22, 'sawtooth', 0.05, 150); beep(500, 0.18, 'square', 0.04, 90, 40); },
  takeoff: () => beep(220, 0.35, 'sine', 0.07, 950),
  giantCharge: () => {
    beep(120, 0.8, 'sawtooth', 0.06, 700);
    beep(80, 0.8, 'square', 0.05, 500, 100);
    beep(1800, 0.5, 'sine', 0.03, 2600, 300);
  },
  giantShot: () => {
    beep(45, 1.1, 'sine', 0.13, 22);          // 地を揺らす重低音
    beep(60, 0.8, 'sawtooth', 0.1, 30);       // うなり
    beep(300, 0.6, 'square', 0.07, 70, 60);   // 炸裂
    beep(1400, 0.45, 'sawtooth', 0.05, 90, 80); // 高音の衝撃
    beep(700, 0.3, 'triangle', 0.05, 120, 150);
  },
  split: () => { beep(800, 0.12, 'triangle', 0.06, 300); beep(600, 0.12, 'triangle', 0.05, 200, 100); },
  summon: () => beep(300, 0.3, 'sine', 0.05, 900),
  rage: () => { beep(80, 0.9, 'sawtooth', 0.1, 45); beep(160, 0.6, 'square', 0.06, 70, 150); },
  special: () => {
    beep(80, 0.7, 'sawtooth', 0.09, 320);
    beep(400, 0.6, 'square', 0.05, 1400, 80);
    [1047, 1319, 1568, 2093].forEach((f, i) => beep(f, 0.2, 'triangle', 0.05, null, 250 + i * 60));
  },
  fanfare: () => {
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => beep(f, 0.12, 'square', 0.05, null, i * 70));
    [1047, 1319, 1568].forEach((f) => beep(f, 0.45, 'triangle', 0.05, null, seq.length * 70));
  },
  bossDie: () => {
    beep(400, 0.5, 'sawtooth', 0.07, 40);
    [784, 988, 1175, 1568].forEach((f, i) => beep(f, 0.15, 'square', 0.05, null, 350 + i * 80));
  },
  roar: () => {
    beep(90, 0.8, 'sawtooth', 0.09, 45);
    beep(60, 0.9, 'square', 0.06, 30, 100);
  },
  clear: () => {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => beep(f, 0.16, 'square', 0.055, null, i * 110));
    [1047, 1319, 1568, 2093].forEach((f) => beep(f, 0.9, 'triangle', 0.05, null, seq.length * 110));
  },
};

// 明るいチップチューンBGM（ステージが進むとキーが上がる）
const BGM_BASS = [48, 48, 55, 48, 45, 45, 52, 45, 41, 41, 48, 41, 43, 43, 50, 43];
const BGM_MELODY = [72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 74, 0, 79, 0, 83, 0];
// ボス戦専用BGM: 荘厳なオルガン風。短調の和音進行（Am→F→Dm→Em）を
// 低音オクターブ重ね＋鐘の音＋太鼓の鼓動で重厚に鳴らす
const BOSS_CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [50, 53, 57], // Dm
  [52, 55, 59], // Em
];
let bossChordIdx = 0;
let musicFrame = 0;
let musicStep = 0;
const midi2f = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tickMusic() {
  if (!audioCtx || !musicOn || paused) return;
  if (state !== 'playing' && state !== 'shop' && state !== 'tally') return;
  if (warningTimer > 0) return; // WARNING中はサイレンだけ響かせる
  musicFrame++;
  if (bossActive && state === 'playing') {
    if (musicFrame % 10 !== 0) return; // ゆったりした重い拍
    const chord = BOSS_CHORDS[bossChordIdx % BOSS_CHORDS.length];
    if (musicStep === 0 || musicStep === 8) {
      // オルガン和音（2オクターブ重ね）＋地を這うベース
      for (const n of chord) {
        beep(midi2f(n), 1.7, 'triangle', 0.02);
        beep(midi2f(n - 12), 1.7, 'sine', 0.02);
      }
      beep(midi2f(chord[0] - 24), 1.7, 'sawtooth', 0.03);
      bossChordIdx++;
    }
    if (musicStep % 4 === 2) {
      // 太鼓の鼓動
      beep(midi2f(chord[0] - 24), 0.18, 'square', 0.035, midi2f(chord[0] - 26));
    }
    if (musicStep === 4 || musicStep === 12) {
      // 高く響く鐘
      beep(midi2f(chord[(musicStep / 4) % 3] + 24), 1.0, 'sine', 0.03);
    }
  } else {
    if (musicFrame % 9 !== 0) return;
    const tr = Math.min((stage - 1), 10);
    const bass = BGM_BASS[musicStep];
    if (bass) beep(midi2f(bass + tr), 0.13, 'square', 0.018);
    const mel = BGM_MELODY[musicStep];
    if (mel) beep(midi2f(mel + tr), 0.1, 'triangle', 0.02);
  }
  musicStep = (musicStep + 1) % 16;
}

// ---------- 入力 ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  initAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'm' || e.key === 'M') musicOn = !musicOn;
  if (state === 'title') {
    if (e.key === 'Enter') startGame();
    if (e.key === 'c' || e.key === 'C') {
      outfitIdx = (outfitIdx + 1) % OUTFITS.length;
      localStorage.setItem('hayato-outfit', String(outfitIdx));
      beep(700, 0.07, 'triangle', 0.05);
    }
    if (e.key === 'n' || e.key === 'N') {
      const input = window.prompt('なまえをいれてね（8もじまで）', playerName);
      if (input !== null) {
        playerName = input.trim().slice(0, 8);
        localStorage.setItem('hayato-name', playerName);
      }
    }
  } else if (state === 'playing') {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    if (!paused && e.key === ' ' && specialGauge >= 100) trySpecial();
  } else if (state === 'tally') {
    if (e.key === 'Enter' || e.key === ' ') {
      if (tally.t < TALLY_COUNT_FRAMES) {
        tally.t = TALLY_COUNT_FRAMES; // カウントをスキップして一気に表示
      } else {
        openShop();
      }
    }
  } else if (state === 'shop') {
    shopInput(e.key);
  } else if (state === 'clear') {
    if (e.key === 'Enter') state = 'title';
  } else if (state === 'gameover') {
    if (e.key === 'Enter' || e.key === ' ') state = 'title';
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// 一時停止ボタン（画面右上）のクリック判定。一時停止中は画面のどこをクリックしても再開
canvas.addEventListener('click', (e) => {
  initAudio();
  if (state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top) * (H / rect.height);
  if (paused) { togglePause(); return; }
  if (mx >= W - 30 && mx <= W - 6 && my >= 26 && my <= 50) togglePause();
});

function togglePause() {
  if (state !== 'playing') return;
  paused = !paused;
  beep(paused ? 400 : 700, 0.08, 'triangle', 0.05);
}

// 必殺技の発動（ボス戦中は同じボス戦で BOSS_SPECIAL_LIMIT 回まで）
function trySpecial() {
  if (bossActive && bossSpecialsUsed >= BOSS_SPECIAL_LIMIT) {
    const pc = playerCenter();
    addPopup(pc.x, pc.y - 24, `ひっさつは 1ボスせんに ${BOSS_SPECIAL_LIMIT}かいまで！`, '#94b0c2', 12);
    SFX.buzz();
    return;
  }
  specialAttack();
}

// ---------- ゲーム状態 ----------
const PLAYER_SIZE = 24;
const ENEMY_SIZE = 24;
const TANK_SIZE = 32;
const BOSS_SIZE = 160;   // ボスは緑の敵の5倍
const TALLY_COUNT_FRAMES = 150;

let state = 'title'; // title / playing / tally / shop / clear / gameover
let gframe = 0;
// 配列はタイトル画面の時点でも参照されるため、必ず初期化しておく
let player;
let enemies = [], particles = [], pshots = [], fireballs = [], items = [], popups = [], bolts = [];
let shockwaves = []; // 広がる衝撃波リング（近接攻撃・巨大弾の演出用）
let score, lives, weaponIdx, formIdx, weaponAngle, frame, spawnTimer, invincibleTimer;
let bannerText, bannerTimer, shakeTimer, flameTimer, shootTimer, flashTimer;
let combo, comboTimer, maxCombo;
let bossActive, nextBossScore, bossCount, warningTimer;
let stage, specialGauge, playerSlowT;
let paused = false;
const BOSS_SPECIAL_LIMIT = 3; // 同じボス戦の中で必殺技を使える回数
let bossSpecialsUsed = 0;
let gold, gear, lastTallyScore, pendingTally, finalClear;
let tally = { t: 0, earned: 0, bonus: 0, total: 0, given: false, cleared: 0 };
let shopIdx = 0;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);

function maxLives() { return 5 + (gear.helm ? 1 : 0); }

function startGame() {
  player = { x: W / 2 - PLAYER_SIZE / 2, y: H / 2 - PLAYER_SIZE / 2, speed: 2.3 };
  enemies = [];
  particles = [];
  pshots = [];
  fireballs = [];
  items = [];
  popups = [];
  bolts = [];
  shockwaves = [];
  score = 0;
  lives = 3;
  weaponIdx = 0;
  formIdx = 0;
  weaponAngle = 0;
  frame = 0;
  spawnTimer = 0;
  invincibleTimer = 0;
  bannerText = '';
  bannerTimer = 0;
  shakeTimer = 0;
  flameTimer = 0;
  shootTimer = 0;
  flashTimer = 0;
  combo = 0;
  comboTimer = 0;
  maxCombo = 0;
  bossActive = false;
  nextBossScore = 3000;
  bossCount = 0;
  warningTimer = 0;
  stage = 1;
  specialGauge = 0;
  playerSlowT = 0;
  paused = false;
  bossSpecialsUsed = 0;
  gold = 0;
  gear = {};
  lastTallyScore = 0;
  pendingTally = 0;
  finalClear = false;
  musicFrame = 0;
  musicStep = 0;
  state = 'playing';
}

function playerCenter() {
  return { x: player.x + PLAYER_SIZE / 2, y: player.y + PLAYER_SIZE / 2 };
}

function nearestEnemyTo(x, y) {
  let best = null;
  let bestD2 = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0 || e.flee) continue;
    const d2 = (e.x + e.size / 2 - x) ** 2 + (e.y + e.size / 2 - y) ** 2;
    if (d2 < bestD2) { best = e; bestD2 = d2; }
  }
  return best;
}

// ---------- 敵の出現 ----------
function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -TANK_SIZE; }
  else if (side === 1) { x = Math.random() * W; y = H; }
  else if (side === 2) { x = -TANK_SIZE; y = Math.random() * H; }
  else { x = W; y = Math.random() * H; }

  // 敵の速さには上限を設ける（プレイヤーの移動速度2.3を超えて理不尽にならないように）
  const spdMul = Math.min(1 + (stage - 1) * 0.03, 1.45);
  const roll = Math.random();
  if (score >= 1500 && roll < 0.12) {
    const hp = 3 + Math.floor(stage / 5);
    enemies.push({ x, y, speed: 0.35 * spdMul, sprite: 'enemyTank', size: TANK_SIZE, hp, maxHp: hp, points: 300, hitTimer: 0, slowTimer: 0 });
  } else if (score >= 800 && roll < 0.35) {
    enemies.push({ x, y, speed: Math.min(1.0 + score / 12000, 1.8) * spdMul, sprite: 'enemyFast', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 150, hitTimer: 0, slowTimer: 0 });
  } else {
    enemies.push({ x, y, speed: Math.min(0.55 + score / 15000, 1.3) * spdMul, sprite: 'enemy', size: ENEMY_SIZE, hp: 1, maxHp: 1, points: 100, hitTimer: 0, slowTimer: 0 });
  }
}

// ボスの仲間よび（summonギミック用）
function summonMinions(boss) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    if (enemies.length >= 40) break;
    const a = (Math.PI * 2 * i) / n + Math.random();
    const x = boss.x + boss.size / 2 + Math.cos(a) * (boss.size / 2 + 30);
    const y = boss.y + boss.size / 2 + Math.sin(a) * (boss.size / 2 + 30);
    enemies.push({
      x: Math.max(0, Math.min(W - ENEMY_SIZE, x)),
      y: Math.max(0, Math.min(H - ENEMY_SIZE, y)),
      speed: 0.9, sprite: 'enemyFast', size: ENEMY_SIZE,
      hp: 1, maxHp: 1, points: 150, hitTimer: 0, slowTimer: 0,
    });
    burst(x, y, PALETTE.p, 8, 2);
  }
  addPopup(boss.x + boss.size / 2, boss.y - 10, 'なかまをよんだ！', '#8b4f8b', 13);
  SFX.summon();
}

function makeBoss(type, x, y, size, hp, opts = {}) {
  return {
    x, y, size,
    speed: 0.25 * (opts.speedMul || 1),
    sprite: 'boss',
    hp, maxHp: hp,
    points: opts.points != null ? opts.points : (type.points || 2000 + stage * 100),
    hitTimer: 0, slowTimer: 0,
    boss: true,
    type,
    fireTimer: type.pattern === 'spiral' ? 100 : 160,
    altRing: false,
    spiralAngle: 0,
    shotsFired: 0,
    giantCharge: 0,
    // ギミック用
    splitsLeft: opts.splitsLeft || 0,
    raged: false,
    shieldT: 0,
    coreAngle: Math.random() * Math.PI * 2,
    summonT: 360,
    speedBurstT: 240,
    speedBurst: 0,
    // 近接攻撃用
    act: null,
    meleeTimer: 300 + Math.random() * 120,
    airborne: false,
    speedCharge: 0,
  };
}

function spawnBoss() {
  bossCount++;
  const type = currentBossType();
  let hp = Math.round((26 + stage * 16 + bossCount * 4) * (type.hpMul || 1));
  // 分裂ボスは子と合わせると合計HPが通常の1.7〜2倍になってしまうため、
  // 最初の（親の）HPを半分にして合計をほぼ通常ボス並みにそろえる
  if (type.gimmicks.includes('split')) hp = Math.round(hp * 0.5);
  const b = makeBoss(type, W / 2 - BOSS_SIZE / 2, -BOSS_SIZE - 10, BOSS_SIZE, hp, {
    splitsLeft: type.gimmicks.includes('split') ? 1 : 0,
  });
  enemies.push(b);
  bossActive = true;
  bossSpecialsUsed = 0; // 新しいボス戦では必殺技の使用回数がリセットされる
  bossChordIdx = 0;
  musicStep = 0;
  shakeTimer = 15;
  burst(W / 2, 40, PALETTE.p, 30, 3);
  SFX.roar();

  // 雑魚の2/3はボスにおびえて逃げ出す（1/3だけ残って戦う）
  const minions = enemies.filter((e) => !e.boss);
  for (const m of minions) {
    if (Math.random() < 2 / 3) {
      m.flee = true;
      addPopup(m.x + m.size / 2, m.y - 6, '！！', '#f4f4f4', 12);
    }
  }
}

// ---------- パーティクル ----------
function burst(x, y, color, count = 8, speed = 1.5) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const sp = speed * (0.7 + Math.random());
    particles.push({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 15 + Math.random() * 12, color });
  }
}

function rainbowBurst(x, y, count = 30, speed = 2.5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random());
    particles.push({
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: 25 + Math.random() * 25,
      color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    });
  }
}

function addPopup(x, y, text, color = '#ffcd75', size = 11) {
  popups.push({ x, y, text, color, size, life: 45 });
}

// 広がる衝撃波リング（攻撃のインパクト演出）
function addShockwave(x, y, color, r = 12, vr = 5, life = 18, lw = 4) {
  shockwaves.push({ x, y, r, vr, life, maxLife: life, color, lw });
}

// ---------- 雷の連鎖（雷属性の武器で敵を倒したとき） ----------
function chainLightning(fromX, fromY, depth) {
  if (depth <= 0) return;
  let nearest = null;
  let nearestD2 = 70 ** 2;
  for (const e of enemies) {
    if (e.hp <= 0 || e.boss) continue;
    const d2 = (e.x + e.size / 2 - fromX) ** 2 + (e.y + e.size / 2 - fromY) ** 2;
    if (d2 < nearestD2) { nearest = e; nearestD2 = d2; }
  }
  if (!nearest) return;
  const tx = nearest.x + nearest.size / 2;
  const ty = nearest.y + nearest.size / 2;
  bolts.push({ x1: fromX, y1: fromY, x2: tx, y2: ty, life: 8 });
  SFX.zap();
  nearest.hp--;
  if (nearest.hp <= 0) {
    killEnemy(nearest, depth - 1);
  } else {
    nearest.hitTimer = 12;
    burst(tx, ty, PALETTE.Y, 5);
  }
}

// ---------- ボスへのダメージ共通処理（盾・弱点コアを考慮） ----------
// hitX/hitY: 攻撃が当たった座標。ignoreDefense: 必殺技は防御無視
// 戻り値: 実際に与えたダメージ
function damageBoss(e, dmg, hitX, hitY, ignoreDefense = false) {
  const ecx = e.x + e.size / 2;
  const ecy = e.y + e.size / 2;
  if (!ignoreDefense) {
    // 盾ギミック: シールド展開中はすべてガード
    if (e.type.gimmicks.includes('shield') && bossShielded(e)) {
      addPopup(hitX, hitY, 'ガード！', '#41a6f6', 12);
      SFX.guard();
      burst(hitX, hitY, PALETTE.C, 4, 1.2);
      return 0;
    }
    // 弱点ギミック: 光るコアの近く以外はダメージなし
    if (e.type.gimmicks.includes('weakpoint')) {
      const core = bossCorePos(e);
      if ((hitX - core.x) ** 2 + (hitY - core.y) ** 2 > 26 ** 2) {
        addPopup(hitX, hitY, 'カキン！', '#94b0c2', 11);
        SFX.plink();
        return 0;
      }
      dmg *= 2; // コアに当てたら2倍ダメージ
      addPopup(core.x, core.y - 12, 'よわてん！', '#ff77a8', 13);
    }
  }
  e.hp -= dmg;
  return dmg;
}

function bossShielded(e) {
  return (e.shieldT % 420) >= 260;
}

function bossCorePos(e) {
  const ecx = e.x + e.size / 2;
  const ecy = e.y + e.size / 2;
  const r = e.size * 0.42;
  return { x: ecx + Math.cos(e.coreAngle) * r, y: ecy + Math.sin(e.coreAngle) * r };
}

// ---------- ボスの分裂 ----------
function splitBoss(e) {
  // ステージ13以降は3体、それまでは2体に分裂
  const n = stage >= 13 ? 3 : 2;
  const childHp = Math.max(6, Math.round(e.maxHp * 0.35));
  const childSize = Math.max(64, Math.round(e.size * 0.6));
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const cx = Math.max(0, Math.min(W - childSize, e.x + e.size / 2 - childSize / 2 + Math.cos(a) * 70));
    const cy = Math.max(-20, Math.min(H - childSize, e.y + e.size / 2 - childSize / 2 + Math.sin(a) * 50));
    const child = makeBoss(e.type, cx, cy, childSize, childHp, {
      splitsLeft: 0,
      points: Math.round(e.points * 0.3),
      speedMul: 1.8,
    });
    child.fireTimer = 120 + i * 40;
    enemies.push(child);
  }
  rainbowBurst(e.x + e.size / 2, e.y + e.size / 2, 40, 3.5);
  bannerText = `${e.type.name}が ${n}たいに ぶんれつ！！`;
  bannerTimer = 130;
  shakeTimer = 15;
  SFX.split();
}

// ---------- 敵を倒したときの共通処理 ----------
function killEnemy(e, lightningDepth = 2) {
  e.hp = 0;

  combo++;
  comboTimer = 90;
  if (combo > maxCombo) maxCombo = combo;
  const gained = Math.floor(e.points * (1 + (combo - 1) * 0.1));
  score += gained;
  addPopup(e.x + e.size / 2, e.y, `+${gained}`, e.boss ? '#ffcd75' : '#f4f4f4', e.boss ? 16 : 11);

  // 必殺技ゲージが溜まる
  const gaugeGain = (e.boss ? 30 : 4) * (gear.ring ? 1.5 : 1);
  specialGauge = Math.min(100, specialGauge + gaugeGain);

  if (e.boss) {
    // 分裂ギミック: 倒したと思ったら分裂する！
    if (e.splitsLeft > 0) {
      e.splitsLeft = 0;
      splitBoss(e);
      SFX.kill(combo);
    } else {
      rainbowBurst(e.x + e.size / 2, e.y + e.size / 2, 60, 4);
      flashTimer = 20;
      shakeTimer = 25;
      items.push({ x: e.x + e.size / 3, y: e.y + e.size / 2, life: 600 });
      items.push({ x: e.x + (e.size * 2) / 3, y: e.y + e.size / 2, life: 600 });
      // 分裂した仲間がまだ残っていればステージは続く
      const remaining = enemies.filter((b) => b.boss && b !== e && b.hp > 0);
      if (remaining.length === 0) {
        bossActive = false;
        nextBossScore = Math.max(nextBossScore + 4000 + stage * 200, score + 3000);
        const cleared = stage;
        if (cleared >= LAST_STAGE) {
          finalClear = true;
          pendingTally = 110;
          bannerText = 'ぜんステージクリア！！';
        } else {
          stage++;
          bannerText = `ステージ${stage} ${currentStage().name}へ！`;
          if (cleared % 5 === 0) pendingTally = 110; // 5ステージごとにけっさん
        }
        bannerTimer = 180;
        // 逃げた雑魚はそのまま画面外へ去り、新しい雑魚も3秒間は出ない（撃破後の休けい）
        spawnTimer = 180;
        SFX.bossDie();
      } else {
        SFX.bossDie();
      }
    }
  } else {
    burst(e.x + e.size / 2, e.y + e.size / 2, e.sprite === 'enemyFast' ? PALETTE.R : e.sprite === 'enemyTank' ? PALETTE.G : PALETTE.P, 10);
  }

  // 武器の進化チェック
  const newIdx = weaponForScore(score);
  if (newIdx > weaponIdx) {
    bannerText = `ぶきしんか！ ${WEAPONS[weaponIdx].name} → ${WEAPONS[newIdx].name}`;
    bannerTimer = 150;
    weaponIdx = newIdx;
    flashTimer = 15;
    const pc = playerCenter();
    rainbowBurst(pc.x, pc.y, 40, 3);
    SFX.fanfare();
    // 5レベルごとにキャラの見た目も進化！
    const nf = Math.min(FORMS.length - 1, Math.floor(newIdx / 5));
    if (nf > formIdx) {
      formIdx = nf;
      bannerText = `すがたしんか！ ${FORMS[nf].name}に なった！`;
      bannerTimer = 180;
      rainbowBurst(pc.x, pc.y, 70, 4);
      flashTimer = 22;
    }
  } else if (!e.boss) {
    SFX.kill(combo);
  }

  // 雷属性: 近くの敵へ連鎖
  if (WEAPONS[weaponIdx].lightning && lightningDepth > 0 && !e.boss) {
    chainLightning(e.x + e.size / 2, e.y + e.size / 2, lightningDepth);
  }

  // ライフが減っていたらハートを落とす（おまもりで2倍）
  const dropRate = 0.1 * (gear.charm ? 2 : 1);
  if (lives < maxLives() && Math.random() < dropRate) {
    items.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
}

// ---------- 必殺技: 画面全体の大爆発（防御無視） ----------
function specialAttack() {
  if (bossActive) bossSpecialsUsed++;
  specialGauge = 0;
  flashTimer = 25;
  shakeTimer = 20;
  const pc = playerCenter();
  rainbowBurst(pc.x, pc.y, 80, 5);
  for (let i = 0; i < 6; i++) {
    rainbowBurst(Math.random() * W, Math.random() * H, 15, 3);
  }
  // ボスの弾は全部消える
  fireballs = [];
  // 雑魚は全滅、ボスには5ダメージ（盾・弱点も無視）
  quietKills = true;
  for (const e of [...enemies]) {
    if (e.hp <= 0) continue;
    if (e.boss) {
      e.hp -= 5;
      e.hitTimer = 24;
      burst(e.x + e.size / 2, e.y + e.size / 2, PALETTE.Y, 20, 3);
      if (e.hp <= 0) killEnemy(e);
    } else {
      killEnemy(e);
    }
  }
  quietKills = false;
  enemies = enemies.filter((e) => e.hp > 0);
  addPopup(pc.x, pc.y - 24, 'ひっさつわざ！！', '#ffcd75', 18);
  SFX.special();
}

// ---------- プレイヤー被弾の共通処理 ----------
function hurtPlayer() {
  // てつのよろい: 20%でガード
  if (gear.armor && Math.random() < 0.2) {
    const pc = playerCenter();
    addPopup(pc.x, pc.y - 20, 'ガード！', '#41a6f6', 13);
    invincibleTimer = 30;
    SFX.guard();
    return;
  }
  lives--;
  invincibleTimer = gear.cloak ? 180 : 90;
  shakeTimer = 10;
  if (!gear.hagoromo) combo = 0;
  const pc = playerCenter();
  burst(pc.x, pc.y, PALETTE.C, 12);
  SFX.hurt();
  if (lives <= 0) {
    // ふっかつのたま: 1回だけ復活
    if (gear.orb) {
      gear.orb = false;
      lives = 3;
      invincibleTimer = 240;
      flashTimer = 25;
      addPopup(pc.x, pc.y - 24, 'ふっかつ！！', '#ff77a8', 20);
      rainbowBurst(pc.x, pc.y, 60, 4);
      SFX.fanfare();
      return;
    }
    state = 'gameover';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('hayato-highscore', String(highScore));
    }
  }
}

// ---------- けっさん（5ステージごとの点数カウント）＆おみせ ----------
function startTally() {
  const cleared = finalClear ? LAST_STAGE : stage - 1;
  const earned = score - lastTallyScore;
  const bonus = cleared * 300;
  tally = { t: 0, earned, bonus, total: earned + bonus, given: false, cleared };
  lastTallyScore = score;
  state = 'tally';
  shopIdx = 0;
  SFX.fanfare();
}

function tallyGold() {
  return Math.floor(tally.total / 10);
}

function openShop() {
  if (!tally.given) {
    tally.given = true;
    gold += tallyGold();
    SFX.coin();
  }
  state = 'shop';
}

function closeShop() {
  if (finalClear) {
    state = 'clear';
    SFX.clear();
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('hayato-highscore', String(highScore));
    }
  } else {
    state = 'playing';
  }
}

function shopInput(key) {
  const total = SHOP_ITEMS.length + 1; // +1 = 「おみせをでる」
  if (key === 'ArrowUp' || key === 'w' || key === 'W') {
    shopIdx = (shopIdx + total - 1) % total;
    beep(600, 0.04, 'square', 0.03);
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    shopIdx = (shopIdx + 1) % total;
    beep(600, 0.04, 'square', 0.03);
  } else if (key === 'Enter' || key === ' ') {
    if (shopIdx === SHOP_ITEMS.length) { closeShop(); return; }
    const item = SHOP_ITEMS[shopIdx];
    const owned = !item.repeat && gear[item.id];
    if (owned) { SFX.buzz(); return; }
    if (item.repeat && item.id === 'heal' && lives >= maxLives()) { SFX.buzz(); return; }
    if (gold < item.price) { SFX.buzz(); return; }
    gold -= item.price;
    if (item.id === 'heal') {
      lives = maxLives();
    } else {
      gear[item.id] = true;
      if (item.id === 'helm') lives = Math.min(lives + 1, maxLives());
    }
    SFX.buy();
  } else if (key === 'Escape' || key === 'x' || key === 'X') {
    closeShop();
  }
}

// ---------- 更新 ----------
function update() {
  gframe++;
  tickMusic();
  if (paused && state === 'playing') return; // 一時停止中はゲーム世界を完全に止める

  // パーティクル・ポップアップはどの画面でも動かす
  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    return p.life > 0;
  });
  popups = popups.filter((p) => {
    p.y -= 0.8;
    p.life--;
    return p.life > 0;
  });
  bolts = bolts.filter((b) => --b.life > 0);
  shockwaves = shockwaves.filter((s) => { s.r += s.vr; return --s.life > 0; });

  if (state === 'tally') {
    tally.t++;
    if (tally.t <= TALLY_COUNT_FRAMES) {
      if (tally.t % 4 === 0) SFX.tick(tally.t / TALLY_COUNT_FRAMES);
      if (tally.t % 10 === 0) rainbowBurst(40 + Math.random() * (W - 80), 40 + Math.random() * (H - 120), 14, 2.5);
      if (tally.t === TALLY_COUNT_FRAMES) SFX.fanfare();
    } else if (tally.t % 30 === 0) {
      rainbowBurst(40 + Math.random() * (W - 80), 40 + Math.random() * (H - 120), 10, 2);
    }
    return;
  }
  if (state === 'clear') {
    if (gframe % 20 === 0) rainbowBurst(40 + Math.random() * (W - 80), 30 + Math.random() * (H - 100), 16, 3);
    return;
  }
  if (state !== 'playing') return;
  frame++;

  // けっさんへの移行待ち（ボス撃破の余韻のあとに開く）
  if (pendingTally > 0) {
    pendingTally--;
    if (pendingTally === 0) { startTally(); return; }
  }

  // プレイヤー移動（ブーツで速く、凍ると遅い）
  let dx = 0, dy = 0;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
  if (playerSlowT > 0) playerSlowT--;
  const pspeed = player.speed * (gear.boots ? 1.2 : 1) * (playerSlowT > 0 ? 0.5 : 1);
  player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x + dx * pspeed));
  player.y = Math.max(0, Math.min(H - PLAYER_SIZE, player.y + dy * pspeed));

  const weapon = WEAPONS[weaponIdx];
  weaponAngle += weapon.spin * (gear.gauntlet ? 1.15 : 1);
  const pc = playerCenter();

  // 炎属性: 各刃の先から火の玉を発射
  if (weapon.flame) {
    flameTimer--;
    if (flameTimer <= 0) {
      for (let b = 0; b < weapon.blades; b++) {
        const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
        pshots.push({
          x: pc.x + Math.cos(a) * weapon.len,
          y: pc.y + Math.sin(a) * weapon.len,
          vx: Math.cos(a) * 3,
          vy: Math.sin(a) * 3,
          life: 50, kind: 'flame', dmg: 1,
        });
      }
      flameTimer = 18;
      SFX.fire();
    }
  }

  // 飛び道具武器（弓・銃・大砲・ブーメラン・パチンコ・ジャベリン・レーザー）
  if (weapon.shoot) {
    shootTimer--;
    if (shootTimer <= 0) {
      const sh = weapon.shoot;
      const tipA = weaponAngle;
      const tipX = pc.x + Math.cos(tipA) * weapon.len;
      const tipY = pc.y + Math.sin(tipA) * weapon.len;
      let baseAng = tipA;
      if (sh.aim) {
        const target = nearestEnemyTo(pc.x, pc.y);
        if (target) baseAng = Math.atan2(target.y + target.size / 2 - pc.y, target.x + target.size / 2 - pc.x);
      }
      const count = sh.count || 1;
      for (let i = 0; i < count; i++) {
        const ang = baseAng + (i - (count - 1) / 2) * 0.22;
        pshots.push({
          x: tipX, y: tipY,
          vx: Math.cos(ang) * sh.speed,
          vy: Math.sin(ang) * sh.speed,
          life: sh.kind === 'boomerang' ? 999 : 90,
          kind: sh.kind, dmg: sh.dmg, pierce: !!sh.pierce, aoe: sh.aoe || 0,
          ang, rot: 0, t: 0, returning: false,
          hitSet: sh.pierce ? new Set() : null,
        });
      }
      shootTimer = sh.interval;
      SFX.shoot();
    }
  }

  // プレイヤーの弾の移動
  pshots = pshots.filter((f) => {
    f.t = (f.t || 0) + 1;
    if (f.kind === 'boomerang') {
      f.rot += 0.35;
      if (!f.returning && f.t > 32) { f.returning = true; f.hitSet = new Set(); }
      if (f.returning) {
        const a = Math.atan2(pc.y - f.y, pc.x - f.x);
        f.vx = Math.cos(a) * 5;
        f.vy = Math.sin(a) * 5;
        if ((f.x - pc.x) ** 2 + (f.y - pc.y) ** 2 < 14 ** 2) return false;
      }
    }
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    return f.life > 0 && f.x > -30 && f.x < W + 30 && f.y > -30 && f.y < H + 30;
  });

  // ボス戦中は必殺技ゲージが自動でたまっていく（使えるのは1ボス戦にBOSS_SPECIAL_LIMIT回まで）
  if (bossActive) specialGauge = Math.min(100, specialGauge + 0.12);

  // ボス出現の警告
  if (!bossActive && warningTimer === 0 && score >= nextBossScore && pendingTally === 0 && !finalClear) {
    warningTimer = 120;
  }
  if (warningTimer > 0) {
    warningTimer--;
    if (warningTimer % 30 === 0) SFX.warn();
    if (warningTimer === 1) spawnBoss();
  }

  // 敵の出現ペース（ボス戦中は新しい雑魚を増やさない）
  // スコアが伸びても出現間隔は26フレームより短くならない＋画面上は26体まで（ラッシュ防止）
  spawnTimer--;
  if (spawnTimer <= 0 && enemies.length < 26 && !bossActive && warningTimer === 0) {
    spawnEnemy();
    spawnTimer = Math.max(26, 58 - Math.floor(score / 800) * 3 - stage);
  }

  updateEnemies(pc);
  updateBossShots(pc);
  updateWeaponHits(pc, weapon);
  updatePShotHits();
  updateItems(pc);
  updatePlayerHits(pc);
  updateStageFx();

  // コンボタイマー
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) combo = 0;
  }

  if (bannerTimer > 0) bannerTimer--;
  if (shakeTimer > 0) shakeTimer--;
  if (flashTimer > 0) flashTimer--;
}

// ---------- 敵・ボスの行動 ----------
function updateEnemies(pc) {
  const bossRef = enemies.find((en) => en.boss);
  for (const e of enemies) {
    if (e.slowTimer > 0) e.slowTimer--;
    if (e.hitTimer > 0) {
      e.hitTimer--;
      if (!e.boss) continue; // ボスはひるまず動き続ける
    }
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;

    if (e.flee) {
      // ボスから逃げる（ボスがもういなければプレイヤーから離れて画面外へ去り、消える）
      const refX = bossRef ? bossRef.x + bossRef.size / 2 : pc.x;
      const refY = bossRef ? bossRef.y + bossRef.size / 2 : pc.y;
      const away = Math.atan2(ecy - refY, ecx - refX);
      e.x += Math.cos(away) * 2.2;
      e.y += Math.sin(away) * 2.2;
      if (e.x < -60 || e.x > W + 60 || e.y < -60 || e.y > H + 60) e.hp = 0;
      continue;
    }

    if (e.boss) {
      updateBoss(e, pc, ecx, ecy);
      continue;
    }

    const angle = Math.atan2(pc.y - ecy, pc.x - ecx);
    const spd = e.speed * (e.slowTimer > 0 ? 0.45 : 1);
    e.x += Math.cos(angle) * spd;
    e.y += Math.sin(angle) * spd;
  }
  enemies = enemies.filter((e) => e.hp > 0);
}

function updateBoss(e, pc, ecx, ecy) {
  const type = e.type;
  const gm = type.gimmicks;

  // 神様のオーラ（体の周りから立ちのぼる光。激怒中は赤くなる）
  if (frame % 3 === 0) {
    particles.push({
      x: e.x + Math.random() * e.size,
      y: e.y + e.size - Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.6 - Math.random() * 0.6,
      life: 20 + Math.random() * 15,
      color: e.raged ? '#b13e53' : (type.aura || PALETTE.p),
    });
  }

  // 激怒ギミック: HPが1/4を切ると怒って強くなる！
  if (gm.includes('rage') && !e.raged && e.hp <= e.maxHp * 0.25) {
    e.raged = true;
    e.speed *= 1.7;
    flashTimer = 15;
    shakeTimer = 20;
    bannerText = `${type.name}が げきどした！！`;
    bannerTimer = 130;
    SFX.rage();
  }

  // 盾ギミックのタイマー
  if (gm.includes('shield')) {
    e.shieldT++;
    if (e.shieldT % 420 === 260) { addPopup(ecx, e.y - 10, 'シールド！', '#41a6f6', 13); SFX.guard(); }
  }
  // 弱点コアはゆっくり回る
  if (gm.includes('weakpoint')) e.coreAngle += 0.02;
  // 仲間よびギミック
  if (gm.includes('summon')) {
    e.summonT--;
    if (e.summonT <= 0) {
      summonMinions(e);
      e.summonT = e.raged ? 260 : 400;
    }
  }
  // 高速化ギミック: 「かまえ…！」のためモーション（45フレーム）のあとに加速する
  // いきなり加速すると避けられないため、必ず予備動作を見せる
  if (gm.includes('speed')) {
    if (e.speedBurst > 0) e.speedBurst--;
    if (e.speedCharge === 0 && !e.act) {
      e.speedBurstT--;
      if (e.speedBurstT <= 0) {
        e.speedCharge = 45;
        e.speedBurstT = 240;
        addPopup(ecx, e.y - 10, 'かまえ…！！', '#73eff7', 14);
        SFX.warn();
      }
    }
  }
  if (e.speedCharge > 0) {
    e.speedCharge--;
    // ため: その場で震えながら（描画側でジッター）オーラが体に集まっていく
    for (let i = 0; i < 2; i++) {
      const ca = Math.random() * Math.PI * 2;
      const cd = 60 + Math.random() * 40;
      particles.push({
        x: ecx + Math.cos(ca) * cd, y: ecy + Math.sin(ca) * cd,
        vx: -Math.cos(ca) * 3.5, vy: -Math.sin(ca) * 3.5,
        life: 14, color: '#73eff7',
      });
    }
    if (e.speedCharge === 0) {
      e.speedBurst = 70;
      addShockwave(ecx, ecy, '#73eff7', 14, 5, 20, 4);
      addPopup(ecx, e.y - 10, 'かそく！！', '#73eff7', 16);
      SFX.dash();
    }
    return; // ため中は動かない・撃たない（ここが逃げるチャンス）
  }

  // ---- 近接攻撃の状態機械 ----
  if (e.act) {
    runBossAct(e, pc, ecx, ecy);
    return; // 技の最中は通常の移動・射撃をしない
  }
  e.meleeTimer -= e.raged ? 1.6 : 1;
  if (e.meleeTimer <= 0 && type.melee.length > 0 && e.y > 0) {
    const kind = type.melee[Math.floor(Math.random() * type.melee.length)];
    e.act = { kind, t: 0, tx: 0, ty: 0, vx: 0, vy: 0, sweep: 0 };
    e.meleeTimer = (280 + Math.random() * 140) * (e.raged ? 0.6 : 1);
  }

  // 通常移動（プレイヤーへゆっくり近づく）
  const angle = Math.atan2(pc.y - ecy, pc.x - ecx);
  const spd = e.speed * (e.slowTimer > 0 ? 0.45 : 1) * (e.speedBurst > 0 ? 2.4 : 1);
  e.x += Math.cos(angle) * spd;
  e.y += Math.sin(angle) * spd;
  if (e.speedBurst > 0 && frame % 2 === 0) {
    particles.push({ x: ecx, y: ecy, vx: -Math.cos(angle) * 1.5, vy: -Math.sin(angle) * 1.5, life: 12, color: '#73eff7' });
  }

  // ---- 射撃（チャージ→発射。4回に1回は10倍サイズの巨大な一撃！） ----
  const mouthX = ecx;
  const mouthY = e.y + e.size * 0.55;
  if (e.giantCharge > 0) {
    e.giantCharge--;
    // 巨大攻撃のチャージ演出: 大量のエネルギーが集まる
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 50 + Math.random() * 50;
      const cc = type.ballColors ? type.ballColors[Math.floor(Math.random() * 3)] : (Math.random() < 0.5 ? PALETTE.O : PALETTE.Y);
      particles.push({
        x: mouthX + Math.cos(a) * d, y: mouthY + Math.sin(a) * d,
        vx: -Math.cos(a) * 3.5, vy: -Math.sin(a) * 3.5,
        life: 14, color: cc,
      });
    }
    if (e.giantCharge === 0) {
      const aim = Math.atan2(pc.y - mouthY, pc.x - mouthX);
      fireballs.push({
        x: mouthX, y: mouthY,
        vx: Math.cos(aim) * 1.7, vy: Math.sin(aim) * 1.7,
        life: 600, colors: type.ballColors || null, kind: type.shot,
        ang: aim, rot: 0, giant: true,
      });
      burst(mouthX, mouthY, '#f4f4f4', 24, 4);
      burst(mouthX, mouthY, type.aura, 20, 3);
      addShockwave(mouthX, mouthY, '#ffcd75', 20, 9, 20, 6);
      addShockwave(mouthX, mouthY, '#f4f4f4', 12, 7, 16, 3);
      flashTimer = 14;
      shakeTimer = 22;
      SFX.giantShot();
    }
    return;
  }
  e.fireTimer -= e.raged ? 1.7 : 1;
  if (e.fireTimer < 40 && e.fireTimer > 0) {
    // チャージ演出: 口元に力が集まる
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 30;
    const cc = type.ballColors ? type.ballColors[Math.floor(Math.random() * 3)] : (Math.random() < 0.5 ? PALETTE.O : PALETTE.Y);
    particles.push({
      x: mouthX + Math.cos(a) * d, y: mouthY + Math.sin(a) * d,
      vx: -Math.cos(a) * 2.5, vy: -Math.sin(a) * 2.5,
      life: 12, color: cc,
    });
  }
  if (e.fireTimer <= 0) {
    e.shotsFired++;
    // 4回に1回はド派手な巨大攻撃のチャージに入る
    if (e.shotsFired % 4 === 0) {
      e.giantCharge = 50;
      addPopup(ecx, e.y - 14, '！！！', '#b13e53', 20);
      SFX.giantCharge();
      e.fireTimer = type.pattern === 'spiral' ? 55 : Math.max(70, 150 - stage * 4);
      return;
    }
    const shotSpeed = ({ ball: 1.15, bolt: 1.7, sword: 1.35, spear: 1.5, wind: 1.6, trident: 1.4, ice: 1.3, hammer: 1.2, light: 1.5, scythe: 1.3, fang: 1.8, snake: 1.25 })[type.shot] || 1.15;
    const shoot = (ang) => {
      fireballs.push({
        x: mouthX, y: mouthY,
        vx: Math.cos(ang) * shotSpeed,
        vy: Math.sin(ang) * shotSpeed,
        life: 380,
        colors: type.ballColors || null,
        kind: type.shot,
        ang, rot: 0,
      });
    };
    const aim = Math.atan2(pc.y - mouthY, pc.x - mouthX);
    const lv = Math.min(Math.floor(stage / 2) + bossCount, 8);
    if (type.pattern === 'aim') {
      const n = Math.min(3 + lv, 8);
      for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.26);
    } else if (type.pattern === 'wide') {
      const n = Math.min(5 + lv, 10);
      for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.3);
    } else if (type.pattern === 'ring') {
      const n = 10 + Math.min(lv, 4);
      for (let i = 0; i < n; i++) shoot((Math.PI * 2 * i) / n);
    } else if (type.pattern === 'mix') {
      e.altRing = !e.altRing;
      if (e.altRing) {
        for (let i = 0; i < 8; i++) shoot((Math.PI * 2 * i) / 8);
      } else {
        const n = Math.min(3 + lv, 8);
        for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.26);
      }
    } else if (type.pattern === 'spiral') {
      for (let i = 0; i < 3; i++) shoot(e.spiralAngle + (Math.PI * 2 * i) / 3);
      e.spiralAngle += 0.5;
    }
    e.fireTimer = type.pattern === 'spiral' ? 55 : Math.max(70, 150 - stage * 4);
    shakeTimer = 8;
    SFX.bossFire();
  }
}

// ---- ボスの近接攻撃（punch=突進 / tail=回転なぎはらい / stomp=踏みつけ / dive=急降下体当たり） ----
function runBossAct(e, pc, ecx, ecy) {
  const a = e.act;
  a.t++;
  if (a.kind === 'punch' || a.kind === 'dive') {
    const dash = a.kind === 'dive';
    const tel = dash ? 30 : 35;         // ため（予備動作。描画側で大きくのけぞる）
    const dur = dash ? 42 : 26;         // 突進時間
    const spd = dash ? 8.5 : 6.5;
    if (a.t === 1) { addPopup(ecx, e.y - 12, dash ? 'たいあたり！！' : 'パンチ！！', '#ef7d57', 15); SFX.warn(); }
    if (a.t < tel) {
      e.hitTimer = 2; // 白く点滅して予告
      if (a.t % 6 === 0) burst(ecx, ecy, '#f4f4f4', 4, 1);
      // 力をためる: オーラが体に吸い込まれていく
      if (a.t % 2 === 0) {
        const ca = Math.random() * Math.PI * 2;
        const cd = 50 + Math.random() * 40;
        particles.push({
          x: ecx + Math.cos(ca) * cd, y: ecy + Math.sin(ca) * cd,
          vx: -Math.cos(ca) * 3, vy: -Math.sin(ca) * 3,
          life: 14, color: e.type.aura,
        });
      }
    } else if (a.t === tel) {
      const ang = Math.atan2(pc.y - ecy, pc.x - ecx);
      a.vx = Math.cos(ang) * spd;
      a.vy = Math.sin(ang) * spd;
      a.trail = [];
      addShockwave(ecx, ecy, e.type.aura, 12, 6, 18, 5);
      addShockwave(ecx, ecy, '#f4f4f4', 8, 8, 12, 3);
      burst(ecx, ecy, '#f4f4f4', 14, 3);
      shakeTimer = 12;
      SFX.dash();
      SFX.roar();
    } else if (a.t < tel + dur) {
      // 残像を残しながら突進（描画側で半透明の残像を描く）
      a.trail.push({ x: e.x, y: e.y });
      if (a.trail.length > 4) a.trail.shift();
      e.x = Math.max(-e.size / 2, Math.min(W - e.size / 2, e.x + a.vx));
      e.y = Math.max(-e.size / 2, Math.min(H - e.size / 2, e.y + a.vy));
      particles.push({ x: e.x + Math.random() * e.size, y: e.y + Math.random() * e.size, vx: -a.vx * 0.3, vy: -a.vy * 0.3, life: 12, color: e.type.aura });
      particles.push({ x: e.x + Math.random() * e.size, y: e.y + Math.random() * e.size, vx: -a.vx * 0.2, vy: -a.vy * 0.2, life: 10, color: '#f4f4f4' });
    } else if (a.t === tel + dur) {
      // 急ブレーキの土けむり
      burst(ecx, e.y + e.size * 0.9, '#94b0c2', 10, 2);
      a.trail = null;
    } else if (a.t > tel + dur + 30) {
      e.act = null;
    }
  } else if (a.kind === 'tail') {
    const tel = 30;
    const dur = 45;
    if (a.t === 1) { addPopup(ecx, e.y - 12, 'なぎはらい！！', '#ef7d57', 15); SFX.warn(); }
    if (a.t < tel) {
      if (a.t % 5 === 0) burst(ecx, ecy, e.type.aura, 6, 2);
    } else if (a.t < tel + dur) {
      a.sweep += (Math.PI * 2) / dur;
      // なぎはらい中は周囲リングにいると当たる
      const r = e.size * 0.72;
      const d2 = (pc.x - ecx) ** 2 + (pc.y - ecy) ** 2;
      if (invincibleTimer === 0 && d2 < r * r && d2 > (e.size * 0.2) ** 2) hurtPlayer();
      if (a.t % 3 === 0) {
        const sx = ecx + Math.cos(a.sweep) * r;
        const sy = ecy + Math.sin(a.sweep) * r;
        burst(sx, sy, e.type.aura, 3, 1.2);
      }
      shakeTimer = Math.max(shakeTimer, 3);
    } else if (a.t > tel + dur + 25) {
      e.act = null;
    }
  } else if (a.kind === 'stomp') {
    const crouch = 22;  // しゃがみこみ（描画側で体がつぶれる）
    const rise = 30;    // 飛び上がり
    const hover = 55;   // 影がプレイヤーを追う時間
    const landT = crouch + rise + hover;
    const lockT = landT - 12; // 着地点が確定する瞬間
    if (a.t === 1) {
      addPopup(ecx, e.y - 12, 'ふみつけ！！', '#ef7d57', 15);
      SFX.warn();
      a.tx = pc.x; a.ty = pc.y;
    }
    if (a.t < crouch) {
      // しゃがんで力をためる。足元から土けむり
      if (a.t % 4 === 0) burst(ecx + (Math.random() - 0.5) * e.size * 0.6, e.y + e.size * 0.95, '#94b0c2', 3, 1.5);
    } else if (a.t === crouch) {
      // だっ！と飛び上がる
      e.airborne = true;
      addShockwave(ecx, e.y + e.size * 0.9, '#f4f4f4', 10, 4, 14, 3);
      burst(ecx, e.y + e.size * 0.95, '#94b0c2', 14, 2.5);
      SFX.takeoff();
    } else if (a.t < crouch + rise) {
      e.y -= 9; // 画面の上へ飛び上がる
    } else if (a.t < landT) {
      if (a.t < lockT) { a.tx = pc.x; a.ty = pc.y; } // 影がプレイヤーを追いかける
    } else if (a.t === landT) {
      // ドッスーン！！と着地。二重の衝撃波＋土けむりの柱＋画面フラッシュ
      e.x = a.tx - e.size / 2;
      e.y = a.ty - e.size / 2;
      e.airborne = false;
      shakeTimer = 26;
      flashTimer = 10;
      SFX.stomp();
      addShockwave(a.tx, a.ty, '#f4f4f4', 16, 7, 22, 6);
      addShockwave(a.tx, a.ty, e.type.aura, 10, 5, 26, 4);
      burst(a.tx, a.ty, '#f4f4f4', 24, 3.5);
      burst(a.tx, a.ty, e.type.aura, 24, 2.5);
      for (let i = 0; i < 14; i++) {
        // 土けむりが柱のように吹き上がる
        particles.push({
          x: a.tx + (Math.random() - 0.5) * 90,
          y: a.ty + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -2 - Math.random() * 2.5,
          life: 24 + Math.random() * 14,
          color: Math.random() < 0.5 ? '#94b0c2' : '#f4f4f4',
        });
      }
      const d2 = (pc.x - a.tx) ** 2 + (pc.y - a.ty) ** 2;
      if (invincibleTimer === 0 && d2 < 80 ** 2) hurtPlayer();
    } else if (a.t > landT + 40) {
      e.act = null;
    }
  }
}

// ---------- ボスの弾の移動 ----------
function updateBossShots(pc) {
  fireballs = fireballs.filter((f) => {
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    if (f.kind === 'sword' || f.kind === 'hammer' || f.kind === 'scythe') f.rot += 0.3;
    if (f.giant) {
      f.rot += 0.09;
      // 飛んでいる間は地響きがして、まわりをエネルギーの火花が回る
      if (gframe % 5 === 0) shakeTimer = Math.max(shakeTimer, 3);
      const sa = f.rot * 3;
      particles.push({ x: f.x + Math.cos(sa) * 48, y: f.y + Math.sin(sa) * 48, vx: 0, vy: 0, life: 8, color: '#f4f4f4' });
      particles.push({ x: f.x - Math.cos(sa) * 48, y: f.y - Math.sin(sa) * 48, vx: 0, vy: 0, life: 8, color: '#ffcd75' });
      // 通ったあとに衝撃波のなごりを残す
      particles.push({
        x: f.x - f.vx * 8 + (Math.random() - 0.5) * 40,
        y: f.y - f.vy * 8 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
        life: 16, color: f.colors ? f.colors[Math.floor(Math.random() * f.colors.length)] : PALETTE.O,
      });
    }
    const trailN = f.giant ? 3 : 1;
    for (let i = 0; i < trailN; i++) {
      if (Math.random() < 0.6) {
        const spread = f.giant ? 40 : 6;
        particles.push({
          x: f.x + (Math.random() - 0.5) * spread,
          y: f.y + (Math.random() - 0.5) * spread,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.5 - Math.random() * 0.5,
          life: 10 + Math.random() * 8,
          color: f.colors ? f.colors[Math.floor(Math.random() * f.colors.length)] : (Math.random() < 0.5 ? PALETTE.O : PALETTE.Y),
        });
      }
    }
    const m = f.giant ? 60 : 20;
    const alive = f.life > 0 && f.x > -m && f.x < W + m && f.y > -m && f.y < H + m;
    // 巨大弾は消えるときも大爆発する
    if (!alive && f.giant) {
      burst(f.x, f.y, PALETTE.O, 26, 4);
      burst(f.x, f.y, PALETTE.Y, 18, 3);
      shakeTimer = Math.max(shakeTimer, 12);
      SFX.boom();
    }
    return alive;
  });
}

// ---------- 回転武器と敵の当たり判定 ----------
function updateWeaponHits(pc, weapon) {
  for (const e of enemies) {
    if (e.hp <= 0 || e.hitTimer > 0 || e.airborne) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    let hit = false;
    let hitX = ecx, hitY = ecy;
    for (let b = 0; b < weapon.blades && !hit; b++) {
      const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
      if (weapon.kind === 'chain') {
        // 鎖武器は先端の鉄球だけで判定（そのぶん強い）
        const bx = pc.x + Math.cos(a) * weapon.len;
        const by = pc.y + Math.sin(a) * weapon.len;
        const r = e.size / 2 + weapon.ballR;
        if ((bx - ecx) ** 2 + (by - ecy) ** 2 < r * r) { hit = true; hitX = bx; hitY = by; }
      } else {
        const eRadius = e.size / 2 + weapon.width / 2;
        for (const t of [0.35, 0.55, 0.75, 0.9, 1.0]) {
          const bx = pc.x + Math.cos(a) * weapon.len * t;
          const by = pc.y + Math.sin(a) * weapon.len * t;
          if ((bx - ecx) ** 2 + (by - ecy) ** 2 < eRadius ** 2) { hit = true; hitX = bx; hitY = by; break; }
        }
      }
    }
    if (hit) {
      let dealt;
      if (e.boss) {
        dealt = damageBoss(e, weapon.dmg, hitX, hitY);
        if (dealt === 0) { e.hitTimer = 14; continue; }
      } else {
        e.hp -= weapon.dmg;
        dealt = weapon.dmg;
      }
      if (weapon.ice) {
        e.slowTimer = 140;
        burst(ecx, ecy, PALETTE.C, 6);
        SFX.freeze();
      }
      if (e.hp <= 0) {
        killEnemy(e);
      } else {
        const kb = Math.atan2(ecy - pc.y, ecx - pc.x);
        const kbDist = e.boss ? 3 : (weapon.knock || 14);
        e.x += Math.cos(kb) * kbDist;
        e.y += Math.sin(kb) * kbDist;
        e.hitTimer = 18;
        burst(hitX, hitY, PALETTE.W, 5);
        SFX.kill(combo);
      }
      shakeTimer = Math.max(shakeTimer, 5);
    }
  }
}

// ---------- プレイヤーの弾と敵の当たり判定 ----------
function updatePShotHits() {
  for (const f of pshots) {
    for (const e of enemies) {
      if (e.hp <= 0 || e.airborne) continue;
      if (f.hitSet && f.hitSet.has(e)) continue;
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      const r = e.size / 2 + (f.kind === 'cannonball' ? 8 : 5);
      if ((f.x - ecx) ** 2 + (f.y - ecy) ** 2 < r * r) {
        let dealt;
        if (e.boss) {
          dealt = damageBoss(e, f.dmg, f.x, f.y);
        } else {
          e.hp -= f.dmg;
          dealt = f.dmg;
        }
        // 大砲は着弾で大爆発（まわりの敵にもダメージ）
        if (f.kind === 'cannonball') {
          explodeAt(f.x, f.y, f.aoe, f.dmg);
          f.life = 0;
        } else if (f.pierce) {
          if (f.hitSet) f.hitSet.add(e);
        } else {
          f.life = 0;
        }
        if (e.hp <= 0) killEnemy(e);
        else if (dealt > 0) { e.hitTimer = 12; burst(ecx, ecy, PALETTE.O, 5); }
        if (!f.pierce) break;
      }
    }
  }
  pshots = pshots.filter((f) => f.life > 0);
  enemies = enemies.filter((e) => e.hp > 0);
}

function explodeAt(x, y, radius, dmg) {
  burst(x, y, PALETTE.O, 20, 3);
  burst(x, y, PALETTE.Y, 16, 2);
  shakeTimer = Math.max(shakeTimer, 10);
  SFX.boom();
  for (const e of enemies) {
    if (e.hp <= 0 || e.airborne) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    if ((x - ecx) ** 2 + (y - ecy) ** 2 < (radius + e.size / 2) ** 2) {
      const dealt = e.boss ? damageBoss(e, dmg, ecx, ecy) : (e.hp -= dmg, dmg);
      if (e.hp <= 0) killEnemy(e);
      else if (dealt > 0) e.hitTimer = 12;
    }
  }
}

// ---------- アイテム ----------
function updateItems(pc) {
  items = items.filter((it) => {
    it.life--;
    if ((it.x - pc.x) ** 2 + (it.y - pc.y) ** 2 < 20 ** 2) {
      if (lives < maxLives()) lives++;
      SFX.heart();
      burst(it.x, it.y, PALETTE.M, 8);
      addPopup(it.x, it.y - 10, 'かいふく！', '#ff77a8', 11);
      return false;
    }
    return it.life > 0;
  });
}

// ---------- プレイヤーの被弾判定 ----------
function updatePlayerHits(pc) {
  if (invincibleTimer > 0) invincibleTimer--;
  if (invincibleTimer === 0) {
    for (const e of enemies) {
      if (e.airborne) continue; // 空中のボスには当たらない
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      const hitR = e.boss ? e.size / 2 - 14 : PLAYER_SIZE / 2 + e.size / 2 - 4;
      if ((pc.x - ecx) ** 2 + (pc.y - ecy) ** 2 < hitR ** 2) {
        hurtPlayer();
        break;
      }
    }
  }
  if (invincibleTimer === 0 && state === 'playing') {
    for (const f of fireballs) {
      const r = f.giant ? 42 : 15;
      if ((f.x - pc.x) ** 2 + (f.y - pc.y) ** 2 < r * r) {
        // まほうのたて: 30%で弾をはじく（巨大な一撃は防げない）
        if (!f.giant && gear.shield && Math.random() < 0.3) {
          f.life = 0;
          addPopup(pc.x, pc.y - 20, 'はじいた！', '#41a6f6', 12);
          burst(f.x, f.y, PALETTE.C, 8);
          SFX.guard();
          break;
        }
        f.life = 0;
        if (f.kind === 'ice') {
          playerSlowT = 120;
          addPopup(pc.x, pc.y - 30, 'こおった！', '#73eff7', 12);
        }
        if (f.giant) shakeTimer = 18;
        hurtPlayer();
        break;
      }
    }
  }
}

// ---------- ステージごとの環境エフェクト ----------
function updateStageFx() {
  const st = currentStage();
  const fx = st.fx;
  if (fx === 'petal' && frame % 24 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: 0.4 + Math.random() * 0.5, vy: 0.5 + Math.random() * 0.5, life: 90, color: '#ff77a8' });
  } else if (fx === 'leaf' && frame % 14 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 1.2, vy: 0.6 + Math.random() * 0.6, life: 80, color: '#38b764' });
  } else if (fx === 'bubble' && frame % 16 === 0) {
    particles.push({ x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 0.3, vy: -0.5 - Math.random() * 0.5, life: 60, color: '#5f6b35' });
  } else if (fx === 'rain') {
    if (frame % 2 === 0) {
      particles.push({ x: Math.random() * (W + 60) - 30, y: -4, vx: -1.5, vy: 6 + Math.random() * 2, life: 70, color: '#73a3c9' });
    }
    // ときどき稲光が走る
    if (Math.random() < 0.003) { flashTimer = Math.max(flashTimer, 5); beep(70, 0.5, 'sawtooth', 0.03, 40); }
  } else if (fx === 'ripple' && frame % 20 === 0) {
    particles.push({ x: Math.random() * W, y: Math.random() * H, vx: 0.3, vy: 0, life: 40, color: '#5da3cc' });
  } else if (fx === 'drip' && frame % 30 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: 0, vy: 3 + Math.random(), life: 90, color: '#73eff7' });
  } else if (fx === 'sand' && frame % 3 === 0) {
    particles.push({ x: -4, y: Math.random() * H, vx: 3 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.6, life: 80, color: '#c9a95e' });
  } else if (fx === 'dust' && frame % 18 === 0) {
    particles.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.4, vy: -0.2, life: 60, color: '#8a83a3' });
  } else if ((fx === 'ember' || fx === 'ember2') && frame % (fx === 'ember2' ? 3 : 6) === 0) {
    particles.push({
      x: Math.random() * W, y: H + 4,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.8,
      life: 40 + Math.random() * 30,
      color: Math.random() < 0.5 ? PALETTE.O : PALETTE.R,
    });
  } else if (fx === 'snow' && frame % 6 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.7 + Math.random() * 0.6, life: 110, color: '#f4f4f4' });
  } else if (fx === 'aurora') {
    if (frame % 6 === 0) {
      particles.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.7 + Math.random() * 0.6, life: 110, color: '#f4f4f4' });
    }
    if (frame % 8 === 0) {
      particles.push({ x: Math.random() * W, y: Math.random() * 60, vx: 1 + Math.random(), vy: 0, life: 50, color: Math.random() < 0.5 ? '#73eff7' : '#38b764' });
    }
  } else if (fx === 'bubble2' && frame % 8 === 0) {
    particles.push({ x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 0.4, vy: -0.8 - Math.random() * 0.7, life: 80, color: '#73eff7' });
  } else if (fx === 'miasma' && frame % 6 === 0) {
    particles.push({
      x: Math.random() * W, y: H + 4,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.8,
      life: 40 + Math.random() * 30,
      color: Math.random() < 0.5 ? PALETTE.p : PALETTE.P,
    });
  } else if (fx === 'hellfire') {
    if (frame % 3 === 0) {
      particles.push({
        x: Math.random() * W, y: H + 4,
        vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random(),
        life: 40 + Math.random() * 30,
        color: Math.random() < 0.6 ? PALETTE.R : PALETTE.O,
      });
    }
  } else if (fx === 'feather' && frame % 16 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.4, life: 130, color: '#f4f4f4' });
  } else if (fx === 'star' && frame % 90 === 0) {
    particles.push({ x: Math.random() * W, y: -4, vx: 2.5 + Math.random() * 2, vy: 1.5 + Math.random(), life: 30, color: '#f4f4f4' });
  } else if (fx === 'gstar' && frame % 30 === 0) {
    particles.push({
      x: Math.random() * W, y: -4,
      vx: 2 + Math.random() * 2, vy: 1.2 + Math.random(),
      life: 35, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    });
  } else if (fx === 'warp' && frame % 3 === 0) {
    // すべてが中心に吸い込まれていく
    const a = Math.random() * Math.PI * 2;
    const d = 180 + Math.random() * 120;
    const x = W / 2 + Math.cos(a) * d;
    const y = H / 2 + Math.sin(a) * d;
    particles.push({ x, y, vx: -Math.cos(a) * 2.2, vy: -Math.sin(a) * 2.2, life: 70, color: Math.random() < 0.3 ? '#8b4f8b' : '#566c86' });
  } else if (fx === 'dimension' && frame % 3 === 0) {
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 200;
    particles.push({
      x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d,
      vx: Math.cos(a + Math.PI / 2) * 1.8, vy: Math.sin(a + Math.PI / 2) * 1.8,
      life: 40, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    });
  }
}

// ---------- 描画 ----------
function drawText(text, x, y, color = '#f4f4f4', size = 10) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "MS Gothic", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawCenteredText(text, y, color = '#f4f4f4', size = 10) {
  ctx.font = `${size}px "MS Gothic", monospace`;
  const w = ctx.measureText(text).width;
  drawText(text, (W - w) / 2, y, color, size);
}

function drawWeapon() {
  const weapon = WEAPONS[weaponIdx];
  const pc = playerCenter();
  for (let b = 0; b < weapon.blades; b++) {
    const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
    const color = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2) % RAINBOW.length] : weapon.color;
    const edge = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2 + 3) % RAINBOW.length] : weapon.edge;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.rotate(a);
    const kind = weapon.kind || 'blade';
    if (kind === 'club') {
      // こん棒・鉄棒: 太い棒＋先が丸い
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      ctx.fillRect(14, -weapon.width / 2, weapon.len - 18, weapon.width);
      ctx.fillRect(weapon.len - 8, -weapon.width / 2 - 2, 8, weapon.width + 4);
      ctx.fillStyle = edge;
      ctx.fillRect(weapon.len - 6, -weapon.width / 2 - 1, 4, 2);
    } else if (kind === 'chain') {
      // モーニングスター・鉄球: 鎖＋トゲつき鉄球
      ctx.fillStyle = '#94b0c2';
      for (let d = 12; d < weapon.len - weapon.ballR; d += 7) ctx.fillRect(d, -1, 4, 3);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(weapon.len, 0, weapon.ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = edge;
      for (let s = 0; s < 6; s++) {
        const sa = (Math.PI * 2 * s) / 6 + gframe * 0.1;
        ctx.fillRect(weapon.len + Math.cos(sa) * weapon.ballR - 1, Math.sin(sa) * weapon.ballR - 1, 3, 3);
      }
    } else if (kind === 'trident') {
      // 三又の鉾: 柄＋3本の穂先
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, weapon.len - 22, 4);
      ctx.fillStyle = color;
      ctx.fillRect(weapon.len - 16, -6, 4, 12);
      ctx.fillRect(weapon.len - 12, -7, 12, 3);
      ctx.fillRect(weapon.len - 12, -1, 14, 3);
      ctx.fillRect(weapon.len - 12, 5, 12, 3);
      ctx.fillStyle = edge;
      ctx.fillRect(weapon.len - 2, -1, 4, 3);
    } else if (kind === 'scimitar') {
      // 半月刀: 曲がった刃
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      for (let d = 0; d < weapon.len - 16; d += 3) {
        const curve = Math.sin((d / (weapon.len - 16)) * Math.PI) * 7;
        ctx.fillRect(14 + d, -weapon.width / 2 - curve, 4, weapon.width);
      }
      ctx.fillStyle = edge;
      for (let d = 0; d < weapon.len - 16; d += 3) {
        const curve = Math.sin((d / (weapon.len - 16)) * Math.PI) * 7;
        ctx.fillRect(14 + d, -weapon.width / 2 - curve, 4, 2);
      }
    } else if (kind === 'bow') {
      // 弓・クロスボウ: 弧＋弦
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(weapon.len - 14, 0, 12, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(weapon.len - 14 + Math.cos(-Math.PI / 2.2) * 12, Math.sin(-Math.PI / 2.2) * 12);
      ctx.lineTo(weapon.len - 14 + Math.cos(Math.PI / 2.2) * 12, Math.sin(Math.PI / 2.2) * 12);
      ctx.stroke();
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, weapon.len - 20, 4);
    } else if (kind === 'sling') {
      // パチンコ: Y字の棒
      ctx.fillStyle = color;
      ctx.fillRect(8, -2, weapon.len - 18, 4);
      ctx.fillRect(weapon.len - 12, -8, 4, 8);
      ctx.fillRect(weapon.len - 12, 0, 4, 8);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(weapon.len - 10, -7);
      ctx.lineTo(weapon.len - 4, 0);
      ctx.lineTo(weapon.len - 10, 7);
      ctx.stroke();
    } else if (kind === 'gun') {
      // マシンガン・レーザー: 銃身＋マズルフラッシュ
      ctx.fillStyle = color;
      ctx.fillRect(10, -3, weapon.len - 14, 6);
      ctx.fillStyle = edge;
      ctx.fillRect(weapon.len - 8, -2, 8, 4);
      ctx.fillStyle = '#743f39';
      ctx.fillRect(14, 3, 5, 7);
      if (shootTimer > (weapon.shoot.interval - 3)) {
        ctx.fillStyle = '#ffcd75';
        ctx.fillRect(weapon.len, -4, 6, 8);
      }
    } else if (kind === 'cannon') {
      // 大砲: 太い砲身
      ctx.fillStyle = color;
      ctx.fillRect(8, -weapon.width / 2, weapon.len - 10, weapon.width);
      ctx.fillStyle = edge;
      ctx.fillRect(weapon.len - 6, -weapon.width / 2 - 2, 6, weapon.width + 4);
      if (shootTimer > (weapon.shoot.interval - 4)) {
        ctx.fillStyle = '#ef7d57';
        ctx.fillRect(weapon.len, -5, 8, 10);
      }
    } else if (kind === 'boomer') {
      // ブーメラン: くの字
      ctx.fillStyle = color;
      ctx.fillRect(weapon.len - 18, -2, 16, 4);
      ctx.fillRect(weapon.len - 6, -14, 4, 16);
      ctx.fillStyle = edge;
      ctx.fillRect(weapon.len - 18, -2, 16, 1);
    } else if (weapon.saber) {
      // ライトセーバー: 光る刃（3層の光）
      ctx.fillStyle = '#94b0c2';
      ctx.fillRect(8, -3, 10, 6);
      ctx.fillStyle = 'rgba(115, 239, 247, 0.25)';
      ctx.fillRect(18, -weapon.width / 2 - 4, weapon.len - 18, weapon.width + 8);
      ctx.fillStyle = 'rgba(115, 239, 247, 0.6)';
      ctx.fillRect(18, -weapon.width / 2 - 1, weapon.len - 18, weapon.width + 2);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(18, -weapon.width / 2 + 1, weapon.len - 18, Math.max(2, weapon.width - 2));
    } else {
      // 通常の刃（剣・槍など）
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, weapon.width);
      ctx.fillStyle = edge;
      ctx.fillRect(14, -weapon.width / 2, weapon.len - 14, Math.max(1, weapon.width / 4));
      ctx.fillRect(weapon.len - 3, -weapon.width / 2 - 1, 4, weapon.width + 2);
      if (kind === 'spear') {
        ctx.fillStyle = edge;
        ctx.fillRect(weapon.len - 8, -weapon.width / 2 - 3, 8, weapon.width + 6);
      }
    }
    if (weapon.flame && state === 'playing') {
      for (let i = 0; i < 4; i++) {
        const fx2 = 18 + Math.random() * (weapon.len - 22);
        ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
        ctx.fillRect(fx2, -weapon.width / 2 - 3 - Math.random() * 3, 2, 3);
      }
    }
    if (weapon.lightning && state === 'playing' && Math.random() < 0.5) {
      const fx2 = 18 + Math.random() * (weapon.len - 22);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(fx2, weapon.width / 2 + Math.random() * 4, 2, 2);
    }
    if (weapon.ice && state === 'playing' && Math.random() < 0.4) {
      const fx2 = 18 + Math.random() * (weapon.len - 22);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(fx2, -weapon.width / 2 - 2 - Math.random() * 3, 1, 1);
    }
    ctx.restore();
  }
}

// ---------- 背景＋ステージ装飾（20ステージそれぞれ見た目がはっきり変わる） ----------
function drawBackground() {
  const st = state === 'title' ? STAGES[16] : currentStage();
  ctx.fillStyle = st.bg;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // 共通のきらめきドット
  for (let i = 0; i < 50; i++) {
    const tw = Math.floor((gframe / 12 + i) % 3);
    ctx.fillStyle = tw === 0 ? st.dot : st.dot + '66';
    ctx.fillRect((i * 53) % W, (i * 97) % H, 2, 2);
  }

  // ステージ固有の地面かざり（位置は固定・決定的に配置）
  const deco = st.deco;
  for (let i = 0; i < 28; i++) {
    const x = (i * 131 + 40) % W;
    const y = (i * 79 + 25) % H;
    ctx.fillStyle = st.dot;
    if (deco === 'grass') {
      // 草のふさ＋ときどき花
      ctx.fillRect(x, y, 1, 4); ctx.fillRect(x + 2, y - 2, 1, 6); ctx.fillRect(x + 4, y, 1, 4);
      if (i % 6 === 0) { ctx.fillStyle = '#ff77a8'; ctx.fillRect(x + 2, y - 4, 2, 2); }
    } else if (deco === 'jungle') {
      // 大きな葉
      ctx.fillRect(x, y, 6, 2); ctx.fillRect(x + 2, y - 2, 2, 6);
      if (i % 5 === 0) { ctx.fillStyle = '#1a3a1c'; ctx.fillRect(x - 4, y + 4, 14, 8); }
    } else if (deco === 'swamp') {
      // ぬまの水たまり＋あし
      if (i % 3 === 0) { ctx.fillStyle = '#2c351c'; ctx.fillRect(x - 4, y, 16, 6); }
      else { ctx.fillRect(x, y - 4, 1, 8); ctx.fillRect(x + 3, y - 6, 1, 10); }
    } else if (deco === 'storm') {
      // 風になびく草
      ctx.fillRect(x, y, 4, 1); ctx.fillRect(x + 3, y - 2, 4, 1);
    } else if (deco === 'lake') {
      // 波紋
      ctx.strokeStyle = st.dot;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 4 + ((gframe / 20 + i) % 4), 0, Math.PI);
      ctx.stroke();
    } else if (deco === 'cave') {
      // クリスタル
      if (i % 4 === 0) { ctx.fillStyle = '#73eff7'; ctx.fillRect(x, y, 2, 4); ctx.fillRect(x + 1, y - 2, 1, 2); }
      else { ctx.fillStyle = '#0b2229'; ctx.fillRect(x, y, 10, 5); }
    } else if (deco === 'desert') {
      // 砂丘のうねり＋サボテン
      ctx.fillRect(x - 4, y, 12, 1); ctx.fillRect(x, y + 1, 8, 1);
      if (i % 7 === 0) { ctx.fillStyle = '#38b764'; ctx.fillRect(x, y - 6, 2, 7); ctx.fillRect(x - 2, y - 4, 2, 2); }
    } else if (deco === 'ruins') {
      // くずれた柱・レンガ
      if (i % 3 === 0) { ctx.fillStyle = '#5a5470'; ctx.fillRect(x, y - 8, 6, 10); ctx.fillRect(x - 1, y - 9, 8, 2); }
      else ctx.fillRect(x, y, 5, 3);
    } else if (deco === 'volcano') {
      // ひび割れ
      ctx.fillRect(x, y, 6, 1); ctx.fillRect(x + 5, y + 1, 4, 1);
      if (i % 4 === 0) { ctx.fillStyle = '#ef7d57'; ctx.fillRect(x + 3, y, 2, 2); }
    } else if (deco === 'lava') {
      // ようがんのプール（明滅する）
      const glow = (Math.floor(gframe / 20) + i) % 2 === 0;
      ctx.fillStyle = glow ? '#ef7d57' : '#b13e53';
      ctx.fillRect(x - 3, y, 12, 5);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(x + (i % 5), y + 1, 2, 2);
    } else if (deco === 'iceberg') {
      // 氷のかたまり
      ctx.fillStyle = '#bfe3f5';
      ctx.fillRect(x, y, 6, 4); ctx.fillRect(x + 2, y - 3, 3, 3);
    } else if (deco === 'iceworld') {
      // 氷の結晶
      ctx.fillStyle = '#73eff7';
      ctx.fillRect(x - 2, y, 6, 1); ctx.fillRect(x, y - 2, 1, 6); ctx.fillRect(x + 1, y + 1, 1, 1);
    } else if (deco === 'sea') {
      // サンゴ＋海藻
      if (i % 3 === 0) { ctx.fillStyle = '#ff77a8'; ctx.fillRect(x, y, 2, 4); ctx.fillRect(x + 3, y - 2, 2, 6); }
      else { ctx.fillStyle = '#38b764'; ctx.fillRect(x + ((gframe / 30 + i) % 2), y - 4, 1, 8); }
    } else if (deco === 'makai') {
      // 紫のトゲ岩
      ctx.fillStyle = '#5d275d';
      ctx.fillRect(x, y, 3, 6); ctx.fillRect(x + 1, y - 3, 1, 3);
    } else if (deco === 'hell') {
      // ほのおのひび＋ほね
      ctx.fillStyle = '#b13e53';
      ctx.fillRect(x, y, 8, 1);
      if (i % 5 === 0) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, y - 3, 4, 1); ctx.fillRect(x + 1, y - 5, 1, 3); }
    } else if (deco === 'heaven') {
      // 雲
      ctx.fillStyle = 'rgba(244,244,244,0.35)';
      ctx.fillRect(x - 5, y, 16, 4); ctx.fillRect(x - 2, y - 2, 10, 2);
    } else if (deco === 'space') {
      ctx.fillStyle = i % 4 === 0 ? '#f4f4f4' : st.dot;
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    } else if (deco === 'galaxy') {
      ctx.fillStyle = RAINBOW[i % RAINBOW.length] + '88';
      ctx.fillRect(x, y, 2, 2);
      if (i % 6 === 0) { ctx.fillStyle = '#8b4f8b44'; ctx.fillRect(x - 6, y - 3, 16, 8); }
    } else if (deco === 'hole') {
      // ブラックホールに吸いこまれる線
      const a = Math.atan2(H / 2 - y, W / 2 - x);
      ctx.strokeStyle = '#26263a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
      ctx.stroke();
    } else if (deco === 'multi') {
      // 異次元のゆらめき
      ctx.fillStyle = RAINBOW[(i + Math.floor(gframe / 15)) % RAINBOW.length] + '55';
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // ブラックホールの中心
  if (deco === 'hole') {
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 26 + Math.sin(gframe * 0.05) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b4f8b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // 多次元宇宙は回る虹のリング
  if (deco === 'multi') {
    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = RAINBOW[(r * 2 + Math.floor(gframe / 10)) % RAINBOW.length] + '44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 60 + r * 55 + Math.sin(gframe * 0.03 + r) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ---------- ボスの弾の描画 ----------
// 巨大弾のオーラ: 回転する衝撃波リング＋発光コア＋まとわりつく稲妻
function drawGiantAura(f) {
  const pulse = Math.sin(gframe * 0.3) * 5;
  const ringColors = ['rgba(255,205,117,0.75)', 'rgba(239,125,87,0.55)', 'rgba(244,244,244,0.35)'];
  for (let r = 0; r < 3; r++) {
    ctx.strokeStyle = ringColors[r];
    ctx.lineWidth = 4 - r;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 46 + r * 8 + pulse, f.rot * (r % 2 === 0 ? 1.5 : -1.5), f.rot * (r % 2 === 0 ? 1.5 : -1.5) + Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 205, 117, 0.14)';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 54 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 250, 210, 0.28)';
  ctx.beginPath();
  ctx.arc(f.x, f.y, 32, 0, Math.PI * 2);
  ctx.fill();
  if (Math.random() < 0.6) {
    ctx.strokeStyle = Math.random() < 0.5 ? '#f4f4f4' : '#ffcd75';
    ctx.lineWidth = 2;
    const a0 = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a0) * 18, f.y + Math.sin(a0) * 18);
    ctx.lineTo(f.x + Math.cos(a0 + 0.5) * 38, f.y + Math.sin(a0 + 0.5) * 38);
    ctx.lineTo(f.x + Math.cos(a0 + 0.9) * 54, f.y + Math.sin(a0 + 0.9) * 54);
    ctx.stroke();
  }
}

function drawFireball(f) {
  const scale = f.giant ? 4 : 1; // 巨大な一撃は10倍サイズ（面積比）
  if (f.giant) drawGiantAura(f);
  if (f.kind === 'bolt') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.strokeStyle = Math.random() < 0.4 ? '#f4f4f4' : '#ffcd75';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-10 * scale, 0);
    ctx.lineTo(-3 * scale, -4 * scale);
    ctx.lineTo(3 * scale, 4 * scale);
    ctx.lineTo(10 * scale, 0);
    ctx.stroke();
    ctx.restore();
  } else if (f.kind === 'sword') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang + f.rot);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(-8, -2, 13, 4);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-8, -2, 13, 1);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(3, -4, 2, 8);
    ctx.fillStyle = '#743f39';
    ctx.fillRect(5, -1, 4, 2);
    ctx.restore();
  } else if (f.kind === 'spear') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(-12, -1, 20, 3);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(8, -3, 6, 6);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(12, -1, 4, 3);
    ctx.restore();
  } else if (f.kind === 'wind') {
    // 風の三日月
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.strokeStyle = Math.random() < 0.5 ? '#73eff7' : '#f4f4f4';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 7 * scale, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();
    ctx.restore();
  } else if (f.kind === 'trident') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(-10, -1, 16, 3);
    ctx.fillRect(4, -5, 3, 11);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(7, -5, 6, 2);
    ctx.fillRect(7, 0, 8, 2);
    ctx.fillRect(7, 4, 6, 2);
    ctx.restore();
  } else if (f.kind === 'ice') {
    // 氷のダイヤ
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang + gframe * 0.1);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#73eff7';
    ctx.fillRect(-5, -2, 10, 4);
    ctx.fillRect(-2, -5, 4, 10);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  } else if (f.kind === 'hammer') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#743f39';
    ctx.fillRect(-1, 0, 3, 12);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(-7, -8, 15, 9);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-7, -8, 15, 2);
    ctx.restore();
  } else if (f.kind === 'scythe') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#94b0c2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, -Math.PI / 1.6, Math.PI / 3);
    ctx.stroke();
    ctx.fillStyle = '#743f39';
    ctx.fillRect(-1, -2, 2, 12);
    ctx.restore();
  } else if (f.kind === 'fang') {
    // 牙（白い三角）
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (f.kind === 'snake') {
    // ヘビ（うねりながら飛ぶ）
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#38b764';
    for (let s = 0; s < 4; s++) {
      ctx.fillRect(-9 + s * 5, Math.sin(gframe * 0.3 + s) * 3 - 2, 5, 4);
    }
    ctx.fillStyle = '#b13e53';
    ctx.fillRect(9, Math.sin(gframe * 0.3 + 4) * 3 - 1, 3, 2);
    ctx.restore();
  } else if (f.kind === 'light') {
    // 光球
    const r = 6 * scale;
    ctx.fillStyle = 'rgba(255, 205, 117, 0.35)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcd75';
    ctx.beginPath();
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 炎の球（デフォルト）
    const cols = f.colors || ['#b13e53', '#ef7d57', '#ffcd75'];
    ctx.fillStyle = cols[0];
    ctx.fillRect(Math.round(f.x) - 5 * scale, Math.round(f.y) - 5 * scale, 10 * scale, 10 * scale);
    ctx.fillStyle = cols[1];
    ctx.fillRect(Math.round(f.x) - 3 * scale, Math.round(f.y) - 3 * scale, 6 * scale, 6 * scale);
    ctx.fillStyle = cols[2];
    ctx.fillRect(Math.round(f.x) - 1 * scale, Math.round(f.y) - 1 * scale, 3 * scale, 3 * scale);
  }
}

// ---------- プレイヤーの弾の描画 ----------
function drawPShot(f) {
  if (f.kind === 'flame') {
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
    ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 3, 6, 6);
    ctx.fillStyle = PALETTE.R;
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  } else if (f.kind === 'pellet') {
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 4, 4);
  } else if (f.kind === 'arrow' || f.kind === 'javelin') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    ctx.fillStyle = f.kind === 'javelin' ? '#94b0c2' : '#a77b5b';
    ctx.fillRect(-8, -1, 12, 2);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(4, -2, 5, 4);
    ctx.restore();
  } else if (f.kind === 'bullet') {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 1, 4, 3);
  } else if (f.kind === 'cannonball') {
    ctx.fillStyle = '#333c57';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef7d57';
    ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 6, 3, 3);
  } else if (f.kind === 'laser') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    ctx.fillStyle = 'rgba(115, 239, 247, 0.4)';
    ctx.fillRect(-10, -3, 20, 6);
    ctx.fillStyle = '#73eff7';
    ctx.fillRect(-9, -1, 18, 3);
    ctx.restore();
  } else if (f.kind === 'boomerang') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(-7, -2, 12, 4);
    ctx.fillRect(1, -10, 4, 12);
    ctx.restore();
  }
}

function render() {
  ctx.save();
  // 画面シェイクはプレイ中のみ（ゲームオーバー画面では揺らさない）
  if (shakeTimer > 0 && state === 'playing') {
    const s = Math.min(shakeTimer, 8);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  drawBackground();

  if (state === 'title') { renderTitle(); ctx.restore(); return; }
  if (state === 'tally') { renderTally(); ctx.restore(); return; }
  if (state === 'shop') { renderShop(); ctx.restore(); return; }
  if (state === 'clear') { renderClear(); ctx.restore(); return; }

  // ハートアイテム
  for (const it of items) {
    if (it.life > 120 || Math.floor(it.life / 6) % 2 === 0) {
      drawSprite('heart', it.x - 7, it.y - 6, 2);
    }
  }

  // パーティクル
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }

  // 衝撃波リング
  for (const s of shockwaves) {
    ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lw;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 雷の連鎖ボルト
  for (const b of bolts) {
    ctx.strokeStyle = Math.random() < 0.5 ? '#ffcd75' : '#f4f4f4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 16;
    const my = (b.y1 + b.y2) / 2 + (Math.random() - 0.5) * 16;
    ctx.lineTo(mx, my);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }

  // プレイヤーの弾
  for (const f of pshots) drawPShot(f);

  // ボスの弾
  for (const f of fireballs) drawFireball(f);

  // ふみつけ攻撃の着地予告の影
  for (const e of enemies) {
    if (e.boss && e.act && e.act.kind === 'stomp' && e.airborne) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(e.act.tx, e.act.ty, 55, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b13e53';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (Math.floor(gframe / 8) % 2 === 0) drawText('！', e.act.tx - 4, e.act.ty - 8, '#b13e53', 16);
    }
  }

  // 敵（ボスは神様ごとの専用スプライト＋ふわふわ浮遊、凍結中は青いオーバーレイ）
  for (const e of enemies) {
    if (e.airborne) continue; // 空中に飛び上がったボスは描かない（影だけ）
    if (!e.boss && e.hitTimer > 0 && Math.floor(frame / 3) % 2 === 0) continue;
    const sname = e.boss ? e.type.sprite : e.sprite;
    const spr = SPRITES[sname];
    const scale = e.size / spr.length;
    const offX = (e.size - spr[0].length * scale) / 2;
    const bob = e.boss ? Math.sin(gframe * 0.08) * 3 : 0;
    // ボスのアクション演出: のけぞり・しゃがみこみ・震え・残像
    let dxv = 0, dyv = bob, sxv = 1, syv = 1;
    if (e.boss) {
      if (e.speedCharge > 0) {
        // 加速のため中はブルブル震える
        dxv += (Math.random() - 0.5) * 5;
        dyv += (Math.random() - 0.5) * 4;
      }
      if (e.act) {
        const a = e.act;
        const tel = a.kind === 'dive' ? 30 : 35;
        if ((a.kind === 'punch' || a.kind === 'dive') && a.t < tel) {
          // 大きくのけぞって力をためる（突進の反対方向へ体が下がる）
          const pcr = playerCenter();
          const ang = Math.atan2(pcr.y - (e.y + e.size / 2), pcr.x - (e.x + e.size / 2));
          const k = (a.t / tel) * 16;
          dxv -= Math.cos(ang) * k;
          dyv -= Math.sin(ang) * k;
          sxv = syv = 1 + (a.t / tel) * 0.06;
        } else if (a.kind === 'stomp' && a.t < 22) {
          // ぐっとしゃがみこむ（体がつぶれる）
          syv = 1 - 0.2 * (a.t / 22);
          sxv = 1 + 0.14 * (a.t / 22);
          dyv += e.size * 0.1 * (a.t / 22);
        }
        // 突進中の残像
        if (a.trail) {
          for (let ti = 0; ti < a.trail.length; ti++) {
            ctx.globalAlpha = 0.1 + ti * 0.07;
            drawSprite(sname, a.trail[ti].x + offX, a.trail[ti].y + bob, scale, e.type.remap);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    if (sxv !== 1 || syv !== 1) {
      const cx0 = e.x + e.size / 2 + dxv;
      const cy0 = e.y + e.size / 2 + dyv;
      ctx.save();
      ctx.translate(cx0, cy0);
      ctx.scale(sxv, syv);
      ctx.translate(-cx0, -cy0);
      drawSprite(sname, e.x + offX + dxv, e.y + dyv, scale, e.boss ? e.type.remap : null);
      ctx.restore();
    } else {
      drawSprite(sname, e.x + offX + dxv, e.y + dyv, scale, e.boss ? e.type.remap : null);
    }
    if (e.slowTimer > 0) {
      ctx.fillStyle = 'rgba(65, 166, 246, 0.35)';
      ctx.fillRect(e.x + offX, e.y + bob, spr[0].length * scale, spr.length * scale);
    }
    if (e.boss) {
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      // 巨大弾チャージ中は赤い照準ラインがプレイヤーへのびる（にげろ！のサイン）
      if (e.giantCharge > 0) {
        const pcg = playerCenter();
        ctx.strokeStyle = `rgba(177, 62, 83, ${0.35 + Math.sin(gframe * 0.5) * 0.25})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ecx, e.y + e.size * 0.55);
        ctx.lineTo(pcg.x, pcg.y);
        ctx.stroke();
      }
      // なぎはらい: 予告の点線リング → 回転する斬撃アーク
      if (e.act && e.act.kind === 'tail') {
        const r = e.size * 0.72;
        if (e.act.t < 30) {
          ctx.strokeStyle = `rgba(177, 62, 83, ${0.4 + Math.sin(gframe * 0.5) * 0.3})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(ecx, ecy + bob, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (e.act.t < 75) {
          ctx.lineWidth = 8;
          ctx.strokeStyle = e.type.aura;
          ctx.beginPath();
          ctx.arc(ecx, ecy + bob, r, e.act.sweep - 1.3, e.act.sweep);
          ctx.stroke();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#f4f4f4';
          ctx.beginPath();
          ctx.arc(ecx, ecy + bob, r, e.act.sweep - 0.7, e.act.sweep);
          ctx.stroke();
        }
      }
      // 激怒中は赤いオーラで包まれる
      if (e.raged) {
        ctx.strokeStyle = `rgba(177, 62, 83, ${0.4 + Math.sin(gframe * 0.2) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ecx, ecy + bob, e.size * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      // シールド展開中は青いバリア
      if (e.type.gimmicks.includes('shield') && bossShielded(e)) {
        ctx.strokeStyle = `rgba(65, 166, 246, ${0.5 + Math.sin(gframe * 0.3) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ecx, ecy + bob, e.size * 0.6 + Math.sin(gframe * 0.15) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(65, 166, 246, 0.08)';
        ctx.fill();
      }
      // 弱点コア（虹色に光る球。ここをねらえ！）
      if (e.type.gimmicks.includes('weakpoint')) {
        const core = bossCorePos(e);
        const pulse = 8 + Math.sin(gframe * 0.25) * 3;
        ctx.fillStyle = 'rgba(255, 205, 117, 0.3)';
        ctx.beginPath();
        ctx.arc(core.x, core.y, pulse * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
        ctx.beginPath();
        ctx.arc(core.x, core.y, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4f4f4';
        ctx.beginPath();
        ctx.arc(core.x, core.y, pulse * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawWeapon();

  // プレイヤー（武器レベルで見た目が進化）
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    const form = FORMS[formIdx];
    drawSprite(form.sprite, player.x, player.y, 3, playerRemap());
    // 上位フォームはキラキラのオーラをまとう
    if (formIdx >= 4 && frame % 4 === 0) {
      particles.push({
        x: player.x + Math.random() * PLAYER_SIZE,
        y: player.y + PLAYER_SIZE,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.5,
        life: 14,
        color: formIdx === 5 ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : '#ffcd75',
      });
    }
    if (playerSlowT > 0) {
      ctx.fillStyle = 'rgba(115, 239, 247, 0.35)';
      ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }
    if (playerName) {
      ctx.font = '9px "MS Gothic", monospace';
      const nw = ctx.measureText(playerName).width;
      drawText(playerName, player.x + PLAYER_SIZE / 2 - nw / 2, player.y - 12, '#ffcd75', 9);
    }
  }

  // ポップアップ
  for (const p of popups) {
    drawText(p.text, p.x - 10, p.y, p.color, p.size);
  }

  renderHUD();

  // 全画面フラッシュ
  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 250, 210, ${(flashTimer / 25) * 0.55})`;
    ctx.fillRect(-8, -8, W + 16, H + 16);
  }

  // 一時停止中の画面
  if (paused && state === 'playing') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(-8, -8, W + 16, H + 16);
    drawCenteredText('いちじていし', 140, '#ffcd75', 28);
    drawCenteredText('Pキー か がめんクリックで さいかい', 185, '#f4f4f4', 13);
  }

  if (state === 'gameover') renderGameover();

  ctx.restore();
}

function renderHUD() {
  drawText(`スコア ${score}`, 6, 6, '#f4f4f4', 13);
  const wp = WEAPONS[weaponIdx];
  drawText(`ぶき: ${wp.name} (${weaponIdx + 1}/30)`, 6, 24, wp.rainbow || wp.saber ? RAINBOW[Math.floor(gframe / 6) % RAINBOW.length] : wp.color, 13);
  drawText(`ステージ${stage}/${LAST_STAGE} ${currentStage().name}`, 6, 42, '#94b0c2', 11);
  // ゴールド
  ctx.fillStyle = '#ffcd75';
  ctx.beginPath();
  ctx.arc(11, 88, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a77b5b';
  ctx.beginPath();
  ctx.arc(11, 88, 3, 0, Math.PI * 2);
  ctx.fill();
  drawText(`${gold}`, 20, 82, '#ffcd75', 12);
  for (let i = 0; i < lives; i++) drawSprite('heart', W - 18 - i * 17, 6, 2);

  // 一時停止ボタン（クリック or Pキー）
  ctx.fillStyle = 'rgba(26, 28, 44, 0.7)';
  ctx.fillRect(W - 30, 26, 24, 24);
  ctx.strokeStyle = '#94b0c2';
  ctx.lineWidth = 1;
  ctx.strokeRect(W - 30, 26, 24, 24);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(W - 24, 32, 4, 12);
  ctx.fillRect(W - 17, 32, 4, 12);

  // 必殺技ゲージ
  const gaugeW = 90;
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(5, 58, gaugeW + 2, 9);
  ctx.fillStyle = '#29366f';
  ctx.fillRect(6, 59, gaugeW, 7);
  ctx.fillStyle = specialGauge >= 100 ? RAINBOW[Math.floor(gframe / 4) % RAINBOW.length] : '#ff77a8';
  ctx.fillRect(6, 59, gaugeW * (specialGauge / 100), 7);
  if (bossActive) {
    const left = Math.max(0, BOSS_SPECIAL_LIMIT - bossSpecialsUsed);
    drawText(`ひっさつ のこり${left}かい`, 6, 70, left === 0 ? '#566c86' : '#ff77a8', 10);
  }
  if (specialGauge >= 100 && Math.floor(gframe / 20) % 2 === 0 && !(bossActive && bossSpecialsUsed >= BOSS_SPECIAL_LIMIT)) {
    drawText('スペースキーで ひっさつわざ！', 6, 96, '#ffcd75', 11);
  }

  // コンボ表示
  if (combo >= 2 && comboTimer > 0) {
    const pulse = 16 + Math.sin(gframe * 0.3) * 2;
    drawCenteredText(`${combo} コンボ！`, 30, RAINBOW[combo % RAINBOW.length], pulse);
  }

  // ボスHPバー（分裂中は合計HP）
  const bosses = enemies.filter((e) => e.boss);
  if (bosses.length > 0) {
    const b0 = bosses[0];
    const hpSum = bosses.reduce((s, b) => s + Math.max(0, b.hp), 0);
    const hpMax = bosses.reduce((s, b) => s + b.maxHp, 0);
    const barW = 220;
    const ratio = Math.max(0, Math.min(1, hpSum / hpMax));
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(W / 2 - barW / 2 - 2, H - 26, barW + 4, 14);
    ctx.fillStyle = '#5d275d';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW, 10);
    ctx.fillStyle = ratio > 0.4 ? '#b13e53' : '#ef7d57';
    ctx.fillRect(W / 2 - barW / 2, H - 24, barW * ratio, 10);
    let label = b0.type.name;
    if (bosses.length > 1) label += ` ×${bosses.length}`;
    if (b0.type.gimmicks.includes('weakpoint')) label += '　ひかるコアをねらえ！';
    drawCenteredText(label, H - 40, '#b13e53', 12);
  }

  // WARNING演出（神様の名前と神話の出典つき）
  if (warningTimer > 0 && Math.floor(warningTimer / 15) % 2 === 0) {
    const bt = currentBossType();
    ctx.fillStyle = 'rgba(177,62,83,0.25)';
    ctx.fillRect(-8, H / 2 - 48, W + 16, 96);
    drawCenteredText('！！ WARNING ！！', H / 2 - 36, '#b13e53', 26);
    drawCenteredText(`${bt.origin}のかみ`, H / 2 - 2, '#94b0c2', 12);
    drawCenteredText(`${bt.name} しゅつげん！`, H / 2 + 14, '#ffcd75', 17);
  }

  // バナー
  if (bannerTimer > 0 && (bannerTimer > 30 || Math.floor(bannerTimer / 4) % 2 === 0)) {
    const pulse = 20 + Math.sin(gframe * 0.25) * 4;
    const bc = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
    drawCenteredText(bannerText, 58, bc, pulse);
  }
}

function renderTitle() {
  const c = RAINBOW[Math.floor(gframe / 8) % RAINBOW.length];
  const bob = Math.sin(gframe * 0.05) * 5;
  drawCenteredText('HAYATO GAME', 56 + bob, c, 38);
  drawCenteredText('やじるしキー：いどう / スペース：ひっさつわざ', 122, '#f4f4f4', 12);
  drawCenteredText('ぶきは 30だんかい しんか！ さいごは…ライトセーバー！？', 142, '#ef7d57', 12);
  drawCenteredText('ステージ20 × かみさまボス20たい！ 5ステージごとに おみせ！', 162, '#ff77a8', 12);
  if (Math.floor(gframe / 30) % 2 === 0) {
    drawCenteredText('ENTERキーでスタート！', 200, '#41a6f6', 18);
  }
  // カスタマイズ
  drawSprite('player', W / 2 - 60, 240, 3, playerRemap());
  drawText(`Cキー：いろかえ（${OUTFITS[outfitIdx].name}）`, W / 2 - 24, 246, '#94b0c2', 11);
  drawText(`Nキー：なまえ（${playerName || 'なし'}）`, W / 2 - 24, 262, '#94b0c2', 11);
  drawCenteredText('Mキー：おんがくON/OFF', 292, '#94b0c2', 10);
  if (highScore > 0) drawCenteredText(`ハイスコア: ${highScore}`, 310, '#ffcd75', 12);
  for (let i = 0; i < 4; i++) {
    const ex = ((gframe * 0.6 + i * 130) % (W + 60)) - 30;
    drawSprite(i === 3 ? 'enemyTank' : i % 2 === 0 ? 'enemy' : 'enemyFast', ex, 332, 3);
  }
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
}

// ---------- けっさん画面（5ステージごとの点数大カウント） ----------
function renderTally() {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(-8, -8, W + 16, H + 16);

  const bc = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
  drawCenteredText(`★ ステージ${tally.cleared} とうたつ けっさん！ ★`, 44, bc, 22);

  const prog = Math.min(1, tally.t / TALLY_COUNT_FRAMES);
  const eased = 1 - Math.pow(1 - prog, 3);
  const shown = Math.floor(tally.total * eased);
  const size = prog >= 1 ? 40 + Math.sin(gframe * 0.2) * 3 : 34;
  drawCenteredText(`${shown}`, 108, prog >= 1 ? '#ffcd75' : '#f4f4f4', size);
  drawCenteredText(`スコア ${tally.earned} ＋ ステージボーナス ${tally.bonus}`, 165, '#94b0c2', 12);

  if (prog >= 1) {
    drawCenteredText(`ゴールド +${tallyGold()} ゲット！`, 200, '#ffcd75', 20);
    if (Math.floor(gframe / 25) % 2 === 0) {
      drawCenteredText('ENTERキーで おみせへ！', 250, '#41a6f6', 15);
    }
  } else {
    drawCenteredText('カウントちゅう…（ENTERでスキップ）', 250, '#566c86', 11);
  }
}

// ---------- おみせ画面 ----------
function renderShop() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-8, -8, W + 16, H + 16);
  drawCenteredText('～ ぼうぐの おみせ ～', 16, '#ffcd75', 20);
  ctx.fillStyle = '#ffcd75';
  ctx.beginPath();
  ctx.arc(W / 2 - 40, 52, 6, 0, Math.PI * 2);
  ctx.fill();
  drawText(`もっているゴールド: ${gold}`, W / 2 - 28, 46, '#ffcd75', 13);

  const startY = 70;
  const rowH = 17;
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const item = SHOP_ITEMS[i];
    const y = startY + i * rowH;
    const sel = i === shopIdx;
    const owned = !item.repeat && gear[item.id];
    if (sel) {
      ctx.fillStyle = 'rgba(255, 205, 117, 0.18)';
      ctx.fillRect(30, y - 2, W - 60, rowH - 1);
      drawText('▶', 34, y, '#ffcd75', 12);
    }
    const nameColor = owned ? '#566c86' : (gold >= item.price ? '#f4f4f4' : '#7a8494');
    drawText(item.name, 52, y, nameColor, 12);
    drawText(owned ? 'そうびちゅう' : `${item.price}G`, 230, y, owned ? '#38b764' : nameColor, 12);
    if (sel) drawCenteredText(item.desc, H - 38, '#ffcd75', 12);
  }
  const exitY = startY + SHOP_ITEMS.length * rowH;
  if (shopIdx === SHOP_ITEMS.length) {
    ctx.fillStyle = 'rgba(255, 205, 117, 0.18)';
    ctx.fillRect(30, exitY - 2, W - 60, rowH - 1);
    drawText('▶', 34, exitY, '#ffcd75', 12);
  }
  drawText('おみせをでる（つぎのステージへ！）', 52, exitY, '#41a6f6', 12);

  drawCenteredText('↑↓キー：えらぶ / ENTER：かう / X：でる', H - 20, '#94b0c2', 11);
}

// ---------- ぜんクリア画面 ----------
function renderClear() {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-8, -8, W + 16, H + 16);
  const bc = RAINBOW[Math.floor(gframe / 6) % RAINBOW.length];
  drawCenteredText('☆★☆ ぜんステージクリア！！ ☆★☆', 70, bc, 24);
  drawCenteredText(`${playerName ? playerName + 'は' : 'きみは'} でんせつのゆうしゃだ！`, 118, '#ffcd75', 17);
  drawCenteredText(`さいしゅうスコア: ${score}`, 160, '#f4f4f4', 16);
  drawCenteredText(`さいだいコンボ: ${maxCombo} / とうたつぶき: ${WEAPONS[weaponIdx].name}`, 188, '#94b0c2', 12);
  drawCenteredText(`たおしたボス: ${bossCount}たい`, 208, '#94b0c2', 12);
  if (score >= highScore && score > 0) {
    drawCenteredText('★ハイスコアこうしん！★', 240, RAINBOW[Math.floor(gframe / 8) % RAINBOW.length], 16);
  }
  drawCenteredText('ENTERキーでタイトルにもどる', 280, '#41a6f6', 13);
}

function renderGameover() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(-8, -8, W + 16, H + 16);
  drawCenteredText('ゲームオーバー', 92, '#b13e53', 30);
  drawCenteredText(`${playerName ? playerName + 'の ' : ''}スコア: ${score}`, 148, '#f4f4f4', 16);
  drawCenteredText(`さいだいコンボ: ${maxCombo}  とうたつぶき: ${WEAPONS[weaponIdx].name}`, 175, '#94b0c2', 12);
  drawCenteredText(`ステージ${stage}/${LAST_STAGE}まで とうたつ  たおしたボス: ${bossCount}たい`, 195, '#94b0c2', 12);
  if (score >= highScore && score > 0) {
    drawCenteredText('★ハイスコアこうしん！★', 226, RAINBOW[Math.floor(gframe / 8) % RAINBOW.length], 18);
  } else {
    drawCenteredText(`ハイスコア: ${highScore}`, 226, '#ff77a8', 13);
  }
  drawCenteredText('ENTERキーでタイトルにもどる', 270, '#41a6f6', 13);
}

// ---------- メインループ ----------
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();
