"""Welcome Home, in paper — the cue sheet. The RFH series bed (112 BPM, A minor) under the papercut shadowbox: the display
boots with a polite chime and turns its page to Private by design; a card question mark is tacked on with a tap; the
brother's sleeve rustles in and the lock clicks shut on "face"; on the door camera there are footsteps on brick under
the porch's string lights, and on "camera" the pill lands with a pop per mask; at the end her texts' lock ticks in the
corner and "date" lands deadpan. Every cue and every pop word gets a sound.

    uv run --with numpy --with soundfile python papercut/welcome-paper/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / 'pipeline' / 'sound'), str(Path(__file__).resolve().parents[2] / 'lib')]
from mix import Session
from stems import RFH, bed, accent, sting, motif
from sfx import whoosh, swish, pop, chip, tick, tap, foley, stinger, WHOOSH
from rfsound import blip, glide, rustle, lamp_click, toy_ding, ui_tick, stamp, room

EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
END = EV['end']; s = Session(END + 0.5, RFH); Q = EV['cues']
S = [EV[f's{i}'] for i in range(1, 5)]
quiet = [(q['t0'], q['t1']) for q in EV.get('quiet', [])]

# ── the music: light under the boot, the full groove from the brother's try, light again for the pill
bed(s, S[0] + 0.05, S[1], quiet, level=1)
bed(s, S[1], S[3], quiet)
bed(s, S[3], END - 0.6, quiet, level=1)
s.fx(room(END + 0.4, 0.8), 0, 1.0, 0, name='the kitchen')
for cp in EV['captions']:
    last = max(w['t'] for w in EV['words'] if w['caption'] == cp['id'])
    s.duck(cp['t0'], last + 0.4, -3.5, why=f'caption {cp["id"]} reveal')
for i, t in enumerate(S[1:]): s.fx(whoosh('short', 'in'), t - WHOOSH['short'] * 0.8, 0.3, 0, at=t, name=f'cut {i + 2}')

# ── 1 · the display boots, turns its page; the question mark is tacked on
s.fx(foley('paper', 'tap', 0.7), S[0], 0.4, 0, name='the open: card in the box'); motif(s, S[0] + 0.03, g=0.28)
s.fx(toy_ding(93), S[0] + 0.35, 0.2, 0.1, name='Pear AI wakes')
s.fx(foley('paper', 'flip', 0.8), Q['ph_screen.flow'] - 0.05, 0.4, 0.1, at=Q['ph_screen.flow'], name='the page turns: Private by design')
s.fx(tap(), Q['ph_screen.whom'], 0.5, 0.35, name='"from whom?": the card ? tacked on')
# ── 2 · the sleeve reaches in; on "face" the lock clicks shut and the hand goes
s.fx(rustle(0.5), Q['ph_lock.reach'], 0.35, 0.4, name='the sleeve reaches in')
s.fx(lamp_click(), Q['ph_lock.lock'], 0.45, 0, name='"face": locked'); s.fx(stamp(), Q['ph_lock.lock'], 0.35, 0)
s.fx(swish(), Q['ph_lock.lock'] + 0.3, 0.2, 0.4, name='the hand withdraws')
# ── 3 · the door camera: footsteps on brick, the string lights; on "camera" the pill lands, a pop per mask
for k in range(10): s.fx(tick(k % 3, down=True), S[2] + 0.2 + k * 0.32, 0.1, -0.2 + 0.04 * k, name='footsteps on the path')
w = Q['ph_door.watch']
s.fx(chip(False), w, 0.45, 0, name='"camera": 4 WATCHING'); [s.fx(pop(1.0 + 0.15 * i), w + 0.3 + i * 0.12, 0.2, -0.3 + 0.2 * i, name=f'mask {i + 1}') for i in range(4)]
# ── 4 · her texts lock in the corner on "private."; "date" lands deadpan
s.fx(ui_tick(3200), Q['ph_last.priv'], 0.35, -0.3, name='"private.": Messages · Locked'); s.fx(lamp_click(), Q['ph_last.priv'] + 0.02, 0.2, -0.3)
s.fx(stinger('deadpan'), Q['ph_last.date'] + 0.4, 0.45, name='after "date"')

# ── the captions' pop words: each lands on a hit
for w_ in EV['words']:
    if not w_['pop']: continue
    t = w_['t'] + 0.03
    s.fx(pop(1.2), t, 0.26, 0.1, name=f'pop {w_["w"]}'); accent(s, t, S[0], 0.22, name=w_['caption'])
motif(s, S[3] + 0.2, g=0.3)
sting(s, END - 0.6)

cues = [(f's{i + 1}', t) for i, t in enumerate(S)] + list(Q.items()) + [(f'word {w_["w"]}', w_['t'] + 0.03) for w_ in EV['words'] if w_['pop']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=quiet, stems_dir=STEMS, report=REP)
