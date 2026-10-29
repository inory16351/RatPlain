"""캐릭터 파츠 리깅: 통이미지(완성된 한 장)와 파츠 시트를 비교하면서 조립 위치를 찾음
- 파츠 시트 = ChatGPT 가 통이미지를 보고 같은 크기로 분해해 그린 그림 (왼쪽 위 = 참조용 통이미지, 나머지 = 머리 · 몸통 · 팔 · 꼬리 …)
- 파츠마다 통이미지 위에서 가장 잘 맞는 자리(위치 · 크기)를 찾음 (마스크 SSD 템플릿 매칭, FFT)
- 보이는 비율로 앞뒤 순서, 몸통 중심에 가장 가까운 점으로 관절(피벗)을 정함
- 결과: pirate/art/rig/<이름>/ 에 파츠 PNG + rig.json, 비교 그림 compare.png (통이미지 | 조립 | 차이)

사용: python -I pirate/tools/rig_fit.py <이름> <파츠 시트.png> [이름표: head,torso,... 순서는 1차 실행 결과 번호대로]
  1차: 이름표 없이 → 번호 붙은 parts_index.png 를 보고 이름을 정함
  2차: 이름표를 주면 rig.json 에 이름이 들어감
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools'))
import prep as P  # noqa: E402

OUT_ROOT = os.path.join(HERE, '..', 'art', 'rig')
TUCK_BEHIND_TORSO = {'tail'}  # 몸통(옷) 뒤로 들어가야 하는 파츠


def components(rgba, min_area=600):
    a = rgba[..., 3] > 60
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=6))  # 수염 같은 가는 부분이 떨어지지 않게 조금 붙여서 묶음
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = (lab[sl] == i) & a[sl]
        if m.sum() < min_area:
            continue
        crop = rgba[sl].copy()
        crop[..., 3] = np.where(m, crop[..., 3], 0)
        out.append({'x': sl[1].start, 'y': sl[0].start, 'img': crop, 'area': int(m.sum())})
    return out


def load(path):
    """마젠타 배경이면 마젠타를 빼고, 이미 투명 배경이면 알파를 씀 (반투명 번짐 · 색 얼룩은 버림)"""
    im = Image.open(path)
    if im.mode == 'RGBA' and (np.asarray(im)[..., 3] < 10).mean() > 0.2:
        a = np.asarray(im).copy()
        a[..., 3] = np.where(a[..., 3] > 200, 255, 0)
        return a
    return P.key_magenta(im)


def fit(part, whole, scales=None):
    if scales is None:  # 거칠게 → 가장 좋은 크기 둘레를 촘촘히
        coarse = fit(part, whole, [round(s, 2) for s in np.arange(0.3, 1.31, 0.1)])
        return fit(part, whole, [round(coarse[2] + d, 3) for d in (-0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06)])
    return fit_at(part, whole, scales)


def fit_at(part, whole, scales):
    """part 를 whole 위에 놓을 자리 (x, y, scale, 오차). 마스크 SSD: Σ m·|p − w|² + 바깥(통이미지 투명) 벌점"""
    W = whole.astype(np.float32) / 255
    wa = W[..., 3:4]
    wrgb = W[..., :3] * wa + (1 - wa) * np.array([1.0, 0.0, 1.0])  # 투명 = 마젠타 → 바깥에 놓이면 크게 틀림
    best = None
    for s in scales:
        im = Image.fromarray(part)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        p = np.asarray(im).astype(np.float32) / 255
        m = (p[..., 3] > 0.5).astype(np.float32)
        if p.shape[0] > W.shape[0] or p.shape[1] > W.shape[1]:
            continue
        ssd = np.zeros((W.shape[0] - p.shape[0] + 1, W.shape[1] - p.shape[1] + 1), np.float32)
        for c in range(3):
            pc = p[..., c] * m
            wc = wrgb[..., c]
            ssd += signal.fftconvolve(wc ** 2, m[::-1, ::-1], mode='valid') - 2 * signal.fftconvolve(wc, pc[::-1, ::-1], mode='valid') + (pc ** 2).sum()
        ssd /= m.sum()
        y, x = np.unravel_index(np.argmin(ssd), ssd.shape)
        if best is None or ssd[y, x] < best[3]:
            best = (int(x), int(y), s, float(ssd[y, x]), np.asarray(im))
    return best


def fill_nearest(lab, todo):
    """todo 자리를 가장 가까운 (lab ≥ 0) 값으로 채움"""
    if not todo.any() or not (lab >= 0).any():
        return lab
    _, (iy, ix) = ndimage.distance_transform_edt(lab < 0, return_indices=True)
    return np.where(todo, lab[iy, ix], lab)


def segment(order, Wf):
    """통이미지를 파츠별 덩어리로 나눔 (픽셀마다 주인 파츠 번호, 배경 = -1)
    1) 씨앗: 맞춘 파츠 색과 거의 같고, 두 번째로 맞는 파츠보다 확실히 더 맞는 픽셀만
    2) 워터셰드: 씨앗에서 색 경계(그라디언트)를 따라 퍼짐 → 경계가 그림의 선을 따라감
    3) 파츠마다 맞춘 실루엣(조금 넓힘) 밖으로 새면 잘라 냄
    4) 파츠마다 가장 큰 한 덩어리만 남기고 구멍은 메움, 남은 자투리는 가장 가까운 파츠로
    """
    n = len(order)
    opaque = Wf[..., 3] > 40
    D = np.stack([f['diff'] for f in order])
    srt = np.sort(D, 0)
    best = np.argmin(D, 0)
    second = srt[1] if n > 1 else np.full_like(srt[0], np.inf)
    seed = opaque & (srt[0] < 45) & ((second - srt[0]) > 60)
    seed = ndimage.binary_erosion(seed, iterations=1)
    markers = np.zeros(opaque.shape, np.int16)
    markers[seed] = best[seed] + 1
    markers[~ndimage.binary_dilation(opaque, iterations=1)] = n + 1  # 배경
    # 색 경계: RGB 각 채널 소벨 크기 합
    g = sum(np.hypot(ndimage.sobel(Wf[..., c], 0), ndimage.sobel(Wf[..., c], 1)) for c in range(3))
    g = np.clip(g / max(1e-6, np.percentile(g[opaque], 99)) * 255, 0, 255).astype(np.uint8)
    lab = ndimage.watershed_ift(g, markers).astype(np.int32) - 1
    lab[(lab >= n) | ~opaque] = -1
    for k, f in enumerate(order):  # 실루엣 밖으로 샌 것
        allowed = ndimage.binary_dilation(f['full'][..., 3] > 128, iterations=10)
        lab[(lab == k) & ~allowed] = -1
    lab = fill_nearest(lab, opaque & (lab < 0))
    for _ in range(2):
        for k in range(n):
            m = lab == k
            if not m.any():
                continue
            # 가는 삐침 · 톱니 가장자리는 이웃 파츠로 (움직일 때 조각이 떨어져 보이지 않게)
            sm = ndimage.binary_opening(m, structure=np.ones((3, 3)), iterations=3)
            if sm.sum() > m.sum() * 0.6:
                lab[m & ~sm] = -1
                m = sm
            cl, cn = ndimage.label(m)
            if cn > 1:
                sizes = ndimage.sum(m, cl, range(1, cn + 1))
                keep = cl == (1 + int(np.argmax(sizes)))
                lab[m & ~keep] = -1
            hole = ndimage.binary_fill_holes(lab == k) & (lab != k) & opaque
            lab[hole] = k
        lab = fill_nearest(lab, opaque & (lab < 0))
    lab[~opaque] = -1
    return lab


def main():
    # 사용: rig_fit.py <이름> <파츠 시트> <통이미지> [이름표]
    name, sheet, whole_path = sys.argv[1], sys.argv[2], sys.argv[3]
    labels = sys.argv[4].split(',') if len(sys.argv) > 4 else None
    out = os.path.join(OUT_ROOT, name)
    os.makedirs(out, exist_ok=True)
    rgba = load(sheet)
    comps = components(rgba, min_area=2500)
    # 시트 왼쪽 위의 참조 통이미지는 버림 (게임에서 쓰는 통이미지에 맞춤)
    H, Wd = rgba.shape[:2]
    tl = [c for c in comps if c['x'] < Wd / 2 and c['y'] < H / 2]
    ref = min(tl, key=lambda c: c['x'] + c['y'])
    parts = [c for c in comps if c is not ref]
    parts.sort(key=lambda c: (round(c['y'] / (H / 6)), c['x']))  # 읽는 순서
    w0 = P.drop_specks(load(whole_path), keep=0.05)
    b = P.bbox(w0[..., 3])
    whole = w0[max(0, b[1] - 8):b[3] + 8, max(0, b[0] - 8):b[2] + 8]
    # 번호표
    idx = Image.fromarray(rgba).convert('RGB')
    d = ImageDraw.Draw(idx)
    for i, c in enumerate(parts):
        d.rectangle([c['x'], c['y'], c['x'] + c['img'].shape[1], c['y'] + c['img'].shape[0]], outline=(0, 0, 0), width=3)
        d.text((c['x'] + 6, c['y'] + 4), str(i), fill=(0, 0, 0))
    idx.save(os.path.join(out, 'parts_index.png'))
    # 맞추기 (이름이 *로 시작 = 소품: 통이미지에 없으니 맞추지 않고 그대로 저장, 게임에서 손에 붙임)
    lab_of = lambda i: labels[i] if labels and i < len(labels) else f'p{i}'
    fits, props = [], []
    # 짝 파츠(양팔 · 양발)는 먼저 맞춘 쪽 자리를 지운 뒤 다음 쪽을 맞춤 (둘이 같은 팔에 몰리는 것 방지)
    PAIR = {'arm_f': 'arm', 'arm_b': 'arm', 'foot': 'foot', 'foot2': 'foot'}
    works = {}
    todo = sorted(range(len(parts)), key=lambda i: -parts[i]['area'])
    for i in todo:
        c = parts[i]
        if lab_of(i).startswith('*') or lab_of(i) == '-':
            if lab_of(i) != '-':
                props.append({'name': lab_of(i)[1:], 'im': c['img']})
            continue
        grp = PAIR.get(lab_of(i))
        work = works.setdefault(grp, whole.copy()) if grp else whole
        x, y, s, err, im = fit(c['img'], work)
        fits.append({'i': i, 'name': lab_of(i), 'x': x, 'y': y, 's': s, 'err': round(err, 4), 'im': im})
        print(i, lab_of(i), 'at', x, y, 'scale', s, 'err', round(err, 4))
        if grp:
            h, w = im.shape[:2]
            reg = work[y:y + h, x:x + w]
            same = (im[..., 3] > 128) & (np.abs(im[..., :3].astype(np.int32) - reg[..., :3].astype(np.int32)).sum(-1) < 90)
            reg[same] = (255, 0, 255, 0)
    fits.sort(key=lambda f: f['i'])
    # 팔 두 개: 통이미지에서 더 많이 보이는 쪽을 앞팔(arm_f)로
    arms = [f for f in fits if f['name'] in ('arm_f', 'arm_b')]
    Wf = whole.astype(np.float32)
    Wi, Hi = whole.shape[1], whole.shape[0]
    # 앞뒤 순서: 이름으로 정해 둔 순서, 모르는 이름은 보이는 비율 순
    Z = {'tail': 0, 'foot': 1, 'foot2': 1.1, 'arm_b': 2, 'torso': 3, 'head': 4, 'arm_f': 5}
    for f in fits:
        p = f['im'].astype(np.float32)
        h, w = p.shape[:2]
        m = p[..., 3] > 128
        diff = np.abs(p[..., :3] - Wf[f['y']:f['y'] + h, f['x']:f['x'] + w, :3]).sum(-1)
        f['vis'] = float(((diff < 60) & m).sum() / max(1, m.sum()))
        f['z'] = Z.get(f['name'], 2.5 + f['vis'])
        # 통이미지 좌표 캔버스에 놓기
        full = np.zeros((Hi, Wi, 4), np.float32)
        y0, x0 = f['y'], f['x']
        full[y0:y0 + h, x0:x0 + w] = p[:Hi - y0, :Wi - x0]
        f['full'] = full
        f['diff'] = np.where(full[..., 3] > 128, np.abs(full[..., :3] - Wf[..., :3]).sum(-1), np.inf)
    if len(arms) == 2:
        a0, a1 = sorted(arms, key=lambda f: -f['vis'] * (f['full'][..., 3] > 128).sum())
        a0['name'], a1['name'] = 'arm_f', 'arm_b'
        a0['z'], a1['z'] = Z['arm_f'], Z['arm_b']
    order = sorted(fits, key=lambda f: f['z'])
    owner = segment(order, Wf)
    # 파츠 최종 그림: 내 자리 = 통이미지 픽셀(쉬는 자세에서 통이미지와 똑같음), 나보다 앞 파츠에 가려진 자리 = GPT 파츠로 채움(움직이면 드러나는 곳)
    torso = next((f for f in order if f['name'] == 'torso'), max(order, key=lambda f: (owner == order.index(f)).sum()))
    ti = order.index(torso)
    # 꼬리는 옷 뒤로: 통이미지에서 꼬리가 옷(몸통 실루엣) 위에 그려진 자리는 몸통 것으로 바꾸고 GPT 몸통(옷) 픽셀로 다시 칠함
    repaint = np.zeros(owner.shape, bool)
    for k, f in enumerate(order):
        if f['name'] in TUCK_BEHIND_TORSO:
            inside = ndimage.binary_erosion(torso['full'][..., 3] > 128, iterations=2) & (owner == k)
            owner[inside] = ti
            repaint |= inside
    if repaint.any():
        print('옷 뒤로 넣은 꼬리 픽셀', int(repaint.sum()))
    ty, tx = np.nonzero(owner == ti)
    tc = (tx.mean(), ty.mean())
    rig = {'name': name, 'w': Wi, 'h': Hi, 'parts': [], 'props': []}
    finals = []
    for k, f in enumerate(order):
        img = np.zeros((Hi, Wi, 4), np.float32)
        mine = owner == k
        img[mine] = Wf[mine]
        rp = mine & repaint
        img[rp] = f['full'][rp]
        fill = (f['full'][..., 3] > 128) & ~mine & (owner > k)
        img[fill] = f['full'][fill]
        img[..., 3] = np.where(fill, 255, img[..., 3])
        a = img[..., 3] > 20
        if not a.any():
            continue
        ys, xs = np.nonzero(a)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = img[y0:y1, x0:x1].astype(np.uint8)
        if f is torso:
            px, py = tc[0] - x0, tc[1] - y0
        else:  # 관절 = 내 픽셀 중 몸통 중심에 가장 가까운 점
            my, mx = np.nonzero(mine) if mine.any() else (ys, xs)
            j = np.argmin((mx - tc[0]) ** 2 + (my - tc[1]) ** 2)
            px, py = float(mx[j] - x0), float(my[j] - y0)
        # 끝점(손 · 꼬리 끝) = 관절에서 가장 먼 점 → 소품을 쥐는 자리
        ay, ax = np.nonzero(crop[..., 3] > 128)
        j = np.argmax((ax - px) ** 2 + (ay - py) ** 2)
        fn = f'{f["name"]}.png'
        Image.fromarray(crop).save(os.path.join(out, fn))
        finals.append((crop, int(x0), int(y0)))
        rig['parts'].append({'name': f['name'], 'img': fn, 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'px': round(float(px), 1), 'py': round(float(py), 1),
                             'tx': int(ax[j]), 'ty': int(ay[j]), 'z': len(rig['parts']), 'own': int(mine.sum()), 'fill': int(fill.sum()), 'err': f['err']})
    hand = next((f for f in fits if f['name'] == 'arm_f'), None)
    for pr in props:
        fn = f'{pr["name"]}.png'
        Image.fromarray(pr['im']).save(os.path.join(out, fn))
        # 쥐는 자리(grip) 기본값 = 가운데. 칼처럼 손잡이가 끝에 있으면 rig.json 에서 gx · gy · rot · scale 을 고쳐 씀 (다시 돌려도 유지)
        rig['props'].append({'name': pr['name'], 'img': fn, 'w': pr['im'].shape[1], 'h': pr['im'].shape[0], 'scale': round(float(hand['s'] if hand else np.mean([f['s'] for f in fits])), 3),
                             'gx': pr['im'].shape[1] / 2, 'gy': pr['im'].shape[0] / 2, 'rot': 0})
    old = os.path.join(out, 'rig.json')
    if os.path.isfile(old):  # 손으로 고친 grip · rot 은 남김
        with open(old, encoding='utf-8') as fp:
            prev = {p['name']: p for p in json.load(fp).get('props', [])}
        for p in rig['props']:
            if p['name'] in prev:
                p.update({k: prev[p['name']][k] for k in ('gx', 'gy', 'rot', 'scale') if k in prev[p['name']]})
    with open(os.path.join(out, 'rig.json'), 'w', encoding='utf-8') as fp:
        json.dump(rig, fp, ensure_ascii=False, indent=1)
    Image.fromarray(whole).save(os.path.join(out, 'whole.png'))
    # 비교: 통이미지 | 조립 | 차이 (빨강 = 다름) | 피벗 + 파츠 경계 색칠
    asm = Image.new('RGBA', (Wi, Hi), (0, 0, 0, 0))
    for crop, x0, y0 in finals:
        asm.alpha_composite(Image.fromarray(crop), (x0, y0))
    COL = [(230, 90, 90), (90, 170, 90), (90, 120, 230), (220, 180, 60), (180, 90, 200), (60, 190, 190), (240, 140, 60), (150, 150, 150)]
    tint = np.zeros((Hi, Wi, 4), np.uint8)
    for k in range(len(order)):
        tint[owner == k] = (*COL[k % len(COL)], 255)
    a = np.asarray(asm).astype(np.float32)
    dif = np.abs(a - Wf).sum(-1)
    diffimg = np.full((Hi, Wi, 3), 235, np.uint8)
    diffimg[(Wf[..., 3] > 128) | (a[..., 3] > 128)] = (200, 200, 200)
    diffimg[dif > 120] = (220, 40, 40)
    piv = Image.fromarray(tint)
    dp = ImageDraw.Draw(piv)
    for pr in rig['parts']:
        cx, cy = pr['x'] + pr['px'], pr['y'] + pr['py']
        dp.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline=(0, 120, 255), width=3)
        dp.text((cx + 8, cy - 6), pr['name'], fill=(0, 60, 160))
    bg = Image.new('RGB', (Wi * 4 + 50, Hi + 20), (60, 110, 150))
    for k, im in enumerate([Image.fromarray(whole), asm, Image.fromarray(diffimg), piv]):
        im = im.convert('RGBA')
        bg.paste(im, (10 + k * (Wi + 10), 10), im)
    bg.save(os.path.join(out, 'compare.png'))
    match = float(((dif < 120) & ((Wf[..., 3] > 128) | (a[..., 3] > 128))).sum() / max(1, ((Wf[..., 3] > 128) | (a[..., 3] > 128)).sum()))
    print('일치율', round(match * 100, 1), '%  →', os.path.join(out, 'compare.png'))
    bundle()


def bundle():
    """art/rig/*/rig.json → art/rig/rigs.js (window.RIGS, 게임이 읽음)"""
    rigs = {}
    for d in sorted(os.listdir(OUT_ROOT)):
        if d.startswith('_'):
            continue
        p = os.path.join(OUT_ROOT, d, 'rig.json')
        if os.path.isfile(p):
            with open(p, encoding='utf-8') as fp:
                r = json.load(fp)
            for pr in r['parts'] + r.get('props', []):
                pr['src'] = f'art/rig/{d}/{pr["img"]}'
            rigs[d] = r
    with open(os.path.join(OUT_ROOT, 'rigs.js'), 'w', encoding='utf-8') as fp:
        fp.write('window.RIGS = ' + json.dumps(rigs, ensure_ascii=False) + ';\n')


if __name__ == '__main__':
    main()
