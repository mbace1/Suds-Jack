"""The CHANGELOG kit (first used by Release Notes, 22 Nov). Per SOUND.md, "Sound per film": a tech company's launch sizzle, cold:
radar pings, data blips, a resolution sweep that locks, a rocket's rumble, a ticker rolling, approval spinners. All synthesised.

    Changelog        the series: 118 BPM, D minor; a clean four-on-the-floor pulse and a glassy arpeggio, very corporate-launch
    entry()          a version entry appearing: a soft blip pair
    sweep_lock(d)    the radar picture sharpening: a rising filtered sweep that LOCKS on a bright chime
    ignition()       a rocket outline lifting: a low rumble with a crackle
    ticker(d)        the price counter rolling: rapid soft ticks speeding up
    spinner(d)       the approval spinners: a soft looping whirr
Score helpers: pulse_bar (kick, hat, sub), arp (pluck)
"""
import numpy as np
from rfsound import SR, tv, hz, soft, pluck, kick_tight, hat, sub_bass, glock, vibes
from sfx import _noise, _fade, _norm, _g


class Changelog:
    BPM = 118
    KEY = 'D minor'
    B = 60 / 118
    VERB = dict(t60=1.1, lo=150, hi=8000, pre=0.012, g=0.2, seed=73)
    GLUE = dict(thresh=-16.0, ratio=2.4)
    EQ = dict(fc=3000.0, db=1.0, hp=34.0)
    Dm, Bb, F, C = (38, (62, 65, 69)), (34, (62, 65, 70)), (41, (60, 65, 69)), (36, (60, 64, 67))
    CHORDS = [Dm, Bb, F, C]


def entry():
    out = np.zeros(int(0.25 * SR))
    for j, f in enumerate((1568, 2093)):
        t = tv(0.12); s = np.sin(2 * np.pi * f * t) * np.exp(-t * 30); a = int(j * 0.06 * SR); out[a:a + len(s)] += s
    return _fade(_norm(out, 0.4), 0.003, 0.03)


def sweep_lock(d=0.8, k=0):
    t = tv(d); g = _g('sweep', k); ph = 2 * np.pi * np.cumsum(np.geomspace(200, 2400, len(t))) / SR
    x = np.sin(ph) * 0.4 * t / d + soft(g.standard_normal(len(t)), 800, 6000) * 0.15 * (1 - t / d)
    out = np.zeros(len(t) + int(1.2 * SR)); out[:len(t)] += x; lk = glock(91, 1.2, 0.9); out[len(t) - 200:len(t) - 200 + len(lk)] += lk[:len(out) - len(t) + 200] * 1.4
    return _fade(_norm(out, 0.7), 0.01, 0.2)


def ignition(k=0):
    t = tv(2.0); g = _g('ign', k)
    x = soft(g.standard_normal(len(t)), 30, 400) * np.minimum(1, t / 0.15) * np.exp(-t * 1.0) + soft(g.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 6) * 0.2
    return _fade(_norm(x, 0.8), 0.006, 0.4)


def ticker(d=0.6, k=0):
    g = _g('ticker', k); n = int(d * SR); out = np.zeros(n); tt = 0.0; i = 0
    while tt < d - 0.01:
        a = int(tt * SR); t = tv(0.01); s = np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 500); out[a:a + len(s)] += s[:n - a] * 0.7; i += 1; tt += max(0.018, 0.07 * (1 - tt / d))
    return _fade(_norm(out, 0.4), 0.003, 0.02)


def spinner(d=3.0):
    t = tv(d); x = soft(np.sin(2 * np.pi * 180 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.6 * t)), 100, 1200) * 0.3
    return _fade(x, 0.3, 0.3)


def pulse_bar(s, t0, chord, g=0.05, S=Changelog, drums=True):
    for k in range(4):
        if drums: s.note(kick_tight(0.8), t0 + k * S.B, g * 1.2, 0, 0.05, stem='drums', name='kick'); s.note(hat(False, 0.4), t0 + (k + 0.5) * S.B, g * 0.6, 0.25, 0.1, stem='drums', name='hat')
        s.note(sub_bass(chord[0] + 12, S.B * 0.45), t0 + (k + 0.5) * S.B, g * 1.1, 0, 0.05, stem='bass', name='sub: offbeat')
        for j, m in enumerate(chord[1]): s.note(pluck(m + 12, S.B * 0.3, 0.7), t0 + k * S.B + j * S.B / 3, g * 0.45, (-0.35, 0, 0.35)[j], 0.25, stem='keys', name='arp')
