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
