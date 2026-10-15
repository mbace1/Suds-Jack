#!/usr/bin/env python3
"""Score for "Irreversible" v2 (Doodle family, papercut, 33.2 s) — the re-cut (SOUND.md).

    uv run --with numpy --with soundfile python 音频/synth_irr2.py

Owner, 15 Oct 2026: "needs clarity and directness". The same scenes in story order, the scale shot
gone: the CABINET (0), the EU ORDER (6.43), the COURT (12.86), the LAW book (19.29), the LOCK
(25.71–33.2, fourteen picture beats). Every scene's events keep their LOCAL times from
plan/irr-EVENTS.md, so each is the v1 score's (synth_irr.py) moved by its shot's offset; the
instruments, the room and the two registers are v1's.

The glossy KEYNOTE in D major at 140 runs from the first frame: the cabinet is shown off like a
product — a low supersaw swell as the camera pulls back, then nine drawers burst on climbing plucks
over the groove. The EU's twelve stars light on the rising glockenspiel in a bar of their own, and the
groove comes back for the envelope. At the court it turns into COURTROOM PIZZICATO in D minor
(12.86), with v1's steps, low hit on "IRREVERSIBLE HARM", law book and gold line. The padlock clicks
onto the keynote's glossy chord; one pluck for the punch ("…from everyone but Doodle.", 28.71), and
then the last four seconds breathe: the pencil and the tape sink back, the little photocopier keeps
whirring behind the glass, and it all fades out by 33.2.
"""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfseries import *

END2 = 33.2                                                              # the v2 picture (成片_irr2.mp4)
O_CAB, O_ORD, O_CRT, O_LAW, O_LOCK = -CUT[3], CUT[1], CUT[1], CUT[1], -CUT[1]   # v1 time + offset = v2 time


class Court(Score):
    BPM = 140
    VERB = dict(t60=1.5, lo=200, hi=8000, pre=0.02, g=0.28, seed=101)     # marble: a keynote stage, a court
    GLUE = dict(thresh=-17.0, ratio=2.0)
    EQ = dict(fc=3000.0, db=1.0, hp=35.0)


s = Court(dur=END2 + 0.5); B = s.B
KEY = {'D': (50, (62, 66, 69, 73, 76)), 'Bm7': (47, (62, 66, 69, 71, 74)), 'Gmaj7': (43, (62, 66, 67, 71, 74)), 'A': (45, (61, 64, 69, 73, 76))}
CRT = {'Dm': (38, 45, (65, 69, 74)), 'Gm': (43, 38, (67, 70, 74)), 'A7': (45, 40, (67, 69, 73)), 'Bb': (46, 41, (65, 70, 74))}
def at(b): return b * B                                                  # the 140 grid runs from 0: every cut is on it (15 beats a shot)


def keynote(b0, b1, g=1.0, arp=True):
    """the launch groove: a soft kick on every beat, hats on the off-beats, the pluck arpeggio in eighths
    and marimba on each bar (arp=False leaves both to the drawers), the sub on the roots"""
    PROG = ['D', 'Bm7', 'Gmaj7', 'A']
    b = b0
    while b < b1 - 1e-9:
        bar = int(b // 4); root, ch = KEY[PROG[bar % 4]]; t = at(b)
        if b % 1 == 0: s.note(kick_tight(0.6), t, 0.4 * g, 0, 0); s.note(sub_bass(root - 12, 0.3), t, 0.3 * g, 0, 0)
        if b % 1 == 0.5: s.note(hat(vel=0.5), t, 0.35 * g, 0.3, 0.1)
        if arp: s.note(pluck(ch[int(b * 2) % len(ch)] + 12, 0.15), t, 0.2 * g, 0.3 * np.sin(b * 2.1), 0.35)
        if arp and b % 4 == 0:
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
    for n in (38, 45, 50): s.note(trombone(n, 1.8, 0.75, a=0.02), t, 0.32 * g, 0, 0.45)
    s.note(cello(38, 1.8, 0.8), t, 0.4 * g, -0.2, 0.4); s.note(tower_bell(50, 4.0, 0.9), t, 0.3 * g, 0.2, 0.5)


def tape(t0, d, g=1.0, n=1, fade=0.0, out=0.0, shape=None):
    """the paper tape of searches (n tapes); fade in over `fade`, out over `out`, or under any `shape`(t)"""
    for i in range(n):
        x = printer(d, 36 + 9 * i, seed=20 + i); tt = np.arange(len(x)) / SR
        if fade: x = x * np.minimum(1, tt / fade) ** 2
        if out: x = x * np.clip((d - tt) / out, 0, 1)
        if shape is not None: x = x * shape(t0 + tt)
        s.fx(x, t0 + 0.05 * i, 0.22 * g, -0.4 + 0.4 * i, 0.05)
def page(): return over(card() * 0.4, noise(0.12, 1500, 7000) * np.exp(-tv(0.12) * 35) * np.minimum(1, tv(0.12) / 0.01) * 0.25)
def squeak(f=2800): t = tv(0.6); ff = f * (1 + 0.04 * np.sin(2 * np.pi * 31 * t)); return (np.sin(2 * np.pi * np.cumsum(ff) / SR) * 0.5 + noise(0.6, 1500, 6000) * 0.3) * np.minimum(1, t / 0.006) * (1 - t / 0.6) ** 0.5 * 0.12
def drawer(): return over(knock(0.9, 260), coin_clink(1800, 0.7), noise(0.25, 1500, 6000) * np.exp(-tv(0.25) * 14) * 0.15, boing(240, 0.4) * 0.3)
def jangle(seed=3):
    g = np.random.default_rng(seed); return over(*[pad(coin_clink(g.uniform(3500, 6000), g.uniform(0.25, 0.5)), g.uniform(0, 0.35)) for _ in range(6)])
def lock_click(): return over(click() * 1.2, knock(0.9, 2100) * 0.7, pad(click() * 0.8, 0.009), pad(tone(3520, 0.02, (1, 0.3), 0.001, 0.6, decay=6) * 0.25, 0.01))


# ── 1 · the CABINET, shown off like a product: the keynote from the first frame; a low glossy swell as the
# camera pulls back on its size (three tapes feeding it); then nine drawers burst, one per eighth, on
# climbing plucks over the groove (its arpeggio steps aside for them)
keynote(0, 6.5); keynote(6.5, 12.5, arp=False); keynote(12.5, 15)
for j, n in enumerate((38, 45, 50, 57)):
    x = supersaw(n, 2.9, a=1.8, r=0.6, cut=900 + 300 * j, seed=10 + j); s.note(x, 0.05, 0.08, -0.3 + 0.2 * j, 0.4)
x = sub_bass(38, 2.6); s.note(x * np.linspace(0.3, 1.0, len(x)), 0.05, 0.25, 0, 0)
tape(0.0, CUT[1] + 0.3, 1.0, 3, out=0.5)
for i, (t, n) in enumerate(zip((22.24, 22.50, 22.77, 23.04, 23.31, 23.57, 23.84, 24.11, 24.38), (50, 54, 57, 62, 66, 69, 74, 78, 81))):
    t += O_CAB; s.fx(drawer(), t, 0.8, -0.6 + 0.15 * i, 0.15)
    s.note(pluck(n, 0.2), t, 0.3, -0.6 + 0.15 * i, 0.3); s.note(marimba(n + 12, 0.2, 0.8), t, 0.12, -0.6 + 0.15 * i, 0.3)

# ── 2 · the EU ORDER: the emblem pops; twelve stars light on a rising glockenspiel in a bar of their own;
# the groove returns for the envelope, which lands SHARE DATA on the search bar; the tape runs again
s.fx(over(card() * 0.5, tag_pop(800)), 0.05 + O_ORD, 0.7, 0.0)
def twinkle(): t = tv(0.012); return soft(noise(0.012), 4000, 11000) * np.exp(-t * 500) * 0.5
for i, n in enumerate((86, 88, 90, 91, 93, 95, 97, 98, 100, 102, 103, 105)):          # v1's stars, each with a twinkle on its
    t = 0.25 + 0.09 * i + O_ORD; s.note(glock(n, 0.3, 0.9), t, 0.24, -0.5 + i / 11, 0.4)  # strike: here the groove's tail is under them
    s.fx(twinkle(), t, 0.22, -0.5 + i / 11)
for j, n in enumerate((62, 66, 69, 73)): s.note(supersaw(n, 1.2, a=0.6, r=0.8, cut=2200, seed=j), 1.24 + O_ORD, 0.08, -0.3 + 0.2 * j, 0.5)
keynote(18, 30)
s.fx(sweep(noise(1.4, 300), 1500, 6000) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * tv(1.4))) * np.sin(np.pi * tv(1.4) / 1.4) * 0.08, 1.55 + O_ORD, 0.9, 0.2)
s.fx(over(card(), thump() * 0.35), 2.95 + O_ORD, 0.6, 0.1); s.fx(boing(300, 0.3) * 0.25, 2.97 + O_ORD, 0.6, 0.1)
tape(CUT[1], CUT[2] - CUT[1] + 0.3, fade=1.6, out=0.5)

# ── 3 · the COURT: pizzicato from the cut; the briefcase hops up nine steps on rising plucks; the speech
# card unrolls; IRREVERSIBLE HARM lands on the solemn low hit
for n, inst in ((38, 'cello'), (65, 'violin'), (69, 'violin'), (74, 'violin')): s.note(pizz_str(n, inst, 0.9), CUT[2], 0.5, 0.0, 0.3)
s.note(timpani(38, 1.4, 0.5), CUT[2], 0.4, -0.15, 0.35)
court(30.5, 31.75)
for i, (t, n) in enumerate(zip((7.21, 7.48, 7.74, 8.01, 8.28, 8.55, 8.82, 9.08, 9.35), (62, 64, 65, 67, 69, 70, 73, 74, 76))):
    s.note(pizz_str(n, 'violin', 0.75), t + O_CRT, 0.5, 0.2, 0.25); s.fx(knock(0.4, 240), t + O_CRT, 0.6, 0.1)
court(37, 39.2, 0.7)
s.fx(sweep(noise(0.8, 300), 1000, 7000) * np.sin(np.pi * tv(0.8) / 0.8) * 0.15, 9.64 + O_CRT, 0.9, 0.1)
low_hit(10.40 + O_CRT, 0.7)
court(42, 45, 0.6)

# ── 4 · the LAW book: the cover swings open and lands; three pages; the push-in on bowed strings; the gold
# line draws itself — the shot's hit
court(45, 47, 0.75); court(48, 50, 0.75)                                          # a beat's hole for the cover to land in
wh = sweep(noise(0.69, 80), 300, 2000) * np.sin(np.pi * tv(0.69) / 0.8) ** 1.5 * 0.3; wh[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
s.fx(wh, 13.21 + O_LAW, 0.9, -0.1)                                                    # the board swinging over — it stops where it lands
s.fx(over(thump() * 0.7, knock(0.8, 200), card() * 0.7), 13.90 + O_LAW, 0.8, -0.1)
for t in (14.11, 14.38, 14.65): s.fx(page(), t + O_LAW, 0.9, 0.2, 0.15)
for n, fn in ((38, cello), (57, viola), (69, violin)):
    x = fn(n, 2.5, 0.7, False, 5); x = x * np.linspace(0.15, 1.0, len(x)) ** 1.5
    s.note(x, 15.16 + O_LAW, 0.55, 0.0, 0.4)
s.lead_in(15.80 + O_LAW, 0.6, 0.18, gap=0.03)
s.fx(squeak(2800), 15.80 + O_LAW, 0.9, -0.2)
for n, inst in ((38, 'cello'), (62, 'violin'), (65, 'violin'), (74, 'violin')): s.note(pizz_str(n, inst, 1.0), 15.80 + O_LAW, 0.55, 0.0, 0.3)
s.note(timpani(38, 1.2, 0.6), 15.80 + O_LAW, 0.45, -0.15, 0.35); s.note(glock(98, 1.2, 0.7), 15.80 + O_LAW, 0.25, 0.3, 0.4)
court(54, 60, 0.75)

# ── 5 · the LOCK: it swings in jangling; CLICK — the keynote's glossy chord, as if it were a launch. A pencil
# copies the tape, the tape runs, a little photocopier whirrs behind the glass. One pluck for the punch, then
# four seconds to breathe: pencil and tape sink back, the copier keeps whirring, and it all fades by 33.2
s.fx(sweep(noise(0.43, 300), 800, 4000) * np.sin(np.pi * tv(0.43) / 0.43) * 0.12, 32.19 + O_LOCK, 0.9, -0.4); s.fx(jangle(), 32.30 + O_LOCK, 0.7, -0.3)
T_CLICK, T_PUNCH = 32.73 + O_LOCK, 28.71                                  # 26.30; the punch line appears (subs/irr_caps.py)
s.fx(lock_click(), T_CLICK, 0.4, 0.0, 0.2)
for j, n in enumerate((62, 66, 69, 73)): s.note(marimba(n + 12, 0.5, 0.8), T_CLICK + 0.02, 0.22, -0.3 + 0.2 * j, 0.45)
for j, n in enumerate((62, 66, 69, 73, 76)): s.note(supersaw(n, 0.8, a=0.05, r=1.0, cut=3000, seed=j), T_CLICK + 0.02, 0.06, -0.3 + 0.15 * j, 0.5)
s.note(sparkle(86), T_CLICK + 0.05, 0.25, 0.2, 0.5)
def sink(t): return 1 - 0.3 * np.clip((t - (T_PUNCH + 0.3)) / 1.2, 0, 1)       # the breath: pencil and tape step back
x = pencil(END2 - T_CLICK + 0.3); s.fx(x * sink(T_CLICK + 0.15 + np.arange(len(x)) / SR), T_CLICK + 0.15, 0.9, 0.2)
tape(CUT[4], END2 - CUT[4] + 0.3, 0.8, shape=sink)
s.fx(copier(END2 - T_CLICK), T_CLICK + 0.2, 1.0, 0.4)
s.note(pluck(74, 0.3), T_PUNCH, 0.18, 0.0, 0.4)
for j, n in enumerate((50, 57, 62, 66)):                                     # one long glossy breath under the punch
    x = supersaw(n, END2 - T_PUNCH - 0.4, a=1.2, r=0.6, cut=1400, seed=30 + j); s.note(x, T_PUNCH + 0.1, 0.05, -0.3 + 0.2 * j, 0.5)

s.render(str(Path(__file__).with_name('配乐_irr2_m14.wav')), END2 - 0.7, tau=0.5, end=END2)
