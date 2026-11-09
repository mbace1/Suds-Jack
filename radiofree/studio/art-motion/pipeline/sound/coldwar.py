"""The COLD WAR kit (first used by Sleep Tight, ICEYE, 9 Nov). Owner, 9 Nov: "can we plan some slightly different sounds?
Now it's all the same sounds on all the videos". Every film had been scored from the same RFH bed, motif, pop and
accent (stems.py); from now on a film's sound comes from its story's world, as its picture does (SOUND.md, "Sound
per film"). This is the first such kit: a spy-film night in a concrete room, all synthesised, nothing sampled.

    ColdWar          the series: 96 BPM, D minor, i–VI–iv–V (Dm Bb Gm A); a dark 2.4 s concrete room, a duller top
    bass(m, d)       a sawtooth through a closing low-pass: the ostinato's eighth notes
    arp(m, d, b)     a narrow pulse with a quick filter pluck: the sixteenth-note sequencer line (b = brightness 0..1)
    drone(m, d)      three detuned saws under a slow filter, breathing
    stab(ms, d)      a short brassy synth chord, for a caption's pop word
    shortwave(d)     a radio between stations: band-limited static, crackle, a heterodyning whistle that drifts
    teletype(n)      n strikes of a teleprinter at its own uneven rate: the sound of a tag being typed
    key()            one hard teleprinter strike with a low body: the kit's caption pop
    ping(k)          a sonar ping, a little higher on alternate pings
    boom()           a sub drop with a noise tail: a cut into a new scale

Patterns (arp_bar, bass_bar) are written per bar so a score can drop or keep each line against the picture.
"""
import numpy as np
from rfsound import SR, tv, hz, soft
from sfx import _noise, _tvbp, _fade, _norm, _g


class ColdWar:
    BPM = 96
    KEY = 'D minor'
    B = 60 / 96
    VERB = dict(t60=2.4, lo=160, hi=5200, pre=0.03, g=0.3, seed=77)     # a dark concrete room
    GLUE = dict(thresh=-16.0, ratio=2.2)
    EQ = dict(fc=3200.0, db=-1.5, hp=34.0)                                # a duller top than the RFH plate
    # (bass root, arpeggio notes), one chord a bar: Dm  Bb  Gm  A
    CHORDS = [(38, (62, 65, 69, 74)), (34, (62, 65, 70, 74)), (31, (62, 67, 70, 74)), (33, (61, 64, 69, 73))]


def chord_at(t, t0, S=ColdWar):
    return S.CHORDS[int(max(0, t - t0) // (4 * S.B)) % len(S.CHORDS)]


def onepole(x, fc):
    """a one-pole low-pass whose cutoff may move (fc: Hz, a number or one value a sample)"""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); a = np.exp(-2 * np.pi * np.clip(fc, 20, SR / 2.2) / SR)
    y = np.empty_like(x); z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z; y[i] = z
    return y


def _saw(f, t, detune=0.0):
    x = 2 * ((f * t) % 1.0) - 1
    if detune: x = 0.5 * (x + 2 * ((f * (1 + detune) * t) % 1.0) - 1)
    return x


def bass(m, d=0.28):
    t = tv(d); f = hz(m)
    x = _saw(f, t, 0.004) * 0.7 + np.sin(2 * np.pi * f * t) * 0.5
    cut = 180 + 1100 * np.exp(-t * 16)
    y = onepole(onepole(x, cut), cut)
    return _fade(_norm(y * np.exp(-t * 3.5), 0.8), 0.003, 0.04)


def arp(m, d=0.15, b=0.7):
    t = tv(d); f = hz(m)
    x = np.where(((f * t) % 1.0) < 0.3, 1.0, -1.0)
    cut = 300 + (900 + 3200 * b) * np.exp(-t * 22)
    y = onepole(onepole(x, cut), cut)
    return _fade(_norm(y * np.exp(-t * 9), 0.6), 0.002, 0.03)


def drone(m, d):
    t = tv(d); f = hz(m)
    x = sum(_saw(f * r, t) for r in (1.0, 1.006, 0.995)) / 3 + _saw(f / 2, t) * 0.4
    cut = 420 + 260 * np.sin(2 * np.pi * 0.11 * t) ** 2
    y = onepole(onepole(x, cut), cut) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.23 * t))
    return _fade(_norm(y, 0.6), 0.8, 0.8)


def stab(ms, d=0.45):
    t = tv(d); x = sum(_saw(hz(m), t, 0.003) for m in ms) / len(ms)
    cut = 600 + 2600 * np.exp(-t * 9)
    y = onepole(onepole(x, cut), cut) * np.exp(-t * 4)
    return _fade(_norm(y, 0.6), 0.004, 0.08)


def shortwave(d, seed='sw'):
    """a radio between stations"""
    t = tv(d); g = _g('shortwave', seed)
    static = soft(_noise(d, g), 300, 4200, 2) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3.3 * t + g.uniform(0, 6))))
    crackle = (g.random(len(t)) < 0.0012).astype(float) * g.standard_normal(len(t)) * 6
    f = 900 + 380 * np.sin(2 * np.pi * 0.07 * t + 1.0) + 40 * np.sin(2 * np.pi * 5.5 * t)
    whistle = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.19 * t) ** 2)
    return _fade(_norm(static + soft(crackle, 800, 6000) + whistle, 0.6), 0.3, 0.3)


def key(k=0):
    """one teleprinter strike: a hard click, a short metal ring, a low body"""
    d = 0.09; t = tv(d); g = _g('key', k)
    x = _noise(d, g, 1800, 7000) * np.exp(-t * 140) + np.sin(2 * np.pi * (2200 + 90 * (k % 4)) * t) * np.exp(-t * 90) * 0.35
    x += np.sin(2 * np.pi * 190 * t) * np.exp(-t * 60) * 0.6
    return _fade(_norm(x, 0.8), 0.0004, 0.01)


def teletype(n=8, rate=13.0, seed=0):
    """n strikes at a teleprinter's own uneven rate"""
    g = _g('teletype', seed); d = n / rate + 0.15; x = np.zeros(int(d * SR))
    t = 0.0
    for i in range(n):
        s = key(seed * 31 + i) * (0.6 + 0.4 * g.random()); a = int(t * SR); x[a:a + len(s)] += s[:len(x) - a]
        t += (1 / rate) * (0.7 + 0.6 * g.random())
    return _fade(_norm(x, 0.7), 0.001, 0.05)


def ping(k=0):
    d = 1.2; t = tv(d); f = 1180 * (1.0 if k % 2 == 0 else 1.06)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2) + np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 10) * 0.18
    return _fade(_norm(x, 0.7), 0.004, 0.2)


def boom():
    d = 1.4; t = tv(d); g = _g('boom')
    x = np.sin(2 * np.pi * (34 + 60 * np.exp(-t * 6)) * t) * np.exp(-t * 2.6) + soft(_noise(d, g), 60, 700) * np.exp(-t * 4) * 0.4
    return _fade(_norm(x, 0.9), 0.002, 0.3)


def arp_bar(s, t0, chord, b=0.7, g=0.12, S=ColdWar, stem='arp'):
    """one bar of sixteenths up and down the chord"""
    notes = list(chord[1]); seq = notes + notes[-2:0:-1]
    for k in range(16):
        m = seq[k % len(seq)] + (12 if k in (6, 14) else 0)
        s.note(arp(m, S.B / 4 * 0.95, b), t0 + k * S.B / 4, g * (1.0 if k % 4 == 0 else 0.75), (-0.35, 0.35)[k % 2], 0.25, stem=stem, name='arp')


def bass_bar(s, t0, chord, g=0.3, S=ColdWar, eighths=True, stem='bass'):
    """one bar of the ostinato: eighths on the root, an octave jump on the off-beat of 4"""
    n = 8 if eighths else 4
    for k in range(n):
        m = chord[0] + (12 if eighths and k == 7 else 0)
        s.note(bass(m, S.B * (0.45 if eighths else 0.9)), t0 + k * S.B * (4 / n), g, 0, 0.08, stem=stem, name='bass')
