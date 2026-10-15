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
        p = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', f'loudnorm=I={lufs}:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
        js = json.loads(p.stderr[p.stderr.rindex('{'):])
        af = (f"loudnorm=I={lufs}:TP=-2:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
              f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), out], check=True)
        print(out, e / SR)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# SERIES VOICES — added 2026-10-14 (SOUND.md). Everything ABOVE this line is the house kit as
# The Biodiversity Fund's era left it, unchanged; nothing below runs at import time or touches
# the shared `rng` until a series voice is actually called, so every older score (and the
# station sign-off) still renders byte-for-byte. The three palettes built from these live in
# lib/rfseries.py:
#   Doodle  glossy tech-ad   fm_ep marimba pluck sub_bass supersaw clap hat kick_tight chime riser
#   Coxon   civic, solemn    timpani timp_roll field_snare snare_roll bass_drum trombone fife
#                            tower_bell rim crash
#   Toko    handmade, small  felt_piano music_box kalimba upright brush_tap brush_swish vinyl
#                            room rain toy_voice lamp_click knock pat paw tag_pop servo tram
# ═══════════════════════════════════════════════════════════════════════════════════════════
from functools import lru_cache


def soft(x, lo=None, hi=None, order=2):
    """a gentle zero-phase band (Butterworth magnitude), zero-padded so nothing wraps round"""
    n = len(x); pad = int(0.05 * SR)
    X = np.fft.rfft(np.concatenate([x, np.zeros(pad)])); f = np.fft.rfftfreq(n + pad, 1 / SR)
    H = np.ones_like(f)
    if hi: H /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: H /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * H, n + pad)[:n]


def sweep(x, f0, f1, high=False, steps=12, curve=None):
    """a filter that MOVES across x — a lowpass (or highpass, high=True) from f0 to f1 — made by
    crossfading a bank of zero-phase filters, so there is no recursion and no phase smear"""
    fc = np.geomspace(f0, f1, steps)
    bank = [soft(x, lo=c) if high else soft(x, hi=c) for c in fc]
    pos = (np.linspace(0, 1, len(x)) if curve is None else np.clip(curve, 0, 1)) * (steps - 1)
    i = np.clip(pos.astype(int), 0, steps - 2); fr = pos - i; out = np.zeros(len(x))
    for k in range(steps - 1):
        s = i == k; out[s] = bank[k][s] * (1 - fr[s]) + bank[k + 1][s] * fr[s]
    return out


def convolve(x, h):
    n = len(x) + len(h) - 1; N = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(h, N), N)[:n]


def ir(t60=1.6, lo=150, hi=7000, pre=0.012, seed=5):
    """a synthetic room as two decorrelated impulse responses: decaying noise that darkens as it dies"""
    g = np.random.default_rng(seed); d = t60 * 1.1; n = int(d * SR); t = np.arange(n) / SR; out = []
    for _ in range(2):
        x = g.standard_normal(n); k = np.clip(t / d, 0, 1)
        y = (soft(x, lo, hi) * (1 - k) + soft(x, lo, hi * 0.3) * k) * np.exp(-6.91 * t / t60) * np.minimum(1, t / 0.004)
        y = np.concatenate([np.zeros(int(pre * SR)), y]); out.append(y / np.sqrt(np.sum(y ** 2)))
    return out


class Bus(Mix):
    """a second mix, processed as a group and then poured into another: a reverb send, or the
    music on its own so it can be tape-stopped or filtered without touching the effects"""
    def into(self, m, g=1.0):
        n = min(m.N, self.N); m.L[:n] += self.L[:n] * g; m.R[:n] += self.R[:n] * g

    def verb(self, m, t60=1.6, lo=150, hi=7000, pre=0.012, g=0.3, seed=5):
        hL, hR = ir(t60, lo, hi, pre, seed)
        m.L += convolve(self.L, hL)[:m.N] * g; m.R += convolve(self.R, hR)[:m.N] * g

    def span(self, t0, t1, fn):
        """replace [t0, t1) of both channels with fn(segment)"""
        a, b = int(t0 * SR), min(self.N, int(t1 * SR))
        self.L[a:b] = fn(self.L[a:b].copy()); self.R[a:b] = fn(self.R[a:b].copy())


def glue(m, thresh=-16.0, ratio=2.5, look=0.004, rel=0.18):
    """a gentle look-ahead bus compressor (2 ms frames, so the loop is short): keeps a score's
    peak-to-loudness ratio near 11 dB so finish()'s loudnorm can stay linear"""
    hop = int(0.002 * SR); x = np.maximum(np.abs(m.L), np.abs(m.R)); nf = len(x) // hop + 1
    xp = np.zeros(nf * hop); xp[:len(x)] = x; fr = xp.reshape(nf, hop)
    lvl = 0.5 * np.sqrt((fr ** 2).mean(1)) + 0.5 * fr.max(1)
    g = -np.maximum(0, 20 * np.log10(lvl + 1e-9) - thresh) * (1 - 1 / ratio)
    a = max(1, int(look / 0.002)); gp = np.concatenate([g, np.zeros(a)])
    gmin = np.lib.stride_tricks.sliding_window_view(gp, a + 1).min(1)[:nf]
    out = np.empty(nf); c = 0.0; k = np.exp(-0.002 / rel)
    for i in range(nf):
        c = gmin[i] if gmin[i] < c else gmin[i] + (c - gmin[i]) * k; out[i] = c
    gl = 10 ** (np.interp(np.arange(len(x)), np.arange(nf) * hop + hop / 2, out) / 20)
    m.L *= gl; m.R *= gl


def trim(m, peak=1.0):
    """set the raw mix's peak before finish(), so its soft clip bites the same amount on every score"""
    p = max(np.abs(m.L).max(), np.abs(m.R).max(), 1e-9); m.L *= peak / p; m.R *= peak / p


def tape_stop(x, d=0.45):
    """a machine losing power: speed (and so pitch) falls from 1 to 0 over d seconds, then silence"""
    n = len(x); k = min(n, int(d * SR)); t = np.arange(k) / SR; speed = (1 - t / d) ** 1.6
    y = np.zeros(n); y[:k] = np.interp(np.cumsum(speed), np.arange(n), x, right=0) * np.minimum(1, (k - np.arange(k)) / (0.03 * SR))
    return y


def wow(x, pitch=0.006, rate=0.6, flutter=0.0015, frate=7.5):
    """a worn tape: the pitch wanders (wow) and trembles (flutter); depths are pitch deviations"""
    t = np.arange(len(x)) / SR
    dl = pitch / (2 * np.pi * rate) * (1 + np.sin(2 * np.pi * rate * t)) + flutter / (2 * np.pi * frate) * (1 + np.sin(2 * np.pi * frate * t + 1.3))
    return np.interp(np.arange(len(x)) - dl * SR, np.arange(len(x)), x, left=0)


def pad(sig, lead):
    """sig delayed by `lead` seconds (to stack voices inside over())"""
    return np.concatenate([np.zeros(int(lead * SR)), sig])


# ─── Doodle: the launch video ───────────────────────────────────────────────────────────────
def fm_ep(m, d=0.5, vel=0.8, r=0.5):
    """a DX-style electric piano: a 1:1 FM body whose brightness falls as it rings, and a 14:1 tine bark on the attack"""
    f = hz(m); t = tv(d + r)
    I = (0.4 + 1.6 * vel) * np.exp(-t * (3 + f / 600)) + 0.15
    body = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * t + 1.2 * vel * np.exp(-t * 40) * np.sin(2 * np.pi * 14 * f * t)) * np.exp(-t * 25) * 0.35 * vel if f * 15 < 20000 else 0
    e = np.minimum(1, t / 0.002) * np.exp(-t * (0.9 + f / 900)); e[t > d] *= np.exp(-(t[t > d] - d) / (r / 5))
    return (body + tine) * e * 0.5 * (0.5 + 0.5 * vel)


def marimba(m, d=0.3, vel=0.8):
    """a rosewood bar: partials at 1, 4 and 10, the upper two gone almost at once, and the mallet's tock"""
    f = hz(m); t = tv(max(0.7, d + 0.4))
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * (2.2 + f / 500)) + 0.30 * vel * np.sin(2 * np.pi * 3.98 * f * t) * np.exp(-t * (14 + f / 150))
    if f * 9.9 < 20000: s = s + 0.08 * vel * np.sin(2 * np.pi * 9.9 * f * t) * np.exp(-t * 40)
    tock = noise(0.03, 900, 5000) * np.exp(-tv(0.03) * 250) * 0.25 * vel
    return over(s * np.minimum(1, t / 0.001) * 0.5 * vel, tock)


def pluck(m, d=0.25, bright=1.0, det=0.004):
    """the launch-video pluck: two saws a few cents apart whose filter snaps shut (each harmonic decays faster the higher it sits)"""
    f = hz(m); t = tv(d + 0.35); s = np.zeros(len(t))
    for k in range(1, int(min(36, 13000 / f)) + 1):
        a = np.exp(-t * (4 + 1.9 * k / bright)) / k
        s += a * (np.sin(2 * np.pi * f * k * t + 0.4 * k) + np.sin(2 * np.pi * f * (1 + det) * k * t + 1.9 * k)) * 0.5
    e = np.minimum(1, t / 0.002); e[t > d] *= np.exp(-(t[t > d] - d) / 0.04)
    return s * e * 0.45


def sub_bass(m, d=0.25):
    """a round pluck bass: a sine for weight and a few saw harmonics whose filter closes in 80 ms"""
    f = hz(m); t = tv(d + 0.08)
    s = np.sin(2 * np.pi * f * t) + sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (10 + 8 * k)) * 0.8 for k in range(2, 10))
    e = np.minimum(1, t / 0.003); e[t > d] *= np.exp(-(t[t > d] - d) / 0.02)
    return np.tanh(s * e * 1.3) * 0.55


def supersaw(m, d=1.0, n=5, spread=0.011, cut=3200, a=0.01, r=0.25, seed=0):
    """the glossy pad / stab: five detuned saws, the filter set where it shines but does not hiss"""
    f0 = hz(m); t = tv(d + r); s = np.zeros(len(t)); g = np.random.default_rng(seed + int(m * 7))
    for v in range(n):
        f = f0 * (1 + spread * (v - (n - 1) / 2) / ((n - 1) / 2)); ph = g.uniform(0, 2 * np.pi)
        for k in range(1, int(min(48, 12000 / f)) + 1):
            s += np.sin(2 * np.pi * f * k * t + ph * k) / k / (1 + (k * f / cut) ** 2)
    return s * env(d, a, r)[:len(t)] / n * 0.45


def clap(vel=1.0):
    """the clean clap: three quick bursts and a short tail, band-passed where hands are"""
    d = 0.3; t = tv(d)
    e = sum(np.exp(-np.maximum(0, t - o) * 260) * (t >= o) for o in (0, 0.010, 0.021)) * 0.55 + np.exp(-np.maximum(0, t - 0.03) * 20) * (t >= 0.03)
    return noise(d, 850, 5500) * e * 0.55 * vel


def hat(open_=False, vel=1.0):
    """a hi-hat: six square oscillators at the 808's odd ratios, kept above 7 kHz, and air"""
    d = 0.35 if open_ else 0.07; t = tv(d)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + i)) for i, f in enumerate((205.3, 304.4, 369.6, 522.7, 540.0, 800.0)))
    x = soft(metal, 7000, 15000, 3) * 0.12 + noise(d, 8000, 15000) * 0.5
    return x * np.exp(-t * (9 if open_ else 75)) * np.minimum(1, t / 0.0008) * 0.35 * vel


def kick_tight(vel=1.0):
    """a clean pop kick: a short sine dive and a click — tighter and higher than the house kick"""
    t = tv(0.3); f = 50 + 120 * np.exp(-t * 40)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return np.tanh(over(s, noise(0.006, 1500, 8000) * np.exp(-tv(0.006) * 900) * 0.4) * 1.5) * 0.75 * vel


def chime(m, d=0.5):
    """the notification chime: a glassy FM bell, its modulator at 3.5x so it rings like a phone and not a church"""
    f = hz(m); t = tv(d + 0.5)
    s = np.sin(2 * np.pi * f * t + 1.8 * np.exp(-t * 7) * np.sin(2 * np.pi * 3.5 * f * t)) * np.exp(-t * 3.2) * np.minimum(1, t / 0.001)
    return s * 0.35


def sparkle(m=86):
    """success: two chimes going up a fifth"""
    return over(chime(m), pad(chime(m + 7), 0.075))


def bonk(m=74):
    """error: two dull chimes falling a minor third — the success sound's sour twin"""
    def dull(n):
        f = hz(n); t = tv(0.35)
        return np.sin(2 * np.pi * f * t + 0.8 * np.exp(-t * 20) * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 9) * np.minimum(1, t / 0.002) * 0.4
    return over(dull(m), pad(dull(m - 3), 0.11))


def riser(d=1.0, f0=400, f1=9000):
    """a whoosh up: noise whose filter opens as it swells, and a sine climbing under it"""
    t = tv(d); c = (t / d) ** 1.5
    x = sweep(noise(d, 200), f0, f1, curve=c) * c ** 1.2 * 0.5
    return x + glide(f0 * 0.5, f1 * 0.12, d) * c * 0.3


def whir(f0, f1, d=1.0):
    """a motor or a disc spinning up: a buzzy tone gliding with a flutter in it"""
    t = tv(d); f = np.geomspace(f0, f1, len(t)) * (1 + 0.01 * np.sin(2 * np.pi * 23 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * t / d) * 0.25


def ui_tick(f=3400):
    """a digit rolling over: a tiny clean sine tick — the odometer as an app animates it"""
    t = tv(0.03); return np.sin(2 * np.pi * f * t) * np.exp(-t * 300) * 0.45 + click() * 0.15


# ─── Coxon: the institution ─────────────────────────────────────────────────────────────────
TIMP_MODES = ((1, 1, 1.6), (1.504, 0.6, 2.2), (1.742, 0.25, 4), (2.0, 0.35, 3.0), (2.245, 0.15, 5),
              (2.494, 0.18, 4.0), (2.8, 0.08, 7), (2.98, 0.1, 6))


def timpani(m, d=2.2, vel=0.8, to=None, slide=0.4):
    """a kettle drum: the tuned modes (1, 1.5, 2, 2.5, 3), a thud from the untuned one, a felt mallet;
    the pitch settles as the head relaxes. to=: the pedal glides the struck note there over `slide` s"""
    f = hz(m); t = tv(d); k = 1 + 0.02 * vel * np.exp(-t * 25)
    if to is not None: k = k * 2 ** ((to - m) * np.clip(t / slide, 0, 1) ** 0.7 / 12)
    bend = 2 * np.pi * f * np.cumsum(k) / SR
    s = sum(a * np.sin(bend * r) * np.exp(-t * dec * (1.3 - 0.3 * vel)) for r, a, dec in TIMP_MODES)
    thud = np.sin(2 * np.pi * f * 0.68 * t) * np.exp(-t * 12) * 0.5 + noise(d, 40, 700) * np.exp(-t * 35) * 0.5 * vel
    return (s * (0.3 + 0.25 * vel) + thud * 0.6) * np.minimum(1, t / 0.002) * vel


def timp_roll(m, d=1.5, v0=0.15, v1=1.0, rate=13.0, seed=1):
    """a timpani roll: single strokes at ~13 a second, alternating sticks, swelling from v0 to v1"""
    h = timpani(m, 2.4, 0.55); n = int((d + 2.4) * SR); imp = np.zeros(n); g = np.random.default_rng(seed); tt = 0.0
    while tt < d:
        imp[int(tt * SR)] += (v0 + (v1 - v0) * (tt / d) ** 1.6) * (0.85 + 0.3 * g.random())
        tt += (1 / rate) * (1 + 0.07 * g.standard_normal())
    return convolve(imp, h)[:n] * 0.6


def field_snare(vel=1.0):
    """a parade snare, tight and high: three shell modes, the wires, a stick crack; louder is brighter"""
    d = 0.3; t = tv(d)
    shell = (np.sin(2 * np.pi * 330 * t) * 0.6 + np.sin(2 * np.pi * 545 * t) * 0.35 + np.sin(2 * np.pi * 190 * t) * 0.3) * np.exp(-t * 32)
    wires = noise(d, 1800, 11000) * np.exp(-t * (28 - 8 * vel))
    crack = noise(0.012, 3000, 12000) * np.exp(-tv(0.012) * 600)
    return over(shell * 0.5 * vel + wires * 0.65 * vel ** 1.3, crack * vel * 0.7) * 0.6


def snare_roll(d=1.0, v0=0.1, v1=0.8, rate=26.0, seed=2):
    """a press roll: strokes at ~26 a second with the wires buzzing between, swelling from v0 to v1"""
    h = field_snare(0.5); n = int((d + 0.3) * SR); imp = np.zeros(n); g = np.random.default_rng(seed); tt = 0.0
    while tt < d:
        imp[int(tt * SR)] += (v0 + (v1 - v0) * (tt / d) ** 1.4) * (0.75 + 0.5 * g.random())
        tt += (1 / rate) * (1 + 0.1 * g.standard_normal())
    t = tv(d + 0.3); sw = np.clip(v0 + (v1 - v0) * (t / d) ** 1.4, 0, None) * (t < d)
    return convolve(imp, h)[:n] * 0.5 + noise(d + 0.3, 2500, 10000) * sw * 0.10


def bass_drum(vel=1.0):
    """the concert bass drum: a slow 52 Hz boom with a soft beater — longer and rounder than the house kick"""
    t = tv(1.2); f = 52 + 18 * np.exp(-t * 12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2) + np.sin(2 * np.pi * 87 * t) * np.exp(-t * 7) * 0.3
    return (s + noise(1.2, 60, 900) * np.exp(-t * 30) * 0.4) * np.minimum(1, t / 0.006) * 0.8 * vel


def trombone(m, d=1.0, dyn=0.6, a=0.06, r=0.2, slide=0.0):
    """low brass for the chorale: the harmonics tilt brighter the louder it plays and bloom in over
    the first 70 ms; a lip scoop up into pitch; no vibrato — an institution does not wobble.
    slide=: semitones the slide travels across the note (a trombone lowering something, wryly)"""
    f = hz(m); t = tv(d + r); k_ = (1 - 0.025 * np.exp(-t / 0.03)) * 2 ** (slide * np.clip(t / max(d, 1e-3), 0, 1) ** 1.5 / 12)
    ph = 2 * np.pi * f * np.cumsum(k_) / SR
    p = 2.6 - 1.6 * dyn; bloom = 1 - np.exp(-t / 0.07); s = np.zeros(len(t)); tot = 0.0
    for k in range(1, int(min(30, 7000 / (f * max(1.0, 2 ** (slide / 12))))) + 1):
        ak = k ** (-p); tot += ak
        s += ak * np.sin(k * ph + 0.3 * k) * (1 if k <= 2 else bloom ** (0.5 + 0.2 * k))
    breath = noise(d + r, 300, 3000) * np.exp(-t * 20) * 0.06 * dyn
    return (s / tot + breath) * env(d, a, r)[:len(t)] * (0.35 + 0.65 * dyn) * 0.6


def fife(m, d=0.3, vel=0.8, sharp=0.006):
    """the fife: a near-pure tone a hair sharp (the wry part), breath in it, a chiff on the tongue,
    and vibrato only on the long notes"""
    f = hz(m) * (1 + sharp); t = tv(d + 0.06)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.22) / 0.2, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib * (1 - 0.03 * np.exp(-t / 0.012))) / SR
    e = env(d, 0.012, 0.06)[:len(t)]
    s = (np.sin(ph) + 0.10 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)) * e
    air = noise(d + 0.06, 1500, 9000) * 0.07 * e + noise(d + 0.06, 3500, 10000) * np.exp(-t * 90) * 0.35
    return (s + air) * 0.3 * vel


def tower_bell(m, d=4.0, vel=1.0):
    """the city hall's bell: hum, prime, a minor-third tierce, quint, nominal — the hum outlasts everything"""
    f = hz(m); t = tv(d)
    P = ((0.5, 0.5, 0.35), (1.0, 0.8, 0.6), (1.19, 0.55, 0.9), (1.5, 0.3, 1.1), (2.0, 0.6, 1.3), (2.51, 0.25, 2.2), (2.66, 0.2, 2.5), (3.01, 0.15, 3.0), (4.1, 0.08, 4.5))
    s = sum(a * np.sin(2 * np.pi * f * r * t + 0.7 * i) * np.exp(-t * dec) for i, (r, a, dec) in enumerate(P) if f * r < 16000)
    return over(s * np.minimum(1, t / 0.002) * 0.28 * vel, noise(0.06, 500, 6000) * np.exp(-tv(0.06) * 80) * 0.4 * vel)


def rim(vel=0.6):
    """a stick on the snare's rim: the chamber clock, and the march's dry tick"""
    t = tv(0.08)
    s = (np.sin(2 * np.pi * 1750 * t) * 0.6 + np.sin(2 * np.pi * 3050 * t) * 0.3 + np.sin(2 * np.pi * 820 * t) * 0.4) * np.exp(-t * 90)
    return over(s, noise(0.01, 2000, 9000) * np.exp(-tv(0.01) * 500) * 0.5) * 0.5 * vel


def crash(d=2.5, vel=1.0, seed=3):
    """a concert crash cymbal: inharmonic metal over bright noise, a long shimmering decay"""
    g = np.random.default_rng(seed); t = tv(d)
    metal = sum(np.sin(2 * np.pi * g.uniform(420, 9000) * t + g.uniform(0, 6)) * np.exp(-t * g.uniform(1.2, 4)) for _ in range(40)) / 40
    x = noise(d, 3000, 16000) * 0.6 + noise(d, 700, 3000) * 0.25 + metal * 1.2
    return x * np.exp(-t * 1.5) * np.minimum(1, t / 0.003) * 0.32 * vel


# ─── Toko: the room, the hands ──────────────────────────────────────────────────────────────
@lru_cache(maxsize=1024)
def _felt(m, d, vel):
    f = hz(m); t = tv(d + 0.4); n = len(t); s = np.zeros(n)
    B = 0.00035 * (1 + max(0, m - 60) / 24)
    for k in range(1, int(min(28, 5200 / f)) + 1):
        fk = f * k * np.sqrt(1 + B * k * k)
        ak = k ** -(1.25 + 0.9 * (1 - vel)) * np.exp(-fk / (1400 + 2600 * vel))
        dec = 0.35 + fk / 2200 + 0.12 * k; e = 0.75 * np.exp(-t * dec) + 0.25 * np.exp(-t * dec * 0.18)
        s += ak * e * ((np.sin(2 * np.pi * fk * t + k) + np.sin(2 * np.pi * fk * 1.0006 * t + 2 * k)) * 0.5 if k <= 4 else np.sin(2 * np.pi * fk * t + k))
    damp = np.ones(n); damp[t > d] = np.exp(-(t[t > d] - d) / 0.12)
    thunk = noise(0.06, 70, 900) * np.exp(-tv(0.06) * 60) * 0.10 * vel
    return over(s * damp * np.minimum(1, t / 0.006), thunk) * (0.25 + 0.5 * vel) * 0.7


def felt_piano(m, d=1.0, vel=0.5):
    """an upright with a felt strip down: stretched partials, two strings a cent apart beating
    slowly, a dark soft hammer and the mechanism's thunk; damped when the key comes up after d"""
    return _felt(int(m), round(float(d), 2), round(float(vel), 2))


@lru_cache(maxsize=256)
def _mbox(m, cents):
    f = hz(m) * 2 ** (cents / 1200); t = tv(2.2)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6) + 0.22 * np.sin(2 * np.pi * 5.93 * f * t) * np.exp(-t * 9)
    if f * 13.3 < 18000: s = s + 0.05 * np.sin(2 * np.pi * 13.3 * f * t) * np.exp(-t * 30)
    pin = noise(0.01, 3000, 12000) * np.exp(-tv(0.01) * 700) * 0.2
    box = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 30) * 0.05
    return over(s * np.minimum(1, t / 0.0015) * 0.3, pin, box)


def music_box(m, cents=0.0):
    """a music-box comb: a steel tooth (its next mode at ~6x, gone fast), the pin's tick, the case answering;
    `cents` flattens it as the spring runs down"""
    return _mbox(int(m), round(float(cents), 1))


def kalimba(m, vel=0.8):
    """a thumb piano: a tine with an overtone near 5.75x, the thumb on it, and the wooden box's boom"""
    f = hz(m); t = tv(1.4)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * (2.4 + f / 700)) + 0.18 * vel * np.sin(2 * np.pi * 5.75 * f * t) * np.exp(-t * 16) + 0.06 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t * 5)
    thumb = noise(0.02, 150, 2500) * np.exp(-tv(0.02) * 200) * 0.25 * vel
    return over(s * np.minimum(1, t / 0.003) * 0.35 * vel, thumb, np.sin(2 * np.pi * 233 * t) * np.exp(-t * 18) * 0.06 * vel)


@lru_cache(maxsize=256)
def _upright(m, d, vel):
    f = hz(m); t = tv(d + 0.15); ph = 2 * np.pi * f * np.cumsum(1 + 0.015 * np.exp(-t / 0.05)) / SR
    s = sum(abs(np.sin(np.pi * k * 0.18)) / k ** 0.9 * np.sin(k * ph) * np.exp(-t * (1.8 + 0.9 * k + 0.002 * k * f)) for k in range(1, int(min(24, 3500 / f)) + 1))
    e = np.minimum(1, t / 0.004); e[t > d] *= np.exp(-(t[t > d] - d) / 0.05)
    return over(s * e * 0.5 * vel, noise(0.05, 30, 400) * np.exp(-tv(0.05) * 70) * 0.3 * vel)


def upright(m, d=0.6, vel=0.7):
    """a plucked upright bass: pluck-position harmonics, the string's pitch settling, the finger's thump"""
    return _upright(int(m), round(float(d), 2), round(float(vel), 2))


def brush_tap(vel=0.6):
    """a wire brush tapped on the snare head: a soft hiss of a hit, no crack"""
    d = 0.25; t = tv(d); return noise(d, 900, 9000) * np.exp(-t * 24) * np.minimum(1, t / 0.003) * 0.35 * vel


def brush_swish(d=0.5, vel=0.5):
    """the brush swept round the head: a slow swell of hiss"""
    t = tv(d); return noise(d, 1800, 8000) * np.sin(np.pi * t / d) ** 2 * 0.16 * vel


def vinyl(d, rate=5.0, level=1.0, seed=8):
    """a record's surface: sparse crackle, a breath of hiss, a rumble under it"""
    g = np.random.default_rng(seed); n = int(d * SR); x = np.zeros(n); k = g.poisson(rate * d)
    x[g.integers(0, n - 1, k)] += np.minimum(3, g.exponential(1.0, k)) * np.sign(g.standard_normal(k))
    return (soft(x, 1200, 9000) * 0.06 + band(g.standard_normal(n), 3000, 12000) * 0.003 + band(g.standard_normal(n), 25, 120) * 0.008) * level


def band(x, lo=None, hi=None):
    """the brick-wall band noise() uses, for any signal (filter BEFORE an envelope, never after)"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if lo: X[f < lo] = 0
    if hi: X[f > hi] = 0
    return np.fft.irfft(X, len(x))


def room(d, level=1.0, seed=9):
    """room tone: a quiet pink-ish rush, darker than the house kit's bed"""
    g = np.random.default_rng(seed); n = int(d * SR); X = np.fft.rfft(g.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / np.sqrt(np.maximum(f, 40) / 40); X[(f < 45) | (f > 2500)] = 0
    y = np.fft.irfft(X, n); return y / np.abs(y).max() * 0.02 * level


def rain(d, density=18.0, level=1.0, seed=10):
    """rain on a window: a soft wash and single drops ticking on the glass"""
    g = np.random.default_rng(seed); n = int(d * SR); wash = band(g.standard_normal(n), 500, 6000) * 0.02
    out = wash
    for fq in (2100, 2900, 3700, 4600, 5600):
        imp = np.zeros(n); k = g.poisson(density * d / 5); imp[g.integers(0, n - 1, k)] = g.exponential(1.0, k)
        tk = tv(0.03); out = out + convolve(imp, np.sin(2 * np.pi * fq * tk) * np.exp(-tk * 260))[:n] * 0.016
    return out * level


def toy_voice(f0, vowel, d):
    """the toy speaking: house voice() through a tiny speaker — no lows, crushed to five bits, sampled at 12 kHz"""
    v = soft(voice(f0, vowel, d), 650, 4200, 3); v = np.round(v / max(1e-9, np.abs(v).max()) * 15) / 15
    v = np.repeat(v[::4], 4)[:len(v)]; return soft(v, None, 6500) * 0.8


def toy_ding(m=93):
    """the toy's bounce: a tinny electronic ding off a small speaker"""
    f = hz(m); t = tv(0.4); s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sign(np.sin(2 * np.pi * f * t))) * np.exp(-t * 9) * np.minimum(1, t / 0.001)
    return soft(s, 700, 6000) * 0.25


def lamp_click():
    """a lamp's switch: the press and the snap 18 ms apart, plastic not metal"""
    def c(g): t = tv(0.02); return (noise(0.02, 1200, 7000) * np.exp(-t * 500) + np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 400) * 0.4) * g
    return over(c(0.6), pad(c(0.9), 0.018))


def knock(vel=0.7, f=310):
    """knuckle on wood: three body modes gone in a tenth of a second"""
    t = tv(0.15); s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dk) for r, a, dk in ((1, 1, 40), (2.32, 0.5, 60), (4.03, 0.25, 90)))
    return over(s * 0.4, noise(0.01, 800, 5000) * np.exp(-tv(0.01) * 600) * 0.2) * vel


def pat(vel=0.6):
    """a hand on fur: a muffled thump"""
    t = tv(0.08); return noise(0.08, 80, 1400) * np.exp(-t * 55) * np.minimum(1, t / 0.004) * 0.6 * vel


def paw(vel=0.5):
    """a paw on the rug: soft, with a claw's tick"""
    return over(pat(vel) * 0.8, pad(noise(0.006, 3000, 9000) * np.exp(-tv(0.006) * 900) * 0.12 * vel, 0.01))


def tag_pop(f=900):
    """a little card tag flicked into place: a pip that drops, and paper"""
    t = tv(0.06); s = np.sin(2 * np.pi * np.cumsum(f * (1 - 0.35 * t / 0.06)) / SR) * np.exp(-t * 60)
    return over(s * 0.35, noise(0.03, 1500, 7000) * np.exp(-tv(0.03) * 150) * 0.2)


def servo(d=0.5):
    """a small camera turning: a buzzy little motor through its plastic"""
    t = tv(d); f = 160 * (1 + 0.05 * np.sin(np.pi * t / d)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 30)); return soft(x, 700, 4000) * np.sin(np.pi * t / d) ** 0.5 * 0.12


def tram(d=4.0, bells=None):
    """a Helsinki tram passing in the rain: a rumble that swells and goes, rail joints, the bell twice
    (at 0.3 d and 0.32 s later, or at the offsets in `bells`)"""
    t = tv(d); sw = np.exp(-((t - d * 0.5) / (d * 0.22)) ** 2)
    out = noise(d, 30, 260) * sw * 0.25 + noise(d, 300, 2000) * sw * 0.03
    for k in range(int(d / 0.45)):
        tk = d * 0.2 + k * 0.45
        if tk < d * 0.85: out = over(out, pad(knock(0.5 * sw[min(len(t) - 1, int(tk * SR))], 120), tk))
    ding = lambda: sum(np.sin(2 * np.pi * f * tv(1.0)) * np.exp(-tv(1.0) * 5) for f in (1318, 3290)) * 0.08
    bells = (d * 0.3, d * 0.3 + 0.32) if bells is None else bells
    return over(out, *[pad(ding(), b) for b in bells])


def sit(vel=0.7):
    """somebody settling onto a sofa: a low cushion whump and the springs' small complaint"""
    t = tv(0.45); w = noise(0.45, 50, 500) * np.exp(-((t - 0.06) / 0.08) ** 2) * 0.7
    spring = np.sin(2 * np.pi * (190 + 25 * np.sin(2 * np.pi * 7 * t)) * t) * np.exp(-((t - 0.16) / 0.07) ** 2) * 0.06
    return (w + spring) * vel


def toy_blip(f=2093):
    """the toy's LED waking: a clean blip through the small speaker"""
    t = tv(0.08); return soft(np.sin(2 * np.pi * f * t) * np.exp(-t * 45) * np.minimum(1, t / 0.001), 700, 6000) * 0.4


def shelf(x, fc=3000.0, db=3.0, hp=None):
    """a gentle high shelf (db above fc, zero phase) and an optional sub-rumble high-pass"""
    n = len(x); pad_ = int(0.05 * SR); X = np.fft.rfft(np.concatenate([x, np.zeros(pad_)])); f = np.fft.rfftfreq(n + pad_, 1 / SR)
    H = 1 + (10 ** (db / 20) - 1) * f ** 2 / (f ** 2 + fc ** 2)
    if hp: H = H / np.sqrt(1 + (hp / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * H, n + pad_)[:n]


def bs1770(x):
    """integrated loudness (LUFS) of a stereo array (n, 2): K-weighting applied as its magnitude
    response in the frequency domain, 400 ms blocks on a 100 ms hop, absolute and relative gates"""
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR); z = np.exp(-2j * np.pi * f / SR)
    def biq(b, a): return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    H = biq((1.53512485958697, -2.69169618940638, 1.19839281085285), (1, -1.69065929318241, 0.73248077421585)) * biq((1, -2, 1), (1, -1.99004745483398, 0.99007225036621))
    y = np.stack([np.fft.irfft(np.fft.rfft(x[:, c]) * np.abs(H), n) for c in range(x.shape[1])], 1)
    w, h = int(0.4 * SR), int(0.1 * SR); c = np.concatenate([np.zeros((1, y.shape[1])), np.cumsum(y ** 2, 0)])
    st = np.arange(0, n - w + 1, h); zb = (c[st + w] - c[st]) / w; p = zb.sum(1)
    lj = -0.691 + 10 * np.log10(p + 1e-20); g = p[lj > -70]
    if not len(g): return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10; g = p[(lj > -70) & (lj > rel)]
    return float(-0.691 + 10 * np.log10(g.mean()))


def true_peak(x, over_=4):
    """true peak (dBTP) by FFT oversampling, in chunks"""
    pk = 0.0; step = SR * 4
    for c in range(x.shape[1]):
        for i in range(0, len(x), step):
            seg = x[max(0, i - 256):i + step + 256, c]; N = len(seg)
            up = np.fft.irfft(np.fft.rfft(seg), N * over_) * over_; pk = max(pk, np.abs(up).max())
    return float(20 * np.log10(pk + 1e-12))



# ─── Toko: the gadgets' small cold voice (Unexpectedly, a Deer) ─────────────────────────────
def tinny(x, lo=750, hi=4800, bits=5, hold=4):
    """any sound out of a gadget's tiny speaker: no lows, a peaky band, crushed to a few bits, sample-held"""
    v = soft(x, lo, hi, 3); pk = max(1e-9, np.abs(v).max()); q = 2 ** (bits - 1) - 1
    v = np.round(v / pk * q) / q * pk; v = np.repeat(v[::hold], hold)[:len(v)]
    return soft(v, None, 7000)


def cam_chime(notes=(84, 91, 96), step=0.075, d=0.07, last=0.16):
    """the camera's voice: short square-edged pips in fifths and octaves (no thirds: a machine is sure,
    not warm), out of its tiny speaker; the last pip held a little"""
    parts = []
    for i, n in enumerate(notes):
        L = last if i == len(notes) - 1 else d; f = hz(n); t = tv(L + 0.1)
        x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t))) * np.minimum(1, t / 0.002) * np.exp(-np.maximum(0, t - L) * 45)
        parts.append(pad(x, i * step))
    return tinny(over(*parts)) * 0.4


def cam_snap():
    """the camera's brackets closing on something: two tiny clicks and a quick zip down"""
    t = tv(0.06); z = np.sin(2 * np.pi * np.cumsum(np.geomspace(4200, 2200, len(t))) / SR) * np.exp(-t * 50)
    c = lambda: noise(0.006, 2500, 9000) * np.exp(-tv(0.006) * 800)
    return tinny(over(c(), pad(c() * 0.7, 0.012), z * 0.5)) * 0.5


def led_tick(f=3100):
    """an LED's faint electrical tick"""
    t = tv(0.02); return tinny(np.sin(2 * np.pi * f * t) * np.exp(-t * 400) * np.minimum(1, t / 0.0005)) * 0.25


def led_flicker(d=0.5, rate=20.0):
    """an LED stuttering on: a run of faint ticks, alternately stronger and weaker"""
    out = np.zeros(int((d + 0.05) * SR)); t = tv(0.012); tk = np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 500)
    for i in range(int(d * rate)):
        a = int(i / rate * SR); out[a:a + len(tk)] += tk * (1.0 if i % 2 == 0 else 0.55)
    return tinny(out) * 0.25


def phone_buzz(d=0.35):
    """a phone vibrating in a gloved hand: an off-balance motor near 165 Hz, rattling, damped by the glove"""
    t = tv(d); ph = 2 * np.pi * np.cumsum(165 * (1 + 0.03 * np.sin(2 * np.pi * 9 * t))) / SR
    s = np.tanh(3 * np.sin(ph)) + 0.3 * np.sin(2 * ph); rattle = noise(d, 800, 4000) * (0.5 + 0.5 * np.sign(np.sin(ph))) * 0.15
    return soft(s * 0.5 + rattle, 90, 3000) * np.minimum(1, t / 0.008) * np.minimum(1, (d - t) / 0.03) * 0.5


def fall_whistle(d=0.45, f0=2600, f1=900):
    """a flag dropping in from the top of the frame, as the camera draws it: released with a tick, a tinny slide down"""
    t = tv(d); s = np.sin(2 * np.pi * np.cumsum(np.geomspace(f0, f1, len(t))) / SR) * np.minimum(1, t / 0.004) * (0.6 + 0.4 * (1 - t / d))
    return tinny(over(s, noise(0.005, 3000, 9000) * np.exp(-tv(0.005) * 900) * 0.8)) * 0.35


def pin_wobble(d=0.5, f=1180):
    """the flag pinned on and wobbling: a tinny boing whose pitch wobbles as it dies"""
    t = tv(d); ff = f * (1 + 0.06 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 5))
    s = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 7)
    return tinny(over(s, noise(0.006, 2000, 8000) * np.exp(-tv(0.006) * 700) * 1.2)) * 0.4


def upright_slide(m0, m1, d=0.35, vel=0.8):
    """the upright's comic slide: a plucked note whose finger slides to m1 — 'bwoop?' up, 'bwomp' down"""
    f0, f1 = hz(m0), hz(m1); t = tv(d + 0.45); k = np.clip(t / d, 0, 1); f = f0 * (f1 / f0) ** (3 * k ** 2 - 2 * k ** 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(abs(np.sin(np.pi * j * 0.18)) / j ** 0.9 * np.sin(j * ph) * np.exp(-t * (1.4 + 0.7 * j)) for j in range(1, 16))
    return over(s * np.minimum(1, t / 0.004) * 0.5 * vel, noise(0.05, 30, 400) * np.exp(-tv(0.05) * 70) * 0.3 * vel)


def fiddle(d=3.0, seed=12):
    """hands tying a card tag on a collar: cord tugs, card taps, a little fabric — small and close"""
    g = np.random.default_rng(seed); out = noise(d, 300, 3000) * 0.012 * (0.6 + 0.4 * np.sin(2 * np.pi * 1.3 * tv(d)))
    for _ in range(int(d * 5)):
        tt = g.uniform(0, d - 0.15); kind = int(g.integers(3))
        x = (noise(0.03, 1200, 6000) * np.exp(-tv(0.03) * 120) * 0.12, knock(0.12, g.uniform(500, 900)), noise(0.08, 400, 2500) * np.sin(np.pi * tv(0.08) / 0.08) * 0.07)[kind]
        a = int(tt * SR); out[a:a + len(x)] += x[:len(out) - a]
    return out


def card_flip():
    """a card tag flipping round on its string: two soft flaps and a tap — paper, not plastic"""
    f = lambda g: noise(0.05, 500, 5000) * np.exp(-tv(0.05) * 70) * g
    return over(f(0.5), pad(f(0.35), 0.07), pad(knock(0.25, 600), 0.075))


# ─── a brass band for a campaign ad (Paid For By; Coxon #3's own music) ─────────────────────
def trumpet(m, d=0.3, dyn=0.75, vib=True):
    """a bright band trumpet: harmonics peaking near 1.2 kHz, a quick bloom and a tongued attack,
    a lip scoop into pitch, and vibrato only once a note is held"""
    f = hz(m); t = tv(d + 0.1)
    v = 1 + (0.004 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.25) / 0.2, 0, 1) if vib else 0)
    ph = 2 * np.pi * f * np.cumsum(v * (1 - 0.03 * np.exp(-t / 0.018))) / SR
    p = 1.6 - 0.9 * dyn; bloom = 1 - np.exp(-t / 0.025); s = np.zeros(len(t)); tot = 0.0
    for k in range(1, int(min(40, 9000 / f)) + 1):
        a = k ** -p * (1 + 1.5 * np.exp(-((k * f - 1200) / 700) ** 2)); tot += a
        s += a * np.sin(k * ph + 0.2 * k) * (1 if k <= 2 else bloom ** (0.3 + 0.15 * k))
    tongue = noise(0.02, 1500, 7000) * np.exp(-tv(0.02) * 150) * 0.15 * dyn
    return over(np.tanh(s / tot * 1.8) * env(d, 0.015, 0.1)[:len(t)] * (0.35 + 0.65 * dyn) * 0.55, tongue)


def sousaphone(m, d=0.3, dyn=0.6, sag=0.0):
    """a marching tuba: round, dark, a soft breath at the lips; sag= semitones the pitch sinks across
    the note while it fades — the band's air going out of it"""
    f = hz(m); t = tv(d + 0.25); k_ = np.clip(t / max(d, 1e-3), 0, 1)
    bend = 2 ** (sag * k_ ** 2.2 / 12) * (1 - 0.02 * np.exp(-t / 0.03))
    ph = 2 * np.pi * f * np.cumsum(bend) / SR; p = 1.9 - 1.0 * dyn; s = np.zeros(len(t)); tot = 0.0
    for k in range(1, int(min(25, 4000 / f)) + 1):   # a lip formant near 320 Hz: the note a phone speaker can still play
        a = k ** -p * (1 + 1.2 * np.exp(-((k * f - 320) / 220) ** 2)); tot += a; s += a * np.sin(k * ph + 0.4 * k)
    e = env(d, 0.03, 0.25)[:len(t)] * (1 - 0.5 * k_ ** 2 * (sag != 0))
    return (s / tot + noise(d + 0.25, 100, 1200) * np.exp(-t * 18) * 0.05 * dyn) * e * (0.4 + 0.6 * dyn) * 0.8


def glock(m, d=1.6, vel=0.8):
    """a glockenspiel: a steel bar's modes (1, 2.76, 5.40, 8.93), the fundamental ringing long,
    a brass mallet's tick"""
    f = hz(m); t = tv(d); s = np.zeros(len(t))
    for r, a, dk in ((1, 1, 1.8), (2.756, 0.35, 6), (5.404, 0.12, 14), (8.933, 0.05, 25)):
        if f * r < 20000: s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dk)
    tick = noise(0.004, 4000, 12000) * np.exp(-tv(0.004) * 1200) * 0.3 * vel
    return over(s * np.minimum(1, t / 0.0005) * np.minimum(1, (d - t) / 0.04) * 0.3 * vel, tick)   # damped at d, never cut


def rally_clap(n=7, spread=0.018, vel=1.0, seed=None):
    """a crowd of hands at a rally: n claps, each tuned a little differently, never quite together"""
    g = np.random.default_rng(seed); parts = []
    for i in range(n):
        d = 0.25; t = tv(d); lo = g.uniform(700, 1100); hi = g.uniform(3500, 6500)
        e = np.exp(-t * g.uniform(40, 70)) * np.minimum(1, t / 0.001)
        parts.append(pad(noise(d, lo, hi) * e * g.uniform(0.6, 1.0), abs(g.normal(0, spread))))
    return over(*parts) / np.sqrt(n) * 0.6 * vel


def lra(x):
    """loudness range (LU, EBU Tech 3342): K-weighted 3 s windows on a 0.1 s hop, gated at −70 LUFS and
    20 LU under their mean, 95th minus 10th percentile — what loudnorm checks before it stays linear"""
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR); z = np.exp(-2j * np.pi * f / SR)
    def biq(b, a): return (b[0] + b[1] * z + b[2] * z * z) / (a[0] + a[1] * z + a[2] * z * z)
    H = biq((1.53512485958697, -2.69169618940638, 1.19839281085285), (1, -1.69065929318241, 0.73248077421585)) * biq((1, -2, 1), (1, -1.99004745483398, 0.99007225036621))
    y = np.stack([np.fft.irfft(np.fft.rfft(x[:, c]) * np.abs(H), n) for c in range(x.shape[1])], 1)
    w, h = int(3 * SR), int(0.1 * SR); c = np.concatenate([np.zeros((1, y.shape[1])), np.cumsum(y ** 2, 0)])
    st = np.arange(0, n - w + 1, h); p = ((c[st + w] - c[st]) / w).sum(1); l = -0.691 + 10 * np.log10(p + 1e-20)
    g = l[l > -70]
    if not len(g): return 0.0
    rel = -0.691 + 10 * np.log10(np.mean(10 ** ((g + 0.691) / 10))) - 20; g = g[g > rel]
    return float(np.percentile(g, 95) - np.percentile(g, 10))


def loudnorm_measure(x, lufs=-14.0):
    """what finish()'s first loudnorm pass will measure on x (n, 2): input_i, input_tp, input_lra.
    loudnorm's LRA is its own (it reads ~2.5 LU above ebur128's on these scores), so ask it."""
    raw = tempfile.mktemp(suffix='.wav'); sf.write(raw, x, SR)
    p = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', f'loudnorm=I={lufs}:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    js = json.loads(p.stderr[p.stderr.rindex('{'):]); return float(js['input_i']), float(js['input_tp']), float(js['input_lra'])


# ─── a breaking-news theme, parodied (The Newsreader Was Fake; Doodle family, its own music) ─
def saw_stab(m, d=0.25, bright=1.0, det=0.006):
    """the news theme's synth brass: two detuned saws whose filter snaps open on the attack and closes to
    a held glow — urgent, not glossy"""
    f = hz(m); t = tv(d + 0.12); s = np.zeros(len(t))
    for k in range(1, int(min(40, 11000 / f)) + 1):
        a = (0.65 * np.exp(-t * (6 + 2.2 * k / bright)) + 0.35 / (1 + (k * f / (1400 * bright)) ** 2)) / k
        s += a * (np.sin(2 * np.pi * f * k * t + 0.3 * k) + np.sin(2 * np.pi * f * (1 + det) * k * t + 1.7 * k)) * 0.5
    e = np.minimum(1, t / 0.003); e[t > d] *= np.exp(-(t[t > d] - d) / 0.03)
    return np.tanh(s * e * 1.4) * 0.45


def clock_tick(tock=False):
    """a studio stopwatch: a dry metal click and a tiny ring, tick higher than tock"""
    t = tv(0.05); f = 1650 if tock else 2250
    return over(noise(0.004, 3000, 10000) * np.exp(-tv(0.004) * 1400) * 0.5, (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.7 * f * t)) * np.exp(-t * 140) * 0.3)


def coin_clink(f=3100, v=1.0):
    """a coin landing: an inharmonic disc ring (1, 2.4, 3.9, 5.6), short, and a little second bounce"""
    def ring(g): t = tv(0.3); return sum(a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t * dk) for r, a, dk in ((1, 1, 16), (2.4, 0.6, 22), (3.9, 0.35, 30), (5.6, 0.2, 40)) if f * r < 20000) * g
    return over(ring(0.22 * v), pad(ring(0.08 * v), 0.045))


def cash_register():
    """KA-CHING: the key's clunk, the drawer flying out, the bell (two inharmonic rings) and coins jumping"""
    t = tv(2.2)
    bell = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, a, dk in ((2637, 1, 1.6), (3951, 0.6, 2.2), (5274, 0.3, 3), (6603, 0.15, 4))) * 0.3
    clunk = over(thump() * 0.5, noise(0.05, 300, 3000) * np.exp(-tv(0.05) * 60) * 0.4)
    drawer = noise(0.25, 400, 4000) * np.sin(np.pi * tv(0.25) / 0.25) * 0.12
    coins = over(*[pad(coin_clink(2600 + 400 * i, 0.6), 0.12 + 0.05 * i) for i in range(5)])
    return over(clunk, pad(drawer, 0.03), pad(bell * np.minimum(1, t / 0.001), 0.06), pad(coins, 0.05))


def printer(d=2.0, rate=60.0, seed=3):
    """a receipt printer: the head chattering at `rate` lines a second over a small motor hum"""
    g = np.random.default_rng(seed); n = int(d * SR); out = np.zeros(n); tk = noise(0.003, 1500, 7000) * np.exp(-tv(0.003) * 1500)
    tt = 0.0
    while tt < d - 0.01:
        a = int(tt * SR); out[a:a + len(tk)] += tk[:n - a] * g.uniform(0.5, 1.0); tt += 1 / rate * g.uniform(0.85, 1.15)
    hum = soft(np.sign(np.sin(2 * np.pi * 120 * tv(d))) * 0.02, 200, 2000)
    return (out * 0.25 + hum) * np.minimum(1, tv(d) / 0.02) * np.minimum(1, (d - tv(d)) / 0.02)


# ─── a string quartet, very proper (On the Same Voluntary Terms; Coxon #4's own music) ──────
BODY = {'violin': ((290, 1.8, 70), (480, 1.3, 90), (1100, 0.6, 400), (2800, 1.6, 900)),
        'viola': ((230, 1.8, 60), (380, 1.3, 80), (900, 0.6, 350), (2300, 1.3, 800)),
        'cello': ((110, 1.7, 30), (200, 1.5, 50), (380, 1.1, 90), (1500, 0.9, 600))}


@lru_cache(maxsize=2048)
def _bowed(m, d, inst, dyn, stacc, seed):
    g = np.random.default_rng(seed); f = hz(m); t = tv(d + 0.12); n = len(t)
    rate = 5.3 + 0.4 * g.random(); depth = (0.0035 if inst != 'cello' else 0.003) * (0 if stacc else 1)
    vib = 1 + depth * np.sin(2 * np.pi * rate * t + g.uniform(0, 6)) * np.clip((t - 0.15) / 0.2, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib * (1 + 0.004 * np.exp(-t / 0.02))) / SR
    s = np.zeros(n); tot = 0.0
    for k in range(1, int(min(40, 9000 / f)) + 1):
        fk = k * f; body = 1 + sum(a * np.exp(-((fk - c) / w) ** 2) for c, a, w in BODY[inst])
        a = k ** -(1.15 - 0.25 * dyn) * body; tot += a; s += a * np.sin(k * ph + g.uniform(0, 6))
    a_ = 0.025 if stacc else 0.06; r_ = 0.05 if stacc else 0.1
    e = np.minimum(1, t / a_); e[t > d] *= np.exp(-(t[t > d] - d) / (r_ / 3))
    bow = noise(d + 0.12, 1800, 7000) * (0.01 + 0.02 * np.exp(-t / 0.4) + 0.08 * np.exp(-t / 0.05)) * dyn   # the hair bites, then settles
    return (s / tot + bow) * e * (0.3 + 0.7 * dyn) * 0.55


def violin(m, d=0.5, dyn=0.6, stacc=False, seed=0):
    """a bowed violin: a bright string spectrum shaped by the body's resonances, vibrato after the
    bow settles, a breath of bow hair on the attack (stacc=: a short, unvibrated detaché)"""
    return _bowed(int(m), round(float(d), 3), 'violin', round(float(dyn), 2), bool(stacc), int(seed))


def viola(m, d=0.5, dyn=0.5, stacc=False, seed=0):
    return _bowed(int(m), round(float(d), 3), 'viola', round(float(dyn), 2), bool(stacc), int(seed))


def cello(m, d=0.5, dyn=0.6, stacc=False, seed=0):
    return _bowed(int(m), round(float(d), 3), 'cello', round(float(dyn), 2), bool(stacc), int(seed))


def cello_hold(m, d=4.0, swell=(0.35, 0.7, 0.4)):
    """one long cello note that sulks: the bow pressure swelling and sinking (three points across d)"""
    x = cello(m, d, 0.7, False, 7); e = np.interp(np.arange(len(x)), np.linspace(0, len(x) - 1, len(swell)), swell)
    return x * e


def phone_bell(d=0.65, f=(1180, 1470), rate=20.0, v=1.0):
    """an old telephone ringing: a hammer striking two bells twenty times a second"""
    n = int((d + 0.6) * SR); out = np.zeros(n); t = tv(0.6)
    rings = [sum(a * np.sin(2 * np.pi * fr * r * t) * np.exp(-t * dk) for r, a, dk in ((1, 1, 7), (2.7, 0.4, 14), (5.1, 0.15, 25))) for fr in f]
    i = 0; tt = 0.0
    while tt < d:
        a = int(tt * SR); x = rings[i % 2]; out[a:a + len(x)] += x[:n - a] * (0.8 + 0.2 * (i % 3 == 0)); i += 1; tt += 1 / rate
    return out * 0.12 * v


# ─── a sitcom and a game show (Genius; Toko's own) — and a lounge (Somebody Does the Dishes) ─
def slap_bass(m, d=0.25, slap=True):
    """an electric bass, thumbed: bright upper harmonics gone in a blink, a pop on the slap"""
    f = hz(m); t = tv(d + 0.1); s = np.zeros(len(t))
    for k in range(1, int(min(30, 6000 / f)) + 1):
        s += np.sin(2 * np.pi * f * k * t + 0.3 * k) / k ** 0.9 * np.exp(-t * (2 + k * (1.2 if slap else 3.0)))
    e = np.minimum(1, t / 0.002); e[t > d] *= np.exp(-(t[t > d] - d) / 0.02)
    pop = noise(0.006, 2000, 7000) * np.exp(-tv(0.006) * 900) * (0.35 if slap else 0.1)
    return over(np.tanh(s * e * 1.2) * 0.45, pop)


def hammond(m, d=0.4, perc=True):
    """a combo organ: drawbars (16', 8', 5 1/3', 4', 2 2/3', 2'), a key click, the rotor's shimmer"""
    f = hz(m); t = tv(d + 0.08); rot = 1 + 0.003 * np.sin(2 * np.pi * 6.6 * t)
    ph = 2 * np.pi * f * np.cumsum(rot) / SR
    s = sum(a * np.sin(r * ph) for r, a in ((0.5, 0.5), (1, 1), (1.5, 0.45), (2, 0.75), (3, 0.35), (4, 0.3)) if f * r < 16000)
    if perc: s = s + 0.6 * np.sin(3 * ph) * np.exp(-t * 9)
    e = np.minimum(1, t / 0.004); e[t > d] *= np.exp(-(t[t > d] - d) / 0.015)
    click = noise(0.005, 1000, 6000) * np.exp(-tv(0.005) * 800) * 0.15
    return over(s * e * (1 + 0.15 * np.sin(2 * np.pi * 6.6 * t)) * 0.12, click)


@lru_cache(maxsize=1024)
def _nylon(m, d, vel):
    f = hz(m); t = tv(d + 0.15); s = np.zeros(len(t))
    for k in range(1, int(min(30, 6000 / f)) + 1):
        body = 1 + sum(a * np.exp(-((k * f - c) / w) ** 2) for c, a, w in ((105, 1.2, 25), (210, 0.8, 50), (420, 0.5, 120)))
        s += abs(np.sin(np.pi * k * 0.2)) / k * body * np.sin(2 * np.pi * f * k * t + k) * np.exp(-t * (1.4 + 0.9 * k + 0.0005 * k * f))
    e = np.minimum(1, t / 0.003); e[t > d] *= np.exp(-(t[t > d] - d) / 0.04)
    return over(s * e * 0.3 * vel, noise(0.01, 500, 3000) * np.exp(-tv(0.01) * 400) * 0.05 * vel)


def nylon(m, d=0.4, vel=0.6):
    """a nylon-string guitar, finger-plucked: round, the body's low resonances, a soft fingertip"""
    return _nylon(int(m), round(float(d), 3), round(float(vel), 2))


def vibes(m, d=1.2, vel=0.7, trem=True):
    """a vibraphone: an aluminium bar (1 and 4), long ring, a soft mallet, the motor's slow tremolo"""
    f = hz(m); t = tv(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 0.9) + 0.2 * vel * np.sin(2 * np.pi * 3.99 * f * t) * np.exp(-t * 9)
    tr = 1 - (0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * 5.0 * t)) if trem else 0)
    return s * tr * np.minimum(1, t / 0.002) * np.minimum(1, (d - t) / 0.05) * 0.3 * vel


def shaker(vel=0.5):
    """a shaker: the seeds thrown and caught"""
    t = tv(0.12); e = np.exp(-((t - 0.02) / 0.015) ** 2) + 0.5 * np.exp(-((t - 0.07) / 0.02) ** 2)
    return noise(0.12, 4000, 12000) * e * 0.12 * vel


def fly_buzz(d, f0=210, seed=0):
    """a fly circling: a buzzing wingbeat whose pitch and loudness swing as it turns"""
    g = np.random.default_rng(seed); t = tv(d)
    f = f0 * (1 + 0.06 * np.sin(2 * np.pi * g.uniform(0.3, 0.6) * t + g.uniform(0, 6)) + 0.015 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(k * ph) / k for k in range(1, 12))
    a = 0.55 + 0.45 * np.sin(2 * np.pi * g.uniform(0.25, 0.5) * t + g.uniform(0, 6))
    return soft(x, 150, 3000) * a * 0.03


def birds(d, rate=1.4, seed=1):
    """birdsong through a window: sparse chirps that sweep, far off"""
    g = np.random.default_rng(seed); n = int(d * SR); out = np.zeros(n); tt = g.uniform(0, 0.5)
    while tt < d - 0.3:
        k = int(g.integers(2, 5)); f0 = g.uniform(2600, 4500)
        for j in range(k):
            L = g.uniform(0.04, 0.09); t = tv(L); f = f0 * (1 + g.uniform(-0.25, 0.3) * t / L)
            x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / L) ** 2 * 0.012
            a = int((tt + j * (L + 0.03)) * SR); out[a:a + len(x)] += x[:n - a]
        tt += g.exponential(1 / rate) + 0.2
    return out


def snore(d, period=2.4, seed=2):
    """an old dog snoring: a fluttering in-breath, a soft out-breath"""
    g = np.random.default_rng(seed); n = int(d * SR); out = np.zeros(n); tt = 0.0
    while tt < d:
        L = 0.9; t = tv(L); flut = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 32 * t))
        x = soft(noise(L, 90, 1200) * flut, None, 900) * np.sin(np.pi * t / L) ** 1.5 * 0.08
        y = noise(0.7, 200, 2000) * np.sin(np.pi * tv(0.7) / 0.7) * 0.02
        for sig, off in ((x, 0), (y, L + 0.15)):
            a = int((tt + off) * SR)
            if a < n: out[a:a + len(sig)] += sig[:n - a]
        tt += period * g.uniform(0.92, 1.08)
    return out


def sniff():
    """a dog's quick sniff"""
    t = tv(0.07); return noise(0.07, 1500, 7000) * np.minimum(1, t / 0.006) * np.exp(-t * 35) * 0.25


def yawn(d=0.9, f0=180, seed=3):
    """a person yawning: a voice opening from 'a' to 'o' and sinking, breath through it"""
    t = tv(d); f = f0 * (1.2 - 0.45 * t / d) * (1 + 0.02 * np.sin(2 * np.pi * 5 * t))
    src = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + noise(d, 200, 4000) * 0.6
    k = np.clip(t / d, 0, 1); out = np.zeros(len(t))
    for i in range(4):                                     # four overlapping windows, each with its own formants
        F = ((730 + (570 - 730) * i / 3), (1090 + (840 - 1090) * i / 3))
        X = np.fft.rfft(src); fr = np.fft.rfftfreq(len(src), 1 / SR)
        H = sum(np.exp(-((fr - c) / (c * 0.15)) ** 2) * a for c, a in zip(F, (1, 0.6)))
        w = np.clip(1 - np.abs(k * 3 - i), 0, 1); out += np.fft.irfft(X * H, len(src)) * w
    return out / max(1e-9, np.abs(out).max()) * np.sin(np.pi * t / d) ** 0.7 * 0.25


def tape_rewind(x, d, s0=1.5, s1=5.0):
    """a tape spooled backwards: x reversed, read ever faster (pitch climbing), with hiss and a squeal"""
    y = x[::-1]; n = int(d * SR); sp = np.linspace(s0, s1, n); pos = np.cumsum(sp)
    r = np.interp(pos, np.arange(len(y)), y, right=0)
    t = tv(d); sq = np.sin(2 * np.pi * np.cumsum(np.linspace(2500, 6000, n)) / SR) * 0.015
    return (soft(r, 200, 9000) + noise(d, 3000, 9000) * 0.01 + sq) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.03)


def confetti_cannon():
    """a party cannon: the pop, a gust of air, then the paper fluttering"""
    t = tv(1.4); pop = np.sin(2 * np.pi * (60 + 120 * np.exp(-t * 40)) * t) * np.exp(-t * 18) * 0.5
    gust = noise(1.4, 200, 6000) * np.exp(-t * 12) * 0.4
    flutter = noise(1.4, 2500, 9000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 37 * t))) * np.exp(-((t - 0.5) / 0.4) ** 2) * 0.05
    return pop + gust + flutter


def boing(f=330, d=0.9):
    """a cartoon spring: a twang whose pitch wobbles and dies"""
    t = tv(d); ff = f * (1 + 0.28 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 3.5)) * (1 + 0.6 * np.exp(-t * 30))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.exp(-t * 3.2) * np.minimum(1, t / 0.002) * 0.25


def shatter(seed=4):
    """a ceramic thing smashed: a crack, shards ringing out, a low knock"""
    g = np.random.default_rng(seed); t = tv(0.9)
    crack = noise(0.9, 800, 9000) * np.exp(-t * 14) * 0.5
    shards = sum(np.sin(2 * np.pi * g.uniform(1800, 7000) * t + g.uniform(0, 6)) * np.exp(-t * g.uniform(8, 30)) * g.uniform(0.02, 0.06) * (t > g.uniform(0, 0.25)) for _ in range(30))
    return over(crack + shards, thump() * 0.5)


def euler_disk(d=1.9, f=3300):
    """a coin spinning down on its edge: the contact clicking faster and faster under a rising ring"""
    n = int(d * SR); t = tv(d); u = np.clip(t / d, 0, 0.999)
    rate = 6 / np.sqrt(1 - u) ** 1.0                      # the wobble speeds up as it settles
    ph = 2 * np.pi * np.cumsum(rate) / SR; clicks = (np.sin(ph) > 0.97).astype(float)
    ring = np.sin(2 * np.pi * f * t) * (0.4 + 0.6 * (0.5 + 0.5 * np.sin(ph)))
    tk = np.exp(-tv(0.004) * 900); c = np.convolve(clicks, tk)[:n]
    return (ring * 0.05 * (0.4 + 0.6 * u) + soft(c, 2000, 9000) * 0.12) * np.minimum(1, t / 0.05)


def office_hum(d, seed=5):
    """a cubicle at night: a fluorescent tube's 120 Hz buzz and its harmonics, the HVAC breathing"""
    g = np.random.default_rng(seed); t = tv(d)
    tube = sum(a * np.sin(2 * np.pi * 120 * k * t + g.uniform(0, 6)) for k, a in ((1, 1), (2, 0.5), (3, 0.35), (5, 0.12), (7, 0.08))) * 0.012
    hvac = soft(g.standard_normal(len(t)), 50, 500) * 0.02 * (1 + 0.15 * np.sin(2 * np.pi * 0.11 * t))
    return tube + hvac


def stapler():
    """a desk stapler: the press, the bite, the spring back"""
    return over(knock(0.7, 1700) * 0.8, click() * 0.7, pad(knock(0.4, 2400) * 0.5, 0.05), pad(noise(0.02, 3000, 9000) * np.exp(-tv(0.02) * 300) * 0.2, 0.06))


def slurp(d=0.4):
    """a careful sip of hot tea"""
    t = tv(d); x = noise(d, 400, 4000) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / d) ** 2
    return soft(x, 500, 3500) * 0.12


def rack_rattle(d=0.3, seed=6):
    """a dishwasher rack rolling home: a rumble and the plates chattering in it"""
    g = np.random.default_rng(seed); t = tv(d); x = noise(d, 80, 800) * np.sin(np.pi * t / d) * 0.15
    for _ in range(9):
        a = g.uniform(0, d - 0.05); x = over(x, pad(coin_clink(g.uniform(2200, 3800), 0.35), a))[:len(t)]
    return x


# ─── a courtroom and a keynote (Irreversible; Doodle family, its own music) ─────────────────
@lru_cache(maxsize=1024)
def _pizz_str(m, inst, vel):
    f = hz(m); d = 1.0 if inst == 'cello' else 0.6; t = tv(d); s = np.zeros(len(t)); tot = 0.0
    for k in range(1, int(min(30, 7000 / f)) + 1):
        body = 1 + sum(a * np.exp(-((k * f - c) / w) ** 2) for c, a, w in BODY[inst])
        a = abs(np.sin(np.pi * k * 0.13)) / k * body; tot += a
        s += a * np.sin(2 * np.pi * f * k * t + k) * np.exp(-t * ((2.5 if inst == 'cello' else 4.5) + 0.8 * k + k * f / 3000))
    thump = soft(noise(0.03, 60, 1500) * np.exp(-tv(0.03) * 120), None, 1200) * 0.15
    return over(s / max(tot, 1e-9) * np.minimum(1, t / 0.002) * np.minimum(1, (d - t) / 0.03) * 0.6 * vel, thump * vel)


def pizz_str(m, inst='violin', vel=0.7):
    """strings plucked, not bowed: the same bodies as the quartet, the finger's thump, a short ring"""
    return _pizz_str(int(m), inst, round(float(vel), 2))


def copier(d=3.0, seed=7):
    """a little photocopier: a motor's whirr, the carriage sweeping under the glass, a clunk per pass"""
    g = np.random.default_rng(seed); t = tv(d); pas = 1.3
    motor = soft(np.sign(np.sin(2 * np.pi * 96 * t)) * 0.02, 250, 2200)
    ph = (t % pas) / pas; sweep_ = noise(d, 800, 5000) * np.sin(np.pi * ph) ** 2 * 0.02
    out = motor + sweep_
    for k in range(int(d / pas) + 1):
        a = int((k * pas + pas * 0.98) * SR)
        if a < len(t): x = knock(0.25, 600); out[a:a + len(x)] += x[:len(t) - a] * 0.4
    return out * np.minimum(1, t / 0.2)


def pencil(d=3.0, seed=8):
    """a pencil copying fast: graphite hiss in quick strokes, catching on the paper"""
    g = np.random.default_rng(seed); t = tv(d); stroke = 0.5 + 0.5 * np.sin(2 * np.pi * 5.5 * t + 2 * np.sin(2 * np.pi * 1.3 * t))
    grip = 0.5 + 0.5 * ((g.random(len(t)) > 0.997).cumsum() % 2)
    return noise(d, 2000, 8000) * stroke * grip * 0.06 * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.05)


# ─── a waltz in Copenhagen (Satire Excepted; the Nordics' own music) ─────────────────────────
@lru_cache(maxsize=1024)
def _reed(m, d, vel, cents):
    """one free reed speaking: every harmonic, falling slowly, a nasal bump near 1.5 kHz; less air, fewer highs"""
    f = hz(m) * 2 ** (cents / 1200); t = tv(d); s = np.zeros(len(t)); tot = 0.0; roll = 1500 + 3500 * vel
    for k in range(1, int(min(40, 9000 / f)) + 1):
        a = k ** -0.75 * (1 + 0.9 * np.exp(-((k * f - 1500) / 700) ** 2)) * np.exp(-k * f / roll); tot += a * a
        s += a * np.sin(2 * np.pi * f * k * t + 0.7 * k * k)
    return s / np.sqrt(0.5 * tot) * 0.25


def accordion(m, d=0.4, vel=0.6, wet=10, a=0.025, r=0.07):
    """a piano accordion: three reeds to a note — one true, one sharp and one flat by `wet` cents, so
    the note beats (musette; wet=0 is one dry reed, for the bass buttons) — the bellows' slow speak and
    soft stop, and a breath of air through the reeds"""
    T = round(d + r, 3); t = tv(T); v = round(float(vel), 2); m = int(m)
    s = _reed(m, T, v, 0)
    if wet: s = (s + 0.8 * (_reed(m, T, v, int(wet)) + _reed(m, T, v, -int(wet)))) / 1.9
    e = np.minimum(1, t / a) ** 1.5 * np.where(t < d, 1.0, np.exp(-(t - d) / (r / 3)))
    e = e * (1 + 0.06 * np.sin(np.pi * np.minimum(t / max(d, 1e-3), 1)))            # the bellows lean in
    air = soft(np.random.default_rng(m).standard_normal(len(t)), 1500, 6000) * 0.01
    return (s + air) * e * (0.5 + 0.5 * vel)


@lru_cache(maxsize=1024)
def _harpsi(m, d, vel):
    f = hz(m); T = d + 0.06; t = tv(T); s = np.zeros(len(t)); nd = int(d * SR)
    for cents, p, gg in ((0.0, 0.11, 1.0), (3.5, 0.16, 0.7)):           # two 8' choirs, plucked near the nut
        fc = f * 2 ** (cents / 1200); x = np.zeros(len(t)); tot = 0.0
        for k in range(1, int(min(60, 12000 / fc)) + 1):
            fk = fc * k * np.sqrt(1 + 1e-5 * k * k); a = abs(np.sin(np.pi * k * p)) / k ** 0.8 * np.exp(-fk / 7000)
            x += a * np.sin(2 * np.pi * fk * t + 0.9 * k) * np.exp(-t * (0.4 + 0.5 * np.sqrt(f / 260) + 1.2 * fk / 3000)); tot += a * a
        s += gg * x / np.sqrt(0.5 * tot)
    damp = np.ones(len(t)); damp[nd:] = np.exp(-(t[nd:] - d) / 0.012)
    g = np.random.default_rng(m + 1000)
    quill = soft(g.standard_normal(int(0.006 * SR)), 2500, 9000) * np.exp(-tv(0.006) * 700) * 0.3
    jack = soft(g.standard_normal(int(0.02 * SR)), 300, 2500) * np.exp(-tv(0.02) * 200) * 0.06
    out = s * damp * np.minimum(1, t / 0.0008) * 0.12 * (0.8 + 0.2 * vel); out[:len(quill)] += quill * vel
    out[nd:nd + len(jack)] += jack[:len(out) - nd]
    return out


def harpsichord(m, d=0.3, vel=0.8):
    """a harpsichord: two choirs plucked by quills — bright, nasal, the same loudness however hard you
    press — ringing until the damper falls at d, with the jack's little knock as it does"""
    return _harpsi(int(m), round(float(d), 3), round(float(vel), 2))


def fagotto(m, d=0.6, dyn=0.6, sag=0.0, vib=0.004, a=0.03, r=0.09, seed=0):
    """a bassoon (the house kit's `bassoon` is a plain tone; this is the double reed): a buzzy source
    through the instrument's fixed formants near 470 Hz and 1.15 kHz, a weak fundamental, a tongued
    start scooping into pitch; `sag` lets a held note droop by that many semitones — doubt"""
    T = d + r; t = tv(T); f0 = hz(m)
    bend = 2 ** ((sag * (1 - np.exp(-np.maximum(0, t - 0.08) / max(d * 0.5, 0.05))) - 0.25 * np.exp(-t / 0.02)) / 12)
    f = f0 * bend * (1 + vib * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.3, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR; s = np.zeros(len(t)); tot = 0.0
    for k in range(1, int(min(40, 7000 / f0)) + 1):
        F = k * f0
        A = k ** -0.6 * (0.04 + np.exp(-((F - 470) / 230) ** 2) + 0.55 * np.exp(-((F - 1150) / 320) ** 2) + 0.12 * np.exp(-((F - 2600) / 600) ** 2))
        A *= np.exp(-F * (1 - dyn) / 2500) * (0.6 if k == 1 else 1.0); s += A * np.sin(k * ph + 0.5 * k); tot += A * A
    s /= np.sqrt(0.5 * tot); g = np.random.default_rng(seed)
    buzz = soft(g.standard_normal(len(t)), 300, 3000) * 0.04 * (0.5 + 0.5 * np.sin(ph) ** 2)
    tongue = soft(g.standard_normal(int(0.02 * SR)), 400, 4000) * np.exp(-tv(0.02) * 200) * 0.15
    e = np.minimum(1, t / a) * np.where(t < d, 1.0, np.exp(-(t - d) / (r / 3)))
    return over((s * 0.3 + buzz) * e * (0.5 + 0.5 * dyn), tongue * dyn)


def slide_whistle(f, amp, seed=0):
    """a slide whistle: a nearly pure flute tone that goes wherever the plunger goes (f: Hz, per sample),
    with breath under it; amp is its envelope, per sample"""
    f = np.asarray(f, float); n = len(f); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.004 * np.sin(2 * np.pi * 11 * t))) / SR
    tone_ = np.sin(ph) + 0.12 * np.sin(2 * ph + 0.4) + 0.04 * np.sin(3 * ph + 1.1)
    breath = soft(np.random.default_rng(seed).standard_normal(n), 1200, 7000) * 0.05
    return (tone_ * 0.3 + breath) * np.asarray(amp, float)


def water_lap(d, rate=1.6, seed=0):
    """water against a canal wall: a low wash, soft irregular slaps, the odd drip"""
    g = np.random.default_rng(seed); n = int(d * SR); t = tv(d)
    out = soft(g.standard_normal(n), 120, 900) * 0.02 * (1 + 0.4 * np.sin(2 * np.pi * 0.3 * t)); k = 0.0
    while True:
        k += g.exponential(1 / rate)
        if k > d - 0.45: break
        L = g.uniform(0.18, 0.4); tt = tv(L); a = int(k * SR)
        y = soft(g.standard_normal(len(tt)), 200, g.uniform(900, 1800)) * np.minimum(1, tt / 0.04) * np.exp(-tt / (L / 3)) * g.uniform(0.03, 0.08)
        out[a:a + len(y)] += y[:n - a]
        if g.random() < 0.3:
            td = tv(0.05); dr = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.minimum(1, td / 0.02)) / SR) * np.exp(-td * 70) * 0.02
            b = a + int(0.1 * SR); out[b:b + len(dr)] += dr[:max(0, n - b)]
    return out


def putter(d, rate=7.5, seed=1):
    """a canal boat's little diesel: low thumps a few times a second, never quite regular"""
    g = np.random.default_rng(seed); n = int(d * SR); out = np.zeros(n); th = tv(0.09); k = 0.0
    thud = np.sin(2 * np.pi * (55 + 25 * np.exp(-th * 60)) * th) * np.exp(-th * 45) + soft(g.standard_normal(len(th)), 80, 500) * np.exp(-th * 60) * 0.4
    while k < d - 0.1:
        a = int(k * SR); out[a:a + len(th)] += thud * g.uniform(0.7, 1.0); k += g.uniform(0.9, 1.1) / rate
    return soft(out, 40, 600) * 0.5


def flag_flap(d, rate=7.0, seed=2):
    """a cloth flag in a steady breeze: a flutter at a few flaps a second, gusting"""
    g = np.random.default_rng(seed); n = int(d * SR); t = tv(d)
    ph = 2 * np.pi * np.cumsum(rate * (1 + 0.25 * np.sin(2 * np.pi * 0.17 * t + g.uniform(0, 6)))) / SR
    return soft(g.standard_normal(n), 300, 4000) * (0.5 + 0.5 * np.sin(ph)) ** 3 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t + g.uniform(0, 6))) * 0.06


def press_stamp(vel=1.0, seed=3):
    """a beech copying press coming down: KA, the platen striking the bed (iron ringing short over a
    wooden thud), then CHUNK, the screw and frame settling a beat later, and a little rattle"""
    g = np.random.default_rng(seed); t = tv(0.45)
    ka = (np.sin(2 * np.pi * 2300 * t) * 0.5 + np.sin(2 * np.pi * 3570 * t) * 0.3) * np.exp(-t * 90) * 0.18
    ka[:int(0.004 * SR)] += soft(g.standard_normal(int(0.004 * SR)), 2500, 10000) * 0.15
    body = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, a, dk in ((95, 1.0, 14), (180, 0.6, 22), (410, 0.35, 30), (690, 0.25, 40), (1230, 0.12, 55)))
    hit = soft(g.standard_normal(int(0.06 * SR)), 300, 4000) * np.exp(-tv(0.06) * 70) * 0.35
    tc = tv(0.2); chunk = np.sin(2 * np.pi * (140 + 40 * np.exp(-tc * 50)) * tc) * np.exp(-tc * 24) * 0.45 + soft(g.standard_normal(len(tc)), 150, 1500) * np.exp(-tc * 50) * 0.12
    tk = tv(0.04); rattle = [pad(np.sin(2 * np.pi * f * tk) * np.exp(-tk * 120) * 0.06, dt) for f, dt in ((1900, 0.11), (2600, 0.15), (2100, 0.2))]
    return over(ka, body * 0.8, hit, pad(chunk, 0.065), *rattle) * vel


def platen_whoosh(d=0.12, seed=4):
    """the platen rushing down: air pushed out ahead of it, rising to the moment it lands"""
    t = tv(d); x = np.random.default_rng(seed).standard_normal(len(t))
    return sweep(x, 800, 5000) * (t / d) ** 2 * 0.12


def scanner(d=0.7, seed=5):
    """a lens reading a face: a thin whine that follows the light down and back, a shimmer on top"""
    t = tv(d); f = 1900 + 300 * np.sin(2 * np.pi * t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    sh = soft(np.random.default_rng(seed).standard_normal(len(t)), 4000, 9000) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))
    return (np.sin(ph) * 0.05 + 0.02 * np.sin(2 * ph) + sh * 0.03) * np.sin(np.pi * t / d)


def paper_rip(d=0.24, seed=6):
    """a calendar page torn off: fibres parting as a dense crackle, the sheet's body under it"""
    g = np.random.default_rng(seed); n = int(d * SR); t = tv(d); dens = np.minimum(1, t / 0.015) * (1 - t / d) ** 0.7
    grains = (g.random(n) < dens * 0.08) * g.uniform(0.3, 1.0, n)
    crackle = np.convolve(grains, np.exp(-tv(0.0015) * 3000))[:n]
    return soft(crackle, 1500, 9000) * 0.5 + soft(g.standard_normal(n), 500, 2500) * dens * 0.08


def page_flutter(d=0.8, seed=7):
    """a torn sheet tumbling through the air: a flutter that slows as it falls away"""
    g = np.random.default_rng(seed); t = tv(d); ph = 2 * np.pi * np.cumsum(np.linspace(18, 9, len(t))) / SR
    return soft(g.standard_normal(len(t)), 700, 5000) * (0.5 + 0.5 * np.sin(ph)) ** 2 * np.minimum(1, t / 0.03) * (1 - t / d) ** 1.5 * 0.06


def paper_slide(d=0.5, seed=8):
    """a sheet sliding across wood"""
    t = tv(d); return soft(np.random.default_rng(seed).standard_normal(len(t)), 900, 6000) * np.sin(np.pi * t / d) ** 0.7 * (1 + 0.2 * np.sin(2 * np.pi * 23 * t)) * 0.05


def clank(vel=1.0, f=620):
    """a brass pan taking a weight: the pan's modes ringing out over the knock of the contact"""
    t = tv(1.2); s = sum(a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t * dk) for r, a, dk in ((1, 1, 6), (1.52, 0.6, 9), (2.27, 0.45, 12), (2.78, 0.3, 16), (3.6, 0.2, 22), (4.4, 0.12, 28)))
    return over(s * 0.12 * np.minimum(1, t / 0.0006), knock(0.8, f * 0.45) * 0.8) * vel


def wood_creak(d=0.4, f=650, rate=55, seed=9):
    """wood under a little load: stick-slip pulses, each ringing the wood's resonance"""
    g = np.random.default_rng(seed); n = int(d * SR); t = tv(d)
    r = rate * (1 + 0.3 * np.sin(2 * np.pi * g.uniform(2, 4) * t + g.uniform(0, 6))) * (0.8 + 0.4 * t / d)
    ph = np.cumsum(r) / SR; pulses = (np.diff(np.floor(ph), prepend=0) > 0) * g.uniform(0.5, 1, n)
    kt = tv(0.02); kern = np.sin(2 * np.pi * f * kt) * np.exp(-kt * 250) + 0.4 * np.sin(2 * np.pi * 2.13 * f * kt) * np.exp(-kt * 400)
    return np.convolve(pulses, kern)[:n] * np.sin(np.pi * t / d) * 0.25


def hanger_rattle(times=(0.0, 0.025, 0.47, 0.92), vels=(1.0, 0.6, 0.4, 0.15), seed=10):
    """a wire hanger lifted off its rail: a scrape, then the hanger swinging and ticking against the bar"""
    g = np.random.default_rng(seed); n = int(0.15 * SR); sc = soft(g.standard_normal(n), 2500, 8000) * np.exp(-tv(0.15) * 25) * 0.1
    tk = tv(0.08); ticks = []
    for dt, v in zip(times, vels):
        x = sum(np.sin(2 * np.pi * g.uniform(1500, 4000) * tk + g.uniform(0, 6)) * np.exp(-tk * g.uniform(80, 150)) for _ in range(3)) * 0.06 * v
        x[:int(0.002 * SR)] += soft(g.standard_normal(int(0.002 * SR)), 3000, 10000) * 0.2 * v; ticks.append(pad(x, dt))
    return over(sc, *ticks)
