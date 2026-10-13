#!/usr/bin/env python3
"""Score for "You Looked At It" (15 s) — synthesised in code, no samples.

    uv run --with numpy --with scipy --with soundfile python 音频/synth.py

Method from the skill (references/05-节奏与配乐.md): a strict BPM grid (112 BPM,
cuts on beats 0/6/12/18/24 → 0, 3.214, 6.429, 9.643, 12.857 s); ONE three-note
motif (D–F–A, a stamp: short-short-long) re-orchestrated per shot and moved with
the chord; hard entrances at cuts, no crossfades, no whooshes; the ending is
stop → hang → hit → react → close. Every sound effect sits on the frame of its
event in the scenes (times copied from scenes/rfa_*.js).
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
OUT = Path(__file__).with_name("配乐.wav")


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


# ── the bed: rain all through, quieter under the march ─────────────────────
rain = noise(DUR, 600, 7000); rain *= 0.035 * (1 + 0.3 * np.sin(2 * np.pi * 0.23 * tv(DUR)))
L[:len(rain)] += rain; R[:len(rain)] += np.roll(rain, 700)

# chords per shot (D minor, a march that gets more official): i, VI, iv, V, i
CHORD = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [38, 50, 53]]
MOTIF = [0, 1, 2]                               # chord tones 1-3-5: short, short, LONG


def beat(k): return k * BEAT


# shot 1 · the square: celesta motif in the rain, a soft kick on the downbeats
for b in range(0, 6):
    if b % 2 == 0: add(kick() * 0.35, beat(b))
for i, b in enumerate([0, 0.5, 1]):
    add(celesta(CHORD[0][MOTIF[i]] + 24, 0.6 if i == 2 else 0.2), beat(b) + 0.02, 0.35, -0.2)
for i, b in enumerate([3, 3.5, 4]):
    add(celesta(CHORD[0][MOTIF[i]] + 24, 0.6 if i == 2 else 0.2), beat(b), 0.3, 0.2)

# shot 2 · the lens: the march starts — tuba oom, snare pah, brass stabs on the wedge
c0 = 6
for b in range(6):
    add(tuba(CHORD[1][0] - 12) * 0.5, beat(c0 + b)); add(snare() * (0.5 if b % 2 else 0.25), beat(c0 + b + 0.5))
for i, b in enumerate([1, 1.5, 2]):
    add(brass(CHORD[1][MOTIF[i]] + 12, 0.5 if i == 2 else 0.18), beat(c0 + b), 0.45)
for i, b in enumerate([4, 4.5, 5]):
    add(brass(CHORD[1][MOTIF[i]] + 12, 0.5 if i == 2 else 0.18), beat(c0 + b), 0.45)

# shot 3 · the receipt: bassoon motif, the printer ticking eighths, a stamp per beat
c0 = 12
for b in range(6):
    add(tuba(CHORD[2][0] - 12) * 0.45, beat(c0 + b)); add(snare() * 0.2, beat(c0 + b + 0.5))
    for e in range(2): add(click() * 0.35, beat(c0 + b + e * 0.5) + 0.02, 1, 0.3)
for i, b in enumerate([0, 0.5, 1]): add(bassoon(CHORD[2][MOTIF[i]], 0.45 if i == 2 else 0.15), beat(c0 + b), 0.5, -0.15)
for i, b in enumerate([3, 3.5, 4]): add(bassoon(CHORD[2][MOTIF[i]] + 12, 0.45 if i == 2 else 0.15), beat(c0 + b), 0.45, -0.15)

# shot 4 · the queue: the full march — brass motif, tuba, snare roll into the price
c0 = 18
add(bell(), CUT[3] + 0.05, 0.45, 0.4)
for b in range(6):
    add(tuba(CHORD[3][0] - 12) * 0.55, beat(c0 + b)); add(snare() * 0.4, beat(c0 + b + 0.5)); add(kick() * 0.4, beat(c0 + b))
for i, b in enumerate([0, 0.5, 1]): add(brass(CHORD[3][MOTIF[i]] + 12, 0.45 if i == 2 else 0.16), beat(c0 + b), 0.5)
for k in range(12): add(snare(0.05) * (0.15 + k * 0.03), beat(c0 + 3) + k * BEAT / 4)   # a roll into the tag
add(brass(CHORD[3][2] + 12, 0.7), CUT[3] + 2.4, 0.6); add(stamp(), CUT[3] + 2.4, 0.9)

# shot 5 · the pocket: STOP — HANG (the blips) — HIT (STILL / LOOKING) — REACT — CLOSE
c0 = 24
for k in range(6): add(blip(), CUT[4] + 1.3 + k * 0.5, 0.6, 0.25)           # the light, every 0.5 s, on frame
add(stamp(), CUT[4] + 1.2, 1.0); add(stamp(), CUT[4] + 1.4, 1.0)
add(brass(38 + 12, 0.25), CUT[4] + 1.4, 0.4); add(brass(41 + 12, 0.25), CUT[4] + 1.55, 0.35)
add(pizz(26 + 12), CUT[4] + 2.05, 0.9)                                         # the close: a low pizzicato

# ── effects on their frames ────────────────────────────────────────────────
for i in range(7): add(stamp() * 0.5, 0.5 + i * 0.06, 0.6)                       # SAY ITS
for i in range(4): add(stamp() * 0.6, 0.9 + i * 0.08, 0.8)                       # NAME
add(blip(), 1.7, 0.8, 0.3)                                                       # the light comes on
add(kick() * 0.7, CUT[1], 0.9); add(stamp() * 0.4, CUT[1], 0.9)                 # the slam-in
for k in range(3): add(stamp() * 0.6, CUT[1] + BEAT + 2 * k * BEAT, 0.7)          # the wedge thrusts
for i in range(7): add(stamp() * 0.5, CUT[1] + 2 * BEAT + i * 0.04, 0.7)         # ORDERED
for i in range(6): add(stamp(), CUT[2] + i * BEAT + 0.15, 0.8)                    # each receipt verdict
add(rustle(2.0), CUT[3] + 0.2, 0.9, -0.3)                                        # the leaf falls
add(rustle(0.6), CUT[4], 0.7)                                                    # the glasses fold

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / 1.2
mix /= max(1e-9, np.abs(mix).max()) / 0.89
sf.write(OUT, mix[: int(15.0 * SR)], SR)
print(OUT)
