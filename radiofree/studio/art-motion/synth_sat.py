#!/usr/bin/env python3
"""Score for "Satire Excepted" (the Nordics, papercut, 37.5 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_sat.py

A jaunty Copenhagen waltz in G major, 3/4 on the 168 grid: one bar is two picture beats, so every
shot is six bars and every cut a downbeat. A musette accordion (three reeds, one sharp and one flat)
carries the tune over its own oom-pah-pah bass buttons; a harpsichord breaks the chords in eighths.
The tune rests on long notes while each caption appears and moves in the four bars after.

Christiansborg's windows light on a rising celesta run over the canal (lapping water, a boat's
putter crossing left to right, two flags). The copying press stamps on the waltz's downbeats — the
oom of the bar — each KA-CHUNK led by its platen's rush, each copy sliding out and its © tag tinging
in the chord; the voice copy lands on a tiny vocal blip. The calendar's pages rip on the harpsichord
climbing D-E-F♯, each fluttering off on a trill, and the red pencil circles the 1st on G. On the
rail the band slinks in E minor and stops dead for the tag: it flips, ding-ding, and the waltz comes
back bright. On the scale a slide whistle rides the beam's every wobble while the band can't choose
between G major and G minor, a tick on each turn. Toko lifts the mask on a harpsichord run: ta-DA,
then two seconds of almost nothing; on "Probably." a bassoon doubts in two notes (D, then a sagging
C♯ that never resolves) as the balance swings back in and clinks on to the end.
Every effect is at its second in plan/sat-EVENTS.md or the scene code (代码工程/scenes/sat_*.js).
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *


class Hygge(Score):
    BPM = 168
    VERB = dict(t60=0.9, lo=140, hi=6000, pre=0.012, g=0.3, seed=55)      # a panelled Copenhagen parlour
    GLUE = dict(thresh=-20.0, ratio=1.8, rel=0.25)
    EQ = dict(fc=4500.0, db=-1.0, hp=35.0)                                  # warm, the reeds' edge taken off


s = Hygge(); B = s.B
def bar(k, beat=0.0): return (3 * k + beat) * B                          # bar 6k is CUT[k]

#           root, alternate bass, the 'pah' chord buttons
CH = {'G': (43, 38, (55, 59, 62)), 'C': (48, 43, (55, 60, 64)), 'D7': (38, 45, (54, 57, 60)), 'Am': (45, 40, (57, 60, 64)),
      'Em': (40, 47, (55, 59, 64)), 'B7': (47, 42, (54, 57, 63)), 'Gm': (43, 38, (55, 58, 62))}


def waltz(k0, chords, g=1.0, harp=(2, 3, 4, 5), stop=None, mute=(), noom=()):
    """the band from bar k0, one chord a bar: the bass button on one (root, then the alternate bass),
    the chord buttons on two and three, the harpsichord breaking the chord in eighths in the bars given
    in `harp` (quarters elsewhere, none in `mute`); `stop` = (bar, beat): nothing at or after it; in the
    bars in `noom` something else is the oom (the press), so the band leaves the downbeat to it"""
    for i, name in enumerate(chords):
        if name is None: continue
        k = k0 + i; root, alt, pah = CH[name]; bn = root if k % 2 == 0 else alt
        def ok(beat): return (stop is None or (k, beat) < stop) and not (beat == 0 and k in noom)
        if ok(0):
            s.note(accordion(bn, 0.3, 0.75, wet=0), bar(k), 0.42 * g, -0.15, 0.12); s.note(accordion(bn + 12, 0.3, 0.6, wet=0), bar(k), 0.16 * g, -0.15, 0.12)
            s.note(harpsichord(bn + 12, 0.4, 0.8), bar(k), 0.22 * g, 0.3, 0.2)
        for bt in (1, 2):
            if ok(bt):
                for j, n in enumerate(pah): s.note(accordion(n, 0.17, 0.55, wet=6), bar(k, bt), 0.14 * g, -0.05 + 0.05 * j, 0.15)
        tones = [n + 12 for n in pah]
        if (k % 6) in harp:
            for e, idx in enumerate((0, 2, 1, 2, 1, 2)):
                if ok(e / 2): s.note(harpsichord(tones[idx], 0.16, 0.7), bar(k, e / 2), 0.13 * g, 0.35, 0.2)
        elif (k % 6) not in mute:
            for bt in (1, 2):
                if ok(bt): s.note(harpsichord(tones[2], 0.2, 0.6), bar(k, bt), 0.1 * g, 0.35, 0.2)


def tune(k0, notes, g=0.3, wet=12):
    """the accordion's right hand: (bar, beat, midi, beats) counted from bar k0"""
    for k, bt, n, L in notes: s.note(accordion(n, L * B * 0.92, 0.7, wet), bar(k0 + k, bt), g, -0.1, 0.25)


def moving(sig, t, g, p0, p1, wet=0.0):
    """an effect that travels across the frame: its pan swept from p0 to p1"""
    for bus, gg in ((s.sfx, g), (s.fwet, g * wet)):
        if not gg: continue
        a = int(round(t * SR)); n = min(len(sig), bus.N - a); x = sig[:n] * gg; ang = (np.linspace(p0, p1, n) + 1) * np.pi / 4
        bus.L[a:a + n] += x * np.cos(ang); bus.R[a:a + n] += x * np.sin(ang)


def whoosh_down(d=0.38, f0=3000, f1=800, g=0.1):
    t = tv(d); return sweep(noise(d, 300), f0, f1) * np.sin(np.pi * t / d) * g


def tap(v=1.0, f=520):
    """a copy landing on the table: paper on wood, kept under 2.5 kHz so the © tag's ting stays its own"""
    return soft(over(card() * 0.5, knock(0.5, f)), None, 2200) * v


def pivot(v=1.0):
    """the beam turning on its pin: a small brass tick and a breath of creak"""
    return over(knock(0.45, 1500) * 0.7, tick() * 0.25, wood_creak(0.25, 900, 70, seed=31) * 0.25) * v


# ── the band ─────────────────────────────────────────────────────────────────────────────────
waltz(0, ['G', 'G', 'C', 'G', 'Am', 'D7'], 0.85)                                     # 1 · Christiansborg
tune(0, [(0, 1, 71, 1), (0, 2, 74, 4), (2, 0, 76, 1.5), (2, 1.5, 74, 0.5), (2, 2, 72, 1), (3, 0, 71, 1), (3, 1, 74, 1), (3, 2, 79, 1),
         (4, 0, 81, 1.5), (4, 1.5, 79, 0.5), (4, 2, 76, 1), (5, 0, 78, 1), (5, 1, 74, 1), (5, 2, 72, 1)], 0.26)
waltz(6, ['G', 'G', 'Em', 'Am', 'D7', 'D7'], noom=(7, 8, 9, 10))                     # 2 · the press is the oom
tune(6, [(0, 0, 71, 2), (0, 2, 74, 3.8), (2, 1, 79, 0.5), (2, 1.5, 78, 0.5), (2, 2, 76, 0.8),        # KA-CHUNK — ta-ta-ta
         (3, 1, 72, 0.5), (3, 1.5, 76, 0.5), (3, 2, 81, 0.8), (4, 1, 81, 0.5), (4, 1.5, 78, 0.5), (4, 2, 74, 0.8),
         (5, 0, 72, 1), (5, 1, 71, 0.5), (5, 1.5, 69, 0.5), (5, 2, 66, 1)])
waltz(12, ['G', 'C', 'D7', 'G', 'Em', 'D7'], harp=(3, 4, 5), mute=(1, 2))                       # 3 · the bill (the rips own bars 1–2)
tune(12, [(0, 0, 71, 2), (0, 2, 67, 4), (2, 1, 69, 2), (3, 0, 79, 1), (3, 1, 74, 1), (3, 2, 71, 1),
          (4, 0, 76, 1.5), (4, 1.5, 79, 0.5), (4, 2, 83, 1), (5, 0, 81, 1), (5, 1, 78, 1), (5, 2, 74, 0.5), (5, 2.5, 72, 0.5)])
waltz(18, ['Em', 'B7'], 0.6, harp=(), stop=(19, 1.5))                                # 4 · the rail: slinking, then a dead stop
tune(18, [(0, 0, 71, 3), (1, 0, 75, 1.15)], 0.2)
waltz(20, ['G', 'C', 'D7', 'G'], 1.0)                                                # …and back, bright, after the ding-ding
tune(18, [(2, 0, 74, 1), (2, 1, 79, 1), (2, 2, 83, 1), (3, 0, 84, 1.5), (3, 1.5, 83, 0.5), (3, 2, 81, 1),
          (4, 0, 78, 1), (4, 1, 81, 1), (4, 2, 84, 1), (5, 0, 83, 1), (5, 1, 79, 1), (5, 2, 74, 1)], 0.3)
waltz(24, ['G', 'Gm', 'G', 'Gm', 'G', 'D7'], 0.75, harp=())                          # 5 · the scale: major, minor, major…


# ── 1 · Christiansborg: the canal, two flags, a string of paper flags; the windows light on a celesta run
moving(water_lap(6.2, seed=40) * np.minimum(1, tv(6.2) / 0.4) * np.minimum(1, (6.2 - tv(6.2)) / 0.5), 0.2, 2.0, -0.3, 0.3)
pb = putter(5.7, 7.5, seed=41); kb = np.linspace(0, 1, len(pb)); moving(pb * (0.35 + 0.65 * np.sin(np.pi * kb)) * np.minimum(1, tv(5.7) / 0.3), 0.45, 0.38, -0.9, 0.9)
s.fx(flag_flap(6.6, 7.0, seed=42) * np.minimum(1, (6.6 - tv(6.6)) / 0.5), 0.0, 1.6, -0.6, 0.1)
s.fx(flag_flap(6.6, 6.1, seed=43) * np.minimum(1, (6.6 - tv(6.6)) / 0.5), 0.0, 1.4, 0.6, 0.1)
s.fx(soft(noise(6.6), 2000, 8000) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.35 * tv(6.6))) * np.minimum(1, (6.6 - tv(6.6)) / 0.5) * 0.012, 0.0, 1.0, 0.1)
WIN = [0.49 + 0.09 * j for j in range(0, 41, 4)]                                     # every fourth of the 42 windows
for i, (t, n) in enumerate(zip(WIN, (83, 86, 88, 91, 93, 95, 98, 100, 103, 105, 107))):
    s.note(celesta(n, 0.3), t, 0.17 if i == 0 else 0.13 + 0.004 * i, -0.4 + 0.08 * i, 0.4)     # the first one says it has begun
s.note(sweep(noise(3.8, 4000), 6000, 11000) * np.sin(np.pi * tv(3.8) / 3.8) * 0.02, 0.45, 1.0, 0.2, 0.4)   # the glow spreading
for n, p in ((103, 0.3), (110, 0.5)): s.note(celesta(n, 0.6), 4.18, 0.11, p, 0.5)                          # the last window

# ── 2 · the press: the lens reads the face; four KA-CHUNKs on the downbeats, each copy out and tagged
s.fx(scanner(0.7), 6.68, 0.8, -0.4, 0.1)
STAMP = (7.50, 8.57, 9.64, 10.71); SPOT = (-0.6, -0.2, 0.2, 0.6); TING = (103, 103, 105, 105)
for i, t in enumerate(STAMP):
    s.fx(platen_whoosh(), t - 0.12, 0.9, 0.2)
    s.fx(press_stamp(1.0, seed=50 + i), t, 0.36, 0.2, 0.12)
    s.fx(wood_creak(0.35, 420, 40, seed=51 + i), t + 0.22, 0.18, 0.2)                 # the screw winding it back up
    moving(paper_slide(0.5, seed=52 + i), t + 0.18, 0.9, 0.2, SPOT[i])
    s.fx(tap(0.85), t + 0.68, 1.0, SPOT[i], 0.1)
    s.fx(over(click() * 0.25, glock(TING[i], 0.5, 0.7)), t + 0.73, 0.3, SPOT[i] + 0.1, 0.25)   # © — in the chord
s.fx(toy_voice(560, 'a', 0.05), 10.32, 0.2, SPOT[2], 0.1)                                  # the voice copy says "a"

# ── 3 · the bill slides in and slaps down; three months rip off (D, E, F♯ on the harpsichord, a
# flutter as each page flies), and the pencil circles the 1st on G — a target, not a verdict
moving(paper_slide(0.42, seed=60) * 1.6, 12.97, 1.0, -0.9, -0.3)
s.fx(over(soft(card(), 300, 6000) * 0.7, knock(0.9, 190), thump() * 0.25), 13.39, 0.55, -0.3, 0.15)
for i, (t, n) in enumerate(zip((14.46, 14.87, 15.27), (74, 76, 78))):
    s.fx(paper_rip(0.24, seed=61 + i), t, 0.55, 0.35, 0.1)
    moving(page_flutter(0.85, seed=64 + i), t + 0.03, 1.0, 0.35, 0.85, 0.1)
    s.note(harpsichord(n, 0.25, 1.0), t, 0.18, 0.35, 0.25)
    for j, m in enumerate((n + 2, n, n + 2, n)): s.note(harpsichord(m, 0.07, 0.6), t + 0.06 + 0.045 * j, 0.11 * (1 - 0.15 * j), 0.45, 0.25)
s.fx(pencil(0.6), 16.07, 0.9, 0.35, 0.1)
for j, n in enumerate((67, 71, 74, 79)): s.note(harpsichord(n, 0.6, 1.0), 16.07 + 0.008 * j, 0.15, 0.2 + 0.05 * j, 0.25)
s.note(celesta(91, 0.5), 16.08, 0.1, 0.35, 0.4)

# ── 4 · the rail: hangers creak as they sway; the tag flips — ding (the ticks appear), DING (it lands)
HX = (-0.6, -0.3, 0.0, 0.3, 0.6)
for i, p in enumerate(HX):
    for k in range(-2, 4):
        lt = (np.pi / 2 + k * np.pi - 1.7 * i) / 1.3
        if 0.2 < lt < 6.2: s.fx(wood_creak(0.35, 480 + 60 * i, 45, seed=70 + 7 * i + k), CUT[3] + lt - 0.17, 0.1, p, 0.15)
s.fx(card_flip(), 20.89, 0.7, 0.0, 0.1)
s.fx(glock(98, 0.9, 0.9), 20.95, 0.32, 0.05, 0.3); s.fx(glock(103, 1.2, 0.9), 21.34, 0.32, -0.05, 0.3)

# ── 5 · the scale: the laugh drops in (clank, the beam tips), the hurt drops in (clank), and the beam
# see-saws to the cut — a slide whistle on every wobble, a tick on every turn
T1, T2 = 26.25, 26.79
for tf, tl, p, f in ((25.87, T1, -0.4, 620), (26.41, T2, 0.4, 560)):
    s.fx(whoosh_down(), tf, 0.9, p); s.fx(clank(0.9, f), tl, 0.5, p, 0.2)
s.fx(wood_creak(0.45, 700, 60, seed=80), T1 + 0.03, 0.14, -0.2)
for t in (27.675, 28.349, 29.162, 30.28, 31.534): s.fx(pivot(0.8), t, 0.5, 0.0, 0.15)
def beam5(lt):                                    # sat_scale.js, in film seconds
    u = lt - T2; th = np.where(lt >= T1, 0.2 * (1 - np.exp(-(lt - T1) * 6)), 0.0)
    return np.where(lt >= T2, 0.18 * np.exp(-u * 0.6) * np.cos(u * 3.4) + 0.11 * np.sin(u * 2.3) * (1 - np.exp(-u * 0.8)), th)
tw = T1 + tv(32.45 - T1); th = beam5(tw); sp = np.abs(np.gradient(th, 1 / SR)); sp = soft(sp, None, 6) / 0.6
amp = np.clip(0.25 + 0.75 * sp, 0, 1) * np.minimum(1, (tw - T1) / 0.05) * np.clip((32.45 - tw) / 0.5, 0, 1)
s.note(slide_whistle(1050 * 2 ** (th * 3.2), amp, seed=81), T1, 0.3, 0.1, 0.3)

# ── 6 · Toko takes the mask (the hanger swings and rattles) on a harpsichord run: ta-DA on "This has
# been satire." — then nearly nothing. On "Probably." the bassoon doubts and the balance swings in
s.fx(hanger_rattle(seed=90), 32.34, 0.55, 0.5, 0.15)
moving(paper_slide(0.9, seed=91) * 0.5, 32.40, 1.0, 0.5, -0.2)
for j, n in enumerate((69, 72, 74, 78, 81, 84)): s.note(harpsichord(n, 0.08, 0.7), 32.36 + 0.05 * j, 0.12 + 0.01 * j, 0.1 + 0.05 * j, 0.25)
TA, DA = 32.84 - 3 * B / 6, 32.84                                                    # an eighth before
for n in (74, 78, 81, 84): s.note(accordion(n, 0.08, 0.7, 12), TA, 0.11, 0.0, 0.25)
s.note(harpsichord(50, 0.15, 0.8), TA, 0.15, 0.3, 0.2)
for j, n in enumerate((67, 71, 74, 79)): s.note(accordion(n, 0.5, 0.85, 12), DA, 0.13, -0.15 + 0.1 * j, 0.35)
s.note(accordion(43, 0.5, 0.8, wet=0), DA, 0.32, -0.15, 0.2); s.note(accordion(55, 0.5, 0.7, wet=0), DA, 0.12, -0.15, 0.2)
for j, n in enumerate((43, 55, 62, 67, 71, 79)): s.note(harpsichord(n, 0.6, 1.0), DA + 0.012 * j, 0.15, 0.25, 0.3)
s.note(celesta(98, 0.5), DA + 0.02, 0.09, 0.4, 0.5)
T_PROB, T_BLY = 34.84, 35.34                                                         # the line appears; its word pops
pw = whoosh_down(0.5, 900, 4000, 0.12) * np.sin(np.pi * np.minimum(1, tv(0.5) / 0.38) / 2) ** 2   # fastest at 35.22
moving(pw, T_PROB, 1.0, 0.95, 0.35, 0.1)
s.note(fagotto(50, 0.32, 0.65, seed=92), T_PROB, 0.32, -0.1, 0.25)                    # "Prob–"
s.note(fagotto(49, 0.95, 0.55, sag=-0.4, vib=0.008, seed=93), T_BLY, 0.32, -0.1, 0.3)  # "–ably…?"
s.fx(wood_creak(0.42, 380, 50, seed=94), 35.30, 0.22, 0.45, 0.2); s.fx(wood_creak(0.4, 400, 40, seed=95), 36.05, 0.09, 0.4, 0.2)
for t, v in ((35.32, 0.3), (36.35, 0.32), (37.37, 0.25)): s.fx(clank(v, 1240), t, 0.5, 0.4, 0.3)
def beam6(lt): kp = np.maximum(0, lt - T_PROB); return np.sin(kp * 3.1) * 0.22 * (0.6 + 0.4 * np.exp(-kp))   # sat_toko.js
tw = 35.9 + tv(END - 35.9); th6 = beam6(tw); sp = soft(np.abs(np.gradient(th6, 1 / SR)), None, 6) / 0.7
s.note(slide_whistle(1050 * 2 ** (th6 * 3.2), np.clip(0.2 + 0.8 * sp, 0, 1) * np.minimum(1, (tw - 35.9) / 0.4), seed=96), 35.9, 0.1, 0.4, 0.3)

# ── the rooms under it all: outdoors in shot 1, then a quiet panelled room (it fades in on the dissolve)
rm = room(s.dur, 1.0, seed=97); rm *= np.clip((tv(s.dur)[:len(rm)] - CUT[1]) / 0.5, 0, 1); s.sfx.bed(rm, 600)

s.render(str(Path(__file__).with_name('配乐_sat_m14.wav')), 37.0, tau=0.6)
