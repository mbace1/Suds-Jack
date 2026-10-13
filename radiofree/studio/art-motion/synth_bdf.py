#!/usr/bin/env python3
"""Score for "The Biodiversity Fund" (15 s). Synthesised, no samples.

    uv run --with numpy --with scipy --with soundfile python 音频/synth_bdf.py

The papercut grid (112 BPM, cuts on beats 0/6/12/18/24) and the D–F–A stamp motif,
re-orchestrated for a forest: wind instead of rain, a low horn instead of celesta,
and every effect on the frame of its event in scenes/bdf_*.js — the cheque landing,
a saw and a fall on each felling beat, the last log, the tag, the stamp, the
seedling, and the last hit at 14.2 s ringing out instead of being cut.
"""
import numpy as np
import soundfile as sf
from pathlib import Path

SR = 48000
DUR = 15.6
N = int(DUR * SR)
BEAT = 60 / 112
CUT = [0, 6 * BEAT, 12 * BEAT, 18 * BEAT, 24 * BEAT]
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
OUT = Path(__file__).with_name("配乐_bdf.wav")


def tv(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, t, g=1.0, pan=0.0):
    s = int(round(t * SR))
    if s >= N or s < 0: return
    sig = sig[: N - s] * g; a = (pan + 1) * np.pi / 4
    L[s:s + len(sig)] += sig * np.cos(a); R[s:s + len(sig)] += sig * np.sin(a)


def env(d, a=0.005, r=0.2):
    t = tv(d + r); e = np.minimum(1, t / a); e[t > d] *= np.exp(-(t[t > d] - d) / (r / 4)); return e


def tone(f, d, harm=(1,), a=0.005, r=0.2, decay=0.0):
    t = tv(d + r); s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t + rng.uniform(0, 6)) for k, h in enumerate(harm))
    e = env(d, a, r)[: len(t)]
    if decay: e = e * np.exp(-t * decay)
    return s * e


def noise(d, lo=None, hi=None):
    x = rng.standard_normal(int(d * SR))
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if lo: X[f < lo] = 0
    if hi: X[f > hi] = 0
    return np.fft.irfft(X, len(x))


# ── instruments ────────────────────────────────────────────────────────────
def celesta(m, d=0.4): return tone(hz(m), d, (1, 0.0, 0.25, 0, 0.08), 0.002, 0.6, decay=5)
def brass(m, d=0.3): return np.tanh(tone(hz(m), d, (1, 0.7, 0.5, 0.35, 0.2, 0.12), 0.02, 0.12) * 1.6) * 0.7
def bassoon(m, d=0.25): return tone(hz(m), d, (0.6, 1, 0.5, 0.4, 0.3), 0.015, 0.08)
def tuba(m, d=0.25): return tone(hz(m), d, (1, 0.5, 0.2), 0.01, 0.1)
def pizz(m): return tone(hz(m), 0.05, (1, 0.4, 0.2), 0.001, 0.5, decay=9)
def snare(d=0.12): return noise(d + 0.05, 1200, 9000) * np.exp(-tv(d + 0.05) * 28) * 0.55
def kick(): t = tv(0.3); return np.sin(2 * np.pi * (45 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
def stamp():                                   # a rubber stamp: low thud + paper slap
    t = tv(0.25); return (np.sin(2 * np.pi * (70 + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 18) + noise(0.25, 300, 3000) * np.exp(-t * 40) * 0.5)
def click(): t = tv(0.03); return noise(0.03, 2000, 12000) * np.exp(-t * 200)
def bell(): return sum(tone(f, 0.05, (1,), 0.001, 1.4, decay=2.2) * g for f, g in [(1975, 0.5), (2637, 0.3), (987, 0.25)])
def blip(): return tone(1760, 0.06, (1, 0.2), 0.002, 0.05) * 0.5
def rustle(d=0.6): return noise(d, 1500, 8000) * np.sin(np.pi * tv(d) / d) * 0.25


def card(): t = tv(0.12); return noise(0.12, 800, 6000) * np.exp(-t * 45) * 0.6 + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * 0.4   # a card sheet landing
def thump(): t = tv(0.4); return np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 11) + noise(0.4, 80, 900) * np.exp(-t * 14) * 0.6   # cloth taking a weight
def glide(f0, f1, d=0.14): t = tv(d); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR; return np.sin(ph) * np.sin(np.pi * t / d) * 0.5


def voice(f0, vowel, d):
    """one syllable: a pulse train through two formant bands — a voice's shape with no words in it"""
    F = {'e': (530, 1840), 'u': (350, 900), 'i': (300, 2300)}[vowel]
    t = tv(d); f = f0 * (1 + 0.06 * np.sin(2 * np.pi * 5.5 * t)) * np.linspace(1.04, 0.96, len(t))
    src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    X = np.fft.rfft(src); fr = np.fft.rfftfreq(len(src), 1 / SR)
    H = sum(np.exp(-((fr - fc) / (fc * 0.12)) ** 2) * g for fc, g in zip(F, (1, 0.6)))
    out = np.fft.irfft(X * H, len(src)); e = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return out * e / max(1e-9, np.abs(out).max())


def saw(d=0.32):                               # a chainsaw bite: a buzzing sawtooth through noise, rising
    t = tv(d); f = 95 + 40 * t / d; ph = 2 * np.pi * np.cumsum(f * np.ones_like(t)) / SR
    s = (2 * ((ph / (2 * np.pi)) % 1) - 1) * 0.5 + noise(d, 300, 5000) * 0.35
    return s * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.05) * 0.5
def fall():                                    # a trunk landing: a deep thud with a crack of branches
    t = tv(0.7); return np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 12)) * t) * np.exp(-t * 6) + noise(0.7, 200, 4000) * np.exp(-t * 9) * 0.5
def creak(d=0.3): t = tv(d); return np.sin(2 * np.pi * (180 - 90 * t / d) * t + 3 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.pi * t / d) * 0.3
def horn(m, d=0.6): return np.tanh(tone(hz(m), d, (1, 0.5, 0.25, 0.12), 0.08, 0.3) * 1.3) * 0.6


# ── the bed: wind through spruce, gusting ──────────────────────────────────
wind = noise(DUR, 120, 1800); wind *= 0.05 * (1 + 0.6 * np.sin(2 * np.pi * 0.17 * tv(DUR)) * np.sin(2 * np.pi * 0.05 * tv(DUR) + 1))
L[:len(wind)] += wind; R[:len(wind)] += np.roll(wind, 900)

CHORD = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [38, 50, 53]]
MOTIF = [0, 1, 2]
def beat(k): return k * BEAT

# shot 1 · the cheque: a low horn motif in the wind, the cheque lands
for i, b in enumerate([0, 0.5, 1]): add(horn(CHORD[0][MOTIF[i]] - 12, 0.7 if i == 2 else 0.25), beat(b) + 0.02, 0.4, -0.2)
add(glide(220, 110, 0.9), 0.1, 0.25, 0.2)                                           # lowered on strings
add(stamp(), 1.0, 0.9); add(card(), 1.02, 0.7); add(bell(), 1.04, 0.3, 0.3)          # it lands
for i, b in enumerate([3, 3.5, 4]): add(horn(CHORD[0][MOTIF[i]], 0.6 if i == 2 else 0.2), beat(b), 0.3, 0.2)

# shot 2 · the felling: the march starts; a saw before each beat, a fall on it
c0 = 6
add(kick() * 0.7, CUT[1], 0.9); add(card(), CUT[1], 0.6)
for b in range(6): add(tuba(CHORD[1][0] - 12) * 0.5, beat(c0 + b)); add(snare() * (0.45 if b % 2 else 0.2), beat(c0 + b + 0.5))
for k in range(1, 6):
    t0 = CUT[1] + k * BEAT
    add(saw(), t0 - 0.34, 0.7, 0.3 - k * 0.1); add(creak(), t0 + 0.05, 0.6, 0.2); add(fall(), t0 + 0.34, 1.0, -0.1); add(click(), t0 + 0.36, 0.6, 0.4)   # the counter ticks over
for i, b in enumerate([1, 1.5, 2]): add(brass(CHORD[1][MOTIF[i]] + 12, 0.5 if i == 2 else 0.18), beat(c0 + b), 0.35)

# shot 3 · the fund: bassoon motif; the last log lands, the tag swings round
c0 = 12
add(kick() * 0.6, CUT[2], 0.8); add(card(), CUT[2], 0.6)
for b in range(6): add(tuba(CHORD[2][0] - 12) * 0.4, beat(c0 + b)); add(snare() * 0.18, beat(c0 + b + 0.5))
for i, b in enumerate([0, 0.5, 1]): add(bassoon(CHORD[2][MOTIF[i]], 0.45 if i == 2 else 0.15), beat(c0 + b), 0.5, -0.15)
add(thump(), CUT[2] + BEAT, 1.0); add(card(), CUT[2] + 2 * BEAT, 0.8); add(bell(), CUT[2] + 2 * BEAT + 0.03, 0.35, 0.3)
add(blip(), CUT[2] + 3.2 * BEAT, 0.4, -0.4)                                            # the ear

# shot 4 · the order: the letter slides in, the stamp comes down on the beat
c0 = 18
add(kick() * 0.6, CUT[3], 0.8); add(rustle(0.35), CUT[3], 0.8, 0.3)
for b in range(6): add(tuba(CHORD[3][0] - 12) * 0.55, beat(c0 + b)); add(kick() * 0.35, beat(c0 + b))
for k in range(6): add(snare(0.05) * (0.2 + k * 0.06), beat(c0 + 0.5) + k * BEAT / 4)    # a roll into the stamp
add(stamp(), beat(c0 + 2), 1.0); add(kick() * 0.8, beat(c0 + 2), 0.8); add(brass(CHORD[3][2] + 12, 0.7), beat(c0 + 2), 0.6)

# shot 5 · the replanting: STOP — HANG — the seedling — HIT at 14.2 — ring out
T_SET, T_TALLY, T_HIT = 13.7, 13.9, 14.2
add(kick() * 0.5, CUT[4], 0.7)
add(thump() * 0.6, T_SET, 0.8)                                                         # soil
add(card(), T_TALLY, 0.8); add(card(), T_TALLY + 0.15, 0.8)
add(stamp(), T_HIT, 1.0)
for m in (38, 50, 53, 57): add(horn(m + 12, 0.6), T_HIT, 0.3)
add(pizz(26 + 12), T_HIT, 0.9); add(bell(), T_HIT + 0.02, 0.3, -0.2)
for k in range(3): add(blip(), T_HIT + 0.1 + k * 0.25, 0.25, 0.3)                      # the hall's lights

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / 1.2
mix /= max(1e-9, np.abs(mix).max()) / 0.89
end = int(15.0 * SR); mix = mix[:end]
# ring out, never a chop: from just after the 14.2 s hit, everything decays exponentially
t0 = int(14.3 * SR); tt = np.arange(end - t0) / SR; mix[t0:] *= np.exp(-tt / 0.16)[:, None]
sf.write(OUT, mix, SR)
print(OUT)
