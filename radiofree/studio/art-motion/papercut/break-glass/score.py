"""Break Glass in Emergency (The Brink 2) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the
library's sounds against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this
same file.

Sober, like the strand: no alarms, no drums of war. A border at night is wind and a far hum; on "temporary" the lamp
over the case clicks on. The tag drops onto the case with a card tap on "one year". Then the days pass as soft swells
of wind, the glass rings once where it is still whole ("never been used"), and the marker squeaks a line through the
year and writes the next one. At the committee desk the marker does it again; on "agreed" a rubber stamp comes down,
and two cards slide in. At the end the tag swings on its string, the marker circles 2028, and the glass rings again.
The schedules here mirror scenes/bge_kit.js, so the sound lands on the picture in every language.

    uv run --with numpy --with soundfile python papercut/break-glass/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, tick, tap, foley, stinger, WHOOSH
from rfsound import noise, hum, glock, sparkle, chime, card_flip, pencil, lamp_click, press_stamp, paper_slide, tag_pop, pin_wobble, thump

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]


def wind(d, lo=180, hi=1400):
    """night wind: band-limited noise that swells in and out"""
    import numpy as np
    x = noise(d, lo, hi); n = len(x); t = np.arange(n) / 48000
    return x * (0.55 + 0.45 * np.sin(2 * np.pi * t / max(1.0, d) - np.pi / 2) ** 2)


# ── under everything: the station's call, the bed lighter outside, wind at the border and on the wall
motif(s, S[0] + 0.035, g=0.32)     # 35 ms in: a note on the very first sample rings the sign-off join's limiter
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
s.fx(wind(S[3] - S[0]) * 0.5, S[0], 0.09, -0.2, name='wind at the border')
s.fx(wind(END - S[4]) * 0.5, S[4], 0.08, 0.2, name='wind again')
s.fx(hum(55, S[1] - S[0]) * 0.6, S[0], 0.04, 0, name='a far hum')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the gate: on "temporary" the lamp over the case clicks on and buzzes for a moment
tL = c('bge_gate.lamp')
s.fx(lamp_click(), tL, 0.6, -0.4, name='"temporary": the lamp over the case clicks on'); accent(s, tL, S[1], 0.25, name='temporary')
s.fx(hum(100, 0.5) * 0.4, tL + 0.02, 0.06, -0.4, name='its buzz')

# ── 2 · the case: on "one year" the tag drops onto its corner and swings
tT = c('bge_case.tag')
s.fx(tag_pop(), tT, 0.45, 0.3, name='"one year": the tag drops on'); s.fx(card_flip(), tT + 0.02, 0.35, 0.3); s.fx(tap(), tT + 0.04, 0.25, 0.3)
accent(s, tT, S[1], 0.28, name='one year'); s.fx(pin_wobble(0.6, 980), tT + 0.3, 0.12, 0.3, name='it swings')

# ── 3 · the days: wind swells, one a day; on "never been used" the glass rings; the marker strikes 2025, writes 2026
tG, tS, tW = c('bge_dust.gleam'), c('bge_dust.strike'), c('bge_dust.write')
dd = S[3] - S[2]
for i in range(7):
    t = S[2] + dd * (i + 0.5) / 7; s.fx(wind(0.9, 300, 2600) * 0.6, t - 0.45, 0.07, -0.6 + 1.2 * i / 6, name=f'a day {i + 1}')
s.fx(sparkle(93), tG, 0.32, 0.0, name='"never been used": the glass, whole, rings'); s.fx(chime(88, 0.9), tG + 0.03, 0.14, 0)
accent(s, tG, S[1], 0.28, name='never been used')
s.fx(swish(), tS, 0.3, 0.3, name='"In 2025": the marker strikes the year'); s.fx(pencil(0.3, seed=2), tS, 0.9, 0.3)
s.fx(pencil(0.45, seed=4), tW, 0.75, 0.3, name='"2026", written')

# ── 4 · the desk: 2026 struck, 2028 written; on "agreed" the stamp comes down; two cards slide in
tW4, tP = c('bge_desk.write'), c('bge_desk.stamp')
s.fx(paper_slide(0.4), S[3] + 0.1, 0.25, 0, name='paper on the desk')
s.fx(swish(), tW4 - 0.42, 0.3, 0.3, name='2026 struck'); s.fx(pencil(0.3, seed=6), tW4 - 0.42, 0.9, 0.3)
s.fx(pencil(0.45, seed=8), tW4, 0.75, 0.3, name='"2028", written')
s.fx(whoosh('short', 'in'), tP - WHOOSH['short'] * 0.8, 0.25, -0.2, at=tP - 0.02, name='the stamp comes down')
s.fx(press_stamp(1.0), tP, 0.85, -0.2, name='"agreed": stamped'); s.fx(thump(), tP, 0.35, -0.2); accent(s, tP, S[1], 0.3, name='agreed')
for j, d in enumerate([0.55, 0.85]): s.fx(paper_slide(0.3, seed=11 + j), tP + d, 0.45, 0.5, name=f'a DISSENT card {j + 1}'); s.fx(tap(dull=True), tP + d + 0.28, 0.3, 0.5)
s.fx(stinger('deadpan'), tP + 1.4, 0.35)

# ── 5 · the case again: the tag swings on its string; on "2028" the marker circles it and the glass rings
tT5, tM = c('bge_tail.tag'), c('bge_tail.mark')
s.fx(card_flip(), tT5, 0.35, 0.3, name='the tag, re-hung'); s.fx(pin_wobble(0.6, 980), tT5 + 0.1, 0.12, 0.3)
s.fx(swish(), tM, 0.4, 0.3, name='"2028": circled'); s.fx(pencil(0.42, seed=10), tM, 0.9, 0.3)
s.note(glock(88, 1.4, 0.7), tM + 0.02, 0.28, 0.1, 0.4, stem='motif', name='found'); accent(s, tM, S[1], 0.3, name='2028')
s.fx(sparkle(91), tM + 0.3, 0.22, 0, name='the glass, still whole'); s.fx(stinger('deadpan'), tM + 0.9, 0.45)
sting(s, END - 0.6)

# every later word of a multi-word pop ("never BEEN USED", "one YEAR") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
