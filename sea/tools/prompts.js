// Codex 그림 프롬프트 만들기: node sea/tools/prompts.js → sea/art/src/prompt_<이름>.txt
// 배 그림 핵심 = 배 자체가 쥐 · 고양이로 보이게 (뱃머리 머리 조각 · 귀 · 꼬리 키 · 돛 문양 · 선체 털 색)
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'art', 'src');

const head = n => `Use your built-in image generation tool to create ONE image and save it as PNG to: ${n}.png (in the current working directory). Do not write code to draw it; it must be a generated illustration. After saving, reply only with the file name. Do NOT edit, clean or post-process the image with code or scripts: save the generated image as-is.\n\n`;
const REFS = 'The attached images are from our mobile game: cut-out body parts of our characters (a brown PIRATE RAT with a black tricorn hat with gold trim and an eye patch, tuxedo / fluffy / white cats, a cute blue cartoon shark) and two TOP-DOWN airplanes from our previous top-down game, which show exactly how a vehicle with an animal crew must be drawn from directly above in our style. This is a new top-down PIRATE SHIP naval battle game.\n\n';
const CAM = '- CAMERA (very important): strict TOP-DOWN view, looking straight down from directly above (bird\'s-eye view like a classic 2D top-down naval game), NOT side view, NOT isometric, NOT 3/4 view. The ship lies HORIZONTALLY: its BOW (front) at the RIGHT, its STERN (back) at the LEFT, symmetrical top/bottom. Sails are seen from above as curved canvas shapes across the deck, masts as round dots.';
const BG = '- solid flat MAGENTA background (#FF00FF) everywhere behind the subject: no sea, no water, no waves, no wake, no shadow, no vignette, no frame. The subject itself must not contain magenta or purple-pink; small soft-pink rat ears, nose, paws and tail are fine.';
const STYLE = '- ART STYLE (most important): EXACTLY the art style of the attached reference images: soft flat 2D vector illustration, muted natural colors, simple rounded shapes, flat fills with only one subtle soft shadow tone, very fine subtle paper-like texture at most, NO black outlines, NO line art, NO glow, NO gradients, NO anime style, NO motion lines, NO text, NO letters, NO numbers, NO logos. Animals look fairly natural (realistic proportions), not chibi.';

// 쥐 해적선 공통: 배 자체가 쥐
const RAT = 'The SHIP ITSELF must read as a RAT at first glance even when tiny on screen: the BOW is a big carved wooden RAT HEAD figurehead seen from above (pointed snout with a pink nose at the very front tip, two big ROUND rat ears with pink insides sticking out left and right of the bow, whiskers), the hull planks are warm RAT-BROWN like the rat fur in the reference, a long pink segmented RAT TAIL trails out from the stern as the rudder, the sails are cream canvas with a round cheese-yellow emblem made of three circles (a mouse-ear silhouette). Rat crew seen from above (round ears, brown fur), and the PIRATE RAT CAPTAIN from the reference (black tricorn hat with gold trim seen from above) at the stern wheel.';
// 고양이 해군 공통: 배 자체가 고양이
const CAT = 'The SHIP ITSELF must read as a CAT at first glance even when tiny on screen: the BOW is a carved CAT HEAD figurehead seen from above with two POINTY TRIANGULAR cat ears and whiskers, the hull is painted like a TUXEDO CAT (black-grey sides, white deck edge like a white cat belly), a curling striped CAT TAIL sticks out from the stern as the rudder, the sails are white navy canvas whose top edge has two pointy cat-ear points, with a navy-blue paw-print emblem, neat navy-blue and gold trim (an orderly NAVY ship, not pirates). Cat sailors seen from above (pointy ears, white sailor caps).';
// 라이벌 쥐 해적단: 검은 쥐
const RIVAL = 'The SHIP ITSELF must read as a RAT at first glance: the BOW is a carved BLACK RAT HEAD figurehead seen from above (pointed snout, two big round ears, red eye patch), dark charcoal-grey weathered hull, a long thin grey-pink rat tail as the rudder at the stern, TATTERED dark red sails with patches and a bone-white cheese-and-crossbones emblem (a cheese wedge over two crossed bones). Scruffy BLACK RATS crew seen from above. This is a RIVAL rat pirate gang, meaner and dirtier than the hero.';

const ship = (n, sub, extra = '', fill = 88) => head(n) + REFS + `Image spec:\n- 1536x1536 square. ONE ship lying horizontally, centered, its length filling about ${fill}% of the image WIDTH, fully inside the image.\n- SUBJECT: ${sub}\n- ${extra}\n${CAM}\n${BG}\n${STYLE}\n`;
const P = {
  // ── 플레이어 쥐 해적선 (테크 트리 대표 그림) ──
  r_sloop: ship('r_sloop', 'the hero PIRATE RAT\'s first tiny ship: a small one-mast wooden sloop (about 3.5 times longer than wide) with 3 small cannons on each side.', RAT, 70),
  r_cutter: ship('r_cutter', 'a slim FAST rat pirate cutter: very narrow pointed hull (about 5 times longer than wide), one tall mast with a big triangular sail, 2 light cannons on each side. Light and fast.', RAT, 75),
  r_clipper: ship('r_clipper', 'a sleek FAST rat pirate clipper: long narrow hull (about 5 times longer than wide), three masts with many layered sails, a pointed bowsprit, 4 cannons on each side, small cheese-yellow pennant flags.', RAT, 88),
  r_storm: ship('r_storm', 'the ultimate FAST rat pirate ship: a sleek steam-and-sail racing ship (about 5 times longer than wide) with two masts, a brass steam funnel in the middle, twin paddle wheels on the sides, brass trim, glowing yellow cheese-shaped lantern lights.', RAT, 90),
  r_brig: ship('r_brig', 'a balanced rat pirate brig: medium two-mast wooden ship (about 3.5 times longer than wide) with 4 cannons on each side.', RAT, 80),
  r_bomb: ship('r_bomb', 'a rat pirate BOMB KETCH: medium two-mast wooden ship (about 3.5 times longer than wide) with a big round brass MORTAR barrel pointing up in the middle of the deck, stacked cannonballs, 3 cannons on each side.', RAT, 84),
  r_ironbrig: ship('r_ironbrig', 'the ultimate BALANCED rat pirate ship: a steam ironclad brig (about 3.5 times longer than wide) with riveted brass-and-iron armor plates on the brown hull, two masts, one brass funnel, a rotating twin cannon turret at the front and one at the back, 4 cannons on each side.', RAT, 88),
  r_frigate: ship('r_frigate', 'a sturdy HEAVY rat pirate frigate: wide wooden hull (about 3 times longer than wide), three masts, 5 cannons on each side, thick plank walls.', RAT, 86),
  r_galleon: ship('r_galleon', 'a huge HEAVY rat pirate galleon: very wide tall wooden hull (about 2.8 times longer than wide) with a raised stern castle, three big masts, 6 cannons on each side, treasure chests on deck.', RAT, 90),
  r_fortress: ship('r_fortress', 'the ultimate HEAVY rat pirate ship: a gigantic floating cheese FORTRESS ship (about 2.6 times longer than wide): wide armored brown hull, a round cheese-wheel-shaped central tower, four masts, 7 cannons on each side, two big mortar barrels.', RAT, 92),
  // ── 고양이 해군 ──
  c_sloop: ship('c_sloop', 'a small CAT NAVY patrol sloop: one mast, 2 cannons on each side (about 3.5 times longer than wide).', CAT, 70),
  c_speed: ship('c_speed', 'a tiny fast CAT NAVY torpedo boat: very slim pointed hull (about 5 times longer than wide), no sails, a small engine with a propeller at the stern, a ninja-like black cat driver, a spiked ram at the bow.', CAT, 62),
  c_frigate: ship('c_frigate', 'a CAT NAVY frigate: wide wooden-and-iron hull (about 3 times longer than wide), two masts, 4 cannons on each side, a fluffy orange cat officer.', CAT, 84),
  c_mortar: ship('c_mortar', 'a CAT NAVY mortar ship: chubby round hull (about 2.6 times longer than wide), one mast, a big round mortar barrel in the middle of the deck, a fat fluffy grey-white cat gunner next to it.', CAT, 80),
  boss_c_iron: ship('boss_c_iron', 'a CAT NAVY IRONCLAD BATTLESHIP boss: very long steel-grey armored hull (about 4 times longer than wide) with riveted plates, two smokestacks shaped like cat ears, three round twin-cannon turrets on the deck, a bridge in the middle where a white cat captain with a gold-starred navy cap is visible from above.', CAT, 94),
  boss_c_admiral: ship('boss_c_admiral', 'the CAT ADMIRAL\'S FLAGSHIP final boss: a gigantic white-and-navy-blue ship of the line (about 3 times longer than wide), four masts with huge white sails each topped with two pointy cat-ear points, 8 cannons on each side, gold trim everywhere, a big white cat admiral with a gold-starred navy bicorn hat and gold epaulettes standing on the raised stern deck.', CAT, 95),
  // ── 라이벌 쥐 해적단 ──
  rr_ship: ship('rr_ship', 'a RIVAL rat pirate raider: medium two-mast ship (about 3.5 times longer than wide) with 3 cannons on each side.', RIVAL, 78),
  boss_rr: ship('boss_rr', 'the RIVAL BLACK RAT PIRATE KING\'S galleon boss: a huge dark galleon (about 3 times longer than wide) with a raised stern castle, three masts with tattered dark red sails, 6 cannons on each side, a big grizzled black rat pirate king with a huge black feathered hat and a gold hook standing at the stern.', RIVAL, 94),
};
// 상어
const shark = (n, sub, fill) => head(n) + REFS + `Image spec:\n- 1536x1536 square. ONE animal lying horizontally, centered, its length filling about ${fill}% of the image WIDTH, fully inside the image.\n- SUBJECT: ${sub} It must look like the cute cartoon BLUE SHARK in the reference (same blue, white belly, round black eye), but seen from directly ABOVE while swimming.\n- CAMERA (very important): strict TOP-DOWN view from directly above. The head points to the RIGHT, the tail at the LEFT, side fins spread toward the top and bottom, symmetrical top/bottom.\n${BG}\n${STYLE}\n`;
P.shark = shark('shark', 'a SHARK seen from above: blue streamlined body, tall dorsal fin along the middle, two side fins, crescent tail, two round black eyes on top of the head.', 78);
P.boss_shark = shark('boss_shark', 'a GIANT KING SHARK boss seen from above: huge chubby blue shark with old scars, a tall dorsal fin, two big side fins, crescent tail, a small golden pirate crown on top of its head, an old broken anchor chain hanging from one fin, the open toothy mouth visible from above at the right.', 90);
// 아이템 2×2
P.items = head('items') + REFS + `Image spec:\n- 1024x1024 square SPRITE SHEET: a 2x2 grid of 4 separate game ITEM ICONS, each centered in its own quarter, each filling about 55% of its quarter, wide magenta space between them. Seen from slightly above.\n- Top-left: a round yellow CHEESE COIN (a gold-yellow coin made of cheese with holes). Top-right: a small wooden TREASURE CHEST with brass corners, lid slightly open with cheese coins inside. Bottom-left: a floating wooden TNT gunpowder BARREL with a red band and a short fuse (no letters). Bottom-right: a small brown pirate RAT crew member floating in a red-and-white life ring, waving one paw (seen from above).\n${BG}\n${STYLE}\n`;
// 장비 아이콘 3×3 × 2
const parts = (n, list) => head(n) + REFS + `Make a SHEET of PIRATE SHIP EQUIPMENT ICONS for the ship workshop screen of the pirate rat.\n\nImage spec:\n- 1536x1536 square, an evenly spaced 3 columns x 3 rows GRID of 9 separate icons, each icon centered in its own cell, each filling about 65% of its cell, with wide empty magenta gaps between icons (nothing touches or crosses cell borders). No grid lines drawn.\n- Each icon is ONE object seen in a slight 3/4 view, in reading order (left to right, top to bottom):\n${list.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n${BG}\n${STYLE}\n`;
P.parts_a = parts('parts_a', [
  'a short bronze ship CANNON on a wooden carriage with small wheels',
  'a long iron CANNON with a long barrel (long range)',
  'a pair of small fast-loading brass swivel guns',
  'a cream canvas SAIL with a round cheese-yellow mouse-ear emblem, puffed by wind',
  'a big triangular racing sail with a slim mast',
  'a wooden ship RUDDER shaped like a pink rat tail',
  'a stack of riveted iron HULL ARMOR plates',
  'a thick oak hull plank bundle tied with rope',
  'a carved wooden RAT HEAD ship figurehead with round ears',
]);
P.parts_b = parts('parts_b', [
  'a brass SPYGLASS telescope',
  'a round brass MORTAR barrel on a wooden base',
  'two cannonballs joined by an iron CHAIN (chain shot)',
  'a burning FIRE cannonball with orange flames in an iron cage',
  'a big iron HARPOON gun with a rope',
  'a small brass STEAM ENGINE with a funnel and a paddle wheel',
  'a ship\'s wooden steering WHEEL with brass caps',
  'a heavy iron ANCHOR with a cheese-yellow rope',
  'a rolled sea MAP with a red X and a compass',
]);
// 타이틀 키아트
P.title_art = head('title_art') + REFS + `This is the TITLE SCREEN KEY ART.\n\nImage spec:\n- 1536x1024 landscape. ONE dynamic heroic subject group centered, filling about 80% of the image, fully inside the image.\n- SUBJECT: the brown PIRATE RAT captain from the reference (black tricorn hat with gold trim, eye patch, pink ears and tail) standing proudly on the RAT-HEAD figurehead bow of his small wooden pirate ship, one paw pointing forward to the right, the other holding a cutlass, cream sails with a cheese-yellow mouse-ear emblem billowing behind him (3/4 front-side view). Small splashes of sea foam under the bow. Behind them at the lower left, a grumpy tuxedo CAT NAVY officer in a white sailor cap peeking over the edge of a cat-head ship, and a cute blue SHARK fin.\n- solid flat MAGENTA background (#FF00FF) everywhere behind the subjects: no sky, no clouds, no sea surface, no shadow, no vignette, no frame. The subjects must not contain magenta or purple-pink; small soft-pink rat ears, nose, paws and tail are fine.\n${STYLE}\n`;

fs.mkdirSync(SRC, { recursive: true });
for (const [n, t] of Object.entries(P)) fs.writeFileSync(path.join(SRC, `prompt_${n}.txt`), t);
console.log(Object.keys(P).length + '개', Object.keys(P).join(' '));
