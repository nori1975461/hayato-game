# ボンバ（火薬）の第 1 稿＝薬莢（2026-10-17 09:10）。一族の言葉＝三種で一丁の銃（チビット＝弾・スナイパ＝砲・ボンバ＝火薬）。
# ユーザー回答＝不安点 4 つ全部（かっこよさがない・掴める弾に見えない・一族に見えない・時限爆弾に見えない）・モチーフ「薬莢・砲弾」・
# 生命体「目＋部品の開閉（チビット・J5 と同じ）」・起動の見せ方は絵を見てから。
# 絵は立てたまま（進む向きへ回さない＝兵器の文法）。shut＝ふだん（眼は半分まぶた）／open＝起動（まぶたが開き眼が灯る）。
# 瞳・刻みが順に灯る演出は kurutto-godot の enemy.gd が重ねる（眼と刻みの位置は LOOKS の数字）。
#   使い方: python vortex/scratchpad/bomba_case.py <出力フォルダ>   …確認用の拡大図
#           python vortex/scratchpad/bomba_case.py --godot           …kurutto-godot/art へ等倍 PNG
import math, os, sys
from PIL import Image

PAL = {'k': '#171b24', 'f': '#3d4658', 'g': '#67748c', 's': '#c8d6ea', 'w': '#f4f8ff',
       'B': '#f2d37a', 'b': '#c99a2e', 'n': '#7a5512',
       'o': '#ff8a1e', 'O': '#ffd08a', 'q': '#3a1a08'}


def paint(fn, w, h):
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


def brass(x, half):
    if x < -half + 1.1:
        return 'B'
    if x > half - 1.1:
        return 'n'
    return 'b'


def steel(x, half):
    if x < -half + 0.9:
        return 's'
    if x > half - 0.9:
        return 'f'
    return 'g'


def eye(x, y, ex, ey, open_, r=1.4):
    # 眼の窓：鋼の縁＋中の眼。ふだんは小さな瞳（暗い窓に橙の点）・起動で窓いっぱいに灯る
    # （まぶたで半分隠す第 1 稿は横長の口に見えて顔になった＝やめた）
    d = math.hypot(x - ex, y - ey)
    if d >= r + 0.6:
        return None
    if d >= r:
        return 'k'
    if open_:
        return 'O' if (x - ex < -0.5 and y - ey < -0.5) else 'o'
    return 'o' if d < 0.7 else 'q'


def lamps(x, y, ys):
    # 数える灯り（縦に 3 つ）。enemy.gd が下から順に灯す
    return abs(x) < 1.0 and any(abs(y - g) < 0.5 for g in ys)


def case(x, y, top, open_, eye_y, lamp_ys, mouth):
    # 細長い薬莢（つるりとした胴・段のある肩・首・抜き溝・縁）。top＝首の上端
    ax = abs(x)
    e = eye(x, y, 0.0, eye_y, open_)
    if e:
        return e
    if lamps(x, y, lamp_ys):
        return 'k'
    if mouth and top <= y < top + 1.0 and ax < 2.2:          # 口＝中の火薬
        return 'k' if ax > 1.3 else ('o' if open_ else 'q')
    if top <= y < top + 2.2 and ax < 2.2:                    # 首
        return brass(x, 2.2)
    if top + 2.2 <= y < top + 3.4 and ax < 2.2 + (y - top - 2.2) * 1.6:   # 肩
        return brass(x, 4.1)
    if top + 3.4 <= y < 10.0 and ax < 4.1:                   # 胴（つるり）
        return brass(x, 4.1)
    if 10.0 <= y < 10.8 and ax < 2.8:                        # 抜き溝
        return 'k'
    if 10.8 <= y < 12.2 and ax < 4.5:                        # 縁
        return steel(x, 4.5)
    return None


# K1 薬莢＝弾の無い薬莢。口の奥に火薬（起動で口の火薬が灯る）
K1_EYE, K1_LAMPS = 1.0, ()   # 眼は胴の上寄り（肩に重ねると帽子をかぶった顔に見えた）・灯りの点はボタンに見えた＝胴が下から灯る（enemy.gd）


def k1(open_):
    return lambda x, y: case(x, y, -5.0, open_, K1_EYE, K1_LAMPS, True)


# K3 砲弾＝薬莢＋尖った鋼の弾頭（弾帯は銅色）
K3_EYE, K3_LAMPS = 1.0, ()


def k3(open_):
    def fn(x, y):
        if -12.6 < y < -5.0:
            hw = 2.6 * math.sqrt(max(0.0, (y + 12.6) / 6.6))
            if abs(x) < hw:
                if abs(y + 5.6) < 0.5:
                    return 'n'                               # 弾帯
                return steel(x, hw) if hw > 1.2 else 's'
            return None
        return case(x, y, -5.0, open_, K3_EYE, K3_LAMPS, False)
    return fn


# K2 挿弾子＝砲弾 3 本を鋼の挿弾子で束ねる。眼は真ん中の 1 本・3 本の弾頭が順に灯る
K2_EYE = 2.0


def k2(open_):
    def fn(x, y):
        if 9.0 <= y < 10.6 and abs(x) < 9.6:                 # 挿弾子
            return steel(x, 9.6) if abs(y - 9.8) < 0.5 else 'k'
        for cx in (-6.0, 0.0, 6.0):
            lx = (x - cx) * 1.55
            if abs(lx) < 4.6:
                yy = y * 1.0
                if -12.6 < yy < -5.0:
                    hw = 2.6 * math.sqrt(max(0.0, (yy + 12.6) / 6.6))
                    if abs(lx) < hw:
                        if abs(yy + 5.6) < 0.6:
                            return 'n'
                        return steel(lx, hw) if hw > 1.2 else 's'
                    continue
                c = case(lx, yy, -5.0, open_ if cx == 0 else False, K2_EYE if cx == 0 else 99, (), False)
                if c and not (cx != 0 and c in ('o', 'q', 'O')):
                    return c
        return None
    return fn


LOOKS = {'K1': ('薬莢', k1, 12, 26), 'K2': ('挿弾子', k2, 20, 26), 'K3': ('砲弾', k3, 12, 26)}


def export_godot(art):
    for k, (_, mk, w, h) in LOOKS.items():
        paint(mk(True), w, h).save(os.path.join(art, f'enemy_bomba_{k}_open.png'))
        paint(mk(False), w, h).save(os.path.join(art, f'enemy_bomba_{k}_shut.png'))


def sheet(path):
    S = 6
    out = Image.new('RGBA', (640, 2 * (26 * S + 14) + 8), (10, 10, 30, 255))
    for i, (k, (_, mk, w, h)) in enumerate(LOOKS.items()):
        for j, o in enumerate((False, True)):
            im = paint(mk(o), w, h).resize((w * S, h * S), Image.NEAREST)
            out.alpha_composite(im, (10 + i * 210, 8 + j * (26 * S + 14) + (26 - h) * S // 2))
    out.convert('RGB').save(path)


if __name__ == '__main__':
    if sys.argv[1] == '--godot':
        export_godot('C:/Users/siniz/kurutto-godot/art')
        print('OK godot')
    else:
        os.makedirs(sys.argv[1], exist_ok=True)
        sheet(os.path.join(sys.argv[1], '01_ボンバ_薬莢_拡大（左から K1 薬莢・K2 挿弾子・K3 砲弾／上 ふだん 下 起動）.png'))
        print('OK')
