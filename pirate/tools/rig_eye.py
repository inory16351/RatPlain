"""눈을 머리 파츠에서 떼어 따로 파츠로 만들고(깜빡임용), 원하는 자리로 옮김
- 머리 그림에서 눈(어두운 작은 덩어리 + 흰 반짝임)을 잘라 eye.png 로 저장
- 눈이 있던 자리는 둘레 털 색(중앙값)으로 메움
- rig.json 에 'eye' 파츠 추가 (부모 = head, game.js 의 PARENT)
rig_fit.py 를 다시 돌리면 머리가 새로 만들어지므로 이것도 다시 돌릴 것

사용: python -I pirate/tools/rig_eye.py <이름> <지금 눈 x,y | auto> <옮길 자리 x,y>   (통이미지 좌표)
  예: rig_eye.py captain auto 320,164
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig_fit  # noqa: E402


def main():
    # 좌표는 통이미지 기준 (머리 파츠를 다시 잘라도 그대로 씀). 지금 눈 = 'auto' 면 머리 오른쪽의 작고 둥근 어두운 덩어리
    name = sys.argv[1]
    src, dst = sys.argv[2], sys.argv[3]
    d = os.path.join(rig_fit.OUT_ROOT, name)
    with open(os.path.join(d, 'rig.json'), encoding='utf-8') as fp:
        rig = json.load(fp)
    rig['parts'] = [p for p in rig['parts'] if p['name'] != 'eye']
    head = next(p for p in rig['parts'] if p['name'] == 'head')
    im = np.asarray(Image.open(os.path.join(d, head['img'])).convert('RGBA')).copy()
    H, W = im.shape[:2]
    from scipy import ndimage
    if src == 'auto':
        dark = (im[..., :3].mean(-1) < 70) & (im[..., 3] > 128)
        lab, n = ndimage.label(dark)
        cands = []
        for i in range(1, n + 1):
            m = lab == i
            ar = m.sum()
            ys_, xs_ = np.nonzero(m)
            hh, ww = np.ptp(ys_) + 1, np.ptp(xs_) + 1
            if 40 < ar < 400 and 0.6 < hh / ww < 1.6 and ar / (hh * ww) > 0.55 and xs_.mean() > W * 0.55:
                cands.append((xs_.mean(), xs_.mean(), ys_.mean()))
        _, ex, ey = max(cands)
        ex, ey = int(round(ex)), int(round(ey))
    else:
        ex, ey = (int(v) - o for v, o in zip(src.split(','), (head['x'], head['y'])))
    nx, ny = (int(v) - o for v, o in zip(dst.split(','), (head['x'], head['y'])))
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.hypot(xx - ex, yy - ey)
    lum = im[..., :3].mean(-1)
    # 눈 = 반지름 11 안의 어두운 픽셀 + 흰 반짝임, 가장자리 1px 넓힘
    eye = (r < 11) & ((lum < 90) | (lum > 225)) & (im[..., 3] > 128)
    eye = ndimage.binary_dilation(eye, iterations=1) & (r < 13)
    ys, xs = np.nonzero(eye)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    crop = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    sub = eye[y0:y1, x0:x1]
    crop[sub] = im[y0:y1, x0:x1][sub]
    Image.fromarray(crop).save(os.path.join(d, 'eye.png'))
    # 털 색으로 메움: 둘레 고리(반지름 14~20)의 중앙값, 경계는 살짝 흐리게
    ring = (r > 14) & (r < 20) & (im[..., 3] > 128) & (lum > 90) & (lum < 225)
    fur = np.median(im[ring][:, :3], 0).astype(np.uint8)
    fill = ndimage.binary_dilation(eye, iterations=2) & (im[..., 3] > 128)
    im[fill, :3] = fur
    soft = np.asarray(Image.fromarray(im).filter(ImageFilter.GaussianBlur(1.5)))
    edge = ndimage.binary_dilation(fill, iterations=2)
    im[edge, :3] = soft[edge, :3]
    Image.fromarray(im).save(os.path.join(d, head['img']))
    # 새 자리 (통이미지 좌표)
    cx, cy = (x1 - x0) / 2, (y1 - y0) / 2
    part = {'name': 'eye', 'img': 'eye.png', 'x': int(head['x'] + nx - cx), 'y': int(head['y'] + ny - cy), 'w': int(x1 - x0), 'h': int(y1 - y0),
            'px': round(cx, 1), 'py': round(cy, 1), 'tx': int(cx), 'ty': int(cy), 'z': head['z'] + 0.5, 'own': int(eye.sum()), 'fill': 0, 'err': 0}
    rig['parts'].append(part)
    rig['parts'].sort(key=lambda p: p['z'])
    with open(os.path.join(d, 'rig.json'), 'w', encoding='utf-8') as fp:
        json.dump(rig, fp, ensure_ascii=False, indent=1)
    rig_fit.bundle()
    print('눈', (ex, ey), '→', (nx, ny), '털색', fur.tolist(), '눈 크기', part['w'], part['h'])


if __name__ == '__main__':
    main()
