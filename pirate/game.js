// 쥐 해적 전투: RatPirate/index.html 조작 · 전투를 그대로 옮기고, 스프라이트 · 선원 리깅 · 상어 잠수 · 보스 패턴 · 자동 무기 · 맵 특성 추가
// 수치 = SHIPYARD.compute(), 바다 = window.SEAS, 그림 = window.SPRITES (art/sprites, 없으면 벡터로 대신 그림)
// 선원 리깅: 배 그림은 갑판이 비어 있고, CREW_SPOTS(배 길이 비율 좌표) 자리마다 선원 스프라이트를 배와 같이 돌려 올림
// 밖으로 내보내는 것 = window.PG (항구 port.js 가 씀): start · onEnd · img · drawShip · music
(function () {
  const cv = document.getElementById('cv');
  let ctx = cv.getContext('2d');
  const WORLD = { w: 3600, h: 2600 };
  const SY = window.SHIPYARD, SEAS = window.SEAS;
  let VW = 1280, VH = 720, K = 1, DPR = 1;
  const ZOOM = +new URLSearchParams(location.search).get('zoom') || 1; // 확인용: ?zoom=3 = 카메라 확대 (선원 리깅 보기)
  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * DPR; cv.height = innerHeight * DPR;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    K = Math.min(innerHeight / 720, innerWidth / 1100) * ZOOM; VW = innerWidth / K; VH = innerHeight / K;
  }
  addEventListener('resize', resize); resize();

  // ── 그림: SPRITES[이름] = [{ img, w, h }] (w · h = 게임 속 크기)
  const SP = {};
  let waiting = 0, ready = false;
  for (const [name, frames] of Object.entries(window.SPRITES || {})) {
    SP[name] = frames.map((f) => {
      const im = new Image(); waiting++;
      im.onload = im.onerror = () => { if (--waiting === 0) setReady(); };
      im.src = 'art/sprites/' + f.img;
      return { im, w: f.w, h: f.h, src: 'art/sprites/' + f.img };
    });
  }
  function setReady() { if (ready) return; ready = true; PG.ready = true; dispatchEvent(new Event('pg-ready')); }
  // 글꼴 = Jua (index.html 에서 웹 글꼴로 불러옴, 한 굵기). 캔버스는 글꼴이 늦게 와도 다음 프레임부터 바뀜
  const FONT = "'Jua', 'Malgun Gothic', sans-serif";
  if (document.fonts) document.fonts.load(`16px ${FONT}`).catch(() => {});
  const fr = (name, i = 0) => { const f = SP[name] && SP[name][i]; return f && f.im.complete && f.im.naturalWidth ? f : null; };

  // ── 효과음 (원본 즉석 합성 그대로) · 배경 음악 (비행기 게임 곡 재사용)
  let AC = null;
  function tone(f0, f1, dur, type = 'square', vol = 0.12, delay = 0) { if (!AC) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02); }
  function noise(dur, vol = 0.2, delay = 0, lp = 2400) { if (!AC) return; const t = AC.currentTime + delay, b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; s.buffer = b; g.gain.value = vol; s.connect(f).connect(g).connect(AC.destination); s.start(t); }
  const SFX = {
    boom: (n = 1, far = 0) => { for (let i = 0; i < Math.min(n, 5); i++) { noise(0.55, 0.3 * (1 - far), i * 0.045, 900); tone(95, 32, 0.45, 'sine', 0.3 * (1 - far), i * 0.045); } },
    splash: () => noise(0.3, 0.07, 0, 3000),
    hit: () => { noise(0.22, 0.25, 0, 1600); tone(170, 60, 0.18, 'square', 0.09); },
    crit: () => { noise(0.5, 0.4, 0, 1200); tone(240, 40, 0.5, 'sawtooth', 0.15); tone(60, 30, 0.6, 'sine', 0.4); },
    sink: () => { noise(1.4, 0.2, 0, 500); tone(200, 40, 1.3, 'sawtooth', 0.07); },
    coin: () => { tone(1200, 1200, 0.06, 'triangle', 0.07); tone(1800, 1800, 0.1, 'triangle', 0.07, 0.06); },
    wood: () => { tone(300, 220, 0.08, 'triangle', 0.1); tone(240, 180, 0.08, 'triangle', 0.08, 0.06); },
    chest: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.12, 'triangle', 0.09, i * 0.06)),
    squeak: () => { tone(1500, 2300, 0.07, 'square', 0.05); tone(2200, 1400, 0.09, 'square', 0.05, 0.07); },
    chain: () => { for (let i = 0; i < 4; i++) tone(900 + i * 140, 500, 0.08, 'square', 0.05, i * 0.03); },
    fire: () => { noise(0.6, 0.12, 0, 600); tone(200, 90, 0.5, 'sawtooth', 0.05); },
    whistle: () => tone(1800, 500, 0.9, 'sine', 0.06),
    meow: () => { tone(700, 1100, 0.15, 'sawtooth', 0.05); tone(1100, 600, 0.25, 'sawtooth', 0.05, 0.15); },
    wave: () => [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.12, i * 0.13)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.3, 'sawtooth', 0.08, i * 0.2)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.12, i * 0.12)),
    deny: () => tone(200, 150, 0.1, 'square', 0.06),
    torp: () => { noise(0.4, 0.08, 0, 1800); tone(400, 200, 0.3, 'sine', 0.06); },
    zap: () => { noise(0.35, 0.35, 0, 5000); tone(1200, 80, 0.4, 'sawtooth', 0.12); },
    bite: () => { noise(0.15, 0.3, 0, 900); tone(140, 60, 0.15, 'square', 0.12); },
    roar: () => { noise(0.9, 0.2, 0, 400); tone(90, 50, 0.9, 'sawtooth', 0.12); },
  };
  const BGM = {};
  let bgmOn = null, muted = false;
  function music(name) {
    if (name === 'port') name = 'title';
    if (bgmOn === name) return;
    for (const a of Object.values(BGM)) a.pause();
    bgmOn = name;
    if (!name || muted) return;
    const a = BGM[name] ||= Object.assign(new Audio('../audio/bgm/' + name + '.mp3'), { loop: true, volume: 0.45 });
    a.currentTime = 0; a.play().catch(() => {});
  }
  const audioOn = () => { if (!AC) { try { AC = new AudioContext(); } catch (e) {} } if (bgmOn && BGM[bgmOn] && BGM[bgmOn].paused && !muted) BGM[bgmOn].play().catch(() => {}); };

  // ── 적: hp · 길이 · 속도 · 회전 · 공격 · 보상 · 그림 · 선원(시트, 칸들)
  const FOES = {
    sloop: { name: '고양이 순찰선', hp: 60, len: 76, speed: 105, turn: 1.2, guns: 2, reload: 2.6, dmg: 9, gold: 15, plank: 4, spr: 'e_cat_sloop', crew: ['crew_cat', [0, 1]], col: '#33507a' },
    frigate: { name: '고양이 프리깃', hp: 140, len: 104, speed: 92, turn: 0.95, guns: 3, reload: 2.3, dmg: 11, gold: 30, plank: 8, spr: 'e_cat_frigate', crew: ['crew_cat', [4, 0, 2]], col: '#2c4670' },
    mortar: { name: '고양이 박격포선', hp: 90, len: 84, speed: 70, turn: 0.9, reload: 3.4, dmg: 18, gold: 25, plank: 6, spr: 'e_cat_mortar', crew: ['crew_cat', [3, 2]], col: '#4a4060', mortar: true },
    speeder: { name: '고양이 쾌속정', hp: 28, len: 50, speed: 210, turn: 2.8, ram: 22, gold: 8, plank: 2, spr: 'e_cat_speeder', crew: ['crew_cat', [5]], col: '#7a3a3a' },
    ironclad: { name: '고양이 철갑함', hp: 260, len: 112, speed: 66, turn: 0.7, guns: 3, reload: 2.4, dmg: 14, gold: 50, plank: 14, spr: 'e_cat_ironclad', crew: ['crew_cat', [4, 3, 0]], col: '#4a5260', armor: 0.7, bowGun: 2.6 },
    rival: { name: '라이벌 쥐 해적선', hp: 110, len: 92, speed: 122, turn: 1.25, guns: 3, reload: 2.4, dmg: 10, gold: 28, plank: 7, spr: 'e_rat_rival', crew: ['crew_rival', [2, 3, 5]], col: '#2a2a2e', fireP: 0.3 },
    shark: { name: '상어', hp: 34, len: 60, speed: 175, turn: 3.0, bite: 9, gold: 6, plank: 0, spr: 'e_shark', shark: true },
    mine: { name: '떠다니는 폭탄통', hp: 12, len: 26, speed: 12, turn: 0, boom: 28, gold: 3, plank: 1 },
    // 보스
    b_rival: { name: '라이벌 항해사 \'회색꼬리\'', hp: 600, len: 170, speed: 80, turn: 0.75, guns: 3, reload: 2.0, dmg: 11, gold: 120, plank: 30, spr: 'e_rat_rival', crew: ['crew_boss', [3], 'crew_rival', [2, 3, 4, 5]], col: '#2a2a2e', boss: 'rival' },
    b_shark: { name: '거대 상어', hp: 700, len: 230, speed: 150, turn: 1.6, bite: 22, gold: 150, plank: 20, spr: 'boss_megashark', fin: 1, boss: 'shark', shark: true },
    b_admiral: { name: '고양이 제독 기함', hp: 800, len: 210, speed: 62, turn: 0.55, guns: 5, reload: 2.1, dmg: 12, gold: 200, plank: 45, spr: 'boss_admiral', crew: ['crew_boss', [0], 'crew_cat', [0, 1, 2, 4, 3]], col: '#24406a', boss: 'admiral' },
    b_king: { name: '해적왕 블랙랫 갤리온', hp: 850, len: 210, speed: 70, turn: 0.6, guns: 5, reload: 2.0, dmg: 12, gold: 230, plank: 50, spr: 'boss_rival', crew: ['crew_boss', [1], 'crew_rival', [2, 3, 4, 5, 2]], col: '#151518', boss: 'king', fireP: 0.6 },
    b_shark2: { name: '분노한 거대 상어', hp: 800, len: 240, speed: 170, turn: 1.8, bite: 26, gold: 260, plank: 40, spr: 'boss_megashark', fin: 1, boss: 'shark', shark: true, rage: true },
    b_admiral2: { name: '제독 기함 Mk2', hp: 900, len: 220, speed: 68, turn: 0.6, guns: 6, reload: 1.9, dmg: 13, gold: 300, plank: 70, spr: 'boss_admiral', crew: ['crew_boss', [0], 'crew_cat', [0, 1, 2, 4, 3, 5]], col: '#24406a', boss: 'admiral', armor: 0.8, bowGun: 2.2, mk2: true },
    b_king2: { name: '해적왕 블랙랫 (재도전)', hp: 950, len: 220, speed: 76, turn: 0.65, guns: 6, reload: 1.8, dmg: 13, gold: 340, plank: 80, spr: 'boss_rival', crew: ['crew_boss', [1], 'crew_rival', [2, 3, 4, 5, 2, 3]], col: '#151518', boss: 'king', fireP: 0.8, mk2: true },
    b_fortress: { name: '대제독 해상 요새', hp: 1000, len: 300, speed: 34, turn: 0.35, guns: 4, reload: 2.4, dmg: 14, gold: 500, plank: 120, spr: 'boss_fortress', crew: ['crew_boss', [2], 'crew_cat', [4, 4, 0, 1, 2, 3]], col: '#3a4658', boss: 'fortress', armor: 0.85 },
  };
  // 선원 자리: [뱃머리 쪽 +x, 오른쪽 +y] 를 배 길이 비율로. 0 = 선장(고물 쪽), 나머지 = 선원 (건진 수만큼 차례로 참)
  // 가운데(x ≈ 0)는 돛대 · 돛 자리라 비움
  const CREW_SPOTS = [[-0.3, 0], [0.2, -0.065], [0.2, 0.065], [-0.13, -0.065], [-0.13, 0.065], [0.27, 0], [0.11, 0], [-0.2, 0.0]];
  const MAX_CREW_SHOWN = 7;
  // 배 그림 크기 = 데이터 len × SHIP_K (선원이 갑판에 넉넉히 올라가게). 선원 크기는 원래 len(base) 기준이라 배만 커짐. 상어 · 폭탄통은 그대로
  const SHIP_K = 1.8;

  // ── 상태
  let G = null, keys = {}, mouse = { x: 0, y: 0, down: false }, cam = { x: 0, y: 0 }, shakeAmt = 0, kick = { x: 0, y: 0 }, hitStop = 0, slowMo = 0, paused = false;
  const st = () => G.st;
  const GOD = new URLSearchParams(location.search).has('god'); // 확인용: 무적
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function start(seaIdx) {
    const S = SEAS[seaIdx], s = SY.compute();
    G = { sea: seaIdx, S, st: s, t: 0, wave: 0, deco: [], foes: [], balls: [], shells: [], torps: [], missiles: [], parts: [], fx: [], drops: [], chests: [], swimmers: [], islands: [], later: [], bolts: [],
      gold: 0, plank: 0, kills: 0, rescued: 0, combo: 0, comboT: 0, best: 0, msg: null, over: null, overT: 0, waveT: 0, boss: null,
      hpK: S.mult, dmgK: 1 + (S.mult - 1) * 0.6, lootK: 1 + (S.mult - 1) * 0.8, wind: { a: Math.random() * 7, v: 0 }, boltT: 3, planeA: 0 };
    const startX = S.trait === 'whirl' ? 520 : WORLD.w / 2, startY = WORLD.h / 2;
    for (let i = 0; i < 8; i++) { let x, y, r, n = 0; do { x = rnd(300, WORLD.w - 300); y = rnd(300, WORLD.h - 300); r = rnd(70, 170); n++; } while (n < 200 && (Math.hypot(x - startX, y - startY) < 450 || (S.trait === 'whirl' && Math.hypot(x - WORLD.w / 2, y - WORLD.h / 2) < 700) || G.islands.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 120))); G.islands.push({ x, y, r, seed: Math.random() * 100 }); }
    for (let i = 0; i < 26; i++) { const x = rnd(150, WORLD.w - 150), y = rnd(150, WORLD.h - 150); if (G.islands.some((o) => Math.hypot(o.x - x, o.y - y) < o.r * 1.5 + 40)) continue; G.deco.push({ x, y, i: Math.floor(Math.random() * 8), s: rnd(34, 70), r: Math.random() * 7 }); }
    G.me = { x: startX, y: startY, a: 0, v: 0, av: 0, sail: 0.4, hp: s.hp, max: s.hp, cd: [0, 0], len: s.ship.len * SHIP_K, base: s.ship.len, tier: s.ship.tier, spr: 'ship_' + s.ship.id, hit: 0, recoil: [0, 0], crew: 2, jump: 0, fireT: 0,
      sk: { chain: 0, fire: 0, mortar: 0 }, auto: { bow: 1, torpedo: 1, missile: 1, autoMortar: 2, planes: 0 }, isMe: true };
    cam.x = G.me.x - VW / 2; cam.y = G.me.y - VH / 2;
    paused = false; hitStop = 0; slowMo = 0;
    nextWave();
    music('battle');
    if (!looping) { looping = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function nextWave() {
    G.wave++;
    const boss = G.wave > G.S.waves.length;
    if (boss) {
      const p = freeSpot(800, 1100);
      G.boss = spawnFoe(G.S.boss, p);
      for (const k of G.S.waves[0].slice(0, 2)) if (k !== 'mine') spawnFoe(k);
      G.msg = { text: G.boss.name, sub: '보스 출현!', t: 3, boss: true };
      music('boss'); SFX.roar(); shake(10);
    } else {
      for (const k of G.S.waves[G.wave - 1]) spawnFoe(k);
      for (let i = 0; i < 1 + Math.floor(G.wave / 2); i++) spawnChest();
      G.msg = { text: `${G.S.name} · 웨이브 ${G.wave}/${G.S.waves.length}`, sub: G.wave === 1 ? G.S.story : '', t: 2.8 };
      SFX.wave();
    }
  }
  function freeSpot(minD, maxD) { let x, y, n = 0; do { const a = Math.random() * 7, d = rnd(minD, maxD); x = G.me.x + Math.cos(a) * d; y = G.me.y + Math.sin(a) * d; n++; } while (n < 300 && (x < 100 || y < 100 || x > WORLD.w - 100 || y > WORLD.h - 100 || G.islands.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 90))); return { x, y }; }
  function spawnFoe(k, p = freeSpot(700, 1300)) {
    const F = FOES[k], hp = F.hp * G.hpK;
    const f = { k, ...F, ...p, a: Math.atan2(G.me.y - p.y, G.me.x - p.x), v: 0, av: 0, hp, max: hp, cd: [rnd(0, 2), rnd(0, 2), 2, 3, 4, 5], hit: 0, bob: Math.random() * 7, recoil: [0, 0], burn: 0, slow: 0, jump: 0,
      dive: !!F.shark, surf: 0, phase: 'dive', pt: 3, ramCd: 0, turret: 0, base: F.len, len: F.shark || k === 'mine' ? F.len : F.len * SHIP_K };
    G.foes.push(f);
    return f;
  }
  function spawnChest() { const p = freeSpot(300, 1200); G.chests.push({ ...p, gold: Math.round((25 + Math.random() * 25) * G.lootK), plank: Math.round(6 * G.lootK), bob: Math.random() * 7 }); }

  // ── 사격 · 포탄 물리
  // 포탄은 쏜 배의 속도를 그대로 이어받음 (달리면서 쏘면 진행 방향으로 휘어 날아감) + 배가 돌고 있으면 뱃전 대포의 선속도까지 더함
  // 쏘면 반동으로 배가 반대쪽으로 밀리고 살짝 돌아감 (포 수가 많을수록 큼). 폭풍 바람은 날아가는 포탄도 밀어냄
  const INHERIT = 1;
  const shipVel = (s) => ({ x: Math.cos(s.a) * s.v, y: Math.sin(s.a) * s.v });
  function broadside(ship, side, count, dmg, speed, life, foe, kind = 'ball') {
    const fx = Math.cos(ship.a), fy = Math.sin(ship.a), nx = -fy * side, ny = fx * side, sv = shipVel(ship), w = ship.av || 0;
    ship.recoil[side > 0 ? 1 : 0] = 1; ship.jump = 0.3;
    crewFire(ship, side, count, ship.isMe ? reloadNow() : ship.reload || 2);
    for (let i = 0; i < count; i++) {
      const along = (count === 1 ? 0 : (i / (count - 1) - 0.5)) * ship.len * 0.6, spread = (Math.random() - 0.5) * (kind === 'chain' ? 0.3 : 0.08);
      const ox = fx * along + nx * ship.len * 0.15, oy = fy * along + ny * ship.len * 0.15, px = ship.x + ox, py = ship.y + oy, dx = nx + fx * spread, dy = ny + fy * spread;
      // 회전 선속도 = ω × r (뱃머리 · 고물 쪽 대포일수록 크게 휨)
      shot(px, py, dx * speed + (sv.x - w * oy) * INHERIT, dy * speed + (sv.y + w * ox) * INHERIT, life, dmg, foe, kind);
      for (let k = 0; k < 6; k++) G.parts.push({ x: px + nx * 8, y: py + ny * 8, vx: (nx + (Math.random() - 0.5) * 0.7) * rnd(50, 140), vy: (ny + (Math.random() - 0.5) * 0.7) * rnd(50, 140), t: rnd(0.8, 1.5), max: 1.5, col: 'smoke', size: rnd(7, 16) });
      G.fx.push({ x: px + nx * 12, y: py + ny * 12, flash: true, t: 0.09, a: Math.atan2(ny, nx), big: kind !== 'ball' });
    }
  }
  function shot(x, y, vx, vy, life, dmg, foe, kind = 'ball') { G.balls.push({ x, y, vx, vy, life, max: life, dmg, foe, h: 0, kind, trail: [] }); }
  const reloadNow = () => st().reload * (1 - Math.min(st().crewMax, G.me.crew) * st().crewReload);
  function fire(side, kind = 'ball') {
    const me = G.me, s = st(), i = side > 0 ? 1 : 0;
    if (G.over) return false;
    if (kind === 'ball') { if (me.cd[i] > 0) return false; me.cd[i] = reloadNow(); }
    const dmg = s.dmg * (kind === 'chain' ? 0.6 : kind === 'fire' ? 0.7 : 1);
    const go = () => { broadside(me, side, s.guns, dmg, s.ballSpd, 0.75 * s.range, false, kind); SFX.boom(s.guns); };
    go(); me.fireT = 0.35;
    if (kind === 'chain') SFX.chain(); if (kind === 'fire') SFX.fire();
    if (Math.random() < s.double) G.later.push({ t: 0.18, fn: go });
    shake(4 + s.guns);
    const nx = -Math.sin(me.a) * side, ny = Math.cos(me.a) * side, push = 3 + s.guns * 1.2;
    kick.x -= nx * 9; kick.y -= ny * 9;
    me.px = (me.px || 0) - nx * push * 14; me.py = (me.py || 0) - ny * push * 14; // 옆으로 밀리는 반동 (물 저항으로 줄어듦)
    me.av -= side * 0.04 * s.guns / Math.max(1, me.len / 100); // 한쪽만 쏘면 살짝 돌아감
    return true;
  }
  const SKILLS = { chain: { key: '1', name: '체인샷' }, fire: { key: '2', name: '화염탄' }, mortar: { key: '3', name: '폭격' } };
  function useSkill(k) {
    const me = G.me, cd = st()[k];
    if (!cd || me.sk[k] > 0 || G.over || paused) { SFX.deny(); return; }
    me.sk[k] = cd;
    if (k === 'mortar') { G.shells.push({ x: mouse.x + cam.x, y: mouse.y + cam.y, t: 0.9, dur: 0.9, dmg: st().mortarDmg, r: st().mortarR, foe: false }); SFX.whistle(); shake(4); return; }
    fire(sideToward(), k);
  }
  const shake = (n) => { shakeAmt = Math.max(shakeAmt, n); };
  function burst(x, y, col, n, sp = 160, size = 4, life = 0.8) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = sp * rnd(0.3, 1.3); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life * rnd(0.5, 1.1), max: life, col, size: size * rnd(0.5, 1.5) }); } }
  function splashAt(x, y, big) { G.fx.push({ x, y, splash: true, t: big ? 0.8 : 0.55, big }); burst(x, y, '#e6f4ff', big ? 18 : 8, big ? 160 : 90, 3); if (Math.random() < 0.35 || big) SFX.splash(); }
  function txt(x, y, s, col, crit) { G.fx.push({ x: x + (Math.random() - 0.5) * 20, y: y - 20, txt: s, col, t: crit ? 1.1 : 0.8, crit }); }

  // 적이 맞음: kind = 'ball' · 'chain' · 'fire' · 'torp' · 'shell' · 'ram' · 'bow' · 'plane' · 'missile'
  function hurtFoe(f, dmg, kind = 'ball') {
    const s = st();
    if (f.shark && f.dive && !['torp', 'shell'].includes(kind)) return false; // 잠수 중: 포탄은 위로 지나감
    if (f.boss === 'shark' && f.phase !== 'surface' && !['torp', 'shell'].includes(kind)) return false;
    let crit = false;
    if (Math.random() < s.crit) { dmg *= 2; crit = true; }
    if (f.armor && !['torp', 'shell', 'missile'].includes(kind)) dmg *= f.armor;
    if (f.boss === 'shark' && f.phase === 'surface') dmg *= 1.5;
    f.hp -= dmg; f.hit = 0.22;
    G.combo++; G.comboT = 2.5; G.best = Math.max(G.best, G.combo);
    txt(f.x, f.y, crit ? `치명타! ${Math.round(dmg)}` : '-' + Math.round(dmg), crit ? '#ffb347' : '#ffe27a', crit);
    burst(f.x, f.y, f.shark ? '#cfe8ff' : '#8a5a30', crit ? 18 : 8, crit ? 240 : 170, 5);
    if (crit) { burst(f.x, f.y, '#ffb347', 14, 220, 4); SFX.crit(); shake(12); hitStop = 0.06; }
    if (kind === 'ball' || kind === 'chain' || kind === 'fire') {
      if (kind === 'chain' || Math.random() < s.chainAll) {
        f.slow = 4; txt(f.x, f.y - 14, '돛 찢김!', '#cfd6e0');
        if (s.kraken) for (const o of G.foes) if (o !== f && dist(o, f) < 180) { o.slow = Math.max(o.slow, s.kraken); o.stuck = s.kraken; }
      }
      if (kind === 'fire' || Math.random() < s.burnAll) f.burn = 5;
      if (s.splash) { G.fx.push({ x: f.x, y: f.y, blast: s.splash, t: 0.3 }); for (const o of G.foes) if (o !== f && dist(o, f) < s.splash + o.len * 0.3) { o.hp -= dmg * 0.5; o.hit = 0.15; } }
    }
    return true;
  }
  function hurtMe(dmg, x, y) {
    const me = G.me, s = st();
    if (G.over) return;
    if (Math.random() < s.evade) { txt(me.x, me.y, '빗나감!', '#cfe8ff'); return; }
    dmg *= G.dmgK * s.dmgTaken;
    me.hp -= dmg; me.hit = 0.22; crewHit(me);
    txt(me.x, me.y, '-' + Math.round(dmg), '#ff6b5b');
    burst(x ?? me.x, y ?? me.y, '#8a5a30', 10, 180, 5);
    shake(10); SFX.hit(); kick.x += (Math.random() - 0.5) * 14; kick.y += (Math.random() - 0.5) * 14;
  }

  // ── 움직임
  function steer(s, tx, ty, dt, speedFrac = 1, angOff = 0) {
    if (s.stuck > 0) { s.v *= 0.9; return; }
    const want = Math.atan2(ty - s.y, tx - s.x) + angOff, d = wrapA(want - s.a), slow = s.slow > 0 ? 0.45 : 1;
    s.a += Math.sign(d) * Math.min(Math.abs(d), s.turn * dt * slow);
    s.v += (s.speed * speedFrac * slow - s.v) * Math.min(1, dt * 1.5);
  }
  function collideIslands(s, r) {
    for (const o of G.islands) { const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy) || 1, m = o.r + r; if (d < m) { s.x = o.x + dx / d * m; s.y = o.y + dy / d * m; s.v *= 0.5; } }
    s.x = Math.max(r, Math.min(WORLD.w - r, s.x)); s.y = Math.max(r, Math.min(WORLD.h - r, s.y));
  }
  function wakeOf(s) {
    if (Math.abs(s.v) < 30) return;
    const fx = Math.cos(s.a), fy = Math.sin(s.a), bx = s.x + fx * s.len * 0.45, by = s.y + fy * s.len * 0.45;
    for (const sd of [-1, 1]) G.parts.push({ x: bx, y: by, vx: -fy * sd * 40 - fx * 10, vy: fx * sd * 40 - fy * 10, t: 1.6, max: 1.6, col: 'wake', size: 3 + s.len * 0.035 });
  }
  const nearest = (x, y, maxD, ok = () => true) => { let best = null, bd = maxD; for (const f of G.foes) { if (f.k === 'mine' || !ok(f)) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < bd) { bd = d; best = f; } } return best; };
  const targetable = (f) => !(f.shark && f.dive) && !(f.boss === 'shark' && f.phase !== 'surface');

  function update(dt) {
    G.t += dt;
    const me = G.me, s = st();
    for (const l of G.later) if ((l.t -= dt) <= 0) { l.fn(); l.done = true; }
    G.later = G.later.filter((l) => !l.done);
    if (!G.over) {
      if (keys.w) me.sail = Math.min(1, me.sail + dt * 1.4);
      if (keys.s) me.sail = Math.max(-0.3, me.sail - dt * 1.4);
      const turn = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), tr = s.turn * (1.15 - Math.min(0.5, Math.abs(me.v) / 500));
      me.av += (turn * tr - me.av) * Math.min(1, dt * 6);
      me.a += me.av * dt;
      me.v += (s.speed * me.sail - me.v) * Math.min(1, dt * 1.3);
      me.x += Math.cos(me.a) * me.v * dt; me.y += Math.sin(me.a) * me.v * dt;
      if (me.px) { me.x += me.px * dt; me.y += me.py * dt; const k = Math.pow(0.02, dt); me.px *= k; me.py *= k; if (Math.abs(me.px) + Math.abs(me.py) < 1) me.px = me.py = 0; }
      if (mouse.down) fire(sideToward());
      if (keys.q) fire(-1); if (keys.e) fire(1);
    } else me.v *= 0.97;
    traits(dt);
    collideIslands(me, me.len * 0.3);
    crewTick(me, dt); for (const f of G.foes) crewTick(f, dt);
    me.cd = me.cd.map((c) => Math.max(0, c - dt)); me.hit = Math.max(0, me.hit - dt); me.recoil = me.recoil.map((r) => Math.max(0, r - dt * 4)); me.jump = Math.max(0, me.jump - dt); me.fireT = Math.max(0, me.fireT - dt);
    for (const k in me.sk) me.sk[k] = Math.max(0, me.sk[k] - dt);
    if (Math.random() < dt * 40) wakeOf(me);
    if (!G.over) autoWeapons(dt);
    if ((G.comboT -= dt) <= 0) G.combo = 0;

    for (const f of G.foes) foeAI(f, dt);
    projectiles(dt);
    // 침몰
    for (const f of G.foes) if (f.hp <= 0 && !f.dead) sinkFoe(f);
    G.foes = G.foes.filter((f) => !f.dead);
    pickups(dt);
    for (const p of G.parts) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; if (p.g) p.vy += p.g * dt; }
    G.parts = G.parts.filter((p) => p.t > 0); if (G.parts.length > 1400) G.parts.splice(0, G.parts.length - 1400);
    for (const f of G.fx) { f.t -= dt; if (f.jumper) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.t <= 0) splashAt(f.x, f.y, false); } }
    G.fx = G.fx.filter((f) => f.t > 0);
    if (G.msg && (G.msg.t -= dt) <= 0) G.msg = null;
    // 끝 · 웨이브
    if (GOD) me.hp = Math.max(me.hp, 1);
    if (me.hp <= 0 && !G.over) { G.over = 'lose'; G.overT = 2.4; SFX.lose(); burst(me.x, me.y, '#8a5a30', 40, 260, 7); slowMo = 1; crewJumpOff(me); music(null); }
    if (!G.over && !G.foes.some((f) => f.k !== 'mine')) {
      if (G.wave > G.S.waves.length) {
        G.over = 'win'; G.overT = 3; SFX.win(); music(null);
        for (const d of G.drops) collect(d); G.drops = [];
        G.rescued += G.swimmers.length; G.swimmers = [];
      } else if (!G.waveT) {
        G.waveT = 2.6; me.hp = Math.min(me.max, me.hp + s.repair + me.crew);
        txt(me.x, me.y - 30, `수리 +${Math.round(s.repair + me.crew)}`, '#7dff8a');
      }
    }
    if (G.waveT && (G.waveT -= dt) <= 0) { G.waveT = 0; nextWave(); }
    if (G.over && (G.overT -= dt) <= 0) end();
  }
  function end() {
    const r = { win: G.over === 'win', sea: G.sea, plank: Math.round(G.plank), coin: Math.round(G.gold), kills: G.kills, rescued: G.rescued, crew: G.me.crew };
    G.done = true; G.over = 'done';
    if (PG.onEnd) PG.onEnd(r);
  }

  // 맵 특성: 폭풍(바람 + 번개) · 소용돌이(끌어당김 + 가운데 피해)
  function traits(dt) {
    const me = G.me, guard = 1 - st().stormGuard, tr = G.S.trait;
    if (tr === 'storm') {
      G.wind.a += dt * 0.08; G.wind.v = 38 + Math.sin(G.t * 0.3) * 18;
      const wx = Math.cos(G.wind.a) * G.wind.v, wy = Math.sin(G.wind.a) * G.wind.v;
      me.x += wx * guard * dt; me.y += wy * guard * dt;
      for (const f of G.foes) if (!f.boss) { f.x += wx * 0.6 * dt; f.y += wy * 0.6 * dt; }
      if ((G.boltT -= dt) <= 0 && !G.over) { G.boltT = rnd(2.2, 3.6); const a = Math.random() * 7, d = rnd(0, 320); G.bolts.push({ x: me.x + Math.cos(a) * d + Math.cos(me.a) * me.v * 0.8, y: me.y + Math.sin(a) * d + Math.sin(me.a) * me.v * 0.8, t: 1.3, r: 95 }); }
      for (const b of G.bolts) if ((b.t -= dt) <= 0 && !b.hit) {
        b.hit = true; G.fx.push({ x: b.x, y: b.y, bolt: true, t: 0.35 }); G.flash = 0.25; SFX.zap(); shake(9); splashAt(b.x, b.y, true);
        if (Math.hypot(me.x - b.x, me.y - b.y) < b.r + me.len * 0.25) hurtMe(16 * guard, b.x, b.y);
        for (const f of G.foes) if (Math.hypot(f.x - b.x, f.y - b.y) < b.r) { f.hp -= 20; f.hit = 0.2; }
      }
      G.bolts = G.bolts.filter((b) => !b.hit);
    }
    if (tr === 'whirl') {
      const cx = WORLD.w / 2, cy = WORLD.h / 2;
      const pull = (o, k) => { const dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy) || 1; if (d > 1500) return d; const p = 90 * (1 - d / 1500) * k; o.x += (dx / d * p - dy / d * p * 0.9) * dt; o.y += (dy / d * p + dx / d * p * 0.9) * dt; return d; };
      if (pull(me, guard) < 150 && !G.over) { me.hp -= 14 * guard * dt; me.hit = 0.1; if (Math.random() < dt * 3) txt(me.x, me.y, '소용돌이!', '#9fe0ff'); }
      for (const f of G.foes) if (!f.boss) pull(f, 0.7);
    }
    if (G.flash) G.flash = Math.max(0, G.flash - dt);
  }

  // 자동 무기: 선수포 · 어뢰 · 유도탄 · 함재기 · 자동 폭격
  function autoWeapons(dt) {
    const me = G.me, s = st(), A = me.auto, fx = Math.cos(me.a), fy = Math.sin(me.a);
    if (s.bow && (A.bow -= dt) <= 0) {
      const t = nearest(me.x, me.y, 560 * s.range, (f) => targetable(f) && Math.abs(wrapA(Math.atan2(f.y - me.y, f.x - me.x) - me.a)) < 0.8);
      if (t) { A.bow = s.bow; const a = Math.atan2(t.y - me.y, t.x - me.x), bx = me.x + fx * me.len * 0.45, by = me.y + fy * me.len * 0.45, sv = shipVel(me); G.balls.push({ x: bx, y: by, vx: Math.cos(a) * 620 + sv.x, vy: Math.sin(a) * 620 + sv.y, life: 0.9, max: 0.9, dmg: s.bowDmg, foe: false, h: 0, kind: 'bow', trail: [] }); G.fx.push({ x: bx, y: by, flash: true, t: 0.07, a }); SFX.boom(1, 0.5); }
    }
    if (s.torpedo && (A.torpedo -= dt) <= 0 && G.foes.length) {
      A.torpedo = s.torpedo; const a = Math.atan2(mouse.y + cam.y - me.y, mouse.x + cam.x - me.x);
      // 어뢰: 배가 달리던 속도 중 발사 방향 성분을 얹어 출발 (뒤로 쏘면 느리게 출발)
      G.torps.push({ x: me.x + Math.cos(a) * me.len * 0.3, y: me.y + Math.sin(a) * me.len * 0.3, a, v: Math.max(200, 330 + Math.cos(a - me.a) * me.v), life: 2.4, dmg: s.torpedoDmg }); SFX.torp();
    }
    if (s.missile && (A.missile -= dt) <= 0) {
      const t = nearest(me.x, me.y, 900, targetable);
      if (t) { A.missile = s.missile; G.missiles.push({ x: me.x, y: me.y, a: me.a + (Math.random() < 0.5 ? 1 : -1) * 1.2, v: 260, life: 3, dmg: s.missileDmg, tgt: t }); SFX.whistle(); }
    }
    if (s.autoMortar && (A.autoMortar -= dt) <= 0) {
      const t = nearest(me.x, me.y, 750);
      if (t) { A.autoMortar = s.autoMortar; G.shells.push({ x: t.x + Math.cos(t.a) * t.v * 0.8, y: t.y + Math.sin(t.a) * t.v * 0.8, t: 0.9, dur: 0.9, dmg: s.mortarDmg, r: s.mortarR * 0.8, foe: false }); SFX.whistle(); }
    }
    if (s.planes) {
      G.planeA += dt * 1.6;
      if ((A.planes -= dt) <= 0) {
        A.planes = 0.6;
        for (let i = 0; i < s.planes; i++) {
          const p = planePos(i), t = nearest(p.x, p.y, 420, targetable);
          if (t) { const a = Math.atan2(t.y - p.y, t.x - p.x); G.balls.push({ x: p.x, y: p.y, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, life: 0.6, max: 0.6, dmg: s.planeDmg, foe: false, h: 0, kind: 'plane', trail: [] }); }
        }
      }
    }
  }
  function planePos(i) { const me = G.me, n = st().planes, a = G.planeA + i * Math.PI * 2 / n, r = me.len * 0.9 + 40 + Math.sin(G.planeA * 2 + i) * 20; return { x: me.x + Math.cos(a) * r, y: me.y + Math.sin(a) * r, a: a + Math.PI / 2 }; }

  // ── 적 행동
  function foeAI(f, dt) {
    const me = G.me, dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy);
    f.cd = f.cd.map((c) => c - dt); f.hit = Math.max(0, f.hit - dt); f.bob += dt; f.slow = Math.max(0, f.slow - dt); f.stuck = Math.max(0, (f.stuck || 0) - dt); f.recoil = f.recoil.map((r) => Math.max(0, r - dt * 4)); f.jump = Math.max(0, f.jump - dt); f.ramCd -= dt;
    if (f.burn > 0) { f.burn -= dt; f.hp -= 7 * dt * (1 + (G.hpK - 1) * 0.5); if (Math.random() < dt * 18) G.parts.push({ x: f.x + (Math.random() - 0.5) * f.len * 0.5, y: f.y + (Math.random() - 0.5) * f.len * 0.2, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, t: 0.6, max: 0.6, col: 'flame', size: rnd(6, 12) }); }
    const dmg = (f.dmg || 0);
    if (f.k === 'mine') { f.x += Math.cos(f.bob * 0.3) * 8 * dt; f.y += Math.sin(f.bob * 0.4) * 8 * dt; if (d < f.len + me.len * 0.3 && !G.over) { hurtMe(f.boom); f.hp = 0; f.exploded = true; } return; }
    if (f.boss === 'shark') return bossShark(f, dt, d);
    if (f.k === 'shark') {
      // 잠수(지느러미만) → 가까우면 떠올라 2.5초 물기 → 다시 잠수
      if (f.dive) { steer(f, me.x, me.y, dt, 1, d > 260 ? 0 : 0.9); if (d < 150 && f.cd[0] <= 0) { f.dive = false; f.surf = 2.5; splashAt(f.x, f.y, false); } }
      else { steer(f, me.x, me.y, dt, 1.1); if (d < f.len * 0.4 + me.len * 0.3 && f.cd[1] <= 0) { hurtMe(f.bite, f.x, f.y); f.cd[1] = 1.1; SFX.bite(); burst(me.x, me.y, '#cfe8ff', 10, 120); } if ((f.surf -= dt) <= 0) { f.dive = true; f.cd[0] = 2.5; splashAt(f.x, f.y, false); } }
    } else if (f.k === 'speeder') {
      steer(f, me.x, me.y, dt);
      if (d < f.len * 0.5 + me.len * 0.3 && !G.over) { if (st().ram) { hurtFoe(f, st().ram, 'ram'); } else hurtMe(f.ram); f.hp = 0; f.exploded = true; }
    } else if (f.mortar) {
      if (d > 720) steer(f, me.x, me.y, dt, 1); else if (d < 480) steer(f, f.x - dx, f.y - dy, dt, 1); else steer(f, me.x, me.y, dt, 0.3, Math.PI / 2);
      if (d < 820 && f.cd[0] <= 0) { f.cd[0] = f.reload; lob(f, me.x + Math.cos(me.a) * me.v * 0.9, me.y + Math.sin(me.a) * me.v * 0.9, dmg, 70, 1.3); }
    } else shipAI(f, dt, d, dx, dy);
    if (f.boss) bossPattern(f, dt, d);
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
    collideIslands(f, f.len * 0.3);
    // 박치기: 내 배가 ram 이 있으면 적만 다침, 없으면 서로 밀어냄
    if (!f.shark && f.k !== 'speeder') {
      const m = (f.len + me.len) * 0.28;
      if (d < m && d > 0) {
        const push = (m - d) / 2; f.x -= dx / d * push; f.y -= dy / d * push; me.x += dx / d * push; me.y += dy / d * push;
        if (st().ram && f.ramCd <= 0 && Math.abs(me.v) > 60) { f.ramCd = 0.8; hurtFoe(f, st().ram, 'ram'); SFX.hit(); shake(8); txt(f.x, f.y - 20, '박치기!', '#ffb347'); }
      }
    }
    if (!f.shark && Math.random() < dt * 20) wakeOf(f);
    if (f.hp < f.max * 0.5 && !f.shark && Math.random() < dt * 8) G.parts.push({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 20, vy: -20, t: 1.4, max: 1.4, col: 'smoke', size: 8 });
  }
  function shipAI(f, dt, d, dx, dy) {
    const me = G.me, want = 240 + f.len * 0.8, side = Math.sign(wrapA(Math.atan2(dy, dx) - f.a)) || 1;
    if (d > want + 120) steer(f, me.x, me.y, dt, 1); else steer(f, me.x, me.y, dt, 0.6, -side * Math.PI / 2 * (d < want - 60 ? 1.3 : 1));
    const rel = wrapA(Math.atan2(dy, dx) - f.a), aligned = Math.abs(Math.abs(rel) - Math.PI / 2) < 0.4, s = rel > 0 ? 1 : -1, ci = s > 0 ? 1 : 0;
    if (aligned && d < 460 + f.len * 0.3 && f.cd[ci] <= 0 && !G.over) {
      f.cd[ci] = f.reload * rnd(0.8, 1.2);
      broadside(f, s, f.guns, f.dmg, 430, 1.05 + f.len * 0.001, true, f.fireP && Math.random() < f.fireP ? 'fire' : 'ball');
      SFX.boom(1, Math.min(0.8, d / 900));
    }
    if (f.bowGun && f.cd[2] <= 0 && Math.abs(rel) < 0.6 && d < 560) { f.cd[2] = f.bowGun; const a = Math.atan2(dy, dx); shot(f.x + Math.cos(f.a) * f.len * 0.45, f.y + Math.sin(f.a) * f.len * 0.45, Math.cos(a) * 480, Math.sin(a) * 480, 1.2, f.dmg, true); }
  }
  function lob(f, x, y, dmg, r, dur) { G.shells.push({ x, y, t: dur, dur, dmg, r, foe: true }); if (f) SFX.boom(1, 0.6); }
  function ring(x, y, n, sp, dmg, off = 0, kind = 'ball') { for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; shot(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 1.6, dmg, true, kind); } }
  // 보스 패턴: 제독 = 일제 사격 + 폭격 세례 + 쾌속정 / 해적왕 = 화염 일제 사격 + 원형 탄 + 라이벌 / 회색꼬리 = 폭격 3발 / 해상 요새 = 포탑 4곳 + 폭격 비 + 나선 탄
  function bossPattern(f, dt, d) {
    const me = G.me, half = f.hp < f.max * 0.5, few = G.foes.length < 7;
    if (f.boss === 'rival' && f.cd[3] <= 0) { f.cd[3] = 7; for (let i = 0; i < 3; i++) lob(f, me.x + rnd(-120, 120) + Math.cos(me.a) * me.v * 0.8, me.y + rnd(-120, 120) + Math.sin(me.a) * me.v * 0.8, f.dmg * 1.4, 75, 1.4 + i * 0.2); }
    if (f.boss === 'admiral') {
      if (f.cd[3] <= 0) { f.cd[3] = f.mk2 ? 5 : 6; G.msg = { text: '폭격 세례!', t: 1 }; for (let i = 0; i < (f.mk2 ? 7 : 5); i++) lob(null, me.x + rnd(-260, 260), me.y + rnd(-260, 260), f.dmg * 1.3, 75, rnd(1.1, 1.8)); SFX.whistle(); }
      if (f.cd[4] <= 0 && few) { f.cd[4] = 10; spawnFoe('speeder', { x: f.x - Math.cos(f.a) * f.len * 0.4, y: f.y - Math.sin(f.a) * f.len * 0.4 }); spawnFoe('speeder', { x: f.x + Math.cos(f.a) * f.len * 0.4, y: f.y + Math.sin(f.a) * f.len * 0.4 }); if (f.mk2 && G.foes.length < 6) spawnFoe('ironclad'); SFX.meow(); }
    }
    if (f.boss === 'king') {
      if (f.cd[3] <= 0) { f.cd[3] = f.mk2 ? 4 : 5; ring(f.x, f.y, f.mk2 ? 20 : 16, 300, f.dmg, G.t, f.mk2 ? 'fire' : 'ball'); SFX.boom(4, 0.2); shake(6); }
      if (f.cd[4] <= 0 && few) { f.cd[4] = 12; spawnFoe('rival'); }
    }
    if (f.boss === 'fortress') {
      f.speed = half ? 60 : 34;
      const T = [[0.3, -0.14], [0.3, 0.14], [-0.2, -0.14], [-0.2, 0.14]];
      if ((f.turret -= dt) <= 0) {
        f.turret = half ? 1.0 : 1.6;
        for (const [ax, ay] of T) { const c = Math.cos(f.a), s = Math.sin(f.a), x = f.x + (ax * c - ay * s) * f.len, y = f.y + (ax * s + ay * c) * f.len, a = Math.atan2(me.y - y, me.x - x) + rnd(-0.08, 0.08); shot(x, y, Math.cos(a) * 470, Math.sin(a) * 470, 1.5, f.dmg, true); G.fx.push({ x, y, flash: true, t: 0.08, a }); }
        SFX.boom(2, 0.4);
      }
      if (f.cd[3] <= 0) { f.cd[3] = 7; G.msg = { text: '폭격 비!', t: 1 }; for (let i = 0; i < 6; i++) lob(null, me.x + rnd(-300, 300), me.y + rnd(-300, 300), f.dmg * 1.3, 80, rnd(1.1, 2)); SFX.whistle(); }
      if (f.cd[4] <= 0 && few) { f.cd[4] = 11; spawnFoe('speeder'); spawnFoe('speeder'); }
      if (half && f.cd[5] <= 0) { f.cd[5] = 0.12; const a = G.t * 2.2; for (const o of [0, Math.PI]) shot(f.x, f.y, Math.cos(a + o) * 260, Math.sin(a + o) * 260, 2, f.dmg * 0.7, true); }
    }
  }
  // 거대 상어: 잠수(무적, 지느러미) → 예고선 → 돌진 · 물기 → (가끔 상어 소환) → 떠올라 약점 4초
  function bossShark(f, dt, d) {
    const me = G.me;
    f.pt -= dt;
    if (f.phase === 'dive') {
      steer(f, me.x, me.y, dt, 0.8, d > 380 ? 0 : 1.3);
      if (f.pt <= 0) { f.phase = 'aim'; f.pt = f.rage ? 0.8 : 1.1; f.aimA = Math.atan2(me.y - f.y, me.x - f.x); f.v *= 0.3; SFX.roar(); }
    } else if (f.phase === 'aim') {
      f.v *= 0.9; f.a += wrapA(f.aimA - f.a) * Math.min(1, dt * 8);
      if (f.pt <= 0) { f.phase = 'charge'; f.pt = 1.1; f.a = f.aimA; f.bit = false; }
    } else if (f.phase === 'charge') {
      f.v = f.speed * 3.4;
      if (!f.bit && d < f.len * 0.35 + me.len * 0.3) { f.bit = true; hurtMe(f.bite, f.x, f.y); SFX.bite(); shake(16); }
      if (f.pt <= 0) { f.n = (f.n || 0) + 1; if (f.n % 2 === 0 && G.foes.length < 8) { for (let i = 0; i < (f.rage ? 3 : 2); i++) spawnFoe('shark', { x: f.x + rnd(-120, 120), y: f.y + rnd(-120, 120) }); } f.phase = 'surface'; f.pt = f.rage ? 3 : 4; splashAt(f.x, f.y, true); txt(f.x, f.y - 40, '약점!', '#ffd84a', true); }
    } else if (f.phase === 'surface') {
      f.v *= 0.95; if (f.rage && f.cd[3] <= 0) { f.cd[3] = 1.2; ring(f.x, f.y, 10, 260, f.bite * 0.5, G.t); }
      if (f.pt <= 0) { f.phase = 'dive'; f.pt = rnd(2.5, 3.5); splashAt(f.x, f.y, true); }
    }
    f.x += Math.cos(f.a) * f.v * dt; f.y += Math.sin(f.a) * f.v * dt;
    f.x = Math.max(60, Math.min(WORLD.w - 60, f.x)); f.y = Math.max(60, Math.min(WORLD.h - 60, f.y));
    if (Math.random() < dt * 25 && f.v > 40) wakeOf(f);
  }

  function projectiles(dt) {
    const me = G.me;
    for (const b of G.balls) {
      b.trail.push([b.x, b.y - b.h]); if (b.trail.length > 6) b.trail.shift();
      if (G.S.trait === 'storm' && b.kind !== 'plane') { b.vx += Math.cos(G.wind.a) * G.wind.v * 0.8 * dt; b.vy += Math.sin(G.wind.a) * G.wind.v * 0.8 * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; const q = 1 - b.life / b.max; b.h = b.kind === 'plane' ? 0 : Math.sin(q * Math.PI) * 24;
      if (b.foe) { if (!G.over && Math.hypot(b.x - me.x, b.y - me.y) < me.len * 0.36) { hurtMe(b.dmg, b.x, b.y); if (b.kind === 'fire') me.burn = 3; b.dead = true; } }
      else for (const f of G.foes) if (Math.hypot(b.x - f.x, b.y - f.y) < f.len * 0.42 + 8) {
        if (hurtFoe(f, b.dmg, b.kind)) { b.dead = true; SFX.hit(); shake(2); break; }
      }
      if (!b.dead && G.islands.some((o) => Math.hypot(b.x - o.x, b.y - o.y) < o.r)) { b.dead = true; burst(b.x, b.y, '#c8b47a', 8, 90); }
      if (!b.dead && b.life <= 0) { b.dead = true; splashAt(b.x, b.y, false); }
    }
    G.balls = G.balls.filter((b) => !b.dead);
    if (me.burn > 0) { me.burn -= dt; me.hp -= 3 * dt; if (Math.random() < dt * 14) G.parts.push({ x: me.x + (Math.random() - 0.5) * me.len * 0.4, y: me.y, vx: 0, vy: -30, t: 0.5, max: 0.5, col: 'flame', size: 7 }); }
    // 어뢰: 잠수한 상어도 맞음
    for (const t of G.torps) {
      t.x += Math.cos(t.a) * t.v * dt; t.y += Math.sin(t.a) * t.v * dt; t.life -= dt;
      if (Math.random() < dt * 30) G.parts.push({ x: t.x, y: t.y, vx: 0, vy: 0, t: 0.9, max: 0.9, col: 'bubble', size: 3 });
      for (const f of G.foes) if (Math.hypot(t.x - f.x, t.y - f.y) < f.len * 0.42 + 6) { hurtFoe(f, t.dmg, 'torp'); t.dead = true; G.fx.push({ x: t.x, y: t.y, blast: 60, t: 0.4 }); splashAt(t.x, t.y, true); SFX.boom(2); break; }
      if (G.islands.some((o) => Math.hypot(t.x - o.x, t.y - o.y) < o.r)) t.dead = true;
      if (t.life <= 0) t.dead = true;
    }
    G.torps = G.torps.filter((t) => !t.dead);
    for (const m of G.missiles) {
      if (m.tgt && (m.tgt.dead || !targetable(m.tgt))) m.tgt = nearest(m.x, m.y, 900, targetable);
      if (m.tgt) m.a += Math.sign(wrapA(Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x) - m.a)) * Math.min(Math.abs(wrapA(Math.atan2(m.tgt.y - m.y, m.tgt.x - m.x) - m.a)), 4.5 * dt);
      m.v = Math.min(560, m.v + 500 * dt); m.x += Math.cos(m.a) * m.v * dt; m.y += Math.sin(m.a) * m.v * dt; m.life -= dt;
      if (Math.random() < dt * 40) G.parts.push({ x: m.x, y: m.y, vx: 0, vy: 0, t: 0.5, max: 0.5, col: 'smoke', size: 4 });
      for (const f of G.foes) if (targetable(f) && Math.hypot(m.x - f.x, m.y - f.y) < f.len * 0.42 + 6) { hurtFoe(f, m.dmg, 'missile'); m.dead = true; G.fx.push({ x: m.x, y: m.y, blast: 45, t: 0.35 }); SFX.boom(1); break; }
      if (m.life <= 0) { m.dead = true; splashAt(m.x, m.y, false); }
    }
    G.missiles = G.missiles.filter((m) => !m.dead);
    for (const s of G.shells) {
      s.t -= dt;
      if (s.t <= 0) {
        s.dead = true; burst(s.x, s.y, '#ffb347', 24, 240, 6); burst(s.x, s.y, '#555', 12, 140, 9, 1.2); splashAt(s.x, s.y, true); SFX.boom(2, s.foe ? 0.2 : 0); shake(s.foe ? 6 : 11);
        G.fx.push({ x: s.x, y: s.y, blast: s.r, t: 0.45 });
        if (s.foe) { if (Math.hypot(me.x - s.x, me.y - s.y) < s.r + me.len * 0.25) hurtMe(s.dmg, s.x, s.y); }
        else for (const f of G.foes) if (Math.hypot(f.x - s.x, f.y - s.y) < s.r + f.len * 0.3) hurtFoe(f, s.dmg, 'shell');
      }
    }
    G.shells = G.shells.filter((s) => !s.dead);
  }
  function crewJumpOff(s) {
    for (const c of crewOf(s)) {
      const p = spotWorld(s, c.spot), a = Math.atan2(p.y - s.y, p.x - s.x) + rnd(-0.6, 0.6);
      G.fx.push({ jumper: true, sheet: c.sheet, i: c.i, filter: c.filter, x: p.x, y: p.y, vx: Math.cos(a) * rnd(60, 130), vy: Math.sin(a) * rnd(60, 130), t: rnd(0.5, 0.9), size: c.size, rot: s.a });
    }
  }
  function sinkFoe(f) {
    f.dead = true; G.kills++; crewCheer(G.me);
    G.fx.push({ x: f.x, y: f.y, sinkShip: { ...f, hit: 0 }, t: 2.0 });
    if (!f.shark && f.k !== 'mine') crewJumpOff(f);
    burst(f.x, f.y, f.exploded ? '#ffb347' : f.shark ? '#cfe8ff' : '#8a5a30', f.exploded ? 30 : 22, 240, 6);
    if (f.exploded || f.k === 'mine') { SFX.boom(2); shake(8); } else { SFX.sink(); hitStop = Math.max(hitStop, 0.05); }
    if (f.crew && f.crew[0] === 'crew_cat') SFX.meow();
    if (f.boss) { slowMo = 1.2; shake(24); G.msg = { text: `${f.name} 격침!`, t: 2.4, boss: true }; }
    const s = st(), bonus = (1 + Math.floor(G.combo / 5) * 0.1) * (1 + s.goldBonus) * G.lootK;
    for (let i = 0; i < Math.ceil(f.gold * bonus / 5); i++) G.drops.push({ x: f.x + rnd(-40, 40) * (1 + f.len / 200), y: f.y + rnd(-40, 40) * (1 + f.len / 200), kind: 'coin', v: 5, t: 22 });
    const pl = Math.round(f.plank * (1 + s.plankBonus) * G.lootK);
    for (let i = 0; i < Math.ceil(pl / 3); i++) G.drops.push({ x: f.x + rnd(-50, 50), y: f.y + rnd(-50, 50), kind: 'plank', v: 3, t: 22, r: Math.random() * 7 });
    if (s.plunder) { G.me.hp = Math.min(G.me.max, G.me.hp + G.me.max * s.plunder); }
    // 납치된 쥐: 고양이 배 · 라이벌 배에서 1~2, 보스 4
    const n = f.boss && f.boss !== 'shark' ? 4 : !f.shark && f.k !== 'mine' && f.k !== 'speeder' ? (Math.random() < 0.7 ? 1 : 2) : 0;
    for (let i = 0; i < n; i++) G.swimmers.push({ x: f.x + rnd(-40, 40), y: f.y + rnd(-40, 40), t: 25, bob: Math.random() * 7 });
    if (f === G.boss) G.boss = null;
  }
  function collect(d) { if (d.kind === 'coin') G.gold += d.v; else G.plank += d.v; }
  function pickups(dt) {
    const me = G.me, s = st(), R = s.pickup;
    const pull = (o, r) => { const d = Math.hypot(o.x - me.x, o.y - me.y); if (d < r && !G.over) { o.x += (me.x - o.x) * dt * 4; o.y += (me.y - o.y) * dt * 4; } return d; };
    for (const c of G.drops) { c.t -= dt; if (pull(c, R) < 32 && !G.over) { c.got = true; collect(c); c.kind === 'coin' ? SFX.coin() : SFX.wood(); } }
    G.drops = G.drops.filter((c) => !c.got && c.t > 0);
    for (const w of G.swimmers) {
      w.t -= dt; w.bob += dt;
      if (pull(w, R * 0.75) < 34 && !G.over) { w.got = true; me.crew++; G.rescued++; me.hp = Math.min(me.max, me.hp + 3 + s.crewHeal); me.jump = 0.4; SFX.squeak(); txt(me.x, me.y - 30, `선원 +1 (${me.crew})`, '#7dff8a'); }
    }
    G.swimmers = G.swimmers.filter((w) => !w.got && w.t > 0);
    for (const c of G.chests) { c.bob += dt; if (Math.hypot(c.x - me.x, c.y - me.y) < 46 && !G.over) { c.got = true; G.gold += c.gold; G.plank += c.plank; SFX.chest(); burst(c.x, c.y, '#ffd84a', 24, 200, 4); txt(c.x, c.y - 20, `보물! +${c.gold}`, '#ffd84a', true); } }
    G.chests = G.chests.filter((c) => !c.got);
  }

  // ── 선원 리깅
  // 배마다 올라탈 선원 목록 [{ sheet, i, spot, size, filter }]
  function crewOf(s) {
    const size = 22 * Math.max(0.85, Math.min(1.5, (s.base || s.len) / 100));
    const out = [];
    if (s.isMe) {
      // 배 단계(시대)에 맞는 선원 · 선장 옷차림 (선장 = crew_capt 칸 = 단계, 없으면 crew_rat 0 · 1)
      const era = eraSheet(s.tier || 0);
      out.push({ ...capOf(s.tier || 0, s.fireT > 0), spot: 0, size: size * 1.1 });
      const n = Math.min(MAX_CREW_SHOWN, s.crew);
      for (let k = 0; k < n; k++) out.push({ sheet: era, i: 2 + (k % 4), spot: 1 + k, size });
      return out;
    }
    if (!s.crew) return out;
    const c = s.crew;
    if (c.length === 2) c[1].forEach((i, k) => out.push({ sheet: c[0], i, spot: k === 0 ? 0 : k, size }));
    else { out.push({ sheet: c[0], i: c[1][0], spot: 0, size: size * 1.35 }); c[3].forEach((i, k) => out.push({ sheet: c[2], i, spot: 1 + k, size })); }
    if (!SP.crew_rival) for (const o of out) if (o.sheet === 'crew_rival') { o.sheet = 'crew_rat'; o.filter = 'grayscale(.7) brightness(.8)'; } // 라이벌 그림이 없을 때만 회색 쥐로
    return out;
  }
  const ERA_SHEET = ['crew_rat_t0', 'crew_rat', 'crew_rat', 'crew_rat_t3', 'crew_rat_t4', 'crew_rat_t5'];
  const eraSheet = (t) => (SP[ERA_SHEET[t]] ? ERA_SHEET[t] : 'crew_rat');
  const capOf = (t, firing) => (SP.crew_capt && SP.crew_capt[t] ? { sheet: 'crew_capt', i: t } : { sheet: 'crew_rat', i: firing ? 1 : 0 });
  function spotWorld(s, i) { const [ax, ay] = CREW_SPOTS[i] || [0, 0], c = Math.cos(s.a), sn = Math.sin(s.a); return { x: s.x + (ax * c - ay * sn) * s.len, y: s.y + (ax * sn + ay * c) * s.len }; }

  // ── 선원 = 갑판 위 작은 유닛: 자기 자리(home)가 있고, 뱃전 일제 사격 때 그쪽 난간 대포로 뛰어가 장전 → 잠시 뒤 제자리로
  // 위치(pos)는 배 좌표계 len 비율. 선장은 제자리에서 쏘는 쪽을 보며 칼을 들어 호령
  const RAIL = 0.068, WALK = 0.45;
  const lerpA = (a, b, k) => a + wrapA(b - a) * Math.min(1, k);
  function mates(s) {
    const want = crewOf(s);
    if (!s.mates) s.mates = [];
    while (s.mates.length > want.length) s.mates.pop();
    want.forEach((c, k) => {
      const m = s.mates[k];
      if (m) { m.sheet = c.sheet; m.i = c.i; m.size = c.size; m.filter = c.filter; return; }
      const home = CREW_SPOTS[c.spot] || [0, 0];
      // 새로 건진 선원은 난간에서 뛰어올라 자리로 걸어감
      const from = k && G && G.t > 1 ? [home[0], Math.sign(home[1] || 1) * RAIL] : [...home];
      s.mates.push({ ...c, k, home, pos: from, face: 0, act: 'idle', at: 0, dur: 0, t: Math.random() * 10, job: from[1] !== home[1] ? { to: home, face: 0, act: 'idle', dur: 0 } : null, fl: 0, ch: k ? 0.8 : 0 });
    });
    return s.mates;
  }
  function crewTick(s, dt) {
    if (!s.mates) return;
    for (const m of s.mates) {
      m.t += dt; m.at += dt; m.fl = Math.max(0, m.fl - dt); m.ch = Math.max(0, m.ch - dt);
      const j = m.job;
      if (j) {
        const dx = j.to[0] - m.pos[0], dy = j.to[1] - m.pos[1], d = Math.hypot(dx, dy);
        if (!j.arrived && d > 0.004) {
          const step = Math.min(d, WALK * dt);
          m.pos[0] += dx / d * step; m.pos[1] += dy / d * step;
          if (m.act !== 'walk') { m.act = 'walk'; m.at = 0; }
          m.face = lerpA(m.face, Math.atan2(dy, dx), dt * 12);
        } else {
          if (!j.arrived) { j.arrived = true; m.act = j.act; m.at = 0; m.dur = j.dur; }
          m.face = lerpA(m.face, j.face, dt * 8);
          if (m.at > j.dur + (j.wait || 0)) m.job = j.then === 'home' ? { to: m.home, face: 0, act: 'idle', dur: 0 } : null;
        }
      } else {
        m.face = lerpA(m.face, 0, dt * 3);
        if (m.act !== 'idle' && m.at > m.dur) { m.act = 'idle'; m.at = 0; }
      }
    }
  }
  // 일제 사격: 선장 호령 + 선원들이 그쪽 난간의 대포 자리로 뛰어가 장전 동작
  function crewFire(s, side, guns, reload) {
    const ms = mates(s);
    if (!ms.length) return;
    const cap = ms[0];
    cap.job = { to: [...cap.pos], face: side * 0.3, act: 'order', dur: 0.7, then: null };
    const hands = ms.slice(1).filter((m) => !m.job || m.job.then === 'home' || m.act === 'idle')
      .sort((a, b) => Math.abs(a.pos[1] - side * RAIL) - Math.abs(b.pos[1] - side * RAIL)).slice(0, Math.min(3, guns));
    hands.forEach((m, i) => {
      const along = (hands.length === 1 ? 0 : (i / (hands.length - 1) - 0.5)) * 0.42;
      m.job = { to: [along, side * RAIL], face: side * 0.7, act: 'load', dur: Math.max(0.6, reload), wait: 1.2, then: 'home' };
    });
  }
  const crewHit = (s) => { for (const m of s.mates || []) m.fl = 0.35; };
  const crewCheer = (s) => { for (const m of s.mates || []) if (m.act === 'idle' && !m.job) m.ch = 0.9; };

  // ── 파츠 리깅 캐릭터 (art/rig/<이름>/rig.json → window.RIGS): 통이미지와 똑같이 조립된 파츠를 관절(px, py) 기준으로 돌려 움직임
  const RIGS = window.RIGS || {};
  // 리깅 이름 = <시트>_<칸> (rig_map.py 결과 폴더). 선장(crew_rat 0 · 1)은 시대와 상관없이 같은 리깅
  const rigFor = (sheet, i) => (/^crew_rat/.test(sheet) && i < 2 ? RIGS.crew_rat_0 || RIGS.captain : RIGS[sheet + '_' + i]);
  const PROP_OF = { captain: 'sword' };
  const PARENT = { tool: 'arm_f', eye: 'head' };
  for (const r of Object.values(RIGS)) for (const p of [...r.parts, ...(r.props || [])]) {
    const im = new Image(); waiting++;
    im.onload = im.onerror = () => { if (--waiting === 0) setReady(); };
    im.src = p.src; p.im = im;
  }
  const rigOk = (r) => r && r.parts.every((p) => p.im.complete && p.im.naturalWidth);
  // 자세 → 파츠별 { rot, sx, sy, dx, dy }. P = { t, act, at, dur, fl, ch }
  const ease = (q) => (q < 0 ? 0 : q > 1 ? 1 : q * q * (3 - 2 * q));
  function pose(P) {
    const s = Math.sin, t = P.t, Z = () => ({ rot: 0, sx: 1, sy: 1, dx: 0, dy: 0 });
    const A = { torso: Z(), head: Z(), tail: Z(), arm_f: Z(), arm_b: Z(), tool: Z(), eye: Z(), prop: null };
    // 깜빡임: 3.4초마다 0.14초 (사람마다 t 가 달라 제각각 깜빡임)
    const bl = (t % 3.4) / 0.14; if (bl < 1) A.eye.sy = 0.15 + 0.85 * Math.abs(1 - bl * 2);
    // 숨쉬기 · 꼬리 흔들기 · 고개 까딱
    A.torso.sy = 1 + 0.03 * s(t * 4.2); A.head.rot = 0.05 * s(t * 2.3); A.head.dy = -2 * s(t * 4.2);
    A.tail.rot = 0.28 * s(t * 3.1); A.arm_f.rot = 0.08 * s(t * 2.7 + 1); A.arm_b.rot = 0.08 * s(t * 2.7);
    if (P.act === 'walk') {
      const w = t * 13; A.arm_f.rot += 0.55 * s(w); A.arm_b.rot -= 0.55 * s(w); A.torso.rot = 0.07 * s(w); A.tail.rot += 0.35 * s(w * 0.5);
      A.head.dy -= 4 * Math.abs(s(w));
    } else if (P.act === 'order') { // 선장 호령: 칼을 쏘는 쪽으로 쳐들고 고개를 내밂
      const e = P.at < 0.15 ? ease(P.at / 0.15) : 1 - ease((P.at - 0.35) / 0.35);
      A.arm_f.rot -= 1.25 * e; A.head.rot -= 0.07 * e; A.torso.rot = -0.05 * e; A.prop = PROP_OF.captain;
    } else if (P.act === 'hammer') { // 조선공 망치질: 연장을 높이 들었다 쾅 내리침, 칠 때마다 몸 · 고개가 같이 숙여짐
      const c = s(P.at * 11), hit = Math.max(0, -c);
      A.arm_f.rot += -0.9 + 1.0 * c; A.torso.rot = 0.05 * c; A.head.rot += 0.1 * hit; A.head.dy += 3 * hit; A.tail.rot += 0.2 * c;
    } else if (P.act === 'load') { // 장전: 꽂을대를 밀고 당김 (장전 시간 동안 반복), 몸이 앞뒤로 쏠림
      const on = P.at < P.dur, c = on ? s(P.at * 9) : 0;
      A.arm_f.rot += -0.5 + 0.45 * c; A.arm_b.rot += -0.4 + 0.45 * c; A.torso.rot = 0.06 * c; A.tool.dx = 14 * c; A.head.rot += 0.08 * c;
      if (!on) { A.arm_f.rot = -0.15; A.arm_b.rot = -0.1; }
    }
    if (P.ch > 0) { const e = s((1 - P.ch / 0.9) * Math.PI); A.arm_f.rot -= 1.5 * e; A.arm_b.rot -= 1.3 * e; A.head.dy -= 10 * e; A.tail.rot += 0.5 * e; } // 만세
    if (P.fl > 0) { const e = P.fl / 0.35; A.torso.sx = 1 + 0.1 * e; A.torso.sy *= 1 - 0.12 * e; A.tail.rot += 0.9 * e; A.head.rot += 0.25 * e; A.arm_f.rot += 0.5 * e; A.arm_b.rot += 0.5 * e; } // 움찔
    return A;
  }
  function drawRig(r, size, P) {
    const k = size * 1.12 / Math.max(r.w, r.h), A = pose(P), byName = {};
    ctx.save(); ctx.scale(k, k); ctx.translate(-r.w / 2, -r.h / 2);
    for (const p of r.parts) byName[p.name] = p;
    const xf = (p, a) => { ctx.translate(p.x + p.px + a.dx, p.y + p.py + a.dy); ctx.rotate(a.rot); ctx.scale(a.sx, a.sy); ctx.translate(-p.px, -p.py); };
    for (const p of r.parts) {
      const a = A[p.name] || A.torso;
      ctx.save();
      const par = PARENT[p.name] && byName[PARENT[p.name]];
      if (par) { if (par.name === 'head') ctx.translate(0, (A.torso.sy - 1) * -18); xf(par, A[par.name]); ctx.translate(p.x - par.x, p.y - par.y); ctx.translate(p.px + a.dx, p.py + a.dy); ctx.rotate(a.rot); ctx.scale(a.sx, a.sy); ctx.translate(-p.px, -p.py); }
      else if (p.name === 'head') { const tz = A.torso; ctx.translate(0, (tz.sy - 1) * -18); xf(p, a); }
      else xf(p, a);
      ctx.drawImage(p.im, 0, 0, p.w, p.h);
      if (p.name === 'arm_f' && A.prop) {
        const pr = (r.props || []).find((q) => q.name === A.prop);
        if (pr && pr.im.complete) { ctx.translate(p.tx, p.ty); ctx.rotate(pr.rot || 0); ctx.scale(pr.scale, pr.scale); ctx.drawImage(pr.im, -pr.gx, -pr.gy, pr.w, pr.h); }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // 배 좌표계(뱃머리 = +x) 안에서 선원 유닛을 그림. rot = 지금 배가 돌아간 각도
  // 데포르메 탑뷰지만 캐릭터는 쿼터뷰 느낌: 자리는 배와 같이 돌지만 그림은 화면 기준으로 세워 두고, 보는 방향(왼/오)에 따라 좌우만 뒤집음
  function drawCrew(s, rot = 0) {
    const ms = mates(s), sn = Math.sin(rot), cs = Math.cos(rot);
    const depth = (m) => m.pos[0] * sn + m.pos[1] * cs; // 화면 아래쪽일수록 앞
    const order = [...ms].sort((a, b) => depth(a) - depth(b));
    for (const m of order) {
      const hop = m.ch > 0 ? Math.sin((1 - m.ch / 0.9) * Math.PI) * 0.15 : 0;
      const look = Math.cos(rot + m.face) < -0.15 ? -1 : 1; // 화면에서 왼쪽을 보면 뒤집음
      m.flip = m.flip === undefined ? look : m.flip + (look - m.flip) * 0.35; // 휙 뒤집히지 않고 살짝 납작해졌다 돌아섬
      ctx.save(); ctx.translate(m.pos[0] * s.len, m.pos[1] * s.len); ctx.rotate(-rot + Math.sin(m.t * 1.7) * 0.04);
      ctx.scale((1 + hop) * (Math.abs(m.flip) < 0.15 ? 0.15 * Math.sign(m.flip || 1) : m.flip), 1 + hop);
      if (m.filter) ctx.filter = m.filter;
      drawCrewSprite(m.sheet, m.i, m.size, m);
      ctx.restore();
    }
  }
  function drawCrewSprite(sheet, i, size, P) {
    const rig = rigFor(sheet, i);
    if (rigOk(rig)) { drawRig(rig, size, P || { t: G ? G.t : 0, act: 'idle', at: 0, dur: 0, fl: 0, ch: 0 }); return; }
    const f = fr(sheet, i);
    if (f) { const k = size / Math.max(f.w, f.h); ctx.drawImage(f.im, -f.w * k / 2, -f.h * k / 2, f.w * k, f.h * k); return; }
    // 그림 없을 때: 위에서 본 머리 + 귀
    const cat = sheet === 'crew_cat' || (sheet === 'crew_boss' && i % 2 === 0), r = size * 0.32;
    ctx.fillStyle = cat ? '#d9d4c8' : '#9a7a5a';
    if (cat) { ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 1.3); ctx.lineTo(-r * 0.6, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.4); ctx.moveTo(r * 0.2, r * 1.3); ctx.lineTo(-r * 0.6, r * 0.5); ctx.lineTo(r * 0.5, r * 0.4); ctx.fill(); }
    else { ctx.fillStyle = '#e8a8a8'; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.95, r * 0.55, 0, 7); ctx.arc(-r * 0.2, r * 0.95, r * 0.55, 0, 7); ctx.fill(); ctx.fillStyle = '#9a7a5a'; }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = sheet === 'crew_rat' && i < 2 ? '#2a2a2e' : cat ? '#f2f2f2' : '#b8433a'; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.7, 0, 7); ctx.fill();
  }

  // ── 그리기
  function hullPath(len, wid) { ctx.beginPath(); ctx.moveTo(len / 2, 0); ctx.bezierCurveTo(len * 0.35, -wid * 1.05, -len * 0.25, -wid, -len / 2, -wid * 0.7); ctx.lineTo(-len / 2, wid * 0.7); ctx.bezierCurveTo(-len * 0.25, wid, len * 0.35, wid * 1.05, len / 2, 0); ctx.closePath(); }
  // 배 몸체 (배 좌표계, 뱃머리 = +x). 그림이 없으면 플랫 벡터 배 (쥐 = 쥐 귀 선수상 · 꼬리 키, 고양이 = 고양이 귀 뱃머리)
  function drawHull(spr, len, look) {
    const f = fr(spr);
    if (f) { const k = len / f.w; ctx.drawImage(f.im, -f.w * k / 2, -f.h * k / 2, f.w * k, f.h * k); return; }
    const wid = len * 0.22;
    ctx.fillStyle = look.rat ? '#8a6040' : look.col || '#4a4a55'; hullPath(len, wid); ctx.fill();
    ctx.fillStyle = look.rat ? '#c9a070' : '#8a8a90'; hullPath(len * 0.84, wid * 0.72); ctx.fill();
    if (look.rat) {
      ctx.fillStyle = '#e8a8a8'; ctx.beginPath(); ctx.arc(len * 0.43, -wid * 0.55, wid * 0.42, 0, 7); ctx.arc(len * 0.43, wid * 0.55, wid * 0.42, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e8a8a8'; ctx.lineWidth = Math.max(2, len * 0.025); ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.bezierCurveTo(-len * 0.62, -wid * 0.2, -len * 0.6, wid * 0.8, -len * 0.7, wid * 0.4); ctx.stroke();
      ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.ellipse(len * 0.06, 0, len * 0.06, wid * 1.2, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = look.col || '#4a4a55'; ctx.beginPath(); ctx.moveTo(len * 0.36, -wid * 0.5); ctx.lineTo(len * 0.5, -wid * 0.95); ctx.lineTo(len * 0.44, -wid * 0.2); ctx.moveTo(len * 0.36, wid * 0.5); ctx.lineTo(len * 0.5, wid * 0.95); ctx.lineTo(len * 0.44, wid * 0.2); ctx.fill();
      ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.ellipse(len * 0.04, 0, len * 0.06, wid * 1.15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = look.col || '#4a4a55'; ctx.beginPath(); ctx.arc(len * 0.05, 0, wid * 0.3, 0, 7); ctx.fill();
    }
  }
  function drawShip(s, alpha = 1, sinkQ = 0) {
    const x = s.x - cam.x, y = s.y - cam.y, len = s.len;
    if (x < -len || y < -len || x > VW + len || y > VH + len) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(s.a + Math.sin((s.bob || G.t) * 1.7) * 0.025 + sinkQ * 0.5);
    if (s.hit > 0) ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    ctx.scale(1 - sinkQ * 0.35, 1 - sinkQ * 0.35);
    ctx.fillStyle = 'rgba(0,20,40,.28)'; ctx.save(); ctx.translate(4, 7); hullPath(len, len * 0.22); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(230,245,255,.3)'; ctx.lineWidth = 3; hullPath(len * 1.04, len * 0.24); ctx.stroke();
    drawHull(s.spr, len, { rat: s.isMe || s.k === 'rival' || s.boss === 'rival' || s.boss === 'king', col: s.col });
    if (!sinkQ) drawCrew(s, s.a + Math.sin((s.bob || G.t) * 1.7) * 0.025);
    if (s.hit > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${s.hit * 1.2})`; hullPath(len, len * 0.22); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    if (s.slow > 0 && !sinkQ) { ctx.strokeStyle = 'rgba(220,225,235,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, len * 0.45, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    if (!s.isMe && !sinkQ && s.hp < s.max && !s.boss) hpBar(x, y - len * 0.42 - 12, Math.min(120, len), s.hp / s.max, s.burn > 0 ? '#ff8a2a' : '#e8463c');
  }
  function hpBar(x, y, w, q, col) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6); ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * Math.max(0, q), 4); }
  function drawShark(f, alpha = 1) {
    const x = f.x - cam.x, y = f.y - cam.y, under = f.boss ? f.phase !== 'surface' : f.dive;
    if (x < -f.len || y < -f.len || x > VW + f.len || y > VH + f.len) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(f.a);
    if (under) {
      // 물속 그림자 + 지느러미만
      ctx.fillStyle = 'rgba(10,40,70,.35)'; ctx.beginPath(); ctx.ellipse(-f.len * 0.1, 0, f.len * 0.42, f.len * 0.14, 0, 0, 7); ctx.fill();
      const fin = fr('shark_fin', f.fin || 0), fs = f.boss ? 70 : 34;
      if (fin) { const k = fs / fin.w; ctx.drawImage(fin.im, -fin.w * k / 2, -fin.h * k / 2, fin.w * k, fin.h * k); }
      else { ctx.strokeStyle = 'rgba(235,248,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-fs * 0.1, 0, fs * 0.45, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); ctx.fillStyle = f.boss ? '#3a5068' : '#5a7088'; ctx.beginPath(); ctx.moveTo(fs * 0.4, 0); ctx.lineTo(-fs * 0.3, -fs * 0.18); ctx.lineTo(-fs * 0.15, 0); ctx.lineTo(-fs * 0.3, fs * 0.18); ctx.closePath(); ctx.fill(); }
    } else {
      const s = fr(f.spr);
      if (s) { const k = f.len / s.w; ctx.drawImage(s.im, -s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k); }
      else { ctx.fillStyle = '#6a8098'; ctx.beginPath(); ctx.ellipse(0, 0, f.len * 0.5, f.len * 0.17, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.ellipse(f.len * 0.2, 0, f.len * 0.2, f.len * 0.1, 0, 0, 7); ctx.fill(); }
      if (f.hit > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${f.hit})`; ctx.beginPath(); ctx.ellipse(0, 0, f.len * 0.5, f.len * 0.17, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.restore();
    if (f.phase === 'aim') { ctx.strokeStyle = `rgba(255,60,40,${0.5 + 0.4 * Math.sin(G.t * 20)})`; ctx.lineWidth = f.len * 0.25; ctx.setLineDash([16, 12]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(f.aimA) * f.speed * 3.4 * 1.1, y + Math.sin(f.aimA) * f.speed * 3.4 * 1.1); ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); }
    if (!f.boss && f.hp < f.max) hpBar(x, y - 30, 40, f.hp / f.max, '#e8463c');
  }
  function drawMine(f) {
    const x = f.x - cam.x, y = f.y - cam.y, s = 1 + Math.sin(f.bob * 3) * 0.05, im = fr('items', 2);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(230,245,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, f.len * 0.75, 0, 7); ctx.stroke();
    if (im) { const k = f.len * 1.3 / Math.max(im.w, im.h); ctx.drawImage(im.im, -im.w * k / 2, -im.h * k / 2, im.w * k, im.h * k); }
    else { ctx.fillStyle = '#6a4626'; ctx.beginPath(); ctx.arc(0, 0, f.len * 0.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-f.len * 0.5, 0); ctx.lineTo(f.len * 0.5, 0); ctx.stroke(); }
    ctx.fillStyle = Math.sin(G.t * 8 + f.bob) > 0 ? '#e8463c' : '#7a2a20'; ctx.beginPath(); ctx.arc(0, -f.len * 0.5, 3.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  function itemPic(i, x, y, size, fallback) {
    const f = fr('items', i);
    if (f) { const k = size / Math.max(f.w, f.h); ctx.drawImage(f.im, x - f.w * k / 2, y - f.h * k / 2, f.w * k, f.h * k); }
    else fallback();
  }
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // 바다마다 섬 모양(islands 칸). 바다 자체는 그림 타일 없이 플랫하게 그림 (이음매 없는 한 장)
  const SEA_ISLAND = [0, 1, 0, 2, 1, 3, 1, 3];
  function drawSea() {
    // 플랫 바다 (그림 타일 없이 이어진 한 장): 바다색 한 가지 + 월드 좌표에 고정된 큰 평면 얼룩(깊은 곳 · 얕은 곳) + 평면 물결
    const [c0, c1] = G.S.col;
    ctx.fillStyle = c0; ctx.fillRect(-40, -40, VW + 80, VH + 80);
    const B = 520; // 얼룩 칸 크기 (월드 px)
    for (let gy = Math.floor((cam.y - B) / B); gy <= Math.floor((cam.y + VH + B) / B); gy++) {
      for (let gx = Math.floor((cam.x - B) / B); gx <= Math.floor((cam.x + VW + B) / B); gx++) {
        const h = hash(gx * 3.1, gy * 7.7), h2 = hash(gy * 1.9, gx * 5.3);
        if (h < 0.35) continue;
        const x = gx * B + h2 * B - cam.x, y = gy * B + h * B - cam.y, rx = B * (0.45 + h * 0.5), ry = B * (0.3 + h2 * 0.35);
        ctx.fillStyle = h > 0.72 ? 'rgba(255,255,255,0.05)' : c1; ctx.globalAlpha = h > 0.72 ? 1 : 0.3;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, h * 3, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    for (const d of G.deco) { // 바다 장식: 바위 · 부표 · 나무 조각 … (부딪히지 않음, 살짝 흔들림)
      const x = d.x - cam.x, y = d.y - cam.y, f = fr('sea_deco', d.i);
      if (!f || x < -80 || y < -80 || x > VW + 80 || y > VH + 80) continue;
      const k = d.s / Math.max(f.w, f.h); ctx.save(); ctx.translate(x, y + Math.sin(G.t * 1.3 + d.x) * 2); ctx.rotate(d.r + Math.sin(G.t + d.y) * 0.03);
      ctx.drawImage(f.im, -f.w * k / 2, -f.h * k / 2, f.w * k, f.h * k); ctx.restore();
    }
    // 평면 물결: 초승달 모양 흰 조각 (선 없이 채움), 천천히 오르내리며 나타났다 사라짐
    const step = 90, ox = -((cam.x % step) + step) % step, oy = -((cam.y % step) + step) % step;
    ctx.fillStyle = 'rgba(235,245,250,0.22)';
    for (let gy = oy - step; gy < VH + step; gy += step) for (let gx = ox - step; gx < VW + step; gx += step) {
      const cx = Math.round((gx + cam.x) / step), cy = Math.round((gy + cam.y) / step), h = hash(cx, cy);
      if (h < 0.45) continue;
      const ph = G.t * 0.9 + h * 6, a = Math.max(0, Math.sin(ph));
      if (a < 0.05) continue;
      const x = gx + h * 50, y = gy + hash(cy, cx) * 50 + Math.sin(ph) * 3, w = (12 + h * 18) * (0.6 + a * 0.4);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 9, x + w, y); ctx.quadraticCurveTo(x, y - 3, x - w, y); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.strokeRect(-cam.x, -cam.y, WORLD.w, WORLD.h); ctx.setLineDash([]);
    if (G.S.trait === 'whirl') {
      const x = WORLD.w / 2 - cam.x, y = WORLD.h / 2 - cam.y;
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(210,240,255,${0.18 + i * 0.04})`; ctx.lineWidth = 4; ctx.beginPath(); for (let k = 0; k < 60; k++) { const a = -G.t * 1.5 + i * 1.256 + k * 0.12, r = 900 - k * 14; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(5,25,45,.55)'; ctx.beginPath(); ctx.arc(x, y, 150, 0, 7); ctx.fill();
    }
    for (const o of G.islands) {
      const x = o.x - cam.x, y = o.y - cam.y; if (x < -o.r - 80 || y < -o.r - 80 || x > VW + o.r + 80 || y > VH + o.r + 80) continue;
      const isl = fr('islands', SEA_ISLAND[G.sea] ?? 0);
      if (isl) { // 섬 그림 (얕은 물 고리 포함) + 물결 고리
        const k = o.r * 2.7 / Math.max(isl.w, isl.h); ctx.save(); ctx.translate(x, y); ctx.rotate(o.seed); ctx.drawImage(isl.im, -isl.w * k / 2, -isl.h * k / 2, isl.w * k, isl.h * k); ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -G.t * 20; ctx.beginPath(); ctx.arc(x, y, o.r * 1.32 + Math.sin(G.t * 2 + o.seed) * 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        continue;
      }
      ctx.fillStyle = 'rgba(140,215,215,.35)'; ctx.beginPath(); ctx.arc(x, y, o.r + 40, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -G.t * 20; ctx.beginPath(); ctx.arc(x, y, o.r + 8 + Math.sin(G.t * 2 + o.seed) * 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e6d3a0'; ctx.beginPath(); ctx.arc(x, y, o.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#7fa860'; ctx.beginPath(); ctx.arc(x + o.r * 0.08, y - o.r * 0.08, o.r * 0.66, 0, 7); ctx.fill();
      ctx.fillStyle = '#6a9852'; ctx.beginPath(); ctx.arc(x + o.r * 0.15, y - o.r * 0.05, o.r * 0.42, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) { const a = o.seed + i * 1.6, px = x + Math.cos(a) * o.r * 0.4, py = y + Math.sin(a) * o.r * 0.4, sw = Math.sin(G.t * 1.5 + i) * 0.1; for (let l = 0; l < 5; l++) { const la = l * 1.26 + o.seed + sw; ctx.fillStyle = l % 2 ? '#4f8040' : '#5a8e48'; ctx.beginPath(); ctx.ellipse(px + Math.cos(la) * 10, py + Math.sin(la) * 10, 13, 4.5, la, 0, 7); ctx.fill(); } }
    }
  }
  function draw() {
    const me = G.me;
    ctx.setTransform(K * DPR, 0, 0, K * DPR, 0, 0);
    const lead = ZOOM > 1 ? 0 : 130; cam.x += (me.x + Math.cos(me.a) * lead - VW / 2 - cam.x) * 0.08; cam.y += (me.y + Math.sin(me.a) * lead - VH / 2 - cam.y) * 0.08;
    ctx.save();
    ctx.translate(kick.x + (shakeAmt > 0.3 ? (Math.random() - 0.5) * shakeAmt : 0), kick.y + (shakeAmt > 0.3 ? (Math.random() - 0.5) * shakeAmt : 0));
    drawSea();
    for (const p of G.parts) if (p.col === 'wake') { ctx.fillStyle = `rgba(235,248,255,${p.t / p.max * 0.4})`; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.size * (2.4 - p.t / p.max), 0, 7); ctx.fill(); }
    for (const f of G.fx) if (f.splash) { const x = f.x - cam.x, y = f.y - cam.y, q = 1 - f.t / (f.big ? 0.8 : 0.55); ctx.strokeStyle = `rgba(235,248,255,${1 - q})`; ctx.lineWidth = f.big ? 5 : 3; ctx.beginPath(); ctx.arc(x, y, (f.big ? 14 : 6) + q * (f.big ? 60 : 24), 0, 7); ctx.stroke(); }
    for (const s of [...G.shells, ...G.bolts]) { const x = s.x - cam.x, y = s.y - cam.y, dur = s.dur || 1.3, q = 1 - s.t / dur, foe = s.foe !== false; ctx.strokeStyle = foe ? `rgba(255,70,50,${0.5 + 0.4 * Math.sin(G.t * 20)})` : 'rgba(255,220,100,.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(x, y, s.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = foe ? 'rgba(255,60,40,.14)' : 'rgba(255,220,100,.1)'; ctx.beginPath(); ctx.arc(x, y, s.r * q, 0, 7); ctx.fill(); }
    for (const c of G.drops) {
      const x = c.x - cam.x, y = c.y - cam.y + Math.sin(G.t * 5 + c.x) * 2;
      if (c.kind === 'coin') itemPic(0, x, y, 16, () => { ctx.fillStyle = '#e8c860'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); });
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(c.r + Math.sin(G.t * 2 + c.x) * 0.2); ctx.fillStyle = '#9a6a3c'; ctx.fillRect(-11, -4, 22, 8); ctx.fillStyle = '#7a5030'; ctx.fillRect(-11, -1, 22, 2); ctx.restore(); }
    }
    for (const c of G.chests) { const x = c.x - cam.x, y = c.y - cam.y + Math.sin(c.bob * 2) * 3; ctx.strokeStyle = 'rgba(255,230,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 30 + Math.sin(G.t * 4) * 4, 0, 7); ctx.stroke(); itemPic(1, x, y, 40, () => { ctx.fillStyle = '#7a4a1a'; ctx.fillRect(x - 16, y - 12, 32, 24); ctx.fillStyle = '#e8c860'; ctx.fillRect(x - 16, y - 2, 32, 3); }); }
    for (const w of G.swimmers) { const x = w.x - cam.x, y = w.y - cam.y + Math.sin(w.bob * 3) * 2; ctx.strokeStyle = 'rgba(235,248,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke(); itemPic(3, x, y, 34, () => { ctx.fillStyle = '#d8584a'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#9a7a5a'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); }); if (Math.sin(G.t * 6 + w.bob) > 0.6) { ctx.fillStyle = '#fff'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('찍!', x + 18, y - 14); } }
    for (const t of G.torps) { const x = t.x - cam.x, y = t.y - cam.y; ctx.save(); ctx.translate(x, y); ctx.rotate(t.a); ctx.fillStyle = '#3a4048'; ctx.fillRect(-10, -2.5, 20, 5); ctx.fillStyle = '#c8402c'; ctx.fillRect(8, -2.5, 4, 5); ctx.restore(); }
    for (const f of G.fx) if (f.sinkShip) { const q = 1 - f.t / 2.0, s = f.sinkShip; if (s.shark) drawShark(s, 1 - q); else if (s.k !== 'mine') drawShip(s, 1 - q * 0.9, q); }
    for (const f of G.foes) if (f.shark) drawShark(f);
    for (const f of G.foes) if (!f.shark) f.k === 'mine' ? drawMine(f) : drawShip(f);
    if (G.over !== 'lose' && G.over !== 'done' || G.over === 'win') drawShip(me);
    if (G.over === 'lose' || (G.over === 'done' && me.hp <= 0)) { const q = Math.min(1, 1 - G.overT / 2.4); drawShip(me, 1 - q * 0.9, q); }
    for (const f of G.fx) if (f.jumper) { ctx.save(); ctx.translate(f.x - cam.x, f.y - cam.y); ctx.rotate(f.rot); const s = 1 + Math.sin(Math.min(1, f.t / 0.9) * Math.PI) * 0.5; ctx.scale(s, s); if (f.filter) ctx.filter = f.filter; drawCrewSprite(f.sheet, f.i, f.size); ctx.restore(); }
    if (st().planes) for (let i = 0; i < st().planes; i++) { const p = planePos(i), x = p.x - cam.x, y = p.y - cam.y; ctx.fillStyle = 'rgba(0,20,40,.25)'; ctx.beginPath(); ctx.arc(x + 8, y + 14, 6, 0, 7); ctx.fill(); ctx.save(); ctx.translate(x, y); ctx.rotate(p.a); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-3, -11, 6, 22); ctx.fillStyle = '#c8b890'; ctx.fillRect(-9, -2.5, 18, 5); ctx.fillStyle = '#c8402c'; ctx.beginPath(); ctx.arc(0, -6, 2, 0, 7); ctx.arc(0, 6, 2, 0, 7); ctx.fill(); ctx.restore(); }
    for (const m of G.missiles) { ctx.save(); ctx.translate(m.x - cam.x, m.y - cam.y); ctx.rotate(m.a); ctx.fillStyle = '#e8e0cc'; ctx.fillRect(-8, -2, 16, 4); ctx.fillStyle = '#d8584a'; ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(12, 0); ctx.lineTo(8, 2); ctx.fill(); ctx.restore(); }
    // 포탄 경로 · 떨어질 곳: 남은 비행 경로를 점선 포물선으로, 착탄 지점에 고리 + X (적 포탄 = 빨강, 내 포탄 = 금빛)
    // 고리는 떨어질 때가 가까울수록 작아지고 진해짐 → 언제 어디에 떨어지는지 한눈에
    for (const b of G.balls) {
      if (b.kind === 'plane' || b.life <= 0) continue;
      const lx = b.x + b.vx * b.life - cam.x, ly = b.y + b.vy * b.life - cam.y, q0 = 1 - b.life / b.max, near = q0;
      const col = b.foe ? '255,80,64' : '255,214,90', a = b.foe ? 0.6 + 0.4 * near : 0.35 + 0.35 * near;
      ctx.strokeStyle = `rgba(${col},${a * 0.8})`; ctx.lineWidth = b.foe ? 3 : 2; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -G.t * 30; ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const u = k / 10, tt = b.life * u, q = q0 + (1 - q0) * u, px = b.x + b.vx * tt - cam.x, py = b.y + b.vy * tt - cam.y - Math.sin(q * Math.PI) * 24; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      const r = 10 + 14 * (1 - near);
      ctx.fillStyle = `rgba(${col},${a * 0.22})`; ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx - 6, ly - 6); ctx.lineTo(lx + 6, ly + 6); ctx.moveTo(lx + 6, ly - 6); ctx.lineTo(lx - 6, ly + 6); ctx.stroke();
    }
    for (const b of G.balls) {
      const x = b.x - cam.x, y = b.y - cam.y, col =b.kind === 'fire' ? '#ff8a2a' : b.kind === 'chain' ? '#9aa3ad' : b.kind === 'plane' ? '#ffe27a' : (b.foe ? '#3a1a1a' : '#1a1a1e');
      b.trail.forEach(([tx, ty], i) => { ctx.fillStyle = b.kind === 'fire' ? `rgba(255,140,40,${i / 12})` : `rgba(220,220,220,${i / 18})`; ctx.beginPath(); ctx.arc(tx - cam.x, ty - cam.y, 2 + i * 0.5, 0, 7); ctx.fill(); });
      if (b.h) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
      if (b.kind === 'chain') { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.save(); ctx.translate(x, y - b.h); ctx.rotate(G.t * 20); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-8, 0, 3.5, 0, 7); ctx.arc(8, 0, 3.5, 0, 7); ctx.fill(); ctx.restore(); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - b.h, b.kind === 'fire' ? 6 : b.kind === 'plane' ? 2.5 : 5, 0, 7); ctx.fill(); }
    }
    for (const p of G.parts) {
      if (p.col === 'wake') continue; const a = p.t / p.max, x = p.x - cam.x, y = p.y - cam.y;
      if (p.col === 'smoke') { ctx.fillStyle = `rgba(200,200,205,${a * 0.42})`; ctx.beginPath(); ctx.arc(x, y, p.size * (2.2 - a), 0, 7); ctx.fill(); }
      else if (p.col === 'flame') { ctx.fillStyle = `rgba(255,${120 + a * 120},40,${a})`; ctx.beginPath(); ctx.arc(x, y, p.size * a, 0, 7); ctx.fill(); }
      else if (p.col === 'bubble') { ctx.strokeStyle = `rgba(235,248,255,${a})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, p.size * (1.5 - a), 0, 7); ctx.stroke(); }
      else { ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.col; ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1; }
    }
    for (const f of G.fx) {
      const x = f.x - cam.x, y = f.y - cam.y;
      if (f.flash) { ctx.save(); ctx.translate(x, y); ctx.rotate(f.a); const L = f.big ? 40 : 30; ctx.fillStyle = 'rgba(255,230,140,.95)'; ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(L, 0); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.restore(); }
      if (f.blast) { const q = 1 - f.t / 0.45, r = f.blast * (0.4 + q * 0.8); ctx.fillStyle = `rgba(255,190,90,${0.75 * (1 - q)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = `rgba(255,250,220,${1 - q})`; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fill(); }
      if (f.bolt) { ctx.strokeStyle = `rgba(255,255,220,${f.t / 0.35})`; ctx.lineWidth = 5; ctx.beginPath(); let px = x, py = y - 700; ctx.moveTo(px, py); while (py < y) { px += rnd(-30, 30); py += rnd(40, 80); ctx.lineTo(px, Math.min(py, y)); } ctx.stroke(); }
      if (f.txt) { const age = (f.crit ? 1.1 : 0.8) - f.t, sc = f.crit ? (age < 0.12 ? age / 0.12 * 1.4 : 1.4 - Math.min(0.4, age)) : 1; ctx.save(); ctx.translate(x, y - age * 46); ctx.scale(sc, sc); ctx.font = `${f.crit ? 22 : 17}px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText(f.txt, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0); ctx.restore(); }
    }
    // 조준 띠: 마우스 쪽 뱃전, 장전되면 금빛
    if (!G.over) {
      const side = sideToward(), fx = Math.cos(me.a), fy = Math.sin(me.a), nx = -fy * side, ny = fx * side, r = st().ballSpd * 0.75 * st().range, ready = me.cd[side > 0 ? 1 : 0] <= 0;
      const ox = me.x - cam.x, oy = me.y - cam.y, hw = me.len * 0.3;
      // 떨어지는 곳 = 옆 방향 사거리 + 배 속도 × 비행 시간 (달리면 띠가 앞으로 기욺)
      const life = 0.75 * st().range, sv = shipVel(me), ex = ox + nx * r + sv.x * life, ey = oy + ny * r + sv.y * life;
      ctx.fillStyle = ready ? 'rgba(255,220,100,.12)' : 'rgba(255,100,80,.07)'; ctx.beginPath(); ctx.moveTo(ox + fx * hw + nx * 24, oy + fy * hw + ny * 24); ctx.lineTo(ex + fx * hw * 1.4, ey + fy * hw * 1.4); ctx.lineTo(ex - fx * hw * 1.4, ey - fy * hw * 1.4); ctx.lineTo(ox - fx * hw + nx * 24, oy - fy * hw + ny * 24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ready ? 'rgba(255,220,100,.55)' : 'rgba(255,100,80,.25)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(ex + fx * hw * 1.4, ey + fy * hw * 1.4); ctx.lineTo(ex - fx * hw * 1.4, ey - fy * hw * 1.4); ctx.stroke(); ctx.setLineDash([]);
      // 쏘기 전 미리보기: 앞 · 가운데 · 뒤 대포에서 떨어질 곳까지 점선 포물선 + 가운데 착탄 고리
      ctx.strokeStyle = ready ? 'rgba(255,220,100,.5)' : 'rgba(255,100,80,.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.lineDashOffset = -G.t * 24; ctx.beginPath();
      for (const o of [-1, 0, 1]) {
        const sx = ox + fx * hw * o + nx * 24, sy = oy + fy * hw * o + ny * 24, tx = ex + fx * hw * 1.4 * o, ty = ey + fy * hw * 1.4 * o;
        for (let k = 0; k <= 10; k++) { const u = k / 10, px = sx + (tx - sx) * u, py = sy + (ty - sy) * u - Math.sin(u * Math.PI) * 24; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, 7); ctx.stroke();
    }
    ctx.restore();
    // 안개: 시야 밖은 뿌옇게
    if (G.S.trait === 'fog') { const x = me.x - cam.x, y = me.y - cam.y, R = st().vision, fg = ctx.createRadialGradient(x, y, R * 0.55, x, y, R); fg.addColorStop(0, 'rgba(200,214,222,0)'); fg.addColorStop(1, 'rgba(200,214,222,.93)'); ctx.fillStyle = fg; ctx.fillRect(0, 0, VW, VH); }
    if (G.S.trait === 'storm') { ctx.fillStyle = 'rgba(20,30,50,.18)'; ctx.fillRect(0, 0, VW, VH); ctx.strokeStyle = 'rgba(200,220,240,.25)'; ctx.lineWidth = 1; ctx.beginPath(); const wa = G.wind.a; for (let i = 0; i < 70; i++) { const x = (hash(i, 1) * VW + G.t * 300 * Math.cos(wa) * (1 + hash(i, 2))) % VW, y = (hash(i, 3) * VH + G.t * 500) % VH; ctx.moveTo((x + VW) % VW, y); ctx.lineTo((x + VW) % VW + Math.cos(wa) * 14, y + 18); } ctx.stroke(); }
    if (G.flash) { ctx.fillStyle = `rgba(255,255,240,${G.flash})`; ctx.fillRect(0, 0, VW, VH); }
    const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,25,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
    if (me.hit > 0) { ctx.fillStyle = `rgba(200,30,20,${me.hit * 0.6})`; ctx.fillRect(0, 0, VW, VH); }
    if (me.hp / me.max < 0.3 && !G.over) { ctx.fillStyle = `rgba(200,20,20,${0.1 + 0.07 * Math.sin(G.t * 6)})`; ctx.fillRect(0, 0, VW, VH); }
    if (ZOOM === 1) drawHud();
    if (G.over === 'win' || G.over === 'lose') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, VH / 2 - 50, VW, 90); ctx.textAlign = 'center'; ctx.font = `44px ${FONT}`; ctx.fillStyle = G.over === 'win' ? '#ffd84a' : '#ff6b5b'; ctx.fillText(G.over === 'win' ? `${G.S.name} 정복!` : '해적선 침몰…', VW / 2, VH / 2 + 10); }
    if (paused) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, VW, VH); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = `44px ${FONT}`; ctx.fillText('일시정지', VW / 2, VH / 2 - 10); ctx.font = `17px ${FONT}`; ctx.fillText('P · Esc = 계속 · X = 항구로 후퇴 (전리품 절반) · M = 소리', VW / 2, VH / 2 + 26); }
  }
  function sideToward() { const me = G.me, wx = mouse.x + cam.x, wy = mouse.y + cam.y; return wrapA(Math.atan2(wy - me.y, wx - me.x) - me.a) > 0 ? 1 : -1; }
  // HUD 판넬 = Codex 나무판(ui_frames 0)을 9조각으로 늘림 (모서리는 그대로), 없으면 반투명 갈색
  function nine(f, x, y, w, h, c = 12) {
    const sc = Math.round(Math.min(f.w, f.h) * 0.16), W = f.im.naturalWidth / f.w, s = sc * W, iw = f.im.naturalWidth, ih = f.im.naturalHeight;
    const xs = [[0, s, x, c], [s, iw - 2 * s, x + c, w - 2 * c], [iw - s, s, x + w - c, c]], ys = [[0, s, y, c], [s, ih - 2 * s, y + c, h - 2 * c], [ih - s, s, y + h - c, c]];
    for (const [sx, sw, dx, dw] of xs) for (const [sy, sh, dy, dh] of ys) ctx.drawImage(f.im, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  function panel(x, y, w, h) {
    const f = fr('ui_frames', 0);
    if (f) { ctx.save(); ctx.globalAlpha = 0.94; nine(f, x, y, w, h, Math.min(12, h / 3)); ctx.restore(); ctx.fillStyle = 'rgba(20,12,6,.35)'; ctx.fillRect(x + 6, y + 6, w - 12, h - 12); return; }
    ctx.fillStyle = 'rgba(30,22,14,.72)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
  }
  // HUD 아이콘 (Codex ui_hud 4×4): 0 배 체력 · 1 선원 · 2 격침 해골 · 3 웨이브 깃발 · 4 돛 · 5 체인샷 · 6 화염탄 · 7 폭격 · 8 보스 · 9 나침반 · 10 콤보 별 · 11 칼 · 12 구명환 · 13 소리 · 14 모래시계 · 15 왕관
  const HUD = { hp: 0, crew: 1, kill: 2, wave: 3, sail: 4, chain: 5, fire: 6, mortar: 7, boss: 8, compass: 9, combo: 10, sword: 11, buoy: 12, sound: 13, reload: 14, crown: 15 };
  function hudPic(name, x, y, size, n = 'ui_hud', i = HUD[name]) {
    const f = fr(n, i); if (!f) return false;
    const k = size / Math.max(f.w, f.h); ctx.drawImage(f.im, x - f.w * k / 2, y - f.h * k / 2, f.w * k, f.h * k); return true;
  }
  function drawHud() {
    const me = G.me, s = st();
    panel(10, 10, 420, 50);
    ctx.save(); ctx.beginPath(); ctx.arc(35, 35, 19, 0, 7); ctx.fillStyle = '#e8dcc0'; ctx.fill(); ctx.clip(); ctx.translate(35, 37); { const c = capOf(me.tier || 0); drawCrewSprite(c.sheet, c.i, 36); } ctx.restore();
    ctx.fillStyle = '#1a0e06'; ctx.fillRect(62, 18, 200, 14); ctx.fillStyle = me.hp / me.max > 0.3 ? '#7cc860' : '#e8463c'; ctx.fillRect(64, 20, 196 * Math.max(0, me.hp) / me.max, 10);
    ctx.fillStyle = '#fff'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`${s.ship.name} ${Math.max(0, Math.ceil(me.hp))}/${Math.round(me.max)}`, 162, 29);
    ctx.textAlign = 'left'; ctx.font = `14px ${FONT}`;
    hudPic('coin', 74, 46, 17, 'ui_icons', 0) || itemPic(0, 74, 46, 16, () => {}); ctx.fillStyle = '#ffd84a'; ctx.fillText(Math.round(G.gold), 86, 51);
    if (!hudPic('plank', 138, 46, 18, 'ui_icons', 1)) { ctx.fillStyle = '#9a6a3c'; ctx.fillRect(130, 42, 14, 6); } ctx.fillStyle = '#e6c8a0'; ctx.fillText(Math.round(G.plank), 150, 51);
    const crewX = hudPic('crew', 204, 45, 18) ? 216 : 196; ctx.fillStyle = '#9fe07a'; ctx.fillText(crewX > 200 ? `${me.crew}` : `선원 ${me.crew}`, crewX, 51);
    const boss = G.wave > G.S.waves.length, wx = hudPic(boss ? 'boss' : 'wave', 288, 25, 18) ? 300 : 280;
    ctx.fillStyle = '#f2ead8'; ctx.fillText(boss ? '보스' : `웨이브 ${G.wave}/${G.S.waves.length}`, wx, 30); ctx.font = `12px ${FONT}`;
    if (hudPic('kill', 288, 46, 15)) { ctx.fillText(`${G.kills}`, 300, 51); hudPic('sail', 338, 46, 15); ctx.fillText(`${Math.round(me.sail * 100)}%`, 349, 51); }
    else ctx.fillText(`격침 ${G.kills} · 돛 ${Math.round(me.sail * 100)}%`, 280, 50);
    for (const [i, lbl, x] of [[0, 'Q 왼쪽', 440], [1, 'E 오른쪽', 560]]) { const p = 1 - me.cd[i] / reloadNow(); panel(x, 10, 112, 38); ctx.fillStyle = '#1a0e06'; ctx.fillRect(x + 10, 17, 92, 8); ctx.fillStyle = p >= 1 ? '#ffd84a' : '#a07030'; ctx.fillRect(x + 10, 17, 92 * Math.min(1, p), 8); const ix = p < 1 && hudPic('reload', x + 17, 35, 13) ? 26 : 10; ctx.fillStyle = '#f2ead8'; ctx.font = `12px ${FONT}`; ctx.fillText(`${lbl} ×${s.guns}`, x + ix, 40); }
    if (G.combo >= 3) { const sc = 1 + Math.min(0.5, G.combo * 0.02); ctx.save(); ctx.translate(VW / 2, 100); ctx.scale(sc, sc); ctx.font = `26px ${FONT}`; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; hudPic('combo', -62, -8, 30); ctx.strokeText(`${G.combo} 콤보!`, 0, 0); ctx.fillStyle = G.combo >= 10 ? '#ff8a2a' : '#ffd84a'; ctx.fillText(`${G.combo} 콤보!`, 0, 0); ctx.font = `12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(`금화 +${Math.floor(G.combo / 5) * 10}%`, 0, 18); ctx.restore(); }
    // 특수탄 (가진 것만)
    let i = 0;
    for (const [k, S] of Object.entries(SKILLS)) {
      if (!s[k]) continue;
      const x = 40 + i++ * 66, y = VH - 42, left = me.sk[k] / s[k];
      ctx.fillStyle = 'rgba(30,22,14,.8)'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.strokeStyle = left > 0 ? '#7a5a30' : '#ffd84a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'center';
      if (hudPic(k, x, y - 2, 34)) { ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.strokeText(S.name, x, y + 22); ctx.fillText(S.name, x, y + 22); } else ctx.fillText(S.name, x, y + 4);
      ctx.fillStyle = '#ffd84a'; ctx.font = `11px ${FONT}`; ctx.fillText(S.key, x - 18, y - 16);
      if (left > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.closePath(); ctx.fill(); }
    }
    const autos = [['bow', '선수포'], ['torpedo', '어뢰'], ['missile', '유도탄'], ['autoMortar', '자동 폭격']].filter(([k]) => s[k]);
    if (s.planes) autos.push(['planes', `함재기 ×${s.planes}`]);
    ctx.font = `11px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(242,234,216,.8)';
    if (autos.length) ctx.fillText('자동: ' + autos.map((a) => a[1]).join(' · '), 14 + i * 66, VH - 18);
    // 보스 체력
    const b = G.boss;
    if (b && !b.dead) { const w = Math.min(560, VW - 300); panel(VW / 2 - w / 2 - 10, 62, w + 20, 36); hudPic('boss', VW / 2 - w / 2 + 6, 76, 20); ctx.fillStyle = '#fff'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(b.name + (b.boss === 'shark' && b.phase !== 'surface' ? ' (잠수 — 어뢰 · 폭격만)' : ''), VW / 2, 78); ctx.fillStyle = '#1a0e06'; ctx.fillRect(VW / 2 - w / 2, 83, w, 8); ctx.fillStyle = '#d8584a'; ctx.fillRect(VW / 2 - w / 2, 83, w * Math.max(0, b.hp) / b.max, 8); }
    // 미니맵 (안개면 시야 안만)
    const mw = 180, mh = 130, mx = VW - mw - 10, my = VH - mh - 10, sx = mw / WORLD.w, sy = mh / WORLD.h, fog = G.S.trait === 'fog' ? st().vision : 1e9;
    ctx.fillStyle = 'rgba(10,40,60,.8)'; ctx.fillRect(mx, my, mw, mh); ctx.strokeStyle = '#a07a40'; ctx.lineWidth = 3; ctx.strokeRect(mx, my, mw, mh);
    ctx.fillStyle = '#d8c48c'; for (const o of G.islands) { ctx.beginPath(); ctx.arc(mx + o.x * sx, my + o.y * sy, Math.max(2, o.r * sx), 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffd84a'; for (const c of G.chests) ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
    ctx.fillStyle = '#9fe07a'; for (const w of G.swimmers) ctx.fillRect(mx + w.x * sx - 1, my + w.y * sy - 1, 3, 3);
    for (const f of G.foes) { if (dist(f, me) > fog || (f.shark && f.dive)) continue; ctx.fillStyle = f.boss ? '#ff4ad1' : f.k === 'mine' ? '#a07030' : '#ff5050'; ctx.fillRect(mx + f.x * sx - 2, my + f.y * sy - 2, f.boss ? 6 : 3, f.boss ? 6 : 3); }
    ctx.save(); ctx.translate(mx + me.x * sx, my + me.y * sy); ctx.rotate(me.a); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.fill(); ctx.restore();
    const arrow = (wx, wy, col) => { const x = wx - cam.x, y = wy - cam.y; if (x > 0 && y > 60 && x < VW && y < VH) return; const a = Math.atan2(y - VH / 2, x - VW / 2), ex = VW / 2 + Math.cos(a) * (VW / 2 - 24), ey = VH / 2 + Math.sin(a) * (VH / 2 - 30); ctx.save(); ctx.translate(Math.max(20, Math.min(VW - 20, ex)), Math.max(70, Math.min(VH - 20, ey))); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.fill(); ctx.restore(); };
    for (const f of G.foes) if (f.k !== 'mine' && dist(f, me) < fog) arrow(f.x, f.y, f.boss ? '#ff4ad1' : 'rgba(255,90,80,.85)');
    for (const c of G.chests) arrow(c.x, c.y, 'rgba(255,216,74,.85)');
    if (G.msg) { const a = Math.min(1, G.msg.t * 2); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(30,22,14,.72)'; ctx.fillRect(0, 150, VW, G.msg.sub ? 86 : 62); ctx.fillStyle = G.msg.boss ? '#ff8a6a' : '#ffd84a'; ctx.font = `32px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(G.msg.text, VW / 2, 192); if (G.msg.sub) { ctx.fillStyle = '#f2ead8'; ctx.font = `16px ${FONT}`; ctx.fillText(G.msg.sub, VW / 2, 220); } ctx.globalAlpha = 1; }
  }

  // ── 입력
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / K, y: (e.clientY - r.top) / K }; };
  const active = () => G && !G.done && cv.style.visibility !== 'hidden';
  cv.addEventListener('mousemove', (e) => { const p = pos(e); mouse.x = p.x; mouse.y = p.y; });
  cv.addEventListener('mousedown', (e) => { audioOn(); const p = pos(e); mouse.x = p.x; mouse.y = p.y; if (e.button === 0 && active() && !paused) mouse.down = true; });
  addEventListener('mouseup', () => { mouse.down = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    audioOn();
    const k = e.key.toLowerCase();
    if (k === 'm') { muted = !muted; if (muted) for (const a of Object.values(BGM)) a.pause(); else { const n = bgmOn; bgmOn = null; music(n); } }
    if (!active()) return;
    if (k === 'escape' || k === 'p') { paused = !paused; keys = {}; mouse.down = false; return; }
    if (paused) { if (k === 'x') { paused = false; G.over = 'lose'; G.overT = 0.01; G.me.hp = 0; music(null); } return; }
    keys[k] = true;
    if (k === ' ') { e.preventDefault(); fire(1); fire(-1); }
    if (k === '1') useSkill('chain'); if (k === '2') useSkill('fire'); if (k === '3') useSkill('mortar');
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { keys = {}; mouse.down = false; if (active() && !G.over) paused = true; });

  // ── 루프: 맞는 순간 멈칫(hitStop), 보스 격침 · 침몰 때 슬로모션
  let last = 0, looping = false;
  function loop(now) {
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    if (G && !G.done) {
      if (hitStop > 0) hitStop -= real;
      else if (!paused) { const dt = real * (slowMo > 0 ? 0.3 : 1); if (slowMo > 0) slowMo -= real; update(dt); }
      shakeAmt *= Math.pow(0.003, real); kick.x *= Math.pow(0.0005, real); kick.y *= Math.pow(0.0005, real);
      if (G && !G.done) draw();
    }
    requestAnimationFrame(loop);
  }

  // ── 항구 미리보기: 캔버스에 배 + 선원 리깅 (뱃머리 오른쪽)
  function drawShipPreview(canvas, id) {
    const sh = SY.SHIP[id]; if (!sh) return;
    const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    const c = canvas.getContext('2d'), keep = ctx; ctx = c;
    const L = sh.len * SHIP_K, f = fr('ship_' + id), w = L, h = f ? f.h * L / f.w : L * 0.5;
    const k = Math.min(canvas.width / (w * 1.12), canvas.height / (h * 1.15));
    c.translate(canvas.width / 2, canvas.height / 2); c.scale(k, k);
    const s = { len: L, base: sh.len, tier: sh.tier, isMe: true, crew: 4, jump: 0, fireT: 0, a: 0 };
    drawHull('ship_' + id, L, { rat: true });
    drawCrew(s);
    ctx = keep;
  }

  const PG = window.PG = {
    ready: false, SP, FOES, CREW_SPOTS,
    start(i) { cv.style.visibility = 'visible'; audioOn(); start(i); },
    onEnd: null,
    img(name, i = 0) { const f = SP[name] && SP[name][i]; return f ? f.src : null; },
    drawShip: drawShipPreview,
    capOf,
    // 항구 캐릭터 (조선공 등): 캔버스 가운데에 리깅 캐릭터 하나, P = { t, act, at, dur, fl, ch }
    drawChar(canvas, sheet, i, P) {
      const c = canvas.getContext('2d'), keep = ctx; ctx = c;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
      c.translate(canvas.width / 2, canvas.height * 0.55);
      drawCrewSprite(sheet, i, Math.min(canvas.width, canvas.height) * 0.78, P);
      ctx = keep;
    },
    music(name) { music(name); },
    get G() { return G; }, // 확인용 (콘솔)
    // 확인용: 캔버스에 리깅 캐릭터를 크게, 자세별로 나란히 (acts = ['idle', 'order', ...]), t = 시간
    rigDemo(canvas, sheet, i, acts, t) {
      const c = canvas.getContext('2d'), keep = ctx; ctx = c;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width / acts.length, size = Math.min(w, canvas.height) * 0.8;
      acts.forEach((a, k) => {
        c.save(); c.translate(w * (k + 0.5), canvas.height / 2);
        const P = { t, act: a, at: (t % 1.6), dur: a === 'load' ? 1.2 : 0.7, fl: a === 'flinch' ? 0.35 - (t % 0.7) / 2 : 0, ch: a === 'cheer' ? 0.9 - (t % 0.9) : 0 };
        drawCrewSprite(sheet, i, size, P);
        c.restore();
      });
      ctx = keep;
    },
  };
  if (!waiting) setReady();
})();
