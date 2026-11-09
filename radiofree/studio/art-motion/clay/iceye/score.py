"""Sleep Tight (RFH, Helsinki 2 · ICEYE) — the cue sheet. The RFH bed under a cold-war night, the film's own sounds on its
events (film.js → events.json), and a turn played as a lullaby:

  1 · the desk: room tone, wind against the window, a lamp's faint hum; the camera whips up to the sky (a rising air)
      and the cut goes through a flash of cloud-light
  2 · orbit: radar pings on the strips' clock, panned left and right
  3 · the pull-back: a small glass chip for each orbit plane as it lights; the counter's ticks slow as it rolls to
      €10B and lock with a chime on the pop word
  4 · the war room: the grant envelope drops onto the glass; the satellite falls and LANDS on "buys it" (a wood hit,
      a metal clank, a low body; the bed ducks −10 dB)
  5 · the requirements slide in; the stamp falls and SLAMS on "classified" (as On the Label: a heavy hit and a
      crack; the bed ducks −14 dB)
  6 · the turn: the bed is OUT. The baby monitor's double beep, then a music box plays the opening of Brahms's
      lullaby (Wiegenlied, 1868: public domain) under "Sleep tight, Finland."; then the RFH sting

    uv run --with numpy --with soundfile python clay/iceye/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, foley, WHOOSH, _noise, _tvbp, _fade, _norm, _g
from rfsound import SR, tv, soft

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 7)]


def body(f0=70, drop=40, dur=0.5, decay=11):
    """a low body under a hit: a pitched thump that falls as it decays"""
    t = tv(dur); x = np.sin(2 * np.pi * (f0 + drop * np.exp(-t * 25)) * t) * np.exp(-t * decay)
    return _fade(_norm(x, 0.9), 0.001, 0.12)


def crack():
    """a hard, bright snap on top of a wood hit: the stamp's face meeting the paper"""
    d = 0.09; g = _g('crack'); t = tv(d)
    x = _noise(d, g, 1800, 9000) * np.exp(-t * 90) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 160) * 0.5
    return _fade(_norm(x, 0.85), 0.0003, 0.02)


def clank(k=0):
    """a small metal knock: the model's stand meeting the glass"""
    d = 0.35; t = tv(d); g = _g('clank', k)
    x = np.sin(2 * np.pi * 410 * t) * np.exp(-t * 18) + np.sin(2 * np.pi * 1290 * t) * np.exp(-t * 30) * 0.4 + _noise(d, g, 1500, 7000) * np.exp(-t * 90) * 0.4
    return _fade(_norm(x, 0.7), 0.0005, 0.05)


def ping(k):
    """a radar's ping: a pure tone that rings off, a little higher on alternate pings"""
    d = 1.2; t = tv(d); f = 1180 * (1.0 if k % 2 == 0 else 1.06)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.2) + np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 10) * 0.18
    return _fade(_norm(x, 0.7), 0.004, 0.2)


def beep(f=1900, d=0.085):
    """the baby monitor's alert"""
    t = tv(d); return _fade(_norm(np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 2 * t), 0.6), 0.004, 0.02)


def mbox(f, d=1.3):
    """one music-box tine: a bright fundamental, inharmonic partials that die fast, a tiny pluck"""
    t = tv(d); x = np.zeros(len(t))
    for m, a, dk in ((1, 1.0, 0.85), (2.0, 0.32, 0.35), (3.01, 0.16, 0.18), (4.17, 0.1, 0.1), (5.43, 0.05, 0.07)):
        x += np.sin(2 * np.pi * f * m * t) * np.exp(-t / dk) * a
    n = int(0.002 * SR); x[:n] += _noise(0.002, _g('tine', int(f))) * 0.3
    return _fade(_norm(x, 0.7), 0.0008, 0.12)


def wind(d):
    """wind against a window: low noise that swells and falls"""
    t = tv(d); g = _g('wind')
    x = soft(_noise(d, g), 150, 900, 2) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.31 * t + 1.0) * np.sin(2 * np.pi * 0.13 * t))
    return _fade(_norm(x, 0.6), 0.4, 0.3)


def hum(d):
    """a desk lamp's transformer"""
    t = tv(d); x = np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.15 * np.sin(2 * np.pi * 150 * t)
    return _fade(_norm(x, 0.5), 0.3, 0.1)


# ── the music: under beats 1–5, OUT for the turn; ducked under each caption's reveal
bed(s, S[0] + 0.05, S[5] - 0.02, [], level=1, g=0.75)
motif(s, S[0] + 0.03, g=0.22)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[2:5]): s.fx(whoosh('short', 'in', bright=0.6), t - WHOOSH['short'] * 0.8, 0.16, 0, at=t, name=f'cut {i + 3}')

# ── 1 · the desk at night; the whip up to the sky and the flash into orbit
s.fx(wind(S[1] + 0.2), 0.0, 0.1, -0.3, name='wind against the window')
s.fx(hum(S[1]), 0.0, 0.035, 0.3, name='the lamp hums')
s.fx(swish(), EV['rise'], 0.22, 0.2, name='the whip starts')
s.fx(whoosh('mid', 'in', bright=0.8), EV['rise'] - 0.05, 0.3, 0, at=S[1], name='the camera whips up to the sky')
s.fx(whoosh('long', 'out', bright=1.0), S[1], 0.26, 0, wet=0.25, at=S[1] + 0.05, name='through the cloud into orbit')

# ── 2–3 · orbit: the radar pings on the strips' clock
pings = sorted((v, k) for k, v in EV.items() if k.startswith('ping'))
for i, (t, k) in enumerate(pings): s.fx(ping(i), t, 0.16 if i < 4 else 0.1, -0.35 if i % 2 == 0 else 0.35, wet=0.35, name=f'radar {k}')

# ── 3 · the constellation lights plane by plane; the counter rolls and locks on "€10 billion"
d3 = S[3] - S[2]
for p in range(9): s.fx(chip(True), S[2] + p / 9 * d3 * 0.75, 0.07, -0.6 + 1.2 * p / 8, wet=0.3, name=f'orbit plane {p + 1} lights')
n = 16
for i in range(1, n):
    x = 1 - (1 - i / n) ** (1 / 3); t = EV['count0'] + x * (EV['worth'] - EV['count0'])
    s.fx(tick(i % 3, down=False), t, 0.07, 0.1, name=f'counter {i}')
s.fx(chip(True), EV['worth'] + 0.01, 0.3, 0, wet=0.2, name='the counter locks')

# ── 4 · the war room: the grant drops; the satellite LANDS on "buys it"
s.fx(swish(), EV['grant'] - 0.3, 0.14, -0.3, name='the envelope falls')
s.fx(foley('paper', 'drop', 0.95), EV['grant'], 0.45, -0.3, name='the grant lands on the glass'); s.fx(body(120, 40, 0.2, 30), EV['grant'] + 0.003, 0.18, -0.3, name='its weight')
s.fx(whoosh('mid', 'in', bright=0.5), EV['buys'] - WHOOSH['mid'] * 0.8, 0.26, 0.05, at=EV['buys'], name='the satellite falls')
s.fx(foley('wood', 'tap', 1.0), EV['buys'], 0.6, 0.05, wet=0.12, name='the satellite LANDS'); s.fx(clank(), EV['buys'] + 0.004, 0.42, 0.05, name='its stand on the glass')
s.fx(body(66, 42, 0.6, 9), EV['buys'] + 0.003, 0.7, 0, name='its weight')
for i, dt in enumerate((0.22, 0.42)): s.fx(clank(i + 1), EV['buys'] + dt, 0.12 - i * 0.05, 0.05, name=f'bounce {i + 1}')
s.duck(EV['buys'] - 0.02, EV['buys'] + 0.4, -10, attack=0.02, release=0.4, why='the landing')

# ── 5 · the requirements slide in; the stamp SLAMS on "classified"
s.fx(foley('paper', 'slide', 0.8), EV['sheet'], 0.32, 0.4, name='the requirements slide in')
s.fx(whoosh('short', 'in', bright=0.9), EV['stamp'] - WHOOSH['short'] * 0.8, 0.22, 0.1, at=EV['stamp'], name='the stamp comes down')
s.fx(foley('wood', 'tap', 1.0), EV['stamp'], 0.75, 0.1, wet=0.14, name='the stamp SLAMS'); s.fx(crack(), EV['stamp'] + 0.002, 0.5, 0.1, name='its snap')
s.fx(body(58, 45, 0.7, 8), EV['stamp'] + 0.003, 0.8, 0.0, name='its weight')
accent(s, EV['stamp'] + 0.02, S[0], 0.2, name='stamp accent')
s.duck(EV['stamp'] - 0.02, EV['stamp'] + 0.45, -14, attack=0.015, release=0.45, why='the slam')
s.fx(foley('card', 'slide', 0.5), EV['stamp'] + 0.3, 0.14, 0.15, name='the stamp lifts')

# ── 6 · the turn: the bed is out; the monitor beeps; a music box plays the lullaby; then the station's sting
def hiss(d):
    """a baby monitor's open channel: a soft band of hiss, opened by a click"""
    t = tv(d); g = _g('hiss'); x = soft(_noise(d, g), 2500, 9000, 2) * 0.5
    n = int(0.004 * SR); x[:n] += np.sin(2 * np.pi * 2400 * t[:n]) * 2.0
    return _fade(_norm(x, 0.5), 0.001, 0.3)


s.fx(hiss(END - S[5] + 0.3), S[5], 0.05, 0.1, name='the monitor: an open channel, a click')
for i, dt in enumerate((0.0, 0.16)): s.fx(beep(1900 if i == 0 else 2250), EV['beep'] + dt, 0.2, 0.15, name=f'monitor beep {i + 1}')
E5, G5, C6 = 659.26, 783.99, 1046.5
t = EV['beep'] + 0.55
for f, dur in ((E5, 0.22), (E5, 0.22), (G5, 0.6), (E5, 0.22), (E5, 0.22), (G5, 0.6), (E5, 0.22), (G5, 0.22), (C6, 0.5)):
    if t > END - 0.55: break
    s.fx(mbox(f), t, 0.22, -0.1, wet=0.3, name=f'music box {f:.0f} Hz'); t += dur

# ── pop words: the impacts ARE their pops; the others get a pop and a light note; the turn's pop stays quiet
ACTED = {'worth', 'buys', 'classified', 'sleep'}
for w in EV['words']:
    if not w['pop'] or w['caption'] in ACTED: continue
    s.fx(pop(1.25), w['t'] + 0.03, 0.26, 0.2, name=f'pop {w["w"]}'); accent(s, w['t'] + 0.03, S[0], 0.18, name=f'pop note {w["w"]}')
sting(s, END - 0.6)

cues = [(k, EV[k]) for k in ('s1', 's2', 's3', 's4', 's5', 's6', 'rise', 'worth', 'grant', 'buys', 'sheet', 'stamp', 'beep', 'sleep')]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
