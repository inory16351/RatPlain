# 쥐 해적 오브젝트 · 사용 아이템 테이블 → Pirat_Table/오브젝트 아이템 테이블.xlsx
# 기획서: Pirat_Plan/오브젝트, 아이템 시스템 기획서.md. 아직 게임에 없는 시스템이라 값은 초안 (플레이 테스트로 조정)
# 형식은 gen_pirate_table.py 와 같음: 1행 한글 이름, 2행 키, 3행 자료형, 4행부터 데이터, 특수 효과는 effectN + value_type
# 사용: uv run --with openpyxl python tools/gen_item_table.py
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Pirat_Table', '오브젝트 아이템 테이블.xlsx')
FONT = Font(name='맑은 고딕', size=11)
MID = Alignment(horizontal='center', vertical='center')


def sheet(wb, title, cols, rows):
    ws = wb.create_sheet(title)
    for r in range(3):
        ws.append([c[r] for c in cols])
    for row in rows:
        ws.append(row)
    for line in ws.iter_rows():
        for c in line:
            c.font, c.alignment = FONT, MID
    for i, c in enumerate(cols, 1):
        w = max(len(str(v)) * (2 if any(ord(ch) > 0x3000 for ch in str(v)) else 1.1) for v in [c[0], c[1]] + [r[i - 1] for r in rows])
        ws.column_dimensions[ws.cell(1, i).column_letter].width = min(60, max(9, w + 2))


def eff_cols(n):
    return [c for i in range(1, n + 1) for c in [(f'효과{i}', f'effect{i}', 'enum'), (f'효과{i} 값', f'e{i}_value', 'float')]]


def eff(*pairs, n=2):
    pairs = list(pairs) + [('None', 0)] * (n - len(pairs))
    return [x for p in pairs for x in p]


# 오브젝트: hp 0 = 파괴 불가, push_force 0 = 밀지 않음, drop_id 0 = 드랍 없음
OBJECTS = [
    [50001, '보물상자', 'treasure', 'Breakable', 'Wave', 30, 24, 0, 0, 0, 0, 52001, *eff(), 'obj_treasure', '포탄으로 파괴해야 재화 획득'],
    [50002, '보급 상자', 'supply', 'Breakable', 'Chunk', 40, 26, 0, 0, 0, 0, 52002, *eff(), 'obj_supply', '파괴 시 사용 아이템 · 소량 재화'],
    [50003, '폭탄 상자', 'bomb_crate', 'Obstacle', 'Chunk', 15, 26, 25, 45, 140, 0, 0, *eff(('Hit_All', 1)), 'obj_bomb', '부딪히면 피해, 터지면 주변 광역 피해 (적 포함)'],
    [50004, '암초', 'reef', 'Cover', 'Chunk', 0, 80, 0, 0, 0, 0, 0, *eff(('Block_Shot', 1), ('Hit_Slow', 0.5)), 'obj_reef', '적 포탄 차단, 파괴 불가, 충돌 시 감속'],
    [50005, '난파선', 'wreck', 'Cover', 'Chunk', 120, 70, 0, 0, 0, 0, 0, *eff(('Block_Shot', 1)), 'obj_wreck', '적 포탄 차단, 일정 피해 후 파괴'],
    [50006, '해류', 'current', 'Zone', 'Chunk', 0, 220, 0, 0, 0, 90, 0, *eff(('Flow_Speed_Mul', 1.3), ('Against_Speed_Mul', 0.7)), 'obj_current', '한 방향으로 밀림, 순방향 가속 · 역방향 감속'],
    [50007, '바람 구역', 'wind', 'Zone', 'Chunk', 0, 260, 0, 0, 0, 70, 0, *eff(('Shot_Push', 1)), 'obj_wind', '함선 · 포탄이 바람 방향으로 밀림'],
]
# 사용 아이템: duration 0 = 지속 시간 없음 (방어막은 횟수로 끝남)
ITEMS = [
    [51001, '무적기', 'invincible', 4, *eff(('Invincible', 1)), 10, 'item_invincible', '일정 시간 모든 피해 무시'],
    [51002, '방어막', 'shield', 0, *eff(('Shield_Count', 3)), 25, 'item_shield', '공격을 정해진 횟수만큼 막음'],
    [51003, '부스터', 'booster', 1.2, *eff(('Speed_Mul', 2.6), ('Ram_Dmg', 40)), 25, 'item_booster', '빠르게 전진, 부딪힌 적에게 피해'],
    [51004, '포탄 강화', 'power_shot', 8, *eff(('Shot_Dmg_Mul', 1.5), ('Shot_Splash', 60)), 20, 'item_power_shot', '포탄 피해 · 범위 증가'],
    [51005, '사격 속도 강화', 'rapid_fire', 6, *eff(('Reload_Min', 0.25)), 20, 'item_rapid_fire', '장전 거의 없음 (내부 최소 간격 유지)'],
]
# 드랍: 아이템은 Use_Item 의 drop_weight 비율로 고름
DROPS = [
    [52001, '보물상자', 'Object', 25, 50, 6, 0],
    [52002, '보급 상자', 'Object', 5, 10, 0, 0.8],
    [52003, '일반 적', 'Enemy', 0, 0, 0, 0.06],
    [52004, '보스', 'Enemy', 0, 0, 0, 0],
]
VT = [
    ['None', '효과 없음', '-'],
    ['Hit_All', '폭발이 플레이어 · 적 모두에게 피해', '1 = 켬'],
    ['Block_Shot', '포탄을 막음 (플레이어 · 적 공통)', '1 = 켬'],
    ['Hit_Slow', '충돌 시 함선 속도 × 값', '속도 배율'],
    ['Flow_Speed_Mul', '흐름 방향으로 움직일 때 속도 × 값', '속도 배율'],
    ['Against_Speed_Mul', '흐름 반대로 움직일 때 속도 × 값', '속도 배율'],
    ['Shot_Push', '구역 안 포탄도 밀림', '1 = 켬'],
    ['Invincible', '모든 피해 무시', '1 = 켬'],
    ['Shield_Count', '공격을 값만큼 막는 방어막', '막는 횟수'],
    ['Speed_Mul', '함선 속도 × 값', '속도 배율'],
    ['Ram_Dmg', '부딪힌 적에게 피해', '피해량'],
    ['Shot_Dmg_Mul', '포탄 피해 × 값', '피해 배율'],
    ['Shot_Splash', '포탄 착탄 지점 폭발', '폭발 반지름'],
    ['Reload_Min', '장전 시간을 값(초)으로 고정 (내부 최소 간격)', '최소 간격 (초)'],
]

wb = Workbook()
wb.remove(wb.active)
sheet(wb, 'Object', [('오브젝트 id', 'object_id', 'int'), ('오브젝트 이름', 'object_name', 'string'), ('코드 id', 'code_id', 'string'), ('분류', 'object_type', 'enum'),
                     ('생성 시점', 'spawn', 'enum'), ('체력 (0 = 파괴 불가)', 'hp', 'float'), ('반지름', 'radius', 'float'), ('충돌 피해', 'contact_dmg', 'float'),
                     ('폭발 피해', 'explode_dmg', 'float'), ('폭발 반지름', 'explode_radius', 'float'), ('미는 힘', 'push_force', 'float'), ('드랍 id (0 = 없음)', 'drop_id', 'int')]
      + eff_cols(2) + [('그림', 'asset', 'string'), ('설명', 'object_desc', 'string')], OBJECTS)
sheet(wb, 'Use_Item', [('아이템 id', 'item_id', 'int'), ('아이템 이름', 'item_name', 'string'), ('코드 id', 'code_id', 'string'), ('지속 시간 (초, 0 = 없음)', 'duration', 'float')]
      + eff_cols(2) + [('드랍 가중치', 'drop_weight', 'float'), ('아이콘', 'icon', 'string'), ('설명', 'item_desc', 'string')], ITEMS)
sheet(wb, 'Drop', [('드랍 id', 'drop_id', 'int'), ('드랍 출처', 'source_name', 'string'), ('출처 분류', 'source_type', 'enum'), ('금화 최소', 'gold_min', 'int'),
                   ('금화 최대', 'gold_max', 'int'), ('목재', 'plank', 'int'), ('아이템 확률', 'item_chance', 'float')], DROPS)
sheet(wb, 'Object_Type', [('분류', 'object_type', 'enum'), ('정의', 'desc', '-')],
      [['Breakable', '파괴하면 내용물 드랍'], ['Obstacle', '피해야 하는 장애물, 역이용 가능'], ['Cover', '포탄을 막는 은신처'], ['Zone', '들어가면 함선 · 포탄이 밀리는 구역']])
sheet(wb, 'Spawn', [('생성 시점', 'spawn', 'enum'), ('정의', 'desc', '-')], [['Wave', '웨이브마다 생성'], ['Chunk', '맵 구역 생성 시 고정 배치']])
sheet(wb, 'Value_Type', [('값 타입', 'value_type', 'enum'), ('정의', 'desc', '-'), ('값 의미', 'value', '-')], VT)
sheet(wb, 'Item_Config', [('키', 'key', 'string'), ('값', 'value', 'float'), ('설명', '-', '-')], [
    ['hold_max', 1, '동시에 들 수 있는 사용 아이템 수 (새로 주우면 교체)'],
    ['drop_life', 12, '드랍된 아이템이 바다에 남는 시간 (초)'],
    ['drop_blink', 3, '사라지기 전 깜빡이는 시간 (초)'],
    ['treasure_per_wave', 2, '웨이브마다 생기는 보물상자 수'],
])
sheet(wb, 'Column_Desc', [('칼럼', 'column', '-'), ('설명', 'desc', '-')], [
    ['상태', '초안 값. 아직 게임에 없는 시스템이라 플레이 테스트로 조정'],
    ['object_id', '50001~ = 오브젝트, 51001~ = 사용 아이템, 52001~ = 드랍'],
    ['hp', '0 = 파괴 불가 (암초 · 해류 · 바람 구역)'],
    ['push_force', '해류 · 바람 구역이 미는 힘 (픽셀/초)'],
    ['effectN / eN_value', '특수 효과 (Value_Type)'],
    ['Drop.item_chance', '드랍 시 사용 아이템이 나올 확률. 종류는 Use_Item.drop_weight 비율'],
    ['사용 키', 'F (기획서)'],
])
wb.save(OUT)
print('saved', OUT)
