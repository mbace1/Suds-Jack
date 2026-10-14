"""House captions for "Happy Little Bot" — the SHORT cut, ~20 s (owner, 2026-10-14: "way too
long and the message needs to be less subtle. Maybe a joke, something towards tech not being a
surrogate for parents"). The toy's words are the reported reply, unaltered; "misheard" stays,
because the study says it misheard. The last line is ours."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
CUT = [0, 3.375, 6.875, 11.625, 15.0, 19.875]
SHOTS = [
 (0, 0.30, 0.30, 420, "In a Cambridge study,\\Na three-year-old\\Ntold an AI toy:", ""),
 (1, 0.30, 0.30, 420, "[\"I'm sad.\"]", ""),
 (2, 0.30, 1.90, 420, "It misheard, and said:\\N\"Don't worry!", "I'm a [happy little bot].\""),
 (3, 0.30, 0.30, 420, "\"Let's keep\\Nthe [fun] going.\"", ""),
 (4, 0.90, 2.50, 420, "Batteries included.", "Parents [not included]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('bot_short_H.ass')), manual=True, bug=False)   # clay films go to the Toko Midori Games socials: no station bug
