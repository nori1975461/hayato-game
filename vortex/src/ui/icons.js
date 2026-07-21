// 強化アイコン7種（PROTOTYPE_SPEC §10.3）。レベルアップカードに 40px 程度で表示される。
// スプライトは HAYATO 式テキストグリッド（'.'=透明・全行同長12・高さ12）。
// palette に無い文字を rows に使わないこと。Boot.js でテクスチャ化（'icon_<id>'）。
// 描画失敗時はテーマ色グローで代用可（fx 側フォールバック）。

export const UPGRADE_ICONS = {
  // atk: 上向きの剣（白刃＋赤いつば・こうげき強化）
  atk: {
    palette: { w: '#ffffff', l: '#9fc4ff', r: '#ff6e6e', d: '#b23a3a' },
    rows: [
      '.....ww.....',
      '.....wl.....',
      '.....wl.....',
      '.....wl.....',
      '.....wl.....',
      '.....wl.....',
      '..rrrrrrrr..',
      '...r....r...',
      '.....dd.....',
      '.....dd.....',
      '....rrrr....',
      '............',
    ],
  },

  // spin: 回転矢印（シアンの円環＋右上のヤジリ・かいてん強化）
  spin: {
    palette: { a: '#7fffcf', h: '#d6fff2' },
    rows: [
      '....aaaa.h..',
      '..aa...aahhh',
      '.a....aahha.',
      '.a.......aa.',
      'a..........a',
      'a..........a',
      'a..........a',
      'a..........a',
      '.a........a.',
      '.a........a.',
      '..aa....aa..',
      '....aaaa....',
    ],
  },

  // radius: 二重リング（青の外輪と内輪・きどう＝まわる輪の拡大）
  radius: {
    palette: { a: '#7fd8ff', b: '#cfeeff' },
    rows: [
      '....aaaa....',
      '..aa....aa..',
      '.a........a.',
      '.a........a.',
      'a...bbbb...a',
      'a...b..b...a',
      'a...b..b...a',
      'a...bbbb...a',
      '.a........a.',
      '.a........a.',
      '..aa....aa..',
      '....aaaa....',
    ],
  },

  // move: 風をまとったブーツ（黄の足・オレンジの靴底・左に風の線・いどう強化）
  move: {
    palette: { a: '#ffe066', b: '#ff9e3d', w: '#fff4c2' },
    rows: [
      '....aa......',
      '....aa......',
      '....aa......',
      'w...aa......',
      'ww..aa......',
      'w...aaaaa...',
      '....aaaaaaa.',
      '....aaaaaaa.',
      '...aaaaaaaa.',
      '..bbbbbbbbb.',
      '..bb....bb..',
      '............',
    ],
  },

  // hp: ハート（緑の本体・桃のふち・たいりょく強化）
  hp: {
    palette: { p: '#ff8fc4', a: '#66ff88', w: '#ccffdd' },
    rows: [
      '............',
      '............',
      '..pp....pp..',
      '.pppp..pppp.',
      '.paaaaaaaap.',
      '.paawwaaaap.',
      '..paaaaaap..',
      '...paaaap...',
      '....paap....',
      '.....pp.....',
      '............',
      '............',
    ],
  },

  // catch: スターコア（金の星＋中心の光るコア・ほかく率アップ）
  catch: {
    palette: { a: '#ffd23f', w: '#fff3b0' },
    rows: [
      '.....aa.....',
      '....aaaa....',
      '....aaaa....',
      'aaaaaaaaaaaa',
      '.aaaaaaaaaa.',
      '..aaawwaaa..',
      '...aawwaa...',
      '...aaaaaa...',
      '..aaa..aaa..',
      '..aa....aa..',
      '.aa......aa.',
      '............',
    ],
  },

  // magnet: U字磁石（青い本体・赤い極・じしゃく＝すいよせ範囲アップ）
  magnet: {
    palette: { a: '#66ccff', r: '#ff5e5e', w: '#cceeff' },
    rows: [
      '............',
      '..rr....rr..',
      '..rr....rr..',
      '..wa....aw..',
      '..wa....aw..',
      '..aa....aa..',
      '..aa....aa..',
      '..aa....aa..',
      '..aaa..aaa..',
      '..aaaaaaaa..',
      '...aaaaaa...',
      '............',
    ],
  },
};
