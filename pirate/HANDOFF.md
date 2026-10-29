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

## 2026-10-29 14:15 세션 (이어서 한 것)
- **게임 코드 완성**: `seas.js`(바다 8개) · `game.js`(전투 이식 + 선원 리깅 + 상어 잠수 + 보스 5종/8전 + 자동 무기 + 안개/폭풍/소용돌이) · `port.js` + `index.html`(타이틀 · 스토리 · 항구 4탭 · 결과)
- **기획서**: `pirate/컨셉기획서.md` (개조식). 작성자 칸은 비행기 기획서를 따라 '정승운'으로 둠 → 다르면 고칠 것
- 확인: 8개 바다 모두 시작 → 보스 → 승리까지 콘솔 오류 없음 (`?god=1` 무적 + 콘솔에서 `PG.G` 로 적 체력 0). 그림 없을 때 벡터로 대신 그림
- 확인용 주소: `pirate/index.html?port=sea|ship|gear|lab` `&rich=1` `&allseas=1` `&allships=1` `&god=1`
- 이 PC 의 Codex CLI = `~/.codex/.sandbox-bin/codex.exe` (PATH 에 없음 → `export PATH="/c/Users/user/.codex/.sandbox-bin:$PATH"` 뒤 `gen.sh`). prep.py 는 시스템 `python -I pirate/tools/prep.py` (PIL 있음)
- 그림 생성은 14:49 한도 풀린 뒤 Codex 로 백그라운드 시작하게 걸어 둠 (32장, galley · crew_rat 제외) → 끝나면 확인 · prep · 게임에서 확인
- **ChatGPT 웹(크롬)으로도 뽑을 수 있음**: 참조 3장 첨부 + 프롬프트(줄바꿈 없이 한 줄) → 결과 blob 을 JS 로 다운로드 → `art/src/gpt/` 에 원본 보관, `art/src/이름.png` 로 복사. `ship_galley` · `crew_rat` 은 GPT 로 뽑은 것 (스타일 아주 잘 맞음). 같은 채팅에서 이어서 요청하면 그림체 유지됨
- prep.py 는 scipy 도 필요: `uv run --no-project --with pillow --with numpy --with scipy python -I pirate/tools/prep.py`
- **배 크기 = len × SHIP_K(1.8)** (`game.js` · `prep.py` 둘 다): 선원은 원래 len 기준 크기라 배만 커져 갑판에 선원이 넉넉히 올라감. `CREW_SPOTS` 는 가운데 돛대 자리를 비움
- **포탄 물리**: 포탄 · 선수포는 배 속도(+ 회전 선속도)를 이어받음, 어뢰는 발사 방향 성분을 얹음, 쏘면 옆으로 밀리고 살짝 돌아감, 폭풍 바람이 포탄도 밂. 조준 띠도 달리는 만큼 앞으로 기울어 실제 떨어질 곳을 보여 줌

## 그림 전부 원본 플랫 그림체로 다시 뽑음 (2026-10-29 16시)
- ChatGPT 1차 그림이 원본(NKK)보다 외곽선 · 광택 · 디테일이 많아 그림체가 달라짐 → **원본 참조(`ref_pirate` · `ref_navy` · `ref_style_top` · `ref_shark`)만 붙이고 강한 플랫 규칙**으로 Codex 재생성
  - `art/src/flat/style.txt` = 플랫 규칙 (한 색 + 그림자 한 단, 외곽선 · 그라데이션 · 광택 · 애니 눈 없음, 차분한 색)
  - `art/src/flat/make_flat.py subjects.json` → `prompt_*.txt` · `refs.txt`, `bash gen_flat.sh 이름…` (BATCH 개씩)
  - 선원 시트는 카메라 규칙(CREW_CAM) 필수: 위에서 60° 내려다봄, 옆모습 · 서 있는 전신 금지 — 안 넣으면 옆모습으로 나옴
  - 결과를 `art/src/` 로 복사(옛 ChatGPT 그림은 `art/src/old_gpt/`), `prep.py` → `art/sprites/`
- **Codex 그림 꺼내기**: Codex 는 `~/.codex/generated_images/` 에 그리고 프로젝트로 복사는 윈도 샌드박스 때문에 자주 실패 → `python -I pirate/tools/codex_pull.py <폴더> <로그 접두어> <접미어> 이름…` 이 로그에서 경로를 찾아 가져옴 (gen_flat.sh 는 자동)
- prep.py: 투명 배경 그림(Codex 가 가끔 줌)도 처리, 해도(map_chart) 찢긴 가장자리 마젠타는 어두운 나무색으로
- **바다는 그림 타일을 안 씀** (타일 이음매가 보였음): `game.js` drawSea = 바다색 한 가지 + 월드 좌표에 고정된 큰 평면 얼룩 + 평면 초승달 물결 → 이음매 없는 한 장. sea_tiles 그림은 안 씀
- 선원 리깅 38명 전부 플랫 그림으로 다시 함 (`rig_map.py`, 색 맵도 Codex). 선장은 crew_rat_0 (새 그림은 눈 위치가 원래 모자 챙 아래라 rig_eye 안 씀). `art/rig/captain`(옛 그림)은 파일 잠김으로 못 지움 → 안 쓰니 지워도 됨

## 캐릭터 파츠 리깅 (2026-10-29 오후) — 선장 완료, 나머지 선원은 같은 순서로
- 방향: **데포르메 탑뷰, 캐릭터만 살짝 쿼터뷰**. 선원 자리는 배와 같이 돌지만 그림은 화면 기준으로 세우고 왼/오만 뒤집음 (`game.js` drawCrew)
- 순서 (통이미지가 기준):
  1. 통이미지 = `art/src/rig/<이름>_whole.png` (선원 시트 칸을 잘라 씀)
  2. **파츠 색 맵**: ChatGPT 에 통이미지를 주고 같은 그림을 단색으로 칠하게 함 — 머리(모자 · 귀 · 얼굴) 빨강, 몸통(옷 · 발) 파랑, 앞팔(어깨~손) 초록, 뒷팔 노랑, 꼬리 하늘색, 배경 흰색 → `art/src/rig/<이름>_map.png`
  3. `python -I pirate/tools/rig_map.py <이름> <통이미지> <색 맵>` → 맵을 실루엣에 맞추고, 통이미지 색 경계로 다듬어 파츠를 자름. 쉬는 자세 = 통이미지와 똑같음, 가려진 곳은 가까운 색으로 채움. `art/rig/<이름>/compare.png` (통이미지 | 조립 | 파츠 구역 · 관절 | 흩어 놓은 파츠) 로 꼭 확인
  4. 눈 옮기기 · 깜빡임: `rig_eye.py <이름> <지금 눈 x,y> <옮길 x,y>` (통이미지 좌표). 선장 = `296,191 320,164`
  5. 소품(칼 · 꽂을대): `rig.json` props 의 gx · gy(쥐는 자리) · rot · scale 을 손으로 맞춤 (다시 잘라도 유지)
  - 옛 방식 `rig_fit.py`(파츠 시트를 색으로 맞춤)는 ChatGPT 파츠 크기 · 모양이 안 맞아 잘못 나뉨 → 안 씀 (함수만 rig_map 이 가져다 씀)
- 게임: `art/rig/rigs.js`(window.RIGS) → 파츠를 관절 기준으로 돌림. 숨쉬기 · 꼬리 · 깜빡임, 걷기, 선장 호령(칼), 포수 장전, 움찔, 만세
- **유닛처럼 상호작용**: 일제 사격 때 선원이 그쪽 난간 대포 자리로 뛰어가 장전 → 잠시 뒤 제자리, 맞으면 움찔, 격침하면 만세, 건진 선원은 난간에서 올라와 자리로
- 확인용: `?zoom=3.5` (카메라 확대, HUD 숨김), 콘솔 `PG.rigDemo(canvas, 'crew_rat', 0, ['idle','order','walk','cheer','flinch'], t)`
- 남은 것: 선원 4명(sailor · gunner · lookout · waver) 색 맵 → 리깅, 고양이 선원 · 보스도 같은 방식
- **크롬 다운로드가 막힘** → ChatGPT 그림은 로컬 수신기(`scratchpad/recv.js`, 127.0.0.1:5398) 팝업으로 `postMessage` 해서 저장. 팝업은 진짜 클릭으로 열어야 함

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

## 2026-10-29 17시 — 시대별 선장 · 조선공 쥐 · UI 그림 · Jua · 탄도 표시
- **선장도 배 단계마다 옷이 바뀜**: `crew_capt` 시트 6칸 = 단계 0~5 (갤리 머리띠 → 대항해 베레모 → 해적 삼각모 → 증기선 실크햇 → 강철함 제독모 → 현대 베레모 · 헤드셋, 애꾸는 그대로). `game.js` `capOf(tier)` (HUD 얼굴 · 항구 스토리도 같은 것)
- **조선소 미리보기 버그 고침**: 미리보기에 tier 를 안 넘겨 늘 갤리 시대 선원이 나왔음 → 배마다 그 시대 선원 · 선장
- **조선공 쥐** `crew_wright` 6칸 = 테크(가진 배 최고 단계) 0~5: 나무 메 → 망치 → 톱 → 렌치(증기) → 리벳 망치(용접 마스크) → 태블릿(안전모). 의뢰 · 합성 탭 왼쪽 캔버스에 리깅으로 그림 (`port.js` npcLoop · `PG.drawChar`). 의뢰 · 합성 = 망치질(`hammer` 자세), 희귀 이상 · 티어 업 성공 = 뒤이어 만세
- 리깅 12개(crew_capt_0~5 · crew_wright_0~5) 색 맵도 Codex: `art/src/rig/gen_map.sh 시트이름` (시트 = `<이름>_sheet.png`) → `rig_map.py <이름> <시트> <맵> 3,2 0 1 2 3 4 5`
- **외륜선 다시 그림**: 바퀴 원판이 누워 보였음 → 위에서 본 외륜 덮개(패들 박스)로. 옛 그림 `art/src/old_flat/ship_paddle_wheels.png`
- **UI 그림**: `ui_hud` 4×4 (체력 · 선원 · 해골 · 깃발 · 돛 · 체인샷 · 화염탄 · 폭격 · 보스 · 나침반 · 콤보 · 칼 · 구명환 · 소리 · 모래시계 · 왕관) → 전투 HUD 아이콘 · 특수탄 단추. HUD 판넬 = `ui_frames 0` 나무판 9조각. 항구 단추 = `ui_frames` 빨강 · 초록 · 나무 단추(border-image), 탭 = 천 리본 + `ui_icons` 아이콘 (`html.art` 일 때만)
- **글꼴 = Jua** (Google Fonts 링크, 한 굵기 → `font-synthesis: none`), 캔버스는 `game.js` 의 `FONT`. 인터넷 없으면 맑은 고딕으로 대신 나옴
- **탄도 표시**: 조준선 = `broadside()` 와 같은 계산(대포 자리 · 배 속도 · 회전 선속도 · 폭풍 바람, `flightAt`)으로 대포 한 문마다 실제 날아갈 길 점선 + 떨어지는 줄 · 점 (처음 만든 띠는 배 가운데 기준이라 실제와 어긋났음). 날아가는 포탄마다 남은 경로 점선 + 착탄 고리 · X (적 = 빨강, 나 = 금빛), 떨어질 때가 가까울수록 고리가 작고 진해짐. 측정: 포탄 실제 이동 = 선과 같음 (속도 540 · 0.75초 → 405px). 화면을 세로로 가로지르는 흰 점선은 맵 경계
- Codex: `~/.codex/.sandbox-bin/codex.exe` 사본은 이미지 생성 도구가 안 뜸 → `gen_flat.sh` 는 PATH 의 앱 codex(`~/bin/codex`) 를 먼저 씀. `make_flat.py` 는 이제 refs.txt 를 덮지 않고 그 줄만 바꿈
