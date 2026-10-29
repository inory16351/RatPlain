// 바다 8개: 배경색 · 난이도 배율 · 추천 티어 · 맵 특성 · 웨이브(적 이름 목록) · 보스 · 스토리
// 적 이름 = game.js 의 FOES 키. 적 체력 × mult, 피해 × (1 + (mult − 1) · 0.6)
// trait: fog = 안개(시야 = 배 vision) · storm = 폭풍(바람에 밀림 + 번개 예고 원) · whirl = 소용돌이(끌어당김 · 가운데 피해)
window.SEAS = [
  { id: 'harbor', name: '치즈 항구 앞바다', col: ['#2f7fae', '#1b5a85'], mult: 1, rec: 0, trait: null,
    waves: [['sloop', 'sloop', 'mine'], ['sloop', 'sloop', 'mine', 'mine', 'rival'], ['sloop', 'sloop', 'sloop', 'rival', 'mine']],
    boss: 'b_rival', story: '항구를 막아선 라이벌 해적 \'회색꼬리\'. 첫 바다부터 길을 연다.' },
  { id: 'reef', name: '상어 암초', col: ['#2a8f9a', '#17606e'], mult: 1.3, rec: 1, trait: null,
    waves: [['shark', 'shark', 'shark', 'sloop'], ['shark', 'shark', 'sloop', 'sloop', 'mine'], ['shark', 'shark', 'shark', 'shark', 'sloop', 'rival']],
    boss: 'b_shark', story: '지느러미만 보이는 상어 떼. 어뢰 · 폭격만 물속까지 닿음.' },
  { id: 'patrol', name: '고양이 해군 순찰대', col: ['#2d6f9e', '#183f66'], mult: 1.7, rec: 1, trait: null,
    waves: [['frigate', 'sloop', 'speeder', 'speeder'], ['frigate', 'frigate', 'speeder', 'speeder', 'mine'], ['frigate', 'frigate', 'sloop', 'speeder', 'speeder', 'speeder']],
    boss: 'b_admiral', story: '고양이 해군 제독의 순찰 함대. 쾌속정이 들이받으러 옴.' },
  { id: 'den', name: '안개 낀 해적 소굴', col: ['#3d6d7e', '#22414f'], mult: 2.2, rec: 2, trait: 'fog',
    waves: [['rival', 'rival', 'mine', 'mine'], ['rival', 'rival', 'rival', 'sloop'], ['rival', 'rival', 'rival', 'rival', 'mine', 'mine']],
    boss: 'b_king', story: '해적왕 블랙랫의 소굴. 안개 속에서는 망원경 · 레이더가 힘.' },
  { id: 'strait', name: '폭풍 해협', col: ['#355f80', '#1a3550'], mult: 2.8, rec: 3, trait: 'storm',
    waves: [['shark', 'shark', 'frigate', 'rival'], ['mortar', 'frigate', 'shark', 'shark', 'speeder'], ['mortar', 'rival', 'rival', 'shark', 'shark', 'speeder']],
    boss: 'b_shark2', story: '번개가 내리치는 해협. 상처 입은 거대 상어가 돌아옴.' },
  { id: 'iron', name: '철갑 함대', col: ['#3a6a8a', '#1f3d58'], mult: 3.5, rec: 3, trait: null,
    waves: [['ironclad', 'mortar', 'speeder', 'speeder'], ['ironclad', 'ironclad', 'mortar', 'frigate'], ['ironclad', 'ironclad', 'mortar', 'mortar', 'speeder', 'speeder']],
    boss: 'b_admiral2', story: '쇠로 감싼 고양이 해군 신형 함대. 제독 기함 Mk2 출격.' },
  { id: 'whirl', name: '소용돌이 바다', col: ['#2b6d8c', '#163a52'], mult: 4.3, rec: 4, trait: 'whirl',
    waves: [['rival', 'rival', 'frigate', 'shark', 'shark'], ['ironclad', 'mortar', 'rival', 'speeder', 'speeder'], ['ironclad', 'frigate', 'rival', 'rival', 'shark', 'shark', 'mortar']],
    boss: 'b_king2', story: '바다 한가운데 거대한 소용돌이. 해적왕이 복수하러 옴.' },
  { id: 'hq', name: '고양이 해군 본진', col: ['#2e5f84', '#13304a'], mult: 5.2, rec: 5, trait: 'storm',
    waves: [['ironclad', 'ironclad', 'frigate', 'frigate', 'speeder'], ['ironclad', 'mortar', 'mortar', 'rival', 'shark', 'shark'], ['ironclad', 'ironclad', 'frigate', 'mortar', 'mortar', 'speeder', 'speeder']],
    boss: 'b_fortress', story: '대제독의 해상 요새. 이 바다를 넘으면 일곱 바다가 쥐의 것.' },
];
