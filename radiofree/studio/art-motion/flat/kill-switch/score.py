"""Kill Switch, the full film — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's
sounds (sfx.py) against the film's events (film.js → events.json, any language). As in the pilot, the one joke is in
the sound: the finger taps the kill switch and the music STOPS (a marked quiet span), and comes back on the next move.
The washing machine gets the only machine in the score that is not a UI sound: a drum turning over.

    uv run --with numpy --with soundfile python flat/kill-switch/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, slap, ripple, foley, stinger, WHOOSH
from rfsound import noise, tv, soft, thump

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
quiet = [(q['t0'], q['t1']) for q in EV['quiet']]


def drum(d=1.6):
    """a washing machine's drum turning over: a low rumble that swells and settles, with the slosh in it"""
    import numpy as np
    t = tv(d); x = soft(noise(d, 40, 400), None, 300) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * t)) * np.sin(np.pi * t / d) ** 0.8
    return x / max(1e-9, abs(x).max()) * 0.7


# ---- the music: the bed from the landing to the tap, a second of silence, back at half strength, full again for the tableau
bed(s, EV['land'], EV['tap'] + 0.02, quiet)
bed(s, quiet[0][1], EV['back'], quiet, level=1)                             # back after the joke's second of silence, at half strength
bed(s, EV['back'], END - 0.6, quiet)                                          # the tableau: the full groove on its own downbeat
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')

# ---- the cues
s.fx(whoosh(d=(EV['land'] - EV['enter']) / 0.8), EV['enter'], 0.8, name='leaflet rises (arrives as it lands)')
s.fx(foley('paper', 'drop'), EV['land'], 0.9, name='leaflet lands'); s.fx(foley('card', 'tap', 0.6), EV['land'], 0.4, name='leaflet body')
for i, tp in enumerate(EV['pictTimes']): s.fx(pop(1.0 + i * 0.06), tp, 0.45, ((i % 4) - 1.5) * 0.3, name=f'pictogram {i + 1}'); accent(s, tp, EV['land'], 0.16, name=f'pictogram note {i + 1}')
s.fx(swish(), EV['picts'] + 0.72, 0.4, 0.3, name='counter in'); s.fx(pop(0.8), EV['picts'] + 0.75, 0.4, 0.3, name='counter lands')
for k in ('toToaster', 'toPost', 'toNote'): s.fx(whoosh('short', 'in'), EV[k], 0.5, 0.15, at=EV[k], name=f'camera {k}')
for i in range(3): s.fx(foley('card', 'tap', 0.7), EV['jam'] + i * 0.06, 0.45, -0.4, name='switch 1 rattles')
s.fx(chip(False), EV['jam'], 0.55, -0.4, name='switch 1 jams'); s.fx(chip(True), EV['flip2'], 0.55, 0.4, name='switch 2 off')
# the defect: the postbox and stopwatch pop in, the envelope drops through the slot, the stopwatch ticks round a day
s.fx(pop(0.9), EV['toPost'] + 0.2, 0.35, 0.3, name='postbox'); s.fx(pop(1.1), EV['toPost'] + 0.35, 0.35, -0.3, name='stopwatch')
s.fx(foley('paper', 'flip'), EV['drop'], 0.6, 0.3, name='the envelope falls'); s.fx(foley('card', 'drop'), EV['drop'] + 0.38, 0.7, 0.3, name='into the box')
for i, tp in enumerate(EV['clockTicks']): s.fx(tick(i % 4, down=False), tp, 0.4, -0.3, name=f'stopwatch {i}')
s.fx(chip(True), EV['clock'] + 1.42, 0.45, -0.3, name='24:00')
# the turn: the model's side; the counter rolls to nothing; VOLUNTARY slaps on
s.fx(whoosh('mid', 'out'), EV['flipA'], 0.8, name='leaflet turns'); s.fx(foley('paper', 'flip'), EV['flipA'], 0.6); s.fx(foley('card', 'tap'), EV['flipB'], 0.6, name='model side lands')
s.fx(swish(), EV['roll'], 0.35, 0.3, name='counter rolls')
for i, tp in enumerate(EV['rollTicks']): s.fx(tick(i), tp, 0.5, 0.3, name=f'counter {7 - i}')
s.fx(slap(), EV['vol'], 0.9, name='VOLUNTARY'); s.fx(stinger('deadpan'), EV['vol'] + 0.04, 0.4, name='a deadpan button')
# the kill switch: the note slaps on; the tap does nothing, and the music stops
s.fx(slap(), EV['slap'], 0.9, name='sticky note')
s.fx(tap(dull=True), EV['tap'], 1.0, name='the tap: nothing happens'); s.fx(ripple(), EV['tap'] + 0.02, 0.25, name='tap ring')
# the washer: a third leaflet slides in and fills itself in; the drum turns over
s.fx(whoosh('mid', 'in'), EV['toWasher'] + 0.8 - WHOOSH['mid'] * 0.8, 0.7, -0.4, at=EV['toWasher'], name='the washer leaflet slides in')
s.fx(foley('paper', 'slide'), EV['toWasher'] + 0.3, 0.5, -0.3, name='paper on paper'); s.fx(foley('paper', 'drop'), EV['toWasher'] + 0.8, 0.6)
for i, tp in enumerate(EV['washTimes']): s.fx(pop(1.0 + i * 0.05), tp, 0.42, ((i % 4) - 1.5) * 0.3, name=f'washer warning {i + 1}'); accent(s, tp, EV['toWasher'], 0.15, name=f'washer note {i + 1}')
s.fx(drum(1.8), EV['washTimes'][7] + 0.25, 0.5, 0.2, name='the drum turns over')
# the tableau: the three side by side; on "leaflet" the model's page folds shut
s.fx(whoosh('long', 'out'), EV['back'], 0.6, name='camera pulls back')
for i in range(2): s.fx(foley('paper', 'drop', 0.7), EV['back'] + 0.6 + i * 0.12, 0.45, -0.4 + 0.8 * i, name='the others slide in')
s.fx(foley('paper', 'flip'), EV['fold'], 0.7, name='the AI page folds shut'); s.fx(thump(), EV['fold'] + 0.5, 0.4, name='shut')
for w in EV['words']:
    if w['pop'] and w['caption'] not in ('voluntary', 'last'): s.fx(pop(1.6), w['t'] + 0.04, 0.4, name=f'pop word {w["w"]}'); accent(s, w['t'] + 0.04, EV['land'], 0.2, name=f'pop note {w["w"]}')
motif(s, EV['back'] + 0.2, g=0.4)
sting(s, END - 0.6)

beats = ['enter', 'land', 'picts', 'toToaster', 'jam', 'flip2', 'toPost', 'drop', 'clock', 'flipA', 'flipB', 'roll', 'rollEnd', 'toNote', 'slap', 'tap', 'toWasher', 'back', 'vol', 'fold']
cues = [(k, EV[k]) for k in beats] + [(f'pict{i}', t) for i, t in enumerate(EV['pictTimes'])] + [(f'tick{i}', t) for i, t in enumerate(EV['rollTicks'])] + \
       [(f'wash{i}', t) for i, t in enumerate(EV['washTimes'])] + [(f'word {w["w"]}', w['t'] + 0.04) for w in EV['words'] if w['pop']]
exempt = {'word leaflet.': 'the last pop word lands with the fold (EV fold = the pop + 0.1) and the sting 0.6 s before the end'}
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt=exempt, quiet=quiet, stems_dir=STEMS, report=REP)
