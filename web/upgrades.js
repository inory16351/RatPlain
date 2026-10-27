// 아웃게임 강화: 비행기 진화(기체) + 파츠 장착 + 저장
// 기체 = 실제 비행기 발전 순서. 단계(tier)가 오를수록 기체 자체가 좋아지고,
//   ① 더 높은 등급 파츠를 낄 수 있고(파츠 tier ≤ 기체 tier) ② 새 슬롯이 열림(슬롯 tier ≤ 기체 tier).
//   0 복엽기(1900년대) → 1 단엽 · 쌍발 프로펠러기(2차대전) → 2 제트기 · 중폭격기(1950년대) → 3 초음속기 · 전익기(현대)
// 갈래: 위 = 빠른 전투기 줄, 아래 = 튼튼한 폭격기 줄. 부모 기체를 가져야 다음 기체를 살 수 있음.
// 수치 계산: BASE → 기체 mul/add → 파츠 mul/add (곱하기 먼저, 더하기 나중)
(function () {
  // 기본 수치 (전투 손맛 조정은 여기)
  const BASE = {
    speed: 360, boostSpeed: 640, accel: 3,  // 순항 · 부스트 속도, 속도 따라붙는 빠르기
    turn: 4.2, turnBoost: 2.8,              // 초당 선회(rad)
    hp: 100, regen: 14, regenDelay: 1.4,
    fireRate: 12, bulletSpd: 1050, bulletDmg: 1, bulletLife: 0.8, inherit: 0.3, // inherit = 탄이 비행기 속도를 물려받는 정도
    pierce: 0,                              // 탄이 뚫고 지나가는 적 수
    boostMax: 2.2, boostRecover: 0.8,
    pickup: 280,                            // 재료가 끌려오는 거리
    missile: 0, missileN: 2, missileDmg: 4, // missile = 유도탄 간격(초), 0 이면 없음
    shield: 0,                              // 방어막: 한 번 막고 다시 차는 시간(초), 0 이면 없음
    coinBonus: 0,                           // 치즈 코인 더 떨어뜨리는 비율
    shadow: [26, 38],                       // 그림자 어긋남 (높이감)
  };

  const GRADES = [
    { name: '일반', col: '#c9d2dc' },
    { name: '고급', col: '#7fd88a' },
    { name: '희귀', col: '#6fb8ff' },
    { name: '전설', col: '#ffb84d' },
  ];
  const ERAS = ['1900년대', '2차대전', '1950년대', '현대'];

  // 기체: row = 진화 트리 줄(0 위 · 1 가운데 · 2 아래), guns = 총구 [각도 어긋남(rad), 옆 간격(px)]
  // spr = 전용 그림 (art/sprites/<spr>_0.png). 아직 없으면 기본 그림에 tint(색 필터) · scale 로 대신함
  const FRAMES = [
    {
      id: 'biplane', name: '쥐돌이 1호', kind: '복엽 글라이더', tier: 0, row: 1, req: null, cost: [0, 0],
      desc: '과학자 쥐가 처음 만든 천 날개 글라이더. 총 한 정.',
      guns: [[0, 0]], spr: 'player',
    },
    {
      id: 'mono', name: '치즈 스피드', kind: '단엽 전투기', tier: 1, row: 0, req: 'biplane', cost: [25, 40],
      desc: '날개를 한 장으로 줄여 빠르고 날렵함. 쌍열 기관총.',
      mul: { speed: 1.15, boostSpeed: 1.1, turn: 1.1 }, add: { hp: 20 },
      guns: [[0, -10], [0, 10]], spr: 'player_mono', tint: 'hue-rotate(-25deg) saturate(1.3)', scale: 0.95,
    },
    {
      id: 'heavy', name: '쌍발 치즈통', kind: '쌍발 중전투기', tier: 1, row: 2, req: 'biplane', cost: [25, 40],
      desc: '엔진 두 개로 튼튼함. 3갈래 산탄.',
      mul: { turn: 0.95 }, add: { hp: 60, fireRate: -1 },
      guns: [[-0.13, 0], [0, 0], [0.13, 0]], spr: 'player_heavy', tint: 'hue-rotate(70deg) saturate(.8)', scale: 1.15,
    },
    {
      id: 'jet', name: '은빛 꼬리', kind: '후퇴익 제트기', tier: 2, row: 0, req: 'mono', cost: [60, 120],
      desc: '프로펠러 대신 제트. 아주 빠르고 탄이 적 하나를 뚫음.',
      mul: { speed: 1.3, boostSpeed: 1.3, turn: 1.15, bulletSpd: 1.35 }, add: { hp: 40, pierce: 1, boostMax: 0.6, fireRate: 2 },
      guns: [[0, -10], [0, 10]], spr: 'player_jet', tint: 'saturate(.25) brightness(1.15)', scale: 0.95,
    },
    {
      id: 'fort', name: '하늘 요새', kind: '4발 중폭격기', tier: 2, row: 2, req: 'heavy', cost: [60, 120],
      desc: '날아다니는 요새. 5갈래 산탄 + 뒤쪽 기관총.',
      mul: { speed: 0.95, turn: 0.9 }, add: { hp: 130, fireRate: -1 },
      guns: [[-0.24, 0], [-0.12, 0], [0, 0], [0.12, 0], [0.24, 0], [Math.PI, 0]], spr: 'player_fort', tint: 'saturate(.55) brightness(.85)', scale: 1.3,
    },
    {
      id: 'super', name: '번개 꼬리', kind: '초음속 델타익기', tier: 3, row: 0, req: 'jet', cost: [130, 260],
      desc: '음속을 넘는 삼각 날개. 4열 관통탄.',
      mul: { speed: 1.45, boostSpeed: 1.45, turn: 1.25, bulletSpd: 1.6 }, add: { hp: 70, pierce: 2, boostMax: 1, fireRate: 3 },
      guns: [[0, -15], [0, -5], [0, 5], [0, 15]], spr: 'player_super', tint: 'saturate(0) brightness(1.3)', scale: 1,
    },
    {
      id: 'flywing', name: '치즈 전익기', kind: '전익 전략폭격기', tier: 3, row: 2, req: 'fort', cost: [130, 260],
      desc: '거대한 날개 하나. 7갈래 산탄 + 뒤쪽 2갈래, 스스로 빨리 회복.',
      mul: { turn: 0.95, regen: 1.3 }, add: { hp: 220 },
      guns: [[-0.36, 0], [-0.24, 0], [-0.12, 0], [0, 0], [0.12, 0], [0.24, 0], [0.36, 0], [Math.PI - 0.15, 0], [Math.PI + 0.15, 0]],
      spr: 'player_flywing', tint: 'saturate(.3) brightness(.7)', scale: 1.4,
    },
  ];

  // 슬롯: tier = 이 단계 기체부터 열림
  const SLOTS = [
    { id: 'engine', name: '엔진', tier: 0 },
    { id: 'gun', name: '주무장', tier: 0 },
    { id: 'wing', name: '날개', tier: 0 },
    { id: 'armor', name: '동체', tier: 1 },
    { id: 'sub', name: '보조 무장', tier: 2 },
    { id: 'special', name: '특수 장치', tier: 3 },
  ];
  // 파츠: tier = 등급 = 이 단계 기체부터 낄 수 있음. 슬롯마다 첫 번째가 기본(공짜, 처음부터 가짐)
  // icon = [시트, 칸] (art/sprites/<시트>_<칸>.png)
  const PARTS = [
    { id: 'eng0', slot: 'engine', tier: 0, name: '기본 엔진', cost: [0, 0], desc: '특별한 것 없음.', icon: ['parts_b', 8] },
    { id: 'eng1', slot: 'engine', tier: 1, name: '치즈 연소 엔진', cost: [0, 30], desc: '속도 +10%, 부스트 +0.6초', mul: { speed: 1.1 }, add: { boostMax: 0.6 }, icon: ['parts_a', 0] },
    { id: 'eng2', slot: 'engine', tier: 2, name: '터보 과급기', cost: [15, 60], desc: '속도 +8%, 부스트 속도 +20%, 부스트 충전 +60%', mul: { speed: 1.08, boostSpeed: 1.2, boostRecover: 1.6 }, icon: ['parts_a', 1] },
    { id: 'eng3', slot: 'engine', tier: 3, name: '애프터버너', cost: [40, 120], desc: '속도 +12%, 부스트 속도 +35%, 부스트 +1.5초', mul: { speed: 1.12, boostSpeed: 1.35 }, add: { boostMax: 1.5 }, icon: ['parts_a', 2] },

    { id: 'gun0', slot: 'gun', tier: 0, name: '기본 기관총', cost: [0, 0], desc: '특별한 것 없음.', icon: ['parts_b', 8] },
    { id: 'gun1', slot: 'gun', tier: 0, name: '고속 기관총', cost: [0, 20], desc: '연사 +20%', mul: { fireRate: 1.2 }, icon: ['parts_a', 3] },
    { id: 'gun2', slot: 'gun', tier: 1, name: '철갑탄', cost: [10, 45], desc: '위력 +40%, 관통 +1', mul: { bulletDmg: 1.4 }, add: { pierce: 1 }, icon: ['parts_a', 4] },
    { id: 'gun3', slot: 'gun', tier: 2, name: '20mm 기관포', cost: [25, 80], desc: '위력 2배, 연사 −15%', mul: { bulletDmg: 2, fireRate: 0.85 }, icon: ['parts_a', 5] },
    { id: 'gun4', slot: 'gun', tier: 3, name: '치즈 레이저', cost: [50, 150], desc: '위력 +80%, 탄속 +60%, 관통 +2', mul: { bulletDmg: 1.8, bulletSpd: 1.6 }, add: { pierce: 2 }, icon: ['parts_a', 6] },

    { id: 'wing0', slot: 'wing', tier: 0, name: '천 날개', cost: [0, 0], desc: '특별한 것 없음.', icon: ['parts_b', 8] },
    { id: 'wing1', slot: 'wing', tier: 0, name: '경량 날개', cost: [0, 20], desc: '선회 +15%', mul: { turn: 1.15, turnBoost: 1.15 }, icon: ['parts_a', 7] },
    { id: 'wing2', slot: 'wing', tier: 1, name: '자석 날개끝', cost: [5, 35], desc: '선회 +10%, 재료 끌어오는 거리 +70%', mul: { turn: 1.1, turnBoost: 1.1, pickup: 1.7 }, icon: ['parts_a', 8] },
    { id: 'wing3', slot: 'wing', tier: 2, name: '후퇴익', cost: [20, 70], desc: '선회 +30%', mul: { turn: 1.3, turnBoost: 1.3 }, icon: ['parts_b', 0] },

    { id: 'arm0', slot: 'armor', tier: 1, name: '나무 동체', cost: [0, 0], desc: '특별한 것 없음.', icon: ['parts_b', 8] },
    { id: 'arm1', slot: 'armor', tier: 1, name: '알루미늄 장갑', cost: [0, 35], desc: '체력 +30', add: { hp: 30 }, icon: ['parts_b', 1] },
    { id: 'arm2', slot: 'armor', tier: 2, name: '자가 수리 키트', cost: [15, 60], desc: '체력 +20, 회복 2배, 회복 시작 0.5초 빨리', mul: { regen: 2 }, add: { hp: 20, regenDelay: -0.5 }, icon: ['parts_b', 2] },
    { id: 'arm3', slot: 'armor', tier: 3, name: '티타늄 장갑', cost: [40, 120], desc: '체력 +90', add: { hp: 90 }, icon: ['parts_b', 3] },

    { id: 'sub0', slot: 'sub', tier: 2, name: '없음', cost: [0, 0], desc: '보조 무장 없음.', icon: ['parts_b', 8] },
    { id: 'sub1', slot: 'sub', tier: 2, name: '유도 치즈 미사일', cost: [20, 70], desc: '쏘는 동안 1초마다 유도탄 2발', add: { missile: 1 }, icon: ['parts_b', 4] },
    { id: 'sub2', slot: 'sub', tier: 3, name: '다연장 치즈 미사일', cost: [45, 140], desc: '쏘는 동안 0.6초마다 유도탄 4발, 위력 +25%', add: { missile: 0.6, missileN: 2, missileDmg: 1 }, icon: ['parts_b', 5] },

    { id: 'sp0', slot: 'special', tier: 3, name: '없음', cost: [0, 0], desc: '특수 장치 없음.', icon: ['parts_b', 8] },
    { id: 'sp1', slot: 'special', tier: 3, name: '방어막 발생기', cost: [40, 120], desc: '피해를 한 번 막음, 6초마다 다시 참', add: { shield: 6 }, icon: ['parts_b', 6] },
    { id: 'sp2', slot: 'special', tier: 3, name: '황금 치즈 레이더', cost: [30, 100], desc: '치즈 코인 +50%, 재료 끌어오는 거리 +50%', mul: { pickup: 1.5 }, add: { coinBonus: 0.5 }, icon: ['parts_b', 7] },
  ];
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const FRAME = byId(FRAMES), PART = byId(PARTS), SLOT = byId(SLOTS);
  const DEFAULT = Object.fromEntries(SLOTS.map((s) => [s.id, PARTS.find((p) => p.slot === s.id).id])); // 슬롯 기본 파츠

  // ── 저장 (localStorage, 못 쓰면 이번 창에서만)
  const KEY = 'ratplain_save_v1';
  function fresh() {
    return { v: 1, gear: 0, coin: 0, frames: ['biplane'], parts: Object.values(DEFAULT), frame: 'biplane', equip: { ...DEFAULT }, sorties: 0, clears: 0, unlocked: 0, pick: 0, cleared: [] }; // unlocked = 열린 스테이지(0부터), cleared = 깬 스테이지 id
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) {
        const f = Object.assign(fresh(), s);
        f.equip = { ...DEFAULT, ...s.equip };
        for (const id of Object.values(DEFAULT)) if (!f.parts.includes(id)) f.parts.push(id);
        return f;
      }
    } catch (e) {}
    return fresh();
  }
  let save = load();
  const Q = new URLSearchParams(location.search);
  if (Q.has('rich')) { save.gear = Math.max(save.gear, 9999); save.coin = Math.max(save.coin, 9999); } // 확인용
  if (Q.has('allstages')) save.unlocked = window.STAGES.length - 1; // 확인용: 스테이지 다 열기
  function store() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  const slotOpen = (slot, frame) => SLOT[slot].tier <= frame.tier;
  const partFits = (part, frame) => part.tier <= frame.tier && slotOpen(part.slot, frame);
  // 실제로 끼워지는 파츠: 기체 단계가 모자라면(낮은 기체로 바꿨을 때) 기본 파츠로
  function effectiveEquip(frame, equip) {
    const out = {};
    for (const sl of SLOTS) {
      if (!slotOpen(sl.id, frame)) continue;
      const p = PART[equip[sl.id]];
      out[sl.id] = p && partFits(p, frame) ? p.id : DEFAULT[sl.id];
    }
    return out;
  }

  // ── 수치 계산: 기체 · 파츠 바꿔 끼운 가상 상태도 계산 가능 (격납고 미리보기)
  function compute(over = {}) {
    const frame = FRAME[over.frame || save.frame];
    const equip = effectiveEquip(frame, Object.assign({}, save.equip, over.equip));
    const s = Object.assign({}, BASE);
    const mods = [frame, ...Object.values(equip).map((id) => PART[id])];
    for (const m of mods) for (const [k, v] of Object.entries(m.mul || {})) s[k] *= v;
    for (const m of mods) for (const [k, v] of Object.entries(m.add || {})) s[k] += v;
    s.regenDelay = Math.max(0.3, s.regenDelay);
    s.guns = frame.guns;
    s.frame = frame;
    s.equip = equip;
    return s;
  }
  // 격납고 표시용 요약 [이름, 값]
  function summary(s) {
    const fwd = s.guns.filter(([a]) => Math.abs(a) < 1).length;
    return [
      ['체력', Math.round(s.hp)],
      ['속도', Math.round(s.speed)],
      ['선회', +s.turn.toFixed(1)],
      ['화력', Math.round(s.fireRate * s.bulletDmg * fwd + (s.missile ? s.missileN * s.missileDmg / s.missile : 0))],
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
  function buyPart(id) {
    const p = PART[id];
    if (save.parts.includes(id) || !partFits(p, FRAME[save.frame]) || !can(p.cost)) return false;
    pay(p.cost); save.parts.push(id); save.equip[p.slot] = id; store(); return true;
  }
  function equipPart(id) {
    const p = PART[id];
    if (!save.parts.includes(id) || !partFits(p, FRAME[save.frame])) return false;
    save.equip[p.slot] = id; store(); return true;
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
    BASE, GRADES, ERAS, FRAMES, SLOTS, PARTS, FRAME, PART, SLOT, DEFAULT,
    get save() { return save; },
    compute, summary, can, frameBuyable, slotOpen, partFits, effectiveEquip,
    buyFrame, useFrame, buyPart, equipPart, bank, pickStage, reset,
  };
})();
