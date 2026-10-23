"""One More Loop (Toko set 1/4) — the cue sheet. Not the house bed: lo-fi night, 84 BPM in F, a felt piano on Fmaj7 –
Em7 – Dm7 – Cmaj7 with a kalimba figure over it, an upright on the ones, a record's surface and the park under everything
(crickets at dusk and night, birds at dawn). The only electronic sounds in the film are the PHONE's: the prototype's
chiptune, a polite chime on every "One more change?", the tap on Yes. A drone pass is a faint, filtered high whir,
panned, never loud. Against the picture (film.js → events.json, any language): the lamp hums on, "hour" lands on the
prototype's little fanfare, the three rounds each chime and tap, the thermos clonks over, the dawn's last chime goes
unanswered, and Toko's card opens on his logo — the blink — over a held Fmaj9 that rings out. Toko's rules: no station
sting, no sign-off.

    uv run --with numpy --with soundfile python clay/loop/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from sfx import whoosh, tap, foley, logo_toko, WHOOSH
from rfsound import (SR, tv, noise, soft, felt_piano, kalimba, upright, vinyl, room, birds, chime, blip, whir, hum, thump,
                     lamp_click, ui_tick, brush_swish)

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


class LOFI:
    BPM = 84
    VERB = dict(t60=1.2, lo=140, hi=4200, pre=0.012, g=0.3, seed=84)    # outdoors at night: soft, not a room
    GLUE = dict(thresh=-20.0, ratio=1.8)
    EQ = dict(fc=4800.0, db=-2.5, hp=34.0)                               # tape-warm: the top rolled off


s = Session(END + 0.5, LOFI); B = 60 / LOFI.BPM


def crickets(d, rate=3.0, seed=3):
    """a field of crickets: short 4.6 kHz trills, sparse, two or three voices"""
    g = np.random.default_rng(seed); n = int(d * SR); out = np.zeros(n); tt = 0.1
    while tt < d - 0.3:
        f = g.uniform(4300, 5200); k = int(g.integers(3, 7))
        for j in range(k):
            L = 0.018; t = tv(L); x = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / L) ** 2 * 0.02
            a = int((tt + j * 0.034) * SR); out[a:a + len(x)] += x[:n - a]
        tt += g.exponential(1 / rate) + 0.15
    return out


def chip(m, d=0.09):
    """the prototype's own voice: a soft square blip"""
    t = tv(d); f = 440 * 2 ** ((m - 69) / 12); x = np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 18)
    return soft(x, 200, 6000) * 0.18


def chord(t, notes, d=2.4, vel=0.34, g=0.24, name='piano'):
    for j, n in enumerate(notes): s.note(felt_piano(n, d, vel), t + 0.018 * j, g, -0.3 + 0.15 * j, 0.4, stem='keys', name=name)


# ── the park under everything: the record's surface, the night air; crickets until dawn, birds after
s.sfx.bed(room(END + 0.5, 0.6), 600); s.sfx.bed(vinyl(END + 0.5, 3.5, 0.8), 300)
s.fx(crickets(S[3] - 0.2), 0.0, 0.5, 0.2, name='crickets'); s.fx(crickets(S[3] - 0.2, seed=5), 0.3, 0.35, -0.4, name='crickets, far')
s.fx(birds(END - S[3], 1.6, 4), S[3], 0.9, 0.3, name='dawn birds')

# ── the music: lo-fi, one chord a bar, piano on 1 and the "and" of 2, upright on the ones, a brushed swish on 2 and 4;
#    it thins to piano alone over the close (3) and the dawn (4), and holds one chord under the card
CH = [((41, (57, 60, 64, 67)), 'Fmaj7'), ((40, (55, 59, 62, 64)), 'Em7'), ((38, (53, 57, 60, 64)), 'Dm7'), ((36, (52, 55, 59, 64)), 'Cmaj7')]
start = S[0] + 0.25; bar = 0
while start + bar * 4 * B < S[4] - 0.2:
    t0 = start + bar * 4 * B; (root, notes), _ = CH[bar % 4]
    full = S[1] - 0.1 <= t0 < S[2]
    chord(t0, notes, d=2 * B, vel=0.32, g=0.22)
    chord(t0 + 1.5 * B, notes[1:], d=1.5 * B, vel=0.26, g=0.16)
    if t0 >= S[0] + 1.8: s.note(upright(root - 12 if root > 40 else root, 1.6 * B, 0.7), t0, 0.42, -0.1, 0.15, stem='bass', name='upright')
    if full:
        for b in (1, 3): s.note(brush_swish(B * 0.9, 0.5), t0 + b * B, 0.24, 0.3, 0.25, stem='drums', name='brush')
    bar += 1
# the kalimba figure: a little rising question, once at dusk and once (slower) at dawn
for i, m in enumerate((72, 76, 79, 77)): s.note(kalimba(m, 0.6), S[0] + 2.2 + i * B * 0.5, 0.3, 0.25, 0.4, stem='kalimba', name='the figure')
for i, m in enumerate((72, 76, 79, 77)): s.note(kalimba(m, 0.5), S[3] + 1.6 + i * B * 0.75, 0.26, 0.25, 0.45, stem='kalimba', name='the figure, slower')

# ── the picture's events
s.fx(lamp_click(), EV['lamp'] - 0.02, 0.3, -0.3, at=EV['lamp'], name='the lamp comes on'); s.fx(hum(100, 1.8) * 0.6, EV['lamp'], 0.1, -0.3, name='its hum')
for k, m in enumerate((79, 84, 88)): s.fx(chip(m, 0.1), EV['hour'] + 0.03 + k * 0.09, 0.32, 0.15, name='"hour": the prototype runs' if k == 0 else 'its fanfare')
for k in range(5): s.fx(chip(67 + (k % 3) * 5, 0.06), EV['hour'] + 0.5 + k * 0.33, 0.12, 0.15, name='the game plays')
for j, (key, tap_) in enumerate((('j1', 'tap1'), ('j2', 'tap2'), ('j3', None))):
    tj = EV[key]
    s.fx(chime(88 - j, 0.4), tj + 0.35, 0.28, 0.1, name=f'round {j + 1}: One more change?')
    for k in range(3): s.fx(chip(70 + k * 2 + j, 0.07), tj + 0.01 + k * 0.08, 0.16, 0.1, name=f'round {j + 1}: the new prototype')
    if tap_: s.fx(ui_tick(3000), EV[tap_], 0.4, 0.05, name=f'round {j + 1}: he taps Yes')
s.fx(foley('wood', 'drop', 0.8), EV['tip'] + 0.2, 0.4, 0.4, at=EV['tip'], name='the thermos tips over'); s.fx(thump(), EV['tip'] + 0.22, 0.25, 0.4)
for i, t in enumerate((S[1], S[2], S[3])): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.85, 0.16, 0, at=t, name=f'cut {i + 2}')
s.fx(soft(whir(820, 860, S[1] - 0.5), 600, 3000), 0.3, 0.07, -0.5, name='a drone, far over the park')
s.fx(soft(whir(900, 950, 3.0), 600, 3000), EV['slump'] - 0.4, 0.09, 0.6, name='a drone passes behind him')
s.fx(ui_tick(2600), EV['slump'], 0.18, 0.1, name='he slumps')
s.fx(chime(86, 0.5), EV['ping'], 0.24, 0.1, name='dawn: One more change?, unanswered')
s.fx(soft(whir(860, 880, 3.5), 600, 3000), EV['d4'], 0.05, -0.6, name='a drone, small, at dawn')

# ── the pop words: a soft hit each; the last ("night") on the piano's low F
SND = {'hour': lambda t: chord(t, (53, 60, 65, 69), 1.2, 0.4, 0.26, '"hour"'),
       'more': lambda t: chord(t, (52, 59, 64, 67), 1.1, 0.36, 0.22, '"more"'),
       'offers': lambda t: chord(t, (50, 57, 62, 65), 1.1, 0.36, 0.22, '"change"'),
       'night': lambda t: (chord(t, (41, 48, 53, 57, 60, 64), 2.2, 0.42, 0.28, '"night"'), s.note(upright(29, 2.0, 0.85), t, 0.5, 0, 0.2, stem='bass', name='"night": the low F'))}
seen = set()
for w in EV['words']:
    if not w['pop']: continue
    t = w['t'] + 0.03
    if w['caption'] not in seen: seen.add(w['caption']); SND[w['caption']](t)
    else: s.fx(chip(76, 0.05), t, 0.12, 0.2, name=f'pop word: {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -2.5, why=f'caption {cp["id"]} reveal')

# ── Toko's card: his logo (the blink) and a held Fmaj9 under it, ringing out
s.fx(logo_toko(), EV['card'] + 0.01, 0.6, 0, name='the card: Toko\'s logo')
chord(EV['card'] + 0.5, (41, 48, 55, 57, 60, 64, 67), END - EV['card'] + 0.2, 0.32, 0.22, 'the card: the held chord')
s.note(upright(29, END - EV['card'], 0.7), EV['card'] + 0.05, 0.36, 0, 0.2, stem='bass', name='the card: the bass')

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + [(k, EV[k]) for k in ('lamp', 'j1', 'j2', 'j3', 'tap1', 'tap2', 'tip', 'slump', 'ping', 'card')] + \
       [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 1.2, tau=0.7, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
