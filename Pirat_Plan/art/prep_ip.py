# 추가 IP 소개 PPT 용 그림 준비: Codex ip_*.png → crop/ (비율 맞춤) · cut/ (마젠타 빼고 투명)
# 사용: python Pirat_Plan/art/prep_ip.py
import os
import numpy as np
from PIL import Image

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def key_out(src):
    im = np.array(Image.open(src).convert('RGBA')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mag = (r > 150) & (b > 150) & (g < 110) & (np.abs(r - b) < 90)
    im[..., 3] = np.where(mag, 0, 255)
    edge = (r > 180) & (b > 160) & (g < 150) & ~mag
    im[..., 3] = np.where(edge, 90, im[..., 3])
    return Image.fromarray(im.astype('uint8'))


# 표지: 16:9 로 맞추면서 왼쪽 빈 하늘 · 바다를 거울 복사로 넓혀 제목 자리 확보
cov = Image.open('ip_cover.png').convert('RGB')
w, h = cov.size
add = round(h * 16 / 9) - w
left = cov.crop((0, 0, add, h)).transpose(Image.FLIP_LEFT_RIGHT)
wide = Image.new('RGB', (w + add, h))
wide.paste(left, (0, 0))
wide.paste(cov, (add, 0))
wide.save('crop/ip_cover.jpg', quality=92)

Image.open('ip_broadside.png').convert('RGB').save('crop/ip_broadside.jpg', quality=92)

# 뽑기: 통째로 투명 처리 후 내용만
g = key_out('ip_gacha.png')
g.crop(g.getbbox()).save('cut/ip_gacha.png')

# 함선 진화: 투명 열 간격으로 5척 분리
e = key_out('ip_evolution.png')
a = np.array(e)[..., 3] > 128
cols = a.sum(0) > 2
runs, x = [], 0
while x < len(cols):
    if cols[x]:
        s = x
        while x < len(cols) and cols[x]:
            x += 1
        runs.append((s, x))
    x += 1
# 작은 조각(연기 · 깃발 틈)은 옆 배에 붙임
merged = []
for s, t in runs:
    if merged and s - merged[-1][1] < 12:
        merged[-1] = (merged[-1][0], t)
    else:
        merged.append((s, t))
merged = [m for m in merged if m[1] - m[0] > 40]
print('ships', len(merged), merged)
assert len(merged) == 5
for i, (s, t) in enumerate(merged):
    c = e.crop((s, 0, t, e.size[1]))
    c.crop(c.getbbox()).save(f'cut/ip_evo_{i}.png')
