"""Tailgated (The Brink 1) — the cue sheet. The RFH series bed (stems.py: 112 BPM, A minor) and the library's sounds
against the plan's events (pipeline/plan.mjs), so the Finnish and Japanese masters are scored by this same file.

Sober, like the strand: no alarms, no war drums. Orbit is a soft radar ping on the scan line and a low hum; the other
satellite arrives as a glint; the tag on its thread ticks down a number at a time and lands on "within 5 km" with a
card tap; the rulebook is cloth and paper — a cover, a riffle of pages, a marker squeaking round nothing — and on
"due regard" the marker circles the only words in it and a bell says found. On "none" a tin road sign swings down on
its string and rattles. The shot schedules here mirror scenes/tg_kit.js (book3, book4), so the sound lands on the
picture in every language.

    uv run --with numpy --with soundfile python papercut/tailgated/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import hum, glock, sparkle, glide, whir, ui_tick, card_flip, pencil, page_flutter, clank, pin_wobble, thump, chime

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH)
Q = EV['cues']; c = lambda k: Q[k]
S = [EV[f's{i}'] for i in range(1, 6)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]
COUNT = [350, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10, 5]

# ── under everything: the station's call on the first frame, the bed lighter in orbit, the hum of a quiet machine
motif(s, S[0] + 0.035, g=0.32)     # 35 ms in: a note on the very first sample rang the sign-off join's limiter to -0.7 dBTP
bed(s, S[0] + 0.5, S[1], quiet, level=1)
bed(s, S[1], END - 0.6, quiet)
s.fx(hum(55, S[2] - S[0]) * 0.8, S[0], 0.07, 0, name='orbit: a low hum')
s.fx(hum(55, END - S[4]) * 0.8, S[4], 0.06, 0, name='orbit again')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

def pings(t0, t1, phase=0.0, g=0.07):
    """the radar's scan line: a soft high ping each time a line leaves the panel (the kit's scan(): k = lt * 0.62)"""
    n = 0
    while True:
        t = t0 + (n - phase) / 0.62; n += 1
        if t >= t1 - 0.3: break
        if t >= t0: s.note(glock(96, 0.9, 0.5), t, g, 0.25, 0.5, stem='orbit', name='ping')

# ── 1 · the watcher: pings as it scans; on "another" a glint far behind, the thread runs out, the tag drops on
pings(S[0], S[1])
tO = c('tg_watch.other')
s.fx(sparkle(91), tO, 0.3, -0.5, name='"another": a glint far behind'); accent(s, tO, S[1], 0.25, name='another')
s.fx(glide(1100, 2300, 0.3), tO + 0.12, 0.1, -0.3, name='the thread runs out')
s.fx(card_flip(), tO + 0.42, 0.45, -0.3, name='350 KM: the tag drops on'); s.fx(tap(), tO + 0.44, 0.25, -0.3)

# ── 2 · it closes in: a low whir as it comes; the tag ticks down a number at a time and lands on "within 5 km"
tC, tF = c('tg_close.count'), c('tg_close.five'); n = len(COUNT)
pings(S[1], S[2], phase=(S[1] - S[0]) * 0.62 % 1)
s.fx(whir(70, 120, tF - tC + 0.3), tC, 0.22, -0.4, name='the other satellite comes on')
s.fx(ui_tick(3000), tC, 0.25, -0.2, name='the count starts at 350')
for i in range(1, n - 1):
    t = tC + (tF - tC) * i / (n - 1); s.fx(ui_tick(2600 + 90 * i), t, 0.3, -0.2, name=f'{COUNT[i]} KM'); s.fx(card_flip(), t, 0.12, -0.2)
s.fx(foley('card', 'tap'), tF, 0.7, -0.15, name='"within 5 km": the tag lands on 5'); s.fx(thump(), tF, 0.35, -0.15)
s.fx(chime(81, 0.8), tF + 0.02, 0.16, 0.1); accent(s, tF, S[1], 0.3, name='within 5 km')

# ── 3 · the rulebook: it drifts in, the cover swings open, four pages riffle, the marker circles nothing and asks
tO3, tN3 = c('tg_book.open'), c('tg_book.none')
openT = min(tO3, tN3 - 0.95); f0 = openT + 0.34; step = (tN3 - 0.12 - 0.26 - f0) / 3
s.fx(foley('card', 'slide'), S[2] + 0.05, 0.35, 0, name='the book drifts in')
s.fx(foley('card', 'flip'), openT, 0.7, 0, name='the cover swings open'); s.fx(thump(), openT + 0.3, 0.25, -0.2)
if abs(openT - tO3) > 0.03: s.fx(tick(0), tO3, 0.2, 0.1, name='the open cue, in a language that opens early')
for i in range(4): s.fx(foley('paper', 'flip', 0.8), f0 + i * step, 0.4, 0.2 - 0.1 * i, name=f'a blank page {i + 1}')
s.fx(page_flutter(0.5), f0, 0.15, 0.1)
s.fx(swish(), tN3, 0.4, 0.2, name='"minimum distance": the marker circles nothing'); s.fx(pencil(0.4), tN3, 0.9, 0.2)
s.fx(pencil(0.32, seed=3), tN3 + 0.42, 0.8, 0.2, name='"?"'); accent(s, tN3, S[1], 0.28, name='minimum distance')
s.fx(stinger('deadpan'), tN3 + 0.8, 0.4)

# ── 4 · the only words: two more pages, the marker runs down a blank one, then circles DUE REGARD and underlines it
tF4, tR = c('tg_regard.flip'), c('tg_regard.regard'); sp = max(1.2, tR - tF4); f2 = tF4 + 0.31 * sp
s.fx(foley('paper', 'flip'), tF4, 0.5, 0.1, name='the page with the question turns')
s.fx(pencil(0.15 * sp, seed=5), tF4 + 0.14 * sp, 0.8, 0.2, name='the marker runs down a blank page')
s.fx(foley('paper', 'flip'), f2, 0.5, 0.1, name='and that one turns'); s.fx(tap(dull=True), f2 + 0.28, 0.3, 0.1, name='the page with two words')
s.fx(swish(), tR, 0.45, 0.2, name='"due regard": circled'); s.fx(pencil(0.36, seed=7), tR, 0.9, 0.2)
s.note(glock(88, 1.4, 0.7), tR + 0.02, 0.3, 0.1, 0.4, stem='motif', name='found'); accent(s, tR, S[1], 0.25, name='due regard')
for j in range(2): s.fx(pencil(0.18, seed=9 + j), tR + 0.6 + j * 0.2, 0.8, 0.25, name=f'underline {j + 1}')

# ── 5 · nose to tail on the orbit road: the tag swings; on "none" the minimum-distance sign drops on its string
tT, tN5 = c('tg_tail.tag'), c('tg_tail.none')
pings(S[4], END - 0.6, phase=(S[4] - S[0]) * 0.62 % 1, g=0.05)
s.fx(card_flip(), tT, 0.35, -0.2, name='5 KM: the tag swings')
s.fx(whoosh('short', 'in'), tN5 - WHOOSH['short'] * 0.8, 0.35, 0.4, at=tN5 - 0.01, name='the sign drops')
s.fx(clank(0.8, 900), tN5 + 0.02, 0.45, 0.4, name='"none": the sign, its number blank'); s.fx(pin_wobble(0.7, 760), tN5 + 0.4, 0.22, 0.4)
accent(s, tN5, S[1], 0.3, name='none'); s.fx(stinger('deadpan'), tN5 + 0.9, 0.45)
sting(s, END - 0.6)

# every later word of a multi-word pop ("within 5 KM", "minimum DISTANCE", "due REGARD") gets its own knock
for cp in EV['captions']:
    pw = [w for w in EV['words'] if w['caption'] == cp['id'] and w['pop']]
    for j, w in enumerate(pw[1:]): s.fx(tick(j % 4, down=False), w['t'] + 0.03, 0.25, 0.1, name=f'pop word {w["w"]}')

cues = [(k, v) for k, v in Q.items()] + [(f's{i + 1}', t) for i, t in enumerate(S)] + [(f'word {w["w"]}', w['t'] + 0.03) for w in EV['words'] if w['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
