"""원본(NKK) 플랫 그림체로 다시 그리기 — 프롬프트 생성
ChatGPT 1차 그림이 원본보다 디테일 · 광택 · 외곽선이 많아져서, 원본 참조(ref_*)만 붙이고 강한 플랫 규칙으로 다시 뽑음
결과: prompt_<이름>.txt + refs.txt (gen_flat.sh 가 씀)
사용: python -I make_flat.py <subjects.json>   (subjects.json = [[이름, 갑판비움(0/1), 주제 문장], ...])
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = open(os.path.join(HERE, 'style.txt'), encoding='utf-8').read().strip()

HEAD = ("Use your built-in image generation tool to create ONE image and save it as PNG to: {name}.png (in the current working directory). "
        "Do not write code to draw it; it must be a generated illustration. Do NOT edit or post-process the image with code. After saving, reply only with the file name.\n\n"
        "The attached images are the ORIGINAL art of our mobile game (flat mouse and cat body parts, a flat top-down plane). This is for a top-down naval battle game: "
        "a one-eyed PIRATE MOUSE captain conquers the sea, fighting the CAT NAVY, rival rat pirates and sharks. Characters are cute chibi (big head) but drawn in the SAME FLAT style as the originals.\n\n")
MOUSE = ("- MOUSE IDENTITY (must read at a small size): the bow at the RIGHT ends in a big carved brown mouse-head figurehead with two big round pink ears and a pink nose, "
         "a long pink mouse-tail-shaped rudder at the LEFT, a red flag with a white cheese-wedge-and-crossbones emblem at the stern (NEVER a three-circle mouse-ear silhouette).")
CAT = ("- CAT IDENTITY (must read at a small size): the bow at the RIGHT is shaped like a cat head with two pointy triangular ears, big paw-print emblems on sails or deck plates, "
       "a striped cat-tail-shaped rudder at the LEFT. Muted navy blue and cream with flat dull ochre trim.")
RAT = ("- RIVAL RAT PIRATE IDENTITY: dark charcoal and dark red wood, tattered dark sails with a grey rat-skull emblem, a carved grey rat-head figurehead at the RIGHT, a grey rat-tail rudder at the LEFT.")
CREW_CAM = ("- CAMERA FOR CHARACTERS (very important): a HIGH top-down camera like the pilot cat seen in the attached top-down plane: we look DOWN on each character from above at about 60 degrees, "
            "so the TOP of the head, the ears and the hat are the biggest shapes and the small round body and shoulders are seen below/behind the head; feet are tiny or hidden. "
            "NOT a side view, NOT a front view, NOT standing full-body figures, NOT lying down. Every character faces the RIGHT (nose pointing right). "
            "The background must be solid flat MAGENTA #FF00FF (not transparent, not white).")
DECK = "- EMPTY DECK (very important): NO characters on the ship; the open deck areas stay plain and roomy (crew is added separately in the game)."
TOP = ("- CAMERA: strict TOP-DOWN view from directly above, subject pointing to the RIGHT, symmetrical top/bottom.\n"
       "- BACKGROUND: solid flat MAGENTA #FF00FF everywhere behind the subject, no water, no shadow, no frame. The subject itself contains no magenta.")
GRID = "- BACKGROUND: solid flat MAGENTA #FF00FF behind everything, no shadow; the subjects contain no magenta."

REF_SHIP = ['ref_style_top.png', 'ref_pirate.png']
REF_CAT = ['ref_style_top.png', 'ref_navy.png']
REF_CREW = ['ref_pirate.png', 'ref_navy.png', 'ref_style_top.png']


def refs_for(n):
    if n.startswith(('crew_cat', 'boss_admiral', 'boss_fortress', 'e_cat')):
        return REF_CAT
    if 'shark' in n:
        return ['ref_shark.png', 'ref_style_top.png']
    if n in ('crew_capt', 'crew_wright'):  # 시대별 선장 · 조선공: 지금 선원 시트(ref_crew)를 붙여 같은 인물 · 그림체 유지
        return ['ref_crew.png'] + REF_CREW
    if n.startswith('crew'):
        return REF_CREW
    return REF_SHIP


def main():
    items = json.load(open(sys.argv[1], encoding='utf-8'))
    # refs.txt 는 다른 그림 줄을 남기고 이번 그림 줄만 바꿈
    rp = os.path.join(HERE, 'refs.txt')
    refs = dict(l.split(' ', 1) for l in open(rp, encoding='utf-8').read().splitlines() if l.strip()) if os.path.exists(rp) else {}
    for n, deck, subj in items:
        p = HEAD.format(name=n) + 'Image spec:\n' + subj.strip() + '\n'
        if n.startswith('ship_'):
            p += MOUSE + '\n- The hull is fairly WIDE with a ROOMY flat open deck.\n'
        elif n.startswith(('e_cat', 'boss_admiral', 'boss_fortress')):
            p += CAT + '\n'
        elif n.startswith(('e_rat', 'boss_rival')):
            p += RAT + '\n'
        if deck:
            p += DECK + '\n'
        if n.startswith('crew'):
            p += CREW_CAM + '\n'
        if n == 'title_art':
            pass
        elif n.startswith(('crew', 'items', 'parts', 'ui_', 'sea_deco', 'islands', 'shark_fin')):
            p += GRID + '\n'
        else:
            p += TOP + '\n'
        p += '\n' + STYLE + '\n'
        with open(os.path.join(HERE, f'prompt_{n}.txt'), 'w', encoding='utf-8') as fp:
            fp.write(p)
        refs[n] = ' '.join('-i ' + r for r in refs_for(n))
    with open(rp, 'w', encoding='utf-8') as fp:
        fp.write(''.join(f'{k} {v}\n' for k, v in refs.items()))
    print(len(items), 'prompts')


if __name__ == '__main__':
    main()
