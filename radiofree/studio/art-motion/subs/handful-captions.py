"""House captions for "A Handful of People" (style H, lib/rfcaps.py, every break by hand)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "In September, Jacob Coxon\\Nquit Anthropic", "and wrote [why]."),
 (1, 0.80, 3.00, 420, "On The Daily Show, he told\\NJon Stewart the choice", "shouldn't rest with\\N[a handful of people]."),
 (2, 0.80, 3.00, 420, "In a Reuters/Ipsos poll,\\N[62%] say AI could get", "out of control and risk\\Nhumankind's future."),
 (3, 0.80, 3.00, 420, "54% say Congress isn't\\Ntaking AI risks", "[seriously enough]."),
 (4, 0.80, 3.00, 420, "The Speaker of the House\\Nsays Congress won't", "[take the lead]."),
 (5, 0.70, 2.20, 420, "AI is now\\Na campaign issue.", "The midterms: [November 3]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('hp_H.ass')), manual=True)
