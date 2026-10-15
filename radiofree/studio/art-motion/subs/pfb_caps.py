"""House captions for "Paid For By" (Coxon #3, style H, lib/rfcaps.py, every break by hand).
Wording per the pre-production review (plan/review-preproduction.md, section 1): single captions on
shots 1, 3 and 4; "aligned with" (not "tied to"); NBC's finding for shot 3; no data-centre line;
the shorter last line. Every line is under 800 px (widest: "with OpenAI and Anthropic", ~657 px)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "Rival groups aligned\\Nwith OpenAI and Anthropic\\Nspent [$55.7 million].", ""),
 (1, 0.80, 3.00, 420, "The New York Times", "reviewed all [95] ads."),
 (2, 0.80, 3.00, 420, "They're about everything\\N[except AI].", ""),
 (3, 0.80, 3.00, 420, "Only [7] of the 95\\Nmention AI.", ""),
 (4, 0.80, 3.00, 420, "Voters are souring on AI.", "The ads [leave it out]."),
 (5, 0.70, 2.20, 420, "Paid for by AI,", "which asked not\\Nto be [mentioned]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('pfb_H.ass')), manual=True)
