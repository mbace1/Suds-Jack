"""Captions for "Somebody Does the Dishes" (Toko Midori Games, clay, 21.4 s, hard cuts;
pre-production review §7: the test dated, no causal "because"). No station bug."""
import sys
from pathlib import Path
for _d in (Path(__file__).resolve().parent, Path(__file__).resolve().parents[1]): sys.path.insert(0, str(_d / 'lib'))
from rfcaps import build
CUT = [0, 4.4, 8.4, 12.8, 16.4, 21.4]
SHOTS = [
 (0, 0.30, 2.00, 420, "A home robot, [$20,000].", "It does the dishes."),
 (1, 0.30, 0.30, 420, "In a reviewer's 2025 test:\\N[slowly].", ""),
 (2, 0.30, 0.30, 420, "A person in a VR headset\\Nwas [steering it].", ""),
 (3, 0.30, 0.30, 420, "Its maker says\\Nit will learn\\Nto [work alone].", ""),
 (4, 0.30, 2.40, 420, "Somebody always\\Ndid the dishes.", "Now he's\\N[further away]."),
]
build(SHOTS, CUT, str(Path(__file__).with_name('dsh_H.ass')), manual=True, bug=False)
