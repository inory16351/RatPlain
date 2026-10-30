// 쥐 해적 기획서 PPT 공통 틀: 색 · 레이아웃 · 그리기 도구 · 한글 줄바꿈 후처리
// 그림은 비율에 맞게 미리 자른 것만 쓰고 contain 으로만 넣음 (pptxgenjs cover 는 PPT 에서 늘어남)
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');

const ART = __dirname;
const SPR = path.join(ART, '..', '..', 'pirate', 'art', 'sprites');
const FONT = 'Noto Sans KR';
const C = { navy: '13293D', cheese: 'F2B829', red: 'B5402F', sea: '2F7FAE', green: '4F7A52', purple: '6B5B95', ink: '1E2B37', muted: '5F6F7C', bg: 'F3F6F9', card: 'FFFFFF', line: 'DCE3EA', tint: 'E3ECF3', well: 'D7E6F0' };
const W = 13.333, H = 7.5, X0 = 0.6, CW = W - 2 * X0;
const P = (f) => (f.includes('/') ? path.join(ART, f) : path.join(SPR, f));

function kit(docTitle) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = '정승운';
  pres.title = docTitle;
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.defineSlideMaster({
    title: 'CONTENT',
    background: { color: C.bg },
    objects: [
      { text: { text: docTitle, options: { x: X0, y: 7.02, w: 7, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', margin: 0 } } },
      { placeholder: { options: { name: 'kicker', type: 'body', x: X0, y: 0.32, w: 8, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.sea, margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: X0, y: 0.6, w: CW, h: 0.62, fontFace: FONT, fontSize: 28, bold: true, color: C.ink, margin: 0, valign: 'middle' }, text: '' } },
      { placeholder: { options: { name: 'sub', type: 'body', x: X0, y: 1.22, w: CW, h: 0.36, fontFace: FONT, fontSize: 14, color: C.muted, margin: 0 }, text: '' } },
    ],
    slideNumber: { x: W - X0 - 0.5, y: 7.02, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: '8A99A6', align: 'right' },
  });
  pres.defineSlideMaster({ title: 'COVER', background: { color: C.navy } });

  const dims = {};
  const shadow = () => ({ type: 'outer', color: '000000', opacity: 0.16, blur: 6, offset: 2, angle: 90 });
  const k = {
    pres, dims,
    async load(files) { for (const f of files) { const m = await sharp(P(f)).metadata(); dims[f] = [m.width, m.height]; } },
    img(s, f, x, y, w, h, o = {}) {
      const [iw, ih] = dims[f];
      const r = Math.min(w / iw, h / ih), ww = iw * r, hh = ih * r;
      const ax = o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5;
      s.addImage({ path: P(f), x: x + (w - ww) * ax, y: y + (h - hh) / 2, w: ww, h: hh, shadow: o.shadow ? shadow() : undefined });
    },
    card(s, x, y, w, h, o = {}) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.card, transparency: o.tr || 0 }, line: { color: o.line || o.fill || C.card, width: 0.75, transparency: o.tr || 0 }, shadow: o.flat ? undefined : shadow() });
    },
    well(s, x, y, w, h, color = C.well) { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color }, line: { color } }); },
    text(s, t, x, y, w, h, o = {}) {
      s.addText(t, { x, y, w, h, fontFace: FONT, fontSize: o.size || 13, color: o.color || C.ink, bold: !!o.bold, align: o.align || 'left', valign: o.valign || 'top', margin: 0, isTextBox: true, paraSpaceAfter: o.gap || 0, lineSpacingMultiple: o.ls || 1.1, fit: 'none' });
    },
    badge(s, n, x, y, d = 0.42) {
      s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.cheese }, line: { color: C.cheese } });
      k.text(s, String(n), x, y, d, d, { size: d > 0.4 ? 15 : 11, bold: true, color: C.navy, align: 'center', valign: 'middle' });
    },
    chip(s, t, x, y, w, h, fill, color = C.card, size = 11) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: { color: fill } });
      k.text(s, t, x, y, w, h, { size, bold: true, color, align: 'center', valign: 'middle' });
    },
    arrow(s, x1, y1, x2, y2, color = '9AAAB8', w = 1.5) {
      s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, flipH: x2 < x1, flipV: y2 < y1, line: { color, width: w, endArrowType: 'triangle' } });
    },
    line(s, x1, y1, x2, y2, color = '9AAAB8', w = 1.5) {
      s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001, line: { color, width: w } });
    },
    slide(kicker, title, sub) {
      const s = pres.addSlide({ masterName: 'CONTENT' });
      s.addText(kicker, { placeholder: 'kicker' });
      s.addText(title, { placeholder: 'title', align: 'left' });
      if (sub) s.addText(sub, { placeholder: 'sub' });
      return s;
    },
    // 아이콘 동그라미 + 굵은 제목 + 설명
    iconRow(s, icon, head, body, x, y, w, o = {}) {
      const d = o.d || 0.62;
      s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: o.ring || C.tint }, line: { color: o.ring || C.tint } });
      k.img(s, icon, x + d * 0.14, y + d * 0.14, d * 0.72, d * 0.72);
      k.text(s, head, x + d + 0.18, y - 0.02, w - d - 0.18, 0.34, { size: o.hs || 14, bold: true });
      k.text(s, body, x + d + 0.18, y + 0.32, w - d - 0.18, o.bh || 0.6, { size: o.bs || 12, color: C.muted });
    },
    async save(out) {
      await pres.writeFile({ fileName: out });
      await koreanWrap(out);
      console.log('saved', out);
    },
  };
  return k;
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

module.exports = { kit, C, W, H, X0, CW, FONT };
