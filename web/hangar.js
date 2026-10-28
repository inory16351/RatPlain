// 격납고: 탭 3개 — 기체(진화 트리) · 장비(가진 기체마다 슬롯에 끼우기) · 연구소(과학자 쥐 제작 의뢰 · 합성 · 티어 업 도전)
// 데이터 · 저장 = upgrades.js, 그림 · 출격 = game.js 의 window.RP
// 기체 칸 클릭 = 왼쪽에 미리보기(수치 차이) → 진화(구매) / 이 기체로 바꾸기. 장비 줄에 마우스 = 수치 차이 미리보기.
(function () {
  const UP = window.UPGRADES;
  const $ = (s, el = document) => el.querySelector(s);
  const root = $('#hangar');
  let tab = 'frame';   // 'frame' · 'gear' · 'lab'
  let sel = null;      // 기체 탭: 왼쪽에 보이는 기체 id
  let eqF = null;      // 장비 탭: 장비를 보고 있는 기체 id (가진 기체만)
  let hover = null;    // 마우스가 올라간 장비 id (수치 미리보기)
  let coinAmt = 100;   // 연구소: 의뢰에 쓸 기준 코인 (실제 비용 = × 테크 배율)
  let last = null;     // 연구소: 방금 나온 장비 { uid, how: '제작 의뢰' | '합성' | '티어 업 성공' | '티어 업 실패' }
  let picks = [];      // 연구소: 합성 재료로 고른 uid
  let talk = '무엇이든 만들어 주지! 재료를 많이 줄수록 좋은 게 나올 확률이 높아진다네.';

  function ready(fn) { if (window.RP) fn(); else addEventListener('rp-ready', fn, { once: true }); }

  // 그림 주소: PNG 는 src, 벡터 임시 그림(캔버스)은 data URL 로 한 번 만들어 둠
  const imgOf = (name, i = 0) => { const f = RP.SP[name] && RP.SP[name][i]; return f ? f.im.src || (f.url ||= f.im.toDataURL()) : null; };
  function costHtml(c) {
    const g = imgOf('items', 0), k = imgOf('items', 1);
    return `<span class="cost">${c[0] ? `<img src="${g}"> ${c[0]} ` : ''}<img src="${k}"> ${c[1]}</span>`;
  }
  const grade = (t) => UP.GRADES[t];
  const tierTag = (t, label) => `<span class="tier" style="background:${grade(t).col}">${label || grade(t).name}</span>`;
  // 티어(기술 단계) 표시: 단계별 색
  const techTag = (t, label) => `<span class="tier" style="background:${UP.TIER_COL[t]}">${label || `T${t}`}</span>`;
  function iconHtml(p, cls = 'ic') {
    const src = p.icon && imgOf(p.icon[0], p.icon[1]);
    return src ? `<img class="${cls}" src="${src}" style="--g:${grade(p.grade).col}">` : `<div class="${cls}" style="--g:${grade(p.grade).col}">${UP.SLOT_TYPES[p.slot].glyph}</div>`;
  }
  const gradeTxt = (p) => `${techTag(p.tier)}<span style="color:${grade(p.grade).col};font-size:12px">${grade(p.grade).name}</span>`;
  // 낄 수 있는 기체: 갈래 이름 + 몇 단계 이상
  const fitTxt = (p) => `${p.lines ? p.lines.map((l) => UP.LINES[l]).join(' · ') : '모든 갈래'} ${p.tier}단계↑`;
  const forTxt = (p) => `${UP.SLOT_TYPES[p.slot].name} · ${fitTxt(p)}`;
  // 이 장비를 끼울 기체: 지금 탄 기체가 되면 그것, 아니면 가진 기체 중 가장 높은 단계
  function bestFrame(p) {
    const own = p.fits.filter(UP.owns);
    if (own.includes(UP.save.frame)) return UP.save.frame;
    return own.sort((a, b) => UP.FRAME[b].tier - UP.FRAME[a].tier)[0] || null;
  }

  // 비행기 그림: 기수가 위로 (격납고에선 세워서 보여 줌)
  function drawPlane(cv, frame) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    const x = cv.getContext('2d'), L = RP.planeLook(frame), f = RP.SP[L.spr][0];
    const w = f.w * L.scale, h = f.h * L.scale;
    const k = Math.min(cv.width / (h * 1.15), cv.height / (w * 1.15)); // 돌렸으니 가로 ↔ 세로
    x.translate(cv.width / 2, cv.height / 2);
    x.rotate(-Math.PI / 2);
    x.scale(k, k);
    if (L.filter) x.filter = L.filter;
    x.drawImage(f.im, -w / 2, -h / 2, w, h);
  }

  function statsHtml(cur, next) {
    const a = UP.summary(cur), b = next ? UP.summary(next) : a;
    return a.map(([n, v], i) => {
      const d = +(b[i][1] - v).toFixed(1);
      return `<span>${n}</span><span class="v">${b[i][1]}</span><span class="d ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d ? (d > 0 ? '+' : '') + d : ''}</span>`;
    }).join('');
  }
  // 왼쪽 미리보기의 [지금, 바꾸면] 수치
  function previewPair() {
    const s = UP.save;
    if (tab === 'gear') {
      const cur = UP.compute({ frame: eqF });
      return [cur, hover ? UP.compute({ frame: eqF, equip: { [UP.PART[hover].slot]: hover } }) : null];
    }
    const f = sel || s.frame;
    return [UP.compute(), f !== s.frame ? UP.compute({ frame: f }) : null];
  }

  // ── 왼쪽: 기체 미리보기 (기체 탭 = 고른 기체, 장비 탭 = 장비 보는 기체)
  function prevHtml() {
    const s = UP.save, f = UP.FRAME[tab === 'gear' ? eqF : sel || s.frame];
    const owned = s.frames.includes(f.id);
    let act;
    if (f.id === s.frame) act = `<button disabled>사용 중</button>`;
    else if (owned) act = `<button data-use="${f.id}">이 기체로 바꾸기</button>`;
    else if (UP.frameBuyable(f)) act = `<button data-buyf="${f.id}" ${UP.can(f.cost) ? '' : 'disabled'}>진화 · ${costHtml(f.cost)}</button>`;
    else act = `<button disabled>${UP.FRAME[f.req].name} 먼저</button>`;
    const [cur, next] = previewPair();
    return `
      <div class="panel" id="hg-prev">
        <canvas></canvas>
        <div class="nm">${techTag(f.tier, `${f.tier}단계`)}${f.name}</div>
        <div class="kd">${f.kind} · ${f.line ? UP.LINES[f.line] : '시작 기체'} · ${UP.ERAS[f.tier]}</div>
        <div class="ds">${f.desc}<br><span class="slots-line">슬롯 ${f.slots.length}칸 · ${f.slots.map((sl) => UP.SLOT_TYPES[sl].name).join(' · ')}</span></div>
        <div class="stats">${statsHtml(cur, next)}</div>
        ${act}
      </div>`;
  }

  // ── 기체 탭: 진화 트리 (열 = 단계, 줄 = 갈래)
  function treeHtml() {
    const s = UP.save, f = UP.FRAME[sel || s.frame];
    const nodes = UP.FRAMES.map((fr) => {
      const own = s.frames.includes(fr.id), buy = UP.frameBuyable(fr);
      const cls = ['node', own && 'own', fr.id === s.frame && 'use', !own && !buy && 'lock', fr.id === f.id && 'sel'].filter(Boolean).join(' ');
      const st = fr.id === s.frame ? '사용 중' : own ? '보유' : buy ? costHtml(fr.cost) : '🔒';
      return `<div class="${cls}" data-sel="${fr.id}" style="grid-column:${fr.tier + 1};grid-row:${fr.row + 1}"><canvas data-plane="${fr.id}"></canvas><div class="nm">${fr.name}</div><div class="st">${st}</div></div>`;
    }).join('');
    return `
      <div class="panel wide" id="hg-tree">
        <h2>비행기 진화 <span class="sub">위 = 전투기 · 가운데 = 다목적기 · 아래 = 폭격기 · 지금 테크 ${UP.tech()}단계</span></h2>
        <div class="era">${UP.ERAS.map((e, i) => `<span>${techTag(i, `${i}단계`)}${e}</span>`).join('')}</div>
        <div class="grid"><svg></svg>${nodes}</div>
      </div>`;
  }

  // 가진 장비를 장비 id 로 묶음: [{ p, uids, free(장착 · 선택 안 한 uid) }]
  function groups(items) {
    const m = new Map();
    for (const it of items) {
      if (!m.has(it.id)) m.set(it.id, { p: UP.PART[it.id], uids: [], free: [] });
      const g = m.get(it.id);
      g.uids.push(it.uid);
      if (!UP.isEquipped(it.uid) && !picks.includes(it.uid)) g.free.push(it.uid);
    }
    return [...m.values()].sort((a, b) => b.p.tier - a.p.tier || b.p.grade - a.p.grade || a.p.slot.localeCompare(b.p.slot) || a.p.name.localeCompare(b.p.name));
  }

  // ── 장비 탭: 가운데 = 슬롯, 오른쪽 = 이 기체에 낄 수 있는 보관함 (가진 기체만)
  function gearHtml() {
    const s = UP.save, f = UP.FRAME[eqF], eq = UP.equipOf(f.id);
    const chips = UP.FRAMES.filter((fr) => UP.owns(fr.id)).map((fr) => {
      const n = UP.itemsFor(fr.id).filter((it) => !UP.isEquipped(it.uid)).length;
      return `<button class="chip ${fr.id === f.id ? 'on' : ''}" data-eqf="${fr.id}">${fr.tier} · ${fr.name}${n ? ` <b>${n}</b>` : ''}</button>`;
    }).join('');
    const slots = f.slots.map((sl) => {
      const it = UP.itemOf(eq[sl]), p = it && UP.PART[it.id];
      const body = p
        ? `${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)}</div><div class="pd">${p.desc}</div></div><button class="small" data-uneq="${sl}">빼기</button>`
        : `<div class="ic empty">${UP.SLOT_TYPES[sl].glyph}</div><div class="pd">비어 있음 — 오른쪽 보관함에서 골라 끼우기</div><span></span>`;
      return `<div class="slot"><h3><span>${UP.SLOT_TYPES[sl].name}</span></h3><div class="part ${p ? 'on' : 'emptyrow'}" style="--g:${p ? grade(p.grade).col : 'transparent'}">${body}</div></div>`;
    }).join('');
    const inv = groups(UP.itemsFor(f.id)).map(({ p, uids }) => {
      const here = uids.find((u) => eq[p.slot] === u);
      const free = uids.find((u) => !UP.isEquipped(u));
      const elsewhere = !here && !free && UP.equippedOn(uids[0]);
      const right = here ? `<span class="tag">장착 중</span>`
        : free ? `<button data-eq="${free}">장착</button>`
          : `<button class="small" data-eq="${uids[0]}" title="${UP.FRAME[elsewhere].name}에서 빼서 옮김">옮기기</button>`;
      const note = elsewhere ? ` · <span class="warn">${UP.FRAME[elsewhere].name}에 장착 중</span>` : '';
      return `<div class="part ${here ? 'on' : ''}" style="--g:${grade(p.grade).col}" data-hover="${here ? '' : p.id}">
        ${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)}${uids.length > 1 ? ` <span class="cnt">×${uids.length}</span>` : ''}</div><div class="pd">${UP.SLOT_TYPES[p.slot].name} · ${p.desc}${note}</div></div>${right}</div>`;
    }).join('') || `<p class="none">이 기체에 낄 수 있는 장비가 아직 없어요.<br>연구소에서 과학자 쥐에게 제작을 의뢰해 보세요.</p>`;
    return `
      <div class="panel" id="hg-slots"><h2>장비 · ${f.name}</h2><div class="chips">${chips}</div>
        <p class="note">장비는 티어 · 등급 · 낄 수 있는 갈래가 따로예요. 낮은 티어 장비는 높은 단계 기체에 낄 수 있지만, 그 반대는 안 돼요.</p>${slots}</div>
      <div class="panel" id="hg-inv"><h2>보관함 · ${f.name}에 낄 수 있는 것</h2>${inv}</div>`;
  }

  // ── 연구소 탭: 왼쪽 = 과학자 쥐, 가운데 = 제작 의뢰 · 결과, 오른쪽 = 전체 보관함 · 합성
  function oddsHtml() {
    const o = UP.odds(coinAmt), cost = UP.requestCost(coinAmt), to = UP.tierOdds();
    const tiers = to.map((v, t) => [t, v]).filter(([, v]) => v > 0).reverse();
    return `
      <div class="odds">${o.map((v, g) => `
        <div class="orow"><span style="color:${grade(g).col}">${grade(g).name}</span>
          <div class="obar"><i style="width:${v}%;background:${grade(g).col}"></i></div>
          <b>${v.toFixed(1)}%</b><span class="pool"></span></div>`).join('')}
      </div>
      <div class="todds"><span class="lb">티어</span>${tiers.map(([t, v]) => `<span>${techTag(t)} ${v.toFixed(v < 10 ? 1 : 0)}%</span>`).join('')}</div>
      <button class="big" data-req ${UP.can(cost) ? '' : 'disabled'}>제작 의뢰 · ${costHtml(cost)}</button>`;
  }
  function fuseBtn() {
    const info = UP.fuseInfo(picks);
    if (!info) return `<button data-fuse disabled>${picks.length && UP.PART[UP.itemOf(picks[0]).id].grade === 3 ? `전설 ${UP.FUSE_N}개 이상` : '합성'}</button>`;
    if (info.kind === 'fuse') return `<button data-fuse>합성</button>`;
    return info.block ? `<button data-fuse disabled title="${info.block}">티어 업 · ${info.block}</button>`
      : `<button data-fuse class="up">티어 업 도전 · ${info.chance}%</button>`;
  }
  function labHtml() {
    const s = UP.save;
    let result = '';
    if (last) {
      const it = UP.itemOf(last.uid);
      if (it) {
        const p = UP.PART[it.id], on = UP.equippedOn(it.uid), to = bestFrame(p);
        result = `
          <div class="result g${p.grade} ${last.fail ? 'fail' : ''}" style="--g:${grade(p.grade).col}">
            <div class="rh">${last.how}</div>
            ${iconHtml(p, 'ric')}
            <div class="rn">${p.name}</div>
            <div>${techTag(p.tier, `티어 ${p.tier}`)} ${tierTag(p.grade)} ${forTxt(p)}</div>
            <div class="pd">${p.desc}</div>
            ${on ? `<span class="tag">${UP.FRAME[on].name}에 장착 중</span>` : to ? `<button data-eq="${it.uid}" data-to="${to}">${UP.FRAME[to].name}에 바로 장착</button>` : `<span class="tag">낄 수 있는 기체가 아직 없음</span>`}
          </div>`;
      }
    }
    // 합성 재료 칸: 일반~희귀 3칸, 전설(티어 업 도전)은 6칸까지
    const p0 = picks.length ? UP.PART[UP.itemOf(picks[0]).id] : null;
    const max = p0 && p0.grade === 3 ? UP.UP_MAX : UP.FUSE_N;
    const tray = Array.from({ length: max }, (_, i) => {
      const it = UP.itemOf(picks[i]);
      return it ? `<div class="tslot" data-unpick="${it.uid}" title="빼기">${iconHtml(UP.PART[it.id])}</div>` : `<div class="tslot empty">+</div>`;
    }).join('');
    const inv = groups(s.items).map(({ p, uids, free }) => {
      const ok = free.length && (!p0 || (p0.grade === p.grade && p0.tier === p.tier)) && picks.length < max;
      const dead = !UP.usable(p);
      return `<div class="part ${ok ? '' : 'lock'}" style="--g:${grade(p.grade).col}">
        ${iconHtml(p)}<div><div class="pn">${p.name} ${gradeTxt(p)} <span class="cnt">×${uids.length}</span></div><div class="pd">${forTxt(p)}${dead ? ' · <span class="warn">가진 기체 중 낄 곳 없음</span>' : ''}${uids.length > free.length ? ' · 장착 · 선택 제외' : ''}</div></div>
        <button class="small" data-pick="${free[0] || ''}" ${ok ? '' : 'disabled'}>재료</button></div>`;
    }).join('') || `<p class="none">아직 장비가 없어요.</p>`;
    const chances = Object.entries(UP.UP_CHANCE).map(([n, c]) => `${n}개 ${c}%`).join(' · ');
    return `
      <div class="panel" id="lab-sci">
        <img class="sci" src="${imgOf('scientist', 0) || ''}">
        <div class="bubble">${talk}</div>
        <div class="kd">지금까지 의뢰 ${s.requests}번 · 티어 업 도전 ${s.tierUps || 0}번</div>
      </div>
      <div class="panel" id="lab-req">
        <h2>제작 의뢰 <span class="sub">지금 테크 ${UP.tech()}단계 · 비용 ×${UP.reqK().toFixed(1)}</span></h2>
        <p class="note">가진 기체에 낄 수 있는 장비만 나와요. 테크(가진 기체의 최고 단계) 티어가 주로 나오고, 낮은 티어도 섞여요. 쓸 재료를 늘릴수록 높은 등급 확률이 올라가요.</p>
        <div class="amt">
          <input type="range" min="${UP.REQ.min}" max="${UP.REQ.max}" step="${UP.REQ.step}" value="${coinAmt}" data-amt>
          <div class="presets">${[30, 100, 250, 600].map((v) => `<button class="small" data-preset="${v}">${Math.round(v * UP.reqK())}</button>`).join('')}</div>
        </div>
        <div id="lab-odds">${oddsHtml()}</div>
        ${result}
      </div>
      <div class="panel" id="lab-inv">
        <h2>합성 <span class="sub">같은 티어 · 같은 등급 ${UP.FUSE_N}개 → 한 등급 위 (랜덤)</span></h2>
        <p class="note">전설은 ${UP.FUSE_N}~${UP.UP_MAX}개를 넣어 <b>한 티어 위 전설</b>에 도전 (${chances}). 실패하면 같은 티어 전설 하나만 남아요. 한 단계 위 기체가 있어야 도전 가능.</p>
        <div class="tray">${tray}${fuseBtn()}</div>
        <h2>보관함 <span class="sub">${s.items.length}개</span></h2>
        ${inv}
      </div>`;
  }

  function stagesHtml() {
    const s = UP.save;
    return STAGES.map((st, i) => {
      const open = i <= s.unlocked, clear = s.cleared.includes(st.id), on = i === s.pick;
      const [num, ...rest] = st.name.split(' · ');
      const line = st.recLine ? ` · ${UP.LINES[st.recLine]}` : '';
      return `<div class="stg ${on ? 'on' : ''} ${open ? '' : 'lock'}" ${open ? `data-stage="${i}"` : ''} title="${st.trait ? `${st.trait.name}: ${st.trait.tip}` : ''}">
        <div class="sn">${num}${clear ? ' <span class="ok">✓</span>' : ''}</div>
        <div class="st">${open ? rest.join(' · ') : '🔒 앞 스테이지를 깨면 열림'}</div>
        <div class="sb">${st.trait ? `<span class="trait">${st.trait.name}</span> ` : ''}${techTag(st.rec, `추천 ${st.rec}단계${line}`)}</div></div>`;
    }).join('');
  }

  function render() {
    const s = UP.save;
    if (!eqF || !UP.owns(eqF)) eqF = s.frame;
    const TABS = [['frame', '기체'], ['gear', '장비'], ['lab', '연구소']];
    const body = tab === 'frame' ? prevHtml() + treeHtml() : tab === 'gear' ? prevHtml() + gearHtml() : labHtml();
    root.innerHTML = `
      <div class="hg tab-${tab}">
        <header>
          <h1>격납고</h1>
          <nav>${TABS.map(([id, n]) => `<button class="tabb ${tab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</nav>
          <span class="money"><img src="${imgOf('items', 0)}"> ${s.gear}</span>
          <span class="money"><img src="${imgOf('items', 1)}"> ${s.coin}</span>
          <button class="small" data-reset>처음부터</button>
          <button data-go>${STAGES[s.pick].name.split(' · ')[0]} 출격</button>
        </header>
        ${tab === 'lab' ? '' : `<div id="hg-stages">${stagesHtml()}</div>`}
        ${body}
      </div>`;
    const pc = $('#hg-prev canvas', root);
    if (pc) drawPlane(pc, UP.FRAME[tab === 'gear' ? eqF : sel || s.frame]);
    for (const cv of root.querySelectorAll('canvas[data-plane]')) drawPlane(cv, UP.FRAME[cv.dataset.plane]);
    if (tab === 'frame') drawLinks();
  }

  // 진화 트리 선: 부모 칸 오른쪽 → 자식 칸 왼쪽
  function drawLinks() {
    const grid = $('#hg-tree .grid', root), svg = $('svg', grid), g = grid.getBoundingClientRect();
    const box = (id) => $(`[data-sel="${id}"]`, grid).getBoundingClientRect();
    svg.innerHTML = UP.FRAMES.filter((f) => f.req).map((f) => {
      const a = box(f.req), b = box(f.id);
      const x1 = a.right - g.left, y1 = a.top + a.height / 2 - g.top, x2 = b.left - g.left, y2 = b.top + b.height / 2 - g.top, mx = (x1 + x2) / 2;
      const on = UP.save.frames.includes(f.id);
      return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${on ? '#8ef08a' : 'rgba(255,255,255,.25)'}" stroke-width="4" ${on ? '' : 'stroke-dasharray="8 8"'}/>`;
    }).join('');
  }

  // 과학자 쥐 대사 (결과 등급별)
  const LINES = [
    ['평범하지만 튼튼하게 만들었네!', '기본기가 제일 중요하지. 잘 써 주게.'],
    ['오, 손이 좀 잘 풀렸어!', '이건 꽤 쓸 만할 걸세.'],
    ['이건… 내 연구 노트에도 없던 설계야!', '특별한 힘이 깃든 물건이라네. 아껴 쓰게!'],
    ['해냈어! 일생일대의 걸작이야!!', '이 녀석이라면 고양이 대왕도 두렵지 않지!'],
  ];
  const UP_LINES = [['다음 세대 기술이 완성됐네! 새 시대의 걸작이야!!', '전설을 녹여 더 높은 전설로… 이게 과학이지!'], ['으음… 녹이다가 하나만 겨우 건졌네.', '실패도 연구의 일부라네. 다음엔 더 넣어 보게.']];
  const say = (g) => { const l = LINES[g]; talk = l[Math.floor(Math.random() * l.length)]; };
  const sayUp = (ok) => { const l = UP_LINES[ok ? 0 : 1]; talk = l[Math.floor(Math.random() * l.length)]; };

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-sel],[data-use],[data-buyf],[data-eq],[data-uneq],[data-eqf],[data-go],[data-reset],[data-stage],[data-req],[data-preset],[data-pick],[data-unpick],[data-fuse]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.go !== undefined) return RP.start();
    if (d.reset !== undefined) { if (confirm('격납고를 처음부터 다시 시작할까요? (기체 · 장비 · 재료 모두 사라짐)')) { UP.reset(); sel = null; eqF = null; last = null; picks = []; } }
    else if (d.tab) { tab = d.tab; hover = null; if (tab === 'gear') eqF = UP.save.frame; }
    else if (d.use) { UP.useFrame(d.use); }
    else if (d.buyf) { UP.buyFrame(d.buyf); SND.sfx('ui_buy'); }
    else if (d.eq) { if (UP.equipItem(+d.eq, d.to || eqF)) SND.sfx('ui_buy', 0.6, 1.3); hover = null; }
    else if (d.uneq) { UP.unequip(eqF, d.uneq); }
    else if (d.eqf) { eqF = d.eqf; hover = null; }
    else if (d.sel) { sel = d.sel; }
    else if (d.stage) { UP.pickStage(+d.stage); }
    else if (d.preset) { coinAmt = +d.preset; }
    else if (d.req !== undefined) {
      const it = UP.request(coinAmt);
      if (it) { const g = UP.PART[it.id].grade; last = { uid: it.uid, how: '제작 의뢰 결과' }; say(g); SND.sfx(g >= 2 ? 'clear' : 'ui_buy'); }
    }
    else if (d.pick) { picks.push(+d.pick); }
    else if (d.unpick) { picks = picks.filter((u) => u !== +d.unpick); }
    else if (d.fuse !== undefined) {
      const kind = UP.fuseInfo(picks)?.kind, r = UP.fuse(picks);
      if (r) {
        const g = UP.PART[r.it.id].grade;
        picks = [];
        if (kind === 'up') { last = { uid: r.it.uid, how: r.ok ? '티어 업 성공!' : '티어 업 실패 — 하나만 남음', fail: !r.ok }; sayUp(r.ok); SND.sfx(r.ok ? 'clear' : 'fail'); }
        else { last = { uid: r.it.uid, how: '합성 결과' }; say(g); SND.sfx(g >= 2 ? 'clear' : 'ui_buy'); }
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
    if (tab === 'lab') return;
    const p = e.target.closest('[data-hover]');
    const id = (p && p.dataset.hover) || null;
    if (id === hover) return;
    hover = id;
    const [cur, next] = previewPair();
    $('#hg-prev .stats', root).innerHTML = statsHtml(cur, next);
  });
  addEventListener('resize', () => { if (root.classList.contains('on')) render(); });

  function open() {
    for (const id of ['#title', '#result']) $(id).classList.remove('on');
    sel = null; hover = null; eqF = null; last = null; picks = [];
    root.classList.add('on');
    SND.play('title');
    render();
  }
  ready(() => {
    for (const b of document.querySelectorAll('.hangarBtn')) b.addEventListener('click', open);
    window.RP.openHangar = open;
    const q = new URLSearchParams(location.search);
    if (q.has('hangar')) { tab = q.get('hangar') === 'lab' ? 'lab' : q.get('hangar') === 'gear' ? 'gear' : 'frame'; open(); } // 확인용: ?hangar=lab
  });
})();
