"""That's a Wednesday (Coxon) — the cue sheet. The COXON palette (SOUND.md: the institution taking itself seriously,
C minor, low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part) against the plan's events
(pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/thats-a-wednesday/score.py <events.json> <out.wav> [<report.json> <stems>]

One question — should you ask a chatbot when to vote? A fairground at night: a music box under the fortune booth, its
ball typing in blips, and on "when to vote" it flares on a held dominant. Ten answers on a line; on "29%" three go bad
(a rip, a blot, a curl), and on "incomplete, wrong, outdated" each drops into the sawdust with its own paper tap. The slot prints, tick by tick, and
ELECTION DAY lands on a stamp and a sour chord; a rip as the hand takes it. Tuesday is the gym: doors, a murmur, the
day card flips on "Tuesday" to a major chorale and the fife. Wednesday is wind (a marked quiet span), footsteps, the
calendar slapped on the door; on "Wednesday" the marker squeaks twice and rings TUE 3, the deadpan button; the end card
lands on the bell and the chorale resolves to C.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
import numpy as np
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, fife, bass_drum, page_flutter, paper_slide, thump, stamp, toy_blip, music_box, crowd, brush_tap, chime, glide, noise, tv
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, slap, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = 60 / 112                          # the film's own grid (112 BPM)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
D = [S[i + 1] - S[i] if i < 4 else END - S[i] for i in range(5)]
quiet = [(S[4] + 0.1, c('wd_wednesday.cal') - 0.02)]                                  # Wednesday morning: wind and nobody

def wind(d, seed=4):
    t = tv(d); g = np.random.default_rng(seed).standard_normal(len(t))
    from rfsound import soft
    return soft(g, 250, 1800) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.35 * t + 1) ** 2) * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.4) * 0.05

def squeak(d=0.25, f0=1700, f1=2300):
    """a felt marker dragged on paper: a pitched squeal over a dry scratch"""
    t = tv(d); return glide(f0, f1, d) * 0.35 + noise(d, 2500, 9000) * np.sin(np.pi * t / d) * 0.18

# ── under everything: the night's air, the processional on the 112 grid, a held low brass chord a shot
s.sfx.bed(room(END, 1.0), 900)
k = 0
while k * B < S[4]:
    t = k * B; k += 1
    if t < 0.8: continue
    if k % 2: s.note(bass_drum(0.3), t, 0.28, 0, 0.25, stem='march', name='march')
    else: s.note(rim(0.4), t, 0.26, 0.3 if k % 4 else -0.3, 0.35, stem='march', name='clock')
for i, ch in enumerate(['Cm_lo', 'Fm', 'Ab', 'C']):
    for j, n in enumerate(Coxon.CH[ch][:3]): s.note(trombone(n, max(0.5, D[i] - 0.3), 0.14, a=0.6, r=0.6), S[i] + 0.05, 0.28, -0.3 + 0.3 * j, 0.5, stem='pad', name=f'pad {i + 1}')
for i, t in enumerate(S):
    s.note(bass_drum(0.5), t, 0.42, 0, 0.3, stem='drums', name=f'cut {i + 1}')
    if i: s.roll_into(t, B * 0.9, 0.05, 0.35, 0.4)
s.ruff(S[0], 0.4)

# ── 1 · the question: the booth's music box, a few steps, the bubble; on "when to vote" the ball flares
MB = [72, 75, 79, 84, 79, 75, 74, 77, 80, 77, 74, 71]
for i in range(int((S[2] - 0.3) / (B / 2))):
    t = 0.3 + i * B / 2
    if t > S[2] - 0.2: break
    s.note(music_box(MB[i % len(MB)], -6.0 * max(0, t - S[1]) / D[1]), t, 0.24 if t < S[1] else 0.16, 0.35, 0.4, stem='booth', name='the booth plays')
tA, tB = c('wd_booth.ask'), c('wd_booth.ball')
for i in range(3): s.fx(brush_tap(0.5), 0.12 + i * 0.26, 0.5, -0.3, name=f'step {i + 1}')
s.fx(pop(1.1), tA, 0.4, -0.25, name='the question pops up'); s.fx(foley('paper', 'tap'), tA, 0.35, -0.25)
s.fx(chime(88), tB, 0.35, 0.3, name='"when to vote?": the ball flares'); s.fx(toy_blip(2349), tB + 0.02, 0.3, 0.3)
s.note(timpani(43, 1.4, 0.5), tB, 0.32, 0, 0.35); s.chorale(tB + 0.03, 'G', 1.8, 0.3, 0.36)
for i in range(14): s.fx(toy_blip([2093, 2349, 2637][i % 3]), tB + 0.5 + i * 0.27, 0.12, 0.3, name='the ball types')
s.chorale(S[0] + 0.3, 'Cm', 1.4, 0.28, 0.34)

# ── 2 · the first fact: the last answer flies out to its peg; on "29%" three go bad and drop, one after another
tP, tF, d1 = c('wd_answers.print'), c('wd_answers.fall'), c('wd_answers.drop1'); d3 = max(d1 + 0.3, c('wd_answers.drop3')); DROP = [d1, (d1 + d3) / 2, d3]
s.fx(whoosh('short', 'out'), tP, 0.35, -0.5, name='the tenth answer flies out'); s.fx(foley('paper', 'tap'), tP + 0.5, 0.4, -0.3, name='pegged')
s.fx(chip(False), tF, 0.4, 0, name='"29%"'); s.note(timpani(36, 1.4, 0.55), tF, 0.36, 0, 0.35)
GAP, DEF, FALL = 0.14, 0.25, 0.55                                                      # wd_kit.js: the bad tickets' clock
for i, (how, pan) in enumerate([('tear', 0.0), ('blot', 0.4), ('curl', 0.2)]):
    tb = tF + i * GAP
    if how == 'tear': s.fx(paper_slide(0.2, 31) * 9, tb, 0.5, pan, name='an answer tears in half')
    elif how == 'blot': s.fx(foley('paper', 'tap', 0.6), tb, 0.4, pan, name='an answer blots'); s.fx(toy_blip(523), tb + 0.02, 0.18, pan)
    else: s.fx(page_flutter(0.3, 12) * 6, tb, 0.45, pan, name='an answer yellows')
    s.fx(swish(), DROP[i], 0.22, pan, name=f'bad answer {i + 1} lets go ({["incomplete", "wrong", "outdated"][i]})')
    s.fx(foley('paper', 'drop'), DROP[i] + FALL, 0.55, pan, name=f'bad answer {i + 1} lands'); s.fx(tick(i, down=True), DROP[i] + FALL, 0.2, pan)
s.chorale(tF + 2.2, 'Fm', 2.4, 0.26, 0.34)

# ── 3 · the second fact: the slot prints, tick by tick; ELECTION DAY lands; a rip as the hand takes it
tS, tD, tT = c('wd_ticket.slot'), c('wd_ticket.date'), c('wd_ticket.tear')
n = max(4, int((tD - tS) / 0.06))
for i in range(n): s.fx(tick(i % 4, down=bool(i % 2)), tS + i * (tD - tS) / n, 0.22, 0.05, name='the slot prints')
s.fx(stamp(), tD, 0.6, 0, name='"Election Day": the ticket lands'); s.note(timpani(37, 1.4, 0.6), tD, 0.36, 0, 0.35)
s.chorale(tD + 0.02, 'Db', 1.6, 0.5, 0.42)
s.fx(whoosh('short', 'in'), tT - WHOOSH['short'] * 0.8 - 0.3, 0.3, 0.2, at=tT - 0.3, name='the hand comes up')
s.fx(paper_slide(0.22, 33) * 10, tT, 0.6, 0.15, name='the hand tears it off'); s.fx(tap(), tT, 0.35, 0.15)
s.fife_line(tT + 0.35, [(0, 79, 0.5), (0.5, 78, 0.5), (1, 77, 1)], g=0.22, pan=0.3)

# ── 4 · the third fact: Tuesday — the doors, the murmur, the queue; on "Tuesday" the card flips, major and bright
tO, tU = c('wd_tuesday.open'), c('wd_tuesday.tue')
s.fx(thump(), tO, 0.45, 0, name='the doors open'); s.fx(foley('wood', 'tap'), tO + 0.05, 0.4, 0.1)
s.fx(crowd(D[3] - tO + S[3] - 0.3) * 0.5, tO + 0.1, 0.35, 0.1, name='the queue murmurs')
for i in range(10): s.fx(brush_tap(0.35), tO + 0.5 + i * B, 0.25, 0.4 - 0.08 * i, name='the queue shuffles')
s.fx(foley('card', 'flip'), tU, 0.6, -0.4, name='"Tuesday": the day card flips'); s.fx(chime(84), tU + 0.02, 0.3, -0.4)
s.chorale(tU, 'C', 2.2, 0.45, 0.42)
s.fife_line(tU + 0.6, [(0, 79, 0.5), (0.5, 84, 0.5), (1, 88, 0.5), (1.5, 84, 1)], g=0.24, pan=0.25)

# ── 5 · the answer: Wednesday's wind and footsteps; the calendar slaps on; on "Wednesday" the marker; the end card
tR, tC, tW, tE = c('wd_wednesday.arrive'), c('wd_wednesday.cal'), c('wd_wednesday.wed'), c('wd_wednesday.card')
s.fx(wind(END - S[4] + 0.2), S[4], 0.8, -0.2, name='Wednesday: the wind')
for i in range(4): s.fx(brush_tap(0.55), tR + i * 0.4, 0.5, -0.4, name=f'his step {i + 1}')
s.fx(foley('paper', 'tap', 0.3), S[4] + 0.6, 0.2, 0.4, name='a sticker skitters')
s.fx(slap(), tC, 0.6, 0, name='the calendar slaps onto the door'); s.fx(thump(), tC, 0.3)
for i, (t0, d, f0, f1) in enumerate([(0, 0.26, 1700, 2300), (0.32, 0.26, 1800, 2200), (0.66, 0.62, 1500, 2100)]):
    s.fx(squeak(d, f0, f1), tW + t0, 0.5, 0.3, name=['the marker strikes WED 4', 'and again', 'and rings TUE 3'][i])
s.fx(stinger('deadpan'), tW + 0.05, 0.55, name='"Wednesday": the deadpan button'); s.note(timpani(36, 1.2, 0.5), tW, 0.3, 0, 0.35)
s.fx(pop(0.9), tE, 0.45, 0.1, name='the end card: ask your local election office'); s.fx(foley('card', 'drop'), tE + 0.02, 0.4, 0.1)
s.chorale(tE, 'C', 2.8, 0.6, 0.5); s.fx(tower_bell(48, 4.0), tE + 0.02, 0.35, -0.2, 0.5)
for i, n in enumerate([55, 60, 67]): s.note(trombone(n, 1.2 if i == 2 else 0.3, 0.7), tE + 0.6 + i * B / 2, 0.32, 0.2, 0.5)
# every pop word gets its own knock as the letters land (the first ones also carry their shot's hit)
for w in EV['words']:
    if w['pop']: s.fx(tick(int(w['t'] * 10) % 4, down=False), w['t'] + 0.03, 0.22, 0.1, name=f'pop word {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=tE + 1.6, tau=1.0, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
