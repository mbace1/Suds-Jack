"""Not Yet Listed (RFH · Finland's data center register), 3D v1 — the cue sheet. Its own kit: ARCHIVE
(pipeline/sound/archive.py), first built for this film: a state archive in a basement.
  room  the strip light's hum and the ventilation, all the way through
  s1    five pins pressed into the map; the low pulse comes in
  s2    the steel drawer rolls in; the pins lift off the map and drop into it as cards; the cello drone joins
  s3    the lid comes down; the seal NOT PUBLIC is stamped on it (the music ducks under both)
  s4    the slot printer feeds out one sheet: the summary
  s5    back on the map: five holes; the bed stops and the motif is left hanging on the vibes, then the sting
  every pop word: the vibes motif from the chord under it

    uv run --with numpy --with soundfile python clay/register/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from rfsound import SR, press_stamp, printer, paper_slide, office_hum, vibes, cello_hold
from archive import Archive as K, runner, pin_in, card_drop, lid_shut, vent, pulse_bar, motif

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T['end']; s = Session(END + 0.5, K); B = K.B; BAR = 4 * B
STOP = T['holes']

# the room
s.fx(office_hum(END, 6), 0.0, 0.045, 0.2, wet=0.05, name="the strip light's hum")
s.fx(vent(END), 0.0, 0.5, -0.3, wet=0.1, name='the ventilation')

# the pins, the drawer, the cards, the lid, the seal, the sheet
for i in range(1, 6): s.fx(pin_in(i), T[f'pin{i}'], 0.2, -0.3 + 0.12 * i, wet=0.2, name=f'a pin into the map ({i})')
s.fx(runner(0.6), T['drawer'], 0.3, 0.35, wet=0.2, name='the drawer rolls in on its runners')
for i in range(1, 6): s.fx(card_drop(i), T[f'card{i}'], 0.19, 0.3, wet=0.2, name=f'a card drops into the drawer ({i})')
s.fx(lid_shut(), T['lid'], 0.42, 0.25, wet=0.25, name='the lid comes down')
s.duck(T['lid'] - 0.03, T['lid'] + 0.5, -3, attack=0.02, release=0.25, why='the lid')
s.fx(press_stamp(1.0, 7), T['seal'] - 0.004, 0.42, 0.2, wet=0.2, name='the seal: NOT PUBLIC')
s.duck(T['seal'] - 0.03, T['seal'] + 0.3, -3, attack=0.02, release=0.2, why='the seal')
s.fx(printer(0.85, 55), T['sheet'], 0.5, 0.25, wet=0.15, name='the slot printer feeds out the summary')
s.fx(paper_slide(0.5, 3), T['sheet'] + 0.5, 0.14, 0.25, wet=0.15, name='the sheet slides out')

# the bed: on the bar grid from 0 until the holes; the drone from s2
for i in range(int(np.ceil(END / BAR))):
    tb = i * BAR; ch = K.CHORDS[i % 4]
    if tb >= STOP - 0.2: break
    pulse_bar(s, tb, ch, g=0.05 if tb < T['s2'] - 0.1 else 0.06, drone=tb >= T['s2'] - 0.1)
# the end: the motif hangs on the iv with nothing after it
motif(s, T['who'] + 0.02, K.Dm, g=0.1, last_hold=END - T['who'] - 0.8)
s.note(cello_hold(K.Dm[0] + 12, END - T['who'] - 0.6, (0.5, 0.35, 0.0)), T['who'], 0.06, -0.2, 0.3, stem='strings', name='cello: D under it, fading')

# pops: the motif's first note, from the chord under it
seen = set()
for w in EV['words']:
    if not w['pop'] or w['caption'] == 'you' or w['caption'] in seen: continue
    seen.add(w['caption'])
    ch = K.CHORDS[int(w['t'] // BAR) % 4]
    s.note(vibes(ch[1][2] + 12 + 3, 1.4, 0.6), w['t'] + 0.01, 0.1, 0.2, 0.35, stem='keys', name=f'pop {w["w"]}')
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
