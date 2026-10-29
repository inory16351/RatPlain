"""Codex 원본(pirate/art/src, 마젠타 배경) → 게임용 스프라이트(pirate/art/sprites) + sprites.js
자르기 · 마젠타 빼기는 비행기 게임 tools/prep.py 함수를 그대로 씀.
사용: C:/Project/underworld-proto/.venv/Scripts/python.exe -I pirate/tools/prep.py
"""
import json
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
    'items': (2, 2, 40), 'parts_a': (3, 3, 46), 'parts_u': (3, 3, 46),
}
CLEAN = {'items', 'parts_a', 'parts_u', 'crew_rat', 'crew_cat', 'crew_boss', 'shark_fin'}
BACKS = {'title_art': 1280}
SCALE = 2


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
        rgba = P.key_magenta(Image.open(p))
        H, W = rgba.shape[:2]
        cw, ch = W // cols, H // rows
        cells = [rgba[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(rows) for c in range(cols)]
        if name in CLEAN or cols * rows == 1:
            cells = [P.drop_specks(c, keep=0.05) for c in cells]
        boxes = [P.bbox(c[..., 3]) for c in cells]
        frames = []
        k = width * SCALE / (boxes[0][2] - boxes[0][0])
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
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        fn = f'{name}_0.jpg'
        im.save(os.path.join(OUT, fn), quality=88)
        meta[name] = [{'img': fn, 'w': im.width, 'h': im.height}]
        print(name, im.size)
    with open(os.path.join(OUT, 'sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'sprites.js'), 'w', encoding='utf-8') as f:
        f.write('window.SPRITES = ' + json.dumps(meta, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    main()
