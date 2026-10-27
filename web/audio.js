// 소리: BGM (audio/bgm, Gemini) · 효과음 (audio/sfx, tools/sfx.py 합성)
// 브라우저는 사용자가 한 번 클릭 · 키를 눌러야 소리를 낼 수 있음 → 첫 입력에서 켜짐. M = 소리 끄기/켜기
(function () {
  const BGM = ['title', 'battle', 'boss'];
  const SFX = ['shoot', 'enemy_shoot', 'hit', 'hurt', 'explode', 'explode_big', 'pickup_gear', 'pickup_coin', 'pickup_heal',
    'boost', 'warn', 'zap', 'boss_appear', 'clear', 'fail', 'ui_click', 'ui_buy'];
  // 효과음마다: 볼륨 · 같은 소리 최소 간격(초, 총알처럼 자주 울리는 것이 겹쳐 시끄럽지 않게)
  const MIX = {
    shoot: [0.35, 0.06], enemy_shoot: [0.25, 0.08], hit: [0.4, 0.05], hurt: [0.8, 0.15], explode: [0.7, 0.05], explode_big: [1, 0.3],
    pickup_gear: [0.4, 0.04], pickup_coin: [0.45, 0.04], pickup_heal: [0.6, 0.1], boost: [0.5, 0.3], warn: [0.5, 0.25], zap: [0.6, 0.08],
    boss_appear: [0.9, 1], clear: [0.8, 1], fail: [0.8, 1], ui_click: [0.6, 0.03], ui_buy: [0.7, 0.05],
  };
  const BGM_VOL = 0.45;
  const url = (p) => (window.__ASSETS && window.__ASSETS[p]) || p; // 단일 HTML 빌드는 data URI 로 품고 있음

  let muted = false;
  try { muted = localStorage.getItem('ratplain_mute') === '1'; } catch (e) {}
  let ac = null, out = null;
  const buf = {}, lastAt = {};
  const music = {};
  let want = null, cur = null; // 틀고 싶은 곡 · 지금 곡

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    out = ac.createGain(); out.gain.value = muted ? 0 : 1; out.connect(ac.destination);
    for (const n of SFX) {
      fetch(url(`../audio/sfx/${n}.wav`)).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((d) => { buf[n] = d; }).catch(() => {});
    }
    if (want) play(want);
  }
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, true);

  function sfx(n, vol = 1, rate = 1) {
    if (!ac || muted || !buf[n]) return;
    const [v, gap] = MIX[n] || [1, 0];
    const now = ac.currentTime;
    if (now - (lastAt[n] || -9) < gap) return;
    lastAt[n] = now;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf[n]; s.playbackRate.value = rate * (0.95 + Math.random() * 0.1); // 매번 조금씩 다른 높이
    g.gain.value = v * vol;
    s.connect(g).connect(out); s.start();
  }

  // 곡 바꾸기: 지금 곡은 줄이며 멈추고 새 곡은 처음부터. null = 끔
  function fade(el, to, sec, done) {
    clearInterval(el._f);
    const from = el.volume, t0 = performance.now();
    el._f = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      el.volume = from + (to - from) * k;
      if (k >= 1) { clearInterval(el._f); if (done) done(); }
    }, 30);
  }
  // 곡마다 같은 파일 두 개를 번갈아 씀: 끝나기 XFADE 초 전에 다른 쪽을 처음부터 틀며 겹쳐 넘김 (루프 이음매가 안 들리게)
  const XFADE = 2.5;
  let live = null, held = false; // 지금 소리 나는 <audio>, 일시정지 중
  function deck(name, k) {
    // loop = 길이를 모를 때(서버가 부분 요청을 못 받는 등) 그냥 처음으로 돌아가는 안전장치
    const m = music[name] || (music[name] = [0, 1].map(() => Object.assign(new Audio(url(`../audio/bgm/${name}.mp3`)), { loop: true })));
    return m[k];
  }
  function startDeck(name, k, fadeIn) {
    const el = deck(name, k);
    el._k = k; el._name = name;
    el.currentTime = 0; el.volume = 0; el.muted = muted;
    el.play().catch(() => {});
    fade(el, BGM_VOL, fadeIn);
    live = el;
  }
  setInterval(() => {
    const el = live;
    if (!el || held || !isFinite(el.duration) || el.paused) return;
    if (el.duration - el.currentTime < XFADE) {
      startDeck(el._name, 1 - el._k, XFADE * 0.6);
      fade(el, 0, XFADE, () => el.pause());
    }
  }, 100);
  function play(name) {
    want = name;
    if (!ac) return; // 아직 첫 입력 전: 켜지면 want 를 틈
    if (cur === name) return;
    if (live) { const old = live; fade(old, 0, 0.6, () => old.pause()); live = null; }
    cur = name;
    if (!name) return;
    startDeck(name, 0, 0.8);
  }
  // 일시정지 동안 곡도 멈춤
  function hold(v) {
    held = v;
    if (!live) return;
    if (v) live.pause(); else live.play().catch(() => {});
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('ratplain_mute', m ? '1' : '0'); } catch (e) {}
    if (out) out.gain.value = m ? 0 : 1;
    for (const d of Object.values(music)) for (const el of d) el.muted = m;
  }
  addEventListener('keydown', (e) => { if (e.code === 'KeyM') setMuted(!muted); });

  // 버튼 소리: 오버레이의 모든 버튼
  addEventListener('click', (e) => { if (e.target.closest('button')) sfx('ui_click'); }, true);

  window.SND = { sfx, play, hold, setMuted, get muted() { return muted; }, BGM, SFX, get now() { return live; } }; // now = 지금 곡 <audio> (확인용)
})();
