"""GL looks, the sound: one synthesised cue sheet per era, read off the page's own events.json (render.mjs writes it).
Nothing is sampled. 8-bit is pulse waves, a triangle bass and a noise channel; 16-bit is two-operator FM with a kick
and a noise snare; early 3D is a detuned pad, a whoosh, a boom and a bell, the way that generation scored its title
screens with streamed audio rather than chip voices.

    uv run --with numpy --with soundfile python looks/gl/sound.py <8bit|16bit|3d> <events.json> <out.wav>
"""
import sys, json
import numpy as np
import soundfile as sf

LOOK, EV, OUT = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
SR = 48000; N = int((EV['end'] + 0.4) * SR); mix = np.zeros(N); rng = np.random.default_rng(45)
def at(t, sig, g=1.0):
    i = int(t * SR)
    if i >= N: return
    n = min(len(sig), N - i); mix[i:i + n] += sig[:n] * g
def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.005, r=None):
    t = tt(d); r = r if r is not None else d * 0.6
    return np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1)
def pulse(f, d, duty=0.25):
    t = tt(d); ph = (np.cumsum(np.broadcast_to(f, t.shape) / SR) if np.ndim(f) else t * f) % 1.0
    return np.where(ph < duty, 1.0, -1.0)
def tri(f, d):
    t = tt(d); ph = (t * f) % 1.0; return 4 * np.abs(ph - 0.5) - 1
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def fm(f, d, ratio=2.0, index=2.0, decay=6.0):
    t = tt(d); return np.sin(2 * np.pi * f * t + index * np.exp(-t * decay) * np.sin(2 * np.pi * f * ratio * t))
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def lp(x, fc):   # a one-pole low-pass
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(0, len(x), 4096):
        c = x[i:i + 4096]; out = np.empty_like(c)
        for j in range(len(c)): acc = (1 - a) * c[j] + a * acc; out[j] = acc
        y[i:i + 4096] = out
    return y

if LOOK == '8bit':
    # music: a pulse arpeggio over a triangle bass, a noise hat; 150 BPM, sixteenths
    s16 = 60 / 150 / 4; t0 = EV['music']; prog = [(60, [60, 64, 67, 72]), (57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (55, [55, 59, 62, 67])]
    i = 0; t = t0
    while t < EV['end'] - 0.1:
        root, arp = prog[(i // 16) % 4]
        at(t, pulse(hz(arp[i % 4] + 12), s16 * 0.9, 0.25) * env(s16 * 0.9, r=s16 * 0.5), 0.06)
        if i % 4 == 0: at(t, tri(hz(root - 12), s16 * 3.5) * env(s16 * 3.5, r=s16), 0.18)
        if i % 2 == 0: at(t, noise(0.02) * env(0.02), 0.03)
        i += 1; t += s16
    for st in EV['steps']: at(st, noise(0.025) * env(0.025), 0.12)
    at(EV['pull'], noise(0.08) * env(0.08), 0.25); f = np.linspace(420, 90, int(0.16 * SR)); at(EV['pull'], pulse(f, 0.16, 0.5) * env(0.16), 0.12)
    at(EV['flash'], (pulse(hz(72), 0.12) + pulse(hz(76), 0.12) + pulse(hz(79), 0.12)) / 3 * env(0.12), 0.18)
    at(EV['pulse0'], pulse(np.linspace(200, 900, int(0.45 * SR)), 0.45, 0.125) * env(0.45, r=0.1), 0.06)
    tb = EV['fill'] + 0.1
    while tb < EV['end'] - 0.2: at(tb, pulse(rng.uniform(1300, 2200), 0.03, 0.5) * env(0.03), 0.04); tb += rng.uniform(0.12, 0.25)
    pent = [72, 74, 76, 79, 81]
    for k, tl in enumerate(EV['letters']): at(tl, pulse(hz(pent[k % 5] + 12 * (k // 10)), 0.05, 0.5) * env(0.05), 0.11)
    for k, n in enumerate([72, 76, 79, 84]): at(EV['week'] + k * 0.1, pulse(hz(n), 0.09, 0.25) * env(0.09), 0.14)
    at(EV['jump'], pulse(np.linspace(300, 950, int(0.2 * SR)), 0.2, 0.5) * env(0.2), 0.09); at(EV['land'], noise(0.04) * env(0.04), 0.15)

elif LOOK == '16bit':
    bpm = 140; b = 60 / bpm; t = EV['music']; i = 0
    bass = [40, 40, 52, 40, 43, 43, 55, 43, 45, 45, 57, 45, 47, 47, 59, 50]
    lead = [64, 67, 71, 74, 67, 71, 74, 79, 69, 72, 76, 81, 71, 74, 78, 83]
    while t < EV['end'] - 0.1:
        at(t, fm(hz(bass[i % 16]), b / 2 * 0.95, ratio=1.0, index=3.0, decay=8) * env(b / 2 * 0.95, r=0.05), 0.16)
        at(t, fm(hz(lead[i % 16]), b / 2 * 0.9, ratio=2.0, index=1.5, decay=5) * env(b / 2 * 0.9, r=0.08), 0.06)
        if i % 2 == 0: at(t, np.sin(2 * np.pi * np.cumsum(np.linspace(120, 40, int(0.12 * SR))) / SR) * env(0.12), 0.35)
        if i % 4 == 2: at(t, lp(noise(0.12), 5000) * env(0.12), 0.25)
        at(t, noise(0.015) * env(0.015), 0.03)
        i += 1; t += b / 2
    for st in EV['steps']: at(st, noise(0.02) * env(0.02), 0.05)
    at(EV['skid'], lp(noise(0.35), 2500) * env(0.35), 0.12)
    d = EV['logo1'] - EV['logo0']; sw = noise(d) * np.linspace(0.1, 1, int(d * SR)) ** 2; at(EV['logo0'], lp(sw, 3500), 0.22)
    at(EV['logo1'], lp(noise(1.0), 7000) * np.exp(-tt(1.0) * 4), 0.22)
    for n in (64, 68, 71, 76): at(EV['logo1'], fm(hz(n), 1.2, ratio=3.5, index=2.5, decay=3) * env(1.2, r=0.9), 0.07)
    for s0 in (EV['shine0'], EV['shine2']):
        for k in range(4): at(s0 + k * 0.07, fm(hz(88 + k * 2), 0.25, ratio=3.5, index=2, decay=10) * env(0.25), 0.05)
    at(EV['week'], fm(hz(76), 0.2, ratio=2, index=1.2) * env(0.2), 0.12); at(EV['week'] + 0.12, fm(hz(83), 0.35, ratio=2, index=1.2) * env(0.35), 0.12)

else:  # early 3D
    d = EV['end'] + 0.3; t = tt(d)
    pad = np.zeros(len(t))
    for n in (50, 57, 60, 64, 69):
        for det in (-0.12, 0.0, 0.11): pad += ((t * hz(n) * 2 ** (det / 12)) % 1.0 * 2 - 1)
    pad = lp(pad / 15, 1400) * np.minimum(1, t / 1.2)
    mix[:len(pad)] += pad[:N] * 0.35 if len(pad) <= N else pad[:N] * 0.35
    sw = noise(1.2) * np.sin(np.linspace(0, np.pi, int(1.2 * SR))) ** 2; at(EV['door'] - 0.5, lp(sw, 2200), 0.3)
    at(EV['arrive'] - 0.2, np.sin(2 * np.pi * np.cumsum(np.linspace(70, 32, int(1.6 * SR))) / SR) * np.exp(-tt(1.6) * 2.2), 0.5)
    for k, n in enumerate((74, 78, 81, 86, 90)): at(EV['title'] + k * 0.09, fm(hz(n), 1.4, ratio=3.0, index=1.8, decay=2.5) * env(1.4, r=1.1), 0.06)
    s0 = EV['start']
    while s0 < EV['end'] - 0.1: at(s0, fm(hz(93), 0.06, ratio=2, index=0.6) * env(0.06), 0.035); s0 += 0.8

pk = np.abs(mix).max() or 1; mix = mix / pk * 0.89
rms = np.sqrt(np.mean(mix ** 2)); target = 10 ** (-16 / 20)
if rms > 0: mix = np.clip(mix * min(target / rms, 1.0 / np.abs(mix).max() * 0.89), -0.95, 0.95)
fade = int(0.25 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
sf.write(OUT, np.stack([mix, mix], 1).astype(np.float32), SR)
print(LOOK, 'sound ->', OUT, f'{len(mix) / SR:.2f}s', f'rms {20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9):.1f} dBFS')
