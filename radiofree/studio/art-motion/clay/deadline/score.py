"""Due 13 Nov (RFH, Coxon 18 · the House letter to OpenAI), 2D v1 — the cue sheet. Its own kit: HOLD LINE (pipeline/sound/holdline.py).
Hold music under everything, polite and endless; the mail client's sounds; the calendar's pages; the overdue blip; the cursor.
    uv run --with numpy --with soundfile python clay/deadline/score.py <events.json> <out.wav> [<report.json> <stems>]
"""
import sys, json
from pathlib import Path
import numpy as np
sys.path[:0] = [str(Path(__file__).resolve().parents[2] / "pipeline" / "sound")]
from mix import Session
from stems import sting
EV = json.load(open(sys.argv[1])); OUT = sys.argv[2]
REP = sys.argv[3] if len(sys.argv) > 3 else None; STEMS = sys.argv[4] if len(sys.argv) > 4 else None
T = {k: v for k, v in EV.items() if isinstance(v, (int, float))}
END = T["end"]
from rfsound import room
from holdline import Holdline as K, whoosh, sent_tick, revoke, page, overdue, caret, hold_bar
s = Session(END + 0.5, K); BAR = 4 * K.B
s.fx(room(END, 0.6), 0.0, 0.4, 0.0, wet=0.05, name='the office room tone')
s.fx(whoosh(), T['slide'], 0.3, 0.2, wet=0.15, name='send')
s.fx(sent_tick(), T['delivered'], 0.32, 0.25, wet=0.2, name='DELIVERED')
for i in range(3): s.fx(revoke(i), T[f'badge{i}'], 0.3, -0.3 + 0.3 * i, wet=0.15, name=f'a badge revoked ({i + 1})')
# the calendar pages: 15 to 13 Nov, then 8 more
for i in range(15): s.fx(page(i), T['cal'] + (T['circle'] - T['cal']) * i / 15, 0.12, 0.1, wet=0.15, name='a calendar page')
s.fx(sent_tick(), T['circle'], 0.25, 0.0, wet=0.3, name='13 Nov circled')
for i in range(8): s.fx(page(20 + i), T['over'] + (T['zero'] - T['over']) * i / 8, 0.12, 0.1, wet=0.15, name='a page past the deadline')
s.fx(overdue(), T['zero'], 0.3, 0.0, wet=0.2, name='OVERDUE / Replies: 0')
s.fx(sent_tick(), T['status'], 0.3, 0.0, wet=0.25, name='Status: delivered')
t = T['status'] + 0.3
while t < END - 0.8: s.fx(caret(), t, 0.15, 0.0, wet=0.1, name='the cursor blinks'); t += 1 / 1.8 * 2
for i in range(int(np.ceil(END / BAR))):
    tb = i * BAR
    if tb >= END - 1.0: break
    hold_bar(s, tb, K.CHORDS[i % 4], g=0.055 if tb < T['status'] else 0.045)
sting(s, END - 0.6)
cues = [(k, T[k]) for k in EV['cueNames']]
s.render(OUT, ring_from=END - 0.45, tau=0.35, end=END, cues=cues, exempt={}, quiet=[], stems_dir=STEMS, report=REP)
