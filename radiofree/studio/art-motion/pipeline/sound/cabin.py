"""The CABIN kit (first used by Give Way, 12 Nov). Per SOUND.md, "Sound per film": a film's sound comes from its
story's world. This one is a car at night heard from the driver's seat, a sat-nav that never raises its voice, and
what comes over the roof. All synthesised.

    Cabin            the series: 90 BPM (the hazard relay's tick-tock IS the click track), E minor landing on C; a small
                     padded room (0.5 s), nothing bright
    drive(d, speed)  the car: engine, tires on packed snow, wind; all of it follows `speed` (0..1, one value a sample),
                     and at 0 it idles
    heater(d)        the fan
    navchime(kind)   the sat-nav's chimes, soft glass bells: 'go' | 'alert' | 'info' | 'recalc' | 'done'
    blip(k, down)    one row arriving on its screen (k: which row; down: a refusal, two notes falling)
    relay(tock)      the indicator relay: tick, or the lower tock
    jet(d, tp, ...)  a fighter passing over the roof at tp seconds in: the low end first, the roar, the turbine's whine
                     bent by the pass (Doppler), louder behind it than ahead; `burner` adds the afterburner's crackle
    rattle(d, env)   the dashboard taking it: a loose trim's buzz under `env` (one value a sample)
    chirp()          tires meeting a runway, far off
    faraway(d)       jets high up: a long tear across the sky
    snowblast(d)     a jet's wash throwing the road's snow at the glass
    crunch()         tires settling on snow as the car stops

Score helpers (music bus, as stems):
    road_bar         a bar of the road: one low pulse a beat and a held fifth
    vamp_bar         a bar of the vamp on the relay's clock: marimba off the beat, a round bass on one and the and of two
"""
import numpy as np
from rfsound import SR, tv, hz, soft, marimba, sub_bass, supersaw, pluck
from sfx import _noise, _fade, _norm, _g


class Cabin:
    BPM = 90
    KEY = 'E minor'
    B = 60 / 90
    VERB = dict(t60=0.5, lo=160, hi=5200, pre=0.006, g=0.2, seed=44)     # a small padded room: the cabin
    GLUE = dict(thresh=-16.0, ratio=2.3)
    EQ = dict(fc=3000.0, db=0.0, hp=32.0)
    # (bass root, voicing)
    Em, C, G, D, Cadd9 = (40, (64, 67, 71)), (36, (64, 67, 72)), (43, (62, 67, 71)), (38, (62, 66, 69)), (36, (60, 64, 67, 74))
    CHORDS = [Em, C, G, D]


def _arr(v, n):
    """a number, or one value a sample (a sample short or long is the caller's rounding: held at the end or cut)"""
    v = np.asarray(v, float)
    if v.ndim == 0: return np.full(n, float(v))
    return v[:n] if len(v) >= n else np.concatenate([v, np.full(n - len(v), v[-1])])


def drive(d, speed, seed=0):
    t = tv(d); n = len(t); sp = _arr(speed, n); g = _g('drive', seed)
    f = 31 + 44 * sp; ph = 2 * np.pi * np.cumsum(f) / SR
    eng = sum(np.sin(k * ph + k * 0.7) / k ** 1.1 for k in (1, 2, 3, 4, 6)) * (0.42 + 0.58 * sp)
    tire = soft(_noise(d, g), 180, 1500, 2) * sp ** 1.3 * 1.5
    grit = soft(_noise(d, g), 900, 4200, 2) * sp ** 2 * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 0.7 * t))) * 0.3
    wind = soft(_noise(d, g), 70, 420, 2) * sp ** 2 * 1.2
    return _fade(_norm(soft(eng, 24, 460, 2) * 0.9 + tire + grit + wind, 0.8), 0.05, 0.25)


def heater(d):
    t = tv(d); g = _g('heater')
    x = soft(_noise(d, g), 260, 2100, 2) * (0.9 + 0.1 * np.sin(2 * np.pi * 0.23 * t)) + 0.12 * np.sin(2 * np.pi * 112 * t)
    return _fade(_norm(x, 0.5), 0.3, 0.3)


def _bell(m, d=0.6):
    t = tv(d); f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9) + 0.1 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 15)
    return x * np.exp(-t * 6.5) * np.minimum(1, t / 0.003)


NAV = {'go': ((76, 83), 0.13), 'alert': ((88, 83, 88), 0.105), 'info': ((79, 83), 0.1), 'recalc': ((84, 81, 76), 0.12), 'done': ((72, 76, 79, 86), 0.085)}


def navchime(kind='go'):
    seq, step = NAV[kind]; out = np.zeros(int((len(seq) * step + 0.75) * SR))
    for i, m in enumerate(seq):
        b = _bell(m); a = int(i * step * SR); out[a:a + len(b)] += b * (1.0 if i == len(seq) - 1 else 0.8)
    return _fade(_norm(out, 0.7), 0.001, 0.12)


def navhit(kind='go'):
    """how far into navchime(kind) its last note lands"""
    seq, step = NAV[kind]; return (len(seq) - 1) * step


def blip(k=0, down=False):
    seq = ((79 + 2 * k, 0.0),) if not down else ((76, 0.0), (71, 0.09))
    out = np.zeros(int(0.5 * SR))
    for m, t0 in seq:
        tt = tv(0.22); b = (np.sin(2 * np.pi * hz(m) * tt) + 0.2 * np.sin(2 * np.pi * 2 * hz(m) * tt)) * np.exp(-tt * 22) * np.minimum(1, tt / 0.002)
        a = int(t0 * SR); out[a:a + len(b)] += b
    return _fade(_norm(out, 0.55), 0.001, 0.05)


def relay(tock=False):
    t = tv(0.09); g = _g('relay', tock); f = 1750 if tock else 2500
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 170) + _noise(0.09, g, 1500, 7000) * np.exp(-t * 320) * 0.7 + np.sin(2 * np.pi * (150 if tock else 190) * t) * np.exp(-t * 60) * 0.5
    return _fade(_norm(x, 0.7), 0.0003, 0.02)


def jet(d, tp, v=62.0, h=9.0, away=True, burner=0.0, seed=0):
    """one pass. Distance sets the level and how dull it is; the whine is Doppler-bent; behind a jet is louder than ahead."""
    t = tv(d); n = len(t); g = _g('jet', seed, away); x = v * (t - tp); dist = np.sqrt(h * h + x * x)
    amp = (h / dist) ** 1.15; vr = v * x / dist; dop = 1 / (1 + vr / 340.0)
    behind = 1 / (1 + np.exp(-(t - tp) * 5.0)); side = (0.55 + 1.25 * behind) if away else (0.75 + 0.9 * (1 - behind) + 0.5 * behind)
    near = np.clip(amp * 1.6, 0, 1)
    roar_far = soft(_noise(d, g), 45, 700, 2); roar_near = soft(_noise(d, g), 70, 3400, 2)
    roar = (roar_far * (1 - near) + roar_near * near) * amp * side
    rumble = soft(_noise(d, g), 20, 130, 2) * amp ** 0.55 * 1.5
    ph = 2 * np.pi * np.cumsum(2700 * dop) / SR
    whine = (np.sin(ph) + 0.4 * np.sin(1.51 * ph) + 0.2 * np.sin(2.3 * ph)) * amp ** 1.2 * (1 - 0.75 * behind if away else 0.4 + 0.6 * (1 - behind)) * 0.12
    b = _arr(burner, n); mod = np.abs(soft(_noise(d, g), 18, 70, 2)); mod = mod / max(1e-9, mod.max())
    crack = soft(_noise(d, g), 120, 2600, 2) * mod ** 1.5 * amp ** 0.9 * b * 2.6
    return _fade(_norm(soft(roar + rumble + whine + crack, 18, 5600, 2), 0.9), 0.3, 0.5)


def rattle(d, env, seed=0):
    t = tv(d); n = len(t); e = _arr(env, n); g = _g('rattle', seed)
    buzz = np.sign(np.sin(2 * np.pi * 93 * t + 2 * np.sin(2 * np.pi * 7 * t))) * 0.5 + _noise(d, g) * 0.6
    x = soft(buzz, 1400, 5200, 2) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t)) ** 2 * e
    return _fade(_norm(x, 0.6), 0.01, 0.05)


def chirp():
    out = np.zeros(int(0.6 * SR)); g = _g('chirp')
    for t0, f0 in ((0.0, 1500), (0.06, 1320)):
        tt = tv(0.1); c = np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f0 * 0.62, len(tt))) / SR) * np.sin(np.pi * tt / 0.1) + _noise(0.1, g, 900, 3000) * np.sin(np.pi * tt / 0.1) * 0.4
        a = int(t0 * SR); out[a:a + len(c)] += c
    tt = tv(0.5); out[:len(tt)] += np.sin(2 * np.pi * (48 + 30 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9) * 1.3
    return _fade(_norm(soft(out, 30, 2600, 2), 0.7), 0.002, 0.1)


def faraway(d, seed=0):
    t = tv(d); g = _g('faraway', seed); k = t / d
    x = soft(_noise(d, g), 35, 520, 2) * np.sin(np.pi * k) ** 1.6 * (0.75 + 0.25 * np.sin(2 * np.pi * 0.9 * t + seed))
    hi = soft(_noise(d, g), 300, 1500, 2) * np.sin(np.pi * np.clip(k * 1.6, 0, 1)) ** 3 * 0.3
    return _fade(_norm(x + hi, 0.6), 0.4, 0.5)


def snowblast(d=1.8):
    t = tv(d); g = _g('snowblast'); e = np.minimum(1, t / 0.07) * np.exp(-t * 2.4)
    air = soft(_noise(d, g), 160, 5200, 2) * e; buffet = soft(_noise(d, g), 25, 110, 2) * e ** 0.6 * 1.4
    pat = np.zeros(len(t))
    for i in range(420):
        t0 = g.random() ** 1.8 * (d - 0.05); tt = tv(0.012); c = _noise(0.012, g, 2500, 9000) * np.exp(-tt * 400) * (0.3 + 0.7 * g.random()) * np.exp(-t0 * 2.0)
        a = int(t0 * SR); pat[a:a + len(c)] += c
    return _fade(_norm(air + buffet + pat * 0.9, 0.85), 0.002, 0.3)


def crunch():
    d = 0.7; t = tv(d); g = _g('crunch')
    x = soft(_noise(d, g), 500, 3200, 2) * np.exp(-t * 6) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 14 * t * (1 - t / d * 0.6))))
    x += np.sin(2 * np.pi * (170 - 60 * t / d) * t + 3 * np.sin(2 * np.pi * 8 * t)) * np.sin(np.pi * np.clip(t / 0.5, 0, 1)) * 0.12      # the suspension settling
    return _fade(_norm(x, 0.6), 0.004, 0.15)


def road_bar(s, t0, chord, g=0.1, S=Cabin, pad=True):
    root, keys = chord
    for k in range(4): s.note(sub_bass(root, S.B * 0.55), t0 + k * S.B, g * (1.5 if k == 0 else 1.0), 0, 0.05, stem='bass', name='the road: pulse')
    if pad:
        for i, m in enumerate((root + 12, root + 19)): s.note(supersaw(m, 4 * S.B, cut=700, a=0.4, r=0.5, seed=i), t0, g * 0.5, (-0.4, 0.4)[i], 0.3, stem='pad', name='the road: a held fifth')


def vamp_bar(s, t0, chord, g=0.12, S=Cabin, bright=0.8):
    root, keys = chord; E = S.B / 2
    for k, (i, vel) in enumerate(((0, 0.9), (2, 0.6), (1, 0.75), (2, 0.6), (0, 0.8), (1, 0.6), (2, 0.85), (1, 0.55))):
        if k in (0, 4): continue                                   # the relay has the beat; the marimba answers it
        s.note(marimba(keys[i] + 12, 0.25, vel * bright), t0 + k * E, g * vel, (-0.3, 0.0, 0.3)[i], 0.3, stem='marimba', name='vamp')
    for k in (0, 3, 4): s.note(sub_bass(root, S.B * (0.9 if k != 3 else 0.4)), t0 + k * E, g * 1.6, 0, 0.05, stem='bass', name='vamp bass')
    s.note(pluck(keys[0], 0.3, 0.5), t0 + 6 * E, g * 0.6, 0.2, 0.25, stem='keys', name='vamp pluck')
