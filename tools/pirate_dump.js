// 쥐 해적 게임 데이터(ships.js · seas.js · game.js FOES)를 JSON 으로 뽑음 → tools/gen_pirate_table.py 가 엑셀로 만듦
// 사용: node tools/pirate_dump.js > out.json
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.join(__dirname, '..', 'pirate');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const ctx = { window: {}, location: { search: '' }, localStorage: { getItem: () => null, setItem() {} }, URLSearchParams, Math, JSON, Object };
vm.createContext(ctx);
vm.runInContext(read('seas.js'), ctx);
vm.runInContext(read('ships.js'), ctx);
// FOES 는 game.js 안쪽 상수라 그 블록만 잘라 실행
const src = read('game.js');
const m = src.match(/const FOES = (\{[\s\S]*?\n  \});/);
const FOES = vm.runInContext('(' + m[1] + ')', ctx);

const SY = ctx.window.SHIPYARD;
const out = {
  base: SY.BASE, grades: SY.GRADES, eras: SY.ERAS, tierCol: SY.TIER_COL, lines: SY.LINES, slotTypes: SY.SLOT_TYPES,
  ships: SY.SHIPS, parts: SY.PARTS.map(({ fits, ...p }) => p),
  req: SY.REQ, fuseN: SY.FUSE_N, upMax: SY.UP_MAX, upChance: SY.UP_CHANCE,
  odds: [30, 100, 250, 600].map((c) => [c, SY.odds(c)]),
  seas: ctx.window.SEAS, foes: FOES,
};
process.stdout.write(JSON.stringify(out));
