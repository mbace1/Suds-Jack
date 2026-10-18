"""Welcome Home — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds against the
film's events (film.js → events.json, any language). v3: Pear HomeView, the irony inside its own ad. A launch film is all soft
UI, and the screen's sounds stay gentle and pleased with themselves — the lock that keeps her brother out is a polite
chip — until the door camera's last pill, which lands on a dull chip and a deadpan: 3 WATCHING.

    uv run --with numpy --with soundfile python clay/welcome/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 5)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── the music: light under the hoop and the morning, the full groove from the brother's try, light again at the door
bed(s, S[0] + 0.05, S[1], quiet, level=1)
bed(s, S[1], S[3], quiet)
bed(s, S[3], END - 0.6, quiet, level=1)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the hoop: a thread drawn through linen; zoom through it; Pear's title card chimes; the kitchen
s.fx(foley('paper', 'slide'), S[0], 0.35, -0.2, name='a thread through linen'); motif(s, S[0] + 0.05, g=0.3)
s.fx(whoosh('mid', 'in'), EV['hoopOut'], 0.45, 0, name='through the hoop')
s.fx(chip(True), EV['title'], 0.45, 0, name='Welcome Pear HomeView'); accent(s, EV['title'], S[0], 0.2, name='the title card')
s.fx(whoosh('short', 'out'), EV['titleOut'], 0.3, 0, name='into the kitchen')
for w in EV['words']:
    if w['pop'] and w['caption'] == 'question': s.fx(pop(1.4), w['t'] + 0.03, 0.3, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name='whose?')

# ── 2 · her brother reaches for her messages; on "unlocks" the screen locks him out, politely
s.fx(swish(), EV['reach'], 0.3, -0.2, name='he reaches'); s.fx(tap(), EV['reach'] + 0.45, 0.35, 0.2, name='a tap on the glass')
s.fx(chip(False), EV['lock'], 0.5, 0.2, name='"unlocks": locked, not your face'); s.fx(tick(1, down=True), EV['lock'] + 0.08, 0.3, 0.2)

# ── 3 · the ad's ending: the family round the screen; what they are watching pops in; they lean in on "camera"
s.fx(pop(1.0), EV['inset'], 0.45, 0, name='the inset: what is on the screen')
for i in range(6): s.fx(tap(dull=True), S[2] + 0.6 + i * 0.4, 0.12, 0.3, name=f'French toast {i + 1}')
s.fx(foley('card', 'slide'), EV['lean'], 0.45, 0, name='"camera": they lean in'); accent(s, EV['lean'], S[0], 0.22, name='lean')

# ── 4 · the door camera: he glances back; on "family viewing" the pill: 3 WATCHING
s.fx(swish(), EV['turnBack'], 0.35, -0.2, name='he glances back at the lens')
s.fx(chip(False), EV['watching'], 0.55, 0.3, name='"family viewing": 3 WATCHING'); s.fx(stinger('deadpan'), EV['watching'] + 0.05, 0.45)
for i in range(9): s.fx(pop(1.5 + (i % 3) * 0.1), EV['watching'] + 0.3 + i * 0.28, 0.18, 0.3, name=f'reaction {i + 1}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 'hoopOut', 'title', 'titleOut', 'reach', 'lock', 'inset', 'lean', 'turnBack', 'watching')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
