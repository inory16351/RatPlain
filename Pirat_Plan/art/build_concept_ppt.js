// 쥐 해적 컨셉 기획서 PPT 생성 → Pirat_Plan/쥐해적_컨셉기획서.pptx
// 사용: NODE_PATH=<pptxgenjs · sharp 설치 폴더>/node_modules node Pirat_Plan/art/build_concept_ppt.js
// 그림: art/crop (캡처 · Codex 그림), art/cut (캐릭터), pirate/art/sprites (게임 스프라이트)
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const ART = __dirname;
const SPR = path.join(ART, '..', '..', 'pirate', 'art', 'sprites');
const OUT = path.join(ART, '..', '쥐해적_컨셉기획서.pptx');
const P = (f) => (f.includes('/') ? path.join(ART, f) : path.join(SPR, f));

const FONT = 'Noto Sans KR';
const C = { navy: '13293D', deep: '0B1B29', cheese: 'F2B829', red: 'B5402F', sea: '2F7FAE', ink: '1E2B37', muted: '5F6F7C', bg: 'F3F6F9', card: 'FFFFFF', line: 'DCE3EA', tint: 'E3ECF3' };
const W = 13.333, H = 7.5, X0 = 0.6, CW = W - 2 * X0;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = '정승운';
pres.title = '쥐 해적 — 바다 정복 (가제) 컨셉 기획서';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: C.bg },
  objects: [
    { text: { text: '쥐 해적 — 바다 정복 · 컨셉 기획서', options: { x: X0, y: 7.02, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', margin: 0 } } },
    { placeholder: { options: { name: 'kicker', type: 'body', x: X0, y: 0.32, w: 8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.sea, margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: X0, y: 0.6, w: CW, h: 0.62, fontFace: FONT, fontSize: 28, bold: true, color: C.ink, margin: 0, valign: 'middle' }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: X0, y: 1.22, w: CW, h: 0.36, fontFace: FONT, fontSize: 14, color: C.muted, margin: 0 }, text: '' } },
  ],
  slideNumber: { x: W - X0 - 0.5, y: 7.02, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', align: 'right' },
});
pres.defineSlideMaster({ title: 'COVER', background: { color: C.deep } });

const dims = {};
async function loadDims(files) { for (const f of files) { const m = await sharp(P(f)).metadata(); dims[f] = [m.width, m.height]; } }

// 그림: contain = 틀 안에 비율 유지 가운데, cover = 틀을 꽉 채우고 잘라냄
function img(s, f, x, y, w, h, o = {}) {
  const [iw, ih] = dims[f];
  if (o.cover) return s.addImage({ path: P(f), x, y, w, h, sizing: { type: 'cover', w, h }, shadow: o.shadow ? shadow() : undefined, objectName: o.name });
  const k = Math.min(w / iw, h / ih), ww = iw * k, hh = ih * k;
  const ax = o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5;
  s.addImage({ path: P(f), x: x + (w - ww) * ax, y: y + (h - hh) / 2, w: ww, h: hh, shadow: o.shadow ? shadow() : undefined, objectName: o.name });
}
const shadow = () => ({ type: 'outer', color: '000000', opacity: 0.16, blur: 6, offset: 2, angle: 90 });
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.card }, line: { color: o.line || o.fill || C.card, width: 0.75 }, shadow: o.flat ? undefined : shadow() });
}
function text(s, t, x, y, w, h, o = {}) {
  s.addText(t, { x, y, w, h, fontFace: FONT, fontSize: o.size || 13, color: o.color || C.ink, bold: !!o.bold, align: o.align || 'left', valign: o.valign || 'top', margin: o.margin ?? 0, isTextBox: true, paraSpaceAfter: o.gap || 0, lineSpacingMultiple: o.ls || 1.05, fit: 'none' });
}
// 숫자 동그라미 (모티프)
function badge(s, n, x, y, d = 0.42, fill = C.cheese, color = C.navy) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  text(s, String(n), x, y, d, d, { size: d > 0.4 ? 15 : 11, bold: true, color, align: 'center', valign: 'middle' });
}
function chip(s, t, x, y, w, h, fill, color = C.card, size = 11) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { color: fill } });
  text(s, t, x, y, w, h, { size, bold: true, color, align: 'center', valign: 'middle' });
}
function arrow(s, x1, y1, x2, y2, color = '9AAAB8', w = 1.5) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1, line: { color, width: w, endArrowType: 'triangle' } });
}
function line(s, x1, y1, x2, y2, color, w = 1.5) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipV: (y2 < y1) !== (x2 < x1), line: { color, width: w } });
}
function slide(kicker, title, sub) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  s.addText(kicker, { placeholder: 'kicker' });
  s.addText(title, { placeholder: 'title', align: 'left' });
  if (sub) s.addText(sub, { placeholder: 'sub' });
  return s;
}
// 아이콘 + 굵은 제목 + 설명 한 줄 (행)
function iconRow(s, icon, head, body, x, y, w, o = {}) {
  const d = o.d || 0.62;
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: o.ring || C.tint }, line: { color: o.ring || C.tint } });
  img(s, icon, x + d * 0.14, y + d * 0.14, d * 0.72, d * 0.72);
  text(s, head, x + d + 0.18, y - 0.02, w - d - 0.18, 0.34, { size: o.hs || 14, bold: true });
  text(s, body, x + d + 0.18, y + 0.32, w - d - 0.18, o.bh || 0.6, { size: o.bs || 12, color: C.muted });
}

const SHIP_ROWS = {
  S: ['caravel', 'clipper', 'paddle', 'torpedo', 'missile'],
  M: ['carrack', 'frigate', 'steamfrigate', 'cruiser', 'submarine'],
  H: ['galleon', 'ofline', 'ironclad', 'dreadnought', 'carrier'],
};
const KIND = { galley: '갤리선', caravel: '캐러벨', clipper: '클리퍼', paddle: '외륜 증기선', torpedo: '어뢰정', missile: '미사일 고속정', carrack: '캐랙', frigate: '프리깃', steamfrigate: '증기 프리깃', cruiser: '방호 순양함', submarine: '잠수함', galleon: '갤리온', ofline: '전열함', ironclad: '철갑함', dreadnought: '드레드노트', carrier: '항공모함' };
const ERAS = ['고대', '대항해시대', '범선 전성기', '증기선 시대', '강철 군함', '현대'];
const TIER_COL = ['B9A58A', '9FC37A', '7FC7D8', '8FA2FF', 'D68CFF', 'FF8FA8'];

async function main() {
  const crops = ['key_art', 'story', 'factions', 'port', 'battle_boss', 'battle_whirl', 'port_sea', 'port_ship', 'port_gear', 'port_lab', 'fun_drive', 'fun_combo', 'fun_crew', 'fun_sea', 'fun_evo', 'trait_fog', 'trait_storm', 'trait_whirl', 'crew_zoom'].map((f) => `crop/${f}.jpg`);
  const cuts = ['capt_0', 'capt_1', 'capt_2', 'capt_3', 'capt_4', 'capt_5', 'wright_3'].map((f) => `cut/${f}.png`);
  const ships = Object.keys(KIND).map((k) => `ship_${k}_0.png`);
  const sprites = ['ui_icons_1.png', 'ui_icons_2.png', 'ui_icons_3.png', 'ui_icons_5.png', 'ui_icons_6.png', 'ui_icons_7.png', 'ui_icons_8.png', 'items_0.png', 'items_1.png', 'items_2.png', 'items_3.png',
    'ui_hud_0.png', 'ui_hud_1.png', 'ui_hud_3.png', 'ui_hud_8.png', 'ui_hud_9.png', 'ui_hud_10.png', 'ui_hud_15.png',
    'e_cat_sloop_0.png', 'e_cat_frigate_0.png', 'e_cat_speeder_0.png', 'e_cat_mortar_0.png', 'e_cat_ironclad_0.png', 'e_rat_rival_0.png', 'e_shark_0.png', 'shark_fin_0.png',
    'boss_rival_0.png', 'boss_megashark_0.png', 'boss_admiral_0.png', 'boss_fortress_0.png',
    ...[...Array(9).keys()].map((i) => `parts_a_${i}.png`), 'parts_u_0.png', 'parts_u_3.png'];
  await loadDims([...crops, ...cuts, ...ships, ...sprites]);

  // 1. 표지
  {
    const s = pres.addSlide({ masterName: 'COVER' });
    img(s, 'crop/key_art.jpg', 0, 0, W, H, { cover: true });
    text(s, '컨셉 기획서', 0.85, 1.55, 5, 0.4, { size: 16, bold: true, color: C.sea });
    text(s, '쥐 해적', 0.85, 1.95, 6, 1.25, { size: 66, bold: true, color: C.navy });
    text(s, '바다 정복 (가제)', 0.85, 3.2, 6, 0.6, { size: 28, bold: true, color: C.navy });
    text(s, '애꾸 선장의 일곱 바다 정복 · 탑뷰 해전 액션', 0.85, 3.9, 6, 0.4, { size: 16, color: '4A5966' });
    card(s, 0.85, 6.35, 4.6, 0.55, { fill: C.navy, flat: true });
    text(s, '작성자  정승운      2026.10.30      v2.0', 0.85, 6.35, 4.6, 0.55, { size: 13, bold: true, color: C.card, align: 'center', valign: 'middle' });
  }

  // 2. 문서 구성
  {
    const s = slide('문서 구성', '이 문서는 방향을, 숫자는 테이블이', '컨셉 기획서 뒤로 상세 기획서 · 데이터 테이블이 이어짐');
    const docs = [
      ['ui_icons_5.png', '컨셉 기획서', '게임 방향 · 의도 · 시스템 뼈대', '이 문서', true],
      ['ui_icons_3.png', '전투 기획서', '배 조작 · 사격 · 자동 무기 · 선원 · 피격', '예정'],
      ['ui_hud_9.png', '스테이지 기획서', '바다 구성 · 웨이브 · 적 / 보스 패턴 · 맵 특성', '예정'],
      ['ui_icons_6.png', '아웃게임 강화 기획서', '배 진화 · 장비 · 의뢰 / 합성 / 티어 업 · 재화', '예정'],
      ['ui_icons_7.png', '데이터 테이블', 'Pirat_Table/ 배 · 장비 · 적 · 바다 확정 수치', '작성'],
    ];
    const w = 2.3, g = (CW - 5 * w) / 4;
    docs.forEach(([ic, name, desc, st, cur], i) => {
      const x = X0 + i * (w + g), y = 1.95;
      card(s, x, y, w, 3.55, { fill: cur ? C.navy : C.card });
      s.addShape(pres.shapes.OVAL, { x: x + w / 2 - 0.6, y: y + 0.35, w: 1.2, h: 1.2, fill: { color: cur ? '23415A' : C.tint }, line: { color: cur ? '23415A' : C.tint } });
      img(s, ic, x + w / 2 - 0.45, y + 0.5, 0.9, 0.9);
      text(s, name, x + 0.2, y + 1.75, w - 0.4, 0.4, { size: 15, bold: true, color: cur ? C.card : C.ink, align: 'center' });
      text(s, desc, x + 0.2, y + 2.18, w - 0.4, 0.75, { size: 12, color: cur ? 'C9D6E1' : C.muted, align: 'center' });
      chip(s, st, x + w / 2 - 0.5, y + 3.0, 1.0, 0.32, st === '예정' ? 'B8C3CC' : C.cheese, st === '예정' ? C.card : C.navy);
      if (i < 4) arrow(s, x + w + 0.03, y + 1.77, x + w + g - 0.03, y + 1.77, 'B8C3CC', 1.25);
    });
    card(s, X0, 5.8, CW, 0.95, { fill: C.tint, flat: true });
    text(s, [
      { text: '이 문서의 이름 · 수치 · 목록 = 방향을 보여 주는 예시. ', options: { bold: true } },
      { text: '확정 값은 데이터 테이블과 상세 기획서에서 관리', options: { breakLine: true } },
      { text: '웹게임 = 방향 확인용 프로토타입. Unity 본작은 웹게임을 그대로 옮기지 않고 상세 기획서 기준으로 다시 만듦', options: { color: C.muted } },
    ], X0 + 0.3, 5.8, CW - 0.6, 0.95, { size: 13, valign: 'middle', ls: 1.2 });
  }

  // 3. 기획의도
  {
    const s = slide('기획의도', '원작 해적 쥐로 떠나는 가볍고 캐쥬얼한 바다 정복', '원작의 감성을 살린 ip 확장, 배를 모는 손맛과 눈에 보이는 성장');
    const pts = [
      ['원작 ip 확장', '원작 해적 쥐(애꾸 · 삼각모)가 주인공. 캐릭터 · 그림체만 공유하는 별개 게임'],
      ['배 몰기가 곧 실력', '옆구리를 돌려야 쏘는 뱃전 일제 사격. 배 성능이 낮아도 컨트롤로 클리어'],
      ['인게임 · 아웃게임 성장', '인게임 = 선원 구조 · 콤보, 아웃게임 = 배 · 장비 누적'],
      ['실제 배 역사대로 진화', '갤리선 → 범선 → 증기선 → 강철 군함 → 현대 함정, 단계마다 바뀌는 모습'],
    ];
    pts.forEach(([h, b], i) => {
      const y = 1.95 + i * 1.2;
      badge(s, i + 1, X0, y, 0.5);
      text(s, h, X0 + 0.7, y - 0.03, 5.2, 0.4, { size: 17, bold: true });
      text(s, b, X0 + 0.7, y + 0.4, 5.2, 0.65, { size: 13, color: C.muted });
    });
    // 오른쪽: 시대마다 선장 옷 · 배가 바뀜
    const px = 6.75, pw = W - X0 - px;
    card(s, px, 1.85, pw, 4.95);
    text(s, '시대가 바뀌면 배도 선장 옷도 바뀜', px + 0.3, 1.98, pw - 0.6, 0.35, { size: 13, bold: true, color: C.sea });
    const era = ['galley', 'galleon', 'frigate', 'paddle', 'dreadnought', 'carrier'];
    era.forEach((k, i) => {
      const y = 2.42 + i * 0.72;
      chip(s, ERAS[i], px + 0.3, y + 0.17, 1.25, 0.3, TIER_COL[i], C.ink, 10);
      img(s, `cut/capt_${i}.png`, px + 1.7, y, 0.66, 0.66);
      img(s, `ship_${k}_0.png`, px + 2.55, y + 0.04, 2.6, 0.58, { align: 'left' });
      text(s, KIND[k], px + 5.0, y + 0.17, pw - 5.2, 0.3, { size: 11, color: C.muted, align: 'right' });
    });
  }

  // 4. 원페이지
  {
    const s = slide('원페이지 기획서', '쥐 해적 — 바다 정복 (가제)', '고양이 해군 · 라이벌 해적 · 상어와 싸우는 탑뷰 해전 액션');
    img(s, 'crop/battle_boss.jpg', X0, 1.85, 7.3, 4.11, { cover: true, shadow: true });
    text(s, '웹 프로토타입 전투 화면 — 안개 바다 · 해적왕 보스전', X0, 6.05, 7.3, 0.3, { size: 11, color: C.muted });
    const rows = [
      ['장르', '탑뷰 해전 액션 (웨이브 + 보스)'],
      ['플랫폼', 'PC (스팀) · 키보드 + 마우스'],
      ['BM', '패키지 판매, 뽑기는 게임 재화로만'],
      ['타겟', '원작 팬 · 캐쥬얼 액션 유저'],
      ['레퍼런스', '어쌔신 크리드 4 해전 (뱃전 사격)'],
      ['적', '고양이 해군 · 라이벌 쥐 해적 · 상어'],
      ['볼륨 (예시)', '바다 8개 내외 · 배 3갈래 × 6시대'],
    ];
    const rx = 8.25, rw = W - X0 - rx;
    card(s, rx, 1.85, rw, 4.95);
    rows.forEach(([k, v], i) => {
      const y = 2.05 + i * 0.66;
      text(s, k, rx + 0.3, y, 1.3, 0.5, { size: 12, bold: true, color: C.sea, valign: 'middle' });
      text(s, v, rx + 1.55, y, rw - 1.8, 0.5, { size: 13, valign: 'middle' });
      if (i < rows.length - 1) line(s, rx + 0.3, y + 0.58, rx + rw - 0.3, y + 0.58, C.line, 0.75);
    });
  }

  // 5. 스토리
  {
    const s = slide('스토리', '훔친 갤리선 한 척에서 시작하는 해적 쥐의 야망', '고양이 해군에게 빼앗긴 바다를 되찾고 일곱 바다를 정복');
    img(s, 'crop/story.jpg', X0, 1.85, 7.35, 4.9, { cover: true, shadow: true });
    const rx = 8.3, rw = W - X0 - rx;
    const rows = [
      ['ui_icons_2.png', '애꾸 선장', '애꾸 안대 · 삼각모 · 빨간 코트의 해적 쥐. 일곱 바다 정복이 꿈'],
      ['ui_icons_5.png', '시작', '밤 항구에서 훔친 노 젓는 갤리선 한 척'],
      ['ui_icons_6.png', '조선공 쥐', '항구에서 배를 고치고 장비를 만드는 조력자'],
      ['ui_hud_15.png', '최종 목표', '고양이 해군 본진 격파. 바다마다 짧은 스토리 문구'],
    ];
    rows.forEach(([ic, h, b], i) => iconRow(s, ic, h, b, rx, 2.0 + i * 1.2, rw, { d: 0.7 }));
  }

  // 6. 세력
  {
    const s = slide('세력', '쥐 해적 대 고양이 해군, 그리고 라이벌과 상어', '세력마다 배 · 싸우는 방식이 달라 바다마다 다른 전투');
    img(s, 'crop/factions.jpg', X0, 1.7, CW, 4.15, { cover: true });
    const caps = [
      [0.176, '쥐 해적 (플레이어)', '애꾸 선장과 선원들\n쥐 머리 선수상 · 치즈 해적기'],
      [0.39, '고양이 해군', '바다를 장악한 정규군\n순찰선에서 해상 요새까지'],
      [0.62, '라이벌 쥐 해적', '같은 바다를 노리는 쥐\n이름 있는 선장이 보스로 재등장'],
      [0.866, '상어', '어느 편도 아닌 위협\n평소엔 지느러미만 보임'],
    ];
    caps.forEach(([fx, h, b]) => {
      const cx = X0 + CW * fx, w = 2.6;
      text(s, h, cx - w / 2, 5.92, w, 0.36, { size: 15, bold: true, align: 'center' });
      text(s, b, cx - w / 2, 6.28, w, 0.6, { size: 11, color: C.muted, align: 'center' });
    });
  }

  // 7. 핵심 재미
  {
    const s = slide('핵심 재미', '몰고, 쏘고, 건지고, 키운다', '다섯 가지 재미가 출항 한 번 안에서 이어짐');
    const fun = [
      ['fun_drive', '배를 모는 손맛', '돛으로 속도, 키로 방향. 옆구리를 적에게 돌리는 위치 잡기가 곧 실력'],
      ['fun_combo', '격파의 쾌감', '여러 문이 한 번에 터지는 일제 사격 · 콤보 · 히트스톱 · 화면 흔들림'],
      ['fun_crew', '구하면 강해지는 배', '물에 빠진 쥐를 건지면 선원 +1. 장전이 빨라지고 갑판에 선원이 늘어남'],
      ['fun_sea', '바다에 맞춰 고르는 배', '바다마다 적 · 맵 특성이 달라 갈래가 다른 배와 장비로 출항'],
      ['fun_evo', '진화하는 배', '갤리선에서 항공모함까지. 단계마다 자동 무기가 붙어 싸움이 바뀜'],
    ];
    const w = 2.3, g = (CW - 5 * w) / 4;
    fun.forEach(([f, h, b], i) => {
      const x = X0 + i * (w + g), y = 1.9;
      card(s, x, y, w, 4.85);
      img(s, `crop/${f}.jpg`, x, y, w, 2.6, { cover: true });
      badge(s, i + 1, x + 0.18, y + 2.4, 0.42);
      text(s, h, x + 0.18, y + 2.98, w - 0.36, 0.4, { size: 15, bold: true });
      text(s, b, x + 0.18, y + 3.44, w - 0.36, 1.3, { size: 12, color: C.muted, ls: 1.15 });
    });
  }

  // 8. 게임 루프
  {
    const s = slide('게임 루프', '바다에서 모으고, 항구에서 키우고, 다시 출항', '인게임 = 바다에서 웨이브 · 보스 전투, 아웃게임 = 항구에서 성장');
    const rowsDef = [
      ['인게임 · 바다', C.sea, [['ui_icons_3.png', '웨이브 전투'], ['ui_hud_0.png', '수리\n(선원 수만큼 추가)'], ['ui_hud_3.png', '다음 웨이브'], ['ui_hud_8.png', '보스'], ['items_1.png', '클리어 보상']]],
      ['아웃게임 · 항구', C.red, [['ui_icons_8.png', '배 구매'], ['ui_icons_6.png', '조선소 의뢰'], ['ui_hud_10.png', '합성 · 티어 업'], ['ui_hud_9.png', '바다에 맞는 배 고르기'], ['ui_icons_5.png', '재출항']]],
    ];
    const lx = X0, lw = 1.55, nw = 1.82, ng = 0.32, nx0 = lx + lw + 0.35;
    rowsDef.forEach(([label, col, nodes], r) => {
      const y = 1.95 + r * 2.35;
      card(s, lx, y, lw, 1.75, { fill: col });
      text(s, label.replace(' · ', '\n'), lx, y, lw, 1.75, { size: 16, bold: true, color: C.card, align: 'center', valign: 'middle', ls: 1.2 });
      // 항구 줄은 오른쪽 → 왼쪽으로 흘러 한 바퀴 고리가 됨
      nodes.forEach(([ic, t], i) => {
        const x = nx0 + (r ? 4 - i : i) * (nw + ng);
        card(s, x, y, nw, 1.75);
        img(s, ic, x + nw / 2 - 0.36, y + 0.18, 0.72, 0.72);
        text(s, t, x + 0.08, y + 0.98, nw - 0.16, 0.7, { size: 13, bold: true, align: 'center', ls: 1.1 });
        if (i < 4) {
          if (r) arrow(s, x - 0.04, y + 0.88, x - ng + 0.04, y + 0.88, '9AAAB8');
          else arrow(s, x + nw + 0.04, y + 0.88, x + nw + ng - 0.04, y + 0.88, '9AAAB8');
        }
      });
    });
    const lastX = nx0 + 4 * (nw + ng) + nw / 2;
    arrow(s, lastX, 1.95 + 1.78, lastX, 1.95 + 2.32, C.cheese, 2.25);
    text(s, '보상 들고 항구로', lastX - 2.05, 4.0, 1.95, 0.3, { size: 11, bold: true, color: '9C7A10', align: 'right' });
    arrow(s, nx0 + nw / 2, 4.3 - 0.03, nx0 + nw / 2, 1.95 + 1.78, C.cheese, 2.25);
    text(s, '출항', nx0 + nw / 2 + 0.12, 4.0, 1.2, 0.3, { size: 11, bold: true, color: '9C7A10' });
    text(s, [
      { text: '웨이브마다 보물상자 등장 (화면 가장자리 화살표 · 미니맵 표시)   ·   ', options: {} },
      { text: '침몰해도 모은 재화 일부 회수', options: { bold: true, color: C.ink } },
      { text: '   ·   바다 클리어 시 다음 바다 개방', options: {} },
    ], X0, 6.5, CW, 0.35, { size: 12, color: C.muted, align: 'center' });
  }

  // 9. 조작 / 전투
  {
    const s = slide('인게임 · 조작 / 전투', '키보드로 배를 몰고, 마우스로 쏠 쪽을 고름', '좌우 대포 쿨다운 따로 · 전투 수치 = 배 + 장비 계산 결과');
    img(s, 'crop/battle_whirl.jpg', X0, 1.85, 7.2, 4.05, { cover: true, shadow: true });
    text(s, '대포마다 날아갈 길 점선 · 착탄 지점 표시 (적 = 빨강, 플레이어 = 금빛)', X0, 6.0, 7.2, 0.3, { size: 11, color: C.muted });
    const keys = [['W / S', '돛 (속도)'], ['A / D', '키 (방향)'], ['클릭', '마우스 쪽 뱃전 사격'], ['Q / E', '왼쪽 · 오른쪽 뱃전'], ['Space', '양쪽 동시 사격'], ['1 · 2 · 3', '체인샷 · 화염탄 · 폭격']];
    const rx = 8.15, rw = W - X0 - rx;
    keys.forEach(([k, v], i) => {
      const y = 1.88 + i * 0.44;
      chip(s, k, rx, y, 1.15, 0.34, C.navy, C.card, 11);
      text(s, v, rx + 1.3, y, rw - 1.3, 0.34, { size: 13, valign: 'middle' });
    });
    const feats = [['ui_hud_9.png', '포탄 물리', '배 속도 · 회전을 이어받고 반동으로 밀림'], ['ui_icons_5.png', '무한 바다', '경계 없음, 칸마다 섬 생성 · 멀면 삭제'], ['ui_hud_3.png', '레이더 미니맵', '배가 가운데인 레이더로 적 · 보물 위치']];
    feats.forEach(([ic, h, b], i) => iconRow(s, ic, h, b, rx, 4.7 + i * 0.73, rw, { d: 0.5, hs: 13, bs: 11, bh: 0.4 }));
  }

  // 10. 자동 무기 · 선원
  {
    const s = slide('인게임 · 자동 무기 / 선원', '조작은 그대로, 시대와 선원이 화력을 더함', '배 단계가 오르면 자동 무기, 인게임에서는 건진 선원만큼 강해짐');
    const lw = 5.85;
    card(s, X0, 1.85, lw, 4.95);
    text(s, '자동 무기', X0 + 0.3, 2.0, 3, 0.4, { size: 17, bold: true });
    text(s, '시대가 바뀌는 게 전투에서 바로 느껴지는 장치', X0 + 0.3, 2.4, lw - 0.6, 0.3, { size: 12, color: C.muted });
    const aw = [['paddle', '증기선 시대', '선수포 — 앞쪽 적에게 자동 사격'], ['torpedo', '강철 군함', '어뢰 — 잠수한 상어까지 맞힘'], ['carrier', '현대', '유도탄 · 함재기 — 알아서 싸움']];
    aw.forEach(([k, era, t], i) => {
      const y = 2.9 + i * 1.08;
      img(s, `ship_${k}_0.png`, X0 + 0.3, y, 2.3, 0.85, { align: 'left' });
      chip(s, era, X0 + 2.8, y + 0.05, 1.3, 0.3, TIER_COL[3 + i], C.ink, 10);
      text(s, t, X0 + 2.8, y + 0.42, lw - 3.0, 0.4, { size: 12 });
    });
    text(s, '갈래마다 다른 자동 무기 · 장비로 강화하거나 새로 붙이는 빌드 가능', X0 + 0.3, 6.25, lw - 0.6, 0.4, { size: 11, color: C.muted });
    const rx = X0 + lw + 0.4, rw = W - X0 - rx;
    card(s, rx, 1.85, rw, 4.95);
    img(s, 'crop/crew_zoom.jpg', rx, 1.85, rw, 2.7, { cover: true });
    text(s, '선원', rx + 0.3, 4.7, 3, 0.4, { size: 17, bold: true });
    text(s, [
      { text: '빠진 쥐를 건지면 선원 +1 → 장전 빨라짐 (그 항해에서만)', options: { bullet: true, breakLine: true } },
      { text: '배 그림과 선원 그림을 분리 → 건진 선원이 갑판에 보임', options: { bullet: true, breakLine: true } },
      { text: '사격 땐 대포로 달려가 장전, 맞으면 움찔, 격침하면 만세', options: { bullet: true } },
    ], rx + 0.3, 5.12, rw - 0.6, 1.6, { size: 12, color: C.ink, gap: 4 });
  }

  // 11. 몬스터
  {
    const s = slide('인게임 · 몬스터', '붙을 적과 피할 적을 섞어 위치 선정이 곧 실력', '강한 공격은 예고선 / 예고 원으로 반드시 미리 표시 (적 구성은 예시)');
    const foes = [
      ['e_cat_sloop_0.png', '순찰선', '고양이 해군', '뱃전 일제 사격', '선수 · 선미 쪽으로 접근'],
      ['e_cat_frigate_0.png', '프리깃', '고양이 해군', '대포 많은 일제 사격', '체인샷으로 늦춘 뒤 측면 사격'],
      ['e_cat_speeder_0.png', '쾌속정', '고양이 해군', '달려와 박치기', '키 꺾어 회피 · 선수포'],
      ['e_cat_mortar_0.png', '박격포선', '고양이 해군', '느림, 곡사 폭격', '예고 원 이탈 후 접근'],
      ['e_cat_ironclad_0.png', '철갑함', '고양이 해군', '단단함, 회전 포탑', '고위력 포 · 어뢰 · 폭격'],
      ['e_rat_rival_0.png', '라이벌 해적선', '라이벌 쥐 해적', '쥐 해적처럼 일제 사격', '같은 방식의 측면 싸움'],
      ['e_shark_0.png', '상어', '상어', '잠수 접근 → 떠올라 물기', '지쳐 멈춘 틈에 반격'],
      ['items_2.png', '폭탄통', '-', '떠다니다 닿으면 폭발', '멀리서 사격'],
    ];
    const fcol = { '고양이 해군': C.navy, '라이벌 쥐 해적': '5A2A2A', '상어': C.sea, '-': '8A99A6' };
    const w = 2.9, g = (CW - 4 * w) / 3, h = 2.4;
    foes.forEach(([f, n, fac, act, tip], i) => {
      const x = X0 + (i % 4) * (w + g), y = 1.85 + Math.floor(i / 4) * (h + 0.15);
      card(s, x, y, w, h);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 1.0, rectRadius: 0.08, fill: { color: 'D7E6F0' }, line: { color: 'D7E6F0' } });
      img(s, f, x + 0.3, y + 0.2, w - 0.6, 0.84);
      text(s, n, x + 0.2, y + 1.22, 1.6, 0.34, { size: 14, bold: true });
      chip(s, fac === '-' ? '중립' : fac, x + w - 1.2, y + 1.25, 1.0, 0.27, fcol[fac], C.card, 9);
      text(s, act, x + 0.2, y + 1.6, w - 0.4, 0.3, { size: 12 });
      text(s, '→ ' + tip, x + 0.2, y + 1.92, w - 0.4, 0.3, { size: 11, color: C.sea, bold: true });
    });
  }

  // 12. 바다 / 보스 / 맵 특성
  {
    const s = slide('인게임 · 바다 / 보스 / 맵 특성', '바다마다 다른 세력 · 보스 · 날씨', '바다 = 웨이브 몇 개 + 보스. 뒤쪽 바다일수록 강해지고, 앞 보스가 강화판으로 재등장');
    const lw = 6.3;
    text(s, '보스 (예시)', X0, 1.82, 3, 0.35, { size: 15, bold: true });
    const boss = [['boss_rival_0.png', '라이벌 선장', '일제 사격 + 화염'], ['boss_megashark_0.png', '거대 상어', '잠수 → 돌진 → 지침'], ['boss_admiral_0.png', '고양이 제독', '폭격 세례 + 쾌속정 소환'], ['boss_fortress_0.png', '해상 요새', '포탑 사격 · 폭격 비 · 소환']];
    const bw = (lw - 0.2) / 2;
    boss.forEach(([f, n, p], i) => {
      const x = X0 + (i % 2) * (bw + 0.2), y = 2.25 + Math.floor(i / 2) * 2.3;
      card(s, x, y, bw, 2.15);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: y + 0.12, w: bw - 0.24, h: 1.25, rectRadius: 0.08, fill: { color: 'D7E6F0' }, line: { color: 'D7E6F0' } });
      img(s, f, x + 0.25, y + 0.18, bw - 0.5, 1.13);
      text(s, n, x + 0.2, y + 1.46, bw - 0.4, 0.32, { size: 14, bold: true });
      text(s, p, x + 0.2, y + 1.78, bw - 0.4, 0.3, { size: 12, color: C.muted });
    });
    const rx = X0 + lw + 0.35, rw = W - X0 - rx;
    text(s, '맵 특성 — 4번째 바다쯤부터, 여러 갈래 배를 키우게 함', rx, 1.82, rw, 0.35, { size: 15, bold: true });
    const tr = [['trait_fog', '안개', '시야 제한 → 망원경 · 레이더가 힘'], ['trait_storm', '폭풍', '바람에 밀림 + 번개 → 날씨 저항'], ['trait_whirl', '소용돌이', '가운데로 끌어당김 → 빠른 배 · 날씨 저항']];
    tr.forEach(([f, n, t], i) => {
      const y = 2.25 + i * 1.53;
      card(s, rx, y, rw, 1.4);
      img(s, `crop/${f}.jpg`, rx, y, 2.5, 1.4, { cover: true });
      text(s, n, rx + 2.7, y + 0.25, rw - 2.9, 0.4, { size: 16, bold: true });
      text(s, t, rx + 2.7, y + 0.7, rw - 2.9, 0.6, { size: 12, color: C.muted });
    });
  }

  // 13. 아웃게임 개요
  {
    const s = slide('아웃게임 · 개요', '인게임에서 모은 재화로 항구에서 배와 장비를 키움', '테크(가진 배 최고 단계)가 오를수록 더 좋은 장비 · 더 어려운 바다가 열림');
    const flow = ['출항', '재화 획득', '배 구매 · 의뢰', '테크 상승', '상위 장비 등장', '다음 바다'];
    const fw = 1.83, fg = (CW - 6 * fw) / 5;
    flow.forEach((t, i) => {
      const x = X0 + i * (fw + fg);
      chip(s, t, x, 1.85, fw, 0.52, i % 2 ? C.navy : C.sea, C.card, 13);
      if (i < 5) arrow(s, x + fw + 0.03, 2.11, x + fw + fg - 0.03, 2.11, '9AAAB8');
    });
    const cur = [['ui_icons_1.png', '목재', '격침 · 보물상자', '배 구매 · 의뢰'], ['items_0.png', '치즈 금화', '격침 · 보물상자 · 콤보', '배 구매 · 의뢰'], ['ui_hud_1.png', '선원', '빠진 쥐 · 납치된 쥐 구조', '인게임 장전 · 수리 (항해 끝나면 소멸)']];
    const cw = 1.8, cg = 0.15;
    cur.forEach(([ic, n, get, use], i) => {
      const x = X0 + i * (cw + cg), y = 2.75;
      card(s, x, y, cw, 3.4);
      img(s, ic, x + cw / 2 - 0.42, y + 0.2, 0.84, 0.84);
      text(s, n, x + 0.1, y + 1.12, cw - 0.2, 0.36, { size: 15, bold: true, align: 'center' });
      text(s, '얻는 곳', x + 0.18, y + 1.6, cw - 0.36, 0.25, { size: 10, bold: true, color: C.sea });
      text(s, get, x + 0.18, y + 1.85, cw - 0.36, 0.55, { size: 11 });
      text(s, '쓰는 곳', x + 0.18, y + 2.42, cw - 0.36, 0.25, { size: 10, bold: true, color: C.red });
      text(s, use, x + 0.18, y + 2.67, cw - 0.36, 0.65, { size: 11 });
    });
    text(s, '항해 끝: 승리 = 모은 재화 전부 + 다음 바다, 침몰 = 일부만', X0, 6.3, 3 * cw + 2 * cg, 0.5, { size: 11, color: C.muted });
    const tabs = [['port_sea', '출항 — 바다 지도 · 추천 배 · 스토리'], ['port_ship', '조선소 — 배 트리 · 사기 / 타기'], ['port_gear', '장비 — 슬롯 끼우기 · 수치 비교'], ['port_lab', '의뢰 · 합성 — 확률 공개 · 티어 업']];
    const tx0 = X0 + 3 * cw + 2 * cg + 0.35, tw = (W - X0 - tx0 - 0.2) / 2, th = tw * 9 / 16;
    tabs.forEach(([f, t], i) => {
      const x = tx0 + (i % 2) * (tw + 0.2), y = 2.75 + Math.floor(i / 2) * (th + 0.42);
      img(s, `crop/${f}.jpg`, x, y, tw, th, { cover: true, shadow: true });
      text(s, t, x, y + th + 0.05, tw, 0.3, { size: 11, bold: true });
    });
  }

  // 14. 배 진화
  {
    const s = slide('아웃게임 · 배 진화', '실제 배 발전 순서대로 6시대 × 3갈래', '앞 단계 배가 있어야 다음 배를 살 수 있음, 산 배는 자유롭게 교체 (배 목록은 예시)');
    const lx = X0, lw = 1.9, ex = lx + lw + 0.15, ew = (W - X0 - ex) / 6;
    ERAS.forEach((e, i) => chip(s, `${i} ${e}`, ex + i * ew + 0.08, 1.82, ew - 0.16, 0.32, TIER_COL[i], C.ink, 10));
    const lines = [['S', '쾌속선', '빠르고 잘 돎\n박치기 · 어뢰 · 유도탄', C.sea], ['M', '다목적함', '균형형\n특수탄 · 폭격 · 선원', '4F7A52'], ['H', '중포함', '느리고 튼튼함\n대포 많음 · 피해 감소', C.red]];
    const rh = 1.32, ry0 = 2.3, cardW = ew - 0.16;
    const cell = (k, col, row) => {
      const x = ex + col * ew + 0.08, y = ry0 + row * (rh + 0.15);
      card(s, x, y, cardW, rh);
      img(s, `ship_${k}_0.png`, x + 0.1, y + 0.12, cardW - 0.2, 0.75);
      text(s, KIND[k], x, y + 0.92, cardW, 0.3, { size: 11, bold: true, align: 'center' });
      return [x, y];
    };
    lines.forEach(([key, n, d, col], r) => {
      const y = ry0 + r * (rh + 0.15);
      card(s, lx, y, lw, rh, { fill: col });
      text(s, n, lx + 0.15, y + 0.1, lw - 0.3, 0.35, { size: 15, bold: true, color: C.card });
      text(s, d, lx + 0.15, y + 0.5, lw - 0.3, 0.75, { size: 10, color: 'F1F4F7', ls: 1.15 });
      SHIP_ROWS[key].forEach((k, i) => {
        cell(k, i + 1, r);
        if (i < 4) line(s, ex + (i + 2) * ew - 0.08, y + rh / 2, ex + (i + 2) * ew + 0.08, y + rh / 2, '9AAAB8', 1.5);
      });
    });
    const [gx, gy] = cell('galley', 0, 1);
    // 갤리선 → 세 갈래 1단계로 갈라짐
    const mx = ex + ew;
    line(s, gx + cardW, gy + rh / 2, mx, gy + rh / 2, '9AAAB8', 1.5);
    line(s, mx, ry0 + rh / 2, mx, ry0 + 2 * (rh + 0.15) + rh / 2, '9AAAB8', 1.5);
    for (let r = 0; r < 3; r++) line(s, mx, ry0 + r * (rh + 0.15) + rh / 2, mx + 0.08, ry0 + r * (rh + 0.15) + rh / 2, '9AAAB8', 1.5);
    chip(s, '시작 배', gx + cardW / 2 - 0.45, gy - 0.18, 0.9, 0.26, C.cheese, C.navy, 9);
    text(s, '시작 배 갤리선의 장비는 모든 갈래에 장착   ·   단계가 오르면 장비 슬롯 증가 · 장착 가능 티어 확장   ·   테크 = 가진 배 최고 단계', X0, 6.75, CW, 0.3, { size: 11, color: C.muted, align: 'center' });
  }

  // 15. 장비
  {
    const s = slide('아웃게임 · 장비', '장비 = 티어 + 장착 가능 갈래 + 등급', '배마다 슬롯 구성이 달라 배 성격이 생기고, 등급이 높을수록 고유 효과');
    const slots = ['대포', '돛 · 기관', '선체 장갑', '키', '망원경', '선수상', '박격포', '특수탄 창고', '선원실'];
    const sw = (CW - 8 * 0.08) / 9;
    card(s, X0, 1.82, CW, 1.3);
    slots.forEach((n, i) => {
      const x = X0 + i * (sw + 0.08);
      img(s, `parts_a_${i}.png`, x + sw / 2 - 0.35, 1.9, 0.7, 0.7);
      text(s, n, x, 2.65, sw, 0.3, { size: 11, bold: true, align: 'center' });
    });
    const grades = [
      ['C9D2DC', '일반', 'parts_a_0.png', '수치 하나 상승', '갤리선 "청동 소포" = 포탄 위력'],
      ['7FD88A', '고급', 'parts_a_1.png', '상승폭 증가 또는 두 가지 동시 상승', '대포 = 위력 + 장전'],
      ['6FB8FF', '희귀', 'parts_u_0.png', '고유 효과 시작', '포탄이 맞은 곳 폭발 · 확률로 불붙임'],
      ['FFB84D', '전설', 'parts_u_3.png', '플레이 방식 변화', '일제 사격 한 번 더 · 격침 시 회복 · 함재기 추가'],
    ];
    const gw = (CW - 3 * 0.2) / 4;
    grades.forEach(([col, n, ic, d, ex], i) => {
      const x = X0 + i * (gw + 0.2), y = 3.4;
      card(s, x, y, gw, 2.75);
      s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 1.0, h: 1.0, fill: { color: col }, line: { color: col } });
      img(s, ic, x + 0.33, y + 0.33, 0.84, 0.84);
      text(s, n, x + 1.45, y + 0.35, gw - 1.6, 0.4, { size: 18, bold: true });
      text(s, d, x + 1.45, y + 0.78, gw - 1.6, 0.5, { size: 11, color: C.muted });
      text(s, '예시', x + 0.25, y + 1.5, 1, 0.25, { size: 10, bold: true, color: C.sea });
      text(s, ex, x + 0.25, y + 1.78, gw - 0.5, 1.0, { size: 13, ls: 1.15 });
    });
    text(s, '장착 조건: 가진 배 + 그 슬롯 + 갈래 일치 + 배 단계 ≥ 장비 티어   ·   장비 1개 = 배 1척 (옮겨 낄 수 있음)   ·   이름 · 효과에 갈래 · 시대 테마를 담음', X0, 6.5, CW, 0.3, { size: 11, color: C.muted, align: 'center' });
  }

  // 16. 의뢰 · 합성 · 티어 업
  {
    const s = slide('아웃게임 · 조선소', '상점 대신 조선공 쥐에게 맡기는 장비 제작', '얼마를 쓸지 직접 고르고, 확률은 화면에 그대로 공개');
    img(s, 'crop/port.jpg', X0, 1.85, 6.6, 4.4, { cover: true, shadow: true });
    text(s, '가진 배에 낄 수 있는 장비만 등장 · 테크에 가까운 티어일수록 잘 나옴', X0, 6.35, 6.6, 0.3, { size: 11, color: C.muted });
    const rx = X0 + 6.95, rw = W - X0 - rx;
    const st = [
      ['ui_icons_6.png', '제작 의뢰', '쓸 재화를 슬라이더로 정함 → 많이 쓸수록 높은 등급 확률 ↑'],
      ['ui_icons_8.png', '합성', '같은 티어 · 같은 등급 여러 개 → 한 등급 위 1개'],
      ['ui_hud_15.png', '티어 업', '같은 티어 전설 여러 개 → 한 티어 위 전설. 많이 넣을수록 성공 ↑, 실패 시 일부만 남음'],
    ];
    st.forEach(([ic, h, b], i) => {
      const y = 1.85 + i * 1.5;
      card(s, rx, y, rw, 1.35);
      badge(s, i + 1, rx + 0.2, y + 0.2, 0.4);
      img(s, ic, rx + rw - 1.05, y + 0.25, 0.85, 0.85);
      text(s, h, rx + 0.75, y + 0.2, rw - 2.0, 0.4, { size: 16, bold: true });
      text(s, b, rx + 0.75, y + 0.62, rw - 2.0, 0.7, { size: 12, color: C.muted });
    });
    text(s, '티어 업은 한 단계 위 배가 있어야 도전 → 테크가 오를 때마다 새 목표', rx, 6.35, rw, 0.3, { size: 11, bold: true, color: C.sea });
  }

  // 17. 비쥬얼 가이드 · 사운드
  {
    const s = slide('비쥬얼 가이드 · 사운드', '원작의 플랫하고 귀여운 그림체, 작게 봐도 읽히는 배', '그림은 전부 탑뷰 · 뱃머리 오른쪽, 캐릭터만 살짝 쿼터뷰');
    const lw = 5.6;
    const rules = [
      '한 색 + 그림자 한 단, 외곽선 · 광택 · 그라데이션 없음',
      '채도 낮은 자연색, 큰 면, 소품 최소',
      '배만 봐도 쥐 · 고양이 구분 (선수상 · 돛 · 꼬리 키)',
      '해적기 = 치즈 + 뼈 (세 동그라미 쥐 귀 실루엣 금지)',
      '배 갑판은 비워 두고 선원은 따로 올림',
      '위험 요소 = 예고선 · 예고 원, 포탄 · 연기 · 물살 = 벡터',
    ];
    rules.forEach((r, i) => { badge(s, i + 1, X0, 1.92 + i * 0.58, 0.36); text(s, r, X0 + 0.5, 1.92 + i * 0.58, lw - 0.5, 0.36, { size: 13, valign: 'middle' }); });
    const pal = [['8C6239', '나무'], ['EFE3C8', '크림'], ['A8443A', '탁한 빨강'], ['2E4A6B', '탁한 남색'], ['2F7FAE', '바다'], ['C9A03A', '흐린 금색']];
    pal.forEach(([c, n], i) => {
      const x = X0 + i * 0.93;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.5, w: 0.8, h: 0.55, rectRadius: 0.08, fill: { color: c }, line: { color: 'C9D2DC', width: 0.5 } });
      text(s, n, x - 0.05, 6.1, 0.9, 0.25, { size: 9, color: C.muted, align: 'center' });
    });
    const rx = X0 + lw + 0.35, rw = W - X0 - rx;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y: 1.85, w: rw, h: 4.55, rectRadius: 0.12, fill: { color: '2F6F9C' }, line: { color: '2F6F9C' } });
    const fac = [['ship_galleon_0.png', '쥐 해적', '쥐 머리 선수상 · 꼬리 키 · 치즈 해적기'], ['e_cat_frigate_0.png', '고양이 해군', '고양이 귀 뱃머리 · 발바닥 돛 · 남색'], ['e_rat_rival_0.png', '라이벌 쥐 해적', '해골 검은 돛 · 숯색 나무'], ['e_shark_0.png', '상어', '평소엔 지느러미만, 떠오르면 몸 전체']];
    fac.forEach(([f, n, d], i) => {
      const y = 2.0 + i * 1.1;
      img(s, f, rx + 0.2, y, 2.6, 0.95);
      text(s, n, rx + 3.0, y + 0.12, rw - 3.2, 0.35, { size: 14, bold: true, color: C.card });
      text(s, d, rx + 3.0, y + 0.48, rw - 3.2, 0.35, { size: 11, color: 'D6E4EE' });
    });
    card(s, X0, 6.5, CW, 0.42, { fill: C.tint, flat: true });
    text(s, [{ text: '사운드  ', options: { bold: true, color: C.sea } }, { text: 'BGM 타이틀 · 전투 · 보스 3곡   ·   효과음 포격 · 물보라 · 피격 · 치명타 · 침몰 · 금화 · 쥐 찍찍 · 고양이 울음 · 특수탄' }], X0 + 0.25, 6.5, CW - 0.5, 0.42, { size: 12, valign: 'middle' });
  }

  // 18. 플랫폼 / BM · 개발 방향 · 리스크
  {
    const s = slide('플랫폼 / BM · 개발 방향 · 리스크', '웹 프로토타입으로 확인한 방향을 Unity 본작으로', '다음 단계 = 전투 → 스테이지 → 아웃게임 강화 기획서');
    const cols = [
      ['ui_icons_7.png', '플랫폼 / BM', [
        'PC 스팀 패키지 · 키보드 + 마우스',
        '배 몰기 + 조준 동시 조작 → 모바일 · 터치 제외',
        '뽑기 현금 결제 없음, 확률 전체 공개',
        '추후 DLC: 바다 · 보스 · 배 갈래, 선장 스킨',
      ]],
      ['ui_icons_6.png', '개발 방향', [
        '웹 프로토타입: 조작 · 전투 · 아웃게임 흐름 확인',
        'Unity 본작: 상세 기획서 기준으로 다시 구성',
        '확정 수치 = Pirat_Table 엑셀',
        '검토: 웨이브마다 개조 선택 (인게임 성장 확장)',
        '난이도 · 경제는 테이블로 직접 플레이하며 조정',
      ]],
    ];
    const cw = 3.75;
    cols.forEach(([ic, h, items], i) => {
      const x = X0 + i * (cw + 0.25);
      card(s, x, 1.85, cw, 4.95);
      img(s, ic, x + 0.25, 2.0, 0.6, 0.6);
      text(s, h, x + 1.0, 2.08, cw - 1.2, 0.45, { size: 17, bold: true });
      text(s, items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })), x + 0.25, 2.85, cw - 0.5, 3.8, { size: 12, gap: 8, ls: 1.15 });
    });
    const rx = X0 + 2 * (cw + 0.25), rw = W - X0 - rx;
    card(s, rx, 1.85, rw, 4.95);
    text(s, '리스크 → 대응', rx + 0.25, 2.05, rw - 0.5, 0.45, { size: 17, bold: true });
    const risk = [
      ['뱃전 사격이 어렵게 느껴짐', '마우스 쪽 자동 선택 · 조준선 · 자동 무기'],
      ['인게임 성장이 단조로움', '선원 · 콤보 · 보물상자, 웨이브 개조 검토'],
      ['장비가 많아 밸런스 부담', '일반 · 고급은 틀 × 티어 자동 생성'],
      ['뽑기 피로', '투입량 선택 · 확률 공개 · 합성으로 재활용'],
      ['상어 잠수가 답답함', '지느러미 상시 표시 · 공격 뒤 지침 틈'],
    ];
    risk.forEach(([r, a], i) => {
      const y = 2.65 + i * 0.8;
      text(s, r, rx + 0.25, y, rw - 0.5, 0.3, { size: 12, bold: true });
      text(s, '→ ' + a, rx + 0.25, y + 0.32, rw - 0.5, 0.3, { size: 11, color: C.sea });
    });
  }

  await pres.writeFile({ fileName: OUT });
  await koreanWrap(OUT);
  console.log('saved', OUT);
}

// 한글이 글자 중간에서 잘리지 않게: 글자 언어 ko-KR + 문단 eaLnBrk="0" (어절 단위 줄바꿈)
async function koreanWrap(file) {
  const fs = require('fs');
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/(slides|slideLayouts|slideMasters)\/[^/]+\.xml$/.test(n))) {
    let s = await zip.file(name).async('string');
    s = s.replace(/<a:pPr(?![^>]*eaLnBrk)/g, '<a:pPr eaLnBrk="0"').replace(/<a:p>(?!<a:pPr)/g, '<a:p><a:pPr eaLnBrk="0"/>')
      .replaceAll('lang="en-US"', 'lang="ko-KR" altLang="en-US"').replaceAll('charset="-122"', 'charset="-127"');
    zip.file(name, s);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
main().catch((e) => { console.error(e); process.exit(1); });
