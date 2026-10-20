"""Per Caller (Coxon) — the cue sheet. The COXON palette (SOUND.md: the institution taking itself seriously, C minor,
low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part) against the plan's events
(pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/per-caller/score.py <events.json> <out.wav> [<report.json> <stems>]

One question — can an AI call your cellphone about the election without asking? A kitchen at night: the fridge hums,
and on "without asking" the phone buzzes against its stand, and keeps buzzing; on "consent" the SIGN HERE flag slaps on
and the buzzing stops dead. At the FCC a petition slides across the walnut and lands on "asked", and the stamp creaks
down and back up without landing. The calendar: a marker crosses out 19 October, the page rips, the marker circles
Election Day. Then the kitchen holds its breath while one caller's three cards land; on "per caller" the street lamps
clack on one by one over the queue, on the series' Neapolitan hit, and every card that lands gets its own paper tap
(the offsets come from the kit's own physics, scenes/pc_kit.js); the phone goes over the edge on a falling whistle and
hits the floor; the deadpan button.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, bass_drum, lamp_click, page_flutter, paper_slide, paper_rip, thump, hum, phone_buzz, fall_whistle, wood_creak, clock_tick, toy_blip
from sfx import whoosh, swish, pop, chip, tick, tap, slap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = s.B
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
D = [S[i + 1] - S[i] if i < 4 else END - S[i] for i in range(5)]
tP = c('pc_end.caller')
quiet = [(S[4] + 0.1, tP - 0.05)]            # the kitchen holds its breath while the first caller's three land

# the physics, as measured off the kit's own <phys> block (node pc_phys_test.mjs scenes/pc_kit.js): seconds from "Per"
LAND = [-0.658, -0.408, -0.125, 0.383, 0.383, 0.525, 0.525, 0.633, 0.883, 0.908, 0.992, 1.108, 1.242, 1.358, 1.467, 1.608, 1.717, 1.825, 1.967, 2.075, 2.183]
THROW = [0.16 + k * 0.36 for k in range(6)]                       # each new caller's first card leaves the window
FALL, HIT = c('pc_end.fall'), c('pc_end.hit')

# ── under everything: the room's air, the processional on the 84 grid, a held low brass chord a shot
s.sfx.bed(room(END, 1.0), 900)
k = 0
while k * B < S[4]:
    t = k * B; k += 1
    if t < 1.0 or any(a <= t < b for a, b in quiet): continue
    if k % 2: s.note(bass_drum(0.3), t, 0.3, 0, 0.25, stem='march', name='march')
    else: s.note(rim(0.4), t, 0.3, 0.3 if k % 4 else -0.3, 0.35, stem='march', name='clock')
for i, ch in enumerate(['Cm_lo', 'Fm', 'Ab', 'Fm']):
    for j, n in enumerate(Coxon.CH[ch][:3]): s.note(trombone(n, max(0.5, D[i] - 0.3), 0.16, a=0.6, r=0.6), S[i] + 0.05, 0.3, -0.3 + 0.3 * j, 0.5, stem='pad', name=f'pad {i + 1}')
for i, t in enumerate(S):
    s.note(bass_drum(0.5), t, 0.42, 0, 0.3, stem='drums', name=f'cut {i + 1}')
    if i and i < 4: s.roll_into(t, B * 0.9, 0.05, 0.35, 0.4)
s.ruff(S[0], 0.4)

# ── 1 · the question: the fridge, the clock; on "without asking" the phone buzzes against its stand, and keeps on
tR, tC = c('pc_table.ring'), c('pc_form.consent')
s.fx(hum(50, S[2] - S[0] - 0.4) * 0.5, S[0] + 0.2, 0.16, -0.4, name='the fridge')
s.chorale(S[0] + 0.3, 'Cm', 1.6, 0.3, 0.38)
n = 0
while tR + n * 1.1 < tC - 0.2:
    s.fx(phone_buzz(0.42), tR + n * 1.1, 0.7 if n == 0 else 0.5, 0.35 if tR + n * 1.1 < S[1] else 0.6, name='the phone buzzes' if n == 0 else f'buzz {n + 1}'); n += 1
s.fx(pop(1.4), tR, 0.3, 0.3, name='"without asking": UNKNOWN'); s.chorale(tR + 0.03, 'G', 1.8, 0.32, 0.38)

# ── 2 · today: only with consent. On "consent" the SIGN HERE flag slaps on, and the buzzing stops dead
s.fx(slap(), tC, 0.55, 0.25, name='"consent": SIGN HERE'); s.fx(foley('paper', 'tap'), tC, 0.5, 0.25)
s.fx(toy_blip(523), tC + 0.12, 0.25, 0.6, name='the call drops'); s.fx(toy_blip(392), tC + 0.2, 0.2, 0.6)
s.note(timpani(41, 1.2, 0.4), tC, 0.3, 0, 0.35); s.chorale(tC + 0.1, 'Fm', 2.4, 0.3, 0.36)

# ── 3 · the request: a petition slides across the walnut, lands on "asked"; the stamp creaks down, and back up
tS, tA = c('pc_desk.slide'), c('pc_desk.asked')
for i in range(int(D[2])): s.fx(clock_tick(i % 2 == 1), S[2] + 0.4 + i, 0.18, -0.3, name=f'the office clock {i + 1}')
s.fx(paper_slide(max(0.3, tA - tS + 0.05)) * 8, tS, 0.45, -0.3, name='the petition slides')
s.fx(foley('paper', 'drop'), tA, 0.8, 0, name='"asked": the petition lands'); s.fx(thump(), tA, 0.35)
s.hit(tA, 0.55, 36, crash_=False); s.chorale(tA + 0.05, 'Ab', 2.2, 0.32, 0.4)
s.fx(wood_creak(0.5), tA + 0.45, 0.3, 0.3, name='the stamp comes down…'); s.fx(wood_creak(0.4, 720), tA + 1.05, 0.25, 0.3, name='…and goes back up')

# ── 4 · the timing: the marker crosses out 19 October, the page rips, the marker circles Election Day
tX, tF, tN = c('pc_cal.closed'), c('pc_cal.flip'), c('pc_cal.nov')
for i in range(int(D[3])): s.fx(clock_tick(i % 2 == 1), S[3] + 0.4 + i, 0.18, -0.5, name=f'the wall clock {i + 1}')
s.fx(swish(), tX, 0.4, 0.1, name='"October": the marker crosses out 19'); s.fx(swish(), tX + 0.16, 0.35, -0.1)
s.fx(paper_rip(0.26), tF, 0.6, 0.3, name='the page rips'); s.fx(page_flutter(0.8), tF + 0.15, 0.4, 0.4)
s.fx(swish(), tN, 0.45, 0, name='"before Election Day": the circle'); s.note(timpani(43, 1.4, 0.5), tN, 0.4, 0, 0.35)
s.fx(tower_bell(55, 3.0), tN + 0.05, 0.22, -0.2, 0.5, name='the bell for the day')
s.fife_line(tN + 0.4, [(0, 79, 0.5), (0.5, 84, 0.5), (1, 87, 1)], g=0.24, pan=0.3)

# ── 5 · the answer. Quiet but for the first caller's three cards; on "per caller" the lamps clack on over the queue,
#       every card that lands gets a tap, the phone buzzes at each until it goes over the edge, and hits the floor
for i, d in enumerate(LAND):
    t = tP + d
    s.fx(foley('paper', 'tap', 0.7 + 0.3 * (i % 3 == 0)), t, 0.45 if i < 3 else 0.32, -0.4 + 0.8 * ((i * 7) % 11) / 10, name=f'card {i + 1} lands')
    if t < FALL - 0.1: s.fx(phone_buzz(0.16), t + 0.04, 0.22, 0.45, name=f'the phone counts {i + 1}')
for i, t0 in enumerate([-1.68, -1.30, -0.92]): s.fx(whoosh('short', 'in', bright=0.6), tP + t0, 0.12, -0.2, name='a card from the window')
for i, t0 in enumerate(THROW): s.fx(whoosh('short', 'in', bright=0.7), tP + t0, 0.14, -0.3 + 0.1 * i, name=f'caller {i + 2} throws')
for i in range(3): s.fx(lamp_click(), tP + 0.12 * i, 0.85, -0.5 + 0.35 * i, name='"Per": the lamps come on' if i == 0 else f'lamp {i + 2}')
s.hit(tP, 0.8, 37); s.chorale(tP, 'Db', 1.4, 0.8, 0.5); s.chorale(tP + 1.5, 'G', 1.6, 0.35, 0.4)
s.fx(foley('wood', 'slide'), FALL - 0.35, 0.35, 0.6, name='the stand scrapes to the edge')
s.fx(fall_whistle(0.62, 1900, 380), FALL, 0.55, 0.65, name='the phone goes over the edge')
s.fx(thump(), HIT, 0.8, 0.7, name='the phone hits the floor'); s.fx(foley('glass', 'tap'), HIT + 0.01, 0.45, 0.7); s.fx(foley('card', 'drop'), HIT + 0.02, 0.35, 0.7)
s.fx(stinger('deadpan'), HIT + 0.35, 0.6, name='the button')
END_HIT = min(HIT + 0.55, END - 1.0)
s.chorale(END_HIT, 'Cm', 2.4, 0.7, 0.5); s.fx(tower_bell(48, 3.0), END_HIT + 0.02, 0.35, -0.2, 0.5)
for i, n in enumerate([60, 55, 48]): s.note(trombone(n, 1.0 if i == 2 else 0.25, 0.8), END_HIT + 0.05 + i * B / 2, 0.36, 0.2, 0.5)

# every later word of a multi-word pop ("without ASKING", "Election DAY", "Per CALLER") gets its own knock, as it lands
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.3, 0.1, name=f'pop word {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.6, tau=0.6, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
