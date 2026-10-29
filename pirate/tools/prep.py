"""Codex 원본(pirate/art/src, 마젠타 배경) → 게임용 스프라이트(pirate/art/sprites) + sprites.js
자르기 · 마젠타 빼기는 비행기 게임 tools/prep.py 함수를 그대로 씀.
사용: C:/Project/underworld-proto/.venv/Scripts/python.exe -I pirate/tools/prep.py
"""
import json

import numpy as np
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools'))
import prep as P  # noqa: E402
from PIL import Image  # noqa: E402

ART = os.path.join(HERE, '..', 'art')
SRC = os.path.join(ART, 'src')
OUT = os.path.join(ART, 'sprites')

# 이름: (열, 행, 게임 속 가로 px) — 배 가로 = ships.js 의 len, 적 = game.js 의 FOES.len
SHEETS = {
    'ship_galley': (1, 1, 84), 'ship_caravel': (1, 1, 90), 'ship_clipper': (1, 1, 104), 'ship_paddle': (1, 1, 110),
    'ship_torpedo': (1, 1, 116), 'ship_missile': (1, 1, 120), 'ship_carrack': (1, 1, 96), 'ship_frigate': (1, 1, 110),
    'ship_steamfrigate': (1, 1, 118), 'ship_cruiser': (1, 1, 126), 'ship_submarine': (1, 1, 124), 'ship_galleon': (1, 1, 104),
    'ship_ofline': (1, 1, 128), 'ship_ironclad': (1, 1, 124), 'ship_dreadnought': (1, 1, 150), 'ship_carrier': (1, 1, 190),
    'e_cat_sloop': (1, 1, 76), 'e_cat_frigate': (1, 1, 104), 'e_cat_mortar': (1, 1, 84), 'e_cat_speeder': (1, 1, 50),
    'e_cat_ironclad': (1, 1, 112), 'e_rat_rival': (1, 1, 92), 'e_shark': (1, 1, 60),
    'boss_admiral': (1, 1, 210), 'boss_rival': (1, 1, 210), 'boss_megashark': (1, 1, 230), 'boss_fortress': (1, 1, 300),
    'shark_fin': (2, 1, 34),
    # 선원 리깅: 배 그림은 갑판이 비어 있고, 선원은 game.js 의 CREW_SPOTS 자리에 따로 올림 (얼굴은 오른쪽 = 뱃머리)
    'crew_rat': (3, 2, 24), 'crew_cat': (3, 2, 24), 'crew_boss': (2, 2, 34),
    # 배 단계(시대)마다 선원 모습: t0 갤리 노꾼, (t1~2 = crew_rat 해적), t3 증기선, t4 강철 군함, t5 현대. 선장은 같은 인물
    'crew_rat_t0': (3, 2, 24), 'crew_rat_t3': (3, 2, 24), 'crew_rat_t4': (3, 2, 24), 'crew_rat_t5': (3, 2, 24), 'crew_rival': (3, 2, 24),
    # 시대별 선장 (칸 = 배 단계 0~5) · 조선공 쥐 (칸 = 테크 0~5)
    'crew_capt': (3, 2, 24), 'crew_wright': (3, 2, 24),
    'items': (2, 2, 40), 'parts_a': (3, 3, 46), 'parts_u': (3, 3, 46),
    # 바다 장식 · UI (같은 그림체)
    'islands': (2, 2, 300), 'sea_deco': (3, 3, 70), 'ui_icons': (3, 3, 48), 'ui_frames': (3, 3, 160), 'ui_hud': (4, 4, 48),
}
CLEAN = {'items', 'parts_a', 'parts_u', 'crew_rat', 'crew_cat', 'crew_boss', 'shark_fin', 'crew_rat_t0', 'crew_rat_t3', 'crew_rat_t4', 'crew_rat_t5', 'crew_rival', 'crew_capt', 'crew_wright',
         'islands', 'sea_deco', 'ui_icons', 'ui_frames', 'ui_hud'}
# 칸마다 크기가 제각각인 시트 → 첫 칸 기준이 아니라 칸마다 긴 변 = width
EACH = {'islands', 'sea_deco', 'ui_icons', 'ui_frames', 'ui_hud', 'parts_a', 'parts_u', 'items'}
BACKS = {'title_art': 1280, 'map_chart': 1280}
# 바다 바닥 무늬: 격자 칸을 그대로 잘라 (마젠타 없음) 정사각 타일로
TILES = {'sea_tiles': (4, 2, 256)}
SCALE = 2
SHIP_K = 1.8  # game.js 의 SHIP_K 와 같게: 배 · 적 배 · 보스 배는 len 보다 1.8배 크게 그림 (선원이 갑판에 올라가게)


def load_rgba(path):
    """마젠타 배경이면 마젠타를 빼고, 이미 투명 배경(Codex 가 가끔 그렇게 줌)이면 알파를 그대로 씀"""
    im = Image.open(path)
    if im.mode == 'RGBA':
        a = np.asarray(im)
        if (a[..., 3] < 10).mean() > 0.2:
            return a.copy()
    return P.key_magenta(im)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    meta = {}
    for name, (cols, rows, width) in SHEETS.items():
        p = os.path.join(SRC, name + '.png')
        if not os.path.exists(p):
            print('없음', name)
            continue
        rgba = load_rgba(p)
        H, W = rgba.shape[:2]
        cw, ch = W // cols, H // rows
        cells = [rgba[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(rows) for c in range(cols)]
        if name in CLEAN or cols * rows == 1:
            cells = [P.drop_specks(c, keep=0.05) for c in cells]
        boxes = [P.bbox(c[..., 3]) for c in cells]
        frames = []
        if name.startswith(('ship_', 'e_cat', 'e_rat', 'boss_')) and name != 'boss_megashark':
            width *= SHIP_K
        k = width * SCALE / (boxes[0][2] - boxes[0][0])
        for i, (c, b) in enumerate(zip(cells, boxes)):
            if name in EACH:
                k = width * SCALE / max(b[2] - b[0], b[3] - b[1])
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
        a = np.asarray(im).astype(np.int32)
        mag = (a[..., 0] > 200) & (a[..., 1] < 80) & (a[..., 2] > 200)
        if mag.mean() > 0.02:  # 마젠타 테두리가 있으면 그림(종이) 부분만 + 찢긴 가장자리 사이 마젠타는 어두운 나무색으로
            keyed = P.key_magenta(im).astype(np.float32)
            al = keyed[..., 3:4] / 255
            wood = np.array([46, 34, 24], np.float32)
            im = Image.fromarray((keyed[..., :3] * al + wood * (1 - al)).astype(np.uint8))
            ys, xs = np.nonzero(~mag)
            im = im.crop((xs.min() + 2, ys.min() + 2, xs.max() - 2, ys.max() - 2))
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        fn = f'{name}_0.jpg'
        im.save(os.path.join(OUT, fn), quality=88)
        meta[name] = [{'img': fn, 'w': im.width, 'h': im.height}]
        print(name, im.size)
    for name, (cols, rows, size) in TILES.items():
        p = os.path.join(SRC, name + '.png')
        if not os.path.exists(p):
            print('없음', name)
            continue
        im = Image.open(p).convert('RGB')
        cw, ch = im.width // cols, im.height // rows
        frames = []
        for i in range(cols * rows):
            x, y = (i % cols) * cw, (i // cols) * ch
            m = max(2, cw // 40)  # 칸 경계 번짐을 조금 잘라 냄
            t = im.crop((x + m, y + m, x + cw - m, y + ch - m)).resize((size, size), Image.LANCZOS)
            fn = f'{name}_{i}.jpg'
            t.save(os.path.join(OUT, fn), quality=90)
            frames.append({'img': fn, 'w': size, 'h': size})
        meta[name] = frames
        print(name, len(frames))
    with open(os.path.join(OUT, 'sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'sprites.js'), 'w', encoding='utf-8') as f:
        f.write('window.SPRITES = ' + json.dumps(meta, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    main()
