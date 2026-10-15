#!/usr/bin/env python3
"""Score for "Irreversible" (Doodle family, papercut, 37.5 s) — its own music (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_irr.py

Two registers of the same company. Brussels opens as a glossy KEYNOTE in D major at 140: a soft
four-on-the-floor, a pluck arpeggio, marimba, an airy pad; the twelve EU stars light on a rising
glockenspiel scale, and the order lands on the search bar. When the case begins the music turns
into COURTROOM PIZZICATO, D minor, on the same 140 grid — and wherever the picture has its own
rhythm the strings follow the picture instead: the briefcase climbs the court steps on rising
plucks, "IRREVERSIBLE HARM" lands on a solemn low hit (timpani, bass drum, low brass, a deep bell),
the law book's pages turn and the gold line is the shot's hit, the cabinet swells and its drawers
burst one per eighth, and the scale — undecided — rocks on a two-note see-saw that never settles.
Then the padlock: a crisp click and the keynote's glossy chord, as if it were a product launch,
fading to a pencil copying, the tape running and a little photocopier whirring behind the glass;
the last line lands nearly dry, on one pluck. Every effect is at its second in plan/irr-EVENTS.md.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *


class Court(Score):
    BPM = 140
    VERB = dict(t60=1.5, lo=200, hi=8000, pre=0.02, g=0.28, seed=101)     # marble: a keynote stage, a court
    GLUE = dict(thresh=-17.0, ratio=2.0)
    EQ = dict(fc=3000.0, db=1.0, hp=35.0)


s = Court(); B = s.B
KEY = {'D': (50, (62, 66, 69, 73, 76)), 'Bm7': (47, (62, 66, 69, 71, 74)), 'Gmaj7': (43, (62, 66, 67, 71, 74)), 'A': (45, (61, 64, 69, 73, 76))}
CRT = {'Dm': (38, 45, (65, 69, 74)), 'Gm': (43, 38, (67, 70, 74)), 'A7': (45, 40, (67, 69, 73)), 'Bb': (46, 41, (65, 70, 74))}
def at(b): return b * B                                                  # the 140 grid runs from 0: every cut is on it


def keynote(b0, b1, g=1.0):
    """the launch groove: a soft kick on every beat, hats on the off-beats, the pluck arpeggio in eighths,
    marimba on each bar, the sub on the roots"""
    PROG = ['D', 'Bm7', 'Gmaj7', 'A']
    b = b0
    while b < b1 - 1e-9:
        bar = int(b // 4); root, ch = KEY[PROG[bar % 4]]; t = at(b)
        if b % 1 == 0: s.note(kick_tight(0.6), t, 0.4 * g, 0, 0); s.note(sub_bass(root - 12, 0.3), t, 0.3 * g, 0, 0)
        if b % 1 == 0.5: s.note(hat(vel=0.5), t, 0.35 * g, 0.3, 0.1)
        s.note(pluck(ch[int(b * 2) % len(ch)] + 12, 0.15), t, 0.2 * g, 0.3 * np.sin(b * 2.1), 0.35)
        if b % 4 == 0:
            for j, n in enumerate(ch[:3]): s.note(marimba(n + 12, 0.3, 0.7), t, 0.18 * g, -0.3 + 0.3 * j, 0.35)
        b += 0.5


def court(b0, b1, g=1.0, chords=('Dm', 'Gm', 'A7', 'Dm')):
    """the courtroom: cello plucks on one and three, violins plucking a sly figure on the off-beats"""
    b = b0
    while b < b1 - 1e-9:
        bar = int(b // 4); root, fifth, ch = CRT[chords[bar % len(chords)]]; t = at(b); ib = b % 4
        if ib in (0, 2): s.note(pizz_str(root if ib == 0 else fifth, 'cello', 0.8), t, 0.6 * g, -0.25, 0.25)
        if b % 1 == 0.5: s.note(pizz_str(ch[int(b * 2) % 3] + (12 if ib == 3.5 else 0), 'violin', 0.6), t, 0.42 * g, 0.25, 0.25)
        if ib == 1: s.note(pizz_str(ch[0] - 12, 'viola', 0.5), t, 0.35 * g, 0.05, 0.25)
        b += 0.5


def low_hit(t, g=1.0):
    """a solemn verdict: timpani and bass drum on D, low brass, a deep bell"""
    s.note(timpani(38, 2.6, 1.0), t, 0.7 * g, -0.15, 0.4); s.note(bass_drum(1.0), t, 0.6 * g, 0, 0.3)
    for n in (38, 45, 50): s.note(trombone(n, 1.8, 0.75, a=0.02), t, 0.32 * g, 0, 0.45)       # weight you can hear, not 37 Hz
    s.note(cello(38, 1.8, 0.8), t, 0.4 * g, -0.2, 0.4); s.note(tower_bell(50, 4.0, 0.9), t, 0.3 * g, 0.2, 0.5)


def tape(t0, d, g=1.0, n=1, fade=0.0):
    for i in range(n):
        x = printer(d, 36 + 9 * i, seed=20 + i)
        if fade: x = x * np.minimum(1, np.arange(len(x)) / (fade * SR)) ** 2
        s.fx(x, t0 + 0.05 * i, 0.22 * g, -0.4 + 0.4 * i, 0.05)
def page(): return over(card() * 0.4, noise(0.12, 1500, 7000) * np.exp(-tv(0.12) * 35) * np.minimum(1, tv(0.12) / 0.01) * 0.25)
def squeak(f=2800): t = tv(0.6); ff = f * (1 + 0.04 * np.sin(2 * np.pi * 31 * t)); return (np.sin(2 * np.pi * np.cumsum(ff) / SR) * 0.5 + noise(0.6, 1500, 6000) * 0.3) * np.minimum(1, t / 0.006) * (1 - t / 0.6) ** 0.5 * 0.12
def drawer(): return over(knock(0.9, 260), coin_clink(1800, 0.7), noise(0.25, 1500, 6000) * np.exp(-tv(0.25) * 14) * 0.15, boing(240, 0.4) * 0.3)
def jangle(seed=3):
    g = np.random.default_rng(seed); return over(*[pad(coin_clink(g.uniform(3500, 6000), g.uniform(0.25, 0.5)), g.uniform(0, 0.35)) for _ in range(6)])
def lock_click(): return over(click() * 1.2, knock(0.9, 2100) * 0.7, pad(click() * 0.8, 0.009), pad(tone(3520, 0.02, (1, 0.3), 0.001, 0.6, decay=6) * 0.25, 0.01))


# ── 1 · Brussels: the emblem pops; twelve stars light on a rising glockenspiel; the keynote groove; the
# order drops and lands on the search bar; the tape of searches runs through the whole shot
s.fx(over(card() * 0.5, tag_pop(800)), 0.05, 0.7, 0.0)
for i, n in enumerate((86, 88, 90, 91, 93, 95, 97, 98, 100, 102, 103, 105)): s.note(glock(n, 0.3, 0.9), 0.25 + 0.09 * i, 0.24, -0.5 + i / 11, 0.4)   # short, so each star counts
for j, n in enumerate((62, 66, 69, 73)): s.note(supersaw(n, 1.2, a=0.6, r=0.8, cut=2200, seed=j), 1.24, 0.08, -0.3 + 0.2 * j, 0.5)
keynote(3, 15)
s.fx(sweep(noise(1.4, 300), 1500, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * tv(1.4))) * np.sin(np.pi * tv(1.4) / 1.4) * 0.08, 1.55, 0.9, 0.2)
s.fx(over(card(), thump() * 0.35), 2.95, 0.6, 0.1); s.fx(boing(300, 0.3) * 0.25, 2.97, 0.6, 0.1)
tape(0.0, CUT[1] + 0.3, fade=1.6)                                                        # under the stars only once they are lit

# ── 2 · the court: pizzicato from the cut; the briefcase hops up nine steps on rising plucks; the speech
# card unrolls; IRREVERSIBLE HARM lands on the solemn low hit
for n, inst in ((38, 'cello'), (65, 'violin'), (69, 'violin'), (74, 'violin')): s.note(pizz_str(n, inst, 0.9), CUT[1], 0.5, 0.0, 0.3)
s.note(timpani(38, 1.4, 0.5), CUT[1], 0.4, -0.15, 0.35)
court(15.5, 16.75)
for i, (t, n) in enumerate(zip((7.21, 7.48, 7.74, 8.01, 8.28, 8.55, 8.82, 9.08, 9.35), (62, 64, 65, 67, 69, 70, 73, 74, 76))):
    s.note(pizz_str(n, 'violin', 0.75), t, 0.5, 0.2, 0.25); s.fx(knock(0.4, 240), t, 0.6, 0.1)
court(22, 24.2, 0.7)
s.fx(sweep(noise(0.8, 300), 1000, 7000) * np.sin(np.pi * tv(0.8) / 0.8) * 0.15, 9.64, 0.9, 0.1)
low_hit(10.40, 0.7)
court(27, 30, 0.6)

# ── 3 · the law book: the cover swings open and lands; three pages; the long push-in on bowed strings and
# a rise; the gold line draws itself — the shot's hit
court(30, 35, 0.75)
s.fx(sweep(noise(0.9, 80), 300, 2000) * np.sin(np.pi * tv(0.9) / 0.9) * 0.3, 13.21, 0.9, -0.1); s.fx(thump() * 0.6, 13.90, 0.8, -0.1)
for t in (14.11, 14.38, 14.65): s.fx(page(), t, 0.9, 0.2, 0.15)
for n, fn in ((38, cello), (57, viola), (69, violin)):
    x = fn(n, 2.5, 0.7, False, 5); x = x * np.linspace(0.15, 1.0, len(x)) ** 1.5             # bowed, swelling with the push-in
    s.note(x, 15.16, 0.55, 0.0, 0.4)
s.lead_in(15.80, 0.6, 0.18, gap=0.03)
s.fx(squeak(2800), 15.80, 0.9, -0.2)
for n, inst in ((38, 'cello'), (62, 'violin'), (65, 'violin'), (74, 'violin')): s.note(pizz_str(n, inst, 1.0), 15.80, 0.55, 0.0, 0.3)
s.note(timpani(38, 1.2, 0.6), 15.80, 0.45, -0.15, 0.35); s.note(glock(98, 1.2, 0.7), 15.80, 0.25, 0.3, 0.4)
court(39, 45, 0.75)

# ── 4 · the cabinet: a low swell as the camera pulls back on its size, three tapes feeding it; then nine
# drawers burst, one per eighth, on climbing plucks
s.note(cello_hold(38, 2.9, (0.15, 0.5, 0.9)), CUT[3], 0.8, -0.2, 0.4); s.note(timp_roll(38, 2.6, 0.03, 0.5, seed=4), CUT[3] + 0.1, 0.4, -0.1, 0.35)
tape(CUT[3], CUT[4] - CUT[3] + 0.2, 1.0, 3)
for i, (t, n) in enumerate(zip((22.24, 22.50, 22.77, 23.04, 23.31, 23.57, 23.84, 24.11, 24.38), (50, 53, 57, 62, 65, 69, 74, 77, 81))):
    s.fx(drawer(), t, 0.8, -0.6 + 0.15 * i, 0.15); s.note(pizz_str(n, 'cello' if n < 55 else 'violin', 0.85), t, 0.45, -0.6 + 0.15 * i, 0.25)
court(57.5, 60, 0.6, ('A7',))

# ── 5 · the scale: Doodle's card drops into the left pan and tips the beam (a low pluck, a creak); the EU's
# drops into the right; the beam rocks ever smaller on a two-note see-saw — undecided, nothing resolves
s.fx(sweep(noise(0.42, 300), 3000, 800) * np.sin(np.pi * tv(0.42) / 0.42) * 0.1, 26.37, 0.9, -0.4)
s.fx(over(knock(0.8, 330), thump() * 0.3), 26.79, 0.9, -0.4); s.fx(creak(0.9) * 0.6, 26.85, 0.7, -0.2); s.note(pizz_str(38, 'cello', 0.9), 26.79, 0.6, -0.3, 0.3)
s.fx(sweep(noise(0.42, 300), 3000, 800) * np.sin(np.pi * tv(0.42) / 0.42) * 0.1, 28.51, 0.9, 0.4)
s.fx(over(knock(0.8, 330), thump() * 0.3), 28.93, 0.9, 0.4); s.fx(creak(0.8) * 0.5, 29.0, 0.6, 0.2)
for k in range(5):
    t = 28.93 + k * 0.52; s.note(pizz_str(57 if k % 2 == 0 else 64, 'violin', 0.85 - 0.12 * k), t, 0.5, 0.4 if k % 2 == 0 else -0.4, 0.3)
    s.fx(rim(0.3 - 0.04 * k), t, 0.4, 0.4 if k % 2 == 0 else -0.4)

# ── 6 · the lock: it swings in jangling; CLICK — and the keynote's glossy chord, as if it were a launch;
# then a pencil copying, the tape, a little photocopier behind the glass; one pluck for the last line
s.fx(sweep(noise(0.43, 300), 800, 4000) * np.sin(np.pi * tv(0.43) / 0.43) * 0.12, 32.19, 0.9, -0.4); s.fx(jangle(), 32.30, 0.7, -0.3)
T_CLICK = 32.73
s.fx(lock_click(), T_CLICK, 0.4, 0.0, 0.2)                                                  # crisp, not a spike
for j, n in enumerate((62, 66, 69, 73)): s.note(marimba(n + 12, 0.5, 0.8), T_CLICK + 0.02, 0.22, -0.3 + 0.2 * j, 0.45)
for j, n in enumerate((62, 66, 69, 73, 76)): s.note(supersaw(n, 0.8, a=0.05, r=1.0, cut=3000, seed=j), T_CLICK + 0.02, 0.06, -0.3 + 0.15 * j, 0.5)
s.note(sparkle(86), T_CLICK + 0.05, 0.25, 0.2, 0.5)
s.fx(pencil(END - T_CLICK + 0.3), T_CLICK + 0.15, 0.9, 0.2); tape(CUT[5], END - CUT[5] + 0.3, 0.8)
s.fx(copier(END - T_CLICK), T_CLICK + 0.2, 0.7, 0.4)
s.note(pluck(74, 0.3), 34.74, 0.18, 0.0, 0.4)

s.render(str(Path(__file__).with_name('配乐_irr_m14.wav')), 37.0, tau=0.6)
