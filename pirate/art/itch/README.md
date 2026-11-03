# itch.io 페이지 (Pirat of the Caribbean) 자료

- 페이지: https://inoryw82-1.itch.io/rat-pirates (Draft, 편집 https://itch.io/game/edit/5291097). 제목 "Pirat of the Caribbean" (한글 이름 안 붙임), 주소는 rat-pirates 그대로
- `page.html` = 설명 본문 (영/한 병기, 섹션마다 그림). 그림 = `deco/` (설명 편집기 "Add image" 로 올린 itch 주소를 page.html 에 씀)
  - Codex 삽화 (말풍선 없음, 마젠타 → 투명): intro · rescue · shipyard · outro · divider, 원본 `deco/src/`, 프롬프트 `deco/prompt_*.txt`
  - 게임 스프라이트로 조립 (Jua 글꼴): ships (배 진화 표) · bosses · controls, 둥근 테두리 스크린샷 shot_*
- `cover_v2.jpg` 630x500 · `banner_v2.jpg` 960x300 · `bg_v2.jpg` 1920x1280 (테마 Background, 양옆 그림) = Codex 로 뽑은 1536x1024 원본(`*_v2.png`)을 자름. 프롬프트 `prompt_*_v2.txt`, 참조 `-i cover_gpt.jpg -i ../src/title_art.png -i ../src/ref_style_top.png -i ../src/ref_pirate.png`
- `logo.png` = 로비용 투명 로고 (원본 `logo_v2.png` 마젠타 배경 → 키잉 · 여백 자름). Unity 메인 로비에 쓸 것
- `cover_gpt.jpg` · `banner_gpt.jpg` = 이전 이름(RAT PIRATES) 그림, 새 그림 프롬프트의 그림체 참조로 씀
- 테마: BG #1d617d (bg_v2 아래쪽 바다색) · BG2 #f3e8d2 · 글자 #3d2b1f · 링크 #b8473a · Background no-repeat · 가운데 · Fixed · Screenshots = Hidden (스크린샷은 설명 본문에 넣음)
- `shots/` = 게임 캔버스 캡처 1280x720 (`?rich=1&allseas=1&allships=1&god=1`, 콘솔에서 `PG.start(바다)` · `PG.G.wave` 로 보스 바로 부름)
- 업로드 방법: 크롬 확장으로 `HTMLInputElement.prototype.click` 을 가로채 파일 입력칸을 페이지에 띄운 뒤 file_upload (한 번에 10MB 까지)
- 남은 것: 게임 파일 없음 (임베드 자리에 "No file provided to embed"). Unity Pirate_1 WebGL 빌드 (`Assets/Editor/WebGLBuild.cs`, 결과 `build/Pirate_1_WebGL`) 를 zip 해서 올릴 예정. 첫 배치 빌드는 emcc 크래시(0xC0000005)로 실패, 다시 돌리면 됨
