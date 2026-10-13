"""House captions for "Committee of the Whole" (style H, lib/rfcaps.py, every break by hand)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "On 5 October, New York's\\Ncouncil met as one committee", "of [all 51 members],\\Nfor one hearing: AI risk."),
 (1, 0.80, 3.00, 420, "Meta agreed to come.", "Three others came only under\\Nthe [threat of subpoenas]."),
 (2, 0.80, 3.00, 420, "Jacob Coxon, ex-Anthropic:", "\"On our current path, I think\\Nit is more likely than not that\\Nhumanity [loses control]…\""),
 (3, 0.80, 3.00, 420, "Asked for the odds\\Nof catastrophe,", "none of the four companies\\N[gave a number]."),
 (4, 0.80, 2.00, 420, "The Speaker called\\NOpenAI's answer", "\"[flippant at best].\""),
 (5, 0.70, 2.20, 420, "One company did not come,\\Ndespite a [subpoena].", "The council is pursuing it\\Nin court."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('cw_H.ass')), manual=True)
