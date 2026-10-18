"""Glyph City — the concept film's sound, synthesised (no samples, the house rule): rain on the street, a low saw drone
and a minor-pentatonic pulse, a key click for every character the HUD types, a glitch burst when the courier jacks in,
a chime for the credit, and a hit as the title lands. Times match js/film.js.

    uv run --with numpy --with scipy --with soundfile python glyphcity/tools/score.py out.wav
"""
import sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR, DUR = 48000, 12.0
N = int(SR * DUR); t = np.arange(N) / SR
rnd = np.random.default_rng(7)
out = np.zeros((N, 2))
bp = lambda x, lo, hi, o=2: sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
lp = lambda x, f, o=2: sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
hp = lambda x, f, o=2: sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
env = lambda n, a, d: np.minimum(1, np.arange(n) / max(1, a * SR)) * np.exp(-np.arange(n) / (d * SR))
def put(x, at, g=1.0, pan=0.0):
    i = int(at * SR); x = x[: max(0, N - i)]
    out[i:i + len(x), 0] += x * g * np.sqrt((1 - pan) / 2); out[i:i + len(x), 1] += x * g * np.sqrt((1 + pan) / 2)

# rain: two decorrelated noise beds, bright and soft, breathing a little
for ch in (0, 1):
    n = rnd.standard_normal(N); r = bp(n, 1800, 9000) * 0.5 + bp(n, 300, 1200) * 0.25
    out[:, ch] += r * (0.07 + 0.015 * np.sin(2 * np.pi * 0.21 * t + ch))
# the drone: a detuned saw pair on A1, lowpassed, swelling into the pull-out
saw = lambda f: 2 * ((t * f) % 1) - 1
drone = lp(saw(55) + saw(55.4) + 0.5 * saw(110.3), 420) * 0.09 * np.clip(t / 1.5, 0, 1) * (1 + 0.6 * np.clip((t - 7.2) / 3, 0, 1))
out += drone[:, None]
# the pulse: sixteenths at 100 BPM on A minor pentatonic, plucked and lowpassed, louder for the reveal
scale = [220, 261.63, 293.66, 329.63, 392, 440]; step = 60 / 100 / 4
for k in range(int(DUR / step)):
    at = k * step
    if at < 1.0: continue
    f = scale[[0, 2, 4, 3, 5, 4, 2, 1][k % 8]] * (0.5 if k % 16 < 8 else 1)
    n = int(0.22 * SR); x = np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR)) * env(n, 0.003, 0.07)
    put(lp(x, 1600 + 1400 * min(1, max(0, (at - 7.2) / 3))), at, 0.05 + 0.03 * (at > 7.2), pan=0.3 * np.sin(k))
# key clicks: one per typed character (film.js: 38 cps from 0.3 and 1.5, 44 cps from 10.0 and 10.9)
click = lambda: hp(rnd.standard_normal(int(0.006 * SR)), 2500) * env(int(0.006 * SR), 0.0005, 0.0015)
for t0, n, cps in [(0.3, 49, 38), (1.5, 47, 38), (10.0, 39, 44), (10.9, 32, 44)]:
    for i in range(n): put(click(), t0 + i / cps, 0.12, pan=-0.4)
# the jack-in: a prompt blip, a rising sweep, a bitcrushed glitch, then the credit chime
blip = lambda f, d: np.sin(2 * np.pi * f * np.arange(int(d * SR)) / SR) * env(int(d * SR), 0.002, d / 4)
put(blip(1320, 0.12), 4.4, 0.18); put(blip(1760, 0.1), 4.48, 0.14)
n = int(0.9 * SR); ph = np.cumsum(np.linspace(200, 2400, n)) / SR
sweep = np.sin(2 * np.pi * ph) * np.linspace(0, 1, n) ** 2
put(sweep * 0.5, 4.0, 0.18)
g = np.round(rnd.standard_normal(n) * 3) / 3 * env(n, 0.005, 0.25); g = np.repeat(g[::12], 12)[:n]
put(bp(g, 400, 6000), 4.75, 0.35, pan=0.2)
for i, f in enumerate([880, 1318.5]): put(blip(f, 0.4), 5.2 + i * 0.09, 0.16)
# the title: a sub drop and a burst of noise as GLYPH CITY lands, and a tick per letter (12 a second from 9.0)
n = int(1.6 * SR); sub = np.sin(2 * np.pi * np.cumsum(np.linspace(90, 38, n)) / SR) * env(n, 0.004, 0.5)
put(sub, 9.0, 0.5); put(lp(rnd.standard_normal(int(0.6 * SR)), 2500) * env(int(0.6 * SR), 0.002, 0.15), 9.0, 0.25)
for i in range(10): put(click() * 1.5, 9.0 + i / 12, 0.18, pan=-0.5 + i / 10)

# fades, a gentle limiter, and a level near -16 LUFS (RMS stands in; a test film, not a master)
fade = np.clip(t / 0.5, 0, 1) * np.clip((DUR - t) / 0.45, 0, 1); out *= fade[:, None]
out *= 10 ** (-17 / 20) / (np.sqrt(np.mean(out ** 2)) + 1e-9)
out = np.tanh(out * 1.2) / 1.2 * 0.92
sf.write(sys.argv[1], out.astype(np.float32), SR)
print('wrote', sys.argv[1], f'peak {20 * np.log10(np.abs(out).max()):.1f} dBFS')
