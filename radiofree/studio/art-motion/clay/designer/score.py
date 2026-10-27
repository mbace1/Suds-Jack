"""Needs a Designer (Toko set 2/4) — the cue sheet. The set's family, at the film's own tempo: lo-fi in the studio,
112 BPM in A minor, a felt piano on Am7 – Fmaj7 – Dm7 – E7sus with a kalimba over it, an upright on the ones, brushes
while he is making, a record's surface and the room under everything. The prototypes are the only electronic sounds:
each pops out of the laptop on a square blip and lands on the stack with a clay tap; each plays a three-note chip tune,
gets its WORKS tick, and drops into the crate on wood — nine times, a little lower each time, because none of them is
fun. Then the music stops making: the last box hops into his paddles, the clay squelches as he reshapes it, and on
"fun" it lights with a rising kalimba run and the harmony turns major (Fmaj7 – G9sus – Cmaj9). Drone passes are faint
filtered whirs, panned the way they cross the window. Against the picture (film.js → events.json, any language), and
Toko's card opens on his logo — the blink — over a held Cmaj9 that rings out. Toko's rules: no station sting, no
sign-off.

    uv run --with numpy --with soundfile python clay/designer/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from sfx import whoosh, foley, pop, logo_toko, WHOOSH
from rfsound import (SR, tv, soft, felt_piano, kalimba, upright, vinyl, room, chime, whir, tick, ui_tick, brush_swish,
                     brush_tap, sparkle)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


class LOFI:
    BPM = 112                                                            # the film's own: every cut lands on a beat
    VERB = dict(t60=0.9, lo=160, hi=4800, pre=0.010, g=0.26, seed=112)   # a small studio, not the night park
    GLUE = dict(thresh=-20.0, ratio=1.8)
    EQ = dict(fc=4800.0, db=-2.5, hp=34.0)                               # tape-warm: the top rolled off


s = Session(END + 0.5, LOFI); B = 60 / LOFI.BPM


def chip(m, d=0.09):
    """the prototype's own voice: a soft square blip"""
    t = tv(d); f = 440 * 2 ** ((m - 69) / 12); x = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 18)
    return soft(x, 200, 6000) * 0.18


def chord(t, notes, d=2.4, vel=0.34, g=0.24, name='piano'):
    for j, n in enumerate(notes): s.note(felt_piano(n, d, vel), t + 0.018 * j, g, -0.3 + 0.15 * j, 0.4, stem='keys', name=name)


def typing(t0, t1, seed=4):
    """his paddles on the keys: soft dull clicks, two hands, never a rhythm you could count"""
    g = np.random.default_rng(seed); t = t0
    while t < t1:
        s.fx(tick() * 0.5, t, g.uniform(0.03, 0.06), g.uniform(-0.2, 0.2), name='typing'); t += g.uniform(0.11, 0.3)


# ── the studio under everything: the record's surface, the room
s.sfx.bed(room(END + 0.5, 0.6), 600); s.sfx.bed(vinyl(END + 0.5, 3.5, 0.8), 300)

# ── the music: lo-fi, one chord a bar, piano on 1 and the "and" of 2, upright on the ones, brushes on 2 and 4 while he
#    makes (shots 1–2); minor and unresolved until the box lights, then major; thins to piano over the close and holds
#    one chord under the card
MINOR = [((45, (55, 60, 64, 67)), 'Am7'), ((41, (57, 60, 64, 65)), 'Fmaj7'), ((38, (53, 57, 60, 65)), 'Dm7'), ((40, (52, 57, 59, 62)), 'E7sus')]
MAJOR = [((41, (57, 60, 64, 67)), 'Fmaj7'), ((43, (53, 57, 60, 62)), 'G9sus'), ((36, (52, 55, 59, 62)), 'Cmaj9')]
start = S[0] + 0.25; bar = 0; lift = None
while start + bar * 4 * B < S[4] - 0.2:
    t0 = start + bar * 4 * B
    if t0 >= EV['fun'] - 0.2 and lift is None: lift = bar
    (root, notes), _ = (MAJOR[(bar - lift) % 3] if lift is not None else MINOR[bar % 4])
    making = t0 < S[2] - 0.1
    chord(t0, notes, d=2 * B, vel=0.32, g=0.22)
    chord(t0 + 1.5 * B, notes[1:], d=1.5 * B, vel=0.26, g=0.16)
    if t0 >= S[0] + 1.0: s.note(upright(root - 12 if root > 40 else root, 1.6 * B, 0.7), t0, 0.42, -0.1, 0.15, stem='bass', name='upright')
    if making:
        for b in (1, 3): s.note(brush_swish(B * 0.9, 0.5), t0 + b * B, 0.22, 0.3, 0.25, stem='drums', name='brush')
        for b in (0.5, 2.5): s.note(brush_tap(0.4), t0 + b * B, 0.12, 0.3, 0.25, stem='drums', name='brush tap')
    bar += 1
# the kalimba figure: a question while he makes, and the answer — a run up — as the one he reshaped lights
for i, m in enumerate((69, 72, 76, 74)): s.note(kalimba(m, 0.6), S[0] + 1.4 + i * B * 0.5, 0.28, 0.25, 0.4, stem='kalimba', name='the figure')
for i, m in enumerate((72, 76, 79, 81, 84)): s.note(kalimba(m, 0.7), EV['fun'] - 0.32 + i * B * 0.25, 0.3, 0.3, 0.45, stem='kalimba', name='"fun": the run up')

# ── the picture's events
typing(S[0] + 0.02, S[1] - 0.2)
for i in range(10):                                       # out of the laptop, over the lid, onto the stack
    to = EV[f'out{i}']
    s.fx(chip(76 + (i % 4) * 2, 0.07), to, 0.14, 0.0, at=to, name=f'box {i + 1} pops out' if i else 'the boxes pop out')
    s.fx(foley('clay', 'tap', 0.6), to + 0.5, 0.22, 0.25 + 0.02 * i, name='it lands on the stack')
for k in range(9):                                         # tested, ticked, into the crate: each a little lower than the last
    tt = EV[f'test{k}']; m = 79 - k
    for j, d in enumerate((0, 4, 7)): s.fx(chip(m + d, 0.06), tt + 0.02 + j * 0.06, 0.12, 0.35, name='the prototype plays' if j == 0 else 'its tune')
    s.fx(ui_tick(3000), tt + 0.28, 0.2, 0.35, at=tt + 0.28, name='WORKS ✓')
    s.fx(chip(52, 0.12), tt + 0.36, 0.06, 0.35, name='FUN: empty')
    s.fx(foley('wood', 'drop', 0.55), tt + 0.74, 0.18, 0.55, name='into the crate')
for i, t in enumerate((S[1], S[2], S[3])): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.85, 0.16, 0, at=t, name=f'cut {i + 2}')
s.fx(pop(0.9), EV['pick'] + 0.05, 0.18, 0.3, at=EV['pick'], name='the last one hops into his paddles')
s.fx(foley('clay', 'tap', 0.7), EV['pick'] + 0.6, 0.3, 0.3, name='he catches it')
s.fx(foley('clay', 'tap', 1.0), EV['squeeze'], 0.4, 0.25, at=EV['squeeze'], name='the squeeze: the clay gives')
s.fx(foley('clay', 'tap', 0.6), EV['squeeze'] + 0.5, 0.26, 0.25, name='it sets into its new shape')
s.fx(sparkle(91), EV['fun'] - 0.12, 0.2, 0.3, at=EV['fun'], name='it lights')
s.fx(chime(88, 0.6), EV['fun'] + 0.05, 0.18, 0.3, name='FUN: full')
s.fx(foley('wood', 'tap', 0.5), S[3] + 0.7, 0.24, 0.35, name='he sets it down by the crate')
# the drones, faint, panned the way they cross the window
s.fx(soft(whir(820, 860, S[1] - 0.4), 600, 3000), 0.4, 0.07, -0.4, name='a drone crosses the window')
s.fx(soft(whir(900, 940, 4.3), 600, 3000), S[3] + 0.3, 0.08, 0.4, name='a drone passes behind him')
s.fx(soft(whir(860, 880, END - S[3] - 1.4), 600, 3000), S[3] + 1.4, 0.05, -0.5, name='another, further off')

# ── the pop words: a soft hit each — "week" busy, the first "fun" deflated, the second "fun" the lift, "isn't" the low A
SND = {'ten': lambda t: chord(t, (57, 64, 67, 72), 1.1, 0.38, 0.24, '"week"'),
       'work': lambda t: (chord(t, (52, 57, 59, 62), 1.2, 0.34, 0.2, '"fun", not yet'), s.note(upright(40, 1.0, 0.6), t, 0.3, 0, 0.2, stem='bass', name='"fun", not yet: the low E')),
       'fun': lambda t: chord(t, (60, 64, 67, 71, 74), 1.6, 0.42, 0.26, '"fun"'),
       'isnt': lambda t: (chord(t, (45, 52, 57, 60, 64), 2.0, 0.4, 0.26, '"isn\'t"'), s.note(upright(33, 2.0, 0.85), t, 0.5, 0, 0.2, stem='bass', name='"isn\'t": the low A'))}
seen = set()
for w in EV['words']:
    if not w['pop']: continue
    t = w['t'] + 0.03
    if w['caption'] not in seen: seen.add(w['caption']); SND[w['caption']](t)
    else: s.fx(chip(76, 0.05), t, 0.12, 0.2, name=f'pop word: {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -2.5, why=f'caption {cp["id"]} reveal')

# ── Toko's card: his logo (the blink) and a held Cmaj9 under it, ringing out
s.fx(logo_toko(), EV['card'] + 0.01, 0.6, 0, name='the card: Toko\'s logo')
chord(EV['card'] + 0.5, (36, 43, 52, 55, 59, 62, 64), END - EV['card'] + 0.2, 0.32, 0.22, 'the card: the held chord')
s.note(upright(36, END - EV['card'], 0.7), EV['card'] + 0.05, 0.36, 0, 0.2, stem='bass', name='the card: the bass')

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + [(k, EV[k]) for k in ('pick', 'squeeze', 'fun', 'card')] + \
       [(f'out{i}', EV[f'out{i}']) for i in range(10)] + [(f'test{k}', EV[f'test{k}']) for k in range(9)] + \
       [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 1.2, tau=0.7, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
