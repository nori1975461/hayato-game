// data/mobit_views.js — モビットの向きの絵（背中・横顔）。正面は monsters.js の sprite をそのまま使う。
//
// ★2026-10-18 ユーザー指示「主人公は前後左右の動きを入れたが、モビット 2 体は正面向きのまま。前後左右に向くビジュアルを」。
//   Godot 版（kurutto-godot）の tools/sprite2png.mjs がここから art/mon_<id>_<向き>.png を焼く（手で描かない）。
//   side_l は side_r の左右反転（書き出しで作る）。パレットは monsters.js の正面と同じ文字＋影の 1 色（v）だけ足す。
//   ⚠️ 判断は実プレイの等倍（×2.5）で。拡大 PNG だけで良し悪しを決めない（feedback_pixel_art_judge_at_play_zoom）
export const MOBIT_VIEWS = {
  // スターパピー＝星の耳・青い丸い体・白い口・星の尾（正面では右下）
  starpuppy: {
    palette: { a: '#7fd8ff', d: '#4a9fd8', w: '#ffffff', k: '#1b3b5f', p: '#ffb3d9', s: '#ffe066' },
    // 背中＝顔と口が消え 頭と体の境に影の段・星の尾は正面の左右反転（真ん中に立てると「＋」の記号に見えた）
    back: [
      '...s........s...',
      '..sss......sss..',
      '..ssaaaaaaaass..',
      '...aaaaaaaaaa...',
      '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
      '..daaaaaaaaaad..',
      '..ddaaaaaaaadd..',
      '.saaaaaaaaaaaa..',
      'ssaaaaaaaaaaaa..',
      '...aaaaaaaaaa...',
      '...aaaaaaaaaa...',
      '....aaddddaa....',
      '....aa....aa....',
      '....dd....dd....',
    ],
    // 横顔（右向き）＝耳は後ろ寄りに 1 本・目と鼻と口が右へ・星の尾が左（後ろ）
    side_r: [
      '.....s..........',
      '....sss.........',
      '....ssaaaaa.....',
      '...aaaaaaaaaa...',
      '..aaaaaaaaaaaa..',
      '..aaaaaaaaaaaa..',
      '..aaaaaaaaawka..',
      '..aaaaaaaaakka..',
      '..aaaaaaapaaakk.',
      's.aaaaaaaaawwww.',
      'ssaaaaaaaaawwww.',
      '.sdaaaaaaaawww..',
      '..daaaaaaaaaa...',
      '...aadddaaa.....',
      '...aa...aa......',
      '...dd...dd......',
    ],
  },
  // マモリン＝金の耳の白い子が 青い盾を前に構える（正面は盾の紋が見える・盾の下は左へ流れる）
  mamorin: {
    palette: { w: '#eef3ff', g: '#ffd23f', c: '#5ad0ff', k: '#1a2340', v: '#a9b8dc' },
    // 背中＝白い背と小さな足・盾は体の後ろから縁だけ見える（正面の流れの左右反転）
    back: [
      '................',
      '.....gg..gg.....',
      '....wwwwwwww....',
      '...wwwwwwwwww...',
      '...wwwwwwwwww...',
      '...vwwwwwwwwv...',
      '..ggvvvvvvvvgg..',
      '.gcvwwwwwwwwvcg.',
      '.gcwwwwwwwwwwcg.',
      '.gcwwwwwwwwwwcg.',
      '.gcvwwwwwwwwvcg.',
      '.gccvwwwwwwvccg.',
      '...gcvwvvwvcg...',
      '.....gckkcg.....',
      '......gccg......',
      '.......gg.......',
    ],
    // 横顔（右向き）＝頭は少し後ろ・盾は右に縦の弧（縁の金と面の青）・体は盾の陰
    side_r: [
      '................',
      '.....gg.........',
      '....wwwwwww.....',
      '...wwwwwwwww....',
      '...wwwwwwwkw....',
      '...vwwwwwwww.g..',
      '....vwwwwwv.gcg.',
      '.....wwwwwwgccg.',
      '.....wwwwwwgccg.',
      '.....wwwwwwgccg.',
      '.....vwwwwwgccg.',
      '.....vwwwwvgccg.',
      '......vwwv.gccg.',
      '......k..k.gcg..',
      '...........gg...',
      '................',
    ],
  },
};
