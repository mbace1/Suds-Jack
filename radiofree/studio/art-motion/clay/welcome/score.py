"""Welcome Home — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds against the
film's events (film.js → events.json, any language). A launch film is all soft UI: every sound the screen makes is
gentle and pleased with itself — the tiles pop in, fold away, the face box chimes — until the vault door, which is
the one heavy thing in the film, and the door camera's box at the end, which lands on a dull chip and a deadpan.

    uv run --with numpy --with soundfile python clay/welcome/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import thump, stamp

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── the music: light under the hoop and the morning, the full groove from her screen on, light again at the door
bed(s, S[0] + 0.05, S[1], quiet, level=1)
bed(s, S[1], S[4], quiet)
bed(s, S[4], END - 0.6, quiet, level=1)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the hoop: a thread drawn through linen; zoom through it into the kitchen; the daughter goes, the door clicks
s.fx(foley('paper', 'slide'), S[0], 0.35, -0.2, name='a thread through linen'); motif(s, S[0] + 0.05, g=0.3)
s.fx(whoosh('mid', 'in'), EV['hoopOut'], 0.45, 0, name='through the hoop')
for i in range(4): s.fx(tap(), EV['leave'] - 1.1 + i * 0.3, 0.18, 0.4 - i * 0.25, name=f'her steps {i + 1}')
s.fx(foley('wood', 'tap', 0.9), EV['leave'], 0.7, -0.5, name='"leave": the front door'); s.fx(tick(2, down=True), EV['leave'] + 0.05, 0.4, -0.5, name='the latch')

# ── 2 · her screen: the tiles pop in; she turns and goes; they fold away on "not stored"
for i in range(3): s.fx(pop(1.1 + i * 0.12), EV['tilesIn'] + i * 0.12, 0.38, 0.3, name=f'tile {i + 1}'); accent(s, EV['tilesIn'], S[0], 0.18, name='her things')
s.fx(swish(), EV['turn'], 0.3, -0.3, name='she turns away')
for i in range(3): s.fx(tick(i, down=True), EV['fold'] - 0.5 + i * 0.18, 0.3, 0.3, name=f'tile folds {i + 1}')
s.fx(chip(True), EV['fold'], 0.35, 0.3, name='"not stored": the last tile folds'); accent(s, EV['fold'], S[0], 0.22, name='not stored')

# ── 3 · the screen's view: the face box chimes; the vault door swings shut, the heavy thing; the blank card
s.fx(chip(True), EV['boxOn'], 0.45, 0, name='the face box: recognised')
s.fx(whoosh('short', 'in'), EV['vault'] - 0.1, 0.4, 0.3, name='the vault door swings')
s.fx(thump(), EV['vault'] + 0.35, 0.7, 0, name='it shuts'); s.fx(stamp(), EV['vault'] + 0.35, 0.35, 0)
for i in range(3): s.fx(tick(i, down=False), EV['vault'] + 0.5 + i * 0.1, 0.28, 0.2, name=f'the wheel turns {i + 1}')
s.fx(pop(0.9), EV['kept'], 0.45, 0, name='"not said": KEPT FOR —'); s.fx(stinger('deadpan'), EV['kept'] + 0.05, 0.35)
s.fx(foley('wood', 'tap', 0.4), EV['vault'], 0.3, 0.3, name='the vault cue')

# ── 4 · the ad's ending: the family round the screen; they lean in on "leave"
for i in range(6): s.fx(tap(dull=True), S[3] + 0.6 + i * 0.4, 0.12, 0.3, name=f'French toast {i + 1}')
s.fx(foley('card', 'slide'), EV['lean'], 0.45, 0, name='"leave": they lean in'); accent(s, EV['lean'], S[0], 0.22, name='lean')

# ── 5 · the door camera: he turns to the lens; on "guests" the box snaps on
s.fx(swish(), EV['turnBack'], 0.35, -0.2, name='he turns to the lens')
s.fx(chip(False), EV['guest'], 0.55, 0, name='"guests": GUEST 7 — ?'); s.fx(stinger('deadpan'), EV['guest'] + 0.05, 0.45)
for w in EV['words']:
    if w['pop'] and w['caption'] == 'question': s.fx(pop(1.4), w['t'] + 0.03, 0.3, 0.2, name=f'pop {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'hoopOut', 'leave', 'tilesIn', 'turn', 'fold', 'boxOn', 'vault', 'kept', 'lean', 'turnBack', 'guest')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
