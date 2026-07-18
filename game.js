// ============================================================
// HAYATO - 360度回転武器アクション
// 操作: 矢印キー（またはWASD）= 移動 / スペース = 必殺技（ゲージ満タン時）
//       Mキー = おんがくON/OFF / タイトルで C = いろかえ, N = なまえ
// 武器はスコアで30段階進化（ナイフ→…→ライトセーバー）
// ステージは全27種、ボスは神話・伝説の魔物たち27体
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
  V: '#381038', // 紫（影）
  H: '#b567b5', // 紫（ハイライト）
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
  // ===== プレイヤー（12x12・武器レベルで装備が6段階進化） =====
  player0: [ // ぼうけんしゃ: ふつうの服
    '...KKKKKK...',
    '..KKKKKKKK..',
    '..KYYYYYYK..',
    '..KYKYYKYK..',
    '..KYYYYYYK..',
    '...YYYYYY...',
    '...CCCCCC...',
    '..YCCCCCCY..',
    '..CCCCCCCC..',
    '...CCCCCC...',
    '...KK..KK...',
    '...KK..KK...',
  ],
  player1: [ // せんし: 赤いバンダナ＋革のベルト
    '...RRRRRR...',
    '..RRRRRRRR..',
    '..KYYYYYYKR.',
    '..KYKYYKYK..',
    '..KYYYYYYK..',
    '...YYYYYY...',
    '...CCCCCC...',
    '..YCCCCCCY..',
    '..CCTTTTCC..',
    '...CCCCCC...',
    '...KK..KK...',
    '...KK..KK...',
  ],
  player2: [ // ナイト: 銀のかぶと＋よろい＋左手に盾
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SSSSSSSS..',
    '..SYKYYKYS..',
    '..SSSSSSSS..',
    '...SSSSSS...',
    '..SCCCCCCS..',
    '.LLSCCCCCCS.',
    '.LLSCCCCCCS.',
    '...SSSSSS...',
    '...SS..SS...',
    '...KK..KK...',
  ],
  player3: [ // ゴールドナイト: 赤い前立ての白銀の兜＋金のよろい＋金の盾＋赤いマント
    '....RRRR....',
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SKKYYKKS..',
    '..SSSSSSSS..',
    '...SSSSSS...',
    '.RYCCCCCCYR.',
    '.YYCCCCCCYR.',
    '.YYCCCCCCYR.',
    '...YYYYYY.R.',
    '...YY..YY...',
    '...KK..KK...',
  ],
  player4: [ // ひかりのせんし: 赤の兜＋赤の盾のナイト
    '...RRRRRR...',
    '..RRRRRRRR..',
    '..RRRRRRRR..',
    '..RYKYYKYR..',
    '..RRRRRRRR..',
    '...RRRRRR...',
    '..RCCCCCCR..',
    '.RRSCCCCCCS.',
    '.RRSCCCCCCS.',
    '...SSSSSS...',
    '...SS..SS...',
    '...KK..KK...',
  ],
  player5: [ // でんせつのゆうしゃ: 青白く発光する白銀のよろい＋白銀のつばさ
    '..D.WWWW.D..',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '..WYKYYKYW..',
    '..WWWWWWWW..',
    'W..WWWWWW..W',
    'WW.CCCCCC.WW',
    'WWDCCCCCCDWW',
    'WW.CCCCCC.WW',
    'W..WWWWWW..W',
    '...WW..WW...',
    '...DD..DD...',
  ],
  player6: [ // せいなるゆうしゃ: 黄金の光輪＋金の縁取りの白銀よろい＋白いつばさ
    '...YYYYYY...',
    '..Y.WWWW.Y..',
    '...WWWWWW...',
    '..WYKYYKYW..',
    '..WWWWWWWW..',
    'W..WWWWWW..W',
    'WWYCCCCCCYWW',
    'WWYCCCCCCYWW',
    'W.YCCCCCCY.W',
    '...YYYYYY...',
    '...YY..YY...',
    '...KK..KK...',
  ],
  player7: [ // しんわのゆうしゃ: 虹色にきらめく星のかがやき＋伝説の白銀よろい
    '.M.D.YY.D.M.',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '..WYKYYKYW..',
    '..WWWWWWWW..',
    'D..WWWWWW..D',
    'MMDCCCCCCDMM',
    'MMDCCCCCCDMM',
    'M.DCCCCCCD.M',
    '...WWWWWW...',
    '...MM..MM...',
    '...DD..DD...',
  ],
  player8: [ // てんくうのおうじゃ: とがった黄金の王冠＋水色に光る大きなつばさ
    'Y..Y.YY.Y..Y',
    '.YYYYYYYYYY.',
    '..YYYYYYYY..',
    '..YYKYYKYY..',
    '..YYYYYYYY..',
    'C..WWWWWW..C',
    'CCWYYYYYYWCC',
    'CCWYCCCCYWCC',
    'C.WYCCCCYW.C',
    '..WYYYYYYW..',
    '...YY..YY...',
    '...WW..WW...',
  ],
  player9: [ // せいれいおう: 木のような緑のツノ冠＋左右にうかぶ光の玉＋すそが広がる精霊のローブ
    'G.G......G.G',
    '.GGG..GGG...',
    '..GGGGGGGG..',
    'D.GGKGGKGG.D',
    '..GGGGGGGG..',
    'D..gggggg..D',
    '.GggGGGGggG.',
    '.GggggggggG.',
    '..gggggggg..',
    '..ggg..ggg..',
    '..gg....gg..',
    '.gg......gg.',
  ],
  player10: [ // りゅうしんのゆうしゃ: 左右に大きくのびる竜のツノ＋赤いうろこの重よろい＋右にしっぽ
    'O..........O',
    'OO.YYYYYY.OO',
    '.OYYYYYYYYO.',
    '..YRKYYKRY..',
    '..YRRRRRRY..',
    '..RRRRRRRR..',
    'R.ROOOOOOR.R',
    'RRROOOOOORRR',
    '.RROOOOOORR.',
    '..RRRRRRRR..',
    '..RR..RR..RR',
    '..OO..OO....',
  ],
  player11: [ // そうせいのしんおう: 頭上の星の冠＋全身を囲む光のリング＋星がまたたく紫の宇宙ローブ
    '...M.YY.M...',
    '.D.YYYYYY.D.',
    'D..WWWWWW..D',
    'D.WYKYYKYW.D',
    'D..WWWWWW..D',
    'M..PPPPPP..M',
    '.MPPHHHHPPM.',
    '.PPPHHHHPPP.',
    'D.PPPPPPPP.D',
    '..PPPPPPPP..',
    '..PP.MM.PP..',
    '...M.HH.M...',
  ],
  player12: [ // ぜったいのかみ: 八方にのびる光のすじ＋金と白にかがやく究極の神身
    'Y..Y.WW.Y..Y',
    '.Y.YWWWWY.Y.',
    'Y.WWWWWWWW.Y',
    'Y.WYKYYKYW.Y',
    'Y.WWWWWWWW.Y',
    'YY.WWWWWW.YY',
    '.YWYYYYYYWY.',
    'Y.WYWWWWYW.Y',
    'YY.YYYYYY.YY',
    'Y.WWWWWWWW.Y',
    '.Y.YY..YY.Y.',
    'Y..WW..WW..Y',
  ],
  // かげのインプ: ツノ＋ピンクに光る目＋ゆらめく影の下半身（神話世界の小悪魔）
  enemy: [
    '..P......P..',
    '..PP....PP..',
    '...PPPPPP...',
    '..PPPPPPPP..',
    '..PMMPPMMP..',
    '..PPPPPPPP..',
    '.PPPPPPPPPP.',
    '.PPPPPPPPPP.',
    '..PPPPPPPP..',
    '..PP.PP.PP..',
    '...P..P..P..',
    '....P..P....',
  ],
  // ヘルハウンド: 炎をまとって走る魔犬（すばやい敵）
  enemyFast: [
    '...RR.......',
    '...RRR...O..',
    '..RRRRR.O...',
    '..RRRRRRRRR.',
    '.RRRRRRRRRR.',
    '.RYRRRRRRRR.',
    '.RWRRRRRRRR.',
    '..RRRRRRRR..',
    '..RRRRRRRR..',
    '..RR.RR.RR..',
    '.RR...RR....',
    '.OO....OO...',
  ],
  // ストーンゴーレム: 岩のひび＋緑に光るコア（かたい敵）
  enemyTank: [
    '....GGGGGGGG....',
    '...GGGGGGGGGG...',
    '...GGYYGGYYGG...',
    '...GGGGGGGGGG...',
    '..GGGGGGGGGGGG..',
    '.GGgGGGGGGGGgGG.',
    '.GGGGGDDGGGGGG..',
    '.GGGGDDDDGGGGG..',
    '.GGGGGDDGGGGGG..',
    '..GGGGGGGGGGGG..',
    '..GGgGGGGGGgGG..',
    '..GGGGGGGGGGGG..',
    '..GGGG....GGGG..',
    '..GGG......GGG..',
    '.GGGG......GGGG.',
    '.gggg......gggg.',
  ],
  // ダークバット: 夜の魔コウモリ（はばたき2コマ・すばやくジグザグ）
  darkbat: [ // つばさを ひろげた コマ
    '............',
    'KK........KK',
    'KKK......KKK',
    'KKKK....KKKK',
    '.KKKKKKKKKK.',
    '.KRKKKKKKRK.',
    '.KKKKKKKKKK.',
    '..KKKKKKKK..',
    '...KK..KK...',
    '............',
    '............',
    '............',
  ],
  darkbat2: [ // つばさを おろした コマ
    '............',
    '............',
    '..KKKKKKKK..',
    '.KKKKKKKKKK.',
    '.KRKKKKKKRK.',
    '.KKKKKKKKKK.',
    'KKKK....KKKK',
    'KKK......KKK',
    'KK........KK',
    '...KK..KK...',
    '............',
    '............',
  ],
  // ポイズンスライム: どくのねばねばスライム（たおすと2ひきに分裂）
  poisonslime: [
    '............',
    '...GGGGGG...',
    '..GGGGGGGG..',
    '.GGGGGGGGGG.',
    '.GWKGGGGWKG.',
    '.GGGGGGGGGG.',
    'GGGGGGGGGGGG',
    'GGPGGGGGGPGG',
    'GGGGGGGGGGGG',
    '.GGGGGGGGGG.',
    '..GggGGggG..',
    '...gg..gg...',
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
  // ヤマタノオロチ: 3つの蛇頭＋とぐろを巻いた胴体
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
  // ヒュドラ: 参考画像準拠の完全新規設計。8つの蛇頭が放射状に四方八方へ伸びる「八岐の星」型。
  // 上中央=最大の主頭（Cのトサカ・K瞳・白牙と赤い口）、左上/右上=青緑の小頭（舌R）、
  // 左右真横=紺の頭（横に突き出す舌R）、左下/右下=下方へ潜る青緑の頭、真下=大口を開け咆哮する頭（二又の舌）。
  // 中央は白い腹甲（W/Sのはしご模様）の胸部。首は紺(B/b)と青緑(g/C)を交互配色し、肩部で二重K線の編み込みで絡まりを表現
  hydra: [
    '.R.KggK........C.CC.C........KggK.R.',
    'R.KgCggK......KBBBBBBK......KggCgK.R',
    '..KgYgggK....KBBBBBBBBK....KgggYgK..',
    '...KggCgK....KBYKBBKYBK....KgCggK...',
    '....KggCgK...KBBBBBBBBK...KgCggK....',
    '.....KggCgK..KKWRRRRWKK..KgCggK.....',
    '......KggCgK..KKBBBBKK..KgCggK......',
    '.......KggCgK..KBbbBK..KgCggK.......',
    '..KBBBK.KggCgK.KBbbBK.KgCggK.KBBBK..',
    '.KBYBBBK.KggCgKKBbbBKKgCggK.KBBBYBK.',
    'RKKBBBBK.KggCgKKBbbBKKgCggK.KBBBBKKR',
    '..KBBBBK..KgCgKKBbbBKKgCgK..KBBBBK..',
    '...KBbBBKKgCgKKBbBBbBKKgCgKKBBbBK...',
    '.....KBBBBKgCgKBbBBbBKgCgKBBBBK.....',
    '........KBKgCgKBBbbBBKgCgKBK........',
    '.........KgCgKBBBBBBBBKgCgK.........',
    '........KgCgKBNWWWWWWNBKgCgK........',
    '.......KgCgKKBNSWWWWSNBKKgCgK.......',
    '......KgCgK.KBNWWWWWWNBK.KgCgK......',
    '.....KgCgK..KBNSWWWWSNBK..KgCgK.....',
    '....KgCgK...KBNWWWWWWNBK...KgCgK....',
    '...KgCgK....KBNSWWWWSNBK....KgCgK...',
    '..KgCgK......KBNWWWWNBK......KgCgK..',
    '.KggCgK......KBNSWWSNBK......KgCggK.',
    'KggggK........KBNWWNBK........KggggK',
    'KgYgK..........KBbbBK..........KgYgK',
    'KKggK..........KBbbBK..........KggKK',
    'R.KK..........KBBBBBBK..........KK.R',
    '.............KBBYBBYBBK.............',
    '.............KBBBBBBBBK.............',
    '.............KKWRRRRWKK.............',
    '..............KKRRRRKK..............',
    '...............KKRRKK...............',
    '................R..R................',
  ],
  // ハデス: 冥界の王。金の尖塔冠＋青銅像の顔に赤く光る目＋黒いローブに青銅の胸当て、
  // 右手に縦持ちの三叉槍（トライデント）、足元に3頭の番犬ケルベロス
  hades: [
    '.................S...S...S.......',
    '.......Y...Y...Y.S...S...S.......',
    '.......YY.YYY.YY.YS.SS.SS.S......',
    '......KYYYYYYYYYYYYSSSSSSSSS.....',
    '......KYRYRYRYRYRYRYK.SLS........',
    '......KKKKKKKKKKKKKKK.SLS........',
    '.......SLLLLLLLLLLLLS.SLS........',
    '......SLLTTTTTTTTTTLLS.SLS.......',
    '......SLTTTTTTTTTTTTLS.SLS.......',
    '......SLTTKRRTTTTKRRTLS.SLS......',
    '......SLTTKRRTTTTKRRTLS.SLS......',
    '......SLTTTTTTTTTTTTLLSTSLST.....',
    '.......SLTTTTLLTTTTLS..SLS.......',
    '.......SLTTLLLLLLTTLS..SLS.......',
    '........SLLTTTTTTLLS...SLS.......',
    '.........SLLLLLLLLS....SLS.......',
    '......SSKKKKKKKKKKKKSS.SLS.......',
    '.....SKKKLLLLLLLLLLKKKS.SLS......',
    '.....SKKLLLLRRRRLLLLKKS.SLS......',
    '.....KKKLLLLLLLLLLLLKKK.SLS......',
    '.....KKKKLLLLLLLLLLKKKK.SLS......',
    '.....KKKKKLLLLLLLLKKKKK.SLS......',
    '.....KKKKKKKKKKKKKKKKKK.SLS......',
    '.....KKKKKKKKKKKKKKKKKK.SLS......',
    '.....KKKKKKKKKKKKKKKKKK.SLS......',
    '......KKKKKKKKKKKKKKKK..SSS......',
    '......KKKKKKKKKKKKKKKK...........',
    '.....KK.....KK.....KK............',
    '....KLLK...KLLK...KLLK...........',
    '...KLRRLK.KLRRLK.KLRRLK..........',
    '...KLLLLK.KLLLLK.KLLLLK..........',
    '...KKKKKK.KKKKKK.KKKKKK..........',
  ],
  // ゼウス: 雷神。褐色の筋骨隆々な上半身で、頭上にジグザグの大稲妻を両手で構える。
  // 金の月桂冠＋白髪白ひげ＋金の腕輪＋白いトーガ（腰布）に金帯
  zeus: [
    '....Y.......Y.......Y.......Y....',
    '...YYY.....YYY.....YYY.....YYY...',
    'YYYYYYYYYYYYYYYWWWYYYYYYYYYYYYYYY',
    '...YYY.....YYY.....YYY.....YYY...',
    '....Y.......Y.......Y.......Y....',
    '.........KTTK.......KTTK.........',
    '.........KTOK.......KTOK.........',
    '.........KYYK.......KYYK.........',
    '........KKTOKK.....KKTOKK........',
    '.......KTOK.YYYYYYY.KTOK.........',
    '......KKTOKYKYYYYYKYKKTOKK.......',
    '......KTOTKWWWWWWWWWKTOTK........',
    '.....KKTOKWWWTTTTTWWWKTOTK.......',
    '.....KTOOKWTTTTTTTTTWKTOOK.......',
    '.....KTOKWTTKCTTTCKTTWKTOK.......',
    '......KKKWTTTTTTTTTTTWKKK........',
    '.........WTTTTOOOTTTTW...........',
    '.........WTTOORROOTTTW...........',
    '..........WWWTTTTTWWW............',
    '..........WWWWWWWWWWW............',
    '...........WWWWWWWWW.............',
    '............WWWWWWW..............',
    '..........TTTTTTTTTTT............',
    '........TTTTOTTTTTOTTTTT.........',
    '.......TOTTTTOTTTOTTTTOOT........',
    '......TOTTTKOTTTTTOKTTTTOT.......',
    '......TOTTTTTTOTOTTTTTTTOT.......',
    '......TOTTTTOOTTTOOTTTTTOT.......',
    '.......TOTTTTTTTTTTTTTTOT........',
    '........YYYYYYYYYYYYYYY..........',
    '........WWWWWWWWWWWWWWW..........',
    '.......WWWSWWWWWWWWSWWWW.........',
    '.......WWSWWWWWWWWWWSWWWW........',
    '........TTTTT...TTTTT............',
    '........TOTTT...TOTTT............',
    '........TOTTT...TOTTT............',
    '.......KTOTTK..KTOTTK............',
    '.......KKKKKK..KKKKKK............',
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
  // スフィンクス: 参考画像準拠の完全新規設計。古代エジプトの荘厳なスフィンクス像。
  // 頭頂に青(b)と金(Y)の縞のネメス頭巾、その下に人間の顔（W/Kの両目・KKKKの口）、
  // 顔の左右へネメスの垂れ布(縞)が下りる。胴は伏せたライオンの砂色(T)の巨躯、
  // 前方へ突き出した二対の前脚と金の鉤爪(K/W)。左右対称で幅広い構図。
  sphinx: [
    '..........YbYbYbYbYbY..........',
    '.........bYbYbYbYbYbYb.........',
    '........YbYbYbYbYbYbYbY........',
    '........bYbTTTTTTTTbYb.........',
    '........YbTTTTTTTTTTbY.........',
    '........bYTTTTTTTTTTYb.........',
    '........YbTTWKTTWKTTbY.........',
    '........bYTTWKTTWKTTYb.........',
    '........YbTTTTTTTTTTbY.........',
    '........bYTTTKKKKTTTYb.........',
    '........YbTTTTTTTTTTbY.........',
    '.......YbYbTTTTTTTTbYbY........',
    '......YbYbYbTTTTTTbYbYbY.......',
    '.....YbYbYbYbYbYbYbYbYbYbY.....',
    '....TTTTTbYbYbYbYbYbTTTTTTT....',
    '...TTTTTTTTTbYbYbTTTTTTTTTTT...',
    '..TTTTTTTTTTTTTTTTTTTTTTTTTTT..',
    '.TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'YTTTTTTTTTTTTTTTTTTTTTTTTTTTTTY',
    'YYTTTTTTTTTTTTTTTTTTTTTTTTTTTYY',
    'YYYTTTTTTTTTTTTTTTTTTTTTTTTTYYY',
    'KYYKTTTTTTTTTTTTTTTTTTTTTTKYYK.',
    'KYYK..KYYK..........KYYK..KYYK.',
    'KWWK..KWWK..........KWWK..KWWK.',
  ],
  // スルト: 黒赤の甲冑を着た炎の騎士。白い羽根飾りの兜＋赤い面、
  // 金縁の炎の両刃剣を右手に構える。黒×赤の荘厳な鎧。
  surtr: [
    '.........WWW....................',
    '........WWWWW..........O........',
    '.......WWSWSWW........OYO.......',
    '.......SKKKKKS.......OYRYO......',
    '.......KRRRRRK.......OYRYO......',
    '.......KRKKRKK.......OYRYO......',
    '.......KRRRRRK.......OYRYO......',
    '......SKKKKKKKS......OYRYO......',
    '.....RRSSSSSSSSR.....OYRYO......',
    '....RRKKSSSSSSKKRR...OYRYO......',
    '...RRRKKSKKKKSKKRRR..OYRYO......',
    '..RRRRSKSKKKKSKSRRRR.OYRYO......',
    '..RRRSSKKSSSSKKSSRRR.OYRYO......',
    '..RRRSKKKSSSSKKKSRRRYOYRYOY.....',
    '..RRRSKSKKSSKKSKSRRRYYYYYYY.....',
    '..RRRSSKKKSSKKKSSRRR.OYRYO......',
    '...RRSSKKKKKKKKSSRR...OYO.......',
    '....RSSKKKKKKKKSSR.....O........',
    '.....SKKKS..SKKKS...............',
    '.....SKKS....SKKS...............',
    '.....KKKK....KKKK...............',
    '....KKKKK....KKKKK..............',
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
  // クラーケン: 紫/青の巨大イカ。尖ったマント状の頭・赤い一対の目・くちばし、四方八方に広がる無数の触手（先端は青くすぼみ吸盤付き）
  kraken: [
    '................KK................',
    '...............KppK...............',
    '..............KpPPpK..............',
    '.............KpPPPPpK.............',
    '............KpPPPPPPpK............',
    '...........KpPPbbbbPPpK...........',
    '..........KpPPbbbbbbPPPK..........',
    '.........KpPPPbbbbbbPPPPK.........',
    '........KpPPPPPPPPPPPPPPpK........',
    '.......KpPPPPPPPPPPPPPPPPpK.......',
    '......KpPPRRRPPPPPPPPRRRPPpK......',
    '......KPPRRWRRPPPPPPRRWRRPPK......',
    '.....KPPPRRRRRPPPPPPRRRRRPPPK.....',
    '.....KPPPPRRRPPPPPPPPRRRPPPPK.....',
    '....KPPVPPPPPPPPWWPPPPPPPPVPPK....',
    '....KPPVVPPPPPWWWWWWPPPPPVVPPK....',
    '...KpPPVPPPPPPMMMMMMPPPPPPVPPpK...',
    '...KpPPPPPPPPPPPMMPPPPPPPPPPPpK...',
    '..KpPPPPPPPPPPPPPPPPPPPPPPPPPPpK..',
    'KKKPPKPPKPPPK..KPPK..KPPKKPPPPPKK.',
    'KpppppppKppK...KppK..KppK.KpppppKK',
    'PPPKKMPKMPPK...KMPK..KMPK..KPMPPMP',
    'PKKPPPPKPPKK...KPPK..KPPKK..KPPKPP',
    'KKpppKKKpppK...KppK..KpppKK.KpppKK',
    'MPPPK...KMPK...KMPK...KPMPKK.KPMPK',
    'PPKK...KKPPK...KPPK....KPPPKK.KPPP',
    'pK....KKpppK...KppK.....KpppK..Kpp',
    'K....KKMPPK....KMPK......KMPK...KP',
    '....KKPPPK.....KPPK.....KKPPK....K',
    '....KbbbK......KbbK.....KbbbK.....',
    '....KbbK.......KbbK.....KbbK......',
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
  // アマテラス: 太陽の女神。頭上の金の光輪＋角状に伸びる光背、ピンク髪の少女、
  // 白いリボン、白と金の巫女風の鎧、左右に構えた氷色に光る槍、ピンクのスカート
  amaterasu: [
    '..Y.....Y.......Y.......Y.....Y..',
    '...YY....YY.....Y.....YY....YY...',
    '.....YY...YYYYYYYYYYYYY...YY.....',
    '.......YYYWWWWWWWWWWWWWYYY.......',
    '......YYWWWWWWWWWWWWWWWWWYY......',
    '......YYWWWY.......YWWWYY........',
    '.......YY...........YY...........',
    '.......MMMMMMMMMMMMMMM...........',
    '......MMMWWMMMMMMMWWMMM..........',
    '......MMMMMWWWWWWWMMMMM..........',
    '......MMMWWTTTTTTTWWMMM..........',
    '.......MMWTTTTTTTTTWMM...........',
    '.......MMWTTKMTTMKTTWMM..........',
    '.......MMWTTTTTTTTTTWMM..........',
    '........MWTTTMRRMTTTWM...........',
    '........MMWTTTTTTTTWMM...........',
    '.........MMMWWWWWMMMM............',
    '.....W...MMMWWWWWMMM....W........',
    '....WWW..WWWYYYYYWWW...WWW.......',
    '...WWDWW.WYYWWWWWYYW..WWDWW......',
    '....WDW..WWYWWWWWYWW...WDW.......',
    '.....D..WWWWYYYYYWWWW...D........',
    '.....D..WWYWWWWWWWYWW...D........',
    '.....D...WYWWWWWWWYW....D........',
    '....WDW..WWWYYYYYWWW...WDW.......',
    '...WWDWW.WYWWWWWWWYW..WWDWW......',
    '....WDW...WWWWWWWWW....WDW.......',
    '.....D....WWMMMMMWW.....D........',
    '..........WWMMMMMWW..............',
    '.........WWWMMMMMWWW.............',
    '.........WWWWWWWWWWW.............',
    '.........WWWW...WWWW.............',
    '.........MMMW...WMMM.............',
    '.........MMMW...WMMM.............',
    '.........WWWW...WWWW.............',
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
  // ティラノサウルス: 恐竜の王。開いたアゴにギザギザの牙
  // ティラノサウルス: 参考画像準拠の完全新規設計。左向きに前傾して襲いかかる肉食恐竜。
  // 左下に大きく開いた顎（上下の白牙W・赤い口腔R・黄の目Y）、背から上へ反り上がる長い尾、
  // 胸元の小さな前脚（オレンジの鉤爪O・白爪W）、地を踏みしめる太い二本脚と白い足爪。
  // 全身は茶(T)、黒(K)の輪郭で躍動感のあるシルエットを描く。
  trex: [
    '...KKKKKKKK........................',
    '..KTTTTTTTTKK......................',
    '.KTTTTTTTTTTTKK....................',
    'KTTTYKTTTTTTTTTKKK.................',
    'KTTYYKTTTTTTTTTTTTTKKKK............',
    'KWKWKKTTTTTTTTTTTTTTTTTTKKK........',
    'KRRRRKTTTTTTTTTTTTTTTTTTTTTTKK.....',
    '.RRRRKTTTTTTTTTTTTTTTTTTTTTTTTKK...',
    'KWKWKKTTTTTTTTTTTTTTTTTTTTTTTTTK...',
    '.KKKKKTTTTTTTTTTTTTTTTTTTTTTTKK....',
    '.....KTTTTTTTTTTTTTTTTTTTTTKKK.....',
    '.....KTTTTTTTKKKTTTTTTTTKKK........',
    '.....KTTTTTTK..KTTTTTTTK...........',
    '....KTTTTTKO..KTTTTTTTTK...........',
    '....KTTTTKWWKKTTTTTTTTTK...........',
    '....KTTTTKKKTTTTTTTTTTTK...........',
    '....KTTTTTTTTTTTTTTTTTTK...........',
    '....KTTTTTTKKKKTTTTTTTTK...........',
    '...KTTTTTTK..KTTTTTTTTTK...........',
    '...KTTTTTK...KTTTTTTTTK............',
    '..KTTTTTK....KTTTTTTTK.............',
    '..KTTTTK.....KTTTTTTK..............',
    '..KTTTK......KTTTTTK...............',
    '.KTTTK.......KTTTTK................',
    '.KTTTK.......KTTTK.................',
    '.KWWWK......KWWWWK.................',
    '.KKKKK......KKKKKK.................',
  ],
  // ジャイアントスパイダー: 巨大グモ。8本の脚＋4つの赤い目
  spider: [
    '..KK........................KK..',
    '...KK......................KK...',
    '....KK....................KK....',
    '.....KK..................KK.....',
    'KK....KK................KK....KK',
    '.KK....PPPPPPPPPPPPPP....KK.....',
    '..KK..PPPPPPPPPPPPPPPP..KK......',
    'KKKKKKPPRRPPPPPPPPRRPPKKKKKK....',
    '......PPRRPPPPPPPPRRPP..........',
    '..KKKKPPPPPPPPPPPPPPPPKKKK......',
    '.KK...PPPPKKKKKKKKPPPP...KK.....',
    'KK....PPPPPPPPPPPPPPPP....KK....',
    '......PPPPPPPPPPPPPPPP..........',
    '.....KK.PPPPPPPPPPPP.KK.........',
    '....KK...PPPPPPPPPP...KK........',
    '...KK.....PPPPPPPP.....KK.......',
    '..KK.......PPPPPP.......KK......',
    '.KK.........................KK..',
  ],
  // メガロドン: 超巨大ザメ。大きく開いた口にギザギザの歯
  megalodon: [
    '..............SS................',
    '.............SSSS...............',
    '............SSSSSS..............',
    '....SSSSSSSSSSSSSSSSSSSS........',
    '..SSSSSSSSSSSSSSSSSSSSSSSS......',
    '.SSKKSSSSSSSSSSSSSSSSSSSSSS.....',
    'SSWKWKWKWSSSSSSSSSSSSSSSSSSSS...',
    'SKKKKKKKKSSSSSSSSSSSSSSSSSSSSS..',
    'SWKWKWKWWWWWWWWWWWWWSSSSSSSS....',
    '..WWWWWWWWWWWWWWWWWWWWSSSSSS....',
    '....WWWWWWWWWWWWWWWWSSSSSS......',
    '......SSSSSSSSSSSSSSSSSS....SS..',
    '........SSSSSSSSSSSS......SSS...',
    '..........SSSSSSSS......SSSS....',
    '............SSSS......SSSSS.....',
    '..............SS....SSSS........',
    '...................SSS..........',
  ],
  // グリフォン: 参考画像準拠の完全新規設計。鷲とライオンの合成獣。
  // 頭頂に白い鷲の頭（W/Kの両目・黄の鉤形くちばしYが下へ突き出す）、
  // 左右いっぱいに広げた白い翼（K縞の羽ばたき模様）、中央下に茶色のライオンの胴、
  // 前へ踏み出す二本の脚と黄の鋭い鉤爪(K/Y/W)。左右対称の迫力ある構図。
  griffin: [
    '.............WWWWWW...............',
    '............WWWWWWWW..............',
    '...........WWWWWWWWWW.............',
    '...........WWKWWWWKWW.............',
    '...........WWKWWWWKWW.............',
    '...........WWWWWWWWWW.............',
    '............WWYYYYWW..............',
    '..WW.........WYYYYW.........WW....',
    '.WWWW.........YYYY.........WWWW...',
    'WWKWW.........YYYY........WWKWW...',
    'WWKWWWW......WWWWWW......WWWWKWW..',
    'WWKWKWWWWWWWWWWWWWWWWWWWWWWWKWKWW.',
    'WKWKWKWWWWWWWWWWWWWWWWWWWWKWKWKWW.',
    '.WKWKWKWWWWWTTTTTTWWWWWWKWKWKWW...',
    '..WKWKWWWWWTTTTTTTTWWWWWKWKWW.....',
    '...KWKWWWWTTTTTTTTTTWWWWKWKW......',
    '....KWWWWTTTTTTTTTTTTWWWWKW.......',
    '.......TTTTTTTTTTTTTTTT...........',
    '.......TTTTTTTTTTTTTTTT...........',
    '........TTTTTTTTTTTTTT............',
    '........TTTTTTTTTTTTTT............',
    '........TTTTTTKKTTTTTT............',
    '........TTTTK...KTTTTT............',
    '........YYYK...KYYYYT.............',
    '.......KYWYK...KYWYWK.............',
    '.......KYWYK...KYWYWK.............',
  ],
  // じゃりゅうジギムント: 最終ボス。巨大な曲がり角＋燃える2段の目＋牙だらけの口＋骨ばった翼
  dragon: [
    'YY........................YY....',
    'YYY......................YYY....',
    '.YYY....................YYY.....',
    '..YYY..................YYY......',
    '...YYY....KKKKKKKK....YYY.......',
    '....YYY..KKKKKKKKKK..YYY........',
    '.....YYYKKKKKKKKKKKKYYY.........',
    '......YKKRRKKKKKKRRKKY..........',
    '......KKKRRKKKKKKRRKKK..........',
    '......KKKKKKKKKKKKKKKK..........',
    '......KWWKWWKWWKWWKWWK..........',
    '......KORRRRRRRRRROKK...........',
    '.....KKWWKWWKWWKWWKWWKK.........',
    '..pp...KKKKKKKKKKKK...pp........',
    '.pppp..KKKKKKKKKKKKK..pppp......',
    'pppppp.KKKKKKKKKKKKKK.pppppp....',
    'ppKpppKKKPPPPPPPPPPKKKpppKpp....',
    'ppppppKKKPPPPPPPPPPPPKKKpppppp..',
    'pppppKKKKPPPPPPPPPPPPKKKKppppp..',
    '.pppKKKKKPPPPPPPPPPPPKKKKKppp...',
    '..ppKKKKKKPPPPPPPPPPKKKKKKpp....',
    '.....KKKKKKKPPPPPPKKKKKKK.......',
    '.....KKKKKKKKKKKKKKKKKKK........',
    '....KKKKKK..KKKK..KKKKKKK.......',
    '....KKKKK....KK....KKKKKKK......',
    '...YKKKY....KK.....KKKKKKKK.....',
    '.............KK.....KKKKKKKKK...',
    '.....................KKKKKKKKK..',
    '.......................KKKKKKYY.',
    '.........................KKKYY..',
  ],
  // ヴリトラ: インドしんわ「水を呑む魔人ナーガ」。金の湾曲した角・赤く光る目・牙をむく口の紫の鬼、
  //           左右に広げた腕と金の三本爪、胸に水色のオーブ、腰から下は横たわる蛇のとぐろ、足元に水たまり
  vritra: [
    '.......YY..................YY.......',
    '.......YYYY..............YYYY.......',
    '...........YYY........YYY...........',
    '.............YYYPPPPYYY.............',
    '..............VVVVVVVV..............',
    '.............PKRRppRRKP.............',
    '.............PPKWKKWKPP.............',
    '..............PKWKWWKP..............',
    '...PPPPPPPPPPPYYYYYYYYPPPPPPPPPPP...',
    '..pppppppppppPPPPPPPPPPppppppppppp..',
    '..PPPPP......PPppVVppPP......PPPPP..',
    '.YPYPY.......PppPPPPppP.......YPYPY.',
    'YPYPY........PPPCDDCPPP........YPYPY',
    '.Y.Y.........PPCDWDDCPP.........Y.Y.',
    '.............PPPCDCCPPP.............',
    '..............ppPPppPP..............',
    '.............YYYYVVYYYY............Y',
    '............PPPPPppPPPPP..........pP',
    '.........PPPPPPPPPPPPPPPPPP.......PP',
    '.....PPPPPPPPPPPPPPPPPPPPPPPPP...PPp',
    '..PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'PppPPppPPppPPppPPppPPppPPppPPppPPppP',
    'pppppppppppppppppppppppppppppppppppp',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'TTVTTTVTTTVTTTVTTTVTTTVTTTVTTTVTTTVT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    'CbCbCDCbCbCbCbCbCWCbCbCbCbCbCDCbCbCb',
    'bCCbCCbCCbCDbCCbCCbCCbCDbCCbCCbCCbCC',
  ],
  // ガルーダ: インドしんわ「黄金の装甲神鳥」。金の冠羽・宝石の目・鉤状の嘴の白い頭、
  //           銀と鋼青の三層装甲翼、太陽紋章の金の胴、金属輪の脚と黒爪、掴まれた緑の蛇
  garuda: [
    '...............YYY...............',
    '............YY.YYY.YY............',
    '............WWWWWWWWW............',
    '...........WWWWWWWWWWW...........',
    '...........WWKMWWMKWWW...........',
    '.............WWYYYWW.............',
    '..SS...........YYY...........SS..',
    '.SSSSSSSSSS..WWYYYWW..SSSSSSSSSS.',
    'YYYYYYYYYYYYWWWWWWWWWYYYYYYYYYYYY',
    'bbbSbbbSbbbbYYYOYOYYYbbbbSbbbSbbb',
    '.bbbbbbbbbb.YYYYYYYYY.bbbbbbbbbb.',
    'YYSSSSSSSS..YYYYYYYYY..SSSSSSSSYY',
    '..SS..YY....YYYYYYYYY....YY..SS..',
    '....YY..SS.OOYYWOWYYOO.SS..YY....',
    '............OYYYWYYYO............',
    '............YOYYYYYOY............',
    '...........RRRRRRRRRRR...........',
    '..........RRRORRORRORRR..........',
    '...........OYYYOOOYYYO...........',
    '...........RYYY.RRYYYR...........',
    '............SSS...SSS............',
    '..GK........YYY...YYY............',
    '.GGG.GGGGG..KKK...KKKGGGGGG......',
    'MMGGGggggGGGGGGgggggGGGgggggGGGg.',
    '..GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGg',
    '..ggggggggggggggggggggggggggggg..',
  ],
  // バロール: ケルトしんわの魔眼の巨人。赤黒の機械甲殻・王冠状に並ぶ5本の黒角・中心の発光コア目
  balor: [
    '................K..................',
    '.........K.....KKK.....K...........',
    '..K.....KKK...KKKKK...KKK.....K....',
    '.KKK...KKKKK..RRRRR..KKKKK...KKK...',
    'KKKKK..KKKKK..RRRRR..KKKKK..KKKKK..',
    'RRRRRKKRRRRRKKRRRRRKKRRRRRKKRRRRRRR',
    '...KKRRRRRRRRRRRRRRRRRRRRRRRRRKK...',
    '..KKRRRRKRRRRRRRRRRRRRRRRRKRRRRKK..',
    '.KKRRRRRRRRRRRRRRRRRRRRRRRRRRRRRKK.',
    'KKRRRRRRRRRRKOOOOOOOOOKRRRRRRRRRRKK',
    'KKRRRRRRRRRKOOYYYYYYYOOKRRRRRRRRRKK',
    'KKRRRRRRRRRKOOYYWWWYYOOKRRRRRRRRRKK',
    'KKRRRRRRRRRKOOYYYYYYYOOKRRRRRRRRRKK',
    'KKRRRRRRRRRRKOOOOOOOOOKRRRRRRRRRRKK',
    '.KKRRRSRRRRRRRRRRRRRRRRRRRRRSRRRKK.',
    '..KKRRRRRSRRRRRRRRRRRRRRRSRRRRRKK..',
    '....KKRRRRRRRRRRRRRRRRRRRRRRRKK....',
    '.....KKRRRRRRRRRRRRRRRRRRRRRKK.....',
    '....KKRRRRRRRRRRRRRRRRRRRRRRRKK....',
    '...KKRRRRRRRRRRRRRRRRRRRRRRRRRKK...',
    '.....KKKRRSRRRRRRSRRRRRRSRRKKK.....',
    '......KKRRRRRRRRRRRRRRRRRRRKK......',
    '.......KKRRRRRRRRRRRRRRRRRKK.......',
    '........KKRRRRRRRRRRRRRRRKK........',
    '.........KKRRRRRRRRRRRRRKK.........',
    '..........KKRRRRRRRRRRRKK..........',
    '.........KKKK...KKK...KKKK.........',
    '........KRRRK...KKK...KRRRK........',
    '........SKKKS...SKS...SKKKS........',
    '........S...S....S....S...S........',
  ],
  // テスカトリポカ: アステカしんわの夜の神。羽根の冠・胸の黒曜石の鏡・煙に溶ける右脚の非対称シルエット
  tezcatlipoca: [
    '......G.G.G.G.G.G.G.G.G..........',
    '.....KGKGKGKGKGKGKGKGKGK.........',
    '.....GGGGGGGGGGGGGGGGGGG.........',
    '......YYYYYYYYYYYYYYYYY..........',
    '........KKKKKKKKKKKKKK...........',
    '.......KKKKKKKKKKKKKKKK..........',
    '.......YYYYYYYYYYYYYYYY..........',
    '.......KKGGKKKKKKKKGGKK..........',
    '.......YYYYYYYYYYYYYYYY..........',
    '.......KKKKKKKKKKKKKKKK..........',
    '.......KKWKWKWKWKWKWKKK..........',
    '........KKKKKKKKKKKKKK...........',
    '....YYYYYYYYYYYYYYYYYYYYYYYY.....',
    '....YKYYKYYYKYYKYYKYYYKYY........',
    '.....YYYYYYYYYYYYYYYYYYYY........',
    '......KKKKKKKKKKKKKKKKKK.........',
    '......KKKKSSSSSSSSKKKKKK.........',
    '......KKKSSSWWWWSSSKKKKK.........',
    '......KKKKSSSSSSSSKKKKKK.........',
    '......KKKKKKKKKKKKKKKKKK.........',
    '.......KKKKKKKKKKKKKKKK..........',
    '.........KKKK...KKKK.............',
    '.........KKKK..LLLL..............',
    '........CKKKKC.LLL...............',
    '.........KKKK.bbL................',
    '.......bbCKKCbb..................',
    '......bLb.KK.b...................',
    '....bb...KK...bb.................',
    '..bb.....................b.......',
    '.b.....................b.........',
  ],
  // フンババ: 森の番人。参考画像準拠、王冠状の5本銀角を戴く緑肌の筋肉悪魔として全面刷新。
  // 正面向き二足直立の人型。頭頂に段階的な高さの角5本、赤橙の目、牙をむく大口、
  // 垂下する筋肉質の腕と3本鉤爪、くびれた腰、右へ伸びる棘付きの尻尾、鉤爪付きの足。
  humbaba: [
    '.................SS.................',
    '............SS..SSSS..SS............',
    '........SS.SSS..SLLS..SSS.SS........',
    '.......SLL.SLL..SLLS..LLS.LLS.......',
    '........LLKLLLKKLLLLKKLLLKLL........',
    '........KGGGGGGGGGGGGGGGGGGK........',
    '........KGGKKKKGGGGGGKKKKGGK........',
    '........KGGOOOOGGGGGGOOOOGGK........',
    '........KGGORROGGGGGGORROGGK........',
    '........KGGGGGGGgKKgGGGGGGGK........',
    '........KGKKKKKKKKKKKKKKKKGK........',
    '...KKKK.KGKWKKWKKKKKKWKKWKGK.KKKK...',
    '..KGGGGKKGKWKKRRRRRRRRKKWKGKKGGGGK..',
    '..KGGGGKKGKKWKWKRRRRKWKWKKGKKGGGGK..',
    '..KGGGGKKGKKKKKKKKKKKKKKKKGKKGGGGK..',
    '..KGGGGK.KGGGGGGGGGGGGGGGGK.KGGGGK..',
    '.KGGGGK.KGGGGGGGGggGGGGGGGGK.KGGGGK.',
    'KGGGGK..KgGGGGGGGggGGGGGGGgK..KGGGGK',
    'KGGGGK..KgGGGGgGGggGGgGGGGgK..KGGGGK',
    'W.W.W...KggGGGgGGggGGgGGGggK...W.W.W',
    '.........KgGGGGGGGGGGGGGGgK.........',
    '........KGGGGGGGGggGGGGGGGGK.W.W.W..',
    '.......KGGGGGGK......KGGGGGGKGGGGGgW',
    '.......KGGGGGGK......KGGGGGGK.ggggK.',
    '.......KGGGGGK........KGGGGGK.......',
    '.......KGGGGgK........KgGGGGK.......',
    '.....KGGGGGGGK........KGGGGGGGK.....',
    '.....KWGWGWGGK........KGGWGWGWK.....',
  ],
  // セイリュウ: ちゅうごくしんわの四神・青龍。参考画像準拠の再設計。
  // 左向きの頭部（金の枝角2対・赤い目・開いた顎に白牙と赤い舌・金のあごひげ・上下にたなびく長い金ひげ）、
  // 後方へ流れる金のたてがみ。胴は横S字3段うねり（上段の首→右端の下降→中段を左へ→左で折り返し下段の尾）。
  // 腹はWの蛇腹横縞（bの節切り）、背にCの棘びれ、右端下降部の外側にDの棘。
  // 左下で細い前脚が炎(O)をまとう宝珠(M)を鉤爪(W)で掴む。細い4本脚と白い鉤爪。
  // 尾の先は右下でD/Cの炎状尾ひれ。上端右と下段の雲(S/W)の上を泳ぐ。
  seiryu: [
    '..........Y..YY.................SSSS....',
    '.........YY..Y.YY.............SSWWWWSS..',
    '.Y.......Y..YY.YYY.............SSSSSS...',
    '.Y......BYbbYBYYYY......................',
    '..Y.BbbbbCCCbBYYYYY.C..C................',
    '...BbbbbbRRbbBYYYYBBBBBB.C..............',
    '...BWRRKbbbbbBYYbbbbbbbbBBB.C...........',
    '..BbbbRBbbbbbBbbbCbbbbCbbbbBB...........',
    '.Y..YYBbbbbbbbbbCbbbbbCbbbbbBB..........',
    '.Y...Y..BWWbWWbWWbWWbWWbWWbbbbbBB.......',
    '..Y......BBBBBbbbBBBBBbbbBbbbbbbBB......',
    '.............Bbb......Bbb..BWWbbbBB.....',
    '....O.....Bbbb........Bbb..BWWbbbBBD....',
    '..OOBbbbbbbB...........bbb.BbbbCbBBDD...',
    '...WMWMW..............W.W..BWWbbbBBD....',
    '...MWMMM....C...C...C......BWWbbbBB.....',
    '...MMMMMBBBBBBBBBBBBBBBBBBBBWWbbbBB.....',
    '....MMMBbbCbbbbCbbbbCbbbbCbbWWbbbBB.....',
    '......BbbCbbbbCbbbbCbbbbCbbbWWbbBB......',
    '.....BbbWWbWWbWWbWWbWWbWWbWWbbBB........',
    '....BbbbBBBBBBBBBBBBBBBBBBBBBB..........',
    '...BbbbB..........Bbb.....Bbb.....D.....',
    '..BbbbbB..........bbb.....bbb....DCD....',
    '..BbbbbB.........W.W.W...W.W.W..DCCD....',
    '..BbbbbB.......................DCCD.....',
    '..BbbbbbB...C.....C...........DCCD......',
    '...BbbbbbBBBBBBBBBBBBBBBBBBBbbDD........',
    '....BbbbCbbbbbCbbbbbCbbbbbCbbB..........',
    '.....BWWbWWbWWbWWbWWbWWbWWbWB...........',
    '......BBBBBBBBBBBBBBBBBBBBB.............',
    '....SWWWWS...............SWWWWS.........',
    '..SSWWWWWWSS...........SSWWWWWWWSS......',
    '...SSSSSSSS.............SSSSSSSSS.......',
    '.....SSS...................SSS..........',
  ],
  // ライリュウ(雷龍): 参考画像準拠の再々設計。後脚2本で直立する虎縞（シアン地×紺縞）の雷竜。
  // 後方湾曲の銀角・琥珀色の目・大きく開いた顎（白牙＋赤い舌＋暗い口内）・頭頂と尾に氷白の背びれ棘。
  // 左右いっぱいに広げたコウモリ翼（紺の翼膜に氷色の稲妻血管D）・胸の前に構えた白い鉤爪の前腕・
  // 幅広スタンスの太い脚と白爪・右へ跳ね上がる棘付きの尾・股間から地面へ落ちる大稲妻＋左右の稲妻
  rairyu: [
    '...KY.....WS..............SW.....YK...',
    '..YK.......SS....W..W....SS.....D.....',
    '............SSKKKKKKKKKKSS............',
    '..............KSNNNNNNSK..............',
    '..............KNYYNNYYNK..............',
    '....WK......W.KCNCCCCNCK.W......KW....',
    '......KKK..WD.KWKWKKWKWK.DW..KKK......',
    '......NNNKKK..KWKRRRRKWK..KKKNNN......',
    '.....KNNNNNNKK.KNCCCCNK.KKNNNNNNK.....',
    '....KNNNDNNNNKbCNCCCCNCbKNNNNDNNNK....',
    '...KNNDNNNDNNKCKCNCCNCKCKNNDNNNDNNK...',
    '...KNDNNDNNDNKbCKCNNCKCbKNDNNDNNDNK...',
    '...KNNDNNDNNNKbbCKCCKCbbKNNNDNNDNNK...',
    '....KNDNNDNNNKbKWWCCWWKbKNNNDNNDNK....',
    '.....KNDK..NKKbCWCDDCWCbKKN..KDNK.....',
    '......K....K.KbCNCDDCNCbK.K....K......',
    '...Y..........KbCNCCNCbK..........Y...',
    '..Y...........KbCCNNCCbK...........Y..',
    '...Y........KCCNK....KNCCK..........W.',
    '..Y........KCNCCKKYY.KCCNCK........KW.',
    '...Y.......KCCNCK.KYYKNCCCK......WKCN.',
    '..YW......KCNCCK.KYW..KCCNCK...WKCND..',
    '.........KCCNCK...KYY...KCNCCKWKCND...',
    '.........KCNCCK..KWY....KCCNCKKND.....',
    '.........KCCCK....KYY....KCCCKND......',
    '.........KCNCK....KYW....KCNCK........',
    '.......KCCCCCK....KYY...KCCCCCK.......',
    '.......KCKCKCK...KYY....KCKCKCK.......',
    '........W.W.W.....KWY....W.W.W........',
    '...........D.....KYY......D...........',
    '..................KYY.................',
    '...................KW.................',
  ],
  // ティアマト: メソポタミアしんわの混沌の母にして五色竜の女王。白・青・赤・黒・緑の5つの竜頭が束になって生え、紫の巨躯に大きく広げた翼、胸の中央にピンクに光るハートの心臓（弱点コアの源）
  tiamat: [
    '..............YK....KY..............',
    '.........Y..Y..RRRRRR..Y..Y.........',
    '..WWWWW.bbbbbbRRYRRYRRKKKKKK.GGGGG..',
    '..WKWWW.bYbbYbRRRRRRRRKRKKRK.GKGGG..',
    '...WWW..bWbbWbRWKWWKWRKWKKWK..GGG...',
    '...WW.....bb....RRRR....KK.....GG...',
    '.....WW....bb...RRRR...KK....GG.....',
    '.......WW...bb..RRRR..KK...GG.......',
    '.........WW..bb.RRRR.KK..GG.........',
    '..pp......VWWPbbRRRRKKPGGV......pp..',
    'pppp......VPPPPPPPPPPPPPPV......pppp',
    'Kppppp....VPPPPPPPPPPPPPPV....pppppK',
    'ppppppp...VPPPPMMPMMPPPPPV...ppppppp',
    'ppppHpppVVVPPPPMWMMMPPPPPVVVpppHpppp',
    '..pppppp..VPPPPPMMMPPPPPPV..pppppp..',
    '...pppp...VPPPPPPMPPPPPPPV...pppp...',
    '...........VPHPPPPPPPPHPV...........',
    '...........VPHHHHHHHHHHPV...........',
    '..........VPPHHHHHHHHHHPPV..........',
    '...........PPPP..PP..PPPP...........',
    '...........VPPP..PP..PPPV...........',
    '...........VPPP..PP..PPPV...........',
    '..........PPPPP..PP..PPPPP..........',
    '..........YWYWY..PP..YWYWY..........',
    '.................PPP................',
    '...................PPP..............',
    '.....................PPPP...........',
    '........................PPPP........',
    '...........................PPP......',
    '..............................YY....',
  ],
  // ベヒーモス: ピンク/紫の四足魔獣。頭部に湾曲した角を複数＋たてがみ、
  // 牙を開いた口＋2つの目、どっしり四足歩行。禍々しいカードイラスト風。
  behemoth: [
    '..P..........................P..',
    '.PPP..M.M...........M.M....PPP..',
    '.PVP.MMPMM.........MMPMM..PVP...',
    '.PPP.PPPPP.........PPPPP..PPP...',
    '..PPPPPPPPPMMMMMMMMPPPPPPPPP....',
    '...PPPMMMMMMMMMMMMMMMMMMPPP.....',
    '...PPMMMMMMMMMMMMMMMMMMMMPP.....',
    '..PPMMMMOOMMMMMMMMMMOOMMMMPP....',
    '..PMMMMOKKOMMMMMMMMOKKOMMMMP....',
    '..PMMMMMMMMMMMMMMMMMMMMMMMMP....',
    '..PMMMMMKKMMMMMMMMMMKKMMMMMP....',
    '..PMMMWKWMWKWKWKWKWMWKWMWMMP....',
    '..pMMMMKWKWKRRRRKWKWKWKMMMMp....',
    '..ppMMMMMWKWKRRRRKWKWMMMMMpp....',
    '.pppMMMMMMMMMMMMMMMMMMMMMMppp...',
    '.ppMMMMMMMMMMMMMMMMMMMMMMMMpp...',
    '.pMMMMMMMMMMMMMMMMMMMMMMMMMMp...',
    'ppMMMMMMMMMMMMMMMMMMMMMMMMMMpp..',
    'pMMMMMMMMMMMMMMMMMMMMMMMMMMMMp..',
    'pMMMMMMMMMMMMMMMMMMMMMMMMMMMMp..',
    '.MMMMMM....MMMM....MMMMMM.......',
    '.pMMMMp....pMMp....pMMMMp.......',
    '.pMMMMp....pMMp....pMMMMp.......',
    '.WWWWWW....WWWW....WWWWWW.......',
  ],
  // デスサイザー: 骸骨の死神。ドクロの顔＋あばら骨＋黒フード＋大鎌
  reaper: [
    '.....................SSSSSSSSS..',
    '....................SSSSSSSSSSS.',
    '....................SS.......SS.',
    '......................T.........',
    '.........NNNNNNNNNN...T.........',
    '........NNNNNNNNNNNN..T.........',
    '.......NNNNNNNNNNNNNN.T.........',
    '.......NNWWWWWWWWWWNN.T.........',
    '.......NNWKKWWWWKKWNN.T.........',
    '.......NNWWWWWWWWWWNN.T.........',
    '.......NNWKWKWKWKWWNN.T.........',
    '.......NNNWWWWWWWWNNN.T.........',
    '......NNNNNNNNNNNNNNNWWT........',
    '......NNNNNNNNNNNNNNN.WT........',
    '.....NNNNNNNNNNNNNNNN..T........',
    '.....NNNWWNNWWNNWWNNN..T........',
    '.....NNNNNNNNNNNNNNNN..T........',
    '......NNNNNNNNNNNNNN...T........',
    '......NNNNNNNNNNNNNN...T........',
    '......NN.NNN.NNN.NN....T........',
    '......N..NN...NN..N.............',
  ],
  // ギガンテス: 緑肌の一つ目巨人。額に金の角1本＋額の大きな宝珠の目、
  // 青いマント/腰布＋金の帯、こぶ付きの巨大な木の棍棒を右手にかかげる。白い鉤爪。
  gigantes: [
    '..............Y.................',
    '.............YYY.......TTTTT....',
    '.............YYY......TTTTTTT...',
    '............gGGGg.....TTTOTTT...',
    '...........gGGGGGg....TTTTTTT...',
    '..........gGGGGGGGg...TTTTTTT...',
    '..........gGGGGGGGg...TTOTTTT...',
    '..........GWWWCWWWG...TTTTTT....',
    '..........GWCKCWWG....TTTTTT....',
    '..........gGGGGGGg...TTTTTT.....',
    '..........gGKKKKGg..TTTTTT......',
    '.........ggGGGGGGgg.TTTGG.......',
    '........gGGGGGGGGGGGGGGGGg......',
    '.......gGGGGGGGGGGGGGGGGGGg.....',
    '......gGGGGGgYYYYYYgGGGGGGGg....',
    '.....gGGGGGGGGGGGGGGGGGGGGGGg...',
    '....bbGGGGGGGGGGGGGGGGGGGGbb....',
    '...bbbbGGGGGGGGGGGGGGGGbbbb.....',
    '...bbbbbBbbGGGGGGGGbBbbbbb......',
    '....BBB.gGGGGGGGGGGGGg.BBB......',
    '........gGGGGg..gGGGGg..........',
    '........gGGGGg..gGGGGg..........',
    '.......WGGGGGW..WGGGGGW.........',
    '.......WWGGGWW..WWGGGWW.........',
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

  // ===== 傭兵（ショップで雇える味方・12x12・武器は本体とは別にctxで描画） =====
  mercKnight: [ // せいぎのナイト: 赤い羽飾り＋銀の兜＋青い鎧（武器はやり）
    '....RRRR....',
    '...RSSSSR...',
    '..SSSSSSSS..',
    '..SYKYYKYS..',
    '..SSSSSSSS..',
    '...SSSSSS...',
    '..SbbbbbbS..',
    '..bbBBBBbb..',
    '..SbbbbbbS..',
    '...bbbbbb...',
    '...SS..SS...',
    '...KK..KK...',
  ],
  mercArcher: [ // もりのアーチャー: 緑フード＋深緑の服＋革ベルト（武器はゆみ）
    '...GGGGGG...',
    '..GGGGGGGG..',
    '..GGYYYYGG..',
    '..GYKYYKYG..',
    '..GGYYYYGG..',
    '...GGGGGG...',
    '...gggggg...',
    '..ggTTTTgg..',
    '..gggggggg..',
    '...gggggg...',
    '...gg..gg...',
    '...KK..KK...',
  ],
};

// 色を明るく/暗くする（高精細シェーディング用。結果はキャッシュ）
const shadeCache = {};
function shade(hex, f) {
  const key = hex + f;
  if (!shadeCache[key]) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
    shadeCache[key] = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  return shadeCache[key];
}

// remap: 特定パレット文字の色を差し替える（服の色・ボスの色ちがい用）
// hd: 大きく拡大されるボス用。各ドットに上ハイライト＋下シャドウを入れて立体感を出す
function drawSprite(name, x, y, scale = 3, remap = null, hd = false) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  const useHd = hd && scale >= 2;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const ch = sprite[row][col];
      if (ch === '.') continue;
      const c = (remap && remap[ch]) || PALETTE[ch];
      const cx2 = px + col * scale;
      const cy2 = py + row * scale;
      ctx.fillStyle = c;
      ctx.fillRect(cx2, cy2, scale, scale);
      if (useHd) {
        const t = Math.max(1, Math.floor(scale * 0.28));
        // 上（または上が透明）のふちはハイライト
        if (row === 0 || sprite[row - 1][col] === '.' || sprite[row - 1][col] !== ch) {
          ctx.fillStyle = shade(c, 1.3);
          ctx.fillRect(cx2, cy2, scale, t);
        }
        // 下（または下が透明）のふちはシャドウ
        if (row === sprite.length - 1 || sprite[row + 1][col] === '.' || sprite[row + 1][col] !== ch) {
          ctx.fillStyle = shade(c, 0.72);
          ctx.fillRect(cx2, cy2 + scale - t, scale, t);
        }
        // 左のふちにも細いハイライトで輪郭を立てる
        if (col === 0 || sprite[row][col - 1] === '.') {
          ctx.fillStyle = shade(c, 1.18);
          ctx.fillRect(cx2, cy2, Math.max(1, Math.floor(t / 2) + 1), scale);
        }
      }
    }
  }
}

// 指定した枠(maxW×maxH)に収まる最大の整数scaleを求める（ボスずかんの詳細プレビュー用）
function fitSpriteScale(name, maxW, maxH) {
  const sprite = SPRITES[name];
  const rows = sprite.length;
  const cols = Math.max(...sprite.map(r => r.length));
  return Math.max(1, Math.floor(Math.min(maxW / cols, maxH / rows)));
}

// 未撃破ボスの輪郭のみを単色シルエットで描画（ボスずかんの「？？？」表示用）
function drawSilhouette(name, x, y, scale, color) {
  const sprite = SPRITES[name];
  const px = Math.round(x);
  const py = Math.round(y);
  ctx.fillStyle = color;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      if (sprite[row][col] === '.') continue;
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
  { name: 'シルバー', hex: '#c0c0c0' },
  { name: 'あお',     hex: '#3b5dc9' },
  { name: 'むらさき', hex: '#8b4f8b' },
  { name: 'オレンジ', hex: '#ef7d57' },
  { name: 'そらいろ', hex: '#73eff7' },
  { name: 'しろ',     hex: '#f4f4f4' },
];
let outfitIdx = Number(localStorage.getItem('hayato-outfit') || 0) % OUTFITS.length;
let playerName = localStorage.getItem('hayato-name') || '';

function playerRemap() {
  return { C: OUTFITS[outfitIdx].hex };
}

// 武器レベルで見た目が進化（下の FORM_SCORES のスコア閾値で段階が上がる。最終形態は約238,000点で到達）
const FORMS = [
  { sprite: 'player0', name: 'ぼうけんしゃ' },
  { sprite: 'player1', name: 'せんし' },
  { sprite: 'player2', name: 'ナイト' },
  { sprite: 'player3', name: 'ゴールドナイト' },
  { sprite: 'player4', name: 'ひかりのせんし' },
  { sprite: 'player5', name: 'でんせつのゆうしゃ' },
  { sprite: 'player6', name: 'せいなるゆうしゃ' },
  { sprite: 'player7', name: 'しんわのゆうしゃ' },
  { sprite: 'player8', name: 'てんくうのおうじゃ' },
  { sprite: 'player9', name: 'せいれいおう' },
  { sprite: 'player10', name: 'りゅうしんのゆうしゃ' },
  { sprite: 'player11', name: 'そうせいのしんおう' },
  { sprite: 'player12', name: 'ぜったいのかみ' },
];

// クラスチェンジはスコアで判定する（武器idxではなく固定スコア閾値7点）。
// 新武器を配列の途中に挿入しても既存の切り替わりタイミングがずれないようにするため。
// 各閾値は現行構成で Math.floor(武器idx/8) が段階を上げる武器idx=8,16,24,32,40,48,56 の
// スコア（スターシューター/モーニングスター/ジャベリン/らいじんのオノ/ゴールデンソード/
// ドリルランス/ドラゴンキラー）に一致させてある。
const FORM_SCORES = [3510, 10480, 20900, 34780, 52120, 72910, 97160, 120000, 145000, 173000, 204000, 238000];
function formForScore(s) {
  let f = 0;
  for (let i = 0; i < FORM_SCORES.length; i++) if (s >= FORM_SCORES[i]) f = i + 1;
  return Math.min(FORMS.length - 1, f);
}

// ---------- ゆうしゃレベル（Lv1〜12）----------
// スコアがしきい値を超えるたびにレベルアップし、決まったボーナスが積み重なる（カード選択ではない）。
// 武器やクラスチェンジとは別軸の「じわじわ強くなる」成長で、レベルアップ演出も派手に出す。
// apply は hero へ効果を積む（乗算ボーナスは重ねがけされる）。
const HERO_LV = [
  { score: 1500,  label: 'すばやさ +8%',       color: '#41a6f6', apply: h => h.speedMul *= 1.08 }, // Lv2
  { score: 4000,  label: 'ひっさつゲージ +20%', color: '#ff77a8', apply: h => h.gaugeMul *= 1.20 }, // Lv3
  { score: 8000,  label: 'むてきじかん +15%',   color: '#ffcd75', apply: h => h.invMul *= 1.15 },   // Lv4
  { score: 13000, label: 'リーチ +4%',          color: '#38b764', apply: h => h.reachMul *= 1.04 }, // Lv5
  { score: 19500, label: 'すばやさ +8%',        color: '#41a6f6', apply: h => h.speedMul *= 1.08 }, // Lv6
  { score: 27500, label: 'れんしゃ +8%',        color: '#73eff7', apply: h => h.fireMul *= 1.08 },  // Lv7
  { score: 37000, label: 'ふきとばし +20%',     color: '#ef7d57', apply: h => h.knockMul *= 1.20 }, // Lv8
  { score: 48000, label: 'かいしんの一撃！',     color: '#ff004d', apply: h => h.critChance = 0.08 }, // Lv9
  { score: 60500, label: 'ひっさつゲージ +20%', color: '#ff77a8', apply: h => h.gaugeMul *= 1.20 }, // Lv10
  { score: 74500, label: 'リーチ +4%',          color: '#38b764', apply: h => h.reachMul *= 1.04 }, // Lv11
  { score: 90000, label: 'ゆうしゃのオーラ！',   color: '#ffcd75', apply: h => h.auraChance = 0.12 }, // Lv12
];

function defaultHero() {
  return { level: 1, speedMul: 1, gaugeMul: 1, invMul: 1, reachMul: 1, fireMul: 1, knockMul: 1, critChance: 0, auraChance: 0 };
}
let hero = defaultHero();

// ---------- 武器の進化テーブル（69段階） ----------
// blades: 刃の本数 / dmg: 1振りのダメージ / kind: 見た目の種類
// flame: 火の玉 / lightning: 雷連鎖 / ice: 凍らせる / rainbow: 虹色
// saber: ライトセーバー（saberColorで刃の色、rainbowSaberで虹色に変化）
// yoyo: 刃の長さが伸び縮み / tesla: 近くの敵へ自動で電撃
// shoot: 飛び道具 {kind, interval, speed, dmg, count, pierce, aoe, aim, life, homing}
// スコア刻みは等差増分式（score(i)=250*i+27*i*(i-1)。増分が徐々に大きくなり後半ほど到達に時間がかかる）
// flame:true と hybrid:true は既存のダブル攻撃5武器（炎の剣/ジャベリン/ドラゴンキラー/エクスカリバー/
// インフィニティセーバー）専用。新武器には付けない（火力過多防止）。lightning/iceは追加弾ではないので新武器も可
const WEAPONS = [
  { name: 'ナイフ',               score: 0,     len: 34, width: 3,  spin: 0.090, blades: 1, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: 'こんぼう',             score: 250,   len: 40, width: 9,  spin: 0.110, blades: 1, dmg: 1, color: '#a77b5b', edge: '#8a5c3b', kind: 'club', knock: 24 },
  { name: '剣',                   score: 550,   len: 42, width: 5,  spin: 0.100, blades: 1, dmg: 1, color: '#f4f4f4', edge: '#94b0c2' },
  { name: 'ふたごのダガー',       score: 910,   len: 38, width: 3,  spin: 0.115, blades: 2, dmg: 1, color: '#c0c0c0', edge: '#f4f4f4' },
  { name: 'パチンコ',             score: 1320,  len: 30, width: 4,  spin: 0.100, blades: 1, dmg: 1, color: '#a77b5b', edge: '#f4f4f4', kind: 'sling',
    shoot: { kind: 'pellet', interval: 26, speed: 4.0, dmg: 1, count: 3 } },
  { name: 'ブーメラン',           score: 1790,  len: 36, width: 5,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#a77b5b', kind: 'boomer',
    shoot: { kind: 'boomerang', interval: 38, speed: 4.5, dmg: 1, pierce: true } },
  { name: '槍',                   score: 2310,  len: 58, width: 4,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#ef7d57', kind: 'spear' },
  { name: 'はんげつとう',         score: 2880,  len: 46, width: 8,  spin: 0.120, blades: 1, dmg: 1, color: '#f4f4f4', edge: '#ffcd75', kind: 'scimitar' },
  { name: 'スターシューター',     score: 3510,  len: 32, width: 3,  spin: 0.110, blades: 1, dmg: 1, color: '#ffcd75', edge: '#f4f4f4', kind: 'sling',
    shoot: { kind: 'pellet', interval: 22, speed: 4.5, dmg: 1, count: 4 } },
  { name: 'しゅりけん',           score: 4190,  len: 30, width: 3,  spin: 0.120, blades: 1, dmg: 1, color: '#333c57', edge: '#94b0c2', kind: 'ninja',
    shoot: { kind: 'shuriken', interval: 16, speed: 6.0, dmg: 1, count: 2 } },
  { name: 'てつぼう',             score: 4930,  len: 70, width: 7,  spin: 0.120, blades: 1, dmg: 1, color: '#566c86', edge: '#94b0c2', kind: 'club', knock: 24 },
  { name: 'ゆみ',                 score: 5720,  len: 34, width: 4,  spin: 0.110, blades: 1, dmg: 1, color: '#a77b5b', edge: '#f4f4f4', kind: 'bow',
    shoot: { kind: 'arrow', interval: 20, speed: 6.0, dmg: 1, pierce: true, aim: true } },
  { name: 'フレイル',             score: 6560,  len: 50, width: 5,  spin: 0.150, blades: 1, dmg: 2, color: '#566c86', edge: '#94b0c2', kind: 'chain', ballR: 10, knock: 22 },
  { name: 'ダブルナイフ',         score: 7460,  len: 38, width: 3,  spin: 0.115, blades: 2, dmg: 1, color: '#94b0c2', edge: '#f4f4f4' },
  { name: '大剣',                 score: 8410,  len: 52, width: 10, spin: 0.140, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4' },
  { name: 'アイスワンド',         score: 9420,  len: 38, width: 4,  spin: 0.125, blades: 1, dmg: 1, color: '#41a6f6', edge: '#73eff7', kind: 'wand', ice: true,
    shoot: { kind: 'orb', interval: 28, speed: 3.2, dmg: 1, count: 2, homing: 0.05 } },
  { name: 'モーニングスター',     score: 10480, len: 56, width: 5,  spin: 0.160, blades: 1, dmg: 2, color: '#566c86', edge: '#94b0c2', kind: 'chain', ballR: 11, knock: 22 },
  { name: 'ばくだん',             score: 11590, len: 32, width: 6,  spin: 0.110, blades: 1, dmg: 1, color: '#1a1c2c', edge: '#ef7d57', kind: 'bombH',
    shoot: { kind: 'bomb', interval: 50, speed: 2.6, dmg: 2, aoe: 45, life: 55, aim: true } },
  { name: '大槍',                 score: 12760, len: 74, width: 8,  spin: 0.140, blades: 1, dmg: 1, color: '#38b764', edge: '#ffcd75', kind: 'spear' },
  { name: 'つむじかぜのゆみ',     score: 13350, len: 36, width: 4,  spin: 0.115, blades: 1, dmg: 1, color: '#38b764', edge: '#f4f4f4', kind: 'bow',
    shoot: { kind: 'arrow', interval: 18, speed: 6.5, dmg: 1, pierce: true, aim: true } },
  { name: 'ハルバード',           score: 13980, len: 62, width: 8,  spin: 0.135, blades: 1, dmg: 2, color: '#94b0c2', edge: '#ffcd75', kind: 'axe', knock: 20 },
  { name: 'みつまたのほこ',       score: 15260, len: 66, width: 6,  spin: 0.140, blades: 1, dmg: 2, color: '#ffcd75', edge: '#f4f4f4', kind: 'trident' },
  { name: 'みだれしゅりけん',     score: 15900, len: 32, width: 3,  spin: 0.130, blades: 1, dmg: 1, color: '#566c86', edge: '#73eff7', kind: 'ninja',
    shoot: { kind: 'shuriken', interval: 14, speed: 6.5, dmg: 1, count: 3 } },
  { name: 'ムチ',                 score: 16590, len: 80, width: 4,  spin: 0.150, blades: 1, dmg: 1, color: '#a77b5b', edge: '#ffcd75', kind: 'whip' },
  { name: 'サンダーボウガン',     score: 17970, len: 36, width: 5,  spin: 0.120, blades: 1, dmg: 1, color: '#ffcd75', edge: '#f4f4f4', lightning: true, kind: 'bow',
    shoot: { kind: 'arrow', interval: 14, speed: 7.0, dmg: 1, aim: true } },
  { name: '炎の剣',               score: 19410, len: 60, width: 9,  spin: 0.130, blades: 1, dmg: 1, color: '#ef7d57', edge: '#ffcd75', flame: true, hybrid: true },
  { name: 'ジャベリン',           score: 20900, len: 62, width: 5,  spin: 0.125, blades: 1, dmg: 2, color: '#94b0c2', edge: '#ffcd75', kind: 'spear', hybrid: true,
    shoot: { kind: 'javelin', interval: 40, speed: 5.0, dmg: 2 } },
  { name: 'クロスボウ',           score: 22450, len: 36, width: 5,  spin: 0.120, blades: 1, dmg: 1, color: '#566c86', edge: '#a77b5b', kind: 'bow',
    shoot: { kind: 'arrow', interval: 12, speed: 7.0, dmg: 1, aim: true } },
  { name: 'オーロラブレード',     score: 24050, len: 62, width: 9,  spin: 0.140, blades: 1, dmg: 2, color: '#73eff7', edge: '#f4f4f4', ice: true },
  { name: 'バトルアックス',       score: 25700, len: 54, width: 9,  spin: 0.130, blades: 1, dmg: 2, color: '#94b0c2', edge: '#f4f4f4', kind: 'axe', knock: 20 },
  { name: '雷の槍',               score: 27410, len: 78, width: 5,  spin: 0.145, blades: 1, dmg: 1, color: '#ffcd75', edge: '#f4f4f4', lightning: true, kind: 'spear' },
  { name: 'フェニックスアロー',   score: 29170, len: 36, width: 4,  spin: 0.120, blades: 1, dmg: 2, color: '#ef7d57', edge: '#ffcd75', kind: 'bow',
    shoot: { kind: 'arrow', interval: 15, speed: 7.5, dmg: 2, pierce: true, aim: true } },
  { name: 'ハイパーヨーヨー',     score: 30990, len: 78, width: 5,  spin: 0.150, blades: 1, dmg: 2, color: '#b13e53', edge: '#f4f4f4', kind: 'yoyo', yoyo: true },
  { name: 'てっきゅう',           score: 32860, len: 60, width: 6,  spin: 0.150, blades: 1, dmg: 3, color: '#333c57', edge: '#566c86', kind: 'chain', ballR: 14, knock: 26 },
  { name: 'らいじんのオノ',       score: 34780, len: 58, width: 9,  spin: 0.135, blades: 1, dmg: 3, color: '#ffcd75', edge: '#f4f4f4', lightning: true, kind: 'axe', knock: 22 },
  { name: 'マシンガン',           score: 36760, len: 34, width: 5,  spin: 0.130, blades: 1, dmg: 1, color: '#333c57', edge: '#94b0c2', kind: 'gun',
    shoot: { kind: 'bullet', interval: 7, speed: 6.5, dmg: 1, aim: true } },
  { name: '氷の大剣',             score: 38790, len: 64, width: 11, spin: 0.145, blades: 1, dmg: 1, color: '#41a6f6', edge: '#f4f4f4', ice: true },
  { name: 'ロケットランチャー',   score: 40880, len: 36, width: 7,  spin: 0.125, blades: 1, dmg: 2, color: '#566c86', edge: '#ef7d57', kind: 'launcher',
    shoot: { kind: 'missile', interval: 42, speed: 4.2, dmg: 2, aoe: 32, homing: 0.06, aim: true } },
  { name: 'かえんほうしゃき',     score: 43020, len: 36, width: 6,  spin: 0.120, blades: 1, dmg: 1, color: '#566c86', edge: '#ef7d57', kind: 'flamer',
    shoot: { kind: 'flame', interval: 4, speed: 3.6, dmg: 1, life: 26, aim: true } },
  { name: 'トリプルソード',       score: 45210, len: 58, width: 7,  spin: 0.130, blades: 3, dmg: 1, color: '#f4f4f4', edge: '#41a6f6' },
  { name: 'かげろうのカタナ',     score: 47460, len: 64, width: 5,  spin: 0.165, blades: 2, dmg: 3, color: '#8b4f8b', edge: '#f4f4f4' },
  { name: 'まほうのつえ',         score: 49760, len: 40, width: 4,  spin: 0.130, blades: 1, dmg: 2, color: '#8b4f8b', edge: '#ff77a8', kind: 'wand',
    shoot: { kind: 'orb', interval: 30, speed: 3.2, dmg: 2, count: 2, homing: 0.06 } },
  { name: 'ゴールデンソード',     score: 52120, len: 70, width: 12, spin: 0.155, blades: 1, dmg: 3, color: '#ffcd75', edge: '#f4f4f4' },
  { name: 'スペクトルカッター',   score: 54530, len: 44, width: 5,  spin: 0.130, blades: 1, dmg: 3, color: '#8b4f8b', edge: '#73eff7', kind: 'boomer',
    shoot: { kind: 'boomerang', interval: 30, speed: 5.5, dmg: 3, pierce: true } },
  { name: 'しにがみのカマ',       score: 56990, len: 68, width: 6,  spin: 0.140, blades: 1, dmg: 3, color: '#566c86', edge: '#f4f4f4', kind: 'scytheW' },
  { name: 'たいほう',             score: 59510, len: 38, width: 9,  spin: 0.130, blades: 1, dmg: 2, color: '#333c57', edge: '#566c86', kind: 'cannon',
    shoot: { kind: 'cannonball', interval: 50, speed: 3.2, dmg: 3, aoe: 42, aim: true } },
  { name: 'クリスタルランス',     score: 62080, len: 76, width: 6,  spin: 0.140, blades: 1, dmg: 4, color: '#41a6f6', edge: '#73eff7', ice: true, kind: 'spear' },
  { name: 'ホーミングミサイル',   score: 64710, len: 36, width: 6,  spin: 0.130, blades: 1, dmg: 1, color: '#566c86', edge: '#b13e53', kind: 'launcher',
    shoot: { kind: 'missile', interval: 38, speed: 4.5, dmg: 3, aoe: 34, homing: 0.09, aim: true } },
  { name: 'レールガン',           score: 67390, len: 38, width: 5,  spin: 0.130, blades: 1, dmg: 3, color: '#333c57', edge: '#73eff7', kind: 'gun',
    shoot: { kind: 'laser', interval: 20, speed: 9.0, dmg: 3, pierce: true, aim: true } },
  { name: 'ライトセーバー',       score: 70120, len: 80, width: 7,  spin: 0.170, blades: 2, dmg: 4, saber: true, saberColor: '#73eff7', color: '#73eff7', edge: '#f4f4f4' },
  { name: 'プラズマライフル',     score: 71500, len: 36, width: 5,  spin: 0.135, blades: 1, dmg: 2, color: '#333c57', edge: '#73eff7', kind: 'gun',
    shoot: { kind: 'bullet', interval: 12, speed: 7.0, dmg: 2, aim: true } },
  { name: 'ドリルランス',         score: 72910, len: 72, width: 8,  spin: 0.150, blades: 1, dmg: 4, color: '#ffcd75', edge: '#a77b5b', kind: 'drill' },
  { name: 'ヴォルカニックキャノン', score: 74200, len: 40, width: 9, spin: 0.135, blades: 1, dmg: 3, color: '#46201a', edge: '#ef7d57', kind: 'cannon',
    shoot: { kind: 'cannonball', interval: 46, speed: 3.3, dmg: 3, aoe: 44, aim: true } },
  { name: 'せいじゃのメイス',     score: 75750, len: 60, width: 11, spin: 0.150, blades: 1, dmg: 4, color: '#ffcd75', edge: '#f4f4f4', kind: 'club', knock: 26 },
  { name: 'ヴォイドレイ',         score: 77100, len: 40, width: 5,  spin: 0.135, blades: 1, dmg: 3, color: '#1a1c2c', edge: '#8b4f8b', kind: 'gun',
    shoot: { kind: 'laser', interval: 22, speed: 8.5, dmg: 3, pierce: true, aim: true } },
  { name: 'ダブルライトセーバー', score: 78650, len: 74, width: 7,  spin: 0.175, blades: 2, dmg: 5, saber: true, saberColor: '#ff6b6b', color: '#ff6b6b', edge: '#f4f4f4' },
  { name: 'ツインミラーワンド',   score: 81600, len: 42, width: 4,  spin: 0.135, blades: 1, dmg: 3, color: '#8b4f8b', edge: '#ff77a8', kind: 'wand',
    shoot: { kind: 'orb', interval: 24, speed: 3.6, dmg: 3, count: 3, homing: 0.07 } },
  { name: 'テスラコイル',         score: 84600, len: 44, width: 5,  spin: 0.140, blades: 1, dmg: 2, color: '#566c86', edge: '#73eff7', kind: 'tesla', tesla: true },
  { name: 'メテオハンマー',       score: 87660, len: 68, width: 6,  spin: 0.155, blades: 1, dmg: 5, color: '#333c57', edge: '#ef7d57', kind: 'chain', ballR: 15, knock: 28 },
  { name: 'ブラックホールキャノン', score: 90770, len: 40, width: 9, spin: 0.130, blades: 1, dmg: 4, color: '#333c57', edge: '#8b4f8b', kind: 'cannon',
    shoot: { kind: 'cannonball', interval: 44, speed: 3.4, dmg: 4, aoe: 48, aim: true } },
  { name: 'タイタンランチャー',   score: 92300, len: 38, width: 7,  spin: 0.130, blades: 1, dmg: 2, color: '#333c57', edge: '#ffcd75', kind: 'launcher',
    shoot: { kind: 'missile', interval: 32, speed: 4.6, dmg: 3, aoe: 38, homing: 0.10, aim: true } },
  { name: 'りゅうせいのけん',     score: 93940, len: 80, width: 12, spin: 0.160, blades: 2, dmg: 5, color: '#ffcd75', edge: '#ef7d57', lightning: true },
  { name: 'ドラゴンキラー',       score: 97160, len: 76, width: 11, spin: 0.150, blades: 1, dmg: 4, color: '#b13e53', edge: '#ef7d57', flame: true, hybrid: true },
  { name: 'ギャラクシーバスター', score: 100430, len: 42, width: 9, spin: 0.140, blades: 1, dmg: 4, color: '#8b4f8b', edge: '#73eff7', kind: 'cannon',
    shoot: { kind: 'laser', interval: 12, speed: 8.5, dmg: 4, pierce: true, aim: true } },
  { name: 'エクスカリバー',       score: 103760, len: 84, width: 11, spin: 0.160, blades: 3, dmg: 4, rainbow: true, flame: true, lightning: true, color: '#f4f4f4', edge: '#ffcd75', hybrid: true },
  { name: 'インフィニティセーバー', score: 107140, len: 86, width: 8, spin: 0.180, blades: 3, dmg: 6, saber: true, rainbowSaber: true, lightning: true, color: '#f4f4f4', edge: '#f4f4f4', hybrid: true,
    shoot: { kind: 'laser', interval: 10, speed: 8.0, dmg: 2, pierce: true, aim: true } },
  { name: 'てんくうのつるぎ',     score: 110600, len: 88, width: 10, spin: 0.165, blades: 2, dmg: 7, knock: 20, lightning: true, ice: true, color: '#73eff7', edge: '#ffcd75' },
  { name: 'スーパーノヴァキャノン', score: 116900, len: 44, width: 10, spin: 0.140, blades: 1, dmg: 4, color: '#333c57', edge: '#ffcd75', kind: 'cannon', hybrid: false,
    shoot: { kind: 'cannonball', interval: 42, speed: 3.6, dmg: 5, aoe: 56, aim: true } },
  { name: 'りゅうじんセーバー',   score: 126500, len: 86, width: 9, spin: 0.165, blades: 4, dmg: 7, saber: true, saberColor: '#f4f4f4', rainbowSaber: true, tesla: true, color: '#f4f4f4', edge: '#f4f4f4' },
  // ここから「新8項目フィードバック対応」の新メカニクス武器3種（オービット刃／残像斬り／パリィ）
  { name: 'ギャラクシーツインリング', score: 137500, len: 70, width: 9, spin: 0.150, blades: 2, dmg: 6, rainbow: true, color: '#73eff7', edge: '#f4f4f4', hybrid: false, orbitals: { count: 3, r: 70, spin: -0.12 } },
  { name: 'じくうのカタナ・ムラクモ', score: 149500, len: 84, width: 8, spin: 0.170, blades: 2, dmg: 8, saber: true, saberColor: '#a685e2', color: '#a685e2', edge: '#f4f4f4', hybrid: false, echo: { delay: 18, mul: 0.5 } },
  { name: 'カオスブレイカー',     score: 162500, len: 88, width: 9, spin: 0.170, blades: 4, dmg: 8, saber: true, saberColor: '#c084fc', lightning: true, color: '#c084fc', edge: '#73eff7', hybrid: false, parry: true },
  // ここから追加武器3種（ロケットパンチ／てんていのいかずち／はどうほう）
  { name: 'ロケットパンチ', score: 176500, len: 48, width: 10, spin: 0.135, blades: 1, dmg: 4, knock: 30,
    color: '#ef7d57', edge: '#ffcd75', kind: 'fist', hybrid: false,
    shoot: { kind: 'rocketfist', interval: 36, speed: 5.2, dmg: 6, aoe: 40, aim: true } },
  { name: 'てんていのいかずち', score: 191500, len: 92, width: 9, spin: 0.175, blades: 4, dmg: 9, knock: 22,
    lightning: true, tesla: true, color: '#ffe94a', edge: '#f4f4f4', kind: 'boltrod', hybrid: false },
  { name: 'はどうほう', score: 207500, len: 60, width: 14, spin: 0.130, blades: 1, dmg: 6,
    color: '#1d5a80', edge: '#73eff7', kind: 'wavegun', hybrid: false,
    shoot: { kind: 'wave', interval: 55, speed: 6.0, dmg: 20, pierce: true, aim: true, life: 90, color: '#73eff7', r: 26 } },
  // ここから最上位3武器の「改（強化版）」「真（最強版）」。各武器を3段階にレベルアップ。
  // 段階が上がるごとに ダメージ・弾速・射撃間隔・貫通/範囲・色の派手さ を強化（hybrid は増やさない）。
  { name: 'ロケットパンチ改', score: 223500, len: 50, width: 11, spin: 0.140, blades: 1, dmg: 6, knock: 36,
    color: '#f0402f', edge: '#ffcd75', kind: 'fist', hybrid: false,
    shoot: { kind: 'rocketfist', interval: 30, speed: 6.0, dmg: 9, aoe: 48, aim: true } },
  { name: 'ロケットパンチ真', score: 239500, len: 52, width: 12, spin: 0.145, blades: 1, dmg: 9, knock: 42,
    color: '#ff2e4d', edge: '#fff275', kind: 'fist', hybrid: false,
    shoot: { kind: 'rocketfist', interval: 24, speed: 7.0, dmg: 12, aoe: 60, aim: true, count: 2 } },
  { name: 'てんていのいかずち改', score: 255500, len: 96, width: 10, spin: 0.185, blades: 4, dmg: 13, knock: 26,
    lightning: true, tesla: true, color: '#faff5a', edge: '#73eff7', kind: 'boltrod', hybrid: false },
  { name: 'てんていのいかずち真', score: 271500, len: 100, width: 11, spin: 0.195, blades: 6, dmg: 18, knock: 30,
    lightning: true, tesla: true, color: '#c9f5ff', edge: '#41a6f6', kind: 'boltrod', hybrid: false },
  { name: 'はどうほう改', score: 287500, len: 64, width: 16, spin: 0.132, blades: 1, dmg: 8,
    color: '#2a7db0', edge: '#a0f0ff', kind: 'wavegun', hybrid: false,
    shoot: { kind: 'wave', interval: 46, speed: 6.6, dmg: 28, pierce: true, aim: true, life: 100, color: '#a0f0ff', r: 30 } },
  { name: 'はどうほう真', score: 303500, len: 70, width: 18, spin: 0.135, blades: 1, dmg: 11,
    color: '#41a6f6', edge: '#ffffff', kind: 'wavegun', hybrid: false,
    shoot: { kind: 'wave', interval: 38, speed: 7.2, dmg: 38, pierce: true, aim: true, life: 110, color: '#c9f5ff', r: 34 } },
];

// ヨーヨーは刃の長さがリズミカルに伸び縮みする
// ジギムント戦ではインフィニティセーバーの刃が2.2倍にのびる（勇者の力の解放）
function weaponLen(w) {
  let L = w.len * hero.reachMul; // ゆうしゃレベルのリーチ強化（Lv5/Lv11）
  if (w.rainbowSaber && sigmundFight) L *= 2.2;
  return w.yoyo ? L * (0.55 + 0.45 * Math.sin(frame * 0.09)) : L;
}

function weaponForScore(s) {
  let idx = 0;
  for (let i = 0; i < WEAPONS.length; i++) {
    if (s >= WEAPONS[i].score) idx = i;
  }
  return idx;
}

// ---------- ステージ（全27。ボスを倒すと進む） ----------
// deco: 地面のかざり / fx: 天気・環境エフェクト
// mega: 画面中央の巨大ランドマーク演出（drawMegaDecoが type ごとに描き分ける）
const STAGES = [
  { name: 'だいそうげん',     bg: '#2b5a30', dot: '#4a8f52', deco: 'grass',   fx: 'petal',    mega: { type: 'silhouette', color: '#1f4a24' } },
  { name: 'ジャングル',       bg: '#1c421f', dot: '#357a3c', deco: 'jungle',  fx: 'leaf',     mega: { type: 'silhouette', color: '#12301a' } },
  { name: 'しっちたい',       bg: '#3c4526', dot: '#5f6b35', deco: 'swamp',   fx: 'bubble',   mega: { type: 'orb', color: '#e8e8c8' } },
  { name: 'あらしのへいげん', bg: '#2e3d4d', dot: '#46586b', deco: 'storm',   fx: 'rain',     mega: { type: 'beam', color: '#f4f4f4' } },
  { name: 'みずうみ',         bg: '#1d4e6b', dot: '#2f7ba3', deco: 'lake',    fx: 'ripple',   mega: { type: 'vortex', color: '#2f7ba3', core: '#0d2c40' } },
  { name: 'ちていこ',         bg: '#132f3a', dot: '#215a66', deco: 'cave',    fx: 'drip',     mega: { type: 'orb', color: '#73eff7' } },
  { name: 'さばく',           bg: '#6b562c', dot: '#8f7a45', deco: 'desert',  fx: 'sand',     mega: { type: 'orb', color: '#ffcd75' } },
  { name: 'こだいいせき',     bg: '#474156', dot: '#6b6480', deco: 'ruins',   fx: 'dust',     mega: { type: 'silhouette', color: '#312d40' } },
  { name: 'かざん',           bg: '#46201a', dot: '#7a3a2a', deco: 'volcano', fx: 'ember',    mega: { type: 'beam', color: '#ef7d57' } },
  { name: 'ようがんのうみ',   bg: '#571c0e', dot: '#963415', deco: 'lava',    fx: 'ember2',   mega: { type: 'orb', color: '#ff2e4d' } },
  { name: 'ひょうざん',       bg: '#2b5876', dot: '#4f8cb0', deco: 'iceberg', fx: 'snow',     mega: { type: 'silhouette', color: '#bfe3f5' } },
  { name: 'こおりのせかい',   bg: '#1f3c5e', dot: '#3b6ea5', deco: 'iceworld', fx: 'aurora',  mega: { type: 'ring', color: '#73eff7', color2: '#38b764' } },
  { name: 'うみのせかい',     bg: '#0f3350', dot: '#1d5a80', deco: 'sea',     fx: 'bubble2',  mega: { type: 'silhouette', color: '#0a2438' } },
  { name: 'まかい',           bg: '#241631', dot: '#5d275d', deco: 'makai',   fx: 'miasma',   mega: { type: 'ring', color: '#5d275d', color2: '#8b4f8b' } },
  { name: 'じごく',           bg: '#380d12', dot: '#7d1c26', deco: 'hell',    fx: 'hellfire', mega: { type: 'beam', color: '#b13e53' } },
  { name: 'てんかい',         bg: '#3d6a92', dot: '#6fa3c9', deco: 'heaven',  fx: 'feather',  mega: { type: 'beam', color: '#f4f4f4' } },
  { name: 'うちゅう',         bg: '#191b2b', dot: '#3b5dc9', deco: 'space',   fx: 'star',     mega: { type: 'orb', color: '#3b5dc9' } },
  { name: 'ぎんが',           bg: '#241a3d', dot: '#5d4a8a', deco: 'galaxy',  fx: 'gstar',    mega: { type: 'ring', color: '#5d4a8a', rainbow: true } },
  { name: 'ブラックホール',   bg: '#0c0c13', dot: '#26263a', deco: 'hole',    fx: 'warp',     mega: { type: 'vortex', color: '#8b4f8b', core: '#000000' } },
  { name: 'たじげんうちゅう', bg: '#2a1030', dot: '#7a2a8a', deco: 'multi',   fx: 'dimension', mega: { type: 'ring', color: '#7a2a8a', rainbow: true } },
  { name: 'こがねのてんくう', bg: '#4a3a1a', dot: '#c9a24a', deco: 'heaven',  fx: 'feather',  mega: { type: 'orb', color: '#ffcd75' } },
  { name: 'まがんのいわあな', bg: '#1c1420', dot: '#4a2e52', deco: 'cave',    fx: 'drip',     mega: { type: 'orb', color: '#b13e53' } },
  { name: 'こくようのしんでん', bg: '#2a1010', dot: '#5a1818', deco: 'ruins', fx: 'dust',     mega: { type: 'silhouette', color: '#1a0a0a' } },
  { name: 'せいじゅのしんりん', bg: '#0f2e14', dot: '#2a6b30', deco: 'jungle', fx: 'leaf',    mega: { type: 'silhouette', color: '#0a1f0e' } },
  { name: 'かんばつのだいち', bg: '#4a3418', dot: '#8a6a2a', deco: 'desert',  fx: 'sand',     mega: { type: 'vortex', color: '#8a6a2a', core: '#2a1c0a' } },
  { name: 'せいりゅうのてんくう', bg: '#0a2a4a', dot: '#3a7ac9', deco: 'galaxy', fx: 'gstar',  mega: { type: 'ring', color: '#3a7ac9', color2: '#41a6f6' } },
  { name: 'こんとんのしんえん', bg: '#150a20', dot: '#5a1a6a', deco: 'multi', fx: 'dimension', mega: { type: 'vortex', color: '#5a1a6a', core: '#000000', rainbow: true } },
  { name: 'ばんらいのそら',   bg: '#131735', dot: '#3a4a8f', deco: 'thundercloud', fx: 'thunder', mega: { type: 'beam', color: '#ffcd75' } },
];
const LAST_STAGE = STAGES.length; // 28

function currentStage() {
  return STAGES[Math.min(stage, LAST_STAGE) - 1];
}

// ---------- ステージごとのボス（神話の神々20体） ----------
// pattern: aim=狙い撃ち / wide=広範囲 / ring=全方向 / mix=交互 / spiral=螺旋
// shot: 投げるものの見た目 / gimmicks: split=分裂 rage=激怒 speed=高速化
//        summon=仲間よび shield=盾ガード weakpoint=弱点コア callboss=過去のボスをよびだす
// melee: punch=突進パンチ tail=しっぽ回転 stomp=ジャンプ踏みつけ dive=急降下体当たり
// mods: 弾の特殊効果 wave=うねる / dart=止まってから急加速 / bounce=壁で跳ね返る / burst=消えるとき破裂
// serifu: 出現時のセリフ（ドラクエ風ウィンドウに表示）
const BOSS_TYPES = [
  { name: 'ヤマタノオロチ', origin: 'にほんしんわ',   sprite: 'orochi',    aura: '#38b764', pattern: 'aim',    shot: 'snake',
    gimmicks: [],                    melee: ['tail'], mods: { wave: true }, rageRemap: { G: '#b13e53', g: '#5d1520' },
    serifu: 'シャアアア…！ わがねぐらに よくきたな…' },
  { name: 'ティラノサウルス', origin: 'きょうりゅうのおう', sprite: 'trex', aura: '#38b764', pattern: 'aim',   shot: 'fang',
    gimmicks: ['rage'],              melee: ['punch', 'stomp'], hpMul: 1.05, ballColors: ['#f4f4f4', '#38b764', '#f4f4f4'], rageRemap: { G: '#b13e53', g: '#5d1520' },
    serifu: 'ガアアアオオオオオッ！！' },
  { name: 'ヒュドラ',       origin: 'ギリシャしんわ', sprite: 'hydra',     aura: '#8b4f8b', pattern: 'wide',   shot: 'snake',
    gimmicks: ['split'],             melee: ['tail'], mods: { wave: true }, ballColors: ['#38b764', '#8b4f8b', '#38b764'], rageRemap: { B: '#b13e53', b: '#ef7d57', g: '#5d1520', C: '#ffcd75' },
    serifu: 'くびは いくらでも はえてくるぞ…' },
  { name: 'グリフォン',     origin: 'でんせつのまじゅう', sprite: 'griffin', aura: '#f4f4f4', pattern: 'rain', shot: 'wind',
    gimmicks: ['speed', 'summon'],   melee: ['dive'], hpMul: 1.05, summonHearts: true, ballColors: ['#73eff7', '#f4f4f4', '#73eff7'], rageRemap: { W: '#b13e53', T: '#5d1520' },
    serifu: 'あらしの そらは わたしのものだ！' },
  { name: 'クラーケン',     origin: 'うみのまもの',   sprite: 'kraken',    aura: '#8b4f8b', pattern: 'wide',   shot: 'ball',
    gimmicks: ['split'],             melee: ['tail'], hpMul: 1.1, mods: { burst: true }, ballColors: ['#5d275d', '#8b4f8b', '#1a1c2c'], rageRemap: { P: '#b13e53', p: '#5d1520' },
    serifu: 'うみのそこへ ひきずりこんでやろう…' },
  { name: 'ギガンテス',     origin: 'ひとつめのきょじんぞく', sprite: 'gigantes', aura: '#a77b5b', pattern: 'aim', shot: 'ball',
    gimmicks: ['rage'],              melee: ['stomp', 'punch'], hpMul: 1.1, mods: { bounce: true }, ballColors: ['#566c86', '#94b0c2', '#566c86'], rageRemap: { T: '#b13e53', g: '#5d1520' },
    serifu: 'グオオオ！ てつのこんぼうで ぶちくだく！！' },
  { name: 'アヌビス',       origin: 'エジプトしんわ', sprite: 'anubis',    aura: '#ffcd75', pattern: 'aim',    shot: 'light',
    gimmicks: ['shield'],            melee: ['stomp'], mods: { dart: true }, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'], rageRemap: { T: '#b13e53', K: '#5d1520' },
    serifu: 'さばきの ときが きた…' },
  { name: 'スフィンクス',   origin: 'エジプトしんわ', sprite: 'sphinx',    aura: '#ffcd75', pattern: 'wall',   shot: 'light',
    gimmicks: ['shield'],            melee: ['dive'], hpMul: 1.1, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'], rageRemap: { T: '#b13e53' },
    serifu: 'わたしの かべを こえられるかな？' },
  { name: 'ハデス',         origin: 'ギリシャしんわ', sprite: 'hades',     aura: '#ef7d57', pattern: 'rain',   shot: 'ball',
    gimmicks: ['rage'],              melee: ['punch'], hpMul: 1.15, rageRemap: { K: '#5d1520', P: '#b13e53' },
    serifu: 'めいかいへ ようこそ…' },
  { name: 'スルト',         origin: 'ほくおうしんわ', sprite: 'surtr',     aura: '#ef7d57', pattern: 'mix',    shot: 'ball',
    gimmicks: ['rage'],              melee: ['stomp', 'punch'], hpMul: 1.25, mods: { bounce: true }, rageRemap: { K: '#5d1520' },
    serifu: 'すべてを もやしつくす！！' },
  { name: 'ユミル',         origin: 'ほくおうしんわ', sprite: 'ymir',      aura: '#73eff7', pattern: 'ring',   shot: 'ice',
    gimmicks: ['shield'],            melee: ['stomp'], hpMul: 1.15, mods: { burst: true }, ballColors: ['#73eff7', '#f4f4f4', '#41a6f6'], rageRemap: { C: '#b13e53', D: '#5d1520' },
    serifu: 'こおりつけえええええ！' },
  { name: 'フェンリル',     origin: 'ほくおうしんわ', sprite: 'fenrir',    aura: '#94b0c2', pattern: 'aim',    shot: 'fang',
    gimmicks: ['speed'],             melee: ['punch', 'dive'], hpMul: 1.1, mods: { dart: true }, ballColors: ['#f4f4f4', '#94b0c2', '#f4f4f4'], rageRemap: { S: '#b13e53' },
    serifu: 'ガルルル…はやさで かてるかな？' },
  { name: 'メガロドン',     origin: 'しんかいのおうじゃ', sprite: 'megalodon', aura: '#41a6f6', pattern: 'wide', shot: 'ball',
    gimmicks: ['rage'],              melee: ['stomp', 'tail'], hpMul: 1.2, mods: { bounce: true }, ballColors: ['#41a6f6', '#f4f4f4', '#41a6f6'], rageRemap: { S: '#b13e53' },
    serifu: 'しんかいの あぎとから にげられまい！' },
  { name: 'ロキ',           origin: 'ほくおうしんわ', sprite: 'loki',      aura: '#8b4f8b', pattern: 'mix',    shot: 'sword',
    gimmicks: ['summon', 'speed', 'teleport'], melee: ['punch', 'dive'], hpMul: 1.15, ballColors: ['#94b0c2', '#f4f4f4', '#94b0c2'], rageRemap: { G: '#b13e53', p: '#5d1520' },
    serifu: 'フフフ…どれが ほんものかな？' },
  { name: 'エンマだいおう', origin: 'にほんしんわ',   sprite: 'enma',      aura: '#b13e53', pattern: 'rain',   shot: 'ball',
    gimmicks: ['rage', 'callboss'],  melee: ['stomp', 'punch'], hpMul: 1.3, rageRemap: { N: '#5d1520' },
    serifu: 'おまえの つみを かぞえよ！' },
  { name: 'ゼウス',         origin: 'ギリシャしんわ', sprite: 'zeus',      aura: '#ffcd75', pattern: 'cross',  shot: 'bolt',
    gimmicks: ['shield', 'callboss'], melee: ['dive'], hpMul: 1.2, ballColors: ['#ffcd75', '#f4f4f4', '#ffcd75'], rageRemap: { S: '#b13e53', b: '#5d1520' },
    serifu: 'てんばつを くらうがいい！' },
  { name: 'アマテラス',     origin: 'にほんしんわ',   sprite: 'amaterasu', aura: '#ffcd75', pattern: 'ring',   shot: 'light',
    gimmicks: ['weakpoint'],         melee: ['stomp'], hpMul: 1.2, mods: { burst: true }, ballColors: ['#ffcd75', '#f4f4f4', '#ef7d57'], rageRemap: { K: '#5d1520', W: '#b13e53' },
    serifu: 'ひかりのまえに ひれふしなさい' },
  { name: 'ベヒーモス',     origin: 'じゃりゅうのそっきん', sprite: 'behemoth', aura: '#8b4f8b', pattern: 'mix', shot: 'ball',
    gimmicks: ['speed', 'rage', 'callboss'], melee: ['punch', 'stomp', 'tail'], hpMul: 1.5, ballColors: ['#5d275d', '#8b4f8b', '#b13e53'], rageRemap: { P: '#b13e53', p: '#5d1520' },
    serifu: 'ジギムントさまのもとへは いかせん！' },
  { name: 'デスサイザー',   origin: 'じゃりゅうのそっきん', sprite: 'reaper', aura: '#8b4f8b', pattern: 'spiral', shot: 'scythe',
    gimmicks: ['teleport', 'summon'], melee: ['tail', 'stomp'], hpMul: 1.65, mods: { dart: true }, ballColors: ['#94b0c2', '#73eff7', '#94b0c2'], rageRemap: { N: '#5d1520', S: '#b13e53' },
    serifu: 'ここから さきは しのせかい…' },
  { name: 'じゃりゅうジギムント', origin: 'さいきょうのじゃりゅう', sprite: 'dragon', aura: '#b13e53', pattern: 'mix', shot: 'ball',
    gimmicks: ['rage', 'summon', 'weakpoint'], melee: ['punch', 'tail', 'stomp', 'dive'], hpMul: 2.0, points: 10000, big: true,
    deathEvent: true, // 撃破後に雷龍登場の会話イベントを挟む（ステージ20クリア演出）
    serifu: 'わがほのおで もえつきるがいい！！' },
  { name: 'ガルーダ',       origin: 'インドしんわ',       sprite: 'garuda',  aura: '#ffdd55', pattern: 'rain', shot: 'wind',
    gimmicks: ['teleport', 'callboss'], melee: ['dive'], hpMul: 1.2,
    remap: { Y: '#ffdd55', R: '#e8913a', M: '#ff2e4d', S: '#c9d4e0', b: '#4a7dc9' }, ballColors: ['#ffdd55', '#f4f4f4', '#ff9d2e'],
    serifu: 'てんくうの ちからを みせてやろう！' },
  { name: 'バロール',       origin: 'ケルトしんわ',       sprite: 'balor', aura: '#ff2e4d', pattern: 'wall', shot: 'light',
    gimmicks: ['weakpoint'], melee: ['stomp', 'punch'], hpMul: 1.25,
    remap: { T: '#7a2d3d' }, ballColors: ['#ff2e4d', '#f4f4f4', '#ff2e4d'],
    serifu: 'わがまなこに にらまれて ただですむとおもうな…' },
  { name: 'テスカトリポカ', origin: 'アステカしんわ',     sprite: 'tezcatlipoca',   aura: '#d4f236', pattern: 'mix', shot: 'fang',
    gimmicks: ['speed', 'callboss'], melee: ['dive', 'punch'], hpMul: 1.3,
    remap: { S: '#1a1a2e', W: '#c9d4e0', b: '#5b6988' }, ballColors: ['#1a1a2e', '#d4f236', '#1a1a2e'],
    serifu: 'よるのやみに ひそむ おれから にげられるか…？' },
  { name: 'フンババ',       origin: 'メソポタミアしんわ', sprite: 'humbaba', aura: '#38b764', pattern: 'mix', shot: 'ball',
    gimmicks: ['shield'], melee: ['stomp', 'punch'], hpMul: 1.35,
    ballColors: ['#38b764', '#257179', '#38b764'],
    serifu: 'もりを まもるため おまえを ふみつぶす！' },
  { name: 'ヴリトラ',       origin: 'インドしんわ',       sprite: 'vritra',   aura: '#8b4f8b', pattern: 'wide', shot: 'ball', big: true,
    gimmicks: ['rage', 'callboss'], melee: ['tail', 'stomp', 'punch'], hpMul: 1.8,
    remap: { N: '#2b2b3a', L: '#9a8a7a', P: '#6b2d8b', p: '#9a4fc9', W: '#d4b483', O: '#6b4423', V: '#3a1650', Y: '#ffd23e', R: '#ff2e4d', T: '#d4b483', C: '#41a6f6', D: '#73eff7', b: '#3b7dd8' }, ballColors: ['#41a6f6', '#9a4fc9', '#4a2c17'],
    form2Remap: { N: '#1a0f08', L: '#ff9d2e', P: '#7a2410', p: '#ff6b1a', W: '#ffcd75', O: '#3d1f0a', V: '#2a0d05', Y: '#ffcd2e', R: '#f4f4f4', T: '#c9a66b', C: '#ff9d2e', D: '#ffcd75', b: '#3d1f0a' }, form2Aura: '#ff6b1a',
    form2Serifu: 'かわいた だいちの いかりを うけよ…！',
    serifu: 'だいちの みずを すべて わがものに…！' },
  { name: 'セイリュウ',     origin: 'ちゅうごくしんわ',   sprite: 'seiryu',   aura: '#41a6f6', pattern: 'ring', shot: 'ice', big: true,
    gimmicks: ['callboss', 'rage', 'blizzard'], melee: ['tail', 'dive', 'stomp'], hpMul: 2.0,
    remap: { b: '#2f6690' }, ballColors: ['#41a6f6', '#73eff7', '#41a6f6'],
    form2Remap: { b: '#164e73', C: '#73eff7', D: '#f4f4f4', M: '#a8dadc' }, form2Aura: '#73eff7',
    form2Serifu: 'そうてんの いかりを そのみに うけよ…！',
    serifu: 'そうりゅうの いぶきを うけてみよ！' },
  { name: 'ティアマト',     origin: 'メソポタミアしんわ', sprite: 'tiamat',   aura: '#8b4f8b', pattern: 'mix', shot: 'ball', big: true,
    gimmicks: ['rage', 'summon', 'weakpoint', 'callboss', 'vortex'], melee: ['punch', 'tail', 'stomp', 'dive'], hpMul: 2.2, points: 15000,
    ballColors: ['#8b4f8b', '#ff2e4d', '#5d1520'],
    form2Remap: { P: '#160a20', p: '#c9284a', H: '#5d1520', M: '#ff2e4d', b: '#73eff7', G: '#7bf05a', R: '#ff2e4d' }, form2Aura: '#ff2e4d',
    form2Serifu: 'これが こんとんの しんのすがた… すべてを むにかえす！',
    serifu: 'こんとんの はは… すべてを のみこんでやろう！' },
  { name: 'ライリュウ',     origin: 'てんくうのはおう', sprite: 'rairyu', aura: '#ffcd75', pattern: 'spiral', shot: 'bolt', big: true,
    bossBgm: 'rairyu', // 雷太鼓＋高速ベースの専用BGM（他のドラゴン系DRAGON_CHORDSより速く鋭い）
    gimmicks: ['rage', 'summon', 'callboss', 'storm', 'weakpoint'], melee: ['dive', 'tail', 'stomp'], mods: { bounce: true }, hpMul: 2.9, points: 20000,
    remap: { R: '#ff2e4d', D: '#a8eaff' }, ballColors: ['#ffcd75', '#f4f4f4', '#73eff7'],
    breathName: 'いなずまのブレス！！', breathColors: ['#3b5dc9', '#73eff7', '#ffcd75'],
    form2Remap: { N: '#381038', L: '#5d275d', b: '#8b4f8b', Y: '#f4f4f4', D: '#f4f4f4', C: '#ff77a8', R: '#ff2e4d' }, form2Aura: '#b567b5',
    deathTalk: true, // 撃破時に専用の断末魔イベント（ジギムントのdeathEventとは別系統）
    deathColors: ['#1a1c2c', '#3b5dc9', '#73eff7', '#b567b5', '#f4f4f4'], // 崩れ落ちる体の雷パレット（紺→青→水色→紫→白）
    deathSpark: true, // 崩壊中に稲妻エフェクトを散らす
    serifu: 'わがなは ライリュウ…てんくうの いかずちは すべて わがしもべ！！',
    form2Serifu: 'よくぞ ここまで…！ ならば しでんの すがたで むかえうとう！！' },
];

// ジギムント第2形態の配色（体K=深紅・腹P=金・翼p=赤）とオーラ色。スプライトはdragon共用のまま差し替える
const SIGMUND_FORM2_REMAP = { K: '#5d1520', P: '#ffcd75', p: '#b13e53' };
const SIGMUND_FORM2_AURA = '#ff2e4d';

function currentBossType() {
  return BOSS_TYPES[Math.min(stage, LAST_STAGE) - 1];
}

// ---------- おみせ（5ステージごとのけっさん後に開く） ----------
const SHOP_ITEMS = [
  { id: 'heal',     name: 'ライフぜんかいふく',   desc: 'ハートが まんたんに もどる',            price: 200,  repeat: true },
  { id: 'contUp',   name: 'ふしちょうのはね',     desc: 'コンティニューが 1かい ふえる',         price: 1500, repeat: true },
  { id: 'armor',    name: 'てつのよろい',         desc: '12%で こうげきを ガードする',           price: 800 },
  { id: 'helm',     name: 'ゆうしゃのかぶと',     desc: 'さいだいライフが 10に ふえる',          price: 600 },
  { id: 'gauntlet', name: 'ちからのこて',         desc: 'ぶきの かいてんが 15% はやくなる',      price: 500 },
  { id: 'shield',   name: 'まほうのたて',         desc: 'てきのたまを 22%で はじきかえす',       price: 700 },
  { id: 'boots',    name: 'はやてのブーツ',       desc: 'いどうスピードが 20% アップ',           price: 400 },
  { id: 'cloak',    name: 'かげのマント',         desc: 'やられたあとの むてきじかんが 1.5ばい', price: 500 },
  { id: 'ring',     name: 'ひっさつのゆびわ',     desc: 'ひっさつゲージが 1.5ばい たまる',       price: 450 },
  { id: 'charm',    name: 'いのちのおまもり',     desc: 'ハートが 2ばい おちやすくなる',         price: 350 },
  { id: 'hagoromo', name: 'てんしのはごろも',     desc: 'やられても コンボが きれない',          price: 600 },
  { id: 'orb',      name: 'ふっかつのたま',       desc: 'ライフ0でも 1かいだけ ふっかつする',    price: 1500 },
  { id: 'bell',     name: 'まもりのすず',         desc: 'つぎの こうげきを 1かいだけ かならず ふせぐ', price: 300 },
  { id: 'magnet',   name: 'マグネットハート',     desc: 'おちている ハートが すいよせられてくる',      price: 400 },
  { id: 'necklace', name: 'コンボのくびかざり',   desc: 'コンボが きれるまでの じかんが 1.5ばい',      price: 450 },
  { id: 'wallet',   name: 'おうごんのさいふ',     desc: 'けっさんで もらえるゴールドが 25% ふえる',    price: 500 },
  { id: 'heartPot', name: 'ハートのつぼ',         desc: 'ハートをとると ライフが 2つ かいふくする',    price: 500 },
  { id: 'clover',   name: 'よつばのクローバー',   desc: 'かいしんのいちげきが 6% でるようになる',      price: 550 },
  { id: 'bandana',  name: 'まけずぎらいのバンダナ', desc: 'ライフのこり2いかで スピードが 15% アップ',  price: 600 },
  { id: 'crown',    name: 'おうじゃのかんむり',   desc: 'ひっさつを つかっても ゲージが 25 のこる',    price: 800 },
  { id: 'socks',    name: 'にじのくつした',       desc: 'はしると にじいろの キラキラが でる！',       price: 250 },
  { id: 'mercKnight', name: 'せいぎのナイト（傭兵）', desc: 'やりで いっしょに たたかう・5はつで しぼう',   price: 900,  repeat: true, merc: true },
  { id: 'mercArcher', name: 'もりのアーチャー（傭兵）', desc: 'ゆみで えんきょり・5はつで しぼう',           price: 1100, repeat: true, merc: true },
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

// ホワイトノイズ（風切り音・斬撃のシュパッという質感用）
let noiseBuf = null;
function noise(dur = 0.08, vol = 0.08, freq = 3000, type = 'highpass', delayMs = 0, slideTo = null) {
  if (!audioCtx) return;
  if (!noiseBuf) {
    noiseBuf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.3), audioCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true; // バッファは0.3秒しかないので、それより長いdurでも鳴り続くようにループ
  const filter = audioCtx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) filter.frequency.linearRampToValueAtTime(slideTo, t0 + dur); // 高→低スイープで「ズバッ」
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

let quietKills = false; // 必殺技の全滅処理中は個別の撃破音を鳴らさない

// （斬撃音はテストモードで10種を比較し、ユーザーが「ガシュッ」を正式採用。2026-07-11）

const SFX = {
  kill: (combo) => {
    if (quietKills) return;
    noise(0.14, 0.15, 2400, 'bandpass', 0, 400); // ズシャッと斬りとばす
    beep(520 + Math.min(combo, 12) * 45, 0.08, 'triangle', 0.05, 950 + combo * 45);
  },
  // 斬撃音「ガシュッ」: 食い込みの強い激重2段（テストモード比較でユーザーが採用）
  slash: () => {
    noise(0.06, 0.17, 1800, 'bandpass');
    noise(0.16, 0.13, 1200, 'bandpass', 20, 250);
    beep(180, 0.12, 'sawtooth', 0.06, 50);
  },
  hurt: () => beep(140, 0.25, 'sawtooth', 0.06, 50),
  heart: () => { beep(660, 0.08, 'sine', 0.06); beep(990, 0.12, 'sine', 0.06, null, 70); },
  fire: () => beep(300, 0.06, 'triangle', 0.02, 500),
  shoot: () => beep(700, 0.05, 'square', 0.02, 1100),
  boom: () => { beep(90, 0.4, 'sawtooth', 0.08, 40); beep(200, 0.25, 'square', 0.05, 60, 40); },
  bossFire: () => beep(180, 0.3, 'sawtooth', 0.05, 50),
  warn: () => beep(750, 0.16, 'square', 0.05, 480),
  zap: () => beep(1400, 0.08, 'sawtooth', 0.04, 200),
  thunder: () => {
    // 鋭いカミナリの割れる音 → 重く長い雷鳴のとどろき（巨大な雷の演出）
    noise(0.42, 0.16, 1300, 'bandpass');
    noise(0.7, 0.11, 320, 'lowpass', 40);      // 低くうなる余韻
    beep(1900, 0.14, 'sawtooth', 0.06, 150);   // 鋭い一撃
    beep(90, 0.78, 'sawtooth', 0.12, 28, 45);  // 重い雷鳴
    beep(52, 0.62, 'square', 0.07, 20, 120);   // 地響きの下支え
  },
  freeze: () => beep(880, 0.1, 'sine', 0.04, 660),
  guard: () => { beep(1200, 0.05, 'square', 0.05); beep(900, 0.08, 'square', 0.04, 500, 40); },
  // パリィ: 金属のカキーン＋弾き返しの上昇チャープ
  parry: () => { noise(0.05, 0.12, 3000, 'bandpass'); beep(1700, 0.05, 'square', 0.06, 1000); beep(2200, 0.1, 'sawtooth', 0.045, 3800, 30); },
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
    // 豪華な勝利ファンファーレ: かけ上がり→和音3連発→シンバル→大伸ばし
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => beep(f, 0.16, 'square', 0.055, null, i * 100));
    const chords = [[523, 659, 784], [587, 740, 880], [659, 831, 988]];
    chords.forEach((chord, i) => {
      chord.forEach((f) => {
        beep(f, 0.45, 'sawtooth', 0.03, null, 850 + i * 360);
        beep(f * 2, 0.45, 'triangle', 0.03, null, 850 + i * 360);
      });
      noise(0.3, 0.05, 5000, 'highpass', 850 + i * 360); // シンバル
    });
    [1047, 1319, 1568, 2093].forEach((f, i) => beep(f, 1.4, 'triangle', 0.05, null, 1950 + i * 70));
    noise(0.8, 0.06, 4000, 'highpass', 1950);
  },
  // はどうほう: 発射直前のエネルギー充填（低→高へ吸い上がるうなり）
  waveCharge: () => {
    beep(110, 0.32, 'sawtooth', 0.05, 1000);
    beep(300, 0.32, 'sine', 0.035, 1700, 40);
    beep(60, 0.3, 'square', 0.045, 260);
  },
  // はどうほう: 着弾の炸裂（水色の破裂音）
  waveHit: () => {
    beep(220, 0.16, 'sawtooth', 0.07, 70);
    beep(1300, 0.1, 'triangle', 0.05, 480);
    noise(0.18, 0.08, 1600, 'bandpass', 0, 400);
  },
  // 花火の音
  fireworkLaunch: () => beep(500 + Math.random() * 300, 0.5, 'sine', 0.03, 1500),
  fireworkPop: () => {
    noise(0.22, 0.07, 1400, 'bandpass');
    beep(180 + Math.random() * 250, 0.3, 'triangle', 0.045, 55);
  },
};

// ---------- 遠距離武器 演出テーブル（Phase2a: kind別に音・色・演出を分ける） ----------
// SHOT_FX[kind]: 弾ごとの見た目/演出の既定値
//   color   : 弾・着弾の基準色（WEAPONS の shoot.color が優先）
//   burst   : 着弾時に散らす火花の数
//   trail   : 飛行中に尾を引く色（null なら尾なし）。武器側 shoot.trail で上書き可
//   heavy   : true なら重量弾（着弾で 2F の小ヒットストップ）
const SHOT_FX = {
  bullet:     { color: '#f4f4f4', burst: 5, trail: null,      heavy: false },
  pellet:     { color: '#ffcd75', burst: 4, trail: null,      heavy: false },
  shuriken:   { color: '#94b0c2', burst: 4, trail: null,      heavy: false },
  arrow:      { color: '#f4f4f4', burst: 4, trail: null,      heavy: false },
  javelin:    { color: '#94b0c2', burst: 6, trail: null,      heavy: true  },
  laser:      { color: '#73eff7', burst: 7, trail: '#73eff7', heavy: false },
  orb:        { color: '#ff77a8', burst: 6, trail: '#ff77a8', heavy: false },
  missile:    { color: '#ef7d57', burst: 8, trail: '#ef7d57', heavy: true  },
  cannonball: { color: '#94b0c2', burst: 8, trail: '#566c86', heavy: true  },
  bomb:       { color: '#ef7d57', burst: 6, trail: null,      heavy: false },
  boomerang:  { color: '#ffcd75', burst: 4, trail: null,      heavy: false },
  flame:      { color: '#ffcd75', burst: 3, trail: null,      heavy: false },
  rocketfist: { color: '#ef7d57', burst: 8, trail: '#ffcd75', heavy: true  },
  wave:       { color: '#73eff7', burst: 10, trail: '#41a6f6', heavy: true  },
};

// 弾の基準色（武器の shoot.color を最優先、なければ kind の既定色）
function shotColor(f) {
  return f.color || (SHOT_FX[f.kind] && SHOT_FX[f.kind].color) || '#ffcd75';
}

// 発射音の kind 別ディスパッチ。近接（0.17）より控えめ（0.05〜0.08）。
// 連射系（interval が短い）は 3 発に 1 回だけ鳴らしてリズムで聞かせる（毎回だとうるさい）
let shootSeq = 0;
function shootSFX(kind, interval) {
  if (interval <= 10) { shootSeq++; if (shootSeq % 3 !== 0) return; }
  switch (kind) {
    case 'bullet':                       // マシンガン: 乾いたパンッ
      beep(780, 0.045, 'square', 0.05, 240); noise(0.03, 0.05, 3200, 'highpass'); break;
    case 'laser':                        // レールガン系: ピシューン
      beep(1700, 0.12, 'sawtooth', 0.06, 320); beep(950, 0.08, 'square', 0.04, 1900); break;
    case 'missile':                      // ロケット: プシュッと噴射
      noise(0.14, 0.06, 900, 'bandpass', 0, 220); beep(230, 0.14, 'sawtooth', 0.05, 90); break;
    case 'cannonball':                   // 大砲: ドムッと重い
      beep(120, 0.18, 'sawtooth', 0.07, 45); noise(0.1, 0.06, 700, 'lowpass'); break;
    case 'bomb':                         // 投擲: ぽすっ
      beep(200, 0.1, 'triangle', 0.05, 90); break;
    case 'arrow': case 'javelin':        // 弓・投槍: ヒュンッ
      beep(1250, 0.08, 'triangle', 0.055, 380); break;
    case 'orb':                          // 杖: キラッと魔法
      beep(900, 0.1, 'sine', 0.05, 1500); beep(1500, 0.08, 'triangle', 0.04, null, 30); break;
    case 'pellet': case 'shuriken':      // パチンコ・手裏剣: パスッ
      beep(680, 0.05, 'square', 0.05, 1050); break;
    case 'boomerang':                    // ブーメラン: ヒュルル
      beep(520, 0.14, 'triangle', 0.05, 950); break;
    case 'flame':                        // かえんほうしゃき: ゴォッ（連射なので薄く）
      noise(0.06, 0.03, 1200, 'bandpass', 0, 400); break;
    case 'rocketfist':                   // ロケットパンチ: ドッと打ち出す＋噴射
      beep(180, 0.1, 'square', 0.06, 70); noise(0.16, 0.06, 800, 'bandpass', 0, 240); break;
    case 'wave':                         // はどうほう: 重低音の溜め→中音の共鳴→高音の解放→衝撃波の余韻＋炸裂ノイズ
      beep(64, 0.24, 'sawtooth', 0.13, 42);         // 地を揺らす重低音の溜め
      beep(180, 0.2, 'square', 0.09, 90, 30);       // 中音の共鳴
      beep(1700, 0.14, 'sawtooth', 0.08, 360, 90);  // 高音へ吹き抜ける解放
      beep(950, 0.16, 'triangle', 0.06, 120, 120);  // 落ちていく衝撃波の余韻
      noise(0.34, 0.11, 1500, 'bandpass', 55, 260); // ドバッと放たれる炸裂ノイズ
      break;
    default:
      beep(700, 0.05, 'square', 0.05, 1100);
  }
}

// 発射口のマズルフラッシュ（粒子）。全遠距離武器に展開
function muzzleFlash(x, y, ang, kind) {
  const c = (SHOT_FX[kind] && SHOT_FX[kind].color) || '#ffcd75';
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = ang + (Math.random() - 0.5) * 0.9;
    const sp = 0.8 + Math.random() * 1.6;
    pushParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 5 + Math.random() * 5, color: Math.random() < 0.5 ? c : '#f4f4f4' }, true);
  }
}

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
// じゃりゅうバハムート専用BGM: 速く激しい鼓動＋うなる低音（恐怖の最終決戦）
const DRAGON_CHORDS = [
  [52, 55, 59], // Em
  [50, 53, 56], // D dim
  [48, 52, 55], // C
  [47, 50, 53], // B dim
];
// ライリュウ専用BGM: 雷太鼓の連打＋疾走する低音（Em→C→D→B）と鋭い稲妻メロディ
const RAIRYU_CHORDS = [
  [52, 55, 59], // Em
  [48, 52, 55], // C
  [50, 54, 57], // D
  [47, 51, 54], // B
];
const RAIRYU_MELODY = [76, 0, 79, 76, 83, 0, 79, 0, 84, 83, 79, 76, 75, 0, 74, 0];
// ライリュウ専用BGM 案B（重厚系）: フリジアン進行 Em→F→Em→B のオルガン和音＋雷ドラム。
// 案Aの疾走感（sawtooth主体・%5）とは対照的に、どっしり構える（%8）
const RAIRYU_CHORDS_B = [
  [52, 55, 59], // Em
  [53, 57, 60], // F
  [52, 55, 59], // Em
  [47, 51, 54], // B
];
const RAIRYU_MELODY_B = [64, 0, 0, 0, 65, 0, 0, 0, 64, 0, 62, 0, 59, 0, 0, 0];
// エンディングBGM: 荘厳な勝利のテーマ（ロマサガ「決戦！サルーイン」風の
// ハーモニックマイナー進行 Am→G→F→E。オルガンの和音＋駆動ベース＋ティンパニ＋鐘）
const CLEAR_CHORDS = [
  [57, 60, 64], // Am
  [55, 59, 62], // G
  [53, 57, 60], // F
  [52, 56, 59], // E（G#入り＝ハーモニックマイナーの緊張感）
];
const CLEAR_BASS = [45, 52, 45, 57, 43, 50, 43, 55, 41, 48, 41, 53, 40, 47, 40, 52];
const CLEAR_MELODY = [69, 0, 72, 74, 76, 0, 74, 72, 77, 0, 76, 74, 76, 0, 71, 68];
let bossChordIdx = 0;
let musicFrame = 0;
let musicStep = 0;
let bgmTestVariant = 'A'; // BGM A/B比較用テストコード（選定後削除予定）: 'A'=疾走系 / 'B'=重厚系
const midi2f = (n) => 440 * Math.pow(2, (n - 69) / 12);

function tickMusic() {
  if (bossEvent) return; // ボス撃破イベント中はBGMを止める（雷龍登場の会話演出）
  if (!audioCtx || !musicOn || paused) return;
  if (state !== 'playing' && state !== 'shop' && state !== 'tally' && state !== 'clear') return;
  if (warningTimer > 0 && state === 'playing') return; // WARNING中はサイレンだけ響かせる
  musicFrame++;
  // エンディング: 荘厳な勝利のテーマ
  if (state === 'clear') {
    if (musicFrame % 8 !== 0) return;
    const chord = CLEAR_CHORDS[Math.floor(musicStep / 4) % 4];
    if (musicStep % 4 === 0) {
      for (const n of chord) {
        beep(midi2f(n), 1.5, 'triangle', 0.02);
        beep(midi2f(n - 12), 1.5, 'sine', 0.018);
      }
    }
    const b = CLEAR_BASS[musicStep];
    if (b) beep(midi2f(b - 12), 0.16, 'sawtooth', 0.03);
    const m = CLEAR_MELODY[musicStep];
    if (m) {
      beep(midi2f(m), 0.3, 'square', 0.035);
      beep(midi2f(m + 12), 0.3, 'triangle', 0.02);
    }
    if (musicStep % 8 === 0) beep(midi2f(33), 0.25, 'sine', 0.06, midi2f(31)); // ティンパニ
    if (musicStep % 8 === 4) beep(midi2f(chord[0] + 24), 1.2, 'sine', 0.025);  // 高く響く鐘
    musicStep = (musicStep + 1) % 16;
    return;
  }
  if (bossActive && state === 'playing') {
    // ライリュウは専用BGM（big級共通判定より前に処理する）。案A/案BをA/Bテストモードで切替
    const stormBoss = enemies.find((en) => en.boss && en.type.bossBgm === 'rairyu');
    if (stormBoss) {
      if (bgmTestVariant === 'B') {
        // 案B（重厚系）: フリジアン進行のオルガン和音＋雷ドラム。どっしりした拍（%8）
        if (musicFrame % 8 !== 0) return;
        const chord = RAIRYU_CHORDS_B[bossChordIdx % RAIRYU_CHORDS_B.length];
        if (musicStep % 4 === 0) {
          // オルガン風の2オクターブ重ね和音（triangle+sine）＋地を這うベース
          for (const n of chord) {
            beep(midi2f(n), 1.6, 'triangle', 0.02);
            beep(midi2f(n - 12), 1.6, 'sine', 0.02);
          }
          beep(midi2f(chord[0] - 24), 1.6, 'sawtooth', 0.03);
          bossChordIdx++;
        }
        // 雷ドラム: どっしり響く低音パーカッション（4分の頭でドーン）
        if (musicStep % 4 === 0) { noise(0.28, 0.055, 160, 'lowpass'); beep(41, 0.3, 'sine', 0.06, 28); }
        if (musicStep % 8 === 4) noise(0.14, 0.04, 900, 'highpass'); // 遠雷のうなり
        // 重く鳴るメロディ（オクターブ下も重ねて厚みを出す）
        const m = RAIRYU_MELODY_B[musicStep];
        if (m) {
          beep(midi2f(m), 0.5, 'square', 0.028);
          beep(midi2f(m - 12), 0.5, 'triangle', 0.02);
        }
        musicStep = (musicStep + 1) % 16;
        return;
      }
      // 案A（疾走系）: 雷太鼓＋疾走ベース。速く鋭いテンポ（%5）
      if (musicFrame % 5 !== 0) return;
      const chord = RAIRYU_CHORDS[bossChordIdx % RAIRYU_CHORDS.length];
      if (musicStep % 4 === 0) {
        // 疾走する低音（オクターブ下＋うなる最低音）
        for (const n of chord) beep(midi2f(n - 12), 0.5, 'sawtooth', 0.02);
        beep(midi2f(chord[0] - 24), 0.5, 'sawtooth', 0.045);
        bossChordIdx++;
      }
      // 雷太鼓: 16分で刻む疾走する鼓動
      beep(midi2f(chord[0] - 24), 0.09, 'square', 0.038, midi2f(chord[0] - 28));
      if (musicStep % 2 === 1) noise(0.05, 0.028, 1400, 'highpass'); // 雷のパチパチ
      if (musicStep % 8 === 4) noise(0.2, 0.05, 220, 'lowpass');      // 太鼓のドン
      // 鋭い稲妻メロディ
      const m = RAIRYU_MELODY[musicStep];
      if (m) {
        beep(midi2f(m), 0.16, 'square', 0.03);
        beep(midi2f(m + 12), 0.16, 'triangle', 0.018);
      }
      if (musicStep === 12) beep(midi2f(chord[((musicStep / 4) | 0) % 3] + 12), 0.4, 'sine', 0.025); // 高く鳴る鐘
      musicStep = (musicStep + 1) % 16;
      return;
    }
    // 最終ボスのドラゴンは専用BGM（速い鼓動＋うなる低音）
    if (enemies.some((en) => en.boss && en.type.big)) {
      if (musicFrame % 7 !== 0) return;
      const chord = DRAGON_CHORDS[bossChordIdx % DRAGON_CHORDS.length];
      if (musicStep % 8 === 0) {
        for (const n of chord) beep(midi2f(n - 12), 1.2, 'sawtooth', 0.022);
        beep(midi2f(chord[0] - 24), 1.2, 'sawtooth', 0.04);
        bossChordIdx++;
      }
      if (musicStep % 2 === 0) beep(midi2f(chord[0] - 24), 0.12, 'square', 0.04, midi2f(chord[0] - 27));
      if (musicStep % 8 === 4) beep(midi2f(chord[2] + 12), 0.5, 'sawtooth', 0.025, midi2f(chord[2] + 11));
      if (musicStep === 12) beep(midi2f(chord[0] + 24), 0.8, 'sine', 0.03);
      musicStep = (musicStep + 1) % 16;
      return;
    }
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
  // BGM A/B比較用テストコード（選定後削除予定）: ライリュウBGMを 1キー=案A（疾走系）/ 2キー=案B（重厚系）で切替
  if (e.key === '1') { bgmTestVariant = 'A'; bossChordIdx = 0; musicStep = 0; beep(660, 0.08, 'square', 0.04); }
  if (e.key === '2') { bgmTestVariant = 'B'; bossChordIdx = 0; musicStep = 0; beep(440, 0.12, 'triangle', 0.04); }
  if (state === 'title') {
    if (e.key === 'Enter') startGame();
    if (e.key === 'ArrowLeft') {
      debugStage = debugStage <= 1 ? LAST_STAGE : debugStage - 1;
      beep(400, 0.03, 'square', 0.03);
    }
    if (e.key === 'ArrowRight') {
      debugStage = debugStage >= LAST_STAGE ? 1 : debugStage + 1;
      beep(600, 0.03, 'square', 0.03);
    }
    if (e.key === 'b' || e.key === 'B') {
      startGame();
      stage = debugStage;
      nextBossScore = 0; // 直後の警告演出を経てすぐボスへ突入（デバッグ用ステージスキップ）
    }
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
    if (e.key === 'z' || e.key === 'Z') {
      state = 'zukan';
      beep(700, 0.07, 'triangle', 0.05);
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
  } else if (state === 'zukan') {
    if (e.key === 'ArrowUp') { zukanCursor = (zukanCursor - 1 + BOSS_TYPES.length) % BOSS_TYPES.length; beep(500, 0.03, 'square', 0.03); }
    if (e.key === 'ArrowDown') { zukanCursor = (zukanCursor + 1) % BOSS_TYPES.length; beep(500, 0.03, 'square', 0.03); }
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'z' || e.key === 'Z') state = 'title';
  } else if (state === 'gameover') {
    // スペース＝コンティニュー（死んだ直後にスペース連打していても進行が消えない配置）
    if ((e.key === ' ' || e.key === 'c' || e.key === 'C') && continuesLeft > 0) continueGame();
    else if (e.key === 'Enter') state = 'title';
  }
});

// ゲームオーバーした場所からコンティニュー（スコア・武器・ステージ・ゴールド・装備は維持）
function continueGame() {
  continuesLeft--;
  // ジギムント戦（最終決戦）などの巨大ボス戦でのコンティニューは特別に満タンで復帰
  lives = enemies.some((en) => en.boss && en.type.big) ? maxLives() : 8;
  player.x = W / 2 - PLAYER_SIZE / 2;
  player.y = H / 2 - PLAYER_SIZE / 2;
  fireballs = [];      // 弾は全部消える
  enemies = enemies.filter((en) => en.boss); // 雑魚は消え、ボスは残りHPそのままで続行
  invincibleTimer = 240;
  combo = 0;
  comboTimer = 0;
  playerSlowT = 0;
  bannerText = `コンティニュー！（のこり${continuesLeft}かい）`;
  bannerTimer = 150;
  flashTimer = 20;
  rainbowBurst(W / 2, H / 2, 50, 4);
  SFX.fanfare();
  state = 'playing';
}
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
const TANK_SIZE = 64; // ストーンゴーレムは特大サイズ
const BOSS_SIZE = 160;   // ボスは緑の敵の5倍
const TALLY_COUNT_FRAMES = 150;

let state = 'title'; // title / playing / tally / shop / clear / gameover / zukan
let gframe = 0;
// 配列はタイトル画面の時点でも参照されるため、必ず初期化しておく
let player;
let enemies = [], particles = [], pshots = [], fireballs = [], items = [], popups = [], bolts = [];
let pendingEnemies = []; // 分裂で生まれた雑魚は次フレームに合流（同フレームの多重ヒットを防ぐ）
let shockwaves = []; // 広がる衝撃波リング（近接攻撃・巨大弾の演出用）
let strikes = [];    // ライリュウの落雷予告マーカー（予告→一定フレーム後に落雷）
let fences = [];     // ライリュウ「いかずちのかご」の電気フェンス（予告→本体でダメージ判定）
let novas = [];      // ライリュウ「ばんらいノヴァ」の広がる電気リング（第2形態専用）
let frost = [];      // セイリュウ「ひょうけつのあらし」の氷柱（予告→隆起でダメージ＋凍結）
let vortexes = [];   // ティアマト「こんとんのうず」の引き寄せ渦（予告→吸引→爆発）
let slashes = [];    // 白い斬撃エフェクト（ヒットの気持ちよさ用）
let hitstopT = 0;    // ヒットストップ: 当たった瞬間、世界が数フレーム止まる（イース風の手ごたえ）
let score, lives, weaponIdx, formIdx, weaponAngle, frame, spawnTimer, invincibleTimer;
let orbitAngle = 0;   // オービット刃（ギャラクシーツインリング）の周回角度。本体の回転とは独立
let angleHist = [];   // 武器角度の履歴リングバッファ（じくうのカタナ・ムラクモの残像斬り用）
let bannerText, bannerTimer, shakeTimer, flameTimer, shootTimer, flashTimer, redFlashTimer;
let combo, comboTimer, maxCombo;
let bossActive, nextBossScore, bossCount, warningTimer;
let stage, specialGauge, playerSlowT;
let paused = false;
const BOSS_SPECIAL_LIMIT = 5; // 同じボス戦の中で必殺技を使える回数
let bossSpecialsUsed = 0;
let gold, gear, lastTallyScore, pendingTally, finalClear;
let mercenaries = []; // ショップで雇った傭兵（最大2体・武器レベル固定・ハート回復なし・5発で死亡）
const MERC_MAX = 2;        // 同時に連れて歩ける最大数
const MERC_MAX_HITS = 5;   // このダメージ回数で死亡
const MERC_OFFSETS = [{ x: -34, y: 18 }, { x: 34, y: 18 }]; // 主人公の後方左右の隊列位置
const MERC_TYPES = {
  mercKnight: {
    name: 'せいぎのナイト', sprite: 'mercKnight', color: '#3b5dc9',
    ranged: false, dmg: 2, reach: 52, atkInterval: 45, price: 900,
    desc: 'やりで せっきんせん・こうげき力たかめ',
  },
  mercArcher: {
    name: 'もりのアーチャー', sprite: 'mercArcher', color: '#38b764',
    ranged: true, dmg: 1, range: 240, atkInterval: 34, arrowSpeed: 5.5, half: true, price: 1100,
    desc: 'ゆみで えんきょり・ボスへは ダメージ半分',
  },
};
let continuesLeft = 3; // ゲームオーバーからのコンティニュー残り回数（1プレイ3回まで）
let serifuTimer = 0, serifuName = '', serifuText = '', serifuReply = ''; // ボス出現セリフ（ドラクエ風ウィンドウ）
let sigmundFight = false;        // ジギムント戦中か（勇者スピードUP・セーバー延長）
let sigmundPowerPending = false; // セリフのあとに「ちからが かいほうされた！」を出す予約
let bossEvent = null;            // ジギムント撃破後の雷龍登場イベント（playing内カットシーン。null=非発生）
let tally = { t: 0, earned: 0, bonus: 0, total: 0, given: false, cleared: 0 };
let shopIdx = 0;
let shopScroll = 0;
let highScore = Number(localStorage.getItem('hayato-highscore') || 0);
// ボスずかん: 撃破済みボスのBOSS_TYPESインデックスを永続記録（周回のやり込み要素）
let defeatedBosses = new Set(JSON.parse(localStorage.getItem('hayato-bosszukan') || '[]'));
let zukanCursor = 0; // 図鑑画面で選択中のボスindex（BOSS_TYPESの添字）
let debugStage = 1; // タイトル画面の◀▶で選ぶデバッグ用開始ステージ（Bキーでそのボス戦へ直行）
function recordBossDefeat(idx) {
  if (idx < 0 || idx >= BOSS_TYPES.length || defeatedBosses.has(idx)) return;
  defeatedBosses.add(idx);
  localStorage.setItem('hayato-bosszukan', JSON.stringify([...defeatedBosses]));
}

function maxLives() { return 8 + (gear.helm ? 2 : 0); }

function startGame() {
  player = { x: W / 2 - PLAYER_SIZE / 2, y: H / 2 - PLAYER_SIZE / 2, speed: 2.3 };
  enemies = [];
  pendingEnemies = [];
  particles = [];
  pshots = [];
  fireballs = [];
  items = [];
  popups = [];
  bolts = [];
  shockwaves = [];
  strikes = [];
  fences = [];
  novas = [];
  frost = [];
  vortexes = [];
  slashes = [];
  hitstopT = 0;
  score = 0;
  hero = defaultHero();
  lives = 8;
  weaponIdx = 0;
  formIdx = 0;
  weaponAngle = 0;
  orbitAngle = 0;
  angleHist = [];
  frame = 0;
  spawnTimer = 0;
  invincibleTimer = 0;
  bannerText = '';
  bannerTimer = 0;
  shakeTimer = 0;
  flameTimer = 0;
  shootTimer = 0;
  flashTimer = 0;
  redFlashTimer = 0;
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
  continuesLeft = 3;
  sigmundFight = false;
  sigmundPowerPending = false;
  bossEvent = null;
  gold = 0;
  gear = {};
  mercenaries = [];
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

// ---------- 雑魚敵ずかん（出現条件を満たすものから重みつき抽選） ----------
// ai: chase=まっすぐ追う / zigzag=左右にゆれて追う / wisp=ふわふわ蛇行 /
//     shooter=120pxで止まって射撃 / bomber=近づいて自爆 / dasher=タメて直進突進
const ZAKO_TYPES = [
  { name: 'ゴースト', sprite: 'enemy', size: ENEMY_SIZE, points: 100, ai: 'chase',
    minStage: 1, minScore: 0, weight: 10, fxColor: PALETTE.P,
    hp: () => 1, speed: (st, sc, m) => Math.min(0.55 + sc / 15000, 1.3) * m },
  { name: 'ヘルハウンド', sprite: 'enemyFast', size: ENEMY_SIZE, points: 150, ai: 'chase',
    minStage: 1, minScore: 800, weight: 7, fxColor: PALETTE.R,
    hp: () => 1, speed: (st, sc, m) => Math.min(1.0 + sc / 12000, 1.8) * m },
  { name: 'ストーンゴーレム', sprite: 'enemyTank', size: TANK_SIZE, points: 300, ai: 'chase',
    minStage: 1, minScore: 1500, weight: 3, fxColor: PALETTE.G,
    hp: (st) => 3 + Math.floor(st / 5), speed: (st, sc, m) => 0.35 * m },
  { name: 'ダークバット', sprite: 'darkbat', size: 18, points: 120, ai: 'zigzag',
    minStage: 2, minScore: 0, weight: 6, fxColor: PALETTE.N,
    hp: () => 1, speed: (st, sc, m) => 1.1 * m },
  { name: 'ポイズンスライム', sprite: 'poisonslime', size: ENEMY_SIZE, points: 140, ai: 'chase',
    minStage: 3, minScore: 0, weight: 5, fxColor: PALETTE.G, zakoSplit: true,
    hp: () => 2, speed: (st, sc, m) => 0.6 * m },
  { name: 'スケルトンアーチャー', sprite: 'enemy', remap: { P: '#e8e8d8', M: '#b13e53' },
    size: ENEMY_SIZE, points: 200, ai: 'shooter',
    minStage: 5, minScore: 0, weight: 4, fxColor: '#e8e8d8',
    hp: () => 1, speed: (st, sc, m) => 0.5 * m },
  { name: 'ブレイズインプ', sprite: 'enemy', remap: { P: '#ef7d57', M: '#ffcd75' },
    size: 18, points: 160, ai: 'chase',
    minStage: 7, minScore: 0, weight: 4, fxColor: PALETTE.O, blaze: true,
    hp: () => 1, speed: (st, sc, m) => Math.min(0.55 + sc / 15000, 1.3) * m * 1.4 },
  { name: 'ボマー', sprite: 'enemyFast', remap: { R: '#1a1c2c', O: '#566c86', Y: '#b13e53', W: '#f4f4f4' },
    size: ENEMY_SIZE, points: 180, ai: 'bomber',
    minStage: 9, minScore: 0, weight: 3, fxColor: PALETTE.K,
    hp: () => 1, speed: (st, sc, m) => 0.9 * m },
  { name: 'アイスウィスプ', sprite: 'enemyFast', remap: { R: '#41a6f6', O: '#73eff7', Y: '#f4f4f4', W: '#f4f4f4' },
    size: 20, points: 170, ai: 'wisp',
    minStage: 11, minScore: 0, weight: 3, fxColor: PALETTE.C, iceTouch: true,
    hp: () => 1, speed: (st, sc, m) => 1.0 * m },
  { name: 'ダークナイト', sprite: 'enemyTank', remap: { G: '#5d275d', g: '#3a1a3a', Y: '#ffcd75', D: '#b13e53' },
    size: 48, points: 350, ai: 'dasher',
    minStage: 14, minScore: 0, weight: 2, fxColor: PALETTE.P,
    hp: () => 5, speed: (st, sc, m) => 0.5 * m },
];

// 1体を実際にenemiesへ生成（opts で分裂の子などの上書きが可能）
function spawnZako(t, x, y, spdMul, opts = {}) {
  const hp = opts.hp != null ? opts.hp : t.hp(stage);
  const size = opts.size != null ? opts.size : t.size;
  const speed = opts.speed != null ? opts.speed : t.speed(stage, score, spdMul);
  const dest = opts.pending ? pendingEnemies : enemies;
  dest.push({
    x, y, speed, sprite: t.sprite, remap: t.remap || null, size,
    hp, maxHp: hp, points: opts.points != null ? opts.points : t.points,
    hitTimer: 0, slowTimer: 0,
    ai: t.ai, fxColor: t.fxColor, zakoType: t,
    zakoSplit: !!t.zakoSplit && !opts.noSplit,
    blaze: !!t.blaze, iceTouch: !!t.iceTouch,
    shootTimer: t.ai === 'shooter' ? 60 + Math.floor(Math.random() * 40) : 0,
    bombT: 0, dashT: 0, dashCool: 0, dashAng: 0,
    zigPhase: Math.random() * Math.PI * 2,
  });
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
  // 出現条件（ステージ・スコア）を満たすタイプだけを候補にして重みつき抽選
  const cands = ZAKO_TYPES.filter((t) => stage >= t.minStage && score >= t.minScore);
  let total = 0;
  for (const t of cands) total += t.weight;
  let r = Math.random() * total;
  let pick = cands[cands.length - 1];
  for (const t of cands) { r -= t.weight; if (r < 0) { pick = t; break; } }
  spawnZako(pick, x, y, spdMul);
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
      heartUp: !!boss.type.summonHearts, // グリフォンの仲間はハートを2倍おとす
    });
    burst(x, y, PALETTE.p, 8, 2);
  }
  addPopup(boss.x + boss.size / 2, boss.y - 10, 'なかまをよんだ！', '#8b4f8b', 13);
  SFX.summon();
}

// 過去のボスを1体よびだすギミック（callboss用・summonMinionsとは別物）。
// 召喚体は boss:true のまま summoned:true を持ち、進行判定からは除外される小型ボス。
function callBoss(boss) {
  const idx = BOSS_TYPES.indexOf(boss.type);
  // 自分より前に登場したボス（index が小さい方）からランダムに1体えらぶ
  const pool = BOSS_TYPES.slice(0, Math.max(1, idx));
  const src = pool[Math.floor(Math.random() * pool.length)];
  // 召喚体は再帰召喚（callboss/summon/split）も近接攻撃もしない安全なコピー型を使う
  const childType = { ...src, gimmicks: [], melee: [] };
  const size = 96; // 通常ボスの約0.6倍の小型サイズ
  const hp = Math.max(6, Math.round((26 + stage * 16) * 0.3)); // 通常ボスの約3割（15秒程度で倒せる規模）
  const cx = Math.max(0, Math.min(W - size,
    boss.x + boss.size / 2 - size / 2 + (Math.random() < 0.5 ? -1 : 1) * (boss.size / 2 + 40)));
  const cy = Math.max(10, Math.min(H * 0.5, boss.y + boss.size / 2 - size / 2));
  const child = makeBoss(childType, cx, cy, size, hp, { points: 1200, speedMul: 1.2 });
  child.summoned = true; // 進行判定・大HPバーから除外する目印
  child.isChild = true;  // 激怒しても速度アップのみ（レイジバースト咆哮はしない）
  // 同フレームの多重ヒットを防ぐため直接 enemies.push せず pendingEnemies に積む
  pendingEnemies.push(child);
  burst(child.x + size / 2, child.y + size / 2, childType.aura || PALETTE.p, 24, 3);
  rainbowBurst(boss.x + boss.size / 2, boss.y + boss.size / 2, 30, 3);
  bannerText = `${boss.type.name}が ${src.name}を よびだした！！`;
  bannerTimer = 140;
  shakeTimer = 18;
  addPopup(boss.x + boss.size / 2, boss.y - 10, 'かこのボスを よびだした！', '#ffcd75', 12);
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
    rageBurstT: 0,
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
    // ジギムント第2形態変身用（type.bigのときのみ機能する）
    form2: false,
    transforming: 0,
    // ライリュウ専用の特殊攻撃タイマー（type.sprite==='rairyu' のときだけ進む）
    beamT: 0,   // らいこうレーザー
    cageT: 0,   // いかずちのかご
    novaT: 0,   // ばんらいノヴァ（第2形態のみ）
  };
}

function spawnBoss() {
  bossCount++;
  const type = currentBossType();
  let hp = Math.round((26 + stage * 16 + bossCount * 4) * (type.hpMul || 1));
  // 分裂ボスは子と合わせると合計HPが通常の1.7〜2倍になってしまうため、
  // 最初の（親の）HPを半分にして合計をほぼ通常ボス並みにそろえる
  if (type.gimmicks.includes('split')) hp = Math.round(hp * 0.5);
  // 最終ボスのドラゴンは体が通常ボスの1.8倍（画面に迫る巨体）
  const size = type.big ? Math.round(BOSS_SIZE * 1.8) : BOSS_SIZE;
  const b = makeBoss(type, W / 2 - size / 2, -size - 10, size, hp, {
    splitsLeft: type.gimmicks.includes('split') ? 1 : 0,
  });
  // ドラクエ風のセリフウィンドウ（最終ボスには勇者の返しゼリフも）
  serifuName = type.name;
  serifuText = type.serifu || '';
  serifuReply = type.big ? `${type.name}、かくごしろ！` : '';
  serifuTimer = type.big ? 260 : 200;
  if (type.big) sigmundPowerPending = true;
  if (type.big) addPopup(player.x + PLAYER_SIZE / 2, player.y - 16, 'ちからが みなぎる！ スピードUP！', '#73eff7', 12);
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
// ソフトキャップ: 演出強化で粒子が増えるため、装飾用の粒子（decorative=true）は
// 上限を超えたらスキップする。爆発・撃破などの重要演出は decorative=false で必ず残す
const PARTICLE_CAP = 520;
function pushParticle(p, decorative = false) {
  if (decorative && particles.length >= PARTICLE_CAP) return;
  particles.push(p);
}

function burst(x, y, color, count = 8, speed = 1.5, decorative = false) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const sp = speed * (0.7 + Math.random());
    pushParticle({ x, y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, life: 15 + Math.random() * 12, color }, decorative);
  }
}

function rainbowBurst(x, y, count = 30, speed = 2.5, decorative = false) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random());
    pushParticle({
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: 25 + Math.random() * 25,
      color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    }, decorative);
  }
}

function addPopup(x, y, text, color = '#ffcd75', size = 11) {
  popups.push({ x, y, text, color, size, life: 45 });
}

// 広がる衝撃波リング（攻撃のインパクト演出）
function addShockwave(x, y, color, r = 12, vr = 5, life = 18, lw = 4) {
  shockwaves.push({ x, y, r, vr, life, maxLife: life, color, lw });
}

// 白い斬撃のきらめき（武器が当たった場所に走る）。scaleでトドメの大斬線にもなる
function addSlash(x, y, ang, scale = 1) {
  slashes.push({ x, y, ang, life: 7, maxLife: 7, scale });
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
  if (e.dying) return 0; // 崩壊演出中は無敵
  if (e.transforming) return 0; // 変身演出中は完全無敵
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
    // 弱点ギミック: 光るコアの近く以外はダメージなし（判定はやや甘め）
    if (e.type.gimmicks.includes('weakpoint')) {
      const core = bossCorePos(e);
      if ((hitX - core.x) ** 2 + (hitY - core.y) ** 2 > 36 ** 2) {
        addPopup(hitX, hitY, 'カキン！', '#94b0c2', 11);
        SFX.plink();
        return 0;
      }
      dmg *= 2; // コアに当てたら2倍ダメージ
      addPopup(core.x, core.y - 12, 'よわてん！', '#ff77a8', 13);
    }
  }
  e.hp -= dmg;
  // ボスに攻撃を当てるたびにポイントが入る → ボス戦中も武器が育っていく
  const gained = Math.round(dmg * 10);
  score += gained;
  e.hitCount = (e.hitCount || 0) + 1;
  if (e.hitCount % 4 === 0) addPopup(hitX, hitY - 8, `+${gained}`, '#ffcd75', 9);
  checkWeaponEvolve();
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
    child.isChild = true;   // 分裂した子ボスは激怒時に速度アップのみ（レイジバースト咆哮はしない）
    enemies.push(child);
  }
  rainbowBurst(e.x + e.size / 2, e.y + e.size / 2, 40, 3.5);
  bannerText = `${e.type.name}が ${n}たいに ぶんれつ！！`;
  bannerTimer = 130;
  shakeTimer = 15;
  SFX.split();
}

// ---------- 武器の進化チェック（雑魚撃破でもボスへの攻撃ヒットでも呼ばれる） ----------
// 進化したら true を返す
function checkWeaponEvolve() {
  const newIdx = weaponForScore(score);
  if (newIdx <= weaponIdx) return false;
  bannerText = `ぶきしんか！ ${WEAPONS[weaponIdx].name} → ${WEAPONS[newIdx].name}`;
  bannerTimer = 150;
  weaponIdx = newIdx;
  angleHist = []; // 前の武器の角度履歴で残像斬りが暴発しないようクリア
  orbitAngle = 0;
  flashTimer = 15;
  const pc = playerCenter();
  rainbowBurst(pc.x, pc.y, 40, 3);
  SFX.fanfare();
  // スコア閾値ごとにキャラの見た目も進化！（武器idxではなくスコアで判定＝新武器挿入の影響を受けない）
  const nf = formForScore(score);
  if (nf > formIdx) {
    formIdx = nf;
    bannerText = `すがたしんか！ ${FORMS[nf].name}に なった！`;
    bannerTimer = 180;
    rainbowBurst(pc.x, pc.y, 70, 4);
    flashTimer = 22;
  }
  return true;
}

// ---------- ゆうしゃレベルのチェック（毎フレーム呼ばれる） ----------
// スコアがしきい値を超えていれば、たまっている分だけまとめてレベルアップする
function checkHeroLevel() {
  while (hero.level - 1 < HERO_LV.length && score >= HERO_LV[hero.level - 1].score) {
    const lv = HERO_LV[hero.level - 1];
    lv.apply(hero);
    hero.level++;
    heroLevelUp(lv);
  }
}

// レベルアップの派手な演出（虹バースト＋衝撃波＋ファンファーレ＋バナー）
function heroLevelUp(lv) {
  const pc = playerCenter();
  rainbowBurst(pc.x, pc.y, 55, 4);
  addShockwave(pc.x, pc.y, lv.color, 14, 6, 24, 5);
  addShockwave(pc.x, pc.y, '#f4f4f4', 8, 8, 20, 3);
  addPopup(pc.x, pc.y - 22, `ゆうしゃLv${hero.level}！`, lv.color, 14);
  bannerText = `ゆうしゃレベル${hero.level}！ ${lv.label}`;
  bannerTimer = 170;
  flashTimer = 18;
  SFX.fanfare();
}

// ---------- ジギムントのシネマティック/変身に入るときの共通中断処理 ----------
// 技や空中（ふみつけ・急降下）の最中でも、必ず画面内の地上に降ろして弾を消す。
// これを怠ると act=null で着地処理が来なくなり、透明のまま画面外で演出が再生されてしまう
// （fd642c7で修正した空中トドメバグ）。killEnemy（撃破）と変身の両方から呼ぶ。
function sigmundInterrupt(e) {
  e.act = null;
  e.giantCharge = 0;
  e.airborne = false;
  e.rageBurstT = 0;   // レイジバースト咆哮中でも即座に中断し、透明・画面外再生を防ぐ
  e.x = Math.max(-e.size * 0.1, Math.min(W - e.size * 0.9, e.x));
  e.y = Math.max(-e.size * 0.15, Math.min(H - e.size * 0.85, e.y));
  fireballs = [];  // 弾は全部消える
  fences = [];     // ライリュウの電気フェンス・ノヴァも中断（透明化中の理不尽ヒット防止）
  novas = [];
}

// ---------- 敵を倒したときの共通処理 ----------
function killEnemy(e, lightningDepth = 2) {
  // ライリュウ（deathTalk）は撃破時に専用の断末魔カットシーンに入る。
  // ジギムントのdeathEvent（撃破後に別ボスが登場する会話）とは別系統で、
  // 崩壊アニメはカットシーン内（updateBossEvent の rairyuDeath 分岐）で e.dying を進めて描画する。
  if (e.boss && e.type && e.type.deathTalk && !e.dyingDone) {
    if (!e.dying) {
      e.dying = 1;
      e.hp = 1;          // 演出が終わるまで消えない
      sigmundInterrupt(e); // 空中・技中でも画面内の地上に降ろす（fences/novasもここで一掃）
      strikes = [];      // 進行中の落雷予告も消す
      // 取り巻きは静かに消滅
      for (const m of enemies) {
        if ((!m.boss || m.summoned) && m.hp > 0) {
          m.hp = 0;
          burst(m.x + m.size / 2, m.y + m.size / 2, PALETTE.p, 6);
        }
      }
      SFX.roar();
      serifuTimer = 0;
      bannerTimer = 0;
      bossEvent = { kind: 'rairyuDeath', step: 0, t: 0, boss: e, eventFired: false };
    }
    return;
  }
  // ジギムントは倒しても即消えず、「地鳴り→崩壊→粉砕」のシネマティック演出に入る
  if (e.boss && e.type && e.type.big && !e.dyingDone) {
    if (!e.dying) {
      e.dying = 1;
      e.hp = 1;        // 演出が終わるまで消えない
      sigmundInterrupt(e);
      // 取り巻きは静かに消滅
      for (const m of enemies) {
        if ((!m.boss || m.summoned) && m.hp > 0) {
          m.hp = 0;
          burst(m.x + m.size / 2, m.y + m.size / 2, PALETTE.p, 6);
        }
      }
      SFX.roar();
    }
    return;
  }
  e.hp = 0;

  combo++;
  comboTimer = gear.necklace ? 135 : 90;
  if (combo > maxCombo) maxCombo = combo;
  const gained = Math.floor(e.points * (1 + (combo - 1) * 0.1));
  score += gained;
  addPopup(e.x + e.size / 2, e.y, `+${gained}`, e.boss ? '#ffcd75' : '#f4f4f4', e.boss ? 16 : 11);

  // 必殺技ゲージが溜まる
  const gaugeGain = (e.summoned ? 12 : e.boss ? 30 : 4) * (gear.ring ? 1.5 : 1) * hero.gaugeMul;
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
      const remaining = enemies.filter((b) => b.boss && !b.summoned && b !== e && b.hp > 0);
      if (remaining.length === 0) {
        // 本体を倒したら、召喚した過去ボスが残っていても静かに一掃する
        for (const m of enemies) {
          if (m.boss && m.summoned && m.hp > 0) {
            m.hp = 0;
            burst(m.x + m.size / 2, m.y + m.size / 2, PALETTE.p, 10);
          }
        }
        bossActive = false;
        nextBossScore = Math.max(nextBossScore + 4000 + stage * 200, score + 3000);
        const cleared = stage;
        recordBossDefeat(Math.min(cleared, LAST_STAGE) - 1);
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
    // ズバッ！と斬りとばす爽快演出:
    // 破片がプレイヤーと反対方向へ勢いよく吹き飛ぶ＋大きな斬線＋ポップリング
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    const bodyColor = e.fxColor || (e.sprite === 'enemyFast' ? PALETTE.R : e.sprite === 'enemyTank' ? PALETTE.G : PALETTE.P);
    const pcz = playerCenter();
    const away = Math.atan2(ecy - pcz.y, ecx - pcz.x);
    for (let i = 0; i < 12; i++) {
      const a = away + (Math.random() - 0.5) * 1.1;
      const sp = 1.6 + Math.random() * 3.2;
      pushParticle({
        x: ecx, y: ecy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 16 + Math.random() * 14,
        color: i % 3 === 0 ? '#f4f4f4' : bodyColor,
      });
    }
    if (!quietKills) {
      addSlash(ecx, ecy, away + Math.PI / 2 + (Math.random() - 0.5) * 0.4, 1.7); // トドメの大斬線
      addShockwave(ecx, ecy, '#f4f4f4', 5, 4, 9, 2);                             // 小さなポップリング
      hitstopT = Math.min(6, hitstopT + 1);                                       // トドメの一瞬のタメ
    }

    // ポイズンスライム: 倒すと小型スライム2体に分裂（無限連鎖はnoSplitで防止）
    if (e.zakoSplit && e.zakoType) {
      const t = e.zakoType;
      const spdMul = Math.min(1 + (stage - 1) * 0.03, 1.45);
      const childSize = t.size * 0.65;
      for (let i = 0; i < 2; i++) {
        const a = Math.PI * i + Math.random() * 0.6;
        spawnZako(t, ecx + Math.cos(a) * 8 - childSize / 2, ecy + Math.sin(a) * 8 - childSize / 2, spdMul, {
          pending: true, noSplit: true, hp: 1, size: childSize, points: Math.floor(t.points * 0.4),
        });
      }
    }
  }

  // 武器の進化チェック
  if (!checkWeaponEvolve() && !e.boss) {
    SFX.kill(combo);
  }

  // 雷属性: 近くの敵へ連鎖
  if (WEAPONS[weaponIdx].lightning && lightningDepth > 0 && !e.boss) {
    chainLightning(e.x + e.size / 2, e.y + e.size / 2, lightningDepth);
  }

  // ライフが減っていたらハートを落とす（おまもりで2倍・グリフォンの仲間も2倍）
  const dropRate = 0.1 * (gear.charm ? 2 : 1) * (e.heartUp ? 2 : 1);
  if (lives < maxLives() && Math.random() < dropRate) {
    items.push({ x: e.x + e.size / 2, y: e.y + e.size / 2, life: 420 });
  }
}

// ---------- 必殺技: 画面全体の大爆発（防御無視） ----------
function specialAttack() {
  if (bossActive) bossSpecialsUsed++;
  // おうじゃのかんむり: ひっさつを つかっても ゲージが 25 のこる
  specialGauge = gear.crown ? 25 : 0;
  flashTimer = 30;
  shakeTimer = 26;
  hitstopT = Math.min(8, hitstopT + 6); // ドン！と世界が止まってから爆発
  const pc = playerCenter();
  rainbowBurst(pc.x, pc.y, 100, 5.5);
  // 三重の衝撃波リングが画面いっぱいに広がる
  addShockwave(pc.x, pc.y, '#f4f4f4', 10, 10, 30, 7);
  addShockwave(pc.x, pc.y, '#ffcd75', 10, 8, 34, 5);
  addShockwave(pc.x, pc.y, '#ff77a8', 10, 6, 38, 4);
  // 画面のあちこちに斬撃の光と爆発
  for (let i = 0; i < 10; i++) {
    addSlash(Math.random() * W, Math.random() * H, Math.random() * Math.PI * 2);
  }
  for (let i = 0; i < 8; i++) {
    rainbowBurst(Math.random() * W, Math.random() * H, 18, 3.5);
  }
  // ボスの弾は全部消える
  fireballs = [];
  // 雑魚は全滅、ボスには5ダメージ（盾・弱点も無視）
  quietKills = true;
  for (const e of [...enemies]) {
    if (e.hp <= 0) continue;
    if (e.boss) {
      if (e.dying) continue; // 崩壊演出中は必殺技も無効
      if (e.transforming) continue; // 変身演出中は必殺技のHP直接減算もスキップ（damageBoss非経由の抜け道）
      e.hp -= 5;
      score += 50; // 必殺技のボスヒットにもポイント
      e.hitTimer = 24;
      burst(e.x + e.size / 2, e.y + e.size / 2, PALETTE.Y, 20, 3);
      if (e.hp <= 0) killEnemy(e);
    } else {
      killEnemy(e);
    }
  }
  quietKills = false;
  checkWeaponEvolve();
  enemies = enemies.filter((e) => e.hp > 0);
  addPopup(pc.x, pc.y - 24, 'ひっさつわざ！！', '#ffcd75', 18);
  SFX.special();
}

// ---------- プレイヤー被弾の共通処理 ----------
function hurtPlayer(dmg = 1) {
  // てつのよろい: 12%でガード
  if (gear.armor && Math.random() < 0.12) {
    const pc = playerCenter();
    addPopup(pc.x, pc.y - 20, 'ガード！', '#41a6f6', 13);
    invincibleTimer = 30;
    SFX.guard();
    return;
  }
  // ゆうしゃのオーラ（Lv12）: 一定確率でダメージを無効化
  if (hero.auraChance > 0 && Math.random() < hero.auraChance) {
    const pc = playerCenter();
    addPopup(pc.x, pc.y - 20, 'ガード！', '#ffcd75', 13);
    addShockwave(pc.x, pc.y, '#ffcd75', 12, 5, 16, 3);
    invincibleTimer = 30;
    SFX.guard();
    return;
  }
  // まもりのすず: つぎの1発だけ かならずふせぐ（消耗）
  if (gear.bell) {
    gear.bell = false;
    const pc = playerCenter();
    addPopup(pc.x, pc.y - 20, 'すずのバリア！', '#73eff7', 14);
    addShockwave(pc.x, pc.y, '#73eff7', 14, 7, 22, 5);
    addShockwave(pc.x, pc.y, '#f4f4f4', 8, 8, 18, 3);
    invincibleTimer = 45;
    SFX.guard();
    return;
  }
  lives -= dmg;
  invincibleTimer = Math.round((gear.cloak ? 135 : 75) * hero.invMul);
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
  shopScroll = 0;
  SFX.fanfare();
}

function tallyGold() {
  // おうごんのさいふ: もらえるゴールドが 25% ふえる
  return Math.floor((tally.total / 10) * (gear.wallet ? 1.25 : 1));
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
    musicFrame = 0;
    musicStep = 0;
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
    if (item.id === 'heal' && lives >= maxLives()) { SFX.buzz(); return; }
    if (item.id === 'contUp' && continuesLeft >= 9) { SFX.buzz(); return; }
    if (item.merc) {
      // 傭兵は上限2体まで・同種が生存中なら追加雇用できない
      if (mercenaries.length >= MERC_MAX) { SFX.buzz(); return; }
      if (mercenaries.some((m) => m.typeId === item.id)) { SFX.buzz(); return; }
      if (gold < item.price) { SFX.buzz(); return; }
      gold -= item.price;
      hireMercenary(item.id);
      SFX.buy();
      return;
    }
    if (gold < item.price) { SFX.buzz(); return; }
    gold -= item.price;
    if (item.id === 'heal') {
      lives = maxLives();
    } else if (item.id === 'contUp') {
      continuesLeft++;
    } else {
      gear[item.id] = true;
      if (item.id === 'helm') lives = Math.min(lives + 2, maxLives());
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
  if (hitstopT > 0 && state === 'playing') { hitstopT--; return; } // ヒットストップ（ズバッ！の瞬間）

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
  slashes = slashes.filter((s) => --s.life > 0);

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
    // 豪華な花火ショー（増量＋効果音つき）
    if (gframe % 10 === 0) {
      const fx = 40 + Math.random() * (W - 80);
      const fy = 25 + Math.random() * (H * 0.55);
      rainbowBurst(fx, fy, 24, 3.8);
      addShockwave(fx, fy, RAINBOW[Math.floor(Math.random() * RAINBOW.length)], 4, 3.5, 13, 2);
      if (gframe % 20 === 0) SFX.fireworkPop();
    }
    if (gframe % 80 === 0) SFX.fireworkLaunch(); // ヒュ〜っと打ち上がる音
    return;
  }
  if (state !== 'playing') return;
  frame++;

  // ジギムント撃破後の会話イベント（playing内カットシーン。敵AI・当たり判定は止め、演出だけ進める）
  if (bossEvent) { updateBossEvent(); return; }

  checkHeroLevel(); // ゆうしゃレベルアップの判定（スコア到達でボーナス加算＋演出）

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
  // ジギムント戦では勇者の力がみなぎってスピード10%アップ
  sigmundFight = bossActive && enemies.some((en) => en.boss && en.type.big);
  const pspeed = player.speed * (gear.boots ? 1.2 : 1) * (playerSlowT > 0 ? 0.5 : 1) * (sigmundFight ? 1.1 : 1) * (gear.bandana && lives <= 2 ? 1.15 : 1) * hero.speedMul;

  // セリフのやりとりが終わった瞬間、勇者の力が解放される！
  if (sigmundPowerPending && sigmundFight && serifuTimer <= 1) {
    sigmundPowerPending = false;
    bannerText = 'でんせつのゆうしゃの ちからが かいほうされた！';
    bannerTimer = 200;
    flashTimer = 20;
    const pcx = playerCenter();
    rainbowBurst(pcx.x, pcx.y, 60, 4);
    addShockwave(pcx.x, pcx.y, '#73eff7', 12, 7, 24, 5);
    SFX.fanfare();
  }
  player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x + dx * pspeed));
  player.y = Math.max(0, Math.min(H - PLAYER_SIZE, player.y + dy * pspeed));

  // にじのくつした: 移動中、足元ににじいろのキラキラを出す（純装飾・ゲームプレイへの影響なし）
  if (gear.socks && (dx !== 0 || dy !== 0) && gframe % 4 === 0) {
    pushParticle({
      x: player.x + PLAYER_SIZE / 2 + (Math.random() - 0.5) * 8,
      y: player.y + PLAYER_SIZE - 2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.3 - Math.random() * 0.3,
      life: 14 + Math.random() * 8,
      color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    }, true);
  }

  const weapon = WEAPONS[weaponIdx];
  // ジギムント戦のインフィニティセーバーは回転も1.3倍
  weaponAngle += weapon.spin * (gear.gauntlet ? 1.15 : 1) * (weapon.rainbowSaber && sigmundFight ? 1.3 : 1);
  // オービット刃: 本体の回転とは独立して（逆回転で）周回する
  if (weapon.orbitals) orbitAngle += weapon.orbitals.spin;
  // 残像斬り: 毎フレームの武器角度を短いリングバッファに記録（delay フレーム前を後で参照）
  if (weapon.echo) {
    angleHist.push(weaponAngle);
    while (angleHist.length > weapon.echo.delay + 2) angleHist.shift();
  }
  const pc = playerCenter();

  // 炎属性: 各刃の先から火の玉を発射
  if (weapon.flame) {
    flameTimer--;
    if (flameTimer <= 0) {
      const fl = weaponLen(weapon);
      for (let b = 0; b < weapon.blades; b++) {
        const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
        pshots.push({
          x: pc.x + Math.cos(a) * fl,
          y: pc.y + Math.sin(a) * fl,
          vx: Math.cos(a) * 3,
          vy: Math.sin(a) * 3,
          life: 50, kind: 'flame', dmg: 1,
          half: !!weapon.hybrid, // ダブル攻撃武器の弾はボスに半減
        });
      }
      flameTimer = 18;
      SFX.fire();
    }
  }

  // 飛び道具武器（弓・銃・大砲・爆弾・手裏剣・ミサイル・魔法の杖・レーザー等）
  if (weapon.shoot) {
    shootTimer--;
    // はどうほう: 発射直前の溜め音（エネルギー充填のうなり）
    if (weapon.kind === 'wavegun' && shootTimer === 18) SFX.waveCharge();
    if (shootTimer <= 0) {
      const sh = weapon.shoot;
      const tipA = weaponAngle;
      const tipL = weaponLen(weapon);
      const tipX = pc.x + Math.cos(tipA) * tipL;
      const tipY = pc.y + Math.sin(tipA) * tipL;
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
          life: sh.kind === 'boomerang' ? 999 : (sh.life || 90),
          kind: sh.kind, dmg: sh.dmg, pierce: !!sh.pierce, aoe: sh.aoe || 0,
          r: sh.r || 0, // 太い弾（はどうほう等）用の当たり判定半径ボーナス
          half: !!weapon.hybrid, // 純遠距離武器の弾は通常ダメージ、ダブル攻撃武器の弾のみ半減
          turn: sh.homing || 0,
          ang, rot: 0, t: 0, returning: false,
          hitSet: sh.pierce ? new Set() : null,
          color: sh.color || null,                                     // 武器ごとの弾色（未指定なら kind 既定色）
          trail: sh.trail !== undefined ? sh.trail : (SHOT_FX[sh.kind] && SHOT_FX[sh.kind].trail) || null, // 尾の色
        });
      }
      shootTimer = Math.max(1, Math.round(sh.interval / hero.fireMul));
      muzzleFlash(tipX, tipY, baseAng, sh.kind); // 発射口の火花（全遠距離武器）
      shootSFX(sh.kind, sh.interval);            // kind 別の発射音
    }
  }

  // テスラコイル: 近くの敵へ自動で電撃がとぶ
  if (weapon.tesla && frame % 38 === 0) {
    const t = nearestEnemyTo(pc.x, pc.y);
    if (t) {
      const tcx = t.x + t.size / 2;
      const tcy = t.y + t.size / 2;
      if ((tcx - pc.x) ** 2 + (tcy - pc.y) ** 2 < 130 ** 2) {
        bolts.push({ x1: pc.x, y1: pc.y, x2: tcx, y2: tcy, life: 8 });
        SFX.zap();
        const dealt = t.boss ? damageBoss(t, 2, tcx, tcy) : (t.hp -= 2, 2);
        if (t.hp <= 0) killEnemy(t);
        else if (dealt > 0) { t.hitTimer = 12; burst(tcx, tcy, PALETTE.Y, 5); }
      }
    }
  }

  // インフィニティセーバー: 刃の先から虹色の火花が舞う
  if (weapon.rainbowSaber && frame % 3 === 0) {
    const L = weaponLen(weapon);
    for (let b = 0; b < weapon.blades; b++) {
      const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
      pushParticle({
        x: pc.x + Math.cos(a) * L, y: pc.y + Math.sin(a) * L,
        vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.9,
        life: 13, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
      });
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
    if (f.kind === 'shuriken') f.rot += 0.4;
    if (f.kind === 'bomb') f.vx *= 0.97, f.vy *= 0.97; // だんだん減速して…
    // ホーミング: いちばん近い敵へ曲がっていく
    if (f.turn > 0) {
      const tgt = nearestEnemyTo(f.x, f.y);
      if (tgt) {
        const ta = Math.atan2(tgt.y + tgt.size / 2 - f.y, tgt.x + tgt.size / 2 - f.x);
        const cur = Math.atan2(f.vy, f.vx);
        let diff = ta - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const na = cur + Math.max(-f.turn, Math.min(f.turn, diff));
        const sp = Math.hypot(f.vx, f.vy);
        f.vx = Math.cos(na) * sp;
        f.vy = Math.sin(na) * sp;
      }
    }
    // 尾を引く演出（trail 色を持つ弾: missile/laser/orb/cannonball 等）。装飾なのでキャップ対象
    if (f.trail && Math.random() < 0.7) {
      const tc = f.kind === 'missile'
        ? (Math.random() < 0.5 ? PALETTE.O : PALETTE.S)  // ミサイルは炎＋煙の従来色
        : (Math.random() < 0.35 ? '#f4f4f4' : f.trail);
      pushParticle({ x: f.x - f.vx * 2, y: f.y - f.vy * 2, vx: 0, vy: 0, life: 10, color: tc }, true);
    }
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    // 爆弾は寿命が切れたところでドカン！
    if (f.kind === 'bomb' && f.life <= 0) {
      explodeAt(f.x, f.y, f.aoe, f.dmg, f.half);
      return false;
    }
    return f.life > 0 && f.x > -30 && f.x < W + 30 && f.y > -30 && f.y < H + 30;
  });

  // ボス戦中は必殺技ゲージが自動でたまっていく（使えるのは1ボス戦にBOSS_SPECIAL_LIMIT回まで）
  if (bossActive) specialGauge = Math.min(100, specialGauge + 0.12 * hero.gaugeMul);

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
  updateMercenaries(pc);
  updateWeaponHits(pc, weapon);
  if (weapon.parry) updateWeaponParry(pc, weapon);
  updatePShotHits();
  updateItems(pc);
  updatePlayerHits(pc);
  updateThunderStrikes(pc);
  updateFences(pc);
  updateNovas(pc);
  updateFrost(pc);
  updateVortexes(pc);
  updateStageFx();

  // コンボタイマー
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) combo = 0;
  }

  if (bannerTimer > 0) bannerTimer--;
  if (shakeTimer > 0) shakeTimer--;
  if (flashTimer > 0) flashTimer--;
  if (redFlashTimer > 0) redFlashTimer--;
  if (serifuTimer > 0) serifuTimer--;
}

// ---------- 敵・ボスの行動 ----------
function updateEnemies(pc) {
  if (pendingEnemies.length) {
    enemies.push(...pendingEnemies);
    pendingEnemies = [];
  }
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
    const dist = Math.hypot(pc.x - ecx, pc.y - ecy);

    if (e.ai === 'zigzag') {
      e.zigPhase += 0.14;
      const a = angle + Math.sin(e.zigPhase) * 0.9;
      e.x += Math.cos(a) * spd;
      e.y += Math.sin(a) * spd;
    } else if (e.ai === 'wisp') {
      e.zigPhase += 0.06;
      const a = angle + Math.sin(e.zigPhase) * 1.6;
      e.x += Math.cos(a) * spd * 0.8;
      e.y += Math.sin(a) * spd * 0.8;
    } else if (e.ai === 'shooter') {
      if (dist > 130) {
        e.x += Math.cos(angle) * spd;
        e.y += Math.sin(angle) * spd;
      }
      if (e.shootTimer > 0) e.shootTimer--;
      if (e.shootTimer <= 0 && dist <= 260) {
        e.shootTimer = 110;
        SFX.shoot();
        fireballs.push({
          x: ecx, y: ecy,
          vx: Math.cos(angle) * 2.6, vy: Math.sin(angle) * 2.6,
          life: 120, color: e.fxColor, kind: 'arrow', ang: angle, rot: 0,
        });
      }
    } else if (e.ai === 'bomber') {
      if (e.bombT > 0) {
        e.bombT++;
        if (e.bombT > 40) {
          if (dist < 40) hurtPlayer();
          burst(ecx, ecy, PALETTE.K, 14, 3.4);
          addShockwave(ecx, ecy, PALETTE.O, 10, 6, 14, 3);
          SFX.boom();
          e.hp = 0;
        }
      } else if (dist < 46) {
        e.bombT = 1; // 導火線スタート
      } else {
        e.x += Math.cos(angle) * spd;
        e.y += Math.sin(angle) * spd;
      }
    } else if (e.ai === 'dasher') {
      if (e.dashT > 0) {
        e.x += Math.cos(e.dashAng) * spd * 4.2;
        e.y += Math.sin(e.dashAng) * spd * 4.2;
        e.dashT--;
        if (e.dashT <= 0) e.dashCool = 70;
      } else if (e.dashCool > 0) {
        e.dashCool--;
        e.x += Math.cos(angle) * spd * 0.4;
        e.y += Math.sin(angle) * spd * 0.4;
      } else if (dist < 220) {
        e.dashAng = angle;
        e.dashT = 16;
      } else {
        e.x += Math.cos(angle) * spd;
        e.y += Math.sin(angle) * spd;
      }
    } else {
      e.x += Math.cos(angle) * spd;
      e.y += Math.sin(angle) * spd;
    }
  }
  enemies = enemies.filter((e) => e.hp > 0);
}

function updateBoss(e, pc, ecx, ecy) {
  const type = e.type;
  const gm = type.gimmicks;

  // ジギムントの最期: 地鳴り→崩壊→粉々に砕け散る
  if (e.dying) {
    updateSigmundDeath(e, ecx, ecy);
    return;
  }

  // ジギムント第2形態への変身（HPが半分を切ると1回だけ・激怒25%判定と同型のワンショット）
  if (type.big && !e.form2 && e.transforming <= 0 && e.hp <= e.maxHp * 0.5) {
    e.transforming = 150; // 約2.5秒（60fps想定）。この間は完全無敵・行動停止
    sigmundInterrupt(e);  // 空中・技の最中でも画面内の地上に降ろす（撃破シネマティックと同じ中断処理）
    strikes = []; fences = []; novas = []; frost = []; vortexes = []; // 変身の無敵中に進行中の設置攻撃で理不尽にやられないよう一掃
    flashTimer = 20;
    shakeTimer = 24;
    bannerText = `${type.name}が しんの すがたに めざめる…！！`;
    bannerTimer = 150;
    SFX.rage();
  }
  // 変身演出中: 完全に行動停止し、旧/新パレットで明滅（描画側）＋エネルギーを渦巻かせる
  if (e.transforming > 0) {
    e.transforming--;
    shakeTimer = Math.max(shakeTimer, 4);
    for (let i = 0; i < 3; i++) {
      const ca = Math.random() * Math.PI * 2;
      const cd = 60 + Math.random() * 50;
      pushParticle({
        x: ecx + Math.cos(ca) * cd, y: ecy + Math.sin(ca) * cd,
        vx: -Math.cos(ca) * 4, vy: -Math.sin(ca) * 4,
        life: 14, color: Math.random() < 0.5 ? (type.form2Aura || SIGMUND_FORM2_AURA) : '#ffcd75',
      });
    }
    if (e.transforming % 24 === 0) beep(70 + (150 - e.transforming), 0.4, 'sawtooth', 0.06, 40);
    if (e.transforming <= 0) {
      // 変身完了: 第2形態へ。衝撃波演出（必殺技の三重リングを流用）＋バナー＋セリフ
      e.form2 = true;
      e.remap = type.form2Remap || SIGMUND_FORM2_REMAP;
      addShockwave(ecx, ecy, '#f4f4f4', 10, 10, 30, 7);
      addShockwave(ecx, ecy, type.form2Aura || SIGMUND_FORM2_AURA, 10, 8, 34, 5);
      addShockwave(ecx, ecy, '#ffcd75', 10, 6, 38, 4);
      rainbowBurst(ecx, ecy, 60, 4);
      burst(ecx, ecy, type.form2Aura || SIGMUND_FORM2_AURA, 30, 4);
      flashTimer = 30;
      shakeTimer = 30;
      bannerText = `${type.name} だいにけいたい！！`;
      bannerTimer = 160;
      // spawnBossと同じグローバルなセリフウィンドウ機構
      serifuName = type.name;
      serifuText = type.form2Serifu || 'これが わがしんのすがた…もえつきろ！';
      serifuReply = '';
      serifuTimer = 220;
      SFX.rage();
      SFX.roar();
    }
    return; // 変身中は移動・射撃・近接をいっさいしない
  }

  // 神様のオーラ（体の周りから立ちのぼる光。激怒中は赤く、第2形態は真紅に）
  if (frame % 3 === 0) {
    pushParticle({
      x: e.x + Math.random() * e.size,
      y: e.y + e.size - Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.6 - Math.random() * 0.6,
      life: 20 + Math.random() * 15,
      color: e.form2 ? (type.form2Aura || SIGMUND_FORM2_AURA) : (e.raged ? '#b13e53' : (type.aura || PALETTE.p)),
    });
  }

  // 激怒ギミック: HPが1/4を切ると怒って強くなる！（全20ボス共通）
  if (!e.raged && e.hp <= e.maxHp * 0.25) {
    e.raged = true;
    e.speed *= 1.7;
    flashTimer = 15;
    shakeTimer = 20;
    if (!e.isChild) {
      // レイジバースト: 45フレームの咆哮ポーズ（行動停止）→リング弾＋衝撃波。分裂した子ボスは速度アップのみ
      e.rageBurstT = 45;
      e.act = null;        // 技・空中の最中でも咆哮ポーズを画面内で見せる（空中トドメバグと同じ配慮）
      e.airborne = false;
      e.giantCharge = 0;
      bannerText = `${type.name}が げきどした！！`;
      bannerTimer = 130;
    }
    SFX.rage();
  }

  // レイジバースト演出中: 行動停止して咆哮 → 0でリング弾(12発)＋衝撃波を放つ（無敵化はしない）
  if (e.rageBurstT > 0) {
    e.rageBurstT--;
    shakeTimer = Math.max(shakeTimer, 3);
    if (frame % 4 === 0) {
      const ba = Math.random() * Math.PI * 2;
      pushParticle({
        x: ecx + Math.cos(ba) * e.size * 0.4, y: ecy + Math.sin(ba) * e.size * 0.4,
        vx: -Math.cos(ba) * 3, vy: -Math.sin(ba) * 3, life: 14, color: '#b13e53',
      });
    }
    if (e.rageBurstT <= 0) {
      addShockwave(ecx, ecy, '#b13e53', 8, 8, 28, 5);
      addShockwave(ecx, ecy, '#ffcd75', 8, 6, 22, 3);
      const cols = type.ballColors || ['#b13e53', '#ef7d57', '#ffcd75'];
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        fireballs.push({ x: ecx, y: ecy, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, life: 150, colors: cols, kind: 'ball', ang: a, rot: 0 });
      }
      flashTimer = Math.max(flashTimer, 12);
      SFX.roar();
    }
    return; // 咆哮中は移動・射撃・近接をしない（ただし無敵ではない＝この間もダメージは通る）
  }

  // 盾ギミックのタイマー
  if (gm.includes('shield')) {
    e.shieldT++;
    if (e.shieldT % 420 === 260) { addPopup(ecx, e.y - 10, 'シールド！', '#41a6f6', 13); SFX.guard(); }
  }
  // 弱点コアはゆっくり回る（ライリュウのみ1.2倍速で回転し、コア狙いをよりシビアにする）
  if (gm.includes('weakpoint')) e.coreAngle += (type.sprite === 'rairyu') ? 0.024 : 0.02;
  // 仲間よびギミック
  if (gm.includes('summon')) {
    e.summonT--;
    if (e.summonT <= 0) {
      summonMinions(e);
      e.summonT = e.raged ? 260 : 400;
    }
  }
  // 過去ボス召喚ギミック: HPが60%以下になったら1回だけ発動（多重発動は calledBoss で防止）
  if (gm.includes('callboss') && !e.calledBoss && e.hp <= e.maxHp * 0.6) {
    e.calledBoss = true;
    callBoss(e);
  }
  // 雷嵐ギミック(ライリュウ専用): 周期的に全画面へ巨大な赤い落雷を予告 → 45フレーム後に落とす
  if (gm.includes('storm')) {
    e.stormT = (e.stormT == null ? 140 : e.stormT) - 1;
    if (e.stormT <= 0) {
      const n = e.form2 ? 11 : 8;             // 画面いっぱいに雷が乱れ飛ぶ（大幅増）
      const pts = [];
      for (let i = 0; i < n; i++) {
        let sx, sy, tries = 0;
        do {
          sx = 24 + Math.random() * (W - 48);
          sy = 50 + Math.random() * (H - 80);
          tries++;
        } while (tries < 20 && pts.some((p) => (p.x - sx) ** 2 + (p.y - sy) ** 2 < 52 ** 2));
        pts.push({ x: sx, y: sy });
      }
      const pcs = playerCenter();
      pts[0].x = pcs.x; pts[0].y = pcs.y;     // 1本だけ現在位置狙い(警告があるので歩けばかわせる)
      // 第2形態はさらに追い討ちの一撃を現在位置へ
      if (e.form2 && pts[1]) { pts[1].x = pcs.x + (Math.random() - 0.5) * 40; pts[1].y = pcs.y + (Math.random() - 0.5) * 40; }
      for (const p of pts) strikes.push({ x: p.x, y: p.y, t: 45, storm: true });
      addPopup(ecx, e.y - 24, 'らいめいのあらし！！', '#ff2e4d', 18);
      redFlashTimer = Math.max(redFlashTimer, 6); // 予告の瞬間にも空が赤くうなる
      SFX.warn();
      e.stormT = e.form2 ? 105 : 150;
    }
  }
  // ライリュウ専用の特殊攻撃3種（らいこうレーザー / いかずちのかご / ばんらいノヴァ）
  if (type.sprite === 'rairyu') updateRairyuSpecials(e, pc, ecx, ecy);
  // セイリュウ「ひょうけつのあらし」: 氷柱＋凍結フィールド（storm/雷とは別系統の氷ギミック）
  if (gm.includes('blizzard')) updateSeiryuBlizzard(e, pc, ecx, ecy);
  // ティアマト「こんとんのうず」: 引き寄せ渦→炸裂（storm/雷とは別系統の混沌ギミック）
  if (gm.includes('vortex')) updateTiamatVortex(e, pc, ecx, ecy);
  // テレポートギミック: けむりとともに消えて別の場所に現れる（ロキ・デスサイザー）
  if (gm.includes('teleport')) {
    e.teleT = (e.teleT == null ? 240 : e.teleT) - 1;
    if (e.teleT <= 0 && !e.act) {
      burst(ecx, ecy, e.type.aura, 22, 3);
      burst(ecx, ecy, '#f4f4f4', 12, 2);
      e.x = 30 + Math.random() * (W - 60 - e.size);
      e.y = 10 + Math.random() * (H * 0.45);
      addPopup(e.x + e.size / 2, e.y - 10, 'テレポート！', '#8b4f8b', 13);
      burst(e.x + e.size / 2, e.y + e.size / 2, e.type.aura, 22, 3);
      e.teleT = 200 + Math.random() * 120;
      beep(900, 0.15, 'sine', 0.05, 200);
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
      pushParticle({
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

  // ジギムントの炎ブレスは激怒前からのレギュラー攻撃（定期的にゴオオッと吐く）
  if (type.big && !e.act && e.y > 0) {
    // 第2形態はブレス間隔を1.25倍短縮（既存の激怒係数と乗算）。予告フレームは削らない
    e.breathT = (e.breathT == null ? 180 : e.breathT) - (e.raged ? 1.6 : 1) * (e.form2 ? 1.25 : 1);
    if (e.breathT <= 0) {
      e.act = { kind: 'breath', t: 0, tx: 0, ty: 0, vx: 0, vy: 0, sweep: 0 };
      e.breathT = 250 + Math.random() * 90;
    }
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
    // 第2形態は近接クールダウンを0.85倍短縮（既存の激怒係数と乗算）
    e.meleeTimer = (280 + Math.random() * 140) * (e.raged ? 0.6 : 1) * (e.form2 ? 0.85 : 1);
  }

  // 通常移動（プレイヤーへゆっくり近づく）
  const angle = Math.atan2(pc.y - ecy, pc.x - ecx);
  const spd = e.speed * (e.slowTimer > 0 ? 0.45 : 1) * (e.speedBurst > 0 ? 2.4 : 1);
  e.x += Math.cos(angle) * spd;
  e.y += Math.sin(angle) * spd;
  if (e.speedBurst > 0 && frame % 2 === 0) {
    pushParticle({ x: ecx, y: ecy, vx: -Math.cos(angle) * 1.5, vy: -Math.sin(angle) * 1.5, life: 12, color: '#73eff7' });
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
      pushParticle({
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
    pushParticle({
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
      e.fireTimer = type.sprite === 'rairyu' ? 42 : (type.pattern === 'spiral' ? 55 : Math.max(70, 150 - stage * 4));
      return;
    }
    const shotSpeed = ({ ball: 1.15, bolt: 1.7, sword: 1.35, spear: 1.5, wind: 1.6, trident: 1.4, ice: 1.3, hammer: 1.2, light: 1.5, scythe: 1.3, fang: 1.8, snake: 1.25, web: 1.4, fire: 1.6 })[type.shot] || 1.15;
    const mods = type.mods || {};
    const shoot = (ang, sx = mouthX, sy = mouthY, spMul = 1) => {
      fireballs.push({
        x: sx, y: sy,
        vx: Math.cos(ang) * shotSpeed * spMul,
        vy: Math.sin(ang) * shotSpeed * spMul,
        life: mods.burst ? 130 + Math.random() * 70 : 380, // 破裂弾は画面の中でパンとはじける

        colors: type.ballColors || null,
        kind: type.shot,
        ang, rot: 0,
        wave: mods.wave || false,
        dart: mods.dart || false, dartT: 0,
        bounce: mods.bounce ? 2 : 0,
        burst: !!(mods.burst && Math.random() < 0.5), // 破裂するのは半分だけ（弾幕が多すぎ防止）
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
      if (type.sprite === 'rairyu') {
        // ライリュウ強化: 腕を増やし、さらに逆回転の腕を重ねて弾道を読ませない（避けにくさアップ）
        const arms = e.form2 ? 5 : 4;
        for (let i = 0; i < arms; i++) shoot(e.spiralAngle + (Math.PI * 2 * i) / arms, mouthX, mouthY, 1.15);
        const arms2 = e.form2 ? 3 : 2;   // 逆回転かつ少し速い第2腕
        for (let i = 0; i < arms2; i++) shoot(-e.spiralAngle * 1.25 + (Math.PI * 2 * i) / arms2, mouthX, mouthY, 1.32);
        e.spiralAngle += 0.62;
      } else {
        for (let i = 0; i < 3; i++) shoot(e.spiralAngle + (Math.PI * 2 * i) / 3);
        e.spiralAngle += 0.5;
      }
    } else if (type.pattern === 'rain') {
      // 空から降りそそぐ（メテオ・羽・炎の雨）
      const n = Math.min(5 + lv, 10);
      for (let i = 0; i < n; i++) {
        shoot(Math.PI / 2 + (Math.random() - 0.5) * 0.25, Math.random() * W, -10, 0.9 + Math.random() * 0.5);
      }
    } else if (type.pattern === 'cross') {
      // 回転する十字撃ち
      for (let i = 0; i < 4; i++) {
        shoot(e.spiralAngle + (Math.PI / 2) * i);
        shoot(e.spiralAngle + (Math.PI / 2) * i + 0.14);
      }
      e.spiralAngle += 0.35;
    } else if (type.pattern === 'wall') {
      // 弾のかべ！すきまをくぐりぬけろ！
      const gapX = 60 + Math.random() * (W - 120);
      for (let x = 12; x < W; x += 30) {
        if (Math.abs(x - gapX) < 48) continue;
        shoot(Math.PI / 2, x, -10, 0.75);
      }
    }
    e.fireTimer = type.sprite === 'rairyu' ? 38 : ((type.pattern === 'spiral' || type.pattern === 'cross') ? 55 : Math.max(70, 150 - stage * 4));
    if (type.pattern === 'wall') e.fireTimer += 60; // かべは強いので間隔ながめ
    shakeTimer = 8;
    SFX.bossFire();
  }
}

// ---- ジギムント撃破のシネマティック演出 ----
// フェーズ1(0〜140f): 地鳴りがして地面がゆれる
// フェーズ2(140〜320f): 体にひびが走り、かけらがくずれ落ちていく
// フェーズ3(320f): 大爆発とともに粉々に砕け散る → 本来の撃破処理へ
// ジギムント撃破シネマティックのフェーズ長（描画側の透け・亀裂の開始判定にも使う）
const SIGMUND_RUMBLE = 220;   // 地鳴り 約3.7秒
const SIGMUND_CRUMBLE = 320;  // 崩壊 約5.3秒

function updateSigmundDeath(e, ecx, ecy) {
  e.dying++;
  const RUMBLE = SIGMUND_RUMBLE;
  const CRUMBLE = SIGMUND_CRUMBLE;
  const bodyColors = ['#1a1c2c', '#5d275d', '#8b4f8b', '#b13e53', '#ffcd75'];
  if (e.dying < RUMBLE) {
    // 地鳴り: だんだん揺れと音が大きくなっていく
    const prog = e.dying / RUMBLE;
    shakeTimer = Math.max(shakeTimer, 4 + Math.floor(prog * 6));
    if (e.dying % 20 === 0) {
      // ゴゴゴ…という重低音（進行とともに音量が上がる）
      beep(38, 0.62, 'sine', 0.07 + prog * 0.07, 26);
      noise(0.55, 0.05 + prog * 0.06, 180 + prog * 140, 'lowpass');
    }
    if (e.dying % 50 === 0) {
      // 地の底から響く「ドン…」という衝撃
      beep(60, 0.35, 'triangle', 0.07, 30);
    }
    if (e.dying % 3 === 0) {
      // 地面から土けむりが立ちのぼる（進行とともに増える）
      pushParticle({
        x: Math.random() * W, y: H + 4,
        vx: (Math.random() - 0.5) * 0.5, vy: -0.8 - Math.random(),
        life: 30, color: '#94b0c2',
      });
      if (prog > 0.5) {
        pushParticle({
          x: Math.random() * W, y: H + 4,
          vx: (Math.random() - 0.5) * 0.7, vy: -1 - Math.random() * 1.4,
          life: 34, color: '#566c86',
        });
      }
    }
  } else if (e.dying < RUMBLE + CRUMBLE) {
    // 崩壊: かけらがボロボロとくずれ落ちる（終盤ほど激しく）
    const cprog = (e.dying - RUMBLE) / CRUMBLE;
    shakeTimer = Math.max(shakeTimer, 4);
    const n = 2 + Math.floor(cprog * 3);
    for (let i = 0; i < n; i++) {
      pushParticle({
        x: e.x + Math.random() * e.size,
        y: e.y + Math.random() * e.size,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 1 + Math.random() * 1.8,
        life: 28 + Math.random() * 16,
        color: bodyColors[Math.floor(Math.random() * bodyColors.length)],
      });
    }
    if (e.dying % 26 === 0) {
      // ピシッ！と亀裂が走る音
      noise(0.09, 0.12, 2600, 'bandpass', 0, 600);
      beep(110, 0.18, 'sawtooth', 0.05, 50);
      addSlash(e.x + Math.random() * e.size, e.y + Math.random() * e.size, Math.random() * Math.PI * 2, 1.5);
    }
    if (e.dying % 40 === 20) {
      // ガラガラ…と崩れ落ちる音
      noise(0.32, 0.09, 750, 'lowpass', 0, 280);
    }
    if (e.dying % 80 === 0) {
      // 断末魔のような低いうめき
      beep(75, 0.6, 'sawtooth', 0.075, 26);
      noise(0.55, 0.06, 300, 'lowpass');
    }
  } else {
    // ジギムントは砕ける直前に雷龍登場の会話イベントへ移行する（1回だけ）
    if (e.type.deathEvent && !e.eventFired) {
      e.eventFired = true;
      serifuTimer = 0;
      bannerTimer = 0;
      bossEvent = { step: 0, t: 0, boss: e };
      return;
    }
    // 粉々に砕け散る！！
    for (let i = 0; i < 240; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 5.5;
      pushParticle({
        x: ecx + (Math.random() - 0.5) * e.size * 0.8,
        y: ecy + (Math.random() - 0.5) * e.size * 0.8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 30 + Math.random() * 45,
        color: bodyColors[Math.floor(Math.random() * bodyColors.length)],
      });
    }
    // 金色の残り火がゆっくり舞う（余韻）
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.3 + Math.random() * 1.2;
      pushParticle({
        x: ecx + (Math.random() - 0.5) * e.size * 0.6,
        y: ecy + (Math.random() - 0.5) * e.size * 0.6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.4,
        life: 70 + Math.random() * 60,
        color: '#ffcd75',
      });
    }
    addShockwave(ecx, ecy, '#f4f4f4', 24, 12, 34, 9);
    addShockwave(ecx, ecy, '#b13e53', 14, 9, 40, 7);
    addShockwave(ecx, ecy, '#ffcd75', 10, 7, 46, 5);
    flashTimer = 36;
    shakeTimer = 40;
    // 三段階の破裂音: ドゴォッ！→ ズウン…→ 崩れる余韻
    noise(0.5, 0.17, 1400, 'lowpass', 0, 150);
    beep(30, 1.2, 'sine', 0.13, 18);
    noise(0.45, 0.11, 900, 'lowpass', 160, 120);
    noise(0.4, 0.08, 650, 'lowpass', 360, 100);
    beep(52, 0.45, 'triangle', 0.07, 30, 500);
    SFX.giantShot();
    SFX.bossDie();
    e.dyingDone = true;
    killEnemy(e); // 本来の撃破処理（スコア加算・クリア進行）へ
  }
}

// ---- ジギムント撃破後の会話イベント（雷龍登場）。playing内カットシーンとして自動進行する ----
// セリフは原文どおり漢字表記。各ステップの表示テキストはdrawBossEventWindow()側が bossEvent.step を見て描く
const BOSS_EVENT_STEPS = [50, 180, 130, 180, 110, 200, 40]; // 各ステップの継続フレーム数
// 各ステップのセリフ（原文どおり漢字表記・変更禁止）。null=ウィンドウ非表示 / narration=ナレーション
const BOSS_EVENT_LINES = [
  null,
  { name: '雷龍', color: '#ffcd75', text: 'ジギムントよ。人間ごときに遅れをとるとは・・・' },
  { name: 'ジギムント', color: '#94b0c2', text: '申し訳ありません' },
  { name: '雷龍', color: '#ffcd75', text: 'もうよい。我ら【八大神魔】が相手となろう。貴様は死ね・・・' },
  { narration: true, text: '（巨大な赤い雷がジギムントに落とされ、ジギムントは灰と化す）' },
  { name: '雷龍', color: '#ffcd75', text: '人間よ。かかってくるがいい。我ら【八大神魔】の力を思い知らせてくれる・・・' },
  null,
];
// ---- ライリュウ撃破の断末魔カットシーン（ジギムントのdeathEventとは完全に別系統） ----
// セリフは原文どおり漢字表記・変更禁止。名前は「雷龍」
const RAIRYU_DEATH_STEPS = [50, 300, 40]; // 導入50 → 断末魔セリフ＋崩壊300 → 消滅40
const RAIRYU_DEATH_LINE = { name: '雷龍', color: '#73eff7', text: 'この私までもが・・・。我ら【八大神魔】をすべて倒すとは・・・お前はいったい・・・' };

function updateRairyuDeath(ev) {
  const e = ev.boss;
  ev.t++;
  const dur = RAIRYU_DEATH_STEPS[ev.step] || 60;

  // bossEvent中は通常update()末尾のタイマー減衰が走らないため、ここで代わりに減衰させる
  if (shakeTimer > 0) shakeTimer--;
  if (flashTimer > 0) flashTimer--;
  if (redFlashTimer > 0) redFlashTimer--;

  const ecx = e.x + e.size / 2;
  const ecy = e.y + e.size / 2;
  const palette = e.type.deathColors || ['#1a1c2c', '#3b5dc9', '#73eff7', '#b567b5', '#f4f4f4'];

  if (ev.step === 0) {
    // 導入: 暗転して金のスポットライトが差し、雷龍が身を震わせる（青白い火花が漏れる）
    // 崩壊が始まる予兆として、この間ずっと地鳴りの微振動を切らさない
    e.dying++;
    if (ev.t === 1) SFX.roar();
    shakeTimer = Math.max(shakeTimer, 4);
    if (ev.t % 8 === 0) burst(ecx + (Math.random() - 0.5) * e.size * 0.6, ecy + (Math.random() - 0.5) * e.size * 0.6, Math.random() < 0.5 ? palette[2] : palette[4], 3, 1.4);
    if (ev.t % 24 === 0) beep(46, 0.5, 'sawtooth', 0.06, 30);
  } else if (ev.step === 1) {
    // 断末魔のセリフ＋崩壊。e.dyingを進めて「崩れ落ちる体」の描画を流用（Approach B）
    e.dying++;
    if (ev.t === 1) { beep(70, 0.6, 'sawtooth', 0.06, 34); noise(0.2, 0.04, 600, 'highpass'); }
    const n = 2 + Math.floor(ev.t / 90);
    for (let i = 0; i < n; i++) {
      pushParticle({
        x: e.x + Math.random() * e.size, y: e.y + Math.random() * e.size,
        vx: (Math.random() - 0.5) * 0.9, vy: 1 + Math.random() * 1.8,
        life: 26 + Math.random() * 18, color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
    // deathSpark: 崩壊中は体に稲妻が走る
    if (e.type.deathSpark && ev.t % 18 === 0) {
      bolts.push({ x1: ecx + (Math.random() - 0.5) * e.size * 0.7, y1: e.y, x2: ecx + (Math.random() - 0.5) * e.size * 0.5, y2: e.y + e.size, life: 12 });
      noise(0.09, 0.1, 2600, 'bandpass', 0, 600);
      addSlash(ecx + (Math.random() - 0.5) * e.size, ecy + (Math.random() - 0.5) * e.size, Math.random() * Math.PI * 2, 1.4);
    }
    if (ev.t % 40 === 20) noise(0.3, 0.08, 750, 'lowpass', 0, 280);
    if (ev.t % 80 === 0) beep(72, 0.55, 'sawtooth', 0.07, 26);
    shakeTimer = Math.max(shakeTimer, 3 + Math.floor(ev.t / 60));
  } else if (ev.step === 2) {
    // 消滅: 一気に砕け散る（1回だけ大爆発）→ killEnemyで本来の撃破処理（finalClear/けっさん予約）へ
    if (!ev.eventFired) {
      ev.eventFired = true;
      for (let i = 0; i < 220; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 5.5;
        pushParticle({ x: ecx + (Math.random() - 0.5) * e.size * 0.8, y: ecy + (Math.random() - 0.5) * e.size * 0.8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 45, color: palette[Math.floor(Math.random() * palette.length)] });
      }
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2;
        bolts.push({ x1: ecx, y1: ecy, x2: ecx + Math.cos(a) * 200, y2: ecy + Math.sin(a) * 200, life: 16 });
      }
      addShockwave(ecx, ecy, '#f4f4f4', 24, 12, 34, 9);
      addShockwave(ecx, ecy, palette[1], 14, 9, 40, 7);
      addShockwave(ecx, ecy, palette[2], 10, 7, 46, 5);
      flashTimer = 40; shakeTimer = 42;
      noise(0.5, 0.17, 1400, 'lowpass', 0, 150);
      beep(30, 1.2, 'sine', 0.13, 18);
      SFX.giantShot();
      SFX.bossDie();
      e.dyingDone = true;      // これでkillEnemyのdeathTalk/big分岐を通り抜け、通常の撃破処理へ
      killEnemy(e);
      enemies = enemies.filter((x) => x !== e); // 砕け散って画面から消える
      bannerTimer = 0;         // クリアバナーはイベント中に出さない
    }
  }

  if (ev.t >= dur) {
    ev.step++;
    ev.t = 0;
    if (ev.step >= RAIRYU_DEATH_STEPS.length) bossEvent = null; // 以降 pendingTally が減り、けっさんへ
  }
}

function updateBossEvent() {
  const ev = bossEvent;
  if (ev.kind === 'rairyuDeath') { updateRairyuDeath(ev); return; }
  const e = ev.boss;
  ev.t++;
  const dur = BOSS_EVENT_STEPS[ev.step] || 60;

  // 通常update()末尾のタイマー減衰はbossEvent中スキップされるため、ここで代わりに減衰させる
  // （やらないと落雷演出のshake/flashが以降のセリフ表示中もずっと残ってしまう）
  if (shakeTimer > 0) shakeTimer--;
  if (flashTimer > 0) flashTimer--;
  if (redFlashTimer > 0) redFlashTimer--;

  // 暗雲がたれこめ、雷龍の金色の目が空にともる演出（全ステップ共通で継続）
  if (ev.t % 4 === 0 && ev.step >= 1 && ev.step <= 5) {
    // 空の暗雲がゆっくり流れる
    pushParticle({ x: Math.random() * (W + 40) - 20, y: Math.random() * 70, vx: -0.4 - Math.random() * 0.4, vy: 0.05, life: 60, color: Math.random() < 0.5 ? '#1a1c2c' : '#333c57' });
  }

  if (ev.step === 0) {
    // 静寂の間: 空が一気に暗くなり、遠くで雷鳴が轟く
    if (ev.t === 1) { shakeTimer = Math.max(shakeTimer, 6); }
    if (ev.t === 18) { noise(0.7, 0.09, 200, 'lowpass'); beep(40, 0.9, 'sine', 0.08, 24); } // 遠雷ゴロゴロ
  } else if (ev.step === 1) {
    // 雷龍「ジギムントよ。人間ごときに遅れをとるとは・・・」
    if (ev.t === 1) { beep(58, 0.5, 'sawtooth', 0.05, 40); noise(0.2, 0.04, 600, 'highpass'); } // 低く重い声色
  } else if (ev.step === 2) {
    // ジギムント「申し訳ありません」
    if (ev.t === 1) beep(150, 0.18, 'square', 0.035, 90); // 弱々しい声
  } else if (ev.step === 3) {
    // 雷龍「もうよい。我ら【八大神魔】が相手となろう。貴様は死ね・・・」
    if (ev.t === 1) { beep(55, 0.55, 'sawtooth', 0.055, 36); noise(0.25, 0.05, 500, 'highpass'); }
    if (ev.t % 30 === 0) { flashTimer = Math.max(flashTimer, 6); noise(0.25, 0.045, 800, 'highpass'); } // 空が不穏に光りだす
  } else if (ev.step === 4) {
    // （巨大な赤い雷がジギムントに落とされ、ジギムントは灰と化す）
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    if (ev.t === 8) {
      // ドカーン！赤い巨大落雷がジギムントを直撃
      for (let i = 0; i < 5; i++) {
        bolts.push({ x1: ecx + (Math.random() - 0.5) * 44, y1: -12, x2: ecx + (Math.random() - 0.5) * 12, y2: ecy, life: 16, storm: true });
      }
      flashTimer = 40; shakeTimer = 42; redFlashTimer = Math.max(redFlashTimer, 28);
      noise(0.5, 0.18, 1600, 'lowpass', 0, 160);
      beep(34, 1.0, 'sawtooth', 0.13, 20);
      noise(0.4, 0.1, 700, 'lowpass', 120, 100);
    }
    if (ev.t === 16) {
      // 灰と化す: 灰色の粒子を大量に散らしてジギムントを消す
      for (let i = 0; i < 130; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.4 + Math.random() * 2.4;
        pushParticle({
          x: ecx + (Math.random() - 0.5) * e.size * 0.7,
          y: ecy + (Math.random() - 0.5) * e.size * 0.7,
          vx: Math.cos(a) * sp * 0.4,
          vy: Math.sin(a) * sp * 0.4 - 0.6,
          life: 50 + Math.random() * 60,
          color: ['#94b0c2', '#566c86', '#333c57', '#f4f4f4'][Math.floor(Math.random() * 4)],
        });
      }
      addShockwave(ecx, ecy, '#94b0c2', 18, 10, 40, 7);
      e.dyingDone = true;
      killEnemy(e);        // 本来の撃破処理（スコア加算・stage進行・けっさん予約 pendingTally=110）
      bannerTimer = 0;     // クリアバナーはイベント中に出さない
      enemies = enemies.filter((x) => x !== e); // 灰になって画面から消える
    }
  } else if (ev.step === 5) {
    // 雷龍「人間よ。かかってくるがいい。我ら【八大神魔】の力を思い知らせてくれる・・・」
    if (ev.t === 1) { beep(60, 0.5, 'sawtooth', 0.05, 42); noise(0.2, 0.04, 600, 'highpass'); }
  } else if (ev.step === 6) {
    // 締め: ウィンドウを閉じてゲームへ戻る
  }

  if (ev.t >= dur) {
    ev.step++;
    ev.t = 0;
    if (ev.step >= BOSS_EVENT_STEPS.length) {
      bossEvent = null; // イベント終了。以降 pendingTally が減り、けっさん画面へ移行する
    }
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
        pushParticle({
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
      pushParticle({ x: e.x + Math.random() * e.size, y: e.y + Math.random() * e.size, vx: -a.vx * 0.3, vy: -a.vy * 0.3, life: 12, color: e.type.aura });
      pushParticle({ x: e.x + Math.random() * e.size, y: e.y + Math.random() * e.size, vx: -a.vx * 0.2, vy: -a.vy * 0.2, life: 10, color: '#f4f4f4' });
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
        pushParticle({
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
  } else if (a.kind === 'breath') {
    // ドラゴンの炎ブレス: 口に炎が集まり…ゴオオオッ！と吐き続ける（ボスごとに breathName/breathColors で上書き可）
    const bcol = e.type.breathColors;
    const tel = 35;
    const dur = 75;
    const mouthX = ecx;
    const mouthY = e.y + e.size * 0.32;
    if (a.t === 1) { addPopup(ecx, e.y - 12, e.type.breathName || 'ほのおのブレス！！', bcol ? bcol[1] : '#ef7d57', 17); SFX.warn(); SFX.giantCharge(); }
    if (a.t < tel) {
      // 吸い込み: 炎が口に集まる
      for (let i = 0; i < 2; i++) {
        const ca = Math.random() * Math.PI * 2;
        const cd = 40 + Math.random() * 50;
        pushParticle({
          x: mouthX + Math.cos(ca) * cd, y: mouthY + Math.sin(ca) * cd,
          vx: -Math.cos(ca) * 3, vy: -Math.sin(ca) * 3,
          life: 13, color: Math.random() < 0.5 ? (bcol ? bcol[2] : PALETTE.O) : (bcol ? bcol[1] : PALETTE.Y),
        });
      }
    } else if (a.t < tel + dur) {
      if ((a.t - tel) % 14 === 0) SFX.bossFire();
      const aim = Math.atan2(pc.y - mouthY, pc.x - mouthX);
      for (let i = 0; i < 3; i++) {
        const ang = aim + (Math.random() - 0.5) * 0.5;
        const sp = 2.2 + Math.random() * 0.9;
        fireballs.push({
          x: mouthX, y: mouthY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 85, colors: bcol || ['#b13e53', '#ef7d57', '#ffcd75'], kind: 'fire',
          ang, rot: 0,
        });
      }
      shakeTimer = Math.max(shakeTimer, 4);
    } else if (a.t > tel + dur + 35) {
      e.act = null;
    }
  } else if (a.kind === 'beam') {
    // らいこうレーザー: 口元に光が収束（予告）→ 極太の雷ビームで薙ぎ払う。
    // 予告48フレーム以上。判定はビーム線分とプレイヤーの最短距離。ヒットは hurtPlayer()（無敵中は無効）。
    const bcol = e.type.breathColors || ['#3b5dc9', '#73eff7', '#ffcd75'];
    const tel = 50;                 // 収束予告
    const fire = e.form2 ? 96 : 88; // 薙ぎ払い
    const ox = ecx;
    const oy = e.y + e.size * 0.40;
    a.ox = ox; a.oy = oy; a.bcol = bcol;
    if (a.t === 1) {
      addPopup(ecx, e.y - 14, 'らいこうレーザー', bcol[1], 17);
      SFX.warn(); SFX.giantCharge();
      a.aimAng = Math.atan2(pc.y - oy, pc.x - ox);
    }
    if (a.t < tel) {
      // 収束: 光の粒が口元に吸い込まれる。予告線は発射直前までプレイヤーを追う
      a.telFrac = a.t / tel;
      if (a.t < tel - 12) a.aimAng = Math.atan2(pc.y - oy, pc.x - ox);
      a.beamOn = false;
      for (let i = 0; i < 3; i++) {
        const ca = Math.random() * Math.PI * 2;
        const cd = 45 + Math.random() * 55;
        pushParticle({
          x: ox + Math.cos(ca) * cd, y: oy + Math.sin(ca) * cd,
          vx: -Math.cos(ca) * 4, vy: -Math.sin(ca) * 4,
          life: 12, color: Math.random() < 0.5 ? bcol[1] : bcol[2],
        });
      }
    } else if (a.t === tel) {
      // 発射開始: 薙ぎ払いの開始角・回転方向を確定（予告線の向きが起点）
      a.beamAng0 = a.aimAng;
      const range = e.form2 ? 0.95 : 0.62;   // 薙ぎ払いの総角度
      a.beamDir = Math.random() < 0.5 ? 1 : -1;
      a.beamRange = range;
      a.beamOn = true;
      addShockwave(ox, oy, '#f4f4f4', 10, 8, 20, 5);
      flashTimer = Math.max(flashTimer, 12);
      shakeTimer = Math.max(shakeTimer, 10);
      SFX.giantShot();
    } else if (a.t < tel + fire) {
      const ft = (a.t - tel) / fire;                       // 0→1
      const ang = a.beamAng0 + a.beamDir * (ft - 0.5) * a.beamRange;
      a.beamAng = ang;
      a.beamOn = true;
      shakeTimer = Math.max(shakeTimer, 4);
      if ((a.t - tel) % 12 === 0) SFX.bossFire();
      // ビーム線分（口元→画面外）とプレイヤー中心の最短距離で判定
      const L = 720;
      const ex = ox + Math.cos(ang) * L;
      const ey = oy + Math.sin(ang) * L;
      const d = distToSegment(pc.x, pc.y, ox, oy, ex, ey);
      const halfW = 15;
      if (invincibleTimer === 0 && state === 'playing' && d < halfW) hurtPlayer();
      // ビームの縁に火花を散らす（見栄え）
      if (a.t % 2 === 0) {
        const sd = 60 + Math.random() * (L - 120);
        burst(ox + Math.cos(ang) * sd, oy + Math.sin(ang) * sd, Math.random() < 0.5 ? bcol[1] : '#f4f4f4', 2, 1.4);
      }
    } else {
      a.beamOn = false;
      if (a.t > tel + fire + 22) e.act = null;
    }
  }
}

// 点(px,py)と線分(ax,ay)-(bx,by)の最短距離。ビーム判定に使う
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// ---------- ボスの弾の移動 ----------
function updateBossShots(pc) {
  const newShots = [];
  fireballs = fireballs.filter((f) => {
    // うねる弾（ヘビのようにジグザグ飛ぶ）
    if (f.wave) {
      const perp = f.ang + Math.PI / 2;
      const off = Math.sin(f.life * 0.15) * 1.1;
      f.x += Math.cos(perp) * off;
      f.y += Math.sin(perp) * off;
    }
    // 止まってから急加速する弾（アヌビス・フェンリル・デスサイザー）
    if (f.dart) {
      f.dartT++;
      if (f.dartT === 1) { f.svx = f.vx; f.svy = f.vy; }
      if (f.dartT < 55) {
        f.vx = f.svx * 0.22;
        f.vy = f.svy * 0.22;
      } else if (f.dartT === 55) {
        const a = Math.atan2(pc.y - f.y, pc.x - f.x);
        f.vx = Math.cos(a) * 3.0;
        f.vy = Math.sin(a) * 3.0;
        f.ang = a;
        burst(f.x, f.y, '#f4f4f4', 4, 1);
      }
    }
    // 壁で跳ね返る弾（スルト・メガロドン）
    if (f.bounce > 0) {
      if (f.x < 5 || f.x > W - 5) { f.vx = -f.vx; f.bounce--; burst(f.x, f.y, '#f4f4f4', 4, 1); }
      if (f.y < 5 || f.y > H - 5) { f.vy = -f.vy; f.bounce--; burst(f.x, f.y, '#f4f4f4', 4, 1); }
    }
    f.x += f.vx;
    f.y += f.vy;
    f.life--;
    if (f.kind === 'sword' || f.kind === 'hammer' || f.kind === 'scythe') f.rot += 0.3;
    if (f.giant) {
      f.rot += 0.09;
      // 飛んでいる間は地響きがして、まわりをエネルギーの火花が回る
      if (gframe % 5 === 0) shakeTimer = Math.max(shakeTimer, 3);
      const sa = f.rot * 3;
      pushParticle({ x: f.x + Math.cos(sa) * 48, y: f.y + Math.sin(sa) * 48, vx: 0, vy: 0, life: 8, color: '#f4f4f4' });
      pushParticle({ x: f.x - Math.cos(sa) * 48, y: f.y - Math.sin(sa) * 48, vx: 0, vy: 0, life: 8, color: '#ffcd75' });
      // 通ったあとに衝撃波のなごりを残す
      pushParticle({
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
        pushParticle({
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
    // 破裂する弾: 寿命が切れると3方向に小さな弾が飛び散る！
    if (!alive && f.burst && f.life <= 0) {
      for (let i = 0; i < 3; i++) {
        const a2 = (Math.PI * 2 * i) / 3 + Math.random() * 0.6;
        newShots.push({ x: f.x, y: f.y, vx: Math.cos(a2) * 1.3, vy: Math.sin(a2) * 1.3, life: 200, colors: f.colors, kind: 'ball', ang: a2, rot: 0 });
      }
      burst(f.x, f.y, '#f4f4f4', 10, 2);
      SFX.split();
    }
    return alive;
  });
  fireballs.push(...newShots);
}

// ---------- 回転武器と敵の当たり判定 ----------
function updateWeaponHits(pc, weapon) {
  const wl = weaponLen(weapon); // ヨーヨーは伸び縮みする
  for (const e of enemies) {
    if (e.hp <= 0 || e.hitTimer > 0 || e.airborne || e.dying) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    let hit = false;
    let hitX = ecx, hitY = ecy;
    let hitA = 0;
    let hitMul = 1; // 残像刃は半減。通常刃・オービット刃は等倍
    for (let b = 0; b < weapon.blades && !hit; b++) {
      const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
      if (weapon.kind === 'chain') {
        // 鎖武器は先端の鉄球だけで判定（そのぶん強い）
        const bx = pc.x + Math.cos(a) * wl;
        const by = pc.y + Math.sin(a) * wl;
        const r = e.size / 2 + weapon.ballR;
        if ((bx - ecx) ** 2 + (by - ecy) ** 2 < r * r) { hit = true; hitX = bx; hitY = by; hitA = a; }
      } else {
        const eRadius = e.size / 2 + weapon.width / 2;
        for (const t of [0.35, 0.55, 0.75, 0.9, 1.0]) {
          const bx = pc.x + Math.cos(a) * wl * t;
          const by = pc.y + Math.sin(a) * wl * t;
          if ((bx - ecx) ** 2 + (by - ecy) ** 2 < eRadius ** 2) { hit = true; hitX = bx; hitY = by; hitA = a; break; }
        }
      }
    }
    // 残像斬り（じくうのカタナ・ムラクモ）: delay フレーム前の角度に半減ダメージの刃が出る
    if (!hit && weapon.echo && angleHist.length > weapon.echo.delay) {
      const ea = angleHist[angleHist.length - 1 - weapon.echo.delay];
      const eRadius = e.size / 2 + weapon.width / 2;
      for (let b = 0; b < weapon.blades && !hit; b++) {
        const a = ea + (b * Math.PI * 2) / weapon.blades;
        for (const t of [0.35, 0.55, 0.75, 0.9, 1.0]) {
          const bx = pc.x + Math.cos(a) * wl * t;
          const by = pc.y + Math.sin(a) * wl * t;
          if ((bx - ecx) ** 2 + (by - ecy) ** 2 < eRadius ** 2) { hit = true; hitX = bx; hitY = by; hitA = a; hitMul = weapon.echo.mul; break; }
        }
      }
    }
    // オービット刃（ギャラクシーツインリング）: プレイヤーを半径 r で周回する独立回転の刃
    if (!hit && weapon.orbitals) {
      const orb = weapon.orbitals;
      const oRadius = e.size / 2 + weapon.width;
      for (let k = 0; k < orb.count && !hit; k++) {
        const a = orbitAngle + (k * Math.PI * 2) / orb.count;
        const bx = pc.x + Math.cos(a) * orb.r;
        const by = pc.y + Math.sin(a) * orb.r;
        if ((bx - ecx) ** 2 + (by - ecy) ** 2 < oRadius ** 2) { hit = true; hitX = bx; hitY = by; hitA = a; }
      }
    }
    if (hit) {
      const swingDmg = hitMul === 1 ? weapon.dmg : Math.max(1, Math.round(weapon.dmg * hitMul));
      let dealt;
      if (e.boss) {
        dealt = damageBoss(e, swingDmg, hitX, hitY);
        if (dealt === 0) { e.hitTimer = 14; continue; }
      } else {
        // かいしんの一撃（Lv9）: 雑魚へ確率で1.5倍ダメージ
        let dmg = swingDmg;
        const critC = hero.critChance + (gear.clover ? 0.06 : 0); // よつばのクローバー: かいしん率 +6%
        const crit = critC > 0 && Math.random() < critC;
        if (crit) { dmg = Math.max(dmg + 1, Math.round(dmg * 1.5)); addPopup(hitX, hitY - 8, 'かいしん！', '#ff004d', 12); }
        e.hp -= dmg;
        dealt = dmg;
      }
      // ズバッ！の手ごたえ: 斬撃エフェクト＋ヒットストップ＋切れ味のある音
      addSlash(hitX, hitY, hitA + Math.PI / 2 + (Math.random() - 0.5) * 0.6);
      hitstopT = Math.min(6, hitstopT + (e.boss ? 3 : 2));
      SFX.slash();
      if (weapon.ice) {
        e.slowTimer = 140;
        burst(ecx, ecy, PALETTE.C, 6);
        SFX.freeze();
      }
      if (e.hp <= 0) {
        killEnemy(e);
      } else {
        const kb = Math.atan2(ecy - pc.y, ecx - pc.x);
        const kbDist = e.boss ? 3 : (weapon.knock || 14) * hero.knockMul;
        e.x += Math.cos(kb) * kbDist;
        e.y += Math.sin(kb) * kbDist;
        e.hitTimer = 18;
        burst(hitX, hitY, PALETTE.W, 7, 2.2);
      }
      shakeTimer = Math.max(shakeTimer, 6);
    }
  }
}

// ---------- パリィ（カオスブレイカー）: 刃で敵弾を弾き返し、プレイヤーの遠距離弾に変換 ----------
function updateWeaponParry(pc, weapon) {
  if (!fireballs.length) return;
  const wl = weaponLen(weapon);
  // 弾き返し先はボス優先（いなければ最寄りの敵、それも無ければ真逆に打ち返す）
  const boss = enemies.find((e) => e.boss && e.hp > 0);
  fireballs = fireballs.filter((f) => {
    for (let b = 0; b < weapon.blades; b++) {
      const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
      const rr = 10 + weapon.width;
      for (const t of [0.4, 0.6, 0.8, 1.0]) {
        const bx = pc.x + Math.cos(a) * wl * t;
        const by = pc.y + Math.sin(a) * wl * t;
        if ((bx - f.x) ** 2 + (by - f.y) ** 2 < rr * rr) {
          // パリィ成立: 敵弾を消し、プレイヤー弾（通常ダメージ経路＝half なし）に変換
          let target = boss || nearestEnemyTo(f.x, f.y);
          let ang = target
            ? Math.atan2(target.y + target.size / 2 - f.y, target.x + target.size / 2 - f.x)
            : Math.atan2(-f.vy, -f.vx);
          pshots.push({
            x: f.x, y: f.y,
            vx: Math.cos(ang) * 6.5, vy: Math.sin(ang) * 6.5,
            life: 120, kind: 'laser', dmg: weapon.dmg, pierce: true, aoe: 0,
            half: false, // 弾き返し弾は通常ダメージ（弱点コアの半減例外は pshot 処理に任せる）
            turn: 0, ang, rot: 0, t: 0, returning: false,
            hitSet: new Set(), color: '#c084fc', trail: null,
          });
          burst(f.x, f.y, '#c084fc', 12, 2.6);
          burst(f.x, f.y, '#73eff7', 6, 1.8);
          addSlash(f.x, f.y, ang + Math.PI / 2);
          hitstopT = Math.min(6, hitstopT + 2);
          shakeTimer = Math.max(shakeTimer, 5);
          SFX.parry();
          return false; // この敵弾は消滅
        }
      }
    }
    return true;
  });
}

// ---------- プレイヤーの弾と敵の当たり判定 ----------
function updatePShotHits() {
  for (const f of pshots) {
    for (const e of enemies) {
      if (e.hp <= 0 || e.airborne || e.dying) continue;
      if (f.hitSet && f.hitSet.has(e)) continue;
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      const r = e.size / 2 + (f.r || (f.aoe > 0 ? 8 : 5));
      if ((f.x - ecx) ** 2 + (f.y - ecy) ** 2 < r * r) {
        let dealt;
        if (e.boss) {
          // ダブル攻撃武器（回転刃＋弾）の弾だけボスに半減。純遠距離武器は通常ダメージ
          // 弱点コア持ちのボスは「コアを狙い撃つ」のが本領なので常に半減なし
          const rangedMul = (f.half && !e.type.gimmicks.includes('weakpoint')) ? 0.5 : 1;
          dealt = damageBoss(e, f.dmg * rangedMul, f.x, f.y);
        } else {
          // かいしんの一撃（Lv9）: 雑魚へ確率で1.5倍ダメージ
          let fdmg = f.dmg;
          const fCritC = hero.critChance + (gear.clover ? 0.06 : 0); // よつばのクローバー: かいしん率 +6%
          if (fCritC > 0 && Math.random() < fCritC) {
            fdmg = Math.max(fdmg + 1, Math.round(fdmg * 1.5));
            addPopup(f.x, f.y - 8, 'かいしん！', '#ff004d', 12);
          }
          e.hp -= fdmg;
          dealt = fdmg;
        }
        // 大砲・爆弾・ミサイルは着弾で大爆発（まわりの敵にもダメージ）
        if (f.aoe > 0) {
          explodeAt(f.x, f.y, f.aoe, f.dmg, f.half);
          f.life = 0;
        } else if (f.pierce) {
          if (f.hitSet) f.hitSet.add(e);
        } else {
          f.life = 0;
        }
        if (e.hp <= 0) killEnemy(e);
        else if (dealt > 0) { e.hitTimer = 12; bulletHitFX(f, ecx, ecy); }
        if (!f.pierce) break;
      }
    }
  }
  pshots = pshots.filter((f) => f.life > 0);
  enemies = enemies.filter((e) => e.hp > 0);
}

// 着弾の火花（kind 別に色・散り方を変える）。近接ヒットより控えめ
let waveHitSfxFrame = -99; // はどうほうの貫通弾が連続ヒットしても炸裂音が鳴りすぎないよう間引く
function bulletHitFX(f, x, y) {
  const fx = SHOT_FX[f.kind] || { color: '#ef7d57', burst: 5 };
  if (f.kind === 'orb') {
    rainbowBurst(x, y, 8, 1.8, true);              // 魔法弾: 虹の小さな飛沫
  } else if (f.kind === 'arrow' || f.kind === 'javelin') {
    burst(x, y, '#f4f4f4', fx.burst, 1.6, true);   // 矢・投槍: 白い小火花
  } else if (f.kind === 'laser') {
    burst(x, y, '#73eff7', fx.burst, 2.4, true);   // レーザー: シアンの火花
  } else if (f.kind === 'wave') {
    // はどうほう: 大きな水色の炸裂＋二重の衝撃波リング＋白い飛沫
    burst(x, y, shotColor(f), 14, 2.8, true);
    burst(x, y, '#f4f4f4', 8, 2.0, true);
    addShockwave(x, y, '#73eff7', 10, 5, 16, 3);
    addShockwave(x, y, '#f4f4f4', 5, 4, 12, 2);
    if (frame - waveHitSfxFrame > 6) { SFX.waveHit(); waveHitSfxFrame = frame; }
  } else {
    burst(x, y, shotColor(f), fx.burst, 1.8, true); // それ以外: 弾色の火花
  }
  // 重量弾（dmg の高い弾）にだけ小さなヒットストップ（近接の最大6Fより控えめに2F）
  if (f.dmg >= 3) hitstopT = Math.max(hitstopT, 2);
}

function explodeAt(x, y, radius, dmg, half = false) {
  burst(x, y, PALETTE.O, 20, 3);
  burst(x, y, PALETTE.Y, 16, 2);
  addShockwave(x, y, '#ffcd75', radius * 0.4, 6, 18, 4); // 広がる衝撃波リングで爆発を強調
  addShockwave(x, y, '#ef7d57', radius * 0.2, 4, 14, 3);
  shakeTimer = Math.max(shakeTimer, 10);
  SFX.boom();
  for (const e of enemies) {
    if (e.hp <= 0 || e.airborne) continue;
    const ecx = e.x + e.size / 2;
    const ecy = e.y + e.size / 2;
    if ((x - ecx) ** 2 + (y - ecy) ** 2 < (radius + e.size / 2) ** 2) {
      // ダブル攻撃武器の爆発のみボスへ半分（弱点コア持ちは常に半減なし）
      const mul = (half && !e.type.gimmicks.includes('weakpoint')) ? 0.5 : 1;
      const dealt = e.boss ? damageBoss(e, dmg * mul, ecx, ecy) : (e.hp -= dmg, dmg);
      if (e.hp <= 0) killEnemy(e);
      else if (dealt > 0) e.hitTimer = 12;
    }
  }
}

// ---------- アイテム ----------
function updateItems(pc) {
  items = items.filter((it) => {
    it.life--;
    // マグネットハート: 半径100px以内のハートをプレイヤーへ引き寄せる
    if (gear.magnet) {
      const dx = pc.x - it.x;
      const dy = pc.y - it.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 100 ** 2 && d2 > 1) {
        const ang = Math.atan2(dy, dx);
        it.x += Math.cos(ang) * 2.5;
        it.y += Math.sin(ang) * 2.5;
      }
    }
    if ((it.x - pc.x) ** 2 + (it.y - pc.y) ** 2 < 20 ** 2) {
      // ハートのつぼ: とると2つ かいふく
      if (lives < maxLives()) lives = Math.min(lives + (gear.heartPot ? 2 : 1), maxLives());
      SFX.heart();
      burst(it.x, it.y, PALETTE.M, 8);
      addPopup(it.x, it.y - 10, gear.heartPot ? 'かいふく＋2！' : 'かいふく！', '#ff77a8', gear.heartPot ? 13 : 11);
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
      if (e.airborne || e.dying) continue; // 空中・崩壊演出中のボスには当たらない
      const ecx = e.x + e.size / 2;
      const ecy = e.y + e.size / 2;
      const hitR = e.boss ? (PLAYER_SIZE / 2 + e.size / 2 - 10) : (PLAYER_SIZE / 2 + e.size / 2 - 4);
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
        // まほうのたて: 22%で弾をはじく（巨大な一撃は防げない）
        if (!f.giant && gear.shield && Math.random() < 0.22) {
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
        if (f.kind === 'web') {
          playerSlowT = 150;
          addPopup(pc.x, pc.y - 30, 'いとに からまった！', '#f4f4f4', 12);
        }
        if (f.giant) shakeTimer = 18;
        hurtPlayer();
        break;
      }
    }
  }
}

// ---------- 傭兵（ショップで雇う味方） ----------
// 主人公の後方に隊列を組み、近くの敵を自動で攻撃する。武器レベルは固定・ハート回復なし・5発被弾で死亡。
function hireMercenary(typeId) {
  const pc = playerCenter();
  const off = MERC_OFFSETS[mercenaries.length] || MERC_OFFSETS[0];
  mercenaries.push({
    typeId,
    x: pc.x + off.x,
    y: pc.y + off.y,
    hits: 0,       // 被弾回数（MERC_MAX_HITSで死亡）
    invT: 0,       // 被弾後の無敵フレーム（多重ヒット防止）
    atkCool: 0,    // 攻撃クールダウン
    atkAnim: 0,    // 攻撃モーション（武器の突き出し演出）
    angle: 0,      // 向いている方向（近い敵の方角）
    bobT: Math.random() * Math.PI * 2, // 上下ゆらぎの位相
    dead: false,
  });
}

function updateMercenaries(pc) {
  if (!mercenaries.length) return;
  for (let i = 0; i < mercenaries.length; i++) {
    const m = mercenaries[i];
    const type = MERC_TYPES[m.typeId];
    if (m.invT > 0) m.invT--;
    if (m.atkCool > 0) m.atkCool--;
    if (m.atkAnim > 0) m.atkAnim--;
    m.bobT += 0.15;

    // 隊列位置へゆっくり追従（敵を追いかけ回さず、主人公を守る動き）
    const off = MERC_OFFSETS[i] || MERC_OFFSETS[0];
    m.x += (pc.x + off.x - m.x) * 0.12;
    m.y += (pc.y + off.y - m.y) * 0.12;
    m.x = Math.max(10, Math.min(W - 10, m.x));
    m.y = Math.max(10, Math.min(H - 10, m.y));

    // 一番近い敵をさがす（空中・崩壊中・逃走中は除外）
    let target = null, bestD2 = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0 || e.airborne || e.dying || e.flee) continue;
      const ex = e.x + e.size / 2, ey = e.y + e.size / 2;
      const d2 = (ex - m.x) ** 2 + (ey - m.y) ** 2;
      if (d2 < bestD2) { bestD2 = d2; target = e; }
    }
    if (target) {
      const ex = target.x + target.size / 2, ey = target.y + target.size / 2;
      m.angle = Math.atan2(ey - m.y, ex - m.x);
      if (m.atkCool <= 0) {
        const dist = Math.hypot(ex - m.x, ey - m.y);
        if (type.ranged) {
          // アーチャー: 矢を放つ（pshotsに合流→updatePShotHitsが半減も処理）
          if (dist <= type.range) {
            pshots.push({
              x: m.x, y: m.y,
              vx: Math.cos(m.angle) * type.arrowSpeed,
              vy: Math.sin(m.angle) * type.arrowSpeed,
              life: 90,
              kind: 'arrow', dmg: type.dmg, pierce: false, aoe: 0, r: 0,
              half: !!type.half, turn: 0, ang: m.angle, rot: 0, t: 0, returning: false,
              hitSet: null, color: '#b6ff8a', trail: null,
            });
            m.atkCool = type.atkInterval;
            m.atkAnim = 10;
            SFX.shoot();
          }
        } else {
          // ナイト: やりで一突き（テスラ方式のダメージ経路。近接はボスへも通常ダメージ）
          if (dist <= type.reach) {
            const dealt = target.boss ? damageBoss(target, type.dmg, ex, ey) : (target.hp -= type.dmg, type.dmg);
            m.atkCool = type.atkInterval;
            m.atkAnim = 12;
            addSlash(ex, ey, m.angle, 0.9);
            SFX.slash();
            if (target.hp <= 0) killEnemy(target);
            else if (dealt > 0) { target.hitTimer = 12; burst(ex, ey, '#c0e0ff', 6); }
          }
        }
      }
    }

    // 被弾判定（敵の体当たり＋敵弾のみ。ハートでの回復はしない）
    if (m.invT === 0) {
      let hit = false;
      for (const e of enemies) {
        if (e.airborne || e.dying) continue;
        const ex = e.x + e.size / 2, ey = e.y + e.size / 2;
        const hitR = e.size / 2 + 10;
        if ((m.x - ex) ** 2 + (m.y - ey) ** 2 < hitR * hitR) { hit = true; break; }
      }
      if (!hit) {
        for (const f of fireballs) {
          const r = f.giant ? 42 : 15;
          if ((f.x - m.x) ** 2 + (f.y - m.y) ** 2 < r * r) { f.life = 0; hit = true; break; }
        }
      }
      if (hit) hurtMercenary(m);
    }
  }
  // 近接で倒した敵と、倒れた傭兵を除去
  enemies = enemies.filter((e) => e.hp > 0);
  if (mercenaries.some((m) => m.dead)) mercenaries = mercenaries.filter((m) => !m.dead);
}

function hurtMercenary(m) {
  m.hits++;
  m.invT = 40;
  const type = MERC_TYPES[m.typeId];
  if (m.hits >= MERC_MAX_HITS) {
    // 5発うけたら死亡（同ステージ中は復活しない。同種はショップで再雇用可能）
    m.dead = true;
    burst(m.x, m.y, type.color, 20, 3);
    burst(m.x, m.y, '#f4f4f4', 12, 2.5);
    addShockwave(m.x, m.y, type.color, 8, 5, 22, 3);
    addPopup(m.x, m.y - 24, 'たおれた…', type.color, 12);
    SFX.boom();
  } else {
    SFX.hurt();
    burst(m.x, m.y, '#ff77a8', 8, 2);
    addPopup(m.x, m.y - 20, 'のこり' + (MERC_MAX_HITS - m.hits), '#41a6f6', 10);
  }
}

// 傭兵の武器（やり／ゆみ）をctxで描画。攻撃時に前へ突き出す
function drawMercWeapon(m, type) {
  ctx.save();
  ctx.translate(Math.round(m.x), Math.round(m.y));
  ctx.rotate(m.angle);
  if (type.ranged) {
    const push = m.atkAnim > 0 ? 2 : 0;
    ctx.strokeStyle = '#a77b5b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(9 + push, 0, 7, -Math.PI / 2.2, Math.PI / 2.2);
    ctx.stroke();
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(9 + push, -6);
    ctx.lineTo(9 + push, 6);
    ctx.stroke();
  } else {
    const reach = 14 + (m.atkAnim > 0 ? 10 : 0);
    ctx.strokeStyle = '#a77b5b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(reach, 0);
    ctx.stroke();
    ctx.fillStyle = '#94b0c2';
    ctx.beginPath();
    ctx.moveTo(reach, -3);
    ctx.lineTo(reach + 6, 0);
    ctx.lineTo(reach, 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderMercenaries() {
  for (const m of mercenaries) {
    const type = MERC_TYPES[m.typeId];
    const bob = Math.sin(m.bobT) * 1.2;
    const by = m.y - 12 + bob;
    const flick = m.invT > 0 && Math.floor(frame / 3) % 2 === 0; // 被弾直後は点滅
    if (!flick) {
      drawSprite(type.sprite, m.x - 12, by, 2, null, true);
      drawMercWeapon(m, type);
    }
    // 頭上に残りライフのピップ（水色＝残り／暗い＝失った分）
    const remain = MERC_MAX_HITS - m.hits;
    for (let p = 0; p < MERC_MAX_HITS; p++) {
      ctx.fillStyle = p < remain ? '#73eff7' : '#333c57';
      ctx.fillRect(Math.round(m.x - 11 + p * 5), Math.round(by - 6), 3, 3);
    }
  }
}

// 落雷の進行と着弾。ボスが咆哮・変身中でも予告済みの雷は必ず落ちる（回避ルールを一定に保つ）
function updateThunderStrikes(pc) {
  strikes = strikes.filter((s) => {
    s.t--;
    if (s.t > 0) return true;
    if (s.storm) {
      // ライリュウの雷嵐: 巨大な赤い落雷。天から複数の稲妻が束になって落ちる
      bolts.push({ x1: s.x + (Math.random() - 0.5) * 40, y1: -12, x2: s.x, y2: s.y, life: 11, storm: true });
      bolts.push({ x1: s.x + (Math.random() - 0.5) * 70, y1: -12, x2: s.x, y2: s.y, life: 9, storm: true });
      bolts.push({ x1: s.x + (Math.random() - 0.5) * 100, y1: -12, x2: s.x, y2: s.y, life: 7, storm: true });
      burst(s.x, s.y, '#ff2e4d', 26, 4.5);
      burst(s.x, s.y, '#ff77a8', 16, 3);
      burst(s.x, s.y, '#f4f4f4', 12, 2.5);
      addShockwave(s.x, s.y, '#ff003c', 8, 8, 40, 4);
      addShockwave(s.x, s.y, '#ff77a8', 4, 5, 26, 3);
      redFlashTimer = Math.max(redFlashTimer, 18);
      flashTimer = Math.max(flashTimer, 6);
      shakeTimer = Math.max(shakeTimer, 9);
    } else {
      bolts.push({ x1: s.x + (Math.random() - 0.5) * 30, y1: -10, x2: s.x, y2: s.y, life: 8 });
      bolts.push({ x1: s.x + (Math.random() - 0.5) * 50, y1: -10, x2: s.x, y2: s.y, life: 6 });
      burst(s.x, s.y, '#ffcd75', 14, 3);
      burst(s.x, s.y, '#f4f4f4', 8, 2);
      addShockwave(s.x, s.y, '#ffcd75', 6, 5, 20, 3);
      flashTimer = Math.max(flashTimer, 8);
      shakeTimer = Math.max(shakeTimer, 5);
    }
    SFX.thunder();
    const hitR = s.storm ? 30 : 26;
    if (invincibleTimer === 0 && state === 'playing' && (pc.x - s.x) ** 2 + (pc.y - s.y) ** 2 < hitR ** 2) {
      hurtPlayer(s.storm ? 2 : 1); // 雷嵐の直撃はハート2つ分の大ダメージ
    }
    return false;
  });
}

// 2つの角度の最短差（-π〜π）。ノヴァの「切れ目」判定に使う
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------- ライリュウ専用の特殊攻撃3種の発動タイミング制御 ----------
// らいこうレーザー(beam)は近接技(act)と排他。いかずち/ノヴァは独立した設置ハザード。
function updateRairyuSpecials(e, pc, ecx, ecy) {
  const f2 = e.form2;

  // らいこうレーザー: 周期到達で act に beam をセット（act状態機械が拾って実行）
  e.beamT++;
  const beamCycle = f2 ? 340 : 420;
  if (e.beamT >= beamCycle && !e.act && e.giantCharge === 0 && e.y > 0) {
    e.beamT = 0;
    e.act = { kind: 'beam', t: 0, tx: 0, ty: 0, vx: 0, vy: 0, sweep: 0 };
  }

  // いかずちのかご: HP80%以下で発動。電気フェンスを設置（予告→本体でダメージ）
  if (e.hp <= e.maxHp * 0.8) {
    e.cageT++;
    const cageCycle = f2 ? 430 : 560;
    if (e.cageT >= cageCycle && fences.length === 0) {
      e.cageT = 0;
      spawnCage(pc, f2);
    }
  }

  // ばんらいノヴァ: 第2形態のみ。広がる電気リング3連（1枚目の切れ目はプレイヤー方向）
  if (f2) {
    e.novaT++;
    if (e.novaT >= 480 && novas.length === 0) {
      e.novaT = 0;
      spawnNovas(ecx, ecy, pc);
    }
  }
}

// いかずちのかご: プリセットの柵配置から、今のプレイヤー位置に重なるものを除いて設置する
function spawnCage(pc, f2) {
  const presets = [
    // 縦の柵2本
    [[W * 0.30, 36, W * 0.30, H - 6], [W * 0.70, 36, W * 0.70, H - 6]],
    // 横の柵2本
    [[10, H * 0.38, W - 10, H * 0.38], [10, H * 0.72, W - 10, H * 0.72]],
    // コの字（右下が開いた檻）
    [[56, 54, W - 56, 54], [56, 54, 56, H - 30], [56, H - 30, W - 150, H - 30]],
  ];
  let p = presets[Math.floor(Math.random() * presets.length)].slice();
  if (f2) p = p.concat([[W * 0.5, 36, W * 0.5, H - 6]]); // 第2形態は1本追加して密度アップ
  const tel = 50;                 // 予告（ダメージなし）
  const live = f2 ? 250 : 215;    // 通電（本物のダメージ）
  let placed = 0;
  for (const s of p) {
    // プレイヤーの現在位置に重なる柵は張らない（予告中の逃げ場を確保）
    if (distToSegment(pc.x, pc.y, s[0], s[1], s[2], s[3]) < 46) continue;
    fences.push({ x1: s[0], y1: s[1], x2: s[2], y2: s[3], t: tel, tel, live, f2, seed: Math.random() * 100 });
    placed++;
  }
  if (placed > 0) {
    addPopup(W / 2, 30, 'いかずちのかご！！', '#73eff7', 17);
    SFX.warn();
    flashTimer = Math.max(flashTimer, 6);
  }
}

// 電気フェンスの進行。予告50フレームは無害→通電後は最短距離で判定し hurtPlayer()
function updateFences(pc) {
  fences = fences.filter((fc) => {
    fc.t--;
    if (fc.t > 0) {
      // 予告: 明滅しながら火花を散らす（ダメージなし）
      if (frame % 5 === 0) {
        const u = Math.random();
        pushParticle({ x: fc.x1 + (fc.x2 - fc.x1) * u, y: fc.y1 + (fc.y2 - fc.y1) * u, vx: 0, vy: 0, life: 8, color: '#73eff7' });
      }
      return true;
    }
    if (fc.t === 0) { SFX.thunder(); flashTimer = Math.max(flashTimer, 6); shakeTimer = Math.max(shakeTimer, 5); }
    fc.live--;
    if (invincibleTimer === 0 && state === 'playing' && distToSegment(pc.x, pc.y, fc.x1, fc.y1, fc.x2, fc.y2) < 11) hurtPlayer();
    if (frame % 3 === 0) {
      const u = Math.random();
      burst(fc.x1 + (fc.x2 - fc.x1) * u, fc.y1 + (fc.y2 - fc.y1) * u, Math.random() < 0.5 ? '#73eff7' : '#f4f4f4', 2, 1.3);
    }
    return fc.live > 0;
  });
}

// ばんらいノヴァ: 中心から広がる電気リング3連を生成（1枚目の切れ目はプレイヤー方向＝逃げ道）
function spawnNovas(cx, cy, pc) {
  const toPlayer = Math.atan2(pc.y - cy, pc.x - cx);
  const gapHalf = 0.61; // 切れ目 約70度の半分
  for (let i = 0; i < 3; i++) {
    // 1枚目は必ずプレイヤー方向に切れ目。2・3枚目はランダムな別方向
    const gap = i === 0 ? toPlayer : Math.random() * Math.PI * 2;
    novas.push({
      cx, cy, gapAng: gap, gapHalf,
      delay: i * 60, tel: 46,           // 60フレームおきに起動・予告46フレーム
      r: 0, rMax: 300, thick: 13, expandDur: 70,
    });
  }
  addPopup(cx, cy - 40, 'ばんらいノヴァ！！', '#b567b5', 18);
  SFX.warn();
}

// ノヴァの進行。リング半径付近かつ切れ目の外にいたら hurtPlayer()
function updateNovas(pc) {
  novas = novas.filter((nv) => {
    if (nv.delay > 0) { nv.delay--; return true; }
    if (nv.tel > 0) {
      nv.tel--;
      if (nv.tel === 0) { SFX.thunder(); flashTimer = Math.max(flashTimer, 8); shakeTimer = Math.max(shakeTimer, 6); }
      return true;
    }
    nv.r += nv.rMax / nv.expandDur;
    if (invincibleTimer === 0 && state === 'playing') {
      const dx = pc.x - nv.cx, dy = pc.y - nv.cy;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - nv.r) < nv.thick && Math.abs(angDiff(Math.atan2(dy, dx), nv.gapAng)) > nv.gapHalf) hurtPlayer();
    }
    if (frame % 2 === 0) {
      const a = Math.random() * Math.PI * 2;
      if (Math.abs(angDiff(a, nv.gapAng)) > nv.gapHalf) burst(nv.cx + Math.cos(a) * nv.r, nv.cy + Math.sin(a) * nv.r, Math.random() < 0.5 ? '#b567b5' : '#73eff7', 1, 1.2);
    }
    return nv.r < nv.rMax;
  });
}

// ---------- セイリュウ「ひょうけつのあらし」: 氷柱＋凍結フィールド ----------
// storm(赤い落雷)とは完全別系統。青白い結晶が地面から突き上がり、当たると凍結(移動半減)＋被弾。
function updateSeiryuBlizzard(e, pc, ecx, ecy) {
  const f2 = e.form2;
  if (e.hp > e.maxHp * 0.9) return; // HP90%以下で始動
  e.blizzT = (e.blizzT == null ? 200 : e.blizzT) - 1;
  if (e.blizzT <= 0 && frost.length === 0) {
    e.blizzT = f2 ? 150 : 230;      // 真の姿は発生間隔が短い
    spawnFrostField(pc, f2);
  }
}

// 氷柱を設置。1本目は現在位置、真の姿は予測位置も狙い、残りは既存とかぶらない乱数配置。
function spawnFrostField(pc, f2) {
  const n = f2 ? 9 : 6;
  const pts = [{ x: pc.x, y: pc.y }];
  if (f2) pts.push({ x: pc.x + (Math.random() - 0.5) * 90, y: pc.y + (Math.random() - 0.5) * 90 });
  while (pts.length < n) {
    let sx, sy, tries = 0;
    do {
      sx = 30 + Math.random() * (W - 60);
      sy = 60 + Math.random() * (H - 90);
      tries++;
    } while (tries < 20 && pts.some((p) => (p.x - sx) ** 2 + (p.y - sy) ** 2 < 46 ** 2));
    pts.push({ x: sx, y: sy });
  }
  for (const p of pts) {
    frost.push({
      x: Math.max(20, Math.min(W - 20, p.x)),
      y: Math.max(50, Math.min(H - 20, p.y)),
      t: 50, rise: 0, live: f2 ? 46 : 38, r: f2 ? 30 : 26, f2, hit: false,
    });
  }
  addPopup(W / 2, 30, 'ひょうけつのあらし！！', '#a8dadc', 17);
  SFX.warn();
}

// 氷柱の進行。予告50f(無害)→隆起して数フレームだけ判定。触れると凍結(playerSlowT)＋被弾(1回だけ)。
function updateFrost(pc) {
  frost = frost.filter((ic) => {
    ic.t--;
    if (ic.t > 0) {
      if (frame % 4 === 0) pushParticle({ x: ic.x + (Math.random() - 0.5) * ic.r, y: ic.y + (Math.random() - 0.5) * ic.r, vx: 0, vy: -0.3, life: 10, color: '#a8dadc' });
      return true;
    }
    if (ic.t === 0) { SFX.thunder(); flashTimer = Math.max(flashTimer, 5); shakeTimer = Math.max(shakeTimer, 6); burst(ic.x, ic.y, '#f4f4f4', 12, 2.5); }
    if (ic.rise < 1) ic.rise = Math.min(1, ic.rise + 0.2);
    ic.live--;
    if (!ic.hit && ic.rise >= 1 && invincibleTimer === 0 && state === 'playing' && (pc.x - ic.x) ** 2 + (pc.y - ic.y) ** 2 < ic.r ** 2) {
      ic.hit = true;
      playerSlowT = ic.f2 ? 180 : 120;
      addPopup(pc.x, pc.y - 30, 'こおった！', '#73eff7', 12);
      hurtPlayer();
    }
    if (frame % 3 === 0) burst(ic.x + (Math.random() - 0.5) * ic.r, ic.y - 10 - Math.random() * 20, Math.random() < 0.5 ? '#a8dadc' : '#f4f4f4', 1, 1.2);
    return ic.live > 0;
  });
}

// 氷柱の描画。予告は六角の霜マーカー、発動後は下から突き上がる青白い結晶（雷とは別デザイン）。
function drawFrost() {
  for (const ic of frost) {
    if (ic.t > 0) {
      const blink = Math.floor(ic.t / 4) % 2 === 0;
      ctx.strokeStyle = blink ? 'rgba(168,218,220,0.9)' : 'rgba(168,218,220,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const px = ic.x + Math.cos(a) * ic.r, py = ic.y + Math.sin(a) * ic.r * 0.6;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      continue;
    }
    const h = ic.rise * (ic.f2 ? 62 : 48);
    const w = ic.r * 0.7;
    ctx.globalAlpha = ic.live < 12 ? ic.live / 12 : 1; // 砕け散る直前はフェード
    ctx.fillStyle = 'rgba(59,93,201,0.5)';             // 影（濃い青）
    ctx.beginPath();
    ctx.moveTo(ic.x, ic.y - h); ctx.lineTo(ic.x + w, ic.y); ctx.lineTo(ic.x, ic.y + 6); ctx.lineTo(ic.x - w, ic.y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#73eff7';                          // 本体（水色）
    ctx.beginPath();
    ctx.moveTo(ic.x, ic.y - h); ctx.lineTo(ic.x + w * 0.6, ic.y - h * 0.35); ctx.lineTo(ic.x, ic.y); ctx.lineTo(ic.x - w * 0.6, ic.y - h * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f4f4';                          // 白い芯のきらめき
    ctx.fillRect(ic.x - 1, ic.y - h + 2, 2, h * 0.5);
    ctx.globalAlpha = 1;
  }
}

// ---------- ティアマト「こんとんのうず」: 引き寄せ渦→炸裂 ----------
// storm(落雷)とは別系統。渦がプレイヤーを吸い寄せてから爆発する。逃げ切れないと被弾。
function updateTiamatVortex(e, pc, ecx, ecy) {
  const f2 = e.form2;
  if (e.hp > e.maxHp * 0.85) return; // HP85%以下で始動
  e.vortexT = (e.vortexT == null ? 260 : e.vortexT) - 1;
  if (e.vortexT <= 0 && vortexes.length === 0) {
    e.vortexT = f2 ? 210 : 320;      // 真の姿は発生間隔が短い
    spawnVortex(pc, f2);
  }
}

// 渦の核をプレイヤー近くに置く。真の姿は対角にもう1つ同時発生（多方向同時）。
function spawnVortex(pc, f2) {
  const cx = Math.max(60, Math.min(W - 60, pc.x + (Math.random() - 0.5) * 70));
  const cy = Math.max(60, Math.min(H - 60, pc.y + (Math.random() - 0.5) * 70));
  vortexes.push({ cx, cy, tel: 44, pull: f2 ? 120 : 96, blast: 0, ang: 0, r: f2 ? 84 : 70, f2 });
  if (f2) vortexes.push({ cx: W - cx, cy: H - cy, tel: 70, pull: 120, blast: 0, ang: 0, r: 84, f2 });
  addPopup(cx, cy - 40, 'こんとんのうず！！', '#c9284a', 18);
  SFX.warn();
}

// 渦の進行。予告→吸引(歩いて抵抗可＝理不尽にしない)→炸裂。半径内で逃げ遅れたら被弾。
function updateVortexes(pc) {
  vortexes = vortexes.filter((v) => {
    v.ang += v.f2 ? 0.35 : 0.28;
    if (v.tel > 0) {
      v.tel--;
      if (frame % 3 === 0) {
        const a = v.ang * 2 + Math.random() * Math.PI * 2;
        const rr = v.r * (0.5 + Math.random() * 0.5);
        pushParticle({ x: v.cx + Math.cos(a) * rr, y: v.cy + Math.sin(a) * rr, vx: -Math.cos(a) * 1.5, vy: -Math.sin(a) * 1.5, life: 14, color: Math.random() < 0.5 ? '#8b4f8b' : '#ff2e4d' });
      }
      if (v.tel === 0) { SFX.warn(); flashTimer = Math.max(flashTimer, 6); }
      return true;
    }
    if (v.pull > 0) {
      v.pull--;
      if (state === 'playing') {
        const lc = playerCenter();
        const dx = v.cx - lc.x, dy = v.cy - lc.y;
        const d = Math.hypot(dx, dy) || 1;
        const strength = (v.f2 ? 1.15 : 0.8) * Math.min(1, d / 120);
        player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x + (dx / d) * strength));
        player.y = Math.max(0, Math.min(H - PLAYER_SIZE, player.y + (dy / d) * strength));
      }
      if (frame % 2 === 0) {
        const a = v.ang * 3 + Math.random() * Math.PI * 2;
        const rr = v.r * (0.7 + Math.random() * 0.6);
        pushParticle({ x: v.cx + Math.cos(a) * rr, y: v.cy + Math.sin(a) * rr, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, life: 12, color: Math.random() < 0.5 ? '#c9284a' : '#8b4f8b' });
      }
      if (v.pull === 0) { v.blast = 26; addPopup(v.cx, v.cy - 30, 'はじける…！', '#ff2e4d', 14); }
      return true;
    }
    v.blast--;
    if (v.blast === 20) {
      SFX.boom();
      flashTimer = Math.max(flashTimer, 10); shakeTimer = Math.max(shakeTimer, 12);
      addShockwave(v.cx, v.cy, '#ff2e4d', 10, 8, v.r + 8, 6);
      addShockwave(v.cx, v.cy, '#8b4f8b', 8, 6, v.r, 4);
      rainbowBurst(v.cx, v.cy, 30, 4);
      burst(v.cx, v.cy, '#ff2e4d', 24, 4.5);
      burst(v.cx, v.cy, '#c9284a', 16, 3);
      const lc = playerCenter();
      if (invincibleTimer === 0 && state === 'playing' && (lc.x - v.cx) ** 2 + (lc.y - v.cy) ** 2 < v.r ** 2) {
        hurtPlayer(v.f2 ? 2 : 1); // 真の姿の炸裂はハート2つ分
      }
    }
    return v.blast > 0;
  });
}

// 渦の描画。3本のらせん腕が回転しながら中心へ吸い込むデザイン（雷・氷とは別）。
function drawVortexes() {
  for (const v of vortexes) {
    if (v.blast > 0) {
      const p = 1 - v.blast / 26;
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(v.cx, v.cy, v.r * p * 1.2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    const pulling = v.tel <= 0;
    const rr = pulling ? v.r : v.r * 0.7;
    for (let k = 0; k < 3; k++) {
      const base = v.ang + (Math.PI * 2 * k) / 3;
      ctx.strokeStyle = k % 2 === 0 ? 'rgba(139,79,139,0.85)' : 'rgba(255,46,77,0.8)';
      ctx.lineWidth = pulling ? 3 : 2;
      ctx.beginPath();
      for (let s = 0; s <= 18; s++) {
        const u = s / 18;
        const a = base + u * 3.2;             // らせん
        const px = v.cx + Math.cos(a) * rr * u, py = v.cy + Math.sin(a) * rr * u;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = pulling ? '#ff2e4d' : '#8b4f8b';
    ctx.beginPath(); ctx.arc(v.cx, v.cy, pulling ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath(); ctx.arc(v.cx, v.cy, 2, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- ステージごとの環境エフェクト ----------
function updateStageFx() {
  const st = currentStage();
  const fx = st.fx;
  if (fx === 'petal' && frame % 24 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: 0.4 + Math.random() * 0.5, vy: 0.5 + Math.random() * 0.5, life: 90, color: '#ff77a8' });
  } else if (fx === 'leaf' && frame % 14 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 1.2, vy: 0.6 + Math.random() * 0.6, life: 80, color: '#38b764' });
  } else if (fx === 'bubble' && frame % 16 === 0) {
    pushParticle({ x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 0.3, vy: -0.5 - Math.random() * 0.5, life: 60, color: '#5f6b35' });
  } else if (fx === 'rain') {
    if (frame % 2 === 0) {
      pushParticle({ x: Math.random() * (W + 60) - 30, y: -4, vx: -1.5, vy: 6 + Math.random() * 2, life: 70, color: '#73a3c9' });
    }
    // ときどき稲光が走る
    if (Math.random() < 0.003) { flashTimer = Math.max(flashTimer, 5); beep(70, 0.5, 'sawtooth', 0.03, 40); }
  } else if (fx === 'ripple' && frame % 20 === 0) {
    pushParticle({ x: Math.random() * W, y: Math.random() * H, vx: 0.3, vy: 0, life: 40, color: '#5da3cc' });
  } else if (fx === 'drip' && frame % 30 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: 0, vy: 3 + Math.random(), life: 90, color: '#73eff7' });
  } else if (fx === 'sand' && frame % 3 === 0) {
    pushParticle({ x: -4, y: Math.random() * H, vx: 3 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.6, life: 80, color: '#c9a95e' });
  } else if (fx === 'dust' && frame % 18 === 0) {
    pushParticle({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.4, vy: -0.2, life: 60, color: '#8a83a3' });
  } else if ((fx === 'ember' || fx === 'ember2') && frame % (fx === 'ember2' ? 3 : 6) === 0) {
    pushParticle({
      x: Math.random() * W, y: H + 4,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.8,
      life: 40 + Math.random() * 30,
      color: Math.random() < 0.5 ? PALETTE.O : PALETTE.R,
    });
  } else if (fx === 'snow' && frame % 6 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.7 + Math.random() * 0.6, life: 110, color: '#f4f4f4' });
  } else if (fx === 'aurora') {
    if (frame % 6 === 0) {
      pushParticle({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.7 + Math.random() * 0.6, life: 110, color: '#f4f4f4' });
    }
    if (frame % 8 === 0) {
      pushParticle({ x: Math.random() * W, y: Math.random() * 60, vx: 1 + Math.random(), vy: 0, life: 50, color: Math.random() < 0.5 ? '#73eff7' : '#38b764' });
    }
  } else if (fx === 'bubble2' && frame % 8 === 0) {
    pushParticle({ x: Math.random() * W, y: H + 4, vx: (Math.random() - 0.5) * 0.4, vy: -0.8 - Math.random() * 0.7, life: 80, color: '#73eff7' });
  } else if (fx === 'miasma' && frame % 6 === 0) {
    pushParticle({
      x: Math.random() * W, y: H + 4,
      vx: (Math.random() - 0.5) * 0.4, vy: -0.7 - Math.random() * 0.8,
      life: 40 + Math.random() * 30,
      color: Math.random() < 0.5 ? PALETTE.p : PALETTE.P,
    });
  } else if (fx === 'hellfire') {
    if (frame % 3 === 0) {
      pushParticle({
        x: Math.random() * W, y: H + 4,
        vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random(),
        life: 40 + Math.random() * 30,
        color: Math.random() < 0.6 ? PALETTE.R : PALETTE.O,
      });
    }
  } else if (fx === 'feather' && frame % 16 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 0.8, vy: 0.4 + Math.random() * 0.4, life: 130, color: '#f4f4f4' });
  } else if (fx === 'star' && frame % 90 === 0) {
    pushParticle({ x: Math.random() * W, y: -4, vx: 2.5 + Math.random() * 2, vy: 1.5 + Math.random(), life: 30, color: '#f4f4f4' });
  } else if (fx === 'gstar' && frame % 30 === 0) {
    pushParticle({
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
    pushParticle({ x, y, vx: -Math.cos(a) * 2.2, vy: -Math.sin(a) * 2.2, life: 70, color: Math.random() < 0.3 ? '#8b4f8b' : '#566c86' });
  } else if (fx === 'dimension' && frame % 3 === 0) {
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 200;
    pushParticle({
      x: W / 2 + Math.cos(a) * d, y: H / 2 + Math.sin(a) * d,
      vx: Math.cos(a + Math.PI / 2) * 1.8, vy: Math.sin(a + Math.PI / 2) * 1.8,
      life: 40, color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
    });
  } else if (fx === 'thunder') {
    // よこなぐりの雨＋ときどき上空に遠雷（rainの強化版。かみなりは画面上部だけで実害なし）
    if (frame % 2 === 0) {
      pushParticle({ x: Math.random() * (W + 60) - 30, y: -4, vx: -2, vy: 7 + Math.random() * 2, life: 70, color: '#8a9fdf' });
    }
    if (Math.random() < 0.006) {
      flashTimer = Math.max(flashTimer, 5);
      bolts.push({ x1: Math.random() * W, y1: -10, x2: Math.random() * W, y2: 40 + Math.random() * 60, life: 6 });
      beep(70, 0.5, 'sawtooth', 0.03, 40);
    }
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

// モダンUI用: グラデーション＋グローの大見出し
function drawGlowTitle(text, y, size, c1, c2, glowColor) {
  ctx.save();
  ctx.font = `bold ${size}px "MS Gothic", monospace`;
  ctx.textBaseline = 'top';
  const w = ctx.measureText(text).width;
  const x = (W - w) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(text, x + 3, y + 4);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  const g = ctx.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// モダンUI用: 角丸パネルのパス
function pathRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// モダンUI用: ガラス風の半透明カード
function drawGlassCard(x, y, w, h, strokeColor = 'rgba(255,255,255,0.28)') {
  pathRoundRect(x, y, w, h, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawWeapon() {
  const weapon = WEAPONS[weaponIdx];
  const wlen = weaponLen(weapon);
  const pc = playerCenter();
  for (let b = 0; b < weapon.blades; b++) {
    const a = weaponAngle + (b * Math.PI * 2) / weapon.blades;
    const color = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2) % RAINBOW.length] : weapon.color;
    const edge = weapon.rainbow ? RAINBOW[Math.floor(gframe / 4 + b * 2 + 3) % RAINBOW.length] : weapon.edge;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.rotate(a);
    const kind = weapon.kind || 'blade';
    if (weapon.saber) {
      // ライトセーバー: 柄＋4層のグロー＋白いコア＋ちらつき＋先端スパーク
      const scol = weapon.rainbowSaber ? RAINBOW[Math.floor(gframe / 3 + b * 2) % RAINBOW.length] : weapon.saberColor;
      ctx.fillStyle = '#94b0c2';
      ctx.fillRect(8, -3, 10, 6);
      ctx.fillStyle = '#566c86';
      ctx.fillRect(12, -3, 2, 6);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(16, -2, 2, 4);
      const flick = 1 + Math.sin(gframe * 0.9 + b * 2) * 0.15;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = scol;
      ctx.fillRect(18, (-weapon.width / 2 - 6) * flick, wlen - 18, (weapon.width + 12) * flick);
      ctx.globalAlpha = 0.45;
      ctx.fillRect(18, -weapon.width / 2 - 2, wlen - 16, weapon.width + 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = scol;
      ctx.fillRect(18, -weapon.width / 2, wlen - 14, weapon.width);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(18, -1, wlen - 15, 2);
      if (Math.random() < 0.6) {
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(wlen + Math.random() * 5, -2 + Math.random() * 4, 2, 2);
      }
    } else if (kind === 'club') {
      // こん棒・鉄棒: 太い棒＋先が丸い
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      ctx.fillRect(14, -weapon.width / 2, wlen - 18, weapon.width);
      ctx.fillRect(wlen - 8, -weapon.width / 2 - 2, 8, weapon.width + 4);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 6, -weapon.width / 2 - 1, 4, 2);
    } else if (kind === 'chain') {
      // モーニングスター・鉄球: 鎖＋トゲつき鉄球
      ctx.fillStyle = '#94b0c2';
      for (let d = 12; d < wlen - weapon.ballR; d += 7) ctx.fillRect(d, -1, 4, 3);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(wlen, 0, weapon.ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = edge;
      for (let s = 0; s < 6; s++) {
        const sa = (Math.PI * 2 * s) / 6 + gframe * 0.1;
        ctx.fillRect(wlen + Math.cos(sa) * weapon.ballR - 1, Math.sin(sa) * weapon.ballR - 1, 3, 3);
      }
    } else if (kind === 'trident') {
      // 三又の鉾: 柄＋3本の穂先
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, wlen - 22, 4);
      ctx.fillStyle = color;
      ctx.fillRect(wlen - 16, -6, 4, 12);
      ctx.fillRect(wlen - 12, -7, 12, 3);
      ctx.fillRect(wlen - 12, -1, 14, 3);
      ctx.fillRect(wlen - 12, 5, 12, 3);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 2, -1, 4, 3);
    } else if (kind === 'scimitar') {
      // 半月刀: 曲がった刃
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      for (let d = 0; d < wlen - 16; d += 3) {
        const curve = Math.sin((d / (wlen - 16)) * Math.PI) * 7;
        ctx.fillRect(14 + d, -weapon.width / 2 - curve, 4, weapon.width);
      }
      ctx.fillStyle = edge;
      for (let d = 0; d < wlen - 16; d += 3) {
        const curve = Math.sin((d / (wlen - 16)) * Math.PI) * 7;
        ctx.fillRect(14 + d, -weapon.width / 2 - curve, 4, 2);
      }
    } else if (kind === 'bow') {
      // 弓・クロスボウ: 弧＋弦
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wlen - 14, 0, 12, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wlen - 14 + Math.cos(-Math.PI / 2.2) * 12, Math.sin(-Math.PI / 2.2) * 12);
      ctx.lineTo(wlen - 14 + Math.cos(Math.PI / 2.2) * 12, Math.sin(Math.PI / 2.2) * 12);
      ctx.stroke();
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, wlen - 20, 4);
    } else if (kind === 'sling') {
      // パチンコ: Y字の棒
      ctx.fillStyle = color;
      ctx.fillRect(8, -2, wlen - 18, 4);
      ctx.fillRect(wlen - 12, -8, 4, 8);
      ctx.fillRect(wlen - 12, 0, 4, 8);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wlen - 10, -7);
      ctx.lineTo(wlen - 4, 0);
      ctx.lineTo(wlen - 10, 7);
      ctx.stroke();
    } else if (kind === 'gun') {
      // マシンガン・レーザー: 銃身＋マズルフラッシュ
      ctx.fillStyle = color;
      ctx.fillRect(10, -3, wlen - 14, 6);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 8, -2, 8, 4);
      ctx.fillStyle = '#743f39';
      ctx.fillRect(14, 3, 5, 7);
      if (shootTimer > (weapon.shoot.interval - 3)) {
        ctx.fillStyle = '#ffcd75';
        ctx.fillRect(wlen, -4, 6, 8);
      }
    } else if (kind === 'cannon') {
      // 大砲: 太い砲身
      ctx.fillStyle = color;
      ctx.fillRect(8, -weapon.width / 2, wlen - 10, weapon.width);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 6, -weapon.width / 2 - 2, 6, weapon.width + 4);
      if (shootTimer > (weapon.shoot.interval - 4)) {
        ctx.fillStyle = '#ef7d57';
        ctx.fillRect(wlen, -5, 8, 10);
      }
    } else if (kind === 'boomer') {
      // ブーメラン: くの字
      ctx.fillStyle = color;
      ctx.fillRect(wlen - 18, -2, 16, 4);
      ctx.fillRect(wlen - 6, -14, 4, 16);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 18, -2, 16, 1);
    } else if (kind === 'whip') {
      // ムチ: 波打つ革ひも＋光る先端
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      for (let d = 12; d <= wlen; d += 6) ctx.lineTo(d, Math.sin(d * 0.22 + gframe * 0.45) * 5);
      ctx.stroke();
      ctx.fillStyle = edge;
      const ty = Math.sin(wlen * 0.22 + gframe * 0.45) * 5;
      ctx.fillRect(wlen - 2, ty - 2, 5, 5);
    } else if (kind === 'axe') {
      // バトルアックス: 長い柄＋両側に大きな刃
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, wlen - 12, 4);
      ctx.fillStyle = color;
      ctx.fillRect(wlen - 20, -13, 12, 26);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 9, -13, 3, 26);
      ctx.fillStyle = '#566c86';
      ctx.fillRect(wlen - 20, -2, 12, 4);
    } else if (kind === 'scytheW') {
      // しにがみのカマ: 長い柄＋大きく曲がった刃
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, wlen - 14, 4);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(wlen - 14, -8, 15, -Math.PI * 0.45, Math.PI * 0.55);
      ctx.stroke();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wlen - 14, -8, 17, -Math.PI * 0.45, Math.PI * 0.55);
      ctx.stroke();
    } else if (kind === 'drill') {
      // ドリルランス: 回転して見えるしましま＋とがった先端
      ctx.fillStyle = '#566c86';
      ctx.fillRect(8, -4, 10, 8);
      for (let d = 18; d < wlen; d += 5) {
        const wdt = Math.max(1, (weapon.width + 4) * (1 - (d - 18) / (wlen - 18)));
        ctx.fillStyle = (Math.floor(d / 5 + gframe / 3) % 2 === 0) ? color : edge;
        ctx.fillRect(d, -wdt / 2, 5, wdt);
      }
    } else if (kind === 'wand') {
      // まほうのつえ: ほそい杖＋回る星＋キラキラ
      ctx.fillStyle = color;
      ctx.fillRect(8, -2, wlen - 12, 4);
      ctx.save();
      ctx.translate(wlen - 2, 0);
      ctx.rotate(gframe * 0.15);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
      ctx.restore();
      if (Math.random() < 0.5) {
        ctx.fillStyle = RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
        ctx.fillRect(wlen - 8 + Math.random() * 12, -8 + Math.random() * 16, 2, 2);
      }
    } else if (kind === 'tesla') {
      // テスラコイル: 棒の先の電気玉からバチバチ
      ctx.fillStyle = color;
      ctx.fillRect(8, -2, wlen - 14, 4);
      ctx.fillStyle = '#73eff7';
      ctx.beginPath();
      ctx.arc(wlen - 5, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath();
      ctx.arc(wlen - 5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      if (Math.random() < 0.7) {
        ctx.strokeStyle = '#73eff7';
        ctx.lineWidth = 1;
        const za = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wlen - 5 + Math.cos(za) * 7, Math.sin(za) * 7);
        ctx.lineTo(wlen - 5 + Math.cos(za) * 14, Math.sin(za) * 14);
        ctx.stroke();
      }
    } else if (kind === 'ninja') {
      // 忍者刀: 短くて黒い刃
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      ctx.fillRect(14, -weapon.width / 2, wlen - 14, weapon.width);
      ctx.fillStyle = edge;
      ctx.fillRect(14, -weapon.width / 2, wlen - 14, 1);
    } else if (kind === 'bombH') {
      // ばくだん: 棒の先の黒玉＋バチバチ光る導火線
      ctx.fillStyle = '#a77b5b';
      ctx.fillRect(8, -2, wlen - 18, 4);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(wlen - 6, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(wlen - 8, -3, 3, 3);
      ctx.fillStyle = Math.random() < 0.5 ? '#ffcd75' : '#ef7d57';
      ctx.fillRect(wlen - 4 + Math.random() * 3, -12 + Math.random() * 3, 3, 3);
    } else if (kind === 'launcher') {
      // ミサイルランチャー: 2連チューブ＋のぞくミサイル
      ctx.fillStyle = color;
      ctx.fillRect(10, -6, wlen - 14, 12);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(wlen - 6, -5, 4, 4);
      ctx.fillRect(wlen - 6, 1, 4, 4);
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 4, -4, 3, 2);
      ctx.fillRect(wlen - 4, 2, 3, 2);
    } else if (kind === 'flamer') {
      // かえんほうしゃき: ノズル＋タンク＋ゆらめく火
      ctx.fillStyle = color;
      ctx.fillRect(10, -3, wlen - 16, 6);
      ctx.fillStyle = '#1a1c2c';
      ctx.fillRect(wlen - 6, -2, 6, 4);
      ctx.fillStyle = '#b13e53';
      ctx.fillRect(12, 4, 8, 6);
      ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
      ctx.fillRect(wlen, -3 + Math.random() * 4, 4 + Math.random() * 4, 3);
    } else if (kind === 'yoyo') {
      // ハイパーヨーヨー: ひも＋回転する円盤
      ctx.strokeStyle = '#f4f4f4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(wlen - 6, 0);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(wlen, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wlen, 0, 5, gframe * 0.4, gframe * 0.4 + Math.PI);
      ctx.stroke();
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 1, -1, 3, 3);
    } else if (kind === 'fist') {
      // ロケットパンチ: 腕（太い柄）＋先端の角丸矩形の拳
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -3, wlen - 26, 6);          // 腕
      ctx.fillStyle = '#94b0c2';                   // 手首のカフ
      ctx.fillRect(wlen - 20, -6, 5, 12);
      ctx.fillStyle = color;                       // こぶし本体（角丸矩形）
      ctx.beginPath();
      const fx0 = wlen - 15, fw = 15, fh = weapon.width + 4, r = 4;
      ctx.moveTo(fx0 + r, -fh / 2);
      ctx.arcTo(fx0 + fw, -fh / 2, fx0 + fw, fh / 2, r);
      ctx.arcTo(fx0 + fw, fh / 2, fx0, fh / 2, r);
      ctx.arcTo(fx0, fh / 2, fx0, -fh / 2, r);
      ctx.arcTo(fx0, -fh / 2, fx0 + fw, -fh / 2, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = edge;                      // 指節ライン
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        const kx = fx0 + (fw / 4) * k;
        ctx.beginPath();
        ctx.moveTo(kx, -fh / 2 + 2);
        ctx.lineTo(kx, fh / 2 - 2);
        ctx.stroke();
      }
    } else if (kind === 'boltrod') {
      // てんていのいかずち: ジグザグの折れ線で描く稲妻ブレード（根元→先端で2色）
      ctx.fillStyle = '#94b0c2';                   // 短い柄
      ctx.fillRect(8, -2, 10, 4);
      const seg = [
        [18, 0], [18 + (wlen - 18) * 0.28, -8],
        [18 + (wlen - 18) * 0.5, 5], [18 + (wlen - 18) * 0.74, -6],
        [wlen, 0],
      ];
      // 外側グロー
      ctx.strokeStyle = 'rgba(255, 233, 74, 0.35)';
      ctx.lineWidth = weapon.width + 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let s = 1; s < seg.length; s++) ctx.lineTo(seg[s][0], seg[s][1]);
      ctx.stroke();
      // 本体（各セグメントを根元色→先端白でグラデーション風に描く）
      for (let s = 0; s < seg.length - 1; s++) {
        const t = s / (seg.length - 2);
        ctx.strokeStyle = t < 0.5 ? color : '#f4f4f4';
        ctx.lineWidth = weapon.width - Math.round(t * 3);
        ctx.beginPath();
        ctx.moveTo(seg[s][0], seg[s][1]);
        ctx.lineTo(seg[s + 1][0], seg[s + 1][1]);
        ctx.stroke();
      }
      // 芯の白ライン
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let s = 1; s < seg.length; s++) ctx.lineTo(seg[s][0], seg[s][1]);
      ctx.stroke();
    } else if (kind === 'wavegun') {
      // はどうほう: 極太の砲身＋多重エネルギーリングで脈動する砲口（最終最強の波動砲）
      const half = weapon.width / 2;
      // 溜めが完了に近づくほど砲口が高エネルギーに（発射直前18Fで最大）
      const charge = (weapon.shoot && shootTimer < 18) ? (18 - shootTimer) / 18 : 0;
      // 砲身の外周グロー
      ctx.fillStyle = 'rgba(65, 166, 246, 0.35)';
      ctx.fillRect(6, -half - 3, wlen - 4, weapon.width + 6);
      // 砲身本体
      ctx.fillStyle = color;
      ctx.fillRect(8, -half, wlen - 10, weapon.width);
      // 上面のプレートハイライト
      ctx.fillStyle = '#41a6f6';
      ctx.fillRect(8, -half, wlen - 10, 3);
      // 中心を走る明滅エネルギー導線
      ctx.globalAlpha = 0.6 + Math.sin(gframe * 0.35) * 0.35;
      ctx.fillStyle = edge;
      ctx.fillRect(12, -2, wlen - 22, 4);
      ctx.globalAlpha = 1;
      // 砲口の分厚いリム
      ctx.fillStyle = edge;
      ctx.fillRect(wlen - 8, -half - 4, 8, weapon.width + 8);
      // 多重の発光リング（脈動しながら3枚重ね。溜め完了間際は膨らむ）
      for (let ri = 0; ri < 3; ri++) {
        const pr = 7 + ri * 5 + Math.sin(gframe * 0.3 - ri) * 2.5 + charge * 8;
        ctx.strokeStyle = ri === 0 ? '#f4f4f4' : edge;
        ctx.lineWidth = ri === 0 ? 3 : 2;
        ctx.globalAlpha = (0.3 + Math.sin(gframe * 0.3 - ri) * 0.22) * (0.6 + charge * 0.4) + (ri === 0 ? 0.2 : 0);
        ctx.beginPath();
        ctx.arc(wlen, 0, pr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // 溜め完了間際は砲口が白く明滅
      if (weapon.shoot && shootTimer < 10) {
        ctx.fillStyle = (gframe % 4 < 2) ? '#f4f4f4' : '#73eff7';
        ctx.beginPath();
        ctx.arc(wlen, 0, 5 + charge * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // 通常の刃（剣・槍など）
      ctx.fillStyle = '#743f39';
      ctx.fillRect(8, -2, 8, 4);
      ctx.fillStyle = color;
      ctx.fillRect(14, -weapon.width / 2, wlen - 14, weapon.width);
      ctx.fillStyle = edge;
      ctx.fillRect(14, -weapon.width / 2, wlen - 14, Math.max(1, weapon.width / 4));
      ctx.fillRect(wlen - 3, -weapon.width / 2 - 1, 4, weapon.width + 2);
      if (kind === 'spear') {
        ctx.fillStyle = edge;
        ctx.fillRect(wlen - 8, -weapon.width / 2 - 3, 8, weapon.width + 6);
      }
    }
    if (weapon.flame && state === 'playing') {
      for (let i = 0; i < 4; i++) {
        const fx2 = 18 + Math.random() * (wlen - 22);
        ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
        ctx.fillRect(fx2, -weapon.width / 2 - 3 - Math.random() * 3, 2, 3);
      }
    }
    if (weapon.lightning && state === 'playing' && Math.random() < 0.5) {
      const fx2 = 18 + Math.random() * (wlen - 22);
      ctx.fillStyle = '#ffcd75';
      ctx.fillRect(fx2, weapon.width / 2 + Math.random() * 4, 2, 2);
    }
    if (weapon.ice && state === 'playing' && Math.random() < 0.4) {
      const fx2 = 18 + Math.random() * (wlen - 22);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(fx2, -weapon.width / 2 - 2 - Math.random() * 3, 1, 1);
    }
    ctx.restore();
  }

  // じくうのカタナ・ムラクモ: delay フレーム前の角度に半透明の残像刃を重ねる
  if (weapon.echo && state === 'playing' && angleHist.length > weapon.echo.delay) {
    const ea = angleHist[angleHist.length - 1 - weapon.echo.delay];
    const scol = weapon.saberColor || weapon.color;
    for (let b = 0; b < weapon.blades; b++) {
      const a = ea + (b * Math.PI * 2) / weapon.blades;
      ctx.save();
      ctx.translate(pc.x, pc.y);
      ctx.rotate(a);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = scol;
      ctx.fillRect(18, -weapon.width / 2 - 3, wlen - 16, weapon.width + 6);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = scol;
      ctx.fillRect(18, -weapon.width / 2, wlen - 14, weapon.width);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(18, -1, wlen - 15, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ギャラクシーツインリング: 半径 r の円周上を独立回転する光る刃（本体の刃とは別描画）
  if (weapon.orbitals && state === 'playing') {
    const orb = weapon.orbitals;
    for (let k = 0; k < orb.count; k++) {
      const a = orbitAngle + (k * Math.PI * 2) / orb.count;
      const ox = pc.x + Math.cos(a) * orb.r;
      const oy = pc.y + Math.sin(a) * orb.r;
      const scol = weapon.rainbow ? RAINBOW[Math.floor(gframe / 3 + k * 2) % RAINBOW.length] : (weapon.saberColor || weapon.color);
      const half = weapon.width + 4;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(a + Math.PI / 2); // 進行方向に刃を立てる
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = scol;
      ctx.fillRect(-half, -half, half * 2, half * 2);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = scol;
      ctx.fillRect(-4, -half, 8, half * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(-1, -half + 2, 2, half * 2 - 4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 周回リングのうっすらした軌跡
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = weapon.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pc.x, pc.y, orb.r, 0, Math.PI * 2);
    ctx.stroke();
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
    } else if (deco === 'thundercloud') {
      // らんうん（乱雲）と ときどき 赤く ひかる いなびかり
      ctx.fillStyle = 'rgba(26,28,44,0.55)';
      ctx.fillRect(x - 6, y, 18, 5);
      ctx.fillRect(x - 2, y - 3, 12, 3);
      // 雲が赤くうなる（雷龍の空）
      if ((i + Math.floor(gframe / 18)) % 5 === 0) {
        ctx.fillStyle = 'rgba(255,46,77,0.22)';
        ctx.fillRect(x - 7, y - 1, 20, 7);
      }
      if ((i + Math.floor(gframe / 20)) % 6 === 0) {
        ctx.fillStyle = '#ff2e4d';
        ctx.fillRect(x + 3, y + 5, 2, 5);
        ctx.fillRect(x + 1, y + 9, 2, 4);
        ctx.fillStyle = '#ff77a8';
        ctx.fillRect(x + 4, y + 5, 1, 4);
      }
    }
  }

  drawMegaDeco(st.mega);
}

// 巨大ランドマーク演出: ステージのmegaフィールド(type)に応じて画面中央付近に描き分ける
function drawMegaDeco(mega) {
  if (!mega) return;
  const cx = W / 2;
  if (mega.type === 'silhouette') {
    // 遠景の巨大シルエット（山脈・遺跡・巨木など）
    const cy = H * 0.5;
    ctx.fillStyle = mega.color;
    ctx.beginPath();
    ctx.moveTo(cx - 170, cy + 70);
    ctx.lineTo(cx - 120, cy - 40);
    ctx.lineTo(cx - 70, cy + 10);
    ctx.lineTo(cx - 10, cy - 90);
    ctx.lineTo(cx + 50, cy - 10);
    ctx.lineTo(cx + 110, cy - 60);
    ctx.lineTo(cx + 170, cy + 40);
    ctx.lineTo(cx + 170, cy + 80);
    ctx.lineTo(cx - 170, cy + 80);
    ctx.closePath();
    ctx.fill();
  } else if (mega.type === 'orb') {
    // 脈動する巨大な発光オーブ
    const cy = H * 0.36;
    const pulse = 30 + Math.sin(gframe * 0.04) * 6;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, mega.color);
    grad.addColorStop(1, mega.color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (mega.type === 'beam') {
    // 天地を貫く巨大な光の柱
    const sway = Math.sin(gframe * 0.02) * 16;
    ctx.fillStyle = mega.color + '2e';
    ctx.beginPath();
    ctx.moveTo(cx - 46 + sway, -10); ctx.lineTo(cx + 46 + sway, -10);
    ctx.lineTo(cx + 12, H + 10); ctx.lineTo(cx - 12, H + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mega.color + '55';
    ctx.beginPath();
    ctx.moveTo(cx - 16 + sway, -10); ctx.lineTo(cx + 16 + sway, -10);
    ctx.lineTo(cx + 5, H + 10); ctx.lineTo(cx - 5, H + 10);
    ctx.closePath();
    ctx.fill();
  } else if (mega.type === 'vortex') {
    // 中心に吸いこまれる渦（coreがあれば中心を塗りつぶす）
    const cy = H / 2;
    if (mega.core) {
      ctx.fillStyle = mega.core;
      ctx.beginPath();
      ctx.arc(cx, cy, 26 + Math.sin(gframe * 0.05) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = mega.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 26 + Math.sin(gframe * 0.05) * 3, 0, Math.PI * 2);
    ctx.stroke();
    for (let r = 0; r < 3; r++) {
      const a0 = gframe * (0.02 + r * 0.006);
      ctx.strokeStyle = (mega.rainbow ? RAINBOW[(r * 2 + Math.floor(gframe / 10)) % RAINBOW.length] : mega.color) + '55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + r * 16, a0, a0 + Math.PI * 1.4);
      ctx.stroke();
    }
  } else if (mega.type === 'ring') {
    // 中心を回る複数のリング（rainbowなら虹色が巡回）
    const cy = H / 2;
    for (let r = 0; r < 3; r++) {
      const col = mega.rainbow
        ? RAINBOW[(r * 2 + Math.floor(gframe / 10)) % RAINBOW.length]
        : (r % 2 === 0 ? mega.color : (mega.color2 || mega.color));
      ctx.strokeStyle = col + '44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 55 + r * 45 + Math.sin(gframe * 0.03 + r) * 8, 0, Math.PI * 2);
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
  } else if (f.kind === 'fire') {
    // ブレスの炎: ゆらめきながら飛ぶ火のかたまり
    const fs = 4 + Math.random() * 4;
    ctx.fillStyle = Math.random() < 0.5 ? '#ef7d57' : '#ffcd75';
    ctx.beginPath();
    ctx.arc(f.x + (Math.random() - 0.5) * 3, f.y + (Math.random() - 0.5) * 3, fs, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b13e53';
    ctx.beginPath();
    ctx.arc(f.x, f.y, fs * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.kind === 'web') {
    // クモの糸のかたまり: 白い放射状の糸
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.ang + gframe * 0.05);
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 3);
    }
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(-2, -2, 4, 4);
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
    ctx.fillStyle = shotColor(f);
    ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 4, 4);
  } else if (f.kind === 'arrow' || f.kind === 'javelin') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    ctx.fillStyle = f.color || (f.kind === 'javelin' ? '#94b0c2' : '#a77b5b');
    ctx.fillRect(-8, -1, 12, 2);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(4, -2, 5, 4);
    ctx.restore();
  } else if (f.kind === 'bullet') {
    ctx.fillStyle = shotColor(f);
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
    ctx.fillStyle = f.color || '#73eff7';
    ctx.fillRect(-9, -1, 18, 3);
    ctx.restore();
  } else if (f.kind === 'boomerang') {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = shotColor(f);
    ctx.fillRect(-7, -2, 12, 4);
    ctx.fillRect(1, -10, 4, 12);
    ctx.restore();
  } else if (f.kind === 'shuriken') {
    // 手裏剣: 回転する十字の刃
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(-7, -2, 14, 4);
    ctx.fillRect(-2, -7, 4, 14);
    ctx.fillStyle = '#333c57';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  } else if (f.kind === 'bomb') {
    // 爆弾: 黒玉＋点滅する導火線（消える直前は赤く点滅）
    const danger = f.life < 15 && Math.floor(gframe / 3) % 2 === 0;
    ctx.fillStyle = danger ? '#b13e53' : '#1a1c2c';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(f.x - 3, f.y - 4, 3, 3);
    ctx.fillStyle = Math.random() < 0.5 ? '#ffcd75' : '#ef7d57';
    ctx.fillRect(f.x + 2 + Math.random() * 3, f.y - 12 + Math.random() * 3, 3, 3);
  } else if (f.kind === 'orb') {
    // まほうの弾: ピンクに光る玉
    ctx.fillStyle = 'rgba(255, 119, 168, 0.35)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = f.color || '#ff77a8';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
  } else if (f.kind === 'missile') {
    // ホーミングミサイル: 進行方向を向く弾体＋うしろに炎
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    ctx.fillStyle = '#94b0c2';
    ctx.fillRect(-7, -3, 12, 6);
    ctx.fillStyle = '#b13e53';
    ctx.fillRect(5, -2, 4, 4);
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y;
    ctx.fillRect(-11, -2, 4, 4);
    ctx.restore();
  } else if (f.kind === 'rocketfist') {
    // 飛び拳ロケット: 進行方向を向いた拳（角丸矩形＋指節線＋後端カフ）
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    ctx.fillStyle = Math.random() < 0.5 ? PALETTE.O : PALETTE.Y; // 後方の噴射
    ctx.fillRect(-12, -2, 4, 4);
    ctx.fillStyle = '#94b0c2';                                   // 手首のカフ
    ctx.fillRect(-8, -5, 4, 10);
    ctx.fillStyle = f.color || '#ef7d57';                        // こぶし本体
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.arcTo(9, -6, 9, 6, 4);
    ctx.arcTo(9, 6, -6, 6, 4);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffcd75';                                 // 指節ライン
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-1 + k * 3, -5);
      ctx.lineTo(-1 + k * 3, 5);
      ctx.stroke();
    }
    ctx.restore();
  } else if (f.kind === 'wave') {
    // はどうほう: 巨大な波動弾。後方へ伸びるテール＋外周オーラ＋三日月アーク多重＋白熱コア
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(Math.atan2(f.vy, f.vx));
    const base = f.color || '#73eff7';
    const pulse = 1 + Math.sin(gframe * 0.5) * 0.15;
    // 後方へ伸びるエネルギーテール
    ctx.fillStyle = 'rgba(65, 166, 246, 0.28)';
    ctx.beginPath();
    ctx.moveTo(-4, -11 * pulse);
    ctx.lineTo(-36, 0);
    ctx.lineTo(-4, 11 * pulse);
    ctx.closePath();
    ctx.fill();
    // 外周オーラ（大きな薄い円）
    ctx.fillStyle = 'rgba(115, 239, 247, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // 三日月アーク（外→内で色を変え、太→細で多重）
    ctx.strokeStyle = 'rgba(65, 166, 246, 0.5)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(-6, 0, 22 * pulse, -Math.PI / 2.3, Math.PI / 2.3);
    ctx.stroke();
    ctx.strokeStyle = base;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(-3, 0, 18 * pulse, -Math.PI / 2.15, Math.PI / 2.15);
    ctx.stroke();
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-1, 0, 14 * pulse, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // 白熱コア（水色ハロー＋白い芯）
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 落雷の予告マーカー: 地面に点滅する円＋稲妻マーク
function drawThunderStrikes() {
  for (const s of strikes) {
    const blink = Math.floor(s.t / 4) % 2 === 0;
    if (s.storm) {
      // 巨大な赤い予告リング（二重）＋赤いグロー
      const r = 30;
      ctx.strokeStyle = blink ? '#ff2e4d' : 'rgba(255,46,77,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = blink ? 'rgba(255,119,168,0.7)' : 'rgba(255,119,168,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = blink ? '#fff' : '#ff2e4d';
      ctx.fillRect(s.x - 2, s.y - 10, 4, 11);
      ctx.fillRect(s.x - 5, s.y - 3, 4, 4);
      ctx.fillRect(s.x + 1, s.y + 4, 4, 4);
    } else {
      ctx.strokeStyle = blink ? '#ffcd75' : 'rgba(255,205,117,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = blink ? '#f4f4f4' : '#ffcd75';
      ctx.fillRect(s.x - 1, s.y - 7, 3, 8);
      ctx.fillRect(s.x - 3, s.y - 2, 3, 3);
      ctx.fillRect(s.x + 1, s.y + 3, 3, 3);
    }
  }
}

// いかずちのかご: 電気フェンス。予告中は明滅する破線、通電後は太い電流＋うねる稲妻
function drawFences() {
  for (const fc of fences) {
    const teling = fc.t > 0;
    const dx = fc.x2 - fc.x1, dy = fc.y2 - fc.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // 線分の法線（うねりの方向）
    if (teling) {
      // 予告: 明滅する細い水色の線（ダメージなし）
      const blink = Math.floor(fc.t / 4) % 2 === 0;
      ctx.strokeStyle = blink ? 'rgba(115,239,247,0.9)' : 'rgba(115,239,247,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(fc.x1, fc.y1);
      ctx.lineTo(fc.x2, fc.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 通電: 青いグロー→太い電流→白い芯＋ジグザグに走る稲妻
      const segs = Math.max(3, Math.floor(len / 26));
      const zig = (col, lw, amp) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(fc.x1, fc.y1);
        for (let i = 1; i < segs; i++) {
          const u = i / segs;
          const off = (Math.random() - 0.5) * amp;
          ctx.lineTo(fc.x1 + dx * u + nx * off, fc.y1 + dy * u + ny * off);
        }
        ctx.lineTo(fc.x2, fc.y2);
        ctx.stroke();
      };
      ctx.globalAlpha = fc.live < 30 ? fc.live / 30 : 1; // 消える直前はフェード
      zig('rgba(59,93,201,0.55)', 8, 0);   // 青いグロー
      zig('#73eff7', 4, 5);                // 水色の電流
      zig('#f4f4f4', 1.5, 5);              // 白い芯
      ctx.globalAlpha = 1;
    }
  }
}

// ばんらいノヴァ: 広がる電気リング。切れ目（逃げ道）は描かない
function drawNovas() {
  for (const nv of novas) {
    if (nv.delay > 0) continue;
    if (nv.tel > 0) {
      // 予告: 中心で脈打つ紫のマーカー
      const blink = Math.floor(nv.tel / 4) % 2 === 0;
      const pr = 10 + Math.sin(nv.tel * 0.3) * 4;
      ctx.strokeStyle = blink ? '#b567b5' : 'rgba(181,103,181,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(nv.cx, nv.cy, pr, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    // 拡大するリング（切れ目を除いた円弧）を3層で描く
    const a0 = nv.gapAng + nv.gapHalf;
    const a1 = nv.gapAng - nv.gapHalf + Math.PI * 2;
    ctx.globalAlpha = Math.max(0, 1 - nv.r / nv.rMax);
    ctx.strokeStyle = 'rgba(181,103,181,0.5)';
    ctx.lineWidth = 11;
    ctx.beginPath(); ctx.arc(nv.cx, nv.cy, nv.r, a0, a1); ctx.stroke();
    ctx.strokeStyle = '#73eff7';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(nv.cx, nv.cy, nv.r, a0, a1); ctx.stroke();
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(nv.cx, nv.cy, nv.r, a0, a1); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// らいこうレーザー: 収束予告の細線→極太の3層雷ビーム（口元から画面外へ）
function drawBossBeams() {
  for (const e of enemies) {
    if (!e.act || e.act.kind !== 'beam') continue;
    const a = e.act;
    if (a.ox === undefined) continue;
    const bcol = a.bcol || ['#3b5dc9', '#73eff7', '#ffcd75'];
    const L = 720;
    if (a.beamOn && a.beamAng !== undefined) {
      // 発射中: 青グロー→水色の本体→白い芯
      const ex = a.ox + Math.cos(a.beamAng) * L;
      const ey = a.oy + Math.sin(a.beamAng) * L;
      const line = (col, lw) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(ex, ey); ctx.stroke();
      };
      line('rgba(59,93,201,0.5)', 34);
      line(bcol[1], 18);
      line('#f4f4f4', 7);
      // 口元のまばゆい光
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath(); ctx.arc(a.ox, a.oy, 10, 0, Math.PI * 2); ctx.fill();
    } else if (a.aimAng !== undefined && a.beamOn === false) {
      // 予告: プレイヤーを追う細い明滅線（収束の進み具合で濃くなる）
      const ex = a.ox + Math.cos(a.aimAng) * L;
      const ey = a.oy + Math.sin(a.aimAng) * L;
      const tf = a.telFrac || 0;
      const blink = Math.floor(e.act.t / 3) % 2 === 0;
      ctx.strokeStyle = blink ? `rgba(115,239,247,${0.35 + tf * 0.5})` : 'rgba(115,239,247,0.2)';
      ctx.lineWidth = 1 + tf * 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      // 口元に集まる光
      ctx.fillStyle = bcol[2];
      ctx.beginPath(); ctx.arc(a.ox, a.oy, 3 + tf * 7, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function render() {
  ctx.save();
  // 画面シェイクはプレイ中のみ（ゲームオーバー画面では揺らさない）
  if (shakeTimer > 0 && state === 'playing') {
    const s = Math.min(shakeTimer, 8);
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  if (state === 'zukan') { renderZukan(); ctx.restore(); return; }

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

  // 白い斬撃のきらめき（ズバッ！）
  for (const s of slashes) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ang);
    ctx.globalAlpha = s.life / s.maxLife;
    const len = (10 + (s.maxLife - s.life) * 4) * (s.scale || 1); // 一瞬で伸びる
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-len, -2, len * 2, 4);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(-len * 0.6, -1, len * 1.2, 2);
    ctx.rotate(0.55);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(-len * 0.55, -1, len * 1.1, 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

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

  // 落雷の予告マーカー（ボルトより先に地面へ描く）
  drawThunderStrikes();
  // ライリュウの設置ハザード（地面レイヤー: 電気フェンス・ばんらいノヴァのリング）
  drawFences();
  drawNovas();
  // セイリュウの氷柱・ティアマトの混沌の渦（地面レイヤー）
  drawFrost();
  drawVortexes();

  // 雷の連鎖ボルト（武器のチェイン雷はそのまま。ライリュウの雷嵐だけ巨大な赤い稲妻に分岐）
  for (const b of bolts) {
    if (b.storm) {
      // 太く赤い稲妻＋白い芯。ジグザグの折れ点を増やして「うねる巨大な雷」に
      const cols = ['#ff003c', '#ff2e4d', '#ff77a8'];
      ctx.strokeStyle = cols[(Math.random() * cols.length) | 0];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      const m1x = b.x1 + (b.x2 - b.x1) * 0.35 + (Math.random() - 0.5) * 28;
      const m1y = b.y1 + (b.y2 - b.y1) * 0.35;
      const m2x = b.x1 + (b.x2 - b.x1) * 0.7 + (Math.random() - 0.5) * 28;
      const m2y = b.y1 + (b.y2 - b.y1) * 0.7;
      ctx.lineTo(m1x, m1y);
      ctx.lineTo(m2x, m2y);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      // 白い芯
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(m1x, m1y);
      ctx.lineTo(m2x, m2y);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    } else {
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
    // 被弾直後（白フラッシュ中）は必ず描き、その後は点滅
    if (!e.boss && e.hitTimer > 0 && e.hitTimer <= 14 && Math.floor(frame / 3) % 2 === 0) continue;
    const sname = e.boss ? e.type.sprite : e.sprite;
    const spr = SPRITES[sname];
    const scale = e.size / spr.length;
    const offX = (e.size - spr[0].length * scale) / 2;
    const bob = e.boss ? Math.sin(gframe * 0.08) * 3 : 0;
    // ボスのパレット差し替え（第2形態のジギムントは e.remap を持つ）。
    // 変身演出中は旧パレット/新パレットを数フレームごとに切り替えて明滅させる
    let bossRemap = e.boss
      ? ((e.raged && e.type.rageRemap && !e.form2) ? e.type.rageRemap : (e.remap || e.type.remap))
      : (e.remap || null);
    if (e.boss && e.transforming > 0) {
      bossRemap = (Math.floor(e.transforming / 6) % 2 === 0) ? (e.type.form2Remap || SIGMUND_FORM2_REMAP) : null;
    }
    // ボスのアクション演出: のけぞり・しゃがみこみ・震え・残像
    let dxv = 0, dyv = bob, sxv = 1, syv = 1;
    if (e.boss) {
      if (e.speedCharge > 0) {
        // 加速のため中はブルブル震える
        dxv += (Math.random() - 0.5) * 5;
        dyv += (Math.random() - 0.5) * 4;
      }
      // 崩壊演出中: だんだん激しく震える
      if (e.dying) {
        const q = Math.min(10, 2 + e.dying / 55);
        dxv += (Math.random() - 0.5) * q;
        dyv += (Math.random() - 0.5) * q * 0.7;
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
            drawSprite(sname, a.trail[ti].x + offX, a.trail[ti].y + bob, scale, bossRemap);
          }
          ctx.globalAlpha = 1;
        }
      }
    }
    // 崩壊フェーズでは体が透けはじめ、チラチラと明滅する
    if (e.boss && e.dying > SIGMUND_RUMBLE) {
      ctx.globalAlpha = Math.max(0.35, 1 - (e.dying - SIGMUND_RUMBLE) / 520) * (Math.floor(gframe / 3) % 2 === 0 ? 1 : 0.8);
    }
    if (sxv !== 1 || syv !== 1) {
      const cx0 = e.x + e.size / 2 + dxv;
      const cy0 = e.y + e.size / 2 + dyv;
      ctx.save();
      ctx.translate(cx0, cy0);
      ctx.scale(sxv, syv);
      ctx.translate(-cx0, -cy0);
      drawSprite(sname, e.x + offX + dxv, e.y + dyv, scale, bossRemap, true);
      ctx.restore();
    } else {
      drawSprite(sname, e.x + offX + dxv, e.y + dyv, scale, bossRemap, true);
    }
    ctx.globalAlpha = 1;
    // 崩壊中は体に赤白の亀裂が走る
    if (e.boss && e.dying > SIGMUND_RUMBLE) {
      for (let ci = 0; ci < 3; ci++) {
        const cxr = e.x + e.size * (0.2 + Math.random() * 0.6);
        const cyr = e.y + e.size * (0.15 + Math.random() * 0.6);
        ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(244,244,244,0.75)' : 'rgba(239,125,87,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cxr, cyr);
        ctx.lineTo(cxr + (Math.random() - 0.5) * 24, cyr + Math.random() * 20);
        ctx.lineTo(cxr + (Math.random() - 0.5) * 30, cyr + 20 + Math.random() * 20);
        ctx.stroke();
      }
    }
    // 当たった直後は白くフラッシュ（ズバッ！の視認性）
    if (e.hitTimer > 14) {
      ctx.fillStyle = 'rgba(244, 244, 244, 0.6)';
      ctx.fillRect(e.x + offX + dxv, e.y + dyv, spr[0].length * scale, spr.length * scale);
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
      // 弱点コア（虹色に光る球。ここをねらえ！）※崩壊演出中は消える
      if (e.type.gimmicks.includes('weakpoint') && !e.dying) {
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
      // 召喚された過去ボスは大バーに出さないので、頭上に小さなHPバーを描く
      if (e.summoned && e.hp > 0) {
        const bw = e.size * 0.7;
        const bx = ecx - bw / 2;
        const by = e.y + bob - 8;
        const r = Math.max(0, Math.min(1, e.hp / e.maxHp));
        ctx.fillStyle = '#1a1c2c';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = '#5d275d';
        ctx.fillRect(bx, by, bw, 3);
        ctx.fillStyle = r > 0.4 ? '#b13e53' : '#ef7d57';
        ctx.fillRect(bx, by, bw * r, 3);
      }
    }
  }

  // らいこうレーザー（敵より上のレイヤーに極太ビームを描く）
  drawBossBeams();

  drawWeapon();

  renderMercenaries(); // 傭兵（主人公の後方に隊列。武器はctxで描画）

  // プレイヤー（武器レベルで見た目が進化）
  if (invincibleTimer === 0 || Math.floor(frame / 4) % 2 === 0) {
    const form = FORMS[formIdx];
    drawSprite(form.sprite, player.x, player.y, 2, playerRemap());
    // 上位フォームはキラキラのオーラをまとう
    if (formIdx >= 4 && frame % 4 === 0) {
      pushParticle({
        x: player.x + Math.random() * PLAYER_SIZE,
        y: player.y + PLAYER_SIZE,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.5,
        life: 14,
        color: (formIdx === 5 || formIdx >= 9) ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : '#ffcd75',
      });
    }
    // 神級フォーム（player9〜）は全身をつつむ金色オーラの追加レイヤーをまとう
    if (formIdx >= 9 && frame % 2 === 0) {
      pushParticle({
        x: player.x + Math.random() * PLAYER_SIZE,
        y: player.y + Math.random() * PLAYER_SIZE,
        vx: (Math.random() - 0.5) * 0.9,
        vy: -0.7 - Math.random() * 0.7,
        life: 20,
        color: '#ffcd75',
      }, true);
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
  // 赤い巨大落雷の閃光（ライリュウのらいめいのあらし）。白フラッシュに重ねて「赤く光る雷」を演出
  if (redFlashTimer > 0) {
    const a = redFlashTimer / 18;
    ctx.fillStyle = `rgba(255, 46, 77, ${a * 0.5})`;
    ctx.fillRect(-8, -8, W + 16, H + 16);
    // 上端から降り注ぐ赤い光のグラデーション（雷が空から落ちてくる圧）
    const grd = ctx.createLinearGradient(0, -8, 0, H);
    grd.addColorStop(0, `rgba(255, 119, 168, ${a * 0.6})`);
    grd.addColorStop(1, 'rgba(255, 46, 77, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(-8, -8, W + 16, H + 16);
  }

  // ジギムント撃破後の会話イベント（雷龍登場）
  if (bossEvent) drawBossEventWindow();

  // BGM A/B比較用テストコード（選定後削除予定）: ライリュウ戦中は現在の案を画面右上に表示
  if (state === 'playing' && bossActive && enemies.some((en) => en.boss && en.type.bossBgm === 'rairyu')) {
    drawText(`BGM案:${bgmTestVariant} (1=A疾走 2=B重厚)`, 6, 100, '#73eff7', 11);
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
  drawText(`ぶき: ${wp.name} (${weaponIdx + 1}/${WEAPONS.length})`, 6, 24, wp.rainbow || wp.rainbowSaber ? RAINBOW[Math.floor(gframe / 6) % RAINBOW.length] : wp.color, 13);
  drawText(`ステージ${stage}/${LAST_STAGE} ${currentStage().name}`, 6, 42, '#94b0c2', 11);
  // ゆうしゃレベル（右上・満レベルは虹色）
  const heroCol = hero.level >= HERO_LV.length + 1 ? RAINBOW[Math.floor(gframe / 6) % RAINBOW.length] : '#ffcd75';
  drawText(`ゆうしゃ Lv${hero.level}`, W - 92, 54, heroCol, 12);
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

  // ボスHPバー（分裂中は合計HP）。召喚された過去ボスは大バーに含めず頭上に小バーを描く
  const bosses = enemies.filter((e) => e.boss && !e.summoned);
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

  // WARNING演出（ボスの名前と正体つき）
  if (warningTimer > 0 && Math.floor(warningTimer / 15) % 2 === 0) {
    const bt = currentBossType();
    ctx.fillStyle = 'rgba(177,62,83,0.25)';
    ctx.fillRect(-8, H / 2 - 48, W + 16, 96);
    drawCenteredText('！！ WARNING ！！', H / 2 - 36, '#b13e53', 26);
    drawCenteredText(`${bt.origin}`, H / 2 - 2, '#94b0c2', 12);
    drawCenteredText(`${bt.name} しゅつげん！`, H / 2 + 14, '#ffcd75', 17);
  }

  // ボス出現のセリフ（ドラクエ風メッセージウィンドウ）
  if (serifuTimer > 0) {
    const ww = W - 48;
    const wh = serifuReply ? 76 : 58;
    const wx = 24;
    const wy = H - wh - 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = '#f4f4f4';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx + 3, wy + 3, ww - 6, wh - 6);
    ctx.lineWidth = 1;
    ctx.strokeRect(wx + 7, wy + 7, ww - 14, wh - 14);
    drawText(`${serifuName}が あらわれた！`, wx + 16, wy + 14, '#f4f4f4', 12);
    if (serifuText) drawText(`「${serifuText}」`, wx + 16, wy + 33, '#ffcd75', 12);
    if (serifuReply) drawText(`${playerName || 'ゆうしゃ'}「${serifuReply}」`, wx + 16, wy + 52, '#73eff7', 12);
  }

  // バナー
  if (bannerTimer > 0 && (bannerTimer > 30 || Math.floor(bannerTimer / 4) % 2 === 0)) {
    const pulse = 20 + Math.sin(gframe * 0.25) * 4;
    const bc = RAINBOW[Math.floor(gframe / 5) % RAINBOW.length];
    drawCenteredText(bannerText, 58, bc, pulse);
  }
}

// ライリュウ撃破の断末魔カットシーンの描画（暗幕＋金のスポットライト＋断末魔セリフ）
function drawRairyuDeathWindow(ev) {
  const e = ev.boss;
  const ecx = e.x + e.size / 2;
  const ecy = e.y + e.size / 2;
  // 暗幕（会話イベントより控えめの0.35。崩れゆく雷龍を照らす金のスポットライト）
  ctx.fillStyle = 'rgba(6, 4, 14, 0.35)';
  ctx.fillRect(-8, -8, W + 16, H + 16);
  const g = ctx.createRadialGradient(ecx, ecy, 10, ecx, ecy, e.size * 0.9);
  g.addColorStop(0, 'rgba(255, 224, 140, 0.28)');
  g.addColorStop(1, 'rgba(255, 205, 117, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ecx, ecy, e.size * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // 断末魔のセリフウィンドウ（step1のみ。名前は「雷龍」）
  if (ev.step === 1) {
    const line = RAIRYU_DEATH_LINE;
    const ww = W - 48, wh = 66, wx = 24, wy = H - wh - 6;
    const maxW = ww - 32;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = '#73eff7';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx + 3, wy + 3, ww - 6, wh - 6);
    ctx.lineWidth = 1;
    ctx.strokeRect(wx + 7, wy + 7, ww - 14, wh - 14);
    drawText(line.name, wx + 16, wy + 12, line.color, 12);
    drawWrappedText(`「${line.text}」`, wx + 16, wy + 32, '#f4f4f4', 12, maxW, 20);
  }
}

// ジギムント撃破後の会話イベントの描画（暗雲＋雷龍の金色の目＋セリフウィンドウ）
function drawBossEventWindow() {
  const ev = bossEvent;
  if (ev.kind === 'rairyuDeath') { drawRairyuDeathWindow(ev); return; }
  // 暗雲がたれこめて画面全体が暗くなる
  ctx.fillStyle = 'rgba(4, 4, 12, 0.5)';
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // 雷龍の金色の目が空にともる（2つの光点。ゆらめきながら光る）
  if (ev.step >= 1) {
    const eyeY = 48 + Math.sin(gframe * 0.08) * 3;
    const glow = 0.55 + Math.sin(gframe * 0.2) * 0.25;
    for (const ex of [W / 2 - 36, W / 2 + 36]) {
      const g = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, 24);
      g.addColorStop(0, `rgba(255, 220, 120, ${glow})`);
      g.addColorStop(1, 'rgba(255, 205, 117, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 24, 0, Math.PI * 2);
      ctx.fill();
      // 目の芯（金色の光）と縦長の瞳孔
      ctx.fillStyle = '#fff6d5';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b13e53';
      ctx.fillRect(ex - 1, eyeY - 6, 2, 12);
    }
  }

  // セリフウィンドウ（step0とstep6は非表示）
  const line = BOSS_EVENT_LINES[ev.step];
  if (!line) return;
  const ww = W - 48, wh = 66, wx = 24, wy = H - wh - 6;
  const maxW = ww - 32;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = line.narration ? '#ff2e4d' : '#f4f4f4';
  ctx.lineWidth = 2;
  ctx.strokeRect(wx + 3, wy + 3, ww - 6, wh - 6);
  ctx.lineWidth = 1;
  ctx.strokeRect(wx + 7, wy + 7, ww - 14, wh - 14);
  if (line.narration) {
    drawWrappedText(line.text, wx + 16, wy + 20, '#ff8fa3', 12, maxW, 20);
  } else {
    drawText(line.name, wx + 16, wy + 12, line.color, 12);
    drawWrappedText(`「${line.text}」`, wx + 16, wy + 32, '#f4f4f4', 12, maxW, 20);
  }
}

// 指定幅で自動改行しながらテキストを描く（漢字まじりの長いセリフ用）
function drawWrappedText(text, x, y, color, size, maxW, lineH) {
  ctx.font = `${size}px "MS Gothic", monospace`;
  let line = '', ln = 0;
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxW) {
      drawText(line, x, y + ln * lineH, color, size);
      line = ch;
      ln++;
    } else {
      line += ch;
    }
  }
  if (line) drawText(line, x, y + ln * lineH, color, size);
}

function renderTitle() {
  // 夜空のグラデーション
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#07070f');
  sky.addColorStop(0.55, '#141530');
  sky.addColorStop(1, '#2a1548');
  ctx.fillStyle = sky;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // きらめく星
  for (let i = 0; i < 70; i++) {
    const tw = Math.floor(gframe / 10 + i) % 4;
    ctx.fillStyle = tw === 0 ? '#f4f4f4' : 'rgba(148, 176, 194, 0.45)';
    ctx.fillRect((i * 53) % W, (i * 97) % 250, tw === 0 ? 2 : 1, tw === 0 ? 2 : 1);
  }

  // 奥へ流れるネオングリッド（シンセウェーブ風の床）
  const horizon = 296;
  ctx.strokeStyle = 'rgba(115, 239, 247, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, horizon);
  ctx.lineTo(W + 8, horizon);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    ctx.strokeStyle = 'rgba(115, 239, 247, 0.18)';
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 16, horizon);
    ctx.lineTo(W / 2 + i * 110, H + 8);
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {
    const p = ((gframe / 50 + k / 7) % 1);
    const y = horizon + p * p * (H - horizon + 8);
    ctx.strokeStyle = `rgba(255, 119, 168, ${0.35 * (1 - p) + 0.1})`;
    ctx.beginPath();
    ctx.moveTo(-8, y);
    ctx.lineTo(W + 8, y);
    ctx.stroke();
  }

  // ただよう光の粒
  if (gframe % 6 === 0) {
    pushParticle({
      x: Math.random() * W, y: H + 4,
      vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.5,
      life: 90, color: Math.random() < 0.5 ? '#73eff7' : '#ff77a8',
    });
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  // ロゴ（金色グラデーション＋ゴールドグロー＋ゆったり浮遊）
  const bob = Math.sin(gframe * 0.04) * 3;
  drawGlowTitle('HAYATO', 42 + bob, 54, '#fff3c4', '#ffcd75', '#ffcd75');
  ctx.fillStyle = 'rgba(255, 205, 117, 0.55)';
  ctx.fillRect(W / 2 - 130, 102 + bob, 260, 1);
  drawCenteredText('― 邪竜と20の世界 ―', 112 + bob, '#94b0c2', 13);

  // PRESS ENTER（呼吸するピルボタン）
  const pulse = 0.55 + Math.sin(gframe * 0.08) * 0.45;
  const bw = 216;
  pathRoundRect(W / 2 - bw / 2, 146, bw, 32, 16);
  ctx.fillStyle = 'rgba(115, 239, 247, 0.08)';
  ctx.fill();
  ctx.strokeStyle = `rgba(115, 239, 247, ${0.35 + pulse * 0.6})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  drawCenteredText('PRESS ENTER ▶ スタート', 155, '#f4f4f4', 14);
  ctx.globalAlpha = 1;

  // 主人公のショーケース（光の円座＋波紋リング）
  const hx = W / 2;
  const hy = 236;
  const rg = ctx.createRadialGradient(hx, hy + 26, 2, hx, hy + 26, 46);
  rg.addColorStop(0, 'rgba(115, 239, 247, 0.4)');
  rg.addColorStop(1, 'rgba(115, 239, 247, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(hx, hy + 26, 46, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const ringR = 20 + ((gframe / 2) % 26);
  ctx.strokeStyle = `rgba(115, 239, 247, ${Math.max(0, 0.5 - ringR / 60)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(hx, hy + 26, ringR, ringR * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawSprite('player0', hx - 12, hy + Math.sin(gframe * 0.06) * 3, 2, playerRemap());

  // カスタマイズ情報（ミニカード2枚）
  drawGlassCard(W / 2 - 150, 278, 145, 24);
  drawGlassCard(W / 2 + 5, 278, 145, 24);
  drawText(`C  いろ: ${OUTFITS[outfitIdx].name}`, W / 2 - 138, 285, '#94b0c2', 11);
  drawText(`N  なまえ: ${playerName || 'なし'}`, W / 2 + 17, 285, '#94b0c2', 11);

  // デバッグ用ステージスキップ（◀▶で選択、Bキーでそのボス戦へ直行）
  const bt = BOSS_TYPES[Math.min(debugStage, LAST_STAGE) - 1];
  drawCenteredText(`◀▶ ボステスト: St.${debugStage} ${bt.name}　[Bキー]`, 314, '#566c86', 11);

  // ハイスコアのピル（右上）
  if (highScore > 0) {
    pathRoundRect(W - 132, 10, 122, 22, 11);
    ctx.fillStyle = 'rgba(255, 205, 117, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 205, 117, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawText(`BEST ${highScore}`, W - 120, 16, '#ffcd75', 12);
  }

  // 下部のコントロールバー
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-8, H - 26, W + 16, 34);
  drawCenteredText('やじるし: ステージせんたく　M: おんがく　Z: ずかん', H - 19, '#566c86', 11);
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
  drawText(`コンティニュー:${continuesLeft}かい`, W - 130, 46, '#94b0c2', 11);

  const startY = 70;
  const rowH = 17;
  const VISIBLE = 13;                          // 一度に表示する行数（下の説明文エリアと衝突しない範囲）
  const totalRows = SHOP_ITEMS.length + 1;     // +1 = 「おみせをでる」
  // 選択カーソルが可視範囲外に出たらスクロールを追従させる
  if (shopIdx > shopScroll + VISIBLE - 1) shopScroll = shopIdx - VISIBLE + 1;
  if (shopIdx < shopScroll) shopScroll = shopIdx;
  const last = Math.min(shopScroll + VISIBLE, totalRows);
  for (let i = shopScroll; i < last; i++) {
    const y = startY + (i - shopScroll) * rowH;
    const sel = i === shopIdx;
    if (sel) {
      ctx.fillStyle = 'rgba(255, 205, 117, 0.18)';
      ctx.fillRect(30, y - 2, W - 60, rowH - 1);
      drawText('▶', 34, y, '#ffcd75', 12);
    }
    if (i === SHOP_ITEMS.length) {
      // 「おみせをでる」行
      drawText('おみせをでる（つぎのステージへ！）', 52, y, '#41a6f6', 12);
      continue;
    }
    const item = SHOP_ITEMS[i];
    if (item.merc) {
      // 傭兵: 生存中なら「しゅつじんちゅう」・満員なら「まんいん」表示
      const alive = mercenaries.some((m) => m.typeId === item.id);
      const full = mercenaries.length >= MERC_MAX;
      const blocked = alive || full;
      const nameColor = blocked ? '#566c86' : (gold >= item.price ? '#f4f4f4' : '#7a8494');
      drawText(item.name, 52, y, nameColor, 12);
      const label = alive ? 'しゅつじんちゅう' : (full ? 'まんいん' : `${item.price}G`);
      drawText(label, 230, y, alive ? '#38b764' : (full ? '#7a8494' : nameColor), 12);
      if (sel) drawCenteredText(item.desc, H - 38, '#ffcd75', 12);
      continue;
    }
    const owned = !item.repeat && gear[item.id];
    const nameColor = owned ? '#566c86' : (gold >= item.price ? '#f4f4f4' : '#7a8494');
    drawText(item.name, 52, y, nameColor, 12);
    drawText(owned ? 'そうびちゅう' : `${item.price}G`, 230, y, owned ? '#38b764' : nameColor, 12);
    if (sel) drawCenteredText(item.desc, H - 38, '#ffcd75', 12);
  }
  // スクロール可能を示す矢印（まだ上／下に商品が隠れているとき）
  if (shopScroll > 0 && Math.floor(gframe / 20) % 2 === 0) drawText('▲', W - 40, startY - 2, '#ffcd75', 14);
  if (shopScroll + VISIBLE < totalRows && Math.floor(gframe / 20) % 2 === 0) drawText('▼', W - 40, startY + VISIBLE * rowH - 6, '#ffcd75', 14);

  drawCenteredText('↑↓キー：えらぶ / ENTER：かう / X：でる', H - 20, '#94b0c2', 11);
}

// ---------- ぜんクリア画面 ----------
function renderClear() {
  // 勝利の夜明けグラデーション
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0817');
  sky.addColorStop(0.5, '#241535');
  sky.addColorStop(1, '#4a2a1a');
  ctx.fillStyle = sky;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  // 天からさす光の帯
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * 0.25 + Math.sin(gframe * 0.01 + i) * 0.05;
    ctx.save();
    ctx.translate(W / 2, -20);
    ctx.rotate(a);
    const ray = ctx.createLinearGradient(0, 0, 0, 320);
    ray.addColorStop(0, 'rgba(255, 205, 117, 0.16)');
    ray.addColorStop(1, 'rgba(255, 205, 117, 0)');
    ctx.fillStyle = ray;
    ctx.fillRect(-16, 0, 32, 340);
    ctx.restore();
  }

  // 花火・紙ふぶき
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;

  // 花火の衝撃波リング
  for (const s of shockwaves) {
    ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lw;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 大見出し
  drawGlowTitle('GAME CLEAR!', 36, 42, '#ffcd75', '#ef7d57', '#ffcd75');
  drawCenteredText(`${playerName ? playerName + 'は' : 'きみは'} ほんものの でんせつのゆうしゃだ！`, 90, '#f4f4f4', 14);

  // 勇者の立ち姿（光の円座つき）
  const hx = W / 2;
  const rg = ctx.createRadialGradient(hx, 150, 2, hx, 150, 50);
  rg.addColorStop(0, 'rgba(255, 205, 117, 0.45)');
  rg.addColorStop(1, 'rgba(255, 205, 117, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(hx, 150, 50, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSprite('player5', hx - 18, 106 + Math.sin(gframe * 0.05) * 3, 3, playerRemap());

  // せいせきカード（ガラス風パネル3枚）
  const cards = [
    ['スコア', String(score)],
    ['さいだいコンボ', String(maxCombo)],
    ['たおしたボス', `${bossCount}たい`],
  ];
  for (let i = 0; i < 3; i++) {
    const cw = 136;
    const cx3 = W / 2 + (i - 1) * (cw + 12) - cw / 2;
    drawGlassCard(cx3, 166, cw, 50, 'rgba(255, 205, 117, 0.35)');
    ctx.font = '10px "MS Gothic", monospace';
    const lw = ctx.measureText(cards[i][0]).width;
    drawText(cards[i][0], cx3 + (cw - lw) / 2, 174, '#94b0c2', 10);
    ctx.font = 'bold 17px "MS Gothic", monospace';
    const vw = ctx.measureText(cards[i][1]).width;
    drawText(cards[i][1], cx3 + (cw - vw) / 2, 189, '#ffcd75', 17);
  }
  drawCenteredText(`とうたつぶき: ${WEAPONS[weaponIdx].name}`, 224, '#94b0c2', 11);

  // ハイスコアバッジ
  if (score >= highScore && score > 0) {
    drawCenteredText('★ NEW RECORD ★', 240, RAINBOW[Math.floor(gframe / 8) % RAINBOW.length], 14);
  }

  // たおしたボスたちの行進（プレビュー・右から左へ流れるパレード）
  const paradeW = BOSS_TYPES.length * 46;
  for (let i = 0; i < BOSS_TYPES.length; i++) {
    const bt = BOSS_TYPES[i];
    const px2 = ((i * 46 - gframe * 0.7) % paradeW + paradeW) % paradeW - 46;
    if (px2 > W + 10) continue;
    const bob2 = Math.sin(gframe * 0.1 + i) * 2;
    ctx.globalAlpha = 0.9;
    drawSprite(bt.sprite, px2, 258 + bob2, 1, bt.remap || null);
    ctx.globalAlpha = 1;
  }

  // ENTERピル
  const pulse = 0.55 + Math.sin(gframe * 0.08) * 0.45;
  pathRoundRect(W / 2 - 118, 296, 236, 30, 15);
  ctx.fillStyle = 'rgba(255, 205, 117, 0.08)';
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 205, 117, ${0.35 + pulse * 0.6})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  drawCenteredText('PRESS ENTER ▶ タイトルへ', 304, '#f4f4f4', 13);
  ctx.globalAlpha = 1;
}

// ---------- ボスずかん画面 ----------
function renderZukan() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#07070f');
  sky.addColorStop(1, '#1a1c2c');
  ctx.fillStyle = sky;
  ctx.fillRect(-8, -8, W + 16, H + 16);

  drawCenteredText('★ ボスずかん ★', 8, '#ffcd75', 18);
  drawCenteredText(`${defeatedBosses.size} / ${BOSS_TYPES.length} たい はっけん`, 30, '#94b0c2', 11);

  // 左：ボス名リスト（撃破済みは名前、未撃破は？？？）
  const listX = 8, listY = 46, listW = 148, listH = 282;
  drawGlassCard(listX, listY, listW, listH);
  const rowH = listH / BOSS_TYPES.length;
  for (let i = 0; i < BOSS_TYPES.length; i++) {
    const y = listY + i * rowH;
    const found = defeatedBosses.has(i);
    const sel = i === zukanCursor;
    if (sel) {
      ctx.fillStyle = 'rgba(255, 205, 117, 0.22)';
      ctx.fillRect(listX + 2, y + 1, listW - 4, rowH - 1);
    }
    const label = found ? BOSS_TYPES[i].name : '？？？';
    const color = sel ? '#ffcd75' : (found ? '#f4f4f4' : '#4a5568');
    drawText(`${String(i + 1).padStart(2, '0')} ${label}`, listX + 4, y + 1, color, 8);
  }

  // 右：選択中ボスの詳細プレビュー
  const boxX = listX + listW + 8, boxY = listY, boxW = W - boxX - 8, boxH = listH;
  drawGlassCard(boxX, boxY, boxW, boxH);
  const bt = BOSS_TYPES[zukanCursor];
  const found = defeatedBosses.has(zukanCursor);
  const previewH = boxH - 50;
  const sprite = SPRITES[bt.sprite];
  const cols = Math.max(...sprite.map(r => r.length));
  const rows = sprite.length;
  const scale = fitSpriteScale(bt.sprite, boxW - 24, previewH);
  const sx = boxX + (boxW - cols * scale) / 2;
  const sy = boxY + 6 + (previewH - rows * scale) / 2;
  if (found) {
    drawSprite(bt.sprite, sx, sy, scale, bt.remap || null, true);
  } else {
    drawSilhouette(bt.sprite, sx, sy, scale, '#0d0d16');
  }

  const labelY = boxY + previewH + 10;
  const nameText = found ? bt.name : '？？？';
  ctx.font = '14px "MS Gothic", monospace';
  const nameW = ctx.measureText(nameText).width;
  drawText(nameText, boxX + (boxW - nameW) / 2, labelY, found ? '#f4f4f4' : '#566c86', 14);

  const subText = found ? bt.origin : 'まだ みつけていない…';
  ctx.font = '10px "MS Gothic", monospace';
  const subW = ctx.measureText(subText).width;
  drawText(subText, boxX + (boxW - subW) / 2, labelY + 18, found ? '#94b0c2' : '#4a5568', 10);

  drawCenteredText('↑↓：えらぶ　ENTER / ESC / Z：もどる', H - 14, '#566c86', 10);
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
  if (continuesLeft > 0) {
    if (Math.floor(gframe / 25) % 2 === 0) {
      drawCenteredText(`スペースキーで コンティニュー！（のこり${continuesLeft}かい）`, 254, '#ffcd75', 15);
    }
    drawCenteredText('ENTERキーでタイトルにもどる', 288, '#41a6f6', 12);
  } else {
    drawCenteredText('コンティニューは もうつかえない…', 254, '#566c86', 12);
    drawCenteredText('ENTERキーでタイトルにもどる', 282, '#41a6f6', 13);
  }
}

// ---------- メインループ ----------
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}
loop();
