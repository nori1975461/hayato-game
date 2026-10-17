# ボンバ（火薬）の第 3 稿＝「炉心を抱く鉤爪」（2026-10-17 14:52 ユーザー「手榴弾も炸裂球も、投げる価値がある物とは伝わるが敵としてかっこよくない」）。
# 診断＝道具は殺気を持たない（丸い・対称・立っているだけ）。敵には「こちらに何かをしてくる形」が要る＝とがった輪郭・暗い塊・抱えた火。
# 形＝3 本の暗い鋼の爪が燃える炉心を握り込んで閉じた蕾（つぼみ）。上にとがる。継ぎ目から火が漏れ、正面の窓から炉心＝眼がこちらを見る。
# 起動＝爪が外へ開いて、むき出しの炉心が台座（鈍い金の環）の上に現れる＝「掴んで投げろ」。脈は enemy.gd が重ねる。
# コマ＝shut（閉じた蕾）／crack（継ぎ目と爪先が灯る・起動の瞬間）／open（爪が開いて炉心がむき出し）
# 立てたまま回さない（兵器の文法）。蒼・漆黒は使わない（色の正典）。
#   使い方: python vortex/scratchpad/bomba_claw.py <出力フォルダ>   …確認用の拡大図
#           python vortex/scratchpad/bomba_claw.py --godot           …kurutto-godot/art へ等倍 PNG
import math, os, sys
from PIL import Image

PAL = {'k': '#171b24', 'f': '#3d4658', 'g': '#67748c', 's': '#c8d6ea', 'w': '#f4f8ff',
       'B': '#f2d37a', 'b': '#c99a2e', 'n': '#7a5512',
       'o': '#ff6a1e', 'O': '#ffd08a', 'q': '#3a1a08', 'r': '#c8321e'}
W, H = 26, 28


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


COLLAR = (7.0, 9.6)                    # 台座の環（y）
CORE, CORE_R = (0.0, 0.8), 5.0         # むき出しの炉心の中心と半径
C_TIP, S_TIP = -13.0, -11.8            # 中央の爪先・左右の爪先（y）＝3 本の独立したトゲ


def center_w(y):
    # 中央の爪の半幅＝細い錐（先は 3 本のトゲの真ん中）
    if y < C_TIP or y >= COLLAR[0]:
        return 0.0
    return min(0.42 * (y - C_TIP), 3.6)


def lerp_poly(y, pts):
    for (y0, x0), (y1, x1) in zip(pts, pts[1:]):
        if y0 <= y < y1:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return 0.0


def side_outer(y):
    # 左右の爪の外の縁＝角張った面（トゲ→肩→胴→台座）
    if y < S_TIP or y >= COLLAR[0]:
        return 0.0
    return lerp_poly(y, ((S_TIP, 2.9), (-9.0, 4.6), (-6.0, 7.9), (3.0, 7.9), (COLLAR[0], 6.2)))   # 爪先は内へ傾く（鉤）


def side_inner(y):
    # 左右の爪の内の縁＝上はトゲとして中央から離れ、下は中央の爪との継ぎ目
    if y < S_TIP or y >= COLLAR[0]:
        return 0.0
    return max(center_w(y) + 0.9, lerp_poly(y, ((S_TIP, 2.0), (-9.0, 2.6), (-7.0, 2.6), (-4.0, 4.5), (COLLAR[0], 4.5))))


def collar(x, y):
    ax = abs(x)
    if COLLAR[0] <= y < COLLAR[1]:
        hw = 6.8 if y < COLLAR[0] + 1.3 else 6.0
        if ax >= hw:
            return None
        if ax > hw - 0.9:
            return 'k'
        return 'B' if x < -hw + 2.4 else ('n' if x > hw - 2.4 else 'b')
    if COLLAR[1] <= y < 12.8:                                  # 台座の脚＝下へ絞る暗い錐
        hw = 4.8 - (y - COLLAR[1]) * 0.9
        if ax >= hw:
            return None
        if ax > hw - 0.9:
            return 'k'
        if abs(y - 11.4) < 0.5 and ax < 1.5:
            return 'q'                                         # 排気の口
        return 'g' if x < -hw + 2.0 else 'f'
    return None


def core(x, y, lit, bare, cy=None, r=None):
    cx0, cy0 = CORE[0], (CORE[1] if cy is None else cy)
    rr = CORE_R if r is None else r
    d = math.hypot(x - cx0, y - cy0)
    if d >= rr + (0.8 if bare else 0.0):
        return None
    if bare and d >= rr:
        return 'k'
    if not lit:
        return 'o' if d < 1.1 else 'q'                        # ふだん＝暗い炉心に小さな瞳
    if x - cx0 < -1.5 and y - cy0 < -1.5:
        return 'O'
    return 'o' if d < rr - 1.3 else 'r'                        # 縁は深紅


def talon_closed(x, y, stage):
    # 閉じた拳＝中央の爪（窓つき）と左右の爪。上は 3 本のトゲが隙間を空けて立つ
    ax = abs(x)
    lit = stage != 'shut'
    so, si = side_outer(y), side_inner(y)
    if so > 0.0 and si <= ax < so:
        if y < S_TIP + 2.6:
            return 'o' if lit else 'B'                         # 爪先の金（起動で灯る）
        if ax > so - 0.9 or ax < si + 0.9:
            return 'o' if (lit and ax < si + 0.9 and y > -5.0) else 'k'
        if abs((ax - si) - (y + 6.0) * 0.55) < 0.45 and y > -6.0 and y < 2.0:
            return 'k'                                         # 面の折れ線（角張り）
        if x < 0:
            return 's' if (ax > so - 2.4 and y < 2.0) else 'g'
        return 'f' if ax > si + 2.4 else 'g'
    cw = center_w(y)
    if cw > 0.0 and ax < cw:
        if y < C_TIP + 2.6:
            return 'o' if lit else 'B'
        if ax > cw - 0.9:
            return 'o' if lit else 'k'                         # 継ぎ目
        wl = 1.4 * (1.0 - abs(y - 1.0) / 4.0)                   # 窓＝菱形の覗き
        if wl > 0.0 and ax < wl:
            c = core(x, y, lit, False, cy=1.0, r=4.5)
            return c if c else 'q'
        if wl > -0.6 and ax < wl + 0.6:
            return 'k'                                         # 窓の枠
        return 'g' if x < 0 else 'f'
    return None


def seg(x, y, a, b, h0, h1):
    # 線分 a→b の周りの帯（根元の半幅 h0・先の半幅 h1）。中なら (t, across, hw) を返す
    ax0, ay0 = a
    bx0, by0 = b
    L = math.hypot(bx0 - ax0, by0 - ay0)
    ux, uy = (bx0 - ax0) / L, (by0 - ay0) / L
    px, py = x - ax0, y - ay0
    t = (px * ux + py * uy) / L
    if t < 0.0 or t > 1.0:
        return None
    hw = h0 + (h1 - h0) * t
    across = -px * uy + py * ux
    if abs(across) >= hw:
        return None
    return t, across, hw


def talon_open(x, y):
    # 開いた鉤爪＝左右は台座の肩から外へ張り出し、先が内へ巻く 2 節。正面の爪は手前へ倒れて短く（台座の前）
    def col(t, across, hw, tip):
        if tip and t > 0.7:
            return 'o'                                         # 爪先は灯る
        if abs(across) > hw - 0.9:
            return 'k'
        return 's' if across < -hw * 0.3 else ('g' if across < hw * 0.25 else 'f')
    for sgn in (-1, 1):
        r = seg(x, y, (sgn * 5.4, COLLAR[0] + 0.8), (sgn * 10.8, -2.5), 3.2, 2.4)
        if r:
            return col(r[0], r[1] * sgn, r[2], False)
        r = seg(x, y, (sgn * 10.8, -2.5), (sgn * 7.4, -10.6), 2.4, 0.6)
        if r:
            return col(r[0], r[1] * sgn, r[2], True)
    r = seg(x, y, (0.0, COLLAR[0] + 0.5), (0.0, 13.4), 2.6, 0.8)
    if r:
        return col(r[0], r[1], r[2], True)
    return None


def claw(stage):
    def fn(x, y):
        if stage == 'open':
            c = talon_open(x, y)
            if c:
                return c
            c = core(x, y, True, True)
            if c:
                return c
            return collar(x, y)
        c = talon_closed(x, y, stage)
        if c:
            return c
        return collar(x, y)
    return fn


LOOKS = {'H1': ('炉心を抱く鉤爪', claw)}
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
        sheet(os.path.join(sys.argv[1], '01_ボンバ_炉心を抱く鉤爪_拡大（左から 閉じた蕾・起動の瞬間・爪が開いて炉心がむき出し）.png'))
        print('OK')
