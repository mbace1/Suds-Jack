"""Welcome Home — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds against the
film's events (film.js → events.json, any language). v4: all clay. The display boots with a pleased little chime and
everything it does stays gentle and polite — the page turn to its pitch, the lock that keeps her brother out — while the
kitchen is foley: her footsteps past the lens, the forks. The door camera's pill lands on a dull chip and a deadpan, one
pop per mask as the dots fill in: 4 WATCHING.

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
CUTS = [EV['s2'], EV['s3'], EV['cut3b'], EV['s4'], EV['cut4b']]   # the picture cuts: the four beats, the screen at "leave", the faces after the pill

# ── the music: light under the boot and the morning, the full groove from the brother's try, light again for the pill
bed(s, S[0] + 0.05, S[1], quiet, level=1)
bed(s, S[1], S[3], quiet)
bed(s, S[3], END - 0.6, quiet, level=1)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(CUTS): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the display boots (Pear AI. For the future.), turns to its pitch, and the camera pulls back into the kitchen
motif(s, S[0], g=0.3)
s.fx(chip(True), EV['boot'], 0.45, 0, name='the boot chime'); accent(s, EV['boot'] + 0.02, S[0], 0.18, name='Pear AI')
s.fx(swish(), EV['flow'], 0.22, 0.1, name='the page turns: Private by design.')
s.fx(whoosh('mid', 'out'), EV['pull0'], 0.25, 0, name='the camera pulls back')
for i in range(7): s.fx(tap(dull=True), EV['cross'] + i * 0.36, 0.2, 0.6 - i * 0.2, name=f'her step {i + 1}')
s.fx(whoosh('short', 'in'), EV['cross'] + 1.2 - WHOOSH['short'] * 0.8, 0.16, 0, at=EV['cross'] + 1.2, name='she passes the lens')
s.fx(swish(), EV['dadLook'], 0.2, -0.3, name='dad looks round')
for w in EV['words']:
    if w['pop'] and w['caption'] == 'question': s.fx(pop(1.4), w['t'] + 0.03, 0.3, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.2, name='whose?')

# ── 2 · her brother reaches for her messages; on "unlocks" the screen locks him out, politely
s.fx(swish(), EV['reach'], 0.3, -0.2, name='he reaches'); s.fx(tap(), EV['tap'], 0.35, 0.2, name='a tap on the glass')
s.fx(chip(False), EV['lock'], 0.5, 0.2, name='"unlocks": locked, not your face'); s.fx(tick(1, down=True), EV['lock'] + 0.08, 0.3, 0.2)

# ── 3 · the family round the display: forks; then the display itself, and on "camera" she looks back into the lens
for i in range(5): s.fx(tick(i % 3, down=False), S[2] + 0.5 + i * 0.42, 0.1, -0.3 + i * 0.15, name=f'a fork {i + 1}')
s.fx(swish(), EV['glance'], 0.3, 0.2, name='"camera": she looks back'); s.fx(pop(0.9), EV['glance'] + 0.12, 0.25, 0.2)

# ── 4 · on "family viewing": 4 WATCHING, a pop per mask; she looks back again; the family, leaning in
s.fx(chip(False), EV['watching'], 0.55, 0, name='"family viewing": 4 WATCHING'); s.fx(stinger('deadpan'), EV['watching'] + 0.05, 0.45)
for i in range(4): s.fx(pop(1.3 + i * 0.1), EV['watching'] + 0.25 + i * 0.12, 0.22, -0.3 + i * 0.2, name=f'mask {i + 1}')
s.fx(swish(), EV['glance2'], 0.25, 0.2, name='she looks back again')
s.fx(foley('card', 'slide'), EV['cut4b'] + 0.2, 0.35, 0, name='they lean in'); accent(s, EV['cut4b'] + 0.2, S[0], 0.22, name='lean')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 'boot', 'flow', 'pull0', 'cross', 'dadLook', 'reach', 'tap', 'lock', 'cut3b', 'glance', 'watching', 'glance2', 'cut4b')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
