"""쥐 해적선: Codex 원본 그림(sea/art/src, 마젠타 배경) → 게임용 스프라이트(sea/art/sprites) + sprites.js

마젠타 빼기 · 격자 자르기 · 크기 맞춤은 비행기 게임 tools/prep.py 를 그대로 씀.
그림은 모두 탑뷰, 뱃머리가 오른쪽 (코드에서 돌림). 가로 = 게임 속 배 길이(px).

사용: python -I sea/tools/prep.py
"""
import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('plane_prep', os.path.join(HERE, '..', '..', 'tools', 'prep.py'))
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)

P.SRC = os.path.join(HERE, '..', 'art', 'src')
P.OUT = os.path.join(HERE, '..', 'art', 'sprites')
# 이름: (열, 행, 게임 속 가로 px, 같은 상자로 자르기)
P.SHEETS = {
    # 쥐 해적선 (sea/js/data.js 의 SHIPS.spr)
    'r_sloop': (1, 1, 100, False),
    'r_cutter': (1, 1, 104, False),
    'r_clipper': (1, 1, 128, False),
    'r_storm': (1, 1, 140, False),
    'r_brig': (1, 1, 112, False),
    'r_bomb': (1, 1, 122, False),
    'r_ironbrig': (1, 1, 138, False),
    'r_frigate': (1, 1, 126, False),
    'r_galleon': (1, 1, 148, False),
    'r_fortress': (1, 1, 172, False),
    # 고양이 해군 · 흑쥐 해적단 · 상어 (sea/js/data.js 의 FOES.spr)
    'c_sloop': (1, 1, 84, False),
    'c_speed': (1, 1, 56, False),
    'c_frigate': (1, 1, 112, False),
    'c_mortar': (1, 1, 96, False),
    'boss_c_iron': (1, 1, 250, False),
    'boss_c_admiral': (1, 1, 290, False),
    'rr_ship': (1, 1, 100, False),
    'boss_rr': (1, 1, 250, False),
    'shark': (1, 1, 64, False),
    'boss_shark': (1, 1, 210, False),
    # 아이템 2×2: 치즈 금화 · 보물상자 · 폭탄통 · 물에 빠진 쥐
    'items': (2, 2, 46, False),
    # 장비 아이콘 3×3 (sea/js/data.js 의 SLOT_TYPES.icon)
    'parts_a': (3, 3, 46, False),
    'parts_b': (3, 3, 46, False),
    'title_art': (1, 1, 640, False),
}
P.CLEAN = {'parts_a', 'parts_b', 'items'}
P.BACKS = {}

if __name__ == '__main__':
    P.main()
