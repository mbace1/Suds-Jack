"""The Panel — the cue sheet. The RFH series bed (stems.py) and the library's sounds against the film's events
(film.js → events.json, any language). A war room in the manner of Digger: the music stays light and calm under an
absurd thing, and the room does the talking. Three heavy spotlight clunks, one per empty chair; a paper avalanche as
the CONTRACTS towers fill the two seats; and on "advice" the service bell, once, polite.

    uv run --with numpy --with soundfile python clay/panel/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 5)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── the music: light under the push and the chairs, the full groove for the towers, light again for the wide
bed(s, S[0] + 0.05, S[2], quiet, level=1)
bed(s, S[2], S[3], quiet)
bed(s, S[3], END - 0.6, quiet, level=1)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · low over the felt, towards the three chairs
motif(s, S[0] + 0.03, g=0.3)                                   # 30 ms in: a full onset on sample 0 rings the sign-off join
s.fx(whoosh('long', 'in'), S[0] + 0.1, 0.2, 0, name='the slow push')

# ── 2 · the three spotlights, one per chair: a heavy clunk each, left to right
for k in range(3):
    t = EV[f'lit{k}']; pan = (k - 1) * 0.5
    s.fx(foley('wood', 'tap', 1.0), t, 0.55, pan, name=f'spotlight {k + 1} clunks on'); s.fx(tap(dull=True), t + 0.01, 0.4, pan)
    accent(s, t + 0.02, S[0], 0.16, name=f'chair {k + 1}')

# ── 3 · the folders rain onto two of the three seats: a paper avalanche that thickens, then the top one lands
n = 16
for i in range(n):
    t = EV['drop0'] + (EV['dropN'] - EV['drop0']) * i / (n - 1); pan = -0.45 if i % 2 == 0 else 0.45
    s.fx(foley('paper', 'drop', 0.7 + 0.3 * i / n), t, 0.22 + 0.2 * i / n, pan, name=f'folders {i + 1}')
s.fx(foley('card', 'tap', 0.8), EV['dropN'], 0.5, 0, name='the top folder: CONTRACTS')
s.fx(swish(), EV['dropN'] + 0.2, 0.3, -0.3, name='tag in')

# ── 4 · up and back; on "advice", the service bell
s.fx(whoosh('mid', 'out'), S[3], 0.35, 0, at=S[3], name='the camera floats up and back')
s.fx(foley('glass', 'tap', 1.0), EV['ding'], 0.6, 0, name='the bell: ding'); s.fx(chip(True), EV['ding'] + 0.005, 0.3, 0)
s.fx(stinger('deadpan'), EV['ding'] + 0.35, 0.35, name='deadpan')
s.fx(swish(), EV['ding'] + 0.3, 0.25, -0.3, name='tag: not disclosed')
for w in EV['words']:
    if w['pop'] and w['caption'] != 'advice': s.fx(pop(1.4), w['t'] + 0.03, 0.3, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 'lit0', 'lit1', 'lit2', 'drop0', 'dropN', 'ding')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
