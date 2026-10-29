// 아웃게임 강화: 배 진화(현실 배 발전 순서) + 장비(티어 · 등급 · 낄 수 있는 갈래가 따로) + 조선소 제작 의뢰 · 합성 · 티어 업 도전 + 저장
// 쥐 비행기 게임 web/upgrades.js 구조를 그대로 가져와 배에 맞게 바꿈
// 배 = 실제 배 발전 순서. 0 고대 → 1 대항해시대 → 2 범선 전성기 → 3 증기선 → 4 강철 군함 → 5 현대
// 갈래(line): S = 위 · 빠른 쾌속선, M = 가운데 · 다목적(특수탄 · 어뢰), H = 아래 · 튼튼한 중포함. 부모 배를 가져야 다음 배를 살 수 있음
// 장착 조건 = 가진 배 + 그 배에 그 슬롯이 있음 + 장비가 맞는 갈래 + 배 단계 ≥ 장비 티어
// 수치 계산: BASE → 배 · 장비 add → mul
(function () {
  const BASE = {
    hp: 100, speed: 170, turn: 1.5, dmgTaken: 1,
    guns: 2, reload: 2.1, dmg: 14, crit: 0.1, range: 1, ballSpd: 540,
    pickup: 150, crewMax: 12, crewReload: 0.02, repair: 15, // 선원 1명당 장전 −2% (최대 crewMax 명), 웨이브 사이 수리
    goldBonus: 0, plankBonus: 0,
    // 특수탄 · 박격포 (0 = 없음, 값 = 재사용 초)
    chain: 0, fire: 0, mortar: 0, mortarDmg: 60, mortarR: 110,
    // 자동 무기 (간격 초, 0 = 없음)
    bow: 0, bowDmg: 10,            // 선수포: 앞쪽 가까운 적에게 자동 사격
    torpedo: 0, torpedoDmg: 40,    // 어뢰: 마우스 쪽으로 곧게 달림
    missile: 0, missileDmg: 18,    // 유도탄
    planes: 0, planeDmg: 6,        // 함재기 수 (배 둘레를 돌며 가까운 적을 쏨)
    // 고유 효과 (희귀 · 전설)
    ram: 0,          // 부딪힌 적에게 피해 (내 배는 박치기 피해 안 받음)
    splash: 0,       // 포탄이 맞은 곳 폭발 반지름
    burnAll: 0,      // 모든 포탄 화염 확률
    chainAll: 0,     // 모든 포탄 체인샷 확률
    plunder: 0,      // 격침하면 체력 회복 (최대 체력 비율)
    evade: 0,        // 맞을 때 빗나갈 확률
    double: 0,       // 일제 사격이 한 번 더 나갈 확률
    autoMortar: 0,   // N 초마다 가까운 적에게 자동 폭격
    crewHeal: 0,     // 선원을 건지면 체력 +N
    kraken: 0,       // 체인샷이 맞으면 주변 적도 N 초 묶음
    stormGuard: 0,   // 바람 · 번개 · 소용돌이 피해/밀림 감소
    vision: 520,     // 안개 속 시야
  };

  const GRADES = [
    { name: '일반', col: '#c9d2dc' },
    { name: '고급', col: '#7fd88a' },
    { name: '희귀', col: '#6fb8ff' },
    { name: '전설', col: '#ffb84d' },
  ];
  const ERAS = ['고대', '대항해시대', '범선 전성기', '증기선 시대', '강철 군함', '현대'];
  const TIER_COL = ['#b9a58a', '#9fc37a', '#7fc7d8', '#8fa2ff', '#d68cff', '#ff8fa8'];
  const LINES = { S: '쾌속선', M: '다목적함', H: '중포함' };

  // 슬롯 종류: icon = parts_a 칸, uicon = 고유 장비 parts_u 칸
  const SLOT_TYPES = {
    cannon: { name: '대포', icon: 0, uicon: 0 },
    sail: { name: '돛 · 기관', icon: 1, uicon: 1 },
    hull: { name: '선체 장갑', icon: 2, uicon: 2 },
    rudder: { name: '키', icon: 3, uicon: 3 },
    scope: { name: '망원경', icon: 4, uicon: 4 },
    figure: { name: '선수상', icon: 5, uicon: 5 },
    mortar: { name: '박격포', icon: 6, uicon: 6 },
    shot: { name: '특수탄 창고', icon: 7, uicon: 7 },
    crew: { name: '선원실', icon: 8, uicon: 8 },
  };

  // 배: line = 갈래, row = 트리 줄(0 위 · 1 가운데 · 2 아래), len = 게임 속 길이, spr = 그림 이름
  // gear = 이 배 기술로 만드는 일반 · 고급 장비 이름 [일반, 고급] (슬롯 순서대로)
  const SHIPS = [
    { id: 'galley', name: '찍찍 1호', kind: '갤리선', tier: 0, row: 1, line: null, req: null, cost: [0, 0], len: 84,
      desc: '애꾸 선장이 처음 훔친 노 젓는 배. 대포 두 문. 이 배의 장비는 모든 배에 낄 수 있음.',
      slots: ['cannon', 'sail', 'hull'], gear: [['청동 소포', '긴 청동포'], ['삼베 돛', '쌍 노 갑판'], ['참나무 판자', '덧댄 참나무']] },
    // ── 위 갈래: 쾌속선
    { id: 'caravel', name: '치즈 바람', kind: '캐러벨', tier: 1, row: 0, line: 'S', req: 'galley', cost: [30, 50], len: 90,
      desc: '삼각돛으로 바람을 거슬러 달림. 빠르고 잘 돎.',
      add: { hp: 15 }, mul: { speed: 1.15, turn: 1.15 },
      slots: ['cannon', 'sail', 'hull', 'rudder'], gear: [['캐러벨 포', '개량 캐러벨 포'], ['라틴 삼각돛', '이중 삼각돛'], ['가벼운 선체', '못 박은 선체'], ['선미 키', '균형 키']] },
    { id: 'clipper', name: '은빛 수염', kind: '클리퍼', tier: 2, row: 0, line: 'S', req: 'caravel', cost: [70, 130], len: 104,
      desc: '바다에서 가장 빠른 범선. 날카로운 뱃머리로 들이받음.',
      add: { hp: 35, guns: 1, ram: 25 }, mul: { speed: 1.3, turn: 1.2 },
      slots: ['cannon', 'sail', 'hull', 'rudder', 'figure'], gear: [['쾌속 장포', '구리 장포'], ['겹겹 사각돛', '보조 돛'], ['구리 입힌 선체', '날렵한 선체'], ['쾌속 키', '이중 키'], ['돌격 선수상', '쇠뿔 선수상']] },
    { id: 'paddle', name: '물레방아 꼬리', kind: '외륜 증기선', tier: 3, row: 0, line: 'S', req: 'clipper', cost: [140, 280], len: 110,
      desc: '바람이 없어도 달리는 증기 외륜. 앞쪽 선수포가 자동으로 쏨.',
      add: { hp: 60, guns: 1, bow: 1.4, ram: 30, stormGuard: 0.4 }, mul: { speed: 1.4, turn: 1.25 },
      slots: ['cannon', 'sail', 'hull', 'rudder', 'figure', 'scope'], gear: [['강선포', '후장포'], ['증기 외륜', '고압 외륜'], ['철띠 선체', '철판 선체'], ['증기 조타기', '정밀 조타기'], ['충각 선수', '강철 충각'], ['놋쇠 망원경', '이중 망원경']] },
    { id: 'torpedo', name: '번개 수염', kind: '어뢰정', tier: 4, row: 0, line: 'S', req: 'paddle', cost: [320, 640], len: 116,
      desc: '작고 아주 빠름. 마우스 쪽으로 어뢰를 쏨.',
      add: { hp: 90, guns: 1, bow: 1.1, torpedo: 3, ram: 35, stormGuard: 0.5 }, mul: { speed: 1.55, turn: 1.3 },
      slots: ['cannon', 'sail', 'hull', 'rudder', 'figure', 'scope', 'shot'], gear: [['속사포', '고속 속사포'], ['증기 터빈', '과열 터빈'], ['경장갑', '이중 경장갑'], ['유압 조타기', '고속 조타기'], ['어뢰 충각', '쌍 어뢰 충각'], ['거리 측정기', '광학 측정기'], ['철갑탄 창고', '소이탄 창고']] },
    { id: 'missile', name: '치즈 미사일', kind: '미사일 고속정', tier: 5, row: 0, line: 'S', req: 'torpedo', cost: [700, 1400], len: 120,
      desc: '쥐 귀 레이더에 유도탄 발사대. 가장 빠른 배.',
      add: { hp: 130, guns: 1, bow: 0.8, torpedo: 2.6, missile: 1.6, ram: 40, stormGuard: 0.6, vision: 200 }, mul: { speed: 1.7, turn: 1.35 },
      slots: ['cannon', 'sail', 'hull', 'rudder', 'figure', 'scope', 'shot'], gear: [['함포', '자동 함포'], ['가스 터빈', '워터제트'], ['복합 장갑', '반응 장갑'], ['전자 조타기', '자동 조타기'], ['유도탄 선수', '대함 유도탄'], ['레이더', '위상 레이더'], ['유도탄 창고', '집속탄 창고']] },
    // ── 가운데 갈래: 다목적함
    { id: 'carrack', name: '배불뚝이', kind: '캐랙', tier: 1, row: 1, line: 'M', req: 'galley', cost: [30, 50], len: 96,
      desc: '배가 둥글고 짐칸이 넓음. 체인샷 · 화염탄을 싣기 시작함.',
      add: { hp: 30, chain: 9 }, mul: { speed: 1.05 },
      slots: ['cannon', 'sail', 'hull', 'shot'], gear: [['캐랙 포', '쌍 캐랙 포'], ['큰 사각돛', '앞뒤 돛'], ['둥근 선체', '이중 갑판'], ['체인샷 상자', '고리 체인샷']] },
    { id: 'frigate', name: '꼬리 사냥꾼', kind: '프리깃', tier: 2, row: 1, line: 'M', req: 'carrack', cost: [70, 130], len: 110,
      desc: '빠르고 포도 많은 만능 군함. 화염탄 장착.',
      add: { hp: 60, guns: 1, chain: 8, fire: 10 }, mul: { speed: 1.15, turn: 1.05 },
      slots: ['cannon', 'sail', 'hull', 'shot', 'scope'], gear: [['12파운드 포', '18파운드 포'], ['프리깃 돛', '고급 범포'], ['구리 선저', '강화 늑골'], ['화염탄 상자', '기름 화염탄'], ['선장 망원경', '해군 망원경']] },
    { id: 'steamfrigate', name: '연기 수염', kind: '증기 프리깃', tier: 3, row: 1, line: 'M', req: 'frigate', cost: [140, 280], len: 118,
      desc: '돛과 스크루를 함께 씀. 박격포를 실어 멀리 폭격.',
      add: { hp: 95, guns: 1, chain: 7, fire: 9, mortar: 13, stormGuard: 0.3 }, mul: { speed: 1.2, turn: 1.05 },
      slots: ['cannon', 'sail', 'hull', 'shot', 'scope', 'mortar'], gear: [['강선 함포', '암스트롱포'], ['스크루 기관', '복합 기관'], ['철판 덧댐', '철갑 띠'], ['작렬탄 상자', '개량 작렬탄'], ['측거의', '야간 망원경'], ['해안 박격포', '중박격포']] },
    { id: 'cruiser', name: '쇠 수염', kind: '방호 순양함', tier: 4, row: 1, line: 'M', req: 'steamfrigate', cost: [320, 640], len: 126,
      desc: '강철 갑판과 포탑. 선원이 많아 장전이 빨라짐.',
      add: { hp: 140, guns: 2, chain: 6, fire: 8, mortar: 11, bow: 1.5, crewMax: 6, stormGuard: 0.4 }, mul: { speed: 1.25, turn: 1.08 },
      slots: ['cannon', 'sail', 'hull', 'shot', 'scope', 'mortar', 'crew'], gear: [['포탑 함포', '쌍열 포탑'], ['삼단 팽창 기관', '고속 기관'], ['방호 갑판', '경사 장갑'], ['철갑탄 상자', '고폭탄 상자'], ['광학 사격 지휘', '거리 계산기'], ['곡사포', '중곡사포'], ['수병 침실', '해군 숙소']] },
    { id: 'submarine', name: '잠수 생쥐', kind: '잠수함', tier: 5, row: 1, line: 'M', req: 'cruiser', cost: [700, 1400], len: 124,
      desc: '물속에서 어뢰를 쏘고, 맞을 때 가끔 잠수해 피함.',
      add: { hp: 170, guns: 2, chain: 5, fire: 7, mortar: 10, torpedo: 1.8, torpedoDmg: 20, crewMax: 8, evade: 0.15, stormGuard: 0.7 }, mul: { speed: 1.3, turn: 1.12 },
      slots: ['cannon', 'sail', 'hull', 'shot', 'scope', 'mortar', 'crew'], gear: [['갑판포', '자동 갑판포'], ['전동기', '공기 불요 기관'], ['내압 선체', '흡음 타일'], ['음향 어뢰', '유선 어뢰'], ['잠망경', '광학 잠망경'], ['잠대함 박격포', '연발 박격포'], ['좁은 침실', '교대 침실']] },
    // ── 아래 갈래: 중포함
    { id: 'galleon', name: '황금 치즈', kind: '갤리온', tier: 1, row: 2, line: 'H', req: 'galley', cost: [30, 50], len: 104,
      desc: '보물선이자 군함. 느리지만 튼튼하고 대포가 많음.',
      add: { hp: 50, guns: 1, goldBonus: 0.1 }, mul: { speed: 0.95, turn: 0.92 },
      slots: ['cannon', 'sail', 'hull', 'figure'], gear: [['갤리온 포', '컬버린 포'], ['갤리온 돛', '높은 돛대'], ['두꺼운 선체', '높은 선미루'], ['금박 선수상', '사자쥐 선수상']] },
    { id: 'ofline', name: '삼층 치즈탑', kind: '전열함', tier: 2, row: 2, line: 'H', req: 'galleon', cost: [70, 130], len: 128,
      desc: '세 층 갑판 가득 대포. 일제 사격 한 번이 무서움.',
      add: { hp: 100, guns: 3, goldBonus: 0.1 }, mul: { speed: 0.9, turn: 0.85, dmg: 1.1 },
      slots: ['cannon', 'sail', 'hull', 'figure', 'crew'], gear: [['32파운드 포', '42파운드 포'], ['전열함 돛', '거대 범포'], ['삼중 갑판', '참나무 장갑'], ['제독 선수상', '왕관 선수상'], ['포수 침실', '포병대 숙소']] },
    { id: 'ironclad', name: '무쇠 엉덩이', kind: '철갑함', tier: 3, row: 2, line: 'H', req: 'ofline', cost: [140, 280], len: 124,
      desc: '쇠로 둘러싼 배. 받는 피해가 크게 줄고 회전 포탑이 생김.',
      add: { hp: 170, guns: 3, bow: 1.8, bowDmg: 6, stormGuard: 0.5 }, mul: { speed: 0.9, turn: 0.85, dmg: 1.2, dmgTaken: 0.85 },
      slots: ['cannon', 'sail', 'hull', 'figure', 'crew', 'mortar'], gear: [['회전 포탑', '쌍열 회전 포탑'], ['증기 기관', '쌍 스크루'], ['무쇠 장갑', '압연 장갑'], ['충각', '쇠 충각'], ['화부 숙소', '포탑 숙소'], ['갑판 박격포', '연발 박격포']] },
    { id: 'dreadnought', name: '치즈 대왕', kind: '드레드노트', tier: 4, row: 2, line: 'H', req: 'ironclad', cost: [320, 640], len: 150,
      desc: '거포 열 문짜리 거대 전함. 포 한 발 한 발이 아주 셈.',
      add: { hp: 260, guns: 4, bow: 1.4, bowDmg: 12, mortar: 12, stormGuard: 0.6 }, mul: { speed: 0.95, turn: 0.82, dmg: 1.35, dmgTaken: 0.8, range: 1.15 },
      slots: ['cannon', 'sail', 'hull', 'figure', 'crew', 'mortar', 'scope'], gear: [['12인치 주포', '14인치 주포'], ['증기 터빈', '중유 터빈'], ['강철 장갑대', '집중 방어'], ['함수 문장', '대왕 문장'], ['수병 숙소', '대함대 숙소'], ['부포', '고각포'], ['사격 지휘소', '거리 측정탑']] },
    { id: 'carrier', name: '하늘 치즈성', kind: '항공모함', tier: 5, row: 2, line: 'H', req: 'dreadnought', cost: [700, 1400], len: 190,
      desc: '쥐 조종사 함재기가 날아올라 알아서 싸움.',
      add: { hp: 340, guns: 3, planes: 3, mortar: 11, stormGuard: 0.7, vision: 250 }, mul: { speed: 0.95, turn: 0.78, dmg: 1.3, dmgTaken: 0.75, range: 1.1 },
      slots: ['cannon', 'sail', 'hull', 'figure', 'crew', 'mortar', 'scope'], gear: [['양용포', '자동 양용포'], ['원자로', '고출력 원자로'], ['비행갑판 장갑', '격벽 장갑'], ['함교 문장', '치즈성 문장'], ['조종사 숙소', '정비사 숙소'], ['함재 폭격기', '급강하 폭격기'], ['관제 레이더', '조기 경보기']] },
  ];

  // 일반 · 고급 장비 틀: (k = 티어 배율) → { add, mul }
  const r2 = (v) => Math.round(v * 100) / 100;
  const TEMPLATE = {
    cannon: [(k) => ({ mul: { dmg: r2(1 + 0.1 * k) } }), (k) => ({ mul: { dmg: r2(1 + 0.14 * k), reload: r2(1 - 0.04 * k) } })],
    sail: [(k) => ({ mul: { speed: r2(1 + 0.05 * k) } }), (k) => ({ mul: { speed: r2(1 + 0.07 * k), turn: r2(1 + 0.05 * k) } })],
    hull: [(k) => ({ add: { hp: Math.round(25 * k) } }), (k) => ({ add: { hp: Math.round(35 * k), repair: Math.round(4 * k) } })],
    rudder: [(k) => ({ mul: { turn: r2(1 + 0.08 * k) } }), (k) => ({ mul: { turn: r2(1 + 0.1 * k) }, add: { pickup: Math.round(30 * k) } })],
    scope: [(k) => ({ add: { crit: r2(0.05 * k) } }), (k) => ({ add: { crit: r2(0.07 * k) }, mul: { range: r2(1 + 0.06 * k) } })],
    figure: [(k) => ({ add: { ram: Math.round(12 * k), goldBonus: r2(0.05 * k) } }), (k) => ({ add: { ram: Math.round(18 * k), goldBonus: r2(0.1 * k) } })],
    mortar: [(k) => ({ add: { mortarDmg: Math.round(10 * k) } }), (k) => ({ add: { mortarDmg: Math.round(16 * k), mortarR: Math.round(10 * k) } })],
    shot: [(k) => ({ mul: { chain: 0.9, fire: 0.9 }, add: { dmg: Math.round(1 * k) } }), (k) => ({ mul: { chain: 0.82, fire: 0.82 }, add: { dmg: Math.round(2 * k) } })],
    crew: [(k) => ({ add: { crewMax: Math.round(2 * k) } }), (k) => ({ add: { crewMax: Math.round(3 * k), crewHeal: Math.round(2 * k) } })],
  };
  const STAT_TXT = { dmg: '포탄 위력', reload: '장전 시간', speed: '속도', turn: '회전', hp: '선체', repair: '웨이브 사이 수리', pickup: '줍기 거리', crit: '치명타', range: '사거리',
    ram: '박치기', goldBonus: '금화', mortarDmg: '폭격 위력', mortarR: '폭격 범위', chain: '체인샷 재사용', fire: '화염탄 재사용', crewMax: '선원 효과 최대', crewHeal: '선원 구조 시 수리' };
  function describe(m) {
    const out = [];
    for (const [k, v] of Object.entries(m.add || {})) {
      if (k === 'crit' || k === 'goldBonus') out.push(`${STAT_TXT[k]} +${Math.round(v * 100)}%`);
      else out.push(`${STAT_TXT[k]} +${v}`);
    }
    for (const [k, v] of Object.entries(m.mul || {})) out.push(`${STAT_TXT[k]} ${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`);
    return out.join(', ');
  }

  // 희귀 · 전설 고유 장비: ship = 이 기술이 나온 배 (티어 · 기본 갈래), lines = 낄 수 있는 갈래를 따로 정함
  const UNIQUE = [
    // 갤리선 (티어 0, 모든 갈래)
    { id: 'u_oars', ship: 'galley', slot: 'sail', grade: 2, name: '쥐 노꾼 북장단', mul: { speed: 1.1, turn: 1.1 }, add: { crewHeal: 2 }, desc: '속도 · 회전 +10%, 선원을 건지면 체력 +2' },
    { id: 'u_bronze', ship: 'galley', slot: 'cannon', grade: 2, name: '청동 사자쥐포', mul: { dmg: 1.12 }, add: { crit: 0.08 }, desc: '포탄 위력 +12%, 치명타 +8%' },
    { id: 'u_eyepatch', ship: 'galley', slot: 'hull', grade: 3, name: '애꾸 선장의 첫 배 판자', add: { hp: 40, plunder: 0.04 }, desc: '선체 +40, 적을 격침할 때마다 체력 4% 회복' },
    // 캐러벨
    { id: 'u_lateen', ship: 'caravel', slot: 'sail', grade: 2, name: '역풍 삼각돛', mul: { speed: 1.12 }, add: { stormGuard: 0.4 }, desc: '속도 +12%, 바람 · 번개 · 소용돌이 영향 −40%' },
    { id: 'u_compass', ship: 'caravel', slot: 'rudder', grade: 3, name: '치즈 나침반 키', lines: ['S', 'M'], mul: { turn: 1.3 }, add: { evade: 0.1, pickup: 80 }, desc: '회전 +30%, 적 포탄 10% 빗나감, 줍기 거리 +80' },
    // 캐랙
    { id: 'u_hook', ship: 'carrack', slot: 'shot', grade: 2, name: '갈고리 체인샷', add: { chainAll: 0.15 }, desc: '모든 포탄 15% 확률로 체인샷 (돛을 찢어 느리게)' },
    { id: 'u_hold', ship: 'carrack', slot: 'hull', grade: 3, name: '치즈 창고 선체', lines: ['M', 'H'], add: { hp: 50, goldBonus: 0.25, plankBonus: 0.25 }, desc: '선체 +50, 금화 · 목재 +25%' },
    // 갤리온
    { id: 'u_goldfig', ship: 'galleon', slot: 'figure', grade: 2, name: '황금 쥐 선수상', add: { goldBonus: 0.3, ram: 20 }, desc: '금화 +30%, 박치기 20' },
    { id: 'u_culverin', ship: 'galleon', slot: 'cannon', grade: 3, name: '쌍둥이 컬버린', lines: ['H', 'M'], add: { double: 0.3 }, mul: { dmg: 1.1 }, desc: '포탄 위력 +10%, 일제 사격이 30% 확률로 한 번 더' },
    // 클리퍼
    { id: 'u_ramhorn', ship: 'clipper', slot: 'figure', grade: 2, name: '쇠뿔 생쥐 선수상', add: { ram: 60 }, desc: '박치기 60 (내 배는 박치기 피해 안 받음)' },
    { id: 'u_trade', ship: 'clipper', slot: 'sail', grade: 3, name: '무역풍 돛', mul: { speed: 1.2, reload: 0.9 }, add: { stormGuard: 0.5 }, desc: '속도 +20%, 장전 −10%, 바람 영향 −50%' },
    // 프리깃
    { id: 'u_greek', ship: 'frigate', slot: 'shot', grade: 2, name: '그리스의 불', lines: ['M', 'H'], add: { burnAll: 0.2 }, desc: '모든 포탄 20% 확률로 불붙임' },
    { id: 'u_nelson', ship: 'frigate', slot: 'scope', grade: 3, name: '애꾸 망원경', add: { crit: 0.18, vision: 200 }, mul: { range: 1.12 }, desc: '치명타 +18%, 사거리 +12%, 안개 시야 +200 (망원경은 감은 눈 쪽에 대야 제맛)' },
    // 전열함
    { id: 'u_broad', ship: 'ofline', slot: 'cannon', grade: 2, name: '전열 일제 사격', add: { guns: 1 }, mul: { dmg: 1.08 }, desc: '뱃전마다 대포 +1, 포탄 위력 +8%' },
    { id: 'u_marines', ship: 'ofline', slot: 'crew', grade: 3, name: '쥐 해병대', lines: ['H', 'M'], add: { crewMax: 8, crewHeal: 4, plunder: 0.05 }, desc: '선원 효과 최대 +8, 구조 시 수리 +4, 격침하면 체력 5% 회복' },
    // 외륜 증기선
    { id: 'u_boiler', ship: 'paddle', slot: 'sail', grade: 2, name: '폭주 보일러', mul: { speed: 1.18 }, add: { ram: 40 }, desc: '속도 +18%, 박치기 +40' },
    { id: 'u_chaser', ship: 'paddle', slot: 'scope', grade: 3, name: '추격 선수포 조준기', lines: ['S', 'M'], add: { bowDmg: 10, crit: 0.1 }, mul: { bow: 0.7 }, desc: '선수포 위력 +10 · 간격 −30%, 치명타 +10%' },
    // 증기 프리깃
    { id: 'u_shell', ship: 'steamfrigate', slot: 'cannon', grade: 2, name: '작렬 포탄', add: { splash: 50 }, desc: '포탄이 맞은 곳에서 폭발 (반지름 50)' },
    { id: 'u_barrage', ship: 'steamfrigate', slot: 'mortar', grade: 3, name: '자동 폭격 지휘', lines: ['M', 'H'], add: { autoMortar: 5, mortarDmg: 20 }, desc: '5초마다 가장 가까운 적에게 자동 폭격, 폭격 위력 +20' },
    // 철갑함
    { id: 'u_iron', ship: 'ironclad', slot: 'hull', grade: 2, name: '무쇠 엉덩이 장갑', mul: { dmgTaken: 0.82 }, add: { hp: 60 }, desc: '선체 +60, 받는 피해 −18%' },
    { id: 'u_turret', ship: 'ironclad', slot: 'cannon', grade: 3, name: '회전 포탑 쌍열포', add: { double: 0.5, splash: 35 }, desc: '일제 사격이 50% 확률로 한 번 더, 포탄 폭발 (반지름 35)' },
    // 어뢰정
    { id: 'u_wolf', ship: 'torpedo', slot: 'shot', grade: 2, name: '늑대 떼 어뢰', lines: ['S', 'M'], add: { torpedoDmg: 25 }, mul: { torpedo: 0.75 }, desc: '어뢰 위력 +25 · 간격 −25%' },
    { id: 'u_smoke', ship: 'torpedo', slot: 'rudder', grade: 3, name: '연막 조타기', add: { evade: 0.25 }, mul: { turn: 1.15 }, desc: '적 포탄 25% 빗나감, 회전 +15%' },
    // 방호 순양함
    { id: 'u_kraken', ship: 'cruiser', slot: 'shot', grade: 2, name: '크라켄 촉수 체인', add: { kraken: 2, chainAll: 0.1 }, desc: '체인샷이 맞으면 주변 적도 2초 묶임, 모든 포탄 10% 체인샷' },
    { id: 'u_drill', ship: 'cruiser', slot: 'crew', grade: 3, name: '수병 포술 훈련', add: { crewMax: 10, crewReload: 0.01 }, desc: '선원 효과 최대 +10, 선원 1명당 장전 −1% 더' },
    // 드레드노트
    { id: 'u_bigguns', ship: 'dreadnought', slot: 'cannon', grade: 2, name: '치즈 대왕 거포', mul: { dmg: 1.25, range: 1.1 }, add: { splash: 40 }, desc: '포탄 위력 +25%, 사거리 +10%, 포탄 폭발 (반지름 40)' },
    { id: 'u_belt', ship: 'dreadnought', slot: 'hull', grade: 3, name: '대왕 장갑대', lines: ['H', 'M'], mul: { dmgTaken: 0.75 }, add: { hp: 150, repair: 20 }, desc: '선체 +150, 받는 피해 −25%, 웨이브 사이 수리 +20' },
    // 미사일 고속정
    { id: 'u_harpoon', ship: 'missile', slot: 'figure', grade: 2, name: '하푼 유도탄', add: { missileDmg: 15 }, mul: { missile: 0.75 }, desc: '유도탄 위력 +15 · 간격 −25%' },
    { id: 'u_aegis', ship: 'missile', slot: 'scope', grade: 3, name: '쥐 귀 위상 레이더', lines: ['S', 'M', 'H'], add: { crit: 0.2, evade: 0.12, vision: 300 }, mul: { range: 1.15 }, desc: '치명타 +20%, 적 포탄 12% 빗나감, 사거리 +15%, 시야 +300' },
    // 잠수함
    { id: 'u_silent', ship: 'submarine', slot: 'hull', grade: 2, name: '흡음 고무 선체', add: { evade: 0.2, hp: 80 }, desc: '적 포탄 20% 빗나감, 선체 +80' },
    { id: 'u_wire', ship: 'submarine', slot: 'shot', grade: 3, name: '유선 어뢰 일제 발사', add: { torpedoDmg: 40, kraken: 1 }, mul: { torpedo: 0.6 }, desc: '어뢰 위력 +40 · 간격 −40%, 체인샷에 맞은 적 주변 1초 묶음' },
    // 항공모함
    { id: 'u_wing', ship: 'carrier', slot: 'mortar', grade: 2, name: '쥐 조종사 비행단', add: { planes: 2, planeDmg: 4 }, desc: '함재기 +2, 함재기 위력 +4' },
    { id: 'u_castle', ship: 'carrier', slot: 'figure', grade: 3, name: '하늘 치즈성 문장', lines: ['H', 'M'], add: { planes: 2, autoMortar: 4, plunder: 0.05 }, desc: '함재기 +2, 4초마다 자동 폭격, 격침하면 체력 5% 회복' },
  ];

  const byId = (a) => Object.fromEntries(a.map((o) => [o.id, o]));
  const SHIP = byId(SHIPS);
  const PARTS = [];
  for (const s of SHIPS) {
    const k = 1 + 0.35 * s.tier;
    s.slots.forEach((sl, i) => {
      for (const g of [0, 1]) {
        const m = TEMPLATE[sl][g](k);
        PARTS.push({ id: `${s.id}_${sl}_${g}`, ship: s.id, slot: sl, grade: g, name: s.gear[i][g], ...m, desc: describe(m) });
      }
    });
  }
  PARTS.push(...UNIQUE);
  for (const p of PARTS) {
    const s = SHIP[p.ship];
    p.tier = s.tier;
    p.lines ||= s.line ? [s.line] : null;
    p.icon = p.grade >= 2 ? ['parts_u', SLOT_TYPES[p.slot].uicon] : ['parts_a', SLOT_TYPES[p.slot].icon];
    p.fits = SHIPS.filter((sh) => sh.tier >= p.tier && sh.slots.includes(p.slot) && (!p.lines || !sh.line || p.lines.includes(sh.line))).map((sh) => sh.id);
  }
  const PART = byId(PARTS);
  const MAX_TIER = Math.max(...SHIPS.map((s) => s.tier));
  const POOL = GRADES.map((_, g) => PARTS.filter((p) => p.grade === g));

  // ── 조선소 제작 의뢰: 쓸 금화를 고름(목재는 그 1/3, 비용 × 테크 배율). 많이 쓸수록 높은 등급 확률 ↑
  const REQ = { min: 30, max: 600, step: 10 };
  const ODDS = [
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
  // 티어 확률: 테크(T) 60% · T−1 25% · T−2 10% · 나머지 5%
  const TIER_W = [60, 25, 10];
  function tierOdds(T = tech()) {
    const out = Array(T + 1).fill(0);
    let rest = 0;
    TIER_W.forEach((w, i) => { if (T - i >= 0) out[T - i] = w; else rest += w; });
    const low = T - TIER_W.length + 1;
    rest += 100 - TIER_W.reduce((a, b) => a + b, 0);
    if (low > 0) for (let t = 0; t < low; t++) out[t] = rest / low;
    else out[T] += rest;
    return out;
  }
  const reqK = () => 1 + 0.6 * tech();
  const requestCost = (coin) => [Math.round(coin * reqK() / 3), Math.round(coin * reqK())];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function roll(p) { let r = Math.random() * p.reduce((a, b) => a + b, 0), i = 0; while (i < p.length - 1 && r >= p[i]) { r -= p[i]; i++; } return i; }

  // ── 저장: plank = 목재, coin = 치즈 금화, items = [{ uid, id }], equip[배][슬롯] = uid
  const KEY = 'ratpirate_save_v1';
  function fresh() {
    const s = { v: 1, plank: 0, coin: 0, ships: ['galley'], ship: 'galley', items: [], uid: 1, equip: {}, sorties: 0, clears: 0, requests: 0, tierUps: 0, unlocked: 0, pick: 0, cleared: [], story: 0 };
    for (const sl of SHIP.galley.slots) { const it = give(s, `galley_${sl}_0`); (s.equip.galley ||= {})[sl] = it.uid; }
    return s;
  }
  function give(s, id) { const it = { uid: s.uid++, id }; s.items.push(it); return it; }
  function tidy(s) {
    s.items = s.items.filter((it) => PART[it.id]);
    s.ships = s.ships.filter((id) => SHIP[id]);
    if (!SHIP[s.ship]) s.ship = 'galley';
    const seen = new Set();
    for (const [sid, eq] of Object.entries(s.equip)) for (const [sl, uid] of Object.entries(eq)) {
      const it = s.items.find((x) => x.uid === uid);
      if (!it || !SHIP[sid] || !PART[it.id].fits.includes(sid) || PART[it.id].slot !== sl || seen.has(uid)) delete eq[sl];
      else seen.add(uid);
    }
    return s;
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return tidy(Object.assign(fresh(), s)); } catch (e) {}
    return fresh();
  }
  let save = load();
  const Q = new URLSearchParams(location.search);
  if (Q.has('rich')) { save.plank = Math.max(save.plank, 99999); save.coin = Math.max(save.coin, 99999); }
  if (Q.has('allseas')) save.unlocked = window.SEAS.length - 1;
  if (Q.has('allships')) save.ships = SHIPS.map((s) => s.id);
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  const itemOf = (uid) => save.items.find((it) => it.uid === uid);
  const equipOf = (sid) => save.equip[sid] || {};
  function equippedOn(uid) { for (const [sid, e] of Object.entries(save.equip)) if (Object.values(e).includes(uid)) return sid; return null; }
  const isEquipped = (uid) => !!equippedOn(uid);
  const owns = (sid) => save.ships.includes(sid);
  const tech = () => Math.max(...save.ships.map((id) => SHIP[id].tier));
  const usable = (p) => p.fits.some(owns);

  // 수치 계산 (over.ship = 배 id, over.equip = { 슬롯: 장비 id } 로 미리보기)
  function compute(over = {}) {
    const ship = SHIP[over.ship || save.ship];
    const equip = {};
    for (const sl of ship.slots) { const it = itemOf(equipOf(ship.id)[sl]); if (it && PART[it.id].fits.includes(ship.id)) equip[sl] = it.id; }
    Object.assign(equip, over.equip);
    const s = Object.assign({}, BASE);
    const mods = [ship, ...Object.values(equip).map((id) => PART[id])];
    for (const m of mods) for (const [k, v] of Object.entries(m.add || {})) s[k] += v;
    for (const m of mods) for (const [k, v] of Object.entries(m.mul || {})) s[k] *= v;
    s.evade = Math.min(0.5, s.evade);
    s.stormGuard = Math.min(0.9, s.stormGuard);
    s.guns = Math.round(s.guns);
    s.planes = Math.min(8, Math.round(s.planes));
    s.ship = ship;
    s.equip = equip;
    return s;
  }
  function summary(s) {
    const dps = s.guns * s.dmg * (1 + s.crit) * (1 + s.double) / s.reload
      + (s.bow ? s.bowDmg / s.bow : 0) + (s.torpedo ? s.torpedoDmg / s.torpedo : 0) + (s.missile ? s.missileDmg / s.missile : 0)
      + s.planes * s.planeDmg / 0.6 + (s.autoMortar ? s.mortarDmg / s.autoMortar : 0);
    return [
      ['선체', Math.round(s.hp)],
      ['속도', Math.round(s.speed)],
      ['회전', +s.turn.toFixed(2)],
      ['뱃전 대포', s.guns],
      ['장전', +s.reload.toFixed(2) + '초'],
      ['화력', Math.round(dps)],
      ['받는 피해', Math.round(s.dmgTaken * 100) + '%'],
      ['사거리', Math.round(s.range * 100) + '%'],
    ];
  }

  const can = (cost) => save.plank >= cost[0] && save.coin >= cost[1];
  function pay(cost) { save.plank -= cost[0]; save.coin -= cost[1]; }
  const shipBuyable = (s) => !owns(s.id) && (!s.req || owns(s.req));
  function buyShip(id) {
    const s = SHIP[id];
    if (!shipBuyable(s) || !can(s.cost)) return false;
    pay(s.cost); save.ships.push(id); save.ship = id; store(); return true;
  }
  function useShip(id) { if (!owns(id)) return false; save.ship = id; store(); return true; }
  function whyNot(uid, sid) {
    const it = itemOf(uid), s = SHIP[sid];
    if (!it || !s) return '없음';
    const p = PART[it.id];
    if (!owns(sid)) return '아직 없는 배';
    if (!s.slots.includes(p.slot)) return `${SLOT_TYPES[p.slot].name} 슬롯 없음`;
    if (p.tier > s.tier) return `티어 ${p.tier} 장비 — ${p.tier}단계 이상 배만`;
    if (!p.fits.includes(sid)) return `${p.lines.map((l) => LINES[l]).join(' · ')} 전용`;
    return null;
  }
  function equipItem(uid, sid) {
    if (whyNot(uid, sid)) return false;
    const p = PART[itemOf(uid).id];
    for (const e of Object.values(save.equip)) for (const [sl, u] of Object.entries(e)) if (u === uid) delete e[sl];
    (save.equip[sid] ||= {})[p.slot] = uid; store(); return true;
  }
  function unequip(sid, slot) { if (save.equip[sid]) delete save.equip[sid][slot]; store(); }
  function candidates(t, g) {
    for (let k = t; k >= 0; k--) { const c = POOL[g].filter((p) => p.tier === k && usable(p)); if (c.length) return c; }
    return POOL[g].filter(usable);
  }
  function request(coin) {
    coin = Math.round(Math.max(REQ.min, Math.min(REQ.max, coin)));
    const cost = requestCost(coin);
    if (!can(cost)) return null;
    pay(cost);
    const t = roll(tierOdds()), g = roll(odds(coin));
    const it = give(save, pick(candidates(t, g)).id);
    save.requests++; store();
    return it;
  }
  // 합성: 같은 티어 · 같은 등급 3개 → 한 등급 위. 티어 업 도전: 같은 티어 전설 3~6개 → 한 티어 위 전설 (실패하면 같은 티어 전설 하나)
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
    if (p0.tier + 1 > tech()) return { kind: 'up', tier: p0.tier, chance: UP_CHANCE[uids.length], block: `${p0.tier + 1}단계 배가 있어야 도전 가능` };
    return { kind: 'up', tier: p0.tier, chance: UP_CHANCE[uids.length] };
  }
  function fuse(uids) {
    const f = fuseInfo(uids);
    if (!f || f.block) return null;
    save.items = save.items.filter((it) => !uids.includes(it.uid));
    let it, ok = true;
    if (f.kind === 'fuse') it = give(save, pick(candidates(f.tier, f.grade + 1)).id);
    else { ok = Math.random() * 100 < f.chance; it = give(save, pick(candidates(ok ? f.tier + 1 : f.tier, 3)).id); save.tierUps++; }
    store();
    return { it, ok };
  }
  // 항해 끝: 이기면 전부 + 다음 바다, 침몰하면 절반
  function bank(plank, coin, win, sea) {
    const k = win ? 1 : 0.5;
    const p = Math.floor(plank * k), c = Math.floor(coin * k);
    save.plank += p; save.coin += c; save.sorties++;
    if (win) {
      save.clears++;
      const id = window.SEAS[sea].id;
      if (!save.cleared.includes(id)) save.cleared.push(id);
      save.unlocked = Math.min(window.SEAS.length - 1, Math.max(save.unlocked, sea + 1));
    }
    store();
    return [p, c];
  }
  function pickSea(i) { if (i < 0 || i > save.unlocked) return false; save.pick = i; store(); return true; }
  function seenStory(n) { save.story = Math.max(save.story, n); store(); }
  function reset() { save = fresh(); store(); }

  window.SHIPYARD = {
    BASE, GRADES, ERAS, TIER_COL, LINES, SHIPS, SHIP, SLOT_TYPES, PARTS, PART, POOL, REQ, FUSE_N, UP_MAX, UP_CHANCE, MAX_TIER,
    get save() { return save; },
    compute, summary, can, shipBuyable, odds, tierOdds, tech, reqK, requestCost, itemOf, equipOf, equippedOn, isEquipped, owns, usable, whyNot, fuseInfo,
    buyShip, useShip, equipItem, unequip, request, fuse, bank, pickSea, seenStory, reset,
  };
})();
