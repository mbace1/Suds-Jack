"""Kill Switch — the score, by pipeline. The picture's events (film.js → events.json, for whichever language master)
in, a mixed and checked WAV out. Nothing here is a sound: the sounds are the library's (pipeline/sound/sfx.py), the
music is the series' (stems.py), the mix and its checks are the Session's (mix.py). This file is only the CUE SHEET:
which event gets which sound. So a Finnish or Japanese master — whose beats move when the copy needs a hold — is
scored by the same file with no edit.

    uv run --with numpy --with soundfile python clay/kill-switch/score.py <events.json> <out.wav> [<report.json> <stems_dir>]

The one joke is in the sound: the finger taps the kill switch and the MUSIC STOPS (a marked quiet span) until the
camera pulls back and the beat comes in again on the pull.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting
from sfx import whoosh, swish, pop, chip, tick, tap, slap, ripple, foley, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
quiet = [(q['t0'], q['t1']) for q in EV['quiet']]


def into(t, length='mid', g=0.8, pan=0.0, name='whoosh in'):
    """a whoosh that ARRIVES at t (it peaks at 80% of its length)"""
    s.fx(whoosh(length, 'in'), t - WHOOSH[length] * 0.8, g, pan, at=t, name=name)


# ---- the music: the bed from the landing to the tap, silence, then again from the pull (on its own downbeat)
bed(s, EV['land'], EV['tap'] + 0.02, quiet)
bed(s, EV['pull'], END - 0.6, quiet)
for c in EV['captions']:                                                     # music steps back while a line is read in
    last = max(w['t'] for w in EV['words'] if w['caption'] == c['id'])
    s.duck(c['t0'], last + 0.4, -3.5, why=f'caption {c["id"]} reveal')

# ---- the cues
s.fx(whoosh(d=(EV['land'] - EV['enter']) / 0.8), EV['enter'], 0.8, name='leaflet rises (arrives as it lands)')
s.fx(foley('paper', 'drop'), EV['land'], 0.9, name='leaflet lands'); s.fx(foley('card', 'tap', 0.6), EV['land'], 0.4, name='leaflet body')
for k in ('punch1', 'toToaster', 'toGrid'): s.fx(whoosh('short', 'in'), EV[k], 0.5, 0.15, at=EV[k], name=f'camera {k}')
for i in range(3): s.fx(foley('card', 'tap', 0.7), EV['jam'] + i * 0.06, 0.45, -0.4, name='switch 1 rattles')
s.fx(chip(False), EV['jam'], 0.55, -0.4, name='switch 1 jams')
s.fx(chip(True), EV['flip2'], 0.55, 0.4, name='switch 2 off')
for i, tp in enumerate(EV['pictTimes']):
    s.fx(pop(1.0 + i * 0.06), tp, 0.45, ((i % 4) - 1.5) * 0.3, name=f'pictogram {i + 1}')
    accent(s, tp, EV['land'], 0.18, name=f'pictogram note {i + 1}')
s.fx(swish(), EV['picts'] + 0.72, 0.4, 0.3, name='counter in'); s.fx(pop(0.8), EV['picts'] + 0.75, 0.4, 0.3, name='counter lands')
s.fx(foley('paper', 'flip'), EV['flipA'], 0.85, name='leaflet turns'); s.fx(foley('paper', 'tap'), EV['flipB'], 0.6, name='leaflet lands, model side')
s.fx(swish(), EV['roll'], 0.35, 0.3, name='counter rolls')
for i, tp in enumerate(EV['rollTicks']): s.fx(tick(i), tp, 0.5, 0.3, name=f'counter {7 - i}')
s.fx(slap(), EV['slap'], 0.9, name='sticky note')
s.fx(tap(dull=True), EV['tap'], 1.0, name='the tap: nothing happens'); s.fx(ripple(), EV['tap'] + 0.02, 0.25, name='tap ring')
s.fx(whoosh('mid', 'out'), EV['pull'], 0.7, at=EV['pull'], name='camera pulls back')
s.fx(swish(), EV['tagIn'], 0.4, -0.3, name='dateline in'); s.fx(foley('card', 'tap', 0.5), EV['tagIn'] + 0.4, 0.35, -0.3, name='dateline lands')
for w in EV['words']:
    if w['pop']: s.fx(pop(1.6), w['t'] + 0.04, 0.4, name=f'pop word {w["w"]}'); accent(s, w['t'] + 0.04, EV['land'], 0.22, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

# ---- what the picture says must be heard (every named beat, every pictogram, tick and pop word) and what is exempt
beats = [k for k, v in EV.items() if isinstance(v, (int, float))]
cues = [(k, EV[k]) for k in beats] + [(f'pict{i}', t) for i, t in enumerate(EV['pictTimes'])] + [(f'tick{i}', t) for i, t in enumerate(EV['rollTicks'])] + \
       [(f'word {w["w"]}', w['t'] + 0.04) for w in EV['words'] if w['pop']]
exempt = {'end': 'the last frame: the sting lands 0.6 s before it and rings out across it'}
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt=exempt, quiet=quiet, stems_dir=STEMS, report=REP)
