import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = sys.argv[1]  # C:/Project/RatPlain
SP = f"{ROOT}/pirate/art/sprites"
OUT = f"{ROOT}/pirate/art/itch/deco"
FONT = f"{ROOT}/Pirate_1/Assets/Fonts/Jua-Regular.ttf"
INK = (61, 43, 31, 255)
CREAM = (255, 248, 232, 255)
LINE_COL = {"S": (90, 160, 210, 255), "M": (110, 170, 90, 255), "H": (200, 90, 70, 255)}


def font(n):
    return ImageFont.truetype(FONT, n)


def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def text_c(d, cx, y, s, f, fill=INK):
    w = d.textlength(s, font=f)
    d.text((cx - w / 2, y), s, font=f, fill=fill)


# 1) 배 진화 표: 갤리선 → 3갈래 × 5척
rows = [
    ("S", "FAST / 쾌속선", [("caravel", "Caravel"), ("clipper", "Clipper"), ("paddle", "Paddle Steamer"), ("torpedo", "Torpedo Boat"), ("missile", "Missile Boat")]),
    ("M", "ALL-ROUND / 다목적함", [("carrack", "Carrack"), ("frigate", "Frigate"), ("steamfrigate", "Steam Frigate"), ("cruiser", "Cruiser"), ("submarine", "Submarine")]),
    ("H", "HEAVY / 중포함", [("galleon", "Galleon"), ("ofline", "Ship of the Line"), ("ironclad", "Ironclad"), ("dreadnought", "Dreadnought"), ("carrier", "Carrier")]),
]
W, RH, LEFT = 1200, 190, 200
img = Image.new("RGBA", (W, 40 + RH * 3), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
gy = 40 + RH * 1.5
g = fit(Image.open(f"{SP}/ship_galley_0.png"), 170, 100)
img.alpha_composite(g, (15, int(gy - g.height / 2 - 14)))
text_c(d, 100, gy + g.height / 2 - 6, "Galley", font(24))
cw = (W - LEFT) / 5
for i, t in enumerate(["ERA 1", "ERA 2", "ERA 3", "ERA 4", "ERA 5"]):
    text_c(d, LEFT + cw * i + cw / 2, 4, t, font(22), (150, 120, 90, 255))
for r, (line, label, ships) in enumerate(rows):
    y0 = 40 + RH * r
    col = LINE_COL[line]
    # 갤리선에서 갈래로 가는 선
    d.line([(150, gy - 10), (LEFT + 2, y0 + RH / 2)], fill=col, width=7)
    d.rounded_rectangle([LEFT, y0 + 8, W - 6, y0 + RH - 8], radius=22, outline=col, width=4, fill=(255, 255, 255, 70))
    d.rounded_rectangle([LEFT + 14, y0 - 4, LEFT + 14 + d.textlength(label, font=font(22)) + 24, y0 + 26], radius=13, fill=col)
    d.text((LEFT + 26, y0 - 2), label, font=font(22), fill=CREAM)
    for i, (sid, name) in enumerate(ships):
        cx = LEFT + cw * i + cw / 2
        s = fit(Image.open(f"{SP}/ship_{sid}_0.png"), cw - 22, RH - 80)
        img.alpha_composite(s, (int(cx - s.width / 2), int(y0 + 38 + (RH - 86 - s.height) / 2)))
        text_c(d, cx, y0 + RH - 44, name, font(22))
        if i:
            ax, ay = LEFT + cw * i, y0 + RH / 2 - 8
            d.polygon([(ax - 9, ay - 13), (ax + 9, ay), (ax - 9, ay + 13)], fill=col)
img.save(f"{OUT}/ships.png")

# 2) 보스 줄 그림
bosses = [("boss_admiral_0", "Cat Admiral", "제독 기함"), ("boss_megashark_0", "Mega Shark", "거대 상어"),
          ("boss_rival_0", "Pirate King", "해적왕"), ("boss_fortress_0", "Sea Fortress", "해상 요새")]
W, H = 1200, 300
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
cw = W / 4
for i, (f, en, ko) in enumerate(bosses):
    cx = cw * i + cw / 2
    s = fit(Image.open(f"{SP}/{f}.png"), cw - 30, 200)
    img.alpha_composite(s, (int(cx - s.width / 2), int(10 + (200 - s.height) / 2)))
    text_c(d, cx, 220, en, font(30))
    text_c(d, cx, 258, ko, font(24), (150, 110, 80, 255))
img.save(f"{OUT}/bosses.png")


# 3) 조작 키
def key(d, x, y, w, label, f=font(34)):
    d.rounded_rectangle([x, y + 6, x + w, y + 66], radius=14, fill=(120, 85, 60, 255))
    d.rounded_rectangle([x, y, x + w, y + 60], radius=14, fill=CREAM, outline=INK, width=4)
    text_c(d, x + w / 2, y + 10, label, f)


groups = [
    ([("W", 64), ("S", 64)], "Sails up / down", "돛 올리기 / 내리기"),
    ([("A", 64), ("D", 64)], "Steer", "키 돌리기"),
    ([("Click", 120)], "Broadside to cursor", "마우스 쪽 일제 사격"),
    ([("Q", 64), ("E", 64)], "Left / right side", "왼쪽 / 오른쪽 뱃전"),
    ([("Space", 170)], "Both sides", "양쪽 뱃전"),
    ([("1", 64), ("2", 64), ("3", 64)], "Chain / Fire / Mortar", "체인샷 / 화염탄 / 폭격"),
]
W, CH = 1200, 170
img = Image.new("RGBA", (W, CH * 2), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
cw = W / 3
for i, (keys, en, ko) in enumerate(groups):
    cx, y = cw * (i % 3) + cw / 2, CH * (i // 3) + 10
    tw = sum(w for _, w in keys) + 12 * (len(keys) - 1)
    x = cx - tw / 2
    for lab, w in keys:
        key(d, x, y, w, lab, font(30 if len(lab) > 1 else 36))
        x += w + 12
    text_c(d, cx, y + 82, en, font(26))
    text_c(d, cx, y + 116, ko, font(22), (150, 110, 80, 255))
img.save(f"{OUT}/controls.png")


# 4) 스크린샷: 둥근 모서리 + 갈색 테두리
def framed(paths, name, w=1200, gap=16):
    ims = [Image.open(f"{ROOT}/pirate/art/itch/shots/{p}.png").convert("RGBA") for p in paths]
    cw = (w - gap * (len(ims) - 1)) // len(ims)
    ims = [i.resize((cw, round(i.height * cw / i.width)), Image.LANCZOS) for i in ims]
    h = max(i.height for i in ims)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for k, im in enumerate(ims):
        m = Image.new("L", im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=24, fill=255)
        im.putalpha(m)
        x = k * (cw + gap)
        out.alpha_composite(im, (x, 0))
        ImageDraw.Draw(out).rounded_rectangle([x, 0, x + im.width - 1, im.height - 1], radius=24, outline=INK, width=6)
    out.save(f"{OUT}/{name}.png")


framed(["u_broadside"], "shot_broadside")  # Unity 화면 (u_*), 웹 화면은 sea3_dread 등
framed(["u_seas"], "shot_seas")
framed(["u_boss_shark", "u_boss_fortress"], "shot_bosses")
print("ok")
