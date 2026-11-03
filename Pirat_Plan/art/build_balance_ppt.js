// 쥐 해적 밸런스 분석 기획서 PPT → Pirat_Plan/쥐해적_밸런스분석기획서.pptx
// 수치: Pirat_Plan/art/balance/balance_model.js (Unity Pirate_1 코드 · 프리팹 · ShipyardDB 기준) 가 만든 model.json
// 사용: node Pirat_Plan/art/balance/balance_model.js → NODE_PATH=<pptxgenjs · sharp · jszip 설치 폴더>/node_modules node Pirat_Plan/art/build_balance_ppt.js
const path = require('path');
const { kit, C, W, X0, CW, FONT } = require('./ppt_kit');
const M = require('./balance/model.json');

const OUT = path.join(__dirname, '..', '쥐해적_밸런스분석기획서.pptx');
const k = kit('쥐 해적 · 밸런스 분석 기획서');
const { pres } = k;
const LC = { S: C.sea, M: C.green, H: C.red };
const LN = { S: '쾌속선', M: '다목적함', H: '중포함' };
const SEA = M.seas.map((s) => `${s.si + 1}. ${s.name}`);
const SEA_SHORT = M.seas.map((s) => `${s.si + 1}바다`);
const n0 = (v) => Math.round(v).toLocaleString('en-US');

// 차트 공통 (축 · 글자 같은 모양)
function chartOpt(o) {
  return {
    catAxisLabelFontFace: '+mn-lt', catAxisLabelFontSize: 11, catAxisLabelColor: C.ink,
    valAxisLabelFontFace: '+mn-lt', valAxisLabelFontSize: 10, valAxisLabelColor: C.muted,
    valGridLine: { color: 'DCE3EA', size: 0.75 }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 't', legendFontFace: '+mn-lt', legendFontSize: 11, legendColor: C.ink,
    dataLabelFontFace: '+mn-lt', dataLabelFontSize: 10, dataLabelColor: C.ink,
    titleFontFace: '+mn-lt', titleFontSize: 13, titleColor: C.ink,
    ...o,
  };
}
// 표 공통: 첫 줄 머리, 나머지 흰 바탕
function table(s, head, rows, x, y, w, colW, o = {}) {
  const hd = head.map((t) => ({ text: t, options: { bold: true, color: C.card, fill: { color: C.navy }, align: 'center', valign: 'middle' } }));
  const body = rows.map((r, i) => r.map((c, j) => {
    const cell = typeof c === 'object' && c !== null && c.text !== undefined ? c : { text: String(c) };
    return { text: cell.text, options: { fill: { color: cell.fill || (i % 2 ? 'F7FAFC' : C.card) }, color: cell.color || C.ink, bold: !!cell.bold, align: j === 0 ? 'left' : 'center', valign: 'middle' } };
  }));
  s.addTable([hd, ...body], { x, y, w, colW, fontFace: FONT, fontSize: o.size || 11, rowH: o.rowH || 0.36, border: { type: 'solid', pt: 0.75, color: C.line }, margin: [0, 0.06, 0, 0.06] });
}
function note(s, head, lines, x, y, w, h, o = {}) {
  k.card(s, x, y, w, h, { fill: o.fill });
  k.text(s, head, x + 0.25, y + 0.2, w - 0.5, 0.36, { size: 15, bold: true, color: o.hc || C.ink });
  k.text(s, lines.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < lines.length - 1 } })), x + 0.25, y + 0.66, w - 0.5, h - 0.8, { size: o.size || 12, gap: 6, ls: 1.15, color: o.color || C.ink });
}

async function main() {
  await k.load(['crop/battle_boss.jpg', 'crop/key_art.jpg', 'ship_galley_0.png', 'ship_dreadnought_0.png', 'ship_carrier_0.png', 'e_cat_ironclad_0.png', 'items_1.png', 'ui_hud_9.png', 'ui_icons_8.png', 'parts_a_8.png', 'e_cat_frigate_0.png', 'boss_fortress_0.png', 'e_shark_0.png']);
  const S = M.seas, F = M.fit, P = M.prop, SC = M.scen;
  const by = M.byLine;

  // 1. 표지
  {
    const s = pres.addSlide({ masterName: 'COVER' });
    k.img(s, 'crop/battle_boss.jpg', 0, 0, W, 7.5);
    k.card(s, 0.6, 0.6, 6.4, 3.1, { fill: C.navy, tr: 12, flat: true });
    k.text(s, '쥐 해적 · 분석 기획서', 0.95, 0.9, 5.7, 0.4, { size: 15, bold: true, color: C.cheese });
    k.text(s, '밸런스 분석 ·\n난이도 곡선 정리', 0.95, 1.35, 5.9, 1.5, { size: 38, bold: true, color: C.card, ls: 1.05 });
    k.text(s, '작성자  정승운      2026.11.03      v1.0', 0.95, 3.05, 5.7, 0.4, { size: 13, bold: true, color: 'D6E4EE' });
  }

  // 2. 분석 개요
  {
    const s = k.slide('분석 개요', 'Unity 빌드 수치로 8바다 난이도 · 성장 · 경제 곡선 계산', '대상: Pirate_1 (Battle · Port 장면), 전투 코드 · 적 프리팹 · ShipyardDB 에셋 값을 그대로 사용');
    const lw = 6.1;
    k.card(s, X0, 1.85, lw, 4.9);
    k.text(s, '사용 지표', X0 + 0.3, 2.05, lw - 0.6, 0.4, { size: 17, bold: true });
    const idx = [
      ['ui_hud_9.png', '적 체력 총량', '바다 1회의 모든 웨이브 + 보스 + 호위 체력 합 (바다 배율 · 완화 배율 · 장갑 반영, 폭탄통 제외)'],
      ['ui_icons_8.png', '전멸 시간', '적 체력 총량 ÷ 내 화력 (초). 명중 100% 가정 → 실제 시간은 약 2배'],
      ['parts_a_8.png', '위험도', '가장 센 웨이브의 초당 피해 ÷ 내 유효 체력 (초당 체력 손실 %)'],
      ['items_1.png', '1회 수입', '격침 전리품 + 보물상자 기댓값 (금화 · 목재), 콤보 · 장비 보너스 제외'],
    ];
    idx.forEach(([ic, h, b], i) => k.iconRow(s, ic, h, b, X0 + 0.3, 2.6 + i * 1.0, lw - 0.6, { d: 0.6, bh: 0.6, bs: 11.5 }));
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    note(s, '계산 가정', [
      '내 배: 바다별 추천 단계 함선, 같은 티어 일반 장비 전 슬롯 장착',
      '선원 4명 (장전 8% 단축), 희귀 · 전설 고유 장비 제외',
      '내 화력 = 한쪽 뱃전 일제 사격 + 자동 무기 (어뢰 · 함재기 명중 50%)',
      '적 초당 피해 = 대포 · 선수포 · 박격포 · 물기 전부 명중 상한',
      '보스 소환 적 · 맵 오브젝트 (보급 상자 · 난파선) 제외',
      '수치 출처: GameManager · EnemyShip · Shipyard 코드, Battle 장면 인스펙터 값',
    ], rx, 1.85, rw, 4.9, { size: 12.5 });
  }

  // 3. 핵심 요약
  {
    const s = k.slide('핵심 요약', '적 성장이 내 성장보다 10배 빠름, 6바다에서 난이도 벽', '1 → 8바다 기준. 상세 수치는 이후 장');
    const cards = [
      ['×50', '적 체력 총량 급증', `적 ${n0(S[0].hpPool)} → ${n0(S[7].hpPool)}, 내 화력 ${P[0].avgDps} → ${P[7].avgDps}. 전멸 시간 ${P[0].ttk}초 → ${P[7].ttk}초`, C.red],
      ['×3.1', '6바다 철갑 함대 급등', `5바다 ${n0(S[4].hpPool)} → 6바다 ${n0(S[5].hpPool)}, 추천 단계는 3단계 그대로. 위험도 ${P[4].danger}% → ${P[5].danger}%`, C.purple],
      ['×2', '중포함 4단계 독주', `치즈 대왕 화력 ${by.H[4].g0.dps} (쾌속선 ${by.S[4].g0.dps} · 다목적 ${by.M[4].g0.dps}). 5단계 항모 ${by.H[5].g0.dps} 로 역전`, C.sea],
      ['목재 부족', '후반 경제 병목', `금화는 매 바다 여유, 목재는 8바다 직전 누적 ${n0(M.cum[7].havePlank)} / 필요 ${n0(M.cum[7].needPlank)}`, C.green],
    ];
    const cw = (CW - 0.6) / 4;
    cards.forEach(([big, h, b, col], i) => {
      const x = X0 + i * (cw + 0.2), y = 1.85;
      k.card(s, x, y, cw, 4.9);
      k.text(s, big, x + 0.25, y + 0.35, cw - 0.5, 0.9, { size: 34, bold: true, color: col });
      k.text(s, h, x + 0.25, y + 1.35, cw - 0.5, 0.4, { size: 16, bold: true });
      k.text(s, b, x + 0.25, y + 1.9, cw - 0.5, 1.9, { size: 12.5, color: C.muted, ls: 1.25 });
    });
    k.img(s, 'e_cat_ironclad_0.png', X0 + cw + 0.2 + 0.3, 5.75, cw - 0.6, 0.85);
    k.img(s, 'ship_dreadnought_0.png', X0 + 2 * (cw + 0.2) + 0.3, 5.75, cw - 0.6, 0.85);
    k.img(s, 'items_1.png', X0 + 3 * (cw + 0.2) + 0.3, 5.75, cw - 0.6, 0.85);
    k.img(s, 'boss_fortress_0.png', X0 + 0.3, 5.75, cw - 0.6, 0.85);
  }

  // 4. 바다 구성
  {
    const s = k.slide('현황 · 바다 구성', '8바다 = 배율 1.0 → 5.2, 웨이브 3 → 6 + 보스', '3바다부터 2바다마다 웨이브 +1 (마지막 웨이브 + 배 1척씩 추가), 보스 웨이브는 1웨이브 첫 두 척이 호위');
    const TR = { '': '-', fog: '안개', storm: '폭풍', whirl: '소용돌이' };
    const rows = S.map((x) => [SEA[x.si], x.mult.toFixed(1), `${x.rec}단계`, x.waves, TR[x.trait], x.boss, n0(x.hpPool), n0(x.bossHp), `×${x.dmgMult}`, `${n0(x.gold)} / ${n0(x.plank)}`]);
    table(s, ['바다', '배율', '추천 함선', '웨이브', '특성', '보스', '적 체력 총량', '보스 체력', '적 피해 배율', '1회 수입 (금화 / 목재)'], rows, X0, 1.85, CW, [2.3, 0.6, 0.95, 0.7, 0.85, 1.75, 1.2, 1.0, 1.05, 1.733], { rowH: 0.36, size: 11.5 });
    note(s, '배율이 붙는 곳', [
      '적 체력 = 프리팹 체력 × 바다 배율 × 바다 완화 (0.75 ~ 1) × 웨이브 완화 (0.85 ~ 1)',
      '적 피해 = 1 + (배율 − 1) × 0.5 → 8바다 3.1배. 보상 = 1 + (배율 − 1) × 0.8 → 8바다 4.36배',
      '보스 체력: 1 · 2바다만 0.8 · 0.9 완화, 보스 피해: 1 ~ 5바다 0.8 ~ 0.9 완화',
    ], X0, 5.3, CW, 1.5, { size: 12 });
  }

  // 5. 성장 곡선 비교
  {
    const s = k.slide('곡선 1 · 성장 비교', '적은 50배, 나는 4.5배 성장 → 바다마다 벌어지는 격차', '1바다 = 1 로 맞춘 배수. 내 수치는 추천 단계 3갈래 평균 (일반 장비)');
    const rel = (a) => a.map((v) => +(v / a[0]).toFixed(2));
    const data = [
      { name: '적 체력 총량', labels: SEA_SHORT, values: rel(S.map((x) => x.hpPool)) },
      { name: '적 최대 초당 피해', labels: SEA_SHORT, values: rel(S.map((x) => x.peakDps)) },
      { name: '내 화력', labels: SEA_SHORT, values: rel(P.map((x) => x.avgDps)) },
      { name: '내 유효 체력', labels: SEA_SHORT, values: rel(P.map((x) => x.avgEhp)) },
    ];
    const cw = 8.1;
    k.card(s, X0, 1.85, cw, 4.9);
    s.addChart(pres.charts.LINE, data, chartOpt({ x: X0 + 0.15, y: 1.95, w: cw - 0.3, h: 4.7, chartColors: [C.red, C.cheese, C.sea, C.green], lineSize: 2.5, lineDataSymbolSize: 7, valAxisMinVal: 0, showValue: false }));
    const rx = X0 + cw + 0.3, rw = W - X0 - rx;
    note(s, '읽는 법', [
      `적 체력 총량 8바다 ×${(S[7].hpPool / S[0].hpPool).toFixed(1)}, 내 화력 ×${(P[7].avgDps / P[0].avgDps).toFixed(1)}`,
      '적 성장 = 배율 (×5.2) × 적 구성 (순찰선 60 → 철갑함 260) × 웨이브 수 (×2) 가 겹쳐 곱해짐',
      '내 성장 = 함선 단계 (화력 약 ×4) 하나뿐, 같은 단계 안에선 장비 등급 차 약 15 ~ 35%',
      '결과: 같은 함선 단계로 넘는 3 → 4, 5 → 6바다 구간에서 격차가 크게 뜀',
    ], rx, 1.85, rw, 4.9, { size: 12.5 });
  }

  // 6. 전멸 시간 곡선
  {
    const s = k.slide('곡선 2 · 전멸 시간', '전투 시간이 1바다 53초 → 8바다 약 10분으로 늘어남', '명중 100% 이론값. 실제 명중률 50% 가정 시 1바다 약 2분, 8바다 약 20분');
    const data = ['S', 'M', 'H'].map((L) => ({ name: `${LN[L]} (추천 단계)`, labels: SEA_SHORT, values: F.map((f) => f[L].ttk) }));
    const cw = 8.1;
    k.card(s, X0, 1.85, cw, 4.9);
    s.addChart(pres.charts.BAR, data, chartOpt({ x: X0 + 0.15, y: 1.95, w: cw - 0.3, h: 4.7, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60, chartColors: [LC.S, LC.M, LC.H], valAxisTitle: '초', showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: C.muted, valAxisTitleFontFace: '+mn-lt' }));
    const rx = X0 + cw + 0.3, rw = W - X0 - rx;
    table(s, ['바다', '평균 전멸', '보스 전멸'], S.map((x, i) => [SEA_SHORT[i], `${P[i].ttk}초`, `${Math.round(x.bossHp / P[i].avgDps)}초`]), rx, 1.85, rw, [rw * 0.36, rw * 0.32, rw * 0.32], { rowH: 0.3 });
    note(s, '진단', ['3바다 · 6바다에서 전멸 시간 3배로 뜀', '2 · 5바다는 쉬어 가는 구간 (상어 한 방 · 상어 보스)', '보스는 25 ~ 75초로 고른 편 → 웨이브 쪽이 문제'], rx, 4.7, rw, 2.05, { size: 11.5 });
  }

  // 7. 위험도 곡선
  {
    const s = k.slide('곡선 3 · 위험도', '받는 피해도 6바다 정점 → 7 · 8바다는 오히려 내려감', '위험도 = 가장 센 웨이브 초당 피해 ÷ 내 유효 체력 (전부 맞을 때 1초에 깎이는 체력 %)');
    const danger = (L) => F.map((f, i) => +(S[i].peakDps / by[L][S[i].rec].g0.ehp * 100).toFixed(1));
    const data = [
      ...['S', 'M', 'H'].map((L) => ({ name: LN[L], labels: SEA_SHORT, values: danger(L) })),
      { name: '보스 웨이브 (평균)', labels: SEA_SHORT, values: S.map((x, i) => +(x.bossWaveDps / P[i].avgEhp * 100).toFixed(1)) },
    ];
    const cw = 8.1;
    k.card(s, X0, 1.85, cw, 4.9);
    s.addChart(pres.charts.LINE, data, chartOpt({ x: X0 + 0.15, y: 1.95, w: cw - 0.3, h: 4.7, chartColors: [LC.S, LC.M, LC.H, C.cheese], lineSize: 2.5, lineDataSymbolSize: 7, valAxisMinVal: 0, valAxisLabelFormatCode: '0"%"' }));
    const rx = X0 + cw + 0.3, rw = W - X0 - rx;
    note(s, '진단', [
      `1바다 ${P[0].danger}% → 4바다 ${P[3].danger}% → 6바다 ${P[5].danger}% (정점)`,
      `7 · 8바다는 함선 4 · 5단계 유효 체력 급증 (평균 ${P[5].avgEhp} → ${P[7].avgEhp}) 으로 하락`,
      '쾌속선이 모든 바다에서 가장 위험 → 속도 · 회피로 맞지 않는 플레이 전제',
      '2 · 5바다 보스 웨이브는 거대 상어 단독 물기라 위험도 낮음',
    ], rx, 1.85, rw, 4.9, { size: 12.5 });
  }

  // 8. 웨이브 곡선 (한 바다 안)
  {
    const s = k.slide('곡선 4 · 바다 안 웨이브', '웨이브마다 적 체력 2 ~ 4배로 오르는 계단형 구조', '칸 = 웨이브 적 체력 합 (폭탄통 제외). 색이 진할수록 그 바다 안에서 무거운 웨이브');
    const maxW = Math.max(...S.map((x) => x.waves));
    const head = ['바다', ...Array.from({ length: maxW }, (_, i) => `${i + 1}웨이브`), '보스 + 호위', '처음 → 끝'];
    const heat = ['EAF2F8', 'C9DDEC', '9CC0DC', '6A9DC6', '2F7FAE'];
    const rows = S.map((x) => {
      const hp = x.waveRows.map((r) => r.hp), mx = Math.max(...hp, x.bossHp + x.escHp);
      const cell = (v) => { const q = Math.min(4, Math.floor((v / mx) * 4.999)); return { text: n0(v), fill: heat[q], color: q >= 3 ? C.card : C.ink, bold: q === 4 }; };
      return [SEA[x.si], ...Array.from({ length: maxW }, (_, i) => (i < hp.length ? cell(hp[i]) : { text: '-', color: 'B8C3CC' })), cell(x.bossHp + x.escHp), `×${(hp[hp.length - 1] / hp[0]).toFixed(1)}`];
    });
    table(s, head, rows, X0, 1.85, CW, [2.55, ...Array(maxW).fill(1.0), 1.4, 2.183], { rowH: 0.36, size: 11.5 });
    note(s, '진단', [
      '웨이브 완화 0.85 → 0.93 → 1 + 적 수 증가로 한 바다 안에서 2 ~ 4배 상승, 늘어난 웨이브 (4 ~ 6) 는 완화 없이 1',
      `8바다 1웨이브 (${n0(S[7].waveRows[0].hp)}) 가 2웨이브 (${n0(S[7].waveRows[1].hp)}) 보다 무거움 → 시작부터 철갑함 2척, 순서 뒤집힘`,
      '6 · 7 · 8바다는 보스 웨이브가 마지막 일반 웨이브보다 가벼움 → 마지막 일반 웨이브가 사실상 최종 관문',
    ], X0, 5.22, CW, 1.6, { size: 12 });
  }

  // 9. 적 수치
  {
    const s = k.slide('현황 · 적 수치', '철갑함 = 체력 260 · 장갑 30% → 실질 체력 371, 순찰선 6배', '초당 피해 = 전부 명중 상한 (일반 적 배율 1, 보스는 그 바다 배율 적용). 장갑은 포탄만 줄임');
    const ROLE = { 0: '측면 사격', 1: '박치기', 2: '폭격', 3: '접촉 폭발', 4: '잠수 · 물기' };
    const foeDps = (f) => (f.ai === 0 ? (f.guns * f.dmg) / f.reload + (f.bowGun ? f.dmg / f.bowGun : 0) : f.ai === 2 ? f.dmg / f.reload : f.ai === 4 ? f.dmg / (f.boss ? 7.5 : 5.7) : 0);
    const normal = ['sloop', 'rival', 'frigate', 'ironclad', 'mortar', 'speeder', 'shark', 'mine'];
    const rowsN = normal.map((id) => { const f = M.foe[id]; return [f.name, ROLE[f.ai], f.hp, f.armor < 1 ? `${Math.round((1 - f.armor) * 100)}%` : '-', f.ai === 1 || f.ai === 3 ? `${f.ram} (1회)` : foeDps(f).toFixed(1), `${f.gold} / ${f.plank}`]; });
    const lw = 6.55;
    table(s, ['일반 적', '역할', '체력', '장갑', '초당 피해', '금화 / 목재'], rowsN, X0, 1.85, lw, [1.85, 1.15, 0.7, 0.7, 1.05, 1.1], { rowH: 0.36, size: 11.5 });
    const bosses = ['b_rival', 'b_shark', 'b_admiral', 'b_king', 'b_shark2', 'b_admiral2', 'b_king2', 'b_fortress'];
    const rowsB = bosses.map((id, i) => { const f = M.foe[id]; return [`${i + 1}. ${f.name}`, n0(f.hp), f.armor < 1 ? `${Math.round((1 - f.armor) * 100)}%` : '-', n0(S[i].bossHp), S[i].bossDps.toFixed(1)]; });
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    table(s, ['보스 (바다 순)', '체력', '장갑', '실제 체력', '초당 피해'], rowsB, rx, 1.85, rw, [1.95, 0.7, 0.65, 1.0, rw - 4.3], { rowH: 0.36, size: 11.5 });
    note(s, '진단', ['철갑함 1척 = 순찰선 6척분 실질 체력, 6바다부터 웨이브당 1 ~ 4척 등장', '보스 프리팹 체력 600 → 1,000 으로 완만, 바다 배율이 실제 차이 대부분 (480 → 6,118)'], X0, 5.3, CW, 1.5, { size: 12 });
  }

  // 10. 함선 갈래 곡선
  {
    const s = k.slide('곡선 5 · 함선 성장', '중포함 4단계 치즈 대왕이 모든 함선 중 최강', '같은 티어 일반 장비 전 슬롯 장착, 선원 4명 기준. 화력 = 뱃전 + 자동 무기');
    const labels = ['0 갤리', '1단계', '2단계', '3단계', '4단계', '5단계'];
    const half = (CW - 0.3) / 2 - 1.3;
    const mk = (key, title, x) => {
      k.card(s, x, 1.85, half, 4.9);
      const data = ['S', 'M', 'H'].map((L) => ({ name: LN[L], labels, values: by[L].map((t) => t.g0[key]) }));
      s.addChart(pres.charts.LINE, data, chartOpt({ x: x + 0.1, y: 1.95, w: half - 0.2, h: 4.7, chartColors: [LC.S, LC.M, LC.H], lineSize: 2.5, lineDataSymbolSize: 7, valAxisMinVal: 0, showTitle: true, title }));
    };
    mk('dps', '화력 (초당 피해)', X0);
    mk('ehp', '유효 체력 (체력 ÷ 받는 피해)', X0 + half + 0.2);
    const rx = X0 + 2 * half + 0.4, rw = W - X0 - rx;
    note(s, '진단', [
      `치즈 대왕 대포 6문 추가 · 위력 ×1.35 → 화력 ${by.H[4].g0.dps}`,
      `하늘 치즈성 (5단계) 화력 ${by.H[5].g0.dps}, 4단계보다 약함`,
      `쾌속선 유효 체력 최하 (5단계 ${by.S[5].g0.ehp} vs 중포함 ${by.H[5].g0.ehp})`,
      '1단계 3갈래 차이 작음, 2단계부터 중포함 독주 시작',
    ], rx, 1.85, rw, 4.9, { size: 12 });
  }

  // 11. 경제 곡선
  {
    const s = k.slide('곡선 6 · 경제', '금화는 넉넉, 목재는 후반으로 갈수록 빠듯', '1회 승리 수입 (격침 + 보물상자 기댓값), 침몰 시 절반. 한 갈래만 산다고 가정');
    const half = (CW - 0.3) / 2;
    k.card(s, X0, 1.85, half, 3.35);
    s.addChart(pres.charts.BAR, [
      { name: '1회 금화 수입', labels: SEA_SHORT, values: S.map((x) => x.gold) },
      { name: '1회 목재 수입', labels: SEA_SHORT, values: S.map((x) => x.plank) },
    ], chartOpt({ x: X0 + 0.1, y: 1.95, w: half - 0.2, h: 3.15, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 50, chartColors: [C.cheese, '8C6A43'], showTitle: true, title: '바다 1회 수입' }));
    const rx = X0 + half + 0.3;
    k.card(s, rx, 1.85, half, 3.35);
    s.addChart(pres.charts.LINE, [
      { name: '누적 목재 (바다 1회씩)', labels: SEA_SHORT, values: M.cum.map((c) => c.havePlank) },
      { name: '추천 함선까지 필요 목재', labels: SEA_SHORT, values: M.cum.map((c) => c.needPlank) },
      { name: '누적 금화', labels: SEA_SHORT, values: M.cum.map((c) => c.haveCoin) },
      { name: '필요 금화', labels: SEA_SHORT, values: M.cum.map((c) => c.needCoin) },
    ], chartOpt({ x: rx + 0.1, y: 1.95, w: half - 0.2, h: 3.15, chartColors: ['8C6A43', C.red, C.cheese, C.purple], lineSize: 2.5, lineDataSymbolSize: 6, showTitle: true, title: '바다 입장 시점 누적 vs 필요' }));
    note(s, '진단', [
      `금화: 매 바다 필요량 초과 (8바다 입장 ${n0(M.cum[7].haveCoin)} / ${n0(M.cum[7].needCoin)}) → 남는 금화는 조선소 의뢰로 흡수`,
      `목재: 8바다 입장 시 ${n0(M.cum[7].havePlank)} / ${n0(M.cum[7].needPlank)} 로 부족 → 7바다 반복 1회 필요, 의뢰 목재 (금화 ÷ 5) 까지 더하면 더 부족`,
      '순찰선 · 쾌속정 · 상어는 목재 0 → 1 · 2바다 목재 수입이 특히 적음 (78 · 56)',
    ], X0, 5.32, CW, 1.53, { size: 12 });
  }

  // 12. 문제 정리
  {
    const s = k.slide('문제 정리', '조정 우선순위 5가지', '플레이 감각 문제로 이어지는 순서대로 정리');
    const list = [
      ['적 성장 과속', `배율 × 적 구성 × 웨이브 수가 곱해져 8바다 전투 이론 ${P[7].ttk}초 (약 10분). 후반 지루함 · 피로`, C.red],
      ['6바다 난이도 벽', `철갑함 대량 등장 + 추천 단계 유지 → 체력 ×3.1, 위험도 ${P[5].danger}%. 이탈 지점 가능성`, C.purple],
      ['3바다 급경사', `2바다 → 3바다 전멸 시간 ${P[1].ttk}초 → ${P[2].ttk}초. 같은 1단계 함선, 프리깃 · 쾌속정 첫 등장`, C.sea],
      ['중포함 독주 · 5단계 역전', `치즈 대왕 화력이 다른 4단계의 2배 이상, 하늘 치즈성은 4단계보다 약함 → 갈래 선택 의미 약화`, C.green],
      ['보상이 배율에 묶임', '보상 = 1 + (배율 − 1) × 0.8 → 난이도를 내리면 수입도 함께 줄어 목재 부족 심화', '8C6A43'],
    ];
    list.forEach(([h, b, col], i) => {
      const y = 1.85 + i * 0.98;
      k.card(s, X0, y, CW, 0.84);
      k.badge(s, i + 1, X0 + 0.25, y + 0.21, 0.42);
      k.text(s, h, X0 + 0.9, y + 0.12, 3.3, 0.6, { size: 16, bold: true, color: col, valign: 'middle' });
      k.text(s, b, X0 + 4.3, y + 0.12, CW - 4.55, 0.6, { size: 13, valign: 'middle', ls: 1.15 });
    });
  }

  // 13. 조정안
  {
    const s = k.slide('조정안', '배율을 완만하게, 튀는 적 체력만 깎고 보상은 분리', '수치 변경은 ShipyardDB seas.mult · 적 프리팹 hp · GameManager LootMult 식 3곳');
    const lw = 5.6;
    const rows = S.map((x, i) => [SEA_SHORT[i], x.mult.toFixed(1), { text: M.NEW_MULT[i].toFixed(1), bold: true, color: C.sea }, `${P[i].ttk}초`, { text: `${SC[i].ttk}초`, bold: true, color: C.sea }]);
    table(s, ['바다', '배율', '조정 배율', '전멸 (현재)', '전멸 (조정)'], rows, X0, 1.85, lw, [1.1, 0.9, 1.15, 1.2, 1.25], { rowH: 0.36 });
    note(s, '함께 바꿀 것', [
      `프리깃 체력 ${140} → ${M.NEW_HP.frigate}, 철갑함 체력 ${260} → ${M.NEW_HP.ironclad}`,
      '보상 배율을 바다 배율과 분리 → 현재 보상 표 유지 (수입 감소 방지)',
    ], X0, 5.2, lw, 1.55, { size: 12 });
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    k.card(s, rx, 1.85, rw, 4.9);
    s.addChart(pres.charts.LINE, [
      { name: '전멸 시간 (현재)', labels: SEA_SHORT, values: P.map((p) => p.ttk) },
      { name: '전멸 시간 (조정)', labels: SEA_SHORT, values: SC.map((p) => p.ttk) },
    ], chartOpt({ x: rx + 0.1, y: 1.95, w: rw - 0.2, h: 4.7, chartColors: ['B8C3CC', C.sea], lineSize: 3, lineDataSymbolSize: 8, valAxisMinVal: 0, valAxisLabelFormatCode: '0"초"', showTitle: true, title: '추천 단계 평균 화력 기준 전멸 시간' }));
  }

  // 14. 조정 후 기대 · 검증
  {
    const s = k.slide('조정 후 기대 · 검증 계획', '8바다 전투 시간 절반, 6바다 벽은 남겨 두되 낮춤', '6바다는 조정 후에도 정점 → 의도된 고비로 둘지 플레이 테스트로 결정');
    const lw = 7.2;
    k.card(s, X0, 1.85, lw, 4.9);
    s.addChart(pres.charts.BAR, [
      { name: '위험도 (현재)', labels: SEA_SHORT, values: P.map((p) => p.danger) },
      { name: '위험도 (조정)', labels: SEA_SHORT, values: SC.map((p) => p.danger) },
    ], chartOpt({ x: X0 + 0.1, y: 1.95, w: lw - 0.2, h: 4.7, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 50, chartColors: ['B8C3CC', C.red], valAxisLabelFormatCode: '0"%"', showTitle: true, title: '위험도 (초당 체력 손실 %, 평균)' }));
    const rx = X0 + lw + 0.3, rw = W - X0 - rx;
    note(s, '기대 효과', [
      `8바다 전멸 ${P[7].ttk}초 → ${SC[7].ttk}초, 위험도 ${P[7].danger}% → ${SC[7].danger}%`,
      `6바다 위험도 ${P[5].danger}% → ${SC[5].danger}%, 여전히 최고점`,
      '3바다 급경사 완화 (161초 → 133초)',
    ], rx, 1.85, rw, 2.2, { size: 12 });
    note(s, '플레이 테스트 확인 항목', [
      '바다별 실제 클리어 시간 · 침몰률 (갈래별)',
      '6바다 첫 도전 침몰 횟수, 7바다 반복 횟수',
      '중포함 선택 비율 · 함선 교체 빈도',
      '목재 부족으로 출항만 반복하는 구간 유무',
    ], rx, 4.25, rw, 2.5, { size: 12, fill: 'EAF2F8' });
  }

  await k.save(OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
