"""The Chair Is Taken (Coxon #5) — the cue sheet. The COXON palette (SOUND.md: the institution taking itself seriously,
C minor, low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part) written against the plan's
events, poured through the pipeline's mix chain. Every time comes from the picture's events (pipeline/plan.mjs), so
the Finnish and Japanese masters — longer where their lines need it — are scored by this same file.

    uv run --with numpy --with soundfile python papercut/chair-is-taken/score.py <events.json> <out.wav> [<report.json> <stems>]

v2 (owner, 18 Oct: "messaging too unclear"): one question — will you accept responsibility? — and three answers;
the insurance and the dial are gone. The one new sound in a Coxon film is the CALL: the screen in the chair joins
with a video-call chime where a witness would have sat down, and buffers in ticks. The room goes quiet on the cut
back to the table, and on "nobody" the hat lands on a dull tap and a deadpan button before the chorale closes.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, fife, bass_drum, snare_roll, gavel, lamp_click, wood_creak, rack_rattle, page_flutter, paper_slide, cam_chime, thump, card, stamp, hum, toy_blip
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = s.B
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(S[4] + 0.1, c('ct_end.land'))]          # the room holds its breath for the answer


def arrive(t, length='mid', g=0.6, pan=0.0, name='whoosh in'):
    s.fx(whoosh(length, 'in'), t - WHOOSH[length] * 0.8, g, pan, at=t, name=name)


# ── under everything: the chamber's air; the processional (bass drum on 1 and 3, the clock's rim on 2 and 4, on the
# 84 grid); and a held low brass chord for each shot — so the room is never just air between the hits. All of it
# stops for the last line.
s.sfx.bed(room(END, 1.0), 900)
k = 0
while k * B < S[4]:
    t = k * B; k += 1
    if t < 1.0 or any(a <= t < b for a, b in quiet): continue
    if k % 2: s.note(bass_drum(0.3), t, 0.3, 0, 0.25, stem='march', name='march')
    else: s.note(rim(0.4), t, 0.3, 0.3 if k % 4 else -0.3, 0.35, stem='march', name='clock')
PAD = ['Cm_lo', 'Fm', 'Ab', 'Fm']
for i, ch in enumerate(PAD):
    t0, t1 = EV[f's{i + 1}'], EV[f's{i + 2}']
    for j, n in enumerate(Coxon.CH[ch][:3]): s.note(trombone(n, max(0.5, t1 - t0 - 0.3), 0.16, a=0.6, r=0.6), t0 + 0.05, 0.3, -0.3 + 0.3 * j, 0.5, stem='pad', name=f'pad {i + 1}')
for i, t in enumerate(S):                                                    # every cut lands on the corps; the roll arrives at it
    s.note(bass_drum(0.5), t, 0.42, 0, 0.3, stem='drums', name=f'cut {i + 1}')
    if i: s.roll_into(t, B * 0.9, 0.05, 0.35, 0.4)
s.ruff(S[0], 0.4)

# ── shot 1 · the question: the lamps strike; a chorale for the room; the doors open as it ends — and nobody;
# a cart's wheels rattle closer under the cut
for i in range(2): s.fx(lamp_click(), c('ct_chamber.lamps') + i * 0.14, 0.7, -0.4 + 0.8 * i, name=f'lamp {i + 1}')
s.chorale(S[0] + 0.3, 'Cm', 1.6, 0.3, 0.38)
QPOP = next(w['t'] for w in EV['words'] if w['pop'] and w['caption'] == 'question')
s.chorale(QPOP + 0.03, 'G', 1.6, 0.32, 0.38)                                 # the question hangs on the dominant
s.fx(wood_creak(0.7, 520, 40), c('ct_chamber.doors'), 0.55, 0, 0.3, name='the doors')
s.fx(whoosh('long', 'out', 0.8), c('ct_chamber.doors') + 0.05, 0.35, 0, 0.3, name='the corridor air')
s.chorale(c('ct_chamber.doors'), 'Ab', 1.8, 0.35, 0.42); s.note(fife(84, 0.12, 0.5), c('ct_chamber.doors') + 1.1, 0.28, 0.4, 0.45, name='a wry pip: nobody')
s.fx(rack_rattle(1.2, 6), c('ct_chamber.rattle'), 0.35, 0.5, name='wheels, coming')

# ── shot 2 · the chair is taken: the cart rolls in and bumps the chair, the old subpoena slides off; the screen
# strikes and buffers; on "video" it JOINS (the call chime); the company's chip pops; a buffering blip
s.fx(rack_rattle(0.8, 7), c('ct_screen.cart'), 0.5, 0.5, name='the cart rolls in')
s.fx(foley('wood', 'drop'), c('ct_screen.bump'), 0.8, 0.1, name='bump'); s.fx(thump(), c('ct_screen.bump'), 0.4, name='bump body')
s.fx(paper_slide(0.5, 8) * 9, c('ct_screen.bump') + 0.05, 0.45, 0.2, name='the old subpoena slides off')
s.fx(toy_blip(1568), c('ct_screen.on'), 0.9, 0, 0.1, name='the screen strikes')
for i in range(3): s.fx(tick(i, down=False), c('ct_screen.on') + 0.26 + i * 0.12, 0.3, 0.1, name='buffering')
s.fx(cam_chime((79, 84, 91)), c('ct_screen.tile'), 0.8, 0, 0.15, name='the call joins')
s.chorale(c('ct_screen.tile') + 0.05, 'Fm', 2.4, 0.3, 0.38); s.note(timpani(41, 1.5, 0.45), c('ct_screen.tile') + 0.05, 0.35, -0.1, 0.35)
s.fx(chip(True), c('ct_screen.tile') + 1.4, 0.4, -0.3, name='SAFETY IS "CORE"')
for i in range(4): s.fx(tick(4 + i), c('ct_screen.tile') + 3.0 + i * 0.12, 0.25, 0.1, name='buffering again')

# ── shot 4 · the law: one tap of the gavel; the coffin card and the books drop onto the pans; on "law" the beam
# comes down hard — a civic hit, a Neapolitan chord
s.fx(gavel(), c('ct_scale.gavel'), 0.9, -0.3, name='the gavel'); s.note(bass_drum(0.8), c('ct_scale.gavel'), 0.5, 0, 0.3)
s.fx(swish(), c('ct_scale.load'), 0.3, 0, name='the loads fall'); s.fx(foley('card', 'drop'), c('ct_scale.load') + 0.35, 0.6, -0.3, name='the coffin card lands')
s.fx(foley('wood', 'drop', 0.9), c('ct_scale.load') + 0.47, 0.7, 0.3, name='the books land'); s.fx(thump(), c('ct_scale.load') + 0.47, 0.35, 0.3)
s.note(snare_roll(c('ct_scale.tip') - c('ct_scale.load') - 0.6, 0.05, 0.8, seed=81), c('ct_scale.load') + 0.6, 0.45, 0.15, 0.25)
s.fx(stamp(), c('ct_scale.tip'), 0.7, 0.2, name='"law": the beam comes down'); s.hit(c('ct_scale.tip'), 0.9, 37); s.chorale(c('ct_scale.tip'), 'Db', 1.4, 0.9, 0.5)
s.chorale(c('ct_scale.tip') + 1.6, 'G', 1.8, 0.35, 0.4)

# ── shot 5 · everybody: the hat hops palm to palm on a plastic tap and a swish each; on "Everybody" every hand goes
# up (a rustle, the fife's wry run); it leaves on a whoosh
t0, STEP = c('ct_hat.first'), 0.62
for i in range(6):
    s.fx(tap(), t0 + i * STEP, 0.45, -0.7 + i * 0.28, name=f'catch {i + 1}')
    if i < 5: s.fx(swish(), t0 + i * STEP + 0.08, 0.25, -0.6 + i * 0.28, name=f'toss {i + 1}')
s.fx(foley('paper', 'slide'), c('ct_hat.pop'), 0.4, 0, name='every hand up'); s.fx(pop(1.2), c('ct_hat.pop'), 0.3, name='pop word')
s.fife_line(c('ct_hat.pop') + 0.05, [(0, 79, 0.5), (0.5, 84, 0.5), (1, 87, 0.5), (1.5, 91, 1)], g=0.3, pan=0.3)
s.note(timpani(43, 1.2, 0.45), c('ct_hat.pop'), 0.35, -0.1, 0.35)
s.fx(whoosh('mid', 'out'), c('ct_hat.gone'), 0.4, 0.6, name='the hat leaves')
s.chorale(S[3] + 3.4, 'Fm', 2.6, 0.28, 0.36)

# ── shot 5 · the answer: the room goes quiet on the cut back to the table; on "nobody" the hat drops onto it: a
# dull tap, the deadpan button, and the chorale closes in C minor with the hall's bell
s.fx(hum(60, 2.2) * 0.5, S[4], 0.3, name='the screen hums in the quiet')
s.fx(whoosh('short', 'in'), c('ct_end.land') - WHOOSH['short'] * 0.8, 0.45, -0.4, at=c('ct_end.land') - 0.01, name='the hat drops')
s.fx(tap(dull=True), c('ct_end.land'), 1.0, -0.3, name='"nobody": the hat lands on the table'); s.fx(stinger('deadpan'), c('ct_end.land') + 0.05, 0.6)
for i in range(3): s.fx(foley('card', 'tap', 0.5 - i * 0.12), c('ct_end.land') + 0.24 + i * 0.24, 0.35, -0.3, name=f'the hat rocks {i + 1}')
END_HIT = c('ct_end.land') + 0.9
s.chorale(END_HIT, 'Cm', 2.6, 0.75, 0.5); s.fx(tower_bell(48, 4.0), END_HIT + 0.02, 0.4, -0.2, 0.5)
for i, n in enumerate([60, 55, 48]): s.note(trombone(n, 1.2 if i == 2 else 0.3, 0.8), END_HIT + 0.05 + i * B / 2, 0.38, 0.2, 0.5)
for w in EV['words']:                                                          # the pop words the shots do not already answer
    if w['pop'] and w['caption'] in ('question', 'came'): s.fx(pop(1.4), w['t'] + 0.03, 0.32, 0.2, name=f'pop {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

# ── what the picture says must be heard, and what is exempt
cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
exempt = {}
s.render(OUT, ring_from=END_HIT + 1.0, tau=1.0, end=END, cues=cues, exempt=exempt, quiet=quiet, stems_dir=STEMS, report=REP)
