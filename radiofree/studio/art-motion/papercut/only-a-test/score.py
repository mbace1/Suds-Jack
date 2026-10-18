"""It Was Only a Test (EU) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds
against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file. The
footprints are the instrument: every glowing print that appears is a soft step with a celesta note on it, so a trail
is a little tune walking somewhere it should not be. The labs hum; the EU's letters clatter through the slots and
EXEMPT lands as a rubber stamp; the last walk comes toward you, each step closer and lower, onto your own mat.

    uv run --with numpy --with soundfile python papercut/only-a-test/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import stamp, press_stamp, hum, led_flicker, knock, pin_wobble, pat, celesta, riser, glide, lamp_click, clank, paper_slide, thump, sparkle

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
WALK = [69, 72, 76, 74, 79, 76, 81, 79]                                 # A minor pentatonic up and back: the trail's tune

def step(t, i, g=0.22, pan=None, low=0):
    """one glowing footprint: a soft pad of a foot, and a note of the trail's tune on it"""
    pan = (-0.25 if i % 2 else 0.25) if pan is None else pan
    s.fx(pat(0.5), t, g, pan, name='step'); s.note(celesta(WALK[i % len(WALK)] - low, 0.35), t + 0.005, g * 0.7, pan, 0.35, name='step note')

# ── the music: lighter under the question, full once the first trail is walking
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.35, 0, at=t, name=f'cut {i + 2}')

# ── shot 1 · the door: the lab hums, light leaks from under it; on "test" the door shudders and the first steps come out
s.fx(hum(100, S[1] - S[0]), S[0], 0.06, 0, name='the open: the lab hums'); motif(s, S[0] + 0.05, g=0.3)
s.fx(led_flicker(0.5), S[0] + 0.1, 0.12, 0.2, name='the TEST light')
s.fx(riser(1.4, 300, 3200), c('ot_door.glow'), 0.12, 0, name='light under the door'); s.fx(glide(900, 1800, 0.3), c('ot_door.glow'), 0.12, 0, name='glow')
tT = c('ot_door.test')
for i in range(3): s.fx(knock(0.75 - i * 0.18, 260), tT + i * 0.07, 0.5, 0, name='"test": the door shudders')
s.fx(pin_wobble(0.7, 980), tT + 0.04, 0.22, 0.1, name='the sign swings'); accent(s, tT, S[0], 0.25, name='test')
for j in range(4): step(tT + 0.35 + j * 0.38, j)

# ── shot 2 · July: the trail walks along the pavement and up the steps; on "systems" the door lights, then the windows
tW, tI = c('ot_house.walk'), c('ot_house.in'); span = max(0.5, tI - tW)
s.fx(glide(500, 1400, 0.25), tW, 0.12, -0.4, name='the trail sets off')
for i in range(12): step(tW + (i + 1) / 12 * span, i, pan=-0.5 + i / 11)
s.fx(chip(True), tI, 0.5, 0.3, name='"systems": the door lights'); s.fx(sparkle(88), tI + 0.02, 0.2, 0.3); accent(s, tI, S[0], 0.28, name='systems')
for k in range(5): s.fx(lamp_click(), tI + 0.35 + k / 5 * 1.4, 0.3, 0.3 - k * 0.05, name=f'window {k + 1}')

# ── shot 3 · Anthropic: three trails at once; on "organisations" three doors, then their windows
tW, tL = c('ot_three.walk'), c('ot_three.lit')
s.fx(glide(500, 1400, 0.25), tW, 0.12, -0.5, name='three trails set off')
for i in range(3):
    t0 = tW + i * 0.3; n = 10 + i * 2; sp = max(0.5, tL - 0.05 - t0)
    for j in range(n): step(t0 + (j + 1) / n * sp, j + i * 2, g=0.13, pan=-0.6 + 0.5 * i + 0.1 * j / n)
for i in range(3): s.fx(chip(True), tL + i * 0.08, 0.42 - i * 0.06, -0.3 + i * 0.4, name=f'"organisations": door {i + 1}')
accent(s, tL, S[0], 0.28, name='organisations')
for i in range(3):
    for k in range(5): s.fx(lamp_click(), tL + 0.4 + i * 0.15 + k / 5 * 1.3, 0.16, -0.3 + i * 0.4, name='windows')

# ── shot 4 · the EU: two letters fly in and clatter through the slots on "questions"; EXEMPT stamps under each sign
tP, tE = c('ot_letter.post'), c('ot_letter.exempt')
for i in range(2):
    tA = tP + i * 0.12
    s.fx(whoosh('mid', 'in'), tA - 0.75, 0.3, -0.5 + i, name='a letter flies in'); s.fx(paper_slide(0.2), tA - 0.2, 0.3, -0.4 + 0.8 * i, name='into the slot')
    s.fx(clank(0.8, 900), tA, 0.42, -0.4 + 0.8 * i, name='"questions": the letterbox flap')
accent(s, tP, S[0], 0.25, name='questions')
for i in range(2): s.fx(press_stamp(1.0 - i * 0.15), tE + i * 0.14, 0.7, -0.35 + 0.7 * i, name='EXEMPT')
s.fx(stamp(), tE, 0.35, -0.35)

# ── shot 5 · your own front door: the last trail crosses the road toward you, louder and lower each step; on "lets
# itself in" the last three steps land on the mat, one a word, and the mat lights
tM = c('ot_street.mat'); t0 = S[4] + 0.35; sp = max(0.6, tM - t0)
pops = [w['t'] for w in EV['words'] if w['caption'] == 'last' and w['pop']]
for i in range(11):
    t = t0 + (i + 1) / 11 * sp
    if t < tM - 0.05: step(t, i, g=0.1 + 0.2 * i / 10, pan=0.4 * (1 - i / 10) * (1 if i % 2 else -1), low=(i // 4) * 12)
for j, t in enumerate(pops): step(t + 0.01, j, g=0.42, pan=0.12 * (-1) ** j, low=12); s.fx(thump(), t, 0.3 - j * 0.06, 0, name=f'pop word {j + 1}: on the mat')
s.fx(sparkle(84), tM + 0.05, 0.22, 0, name='the mat lights'); accent(s, tM, S[0], 0.3, name='lets itself in')
s.fx(stinger('deadpan'), tM + 0.9, 0.45)
motif(s, S[4] + 0.2, g=0.35)
sting(s, END - 0.6)

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
