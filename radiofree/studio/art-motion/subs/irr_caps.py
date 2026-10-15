"""House captions for "Irreversible" (Doodle #3, style H, lib/rfcaps.py, every break by hand).
Wording per the pre-production review (plan/review-preproduction.md, section 4): single captions on
shots 1-5, both sides stated plainly in shot 5, and the shorter ending. "irreversible harm" is Doodle's
(Google's) reported wording and is the only thing in quote marks. Widest line: "Doodle: not anonymous
enough." at ~783 px — under the 800 px rule."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "The EU ordered Doodle\\Nto share [anonymised]\\Nsearch data with rivals.", ""),
 (1, 0.80, 3.00, 420, "Doodle went to court,\\Nwarning of “[irreversible]\\Nharm” to privacy.", ""),
 (2, 0.80, 3.00, 420, "The law already says\\Nthe data must be\\N[irreversibly] anonymised.", ""),
 (3, 0.80, 3.00, 420, "The search history\\Nit is protecting\\Nis the one [it keeps].", ""),
 (4, 0.80, 3.00, 420, "Doodle: not anonymous enough.\\NThe EU: it has [safeguards].", ""),
 (5, 0.70, 2.60, 420, "Your searches: [protected].", "From everyone\\Nbut Doodle."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('irr_H.ass')), manual=True)
