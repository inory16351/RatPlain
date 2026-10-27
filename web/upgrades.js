// 아웃게임 강화: 비행기 진화(기체) + 기체 전용 장비 + 과학자 쥐 제작 의뢰 · 합성 + 저장 (설계: docs/장비_제작의뢰.md)
// 기체 = 실제 비행기 발전 순서. 0 복엽기(1900년대) → 1 단엽 · 쌍발 프로펠러기(2차대전) → 2 제트기 · 중폭격기(1950년대) → 3 초음속기 · 전익기(현대)
// 갈래: 위 = 빠른 전투기 줄, 아래 = 튼튼한 폭격기 줄. 부모 기체를 가져야 다음 기체를 살 수 있음.
// 장비: 기체마다 슬롯 구성이 다르고, 장비 하나하나가 기체 하나 전용. 상점이 없고 제작 의뢰(완전 랜덤)로만 얻음.
//   일반 · 고급 = 수치만 오르는 기본형(슬롯 종류 틀 × 기체 단계로 만듦), 희귀 · 전설 = 고유 효과 장비(UNIQUE)
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
    missile: 0, missileN: 2, missileDmg: 4, // 유도탄 간격(초)
    cannon: 0, cannonDmg: 6,                // 기수포 간격 · 위력 (조준 쪽으로 굵은 탄)
    bomb: 0, bombN: 1, bombDmg: 10, bombR: 110, // 폭탄 간격 · 한 번에 · 위력 · 폭발 반지름 (비행기 앞쪽에 떨어져 터짐)
    turret: 0, turretN: 1, turretDmg: 1.5, turretPierce: 0, // 자동 기총탑 간격 (가장 가까운 적을 알아서 쏨)
    shield: 0,                              // 방어막: 한 번 막고 다시 차는 시간(초)
    coinBonus: 0,                           // 치즈 코인 더 떨어뜨리는 비율
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
    rail: 0,         // 레일건 간격(초)
    thorns: 0,       // 방어막이 막을 때 반격탄 N 발
    bombBig: 0,      // 폭탄 범위 2배 · 위력 3배 + 터지면 적 탄 지움
    shadow: [26, 38],                       // 그림자 어긋남 (높이감)
  };

  const GRADES = [
    { name: '일반', col: '#c9d2dc' },
    { name: '고급', col: '#7fd88a' },
    { name: '희귀', col: '#6fb8ff' },
    { name: '전설', col: '#ffb84d' },
  ];
  const ERAS = ['1900년대', '2차대전', '1950년대', '현대'];

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
    special: { name: '특수 장치', glyph: '★', icon: [['parts_b', 6], ['parts_b', 6]] },
  };

  // 기체: row = 진화 트리 줄(0 위 · 1 가운데 · 2 아래), guns = 총구 [각도 어긋남(rad), 옆 간격(px)], slots = 장비 슬롯 (기체마다 다름)
  // gear = 일반 · 고급 장비 이름 [일반, 고급] (슬롯 순서대로)
  // spr = 전용 그림 (art/sprites/<spr>_0.png). 아직 없으면 기본 그림에 tint(색 필터) · scale 로 대신함
  const FRAMES = [
    {
      id: 'biplane', name: '쥐돌이 1호', kind: '복엽 글라이더', tier: 0, row: 1, req: null, cost: [0, 0],
      desc: '과학자 쥐가 처음 만든 천 날개 글라이더. 총 한 정.',
      guns: [[0, 0]], spr: 'player',
      slots: ['engine', 'gun', 'wing'],
      gear: [['낡은 4기통 엔진', '치즈 연소 엔진'], ['구식 기관총', '고속 기관총'], ['천 날개', '경량 천 날개']],
    },
    {
      id: 'mono', name: '치즈 스피드', kind: '단엽 전투기', tier: 1, row: 0, req: 'biplane', cost: [25, 40],
      desc: '날개를 한 장으로 줄여 빠르고 날렵함. 쌍열 기관총.',
      add: { hp: 20 }, mul: { speed: 1.15, boostSpeed: 1.1, turn: 1.1 },
      guns: [[0, -10], [0, 10]], spr: 'player_mono', tint: 'hue-rotate(-25deg) saturate(1.3)', scale: 0.95,
      slots: ['engine', 'gun', 'wing', 'scope'],
      gear: [['직렬 엔진', '과급 직렬 엔진'], ['쌍열 기관총', '고속 쌍열 기관총'], ['단엽 날개', '층류 날개'], ['링 조준기', '망원 조준기']],
    },
    {
      id: 'heavy', name: '쌍발 치즈통', kind: '쌍발 중전투기', tier: 1, row: 2, req: 'biplane', cost: [25, 40],
      desc: '엔진 두 개로 튼튼함. 3갈래 산탄 + 기수포.',
      add: { hp: 60, fireRate: -1 }, mul: { turn: 0.95 },
      guns: [[-0.13, 0], [0, 0], [0.13, 0]], spr: 'player_heavy', tint: 'hue-rotate(70deg) saturate(.8)', scale: 1.15,
      slots: ['engine', 'gun', 'armor', 'nose'],
      gear: [['쌍발 성형 엔진', '강화 쌍발 엔진'], ['산탄 기관포', '대구경 산탄포'], ['강판 동체', '이중 강판 동체'], ['기수 기관총', '쌍열 기수포']],
    },
    {
      id: 'jet', name: '은빛 꼬리', kind: '후퇴익 제트기', tier: 2, row: 0, req: 'mono', cost: [60, 120],
      desc: '프로펠러 대신 제트. 아주 빠르고 탄이 적 하나를 뚫음. 유도탄 장착.',
      add: { hp: 40, pierce: 1, boostMax: 0.6, fireRate: 2 }, mul: { speed: 1.3, boostSpeed: 1.3, turn: 1.15, bulletSpd: 1.35 },
      guns: [[0, -10], [0, 10]], spr: 'player_jet', tint: 'saturate(.25) brightness(1.15)', scale: 0.95,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile'],
      gear: [['터보제트', '개량 터보제트'], ['20mm 기관포', '고속 기관포'], ['후퇴익', '가변 후퇴익'], ['기상 레이더', '사격 레이더'], ['적외선 유도탄', '개량 유도탄']],
    },
    {
      id: 'fort', name: '하늘 요새', kind: '4발 중폭격기', tier: 2, row: 2, req: 'heavy', cost: [60, 120],
      desc: '날아다니는 요새. 5갈래 산탄 + 뒤쪽 기관총, 폭탄창 · 기총탑.',
      add: { hp: 130, fireRate: -1 }, mul: { speed: 0.95, turn: 0.9 },
      guns: [[-0.24, 0], [-0.12, 0], [0, 0], [0.12, 0], [0.24, 0], [Math.PI, 0]], spr: 'player_fort', tint: 'saturate(.55) brightness(.85)', scale: 1.3,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret'],
      gear: [['4발 엔진', '과급 4발 엔진'], ['산탄 포대', '강화 산탄 포대'], ['요새 장갑', '이중 요새 장갑'], ['소형 폭탄창', '강화 폭탄창'], ['후방 기총탑', '강화 기총탑']],
    },
    {
      id: 'super', name: '번개 꼬리', kind: '초음속 델타익기', tier: 3, row: 0, req: 'jet', cost: [130, 260],
      desc: '음속을 넘는 삼각 날개. 4열 관통탄.',
      add: { hp: 70, pierce: 2, boostMax: 1, fireRate: 3 }, mul: { speed: 1.45, boostSpeed: 1.45, turn: 1.25, bulletSpd: 1.6 },
      guns: [[0, -15], [0, -5], [0, 5], [0, 15]], spr: 'player_super', tint: 'saturate(0) brightness(1.3)', scale: 1,
      slots: ['engine', 'gun', 'wing', 'radar', 'missile', 'special'],
      gear: [['터보팬', '애프터버너'], ['개틀링포', '고속 개틀링포'], ['델타익', '카나드 델타익'], ['펄스 레이더', '도플러 펄스 레이더'], ['공대공 미사일', '다연장 미사일'], ['방어막 발생기', '강화 방어막']],
    },
    {
      id: 'flywing', name: '치즈 전익기', kind: '전익 전략폭격기', tier: 3, row: 2, req: 'fort', cost: [130, 260],
      desc: '거대한 날개 하나. 7갈래 산탄 + 뒤쪽 2갈래, 스스로 빨리 회복.',
      add: { hp: 220 }, mul: { turn: 0.95, regen: 1.3 },
      guns: [[-0.36, 0], [-0.24, 0], [-0.12, 0], [0, 0], [0.12, 0], [0.24, 0], [0.36, 0], [Math.PI - 0.15, 0], [Math.PI + 0.15, 0]],
      spr: 'player_flywing', tint: 'saturate(.3) brightness(.7)', scale: 1.4,
      slots: ['engine', 'gun', 'armor', 'bomb', 'turret', 'special'],
      gear: [['내장 엔진', '고출력 내장 엔진'], ['광역 산탄 포대', '대형 산탄 포대'], ['복합 장갑', '티타늄 장갑'], ['전략 폭탄창', '대형 폭탄창'], ['원격 기총탑', '쌍발 원격 기총탑'], ['방어막 발생기', '강화 방어막']],
    },
  ];

  // 일반 · 고급 장비 틀: (k = 기체 단계 배율) → { add, mul }. 단계 높은 기체 장비일수록 조금 더 셈
  const r2 = (v) => Math.round(v * 100) / 100;
  const TEMPLATE = {
    engine: [(k) => ({ mul: { speed: r2(1 + 0.05 * k) } }), (k) => ({ mul: { speed: r2(1 + 0.07 * k) }, add: { boostMax: r2(0.4 * k) } })],
    gun: [(k) => ({ mul: { fireRate: r2(1 + 0.1 * k) } }), (k) => ({ mul: { bulletDmg: r2(1 + 0.15 * k), fireRate: r2(1 + 0.08 * k) } })],
    wing: [(k) => ({ mul: { turn: r2(1 + 0.08 * k), turnBoost: r2(1 + 0.08 * k) } }), (k) => ({ mul: { turn: r2(1 + 0.1 * k), turnBoost: r2(1 + 0.1 * k), pickup: r2(1 + 0.3 * k) } })],
    armor: [(k) => ({ add: { hp: Math.round(20 * k) } }), (k) => ({ add: { hp: Math.round(30 * k) }, mul: { regen: r2(1 + 0.2 * k) } })],
    scope: [(k) => ({ add: { crit: r2(0.06 * k) } }), (k) => ({ add: { crit: r2(0.08 * k) }, mul: { bulletSpd: r2(1 + 0.1 * k) } })],
    nose: [(k) => ({ add: { cannon: 1.4, cannonDmg: Math.round(3 * k) } }), (k) => ({ add: { cannon: 1.1, cannonDmg: Math.round(5 * k) } })],
    radar: [(k) => ({ add: { coinBonus: r2(0.1 * k) }, mul: { pickup: r2(1 + 0.4 * k) } }), (k) => ({ add: { coinBonus: r2(0.15 * k), crit: r2(0.04 * k) }, mul: { pickup: r2(1 + 0.5 * k) } })],
    missile: [(k) => ({ add: { missile: 1.2, missileDmg: Math.round(k) } }), (k) => ({ add: { missile: 0.9, missileN: 2, missileDmg: Math.round(k) } })],
    bomb: [(k) => ({ add: { bomb: 2.2, bombDmg: Math.round(4 * k) } }), (k) => ({ add: { bomb: 1.6, bombN: 1, bombDmg: Math.round(5 * k) } })],
    turret: [(k) => ({ add: { turret: 0.5, turretDmg: r2(0.3 * k) } }), (k) => ({ add: { turret: 0.35, turretDmg: r2(0.5 * k) } })],
    special: [(k) => ({ add: { shield: 9 } }), (k) => ({ add: { shield: 7, coinBonus: 0.2 } })],
  };
  // 장비 설명 자동 작성용 (일반 · 고급)
  const STAT_TXT = {
    speed: '속도', boostSpeed: '부스트 속도', turn: '선회', fireRate: '연사', bulletDmg: '위력', bulletSpd: '탄속', pickup: '재료 끌어오기',
    regen: '회복', hp: '체력', boostMax: '부스트', crit: '치명타', coinBonus: '치즈 코인', missileN: '유도탄 수', missileDmg: '유도탄 위력',
    cannonDmg: '기수포 위력', bombN: '폭탄 수', bombDmg: '폭탄 위력', turretDmg: '기총탑 위력',
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

  // 희귀 · 전설 고유 장비: icon = 고유 아이콘 시트 칸 (parts_u1~u3)
  const UNIQUE = [
    // 복엽 글라이더
    { id: 'u_sauce', frame: 'biplane', slot: 'gun', grade: 2, name: '치즈 소스 탄띠', icon: ['parts_u1', 0], mul: { fireRate: 1.1 }, add: { killBoost: 0.5 }, desc: '연사 +10%, 적을 처치하면 부스트 0.5초 충전' },
    { id: 'u_pinwheel', frame: 'biplane', slot: 'wing', grade: 2, name: '바람개비 날개끝', icon: ['parts_u1', 1], mul: { turn: 1.2, turnBoost: 1.2 }, add: { boostGuard: 0.5 }, desc: '선회 +20%, 부스트 중 받는 피해 −50%' },
    { id: 'u_proto', frame: 'biplane', slot: 'engine', grade: 3, name: '과학자 쥐의 시제 엔진', icon: ['parts_u1', 2], mul: { speed: 1.15 }, add: { regenFire: 0.6 }, desc: '속도 +15%, 쏘는 중에도 체력 회복 (60%)' },
    // 단엽 전투기
    { id: 'u_hawkeye', frame: 'mono', slot: 'scope', grade: 2, name: '매눈 조준경', icon: ['parts_u1', 3], mul: { bulletSpd: 1.15 }, add: { crit: 0.2 }, desc: '치명타 +20% (2배 피해), 탄속 +15%' },
    { id: 'u_tracer', frame: 'mono', slot: 'gun', grade: 2, name: '예광탄 벨트', icon: ['parts_u1', 4], add: { tracer: 5 }, desc: '5번째 사격마다 위력 3배 · 관통 3 예광탄' },
    { id: 'u_swallow', frame: 'mono', slot: 'wing', grade: 3, name: '제비꼬리 날개', icon: ['parts_u1', 5], mul: { turn: 1.25, turnBoost: 1.25 }, add: { boostDodge: 1, boostMax: 0.5 }, desc: '선회 +25%, 부스트 +0.5초. 부스트를 켜는 순간 0.6초 무적 + 주변 적 탄을 지움' },
    // 쌍발 중전투기
    { id: 'u_padding', frame: 'heavy', slot: 'armor', grade: 2, name: '치즈 완충재', icon: ['parts_u1', 6], mul: { dmgTaken: 0.8 }, add: { hp: 40 }, desc: '체력 +40, 받는 피해 −20%' },
    { id: 'u_37mm', frame: 'heavy', slot: 'nose', grade: 2, name: '37mm 기수포', icon: ['parts_u1', 7], add: { cannon: 1, cannonDmg: 8, cannonBoom: 1 }, desc: '1초마다 기수포 (위력 14), 맞은 곳이 폭발' },
    { id: 'u_twinheart', frame: 'heavy', slot: 'engine', grade: 3, name: '쌍둥이 심장', icon: ['parts_u1', 8], mul: { speed: 1.08 }, add: { hp: 30, berserk: 1 }, desc: '속도 +8%, 체력 +30. 체력이 절반 아래면 위력 +50% · 연사 +30%' },
    // 후퇴익 제트기
    { id: 'u_doppler', frame: 'jet', slot: 'radar', grade: 2, name: '도플러 레이더', icon: ['parts_u2', 0], mul: { missile: 0.7, pickup: 1.6 }, desc: '유도탄 간격 −30%, 재료 끌어오기 +60%' },
    { id: 'u_tailchase', frame: 'jet', slot: 'missile', grade: 2, name: '꼬리 추적 미사일', icon: ['parts_u2', 1], add: { missile: 0.9, missileDmg: 2, missileChain: 2 }, desc: '0.9초마다 유도탄, 유도탄으로 처치하면 그 자리에서 2발 더' },
    { id: 'u_sonic', frame: 'jet', slot: 'engine', grade: 3, name: '음속 돌파 엔진', icon: ['parts_u2', 2], mul: { speed: 1.12, boostSpeed: 1.2 }, add: { sonic: 20 }, desc: '속도 +12%, 부스트 속도 +20%. 부스트를 켜면 충격파: 주변 적에게 피해 20 · 적 탄을 지움' },
    // 4발 중폭격기
    { id: 'u_cluster', frame: 'fort', slot: 'bomb', grade: 2, name: '집속 치즈탄', icon: ['parts_u2', 3], add: { bomb: 2, bombDmg: 6, cluster: 4 }, desc: '2초마다 폭탄, 터지면 작은 폭탄 4개가 흩어짐' },
    { id: 'u_twinturret', frame: 'fort', slot: 'turret', grade: 2, name: '쌍열 기총탑', icon: ['parts_u2', 4], add: { turret: 0.3, turretN: 1, turretDmg: 0.6, turretPierce: 1 }, desc: '0.3초마다 2연발 자동 기총, 관통 +1' },
    { id: 'u_carpet', frame: 'fort', slot: 'bomb', grade: 3, name: '치즈 융단 폭격', icon: ['parts_u2', 5], add: { bomb: 1.8, bombDmg: 8, carpet: 1 }, desc: '1.8초마다 폭탄. 부스트 중엔 지나간 길에 폭탄을 쉴 새 없이 뿌림' },
    // 초음속 델타익기
    { id: 'u_phased', frame: 'super', slot: 'radar', grade: 2, name: '위상 배열 레이더', icon: ['parts_u2', 6], add: { crit: 0.15, critMissile: 1 }, desc: '치명타 +15%, 치명타가 터지면 유도탄 1발' },
    { id: 'u_chaff', frame: 'super', slot: 'special', grade: 2, name: '채프 발사기', icon: ['parts_u2', 7], add: { chaff: 8 }, desc: '맞으면 주변 적 탄을 모두 지움 (8초마다)' },
    { id: 'u_railgun', frame: 'super', slot: 'gun', grade: 3, name: '번개 꼬리 레일건', icon: ['parts_u2', 8], mul: { bulletSpd: 1.3 }, add: { rail: 1.2 }, desc: '탄속 +30%. 쏘는 동안 1.2초마다 일직선으로 모두 꿰뚫는 레일건 (위력 25)' },
    // 전익 전략폭격기
    { id: 'u_selfrepair', frame: 'flywing', slot: 'armor', grade: 2, name: '자가 수복 장갑', icon: ['parts_u3', 0], mul: { regen: 1.5 }, add: { hp: 60, regenDelay: -1 }, desc: '체력 +60, 회복 +50%, 회복 시작 1초 빨리' },
    { id: 'u_shield2', frame: 'flywing', slot: 'special', grade: 2, name: '치즈 방어막 Mk2', icon: ['parts_u3', 1], add: { shield: 5, thorns: 12 }, desc: '5초마다 방어막, 막을 때 주위로 반격탄 12발' },
    { id: 'u_bigbomb', frame: 'flywing', slot: 'bomb', grade: 3, name: '대형 치즈 폭탄', icon: ['parts_u3', 2], add: { bomb: 3, bombDmg: 10, bombBig: 1 }, desc: '3초마다 거대 폭탄 (범위 2배 · 위력 3배), 터지면 주변 적 탄을 지움' },
  ];

  // 장비 전체: 일반 · 고급은 기체 × 슬롯마다 만들고, 희귀 · 전설은 UNIQUE
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
  const byId = (a) => Object.fromEntries(a.map((o) => [o.id, o]));
  const FRAME = byId(FRAMES), PART = byId(PARTS);
  const POOL = GRADES.map((_, g) => PARTS.filter((p) => p.grade === g)); // 등급별 장비 (모든 기체 통틀어)

  // ── 제작 의뢰: 쓸 코인을 고름(톱니는 그 1/3). 많이 쓸수록 높은 등급 확률 ↑ (사이 금액은 로그 스케일로 이음)
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
  const requestCost = (coin) => [Math.round(coin / 3), coin];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ── 저장 (localStorage, 못 쓰면 이번 창에서만)
  // items = 가진 장비 [{ uid, id }], equip[기체][슬롯] = uid
  const KEY = 'ratplain_save_v2', OLD_KEY = 'ratplain_save_v1';
  function fresh() {
    const s = { v: 2, gear: 0, coin: 0, frames: ['biplane'], frame: 'biplane', items: [], uid: 1, equip: {}, sorties: 0, clears: 0, requests: 0, unlocked: 0, pick: 0, cleared: [] }; // unlocked = 열린 스테이지(0부터), cleared = 깬 스테이지 id
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
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) return Object.assign(fresh(), s);
      const o = JSON.parse(localStorage.getItem(OLD_KEY));
      if (o && o.v === 1) return migrate(o);
    } catch (e) {}
    return fresh();
  }
  let save = load();
  const Q = new URLSearchParams(location.search);
  if (Q.has('rich')) { save.gear = Math.max(save.gear, 9999); save.coin = Math.max(save.coin, 9999); } // 확인용
  if (Q.has('allstages')) save.unlocked = window.STAGES.length - 1; // 확인용: 스테이지 다 열기
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  const itemOf = (uid) => save.items.find((it) => it.uid === uid);
  const equipOf = (frameId) => save.equip[frameId] || {};
  const isEquipped = (uid) => Object.values(save.equip).some((e) => Object.values(e).includes(uid));
  const itemsFor = (frameId) => save.items.filter((it) => PART[it.id].frame === frameId);

  // ── 수치 계산: 기체 · 장비 바꿔 끼운 가상 상태도 계산 가능 (격납고 미리보기)
  // over.frame = 기체 id, over.equip = { 슬롯: 장비 id }
  function compute(over = {}) {
    const frame = FRAME[over.frame || save.frame];
    const equip = {};
    for (const sl of frame.slots) { const it = itemOf(equipOf(frame.id)[sl]); if (it) equip[sl] = it.id; }
    Object.assign(equip, over.equip);
    const s = Object.assign({}, BASE);
    const mods = [frame, ...Object.values(equip).map((id) => PART[id])];
    for (const m of mods) for (const [k, v] of Object.entries(m.add || {})) s[k] += v;
    for (const m of mods) for (const [k, v] of Object.entries(m.mul || {})) s[k] *= v;
    s.regenDelay = Math.max(0.3, s.regenDelay);
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
      + (s.rail ? 25 / s.rail : 0);
    return [
      ['체력', Math.round(s.hp)],
      ['속도', Math.round(s.speed)],
      ['선회', +s.turn.toFixed(1)],
      ['화력', Math.round(dps)],
      ['관통', s.pierce],
      ['부스트', +s.boostMax.toFixed(1)],
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
  // 장착: 장비의 기체에 끼움 (그 기체를 아직 없어도 미리 끼워 둘 수 있음)
  function equipItem(uid) {
    const it = itemOf(uid);
    if (!it) return false;
    const p = PART[it.id];
    (save.equip[p.frame] ||= {})[p.slot] = uid; store(); return true;
  }
  function unequip(frameId, slot) { if (save.equip[frameId]) delete save.equip[frameId][slot]; store(); }
  // 제작 의뢰: 등급을 먼저 뽑고, 그 등급 장비 전체(모든 기체)에서 하나
  function request(coin) {
    coin = Math.round(Math.max(REQ.min, Math.min(REQ.max, coin)));
    const cost = requestCost(coin);
    if (!can(cost)) return null;
    pay(cost);
    const p = odds(coin);
    let r = Math.random() * 100, g = 0;
    while (g < 3 && r >= p[g]) { r -= p[g]; g++; }
    const it = give(save, pick(POOL[g]).id);
    save.requests++;
    store();
    return it;
  }
  // 합성: 같은 등급 3개(장착 안 한 것) → 한 등급 위 장비 하나 (완전 랜덤)
  const FUSE_N = 3;
  function fusable(uids) {
    if (uids.length !== FUSE_N || new Set(uids).size !== FUSE_N) return false;
    const its = uids.map(itemOf);
    if (its.some((it) => !it || isEquipped(it.uid))) return false;
    const g = PART[its[0].id].grade;
    return g < 3 && its.every((it) => PART[it.id].grade === g);
  }
  function fuse(uids) {
    if (!fusable(uids)) return null;
    const g = PART[itemOf(uids[0]).id].grade;
    save.items = save.items.filter((it) => !uids.includes(it.uid));
    const it = give(save, pick(POOL[g + 1]).id);
    store();
    return it;
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
    BASE, GRADES, ERAS, FRAMES, SLOT_TYPES, PARTS, FRAME, PART, POOL, REQ, FUSE_N,
    get save() { return save; },
    compute, summary, can, frameBuyable, odds, requestCost, itemOf, equipOf, isEquipped, itemsFor, fusable,
    buyFrame, useFrame, equipItem, unequip, request, fuse, bank, pickStage, reset,
  };
})();
