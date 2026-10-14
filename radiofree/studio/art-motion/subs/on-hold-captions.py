"""House captions for "On Hold" (style H, lib/rfcaps.py). y is the block's centre; every
block sits in the dark sky/wall band above the picture's subject (the sign, the meter,
the envelope, the calendar, the workers, the scale)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "In 2025, Doodle put two\\NFinnish sites [on hold]", "until it knew the new\\Nelectricity tax."),
 (1, 0.80, 3.00, 420, "Finland raised\\Nthat tax [anyway]:", "about 45 times higher,\\Nfrom 1 July 2026."),
 (2, 0.80, 3.00, 420, "Then the government [dropped]", "the support meant\\Nto soften the blow."),
 (3, 0.80, 3.00, 420, "Eight days later, Doodle\\Nannounced [€13 billion]", "in Finland anyway."),
 (4, 0.80, 3.00, 420, "The tax didn't stop\\Nits site work:", "[over 500 hectares]\\Nof forest cleared."),
 (5, 0.70, 2.20, 420, "What called a halt, for now,\\Nwas [environmental law]:", "the clearing came\\Nbefore the impact assessment."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('doh_H.ass')), manual=True)
