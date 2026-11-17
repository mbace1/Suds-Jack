"""The Round Trip (RFH · Anthropic's IPO), 3D v1 — the cue sheet. Its own kit: MARBLE RUN (pipeline/sound/marble.py).
  s1  the machine starts: marbles rolling, a clack at each join; the xylophone loop comes in; the counter ticks
  s2  the split-flap sign turns to the price
  s3  the gate multiplies the stream: the loop doubles, coins ring as they land in the towers
  s4  a relay: the towers' COMPUTE goes dark; the music thins to the bass; the marbles keep rolling
  s5  everything comes back in: the full loop, a coin on "back", then the station's sting
  every pop word: a xylophone note from the chord under it

    uv run --with numpy --with soundfile python clay/roundtrip/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import Session
from stems import sting
from sfx import whoosh, swish, WHOOSH
from rfsound import SR, sub_bass, supersaw, sparkle
from marble import Marble as M, xylo, roll, clack, coin, flap, relay, loop_bar

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T['end']; s = Session(END + 0.5, M); B = M.B; BAR = 4 * B

# the machine, all the way through
s.fx(roll(END, 1), 0.0, 0.16, -0.3, wet=0.1, name='marbles rolling: the left loop')
s.fx(roll(END, 2), 0.0, 0.16, 0.3, wet=0.1, name='marbles rolling: the right loop')
for i, t in enumerate(np.arange(0.4, END - 0.4, 0.55)): s.fx(clack(i), t + (i % 3) * 0.05, 0.05, (-0.5, 0.5)[i % 2], wet=0.2, name='a join on the track')
# the music: on the bar grid from 0; thins in beat 4, full again on "back"
for i in range(int(np.ceil((END - 0.6) / BAR))):
    tb = i * BAR; ch = M.CHORDS[i % 4]
    if tb >= END - 0.7: break
    thin = T['dark'] - 0.1 <= tb < T['back'] - 0.4
    loop_bar(s, tb, ch, g=0.06 if tb < T['s3'] else 0.075, arp=not thin and tb >= 0.9 * BAR, bass=True)
    if tb >= T['s3'] and not thin:
        for j, m in enumerate(ch[1]): s.note(supersaw(m, BAR, cut=1800, a=0.3, r=0.4, seed=j), tb, 0.025, (-0.5, 0.0, 0.5)[j], 0.4, stem='pad', name='the loop doubles: a pad')
# events
s.fx(whoosh('mid', 'in', bright=0.6), T['pour'] - WHOOSH['mid'] * 0.8, 0.12, 0, at=T['pour'], name='the gold starts down the chutes')
s.fx(flap(10), T['flip'], 0.3, 0.1, wet=0.15, name='the split-flap sign turns')
s.fx(swish(), T['multiply'] - 0.05, 0.12, 0.2, name='the gate multiplies the stream')
for i, t in enumerate(np.arange(T['multiply'] + 1.4, T['back'] + 1.5, 0.37)): s.fx(coin(i), t, 0.06, (-0.6, 0.6)[i % 2], wet=0.3, name='a coin lands in a tower')
s.fx(relay(), T['dark'], 0.42, 0, wet=0.2, name='COMPUTE goes dark'); s.duck(T['dark'] - 0.05, T['dark'] + 0.5, -6, why='the relay')
s.fx(coin(9), T['back'] + 0.02, 0.3, 0.1, wet=0.4, name='a coin on "back"')
s.note(sparkle(86), T['back'] + 0.03, 0.1, 0.2, 0.5, stem='bells', name='the bell over it')
# pops: one xylophone note each
for w in EV['words']:
    if not w['pop']: continue
    bar = int(w['t'] // BAR) % 4; ch = M.CHORDS[bar]
    s.note(xylo(ch[1][2] + 24, 0.3, 0.9), w['t'] + 0.01, 0.2, 0.15, 0.3, stem='xylo', name=f'pop {w["w"]}')
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
