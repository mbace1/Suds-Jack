"""The CLERK kit (first used by Who Wrote the Bill?, 19 Nov). Per SOUND.md, "Sound per film": a small-town clerk's office
after hours. A manual typewriter, a rubber stamp, a corkboard, a wall clock, the strip light's hum, and a late-night
trio in the next room that never quite resolves. All synthesised.

    Clerk            the series: 84 BPM, G major leaning on D7 (a question that keeps not being answered); a small
                     plaster office (0.6 s)
    typekey(k, vel)  one typebar striking the platen: a hard clack, the typebar's ring, the carriage escapement's tick
    space(k)         the space bar: the escapement alone
    ratchet(n)       the carriage return: the line-space ratchet clicking n teeth, then the carriage slamming home
    ding()           the margin bell
    pin(k)           a push pin going into cork
    (from rfsound)   press_stamp, stapler, clock_tick, office_hum, platen_whoosh, paper_slide

Score helpers (music bus, as stems):
    walk_bar         a bar of the trio: an upright bass walking quarters, brushes on two and four
    comp             a felt-piano chord, soft, behind the beat
"""
import numpy as np
from rfsound import SR, tv, hz, soft, upright, brush_tap, brush_swish, felt_piano
from sfx import _noise, _fade, _norm, _g


class Clerk:
    BPM = 84
    KEY = 'G major'
    B = 60 / 84
    VERB = dict(t60=0.6, lo=170, hi=6000, pre=0.008, g=0.2, seed=71)     # a small plaster office
    GLUE = dict(thresh=-16.0, ratio=2.3)
    EQ = dict(fc=3000.0, db=0.4, hp=34.0)
    # (bass root, voicing); D7 is the one that hangs
    G, C, D7, Em = (43, (59, 62, 67)), (36, (60, 64, 67)), (38, (60, 62, 66)), (40, (59, 64, 67))
    CHORDS = [G, C, G, D7]
    WALK = {43: (43, 47, 50, 49), 36: (36, 40, 43, 44), 38: (38, 42, 45, 44), 40: (40, 43, 47, 46)}   # a walk up to the next root


def typekey(k=0, vel=1.0):
    t = tv(0.16); g = _g('typekey', k)
    clack = _noise(0.16, g, 1400, 7500) * np.exp(-t * 170) * (0.85 + 0.3 * g.random())
    body = np.sin(2 * np.pi * (165 + 25 * g.random()) * t) * np.exp(-t * 55) * 0.55          # the platen's thunk
    ring = np.sin(2 * np.pi * (3100 + 400 * g.random()) * t) * np.exp(-t * 60) * 0.12        # the typebar
    esc = np.zeros(len(t)); a = int(0.045 * SR); e = _noise(0.012, g, 3000, 9000) * np.exp(-tv(0.012) * 400) * 0.4
    esc[a:a + len(e)] += e                                                                       # the carriage steps on
    return _fade(_norm(clack + body + ring + esc, 0.8) * vel, 0.0003, 0.03)


def space(k=0):
    t = tv(0.08); g = _g('space', k)
    x = _noise(0.08, g, 2500, 9000) * np.exp(-t * 300) * 0.5 + np.sin(2 * np.pi * 120 * t) * np.exp(-t * 70) * 0.3
    return _fade(_norm(x, 0.35), 0.0003, 0.02)


def ratchet(n=2):
    g = _g('ratchet', n); out = np.zeros(int((n * 0.06 + 0.45) * SR))
    for i in range(n):
        a = int(i * 0.06 * SR); tt = tv(0.03); c = _noise(0.03, g, 2000, 8000) * np.exp(-tt * 220) * 0.6 + np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 140) * 0.3
        out[a:a + len(c)] += c
    a = int(n * 0.06 * SR); sl = tv(0.22); slide = _noise(0.22, g, 600, 4000) * np.sin(np.pi * sl / 0.22) * 0.35
    out[a:a + len(slide)] += slide
    b = a + len(slide); tt = tv(0.2); slam = np.sin(2 * np.pi * (110 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 25) + _noise(0.2, g, 800, 6000) * np.exp(-tt * 90) * 0.7
    out[b:b + len(slam)] += slam[:len(out) - b]
    return _fade(_norm(out, 0.8), 0.0005, 0.05)


def ding():
    t = tv(1.4)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dk) * a for f, a, dk in ((2410, 1.0, 3.2), (6180, 0.35, 7), (3890, 0.2, 5), (1205, 0.15, 6)))
    return _fade(_norm(x, 0.5), 0.0004, 0.2)


def pin(k=0):
    t = tv(0.12); g = _g('pin', k)
    x = _noise(0.12, g, 500, 3500) * np.exp(-t * 70) * 0.7 + np.sin(2 * np.pi * 240 * t) * np.exp(-t * 60) * 0.5
    return _fade(_norm(x, 0.6), 0.0005, 0.03)


def walk_bar(s, t0, chord, g=0.1, S=Clerk, brushes=True, nxt=None):
    root = chord[0]; notes = S.WALK.get(root, (root, root + 4, root + 7, root + 6))
    for k, m in enumerate(notes):
        s.note(upright(m, S.B * 0.9, 0.62 + 0.12 * (k == 0)), t0 + k * S.B, g * 1.5, -0.1, 0.12, stem='bass', name='upright: walking')
    if brushes:
        s.note(brush_swish(S.B * 4, 0.35), t0, g * 0.5, 0.25, 0.2, stem='drums', name='brushes: the swirl')
        for k in (1, 3): s.note(brush_tap(0.55), t0 + k * S.B, g * 0.9, 0.3, 0.2, stem='drums', name='brushes: two and four')


def comp(s, t, chord, g=0.08, d=1.0, name='piano: a soft comp'):
    for j, m in enumerate(chord[1]): s.note(felt_piano(m, d, 0.38), t + j * 0.012, g, (-0.3, 0.0, 0.3)[j % 3], 0.3, stem='keys', name=name)
