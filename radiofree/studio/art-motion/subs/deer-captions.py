"""House captions for "Unexpectedly, a Deer" (style H, lib/rfcaps.py): every block in the
wall/sky band above the room, the phone, the shadow."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "This flat has a [smart camera].", "It watches the room\\Nand writes up the day."),
 (1, 0.80, 3.00, 420, "The dog crosses the room.", "The camera [takes a note]."),
 (2, 0.80, 3.00, 400, "In the evening,\\Nthe [daily brief].", "One line of it, word for word."),
 (3, 0.80, 3.00, 420, "Toko looks at the dog.", "The dog looks [back]."),
 (4, 0.80, 3.00, 420, "It was not a one-off.", "The same reviewer's dogs\\Nwere logged as [deer],\\Nclip after clip."),
 (5, 0.70, 2.20, 400, "Other users' cats\\Nwere logged as raccoons.", "It needs a [$20-a-month]\\Nplan, still in early access."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('dr_H.ass')), manual=True)
