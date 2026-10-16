# チビット（弾）の候補（2026-10-16）。一族の言葉＝三種で一丁の銃（チビット＝弾・スナイパ＝砲・ボンバ＝火薬）。
# 絵は上向き＝進む向き。ゲームでは速度の向きへ回す前提なので、回した姿も等倍で並べる。
#   使い方: python vortex/scratchpad/chibit_candidates.py <出力フォルダ>
import sys, os
from PIL import Image, ImageDraw

PAL = {
    'k': '#171b24',  # 輪郭
    'f': '#3d4658',  # 鋼の影
    'g': '#67748c',  # 鋼
    's': '#c8d6ea',  # 鋼の光
    'e': '#a8801e',  # 鈍い金の縁
    'r': '#94ad3e',  # 硝子（役の色＝オリーブ・据え置き）
    'R': '#d6ec7a',  # 硝子の光
    'd': '#47521e',  # 消えた硝子（よろけ）
    'x': '#f2eccc',  # 噴射
}

CANDS = {
    'A_ミサイル': [
        '......kk......',
        '.....kssk.....',
        '.....ksgk.....',
        '....ksggfk....',
        '....ksRrfk....',
        '...ksgRrgfk...',
        '...ksgrrgfk...',
        '...ksgrrgfk...',
        '...keeeeeek...',
        '..gksggggfkf..',
        '.sgksggggfkgf.',
        'sgk.kfggfk.kgf',
        'gk..kkffkk..kf',
        '......xx......',
    ],
    'C_鏃': [
        '......kk......',
        '.....kssk.....',
        '....ksggfk....',
        '...ksgRrgfk...',
        '..ksggRrggfk..',
        '.ksgggrrgggfk.',
        'ssggggrrggggff',
        'sgk.ksrrfk.kgf',
        'gk..keeeek..kf',
        '.....ksfk.....',
        '.....ksfk.....',
        '....kksfkk....',
        '....kkffkk....',
        '......xx......',
    ],
}

OLD = [  # いまのチビット（enemies.js R17d）
    '..s......s..', '..ss....ss..', '...sggggs...', '...gfrrfg...', '...gfrrfg...', '....gffg....',
    '....gffg....', '.....gg.....', '.....gg.....', '.....ss.....', '............', '............',
]
OLD_PAL = {'k': '#171b24', 'g': '#67748c', 's': '#c8d6ea', 'f': '#3d4658', 'r': '#94ad3e'}

# D＝鏃＋背骨の尾。頭（兵器）は C と同じ鏃・首の継ぎ目が光る。尾は 3 節の背骨で、頭が通った道をなぞる（ゲームでは位置の履歴）
D_HEAD = CANDS['C_鏃'][:9] + ['.....krrk.....']
D_SEGS = [   # 頭に近い順。節の継ぎ目（下の r）が光る＝装甲の隙間の熱。輪郭の黒は背景に溶けるので節には付けない
    ['.ssgg.', 'ssgggf', 'sgggff', '.gfff.', '..rr..'],
    ['.ss.', 'sggf', 'sgff', '.rr.'],
    ['.s.', 'sgf', '.f.', '.x.'],
]
D_GAPS = [8, 5, 4]   # 前の部品の中心からの距離（絵の画素）

BG = (10, 10, 30, 255)


def chain(out, cx, cy, s, path_fn):
    # path_fn(d) → (x, y, 角度) ＝頭から道のりを d 戻った位置と向き（角度 0＝上・時計回り）
    parts = [img(D_HEAD)] + [img(r) for r in D_SEGS]
    d, acc = 0.0, []
    for i, p in enumerate(parts):
        if i:
            d += D_GAPS[i - 1]
        acc.append((p, d))
    for p, d in reversed(acc):
        x, y, a = path_fn(d)
        r = up(p, s).rotate(-a, resample=Image.NEAREST, expand=True)
        out.alpha_composite(r, (round(cx + x * s - r.width / 2), round(cy + y * s - r.height / 2)))


def straight(a):
    import math
    dx, dy = math.sin(math.radians(a)), -math.cos(math.radians(a))
    return lambda d: (-dx * d, -dy * d, a)


def curve(a0, turn):
    # 頭の向き a0 で、後ろへ戻るほど turn 度/画素 だけ曲がった道（いま曲がりながら飛んでいる）
    import math
    def f(d):
        x = y = 0.0
        a = a0
        step = 0.5
        t = 0.0
        while t < d:
            a -= turn * step
            x -= math.sin(math.radians(a)) * step
            y += math.cos(math.radians(a)) * step
            t += step
        return (x, y, a)
    return f


def img(rows, pal=PAL, fold=False):
    w, h = len(rows[0]), len(rows)
    for r in rows:
        assert len(r) == w, (r, w)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c == '.':
                continue
            if fold and c in 'rR':
                c = 'd'
            if fold and c == 'x':
                continue
            im.putpixel((x, y), Image.new('RGB', (1, 1), pal[c]).getpixel((0, 0)) + (255,))
    return im


def up(im, s):
    return im.resize((round(im.width * s), round(im.height * s)), Image.NEAREST)


def zoom_sheet(path):
    S = 9
    items = [('いま', img(OLD, OLD_PAL))] + [(k, img(v)) for k, v in CANDS.items()]
    items += [(k + '（よろけ）', img(v, fold=True)) for k, v in CANDS.items()]
    W = 640
    cols = 4
    cell = 14 * S + 20
    H = 2 * (cell + 20) + 10
    out = Image.new('RGBA', (W, H), BG)
    dr = ImageDraw.Draw(out)
    for i, (name, im) in enumerate(items):
        n = len(CANDS) + 1
        if i < n:
            cx, cy = 10 + i * (W // cols), 10
        else:
            cx, cy = 10 + (i - n + 1) * (W // cols), 10 + cell + 20
        out.alpha_composite(up(im, S), (cx, cy))
    # D は拡大図の右端に 1 本（まっすぐ・頭は上）
    chain(out, W - 70, 64, 4, straight(0))
    chain(out, W - 70, 64 + cell + 20, 4, curve(0, 3.5))
    out.convert('RGB').save(path)


def play_sheet(path, hero):
    # 等倍（ゲームの画面と同じ倍率）。主人公 ×3・雑魚は ×2（28px）と ×2.5（35px）・8 方向に回した姿
    W, H = 640, 360
    out = Image.new('RGBA', (W, H), BG)
    h3 = up(hero, 3)
    y = 12
    rowsets = [('いま', img(OLD, OLD_PAL), [2])] + [(k, img(v), [2, 2.5]) for k, v in CANDS.items()]
    for name, im, scales in rowsets:
        x = 8
        out.alpha_composite(h3, (x, y))
        x += h3.width + 14
        for s in scales:
            base = up(im, s)
            for a in range(0, 360, 45):
                r = base.rotate(-a, resample=Image.NEAREST, expand=True)
                out.alpha_composite(r, (x + (40 - r.width) // 2, y + (54 - r.height) // 2))
                x += 40 if s == 2 else 46
            x += 10
        y += 54 + 32
    # D＝鏃＋背骨の尾（×2）。8 方向にまっすぐ＋曲がりながらの 4 本
    x = 8
    out.alpha_composite(h3, (x, y))
    x += h3.width + 22
    for a in range(0, 360, 45):
        chain(out, x + 14, y + 22, 2, straight(a))
        x += 46
    for a, t in ((90, 3.5), (200, -3.5), (300, 4.5), (20, -4.5)):
        chain(out, x + 14, y + 22, 2, curve(a, t))
        x += 40
    out.convert('RGB').save(path)


def export_godot(art):
    # 試しキーで切り替えて動かすための等倍 PNG（kurutto-godot/art）。決まったら Phaser の正典（enemies.js）へ移して sprite2png で焼き直す
    img(CANDS['A_ミサイル']).save(os.path.join(art, 'enemy_chibit_A.png'))
    img(CANDS['C_鏃']).save(os.path.join(art, 'enemy_chibit_C.png'))
    img(D_HEAD).save(os.path.join(art, 'enemy_chibit_D.png'))
    for i, r in enumerate(D_SEGS):
        img(r).save(os.path.join(art, f'enemy_chibit_D_seg{i + 1}.png'))


if __name__ == '__main__':
    d = sys.argv[1]
    if d == '--godot':
        export_godot('C:/Users/siniz/kurutto-godot/art')
        print('OK godot')
        sys.exit()
    os.makedirs(d, exist_ok=True)
    hero = Image.open('C:/Users/siniz/kurutto-godot/art/hero_idle.png').convert('RGBA')
    zoom_sheet(os.path.join(d, '01_チビット_弾の候補3つ_拡大.png'))
    play_sheet(os.path.join(d, '02_チビット_弾の候補3つ_等倍_主人公と並べて8方向.png'), hero)
    print('OK')
