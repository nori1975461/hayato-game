# チビット（弾）の第 2 稿＝回る刃（2026-10-16 22:45）。第 1 稿（A ミサイル・C 鏃・D 鏃＋尾）は「虫・魚っぽい・全部だめ」で否決。
# ユーザー回答＝モチーフ「回る刃・ドリル」・向き「自転し続ける」・生命体は「目＋部品の開閉」・動きは絵を見てから。
# 胴（刃）は回り、目は別の部品で回らない（kurutto-godot の enemy.gd が描く）。中心の穴は目の座。
# 刃は式で作る（回る形は手描きより歪まない）。16×16・4×4 の副標本で塗りを決める。
#   使い方: python vortex/scratchpad/chibit_blades.py <出力フォルダ>  …確認用の拡大図
#           python vortex/scratchpad/chibit_blades.py --godot          …kurutto-godot/art へ等倍 PNG
import math, os, sys
from PIL import Image

PAL = {'k': '#171b24', 'f': '#3d4658', 'g': '#67748c', 's': '#c8d6ea', 'w': '#f4f8ff', 'e': '#a8801e'}
N = 16
C = (N - 1) / 2.0
EYE_R = 1.7   # 目の座（穴）


def angdiff(a, b):
    return (a - b + math.pi) % (2 * math.pi) - math.pi


def paint(fn):
    # fn(x, y) → 色の文字 or None。4×4 の副標本で多数決（None が半分以上なら透明）
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for py in range(N):
        for px in range(N):
            votes = {}
            for sy in range(4):
                for sx in range(4):
                    c = fn(px + (sx + 0.5) / 4 - 0.5 - C, py + (sy + 0.5) / 4 - 0.5 - C)
                    votes[c] = votes.get(c, 0) + 1
            if votes.get(None, 0) >= 8:
                continue
            votes.pop(None, None)
            c = max(votes, key=votes.get)
            r, g, b = bytes.fromhex(PAL[c][1:])
            im.putpixel((px, py), (r, g, b, 255))
    return im


def hub(r, a):
    # 共通の芯：目の座（穴）・金の環・鋲 3 つ（回っているのが見える印）
    if r < EYE_R:
        return None
    if r < EYE_R + 0.8:
        return 'e'
    if r < 4.6:
        for i in range(3):
            if abs(angdiff(a, i * 2 * math.pi / 3 + 0.5)) * r < 0.8 and abs(r - 3.9) < 0.7:
                return 's'
        return 'f'
    return ''


def saw(open_):
    teeth, rb, h = 8, (5.4 if open_ else 5.6), (2.3 if open_ else 0.0)
    def fn(x, y):
        r, a = math.hypot(x, y), math.atan2(y, x)
        c = hub(r, a)
        if c != '':
            return c
        fr = (a / (2 * math.pi) * teeth) % 1.0
        edge = rb + h * (1.0 - fr)   # のこぎり波＝歯が回る向きに鉤を向ける
        if r > edge:
            return None
        if r > rb - 0.2:
            return 'w' if fr < 0.35 else 's'
        if r > rb - 1.2:
            return 'g' if open_ else ('f' if fr < 0.12 else 'g')   # 閉じた姿は継ぎ目（シャッター）が見える
        return 'f'
    return fn


def blades(n, open_, curve=1.1):
    rmax = 7.6 if open_ else 6.0
    def fn(x, y):
        r, a = math.hypot(x, y), math.atan2(y, x)
        c = hub(r, a)
        if c != '':
            return c
        if r > rmax:
            return None
        best = None
        for i in range(n):
            phi = i * 2 * math.pi / n + curve * (r / 7.6) ** 2
            hw = 3.4 * (1.0 - r / rmax) ** 0.6 + 0.7
            d = angdiff(a, phi) * r
            if abs(d) < hw:
                best = d / hw
        if best is None:
            return 'g' if r < 5.0 else None   # 刃の根元をつなぐ円盤
        if best > 0.45:
            return 'w'   # 刃先（回る向きの縁）
        if best > -0.2:
            return 's'
        return 'g'
    return fn


LOOKS = {
    'E': ('丸鋸', saw),
    'F': ('四枚刃', lambda o: blades(4, o)),
    'H': ('三枚刃', lambda o: blades(3, o, 1.4)),
}


def export_godot(art):
    for k, (_, mk) in LOOKS.items():
        paint(mk(True)).save(os.path.join(art, f'enemy_chibit_{k}_open.png'))
        paint(mk(False)).save(os.path.join(art, f'enemy_chibit_{k}_shut.png'))


def sheet(path):
    S = 8
    out = Image.new('RGBA', (640, 2 * (N * S + 16) + 8), (10, 10, 30, 255))
    for i, (k, (_, mk)) in enumerate(LOOKS.items()):
        for j, o in enumerate((True, False)):
            im = paint(mk(o)).resize((N * S, N * S), Image.NEAREST)
            out.alpha_composite(im, (12 + i * 210, 8 + j * (N * S + 16)))
    out.convert('RGB').save(path)


if __name__ == '__main__':
    if sys.argv[1] == '--godot':
        export_godot('C:/Users/siniz/kurutto-godot/art')
        print('OK godot')
    else:
        os.makedirs(sys.argv[1], exist_ok=True)
        sheet(os.path.join(sys.argv[1], '01_チビット_回る刃の候補3つ_拡大（上＝開いた刃・下＝畳んだ刃）.png'))
        print('OK')
