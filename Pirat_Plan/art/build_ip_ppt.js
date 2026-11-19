// 다른 발표 중간에 넣는 추가 IP 게임 소개 4장 → Pirat_Plan/파이랫_IP소개.pptx
// 사용: python Pirat_Plan/art/prep_ip.py → NODE_PATH=<pptxgenjs · sharp · jszip 설치 폴더>/node_modules node Pirat_Plan/art/build_ip_ppt.js
// 그림: Codex 생성 ip_*.png (prompt_ip_*.txt) → prep_ip.py 가 crop/ · cut/ 에 비율 맞춰 자름. Unity 화면 = pirate/art/itch/shots
const path = require('path');
const { kit, C, W, H, X0, CW } = require('./ppt_kit');

const OUT = path.join(__dirname, '..', '파이랫_IP소개.pptx');
const GRADE = [['일반', 'C9D2DC'], ['고급', '7FD88A'], ['희귀', '6FB8FF'], ['전설', 'FFB84D']];
const ERA = ['갤리선', '범선', '증기선', '강철 군함', '현대 함정'];

(async () => {
  const k = kit('Pirat of the Caribbean / 추가 IP 게임 소개');
  const { pres, text, card, chip, badge, arrow, img } = k;
  const shot = '../../pirate/art/itch/shots/u_broadside.png';
  await k.load(['crop/ip_cover.jpg', 'crop/ip_broadside.jpg', 'cut/ip_gacha.png', 'cut/rat_0.png', 'cut/wright_0.png', shot, ...ERA.map((_, i) => `cut/ip_evo_${i}.png`),
    'e_cat_sloop_0.png', 'e_cat_frigate_0.png', 'e_shark_0.png', 'boss_admiral_0.png']);

  // 키캡 + 설명
  const key = (s, t, x, y, w = 0.5) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.44, rectRadius: 0.07, fill: { color: C.card }, line: { color: 'B8C3CC', width: 1 }, shadow: { type: 'outer', color: '8A99A6', opacity: 0.5, blur: 0, offset: 2, angle: 90 } });
    text(s, t, x, y, w, 0.44, { size: 12, bold: true, color: C.navy, align: 'center', valign: 'middle' });
    return x + w + 0.1;
  };

  // 1. 표지 + 기획의도
  {
    const s = pres.addSlide({ masterName: 'COVER' });
    img(s, 'crop/ip_cover.jpg', 0, 0, W, H);
    chip(s, '추가 IP 게임 소개', 0.75, 0.75, 2.1, 0.4, C.navy, C.card, 12);
    text(s, 'Pirat of the\nCaribbean', 0.75, 1.3, 6, 1.9, { size: 50, bold: true, color: C.navy, ls: 0.95 });
    text(s, '원작 해적 쥐를 활용한 탑뷰 해전 액션', 0.75, 3.25, 6, 0.4, { size: 16, bold: true, color: '4A5966' });
    // 기획의도: 문제 → 해결
    const y = 4.1;
    card(s, 0.75, y, 4.55, 2.75, { fill: C.card, tr: 8 });
    text(s, '기획의도', 1.05, y + 0.2, 3, 0.35, { size: 13, bold: true, color: C.sea });
    const rows = [
      ['본편', '긴 플레이 타임과 볼륨감,\n동일한 패턴 반복으로 지루함 발생', 'B8C3CC'],
      ['IP 게임', '가볍고 캐쥬얼한 해전으로\n지친 플레이어의 감각 완화', C.cheese],
      ['효과', '원작 캐릭터 / 그림체를 활용하여\nip 확장 시도', C.sea],
    ];
    rows.forEach(([h, b, col], i) => {
      const ry = y + 0.65 + i * 0.66;
      chip(s, h, 1.05, ry + 0.1, 0.95, 0.36, col, col === C.cheese ? C.navy : C.card, 11);
      text(s, b, 2.15, ry, 2.95, 0.56, { size: 12, valign: 'middle', ls: 1.15 });
    });
  }

  // 2. 원페이지 기획서
  {
    const s = k.slide('원페이지 기획서', 'Pirat of the Caribbean', '애꾸 선장 쥐가 고양이 해군에게 빼앗긴 바다를 되찾는 해전 액션 게임');
    const lw = 6.75, lh = lw * 9 / 16;
    img(s, shot, X0, 1.85, lw, lh, { shadow: true });
    text(s, 'Unity 개발 화면: 측면 일제 사격', X0, 1.85 + lh + 0.08, lw, 0.28, { size: 10.5, color: C.muted });
    // 게임 루프
    const loop = ['출항', '웨이브 전투', '보스', '전리품', '강화', '재출항'];
    const ly = 6.2, cw = 0.98, gap = (lw - loop.length * cw) / (loop.length - 1);
    loop.forEach((t, i) => {
      const x = X0 + i * (cw + gap);
      chip(s, t, x, ly, cw, 0.42, i === 0 || i === 5 ? C.navy : C.tint, i === 0 || i === 5 ? C.card : C.ink, 11);
      if (i < loop.length - 1) arrow(s, x + cw + 0.02, ly + 0.21, x + cw + gap - 0.02, ly + 0.21, '9AAAB8', 1.25);
    });
    const rows = [
      ['장르', '탑뷰 해전 액션 (웨이브 + 보스)'],
      ['플랫폼', 'PC (스팀) / 키보드 + 마우스'],
      ['BM', '패키지 판매, 가챠는 게임 내 재화로만 진행'],
      ['타겟', '원작 팬 / 캐쥬얼 액션 유저'],
      ['레퍼런스', '어쌔신 크리드 4 해전 (측면 사격)'],
      ['적', '고양이 해군 / 라이벌 쥐 해적 / 상어'],
      ['볼륨', '바다 8개 / 함선 16척 / 장비 213종'],
    ];
    const rx = 7.75, rw = W - X0 - rx;
    card(s, rx, 1.85, rw, 4.77);
    rows.forEach(([a, b], i) => {
      const y = 2.0 + i * 0.64;
      text(s, a, rx + 0.3, y, 1.1, 0.5, { size: 12, bold: true, color: C.sea, valign: 'middle' });
      text(s, b, rx + 1.4, y, rw - 1.6, 0.5, { size: 13, valign: 'middle' });
      if (i < rows.length - 1) k.line(s, rx + 0.3, y + 0.57, rx + rw - 0.3, y + 0.57, C.line, 0.75);
    });
  }

  // 3. 인게임
  {
    const s = k.slide('게임 메카닉스 / 인게임', '양쪽 측면 포격과 진행 방향 컨트롤', '양쪽으로 발사되는 포탄과 배의 진행 방향을 컨트롤하여 다양한 적들과 싸우고, 스테이지를 클리어하는 게임');
    const iw = 7.2, ih = 4.8;
    img(s, 'crop/ip_broadside.jpg', X0, 1.85, iw, ih, { shadow: true });
    const rx = 8.2, rw = W - X0 - rx;
    const blk = [
      ['진행 방향 컨트롤', '돛으로 속도, 키로 방향 조절\n적에게 측면을 돌리는 위치 선정이 핵심', [['W', 'S'], '돛'], [['A', 'D'], '키']],
      ['양쪽 측면 포격', '좌우 대포 쿨다운 별도\n여러 문이 동시에 발사되는 일제 사격', [['Q', 'E'], '좌 / 우'], [['Space'], '동시']],
    ];
    blk.forEach(([h, b, k1, k2], i) => {
      const y = 1.85 + i * 1.75;
      badge(s, i + 1, rx, y, 0.42);
      text(s, h, rx + 0.55, y, rw - 0.55, 0.42, { size: 16, bold: true, valign: 'middle' });
      text(s, b, rx + 0.55, y + 0.48, rw - 0.55, 0.5, { size: 12, color: C.muted });
      let x = rx + 0.55;
      for (const [keys, lab] of [k1, k2]) {
        keys.forEach((t) => { x = key(s, t, x, y + 1.05, t.length > 1 ? 0.9 : 0.44); });
        text(s, lab, x - 0.02, y + 1.05, 0.7, 0.44, { size: 11, color: C.muted, valign: 'middle' });
        x += 0.62;
      }
    });
    // 3. 스테이지
    const y = 1.85 + 2 * 1.75;
    badge(s, 3, rx, y, 0.42);
    text(s, '웨이브 → 보스 → 클리어', rx + 0.55, y, rw - 0.55, 0.42, { size: 16, bold: true, valign: 'middle' });
    text(s, '바다 8개 구성, 바다마다 적 / 맵 특성 상이', rx + 0.55, y + 0.48, rw - 0.55, 0.3, { size: 12, color: C.muted });
    ['e_cat_sloop_0.png', 'e_cat_frigate_0.png', 'e_shark_0.png', 'boss_admiral_0.png'].forEach((f, i) => {
      img(s, f, rx + 0.55 + i * 1.02, y + 0.85, 0.9, 0.5);
    });
  }

  // 4. 아웃게임
  {
    const s = k.slide('게임 메카닉스 / 아웃게임', '로그라이크 요소와 함선 성장의 결합', '실제 배의 발전 과정을 업그레이드 형식으로 보여 주고, 장비는 가챠로 획득');
    // 위: 함선 진화
    const ty = 1.8, th = 2.45;
    card(s, X0, ty, CW, th);
    chip(s, '함선 진화: 6시대 × 3테크, 16척', X0 + 0.3, ty + 0.2, 2.9, 0.34, C.navy, C.card, 11);
    const n = ERA.length, sw = 2.0, sg = (CW - 0.6 - n * sw) / (n - 1);
    ERA.forEach((e, i) => {
      const x = X0 + 0.3 + i * (sw + sg);
      img(s, `cut/ip_evo_${i}.png`, x, ty + 0.6, sw, 1.25);
      text(s, e, x, ty + 1.95, sw, 0.32, { size: 13, bold: true, align: 'center' });
      if (i < n - 1) arrow(s, x + sw + 0.04, ty + 1.22, x + sw + sg - 0.04, ty + 1.22, C.cheese, 2);
    });
    // 아래 왼쪽: 로그라이크 루프
    const by = 4.45, bh = 2.35, bw = (CW - 0.3) / 2;
    card(s, X0, by, bw, bh);
    text(s, '로그라이크 + 함선 성장', X0 + 0.3, by + 0.2, bw - 0.6, 0.35, { size: 15, bold: true });
    const two = [
      ['판 안', '쥐 구조 시 선원 +1, 장전 속도 상승\n출항마다 초기화', C.cheese, C.navy],
      ['판 밖', '전리품으로 함선 구매, 장비 제작\n함선 / 장비는 계속 누적', C.sea, C.card],
    ];
    two.forEach(([h, b, f, c], i) => {
      const y = by + 0.72 + i * 0.78;
      chip(s, h, X0 + 0.3, y + 0.08, 0.95, 0.38, f, c, 12);
      text(s, b, X0 + 1.45, y, bw - 2.6, 0.6, { size: 12, valign: 'middle', ls: 1.15 });
      img(s, i ? 'cut/wright_0.png' : 'cut/rat_0.png', X0 + bw - 1.05, y - 0.05, 0.75, 0.72);
    });
    // 아래 오른쪽: 장비 뽑기
    const gx = X0 + bw + 0.3;
    card(s, gx, by, bw, bh);
    img(s, 'cut/ip_gacha.png', gx + 0.2, by + 0.2, 2.3, bh - 0.4);
    const tx = gx + 2.65, tw = bw - 2.85;
    text(s, '장비 가챠 (조선소 의뢰)', tx, by + 0.2, tw, 0.35, { size: 15, bold: true });
    text(s, '장비 슬롯과 등급을 가챠로 획득\n무작위 보상 기반의 쾌감 자극', tx, by + 0.58, tw, 0.5, { size: 12, color: C.muted, ls: 1.15 });
    const gw = (tw - 0.3) / 4;
    GRADE.forEach(([g, col], i) => chip(s, g, tx + i * (gw + 0.1), by + 1.22, gw, 0.36, col, C.ink, 11));
    text(s, '확률 전부 공개, 투입 재화 직접 선택\n합성으로 재활용', tx, by + 1.72, tw, 0.5, { size: 11, color: C.muted });
  }

  await k.save(OUT);
})();
