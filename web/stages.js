// 스테이지 데이터: 배경 · 웨이브 · 보스 · 난이도. 새 스테이지는 여기에 하나 더 넣고, 새 배경 종류(bg.type)면 backgrounds.js 에 그리기 추가.
// 웨이브: [[적 종류, 수], ...] — 적 종류는 game.js 의 FOE. 마지막 웨이브 = 보스
// mult: hp = 일반 적 체력 배율, dmg = 받는 피해 배율, reward = 떨어뜨리는 재료 배율
// rec = 추천 기체 단계, recLine = 맞는 갈래 (F 전투기 · M 다목적기 · B 폭격기, 격납고 표시용)
// trait = 맵 특성 (game.js 의 TRAIT): sandstorm 모래폭풍(가벼운 기체가 밀림) · eruption 분화(빠른 기체가 피하기 좋음)
//   fog 안개(시야 = 레이더) · flak 대공포 + 장갑 적(폭탄 · 관통 장비) · lowgrav 무중력 관성 + 유성
// bg.clouds = [위를 지나는 구름 진하기, 색 필터], bg.shadow = 땅에 지는 그림자 진하기 (0 = 없음)
window.STAGES = [
  {
    id: 'sea',
    name: '1스테이지 · 바다 위 하늘',
    bg: { type: 'sea', color: '#5b9fcf', deep: '#5699ca', wave: 'rgba(255,255,255,.38)', islands: 0.28 },
    waves: [
      [['cat', 3]],
      [['cat', 2], ['hawk', 2]],
      [['cat', 4], ['hawk', 3]],
      [['boss', 1]],
    ],
    bossName: '고양이 비행선',
    mult: { hp: 1, dmg: 1, reward: 1 }, rec: 0,
  },
  {
    id: 'storm',
    name: '2스테이지 · 폭풍 구름 위',
    bg: { type: 'storm', color: '#7686a3', dark: '#5f6e8c', light: '#93a2bd', clouds: [0.75, 'brightness(.72) saturate(.6)'], shadow: 0.16 },
    waves: [
      [['cat', 3], ['swift', 3]],
      [['hawk', 3], ['swift', 4]],
      [['cat', 4], ['hawk', 2], ['swift', 4]],
      [['eagle', 1]],
    ],
    bossName: '천둥 독수리',
    mult: { hp: 1.5, dmg: 1.2, reward: 1.6 }, rec: 1,
  },
  {
    id: 'snow',
    name: '3스테이지 · 눈 덮인 산맥',
    bg: { type: 'snow', color: '#e6eef4', shade: '#cfdbe6', rock: '#9fb0c0', pine: '#5f8a7a', lake: '#b9d8ea', clouds: [0.55], shadow: 0.2 },
    waves: [
      [['cat', 4], ['bomber', 1]],
      [['swift', 5], ['hawk', 2]],
      [['bomber', 2], ['cat', 4], ['swift', 3]],
      [['owl', 1]],
    ],
    bossName: '눈보라 부엉이',
    mult: { hp: 2.2, dmg: 1.4, reward: 2.4 }, rec: 1,
  },
  {
    id: 'city',
    name: '4스테이지 · 고양이 도시의 밤',
    bg: { type: 'city', color: '#1f2638', street: '#2a3247', roofs: ['#3a4560', '#46506b', '#333c54', '#4f4a62'], light: '#ffd77a', clouds: [0.3, 'brightness(.45)'], shadow: 0.28 },
    waves: [
      [['cat', 5], ['bomber', 2]],
      [['hawk', 3], ['swift', 5], ['bomber', 1]],
      [['bomber', 3], ['cat', 5], ['hawk', 2]],
      [['ship', 1]],
    ],
    bossName: '고양이 공중 전함',
    mult: { hp: 3, dmg: 1.6, reward: 3.4 }, rec: 2,
  },
  {
    id: 'space',
    name: '5스테이지 · 성층권 너머',
    bg: { type: 'space', color: '#121833', nebula: ['rgba(120,80,200,.18)', 'rgba(60,140,220,.14)', 'rgba(220,90,150,.12)'], rock: '#6c6a80', clouds: [0], shadow: 0 },
    waves: [
      [['swift', 6], ['cat', 4]],
      [['bomber', 3], ['hawk', 3], ['swift', 4]],
      [['bomber', 3], ['cat', 6], ['swift', 6]],
      [['king', 1]],
    ],
    bossName: '고양이 대왕 로켓',
    mult: { hp: 4, dmg: 1.8, reward: 4.5 }, rec: 3,
  },
  {
    id: 'desert',
    name: '6스테이지 · 모래바람 사막',
    bg: { type: 'desert', color: '#e2c48e', dune: '#d4b07a', light: '#efd7a6', rock: '#b98a5a', oasis: '#5fa7a8', clouds: [0.35, 'sepia(.6) brightness(.95)'], shadow: 0.24 },
    trait: { type: 'sandstorm', name: '모래폭풍', tip: '가벼운 기체는 바람에 크게 밀려요. 무거운 폭격기가 유리' },
    waves: [
      [['cat', 5], ['drone', 6]],
      [['bomber', 3], ['swift', 5], ['drone', 6]],
      [['gunship', 1], ['cat', 6], ['hawk', 3]],
      [['bomber', 3], ['drone', 10], ['gunship', 1]],
      [['condor', 1]],
    ],
    bossName: '모래폭풍 콘도르',
    mult: { hp: 5.2, dmg: 2.0, reward: 5.8 }, rec: 3, recLine: 'B',
  },
  {
    id: 'volcano',
    name: '7스테이지 · 불타는 화산섬',
    bg: { type: 'volcano', color: '#3b2b2b', rock: '#5a4440', ash: '#6d5a52', lava: '#ff7a2a', glow: '#ffc04a', clouds: [0.4, 'brightness(.5) sepia(.4)'], shadow: 0.3 },
    trait: { type: 'eruption', name: '분화', tip: '붉은 원이 진해지면 용암이 솟아요. 빠르고 날렵한 전투기가 유리' },
    waves: [
      [['swift', 8], ['hawk', 3]],
      [['cat', 6], ['gunship', 1], ['drone', 6]],
      [['hawk', 4], ['swift', 8], ['bomber', 2]],
      [['gunship', 2], ['cat', 6], ['swift', 6]],
      [['phoenix', 1]],
    ],
    bossName: '용암 불사조',
    mult: { hp: 6.4, dmg: 2.2, reward: 7 }, rec: 3, recLine: 'F',
  },
  {
    id: 'jungle',
    name: '8스테이지 · 안개 낀 밀림',
    bg: { type: 'jungle', color: '#2f5a3a', canopy: ['#3f7a48', '#4d8a52', '#356b40', '#5a9a5c'], river: '#4a8c9a', clouds: [0.5, 'brightness(.85)'], shadow: 0.3 },
    trait: { type: 'fog', name: '짙은 안개', tip: '시야 밖은 보이지 않아요. 레이더가 넓은 다목적기가 유리' },
    waves: [
      [['cat', 7], ['hawk', 4]],
      [['swift', 8], ['drone', 8]],
      [['bomber', 3], ['hawk', 4], ['gunship', 1]],
      [['cat', 8], ['swift', 6], ['drone', 8]],
      [['harpy', 1]],
    ],
    bossName: '밀림 하피 독수리',
    mult: { hp: 7.8, dmg: 2.4, reward: 8.5 }, rec: 4, recLine: 'M',
  },
  {
    id: 'fortress',
    name: '9스테이지 · 고양이 하늘 요새',
    bg: { type: 'fortress', color: '#8fa4b8', deck: '#6e7f91', plate: '#7d8ea0', line: '#ffd45c', clouds: [0.65], shadow: 0.26 },
    trait: { type: 'flak', name: '대공포', tip: '요새 대공포가 계속 쏘고 장갑 포함이 많아요. 폭탄 · 관통 장비 폭격기가 유리' },
    waves: [
      [['gunship', 2], ['cat', 6]],
      [['bomber', 4], ['drone', 10]],
      [['gunship', 3], ['swift', 6], ['hawk', 3]],
      [['gunship', 3], ['bomber', 3], ['drone', 10]],
      [['carrier', 1]],
    ],
    bossName: '고양이 하늘 항모',
    mult: { hp: 9.4, dmg: 2.6, reward: 10.5 }, rec: 4, recLine: 'B',
  },
  {
    id: 'moon',
    name: '10스테이지 · 달 궤도',
    bg: { type: 'moon', color: '#0c1024', surface: '#9a9aa8', crater: '#7d7d8c', earth: '#4a86c8', clouds: [0], shadow: 0 },
    trait: { type: 'lowgrav', name: '무중력', tip: '관성 때문에 미끄러지고 유성이 날아와요. 5단계 기체 권장' },
    waves: [
      [['swift', 10], ['drone', 10]],
      [['gunship', 2], ['bomber', 3], ['cat', 6]],
      [['hawk', 5], ['swift', 8], ['drone', 10]],
      [['gunship', 3], ['bomber', 4], ['cat', 8], ['drone', 8]],
      [['emperor', 1]],
    ],
    bossName: '고양이 황제 모선',
    mult: { hp: 11.5, dmg: 2.8, reward: 13 }, rec: 5, recLine: null,
  },
];
