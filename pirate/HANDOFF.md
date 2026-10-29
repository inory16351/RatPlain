# 쥐 해적 — 바다 정복 · 인계 기록

2026-10-29 작성. 토큰이 떨어지면 이 문서부터 읽고 이어 갈 것.

## 사용자 요구 (원문 요약)
- 인게임 = 쥐 해적선 게임(`RatPirate/index.html`) 조작 · 전투 그대로 (돛 W/S · 키 A/D · 뱃전 일제 사격 · 체인샷/화염탄/폭격 · 선원 구조 · 콤보)
- 아웃게임 = 쥐 비행기 게임(`web/upgrades.js`, `web/hangar.js`) 처럼 테크 갈래 분기 + 티어 · 등급 비례 랜덤 장비(제작 의뢰 · 합성 · 티어 업)
- 테크 = **현실 배 발전 순서**, 비행기 게임처럼 3갈래로 갈라짐
- 그림체 = NKK 원본 플랫 · 귀여운 그림체, Codex 로 새로 뽑음. 적 = 고양이 해군 · 라이벌 쥐 해적선 · 상어
- 배 그림만 봐도 쥐 · 고양이가 드러나야 함 (쥐 머리 선수상 · 꼬리 키 / 고양이 귀 뱃머리 · 발바닥 돛)
- **배와 선원은 따로 (리깅)**: 배 갑판은 비우고 선원 그림을 코드로 올림
- 상어는 지느러미만 보이는 잠수(버로우) 상태가 있어야 함
- 스토리 = 원본 해적 쥐(애꾸 · 삼각모)가 바다를 정복하려는 야망
- 결과물 = 웹게임 + 새 컨셉 기획서. 문서는 개조식(~함/명사 끝), 한국어
- 이전 쥐 해적 그림은 채도 높고 소품이 많아 그림체가 안 맞는다는 지적 → 프롬프트에 차분한 색 · 큰 면 · 소품 없음 추가함

## 폴더
| 위치 | 내용 |
|---|---|
| `pirate/art/src/make_prompts.py` | 프롬프트 생성 (`prompt_*.txt` + `refs.txt`) |
| `pirate/art/src/gen.sh` | Codex 생성 `bash gen.sh [이름…]` (BATCH 개씩 동시에) |
| `pirate/art/src/ref_*.png` | 참조: NKK `Rats/Parts/pirate` · 고양이 · 상어 부위를 이어 붙인 것 + 비행기 게임 탑뷰 그림 |
| `pirate/art/src/old/` | 첫 시험 그림 (채도 높음, 안 씀) |
| `pirate/tools/prep.py` | 마젠타 빼기 · 자르기 → `pirate/art/sprites/` + `sprites.js` |
| `pirate/ships.js` | 아웃게임 데이터 · 저장 (배 16척 · 장비 · 의뢰 · 합성 · 티어 업) — 완성 |
| `sea/` | 포크 세션이 쓰다 멈춘 폴더. 안 씀 (지워도 됨, 사용자에게 확인) |

## 배 진화 (ships.js `SHIPS`)
- 0 갤리선 → 3갈래
- S 쾌속선: 캐러벨 → 클리퍼 → 외륜 증기선 → 어뢰정 → 미사일 고속정
- M 다목적함: 캐랙 → 프리깃 → 증기 프리깃 → 방호 순양함 → 잠수함
- H 중포함: 갤리온 → 전열함 → 철갑함 → 드레드노트 → 항공모함
- 단계가 오르면 자동 무기가 붙음: 선수포(bow) · 어뢰(torpedo) · 유도탄(missile) · 함재기(planes) · 자동 폭격(autoMortar)

## ⚠ 먼저 볼 것 (2026-10-29 13:55)
- **Codex 사용 한도 걸림** — 새 생성은 전부 실패, 한도 풀림 = 오늘 오후 2:48 (로그: "You've hit your usage limit")
- 지금 `art/src` 에 있는 `ship_galley · caravel · clipper · paddle · torpedo · missile · carrack · steamfrigate.png` 8장은 옛 프롬프트(채도 높음 · 갑판에 선원 그려짐) 결과라 `old/` 로 옮겨 둠 (안 씀) → 다시 생성 필요
- 한도 풀리면: `cd pirate/art/src && BATCH=6 bash gen.sh $(cut -d' ' -f1 refs.txt | grep -v -x e_shark)` (e_shark 는 그대로 씀)
- 생성이 다 실패해도 exit 0 으로 끝나므로 `log_*.txt` 끝줄 · png 개수로 확인

## 지금 상태 (넘길 때)
- 그림 35장 Codex 생성이 백그라운드에서 돌고 있었음 (스타일 고친 프롬프트, 갑판 빈 배 + 선원 따로). `e_shark.png` 는 첫 시험본 그대로 씀
  - 쥐 배 8척(galley · caravel · clipper · paddle · torpedo · missile · carrack · steamfrigate)은 **옛 프롬프트로 도는 배치와 겹칠 수 있어 맨 뒤에 돌림** → 끝난 뒤 그 8장이 갑판에 선원 없는 새 그림인지 꼭 확인, 선원이 그려져 있으면 다시 생성
  - 확인할 점: 채도 낮은 차분한 색인지, 갑판에 캐릭터 없는지, 뱃머리 오른쪽 탑뷰인지, 쥐 머리 선수상 · 꼬리 키 / 고양이 귀 뱃머리가 작게 봐도 보이는지
- `prep.py` 의 SHEETS 에 그림 이름 · 칸 수 · 게임 속 가로(배 = ships.js `len`)가 다 들어가 있음
- 게임 코드(seas · game · port · index)와 기획서는 아직 안 씀

## 설계 (이어서 만들 것)
### 바다 8개 — `pirate/seas.js` (`window.SEAS`, id · name · col(바다색) · mult · rec(추천 티어) · trait · waves[[적 이름…]…] · boss · story)
| 바다 | 적 | 보스 | 특성 | 배율 | 추천 |
|---|---|---|---|---|---|
| 1 치즈 항구 앞바다 | 순찰선 · 폭탄통 · 라이벌 1 | 라이벌 항해사 '회색꼬리' (e_rat_rival 크게, 3문 + 폭격 3) | - | 1 | 0 |
| 2 상어 암초 | 상어 떼 · 순찰선 | 거대 상어 | - | 1.3 | 1 |
| 3 고양이 해군 순찰대 | 프리깃 · 쾌속정 | 제독 기함 | - | 1.7 | 1 |
| 4 안개 낀 해적 소굴 | 라이벌 쥐 해적선 | 해적왕 블랙랫 갤리온 | 안개(시야 = `vision`) | 2.2 | 2 |
| 5 폭풍 해협 | 섞임 | 분노한 거대 상어 | 폭풍(바람에 밀림 + 번개 예고 원) | 2.8 | 3 |
| 6 철갑 함대 | 철갑함 · 박격포선 | 제독 기함 Mk2 | - | 3.5 | 3 |
| 7 소용돌이 바다 | 전부 | 해적왕 재도전 | 소용돌이(끌어당김 · 가운데 피해) | 4.3 | 4 |
| 8 고양이 해군 본진 | 전부 | 대제독 해상 요새 | 폭풍 | 5.2 | 5 |
- 적 체력 × mult, 피해 × (1 + (mult−1)·0.6). 웨이브 3개 + 보스 웨이브. 웨이브 사이 수리 `repair` + 선원 수

### 전투 — `pirate/game.js` (RatPirate/index.html 이식)
- 조작 그대로: W/S 돛, A/D 키, 클릭 = 마우스 쪽 뱃전, Q/E, Space 양쪽, 1 체인샷 · 2 화염탄 · 3 폭격 (배 · 장비에 `chain`/`fire`/`mortar` 값이 있을 때만, 값 = 재사용 초)
- 수치는 `SHIPYARD.compute()` 결과: guns · reload(선원 1명당 −crewReload, 최대 crewMax) · dmg · crit · range · speed · turn · hp · dmgTaken
- 자동 무기: bow(앞 45° 안 가까운 적에 직사) · torpedo(마우스 쪽 직진, 잠수한 상어도 맞음) · missile(유도) · planes(배 둘레를 돌며 사격, 벡터로 그림) · autoMortar
- 고유 효과: ram · splash · burnAll · chainAll · double · plunder · evade · kraken · stormGuard · goldBonus · plankBonus · crewHeal
- **선원 리깅**: 배 스프라이트 위에 `CREW_SPOTS`(len 비율 좌표) 자리마다 선원 스프라이트를 올림. 선장(crew_rat 0, 쏠 때 1) 고물 쪽, 건진 선원 수만큼 crew_rat 2~5 가 갑판에 늘어남(최대 7). 쏘면 선원이 살짝 튐, 흔들림. 고양이 배 = crew_cat, 보스 = crew_boss (0 제독 · 1 해적왕 · 2 대제독 · 3 라이벌 선원). 가라앉으면 선원이 바다로 뛰어내림
- **상어 잠수**: 평소엔 지느러미(shark_fin 0)만 + 물살. 이때 포탄은 위로 지나감(어뢰 · 폭격만 맞음). 가까이 오면 떠올라 2.5초 몸 보이고 물기 → 다시 잠수
- 보스: 제독 = 일제 사격 + 6초마다 폭격 세례 / 쾌속정 소환. 해적왕 = 화염탄 일제 사격 + 원형 포탄 16 / 라이벌 소환. 거대 상어 = 잠수(지느러미, 무적) → 예고선 뒤 돌진 · 물기 → 상어 소환 → 4초 떠올라 약점. 해상 요새 = 포탑 4곳 조준 사격 + 폭격 비 · 쾌속정 · 나선 탄, 절반 아래 빨라짐
- 떨어뜨리는 것: 치즈 금화 · 목재 · 보물상자 · 납치된 쥐(구조 = 선원 +1). 이기면 전부, 침몰하면 절반 `SHIPYARD.bank`
- 바다 · 섬 · 물살 · 파편 · 콤보 · 히트스톱 · 효과음 합성은 원본 코드 그대로 가져오면 됨. BGM 은 `../audio/bgm/*.mp3` 재사용 가능

### 항구 — `pirate/port.js` + `pirate/index.html` (DOM)
- 탭: 출항(바다 지도 · 추천 티어 · 스토리) · 조선소(배 트리 3줄 × 6단계, 사기 · 타기) · 장비(슬롯에 끼우기, 수치 차이 미리보기) · 의뢰(금화 슬라이더 · 등급/티어 확률 표시) · 합성(3개 합성 · 전설 티어 업)
- 처음 켜면 스토리 화면: 애꾸 선장이 고양이 해군에게 빼앗긴 바다를 되찾고 일곱 바다를 정복하겠다고 다짐
- 확인용 주소: `?rich=1` `&allseas=1` `&allships=1` (ships.js 에 이미 있음)

## 남은 일 (순서대로)
1. 그림 생성 끝나면 확인 (`pirate/art/src/*.png`) → 이상한 것만 `bash gen.sh 이름` 으로 다시
2. `python -I pirate/tools/prep.py` 로 자르기
3. `pirate/seas.js` (바다 8개 · 웨이브 · 보스 · 맵 특성 안개/폭풍/소용돌이)
4. `pirate/game.js` (RatPirate 전투 이식 + 스프라이트 + 선원 리깅 + 상어 잠수 + 보스 패턴 + 자동 무기)
5. `pirate/port.js` + `pirate/index.html` (항구: 배 트리 · 장비 · 조선소 의뢰/합성 · 바다 선택 · 스토리)
6. `pirate/컨셉기획서.md` (개조식)
7. 서버 `node tools/serve.js` → http://localhost:5321/pirate/index.html 확인, 커밋

## 포크 세션 메모 (반영함)
- 쥐 해적기 세 동그라미 쥐 귀 문양 = 미키마우스 실루엣처럼 보임 → 치즈 조각 + 뼈 문양으로 바꿈 (`make_prompts.py` RAT · TITLE)
- 포크가 만든 시험본 `sea/art/src/r_sloop.png` · `c_sloop.png` = 배 자체로 쥐 · 고양이가 잘 읽힘. 방향 참고용
