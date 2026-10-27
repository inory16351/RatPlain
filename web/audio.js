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
  function play(name) {
    want = name;
    if (!ac) return; // 아직 첫 입력 전: 켜지면 want 를 틈
    if (cur === name) return;
    if (cur) { const old = music[cur]; fade(old, 0, 0.6, () => old.pause()); }
    cur = name;
    if (!name) return;
    const el = music[name] || (music[name] = Object.assign(new Audio(url(`../audio/bgm/${name}.mp3`)), { loop: true }));
    el.currentTime = 0; el.volume = 0; el.muted = muted;
    el.play().catch(() => {});
    fade(el, BGM_VOL, 0.8);
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('ratplain_mute', m ? '1' : '0'); } catch (e) {}
    if (out) out.gain.value = m ? 0 : 1;
    for (const el of Object.values(music)) el.muted = m;
  }
  addEventListener('keydown', (e) => { if (e.code === 'KeyM') setMuted(!muted); });

  // 버튼 소리: 오버레이의 모든 버튼
  addEventListener('click', (e) => { if (e.target.closest('button')) sfx('ui_click'); }, true);

  window.SND = { sfx, play, setMuted, get muted() { return muted; }, BGM, SFX };
})();
