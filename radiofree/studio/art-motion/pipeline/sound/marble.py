"""The MARBLE RUN kit (first used by The Round Trip, 18 Nov): the machine kit's sound. Per SOUND.md, "Sound per film".
Circular money as a wooden marble run: rolls, clacks, coin chimes, and a xylophone that never stops going round.
All synthesised.

    Marble           the series: 120 BPM, D major with a raised fourth (a curious, busy machine); a warm wooden room
    roll(d, seed)    a marble rolling in a tube: a low rumble with a fast tick of the joins
    clack(k)         wood on wood: a track junction or a gate
    coin(k)          a coin dropping onto a stack: a bright metal ring
    flap(n)          a split-flap sign turning n cells
    relay()          a heavy switch: the lights going out
    xylo(m, d, vel)  a rosewood xylophone bar (the caption pop is one of these)

Score helpers (music bus, as stems):
    loop_bar         a bar of the machine: xylophone sixteenths going up and round, a pizzicato bass on the beat
"""
import numpy as np
from rfsound import SR, tv, hz, soft, marimba, sub_bass, pizz, supersaw
from sfx import _noise, _fade, _norm, _g


class Marble:
    BPM = 120
    KEY = 'D lydian'
    B = 60 / 120
    VERB = dict(t60=0.9, lo=180, hi=7000, pre=0.012, g=0.24, seed=61)
    GLUE = dict(thresh=-16.0, ratio=2.3)
    EQ = dict(fc=3200.0, db=0.8, hp=34.0)
    D, E, G, A = (38, (62, 66, 69)), (40, (64, 68, 71)), (43, (62, 67, 71)), (45, (64, 69, 73))
    CHORDS = [D, E, G, D]


def xylo(m, d=0.25, vel=0.8):
    f = hz(m); t = tv(max(0.45, d + 0.25))
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * (6 + f / 400)) + 0.35 * vel * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t * (20 + f / 120))
    tock = _noise(0.02, _g('xylo', m), 1500, 7000) * np.exp(-tv(0.02) * 300) * 0.3 * vel
    x[:len(tock)] += tock
    return _fade(x * vel * 0.5, 0.0008, 0.05)


def roll(d, seed=0, rate=9.0):
    t = tv(d); g = _g('roll', seed)
    rum = soft(_noise(d, g), 60, 520, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.3 * t + seed))
    ticks = np.zeros(len(t))
    for k in range(int(d * rate)):
        a = int((k + 0.3 * g.random()) / rate * SR); tt = tv(0.012); c = _noise(0.012, g, 1800, 6000) * np.exp(-tt * 380)
        ticks[a:a + len(c)] += c[:len(ticks) - a]
    return _fade(_norm(rum + ticks * 0.5, 0.6), 0.08, 0.15)


def clack(k=0):
    t = tv(0.18); g = _g('clack', k)
    x = np.sin(2 * np.pi * (820 + 140 * (k % 3)) * t) * np.exp(-t * 60) + _noise(0.18, g, 900, 5000) * np.exp(-t * 120) * 0.6 + np.sin(2 * np.pi * 210 * t) * np.exp(-t * 40) * 0.4
    return _fade(_norm(x, 0.7), 0.0004, 0.03)


def coin(k=0):
    t = tv(0.8); f = 2600 + 180 * (k % 5)
    x = sum(np.sin(2 * np.pi * f * r * t) * np.exp(-t * dk) * a for r, a, dk in ((1, 1.0, 7), (1.52, 0.5, 9), (2.71, 0.3, 14), (0.31, 0.25, 20)))
    x += _noise(0.8, _g('coin', k), 3000, 9000) * np.exp(-t * 200) * 0.4
    return _fade(_norm(x, 0.55), 0.0004, 0.1)


def flap(n=8):
    out = np.zeros(int((n * 0.035 + 0.2) * SR)); g = _g('flap', n)
    for i in range(n * 3):
        a = int(i * 0.012 * SR); tt = tv(0.02); c = _noise(0.02, g, 1200, 6000) * np.exp(-tt * 260) * (0.5 + 0.5 * g.random())
        out[a:a + len(c)] += c[:len(out) - a]
    return _fade(_norm(out, 0.6), 0.001, 0.05)


def relay():
    t = tv(0.45); g = _g('mrelay')
    x = np.sin(2 * np.pi * (58 + 50 * np.exp(-t * 40)) * t) * np.exp(-t * 12) + _noise(0.45, g, 900, 6000) * np.exp(-t * 80) * 0.6
    return _fade(_norm(x, 0.9), 0.0003, 0.05)


def loop_bar(s, t0, chord, g=0.1, S=Marble, bright=0.8, bass=True, arp=True):
    root, keys = chord
    if arp:
        seq = [keys[0], keys[1], keys[2], keys[0] + 12, keys[2], keys[1]]
        for k in range(16):
            s.note(xylo(seq[k % len(seq)] + 12, 0.18, 0.55 + 0.3 * (k % 4 == 0)), t0 + k * S.B / 4, g * (1.0 if k % 4 == 0 else 0.65), (-0.35, 0.35)[k % 2], 0.25, stem='xylo', name='the machine goes round')
    if bass:
        for k in range(4): s.note(pizz(root + 12 + (7 if k == 2 else 0)), t0 + k * S.B, g * 1.4, 0, 0.1, stem='bass', name='pizz bass')
        s.note(sub_bass(root, S.B * 1.8), t0, g * 1.2, 0, 0.05, stem='bass', name='sub')
