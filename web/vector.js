// 벡터 임시 그림: Codex 그림(art/sprites/*.png)이 아직 없는 것만 game.js 가 이걸로 채움.
// 그림체 = 외곽선 없는 플랫(바탕 + 그늘 1톤 + 밝은 1톤). 모두 탑뷰, 기수가 오른쪽(+x), 날개는 위아래(±y).
// 크기 w · h = 게임 속 크기(px), 캔버스는 2배 해상도. 각 항목은 () => [{ im, w, h }, ...] (프레임들)
(function () {
  const TAU = Math.PI * 2;
  const C = {
    cream: '#efe2c4', creamD: '#d6c39e', red: '#d2543f', redD: '#ad3f2f', wood: '#b98552', woodD: '#94683e',
    olive: '#8f9d62', oliveD: '#717e4b', silver: '#cfd6de', silverD: '#a7b0bb', steel: '#6b7382', steelD: '#545b68',
    mouse: '#9b9ba6', mouseD: '#7f7f8b', pink: '#f0a7b2', mask: '#2f2b36', glass: '#a9d6ec', glassD: '#86bcd6',
    navy: '#33426b', navyD: '#26324f', orange: '#e59a4a', orangeD: '#c47a32', gold: '#f2c14e', goldD: '#d29f2f',
  };

  function make(w, h, frames, draw) {
    return () => Array.from({ length: frames }, (_, i) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(w * 2); cv.height = Math.ceil(h * 2);
      const x = cv.getContext('2d');
      x.scale(2, 2); x.translate(w / 2, h / 2);
      draw(pen(x), i);
      return { im: cv, w, h };
    });
  }
  // 그리기 도구 (모두 채우기만)
  function pen(x) {
    const P = {
      x,
      ell(cx, cy, rx, ry, col, rot = 0) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, TAU); x.fill(); return P; },
      circ(cx, cy, r, col) { return P.ell(cx, cy, r, r, col); },
      poly(pts, col) { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); return P; },
      // 위아래 대칭 다각형 (위쪽 점만 주면 아래는 뒤집어서)
      sym(pts, col) { return P.poly([...pts, ...pts.slice().reverse().map(([a, b]) => [a, -b])], col); },
      rect(rx, ry, rw, rh, col, r = 0) { x.fillStyle = col; x.beginPath(); x.roundRect(rx, ry, rw, rh, r); x.fill(); return P; },
    };
    return P;
  }
  // 조종사 쥐 머리(위에서 봄, 오른쪽을 봄) + 빨간 망토 끝
  function pilot(P, cx, cy, s = 1, cape = true) {
    if (cape) P.poly([[cx - 4 * s, cy - 6 * s], [cx - 22 * s, cy - 9 * s], [cx - 26 * s, cy + 2 * s], [cx - 20 * s, cy + 9 * s], [cx - 4 * s, cy + 6 * s]], C.red);
    P.circ(cx - 4 * s, cy - 7 * s, 5 * s, C.pink).circ(cx - 4 * s, cy + 7 * s, 5 * s, C.pink); // 귀
    P.ell(cx, cy, 8 * s, 7 * s, C.mouse).ell(cx - 2 * s, cy + 1.5 * s, 6 * s, 5 * s, C.mouseD);
    P.rect(cx + 1 * s, cy - 6 * s, 3.5 * s, 12 * s, C.mask, 1.5 * s); // 눈가리개
    P.circ(cx + 8.5 * s, cy, 2.2 * s, C.pink); // 코
  }
  // 프로펠러 (위에서 보면 앞쪽 가는 막대 + 가운데 뭉치)
  function prop(P, cx, cy, len, col = C.wood) { P.rect(cx - 2, cy - len / 2, 4, len, col, 2).circ(cx + 1, cy, 4, C.steelD); }
  function canopy(P, cx, cy, rx, ry) { P.ell(cx, cy, rx, ry, C.glassD).ell(cx + 1, cy - 1, rx - 2, ry - 2, C.glass); }
  // 고양이 머리(위에서 봄, 오른쪽을 봄)
  function catHead(P, cx, cy, s, fur, furD, crown = false) {
    P.poly([[cx - 2 * s, cy - 6 * s], [cx - 9 * s, cy - 12 * s], [cx - 7 * s, cy - 3 * s]], fur).poly([[cx - 2 * s, cy + 6 * s], [cx - 9 * s, cy + 12 * s], [cx - 7 * s, cy + 3 * s]], fur);
    P.ell(cx, cy, 9 * s, 9 * s, fur).ell(cx - 2 * s, cy + 2 * s, 7 * s, 6 * s, furD);
    P.rect(cx - 6 * s, cy - 1.2 * s, 6 * s, 2.4 * s, furD, 1 * s); // 줄무늬
    P.circ(cx + 8.5 * s, cy, 2 * s, C.pink);
    if (crown) P.poly([[cx - 5 * s, cy - 7 * s], [cx + 3 * s, cy - 7 * s], [cx + 5 * s, cy], [cx + 3 * s, cy + 7 * s], [cx - 5 * s, cy + 7 * s], [cx - 2 * s, cy + 3 * s], [cx - 7 * s, cy], [cx - 2 * s, cy - 3 * s]], C.gold);
  }

  const ART = {
    // ── 진화 기체 (web/upgrades.js FRAMES.spr)
    player_mono: make(115, 140, 1, (P) => {
      P.sym([[-50, 0], [-46, 22], [-38, 24], [-36, 0]], C.creamD); // 꼬리 날개
      P.sym([[-20, 0], [-8, 62], [6, 64], [18, 40], [22, 0]], C.cream); // 타원 날개
      P.sym([[-8, 54], [6, 60], [12, 50], [0, 50]], C.red);
      P.ell(0, 0, 52, 11, C.creamD).ell(2, -2, 50, 9, C.cream);
      P.rect(14, -56, 12, 4, C.steelD).rect(14, 52, 12, 4, C.steelD); // 날개 총
      P.ell(36, 0, 12, 10, C.red);
      canopy(P, 4, 0, 14, 8); pilot(P, 4, 0, 0.75);
      prop(P, 52, 0, 46);
    }),
    player_heavy: make(120, 165, 1, (P) => {
      P.rect(-56, -42, 14, 84, C.oliveD, 4); // 꼬리 날개 (두 꼬리 붐을 이음)
      for (const s of [-1, 1]) { P.ell(-6, s * 36, 52, 10, C.oliveD).ell(-4, s * 34, 50, 8, C.olive); P.ell(26, s * 36, 16, 12, C.oliveD); prop(P, 44, s * 36, 44); }
      P.sym([[-14, 0], [-12, 80], [4, 82], [12, 60], [14, 0]], C.olive);
      P.sym([[-12, 72], [4, 76], [8, 68], [-10, 68]], C.cream);
      P.ell(4, 0, 36, 14, C.oliveD).ell(6, -2, 34, 12, C.creamD);
      for (const y of [-6, 0, 6]) P.rect(36, y - 1.5, 12, 3, C.steelD);
      canopy(P, 6, 0, 15, 9); pilot(P, 6, 0, 0.8);
    }),
    player_jet: make(135, 120, 1, (P) => {
      P.sym([[-62, 0], [-66, 26], [-56, 28], [-44, 0]], C.silverD); // 후퇴 꼬리 날개
      P.sym([[-22, 0], [-40, 56], [-28, 58], [14, 10], [16, 0]], C.silver); // 후퇴익
      P.sym([[-36, 50], [-28, 56], [-16, 40], [-22, 40]], C.red);
      P.ell(0, 0, 64, 12, C.silverD).ell(2, -2, 62, 10, C.silver);
      P.ell(54, 0, 11, 11, C.red).circ(62, 0, 6, C.steelD); // 빨간 기수 · 공기 흡입구
      P.circ(-62, 0, 7, C.steelD);
      canopy(P, 14, 0, 14, 8); pilot(P, 14, 0, 0.72);
    }),
    player_fort: make(150, 230, 1, (P) => {
      P.sym([[-70, 0], [-68, 40], [-56, 42], [-50, 0]], C.oliveD);
      P.sym([[-14, 0], [-12, 112], [6, 114], [14, 0]], C.olive);
      P.sym([[-12, 104], [6, 108], [8, 98], [-10, 98]], C.cream);
      for (const y of [-80, -42, 42, 80]) { P.ell(18, y, 18, 9, C.oliveD); prop(P, 36, y, 40); }
      P.ell(0, 0, 72, 15, C.oliveD).ell(2, -2, 70, 13, C.olive);
      P.rect(-40, -6, 22, 12, C.creamD, 3).rect(-10, -6, 18, 12, C.creamD, 3); // 덧댄 판
      P.circ(-24, 0, 7, C.steelD).circ(20, 0, 7, C.steelD); // 위쪽 포탑
      P.ell(64, 0, 10, 11, C.glassD).ell(65, -1, 8, 9, C.glass); // 유리 기수
      pilot(P, 44, 0, 0.75, false);
    }),
    player_super: make(150, 120, 1, (P) => {
      P.sym([[-70, 0], [-64, 56], [-50, 58], [40, 4], [44, 0]], C.silver); // 삼각 날개
      P.sym([[-64, 50], [-52, 54], [-30, 36], [-42, 34]], C.red);
      P.sym([[30, 0], [26, 18], [36, 18], [42, 0]], C.silverD); // 카나드
      P.ell(-4, 0, 70, 10, C.silverD).ell(-2, -1.5, 68, 8, '#f3f5f7');
      P.poly([[64, -6], [76, 0], [64, 6]], C.red);
      P.circ(-70, 0, 8, C.steelD).circ(-70, 0, 4, '#3a3f49');
      canopy(P, 22, 0, 15, 7); pilot(P, 22, 0, 0.7);
    }),
    player_flywing: make(130, 260, 1, (P) => {
      P.sym([[60, 0], [-10, 128], [-36, 124], [-24, 100], [-46, 84], [-30, 62], [-50, 40], [-36, 0]], C.steel);
      P.sym([[52, 0], [-6, 104], [-20, 98], [-10, 80], [-30, 66], [-18, 46], [-30, 24], [-20, 0]], '#7c8494');
      P.sym([[-4, 96], [-14, 108], [-4, 112], [6, 100]], C.cream);
      for (const y of [-70, -36, 36, 70]) P.circ(0 + Math.abs(y) * -0.35, y, 7, C.steelD);
      P.ell(30, 0, 18, 12, C.steelD);
      canopy(P, 32, 0, 13, 9); pilot(P, 32, 0, 0.7);
    }),

    // ── 새 일반 적
    e_swift: make(70, 90, 2, (P, f) => {
      const span = f ? 26 : 44, back = f ? -20 : -6;
      P.sym([[-12, 0], [-30, 12], [-34, 18], [-22, 6]], C.navyD); // 갈라진 꼬리
      P.sym([[4, 0], [back, span], [back - 8, span - 4], [-10, 4]], C.navy); // 날개
      P.ell(0, 0, 18, 8, C.navy).ell(2, -1, 15, 6, '#45568a');
      P.circ(14, 0, 6, '#c75b3f').poly([[19, -2], [26, 0], [19, 2]], '#3a3a3a');
    }),
    e_bomber: make(150, 170, 1, (P) => {
      P.sym([[-66, 0], [-64, 34], [-52, 36], [-46, 0]], C.woodD);
      P.sym([[-16, 0], [-14, 82], [6, 84], [16, 0]], C.wood);
      for (const s of [-1, 1]) { P.ell(18, s * 46, 18, 11, C.woodD); prop(P, 36, s * 46, 40, C.steelD); }
      P.ell(0, 0, 66, 30, C.woodD).ell(2, -3, 62, 26, '#c99862');
      P.rect(-40, -4, 50, 8, C.woodD, 4); // 판자
      canopy(P, 30, 0, 18, 14); catHead(P, 30, 0, 1, C.orange, C.orangeD);
    }),

    // ── 보스
    boss_eagle: make(230, 300, 2, (P, f) => {
      const span = f ? 112 : 146, sweep = f ? -40 : -10;
      P.sym([[-60, 0], [-104, 30], [-110, 14], [-112, 0]], '#8a5a34'); // 꼬리 깃
      for (const [k, col] of [[1, '#7a4e2c'], [0.82, '#9a6a3e']]) // 날개 (깃털 끝 들쭉날쭉)
        P.sym([[20, 6], [10, span * 0.5 * k], [sweep, span * k], [sweep - 16, span * k - 6], [sweep - 10, span * k - 18], [sweep - 28, span * k - 22], [sweep - 22, span * k - 34], [-40, span * 0.4 * k], [-30, 6]], col);
      P.sym([[sweep + 2, span - 30], [sweep - 26, span - 40], [sweep - 4, span - 60]], '#7fb2ff'); // 번개 무늬
      P.ell(-6, 0, 58, 30, '#7a4e2c').ell(-4, -3, 54, 26, '#9a6a3e');
      P.circ(52, 0, 22, '#f2ece0').circ(50, 3, 18, '#ded5c4'); // 흰 머리
      P.poly([[66, -8], [88, 0], [66, 8]], C.gold).poly([[78, -3], [88, 0], [78, 3]], C.goldD);
    }),
    boss_owl: make(220, 300, 2, (P, f) => {
      const span = f ? 110 : 140;
      P.sym([[-50, 0], [-92, 26], [-96, 0]], '#d9e2ea');
      for (const [k, col] of [[1, '#c9d5e0'], [0.84, '#eef3f7']]) P.sym([[20, 10], [-4, span * k], [-30, span * k - 6], [-24, span * k - 22], [-48, span * k - 30], [-40, 10]], col);
      for (let i = 0; i < 9; i++) { const y = 30 + i * 11, x = -10 - (i % 3) * 10; P.circ(x, y, 3, '#8fa3b6').circ(x, -y, 3, '#8fa3b6'); } // 점박이
      P.sym([[-6, span - 20], [-30, span - 30], [-14, span - 44]], '#9fd4ff');
      P.ell(-6, 0, 56, 44, '#dde5ec').ell(-4, -3, 52, 40, '#f4f7fa');
      P.circ(40, 0, 34, '#e9eef3').circ(38, 3, 30, '#f8fafc'); // 둥근 머리
      P.poly([[30, -26], [52, -40], [46, -20]], '#d2dbe4').poly([[30, 26], [52, 40], [46, 20]], '#d2dbe4'); // 귀깃
      for (const s of [-1, 1]) P.circ(56, s * 13, 10, C.gold).circ(58, s * 13, 5, '#2b2b33'); // 노란 눈
      P.poly([[66, -5], [78, 0], [66, 5]], '#8a8f99');
    }),
    boss_ship: make(640, 210, 1, (P) => {
      for (const s of [-1, 1]) P.poly([[-300, s * 20], [-318, s * 92], [-270, s * 92], [-240, s * 30]], C.steelD); // 꼬리 지느러미
      P.ell(0, 0, 310, 82, C.steelD).ell(4, -6, 300, 72, C.steel);
      P.ell(0, -10, 260, 40, '#7d8696');
      for (let x = -220; x <= 200; x += 70) P.rect(x, -58, 4, 116, 'rgba(0,0,0,.12)'); // 철판 이음
      for (const s of [-1, 1]) for (const x of [-200, -120]) prop(P, -300 + (x + 200) * 0.1, s * (60 + (x + 200) * 0.2), 30, C.steelD);
      for (const [x, y] of [[170, -55], [60, 55], [-60, -55], [-170, 55]]) { P.circ(x, y, 22, C.steelD).circ(x, y - 2, 18, '#8a93a3'); P.rect(x, y - 4, 40, 8, '#3f4550', 3); } // 포탑 4
      P.rect(-20, -34, 90, 68, '#59606d', 10).rect(-14, -28, 78, 56, '#737b89', 8); // 함교
      catHead(P, 30, 0, 2, '#4b4b55', '#3a3a42'); // 함장 (검은 고양이)
      P.rect(250, -12, 70, 24, '#3f4550', 8).circ(318, 0, 14, '#ff5c8a').circ(318, 0, 7, '#ffd0de'); // 함수 주포
    }),
    boss_king: make(400, 290, 1, (P) => {
      P.sym([[-150, 0], [-196, 140], [-160, 144], [-60, 60], [-40, 0]], '#a8323a'); // 큰 꼬리 날개
      P.sym([[-150, 30], [-190, 130], [-176, 132], [-120, 50]], C.gold);
      P.sym([[80, 0], [40, 70], [64, 74], [120, 20]], '#a8323a'); // 앞 날개
      for (const y of [-40, 0, 40]) P.circ(-176, y, 22, C.steelD).circ(-178, y, 13, '#2f333b'); // 분사구
      P.ell(0, 0, 186, 62, '#a8323a').ell(4, -6, 180, 54, '#d0454c');
      P.rect(-120, -60, 18, 120, C.gold, 6).rect(40, -58, 14, 116, C.gold, 6); // 금띠
      P.poly([[170, -34], [214, 0], [170, 34]], C.gold);
      P.ell(80, 0, 52, 40, C.glassD).ell(82, -3, 48, 36, C.glass); // 유리 돔
      catHead(P, 84, 0, 2.6, '#f2f0ea', '#d9d4c8', true); // 왕관 쓴 흰 고양이
    }),

    // ── 파츠 아이콘 (web/upgrades.js PARTS.icon, 3×3 시트 순서)
    ...icons('parts_a', [
      (P) => { P.rect(-14, -10, 26, 20, C.steel, 5).rect(-10, -6, 18, 12, '#8a93a3', 3).rect(-20, -6, 8, 12, C.gold, 3); P.ell(-20, 0, 4, 6, C.goldD); }, // 치즈 엔진
      (P) => { P.circ(0, 0, 16, C.silverD).circ(-2, -2, 13, C.silver); P.x.strokeStyle = C.steel; P.x.lineWidth = 3; P.x.beginPath(); for (let a = 0; a < 12; a += 0.2) P.x.lineTo(Math.cos(a) * a, Math.sin(a) * a); P.x.stroke(); }, // 과급기
      (P) => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; P.poly([[Math.cos(a) * 10, Math.sin(a) * 10], [Math.cos(a + 0.25) * 18, Math.sin(a + 0.25) * 18], [Math.cos(a - 0.25) * 18, Math.sin(a - 0.25) * 18]], C.orange); } P.circ(0, 0, 11, C.steelD).circ(0, 0, 6, '#2f333b'); }, // 애프터버너
      (P) => { P.rect(-18, -8, 34, 5, C.steel, 2).rect(-18, 3, 34, 5, C.steel, 2).rect(-20, -10, 10, 20, C.wood, 3); }, // 고속 기관총
      (P) => { P.rect(-16, -10, 22, 20, C.olive, 3); for (const y of [-6, 0, 6]) P.rect(6, y - 2, 12, 4, '#c9a24a', 2).circ(18, y, 2.5, '#6fa8d8'); }, // 철갑탄
      (P) => { P.rect(-16, -6, 38, 12, C.steelD, 4).rect(-20, -10, 14, 20, C.steel, 4).circ(20, 0, 5, '#2f333b'); }, // 20mm
      (P) => { P.rect(-18, -8, 22, 16, C.steel, 4).circ(10, 0, 11, C.gold).circ(11, -2, 6, '#fff3b0'); }, // 레이저
      (P) => { P.poly([[-16, -14], [14, -10], [14, 10], [-16, 14]], C.cream).rect(-2, -12, 3, 24, C.wood); }, // 경량 날개
      (P) => { P.poly([[-16, -12], [6, -8], [6, 8], [-16, 12]], C.cream); P.x.strokeStyle = C.red; P.x.lineWidth = 6; P.x.beginPath(); P.x.arc(12, 0, 8, -Math.PI / 2, Math.PI / 2); P.x.stroke(); }, // 자석 날개끝
    ]),
    ...icons('parts_b', [
      (P) => P.poly([[16, -4], [-16, -18], [-8, -18], [16, 4]], C.silver).poly([[16, 0], [-14, 16], [-6, 16], [16, 4]], C.silverD), // 후퇴익
      (P) => { P.rect(-16, -14, 32, 28, C.silverD, 4).rect(-14, -12, 28, 24, C.silver, 3); for (const [x, y] of [[-10, -8], [10, -8], [-10, 8], [10, 8]]) P.circ(x, y, 2, C.steel); }, // 알루미늄
      (P) => { P.rect(-16, -6, 32, 18, C.red, 4).rect(-6, -12, 12, 7, C.redD, 3).rect(-2, -16, 22, 6, C.steel, 3); }, // 수리 키트
      (P) => { P.rect(-17, -15, 34, 30, '#5f7b9a', 5).rect(-14, -12, 28, 24, '#8fb1d0', 4).rect(-14, -12, 28, 6, '#b8d3ea', 3); }, // 티타늄
      (P) => { P.ell(0, 0, 18, 7, C.gold).poly([[-14, -6], [-22, -12], [-20, 0], [-22, 12], [-14, 6]], C.orange).circ(12, 0, 4, '#fff3b0'); }, // 미사일
      (P) => { P.rect(-18, -2, 34, 4, C.steel); for (const y of [-9, 9]) P.ell(2, y, 15, 6, C.gold).circ(13, y, 3, '#fff3b0'); }, // 다연장
      (P) => { P.rect(-16, 4, 32, 10, C.steel, 4); P.x.fillStyle = 'rgba(150,220,255,.85)'; P.x.beginPath(); P.x.arc(0, 4, 15, Math.PI, 0); P.x.fill(); }, // 방어막
      (P) => { P.poly([[-16, 14], [16, 14], [16, -2]], C.gold).poly([[-16, 14], [16, -2], [-16, 4]], C.goldD).rect(-2, -16, 3, 14, C.steel).ell(0, -16, 10, 4, C.silver); }, // 황금 레이더
      (P) => { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P.rect(Math.cos(a) * 13 - 4, Math.sin(a) * 13 - 4, 8, 8, C.goldD, 2); } P.circ(0, 0, 13, C.gold).circ(0, 0, 5, '#a37a1f'); }, // 기본 톱니
    ]),
  };
  // 아이콘 시트: 칸마다 46×46 한 장씩 (sprites 의 <시트>_<칸> 과 같은 순서)
  function icons(name, list) {
    return { [name]: () => list.map((fn) => make(46, 46, 1, (P) => fn(P))()[0]) };
  }

  window.VECTOR_ART = ART;
})();
