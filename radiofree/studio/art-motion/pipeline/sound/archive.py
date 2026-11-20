"""The ARCHIVE kit (first used by Not Yet Listed, 20 Nov). Per SOUND.md, "Sound per film": a state archive in a basement.
A steel card drawer on its runners, cards dropping into it, the lid shutting, a seal stamped, a slot printer feeding out
one sheet, pins pressed into a paper map on a steel table, the strip light and the ventilation. All synthesised.

    Archive          the series: 76 BPM, A minor, never leaving i–VI–iv; a concrete basement (1.4 s)
    runner(d)        the drawer rolling in on steel ball runners, then the stop
    pin_in(k)        a map pin pressed through paper into the felt under it, the steel table answering
    card_drop(k)     an index card falling into its slot in the drawer
    lid_shut()       the steel lid coming down: a heavy clank with the box ringing under it
    vent(d)          the ventilation: low filtered air with a slow beat
Score helpers (music bus, as stems):
    pulse_bar        a bar of the bed: a muted low pulse on every beat, a cello drone holding the root
    motif            the vibes figure: three notes down from the fifth, the last one held
"""
import numpy as np
from rfsound import SR, tv, hz, soft, vibes, cello_hold, knock, clank, over, pad
from sfx import _noise, _fade, _norm, _g


class Archive:
    BPM = 76
    KEY = 'A minor'
    B = 60 / 76
    VERB = dict(t60=1.4, lo=140, hi=5200, pre=0.014, g=0.22, seed=83)    # a concrete basement
    GLUE = dict(thresh=-17.0, ratio=2.2)
    EQ = dict(fc=3000.0, db=-0.8, hp=32.0)                                 # cold, a little dark on top
    Am, F, Dm = (45, (57, 60, 64)), (41, (57, 60, 65)), (38, (57, 62, 65))
    CHORDS = [Am, Am, F, Dm]


def runner(d=0.55, k=0):
    t = tv(d); g = _g('runner', k)
    roll = _noise(d, g, 300, 2600) * (0.55 + 0.45 * np.sin(2 * np.pi * 34 * t) ** 2) * np.minimum(1, t / 0.08) * 0.35
    stop = np.zeros(len(t) + int(0.35 * SR)); s = knock(0.9, 210); a = int(d * SR) - 200
    stop[a:a + len(s)] += s[:len(stop) - a]
    out = np.zeros(len(stop)); out[:len(roll)] += roll; out += stop * 0.9
    return _fade(_norm(out, 0.8), 0.002, 0.08)


def pin_in(k=0):
    t = tv(0.18); g = _g('pin_in', k)
    press = _noise(0.18, g, 600, 3800) * np.exp(-t * 55) * 0.5 + np.sin(2 * np.pi * (480 + 30 * g.random()) * t) * np.exp(-t * 40) * 0.35
    return _fade(_norm(press, 0.6), 0.004, 0.04)


def card_drop(k=0):
    t = tv(0.16); g = _g('card_drop', k)
    x = _noise(0.16, g, 900, 5200) * np.exp(-t * 60) * 0.6 + np.sin(2 * np.pi * (150 + 20 * g.random()) * t) * np.exp(-t * 35) * 0.45
    return _fade(_norm(x, 0.6), 0.004, 0.04)


def lid_shut():
    return _fade(_norm(over(clank(1.0, 310) * 0.8, knock(1.0, 95)), 0.85), 0.0015, 0.2)


def vent(d, k=0):
    t = tv(d); g = _g('vent', k)
    x = soft(g.standard_normal(len(t)), 60, 700) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.23 * t)) * 0.12
    return _fade(x, 1.0, 1.0)


def pulse_bar(s, t0, chord, g=0.06, S=Archive, drone=True):
    root = chord[0]
    for k in range(4):
        tt = tv(0.32); p = np.sin(2 * np.pi * hz(root) * tt) * np.exp(-tt * 9) * np.minimum(1, tt / 0.004)
        s.note(p, t0 + k * S.B, g * (1.6 if k == 0 else 1.1), 0.0, 0.1, stem='bass', name='the low pulse')
    if drone: s.note(cello_hold(root + 12, S.B * 4 + 0.3, (0.3, 0.55, 0.35)), t0, g * 0.9, -0.2, 0.3, stem='strings', name='cello: the drone')


def motif(s, t0, chord, g=0.07, S=Archive, last_hold=2.0):
    top = chord[1][2]
    for j, m in enumerate((top + 3, top, top - 4)):
        s.note(vibes(m + 12, last_hold if j == 2 else S.B * 1.5, 0.6), t0 + j * S.B * 0.5, g, 0.25, 0.35, stem='keys', name='vibes: the motif')
