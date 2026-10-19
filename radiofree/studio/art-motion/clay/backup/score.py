"""Backup Mode (Toko Slomo, Kallio Noir) — the cue sheet. Not the house bed: a slow noir at 72 BPM in D minor, brushes
on a snare, an upright bass walking, felt-piano minor ninths and a breathy tenor line, all in a dark long room, with
rain on the glass, the HOTELLI sign humming at 50 Hz and a tap dripping somewhere in the flat. Against the picture
(film.js → events.json, any language): on "down" the strip's two-note goodbye; the base folds him up on a motor whine
and stops with a thump on "flat"; outside, the steam hisses up on "heating"; the phone buzzes twice and chimes on
"backup mode"; on the floor the cat purrs, and the last line lands on the tenor's long note over a held chord.
Toko's rules: no station sting, no sign-off; the chord rings out under his card.

    uv run --with numpy --with soundfile python clay/backup/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from sfx import whoosh, WHOOSH
from rfsound import (SR, tv, hz, noise, soft, upright, felt_piano, brush_tap, brush_swish, room, rain, vinyl, whir, thump,
                     creak, ui_tick, glide, hum, rim, lamp_click)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


class NOIR:
    BPM = 72
    VERB = dict(t60=1.9, lo=140, hi=3800, pre=0.022, g=0.32, seed=72)    # a long dark room
    GLUE = dict(thresh=-20.0, ratio=1.8)
    EQ = dict(fc=5200.0, db=-2.5, hp=34.0)                                # the top rolled off: a late-night radio


s = Session(END + 0.5, NOIR); B = 60 / NOIR.BPM


# ── the instruments the house kit does not have
def tenor(m, d, vel=0.7, scoop=0.0):
    """a breathy tenor: a reedy stack of harmonics, a scoop up into the note, vibrato that arrives late, breath on top"""
    t = tv(d + 0.15); f = hz(m) * (1 - scoop * np.exp(-t * 14)) * (1 + 0.007 * np.sin(2 * np.pi * 5.1 * t) * np.clip((t - 0.25) / 0.4, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin((k + 1) * ph) for k, a in enumerate([1, 0.8, 0.62, 0.46, 0.33, 0.24, 0.16, 0.1, 0.06]))
    e = np.minimum(1, t / 0.06) * np.clip((d + 0.15 - t) / 0.15, 0, 1) * (0.85 + 0.15 * np.exp(-t * 3))
    y = np.tanh(x * 0.32 * (0.6 + vel)) * e + soft(noise(d + 0.15, 900, 6000), None, 5000) * 0.06 * e
    return soft(y, 120, 3200) * 0.6 * vel


def drip():
    t = tv(0.14); f = 1500 * np.exp(-t * 22) + 620; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 34) * 0.45


def buzz(d=0.42):
    t = tv(d); return (np.sin(2 * np.pi * 165 * t) + 0.35 * np.sign(np.sin(2 * np.pi * 330 * t))) * (np.sin(2 * np.pi * 27 * t) > 0) * np.sin(np.pi * t / d) ** 0.5 * 0.3


def hiss(d=1.6):
    t = tv(d); return soft(noise(d, 2200, 10000), None, 7000) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * 0.5


def purr(d):
    t = tv(d); x = soft(noise(d, 40, 400), None, 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 2.6) ** 2)
    return x / max(1e-9, np.abs(x).max()) * 0.25


def chord(t, notes, d=2.5, vel=0.4, g=0.26, name='piano'):
    for j, n in enumerate(notes): s.note(felt_piano(n, d, vel), t + 0.015 * j, g, -0.35 + 0.17 * j, 0.4, stem='keys', name=name)


# ── the room under everything: rain, the sign's hum, a record's surface, a tap that will not stop
s.sfx.bed(room(END + 0.5, 1.2), 600); s.sfx.bed(vinyl(END + 0.5, 3.0, 0.7), 300)
s.sfx.bed(rain(END + 0.5, 10, 1.3), 500)
s.fx(hum(50, END + 0.4) * 0.5, 0, 0.18, -0.4, name='the sign hums')
for k, t in enumerate(np.arange(0.9, END - 0.5, 1.9)): s.fx(drip(), t + 0.07 * np.sin(k * 2.1), 0.22, 0.55, name='the tap')

# ── the music: D minor, one chord a bar, walking bass under brushes; it thins for the phone and for the floor
CH = [('Dm9', 38, (53, 57, 60, 64)), ('Bbmaj7', 34, (50, 53, 57, 62)), ('Gm9', 31, (50, 53, 57, 58)), ('A7b9', 33, (49, 55, 58, 61)),
      ('Dm9', 38, (53, 57, 60, 64)), ('Bbmaj7', 34, (50, 53, 57, 62)), ('Em7b5', 28, (50, 55, 58, 62)), ('Dm9', 38, (53, 57, 60, 64))]
WALK = {38: [38, 41, 43, 44], 34: [34, 38, 41, 33], 31: [31, 34, 38, 32], 33: [33, 37, 40, 37], 28: [28, 31, 34, 33]}
start = S[0] + 1.6
for bar in range(8):
    t0 = start + bar * 4 * B
    if t0 >= END - 1.0: break
    name, root, notes = CH[bar]
    level = 2 if S[1] - 0.1 <= t0 < S[3] else 1                                   # the full band only from the fold to the phone
    for b in range(4):
        tb = t0 + b * B
        if tb >= END - 0.9: break
        if level == 2 or b in (0, 2): s.note(upright(WALK[root][b] if level == 2 else root, B * 0.9, 0.8), tb, 0.5, -0.1, 0.15, stem='bass', name='bass')
        if level == 2: s.note(brush_tap(0.5 if b % 2 else 0.35), tb, 0.38, 0.3, 0.25, stem='drums', name='brush')
        s.note(brush_swish(B * 0.95, 0.5), tb, 0.3, 0.35, 0.3, stem='drums', name='swish')
    chord(t0 + (B * 1.5 if level == 2 else 0), notes, d=3 * B, vel=0.38 if level == 2 else 0.3, g=0.24)
chord(S[0] + 0.35, (50, 53, 57, 60, 64), d=2.4, vel=0.28, g=0.2, name='the open')                    # the window, the neon

# the tenor: a phrase over the fold and the street, answered on the floor; it never plays over a pop word's hit
PHRASE1 = [(0.0, 62, 2.5, 0.2), (2.5, 65, 1.0, 0.1), (3.5, 64, 0.5, 0), (4.0, 62, 1.5, 0), (5.5, 60, 2.0, 0.15)]
for bt, m, ln, sc in PHRASE1: s.note(tenor(m, ln * B * 0.95, 0.7, sc), S[1] + 0.5 * B + bt * B, 0.42, 0.15, 0.45, stem='tenor', name='tenor')
PHRASE2 = [(0.0, 69, 1.0, 0.1), (1.0, 67, 0.5, 0), (1.5, 65, 0.5, 0), (2.0, 64, 2.0, 0.12)]
for bt, m, ln, sc in PHRASE2: s.note(tenor(m, ln * B * 0.95, 0.65, sc), S[2] + 0.4 + bt * B, 0.36, 0.2, 0.5, stem='tenor', name='tenor')

# ── the picture's events
D = EV['down']
s.fx(lamp_click(), D - 0.02, 0.35, 0.3, at=D, name='"down": the strip clicks over')
for k, f in enumerate([1320, 880]): s.fx(glide(f, f * 0.94, 0.16), D + 0.02 + k * 0.17, 0.3, 0.3, name='its goodbye')
s.note(upright(26, 1.6, 0.9), D, 0.45, 0, 0.2, stem='bass', name='the floor drops out')
for k in range(6): s.fx(ui_tick(2600), D + 0.5 + k * 0.4, 0.08, 0.35, name='the spinner')
s.fx(whoosh('short', 'in'), S[1] - WHOOSH['short'] * 0.85, 0.2, 0, at=S[1], name='cut: wide on the bed')
f0, f1 = EV['fold0'], EV['fold1']
s.fx(creak(0.35), f0 - 0.05, 0.3, 0.1, at=f0, name='the base wakes'); s.fx(whir(85, 120, f1 - f0), f0, 0.55, 0.05, name='the motor folds him')
s.fx(soft(noise(f1 - f0, 60, 300), None, 200) * 0.6, f0, 0.25, 0, name='the motor, felt through the floor')
s.fx(thump(), f1, 0.45, 0, name='the base stops'); s.fx(creak(0.25), f1 + 0.05, 0.25, -0.1)
s.fx(rim(0.4), EV['look'], 0.3, -0.2, name='he turns to the lens')
s.fx(whoosh('short', 'in'), S[2] - WHOOSH['short'] * 0.85, 0.28, 0, at=S[2], name='cut: across the street')
s.fx(rain(S[3] - S[2], 30, 1.0), S[2], 0.6, 0.2, name='the street: more rain')
s.fx(hiss(2.6), EV['heat'] - 0.35, 0.32, 0.25, at=EV['heat'], name='"heating": the steam')
s.fx(whoosh('short', 'in'), S[3] - WHOOSH['short'] * 0.85, 0.22, 0, at=S[3], name='cut: the phone')
s.fx(glide(500, 900, 0.12), EV['wake'], 0.12, -0.2, name='the screen wakes')
for k in range(2): s.fx(buzz(), EV['notif'] + k * 0.55, 0.38, -0.2, at=EV['notif'] + k * 0.55, name='the phone buzzes')
s.fx(soft(noise(0.6, 30, 220), None, 160) * 0.8, EV['notif'], 0.2, -0.2, name='the stand rattles')
s.fx(whoosh('short', 'in'), S[4] - WHOOSH['short'] * 0.85, 0.2, 0, at=S[4], name='cut: the floor')
s.fx(purr(END - S[4]), S[4], 0.3, -0.15, name='the cat purrs')

# ── the pop words: a hit each, low and dark; the last lands on the tenor's long note over a held chord
SND = {'night': lambda t: chord(t, (38, 45, 50), d=1.4, vel=0.5, g=0.3, name='"down"'),
       'flat': lambda t: (chord(t, (34, 41, 46, 50), d=1.6, vel=0.5, g=0.28, name='"flat"'), s.note(tenor(65, 1.4, 0.7, 0.2), t, 0.38, 0.15, 0.45, stem='tenor', name='"flat": the tenor')),
       'heat': lambda t: chord(t, (43, 46, 50, 53), d=1.4, vel=0.48, g=0.28, name='"heating"'),
       'backup': lambda t: ((s.fx(glide(1568, 1568, 0.3), t, 0.3, -0.2, name='"backup mode": the chime'), s.fx(glide(2093, 2093, 0.3), t + 0.09, 0.18, -0.2)), chord(t, (45, 49, 52, 55), d=1.2, vel=0.4, g=0.22, name='"backup mode"')),
       'last': lambda t: (chord(t, (38, 45, 50, 53, 57, 64), d=END - t + 0.3, vel=0.42, g=0.3, name='"one of them": the last chord'),
                          s.note(upright(26, END - t, 0.85), t, 0.5, 0, 0.2, stem='bass', name='the last bass'),
                          s.note(tenor(62, END - t - 0.2, 0.62, 0.15), t + 0.02, 0.4, 0.15, 0.55, stem='tenor', name='the last note'))}
seen = set()
for w in EV['words']:
    if not w['pop']: continue
    t = w['t'] + 0.03
    if w['caption'] not in seen: seen.add(w['caption']); SND[w['caption']](t)
    else: s.note(brush_tap(0.6), t, 0.4, 0.3, 0.25, stem='drums', name=f'pop word: {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -2.5, why=f'caption {cp["id"]} reveal')

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + [(k, EV[k]) for k in ('down', 'fold0', 'fold1', 'look', 'heat', 'wake', 'notif')] + \
       [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.9, tau=0.6, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
