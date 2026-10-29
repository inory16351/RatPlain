// 항구 (아웃게임 DOM): 타이틀 · 스토리 · 항구 탭 4개 · 결과
// 탭: 출항(바다 지도) · 조선소(배 진화 트리) · 장비(가진 배마다 슬롯) · 의뢰 · 합성(제작 의뢰 · 합성 · 티어 업 도전)
// 데이터 · 저장 = ships.js 의 window.SHIPYARD, 바다 = seas.js 의 window.SEAS, 전투 · 그림 = game.js 의 window.PG
// 쥐 비행기 게임 web/hangar.js 구조를 그대로 가져와 배에 맞게 바꿈 (기체→배, 격납고→항구, 연구소→조선소, 스테이지→바다)
(function () {
  // game.js 가 없을 때(따로 시험할 때) 최소 대역
  if (!window.PG) window.PG = { ready: true, img: () => null, drawShip() {}, start(i) { alert('game.js 없음 ' + i); }, music() {} };
  const SY = window.SHIPYARD;
  const SEAS = () => window.SEAS || [];
  const $ = (s, el = document) => el.querySelector(s);
  const root = $('#port');
  const OVS = ['#title', '#story', '#port', '#result'];

  let tab = 'sea';     // 'sea' · 'ship' · 'gear' · 'lab'
  let sel = null;      // 조선소 탭: 왼쪽에 보이는 배 id
  let eqS = null;      // 장비 탭: 장비를 보고 있는 배 id (가진 배만)
  let hover = null;    // 마우스가 올라간 장비 id (수치 미리보기)
  let coinAmt = 100;   // 의뢰에 쓸 기준 금화 (실제 비용 = × 테크 배율)
  let last = null;     // 방금 나온 장비 { uid, how, fail }
  let picks = [];      // 합성 재료로 고른 uid
  let talk = '무엇이든 만들어 주지! 금화를 많이 낼수록 좋은 물건이 나올 확률이 높아짐.';

  function ready(fn) { if (window.PG && PG.ready) fn(); else addEventListener('pg-ready', fn, { once: true }); }
  const music = (n) => { try { PG.music && PG.music(n); } catch (e) {} };
  const sfx = (...a) => { try { PG.sfx && PG.sfx(...a); } catch (e) {} };
  const img = (name, i = 0) => { try { return PG.img ? PG.img(name, i) : null; } catch (e) { return null; } };
  const show = (id) => { for (const o of OVS) $(o).classList.toggle('on', o === id); };

  // ── 공용 조각
  const coinIc = (cls = 'mi') => { const s = img('ui_icons', 0) || img('items', 0); return s ? `<img class="${cls}" src="${s}" alt="">` : `<span class="${cls} mi coin"></span>`; };
  const plankIc = (cls = 'mi') => { const s = img('ui_icons', 1); return s ? `<img class="${cls}" src="${s}" alt="목재" title="목재">` : `<span class="${cls} mi plank" title="목재"></span>`; };
  function costHtml(c) {
    return `<span class="cost">${c[0] ? `${plankIc()} ${c[0]} ` : ''}${coinIc()} ${c[1]}</span>`;
  }
  const grade = (g) => SY.GRADES[g];
  const gradeTag = (g) => `<span class="tier" style="background:${grade(g).col}">${grade(g).name}</span>`;
  const techTag = (t, label) => `<span class="tier" style="background:${SY.TIER_COL[t]}">${label || `T${t}`}</span>`;
  const GLYPH = { cannon: '포', sail: '돛', hull: '판', rudder: '키', scope: '망', figure: '상', mortar: '박', shot: '탄', crew: '원' };
  function iconHtml(p, cls = 'ic') {
    const src = p.icon && img(p.icon[0], p.icon[1]);
    return src ? `<img class="${cls}" src="${src}" style="--g:${grade(p.grade).col}" alt="">` : `<div class="${cls}" style="--g:${grade(p.grade).col}">${GLYPH[p.slot] || '?'}</div>`;
  }
  const gradeTxt = (p) => `${techTag(p.tier)}<span style="color:${grade(p.grade).col};font-size:12px">${grade(p.grade).name}</span>`;
  const fitTxt = (p) => `${p.lines ? p.lines.map((l) => SY.LINES[l]).join(' · ') : '모든 갈래'} ${p.tier}단계↑`;
  const forTxt = (p) => `${SY.SLOT_TYPES[p.slot].name} · ${fitTxt(p)}`;
  const itemsFor = (sid) => SY.save.items.filter((it) => SY.PART[it.id].fits.includes(sid));
  // 이 장비를 끼울 배: 지금 탄 배가 되면 그것, 아니면 가진 배 중 가장 높은 단계
  function bestShip(p) {
    const own = p.fits.filter(SY.owns);
    if (own.includes(SY.save.ship)) return SY.save.ship;
    return own.sort((a, b) => SY.SHIP[b].tier - SY.SHIP[a].tier)[0] || null;
  }
  function capHtml(cls, i = 0) {
    const s = img('crew_rat', i);
    return s ? `<img class="${cls}" src="${s}" alt="">` : `<div class="${cls} glyph"><div class="rat-glyph">${i === 0 ? '<b></b><i></i>' : ''}</div></div>`;
  }

  // 배 그림: 캔버스 크기를 맞춘 뒤 game.js 에 맡김
  function drawShip(cv, id) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    try { PG.drawShip(cv, id); } catch (e) { console.warn('drawShip', id, e); }
  }

  // ── 수치 (summary 값은 '2.1초' · '85%' 같은 글자도 섞여 있음 → 숫자만 비교, 장전 · 받는 피해는 낮을수록 좋음)
  const LOWER = new Set(['장전', '받는 피해']);
  function statsHtml(cur, next) {
    const a = SY.summary(cur), b = next ? SY.summary(next) : a;
    return a.map(([n, v], i) => {
      const d = +(parseFloat(b[i][1]) - parseFloat(v)).toFixed(2);
      const good = LOWER.has(n) ? d < 0 : d > 0;
      return `<span>${n}</span><span class="v">${b[i][1]}</span><span class="d ${d ? (good ? 'up' : 'dn') : ''}">${d ? (d > 0 ? '+' : '') + d : ''}</span>`;
    }).join('');
  }
  function previewPair() {
    const s = SY.save;
    if (tab === 'gear') {
      const cur = SY.compute({ ship: eqS });
      return [cur, hover ? SY.compute({ ship: eqS, equip: { [SY.PART[hover].slot]: hover } }) : null];
    }
    const id = tab === 'ship' ? sel || s.ship : s.ship;
    return [SY.compute(), id !== s.ship ? SY.compute({ ship: id }) : null];
  }

  // ── 왼쪽: 배 미리보기 (출항 = 지금 배, 조선소 = 고른 배, 장비 = 장비 보는 배)
  function prevHtml() {
    const s = SY.save;
    const f = SY.SHIP[tab === 'gear' ? eqS : sel || s.ship];
    const owned = SY.owns(f.id);
    let act;
    if (f.id === s.ship) act = `<button disabled>타는 중</button>`;
    else if (owned) act = `<button data-use="${f.id}">이 배로 바꾸기</button>`;
    else if (SY.shipBuyable(f)) act = `<button data-buy="${f.id}" ${SY.can(f.cost) ? '' : 'disabled'}>건조 · ${costHtml(f.cost)}</button>`;
    else act = `<button disabled>${SY.SHIP[f.req].kind} 먼저</button>`;
    const [cur, next] = previewPair();
    return `
      <div class="panel" id="pt-prev">
        <canvas data-prev="${f.id}"></canvas>
        <div class="nm">${techTag(f.tier, `${f.tier}단계`)}${f.name}</div>
        <div class="kd">${f.kind} · ${f.line ? SY.LINES[f.line] : '시작 배'} · ${SY.ERAS[f.tier]}</div>
        <div class="ds">${f.desc}<br><span class="slots-line">슬롯 ${f.slots.length}칸 · ${f.slots.map((sl) => SY.SLOT_TYPES[sl].name).join(' · ')}</span></div>
        <div class="stats">${statsHtml(cur, next)}</div>
        ${act}
      </div>`;
  }

  // ── 출항 탭: 바다 지도 + 고른 바다 설명
  const TRAIT = {
    fog: ['안개', '시야가 좁음 — 망원경 · 레이더로 시야 넓히기'],
    storm: ['폭풍', '바람에 밀림 · 번개 예고 원 피하기'],
    whirl: ['소용돌이', '가운데로 끌려감 · 한가운데는 피해'],
    whirlpool: ['소용돌이', '가운데로 끌려감 · 한가운데는 피해'],
  };
  function traitOf(t) {
    if (!t || t === '-') return null;
    if (typeof t === 'string') return TRAIT[t] || [t, ''];
    const k = t.type || t.id || t.kind;
    const base = TRAIT[k] || ['', ''];
    return [t.name || base[0] || k, t.tip || t.desc || base[1]];
  }
  const nameOf = (x) => (x == null ? '' : typeof x === 'string' ? x : x.name || x.id || x.type || '');
  // game.js 의 PG.FOES 이름이 있으면 그걸 먼저 씀
  const foeName = (k) => (PG.FOES && PG.FOES[k] && PG.FOES[k].name) || null;
  const bossName = (b) => foeName(nameOf(b)) || BOSS[nameOf(b)] || nameOf(b);
  // col = '#색' 또는 ['#밝은', '#어두운']
  const seaCol = (c) => { const a = [].concat(c || '#2a6f8a'); return `--c:${a[0]};--c2:${a[1] || a[0]}`; };
  // seas.js 의 적 · 보스 이름(game.js FOES 키) → 보여 줄 이름
  const BOSS = {
    b_rival: "라이벌 항해사 '회색꼬리'", b_shark: '거대 상어', b_admiral: '고양이 제독 기함', b_king: '해적왕 블랙랫 갤리온',
    b_shark2: '분노한 거대 상어', b_admiral2: '제독 기함 Mk2', b_king2: '해적왕 블랙랫 (복수전)', b_fortress: '대제독 해상 요새',
  };
  const ENEMY = {
    mine: '폭탄통', e_cat_sloop: '고양이 순찰선', sloop: '고양이 순찰선', patrol: '고양이 순찰선', e_cat_frigate: '고양이 프리깃', frigate: '고양이 프리깃',
    e_cat_mortar: '박격포선', mortar: '박격포선', e_cat_speeder: '쾌속정', speeder: '쾌속정', e_cat_ironclad: '고양이 철갑함', ironclad: '고양이 철갑함',
    e_rat_rival: '라이벌 쥐 해적선', rival: '라이벌 쥐 해적선', e_shark: '상어', shark: '상어', barrel: '폭탄통', bomb: '폭탄통',
  };
  function enemiesOf(sea) {
    const out = [];
    for (const w of sea.waves || []) for (const e of [].concat(w)) {
      const n = foeName(nameOf(e)) || ENEMY[nameOf(e)] || nameOf(e);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  }
  function mapHtml() {
    const s = SY.save, tech = SY.tech();
    const cards = SEAS().map((sea, i) => {
      const open = i <= s.unlocked, clear = s.cleared.includes(sea.id), tr = traitOf(sea.trait);
      const row = Math.floor(i / 4), col = row % 2 ? 4 - (i % 4) : (i % 4) + 1; // 뱀 모양 뱃길: 둘째 줄은 오른쪽 → 왼쪽
      return `<div class="sea ${i === s.pick ? 'on' : ''} ${open ? '' : 'lock'}" style="${seaCol(sea.col)};grid-row:${row + 1};grid-column:${col}" ${open ? `data-sea="${i}"` : ''}>
        ${clear ? '<span class="ok">정복</span>' : ''}
        <div class="no">${i + 1}번째 바다</div>
        <div class="sn">${open ? sea.name : '???'}</div>
        <div class="sb">${open ? `${techTag(Math.min(sea.rec || 0, SY.MAX_TIER), `추천 ${sea.rec || 0}단계`)}${(sea.rec || 0) > tech ? '<span class="warn">위험</span>' : ''}${tr ? ` <span class="trait">${tr[0]}</span>` : ''}` : '<span>앞 바다를 정복하면 열림</span>'}</div>
      </div>`;
    }).join('');
    return `
      <div class="panel" id="pt-map">
        <h2>바다 지도 <span class="sub">정복한 바다 ${s.cleared.length} / ${SEAS().length} · 지금 테크 ${tech}단계</span></h2>
        <div class="seas"><svg></svg>${cards || '<p class="none">seas.js 가 없음</p>'}</div>
      </div>`;
  }
  function seaHtml() {
    const s = SY.save, sea = SEAS()[s.pick];
    if (!sea) return `<div class="panel" id="pt-sea"><h2>바다</h2><p class="none">바다 정보 없음</p></div>`;
    const tech = SY.tech(), rec = sea.rec || 0, tr = traitOf(sea.trait), ens = enemiesOf(sea);
    const waves = (sea.waves || []).length;
    const alert = rec > tech
      ? `<div class="alert">추천 ${rec}단계 — 지금 테크 ${tech}단계. 적이 아주 셈, 조선소에서 배부터 키우기 추천</div>`
      : `<div class="fine">추천 ${rec}단계 · 지금 테크 ${tech}단계 — 출항 가능</div>`;
    return `
      <div class="panel" id="pt-sea">
        <h2>${s.pick + 1}. ${sea.name}${s.cleared.includes(sea.id) ? ' <span class="sub">정복함</span>' : ''}</h2>
        ${sea.story ? `<div class="story">${sea.story}</div>` : ''}
        <dl>
          <dt>보스</dt><dd><b>${bossName(sea.boss) || '?'}</b></dd>
          <dt>적</dt><dd>${ens.join(' · ') || '?'}</dd>
          <dt>웨이브</dt><dd>${waves ? `${waves}번 + 보스` : '보스'}</dd>
          <dt>특성</dt><dd>${tr ? `<span class="trait">${tr[0]}</span> ${tr[1]}` : '없음'}</dd>
          <dt>배율</dt><dd>적 체력 ×${sea.mult || 1} · 전리품도 더 많음</dd>
        </dl>
        ${alert}
        <p class="note">이기면 전리품 전부 + 다음 바다 열림. 침몰하면 절반만 챙김.</p>
        <div class="mini">
          <canvas data-prev="${s.ship}"></canvas>
          <div><div class="nm">${techTag(SY.SHIP[s.ship].tier, `${SY.SHIP[s.ship].tier}단계`)}${SY.SHIP[s.ship].name}</div>
            <div class="kd">${SY.SHIP[s.ship].kind} · ${SY.summary(SY.compute()).filter(([n]) => ['선체', '속도', '화력'].includes(n)).map(([n, v]) => `${n} ${v}`).join(' · ')}</div>
            <button class="small" data-tab="ship">조선소에서 배 바꾸기</button></div>
        </div>
        <button class="big" data-go>${SY.SHIP[s.ship].name} 출항!</button>
      </div>`;
  }

  // ── 조선소 탭: 배 진화 트리 (열 = 단계, 줄 = 갈래)
  function treeHtml() {
    const s = SY.save, f = SY.SHIP[sel || s.ship];
    const nodes = SY.SHIPS.map((sh) => {
      const own = SY.owns(sh.id), buy = SY.shipBuyable(sh);
      const cls = ['node', own && 'own', sh.id === s.ship && 'use', !own && !buy && 'lock', sh.id === f.id && 'sel'].filter(Boolean).join(' ');
      const st = sh.id === s.ship ? '타는 중' : own ? '보유' : buy ? costHtml(sh.cost) : '잠김';
      return `<div class="${cls}" data-sel="${sh.id}" style="grid-column:${sh.tier + 1};grid-row:${sh.row + 1}"><canvas data-ship="${sh.id}"></canvas><div class="nm">${sh.name}</div><div class="kd">${sh.kind}</div><div class="st">${st}</div></div>`;
    }).join('');
    return `
      <div class="panel wide" id="pt-tree">
        <h2>조선소 · 배 진화 <span class="sub">위 = ${SY.LINES.S} · 가운데 = ${SY.LINES.M} · 아래 = ${SY.LINES.H} · 지금 테크 ${SY.tech()}단계 · 부모 배가 있어야 다음 배 건조</span></h2>
        <div class="era">${SY.ERAS.map((e, i) => `<span>${techTag(i, `${i}단계`)}${e}</span>`).join('')}</div>
        <div class="grid"><svg></svg>${nodes}</div>
      </div>`;
  }

  // 가진 장비를 장비 id 로 묶음: [{ p, uids, free(장착 · 선택 안 한 uid) }]
  function groups(items) {
    const m = new Map();
    for (const it of items) {
      if (!m.has(it.id)) m.set(it.id, { p: SY.PART[it.id], uids: [], free: [] });
      const g = m.get(it.id);
      g.uids.push(it.uid);
      if (!SY.isEquipped(it.uid) && !picks.includes(it.uid)) g.free.push(it.uid);
    }
    return [...m.values()].sort((a, b) => b.p.tier - a.p.tier || b.p.grade - a.p.grade || a.p.slot.localeCompare(b.p.slot) || a.p.name.localeCompare(b.p.name));
  }

  // ── 장비 탭: 가운데 = 슬롯, 오른쪽 = 이 배에 낄 수 있는 보관함 (+ 못 끼우는 것과 이유)
  function gearHtml() {
    const s = SY.save, f = SY.SHIP[eqS], eq = SY.equipOf(f.id);
    const chips = SY.SHIPS.filter((sh) => SY.owns(sh.id)).map((sh) => {
      const n = itemsFor(sh.id).filter((it) => !SY.isEquipped(it.uid)).length;
      return `<button class="chip ${sh.id === f.id ? 'on' : ''}" data-eqs="${sh.id}">${sh.tier} · ${sh.name}${n ? ` <b>${n}</b>` : ''}</button>`;
    }).join('');
    const slots = f.slots.map((sl) => {
      const it = SY.itemOf(eq[sl]), p = it && SY.PART[it.id];
      const body = p
        ? `${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)}</div><div class="pd">${p.desc}</div></div><button class="small" data-uneq="${sl}">빼기</button>`
        : `<div class="ic empty">${GLYPH[sl]}</div><div class="pd">비어 있음 — 오른쪽 보관함에서 골라 끼우기</div><span></span>`;
      return `<div class="slot"><h3><span>${SY.SLOT_TYPES[sl].name}</span></h3><div class="part ${p ? 'on' : 'emptyrow'}" style="--g:${p ? grade(p.grade).col : 'transparent'}">${body}</div></div>`;
    }).join('');
    const inv = groups(itemsFor(f.id)).map(({ p, uids }) => {
      const here = uids.find((u) => eq[p.slot] === u);
      const free = uids.find((u) => !SY.isEquipped(u));
      const elsewhere = !here && !free && SY.equippedOn(uids[0]);
      const right = here ? `<span class="tag">장착 중</span>`
        : free ? `<button class="small" data-eq="${free}">장착</button>`
          : `<button class="small" data-eq="${uids[0]}" title="${SY.SHIP[elsewhere].name}에서 빼서 옮김">옮기기</button>`;
      const note = elsewhere ? ` · <span class="warn">${SY.SHIP[elsewhere].name}에 장착 중</span>` : '';
      return `<div class="part ${here ? 'on' : ''}" style="--g:${grade(p.grade).col}" data-hover="${here ? '' : p.id}">
        ${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)}${uids.length > 1 ? ` <span class="cnt">×${uids.length}</span>` : ''}</div><div class="pd">${SY.SLOT_TYPES[p.slot].name} · ${p.desc}${note}</div></div>${right}</div>`;
    }).join('') || `<p class="none">이 배에 낄 수 있는 장비가 아직 없음.<br>의뢰 · 합성 탭에서 조선공 쥐에게 제작 의뢰하기.</p>`;
    // 슬롯은 있는데 못 끼우는 장비: whyNot 이유 표시
    const nofit = groups(s.items.filter((it) => f.slots.includes(SY.PART[it.id].slot) && !SY.PART[it.id].fits.includes(f.id))).map(({ p, uids }) => `
      <div class="part lock" style="--g:${grade(p.grade).col}">${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)}${uids.length > 1 ? ` <span class="cnt">×${uids.length}</span>` : ''}</div><div class="pd warn">${SY.whyNot(uids[0], f.id) || ''}</div></div><span></span></div>`).join('');
    return `
      <div class="panel" id="pt-slots"><h2>장비 · ${f.name}</h2><div class="chips">${chips}</div>
        <p class="note">장비마다 티어 · 등급 · 낄 수 있는 갈래가 따로. 낮은 티어 장비는 높은 단계 배에 낄 수 있지만 반대는 안 됨. 보관함 줄에 마우스 = 왼쪽에 수치 변화.</p>${slots}</div>
      <div class="panel" id="pt-inv"><h2>보관함 · ${f.name}에 낄 수 있는 것</h2>${inv}
        ${nofit ? `<details class="nofit"><summary>못 끼우는 장비 보기</summary>${nofit}</details>` : ''}</div>`;
  }

  // ── 의뢰 · 합성 탭: 왼쪽 = 조선공 쥐, 가운데 = 제작 의뢰 · 결과, 오른쪽 = 전체 보관함 · 합성
  function oddsHtml() {
    const o = SY.odds(coinAmt), cost = SY.requestCost(coinAmt), to = SY.tierOdds();
    const tiers = to.map((v, t) => [t, v]).filter(([, v]) => v > 0).reverse();
    return `
      <div class="odds">${o.map((v, g) => `
        <div class="orow"><span style="color:${grade(g).col}">${grade(g).name}</span>
          <div class="obar"><i style="width:${v}%;background:${grade(g).col}"></i></div>
          <b>${v.toFixed(1)}%</b></div>`).join('')}
      </div>
      <div class="todds"><span class="lb">티어</span>${tiers.map(([t, v]) => `<span>${techTag(t)} ${v.toFixed(v < 10 ? 1 : 0)}%</span>`).join('')}</div>
      <button class="big" data-req ${SY.can(cost) ? '' : 'disabled'}>제작 의뢰 · ${costHtml(cost)}</button>`;
  }
  function fuseBtn() {
    const info = SY.fuseInfo(picks);
    if (!info) return `<button class="small" data-fuse disabled>${picks.length && SY.PART[SY.itemOf(picks[0]).id].grade === 3 ? `전설 ${SY.FUSE_N}개 이상` : `${SY.FUSE_N}개 고르기`}</button>`;
    if (info.kind === 'fuse') return `<button data-fuse>합성</button>`;
    return info.block ? `<button data-fuse disabled title="${info.block}">티어 업 · ${info.block}</button>`
      : `<button data-fuse class="up">티어 업 도전 · ${info.chance}%</button>`;
  }
  function labHtml() {
    const s = SY.save;
    let result = '';
    if (last) {
      const it = SY.itemOf(last.uid);
      if (it) {
        const p = SY.PART[it.id], on = SY.equippedOn(it.uid), to = bestShip(p);
        result = `
          <div class="result g${p.grade} ${last.fail ? 'fail' : ''}" style="--g:${grade(p.grade).col}">
            <div class="rh">${last.how}</div>
            ${iconHtml(p, 'ric ic')}
            <div class="rn">${p.name}</div>
            <div>${techTag(p.tier, `티어 ${p.tier}`)} ${gradeTag(p.grade)} ${forTxt(p)}</div>
            <div class="pd">${p.desc}</div>
            ${on ? `<span class="tag">${SY.SHIP[on].name}에 장착 중</span>` : to ? `<button class="small" data-eq="${it.uid}" data-to="${to}">${SY.SHIP[to].name}에 바로 장착</button>` : `<span class="tag">낄 수 있는 배가 아직 없음</span>`}
          </div>`;
      }
    }
    // 합성 재료 칸: 일반~희귀 3칸, 전설(티어 업 도전)은 6칸까지
    const p0 = picks.length ? SY.PART[SY.itemOf(picks[0]).id] : null;
    const max = p0 && p0.grade === 3 ? SY.UP_MAX : SY.FUSE_N;
    const tray = Array.from({ length: max }, (_, i) => {
      const it = SY.itemOf(picks[i]);
      return it ? `<div class="tslot" data-unpick="${it.uid}" title="빼기">${iconHtml(SY.PART[it.id])}</div>` : `<div class="tslot empty">+</div>`;
    }).join('');
    const inv = groups(s.items).map(({ p, uids, free }) => {
      const ok = free.length && (!p0 || (p0.grade === p.grade && p0.tier === p.tier)) && picks.length < max;
      const dead = !SY.usable(p);
      return `<div class="part ${ok ? '' : 'lock'}" style="--g:${grade(p.grade).col}">
        ${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)} <span class="cnt">×${uids.length}</span></div><div class="pd">${forTxt(p)}${dead ? ' · <span class="warn">가진 배 중 낄 곳 없음</span>' : ''}${uids.length > free.length ? ' · 장착 · 선택 제외' : ''}</div></div>
        <button class="small" data-pick="${free[0] || ''}" ${ok ? '' : 'disabled'}>재료</button></div>`;
    }).join('') || `<p class="none">아직 장비가 없음.</p>`;
    const chances = Object.entries(SY.UP_CHANCE).map(([n, c]) => `${n}개 ${c}%`).join(' · ');
    return `
      <div class="panel" id="lab-npc">
        ${capHtml('npc', 2)}
        <div class="bubble">${talk}</div>
        <div class="kd">조선공 쥐 · 지금까지 의뢰 ${s.requests}번 · 티어 업 도전 ${s.tierUps || 0}번</div>
      </div>
      <div class="panel" id="lab-req">
        <h2>제작 의뢰 <span class="sub">지금 테크 ${SY.tech()}단계 · 비용 ×${SY.reqK().toFixed(1)}</span></h2>
        <p class="note">가진 배에 낄 수 있는 장비만 나옴. 테크(가진 배의 최고 단계) 티어가 주로, 낮은 티어도 섞임. 금화를 많이 낼수록 높은 등급 확률 ↑ (목재 = 금화의 1/3).</p>
        <div class="amt">
          <input type="range" min="${SY.REQ.min}" max="${SY.REQ.max}" step="${SY.REQ.step}" value="${coinAmt}" data-amt>
          <div class="presets">${[30, 100, 250, 600].map((v) => `<button class="small" data-preset="${v}">${Math.round(v * SY.reqK())}</button>`).join('')}</div>
        </div>
        <div id="lab-odds">${oddsHtml()}</div>
        ${result}
      </div>
      <div class="panel" id="lab-inv">
        <h2>합성 <span class="sub">같은 티어 · 같은 등급 ${SY.FUSE_N}개 → 한 등급 위 (랜덤)</span></h2>
        <p class="note">전설은 ${SY.FUSE_N}~${SY.UP_MAX}개를 넣어 <b>한 티어 위 전설</b>에 도전 (${chances}). 실패하면 같은 티어 전설 하나만 남음. 한 단계 위 배가 있어야 도전 가능. 장착 중인 장비는 재료로 못 씀.</p>
        <div class="tray">${tray}${fuseBtn()}</div>
        <h2>보관함 <span class="sub">${s.items.length}개</span></h2>
        ${inv}
      </div>`;
  }

  function render() {
    const s = SY.save;
    // 같은 그림체 UI 그림: 바다 지도 = 양피지 해도(map_chart), 판넬 = 나무판(ui_frames 0). 없으면 CSS 색 그대로
    const css = (n, i) => { const u = img(n, i); return u ? `url("${u}")` : 'none'; };
    root.style.setProperty('--chart', css('map_chart', 0));
    root.style.setProperty('--wood', css('ui_frames', 0));
    root.style.setProperty('--parch', css('ui_frames', 1));
    if (!eqS || !SY.owns(eqS)) eqS = s.ship;
    if (sel && !SY.SHIP[sel]) sel = null;
    const TABS = [['sea', '출항'], ['ship', '조선소'], ['gear', '장비'], ['lab', '의뢰 · 합성']];
    const body = tab === 'sea' ? mapHtml() + seaHtml()
      : tab === 'ship' ? prevHtml() + treeHtml()
        : tab === 'gear' ? prevHtml() + gearHtml() : labHtml();
    const sea = SEAS()[s.pick];
    root.innerHTML = `
      <div class="hg tab-${tab}">
        <header>
          <h1>항구</h1>
          <nav>${TABS.map(([id, n]) => `<button class="tabb ${tab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</nav>
          <span class="money" title="목재">${plankIc()} ${s.plank} <span class="lb">목재</span></span>
          <span class="money" title="치즈 금화">${coinIc()} ${s.coin} <span class="lb">치즈 금화</span></span>
          <button class="small" data-reset>처음부터</button>
          <button data-go>${sea ? `${s.pick + 1}번째 바다 ` : ''}출항</button>
        </header>
        ${body}
      </div>`;
    for (const cv of root.querySelectorAll('canvas[data-prev]')) drawShip(cv, cv.dataset.prev);
    for (const cv of root.querySelectorAll('canvas[data-ship]')) drawShip(cv, cv.dataset.ship);
    if (tab === 'ship') drawLinks($('#pt-tree .grid', root), SY.SHIPS.filter((f) => f.req).map((f) => [f.req, f.id, SY.owns(f.id)]), 'sel');
    if (tab === 'sea') {
      const L = SEAS().slice(1).map((sea, i) => [i, i + 1, i + 1 <= s.unlocked]);
      drawLinks($('#pt-map .seas', root), L, 'seaidx');
    }
  }

  // 선: 앞 칸 → 다음 칸. 트리 = 오른쪽 → 왼쪽 곡선, 지도 = 가운데끼리 점선 뱃길
  function drawLinks(grid, links, kind) {
    if (!grid) return;
    const svg = $('svg', grid), g = grid.getBoundingClientRect();
    const cards = kind === 'seaidx' ? [...grid.querySelectorAll('.sea')] : null;
    const box = (id) => { const el = kind === 'seaidx' ? cards[id] : $(`[data-sel="${id}"]`, grid); return el && el.getBoundingClientRect(); };
    svg.innerHTML = links.map(([a0, b0, on]) => {
      const a = box(a0), b = box(b0);
      if (!a || !b) return '';
      if (kind === 'seaidx') {
        const x1 = a.left + a.width / 2 - g.left, y1 = a.top + a.height / 2 - g.top, x2 = b.left + b.width / 2 - g.left, y2 = b.top + b.height / 2 - g.top;
        return `<path d="M${x1},${y1} Q${(x1 + x2) / 2 + (y1 !== y2 ? 60 : 0)},${(y1 + y2) / 2 - (y1 === y2 ? 24 : 0)} ${x2},${y2}" fill="none" stroke="${on ? '#ffd45c' : 'rgba(255,255,255,.25)'}" stroke-width="4" stroke-dasharray="3 10" stroke-linecap="round"/>`;
      }
      const x1 = a.right - g.left, y1 = a.top + a.height / 2 - g.top, x2 = b.left - g.left, y2 = b.top + b.height / 2 - g.top, mx = (x1 + x2) / 2;
      return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${on ? '#8ef08a' : 'rgba(255,255,255,.25)'}" stroke-width="4" ${on ? '' : 'stroke-dasharray="8 8"'}/>`;
    }).join('');
  }

  // 조선공 쥐 대사 (결과 등급별)
  const TALK = [
    ['평범하지만 튼튼하게 만들었지!', '기본이 제일 중요함. 잘 써 보게.'],
    ['오, 망치질이 잘 됐군!', '이건 꽤 쓸 만할 걸세.'],
    ['이건… 내 설계도에도 없던 물건이야!', '바다 마녀의 축복이라도 받았나? 아껴 쓰게!'],
    ['해냈다! 평생 한 번 나올 걸작!!', '이거면 고양이 대제독도 두렵지 않지!'],
  ];
  const UP_TALK = [['다음 시대의 기술이 완성됐네! 새 시대의 걸작!!', '전설을 녹여 더 높은 전설로… 이게 조선술이지!'], ['으음… 녹이다가 하나만 겨우 건졌네.', '실패도 배를 짓는 일의 일부. 다음엔 더 넣어 보게.']];
  const say = (g) => { const l = TALK[g]; talk = l[Math.floor(Math.random() * l.length)]; };
  const sayUp = (ok) => { const l = UP_TALK[ok ? 0 : 1]; talk = l[Math.floor(Math.random() * l.length)]; };

  function sail(i) {
    if (!SY.pickSea(i)) return;
    for (const o of OVS) $(o).classList.remove('on');
    PG.start(SY.save.pick);
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-sel],[data-use],[data-buy],[data-eq],[data-uneq],[data-eqs],[data-go],[data-reset],[data-sea],[data-req],[data-preset],[data-pick],[data-unpick],[data-fuse]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.go !== undefined) return sail(SY.save.pick);
    if (d.reset !== undefined) { if (confirm('항구를 처음부터 다시 시작? (배 · 장비 · 재화 · 바다 모두 사라짐)')) { SY.reset(); sel = null; eqS = null; last = null; picks = []; } }
    else if (d.tab) { tab = d.tab; hover = null; if (tab === 'gear') eqS = SY.save.ship; }
    else if (d.use) { SY.useShip(d.use); }
    else if (d.buy) { if (SY.buyShip(d.buy)) sfx('ui_buy'); }
    else if (d.eq) { if (SY.equipItem(+d.eq, d.to || eqS)) sfx('ui_buy', 0.6, 1.3); hover = null; }
    else if (d.uneq) { SY.unequip(eqS, d.uneq); }
    else if (d.eqs) { eqS = d.eqs; hover = null; }
    else if (d.sel) { sel = d.sel; }
    else if (d.sea) { SY.pickSea(+d.sea); }
    else if (d.preset) { coinAmt = +d.preset; }
    else if (d.req !== undefined) {
      const it = SY.request(coinAmt);
      if (it) { const g = SY.PART[it.id].grade; last = { uid: it.uid, how: '제작 의뢰 결과' }; say(g); sfx(g >= 2 ? 'clear' : 'ui_buy'); }
    }
    else if (d.pick) { picks.push(+d.pick); }
    else if (d.unpick) { picks = picks.filter((u) => u !== +d.unpick); }
    else if (d.fuse !== undefined) {
      const kind = SY.fuseInfo(picks)?.kind, r = SY.fuse(picks);
      if (r) {
        const g = SY.PART[r.it.id].grade;
        picks = [];
        if (kind === 'up') { last = { uid: r.it.uid, how: r.ok ? '티어 업 성공!' : '티어 업 실패 — 하나만 남음', fail: !r.ok }; sayUp(r.ok); sfx(r.ok ? 'clear' : 'fail'); }
        else { last = { uid: r.it.uid, how: '합성 결과' }; say(g); sfx(g >= 2 ? 'clear' : 'ui_buy'); }
      }
    }
    render();
  });
  // 의뢰 금액 슬라이더: 끄는 동안 확률 · 비용만 다시 그림
  root.addEventListener('input', (e) => {
    if (e.target.dataset.amt === undefined) return;
    coinAmt = +e.target.value;
    $('#lab-odds', root).innerHTML = oddsHtml();
  });
  // 장비 줄에 마우스 = 수치 미리보기 (왼쪽 수치만 다시 그림)
  root.addEventListener('mouseover', (e) => {
    if (tab !== 'gear') return;
    const p = e.target.closest('[data-hover]');
    const id = (p && p.dataset.hover) || null;
    if (id === hover) return;
    hover = id;
    const st = $('#pt-prev .stats', root);
    if (st) { const [cur, next] = previewPair(); st.innerHTML = statsHtml(cur, next); }
  });
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (root.classList.contains('on')) render(); }, 80); });

  function openPort(t) {
    sel = null; hover = null; eqS = null; last = null; picks = [];
    if (t) tab = t;
    show('#port');
    music('title');
    render();
  }

  // ── 타이틀
  function openTitle() {
    const art = img('title_art', 0), el = $('#title');
    el.classList.toggle('art', !!art);
    el.style.backgroundImage = art ? `url("${art}")` : '';
    show('#title');
    music('title');
  }

  // ── 스토리: 한 줄씩 나타남, 클릭 · Space = 다음 줄, Esc = 건너뛰기
  const STORY = [
    '고양이 해군이 우리 바다를 빼앗았다.',
    '치즈 항구도, 보물섬 뱃길도, 쥐들의 돛도 전부.',
    '남은 건 이 한쪽 눈과 훔친 갤리선 한 척뿐.',
    '맹세한다 — 바다를 되찾고, 일곱 바다를 전부 정복하겠다!',
  ];
  let storyN = 0, storyT = 0;
  function openStory() {
    $('#storyCap').innerHTML = capHtml('cap', 0);
    $('#storyLines').innerHTML = STORY.map((l) => `<p>${l}</p>`).join('');
    storyN = 0;
    show('#story');
    music('title');
    nextLine();
  }
  function nextLine() {
    clearTimeout(storyT);
    const ps = $('#storyLines').children;
    if (storyN < ps.length) ps[storyN++].classList.add('on');
    if (storyN < ps.length) storyT = setTimeout(nextLine, 1500);
  }
  function endStory() { clearTimeout(storyT); SY.seenStory(1); openPort('sea'); }
  $('#story').addEventListener('click', (e) => { if (e.target.id === 'storyGo') endStory(); else nextLine(); });

  $('#titleGo').addEventListener('click', () => { if (SY.save.story < 1) openStory(); else openPort('sea'); });

  // ── 결과: 이기면 전부, 침몰하면 절반
  let lastRun = null;
  function onEnd(r) {
    r = r || {};
    const sea = SEAS()[r.sea];
    const [p, c] = SY.bank(r.plank || 0, r.coin || 0, !!r.win, r.sea || 0);
    lastRun = r;
    const next = r.sea + 1;
    if (r.win && next < SEAS().length && next <= SY.save.unlocked) SY.pickSea(next);
    const el = $('#result');
    el.classList.toggle('lose', !r.win);
    $('#resTitle').textContent = r.win ? `${sea ? sea.name : '바다'} 정복!` : '침몰…';
    $('#resText').textContent = r.win
      ? (next < SEAS().length ? `다음 바다가 열림 — ${SEAS()[next].name}` : '일곱 바다를 모두 정복함! 바다의 주인은 이제 쥐 해적')
      : '애꾸 선장이 널빤지에 매달려 겨우 항구로 돌아옴';
    $('#resLoot').innerHTML = `
      <span>${plankIc()} 목재 +${p}</span>
      <span>${coinIc()} 치즈 금화 +${c}</span>
      <span>격침 ${r.kills || 0}</span>
      <span>구조한 쥐 ${r.rescued || 0}</span>`;
    $('#resHalf').textContent = r.win ? '이겼으니 전리품 전부 챙김' : `침몰해서 전리품 절반만 챙김 (주운 것: 목재 ${r.plank || 0} · 금화 ${r.coin || 0})`;
    const hasNext = r.win && next < SEAS().length;
    $('#resBtns').innerHTML = `<button class="sub" data-r="port">항구로</button><button class="sub" data-r="again">다시 출항</button>${hasNext ? '<button data-r="next">다음 바다로</button>' : ''}`;
    show('#result');
    music('title');
  }
  $('#result').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b || !lastRun) return;
    if (b.dataset.r === 'port') openPort('sea');
    else if (b.dataset.r === 'again') sail(lastRun.sea || 0);
    else if (b.dataset.r === 'next') sail((lastRun.sea || 0) + 1);
  });

  // ── 키보드: 오버레이가 켜져 있을 때만. 항구의 Esc 는 아무것도 안 함
  addEventListener('keydown', (e) => {
    if ($('#story').classList.contains('on')) {
      if (e.key === 'Escape') endStory();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextLine(); }
    } else if ($('#result').classList.contains('on')) {
      if (e.key === 'Escape') openPort('sea');
    } else if ($('#title').classList.contains('on')) {
      if (e.key === 'Enter') $('#titleGo').click();
    }
  });

  PG.onEnd = onEnd;
  ready(() => {
    PG.onEnd = onEnd;
    window.PORT = { open: openPort, title: openTitle, render };
    const q = new URLSearchParams(location.search);
    if (q.has('port')) { const t = q.get('port'); openPort(['sea', 'ship', 'gear', 'lab'].includes(t) ? t : 'sea'); } // 확인용: ?port=lab
    else openTitle();
  });
})();
