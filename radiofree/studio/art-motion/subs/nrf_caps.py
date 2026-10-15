"""House captions for "The Newsreader Was Fake" (style H, lib/rfcaps.py, every break by hand).
Captions as revised by the pre-production review (review-preproduction.md §3): shots 1-5 are single
captions, shot 6 keeps its two halves — the joke."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 0, 420, "Finnish newsreaders found\\Ntheir faces in [scam ads].", ""),
 (1, 0.80, 0, 420, "In April, they asked Meta\\Nto [remove] the fakes.", ""),
 (2, 0.80, 0, 420, "Meta sells its ad space\\Nby [auction].", ""),
 (3, 0.80, 0, 420, "Reuters: in Meta's papers,\\Nsuspected scammers\\Nwere charged [more].", ""),
 (4, 0.80, 0, 420, "A German court: Meta picks\\Nwho sees each ad,\\Nso it is [liable].", ""),
 (5, 0.70, 2.90, 420, "The newsreader was fake.", "The [invoice] was real."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('nrf_H.ass')), manual=True)
