"""Codex 프롬프트 생성: python -I make_prompts.py → prompt_<이름>.txt
배 16척(현실 배 발전 순서) · 적 · 아이템 · 장비 아이콘 · 타이틀.
모든 배는 탑뷰, 뱃머리 오른쪽. 배 자체에 쥐 · 고양이 모양이 드러나게.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

HEAD = ("Use your built-in image generation tool to create ONE image and save it as PNG to: {name}.png (in the current working directory). "
        "Do not write code to draw it; it must be a generated illustration. After saving, reply only with the file name. "
        "Do NOT edit, clean or post-process the image with code or scripts: save the generated image as-is.\n\n"
        "The attached images show our mobile game's art style and characters (cute flat mice and cats). "
        "This is for a NEW top-down naval battle game: a one-eyed PIRATE MOUSE captain wants to conquer the sea, "
        "fighting the CAT NAVY, rival rat pirates and sharks.\n\nImage spec:\n")
CAM = ("- CAMERA (very important): strict TOP-DOWN view, looking straight down from directly above (bird's-eye view like a classic 2D top-down game), "
       "NOT side view, NOT isometric, NOT 3/4 view. The subject points to the RIGHT of the image: its bow/nose/head is at the RIGHT, its stern/tail at the LEFT, "
       "symmetrical top/bottom.\n")
BG = ("- solid flat MAGENTA background (#FF00FF) everywhere behind the subject: no water, no sea, no waves, no wake, no shadow, no vignette, no frame. "
      "The subject itself must not contain magenta or purple-pink; soft-pink mouse ears, noses, paws and tails are fine.\n")
STYLE = ("- ART STYLE (most important): EXACTLY the art style of the attached reference images: soft flat 2D vector illustration, muted natural colors, "
         "simple rounded shapes, flat fills with only one subtle soft shadow tone, very fine subtle paper-like texture at most, NO black outlines, NO line art, "
         "NO glow, NO gradients, NO anime style, NO motion lines, NO text, NO letters, NO numbers, NO logos.\n"
         "- MATCH THE REFERENCE RENDERING (very important): the same muted, slightly desaturated warm natural palette as the attached top-down plane images "
         "(soft wood browns, dusty creams, muted reds and blues, never neon or saturated yellow). Big simple shapes with FEW small details: no tiny props, "
         "no barrels, crates, coiled ropes or lanterns clutter, no shiny highlights, no 3D rendering, no plastic toy look, no dark outlines.\n")
EMPTY = ("- EMPTY DECK (very important): NO characters at all on the ship: no mice, no cats, no people, no animals on deck. The crew is added separately in the game, "
         "so leave the open deck areas plain and readable (the stern deck behind the main mast must be a clear open area for the captain).\n")

ONE = "- 1536x1536 square. ONE subject lying horizontally, centered, its length filling about {fill}% of the image WIDTH, fully inside the image.\n"

RAT = ("- MOUSE IDENTITY (very important, must be obvious at a small size): the ship itself is designed like a MOUSE: the bow at the RIGHT ends in a big carved "
       "brown mouse-head figurehead with two big round pink ears and a pink nose, a long pink mouse-tail-shaped rudder curls out behind the stern at the LEFT, "
       "a red flag with a white mouse-skull-and-cheese emblem lying flat at the stern, and only a few soft muted pale-yellow cheese accents (a cheese-wedge emblem on a sail, a few cheese holes on the rail).\n" + EMPTY)
CAT = ("- CAT IDENTITY (very important, must be obvious at a small size): the ship itself is designed like a CAT: the bow at the RIGHT is shaped and painted like a "
       "cat head with two pointy triangular ears and whiskers, sails or deck plates carry big paw-print emblems, a striped cat-tail-shaped rudder curls out at the LEFT. "
       "Painted muted navy blue and cream with dull gold trim (a strict military CAT NAVY).\n" + EMPTY)
RIVAL = ("- RIVAL RAT PIRATE IDENTITY (very important, must be obvious at a small size): the ship is a sinister rival rat pirate ship: dark charcoal and dark red wood, "
         "tattered black sails with a grey rat-skull emblem, the bow at the RIGHT ends in a carved grey rat-head figurehead with sharp teeth and round grey ears, "
         "a long grey rat-tail rudder at the LEFT.\n" + EMPTY)

# 플레이어 배 (web 의 SHIPS 와 같은 이름) — 현실 배 발전 순서
SHIPS = {
    'ship_galley': (70, "a small ancient GALLEY: a narrow wooden rowing ship with a row of wooden oars sticking out to the top and bottom, one small square cream sail seen from above as a curved cloth bar across the middle, a little bronze ram at the bow."),
    'ship_caravel': (74, "a 15th-century CARAVEL: a small light wooden ship with two masts and triangular lateen sails (seen from above as slim curved cream canvas shapes), a raised little stern deck."),
    'ship_clipper': (84, "a 19th-century CLIPPER: a long very slim fast wooden sailing ship with three tall masts and many stacked cream square sails seen from above as curved bars, a sharp pointed bow."),
    'ship_paddle': (84, "a fast PADDLE STEAMER: a slim wooden-and-iron steamship with a big round paddle wheel on each side (top and bottom), one black smokestack with a red-and-cheese-yellow band in the middle, a small auxiliary mast."),
    'ship_torpedo': (86, "a TORPEDO BOAT / early destroyer: a long slim steel-grey warship with two thin smokestacks, a small bridge, torpedo tubes on the deck pointing sideways, a small deck gun at the bow."),
    'ship_missile': (86, "a modern MISSILE FAST ATTACK CRAFT: a sleek angular light grey boat with a pointed hull, a low radar mast with a round radome shaped like mouse ears, four box missile launchers on the rear deck."),
    'ship_carrack': (78, "a CARRACK: a round-bellied wooden ship with high castle decks at the bow and stern, three masts with square and lateen cream sails seen from above."),
    'ship_frigate': (84, "an 18th-century FRIGATE: a sleek wooden warship with three masts and cream square sails seen from above, one row of black cannons along each side (top and bottom)."),
    'ship_steamfrigate': (86, "a SCREW STEAM FRIGATE: a wooden warship with three masts and furled sails plus one black smokestack in the middle, rows of cannons on both sides."),
    'ship_cruiser': (88, "a PROTECTED CRUISER: a long steel-grey warship with two smokestacks, a ram bow, a gun turret at the front and the back, a small bridge."),
    'ship_submarine': (86, "a SUBMARINE surfaced: a long smooth dark-grey cigar-shaped hull with a small conning tower in the middle (an open round hatch on top), a deck gun, the hull's bow shaped like a mouse snout."),
    'ship_galleon': (82, "a big Spanish GALLEON: a wide wooden treasure warship with high stern castle, three masts with large cream square sails seen from above, cannons along both sides, gold decorations."),
    'ship_ofline': (90, "a SHIP OF THE LINE: a very large wide wooden battleship with three masts and huge cream square sails seen from above, three rows of black cannons along each side."),
    'ship_ironclad': (88, "an IRONCLAD: a low flat armored warship covered with dark iron plates and rivets, one big round revolving gun turret with two cannons in the middle, a short smokestack."),
    'ship_dreadnought': (92, "a DREADNOUGHT battleship: a huge long steel-grey battleship with four big twin-gun turrets along the center line, two big smokestacks, a tall bridge tower in the middle."),
    'ship_carrier': (94, "an AIRCRAFT CARRIER: a very long flat grey flight deck with a painted landing stripe, a small island bridge on the top side, two small propeller planes parked on the deck."),
}
ENEMIES = {
    'e_cat_sloop': (CAT, 72, "a small CAT NAVY PATROL SLOOP: a little wooden sailing warship with one mast and a navy-blue sail with a white paw print, two small cannons on each side."),
    'e_cat_frigate': (CAT, 84, "a CAT NAVY FRIGATE: a sleek navy-blue wooden warship with three masts and white sails with paw prints, a row of cannons on each side."),
    'e_cat_mortar': (CAT, 76, "a CAT NAVY MORTAR BOAT: a wide short wooden boat with one huge fat black mortar cannon pointing up in the middle."),
    'e_cat_speeder': (CAT, 60, "a CAT NAVY SPEED BOAT: a small sharp rowing/steam boat with a pointed ram, built for ramming."),
    'e_cat_ironclad': (CAT, 86, "a CAT NAVY IRONCLAD: a low armored iron warship painted navy blue with one revolving gun turret shaped like a cat head with ears, a smokestack."),
    'e_rat_rival': (RIVAL, 80, "a RIVAL RAT PIRATE BRIGANTINE: a medium two-masted pirate ship with tattered black sails, cannons on both sides."),
    'e_shark': (None, 66, "a cute flat cartoon SHARK swimming, seen from directly above: blue back, white belly edges hidden, a dorsal fin on top, a big tail at the LEFT, its head and open toothy mouth at the RIGHT, simple and round like the attached shark reference."),
    'shark_fin': (None, 0, ""),
    'boss_admiral': (CAT, 94, "the CAT NAVY ADMIRAL FLAGSHIP: a huge three-masted navy-blue and gold ship of the line with white paw-print sails, many cannons on both sides, a wide open stern deck."),
    'boss_rival': (RIVAL, 94, "the RIVAL PIRATE KING's black GALLEON: a huge dark galleon with four tattered black sails, gold skull decorations, many cannons, a wide open stern deck."),
    'boss_megashark': (None, 94, "a GIANT cartoon SHARK boss seen from directly above, very long, blue back with scars, a big dorsal fin, wide tail at the LEFT, a huge mouth with rows of teeth at the RIGHT, cute but menacing like the attached shark reference."),
    'boss_fortress': (CAT, 95, "the CAT GRAND ADMIRAL SEA FORTRESS: an enormous steel-grey and navy-blue floating battleship fortress with six big gun turrets, two smokestacks, a tall bridge shaped like a cat head with ears, an open command platform behind it."),
}
REFS_RAT = "-i ref_style_top.png -i ref_style_player.png -i ref_pirate.png"
REFS_CAT = "-i ref_style_top.png -i ref_navy.png"
REFS_SHARK = "-i ref_shark.png -i ref_style_top.png"
REFS_RIVAL = "-i ref_pirate.png -i ref_navy.png -i ref_style_top.png"

ITEMS = ("- 1536x1536 square divided into a 2x2 grid of four equal cells, ONE item centered in each cell, each filling about 60% of its cell, nothing crossing cell borders.\n"
         "- top-left: a round yellow cheese coin with holes. top-right: a small wooden treasure chest seen from above with gold coins. "
         "bottom-left: a floating brown wooden powder barrel with a red fuse and a skull mark (no letters). "
         "bottom-right: a cute brown mouse sailor floating in a red-and-white life ring, seen from above, waving.\n"
         "- CAMERA: top-down view (seen from above).\n")
PARTS_A = ("- 1536x1536 square divided into a 3x3 grid of nine equal cells, ONE equipment icon centered in each cell, each filling about 65% of its cell, nothing crossing cell borders.\n"
           "- Ship equipment icons for a pirate mouse game, row by row from top-left: 1 a black iron ship CANNON, 2 a cream canvas SAIL with a cheese emblem, "
           "3 a riveted iron HULL ARMOR plate, 4 a wooden ship's wheel / RUDDER, 5 a brass SPYGLASS telescope, 6 a carved wooden mouse-head FIGUREHEAD, "
           "7 a fat black MORTAR, 8 a crate of special CHAIN SHOT cannonballs (two balls joined by a chain), 9 a sailor HAMMOCK with a little mouse sleeping (crew quarters).\n"
           "- Each icon drawn from a slightly angled front view like an item icon, simple and readable at 46 pixels.\n")
PARTS_U = ("- 1536x1536 square divided into a 3x3 grid of nine equal cells, ONE legendary equipment icon centered in each cell, each filling about 65% of its cell, nothing crossing cell borders.\n"
           "- Legendary pirate ship equipment icons, row by row from top-left: 1 a golden triple-barrel cannon, 2 a glowing-free blue storm sail with a lightning bolt pattern, "
           "3 a golden cheese-shaped armor plate, 4 a kraken-tentacle steering wheel, 5 a golden spyglass with a ruby, 6 a golden mouse-king figurehead with a crown, "
           "7 a dragon-mouth fire cannon with a small flame, 8 a harpoon launcher, 9 a treasure map with an X.\n"
           "- Each icon drawn from a slightly angled front view like an item icon, rich gold and jewel accents, simple and readable at 46 pixels.\n")
FIN = ("- 1536x1536 square divided into a 2x1 grid (left half, right half), ONE subject centered in each half, nothing crossing the middle.\n"
       "- SUBJECT: a shark swimming UNDER the water so that ONLY its dorsal fin sticks out, seen from directly ABOVE (strict top-down): a blue triangular dorsal fin "
       "pointing RIGHT (seen from above it is a thin pointed blue shape), with a white foam splash ring and a V-shaped white foam trail behind it to the LEFT. "
       "LEFT half: a normal shark fin (small). RIGHT half: the GIANT boss shark's fin, bigger, darker blue with scars and a notch.\n"
       "- Only blue fin and white foam, nothing else.\n")
CREW_HEAD = ("- 1536x1536 square divided into a 3x2 grid of six equal cells (3 columns, 2 rows), ONE character centered in each cell, each filling about 60% of its cell, nothing crossing cell borders.\n"
             "- CAMERA (very important): every character is seen from ABOVE at a steep top-down angle (like standing on a ship deck in a top-down game), "
             "so the top of the head, ears and hat are the biggest readable shapes and the small body/shoulders are seen below, cute chibi proportion (big head). "
             "Every character FACES THE RIGHT of the image. Same size and scale in every cell.\n")
CREW_RAT = CREW_HEAD + ("- CHARACTERS: the brown PIRATE MOUSE crew from the reference images. Row 1: 1 the PIRATE MOUSE CAPTAIN (black tricorn hat with gold trim, black eye patch, big round pink ears, pink tail, red coat) standing, "
            "2 the same captain pointing a cutlass to the RIGHT, 3 a brown mouse sailor with a red bandana. Row 2: 4 a brown mouse sailor with a red bandana pushing a ramrod, "
            "5 a light-brown mouse sailor with a striped shirt looking through a small spyglass, 6 a brown mouse sailor waving with a striped shirt.\n")
CREW_CAT = CREW_HEAD + ("- CHARACTERS: CAT NAVY sailors like the attached cat references, all with white sailor caps and navy collars. Row 1: 1 a tuxedo (black and white) cat sailor, "
            "2 an orange tabby cat sailor, 3 a grey cat sailor. Row 2: 4 a chubby orange cat gunner with a round helmet, 5 a grey cat officer with a navy peaked cap, 6 a ninja-like grey cat with a black headband.\n")
CREW_BOSS = ("- 1536x1536 square divided into a 2x2 grid of four equal cells, ONE character centered in each cell, each filling about 60% of its cell, nothing crossing cell borders.\n"
             "- CAMERA (very important): every character is seen from ABOVE at a steep top-down angle, the top of the head, ears and hat are the biggest readable shapes, cute chibi proportion. "
             "Every character FACES THE RIGHT of the image.\n"
             "- CHARACTERS: top-left: a big white CAT NAVY ADMIRAL with a navy bicorne hat and gold epaulettes. top-right: the black-furred RIVAL RAT PIRATE KING with a red coat and red tricorn hat with a feather. "
             "bottom-left: the white CAT GRAND ADMIRAL wearing a round glass space-helmet-like visor and headphones, like the attached commander cat reference. bottom-right: a grey rival rat pirate sailor with a dark red bandana.\n")
TITLE = ("- 1536x1024 landscape key art for the title screen, NOT top-down: a cheerful side/3-4 view illustration. The brown PIRATE MOUSE captain from the reference "
         "(black tricorn hat with gold trim, eye patch, big pink ears, pink tail) stands proudly on the bow of his small wooden mouse-shaped pirate ship "
         "(mouse-head figurehead with pink ears, red flag with a mouse-skull-and-cheese emblem), pointing a cutlass toward the horizon. "
         "Behind on the sea: a CAT NAVY warship with paw-print sails and a blue shark fin. Bright sunny sea and sky, flat soft colors. "
         "Leave the top third fairly simple sky for a title logo (but draw NO text).\n"
         "- NO magenta background: a full painted scene.\n")


def write(name, body):
    with open(os.path.join(HERE, f'prompt_{name}.txt'), 'w', encoding='utf-8') as f:
        f.write(HEAD.format(name=name) + body)


refs = {}
for n, (fill, desc) in SHIPS.items():
    write(n, ONE.format(fill=fill) + f"- SUBJECT: the player's pirate ship, seen from directly ABOVE: {desc}\n" + RAT + CAM + BG + STYLE)
    refs[n] = REFS_RAT
for n, (ident, fill, desc) in ENEMIES.items():
    if n == 'shark_fin':
        write(n, FIN + BG + STYLE); refs[n] = REFS_SHARK; continue
    write(n, ONE.format(fill=fill) + f"- SUBJECT: an enemy, seen from directly ABOVE: {desc}\n" + (ident or '') + CAM + BG + STYLE)
    refs[n] = REFS_CAT if ident is CAT else REFS_RIVAL if ident is RIVAL else REFS_SHARK
write('crew_rat', CREW_RAT + BG + STYLE); refs['crew_rat'] = REFS_RAT
write('crew_cat', CREW_CAT + BG + STYLE); refs['crew_cat'] = REFS_CAT
write('crew_boss', CREW_BOSS + BG + STYLE); refs['crew_boss'] = REFS_RIVAL
write('items', ITEMS + BG + STYLE); refs['items'] = REFS_RAT
write('parts_a', PARTS_A + BG + STYLE); refs['parts_a'] = REFS_RAT
write('parts_u', PARTS_U + BG + STYLE); refs['parts_u'] = REFS_RAT
write('title_art', TITLE + STYLE); refs['title_art'] = REFS_RAT + " -i ref_navy.png -i ref_shark.png"
with open(os.path.join(HERE, 'refs.txt'), 'w', encoding='utf-8') as f:
    for n, r in refs.items():
        f.write(f'{n} {r}\n')
print(len(refs), 'prompts')
