# 마젠타 배경 캐릭터 시트 → 칸마다 투명 PNG (PPT 용)
import sys
from PIL import Image
import numpy as np
def cut(src, name, cols, rows):
    im = np.array(Image.open(src).convert('RGBA')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mag = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    im[..., 3] = np.where(mag, 0, 255)
    # 가장자리 분홍 번짐 줄이기
    edge = (r > 180) & (b > 160) & (g < 150) & ~mag
    im[..., 3] = np.where(edge, 90, im[..., 3])
    H, W = im.shape[:2]
    out = Image.fromarray(im.astype('uint8'))
    for j in range(rows):
        for i in range(cols):
            c = out.crop((i * W // cols, j * H // rows, (i + 1) * W // cols, (j + 1) * H // rows))
            c = c.crop(c.getbbox())
            c.save(f'cut/{name}_{j * cols + i}.png')
S = '../../pirate/art/src/'
cut(S + 'flat/crew_capt.png', 'capt', 3, 2)
cut(S + 'flat/crew_wright.png', 'wright', 3, 2)
cut(S + 'crew_boss.png', 'boss', 2, 2)
cut(S + 'crew_cat.png', 'cat', 3, 2)
cut(S + 'crew_rat.png', 'rat', 3, 2)
# 오브젝트 · 아이템 기획서용 (Codex 시트 3x2)
cut('item_icons.png', 'item', 3, 2)
cut('objects.png', 'obj', 3, 2)
