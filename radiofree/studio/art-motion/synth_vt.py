#!/usr/bin/env python3
"""Score for "On the Same Voluntary Terms" (Coxon #4, papercut, 37.5 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_vt.py

A stiff-upper-lip string-quartet minuet in D major, 3/4 on the 168 grid (six bars a shot): first
violin with an original tune, second violin and viola on the 'pah-pah', cello on the one, in a
drawing room. The tune keeps to long notes wherever a caption appears. Phrase A for the boxes
arriving, phrase B for the testers waiting with their tea; the next phrase's first chord is
cut DEAD by the transatlantic ring; the boxes are reeled away to nothing but ratchets and
splashes; through the seventeen days a single cello holds its D and sulks (a fresh bow on DAY 17);
then access comes back and the quartet plays phrase A again — exactly as before, as the boxes
are carried in again exactly as before — and phrase B, straight through one small rattle of the
phone, until the door clicks shut on it. Every effect is at its second in plan/vt-EVENTS.md.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *


class Quartet(Score):
    BPM = 168
    VERB = dict(t60=1.1, lo=150, hi=6000, pre=0.012, g=0.3, seed=71)       # a panelled room
    GLUE = dict(thresh=-20.0, ratio=1.6, rel=0.3)
    EQ = dict(fc=5000.0, db=-1.0, hp=35.0)


s = Quartet(); B = s.B
def bar(shot, k, b=0.0): return CUT[shot] + (3 * k + b) * B

PHRASE = {
 'A': [([(0, 78, 1.5), (1.5, 76, 0.5), (2, 74, 1)], (38, 57, 66)),
       ([(0, 81, 3)], (42, 57, 62)),
       ([(0, 79, 1), (1, 78, .5), (1.5, 76, .5), (2, 74, .5), (2.5, 71, .5)], (43, 59, 67)),
       ([(0, 76, 2), (2, 73, 1)], (45, 61, 67)),
       ([(0, 74, 1), (1, 78, .5), (1.5, 76, .5), (2, 74, .5), (2.5, 73, .5)], (38, 57, 66)),
       ([(0, 74, 2), (2, 69, 1)], (38, 57, 66))],
 'B': [([(0, 81, 1), (1, 79, .5), (1.5, 78, .5), (2, 76, 1)], (45, 61, 64)),
       ([(0, 78, 3)], (47, 62, 66)),
       ([(0, 73, 1), (1, 76, 1), (2, 81, 1)], (45, 61, 64)),
       ([(0, 80, 2), (2, 76, 1)], (40, 56, 64)),
       ([(0, 81, 1), (1, 76, .5), (1.5, 78, .5), (2, 76, .5), (2.5, 74, .5)], (45, 61, 64)),
       ([(0, 73, 2), (2, 69, 1)], (45, 61, 64))]}


def minuet(shot, phrase, bars=range(6), g=1.0):
    """the quartet: first violin's tune (detaché on the quavers), cello on one, viola and second violin
    on two and three"""
    for k in bars:
        tune, (vc, va, v2) = PHRASE[phrase][k]; t0 = bar(shot, k)
        for b, n, L in tune:
            s.note(violin(n, L * B * 0.94, 0.62, L <= 0.5, seed=k * 7 + int(b * 2)), t0 + b * B, 0.5 * g, 0.2, 0.3)
        s.note(cello(vc, B * 0.9, 0.62, True, seed=k), t0, 0.55 * g, -0.25, 0.3)
        for bt in (1, 2):
            s.note(viola(va, B * 0.7, 0.45, True, seed=k + bt), t0 + bt * B, 0.32 * g, -0.1, 0.3)
            s.note(violin(v2, B * 0.7, 0.42, True, seed=50 + k + bt), t0 + bt * B, 0.28 * g, 0.1, 0.3)


# ── sounds of the street and the house ──────────────────────────────────────────────────────
def cab(t0, peak, t1, g=1.0):
    """a black cab on wet tarmac, passing: a tyre hiss that swells to its peak and goes, a low engine"""
    d = t1 - t0; t = tv(d); e = np.exp(-((t - (peak - t0)) / (d * 0.28)) ** 2)
    x = noise(d, 300, 4000) * e * 0.12 + noise(d, 40, 250) * e * 0.18
    s.fx(x, t0, g, -0.6 + 1.2 * ((peak - t0) / d), 0.1)
def scrape(d=1.3): t = tv(d); return noise(d, 500, 4000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.1) * 0.05
def box_thud(): return over(card() * 0.6, thump() * 0.25, pad(knock(0.15, 240), 0.09))
def latch(): return over(click() * 0.8, knock(0.5, 1300) * 0.6, pad(knock(0.3, 800), 0.03))
def ting(): t = tv(0.8); return (np.sin(2 * np.pi * 3520 * t) + 0.3 * np.sin(2 * np.pi * 9500 * t)) * np.exp(-t * 6) * np.minimum(1, t / 0.001) * 0.08
def flick(): return over(noise(0.04, 1500, 7000) * np.exp(-tv(0.04) * 90) * 0.25, knock(0.15, 1100))
def cup(): t = tv(0.4); return over(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dk) for f, dk in ((2900, 14), (4700, 20), (6100, 28))) * 0.06, noise(0.01, 2000, 8000) * np.exp(-tv(0.01) * 500) * 0.2)
def twang(f0=180, rise=1.0, d=0.5):
    """a taut string plucked (or snapping taut): its pitch springs up as the tension comes on"""
    t = tv(d); f = f0 * (1 + rise * (1 - np.exp(-t / 0.03))); ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(np.sin(k * ph) / k * np.exp(-t * (5 + 3 * k)) for k in range(1, 8)) * np.minimum(1, t / 0.002) * 0.25
def splash(): t = tv(0.7); return over(noise(0.7, 300, 6000) * np.exp(-t * 7) * np.minimum(1, t / 0.005) * 0.3, np.sin(2 * np.pi * np.cumsum(np.geomspace(500, 160, len(t))) / SR) * np.exp(-t * 12) * 0.2)
def ratchet(t0, t1, n=26):
    """two reels winding: ratchet clicks, slowing toward the end"""
    u = np.linspace(0, 1, n) ** 0.65
    for i, x in enumerate(u): s.fx(over(click() * 0.4, knock(0.15, 1600)), t0 + x * (t1 - t0), 0.6, 0.5 if i % 2 else 0.3)
def rip(): t = tv(0.14); return noise(0.14, 1200, 7000) * np.exp(-t * 20) * (1 + 0.6 * np.sin(2 * np.pi * 70 * t)) * 0.4


def arrival(peak, span, slides, stops, door, hops, inside, glint):
    """the boxes arriving: shot 1, and — exactly the same — shot 5"""
    cab(span[0], peak, span[1])
    for t in slides: s.fx(scrape(1.3), t, 0.9, -0.2, 0.05)
    for t in stops: s.fx(box_thud(), t, 0.8, 0.0, 0.1)
    s.fx(latch(), door, 0.9, 0.2, 0.15); s.fx(creak(0.45), door + 0.02, 0.6, 0.2, 0.2)
    for t in hops: s.fx(over(noise(0.12, 600, 3000) * np.sin(np.pi * tv(0.12) / 0.12) * 0.1, pad(box_thud(), 0.12)), t - 0.12, 0.8, 0.1, 0.1)
    for t in inside: s.fx(scrape(0.3) * 0.7, t, 0.8, 0.2, 0.1)
    s.fx(ting(), glint, 0.8, 0.3, 0.3)


# ── shot 1 · the door: phrase A; a cab hisses past; three boxes slide in, stop, the latch, the door,
# each box hops up and goes in; a glint on the brass plate
minuet(0, 'A')
arrival(1.07, (0.15, 2.00), (0.50, 0.82, 1.14), (1.80, 2.12, 2.44), 2.25, (3.27, 3.87, 4.47), (3.82, 4.42, 5.02), 5.30)

# ── shot 2 · by invitation: phrase B; three tags drop under the boxes; tea; the middle box is
# twitched back on its string
minuet(1, 'B')
for t in (6.98, 7.23, 7.48): s.fx(flick(), t, 0.8, 0.0, 0.15)
for t in (8.63, 11.43): s.fx(cup(), t, 0.8, -0.3 if t < 10 else 0.3, 0.2)
s.fx(twang(220, 0.8, 0.4), 10.38, 0.7, 0.1, 0.15); s.fx(scrape(0.25), 10.40, 0.9, 0.1)

# ── shot 3 · the call: phrase A begins — and its first chord is cut DEAD by the ring; two bursts of a
# transatlantic telephone; the strings snap taut, the boxes are yanked off the quay into the water and
# reeled away (ratchets slowing); the quartet does not play
T = CUT[2]                                                                                 # only the downbeat and the first 'pah' get out
s.note(violin(78, 0.6, 0.62, seed=1), T, 0.5, 0.2, 0.3); s.note(cello(38, B * 0.9, 0.62, True), T, 0.55, -0.25, 0.3)
s.note(viola(57, B * 0.7, 0.45, True, 3), T + B, 0.32, -0.1, 0.3); s.note(violin(66, B * 0.7, 0.42, True, 53), T + B, 0.28, 0.1, 0.3)
s.music_span(13.41, CUT[3], lambda x: x * np.minimum(1, np.maximum(0, 1 - np.arange(len(x)) / (0.012 * SR))))
for t0, t1 in ((13.41, 14.06), (14.36, 15.01)): s.fx(phone_bell(t1 - t0), t0, 1.0, 0.3, 0.15)
for t in (15.13, 15.40): s.fx(twang(140, 2.0, 0.35), t, 0.8, 0.4)
for t, q, w in ((15.21, 15.43, 15.71), (15.48, 15.70, 15.98)):
    s.fx(noise(0.2, 500, 3000) * np.sin(np.pi * tv(0.2) / 0.2) * 0.12, t, 0.9, 0.2); s.fx(box_thud(), q, 0.8, 0.3); s.fx(splash(), w, 0.9, 0.4, 0.2)
ratchet(15.21, 18.08)
for t in (17.81, 18.08): s.fx(box_thud() * 0.5, t, 0.6, 0.6)

# ── shot 4 · seventeen days: a single cello holds its D and sulks; a fresh bow on DAY 17; the calendar
# tears its pages, quavers then semiquavers
T17 = 22.366
s.note(cello_hold(38, T17 - CUT[3] + 0.05, (0.25, 0.6, 0.35)), CUT[3], 0.9, -0.2, 0.35)
s.note(cello_hold(38, CUT[4] - T17 - 0.15, (0.7, 0.45, 0.15)), T17, 0.9, -0.2, 0.35)
for t in (19.821, 20.089, 20.357, 20.625, 20.893, 21.027, 21.161, 21.295, 21.429, 21.563, 21.696, 21.830, 21.964, 22.098, 22.232):
    s.fx(rip(), t, 0.7, 0.3 * np.sin(t * 7), 0.1)
s.fx(over(rip() * 1.3, card() * 0.6), T17, 0.9, 0.0, 0.15)

# ── shot 5 · back, as before: phrase A again, exactly; the same cab, the same boxes, the same door
minuet(4, 'A')
arrival(26.79, (25.86, 27.71), (26.21, 26.53), (27.51, 27.83), 27.96, (28.98, 29.58), (29.53, 30.13), 31.01)

# ── shot 6 · until the phone rings again: phrase B, straight through one small rattle of the phone;
# the card OPEN · BY INVITATION drops onto its hook; the door clicks shut on the quartet
minuet(5, 'B', bars=range(5))
s.fx(noise(0.34, 1500, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * tv(0.34))) * np.sin(np.pi * tv(0.34) / 0.34) * 0.05, 32.64, 0.8, 0.2)
s.fx(flick(), 32.98, 0.9, 0.2, 0.15); s.fx(creak(0.4) * 0.3, 33.05, 0.6, 0.2)
s.fx(ting(), 33.62, 0.6, 0.3, 0.3)
s.fx(phone_bell(0.36, v=0.75), 35.89, 1.0, 0.4, 0.15)                                            # smaller than the rings, but heard; s.fx(twang(140, 0.6, 0.25) * 0.4, 35.95, 0.6, 0.4)
T_DOOR = 36.69
s.music_span(T_DOOR, END + 0.5, lambda x: x * np.maximum(0, 1 - np.arange(len(x)) / (0.01 * SR)))
s.fx(over(latch(), thump() * 0.5), T_DOOR, 1.0, 0.0, 0.3); s.fx(creak(0.5) * 0.25, T_DOOR + 0.1, 0.5, 0.2, 0.2)

s.render(str(Path(__file__).with_name('配乐_vt_m14.wav')), T_DOOR + 0.25, tau=0.5)
