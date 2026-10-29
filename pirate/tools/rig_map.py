"""캐릭터 파츠 리깅 (파츠 맵 방식): 통이미지 + 파츠 색 맵 → 파츠 그림 + rig.json
- 통이미지 = 게임에서 쓰는 완성 그림 한 장
- 파츠 색 맵 = ChatGPT 에게 통이미지를 그대로 주고 '같은 그림을 파츠별 단색으로' 칠하게 한 것
  머리(모자 · 귀 · 얼굴) = 빨강, 몸통(옷 · 발) = 파랑, 앞팔(어깨~손) = 초록, 뒷팔 = 노랑, 꼬리 = 하늘색, 손에 든 물건 = 보라(#8000FF), 배경 = 흰색
1) 색 맵을 통이미지 실루엣에 맞춰 놓음 (크기 · 위치 탐색, 실루엣 IoU 최대)
2) 색 맵 영역(조금 깎음)을 씨앗으로, 통이미지의 실제 색 경계를 따라 워터셰드 → 경계가 그림 선에 딱 붙음
3) 파츠마다 한 덩어리 + 구멍 메움 + 톱니 다듬기
4) 파츠 그림 = 통이미지 픽셀 그대로 (쉬는 자세 = 통이미지와 똑같음)
   앞 파츠에 가려진 자리(앞팔 밑의 몸통 등)는 그 파츠의 가까운 픽셀 색으로 채움 (움직일 때 구멍이 안 보이게)
5) 관절: 몸통에 붙은 경계의 가운데 (팔은 경계 중 위쪽 = 어깨), 끝점 = 관절에서 가장 먼 점
결과: pirate/art/rig/<이름>/ (rig_fit.py 와 같은 rig.json 형식 → game.js 그대로), compare.png

사용: python -I pirate/tools/rig_map.py <이름> <통이미지> <파츠 색 맵>
  눈 옮기기는 그 다음에 rig_eye.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rig_fit  # noqa: E402
P = rig_fit.P

COLORS = {'head': (255, 0, 0), 'torso': (0, 0, 255), 'arm_f': (0, 255, 0), 'arm_b': (255, 255, 0), 'tail': (0, 255, 255), 'tool': (128, 0, 255)}
Z = ['tail', 'arm_b', 'torso', 'head', 'tool', 'arm_f']  # 뒤 → 앞. tool(손에 든 칼 · 꽂을대 · 망원경) = 보라, game.js 에서 앞팔을 따라 움직임
ARMS = {'arm_f', 'arm_b'}


def read_map(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    names = list(COLORS)
    ref = np.array([COLORS[n] for n in names])
    d = np.stack([np.abs(a - c).sum(-1) for c in ref])
    lab = np.argmin(d, 0)
    lab[(np.min(d, 0) > 200) | (a.min(-1) > 225)] = -1  # 흰 배경 · 애매한 색
    # 수염 같은 가는 선은 버리고 큰 덩어리만
    keep = ndimage.binary_opening(lab >= 0, iterations=2)
    sil = keep.copy()
    lab[~keep] = -1
    # 색마다 가는 띠는 버림: 빨강 · 파랑이 만나는 경계의 섞인 보라 픽셀이 '도구'로 읽히는 것 등
    for k in range(len(names)):
        m = lab == k
        lab[m & ~ndimage.binary_opening(m, iterations=3)] = -1
    # 버린 자리는 실루엣 안이면 가까운 색으로
    lab = rig_fit.fill_nearest(lab, sil & (lab < 0))
    lab[~sil] = -1
    return lab, names


def align(maplab, alpha):
    """색 맵 실루엣을 통이미지 실루엣에 맞춤 → 통이미지 크기의 라벨
    크기를 넓게 훑고(0.6~1.5배), 크기마다 실루엣 상관(FFT)으로 가장 많이 겹치는 위치를 찾아 IoU 최대"""
    from scipy import signal
    H, W = alpha.shape
    sil = maplab >= 0
    ys, xs = np.nonzero(sil)
    crop = maplab[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    wy, wx = np.nonzero(alpha)
    s0 = np.sqrt(alpha.sum() / max(1, sil.sum()))  # 넓이 비율로 첫 짐작
    A = alpha.astype(np.float32)
    best = None
    for s in np.arange(s0 * 0.75, s0 * 1.3, s0 * 0.02):
        w, h = max(1, round(crop.shape[1] * s)), max(1, round(crop.shape[0] * s))
        im = np.asarray(Image.fromarray((crop + 1).astype(np.uint8)).resize((w, h), Image.NEAREST)).astype(np.int32) - 1
        M = (im >= 0).astype(np.float32)
        ov = signal.fftconvolve(A, M[::-1, ::-1], mode='full')  # ov[y, x] = 겹친 넓이 (맵 왼쪽 위 = (x - w + 1, y - h + 1))
        y, x = np.unravel_index(np.argmax(ov), ov.shape)
        o = ov[y, x]
        iou = o / (A.sum() + M.sum() - o)
        if best is None or iou > best[0]:
            best = (iou, im, s, x - w + 1, y - h + 1)
    iou, im, s, x0, y0 = best
    h, w = im.shape
    out = np.full((H, W), -1, np.int32)
    sx0, sy0, tx0, ty0 = max(0, -x0), max(0, -y0), max(0, x0), max(0, y0)
    tw, th = min(W - tx0, w - sx0), min(H - ty0, h - sy0)
    out[ty0:ty0 + th, tx0:tx0 + tw] = im[sy0:sy0 + th, sx0:sx0 + tw]
    print('맞춤 IoU', round(float(iou), 3), '크기', round(float(s), 3))
    return out


def cell(path, cols, rows, i):
    """시트 그림에서 i 번째 칸 (크기가 달라도 비율로 자름)"""
    im = Image.open(path)
    cw, ch = im.width / cols, im.height / rows
    x, y = (i % cols) * cw, (i // cols) * ch
    return im.crop((round(x), round(y), round(x + cw), round(y + ch)))


def map_cell(path, cols, rows, i):
    """색 맵에서 i 번째 캐릭터: 격자로 자르지 않고 (ChatGPT 맵은 격자가 조금씩 어긋남)
    색이 칠해진 덩어리 중 그 칸 가운데에 가장 가까운 것을 찾아 넉넉히 자름"""
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.int32)
    ink = a.min(-1) < 200  # 흰 배경이 아닌 곳
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=6))
    W, H = im.size
    cx, cy = ((i % cols) + 0.5) * W / cols, ((i // cols) + 0.5) * H / rows
    best, bd = None, 1e18
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (lab[sl] == k).sum()
        if area < W * H / (cols * rows) * 0.05:
            continue
        my, mx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
        d = (mx - cx) ** 2 + (my - cy) ** 2
        if d < bd:
            best, bd = sl, d
    m = 24
    return im.crop((max(0, best[1].start - m), max(0, best[0].start - m), min(W, best[1].stop + m), min(H, best[0].stop + m)))


def main():
    # 한 캐릭터: rig_map.py <이름> <통이미지> <색 맵>
    # 시트 칸:   rig_map.py <시트 이름> <시트 통이미지> <시트 색 맵> <열>,<행> <칸 번호…>  → 이름 = <시트 이름>_<칸>
    if len(sys.argv) > 5:
        sheet, wpath, mpath = sys.argv[1:4]
        cols, rows = map(int, sys.argv[4].split(','))
        tmp = os.path.join(rig_fit.OUT_ROOT, '_tmp')
        os.makedirs(tmp, exist_ok=True)
        for i in map(int, sys.argv[5:]):
            wp, mp = os.path.join(tmp, f'{sheet}_{i}_whole.png'), os.path.join(tmp, f'{sheet}_{i}_map.png')
            cell(wpath, cols, rows, i).save(wp)
            map_cell(mpath, cols, rows, i).save(mp)
            print('==', f'{sheet}_{i}')
            run(f'{sheet}_{i}', wp, mp, keep=0.25)  # 옆 칸에서 넘어온 조각(칼끝 등)은 버림
        return
    run(*sys.argv[1:4])


def run(name, whole_path, map_path, keep=0.05):
    out = os.path.join(rig_fit.OUT_ROOT, name)
    os.makedirs(out, exist_ok=True)
    w0 = P.drop_specks(rig_fit.load(whole_path), keep=keep)
    b = P.bbox(w0[..., 3])
    whole = w0[max(0, b[1] - 8):b[3] + 8, max(0, b[0] - 8):b[2] + 8]
    Wf = whole.astype(np.float32)
    Hi, Wi = whole.shape[:2]
    opaque = whole[..., 3] > 40
    maplab, names = read_map(map_path)
    lab0 = align(maplab, opaque)
    # 몸통 색이 머리 중심보다 위에 있으면 맵 오차(투구 테두리 등) → 머리로. 탑뷰 캐릭터는 몸통이 늘 머리 아래
    hi, ti_ = names.index('head'), names.index('torso')
    if (lab0 == hi).any():
        hy = np.nonzero(lab0 == hi)[0].mean()
        yy = np.arange(lab0.shape[0])[:, None]
        lab0[(lab0 == ti_) & (yy < hy)] = hi
    # 씨앗 = 맵 영역을 깎은 것 (경계 근처는 통이미지 색 경계로 정함)
    n = len(names)
    markers = np.zeros((Hi, Wi), np.int16)
    for k in range(n):
        m = ndimage.binary_erosion(lab0 == k, iterations=4) & opaque
        if m.sum() < 30:
            m = (lab0 == k) & opaque
        markers[m] = k + 1
    markers[~ndimage.binary_dilation(opaque, iterations=1)] = n + 1
    g = sum(np.hypot(ndimage.sobel(Wf[..., c], 0), ndimage.sobel(Wf[..., c], 1)) for c in range(3))
    g = np.clip(g / max(1e-6, np.percentile(g[opaque], 99)) * 255, 0, 255).astype(np.uint8)
    lab = ndimage.watershed_ift(g, markers).astype(np.int32) - 1
    lab[(lab >= n) | ~opaque] = -1
    # 맵에서 너무 멀리 샌 것은 맵대로
    for k in range(n):
        near = ndimage.binary_dilation(lab0 == k, iterations=8)
        bad = (lab == k) & ~near
        lab[bad] = np.where(lab0[bad] >= 0, lab0[bad], -1)
    lab = rig_fit.fill_nearest(lab, opaque & (lab < 0))
    for _ in range(2):
        for k in range(n):
            m = lab == k
            if not m.any():
                continue
            sm = ndimage.binary_opening(m, structure=np.ones((3, 3)), iterations=2)
            if sm.sum() > m.sum() * 0.6:
                lab[m & ~sm] = -1
                m = sm
            cl, cn = ndimage.label(m)
            if cn > 1:
                sizes = ndimage.sum(m, cl, range(1, cn + 1))
                lab[m & (cl != 1 + int(np.argmax(sizes)))] = -1
            lab[ndimage.binary_fill_holes(lab == k) & (lab != k) & opaque] = k
        lab = rig_fit.fill_nearest(lab, opaque & (lab < 0))
    lab[~opaque] = -1
    ti_ = names.index('tool')
    if (lab == ti_).sum() < opaque.sum() * 0.03:  # 손에 든 게 없으면 작은 보라 조각은 맵 오차 → 가까운 파츠로
        lab[lab == ti_] = -1
        lab = rig_fit.fill_nearest(lab, opaque & (lab < 0))
        lab[~opaque] = -1

    idx = {nm: k for k, nm in enumerate(names)}
    torso = lab == idx['torso']
    ty, tx = np.nonzero(torso)
    tc = (tx.mean(), ty.mean())
    rig = {'name': name, 'w': Wi, 'h': Hi, 'parts': [], 'props': []}
    old = os.path.join(out, 'rig.json')
    if os.path.isfile(old):  # 소품(칼 등)과 손으로 고친 값은 남김
        with open(old, encoding='utf-8') as fp:
            rig['props'] = json.load(fp).get('props', [])
    finals = []
    zpos = {nm: i for i, nm in enumerate(Z)}
    for nm in Z:
        k = idx[nm]
        mine = lab == k
        if not mine.any():
            continue
        img = np.zeros((Hi, Wi, 4), np.float32)
        img[mine] = Wf[mine]
        # 앞 파츠에 가려진 자리 채우기: 내 덩어리를 볼록 껍질 쪽으로 조금 넓힌 곳 중 앞 파츠가 덮은 곳
        front = np.zeros_like(mine)
        for nm2 in Z[zpos[nm] + 1:]:
            front |= lab == idx[nm2]
        grow = ndimage.binary_closing(mine | front, iterations=6) & ndimage.binary_dilation(mine, iterations=14) & front
        if nm == 'torso':  # 몸통은 앞팔 밑을 넉넉히
            grow |= front & (lab == idx['arm_f'])
        if grow.any():
            _, (iy, ix) = ndimage.distance_transform_edt(~mine, return_indices=True)
            img[grow] = Wf[iy[grow], ix[grow]]
            img[grow, 3] = 255
        a = img[..., 3] > 20
        ys, xs = np.nonzero(a)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = img[y0:y1, x0:x1].astype(np.uint8)
        # 관절
        if nm == 'torso':
            px, py = tc[0] - x0, tc[1] - y0
        else:
            # 붙어 있는 다른 파츠(몸통 · 머리 · 팔) 경계 = 관절 자리 (꼬리가 몸통 대신 팔에 붙어 있어도 됨)
            other = opaque & ~mine
            border = mine & ndimage.binary_dilation(other, iterations=2)
            by, bx = np.nonzero(border) if border.any() else np.nonzero(mine)
            if nm in ARMS:  # 팔은 경계 중 위쪽 20% (어깨)
                cut = np.percentile(by, 20)
                sel = by <= cut
                by, bx = by[sel], bx[sel]
            px, py = bx.mean() - x0, by.mean() - y0
        ay, ax = np.nonzero(crop[..., 3] > 128)
        j = np.argmax((ax - px) ** 2 + (ay - py) ** 2)
        fn = f'{nm}.png'
        Image.fromarray(crop).save(os.path.join(out, fn))
        finals.append((nm, crop, int(x0), int(y0)))
        rig['parts'].append({'name': nm, 'img': fn, 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'px': round(float(px), 1), 'py': round(float(py), 1),
                             'tx': int(ax[j]), 'ty': int(ay[j]), 'z': len(rig['parts']), 'own': int(mine.sum()), 'fill': int(grow.sum()), 'err': 0})
    with open(old, 'w', encoding='utf-8') as fp:
        json.dump(rig, fp, ensure_ascii=False, indent=1)
    Image.fromarray(whole).save(os.path.join(out, 'whole.png'))
    # 비교: 통이미지 | 조립 | 파츠 구역(+관절) | 흩어 놓은 파츠
    S = 2
    asm = Image.new('RGBA', (Wi, Hi), (0, 0, 0, 0))
    for _, crop, x0, y0 in finals:
        asm.alpha_composite(Image.fromarray(crop), (x0, y0))
    tint = np.zeros((Hi, Wi, 4), np.uint8)
    for nm, c in COLORS.items():
        tint[lab == idx[nm]] = (*[int(v * 0.8) for v in c], 255)
    tint = Image.fromarray(tint)
    dp = ImageDraw.Draw(tint)
    for p in rig['parts']:
        cx, cy = p['x'] + p['px'], p['y'] + p['py']
        dp.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(255, 255, 255), outline=(0, 0, 0))
    OFF = {'tail': (-22, 0), 'arm_b': (18, 6), 'torso': (0, 14), 'head': (0, -22), 'arm_f': (-10, 30), 'tool': (20, 34)}
    ex = Image.new('RGBA', (Wi + 60, Hi + 60), (0, 0, 0, 0))
    for nm, crop, x0, y0 in finals:
        o = OFF.get(nm, (0, 0))
        ex.alpha_composite(Image.fromarray(crop), (x0 + 30 + o[0], y0 + 30 + o[1]))
    panels = [Image.fromarray(whole), asm, tint, ex]
    Wt = sum(p.width for p in panels) * S + 50
    bg = Image.new('RGB', (Wt, (Hi + 60) * S + 20), (60, 60, 60))
    x = 10
    for p in panels:
        q = p.convert('RGBA').resize((p.width * S, p.height * S), Image.LANCZOS)
        bg.paste(q, (x, 10), q)
        x += q.width + 10
    bg.save(os.path.join(out, 'compare.png'))
    a = np.asarray(asm).astype(np.float32)
    match = float(((np.abs(a - Wf).sum(-1) < 120) & (opaque | (a[..., 3] > 128))).sum() / max(1, (opaque | (a[..., 3] > 128)).sum()))
    print('일치율', round(match * 100, 1), '% · 파츠', [(p['name'], p['own'], p['fill']) for p in rig['parts']])
    rig_fit.bundle()


if __name__ == '__main__':
    main()
