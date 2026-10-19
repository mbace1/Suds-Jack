"""You Looked At It (the pipeline cut) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) under the
pilot's own sound design (synth_rfp.py), re-timed to the plan so the Finnish and Japanese masters, longer where their
lines need it, are scored by this same file. The scenes keep the pilot's inner timings (copied from scenes/yl_*.js):
the wake word is SPOKEN (a formant voice, no words in it), the light wakes and answers, every look is a rubber stamp,
the receipt prints, every head turns on one beat and every light comes on at SOLD, and the mask lands in the pocket
with a cloth thump and keeps glowing there. Each caption's pop word gets a hit of its own.

    uv run --with numpy --with soundfile python papercut/you-looked/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import stamp, thump, voice, blip, glide, printer, cash_register, lamp_click

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
B = 60 / 112

# ── the music: lighter under the wake word, full from the bakery window
bed(s, S[0] + 0.3, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.32, 0, at=t, name=f'cut {i + 2}')

# ── 1 · Senate Square at four: the walker says the wake word; the light on the mask wakes and answers twice
s.fx(foley('paper', 'tap', 0.7), S[0], 0.4, 0, name='the open: card in the box'); motif(s, S[0] + 0.03, g=0.28)
for t, v, f in [(0.55, 'e', 180), (0.85, 'u', 200), (1.0, 'i', 230)]: s.fx(voice(f, v, 0.16), S[0] + t, 0.16, 0.25, name='HEY LOOKSY')
s.fx(glide(600, 1800, 0.18), S[0] + 1.5, 0.22, 0.3, name='the light wakes')
for k in range(2): s.fx(blip(1760), S[0] + 2.1 + k * 0.125, 0.3, 0.3, name='it answers')

# ── 2 · the bakery window: brackets snap onto the cake; ORDERED; ALSO ORDERED?
s.fx(tick(2, down=False), S[1] + 0.45, 0.3, 0.2, name='brackets lock on')
s.fx(stamp(), S[1] + 2 * B, 0.75, 0.2, name='ORDERED'); s.fx(chip(True), S[1] + 2 * B + 0.02, 0.25, 0.2)
s.fx(stamp(), S[1] + 4 * B, 0.5, -0.3, name='ALSO ORDERED?')

# ── 3 · the receipt prints down, a stamp a beat, and the total rings up
s.fx(printer(2.4), S[2] + 0.25, 0.18, 0, name='the receipt prints')
for k in range(4): s.fx(stamp(), S[2] + (k + 1) * B, 0.42, -0.2 + 0.13 * k, name=f'stamp {k + 1}')
s.fx(cash_register(), S[2] + 5 * B, 0.45, 0, name='TOTAL $249 + EVERYTHING'); s.fx(stamp(), S[2] + 5 * B, 0.6, 0)

# ── 4 · the tram stop under LOOKING IS FREE*: every head turns to the leaf at once; SOLD, and every light comes on
s.fx(swish(), S[3] + 2 * B, 0.35, 0, name='every head turns')
s.fx(chip(False), S[3] + 4 * B, 0.5, 0.2, name='SOLD')
for k in range(4): s.fx(blip(1500 + 90 * k), S[3] + 4 * B + 0.02 + k * 0.01, 0.16, -0.6 + 0.4 * k, name='every light')

# ── 5 · the mask into the pocket, a cloth thump; it glows through the card, slower each time
T_DROP, T_GLOW = 13.7 - 12.857, 14.2 - 12.857
s.fx(swish(), S[4] + T_DROP - 0.15, 0.25, -0.2, name='it drops'); s.fx(thump(), S[4] + T_DROP + 0.22, 0.6, 0, name='the pocket takes it')
for k, d in enumerate([0, 0.55, 1.25]): s.fx(glide(220, 160, 0.3), S[4] + T_GLOW + d, 0.25 - 0.05 * k, 0, name=f'glow {k + 1}')

# ── the captions' pop words: each lands on a hit
for w in EV['words']:
    if not w['pop']: continue
    t = w['t'] + 0.03
    if w['caption'] == 'last': s.fx(stamp(), t, 0.6, 0, name='"*Terms apply."'); accent(s, t, S[0], 0.3, name='terms apply'); s.fx(stinger('deadpan'), t + 0.4, 0.45)
    else: s.fx(pop(1.2), t, 0.28, 0.1, name=f'pop {w["w"]}'); accent(s, t, S[0], 0.22, name=w['caption'])
motif(s, S[4] + 0.2, g=0.3)
sting(s, END - 0.6)

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
