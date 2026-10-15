"""House captions for "Committee of the Whole" (style H, lib/rfcaps.py, every break by hand).
v2 (owner, 15 Oct 2026: the ending texts go too fast): the last shot runs sixteen beats (eras_cw2.js),
and its second line joins at 3.2 s, after the OCT 16 stamp, so both lines have time to be read."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 16 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "On 5 October, the\\N[New York City Council]", "met as a committee of\\Nall 51 members, on AI risk."),
 (1, 0.80, 3.00, 360, "It invited five AI companies.\\NMeta said yes.", "Three came only under\\Nthe [threat of subpoenas]."),
 (2, 0.80, 3.00, 420, "Jacob Coxon, ex-Anthropic:", "\"On our current path, I think\\Nit is more likely than not that\\Nhumanity [loses control]…\""),
 (3, 0.80, 3.00, 420, "Asked for the odds\\Nof catastrophe,", "none of the four companies\\N[gave a number]."),
 (4, 0.80, 2.00, 420, "Council Speaker Julie Menin\\Ncalled OpenAI's answer", "\"[flippant at best].\""),
 (5, 0.70, 3.20, 420, "SpaceXAI did not come,\\Ndespite a [subpoena].", "Threatened with a judge,\\Nit agreed to testify on [16 October]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('cw_H.ass')), manual=True)
