"""효과음 합성 → audio/sfx/*.wav (44.1kHz 16bit 모노)

BGM 은 Gemini 음악 만들기로 받아 audio/bgm/ 에 둠. 효과음은 짧고 많이 겹쳐 울려서 코드로 만듦.
소리를 바꾸려면 아래 함수의 숫자만 고치고 다시 실행.

사용: python -I tools/sfx.py
"""
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'audio', 'sfx')
SR = 44100
rng = np.random.default_rng(7)  # 매번 같은 소리


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a=0.005, curve=4.0):
    """빠른 어택 + 지수 감쇠"""
    t = np.linspace(0, 1, n)
    e = np.exp(-curve * t)
    k = max(1, int(SR * a))
    e[:k] *= np.linspace(0, 1, k)
    return e


def sweep(f0, f1, dur, wave_='sine'):
    """f0 → f1 로 미끄러지는 음"""
    t = t_(dur)
    f = np.geomspace(f0, f1, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == 'square':
        return np.sign(np.sin(ph)) * 0.6
    if wave_ == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def noise(dur, lp=1.0):
    """lp(0~1) 이 작을수록 낮은 소리 (한 줄 저역 통과)"""
    x = rng.standard_normal(int(SR * dur))
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += lp * (v - acc)
        y[i] = acc
    return y / (np.abs(y).max() + 1e-9)


def notes(freqs, step, dur_each, wave_='tri'):
    """짧은 음을 차례로 (줍기 · 팡파레)"""
    out = np.zeros(int(SR * (step * (len(freqs) - 1) + dur_each)))
    for i, f in enumerate(freqs):
        s = sweep(f, f, dur_each, wave_) * env(int(SR * dur_each), curve=5)
        k = int(SR * step * i)
        out[k:k + len(s)] += s
    return out


def save(name, x, gain=0.8):
    x = x / (np.abs(x).max() + 1e-9) * gain
    k = int(SR * 0.004)  # 끝 딸깍 방지
    x[-k:] *= np.linspace(1, 0, k)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(name, f'{len(x) / SR:.2f}s')


def main():
    # 플레이어 사격: 짧고 가벼운 퓽 (자주 울리니 작게)
    d = 0.09
    save('shoot', sweep(1400, 500, d, 'square') * env(int(SR * d), curve=6) + 0.3 * noise(d, 0.5) * env(int(SR * d), curve=12), 0.45)
    # 적 탄 발사: 낮은 뿅
    d = 0.12
    save('enemy_shoot', sweep(600, 300, d, 'tri') * env(int(SR * d), curve=5), 0.4)
    # 적 피격: 딱
    d = 0.06
    save('hit', noise(d, 0.6) * env(int(SR * d), curve=10) + 0.5 * sweep(900, 600, d) * env(int(SR * d), curve=8), 0.5)
    # 플레이어 피격: 둔탁한 쿵 + 찌릿
    d = 0.3
    save('hurt', sweep(220, 70, d, 'square') * env(int(SR * d), curve=5) + 0.6 * noise(d, 0.3) * env(int(SR * d), curve=8), 0.8)
    # 폭발 (작은 적): 저역 노이즈 펑
    d = 0.5
    save('explode', noise(d, 0.12) * env(int(SR * d), curve=5) + 0.7 * sweep(120, 40, d) * env(int(SR * d), curve=6), 0.85)
    # 큰 폭발 (보스 격파): 길게 울리는 쾅
    d = 1.6
    big = noise(d, 0.06) * env(int(SR * d), a=0.01, curve=3) + 0.8 * sweep(90, 30, d) * env(int(SR * d), curve=3)
    big[int(SR * 0.25):] += 0.6 * noise(d - 0.25, 0.1) * env(int(SR * (d - 0.25)), curve=4)
    save('explode_big', big, 0.95)
    # 줍기: 톱니 = 딸깍딸깍, 코인 = 띠링, 렌치 = 위로 오르는 3음
    save('pickup_gear', notes([880, 1320], 0.05, 0.08, 'square'), 0.4)
    save('pickup_coin', notes([1318.5, 1975.5], 0.07, 0.25, 'sine'), 0.5)
    save('pickup_heal', notes([523.3, 659.3, 784.0, 1046.5], 0.07, 0.18, 'tri'), 0.5)
    # 부스트: 쉬익 올라가는 바람
    d = 0.45
    n = noise(d, 0.25)
    save('boost', n * np.sin(np.linspace(0, np.pi, len(n))) + 0.3 * sweep(200, 600, d, 'tri') * env(int(SR * d), curve=2), 0.55)
    # 예고 (번개 · 광선 붉은 점선): 경고 삐삐
    save('warn', notes([1046.5, 1046.5], 0.16, 0.12, 'square'), 0.4)
    # 번개 · 광선 터짐: 찌지직
    d = 0.5
    crack = noise(d, 0.9) * env(int(SR * d), curve=4) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 37 * t_(d))))
    save('zap', crack + 0.5 * sweep(300, 60, d, 'square') * env(int(SR * d), curve=5), 0.75)
    # 보스 등장: 낮은 경고음 두 번
    d = 0.7
    horn = (sweep(110, 110, d, 'square') + 0.5 * sweep(165, 165, d, 'square')) * env(int(SR * d), a=0.05, curve=2)
    save('boss_appear', np.concatenate([horn, np.zeros(int(SR * 0.12)), horn]), 0.7)
    # 웨이브 · 스테이지 클리어: 짧은 팡파레 / 추락: 내려가는 음
    save('clear', notes([523.3, 659.3, 784.0, 1046.5, 784.0, 1046.5], 0.11, 0.3, 'square'), 0.5)
    save('fail', notes([392.0, 349.2, 311.1, 261.6], 0.2, 0.4, 'tri'), 0.6)
    # UI 버튼: 톡
    d = 0.05
    save('ui_click', sweep(1200, 900, d, 'sine') * env(int(SR * d), curve=8), 0.4)
    save('ui_buy', notes([784.0, 1174.7, 1568.0], 0.06, 0.15, 'sine'), 0.5)


if __name__ == '__main__':
    main()
