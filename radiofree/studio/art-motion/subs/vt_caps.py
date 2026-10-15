"""House captions for "On the Same Voluntary Terms" (film 2, style H, lib/rfcaps.py, every break by hand).
The words are the pre-production review's fixes, exactly: single captions for shots 1 and 3, the hold "lasted"
17 days (not "the testers waited"), and NO quote marks around "same voluntary terms" (a paraphrase is never quoted)."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 380, "Britain's AI Security\\NInstitute tests new AI\\N[before] it is released.", ""),
 (1, 0.80, 3.00, 400, "Only when [invited].", "No law makes\\Nthe labs say yes."),
 (2, 0.80, 3.00, 380, "The White House asked\\Ntwo US labs to [hold back]\\Nnew models from the UK.", ""),
 (3, 0.80, 3.00, 420, "The hold lasted", "[17 days]."),
 (4, 0.80, 3.00, 400, "Then access came back,", "on the same\\N[voluntary] terms."),
 (5, 0.80, 3.00, 400, "Testing has resumed.", "Until the phone\\N[rings again]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('vt_H.ass')), manual=True)
