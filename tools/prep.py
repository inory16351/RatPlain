"""Codex 원본 그림(art/src, 마젠타 배경) → 게임용 스프라이트(art/sprites) + sprites.js

- 마젠타를 투명으로, 가장자리 마젠타 번짐 제거
- 시트는 격자로 나눔. same=True 면 모든 칸을 같은 상자로 잘라(날갯짓 컷) 몸 위치가 흔들리지 않음
- 크기: 가로가 (게임 속 가로 × 2) 가 되게 (화면에서 0.5배로 그려 선명하게)
- 그림은 모두 탑뷰, 기수가 오른쪽

사용: python -I tools/prep.py
"""
import json
import os

import numpy as np
from scipy import ndimage
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'art')
SRC = os.path.join(ART, 'src')
OUT = os.path.join(ART, 'sprites')

# 이름: (열, 행, 게임 속 가로 px, 같은 상자로 자르기)
SHEETS = {
    'player': (1, 1, 125, False),
    # 진화 기체 (web/upgrades.js 의 FRAMES.spr) — 단계가 오를수록 조금씩 크게
    'player_mono': (1, 1, 120, False),
    'player_heavy': (1, 1, 140, False),
    'player_jet': (1, 1, 125, False),
    'player_fort': (1, 1, 175, False),
    'player_super': (1, 1, 135, False),
    'player_flywing': (1, 1, 190, False),
    # 2~5스테이지 적 · 보스 (web/game.js 의 FOE.spr)
    'e_swift': (2, 1, 70, True),
    'e_bomber': (1, 1, 150, False),
    'boss_eagle': (2, 1, 230, True),
    'boss_owl': (2, 1, 220, True),
    'boss_ship': (1, 1, 640, False),
    'boss_king': (1, 1, 400, False),
    # 파츠 아이콘 3×3 (web/upgrades.js 의 PARTS.icon)
    'parts_a': (3, 3, 46, False),
    'parts_b': (3, 3, 46, False),
    'e_cat': (1, 1, 130, False),
    'e_hawk': (2, 1, 120, True),
    'boss': (1, 1, 480, False),
    'items': (2, 2, 46, False),
    'clouds': (2, 2, 380, False),
    'islands': (2, 2, 560, False),
    # 이펙트 2×2: 폭발 · 연기 · 파편 · 깃털/털 (web/game.js 폭발)
    'fx': (2, 2, 90, False),
    # 타이틀 화면 키아트
    'title_art': (1, 1, 640, False),
}
# 작은 얼룩(떨어진 조각)을 지울 시트 — 아이콘처럼 한 덩어리인 것만
CLEAN = {'parts_a', 'parts_b', 'items'}
# 마젠타 없는 통 배경: 이름 → 게임 속 가로 px
BACKS = {'title_bg': 1280}
SCALE = 2


def key_magenta(img):
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g  # 마젠타 정도
    alpha = np.clip((190.0 - m) / 90.0, 0.0, 1.0)
    spill = (1.0 - alpha)[..., None]
    mag = np.array([255.0, 0.0, 255.0])
    rgb = np.where(alpha[..., None] > 0.02, (a - spill * mag) / np.maximum(alpha[..., None], 0.02), 0)
    return np.dstack([np.clip(rgb, 0, 255), alpha * 255.0]).astype(np.uint8)


def drop_specks(rgba, keep=0.15, thr=40):
    """가장 큰 덩어리의 keep 배 보다 작은 조각은 투명하게"""
    lab, n = ndimage.label(rgba[..., 3] > thr)
    if n < 2:
        return rgba
    area = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    small = np.isin(lab, 1 + np.where(area < area.max() * keep)[0])
    near = ndimage.binary_dilation(~small & (lab > 0), iterations=4)  # 큰 덩어리 가장자리 반투명은 살림
    out = rgba.copy()
    out[..., 3][small | (~near & (rgba[..., 3] <= thr) & (lab == 0) & ndimage.binary_dilation(small, iterations=4))] = 0
    return out


def bbox(alpha, thr=40):
    ys, xs = np.where(alpha > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):  # 옛 결과 지움 (이름이 바뀐 그림이 남지 않게)
        os.remove(os.path.join(OUT, f))
    meta = {}
    for name, (cols, rows, width, same) in SHEETS.items():
        p = os.path.join(SRC, name + '.png')
        if not os.path.exists(p):
            print('없음', name)
            continue
        rgba = key_magenta(Image.open(p))
        H, W = rgba.shape[:2]
        cw, ch = W // cols, H // rows
        cells = [rgba[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(rows) for c in range(cols)]
        if name in CLEAN:
            cells = [drop_specks(c) for c in cells]
        boxes = [bbox(c[..., 3]) for c in cells]
        if same:
            u = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
            boxes = [u] * len(cells)
        frames = []
        k = width * SCALE / (boxes[0][2] - boxes[0][0])  # 첫 칸 기준 배율 (같은 시트는 같은 배율)
        for i, (c, b) in enumerate(zip(cells, boxes)):
            pad = 3
            x0, y0, x1, y1 = max(b[0] - pad, 0), max(b[1] - pad, 0), min(b[2] + pad, cw), min(b[3] + pad, ch)
            im = Image.fromarray(c[y0:y1, x0:x1], 'RGBA')
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            fn = f'{name}_{i}.png'
            im.save(os.path.join(OUT, fn))
            frames.append({'img': fn, 'w': im.width / SCALE, 'h': im.height / SCALE})
        meta[name] = frames
        print(name, [(f['w'], f['h']) for f in frames])
    for name, width in BACKS.items():
        p = os.path.join(SRC, name + '.png')
        if not os.path.exists(p):
            print('없음', name)
            continue
        im = Image.open(p).convert('RGB')
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)  # 배경은 1배 (크게 쓰므로)
        fn = f'{name}_0.png'
        im.save(os.path.join(OUT, fn))
        meta[name] = [{'img': fn, 'w': im.width, 'h': im.height}]
        print(name, im.size)
    with open(os.path.join(OUT, 'sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'sprites.js'), 'w', encoding='utf-8') as f:
        f.write('window.SPRITES = ' + json.dumps(meta, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    main()
