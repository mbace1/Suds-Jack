"""Found in Pasila (Helsinki 1) v2 — the cue sheet. A quiet photo film of a found object, so the room is the sound:
wind in bare twigs, leaves turning over, a tram far off on the Pasila side, the RFH bed held low under the three
evidence beats and OUT for the turn. v2 adds the cut-paper layers, each with its own small paper sound: the evidence tag
dropping on its string, the ring drawing, the quote card landing and its gold underline, the WHO? tag, the calendar
card and the year stamping on, the envelope sliding in through the silence, and the RFH stamp thumping on the pop word.
Then the station's sting. Events from film.js → events.json (any language).

    uv run --with numpy --with soundfile python clay/pasila/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, foley, tap, slap, stinger, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


def wind(d, seed, lo=180, hi=1400):
    """wind in bare twigs: band-limited noise under a slow, uneven swell"""
    g = _g('wind', seed); t = tv(d)
    sw = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t + g.uniform(0, 6)) * np.sin(2 * np.pi * 0.047 * t + g.uniform(0, 6))
    x = _tvbp(_noise(d, g), np.geomspace(lo, hi, len(t)) * (0.8 + 0.4 * sw), 0.9) * sw
    return _fade(_norm(x, 0.5), 0.3, 0.6)


def leaves(seed):
    """a few dry leaves turning over: short paper slides, scattered"""
    g = _g('leaves', seed); x = np.zeros(int(0.9 * SR))
    for i in range(4):
        a = foley('paper', 'slide', 0.5 + 0.3 * g.random()); p = int(g.uniform(0, 0.45) * SR); x[p:p + len(a)] += a[:len(x) - p] * 0.6
    return _fade(_norm(x, 0.55), 0.01, 0.1)


def tram():
    """a tram far off on the Pasila side: a low rolling hum that swells and goes, with its bell twice"""
    d = 3.2; t = tv(d); g = _g('tram'); env = np.sin(np.pi * t / d) ** 1.6
    hum = (np.sin(2 * np.pi * 58 * t) * 0.6 + np.sin(2 * np.pi * 116 * t + 1) * 0.3 + _tvbp(_noise(d, g), np.full(len(t), 320.0), 1.2) * 0.5) * env
    x = soft(hum, None, 900)
    for i, t0 in enumerate((1.1, 1.38)):
        b = tv(0.5); bell = (np.sin(2 * np.pi * 1480 * b) * np.exp(-b / 0.12) + np.sin(2 * np.pi * 2960 * b) * np.exp(-b / 0.05) * 0.4) * 0.35
        p = int(t0 * SR); x[p:p + len(b)] += bell[:len(x) - p]
    return _fade(_norm(x, 0.5), 0.05, 0.3)


def pen():
    """a marker drawing the dashed ring: a short felt-tip squeak, dashed"""
    d = 0.55; t = tv(d); g = _g('pen'); x = _tvbp(_noise(d, g), np.geomspace(2600, 3400, len(t)), 0.5)
    x *= (np.sin(2 * np.pi * 9 * t) > 0.2) * 0.8 + 0.2
    return _fade(_norm(x, 0.3), 0.01, 0.08)


def stamp_thump():
    """the RFH stamp on the envelope: a wooden knock with a little low body"""
    d = 0.4; t = tv(d); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.09) * 0.8 + np.sin(2 * np.pi * 150 * t) * np.exp(-t / 0.05) * 0.4
    return _fade(_norm(x, 0.6), 0.001, 0.2)


# ── the music: held low under the evidence, out for the turn (the picture marks the quiet span)
bed(s, S[1] + 0.05, S[4] - 0.05, quiet, level=1, g=0.55)
motif(s, S[0] + 0.03, g=0.22)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')

# ── the room: wind the whole way, leaves on the drifts, the tram once
s.fx(wind(END + 0.5, 1), 0.0, 0.16, -0.2, name='wind')
s.fx(wind(END + 0.5, 2, 260, 2200), 0.0, 0.08, 0.35, name='wind, higher')
for i, t in enumerate((S[0] + 0.5, S[2] + 0.4, S[2] + 1.9, S[3] + 1.3)): s.fx(leaves(i), t, 0.22, (-0.4, 0.3, -0.2, 0.4)[i], name=f'leaves {i + 1}')
s.fx(tram(), EV['tram'] - 1.1, 0.2, -0.6, at=EV['tram'], name='a tram, far off')

# ── the cuts: a soft air on each, the camera's moves as long low whooshes
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in', bright=0.4), t - WHOOSH['short'] * 0.8, 0.14, 0, at=t, name=f'cut {i + 2}')
s.fx(whoosh('long', 'in', bright=0.3), EV['push1'], 0.1, 0, name='the slow push')
s.fx(whoosh('long', 'in', bright=0.35), EV['tilt5'] + 0.2, 0.12, 0, name='the slow pull back to the doorstep')

# ── the paper layers
s.fx(swish(), EV['tagDrop'] - 0.12, 0.2, -0.35, at=EV['tagDrop'], name='the evidence tag drops'); s.fx(foley('card', 'tap', 0.6), EV['tagDrop'] + 0.42, 0.3, -0.35, name='it catches on its string')
s.fx(pen(), EV['ring1'], 0.18, 0.1, name='the ring draws round the jug')
s.fx(swish(), EV['card2'] - 0.1, 0.2, 0.3, at=EV['card2'], name='the quote card slides in'); s.fx(foley('card', 'tap', 0.7), EV['card2'] + 0.5, 0.34, 0.3, name='it lands')
s.fx(foley('paper', 'slide', 0.5), EV['claim'] + 0.02, 0.22, 0.3, name='the gold underline')
s.fx(foley('card', 'tap', 0.5), EV['who3'], 0.3, 0.2, name='the WHO? tag'); s.fx(pen(), EV['who3'] + 0.3, 0.12, 0.2, name='its dashed lead')
s.fx(swish(), EV['cal4'] - 0.1, 0.18, 0.3, at=EV['cal4'], name='the calendar card drops'); s.fx(foley('card', 'drop', 0.8), EV['cal4'] + 0.5, 0.38, 0.3, name='it lands')
s.fx(foley('wood', 'tap', 0.8), EV['year4'] + 0.03, 0.4, 0.3, name='2033 stamps on'); s.fx(tap(dull=True), EV['year4'] + 0.035, 0.26, 0.3)
s.fx(foley('paper', 'slide', 0.7), EV['env5'], 0.22, -0.1, name='the envelope slides in, through the silence')
s.fx(foley('card', 'tap', 0.4), EV['env5'] + 0.62, 0.22, -0.1, name='it settles')

# ── the words: pops, the stamp on the turn, the station's sting
for w in EV['words']:
    if not w['pop']: continue
    if w['caption'] == 'doorstep':
        s.fx(slap(), w['t'], 0.4, 0.1, name='the RFH stamp lands'); s.fx(stamp_thump(), w['t'] + 0.004, 0.5, 0.1, name='its weight')
        accent(s, w['t'] + 0.05, S[1], 0.2, name='doorstep: one note')
    else: s.fx(pop(1.1), w['t'] + 0.03, 0.22, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[1], 0.16, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'hook', 'claim', 'kid', 'eu', 'turn', 'tagDrop', 'ring1', 'card2', 'who3', 'cal4', 'year4', 'env5', 'stamp5', 'tram')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
