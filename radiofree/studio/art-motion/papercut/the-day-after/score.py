"""The Day After (Coxon 7) — the cue sheet. The COXON palette (SOUND.md: the institution taking itself seriously,
C minor, low brass chorale, timpani, parade snare, a fife a hair sharp for the wry part) against the plan's events
(pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

    uv run --with numpy --with soundfile python papercut/the-day-after/score.py <events.json> <out.wav> [<report.json> <stems>]

One question — a disaster within a year: what is the industry getting ready? A calendar sheds a year of pages; the
city's breakers drop one district at a time, each with its own clack and its own hum dying; the briefing room ticks,
waiting, and the binder lands on "after" on the series' Neapolitan hit; the rule types itself out; and the box's plate
stamps OPEN THE DAY AFTER before Kill Switch's sticky note lands on a dull tap and the deadpan button.
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound')]
from mix import session
from rfseries import Coxon
from rfsound import room, rim, tower_bell, trombone, timpani, fife, bass_drum, snare_roll, lamp_click, page_flutter, paper_slide, thump, stamp, hum, toy_blip
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = session(Coxon, END + 0.5); B = s.B
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
D = [S[i + 1] - S[i] if i < 4 else END - S[i] for i in range(5)]
quiet = [(S[4] + 0.1, c('dy_end.after'))]            # the room holds its breath before the plate

# ── under everything: the night's air, the processional on the 84 grid, a held low brass chord a shot
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
    if i: s.roll_into(t, B * 0.9, 0.05, 0.35, 0.4)
s.ruff(S[0], 0.4)

# ── 1 · the question: a calendar sheds a year of pages, a rip each; the question hangs on the dominant
tF, t1 = c('dy_city.flip'), S[0] + D[0] - 1.4
for i in range(12): s.fx(paper_slide(0.25, 30 + i) * 6, tF + (t1 - tF) * (i + 0.6) / 12, 0.28, -0.5 + i * 0.03, name=f'a month torn off {i + 1}')
s.fx(page_flutter(0.6, 5), tF, 0.3, -0.5, name='the calendar starts to go')
s.chorale(S[0] + 0.3, 'Cm', 1.6, 0.3, 0.38)
s.fx(pop(1.4), c('dy_city.ready') + 0.0, 0.32, 0.2, name='"getting ready?"'); s.chorale(c('dy_city.ready') + 0.03, 'G', 1.8, 0.32, 0.38)

# ── 2 · how: on "cyberattack" the panel glitches; then each breaker drops with a clack and its district's hum dies
tC, tL = c('dy_fuse.cyber'), c('dy_fuse.list')
for i in range(6): s.fx(toy_blip(1568 + 220 * (i % 3)), tC + i * 0.06, 0.35, 0.2 * (i % 2 * 2 - 1), name='the glitch')
s.note(timpani(41, 1.2, 0.45), tC, 0.4, 0, 0.35); s.fx(pop(1.0), tC, 0.25, name='"cyberattack"')
for i in range(4):
    t = tL + i * 0.34 + 0.16
    s.fx(lamp_click(), t, 0.9, -0.45 + i * 0.3, name=f'breaker {i + 1}'); s.fx(thump(), t, 0.4, -0.45 + i * 0.3)
    s.fx(hum(55 + 12 * i, 0.9) * 0.4, t - 0.02, 0.22, -0.45 + i * 0.3, name=f'district {i + 1} powers down')
s.fx(tick(0), tL, 0.3, -0.45, name='the list starts')
s.chorale(tL + 1.6, 'Fm', 2.6, 0.3, 0.36)

# ── 3 · the plan: the briefing room, waiting — the chamber clock ticks, the mics hum; on "after" the binder lands
tA = c('dy_room.after')
for i in range(int(D[2])): s.fx(tick(i % 4, down=False), S[2] + i + 0.5, 0.22, 0.1, name=f'the clock {i + 1}')
s.fx(hum(120, D[2] - 0.4) * 0.35, S[2] + 0.2, 0.18, 0, name='the mics are live')
s.fx(whoosh('short', 'in'), tA - WHOOSH['short'] * 0.8, 0.45, 0, at=tA - 0.01, name='the binder drops')
s.fx(foley('card', 'drop'), tA, 0.8, 0, name='"after": the binder lands'); s.fx(thump(), tA, 0.5)
s.hit(tA, 0.85, 37); s.chorale(tA, 'Db', 1.4, 0.85, 0.5); s.chorale(tA + 1.6, 'G', 1.8, 0.35, 0.4)

# ── 4 · the list: the rule types itself out; on "kill switch" the highlighter swipes and the stamp hits
tK = c('dy_list.kill')
for i in range(20): s.fx(tick(i % 4, down=bool(i % 2)), tK - 0.9 + i * 0.045, 0.2, 0.2, name='the rule types out')
s.fx(swish(), tK, 0.45, 0.2, name='"kill switch": the highlighter'); s.fx(stamp(), tK, 0.55, 0.2); s.note(timpani(43, 1.2, 0.45), tK, 0.35, 0, 0.35)
s.fife_line(tK + 0.3, [(0, 79, 0.5), (0.5, 84, 0.5), (1, 87, 1)], g=0.26, pan=0.3)
s.chorale(S[3] + 3.2, 'Fm', 2.4, 0.28, 0.36)

# ── 5 · the answer: quiet; on "the day after" the plate stamps; on "Until then" the sticky note slaps onto the glass
tP, tN = c('dy_end.after'), c('dy_end.note')
s.fx(stamp(), tP, 0.85, 0, name='"the day after": OPEN THE DAY AFTER'); s.hit(tP, 0.7, 36)
s.fx(whoosh('short', 'in'), tN - WHOOSH['short'] * 0.8, 0.4, -0.3, at=tN - 0.01, name='the note flies in')
s.fx(tap(dull=True), tN, 1.0, -0.3, name='"Until then": the sticky note lands'); s.fx(stinger('deadpan'), tN + 0.05, 0.6)
END_HIT = tN + 1.2
s.chorale(END_HIT, 'Cm', 2.6, 0.75, 0.5); s.fx(tower_bell(48, 4.0), END_HIT + 0.02, 0.4, -0.2, 0.5)
for i, n in enumerate([60, 55, 48]): s.note(trombone(n, 1.2 if i == 2 else 0.3, 0.8), END_HIT + 0.05 + i * B / 2, 0.38, 0.2, 0.5)
# every later word of a multi-word pop ("kill SWITCH", "the DAY AFTER") gets its own knock, as the letters land
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.3, 0.1, name=f'pop word {w["w"]}')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id']); s.duck(cp['t0'], last + 0.4, -3.0, why=f'caption {cp["id"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END_HIT + 1.0, tau=1.0, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
