# ボンバ（火薬）の第 2 稿＝爆弾（2026-10-17 09:31 ユーザー「弾には見えるがかっこよさが無い・特性は薬莢でなく爆弾」）。
# 一族の言葉＝三種で一丁の銃（チビット＝弾・スナイパ＝砲・ボンバ＝火薬）。生命体＝目＋部品の開閉。立てたまま回さない（兵器の文法）。
# ボンバの中身は手榴弾そのもの（近づく→起動して掴める→1.3 秒で爆発・掴んで投げると連鎖）＝形もそれに合わせる。
#   G1 手榴弾＝卵形の殻・信管の頭・左にピンの輪・右に安全レバー（非対称）。起動＝輪とレバーが弾け飛び（enemy.gd が描く）、
#      上の殻が持ち上がって継ぎ目から火が見え、帯の覗き窓（眼）が満ちる
#   G2 炸裂球＝滑らかな球に帯と上のボタン（レバー無し）。起動＝ボタンが沈んで光り、上の殻が持ち上がる
# コマ＝shut（ふだん）／crack（起動の瞬間＝部品が飛んだ直後・継ぎ目が灯る）／open（殻が持ち上がった）
#   使い方: python vortex/scratchpad/bomba_bomb.py <出力フォルダ>   …確認用の拡大図
#           python vortex/scratchpad/bomba_bomb.py --godot           …kurutto-godot/art へ等倍 PNG
import math, os, sys
from PIL import Image

PAL = {'k': '#171b24', 'f': '#3d4658', 'g': '#67748c', 's': '#c8d6ea', 'w': '#f4f8ff',
       'B': '#f2d37a', 'b': '#c99a2e', 'n': '#7a5512',
       'o': '#ff6a1e', 'O': '#ffd08a', 'q': '#3a1a08'}
W, H = 20, 28


def paint(fn, w=W, h=H):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    for py in range(h):
        for px in range(w):
            votes = {}
            for sy in range(4):
                for sx in range(4):
                    c = fn(px + (sx + 0.5) / 4 - 0.5 - cx, py + (sy + 0.5) / 4 - 0.5 - cy)
                    votes[c] = votes.get(c, 0) + 1
            if votes.get(None, 0) >= 8:
                continue
            votes.pop(None, None)
            c = max(votes, key=votes.get)
            r, g, b = bytes.fromhex(PAL[c][1:])
            im.putpixel((px, py), (r, g, b, 255))
    return im


def gold(x, half):
    if x < -half + 1.4:
        return 'B'
    if x > half - 1.4:
        return 'n'
    return 'b'


def window(x, y, ex, ey, stage, r=1.9):
    # 帯の覗き窓＝眼。ふだんは暗い窓に小さな瞳・起動で窓いっぱいに灯る
    d = math.hypot(x - ex, y - ey)
    if d >= r + 0.7:
        return None
    if d >= r:
        return 'k'
    if stage == 'shut':
        return 'o' if d < 0.75 else 'q'
    return 'O' if (x - ex < -0.5 and y - ey < -0.5) else 'o'


def shell(x, y, w_of, top, band, bottom, stage, seam, grooves, bloom):
    # 殻の共通部＝上の殻（3 枚の装甲・縦の継ぎ目 ±seam）・帯（覗き窓）・下の殻（横の溝）。
    # bloom＝起動で 3 枚の装甲が外へ開く量（左右の板は斜め上外へ・真ん中の板は上へ）。板の間と下に芯の火が見える
    ax = abs(x)
    c = window(x, y, 0.0, (band[0] + band[1]) / 2.0, stage)
    if c:
        return c
    if band[0] <= y < band[1]:                               # 帯
        wb = w_of(y)
        if ax >= wb:
            return None
        return 'k' if ax > wb - 0.9 else gold(x, wb)
    if y < band[0]:                                          # 上の殻
        def panel(px, py):
            # 元の場所 (px, py) にある装甲の色。板の外なら None
            if py < top or py >= band[0]:
                return None
            wu = w_of(py)
            pax = abs(px)
            if pax >= wu:
                return None
            if pax > wu - 0.9 or (abs(pax - seam) < 0.45 and py < band[0] - 0.9):
                return 'k' if stage == 'shut' else ('o' if abs(pax - seam) < 0.45 else 'k')
            if px < -wu + 2.3 and py < band[0] - 3.0:
                return 's' if py < top + 3.5 else 'g'        # 左上の照り
            return 'g' if px < 0 else 'f'
        if bloom <= 0.0:
            return panel(x, y)
        # 開く：真ん中の板は上へ bloom・左右の板は外へ bloom と上へ bloom/2
        for sx, sy, lo, hi in ((0.0, -bloom, -seam, seam), (-bloom, -bloom * 0.5, -99.0, -seam), (bloom, -bloom * 0.5, seam, 99.0)):
            px, py = x - sx, y - sy
            if lo <= px < hi:
                c = panel(px, py)
                if c:
                    return c
        if y >= top + 1.0 and ax < w_of(y) - 0.6:            # 板の隙間＝芯の火
            return 'O' if (ax < 1.6 and y > band[0] - 5.0) else 'o'
        return None
    if band[1] <= y < bottom:                                # 下の殻（滑らか）
        wl = w_of(y)
        if ax >= wl:
            return None
        if ax > wl - 0.9:
            return 'k'
        for gy in grooves:
            if abs(y - gy) < 0.45 and ax < wl - 1.4:
                return 'k'
        return 'g' if x < -wl + 2.3 else 'f'
    return None


# ---------- G1 手榴弾 ----------
G1_CY, G1_A, G1_B = 2.0, 9.5, 7.0     # 卵形：中心 y・縦半径・横半径
G1_BAND = (1.0, 3.3)


def g1_w(y):
    t = 1.0 - ((y - G1_CY) / G1_A) ** 2
    return G1_B * math.sqrt(t) if t > 0 else 0.0


def g1_lever(x, y):
    # 安全レバー＝信管の頭から右へ出て、殻の右の縁に沿って帯まで下りる（非対称＝兵器の印）
    if -9.8 <= y < -8.4 and 2.0 < x < 4.6:
        return 'B' if x < 3.2 else 'b'
    if -8.4 <= y < 4.2:
        lx = max(g1_w(y) + 0.1, 3.0)
        if lx <= x < lx + 1.5:
            return 'B' if y < -3.0 else ('b' if y < 2.0 else 'n')
    return None


def g1_ring(x, y):
    # ピンの輪（左上）とピン
    d = math.hypot(x + 5.4, y + 10.2)
    if 1.5 < d < 2.6:
        return 'B' if (x + 5.4 < 0 and y + 10.2 < 0) else 'b'
    if -10.6 <= y < -9.6 and -3.4 < x < -2.0:
        return 'B'
    return None


def g1(stage):
    bloom = 2.0 if stage == 'open' else 0.0
    def fn(x, y):
        ax = abs(x)
        if stage == 'shut':
            c = g1_ring(x, y) or g1_lever(x, y)
            if c:
                return c
        # 信管の頭：蓋・首。起動で撃針が飛び出す（蓋が 1 画素上がり、間に火）
        cap_top = -14.0 if stage == 'open' else -12.5
        if cap_top <= y < cap_top + 1.3 and ax < 2.8:
            return 's' if x < 0.4 else 'g'
        if stage == 'open' and -12.7 <= y < -11.0 and ax < 1.5:
            return 'o'                                       # 撃針が飛び出した間の火
        neck_top = -11.3 - (2.0 if stage == 'open' else 0.0)
        if neck_top <= y < -7.0 and ax < 2.0:
            if stage == 'crack' and -8.6 <= y < -7.6:
                return 'o'                                   # 首の火（起動した印）
            return 'k' if ax > 1.4 else ('s' if x < -0.4 else 'g')
        return shell(x, y, g1_w, -7.4, G1_BAND, 11.4, stage, 2.7, (6.6, 9.3), bloom)
    return fn


# ---------- G2 炸裂球 ----------
G2_CY, G2_R = 1.0, 8.4
G2_BAND = (-0.3, 1.9)


def g2_w(y):
    t = G2_R * G2_R - (y - G2_CY) ** 2
    return math.sqrt(t) if t > 0 else 0.0


def g2(stage):
    bloom = 2.0 if stage == 'open' else 0.0
    def fn(x, y):
        ax = abs(x)
        # 上のボタン：ふだんは出ている・起動で沈んで光る
        if stage == 'shut':
            if -10.4 <= y < -7.2 and ax < 2.2:
                return 'k' if ax > 1.6 else ('s' if y < -9.4 else ('g' if x < 0 else 'f'))
        else:
            by = -9.0 - bloom
            if by <= y < by + 1.8 and ax < 2.2:
                return 'O' if ax < 0.9 else 'o'
        return shell(x, y, g2_w, -7.3, G2_BAND, 9.3, stage, 3.4, (5.4, 7.4), bloom)
    return fn


LOOKS = {'G1': ('手榴弾', g1), 'G2': ('炸裂球', g2)}
STAGES = ('shut', 'crack', 'open')


def export_godot(art):
    for k, (_, mk) in LOOKS.items():
        for st in STAGES:
            paint(mk(st)).save(os.path.join(art, f'enemy_bomba_{k}_{st}.png'))


def sheet(path):
    S = 7
    out = Image.new('RGBA', (3 * (W * S + 12) + 12, len(LOOKS) * (H * S + 12) + 12), (10, 10, 30, 255))
    for j, (k, (_, mk)) in enumerate(LOOKS.items()):
        for i, st in enumerate(STAGES):
            im = paint(mk(st)).resize((W * S, H * S), Image.NEAREST)
            out.alpha_composite(im, (12 + i * (W * S + 12), 12 + j * (H * S + 12)))
    out.convert('RGB').save(path)


if __name__ == '__main__':
    if sys.argv[1] == '--godot':
        export_godot('C:/Users/siniz/kurutto-godot/art')
        print('OK godot')
    else:
        os.makedirs(sys.argv[1], exist_ok=True)
        sheet(os.path.join(sys.argv[1], '01_ボンバ_爆弾_拡大（上 G1 手榴弾・下 G2 炸裂球／左から ふだん・起動の瞬間・殻が開く）.png'))
        print('OK')
