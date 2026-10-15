#!/usr/bin/env python3
"""Score for "The Newsreader Was Fake" (Big Tech / Doodle family, papercut, 37.5 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_nrf.py

A breaking-news theme, parodied: E minor at 140 BPM, a studio stopwatch ticking on every beat,
urgent saw-brass stabs, a pulsing sub bass (Doodle's), timpani for the verdicts. Fifteen beats a
shot: three bars and a 3/4 break bar where the theme's rising dominant arpeggio lives, landing
on E minor at each cut, the way a news ident lands on the anchor. The cold open is the tick
alone; the theme hits as the cardboard newsreader pops up out of the post, and coins spill to
it. The studio comes up; the auction's bids climb as synth blips, the villain's paddle gets a
tritone sting, a riser carries the gavel up to its bang; the investigation is thinned to the
tick and the bass; the caption's 'liable' launches a roll that stops dead just short of the
LIABLE stamp — the biggest hit — and the theme plays in full. Then the newsreader tips over:
the tick stops on FLAT, a breath of near-silence, and the KA-CHING, a small E-major stab under
the bell, and the receipt chattering out three times faster to the end. Every effect is at its
second in plan/nrf-EVENTS.md.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *


class News(Score):
    BPM = 140
    VERB = dict(t60=1.0, lo=200, hi=7500, pre=0.015, g=0.26, seed=61)       # a TV studio: close, cold
    GLUE = dict(thresh=-15.0, ratio=2.4)
    EQ = dict(fc=3500.0, db=1.0, hp=35.0)


s = News(); B = s.B
CH = {'Em': (40, (64, 67, 71, 76)), 'C': (36, (60, 64, 67, 72)), 'Am': (45, (60, 64, 69, 72)), 'B': (35, (63, 66, 71, 75))}
def at(shot, b): return CUT[shot] + b * B


def ticks(t0, t1, g=0.34):
    """the stopwatch, on every beat of the 140 grid between t0 and t1"""
    k0 = int(np.ceil(t0 / B - 1e-6))
    for k in range(k0, int(t1 / B - 1e-6) + 1):
        if k * B < t1: s.note(clock_tick(k % 2 == 1), k * B, g, 0.35 if k % 2 else -0.35, 0.15)


def pulse(shot, b0, b1, chord, every=0.5, g=0.34):
    root, _ = CH[chord]; b = b0
    while b < b1 - 1e-9: s.note(sub_bass(root, min(0.85 * every * B, 0.4)), at(shot, b), g * (1 if b % 1 == 0 else 0.75), 0, 0); b += every


def stab(t, chord, d=0.16, g=0.26, up=0):
    for j, n in enumerate(CH[chord][1]): s.note(saw_stab(n + up, d), t, g, -0.3 + 0.2 * j, 0.3)


def bars(shot, chords, level=2, b0=0):
    """the theme's bed for bars from beat b0: the bass in eighths (level 1: quarters), a stab on each bar's
    one (level 2), and off-beat stabs pushing (level 3)"""
    for i, ch in enumerate(chords):
        b = 4 * i
        if ch is None or b + 4 <= b0: continue
        pulse(shot, max(b, b0), b + 4, ch, 0.5 if level >= 2 else 1.0)
        if level >= 2 and b >= b0: stab(at(shot, b), ch, 0.18)
        if level >= 3:
            for o in (1.5, 3.5):
                if b + o >= b0: stab(at(shot, b + o), ch, 0.1, 0.18)


def break_bar(shot, g=1.0, low=False):
    """the 3/4 break: the rising dominant arpeggio (B D-sharp F-sharp B) and a timpani roll into the cut"""
    for b, n, L in ((12, 59, 0.4), (12.5, 63, 0.4), (13, 66, 0.4), (14, 71, 0.9)):
        s.note(saw_stab(n - (12 if low else 0), L * B * 1.8 if L > 0.5 else L * B, 1.2), at(shot, b), 0.36 * g, 0.1, 0.3)
    pulse(shot, 12, 15, 'B', 1.0, 0.3 * g)
    s.note(timp_roll(40, 2.6 * B, 0.1, 0.8, seed=shot), at(shot, 12.4), 0.45 * g, -0.15, 0.3)


def land(t, g=1.0, timp=True):
    stab(t, 'Em', 0.3, 0.3 * g); s.note(sub_bass(28, 0.5), t, 0.45 * g, 0, 0)
    if timp: s.note(timpani(40, 2.0, 0.9), t, 0.6 * g, -0.15, 0.35)


def alert(t, g=0.3):
    """the breaking-news alert tone: two clean pips down a fourth"""
    for i, n in enumerate((88, 83)): s.note(tone(hz(n), 0.07, (1, 0.2), 0.002, 0.12), t + i * 0.09, g, 0.3, 0.3)


# ── shot 1 · the feed: a whoosh as it flicks up and settles; the stopwatch alone; the cardboard
# newsreader pops up and the THEME hits; sixteen coins spill out of the phone, left and right
s.fx(np.flip(riser(1.4, 600, 6000)) * np.linspace(1, 0.4, int(1.4 * SR)), 0.0, 0.5, 0.2, 0.15)
s.fx(card() * 0.4, 1.50, 0.6, 0.1)
ticks(0.0, CUT[5] + 2.10)                                                                   # …until the newsreader falls FLAT
for j, n in enumerate((52, 55, 59)): s.note(supersaw(n, 1.5, a=0.6, r=0.2, cut=1200, seed=j), 0.1, 0.07, -0.3 + 0.3 * j, 0.4)
alert(s.snap(pop(0, 0)), 0.22)                                                              # "scam ads"
s.fx(over(card() * 0.8, noise(0.2, 800, 6000) * np.exp(-tv(0.2) * 18) * 0.3), 1.65, 0.9, 0.0, 0.2)   # the pop-up's paper snap
land(at(0, 4), 0.9); bars(0, [None, 'Em', 'C'], 2, b0=4.5)
for i in range(16): s.fx(coin_clink(2900 + 150 * (i % 5)), 2.15 + i * 0.24, 0.9, -0.5 if i % 2 == 0 else 0.5, 0.15)
break_bar(0)

# ── shot 2 · the studio: the lights clunk on and hum up, the tally goes red, three cards whip up, then
# pump in protest; the theme, in full
land(CUT[1])
s.fx(over(thump() * 0.5, click() * 0.6), 6.58, 0.8, 0.0); s.fx(hum(50, 0.7) * np.linspace(0.2, 1, int(0.7 * SR)), 6.58, 0.3)
s.fx(over(click(), blip(1320) * 0.6), 7.33, 0.7, 0.3, 0.1)
for t in (7.43, 7.73, 8.03): s.fx(over(sweep(noise(0.12, 300), 900, 6000) * np.sin(np.pi * tv(0.12) / 0.12) * 0.35, card() * 0.5), t, 0.8, 0.0, 0.15)
for k in range(4):
    for j, o in enumerate((0.0, 0.3, 0.6)):
        if 8.83 + k * 1.0714 + o < CUT[2] - 0.1: s.fx(card() * 0.25, 8.83 + k * 1.0714 + o, 0.5, -0.3 + 0.3 * j)
bars(1, ['Em', 'C', 'Am'], 3, b0=0.5); break_bar(1)

# ── shot 3 · the auction: bids climb, a synth blip a step up per paddle; the crook's paddle gets the
# villain sting; a riser lifts the gavel to its BANG; SOLD; the board flips
land(CUT[2], 0.85)
bars(2, ['Em', 'Am', 'C'], 1, b0=0.5)
for t, n in zip((13.61, 14.01, 14.41, 14.76), (76, 79, 83, 86)): s.note(saw_stab(n, 0.12, 1.4), t, 0.3, 0.3, 0.3); s.fx(card() * 0.3, t, 0.5, 0.3)
for n in (40, 46, 52, 58): s.note(saw_stab(n, 0.5, 0.7), 15.31, 0.28, -0.1, 0.35)          # E and B-flat: the villain
s.note(timpani(40, 1.5, 0.8, to=34, slide=0.6), 15.31, 0.5, -0.15, 0.35)
s.lead_in(16.16, 0.85, 0.3, gap=0.04)
s.fx(gavel(), 16.16, 1.0, 0.0); s.note(timpani(40, 2.2, 1.0), 16.16, 0.7, -0.15, 0.35); s.note(kick_tight(), 16.16, 0.7, 0, 0); s.note(crash(2.0, 0.8), 16.16, 0.4, 0.3, 0.3)
stab(16.16, 'Em', 0.25, 0.32)
s.fx(over(stamp(), clap() * 0.7), 16.26, 0.9, 0.0, 0.2)
s.fx(sweep(noise(0.45, 200), 600, 5000) * np.sin(np.pi * tv(0.45) / 0.45) * 0.3, 17.21, 0.9, 0.3, 0.2); s.fx(card() * 0.6, 17.66, 0.7, 0.3)
break_bar(2)

# ── shot 4 · the ledger: the investigation, thinned to the tick and the bass; the cover swings open,
# the pen writes, the glass sweeps, the price climbs on rising coins; DETERRENT is pinned on a dry stab
land(CUT[3], 0.6, timp=False)
bars(3, ['Em', 'C', 'Am'], 1, b0=1)
s.fx(sweep(noise(0.6, 200), 500, 3000) * np.sin(np.pi * tv(0.6) / 0.6) * 0.15, 19.64, 0.9, -0.2); s.fx(thump() * 0.6, 20.24, 0.7, -0.1)
def scratch(d, seed):
    """a pen writing: hiss that catches and releases as the nib drags"""
    g = np.random.default_rng(seed); t = tv(d); grip = 0.4 + 0.6 * ((g.random(len(t)) > 0.995).cumsum() % 2)
    return noise(d, 2500, 9000) * grip * np.minimum(1, t / 0.005) * np.minimum(1, (d - t) / 0.02) * 0.12
s.fx(scratch(0.45, 1), 20.29, 1.0, 0.2); s.fx(scratch(0.35, 2), 21.14, 1.0, 0.2)
s.fx(sweep(noise(1.3, 200), 800, 2500) * np.sin(np.pi * tv(1.3) / 1.3) * 0.06, 20.34, 1.0, -0.3)
s.fx(noise(0.3, 1500, 6000) * np.minimum(1, tv(0.3) / 0.003) * np.exp(-tv(0.3) * 6) * 0.1, 20.79, 1.0, 0.1)
for i in range(8): s.fx(coin_clink(2600 + 250 * i, 0.8), 21.34 + i * 0.08, 0.8, 0.2); s.note(saw_stab(64 + [0, 3, 7, 10, 12, 15, 19, 22][i], 0.07, 1.3), 21.34 + i * 0.08, 0.14, -0.2, 0.3)
s.fx(over(card(), thump() * 0.3), 22.49, 0.8, 0.0); stab(22.49, 'Am', 0.12, 0.2); s.fx(over(click(), knock(0.5, 900)), 22.67, 0.8, 0.1)
break_bar(3, 0.8, low=True)

# ── shot 5 · the court: the judgment slides across; the timpani a heartbeat; the caption's 'liable' sets
# off a roll that stops dead just short of the LIABLE stamp — the biggest hit — then the theme in full
land(CUT[4], 0.6)
s.fx(sweep(noise(0.65, 200), 800, 4000) * np.sin(np.pi * tv(0.65) / 0.65) * 0.18, 26.06, 0.9, -0.2); s.fx(card() * 0.45, 26.06, 0.7, -0.2)   # flicked, then sliding
for b in (2, 4): s.note(timpani(40, 1.2, 0.45), at(4, b), 0.4, -0.15, 0.3)
pulse(4, 0, 5.0, 'Em', 1.0, 0.25)                                                          # quiet before the stamp
T_L = 28.21; T_P = pop(4, 0)
s.note(snare_roll(T_L - T_P - 0.1, 0.1, 1.0, seed=55), T_P, 0.55, 0.15, 0.06); s.note(timp_roll(40, T_L - T_P - 0.1, 0.1, 0.9, seed=56), T_P, 0.45, -0.15, 0.06)
x_ = riser(T_L - T_P - 0.1); f_ = int(0.02 * SR); x_[-f_:] *= np.linspace(1, 0, f_); s.note(x_, T_P, 0.28, 0, 0.06)        # dry, so the stop is a stop
s.fx(stamp(), T_L, 1.0); s.note(timpani(40, 2.4, 1.0), T_L, 0.8, -0.15, 0.4); s.note(kick_tight(), T_L, 0.8, 0, 0); s.note(sub_bass(28, 0.8), T_L, 0.6, 0, 0)
s.note(crash(2.6, 1.0), T_L, 0.5, 0.3, 0.3); stab(T_L, 'Em', 0.4, 0.4); stab(T_L, 'Em', 0.4, 0.2, up=12)
bars(4, [None, 'Em', 'C'], 3, b0=6); break_bar(4)

# ── shot 6 · the newsreader tips over: the theme lands once more and stops; the stopwatch keeps going
# and the receipt printer chatters; the creak, the sign slipping, the topple, FLAT — the tick stops;
# a breath; KA-CHING, a small E-major stab under the bell, and the printing three times faster
T = CUT[5]
land(T, 0.85)
s.fx(printer(35.54 - T, 55, seed=7), T, 0.35, 0.25, 0.1)
s.fx(creak(0.45), 33.29, 0.8, -0.1); s.fx(sweep(noise(0.3, 200), 900, 4000) * np.sin(np.pi * tv(0.3) / 0.3) * 0.12, 33.59, 0.9, 0.2)
s.fx(sweep(noise(0.55, 150), 4000, 500) * np.sin(np.pi * tv(0.55) / 0.55) * 0.12, 33.64, 0.9, -0.1)
s.fx(card() * 0.5, 34.14, 0.6, 0.2)
s.fx(over(card() * 1.2, thump() * 0.5, noise(0.5, 300, 4000) * np.exp(-tv(0.5) * 9) * 0.12), 34.24, 1.0, 0.0, 0.2)   # FLAT, and the dust
T_K = 35.54
s.fx(cash_register(), T_K, 1.0, 0.1, 0.3)
for j, n in enumerate((64, 68, 71, 76)): s.note(saw_stab(n, 0.25, 0.9), T_K, 0.16, -0.3 + 0.2 * j, 0.35)
s.note(timpani(40, 2.0, 0.6), T_K, 0.4, -0.15, 0.35); s.note(sub_bass(28, 0.5), T_K, 0.3, 0, 0)
s.fx(printer(END - T_K + 0.4, 165, seed=8), T_K + 0.08, 0.55, 0.25, 0.1)

s.music_span(T_L - 0.1, T_L, lambda x: x * np.interp(np.arange(len(x)), [0, int(0.01 * SR), len(x) - 1], [1, 0.08, 0.08]))   # the stop before LIABLE
s.render(str(Path(__file__).with_name('配乐_nrf_m14.wav')), T_K + 1.0, tau=0.9)
