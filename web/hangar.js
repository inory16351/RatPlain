// 격납고: 비행기 진화 트리 + 파츠 장착. 데이터 · 저장 = upgrades.js, 그림 · 출격 = game.js 의 window.RP
// 기체 칸 클릭 = 왼쪽에 미리보기(수치 차이) → 진화(구매) / 이 기체로 바꾸기. 파츠 줄에 마우스 = 수치 차이 미리보기.
(function () {
  const UP = window.UPGRADES;
  const $ = (s, el = document) => el.querySelector(s);
  const root = $('#hangar');
  let sel = null;   // 왼쪽에 보이는 기체 id
  let hover = null; // 마우스가 올라간 파츠 id (수치 미리보기)

  function ready(fn) { if (window.RP) fn(); else addEventListener('rp-ready', fn, { once: true }); }

  // 그림 주소: PNG 는 src, 벡터 임시 그림(캔버스)은 data URL 로 한 번 만들어 둠
  const imgOf = (name, i = 0) => { const f = RP.SP[name] && RP.SP[name][i]; return f ? f.im.src || (f.url ||= f.im.toDataURL()) : null; };
  const SLOT_GLYPH = { engine: '⚙', gun: '✦', wing: '◢', armor: '▣', sub: '➶', special: '★' };
  function costHtml(c) {
    const g = imgOf('items', 0), k = imgOf('items', 1);
    return `<span class="cost">${c[0] ? `<img src="${g}"> ${c[0]} ` : ''}<img src="${k}"> ${c[1]}</span>`;
  }
  const grade = (t) => UP.GRADES[t];
  const tierTag = (t, label) => `<span class="tier" style="background:${grade(t).col}">${label || grade(t).name}</span>`;

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

  function render() {
    const s = UP.save, curF = UP.FRAME[s.frame];
    const f = UP.FRAME[sel || s.frame];
    const cur = UP.compute();
    // 미리보기: 파츠에 마우스 → 그 파츠 낀 상태 / 다른 기체 선택 → 그 기체로 바꾼 상태
    let next = null;
    if (hover) next = UP.compute({ equip: { [UP.PART[hover].slot]: hover } });
    else if (f.id !== s.frame) next = UP.compute({ frame: f.id });

    // 왼쪽: 선택한 기체
    const owned = s.frames.includes(f.id);
    let act;
    if (f.id === s.frame) act = `<button disabled>사용 중</button>`;
    else if (owned) act = `<button data-use="${f.id}">이 기체로 바꾸기</button>`;
    else if (UP.frameBuyable(f)) act = `<button data-buyf="${f.id}" ${UP.can(f.cost) ? '' : 'disabled'}>진화 · ${costHtml(f.cost)}</button>`;
    else act = `<button disabled>${UP.FRAME[f.req].name} 먼저</button>`;
    const newSlots = UP.SLOTS.filter((sl) => sl.tier === f.tier && f.tier > 0).map((sl) => sl.name);
    const prev = `
      <div class="panel" id="hg-prev">
        <canvas></canvas>
        <div class="nm">${tierTag(f.tier, `${f.tier}단계`)}${f.name}</div>
        <div class="kd">${f.kind} · ${UP.ERAS[f.tier]}</div>
        <div class="ds">${f.desc}<br><span style="color:${grade(f.tier).col}">${grade(f.tier).name} 등급 파츠까지 장착${newSlots.length ? ` · ${newSlots.join(', ')} 슬롯 열림` : ''}</span></div>
        <div class="stats">${statsHtml(cur, next)}</div>
        ${act}
      </div>`;

    // 가운데: 진화 트리 (열 = 단계, 줄 = 갈래)
    const nodes = UP.FRAMES.map((fr) => {
      const own = s.frames.includes(fr.id), buy = UP.frameBuyable(fr);
      const cls = ['node', own && 'own', fr.id === s.frame && 'use', !own && !buy && 'lock', fr.id === f.id && 'sel'].filter(Boolean).join(' ');
      const st = fr.id === s.frame ? '사용 중' : own ? '보유' : buy ? costHtml(fr.cost) : '🔒';
      return `<div class="${cls}" data-sel="${fr.id}" style="grid-column:${fr.tier + 1};grid-row:${fr.row + 1}"><canvas data-plane="${fr.id}"></canvas><div class="nm">${fr.name}</div><div class="st">${st}</div></div>`;
    }).join('');
    const tree = `
      <div class="panel" id="hg-tree">
        <h2>비행기 진화</h2>
        <div class="era">${UP.ERAS.map((e, i) => `<span>${tierTag(i, `${i}단계`)}${e}</span>`).join('')}</div>
        <div class="grid"><svg></svg>${nodes}</div>
      </div>`;

    // 오른쪽: 파츠 (슬롯마다)
    const slots = UP.SLOTS.map((sl) => {
      const open = UP.slotOpen(sl.id, curF);
      const unlockAt = UP.FRAMES.filter((fr) => fr.tier === sl.tier).map((fr) => fr.kind).join(' · ');
      const parts = UP.PARTS.filter((p) => p.slot === sl.id).map((p) => {
        const ownP = s.parts.includes(p.id), fits = UP.partFits(p, curF), on = open && cur.equip[sl.id] === p.id;
        let right;
        if (on) right = `<span class="tag">장착 중</span>`;
        else if (!fits) right = `<span class="pd">${p.tier}단계 기체</span>`;
        else if (ownP) right = `<button data-eq="${p.id}">장착</button>`;
        else right = `<button data-buyp="${p.id}" ${UP.can(p.cost) ? '' : 'disabled'}>${costHtml(p.cost)}</button>`;
        const src = p.icon && imgOf(p.icon[0], p.icon[1]);
        const ic = src && p.cost[1] ? `<img class="ic" src="${src}">` : `<div class="ic">${SLOT_GLYPH[sl.id]}</div>`;
        return `<div class="part ${on ? 'on' : ''} ${fits ? '' : 'lock'}" style="--g:${grade(p.tier).col}" data-hover="${fits && !on ? p.id : ''}">
          ${ic}<div><div class="pn">${p.name} <span style="color:${grade(p.tier).col};font-size:12px">${grade(p.tier).name}</span></div><div class="pd">${p.desc}</div></div>${right}</div>`;
      }).join('');
      return `<div class="slot ${open ? '' : 'lock'}"><h3><span>${sl.name}</span>${open ? '' : `<span>🔒 ${sl.tier}단계(${unlockAt})부터</span>`}</h3>${open ? parts : ''}</div>`;
    }).join('');

    // 스테이지 고르기
    const stages = STAGES.map((st, i) => {
      const open = i <= s.unlocked, clear = s.cleared.includes(st.id), on = i === s.pick;
      const [num, ...rest] = st.name.split(' · ');
      return `<div class="stg ${on ? 'on' : ''} ${open ? '' : 'lock'}" ${open ? `data-stage="${i}"` : ''}>
        <div class="sn">${num}${clear ? ' <span class="ok">✓</span>' : ''}</div>
        <div class="st">${open ? rest.join(' · ') : '🔒 앞 스테이지를 깨면 열림'}</div>
        <div class="sb">보스 · ${st.bossName} ${tierTag(st.rec, `추천 ${st.rec}단계`)}</div></div>`;
    }).join('');

    root.innerHTML = `
      <div class="hg">
        <header>
          <h1>격납고</h1>
          <span class="money"><img src="${imgOf('items', 0)}"> ${s.gear}</span>
          <span class="money"><img src="${imgOf('items', 1)}"> ${s.coin}</span>
          <button class="small" data-reset>처음부터</button>
          <button data-go>${STAGES[s.pick].name.split(' · ')[0]} 출격</button>
        </header>
        <div id="hg-stages">${stages}</div>
        ${prev}${tree}
        <div class="panel" id="hg-parts"><h2>파츠 · ${curF.name}</h2>${slots}</div>
      </div>`;

    drawPlane($('#hg-prev canvas', root), f);
    for (const cv of root.querySelectorAll('canvas[data-plane]')) drawPlane(cv, UP.FRAME[cv.dataset.plane]);
    drawLinks();
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

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sel],[data-use],[data-buyf],[data-eq],[data-buyp],[data-go],[data-reset],[data-stage]');
    if (!t) return;
    const d = t.dataset;
    if (d.go !== undefined) return RP.start();
    if (d.reset !== undefined) { if (confirm('격납고를 처음부터 다시 시작할까요? (기체 · 파츠 · 재료 모두 사라짐)')) { UP.reset(); sel = null; } }
    else if (d.use) { UP.useFrame(d.use); }
    else if (d.buyf) { UP.buyFrame(d.buyf); SND.sfx('ui_buy'); }
    else if (d.eq) { UP.equipPart(d.eq); hover = null; }
    else if (d.buyp) { UP.buyPart(d.buyp); hover = null; SND.sfx('ui_buy'); }
    else if (d.sel) { sel = d.sel; }
    else if (d.stage) { UP.pickStage(+d.stage); }
    render();
  });
  // 파츠 줄에 마우스 = 수치 미리보기 (왼쪽 수치만 다시 그림)
  root.addEventListener('mouseover', (e) => {
    const p = e.target.closest('[data-hover]');
    const id = (p && p.dataset.hover) || null;
    if (id === hover) return;
    hover = id;
    const s = UP.save, f = UP.FRAME[sel || s.frame];
    const next = hover ? UP.compute({ equip: { [UP.PART[hover].slot]: hover } }) : f.id !== s.frame ? UP.compute({ frame: f.id }) : null;
    $('#hg-prev .stats', root).innerHTML = statsHtml(UP.compute(), next);
  });
  addEventListener('resize', () => { if (root.classList.contains('on')) render(); });

  function open() {
    for (const id of ['#title', '#result']) $(id).classList.remove('on');
    sel = null; hover = null;
    root.classList.add('on');
    SND.play('title');
    render();
  }
  ready(() => {
    for (const b of document.querySelectorAll('.hangarBtn')) b.addEventListener('click', open);
    window.RP.openHangar = open;
    if (new URLSearchParams(location.search).has('hangar')) open(); // 확인용
  });
})();
