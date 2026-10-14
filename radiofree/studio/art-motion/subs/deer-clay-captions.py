"""House captions for "Unexpectedly, a Deer" v6 — the clay remake (Toko thinker #1; style H,
lib/rfcaps.py, breaks by hand). The phone's line is the device's reported wording and is shown
in the picture, not in a caption; the captions only set it up and land the price."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "Toko's home camera\\Nhas [AI] now.", "It writes up the day,\\Non a $20-a-month plan."),
 (1, 0.80, 3.00, 420, "The dog crosses the room.", "The camera [takes a note]."),
 (2, 0.80, 3.00, 420, "That evening,\\Nthe [daily brief].", "One line, word for word:"),
 (3, 0.80, 3.00, 420, "Toko checks the dog\\N[for antlers].", "Nothing."),
 (4, 0.80, 3.00, 420, "Not a one-off: a reviewer's\\Ndogs were logged as [deer],\\Nclip after clip.", "Other owners' cats: raccoons."),
 (5, 0.70, 2.20, 420, "The AI brief: [$20 a month],\\Nstill in early access.", "Toko's brief: free.\\NIt's a dog."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('drc_H.ass')), manual=True)
