"""The studio's synthesised orchestra, shared by every papercut film's score.

    from rfsound import *            # instruments, then:
    m = Mix(dur); m.add(kick(), t) ... ; m.finish(out_wav, end=t_end, ring_from=t_hit)

No samples: every voice is a function of numpy noise and sines. finish() soft-clips,
rings the tail out exponentially from the last hit (never a chop) and normalises to
-14 LUFS with a two-pass ffmpeg loudnorm, so every film lands at the same level.
"""
import json, subprocess, tempfile
import numpy as np
import soundfile as sf

SR = 48000
BEAT = 60 / 112
rng = np.random.default_rng(11)


def tv(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


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


def celesta(m, d=0.4): return tone(hz(m), d, (1, 0.0, 0.25, 0, 0.08), 0.002, 0.6, decay=5)
def brass(m, d=0.3): return np.tanh(tone(hz(m), d, (1, 0.7, 0.5, 0.35, 0.2, 0.12), 0.02, 0.12) * 1.6) * 0.7
def bassoon(m, d=0.25): return tone(hz(m), d, (0.6, 1, 0.5, 0.4, 0.3), 0.015, 0.08)
def tuba(m, d=0.25): return tone(hz(m), d, (1, 0.5, 0.2), 0.01, 0.1)
def pizz(m): return tone(hz(m), 0.05, (1, 0.4, 0.2), 0.001, 0.5, decay=9)
def horn(m, d=0.6): return np.tanh(tone(hz(m), d, (1, 0.5, 0.25, 0.12), 0.08, 0.3) * 1.3) * 0.6
def organ(m, d=0.8): return tone(hz(m), d, (1, 0.5, 0.33, 0.25, 0.2), 0.04, 0.25) * 0.35
def snare(d=0.12): return noise(d + 0.05, 1200, 9000) * np.exp(-tv(d + 0.05) * 28) * 0.55
def kick(): t = tv(0.3); return np.sin(2 * np.pi * (45 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
def stamp(): t = tv(0.25); return np.sin(2 * np.pi * (70 + 80 * np.exp(-t * 40)) * t) * np.exp(-t * 18) + noise(0.25, 300, 3000) * np.exp(-t * 40) * 0.5
def click(): t = tv(0.03); return noise(0.03, 2000, 12000) * np.exp(-t * 200)
def bell(): return sum(tone(f, 0.05, (1,), 0.001, 1.4, decay=2.2) * g for f, g in [(1975, 0.5), (2637, 0.3), (987, 0.25)])
def blip(f=1760): return tone(f, 0.06, (1, 0.2), 0.002, 0.05) * 0.5
def rustle(d=0.6): return noise(d, 1500, 8000) * np.sin(np.pi * tv(d) / d) * 0.25
def card(): t = tv(0.12); return noise(0.12, 800, 6000) * np.exp(-t * 45) * 0.6 + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * 0.4
def thump(): t = tv(0.4); return np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 11) + noise(0.4, 80, 900) * np.exp(-t * 14) * 0.6
def glide(f0, f1, d=0.14): t = tv(d); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR; return np.sin(ph) * np.sin(np.pi * t / d) * 0.5
def creak(d=0.3): t = tv(d); return np.sin(2 * np.pi * (180 - 90 * t / d) * t + 3 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.pi * t / d) * 0.3
def gavel(): t = tv(0.3); return np.sin(2 * np.pi * (220 + 60 * np.exp(-t * 50)) * t) * np.exp(-t * 30) + noise(0.3, 400, 5000) * np.exp(-t * 60) * 0.7
def hum(f=60, d=1.0): t = tv(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)) * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.2) * 0.2
def tick(): t = tv(0.04); return noise(0.04, 3000, 12000) * np.exp(-t * 150) * 0.6 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120) * 0.3


def voice(f0, vowel, d):
    """one syllable: a pulse train through two formant bands — a voice's shape with no words in it"""
    F = {'e': (530, 1840), 'u': (350, 900), 'i': (300, 2300), 'a': (730, 1090), 'o': (570, 840)}[vowel]
    t = tv(d); f = f0 * (1 + 0.06 * np.sin(2 * np.pi * 5.5 * t)) * np.linspace(1.04, 0.96, len(t))
    src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5
    X = np.fft.rfft(src); fr = np.fft.rfftfreq(len(src), 1 / SR)
    H = sum(np.exp(-((fr - fc) / (fc * 0.12)) ** 2) * g for fc, g in zip(F, (1, 0.6)))
    out = np.fft.irfft(X * H, len(src)); e = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05)
    return out * e / max(1e-9, np.abs(out).max())


def crowd(d, n=9):
    out = np.zeros(int(d * SR))
    for k in range(n):
        v = voice(150 + k * 23 + rng.uniform(-8, 8), ['e', 'u', 'i'][k % 3], d)
        out[:len(v)] += v * (0.5 + 0.5 * rng.random())
    return out / n * 0.8 + noise(d, 200, 3000) * 0.08 * np.sin(np.pi * tv(d) / d)


def over(*sigs):
    """layer signals of different lengths (each padded with silence to the longest)"""
    n = max(len(x) for x in sigs); out = np.zeros(n)
    for x in sigs: out[:len(x)] += x
    return out


class Mix:
    def __init__(self, dur):
        self.N = int(dur * SR); self.L = np.zeros(self.N); self.R = np.zeros(self.N)

    def add(self, sig, t, g=1.0, pan=0.0):
        s = int(round(t * SR))
        if s >= self.N or s < 0: return
        sig = sig[: self.N - s] * g; a = (pan + 1) * np.pi / 4
        self.L[s:s + len(sig)] += sig * np.cos(a); self.R[s:s + len(sig)] += sig * np.sin(a)

    def bed(self, sig, width=900):
        n = min(len(sig), self.N); self.L[:n] += sig[:n]; self.R[:n] += np.roll(sig, width)[:n]

    def finish(self, out, end, ring_from, tau=0.5, lufs=-14.0):
        mix = np.stack([self.L, self.R], 1)
        mix = np.tanh(mix * 1.2) / 1.2
        mix /= max(1e-9, np.abs(mix).max()) / 0.89
        e = int(end * SR); mix = mix[:e]
        t0 = int(ring_from * SR); tt = np.arange(e - t0) / SR; mix[t0:] *= np.exp(-tt / tau)[:, None]
        fade = int(0.3 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
        raw = tempfile.mktemp(suffix='.wav'); sf.write(raw, mix, SR)
        p = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
        js = json.loads(p.stderr[p.stderr.rindex('{'):])
        af = (f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
              f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), out], check=True)
        print(out, e / SR)
