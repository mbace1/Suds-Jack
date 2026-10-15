"""House captions for "Satire Excepted" (the Nordics, style H, lib/rfcaps.py, every break by hand).
Wording per the pre-production review (plan/review-preproduction.md, section 5): single captions on
shots 1-5; "Except for satire and parody" (the bill exempts satire, parody, caricature and criticism —
not "one exception"); nothing says the bill will pass (shot 3: it is in parliament, aimed at a date;
the tag says TABLED); the ending is the station's own callback, with a two-second gap before
"Probably." Widest line: "voice or moves would need" at ~651 px — under the 800 px rule."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "Denmark wants your face\\Nto be [yours], by law.", ""),
 (1, 0.80, 3.00, 420, "An AI copy of your face,\\Nvoice or moves would need\\Nyour [consent].", ""),
 (2, 0.80, 3.00, 420, "The bill is in parliament,\\Naimed at [1 January].", ""),
 (3, 0.80, 3.00, 420, "Except for [satire]\\Nand parody.", ""),
 (4, 0.80, 3.00, 420, "A court would decide\\Nwhat counts as [a joke].", ""),
 (5, 0.70, 2.70, 420, "This has been satire.", "[Probably.]"),
]
build(SHOTS, CUT, str(Path(__file__).with_name('sat_H.ass')), manual=True)
