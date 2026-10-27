"""Five Is the New Fifty (Toko set 3/4) — the cue sheet. The Toko set's family, not the house bed: the same felt piano,
kalimba, upright and brushes as One More Loop, in daylight and at the film's own 112 BPM in F. The beat IS the typing:
in frame 0 the five laptops tick together on every beat and there is no other percussion. When the wall flies out
(a long whoosh on its lines, a creak in the rigging) the band drops to piano and a low upright over the ghost hall's
empty fluorescent hum, and each teammate's part pops out on a bubble and a square chip in its maker's note. Toko's
laptop chimes film 1's "One more change?"; it gets a falling two-note no, the lid shuts, the laptop slides, the box
unfolds on a card flip, the four parts fly home and tap in, and the ghost monitors click off back to front. On
"deciding" the cabinet's own chiptune fanfare plays; the wall drops back in with a thud, and Toko's card opens on his
logo — the blink — over a held Fmaj9 that rings out. Toko's rules: no station sting, no sign-off.

    uv run --with numpy --with soundfile python clay/fivefifty/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from sfx import whoosh, pop, foley, logo_toko, WHOOSH
from rfsound import (SR, tv, soft, felt_piano, kalimba, upright, room, chime, whir, thump, ui_tick, brush_swish, tick,
                     led_tick, office_hum, wood_creak, card_flip)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


class STUDIO:
    BPM = 112
    VERB = dict(t60=0.9, lo=160, hi=5200, pre=0.010, g=0.26, seed=112)  # the studio: a small warm room
    GLUE = dict(thresh=-20.0, ratio=1.8)
    EQ = dict(fc=5200.0, db=-2.0, hp=34.0)                               # tape-warm, a little brighter than the night


s = Session(END + 0.5, STUDIO); B = 60 / STUDIO.BPM


def chip(m, d=0.09):
    """the cabinet's and the parts' voice: a soft square blip"""
    t = tv(d); f = 440 * 2 ** ((m - 69) / 12); x = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 18)
    return soft(x, 200, 6000) * 0.18


def key(seed):
    """one laptop key: a short plastic tick, a little different for each of the five"""
    g = np.random.default_rng(seed); x = tick() * g.uniform(0.7, 1.0)
    return soft(x, 900 + 300 * g.random(), 9000)


def chord(t, notes, d=2.4, vel=0.34, g=0.24, name='piano'):
    for j, n in enumerate(notes): s.note(felt_piano(n, d, vel), t + 0.018 * j, g, -0.3 + 0.15 * j, 0.4, stem='keys', name=name)


# ── the room under everything; the ghost hall's empty fluorescent hum while the wall is out and the hall is lit
s.sfx.bed(room(END + 0.5, 0.5), 600)
hall0, hall1 = EV['flyOut'] + 0.3, EV['dark0'] + 0.3
hum_ = office_hum(hall1 - hall0); hum_ *= np.minimum(1, tv(hall1 - hall0) / 0.8)
s.fx(soft(hum_, 90, 3000), hall0, 0.22, -0.2, 0.5, name='the ghost hall: empty, lit')

# ── the music. One chord a bar, piano on 1 and the "and" of 2, upright on the ones; brushes only once the build starts.
#    Frame 0: Fmaj7 – Em7. The hall: Dm9 – Bbmaj7, piano thinned. The chip and the build: Gm7 – C9sus. Lit: Fmaj7 – Bb6.
BARS = [((41, (57, 60, 64, 67)), 'Fmaj7'), ((40, (55, 59, 62, 64)), 'Em7'),
        ((38, (53, 57, 60, 64)), 'Dm9'), ((34, (53, 57, 62, 65)), 'Bbmaj7'),
        ((43, (53, 58, 62, 65)), 'Gm7'), ((36, (55, 58, 62, 65)), 'C9sus'),
        ((41, (57, 60, 64, 69)), 'Fmaj7'), ((34, (55, 58, 62, 67)), 'Bb6')]
for bar, ((root, notes), name) in enumerate(BARS):
    t0 = S[0] + bar * 4 * B
    if t0 >= S[4] - 0.2: break
    hall = S[1] - 0.1 <= t0 < S[2] - 0.1
    chord(t0, notes, d=2 * B, vel=0.3 if hall else 0.32, g=0.2 if hall else 0.22, name=name)
    if not hall: chord(t0 + 1.5 * B, notes[1:], d=1.5 * B, vel=0.26, g=0.16, name=name + ', the and of 2')
    s.note(upright(root - 12 if root > 40 else root, 1.6 * B, 0.7), t0, 0.42 if not hall else 0.36, -0.1, 0.15, stem='bass', name='upright')
    if t0 >= EV['core'] - 4 * B:
        for b in (1, 3):
            if t0 + b * B < S[4] - 0.1: s.note(brush_swish(B * 0.9, 0.5), t0 + b * B, 0.22, 0.3, 0.25, stem='drums', name='brush')
# the kalimba figure: the same rising question as film 1, here answered — it climbs on to the fifth
for i, m in enumerate((72, 76, 79, 77)): s.note(kalimba(m, 0.6), S[0] + 2 * B + i * B * 0.5, 0.28, 0.25, 0.4, stem='kalimba', name='the figure')
for i, m in enumerate((72, 76, 79, 84)): s.note(kalimba(m, 0.6), EV['lit'] + 1.0 + i * B * 0.5, 0.26, 0.25, 0.4, stem='kalimba', name='the figure, answered')

# ── the typing: the beat. Frame 0 in sync (a key on every beat, all five at once); after it, each to its own phase
for n in range(int(S[1] / B) + 1):
    t = n * B
    if 0.05 < t < S[1] - 0.05:
        for i in range(5): s.fx(key(n * 5 + i), t + 0.004 * i, 0.09, -0.6 + 0.3 * i, name='frame 0: five keys on the beat' if i == 0 else 'key')
for i in (0, 1, 3, 4):   # the team keeps typing through 2 and 3, off the beat and quieter, until the cabinet lights
    for n in range(int(S[1] / B), int(EV['lit'] / B) + 1):
        t = n * B - (i * 0.9 / np.pi) * B
        if S[1] + 0.1 < t < EV['lit'] - 0.1 and not (EV['flyOut'] < t < EV['flyOut'] + 1.0):
            s.fx(key(1000 + n * 5 + i), t, 0.05, -0.6 + 0.3 * i, name='the team, typing')

# ── 2: the wall flies out on its lines; the parts pop out of the four laptops and land in front of them
s.fx(whoosh('long', 'out', 0.8, d=1.4), EV['flyOut'], 0.3, 0.0, at=EV['flyOut'], name='the wall flies out')
s.fx(wood_creak(0.6, 520), EV['flyOut'] + 0.1, 0.2, 0.3, name='the rigging creaks')
s.fx(thump() * 0.6, EV['flyOut'] + 1.15, 0.14, 0.0, name='it stops, up in the flies')
MAKER = (72, 74, 79, 76)   # each teammate's note: a C-major pentatonic step, never the same twice in a row
for k in range(4):
    tp = EV[f'pop{k}']; pan = (-0.6, 0.6, -0.3, 0.3)[k]
    s.fx(pop(1.0 + 0.12 * k), tp, 0.34, pan, at=tp, name=f'part {k + 1} pops out')
    s.fx(chip(MAKER[k], 0.12), tp + 0.02, 0.24, pan, name=f'part {k + 1}: its maker\'s note')
    s.fx(chip(MAKER[k] + 12, 0.07), tp + 0.11, 0.12, pan, name='its octave')
    s.fx(foley('card', 'drop', 0.7), tp + 0.6, 0.28, pan, at=tp + 0.6, name=f'part {k + 1} lands')

# ── 3: One more change? No. Shut, push, unfold, fly home, press home; the ghost monitors click off back to front
s.fx(chime(88, 0.4), EV['chip'] + 0.05, 0.28, 0.1, at=EV['chip'], name='One more change? (film 1\'s chime)')
for k, m in enumerate((67, 62)): s.note(felt_piano(m, 0.5, 0.36), EV['shake'] + 0.02 + k * 0.22, 0.24, 0.0, 0.3, stem='keys', name='no' if k == 0 else 'no, the fall')
s.fx(foley('clay', 'drop', 0.9), EV['close'] + 0.38, 0.4, 0.0, at=EV['close'] + 0.4, name='he shuts the lid')
s.fx(foley('clay', 'slide', 0.8), EV['push'], 0.3, 0.0, at=EV['push'], name='and pushes it away')
s.fx(card_flip(), EV['core'], 0.42, 0.0, at=EV['core'], name='the box unfolds')
s.fx(pop(0.8), EV['core'] + 0.28, 0.26, 0.0, name='it stands up')
for k in range(4):
    tf = EV[f'fly{k}']; pan = (-0.5, 0.5, -0.25, 0.25)[k]
    s.fx(whoosh('short', 'in', 1.0, d=0.5), tf + 0.05, 0.14, pan, at=tf + 0.55, name=f'part {k + 1} flies home')
    s.fx(foley('card', 'tap', 0.8), tf + 0.53, 0.32, pan, at=tf + 0.55, name=f'part {k + 1} taps in')
    s.fx(chip(MAKER[k] + 12, 0.06), tf + 0.55, 0.1, pan, name='and its note')
for r in range(10):   # back row first: the clicks fall, and get closer
    td = EV[f'dark{r}']
    s.fx(led_tick(2600 + 90 * r), td, 0.16 + 0.015 * r, -0.4 + 0.08 * r, name='a ghost row goes dark' if r == 9 else 'a ghost row goes dark')
s.fx(soft(whir(820, 860, S[1] - 0.3), 600, 3000), 0.2, 0.05, -0.5, name='a drone, far outside the window')

# ── 4: the cabinet lights on its own chiptune; all five turn; the wall drops back in
for k, m in enumerate((72, 76, 79, 84, 79, 84)):
    s.fx(chip(m, 0.1 if k < 5 else 0.24), EV['lit'] + k * 0.075, 0.26, 0.0, name='the cabinet lights: its fanfare' if k == 0 else 'its fanfare')
s.fx(ui_tick(3000), EV['lit'] + 0.6, 0.16, 0.0, name='PLAY')
s.fx(whoosh('long', 'in', 0.7, d=1.2), EV['flyIn'], 0.24, 0.0, at=EV['flyIn'] + 1.2, name='the wall flies back in')
s.fx(wood_creak(0.5, 480, seed=11), EV['flyIn'] + 0.2, 0.16, -0.3, name='the rigging')
s.fx(thump(), EV['flyIn'] + 1.17, 0.36, 0.0, at=EV['flyIn'] + 1.2, name='the wall lands')
s.fx(soft(whir(900, 940, END - S[3] - 1.5), 600, 3000), S[3] + 1.5, 0.05, 0.6, name='a drone passes outside again')
for i, t in enumerate((S[2], S[3])): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.85, 0.14, 0, at=t, name=f'cut {i + 3}')

# ── the pop words: a soft hit each; "deciding" on the piano's low F
SND = {'five': lambda t: chord(t, (53, 57, 60, 65), 1.1, 0.38, 0.24, '"five"'),
       'floor': lambda t: chord(t, (50, 57, 60, 64), 1.3, 0.34, 0.2, '"floor"'),
       'typing': lambda t: chord(t, (55, 58, 62, 67), 1.1, 0.36, 0.22, '"typing"'),
       'deciding': lambda t: (chord(t, (41, 48, 53, 57, 60, 64), 2.0, 0.42, 0.28, '"deciding"'),
                              s.note(upright(29, 1.8, 0.85), t, 0.5, 0, 0.2, stem='bass', name='"deciding": the low F'))}
for w in EV['words']:
    if w['pop']: SND[w['caption']](w['t'] + 0.03)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -2.5, why=f'caption {cp["id"]} reveal')

# ── Toko's card: his logo (the blink) and a held Fmaj9 under it, ringing out
s.fx(logo_toko(), EV['card'] + 0.01, 0.6, 0, name='the card: Toko\'s logo')
chord(EV['card'] + 0.5, (41, 48, 55, 57, 60, 64, 67), END - EV['card'] + 0.2, 0.32, 0.22, 'the card: the held chord')
s.note(upright(29, END - EV['card'], 0.7), EV['card'] + 0.05, 0.36, 0, 0.2, stem='bass', name='the card: the bass')

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + \
       [(k, EV[k]) for k in ('flyOut', 'pop0', 'pop1', 'pop2', 'pop3', 'chip', 'shake', 'push', 'core', 'lit', 'flyIn', 'card')] + \
       [('lid shut', EV['close'] + 0.4), ('wall home', EV['flyIn'] + 1.2)] + [(f'part {k + 1} home', EV[f'fly{k}'] + 0.55) for k in range(4)] + \
       [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 1.2, tau=0.7, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
