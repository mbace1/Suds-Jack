"""Found in Pasila (Helsinki 1) v3, "broadcast thirds" — the cue sheet. A quiet photo film of a found object, so the room
is the sound: wind in bare twigs, leaves turning over, a tram far off on the Pasila side, the RFH bed held low under the
three evidence beats and OUT for the turn. v3's layers are flat broadcast graphics, so their sounds are clean UI sounds
rather than paper: a soft air on each white sweep across a cut, a short wipe and a glassy tick as each lower third's chip
and bar come on, a slightly fuller wipe for each card, a low knock as 2033 rises into its card, and the RFH roundel's
thump on the pop word. Then the station's sting. Events from film.js → events.json (any language).

    uv run --with numpy --with soundfile python clay/pasila/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, foley, tap, slap, tick, chip, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
F = 1 / 30


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


def stamp_thump():
    """the RFH stamp on the envelope: a wooden knock with a little low body"""
    d = 0.4; t = tv(d); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.09) * 0.8 + np.sin(2 * np.pi * 150 * t) * np.exp(-t / 0.05) * 0.4
    return _fade(_norm(x, 0.6), 0.001, 0.2)


def wipe(d=0.2, lo=1800, hi=7000, seed=0):
    """a broadcast graphic wiping on: a clean, quick rising band of air with a hard stop where the shape lands"""
    g = _g('wipe', d, seed); t = tv(d); k = t / d
    env = np.clip(k / 0.75, 0, 1) ** 1.6 * np.exp(-np.clip((k - 0.75) / 0.25, 0, 1) * 5)
    x = _tvbp(_noise(d, g), lo + (hi - lo) * k ** 1.3, 2.2) * env
    return _fade(_norm(x, 0.55), 0.002, 0.012)


def knock():
    """2033 rising into its card: a low, short, clean knock"""
    d = 0.3; t = tv(d); x = np.sin(2 * np.pi * (82 + 40 * np.exp(-t * 40)) * t) * np.exp(-t / 0.07)
    return _fade(_norm(x, 0.7), 0.0008, 0.05)


# ── the music: held low under the evidence, out for the turn (the picture marks the quiet span)
bed(s, S[1] + 0.05, S[4] - 0.05, quiet, level=1, g=0.55)
motif(s, S[0] + 0.03, g=0.22)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]} reveal')

# ── the room: wind the whole way, leaves on the drifts, the tram once
s.fx(wind(END + 0.5, 1), 0.0, 0.16, -0.2, name='wind')
s.fx(wind(END + 0.5, 2, 260, 2200), 0.0, 0.08, 0.35, name='wind, higher')
for i, t in enumerate((S[0] + 0.5, S[2] + 0.4, S[2] + 1.9, S[3] + 1.3)): s.fx(leaves(i), t, 0.2, (-0.4, 0.3, -0.2, 0.4)[i], name=f'leaves {i + 1}')
s.fx(tram(), EV['tram'] - 1.1, 0.2, -0.6, at=EV['tram'], name='a tram, far off')

# ── the cuts: a white bar sweeps across each one (0.36 s, left to right), so the air pans with it
for i, t in enumerate(S[1:]):
    s.fx(whoosh('short', 'in', bright=0.55, d=0.3), t - 0.3 * 0.8, 0.13, -0.5, at=t, name=f'cut {i + 2}: the sweep starts')
    s.fx(whoosh('short', 'out', bright=0.5, d=0.32), t + 0.04, 0.1, 0.5, name=f'cut {i + 2}: it leaves right')
# the camera's moves as long low whooshes
s.fx(whoosh('long', 'in', bright=0.3, d=1.2), EV['tilt1'] - 0.1, 0.09, 0, name='the tilt down from the sign to the jug')
s.fx(whoosh('long', 'in', bright=0.35), EV['tilt5'] + 0.3, 0.1, 0, name='the tilt up to the sign')

# ── the upper third: each caption bar slides in from the left
for cp in EV['captions']:
    t = cp['t0'] - 0.24
    s.fx(wipe(0.24, 1400, 5200, seed=cp['id']), t, 0.09, -0.3, name=f'caption bar {cp["id"]}')

# ── the lower third: chip, then the bar 5 frames later; a tick as the chip lands
for i in range(1, 6):
    t = EV[f'chip{i}']
    s.fx(wipe(0.2, seed=i), t - 0.03, 0.15, -0.35, at=t, name=f'lower third {i}: the chip wipes on')
    s.fx(tick(i % 3, down=False), t + 0.2, 0.16, -0.35, name=f'lower third {i}: it lands')
    s.fx(wipe(0.18, 1500, 5600, seed=10 + i), t + 5 * F, 0.1, -0.15, name=f'lower third {i}: the bar follows')

# ── the cards: a fuller wipe (9 frames), then the shape lands
for k, nm in (('card2', 'the label card'), ('card4', 'the date card'), ('card5', 'the tip-off card')):
    t = EV[k]
    s.fx(wipe(0.3, 900, 5200, seed=k), t - 0.02, 0.18, -0.2, at=t, name=f'{nm} wipes on')
    s.fx(tap(dull=True), t + 0.29, 0.14, -0.2, name=f'{nm} lands')
s.fx(swish(), EV['claim'] + 0.01, 0.12, -0.1, name='the gold underline under the claim')
s.fx(knock(), EV['year4'], 0.42, -0.2, name='2033 rises into its card'); s.fx(tick(4, down=True), EV['year4'] + 0.006, 0.14, -0.2)
s.fx(swish(), EV['year4'] + 0.05, 0.1, -0.2, name='its gold bar')

# ── the words: pops, the roundel on the turn, the station's sting
for w in EV['words']:
    if not w['pop']: continue
    if w['caption'] == 'doorstep':
        s.fx(slap(), w['t'], 0.34, 0.25, name='the RFH roundel lands'); s.fx(stamp_thump(), w['t'] + 0.004, 0.5, 0.25, name='its weight')
        accent(s, w['t'] + 0.05, S[1], 0.2, name='doorstep: one note')
    else: s.fx(pop(1.1), w['t'] + 0.03, 0.22, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[1], 0.16, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 'hook', 'claim', 'kid', 'eu', 'turn',
                             'chip1', 'chip2', 'chip3', 'chip4', 'chip5', 'card2', 'card4', 'card5', 'year4', 'stamp5', 'tram')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
