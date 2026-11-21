"""The GULF kit (first used by Stable, 21 Nov). Per SOUND.md, "Sound per film": the drone war at sea, off Helsinki, at night,
and the room where it is plotted. Ominous, never loud for the sake of it; everything stops when the lamp goes out. All
synthesised.

    Gulf             the series: no grid, no key — a low cluster on C and D flat; a big cold space (2.2 s)
    sea_bed(d)       wind over open water and the swell breaking somewhere in the dark
    sub(d)           a sub drone that beats (two sines 0.6 Hz apart), swelling and sinking
    far_boom()       a detonation heard far off over water: the low thump arrives, the rumble rolls on
    foghorn(d)       a distant horn, filtered by the fog
    sonar()          the plotting room's ping: a pure tone, a slight fall, a long tail
    crackle(d)       fire on a ship's deck, heard across the water: pops and a low roar
    teleprinter(d)   a teleprinter's heavier chatter: type bars at ~11 a second over its motor
    hum(d)           the room: a transformer hum with a slow beat
    buzz(d)          a failing lamp: an arcing buzz, gated
    heart(vel)       a soft double thump, felt rather than heard
    alarm(d)         a slow two-tone alarm, far down a corridor
Score helpers (music bus): cluster (a low string cluster that sulks), swell_roll (timpani, rising)
"""
import numpy as np
from rfsound import SR, tv, hz, soft, cello_hold, timp_roll, printer, water_lap
from sfx import _noise, _fade, _norm, _g


class Gulf:
    BPM = 60
    KEY = 'none (C / D flat cluster)'
    B = 1.0
    VERB = dict(t60=2.2, lo=90, hi=4200, pre=0.02, g=0.26, seed=97)   # a big cold space
    GLUE = dict(thresh=-18.0, ratio=2.0)
    EQ = dict(fc=3000.0, db=-1.5, hp=26.0)                            # dark on top


def sea_bed(d, k=0):
    t = tv(d); g = _g('sea', k)
    wind = soft(g.standard_normal(len(t)), 180, 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + 1) ** 2) * 0.5
    hiss = soft(g.standard_normal(len(t)), 3000, 8000) * (0.3 + 0.2 * np.sin(2 * np.pi * 0.07 * t)) * 0.12
    return _fade(wind + hiss + water_lap(d, 0.9, k) * 0.8, 0.8, 0.3)


def sub(d, f=34.0, k=0):
    t = tv(d); sw = 0.6 + 0.4 * np.sin(2 * np.pi * t / max(d, 1) * 1.3 - 1.2)
    x = (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + 0.6) * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * sw
    return _fade(x * 0.5, 1.2, 0.25)


def far_boom(k=0, size=1.0):
    t = tv(3.6); g = _g('boom', k)
    thump = np.sin(2 * np.pi * (28 + 30 * np.exp(-t * 8)) * t) * np.exp(-t * 2.2)
    rumble = soft(g.standard_normal(len(t)), 30, 260) * np.exp(-t * 0.9) * np.minimum(1, t / 0.08) * 0.9
    crack = soft(g.standard_normal(len(t)), 300, 1600) * np.exp(-t * 14) * 0.25
    return _fade(_norm(thump + rumble + crack, 0.9) * size, 0.006, 0.6)


def foghorn(d=2.4):
    t = tv(d); f = 98.0
    x = sum(np.sin(2 * np.pi * f * h * t) / h ** 1.2 for h in range(1, 9))
    x = soft(x, 60, 700) * np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.6)
    return _norm(x, 0.7)


def sonar(f=1180.0):
    t = tv(2.4); x = np.sin(2 * np.pi * (f - 18 * t) * t) * np.exp(-t * 2.0) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 5)
    return _fade(_norm(x, 0.6), 0.004, 0.4)


def crackle(d, k=0):
    g = _g('crackle', k); n = int(d * SR); out = np.zeros(n); tt = 0.0
    while tt < d - 0.05:
        a = int(tt * SR); L = int(0.012 * SR); p = _noise(0.012, g, 900, 6000) * np.exp(-tv(0.012) * 300) * g.uniform(0.2, 1.0)
        out[a:a + L] += p[:n - a]; tt += g.exponential(0.05)
    roar = soft(g.standard_normal(n), 60, 500) * 0.35 * (0.8 + 0.2 * np.sin(2 * np.pi * 0.4 * tv(d)))
    return _fade(_norm(out + roar, 0.6), 0.4, 0.3)


def teleprinter(d, k=0):
    g = _g('tty', k); n = int(d * SR); out = np.zeros(n); tt = 0.0
    while tt < d - 0.03:
        a = int(tt * SR); L = int(0.03 * SR); s = (_noise(0.03, g, 1200, 6000) * np.exp(-tv(0.03) * 140) + np.sin(2 * np.pi * 190 * tv(0.03)) * np.exp(-tv(0.03) * 90) * 0.5) * g.uniform(0.6, 1.0)
        out[a:a + L] += s[:n - a]; tt += 1 / 11.0 * g.uniform(0.8, 1.2)
    motor = soft(np.sign(np.sin(2 * np.pi * 50 * tv(d))) * 0.05, 80, 900)
    return _fade(_norm(out + motor, 0.7), 0.004, 0.06)


def hum(d):
    t = tv(d); x = (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.2 * np.sin(2 * np.pi * 150.4 * t)) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.3 * t))
    return _fade(x * 0.2, 0.5, 0.05)


def buzz(d, k=0):
    g = _g('buzz', k); t = tv(d); gate = (np.sin(2 * np.pi * 7.3 * t) > 0.1).astype(float) * (np.sin(2 * np.pi * 2.1 * t) > -0.5)
    x = soft(np.sign(np.sin(2 * np.pi * 100 * t)) + g.standard_normal(len(t)) * 0.4, 100, 3000) * soft(gate, None, 60, 1)
    return _fade(_norm(x, 0.5), 0.003, 0.01)


def heart(vel=0.8):
    t = tv(0.5)
    a = np.sin(2 * np.pi * (48 + 20 * np.exp(-t * 30)) * t) * np.exp(-t * 18)
    b = np.zeros_like(a); s = int(0.2 * SR); b[s:] = a[:len(a) - s] * 0.6
    return _fade(_norm(a + b, 0.8) * vel, 0.004, 0.05)


def alarm(d):
    t = tv(d); f = np.where(np.floor(t / 0.9) % 2 == 0, 392.0, 330.0)
    x = soft(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3, 200, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 0.9 * np.pi) ** 2)
    return _fade(x, 0.4, 0.3)


def cluster(s, t, d, g=0.06, notes=(36, 37, 43), name='strings: the low cluster'):
    for j, m in enumerate(notes): s.note(cello_hold(m + 12, d, (0.2, 0.7 - 0.1 * j, 0.3)), t + j * 0.07, g, (-0.3, 0.3, 0.0)[j % 3], 0.4, stem='strings', name=name)


def swell_roll(s, t, d, g=0.12, m=36):
    s.note(timp_roll(m, d, 0.05, 1.0), t, g, 0.0, 0.35, stem='drums', name='timpani: the roll, rising')
