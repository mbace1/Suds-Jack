"""The HOLD LINE kit (first used by Due 13 Nov, 22 Nov). Per SOUND.md, "Sound per film": waiting for an answer that does not come.
A mail client's sounds, a desk calendar, a clock, and hold music that loops politely forever. All synthesised.

    Holdline         the series: 104 BPM, F major, a bossa-ish hold-music loop (I–vi–ii–V) that never resolves to a cadence
    whoosh()         the send swoosh
    sent_tick()      DELIVERED: a soft two-note confirmation
    revoke()         a badge declined: a low buzz and a click
    page(k)          a calendar page turning over
    overdue()        a muted alarm blip
    caret()          the cursor's blink tick
Score helpers: hold_bar (muted marimba comping + a soft brushed hat), the motif (glock)
"""
import numpy as np
from rfsound import SR, tv, hz, soft, marimba, glock, hat, sub_bass
from sfx import _noise, _fade, _norm, _g


class Holdline:
    BPM = 104
    KEY = 'F major'
    B = 60 / 104
    VERB = dict(t60=0.9, lo=180, hi=7000, pre=0.01, g=0.18, seed=61)
    GLUE = dict(thresh=-16.0, ratio=2.2)
    EQ = dict(fc=3000.0, db=0.5, hp=36.0)
    F, Dm, Gm, C7 = (41, (60, 65, 69)), (38, (60, 62, 65)), (43, (58, 62, 67)), (36, (58, 64, 67))
    CHORDS = [F, Dm, Gm, C7]


def whoosh(d=0.45, k=0):
    t = tv(d); g = _g('whoosh', k); x = soft(g.standard_normal(len(t)), 400, 5000) * np.sin(np.pi * t / d) ** 2
    return _fade(_norm(x, 0.5), 0.01, 0.05)


def sent_tick():
    out = np.zeros(int(0.4 * SR))
    for j, m in enumerate((84, 91)):
        t = tv(0.3); s = np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 14); a = int(j * 0.07 * SR); out[a:a + len(s)] += s * (0.8 if j else 0.6)
    return _fade(_norm(out, 0.5), 0.003, 0.05)


def revoke(k=0):
    t = tv(0.3); g = _g('revoke', k)
    x = soft(np.sign(np.sin(2 * np.pi * 110 * t)) * 0.4, 80, 1500) * np.exp(-t * 9) + _noise(0.3, g, 2000, 6000) * np.exp(-t * 80) * 0.3
    return _fade(_norm(x, 0.6), 0.003, 0.05)


def page(k=0):
    t = tv(0.12); g = _g('page', k); x = _noise(0.12, g, 1500, 7000) * np.exp(-t * 40) * (0.6 + 0.4 * g.random())
    return _fade(_norm(x, 0.4), 0.003, 0.03)


def overdue():
    t = tv(0.5); x = sum(np.sin(2 * np.pi * f * t) * (np.floor(t * 8) % 2 == 0) for f in (880, 1320)) * np.exp(-t * 2)
    return _fade(_norm(soft(x, 300, 4000), 0.5), 0.004, 0.05)


def caret():
    t = tv(0.05); return _fade(_norm(np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 90), 0.3), 0.002, 0.02)


def hold_bar(s, t0, chord, g=0.05, S=Holdline):
    root = chord[0]
    for k in range(4):
        if k in (0, 2): s.note(sub_bass(root + 12, S.B * 0.8), t0 + k * S.B, g * 1.4, 0.0, 0.05, stem='bass', name='bass: the hold line')
        for j, m in enumerate(chord[1]): s.note(marimba(m, S.B * 0.6, 0.45), t0 + k * S.B + 0.5 * S.B, g * 0.6, (-0.3, 0, 0.3)[j], 0.2, stem='keys', name='marimba: comping')
        s.note(hat(False, 0.35), t0 + k * S.B + 0.5 * S.B, g * 0.5, 0.3, 0.1, stem='drums', name='hat: offbeat')
