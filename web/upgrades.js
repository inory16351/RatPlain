// 아웃게임 강화: 비행기 진화(기체) + 장비(티어 · 등급 · 장착 기체가 따로) + 과학자 쥐 제작 의뢰 · 합성 · 티어 업 도전 + 저장
// 설계: docs/장비_제작의뢰.md
// 기체 = 실제 비행기 발전 순서. 0 복엽기 → 1 2차대전 → 2 1950년대 → 3 현대 → 4 근미래 → 5 우주 시대
// 갈래(line): F = 위 · 빠른 전투기, M = 가운데 · 다목적(폭격 · 무인기 · 레이더), B = 아래 · 튼튼한 폭격기. 부모 기체를 가져야 다음 기체를 살 수 있음.
// 장비: 티어(어느 단계 기술인지) · 등급(일반~전설) · 장착 가능한 기체(갈래 · 슬롯)가 따로.
//   장착 조건 = 내가 가진 기체 + 그 기체에 그 슬롯이 있음 + 장비가 맞는 갈래 + 기체 단계 ≥ 장비 티어 (낮은 티어 장비는 높은 기체에 낄 수 있음)
//   일반 · 고급 = 수치만 오르는 기본형(슬롯 종류 틀 × 티어), 희귀 · 전설 = 고유 효과 장비(UNIQUE)
// 제작 의뢰는 지금 가진 기체의 최고 단계(테크)에 맞는 티어가 주로 나오고, 낮은 티어도 확률로 섞임.
// 수치 계산: BASE → 기체 · 장비 add (더하기 먼저) → mul (곱하기 나중) — 간격(유도탄 · 폭탄)에 곱하는 장비가 있어서
(function () {
  // 기본 수치 (전투 손맛 조정은 여기). 간격 값(missile · bomb …)이 0 이면 그 무기 없음
  const BASE = {
    speed: 360, boostSpeed: 640, accel: 3,  // 순항 · 부스트 속도, 속도 따라붙는 빠르기
    turn: 4.2, turnBoost: 2.8,              // 초당 선회(rad)
    hp: 100, regen: 14, regenDelay: 1.4, dmgTaken: 1,
    fireRate: 12, bulletSpd: 1050, bulletDmg: 1, bulletLife: 0.8, inherit: 0.3, // inherit = 탄이 비행기 속도를 물려받는 정도
    pierce: 0,                              // 탄이 뚫고 지나가는 적 수
    crit: 0,                                // 치명타 확률 (2배 피해)
    boostMax: 2.2, boostRecover: 0.8,
    pickup: 280,                            // 재료가 끌려오는 거리
    windK: 1,                               // 바람(눈보라 · 모래폭풍)에 밀리는 정도 — 가벼운 전투기 ↑, 무거운 폭격기 ↓
    vision: 430,                            // 안개 속 시야 반지름 (레이더가 넓힘)
    armorPierce: 0,                         // 장갑 적에게 주무장 피해가 덜 깎이는 비율 (1 = 장갑 무시)
    evade: 0,                               // 맞을 때 빗나갈 확률 (스텔스)
    missile: 0, missileN: 2, missileDmg: 4, // 유도탄 간격(초)
    cannon: 0, cannonDmg: 6,                // 기수포 간격 · 위력 (조준 쪽으로 굵은 탄)
    bomb: 0, bombN: 1, bombDmg: 10, bombR: 110, // 폭탄 간격 · 한 번에 · 위력 · 폭발 반지름 (비행기 앞쪽에 떨어져 터짐)
    turret: 0, turretN: 1, turretDmg: 1.5, turretPierce: 0, // 자동 기총탑 간격 (가장 가까운 적을 알아서 쏨)
    drone: 0, droneDmg: 1, droneRate: 0.5,  // 호위 무인기 수 · 위력 · 사격 간격 (비행기 둘레를 돌며 가까운 적을 쏨)
    shield: 0,                              // 방어막: 한 번 막고 다시 차는 시간(초)
    coinBonus: 0,                           // 치즈 코인 더 떨어뜨리는 비율
    rail: 0, railDmg: 25,                   // 레일건 간격(초) · 위력
    // 고유 효과 (희귀 · 전설 장비) — game.js 에서 씀, 0 이면 없음
    killBoost: 0,    // 처치하면 부스트 충전(초)
    boostGuard: 0,   // 부스트 중 받는 피해 감소 비율
    regenFire: 0,    // 쏘는 중에도 회복 (비율)
    tracer: 0,       // N 번째 사격마다 예광탄 (위력 3배 · 관통 3)
    boostDodge: 0,   // 부스트 켜는 순간 무적 + 주변 적 탄 지움
    cannonBoom: 0,   // 기수포가 맞은 곳 폭발
    berserk: 0,      // 체력 절반 아래면 위력 · 연사 ↑
    missileChain: 0, // 유도탄으로 처치하면 그 자리에서 유도탄 N 발
    sonic: 0,        // 부스트 켜면 충격파 (위력)
    cluster: 0,      // 폭탄이 터지면 작은 폭탄 N 개
    carpet: 0,       // 부스트 중 지나간 길에 폭탄
    critMissile: 0,  // 치명타가 터지면 유도탄 N 발
    chaff: 0,        // 맞으면 주변 적 탄 지움 (재사용 초)
    thorns: 0,       // 방어막이 막을 때 반격탄 N 발
    bombBig: 0,      // 폭탄 범위 2배 · 위력 3배 + 터지면 적 탄 지움
    stun: 0,         // 부스트 켜면 주변 적이 N 초 얼어붙음 (사이렌)
    diveBomb: 0,     // 부스트 켜면 앞쪽 일직선에 폭탄 N 발
    ram: 0,          // 부스트 중 부딪힌 적에게 피해 (박치기 피해 안 받음)
    napalm: 0,       // 폭탄 터진 자리가 N 초 불탐
    missileBoom: 0,  // 유도탄이 맞은 곳 폭발 (반지름)
    burn: 0,         // 주무장에 맞은 적이 불탐 (초당 피해)
    droneShield: 0,  // 무인기가 닿는 적 탄을 막음
    droneLaser: 0,   // 무인기가 꿰뚫는 레이저를 쏨
    droneMissile: 0, // 무인기가 가끔 유도탄
    healPulse: 0,    // N 초마다 체력 8% 회복
    hazardGuard: 0,  // 위험 지대(번개 · 광선 · 분화 · 대공포) 피해 감소 비율
    orbital: 0,      // 쏘는 동안 N 초마다 조준한 곳에 궤도 광선
    ambush: 0,       // 1.5초 안 쏘다가 쏘는 첫 사격 위력 N 배
    phantom: 0,      // 부스트 켜면 미끼가 남아 N 초 동안 적이 미끼를 노림
    homingShots: 0,  // 주무장 탄이 적 쪽으로 휨 (초당 rad)
    blink: 0,        // 부스트 켜면 앞으로 순간 이동 (거리), 떠난 자리 폭발
    flameTrail: 0,   // 부스트 중 지나간 길이 불탐 (초당 피해)
    chainBolt: 0,    // 폭탄이 터지면 가까운 적 N 에게 번개
    ciws: 0,         // 기총탑이 가까운 적 탄을 쏘아 떨어뜨림
    mega: 0,         // 쏘는 동안 N 초마다 거대 포탄
    shadow: [26, 38],                       // 그림자 어긋남 (높이감)
  };

  const GRADES = [
    { name: '일반', col: '#c9d2dc' },
    { name: '고급', col: '#7fd88a' },
    { name: '희귀', col: '#6fb8ff' },
    { name: '전설', col: '#ffb84d' },
  ];
  const ERAS = ['1900년대', '2차대전', '1950년대', '현대', '근미래', '우주 시대'];
  const TIER_COL = ['#b9a58a', '#9fc37a', '#7fc7d8', '#8fa2ff', '#d68cff', '#ff8fa8']; // 티어 표시 색
  const LINES = { F: '전투기', M: '다목적기', B: '폭격기' };

  // 슬롯 종류: icon = [일반, 고급] 아이콘 (시트 이름, 칸)
  const SLOT_TYPES = {
    engine: { name: '엔진', glyph: '⚙', icon: [['parts_a', 0], ['parts_a', 1]] },
    gun: { name: '주무장', glyph: '✦', icon: [['parts_a', 3], ['parts_a', 5]] },
    wing: { name: '날개', glyph: '◢', icon: [['parts_a', 7], ['parts_b', 0]] },
    armor: { name: '장갑', glyph: '▣', icon: [['parts_b', 1], ['parts_b', 3]] },
    scope: { name: '조준기', glyph: '◎', icon: [['parts_c', 0], ['parts_c', 1]] },
    nose: { name: '기수포', glyph: '➤', icon: [['parts_c', 2], ['parts_c', 3]] },
    radar: { name: '레이더', glyph: '◉', icon: [['parts_c', 4], ['parts_c', 5]] },
    missile: { name: '유도탄', glyph: '➶', icon: [['parts_b', 4], ['parts_b', 5]] },
    bomb: { name: '폭탄창', glyph: '●', icon: [['parts_c', 6], ['parts_c', 7]] },
    turret: { name: '기총탑', glyph: '✚', icon: [['parts_c', 8], ['parts_c', 8]] },
    drone: { name: '무인기', glyph: '✈', icon: [['parts_d', 0], ['parts_d', 1]] },
    special: { name: '특수 장치', glyph: '★', icon: [['parts_b', 6], ['parts_b', 6]] },
  };

  // 부채꼴 총구: 가운데 n 개를 gap 간격으로 (+ 뒤쪽 총구)
  const spread = (n, gap, back = []) => [...Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * gap, 0]), ...back.map((a) => [Math.PI + a, 0])];
  const rows = (n, gap) => Array.from({ length: n }, (_, i) => [0, (i - (n - 1) / 2) * gap]);

  // 기체: line = 갈래, row = 진화 트리 줄(0 위 · 1 가운데 · 2 아래), guns = 총구 [각도 어긋남(rad), 옆 간격(px)], slots = 장비 슬롯 (기체마다 다름)
  // gear = 이 기체 기술로 만드는 일반 · 고급 장비 이름 [일반, 고급] (슬롯 순서대로) — 이 장비의 티어 = 이 기체 단계, 갈래 = 이 기체 갈래
  // spr = 전용 그림 (art/sprites/<spr>_0.png). 아직 없으면 기본 그림에 tint(색 필터) · scale 로 대신함
  const FRAMES = [
    {
      id: 'biplane', name: '쥐돌이 1호', kind: '복엽 글라이더', tier: 0, row: 1, line: null, req: null, cost: [0, 0],
      desc: '과학자 쥐가 처음 만든 천 날개 글라이더. 총 한 정. 이 기체의 장비는 모든 기체에 낄 수 있음.',
      mul: { windK: 1.2 },
      guns: [[0, 0]], spr: 'player',
      slots: ['engine', 'gun', 'wing'],
      gear: [['낡은 4기통 엔진', '치즈 연소 엔진'], ['구식 기관총', '고속 기관총'], ['천 날개', '경량 천 날개']],
    },
    // ── 위 갈래: 전투기
    {
      id: 'mono', name: '치즈 스피드', kind: '단엽 전투기', tier: 1, row: 0, line: 'F', req: 'biplane', cost: [25, 40],
      desc: '날개를 한 장으로 줄여 빠르고 날렵함. 쌍열 기관총.',
      add: { hp: 20 }, mul: { speed: 1.15, boostSpeed: 1.1, turn: 1.1, windK: 1.15 },
      guns: rows(2, 20), spr: 'player_mono', tint: 'hue-rotate(-25deg) saturate(1.3)', scale: 0.95,
      slots: ['engine', 'gun', 'wing', 'scope'],
      gear: [['직렬 엔진', '과급 직렬 엔진'], ['쌍열 기관총', '고속 쌍열 기관총'], ['단엽 날개', '층류 날개'], ['링 조준기', '망원 조준기']],
    },
    {
      id: 'jet', name: '은빛 꼬리', kind: '후퇴익 제트기', tier: 2, row: 0, line: 'F', req: 'mono', cost: [60, 120],
      desc: '프로펠러 대신 제트. 아주 빠르고 탄이 적 하나를 뚫음.',
      add: { hp: 40, pierce: 1, boostMax: 0.6, fireRate: 2 }, mul: { speed: 1.3, boostSpeed: 1.3, turn: 1.15, bulletSpd: 1.35, windK: 1.15 },
      guns: rows(2, 20), spr: 'player_jet', tint: 'saturate(.25) brightness(1.15)', scale: 0.95,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile'],
      gear: [['터보제트', '개량 터보제트'], ['20mm 기관포', '고속 기관포'], ['후퇴익', '가변 후퇴익'], ['기상 레이더', '사격 레이더'], ['적외선 유도탄', '개량 유도탄']],
    },
    {
      id: 'super', name: '번개 꼬리', kind: '초음속 델타익기', tier: 3, row: 0, line: 'F', req: 'jet', cost: [130, 260],
      desc: '음속을 넘는 삼각 날개. 4열 관통탄.',
      add: { hp: 70, pierce: 2, boostMax: 1, fireRate: 3 }, mul: { speed: 1.45, boostSpeed: 1.45, turn: 1.25, bulletSpd: 1.6, windK: 1.15 },
      guns: rows(4, 10), spr: 'player_super', tint: 'saturate(0) brightness(1.3)', scale: 1,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile', 'special'],
      gear: [['터보팬', '애프터버너'], ['개틀링포', '고속 개틀링포'], ['델타익', '카나드 델타익'], ['펄스 레이더', '도플러 펄스 레이더'], ['공대공 미사일', '다연장 미사일'], ['방어막 발생기', '강화 방어막']],
    },
    {
      id: 'stealth', name: '그림자 꼬리', kind: '스텔스 전투기', tier: 4, row: 0, line: 'F', req: 'super', cost: [300, 600],
      desc: '레이더에 잘 안 잡히는 각진 전투기. 적 탄이 15% 확률로 빗나감. 4열 관통탄.',
      add: { hp: 100, pierce: 2, boostMax: 1.2, fireRate: 4, bulletDmg: 0.6, evade: 0.15 }, mul: { speed: 1.55, boostSpeed: 1.55, turn: 1.3, bulletSpd: 1.7, windK: 1.15 },
      guns: rows(4, 10), spr: 'player_stealth', tint: 'saturate(0) brightness(.6)', scale: 1.05,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile', 'special'],
      gear: [['저피탐 터보팬', '추력 편향 터보팬'], ['내장 기관포', '고속 내장 기관포'], ['다이아몬드 날개', '톱니 날개'], ['능동 위상 레이더', '저피탐 위상 레이더'], ['내부 무장창', '확장 내부 무장창'], ['전자전 장치', '강화 전자전 장치']],
    },
    {
      id: 'orbiter', name: '별똥 꼬리', kind: '우주 요격기', tier: 5, row: 0, line: 'F', req: 'stealth', cost: [650, 1300],
      desc: '궤도까지 오르는 우주 전투기. 6열 관통탄, 아주 빠름.',
      add: { hp: 140, pierce: 3, boostMax: 1.5, fireRate: 5, bulletDmg: 1.2, evade: 0.15 }, mul: { speed: 1.65, boostSpeed: 1.7, turn: 1.35, bulletSpd: 1.85, windK: 1.1 },
      guns: rows(6, 8), spr: 'player_orbiter', tint: 'hue-rotate(180deg) brightness(1.2)', scale: 1.05,
      slots: ['engine', 'gun', 'wing', 'scope', 'radar', 'missile', 'special'],
      gear: [['이온 추진기', '고출력 이온 추진기'], ['펄스 레이저', '고속 펄스 레이저'], ['갈래 날개', '자세 제어 날개'], ['궤도 조준기', '정밀 궤도 조준기'], ['우주 레이더', '심우주 레이더'], ['소형 우주 미사일', '다탄두 우주 미사일'], ['역장 발생기', '강화 역장']],
    },
    // ── 가운데 갈래: 다목적기 (급강하 폭격 · 무인기 · 레이더)
    {
      id: 'dive', name: '부리 망치', kind: '급강하 폭격기', tier: 1, row: 1, line: 'M', req: 'biplane', cost: [25, 40],
      desc: '날개 아래 급강하 브레이크. 쌍열 기관총에 폭탄창이 달림.',
      add: { hp: 35 }, mul: { speed: 1.08, boostSpeed: 1.05, turn: 1.02, windK: 0.9 },
      guns: rows(2, 16), spr: 'player_dive', tint: 'hue-rotate(30deg) saturate(.9)', scale: 1.05,
      slots: ['engine', 'gun', 'wing', 'bomb'],
      gear: [['성형 엔진', '과급 성형 엔진'], ['날개 기관총', '고속 날개 기관총'], ['갈매기 날개', '강화 갈매기 날개'], ['급강하 폭탄창', '강화 급강하 폭탄창']],
    },
    {
      id: 'fbomber', name: '치즈 망치', kind: '제트 전폭기', tier: 2, row: 1, line: 'M', req: 'dive', cost: [60, 120],
      desc: '제트 엔진에 폭탄 · 로켓을 단 전투 폭격기. 3갈래, 탄이 적 하나를 뚫음.',
      add: { hp: 70, pierce: 1, boostMax: 0.4, fireRate: 1 }, mul: { speed: 1.2, boostSpeed: 1.2, turn: 1.05, bulletSpd: 1.25, windK: 0.9 },
      guns: [[-0.06, -8], [0, 0], [0.06, 8]], spr: 'player_fbomber', tint: 'hue-rotate(40deg) saturate(.7)', scale: 1.05,
      slots: ['engine', 'gun', 'wing', 'missile', 'bomb'],
      gear: [['축류 터보제트', '개량 축류 터보제트'], ['기수 기관포', '고속 기수 기관포'], ['날개끝 연료 탱크', '대형 날개끝 탱크'], ['날개 로켓', '개량 날개 로켓'], ['날개 폭탄 걸이', '강화 폭탄 걸이']],
    },
    {
      id: 'swing', name: '가위 날개', kind: '가변익 다목적기', tier: 3, row: 1, line: 'M', req: 'fbomber', cost: [130, 260],
      desc: '날개 각도를 바꾸며 싸우는 만능기. 4갈래, 무장 슬롯이 다양함.',
      add: { hp: 110, pierce: 1, boostMax: 0.8, fireRate: 2 }, mul: { speed: 1.35, boostSpeed: 1.35, turn: 1.15, bulletSpd: 1.4, windK: 0.9 },
      guns: [[-0.08, -8], [0, -4], [0, 4], [0.08, 8]], spr: 'player_swing', tint: 'saturate(.4) brightness(1.05)', scale: 1.05,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile', 'bomb'],
      gear: [['쌍발 터보팬', '고출력 쌍발 터보팬'], ['다목적 기관포', '고속 다목적 기관포'], ['가변익', '전동 가변익'], ['다목적 레이더', '지상 추적 레이더'], ['공대지 미사일', '정밀 공대지 미사일'], ['정밀 유도 폭탄', '레이저 유도 폭탄']],
    },
    {
      id: 'drone', name: '쥐떼 지휘기', kind: '무인기 지휘기', tier: 4, row: 1, line: 'M', req: 'swing', cost: [300, 600],
      desc: '작은 호위 무인기 2대를 거느리고 싸움. 레이더 시야가 넓음.',
      add: { hp: 150, pierce: 1, boostMax: 1, fireRate: 3, bulletDmg: 0.5, drone: 2, vision: 150 }, mul: { speed: 1.4, boostSpeed: 1.4, turn: 1.2, bulletSpd: 1.5, windK: 0.9 },
      guns: rows(4, 10), spr: 'player_drone', tint: 'hue-rotate(150deg) saturate(.6)', scale: 1.05,
      slots: ['engine', 'gun', 'radar', 'missile', 'drone', 'special'],
      gear: [['지휘기 터보팬', '고출력 지휘기 터보팬'], ['지휘 기관포', '고속 지휘 기관포'], ['원판 레이더', '광역 원판 레이더'], ['무인기 연동 미사일', '개량 연동 미사일'], ['호위 무인기', '무장 호위 무인기'], ['지휘 통신기', '강화 지휘 통신기']],
    },
    {
      id: 'shuttle', name: '치즈 왕복선', kind: '궤도 왕복 공격기', tier: 5, row: 1, line: 'M', req: 'drone', cost: [650, 1300],
      desc: '우주까지 오르내리는 왕복선. 튼튼하고 무인기 2대 · 레이더 · 특수 장치를 모두 씀.',
      add: { hp: 240, pierce: 2, boostMax: 1.2, fireRate: 4, bulletDmg: 1, drone: 2, vision: 200 }, mul: { speed: 1.45, boostSpeed: 1.5, turn: 1.2, bulletSpd: 1.6, windK: 0.85 },
      guns: rows(4, 12), spr: 'player_shuttle', tint: 'saturate(0) brightness(1.4)', scale: 1.15,
      slots: ['engine', 'gun', 'armor', 'radar', 'missile', 'drone', 'special'],
      gear: [['궤도 로켓', '3연 궤도 로켓'], ['화물칸 기관포', '고속 화물칸 기관포'], ['단열 외피', '강화 단열 외피'], ['궤도 레이더', '심궤도 레이더'], ['화물칸 미사일', '다연장 화물칸 미사일'], ['궤도 무인기', '무장 궤도 무인기'], ['로봇 팔', '강화 로봇 팔']],
    },
    // ── 아래 갈래: 폭격기
    {
      id: 'heavy', name: '쌍발 치즈통', kind: '쌍발 중전투기', tier: 1, row: 2, line: 'B', req: 'biplane', cost: [25, 40],
      desc: '엔진 두 개로 튼튼함. 3갈래 산탄 + 기수포. 바람에 덜 밀림.',
      add: { hp: 60, fireRate: -1 }, mul: { turn: 0.95, windK: 0.6 },
      guns: spread(3, 0.13), spr: 'player_heavy', tint: 'hue-rotate(70deg) saturate(.8)', scale: 1.15,
      slots: ['engine', 'gun', 'armor', 'nose'],
      gear: [['쌍발 성형 엔진', '강화 쌍발 엔진'], ['산탄 기관포', '대구경 산탄포'], ['강판 동체', '이중 강판 동체'], ['기수 기관총', '쌍열 기수포']],
    },
    {
      id: 'fort', name: '하늘 요새', kind: '4발 중폭격기', tier: 2, row: 2, line: 'B', req: 'heavy', cost: [60, 120],
      desc: '날아다니는 요새. 5갈래 산탄 + 뒤쪽 기관총, 폭탄창 · 기총탑.',
      add: { hp: 130, fireRate: -1 }, mul: { speed: 0.95, turn: 0.9, windK: 0.5 },
      guns: spread(5, 0.12, [0]), spr: 'player_fort', tint: 'saturate(.55) brightness(.85)', scale: 1.3,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret'],
      gear: [['4발 엔진', '과급 4발 엔진'], ['산탄 포대', '강화 산탄 포대'], ['요새 장갑', '이중 요새 장갑'], ['소형 폭탄창', '강화 폭탄창'], ['후방 기총탑', '강화 기총탑']],
    },
    {
      id: 'flywing', name: '치즈 전익기', kind: '전익 전략폭격기', tier: 3, row: 2, line: 'B', req: 'fort', cost: [130, 260],
      desc: '거대한 날개 하나. 7갈래 산탄 + 뒤쪽 2갈래, 스스로 빨리 회복.',
      add: { hp: 220 }, mul: { turn: 0.95, regen: 1.3, windK: 0.45 },
      guns: spread(7, 0.12, [-0.15, 0.15]),
      spr: 'player_flywing', tint: 'saturate(.3) brightness(.7)', scale: 1.4,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret', 'special'],
      gear: [['내장 엔진', '고출력 내장 엔진'], ['광역 산탄 포대', '대형 산탄 포대'], ['복합 장갑', '티타늄 장갑'], ['전략 폭탄창', '대형 폭탄창'], ['원격 기총탑', '쌍발 원격 기총탑'], ['방어막 발생기', '강화 방어막']],
    },
    {
      id: 'hyper', name: '번개 요새', kind: '극초음속 폭격기', tier: 4, row: 2, line: 'B', req: 'flywing', cost: [300, 600],
      desc: '음속의 다섯 배로 나는 폭격기. 9갈래 산탄 + 뒤쪽 3갈래, 부스트가 아주 빠름.',
      add: { hp: 320, fireRate: 1, bulletDmg: 0.4 }, mul: { speed: 1.1, boostSpeed: 1.35, turn: 0.95, regen: 1.4, windK: 0.4 },
      guns: spread(9, 0.1, [-0.2, 0, 0.2]), spr: 'player_hyper', tint: 'saturate(.4) brightness(.6)', scale: 1.4,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret', 'missile', 'special'],
      gear: [['램제트 엔진', '스크램제트 엔진'], ['극초음속 산탄 포대', '대형 극초음속 포대'], ['내열 장갑', '복합 내열 장갑'], ['회전식 폭탄창', '대형 회전식 폭탄창'], ['꼬리 기총탑', '쌍발 꼬리 기총탑'], ['장거리 순항 미사일', '개량 순항 미사일'], ['전자 방해 장치', '강화 전자 방해 장치']],
    },
    {
      id: 'carrier', name: '하늘 치즈성', kind: '공중 항공모함', tier: 5, row: 2, line: 'B', req: 'hyper', cost: [650, 1300],
      desc: '하늘에 뜬 성. 엄청 튼튼하고 함재 무인기 2대를 띄움. 11갈래 산탄 + 사방 기관총.',
      add: { hp: 450, fireRate: 1, bulletDmg: 0.7, drone: 2 }, mul: { speed: 1.0, boostSpeed: 1.25, turn: 0.9, regen: 1.6, windK: 0.3 },
      guns: spread(11, 0.09, [-0.9, -0.3, 0.3, 0.9]), spr: 'player_carrier', tint: 'sepia(.5) brightness(.9)', scale: 1.6,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret', 'drone', 'special'],
      gear: [['성채 추진기 6기', '고출력 성채 추진기'], ['성벽 산탄 포대', '대형 성벽 포대'], ['성벽 장갑', '이중 성벽 장갑'], ['비행갑판 폭탄창', '대형 비행갑판 폭탄창'], ['갑판 기총탑', '쌍열 갑판 기총탑'], ['함재 무인기', '무장 함재 무인기'], ['성채 방어막', '강화 성채 방어막']],
    },
  ];

  // 일반 · 고급 장비 틀: (k = 티어 배율) → { add, mul }. 티어 높은 장비일수록 셈
  const r2 = (v) => Math.round(v * 100) / 100;
  const TEMPLATE = {
    engine: [(k) => ({ mul: { speed: r2(1 + 0.05 * k) } }), (k) => ({ mul: { speed: r2(1 + 0.07 * k) }, add: { boostMax: r2(0.4 * k) } })],
    gun: [(k) => ({ mul: { fireRate: r2(1 + 0.1 * k) } }), (k) => ({ mul: { bulletDmg: r2(1 + 0.15 * k), fireRate: r2(1 + 0.08 * k) } })],
    wing: [(k) => ({ mul: { turn: r2(1 + 0.08 * k), turnBoost: r2(1 + 0.08 * k) } }), (k) => ({ mul: { turn: r2(1 + 0.1 * k), turnBoost: r2(1 + 0.1 * k), pickup: r2(1 + 0.3 * k) } })],
    armor: [(k) => ({ add: { hp: Math.round(20 * k) } }), (k) => ({ add: { hp: Math.round(30 * k) }, mul: { regen: r2(1 + 0.2 * k) } })],
    scope: [(k) => ({ add: { crit: r2(0.06 * k) } }), (k) => ({ add: { crit: r2(0.08 * k) }, mul: { bulletSpd: r2(1 + 0.1 * k) } })],
    nose: [(k) => ({ add: { cannon: 1.4, cannonDmg: Math.round(3 * k) } }), (k) => ({ add: { cannon: 1.1, cannonDmg: Math.round(5 * k) } })],
    radar: [(k) => ({ add: { coinBonus: r2(0.1 * k), vision: Math.round(80 * k) }, mul: { pickup: r2(1 + 0.4 * k) } }), (k) => ({ add: { coinBonus: r2(0.15 * k), crit: r2(0.04 * k), vision: Math.round(120 * k) }, mul: { pickup: r2(1 + 0.5 * k) } })],
    missile: [(k) => ({ add: { missile: 1.2, missileDmg: Math.round(k) } }), (k) => ({ add: { missile: 0.9, missileN: 2, missileDmg: Math.round(k) } })],
    bomb: [(k) => ({ add: { bomb: 2.2, bombDmg: Math.round(4 * k) } }), (k) => ({ add: { bomb: 1.6, bombN: 1, bombDmg: Math.round(5 * k) } })],
    turret: [(k) => ({ add: { turret: 0.5, turretDmg: r2(0.3 * k) } }), (k) => ({ add: { turret: 0.35, turretDmg: r2(0.5 * k) } })],
    drone: [(k) => ({ add: { drone: 1, droneDmg: r2(0.4 * k) } }), (k) => ({ add: { drone: 2, droneDmg: r2(0.5 * k) } })],
    special: [(k) => ({ add: { shield: 9 } }), (k) => ({ add: { shield: 7, coinBonus: 0.2 } })],
  };
  // 장비 설명 자동 작성용 (일반 · 고급)
  const STAT_TXT = {
    speed: '속도', boostSpeed: '부스트 속도', turn: '선회', fireRate: '연사', bulletDmg: '위력', bulletSpd: '탄속', pickup: '재료 끌어오기',
    regen: '회복', hp: '체력', boostMax: '부스트', crit: '치명타', coinBonus: '치즈 코인', missileN: '유도탄 수', missileDmg: '유도탄 위력',
    cannonDmg: '기수포 위력', bombN: '폭탄 수', bombDmg: '폭탄 위력', turretDmg: '기총탑 위력', drone: '무인기', droneDmg: '무인기 위력', vision: '시야',
  };
  const INTERVAL_TXT = { cannon: '기수포', missile: '유도탄', bomb: '폭탄', turret: '자동 기총', shield: '방어막' };
  function describe(m) {
    const out = [];
    for (const [k, v] of Object.entries(m.add || {})) {
      if (INTERVAL_TXT[k]) out.unshift(`${v}초마다 ${INTERVAL_TXT[k]}`);
      else if (k === 'crit' || k === 'coinBonus') out.push(`${STAT_TXT[k]} +${Math.round(v * 100)}%`);
      else if (k === 'boostMax') out.push(`부스트 +${v}초`);
      else out.push(`${STAT_TXT[k]} +${v}`);
    }
    for (const [k, v] of Object.entries(m.mul || {})) {
      if (k === 'turnBoost') continue;
      out.push(`${STAT_TXT[k]} ${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`);
    }
    return out.join(', ');
  }

  // 희귀 · 전설 고유 장비: frame = 이 장비 기술이 나온 기체 (티어 · 기본 갈래), lines = 낄 수 있는 갈래를 따로 정함 (없으면 그 기체 갈래)
  // icon = 고유 아이콘 시트 칸 (parts_u1~u6)
  const UNIQUE = [
    // 복엽 글라이더 (티어 0, 모든 갈래)
    { id: 'u_sauce', frame: 'biplane', slot: 'gun', grade: 2, name: '치즈 소스 탄띠', icon: ['parts_u1', 0], mul: { fireRate: 1.1 }, add: { killBoost: 0.5 }, desc: '연사 +10%, 적을 처치하면 부스트 0.5초 충전' },
    { id: 'u_pinwheel', frame: 'biplane', slot: 'wing', grade: 2, name: '바람개비 날개끝', icon: ['parts_u1', 1], mul: { turn: 1.2, turnBoost: 1.2 }, add: { boostGuard: 0.5 }, desc: '선회 +20%, 부스트 중 받는 피해 −50%' },
    { id: 'u_proto', frame: 'biplane', slot: 'engine', grade: 3, name: '과학자 쥐의 시제 엔진', icon: ['parts_u1', 2], mul: { speed: 1.15 }, add: { regenFire: 0.6 }, desc: '속도 +15%, 쏘는 중에도 체력 회복 (60%)' },
    // 단엽 전투기
    { id: 'u_hawkeye', frame: 'mono', slot: 'scope', grade: 2, name: '매눈 조준경', icon: ['parts_u1', 3], mul: { bulletSpd: 1.15 }, add: { crit: 0.2 }, desc: '치명타 +20% (2배 피해), 탄속 +15%' },
    { id: 'u_tracer', frame: 'mono', slot: 'gun', grade: 2, name: '예광탄 벨트', icon: ['parts_u1', 4], lines: ['F', 'M'], add: { tracer: 5 }, desc: '5번째 사격마다 위력 3배 · 관통 3 예광탄' },
    { id: 'u_swallow', frame: 'mono', slot: 'wing', grade: 3, name: '제비꼬리 날개', icon: ['parts_u1', 5], mul: { turn: 1.25, turnBoost: 1.25 }, add: { boostDodge: 1, boostMax: 0.5 }, desc: '선회 +25%, 부스트 +0.5초. 부스트를 켜는 순간 0.6초 무적 + 주변 적 탄을 지움' },
    // 쌍발 중전투기
    { id: 'u_padding', frame: 'heavy', slot: 'armor', grade: 2, name: '치즈 완충재', icon: ['parts_u1', 6], lines: ['B', 'M'], mul: { dmgTaken: 0.8 }, add: { hp: 40 }, desc: '체력 +40, 받는 피해 −20%' },
    { id: 'u_37mm', frame: 'heavy', slot: 'nose', grade: 2, name: '37mm 기수포', icon: ['parts_u1', 7], add: { cannon: 1, cannonDmg: 8, cannonBoom: 1 }, desc: '1초마다 기수포 (위력 14), 맞은 곳이 폭발' },
    { id: 'u_twinheart', frame: 'heavy', slot: 'engine', grade: 3, name: '쌍둥이 심장', icon: ['parts_u1', 8], mul: { speed: 1.08 }, add: { hp: 30, berserk: 1 }, desc: '속도 +8%, 체력 +30. 체력이 절반 아래면 위력 +50% · 연사 +30%' },
    // 후퇴익 제트기
    { id: 'u_doppler', frame: 'jet', slot: 'radar', grade: 2, name: '도플러 레이더', icon: ['parts_u2', 0], lines: ['F', 'M'], mul: { missile: 0.7, pickup: 1.6 }, add: { vision: 150 }, desc: '유도탄 간격 −30%, 재료 끌어오기 +60%, 시야 +150' },
    { id: 'u_tailchase', frame: 'jet', slot: 'missile', grade: 2, name: '꼬리 추적 미사일', icon: ['parts_u2', 1], add: { missile: 0.9, missileDmg: 2, missileChain: 2 }, desc: '0.9초마다 유도탄, 유도탄으로 처치하면 그 자리에서 2발 더' },
    { id: 'u_sonic', frame: 'jet', slot: 'engine', grade: 3, name: '음속 돌파 엔진', icon: ['parts_u2', 2], lines: ['F', 'M'], mul: { speed: 1.12, boostSpeed: 1.2 }, add: { sonic: 20 }, desc: '속도 +12%, 부스트 속도 +20%. 부스트를 켜면 충격파: 주변 적에게 피해 20 · 적 탄을 지움' },
    // 4발 중폭격기
    { id: 'u_cluster', frame: 'fort', slot: 'bomb', grade: 2, name: '집속 치즈탄', icon: ['parts_u2', 3], lines: ['B', 'M'], add: { bomb: 2, bombDmg: 6, cluster: 4 }, desc: '2초마다 폭탄, 터지면 작은 폭탄 4개가 흩어짐' },
    { id: 'u_twinturret', frame: 'fort', slot: 'turret', grade: 2, name: '쌍열 기총탑', icon: ['parts_u2', 4], add: { turret: 0.3, turretN: 1, turretDmg: 0.6, turretPierce: 1 }, desc: '0.3초마다 2연발 자동 기총, 관통 +1' },
    { id: 'u_carpet', frame: 'fort', slot: 'bomb', grade: 3, name: '치즈 융단 폭격', icon: ['parts_u2', 5], add: { bomb: 1.8, bombDmg: 8, carpet: 1 }, desc: '1.8초마다 폭탄. 부스트 중엔 지나간 길에 폭탄을 쉴 새 없이 뿌림' },
    // 초음속 델타익기
    { id: 'u_phased', frame: 'super', slot: 'radar', grade: 2, name: '위상 배열 레이더', icon: ['parts_u2', 6], add: { crit: 0.15, critMissile: 1, vision: 100 }, desc: '치명타 +15%, 치명타가 터지면 유도탄 1발, 시야 +100' },
    { id: 'u_chaff', frame: 'super', slot: 'special', grade: 2, name: '채프 발사기', icon: ['parts_u2', 7], lines: ['F', 'M'], add: { chaff: 8 }, desc: '맞으면 주변 적 탄을 모두 지움 (8초마다)' },
    { id: 'u_railgun', frame: 'super', slot: 'gun', grade: 3, name: '번개 꼬리 레일건', icon: ['parts_u2', 8], mul: { bulletSpd: 1.3 }, add: { rail: 1.2 }, desc: '탄속 +30%. 쏘는 동안 1.2초마다 일직선으로 모두 꿰뚫는 레일건 (위력 25)' },
    // 전익 전략폭격기
    { id: 'u_selfrepair', frame: 'flywing', slot: 'armor', grade: 2, name: '자가 수복 장갑', icon: ['parts_u3', 0], lines: ['B', 'M'], mul: { regen: 1.5 }, add: { hp: 60, regenDelay: -1 }, desc: '체력 +60, 회복 +50%, 회복 시작 1초 빨리' },
    { id: 'u_shield2', frame: 'flywing', slot: 'special', grade: 2, name: '치즈 방어막 Mk2', icon: ['parts_u3', 1], lines: ['B', 'M'], add: { shield: 5, thorns: 12 }, desc: '5초마다 방어막, 막을 때 주위로 반격탄 12발' },
    { id: 'u_bigbomb', frame: 'flywing', slot: 'bomb', grade: 3, name: '대형 치즈 폭탄', icon: ['parts_u3', 2], add: { bomb: 3, bombDmg: 10, bombBig: 1 }, desc: '3초마다 거대 폭탄 (범위 2배 · 위력 3배), 터지면 주변 적 탄을 지움' },
    // 급강하 폭격기
    { id: 'u_siren', frame: 'dive', slot: 'wing', grade: 2, name: '사이렌 날개', icon: ['parts_u4', 0], mul: { turn: 1.15, turnBoost: 1.15 }, add: { stun: 1.2 }, desc: '선회 +15%. 부스트를 켜면 사이렌이 울려 주변 적이 1.2초 동안 얼어붙음' },
    { id: 'u_divebrake', frame: 'dive', slot: 'bomb', grade: 2, name: '급강하 브레이크', icon: ['parts_u4', 1], lines: ['M', 'B'], add: { bomb: 2, bombDmg: 7, diveBomb: 3 }, desc: '2초마다 폭탄. 부스트를 켜면 앞쪽 일직선에 폭탄 3발' },
    { id: 'u_hammer', frame: 'dive', slot: 'engine', grade: 3, name: '천둥 망치 엔진', icon: ['parts_u4', 2], lines: ['M', 'B'], mul: { speed: 1.1, boostRecover: 1.4 }, add: { ram: 30, boostMax: 0.5 }, desc: '속도 +10%, 부스트 +0.5초 · 충전 +40%. 부스트 중 부딪힌 적에게 피해 30 (박치기 피해 안 받음)' },
    // 제트 전폭기
    { id: 'u_rocketpod', frame: 'fbomber', slot: 'missile', grade: 2, name: '벌집 로켓 포드', icon: ['parts_u4', 3], lines: ['M', 'B'], add: { missile: 1.1, missileN: 2, missileDmg: 3, missileBoom: 80 }, desc: '1.1초마다 유도탄 4발, 맞은 곳이 폭발 (반지름 80)' },
    { id: 'u_napalm', frame: 'fbomber', slot: 'bomb', grade: 2, name: '치즈 네이팜', icon: ['parts_u4', 4], lines: ['M', 'B'], add: { bomb: 2, bombDmg: 6, napalm: 3 }, desc: '2초마다 폭탄, 터진 자리가 3초 동안 불탐' },
    { id: 'u_apround', frame: 'fbomber', slot: 'gun', grade: 3, name: '철갑 소이탄', icon: ['parts_u4', 5], lines: ['F', 'M'], mul: { bulletDmg: 1.3 }, add: { armorPierce: 1, burn: 4 }, desc: '위력 +30%, 장갑을 무시하고 맞은 적이 불탐 (초당 4)' },
    // 가변익 다목적기
    { id: 'u_swing', frame: 'swing', slot: 'wing', grade: 2, name: '가변 후퇴 제어기', icon: ['parts_u4', 6], lines: ['F', 'M'], mul: { turnBoost: 1.6, boostSpeed: 1.12 }, add: { boostGuard: 0.3 }, desc: '부스트 중 선회 +60% · 부스트 속도 +12%, 부스트 중 받는 피해 −30%' },
    { id: 'u_terrain', frame: 'swing', slot: 'radar', grade: 2, name: '지형 추적 레이더', icon: ['parts_u4', 7], add: { vision: 300, crit: 0.1, missileChain: 1 }, desc: '시야 +300 (안개), 치명타 +10%, 유도탄으로 처치하면 1발 더' },
    { id: 'u_multi', frame: 'swing', slot: 'missile', grade: 3, name: '다목적 무장 통제', icon: ['parts_u4', 8], add: { missile: 0.9, missileN: 2, missileDmg: 3 }, mul: { bomb: 0.7, cannon: 0.7, turret: 0.7, rail: 0.7, missile: 0.75 }, desc: '0.9초마다 유도탄 4발. 모든 장비 무기 간격 −30%' },
    // 무인기 지휘기
    { id: 'u_swarm', frame: 'drone', slot: 'drone', grade: 2, name: '편대 확장 모듈', icon: ['parts_u5', 0], add: { drone: 3, droneDmg: 1.5 }, desc: '무인기 +3, 무인기 위력 +1.5' },
    { id: 'u_shielddrone', frame: 'drone', slot: 'special', grade: 2, name: '방패 무인기', icon: ['parts_u5', 1], lines: ['M', 'B'], add: { drone: 1, droneShield: 1 }, desc: '무인기 +1. 무인기가 닿는 적 탄을 막아 줌' },
    { id: 'u_hive', frame: 'drone', slot: 'radar', grade: 3, name: '군체 지휘 AI', icon: ['parts_u5', 2], add: { drone: 2, droneLaser: 1, vision: 200 }, mul: { droneRate: 0.7 }, desc: '무인기 +2, 무인기가 꿰뚫는 레이저를 쏨 · 연사 +40%, 시야 +200' },
    // 궤도 왕복 공격기
    { id: 'u_repairdrone', frame: 'shuttle', slot: 'drone', grade: 2, name: '궤도 수리 무인기', icon: ['parts_u5', 3], lines: ['M', 'B'], add: { drone: 1, healPulse: 6 }, desc: '무인기 +1. 6초마다 체력 8% 회복' },
    { id: 'u_heattile', frame: 'shuttle', slot: 'armor', grade: 2, name: '열 차폐 타일', icon: ['parts_u5', 4], lines: ['M', 'B'], mul: { dmgTaken: 0.8 }, add: { hp: 120, hazardGuard: 0.5 }, desc: '체력 +120, 받는 피해 −20%, 번개 · 광선 · 분화 · 대공포 피해 −50%' },
    { id: 'u_orbital', frame: 'shuttle', slot: 'special', grade: 3, name: '궤도 폭격 지휘기', icon: ['parts_u5', 5], add: { orbital: 3.5 }, desc: '쏘는 동안 3.5초마다 조준한 곳에 궤도 광선 (위력 80, 반지름 170)' },
    // 스텔스 전투기
    { id: 'u_rampaint', frame: 'stealth', slot: 'special', grade: 2, name: '전파 흡수 도료', icon: ['parts_u5', 6], lines: ['F', 'M'], mul: { dmgTaken: 0.9 }, add: { evade: 0.15 }, desc: '적 탄이 15% 확률로 빗나감, 받는 피해 −10%' },
    { id: 'u_ambush', frame: 'stealth', slot: 'radar', grade: 2, name: '매복 사격 통제', icon: ['parts_u5', 7], add: { ambush: 4, crit: 0.1 }, desc: '1.5초 동안 안 쏘다가 쏘는 첫 사격이 위력 4배, 치명타 +10%' },
    { id: 'u_phantom', frame: 'stealth', slot: 'engine', grade: 3, name: '그림자 엔진', icon: ['parts_u5', 8], mul: { speed: 1.15, boostSpeed: 1.15 }, add: { phantom: 2.5 }, desc: '속도 · 부스트 속도 +15%. 부스트를 켜면 그 자리에 미끼가 남아 2.5초 동안 적이 미끼를 노림' },
    // 우주 요격기
    { id: 'u_plasma', frame: 'orbiter', slot: 'gun', grade: 2, name: '유도 플라스마탄', icon: ['parts_u6', 0], mul: { bulletDmg: 1.2 }, add: { homingShots: 2.5 }, desc: '위력 +20%, 주무장 탄이 가까운 적 쪽으로 휨' },
    { id: 'u_blink', frame: 'orbiter', slot: 'engine', grade: 2, name: '순간 이동 추진기', icon: ['parts_u6', 1], lines: ['F', 'M'], mul: { speed: 1.1 }, add: { blink: 320 }, desc: '속도 +10%. 부스트를 켜면 앞으로 순간 이동, 떠난 자리가 폭발 (위력 40)' },
    { id: 'u_starrail', frame: 'orbiter', slot: 'special', grade: 3, name: '별똥별 레일 캐논', icon: ['parts_u6', 2], add: { rail: 0.8, railDmg: 45 }, desc: '쏘는 동안 0.8초마다 굵은 레일건 (위력 70, 일직선 모두 꿰뚫음)' },
    // 극초음속 폭격기
    { id: 'u_glide', frame: 'hyper', slot: 'missile', grade: 2, name: '극초음속 활공탄', icon: ['parts_u6', 3], lines: ['B', 'M'], add: { missile: 1.2, missileN: 1, missileDmg: 8, missileBoom: 110 }, desc: '1.2초마다 유도탄 3발 (위력 +8), 맞은 곳이 크게 폭발' },
    { id: 'u_flame', frame: 'hyper', slot: 'engine', grade: 2, name: '불꽃 꼬리 엔진', icon: ['parts_u6', 4], mul: { boostSpeed: 1.15 }, add: { flameTrail: 12 }, desc: '부스트 속도 +15%. 부스트 중 지나간 길이 불탐 (초당 12)' },
    { id: 'u_thunderbomb', frame: 'hyper', slot: 'bomb', grade: 3, name: '번개 폭탄창', icon: ['parts_u6', 5], add: { bomb: 1.4, bombN: 1, bombDmg: 14, chainBolt: 3 }, desc: '1.4초마다 폭탄 2발, 터지면 가까운 적 3에게 번개가 튐 (폭탄 위력의 절반)' },
    // 공중 항공모함
    { id: 'u_airwing', frame: 'carrier', slot: 'drone', grade: 2, name: '함재 요격기 편대', icon: ['parts_u6', 6], add: { drone: 3, droneMissile: 1, droneDmg: 1 }, desc: '무인기 +3, 무인기가 가끔 유도탄을 쏨' },
    { id: 'u_ciws', frame: 'carrier', slot: 'turret', grade: 2, name: '근접 방어 기관포', icon: ['parts_u6', 7], lines: ['B', 'M'], add: { turret: 0.15, turretDmg: 1, ciws: 1 }, desc: '0.15초마다 자동 기총. 가까운 적 탄을 쏘아 떨어뜨림' },
    { id: 'u_fortcannon', frame: 'carrier', slot: 'gun', grade: 3, name: '치즈성 주포', icon: ['parts_u6', 8], mul: { bulletDmg: 1.15 }, add: { mega: 5 }, desc: '위력 +15%. 쏘는 동안 5초마다 거대 포탄 (위력 200, 폭발 반지름 240, 적 탄을 지움)' },
  ];

  const byId = (a) => Object.fromEntries(a.map((o) => [o.id, o]));
  const FRAME = byId(FRAMES);
  // 장비 전체: 일반 · 고급은 기체 기술 × 슬롯마다 만들고(id 는 예전 그대로), 희귀 · 전설은 UNIQUE
  // tier = 기술이 나온 기체 단계, lines = 낄 수 있는 갈래 (null = 모든 갈래)
  const PARTS = [];
  for (const f of FRAMES) {
    const k = 1 + 0.35 * f.tier;
    f.slots.forEach((sl, i) => {
      for (const g of [0, 1]) {
        const m = TEMPLATE[sl][g](k);
        PARTS.push({ id: `${f.id}_${sl}_${g}`, frame: f.id, slot: sl, grade: g, name: f.gear[i][g], icon: SLOT_TYPES[sl].icon[g], ...m, desc: describe(m) });
      }
    });
  }
  PARTS.push(...UNIQUE);
  for (const p of PARTS) {
    const f = FRAME[p.frame];
    p.tier = f.tier;
    p.lines ||= f.line ? [f.line] : null;
    // 낄 수 있는 기체: 갈래가 맞고 · 그 슬롯이 있고 · 기체 단계 ≥ 장비 티어
    p.fits = FRAMES.filter((fr) => fr.tier >= p.tier && fr.slots.includes(p.slot) && (!p.lines || !fr.line || p.lines.includes(fr.line))).map((fr) => fr.id);
  }
  const PART = byId(PARTS);
  const MAX_TIER = Math.max(...FRAMES.map((f) => f.tier));
  const POOL = GRADES.map((_, g) => PARTS.filter((p) => p.grade === g)); // 등급별 장비 (모든 티어 통틀어)

  // ── 제작 의뢰: 쓸 코인을 고름(톱니는 그 1/3). 많이 쓸수록 높은 등급 확률 ↑ (사이 금액은 로그 스케일로 이음)
  // 슬라이더 값은 기준 금액, 실제 비용 = 기준 × reqK (테크가 오를수록 비쌈)
  const REQ = { min: 30, max: 600, step: 10 };
  const ODDS = [ // [코인, 일반 · 고급 · 희귀 · 전설 %]
    [30, [70, 25, 4.5, 0.5]],
    [100, [45, 38, 14, 3]],
    [250, [25, 40, 27, 8]],
    [600, [10, 35, 38, 17]],
  ];
  function odds(coin) {
    coin = Math.max(REQ.min, Math.min(REQ.max, coin));
    let i = 0;
    while (i < ODDS.length - 2 && coin > ODDS[i + 1][0]) i++;
    const [c0, p0] = ODDS[i], [c1, p1] = ODDS[i + 1];
    const t = Math.log(coin / c0) / Math.log(c1 / c0);
    return p0.map((v, g) => v + (p1[g] - v) * t);
  }
  // 티어 확률: 지금 테크(T) 티어가 가장 많이, 한 단계 아래 · 두 단계 아래 순, 나머지 낮은 티어가 조금씩
  const TIER_W = [60, 25, 10]; // T, T-1, T-2 (%), 그 아래는 남은 5% 를 나눔
  function tierOdds(T = tech()) {
    const out = Array(T + 1).fill(0);
    let rest = 0;
    TIER_W.forEach((w, i) => { if (T - i >= 0) out[T - i] = w; else rest += w; });
    const low = T - TIER_W.length + 1;
    rest += 100 - TIER_W.reduce((a, b) => a + b, 0);
    if (low > 0) for (let t = 0; t < low; t++) out[t] = rest / low;
    else out[T] += rest; // 낮은 티어가 없으면 테크 티어로
    return out;
  }
  const reqK = () => 1 + 0.6 * tech();
  const requestCost = (coin) => [Math.round(coin * reqK() / 3), Math.round(coin * reqK())];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function roll(p) { let r = Math.random() * p.reduce((a, b) => a + b, 0), i = 0; while (i < p.length - 1 && r >= p[i]) { r -= p[i]; i++; } return i; }

  // ── 저장 (localStorage, 못 쓰면 이번 창에서만)
  // items = 가진 장비 [{ uid, id }], equip[기체][슬롯] = uid
  const KEY = 'ratplain_save_v2', OLD_KEY = 'ratplain_save_v1';
  function fresh() {
    const s = { v: 2, gear: 0, coin: 0, frames: ['biplane'], frame: 'biplane', items: [], uid: 1, equip: {}, sorties: 0, clears: 0, requests: 0, tierUps: 0, unlocked: 0, pick: 0, cleared: [] }; // unlocked = 열린 스테이지(0부터), cleared = 깬 스테이지 id
    // 처음엔 복엽기 일반 장비를 끼고 시작
    for (const sl of FRAME.biplane.slots) { const it = give(s, `biplane_${sl}_0`); (s.equip.biplane ||= {})[sl] = it.uid; }
    return s;
  }
  function give(s, id) { const it = { uid: s.uid++, id }; s.items.push(it); return it; }
  // v1 저장(같은 파츠를 사는 방식): 산 파츠 값은 재화로 돌려주고, 기체 · 스테이지 진행은 그대로
  const V1_COST = { eng1: [0, 30], eng2: [15, 60], eng3: [40, 120], gun1: [0, 20], gun2: [10, 45], gun3: [25, 80], gun4: [50, 150], wing1: [0, 20], wing2: [5, 35], wing3: [20, 70], arm1: [0, 35], arm2: [15, 60], arm3: [40, 120], sub1: [20, 70], sub2: [45, 140], sp1: [40, 120], sp2: [30, 100] };
  function migrate(o) {
    const s = fresh();
    for (const k of ['gear', 'coin', 'frames', 'frame', 'sorties', 'clears', 'unlocked', 'pick', 'cleared']) if (o[k] !== undefined) s[k] = o[k];
    for (const id of o.parts || []) if (V1_COST[id]) { s.gear += V1_COST[id][0]; s.coin += V1_COST[id][1]; }
    return s;
  }
  // 예전 저장 정리: 없는 장비 지우기, 장착 칸이 규칙(가진 기체 · 맞는 장비 · 한 장비는 한 곳)에 안 맞으면 뺌
  function tidy(s) {
    s.items = s.items.filter((it) => PART[it.id]);
    const seen = new Set();
    for (const [fid, eq] of Object.entries(s.equip)) {
      for (const [sl, uid] of Object.entries(eq)) {
        const it = s.items.find((x) => x.uid === uid);
        if (!it || !FRAME[fid] || !PART[it.id].fits.includes(fid) || PART[it.id].slot !== sl || seen.has(uid)) delete eq[sl];
        else seen.add(uid);
      }
    }
    return s;
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) return tidy(Object.assign(fresh(), s));
      const o = JSON.parse(localStorage.getItem(OLD_KEY));
      if (o && o.v === 1) return migrate(o);
    } catch (e) {}
    return fresh();
  }
  let save = load();
  const Q = new URLSearchParams(location.search);
  if (Q.has('rich')) { save.gear = Math.max(save.gear, 99999); save.coin = Math.max(save.coin, 99999); } // 확인용
  if (Q.has('allstages')) save.unlocked = window.STAGES.length - 1; // 확인용: 스테이지 다 열기
  if (Q.has('allframes')) save.frames = FRAMES.map((f) => f.id); // 확인용: 기체 다 갖기
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  const itemOf = (uid) => save.items.find((it) => it.uid === uid);
  const equipOf = (frameId) => save.equip[frameId] || {};
  // 이 장비를 끼고 있는 기체 id (없으면 null)
  function equippedOn(uid) { for (const [fid, e] of Object.entries(save.equip)) if (Object.values(e).includes(uid)) return fid; return null; }
  const isEquipped = (uid) => !!equippedOn(uid);
  const owns = (frameId) => save.frames.includes(frameId);
  // 테크 = 가진 기체 중 가장 높은 단계
  const tech = () => Math.max(...save.frames.map((id) => FRAME[id].tier));
  // 장비를 쓸 수 있는가 = 낄 수 있는 기체 중 하나라도 가짐
  const usable = (p) => p.fits.some(owns);
  const itemsFor = (frameId) => save.items.filter((it) => PART[it.id].fits.includes(frameId));

  // ── 수치 계산: 기체 · 장비 바꿔 끼운 가상 상태도 계산 가능 (격납고 미리보기)
  // over.frame = 기체 id, over.equip = { 슬롯: 장비 id }
  function compute(over = {}) {
    const frame = FRAME[over.frame || save.frame];
    const equip = {};
    for (const sl of frame.slots) { const it = itemOf(equipOf(frame.id)[sl]); if (it && PART[it.id].fits.includes(frame.id)) equip[sl] = it.id; }
    Object.assign(equip, over.equip);
    const s = Object.assign({}, BASE);
    const mods = [frame, ...Object.values(equip).map((id) => PART[id])];
    for (const m of mods) for (const [k, v] of Object.entries(m.add || {})) s[k] += v;
    for (const m of mods) for (const [k, v] of Object.entries(m.mul || {})) s[k] *= v;
    s.regenDelay = Math.max(0.3, s.regenDelay);
    s.evade = Math.min(0.5, s.evade);
    s.drone = Math.min(8, Math.round(s.drone));
    s.guns = frame.guns;
    s.frame = frame;
    s.equip = equip;
    return s;
  }
  // 격납고 표시용 요약 [이름, 값]
  function summary(s) {
    const fwd = s.guns.filter(([a]) => Math.abs(a) < 1).length;
    const dps = s.fireRate * s.bulletDmg * fwd * (1 + s.crit)
      + (s.missile ? s.missileN * s.missileDmg / s.missile : 0)
      + (s.cannon ? s.cannonDmg / s.cannon : 0)
      + (s.bomb ? s.bombN * s.bombDmg * (s.bombBig ? 3 : 1) / s.bomb : 0)
      + (s.turret ? s.turretN * s.turretDmg / s.turret : 0)
      + (s.drone ? s.drone * s.droneDmg * (s.droneLaser ? 2 : 1) / s.droneRate : 0)
      + (s.rail ? s.railDmg / s.rail : 0)
      + (s.mega ? 200 / s.mega : 0) + (s.orbital ? 80 / s.orbital : 0);
    return [
      ['체력', Math.round(s.hp)],
      ['속도', Math.round(s.speed)],
      ['선회', +s.turn.toFixed(1)],
      ['화력', Math.round(dps)],
      ['관통', s.pierce],
      ['부스트', +s.boostMax.toFixed(1)],
      ['시야', Math.round(s.vision)],
      ['바람 저항', Math.round((1 - s.windK) * 100)], // 음수 = 바람에 더 밀림
    ];
  }

  const can = (cost) => save.gear >= cost[0] && save.coin >= cost[1];
  function pay(cost) { save.gear -= cost[0]; save.coin -= cost[1]; }
  const frameBuyable = (f) => !save.frames.includes(f.id) && (!f.req || save.frames.includes(f.req));
  function buyFrame(id) {
    const f = FRAME[id];
    if (!frameBuyable(f) || !can(f.cost)) return false;
    pay(f.cost); save.frames.push(id); save.frame = id; store(); return true;
  }
  function useFrame(id) { if (!save.frames.includes(id)) return false; save.frame = id; store(); return true; }
  // 장착 이유 검사: null = 낄 수 있음, 아니면 못 끼는 이유
  function whyNot(uid, frameId) {
    const it = itemOf(uid), f = FRAME[frameId];
    if (!it || !f) return '없음';
    const p = PART[it.id];
    if (!owns(frameId)) return '아직 없는 기체';
    if (!f.slots.includes(p.slot)) return `${SLOT_TYPES[p.slot].name} 슬롯 없음`;
    if (p.tier > f.tier) return `티어 ${p.tier} 장비 — ${p.tier}단계 이상 기체만`;
    if (!p.fits.includes(frameId)) return `${p.lines.map((l) => LINES[l]).join(' · ')} 전용`;
    return null;
  }
  // 장착: 다른 기체에 끼워 있던 것이면 거기서 빼서 옮김
  function equipItem(uid, frameId) {
    if (whyNot(uid, frameId)) return false;
    const p = PART[itemOf(uid).id];
    for (const e of Object.values(save.equip)) for (const [sl, u] of Object.entries(e)) if (u === uid) delete e[sl];
    (save.equip[frameId] ||= {})[p.slot] = uid; store(); return true;
  }
  function unequip(frameId, slot) { if (save.equip[frameId]) delete save.equip[frameId][slot]; store(); }
  // 쓸 수 있는 장비 중 (티어 t, 등급 g). 없으면 아래 티어로 내려가며 찾음
  function candidates(t, g) {
    for (let k = t; k >= 0; k--) { const c = POOL[g].filter((p) => p.tier === k && usable(p)); if (c.length) return c; }
    return POOL[g].filter(usable);
  }
  // 제작 의뢰: 티어를 뽑고(테크 기준), 등급을 뽑고(쓴 코인 기준), 그 안에서 가진 기체가 쓸 수 있는 장비 하나
  function request(coin) {
    coin = Math.round(Math.max(REQ.min, Math.min(REQ.max, coin)));
    const cost = requestCost(coin);
    if (!can(cost)) return null;
    pay(cost);
    const t = roll(tierOdds()), g = roll(odds(coin));
    const it = give(save, pick(candidates(t, g)).id);
    save.requests++;
    store();
    return it;
  }
  // 합성: 같은 티어 · 같은 등급 3개(장착 안 한 것) → 같은 티어 한 등급 위 장비 하나 (랜덤)
  // 티어 업 도전: 같은 티어 전설 3~6개 → 성공하면 한 티어 위 전설 하나, 실패하면 같은 티어 전설 하나만 남음. 넣을수록 성공 확률 ↑
  // 한 티어 위 기체를 가져야(테크가 올라야) 도전할 수 있음
  const FUSE_N = 3, UP_MAX = 6;
  const UP_CHANCE = { 3: 35, 4: 50, 5: 65, 6: 80 };
  function fuseInfo(uids) {
    if (new Set(uids).size !== uids.length || uids.length < FUSE_N) return null;
    const its = uids.map(itemOf);
    if (its.some((it) => !it || isEquipped(it.uid))) return null;
    const p0 = PART[its[0].id];
    if (its.some((it) => PART[it.id].grade !== p0.grade || PART[it.id].tier !== p0.tier)) return null;
    if (p0.grade < 3) return uids.length === FUSE_N ? { kind: 'fuse', tier: p0.tier, grade: p0.grade } : null;
    if (uids.length > UP_MAX) return null;
    if (p0.tier >= MAX_TIER) return { kind: 'up', tier: p0.tier, chance: UP_CHANCE[uids.length], block: '이미 가장 높은 티어' };
    if (p0.tier + 1 > tech()) return { kind: 'up', tier: p0.tier, chance: UP_CHANCE[uids.length], block: `${p0.tier + 1}단계 기체가 있어야 도전 가능` };
    return { kind: 'up', tier: p0.tier, chance: UP_CHANCE[uids.length] };
  }
  const fusable = (uids) => { const f = fuseInfo(uids); return !!f && !f.block; };
  // 돌려줌: { it, ok } — ok = 티어 업 성공 여부 (합성은 늘 true)
  function fuse(uids) {
    const f = fuseInfo(uids);
    if (!f || f.block) return null;
    save.items = save.items.filter((it) => !uids.includes(it.uid));
    let it, ok = true;
    if (f.kind === 'fuse') it = give(save, pick(candidates(f.tier, f.grade + 1)).id);
    else {
      ok = Math.random() * 100 < f.chance;
      it = give(save, pick(candidates(ok ? f.tier + 1 : f.tier, 3)).id);
      save.tierUps++;
    }
    store();
    return { it, ok };
  }
  // 전투 끝: 이기면 전부 + 다음 스테이지 열림, 지면 절반을 격납고로
  function bank(gear, coin, win, stage) {
    const k = win ? 1 : 0.5;
    const g = Math.floor(gear * k), c = Math.floor(coin * k);
    save.gear += g; save.coin += c; save.sorties++;
    if (win) {
      save.clears++;
      const id = window.STAGES[stage].id;
      if (!save.cleared.includes(id)) save.cleared.push(id);
      save.unlocked = Math.min(window.STAGES.length - 1, Math.max(save.unlocked, stage + 1));
    }
    store();
    return [g, c];
  }
  function pickStage(i) { if (i < 0 || i > save.unlocked) return false; save.pick = i; store(); return true; }
  function reset() { save = fresh(); store(); }

  window.UPGRADES = {
    BASE, GRADES, ERAS, TIER_COL, LINES, FRAMES, SLOT_TYPES, PARTS, FRAME, PART, POOL, REQ, FUSE_N, UP_MAX, UP_CHANCE, MAX_TIER,
    get save() { return save; },
    compute, summary, can, frameBuyable, odds, tierOdds, tech, reqK, requestCost, itemOf, equipOf, equippedOn, isEquipped, owns, usable, itemsFor, whyNot, fuseInfo, fusable,
    buyFrame, useFrame, equipItem, unequip, request, fuse, bank, pickStage, reset,
  };
})();
