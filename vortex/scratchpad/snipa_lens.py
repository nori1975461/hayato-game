# スナイパ（砲）の第 1 稿＝巨大なレンズの望遠眼（2026-10-17 00:25）。一族の言葉＝三種で一丁の銃（スナイパ＝砲）。
# ユーザー回答＝モチーフ「巨大なレンズの望遠眼」・向き「予告のときだけ向く」・生命体「目＋部品の開閉」・一族らしさは絵を見てから。
# 絵は上向き＝撃つ向き。shut＝閉じた姿（ふだん）／open＝開いた姿（予告〜撃つ）。瞳（絞られる光）は kurutto-godot の enemy.gd が重ねる。
# 形は式で描く（18×18・4×4 の副標本）。
#   使い方: python vortex/scratchpad/snipa_lens.py <出力フォルダ>   …確認用の拡大図
#           python vortex/scratchpad/snipa_lens.py --godot           …kurutto-godot/art へ等倍 PNG
import math, os, sys
from PIL import Image

PAL = {'k': '#171b24', 'f': '#3d4658', 'g': '#67748c', 's': '#c8d6ea', 'w': '#f4f8ff', 'e': '#a8801e',
       'm': '#e84dff', 'M': '#ffb0ff', 'd': '#3a1240'}
N = 18
C = (N - 1) / 2.0


def paint(fn):
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


def steel(x, half):
    # 筒の陰影：左が光・右が影
    if x < -half + 0.9:
        return 's'
    if x > half - 0.9:
        return 'f'
    return 'g'


def fins(x, y, open_):
    # 後ろの排熱板（左右）。開くと斜め後ろへ広がる
    ax = abs(x)
    if open_:
        if 3.8 < ax < 8.4 and 2.0 < y < 8.4 and (y - 2.0) > (ax - 3.8) * 0.9 - 0.2 and (y - 2.0) < (ax - 3.8) * 0.9 + 2.2:
            return 'w' if ax > 7.2 else 's'
    else:
        if 3.6 < ax < 5.0 and 0.5 < y < 7.6:
            return 'g'
    return None


def tube(open_):   # I 望遠鏡筒（望遠レンズ・ピントリングの刻み・前に大きな対物レンズ）
    def fn(x, y):
        ax = abs(x)
        if -8.6 < y < -5.4 and ax < 5.0:    # 対物レンズ（金の縁）
            if ax > 4.0 or y < -7.8:
                return 'e'
            if not open_:
                return 'k' if ax < 0.45 else ('g' if x < 0 else 'f')   # 二枚の蓋
            if x < -1.6 and y < -6.6:
                return 'M'   # 映り込み
            return 'm'
        if -5.4 <= y < 5.6 and ax < 3.6:     # 太い筒
            if -3.8 < y < 0.6 and int(math.floor(y * 1.0)) % 2 == 0:
                return 'k' if ax > 2.6 else 'f'   # ピントリングの刻み
            if abs(y - 1.6) < 0.5:
                return 'e'
            return steel(x, 3.6)
        if 5.6 <= y < 8.6 and ax < 1.8:     # 接眼部
            return steel(x, 1.8)
        return None
    return fn


def _iris(x, y, open_, cy=0.0, style=0):
    # style 0＝渦の羽根（第 1 稿・ユーザー「模様がイケていない」）／1＝直線の羽根 6 枚／2＝レンズの蓋／3＝十字の扉 4 枚
    dy = y - cy
    r, a = math.hypot(x, dy), math.atan2(dy, x)
    if r > 7.0:
        return ''
    if r > 5.9:
        return 'e' if r < 6.4 else steel(x, 7.0)
    hole = 3.2 if open_ else 0.0
    if r < hole:
        return 'M' if (x < -0.8 and dy < -0.8) else 'm'
    if open_ and r < hole + 0.7:
        return 'k'
    if style == 1:   # 直線の羽根 3 枚：継ぎ目は中心から少しずれた直線（風車）
        n = 3
        for i in range(n):
            th = i * 2 * math.pi / n - math.pi / 2
            ux, uy = math.cos(th), math.sin(th)
            d = -uy * x + ux * dy - 0.9
            along = ux * x + uy * dy
            if abs(d) < 0.55 and along > 0.0:
                return 'k'
        sec = int(((a + math.pi / 2) % (2 * math.pi)) / (2 * math.pi / 3)) % 3
        return ['f', 's', 'g'][sec]
    if style == 2:   # レンズの蓋：同心円の段・中心の金具・鋲 3 つ
        if 3.4 < r < 4.0:
            return 'k'
        if r < 1.3:
            return 'e'
        for i in range(3):
            th = i * 2 * math.pi / 3 - math.pi / 2
            if math.hypot(x - 4.9 * math.cos(th), dy - 4.9 * math.sin(th)) < 0.75:
                return 's'
        if r < 3.4:
            return 's' if (x < -0.5 and dy < -0.5) else 'g'
        return 'g' if x < 0 else 'f'
    if style == 3:   # 十字の扉：4 枚の三角が中心で合わさる（継ぎ目は斜め十字）
        if abs(abs(x) - abs(dy)) < 0.5:
            return 'k'
        if abs(dy) > abs(x):
            return 's' if dy < 0 else 'f'
        return 'g' if x < 0 else 'f'
    k = ((a + 0.5 * r) / (2 * math.pi / 5)) % 1.0   # 5 枚の羽根（渦）
    if k < 0.14:
        return 'k'
    return 'g' if k < 0.62 else 'f'


def iris_s(style):
    def mk(open_):
        def fn(x, y):
            r = math.hypot(x, y)
            if 7.0 < r < 8.6 and y < -4.6:     # 前の庇（向きを示す）
                return 'w' if r > 7.9 else 's'
            c = _iris(x, y, open_, style=style)
            return None if c == '' else c
        return fn
    return mk


def iris(open_):   # J 絞りの眼
    def fn(x, y):
        r = math.hypot(x, y)
        if 7.0 < r < 8.6 and y < -4.6:     # 前の庇（向きを示す）
            return 'w' if r > 7.9 else 's'
        c = _iris(x, y, open_)
        return None if c == '' else c
    return fn


def dome(open_):   # K 絞りの眼＋長いフード（眼が砲身の奥にある）
    def fn(x, y):
        ax = abs(x)
        if -8.6 < y < -1.0 and 3.4 < ax < 5.0:   # フードの左右の壁
            return 's' if x < 0 else 'f'
        if -8.6 < y < -7.6 and ax < 5.0:
            return 'w' if ax < 3.4 else 's'
        c = _iris(x * 1.15, y, open_, cy=2.4)
        if c != '':
            return c
        return None
    return fn


# 10-17 08:05 ユーザー「J2 と I が最終候補・もうひとひねり・I は懐中電灯にも見える・プレーヤーに印象付ける存在に」
# I2＝細く長い砲身＋先は二本の放電レール（丸い頭をやめる）＋脇に照準器 1 本（左右対称を崩す）
#     砲身の金の輪 3 つ（y＝0.5／-1.5／-3.5）は予告の間 enemy.gd が後ろから順に灯す
RINGS_I2 = (0.5, -1.5, -3.5)


def rail(open_):
    def fn(x, y):
        ax = abs(x)
        if open_:
            if -8.6 < y < -4.6 and 1.0 < ax < 3.0:      # 放電レール（開くと左右へ）
                if y < -7.6:
                    return 'w'
                return 'k' if ax > 2.2 and y > -6.4 else ('s' if x < 0 else 'f')
            if -6.6 < y < -4.6 and ax <= 1.0:
                return 'm'                               # レールの間の光
        else:
            if -7.6 < y < -4.6 and ax < 2.0:
                return 'k' if ax < 0.45 else ('s' if x < 0 else 'f')   # 閉じて一本に
        if -4.6 <= y < 3.6 and ax < 2.0:                # 細い砲身
            for yc in RINGS_I2:
                if abs(y - yc) < 0.5:
                    return 'e'
            return steel(x, 2.0)
        if -4.4 < y < 1.6 and -5.0 < x < -3.0:          # 照準器（左だけ）
            if y < -3.4:
                return 'm' if open_ else 'k'
            return steel(x + 4.0, 1.0)
        if abs(y + 0.5) < 0.5 and -3.0 <= x < -2.0:
            return 'k'                                   # 照準器の留め金
        if 3.6 <= y < 8.6 and ax < 4.0 - max(0.0, 4.6 - y):   # 後ろの機関部（肩は斜め）
            if abs(y - 5.5) < 0.5:
                return 'k'
            if 6.6 < y and ax < 1.0:
                return 'd'                               # 排気口
            return steel(x, 4.0)
        return None
    return fn


# J4＝J2 の蓋に照準の十字（レティクル）と外周の目盛り。目盛りの回転と開いたレンズの十字は enemy.gd が重ねる
def reticle(open_):
    def fn(x, y):
        r = math.hypot(x, y)
        if 7.0 < r < 8.6 and y < -4.6:
            return 'w' if r > 7.9 else 's'
        if 6.4 < r < 7.0:
            a = (math.degrees(math.atan2(y, x)) + 90.0) % 60.0
            if 26.0 < a < 34.0:
                return 'k'                               # 距離計の目盛り
        if not open_ and 1.3 < r < 3.4 and (abs(x) < 0.45 or abs(y) < 0.45):
            return 'k'                                   # 蓋に刻んだ十字
        c = _iris(x, y, open_, style=2)
        return None if c == '' else c
    return fn


LOOKS_ALL = {'I': ('望遠鏡筒', tube, (0, -7.0)), 'J': ('絞りの眼', iris, (0, 0)), 'K': ('絞りの眼＋長いフード', dome, (0, -2.0)),
             'J1': ('絞りの眼 直線の羽根', iris_s(1), (0, 0)), 'J2': ('絞りの眼 レンズの蓋', iris_s(2), (0, 0)), 'J3': ('絞りの眼 十字の扉', iris_s(3), (0, 0)),
             'I2': ('ソーラ・レイ', rail, (0, -6.0)), 'J4': ('照準の眼', reticle, (0, 0))}
LOOKS = {k: LOOKS_ALL[k] for k in ('I', 'I2', 'J2', 'J4')}   # 10-17 08:05 の比較（最終候補 2 つと、ひとひねり）
EXPORT = ('I', 'I2', 'J2', 'J4')   # K と渦の J は 10-17 00:40・J1 J3 は 10-17 08:05 に外した


def export_godot(art):
    for k in EXPORT:
        _, mk, _ = LOOKS_ALL[k]
        paint(mk(True)).save(os.path.join(art, f'enemy_snipa_{k}_open.png'))
        paint(mk(False)).save(os.path.join(art, f'enemy_snipa_{k}_shut.png'))


def sheet(path):
    S = 6
    out = Image.new('RGBA', (640, 2 * (N * S + 14) + 8), (10, 10, 30, 255))
    for i, (k, (_, mk, _)) in enumerate(LOOKS.items()):
        for j, o in enumerate((True, False)):
            im = paint(mk(o)).resize((N * S, N * S), Image.NEAREST)
            out.alpha_composite(im, (6 + i * 158, 8 + j * (N * S + 14)))
    out.convert('RGB').save(path)


if __name__ == '__main__':
    if sys.argv[1] == '--godot':
        export_godot('C:/Users/siniz/kurutto-godot/art')
        print('OK godot')
    else:
        os.makedirs(sys.argv[1], exist_ok=True)
        sheet(os.path.join(sys.argv[1], '01_スナイパ_ひとひねり_拡大（左から I・I2 ソーラ・レイ・J2・J4 照準の眼／上 開く 下 閉じる）.png'))
        print('OK')
