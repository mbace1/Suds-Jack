"""House captions for "Unexpectedly, a Deer" — the clay SHORT cut, ~19 s (the clay films go to the
Toko Midori Games socials: short, no end slate). Review v6: with no slate, "Real line." tells the
viewer the phone's words are the device's own, as reported."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
CUT = [0, 5.25, 8.75, 12.25, 16.5, 21.0]
SHOTS = [
 (0, 0.50, 2.80, 420, "Toko's home camera\\Nhas [AI] now.", "$20 a month."),
 (1, 0.30, 1.80, 420, "The dog crosses the room.", "The camera [takes a note]."),
 (2, 0.30, 0.30, 420, "That evening,\\Nits [daily brief]:", ""),
 (3, 0.30, 2.30, 420, "Real line. A reviewer's\\Ndogs were logged as [deer].", "Other owners' cats:\\Nraccoons."),
 (4, 0.60, 2.20, 420, "The AI brief: [$20 a month].", "Toko's brief: free.\\NIt's a dog."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('drc_short_H.ass')), manual=True)
