"""The BACKYARD kit (first used by Be Prepared, 22 Nov). Per SOUND.md, "Sound per film": a homemade bunker in a culvert pipe. A bare
bulb's buzz, an old TV's whine and crackle, cans clattering onto plywood, a generator's pull-start and idle, ladder rungs, a steel hatch
slam, and a cheerful twangy picking tune on a nylon string, a little out of tune, that keeps going no matter what. All synthesised.

    Backyard         the series: 112 BPM, G major, I–IV–V–I boom-chick; a small steel tube (0.7 s, ringing)
    bulb_buzz(d)     a bare bulb's 120 Hz buzz with a filament flicker
    tv_whine(d)      an old CRT's 15.7 kHz-ish whine (kept audible, ~9 kHz) and static crackle
    can_clink(k)     a can landing on plywood
    pull_start()     a generator's pull cord (two pulls), then it catches
    idle(d)          the generator running
    rung(k)          a boot on a steel ladder rung
    hatch_slam()     the steel hatch slamming shut: a big ringing clang, then nothing
Score helpers: pick_bar (boom-chick on nylon, slightly detuned)
"""
import numpy as np
from rfsound import SR, tv, hz, soft, nylon, clank, knock, over
from sfx import _noise, _fade, _norm, _g


class Backyard:
    BPM = 112
    KEY = 'G major'
    B = 60 / 112
    VERB = dict(t60=0.7, lo=200, hi=5000, pre=0.006, g=0.22, seed=37)
    GLUE = dict(thresh=-16.0, ratio=2.3)
    EQ = dict(fc=3000.0, db=-0.5, hp=40.0)
    G, C, D = (43, (55, 59, 62)), (36, (55, 60, 64)), (38, (54, 57, 62))
    CHORDS = [G, C, D, G]


def bulb_buzz(d, k=0):
    t = tv(d); g = _g('bulb', k); x = soft(np.sign(np.sin(2 * np.pi * 120 * t)), 120, 2500) * (0.85 + 0.15 * soft(g.standard_normal(len(t)), None, 8, 1))
    return _fade(x * 0.15, 0.05, 0.05)


def tv_whine(d, k=0):
    t = tv(d); g = _g('tvw', k); x = np.sin(2 * np.pi * 9000 * t) * 0.03 + soft(g.standard_normal(len(t)), 1500, 7000) * 0.04 * (0.5 + 0.5 * (g.random(len(t)) > 0.995))
    return _fade(x, 0.1, 0.1)


def can_clink(k=0):
    t = tv(0.2); g = _g('can', k); f = 1900 + 500 * g.random()
    kn = np.zeros(len(t)); kk = knock(0.5, 260)[:len(t)]; kn[:len(kk)] = kk
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 30) * 0.4 + np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 45) * 0.2 + kn * 0.6)
    return _fade(_norm(x, 0.5), 0.003, 0.04)


def pull_start(k=0):
    g = _g('pull', k); out = np.zeros(int(1.6 * SR))
    for j in range(2):
        a = int(j * 0.55 * SR); t = tv(0.35); c = soft(g.standard_normal(len(t)), 300, 3000) * np.sin(np.pi * t / 0.35) * 0.5 + np.sin(2 * np.pi * (60 + 40 * t) * t) * np.exp(-t * 6) * 0.5
        out[a:a + len(c)] += c
    a = int(1.1 * SR); t = tv(0.5); catch = soft(np.sign(np.sin(2 * np.pi * 28 * t)) * np.minimum(1, t / 0.1), 40, 900) * 0.8; out[a:a + len(catch)] += catch[:len(out) - a]
    return _fade(_norm(out, 0.7), 0.004, 0.08)


def idle(d, k=0):
    t = tv(d); g = _g('idle', k); x = soft(np.sign(np.sin(2 * np.pi * 29 * t + 0.3 * np.sin(2 * np.pi * 0.7 * t))), 40, 800) * 0.35 + soft(g.standard_normal(len(t)), 300, 2000) * 0.05
    return _fade(x, 0.1, 0.2)


def rung(k=0):
    return _fade(_norm(over(clank(0.5, 880 + 60 * (k % 3)) * 0.6, knock(0.6, 180) * 0.6), 0.5), 0.003, 0.1)


def hatch_slam():
    t = tv(1.6); x = over(clank(1.0, 240), np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 20)) * t) * np.exp(-t * 5) * 0.9)
    return _fade(_norm(x, 0.9), 0.004, 0.3)


def pick_bar(s, t0, chord, g=0.06, S=Backyard):
    root = chord[0]
    for k in range(4):
        if k % 2 == 0: s.note(nylon(root + 12 + (7 if k == 2 else 0), S.B * 0.9, 0.7), t0 + k * S.B, g * 1.3, -0.15, 0.2, stem='bass', name='nylon: the boom')
        else:
            for j, m in enumerate(chord[1]): s.note(nylon(m + 12, S.B * 0.5, 0.45) * (1 + 0.01 * j), t0 + k * S.B + j * 0.008, g * 0.55, 0.2, 0.2, stem='keys', name='nylon: the chick')
