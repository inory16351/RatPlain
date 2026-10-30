# 쥐 해적 데이터 → Pirat_Table/*.xlsx (배 · 장비 · 적 · 바다)
# 형식은 NKK Data_Table 과 같음: 1행 한글 이름, 2행 키, 3행 자료형(string · enum · int · float), 4행부터 데이터
# 특수 효과는 effectN (value_type) + eN_value 로 씀. 정의는 각 파일의 Value_Type 시트
# 사용: uv run --with openpyxl python tools/gen_pirate_table.py   (node tools/pirate_dump.js 를 안에서 부름)
import json, os, subprocess
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'Pirat_Table')
D = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'pirate_dump.js')]).decode('utf-8'))

FONT = Font(name='맑은 고딕', size=11)
MID = Alignment(horizontal='center', vertical='center')


def sheet(wb, title, cols, rows):
    """cols = [(한글 이름, 키, 자료형)], rows = [[값 …]]"""
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
    return ws


def book(name, sheets):
    wb = Workbook()
    wb.remove(wb.active)
    for s in sheets:
        sheet(wb, *s)
    wb.save(os.path.join(OUT, name))


def num(v):
    return int(v) if float(v).is_integer() else round(v, 4)


# ── 값 타입: (코드 키, add/mul) → (value_type, 정의, 값 뜻)
VT = {
    ('hp', 'add'): ('Hp_Add', '선체(최대 체력) + 값', '더하는 체력'),
    ('guns', 'add'): ('Guns_Add', '뱃전 한쪽 대포 수 + 값', '더하는 대포 수'),
    ('dmg', 'add'): ('Dmg_Add', '포탄 위력 + 값', '더하는 위력'),
    ('crit', 'add'): ('Crit_Add', '치명타 확률 + 값 (치명타 = 피해 ×2)', '확률 (0.1 = 10%)'),
    ('repair', 'add'): ('Repair_Add', '웨이브 사이 수리량 + 값', '더하는 수리량'),
    ('pickup', 'add'): ('Pickup_Add', '보물 · 선원 줍기 거리 + 값', '더하는 거리'),
    ('ram', 'add'): ('Ram', '부딪힌 적에게 피해, 내 배는 박치기 피해 안 받음', '박치기 피해'),
    ('goldBonus', 'add'): ('Gold_Bonus', '금화 획득 ×(1 + 합)', '증가율 (0.1 = 10%)'),
    ('plankBonus', 'add'): ('Plank_Bonus', '목재 획득 ×(1 + 합)', '증가율'),
    ('mortarDmg', 'add'): ('Mortar_Dmg_Add', '폭격 위력 + 값', '더하는 위력'),
    ('mortarR', 'add'): ('Mortar_Range_Add', '폭격 반지름 + 값', '더하는 반지름'),
    ('crewMax', 'add'): ('Crew_Max_Add', '선원 효과 최대 인원 + 값', '더하는 인원'),
    ('crewReload', 'add'): ('Crew_Reload_Add', '선원 1명당 장전 감소율 + 값', '감소율 (0.01 = 1%)'),
    ('crewHeal', 'add'): ('Crew_Heal', '물에 빠진 선원을 건지면 체력 + 값', '회복량'),
    ('stormGuard', 'add'): ('Storm_Guard', '바람 · 번개 · 소용돌이 피해/밀림 감소 (최대 0.9)', '감소율'),
    ('vision', 'add'): ('Vision_Add', '안개 속 시야 + 값', '더하는 거리'),
    ('evade', 'add'): ('Evade', '맞을 때 빗나갈 확률 (최대 0.5)', '확률'),
    ('plunder', 'add'): ('Plunder', '적을 격침하면 최대 체력 비율만큼 회복', '회복 비율'),
    ('chainAll', 'add'): ('Chain_All', '모든 포탄이 확률로 체인샷 (적 느려짐)', '확률'),
    ('burnAll', 'add'): ('Burn_All', '모든 포탄이 확률로 불붙임', '확률'),
    ('double', 'add'): ('Double_Shot', '일제 사격이 확률로 한 번 더 나감', '확률'),
    ('splash', 'add'): ('Splash', '포탄이 맞은 곳에서 폭발 (주변 적 피해 50%)', '폭발 반지름'),
    ('kraken', 'add'): ('Kraken', '체인샷이 맞으면 주변 적도 묶음', '묶는 시간 (초)'),
    ('autoMortar', 'add'): ('Auto_Mortar', '가장 가까운 적에게 자동 폭격', '간격 (초)'),
    ('bow', 'add'): ('Bow_Gun', '선수포: 앞쪽 가까운 적에게 자동 사격', '간격 (초)'),
    ('bowDmg', 'add'): ('Bow_Dmg_Add', '선수포 위력 + 값', '더하는 위력'),
    ('torpedo', 'add'): ('Torpedo', '어뢰: 마우스 쪽으로 곧게 발사', '간격 (초)'),
    ('torpedoDmg', 'add'): ('Torpedo_Dmg_Add', '어뢰 위력 + 값', '더하는 위력'),
    ('missile', 'add'): ('Missile', '유도탄 자동 발사', '간격 (초)'),
    ('missileDmg', 'add'): ('Missile_Dmg_Add', '유도탄 위력 + 값', '더하는 위력'),
    ('planes', 'add'): ('Planes', '함재기 수 (배 둘레를 돌며 쏨, 최대 8)', '더하는 수'),
    ('planeDmg', 'add'): ('Plane_Dmg_Add', '함재기 위력 + 값', '더하는 위력'),
    ('chain', 'add'): ('Chain_Shot', '체인샷 스킬 (1번 키) 사용 가능', '재사용 (초)'),
    ('fire', 'add'): ('Fire_Shot', '화염탄 스킬 (2번 키) 사용 가능', '재사용 (초)'),
    ('mortar', 'add'): ('Mortar', '폭격 스킬 (3번 키) 사용 가능', '재사용 (초)'),
    ('dmg', 'mul'): ('Dmg_Mul', '포탄 위력 × 값', '배율 (1.1 = +10%)'),
    ('reload', 'mul'): ('Reload_Mul', '장전 시간 × 값', '배율 (0.9 = −10%)'),
    ('speed', 'mul'): ('Speed_Mul', '속도 × 값', '배율'),
    ('turn', 'mul'): ('Turn_Mul', '회전 × 값', '배율'),
    ('range', 'mul'): ('Range_Mul', '사거리 × 값', '배율'),
    ('dmgTaken', 'mul'): ('Dmg_Taken_Mul', '받는 피해 × 값', '배율 (0.8 = −20%)'),
    ('chain', 'mul'): ('Chain_Cd_Mul', '체인샷 재사용 × 값', '배율'),
    ('fire', 'mul'): ('Fire_Cd_Mul', '화염탄 재사용 × 값', '배율'),
    ('bow', 'mul'): ('Bow_Cd_Mul', '선수포 간격 × 값', '배율'),
    ('torpedo', 'mul'): ('Torpedo_Cd_Mul', '어뢰 간격 × 값', '배율'),
    ('missile', 'mul'): ('Missile_Cd_Mul', '유도탄 간격 × 값', '배율'),
}


def effects(o, n):
    """add · mul → [type, value] × n 칸 (빈 칸 = None, 0)"""
    out = [(VT[(k, 'add')][0], num(v)) for k, v in (o.get('add') or {}).items()]
    out += [(VT[(k, 'mul')][0], num(v)) for k, v in (o.get('mul') or {}).items()]
    assert len(out) <= n, (o.get('id'), out)
    out += [('None', 0)] * (n - len(out))
    return [x for e in out for x in e]


def eff_cols(n):
    return [c for i in range(1, n + 1) for c in [(f'효과{i}', f'effect{i}', 'enum'), (f'효과{i} 값', f'e{i}_value', 'float')]]


SHIP_ID = {s['id']: 10001 + i for i, s in enumerate(D['ships'])}
# 배마다 거의 다 있는 수치는 칼럼으로 (한글, 키, 코드 키, add/mul). 나머지는 effectN
SHIP_STAT = [('선체 +', 'hp_add', 'hp', 'add'), ('대포 +', 'guns_add', 'guns', 'add'), ('속도 ×', 'speed_mul', 'speed', 'mul'), ('회전 ×', 'turn_mul', 'turn', 'mul'),
             ('포탄 위력 ×', 'dmg_mul', 'dmg', 'mul'), ('받는 피해 ×', 'dmg_taken_mul', 'dmgTaken', 'mul'), ('사거리 ×', 'range_mul', 'range', 'mul'),
             ('체인샷 재사용 (0 = 없음)', 'chain_cd', 'chain', 'add'), ('화염탄 재사용', 'fire_cd', 'fire', 'add'), ('폭격 재사용', 'mortar_cd', 'mortar', 'add'),
             ('선수포 간격', 'bow_cd', 'bow', 'add'), ('선수포 위력 +', 'bow_dmg_add', 'bowDmg', 'add'), ('어뢰 간격', 'torpedo_cd', 'torpedo', 'add'),
             ('어뢰 위력 +', 'torpedo_dmg_add', 'torpedoDmg', 'add'), ('유도탄 간격', 'missile_cd', 'missile', 'add'), ('함재기 수', 'planes', 'planes', 'add')]
SLOT_KEYS = list(D['slotTypes'])
LINE = lambda l: l or 'None'

# ── 배 테이블
ship_cols = [('배 id', 'ship_id', 'int'), ('배 이름', 'ship_name', 'string'), ('코드 id', 'code_id', 'string'), ('배 종류', 'ship_kind', 'string'),
             ('티어', 'tier', 'int'), ('갈래', 'line', 'enum'), ('트리 줄', 'row', 'int'), ('앞 배 (0 = 없음)', 'req_ship', 'int'),
             ('목재 비용', 'cost_plank', 'int'), ('금화 비용', 'cost_coin', 'int'), ('길이', 'length', 'float')] + \
            [(f'슬롯_{i:02d}', f'slot_{i:02d}', 'enum') for i in range(1, 8)] + \
            [(n, c, 'float') for n, c, _, _ in SHIP_STAT] + eff_cols(3) + \
            [('그림', 'asset', 'string'), ('배 설명', 'ship_desc', 'string')]
ship_rows = []
for s in D['ships']:
    add, mul = dict(s.get('add') or {}), dict(s.get('mul') or {})
    stat = [num((add if kind == 'add' else mul).pop(k, 0 if kind == 'add' else 1)) for _, _, k, kind in SHIP_STAT]
    ship_rows.append([SHIP_ID[s['id']], s['name'], s['id'], s['kind'], s['tier'], LINE(s['line']), s['row'], SHIP_ID.get(s['req'], 0),
                      s['cost'][0], s['cost'][1], s['len']] + (s['slots'] + ['None'] * 7)[:7] + stat + effects({'id': s['id'], 'add': add, 'mul': mul}, 3) + ['ship_' + s['id'], s['desc']])

base_desc = {
    'hp': '선체 (최대 체력)', 'speed': '속도', 'turn': '회전 (라디안/초)', 'dmgTaken': '받는 피해 배율', 'guns': '뱃전 한쪽 대포 수', 'reload': '장전 시간 (초)',
    'dmg': '포탄 위력', 'crit': '치명타 확률', 'range': '사거리 배율', 'ballSpd': '포탄 속도', 'pickup': '줍기 거리', 'crewMax': '선원 효과 최대 인원',
    'crewReload': '선원 1명당 장전 감소율', 'repair': '웨이브 사이 수리', 'goldBonus': '금화 보너스', 'plankBonus': '목재 보너스',
    'chain': '체인샷 재사용 (0 = 없음)', 'fire': '화염탄 재사용 (0 = 없음)', 'mortar': '폭격 재사용 (0 = 없음)', 'mortarDmg': '폭격 위력', 'mortarR': '폭격 반지름',
    'bow': '선수포 간격 (0 = 없음)', 'bowDmg': '선수포 위력', 'torpedo': '어뢰 간격 (0 = 없음)', 'torpedoDmg': '어뢰 위력', 'missile': '유도탄 간격 (0 = 없음)',
    'missileDmg': '유도탄 위력', 'planes': '함재기 수', 'planeDmg': '함재기 위력', 'ram': '박치기 피해', 'splash': '포탄 폭발 반지름', 'burnAll': '모든 포탄 화염 확률',
    'chainAll': '모든 포탄 체인샷 확률', 'plunder': '격침 시 회복 비율', 'evade': '빗나감 확률', 'double': '일제 사격 한 번 더 확률', 'autoMortar': '자동 폭격 간격 (0 = 없음)',
    'crewHeal': '선원 구조 시 회복', 'kraken': '크라켄 묶음 시간', 'stormGuard': '날씨 피해 감소', 'vision': '안개 속 시야',
}
vt_rows = [[t, d, m, '더함' if kind == 'add' else '곱함'] for (k, kind), (t, d, m) in VT.items()]
vt_sheet = ('Value_Type', [('값 타입', 'value_type', 'enum'), ('정의', 'desc', '-'), ('값 의미', 'value', '-'), ('계산', 'calc', '-')], [['None', '효과 없음', '-', '-']] + vt_rows)

os.makedirs(OUT, exist_ok=True)
book('배 테이블.xlsx', [
    ('Ship', ship_cols, ship_rows),
    ('Base_Stat', [('키', 'key', 'string'), ('값', 'value', 'float'), ('설명', '-', '-')], [[k, num(v), base_desc.get(k, '')] for k, v in D['base'].items()]),
    ('Line', [('갈래', 'line', 'enum'), ('갈래 이름', 'line_name', 'string'), ('설명', '-', '-')],
     [['None', '공용', '갤리선 전용 (모든 갈래에 이어짐)'], ['S', D['lines']['S'], '위 줄 · 빠름'], ['M', D['lines']['M'], '가운데 줄 · 특수탄 · 어뢰'], ['H', D['lines']['H'], '아래 줄 · 튼튼 · 대포 많음']]),
    ('Tier', [('티어', 'tier', 'int'), ('시대 이름', 'era_name', 'string'), ('색', 'color', 'string')], [[i, e, D['tierCol'][i]] for i, e in enumerate(D['eras'])]),
    ('Slot_Type', [('슬롯', 'slot', 'enum'), ('슬롯 이름', 'slot_name', 'string'), ('일반 아이콘 칸', 'icon', 'int'), ('고유 아이콘 칸', 'uicon', 'int')],
     [['None', '없음', 0, 0]] + [[k, v['name'], v['icon'], v['uicon']] for k, v in D['slotTypes'].items()]),
    vt_sheet,
    ('Column_Desc', [('칼럼', 'column', '-'), ('설명', 'desc', '-')], [
        ['수치 계산', 'Base_Stat → 배 · 장비 효과 중 더함 전부 → 곱함 전부 (ships.js compute)'],
        ['line', '갈래. 같은 갈래 장비만 낄 수 있음 (장비 테이블 fit_line)'],
        ['req_ship', '이 배를 가져야 살 수 있음'],
        ['slot_01 ~ 07', '이 배에 끼울 수 있는 장비 슬롯 (Slot_Type)'],
        ['hp_add ~ planes', '배가 Base_Stat 에 더하거나(+) 곱하는(×) 수치. 재사용 · 간격 0 = 그 무기 없음'],
        ['effectN / eN_value', '그 밖의 배 고유 효과 (Value_Type, 박치기 · 날씨 감소 · 시야 등)'],
        ['length', '게임 속 길이. 그림은 × 1.8 로 그림 (game.js SHIP_K)'],
    ]),
])

# ── 장비 테이블
part_rows = []
n_tpl = n_uni = 0
for p in D['parts']:
    if p['grade'] >= 2:
        n_uni += 1; pid = 21000 + n_uni
    else:
        n_tpl += 1; pid = 20000 + n_tpl
    lines = p['lines'] or ['S', 'M', 'H']
    part_rows.append([pid, p['name'], p['id'], SHIP_ID[p['ship']], p['slot'], p['grade'], p['tier'], ','.join(lines)] + effects(p, 4) + [f"{p['icon'][0]}_{p['icon'][1]}", p['desc']])
book('장비 테이블.xlsx', [
    ('Equipment', [('장비 id', 'item_id', 'int'), ('장비 이름', 'item_name', 'string'), ('코드 id', 'code_id', 'string'), ('기술 배 id', 'ship_id', 'int'),
                   ('슬롯', 'slot', 'enum'), ('등급', 'grade', 'int'), ('티어', 'tier', 'int'), ('낄 수 있는 갈래', 'fit_line', 'string')] + eff_cols(4) +
     [('아이콘', 'icon', 'string'), ('장비 설명', 'item_desc', 'string')], part_rows),
    ('Grade', [('등급', 'grade', 'int'), ('등급 이름', 'grade_name', 'string'), ('색', 'color', 'string')], [[i, g['name'], g['col']] for i, g in enumerate(D['grades'])]),
    ('Request_Odds', [('쓴 금화', 'coin', 'int'), ('일반', 'w0', 'float'), ('고급', 'w1', 'float'), ('희귀', 'w2', 'float'), ('전설', 'w3', 'float')],
     [[c] + [num(v) for v in w] for c, w in D['odds']]),
    ('Tier_Odds', [('테크 - 티어', 'tier_gap', 'int'), ('확률 (%)', 'weight', 'float'), ('설명', '-', '-')],
     [[0, 60, '가진 배 중 가장 높은 티어 (테크)'], [1, 25, '테크 − 1'], [2, 10, '테크 − 2'], [3, 5, '그 아래 나머지 티어끼리 나눔 (없으면 테크에 더함)']]),
    ('Up_Chance', [('넣은 전설 수', 'count', 'int'), ('성공 확률 (%)', 'chance', 'float')], [[int(k), num(v)] for k, v in D['upChance'].items()]),
    ('Equip_Config', [('키', 'key', 'string'), ('값', 'value', 'float'), ('설명', '-', '-')], [
        ['request_min', D['req']['min'], '제작 의뢰 최소 금화'],
        ['request_max', D['req']['max'], '제작 의뢰 최대 금화'],
        ['request_step', D['req']['step'], '제작 의뢰 금화 단위'],
        ['request_plank_div', 3, '의뢰 목재 비용 = 금화 ÷ 이 값'],
        ['request_tech_k', 0.6, '의뢰 비용 × (1 + 이 값 × 테크)'],
        ['fuse_count', D['fuseN'], '합성: 같은 티어 · 같은 등급 이 개수 → 한 등급 위'],
        ['tier_up_max', D['upMax'], '티어 업 도전: 같은 티어 전설 최대 개수'],
        ['gear_tier_k', 0.35, '일반 · 고급 장비 수치 = 틀 × (1 + 이 값 × 티어)'],
    ]),
    vt_sheet,
    ('Column_Desc', [('칼럼', 'column', '-'), ('설명', 'desc', '-')], [
        ['item_id', '20001~ = 일반 · 고급 (배마다 슬롯마다 2개), 21001~ = 희귀 · 전설 고유 장비'],
        ['ship_id', '이 장비 기술이 나온 배 (배 테이블). 티어 · 기본 갈래가 여기서 정해짐'],
        ['grade', '0 일반 · 1 고급 · 2 희귀 · 3 전설 (Grade)'],
        ['tier', '장착 조건: 배 티어 ≥ 장비 티어'],
        ['fit_line', '낄 수 있는 갈래 (S · M · H 쉼표로). 장착 조건: 배에 그 슬롯 있음 + 갈래 맞음 (갤리선은 모든 장비 가능)'],
        ['effectN / eN_value', '장비 효과 (Value_Type). 더함 먼저, 곱함 나중'],
        ['Request_Odds', '제작 의뢰 등급 확률. 사이 금화는 로그 보간'],
    ]),
])

# ── 적 테이블
FOE_EFF = {
    'armor': ('Armor', '대포 피해 × 값 (어뢰 · 폭격 · 유도탄은 그대로)', '받는 피해 배율'),
    'bowGun': ('Bow_Gun', '앞쪽에 있으면 선수포 사격', '간격 (초)'),
    'fireP': ('Fire_Shot', '일제 사격이 확률로 화염탄', '확률'),
    'fin': ('Fin_Sprite', '잠수 지느러미 그림 칸', 'shark_fin 칸 번호'),
    'rage': ('Rage', '분노: 조준 · 지침 짧아짐, 새끼 상어 3마리, 주변 고리 공격', '1 = 켬'),
    'mk2': ('Mk2', '강화판: 보스 패턴 간격 짧아짐 · 수 늘어남', '1 = 켬'),
}
AI = [['Cannon', '거리를 두고 돌며 뱃전 일제 사격'], ['Mortar', '멀리서 폭격 (예고 원)'], ['Ram', '곧장 달려와 들이받고 터짐 (dmg = 박치기 피해)'],
      ['Shark', '잠수 → 떠올라 물기 (잠수 중엔 어뢰 · 폭격만 맞음, dmg = 물기 피해)'], ['Mine', '떠다니다 닿으면 폭발 (dmg = 폭발 피해)']]
BOSS = [['None', '보스 아님'], ['Rival', '라이벌 해적: 일제 사격 + 화염'], ['Shark', '거대 상어: 조준 → 돌진 → 지침 (지칠 때만 대포가 맞음)'],
        ['Admiral', '고양이 제독: 폭격 세례 + 쾌속정 소환'], ['King', '해적왕: 원형 일제 사격'], ['Fortress', '해상 요새: 느리고 단단함, 원형 사격 · 소환']]
foe_rows = []
FOE_ID, n_n, n_b = {}, 0, 0
for k, f in D['foes'].items():
    if f.get('boss'):
        n_b += 1; fid = 31000 + n_b
    else:
        n_n += 1; fid = 30000 + n_n
    FOE_ID[k] = fid
    ai = 'Mine' if k == 'mine' else 'Shark' if f.get('shark') else 'Ram' if f.get('ram') else 'Mortar' if f.get('mortar') else 'Cannon'
    dmg = f.get('dmg') or f.get('ram') or f.get('bite') or f.get('boom') or 0
    eff = [(FOE_EFF[x][0], num(1 if f[x] is True else f[x])) for x in FOE_EFF if f.get(x)]
    assert len(eff) <= 3, k
    eff += [('None', 0)] * (3 - len(eff))
    crew = f.get('crew') or []
    crew_s = '|'.join(f"{crew[i]}:{','.join(map(str, crew[i + 1]))}" for i in range(0, len(crew), 2))
    foe_rows.append([fid, f['name'], k, 'Boss' if f.get('boss') else 'Normal', ai, (f.get('boss') or 'none').capitalize() if f.get('boss') else 'None',
                     num(f['hp']), num(f['len']), num(f['speed']), num(f['turn']), f.get('guns', 0), num(f.get('reload', 0)), num(dmg), f['gold'], f['plank']]
                    + [x for e in eff for x in e] + [f.get('spr', ''), crew_s, f.get('col', '')])
book('적 테이블.xlsx', [
    ('Enemy', [('적 id', 'enemy_id', 'int'), ('적 이름', 'enemy_name', 'string'), ('코드 id', 'code_id', 'string'), ('분류', 'enemy_category', 'enum'),
               ('행동', 'ai_type', 'enum'), ('보스 패턴', 'boss_type', 'enum'), ('체력', 'hp', 'float'), ('길이', 'length', 'float'), ('속도', 'speed', 'float'),
               ('회전', 'turn', 'float'), ('뱃전 대포', 'guns', 'int'), ('장전 (초)', 'reload', 'float'), ('공격 피해', 'dmg', 'float'), ('금화', 'gold', 'int'),
               ('목재', 'plank', 'int')] + eff_cols(3) + [('그림', 'asset', 'string'), ('선원 (시트:칸|…)', 'crew', 'string'), ('그림 없을 때 색', 'color', 'string')], foe_rows),
    ('AI_Type', [('행동', 'ai_type', 'enum'), ('정의', 'desc', '-')], AI),
    ('Boss_Type', [('보스 패턴', 'boss_type', 'enum'), ('정의', 'desc', '-')], BOSS),
    ('Value_Type', [('값 타입', 'value_type', 'enum'), ('정의', 'desc', '-'), ('값 의미', 'value', '-')], [['None', '효과 없음', '-']] + [list(v) for v in FOE_EFF.values()]),
    ('Column_Desc', [('칼럼', 'column', '-'), ('설명', 'desc', '-')], [
        ['enemy_id', '30001~ = 일반 적, 31001~ = 보스'],
        ['hp / dmg', '바다 배율로 바뀜: 체력 × mult, 피해 × (1 + (mult − 1) × 0.6) (바다 테이블)'],
        ['dmg', '행동마다 뜻이 다름: 대포 · 폭격 = 한 발 피해, Ram = 박치기, Shark = 물기, Mine = 폭발'],
        ['crew', '갑판에 올리는 선원 그림. 시트 이름:칸 번호들, 시트가 여럿이면 | 로 나눔'],
        ['length', '배는 그림을 × 1.8 로 그림. 상어 · 폭탄통은 그대로'],
    ]),
])

# ── 바다 테이블
sea_rows, wave_rows, wid = [], [], 41000
for i, s in enumerate(D['seas']):
    sid = 40001 + i
    sea_rows.append([sid, s['name'], s['id'], num(s['mult']), s['rec'], (s['trait'] or 'none').capitalize() if s['trait'] else 'None', FOE_ID[s['boss']], s['col'][0], s['col'][1], s['story']])
    for w, wave in enumerate(s['waves'], 1):
        for k in dict.fromkeys(wave):
            wid += 1
            wave_rows.append([wid, sid, w, FOE_ID[k], wave.count(k)])
book('바다 테이블.xlsx', [
    ('Sea', [('바다 id', 'sea_id', 'int'), ('바다 이름', 'sea_name', 'string'), ('코드 id', 'code_id', 'string'), ('난이도 배율', 'mult', 'float'), ('추천 티어', 'rec_tier', 'int'),
             ('맵 특성', 'trait', 'enum'), ('보스 id', 'boss_id', 'int'), ('바다 색 (위)', 'color_top', 'string'), ('바다 색 (아래)', 'color_bottom', 'string'), ('스토리', 'story', 'string')], sea_rows),
    ('Wave', [('웨이브 id', 'wave_id', 'int'), ('바다 id', 'sea_id', 'int'), ('웨이브 번호', 'wave_no', 'int'), ('적 id', 'enemy_id', 'int'), ('수', 'count', 'int')], wave_rows),
    ('Trait', [('맵 특성', 'trait', 'enum'), ('정의', 'desc', '-')], [['None', '없음'], ['Fog', '안개: 시야 = 배 vision 안쪽만 보임'],
                                                                ['Storm', '폭풍: 바람에 배 · 포탄이 밀림 + 번개 예고 원'], ['Whirl', '소용돌이: 출발점 오른쪽에서 끌어당김, 가운데 피해']]),
    ('Column_Desc', [('칼럼', 'column', '-'), ('설명', 'desc', '-')], [
        ['mult', '적 체력 × mult, 적 피해 × (1 + (mult − 1) × 0.6), 보상 × (1 + (mult − 1) × 0.8)'],
        ['Wave', '같은 바다 · 같은 웨이브 번호의 적이 함께 나옴. 웨이브를 다 깨면 보스 + 1웨이브 앞 2척'],
        ['Wave.enemy_id / Sea.boss_id', '적 테이블 enemy_id'],
    ]),
])
print('ok', len(ship_rows), len(part_rows), len(foe_rows), len(sea_rows), len(wave_rows))
