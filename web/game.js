// 슈퍼맨 쥐 전투 데모: 탑뷰 자유 공중전
// WASD(방향키) = 가고 싶은 방향 → 비행기가 그쪽으로 선회(늘 앞으로 날아감). 마우스 = 조준, 왼쪽 클릭 = 사격, Space = 부스트.
// 스테이지(stages.js) = 배경 + 웨이브 + 보스. 쏘지 않으면 체력 회복.
(async function () {
  const $ = (s) => document.querySelector(s);
  const cv = $('#cv'), ctx = cv.getContext('2d');
  const VW = 1600, VH = 900;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const turnTo = (a, b, max) => a + clamp(angDiff(a, b), -max, max);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // 칸 좌표 → 고정 난수 (섬 · 물결 자리가 매번 같게)
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const qs = new URLSearchParams(location.search);
  const FONT = "'Pretendard', 'Malgun Gothic', sans-serif"; // 오버레이(index.html)와 같은 글꼴

  // ── 그림
  function loadImage(src) {
    return new Promise((ok, fail) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => fail(new Error('그림 로드 실패 ' + src));
      im.src = (window.__ASSETS && window.__ASSETS[src]) || src; // 단일 HTML 빌드는 data URI 로 품고 있음
    });
  }
  const SP = {};
  for (const [name, frames] of Object.entries(window.SPRITES)) {
    SP[name] = await Promise.all(frames.map(async (f) => ({ ...f, im: await loadImage('../art/sprites/' + f.img) })));
  }
  // 그림(PNG)이 아직 없는 것은 벡터 임시 그림 (vector.js). Codex 그림이 들어오면 그쪽이 먼저
  for (const [name, make] of Object.entries(window.VECTOR_ART)) if (!SP[name]) SP[name] = make();
  // 그림자: 그림을 검게 칠한 사본
  function silhouette(f) {
    const c = document.createElement('canvas');
    c.width = f.im.width; c.height = f.im.height;
    const x = c.getContext('2d');
    x.drawImage(f.im, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#0b2a45';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  for (const n of Object.keys(SP)) if (/^(player|e_|boss|clouds)/.test(n)) for (const f of SP[n]) f.shadow = silhouette(f);

  // ── 화면 맞춤
  const view = { k: 1 };
  function fit() {
    const s = Math.min(innerWidth / VW, innerHeight / VH);
    cv.style.width = VW * s + 'px';
    cv.style.height = VH * s + 'px';
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(VW * s * dpr);
    cv.height = Math.round(VH * s * dpr);
    view.k = cv.width / VW;
  }
  addEventListener('resize', fit);
  fit();

  // ── 입력
  const input = { mx: VW / 2 + 300, my: VH / 2, fire: false, boost: false, keys: new Set() };
  const DIRS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    input.mx = (e.clientX - r.left) / r.width * VW;
    input.my = (e.clientY - r.top) / r.height * VH;
  });
  cv.addEventListener('mousedown', (e) => { if (e.button === 0) input.fire = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) input.fire = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    if (DIRS[e.code]) { input.keys.add(e.code); e.preventDefault(); }
    if (e.code === 'Space') { input.boost = true; e.preventDefault(); }
    if (e.code === 'KeyP' || e.code === 'Escape') setPaused(!paused);
  });
  addEventListener('keyup', (e) => { input.keys.delete(e.code); if (e.code === 'Space') input.boost = false; });
  addEventListener('blur', () => { input.fire = false; input.boost = false; input.keys.clear(); if (running && !S.over) setPaused(true); });
  function setPaused(v) {
    if (!running || S.over) v = false; // 타이틀 · 결과 화면에서는 멈추지 않음
    paused = v;
    SND.hold(v);
  }
  function wantDir() {
    let x = 0, y = 0;
    for (const k of input.keys) { x += DIRS[k][0]; y += DIRS[k][1]; }
    return x || y ? Math.atan2(y, x) : null;
  }

  // ── 수치: 기본값은 upgrades.js 의 BASE, 출격할 때 기체 · 파츠를 반영해 다시 계산
  const UP = window.UPGRADES;
  let T = UP.compute();
  // 적: 일반 적 체력은 스테이지 mult.hp 배, 보스는 여기 적힌 그대로. hit = 보스 몸통 타원 [기수 방향 반지름, 옆 반지름] (없으면 원 r)
  const FOE = {
    cat: { hp: 7, r: 44, spr: 'e_cat', speed: 300, turn: 2.2, gear: 2, coin: 3 },
    hawk: { hp: 5, r: 40, spr: 'e_hawk', speed: 330, turn: 3.0, gear: 1, coin: 2 },
    swift: { hp: 3, r: 32, spr: 'e_swift', speed: 470, turn: 4.0, gear: 1, coin: 1 },   // 제비: 빠르게 지그재그로 스쳐 가며 2발
    bomber: { mat: 'metal', hp: 24, r: 62, spr: 'e_bomber', speed: 170, turn: 1.0, gear: 4, coin: 5 }, // 폭격 고양이: 느리고 단단, 원형탄 + 3갈래
    boss: { mat: 'metal', boss: true, hp: 360, r: 160, hit: [230, 95], spr: 'boss', speed: 120, turn: 0.7, gear: 15, coin: 30 },          // 1 고양이 비행선
    eagle: { boss: true, hp: 700, r: 105, spr: 'boss_eagle', speed: 300, turn: 2.0, gear: 25, coin: 50 },                    // 2 천둥 독수리
    owl: { boss: true, hp: 1100, r: 115, spr: 'boss_owl', speed: 140, turn: 1.0, gear: 35, coin: 75 },                       // 3 눈보라 부엉이
    ship: { mat: 'metal', boss: true, hp: 1800, r: 200, hit: [300, 95], spr: 'boss_ship', speed: 90, turn: 0.35, gear: 50, coin: 110 },   // 4 고양이 공중 전함
    king: { mat: 'metal', boss: true, hp: 2800, r: 150, hit: [190, 130], spr: 'boss_king', speed: 160, turn: 1.0, gear: 80, coin: 160 },   // 5 고양이 대왕 로켓
  };

  // ── 상태
  let S, paused = false;
  // 고른 스테이지: 주소 ?stage=N 이 있으면 그것(확인용), 아니면 격납고에서 고른 것
  const pickStage = () => clamp(qs.has('stage') ? Number(qs.get('stage')) - 1 : UP.save.pick, 0, STAGES.length - 1);
  let stageIdx = pickStage();
  function newGame(wave = 0) {
    const st = STAGES[stageIdx];
    T = UP.compute();
    S = {
      st, t: 0, wave, waveT: 0, banner: '', bannerT: 0, over: false, win: false, pending: null, winAt: 0,
      cam: { x: 0, y: 0, shake: 0 },
      p: { x: 0, y: 0, vx: T.speed, vy: 0, a: 0, bank: 0, hp: T.hp, hurt: 9, inv: 0, noFire: 9, cd: 0, mcd: 0, shieldT: 0, boost: T.boostMax, flash: 0, aim: 0 },
      foes: [], shots: [], eshots: [], fx: [], drops: [], hz: [], // hz = 예고 뒤 터지는 위험 지대 (번개 · 광선)
      wind: { x: 0, y: 0, t: 0 }, flashT: 0,                     // 눈보라 바람 · 번쩍임
      gear: 0, coin: 0, kills: 0, taken: 0, dmgBy: {},
    };
    startWave(wave);
  }
  function startWave(i) {
    const W = S.st.waves;
    S.wave = i;
    S.waveT = 0;
    const isBoss = W[i].some(([k]) => FOE[k].boss);
    S.banner = isBoss ? `보스 출현! ${S.st.bossName}` : i === 0 ? S.st.name : `WAVE ${i + 1}`;
    S.bannerT = 2.4;
    if (running) { SND.play(isBoss ? 'boss' : 'battle'); if (isBoss) SND.sfx('boss_appear'); }
    S.pending = [];
    let delay = 0.8;
    for (const [kind, n] of W[i]) for (let k = 0; k < n; k++) { S.pending.push({ kind, at: delay }); delay += 0.6; }
  }

  // ── 적 만들기: 화면 밖 둘레에서
  function spawn(kind) {
    const p = S.p, D = FOE[kind];
    const a = rnd(0, TAU), r = D.boss ? 1000 : rnd(950, 1150);
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    const hp = D.boss ? D.hp : Math.round(D.hp * S.st.mult.hp);
    const f = { kind, boss: !!D.boss, x, y, vx: 0, vy: 0, a: a + Math.PI, hp, max: hp, r: D.r, hit: 0, cd: rnd(1, 2), st: 'chase', stT: 0, ph: Math.random() * 10, ram: 0 };
    if (kind === 'hawk') { f.st = 'circle'; f.stT = rnd(1.5, 2.5); f.orbit = Math.random() < 0.5 ? 1 : -1; }
    if (kind === 'bomber') { f.orbit = Math.random() < 0.5 ? 1 : -1; f.cd2 = rnd(1, 2); }
    if (D.boss) { f.st = 'enter'; f.pat = 0; f.patT = 0; f.spin = 0; f.cd2 = 0; }
    S.foes.push(f);
    return f;
  }

  // ── 총알 · 이펙트
  function burst(x, y, n, col, spd = 260, size = 10, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), s = rnd(0.3, 1) * spd;
      S.fx.push({ type: 'puff', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(0.6, 1.2) * size, life, t: 0, col });
    }
  }
  // 그림 이펙트: fx 시트 칸 i (0 폭발 · 1 연기 · 2 파편 · 3 깃털/털), 크기 s0 → s1 로 커지며 사라짐
  function sprFx(i, x, y, s0, s1, life, spin = 0) {
    S.fx.push({ type: 'spr', i, x, y, s0, s1, life, t: 0, a: rnd(0, TAU), spin });
  }
  // mat = 'feather'(새 · 고양이 털) · 'metal'(비행선 · 폭격기 · 플레이어 비행기)
  function boom(x, y, big = 1, mat = 'metal') {
    S.fx.push({ type: 'ring', x, y, r: 20 * big, life: 0.35, t: 0 });
    sprFx(1, x, y, 0.8 * big, 1.9 * big, 0.9, rnd(-0.6, 0.6));
    sprFx(0, x, y, 0.5 * big, 1.3 * big, 0.4, rnd(-1, 1));
    sprFx(mat === 'feather' ? 3 : 2, x, y, 0.5 * big, 1.5 * big, 0.7, rnd(-2, 2));
    SND.sfx(big >= 2 ? 'explode_big' : 'explode');
    burst(x, y, 10 * big, '#ffcf5a', 320 * big, 16 * big, 0.45);
    burst(x, y, 8 * big, '#ef6a3c', 240 * big, 14 * big, 0.55);
    burst(x, y, 6 * big, '#8d8f99', 120 * big, 22 * big, 0.9);
    S.cam.shake = Math.max(S.cam.shake, 10 * big);
  }
  // 적 탄: home = 플레이어 쪽으로 꺾는 시간(초), acc = 초당 속도 변화(min · max 사이), shape = 'ball'(대포알) · 'feather' · 'flake'
  function eshot(x, y, a, spd, opts = {}) {
    SND.sfx('enemy_shoot'); // 여러 발을 한꺼번에 쏴도 간격 제한으로 한 번
    S.eshots.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: opts.r || 11, col: opts.col || '#ff5c8a', life: opts.life || 4, t: 0, dmg: opts.dmg || 8,
      ball: !!opts.ball, shape: opts.shape || (opts.ball ? 'ball' : null), home: opts.home || 0, homeTurn: opts.homeTurn || 1.6, acc: opts.acc || 0, min: opts.min ?? 60, max: opts.max ?? 900,
    });
  }
  // 부채꼴: 가운데 각도 a 에서 n 발을 gap 간격으로
  function fan(x, y, a, n, gap, spd, opts) { for (let i = 0; i < n; i++) eshot(x, y, a + (i - (n - 1) / 2) * gap, spd, opts); }
  function ring(x, y, n, spd, opts, off = rnd(0, TAU)) { for (let i = 0; i < n; i++) eshot(x, y, off + (i * TAU) / n, spd, opts); }
  // 위험 지대: 번개(두 점 사이 선) · 광선(보스 기수에서 뻗는 띠). warn 동안 예고선, 그 뒤 dur 동안 닿으면 피해
  function bolt(x1, y1, x2, y2, warn = 0.9, dmg = 14) { SND.sfx('warn'); S.hz.push({ type: 'bolt', x1, y1, x2, y2, w: 30, warn, dur: 0.22, t: 0, dmg }); }
  // spin = 초당 도는 각도 (보스 기수 기준으로 돎)
  function beam(f, off, rel, len, w, warn, dur, dmg = 12, spin = 0) { SND.sfx('warn'); S.hz.push({ type: 'beam', f, off, rel, len, w, warn, dur, t: 0, dmg, spin }); }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy || 1;
    const u = clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1);
    return Math.hypot(px - x1 - dx * u, py - y1 - dy * u);
  }
  function hzLine(h) {
    if (h.type === 'bolt') return [h.x1, h.y1, h.x2, h.y2];
    const a = h.f.a + h.rel, x = h.f.x + Math.cos(h.f.a) * h.off, y = h.f.y + Math.sin(h.f.a) * h.off;
    return [x, y, x + Math.cos(a) * h.len, y + Math.sin(a) * h.len];
  }
  // 움직이는 대상 앞지르기: 탄속 s 로 쐈을 때 만나는 곳
  function lead(from, to, s) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const t = Math.hypot(dx, dy) / s;
    return Math.atan2(dy + to.vy * t, dx + to.vx * t);
  }
  function hurt(d, src) {
    const p = S.p;
    if (p.inv > 0 || S.over) return;
    // 방어막 (특수 장치): 차 있으면 한 번 막고 다시 충전
    if (T.shield && p.shieldT <= 0) {
      p.shieldT = T.shield; p.inv = 0.4;
      S.fx.push({ type: 'ring', x: p.x, y: p.y, r: 30, life: 0.4, t: 0 });
      burst(p.x, p.y, 10, '#9fe0ff', 260, 9, 0.4);
      SND.sfx('hit', 1, 1.6);
      return;
    }
    d *= S.st.mult.dmg;
    if (qs.has('god')) d = 0;
    S.taken += d; S.dmgBy[src] = (S.dmgBy[src] || 0) + d;
    p.hp -= d; p.hurt = 0; p.inv = 0.4;
    S.cam.shake = Math.max(S.cam.shake, 14);
    burst(p.x, p.y, 8, '#ffffff', 220, 9, 0.35);
    SND.sfx('hurt');
    if (p.hp <= 0) { p.hp = 0; boom(p.x, p.y, 1.6); endGame(false); }
  }

  // ── 플레이어
  function updPlayer(dt) {
    const p = S.p;
    const want = wantDir();
    const boosting = input.boost && p.boost > 0.05;
    if (boosting && !p.boosting) SND.sfx('boost');
    p.boosting = boosting;
    const prevA = p.a;
    if (want != null) p.a = turnTo(p.a, want, (boosting ? T.turnBoost : T.turn) * dt);
    p.bank = lerp(p.bank, clamp(angDiff(prevA, p.a) / dt / T.turn, -1, 1), 1 - Math.exp(-8 * dt)); // 선회할 때 기울임
    if (boosting) p.boost = Math.max(0, p.boost - dt); else p.boost = Math.min(T.boostMax, p.boost + dt * T.boostRecover);
    const sp = boosting ? T.boostSpeed : T.speed;
    const k = 1 - Math.exp(-T.accel * dt);
    p.vx = lerp(p.vx, Math.cos(p.a) * sp, k);
    p.vy = lerp(p.vy, Math.sin(p.a) * sp, k);
    p.x += (p.vx + S.wind.x) * dt; p.y += (p.vy + S.wind.y) * dt; // 눈보라 바람에 밀림
    // 조준 = 마우스가 가리키는 월드 위치
    p.aim = Math.atan2(input.my - VH / 2 + S.cam.y - p.y, input.mx - VW / 2 + S.cam.x - p.x);
    p.cd -= dt;
    p.noFire += dt;
    if (input.fire && !S.over) {
      p.noFire = 0;
      if (p.cd <= 0) {
        p.cd = 1 / T.fireRate;
        // 총구마다: 조준 방향 + 각도 어긋남, 옆 간격만큼 비켜서
        for (const [ga, go] of T.guns) {
          const a = p.aim + ga + rnd(-0.03, 0.03);
          const ox = -Math.sin(p.aim) * go, oy = Math.cos(p.aim) * go;
          const nx = p.x + Math.cos(p.aim + ga) * 40 + ox, ny = p.y + Math.sin(p.aim + ga) * 40 + oy;
          S.shots.push({ x: nx, y: ny, vx: Math.cos(a) * T.bulletSpd + p.vx * T.inherit, vy: Math.sin(a) * T.bulletSpd + p.vy * T.inherit, life: T.bulletLife, t: 0, dmg: T.bulletDmg, pierce: T.pierce, hits: [] });
        }
        p.flash = 0.05;
        SND.sfx('shoot');
      }
      // 유도 미사일 (파츠): 가장 가까운 적에게
      p.mcd -= dt;
      if (T.missile && p.mcd <= 0) {
        const tg = nearestFoe(p);
        if (tg) {
          p.mcd = T.missile;
          for (let i = 0; i < T.missileN; i++) {
            const side = i % 2 ? 1 : -1, a = p.a + side * (1.2 + Math.floor(i / 2) * 0.5); // 양 날개에서 번갈아, 바깥으로 벌어지며
            S.shots.push({ x: p.x - Math.sin(p.a) * 30 * side, y: p.y + Math.cos(p.a) * 30 * side, vx: Math.cos(a) * 380 + p.vx, vy: Math.sin(a) * 380 + p.vy, life: 2, t: 0, dmg: T.missileDmg, pierce: 0, hits: [], homing: tg });
          }
        }
      }
    }
    p.flash -= dt;
    if (p.noFire > T.regenDelay && p.hurt > T.regenDelay) p.hp = Math.min(T.hp, p.hp + T.regen * dt);
    p.hurt += dt; p.inv -= dt; p.shieldT -= dt;
    // 비행운
    if (Math.random() < dt * (boosting ? 40 : 12)) {
      S.fx.push({ type: 'puff', x: p.x - Math.cos(p.a) * 70, y: p.y - Math.sin(p.a) * 70, vx: -p.vx * 0.1, vy: -p.vy * 0.1, r: boosting ? 10 : 6, life: 0.7, t: 0, col: 'rgba(255,255,255,.7)' });
    }
  }

  function nearestFoe(o) {
    let best = null, bd = 1100;
    for (const f of S.foes) { if (f.hp <= 0 || f.st === 'enter') continue; const d = dist(o, f); if (d < bd) { bd = d; best = f; } }
    return best;
  }

  // ── 적
  function updFoe(f, dt) {
    const p = S.p, D = FOE[f.kind];
    f.hit -= dt; f.stT -= dt; f.cd -= dt; f.ph += dt; f.ram -= dt;
    const d = dist(f, p);
    if (f.kind === 'cat') {
      // 꼬리 물기: 플레이어를 앞질러 겨냥, 너무 붙으면 잠깐 이탈
      let want = lead(f, p, 520);
      if (f.st === 'break') { want = f.breakA; if (f.stT <= 0) f.st = 'chase'; }
      else if (d < 260) { f.st = 'break'; f.stT = 1.2; f.breakA = f.a + (Math.random() < 0.5 ? 1.6 : -1.6); }
      f.a = turnTo(f.a, want, D.turn * dt);
      const s = D.speed * (1 + 0.25 * Math.sin(f.ph * 0.9));
      f.vx = Math.cos(f.a) * s; f.vy = Math.sin(f.a) * s;
      if (f.st === 'chase' && d < 750 && Math.abs(angDiff(f.a, lead(f, p, 520))) < 0.22 && f.cd <= 0) {
        f.cd = rnd(1.4, 2.2);
        f.burst = 3; f.burstT = 0;
      }
      if (f.burst > 0) { f.burstT -= dt; if (f.burstT <= 0) { f.burst--; f.burstT = 0.11; eshot(f.x + Math.cos(f.a) * 55, f.y + Math.sin(f.a) * 55, f.a, 520, { col: '#ff8a3d' }); } }
    } else if (f.kind === 'hawk') {
      // 빙빙 돌다 → 노려봄(예고, 노릴 곳 고정) → 급강하 → 빠져나감. 한 번에 한 마리만
      if (f.st === 'circle') {
        const oa = Math.atan2(f.y - p.y, f.x - p.x) + f.orbit * 1.8 * dt;
        const want = Math.atan2(p.y + Math.sin(oa) * 430 - f.y, p.x + Math.cos(oa) * 430 - f.x);
        f.a = turnTo(f.a, want, D.turn * dt);
        f.vx = Math.cos(f.a) * D.speed; f.vy = Math.sin(f.a) * D.speed;
        if (f.stT <= 0 && d < 800 && !S.foes.some((o) => o.kind === 'hawk' && (o.st === 'aim' || o.st === 'dive'))) {
          f.st = 'aim'; f.stT = 0.9;
          const t = 0.9 + d / 820;
          f.aim = { x: p.x + p.vx * t, y: p.y + p.vy * t };
        }
      } else if (f.st === 'aim') {
        f.vx *= Math.exp(-4 * dt); f.vy *= Math.exp(-4 * dt);
        f.a = turnTo(f.a, Math.atan2(f.aim.y - f.y, f.aim.x - f.x), 8 * dt);
        if (f.stT <= 0) { f.st = 'dive'; f.stT = 0.8; f.vx = Math.cos(f.a) * 820; f.vy = Math.sin(f.a) * 820; }
      } else if (f.st === 'dive') {
        if (f.stT <= 0) { f.st = 'circle'; f.stT = rnd(1.8, 3); }
        if (d < f.r + 20) { hurt(10, 'dive'); f.st = 'circle'; f.stT = 2.5; f.a += Math.PI; }
      }
    } else if (f.kind === 'swift') {
      // 제비: 좌우로 흔들며 돌진 → 가까우면 2발 쏘고 그대로 스쳐 지나감 → 돌아옴
      if (f.st === 'pass') { if (f.stT <= 0) f.st = 'chase'; }
      else {
        f.a = turnTo(f.a, Math.atan2(p.y - f.y, p.x - f.x) + Math.sin(f.ph * 4) * 0.7, D.turn * dt);
        if (d < 340) { f.st = 'pass'; f.stT = 1.1; if (f.cd <= 0) { f.cd = 1.5; fan(f.x, f.y, Math.atan2(p.y - f.y, p.x - f.x), 2, 0.12, 480, { col: '#5d7bd6', r: 9, dmg: 6 }); } }
      }
      f.vx = Math.cos(f.a) * D.speed; f.vy = Math.sin(f.a) * D.speed;
    } else if (f.kind === 'bomber') {
      // 폭격 고양이: 멀찍이 맴돌며 조준 3갈래, 가끔 원형탄
      const oa = Math.atan2(f.y - p.y, f.x - p.x) + f.orbit * 0.5 * dt;
      f.a = turnTo(f.a, Math.atan2(p.y + Math.sin(oa) * 520 - f.y, p.x + Math.cos(oa) * 520 - f.x), D.turn * dt);
      f.vx = Math.cos(f.a) * D.speed; f.vy = Math.sin(f.a) * D.speed;
      f.cd2 -= dt;
      if (d < 900 && f.cd <= 0) { f.cd = rnd(1.4, 1.9); fan(f.x, f.y, lead(f, p, 380), 3, 0.2, 380, { col: '#ff8a3d', r: 12, dmg: 8 }); }
      if (d < 900 && f.cd2 <= 0) { f.cd2 = rnd(3.5, 4.5); ring(f.x, f.y, 12, 230, { col: '#ffd45c', r: 12, dmg: 7 }); }
    } else if (D.boss) {
      bossMove(f, dt, d);
      if (f.st !== 'enter') BOSS[f.kind](f, dt, d, f.hp < f.max * 0.5);
    }
    f.x += f.vx * dt; f.y += f.vy * dt;
    // 몸통 박치기
    if (!f.boss && d < f.r + 36 && f.ram <= 0) { f.ram = 1; hurt(5, 'ram'); }
  }

  // ── 보스 공통 움직임: 플레이어에게서 R 만큼 떨어져 천천히 맴돌며 플레이어 쪽을 봄 (f.free 동안은 각 보스가 직접 움직임)
  const BOSS_R = { boss: 470, eagle: 520, owl: 480, ship: 560, king: 500 };
  function bossMove(f, dt, d) {
    const p = S.p, D = FOE[f.kind];
    if (f.st === 'enter' && d < 800) { f.st = 'fight'; f.patT = 1.2; }
    if (f.free) return;
    const ang = Math.atan2(f.y - p.y, f.x - p.x) + 0.25 * dt;
    const R = BOSS_R[f.kind];
    const tx = p.x + Math.cos(ang) * R, ty = p.y + Math.sin(ang) * R;
    const k = f.st === 'enter' ? 1.2 : 0.6, lim = Math.max(280, D.speed);
    f.vx = lerp(f.vx, clamp((tx - f.x) * k, -lim, lim), 1 - Math.exp(-1.5 * dt));
    f.vy = lerp(f.vy, clamp((ty - f.y) * k, -lim, lim), 1 - Math.exp(-1.5 * dt));
    f.a = turnTo(f.a, Math.atan2(p.y - f.y, p.x - f.x), (D.turn + 0.2) * dt);
  }
  // 패턴 돌리기: 시간이 다 되면 다음 패턴, 예고 문구(S.warn)를 띄움
  function nextPat(f, list) {
    f.patT -= dt0;
    if (f.patT > 0) return false;
    f.pat = (f.pat + 1) % list.length;
    f.patT = list[f.pat][0]; f.cd = 0.5; f.cd2 = 0; f.n = 0;
    if (list[f.pat][1]) { S.warn = { text: list[f.pat][1], t: 1.2 }; SND.sfx('warn'); }
    return true;
  }
  let dt0 = 0; // 이번 프레임 dt (nextPat 용)
  const nearCats = (k) => S.foes.filter((o) => o.kind === k).length;
  function minion(f, kind, n) {
    for (let i = 0; i < n; i++) { const c = spawn(kind); c.x = f.x - Math.cos(f.a) * 150 + rnd(-60, 60); c.y = f.y - Math.sin(f.a) * 150 + rnd(-60, 60); c.a = f.a + Math.PI + rnd(-0.6, 0.6); }
  }

  const BOSS = {
    // 1 고양이 비행선: 대포 두 문 → 나선 탄막 → 원형 탄 + 졸개
    boss: (f, dt, d, rage) => updAirship(f, dt, d, rage),

    // 2 천둥 독수리: 깃털 부채 → 번개(예고선 뒤 내리침) → 급강하 돌진(뒤로 깃털)
    eagle(f, dt, d, rage) {
      const p = S.p;
      nextPat(f, [[3.2], [3.4, '번개가 온다!'], [3.0, '급강하!']]);
      if (f.pat === 0) {
        if (f.cd <= 0) { f.cd = rage ? 0.45 : 0.65; fan(f.x, f.y, lead(f, p, 430), rage ? 7 : 5, 0.16, 430, { shape: 'feather', col: '#c8873a', r: 11, dmg: 8 }); }
      } else if (f.pat === 1) {
        // 플레이어가 갈 곳을 지나는 번개 여러 줄
        if (f.cd <= 0) {
          f.cd = rage ? 0.75 : 1.05;
          const n = rage ? 3 : 2, tx = p.x + p.vx * 0.9, ty = p.y + p.vy * 0.9;
          for (let i = 0; i < n; i++) { const a = rnd(0, TAU), o = rnd(-120, 120); bolt(tx + Math.cos(a) * 900 - Math.sin(a) * o, ty + Math.sin(a) * 900 + Math.cos(a) * o, tx - Math.cos(a) * 900 - Math.sin(a) * o, ty - Math.sin(a) * 900 + Math.cos(a) * o, 0.85, 14); }
        }
      } else {
        // 예고(노려봄) → 돌진 → 지나간 자리에 옆으로 깃털
        if (!f.free) { f.free = true; f.stT = 0.8; f.dash = 0; f.aimA = Math.atan2(p.y - f.y, p.x - f.x); }
        if (f.dash === 0) {
          f.vx *= Math.exp(-4 * dt); f.vy *= Math.exp(-4 * dt);
          f.aimA = turnTo(f.aimA, Math.atan2(p.y - f.y, p.x - f.x), 3 * dt); f.a = f.aimA;
          if (f.stT <= 0) { f.dash = 1; f.stT = 0.9; f.vx = Math.cos(f.a) * 1150; f.vy = Math.sin(f.a) * 1150; S.cam.shake = 12; }
        } else if (f.dash === 1) {
          if (f.cd <= 0) { f.cd = 0.07; for (const s of [-1, 1]) eshot(f.x, f.y, f.a + s * Math.PI / 2, 160, { shape: 'feather', col: '#e0b060', r: 10, dmg: 7, acc: 90, max: 330 }); }
          if (d < f.r + 30) hurt(16, 'dive');
          if (f.stT <= 0) { f.dash = 2; f.stT = 0.6; }
        } else if (f.stT <= 0) f.free = false; // 패턴 시간이 남았으면 다음 프레임에 다시 노려봄
      }
      if (f.pat !== 2) f.free = false;
      if (rage && f.pat === 0 && nearCats('swift') < 3 && Math.random() < dt * 0.4) minion(f, 'swift', 2);
    },

    // 3 눈보라 부엉이: 눈꽃 이중 나선 → 유도 얼음 구슬 → 눈보라(바람에 밀림 + 한쪽에서 얼음 벽)
    owl(f, dt, d, rage) {
      const p = S.p;
      if (nextPat(f, [[3.6], [3.2, '얼음 구슬!'], [4.2, '눈보라!']]) && f.pat === 2) {
        const a = rnd(0, TAU); S.wind = { x: Math.cos(a) * 170, y: Math.sin(a) * 170, t: 4.2, a };
      }
      if (f.pat === 0) {
        if (f.cd <= 0) {
          f.cd = rage ? 0.1 : 0.14; f.spin += 0.23;
          for (const s of [1, -1]) for (let i = 0; i < (rage ? 3 : 2); i++) eshot(f.x, f.y, s * f.spin + (i * TAU) / (rage ? 3 : 2), 210, { shape: 'flake', col: '#3f7fd0', r: 12, dmg: 7, life: 6 });
        }
      } else if (f.pat === 1) {
        if (f.cd <= 0 && f.n < (rage ? 6 : 4)) {
          f.cd = 0.35; f.n++;
          eshot(f.x, f.y, Math.atan2(p.y - f.y, p.x - f.x) + rnd(-1.2, 1.2), 200, { col: '#5aa0e8', r: 20, dmg: 12, home: 2.6, homeTurn: 1.5, acc: 60, max: 420, life: 7 });
        }
      } else {
        // 바람이 불어오는 쪽에서 얼음 조각 벽 (틈 하나)
        if (f.cd <= 0) {
          f.cd = rage ? 0.9 : 1.2;
          const a = S.wind.a, cx = p.x - Math.cos(a) * 900, cy = p.y - Math.sin(a) * 900, gap = rnd(-4, 4) | 0;
          for (let i = -9; i <= 9; i++) if (Math.abs(i - gap) > 1) eshot(cx - Math.sin(a) * i * 85, cy + Math.cos(a) * i * 85, a, 330, { shape: 'flake', col: '#2a5fae', r: 13, dmg: 9, life: 6 });
        }
      }
      if (rage && nearCats('swift') < 4 && Math.random() < dt * 0.35) minion(f, 'swift', 2);
    },

    // 4 고양이 공중 전함: 포탑 4문 → 측면 일제 사격 → 함수 주포 광선(예고 뒤 휩쓸기) / 분노하면 폭격기 호출
    ship(f, dt, d, rage) {
      const p = S.p, ca = Math.cos(f.a), sa = Math.sin(f.a);
      nextPat(f, [[3.6], [3.0, '측면 일제 사격!'], [3.4, '주포 충전!']]);
      const at = (u, v) => ({ x: f.x + ca * u - sa * v, y: f.y + sa * u + ca * v, vx: f.vx, vy: f.vy });
      if (f.pat === 0) {
        if (f.cd <= 0) {
          f.cd = rage ? 0.28 : 0.4; f.n = (f.n + 1) % 4;
          const g = at([170, 60, -60, -170][f.n], f.n % 2 ? 55 : -55);
          eshot(g.x, g.y, lead(g, p, 440) + rnd(-0.05, 0.05), 440, { r: 15, col: '#3b3f4a', dmg: 10, ball: true, life: 5 });
          burst(g.x, g.y, 3, '#c9c4b8', 110, 10, 0.4);
        }
      } else if (f.pat === 1) {
        if (f.cd <= 0) {
          f.cd = 0.55;
          for (let u = -240; u <= 240; u += 80) for (const s of [-1, 1]) { const g = at(u, s * 80); eshot(g.x, g.y, f.a + s * Math.PI / 2 + rnd(-0.04, 0.04), rage ? 300 : 250, { r: 12, col: '#ff5c8a', dmg: 8, life: 5 }); }
        }
      } else if (f.cd <= 0 && f.n === 0) {
        // 주포: 1초 예고 → 1.6초 동안 광선, 그동안 배가 천천히 플레이어 쪽으로 돎
        f.n = 1; beam(f, 290, 0, 1900, 70, 1.0, 1.6, 14);
        if (rage) { beam(f, 290, 0.5, 1900, 46, 1.0, 1.6, 10); beam(f, 290, -0.5, 1900, 46, 1.0, 1.6, 10); }
      }
      if (rage && nearCats('bomber') < 2 && Math.random() < dt * 0.2) minion(f, 'bomber', 1);
    },

    // 5 고양이 대왕 로켓: 체력 3구간 — 꽃 탄막 / 번개 + 유도탄 + 졸개 / 분노(회전 광선 + 원형탄 연발)
    king(f, dt, d) {
      const p = S.p, k = f.hp / f.max, phase = k > 0.66 ? 0 : k > 0.33 ? 1 : 2;
      if (phase !== f.phase) { f.phase = phase; f.pat = -1; f.patT = 0; if (phase) { S.warn = { text: phase === 1 ? '대왕이 화났다!' : '대왕 최후의 발악!', t: 1.6 }; S.eshots = []; S.cam.shake = 20; } }
      const L = [[[3.4], [3.0, '번개 지팡이!']], [[3.0, '번개 지팡이!'], [3.2, '유도 왕관탄!'], [2.6]], [[3.8, '회전 광선!'], [3.0, '원형 연발!']]][phase];
      nextPat(f, L);
      const kind = [['flower', 'bolt'], ['bolt', 'homing', 'minion'], ['spin', 'rings']][phase][f.pat] || 'flower';
      if (kind === 'flower') {
        if (f.cd <= 0) { f.cd = 0.17; f.spin += 0.21; for (let i = 0; i < 4; i++) { const a = f.spin + (i * TAU) / 4; eshot(f.x, f.y, a, 240, { col: '#ffd45c', r: 12, dmg: 8, life: 6 }); eshot(f.x, f.y, -a, 180, { col: '#ff7ab0', r: 10, dmg: 8, life: 7 }); } }
      } else if (kind === 'bolt') {
        if (f.cd <= 0) { f.cd = phase ? 0.6 : 0.9; for (let i = 0; i < 2 + phase; i++) { const a = rnd(0, TAU), tx = p.x + p.vx * 0.8 + rnd(-90, 90), ty = p.y + p.vy * 0.8 + rnd(-90, 90); bolt(tx + Math.cos(a) * 900, ty + Math.sin(a) * 900, tx - Math.cos(a) * 900, ty - Math.sin(a) * 900, 0.8, 15); } }
        if (f.cd2 <= 0) { f.cd2 = 1.1; fan(f.x, f.y, Math.atan2(p.y - f.y, p.x - f.x), 9, 0.14, 300, { col: '#ff5c8a', r: 11, dmg: 8 }); }
        f.cd2 -= dt;
      } else if (kind === 'homing') {
        if (f.cd <= 0) { f.cd = 0.45; for (const s of [-1, 1]) eshot(f.x, f.y, f.a + s * 1.3, 220, { col: '#ffcf5a', r: 16, dmg: 11, home: 2.2, homeTurn: 1.8, acc: 80, max: 460, life: 6 }); }
      } else if (kind === 'minion') {
        if (f.cd <= 0) { f.cd = 9; ring(f.x, f.y, 28, 270, { col: '#ffd45c', r: 12, dmg: 8 }); if (nearCats('cat') < 4) minion(f, 'cat', 2); if (nearCats('bomber') < 1) minion(f, 'bomber', 1); }
      } else if (kind === 'spin') {
        // 광선 4줄이 대왕을 중심으로 회전
        if (f.n === 0) { f.n = 1; for (let i = 0; i < 4; i++) beam(f, 0, (i * TAU) / 4, 1500, 40, 1.1, 2.6, 12, 0.8); }
        if (f.cd <= 0) { f.cd = 0.5; fan(f.x, f.y, Math.atan2(p.y - f.y, p.x - f.x), 3, 0.25, 360, { col: '#ff8a3d', r: 11, dmg: 8 }); }
      } else if (kind === 'rings') {
        if (f.cd <= 0) { f.cd = 0.42; ring(f.x, f.y, 20, 260, { col: f.n++ % 2 ? '#7aa8ff' : '#ff5c8a', r: 12, dmg: 8, life: 6 }); }
      }
    },
  };

  function updAirship(f, dt, d, rage) {
    const p = S.p;
    const ca = Math.cos(f.a), sa = Math.sin(f.a);
    nextPat(f, [[3.2], [3.6, '나선 탄막!'], [2.2, '졸개 출동!']]);
    if (f.pat === 0) {
      // 대포 두 문: 플레이어가 갈 곳으로 큰 대포알
      if (f.cd <= 0) {
        f.cd = rage ? 0.42 : 0.7;
        f.side = -(f.side || 1);
        const gun = { x: f.x + ca * 200 - sa * 40 * f.side, y: f.y + sa * 200 + ca * 40 * f.side, vx: f.vx, vy: f.vy };
        eshot(gun.x, gun.y, lead(gun, p, 480) + rnd(-0.06, 0.06), 480, { r: 17, col: '#3b3f4a', dmg: 10, ball: true, life: 5 });
        burst(gun.x, gun.y, 4, '#c9c4b8', 120, 12, 0.5);
      }
    } else if (f.pat === 1) {
      // 나선 탄막 (동방식)
      if (f.cd <= 0) {
        f.cd = rage ? 0.11 : 0.16;
        f.spin += rage ? 0.37 : 0.29;
        const n = rage ? 3 : 2;
        for (let i = 0; i < n; i++) eshot(f.x, f.y, f.spin + (i * TAU) / n, 250, { r: 13, col: i % 2 ? '#7aa8ff' : '#ff5c8a', life: 6 });
      }
    } else {
      // 원형 탄 + 졸개 고양이
      if (f.cd <= 0) {
        f.cd = 9;
        const n = rage ? 24 : 16, off = rnd(0, TAU);
        for (let i = 0; i < n; i++) eshot(f.x, f.y, off + (i * TAU) / n, 290, { r: 14, col: '#ffd45c' });
        const cats = S.foes.filter((o) => o.kind === 'cat').length;
        if (cats < 3) for (let i = 0; i < (rage ? 2 : 1); i++) { const c = spawn('cat'); c.x = f.x - ca * 150; c.y = f.y - sa * 150; c.a = f.a + Math.PI + rnd(-0.5, 0.5); }
      }
    }
  }
  // 판정: 보스 중 hit 가 있으면 몸통 타원 (기수 방향으로 김), 나머지는 원
  function hitFoe(f, x, y, pad = 0) {
    const H = FOE[f.kind].hit;
    if (!H) return Math.hypot(x - f.x, y - f.y) < f.r + pad;
    const dx = x - f.x, dy = y - f.y, c = Math.cos(f.a), s = Math.sin(f.a);
    const u = (dx * c + dy * s) / (H[0] + pad), v = (-dx * s + dy * c) / (H[1] + pad);
    return u * u + v * v < 1;
  }
  function killFoe(f) {
    const D = FOE[f.kind], R = S.st.mult.reward;
    S.kills++;
    S.stop = f.boss ? 0.25 : 0.035;
    boom(f.x, f.y, f.boss ? 3 : 1, FOE[f.kind].mat || 'feather');
    dropMany('gear', f, D.gear * R);
    dropMany('coin', f, D.coin * R * (1 + T.coinBonus));
    if (Math.random() < (f.boss ? 1 : 0.15)) drop('wrench', f, 1);
    if (f.boss) {
      S.foes.forEach((o) => { if (o !== f && o.hp > 0) { o.hp = 0; boom(o.x, o.y, 1, FOE[o.kind].mat || 'feather'); } });
      S.eshots = []; S.hz = []; S.wind = { x: 0, y: 0, t: 0 }; S.winAt = S.t + 1.8;
    }
  }
  // 값 v 만큼 떨어뜨림: 너무 많으면 한 개가 여러 개 값 (화면이 줍기 아이템으로 덮이지 않게, 최대 24개)
  function dropMany(type, f, v) {
    let n = Math.floor(v) + (Math.random() < v % 1 ? 1 : 0);
    const pieces = Math.min(n, 24);
    for (let i = 0; i < pieces; i++) { const each = Math.ceil(n / (pieces - i)); n -= each; drop(type, f, each); }
  }
  function drop(type, f, v) {
    const a = rnd(0, TAU), s = rnd(80, 280) * (f.boss ? 1.6 : 1);
    S.drops.push({ type, v, x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, ph: rnd(0, TAU) });
  }

  // ── 한 프레임
  function update(dt) {
    if (S.stop > 0) { S.stop -= dt; return; }
    dt0 = dt;
    S.t += dt;
    S.bannerT -= dt;
    if (!S.over) updPlayer(dt);
    if (S.pending) {
      S.waveT += dt;
      S.pending = S.pending.filter((q) => { if (S.waveT >= q.at) { spawn(q.kind); return false; } return true; });
      if (!S.pending.length) S.pending = null;
    }
    for (const f of S.foes) updFoe(f, dt);
    // 내 총알
    for (const b of S.shots) {
      b.t += dt;
      if (b.homing) {
        // 유도: 대상 쪽으로 꺾으며 가속, 대상이 죽으면 다른 적
        if (b.homing.hp <= 0) b.homing = nearestFoe(b);
        const sp = Math.min(900, Math.hypot(b.vx, b.vy) + 900 * dt);
        let a = Math.atan2(b.vy, b.vx);
        if (b.homing) a = turnTo(a, Math.atan2(b.homing.y - b.y, b.homing.x - b.x), 6 * dt);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        if (Math.random() < dt * 40) S.fx.push({ type: 'puff', x: b.x, y: b.y, vx: 0, vy: 0, r: 5, life: 0.4, t: 0, col: 'rgba(255,240,220,.8)' });
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const f of S.foes) {
        if (f.hp > 0 && f.st !== 'enter' && !b.hits.includes(f) && hitFoe(f, b.x, b.y, 6)) {
          f.hp -= b.dmg; f.hit = 0.08;
          SND.sfx('hit', 1, f.boss ? 0.8 : 1);
          if (!f.boss) { const k = 7 * Math.min(2, b.dmg) / Math.hypot(b.vx, b.vy); f.x += b.vx * k; f.y += b.vy * k; }
          if (b.pierce > 0) { b.pierce--; b.hits.push(f); } else b.t = 99;
          S.fx.push({ type: 'spark', x: b.x, y: b.y, life: 0.12, t: 0, a: Math.atan2(b.vy, b.vx) });
          if (b.homing) burst(b.x, b.y, 5, '#ffb050', 160, 9, 0.35);
          if (f.hp <= 0) killFoe(f);
          break;
        }
      }
    }
    S.shots = S.shots.filter((b) => b.t < b.life);
    S.foes = S.foes.filter((f) => f.hp > 0);
    // 적 총알
    const p = S.p;
    for (const b of S.eshots) {
      b.t += dt;
      if (b.home > 0 || b.acc) {
        let a = Math.atan2(b.vy, b.vx), sp = clamp(Math.hypot(b.vx, b.vy) + b.acc * dt, b.min, b.max);
        if (b.home > 0) { b.home -= dt; a = turnTo(a, Math.atan2(p.y - b.y, p.x - b.x), b.homeTurn * dt); }
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (!S.over && Math.hypot(b.x - p.x, b.y - p.y) < b.r + 24) { hurt(b.dmg, b.ball ? 'cannon' : 'bullet'); b.t = 99; }
    }
    S.eshots = S.eshots.filter((b) => b.t < b.life);
    // 위험 지대: 예고 시간이 지나면 닿는 동안 피해
    for (const h of S.hz) {
      h.t += dt;
      if (h.spin) h.rel += h.spin * dt;
      if (h.f && h.f.hp <= 0) h.t = 99;
      if (h.t > h.warn && h.t < h.warn + h.dur && !S.over) {
        const [x1, y1, x2, y2] = hzLine(h);
        if (segDist(p.x, p.y, x1, y1, x2, y2) < h.w / 2 + 16) hurt(h.dmg, h.type);
        if (!h.zapped) { h.zapped = true; SND.sfx('zap'); }
        if (h.type === 'bolt' && !h.boomed) { h.boomed = true; S.flashT = 0.12; S.cam.shake = Math.max(S.cam.shake, 8); }
      }
    }
    S.hz = S.hz.filter((h) => h.t < h.warn + h.dur);
    if (S.wind.t > 0) { S.wind.t -= dt; if (S.wind.t <= 0) S.wind = { x: 0, y: 0, t: 0 }; }
    S.flashT -= dt;
    if (S.warn) S.warn.t -= dt;
    // 떨어진 재료: 가까우면 끌려옴
    for (const q of S.drops) {
      q.t += dt;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
      if (q.t > 0.35 && d < T.pickup && !S.over) { q.vx = lerp(q.vx, dx / d * 900, 1 - Math.exp(-8 * dt)); q.vy = lerp(q.vy, dy / d * 900, 1 - Math.exp(-8 * dt)); }
      else { q.vx *= Math.exp(-2.5 * dt); q.vy *= Math.exp(-2.5 * dt); }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (d < 40 && !S.over) {
        q.t = 99;
        if (q.type === 'gear') S.gear += q.v; else if (q.type === 'coin') S.coin += q.v; else p.hp = Math.min(T.hp, p.hp + T.hp * 0.25);
        SND.sfx(q.type === 'gear' ? 'pickup_gear' : q.type === 'coin' ? 'pickup_coin' : 'pickup_heal');
        S.fx.push({ type: 'pop', x: q.x, y: q.y, life: 0.25, t: 0 });
      }
    }
    S.drops = S.drops.filter((q) => q.t < 14);
    for (const e of S.fx) { e.t += dt; if (e.vx != null) { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt); } }
    S.fx = S.fx.filter((e) => e.t < e.life);
    if (S.winAt && S.t >= S.winAt) { S.winAt = 0; endGame(true); }
    if (!S.over && !S.pending && !S.foes.length && S.wave < S.st.waves.length - 1) startWave(S.wave + 1);
    // 카메라: 플레이어 중심 + 조준 쪽으로 조금
    const c = S.cam;
    const ax = (input.mx - VW / 2) * 0.18, ay = (input.my - VH / 2) * 0.18;
    c.x = lerp(c.x, p.x + p.vx * 0.15 + ax, 1 - Math.exp(-5 * dt));
    c.y = lerp(c.y, p.y + p.vy * 0.15 + ay, 1 - Math.exp(-5 * dt));
    c.shake *= Math.exp(-8 * dt);
  }

  // ── 그리기
  function sprite(name, i, x, y, a, sx = 1, sy = 1, filter = null, shadow = false) {
    const f = SP[name][i];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(sx, sy);
    if (filter) ctx.filter = filter;
    ctx.drawImage(shadow ? f.shadow : f.im, -f.w / 2, -f.h / 2, f.w, f.h);
    ctx.restore();
  }
  // 하늘을 나는 것들의 그림자 (바다 위, 오른쪽 아래로 어긋나게)
  function shadowOf(name, i, x, y, a, sx = 1, sy = 1) {
    const al = S.st.bg.shadow ?? 0.22; // 우주 = 0 (땅이 없음)
    if (!al) return;
    ctx.globalAlpha = al;
    sprite(name, i, x + T.shadow[0], y + T.shadow[1], a, sx * 0.92, sy * 0.92, null, true);
    ctx.globalAlpha = 1;
  }

  // 바다: 바탕색 + 깊은 물 얼룩 + 섬 + 물결 (칸마다 고정 난수)
  function drawSea(bg, c) {
    const x0 = c.x - VW / 2 - 40, y0 = c.y - VH / 2 - 40, x1 = x0 + VW + 80, y1 = y0 + VH + 80;
    ctx.fillStyle = bg.color;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const G = 700;
    ctx.fillStyle = bg.deep;
    for (let gx = Math.floor(x0 / G) - 1; gx <= Math.floor(x1 / G) + 1; gx++) for (let gy = Math.floor(y0 / G) - 1; gy <= Math.floor(y1 / G) + 1; gy++) {
      const h = hash(gx, gy, 3);
      if (h > 0.55) continue;
      ctx.beginPath();
      ctx.ellipse(gx * G + hash(gx, gy, 4) * G, gy * G + hash(gx, gy, 5) * G, 220 + h * 300, 120 + h * 160, h * 3, 0, TAU);
      ctx.fill();
    }
    const I = 1500;
    for (let gx = Math.floor(x0 / I) - 1; gx <= Math.floor(x1 / I) + 1; gx++) for (let gy = Math.floor(y0 / I) - 1; gy <= Math.floor(y1 / I) + 1; gy++) {
      if ((gx === 0 && gy === 0) || hash(gx, gy, 7) > bg.islands) continue;
      const i = Math.floor(hash(gx, gy, 8) * SP.islands.length);
      const s = 0.7 + hash(gx, gy, 9) * 0.6;
      sprite('islands', i, gx * I + 300 + hash(gx, gy, 10) * (I - 600), gy * I + 300 + hash(gx, gy, 11) * (I - 600), hash(gx, gy, 12) * TAU, s, s);
    }
    // 물결: 짧은 흰 줄이 천천히 반짝
    const Wg = 120;
    ctx.strokeStyle = bg.wave; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let gx = Math.floor(x0 / Wg); gx <= Math.floor(x1 / Wg); gx++) for (let gy = Math.floor(y0 / Wg); gy <= Math.floor(y1 / Wg); gy++) {
      const h = hash(gx, gy, 1);
      if (h > 0.35) continue;
      const ph = Math.sin(S.t * 1.6 + h * 40);
      if (ph < 0) continue;
      const x = gx * Wg + hash(gx, gy, 2) * Wg, y = gy * Wg + h * Wg * 2.5, l = 10 + ph * 16;
      ctx.moveTo(x - l, y); ctx.quadraticCurveTo(x, y - 5, x + l, y);
    }
    ctx.stroke();
  }

  // 구름: 플레이어보다 위 높이 → 화면에서 더 빨리 지나감 (k > 1), 바다에 그림자
  const CLOUDS = [];
  for (let i = 0; i < 14; i++) CLOUDS.push({ x: rnd(0, 6000), y: rnd(0, 6000), s: rnd(0.8, 1.5), i: i % 4, a: rnd(-0.2, 0.2) });
  function cloudPos(cl, c, k) {
    const P = 6000;
    const x = ((cl.x - c.x * k) % P + P) % P - P / 2 + VW / 2;
    const y = ((cl.y - c.y * k) % P + P) % P - P / 2 + VH / 2;
    return [x, y];
  }
  function eachCloud(c, fn) {
    for (const cl of CLOUDS) {
      const [x, y] = cloudPos(cl, c, 1.25);
      const f = SP.clouds[cl.i], w = f.w * cl.s, h = f.h * cl.s;
      if (x < -w - 150 || x > VW + w + 150 || y < -h - 150 || y > VH + h + 150) continue;
      fn(cl, f, x, y, w, h);
    }
  }
  // 스테이지 bg.clouds = [진하기, 색 필터], 없으면 기본. 진하기 0 = 구름 없음
  function drawCloudShadows(c) {
    const [al] = S.st.bg.clouds || [0.6];
    if (!al || !(S.st.bg.shadow ?? 1)) return;
    ctx.globalAlpha = 0.12 * al / 0.6;
    eachCloud(c, (cl, f, x, y, w, h) => { ctx.save(); ctx.translate(x + 70, y + 110); ctx.rotate(cl.a); ctx.drawImage(f.shadow, -w / 2, -h / 2, w, h); ctx.restore(); });
    ctx.globalAlpha = 1;
  }
  function drawClouds(c) {
    const [al, filter] = S.st.bg.clouds || [0.6];
    if (!al) return;
    ctx.globalAlpha = al;
    eachCloud(c, (cl, f, x, y, w, h) => { ctx.save(); ctx.translate(x, y); ctx.rotate(cl.a); if (filter) ctx.filter = filter; ctx.drawImage(f.im, -w / 2, -h / 2, w, h); ctx.restore(); });
    ctx.globalAlpha = 1;
  }
  const BG = { sea: drawSea, ...window.makeBackgrounds({ ctx, hash, TAU, VW, VH, get t() { return S.t; }, sprite, SP }) };

  // 적 탄 모양: 기본 = 동방식 둥근 탄(테두리색 + 흰 속), 대포알, 깃털, 눈꽃
  function drawEshot(b) {
    if (b.shape === 'feather') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.7, b.r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4dc'; ctx.fillRect(-b.r * 1.5, -1.5, b.r * 3, 3);
      ctx.restore();
    } else if (b.shape === 'flake') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 3);
      ctx.fillStyle = b.col; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const r = i % 2 ? b.r * 0.45 : b.r * 1.15, a = (i * TAU) / 12; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = b.ball ? 'rgba(255,255,255,.35)' : '#fff';
      ctx.beginPath();
      if (b.ball) ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35, 0, TAU); else ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU);
      ctx.fill();
    }
  }
  // 위험 지대: 예고 = 붉은 점선(점점 진해짐), 터짐 = 번개(지그재그 흰 심 + 푸른 빛) · 광선(넓은 분홍 띠 + 흰 심)
  function drawHz(h) {
    const [x1, y1, x2, y2] = hzLine(h);
    ctx.save();
    ctx.lineCap = 'round';
    if (h.t < h.warn) {
      const k = h.t / h.warn;
      ctx.globalAlpha = 0.25 + 0.55 * k;
      ctx.strokeStyle = h.type === 'bolt' ? '#ffe36a' : '#ff4f6d';
      ctx.lineWidth = h.type === 'bolt' ? 3 : h.w * 0.35 * k + 2;
      ctx.setLineDash([18, 14]); ctx.lineDashOffset = -S.t * 120;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    } else if (h.type === 'bolt') {
      const k = 1 - (h.t - h.warn) / h.dur, n = 14;
      const pts = [];
      for (let i = 0; i <= n; i++) { const u = i / n, j = i % n ? (hash(i, h.x1 | 0, 5) - 0.5) * 50 : 0; pts.push([lerp(x1, x2, u) - (y2 - y1) / 1800 * j, lerp(y1, y2, u) + (x2 - x1) / 1800 * j]); }
      for (const [w, col] of [[h.w * 1.6, 'rgba(120,180,255,.45)'], [h.w * 0.5, '#fffbe6']]) {
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    } else {
      const k = clamp((h.warn + h.dur - h.t) / 0.2, 0, 1), wob = 1 + Math.sin(S.t * 40) * 0.08;
      for (const [w, col] of [[h.w * 1.5 * wob, 'rgba(255,90,140,.35)'], [h.w * wob, 'rgba(255,120,170,.8)'], [h.w * 0.4, '#fff']]) {
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 눈보라: 바람 방향으로 흩날리는 눈 (화면 기준)
  function drawBlizzard() {
    if (S.wind.t <= 0) return;
    const k = clamp(S.wind.t / 0.5, 0, 1) * clamp((4.2 - S.wind.t) / 0.5, 0, 1);
    const a = Math.atan2(S.wind.y, S.wind.x), dx = Math.cos(a), dy = Math.sin(a);
    ctx.save(); ctx.globalAlpha = 0.75 * k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(230,240,255,.18)'; ctx.fillRect(0, 0, VW, VH);
    ctx.beginPath();
    for (let i = 0; i < 120; i++) {
      const s = 500 + hash(i, 3) * 700, x = ((hash(i, 1) * 2200 + dx * S.t * s) % 2200 + 2200) % 2200 - 300, y = ((hash(i, 2) * 1500 + dy * S.t * s) % 1500 + 1500) % 1500 - 300;
      ctx.moveTo(x, y); ctx.lineTo(x - dx * 26, y - dy * 26);
    }
    ctx.stroke(); ctx.restore();
  }

  function draw() {
    const c = S.cam, p = S.p;
    ctx.setTransform(view.k, 0, 0, view.k, 0, 0);
    const sx = (Math.random() - 0.5) * c.shake, sy = (Math.random() - 0.5) * c.shake;
    ctx.save();
    ctx.translate(VW / 2 - c.x + sx, VH / 2 - c.y + sy);
    BG[S.st.bg.type](S.st.bg, c);
    ctx.restore();
    drawCloudShadows(c);

    ctx.save();
    ctx.translate(VW / 2 - c.x + sx, VH / 2 - c.y + sy);
    // 그림자 먼저 (모두 바다 위)
    for (const f of S.foes) foeSprite(f, true);
    const L = planeLook(T.frame), bankS = L.scale * (1 - Math.abs(p.bank) * 0.25);
    if (!S.over || S.win) shadowOf(L.spr, 0, p.x, p.y, p.a, L.scale, bankS);
    for (const q of S.drops) {
      const i = q.type === 'gear' ? 0 : q.type === 'coin' ? 1 : 2;
      const bob = Math.sin(S.t * 4 + q.ph) * 3;
      if (!(q.t > 11 && Math.sin(q.t * 20) > 0)) sprite('items', i, q.x, q.y + bob, q.type === 'gear' ? S.t * 2 : 0, 0.9, 0.9);
    }
    for (const h of S.hz) if (h.t < h.warn) drawHz(h); // 예고선은 적 밑에
    for (const f of S.foes) foeSprite(f, false);
    for (const b of S.eshots) drawEshot(b);
    // 플레이어
    if (!S.over || S.win) {
      const blink = p.inv > 0 && Math.sin(S.t * 60) > 0;
      sprite(L.spr, 0, p.x, p.y, p.a, L.scale, bankS, blink ? 'brightness(2)' : L.filter);
      // 방어막이 차 있으면 옅은 파란 막
      if (T.shield && p.shieldT <= 0) {
        ctx.strokeStyle = `rgba(150,220,255,${0.45 + Math.sin(S.t * 5) * 0.15})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 80 * L.scale, 0, TAU); ctx.stroke();
      }
      if (p.flash > 0) {
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath(); ctx.arc(p.x + Math.cos(p.aim) * 44, p.y + Math.sin(p.aim) * 44, 11, 0, TAU); ctx.fill();
      }
    }
    // 내 총알: 짧은 노란 줄 (위력 셀수록 굵게, 관통탄은 푸른 심), 유도탄 = 주황 몸통
    ctx.lineCap = 'round';
    for (const b of S.shots) {
      if (b.homing !== undefined) {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = '#ff9a3d'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2c9'; ctx.beginPath(); ctx.arc(8, 0, 3.5, 0, TAU); ctx.fill();
        ctx.restore();
        continue;
      }
      const l = 0.022, w = Math.min(2, Math.sqrt(b.dmg));
      ctx.strokeStyle = '#fff6c2'; ctx.lineWidth = 6 * w;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = T.pierce > 0 ? '#6fd0ff' : '#ffb627'; ctx.lineWidth = 3 * w;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const h of S.hz) if (h.t >= h.warn) drawHz(h);
    for (const e of S.fx) drawFx(e);
    ctx.restore();
    drawClouds(c);
    drawBlizzard();
    if (S.flashT > 0) { ctx.fillStyle = `rgba(255,255,240,${S.flashT * 2.5})`; ctx.fillRect(0, 0, VW, VH); } // 번개 번쩍
    drawVignette();
    drawHud();
  }

  // 화면 가장자리 붉은 테: 맞은 직후 0.5초 + 체력 30% 아래면 맥박
  function drawVignette() {
    const p = S.p;
    if (S.over && !S.win) return;
    const low = p.hp < T.hp * 0.3 ? (0.25 + 0.15 * Math.sin(S.t * 6)) * (1 - p.hp / (T.hp * 0.3)) : 0;
    const a = Math.max(clamp(1 - p.hurt / 0.5, 0, 1) * 0.55, low);
    if (a <= 0.01) return;
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
    g.addColorStop(0, 'rgba(200,20,30,0)');
    g.addColorStop(1, `rgba(200,20,30,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  // 기체 그림: 전용 그림(spr)이 있으면 그대로, 아직 없으면 기본 그림 + 색 필터 · 크기로 대신
  function planeLook(fr) {
    return SP[fr.spr] ? { spr: fr.spr, scale: 1, filter: null } : { spr: 'player', scale: fr.scale || 1, filter: fr.tint || null };
  }

  function foeSprite(f, shadow) {
    const white = !shadow && f.hit > 0 ? (f.boss ? 'brightness(1.18)' : 'brightness(1.6)') : null; // 맞으면 살짝 밝게
    const put = shadow ? shadowOf : (n, i, x, y, a, sx, sy) => sprite(n, i, x, y, a, sx, sy, white);
    const D = FOE[f.kind], flap = (rate) => (SP[D.spr].length > 1 && Math.sin(f.ph * rate) < 0 ? 1 : 0); // 날갯짓 컷
    if (f.kind === 'cat' || f.kind === 'bomber') put(D.spr, 0, f.x, f.y, f.a, 1, 1);
    else if (f.kind === 'swift') put(D.spr, flap(16), f.x, f.y, f.a, 1, 1);
    else if (f.kind === 'hawk') {
      const fr = f.st === 'dive' ? 1 : (Math.sin(f.ph * 13) > 0 ? 0 : 1);
      const a = f.st === 'dive' ? Math.atan2(f.vy, f.vx) : f.a;
      put('e_hawk', fr, f.x, f.y, a, 1, 1);
      if (!shadow && f.st === 'aim' && f.aim) {
        // 급강하 예고: 노리는 곳까지 점선 + 과녁
        ctx.save();
        ctx.setLineDash([14, 12]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(230,60,60,.75)';
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.aim.x, f.aim.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(f.aim.x, f.aim.y, 34 + Math.sin(S.t * 20) * 4, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    } else if (f.boss) {
      const fr = f.kind === 'eagle' && f.dash === 1 ? 1 : flap(f.kind === 'eagle' ? 7 : 4);
      const a = f.kind === 'eagle' && f.dash === 1 ? Math.atan2(f.vy, f.vx) : f.a + Math.sin(f.ph * 0.8) * 0.02;
      put(D.spr, fr, f.x, f.y, a, 1, 1);
    }
  }

  function drawFx(e) {
    const k = e.t / e.life;
    if (e.type === 'spr') {
      const f = SP.fx[e.i], sc = lerp(e.s0, e.s1, 1 - (1 - k) * (1 - k)); // 처음에 빨리 커지고 천천히
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a + e.spin * e.t);
      ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      ctx.drawImage(f.im, -f.w * sc / 2, -f.h * sc / 2, f.w * sc, f.h * sc);
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (e.type === 'puff') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 + k * 0.6), 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'ring') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + k * e.r * 5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'spark') {
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6c2';
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(0, -7); ctx.lineTo(10, 0); ctx.lineTo(0, 7); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (e.type === 'pop') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(e.x, e.y, 12 + k * 26, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function bar(x, y, w, h, v, col, back = 'rgba(0,0,0,.35)') {
    ctx.fillStyle = back; roundRect(x, y, w, h, h / 2); ctx.fill();
    if (v > 0) { ctx.fillStyle = col; roundRect(x, y, Math.max(h, w * v), h, h / 2); ctx.fill(); }
  }

  function drawHud() {
    const p = S.p, W = S.st.waves;
    ctx.textBaseline = 'middle';
    // 체력 · 부스트
    ctx.fillStyle = 'rgba(25,35,50,.45)'; roundRect(20, 18, 380, 78, 16); ctx.fill();
    ctx.font = `bold 20px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText('체력', 36, 42);
    bar(92, 32, 290, 20, p.hp / T.hp, p.hp < T.hp * 0.3 ? '#ff5a4e' : '#ff8f6b');
    if (p.noFire > T.regenDelay && p.hurt > T.regenDelay && p.hp < T.hp) { ctx.fillStyle = '#b6ffb0'; ctx.font = `bold 15px ${FONT}`; ctx.fillText('회복 중', 300, 42); }
    ctx.font = `bold 20px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('부스트', 36, 74);
    bar(112, 66, 270, 14, p.boost / T.boostMax, '#7fd3ff');
    // 재료
    ctx.fillStyle = 'rgba(25,35,50,.45)'; roundRect(VW - 260, 18, 240, 56, 16); ctx.fill();
    sprite('items', 0, VW - 228, 46, 0, 0.75, 0.75);
    sprite('items', 1, VW - 118, 46, 0, 0.75, 0.75);
    ctx.fillStyle = '#fff'; ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(S.gear, VW - 200, 47); ctx.fillText(S.coin, VW - 90, 47);
    // 웨이브
    ctx.textAlign = 'center'; ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(S.wave === W.length - 1 ? 'BOSS' : `WAVE ${S.wave + 1} / ${W.length - 1}`, VW / 2, 34);
    if (S.bannerT > 0) {
      const a = clamp(S.bannerT / 0.4, 0, 1) * clamp((2.4 - S.bannerT) / 0.25, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(25,35,50,.5)'; ctx.fillRect(0, VH * 0.3 - 44, VW, 88);
      ctx.fillStyle = '#fff'; ctx.font = `bold 54px ${FONT}`; ctx.fillText(S.banner, VW / 2, VH * 0.3);
      ctx.globalAlpha = 1;
    }
    // 보스 체력
    const boss = S.foes.find((f) => f.boss);
    if (boss) {
      ctx.fillStyle = '#fff'; ctx.font = `bold 20px ${FONT}`; ctx.fillText(S.st.bossName, VW / 2, VH - 62);
      bar(VW / 2 - 400, VH - 44, 800, 18, boss.hp / boss.max, boss.hp < boss.max / 2 ? '#ff4f6d' : '#ffb03b');
      if (boss.kind === 'king') for (const k of [1 / 3, 2 / 3]) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(VW / 2 - 400 + 800 * k - 1.5, VH - 46, 3, 22); } // 구간 표시
    }
    // 보스 패턴 예고 문구
    if (S.warn && S.warn.t > 0) {
      ctx.globalAlpha = clamp(S.warn.t / 0.3, 0, 1);
      ctx.font = `bold 34px ${FONT}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,10,20,.6)'; ctx.fillStyle = '#ffd0d6';
      ctx.strokeText(S.warn.text, VW / 2, VH * 0.2); ctx.fillText(S.warn.text, VW / 2, VH * 0.2);
      ctx.globalAlpha = 1;
    }
    // 화면 밖 적 화살표
    for (const f of S.foes) {
      const dx = f.x - S.cam.x, dy = f.y - S.cam.y;
      if (Math.abs(dx) < VW / 2 - 20 && Math.abs(dy) < VH / 2 - 20) continue;
      const a = Math.atan2(dy, dx);
      const s = Math.min((VW / 2 - 40) / Math.abs(Math.cos(a) || 1e-6), (VH / 2 - 40) / Math.abs(Math.sin(a) || 1e-6));
      const x = VW / 2 + Math.cos(a) * s, y = VH / 2 + Math.sin(a) * s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = f.boss ? '#ff4f6d' : { hawk: '#c8873a', swift: '#5d7bd6', bomber: '#ffd45c' }[f.kind] || '#ff9a3d';
      const z = f.boss ? 1.6 : f.kind === 'bomber' ? 1.25 : 1;
      ctx.beginPath(); ctx.moveTo(18 * z, 0); ctx.lineTo(-10 * z, -13 * z); ctx.lineTo(-4 * z, 0); ctx.lineTo(-10 * z, 13 * z); ctx.fill();
      ctx.restore();
    }
    // 조준점
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(input.mx, input.my, 14, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(input.mx - 22, input.my); ctx.lineTo(input.mx - 8, input.my); ctx.moveTo(input.mx + 8, input.my); ctx.lineTo(input.mx + 22, input.my);
    ctx.moveTo(input.mx, input.my - 22); ctx.lineTo(input.mx, input.my - 8); ctx.moveTo(input.mx, input.my + 8); ctx.lineTo(input.mx, input.my + 22); ctx.stroke();
    if (paused) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#fff'; ctx.font = `bold 50px ${FONT}`; ctx.fillText('일시정지 (P · Esc)', VW / 2, VH / 2); }
  }

  // ── 시작 · 끝
  let running = false;
  function endGame(win) {
    if (S.over) return;
    S.over = true; S.win = win;
    SND.play(null); SND.sfx(win ? 'clear' : 'fail');
    const first = win && !UP.save.cleared.includes(S.st.id);
    const [g, c] = UP.bank(S.gear, S.coin, win, stageIdx); // 이기면 전부 + 다음 스테이지 열림, 지면 절반
    const last = stageIdx === STAGES.length - 1, run = S; // 결과는 지금 판 기준 (잠깐 뒤에 띄우는 사이 새 판이 시작될 수 있음)
    const text = `${run.st.name} · ${win ? `${run.st.bossName} 격파` : `WAVE ${run.wave + 1}에서 추락`} · 처치 ${run.kills}<br>`
      + `격납고로 가져감: 톱니 <b>+${g}</b> · 치즈 코인 <b>+${c}</b>${win ? '' : ' <small>(추락해서 절반)</small>'}`
      + (first && !last ? `<br><b style="color:#ffd45c">${STAGES[stageIdx + 1].name} 열림!</b>` : '');
    setTimeout(() => {
      if (S !== run) return; // 이미 다음 판
      $('#resTitle').textContent = win ? (last ? '모든 스테이지 클리어!' : '스테이지 클리어!') : '격추당했다…';
      $('#resText').innerHTML = text;
      $('#nextBtn').style.display = win && !last ? '' : 'none';
      $('#result').classList.add('on');
    }, win ? 200 : 1300);
  }
  // i = 스테이지 번호(0부터). 없으면 격납고에서 고른 것
  function start(i) {
    if (Number.isInteger(i)) UP.pickStage(i);
    stageIdx = pickStage();
    for (const id of ['#title', '#result', '#hangar']) $(id).classList.remove('on');
    paused = false; SND.hold(false);
    running = true;
    newGame(clamp(Number(qs.get('wave') || 1) - 1, 0, STAGES[stageIdx].waves.length - 1));
  }
  $('#startBtn').addEventListener('click', () => start());
  $('#againBtn').addEventListener('click', () => start(stageIdx));
  $('#nextBtn').addEventListener('click', () => start(stageIdx + 1));

  // 타이틀 · 결과 화면 그림 (art/sprites/title_*)
  const tbg = `linear-gradient(rgba(20,30,45,.2), rgba(20,30,45,.55)), url(${SP.title_bg[0].im.src})`;
  for (const id of ['#title', '#result']) Object.assign($(id).style, { backgroundImage: tbg, backgroundSize: 'cover', backgroundPosition: 'center' });
  const art = SP.title_art[0].im.cloneNode();
  art.className = 'keyart';
  $('#title').prepend(art);

  newGame(0);
  SND.play('title');
  if (qs.has('go') || qs.has('wave')) start();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (running && !paused) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // 확인용: 상태 보기 · 화면 없이 시간 돌리기 (창이 가려져 rAF 가 느려도 시험 가능)
  // 격납고(hangar.js)가 쓰는 것: 그림 · 출격
  window.RP = { SP, start, planeLook };
  dispatchEvent(new Event('rp-ready'));
  window.__S = () => S;
  window.__input = input;
  window.__step = (sec, fn) => { for (let t = 0; t < sec; t += 1 / 60) { if (fn) fn(S); update(1 / 60); } draw(); };
})();
