# itch.io 페이지 (쥐 해적) 자료

- 페이지: https://inoryw82-1.itch.io/rat-pirates (Draft, 편집 https://itch.io/game/edit/5291097)
- `page.html` = 설명 본문 (영/한 병기)
- `cover_gpt.jpg` 630x500 · `banner_gpt.jpg` 960x300 = ChatGPT 웹(크롬)으로 뽑은 1536x1024 그림을 잘라 씀 (참조: `../src/title_art.png` · `ref_style_top.png` · `ref_pirate.png`). 원본 1536x1024 는 ChatGPT 채팅 "Generate game cover image" 에만 있음
- 크롬 → 로컬 수신기 연결이 막혀서, 그림은 ChatGPT 탭에서 itch 팝업 탭으로 postMessage 로 넘겨 바로 올림. 로컬 사본은 itch CDN 에서 받음
- `prompt_cover_art.txt` · `prompt_banner_art.txt` = Codex 로 새로 뽑을 프롬프트 (로고 글자 "RAT PIRATES" 포함). 참조 `-i ../src/title_art.png -i ../src/ref_style_top.png -i ../src/ref_pirate.png`
- `shots/` = 게임 캔버스 캡처 1280x720 (`?rich=1&allseas=1&allships=1&god=1`, 콘솔에서 `PG.start(바다)` · `PG.G.wave` 로 보스 바로 부름)
- 테마: BG #24566f · BG2 #f3e8d2 · 글자 #3d2b1f · 링크 #b8473a
