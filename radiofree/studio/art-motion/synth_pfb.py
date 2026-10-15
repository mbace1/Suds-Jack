#!/usr/bin/env python3
"""Score for "Paid For By" (Coxon #3, papercut, 37.5 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_pfb.py

A brassy US campaign jingle in B-flat (the band key), 112 BPM: trumpets in thirds, a sousaphone
oom-pah, trombone 'pah's, a parade snare and bass drum (the Coxon family's drums), rally claps on
two and four, and a glockenspiel for the shine. It starts INSIDE the TV — boxed into a small
speaker — and opens into the room as the money drifts out of the screen. The hook plays in the
third bar of each shot, away from the caption reveals, and lands on the next cut. The four topic
cards each get a band stab, the last with the cymbal; under the highlighter the band drops to a
minor vamp and the glockenspiel dings the seven, then counts them, leaving the seventh hanging
on the leading tone; at the keyboard the glockenspiel plays a note per key and NOTHING on every
A and I. On the end card the band holds one big chord and leaves it section by section, a
section per shrink of the fine print, until there is a breath of silence for the last line — and
the dot's little journey — and then one tuba note, sagging, on the last hit. Every effect is at
its second in plan/pfb-EVENTS.md.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *


class Band(Score):
    BPM = 112
    VERB = dict(t60=1.2, lo=200, hi=8000, pre=0.02, g=0.26, seed=51)      # a TV studio, bright
    GLUE = dict(thresh=-15.0, ratio=2.2)
    EQ = dict(fc=3000.0, db=1.5, hp=35.0)


s = Band(); B = s.B
CH = {'Bb': (34, 41, (58, 62, 65)), 'Eb': (39, 34, (58, 63, 67)), 'F7': (41, 36, (57, 60, 63)), 'Gm': (43, 38, (58, 62, 67)),
      'Cm': (36, 43, (60, 63, 67)), 'F': (41, 36, (57, 60, 65))}            # (root, the fifth below/above, trombone voicing)
HOOK = [(0, 72, 0.5), (0.5, 74, 0.5), (1, 75, 1.0), (2, 77, 1.5), (3.5, 69, 0.5)]   # C D E-flat F … A, over F7
SECOND = [69, 70, 72, 72, 65]                                                       # the second trumpet, a third under
def bar(shot, k, b=0.0): return CUT[shot] + (4 * k + b) * B


# ── the band ────────────────────────────────────────────────────────────────────────────────
def accomp(shot, k, chord, level=2, g=1.0):
    """one bar: oom on 1 and 3 (sousaphone), pah on 2 and 4 (trombones); level 2 adds the march —
    bass drum on 1 and 3, snare eighths with the backbeat accented, rally claps on 2 and 4"""
    root, fifth, ch = CH[chord]; t0 = bar(shot, k)
    s.note(sousaphone(root, 0.36, 0.65), t0, 0.62 * g, 0, 0.12); s.note(sousaphone(fifth, 0.36, 0.6), t0 + 2 * B, 0.55 * g, 0, 0.12)
    for b in (1, 3):
        for j, n in enumerate(ch): s.note(trombone(n, 0.15, 0.55, a=0.01, r=0.1), t0 + b * B, 0.2 * g, -0.3 + 0.3 * j, 0.3)
    if level >= 2:
        for b in (0, 2): s.note(bass_drum(0.5), t0 + b * B, 0.32 * g, 0, 0.15)
        for i in range(8): s.note(field_snare(0.7 if i in (2, 6) else 0.3), t0 + i * B / 2, (0.38 if i in (2, 6) else 0.2) * g, 0.15, 0.2)
        for b in (1, 3): s.note(rally_clap(seed=int(t0 * 10) + b), t0 + b * B, 0.5 * g, 0, 0.35)


def hook(shot, holes=(), g=1.0):
    """the jingle in the third bar, landing on the next cut: two trumpets in thirds, the glockenspiel
    an octave up, trombone stabs on its rhythm, a snare roll into the landing"""
    t0 = bar(shot, 2)
    for i, ((b, n, L), n2) in enumerate(zip(HOOK, SECOND)):
        if i in holes: continue
        t = t0 + b * B; d = L * B * 0.9
        s.note(trumpet(n, d, 0.8), t, 0.5 * g, 0.15, 0.3); s.note(trumpet(n2, d, 0.65), t, 0.34 * g, -0.15, 0.3)
        s.note(glock(n + 12, 1.0, 0.7), t, 0.32 * g, 0.35, 0.35)
        for j, m in enumerate((57, 60, 63)): s.note(trombone(m, min(d, 0.25), 0.7, a=0.01, r=0.1), t, 0.16 * g, -0.3 + 0.3 * j, 0.3)
    s.note(sousaphone(41, 0.8, 0.7), t0, 0.6 * g, 0, 0.12); s.note(sousaphone(36, 0.8, 0.7), t0 + 2 * B, 0.55 * g, 0, 0.12)
    s.note(snare_roll(1.5 * B, 0.15, 0.8, seed=shot), t0 + 2.5 * B, 0.45 * g, 0.15, 0.25)
    for b in (1, 3): s.note(rally_clap(seed=shot * 7 + b), t0 + b * B, 0.5 * g, 0, 0.35)


def land(t, g=1.0, crash_=True, d=0.7):
    """the hook's landing on a cut: the whole band on B-flat, held d seconds"""
    for n, gg, pan in ((70, 0.55, 0.15), (74, 0.4, -0.15)): s.note(trumpet(n, d, 0.85), t, gg * g, pan, 0.35)
    for j, n in enumerate((58, 62, 65)): s.note(trombone(n, d, 0.75, a=0.01, r=0.12), t, 0.2 * g, -0.3 + 0.3 * j, 0.35)
    s.note(sousaphone(34, d, 0.75), t, 0.7 * g, 0, 0.12); s.note(glock(94, 1.4, 0.8), t, 0.3 * g, 0.35, 0.4)
    s.note(bass_drum(0.9), t, 0.6 * g, 0, 0.25); s.note(field_snare(1.0), t, 0.4 * g, 0.15, 0.25)
    if crash_: s.note(crash(2.0, 0.7), t, 0.38 * g, 0.3, 0.3)


def stab(t, chord='Bb', g=1.0, cymbal=False):
    """a band hit on a topic card: brass chord, bass drum, snare"""
    _, _, ch = CH[chord]
    for n in (ch[-1] + 12, ch[-2] + 12): s.note(trumpet(n, 0.18, 0.85, vib=False), t, 0.38 * g, 0.1, 0.3)
    for j, n in enumerate(ch): s.note(trombone(n, 0.18, 0.8, a=0.008, r=0.1), t, 0.2 * g, -0.3 + 0.3 * j, 0.3)
    s.note(bass_drum(0.9), t, 0.55 * g, 0, 0.25); s.note(field_snare(1.0), t, 0.45 * g, 0.15, 0.25)
    if cymbal: s.note(crash(2.2, 0.9), t, 0.5 * g, 0.3, 0.3)


# ── the picture's small sounds ──────────────────────────────────────────────────────────────
def flutter(): t = tv(0.35); return noise(0.35, 1200, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * t)) * np.sin(np.pi * t / 0.35) * 0.08
def paper_pat(v=1.0): t = tv(0.05); return noise(0.05, 500, 5000) * np.exp(-t * 90) * np.minimum(1, t / 0.001) * 0.36 * v
def whoosh(d, f0, f1, g=0.3):
    t = tv(d); return sweep(noise(d, 200), f0, f1) * np.sin(np.pi * t / d) ** 1.5 * g
def tv_on():
    """a small set switching on: a click and the tube's soft thunk"""
    t = tv(0.04); return over(noise(0.004, 2500, 9000) * np.exp(-tv(0.004) * 1500) * 0.5, np.sin(2 * np.pi * 120 * t) * np.exp(-t * 80) * 0.15)
def brass_tick(f): t = tv(0.03); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t)) * np.exp(-t * 220) * 0.2
def slap(): return over(stamp() * 0.6, card() * 0.9, noise(0.03, 1500, 8000) * np.exp(-tv(0.03) * 160) * 0.5)
def squeak(f=2300):
    t = tv(0.11); ff = f * (1 + 0.04 * np.sin(2 * np.pi * 37 * t)); s_ = np.sin(2 * np.pi * np.cumsum(ff) / SR)
    return (s_ * 0.6 + noise(0.11, 1500, 6000) * 0.3) * np.minimum(1, t / 0.006) * (1 - t / 0.11) ** 0.7 * 0.2   # the felt tip bites at once
def key_click(big=False):
    t = tv(0.06); c = noise(0.008, 2000, 8000) * np.exp(-tv(0.008) * 700)
    body = np.sin(2 * np.pi * (300 if big else 420) * t) * np.exp(-t * (60 if big else 90)) * (0.35 if big else 0.22)
    return over(c * (0.5 if big else 0.35), body, pad(noise(0.006, 1500, 6000) * np.exp(-tv(0.006) * 900) * 0.15, 0.03 if big else 0.022))
def poke(): t = tv(0.12); return over(noise(0.06, 100, 900) * np.exp(-tv(0.06) * 60) * 0.35, pad(creak(0.12) * 0.25, 0.02))
def cash_thud(): return over(thump() * 0.9, bass_drum(0.7) * 0.5, card() * 0.6, noise(0.08, 400, 3000) * np.exp(-tv(0.08) * 50) * 0.3)
def blip_down(f):
    t = tv(0.09); x = np.sin(2 * np.pi * np.cumsum(np.geomspace(f, f * 0.7, len(t))) / SR) + 0.3 * np.sign(np.sin(2 * np.pi * np.cumsum(np.geomspace(f, f * 0.7, len(t))) / SR))
    return over(x * np.exp(-t * 25) * np.minimum(1, t / 0.001) * 0.3, noise(0.004, 3000, 9000) * np.exp(-tv(0.004) * 1200) * 0.4)
def rattle(d=0.22):
    out = np.zeros(int(d * SR)); g = np.random.default_rng(4); tk = brass_tick(5200) * 0.5
    for tt in np.arange(0, d - 0.02, 0.018): a = int((tt + g.uniform(0, 0.005)) * SR); out[a:a + len(tk)] += tk[:len(out) - a] * g.uniform(0.4, 1)
    return out
def plink(f=3300, v=1.0): t = tv(0.35); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.3 * f * t)) * np.exp(-t * 16) * np.minimum(1, t / 0.0006) * 0.2 * v
def roll(d, lo=900, hi=3500, g=0.06): t = tv(d); return noise(d, lo, hi) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t)) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.05) * g


# ── shot 1 · the living room, the ad on the TV: the jingle inside the set, the money drifting out
# into the room (and the music opening out with it), a glint along the PAID FOR BY strip
accomp(0, 0, 'Bb'); accomp(0, 1, 'Eb'); hook(0)
s.note(glock(94, 1.2, 0.6), s.snap(pop(0, 0)), 0.3, 0.35, 0.3)                              # "$55.7 million": a ding on the TV
def tvbox(x):
    y = soft(x, 380, 3400, 3); y = y + 0.4 * np.concatenate([np.zeros(120), y[:-120]])        # a small cabinet's comb
    return np.tanh(y * 1.6) / 1.6
def opening(x):
    c = np.clip((np.arange(len(x)) / SR - 2.94) / (4.29 - 2.94), 0, 1); return tvbox(x) * (1 - c) + x * c
s.music_span(0.0, 4.4, opening)
for i, t in enumerate(np.arange(3.40, 4.30, 0.15)): s.fx(glock(98 + [0, 2, 4, 5, 7, 9][i % 6], 0.8, 0.35), t, 0.2, 0.3, 0.4)   # the glint
for i in range(12): s.fx(flutter(), 2.94 + i * 0.2, 0.9, -0.5 + 0.09 * i, 0.2)
for t in (5.20, 5.35, 5.94, 6.03, 6.16, 6.50, 6.80, 7.05, 7.25, 7.45, 7.62): s.fx(paper_pat(), t, 1.5, 0.2 * np.sin(t * 5), 0.1)

# ── shot 2 · the wall of 95: the hook lands; the set shrinks into its slot (a descending whoosh);
# the other 94 switch on in a granular ripple; a brass tick lands on every screen, top to bottom
land(CUT[1]); accomp(1, 0, 'Bb', 2, 0.85); accomp(1, 1, 'Gm', 2, 0.85); hook(1)
s.fx(whoosh(1.2, 6000, 400, 0.25), 6.73, 1.0, 0.0, 0.2)
g_ = np.random.default_rng(95)
for t in np.sort(7.65 + 1.09 * g_.beta(2, 2, 94)): s.fx(tv_on() * g_.uniform(0.5, 1) + 0, t, 0.5, g_.uniform(-0.8, 0.8))
for i, t in enumerate(np.linspace(9.73, 11.41, 95)): s.fx(brass_tick(5200 - 20 * i), t + g_.uniform(-0.004, 0.004), 0.5, -0.6 + 1.2 * (i % 10) / 9, 0.1)

# ── shot 3 · the topic cards: a band stab on each slap (a swish before it), the last with the
# cymbal and a glockenspiel run up the whole lit wall
land(CUT[2], 0.7, crash_=False, d=0.3)                                                             # the slaps are this shot's hits
for k, (t, ch) in enumerate([(13.41, 'Bb'), (14.48, 'Eb'), (15.55, 'Gm'), (16.62, 'F')]):
    s.fx(slap(), t, 1.7, 0.0); stab(t, ch, 0.8 + 0.1 * k, cymbal=(k == 3))
    if k: s.fx(whoosh(0.1, 1500, 7000, 0.35), t - 0.04, 0.8, 0.4)                     # the previous card flies off
for k in range(3): s.note(sousaphone([34, 39, 43][k], 0.3, 0.55), [13.95, 15.0, 16.08][k], 0.45, 0, 0.12)
for i, n in enumerate([70, 74, 77, 82, 86, 89, 94, 98]): s.note(glock(n, 0.9, 0.7), 16.62 + i * 0.06, 0.26, -0.3 + 0.08 * i, 0.4)
hook(2)

# ── shot 4 · seven: the band drops to a minor vamp; the highlighter swoops in and squeaks along every
# row; the seven light up on bright glockenspiel dings; they step out and count off, rising, the
# seventh left on the leading tone; a pickup into shot 5
land(CUT[3], 0.6, crash_=False)
for k, ch in enumerate(['Gm', 'Cm', 'F']):
    root, fifth, _ = CH[ch]; t0 = bar(3, k)
    s.note(sousaphone(root, 0.8, 0.4), t0, 0.3, 0, 0.12); s.note(sousaphone(fifth, 0.8, 0.4), t0 + 2 * B, 0.27, 0, 0.12)   # under the highlighter: quiet
    for b in (1, 3): s.note(rim(0.4), t0 + b * B, 0.25, 0.2, 0.3)
s.fx(whoosh(0.45, 800, 5000, 0.3), 19.34, 1.0, -0.4)
for t in (19.79, 19.97, 20.15, 20.33, 20.51, 20.69, 20.87, 21.05, 21.23, 21.41, 21.59, 21.77): s.fx(squeak(4800 + 400 * np.sin(t * 9)), t, 1.7, -0.5 + 0.4 * np.sin(t), 0.1)
for t, n in zip((20.02, 20.18, 20.65, 20.92, 21.08, 21.51, 21.90), (89, 94, 91, 96, 93, 98, 101)): s.note(glock(n, 0.35, 1.0), t, 0.75, 0.3, 0.25)                             # the seven, short so the marker is heard between
s.fx(whoosh(0.45, 5000, 900, 0.25), 21.95, 1.0, 0.5)
for i in range(7): s.fx(whoosh(0.25, 1200, 4000, 0.12), 22.29 + i * 0.12, 1.0, -0.6 + 0.2 * i)
for i, (t, n) in enumerate(zip(np.arange(23.29, 24.50, 0.2), (82, 84, 86, 87, 89, 91, 93))): s.note(glock(n, 1.2, 0.9), t, 0.45, -0.3 + 0.1 * i, 0.4)
s.note(snare_roll(1.2 * B, 0.1, 0.6, seed=44), bar(3, 2, 2.8), 0.4, 0.15, 0.25)

# ── shot 5 · the keyboard: the keys glow (a soft shimmer), two banded bricks of cash THUD onto A and I;
# the band back on its march; a glockenspiel note per key, and NOTHING on every A and I (a dull poke);
# then the hook, with its second and fourth notes left out
land(CUT[4], 0.7, crash_=False); accomp(4, 1, 'Eb', 2, 0.75)
for i, t in enumerate(np.arange(25.75, 27.0, 0.21)): s.note(glock(101 + (i % 2) * 2, 0.6, 0.25), t, 0.12, 0.4, 0.5)
s.fx(cash_thud(), 27.01, 1.0, -0.2); s.fx(cash_thud(), 27.54, 1.0, 0.2)
s.fx(whoosh(0.4, 600, 2500, 0.12), 27.45, 1.0, 0.5)
TYPE = [(27.86, 'H', 82), (27.99, 'E', 86), (28.25, 'L', 89), (28.38, 'T', 86), (28.51, 'H', 82), (28.64, ' ', 77), (28.77, 'C', 82), (29.03, 'R', 86),
        (29.16, 'E', 89), (29.55, 'M', 91), (29.68, 'M', 89), (29.94, 'G', 86), (30.07, 'R', 82), (30.33, 'T', 86), (30.59, 'O', 89), (30.72, 'N', 94)]
for t, k, n in TYPE: s.fx(key_click(k == ' '), t, 1.0, 0.1, 0.05); s.note(glock(n, 0.6, 0.6), t, 0.22, 0.3, 0.3)
for t in (28.12, 28.90, 29.42, 29.81, 30.20, 30.46): s.fx(poke(), t, 2.2, 0.1, 0.05)
s.fx(whoosh(0.5, 2500, 600, 0.1), 30.97, 1.0, 0.5)
hook(4, holes=(1, 3), g=0.9)

# ── shot 6 · the fine print: the band lands on its end-card chord and HOLDS it; at each shrink of
# the fine print (a little descending blip) one section leaves — glockenspiel, trumpets, trombones,
# snare, sousaphone — until there is a breath of silence for the last line; the dot shivers, rolls,
# plinks twice, plonks on the floor and goes under the rug; one tuba note on the last hit, sagging
T = CUT[5]; SH = [32.95, 33.21, 33.48, 33.75, 34.02]
s.note(bass_drum(1.0), T, 0.65, 0, 0.25); s.note(crash(2.4, 0.8), T, 0.45, 0.3, 0.3)
s.note(glock(94, SH[0] - T + 0.05, 0.8), T, 0.3, 0.35, 0.4); s.note(glock(98, SH[0] - T + 0.05, 0.6), T + 0.06, 0.2, 0.35, 0.4)
for n, gg, pan in ((70, 0.5, 0.15), (74, 0.36, -0.15), (77, 0.3, 0.3)): s.note(trumpet(n, SH[1] - T, 0.8), T, gg, pan, 0.35)
for j, n in enumerate((58, 62, 65)): s.note(trombone(n, SH[2] - T, 0.7, a=0.01, r=0.12), T, 0.22, -0.3 + 0.3 * j, 0.35)
s.note(snare_roll(SH[3] - T - 0.3, 0.25, 0.4, seed=66), T + 0.3, 0.32, 0.15, 0.25)
s.note(sousaphone(34, SH[4] - T, 0.7), T, 0.65, 0, 0.12)
for i, t in enumerate(SH): s.fx(blip_down(2300 * 0.85 ** i), t, 1.4, 0.1, 0.15)
s.fx(rattle(0.22), 34.33, 0.8, 0.1); s.fx(roll(0.4, 1500, 5000, 0.05), 34.55, 1.0, 0.2)
s.fx(whoosh(0.25, 3000, 900, 0.1), 34.95, 1.0, 0.1)
s.fx(plink(3300), 35.23, 1.0, 0.15, 0.2); s.fx(plink(3300, 0.55), 35.53, 1.0, 0.2, 0.2); s.fx(roll(0.1, 1500, 5000, 0.04), 35.55, 1.0, 0.2)
s.fx(knock(0.6, 380), 36.01, 0.9, 0.1, 0.1); s.fx(knock(0.3, 420), 36.21, 0.8, 0.05, 0.1)
s.fx(roll(0.32, 120, 700, 0.12), 36.21, 1.0, 0.0); s.fx(roll(0.51, 150, 900, 0.1), 36.45, 1.0, -0.1)
T_LAST = CUT[5] + 9 * PB                                                                                # 36.96, the last hit
s.note(sousaphone(34, 0.36, 0.75, sag=-2.5), T_LAST, 0.95, 0, 0.15)                                    # the band, deflated
for t, v in ((37.06, 0.35), (37.17, 0.2), (37.27, 0.1)): s.fx(pat(v), t, 0.6, 0.0)                     # the lump settles

s.render(str(Path(__file__).with_name('配乐_pfb_m14.wav')), T_LAST + 0.2, tau=0.45)
