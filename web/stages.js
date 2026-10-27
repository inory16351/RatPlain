// 스테이지 데이터: 배경 · 웨이브 · 보스 · 난이도. 새 스테이지는 여기에 하나 더 넣고, 새 배경 종류(bg.type)면 backgrounds.js 에 그리기 추가.
// 웨이브: [[적 종류, 수], ...] — 적 종류는 game.js 의 FOE. 마지막 웨이브 = 보스
// mult: hp = 일반 적 체력 배율, dmg = 받는 피해 배율, reward = 떨어뜨리는 재료 배율
// rec = 추천 기체 단계 (격납고 표시용)
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
];
