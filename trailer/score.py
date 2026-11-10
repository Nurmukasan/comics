"""Звук трейлера: подложка 110 BPM, шелест перелистываний, удары на смене кадров.
Запуск из папки trailer/:  python3 score.py  →  assets/score.wav"""
import math
import random
import struct
import wave

SR, DUR = 44100, 23.5
N = int(SR * DUR)
buf = [0.0] * N
random.seed(7)

OFFSET = 1.9                              # когда в трейлере начинается съёмка книги
FLIPS = [2.6, 6.8, 11.4, 15.4]            # перелистывания внутри съёмки, с
CUTS = [4.2, 9.2, 13.4, 17.2]             # склейки сегментов внутри съёмки, с
TAGS = [6.3, 9.4, 11.2, 13.9, 15.4, 17.9, 19.2]  # ярлыки глав в трейлере, с


def add(t0, samples):
    i0 = int(t0 * SR)
    for i, v in enumerate(samples):
        j = i0 + i
        if 0 <= j < N:
            buf[j] += v


def kick(g=.55):
    out = []
    for i in range(int(.32 * SR)):
        t = i / SR
        f = 50 + 90 * math.exp(-t * 28)
        out.append(g * math.sin(2 * math.pi * f * t) * math.exp(-t * 9))
    return out


def hat(g=.08):
    return [g * (random.random() * 2 - 1) * math.exp(-i / SR * 90) for i in range(int(.05 * SR))]


def sweep(d, g, f0, f1):
    """шум с плывущим фильтром — шелест страницы или «вжух»"""
    n, out, y, prev = int(d * SR), [], 0.0, 0.0
    for i in range(n):
        t = i / n
        f = f0 * (f1 / f0) ** t
        a = min(1, 2 * math.pi * f / SR)
        y += a * ((random.random() * 2 - 1) - y)
        hp, prev = y - prev, y
        out.append(g * (y * .6 + hp * 1.6) * math.sin(math.pi * t) ** 1.5)
    return out


def boom(g=.8):
    out = []
    for i in range(int(1.1 * SR)):
        t = i / SR
        f = 42 + 60 * math.exp(-t * 6)
        out.append(g * (math.sin(2 * math.pi * f * t) * math.exp(-t * 3.2) + .25 * (random.random() * 2 - 1) * math.exp(-t * 14)))
    return out


def click(g=.25):
    return [g * math.sin(2 * math.pi * 1800 * i / SR) * math.exp(-i / SR * 60) + g * .4 * (random.random() * 2 - 1) * math.exp(-i / SR * 120)
            for i in range(int(.08 * SR))]


def bass(f, d, g=.16):
    return [g * math.tanh(2.2 * math.sin(2 * math.pi * f * i / SR)) * min(1, i / 400) * math.exp(-i / SR * 2.2) for i in range(int(d * SR))]


# подложка: бочка с началом съёмки, хэт с первой секунды, бас через такт
beat, t, k, notes = 60 / 110, 0.0, 0, [55, 55, 65.4, 49]
while t < DUR - 2.0:
    if t > OFFSET:
        add(t, kick(.42 if k % 4 else .5))
    add(t + beat / 2, hat(.05 if t < OFFSET else .07))
    if k % 2 == 0 and t > OFFSET:
        add(t, bass(notes[(k // 4) % 4], beat * 1.8))
    t += beat
    k += 1

add(0.05, boom(.9))                       # заставка: удар заголовка
add(1.68, sweep(.5, .5, 300, 4000))       # круг раскрывается
for s in FLIPS:
    add(OFFSET + s + .15, sweep(.6, .55, 700, 5000))
for s in CUTS:
    add(OFFSET + s, sweep(.25, .35, 2000, 600))
    add(OFFSET + s, kick(.35))
for s in TAGS:
    add(s, click(.22))
add(20.9, boom(.9))                       # финальный экран
add(21.1, click(.3))
add(21.25, click(.25))

peak = max(abs(v) for v in buf) or 1
g = .89 / peak
out = bytearray()
for i, v in enumerate(buf):
    tt = i / SR
    fade = min(1, tt / .02, (DUR - tt) / .6)
    s = math.tanh(v * g * 1.2) / math.tanh(1.2) * fade
    out += struct.pack('<h', int(max(-1, min(1, s)) * 32000))

with wave.open('assets/score.wav', 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(bytes(out))
print('assets/score.wav', DUR, 's')
