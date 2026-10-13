#!/usr/bin/env python3
"""Score for "You Looked At It" — the PAPERCUT cut (15 s). Synthesised, no samples.

    uv run --with numpy --with scipy --with soundfile python 音频/synth_rfp.py

Same grid and motif as synth.py (112 BPM, cuts on beats 0/6/12/18/24, the D–F–A
stamp motif re-orchestrated per shot); the effects are re-timed to the papercut
scenes (times copied from scenes/rfp_*.js), and the review's fixes are in: a hit on
every cut, the wake word actually SPOKEN (a formant voice, not TTS), a fabric thump
when the glasses go in the pocket, and the last hit at 14.2 s so it rings out under
the hold and fades — nothing new starts after 14.8 s.
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
OUT = Path(__file__).with_name("配乐_rfp.wav")


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

# shot 4 · the queue: the full march — brass motif, tuba, snare roll into SOLD
c0 = 18
add(bell(), CUT[3] + 0.05, 0.4, 0.4)
for b in range(6):
    add(tuba(CHORD[3][0] - 12) * 0.55, beat(c0 + b)); add(snare() * 0.4, beat(c0 + b + 0.5)); add(kick() * 0.4, beat(c0 + b))
for i, b in enumerate([0, 0.5, 1]): add(brass(CHORD[3][MOTIF[i]] + 12, 0.45 if i == 2 else 0.16), beat(c0 + b), 0.5)
for k in range(6): add(snare(0.05) * (0.2 + k * 0.06), beat(c0 + 2.5) + k * BEAT / 4)        # a roll into the tag
add(brass(CHORD[3][2] + 12, 0.7), beat(c0 + 4), 0.6); add(stamp(), beat(c0 + 4), 0.9)

# shot 5 · the pocket: STOP — HANG — the thump — HIT at 14.2 — ring out — fade
T_DROP, T_GLOW = 13.7, 14.2
add(rustle(0.5), CUT[4], 0.6, 0.3)                                               # the coat
add(thump(), T_DROP + 0.12, 1.0)                                                  # the glasses land in the pocket
for k, tt in enumerate([T_GLOW, T_GLOW + 0.55]): add(blip(), tt, 0.7 - k * 0.25, 0.25)   # the light through the card
add(stamp(), T_GLOW, 1.0); add(stamp(), T_GLOW + 0.12, 0.9)                        # STILL / LOOKING
for m in (38, 50, 53, 57): add(brass(m + 12, 0.55), T_GLOW, 0.32)                 # the chord, held
add(pizz(26 + 12), T_GLOW, 0.9); add(bell(), T_GLOW + 0.02, 0.3, -0.2)

# ── effects on their frames ────────────────────────────────────────────────
# shot 1: the wake word, said; the light waking and answering
add(card(), 0.55, 0.8); add(card(), 0.61, 0.5); add(card(), 0.85, 0.7)
add(voice(196, 'e', 0.2), 0.55, 0.55, -0.15)                                      # HEY
add(voice(220, 'u', 0.14), 0.85, 0.55, -0.15); add(voice(247, 'i', 0.2), 1.0, 0.55, -0.15)   # LOOK-SY
add(glide(880, 1760), 1.5, 0.7, 0.3)                                              # the light wakes
add(blip(), 2.1, 0.8, 0.3); add(blip(), 2.35, 0.8, 0.3)                           # and answers twice
# shot 2: the slam, the AR corners snapping, the wedge, the tag
add(kick() * 0.7, CUT[1], 0.9); add(card(), CUT[1], 0.9)
add(click(), CUT[1] + 0.3, 0.8, -0.3); add(click(), CUT[1] + 0.36, 0.8, -0.3)
add(noise(0.18, 400, 4000) * np.linspace(0.2, 1, int(0.18 * SR)) * 0.4, CUT[1] + 2 * BEAT - 0.18, 0.8, 0.3)   # the wedge coming up
add(stamp(), CUT[1] + 2 * BEAT, 1.0); add(card(), CUT[1] + 2 * BEAT + 0.05, 0.6)
add(stamp(), CUT[1] + 4 * BEAT, 0.9, 0.2)
# shot 3: the cut, each verdict, and the till on the total
add(kick() * 0.6, CUT[2], 0.8); add(card(), CUT[2], 0.7)
for i in range(5): add(rustle(0.16), CUT[2] + (i + 1) * BEAT - 0.16, 0.5); add(stamp(), CUT[2] + (i + 1) * BEAT, 0.85 if i < 4 else 1.0)
add(bell(), CUT[2] + 5 * BEAT + 0.04, 0.45, 0.3)
# shot 4: the cut, the leaf, every head at once
add(kick() * 0.6, CUT[3], 0.8); add(card(), CUT[3], 0.6)
add(rustle(2.0), CUT[3] + 0.1, 0.8, -0.3)
for k in range(4): add(click(), CUT[3] + 2 * BEAT + k * 0.012, 0.8, -0.45 + k * 0.3)
add(snare(0.06), CUT[3] + 2 * BEAT, 0.5)
for f in (1760, 2217, 2637): add(tone(f, 0.12, (1,), 0.002, 0.3), CUT[3] + 4 * BEAT + 0.03, 0.12, 0.2)   # all the lights at once
# the cut into shot 5
add(kick() * 0.5, CUT[4], 0.7)

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / 1.2
mix /= max(1e-9, np.abs(mix).max()) / 0.89
end = int(15.0 * SR); mix = mix[:end]
fade = int(0.35 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5      # ring out, never a chop
sf.write(OUT, mix, SR)
print(OUT)
