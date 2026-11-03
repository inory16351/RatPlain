// 쥐 해적 Unity 빌드 밸런스 모델: 코드 · 프리팹 · ShipyardDB 수치로 바다별 곡선 계산
const fs = require('fs');
const path = require('path');
const ships = JSON.parse(fs.readFileSync(path.join(__dirname, 'ships.json'), 'utf8'));

// ── ShipyardDB · GameManager(Battle 씬) 값
const BASE = { hp: 100, speed: 170, turn: 1.5, dmgTaken: 1, guns: 2, reload: 2.1, dmg: 14, crit: 0.1, range: 1, ballSpd: 540, pickup: 150, crewMax: 12, crewReload: 0.02, repair: 15, goldBonus: 0, plankBonus: 0, mortar: 0, mortarDmg: 60, mortarR: 110, bow: 0, bowDmg: 10, torpedo: 0, torpedoDmg: 40, missile: 0, missileDmg: 18, planes: 0, planeDmg: 6, ram: 0, evade: 0, double: 0, crewHeal: 0, stormGuard: 0 };
const DB = { hpBuff: 1.15, dmgBuff: 1.1, takenBuff: 0.93, rangeBuff: 1.05, eraArmor: [1, 1, 0.97, 0.94, 0.91, 0.88], lightHull: 1.05 };
const GM = { seaEase: [0.75, 0.85, 0.85, 0.9, 0.95], waveEase: [0.85, 0.93, 1], bossDmgEase: [0.85, 0.9, 0.8, 0.85, 0.9], bossHpEase: [0.8, 0.9], enemyDmgSlope: 0.5, goldMul: 1.08, plankMul: 1.02, shipGoldMul: 0.5, shipPlankMul: 1.7, goldOnly: ['sloop', 'speeder', 'shark'], treasure: 1.5, chestGold: 57.5, chestPlank: 2, oneShotShark: [1], waveRepairFrac: 0.08 };

const SEAS = [
  { id: 'harbor', name: '치즈 항구 앞바다', mult: 1, rec: 0, trait: '', waves: ['sloop,sloop,mine', 'sloop,sloop,mine,mine,rival', 'sloop,sloop,sloop,rival,mine'], boss: 'b_rival' },
  { id: 'reef', name: '상어 암초', mult: 1.3, rec: 1, trait: '', waves: ['shark,shark,shark,sloop', 'shark,shark,sloop,sloop,mine', 'shark,shark,shark,shark,sloop,rival'], boss: 'b_shark' },
  { id: 'patrol', name: '고양이 해군 순찰대', mult: 1.7, rec: 1, trait: '', waves: ['frigate,sloop,speeder,speeder', 'frigate,frigate,speeder,speeder,mine', 'frigate,frigate,sloop,speeder,speeder,speeder'], boss: 'b_admiral' },
  { id: 'den', name: '안개 낀 해적 소굴', mult: 2.2, rec: 2, trait: 'fog', waves: ['rival,rival,mine,mine', 'rival,rival,rival,sloop', 'rival,rival,rival,rival,mine,mine'], boss: 'b_king' },
  { id: 'strait', name: '폭풍 해협', mult: 2.8, rec: 3, trait: 'storm', waves: ['shark,shark,frigate,rival', 'mortar,frigate,shark,shark,speeder', 'mortar,rival,rival,shark,shark,speeder'], boss: 'b_shark2' },
  { id: 'iron', name: '철갑 함대', mult: 3.5, rec: 3, trait: '', waves: ['ironclad,mortar,speeder,speeder', 'ironclad,ironclad,mortar,frigate', 'ironclad,ironclad,mortar,mortar,speeder,speeder'], boss: 'b_admiral2' },
  { id: 'whirl', name: '소용돌이 바다', mult: 4.3, rec: 4, trait: 'whirl', waves: ['rival,rival,frigate,shark,shark', 'ironclad,mortar,rival,speeder,speeder', 'ironclad,frigate,rival,rival,shark,shark,mortar'], boss: 'b_king2' },
  { id: 'hq', name: '고양이 해군 본진', mult: 5.2, rec: 5, trait: 'storm', waves: ['ironclad,ironclad,frigate,frigate,speeder', 'ironclad,mortar,mortar,rival,shark,shark', 'ironclad,ironclad,frigate,mortar,mortar,speeder,speeder'], boss: 'b_fortress' },
];

// 적 프리팹 (ai: 0 Ship 1 Speeder 2 Mortar 3 Mine 4 Shark)
const FOE = {
  sloop: { name: '고양이 순찰선', ai: 0, hp: 60, guns: 2, reload: 2.6, dmg: 9, ram: 0, armor: 1, bowGun: 0, gold: 15, plank: 4 },
  frigate: { name: '고양이 프리깃', ai: 0, hp: 140, guns: 3, reload: 2.3, dmg: 11, armor: 1, bowGun: 0, gold: 30, plank: 8 },
  ironclad: { name: '고양이 철갑함', ai: 0, hp: 260, guns: 3, reload: 2.4, dmg: 14, armor: 0.7, bowGun: 2.6, gold: 50, plank: 14 },
  rival: { name: '라이벌 쥐 해적선', ai: 0, hp: 110, guns: 3, reload: 2.4, dmg: 10, armor: 1, bowGun: 0, fire: 0.3, gold: 28, plank: 7 },
  mortar: { name: '고양이 박격포선', ai: 2, hp: 90, reload: 3.4, dmg: 18, armor: 1, gold: 25, plank: 6 },
  speeder: { name: '고양이 쾌속정', ai: 1, hp: 28, ram: 22, armor: 1, gold: 8, plank: 2 },
  shark: { name: '상어', ai: 4, hp: 34, dmg: 9, armor: 1, gold: 6, plank: 0 },
  mine: { name: '폭탄통', ai: 3, hp: 12, ram: 28, armor: 1, gold: 3, plank: 1 },
  b_rival: { name: "회색꼬리", boss: 1, ai: 0, hp: 600, guns: 3, reload: 2, dmg: 11, armor: 1, gold: 120, plank: 30 },
  b_shark: { name: '거대 상어', boss: 2, ai: 4, hp: 700, dmg: 22, armor: 1, gold: 150, plank: 20 },
  b_admiral: { name: '고양이 제독 기함', boss: 3, ai: 0, hp: 800, guns: 5, reload: 2.1, dmg: 12, armor: 1, gold: 200, plank: 45 },
  b_king: { name: '해적왕 블랙랫', boss: 4, ai: 0, hp: 850, guns: 5, reload: 2, dmg: 12, armor: 1, gold: 230, plank: 50 },
  b_shark2: { name: '분노한 거대 상어', boss: 2, ai: 4, hp: 800, dmg: 26, armor: 1, gold: 260, plank: 40 },
  b_admiral2: { name: '제독 기함 Mk2', boss: 3, ai: 0, hp: 900, guns: 6, reload: 1.9, dmg: 13, armor: 0.8, bowGun: 2.2, gold: 300, plank: 70 },
  b_king2: { name: '해적왕 (재도전)', boss: 4, ai: 0, hp: 950, guns: 6, reload: 1.8, dmg: 13, armor: 1, gold: 340, plank: 80 },
  b_fortress: { name: '대제독 해상 요새', boss: 5, ai: 0, hp: 1000, guns: 4, reload: 2.4, dmg: 14, armor: 0.85, gold: 500, plank: 120 },
};

const ease = (t, i) => (i < 0 || i >= t.length ? 1 : t[i]);

// Shipyard.WavesOf: 3번째 바다부터 2바다마다 웨이브 +1
function wavesOf(si) {
  const S = SEAS[si], n = si + 1, extra = n < 3 ? 0 : Math.floor((n - 3) / 2) + 1;
  const list = [...S.waves], last = S.waves[S.waves.length - 1];
  const sh = last.split(',').filter((x) => x !== 'mine');
  for (let i = 1; i <= extra; i++) list.push(last + Array.from({ length: i }, (_, j) => ',' + sh[j % sh.length]).join(''));
  return list;
}

// 적 1척 초당 피해 (내 배에 다 맞는다고 가정, 받는 피해 배율 전)
function foeDps(f, dmg) {
  if (f.ai === 0) return (f.guns * dmg) / f.reload + (f.bowGun ? dmg / f.bowGun : 0);
  if (f.ai === 2) return dmg / f.reload;
  if (f.ai === 4) return f.boss ? dmg / 7.5 : dmg / 5.7; // 물기 1회 / 잠수 · 돌진 · 지침 한 바퀴
  return 0;
}
// 보스 고유 패턴 초당 피해 (전부 맞을 때 상한)
function bossPatternDps(k, dmg) {
  switch (k) {
    case 'b_rival': return (3 * dmg * 1.4) / 7;
    case 'b_admiral': return (5 * dmg * 1.3) / 6;
    case 'b_admiral2': return (7 * dmg * 1.3) / 5;
    case 'b_king': return (16 * dmg) / 5 / 4; // 원형 탄 16발 중 약 1/4 이 내 쪽
    case 'b_king2': return (20 * dmg) / 4 / 4;
    case 'b_shark2': return (10 * dmg * 0.5) / 1.2 / 5 * (3 / 7.5);
    case 'b_fortress': return (4 * dmg) / 1.3 + (6 * dmg * 1.3) / 7 / 2;
    default: return 0;
  }
}

function seaModel(si) {
  const S = SEAS[si], waves = wavesOf(si);
  const dmgMult = 1 + (S.mult - 1) * GM.enemyDmgSlope, lootMult = 1 + (S.mult - 1) * 0.8;
  let hpPool = 0, gold = 0, plank = 0, count = 0, mines = 0;
  const waveRows = [];
  const loot = (kind, f) => {
    const ship = !f.boss && (f.ai === 0 || f.ai === 2 || f.ai === 1);
    gold += Math.ceil((f.gold * (ship ? GM.shipGoldMul : 1) * GM.goldMul * lootMult) / 5) * 5;
    if (!GM.goldOnly.includes(kind)) plank += Math.ceil(Math.round(f.plank * (ship ? GM.shipPlankMul : 1) * GM.plankMul * lootMult) / 3) * 3;
  };
  waves.forEach((w, wi) => {
    const k = ease(GM.seaEase, si) * ease(GM.waveEase, Math.min(wi + 1, waves.length) - 1);
    let hp = 0, dps = 0, burst = 0;
    w.split(',').forEach((kind) => {
      const f = FOE[kind];
      let h = f.hp * S.mult * k;
      if (kind === 'shark' && GM.oneShotShark.includes(si)) h = 1;
      if (kind === 'mine') { mines++; burst += f.ram * k * dmgMult; loot(kind, f); return; }
      if (kind === 'speeder') burst += f.ram * k * dmgMult;
      hp += h / (f.armor < 1 ? f.armor : 1); count++;
      dps += foeDps(f, (f.dmg || 0) * k) * dmgMult;
      loot(kind, f);
    });
    hpPool += hp;
    waveRows.push({ w: wi + 1, list: w, k: +k.toFixed(3), hp: Math.round(hp), dps: +dps.toFixed(1), burst: Math.round(burst) });
  });
  // 보스 웨이브: 보스 + 1웨이브 첫 두 척 호위
  const B = FOE[S.boss], bk = ease(GM.bossHpEase, si), bd = ease(GM.bossDmgEase, si);
  const bossHp = (B.hp * S.mult * bk) / (B.armor < 1 ? B.armor : 1);
  const bossDps = (foeDps(B, B.dmg * bd) + bossPatternDps(S.boss, B.dmg * bd)) * dmgMult;
  const ek = ease(GM.seaEase, si) * ease(GM.waveEase, waves.length - 1);
  let escHp = 0, escDps = 0, n = 0;
  for (const kind of waves[0].split(',')) {
    if (kind === 'mine' || n >= 2) continue; n++;
    const f = FOE[kind];
    escHp += (kind === 'shark' && GM.oneShotShark.includes(si) ? 1 : f.hp * S.mult * ek) / (f.armor < 1 ? f.armor : 1);
    escDps += foeDps(f, (f.dmg || 0) * ek) * dmgMult;
    loot(kind, f);
  }
  loot(S.boss, B);
  hpPool += bossHp + escHp;
  const chestGold = Math.round(waves.length * GM.treasure * GM.chestGold * lootMult * GM.goldMul);
  const chestPlank = Math.round(waves.length * GM.treasure * GM.chestPlank * lootMult * GM.plankMul);
  return {
    si, name: S.name, mult: S.mult, rec: S.rec, trait: S.trait, boss: B.name, waves: waves.length, waveRows,
    dmgMult: +dmgMult.toFixed(2), lootMult: +lootMult.toFixed(2), seaEase: ease(GM.seaEase, si),
    hpPool: Math.round(hpPool), bossHp: Math.round(bossHp), escHp: Math.round(escHp), bossDps: +bossDps.toFixed(1), bossWaveDps: +(bossDps + escDps).toFixed(1),
    peakDps: Math.max(...waveRows.map((r) => r.dps)), foes: count, mines,
    killGold: gold, killPlank: plank, chestGold, chestPlank, gold: gold + chestGold, plank: plank + chestPlank,
  };
}

// ── 내 배: Shipyard.Compute + 같은 티어 장비 전 슬롯 장착 (g = 0 일반 / 1 고급)
function gear(slot, g, tier, add, mul, shipId) {
  const k = 1 + 0.35 * tier, R2 = (v) => Math.round(v * 100) / 100, Rn = (v) => Math.floor(v + 0.5);
  const A = (s, v) => (add[s] = (add[s] || 0) + v), M = (s, v) => (mul[s] = (mul[s] || 1) * v);
  switch (slot) {
    case 'cannon': if (g === 0) M('dmg', R2(1 + 0.1 * k)); else { M('dmg', R2(1 + 0.14 * k)); M('reload', R2(1 - 0.04 * k)); } break;
    case 'sail': if (g === 0) M('speed', R2(1 + 0.05 * k)); else { M('speed', R2(1 + 0.07 * k)); M('turn', R2(1 + 0.05 * k)); } break;
    case 'hull': if (g === 0) A('hp', Rn(25 * k)); else { A('hp', Rn(35 * k)); A('repair', Rn(4 * k)); } break;
    case 'rudder': if (g === 0) M('turn', R2(1 + 0.08 * k)); else { M('turn', R2(1 + 0.1 * k)); A('pickup', Rn(30 * k)); } break;
    case 'scope': if (g === 0) A('crit', R2(0.05 * k)); else { A('crit', R2(0.07 * k)); M('range', R2(1 + 0.06 * k)); } break;
    case 'figure': if (g === 0) { A('ram', Rn(12 * k)); A('goldBonus', R2(0.05 * k)); } else { A('ram', Rn(18 * k)); A('goldBonus', R2(0.1 * k)); } break;
    case 'mortar': if (g === 0) A('mortarDmg', Rn(10 * k)); else { A('mortarDmg', Rn(16 * k)); A('mortarR', Rn(10 * k)); } break;
    case 'shot': A('dmg', Rn((g === 0 ? 1 : 2) * k)); break;
    case 'crew': if (g === 0) A('crewMax', Rn(2 * k)); else { A('crewMax', Rn(3 * k)); A('crewHeal', Rn(2 * k)); } break;
  }
}
function compute(shipId, g, crew = 4) {
  const sh = ships.find((s) => s.id === shipId);
  const s = { ...BASE }, add = { ...sh.add }, mul = { ...sh.mul };
  const gAdd = {}, gMul = {};
  if (g >= 0) for (const sl of sh.slots) gear(sl, g, +sh.tier, gAdd, gMul, shipId);
  for (const o of [add, gAdd]) for (const k in o) s[k] = (s[k] || 0) + o[k];
  for (const o of [mul, gMul]) for (const k in o) s[k] = (s[k] || 0) * o[k];
  const tier = +sh.tier, line = sh.line;
  s.hp = Math.round(s.hp * DB.hpBuff); s.dmg *= DB.dmgBuff; s.range *= DB.rangeBuff;
  s.dmgTaken *= (tier === 0 ? 1 : DB.takenBuff) * (line === 'S' || line === 'M' ? DB.eraArmor[tier] : 1) * (line === 'S' ? DB.lightHull : 1);
  s.guns = Math.round(s.guns);
  const reloadNow = s.reload * (1 - Math.min(s.crewMax, crew) * s.crewReload);
  const cannon = (s.guns * s.dmg * (1 + s.crit)) / reloadNow; // 한쪽 뱃전
  const auto = (s.bow ? s.bowDmg / s.bow : 0) + (s.torpedo ? s.torpedoDmg / s.torpedo * 0.5 : 0) + (s.missile ? s.missileDmg / s.missile : 0) + (s.planes ? (s.planes * s.planeDmg) / 0.6 * 0.5 : 0) + (g >= 0 && sh.slots.includes('mortar') && s.mortar ? (s.mortarDmg / s.mortar) * 0.6 : 0);
  const ehp = s.hp / s.dmgTaken / (1 - Math.min(0.5, s.evade || 0));
  return { id: shipId, name: sh.name, tier, line: line || '-', costPlank: +sh.costPlank, costCoin: +sh.costCoin, hp: s.hp, dmg: +s.dmg.toFixed(1), guns: s.guns, reload: +reloadNow.toFixed(2), crit: +s.crit.toFixed(2), dmgTaken: +s.dmgTaken.toFixed(3), speed: Math.round(s.speed), range: +s.range.toFixed(2), cannon: +cannon.toFixed(1), auto: +auto.toFixed(1), dps: +(cannon + auto).toFixed(1), ehp: Math.round(ehp), slots: sh.slots.length };
}

const seas = SEAS.map((_, i) => seaModel(i));
const playerAll = ships.map((s) => ({ g0: compute(s.id, 0), g1: compute(s.id, 1), bare: compute(s.id, -1) }));
const LINES = { S: ['caravel', 'clipper', 'paddle', 'torpedo', 'missile'], M: ['carrack', 'frigate', 'steamfrigate', 'cruiser', 'submarine'], H: ['galleon', 'ofline', 'ironclad', 'dreadnought', 'carrier'] };
const byTier = (line, t, g = 0) => compute(t === 0 ? 'galley' : LINES[line][t - 1], g);

// 바다 × 추천 단계 × 갈래 비교
const fit = seas.map((S) => {
  const r = {};
  for (const L of ['S', 'M', 'H']) {
    const p = byTier(L, S.rec);
    r[L] = { ship: p.name, dps: p.dps, ehp: p.ehp, ttk: Math.round(S.hpPool / p.dps), bossTtk: Math.round(S.bossHp / p.dps), survive: +(p.ehp / S.peakDps).toFixed(1), bossSurvive: +(p.ehp / S.bossWaveDps).toFixed(1) };
  }
  return { si: S.si, name: S.name, rec: S.rec, ...r };
});

// 경제: 바다 1회 승리 수입 vs 다음 단계 배 값
const cost = [0, 1, 2, 3, 4, 5].map((t) => (t === 0 ? { plank: 0, coin: 0 } : { plank: +ships.find((s) => +s.tier === t).costPlank, coin: +ships.find((s) => +s.tier === t).costCoin }));
const econ = seas.map((S) => {
  const next = S.si + 1 < seas.length ? seas[S.si + 1].rec : null;
  const need = next != null && next > S.rec ? cost[next] : null;
  return { si: S.si, name: S.name, gold: S.gold, plank: S.plank, nextTier: next, needCoin: need ? need.coin : 0, needPlank: need ? need.plank : 0, runsCoin: need ? +(need.coin / S.gold).toFixed(1) : 0, runsPlank: need ? +(need.plank / S.plank).toFixed(1) : 0 };
});

// 누적: 각 바다를 한 번씩 깨며 모은 재화 vs 추천 배 누적 비용 (한 갈래만 산다고 가정)
let cg = 0, cp = 0;
const cum = seas.map((S) => { const needC = cost.slice(0, S.rec + 1).reduce((a, c) => a + c.coin, 0), needP = cost.slice(0, S.rec + 1).reduce((a, c) => a + c.plank, 0); const o = { si: S.si, haveCoin: cg, havePlank: cp, needCoin: needC, needPlank: needP }; cg += S.gold; cp += S.plank; return o; });

const out = { seas, fit, econ, cum, player: playerAll, byLine: Object.fromEntries(['S', 'M', 'H'].map((L) => [L, [0, 1, 2, 3, 4, 5].map((t) => ({ g0: byTier(L, t, 0), g1: byTier(L, t, 1) }))])), foe: FOE, cost };
fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(out, null, 1));

console.log('바다 | 배율 | 추천 | 웨이브 | 적HP풀 | 보스HP | 피크DPS | 보스웨이브DPS | 금화 | 목재');
for (const s of seas) console.log([s.si + 1, s.name, s.mult, s.rec, s.waves, s.hpPool, s.bossHp, s.peakDps, s.bossWaveDps, s.gold, s.plank, s.dmgMult, s.lootMult].join(' | '));
console.log('\n갈래별 단계 (일반 장비)');
for (const L of ['S', 'M', 'H']) for (const t of out.byLine[L]) { const p = t.g0; console.log(L, p.tier, p.name, 'hp', p.hp, 'taken', p.dmgTaken, 'ehp', p.ehp, 'cannon', p.cannon, 'auto', p.auto, 'dps', p.dps, 'g1dps', t.g1.dps, 'g1ehp', t.g1.ehp); }
console.log('\n바다 적합도 (추천 단계 · 일반 장비): 전멸 소요(초) / 버티는 시간(피크)');
for (const f of fit) console.log(f.si + 1, f.name, 'rec', f.rec, ...['S', 'M', 'H'].map((L) => `${L}: ttk ${f[L].ttk} boss ${f[L].bossTtk} surv ${f[L].survive}/${f[L].bossSurvive}`));
console.log('\n경제'); for (const e of econ) console.log(e); for (const c of cum) console.log(c);
for (const s of seas) console.log(s.si + 1, JSON.stringify(s.waveRows.map((r) => [r.hp, r.dps, r.burst])));

// ── 분해 · 개선안
const avg = (S) => (['S', 'M', 'H'].reduce((a, L) => a + byTier(L, S.rec).dps, 0)) / 3;
const avgE = (S) => (['S', 'M', 'H'].reduce((a, L) => a + byTier(L, S.rec).ehp, 0)) / 3;
const target = [55, 75, 95, 115, 135, 155, 175, 195];
const prop = seas.map((S, i) => {
  const d = avg(S), e = avgE(S), ttk = S.hpPool / d;
  // 적 체력 = 배율 × (구성) 이므로 배율만 바꿔 목표 전멸 시간에 맞춤
  const m = Math.max(1, Math.round((S.mult * target[i] / ttk) * 20) / 20);
  return { si: i, avgDps: +d.toFixed(1), avgEhp: Math.round(e), ttk: Math.round(ttk), danger: +(S.peakDps / e * 100).toFixed(1), mult: S.mult, newMult: m, base: Math.round(S.hpPool / S.mult) };
});
console.log('\n개선안'); for (const p of prop) console.log(p);
out.prop = prop; out.target = target;
fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(out, null, 1));

// ── 개선 시나리오: 배율 완만하게 + 구성 튀는 적 체력 조정
const NEW_MULT = [1, 1.3, 1.5, 1.8, 2.1, 2.4, 2.8, 3.2];
const NEW_HP = { frigate: 120, ironclad: 200 };
const keepMult = SEAS.map((s) => s.mult), keepHp = { frigate: FOE.frigate.hp, ironclad: FOE.ironclad.hp };
SEAS.forEach((s, i) => (s.mult = NEW_MULT[i])); Object.assign(FOE.frigate, { hp: NEW_HP.frigate }); Object.assign(FOE.ironclad, { hp: NEW_HP.ironclad });
const seas2 = SEAS.map((_, i) => seaModel(i));
SEAS.forEach((s, i) => (s.mult = keepMult[i])); FOE.frigate.hp = keepHp.frigate; FOE.ironclad.hp = keepHp.ironclad;
const scen = seas2.map((S, i) => { const d = avg(S), e = avgE(S); return { si: i, mult: S.mult, hpPool: S.hpPool, ttk: Math.round(S.hpPool / d), danger: +(S.peakDps / e * 100).toFixed(1), gold: S.gold, plank: S.plank, bossTtk: Math.round(S.bossHp / d) }; });
console.log('\n시나리오'); for (const s of scen) console.log(JSON.stringify(s), 'old', prop[s.si].ttk, prop[s.si].danger, seas[s.si].gold, seas[s.si].plank);
out.scen = scen; out.NEW_MULT = NEW_MULT; out.NEW_HP = NEW_HP;
fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(out, null, 1));
