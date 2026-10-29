"""Codex 가 만든 그림을 로그에서 찾아 가져옴
Codex 는 그림을 ~/.codex/generated_images 에 만들고, 프로젝트로 복사하는 단계가 윈도 샌드박스 때문에 자주 실패함
사용: python -I pirate/tools/codex_pull.py <폴더> <로그 접두어> <결과 접미어> 이름...
  예: codex_pull.py pirate/art/src/rig log_map_ _map crew_rat crew_cat   → log_map_crew_rat.txt 에서 찾아 crew_rat_map.png 로
"""
import os
import re
import shutil
import sys

HOME = os.path.join(os.path.expanduser('~'), '.codex')


def main():
    d, pre, suf = sys.argv[1:4]
    for n in sys.argv[4:]:
        out = os.path.join(d, f'{n}{suf}.png')
        if os.path.exists(out) and os.path.getsize(out) > 0:
            print('있음', n)
            continue
        log = open(os.path.join(d, f'{pre}{n}.txt'), encoding='utf-8', errors='ignore').read()
        found = re.findall(r'generated_images[\\/]+[^\'" ]+?\.png', log)
        if not found:
            print('로그에 경로 없음', n)
            continue
        rel = re.sub(r'[\\/]+', '/', found[-1])
        src = os.path.join(HOME, *rel.split('/'))
        if os.path.exists(src):
            shutil.copy(src, out)
            print('가져옴', n)
        else:
            print('파일 없음', n, src)


if __name__ == '__main__':
    main()
