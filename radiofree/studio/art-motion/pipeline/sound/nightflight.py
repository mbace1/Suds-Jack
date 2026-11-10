"""The NIGHT FLIGHT kit (first used by Night Flight, the RFH channel promo, 10 Nov). Per SOUND.md, "Sound per film":
a film's sound comes from its story's world. This one is a drone crossing Finland at night, so the kit is the drone
itself, the night it flies through, and a wide, cold, hopeful score that opens as the land opens. All synthesised.

    NightFlight      the series: 100 BPM, A minor into C major; a big, cold night room (3.4 s), a soft top
    rotor(d, speed, gain, onboard)   four props on a phase clock: blade harmonics that beat against each other, the
                     chopped air between them and the motors' whine; pitch follows `speed` (0..1, one value a sample)
    lockbeep(k)      one of the three rising acquisition beeps
    lockthump()      the lock: a soft low body and a click
    data(n, seed)    n tiny blips, each its own pitch: a label being written
    owl()            a tawny owl, far off: hoo … hoo-hoo-oooo
    loon()           a black-throated loon's wail across the water
    ferryhorn(d)     a big ship's horn, two low notes a fifth apart
    trambell()       a tram's double ding
    relay()          the ON AIR relay closing: a heavy clunk with a metal edge
    neon(d, on)      the sign's 100 Hz buzz, gated by `on` (one value a sample: the flicker)
    airrush(d)       air past the airframe at speed
    pines(d)         wind in the spruces

Score helpers (all placed on the music bus as stems):
    pulse_bar        a bar of muted eighth-note plucks on the chord's root and fifth, a sub on one and three
    arp_bar          a bar of sixteenths up the chord, brightness and level as asked
    chord_pad        a held supersaw chord, its filter as asked
"""
import numpy as np
from rfsound import SR, tv, hz, soft, pluck, sub_bass, supersaw, chime
from sfx import _noise, _fade, _norm, _g


class NightFlight:
    BPM = 100
    KEY = 'A minor'
    B = 60 / 100
    VERB = dict(t60=3.4, lo=140, hi=7200, pre=0.04, g=0.34, seed=88)     # a cold, wide night
    GLUE = dict(thresh=-16.0, ratio=2.2)
    EQ = dict(fc=3000.0, db=0.5, hp=30.0)
    # (bass root, voicing)
    Am, F, C, G, Fadd9 = (45, (57, 60, 64)), (41, (57, 60, 65)), (36, (55, 60, 64)), (43, (55, 59, 62)), (41, (53, 57, 60, 64, 67))


def rotor(d, speed, gain, onboard=False, seed=0):
    """four rotors on one clock, each a hair off the others so they beat; `speed` and `gain` are arrays (or numbers)"""
    t = tv(d); n = len(t); g = _g('rotor', seed)
    sp = np.broadcast_to(np.asarray(speed, float), (n,)); gn = np.broadcast_to(np.asarray(gain, float), (n,))
    f = 118 + 92 * sp                                             # blade-pass, Hz
    x = np.zeros(n); chop = np.zeros(n)
    for r, det in enumerate((1.0, 1.012, 0.991, 1.021)):
        ph = 2 * np.pi * np.cumsum(f * det) / SR + r * 1.7
        for k in range(1, 9): x += np.sin(k * ph) / k ** 0.85 * (0.6 if k == 1 else 1.0)
        chop += (0.5 + 0.5 * np.sin(ph)) ** 6
    air = soft(_noise(d, g), 300, 3600, 2) * (0.25 + chop / 4)
    whine = np.sin(2 * np.pi * np.cumsum(f * 7.4) / SR) * (0.025 + 0.03 * sp)
    y = x / 14 + air * (0.5 if onboard else 0.9) + whine
    if onboard: y = soft(y, 40, 2600, 2) * 1.2 + soft(x, 40, 220, 2) / 10      # its own mic: more body, less sky
    return _fade(_norm(y * gn, 0.8), 0.02, 0.05)


def lockbeep(k=0):
    t = tv(0.07); f = (1320, 1480, 1760)[k % 3]
    return _fade(_norm(np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t), 0.55), 0.002, 0.02)


def lockthump():
    t = tv(0.5); g = _g('lock')
    x = np.sin(2 * np.pi * (52 + 70 * np.exp(-t * 30)) * t) * np.exp(-t * 7) + _noise(0.5, g, 2000, 9000) * np.exp(-t * 160) * 0.5
    return _fade(_norm(x, 0.9), 0.0005, 0.1)


def data(n=8, seed=0, rate=24.0):
    g = _g('data', seed); d = n / rate + 0.1; x = np.zeros(int(d * SR))
    for i in range(n):
        f = 2200 + g.random() * 1800; tt = tv(0.022); b = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 140)
        a = int(i / rate * SR); x[a:a + len(b)] += b * (0.6 + 0.4 * g.random())
    return _fade(_norm(x, 0.6), 0.001, 0.02)


def _hoot(f0, d, vib=5.5):
    t = tv(d); f = f0 * (1 + 0.04 * np.sin(np.pi * t / d)) * (1 + 0.006 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    return x * np.sin(np.pi * np.minimum(1, t / d)) ** 1.5


def owl():
    out = np.zeros(int(2.0 * SR))
    for t0, f0, d in ((0.0, 420, 0.42), (0.95, 400, 0.12), (1.12, 410, 0.5)):
        h = _hoot(f0, d); a = int(t0 * SR); out[a:a + len(h)] += h
    return _fade(_norm(out, 0.6), 0.01, 0.1)


def loon():
    d = 2.2; t = tv(d); f = np.interp(t, [0, 0.35, 1.2, 1.6, 2.2], [560, 760, 820, 700, 690]) * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    e = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.6)
    return _fade(_norm(x * e, 0.6), 0.02, 0.2)


def ferryhorn(d=2.4):
    t = tv(d); x = np.zeros(len(t))
    for m in (33, 40):
        f = hz(m); x += sum(np.sin(2 * np.pi * f * k * t + k) / k ** 0.7 for k in range(1, 18))
    e = np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.5)
    return _fade(_norm(soft(x, 40, 1400, 2) * e, 0.7), 0.02, 0.3)


def trambell():
    out = np.zeros(int(1.2 * SR))
    for t0 in (0.0, 0.22):
        tt = tv(0.9); b = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * dk) * a for f, a, dk in ((1530, 1.0, 4.0), (3920, 0.4, 9.0), (2210, 0.3, 6.0)))
        a = int(t0 * SR); out[a:a + len(b)] += b * np.minimum(1, tt / 0.001)
    return _fade(_norm(out, 0.6), 0.0005, 0.1)


def relay():
    t = tv(0.4); g = _g('relay')
    x = np.sin(2 * np.pi * (62 + 50 * np.exp(-t * 40)) * t) * np.exp(-t * 14) + _noise(0.4, g, 1200, 8000) * np.exp(-t * 90) * 0.6 + np.sin(2 * np.pi * 2900 * t) * np.exp(-t * 60) * 0.2
    return _fade(_norm(x, 0.9), 0.0003, 0.05)


def neon(d, on):
    t = tv(d); n = len(t); o = np.broadcast_to(np.asarray(on, float), (n,))
    x = sum(np.sin(2 * np.pi * 100 * k * t) / k ** 0.6 for k in range(1, 14)) + soft(_noise(d, _g('neon')), 3000, 9000) * 0.4
    return _fade(_norm(soft(x, 80, 6000) * o, 0.5), 0.003, 0.2)


def airrush(d):
    t = tv(d); g = _g('air')
    return _fade(_norm(soft(_noise(d, g), 200, 5000, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t)), 0.5), 0.4, 0.4)


def pines(d):
    t = tv(d); g = _g('pines')
    x = soft(_noise(d, g), 250, 2400, 2) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.17 * t + 1.1) * np.sin(2 * np.pi * 0.09 * t))
    return _fade(_norm(x, 0.5), 0.3, 0.6)


def pulse_bar(s, t0, chord, g=0.12, S=NightFlight, stem='pulse', sub=True, bright=0.35):
    root, _ = chord
    for k in range(8):
        m = root + 24 + (7 if k % 4 == 3 else 0)
        s.note(pluck(m, S.B / 2 * 0.6, bright), t0 + k * S.B / 2, g * (1.0 if k % 2 == 0 else 0.7), (-0.2, 0.2)[k % 2], 0.25, stem=stem, name='pulse')
    if sub:
        for k in (0, 2): s.note(sub_bass(root, S.B * 1.6), t0 + k * S.B, g * 1.5, 0, 0.05, stem='bass', name='sub')


def arp_bar(s, t0, chord, g=0.1, bright=0.7, S=NightFlight, stem='arp'):
    notes = list(chord[1]) + [chord[1][0] + 12]
    seq = notes + notes[-2:0:-1]
    for k in range(16):
        m = seq[k % len(seq)] + 12
        s.note(pluck(m, S.B / 4 * 0.8, bright), t0 + k * S.B / 4, g * (1.0 if k % 4 == 0 else 0.7), (-0.4, 0.4)[k % 2], 0.35, stem=stem, name='arp')


def chord_pad(s, t0, d, chord, g=0.1, cut=2600, r=1.2, stem='pad', name='pad', oct=0):
    for i, m in enumerate(chord[1]):
        s.note(supersaw(m + oct, d, cut=cut, a=0.25, r=r, seed=i), t0, g, (-0.5 + i / max(1, len(chord[1]) - 1)), 0.5, stem=stem, name=name)
