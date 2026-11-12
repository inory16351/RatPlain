// 쥐 해적 오브젝트 · 아이템 시스템 기획서 PPT → Pirat_Plan/인게임/쥐해적_오브젝트아이템기획서.pptx
// 컨셉 기획서 PPT 와 같은 스타일. 그림은 비율에 맞게 미리 자른 것만 쓰고 contain 으로만 넣음 (cover 는 PPT 에서 늘어남)
// 사용: NODE_PATH=<pptxgenjs · sharp · jszip 설치 폴더>/node_modules node Pirat_Plan/art/build_item_ppt.js
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const ART = __dirname;
const SPR = path.join(ART, '..', '..', 'pirate', 'art', 'sprites');
const OUT = path.join(ART, '..', '인게임', '쥐해적_오브젝트아이템기획서.pptx');
const P = (f) => (f.includes('/') ? path.join(ART, f) : path.join(SPR, f));

const FONT = 'Noto Sans KR';
const C = { navy: '13293D', cheese: 'F2B829', red: 'B5402F', sea: '2F7FAE', ink: '1E2B37', muted: '5F6F7C', bg: 'F3F6F9', card: 'FFFFFF', line: 'DCE3EA', tint: 'E3ECF3', well: 'D7E6F0' };
const W = 13.333, H = 7.5, X0 = 0.6, CW = W - 2 * X0;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = '정승운';
pres.title = '쥐 해적 오브젝트, 아이템 시스템 기획서';
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.defineSlideMaster({
  title: 'CONTENT',
  background: { color: C.bg },
  objects: [
    { text: { text: '쥐 해적 · 오브젝트, 아이템 시스템 기획서', options: { x: X0, y: 7.02, w: 6, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', margin: 0 } } },
    { placeholder: { options: { name: 'kicker', type: 'body', x: X0, y: 0.32, w: 8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.sea, margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: X0, y: 0.6, w: CW, h: 0.62, fontFace: FONT, fontSize: 28, bold: true, color: C.ink, margin: 0, valign: 'middle' }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: X0, y: 1.22, w: CW, h: 0.36, fontFace: FONT, fontSize: 14, color: C.muted, margin: 0 }, text: '' } },
  ],
  slideNumber: { x: W - X0 - 0.5, y: 7.02, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', align: 'right' },
});
pres.defineSlideMaster({ title: 'COVER', background: { color: C.navy } });

const dims = {};
async function loadDims(files) { for (const f of files) { const m = await sharp(P(f)).metadata(); dims[f] = [m.width, m.height]; } }
const shadow = () => ({ type: 'outer', color: '000000', opacity: 0.16, blur: 6, offset: 2, angle: 90 });
function img(s, f, x, y, w, h, o = {}) {
  const [iw, ih] = dims[f];
  const k = Math.min(w / iw, h / ih), ww = iw * k, hh = ih * k;
  const ax = o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5;
  s.addImage({ path: P(f), x: x + (w - ww) * ax, y: y + (h - hh) / 2, w: ww, h: hh, shadow: o.shadow ? shadow() : undefined });
}
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.card, transparency: o.tr || 0 }, line: { color: o.line || o.fill || C.card, width: 0.75, transparency: o.tr || 0 }, shadow: o.flat ? undefined : shadow() });
}
function well(s, x, y, w, h, color = C.well) { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color }, line: { color } }); }
function text(s, t, x, y, w, h, o = {}) {
  s.addText(t, { x, y, w, h, fontFace: FONT, fontSize: o.size || 13, color: o.color || C.ink, bold: !!o.bold, align: o.align || 'left', valign: o.valign || 'top', margin: 0, isTextBox: true, paraSpaceAfter: o.gap || 0, lineSpacingMultiple: o.ls || 1.1, fit: 'none' });
}
function badge(s, n, x, y, d = 0.42) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.cheese }, line: { color: C.cheese } });
  text(s, String(n), x, y, d, d, { size: d > 0.4 ? 15 : 11, bold: true, color: C.navy, align: 'center', valign: 'middle' });
}
function chip(s, t, x, y, w, h, fill, color = C.card, size = 11) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { color: fill } });
  text(s, t, x, y, w, h, { size, bold: true, color, align: 'center', valign: 'middle' });
}
function arrow(s, x1, y1, x2, y2, color = '9AAAB8', w = 1.5) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1, line: { color, width: w, endArrowType: 'triangle' } });
}
function slide(kicker, title, sub) {
  const s = pres.addSlide({ masterName: 'CONTENT' });
  s.addText(kicker, { placeholder: 'kicker' });
  s.addText(title, { placeholder: 'title', align: 'left' });
  if (sub) s.addText(sub, { placeholder: 'sub' });
  return s;
}
const ROLE = { '베네핏': '4F7A52', '장애물': C.red, '은신처': '6B5B95', '컨트롤': C.sea };

const OBJ = [
  ['ui_icons_7.png', '보물상자', '베네핏', '포탄으로 파괴해야 재화 획득', '틈을 봐서 파괴'],
  ['cut/obj_0.png', '보급 상자', '베네핏', '파괴 시 사용 아이템 · 소량 재화', '필요할 때 파괴'],
  ['cut/obj_1.png', '폭탄 상자', '장애물', '충돌 시 피해, 터지면 주변 광역 피해', '적 근처에서 터뜨리기'],
  ['cut/obj_2.png', '암초', '은신처', '적 포탄 차단, 파괴 불가', '뒤로 숨어 장전 시간 확보'],
  ['cut/obj_3.png', '난파선', '은신처', '적 포탄 차단, 일정 피해 후 파괴', '잠깐 엄폐용'],
  ['cut/obj_4.png', '해류', '컨트롤', '한 방향으로 밀림, 순방향 가속', '흐름 타고 이동 · 이탈'],
  ['cut/obj_5.png', '바람 구역', '컨트롤', '함선 · 포탄이 바람 방향으로 밀림', '바람 감안해 조준'],
];
const ITEM = [
  ['cut/item_0.png', '무적기', '일정 시간 무적', '보스 광역 패턴 · 포위 탈출'],
  ['cut/item_1.png', '방어막', '공격을 특정 횟수 막음', '측면 사격 대결 · 위치 잡기'],
  ['cut/item_2.png', '부스터', '빠르게 전진, 부딪힌 적에게 공격', '쾌속정 · 상어 무리 돌파'],
  ['cut/item_3.png', '포탄 강화', '일정 시간 포탄 범위 · 피해 증가', '적이 몰려 있을 때 · 철갑함'],
  ['cut/item_4.png', '사격 속도 강화', '일정 시간 사격 쿨타임 삭제', '보스 약점 · 상어 지침 타이밍'],
];

async function main() {
  await loadDims(['crop/item_scene_169.jpg', 'crop/item_scene.jpg', 'crop/battle_whirl.jpg', 'ui_icons_7.png', 'ui_icons_1.png', 'items_0.png', 'ui_hud_8.png', 'ui_icons_5.png',
    ...[...Array(6).keys()].flatMap((i) => [`cut/obj_${i}.png`, `cut/item_${i}.png`])]);

  // 1. 표지
  {
    const s = pres.addSlide({ masterName: 'COVER' });
    img(s, 'crop/item_scene_169.jpg', 0, 0, W, H);
    card(s, 0.6, 0.6, 6.2, 3.1, { fill: C.navy, tr: 12, flat: true });
    text(s, '쥐 해적 · 시스템 기획서', 0.95, 0.9, 5.5, 0.4, { size: 15, bold: true, color: C.cheese });
    text(s, '오브젝트, 아이템\n시스템 기획서', 0.95, 1.35, 5.6, 1.5, { size: 38, bold: true, color: C.card, ls: 1.05 });
    text(s, '작성자  정승운      2026.10.30      v1.0', 0.95, 3.05, 5.5, 0.4, { size: 13, bold: true, color: 'D6E4EE' });
  }

  // 2. 개요
  {
    const s = slide('개요', '컨트롤 피드백 강화와 스테이지 클리어 보조', '맵에 놓인 오브젝트와 줍는 사용 아이템, 두 축으로 구성');
    const cols = [
      ['오브젝트', '맵에 배치되는 상자 · 장애물 · 은신처 · 구역', ['cut/obj_0.png', 'cut/obj_1.png', 'cut/obj_2.png', 'cut/obj_4.png'], '위치 선점 · 재화 획득 · 장애물 회피'],
      ['사용 아이템', '드랍된 아이템을 주워 F 키로 사용', ['cut/item_0.png', 'cut/item_1.png', 'cut/item_2.png', 'cut/item_3.png'], '원하는 타이밍에 일시적인 강력한 효과'],
    ];
    const cw = (CW - 0.3) / 2;
    cols.forEach(([h, d, icons, role], i) => {
      const x = X0 + i * (cw + 0.3), y = 1.85;
      card(s, x, y, cw, 3.55);
      text(s, h, x + 0.35, y + 0.3, cw - 0.7, 0.45, { size: 20, bold: true });
      text(s, d, x + 0.35, y + 0.8, cw - 0.7, 0.35, { size: 13, color: C.muted });
      icons.forEach((f, k) => { const iw = (cw - 0.7 - 0.45) / 4; well(s, x + 0.35 + k * (iw + 0.15), y + 1.35, iw, 1.35); img(s, f, x + 0.45 + k * (iw + 0.15), y + 1.45, iw - 0.2, 1.15); });
      chip(s, role, x + 0.35, y + 2.95, cw - 0.7, 0.38, i ? C.red : C.sea, C.card, 12);
    });
    card(s, X0, 5.7, CW, 1.05, { fill: C.tint, flat: true });
    text(s, [{ text: '기획의도  ', options: { bold: true, color: C.sea } }, { text: '플레이어의 컨트롤 요소를 추가하여 유저에게 컨트롤을 통해 전달되는 피드백의 효용성을 높이고, 스테이지의 클리어를 조금 더 수월하게 조정함' }],
      X0 + 0.3, 5.7, CW - 0.6, 1.05, { size: 13, valign: 'middle', ls: 1.25 });
  }

  // 3. 오브젝트 세부 시스템
  {
    const s = slide('오브젝트 · 세부 시스템', '오브젝트를 통한 위치 선점의 중요성 강화', '재화 획득의 기회, 피해야 하는 장애물, 전략적 위치 선점에 도움을 주는 오브젝트');
    img(s, 'crop/item_scene.jpg', X0, 1.85, 6.6, 4.4, { shadow: true });
    text(s, '예시 장면: 난파선 뒤에 숨어 고양이 해군 포격을 막는 쥐 해적선 (방어막 사용 중)', X0, 6.35, 6.6, 0.3, { size: 11, color: C.muted });
    const rx = X0 + 6.95, rw = W - X0 - rx;
    const roles = [['베네핏', '보물상자 · 보급 상자', '파괴하면 재화 · 아이템'], ['장애물', '폭탄 상자', '부딪히면 피해, 역이용 가능'], ['은신처', '암초 · 난파선', '적 포탄을 막는 엄폐물'], ['컨트롤', '해류 · 바람 구역', '함선 · 포탄이 밀리는 구역']];
    roles.forEach(([r, n, d], i) => {
      const y = 1.85 + i * 1.02;
      card(s, rx, y, rw, 0.88);
      chip(s, r, rx + 0.2, y + 0.27, 1.05, 0.34, ROLE[r], C.card, 11);
      text(s, n, rx + 1.45, y + 0.12, rw - 1.6, 0.34, { size: 14, bold: true });
      text(s, d, rx + 1.45, y + 0.47, rw - 1.6, 0.3, { size: 12, color: C.muted });
    });
    card(s, rx, 5.98, rw, 0.62, { fill: C.tint, flat: true });
    text(s, '오브젝트는 적에게도 똑같이 작용 → 적을 유인해 역이용 가능', rx + 0.2, 5.98, rw - 0.4, 0.62, { size: 12, bold: true, color: C.sea, valign: 'middle' });
  }

  // 4. 오브젝트 종류
  {
    const s = slide('오브젝트 · 종류 예시', '역할별 오브젝트 7종', '베네핏 · 장애물 · 은신처 · 컨트롤 (확정 수치는 테이블)');
    const w = 2.9, g = (CW - 4 * w) / 3, h = 2.4;
    OBJ.forEach(([f, n, r, act, tip], i) => {
      const row = Math.floor(i / 4), col = i % 4;
      const x = X0 + col * (w + g) + (row ? (w + g) / 2 : 0), y = 1.85 + row * (h + 0.15);
      card(s, x, y, w, h);
      well(s, x + 0.12, y + 0.12, w - 0.24, 1.0);
      img(s, f, x + 0.3, y + 0.17, w - 0.6, 0.9);
      text(s, n, x + 0.2, y + 1.22, 1.7, 0.34, { size: 14, bold: true });
      chip(s, r, x + w - 1.1, y + 1.25, 0.9, 0.27, ROLE[r], C.card, 9);
      text(s, act, x + 0.2, y + 1.6, w - 0.4, 0.3, { size: 12 });
      text(s, '→ ' + tip, x + 0.2, y + 1.92, w - 0.4, 0.3, { size: 11, color: C.sea, bold: true });
    });
  }

  // 5. 배치 규칙
  {
    const s = slide('오브젝트 · 배치 규칙', '웨이브마다 생기는 보물상자, 맵에 고정된 나머지', '무한 맵의 구역 생성 시 섬과 함께 배치, 출발 지점 주변은 비움');
    const cols = [
      ['웨이브마다 생성', C.sea, [['ui_icons_7.png', '보물상자']], '웨이브 시작 시 일정 수 생성\n파괴해야 재화 획득'],
      ['맵 구역에 고정 배치', C.navy, [['cut/obj_0.png', '보급 상자'], ['cut/obj_1.png', '폭탄 상자'], ['cut/obj_2.png', '암초'], ['cut/obj_3.png', '난파선'], ['cut/obj_4.png', '해류'], ['cut/obj_5.png', '바람 구역']], '구역이 생길 때 함께 배치\n멀어지면 삭제, 돌아오면 같은 배치'],
    ];
    const ws = [3.6, CW - 3.6 - 0.3];
    let x = X0;
    cols.forEach(([h, col, items, d], i) => {
      const w = ws[i], y = 1.85;
      card(s, x, y, w, 3.5);
      chip(s, h, x + 0.3, y + 0.3, w - 0.6, 0.42, col, C.card, 13);
      const n = items.length, iw = Math.min(1.3, (w - 0.6 - (n - 1) * 0.15) / n);
      const sx = x + (w - (n * iw + (n - 1) * 0.15)) / 2;
      items.forEach(([f, name], k) => {
        const ix = sx + k * (iw + 0.15);
        well(s, ix, y + 0.95, iw, 1.25); img(s, f, ix + 0.08, y + 1.02, iw - 0.16, 1.1);
        text(s, name, ix - 0.1, y + 2.27, iw + 0.2, 0.3, { size: 11, bold: true, align: 'center' });
      });
      text(s, d, x + 0.3, y + 2.68, w - 0.6, 0.7, { size: 12, color: C.muted, align: 'center', ls: 1.2 });
      x += w + 0.3;
    });
    const notes = [['ui_icons_5.png', '스테이지마다 오브젝트 구성 비율 다름', '예: 폭풍 해협 = 바람 구역 많음, 해적 소굴 = 난파선 많음'], ['ui_hud_8.png', '적에게도 똑같이 작용', '폭탄 상자 폭발 · 해류 · 바람이 적 함선에도 적용']];
    notes.forEach(([ic, h, d], i) => {
      const nx = X0 + i * (CW / 2 + 0.15), nw = CW / 2 - 0.15, y = 5.6;
      card(s, nx, y, nw, 1.1);
      img(s, ic, nx + 0.2, y + 0.2, 0.7, 0.7);
      text(s, h, nx + 1.1, y + 0.18, nw - 1.3, 0.35, { size: 14, bold: true });
      text(s, d, nx + 1.1, y + 0.58, nw - 1.3, 0.35, { size: 12, color: C.muted });
    });
  }

  // 6. 사용 아이템 세부 시스템
  {
    const s = slide('사용 아이템 · 세부 시스템', '원하는 타이밍에 쓰는 일시적인 강력한 효과', '전략적 선택의 재미 부여, 컨트롤을 통한 스테이지 돌파 가능성 상승');
    const flow = [['ui_hud_8.png', '적 · 보급 상자 파괴', '일정 확률로 드랍'], ['cut/item_5.png', '바다 위에 떠 있음', '일정 시간 뒤 깜빡이며 사라짐'], ['cut/item_1.png', '줍기', '1개만 소지, 새로 주우면 교체'], ['cut/item_2.png', 'F 키로 사용', '원하는 타이밍에 발동']];
    const fw = 2.75, fg = (CW - 4 * fw) / 3;
    flow.forEach(([ic, h, d], i) => {
      const x = X0 + i * (fw + fg), y = 1.9;
      card(s, x, y, fw, 2.6);
      badge(s, i + 1, x + 0.18, y + 0.18, 0.4);
      img(s, ic, x + fw / 2 - 0.55, y + 0.35, 1.1, 1.1);
      text(s, h, x + 0.15, y + 1.6, fw - 0.3, 0.38, { size: 15, bold: true, align: 'center' });
      text(s, d, x + 0.15, y + 2.0, fw - 0.3, 0.5, { size: 12, color: C.muted, align: 'center' });
      if (i < 3) arrow(s, x + fw + 0.04, y + 1.3, x + fw + fg - 0.04, y + 1.3);
    });
    const rules = [['소지', '동시에 하나 이상 소지 불가능'], ['교체', '새 아이템 획득 시 기존 아이템은 사라짐 → 쓸지 아낄지 고민'], ['유지', '웨이브 사이 유지, 스테이지 종료 시 소멸'], ['범위', '인게임 전용, 아웃게임 (함선 · 장비) 과 연결 없음']];
    rules.forEach(([k, v], i) => {
      const x = X0 + (i % 2) * (CW / 2 + 0.15), y = 4.85 + Math.floor(i / 2) * 0.95, w = CW / 2 - 0.15;
      card(s, x, y, w, 0.8);
      chip(s, k, x + 0.2, y + 0.22, 0.85, 0.36, C.navy, C.card, 11);
      text(s, v, x + 1.25, y, w - 1.4, 0.8, { size: 13, valign: 'middle' });
    });
  }

  // 7. 사용 아이템 종류
  {
    const s = slide('사용 아이템 · 종류 예시', '상황에 맞춰 고르는 아이템 5종', '효과는 일시적, 사용 타이밍이 핵심 (지속 시간 · 수치는 테이블)');
    const w = (CW - 4 * 0.2) / 5;
    ITEM.forEach(([f, n, eff, when], i) => {
      const x = X0 + i * (w + 0.2), y = 1.85;
      card(s, x, y, w, 4.9);
      well(s, x + 0.15, y + 0.15, w - 0.3, 1.9, 'E6EEF5');
      img(s, f, x + 0.35, y + 0.3, w - 0.7, 1.6);
      text(s, n, x + 0.2, y + 2.25, w - 0.4, 0.4, { size: 17, bold: true, align: 'center' });
      text(s, eff, x + 0.2, y + 2.75, w - 0.4, 0.8, { size: 13, align: 'center', ls: 1.15 });
      s.addShape(pres.shapes.LINE, { x: x + 0.3, y: y + 3.65, w: w - 0.6, h: 0.001, line: { color: C.line, width: 0.75 } });
      text(s, '쓰기 좋은 상황', x + 0.2, y + 3.78, w - 0.4, 0.28, { size: 10, bold: true, color: C.sea, align: 'center' });
      text(s, when, x + 0.2, y + 4.08, w - 0.4, 0.7, { size: 12, color: C.muted, align: 'center', ls: 1.15 });
    });
  }

  // 8. UI / 연출
  {
    const s = slide('사용 아이템 · UI / 연출', '슬롯 하나와 함선 주변 효과로 상태 표시', 'HUD 아이템 슬롯 1칸 + 사용 중 남은 시간 게이지');
    const sx = X0, sw = 7.2, sh = sw * 9 / 16;
    img(s, 'crop/battle_whirl.jpg', sx, 1.85, sw, sh, { shadow: true });
    // HUD 슬롯 목업: 화면 아래 가운데
    const bx = sx + sw / 2 - 0.55, by = 1.85 + sh - 1.35;
    card(s, bx, by, 1.1, 1.1, { fill: '3B2A1C', line: 'C9A03A' });
    img(s, 'cut/item_3.png', bx + 0.12, by + 0.1, 0.86, 0.8);
    chip(s, 'F', bx + 0.78, by - 0.12, 0.42, 0.32, C.cheese, C.navy, 12);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by + 1.14, w: 1.1, h: 0.1, rectRadius: 0.05, fill: { color: '1B2A36' }, line: { color: '1B2A36' } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: bx, y: by + 1.14, w: 0.7, h: 0.1, rectRadius: 0.05, fill: { color: C.cheese }, line: { color: C.cheese } });
    text(s, '화면 예시 위에 아이템 슬롯 목업 (포탄 강화 사용 중)', sx, 6.0, sw, 0.3, { size: 11, color: C.muted });
    const rx = sx + sw + 0.35, rw = W - X0 - rx;
    const rows = [
      ['슬롯', '아이콘 + F 키 표시, 비어 있으면 회색'],
      ['게이지', '사용 중 남은 시간 (방어막은 남은 횟수) 표시'],
      ['함선 효과', '무적 = 금빛, 방어막 = 하늘색 버블, 부스터 = 뒤쪽 물살 · 불꽃'],
      ['교체', '버려진 아이템 아이콘이 짧게 떠올랐다 사라짐'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 1.85 + i * 1.03;
      card(s, rx, y, rw, 0.9);
      chip(s, k, rx + 0.2, y + 0.27, 1.05, 0.36, C.navy, C.card, 11);
      text(s, v, rx + 1.4, y, rw - 1.55, 0.9, { size: 12, valign: 'middle' });
    });
  }

  // 9. 데이터 테이블
  {
    const s = slide('데이터 테이블', '확정 수치는 테이블로 분리', 'Pirat_Table/오브젝트 아이템 테이블.xlsx (아래 수치는 초안, 플레이 테스트로 조정)');
    const sheets = [['Object', '오브젝트별 체력 · 피해 · 반지름 · 미는 힘 · 드랍'], ['Use_Item', '아이템별 지속 시간 · 효과 수치 · 드랍 가중치'], ['Drop', '적 · 보물상자 · 보급 상자별 재화 · 아이템 확률'], ['Value_Type', '특수 효과 정의 (무적 · 방어막 · 포탄 차단 등)'], ['Item_Config', '소지 수 · 드랍 유지 시간 · 보물상자 수']];
    const lw = 4.6;
    card(s, X0, 1.85, lw, 4.9);
    sheets.forEach(([k, v], i) => {
      const y = 2.05 + i * 0.92;
      chip(s, k, X0 + 0.25, y, 1.6, 0.36, C.sea, C.card, 11);
      text(s, v, X0 + 0.25, y + 0.42, lw - 0.5, 0.4, { size: 12, color: C.muted });
    });
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    const hdr = ['아이템', '지속 (초)', '효과', '드랍 가중치'];
    const data = [['무적기', '4', '무적', '10'], ['방어막', '-', '3회 방어', '25'], ['부스터', '1.2', '속도 ×2.6, 충돌 피해 40', '25'], ['포탄 강화', '8', '피해 ×1.5, 폭발 반지름 60', '20'], ['사격 속도 강화', '6', '장전 0.25초 고정', '20']];
    const rows = [hdr.map((t) => ({ text: t, options: { bold: true, color: C.card, fill: { color: C.navy } } })), ...data.map((r) => r.map((t) => ({ text: t })))];
    s.addTable(rows, { x: rx, y: 1.85, w: rw, colW: [1.7, 1.1, rw - 1.7 - 1.1 - 1.3, 1.3], fontFace: FONT, fontSize: 12, color: C.ink, align: 'center', valign: 'middle', rowH: 0.5, border: { type: 'solid', color: C.line, pt: 0.75 }, fill: { color: C.card } });
    text(s, 'Use_Item 시트 초안 예시', rx, 5.0, rw, 0.3, { size: 11, color: C.muted });
    card(s, rx, 5.45, rw, 1.3, { fill: C.tint, flat: true });
    text(s, [{ text: '드랍 초안  ', options: { bold: true, color: C.sea, breakLine: true } }, { text: '일반 적 6% · 보급 상자 80% 확률로 사용 아이템, 종류는 드랍 가중치 비율\n보물상자는 재화만 (아이템 없음), 보스 확정 드랍 없음' }],
      rx + 0.25, 5.55, rw - 0.5, 1.1, { size: 12, ls: 1.25 });
  }

  await pres.writeFile({ fileName: OUT });
  await koreanWrap(OUT);
  console.log('saved', OUT);
}

// 한글이 글자 중간에서 잘리지 않게: 글자 언어 ko-KR + 문단 eaLnBrk="0" (어절 단위 줄바꿈)
async function koreanWrap(file) {
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
