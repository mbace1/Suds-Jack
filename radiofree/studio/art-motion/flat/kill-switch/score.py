"""Kill Switch v2 — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds (sfx.py)
against the film's events (film.js → events.json, any language). One comparison, so the sound keeps two voices apart:
the toaster's side gets the good chip and a full chord, the AI's side gets the dull ones. As in the pilot, the one joke
is in the sound: the finger taps the kill switch and the music STOPS (a marked quiet span), and comes back after it.

    uv run --with numpy --with soundfile python flat/kill-switch/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, slap, ripple, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
quiet = [(q['t0'], q['t1']) for q in EV['quiet']]

# ---- the music: the bed from the landing to the tap, a second of silence, back at half strength, full again for the answer
bed(s, EV['land'], EV['tap'] + 0.02, quiet)
bed(s, quiet[0][1], EV['back'], quiet, level=1)
bed(s, EV['back'], END - 0.6, quiet)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')

# ---- 1 · both leaflets rise onto the desk; the toaster's eight warnings pop in; the two counters land, 8 then 0
s.fx(whoosh(d=(EV['land'] - EV['enter']) / 0.8), EV['enter'], 0.8, name='leaflets rise (arrive as they land)')
s.fx(foley('paper', 'drop'), EV['land'], 0.8, -0.35, name='toaster leaflet lands'); s.fx(foley('paper', 'drop', 0.8), EV['land'] + 0.15, 0.7, 0.35, name='AI leaflet lands')
for i, tp in enumerate(EV['pictTimes']): s.fx(pop(1.0 + i * 0.06), tp, 0.42, -0.6 + (i % 4) * 0.12, name=f'pictogram {i + 1}'); accent(s, tp, EV['land'], 0.15, name=f'pictogram note {i + 1}')
s.fx(pop(0.8), EV['picts'] + 0.75, 0.45, -0.35, name='counter 8'); s.fx(chip(True), EV['picts'] + 0.78, 0.3, -0.35, name='8 warnings')
s.fx(tap(dull=True), EV['picts'] + 0.95, 0.7, 0.35, name='counter 0: a dull one')
# ---- the camera moves, each on its own beat
for k in ('toToaster', 'toAI', 'toNote'): s.fx(whoosh('short', 'in'), EV[k], 0.5, -0.2 if k == 'toToaster' else 0.2, at=EV[k], name=f'camera {k}')
# ---- 2 · the toaster: switch 1 jams, switch 2 takes over
for i in range(3): s.fx(foley('card', 'tap', 0.7), EV['jam'] + i * 0.06, 0.45, -0.4, name='switch 1 rattles')
s.fx(chip(False), EV['jam'], 0.55, -0.4, name='switch 1 jams'); s.fx(chip(True), EV['flip2'], 0.6, 0.2, name='switch 2 off')
# ---- 3 · the AI's side: nothing on it; VOLUNTARY slaps across the empty warnings, on the word
s.fx(slap(), EV['vol'], 0.9, 0.3, name='VOLUNTARY'); s.fx(stinger('deadpan'), EV['vol'] + 0.04, 0.4, name='a deadpan button')
# ---- 4 · the kill switch is a sticky note; the tap does nothing, and the music stops
s.fx(foley('paper', 'flip'), EV['slap'] - 0.25, 0.4, 0.3, name='the note falls'); s.fx(slap(), EV['slap'], 0.85, 0.3, name='sticky note')
s.fx(tap(dull=True), EV['tap'], 1.0, 0.3, name='the tap: nothing happens'); s.fx(ripple(), EV['tap'] + 0.02, 0.25, 0.3, name='tap ring')
# ---- 5 · both again: the backup switch returns on the left, the note comes forward on the right
s.fx(whoosh('long', 'out'), EV['back'], 0.6, name='camera pulls back')
s.fx(chip(True), EV['back'] + 0.6, 0.38, -0.4, name='switch 2 returns')
s.fx(foley('paper', 'slide'), EV['back'] + 0.5, 0.45, 0.4, name='the note comes forward')
for w in EV['words']:
    if w['pop'] and w['caption'] not in ('ai', 'last'): s.fx(pop(1.6), w['t'] + 0.04, 0.4, name=f'pop word {w["w"]}'); accent(s, w['t'] + 0.04, EV['land'], 0.2, name=f'pop note {w["w"]}')
s.fx(foley('paper', 'tap', 0.9), EV['lastPop'], 0.6, 0.4, name='the note nods on its word'); accent(s, EV['lastPop'], EV['land'], 0.22, name='the answer')
motif(s, EV['back'] + 0.2, g=0.4)
sting(s, END - 0.6)

beats = ['enter', 'land', 'picts', 'toToaster', 'jam', 'flip2', 'toAI', 'vol', 'toNote', 'slap', 'tap', 'back', 'lastPop']
cues = [(k, EV[k]) for k in beats] + [(f'pict{i}', t) for i, t in enumerate(EV['pictTimes'])] + \
       [(f'word {w["w"]}', w['t'] + 0.04) for w in EV['words'] if w['pop'] and w['caption'] not in ('ai', 'last')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
