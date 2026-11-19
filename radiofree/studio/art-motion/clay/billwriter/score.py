"""Who Wrote the Bill? (RFH · Davis / Tucker County, W. Va.), 3D v1 — the cue sheet. Its own kit: CLERK
(pipeline/sound/clerk.py), first built for this film: a small-town clerk's office after hours.
  room  the strip light's hum and the wall clock, all the way through
  s1    a blank ordinance being typed: every letter a key, the carriage returning between lines; the trio comes in
  s2    the headings typed, each one met by the rubber stamp (the music ducks a little under each)
  s3    a push pin: the recorded line goes up on the board
  s4    the stapler, twice: the two denials
  s5    a new sheet slides in; the bill is typed; on DRAFTED BY: the typing stops and the trio stops with it.
        The punchline hangs on D7 (no answer), then the station's sting
  every pop word: one felt-piano note from the chord under it

    uv run --with numpy --with soundfile python clay/billwriter/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from rfsound import SR, felt_piano, upright, press_stamp, stapler, clock_tick, office_hum, paper_slide, platen_whoosh
from clerk import Clerk as K, typekey, space, ratchet, ding, pin, walk_bar, comp

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T['end']; s = Session(END + 0.5, K); B = K.B; BAR = 4 * B
STOP = EV['lines2'][-1][1]

# the room
s.fx(office_hum(END, 5), 0.0, 0.05, 0.2, wet=0.05, name="the strip light's hum")
for i, t in enumerate(np.arange(0.25, END - 0.3, 1.0)): s.fx(clock_tick(i % 2 == 1), t, 0.07, -0.55, wet=0.3, name='the wall clock')

# the typing: every letter a key; the carriage returns before every line but a sheet's first
def sheet(lines, until, tag):
    k = 0
    for li, (a, b, n) in enumerate(lines):
        if a >= until and until > 0: break
        if li > 0: s.fx(ratchet(2), a - 0.2, 0.16, 0.05, wet=0.15, name=f'{tag}: the carriage returns')
        for i in range(n):
            t = a + (b - a) * i / max(1, n); k += 1
            if (k * 7) % 11 == 3: s.fx(space(k), t, 0.12, 0.05, wet=0.12, name=f'{tag}: the space bar')
            else: s.fx(typekey(k, 0.75 + 0.25 * ((k * 5) % 3) / 2), t, 0.2, 0.05 + 0.04 * ((k % 3) - 1), wet=0.12, name=f'{tag}: a key')
        if n >= 18: s.fx(ding(), b + 0.02, 0.07, 0.2, wet=0.3, name=f'{tag}: the margin bell')
sheet(EV['lines1'], T['ret'], 'the ordinance')
sheet(EV['lines2'], 0, 'the bill')

# the stamps, the pin, the staples, the new sheet
for i in range(1, 6):
    s.fx(press_stamp(1.0, i), T[f'stamp{i}'] - 0.004, 0.42, 0.1, wet=0.18, name=f'the stamp: EXEMPT ({i})')
    s.duck(T[f'stamp{i}'] - 0.03, T[f'stamp{i}'] + 0.25, -3, attack=0.02, release=0.2, why='a stamp')
s.fx(pin(1), T['pin'], 0.3, -0.1, wet=0.2, name='a push pin: the recorded line goes up')
s.fx(stapler(), T['staple1'], 0.32, 0.2, wet=0.2, name="the stapler: the company's denial")
s.fx(stapler(), T['staple2'], 0.3, 0.25, wet=0.2, name="the stapler: the governor's office")
s.fx(paper_slide(0.5, 8), T['ret'] - 0.1, 0.14, 0.0, wet=0.15, name='the old sheet out, a new one in')
s.fx(platen_whoosh(0.12, 4), T['ret'] + 0.32, 0.18, 0.0, wet=0.15, name='the platen takes the new sheet')

# the trio: on the bar grid from 0, until DRAFTED BY:
for i in range(int(np.ceil(END / BAR))):
    tb = i * BAR; ch = K.CHORDS[i % 4]
    if tb >= STOP - 0.2: break
    walk_bar(s, tb, ch, g=0.055 if tb < T['s2'] else 0.065, brushes=tb >= BAR * 0.99)
    if tb >= T['s2'] - 0.1: comp(s, tb + B * 0.5, ch, g=0.05, d=B * 1.6)
# the punchline hangs: D7 with nothing after it
comp(s, T['who'] + 0.02, K.D7, g=0.09, d=END - T['who'] - 0.7, name='piano: D7, and nothing after it')
s.note(upright(38, 1.4, 0.7), T['who'] + 0.02, 0.1, -0.1, 0.12, stem='bass', name='upright: D under it')

# pops: one felt-piano note each (the punchline's is the D7 above)
for w in EV['words']:
    if not w['pop'] or w['caption'] == 'who': continue
    ch = K.CHORDS[int(w['t'] // BAR) % 4]
    s.note(felt_piano(ch[1][2] + 12, 0.9, 0.6), w['t'] + 0.01, 0.13, 0.15, 0.3, stem='keys', name=f'pop {w["w"]}')
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
