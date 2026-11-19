// 쥐 해적 아웃게임 강화 시스템 기획서 PPT → Pirat_Plan/아웃게임/쥐해적_아웃게임강화기획서.pptx
// 원본: Pirat_Plan/아웃게임/아웃게임 강화 시스템 기획서.md (사용자 컨펌본)
// 사용: NODE_PATH=<pptxgenjs · sharp · jszip 설치 폴더>/node_modules node Pirat_Plan/art/build_outgame_ppt.js
const path = require('path');
const { kit, C, W, H, X0, CW } = require('./ppt_kit');

const OUT = path.join(__dirname, '..', '아웃게임', '쥐해적_아웃게임강화기획서.pptx');
const k = kit('쥐 해적 · 아웃게임 강화 시스템 기획서');
const { pres } = k;

const KIND = { galley: '갤리선', caravel: '캐러벨', clipper: '클리퍼', paddle: '외륜 증기선', torpedo: '어뢰정', missile: '미사일 고속정', carrack: '캐랙', frigate: '프리깃', steamfrigate: '증기 프리깃', cruiser: '방호 순양함', submarine: '잠수함', galleon: '갤리온', ofline: '전열함', ironclad: '철갑함', dreadnought: '드레드노트', carrier: '항공모함' };
const ROWS = { S: ['caravel', 'clipper', 'paddle', 'torpedo', 'missile'], M: ['carrack', 'frigate', 'steamfrigate', 'cruiser', 'submarine'], H: ['galleon', 'ofline', 'ironclad', 'dreadnought', 'carrier'] };
const ERAS = ['고대', '대항해시대', '범선 전성기', '증기선 시대', '강철 군함', '현대'];
const TIER_COL = ['B9A58A', '9FC37A', '7FC7D8', '8FA2FF', 'D68CFF', 'FF8FA8'];
const GRADE_COL = ['C9D2DC', '7FD88A', '6FB8FF', 'FFB84D'];

async function main() {
  await k.load(['crop/port_169.jpg', 'crop/port.jpg', 'crop/port_sea.jpg', 'crop/port_ship.jpg', 'crop/port_gear.jpg', 'crop/port_lab.jpg',
    ...Object.keys(KIND).map((s) => `ship_${s}_0.png`), ...[...Array(6).keys()].flatMap((i) => [`cut/capt_${i}.png`, `cut/wright_${i}.png`]),
    ...[...Array(9).keys()].flatMap((i) => [`parts_a_${i}.png`, `parts_u_${i}.png`]),
    'ui_icons_1.png', 'items_0.png', 'items_1.png', 'ui_icons_3.png', 'ui_icons_5.png', 'ui_icons_6.png', 'ui_icons_7.png', 'ui_icons_8.png', 'ui_hud_9.png', 'ui_hud_10.png', 'ui_hud_15.png', 'ui_hud_14.png', 'ui_hud_2.png']);

  // 1. 표지
  {
    const s = pres.addSlide({ masterName: 'COVER' });
    k.img(s, 'crop/port_169.jpg', 0, 0, W, H);
    k.card(s, 0.6, 0.6, 6.2, 3.1, { fill: C.navy, tr: 12, flat: true });
    k.text(s, '쥐 해적 · 시스템 기획서', 0.95, 0.9, 5.5, 0.4, { size: 15, bold: true, color: C.cheese });
    k.text(s, '아웃게임 강화\n시스템 기획서', 0.95, 1.35, 5.6, 1.5, { size: 38, bold: true, color: C.card, ls: 1.05 });
    k.text(s, '작성자  정승운      2026.10.30      v1.0', 0.95, 3.05, 5.5, 0.4, { size: 13, bold: true, color: 'D6E4EE' });
  }

  // 2. 개요
  {
    const s = k.slide('개요', '인게임 재화로 함선 · 장비를 강화하여 다음 스테이지 돌파', '함선 강화는 테크 트리 구매 방식만 사용, 같은 함선의 레벨 강화 없음');
    const flow = ['출항', '재화 획득', '함선 구매 · 조선소 의뢰', '함선 단계 상승', '상위 티어 장비 등장', '다음 스테이지'];
    const fw = 1.83, fg = (CW - 6 * fw) / 5;
    flow.forEach((t, i) => {
      const x = X0 + i * (fw + fg);
      k.chip(s, t, x, 1.85, fw, 0.6, i % 2 ? C.navy : C.sea, C.card, 12);
      if (i < 5) k.arrow(s, x + fw + 0.03, 2.15, x + fw + fg - 0.03, 2.15);
    });
    const intent = [
      ['items_1.png', '재화 → 강화', '인게임에서 모은 재화로 항구에서 함선과 장비를 강화하여 다음 스테이지 돌파'],
      ['ship_ironclad_0.png', '눈에 보이는 성장', '실제 배 발전 순서대로 함선이 바뀌어 성장을 눈으로 체감'],
      ['ui_hud_9.png', '전략적 선택', '스테이지마다 적 · 맵 특성이 상이 → 테크가 다른 함선 · 장비를 골라 출항하는 전략적 선택 부여'],
    ];
    const cw = (CW - 0.4) / 3;
    intent.forEach(([ic, h, b], i) => {
      const x = X0 + i * (cw + 0.2), y = 2.85;
      k.card(s, x, y, cw, 3.9);
      k.well(s, x + 0.2, y + 0.2, cw - 0.4, 1.6);
      k.img(s, ic, x + 0.4, y + 0.3, cw - 0.8, 1.4);
      k.badge(s, i + 1, x + 0.25, y + 2.0, 0.42);
      k.text(s, h, x + 0.8, y + 2.0, cw - 1.0, 0.42, { size: 17, bold: true, valign: 'middle' });
      k.text(s, b, x + 0.25, y + 2.6, cw - 0.5, 1.2, { size: 13, color: C.muted, ls: 1.2 });
    });
  }

  // 3. 항구 화면
  {
    const s = k.slide('개요 · 항구 화면', '아웃게임은 항구 4개 탭으로 구성', '함선 요약 수치 (선체 · 속도 · 측면 대포 · 장전 · 화력 · 받는 피해) 상시 표시');
    const tabs = [['port_sea', '출항', '스테이지 지도 · 추천 함선 단계 · 스토리'], ['port_ship', '조선소', '함선 테크 트리, 함선 구매 · 교체, 수치 미리보기'], ['port_gear', '장비', '함선별 슬롯 장착 · 해제, 장착 전후 수치 비교, 장착 불가 사유 표시'], ['port_lab', '의뢰 · 합성', '제작 의뢰 · 합성 · 티어 업 · 분해, 조선공 쥐 망치질 연출']];
    const tw = (CW - 0.3) / 2;
    tabs.forEach(([f, n, d], i) => {
      const x = X0 + (i % 2) * (tw + 0.3), y = 1.85 + Math.floor(i / 2) * 2.5;
      k.card(s, x, y, tw, 2.35);
      const iw = 3.4, ih = iw * 9 / 16;
      k.img(s, `crop/${f}.jpg`, x + 0.18, y + 0.22, iw, ih);
      k.chip(s, n, x + iw + 0.4, y + 0.35, 1.5, 0.38, C.navy, C.card, 12);
      k.text(s, d, x + iw + 0.4, y + 0.9, tw - iw - 0.6, 1.3, { size: 13, ls: 1.25 });
    });
  }

  // 4. 함선 강화 · 세부 시스템
  {
    const s = k.slide('함선 강화', '현실 배 발전 순서를 따라가는 테크 트리', '수집의 재미 + 외형의 변화로 피드백 전달, 테크별 전투 방식 변화로 선택의 재미 전달');
    const lw = 5.3;
    k.card(s, X0, 1.85, lw, 4.9);
    k.text(s, '구매 규칙', X0 + 0.3, 2.05, lw - 0.6, 0.4, { size: 17, bold: true });
    const rules = [['6시대 × 3테크', '시작 함선 갤리선에서 3테크로 분기'], ['구매 조건', '이전 단계 함선 보유 시 다음 함선 구매 (목재 + 치즈 금화)'], ['보유 · 교체', '구매한 함선은 계속 보유, 출항 전 자유 교체'], ['판매 불가', '판매 · 환불 없음'], ['공용 장비', '갤리선 장비는 모든 테크에 장착 가능']];
    rules.forEach(([h, b], i) => {
      const y = 2.6 + i * 0.8;
      k.chip(s, h, X0 + 0.3, y, 1.55, 0.36, C.navy, C.card, 11);
      k.text(s, b, X0 + 2.0, y - 0.04, lw - 2.25, 0.7, { size: 12, ls: 1.15 });
    });
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    k.text(s, '함선 단계가 오를수록', rx, 1.85, rw, 0.4, { size: 17, bold: true });
    const ups = [['ui_icons_8.png', '기본 수치 상승', '선체 · 측면 대포 수 등'], ['parts_a_8.png', '장비 슬롯 증가', '예: 갤리선 3칸 → 현대 함선 7칸'], ['ui_icons_3.png', '자동 무기 추가', '증기선 = 선수포, 강철 군함 = 어뢰, 현대 = 유도탄 · 함재기'], ['ui_hud_15.png', '장착 가능 장비 티어 확장', '상위 티어 장비 장착 · 의뢰 등장']];
    ups.forEach(([ic, h, b], i) => {
      const y = 2.35 + i * 0.75;
      k.iconRow(s, ic, h, b, rx, y, rw, { d: 0.6, bh: 0.35 });
    });
    // 시대별 함선 외형 띠
    const ew = rw / 6;
    ['galley', 'galleon', 'frigate', 'paddle', 'dreadnought', 'carrier'].forEach((sh, i) => {
      const x = rx + i * ew;
      k.well(s, x + 0.04, 5.45, ew - 0.08, 1.3, 'E6EEF5');
      k.img(s, `ship_${sh}_0.png`, x + 0.1, 5.55, ew - 0.2, 0.75);
      k.chip(s, ERAS[i], x + 0.1, 6.37, ew - 0.2, 0.27, TIER_COL[i], C.ink, 9);
    });
  }

  // 5. 테크 · 시대 구성
  {
    const s = k.slide('함선 강화 · 테크 구성 예시', '같은 시대라도 테크별로 전투 방식 변화', '함선 목록 · 가격은 예시 (확정은 배 테이블), 시대가 오를수록 가격 큰 폭 상승');
    const lx = X0, lw = 1.9, ex = lx + lw + 0.15, ew = (W - X0 - ex) / 6;
    ERAS.forEach((e, i) => k.chip(s, `${i} ${e}`, ex + i * ew + 0.08, 1.82, ew - 0.16, 0.32, TIER_COL[i], C.ink, 10));
    const lines = [['S', '쾌속선', '빠른 속도 · 선회\n박치기 · 선수포 · 어뢰 · 유도탄', C.sea], ['M', '다목적함', '균형형\n체인샷 · 화염탄 · 폭격 · 선원', C.green], ['H', '중포함', '느리지만 튼튼함\n측면 대포 수 · 피해 감소 · 함재기', C.red]];
    const rh = 1.32, ry0 = 2.3, cardW = ew - 0.16;
    const cell = (sh, col, row) => {
      const x = ex + col * ew + 0.08, y = ry0 + row * (rh + 0.15);
      k.card(s, x, y, cardW, rh);
      k.img(s, `ship_${sh}_0.png`, x + 0.1, y + 0.12, cardW - 0.2, 0.75);
      k.text(s, KIND[sh], x, y + 0.92, cardW, 0.3, { size: 11, bold: true, align: 'center' });
      return [x, y];
    };
    lines.forEach(([key, n, d, col], r) => {
      const y = ry0 + r * (rh + 0.15);
      k.card(s, lx, y, lw, rh, { fill: col });
      k.text(s, n, lx + 0.15, y + 0.1, lw - 0.3, 0.35, { size: 15, bold: true, color: C.card });
      k.text(s, d, lx + 0.15, y + 0.5, lw - 0.3, 0.75, { size: 10, color: 'F1F4F7', ls: 1.15 });
      ROWS[key].forEach((sh, i) => {
        cell(sh, i + 1, r);
        if (i < 4) k.line(s, ex + (i + 2) * ew - 0.08, y + rh / 2, ex + (i + 2) * ew + 0.08, y + rh / 2);
      });
    });
    const [gx, gy] = cell('galley', 0, 1), mx = ex + ew;
    k.line(s, gx + cardW, gy + rh / 2, mx, gy + rh / 2);
    k.line(s, mx, ry0 + rh / 2, mx, ry0 + 2 * (rh + 0.15) + rh / 2);
    for (let r = 0; r < 3; r++) k.line(s, mx, ry0 + r * (rh + 0.15) + rh / 2, mx + 0.08, ry0 + r * (rh + 0.15) + rh / 2);
    k.chip(s, '공용 시작 함선', gx + cardW / 2 - 0.62, gy - 0.18, 1.24, 0.26, C.cheese, C.navy, 9);
    k.text(s, '가격 예시: 1시대 목재 30 · 금화 50   ·   5시대 목재 700 · 금화 1400', X0, 6.75, CW, 0.3, { size: 11, color: C.muted, align: 'center' });
  }

  // 6. 장비 · 세부 시스템
  {
    const s = k.slide('장비', '함선마다 다른 슬롯 구성으로 함선 개성 형성', '등급이 높을수록 수치 상승을 넘어 플레이 방식을 바꾸는 고유 효과 부여');
    const parts = ['티어', '장착 가능 테크', '등급'];
    k.text(s, '장비 =', X0, 1.9, 1.1, 0.5, { size: 18, bold: true, valign: 'middle' });
    parts.forEach((t, i) => { const x = X0 + 1.1 + i * 2.3; k.chip(s, t, x, 1.92, 1.9, 0.46, C.sea, C.card, 13); if (i < 2) k.text(s, '+', x + 1.9, 1.92, 0.4, 0.46, { size: 18, bold: true, align: 'center', valign: 'middle' }); });
    const cond = ['보유 함선', '해당 슬롯 보유', '테크 일치', '함선 단계 ≥ 장비 티어'];
    k.card(s, X0, 2.65, CW, 1.15);
    k.text(s, '장착 조건', X0 + 0.3, 2.65, 1.4, 1.15, { size: 14, bold: true, color: C.sea, valign: 'middle' });
    cond.forEach((t, i) => { const x = X0 + 1.8 + i * 2.55; k.chip(s, t, x, 2.98, 2.2, 0.46, C.navy, C.card, 12); if (i < 3) k.text(s, '+', x + 2.2, 2.98, 0.35, 0.46, { size: 16, bold: true, align: 'center', valign: 'middle' }); });
    const cols = [
      ['일반 · 고급', ['parts_a_0.png', 'parts_a_1.png', 'parts_a_2.png', 'parts_a_4.png'], ['함선마다 슬롯별로 그 함선 기술 이름의 장비', '예: 갤리선 "청동 소포", 드레드노트 "14인치 주포"', '수치 = 슬롯별 기본 틀 × 티어 배율']],
      ['희귀 · 전설', ['parts_u_0.png', 'parts_u_3.png', 'parts_u_5.png', 'parts_u_6.png'], ['함선마다 고유 장비, 일부는 다른 테크에도 장착', '예: 클리퍼 "쇠뿔 생쥐 선수상" = 박치기', '항공모함 "하늘 치즈성 문장" = 함재기']],
    ];
    const cw = (CW - 0.3) / 2;
    cols.forEach(([h, icons, lines], i) => {
      const x = X0 + i * (cw + 0.3), y = 4.05;
      k.card(s, x, y, cw, 2.7);
      k.text(s, h, x + 0.3, y + 0.2, 3, 0.4, { size: 16, bold: true });
      icons.forEach((f, j) => { k.well(s, x + 0.3 + j * 0.75, y + 0.72, 0.65, 0.65, i ? 'FFF1D6' : C.well); k.img(s, f, x + 0.35 + j * 0.75, y + 0.77, 0.55, 0.55); });
      k.text(s, lines.map((t, n) => ({ text: t, options: { bullet: true, breakLine: n < lines.length - 1 } })), x + 3.4, y + 0.6, cw - 3.6, 1.9, { size: 12, gap: 6, ls: 1.15 });
    });
  }

  // 7. 슬롯 · 등급
  {
    const s = k.slide('장비 · 슬롯 / 등급 예시', '슬롯은 올리는 수치, 등급은 효과의 깊이', '낮은 티어 장비는 상위 함선에 장착 가능, 장비 1개당 함선 1척 (이동 가능)');
    const slots = [['대포', '포탄 위력 · 장전'], ['돛 · 기관', '속도 · 선회'], ['선체 장갑', '선체 · 수리량'], ['키', '선회 · 줍기 거리'], ['망원경', '치명타 · 사거리 · 시야'], ['선수상', '박치기 · 금화 획득량'], ['박격포', '폭격 위력 · 범위'], ['특수탄 창고', '특수탄 재사용 · 위력'], ['선원실', '최대 선원 · 구조 시 수리']];
    const sw = (CW - 8 * 0.1) / 9;
    slots.forEach(([n, d], i) => {
      const x = X0 + i * (sw + 0.1), y = 1.85;
      k.card(s, x, y, sw, 2.2);
      k.img(s, `parts_a_${i}.png`, x + 0.2, y + 0.15, sw - 0.4, 0.8);
      k.text(s, n, x + 0.05, y + 1.02, sw - 0.1, 0.3, { size: 12, bold: true, align: 'center' });
      k.text(s, d, x + 0.08, y + 1.36, sw - 0.16, 0.8, { size: 10, color: C.muted, align: 'center', ls: 1.15 });
    });
    const grades = [['일반', 'parts_a_0.png', '수치 하나 상승', '포탄 위력 상승'], ['고급', 'parts_a_1.png', '상승폭 증가 또는 두 가지 동시 상승', '위력 + 장전 동시 상승'], ['희귀', 'parts_u_0.png', '고유 효과 부여', '착탄 지점 폭발 · 확률 화염 · 확률 체인샷'], ['전설', 'parts_u_3.png', '플레이 방식 변화', '일제 사격 추가 발사 · 격침 시 회복 · 함재기 추가']];
    const gw = (CW - 0.6) / 4;
    grades.forEach(([n, ic, d, ex], i) => {
      const x = X0 + i * (gw + 0.2), y = 4.3;
      k.card(s, x, y, gw, 2.45);
      s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.22, w: 0.95, h: 0.95, fill: { color: GRADE_COL[i] }, line: { color: GRADE_COL[i] } });
      k.img(s, ic, x + 0.3, y + 0.3, 0.8, 0.8);
      k.text(s, n, x + 1.35, y + 0.28, gw - 1.5, 0.4, { size: 18, bold: true });
      k.text(s, d, x + 1.35, y + 0.72, gw - 1.5, 0.5, { size: 11, color: C.muted });
      k.text(s, '예시', x + 0.22, y + 1.35, 1, 0.25, { size: 10, bold: true, color: C.sea });
      k.text(s, ex, x + 0.22, y + 1.62, gw - 0.44, 0.75, { size: 12, ls: 1.15 });
    });
  }

  // 8. 조선소 의뢰
  {
    const s = k.slide('조선소 의뢰', '상점 없이 조선공 쥐에게 맡기는 장비 제작', '투입 재화를 직접 선택, 확률 전부 공개 → 뽑기 거부감 완화. 현금 결제 · 천장 없음');
    const lw = 3.3;
    k.card(s, X0, 1.85, lw, 4.9);
    k.well(s, X0 + 0.2, 2.05, lw - 0.4, 2.3, 'E6EEF5');
    k.img(s, 'cut/wright_2.png', X0 + 0.4, 2.15, lw - 0.8, 2.1);
    const rules = ['투입 금화를 슬라이더로 결정 (예: 30 ~ 600)', '목재는 금화의 일정 비율 함께 소모', '의뢰 비용은 함선 단계에 따라 상승', '보유 함선에 장착 가능한 장비만 등장'];
    k.text(s, rules.map((t, n) => ({ text: t, options: { bullet: true, breakLine: n < rules.length - 1 } })), X0 + 0.25, 4.5, lw - 0.45, 2.2, { size: 12, gap: 6, ls: 1.15 });
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    k.card(s, rx, 1.85, rw, 3.35);
    k.text(s, '투입 금화별 등급 확률 (예시)', rx + 0.3, 1.98, rw - 0.6, 0.35, { size: 14, bold: true });
    const odds = [[70, 25, 4.5, 0.5], [45, 38, 14, 3], [25, 40, 27, 8], [10, 35, 38, 17]];
    const labels = ['금화 30', '금화 100', '금화 250', '금화 600'];
    const data = ['일반', '고급', '희귀', '전설'].map((n, g) => ({ name: n, labels, values: odds.map((o) => o[g]) }));
    s.addChart(pres.charts.BAR, data, {
      x: rx + 0.2, y: 2.35, w: rw - 0.4, h: 2.75, barDir: 'bar', barGrouping: 'stacked', chartColors: GRADE_COL,
      showLegend: true, legendPos: 't', legendFontFace: '+mn-lt', legendFontSize: 11, legendColor: C.ink,
      showValue: true, dataLabelPosition: 'ctr', dataLabelFormatCode: 'General"%"', dataLabelFontSize: 10, dataLabelFontFace: '+mn-lt', dataLabelColor: C.ink,
      catAxisLabelFontFace: '+mn-lt', catAxisLabelFontSize: 11, catAxisLabelColor: C.ink, catAxisOrientation: 'maxMin',
      valAxisHidden: true, valAxisMaxVal: 100, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    });
    k.card(s, rx, 5.4, rw, 1.35);
    k.text(s, '장비 티어 등장 확률 (예시) · 현재 함선 단계 기준', rx + 0.3, 5.52, rw - 0.6, 0.3, { size: 13, bold: true });
    const tiers = [['현재 단계', '60%', C.navy], ['한 단계 아래', '25%', C.sea], ['두 단계 아래', '10%', '7FA7C4'], ['그 아래', '5%', 'B8C3CC']];
    const tw = (rw - 0.6 - 0.45) / 4;
    tiers.forEach(([n, p, col], i) => { const x = rx + 0.3 + i * (tw + 0.15); k.chip(s, `${n}  ${p}`, x, 6.0, tw, 0.42, col, C.card, 12); });
  }

  // 9. 합성 · 티어 업 · 분해
  {
    const s = k.slide('합성 · 티어 업 · 분해', '필요 없는 장비를 재료로 재활용', '뽑기 실패 부담 완화, 함선 단계 상승마다 새 도전 목표 발생. 장착 중인 장비는 재료 사용 불가');
    const cw = (CW - 0.4) / 3, y = 1.85, h = 4.9;
    // 합성
    {
      const x = X0;
      k.card(s, x, y, cw, h);
      k.badge(s, 1, x + 0.25, y + 0.25, 0.42); k.text(s, '합성', x + 0.8, y + 0.25, 2, 0.42, { size: 18, bold: true, valign: 'middle' });
      for (let j = 0; j < 3; j++) { k.well(s, x + 0.35 + j * 0.85, y + 1.0, 0.75, 0.75, 'E6EEF5'); k.img(s, 'parts_a_0.png', x + 0.42 + j * 0.85, y + 1.07, 0.61, 0.61); }
      k.arrow(s, x + 0.35 + 3 * 0.85, y + 1.37, x + 0.35 + 3 * 0.85 + 0.4, y + 1.37, C.cheese, 2);
      k.well(s, x + cw - 1.05, y + 0.95, 0.85, 0.85, 'DDF3DF'); k.img(s, 'parts_a_0.png', x + cw - 0.98, y + 1.02, 0.71, 0.71);
      k.text(s, '같은 티어 · 같은 등급 3개\n→ 한 등급 위 1개', x + 0.3, y + 2.1, cw - 0.6, 0.9, { size: 14, bold: true, align: 'center', ls: 1.2 });
      k.text(s, '일반 → 고급 → 희귀 → 전설', x + 0.3, y + 3.2, cw - 0.6, 0.4, { size: 12, color: C.muted, align: 'center' });
      GRADE_COL.forEach((c, g) => k.chip(s, ['일반', '고급', '희귀', '전설'][g], x + 0.3 + g * ((cw - 0.6) / 4), y + 3.75, (cw - 0.6) / 4 - 0.08, 0.32, c, C.ink, 10));
    }
    // 티어 업
    {
      const x = X0 + cw + 0.2;
      k.card(s, x, y, cw, h);
      k.badge(s, 2, x + 0.25, y + 0.25, 0.42); k.text(s, '티어 업', x + 0.8, y + 0.25, 2, 0.42, { size: 18, bold: true, valign: 'middle' });
      k.img(s, 'ui_hud_15.png', x + cw / 2 - 0.45, y + 0.9, 0.9, 0.9);
      k.text(s, '같은 티어 전설 여러 개\n→ 한 티어 위 전설', x + 0.3, y + 2.1, cw - 0.6, 0.9, { size: 14, bold: true, align: 'center', ls: 1.2 });
      const ch = [['3개', '35%'], ['4개', '50%'], ['5개', '65%'], ['6개', '80%']];
      const bw = (cw - 0.6 - 0.3) / 4;
      ch.forEach(([n, p], j) => { const bx = x + 0.3 + j * (bw + 0.1); k.chip(s, n, bx, y + 3.15, bw, 0.32, C.navy, C.card, 10); k.text(s, p, bx, y + 3.52, bw, 0.35, { size: 14, bold: true, align: 'center', color: C.sea }); });
      k.text(s, '실패 시 같은 티어 전설 1개만 반환\n한 단계 위 함선 보유 시 도전 가능', x + 0.3, y + 4.0, cw - 0.6, 0.8, { size: 11, color: C.muted, align: 'center', ls: 1.2 });
    }
    // 분해
    {
      const x = X0 + 2 * (cw + 0.2);
      k.card(s, x, y, cw, h);
      k.badge(s, 3, x + 0.25, y + 0.25, 0.42); k.text(s, '분해', x + 0.8, y + 0.25, 2, 0.42, { size: 18, bold: true, valign: 'middle' });
      k.well(s, x + 0.45, y + 0.95, 0.85, 0.85, 'E6EEF5'); k.img(s, 'parts_u_6.png', x + 0.52, y + 1.02, 0.71, 0.71);
      k.arrow(s, x + 1.4, y + 1.37, x + 1.85, y + 1.37, C.cheese, 2);
      k.img(s, 'ui_icons_1.png', x + 1.95, y + 1.0, 0.75, 0.75); k.img(s, 'items_0.png', x + 2.75, y + 1.0, 0.75, 0.75);
      k.text(s, '장비 1개 → 목재 + 치즈 금화\n일부 회수', x + 0.3, y + 2.1, cw - 0.6, 0.9, { size: 14, bold: true, align: 'center', ls: 1.2 });
      const notes = ['회수량은 등급 · 티어에 비례', '높은 등급 · 티어일수록 많이 회수', '의뢰 비용보다 적게 회수 → 의뢰 반복이 이득이 되지 않게 조정'];
      k.text(s, notes.map((t, n) => ({ text: t, options: { bullet: true, breakLine: n < notes.length - 1 } })), x + 0.3, y + 3.15, cw - 0.6, 1.6, { size: 12, gap: 5, ls: 1.15 });
    }
  }

  // 10. 재화
  {
    const s = k.slide('재화', '목재 · 치즈 금화 두 가지로 순환', '선원은 인게임 전용 (출항 종료 시 초기화), 아웃게임 재화 아님');
    const cur = [['ui_icons_1.png', '목재', '격침 · 보물상자 · 장비 분해', '함선 구매 · 조선소 의뢰'], ['items_0.png', '치즈 금화', '격침 · 보물상자 · 콤보 · 장비 분해', '함선 구매 · 조선소 의뢰']];
    const cw = 3.5;
    cur.forEach(([ic, n, get, use], i) => {
      const x = X0 + i * (cw + 0.2), y = 1.85;
      k.card(s, x, y, cw, 4.9);
      k.img(s, ic, x + cw / 2 - 0.6, y + 0.3, 1.2, 1.2);
      k.text(s, n, x + 0.2, y + 1.65, cw - 0.4, 0.45, { size: 20, bold: true, align: 'center' });
      k.text(s, '얻는 곳', x + 0.3, y + 2.35, cw - 0.6, 0.3, { size: 11, bold: true, color: C.sea });
      k.text(s, get, x + 0.3, y + 2.68, cw - 0.6, 0.7, { size: 13, ls: 1.15 });
      k.text(s, '쓰는 곳', x + 0.3, y + 3.55, cw - 0.6, 0.3, { size: 11, bold: true, color: C.red });
      k.text(s, use, x + 0.3, y + 3.88, cw - 0.6, 0.7, { size: 13, ls: 1.15 });
    });
    const rx = X0 + 2 * (cw + 0.2) + 0.1, rw = W - X0 - rx;
    k.text(s, '항해 결과', rx, 1.85, rw, 0.4, { size: 17, bold: true });
    const res = [['클리어', '모은 재화 전부 획득 + 다음 스테이지 개방', C.green], ['침몰', '모은 재화 절반 회수', C.red]];
    res.forEach(([h, b, col], i) => {
      const y = 2.4 + i * 1.15;
      k.card(s, rx, y, rw, 1.0);
      k.chip(s, h, rx + 0.25, y + 0.3, 1.1, 0.4, col, C.card, 13);
      k.text(s, b, rx + 1.55, y, rw - 1.75, 1.0, { size: 14, valign: 'middle' });
    });
    k.card(s, rx, 4.85, rw, 1.9, { fill: C.tint, flat: true });
    k.iconRow(s, 'parts_u_5.png', '재화 수급 빌드', '금화 · 목재 보너스 장비로 재화 수급 위주 빌드 가능 (예: 황금 쥐 선수상)', rx + 0.3, 5.15, rw - 0.6, { d: 0.75, ring: 'FFF1D6', bh: 0.9 });
  }

  // 11. 데이터 테이블
  {
    const s = k.slide('데이터 테이블', '테이블 명세', '확정 수치는 Pirat_Table 엑셀로 관리, 기획서 수치는 예시');
    const books = [
      ['배 테이블.xlsx', C.sea, [['Ship', '함선별 테크 · 시대 · 가격 · 슬롯 · 기본 수치 · 자동 무기'], ['Base_Stat', '함선 기본 수치'], ['Line / Tier', '테크 · 시대 정의'], ['Slot_Type', '장비 슬롯 9종']]],
      ['장비 테이블.xlsx', C.navy, [['Equipment', '장비별 등급 · 티어 · 장착 테크 · 효과'], ['Grade', '등급 4종'], ['Request_Odds / Tier_Odds', '의뢰 등급 · 티어 확률'], ['Up_Chance / Equip_Config', '티어 업 확률 · 의뢰 설정'], ['Dismantle', '등급 · 티어별 분해 회수 재화']]],
    ];
    const cw = (CW - 0.3) / 2;
    books.forEach(([n, col, sheets], i) => {
      const x = X0 + i * (cw + 0.3), y = 1.85;
      k.card(s, x, y, cw, 4.15);
      k.chip(s, n, x + 0.3, y + 0.3, cw - 0.6, 0.45, col, C.card, 13);
      sheets.forEach(([sh, d], j) => {
        const yy = y + 1.0 + j * 0.65;
        k.text(s, sh, x + 0.35, yy, 2.4, 0.5, { size: 12, bold: true, color: col, valign: 'middle' });
        k.text(s, d, x + 2.8, yy, cw - 3.1, 0.5, { size: 12, valign: 'middle' });
      });
    });
    k.card(s, X0, 6.2, CW, 0.6, { fill: C.tint, flat: true });
    k.text(s, [{ text: '분해 회수량 초안  ', options: { bold: true, color: C.sea } }, { text: '등급 기본값 × (1 + 0.6 × 티어), 의뢰 비용보다 적게 회수되도록 조정' }], X0 + 0.3, 6.2, CW - 0.6, 0.6, { size: 13, valign: 'middle' });
  }

  await k.save(OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
