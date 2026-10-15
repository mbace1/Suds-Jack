"""House captions for "Irreversible" v2 (Doodle #3, style H, lib/rfcaps.py, every break by hand).
Owner, 15 Oct 2026: "great but needs clarity and directness." One plain sentence per shot, in story
order: Doodle keeps your searches → the EU says share them, anonymised → Doodle says that would do
"irreversible harm" → the law already demands irreversible anonymisation → the punch. The scale shot
is gone; the EU's side is the law itself (shot 4). "irreversible harm" is Doodle's (Google's)
reported wording and is the only thing in quote marks."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(5)] + [4 * SHOT * B + 14 * B]
SHOTS = [
 (0, 0.80, 0.80, 420, "Doodle keeps\\N[your searches].", ""),
 (1, 0.80, 0.80, 420, "The EU told Doodle to share\\Nsearch data with rivals,\\N[anonymised] first.", ""),
 (2, 0.80, 0.80, 420, "Doodle went to court.\\NIt says that would do\\N“[irreversible] harm”\\Nto your privacy.", ""),
 (3, 0.80, 0.80, 420, "But the law already says\\Nthe data must be\\N[irreversibly] anonymised.", ""),
 (4, 0.70, 3.00, 420, "Doodle is protecting\\Nyour searches…", "…from everyone\\N[but Doodle]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('irr_H.ass')), manual=True)
