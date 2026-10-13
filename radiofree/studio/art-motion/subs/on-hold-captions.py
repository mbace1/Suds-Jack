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
 (0, 0.80, 3.00, 420, "In 2025, Doodle put two sites [on hold].", "It wanted to see the new electricity tax first."),
 (1, 0.80, 3.00, 390, "Finland raised the tax [anyway].", "From 0.05 to 2.24 cents a kWh."),
 (2, 0.80, 3.00, 400, "A new support scheme was meant to soften it.", "On 1 September, the government [dropped] it."),
 (3, 0.80, 3.00, 400, "Eight days later, Doodle announced", "at least [€13 billion] in Finland."),
 (4, 0.80, 3.00, 420, "Both sites on hold were [in the plan].", "Kajaani and Muhos."),
 (5, 0.70, 2.60, 400, "In October, the regulator told Doodle to [stop].", "Until the environmental assessment is done."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('doh_H.ass')))
