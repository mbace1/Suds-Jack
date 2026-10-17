"""The voices of TESLUR (the clay Roadster parody), built on lib/rfsound.py. Nothing sampled, no speech.

    uv run --with numpy --with soundfile python 音频/teslur_voices.py     a demo reel + its spectrogram

The joke is that the machines are the only ones talking:
  vac_motor   a vacuum cleaner's motor — a whine on a spinning fundamental, its harmonics, and the airflow roar;
              the CAR uses it big and low (the suction fan), the janitor's canister small and high
  whut        the janitor's vacuum switched off: the motor spins down through moving vowel formants
              (w → u → a, f0 falling then flicking UP) and ends on a soft 't' — a machine asking "whuuut?"
  jets        the cold-gas thrusters: a steady high hiss
  cough       one stutter of the jets: the hiss chokes, then a throaty burst through an /a/-ish formant
  clay_thump  TESLUR landing on the card: plasticine slapped on a table — dull, low, no ring
  thup        "What?" popping in under it: the same, smaller and higher
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfsound import *

FORM = {'w': (300, 700), 'u': (350, 900), 'o': (570, 840), 'a': (730, 1090), 'e': (530, 1840)}


def _f0_track(n, curve):
    """curve: list of (time 0–1, Hz) → a per-sample frequency track"""
    ts, fs = zip(*curve); return np.interp(np.linspace(0, 1, n), ts, fs)


def _phase(f): return 2 * np.pi * np.cumsum(f) / SR


def vac_motor(d, f0=900.0, curve=None, roar=0.6, seed=21):
    """a vacuum motor: curve = per-sample 0–1 speed (spin-up/down), f0 = whine at full speed.
    The whine is a buzzy fundamental with a few harmonics (a universal motor's brush whine), the roar
    is band-passed noise whose band rises with the speed — air through a hose."""
    n = int(d * SR); s = np.ones(n) if curve is None else np.asarray(curve)[:n]
    f = f0 * (0.25 + 0.75 * s) * (1 + 0.004 * np.sin(2 * np.pi * 7.3 * tv(d)))
    ph = _phase(f)
    whine = sum(np.sin(k * ph) * g for k, g in [(1, 1.0), (2, 0.45), (3, 0.3), (5, 0.15), (7, 0.08)]) * 0.35
    r = np.random.default_rng(seed); hiss = r.standard_normal(n)
    low = soft(hiss, 250, 2500); high = soft(hiss, 1500, 9000)
    air = (low * (1 - s) + high * s) * roar
    out = (whine + air) * (0.2 + 0.8 * s)
    return out / max(1e-9, np.abs(out).max())


def _formant(x, F, bw=0.14):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    H = sum(np.exp(-((fr - fc) / (fc * bw)) ** 2) * g for fc, g in zip(F, (1, 0.55)))
    return np.fft.irfft(X * H, len(x))


def whut(d=0.95, f0_start=260.0, seed=22):
    """the vacuum switched off, asking. Source: the motor's buzz spinning down (f0 falls) mixed with its
    breath; the vowel moves w → u → o → a over the first half; f0 bottoms out, then flicks UP ~70% between
    55% and 85% of the way — the question mark, kept at full level — and closes on a soft unvoiced 't'.
    A little of the raw buzz under 450 Hz carries the fundamental, or the formants strip it and the
    contour goes vague."""
    n = int(d * SR); t = tv(d)
    f = _f0_track(n, [(0, f0_start), (0.35, f0_start * 0.62), (0.55, f0_start * 0.56), (0.85, f0_start * 0.95), (1, f0_start * 0.95)])
    ph = _phase(f)
    buzz = np.sign(np.sin(ph)) * 0.6 + np.sin(2 * ph) * 0.2
    breath = soft(np.random.default_rng(seed).standard_normal(n), 300, 5000) * 0.3
    src = buzz + breath
    U, O, A = (_formant(src, FORM[k], bw=0.25) for k in 'uoa')
    k = np.clip(t / (0.5 * d), 0, 1)
    v = np.where(k < 0.5, U * (1 - 2 * k) + O * (2 * k), O * (2 - 2 * k) + A * (2 * k - 1))
    v = v / max(1e-9, np.abs(v).max()) + soft(buzz, None, 450, 3) * 0.35
    e = np.minimum(1, t / 0.06) * np.clip((0.93 * d - t) / (0.07 * d), 0, 1)
    out = v * e / max(1e-9, np.abs(v).max())
    tt = tv(0.06); tee = soft(np.random.default_rng(seed + 1).standard_normal(len(tt)), 3000, 9000) * np.exp(-tt * 80) * 0.3
    at = int(0.935 * n); out[at:at + len(tee)] += tee[:n - at]
    return out


def jets(d, seed=23):
    """cold gas through nozzles: a steady, slightly fluttering high hiss"""
    t = tv(d); x = soft(np.random.default_rng(seed).standard_normal(len(t)), 1800, 11000)
    return x * (1 + 0.08 * np.sin(2 * np.pi * 11 * t)) / max(1e-9, np.abs(x).max())


def cough(size=1.0, seed=24):
    """one stutter: a throaty burst through an /a/-ish formant (a machine clearing its throat), with a
    low pressure thump under it; size 0.5 small … 1.5 large — longer, lower, louder"""
    d = 0.16 + 0.18 * size; t = tv(d); n = len(t)
    r = np.random.default_rng(seed + int(size * 10))
    src = r.standard_normal(n) + np.sign(np.sin(2 * np.pi * (140 - 30 * size) * t)) * 0.4
    v = _formant(src, (650 - 80 * size, 1150), bw=0.22)
    e = (1 - np.exp(-t * 300)) * np.exp(-t * (14 - 4 * size))
    body = np.sin(2 * np.pi * (70 + 50 * np.exp(-t * 25)) * t) * np.exp(-t * 18) * 0.3 * size
    out = v * e / max(1e-9, np.abs(v * e).max()) + body
    return out / max(1e-9, np.abs(out).max()) * min(1.0, 0.55 + 0.3 * size)


def clay_thump(vel=1.0, f=62.0):
    """plasticine slapped on a table: a low body that drops in pitch, a dull slap band, no ring at all"""
    t = tv(0.32); body = np.sin(2 * np.pi * (f + 45 * np.exp(-t * 35)) * t) * np.exp(-t * 16)
    slap = soft(np.random.default_rng(31).standard_normal(len(t)), 150, 1400) * np.exp(-t * 55) * 0.8
    squish = soft(np.random.default_rng(32).standard_normal(len(t)), 400, 2200) * np.exp(-((t - 0.035) / 0.02) ** 2) * 0.25
    out = (body + slap + squish) * np.minimum(1, t / 0.002)
    return out / max(1e-9, np.abs(out).max()) * vel


def thup(vel=0.6): return clay_thump(vel, f=118.0)


if __name__ == '__main__':
    import soundfile as sf
    reel = [('motor small', vac_motor(1.2, 1500, roar=0.5)), ('whut', whut()), ('car suction', vac_motor(1.6, 420, np.concatenate([np.linspace(0.2, 1, int(0.8 * SR)), np.ones(int(0.8 * SR))]), roar=0.8)),
            ('jets', jets(0.8)), ('cough s', cough(0.5)), ('cough m', cough(1.0)), ('cough l', cough(1.5)), ('thump', clay_thump()), ('thup', thup())]
    gap = np.zeros(int(0.35 * SR)); x = np.concatenate([np.concatenate([s * 0.7, gap]) for _, s in reel])
    out = Path(__file__).with_name('teslur_reel.wav'); sf.write(out, np.stack([x, x], 1), SR)
    t0 = 0
    for name, s in reel: print(f'{t0:6.2f}s  {name}  ({len(s) / SR:.2f}s)'); t0 += len(s) / SR + 0.35
    print('->', out)
