"""Toko Drop 2.0, the score: a 172 BPM drive in the early-3D era's spirit (the late-90s console jungle/breakbeat
sound — a chopped break, a detuned 'reese' bass, FM stabs and a wide pad), every voice synthesised here, nothing
sampled and nothing borrowed. The cut list in plan.json sits on this grid, so this file and that one share BPM.

    uv run --with numpy --with soundfile python looks/gl/tokodrop2/score.py plan.json <out.wav> [intro_sfx.wav]

  The bar layout is read off plan.json (re-cut 8 Nov for the Toko Midori Games accounts: 4 intro bars, 10 bars of
  compilation, a 4-bar end slate, 25.1 s; the 4 Nov GL film was 6 + 16 + 2 bars, 33.5 s):
  intro bars      under the game's OWN intro: its cues (intro_sfx.wav, rendered by the game itself,
                  debug.introWav) cut to the same three runs as the picture; a pad from the logo, a filtered break
                  from the second bar, a riser over the last two and a snare roll into the drop
  compilation     the drop on its first bar: full break, reese bass on i-VI-VII-v in D minor, stabs on the off-beats;
                  a snare on every cut that is not on a bar line, a crash half way, a fill into the slate
  end slate       a crash and the tonic on its downbeat, then a soft pulse under the slate and the pad ringing out
"""
import sys, json
import numpy as np
import soundfile as sf

PLAN = json.load(open(sys.argv[1])); OUT = sys.argv[2]; SFX = sys.argv[3] if len(sys.argv) > 3 else None
SR = 48000; BPM = PLAN['bpm']; B = 60 / BPM; S16 = B / 4; BAR = 4 * B; END = PLAN['end']
N = int((END + 0.6) * SR); L = np.zeros(N); R = np.zeros(N); rng = np.random.default_rng(172)

def tt(d): return np.arange(int(d * SR)) / SR
def at(t, sig, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i < 0: return
    n = min(len(sig), N - i); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += sig[:n] * g * l * 1.414; R[i:i + n] += sig[:n] * g * r * 1.414
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def onepole(x, fc):
    """one-pole low-pass, vectorised by blocks (fc may be an array the length of x)"""
    fc = np.broadcast_to(fc, x.shape); a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a[i]) * x[i] + a[i] * acc; y[i] = acc
    return y
def hp(x, fc): return x - onepole(x, fc)
def saw(f, d):
    ph = np.cumsum(np.broadcast_to(f, (int(d * SR),)) / SR) % 1.0; return 2 * ph - 1

# ------------------------------------------------------------------ the kit (synthesised, cached)
def mk_kick(d=0.32):
    t = tt(d); f = 46 + 120 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) + 0.25 * np.tanh(4 * np.sin(ph)) * np.exp(-t * 30)
def mk_snare(d=0.2):
    t = tt(d); n = rng.uniform(-1, 1, len(t))
    body = np.sin(2 * np.pi * 188 * t) * np.exp(-t * 26)
    return 0.55 * body + 0.8 * hp(n, 1400) * np.exp(-t * 17)
def mk_ghost(d=0.09):
    t = tt(d); return 0.6 * hp(rng.uniform(-1, 1, len(t)), 2200) * np.exp(-t * 40)
def mk_hat(d=0.04):
    t = tt(d); return hp(rng.uniform(-1, 1, len(t)), 7000) * np.exp(-t * 90)
def mk_ohat(d=0.18):
    t = tt(d); return hp(rng.uniform(-1, 1, len(t)), 6000) * np.exp(-t * 16)
def mk_crash(d=1.8):
    t = tt(d); n = hp(rng.uniform(-1, 1, len(t)), 4500); return n * np.exp(-t * 2.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
KICK, SNARE, GHOST, HAT, OHAT, CRASH = mk_kick(), mk_snare(), mk_ghost(), mk_hat(), mk_ohat(), mk_crash()

# the break: 2 bars of sixteenths — my own chop, in the shape of the era's breaks (K kick, S snare, g ghost, h hat, o open)
BREAK = ['K.h.S.hgh.KKS.ho', 'K.hKS.gh.gK.S.hS']
def drums(bar0, bars, level=1.0, lowpass=None, fills=()):
    for b in range(bars):
        pat = BREAK[b % 2] if (bar0 + b) not in fills else 'K.S.K.S.SSSSSSSS'
        for i, c in enumerate(pat):
            t = (bar0 + b) * BAR + i * S16
            sw = S16 * 0.08 if i % 2 else 0.0                       # a little swing on the off-sixteenths
            if c == 'K': at(t, KICK, 0.9 * level)
            elif c == 'S': at(t + sw, SNARE, 0.55 * level, 0.05)
            elif c == 'g': at(t + sw, GHOST, 0.25 * level, -0.15)
            elif c == 'h': at(t + sw, HAT, 0.2 * level, 0.3)
            elif c == 'o': at(t + sw, OHAT, 0.18 * level, 0.3)
            if c != 'h' and c != 'o' and i % 2 == 0 and c == '.': at(t, HAT, 0.12 * level, 0.3)

# ------------------------------------------------------------------ bass, stabs, pad (D minor: i - VI - VII - v)
PROG = [(38, [62, 65, 69]), (34, [58, 62, 65]), (36, [60, 64, 67]), (33, [57, 60, 64])]   # D, Bb, C, A minor
def reese(note, d, cut=900):
    f = hz(note); x = 0.5 * (saw(f * 2 ** (7 / 1200), d) + saw(f * 2 ** (-7 / 1200), d)) + 0.4 * np.sin(2 * np.pi * f / 2 * tt(d))
    env = np.minimum(1, tt(d) / 0.01) * np.clip((d - tt(d)) / 0.05, 0, 1)
    return np.tanh(1.6 * onepole(x, cut)) * env
def stab(notes, d=0.16):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(n) * t + 2.2 * np.exp(-t * 18) * np.sin(2 * np.pi * hz(n) * 3 * t)) for n in notes)
    return x / len(notes) * np.exp(-t * 14)
def pad(notes, d):
    t = tt(d); x = sum(saw(hz(n) * k, d) for n in notes for k in (2 ** (-9 / 1200), 2 ** (9 / 1200))) / (2 * len(notes))
    env = np.minimum(1, t / 0.6) * np.clip((d - t) / 0.5, 0, 1); return onepole(x, 1600) * env

def music_bar(bar, intensity):
    root, chord = PROG[bar % 4]; t0 = bar * BAR
    if intensity >= 2:
        # the bass: an off-beat-pushed line on the root, an octave jump at the end of the bar
        for (s, l, o) in [(0, 3, 0), (3, 2, 0), (6, 4, 0), (11, 2, 12), (14, 2, 0)]:
            at(t0 + s * S16, reese(root + o, l * S16 * 0.95, 700 if o == 0 else 1200), 0.34)
        for s in (2, 7, 10):                                       # stabs on the off-beats
            at(t0 + s * S16, stab(chord), 0.16, 0.25 if s % 2 else -0.25)
    at(t0, pad(chord, BAR + 0.25), 0.10 if intensity >= 2 else 0.17, 0)

# the layout, read off the plan: intro bars [0, IB), compilation [IB, CB), the slate [CB, end)
PLAY = [x for x in PLAN['segs'] if x['kind'] == 'play']
IB = round(PLAY[0]['t0'] / BAR); CB = round(next(x for x in PLAN['segs'] if x['kind'] == 'card')['t0'] / BAR); EB = round(END / BAR)
assert abs(IB * BAR - PLAY[0]['t0']) < 0.01 and abs(CB * BAR - PLAN['segs'][-1]['t0']) < 0.01, 'the cuts must sit on the bar grid'
# 1. under the intro: pad from the logo, a filtered break from bar 2, a riser through the last two bars and a roll at its end
for b in range(IB): music_bar(b, 1)
for b in range(1, IB): drums(b, 1, level=0.55 if b < IB - 1 else 0.75)
ris = tt(BAR * 2); rn = rng.uniform(-1, 1, len(ris)); at((IB - 2) * BAR, hp(rn, 300 + 5000 * (ris / ris[-1]) ** 2) * (ris / ris[-1]) ** 2, 0.22)
for i in range(8): at((IB - 1) * BAR + 2 * B + i * S16, SNARE, 0.18 + 0.05 * i, 0.05)
# 2. the compilation: the drop on its first bar, full from there; a snare on each cut off the bar line; a fill into the slate
at(IB * BAR, CRASH, 0.5, -0.2); at(IB * BAR, KICK, 1.0)
drums(IB, CB - IB, fills=(CB - 1,))
for b in range(IB, CB): music_bar(b, 2)
for x in PLAY[1:]:
    if abs(x['t0'] / BAR - round(x['t0'] / BAR)) > 0.01: at(x['t0'], SNARE, 0.3, 0.05)
at((IB + (CB - IB) // 2) * BAR, CRASH, 0.35, 0.2)
# 3. the end slate: a crash and the tonic on the downbeat, a soft four-on-the-floor pulse under the words as they land,
#    then the bass and pad ring out to the end
at(CB * BAR, CRASH, 0.55, 0); at(CB * BAR, KICK, 1.0); at(CB * BAR, stab(PROG[0][1] + [74], 0.5), 0.3)
at(CB * BAR, reese(PROG[0][0], BAR * 1.6, 600), 0.3); at(CB * BAR, pad(PROG[0][1], BAR * (EB - CB)), 0.14)
for k in range(4): at(CB * BAR + B * (1 + k), stab([PROG[0][1][k % 3] + 12], 0.12), 0.1, (-0.4, 0.4)[k % 2])
for k in range(4, 4 * (EB - CB) - 2): at(CB * BAR + k * B, KICK, 0.32 * (1 - k / (4 * (EB - CB))))
for b in (3, 4.5, 6): at(CB * BAR + b * B, stab([PROG[0][1][0] + 24], 0.1), 0.09, 0)   # the slate's lines landing

# the game's own intro cues, cut to the picture's three runs (plan.json's intro segments)
if SFX:
    sfx, ssr = sf.read(SFX, always_2d=True); sfx = sfx.mean(axis=1)
    if ssr != SR: sfx = np.interp(np.arange(int(len(sfx) * SR / ssr)) * ssr / SR, np.arange(len(sfx)), sfx)
    for s in [s for s in PLAN['segs'] if s['kind'] == 'intro']:
        a, d = int(s['from'] * SR), int((s['t1'] - s['t0']) * SR); seg = sfx[a:a + d].copy()
        fade = int(0.012 * SR); seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        at(s['t0'], seg, 0.9)

# master: a soft clip and a short tail after the card, then the house finish (pipeline/sound/mix.py: -14 LUFS
# integrated, at most -1 dBTP), measured by ffmpeg's ebur128 — independent of this file — and trimmed until it holds
import re, subprocess, tempfile, os
def measure(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    s = p.stderr[p.stderr.rindex('Summary:'):]; num = lambda k: float(re.search(k + r':\s+(-?[\d.]+|-inf)', s).group(1).replace('-inf', '-120'))
    return {'I': num('I'), 'LRA': num('LRA'), 'TP': num('Peak')}
mix = np.stack([L, R], 1); mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 10 ** (-1 / 20) / max(1e-9, np.abs(mix).max())
tail = int(0.5 * SR); mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
mix = mix[:int((END + 0.5) * SR)]
tmp = tempfile.mktemp(suffix='.wav')
for k in range(6):
    sf.write(tmp, mix, SR, subtype='FLOAT'); M = measure(tmp)
    if abs(M['I'] + 14.0) <= 0.2 and M['TP'] <= -1.2: break
    mix *= 10 ** ((-14.0 - M['I']) / 20)
    pk = np.abs(mix).max(); lim = 10 ** (-1.6 / 20)
    if pk > lim: mix = np.tanh(mix / lim) * lim                     # the lightest soft limit that keeps true peak under -1
os.remove(tmp)
sf.write(OUT, mix, SR, subtype='PCM_24'); M = measure(OUT)
print('score', OUT, f'{END:.2f}s at {BPM} BPM', f"{M['I']:.1f} LUFS, {M['TP']:.1f} dBTP, LRA {M['LRA']:.1f}",
      'PASS' if abs(M['I'] + 14.0) <= 0.5 and M['TP'] <= -1.0 else 'FAIL')
