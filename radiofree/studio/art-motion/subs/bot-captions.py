"""House captions for "Happy Little Bot" (Toko thinker #2, clay; style H, lib/rfcaps.py, breaks by hand).
The toy's words in 3–4 are the reported reply, split across two shots, unaltered."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
B = 60 / 112; SHOT = 12
CUT = [k * SHOT * B for k in range(6)] + [5 * SHOT * B + 10 * B]
SHOTS = [
 (0, 0.80, 3.00, 420, "A plush toy\\Nthat talks back.", "It runs on [AI]."),
 (1, 0.80, 3.00, 420, "In a Cambridge study,\\Na three-year-old told it:", "[\"I'm sad.\"]"),
 (2, 0.80, 3.00, 420, "It misheard, and said:\\N\"Don't worry!", "I'm a [happy little bot].\""),
 (3, 0.80, 3.00, 420, "\"Let's keep the fun going.", "What shall we talk\\Nabout [next]?\""),
 (4, 0.80, 3.00, 420, "Offered an imaginary present,", "it [refused], and moved on."),
 (5, 0.70, 2.20, 420, "The researchers want\\Nmakers to test toys", "[with children] first."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('bot_H.ass')), manual=True)
